// ════════════════════════════════════════════════════════════════════════════
// Sevenda — Edge Function: stripe-webhook
// ════════════════════════════════════════════════════════════════════════════
// Chiude il giro Stripe → Supabase. Riceve gli eventi Stripe, verifica la firma,
// garantisce l'idempotenza (tabella stripe_event) e fa upsert di organization,
// subscription e invoice. Usa la service-role key (bypassa la RLS).
//
// Deploy (sul progetto jqxxhdrlcxtlmejhtzsb):
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...        (da Stripe > Webhooks)
//   supabase secrets set SUPABASE_URL=https://jqxxhdrlcxtlmejhtzsb.supabase.co
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...       (Project Settings > API)
//
// Stripe Dashboard > Developers > Webhooks > Add endpoint:
//   URL:  https://jqxxhdrlcxtlmejhtzsb.supabase.co/functions/v1/stripe-webhook
//   Eventi: customer.subscription.created / .updated / .deleted,
//           invoice.paid / .payment_failed / .finalized, customer.updated
// ════════════════════════════════════════════════════════════════════════════

import Stripe from "npm:stripe@^17";
import { createClient } from "npm:@supabase/supabase-js@^2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Paesi UE (per instradamento e-invoicing: IT → Aruba, resto UE → Stripe)
const EU = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
]);

function tsToIso(sec: number | null | undefined): string | null {
  return sec ? new Date(sec * 1000).toISOString() : null;
}

// ── Risolve (o crea) l'organization a partire dal Customer Stripe ─────────────
async function resolveOrg(customerId: string): Promise<{ orgId: string; country: string } | null> {
  // 1) già mappata?
  const { data: existing } = await supabase
    .from("organization").select("id").eq("stripe_customer_id", customerId).maybeSingle();

  // 2) recupera il customer per owner/nome/paese
  const customer = await stripe.customers.retrieve(customerId);
  if ((customer as Stripe.DeletedCustomer).deleted) return null;
  const c = customer as Stripe.Customer;
  const country = c.address?.country || "IT";

  if (existing) return { orgId: existing.id, country };

  const ownerId = c.metadata?.supabaseUserId;
  if (!ownerId) {
    console.error(`[webhook] customer ${customerId} senza supabaseUserId in metadata — impossibile creare org`);
    return null;
  }

  const { data: org, error } = await supabase
    .from("organization")
    .insert({ name: c.name || c.email || "Workspace", owner_id: ownerId, stripe_customer_id: customerId })
    .select("id").single();
  if (error) throw new Error(`org insert: ${error.message}`);

  await supabase.from("organization_member")
    .insert({ org_id: org.id, user_id: ownerId, role: "owner", status: "active" });

  // profilo fiscale di base (P.IVA dai metadata della create-subscription)
  await supabase.from("billing_profile").upsert({
    org_id: org.id, legal_name: c.name, vat_id: c.metadata?.vatId || null,
    country, is_business: !!c.metadata?.vatId,
  }, { onConflict: "org_id" });

  return { orgId: org.id, country };
}

