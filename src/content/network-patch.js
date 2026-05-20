/**
 * Sevenda — Network Patch (world: MAIN)
 * 
 * Eseguito nel contesto della pagina prima di qualsiasi script del sito.
 * Installa il proxy su fetch e XHR e comunica gli eventi al content script
 * tramite CustomEvent (l'unico canale disponibile tra MAIN e ISOLATED world).
 */
(function () {
  if (window.__flNetworkPatched) return;
  window.__flNetworkPatched = true;

  const LIMIT = 500;

  function truncate(s) {
    if (!s) return null;
    return s.length > LIMIT ? s.slice(0, LIMIT) + '…' : s;
  }

  function extractBody(body) {
    if (!body) return null;
    if (typeof body === 'string')        return truncate(body);
    if (body instanceof URLSearchParams) return truncate(body.toString());
    if (body instanceof FormData)        return '[FormData]';
    if (body instanceof Blob)            return '[Blob]';
    if (body instanceof ArrayBuffer)     return '[ArrayBuffer]';
    try { return truncate(JSON.stringify(body)); } catch { return '[binary]'; }
  }

  function emit(data) {
    window.dispatchEvent(new CustomEvent('__fl_network_event', { detail: data }));
  }

  // ── Patch fetch ────────────────────────────────────────────────────────
  const _origFetch = window.fetch.bind(window);
  window.fetch = async function (input, init = {}) {
    const url    = typeof input === 'string' ? input : (input?.url || '');
    const method = (init?.method || input?.method || 'GET').toUpperCase();
    if (url.startsWith('chrome-extension://') || url.startsWith('chrome://')) {
      return _origFetch(input, init);
    }
    const requestBody = extractBody(init?.body);
    emit({ url, method, statusCode: 0, duration: null, requestBody, responsePreview: null, phase: 'request' });
    const t0 = Date.now();
    try {
      const response = await _origFetch(input, init);
      const duration = Date.now() - t0;
      const preview  = await response.clone().text().then(t => truncate(t)).catch(() => null);
      emit({ url, method, statusCode: response.status, duration, requestBody, responsePreview: preview, phase: 'response' });
      return response;
    } catch (err) {
      emit({ url, method, statusCode: 0, duration: Date.now() - t0, requestBody, responsePreview: err.message, phase: 'error' });
      throw err;
    }
  };

  // ── Patch XHR ──────────────────────────────────────────────────────────
  const _origOpen = XMLHttpRequest.prototype.open;
  const _origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._fl_method = (method || 'GET').toUpperCase();
    this._fl_url    = url || '';
    return _origOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const url    = this._fl_url    || '';
    const method = this._fl_method || 'GET';
    if (url.startsWith('chrome-extension://') || url.startsWith('chrome://')) {
      return _origSend.call(this, body);
    }
    const requestBody = extractBody(body);
    const t0 = Date.now();
    emit({ url, method, statusCode: 0, duration: null, requestBody, responsePreview: null, phase: 'request' });
    this.addEventListener('load', function () {
      emit({ url, method, statusCode: this.status, duration: Date.now() - t0, requestBody, responsePreview: truncate(this.responseText || ''), phase: 'response' });
    });
    this.addEventListener('error', function () {
      emit({ url, method, statusCode: 0, duration: Date.now() - t0, requestBody, responsePreview: 'XHR error', phase: 'error' });
    });
    return _origSend.call(this, body);
  };

})();