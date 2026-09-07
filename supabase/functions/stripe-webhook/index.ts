// ════════════════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: stripe-webhook   (PATCH v11 — legame invoice → subscription)
// ════════════════════════════════════════════════════════════════════════════
// Chiude il giro Stripe → Supabase. Riceve gli eventi Stripe, verifica la firma,
// garantisce l'idempotenza (tabella stripe_event) e fa upsert di organization,
// subscription e invoice. Usa la service-role key (bypassa la RLS).
//
// ── PATCH v11 (questa versione) ────────────────────────────────────────────
// LEGAME INVOICE → SUBSCRIPTION RIPRISTINATO. handleInvoice leggeva
// inv.subscription, campo che l'API 2026-04-22.dahlia non invia più
// sull'invoice. Effetto in produzione: 8 invoice su 8 con subscription_id
// NULL, cioè nessuna fattura collegata al proprio abbonamento.
//   → Verificato sul payload reale di in_1U9ngW... (invoice.paid, live), non
//     sulla documentazione: il campo `subscription` è ASSENTE e il legame vive
//     in parent.subscription_details.subscription, con parent.type
//     "subscription_details". Lo stesso id compare anche a livello di riga, in
//     lines.data[].parent.subscription_item_details.subscription.
//   → Il campo vecchio resta come fallback: gli eventi generati da versioni API
//     precedenti sono ancora in stripe_event e restano rigiocabili.
//
// È lo stesso difetto già corretto in v6 per cancel_at_period_end: un campo
// spostato da un cambio di versione API, letto alla cieca, nessun errore
// sollevato — solo una colonna che resta vuota. Da notare che i tipi di
// stripe@^17 dichiarano ANCORA Invoice.subscription, quindi `deno check`
// passava pulito su entrambe le versioni: il compilatore non poteva vederlo.
//
// NON toccato qui, ma dello stesso tipo e da decidere a parte: anche `inv.tax`
// è assente dal payload (al suo posto c'è total_taxes: []), quindi
// vat_cents viene scritto 0 su ogni fattura. Sulle righe attuali 0 è per caso
// il valore giusto — automatic_tax è disabilitato — ma il campo letto non
// esiste più, quindi il giorno in cui l'IVA verrà applicata il dato sarà
// silenziosamente sbagliato.
//
// ── PATCH v10 ──────────────────────────────────────────────────────────────
// COM-10 — ATTIVAZIONE PIANO (benvenuto / bentornato). Era l'unico momento del
// ciclo di vita senza comunicazione: chi comprava riceveva solo la ricevuta
// Stripe, che non dice con quale email accedere né come arrivare al pannello.
// L'istruzione "usa la stessa email del checkout" viveva solo DENTRO il
// prodotto che l'utente non ha ancora sbloccato.
//
// TRIGGER — la prima transizione verso uno stato SERVITO, non la creazione.
// Con Elements + 3DS la subscription nasce `incomplete` e si attiva solo dopo
// la conferma del pagamento: agganciare COM-10 al solo .created significherebbe
// scrivere "il tuo piano è attivo" a chi non ha ancora pagato, e a chi abbandona
// il 3DS resterebbe una promessa mai mantenuta. Due percorsi coperti:
//   (a) .created con status ∈ {trialing, active} — trial, o checkout senza 3DS
//   (b) .updated con previous_attributes.status === "incomplete" e status
//       corrente ∈ {trialing, active} — attivazione dopo 3DS
// La sorgente è ristretta a `incomplete`: un past_due → active è un pagamento
// recuperato dal dunning, già coperto da COM-6/COM-7, non un primo acquisto.
// Come in v6, la decisione si prende su previous_attributes: per-evento e
// deterministica, non sullo stato del DB.
//
// BENVENUTO vs BENTORNATO. L'upsert di subscription è su
// stripe_subscription_id: al riacquisto nasce una riga NUOVA e la cessata resta
// con status 'canceled'. Basta quindi contare le altre subscription della
// stessa org. Un cliente di ritorno non va accolto come un nuovo iscritto.
//
// CORPO UNICO, DUE INTESTAZIONI. 10a e 10b condividono lo stesso corpo
// (COM10_BODY): cambiano solo oggetto, preheader e titolo. Otto stringhe da
// mantenere invece di due corpi da tenere allineati a ogni ritocco.
//
// PREHEADER. emailLayout guadagna un parametro opzionale: senza, il client
// riempie l'anteprima con le prime parole del corpo. Le COM-1…COM-9 non lo
// passano e restano invariate.
//
// NOMI DEI CONTROLLI NEL PASSO 2. Verificato su panel.html: il blocco di login
// è hardcoded in inglese (nessun data-i18n) e il bottone accanto al campo email
// è etichettato "Send code", non "Sign in" — quest'ultimo è il badge in
// toolbar. Le etichette restano quindi in inglese in tutte e quattro le lingue,
// perché è ciò che l'utente vede davvero sullo schermo.
//
// ── PATCH v9 ─────────────────────────────────────────────
// SOPPRESSIONE DI COM-3 SULLE CESSAZIONI DA ELIMINAZIONE ACCOUNT (decisione
// B3). delete-account scrive `sevenda_deletion_job_id` nei metadata della
// subscription prima di cancellarla; qui il marcatore viene letto PRIMA di
// resolveOrg e l'evento si chiude senza toccare il DB. L'alternativa prevista
// da SA-4.4 — dedurre l'intenzione dall'assenza della riga in DB — dipendeva
// dall'ordine degli step di deprovisioning e dalla latenza di consegna degli
// eventi: con la concorrenza misurata in Fase 1 era una race.
//   → Il controllo precede resolveOrg per una ragione precisa: resolveOrg non
//     si limita a leggere, su un customer non ancora mappato CREA
//     l'organization; e l'upsert di handleSubscription ricrea la riga
//     subscription che db_purge ha appena rimosso. Un controllo a valle
//     troverebbe il danno già fatto.
//   → Da qui in poi il test di COM-3 è a DUE CASI (RF-CAN-003): cessazione
//     naturale (COM-3 parte) e cessazione da eliminazione (COM-3 non parte,
//     parte COM-5 da delete-account).
//
// ESITI SU stripe_event (decisione A3). Le colonne outcome e outcome_detail
// (migrazione f2-01 sez. 1) vengono ora valorizzate: 'processed' sugli eventi
// elaborati o saltati per decisione, 'permanent_error' sui NonRetryableError.
// Senza queste, KPI-5 non è calcolabile.
//   NOTA: 'duplicate_skip' NON è registrabile con una riga per event.id — la
//   riga esiste già con l'esito della prima elaborazione e sovrascriverla
//   distruggerebbe il dato che KPI-5 deve leggere. Serve una colonna
//   seen_count, oppure il valore va escluso dal KPI. Punto aperto per la v1.3.
//
// ── PATCH v8 ───────────────────────────────────────────────────────────────
// ITEMS COME UNICA FONTE. Rimossi i tre fallback su sub.metadata (planId,
// seats, interval). Osservato sul campo (staging, 03/08/2026): la subscription
// sub_1Tu8Kc... riporta metadata planId="analyst"/seats="1" mentre gli items
// dicono Suite Team con 2 posti — i metadata sono fermi al checkout del 17/07 e
// il Portal non li aggiorna mai. Un fallback che restituisce un dato stantio
// non è una rete di sicurezza: è una trappola che scatta esattamente quando
// serve la sicurezza, perché scrive un piano PLAUSIBILE ma sbagliato invece di
// fallire. Peggio: dalla v7 in poi produrrebbe anche un reset spurio di
// plan_started_at, perché prev.plan_id risulterebbe diverso da planId.
//   → Ora piano, ciclo e posti si leggono SOLO dagli items. Se manca uno dei
//     tre, l'evento si chiude come NonRetryableError: le tre colonne sono
//     NOT NULL e scrivere un valore inventato è peggio che non scrivere.
//
// AUDIT ANCORATO AL TEMPO DI STRIPE. subscription_event registrava solo il
// now() del database, che è l'istante di SCRITTURA, non quello dell'evento.
// Sulla riga di test lo scarto fra i due è di quasi otto minuti. Ora si
// persiste anche event.created (colonna stripe_event_created_at, migrazione
// f1-06), così la traccia è ricostruibile rispetto alla sorgente e non rispetto
// alla latenza del webhook.
//
// NOTA su metadata: supabaseUserId e vatId restano e NON vanno toccati — sono
// sul CUSTOMER, sono stabili e resolveOrg ci si appoggia. Il problema riguarda
// solo i metadata della SUBSCRIPTION, che descrivono lo stato al checkout.
// (v9: il marcatore sevenda_deletion_job_id è l'unica eccezione deliberata —
// non descrive lo stato al checkout, è un segnale di intenzione scritto
// nell'istante stesso della cancellazione.)
//
// ── PATCH v7 ───────────────────────────────────────────────────────────────
// RF-CAN-024 "Valid from". handleSubscription riceve event.created e valorizza
// subscription.plan_started_at quando — e solo quando — cambia il plan_id. Il
// price non basta come trigger: cambia anche per ciclo di fatturazione e per
// fascia di posti, che la decisione 3 esclude dal reset. Il downgrade resetta
// all'ENTRATA IN VIGORE della fase, non alla schedulazione: per questo
// handleSchedule non tocca la colonna.
//
// STRADA 2 AUTO-RISOLUTIVA. La race fra checkout simultanei non produce più un
// 500 con retry infiniti: sul 23505 dell'insert organization si rilegge la riga
// per stripe_customer_id e, se esiste, si prosegue. Se non esiste è
// organization_one_per_owner — permanente — e si chiude come NonRetryableError.
// La classificazione è stata inoltre generalizzata (dbFail): tutte le classi
// SQLSTATE 22 e 23, su qualunque punto di scrittura, sono ora permanenti.
//
// ── PATCH v6 ───────────────────────────────────────────────────────────────
// RILEVAMENTO DISDETTA CORRETTO. Verificato sul campo (staging, 23/07/2026):
// con l'API 2026-04-22.dahlia il Customer Portal NON imposta più il booleano
// cancel_at_period_end quando l'utente disdice a fine periodo. Imposta invece
// cancel_at (timestamp della cessazione), canceled_at (istante della richiesta)
// e cancellation_details. Il booleano resta false. Tutto il rilevamento
// costruito su quel flag era quindi cieco: COM-1 non partiva mai.
//   → Ora la disdetta si riconosce da cancel_at (con il booleano tenuto come
//     compatibilità), il valore viene persistito su subscription.cancel_at
//     (migrazione f1-05) e la motivazione su cancel_reason.
//
// TRANSIZIONI DA previous_attributes. Una singola disdetta genera più
// customer.subscription.updated nello stesso secondo (nel test: tre). Dedurre
// il "prima" leggendo la riga in DB è una race: invocazioni concorrenti leggono
// lo stesso stato e possono inviare email duplicate o nessuna. Stripe però dice
// in ogni evento quali campi sono cambiati, in event.data.previous_attributes:
// è per-evento e deterministico. Ora è quella la fonte primaria; il confronto
// col DB resta solo come rete di sicurezza quando previous_attributes manca.
// Corollario: un evento che non tocca i campi di interesse non genera nulla.
//
// ── PATCH v5 ───────────────────────────────────────────────────────────────────────────
// LOCALIZZAZIONE COMUNICAZIONI (IT/EN/FR/ES). La lingua vive su
// organization.locale (migrazione f1-04), valorizzata al checkout tramite
// metadata.locale del Customer Stripe. Catena di risoluzione, dal più
// affidabile al meno: organization.locale → customer.metadata.locale →
// customer.preferred_locales[0] → 'it'. I testi COM-1…COM-9 sono tradotti a
// partire dalle versioni italiane approvate (analisi funzionale v1.2), che
// restano la fonte di verità: le altre lingue ne seguono la struttura, non
// una riscrittura libera.
// NOTA: la data resta DD/MM/YYYY in tutte e quattro le lingue (convenzione
// europea, coerente con la UI dell'estensione). Cambia invece il separatore
// decimale degli importi: virgola per it/fr/es, punto per en.
//
// ── PATCH v4 ───────────────────────────────────────────────────────────────
// 1) COMUNICAZIONI (RF-CAN-006 / RF-CAN-022, testi approvati v1.2):
//    COM-1 disdetta · COM-2 riattivazione · COM-3 cessazione ·
//    COM-6 rinnovo · COM-7 prelievo KO · COM-8 upgrade · COM-9 downgrade.
//    Invio via Resend. Le transizioni si rilevano confrontando la riga PRECEDENTE
//    in DB con il payload: senza questo confronto un 'subscription.updated'
//    generico (cambio metodo di pagamento, tax id…) genererebbe email improprie.
//    L'invio email NON può mai far fallire l'handler: sendEmail cattura tutto e
//    logga. Un errore Resend non deve produrre un 500 → retry Stripe → email
//    duplicate al tentativo successivo.
//
// 2) STRADA 2 — errori non ritentabili (RF-CAN-010 / RNF-CAN-002):
//    Prima: QUALSIASI errore di handler cancellava la riga stripe_event e
//    rispondeva 500 → per un errore PERMANENTE (customer cancellato, metadata
//    mancanti, price fuori catalogo) Stripe ritentava all'infinito finché non si
//    ripuliva a mano. Ora gli errori permanenti sono marcati NonRetryable: la
//    riga stripe_event RESTA (outcome registrato) e si risponde 200. Solo gli
//    errori transitori (DB irraggiungibile, rete) sbloccano l'idempotenza e
//    restituiscono 500 per un retry legittimo.
//
// 3) apiVersion allineata a '2026-04-22.dahlia' (la versione che l'account
//    invia realmente). Prima era ferma a '2024-06-20': le chiamate in uscita
//    (customers.retrieve) usavano una versione diversa da quella degli eventi in
//    ingresso. Il cast è necessario perché i tipi di stripe@^17 non conoscono
//    ancora questa stringa — è l'errore deno preesistente, qui chiuso.
//
// ── PATCH v3 (invariata) ────────────────────────────────────────────────────
// La verità su piano/seats/ciclo sta negli ITEMS, non nei metadata (il Portal
// non aggiorna i metadata dopo un cambio piano). + subscription_schedule.*
//
// ── PATCH v2 (invariata) ────────────────────────────────────────────────────
// current_period_* vivono a livello di item, non più top-level.
//
// Deploy (manuale, dashboard Supabase — i push GitHub NON deployano):
//   staging hxht → validazione E2E → produzione jqxx
//
// Secrets (NUOVO in v4: RESEND_API_KEY, opzionale RESEND_FROM, APP_BASE_URL):
//   STRIPE_SECRET_KEY · STRIPE_WEBHOOK_SECRET · SUPABASE_URL ·
//   SUPABASE_SERVICE_ROLE_KEY · RESEND_API_KEY
//
// Prerequisito v9: migrazione f2-01 sez. 1 applicata (colonne
//   stripe_event.outcome e stripe_event.outcome_detail).
//
// Eventi Stripe da sottoscrivere (invariati rispetto a v3):
//   customer.subscription.created / .updated / .deleted,
//   subscription_schedule.updated / .released,
//   invoice.paid / .payment_failed / .finalized, customer.updated
// ════════════════════════════════════════════════════════════════════════════

