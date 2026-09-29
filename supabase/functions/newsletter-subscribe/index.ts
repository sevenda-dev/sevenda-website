// ════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: newsletter-subscribe   (v1)
// ════════════════════════════════════════════════════════════════
// Riceve l'iscrizione alla newsletter dalla modale di index.html e consegna
// il codice sconto di benvenuto del 30%.
//
// PROCESSO
//   1. Valida e normalizza l'input (email in minuscolo, telefono facoltativo).
//   2. Cerca l'email in newsletter_subscriber (service role).
//        • già iscritta CON codice valido  → restituisce lo stesso codice
//          (alreadySubscribed: true). Un codice per email, mai due.
//        • già iscritta con codice SCADUTO → 409 code_expired: il benvenuto è
//          stato consumato, non si rigenera.
//        • già iscritta SENZA codice (Stripe era giù al primo tentativo) →
//          si prosegue al punto 3, così il lead riceve il codice al retry.
//        • nuova → inserisce la riga (upsert su email).
//   3. Crea su Stripe un Promotion Code MONOUSO sul coupon di benvenuto
//      (STRIPE_NEWSLETTER_COUPON_ID, un coupon "30% off" creato una volta dalla
//      dashboard) con scadenza a NEWSLETTER_CODE_DAYS giorni e lo salva sulla
//      riga. Il codice è "SEVENDA-" + 6 caratteri senza ambiguità (no 0/O/1/I).
//   4. Invia via Resend l'email con il codice, nella lingua dell'utente.
//      Best-effort: senza RESEND_API_KEY si salta, il codice è comunque
//      mostrato a schermo e restituito nella risposta.
//
// ORDINE DI SCRITTURA: PRIMA il DB, POI Stripe. Se Stripe fallisce il lead è
// già salvato e la risposta è 502 promo_failed: il cliente ripete l'invio e
// il codice viene creato sulla riga esistente. Se si scrivesse prima Stripe,
// un errore DB lascerebbe un promotion code orfano.
//
// ABUSI: l'endpoint è pubblico (--no-verify-jwt, come contact-sales). Un campo
// honeypot (`website`) compilato fa rispondere ok senza scrivere nulla; il
// promotion code è monouso e uno per email, quindi il danno massimo di uno
// spam di iscrizioni è una riga in tabella per ogni email inventata.
//
// Deploy:
//   supabase functions deploy newsletter-subscribe --no-verify-jwt
//
// Secrets:
//   STRIPE_SECRET_KEY              già presente (create-subscription)
//   STRIPE_NEWSLETTER_COUPON_ID    id del coupon "30% off" (es. NEWSLETTER30):
//                                  Stripe → Product catalog → Coupons → Create,
//                                  Percentage 30, Duration = ONCE. La durata
//                                  DEV'ESSERE `once`: è la strategia decisa —
//                                  lo sconto vale solo sul primo acquisto (il
//                                  primo pagamento dopo il trial), identico per
//                                  mensile e annuale, e non sui rinnovi. Un
//                                  coupon `repeating`/`forever` sconterebbe
//                                  anche i rinnovi: create-subscription logga un
//                                  warning se il coupon non è `once`. Non è la
//                                  function a crearlo.
//   NEWSLETTER_CODE_DAYS           validità del codice in giorni (default 30)
//   RESEND_API_KEY                 già presente (contact-sales), facoltativa
//   NEWSLETTER_FROM                mittente (default "Sevenda <noreply@sevenda.dev>")
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   iniettati dalla piattaforma
//
// INPUT  (POST JSON): { firstName, lastName, email, phone?, locale?, source?, website? }
// OUTPUT (200): { ok: true, code, expiresAt, discountPercent, alreadySubscribed, emailSent }
// ERRORI: 400 missing_fields | invalid_email | invalid_phone
//         409 code_expired · 500 misconfigured | db_write_failed
//         502 promo_failed · 503 promo_unavailable (coupon non configurato)
// ════════════════════════════════════════════════════════════════