// ── customer.subscription.* ───────────────────────────────────────────────────
async function handleSubscription(sub: Stripe.Subscription, eventType: string) {
  const resolved = await resolveOrg(sub.customer as string);
  if (!resolved) throw new Error("organization non risolvibile");
  const { orgId } = resolved;

  const item = sub.items.data[0];
  const planId = sub.metadata?.planId ?? null;
  const interval = sub.metadata?.interval === "monthly" ? "monthly" : "annual";
  const seats = Number(sub.metadata?.seats) || item?.quantity || 1;

  const row = {
    org_id: orgId,
    plan_id: planId,
    billing_cycle: interval,
    seats,
    status: sub.status,                         // gli stati Stripe coincidono con sub_status
    stripe_subscription_id: sub.id,
    stripe_price_id: item?.price?.id ?? null,
    current_period_start: tsToIso(sub.current_period_start),
    current_period_end: tsToIso(sub.current_period_end),
    trial_end: tsToIso(sub.trial_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: tsToIso(sub.canceled_at),
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = await supabase
    .from("subscription").upsert(row, { onConflict: "stripe_subscription_id" })
    .select("id").single();
  if (error) throw new Error(`subscription upsert: ${error.message}`);

  await supabase.from("subscription_event").insert({
    subscription_id: saved.id, org_id: orgId,
    event_type: eventType, to_state: row as unknown as Record<string, unknown>,
    actor: "stripe_webhook",
  });
}

// ── invoice.* ─────────────────────────────────────────────────────────────────
function mapInvoiceStatus(s: string | null): string {
  switch (s) {
    case "paid": return "paid";
    case "void": case "uncollectible": return "void";
    case "draft": return "draft";
    default: return "issued";                   // 'open' e altri → emessa
  }
}

async function handleInvoice(inv: Stripe.Invoice) {
  const resolved = await resolveOrg(inv.customer as string);
  if (!resolved) throw new Error("organization non risolvibile per invoice");
  const { orgId, country } = resolved;

  // collega alla subscription locale, se presente
  let subscriptionId: string | null = null;
  if (inv.subscription) {
    const { data: s } = await supabase
      .from("subscription").select("id")
      .eq("stripe_subscription_id", inv.subscription as string).maybeSingle();
    subscriptionId = s?.id ?? null;
  }

  const provider = country === "IT" ? "aruba" : (EU.has(country) ? "stripe" : "stripe");

  const row = {
    org_id: orgId,
    subscription_id: subscriptionId,
    number: inv.number,
    status: mapInvoiceStatus(inv.status),
    currency: (inv.currency || "eur").toUpperCase(),
    subtotal_cents: inv.subtotal ?? 0,
    vat_cents: inv.tax ?? 0,
    total_cents: inv.total ?? 0,
    stripe_invoice_id: inv.id,
    provider,
    // per la UE Stripe è già il documento; per l'IT lo riempirà l'emissione Aruba
    external_doc_ref: provider === "stripe" ? inv.id : null,
    hosted_url: inv.hosted_invoice_url ?? null,
    issued_at: tsToIso(inv.status_transitions?.finalized_at),
    paid_at: tsToIso(inv.status_transitions?.paid_at),
  };

  const { error } = await supabase
    .from("invoice").upsert(row, { onConflict: "stripe_invoice_id" });
  if (error) throw new Error(`invoice upsert: ${error.message}`);

  // TODO emissione IT: se provider='aruba' e status='paid', enqueue verso l'API Aruba
  // (SDI) per generare la fattura elettronica e scrivere external_doc_ref.
}

// ── customer.updated → aggiorna profilo fiscale ───────────────────────────────
async function handleCustomer(c: Stripe.Customer) {
  const { data: org } = await supabase
    .from("organization").select("id").eq("stripe_customer_id", c.id).maybeSingle();
  if (!org) return;
  await supabase.from("billing_profile").upsert({
    org_id: org.id,
    legal_name: c.name,
    vat_id: c.metadata?.vatId || null,
    country: c.address?.country || "IT",
    address_line1: c.address?.line1 ?? null,
    address_line2: c.address?.line2 ?? null,
    city: c.address?.city ?? null,
    state: c.address?.state ?? null,
    postal_code: c.address?.postal_code ?? null,
    is_business: !!c.metadata?.vatId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "org_id" });
}

// ── Entry point ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, signature, WEBHOOK_SECRET, undefined, cryptoProvider,
    );
  } catch (err) {
    return new Response(`Signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  // Idempotenza: l'insert dell'event.id funge da lock. Duplicato → 200, esci.
  const { error: dupErr } = await supabase
    .from("stripe_event").insert({ id: event.id, type: event.type, payload: event as unknown as Record<string, unknown> });
  if (dupErr) {
    if (dupErr.code === "23505") return new Response("ok (duplicate)", { status: 200 });
    console.error("[webhook] stripe_event insert error", dupErr);
    return new Response("db error", { status: 500 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscription(event.data.object as Stripe.Subscription, event.type);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized":
        await handleInvoice(event.data.object as Stripe.Invoice);
        break;
      case "customer.updated":
        await handleCustomer(event.data.object as Stripe.Customer);
        break;
      default:
        break;                                  // evento registrato ma non gestito
    }
  } catch (err) {
    // sblocca l'idempotenza così Stripe può ritentare l'evento
    await supabase.from("stripe_event").delete().eq("id", event.id);
    console.error(`[webhook] handler error (${event.type}):`, err);
    return new Response(`handler error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
