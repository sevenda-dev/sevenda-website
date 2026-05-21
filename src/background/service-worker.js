/**
 * Sevenda — Background Service Worker (inline, no ES imports)
 *
 * StorageManager e pipeline sono inline per evitare problemi
 * con import ES module nel service worker context.
 */

// ─── STORAGE MANAGER (inline) ────────────────────────────────────────────────
const DB_NAME    = 'sevenda';
const DB_VERSION = 1;

class StorageManager {
  constructor() { this.db = null; }

  init() {
    return new Promise((resolve, reject) => {
      if (this.db) { resolve(this.db); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('sessions')) {
          const s = db.createObjectStore('sessions', { keyPath: 'id' });
          s.createIndex('status',    'status',    { unique: false });
          s.createIndex('startTime', 'startTime', { unique: false });
        }
        if (!db.objectStoreNames.contains('events')) {
          const e = db.createObjectStore('events', { keyPath: 'id' });
          e.createIndex('sessionId', 'sessionId', { unique: false });
          e.createIndex('timestamp', 'timestamp', { unique: false });
          e.createIndex('type',      'type',      { unique: false });
        }
        if (!db.objectStoreNames.contains('bpmn-drafts')) {
          const d = db.createObjectStore('bpmn-drafts', { keyPath: 'id' });
          d.createIndex('sessionId', 'sessionId', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[FL Storage] IndexedDB ready');
        resolve(this.db);
      };
      request.onerror = (event) => {
        console.error('[FL Storage] IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  createSession(session)          { return this._put('sessions', session); }
  updateSession(id, updates)      { return this._update('sessions', id, updates); }
  getSession(id)                  { return this._get('sessions', id); }
  getAllSessions()                 { return this._getAll('sessions'); }

  async incrementEventCount(sessionId, count) {
    const session = await this.getSession(sessionId);
    if (session) {
      session.eventCount = (session.eventCount || 0) + count;
      await this._put('sessions', session);
    }
  }

  saveEvents(events) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }
      const tx    = this.db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      events.forEach(event => store.put(event));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  getEventsBySession(sessionId, limit = 2000) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }
      const tx      = this.db.transaction('events', 'readonly');
      const store   = tx.objectStore('events');
      const index   = store.index('sessionId');
      const results = [];
      // Usa un cursore invece di getAll() per non caricare tutto in memoria.
      // Il limite evita OOM su sessioni molto lunghe; i record più recenti
      // vengono mantenuti (ordinati per timestamp dopo il caricamento).
      const req = index.openCursor(IDBKeyRange.only(sessionId));
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          // Ordina per timestamp prima di restituire
          results.sort((a, b) => a.timestamp - b.timestamp);
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  deleteSession(sessionId) {
    return this._delete('sessions', sessionId);
  }

  deleteEventsBySession(sessionId) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }
      const tx    = this.db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const index = store.index('sessionId');
      const req   = index.openCursor(IDBKeyRange.only(sessionId));
      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  _delete(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }
      const tx      = this.db.transaction(storeName, 'readwrite');
      const store   = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror   = () => reject(request.error);
    });
  }

  _put(storeName, record) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }
      const tx      = this.db.transaction(storeName, 'readwrite');
      const store   = tx.objectStore(storeName);
      const request = store.put(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror   = () => reject(request.error);
    });
  }

  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }
      const tx      = this.db.transaction(storeName, 'readonly');
      const store   = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror   = () => reject(request.error);
    });
  }

  _getAll(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }
      const tx      = this.db.transaction(storeName, 'readonly');
      const store   = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror   = () => reject(request.error);
    });
  }

  async _update(storeName, id, updates) {
    const existing = await this._get(storeName, id);
    if (!existing) return;
    return this._put(storeName, { ...existing, ...updates });
  }
}

// ─── PIPELINE (inline, semplificata) ─────────────────────────────────────────
const IGNORED_URL_PATTERNS = [
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /hotjar\.com/,
  /segment\.com/,
  /mixpanel\.com/,
  /amplitude\.com/,
  /sentry\.io/,
  /bugsnag\.com/,
  /clarity\.ms/,
  /facebook\.com\/tr/,
  /doubleclick\.net/,
  /\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|ico)(\?|$)/i,
];

const DEDUP_WINDOW_MS = 500;
const _recentKeys     = new Map();

function processEvents(events) {
  const results = [];
  for (const event of events) {
    if (!event || !event.type) continue;
    if (!shouldKeep(event)) continue;
    if (isDuplicate(event)) continue;
    results.push(event);
  }
  return results;
}

