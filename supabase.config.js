/**
 * Sevenda — Configurazione di ambiente (Supabase · hCaptcha · Stripe)
 * ════════════════════════════════════════════════════════════════════════════
 * FONTE UNICA dell'ambiente per tutto il sito. Nessun altro file deve contenere
 * url di progetto, chiavi o publishable key: stripe.config.js e join.html
 * leggono da qui (window.SUPABASE_CONFIG).
 *
 * L'ambiente è risolto dall'HOSTNAME, non da una modifica a questo file:
 *   sevenda.dev (e www.)  → prod
 *   qualsiasi altro host  → staging   (preview *.vercel.app, localhost, …)
 * Così una preview deploy non può parlare con il database di produzione né
 * addebitare una carta vera con Stripe in live mode: è il comportamento di
 * default, non una cosa da ricordarsi prima di ogni push.
 *
 * Tutti i valori qui sono pubblici by design (anon key, hCaptcha site key,
 * pk_): la sicurezza sta nelle RLS policy di Supabase, non nella segretezza
 * di queste stringhe.
 *
 * Setup di un ambiente:
 * 1. Supabase → Settings > API: Project URL + anon key
 * 2. Authentication > Providers: abilita Google e GitHub
 * 3. Authentication > Attack Protection: hCaptcha ON + Secret Key da
 *    hcaptcha.com; il Site Key corrispondente va in captchaSiteKey
 * 4. Stripe → Developers > API keys: publishable key (pk_live_ / pk_test_)
 * 5. Authentication > URL Configuration: aggiungi gli origin alla redirect
 *    allowlist, altrimenti magic link e OAuth non tornano indietro
 */
(function () {
  'use strict';

  var ENVS = {
    prod: {
      url:            'https://jqxxhdrlcxtlmejhtzsb.supabase.co',
      anonKey:        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeHhoZHJsY3h0bG1lamh0enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4ODMyNzUsImV4cCI6MjA5NjQ1OTI3NX0.vM-B0zoz_sTg3IVXpHWrkjl2tZrobNjtKYDmhnWlZoI',
      captchaSiteKey: 'c84e21d4-00f0-4cec-9394-68163f68e882',
      stripePk:       'pk_live_51TcSar2QI59o2iVODhL5S9XDVUsvkBQVpvCnDVNupm82mBLxq8P4m5vxjaow7STe8DXnywnz9YTbJL3Ssjpy4H9V00UkmkO5cC',
    },
    staging: {
      // NB: endpoint API del progetto (<ref>.supabase.co), non l'URL della
      // dashboard supabase.com/dashboard/project/<ref> — quello non è un'API.
      url:            'https://hxhtqcnxnuvymmgegcty.supabase.co',
      anonKey:        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aHRxY254bnV2eW1tZ2VnY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTg1OTYsImV4cCI6MjA5Njc5NDU5Nn0.FDoZKBZcniwf81ZjBKqO_afj3fnIAKoNNvABo0fyHWc',
      // Test key ufficiale hCaptcha (passa sempre). Richiede che su Supabase
      // staging il Captcha secret sia quello di test: 0x0000…0000.
      captchaSiteKey: '10000000-ffff-ffff-ffff-000000000001',
      stripePk:       'pk_test_51TcSar2QI59o2iVOXK29Z0zdXkig3dfHM722uVKDn57qAR19GOs9lNE5oNLKBuTW1CyEt1N6ZTIL3cl4dTqihz7600EB0XT3JK',
    },
  };

  /* Host di produzione elencati uno per uno, non dedotti da un match sul dominio.
     Con /(^|\.)sevenda\.dev$/ qualunque sottodominio sarebbe stato prod, incluso
     staging.sevenda.dev: Supabase di produzione e Stripe in live mode su quello
     che tutti chiamerebbero "lo staging". Aggiungere un host qui deve essere una
     decisione deliberata, non un effetto collaterale di un record DNS. */
  var PROD_HOSTS = ['sevenda.dev', 'www.sevenda.dev'];
  var IS_PROD = PROD_HOSTS.indexOf(String(location.hostname).toLowerCase()) !== -1;

  window.SUPABASE_CONFIG = IS_PROD ? ENVS.prod : ENVS.staging;
  window.SUPABASE_ENV    = IS_PROD ? 'prod' : 'staging';

  /* Placeholder non sostituiti → il sito degrada in "non configurato" invece di
     ricadere su produzione: auth.js (IS_DEV) blocca il login, isStripeConfigured()
     spegne il checkout, join.html logga l'errore. Fallire chiuso è il punto. */
  var missing = Object.keys(window.SUPABASE_CONFIG).filter(function (k) {
    return /YOUR_/.test(window.SUPABASE_CONFIG[k]);
  });
  if (missing.length) {
    console.warn('[Sevenda] Ambiente "' + window.SUPABASE_ENV + '" non configurato (' +
      missing.join(', ') + '): auth, checkout ed Edge Function restano disattivati.');
  }
})();
