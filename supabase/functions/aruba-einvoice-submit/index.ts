// ════════════════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: aruba-einvoice-submit   (v1)
// ════════════════════════════════════════════════════════════════════════════
// Worker della outbox einvoice_job (vedi db/migrations/2026-09-23-einvoice.sql):
// legge i job 'pending', costruisce l'XML FatturaPA (supabase/functions/
// _shared/fatturapa.ts), lo carica su Aruba e aggiorna lo stato del job.
//
// NON è agganciata a stripe-webhook. handleInvoice si limita a SCRIVERE il job
// a invoice.paid; questa funzione lo esegue in un secondo momento, invocata da
// un trigger PERIODICO ancora da configurare (pg_cron con net.http_post, o uno
// Scheduled Trigger lato Supabase) — vedi il commento in fondo al file. La
// separazione è deliberata: un errore di rete verso Aruba non deve MAI
// trasformarsi in un retry dell'intero webhook Stripe.
//
// SOLO SUBMIT, NON RICONCILIAZIONE. Questa versione porta i job da 'pending' a
// 'submitted' (Aruba ha preso in carico il file) o 'error' (rifiutato ai
// controlli sincroni, o la chiamata è fallita). Non risolve l'esito SDI vero
// (Consegnata / Scartata / Recapito impossibile): quello arriverà con un passo
// successivo — polling su findInvoices/getInvoiceDetail, o il callback push
// (createNotification/updateInvoiceStatus) descritto nella documentazione
// Aruba, non ancora accreditato.
//
// DRY RUN FAIL-SAFE. Il secret ARUBA_DRY_RUN deve valere ESATTAMENTE "false"
// per trasmettere davvero a SDI: qualunque altro valore (assente, "true",
// refuso) tiene il flag a true. È lo stesso principio fail-closed di
// checkPriceUsable e della validazione posti in create-subscription: un
// default che sbaglia per eccesso di cautela (una fattura non inviata,
// recuperabile) è enormemente meno grave di uno che sbaglia per difetto (una
// fattura elettronica inviata per sbaglio a un cliente vero, che è un atto
// fiscale e non si "annulla" con un rollback).
//
// AUTENTICAZIONE UNA SOLA VOLTA PER INVOCAZIONE. Il signin è limitato a 1
// richiesta al minuto per IP (SLA). Con N job pending in un batch, un solo
// token viene richiesto e riusato per tutti gli upload di quel batch (limite
// separato: 30 upload/minuto).
//
// Deploy:  supabase functions deploy aruba-einvoice-submit
// Secrets:
//   supabase secrets set ARUBA_USERNAME=...
//   supabase secrets set ARUBA_PASSWORD=...
//   supabase secrets set ARUBA_DRY_RUN=false      # SOLO quando si è pronti a trasmettere davvero
//   (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono già impostati per le altre funzioni)
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@^2";
import { buildFatturaPA, type Cessionario, type FatturaInput } from "../_shared/fatturapa.ts";

const ARUBA_AUTH_BASE = "https://auth.fatturazioneelettronica.aruba.it";
const ARUBA_WS_BASE = "https://ws.fatturazioneelettronica.aruba.it";

// Quanti job processare per invocazione. Il limite SLA di upload è 30/minuto;
// un batch più piccolo della singola invocazione lascia margine ad altri
// eventuali chiamanti (es. un retry manuale) senza saturare la quota oraria.
const BATCH_SIZE = 20;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// ── Autenticazione Aruba ─────────────────────────────────────────────────
async function arubaSignin(): Promise<string> {
  const username = Deno.env.get("ARUBA_USERNAME");
  const password = Deno.env.get("ARUBA_PASSWORD");
  if (!username || !password) {
    throw new Error("ARUBA_USERNAME/ARUBA_PASSWORD non configurati");
  }
  const res = await fetch(`${ARUBA_AUTH_BASE}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ grant_type: "password", username, password }).toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Aruba signin fallito: ${data.error_description ?? data.error ?? res.status}`);
  }
  return data.access_token as string;
}

// ── Upload di una fattura già costruita ─────────────────────────────────
interface UploadResult {
  ok: boolean;
  errorCode?: string;
  errorDescription?: string;
  uploadFileName?: string;
}