import Stripe from "npm:stripe@^17";
import { createClient } from "npm:@supabase/supabase-js@^2";

// v4: allineata alla versione realmente inviata dall'account. I tipi di
// stripe@^17 non includono questa stringa nell'union LatestApiVersion → cast
// esplicito e circoscritto (nessun @ts-ignore globale, nessuna modifica ai tipi).
const STRIPE_API_VERSION = "2026-04-22.dahlia" as unknown as Stripe.LatestApiVersion;

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: STRIPE_API_VERSION,
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Paesi UE (per instradamento e-invoicing: IT → Aruba, resto UE → Stripe)
const EU = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
]);

function tsToIso(sec: number | null | undefined): string | null {
  return sec ? new Date(sec * 1000).toISOString() : null;
}

// ════════════════════════════════════════════════════════════════════════════
// v4 — Errori non ritentabili (Strada 2)
// ════════════════════════════════════════════════════════════════════════════
// Un errore è NonRetryable quando ritentare non può cambiarne l'esito: dato
// mancante o incoerente a monte (customer cancellato, metadata assenti, price
// fuori catalogo, subscription non presente in DB). In quel caso l'evento va
// archiviato come processato e chiuso con 200: è la differenza fra "abbiamo un
// problema da guardare nei log" e "Stripe martella l'endpoint per giorni".
class NonRetryableError extends Error {
  readonly outcome: string;
  constructor(message: string, outcome = "unprocessable") {
    super(message);
    this.name = "NonRetryableError";
    this.outcome = outcome;
  }
}

// ── v9 / B3 — evento da saltare per decisione, non per errore ───────────────
// Distinta da NonRetryableError: là qualcosa è andato storto e resta nei log
// come errore; qui l'evento è stato riconosciuto e deliberatamente non
// elaborato. Stessa risposta (200, riga stripe_event conservata), significato
// opposto — e la distinzione si legge in `outcome`.
class SkipEvent extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(detail);
    this.name = "SkipEvent";
    this.detail = detail;
  }
}

// ── v9 / B3 — marcatore di eliminazione account ────────────────────────────
// `delete-account` scrive `sevenda_deletion_job_id` nei metadata della
// subscription IMMEDIATAMENTE PRIMA di cancellarla. Il marcatore viaggia
// dentro l'evento, quindi la decisione "questa cessazione deriva da
// un'eliminazione" si prende su un dato contenuto nell'evento stesso, senza
// dipendere dallo stato del DB né dall'ordine degli step di deprovisioning.
function deletionJobId(obj: unknown): string | null {
  const md = (obj as { metadata?: Record<string, unknown> } | null)?.metadata;
  const v = md?.sevenda_deletion_job_id;
  return typeof v === "string" && v.length > 0 ? v : null;
}

// ── v9 / A3 — esito dell'evento su stripe_event ────────────────────────────
// Colonne aggiunte dalla migrazione f2-01 sez. 1. `outcome` è la categoria
// chiusa su cui poggia KPI-5; `outcome_detail` porta la stringa diagnostica.
// Best-effort: un fallimento qui non deve mai far fallire l'handler, perché
// significherebbe trasformare un evento elaborato con successo in un retry.
async function markOutcome(
  eventId: string,
  outcome: "processed" | "not_found" | "permanent_error",
  detail?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("stripe_event")
    .update({ outcome, outcome_detail: detail ?? null })
    .eq("id", eventId);
  if (error) console.error(`[webhook] outcome ${eventId}: ${error.message}`);
}

// ── v7 / B.1 — classificazione generale degli errori Postgres ───────────────
// Le classi SQLSTATE 22 (dati non validi) e 23 (violazione di integrità)
// descrivono condizioni che il retry non cambia: lo stesso payload produrrà lo
// stesso errore, all'infinito. Tutto il resto — DB irraggiungibile, timeout,
// rete — resta transitorio e merita il retry di Stripe. Prima questa
// distinzione esisteva solo dentro resolveOrg, per due casi nominati a mano;
// ora è una regola sola applicata a tutti i punti di scrittura.
function dbFail(error: { code?: string | null; message: string }, context: string): never {
  const code = error.code ?? "";
  if (code.startsWith("22") || code.startsWith("23")) {
    throw new NonRetryableError(`${context} (${code}): ${error.message}`, "db_constraint_violation");
  }
  throw new Error(`${context}: ${error.message}`);
}

// ════════════════════════════════════════════════════════════════════════════
// v4 — Livello comunicazioni (Resend)
// ════════════════════════════════════════════════════════════════════════════
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM    = Deno.env.get("RESEND_FROM") ?? "Sevenda <hello@sevenda.dev>";
const APP_BASE_URL   = Deno.env.get("APP_BASE_URL") ?? "https://sevenda.dev";
// Il link "Gestisci abbonamento" nelle email punta alla pagina account del sito,
// che apre il Customer Portal: le sessioni Portal sono monouso e scadono, quindi
// NON si può incorporare un URL di sessione in un'email.
const PORTAL_ENTRY_URL = `${APP_BASE_URL}/account`;

