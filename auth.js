/**
 * Sevenda — Auth module
 * Supabase Auth · Google/GitHub OAuth · hCaptcha invisible
 *
 * Public API: window.SevendaAuth
 *   .openModal(tab?, afterAuthCallback?)   — apre il modal (tab: 'login'|'register')
 *   .closeModal()                          — chiude il modal
 *   .isLoggedIn()                          — true se sessione attiva
 *   .getSession()                          — sessione Supabase corrente (cache)
 *   .getUser()                             — utente validato lato server (async)
 *   .requireAuth(callback)                 — esegue callback solo se loggato,
 *                                            altrimenti apre modal e riprende dopo login
 */
(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  const CFG   = window.SUPABASE_CONFIG || {};
  const IS_DEV = !CFG.url || CFG.url.startsWith('https://YOUR_');

  // ── STATE ───────────────────────────────────────────────────────────────────
  let _sb      = null;  // Supabase client
  let _session = null;  // sessione corrente
  let _pending = null;  // callback da eseguire dopo autenticazione riuscita
  let _tab     = 'login'; // tab attiva: 'login' | 'register' | 'reset'

  // ── SUPABASE LOADER ─────────────────────────────────────────────────────────
  function _loadSupabase() {
    return new Promise(resolve => {
      if (window.supabase) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.onload = resolve;
      s.onerror = () => { console.warn('[SevendaAuth] Supabase SDK non caricato'); resolve(); };
      document.head.appendChild(s);
    });
  }

  // ── HCAPTCHA INVISIBLE ───────────────────────────────────────────────────────
  let _hcaptchaWidgetId = null;

  function _loadHcaptcha() {
    if (!CFG.captchaSiteKey || CFG.captchaSiteKey.startsWith('YOUR_')) return;
    window._onHcaptchaLoad = () => {
      const el = document.getElementById('sa-hcaptcha-el');
      if (!el || !window.hcaptcha) return;
      _hcaptchaWidgetId = window.hcaptcha.render(el, {
        sitekey: CFG.captchaSiteKey,
        size: 'invisible',
      });
    };
    const s = document.createElement('script');
    s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit&onload=_onHcaptchaLoad';
    s.async = true;
    document.head.appendChild(s);
  }

  function _getCaptchaToken() {
    if (_hcaptchaWidgetId === null || !window.hcaptcha) return Promise.resolve(null);
    return window.hcaptcha.execute(_hcaptchaWidgetId, { async: true })
      .then(({ response }) => { window.hcaptcha.reset(_hcaptchaWidgetId); return response; })
      .catch(() => null);
  }

  // Il captcha è atteso dal server (Supabase) quando è configurata una site key valida.
  // Serve a distinguere "captcha attivo ma token non pronto" (→ blocca) da
  // "captcha disattivato" (→ procedi senza token).
  function _captchaRequired() {
    return !!CFG.captchaSiteKey && !CFG.captchaSiteKey.startsWith('YOUR_');
  }

  // ── CSS INJECTION ────────────────────────────────────────────────────────────
  function _injectStyles() {
    const style = document.createElement('style');
    style.id = 'sevenda-auth-css';
    style.textContent = `
      /* ── AUTH MODAL OVERLAY ───────────────────────────────────────────────── */
      .sa-overlay {
        display: none; position: fixed; inset: 0; z-index: 9000;
        background: rgba(0,0,0,.72);
        backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        align-items: center; justify-content: center; padding: 16px;
      }
      .sa-overlay.open { display: flex; }

      .sa-card {
        background: #111; border: 1px solid rgba(255,255,255,.09);
        border-radius: 14px; width: 100%; max-width: 420px;
        padding: 32px 32px 26px; position: relative;
        box-shadow: 0 24px 80px rgba(0,0,0,.65);
        font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #e8e8e6;
        animation: sa-in .18s ease;
      }
      @keyframes sa-in { from { opacity:0; transform:translateY(10px) scale(.98); } }

      .sa-close {
        position: absolute; top: 14px; right: 14px;
        width: 28px; height: 28px; border-radius: 6px;
        background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
        color: #8a8a8a; cursor: pointer; font-size: 17px; line-height: 1;
        display: flex; align-items: center; justify-content: center;
        transition: background .15s, color .15s; padding: 0; font-family: inherit;
      }
      .sa-close:hover { background: rgba(255,255,255,.12); color: #e8e8e6; }

      .sa-logo {
        display: flex; align-items: center; gap: 8px;
        font-weight: 600; font-size: 15px; letter-spacing: -.02em;
        margin-bottom: 22px;
      }
      .sa-logo svg { flex-shrink: 0; }

      /* Tabs */
      .sa-tabs {
        display: flex; gap: 0;
        background: #1a1a1a; border: 1px solid rgba(255,255,255,.07);
        border-radius: 8px; padding: 3px; margin-bottom: 22px;
      }
      .sa-tab {
        flex: 1; padding: 7px 12px; border-radius: 5px;
        font-size: 13px; font-weight: 500; color: #6e6e6a;
        cursor: pointer; transition: all .15s; text-align: center;
        background: none; border: none; font-family: inherit;
      }
      .sa-tab.on {
        background: #2a2a2a; color: #e8e8e6;
        border: 1px solid rgba(255,255,255,.1);
      }

      /* Social buttons */
      .sa-social-btn {
        width: 100%; padding: 9px 16px; margin-bottom: 9px;
        background: #191919; border: 1px solid rgba(255,255,255,.1);
        border-radius: 8px; color: #e8e8e6; font-size: 13.5px; font-weight: 500;
        cursor: pointer; transition: background .15s, border-color .15s;
        display: flex; align-items: center; justify-content: center; gap: 10px;
        font-family: inherit;
      }
      .sa-social-btn:hover { background: #222; border-color: rgba(255,255,255,.2); }
      .sa-social-btn:disabled { opacity: .45; cursor: not-allowed; }

      /* Divider */
      .sa-divider {
        display: flex; align-items: center; gap: 12px;
        margin: 14px 0; color: #4a4a4a; font-size: 12px;
      }
      .sa-divider::before, .sa-divider::after {
        content: ''; flex: 1; height: 1px;
        background: rgba(255,255,255,.07);
      }

      /* Form fields */
      .sa-field { margin-bottom: 13px; }
      .sa-field label {
        display: block; font-size: 12px; font-weight: 500;
        color: #8a8a8a; margin-bottom: 5px; letter-spacing: .01em;
      }
      .sa-input {
        width: 100%; padding: 9px 12px; border-radius: 7px;
        background: #1a1a1a; border: 1px solid rgba(255,255,255,.1);
        color: #e8e8e6; font-size: 14px; font-family: inherit;
        transition: border-color .15s, box-shadow .15s;
        outline: none; -webkit-appearance: none;
      }
      .sa-input:focus {
        border-color: rgba(255,255,255,.28);
        box-shadow: 0 0 0 3px rgba(255,255,255,.04);
      }
      .sa-input::placeholder { color: #3e3e3e; }
      .sa-input.error { border-color: #dc5858; }
      .sa-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

      /* Buttons */
      .sa-btn {
        width: 100%; padding: 11px; border-radius: 8px;
        font-size: 14px; font-weight: 500; cursor: pointer;
        transition: all .15s; font-family: inherit;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        margin-top: 4px;
      }
      .sa-btn-primary {
        background: #fff; color: #0d0d0d; border: 1px solid #fff;
      }
      .sa-btn-primary:hover { background: #e0e0de; }
      .sa-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
      .sa-btn-ghost {
        background: transparent; color: #8a8a8a;
        border: 1px solid rgba(255,255,255,.1);
      }
      .sa-btn-ghost:hover { color: #e8e8e6; border-color: rgba(255,255,255,.22); }

      /* Messages */
      .sa-error {
        font-size: 12.5px; color: #e07070;
        padding: 8px 12px; border-radius: 6px;
        background: rgba(220,88,88,.08); border: 1px solid rgba(220,88,88,.2);
        margin-bottom: 8px; display: none; line-height: 1.45;
      }
      .sa-error.show { display: block; }
      .sa-success {
        font-size: 12.5px; color: #E8733A;
        padding: 9px 12px; border-radius: 6px;
        background: rgba(232,115,58,.08); border: 1px solid rgba(232,115,58,.2);
        margin-bottom: 8px; display: none; line-height: 1.45;
      }
      .sa-success.show { display: block; }

      /* Spinner */
      .sa-spinner {
        width: 14px; height: 14px; border-radius: 50%;
        border: 2px solid rgba(0,0,0,.2); border-top-color: #0d0d0d;
        animation: sa-spin .6s linear infinite; display: inline-block;
        flex-shrink: 0;
      }
      @keyframes sa-spin { to { transform: rotate(360deg); } }

      /* Footer links */
      .sa-footer {
        text-align: center; margin-top: 18px;
        font-size: 12.5px; color: #6e6e6a;
      }
      .sa-link {
        color: #c0c0bc; cursor: pointer; background: none; border: none;
        font-size: inherit; font-family: inherit; padding: 0;
        text-decoration: underline; text-underline-offset: 2px;
      }
      .sa-link:hover { color: #fff; }
      .sa-recaptcha-note {
        font-size: 11px; color: #4a4a4a;
        text-align: center; margin-top: 12px; line-height: 1.5;
      }
      .sa-recaptcha-note a { color: #5a5a5a; }

      .sa-reset-intro {
        font-size: 13.5px; color: #8a8a8a;
        margin-bottom: 18px; line-height: 1.55;
      }
      .sa-forgot-row {
        text-align: right; margin-top: 8px;
      }

      /* ── NAV AUTH AREA ───────────────────────────────────────────────────── */
      #nav-auth-area {
        display: flex; align-items: center; gap: 8px;
      }
      .nav-auth-btn {
        font-family: 'Geist', -apple-system, sans-serif;
        font-size: 13px; font-weight: 500;
        padding: 7px 15px; border-radius: 6px;
        cursor: pointer; transition: all .15s; white-space: nowrap;
        display: inline-flex; align-items: center; gap: 6px;
        line-height: 1; letter-spacing: -.01em;
      }
      .nav-auth-ghost {
        background: transparent; color: #6e6e6a;
        border: 1px solid rgba(255,255,255,.13);
      }
      .nav-auth-ghost:hover { color: #e8e8e6; border-color: rgba(255,255,255,.28); }
      .nav-auth-solid {
        background: #fff; color: #0d0d0d; border: 1px solid #fff;
      }
      .nav-auth-solid:hover { background: #e0e0de; }
      .nav-auth-user {
        display: flex; align-items: center; gap: 8px;
      }
      .nav-auth-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        background: rgba(232,115,58,.15); border: 1px solid rgba(232,115,58,.35);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 600; color: #E8733A;
        flex-shrink: 0; font-family: 'Geist', sans-serif;
      }
      .nav-auth-email {
        font-size: 12.5px; color: #8a8a8a;
        max-width: 150px; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap;
      }
      .nav-auth-logout {
        font-size: 12px; color: #6e6e6a; cursor: pointer;
        background: none; border: 1px solid rgba(255,255,255,.1);
        border-radius: 5px; padding: 5px 10px; font-family: inherit;
        transition: color .15s, border-color .15s;
      }
      .nav-auth-logout:hover { color: #e8e8e6; border-color: rgba(255,255,255,.22); }

      /* pricing.html nav uses slightly different class names */
      .nav-right #nav-auth-area { gap: 8px; }

      @media (max-width: 640px) {
        .sa-card { padding: 24px 18px 20px; }
        .sa-row  { grid-template-columns: 1fr; gap: 0; }
        .nav-auth-email { display: none; }
        .nav-auth-btn   { padding: 6px 11px; font-size: 12px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── MODAL HTML ───────────────────────────────────────────────────────────────
  function _injectModal() {
    const el = document.createElement('div');
    el.id = 'sa-modal';
    el.className = 'sa-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'sa-modal-title');
    el.innerHTML = `
      <div class="sa-card">
        <button class="sa-close" id="sa-close" aria-label="Chiudi">&times;</button>

        <!-- Logo -->
        <div class="sa-logo" id="sa-modal-title">
          <img src="/logo.svg" width="26" height="26" alt="Sevenda logo" style="object-fit:contain;flex-shrink:0;">
          sevenda
        </div>

        <!-- Tab switcher -->
        <div class="sa-tabs" id="sa-tabs">
          <button class="sa-tab on" id="sa-tab-login"    onclick="SevendaAuth._tab('login')">Sign in</button>
          <button class="sa-tab"    id="sa-tab-register" onclick="SevendaAuth._tab('register')">Create account</button>
        </div>

        <!-- Social OAuth -->
        <div id="sa-social">
          <button class="sa-social-btn" id="sa-btn-google" onclick="SevendaAuth._social('google')">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <button class="sa-social-btn" id="sa-btn-github" onclick="SevendaAuth._social('github')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#e8e8e6" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        <div class="sa-divider" id="sa-divider">or</div>

        <!-- LOGIN FORM -->
        <form id="sa-form-login" novalidate>
          <div class="sa-field">
            <label for="sa-login-email">Email</label>
            <input class="sa-input" type="email" id="sa-login-email"
              placeholder="you@example.com" autocomplete="email" required>
          </div>
          <div class="sa-field">
            <label for="sa-login-pass">Password</label>
            <input class="sa-input" type="password" id="sa-login-pass"
              placeholder="••••••••" autocomplete="current-password" required>
          </div>
          <div class="sa-error"   id="sa-login-err"></div>
          <div class="sa-success" id="sa-login-ok"></div>
          <button type="submit" class="sa-btn sa-btn-primary" id="sa-login-submit">Sign in →</button>
          <div class="sa-forgot-row">
            <button type="button" class="sa-link" onclick="SevendaAuth._tab('reset')">Forgot password?</button>
          </div>
        </form>

        <!-- REGISTER FORM -->
        <form id="sa-form-register" style="display:none" novalidate>
          <div class="sa-row">
            <div class="sa-field">
              <label for="sa-reg-first">First name</label>
              <input class="sa-input" type="text" id="sa-reg-first"
                placeholder="Jane" autocomplete="given-name" required>
            </div>
            <div class="sa-field">
              <label for="sa-reg-last">Last name</label>
              <input class="sa-input" type="text" id="sa-reg-last"
                placeholder="Doe" autocomplete="family-name" required>
            </div>
          </div>
          <div class="sa-field">
            <label for="sa-reg-email">Email</label>
            <input class="sa-input" type="email" id="sa-reg-email"
              placeholder="you@example.com" autocomplete="email" required>
          </div>
          <div class="sa-field">
            <label for="sa-reg-phone">
              Phone
              <span style="color:#4a4a4a;font-weight:400">(optional)</span>
            </label>
            <input class="sa-input" type="tel" id="sa-reg-phone"
              placeholder="+39 333 123 4567" autocomplete="tel">
          </div>
          <div class="sa-field">
            <label for="sa-reg-pass">Password</label>
            <input class="sa-input" type="password" id="sa-reg-pass"
              placeholder="Minimum 8 characters" autocomplete="new-password" required>
          </div>
          <div class="sa-field">
            <label for="sa-reg-confirm">Confirm password</label>
            <input class="sa-input" type="password" id="sa-reg-confirm"
              placeholder="••••••••" autocomplete="new-password" required>
          </div>
          <div class="sa-error"   id="sa-reg-err"></div>
          <div class="sa-success" id="sa-reg-ok"></div>
          <button type="submit" class="sa-btn sa-btn-primary" id="sa-reg-submit">Create account →</button>
          <p class="sa-recaptcha-note">
            Protected by hCaptcha —
            <a href="https://hcaptcha.com/privacy" target="_blank" rel="noopener">Privacy</a> ·
            <a href="https://hcaptcha.com/terms"   target="_blank" rel="noopener">Terms</a>
          </p>
        </form>

        <!-- RESET FORM -->
        <form id="sa-form-reset" style="display:none" novalidate>
          <p class="sa-reset-intro">
            Enter your email and we'll send you a link to reset your password.
          </p>
          <div class="sa-field">
            <label for="sa-reset-email">Email</label>
            <input class="sa-input" type="email" id="sa-reset-email"
              placeholder="you@example.com" autocomplete="email" required>
          </div>
          <div class="sa-error"   id="sa-reset-err"></div>
          <div class="sa-success" id="sa-reset-ok"></div>
          <button type="submit" class="sa-btn sa-btn-primary" id="sa-reset-submit">Send reset link →</button>
          <button type="button" class="sa-btn sa-btn-ghost" style="margin-top:8px"
            onclick="SevendaAuth._tab('login')">← Back to sign in</button>
        </form>

        <!-- hCaptcha invisible widget anchor -->
        <div id="sa-hcaptcha-el" style="display:none"></div>

        <!-- Footer switch link -->
        <div class="sa-footer" id="sa-footer-login">
          Don't have an account?
          <button class="sa-link" onclick="SevendaAuth._tab('register')">Sign up free</button>
        </div>
        <div class="sa-footer" id="sa-footer-register" style="display:none">
          Already have an account?
          <button class="sa-link" onclick="SevendaAuth._tab('login')">Sign in</button>
        </div>
      </div>
    `;

    document.body.appendChild(el);

    // Chiude cliccando lo sfondo (solo se non c'è un pending checkout obbligatorio)
    el.addEventListener('click', e => {
      if (e.target === el && !_pending) _closeModal();
    });

    // Chiude con Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && el.classList.contains('open') && !_pending) _closeModal();
    });

    document.getElementById('sa-close').addEventListener('click', () => {
      if (!_pending) _closeModal();
    });

    // Form submit
    document.getElementById('sa-form-login').addEventListener('submit',    e => { e.preventDefault(); _doLogin(); });
    document.getElementById('sa-form-register').addEventListener('submit', e => { e.preventDefault(); _doRegister(); });
    document.getElementById('sa-form-reset').addEventListener('submit',    e => { e.preventDefault(); _doReset(); });
  }

  // ── MODAL CONTROLS ───────────────────────────────────────────────────────────
  function _openModal(tab, afterAuth) {
    if (afterAuth) _pending = afterAuth;
    _switchTab(tab || 'login');
    document.getElementById('sa-modal').classList.add('open');
    setTimeout(() => {
      const first = document.querySelector('#sa-modal input:not([type=hidden])');
      if (first) first.focus();
    }, 80);
  }

  function _closeModal() {
    document.getElementById('sa-modal').classList.remove('open');
    _clearFeedback();
  }

  function _switchTab(tab) {
    _tab = tab;

    // Tab buttons
    ['login', 'register'].forEach(t => {
      const btn = document.getElementById('sa-tab-' + t);
      if (btn) btn.classList.toggle('on', t === tab);
    });

    // Tab bar: nascosta nella reset view
    const tabsEl = document.getElementById('sa-tabs');
    if (tabsEl) tabsEl.style.display = (tab === 'reset') ? 'none' : '';

    // Social + divider: nascosti nella reset view
    const social  = document.getElementById('sa-social');
    const divider = document.getElementById('sa-divider');
    const showSocial = tab !== 'reset';
    if (social)  social.style.display  = showSocial ? '' : 'none';
    if (divider) divider.style.display = showSocial ? '' : 'none';

    // Forms
    ['login', 'register', 'reset'].forEach(t => {
      const f = document.getElementById('sa-form-' + t);
      if (f) f.style.display = (t === tab) ? '' : 'none';
    });

    // Footer switch
    const fl = document.getElementById('sa-footer-login');
    const fr = document.getElementById('sa-footer-register');
    if (fl) fl.style.display = (tab === 'login')    ? '' : 'none';
    if (fr) fr.style.display = (tab === 'register') ? '' : 'none';

    _clearFeedback();
  }

  function _clearFeedback() {
    document.querySelectorAll('.sa-error, .sa-success').forEach(el => el.classList.remove('show'));
  }

  function _showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('show'); }
  }

  function _showOk(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('show'); }
  }

  function _setLoading(btnId, on) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = on;
    if (on) {
      btn._orig = btn.innerHTML;
      btn.innerHTML = '<span class="sa-spinner"></span>';
    } else if (btn._orig !== undefined) {
      btn.innerHTML = btn._orig;
    }
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  async function _doLogin() {
    if (!_sb && !IS_DEV && window.supabase) {
      try { _sb = window.supabase.createClient(CFG.url, CFG.anonKey); } catch(e) {}
    }
    if (!_sb) { _showErr('sa-login-err', 'Service not ready. Please refresh the page.'); return; }

    const email = document.getElementById('sa-login-email').value.trim();
    const pass  = document.getElementById('sa-login-pass').value;

    if (!email || !pass) { _showErr('sa-login-err', 'Please fill in all fields.'); return; }
    _clearFeedback();
    _setLoading('sa-login-submit', true);

    // Captcha richiesto da Supabase quando "Enable Captcha protection" è attivo
    const captchaToken = await _getCaptchaToken();
    if (_captchaRequired() && !captchaToken) {
      _setLoading('sa-login-submit', false);
      _showErr('sa-login-err', 'Completa la verifica e riprova.');
      return;
    }
    const opts = {};
    if (captchaToken) opts.captchaToken = captchaToken;

    const { error } = await _sb.auth.signInWithPassword({ email, password: pass, options: opts });
    _setLoading('sa-login-submit', false);

    if (error) _showErr('sa-login-err', _msg(error));
    // successo gestito da onAuthStateChange
  }

  // ── REGISTER ─────────────────────────────────────────────────────────────────
  async function _doRegister() {
    if (!_sb && !IS_DEV && window.supabase) {
      try { _sb = window.supabase.createClient(CFG.url, CFG.anonKey); } catch(e) {}
    }
    if (!_sb) { _showErr('sa-reg-err', 'Service not ready. Please refresh the page.'); return; }

    const first   = document.getElementById('sa-reg-first').value.trim();
    const last    = document.getElementById('sa-reg-last').value.trim();
    const email   = document.getElementById('sa-reg-email').value.trim();
    const phone   = document.getElementById('sa-reg-phone').value.trim();
    const pass    = document.getElementById('sa-reg-pass').value;
    const confirm = document.getElementById('sa-reg-confirm').value;

    if (!first || !last || !email || !pass) {
      _showErr('sa-reg-err', 'Please fill in all required fields.'); return;
    }
    if (pass.length < 8) {
      _showErr('sa-reg-err', 'Password must be at least 8 characters.'); return;
    }
    if (pass !== confirm) {
      _showErr('sa-reg-err', 'Passwords do not match.'); return;
    }
    _clearFeedback();
    _setLoading('sa-reg-submit', true);

    const captchaToken = await _getCaptchaToken();

    const opts = {
      data: {
        full_name:  `${first} ${last}`,
        first_name: first,
        last_name:  last,
        phone:      phone || null,
      },
    };
    if (captchaToken) opts.captchaToken = captchaToken;

    const { error } = await _sb.auth.signUp({ email, password: pass, options: opts });
    _setLoading('sa-reg-submit', false);

    if (error) {
      _showErr('sa-reg-err', _msg(error));
    } else {
      _showOk('sa-reg-ok', 'Account created! Check your inbox to confirm your email address.');
      // Supabase invia una email di conferma; la sessione parte dopo il clic sul link
    }
  }

  // ── PASSWORD RESET ───────────────────────────────────────────────────────────
  async function _doReset() {
    if (!_sb) { _showErr('sa-reset-err', 'Auth service not configured.'); return; }

    const email = document.getElementById('sa-reset-email').value.trim();
    if (!email) { _showErr('sa-reset-err', 'Please enter your email.'); return; }
    _clearFeedback();
    _setLoading('sa-reset-submit', true);

    // Captcha richiesto da Supabase quando "Enable Captcha protection" è attivo
    const captchaToken = await _getCaptchaToken();
    if (_captchaRequired() && !captchaToken) {
      _setLoading('sa-reset-submit', false);
      _showErr('sa-reset-err', 'Completa la verifica e riprova.');
      return;
    }
    const opts = { redirectTo: window.location.origin + '/reset-password.html' };
    if (captchaToken) opts.captchaToken = captchaToken;

    const { error } = await _sb.auth.resetPasswordForEmail(email, opts);
    _setLoading('sa-reset-submit', false);

    if (error) {
      _showErr('sa-reset-err', _msg(error));
    } else {
      _showOk('sa-reset-ok', 'Reset link sent! Check your inbox.');
    }
  }

  // ── SOCIAL OAUTH ─────────────────────────────────────────────────────────────
  async function _doSocial(provider) {
    // Reinizializzazione lazy: se il client non è ancora pronto ma l'SDK è disponibile, crea il client ora
    if (!_sb && !IS_DEV && window.supabase) {
      try { _sb = window.supabase.createClient(CFG.url, CFG.anonKey); } catch (e) { /* ignore */ }
    }

    if (!_sb) {
      console.error('[SevendaAuth] Client non inizializzato — IS_DEV:', IS_DEV,
        '| SDK:', !!window.supabase, '| url:', CFG.url?.substring(0, 30));
      const errId = _tab === 'register' ? 'sa-reg-err' : 'sa-login-err';
      _showErr(errId, 'Service not ready. Please refresh the page and try again.');
      return;
    }

    const btn = document.getElementById('sa-btn-' + provider);
    if (btn) { btn.disabled = true; btn._orig = btn.innerHTML; btn.innerHTML = `<span class="sa-spinner" style="border-top-color:#e8e8e6"></span>`; }

    const { error } = await _sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      const errId = _tab === 'register' ? 'sa-reg-err' : 'sa-login-err';
      _showErr(errId, _msg(error));
      if (btn) { btn.disabled = false; btn.innerHTML = btn._orig; }
    }
    // in caso di successo il browser viene rediretto da Supabase
  }

  // ── LOGOUT ───────────────────────────────────────────────────────────────────
  async function _doLogout() {
    if (_sb) await _sb.auth.signOut();
  }

  // ── FRIENDLY ERROR MESSAGES ──────────────────────────────────────────────────
  function _msg(err) {
    const m = (err && err.message) || '';
    if (m.includes('Invalid login credentials'))  return 'Incorrect email or password.';
    if (m.includes('Email not confirmed'))         return 'Please confirm your email address first.';
    if (m.includes('User already registered'))     return 'An account with this email already exists.';
    if (m.includes('Password should be at least')) return 'Password must be at least 8 characters.';
    if (m.includes('rate limit') || m.includes('over_email_send_rate_limit'))
                                                   return 'Too many attempts. Please wait a moment.';
    return m || 'Something went wrong. Please try again.';
  }

  // ── NAV RENDER ───────────────────────────────────────────────────────────────
  function _renderNav(session) {
    const area = document.getElementById('nav-auth-area');
    if (!area) return;

    if (session && session.user) {
      const email    = session.user.email || '';
      const initials = email.charAt(0).toUpperCase();
      area.innerHTML = `
        <div class="nav-auth-user">
          <div class="nav-auth-avatar" title="${email}">${initials}</div>
          <span class="nav-auth-email">${email}</span>
          <button class="nav-auth-logout" onclick="SevendaAuth._logout()">Logout</button>
        </div>
      `;
    } else {
      area.innerHTML = `
        <button class="nav-auth-btn nav-auth-ghost"
          onclick="SevendaAuth.openModal('login')">Sign in</button>
        <button class="nav-auth-btn nav-auth-solid"
          onclick="SevendaAuth.openModal('register')">Sign up</button>
      `;
    }
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────
  async function _init() {
    _injectStyles();
    _injectModal();
    _loadHcaptcha();

    if (IS_DEV) {
      console.info('[SevendaAuth] Modalità development — Supabase non configurato.');
      _renderNav(null);
      return;
    }

    await _loadSupabase();

    if (!window.supabase) {
      console.warn('[SevendaAuth] SDK non disponibile — auth disabilitato.');
      _renderNav(null);
      return;
    }

    _sb = window.supabase.createClient(CFG.url, CFG.anonKey);

    // Recupera la sessione esistente (se l'utente era già loggato)
    const { data: { session } } = await _sb.auth.getSession();
    _session = session;
    _renderNav(session);

    // Listener per tutti i cambi di stato
    _sb.auth.onAuthStateChange((event, session) => {
      _session = session;
      _renderNav(session);

      if (event === 'SIGNED_IN') {
        _closeModal();
        if (_pending) {
          const cb = _pending;
          _pending = null;
          setTimeout(cb, 80); // piccolo delay per permettere al modal di chiudersi
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', _init);

  // ── PUBLIC API ───────────────────────────────────────────────────────────────
  window.SevendaAuth = {
    openModal:   _openModal,
    closeModal:  _closeModal,
    isLoggedIn:  () => !!_session,
    getSession:  () => _session,
    // Utente validato lato server (JWT verificato), non solo dalla cache di getSession().
    // Ritorna il risultato completo { data:{user}, error } così il chiamante può
    // distinguere un errore di rete (error valorizzato) da una sessione assente (user null).
    getUser:     async () => (_sb ? await _sb.auth.getUser() : { data: { user: null }, error: null }),
    requireAuth: (callback) => {
      if (_session) { callback(); return; }
      _openModal('login', callback);
    },
    // Esposti per gli onclick inline nel modal e nella nav:
    _tab:    _switchTab,
    _social: _doSocial,
    _logout: _doLogout,
  };

})();
