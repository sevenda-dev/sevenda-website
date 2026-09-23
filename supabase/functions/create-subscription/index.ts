// ════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: create-subscription   (PATCH v13)
// ════════════════════════════════════════════════════════════════
// Flusso in DUE FASI (v9):
//   fase 1 — crea/riusa il Customer e un SetupIntent; restituisce il
//            client_secret da confermare con Stripe Elements (checkout.html);
//   fase 2 — a carta confermata, crea la Subscription con la carta già
//            agganciata (checkout-success.html, body con `setupIntentId`).
//
// PATCH v9 (Strada B — la subscription nasce SOLO a carta confermata).
// Fino alla v8 la subscription veniva creata all'apertura del checkout, PRIMA
// che l'utente inserisse la carta: con trial_period_days > 0 Stripe ignora
// default_incomplete e la crea direttamente 'trialing' (osservato su staging il
// 31/08/2026: sub creata alle 15:36:03, carta agganciata alle 15:40:55). Nella
// finestra fra i due istanti, e per sempre se l'utente abbandona:
//   (a) resolve_entitlement concedeva il tier 'paid' sul solo status, quindi
//       accesso completo per 14 giorni senza alcuna carta;
//   (b) findLiveSubscription vedeva una subscription 'trialing' e rispondeva
//       409 already_subscribed a chi tentava di completare l'acquisto;
//   (c) il webhook inviava COM-10 "il tuo piano è attivo" a chi non aveva
//       ancora pagato.
// Ora la fase 1 non crea alcuna subscription. Il contesto dell'ordine (piano,
// ciclo, posti, price, utente) viaggia nei METADATA del SetupIntent e la fase 2
// lo rilegge da lì, non dal body: sopravvive al redirect 3DS senza stato lato
// client e non è manipolabile dal browser.
//   Idempotenza: la creazione della subscription usa Idempotency-Key = id del
//   SetupIntent. Un refresh della pagina di esito o un retry esplicito
//   restituiscono la STESSA subscription invece di crearne una seconda. Il
//   guard BR-001 non basta da solo perché dipende dal fatto che il webhook
//   abbia già scritto l'org — una race.
//   Autorizzazione della fase 2: il supabaseUserId del body deve coincidere
//   con quello nei metadata del SetupIntent, e il SetupIntent deve essere
//   'succeeded' con un payment_method. Non è una difesa forte (la funzione è
//   --no-verify-jwt come prima), ma non peggiora la postura attuale e rende
//   il vincolo esplicito.
//   Guard BR-001 in fase 2: se scatta, si risponde 200 con
//   status 'already_subscribed' e NON 409. La fase 2 è raggiungibile solo dopo
//   una fase 1 andata a buon fine, quindi un guard positivo qui significa che la
//   subscription di QUESTO flusso (o di una race gemella) esiste già: per la
//   pagina di esito è un successo, non un errore.
//   trialEnd in fase 1 è null: non esiste ancora una subscription. checkout.html
//   ha già il fallback "oggi + trialDays" per quel caso.
//
// PATCH v10 (IVA — il vatId diventa un Tax ID vero).
// Fino alla v9 la partita IVA raccolta in checkout.html finiva SOLO in
// customer.metadata.vatId. Stripe Tax non legge i metadata: legge la collection
// tax_ids del Customer. Conseguenza: ogni Customer aveva tax_ids vuoto
// (verificato in produzione su cus_VA42cU... il 01/09/2026, total_count: 0) e il
// reverse charge non sarebbe MAI scattato — un cliente business tedesco che
// inserisce correttamente la sua VAT si sarebbe visto addebitare il 19%.
//   È la stessa classe di difetto chiusa dalla v6 sui metadata volatili: un
//   valore scritto e mai riletto da chi dovrebbe. Con l'aggravante che qui la
//   fonte plausibile e sbagliata sta davanti all'utente, che compila il campo
//   convinto che serva a qualcosa.
//   syncTaxId() è idempotente (la fase 1 è rieseguibile: retry, refresh, 3DS
//   fallito) e sostitutiva: un vatId corretto a metà checkout rimpiazza il
//   precedente invece di accumularsi, perché con due tax_id attivi la scelta di
//   quale applicare non è nostra.
//   Formato invalido = RIFIUTO, non prosecuzione silenziosa. Stessa logica del
//   rifiuto posti della v8: addebitare l'IVA a chi ha diritto al reverse charge
//   passa inosservato fino alla fattura, e a quel punto è tardi. L'errore esce
//   in fase 1, prima che l'utente inserisca la carta.
//   Errori NON di formato (rete, Stripe 5xx) sono best-effort: si logga e si
//   prosegue. Un tax_id mancante è recuperabile dal Customer Portal e corregge
//   la fattura successiva; un checkout bloccato da un timeout no.
//   Tipi supportati: eu_vat, gb_vat, ch_vat. NON si mappa US/CA: negli Stati
//   Uniti l'EIN non produce esenzione (serve un exemption certificate) e
//   mapparlo darebbe una falsa sicurezza; per il Canada il tipo dipende dalla
//   provincia. Paese non mappato ⇒ nessun tax_id, log e avanti.
//   automatic_tax sulla subscription (fase 2): senza, ogni fattura di rinnovo
//   esce senza imposta anche con le registrazioni fiscali attive. Con il trial
//   la prima fattura è zero, quindi l'effetto si vede solo al primo rinnovo
//   reale — motivo in più per non accorgersene testando il solo checkout.
//
// PATCH v11 (consenso art. 59 — esecuzione immediata per i consumatori).
// checkout.html raccoglie dal consumatore la richiesta espressa di avviare
// subito il servizio e la presa d'atto che il recesso si perde a esecuzione
// completata (art. 59 D.Lgs. 206/2005). Senza quel consenso la clausola
// "non-refundable" dei Termini non è opponibile a un consumatore nei primi 14
// giorni — ma un consenso raccolto e mai scritto da nessuna parte non è
// provabile, che in giudizio equivale a non averlo raccolto.
//   DOVE: metadata del SetupIntent in fase 1, ricopiati sulla subscription in
//   fase 2. È lo stesso canale che la v9 usa per il contesto d'ordine, per le
//   stesse ragioni: sopravvive al redirect 3DS e non ripassa dal browser fra le
//   due fasi. La subscription è l'oggetto giusto perché il consenso appartiene
//   al contratto, non alla persona.
//   NON sul Customer: customerParams viene riscritto a ogni fase 1 (è lo stesso
//   oggetto usato per l'update del dedup v3), quindi un checkout successivo
//   sovrascriverebbe il consenso del precedente. Un registro storico che si
//   cancella da solo è peggio di nessun registro.
//   NON è una validazione, è una REGISTRAZIONE: qui non si rifiuta nulla.
//   L'obbligo della spunta sta in checkout.html. Un rifiuto lato server
//   romperebbe (a) i checkout business, che la casella non la vedono per
//   costruzione, e (b) i SetupIntent già in volo al momento del deploy, creati
//   dalla fase 1 vecchia e attivati dalla fase 2 nuova. Metadata assenti ⇒
//   nessuna chiave scritta, nessun errore.
//   Il timestamp si scrive solo quando il consenso c'è: encodeForm scarta le
//   stringhe vuote, quindi "false" finisce nei metadata e "" no. Distinguere
//   "consumatore che non ha spuntato" da "acquisto business" si fa dal tax_id
//   del Customer, non da qui.
//   La v6 sconsiglia i metadata che invecchiano: questo non è di quelli. Piano,
//   posti e ciclo cambiano dal Portal; un consenso prestato a una certa data è
//   un fatto storico e non diventa mai obsoleto.
//
// PATCH v12 (IVA italiana ai consumatori UE — tax rate manuale).
// Sotto la soglia dei 10.000 EUR/anno di vendite B2C transfrontaliere, e senza
// opzione OSS esercitata, le cessioni a consumatori UE restano imponibili in
// Italia (art. 59c Dir. 2006/112/CE, art. 7-octies DPR 633/72): al consumatore
// tedesco si applica il 22% italiano, non il 19% tedesco.
//   PERCHÉ NON BASTA STRIPE TAX: verificato in produzione il 21/09/2026 con la
//   Tax Calculation API. Con la registrazione oss_union attiva Stripe applicava
//   l'aliquota di destinazione (DE 19%); fatta scadere quella registrazione e
//   rimasta la sola domestica IT, Stripe passa a 0% con taxability_reason
//   "not_collecting". Non implementa la micro-esenzione: segue le registrazioni
//   e basta. Le due alternative native sarebbero registrarsi in ogni paese UE
//   (falso: non lo siamo) o riattivare l'OSS (l'opzione non è stata esercitata),
//   quindi resta il tax rate manuale.
//   DOVE: solo sul ramo consumatore UE FUORI dall'Italia. Gli altri tre casi
//   Stripe Tax li risolve già correttamente — IT 22%, reverse charge B2B
//   intra-UE con partita IVA, extra-UE 0% — e restano su automatic_tax, perché
//   un tax rate manuale spegne anche il reporting di Stripe Tax e non va esteso
//   dove non serve.
//   COME: automatic_tax disabilitato e default_tax_rates con l'aliquota IT 22%
//   (TaxRate da creare una volta per modalità, ID in STRIPE_IT_VAT_RATE_ID).
//   Vale anche sui rinnovi, che è il punto: default_tax_rates resta sulla
//   subscription.
//   DISCRIMINANTE: la stessa di tutto il checkout, cioè la presenza della
//   partita IVA. Deciso in fase 1, dove il vatId e il paese esistono, e
//   trasportato alla fase 2 nei metadata del SetupIntent — stesso canale del
//   consenso art. 59 della v11, per le stesse ragioni.
//   SE IL TAXRATE NON È CONFIGURATO si blocca in fase 1, prima che l'utente
//   inserisca la carta, invece di proseguire su automatic_tax. Proseguire
//   significherebbe una subscription a IVA zero su un'operazione imponibile in
//   Italia: un ammanco che nessuno vede fino alla dichiarazione, che è
//   esattamente il modo di sbagliare che la v10 rifiutava sul reverse charge.
//   LIMITE NOTO: con automatic_tax spento, una partita IVA aggiunta più tardi
//   dal Customer Portal non fa scattare il reverse charge sui rinnovi (con
//   automatic_tax sarebbe stato automatico). Va gestita a mano sulla
//   subscription. Il caso inverso — B2B che perde la partita IVA — non esiste.
//   QUANDO RIMUOVERE TUTTO QUESTO: superata la soglia, o esercitata l'opzione
//   OSS, torna l'aliquota di destinazione. Allora si aggiunge la registrazione
//   OSS in Stripe, si toglie il ramo manuale qui e si rimettono le aliquote per
//   paese in iva.config.js e in checkout.html.
//
// PATCH v13 (Codice Destinatario e Codice Fiscale — fatt. elettronica IT).
// Lo SDI recapita la fattura elettronica a un'azienda italiana solo se sa dove
// mandarla: sette caratteri alfanumerici, oppure 0000000 che significa
// "cassetto fiscale". Senza nessuno dei due la fattura non è emettibile, quindi
// il dato si raccoglie al checkout invece di rincorrerlo dopo l'incasso.
//   A CHI SI CHIEDE: partita IVA con prefisso IT, oppure paese Italia con
//   partita IVA compilata senza prefisso — che Stripe rifiuterebbe comunque
//   come formato, ma che non deve far sparire un campo obbligatorio a chi ha
//   solo dimenticato due lettere. Chi non compila la partita IVA non lo vede:
//   per un consumatore il Codice Destinatario non esiste.
//   VALIDAZIONE ANCHE QUI, non solo in checkout.html: la funzione è un endpoint
//   pubblico (--no-verify-jwt), e vale la stessa ragione della v8 sui posti. Il
//   controllo sta PRIMA di qualunque scrittura su Stripe, perché è validazione
//   di input pura e non ha bisogno di un Customer per essere fatta.
//   DOVE FINISCE: (a) customer.metadata.sdiCode, da cui il webhook lo porta in
//   billing_profile e sulla riga invoice; (b) customer.invoice_settings.
//   custom_fields, che è ciò che lo fa comparire sul PDF Stripe.
//   L'etichetta resta "Codice Destinatario" in tutte le lingue: è un termine
//   fiscale italiano su un documento destinato allo SDI, e il campo compare
//   solo su fatture verso aziende italiane. Le quattro traduzioni riguardano il
//   form, non la fattura.
//   RIASSERITO IN FASE 2 insieme al default_payment_method, nella stessa
//   chiamata: la fase 2 riscrive invoice_settings per la carta, e affidarsi al
//   merge di Stripe per non perdere i custom_fields sarebbe una scommessa su un
//   comportamento che non controlliamo. Il codice viaggia nei metadata del
//   SetupIntent come tutto il resto del contesto d'ordine.
//   CODICE FISCALE, il ramo complementare: la fatturazione elettronica è
//   obbligatoria anche verso i PRIVATI residenti in Italia, e per un privato lo
//   SDI vuole il codice fiscale (sedici caratteri; il recapito è il cassetto
//   fiscale, CodiceDestinatario 0000000, implicito e non richiesto). Si
//   raccoglie a paese Italia CON partita IVA vuota — l'esatto complemento del
//   Codice Destinatario, mai presenti insieme per costruzione: sulla fattura
//   viaggia quindi UN solo custom field, o l'uno o l'altro. Il formato
//   strutturale completo (omocodia, carattere di controllo) resta fuori per
//   scelta: sedici alfanumerici, l'Agenzia verifica il resto allo scarto.
//   Entrambi i valori sono accettati SOLO sul proprio ramo: un POST diretto con
//   un fiscalCode e un indirizzo tedesco lo perde, invece di scrivere su
//   Stripe un dato che non appartiene a quell'ordine.
//   LIMITE NOTO: un Customer che passa da azienda italiana a estera conserva il
//   custom field. encodeForm scarta le stringhe vuote, quindi da qui non c'è
//   modo di azzerarlo; va rimosso a mano sul Customer. Preferito a un ramo di
//   cancellazione che nessuno eserciterebbe mai e che marcirebbe.
//
// PATCH v2: aggiunge `supabaseUserId` (e `orgName`) ai metadata del
// Customer, così la Edge Function `stripe-webhook` può collegare il
// pagamento all'utente/organization Supabase. checkout.html deve
// passare supabaseUserId (id dell'utente loggato) nel body.
//
// PATCH v3 (dedup customer): prima di creare un Customer si cerca quello
// già associato all'utente, così un retry del checkout (3DS fallito,
// refresh, doppio click) non genera Customer/organization duplicati.
// Strategia:
//   1) mappa autorevole organization.stripe_customer_id (Supabase REST),
//      risolta per owner_id = supabaseUserId — la scrive il webhook;
//   2) fallback: Stripe Customer Search per metadata.supabaseUserId.
// Se trovato, il Customer viene riusato (e i dati di fatturazione
// aggiornati); altrimenti se ne crea uno nuovo.
//
// PATCH v4 (trial 14gg): la subscription parte con trial_period_days=14. Con il
// trial la prima fattura e' zero -> niente PaymentIntent: si usa il pending_setup_intent
// (carta raccolta subito, addebito a fine trial). La risposta include mode
// ("setup"|"payment"), trialEnd e trialDays per il branching lato checkout.html.
//
// PATCH v6 (metadata volatili rimossi): planId, interval e seats non vengono
// più scritti nei metadata. Erano uno scatto congelato al momento del checkout
// che nessuno aggiornava mai: il Customer Portal cambia piano, posti e ciclo
// sugli ITEMS e non tocca i metadata. Osservato in staging il 03/08/2026 sulla
// subscription sub_1Tu8Kc...: metadata planId="analyst"/seats="1" contro items
// Suite Team con 2 posti — quattordici giorni e due cambi piano di ritardo.
// Dalla v8 il webhook legge piano, ciclo e posti ESCLUSIVAMENTE dagli items e
// non ha più alcun fallback sui metadata, quindi questi tre valori erano
// diventati dato scritto e mai riletto: né dal webhook, né dall'estensione
// (verificato: zero occorrenze). Lasciarli avrebbe significato conservare una
// fonte plausibile e sbagliata a disposizione del prossimo che la trova.
//   RESTANO: supabaseUserId (stabile, serve a resolveOrg e alle ricerche in
//   dashboard), vatId e orgName sul Customer.
//   NB: rimuovere una chiave da questo codice NON la cancella dagli oggetti
//   Stripe già esistenti — l'update fa merge e encodeForm scarta i valori
//   vuoti. La pulizia degli oggetti in essere va fatta a parte, via CLI.
//
// PATCH v5 (guard BR-001): prima di creare la subscription si verifica che
// l'utente non abbia già una subscription live (trialing/active/past_due) sulla
// propria organization. In tal caso si risponde 409 already_subscribed senza
// creare nulla su Stripe: i cambi piano avvengono nel Customer Portal, non
// ricreando una subscription. Chiude il difetto che produceva subscription/org
// doppie. Best-effort: se i secret Supabase mancano, il guard è no-op (il
// vincolo DB resta come rete di sicurezza a valle). NB: contro i checkout
// ravvicinati (race prima che il webhook crei l'org) il guard non basta da solo
// — la garanzia forte è il vincolo unique parziale su subscription(org_id).
//
// PATCH v7 (pre-check disponibilità del price): dopo la risoluzione del priceId
// e PRIMA di creare la subscription si rilegge il price da Stripe con il product
// espanso, e si richiede che siano attivi ENTRAMBI. I due casi osservati in
// produzione sono diversi e nessuno dei due si sarebbe visto controllando un
// campo solo: Auditor aveva price.active=true con product.active=false — ed è
// così che è esploso — mentre Analyst ha ora price.active=false.
//   Senza il controllo l'errore arrivava da /v1/subscriptions e il catch finale
//   lo rimandava al client grezzo: un utente si è letto in pagina "The product
//   prod_Ulntl... is marked as inactive... You provided the plan price_1TmGHc...".
//   Gli identificativi Stripe non significano nulla per chi compra e non devono
//   uscire dal server: restano nei log, al client va un testo generico.
//   Il fallimento esce con un return dedicato e non con un throw, così il catch
//   finale resta invariato e nessun altro percorso di errore cambia.
//   Fail-closed anche quando il price non è leggibile o il product non risulta
//   espanso: "non ho potuto verificare" non è "è a posto", e proseguire
//   significherebbe ricadere esattamente nell'errore grezzo da evitare.
//
// PATCH v8 (validazione posti): la quantità viene verificata contro il range di
// posti dichiarato dal piano (PLAN_SEATS) e RIFIUTATA se fuori, invece di essere
// corretta in silenzio. Il limite esisteva solo in checkout.html, sui bottoni
// +/− del contatore; questa funzione è però un endpoint pubblico (deploy con
// --no-verify-jwt), quindi un POST diretto con quantity: 50 creava davvero una
// subscription a 50 posti su un piano venduto fino a 20 — e dalla v8 il webhook
// legge i posti dagli items, quindi quel numero sarebbe finito a DB come verità.
//   Rifiuto e non clamp: addebitare un numero di posti diverso da quello
//   richiesto è peggio dell'errore, perché passa inosservato fino alla fattura.
//   Il vecchio Math.max(1, …) faceva esattamente questo, e per i piani team
//   accettava anche 1 posto su un minimo di 2.
//   Fail-closed sui piani non in tabella, come il pre-check v7: un piano di cui
//   non si conosce il range non è un piano da vendere senza controllo.
//
// Deploy:  supabase functions deploy create-subscription --no-verify-jwt
// Secrets opzionali per la mappa autorevole (consigliati):
//   supabase secrets set SUPABASE_URL=https://<project>.supabase.co
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
// ════════════════════════════════════════════════════════════════