const STRIPE_API     = "https://api.stripe.com/v1";
// Versione pinned come in set-locale / stripe-webhook / create-portal-session: dalla
// 2025-09-30.clover il Promotion Code non ha più `coupon` al primo livello ma
// `promotion: { type: "coupon", coupon }`. Senza pin si dipende dalla versione
// di default dell'account e la richiesta può essere rifiutata (promo_failed).
const STRIPE_VERSION = "2026-04-22.dahlia";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_KEY     = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const COUPON_ID      = Deno.env.get("STRIPE_NEWSLETTER_COUPON_ID") ?? "";
const RESEND_KEY     = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM      = Deno.env.get("NEWSLETTER_FROM") || "Sevenda <noreply@sevenda.dev>";
const CODE_DAYS      = (() => {
  const n = parseInt(Deno.env.get("NEWSLETTER_CODE_DAYS") ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : 30;
})();
const DISCOUNT_PERCENT = 30;   // solo per il testo: la percentuale vera è sul coupon Stripe
const TABLE = "newsletter_subscriber";

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

// ── Normalizzazione input ────────────────────────────────────────────────────
type Locale = "it" | "en" | "es" | "fr";
const LOCALES: readonly string[] = ["it", "en", "es", "fr"];

// Stessa regola di set-locale: 'it', 'IT', 'it-IT' → 'it'; altro → 'en'.
function normalizeLocale(raw: unknown): Locale {
  if (typeof raw !== "string") return "en";
  const s = raw.trim().toLowerCase().slice(0, 2);
  return LOCALES.includes(s) ? (s as Locale) : "en";
}

function cleanName(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

// Formato volutamente permissivo: un indirizzo scritto male non è un attacco,
// e la regex serve a scartare "abc" o "mario@", non a validare l'RFC 5322.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Telefono facoltativo: vuoto va bene; se presente, solo + e cifre (spazi,
// punti, trattini e parentesi vengono tolti), fra 6 e 15 cifre come E.164.
function cleanPhone(raw: unknown): { ok: boolean; value: string | null } {
  const s = String(raw ?? "").replace(/[\s().-]/g, "");
  if (!s) return { ok: true, value: null };
  if (!/^\+?\d{6,15}$/.test(s)) return { ok: false, value: null };
  return { ok: true, value: s };
}

// ── Codice sconto ────────────────────────────────────────────────────────────
// 6 caratteri da un alfabeto senza 0/O/1/I: il cliente lo ricopia a mano dal
// telefono al checkout, e "SEVENDA-0O1I" è un codice che nessuno riesce a
// digitare giusto al primo colpo.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `SEVENDA-${s}`;
}

// ── Supabase REST (service role) ─────────────────────────────────────────────
function dbHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "apikey":        SERVICE_ROLE,
    "Authorization": `Bearer ${SERVICE_ROLE}`,
    "Content-Type":  "application/json",
    ...extra,
  };
}

type SubscriberRow = {
  id: string;
  email: string;
  promo_code: string | null;
  stripe_promotion_code_id: string | null;
  promo_expires_at: string | null;
};

