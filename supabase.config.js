/**
 * Sevenda — Supabase & hCaptcha Configuration
 *
 * Setup steps:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Copy Project URL and anon key from Settings > API
 * 3. Enable Google OAuth in Authentication > Providers > Google
 * 4. Enable GitHub OAuth in Authentication > Providers > GitHub
 * 5. Abilita hCaptcha in Authentication > Attack Protection > Bot and Abuse Protection
 *    - Toggle "Enable Captcha protection" ON, provider: hCaptcha
 *    - Vai su https://hcaptcha.com, crea account, aggiungi il sito sevenda.dev
 *    - Copia il Secret Key → incollalo nel campo "Captcha secret" su Supabase > Save
 *    - Copia il Site Key → incollalo in captchaSiteKey qui sotto
 * 6. Replace the placeholder values below before deploying
 */
window.SUPABASE_CONFIG = {
  url:            'https://jqxxhdrlcxtlmejhtzsb.supabase.co',
  anonKey:        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeHhoZHJsY3h0bG1lamh0enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4ODMyNzUsImV4cCI6MjA5NjQ1OTI3NX0.vM-B0zoz_sTg3IVXpHWrkjl2tZrobNjtKYDmhnWlZoI',
  captchaSiteKey: 'c84e21d4-00f0-4cec-9394-68163f68e882',
};