function shouldKeep(event) {
  if (event.source === 'network') {
    const url = event.network?.url || '';
    for (const pattern of IGNORED_URL_PATTERNS) {
      if (pattern.test(url)) return false;
    }
  }
  return true;
}

function isDuplicate(event) {
  const key = dedupKey(event);
  if (!key) return false;
  const now      = event.timestamp || Date.now();
  const lastSeen = _recentKeys.get(key);
  if (lastSeen && (now - lastSeen) < DEDUP_WINDOW_MS) return true;
  _recentKeys.set(key, now);
  return false;
}

function dedupKey(event) {
  switch (event.source) {
    case 'network':     return `net:${event.network?.method}:${event.network?.url}:${event.network?.phase}`;
    case 'interaction': return `int:${event.type}:${event.interaction?.elementTag}:${event.interaction?.elementId || event.interaction?.elementText?.slice(0,20)}`;
    case 'dom':         return `dom:${event.type}:${event.domMutation?.targetSelector}`;
    case 'navigation':  return `nav:${event.navigation?.toUrl}`;
    default:            return null;
  }
}

setInterval(() => {
  const cutoff = Date.now() - DEDUP_WINDOW_MS * 10;
  for (const [key, ts] of _recentKeys) {
    if (ts < cutoff) _recentKeys.delete(key);
  }
}, 10_000);

// ─── STATO GLOBALE ───────────────────────────────────────────────────────────
const swState = {
  isRecording:         false,
  currentSessionId:    null,
  activeTabId:         null,
  devtoolsConnections: new Map(),
};

const storage = new StorageManager();

// ─── INIT ────────────────────────────────────────────────────────────────────
// dbReady è una Promise condivisa che si risolve quando IndexedDB è pronto.
// Ogni handler chiama ensureDb() prima di toccare il DB, così non importa
// se il SW è appena stato riavviato dal browser.
const dbReady = storage.init().then(() => {
  console.log('[FL SW] Service worker ready');
}).catch(err => {
  console.error('[FL SW] Storage init failed:', err);
});

async function ensureDb() {
  await dbReady;
}

// ─── STATE RECOVERY ──────────────────────────────────────────────────────────
// Chrome può terminare il service worker dopo ~30s di inattività (nessun evento
// in ingresso). Al riavvio swState viene azzerato, causando "No active recording"
// quando il panel tenta di fermare una sessione ancora aperta in IndexedDB.
// Questa funzione ripristina isRecording e currentSessionId leggendo le sessioni
// con status='recording' dal DB, in modo che handleStopRecording funzioni
// correttamente anche dopo un riavvio inaspettato del SW.
async function recoverSwStateFromDb() {
  try {
    await ensureDb();
    const sessions = await storage.getAllSessions();
    // Cerca sessioni ancora marcate come 'recording' nel DB
    const active = sessions.filter(s => s.status === 'recording');
    if (active.length === 0) return;

    // Prende la sessione più recente in caso ce ne siano più di una
    // (non dovrebbe accadere, ma è una guardia di sicurezza)
    const session = active.sort((a,b) => (b.startTime||0) - (a.startTime||0))[0];

    swState.isRecording      = true;
    swState.currentSessionId = session.id;
    swState.activeTabId      = session.tabId || null;

    console.log(`[FL SW] State recovered from DB — session: ${session.id}`);
  } catch (err) {
    // Non blocca il SW se il recovery fallisce — lo stato rimane azzerato
    console.warn('[FL SW] State recovery failed:', err.message);
  }
}

// Avvia il recovery subito dopo l'inizializzazione del DB.
// Non attende il completamento per non rallentare l'avvio del SW.
dbReady.then(() => recoverSwStateFromDb());

