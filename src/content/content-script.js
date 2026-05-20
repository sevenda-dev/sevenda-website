/**
 * Sevenda — Content Script (bundle inline, no ES imports)
 *
 * Chrome non supporta import ES module nei content script.
 * Tutto il codice è inline in un unico file IIFE.
 *
 * Il patch fetch/XHR viene iniettato dal service worker tramite
 * chrome.scripting.executeScript (world: MAIN) al momento di START_CAPTURE,
 * bypassando la CSP di qualsiasi sito. Gli eventi di rete arrivano qui
 * tramite CustomEvent __fl_network_event.
 */

(function () {
  'use strict';

  // ─── COSTANTI ──────────────────────────────────────────────────────────────
  const BODY_PREVIEW_LIMIT = 500;

  const BLOCKED_PREFIXES = [
    'chrome-extension://',
    'chrome://',
    'devtools://',
  ];

  const MODAL_SELECTORS = [
    '[role="dialog"]',
    '[role="alertdialog"]',
    '.modal',
    '.dialog',
    '[class*="modal"]',
    '[class*="dialog"]',
    '[class*="overlay"]',
    '[class*="drawer"]',
  ];

  const VISIBILITY_ATTRS = ['style', 'class', 'hidden', 'aria-hidden', 'open'];

  
  // ─── EVENT SCHEMA HELPERS ──────────────────────────────────────────────────
  function makeEvent(source, type, payload, sessionId) {
    return {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      sessionId: sessionId || null,
      source,
      type,
      importance: 5,
      ...payload,
    };
  }

  function navEvent(data, sessionId) {
    return makeEvent('navigation', 'page_navigate', { navigation: data }, sessionId);
  }

  function interactionEvent(data, sessionId) {
    return makeEvent('interaction', data.interactionType, { interaction: data }, sessionId);
  }

  function networkEvent(data, sessionId) {
    const type = data.statusCode >= 400 ? 'api_error'
               : data.phase === 'request' ? 'api_call'
               : 'api_response';
    return makeEvent('network', type, { network: data }, sessionId);
  }

  function errorEvent(data, sessionId) {
    return makeEvent('error', 'js_error', { error: data }, sessionId);
  }

  function domEvent(data, sessionId) {
    return makeEvent('dom', data.domEventType, { domMutation: data }, sessionId);
  }

  // ─── STATO ─────────────────────────────────────────────────────────────────
  const state = {
    isCapturing:   false,
    sessionId:     null,
    eventQueue:    [],
    flushInterval: null,
    listeners:     [],
  };

  // ─── NETWORK INTERCEPTOR ───────────────────────────────────────────────────
  let _originalFetch   = null;
  let _originalXHROpen = null;
  let _originalXHRSend = null;
  let _networkActive   = false;

  // Buffer pre-sessione: raccoglie eventi NET prima che startCapture() venga
  // chiamato. Quando la sessione parte, gli eventi vengono scaricati nella
  // coda principale. Questo risolve la race condition sui siti che chiamano
  // fetch durante il bootstrap del framework (React, Vue, Next.js, ecc.)
  // prima che l'utente abbia avuto modo di premere "Avvia Registrazione".
  const _preSessionBuffer = [];
  const PRE_SESSION_LIMIT = 200; // evita memory leak su pagine con polling

  function startNetwork() {
    if (_networkActive) return;
    _networkActive = true;

    // Scarica gli eventi pre-sessione accumulati prima di startCapture()
    if (_preSessionBuffer.length) {
      for (const ev of _preSessionBuffer) {
        ev.sessionId = state.sessionId;
        state.eventQueue.push(ev);
      }
      _preSessionBuffer.length = 0;
    }
  }

  function stopNetwork() {
    _networkActive = false;
    // NON ripristiniamo fetch/XHR: il patch rimane attivo per tutta la vita
    // della pagina, ma gli eventi vengono scartati quando !_networkActive
    // e !_patchInstalled (vedi enqueueNetwork sotto).
  }

  function isBlocked(url) {
    return BLOCKED_PREFIXES.some(p => url.startsWith(p));
  }

  function truncate(str) {
    if (!str) return null;
    return str.length > BODY_PREVIEW_LIMIT ? str.slice(0, BODY_PREVIEW_LIMIT) + '…' : str;
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

  // Routing centralizzato: coda normale se sessione attiva,
  // buffer pre-sessione altrimenti (così non perdiamo le chiamate iniziali).
  function enqueueNetwork(ev) {
    if (state.isCapturing) {
      state.eventQueue.push(ev);
    } else {
      // Accumula nel buffer pre-sessione con limite per evitare memory leak
      if (_preSessionBuffer.length < PRE_SESSION_LIMIT) {
        _preSessionBuffer.push(ev);
      }
    }
  }

  function patchFetch() {
    window.fetch = async function (input, init = {}) {
      const url    = typeof input === 'string' ? input : (input?.url || '');
      const method = (init.method || input?.method || 'GET').toUpperCase();

      if (isBlocked(url)) return _originalFetch(input, init);

      const requestBody = extractBody(init.body);
      enqueueNetwork(networkEvent({ url, method, statusCode: 0, duration: null, requestBody, responsePreview: null, phase: 'request' }, state.sessionId));

      const t0 = Date.now();
      try {
        const response = await _originalFetch(input, init);
        const duration = Date.now() - t0;
        const preview  = await response.clone().text().then(t => truncate(t)).catch(() => null);
        enqueueNetwork(networkEvent({ url, method, statusCode: response.status, duration, requestBody, responsePreview: preview, phase: 'response' }, state.sessionId));
        return response;
      } catch (err) {
        enqueueNetwork(networkEvent({ url, method, statusCode: 0, duration: Date.now() - t0, requestBody, responsePreview: err.message, phase: 'error' }, state.sessionId));
        throw err;
      }
    };
  }

  function patchXHR() {
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._fl_method = (method || 'GET').toUpperCase();
      this._fl_url    = url || '';
      return _originalXHROpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (body) {
      const url    = this._fl_url    || '';
      const method = this._fl_method || 'GET';

      if (isBlocked(url)) return _originalXHRSend.call(this, body);

      const requestBody = extractBody(body);
      const t0 = Date.now();

      enqueueNetwork(networkEvent({ url, method, statusCode: 0, duration: null, requestBody, responsePreview: null, phase: 'request' }, state.sessionId));

      this.addEventListener('load', function () {
        enqueueNetwork(networkEvent({ url, method, statusCode: this.status, duration: Date.now() - t0, requestBody, responsePreview: truncate(this.responseText || ''), phase: 'response' }, state.sessionId));
      });
      this.addEventListener('error', function () {
        enqueueNetwork(networkEvent({ url, method, statusCode: 0, duration: Date.now() - t0, requestBody, responsePreview: 'XHR error', phase: 'error' }, state.sessionId));
      });

      return _originalXHRSend.call(this, body);
    };
  }

  // ─── DOM OBSERVER ──────────────────────────────────────────────────────────
  let _domObserver = null;
  let _openModals  = new WeakSet();

  function startDom() {
    if (_domObserver) return;
    _openModals  = new WeakSet();
    _domObserver = new MutationObserver(processMutations);
    _domObserver.observe(document.body || document.documentElement, {
      childList:       true,
      subtree:         true,
      attributes:      true,
      attributeFilter: VISIBILITY_ATTRS,
    });
  }

  function stopDom() {
    _domObserver?.disconnect();
    _domObserver = null;
    _openModals  = new WeakSet();
  }

  function processMutations(mutations) {
    for (const m of mutations) {
      if (m.type === 'childList') {
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const modal = findModal(node);
          if (modal) {
            _openModals.add(modal);
            enqueue(domEvent({ mutationType: 'childList', targetSelector: getSelector(modal), summary: `Modal aperto: ${describeEl(modal)}`, domEventType: 'modal_open' }, state.sessionId));
          }
        }
        for (const node of m.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const modal = findModal(node);
          if (modal && _openModals.has(modal)) {
            _openModals.delete(modal);
            enqueue(domEvent({ mutationType: 'childList', targetSelector: getSelector(modal), summary: `Modal chiuso: ${describeEl(modal)}`, domEventType: 'modal_close' }, state.sessionId));
          }
        }
      }
      if (m.type === 'attributes') {
        const node = m.target;
        if (!isModal(node)) continue;
        const visible = isVisible(node);
        const wasOpen = _openModals.has(node);
        if (visible && !wasOpen) {
          _openModals.add(node);
          enqueue(domEvent({ mutationType: 'attributes', targetSelector: getSelector(node), summary: `Modal visibile: ${describeEl(node)}`, domEventType: 'modal_open' }, state.sessionId));
        } else if (!visible && wasOpen) {
          _openModals.delete(node);
          enqueue(domEvent({ mutationType: 'attributes', targetSelector: getSelector(node), summary: `Modal nascosto: ${describeEl(node)}`, domEventType: 'modal_close' }, state.sessionId));
        }
      }
    }
  }

  function findModal(node) {
    if (isModal(node)) return node;
    for (const sel of MODAL_SELECTORS) {
      const found = node.querySelector?.(sel);
      if (found) return found;
    }
    return null;
  }

  function isModal(node) {
    return MODAL_SELECTORS.some(sel => { try { return node.matches?.(sel); } catch { return false; } });
  }

  function isVisible(node) {
    if (node.hasAttribute?.('hidden')) return false;
    if (node.getAttribute?.('aria-hidden') === 'true') return false;
    if (node.style?.display === 'none' || node.style?.visibility === 'hidden') return false;
    return true;
  }

  function getSelector(node) {
    if (!node) return '';
    if (node.id) return `#${node.id}`;
    const tag = node.tagName?.toLowerCase() || 'el';
    const cls = typeof node.className === 'string'
      ? '.' + node.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    return `${tag}${cls}`;
  }

  function describeEl(node) {
    if (!node) return '?';
    const tag  = node.tagName?.toLowerCase() || '?';
    const id   = node.id ? `#${node.id}` : '';
    const role = node.getAttribute?.('role') ? `[role=${node.getAttribute('role')}]` : '';
    return `<${tag}${id}${role}>`;
  }

  // ─── LISTENER EVENTI DI RETE DA network-patch.js (world: MAIN) ────────────
  // Riceve gli eventi emessi dal mondo MAIN tramite CustomEvent e li accoda.
  window.addEventListener('__fl_network_event', (e) => {
    const data = e.detail;
    if (!data) return;
    const ev = networkEvent(data, state.sessionId);
    enqueueNetwork(ev);
  });

  // ─── CAPTURE LIFECYCLE ─────────────────────────────────────────────────────
  function startCapture(sessionId) {
    if (state.isCapturing) return;
    state.isCapturing = true;
    state.sessionId   = sessionId;
    state.eventQueue  = [];

    attachListeners();
    startNetwork();
    startDom();

    state.flushInterval = setInterval(() => flushEvents(false), 2000);

    console.log('[FL Content] Capture started — session:', sessionId);

    enqueue(navEvent({ fromUrl: '', toUrl: location.href, trigger: 'session-start' }, sessionId));
    setTimeout(() => flushEvents(true), 100);
  }

  function stopCapture() {
    if (!state.isCapturing) return;
    state.isCapturing = false;

    detachListeners();
    stopNetwork();
    stopDom();

    clearInterval(state.flushInterval);
    state.flushInterval = null;

    flushEvents(true);

    console.log('[FL Content] Capture stopped — session:', state.sessionId);
    state.sessionId = null;
  }

  // ─── QUEUE & FLUSH ─────────────────────────────────────────────────────────
  function enqueue(event) {
    if (!state.isCapturing || !event) return;
    state.eventQueue.push(event);
  }

  function flushEvents(force) {
    if (!state.eventQueue.length) return;

    // Invia immediatamente anche con un solo evento (soglia abbassata da 3 a 1).
    // Il flush periodico ogni 2s rimane come fallback per i casi in cui
    // gli eventi arrivano molto lentamente.
    const batch = [...state.eventQueue];
    state.eventQueue = [];

    chrome.runtime.sendMessage({
      type:    'EVENTS_BATCH',
      payload: { sessionId: state.sessionId, events: batch },
    }, (response) => {
      if (chrome.runtime.lastError) {
        state.eventQueue = [...batch, ...state.eventQueue];
      }
    });
  }

  // ─── LISTENERS BASE ────────────────────────────────────────────────────────
  function attachListeners() {
    const onClick = (e) => {
      // Risali al primo elemento significativo (button, a, input, [data-*])
      let t = e.target;
      while (t && t !== document.body) {
        if (['BUTTON','A','INPUT','SELECT','LABEL'].includes(t.tagName) ||
            t.getAttribute('role') === 'button' ||
            (t.dataset && Object.keys(t.dataset).length > 0)) break;
        t = t.parentElement;
      }
      t = t || e.target;
      enqueue(interactionEvent({
        interactionType: 'click',
        elementTag:      t.tagName?.toLowerCase() || 'unknown',
        elementId:       t.id || null,
        elementText:     (t.textContent || '').trim().slice(0, 100),
        elementType:     t.type || null,
        dataAttributes:  extractDataAttrs(t),
        xpath:           getXPath(t),
        href:            t.href || null,
      }, state.sessionId));
    };

    const onSubmit = (e) => {
      const f = e.target;
      enqueue(interactionEvent({
        interactionType: 'form_submit',
        elementTag:      'form',
        elementId:       f.id || null,
        elementText:     f.getAttribute('name') || null,
        dataAttributes:  extractDataAttrs(f),
        xpath:           getXPath(f),
        href:            null,
      }, state.sessionId));
    };

    const onError = (ev) => {
      chrome.runtime.sendMessage({
        type:    'JS_ERROR',
        payload: errorEvent({
          message:   ev.message  || 'Unknown error',
          filename:  ev.filename || null,
          lineno:    ev.lineno   || null,
          colno:     ev.colno    || null,
          stack:     ev.error?.stack || null,
          errorType: 'js-error',
        }, state.sessionId),
      });
    };

    const onRejection = (ev) => {
      chrome.runtime.sendMessage({
        type:    'JS_ERROR',
        payload: errorEvent({
          message:   ev.reason?.message || String(ev.reason) || 'Unhandled rejection',
          stack:     ev.reason?.stack   || null,
          errorType: 'promise-rejection',
        }, state.sessionId),
      });
    };

    const origPush    = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);

    history.pushState = function (...args) {
      const from = location.href;
      origPush(...args);
      enqueue(navEvent({ fromUrl: from, toUrl: location.href, trigger: 'pushState' }, state.sessionId));
    };
    history.replaceState = function (...args) {
      const from = location.href;
      origReplace(...args);
      enqueue(navEvent({ fromUrl: from, toUrl: location.href, trigger: 'replaceState' }, state.sessionId));
    };

    const onPopState = () => {
      enqueue(navEvent({ fromUrl: '', toUrl: location.href, trigger: 'popState' }, state.sessionId));
    };

    document.addEventListener('click',  onClick,  { capture: true, passive: true });
    document.addEventListener('submit', onSubmit, { capture: true, passive: true });
    window.addEventListener('error',              onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('popstate',           onPopState);

    state.listeners = [
      () => document.removeEventListener('click',  onClick,  { capture: true }),
      () => document.removeEventListener('submit', onSubmit, { capture: true }),
      () => window.removeEventListener('error',              onError),
      () => window.removeEventListener('unhandledrejection', onRejection),
      () => window.removeEventListener('popstate',           onPopState),
      () => { history.pushState    = origPush; },
      () => { history.replaceState = origReplace; },
    ];
  }

  function detachListeners() {
    state.listeners.forEach(fn => fn());
    state.listeners = [];
  }

  // ─── UTILITIES ─────────────────────────────────────────────────────────────
  function extractDataAttrs(el) {
    const result = {};
    if (!el?.dataset) return result;
    for (const [k, v] of Object.entries(el.dataset)) result[`data-${k}`] = v;
    return result;
  }

  function getXPath(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.id) return `//*[@id="${el.id}"]`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      let idx = 0, sib = node.previousSibling;
      while (sib) {
        if (sib.nodeType === Node.ELEMENT_NODE && sib.tagName === node.tagName) idx++;
        sib = sib.previousSibling;
      }
      parts.unshift(idx ? `${node.tagName.toLowerCase()}[${idx + 1}]` : node.tagName.toLowerCase());
      node = node.parentNode;
    }
    return '/' + parts.join('/');
  }

  // ─── MESSAGGI DAL SERVICE WORKER ───────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'START_CAPTURE':
        startCapture(message.payload.sessionId);
        sendResponse({ ok: true });
        break;
      case 'STOP_CAPTURE':
        stopCapture();
        sendResponse({ ok: true });
        break;
      case 'PING':
        sendResponse({ pong: true, url: location.href });
        break;
      default:
        sendResponse({ ok: false });
    }
    return true;
  });

  // ─── INIT ──────────────────────────────────────────────────────────────────
chrome.runtime.sendMessage(
  { type: 'CONTENT_SCRIPT_READY' },
  (response) => {
    if (chrome.runtime.lastError) return;
    console.log('[FL Content] Ready — isRecording:', response?.isRecording);
    // Se la registrazione era già attiva, riattacca i listener
    if (response?.isRecording && response?.sessionId) {
      startCapture(response.sessionId);
    }
  }
);

  console.log('[FL Content] Content script initialized on:', location.href);

})();
