// ════════════════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: aruba-einvoice-submit   (v1, file unico)
// ════════════════════════════════════════════════════════════════════════════
// Worker della outbox einvoice_job (vedi db/migrations/2026-09-23-einvoice.sql):
// legge i job 'pending', costruisce l'XML FatturaPA, lo carica su Aruba e
// aggiorna lo stato del job.
//
// UN SOLO FILE, DELIBERATAMENTE. Il builder XML (sezione "BUILDER FATTURAPA"
// più sotto) viveva in un file separato, fatturapa.ts, importato con
// `from "./fatturapa.ts"`. Il deploy reale è avvenuto dal pannello web di
// Supabase, che incolla il contenuto di UN file per funzione — non legge dal
// repository git e non risolve import locali fra file diversi. Un secondo
// file, per quanto nella stessa cartella lato repo, semplicemente non esiste
// nell'ambiente del pannello finché non lo si crea lì a mano: risultato,
// "Module not found" al bundling. Tutto in un file unico elimina il problema
// alla radice, indipendentemente da come verrà deployato in futuro (pannello
// o CLI). Se in seguito si passa alla CLI e un secondo consumatore avrà
// bisogno dello stesso builder, allora ha senso separarlo di nuovo — non ora.
//
// NON è agganciata a stripe-webhook. handleInvoice si limita a SCRIVERE il job
// a invoice.paid; questa funzione lo esegue in un secondo momento, invocata da
// un trigger PERIODICO ancora da configurare (pg_cron con net.http_post, o uno
// Scheduled Trigger lato Supabase) — vedi il commento in fondo al file. La
// separazione è deliberata: un errore di rete verso Aruba non deve MAI
// trasformarsi in un retry dell'intero webhook Stripe.
//
// SOLO SUBMIT, NON RICONCILIAZIONE. Questa versione porta i job da 'pending' a
// 'submitted' (Aruba ha preso in carico il file) o 'error' (rifiutato ai
// controlli sincroni, o la chiamata è fallita). Non risolve l'esito SDI vero
// (Consegnata / Scartata / Recapito impossibile): quello arriverà con un passo
// successivo — polling su findInvoices/getInvoiceDetail, o il callback push
// (createNotification/updateInvoiceStatus) descritto nella documentazione
// Aruba, non ancora accreditato.
//
// DRY RUN FAIL-SAFE. Il secret ARUBA_DRY_RUN deve valere ESATTAMENTE "false"
// per trasmettere davvero a SDI: qualunque altro valore (assente, "true",
// refuso) tiene il flag a true. È lo stesso principio fail-closed di
// checkPriceUsable e della validazione posti in create-subscription: un
// default che sbaglia per eccesso di cautela (una fattura non inviata,
// recuperabile) è enormemente meno grave di uno che sbaglia per difetto (una
// fattura elettronica inviata per sbaglio a un cliente vero, che è un atto
// fiscale e non si "annulla" con un rollback).
//
// AUTENTICAZIONE UNA SOLA VOLTA PER INVOCAZIONE. Il signin è limitato a 1
// richiesta al minuto per IP (SLA). Con N job pending in un batch, un solo
// token viene richiesto e riusato per tutti gli upload di quel batch (limite
// separato: 30 upload/minuto).
//
// Deploy: incollare questo file nell'editor della funzione aruba-einvoice-submit
// sul pannello Supabase (nessun secondo file da creare).
// Secrets:
//   supabase secrets set ARUBA_USERNAME=...
//   supabase secrets set ARUBA_PASSWORD=...
//   supabase secrets set ARUBA_DRY_RUN=false      # SOLO quando si è pronti a trasmettere davvero
//   (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono già impostati per le altre funzioni)
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@^2";

