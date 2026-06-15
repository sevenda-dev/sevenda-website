/**
 * Sevenda Stripe Payment Links Configuration
 *
 * To update with real Stripe links:
 * 1. Go to https://dashboard.stripe.com/products
 * 2. Create/use products for each plan
 * 3. Go to Products > [Plan Name] > Pricing > Create Payment Link
 * 4. Copy the link URL and paste below
 *
 * Test Links (Stripe Test Mode):
 * Use these placeholder links for testing. Replace with real links when ready.
 */

const STRIPE_PAYMENT_LINKS = {
  // Process Track Plans
  analyst: {
    // Free trial: 14 days, then €11/month (annual billing) or €14/month (monthly)
    annual: 'https://buy.stripe.com/test/14k7vY3jq9II0aY001',  // Replace with real link
    monthly: 'https://buy.stripe.com/test/8wM28Q3jq9II5wQ015',  // Replace with real link
  },
  studio: {
    // €18/user/month (annual, 2-5 users), €23/user/month (monthly)
    annual: 'https://buy.stripe.com/test/4gw00s3jq9II5wQ009',  // Replace with real link
    monthly: 'https://buy.stripe.com/test/00g28Q3jq9II8gQ01a',  // Replace with real link
  },
  pent: {
    // Enterprise - Contact sales
    annual: 'mailto:hello@sevenda.dev?subject=Enterprise%20Process%20Plan',
    monthly: 'mailto:hello@sevenda.dev?subject=Enterprise%20Process%20Plan',
  },

  // Analytics Track Plans
  auditor: {
    // Free trial: 14 days, then €11/month (annual) or €14/month (monthly)
    annual: 'https://buy.stripe.com/test/9AQ4iY3jq9II8gQ0aa',  // Replace with real link
    monthly: 'https://buy.stripe.com/test/6oE3fY3jq9II0aY000',  // Replace with real link
  },
  agency: {
    // €18/user/month (annual, 2-5 users), €23/user/month (monthly)
    annual: 'https://buy.stripe.com/test/3cs3fY3jq9II5wQ002',  // Replace with real link
    monthly: 'https://buy.stripe.com/test/cN28Q3jq9II0aY007',  // Replace with real link
  },
  aent: {
    // Enterprise - Contact sales
    annual: 'mailto:hello@sevenda.dev?subject=Enterprise%20Analytics%20Plan',
    monthly: 'mailto:hello@sevenda.dev?subject=Enterprise%20Analytics%20Plan',
  },

  // Suite Track Plans
  ssolo: {
    // €17/month (annual) or €22/month (monthly)
    annual: 'https://buy.stripe.com/test/8wM3fY3jq9II0aY004',  // Replace with real link
    monthly: 'https://buy.stripe.com/test/5kA7uQ3jq9II8gQ006',  // Replace with real link
  },
  steam: {
    // €25/user/month (annual, 2-5 users), €32/user/month (monthly)
    annual: 'https://buy.stripe.com/test/28q3fY3jq9II5wQ008',  // Replace with real link
    monthly: 'https://buy.stripe.com/test/bIY00s3jq9II8gQ003',  // Replace with real link
  },
  sent: {
    // Enterprise - Contact sales
    annual: 'mailto:hello@sevenda.dev?subject=Enterprise%20Suite%20Plan',
    monthly: 'mailto:hello@sevenda.dev?subject=Enterprise%20Suite%20Plan',
  },
};

/**
 * Get Stripe payment link for a plan
 * @param {string} planId - Plan ID (e.g., 'analyst', 'studio')
 * @param {string} billing - Billing period ('annual' or 'monthly')
 * @returns {string} Stripe payment link URL or mailto link
 */
function getStripeLink(planId, billing) {
  const link = STRIPE_PAYMENT_LINKS[planId]?.[billing];

  if (!link) {
    console.warn(`⚠️ No Stripe link configured for ${planId} (${billing})`);
    return null;
  }

  // If it's a mailto link (enterprise), return it directly
  if (link.startsWith('mailto:')) {
    return link;
  }

  // If it's a test link placeholder, show warning in console
  if (link.includes('test/')) {
    console.info(`ℹ️ Using placeholder Stripe link for ${planId} (${billing}). Replace with real payment link from Stripe dashboard.`);
  }

  return link;
}