const STRIPE_API = "https://api.stripe.com/v1";
const TRIAL_DAYS = 14;   // giorni di prova gratuita (carta subito, addebito a fine trial)

// Stati considerati "vivi" per il guard BR-001 (una subscription in uno di
// questi stati impedisce di crearne una seconda per lo stesso utente/org).
const LIVE_SUB_STATES = ["trialing", "active", "past_due"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_PRICES: Record<string, { annual: string; monthly: string }> = {
  analyst: { annual: "price_REPLACE_analyst_annual", monthly: "price_REPLACE_analyst_monthly" },
  studio:  { annual: "price_REPLACE_studio_annual",  monthly: "price_REPLACE_studio_monthly" },
  auditor: { annual: "price_REPLACE_auditor_annual", monthly: "price_REPLACE_auditor_monthly" },
  agency:  { annual: "price_REPLACE_agency_annual",  monthly: "price_REPLACE_agency_monthly" },
  ssolo:   { annual: "price_REPLACE_ssolo_annual",   monthly: "price_REPLACE_ssolo_monthly" },
  steam:   { annual: "price_REPLACE_steam_annual",   monthly: "price_REPLACE_steam_monthly" },
};

// Range di posti vendibile per piano. Non è una preferenza di UI: è il vincolo
// commerciale del piano, e l'unico posto del backend in cui è scritto. Deve
// restare allineato a PLAN_CATALOG (stripe.config.js), che è ciò che l'utente
// vede; le fasce interne 2–5 / 6–20 NON si replicano qui, perché sono scaglioni
// di prezzo del price tiered su Stripe e non limiti di acquisto: dentro 2–20 il
// Customer Portal può muovere i posti liberamente.
const PLAN_SEATS: Record<string, { min: number; max: number }> = {
  analyst: { min: 1, max: 1 },
  auditor: { min: 1, max: 1 },
  ssolo:   { min: 1, max: 1 },
  studio:  { min: 2, max: 20 },
  agency:  { min: 2, max: 20 },
  steam:   { min: 2, max: 20 },
};

// Tre esiti distinti, perché "campo assente" e "campo scritto male" non devono
// finire nello stesso ramo: null = assente (il chiamante userà il minimo del
// piano), NaN = presente ma non è un intero, altrimenti il valore.
// parseInt() da solo non basta: leggeva "3 posti" come 3 e 2.9 come 2, cioè
// normalizzava input che non si è mai voluto accettare.
function parseQuantity(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return Number.isInteger(raw) ? raw : NaN;
  const s = String(raw).trim();
  return /^\d+$/.test(s) ? parseInt(s, 10) : NaN;
}

function priceMap(): Record<string, { annual: string; monthly: string }> {
  const raw = Deno.env.get("STRIPE_PRICES");
  if (raw) {
    try { return JSON.parse(raw); } catch { /* usa fallback */ }
  }
  return FALLBACK_PRICES;
}

function encodeForm(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        const itemKey = `${key}[${i}]`;
        if (item !== null && typeof item === "object") {
          parts.push(encodeForm(item as Record<string, unknown>, itemKey));
        } else {
          parts.push(`${encodeURIComponent(itemKey)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof v === "object") {
      parts.push(encodeForm(v as Record<string, unknown>, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

async function stripe(
  path: string,
  body: Record<string, unknown>,
  key: string,
  extraHeaders: Record<string, string> = {},   // v9: es. Idempotency-Key
) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...extraHeaders,
    },
    body: encodeForm(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe error (${res.status})`);
  }
  return data;
}

// ── v7 — GET su Stripe ──────────────────────────────────────────────────────
// stripe() qui sopra fa solo POST con corpo form-encoded. Leggere un price è
// una GET con query string: una funzione a parte costa meno che aggiungere un
// parametro di metodo a una funzione già usata su tre percorsi di scrittura.
async function stripeGet(path: string, key: string) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { "Authorization": `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe error (${res.status})`);
  }
  return data;
}

