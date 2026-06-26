// ════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: create-subscription   (PATCH v2)
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
// Deploy:  supabase functions deploy create-subscription --no-verify-jwt
// ════════════════════════════════════════════════════════════════

const STRIPE_API = "https://api.stripe.com/v1";

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
    const billingInterval = interval === "monthly" ? "monthly" : "annual";
    const qty = Math.max(1, parseInt(String(quantity), 10) || 1);

    const map = priceMap();
    const priceId = map[planId]?.[billingInterval as "annual" | "monthly"];
    if (!priceId || priceId.includes("REPLACE")) {
      throw new Error(`Stripe price not configured for plan "${planId}" (${billingInterval}).`);
    }

    // 1) Customer  (metadata estesi: supabaseUserId + orgName)
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
      metadata: {
        planId,
        vatId: vatId || "",
        supabaseUserId,                 // ← serve al webhook per creare/risolvere l'organization
        orgName: orgName || "",
      },
    }, secret);

    // 2) Subscription (incomplete → PaymentIntent da confermare lato client)
    const subscription = await stripe("/subscriptions", {
      customer: customer.id,
      items: [{ price: priceId, quantity: qty }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      "expand[]": "latest_invoice.confirmation_secret",
      metadata: {
        planId,
        interval: billingInterval,
        seats: String(qty),
        supabaseUserId,
      },
    }, secret);

    const clientSecret = subscription?.latest_invoice?.confirmation_secret?.client_secret;
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