// ─── PATCH RETE ───────────────────────────────────────────────────────────────
// Inietta il patch fetch/XHR nel mondo MAIN tramite chrome.scripting.executeScript,
// che bypassa la CSP del sito. Viene chiamato quando il content script si connette
// (CONTENT_SCRIPT_READY), garantendo l'iniezione ad ogni caricamento pagina.
async function injectNetworkPatch(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world:  'MAIN',
      func:   function () {
        if (window.__flNetworkPatched) return;
        window.__flNetworkPatched = true;

        const LIMIT = 500;
        function truncate(s) { return s && s.length > LIMIT ? s.slice(0, LIMIT) + '\u2026' : s || null; }
        function extractBody(b) {
          if (!b) return null;
          if (typeof b === 'string') return truncate(b);
          if (b instanceof URLSearchParams) return truncate(b.toString());
          if (b instanceof FormData) return '[FormData]';
          if (b instanceof Blob) return '[Blob]';
          if (b instanceof ArrayBuffer) return '[ArrayBuffer]';
          try { return truncate(JSON.stringify(b)); } catch (e) { return '[binary]'; }
        }
        function emit(data) {
          window.dispatchEvent(new CustomEvent('__fl_network_event', { detail: data }));
        }
        function isBlocked(url) {
          return !url || url.startsWith('chrome-extension://') ||
                 url.startsWith('chrome://') || url.startsWith('devtools://');
        }

        const _origFetch = window.fetch.bind(window);
        window.fetch = async function (input, init) {
          init = init || {};
          const url    = typeof input === 'string' ? input : (input && input.url || '');
          const method = ((init.method || (input && input.method) || 'GET')).toUpperCase();
          if (isBlocked(url)) return _origFetch(input, init);
          const requestBody = extractBody(init.body);
          emit({ url, method, statusCode: 0, duration: null, requestBody, responsePreview: null, phase: 'request' });
          const t0 = Date.now();
          try {
            const response = await _origFetch(input, init);
            const duration = Date.now() - t0;
            const preview  = await response.clone().text()
              .then(function(t) { return truncate(t); })
              .catch(function() { return null; });
            emit({ url, method, statusCode: response.status, duration, requestBody, responsePreview: preview, phase: 'response' });
            return response;
          } catch (err) {
            emit({ url, method, statusCode: 0, duration: Date.now() - t0, requestBody, responsePreview: err.message, phase: 'error' });
            throw err;
          }
        };

        const _origOpen = XMLHttpRequest.prototype.open;
        const _origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url) {
          this._fl_method = (method || 'GET').toUpperCase();
          this._fl_url    = url || '';
          return _origOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function (body) {
          const url    = this._fl_url    || '';
          const method = this._fl_method || 'GET';
          if (isBlocked(url)) return _origSend.apply(this, arguments);
          const requestBody = extractBody(body);
          const t0 = Date.now();
          emit({ url, method, statusCode: 0, duration: null, requestBody, responsePreview: null, phase: 'request' });
          this.addEventListener('load', function () {
            emit({ url, method, statusCode: this.status, duration: Date.now() - t0,
                   requestBody, responsePreview: truncate(this.responseText || ''), phase: 'response' });
          });
          this.addEventListener('error', function () {
            emit({ url, method, statusCode: 0, duration: Date.now() - t0,
                   requestBody, responsePreview: 'XHR error', phase: 'error' });
          });
          return _origSend.apply(this, arguments);
        };

        console.log('[FL] Network patch applicato (world: MAIN)');
      },
    });
    console.log(`[FL SW] Network patch iniettato — tab ${tabId}`);
  } catch (err) {
    // Normale su pagine chrome://, about:blank, ecc.
    console.log(`[FL SW] Network patch non applicabile — tab ${tabId}: ${err.message}`);
  }
}

// ─── CONNESSIONI DEVTOOLS ────────────────────────────────────────────────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'devtools-panel') return;

  const tabId = port.sender?.tab?.id ?? null;
  console.log(`[FL SW] DevTools panel connected — tab: ${tabId}`);

  // Traccia se questo tabId si è già connesso in precedenza
  const isReconnect = swState.devtoolsConnections.has(tabId);
  swState.devtoolsConnections.set(tabId, port);

  port.postMessage({
    type: 'STATE_SYNC',
    payload: {
      isRecording: swState.isRecording,
      sessionId:   swState.currentSessionId,
      tabId,
      isReconnect,   // ← il panel usa questo per non mostrare messaggi SYS sui re-connect
    },
  });

  port.onDisconnect.addListener(() => {
    console.log(`[FL SW] DevTools panel disconnected — tab: ${tabId}`);
    swState.devtoolsConnections.delete(tabId);
    // Non inviare messaggi SYS al panel — si disconnette/riconnette automaticamente ogni ~30s
  });

  port.onMessage.addListener((message) => {
    handlePanelMessage(message, tabId, port);
  });
});

