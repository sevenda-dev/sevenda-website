// ═══════════════════════════════════════════════════════════════════════════════
// set-locale v1 — Sevenda
// RF-CAN-025 (Should Have) — allineamento lingua applicativa ↔ comunicazioni.
//
// Ogni cambio lingua fatto dall'interfaccia del sito deve lasciare allineati tre
// punti: organization.locale (primo anello della catena di risoluzione del
// webhook), customer.metadata.locale su Stripe, e la UI (già applicata dal client
// via localStorage prima di chiamare questa funzione).
//
// DEPLOY: manuale via dashboard Supabase (progetto jqxx) — i push GitHub NON
// deployano le funzioni. JWT verification: ON (default) — l'identità viene
// comunque ri-risolta esplicitamente via /auth/v1/user (difesa in profondità) e
// l'organization è risolta server-side dalla RPC get_billing_context (auth.uid()):
// nessun user_id/org_id viene mai accettato dal body.
//
// SECRETS (già presenti per create-subscription / stripe-webhook / create-portal-session):
//   STRIPE_SECRET_KEY  — chiave segreta Stripe (fallback: STRIPE_API_KEY)
//   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY — iniettati
//
// INPUT  (POST JSON): { locale: 'it' | 'en' | 'es' | 'fr' }
// OUTPUT (200):       { updated: boolean, locale?: string, stripe_synced?: boolean, reason?: string }
// ERRORI: 400 locale non supportato · 401 non autenticato · 405 metodo ·
//         500 configurazione mancante / scrittura DB fallita
//
// ── ORDINE DI SCRITTURA (non negoziabile) ────────────────────────────────────
// PRIMA il DB, POI Stripe. organization.locale è il primo anello della catena di
// risoluzione del webhook (organization.locale → customer.metadata.locale →
// customer.preferred_locales[0] → 'it'): aggiornandolo per primo, le email sono
// corrette anche quando la chiamata a Stripe fallisce. La scrittura su Stripe è
// quindi best-effort e non deve mai far fallire l'operazione utente.
//
// ── IDEMPOTENZA / NIENTE LOOP ────────────────────────────────────────────────
// Aggiornare metadata.locale su Stripe genera un customer.updated che il webhook
// riceverà. Il suo handleCustomer aggiorna organization.locale SOLO se
// `incoming !== org.locale`. Poiché qui scriviamo il DB PRIMA di Stripe, quando
// quell'evento arriva org.locale è già === incoming → l'if del webhook è falso →
// nessuna seconda scrittura sul DB: il ciclo si chiude da solo. Questa proprietà
// dipende dall'ordine di scrittura sopra: invertendolo, si perderebbe.
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_KEY    = Deno.env.get("STRIPE_SECRET_KEY") ?? Deno.env.get("STRIPE_API_KEY") ?? "";
const STRIPE_VERSION = "2026-04-22.dahlia";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Lingue supportate ────────────────────────────────────────────────────────
// Stesse chiavi di i18n.js (estensione) e del webhook: non si introduce una
// seconda tassonomia di lingue nel prodotto.
type Locale = "it" | "en" | "es" | "fr";
const LOCALES: readonly string[] = ["it", "en", "es", "fr"];

// Accetta 'it', 'IT', 'it-IT', 'it_IT' → 'it'. Qualsiasi valore fuori dal set →
// null, così il chiamante risponde 400 invece di scrivere una lingua inesistente
// su organization.locale (che manderebbe il webhook sul fallback per sempre).
// Implementazione IDENTICA a normalizeLocale del webhook, per coerenza.
function normalizeLocale(raw: unknown): Locale | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().slice(0, 2);
  return LOCALES.includes(s) ? (s as Locale) : null;
}

// Encoder x-www-form-urlencoded per l'API Stripe (chiavi già in notazione bracket
// quando servono, es. metadata[locale]).
function formEncode(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

// Risolve l'utente dal bearer in ingresso (difesa in profondità oltre al
// verify_jwt della piattaforma).
async function resolveUser(authHeader: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "apikey": ANON_KEY, "Authorization": authHeader },
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return user && user.id ? user : null;
}