async function arubaUpload(token: string, xmlBase64: string, dryRun: boolean): Promise<UploadResult> {
  const res = await fetch(`${ARUBA_WS_BASE}/services/invoice/upload`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({ dataFile: xmlBase64, dryRun }),
  });
  const data = await res.json().catch(() => ({}));
  // errorCode "0000" = operazione effettuata. Qualunque altro codice, o una
  // risposta HTTP non-2xx, è un rifiuto ai controlli sincroni (v. Controlli
  // Sincroni nella documentazione Aruba v2.2.0) — mai un successo silenzioso.
  const ok = res.ok && (data.errorCode === "0000" || data.errorCode === "" || data.errorCode == null);
  return {
    ok,
    errorCode: data.errorCode ?? String(res.status),
    errorDescription: data.errorDescription ?? "risposta non interpretabile",
    uploadFileName: data.uploadFileName,
  };
}

// ── Lettura dei dati necessari a costruire l'XML per un job ────────────────
interface JobContext {
  jobId: number;
  sdiNumber: string;
  fattura: FatturaInput;
}

async function loadJobContext(job: { id: number; invoice_id: string; sdi_number: number; attempt_count: number }): Promise<
  { ok: true; ctx: JobContext } | { ok: false; detail: string }
> {
  const { data: inv, error: invErr } = await supabase
    .from("invoice")
    .select("subtotal_cents, vat_cents, total_cents, issued_at, sdi_code, fiscal_code, org_id, subscription_id")
    .eq("id", job.invoice_id)
    .maybeSingle();
  if (invErr || !inv) return { ok: false, detail: `invoice ${job.invoice_id} non leggibile: ${invErr?.message ?? "riga assente"}` };
  if (inv.vat_cents === null) {
    // v15 dello stripe-webhook: null significa "imposta non determinata", mai
    // "zero". Una fattura così non è pronta per l'emissione: attende
    // correzione a monte, non un invio con IVA indovinata.
    return { ok: false, detail: `invoice ${job.invoice_id}: vat_cents è null (imposta non determinata)` };
  }

  const { data: bp, error: bpErr } = await supabase
    .from("billing_profile")
    .select("legal_name, vat_id, address_line1, address_line2, city, state, postal_code, country")
    .eq("org_id", inv.org_id)
    .maybeSingle();
  if (bpErr || !bp) return { ok: false, detail: `billing_profile org ${inv.org_id} non leggibile: ${bpErr?.message ?? "riga assente"}` };
  if (bp.country !== "IT") {
    // Non dovrebbe accadere: il job esiste solo perché sdi_code o fiscal_code
    // sono valorizzati, e quei campi esistono solo per country='IT'. Se questo
    // scatta, qualcosa a monte è cambiato senza che questo modulo lo sapesse —
    // fail-closed piuttosto che generare una FatturaPA per un cliente estero.
    return { ok: false, detail: `billing_profile org ${inv.org_id}: country '${bp.country}' non è IT` };
  }

  let planName = "Abbonamento Sevenda";
  if (inv.subscription_id) {
    const { data: sub } = await supabase
      .from("subscription").select("plan_id").eq("id", inv.subscription_id).maybeSingle();
    if (sub?.plan_id) {
      const { data: plan } = await supabase
        .from("plan").select("name").eq("id", sub.plan_id).maybeSingle();
      if (plan?.name) planName = plan.name;
    }
  }

  const cessionario: Cessionario = inv.sdi_code
    ? { tipo: "business", codiceDestinatario: inv.sdi_code, paese: "IT", partitaIva: extractVatNumber(bp), denominazione: bp.legal_name ?? "" }
    : { tipo: "consumer", codiceFiscale: inv.fiscal_code ?? "", denominazione: bp.legal_name ?? "" };

  if (cessionario.tipo === "business" && !cessionario.partitaIva) {
    return { ok: false, detail: `invoice ${job.invoice_id}: sdi_code presente ma nessuna partita IVA sul billing_profile` };
  }
  if (cessionario.tipo === "consumer" && !cessionario.codiceFiscale) {
    return { ok: false, detail: `invoice ${job.invoice_id}: nessun fiscal_code e nessun sdi_code — cessionario non determinabile` };
  }

  const indirizzo = [bp.address_line1, bp.address_line2].filter(Boolean).join(", ") || "n/d";
  const data = (inv.issued_at ?? new Date().toISOString()).slice(0, 10);

  return {
    ok: true,
    ctx: {
      jobId: job.id,
      sdiNumber: String(job.sdi_number),
      fattura: {
        progressivoInvio: String(job.sdi_number),
        numero: String(job.sdi_number),
        data,
        descrizione: `${planName} — fattura ${data}`,
        imponibileCents: inv.subtotal_cents ?? 0,
        impostaCents: inv.vat_cents,
        totaleCents: inv.total_cents ?? 0,
        cessionario,
        sede: {
          indirizzo,
          cap: bp.postal_code ?? "",
          comune: bp.city ?? "",
          provincia: bp.state || undefined,
          nazione: "IT",
        },
      },
    },
  };
}