// ─── MESSAGGI DAL CONTENT SCRIPT ────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {

    case 'CONTENT_SCRIPT_READY':
      console.log(`[FL SW] Content script ready — tab ${tabId}`);
      // Inietta il patch fetch/XHR appena il content script è pronto.
      // Questo è il momento più affidabile — avviene ad ogni caricamento
      // pagina indipendentemente dallo stato del service worker.
      if (tabId) injectNetworkPatch(tabId);
      sendResponse({
        ok: true,
        isRecording: swState.isRecording,
        sessionId: swState.currentSessionId,
      });
      break;

    case 'EVENTS_BATCH':
      if (swState.isRecording && swState.currentSessionId) {
        handleEventsBatch(message.payload, tabId);
      }
      sendResponse({ ok: true });
      break;

    case 'JS_ERROR':
      if (swState.isRecording && swState.currentSessionId) {
        handleSingleEvent(message.payload, tabId);
      }
      sendResponse({ ok: true });
      break;

    case 'NETWORK_EVENT':
      if (swState.isRecording && swState.currentSessionId) {
        handleSingleEvent(message.payload, tabId);
      }
      sendResponse({ ok: true });
      break;

    case 'PING':
      sendResponse({ pong: true, timestamp: Date.now() });
      break;

    default:
      sendResponse({ ok: false, error: 'Unknown message type' });
  }

  return true;
});

// ─── HANDLER MESSAGGI PANEL ──────────────────────────────────────────────────
async function handlePanelMessage(message, tabId, port) {
  await ensureDb();
  console.log(`[FL SW] Panel message: ${message.type}`);

  switch (message.type) {

    case 'PANEL_INIT':
      swState.devtoolsConnections.set(message.payload.tabId, port);
      port.postMessage({
        type: 'STATE_SYNC',
        payload: {
          isRecording: swState.isRecording,
          sessionId:   swState.currentSessionId,
        },
      });
      break;

    case 'START_RECORDING':
      await handleStartRecording(message.payload, tabId, port);
      break;

    case 'STOP_RECORDING':
      await handleStopRecording(tabId, port);
      break;

    case 'GET_SESSION_EVENTS': {
      const events = await storage.getEventsBySession(message.payload.sessionId);
      port.postMessage({ type: 'SESSION_EVENTS', payload: { events } });
      break;
    }

    case 'GET_SESSIONS': {
      const sessions = await storage.getAllSessions();
      port.postMessage({ type: 'SESSIONS_LIST', payload: { sessions } });
      break;
    }

    case 'DELETE_SESSION': {
      await storage.deleteSession(message.payload.sessionId);
      await storage.deleteEventsBySession(message.payload.sessionId);
      const sessions = await storage.getAllSessions();
      port.postMessage({ type: 'SESSIONS_LIST', payload: { sessions } });
      break;
    }

    case 'GET_SETTING': {
      const record = await storage._get('settings', message.payload.key);
      port.postMessage({
        type: 'SETTING_VALUE',
        payload: { key: message.payload.key, value: record?.value ?? null },
      });
      break;
    }

    case 'SET_SETTING': {
      await storage._put('settings', { key: message.payload.key, value: message.payload.value });
      port.postMessage({ type: 'SETTING_SAVED', payload: { key: message.payload.key } });
      break;
    }

    case 'GET_SESSION_META': {
      const session = await storage.getSession(message.payload.sessionId);
      port.postMessage({ type: 'SESSION_META', payload: { session } });
      break;
    }

    case 'SAVE_BPMN_DRAFT': {
      const draftId = `draft-${message.payload.sessionId}-${Date.now()}`;
      await storage._put('bpmn-drafts', {
        id:        draftId,
        sessionId: message.payload.sessionId,
        xml:       message.payload.xml,
        context:   message.payload.context || '',
        createdAt: Date.now(),
      });
      port.postMessage({ type: 'BPMN_DRAFT_SAVED', payload: { draftId } });
      break;
    }

    default:
      console.warn('[FL SW] Unknown panel message:', message.type);
  }
}

