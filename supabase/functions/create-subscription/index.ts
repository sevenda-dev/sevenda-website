// ════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: create-subscription   (PATCH v6)
// ════════════════════════════════════════════════════════════════
// Crea un Customer Stripe e una Subscription "incomplete", restituendo
// il client_secret del PaymentIntent da confermare lato client con
// Stripe Elements (checkout.html).
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

async function stripe(path: string, body: Record<string, unknown>, key: string) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe error (${res.status})`);
  }
  return data;
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

    // PATCH v2: supabaseUserId e orgName per il linking lato webhook
    const { planId, interval, quantity, email, name, phone, address, vatId,
            supabaseUserId, orgName } = await req.json();

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
    const qty = Math.max(1, parseInt(String(quantity), 10) || 1);

    const map = priceMap();
    const priceId = map[planId]?.[billingInterval as "annual" | "monthly"];
    if (!priceId || priceId.includes("REPLACE")) {
      throw new Error(`Stripe price not configured for plan "${planId}" (${billingInterval}).`);
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
      metadata: {
        // v6: planId RIMOSSO — resolveOrg legge solo supabaseUserId, vatId e
        // locale. Dopo un cambio piano dal Portal restava indietro in silenzio.
        vatId: vatId || "",
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

    // 2) Subscription (incomplete → PaymentIntent da confermare lato client)
    const subscription = await stripe("/subscriptions", {
      customer: customer.id,
      items: [{ price: priceId, quantity: qty }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      // Trial: prima fattura zero -> nessun PaymentIntent, si raccoglie la carta via
      // pending_setup_intent e si addebita a fine trial. missing_payment_method:
      // 'cancel' = se a fine trial manca una carta valida, la subscription si annulla.
      trial_period_days: TRIAL_DAYS,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      // Servono ENTRAMBI gli expand: pending_setup_intent (trial) e
      // latest_invoice.confirmation_secret (no-trial). Indici distinti perche'
      // encodeForm serializza correttamente expand[0]/expand[1] per Stripe.
      "expand[0]": "latest_invoice.confirmation_secret",
      "expand[1]": "pending_setup_intent",
      // v6: planId/interval/seats RIMOSSI. La verità su piano, ciclo e posti
      // sta negli items ed è lì che il webhook v8 la legge. Lo stato iniziale
      // resta comunque ricostruibile dalla prima riga di subscription_event e
      // dall'event log di Stripe: non si perde informazione, si smette di
      // duplicarla in un posto che nessuno aggiorna.
      metadata: {
        supabaseUserId,
      },
    }, secret);

    // Con il trial la subscription e' 'trialing' e la prima fattura e' zero: non c'e'
    // un PaymentIntent da confermare, ma un pending_setup_intent (carta per il
    // futuro). Senza trial resta il flusso PaymentIntent (confirmation_secret).
    const setupSecret   = subscription?.pending_setup_intent?.client_secret ?? null;
    const paymentSecret = subscription?.latest_invoice?.confirmation_secret?.client_secret ?? null;
    const mode: "setup" | "payment" = setupSecret ? "setup" : "payment";
    const clientSecret  = setupSecret ?? paymentSecret;
    if (!clientSecret) throw new Error("Could not retrieve client secret (setup/payment).");

    return new Response(
      JSON.stringify({
        subscriptionId: subscription.id,
        customerId: customer.id,
        clientSecret,
        mode,                                      // "setup" (trial) | "payment" (no-trial)
        trialEnd: subscription?.trial_end ?? null, // unix seconds | null
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
