/**
 * Sevenda Stripe Configuration  (aggiornato con Price ID reali — Live mode)
 * ════════════════════════════════════════════════════════════════════════════
 * Price ID Stripe reali (Live). Aggiornato il 25/06/2026.
 * Piani team (Studio/Agency/Suite Team): Volume tiered su Stripe.
 */

const STRIPE_PAYMENT_LINKS = {
  // ── Process ──────────────────────────────────────────────────────────────
  analyst: {
    annual:  'https://buy.stripe.com/REPLACE_analyst_annual',
    monthly: 'https://buy.stripe.com/REPLACE_analyst_monthly',
  },
  studio: {
    annual:  'https://buy.stripe.com/REPLACE_studio_annual',
    monthly: 'https://buy.stripe.com/REPLACE_studio_monthly',
  },
  pent: {
    annual:  'mailto:hello@sevenda.dev?subject=Enterprise%20Process%20Plan',
    monthly: 'mailto:hello@sevenda.dev?subject=Enterprise%20Process%20Plan',
  },
  // ── Analytics ─────────────────────────────────────────────────────────────
  auditor: {
    annual:  'https://buy.stripe.com/REPLACE_auditor_annual',
    monthly: 'https://buy.stripe.com/REPLACE_auditor_monthly',
  },
  agency: {
    annual:  'https://buy.stripe.com/REPLACE_agency_annual',
    monthly: 'https://buy.stripe.com/REPLACE_agency_monthly',
  },
  aent: {
    annual:  'mailto:hello@sevenda.dev?subject=Enterprise%20Analytics%20Plan',
    monthly: 'mailto:hello@sevenda.dev?subject=Enterprise%20Analytics%20Plan',
  },
  // ── Suite ─────────────────────────────────────────────────────────────────
  ssolo: {
    annual:  'https://buy.stripe.com/REPLACE_ssolo_annual',
    monthly: 'https://buy.stripe.com/REPLACE_ssolo_monthly',
  },
  steam: {
    annual:  'https://buy.stripe.com/REPLACE_steam_annual',
    monthly: 'https://buy.stripe.com/REPLACE_steam_monthly',
  },
  sent: {
    annual:  'mailto:hello@sevenda.dev?subject=Enterprise%20Suite%20Plan',
    monthly: 'mailto:hello@sevenda.dev?subject=Enterprise%20Suite%20Plan',
  },
};

function getStripeLink(planId, billing) {
  const link = STRIPE_PAYMENT_LINKS[planId]?.[billing];
  if (!link) { console.warn(`⚠️ No Stripe link for ${planId} (${billing})`); return null; }
  return link;
}

/* ── Stripe Elements (checkout.html) ────────────────────────────────────────
   PATCH v2: edgeFunctionBase aggiornato a jqxxhdrlcxtlmejhtzsb (progetto unico).
   publishableKey: incolla la tua Publishable key Live (pk_live_…).              */
window.STRIPE_CONFIG = {
  publishableKey:   'pk_live_51TcSar2QI59o2iVODhL5S9XDVUsvkBQVpvCnDVNupm82mBLxq8P4m5vxjaow7STe8DXnywnz9YTbJL3Ssjpy4H9V00UkmkO5cC',
  edgeFunctionBase: 'https://jqxxhdrlcxtlmejhtzsb.supabase.co/functions/v1',
  currency:         'EUR',
  currencySymbol:   '€',
};

/* ── Price ID Stripe (Live) ──────────────────────────────────────────────────
   Usati dalla Edge Function create-subscription (lato server).
   Qui servono solo per il display/calc lato client (checkout.html).
   La source of truth è la tabella plan_price su Supabase.                      */
window.STRIPE_PRICE_IDS = {
  analyst: {
    monthly: 'price_1TmGFb2QI59o2iVOF1VoBGVZ',
    annual:  'price_1TmGH72QI59o2iVOfOsKUzn4',
  },
  auditor: {
    monthly: 'price_1TmGHc2QI59o2iVOmgkYEN4g',
    annual:  'price_1TmGIP2QI59o2iVOFds5uQck',
  },
  ssolo: {
    monthly: 'price_1TmGM82QI59o2iVO4nC3AmyE',
    annual:  'price_1TmGMZ2QI59o2iVOIkTtACyV',
  },
  studio: {
    monthly: 'price_1TmGeG2QI59o2iVOe0w0G0RC',   // Volume tiered (1–5: €23, 6+: €18)
    annual:  'price_1TmGkt2QI59o2iVOzyOsFZAE',   // Volume tiered (1–5: €18, 6+: €14)
  },
  agency: {
    monthly: 'price_1TmGtK2QI59o2iVOZY02IB68',   // Volume tiered (1–5: €23, 6+: €18)
    annual:  'price_1TmGtK2QI59o2iVOclqDstBB',   // Volume tiered (1–5: €18, 6+: €14)
  },
  steam: {
    monthly: 'price_1TmGvl2QI59o2iVOLyYtaAgt',   // Volume tiered (1–5: €32, 6+: €27)
    annual:  'price_1TmGxN2QI59o2iVORsnRNNNz',   // Volume tiered (1–5: €25, 6+: €21)
  },
};

/* ── Catalogo piani (display) ────────────────────────────────────────────────
   I prezzi sono per-utente/mese (IVA esclusa).
   Per i piani team il prezzo varia per fascia: vedere STRIPE_PRICE_IDS.        */
window.PLAN_CATALOG = {
  analyst: { name: 'Analyst',    family: 'process',   tagline: 'For the independent BA',          prices: { annual: 11,  monthly: 14 }, seats: { min: 1, max: 1,  fixed: true } },
  studio:  { name: 'Studio',     family: 'process',   tagline: 'For consulting teams',            prices: { annual: 18,  monthly: 23 }, seats: { min: 2, max: 20 }, tiers: { '2_5': { annual: 18, monthly: 23 }, '6_20': { annual: 14, monthly: 18 } } },
  auditor: { name: 'Auditor',    family: 'analytics', tagline: 'For the GTM / GA4 specialist',    prices: { annual: 11,  monthly: 14 }, seats: { min: 1, max: 1,  fixed: true } },
  agency:  { name: 'Agency',     family: 'analytics', tagline: 'For multi-client agencies',       prices: { annual: 18,  monthly: 23 }, seats: { min: 2, max: 20 }, tiers: { '2_5': { annual: 18, monthly: 23 }, '6_20': { annual: 14, monthly: 18 } } },
  ssolo:   { name: 'Suite Solo', family: 'suite',     tagline: 'Process + Analytics for consultants', prices: { annual: 17, monthly: 22 }, seats: { min: 1, max: 1, fixed: true } },
  steam:   { name: 'Suite Team', family: 'suite',     tagline: 'Full suite for data-driven teams', prices: { annual: 25, monthly: 32 }, seats: { min: 2, max: 20 }, tiers: { '2_5': { annual: 25, monthly: 32 }, '6_20': { annual: 21, monthly: 27 } } },
};

function isStripeConfigured() {
  const c = window.STRIPE_CONFIG;
  return !!c && c.publishableKey && !c.publishableKey.includes('REPLACE');
}
