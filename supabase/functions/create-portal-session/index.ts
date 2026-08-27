// ═══════════════════════════════════════════════════════════════════════════════
// create-portal-session v4 — Sevenda
// RF-001 (apertura Customer Portal) · RF-010 (CTA Manage) · RF-022 (selezione
// piano dalle plan card → apre il Portal, dove l'utente sceglie e conferma) ·
// RF-CAN-021 (CTA "Cancel plan" → deep-link al flusso di disdetta)
//
// ── PATCH v4 (questa versione) ────────────────────────────────────────────
// L'origin ammesso per il return_url non è più la costante 'https://sevenda.dev/'
// ma il secret di progetto SITE_URL. Con l'allowlist fissa, un Portal aperto dal
// sito di staging riceveva un return_url di staging, lo scartava e ripiegava sul
// default di produzione: l'utente usciva dal Portal atterrando su sevenda.dev,
// in silenzio. Ogni deployment ammette ora SOLO il proprio sito — la produzione
// continua a rifiutare un return_url di staging, che è il comportamento voluto.
// Aggiunto anche un console.warn sullo scarto, che prima non lasciava traccia.
//
// ── PATCH v3 ──────────────────────────────────────────────────────────────
// Aggiunto il deep-link al flusso di CANCELLAZIONE: con cancel_plan=true nel
// body e una subscription attiva, il Portal si apre direttamente sulla
// schermata di disdetta (flow_data[type]=subscription_cancel) invece che sulla
// dashboard. L'esecuzione resta interamente sul Portal: l'estensione non
// cancella nulla, si limita a portare l'utente nel punto giusto dopo il popup
// informativo (RF-CAN-021). Coerente con RF-CAN-016 (nessuna UI custom di
// esecuzione) e con la scelta read-only di RF-007/RF-011.
//
// I due deep-link sono mutuamente esclusivi: Stripe accetta un solo
// flow_data[type] per sessione. Se arrivassero entrambi i flag, la
// cancellazione ha precedenza (è l'intento più specifico e irreversibile:
// aprire per errore la schermata cambio piano su chi vuole disdire sarebbe
// più confondente del contrario).
//
// DEPLOY: manuale via dashboard Supabase (staging hxht → validazione → jqxx) —
// i push GitHub NON deployano le funzioni. JWT verification: ON (default).
//
// SECRETS richiesti:
//   STRIPE_SECRET_KEY  — chiave segreta Stripe (fallback: STRIPE_API_KEY)
//   SITE_URL           — origin del sito di QUESTO ambiente, senza slash finale
//                        (jqxx: https://sevenda.dev · hxht: https://staging.sevenda.dev).
//                        Opzionale: il default riproduce il comportamento v3.
//   SUPABASE_URL / SUPABASE_ANON_KEY — iniettati
//
// INPUT  (POST JSON): { return_url?: string, change_plan?: boolean, cancel_plan?: boolean }
// OUTPUT (200):       { url: string }
// ERRORI: 401 non autenticato · 409 no_customer (nessuna subscription/cliente
//         Stripe associato: l'utente non è mai transitato dal checkout) ·
//         502 errore Stripe · 500 configurazione mancante
//
// ALLINEATO ALLO SCHEMA REALE (QA-1): il customer Stripe vive su
// organization.stripe_customer_id (modello org-centrico). La risoluzione
// utente→org→customer è centralizzata nella RPC get_billing_context(), chiamata
// qui con il JWT dell'utente (auth.uid() server-side): niente lookup con la
// service role né duplicazione della logica di risoluzione org.
//
// DEEP-LINK (RF-022): con change_plan=true nel body e una subscription attiva,
// si apre il Portal DIRETTAMENTE sulla schermata "Scegli un piano" via
// flow_data[type]=subscription_update, passando SOLO l'id della subscription
// (nessun price). Questo evita il problema del deep-link a price specifico:
// un plan_id mappa a più price_id (billing_cycle × seat_tier, STRIPE_PRICES è
// annidato) e non è risolvibile lato server. L'utente sceglie e conferma il
// piano nel Portal, con le regole di proration/scheduling configurate
// (upgrade immediato · downgrade a fine periodo). Senza change_plan (o senza
// subscription attiva) si apre il Portal generico.
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY       = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_KEY     = Deno.env.get('STRIPE_SECRET_KEY') ?? Deno.env.get('STRIPE_API_KEY') ?? '';
const STRIPE_VERSION = '2026-04-22.dahlia';