/**
 * Validate if a Stripe link is configured
 * @param {string} planId - Plan ID
 * @param {string} billing - Billing period
 * @returns {boolean} True if link exists and is not a placeholder
 */
function isStripeLinksConfigured(planId, billing) {
  const link = STRIPE_PAYMENT_LINKS[planId]?.[billing];
  return link && !link.includes('/test/') && !link.startsWith('mailto:');
}

/* ════════════════════════════════════════════════════════════════
   STRIPE ELEMENTS — checkout custom (checkout.html)
   ════════════════════════════════════════════════════════════════
   Setup:
   1. Stripe Dashboard > Developers > API keys → copia la "Publishable key"
      (pk_live_… o pk_test_…) e incollala in publishableKey qui sotto.
      ⚠️ NON inserire MAI la Secret key (sk_…) in questo file: vive solo
      nella Supabase Edge Function come variabile d'ambiente.
   2. Deploya la Edge Function `create-subscription`
      (supabase/functions/create-subscription/index.ts) con:
        supabase functions deploy create-subscription
        supabase secrets set STRIPE_SECRET_KEY=sk_live_…
   3. Imposta sotto `edgeFunctionBase` con l'URL del tuo progetto Supabase
      (Project Settings > API > Project URL) + /functions/v1
   4. Crea i Price su Stripe (uno per piano × intervallo) e mappa gli ID
      nella PRICE_MAP della Edge Function (lato server, non qui).
   ════════════════════════════════════════════════════════════════ */
window.STRIPE_CONFIG = {
  // Chiave pubblica Stripe (sicura da esporre lato client)
  publishableKey: 'pk_test_REPLACE_WITH_YOUR_PUBLISHABLE_KEY',
  // Base URL delle Supabase Edge Functions del tuo progetto
  // es. 'https://hxhtqcnxnuvymmgegcty.supabase.co/functions/v1'
  edgeFunctionBase: 'https://hxhtqcnxnuvymmgegcty.supabase.co/functions/v1',
  // Valuta usata per il display
  currency: 'EUR',
  currencySymbol: '€',
};

/* ── Catalogo piani (display + pricing) ──────────────────────────
   I prezzi sono per-utente/mese (IVA esclusa). Annual = 12 mesi
   fatturati in un'unica soluzione, già scontato del ~25%.
   I Price ID Stripe NON sono qui: sono mappati lato server nella
   Edge Function per evitare manomissioni dal client. */
window.PLAN_CATALOG = {
  analyst: { name: 'Solo',         track: 'process',   accent: 'blue',   tagline: 'For the independent developer', prices: { annual: 11, monthly: 14 }, seats: { min: 1, max: 1, fixed: true } },
  studio:  { name: 'Team',         track: 'process',   accent: 'green',  tagline: 'For agile teams and consultants', prices: { annual: 18, monthly: 23 }, seats: { min: 2, max: 5 } },
  auditor: { name: 'Auditor',      track: 'analytics', accent: 'blue',   tagline: 'For the GTM / GA4 specialist', prices: { annual: 11, monthly: 14 }, seats: { min: 1, max: 1, fixed: true } },
  agency:  { name: 'Agency',       track: 'analytics', accent: 'green',  tagline: 'For analytics teams and agencies', prices: { annual: 18, monthly: 23 }, seats: { min: 2, max: 5 } },
  ssolo:   { name: 'Suite — Solo', track: 'suite',     accent: 'purple', tagline: 'Process + Analytics, one seat', prices: { annual: 17, monthly: 22 }, seats: { min: 1, max: 1, fixed: true } },
  steam:   { name: 'Suite — Team', track: 'suite',     accent: 'purple', tagline: 'Process + Analytics for teams', prices: { annual: 25, monthly: 32 }, seats: { min: 2, max: 5 } },
};

/* Helper: true se la chiave pubblica e la Edge Function sono configurate */
function isStripeElementsConfigured() {
  const c = window.STRIPE_CONFIG;
  return !!c
    && c.publishableKey && !c.publishableKey.includes('REPLACE_WITH')
    && c.edgeFunctionBase && !c.edgeFunctionBase.includes('REPLACE_WITH');
}