async function findSubscriber(email: string): Promise<SubscriberRow | null> {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?email=eq.${encodeURIComponent(email)}`
    + `&select=id,email,promo_code,stripe_promotion_code_id,promo_expires_at&limit=1`;
  const res = await fetch(url, { headers: dbHeaders() });
  if (!res.ok) {
    console.error(`[newsletter] GET ${TABLE} → ${res.status} ${(await res.text().catch(() => "")).slice(0, 300)}`);
    throw new Error("db_read_failed");
  }
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] as SubscriberRow : null;
}

// Upsert su email: la seconda iscrizione aggiorna nome, cognome, telefono e
// lingua (il cliente può averli corretti) senza toccare il codice, che vive in
// colonne che qui non si scrivono.
async function upsertSubscriber(row: Record<string, unknown>): Promise<SubscriberRow> {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=email`;
  const res = await fetch(url, {
    method: "POST",
    headers: dbHeaders({ "Prefer": "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    console.error(`[newsletter] upsert ${TABLE} → ${res.status} ${(await res.text().catch(() => "")).slice(0, 300)}`);
    throw new Error("db_write_failed");
  }
  const rows = await res.json().catch(() => []);
  if (!Array.isArray(rows) || !rows[0]) throw new Error("db_write_failed");
  return rows[0] as SubscriberRow;
}

async function savePromo(id: string, code: string, promoId: string, expiresAt: string): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: dbHeaders({ "Prefer": "return=minimal" }),
    body: JSON.stringify({
      promo_code: code,
      stripe_promotion_code_id: promoId,
      promo_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    // Il promotion code esiste già su Stripe: se questa PATCH fallisce il
    // cliente lo ha comunque ricevuto a schermo, ma un retry ne creerebbe un
    // secondo. Log esplicito con l'id, così si può riconciliare a mano.
    console.error(`[newsletter] PATCH ${TABLE} ${id} (promo ${promoId}) → ${res.status} ${(await res.text().catch(() => "")).slice(0, 300)}`);
    throw new Error("db_write_failed");
  }
}

// ── Stripe ───────────────────────────────────────────────────────────────────
function formEncode(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function createPromotionCode(code: string, email: string, expiresAt: Date): Promise<string> {
  const res = await fetch(`${STRIPE_API}/promotion_codes`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_KEY}`,
      "Content-Type":  "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_VERSION,
      // Un retry con lo stesso codice (PATCH DB fallita) riottiene lo stesso
      // oggetto invece di un errore "code already exists".
      "Idempotency-Key": `sevenda-newsletter-${code}`,
    },
    body: formEncode({
      "promotion[type]":   "coupon",
      "promotion[coupon]": COUPON_ID,
      "code":              code,
      "max_redemptions":   "1",
      "expires_at":        String(Math.floor(expiresAt.getTime() / 1000)),
      "metadata[email]":   email,
      "metadata[source]":  "newsletter",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    throw new Error(data?.error?.message || `Stripe error (${res.status})`);
  }
  return data.id as string;
}

// ── Email (Resend, best-effort) ──────────────────────────────────────────────
function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const MAIL_COPY: Record<Locale, { subject: string; hi: string; body: string; valid: string; cta: string; footer: string }> = {
  it: {
    subject: "Il tuo codice sconto del 30% — Sevenda",
    hi:      "Ciao {name},",
    body:    "grazie per esserti iscritto alla newsletter di Sevenda. Ecco il tuo codice sconto del {pct}%:",
    valid:   "Valido fino al {date}, una sola volta. Inseriscilo nel campo “Codice sconto” al checkout.",
    cta:     "Scegli il tuo piano",
    footer:  "Ricevi questa email perché ti sei iscritto alla newsletter su sevenda.dev. Puoi annullare l'iscrizione in qualsiasi momento scrivendo a hello@sevenda.dev.",
  },
  en: {
    subject: "Your 30% discount code — Sevenda",
    hi:      "Hi {name},",
    body:    "thanks for subscribing to the Sevenda newsletter. Here is your {pct}% discount code:",
    valid:   "Valid until {date}, one use only. Enter it in the “Discount code” field at checkout.",
    cta:     "Choose your plan",
    footer:  "You receive this email because you subscribed to the newsletter on sevenda.dev. You can unsubscribe at any time by writing to hello@sevenda.dev.",
  },
  es: {
    subject: "Tu código de descuento del 30 % — Sevenda",
    hi:      "Hola {name},",
    body:    "gracias por suscribirte a la newsletter de Sevenda. Este es tu código de descuento del {pct} %:",
    valid:   "Válido hasta el {date}, un solo uso. Introdúcelo en el campo “Código de descuento” al pagar.",
    cta:     "Elige tu plan",
    footer:  "Recibes este correo porque te suscribiste a la newsletter en sevenda.dev. Puedes darte de baja en cualquier momento escribiendo a hello@sevenda.dev.",
  },
  fr: {
    subject: "Votre code de réduction de 30 % — Sevenda",
    hi:      "Bonjour {name},",
    body:    "merci de vous être abonné à la newsletter Sevenda. Voici votre code de réduction de {pct} % :",
    valid:   "Valable jusqu'au {date}, utilisable une seule fois. Saisissez-le dans le champ « Code de réduction » lors du paiement.",
    cta:     "Choisir votre offre",
    footer:  "Vous recevez cet e-mail parce que vous vous êtes abonné à la newsletter sur sevenda.dev. Vous pouvez vous désabonner à tout moment en écrivant à hello@sevenda.dev.",
  },
};

function fill(s: string, map: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? "");
}

async function sendCodeEmail(
  to: string, firstName: string, locale: Locale, code: string, expiresAt: Date,
): Promise<boolean> {
  if (!RESEND_KEY) return false;
  const c = MAIL_COPY[locale];
  let date: string;
  try {
    date = expiresAt.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    date = expiresAt.toISOString().slice(0, 10);
  }
  const map = { name: esc(firstName), pct: String(DISCOUNT_PERCENT), date: esc(date) };
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:520px">
      <p>${fill(c.hi, map)}</p>
      <p>${fill(c.body, map)}</p>
      <p style="font-family:'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:.08em;background:#191919;color:#ffffff;padding:16px 20px;border-radius:8px;text-align:center">${esc(code)}</p>
      <p>${fill(c.valid, map)}</p>
      <p><a href="https://sevenda.dev/pricing.html" style="display:inline-block;background:#191919;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">${esc(c.cta)}</a></p>
      <p style="font-size:12px;color:#6e6e6a;margin-top:32px">${esc(c.footer)}</p>
    </div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject: c.subject, html }),
    });
    if (!res.ok) {
      console.error(`[newsletter] Resend → ${res.status} ${(await res.text().catch(() => "")).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[newsletter] Resend non raggiungibile: ${(err as Error).message}`);
    return false;
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")    return json(405, { error: "Method not allowed", code: "method_not_allowed" });

  if (!SUPABASE_URL || !SERVICE_ROLE || !STRIPE_KEY) {
    console.error("[newsletter] configurazione mancante (SUPABASE_URL / SERVICE_ROLE / STRIPE_SECRET_KEY)");
    return json(500, { error: "Service not configured.", code: "misconfigured" });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  // Honeypot: un umano non vede il campo, un bot lo compila. Si risponde come
  // a un successo per non dare al bot un segnale su cui adattarsi.
  if (typeof body.website === "string" && body.website.trim()) {
    return json(200, { ok: true, code: null, expiresAt: null, discountPercent: DISCOUNT_PERCENT, alreadySubscribed: false, emailSent: false });
  }

  const firstName = cleanName(body.firstName);
  const lastName  = cleanName(body.lastName);
  const email     = String(body.email ?? "").trim().toLowerCase();
  const locale    = normalizeLocale(body.locale);
  const source    = cleanName(body.source) || "landing-modal";
  const phone     = cleanPhone(body.phone);

  if (!firstName || !lastName || !email) {
    return json(400, { error: "First name, last name and email are required.", code: "missing_fields" });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { error: "Enter a valid email address.", code: "invalid_email" });
  }
  if (!phone.ok) {
    return json(400, { error: "Enter a valid phone number, or leave it empty.", code: "invalid_phone" });
  }

  try {
    // ── 2) Iscrizione esistente? ─────────────────────────────────────────────
    const existing = await findSubscriber(email);
    const now = Date.now();
    if (existing?.promo_code && existing.stripe_promotion_code_id) {
      const exp = existing.promo_expires_at ? Date.parse(existing.promo_expires_at) : NaN;
      if (Number.isFinite(exp) && exp <= now) {
        console.log(`[newsletter] ${email}: codice ${existing.promo_code} scaduto, nessuna rigenerazione`);
        return json(409, {
          error: "This email has already received its welcome discount, and the code has expired.",
          code: "code_expired",
        });
      }
      // Anagrafica aggiornata best-effort, codice invariato.
      await upsertSubscriber({ email, first_name: firstName, last_name: lastName, phone: phone.value, locale, updated_at: new Date().toISOString() })
        .catch((e) => console.warn(`[newsletter] aggiornamento anagrafica ${email} fallito: ${(e as Error).message}`));
      console.log(`[newsletter] ${email}: già iscritta, restituito ${existing.promo_code}`);
      return json(200, {
        ok: true,
        code: existing.promo_code,
        expiresAt: existing.promo_expires_at,
        discountPercent: DISCOUNT_PERCENT,
        alreadySubscribed: true,
        emailSent: false,
      });
    }

    // ── DB prima di Stripe: il lead è salvato anche se il codice fallisce ───
    const row = await upsertSubscriber({
      email,
      first_name: firstName,
      last_name:  lastName,
      phone:      phone.value,
      locale,
      source,
      consent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // ── 3) Promotion code Stripe ─────────────────────────────────────────────
    if (!COUPON_ID) {
      console.error(`[newsletter] ${email}: iscrizione salvata ma STRIPE_NEWSLETTER_COUPON_ID non configurato`);
      return json(503, {
        error: "We saved your subscription but could not issue the discount code yet. Please try again later.",
        code: "promo_unavailable",
      });
    }
    const code      = generateCode();
    const expiresAt = new Date(now + CODE_DAYS * 24 * 60 * 60 * 1000);
    let promoId: string;
    try {
      promoId = await createPromotionCode(code, email, expiresAt);
    } catch (e) {
      console.error(`[newsletter] ${email}: promotion code non creato — ${(e as Error).message}`);
      return json(502, {
        error: "We saved your subscription but could not issue the discount code. Please try again in a moment.",
        code: "promo_failed",
      });
    }
    await savePromo(row.id, code, promoId, expiresAt.toISOString());
    console.log(`[newsletter] ${email}: nuovo codice ${code} (${promoId}), scade ${expiresAt.toISOString()}`);

    // ── 4) Email best-effort ─────────────────────────────────────────────────
    const emailSent = await sendCodeEmail(email, firstName, locale, code, expiresAt);

    return json(200, {
      ok: true,
      code,
      expiresAt: expiresAt.toISOString(),
      discountPercent: DISCOUNT_PERCENT,
      alreadySubscribed: false,
      emailSent,
    });
  } catch (err) {
    const msg = (err as Error).message || "unexpected";
    console.error(`[newsletter] ${email}: ${msg}`);
    const code = msg === "db_read_failed" || msg === "db_write_failed" ? msg : "unexpected";
    return json(500, { error: "Something went wrong. Please try again in a moment.", code });
  }
});