// Recupera org_id + customer via RPC get_billing_context(), eseguita con il JWT
// dell'utente (l'RPC risolve auth.uid() → current_org_id() server-side).
//   • org_id è presente sempre che l'utente abbia un'organization;
//   • stripe_customer_id è null per chi non è mai transitato dal checkout.
// Ritorna null solo se l'utente non ha alcuna organization (v_org is null).
async function resolveBillingContext(
  authHeader: string,
): Promise<{ org_id: string; stripe_customer_id: string | null } | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_billing_context`, {
    method: "POST",
    headers: {
      "apikey":        ANON_KEY,
      "Authorization": authHeader,
      "Content-Type":  "application/json",
    },
    body: "{}",
  });
  if (!res.ok) return null;
  const ctx = await res.json().catch(() => null);
  if (!ctx || !ctx.org_id) return null;
  return {
    org_id:             ctx.org_id,
    stripe_customer_id: ctx.stripe_customer_id ?? null,
  };
}

// Scrittura DB (service-role, bypassa la RLS) ristretta all'org_id già
// autorizzato via auth.uid() da get_billing_context: la service role non allarga
// l'ambito dell'autorizzazione, la applica al solo record dell'utente corrente.
async function updateOrgLocale(orgId: string, locale: Locale): Promise<boolean> {
  const url = `${SUPABASE_URL}/rest/v1/organization?id=eq.${encodeURIComponent(orgId)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "apikey":        SERVICE_ROLE,
      "Authorization": `Bearer ${SERVICE_ROLE}`,
      "Content-Type":  "application/json",
      "Prefer":        "return=minimal",
    },
    body: JSON.stringify({ locale, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[set-locale] PATCH organization ${orgId} → ${res.status} ${detail.slice(0, 300)}`);
  }
  return res.ok;
}

// Scrittura Stripe (best-effort). metadata è un merge parziale per chiave: NON
// azzera supabaseUserId/vatId già presenti sul customer. Non solleva mai.
async function syncStripeLocale(customerId: string, locale: Locale): Promise<boolean> {
  try {
    const res = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
      method: "POST",
      headers: {
        "Authorization":  `Bearer ${STRIPE_KEY}`,
        "Stripe-Version": STRIPE_VERSION,
        "Content-Type":   "application/x-www-form-urlencoded",
      },
      body: formEncode({ "metadata[locale]": locale }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[set-locale] Stripe customers.update ${customerId} → ${res.status} ${detail.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[set-locale] Stripe sync fallita per ${customerId}:`, (err as Error).message);
    return false;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")    return json(405, { error: "method_not_allowed" });

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE) {
    console.error("[set-locale] Configurazione mancante (secrets Supabase)");
    return json(500, { error: "misconfigured" });
  }

  // ── Auth ──
  const authHeader = req.headers.get("Authorization") ?? "";
  const user = await resolveUser(authHeader);
  if (!user) return json(401, { error: "unauthorized" });

  // ── Input / normalizzazione ──
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const locale = normalizeLocale(body.locale);
  if (!locale) {
    return json(400, {
      error:   "unsupported_locale",
      message: "locale must be one of it, en, es, fr",
    });
  }

  // ── Risoluzione organization (server-side, dal JWT) ──
  const ctx = await resolveBillingContext(authHeader);
  if (!ctx) {
    // Utente autenticato senza organization: non c'è alcun locale server da
    // allineare (la UI ha già applicato la lingua client-side). Non-bloccante.
    return json(200, { updated: false, reason: "no_org" });
  }

  // ── 1) DB-first: organization.locale ──
  // È l'anello di cui garantiamo la scrittura: se fallisce, restituiamo 500 e
  // NON proseguiamo verso Stripe (non allineeremmo Stripe a un DB non aggiornato).
  const dbOk = await updateOrgLocale(ctx.org_id, locale);
  if (!dbOk) return json(500, { error: "db_write_failed" });

  // ── 2) Stripe best-effort ──
  // Chi non ha customer (mai transitato dal checkout) → solo DB, nessun errore.
  // Il customer.updated eventualmente generato qui NON riscrive il DB: a quel
  // punto org.locale === locale (vedi nota IDEMPOTENZA in testa al file).
  let stripeSynced = false;
  if (ctx.stripe_customer_id && STRIPE_KEY) {
    stripeSynced = await syncStripeLocale(ctx.stripe_customer_id, locale);
  }

  return json(200, { updated: true, locale, stripe_synced: stripeSynced });
});
