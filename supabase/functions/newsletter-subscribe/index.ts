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

// Copy per lingua. `kicker` è il titoletto arancione sopra il titolo (reso in
// maiuscolo via CSS), `hi` il saluto, `valid` scadenza e istruzione d'uso.
type MailCopy = {
  subject: string; kicker: string; title: string; hi: string; valid: string;
  cta: string; footer: string; support: string; preheader: string;
};
const MAIL_COPY: Record<Locale, MailCopy> = {
  it: {
    subject:   "Il tuo codice sconto del 30% — Sevenda",
    kicker:    "Unisciti al team",
    title:     "Il tuo codice sconto del {pct}%",
    hi:        "Ciao {name},",
    valid:     "Valido fino al {date}, una sola volta. Inseriscilo nel campo “Codice sconto” al checkout.",
    cta:       "Scegli il tuo piano",
    footer:    "Ricevi questa email perché ti sei iscritto alla newsletter su sevenda.dev. Puoi annullare l'iscrizione in qualsiasi momento scrivendo a hello@sevenda.dev.",
    support:   "Supporto",
    preheader: "{code}: usalo al checkout entro il {date}.",
  },
  en: {
    subject:   "Your 30% discount code — Sevenda",
    kicker:    "Join the team",
    title:     "Your {pct}% discount code",
    hi:        "Hi {name},",
    valid:     "Valid until {date}, one use only. Enter it in the “Discount code” field at checkout.",
    cta:       "Choose your plan",
    footer:    "You receive this email because you subscribed to the newsletter on sevenda.dev. You can unsubscribe at any time by writing to hello@sevenda.dev.",
    support:   "Support",
    preheader: "{code}: use it at checkout by {date}.",
  },
  es: {
    subject:   "Tu código de descuento del 30 % — Sevenda",
    kicker:    "Únete al equipo",
    title:     "Tu código de descuento del {pct} %",
    hi:        "Hola {name},",
    valid:     "Válido hasta el {date}, un solo uso. Introdúcelo en el campo “Código de descuento” al pagar.",
    cta:       "Elige tu plan",
    footer:    "Recibes este correo porque te suscribiste a la newsletter en sevenda.dev. Puedes darte de baja en cualquier momento escribiendo a hello@sevenda.dev.",
    support:   "Soporte",
    preheader: "{code}: úsalo al pagar antes del {date}.",
  },
  fr: {
    subject:   "Votre code de réduction de 30 % — Sevenda",
    kicker:    "Rejoignez l'équipe",
    title:     "Votre code de réduction de {pct} %",
    hi:        "Bonjour {name},",
    valid:     "Valable jusqu'au {date}, utilisable une seule fois. Saisissez-le dans le champ « Code de réduction » lors du paiement.",
    cta:       "Choisir votre offre",
    footer:    "Vous recevez cet e-mail parce que vous vous êtes abonné à la newsletter sur sevenda.dev. Vous pouvez vous désabonner à tout moment en écrivant à hello@sevenda.dev.",
    support:   "Support",
    preheader: "{code} : à utiliser lors du paiement avant le {date}.",
  },
};

function fill(s: string, map: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? "");
}

// Il logo è un PNG (radice del sito) e non logo.svg: Gmail e molti client non
// mostrano le immagini SVG. È la stessa grafica di logo.svg, rasterizzata.
const SITE      = "https://sevenda.dev";
const MAIL_LOGO = `${SITE}/logo-email.png`;

// HTML dell'email: stesso layout della modale di index.html (logo a sinistra,
// contenuto a destra; su schermi stretti le colonne si impilano). Tabelle e stili
// inline perché i client di posta non sono browser; sfondi anche come attributo
// bgcolor perché Gmail e Outlook scartano molti stili sul body.
// `m` contiene valori GIÀ escapati: `name`, `date`, `code`, `pct`.
function buildEmailHtml(c: MailCopy, locale: Locale, m: Record<string, string>): string {
  const title = fill(c.title, m);
  const MONO = "'Geist Mono',Menlo,Consolas,monospace";
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${esc(c.subject)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    @media only screen and (max-width:560px) {
      .sv-col  { display:block !important; width:100% !important; box-sizing:border-box !important; }
      .sv-side { padding:20px !important; border-right:0 !important; border-bottom:1px solid #1e1e1e !important; }
      .sv-logo { width:72px !important; }
      .sv-tag  { display:none !important; }
      .sv-body { padding:28px 22px !important; }
      .sv-code { font-size:19px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#000001; font-family:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; color:#e8e8e6;" bgcolor="#000001">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#000001;">${fill(c.preheader, m)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#000001" style="background:#000001;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; border:1px solid #2a2a2a; border-radius:14px; border-collapse:separate; overflow:hidden;">
          <tr>
            <td class="sv-col sv-side" width="220" align="center" valign="middle" bgcolor="#0d0d0d" style="width:220px; padding:36px 20px; background:#0d0d0d; border-right:1px solid #1e1e1e; text-align:center;">
              <img class="sv-logo" src="${MAIL_LOGO}" alt="Sevenda" width="170" style="display:block; width:170px; height:auto; margin:0 auto;">
              <div class="sv-tag" style="margin-top:20px; font-family:${MONO}; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#6e6e6a;">sevenda.dev</div>
            </td>

            <td class="sv-col sv-body" valign="top" bgcolor="#131313" style="padding:36px 32px; background:#131313; text-align:left;">
              <div style="font-family:${MONO}; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#E8733A; margin:0 0 10px;">${esc(c.kicker)}</div>
              <h1 style="margin:0 0 14px; font-size:26px; font-weight:700; color:#e8e8e6; letter-spacing:-.03em; line-height:1.15;">${title}</h1>
              <p style="margin:0 0 6px; font-size:14px; color:#8a8a8a; line-height:1.6;">${fill(c.hi, m)}</p>

              <div style="margin:10px 0 16px; padding:16px 18px; background:#0d0d0d; border:1px dashed #2a2a2a; border-radius:8px;">
                <span class="sv-code" style="font-family:${MONO}; font-size:22px; font-weight:500; letter-spacing:.08em; color:#e8e8e6; word-break:break-all;">${m.code}</span>
              </div>

              <p style="margin:0 0 22px; font-size:13.5px; color:#8a8a8a; line-height:1.6;">${fill(c.valid, m)}</p>

              <a href="${SITE}/pricing.html" style="display:block; padding:14px 20px; background:#e8e8e6; color:#0c0c0c; font-size:13px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; text-decoration:none; text-align:center; border-radius:6px;">${esc(c.cta)}</a>
            </td>
          </tr>
        </table>

        <p style="margin:24px auto 0; max-width:520px; font-size:12px; color:#6e6e6a; line-height:1.6; text-align:center;">${esc(c.footer)}</p>
        <p style="margin:16px 0 0; font-size:12px; color:#4a4a4a; text-align:center;">
          <a href="${SITE}" style="color:#8a8a8a; text-decoration:none;">sevenda.dev</a> &bull;
          <a href="${SITE}/docs" style="color:#8a8a8a; text-decoration:none;">Docs</a> &bull;
          <a href="mailto:hello@sevenda.dev" style="color:#8a8a8a; text-decoration:none;">${esc(c.support)}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
  // Tutto ciò che entra nell'HTML e non è copy fissa passa da esc(): il nome lo
  // scrive l'utente.
  const html = buildEmailHtml(c, locale, {
    name: esc(firstName), pct: String(DISCOUNT_PERCENT), date: esc(date), code: esc(code),
  });
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