// ── v10 — DELETE su Stripe ──────────────────────────────────────────────────
// Serve solo a rimuovere un tax_id superato. Best-effort per costruzione: il
// chiamante decide se un fallimento è bloccante.
async function stripeDelete(path: string, key: string) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe error (${res.status})`);
  }
  return data;
}

// ── v10 — paese → tipo di tax ID ────────────────────────────────────────────
// Copre i paesi del select di checkout.html per cui esiste un tipo che produce
// un effetto fiscale reale. L'elenco va tenuto allineato a quel select: un
// paese aggiunto lì e non qui non è un errore (nessun tax_id, si prosegue), ma
// è un reverse charge che non scatta.
const TAX_ID_TYPE_BY_COUNTRY: Record<string, string> = {
  IT: "eu_vat", ES: "eu_vat", FR: "eu_vat", DE: "eu_vat", NL: "eu_vat",
  BE: "eu_vat", PT: "eu_vat", IE: "eu_vat", AT: "eu_vat",
  GB: "gb_vat",
  CH: "ch_vat",
};

// ── v12 — paesi UE ──────────────────────────────────────────────────────────
// Derivato da TAX_ID_TYPE_BY_COUNTRY invece di ripetere l'elenco: "eu_vat" È la
// definizione di paese UE in questo file, e due liste da tenere allineate a
// mano sono una lista sbagliata che aspetta il suo turno.
const EU_COUNTRIES: ReadonlySet<string> = new Set(
  Object.entries(TAX_ID_TYPE_BY_COUNTRY)
    .filter(([, type]) => type === "eu_vat")
    .map(([country]) => country),
);

// ── v13 — Codice Destinatario SDI ───────────────────────────────────────────
// Sette caratteri alfanumerici. 0000000 è un valore legittimo e passa: significa
// recapito nel cassetto fiscale dell'Agenzia delle Entrate.
const SDI_RE = /^[A-Z0-9]{7}$/;

// Etichetta del custom field sulla fattura Stripe. Non tradotta: vedi header.
const SDI_FIELD_NAME = "Codice Destinatario";

// Codice fiscale di una persona fisica: sedici caratteri alfanumerici.
const CF_RE = /^[A-Z0-9]{16}$/;
const CF_FIELD_NAME = "Codice Fiscale";

// Azienda italiana: prefisso IT sulla partita IVA, oppure paese Italia con la
// partita IVA compilata. Stesso predicato di isItalianBusiness() in
// checkout.html — se cambia uno deve cambiare l'altro, altrimenti il form
// chiede un campo che il server non pretende, o viceversa.
function isItalianBusinessOrder(country: unknown, vatId: unknown): boolean {
  const vat = String(vatId ?? "").replace(/\s/g, "").toUpperCase();
  if (!vat) return false;
  return vat.startsWith("IT") || String(country ?? "").trim().toUpperCase() === "IT";
}

// Privato italiano: paese Italia, partita IVA vuota. Complemento esatto di
// isItalianBusinessOrder sul paese IT — mai veri insieme. Specchio di
// isItalianConsumer() in checkout.html, con lo stesso vincolo di allineamento.
function isItalianConsumerOrder(country: unknown, vatId: unknown): boolean {
  return String(country ?? "").trim().toUpperCase() === "IT"
    && !String(vatId ?? "").trim();
}

// Consumatore UE fuori dall'Italia: niente partita IVA, paese UE diverso da IT.
// È l'unico caso in cui Stripe Tax da solo sbaglierebbe (0% invece di 22%).
function needsManualItVat(country: unknown, vatId: unknown): boolean {
  const c = String(country ?? "").trim().toUpperCase();
  const v = String(vatId ?? "").trim();
  return c !== "IT" && EU_COUNTRIES.has(c) && v === "";
}

// ── v10 — allinea il tax_id del Customer al vatId dell'ordine ───────────────
// Tre esiti: { ok: true } (allineato o niente da fare), { ok: false, invalid:
// true } (formato rifiutato da Stripe — bloccante), { ok: false } (errore
// tecnico — non bloccante, il chiamante prosegue).
//   La verifica VIES è ASINCRONA e successiva: Stripe qui valida il formato,
//   non l'esistenza dell'azienda. Una partita IVA formalmente valida ma
//   inesistente passa e torna 'unverified' più tardi, sull'evento
//   customer.tax_id.updated. Quel caso resta fuori da questa funzione.
async function syncTaxId(
  customerId: string,
  vatId: string,
  country: string | undefined,
  key: string,
): Promise<{ ok: boolean; invalid?: boolean; detail: string }> {
  const value = (vatId || "").replace(/\s/g, "").toUpperCase();
  const type = country ? TAX_ID_TYPE_BY_COUNTRY[country.toUpperCase()] : undefined;

  // Elenco dei tax_id attuali: serve sia per l'idempotenza sia per capire se
  // c'è un valore superato da rimuovere.
  let esistenti: Array<{ id: string; type: string; value: string }> = [];
  try {
    const list = await stripeGet(`/customers/${encodeURIComponent(customerId)}/tax_ids?limit=10`, key);
    esistenti = Array.isArray(list?.data) ? list.data : [];
  } catch (e) {
    return { ok: false, detail: `tax_ids di ${customerId} non leggibili: ${(e as Error).message}` };
  }

  // Nessun vatId nell'ordine, o paese senza tipo noto: non si crea nulla. Non
  // si cancella nemmeno ciò che esiste — un campo lasciato vuoto in un retry
  // non è la richiesta di rimuovere una partita IVA già data.
  if (!value || !type) {
    return { ok: true, detail: value ? `paese "${country}" senza tipo tax_id noto — nessuna azione` : "nessun vatId nell'ordine" };
  }

  if (esistenti.some((t) => t.type === type && t.value === value)) {
    return { ok: true, detail: `tax_id ${type} ${value} già presente su ${customerId}` };
  }

  // Sostituzione, non accumulo: con due tax_id attivi la scelta di quale
  // applicare non sarebbe nostra.
  for (const t of esistenti) {
    try {
      await stripeDelete(`/customers/${encodeURIComponent(customerId)}/tax_ids/${encodeURIComponent(t.id)}`, key);
      console.log(`[tax] rimosso tax_id superato ${t.id} (${t.type} ${t.value}) da ${customerId}`);
    } catch (e) {
      console.warn(`[tax] rimozione ${t.id} fallita: ${(e as Error).message}`);
    }
  }

  try {
    const creato = await stripe(`/customers/${encodeURIComponent(customerId)}/tax_ids`, { type, value }, key);
    return { ok: true, detail: `tax_id ${creato.id} (${type} ${value}) creato su ${customerId}` };
  } catch (e) {
    const msg = (e as Error).message || "";
    // Stripe risponde con code tax_id_invalid e messaggio "Invalid value for
    // <type>." — verificato in produzione il 01/09/2026 su eu_vat "DE123".
    const invalid = /invalid value for|tax_id_invalid/i.test(msg);
    return { ok: false, invalid, detail: `creazione tax_id ${type} ${value} fallita: ${msg}` };
  }
}

// ── v7 — il price è davvero acquistabile? ───────────────────────────────────
// Servono ENTRAMBI i flag, perché descrivono due archiviazioni diverse: si può
// archiviare il price lasciando vivo il product, o archiviare il product
// lasciando il price attivo. Stripe rifiuta l'acquisto in tutti e due i casi,
// ma solo al momento della creazione della subscription — cioè troppo tardi
// per dire qualcosa di sensato all'utente.
// `detail` è scritto per i log del server: è l'unico posto in cui gli ID
// Stripe hanno diritto di comparire.
async function checkPriceUsable(
  priceId: string,
  key: string,
): Promise<{ ok: boolean; detail: string }> {
  const qs = new URLSearchParams({ "expand[]": "product" });
  let price: Record<string, unknown>;
  try {
    price = await stripeGet(`/prices/${encodeURIComponent(priceId)}?${qs}`, key);
  } catch (e) {
    return { ok: false, detail: `price ${priceId} non leggibile: ${(e as Error).message}` };
  }
  if (price?.active !== true) {
    return { ok: false, detail: `price ${priceId} archiviato (price.active=${String(price?.active)})` };
  }
  const product = price.product;
  if (product === null || typeof product !== "object") {
    // L'expand non ha restituito un oggetto: l'attività del product NON è stata
    // verificata. Si blocca invece di passare, perché è proprio il campo che nel
    // caso Auditor era l'unico dei due a valere false.
    return {
      ok: false,
      detail: `price ${priceId}: product non espanso (${typeof product}), attività non verificabile`,
    };
  }
  const p = product as { id?: string; active?: unknown };
  if (p.active !== true) {
    return {
      ok: false,
      detail: `price ${priceId}: product ${p.id ?? "n/d"} archiviato (product.active=${String(p.active)})`,
    };
  }
  return { ok: true, detail: `price ${priceId} / product ${p.id ?? "n/d"} attivi` };
}

// ── Dedup customer ──────────────────────────────────────────────────────────
// Mappa autorevole: l'organization (scritta dal webhook) tiene owner_id →
// stripe_customer_id. La interroghiamo via Supabase REST con la service-role
// key. Best-effort: se i secret non sono configurati o la query fallisce,
// torna null e si passa al fallback Stripe Search.
async function lookupCustomerIdFromOrg(supabaseUserId: string): Promise<string | null> {
  const base = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !serviceKey) {
    console.log(`[dedup] org-map saltata: SUPABASE_URL=${!!base} SERVICE_ROLE_KEY=${!!serviceKey}`);
    return null;
  }
  try {
    const url = `${base}/rest/v1/organization`
      + `?owner_id=eq.${encodeURIComponent(supabaseUserId)}`
      + `&stripe_customer_id=not.is.null`
      + `&select=stripe_customer_id&limit=1`;
    const res = await fetch(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) {
      console.error(`[dedup] org-map query HTTP ${res.status}: ${await res.text()}`);
      return null;
    }
    const rows = await res.json();
    const found = Array.isArray(rows) && rows[0]?.stripe_customer_id ? rows[0].stripe_customer_id : null;
    console.log(`[dedup] org-map per ${supabaseUserId} → ${found ?? "nessun match"}`);
    return found;
  } catch (e) {
    console.error(`[dedup] org-map errore: ${(e as Error).message}`);
    return null;
  }
}

// Fallback: Stripe Customer Search per metadata.supabaseUserId. L'indice di
// ricerca è eventualmente consistente (qualche secondo per i Customer appena
// creati), ma copre i retry sequenziali. Best-effort: null su errore.
async function searchStripeCustomerId(supabaseUserId: string, key: string): Promise<string | null> {
  try {
    const query = `metadata['supabaseUserId']:'${supabaseUserId.replace(/'/g, "")}'`;
    const res = await fetch(
      `${STRIPE_API}/customers/search?limit=1&query=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    const data = await res.json();
    if (!res.ok) {
      console.error(`[dedup] stripe-search HTTP ${res.status}: ${data?.error?.message ?? ""}`);
      return null;
    }
    const found = data?.data?.[0]?.id ?? null;
    console.log(`[dedup] stripe-search per ${supabaseUserId} → ${found ?? "nessun match"}`);
    return found;
  } catch (e) {
    console.error(`[dedup] stripe-search errore: ${(e as Error).message}`);
    return null;
  }
}

// ── Guard BR-001 (PATCH v5) ───────────────────────────────────────────────────
// Verifica se l'utente ha già una subscription live. Risolve l'org per
// owner_id = supabaseUserId (modello un-utente-una-org) e cerca subscription in
// stato live su quell'org. Best-effort: null su errore/secret mancanti → il
// chiamante prosegue senza bloccare (la prima attivazione non ha ancora un'org,
// quindi ritorna null e passa correttamente).
async function findLiveSubscription(
  supabaseUserId: string,
): Promise<{ subId: string; status: string; planId: string | null } | null> {
  const base = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !serviceKey) {
    console.log(`[guard] check saltato: SUPABASE_URL=${!!base} SERVICE_ROLE_KEY=${!!serviceKey}`);
    return null;
  }
  try {
    // 1) org dell'utente (una sola per owner nel modello Sevenda)
    const orgUrl = `${base}/rest/v1/organization`
      + `?owner_id=eq.${encodeURIComponent(supabaseUserId)}`
      + `&select=id&limit=1`;
    const orgRes = await fetch(orgUrl, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!orgRes.ok) {
      console.error(`[guard] org query HTTP ${orgRes.status}: ${await orgRes.text()}`);
      return null;
    }
    const orgs = await orgRes.json();
    const orgId = Array.isArray(orgs) && orgs[0]?.id ? orgs[0].id : null;
    if (!orgId) return null;   // nessuna org ancora → prima sottoscrizione legittima

    // 2) subscription live su quell'org
    const statesCsv = LIVE_SUB_STATES.map((s) => `"${s}"`).join(",");
    const subUrl = `${base}/rest/v1/subscription`
      + `?org_id=eq.${encodeURIComponent(orgId)}`
      + `&status=in.(${statesCsv})`
      + `&select=stripe_subscription_id,status,plan_id&limit=1`;
    const subRes = await fetch(subUrl, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!subRes.ok) {
      console.error(`[guard] sub query HTTP ${subRes.status}: ${await subRes.text()}`);
      return null;
    }
    const subs = await subRes.json();
    if (Array.isArray(subs) && subs[0]?.stripe_subscription_id) {
      return {
        subId: subs[0].stripe_subscription_id,
        status: subs[0].status,
        planId: subs[0].plan_id ?? null,
      };
    }
    return null;
  } catch (e) {
    console.error(`[guard] errore: ${(e as Error).message}`);
    return null;
  }
}

// ── v9 — FASE 2: crea la subscription a carta confermata ────────────────────
// Tutto il contesto dell'ordine viene dai metadata del SetupIntent scritti in
// fase 1. Del body si usa SOLO supabaseUserId, e solo per il confronto.
function jsonResp(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function activateSubscription(
  setupIntentId: string,
  callerUserId: string | undefined,
  secret: string,
): Promise<Response> {
  if (!/^seti_[A-Za-z0-9]+$/.test(setupIntentId)) {
    return jsonResp({ error: "Invalid setup reference.", code: "invalid_setup_intent" }, 400);
  }

  let si: Record<string, unknown>;
  try {
    si = await stripeGet(`/setup_intents/${encodeURIComponent(setupIntentId)}`, secret);
  } catch (e) {
    console.error(`[activate] SetupIntent ${setupIntentId} non leggibile: ${(e as Error).message}`);
    return jsonResp({ error: "Could not verify your payment method. Please try again.", code: "setup_unreadable" }, 400);
  }

  const md = (si.metadata ?? {}) as Record<string, string>;
  const pm = typeof si.payment_method === "string" ? si.payment_method
    : (si.payment_method as { id?: string } | null)?.id ?? null;
  const customerId = typeof si.customer === "string" ? si.customer
    : (si.customer as { id?: string } | null)?.id ?? null;

  // Il SetupIntent deve essere davvero concluso, con una carta, per un customer
  // noto, e appartenere all'utente che sta chiamando.
  if (si.status !== "succeeded" || !pm || !customerId) {
    console.error(`[activate] ${setupIntentId}: status=${String(si.status)} pm=${pm} customer=${customerId}`);
    return jsonResp({ error: "Your payment method was not confirmed. Please try again.", code: "setup_not_succeeded" }, 400);
  }
  if (!md.supabaseUserId || !callerUserId || md.supabaseUserId !== callerUserId) {
    console.error(`[activate] ${setupIntentId}: utente non coincidente (meta=${md.supabaseUserId} body=${callerUserId})`);
    return jsonResp({ error: "This payment setup does not belong to the current user.", code: "user_mismatch" }, 403);
  }
  const planId = md.planId, priceId = md.priceId;
  const qty = parseInt(md.quantity ?? "", 10);
  if (!planId || !priceId || !Number.isInteger(qty) || qty < 1) {
    console.error(`[activate] ${setupIntentId}: metadata incompleti ${JSON.stringify(md)}`);
    return jsonResp({ error: "Order details are missing. Please start the checkout again.", code: "order_context_missing" }, 400);
  }

  // Guard BR-001 anche qui: un esito positivo è la subscription di questo
  // stesso flusso già creata (retry, refresh, race) → successo, non 409.
  const existingLive = await findLiveSubscription(callerUserId);
  if (existingLive) {
    console.log(`[activate] ${setupIntentId}: subscription già live ${existingLive.subId} (${existingLive.status})`);
    return jsonResp({
      status: "already_subscribed",
      subscriptionId: existingLive.subId,
      subscriptionStatus: existingLive.status,
      mode: "setup",
    });
  }

  // La carta diventa anche il default del Customer, così il Portal la mostra
  // come metodo corrente. Best-effort: la subscription la riceve comunque.
  //   v13: nella STESSA chiamata si riasserisce il custom field col Codice
  //   Destinatario. Questa update riscrive invoice_settings, e affidarsi al
  //   merge di Stripe perché non porti via i custom_fields scritti in fase 1
  //   sarebbe una scommessa su un comportamento che non controlliamo. Un
  //   SetupIntent della fase 1 precedente non ha la chiave: niente custom
  //   field, cioè esattamente il comportamento di prima.
  const sdiFromOrder = md.sdiCode ?? "";
  const cfFromOrder  = md.fiscalCode ?? "";
  const fieldFromOrder = sdiFromOrder ? { name: SDI_FIELD_NAME, value: sdiFromOrder }
    : cfFromOrder ? { name: CF_FIELD_NAME, value: cfFromOrder }
    : null;
  try {
    await stripe(`/customers/${customerId}`, {
      invoice_settings: {
        default_payment_method: pm,
        ...(fieldFromOrder ? { custom_fields: [fieldFromOrder] } : {}),
      },
    }, secret);
  } catch (e) {
    console.warn(`[activate] default pm su ${customerId} non impostato: ${(e as Error).message}`);
  }

  // ── v12: regime IVA della subscription, deciso in fase 1 ─────────────────
  // Confronto stretto sulla stringa, come per il consenso art. 59: un
  // SetupIntent creato dalla fase 1 precedente non ha la chiave e ricade su
  // automatic_tax, cioè il comportamento di prima.
  // Il TaxRate è già stato verificato in fase 1. Se qui manca (variabile
  // rimossa fra le due fasi) si attiva comunque: la carta è salvata e la
  // subscription è l'unico esito che non lascia l'utente pagato e senza piano.
  // L'IVA mancante si corregge sulla subscription, un ordine perso no.
  const itVatRateId = Deno.env.get("STRIPE_IT_VAT_RATE_ID") ?? "";
  const manualItVat = md.manualItVat === "true" && !!itVatRateId;
  if (md.manualItVat === "true" && !itVatRateId) {
    console.error(
      `[tax] ${setupIntentId}: manualItVat richiesto ma STRIPE_IT_VAT_RATE_ID `
      + `non configurato — subscription attivata su automatic_tax, IVA DA `
      + `CORREGGERE A MANO`,
    );
  }
  const taxParams = manualItVat
    // Consumatore UE fuori dall'Italia: 22% italiano, anche sui rinnovi.
    ? { automatic_tax: { enabled: false }, default_tax_rates: [itVatRateId] }
    // v10: senza automatic_tax ogni fattura esce senza imposta, anche con le
    // registrazioni fiscali attive. Richiede un indirizzo valido sul Customer
    // — garantito dalla fase 1, che lo raccoglie come campo obbligatorio.
    : { automatic_tax: { enabled: true } };
  console.log(
    `[tax] ${setupIntentId}: regime ${manualItVat ? `manuale IT 22% (${itVatRateId})` : "automatic_tax"}`,
  );

  let subscription: Record<string, unknown>;
  try {
    subscription = await stripe("/subscriptions", {
      customer: customerId,
      items: [{ price: priceId, quantity: qty }],
      default_payment_method: pm,
      ...taxParams,
      // Con il trial la prima fattura è zero e nulla viene addebitato ora. Senza
      // trial (futuro) la fattura iniziale viene pagata off-session con la carta
      // salvata: se fallisse, meglio un errore esplicito che una 'incomplete'.
      payment_behavior: "error_if_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      trial_period_days: TRIAL_DAYS,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      metadata: {
        supabaseUserId: callerUserId,
        // v11: il consenso passa dal SetupIntent al contratto. Un SetupIntent
        // creato dalla fase 1 precedente non ha queste chiavi: restano stringhe
        // vuote, encodeForm le scarta e la subscription nasce senza — che è
        // esattamente il comportamento di prima, non un errore.
        immediatePerformanceConsent: md.immediatePerformanceConsent ?? "",
        immediatePerformanceConsentAt: md.immediatePerformanceConsentAt ?? "",
      },
    }, secret, { "Idempotency-Key": `sevenda-activate-${setupIntentId}` });
  } catch (e) {
    // Gli ID Stripe restano nei log; al client un testo generico e ritentabile.
    console.error(`[activate] ${setupIntentId}: creazione subscription fallita — ${(e as Error).message}`);
    return jsonResp({
      error: "We saved your card but could not activate the plan. Please retry: you will not be charged twice.",
      code: "activation_failed",
    }, 502);
  }

  console.log(`[activate] ${setupIntentId} → subscription ${subscription.id} (${subscription.status})`);
  return jsonResp({
    status: "activated",
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    mode: "setup",
    trialEnd: (subscription.trial_end as number | null) ?? null,
    trialDays: TRIAL_DAYS,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret) throw new Error("STRIPE_SECRET_KEY not configured on the server.");

    const body = await req.json();

    // ── v9 — FASE 2: la presenza di setupIntentId seleziona il ramo ─────────
    // Prima delle validazioni di fase 1, che richiedono campi (planId, email)
    // che la fase 2 non invia: il contesto è nei metadata del SetupIntent.
    if (typeof body?.setupIntentId === "string" && body.setupIntentId) {
      return await activateSubscription(body.setupIntentId, body.supabaseUserId, secret);
    }

    // PATCH v2: supabaseUserId e orgName per il linking lato webhook
    const { planId, interval, quantity, email, name, phone, address, vatId,
            supabaseUserId, orgName, consumerImmediatePerformance, sdiCode,
            fiscalCode } = body;

    if (!planId || !interval || !email) {
      throw new Error("Missing required fields (planId, interval, email).");
    }
    if (!supabaseUserId) {
      throw new Error("Missing supabaseUserId (utente Supabase loggato).");
    }

    // ── GUARD BR-001 (PATCH v5): blocca una seconda subscription live ──────────
    // Se l'utente ha già una subscription trialing/active/past_due sulla propria
    // org, non si crea nulla su Stripe. La prima attivazione non ha ancora un'org
    // (la crea il webhook dopo il primo checkout) → findLiveSubscription torna
    // null e si prosegue. I cambi piano avvengono nel Customer Portal.
    const existingLive = await findLiveSubscription(supabaseUserId);
    if (existingLive) {
      console.log(`[guard] blocco: utente ${supabaseUserId} ha già ${existingLive.subId} (${existingLive.status})`);
      return new Response(
        JSON.stringify({
          error: "already_subscribed",
          message: "You already have an active subscription. Manage your plan from the subscription page instead of starting a new one.",
          currentStatus: existingLive.status,
          currentPlan: existingLive.planId,
        }),
        { status: 409, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const billingInterval = interval === "monthly" ? "monthly" : "annual";

    // ── VALIDAZIONE POSTI (PATCH v8) ─────────────────────────────────────────
    // Come il pre-check v7: return dedicato e non throw, così il catch finale
    // resta invariato, e al client va un testo leggibile mentre il dettaglio
    // (valore ricevuto compreso) resta nei log.
    const seatRange = PLAN_SEATS[planId];
    if (!seatRange) {
      console.error(`[seats] piano "${planId}" senza range dichiarato — rifiutato`);
      return new Response(
        JSON.stringify({
          error: "This plan is not available for purchase right now. Please choose another plan or contact support.",
          code: "plan_unavailable",
        }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Quantità assente → minimo del piano: è il default che i piani solo hanno
    // sempre avuto (1) e per i piani team è l'unico che non violi il minimo.
    const parsedQty = parseQuantity(quantity);
    const qty = parsedQty === null ? seatRange.min : parsedQty;
    if (!Number.isInteger(qty) || qty < seatRange.min || qty > seatRange.max) {
      console.error(`[seats] quantity ${JSON.stringify(quantity)} fuori range per "${planId}" (${seatRange.min}–${seatRange.max})`);
      return new Response(
        JSON.stringify({
          // Il testo esce in pagina (checkout.html mostra data.error): per i
          // piani a posto singolo "supports 1 to 1 seats" si legge come un bug.
          error: seatRange.min === seatRange.max
            ? `This plan includes exactly ${seatRange.min} seat${seatRange.min === 1 ? "" : "s"}.`
            : `This plan supports ${seatRange.min} to ${seatRange.max} seats.`,
          code: "invalid_quantity",
          min: seatRange.min,
          max: seatRange.max,
        }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // ── v13: Codice Destinatario e Codice Fiscale ──────────────────────────
    // Validazione di input pura: non serve un Customer, quindi sta qui e non
    // dopo, come il rifiuto posti della v8. Normalizzati a maiuscolo perché è
    // così che vanno allo SDI e in fattura, e perché "abc1234" è lo stesso
    // codice di "ABC1234" scritto di fretta. Ogni valore vive SOLO sul proprio
    // ramo: fuori dal suo caso viene scartato, non memorizzato.
    const italianBusiness = isItalianBusinessOrder(address?.country, vatId);
    const italianConsumer = isItalianConsumerOrder(address?.country, vatId);
    const sdi = italianBusiness ? String(sdiCode ?? "").trim().toUpperCase() : "";
    const cf  = italianConsumer ? String(fiscalCode ?? "").trim().toUpperCase() : "";
    if (italianBusiness && !SDI_RE.test(sdi)) {
      console.error(`[sdi] codice ${JSON.stringify(sdiCode)} non valido per un ordine con partita IVA italiana`);
      return new Response(
        JSON.stringify({
          error: "Enter a valid Recipient Code (seven letters or digits), or 0000000 if you do not have one.",
          code: "sdi_code_invalid",
        }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }
    if (italianConsumer && !CF_RE.test(cf)) {
      console.error(`[sdi] codice fiscale ${JSON.stringify(fiscalCode)} non valido per un privato italiano`);
      return new Response(
        JSON.stringify({
          error: "Enter your sixteen-character Italian tax code (Codice Fiscale).",
          code: "fiscal_code_invalid",
        }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }
    // Un solo custom field per costruzione: i due rami sono complementari.
    const invoiceCustomField = sdi ? { name: SDI_FIELD_NAME, value: sdi }
      : cf ? { name: CF_FIELD_NAME, value: cf }
      : null;

    const map = priceMap();
    const priceId = map[planId]?.[billingInterval as "annual" | "monthly"];
    if (!priceId || priceId.includes("REPLACE")) {
      throw new Error(`Stripe price not configured for plan "${planId}" (${billingInterval}).`);
    }

    // ── PRE-CHECK v7: price e product entrambi attivi ────────────────────────
    // Ultimo controllo prima di toccare Stripe in scrittura. Al client va un
    // testo generico e privo di identificativi; il dettaglio, con gli ID, resta
    // nei log del server. È un return e non un throw proprio per non passare dal
    // catch finale, che rimanda err.message così com'è.
    const priceCheck = await checkPriceUsable(priceId, secret);
    if (!priceCheck.ok) {
      console.error(`[precheck] piano "${planId}" (${billingInterval}) non acquistabile — ${priceCheck.detail}`);
      return new Response(
        JSON.stringify({
          // checkout.html mostra `error` all'utente (data.error || 'Could not
          // start payment.'), quindi qui ci va il testo leggibile; `code` resta
          // la chiave stabile per una gestione dedicata lato client, il giorno
          // in cui la si vorrà, senza doverla introdurre adesso.
          error: "This plan is not available for purchase right now. Please choose another plan or contact support.",
          code: "plan_unavailable",
        }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // 1) Customer — DEDUP: riusa quello già associato all'utente, se esiste.
    // I metadata estesi (supabaseUserId + orgName) servono al webhook per
    // creare/risolvere l'organization e vengono riscritti anche in update,
    // così un Customer preesistente senza supabaseUserId viene "riparato".
    const customerParams = {
      email,
      name,
      phone,
      address: address
        ? {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postal_code: address.postal_code,
            country: address.country,
          }
        : undefined,
      // v13: il custom field è ciò che fa comparire Codice Destinatario o
      // Codice Fiscale sul PDF della fattura. Assente quando non c'è codice:
      // encodeForm scarta undefined, un ordine non italiano non tocca
      // invoice_settings.
      invoice_settings: invoiceCustomField
        ? { custom_fields: [invoiceCustomField] }
        : undefined,
      metadata: {
        // v6: planId RIMOSSO — resolveOrg legge solo supabaseUserId, vatId e
        // locale. Dopo un cambio piano dal Portal restava indietro in silenzio.
        vatId: vatId || "",
        // v13: da qui il webhook li porta in billing_profile e sulla riga
        // invoice. Attributi del cliente, stabili come la partita IVA. Al più
        // uno dei due è valorizzato.
        sdiCode: sdi,
        fiscalCode: cf,
        supabaseUserId,                 // ← serve al webhook per creare/risolvere l'organization
        orgName: orgName || "",
      },
    };

    // Candidati per il riuso, in ordine di priorità:
    //  1) mappa autorevole (organization.stripe_customer_id);
    //  2) Stripe Search per metadata.supabaseUserId (ritorna solo customer
    //     VIVI nella modalità Stripe corrente).
    // Si prova ad aggiornare ciascun candidato: il primo che esiste davvero
    // viene riusato. Se un ID è morto (es. customer cancellato o creato in
    // un'altra modalità test/live), si passa al successivo, evitando di
    // creare un duplicato finché esiste almeno un customer valido.
    const fromOrg = await lookupCustomerIdFromOrg(supabaseUserId);
    const fromSearch = await searchStripeCustomerId(supabaseUserId, secret);
    const candidates = [fromOrg, fromSearch].filter(
      (id, i, arr): id is string => !!id && arr.indexOf(id) === i,
    );

    let customer;
    for (const id of candidates) {
      try {
        customer = await stripe(`/customers/${id}`, customerParams, secret);
        console.log(`[dedup] customer RIUSATO ${customer.id} per ${supabaseUserId}`);
        break;
      } catch (e) {
        console.error(`[dedup] candidato ${id} non utilizzabile (${(e as Error).message})`);
        customer = null;
      }
    }
    if (!customer) {
      customer = await stripe("/customers", customerParams, secret);
      console.log(`[dedup] customer NUOVO ${customer.id} per ${supabaseUserId}`);
    }

    // ── v10: il vatId diventa un tax_id vero ─────────────────────────────────
    // Qui e non in fase 2: il vatId arriva solo nel body della fase 1 (non è nei
    // metadata del SetupIntent) e un formato sbagliato va detto PRIMA che
    // l'utente inserisca la carta, non dopo averla salvata.
    const taxSync = await syncTaxId(customer.id, vatId, address?.country, secret);
    console.log(`[tax] ${taxSync.detail}`);
    if (!taxSync.ok && taxSync.invalid) {
      // Return dedicato e non throw, come il pre-check v7 e la validazione posti
      // v8: il catch finale rimanderebbe il messaggio Stripe grezzo.
      return new Response(
        JSON.stringify({
          error: "The VAT ID you entered is not valid. Please check it, or leave the field empty.",
          code: "vat_id_invalid",
        }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // ── v11: consenso art. 59, come dichiarato da checkout.html ─────────────
    // Confronto stretto: qualunque altro valore (assente, 0, "si") vale come
    // consenso non prestato. Il client manda un booleano; la stringa "true" è
    // ammessa perché un POST diretto o un proxy che serializza i form la
    // produce, e leggerla come falsa sarebbe una perdita di dato silenziosa.
    const art59Consent = consumerImmediatePerformance === true
      || consumerImmediatePerformance === "true";

    // ── v12: consumatore UE fuori dall'Italia → IVA italiana a tax rate ────
    // La verifica del TaxRate sta qui, non in fase 2: è l'ultimo punto in cui
    // si può fermare l'ordine senza aver ancora preso la carta. In fase 2 la
    // carta è già salvata e l'unica uscita sarebbe attivare senza imposta.
    const manualItVat = needsManualItVat(address?.country, vatId);
    const itVatRateId = Deno.env.get("STRIPE_IT_VAT_RATE_ID") ?? "";
    if (manualItVat && !itVatRateId) {
      console.error(
        `[tax] STRIPE_IT_VAT_RATE_ID non configurato: ordine da consumatore `
        + `${String(address?.country ?? "n/d")} bloccato per non emettere una `
        + `subscription a IVA zero su un'operazione imponibile in Italia`,
      );
      return new Response(
        JSON.stringify({
          error: "We cannot complete the purchase right now. Please try again later or contact support.",
          code: "tax_rate_unavailable",
        }),
        { status: 503, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // 2) v9 — SetupIntent: raccoglie la carta SENZA creare la subscription.
    // I metadata portano il contesto dell'ordine alla fase 2. Il priceId è
    // già risolto e verificato (pre-check v7) e i posti già validati (v8):
    // la fase 2 non deve rifare quelle scelte, deve solo eseguirle.
    const setupIntent = await stripe("/setup_intents", {
      customer: customer.id,
      usage: "off_session",
      // Solo carta: si conferma in modo SINCRONO. Con automatic_payment_methods
      // Elements potrebbe proporre metodi asincroni (es. SEPA), che lasciano il
      // SetupIntent in 'processing' e la fase 2 senza un esito su cui attivare.
      payment_method_types: ["card"],
      metadata: {
        supabaseUserId,
        planId,
        interval: billingInterval,
        quantity: String(qty),
        priceId,
        // v11: consenso art. 59 così come dichiarato dal client. Normalizzato a
        // stringa perché i metadata Stripe sono solo stringhe; il timestamp
        // resta vuoto (e quindi non scritto) quando il consenso non c'è.
        immediatePerformanceConsent: String(art59Consent),
        immediatePerformanceConsentAt: art59Consent ? new Date().toISOString() : "",
        // v12: la scelta del regime IVA appartiene all'ordine, e in fase 2 il
        // vatId non c'è più. Stringa vuota quando non serve: encodeForm la
        // scarta, e la fase 2 legge "chiave assente" come automatic_tax.
        manualItVat: manualItVat ? "true" : "",
        // v13: la fase 2 riscrive invoice_settings per la carta e deve poter
        // riasserire il custom field nella stessa chiamata.
        sdiCode: sdi,
        fiscalCode: cf,
      },
    }, secret);

    const clientSecret = (setupIntent?.client_secret as string | undefined) ?? null;
    if (!clientSecret) throw new Error("Could not retrieve client secret (setup).");

    return new Response(
      JSON.stringify({
        setupIntentId: setupIntent.id,
        customerId: customer.id,
        clientSecret,
        mode: "setup",       // v9: sempre setup — la carta si conferma, l'addebito arriva a fine trial
        trialEnd: null,      // non esiste ancora una subscription: checkout.html usa oggi + trialDays
        trialDays: TRIAL_DAYS,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Unexpected error." }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
