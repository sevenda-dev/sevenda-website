// ════════════════════════════════════════════════════════════════════════════
// Sevenda — Builder FatturaPA (fattura elettronica ordinaria, formato FPR12)
// ════════════════════════════════════════════════════════════════════════════
// Modulo puro: nessuna chiamata di rete, nessun accesso a Deno.env qui dentro.
// Condiviso fra stripe-webhook (non lo usa direttamente, ma la struttura dei
// dati che gli passa deve combaciare) e aruba-einvoice-submit, che lo importa
// con `import { buildFatturaPA } from "../_shared/fatturapa.ts"`.
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
// selezionabile, questo modulo va esteso PRIMA di riusarlo per quei casi — le
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
export const CEDENTE = {
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

export interface CessionarioBusiness {
  tipo: "business";
  /** 7 caratteri, incluso "0000000" per il recapito nel cassetto fiscale. */
  codiceDestinatario: string;
  paese: string;            // sempre "IT" per costruzione (vedi header del modulo)
  partitaIva: string;       // senza prefisso paese
  denominazione: string;
}

export interface CessionarioConsumer {
  tipo: "consumer";
  codiceFiscale: string;    // 16 caratteri
  denominazione: string;    // vedi nota nell'header: Denominazione, non Nome/Cognome
}

export type Cessionario = CessionarioBusiness | CessionarioConsumer;

export interface CessionarioSede {
  indirizzo: string;        // via + civico, così come raccolto dal checkout
  cap: string;
  comune: string;
  provincia?: string;       // opzionale: non tutti i CAP italiani hanno provincia obbligatoria in schema, ma quando c'è va passata
  nazione: string;          // sempre "IT" qui, ma il campo lo prende com'è
}

export interface FatturaInput {
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

function esc(s: string): string {
  return s
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
 * codifica in base64 per l'upload è responsabilità del chiamante (il worker),
 * non di questo modulo: qui si costruisce un documento, non si prepara una
 * richiesta HTTP.
 */
export function buildFatturaPA(input: FatturaInput): string {
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
