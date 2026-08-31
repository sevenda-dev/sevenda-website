/**
 * Sevenda Stripe Configuration — display lato client
 * ════════════════════════════════════════════════════════════════════════════
 * Questo file non decide nulla di ciò che viene addebitato: serve solo al
 * display e al calcolo lato client (checkout.html). I price ID con cui la
 * subscription viene davvero creata stanno nel secret STRIPE_PRICES, letto da
 * create-subscription via priceMap(); la source of truth del listino è la
 * tabella plan_price su Supabase. Tenere qui dei price ID li faceva divergere
 * in silenzio da quella fonte, quindi non ce ne sono più.
 * Chiavi e URL NON vivono qui: vedi supabase.config.js (fonte unica ambiente).
 * Piani team (Studio/Agency/Suite Team): Volume tiered su Stripe.
 * Listino allineato al catalogo Stripe live il 31/08/2026.
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
   publishableKey ed edgeFunctionBase sono DERIVATI da window.SUPABASE_CONFIG
   (supabase.config.js), che è l'unico punto in cui si dichiara l'ambiente.
   Tenendo url, anon key e pk_ nella stessa fonte diventa strutturalmente
   impossibile ritrovarsi con Supabase su staging e Stripe in live mode.
   Sono getter e non valori fissi perché stripe.config.js viene caricato PRIMA
   di supabase.config.js (checkout.html, pricing.html): vanno letti al primo
   uso, non al load. Config assente o placeholder → isStripeConfigured() false
   e checkout.html mostra il pannello "non configurato".                        */
window.STRIPE_CONFIG = {
  get publishableKey() {
    return (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.stripePk) || null;
  },
  get edgeFunctionBase() {
    const url = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '';
    return url ? url.replace(/\/+$/, '') + '/functions/v1' : null;
  },
  currency:         'EUR',
  currencySymbol:   '€',
};

/* ── Catalogo piani (display) ────────────────────────────────────────────────
   I prezzi sono per-utente/mese (IVA esclusa) e devono coincidere con quelli
   di pricing.html e con le fasce Volume su Stripe: è il numero che l'utente
   legge nel riepilogo del checkout prima di pagare, quindi una divergenza qui
   è un prezzo promesso e non mantenuto.
   Per i piani team prices[] è la fascia d'ingresso 2–5; tiers riporta entrambe
   le fasce. checkout.html usa solo plan.prices[interval] (unitPrice()), quindi
   il riepilogo non sconta ancora la fascia 6–20: l'importo effettivo lo calcola
   Stripe sul price tiered.                                                     */
window.PLAN_CATALOG = {
  analyst: { name: 'Analyst',    family: 'process',   tagline: 'For the independent BA',          prices: { annual: 8,   monthly: 10 }, seats: { min: 1, max: 1,  fixed: true } },
  studio:  { name: 'Studio',     family: 'process',   tagline: 'For consulting teams',            prices: { annual: 13,  monthly: 17 }, seats: { min: 2, max: 20 }, tiers: { '2_5': { annual: 13, monthly: 17 }, '6_20': { annual: 10, monthly: 13 } } },
  auditor: { name: 'Auditor',    family: 'analytics', tagline: 'For the GTM / GA4 specialist',    prices: { annual: 8,   monthly: 10 }, seats: { min: 1, max: 1,  fixed: true } },
  agency:  { name: 'Agency',     family: 'analytics', tagline: 'For multi-client agencies',       prices: { annual: 13,  monthly: 17 }, seats: { min: 2, max: 20 }, tiers: { '2_5': { annual: 13, monthly: 17 }, '6_20': { annual: 10, monthly: 13 } } },
  ssolo:   { name: 'Suite Solo', family: 'suite',     tagline: 'Process + Analytics for consultants', prices: { annual: 12, monthly: 16 }, seats: { min: 1, max: 1, fixed: true } },
  steam:   { name: 'Suite Team', family: 'suite',     tagline: 'Full suite for data-driven teams', prices: { annual: 18,  monthly: 23 }, seats: { min: 2, max: 20 }, tiers: { '2_5': { annual: 18, monthly: 23 }, '6_20': { annual: 15, monthly: 19 } } },
};

function isStripeConfigured() {
  const c = window.STRIPE_CONFIG;
  // Entrambi derivano da supabase.config.js: senza uno dei due il checkout non
  // ha chiave o endpoint validi e va mostrato il pannello "non configurato".
  // YOUR_ intercetta i placeholder di un ambiente non ancora popolato.
  if (!c || !c.publishableKey || !c.edgeFunctionBase) return false;
  return !/REPLACE|YOUR_/.test(c.publishableKey);
}