// ────────────────────────────────────────────────────────────────────────────
// BUILDER FATTURAPA — fattura elettronica ordinaria, formato FPR12
// ────────────────────────────────────────────────────────────────────────────
// Sezione pura: nessuna chiamata di rete, nessun accesso a Deno.env qui dentro.
//
// SCOPO RISTRETTO PER COSTRUZIONE. Questo builder genera SOLO fatture verso
// controparti italiane: un job in einvoice_job esiste unicamente quando
// invoice.sdi_code o invoice.fiscal_code sono valorizzati, e quei due campi
// esistono unicamente per country='IT' (vedi isItalianBusinessOrder /
// isItalianConsumerOrder in create-subscription). Un cliente italiano su
// Sevenda è sempre un'operazione interna, sempre al 22% — mai reverse charge
// (quello riguarda le aziende UE fuori Italia, che non ricevono fattura
// elettronica da noi) né esenzione (nessun selettore di tipo fiscale
// PA/forfettario è mai collegato al checkout: SEVENDA_IVA.italyTaxTypes in
// iva.config.js esiste ma non è raggiungibile dall'utente). Di conseguenza:
//   - AliquotaIVA è SEMPRE 22.00, <Natura> non compare mai (si scrive solo
//     quando l'aliquota è zero, e qui non lo è mai);
//   - EsigibilitaIVA è SEMPRE "I" (immediata): non è mai split payment (nessun
//     cliente PA) né esigibilità differita.
// Se un giorno Sevenda vendesse a PA, o introducesse un regime agevolato
// selezionabile, questo builder va esteso PRIMA di riusarlo per quei casi — le
// assunzioni sopra sono verificate una volta sola, qui, non ricontrollate a
// ogni chiamata.
//
// CEDENTE PRESTATORE HARDCODED. Sevenda è una ditta individuale (Dario Calì,
// REA RM-1795150, P.IVA 18605811001, CF CLADRA92L14H501H — dalla visura
// Registro Imprese, protocollo 262827/2026), non una società. Due conseguenze
// strutturali sullo schema, non stilistiche:
//   - CedentePrestatore/DatiAnagrafici/Anagrafica usa <Nome>+<Cognome>, non
//     <Denominazione> — quel tag è per le persone giuridiche. Scrivere
//     "Sevenda" lì sarebbe un dato falso: il cedente REGISTRATO è Calì Dario,
//     "Sevenda" resta il brand ma non compare nel blocco anagrafico.
//   - <IscrizioneREA> è OMESSO. La mia lettura è che quel blocco (con
//     CapitaleSociale, SocioUnico, StatoLiquidazione) riguardi le società di
//     capitali, non un'impresa individuale iscritta in sezione speciale come
//     piccolo imprenditore — ma non è verificata su fonte primaria. Il primo
//     invio va fatto con dryRun:true proprio per lasciare che sia la
//     validazione SDI/Aruba a confermarlo o smentirlo, a costo zero.
//
// CESSIONARIO/COMMITTENTE: <Denominazione> anche per i privati, mai
// <Nome>+<Cognome>. Scelta pragmatica, non la lettura più ortodossa dello
// schema: checkout.html raccoglie un solo campo "nome/ragione sociale"
// (coCompany) per chiunque, non Nome e Cognome separati per i privati.
// Denominazione è l'altra alternativa dello stesso xsd:choice di Nome+Cognome,
// e non risulta riservata alle sole persone giuridiche a livello di schema:
// usarla per un privato è una scelta comune nella pratica, non un'invenzione,
// ma resta un'assunzione da verificare con dryRun prima del primo invio vero.
// Se SDI la rifiuta, la correzione corretta è aggiungere Nome/Cognome al
// checkout per i privati italiani (stesso pattern del Codice Fiscale), non
// indovinare uno split del nome.
//
// NUMERAZIONE: <Numero> è l'sdi_number assegnato dalla sequence Postgres alla
// creazione del job (vedi la migrazione), non un contatore di questo modulo.
// Indipendente dal numero fattura Stripe.
//
// PAGAMENTO: la fattura arriva qui SOLO a invoice.paid (vedi handleInvoice),
// quindi il pagamento è già avvenuto — Condizioni "TP02" (pagamento completo),
// non "TP01" (a rate) né "TP03" (anticipo). ModalitaPagamento "MP08" (carta di
// pagamento): l'unico metodo che il checkout accetta è la carta via Stripe
// Elements.

