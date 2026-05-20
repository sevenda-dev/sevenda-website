/**
 * Sevenda — Network Interceptor
 *
 * Monkey-patch di fetch e XMLHttpRequest per catturare
 * tutte le chiamate di rete effettuate dalla pagina.
 *
 * Viene importato e attivato dal content-script solo durante la registrazione.
 * Non tocca nulla finché startIntercepting() non viene chiamato.
 */

import { EventSchema } from '../processor/event-schema.js';

// URL interni Chrome da ignorare sempre
const BLOCKED_PREFIXES = [
  'chrome-extension://',
  'chrome://',
  'devtools://',
];

// Soglia preview body (caratteri)
const BODY_PREVIEW_LIMIT = 500;

export class NetworkInterceptor {
  constructor({ onEvent, sessionId }) {
    this._onEvent   = onEvent;    // callback che riceve l'evento normalizzato
    this._sessionId = sessionId;
    this._active    = false;

    // Salva i riferimenti originali
    this._originalFetch = window.fetch.bind(window);
    this._originalXHROpen = XMLHttpRequest.prototype.open;
    this._originalXHRSend = XMLHttpRequest.prototype.send;
  }

  // ─── PUBLIC API ──────────────────────────────────────────────────────────────
  startIntercepting() {
    if (this._active) return;
    this._active = true;
    this._patchFetch();
    this._patchXHR();
    console.log('[FL Network] Interceptor started');
  }

  stopIntercepting() {
    if (!this._active) return;
    this._active = false;
    window.fetch              = this._originalFetch;
    XMLHttpRequest.prototype.open = this._originalXHROpen;
    XMLHttpRequest.prototype.send = this._originalXHRSend;
    console.log('[FL Network] Interceptor stopped');
  }

  updateSessionId(sessionId) {
    this._sessionId = sessionId;
  }

  // ─── FETCH PATCH ─────────────────────────────────────────────────────────────
  _patchFetch() {
    const self = this;

    window.fetch = async function (input, init = {}) {
      const url    = typeof input === 'string' ? input : input?.url || '';
      const method = (init.method || (input?.method) || 'GET').toUpperCase();

      if (!self._active || self._isBlocked(url)) {
        return self._originalFetch(input, init);
      }

      // Evento REQUEST
      const requestBody = self._extractBody(init.body);
      self._emit(EventSchema.createNetworkEvent({
        url, method,
        statusCode:      0,
        duration:        null,
        requestBody,
        responsePreview: null,
        phase:           'request',
      }, self._sessionId));

      const t0 = Date.now();

      try {
        const response = await self._originalFetch(input, init);
        const duration = Date.now() - t0;

        // Clona per leggere il body senza consumarlo
        const clone   = response.clone();
        const preview = await self._readBodyPreview(clone);

        // Evento RESPONSE
        self._emit(EventSchema.createNetworkEvent({
          url, method,
          statusCode:      response.status,
          duration,
          requestBody,
          responsePreview: preview,
          phase:           'response',
        }, self._sessionId));

        return response;

      } catch (err) {
        const duration = Date.now() - t0;

        // Evento ERROR
        self._emit(EventSchema.createNetworkEvent({
          url, method,
          statusCode:      0,
          duration,
          requestBody,
          responsePreview: err.message || 'Network error',
          phase:           'error',
        }, self._sessionId));

        throw err;
      }
    };
  }

  // ─── XHR PATCH ───────────────────────────────────────────────────────────────
  _patchXHR() {
    const self = this;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._fl_method = (method || 'GET').toUpperCase();
      this._fl_url    = url || '';
      return self._originalXHROpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (body) {
      const url    = this._fl_url    || '';
      const method = this._fl_method || 'GET';

      if (!self._active || self._isBlocked(url)) {
        return self._originalXHRSend.call(this, body);
      }

      const requestBody = self._extractBody(body);
      const t0 = Date.now();

      // Evento REQUEST
      self._emit(EventSchema.createNetworkEvent({
        url, method,
        statusCode:      0,
        duration:        null,
        requestBody,
        responsePreview: null,
        phase:           'request',
      }, self._sessionId));

      this.addEventListener('load', function () {
        const duration = Date.now() - t0;
        const preview  = self._truncate(this.responseText || '');

        // Evento RESPONSE
        self._emit(EventSchema.createNetworkEvent({
          url, method,
          statusCode:      this.status,
          duration,
          requestBody,
          responsePreview: preview,
          phase:           'response',
        }, self._sessionId));
      });

      this.addEventListener('error', function () {
        const duration = Date.now() - t0;

        // Evento ERROR
        self._emit(EventSchema.createNetworkEvent({
          url, method,
          statusCode:      0,
          duration,
          requestBody,
          responsePreview: 'XHR network error',
          phase:           'error',
        }, self._sessionId));
      });

      return self._originalXHRSend.call(this, body);
    };
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────
  _emit(event) {
    if (this._active && event) {
      this._onEvent(event);
    }
  }

  _isBlocked(url) {
    return BLOCKED_PREFIXES.some(prefix => url.startsWith(prefix));
  }

  _extractBody(body) {
    if (!body) return null;
    if (typeof body === 'string') return this._truncate(body);
    if (body instanceof URLSearchParams) return this._truncate(body.toString());
    if (body instanceof FormData) return '[FormData]';
    if (body instanceof Blob)     return '[Blob]';
    if (body instanceof ArrayBuffer) return '[ArrayBuffer]';
    try { return this._truncate(JSON.stringify(body)); } catch { return '[binary]'; }
  }

  async _readBodyPreview(response) {
    try {
      const text = await response.text();
      return this._truncate(text);
    } catch {
      return null;
    }
  }

  _truncate(str) {
    if (!str) return null;
    return str.length > BODY_PREVIEW_LIMIT
      ? str.slice(0, BODY_PREVIEW_LIMIT) + '…'
      : str;
  }
}
