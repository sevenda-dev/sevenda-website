/**
 * Sevenda Stripe Payment Links Configuration
 * Replace placeholder URLs with actual Stripe payment links from your Stripe dashboard
 *
 * To create payment links in Stripe:
 * 1. Go to https://dashboard.stripe.com/products
 * 2. Create products for each plan (analyst, studio, auditor, agency, ssolo, steam, etc.)
 * 3. Generate payment links for each product
 * 4. Add the links below
 */

const STRIPE_PAYMENT_LINKS = {
  // Process Tracks
  analyst: {
    annual: 'https://buy.stripe.com/test/PROCESS_ANALYST_ANNUAL',
    monthly: 'https://buy.stripe.com/test/PROCESS_ANALYST_MONTHLY',
  },
  studio: {
    annual: 'https://buy.stripe.com/test/PROCESS_STUDIO_ANNUAL',
    monthly: 'https://buy.stripe.com/test/PROCESS_STUDIO_MONTHLY',
  },

  // Analytics Tracks
  auditor: {
    annual: 'https://buy.stripe.com/test/ANALYTICS_AUDITOR_ANNUAL',
    monthly: 'https://buy.stripe.com/test/ANALYTICS_AUDITOR_MONTHLY',
  },
  agency: {
    annual: 'https://buy.stripe.com/test/ANALYTICS_AGENCY_ANNUAL',
    monthly: 'https://buy.stripe.com/test/ANALYTICS_AGENCY_MONTHLY',
  },

  // Suite Tracks
  ssolo: {
    annual: 'https://buy.stripe.com/test/SUITE_SOLO_ANNUAL',
    monthly: 'https://buy.stripe.com/test/SUITE_SOLO_MONTHLY',
  },
  steam: {
    annual: 'https://buy.stripe.com/test/SUITE_TEAM_ANNUAL',
    monthly: 'https://buy.stripe.com/test/SUITE_TEAM_MONTHLY',
  },
};

/**
 * Get Stripe payment link for a plan
 * @param {string} planId - Plan ID (e.g., 'analyst', 'studio')
 * @param {string} billing - Billing period ('annual' or 'monthly')
 * @returns {string} Stripe payment link URL
 */
function getStripeLink(planId, billing) {
  const link = STRIPE_PAYMENT_LINKS[planId]?.[billing];
  if (!link) {
    console.warn(`No Stripe link configured for ${planId} (${billing})`);
    return '#';
  }
  return link;
}
