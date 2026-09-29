// ════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: validate-promo-code   (v1)
// ════════════════════════════════════════════════════════════════
// Dice a checkout.html se un codice sconto è applicabile, PRIMA che l'utente
// arrivi al pagamento, così il riepilogo mostra il totale scontato che verrà
// davvero addebitato. È una lettura pura: non scrive nulla, né su Stripe né
// a DB, e non applica lo sconto — quello lo fa create-subscription v14, che
// rifà la stessa verifica server-side (questa risposta non è un'autorizzazione,
// è un'anteprima).
//
// La ricerca è per `code` sull'API Promotion Codes, che Stripe confronta senza
// distinguere maiuscole/minuscole: "sevenda-7k2qxd" trova SEVENDA-7K2QXD.
// Un codice è valido se il promotion code è attivo, non scaduto, con
// redemption ancora disponibili, e il coupon sottostante è valido.
//
// La stessa logica di verifica vive anche in create-subscription
// (resolvePromotionCode): le Edge Function sono deploy separati senza modulo
// condiviso nel repo, quindi la si duplica — se cambia una regola qui, va
// cambiata anche lì.
//
// Deploy:
//   supabase functions deploy validate-promo-code --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY (già presente)
//
// INPUT  (POST JSON): { code }
// OUTPUT (200): { valid: true, code, promotionCodeId, percentOff, amountOff,
//                 currency, duration, durationInMonths, expiresAt }
//         (200): { valid: false, reason }   reason: not_found | inactive |
//                 expired | exhausted | coupon_invalid
// ERRORI: 400 missing_code · 500 misconfigured · 502 stripe_unreachable
// ════════════════════════════════════════════════════════════════

const STRIPE_API = "https://api.stripe.com/v1";
// Pinned: dalla 2025-09-30.clover il coupon sta in `promotion.coupon`, non in `coupon`.
const STRIPE_VERSION = "2026-04-22.dahlia";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Solo lettere, cifre, trattini e underscore, max 40 caratteri: è il formato
// dei promotion code Stripe, e un valore diverso non merita una chiamata.
const CODE_RE = /^[A-Za-z0-9_-]{1,40}$/;

type PromoCheck =
  | { valid: true; code: string; promotionCodeId: string; percentOff: number | null; amountOff: number | null;
      currency: string | null; duration: string; durationInMonths: number | null; expiresAt: number | null }
  | { valid: false; reason: string };

async function lookupPromotionCode(code: string, secret: string): Promise<PromoCheck> {
  const qs = `code=${encodeURIComponent(code)}&limit=1&expand[]=data.promotion.coupon`;
  const res = await fetch(`${STRIPE_API}/promotion_codes?${qs}`, {
    headers: { "Authorization": `Bearer ${secret}`, "Stripe-Version": STRIPE_VERSION },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Stripe error (${res.status})`);

  const pc = Array.isArray(data?.data) ? data.data[0] : null;
  if (!pc) return { valid: false, reason: "not_found" };
  if (!pc.active) return { valid: false, reason: "inactive" };
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof pc.expires_at === "number" && pc.expires_at <= nowSec) return { valid: false, reason: "expired" };
  if (typeof pc.max_redemptions === "number" && pc.times_redeemed >= pc.max_redemptions) {
    return { valid: false, reason: "exhausted" };
  }
  const rawCoupon = pc.promotion?.coupon ?? pc.coupon;
  const coupon = rawCoupon && typeof rawCoupon === "object" ? rawCoupon : null;
  if (!coupon || coupon.valid === false) return { valid: false, reason: "coupon_invalid" };

  return {
    valid: true,
    code: String(pc.code),
    promotionCodeId: String(pc.id),
    percentOff: typeof coupon.percent_off === "number" ? coupon.percent_off : null,
    amountOff:  typeof coupon.amount_off  === "number" ? coupon.amount_off  : null,   // in centesimi
    currency:   typeof coupon.currency    === "string" ? coupon.currency    : null,
    duration:   String(coupon.duration ?? "once"),
    durationInMonths: typeof coupon.duration_in_months === "number" ? coupon.duration_in_months : null,
    expiresAt:  typeof pc.expires_at === "number" ? pc.expires_at : null,
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")    return json(405, { error: "Method not allowed", code: "method_not_allowed" });

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) return json(500, { error: "Service not configured.", code: "misconfigured" });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const code = String(body.code ?? "").trim();
  if (!code) return json(400, { error: "Missing code.", code: "missing_code" });
  if (!CODE_RE.test(code)) return json(200, { valid: false, reason: "not_found" });

  try {
    const result = await lookupPromotionCode(code, secret);
    return json(200, result as unknown as Record<string, unknown>);
  } catch (err) {
    console.error(`[validate-promo] ${code}: ${(err as Error).message}`);
    return json(502, { error: "Could not verify the code right now. Please try again.", code: "stripe_unreachable" });
  }
});
