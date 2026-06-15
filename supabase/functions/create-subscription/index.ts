// ════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: create-subscription
// ════════════════════════════════════════════════════════════════
// Crea un Customer Stripe e una Subscription "incomplete", restituendo
// il client_secret del PaymentIntent da confermare lato client con
// Stripe Elements (checkout.html).
//
// Deploy:
//   supabase functions deploy create-subscription --no-verify-jwt
//
// Secrets (Supabase > Project Settings > Edge Functions > Secrets):
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
//   supabase secrets set STRIPE_PRICES='{"analyst":{"annual":"price_...","monthly":"price_..."}, ...}'
//
// STRIPE_PRICES mappa planId -> { annual, monthly } con i Price ID Stripe.
// In assenza dell'env usa i placeholder qui sotto (da sostituire).
// ════════════════════════════════════════════════════════════════

const STRIPE_API = "https://api.stripe.com/v1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback price map (sostituisci con i tuoi Price ID reali, oppure usa l'env STRIPE_PRICES)
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
    try { return JSON.parse(raw); } catch { /* ignore, usa fallback */ }
  }
  return FALLBACK_PRICES;
}

// Stripe usa application/x-www-form-urlencoded con chiavi annidate (a[b][c]).
function encodeForm(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object" && !Array.isArray(v)) {
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

    const { planId, interval, quantity, email, name, phone, address, vatId } = await req.json();

    if (!planId || !interval || !email) {
      throw new Error("Missing required fields (planId, interval, email).");
    }
    const billingInterval = interval === "monthly" ? "monthly" : "annual";
    const qty = Math.max(1, parseInt(String(quantity), 10) || 1);

    const map = priceMap();
    const priceId = map[planId]?.[billingInterval as "annual" | "monthly"];
    if (!priceId || priceId.includes("REPLACE")) {
      throw new Error(`Stripe price not configured for plan "${planId}" (${billingInterval}).`);
    }

    // 1) Customer
    const customer = await stripe("/customers", {
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
      metadata: { planId, vatId: vatId || "" },
    }, secret);

    // 2) Subscription (incomplete → PaymentIntent da confermare lato client)
    const subscription = await stripe("/subscriptions", {
      customer: customer.id,
      items: [{ price: priceId, quantity: qty }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      "expand[0]": "latest_invoice.payment_intent",
      metadata: { planId, interval: billingInterval, seats: String(qty) },
    }, secret);

    const clientSecret = subscription?.latest_invoice?.payment_intent?.client_secret;
    if (!clientSecret) throw new Error("Could not retrieve payment client secret.");

    return new Response(
      JSON.stringify({
        subscriptionId: subscription.id,
        customerId: customer.id,
        clientSecret,
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