// billing_profile.vat_id porta il valore così come inserito al checkout (può
// includere o no il prefisso "IT"): IdFiscaleIVA/IdCodice vuole il numero SENZA
// prefisso paese, che viaggia a parte in IdPaese.
function extractVatNumber(bp: { vat_id?: string | null } & Record<string, unknown>): string {
  const raw = String((bp as { vat_id?: string } | null)?.vat_id ?? "").replace(/\s/g, "").toUpperCase();
  return raw.startsWith("IT") ? raw.slice(2) : raw;
}

function base64Encode(s: string): string {
  // TextEncoder + btoa: gestisce correttamente l'XML come UTF-8, a differenza
  // di un btoa diretto sulla stringa (che tratterebbe ogni char come Latin-1
  // e romperebbe su un cognome accentato o un apostrofo tipografico).
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Fail-closed: qualunque valore diverso da "false" tiene dryRun a true.
  const dryRun = Deno.env.get("ARUBA_DRY_RUN") !== "false";

  const { data: jobs, error: jobsErr } = await supabase
    .from("einvoice_job")
    .select("id, invoice_id, sdi_number, attempt_count")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (jobsErr) {
    console.error(`[aruba] lettura job pending fallita: ${jobsErr.message}`);
    return new Response(JSON.stringify({ error: jobsErr.message }), { status: 500 });
  }
  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  let token: string;
  try {
    token = await arubaSignin();
  } catch (e) {
    console.error(`[aruba] signin fallito: ${(e as Error).message}`);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 502 });
  }

  console.log(`[aruba] batch di ${jobs.length} job, dryRun=${dryRun}`);

  const results: Array<{ jobId: number; status: string }> = [];

  for (const job of jobs) {
    const loaded = await loadJobContext(job);
    if (!loaded.ok) {
      console.error(`[aruba] job ${job.id}: ${loaded.detail}`);
      await supabase.from("einvoice_job").update({
        status: "error",
        aruba_error_detail: loaded.detail,
        attempt_count: job.attempt_count + 1,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      results.push({ jobId: job.id, status: "error" });
      continue;
    }

    const xml = buildFatturaPA(loaded.ctx.fattura);
    const xmlBase64 = base64Encode(xml);

    let upload: UploadResult;
    try {
      upload = await arubaUpload(token, xmlBase64, dryRun);
    } catch (e) {
      upload = { ok: false, errorCode: "network", errorDescription: (e as Error).message };
    }

    const now = new Date().toISOString();
    if (upload.ok) {
      await supabase.from("einvoice_job").update({
        status: "submitted",
        upload_filename: upload.uploadFileName ?? null,
        aruba_error_code: null,
        aruba_error_detail: null,
        xml_base64: xmlBase64,
        dry_run: dryRun,
        attempt_count: job.attempt_count + 1,
        submitted_at: now,
        last_attempt_at: now,
        updated_at: now,
      }).eq("id", job.id);
      console.log(`[aruba] job ${job.id} → submitted (${upload.uploadFileName}, dryRun=${dryRun})`);
    } else {
      await supabase.from("einvoice_job").update({
        status: "error",
        aruba_error_code: upload.errorCode ?? null,
        aruba_error_detail: upload.errorDescription ?? null,
        xml_base64: xmlBase64,
        dry_run: dryRun,
        attempt_count: job.attempt_count + 1,
        last_attempt_at: now,
        updated_at: now,
      }).eq("id", job.id);
      console.error(`[aruba] job ${job.id} → error (${upload.errorCode}: ${upload.errorDescription})`);
    }
    results.push({ jobId: job.id, status: upload.ok ? "submitted" : "error" });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TRIGGER PERIODICO — da configurare, non fa parte di questo file.
// Due strade equivalenti:
//   1) pg_cron + pg_net: una riga SQL che chiama questa funzione ogni N minuti
//      via net.http_post, con l'header apikey/service-role già configurato.
//   2) Supabase Scheduled Triggers (dashboard → Edge Functions → Cron), se
//      disponibile sul piano del progetto.
// In entrambi i casi la funzione è idempotente per costruzione: un'invocazione
// che si sovrappone a una precedente trova solo job già 'submitted' o 'error'
// (mai due volte 'pending' per lo stesso invoice_id, grazie allo UNIQUE su
// einvoice_job.invoice_id) e semplicemente non trova nulla da fare.
// ════════════════════════════════════════════════════════════════════════════