function fmtDate(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const d = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

// Importo SEMPRE letto dall'oggetto Stripe (invoice.amount_paid), mai ricalcolato
// dal catalogo: il listino vive su quattro fonti non ancora allineate, e una
// email con l'importo sbagliato è un danno che il cliente nota subito.
function fmtAmount(
  cents: number | null | undefined,
  currency: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const v = (cents ?? 0) / 100;
  const cur = (currency || "eur").toUpperCase();
  const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : cur + " ";
  const n = v.toFixed(2);
  // v5: separatore decimale per lingua. Un "€25,00" in una email inglese o un
  // "€25.00" in una italiana sono piccoli segnali di sciatteria che il cliente
  // registra proprio nella comunicazione che gli dice quanto ha pagato.
  return `${sym}${locale === "en" ? n : n.replace(".", ",")}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Layout condiviso — design system Sevenda (sfondo #000001/#0d0d0d, accent
// #E8733A). Geist è caricato via Google Fonts ma la maggior parte dei client
// email ignora i webfont: lo stack di fallback è quindi parte del design, non
// una rete di sicurezza.
function emailLayout(opts: {
  title: string;
  body: string;          // HTML già escapato/formattato
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
  preheader?: string;    // v10 — testo di anteprima, invisibile nel corpo
}): string {
  const cta = opts.ctaLabel && opts.ctaUrl
    ? `<a href="${opts.ctaUrl}" style="display:inline-block; padding:13px 32px; background:#E8733A; color:#0c0c0c; font-size:14px; font-weight:600; text-decoration:none; border-radius:8px; margin-bottom:28px;">${escapeHtml(opts.ctaLabel)}</a>`
    : "";
  const foot = opts.footnote
    ? `<p style="margin:0; font-size:13px; color:#4a4a4a; line-height:1.5;">${opts.footnote}</p>`
    : "";
  // v10 — Il filler di entità invisibili impedisce ai client di completare
  // l'anteprima con le prime parole del corpo dopo il preheader.
  const pre = opts.preheader
    ? `<span style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden;">${escapeHtml(opts.preheader)}${"&#8199;&#65279;&#847; ".repeat(60)}</span>`
    : "";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background:#191919; font-family:'Geist',-apple-system,sans-serif; color:#e8e8e6;">
  ${pre}
  <table cellpadding="0" cellspacing="0" width="100%" style="background:#000001;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <img src="${APP_BASE_URL}/logo.svg" alt="Sevenda" style="width:32px; margin-bottom:28px;">
        <table width="540" cellpadding="0" cellspacing="0" style="background:#0d0d0d; border:1px solid #1e1e1e; border-radius:12px;">
          <tr>
            <td style="padding:40px 32px; text-align:center;">
              <h1 style="margin:0 0 12px; font-size:26px; font-weight:600; color:#e8e8e6; letter-spacing:-.03em;">${escapeHtml(opts.title)}</h1>
              <p style="margin:0 0 28px; font-size:15px; color:#8a8a8a; line-height:1.6;">${opts.body}</p>
              ${cta}
              ${foot}
            </td>
          </tr>
        </table>
        <p style="margin:28px 0 0; font-size:12px; color:#4a4a4a; text-align:center;">
          <a href="${APP_BASE_URL}" style="color:#8a8a8a; text-decoration:none;">sevenda.dev</a> &bull;
          <a href="${APP_BASE_URL}/docs" style="color:#8a8a8a; text-decoration:none;">Docs</a> &bull;
          <a href="mailto:hello@sevenda.dev" style="color:#8a8a8a; text-decoration:none;">Support</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Invio "best effort": non solleva MAI. Una failure Resend che diventasse un
// 500 farebbe ritentare l'intero evento a Stripe, con il rischio di rieseguire
// gli upsert e di inviare due volte le email già partite.
async function sendEmail(to: string | null | undefined, subject: string, html: string, tag: string): Promise<void> {
  if (!to) { console.warn(`[webhook] ${tag}: destinatario assente, invio saltato`); return; }
  if (!RESEND_API_KEY) { console.warn(`[webhook] ${tag}: RESEND_API_KEY non configurata, invio saltato`); return; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[webhook] ${tag}: Resend ${res.status} ${detail.slice(0, 300)}`);
      return;
    }
    console.log(`[webhook] ${tag}: email inviata`);
  } catch (err) {
    console.error(`[webhook] ${tag}: invio fallito`, err);
  }
}

// ── Localizzazione (v5) ─────────────────────────────────────────────────────
// Le chiavi coincidono con quelle di i18n.js (uiLang) per non introdurre una
// seconda tassonomia di lingue nel prodotto.
type Locale = "it" | "en" | "es" | "fr";
const LOCALES: readonly string[] = ["it", "en", "es", "fr"];
const DEFAULT_LOCALE: Locale = "it";

// Accetta 'it', 'IT', 'it-IT', 'it_IT' → 'it'. Qualsiasi altra cosa → null,
// così il chiamante può proseguire nella catena di fallback invece di
// inviare un'email in una lingua che non esiste.
function normalizeLocale(raw: unknown): Locale | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().slice(0, 2);
  return LOCALES.includes(s) ? (s as Locale) : null;
}

function pickLocale(
  orgLocale: unknown,
  customer?: Stripe.Customer | null,
): Locale {
  return normalizeLocale(orgLocale)
    ?? normalizeLocale(customer?.metadata?.locale)
    ?? normalizeLocale(customer?.preferred_locales?.[0])
    ?? DEFAULT_LOCALE;
}

interface MailVars {
  cancelDate?: string;
  nextRenewal?: string;
  amount?: string;
  periodStart?: string;
  periodEnd?: string;
  effectiveDate?: string;
  receiptUrl?: string | null;
  // v10 — COM-10
  planName?: string;
  email?: string | null;
  interval?: string;
  trialEnd?: string;
}

type MailKey = "com1" | "com2" | "com3" | "com6" | "com7" | "com8" | "com9"
  | "com10a" | "com10b";

interface MailCopy {
  subject: string;
  title: string;
  body: (v: MailVars) => string;
  cta: string;
  preheader?: string;    // v10
  footnote?: string;     // v10 — riga dopo la CTA
}

// Evidenzia i valori dinamici (date, importi) nel corpo del messaggio.
function hi(value: string | undefined): string {
  return `<strong style="color:#e8e8e6;">${escapeHtml(value ?? "—")}</strong>`;
}

// ── v10 — parola dell'intervallo di fatturazione, per lingua ───────────────
const INTERVAL_WORD: Record<Locale, Record<string, string>> = {
  it: { monthly: "mese",  annual: "anno" },
  en: { monthly: "month", annual: "year" },
  es: { monthly: "mes",   annual: "año"  },
  fr: { monthly: "mois",  annual: "an"   },
};

// ── v10 — corpo condiviso da COM-10a e COM-10b ─────────────────────────────
// Un solo corpo per lingua: fra benvenuto e bentornato cambiano soltanto
// oggetto, preheader e titolo. Il ramo prova/attivo si sceglie sulla presenza
// di trialEnd, valorizzato solo quando la subscription è in status 'trialing'.
// Le etichette "Sign in" e "Send code" NON si traducono: il blocco di login del
// pannello è hardcoded in inglese, e il testo deve nominare ciò che si vede.
const COM10_BODY: Record<Locale, (v: MailVars) => string> = {
  it: (v) => `Ciao,<br><br>
grazie per aver completato l'acquisto, il tuo piano ${hi(v.planName)} è attivo.<br><br>
${v.trialEnd
  ? `Sei in prova fino al ${hi(v.trialEnd)}. Fino ad allora non ti addebitiamo nulla. Dopo, il rinnovo parte a ${hi(v.amount)}/${escapeHtml(v.interval ?? "—")}.`
  : `Il prossimo rinnovo è il ${hi(v.nextRenewal)}, a ${hi(v.amount)}.`}<br><br>
Ci sei quasi<br><br>
Per accedere dall'estensione usa ${hi(v.email ?? undefined)}. È l'indirizzo a cui è collegato l'abbonamento. Con un'email diversa entreresti in un account senza piano.<br><br>
Da qui bastano tre cose:<br><br>
Apri i DevTools (F12, o ⌥ ⌘ I su Mac) e scegli la scheda "Sevenda".<br><br>
Clicca ☁ Sign in nella barra in alto, inserisci ${hi(v.email ?? undefined)} e premi "Send code". Poi digita il codice a 8 cifre che ti arriva.<br><br>
Aggiungi la tua API key Claude nelle impostazioni. Sevenda usa la tua chiave, quindi i dati restano tra il tuo browser e Anthropic.`,

  en: (v) => `Hi,<br><br>
thanks for completing your purchase — your ${hi(v.planName)} plan is active.<br><br>
${v.trialEnd
  ? `You're on trial until ${hi(v.trialEnd)}. Until then we won't charge you anything. After that, renewal starts at ${hi(v.amount)}/${escapeHtml(v.interval ?? "—")}.`
  : `Your next renewal is ${hi(v.nextRenewal)}, at ${hi(v.amount)}.`}<br><br>
Almost there<br><br>
To sign in from the extension, use ${hi(v.email ?? undefined)}. That's the address your subscription is linked to. With a different email you'd end up in an account with no plan.<br><br>
From here it takes three things:<br><br>
Open DevTools (F12, or ⌥ ⌘ I on Mac) and pick the "Sevenda" tab.<br><br>
Click ☁ Sign in in the top bar, enter ${hi(v.email ?? undefined)} and press "Send code". Then type the 8-digit code you receive.<br><br>
Add your Claude API key in settings. Sevenda uses your key, so your data stays between your browser and Anthropic.`,

  es: (v) => `Hola:<br><br>
gracias por completar la compra, tu plan ${hi(v.planName)} está activo.<br><br>
${v.trialEnd
  ? `Tienes una prueba hasta el ${hi(v.trialEnd)}. Hasta entonces no te cobramos nada. Después, la renovación empieza en ${hi(v.amount)}/${escapeHtml(v.interval ?? "—")}.`
  : `La próxima renovación es el ${hi(v.nextRenewal)}, por ${hi(v.amount)}.`}<br><br>
Ya casi está<br><br>
Para acceder desde la extensión usa ${hi(v.email ?? undefined)}. Es la dirección a la que está vinculada la suscripción. Con otro correo entrarías en una cuenta sin plan.<br><br>
A partir de aquí bastan tres cosas:<br><br>
Abre las DevTools (F12, o ⌥ ⌘ I en Mac) y elige la pestaña "Sevenda".<br><br>
Haz clic en ☁ Sign in en la barra superior, introduce ${hi(v.email ?? undefined)} y pulsa "Send code". Luego escribe el código de 8 dígitos que recibirás.<br><br>
Añade tu clave de API de Claude en los ajustes. Sevenda usa tu clave, así que los datos se quedan entre tu navegador y Anthropic.`,

  fr: (v) => `Bonjour,<br><br>
merci d'avoir finalisé votre achat, votre formule ${hi(v.planName)} est active.<br><br>
${v.trialEnd
  ? `Vous êtes en essai jusqu'au ${hi(v.trialEnd)}. D'ici là, nous ne vous facturons rien. Ensuite, le renouvellement démarre à ${hi(v.amount)}/${escapeHtml(v.interval ?? "—")}.`
  : `Votre prochain renouvellement est le ${hi(v.nextRenewal)}, à ${hi(v.amount)}.`}<br><br>
Vous y êtes presque<br><br>
Pour vous connecter depuis l'extension, utilisez ${hi(v.email ?? undefined)}. C'est l'adresse à laquelle votre abonnement est rattaché. Avec une autre adresse, vous arriveriez dans un compte sans formule.<br><br>
À partir de là, il suffit de trois choses :<br><br>
Ouvrez les DevTools (F12, ou ⌥ ⌘ I sur Mac) et choisissez l'onglet « Sevenda ».<br><br>
Cliquez sur ☁ Sign in dans la barre du haut, saisissez ${hi(v.email ?? undefined)} et appuyez sur « Send code ». Puis tapez le code à 8 chiffres que vous recevrez.<br><br>
Ajoutez votre clé d'API Claude dans les paramètres. Sevenda utilise votre clé : vos données restent entre votre navigateur et Anthropic.`,
};

// ── Testi COM-1…COM-9 ───────────────────────────────────────────────────────
// L'italiano è la versione approvata (analisi funzionale v1.2); EN/FR/ES ne
// seguono struttura e promesse. Nessuna lingua aggiunge o toglie informazioni
// rispetto alle altre: un cliente che cambia lingua deve leggere le stesse cose.
const COPY: Record<Locale, Record<MailKey, MailCopy>> = {
  it: {
    com1: {
      subject: "Rinnovo automatico disattivato",
      title: "Rinnovo automatico disattivato",
      body: (v) => `Hai disattivato il rinnovo automatico del tuo abbonamento. Potrai continuare a utilizzare tutte le funzionalità di Sevenda fino al ${hi(v.cancelDate)}. Se cambi idea, puoi riattivare il rinnovo automatico in qualsiasi momento prima della scadenza.`,
      cta: "Gestisci abbonamento",
    },
    com2: {
      subject: "Rinnovo automatico riattivato",
      title: "Rinnovo automatico riattivato",
      body: (v) => `Il rinnovo automatico del tuo abbonamento è stato riattivato. Non è richiesta alcuna ulteriore azione. Il prossimo rinnovo è previsto per il ${hi(v.nextRenewal)}.`,
      cta: "Gestisci abbonamento",
    },
    com3: {
      subject: "Il tuo abbonamento è terminato",
      title: "Abbonamento terminato",
      body: () => "Il tuo abbonamento è terminato. Non hai più accesso alle funzionalità premium, ma il tuo account e i tuoi dati sono ancora disponibili. Puoi riattivare un piano in qualsiasi momento per continuare a utilizzare Sevenda.",
      cta: "Riattiva un piano",
    },
    com6: {
      subject: "Abbonamento rinnovato",
      title: "Abbonamento rinnovato",
      body: (v) => `Il tuo abbonamento è stato rinnovato con successo. Abbiamo addebitato ${hi(v.amount)} per il periodo ${escapeHtml(v.periodStart ?? "—")} – ${escapeHtml(v.periodEnd ?? "—")}. Il prossimo rinnovo è previsto per il ${hi(v.nextRenewal)}.`,
      cta: "Visualizza ricevuta",
    },
    com7: {
      subject: "Pagamento non riuscito — aggiorna il metodo di pagamento",
      title: "Pagamento non riuscito",
      body: () => "Non siamo riusciti a elaborare il pagamento del tuo abbonamento. Aggiorna il metodo di pagamento per evitare l'interruzione del servizio. Stripe effettuerà automaticamente un nuovo tentativo di addebito.",
      cta: "Aggiorna metodo di pagamento",
    },
    com8: {
      subject: "Piano aggiornato",
      title: "Piano aggiornato",
      body: (v) => `Il tuo piano è stato aggiornato con successo. Le nuove funzionalità sono già disponibili. Ti abbiamo addebitato l'eventuale conguaglio previsto e il prossimo rinnovo avverrà il ${hi(v.nextRenewal)}.`,
      cta: "Gestisci abbonamento",
    },
    com9: {
      subject: "Cambio piano programmato",
      title: "Cambio piano programmato",
      body: (v) => `Il tuo piano verrà aggiornato al termine dell'attuale periodo di fatturazione. Fino a quella data continuerai a utilizzare il piano attuale. Dal ${hi(v.effectiveDate)} saranno applicate le funzionalità previste dal nuovo piano.`,
      cta: "Gestisci abbonamento",
    },
    com10a: {
      subject: "Grazie per aver acquistato Sevenda, il tuo piano è attivo.",
      preheader: "Ecco come accedere.",
      title: "Il tuo piano è attivo",
      body: COM10_BODY.it,
      cta: "Gestisci abbonamento",
      footnote: "Se qualcosa non torna, rispondi pure a questa email.<br><br>— Sevenda",
    },
    com10b: {
      subject: "Grazie per essere tornato, il tuo piano è attivo.",
      preheader: "Il tuo piano è attivo.",
      title: "Bentornato",
      body: COM10_BODY.it,
      cta: "Gestisci abbonamento",
      footnote: "Se qualcosa non torna, rispondi pure a questa email.<br><br>— Sevenda",
    },
  },

  en: {
    com1: {
      subject: "Auto-renewal turned off",
      title: "Auto-renewal turned off",
      body: (v) => `You have turned off auto-renewal for your subscription. You can keep using all Sevenda features until ${hi(v.cancelDate)}. If you change your mind, you can turn auto-renewal back on at any time before that date.`,
      cta: "Manage subscription",
    },
    com2: {
      subject: "Auto-renewal turned back on",
      title: "Auto-renewal turned back on",
      body: (v) => `Auto-renewal for your subscription has been turned back on. No further action is required. Your next renewal is scheduled for ${hi(v.nextRenewal)}.`,
      cta: "Manage subscription",
    },
    com3: {
      subject: "Your subscription has ended",
      title: "Subscription ended",
      body: () => "Your subscription has ended. You no longer have access to premium features, but your account and your data are still available. You can start a plan again at any time to continue using Sevenda.",
      cta: "Start a plan",
    },
    com6: {
      subject: "Subscription renewed",
      title: "Subscription renewed",
      body: (v) => `Your subscription has been renewed successfully. We charged ${hi(v.amount)} for the period ${escapeHtml(v.periodStart ?? "—")} – ${escapeHtml(v.periodEnd ?? "—")}. Your next renewal is scheduled for ${hi(v.nextRenewal)}.`,
      cta: "View receipt",
    },
    com7: {
      subject: "Payment failed — update your payment method",
      title: "Payment failed",
      body: () => "We could not process the payment for your subscription. Update your payment method to avoid any interruption of service. Stripe will automatically retry the charge.",
      cta: "Update payment method",
    },
    com8: {
      subject: "Plan updated",
      title: "Plan updated",
      body: (v) => `Your plan has been updated successfully. The new features are already available. We have charged any applicable adjustment and your next renewal will take place on ${hi(v.nextRenewal)}.`,
      cta: "Manage subscription",
    },
    com9: {
      subject: "Plan change scheduled",
      title: "Plan change scheduled",
      body: (v) => `Your plan will be updated at the end of the current billing period. Until then you will continue using your current plan. From ${hi(v.effectiveDate)} the features of the new plan will apply.`,
      cta: "Manage subscription",
    },
    com10a: {
      subject: "Thanks for purchasing Sevenda — your plan is active.",
      preheader: "Here's how to sign in.",
      title: "Your plan is active",
      body: COM10_BODY.en,
      cta: "Manage subscription",
      footnote: "If something doesn't add up, just reply to this email.<br><br>— Sevenda",
    },
    com10b: {
      subject: "Thanks for coming back — your plan is active.",
      preheader: "Your plan is active.",
      title: "Welcome back",
      body: COM10_BODY.en,
      cta: "Manage subscription",
      footnote: "If something doesn't add up, just reply to this email.<br><br>— Sevenda",
    },
  },

  es: {
    com1: {
      subject: "Renovación automática desactivada",
      title: "Renovación automática desactivada",
      body: (v) => `Has desactivado la renovación automática de tu suscripción. Podrás seguir utilizando todas las funciones de Sevenda hasta el ${hi(v.cancelDate)}. Si cambias de idea, puedes reactivar la renovación automática en cualquier momento antes de esa fecha.`,
      cta: "Gestionar suscripción",
    },
    com2: {
      subject: "Renovación automática reactivada",
      title: "Renovación automática reactivada",
      body: (v) => `La renovación automática de tu suscripción se ha reactivado. No es necesaria ninguna otra acción. Tu próxima renovación está prevista para el ${hi(v.nextRenewal)}.`,
      cta: "Gestionar suscripción",
    },
    com3: {
      subject: "Tu suscripción ha finalizado",
      title: "Suscripción finalizada",
      body: () => "Tu suscripción ha finalizado. Ya no tienes acceso a las funciones premium, pero tu cuenta y tus datos siguen disponibles. Puedes contratar un plan en cualquier momento para seguir utilizando Sevenda.",
      cta: "Contratar un plan",
    },
    com6: {
      subject: "Suscripción renovada",
      title: "Suscripción renovada",
      body: (v) => `Tu suscripción se ha renovado correctamente. Hemos cobrado ${hi(v.amount)} por el periodo ${escapeHtml(v.periodStart ?? "—")} – ${escapeHtml(v.periodEnd ?? "—")}. Tu próxima renovación está prevista para el ${hi(v.nextRenewal)}.`,
      cta: "Ver recibo",
    },
    com7: {
      subject: "Pago no realizado — actualiza tu método de pago",
      title: "Pago no realizado",
      body: () => "No hemos podido procesar el pago de tu suscripción. Actualiza tu método de pago para evitar la interrupción del servicio. Stripe volverá a intentar el cobro automáticamente.",
      cta: "Actualizar método de pago",
    },
    com8: {
      subject: "Plan actualizado",
      title: "Plan actualizado",
      body: (v) => `Tu plan se ha actualizado correctamente. Las nuevas funciones ya están disponibles. Hemos cobrado el ajuste correspondiente y tu próxima renovación se realizará el ${hi(v.nextRenewal)}.`,
      cta: "Gestionar suscripción",
    },
    com9: {
      subject: "Cambio de plan programado",
      title: "Cambio de plan programado",
      body: (v) => `Tu plan se actualizará al final del periodo de facturación actual. Hasta esa fecha seguirás utilizando tu plan actual. A partir del ${hi(v.effectiveDate)} se aplicarán las funciones del nuevo plan.`,
      cta: "Gestionar suscripción",
    },
    com10a: {
      subject: "Gracias por comprar Sevenda, tu plan está activo.",
      preheader: "Así puedes acceder.",
      title: "Tu plan está activo",
      body: COM10_BODY.es,
      cta: "Gestionar suscripción",
      footnote: "Si algo no cuadra, responde a este correo.<br><br>— Sevenda",
    },
    com10b: {
      subject: "Gracias por volver, tu plan está activo.",
      preheader: "Tu plan está activo.",
      title: "Bienvenido de nuevo",
      body: COM10_BODY.es,
      cta: "Gestionar suscripción",
      footnote: "Si algo no cuadra, responde a este correo.<br><br>— Sevenda",
    },
  },

  fr: {
    com1: {
      subject: "Renouvellement automatique désactivé",
      title: "Renouvellement automatique désactivé",
      body: (v) => `Vous avez désactivé le renouvellement automatique de votre abonnement. Vous pourrez continuer à utiliser toutes les fonctionnalités de Sevenda jusqu'au ${hi(v.cancelDate)}. Si vous changez d'avis, vous pouvez réactiver le renouvellement automatique à tout moment avant cette date.`,
      cta: "Gérer l'abonnement",
    },
    com2: {
      subject: "Renouvellement automatique réactivé",
      title: "Renouvellement automatique réactivé",
      body: (v) => `Le renouvellement automatique de votre abonnement a été réactivé. Aucune autre action n'est requise. Votre prochain renouvellement est prévu le ${hi(v.nextRenewal)}.`,
      cta: "Gérer l'abonnement",
    },
    com3: {
      subject: "Votre abonnement a pris fin",
      title: "Abonnement terminé",
      body: () => "Votre abonnement a pris fin. Vous n'avez plus accès aux fonctionnalités premium, mais votre compte et vos données restent disponibles. Vous pouvez souscrire un forfait à tout moment pour continuer à utiliser Sevenda.",
      cta: "Souscrire un forfait",
    },
    com6: {
      subject: "Abonnement renouvelé",
      title: "Abonnement renouvelé",
      body: (v) => `Votre abonnement a été renouvelé avec succès. Nous avons débité ${hi(v.amount)} pour la période ${escapeHtml(v.periodStart ?? "—")} – ${escapeHtml(v.periodEnd ?? "—")}. Votre prochain renouvellement est prévu le ${hi(v.nextRenewal)}.`,
      cta: "Voir le reçu",
    },
    com7: {
      subject: "Échec du paiement — mettez à jour votre moyen de paiement",
      title: "Échec du paiement",
      body: () => "Nous n'avons pas pu traiter le paiement de votre abonnement. Mettez à jour votre moyen de paiement pour éviter toute interruption du service. Stripe effectuera automatiquement une nouvelle tentative de prélèvement.",
      cta: "Mettre à jour le moyen de paiement",
    },
    com8: {
      subject: "Forfait mis à jour",
      title: "Forfait mis à jour",
      body: (v) => `Votre forfait a été mis à jour avec succès. Les nouvelles fonctionnalités sont déjà disponibles. Nous avons débité l'ajustement éventuel et votre prochain renouvellement aura lieu le ${hi(v.nextRenewal)}.`,
      cta: "Gérer l'abonnement",
    },
    com9: {
      subject: "Changement de forfait programmé",
      title: "Changement de forfait programmé",
      body: (v) => `Votre forfait sera mis à jour à la fin de la période de facturation en cours. Jusqu'à cette date, vous continuerez à utiliser votre forfait actuel. À partir du ${hi(v.effectiveDate)}, les fonctionnalités du nouveau forfait s'appliqueront.`,
      cta: "Gérer l'abonnement",
    },
    com10a: {
      subject: "Merci d'avoir acheté Sevenda, votre formule est active.",
      preheader: "Voici comment vous connecter.",
      title: "Votre formule est active",
      body: COM10_BODY.fr,
      cta: "Gérer l'abonnement",
      footnote: "Si quelque chose ne va pas, répondez simplement à cet e-mail.<br><br>— Sevenda",
    },
    com10b: {
      subject: "Content de vous revoir, votre formule est active.",
      preheader: "Votre formule est active.",
      title: "Content de vous revoir",
      body: COM10_BODY.fr,
      cta: "Gérer l'abonnement",
      footnote: "Si quelque chose ne va pas, répondez simplement à cet e-mail.<br><br>— Sevenda",
    },
  },
};

// Compone soggetto e HTML nella lingua richiesta. Una lingua non prevista
// ricade sul default senza sollevare: meglio un'email in italiano che nessuna.
function buildEmail(locale: Locale, key: MailKey, v: MailVars = {}): { subject: string; html: string } {
  const c = (COPY[locale] ?? COPY[DEFAULT_LOCALE])[key];
  // COM-6 è l'unica con CTA verso un URL esterno (la ricevuta Stripe): se manca,
  // l'email parte comunque, senza pulsante.
  const ctaUrl = key === "com6" ? (v.receiptUrl ?? null) : PORTAL_ENTRY_URL;
  return {
    subject: c.subject,
    html: emailLayout({
      title: c.title,
      body: c.body(v),
      ctaLabel: ctaUrl ? c.cta : undefined,
      ctaUrl: ctaUrl ?? undefined,
      preheader: c.preheader,      // v10
      footnote: c.footnote,        // v10
    }),
  };
}

// ── Risolve (o crea) l'organization a partire dal Customer Stripe ─────────────
// v4: restituisce anche email/nome del customer — servono come destinatario
// delle comunicazioni, senza una seconda retrieve.
async function resolveOrg(
  customerId: string,
): Promise<{ orgId: string; country: string; email: string | null; name: string | null; locale: Locale }> {
  // 1) già mappata?
  const { data: existing } = await supabase
    .from("organization").select("id, locale").eq("stripe_customer_id", customerId).maybeSingle();

  // 2) recupera il customer per owner/nome/paese
  const customer = await stripe.customers.retrieve(customerId);
  if ((customer as Stripe.DeletedCustomer).deleted) {
    // v4: permanente — il customer non tornerà in vita a un retry successivo.
    throw new NonRetryableError(`customer ${customerId} cancellato su Stripe`, "customer_deleted");
  }
  const c = customer as Stripe.Customer;
  const country = c.address?.country || "IT";
  const email = c.email ?? null;
  const name = c.name ?? null;

  // v5: la lingua registrata sull'org vince sempre. È l'unico valore che
  // l'utente può aver scelto deliberatamente; i campi Stripe sono ripieghi.
  if (existing) {
    return { orgId: existing.id, country, email, name, locale: pickLocale(existing.locale, c) };
  }

  // Org non ancora esistente: la lingua si fissa ora, dai metadata del checkout.
  const locale = pickLocale(null, c);

  const ownerId = c.metadata?.supabaseUserId;
  if (!ownerId) {
    // v4: permanente — i metadata non si popolano da soli; va corretto a monte.
    console.error(`[webhook] customer ${customerId} senza supabaseUserId in metadata — impossibile creare org`);
    throw new NonRetryableError(`customer ${customerId} senza supabaseUserId`, "missing_owner_metadata");
  }

  const { data: org, error } = await supabase
    .from("organization")
    .insert({ name: c.name || c.email || "Workspace", owner_id: ownerId, stripe_customer_id: customerId, locale })
    .select("id").single();

  // ── v7 / B.1 — Strada 2 resa auto-risolutiva ──────────────────────────────
  // Dietro lo stesso 23505 ci sono due situazioni con esiti opposti:
  //
  //  (a) RACE fra eventi simultanei sullo stesso customer nuovo. Un'altra
  //      invocazione ha già creato la riga fra la nostra select iniziale e
  //      questo insert. La condizione è GIÀ RISOLTA: basta rileggere e
  //      proseguire. Nessun 500, nessun retry, nessuna pulizia manuale — è
  //      esattamente il debito "Strada 2" che era in backlog.
  //
  //  (b) organization_one_per_owner: l'owner possiede già un'altra
  //      organization. Nessun retry potrà mai risolverlo, perché la condizione
  //      non si scioglie da sola. Va chiuso come permanente, altrimenti Stripe
  //      ritenta ogni ~53 minuti finché non si corregge il customer a mano
  //      (osservato in campagna, COM-6).
  //
  // La discriminante è se la rilettura per stripe_customer_id trova qualcosa.
  if (error) {
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("organization").select("id").eq("stripe_customer_id", customerId).maybeSingle();
      if (raced) {
        console.warn(`[webhook] org per ${customerId} creata da un'invocazione concorrente: risolta senza retry`);
        return { orgId: raced.id, country, email, name, locale };
      }
      throw new NonRetryableError(
        `org insert ${customerId}: vincolo violato (${error.details ?? error.message})`,
        "org_constraint_violation",
      );
    }
    dbFail(error, "org insert");
  }
  if (!org) throw new Error(`org insert: nessuna riga restituita per ${customerId}`);

  await supabase.from("organization_member")
    .insert({ org_id: org.id, user_id: ownerId, role: "owner", status: "active" });

  // profilo fiscale di base (P.IVA dai metadata della create-subscription)
  await supabase.from("billing_profile").upsert({
    org_id: org.id, legal_name: c.name, vat_id: c.metadata?.vatId || null,
    country, is_business: !!c.metadata?.vatId,
  }, { onConflict: "org_id" });

  return { orgId: org.id, country, email, name, locale };
}

// Risolve plan_id dal price Stripe via catalogo plan_price. I piani a
// scaglioni condividono lo stesso stripe_price_id su più fasce (tutte con lo
// stesso plan_id) → limit 1 è sicuro.
async function resolvePlanFromPrice(priceId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("plan_price").select("plan_id")
    .eq("stripe_price_id", priceId).limit(1).maybeSingle();
  if (error) {
    console.error(`[webhook] plan_price lookup (${priceId}): ${error.message}`);
    return null;
  }
  return data?.plan_id ?? null;
}

// v10 — nome commerciale del piano per COM-10. La fonte è plan.name: usare una
// mappa hardcoded qui dentro aggiungerebbe una quinta fonte al debito già noto
// sui prezzi. Su errore o riga assente si degrada all'id capitalizzato: un
// "Analyst" ricavato dall'id è accettabile, un'email non inviata no.
async function resolvePlanName(planId: string): Promise<string> {
  const fallback = planId.charAt(0).toUpperCase() + planId.slice(1);
  const { data, error } = await supabase
    .from("plan").select("name").eq("id", planId).maybeSingle();
  if (error) {
    console.error(`[webhook] plan name lookup (${planId}): ${error.message}`);
    return fallback;
  }
  return data?.name ?? fallback;
}

// ── customer.subscription.* ───────────────────────────────────────────────────
async function handleSubscription(
  sub: Stripe.Subscription,
  eventType: string,
  previousAttributes?: Record<string, unknown> | null,
  eventCreated?: number | null,
) {
  // ── v9 / B3 — PRIMA di qualunque altra cosa ──────────────────────────────
  // Il controllo precede resolveOrg per una ragione precisa: resolveOrg non si
  // limita a leggere, su un customer non ancora mappato CREA l'organization. E
  // l'upsert più sotto ricrea la riga subscription che db_purge ha appena
  // rimosso. Un controllo a valle troverebbe il danno già fatto: l'organization
  // di un utente in via di eliminazione risorta, con il suo owner_id.
  // Vale su ogni tipo di evento, non solo su .deleted: anche il
  // customer.subscription.updated generato dalla scrittura del marcatore porta
  // il marcatore, e per un account in eliminazione non c'è nulla da
  // sincronizzare.
  const jobId = deletionJobId(sub);
  if (jobId) {
    throw new SkipEvent(`account_deletion:${jobId}`);
  }

  const { orgId, email, locale } = await resolveOrg(sub.customer as string);

  // v4: stato PRECEDENTE — indispensabile per distinguere le transizioni reali
  // dagli update generici. Letto prima dell'upsert, che lo sovrascriverebbe.
  const { data: prev } = await supabase
    .from("subscription")
    .select("id, plan_id, stripe_price_id, cancel_at, cancel_at_period_end, scheduled_plan_id, status")
    .eq("stripe_subscription_id", sub.id).maybeSingle();

  const item = sub.items.data[0];
  // v8: piano, ciclo e posti vengono ESCLUSIVAMENTE dagli items. I metadata
  // della subscription sono uno scatto congelato al checkout e il Customer
  // Portal non li riscrive mai: usarli come fallback significa, nel momento in
  // cui il percorso principale fallisce, scrivere un dato plausibile e
  // sbagliato al posto di non scrivere nulla.
  const curPriceId = item?.price?.id ?? null;
  const planId = curPriceId ? await resolvePlanFromPrice(curPriceId) : null;
  const priceInterval = item?.price?.recurring?.interval;
  const interval = priceInterval === "month" ? "monthly"
    : priceInterval === "year" ? "annual"
    : null;
  const seats = typeof item?.quantity === "number" && item.quantity > 0
    ? item.quantity
    : null;

  // v4/v8 — guard sulle tre colonne NOT NULL. Senza il fallback sui metadata,
  // l'assenza di uno dei tre valori è una condizione permanente: il price non è
  // in plan_price, oppure ha un intervallo fuori catalogo (day/week), oppure è
  // un price a consumo senza quantity. Nessuna di queste si risolve ritentando.
  if (!planId) {
    throw new NonRetryableError(
      `subscription ${sub.id}: price ${curPriceId ?? "n/d"} non risolvibile in plan_price`,
      "plan_not_resolvable",
    );
  }
  if (!interval) {
    throw new NonRetryableError(
      `subscription ${sub.id}: intervallo ${priceInterval ?? "n/d"} del price ${curPriceId ?? "n/d"} non mappabile su billing_cycle`,
      "interval_not_mappable",
    );
  }
  if (seats === null) {
    throw new NonRetryableError(
      `subscription ${sub.id}: quantity assente o non valida sull'item ${item?.id ?? "n/d"}`,
      "seats_not_resolvable",
    );
  }

  // PATCH v2: periodi a livello item con fallback al top-level.
  const itemRec = (item ?? {}) as unknown as Record<string, number | undefined>;
  const subRec  = sub as unknown as Record<string, number | undefined>;
  const periodStart = itemRec.current_period_start ?? subRec.current_period_start;
  const periodEnd   = itemRec.current_period_end   ?? subRec.current_period_end;

  const row = {
    org_id: orgId,
    plan_id: planId,
    billing_cycle: interval,
    seats,
    status: sub.status,                         // gli stati Stripe coincidono con sub_status
    stripe_subscription_id: sub.id,
    stripe_price_id: item?.price?.id ?? null,
    current_period_start: tsToIso(periodStart),
    current_period_end: tsToIso(periodEnd),
    trial_end: tsToIso(sub.trial_end),
    // v6: cancel_at è il campo che l'API corrente valorizza davvero alla
    // disdetta. Il booleano viene derivato per non rompere la RPC/UI che vi si
    // appoggiano: resta true finché esiste una cessazione programmata.
    cancel_at: tsToIso(sub.cancel_at),
    cancel_at_period_end: sub.cancel_at_period_end === true || sub.cancel_at != null,
    canceled_at: tsToIso(sub.canceled_at),
    cancel_reason: (sub.cancellation_details?.reason as string | null | undefined) ?? null,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Step 7: quando la subscription non ha più uno schedule collegato
  // (rilasciato/annullato/applicato), i campi scheduled_* vanno azzerati.
  const rowFull = sub.schedule ? row : {
    ...row,
    scheduled_plan_id: null, scheduled_change_at: null,
    scheduled_seats: null, scheduled_schedule_id: null,
  };

  // ── v7 / RF-CAN-024 — decorrenza del piano corrente ("Valid from") ────────
  // Trigger di reset: cambio di PLAN_ID, non di price. Il price cambia anche
  // per ciclo di fatturazione e per fascia di posti, che la decisione 3 esclude
  // esplicitamente dai reset; il plan_id no. Un cambio lateral fra family
  // diverse resta un cambio piano e resetta.
  //
  // Timestamp: event.created (decisione 6). Per l'upgrade coincide con
  // l'istante dell'operazione, immediata; per il downgrade con l'istante in cui
  // Stripe emette l'evento che applica la fase futura, cioè la data di entrata
  // in vigore — che è ciò che chiede la decisione 4. Per questo il valore NON
  // si tocca in handleSchedule: alla creazione dello schedule non è ancora
  // cambiato nulla.
  //
  // Guard sugli eventi simultanei: simmetrico a quello di COM-8. Se l'evento
  // dichiara quali campi ha cambiato e gli items non sono fra questi, il piano
  // non è stato toccato da QUESTO evento (è un fratello simultaneo) e la
  // colonna resta com'è. Senza il guard, il confronto col DB sarebbe la stessa
  // race che la v6 ha eliminato per le comunicazioni.
  const planStartedAt: string | null = (() => {
    const at = eventCreated
      ? new Date(eventCreated * 1000).toISOString()
      : new Date().toISOString();
    if (!prev) return at;                       // prima scrittura: decorrenza = ora
    const paLoc = previousAttributes ?? {};
    const touchesPlan = Object.keys(paLoc).length === 0
      || ["items", "plan", "price"].some(
        (k) => Object.prototype.hasOwnProperty.call(paLoc, k),
      );
    if (!touchesPlan) return null;
    return prev.plan_id !== planId ? at : null;
  })();

  // Omettere la chiave quando non c'è reset è deliberato: con upsert, una
  // colonna assente dall'oggetto resta invariata sulla riga esistente. Passarla
  // a null la azzererebbe a ogni evento.
  const rowUpsert = planStartedAt !== null
    ? { ...rowFull, plan_started_at: planStartedAt }
    : rowFull;

  const { data: saved, error } = await supabase
    .from("subscription").upsert(rowUpsert, { onConflict: "stripe_subscription_id" })
    .select("id").single();
  if (error) dbFail(error, "subscription upsert");

  // v8: created_at della riga resta il now() del DB (istante di SCRITTURA);
  // stripe_event_created_at porta l'istante dell'EVENTO. Sulla riga di test i
  // due divergono di quasi otto minuti, e senza il secondo la cronologia
  // ricostruita descrive la latenza del webhook anziché i fatti.
  await supabase.from("subscription_event").insert({
    subscription_id: saved.id, org_id: orgId,
    event_type: eventType, to_state: row as unknown as Record<string, unknown>,
    actor: "stripe_webhook",
    stripe_event_created_at: eventCreated ? new Date(eventCreated * 1000).toISOString() : null,
  });

  // ── v4: comunicazioni ────────────────────────────────────────────────────
  // Ordine dei controlli deliberato: prima la cessazione, poi le transizioni di
  // disdetta, infine il cambio piano. Un evento può portare più informazioni;
  // qui si sceglie sempre UNA sola comunicazione, la più rilevante per l'utente.
  try {
    if (eventType === "customer.subscription.deleted") {
      // COM-3 — cessazione NATURALE. La cessazione da eliminazione account non
      // arriva mai qui: la guardia B3 in testa alla funzione l'ha già
      // intercettata, e in quel caso la comunicazione è COM-5, inviata da
      // delete-account. Da qui in poi il test di COM-3 è a due casi
      // (RF-CAN-003).
      const m = buildEmail(locale, "com3");
      await sendEmail(email, m.subject, m.html, "COM-3");
      return;
    }

    // ── v10 — COM-10: attivazione del piano ────────────────────────────────
    // Si innesca sulla prima transizione verso uno stato SERVITO, non sulla
    // creazione: con Elements + 3DS la subscription nasce 'incomplete' e un
    // messaggio "il tuo piano è attivo" a quel punto sarebbe falso. Il ramo
    // .updated è ristretto a previous_attributes.status === 'incomplete' per
    // non intercettare un past_due → active, che è un recupero da dunning.
    const SERVED_STATES = new Set(["active", "trialing"]);
    const statusBefore = (previousAttributes ?? {}).status;
    const activatedNow =
      (eventType === "customer.subscription.created" && SERVED_STATES.has(sub.status))
      || (eventType === "customer.subscription.updated"
          && statusBefore === "incomplete"
          && SERVED_STATES.has(sub.status));

    if (activatedNow) {
      // Benvenuto vs bentornato: l'upsert è su stripe_subscription_id, quindi
      // al riacquisto la subscription cessata resta come riga distinta. La
      // presenza di altre subscription sulla stessa org è il discriminante.
      const { count, error: cntErr } = await supabase
        .from("subscription").select("id", { count: "exact", head: true })
        .eq("org_id", orgId).neq("stripe_subscription_id", sub.id);
      if (cntErr) console.error(`[webhook] COM-10 storico org ${orgId}: ${cntErr.message}`);
      const returning = (count ?? 0) > 0;

      // Importo: canone ricorrente dagli items (unit_amount × posti), non un
      // totale fatturato — l'evento subscription non lo contiene. È corretto
      // per una previsione di rinnovo, ma divergerebbe dal totale reale in
      // presenza di un coupon: da rivedere se attiverai codici sconto.
      const unit = item?.price?.unit_amount ?? null;
      const key: MailKey = returning ? "com10b" : "com10a";
      const m = buildEmail(locale, key, {
        planName: await resolvePlanName(planId),
        email,
        amount: unit != null ? fmtAmount(unit * seats, item?.price?.currency, locale) : "—",
        interval: INTERVAL_WORD[locale][interval] ?? interval,
        trialEnd: sub.status === "trialing" ? fmtDate(sub.trial_end) : undefined,
        nextRenewal: fmtDate(periodEnd ?? null),
      });
      await sendEmail(email, m.subject, m.html, returning ? "COM-10b" : "COM-10a");
      return;
    }

    if (eventType !== "customer.subscription.updated") return;

    const cancelDate = fmtDate(sub.cancel_at ?? periodEnd ?? null);
    const nextRenewal = fmtDate(periodEnd ?? null);

    // ── v6: stato "prima" da previous_attributes ────────────────────────────
    const pa = previousAttributes ?? {};
    const paKeys = Object.keys(pa);
    const paHas = (k: string) => Object.prototype.hasOwnProperty.call(pa, k);

    // "Cessazione programmata" = esiste una data di fine (cancel_at) oppure il
    // vecchio booleano è attivo. Coprire entrambi rende il codice indipendente
    // dalla versione API con cui l'evento è stato generato.
    const scheduledNow = sub.cancel_at != null || sub.cancel_at_period_end === true;

    let scheduledBefore: boolean | null = null;
    if (paHas("cancel_at") || paHas("cancel_at_period_end")) {
      const beforeCancelAt = paHas("cancel_at") ? pa.cancel_at : sub.cancel_at;
      const beforeFlag = paHas("cancel_at_period_end")
        ? pa.cancel_at_period_end === true
        : sub.cancel_at_period_end === true;
      scheduledBefore = beforeCancelAt != null || beforeFlag;
    } else if (paKeys.length > 0) {
      // L'evento dichiara i propri cambiamenti e la disdetta non è fra questi:
      // è uno dei fratelli simultanei (schedule, cancellation_details…). Non
      // deve generare nulla, ed è questo a rendere impossibili i duplicati.
      scheduledBefore = null;
    } else if (prev) {
      // Nessun previous_attributes (evento sintetico o replay): rete di
      // sicurezza sul DB, con il rischio di race che v6 evita altrove.
      scheduledBefore = prev.cancel_at_period_end === true;
    }

    if (scheduledBefore === false && scheduledNow) {
      const m = buildEmail(locale, "com1", { cancelDate });  // COM-1
      await sendEmail(email, m.subject, m.html, "COM-1");
      return;
    }
    if (scheduledBefore === true && !scheduledNow) {
      const m = buildEmail(locale, "com2", { nextRenewal }); // COM-2
      await sendEmail(email, m.subject, m.html, "COM-2");
      return;
    }
    if (!prev) return;

    // COM-8 (upgrade). Il price è cambiato con effetto IMMEDIATO: dato che il
    // Portal è configurato "upgrade immediato · downgrade a fine periodo"
    // (RNF-CAN-007), un cambio immediato è per definizione un upgrade.
    // Eccezione: se il nuovo piano coincide con quello che era programmato,
    // non è un upgrade ma il downgrade schedulato che entra in vigore — in quel
    // caso l'utente è già stato avvisato con COM-9 e non va riavvisato.
    // v6: se l'evento dichiara i campi cambiati e "items" non è fra questi, il
    // price non è stato toccato da QUESTO evento: valutarlo comunque
    // significherebbe rischiare una COM-8 spuria su un fratello simultaneo.
    if (paKeys.length > 0 && !paHas("items") && !paHas("plan") && !paHas("price")) return;
    const priceChanged = !!curPriceId && prev.stripe_price_id !== curPriceId;
    const scheduledApplying = !!prev.scheduled_plan_id && prev.scheduled_plan_id === planId;
    if (priceChanged && !scheduledApplying) {
      const m = buildEmail(locale, "com8", { nextRenewal }); // COM-8
      await sendEmail(email, m.subject, m.html, "COM-8");
    }
  } catch (err) {
    // Difesa ulteriore: nessuna comunicazione può compromettere la sincronia.
    console.error("[webhook] comunicazioni subscription:", err);
  }
}

// ── subscription_schedule.* (Step 7: downgrade pianificato) ──────────────────
async function handleSchedule(sched: Stripe.SubscriptionSchedule, eventType: string) {
  const subId = typeof sched.subscription === "string"
    ? sched.subscription
    : (sched.subscription as Stripe.Subscription | null)?.id ?? null;
  if (!subId) {
    // v6: uno schedule rilasciato insieme alla subscription arriva con
    // subscription = null. Prima si usciva perdendo la pulizia dei campi
    // scheduled_*; ora si risolve all'indietro dall'id dello schedule, che è
    // già persistito in tabella.
    const { error: clearErr } = await supabase.from("subscription").update({
      scheduled_plan_id: null, scheduled_change_at: null,
      scheduled_seats: null, scheduled_schedule_id: null,
      last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("scheduled_schedule_id", sched.id);
    if (clearErr) console.error(`[webhook] schedule ${sched.id} clear-by-id: ${clearErr.message}`);
    else console.log(`[webhook] schedule ${sched.id} senza subscription: campi scheduled_* azzerati per id`);
    return;
  }

  const touch = { last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const clear = {
    scheduled_plan_id: null, scheduled_change_at: null,
    scheduled_seats: null, scheduled_schedule_id: null, ...touch,
  };

  // v4: stato precedente, per inviare COM-9 solo quando il cambio programmato
  // compare per la prima volta (Stripe emette schedule.updated anche per
  // variazioni che non riguardano la fase futura).
  const { data: prev } = await supabase
    .from("subscription")
    .select("org_id, scheduled_schedule_id, scheduled_plan_id, scheduled_change_at")
    .eq("stripe_subscription_id", subId).maybeSingle();

  const ended = eventType === "subscription_schedule.released"
    || sched.status === "released" || sched.status === "canceled" || sched.status === "completed";
  const curEnd = sched.current_phase?.end_date ?? null;
  const future = ended ? undefined
    : (sched.phases ?? []).find((p) => curEnd !== null && p.start_date >= curEnd);

  if (ended || !future) {
    // schedule terminato, o una sola fase: nessun cambio pendente → azzera
    const { error } = await supabase.from("subscription").update(clear)
      .eq("stripe_subscription_id", subId);
    if (error) dbFail(error, "schedule clear");   // v7 — B.1
    return;
  }

  const fItem = future.items?.[0];
  const fPriceId = typeof fItem?.price === "string" ? fItem.price : (fItem?.price as Stripe.Price | undefined)?.id ?? null;
  const planId = fPriceId ? await resolvePlanFromPrice(fPriceId) : null;
  if (!planId) {
    // Permanente: il price non è nel catalogo e non ci finirà da solo. Prima
    // era un return silenzioso; ora l'evento viene archiviato con outcome
    // esplicito, così il caso è visibile in query invece che solo nei log.
    console.error(`[webhook] schedule ${sched.id}: price ${fPriceId} non in plan_price`);
    throw new NonRetryableError(`price ${fPriceId} non in plan_price`, "price_not_in_catalog");
  }

  const { error } = await supabase.from("subscription").update({
    scheduled_plan_id: planId,
    scheduled_change_at: tsToIso(future.start_date),
    scheduled_seats: fItem?.quantity ?? null,
    scheduled_schedule_id: sched.id,
    ...touch,
  }).eq("stripe_subscription_id", subId);
  if (error) dbFail(error, "schedule update");   // v7 — B.1

  // ── v4: COM-9 (downgrade programmato) ────────────────────────────────────
  // Il downgrade NON cambia subito il price della subscription: crea uno
  // schedule con la fase futura. È quindi qui — non in handleSubscription — che
  // il cambio va comunicato. Invio solo alla prima comparsa del cambio: uno
  // schedule.updated ripetuto con gli stessi valori non rigenera l'email.
  const isNew = !prev?.scheduled_plan_id
    || prev.scheduled_plan_id !== planId
    || prev.scheduled_schedule_id !== sched.id;
  if (isNew) {
    try {
      const { data: org } = await supabase
        .from("organization").select("stripe_customer_id, locale").eq("id", prev?.org_id ?? "").maybeSingle();
      let email: string | null = null;
      let customer: Stripe.Customer | null = null;
      if (org?.stripe_customer_id) {
        const c = await stripe.customers.retrieve(org.stripe_customer_id as string);
        if (!(c as Stripe.DeletedCustomer).deleted) {
          customer = c as Stripe.Customer;
          email = customer.email ?? null;
        }
      }
      const locale = pickLocale(org?.locale, customer);
      const m = buildEmail(locale, "com9", { effectiveDate: fmtDate(future.start_date) });
      await sendEmail(email, m.subject, m.html, "COM-9");
    } catch (err) {
      console.error("[webhook] comunicazione COM-9:", err);
    }
  }
}

// ── invoice.* ─────────────────────────────────────────────────────────────────
function mapInvoiceStatus(s: string | null): string {
  switch (s) {
    case "paid": return "paid";
    case "void": case "uncollectible": return "void";
    case "draft": return "draft";
    default: return "issued";                   // 'open' e altri → emessa
  }
}

// ── v11 — id Stripe della subscription a cui l'invoice si riferisce ────────
// Ordine deliberato: prima il percorso dell'API corrente, poi quello storico.
// Non il contrario — su un payload che li contenesse entrambi deve vincere
// quello che l'API genera oggi.
//   1) parent.subscription_details.subscription — API 2026-04-22.dahlia;
//   2) inv.subscription — rimosso dall'API corrente, tenuto per gli eventi più
//      vecchi ancora presenti in stripe_event.
// Entrambi possono arrivare come stringa o come oggetto espanso: si accettano
// tutte e due le forme invece di assumere quella non espansa.
function invoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  const rec = inv as unknown as Record<string, unknown>;
  const parent = rec.parent as
    | { subscription_details?: { subscription?: unknown } | null }
    | null
    | undefined;
  const candidates = [parent?.subscription_details?.subscription, rec.subscription];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
    const id = (c as { id?: unknown } | null | undefined)?.id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

async function handleInvoice(inv: Stripe.Invoice, eventType: string) {
  const { orgId, country, email, locale } = await resolveOrg(inv.customer as string);

  // collega alla subscription locale, se presente
  // v11: l'id non sta più su inv.subscription — vedi invoiceSubscriptionId().
  let subscriptionId: string | null = null;
  const stripeSubId = invoiceSubscriptionId(inv);
  if (stripeSubId) {
    const { data: s } = await supabase
      .from("subscription").select("id")
      .eq("stripe_subscription_id", stripeSubId).maybeSingle();
    subscriptionId = s?.id ?? null;
    if (!subscriptionId) {
      // Non è un errore: una invoice.finalized può arrivare prima che
      // customer.subscription.created sia stato elaborato. La riga si scrive
      // comunque scollegata e l'upsert dell'evento successivo sulla stessa
      // invoice la ricollega. Va però loggato: è esattamente il NULL che per
      // otto fatture è rimasto invisibile.
      console.warn(`[webhook] invoice ${inv.id}: subscription ${stripeSubId} non ancora in DB, riga non collegata`);
    }
  } else if (inv.billing_reason?.startsWith("subscription")) {
    // Una fattura di abbonamento che non nomina la subscription in NESSUNO dei
    // percorsi noti significa che il payload è cambiato ancora: va visto, non
    // assorbito in silenzio come è successo finora.
    const parentType = (inv as unknown as { parent?: { type?: unknown } }).parent?.type;
    console.error(`[webhook] invoice ${inv.id}: nessun id subscription nel payload (parent.type=${String(parentType ?? "n/d")})`);
  }

  const provider = country === "IT" ? "aruba" : (EU.has(country) ? "stripe" : "stripe");

  const row = {
    org_id: orgId,
    subscription_id: subscriptionId,
    number: inv.number,
    status: mapInvoiceStatus(inv.status),
    currency: (inv.currency || "eur").toUpperCase(),
    subtotal_cents: inv.subtotal ?? 0,
    vat_cents: inv.tax ?? 0,
    total_cents: inv.total ?? 0,
    stripe_invoice_id: inv.id,
    provider,
    // per la UE Stripe è già il documento; per l'IT lo riempirà l'emissione Aruba
    external_doc_ref: provider === "stripe" ? inv.id : null,
    hosted_url: inv.hosted_invoice_url ?? null,
    issued_at: tsToIso(inv.status_transitions?.finalized_at),
    paid_at: tsToIso(inv.status_transitions?.paid_at),
  };

  const { error } = await supabase
    .from("invoice").upsert(row, { onConflict: "stripe_invoice_id" });
  if (error) dbFail(error, "invoice upsert");   // v7 — B.1

  // TODO emissione IT: se provider='aruba' e status='paid', enqueue verso l'API Aruba
  // (SDI) per generare la fattura elettronica e scrivere external_doc_ref.

  // ── v4: comunicazioni ────────────────────────────────────────────────────
  try {
    const invRec = inv as unknown as Record<string, unknown>;

    if (eventType === "invoice.paid") {
      // COM-6 solo per i RINNOVI: billing_reason 'subscription_create' è la prima
      // fattura (già coperta dalla conferma di attivazione del checkout) e
      // 'subscription_update' è il conguaglio di un upgrade (coperto da COM-8).
      if (inv.billing_reason !== "subscription_cycle") return;

      const line = inv.lines?.data?.[0] as unknown as Record<string, unknown> | undefined;
      const period = (line?.period ?? {}) as { start?: number; end?: number };
      const m = buildEmail(locale, "com6", {
        amount: fmtAmount(inv.amount_paid ?? inv.total, inv.currency, locale),
        periodStart: fmtDate(period.start ?? null),
        periodEnd: fmtDate(period.end ?? null),
        nextRenewal: fmtDate(period.end ?? null),
        receiptUrl: inv.hosted_invoice_url ?? null,
      });
      await sendEmail(email, m.subject, m.html, "COM-6");
      return;
    }

    if (eventType === "invoice.payment_failed") {
      // COM-7 SOLO al primo tentativo fallito del ciclo: i retry del dunning
      // Stripe emettono lo stesso evento più volte e l'utente non va tempestato.
      // attempt_count viene da Stripe: nessuno stato locale da mantenere.
      const attempts = Number(invRec.attempt_count ?? 0);
      if (attempts > 1) {
        console.log(`[webhook] COM-7 saltata: tentativo ${attempts} del dunning`);
        return;
      }
      const m = buildEmail(locale, "com7");
      await sendEmail(email, m.subject, m.html, "COM-7");
    }
  } catch (err) {
    console.error("[webhook] comunicazioni invoice:", err);
  }
}

// ── customer.updated → aggiorna profilo fiscale ───────────────────────────────
async function handleCustomer(c: Stripe.Customer) {
  const { data: org } = await supabase
    .from("organization").select("id, locale").eq("stripe_customer_id", c.id).maybeSingle();
  if (!org) return;

  // v5: allineamento della lingua. Si aggiorna SOLO se i metadata portano un
  // valore valido e diverso: un customer.updated per altri motivi (indirizzo,
  // P.IVA, metodo di pagamento) non deve resettare una preferenza esistente.
  const incoming = normalizeLocale(c.metadata?.locale);
  if (incoming && incoming !== org.locale) {
    const { error } = await supabase.from("organization")
      .update({ locale: incoming, updated_at: new Date().toISOString() }).eq("id", org.id);
    if (error) console.error(`[webhook] locale update org ${org.id}: ${error.message}`);
  }
  await supabase.from("billing_profile").upsert({
    org_id: org.id,
    legal_name: c.name,
    vat_id: c.metadata?.vatId || null,
    country: c.address?.country || "IT",
    address_line1: c.address?.line1 ?? null,
    address_line2: c.address?.line2 ?? null,
    city: c.address?.city ?? null,
    state: c.address?.state ?? null,
    postal_code: c.address?.postal_code ?? null,
    is_business: !!c.metadata?.vatId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "org_id" });
}

// ── Entry point ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, signature, WEBHOOK_SECRET, undefined, cryptoProvider,
    );
  } catch (err) {
    return new Response(`Signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  // Idempotenza: l'insert dell'event.id funge da lock. Duplicato → 200, esci.
  const { error: dupErr } = await supabase
    .from("stripe_event").insert({ id: event.id, type: event.type, payload: event as unknown as Record<string, unknown> });
  if (dupErr) {
    if (dupErr.code === "23505") return new Response("ok (duplicate)", { status: 200 });
    console.error("[webhook] stripe_event insert error", dupErr);
    return new Response("db error", { status: 500 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscription(
          event.data.object as Stripe.Subscription,
          event.type,
          (event.data as unknown as { previous_attributes?: Record<string, unknown> }).previous_attributes ?? null,
          event.created,                        // v7 — RF-CAN-024 (decisione 6)
        );
        break;
      case "subscription_schedule.updated":
      case "subscription_schedule.released":
        await handleSchedule(event.data.object as Stripe.SubscriptionSchedule, event.type);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized":
        await handleInvoice(event.data.object as Stripe.Invoice, event.type);
        break;
      case "customer.updated":
        await handleCustomer(event.data.object as Stripe.Customer);
        break;
      default:
        break;                                  // evento registrato ma non gestito
    }
  } catch (err) {
    // v9 — evento saltato per DECISIONE (B3), non per errore: la riga resta,
    // con outcome 'processed' e il dettaglio che ne spiega la ragione.
    if (err instanceof SkipEvent) {
      await markOutcome(event.id, "processed", err.detail);
      console.log(`[webhook] saltato (${event.type}): ${err.detail}`);
      return new Response(`ok (skipped)`, { status: 200 });
    }
    // v4 — Strada 2: si distingue fra permanente e transitorio.
    if (err instanceof NonRetryableError) {
      // La riga stripe_event RESTA: l'evento è chiuso, Stripe non ritenta.
      await markOutcome(event.id, "permanent_error", err.outcome);
      console.error(`[webhook] non ritentabile (${event.type} / ${err.outcome}):`, err.message);
      return new Response(`ok (unprocessable: ${err.outcome})`, { status: 200 });
    }
    // Transitorio: sblocca l'idempotenza così Stripe può ritentare l'evento.
    // Nessun outcome da registrare: la riga viene cancellata.
    await supabase.from("stripe_event").delete().eq("id", event.id);
    console.error(`[webhook] handler error (${event.type}):`, err);
    return new Response(`handler error: ${(err as Error).message}`, { status: 500 });
  }

  await markOutcome(event.id, "processed");
  return new Response("ok", { status: 200 });
});