// ── Dati fissi del cedente (Sevenda / Dario Calì, ditta individuale) ────────
// Costanti e non lette da una tabella: cambiano solo con un evento legale
// (variazione REA, cambio regime, trasferimento sede), non con l'operatività.
const CEDENTE = {
  paese: "IT",
  partitaIva: "18605811001",
  codiceFiscale: "CLADRA92L14H501H",
  nome: "DARIO",
  cognome: "CALI'",
  regimeFiscale: "RF01",
  indirizzo: "Viale della Grande Muraglia",
  numeroCivico: "95",
  cap: "00144",
  comune: "Roma",
  provincia: "RM",
  nazione: "IT",
} as const;

// Codice fiscale dell'intermediario Aruba PEC S.p.A. — va in IdTrasmittente
// per esplicita richiesta della v2.2.0 delle API (controllo sincrono 0094).
// NON è il nostro codice fiscale: è quello di chi trasmette per nostro conto.
const ARUBA_ID_TRASMITTENTE = "01879020517";

const ALIQUOTA_IVA_STANDARD = "22.00";

interface CessionarioBusiness {
  tipo: "business";
  /** 7 caratteri, incluso "0000000" per il recapito nel cassetto fiscale. */
  codiceDestinatario: string;
  paese: string;            // sempre "IT" per costruzione (vedi header del modulo)
  partitaIva: string;       // senza prefisso paese
  denominazione: string;
}

interface CessionarioConsumer {
  tipo: "consumer";
  codiceFiscale: string;    // 16 caratteri
  denominazione: string;    // vedi nota sopra: Denominazione, non Nome/Cognome
}

type Cessionario = CessionarioBusiness | CessionarioConsumer;

interface CessionarioSede {
  indirizzo: string;        // via + civico, così come raccolto dal checkout
  cap: string;
  comune: string;
  provincia?: string;       // opzionale: non tutti i CAP italiani hanno provincia obbligatoria in schema, ma quando c'è va passata
  nazione: string;          // sempre "IT" qui, ma il campo lo prende com'è
}

interface FatturaInput {
  progressivoInvio: string;   // stringa breve univoca per QUESTO invio — non il numero fattura
  numero: string;              // sdi_number, come stringa
  data: string;                 // YYYY-MM-DD
  descrizione: string;          // riga di dettaglio, es. "Abbonamento Sevenda Studio — Mensile"
  imponibileCents: number;      // subtotal_cents
  impostaCents: number;         // vat_cents (sempre 22% di imponibile, per costruzione)
  totaleCents: number;          // total_cents
  cessionario: Cessionario;
  sede: CessionarioSede;
}

// Molti campi testo di FatturaPA sono String...LatinType: limitati a Basic
// Latin + Latin-1 Supplement (U+0000–U+00FF). Verificato in produzione il
// 23/09/2026: un em dash (—, U+2014) nella descrizione ha fatto scartare la
// fattura in validazione XSD (codice 0092, "not facet-valid ... for type
// String1000LatinType"). Non è solo un problema della nostra descrizione —
// denominazione, indirizzo e comune vengono da testo digitato dal cliente
// (virgolette curve, un cognome con un carattere fuori Latin-1, un'emoji
// incollata per errore), quindi il filtro va sull'escaping stesso, applicato
// a OGNI stringa che finisce nell'XML, non aggiustato campo per campo mentre
// SDI li scarta uno alla volta.
function sanitizeLatin1(s: string): string {
  return s
    .replace(/[–—]/g, "-")   // en dash, em dash → trattino ASCII
    .replace(/[‘’]/g, "'")   // apici tipografici → apice dritto
    .replace(/[“”]/g, '"')   // virgolette tipografiche → dritte
    .replace(/…/g, "...")         // ellissi → tre punti
    // Tutto il resto fuori Basic Latin/Latin-1 Supplement: rimosso in
    // silenzio. Un carattere perso in un campo descrittivo è un dettaglio
    // estetico; un secondo scarto XSD per un carattere non previsto no.
    .replace(/[^\u0000-ÿ]/g, "");
}