// ─── PROMPT BUILDER ───────────────────────────────────────────────────────────
function buildPrompt(events, context, sessionMeta) {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  // Serializza gli eventi in formato leggibile
  const eventLines = sorted.map((ev, i) => {
    const t = new Date(ev.timestamp).toISOString().slice(11, 23);
    switch (ev.source) {
      case 'navigation':
        return `${i+1}. [NAV] ${t} — ${ev.navigation?.trigger || 'navigate'}: ${ev.navigation?.toUrl || ''}`;
      case 'interaction': {
        const it = ev.interaction || {};
        const el = `${it.elementTag || '?'}${it.elementId ? '#'+it.elementId : ''}`;
        const txt = it.elementText ? ` "${it.elementText.slice(0,60)}"` : '';
        const act = it.dataAttributes?.['data-action'] ? ` [${it.dataAttributes['data-action']}]` : '';
        return `${i+1}. [UI] ${t} — ${ev.type} su ${el}${act}${txt}`;
      }
      case 'network': {
        const n = ev.network || {};
        const status = n.statusCode ? ` → ${n.statusCode}` : '';
        const dur    = n.duration   ? ` (${n.duration}ms)` : '';
        return `${i+1}. [NET] ${t} — ${n.method} ${n.url}${status}${dur}`;
      }
      case 'error': {
        const e = ev.error || {};
        return `${i+1}. [ERR] ${t} — ${e.errorType}: ${e.message}`;
      }
      case 'dom':
        return `${i+1}. [DOM] ${t} — ${ev.domMutation?.summary || 'mutation'}`;
      default:
        return `${i+1}. [SYS] ${t} — ${ev.type}`;
    }
  }).join('\n');

  const duration = sessionMeta?.endTime && sessionMeta?.startTime
    ? Math.round((sessionMeta.endTime - sessionMeta.startTime) / 1000) + 's'
    : 'N/A';

  return `Sei un esperto di modellazione di processi aziendali (BPM). 
Il tuo compito è analizzare una sequenza di eventi browser e generare un diagramma BPMN 2.0 in formato XML che rappresenti il processo utente osservato.

## Contesto della sessione
${context ? context : 'Nessun contesto fornito dall\'utente.'}

## Metadati sessione
- URL iniziale: ${sessionMeta?.url || 'N/A'}
- Durata: ${duration}
- Totale eventi: ${sorted.length}

## Sequenza eventi registrati
${eventLines}

## Istruzioni per la generazione BPMN

Analizza la sequenza di eventi e identifica:
1. **Start Event** — il punto di inizio del processo
2. **Tasks** — le azioni significative dell'utente (click su bottoni, submit form, navigazioni importanti)
3. **Gateways** — se ci sono decisioni o percorsi alternativi (es. errori, redirect condizionali)
4. **End Event** — il punto di fine del processo

Regole:
- Ignora eventi tecnici di basso livello (es. chiamate API interne, mutazioni DOM minori)
- Concentrati sul flusso logico dal punto di vista dell'utente
- Usa nomi descrittivi in italiano per task e gateway
- Il BPMN deve essere valido e conforme allo standard 2.0
- Includi almeno un pool con una lane

Rispondi SOLO con il XML BPMN 2.0, senza testo aggiuntivo, senza markdown, senza backtick.
Il tuo output deve iniziare con: <?xml version="1.0" encoding="UTF-8"?>`;
}

// ─── LLM CLIENT ───────────────────────────────────────────────────────────────
async function handleGenerateBpmn(payload, port) {
  await ensureDb();
  const { sessionId, context } = payload;

  try {
    // 1. Leggi API key
    const keyRecord = await storage._get('settings', 'anthropic_api_key');
    const apiKey    = keyRecord?.value;
    if (!apiKey) {
      port.postMessage({ type: 'BPMN_ERROR', payload: { message: 'API key non configurata. Vai nelle Impostazioni.' } });
      return;
    }

    // 2. Carica eventi e sessione
    const [events, session] = await Promise.all([
      storage.getEventsBySession(sessionId),
      storage.getSession(sessionId),
    ]);

    if (!events.length) {
      port.postMessage({ type: 'BPMN_ERROR', payload: { message: 'Nessun evento trovato per questa sessione.' } });
      return;
    }

    // 3. Notifica inizio generazione
    port.postMessage({ type: 'BPMN_GENERATING', payload: { sessionId } });

    // 4. Costruisci prompt
    const prompt = buildPrompt(events, context || '', session);

    // 5. Chiama API Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':            'application/json',
        'x-api-key':               apiKey,
        'anthropic-version':       '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data    = await response.json();
    const xmlRaw  = data.content?.[0]?.text || '';

    // 6. Estrai e valida XML
    const xml = extractBpmnXml(xmlRaw);
    if (!xml) {
      throw new Error('La risposta non contiene XML BPMN valido.');
    }

    // 7. Salva in bpmn-drafts
    const draftId = `draft-${sessionId}-${Date.now()}`;
    await storage._put('bpmn-drafts', {
      id:        draftId,
      sessionId,
      xml,
      context:   context || '',
      createdAt: Date.now(),
    });

    // 8. Invia risultato al panel
    port.postMessage({
      type: 'BPMN_READY',
      payload: { sessionId, draftId, xml },
    });

    console.log(`[FL SW] BPMN generated — draft: ${draftId}`);

  } catch (err) {
    console.error('[FL SW] BPMN generation error:', err);
    port.postMessage({
      type: 'BPMN_ERROR',
      payload: { message: err.message || 'Errore durante la generazione.' },
    });
  }
}