// Il Portal si apre in una nuova scheda: il rientro è intercettato dall'estensione
// tramite refresh on-focus (RF-012), quindi il return_url serve solo come pagina
// di atterraggio. Allowlist rigida sull'origin del proprio ambiente.
//
// v4 — SITE_URL è un secret di progetto e non una costante, perché ogni progetto
// Supabase ha il suo sito: jqxx ↔ sevenda.dev, hxht ↔ staging.sevenda.dev. Il
// default riproduce il valore v3, così un deployment senza secret impostato si
// comporta esattamente come prima e non esiste una finestra scoperta fra il
// deploy della funzione e la configurazione del secret.
const SITE_URL           = (Deno.env.get('SITE_URL') ?? 'https://sevenda.dev').replace(/\/+$/, '');
const DEFAULT_RETURN_URL = `${SITE_URL}/account/return`;

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// Encoder x-www-form-urlencoded per l'API Stripe (supporta chiavi annidate già
// espresse in notazione bracket, es. flow_data[subscription_update_confirm][...]).
function formEncode(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function stripeRequest(
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, string>,
): Promise<{ ok: boolean; status: number; data: any }> {
  const url  = `https://api.stripe.com${path}${method === 'GET' && params ? '?' + formEncode(params) : ''}`;
  const res  = await fetch(url, {
    method,
    headers: {
      'Authorization':  `Bearer ${STRIPE_KEY}`,
      'Stripe-Version': STRIPE_VERSION,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' && params ? formEncode(params) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Risolve l'utente dal bearer in ingresso (difesa in profondità oltre al
// verify_jwt della piattaforma).
async function resolveUser(authHeader: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': authHeader },
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return user && user.id ? user : null;
}

// Recupera org→customer→subscription via RPC get_billing_context(), eseguita
// con il JWT dell'utente (l'RPC risolve auth.uid() server-side). Un utente senza
// customer Stripe (mai transitato dal checkout) → null → 409 no_customer.
async function resolveCustomer(authHeader: string): Promise<{ customer: string; subscription: string | null } | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_billing_context`, {
    method: 'POST',
    headers: {
      'apikey':        ANON_KEY,
      'Authorization': authHeader,
      'Content-Type':  'application/json',
    },
    body: '{}',
  });
  if (!res.ok) return null;
  const ctx = await res.json().catch(() => null);
  if (!ctx || !ctx.stripe_customer_id) return null;
  return {
    customer:     ctx.stripe_customer_id,
    subscription: ctx.stripe_subscription_id ?? null,
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST')    return json(405, { error: 'method_not_allowed' });

  if (!STRIPE_KEY || !SUPABASE_URL || !ANON_KEY) {
    console.error('[create-portal-session] Configurazione mancante (secrets)');
    return json(500, { error: 'misconfigured' });
  }

  // ── Auth ──
  const authHeader = req.headers.get('Authorization') ?? '';
  const user = await resolveUser(authHeader);
  if (!user) return json(401, { error: 'unauthorized' });

  // ── Input ──
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const wantChangePlan  = body.change_plan === true;
  const wantCancelPlan  = body.cancel_plan === true;   // v3 — RF-CAN-021
  let returnUrl    = typeof body.return_url  === 'string' ? body.return_url.trim()  : '';

  // Allowlist: solo pagine sotto l'origin di QUESTO ambiente — previene
  // open-redirect. Il confronto richiede l'origin esatto seguito da '/', quindi
  // un host come sevenda.dev.evil.com non passa (dopo 'sevenda.dev' c'è un punto,
  // non uno slash).
  if (!returnUrl.startsWith(SITE_URL + '/')) {
    // v4: lo scarto era muto. Un return_url rifiutato è quasi sempre un
    // disallineamento d'ambiente — il sito di un ambiente che parla con la
    // funzione dell'altro — e senza questa riga non lascia alcuna traccia nei log:
    // si scopre solo leggendo il sorgente. Il caso "campo assente" resta silenzioso,
    // perché è legittimo e non indica nulla.
    if (returnUrl) {
      console.warn('[create-portal-session] return_url fuori allowlist, uso il default:',
                   returnUrl, '— atteso sotto', SITE_URL + '/');
    }
    returnUrl = DEFAULT_RETURN_URL;
  }

  // ── Cliente Stripe ──
  const ref = await resolveCustomer(authHeader);
  if (!ref) {
    return json(409, {
      error:   'no_customer',
      message: 'No Stripe customer associated with this account — start a plan or trial first.',
    });
  }

  // ── Parametri della sessione Portal ──
  const params: Record<string, string> = {
    customer:     ref.customer,
    return_url:   returnUrl,
  };

  // ── Deep-link (RF-CAN-021 disdetta · RF-022 cambio piano) ────────────────
  // Un solo flow_data[type] per sessione: la disdetta ha precedenza sul cambio
  // piano. Senza subscription attiva entrambi degradano al Portal generico.
  if (wantCancelPlan && ref.subscription) {
    // v3 — RF-CAN-021: apre direttamente la schermata di disdetta. Il popup
    // informativo (testo approvato COM/RF-CAN-007) è già stato mostrato
    // dall'estensione PRIMA di questa chiamata: qui non si conferma nulla, si
    // porta soltanto l'utente sulla schermata dove il Portal chiederà conferma.
    params['flow_data[type]'] = 'subscription_cancel';
    params['flow_data[subscription_cancel][subscription]'] = ref.subscription;
  } else if (wantChangePlan && ref.subscription) {
    // Se richiesto e c'è una subscription attiva, apre direttamente la schermata
    // di cambio piano invece della dashboard del Portal. Si passa SOLO l'id della
    // subscription: nessun price → nessuna ambiguità plan_id→price. Se manca la
    // subscription, si degrada al Portal generico (l'utente non ha nulla da
    // cambiare: caso gestito comunque a monte dal 409 no_customer se non c'è
    // neppure il customer).
    params['flow_data[type]'] = 'subscription_update';
    params['flow_data[subscription_update][subscription]'] = ref.subscription;
  }

  // ── Creazione sessione ──
  const session = await stripeRequest('POST', '/v1/billing_portal/sessions', params);
  if (!session.ok || !session.data?.url) {
    console.error('[create-portal-session] Stripe error:', session.status, JSON.stringify(session.data?.error ?? {}));
    return json(502, { error: 'stripe_error', message: session.data?.error?.message ?? 'Portal session failed' });
  }

  return json(200, { url: session.data.url });
});