function esc(s: string): string {
  return sanitizeLatin1(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Cents interi → stringa decimale a 2 cifre, senza il rischio di
// arrotondamento del binario floating point su (cents / 100).toFixed(2), che
// su alcuni valori produce artefatti (es. 0.1 + 0.2). Il calcolo resta in
// interi fino all'ultimo istante.
function centsToDecimal(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const intPart = Math.floor(abs / 100);
  const decPart = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${intPart}.${decPart}`;
}

function datiAnagraficiCessionario(c: Cessionario): string {
  if (c.tipo === "business") {
    return `<DatiAnagrafici>
          <IdFiscaleIVA>
            <IdPaese>${esc(c.paese)}</IdPaese>
            <IdCodice>${esc(c.partitaIva)}</IdCodice>
          </IdFiscaleIVA>
          <Anagrafica>
            <Denominazione>${esc(c.denominazione)}</Denominazione>
          </Anagrafica>
        </DatiAnagrafici>`;
  }
  // consumer: solo CodiceFiscale, niente IdFiscaleIVA (non ha partita IVA).
  return `<DatiAnagrafici>
          <CodiceFiscale>${esc(c.codiceFiscale)}</CodiceFiscale>
          <Anagrafica>
            <Denominazione>${esc(c.denominazione)}</Denominazione>
          </Anagrafica>
        </DatiAnagrafici>`;
}

/**
 * Costruisce l'XML FatturaPA (tracciato ordinario, TD01, formato FPR12) per
 * un cliente italiano già pagato via Stripe. Ritorna la stringa XML — la
 * codifica in base64 per l'upload è responsabilità del chiamante, non di
 * questa funzione: qui si costruisce un documento, non si prepara una
 * richiesta HTTP.
 */
function buildFatturaPA(input: FatturaInput): string {
  const codiceDestinatario = input.cessionario.tipo === "business"
    ? input.cessionario.codiceDestinatario
    : "0000000";   // privato: recapito nel cassetto fiscale, implicito

  const imponibile = centsToDecimal(input.imponibileCents);
  const imposta = centsToDecimal(input.impostaCents);
  const totale = centsToDecimal(input.totaleCents);

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12"
    xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${ARUBA_ID_TRASMITTENTE}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${esc(input.progressivoInvio)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${esc(codiceDestinatario)}</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>${CEDENTE.paese}</IdPaese>
          <IdCodice>${CEDENTE.partitaIva}</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>${CEDENTE.codiceFiscale}</CodiceFiscale>
        <Anagrafica>
          <Nome>${esc(CEDENTE.nome)}</Nome>
          <Cognome>${esc(CEDENTE.cognome)}</Cognome>
        </Anagrafica>
        <RegimeFiscale>${CEDENTE.regimeFiscale}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(CEDENTE.indirizzo)}</Indirizzo>
        <NumeroCivico>${esc(CEDENTE.numeroCivico)}</NumeroCivico>
        <CAP>${CEDENTE.cap}</CAP>
        <Comune>${esc(CEDENTE.comune)}</Comune>
        <Provincia>${CEDENTE.provincia}</Provincia>
        <Nazione>${CEDENTE.nazione}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      ${datiAnagraficiCessionario(input.cessionario)}
      <Sede>
        <Indirizzo>${esc(input.sede.indirizzo)}</Indirizzo>
        <CAP>${esc(input.sede.cap)}</CAP>
        <Comune>${esc(input.sede.comune)}</Comune>${input.sede.provincia ? `
        <Provincia>${esc(input.sede.provincia)}</Provincia>` : ""}
        <Nazione>${esc(input.sede.nazione)}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${input.data}</Data>
        <Numero>${esc(input.numero)}</Numero>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>${esc(input.descrizione)}</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>${imponibile}</PrezzoUnitario>
        <PrezzoTotale>${imponibile}</PrezzoTotale>
        <AliquotaIVA>${ALIQUOTA_IVA_STANDARD}</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>${ALIQUOTA_IVA_STANDARD}</AliquotaIVA>
        <ImponibileImporto>${imponibile}</ImponibileImporto>
        <Imposta>${imposta}</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP08</ModalitaPagamento>
        <ImportoPagamento>${totale}</ImportoPagamento>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

// ────────────────────────────────────────────────────────────────────────────
// WORKER — signin, lettura job, upload, aggiornamento stato
// ────────────────────────────────────────────────────────────────────────────

const ARUBA_AUTH_BASE = "https://auth.fatturazioneelettronica.aruba.it";
const ARUBA_WS_BASE = "https://ws.fatturazioneelettronica.aruba.it";

// Quanti job processare per invocazione. Il limite SLA di upload è 30/minuto;
// un batch più piccolo della singola invocazione lascia margine ad altri
// eventuali chiamanti (es. un retry manuale) senza saturare la quota oraria.
const BATCH_SIZE = 20;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// ── Autenticazione Aruba ─────────────────────────────────────────────────
async function arubaSignin(): Promise<string> {
  const username = Deno.env.get("ARUBA_USERNAME");
  const password = Deno.env.get("ARUBA_PASSWORD");
  if (!username || !password) {
    throw new Error("ARUBA_USERNAME/ARUBA_PASSWORD non configurati");
  }
  const res = await fetch(`${ARUBA_AUTH_BASE}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ grant_type: "password", username, password }).toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Aruba signin fallito: ${data.error_description ?? data.error ?? res.status}`);
  }
  return data.access_token as string;
}

// ── Upload di una fattura già costruita ─────────────────────────────────
interface UploadResult {
  ok: boolean;
  errorCode?: string;
  errorDescription?: string;
  uploadFileName?: string;
}

async function arubaUpload(token: string, xmlBase64: string, dryRun: boolean): Promise<UploadResult> {
  const res = await fetch(`${ARUBA_WS_BASE}/services/invoice/upload`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({ dataFile: xmlBase64, dryRun }),
  });
  const data = await res.json().catch(() => ({}));
  // errorCode "0000" = operazione effettuata. Qualunque altro codice, o una
  // risposta HTTP non-2xx, è un rifiuto ai controlli sincroni (v. Controlli
  // Sincroni nella documentazione Aruba v2.2.0) — mai un successo silenzioso.
  const ok = res.ok && (data.errorCode === "0000" || data.errorCode === "" || data.errorCode == null);
  return {
    ok,
    errorCode: data.errorCode ?? String(res.status),
    errorDescription: data.errorDescription ?? "risposta non interpretabile",
    uploadFileName: data.uploadFileName,
  };
}

// ── Lettura dei dati necessari a costruire l'XML per un job ────────────────
interface JobContext {
  jobId: number;
  sdiNumber: string;
  fattura: FatturaInput;
}

async function loadJobContext(job: { id: number; invoice_id: string; sdi_number: number; attempt_count: number }): Promise<
  { ok: true; ctx: JobContext } | { ok: false; detail: string }
> {
  const { data: inv, error: invErr } = await supabase
    .from("invoice")
    .select("subtotal_cents, vat_cents, total_cents, issued_at, sdi_code, fiscal_code, org_id, subscription_id")
    .eq("id", job.invoice_id)
    .maybeSingle();
  if (invErr || !inv) return { ok: false, detail: `invoice ${job.invoice_id} non leggibile: ${invErr?.message ?? "riga assente"}` };
  if (inv.vat_cents === null) {
    // v15 dello stripe-webhook: null significa "imposta non determinata", mai
    // "zero". Una fattura così non è pronta per l'emissione: attende
    // correzione a monte, non un invio con IVA indovinata.
    return { ok: false, detail: `invoice ${job.invoice_id}: vat_cents è null (imposta non determinata)` };
  }

  const { data: bp, error: bpErr } = await supabase
    .from("billing_profile")
    .select("legal_name, vat_id, address_line1, address_line2, city, state, postal_code, country")
    .eq("org_id", inv.org_id)
    .maybeSingle();
  if (bpErr || !bp) return { ok: false, detail: `billing_profile org ${inv.org_id} non leggibile: ${bpErr?.message ?? "riga assente"}` };
  if (bp.country !== "IT") {
    // Non dovrebbe accadere: il job esiste solo perché sdi_code o fiscal_code
    // sono valorizzati, e quei campi esistono solo per country='IT'. Se questo
    // scatta, qualcosa a monte è cambiato senza che questo modulo lo sapesse —
    // fail-closed piuttosto che generare una FatturaPA per un cliente estero.
    return { ok: false, detail: `billing_profile org ${inv.org_id}: country '${bp.country}' non è IT` };
  }

  let planName = "Abbonamento Sevenda";
  if (inv.subscription_id) {
    const { data: sub } = await supabase
      .from("subscription").select("plan_id").eq("id", inv.subscription_id).maybeSingle();
    if (sub?.plan_id) {
      const { data: plan } = await supabase
        .from("plan").select("name").eq("id", sub.plan_id).maybeSingle();
      if (plan?.name) planName = plan.name;
    }
  }

  const cessionario: Cessionario = inv.sdi_code
    ? { tipo: "business", codiceDestinatario: inv.sdi_code, paese: "IT", partitaIva: extractVatNumber(bp), denominazione: bp.legal_name ?? "" }
    : { tipo: "consumer", codiceFiscale: inv.fiscal_code ?? "", denominazione: bp.legal_name ?? "" };

  if (cessionario.tipo === "business" && !cessionario.partitaIva) {
    return { ok: false, detail: `invoice ${job.invoice_id}: sdi_code presente ma nessuna partita IVA sul billing_profile` };
  }
  if (cessionario.tipo === "consumer" && !cessionario.codiceFiscale) {
    return { ok: false, detail: `invoice ${job.invoice_id}: nessun fiscal_code e nessun sdi_code — cessionario non determinabile` };
  }

  const indirizzo = [bp.address_line1, bp.address_line2].filter(Boolean).join(", ") || "n/d";
  const data = (inv.issued_at ?? new Date().toISOString()).slice(0, 10);

  return {
    ok: true,
    ctx: {
      jobId: job.id,
      sdiNumber: String(job.sdi_number),
      fattura: {
        progressivoInvio: String(job.sdi_number),
        numero: String(job.sdi_number),
        data,
        descrizione: `${planName} - fattura ${data}`,
        imponibileCents: inv.subtotal_cents ?? 0,
        impostaCents: inv.vat_cents,
        totaleCents: inv.total_cents ?? 0,
        cessionario,
        sede: {
          indirizzo,
          cap: bp.postal_code ?? "",
          comune: bp.city ?? "",
          provincia: bp.state || undefined,
          nazione: "IT",
        },
      },
    },
  };
}

// billing_profile.vat_id porta il valore così come inserito al checkout (può
// includere o no il prefisso "IT"): IdFiscaleIVA/IdCodice vuole il numero SENZA
// prefisso paese, che viaggia a parte in IdPaese.
function extractVatNumber(bp: { vat_id?: string | null } & Record<string, unknown>): string {
  const raw = String((bp as { vat_id?: string } | null)?.vat_id ?? "").replace(/\s/g, "").toUpperCase();
  return raw.startsWith("IT") ? raw.slice(2) : raw;
}

function base64Encode(s: string): string {
  // TextEncoder + btoa: gestisce correttamente l'XML come UTF-8, a differenza
  // di un btoa diretto sulla stringa (che tratterebbe ogni char come Latin-1
  // e romperebbe su un cognome accentato o un apostrofo tipografico).
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Fail-closed: qualunque valore diverso da "false" tiene dryRun a true.
  const dryRun = Deno.env.get("ARUBA_DRY_RUN") !== "false";

  const { data: jobs, error: jobsErr } = await supabase
    .from("einvoice_job")
    .select("id, invoice_id, sdi_number, attempt_count")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (jobsErr) {
    console.error(`[aruba] lettura job pending fallita: ${jobsErr.message}`);
    return new Response(JSON.stringify({ error: jobsErr.message }), { status: 500 });
  }
  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  let token: string;
  try {
    token = await arubaSignin();
  } catch (e) {
    console.error(`[aruba] signin fallito: ${(e as Error).message}`);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 502 });
  }

  console.log(`[aruba] batch di ${jobs.length} job, dryRun=${dryRun}`);

  const results: Array<{ jobId: number; status: string }> = [];

  for (const job of jobs) {
    const loaded = await loadJobContext(job);
    if (!loaded.ok) {
      console.error(`[aruba] job ${job.id}: ${loaded.detail}`);
      await supabase.from("einvoice_job").update({
        status: "error",
        aruba_error_detail: loaded.detail,
        attempt_count: job.attempt_count + 1,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      results.push({ jobId: job.id, status: "error" });
      continue;
    }

    const xml = buildFatturaPA(loaded.ctx.fattura);
    const xmlBase64 = base64Encode(xml);

    let upload: UploadResult;
    try {
      upload = await arubaUpload(token, xmlBase64, dryRun);
    } catch (e) {
      upload = { ok: false, errorCode: "network", errorDescription: (e as Error).message };
    }

    const now = new Date().toISOString();
    if (upload.ok) {
      await supabase.from("einvoice_job").update({
        status: "submitted",
        upload_filename: upload.uploadFileName ?? null,
        aruba_error_code: null,
        aruba_error_detail: null,
        xml_base64: xmlBase64,
        dry_run: dryRun,
        attempt_count: job.attempt_count + 1,
        submitted_at: now,
        last_attempt_at: now,
        updated_at: now,
      }).eq("id", job.id);
      console.log(`[aruba] job ${job.id} → submitted (${upload.uploadFileName}, dryRun=${dryRun})`);
    } else {
      await supabase.from("einvoice_job").update({
        status: "error",
        aruba_error_code: upload.errorCode ?? null,
        aruba_error_detail: upload.errorDescription ?? null,
        xml_base64: xmlBase64,
        dry_run: dryRun,
        attempt_count: job.attempt_count + 1,
        last_attempt_at: now,
        updated_at: now,
      }).eq("id", job.id);
      console.error(`[aruba] job ${job.id} → error (${upload.errorCode}: ${upload.errorDescription})`);
    }
    results.push({ jobId: job.id, status: upload.ok ? "submitted" : "error" });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TRIGGER PERIODICO — da configurare, non fa parte di questo file.
// Due strade equivalenti:
//   1) pg_cron + pg_net: una riga SQL che chiama questa funzione ogni N minuti
//      via net.http_post, con l'header apikey/service-role già configurato.
//   2) Supabase Scheduled Triggers (dashboard → Edge Functions → Cron), se
//      disponibile sul piano del progetto.
// In entrambi i casi la funzione è idempotente per costruzione: un'invocazione
// che si sovrappone a una precedente trova solo job già 'submitted' o 'error'
// (mai due volte 'pending' per lo stesso invoice_id, grazie allo UNIQUE su
// einvoice_job.invoice_id) e semplicemente non trova nulla da fare.
// ════════════════════════════════════════════════════════════════════════════
