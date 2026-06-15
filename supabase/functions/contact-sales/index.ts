// ════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: contact-sales
// ════════════════════════════════════════════════════════════════
// Riceve i lead Enterprise da contact-sales.html e li inoltra via email
// a hello@sevenda.dev usando Resend (https://resend.com).
//
// Deploy:
//   supabase functions deploy contact-sales --no-verify-jwt
//
// Secrets:
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase secrets set SALES_TO=hello@sevenda.dev          (opzionale)
//   supabase secrets set SALES_FROM="Sevenda <noreply@sevenda.dev>"  (dominio verificato su Resend)
//
// Nota: se RESEND_API_KEY non è impostata, la function risponde 501 e il
// frontend fa fallback automatico su mailto.
// ════════════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      // Nessun provider configurato → il client farà fallback su mailto
      return new Response(JSON.stringify({ error: "Email provider not configured." }), {
        status: 501, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const to   = Deno.env.get("SALES_TO")   || "hello@sevenda.dev";
    const from = Deno.env.get("SALES_FROM") || "Sevenda <noreply@sevenda.dev>";

    const d = await req.json();
    if (!d.name || !d.email || !d.company || !d.message) {
      throw new Error("Missing required fields.");
    }

    const html = `
      <h2>New Enterprise enquiry</h2>
      <table cellpadding="6" style="font-family:sans-serif;font-size:14px">
        <tr><td><strong>Name</strong></td><td>${esc(d.name)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${esc(d.email)}</td></tr>
        <tr><td><strong>Company</strong></td><td>${esc(d.company)}</td></tr>
        <tr><td><strong>Team size</strong></td><td>${esc(d.size)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${esc(d.phone) || "—"}</td></tr>
        <tr><td><strong>Plan</strong></td><td>${esc(d.plan) || "—"}</td></tr>
      </table>
      <p style="font-family:sans-serif;font-size:14px"><strong>Message:</strong><br>${esc(d.message).replace(/\n/g, "<br>")}</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: d.email,
        subject: `Enterprise enquiry — ${d.company}`,
        html,
      }),
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.message || `Email send failed (${res.status})`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message || "Unexpected error." }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