function extractBpmnXml(raw) {
  if (!raw) return null;
  // Cerca il blocco XML
  const match = raw.match(/<\?xml[\s\S]*?<\/definitions>/i)
             || raw.match(/<definitions[\s\S]*?<\/definitions>/i);
  if (match) return match[0].trim();
  // Se inizia direttamente con <?xml
  if (raw.trim().startsWith('<?xml') || raw.trim().startsWith('<definitions')) {
    return raw.trim();
  }
  return null;
}

// ─── START / STOP RECORDING ──────────────────────────────────────────────────
async function handleStartRecording(payload, tabId, port) {
  await ensureDb();
  const resolvedTabId = payload?.tabId || tabId;
  if (swState.isRecording) {
    port.postMessage({ type: 'ERROR', payload: { message: 'Recording already active' } });
    return;
  }

  const sessionId = generateSessionId();
  swState.isRecording      = true;
  swState.currentSessionId = sessionId;
  swState.activeTabId      = resolvedTabId;  

  await storage.createSession({
    id:         sessionId,
    tabId:      resolvedTabId,               
    url:        payload?.url || '',
    startTime:  Date.now(),
    status:     'recording',
    eventCount: 0,
  });

  try {
    await chrome.tabs.sendMessage(resolvedTabId, {
      type:    'START_CAPTURE',
      payload: { sessionId },
    });
  } catch (err) {
    console.warn('[FL SW] Could not notify content script:', err.message);
  }

  port.postMessage({
    type: 'RECORDING_STARTED',
    payload: { sessionId, timestamp: Date.now() },
  });

  console.log(`[FL SW] Recording started — session: ${sessionId}`);
}

async function handleStopRecording(tabId, port) {
  await ensureDb();

  // Se swState non è sincronizzato (es. SW riavviato da Chrome),
  // tenta un recovery immediato dal DB prima di rispondere con errore
  if (!swState.isRecording) {
    await recoverSwStateFromDb();
  }

  if (!swState.isRecording) {
    // Recovery fallito — nessuna sessione attiva trovata nel DB
    port.postMessage({ type: 'ERROR', payload: { message: 'No active recording' } });
    return;
  }

  const sessionId = swState.currentSessionId;

  swState.isRecording      = false;
  swState.currentSessionId = null;
  swState.activeTabId      = null;

  await storage.updateSession(sessionId, {
    endTime: Date.now(),
    status:  'completed',
  });

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'STOP_CAPTURE' });
  } catch (err) {
    console.warn('[FL SW] Could not notify content script to stop:', err.message);
  }

  const events = await storage.getEventsBySession(sessionId);

  port.postMessage({
    type: 'RECORDING_STOPPED',
    payload: { sessionId, eventCount: events.length },
  });

  console.log(`[FL SW] Recording stopped — session: ${sessionId}, events: ${events.length}`);
}

// ─── HANDLERS EVENTI ─────────────────────────────────────────────────────────
async function handleEventsBatch(payload, tabId) {
  await ensureDb();
  const { events, sessionId } = payload;
  if (!events?.length) return;

  const processed = processEvents(events);
  if (!processed.length) return;

  await storage.saveEvents(processed);
  await storage.incrementEventCount(sessionId, processed.length);

  const port = swState.devtoolsConnections.get(tabId);
  if (port) {
    port.postMessage({
      type: 'EVENTS_RECEIVED',
      payload: { events: processed, sessionId },
    });
  }
}

async function handleSingleEvent(event, tabId) {
  await ensureDb();
  if (!event) return;
  await storage.saveEvents([event]);

  const port = swState.devtoolsConnections.get(tabId);
  if (port) {
    port.postMessage({
      type: 'EVENTS_RECEIVED',
      payload: { events: [event], sessionId: swState.currentSessionId },
    });
  }
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────
function generateSessionId() {
  const ts   = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `fl-${ts}-${rand}`;
}
