/**
 * Sevenda — DevTools Panel (Step 8 — Polish)
 * Error handling robusto, settings estese, UI polish.
 */

const FL_VERSION = 'v0.2.0';

// ─── STATO ───────────────────────────────────────────────────────────────────
const state = {
  port:            null,
  isRecording:     false,
  sessionId:       null,
  eventCount:      0,
  startTime:       null,
  timerInterval:   null,
  tabId:           chrome.devtools.inspectedWindow.tabId,
  view:            'live',
  events:          [],
  sessions:        [],
  replaySession:   null,
  replayEvents:    [],
  liveFilters:     { navigation: true, interaction: true, network: true, error: true, dom: true },
  liveSearch:      '',
  replayFilters:   { navigation: true, interaction: true, network: true, error: true, dom: true },
  replaySearch:    '',
  bpmnVisible:     false,
  currentBpmnXml:  null,
  apiKey:          null,
  settings: {
    maxEvents:       500,
    bpmnLang:        'it',
    excludedDomains: [],
  },
};

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const el = {
  btnStart:              document.getElementById('btnStart'),
  btnStop:               document.getElementById('btnStop'),
  btnClear:              document.getElementById('btnClear'),
  btnLive:               document.getElementById('btnLive'),
  btnSessions:           document.getElementById('btnSessions'),
  btnSettings:           document.getElementById('btnSettings'),
  statusBadge:           document.getElementById('statusBadge'),
  statusText:            document.getElementById('statusText'),
  sessionInfo:           document.getElementById('sessionInfo'),
  eventCount:            document.getElementById('eventCount'),
  logBody:               document.getElementById('logBody'),
  emptyState:            document.getElementById('emptyState'),
  viewLive:              document.getElementById('viewLive'),
  viewSessions:          document.getElementById('viewSessions'),
  sessionsList:          document.getElementById('sessionsList'),
  replayPanel:           document.getElementById('replayPanel'),
  replayTitle:           document.getElementById('replayTitle'),
  replayStats:           document.getElementById('replayStats'),
  replayBody:            document.getElementById('replayBody'),
  btnCloseReplay:              document.getElementById('btnCloseReplay'),
  btnReplayGenerateBpmn:       document.getElementById('btnReplayGenerateBpmn'),
  btnReplayGenerateInsights:   document.getElementById('btnReplayGenerateInsights'),
  searchInput:                 document.getElementById('searchInput'),
  replaySearch:                document.getElementById('replaySearch'),
  connDot:                     document.getElementById('connDot'),
  connStatus:                  document.getElementById('connStatus'),
  contextInput:                document.getElementById('contextInput'),
  btnGenerateBpmn:             document.getElementById('btnGenerateBpmn'),
  btnGenerateInsights:         document.getElementById('btnGenerateInsights'),
  bpmnPanel:             document.getElementById('bpmnPanel'),
  bpmnBody:              document.getElementById('bpmnBody'),
  btnCopyXml:            document.getElementById('btnCopyXml'),
  btnCloseBpmn:          document.getElementById('btnCloseBpmn'),
  modalSettings:         document.getElementById('modalSettings'),
  apiKeyInput:           document.getElementById('apiKeyInput'),
  btnSaveSettings:       document.getElementById('btnSaveSettings'),
  btnCancelSettings:     document.getElementById('btnCancelSettings'),
  btnCloseSettings:      document.getElementById('btnCloseSettings'),
  settingSavedMsg:       document.getElementById('settingSavedMsg'),
  linkApiKey:            document.getElementById('linkApiKey'),
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function formatTime(ts) {
  const d  = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function formatDuration(ms) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function truncateUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const p = u.pathname.length > 30 ? u.pathname.slice(0, 30) + '…' : u.pathname;
    return u.hostname + p;
  } catch { return url.slice(0, 45); }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getBadge(event) {
  const map = {
    navigation:  { cls: 'badge-navigation',  label: 'NAV' },
    interaction: { cls: 'badge-interaction', label: 'UI'  },
    network:     { cls: 'badge-network',     label: 'NET' },
    error:       { cls: 'badge-error',       label: 'ERR' },
    dom:         { cls: 'badge-dom',         label: 'DOM' },
  };
  return map[event.source] || { cls: 'badge-system', label: 'SYS' };
}

function getEventMessage(event) {
  switch (event.source) {
    case 'navigation':
      return `${event.navigation?.trigger || ''} → ${event.navigation?.toUrl || ''}`;
    case 'interaction': {
      const i = event.interaction || {};
      const id     = i.elementId   ? `#${i.elementId}` : '';
      const text   = i.elementText ? ` "${i.elementText.slice(0, 40)}"` : '';
      const action = i.dataAttributes?.['data-action'] ? ` [${i.dataAttributes['data-action']}]` : '';
      return `${event.type} ${i.elementTag || '?'}${id}${action}${text}`.trim();
    }
    case 'network': {
      const n = event.network || {};
      const status = n.statusCode ? ` → ${n.statusCode}` : '';
      const dur    = n.duration   ? ` (${n.duration}ms)` : '';
      return `${n.method || 'GET'} ${n.url || ''}${status}${dur}`;
    }
    case 'error':
      return `${event.error?.errorType || 'error'}: ${event.error?.message || ''}`;
    case 'dom':
      return event.domMutation?.summary || 'DOM mutation';
    default:
      return JSON.stringify(event).slice(0, 80);
  }
}

function getEventDetail(event) {
  const rows = [];
  switch (event.source) {
    case 'navigation':
      rows.push(['Da', event.navigation?.fromUrl || '—', false]);
      rows.push(['A',  event.navigation?.toUrl   || '—', true]);
      rows.push(['Trigger', event.navigation?.trigger || '—', false]);
      break;
    case 'interaction': {
      const i = event.interaction || {};
      rows.push(['Tag', i.elementTag || '—', false]);
      if (i.elementId)   rows.push(['ID',    i.elementId,   true]);
      if (i.elementText) rows.push(['Testo', i.elementText, false]);
      if (i.elementType) rows.push(['Type',  i.elementType, false]);
      if (i.href)        rows.push(['Href',  i.href,        true]);
      if (i.xpath)       rows.push(['XPath', i.xpath,       false]);
      Object.entries(i.dataAttributes || {}).forEach(([k, v]) => rows.push([k, v, false]));
      break;
    }
    case 'network': {
      const n = event.network || {};
      rows.push(['URL',    n.url        || '—', true]);
      rows.push(['Method', n.method     || '—', false]);
      rows.push(['Status', n.statusCode || '—', false]);
      if (n.duration)        rows.push(['Durata',   `${n.duration}ms`, false]);
      if (n.requestBody)     rows.push(['Request',  n.requestBody.slice(0, 300), false]);
      if (n.responsePreview) rows.push(['Response', n.responsePreview.slice(0, 300), false]);
      break;
    }
    case 'error': {
      const e = event.error || {};
      rows.push(['Tipo',      e.errorType || '—', false]);
      rows.push(['Messaggio', e.message   || '—', false]);
      if (e.filename) rows.push(['File',  e.filename, false]);
      if (e.lineno)   rows.push(['Riga',  `${e.lineno}:${e.colno}`, false]);
      if (e.stack)    rows.push(['Stack', e.stack.slice(0, 400), false]);
      break;
    }
    case 'dom': {
      const d = event.domMutation || {};
      rows.push(['Tipo',      d.mutationType   || '—', false]);
      rows.push(['Selettore', d.targetSelector || '—', true]);
      rows.push(['Sommario',  d.summary        || '—', false]);
      break;
    }
  }
  rows.push(['Session', event.sessionId || '—', false]);
  rows.push(['ID',      event.id        || '—', false]);
  return rows;
}

// ─── RENDER EVENT ROW ────────────────────────────────────────────────────────
function createEventRow(event) {
  const badge   = getBadge(event);
  const message = getEventMessage(event);
  const detail  = getEventDetail(event);

  const row = document.createElement('div');
  row.className = 'log-entry';
  row.dataset.source = event.source || '';
  row.innerHTML = `
    <span class="log-time">${escHtml(formatTime(event.timestamp))}</span>
    <span class="log-badge ${badge.cls}">${badge.label}</span>
    <span class="log-msg" title="${escHtml(message)}">${escHtml(message)}</span>
  `;

  const detailRow = document.createElement('div');
  detailRow.className = 'log-entry event-detail-row hidden';
  detailRow.style.gridTemplateColumns = '1fr';
  detailRow.innerHTML = `
    <div class="event-detail">
      <div class="detail-grid">
        ${detail.map(([k, v, hl]) => `
          <span class="detail-key">${escHtml(k)}</span>
          <span class="detail-val${hl ? ' hl' : ''}">${escHtml(String(v))}</span>
        `).join('')}
      </div>
    </div>
  `;

  let expanded = false;
  row.addEventListener('click', () => {
    expanded = !expanded;
    row.classList.toggle('expanded', expanded);
    detailRow.classList.toggle('hidden', !expanded);
  });

  return [row, detailRow];
}

// ─── FILTRI ──────────────────────────────────────────────────────────────────
function applyFilters(container, filters, search) {
  const entries = container.querySelectorAll('.log-entry[data-source]');
  entries.forEach(row => {
    const source = row.dataset.source;
    const msg    = row.querySelector('.log-msg')?.textContent || '';
    const show   = filters[source] !== false &&
                   (!search || msg.toLowerCase().includes(search.toLowerCase()));
    row.classList.toggle('hidden', !show);
    const next = row.nextElementSibling;
    if (next?.classList.contains('event-detail-row') && !show) {
      next.classList.add('hidden');
    }
  });
}

function setupFilterChips(container, filters, onUpdate) {
  container.querySelectorAll('.filter-chip').forEach(chip => {
    const source = chip.dataset.source;
    chip.addEventListener('click', () => {
      filters[source] = !filters[source];
      chip.classList.toggle('off', !filters[source]);
      onUpdate();
    });
  });
}

// ─── CONNESSIONE SW ──────────────────────────────────────────────────────────
function connect() {
  state.port = chrome.runtime.connect({ name: 'devtools-panel' });
  state.port.onMessage.addListener(handleSWMessage);
  state.port.onDisconnect.addListener(() => {
    setConnected(false);
    setTimeout(connect, 2000);
  });
  state.port.postMessage({ type: 'PANEL_INIT', payload: { tabId: state.tabId } });
  setConnected(true);
  // Carica API key e settings
  state.port.postMessage({ type: 'GET_SETTING', payload: { key: 'anthropic_api_key' } });
  state.port.postMessage({ type: 'GET_SETTING', payload: { key: 'fl_settings' } });
}

function setConnected(ok) {
  el.connDot.classList.toggle('connected', ok);
  el.connStatus.textContent = ok
    ? `Connesso al service worker — Tab ${state.tabId}`
    : 'Disconnesso — riconnessione in corso…';
}

// ─── MESSAGGI SW ─────────────────────────────────────────────────────────────
function handleSWMessage(msg) {
  switch (msg.type) {
    case 'STATE_SYNC':
  if (msg.payload.isRecording) {
    state.isRecording = true;
    state.sessionId   = msg.payload.sessionId;
    setUIRecording(true);
    addSysLog(`Sessione già attiva: ${state.sessionId}`);
  }
  break;

    case 'RECORDING_STARTED':
      state.isRecording        = true;
      state.sessionId          = msg.payload.sessionId;
      state.startTime          = msg.payload.timestamp;
      state.eventCount         = 0;
      state.events             = [];
      state.currentBpmnXml     = null;
      state.insightsData       = null;
      state._insightsSessionId = null;
      el.eventCount.textContent        = '0';
      el.btnGenerateBpmn.disabled      = true;
      el.btnGenerateInsights.disabled  = true;
      hideBpmnPanel();
      setUIRecording(true);
      startTimer();
      switchView('live');
      addSysLog(`Registrazione avviata — ${state.sessionId}`);
      break;

    case 'RECORDING_STOPPED':
      state.isRecording = false;
      stopTimer();
      setUIRecording(false);
      el.btnGenerateBpmn.disabled     = state.eventCount === 0;
      el.btnGenerateInsights.disabled = state.eventCount === 0;
      if (!state.apiKey) {
        el.btnGenerateBpmn.title     = '🔑 Configura la API key nelle ⚙ Impostazioni';
        el.btnGenerateInsights.title = '🔑 Configura la API key nelle ⚙ Impostazioni';
      } else {
        el.btnGenerateBpmn.title     = '';
        el.btnGenerateInsights.title = '';
      }
      addSysLog(`Registrazione fermata — ${msg.payload.eventCount} eventi`);
      break;

    case 'EVENTS_RECEIVED':
      if (msg.payload.events?.length) {
        msg.payload.events.forEach(ev => {
          state.events.push(ev);
          appendEventToLog(ev, el.logBody);
        });
        state.eventCount += msg.payload.events.length;
        el.eventCount.textContent = state.eventCount;
      }
      break;

    case 'SESSIONS_LIST':
      state.sessions = (msg.payload.sessions || []).sort((a, b) => b.startTime - a.startTime);
      renderSessionsList();
      break;

    case 'SESSION_EVENTS':
      state.replayEvents = msg.payload.events || [];
      renderReplayEvents();
      // Se la generazione BPMN era in attesa degli eventi, avviala ora
      if (state._pendingBpmnGeneration) {
        const { context } = state._pendingBpmnGeneration;
        state._pendingBpmnGeneration = null;
        runBpmnGeneration(state.replayEvents, context, state.replaySession);
      }
      break;

    case 'SETTING_VALUE':
      if (msg.payload.key === 'anthropic_api_key' && msg.payload.value) {
        state.apiKey             = msg.payload.value;
        el.apiKeyInput.value     = msg.payload.value;
        el.btnGenerateBpmn.title     = '';
        el.btnGenerateInsights.title = '';
      }
      if (msg.payload.key === 'fl_settings' && msg.payload.value) {
        try {
          const saved = JSON.parse(msg.payload.value);
          Object.assign(state.settings, saved);
        } catch {}
      }
      break;

    case 'SETTING_SAVED':
      el.settingSavedMsg.classList.remove('hidden');
      setTimeout(() => el.settingSavedMsg.classList.add('hidden'), 2500);
      break;

    case 'BPMN_DRAFT_SAVED':
      addSysLog(`✦ Bozza BPMN salvata: ${msg.payload.draftId}`);
      break;

    case 'ERROR':
      addSysLog(`⚠ ${msg.payload.message}`);
      break;
  }
}

// ─── APPEND EVENT ─────────────────────────────────────────────────────────────
// Numero massimo di righe visibili nel log stream live.
// Oltre questo limite le righe più vecchie vengono rimosse
// per evitare rallentamenti con sessioni molto lunghe.
const LOG_MAX_ROWS = 200;

function appendEventToLog(event, container) {
  const empty = container.querySelector('.empty-state');
  if (empty) empty.remove();

  const [row, detailRow] = createEventRow(event);
  const filters = container === el.logBody ? state.liveFilters : state.replayFilters;
  const search  = container === el.logBody ? state.liveSearch  : state.replaySearch;
  const show = filters[event.source] !== false &&
               (!search || getEventMessage(event).toLowerCase().includes(search.toLowerCase()));
  if (!show) row.classList.add('hidden');

  container.appendChild(row);
  container.appendChild(detailRow);

  // Virtualizzazione leggera: rimuove le righe più vecchie quando si supera il limite.
  // Si applica solo al log stream live (non al replay, che è statico).
  if (container === el.logBody) {
    const rows = container.querySelectorAll('.log-entry:not(.log-detail)');
    if (rows.length > LOG_MAX_ROWS) {
      // Rimuove le prime N righe eccedenti (e i relativi detailRow)
      const excess = rows.length - LOG_MAX_ROWS;
      for (let i = 0; i < excess; i++) {
        const old = rows[i];
        const next = old.nextElementSibling;
        if (next?.classList.contains('log-detail')) next.remove();
        old.remove();
      }
    }
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    if (atBottom) container.scrollTop = container.scrollHeight;
  }
}

function addSysLog(message) {
  const empty = el.logBody.querySelector('.empty-state');
  if (empty) empty.remove();
  const row = document.createElement('div');
  row.className = 'log-entry';
  row.style.cursor = 'default';
  row.innerHTML = `
    <span class="log-time">${escHtml(formatTime(Date.now()))}</span>
    <span class="log-badge badge-system">SYS</span>
    <span class="log-msg" style="color:var(--text-muted)">${escHtml(message)}</span>
  `;
  el.logBody.appendChild(row);
  el.logBody.scrollTop = el.logBody.scrollHeight;
}

// ─── BPMN PANEL ──────────────────────────────────────────────────────────────
let _bpmnViewer = null;
let _bpmnView   = 'xml'; // 'xml' | 'diagram'

function getBpmnViewer() {
  if (_bpmnViewer) return _bpmnViewer;
  if (typeof BpmnJS === 'undefined') return null;
_bpmnViewer = new BpmnJS({
    container: document.getElementById('bpmnDiagramView'),
  });
  return _bpmnViewer;
}

function showBpmnPanel() {
  state.bpmnVisible = true;
  el.bpmnPanel.classList.remove('hidden');
}

function hideBpmnPanel() {
  state.bpmnVisible = false;
  el.bpmnPanel.classList.add('hidden');
}

function setBpmnView(view) {
  _bpmnView = view;
  const xmlView     = document.getElementById('bpmnXmlView');
  const diagramView = document.getElementById('bpmnDiagramView');
  const insView     = document.getElementById('insightsView');
  const btnXml      = document.getElementById('btnViewXml');
  const btnDiagram  = document.getElementById('btnViewDiagram');
  const btnIns      = document.getElementById('btnViewInsights');
  const xmlTools    = document.getElementById('bpmnXmlTools');
  const diagTools   = document.getElementById('bpmnDiagramTools');

  // Nascondi tutto
  xmlView?.classList.add('hidden');
  diagramView?.classList.add('hidden');
  insView?.classList.add('hidden');
  btnXml?.classList.remove('active');
  btnDiagram?.classList.remove('active');
  btnIns?.classList.remove('active');
  if (xmlTools)  xmlTools.style.display  = 'none';
  if (diagTools) diagTools.style.display = 'none';

  if (view === 'xml') {
    xmlView?.classList.remove('hidden');
    btnXml?.classList.add('active');
    if (xmlTools) xmlTools.style.display = 'flex';
  } else if (view === 'diagram') {
    diagramView?.classList.remove('hidden');
    btnDiagram?.classList.add('active');
    if (diagTools) diagTools.style.display = 'flex';
    if (state.currentBpmnXml) renderBpmnDiagram(state.currentBpmnXml);
  } else if (view === 'insights') {
    insView?.classList.remove('hidden');
    btnIns?.classList.add('active');
  }
}

function renderBpmnXml(xml) {
  const xmlView = document.getElementById('bpmnXmlView');
  if (!xmlView) return;
  const highlighted = xml
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(&lt;\/?[\w:.-]+)/g, '<span style="color:#7aafd4">$1</span>')
    .replace(/([\w:.-]+)=&quot;/g, '<span style="color:#6BB89A">$1</span>=<span style="color:#c9875a">&quot;')
    .replace(/&quot;(?=[\s\/>])/g, '&quot;</span>');
  xmlView.innerHTML = `<div class="bpmn-xml">${highlighted}</div>`;
}

async function renderBpmnDiagram(xml) {
  const viewer = getBpmnViewer();
  if (!viewer) { addSysLog('⚠ bpmn-js non disponibile'); return; }
  try {
    await viewer.importXML(xml);
    viewer.get('canvas').zoom('fit-viewport');
  } catch (err) {
    const msg = `⚠ Errore rendering: ${err.message}`;
    addSysLog(msg);
    // Mostra l'errore nel pannello BPMN con il pulsante Riprova
    showBpmnError(msg);
  }
}

async function exportSvg() {
  const viewer = getBpmnViewer();
  if (!viewer || !state.currentBpmnXml) return;
  try {
    if (_bpmnView !== 'diagram') await viewer.importXML(state.currentBpmnXml);
    const { svg } = await viewer.saveSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `bpmn-${state.sessionId || 'export'}.svg`;
    a.click(); URL.revokeObjectURL(url);
    addSysLog('↓ SVG esportato');
  } catch (err) {
    addSysLog(`⚠ Errore export: ${err.message}`);
  }
}

// ─── STEP 10: EXPORT CAMUNDA ──────────────────────────────────────────────────
// Arricchisce il BPMN con attributi Camunda-specifici e lo scarica come .bpmn
// pronto per essere aperto con Camunda Modeler (doppio click sul file).
function exportCamunda() {
  if (!state.currentBpmnXml) {
    showToast('Nessun BPMN da esportare', 'error');
    return;
  }

  try {
    const xml = adaptForCamunda(state.currentBpmnXml);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sevenda-${state.sessionId || 'process'}.bpmn`;
    a.click();
    URL.revokeObjectURL(url);
    addSysLog('↓ BPMN esportato per Camunda Modeler');
    showToast('File .bpmn scaricato — aprilo con Camunda Modeler ✓', 'success');
  } catch (err) {
    addSysLog(`⚠ Errore export Camunda: ${err.message}`);
    showToast('Errore durante l\'export', 'error');
  }
}

function adaptForCamunda(xml) {
  let out = xml;

  // 1. Aggiunge il namespace Camunda se mancante
  if (!out.includes('xmlns:camunda')) {
    out = out.replace(
      /(<definitions[^>]*)(>)/,
      '$1 xmlns:camunda="http://camunda.org/schema/1.0/bpmn"$2'
    );
  }

  // 2. Imposta isExecutable="true" sul processo principale
  //    (necessario per il deploy su Camunda Engine)
  out = out.replace(
    /(<process\b[^>]*)\bisExecutable="false"/g,
    '$1 isExecutable="true"'
  );
  // Se isExecutable non è presente, lo aggiunge
  out = out.replace(
    /(<process\b(?![^>]*\bisExecutable)[^>]*)(\/?>)/g,
    '$1 isExecutable="true"$2'
  );

  // 3. Aggiunge targetNamespace Camunda se mancante
  if (!out.includes('targetNamespace')) {
    out = out.replace(
      /(<definitions[^>]*)(>)/,
      '$1 targetNamespace="http://bpmn.io/schema/bpmn"$2'
    );
  }

  // 4. Aggiunge exporter info per Camunda Modeler
  if (!out.includes('exporter=')) {
    out = out.replace(
      /(<definitions[^>]*)(>)/,
      '$1 exporter="Sevenda" exporterVersion="0.2.0"$2'
    );
  }

  return out;
}

// ─── PROMPT BUILDER ───────────────────────────────────────────────────────────
function buildPrompt(events, context, sessionMeta) {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const eventLines = sorted.map((ev, i) => {
    const t = new Date(ev.timestamp).toISOString().slice(11, 23);
    switch (ev.source) {
      case 'navigation':
        return `${i+1}. [NAV] ${t} — ${ev.navigation?.trigger || 'navigate'}: ${ev.navigation?.toUrl || ''}`;
      case 'interaction': {
        const it = ev.interaction || {};
        const elem = `${it.elementTag || '?'}${it.elementId ? '#'+it.elementId : ''}`;
        const txt  = it.elementText ? ` "${it.elementText.slice(0, 60)}"` : '';
        const act  = it.dataAttributes?.['data-action'] ? ` [${it.dataAttributes['data-action']}]` : '';
        return `${i+1}. [UI] ${t} — ${ev.type} su ${elem}${act}${txt}`;
      }
      case 'network': {
        const n = ev.network || {};
        const status = n.statusCode ? ` → ${n.statusCode}` : '';
        const dur    = n.duration   ? ` (${n.duration}ms)` : '';
        return `${i+1}. [NET] ${t} — ${n.method} ${n.url}${status}${dur}`;
      }
      case 'error':
        return `${i+1}. [ERR] ${t} — ${ev.error?.errorType}: ${ev.error?.message}`;
      case 'dom':
        return `${i+1}. [DOM] ${t} — ${ev.domMutation?.summary || 'mutation'}`;
      default:
        return `${i+1}. [SYS] ${t} — ${ev.type}`;
    }
  }).join('\n');

  const duration = sessionMeta?.endTime && sessionMeta?.startTime
    ? Math.round((sessionMeta.endTime - sessionMeta.startTime) / 1000) + 's'
    : 'N/A';

  const lang = state.settings.bpmnLang === 'en' ? 'English' : 'italiano';
  const langNote = state.settings.bpmnLang === 'en'
    ? 'Use English for all task and gateway names.'
    : 'Usa nomi descrittivi in italiano per task e gateway.';

  // Calcola dimensioni swimlane dinamicamente in base al numero di elementi
  const estimatedElements = Math.max(sorted.length, 4);
  const laneWidth  = Math.max(1400, estimatedElements * 180);
  const laneHeight = 200;
  const poolHeight = laneHeight + 30;

  return `Sei un esperto di modellazione di processi aziendali (BPM) e di notazione BPMN 2.0.
Il tuo compito è analizzare una sequenza di eventi browser e generare un diagramma BPMN 2.0 in formato XML valido e renderizzabile da bpmn-js (Camunda).

## Contesto della sessione
${context ? context : 'Nessun contesto fornito dall\'utente.'}

## Metadati sessione
- URL iniziale: ${sessionMeta?.url || 'N/A'}
- Durata: ${duration}
- Totale eventi: ${sorted.length}

## Sequenza eventi registrati
${eventLines}

## Istruzioni per la generazione BPMN

### 1. Analisi degli eventi
Identifica dal flusso di eventi:
- **Start Event** — il punto di inizio del processo
- **Task** — le azioni significative (vedi regole tipo task sotto)
- **Gateway** — decisioni o percorsi alternativi (usa ExclusiveGateway per scelte, ParallelGateway per azioni simultanee)
- **End Event** — il punto di fine del processo

Ignora eventi tecnici di basso livello (chiamate API interne ripetute, mutazioni DOM minori, prefetch).

### 2. Regole per il tipo di Task
Classifica ogni task nel tipo corretto in base all'evento che lo ha generato:
- **userTask** → click su bottone, link, checkbox, select, qualsiasi interazione diretta dell'utente con la UI
- **manualTask** → azioni fisiche fuori sistema (es. stampa, firma, verifica documento)
- **serviceTask** → chiamate API automatiche (NET events con POST/PUT/DELETE/PATCH), operazioni di sistema
- **sendTask** → invio email, notifica, messaggio
- **receiveTask** → attesa risposta esterna, polling
- **scriptTask** → elaborazione automatica senza intervento utente
- **task** → solo se non classificabile in nessuna delle categorie precedenti

Usa SEMPRE il tipo più specifico disponibile. Mai usare <task> generico quando è classificabile.

### 3. Regole CRITICHE per il layout e le dimensioni

RISPETTA ESATTAMENTE queste regole di layout — sono obbligatorie:

**Pool e Lane:**
- Il pool deve contenere UNA sola lane
- Larghezza pool e lane: ${laneWidth}px (DEVE essere sufficiente a contenere tutti gli elementi)
- Altezza pool: ${poolHeight}px, altezza lane: ${laneHeight}px
- Pool x=0, y=0; Lane x=30, y=30 (offset standard bpmn-js)

**Posizionamento elementi (sinistra → destra):**
- Start Event: x=80, y=112, width=36, height=36 (centro lane: y = 30 + ${laneHeight}/2 - 18)
- Ogni elemento successivo: x incrementale di 160px
- Task: width=100, height=80; centrare verticalmente nella lane: y = 30 + ${laneHeight}/2 - 40
- Gateway (rombo): width=50, height=50; centrare: y = 30 + ${laneHeight}/2 - 25
- End Event: width=36, height=36; centrare: y = 30 + ${laneHeight}/2 - 18
- L'End Event deve avere x = (ultimo elemento x) + 160

**Sequence Flow (CRITICO — causa errori di rendering):**
- OGNI coppia di elementi consecutivi DEVE avere un SequenceFlow
- sourceRef e targetRef DEVONO corrispondere esattamente agli id degli elementi
- I waypoint devono essere il centro dell'elemento sorgente e il centro dell'elemento target
- Centro di un Task: cx = x + 50, cy = y + 40
- Centro di un Gateway: cx = x + 25, cy = y + 25
- Centro di Start/End Event: cx = x + 18, cy = y + 18
- Non usare MAI waypoint che escano dai confini della lane

**BPMNShape e BPMNEdge:**
- OGNI elemento del processo (task, gateway, evento) DEVE avere il suo BPMNShape in BPMNDiagram
- OGNI SequenceFlow DEVE avere il suo BPMNEdge in BPMNDiagram
- isHorizontal="true" sul BPMNPlane e sulla lane
- Il Pool DEVE avere isExpanded="true"

### 4. Struttura XML obbligatoria

\`\`\`
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
             targetNamespace="http://bpmn.io/schema/bpmn"
             exporter="Sevenda" exporterVersion="0.2.0">
  <process id="Process_1" isExecutable="true">
    <startEvent id="StartEvent_1" name="...">
      <outgoing>Flow_1</outgoing>
    </startEvent>
    <userTask id="Task_1" name="...">   <!-- usa il tipo corretto -->
      <incoming>Flow_1</incoming>
      <outgoing>Flow_2</outgoing>
    </userTask>
    <!-- altri elementi -->
    <endEvent id="EndEvent_1" name="...">
      <incoming>Flow_N</incoming>
    </endEvent>
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
    <!-- tutti i sequence flow -->
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <!-- BPMNShape per ogni elemento, BPMNEdge per ogni flow -->
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
\`\`\`

### 5. Lingua
${langNote}

### 6. Validazione finale (esegui mentalmente prima di rispondere)
Prima di generare l'output, verifica:
- [ ] Ogni elemento ha il suo BPMNShape con bounds corretti
- [ ] Ogni SequenceFlow ha il suo BPMNEdge con waypoint validi
- [ ] sourceRef e targetRef di ogni Flow corrispondono a id esistenti
- [ ] La larghezza del pool/lane è sufficiente a contenere tutti gli elementi
- [ ] L'End Event è incluso nella lane e ha un SequenceFlow in ingresso
- [ ] Non ci sono elementi sovrapposti

Rispondi SOLO con il XML BPMN 2.0, senza testo aggiuntivo, senza markdown, senza backtick.
Il tuo output deve iniziare con: <?xml version="1.0" encoding="UTF-8"?>`;
}

// ─── LLM CLIENT (nel panel, no timeout SW) ───────────────────────────────────
async function runBpmnGeneration(events, context, sessionMeta) {
  if (!state.apiKey) {
    showBpmnError('🔑 API key non configurata.\nClicca su ⚙ Settings per inserirla.');
    showToast('Configura la API key nelle Settings', 'error');
    return;
  }
  if (!events?.length) {
    showBpmnError('Nessun evento trovato per questa sessione.');
    return;
  }

  // Filtra domini esclusi
  let filteredEvents = events;
  if (state.settings.excludedDomains.length) {
    filteredEvents = events.filter(ev => {
      const url = ev.network?.url || ev.navigation?.toUrl || '';
      return !state.settings.excludedDomains.some(d => url.includes(d));
    });
  }

  // Applica limite massimo eventi
  if (filteredEvents.length > state.settings.maxEvents) {
    filteredEvents = filteredEvents.slice(-state.settings.maxEvents);
    addSysLog(`⚠ Eventi troncati a ${state.settings.maxEvents} (limite impostato)`);
  }

  showBpmnPanel();
  const xmlView = document.getElementById('bpmnXmlView');
  if (xmlView) xmlView.innerHTML = `
    <div class="bpmn-generating">
      <div class="bpmn-spinner"></div>
      <div>Generazione BPMN in corso…</div>
    </div>`;
  setBpmnView('xml');
  addSysLog('✦ Chiamata a Claude in corso…');

  // Aggiorna bottone durante generazione
  const btnGen = document.getElementById('btnGenerateBpmn');
  const origText = btnGen?.textContent;
  if (btnGen) { btnGen.textContent = '⏳…'; btnGen.disabled = true; }

  try {
    const prompt   = buildPrompt(filteredEvents, context, sessionMeta);

    // AbortController: annulla la richiesta dopo 90 secondi
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 90_000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 8192,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    // Legge i token rimanenti per calibrare il cooldown adattivo di "📄 Analisi"
    const tokensRemaining = parseInt(response.headers.get('anthropic-ratelimit-tokens-remaining') || '0', 10);
    const resetAfterMs    = parseFloat(response.headers.get('anthropic-ratelimit-tokens-reset') || '0') * 1000;
    state._bpmnTokensRemaining = tokensRemaining;
    state._bpmnRateLimitReset  = resetAfterMs > 0 ? Date.now() + resetAfterMs + 5000 : 0;

    const data   = await response.json();
    const xmlRaw = data.content?.[0]?.text || '';
    const xml    = extractBpmnXml(xmlRaw);

    if (!xml) throw new Error('La risposta non contiene XML BPMN valido.');

    state.currentBpmnXml = xml;
    showBpmnPanel();
    renderBpmnXml(xml);
    setBpmnView('xml');
    initBpmnChat();
    setJiraButtonVisible(true);
    addSysLog('✦ BPMN generato con successo');
    showToast('BPMN generato con successo ✓', 'success');

    if (sessionMeta?.id && state.port) {
      try {
        state.port.postMessage({
          type: 'SAVE_BPMN_DRAFT',
          payload: { sessionId: sessionMeta.id, xml, context: context || '' },
        });
      } catch (e) {
        console.warn('[FL] Could not save BPMN draft — port disconnected');
      }
    }

  } catch (err) {
    let errMsg = err.message || 'Errore durante la generazione.';
    if (err.name === 'AbortError') {
      errMsg = '⏱ Timeout: la generazione ha impiegato più di 90 secondi. Riprova.';
      showToast('Timeout generazione BPMN', 'error');
    } else if (errMsg.includes('401') || errMsg.includes('invalid x-api-key')) {
      errMsg = '🔑 API key non valida o scaduta. Aggiornala nelle Settings.';
      showToast('API key non valida', 'error');
    } else if (errMsg.includes('429')) {
      errMsg = '⏱ Troppe richieste. Attendi qualche secondo e riprova.';
      showToast('Rate limit raggiunto', 'error');
    } else if (errMsg.includes('529') || errMsg.includes('overloaded')) {
      errMsg = '🔄 Claude è sovraccarico. Riprova tra qualche istante.';
      showToast('Servizio momentaneamente sovraccarico', 'error');
    } else {
      showToast('Errore durante la generazione', 'error');
    }
    showBpmnError(errMsg);
    addSysLog(`⚠ Errore BPMN: ${err.message}`);
  } finally {
    if (btnGen) { btnGen.textContent = origText || 'BPMN'; btnGen.disabled = false; }
  }
}

function extractBpmnXml(raw) {
  if (!raw) return null;

  // Normalizza: rimuove backtick markdown, spazi iniziali, prefissi "xml" dopo backtick
  let text = raw
    .replace(/^```xml\s*/im, '')   // ```xml all'inizio
    .replace(/^```\s*/im, '')      // ``` generico all'inizio
    .replace(/```\s*$/im, '')      // ``` alla fine
    .trim();

  // Rimuove qualsiasi testo prima di <?xml o <definitions
  const xmlStart = text.search(/<\?xml|<definitions/i);
  if (xmlStart > 0) text = text.slice(xmlStart);

  // Cerca il pattern completo con chiusura </definitions>
  const match = text.match(/<\?xml[\s\S]*?<\/definitions>/i)
             || text.match(/<definitions[\s\S]*?<\/definitions>/i);
  if (match) return match[0].trim();

  // Fallback: se inizia con il tag giusto e termina correttamente
  if ((text.startsWith('<?xml') || text.startsWith('<definitions')) &&
       text.includes('</definitions>')) {
    return text.trim();
  }

  return null;
}

function showBpmnError(message) {
  showBpmnPanel();
  const xmlView = document.getElementById('bpmnXmlView');
  if (!xmlView) return;

  // Mostra errore con pulsante Riprova se ci sono eventi disponibili
  const canRetry = state.events.length > 0 || state.replayEvents.length > 0;
  xmlView.innerHTML = `
    <div class="bpmn-error">
      ⚠ ${escHtml(message)}
      ${canRetry ? `<div style="margin-top:10px;">
        <button id="btnRetryBpmn" class="btn btn-accent btn-xs">↺ Riprova</button>
      </div>` : ''}
    </div>`;

  if (canRetry) {
    document.getElementById('btnRetryBpmn')?.addEventListener('click', () => {
      // Riprova con gli ultimi parametri disponibili
      if (state.replaySession && state.replayEvents.length) {
        const context = el.contextInput?.value?.trim() || '';
        runBpmnGeneration(state.replayEvents, context, state.replaySession);
      } else if (state.events.length) {
        const context = el.contextInput?.value?.trim() || '';
        const sessionMeta = {
          id: state.sessionId, url: '', startTime: state.startTime, endTime: Date.now(),
        };
        runBpmnGeneration(state.events, context, sessionMeta);
      }
    });
  }
}

// ─── GENERA BPMN ─────────────────────────────────────────────────────────────
function generateBpmnFromLive() {
  const context = el.contextInput.value.trim();
  // Recupera la sessione dal SW per i metadati
  state.port.postMessage({ type: 'GET_SESSION_META', payload: { sessionId: state.sessionId } });
  // Usa gli eventi già in memoria nel panel
  state._pendingLiveBpmn = { events: [...state.events], context };
}

function generateBpmnFromReplay(context) {
  if (!state.replaySession) return;
  // Gli eventi del replay potrebbero già essere in memoria
  if (state.replayEvents.length) {
    runBpmnGeneration(state.replayEvents, context, state.replaySession);
  } else {
    // Richiedi gli eventi e aspetta SESSION_EVENTS
    state._pendingBpmnGeneration = { context };
    state.port.postMessage({
      type: 'GET_SESSION_EVENTS',
      payload: { sessionId: state.replaySession.id },
    });
  }
}

// ─── UI STATE ─────────────────────────────────────────────────────────────────
function setUIRecording(recording) {
  el.btnStart.disabled = recording;
  el.btnStop.disabled  = !recording;
  el.statusBadge.className = `status-badge ${recording ? 'recording' : 'idle'}`;
  el.statusText.textContent = recording ? 'REC' : 'Idle';
  el.sessionInfo.textContent = state.sessionId
    ? (recording ? state.sessionId : `Last: ${state.sessionId}`)
    : '—';
}

function startTimer() {
  state.timerInterval = setInterval(() => {
    if (!state.startTime) return;
    const s  = Math.floor((Date.now() - state.startTime) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    el.statusText.textContent = `REC ${mm}:${ss}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function switchView(view) {
  state.view = view;
  el.viewLive.classList.toggle('hidden', view !== 'live');
  el.viewSessions.classList.toggle('hidden', view !== 'sessions');
  el.btnLive.classList.toggle('active', view === 'live');
  el.btnSessions.classList.toggle('active', view === 'sessions');
}

// ─── SESSIONS ─────────────────────────────────────────────────────────────────
function renderSessionsList() {
  el.sessionsList.innerHTML = '';
  if (!state.sessions.length) {
    el.sessionsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">Nessuna sessione salvata</div>
        <div class="empty-desc">Avvia una registrazione per creare la prima sessione.</div>
      </div>`;
    return;
  }
  state.sessions.forEach(session => {
    const duration    = session.endTime ? formatDuration(session.endTime - session.startTime) : 'In corso';
    const date        = new Date(session.startTime).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
    const statusCls   = session.status === 'recording' ? 'status-recording' : 'status-completed';
    const statusLabel = session.status === 'recording' ? 'REC' : 'OK';

    const card = document.createElement('div');
    card.className = 'session-card';
    card.innerHTML = `
      <div class="sc-header">
        <span class="sc-id">${escHtml(session.id)}</span>
        <span class="sc-status ${statusCls}">${statusLabel}</span>
      </div>
      <div class="sc-url" title="${escHtml(session.url || '')}">${escHtml(truncateUrl(session.url || ''))}</div>
      <div class="sc-meta">
        <span>📅 ${escHtml(date)}</span>
        <span>⏱ ${escHtml(duration)}</span>
        <span>📦 ${session.eventCount || 0} eventi</span>
      </div>
      <div class="sc-actions">
        <button class="btn btn-primary btn-xs" data-action="replay">▶ Replay</button>
        <button class="btn btn-ghost btn-xs"   data-action="delete">✕ Elimina</button>
      </div>
    `;
    card.querySelector('[data-action="replay"]').addEventListener('click', () => loadReplay(session));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteSession(session.id, card));
    el.sessionsList.appendChild(card);
  });
}

function loadReplay(session) {
  state.replaySession = session;
  state.replayEvents  = [];
  el.replayPanel.classList.remove('hidden');
  el.replayTitle.textContent = session.id;
  el.replayBody.innerHTML = '<div class="empty-state"><div class="empty-title">Caricamento…</div></div>';
  el.replayStats.innerHTML = '';
  state.port.postMessage({ type: 'GET_SESSION_EVENTS', payload: { sessionId: session.id } });
}

function renderReplayEvents() {
  const session = state.replaySession;
  const events  = [...state.replayEvents].sort((a, b) => a.timestamp - b.timestamp);

  const bySource = {};
  events.forEach(e => { bySource[e.source] = (bySource[e.source] || 0) + 1; });
  const duration = session?.endTime ? formatDuration(session.endTime - session.startTime) : '—';

  el.replayStats.innerHTML = `
    <div class="stat-item"><span class="stat-val">${events.length}</span><span class="stat-lbl">Totale</span></div>
    <div class="stat-item"><span class="stat-val">${escHtml(duration)}</span><span class="stat-lbl">Durata</span></div>
    <div class="stat-item"><span class="stat-val">${bySource.network     || 0}</span><span class="stat-lbl">Net</span></div>
    <div class="stat-item"><span class="stat-val">${bySource.interaction || 0}</span><span class="stat-lbl">UI</span></div>
    <div class="stat-item"><span class="stat-val">${bySource.navigation  || 0}</span><span class="stat-lbl">Nav</span></div>
    <div class="stat-item"><span class="stat-val">${bySource.error       || 0}</span><span class="stat-lbl">Err</span></div>
    <div class="stat-item"><span class="stat-val">${bySource.dom         || 0}</span><span class="stat-lbl">DOM</span></div>
  `;

  el.replayBody.innerHTML = '';
  events.forEach(ev => appendEventToLog(ev, el.replayBody));
}

function deleteSession(sessionId, cardEl) {
  cardEl.style.opacity = '0.3';
  cardEl.style.pointerEvents = 'none';
  state.sessions = state.sessions.filter(s => s.id !== sessionId);
  if (state.replaySession?.id === sessionId) {
    el.replayPanel.classList.add('hidden');
    state.replaySession = null;
  }
  setTimeout(() => cardEl.remove(), 300);
  state.port.postMessage({ type: 'DELETE_SESSION', payload: { sessionId } });
  showToast('Sessione eliminata', 'info');
}

// ─── CLEAR ────────────────────────────────────────────────────────────────────
function clearLog() {
  state.events     = [];
  state.eventCount = 0;
  el.eventCount.textContent       = '0';
  el.btnGenerateBpmn.disabled     = true;
  el.logBody.innerHTML = `
    <div class="empty-state" id="emptyState">
      <svg width="64" height="52" viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" style="opacity:0.2">
        <rect x="2" y="2" width="96" height="76" rx="4" fill="none" stroke="#355A81" stroke-width="4"/>
        <path d="M10 25 Q30 12 50 25 Q70 38 90 25" fill="none" stroke="#2a4870" stroke-width="3" stroke-linecap="round"/>
        <path d="M10 40 Q30 27 50 40 Q70 53 90 40" fill="none" stroke="#355A81" stroke-width="3" stroke-linecap="round"/>
        <path d="M10 55 Q30 42 50 55 Q70 68 90 55" fill="none" stroke="#4d7d90" stroke-width="3" stroke-linecap="round"/>
        <path d="M10 70 Q30 57 50 70 Q70 83 90 70" fill="none" stroke="#6BB89A" stroke-width="3" stroke-linecap="round"/>
      </svg>
      <div class="empty-title">Log pulito</div>
      <div class="empty-desc">Premi "Avvia Registrazione" per iniziare.</div>
    </div>`;
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function openSettings() {
  el.settingSavedMsg.classList.add('hidden');
  // Popola settings estese
  const maxEvInput = document.getElementById('maxEventsInput');
  const langSel    = document.getElementById('bpmnLangSelect');
  const exclInput  = document.getElementById('excludedDomainsInput');
  if (maxEvInput) maxEvInput.value = state.settings.maxEvents;
  if (langSel)    langSel.value    = state.settings.bpmnLang;
  if (exclInput)  exclInput.value  = state.settings.excludedDomains.join(', ');
  el.modalSettings.classList.remove('hidden');
  el.apiKeyInput.focus();
}
function closeSettings() { el.modalSettings.classList.add('hidden'); }
function saveSettings() {
  const key = el.apiKeyInput.value.trim();
  if (!key) { showToast('Inserisci una API key valida.', 'error'); return; }
  state.apiKey = key;

  // Salva settings estese
  const maxEvInput = document.getElementById('maxEventsInput');
  const langSel    = document.getElementById('bpmnLangSelect');
  const exclInput  = document.getElementById('excludedDomainsInput');
  if (maxEvInput) state.settings.maxEvents = parseInt(maxEvInput.value) || 500;
  if (langSel)    state.settings.bpmnLang  = langSel.value || 'it';
  if (exclInput)  state.settings.excludedDomains = exclInput.value
    .split(',').map(s => s.trim()).filter(Boolean);

  state.port.postMessage({ type: 'SET_SETTING', payload: { key: 'anthropic_api_key', value: key } });
  state.port.postMessage({ type: 'SET_SETTING', payload: { key: 'fl_settings', value: JSON.stringify(state.settings) } });
  closeSettings();
  showToast('Impostazioni salvate ✓', 'success');
}

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────

// Toolbar
el.btnStart.addEventListener('click', () => {
  if (state.isRecording) return;
  chrome.devtools.inspectedWindow.eval('location.href', (url) => {
    state.port.postMessage({ type: 'START_RECORDING', payload: { url: url || '', tabId: state.tabId } });
  });
});
el.btnStop.addEventListener('click',     () => state.port.postMessage({ type: 'STOP_RECORDING' }));
el.btnClear.addEventListener('click',    () => clearLog());
el.btnLive.addEventListener('click',     () => switchView('live'));
el.btnSessions.addEventListener('click', () => {
  switchView('sessions');
  state.port.postMessage({ type: 'GET_SESSIONS' });
});

// Genera BPMN da sessione live — usa eventi già in memoria
// BPMN panel controls
el.btnCloseBpmn.addEventListener('click', () => hideBpmnPanel());
el.btnCopyXml.addEventListener('click', () => {
  if (!state.currentBpmnXml) return;
  navigator.clipboard.writeText(state.currentBpmnXml).then(() => {
    showToast('XML copiato negli appunti ✓', 'success');
  });
});
document.getElementById('btnViewXml').addEventListener('click',     () => setBpmnView('xml'));
document.getElementById('btnImportXml')?.addEventListener('click',  () => importBpmnFromClipboard());
document.getElementById('btnViewDiagram').addEventListener('click', () => setBpmnView('diagram'));
document.getElementById('btnExportSvg').addEventListener('click',     () => exportSvg());
document.getElementById('btnExportCamunda').addEventListener('click', () => exportCamunda());
document.getElementById('btnDocAnalisi')?.addEventListener('click',   () => generateBpmnAnalysis());

// Settings
el.btnSettings.addEventListener('click',       () => openSettings());
el.btnCloseSettings.addEventListener('click',  () => closeSettings());
el.btnCancelSettings.addEventListener('click', () => closeSettings());
el.btnSaveSettings.addEventListener('click',   () => saveSettings());
el.linkApiKey.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://console.anthropic.com/settings/keys' });
});
el.modalSettings.addEventListener('click', (e) => {
  if (e.target === el.modalSettings) closeSettings();
});
el.apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  saveSettings();
  if (e.key === 'Escape') closeSettings();
});

// Filtri live
setupFilterChips(el.viewLive, state.liveFilters, () => {
  applyFilters(el.logBody, state.liveFilters, state.liveSearch);
});
el.searchInput.addEventListener('input', (e) => {
  state.liveSearch = e.target.value;
  applyFilters(el.logBody, state.liveFilters, state.liveSearch);
});

// Filtri replay
setupFilterChips(el.replayPanel, state.replayFilters, () => {
  applyFilters(el.replayBody, state.replayFilters, state.replaySearch);
});
el.replaySearch.addEventListener('input', (e) => {
  state.replaySearch = e.target.value;
  applyFilters(el.replayBody, state.replayFilters, state.replaySearch);
});

// Replay close
el.btnCloseReplay.addEventListener('click', () => {
  el.replayPanel.classList.add('hidden');
  state.replaySession = null;
});


// ─── IMPORT BPMN DA CLIPBOARD ────────────────────────────────────────────────
// Permette di incollare un XML BPMN esterno direttamente nel pannello,
// bypassando il problema dell'XML troncato nel panel o di un XML proveniente
// da strumenti esterni.
async function importBpmnFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text?.trim()) {
      showToast('Gli appunti sono vuoti', 'error');
      return;
    }
    const xml = extractBpmnXml(text);
    if (!xml) {
      showToast('Nessun XML BPMN valido negli appunti', 'error');
      addSysLog('⚠ Import: XML BPMN non riconosciuto negli appunti');
      return;
    }
    state.currentBpmnXml = xml;
    showBpmnPanel();
    renderBpmnXml(xml);
    setBpmnView('xml');
    initBpmnChat();
    setJiraButtonVisible(true);
    addSysLog('✦ BPMN importato dagli appunti');
    showToast('BPMN importato con successo ✓', 'success');
  } catch (err) {
    showToast('Impossibile leggere gli appunti', 'error');
    addSysLog(`⚠ Errore import: ${err.message}`);
  }
}
// ─── STEP 7: CHAT ITERATIVO BPMN ─────────────────────────────────────────────
let _bpmnHistory  = [];
let _historyStack = [];

function initBpmnChat() {
  const chatPanel = document.getElementById('bpmnChatPanel');
  if (chatPanel) chatPanel.classList.remove('hidden');
  _bpmnHistory  = [];
  _historyStack = state.currentBpmnXml ? [state.currentBpmnXml] : [];
  renderChatHistory();
}

// Numero massimo di turni (user+assistant) da mantenere nella history.
// Oltre questo limite i turni più vecchi vengono rimossi per non sforare
// il context window di Claude (~200k token, ma l'XML BPMN è già grande).
const BPMN_HISTORY_MAX_TURNS = 6; // 3 scambi user/assistant

async function sendBpmnFeedback() {
  const input = document.getElementById('bpmnChatInput');
  const msg   = input?.value?.trim();
  if (!msg || !state.currentBpmnXml || !state.apiKey) return;

  input.value    = '';
  input.disabled = true;
  document.getElementById('btnSendFeedback').disabled = true;

  _bpmnHistory.push({ role: 'user', content: msg });
  renderChatHistory();
  addChatMessage('assistant', '…', true);

  try {
    const systemPrompt = `Sei un esperto di BPMN 2.0.
Ricevi il BPMN XML corrente e una richiesta di modifica.
Applica SOLO le modifiche richieste, mantenendo tutto il resto invariato.
Rispetta le regole di layout: larghezza pool adeguata, waypoint corretti, tutti gli elementi con BPMNShape.
Restituisci SOLO il BPMN XML aggiornato, senza testo aggiuntivo, senza markdown, senza backtick.
Il tuo output deve iniziare con: <?xml version="1.0" encoding="UTF-8"?>`;

    // Il primo messaggio include sempre l'XML corrente completo.
    // I turni successivi usano la history ma l'XML nel system prompt
    // è già quello aggiornato — non serve ripeterlo in ogni turno.
    const firstMessage = {
      role:    'user',
      content: `Ecco il BPMN attuale:\n\`\`\`xml\n${state.currentBpmnXml}\n\`\`\`\n\nModifica richiesta: ${msg}`
    };

    // Mantieni al massimo BPMN_HISTORY_MAX_TURNS turni dalla history
    // (esclude il messaggio corrente già aggiunto sopra)
    const prevHistory = _bpmnHistory.slice(0, -1); // tutti tranne l'ultimo (appena aggiunto)
    const trimmedHistory = prevHistory.length > BPMN_HISTORY_MAX_TURNS
      ? prevHistory.slice(-BPMN_HISTORY_MAX_TURNS)
      : prevHistory;

    // Se è il primo turno usa solo il messaggio completo con XML.
    // Altrimenti usa la history trimmed + il messaggio corrente (solo testo, no XML ridondante).
    const messages = trimmedHistory.length === 0
      ? [firstMessage]
      : [
          firstMessage,
          ...trimmedHistory.slice(1), // salta il primo (già incluso in firstMessage)
          { role: 'user', content: msg }
        ].filter((m, i, arr) =>
          // Deduplication: rimuove messaggi user consecutivi identici
          !(i > 0 && m.role === arr[i-1]?.role && m.role === 'user')
        );

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 8192,
        system:     systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data   = await response.json();
    const xmlRaw = data.content?.[0]?.text || '';
    const xml    = extractBpmnXml(xmlRaw);
    if (!xml) throw new Error('La risposta non contiene XML BPMN valido.');

    _historyStack.push(xml);
    state.currentBpmnXml = xml;
    renderBpmnXml(xml);
    if (_bpmnView === 'diagram') await renderBpmnDiagram(xml);

    _bpmnHistory.push({ role: 'assistant', content: '✓ BPMN aggiornato con successo.' });
    renderChatHistory();
    addSysLog('✦ BPMN aggiornato via feedback');
    showToast('BPMN aggiornato ✓', 'success');

    if (state.sessionId && state.port) {
      try {
        state.port.postMessage({
          type: 'SAVE_BPMN_DRAFT',
          payload: { sessionId: state.sessionId, xml, context: el.contextInput?.value || '' },
        });
      } catch (e) {
        console.warn('[FL] Could not save BPMN draft — port disconnected');
      }
    }

    document.getElementById('btnUndoBpmn').disabled = _historyStack.length < 2;

  } catch (err) {
    _bpmnHistory.push({ role: 'assistant', content: `⚠ Errore: ${err.message}` });
    renderChatHistory();
    addSysLog(`⚠ Errore feedback BPMN: ${err.message}`);
  } finally {
    input.disabled = false;
    document.getElementById('btnSendFeedback').disabled = false;
    input.focus();
  }
}

async function undoBpmnChange() {
  if (_historyStack.length < 2) return;
  _historyStack.pop();
  const prev = _historyStack[_historyStack.length - 1];
  state.currentBpmnXml = prev;
  renderBpmnXml(prev);
  if (_bpmnView === 'diagram') await renderBpmnDiagram(prev);
  _bpmnHistory.push({ role: 'assistant', content: '↩ Modifica annullata.' });
  renderChatHistory();
  addSysLog('↩ Undo BPMN');
  document.getElementById('btnUndoBpmn').disabled = _historyStack.length < 2;
}

function renderChatHistory() {
  const container = document.getElementById('bpmnChatHistory');
  if (!container) return;
  container.innerHTML = '';
  _bpmnHistory.forEach(msg => {
    const div = document.createElement('div');
    div.className = `chat-msg chat-${msg.role}`;
    div.textContent = msg.content;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
  const btnUndo = document.getElementById('btnUndoBpmn');
  if (btnUndo) btnUndo.disabled = _historyStack.length < 2;
}

function addChatMessage(role, content, isTemp = false) {
  const container = document.getElementById('bpmnChatHistory');
  if (!container) return;
  container.querySelectorAll('.chat-temp').forEach(e => e.remove());
  const div = document.createElement('div');
  div.className = `chat-msg chat-${role}${isTemp ? ' chat-temp' : ''}`;
  div.textContent = content;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Listeners chat BPMN
document.getElementById('btnSendFeedback').addEventListener('click', () => sendBpmnFeedback());
document.getElementById('btnUndoBpmn').addEventListener('click', () => undoBpmnChange());
document.getElementById('bpmnChatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBpmnFeedback(); }
});

// ─── STEP 8: TOAST SYSTEM ────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  // Rimuovi toast esistenti
  document.querySelectorAll('.fl-toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `fl-toast fl-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Fade in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Auto-remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// Aggiungi toast CSS dinamicamente
(function injectToastStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .fl-toast {
      position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(8px);
      padding: 8px 18px; border-radius: 8px; font-size: 12px; font-weight: 500;
      font-family: var(--sans); letter-spacing: -0.01em; z-index: 9999;
      opacity: 0; transition: opacity 0.2s, transform 0.2s; pointer-events: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12); border: 1px solid rgba(0,0,0,0.06);
    }
    .fl-toast-success { background: #0f0f0f; color: #ffffff; }
    .fl-toast-error   { background: #ef4444; color: #ffffff; }
    .fl-toast-info    { background: #333333; color: #ffffff; }
    .log-entry { animation: fadeInRow 0.15s ease; }
    @keyframes fadeInRow { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: none; } }
  `;
  document.head.appendChild(style);
})();

// ═══════════════════════════════════════════════════════════════════════════
// STEP 9 — JIRA INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

// ─── Mostra il bottone Jira quando un BPMN è disponibile ─────────────────
function setJiraButtonVisible(visible) {
  const btn = document.getElementById('btnJira');
  if (btn) btn.classList.toggle('hidden', !visible);
  // Camunda nella toolbar superiore
  const btnCamunda = document.getElementById('btnExportCamunda');
  if (btnCamunda) btnCamunda.classList.toggle('hidden', !visible);
  // Analisi nel tab Diagramma — con cooldown automatico quando visibile
  const btnDoc = document.getElementById('btnDocAnalisi');
  if (btnDoc) {
    btnDoc.classList.toggle('hidden', !visible);
    if (visible) startDocAnalisiCooldown(btnDoc);
  }
}

// Cooldown automatico 30s sul bottone "📄 Analisi" dopo ogni generazione BPMN.
// Evita di sforare il rate limit API (30k token/min) quando l'utente genera
// BPMN e Analisi in rapida successione. L'utente vede il countdown sul bottone.
function startDocAnalisiCooldown(btn) {
  if (!btn) return;
  if (btn._cooldownInterval) clearInterval(btn._cooldownInterval);

  // Cooldown adattivo basato sui token rimanenti comunicati da Anthropic:
  //   Livello 1 — header disponibile: usa il reset time effettivo (+5s buffer)
  //   Livello 2 — token sufficienti (>12k): cooldown breve 20s
  //   Livello 3 — fallback: 60s se Insights recenti, 45s altrimenti
  var remaining;
  var now = Date.now();

  if (state._bpmnRateLimitReset && state._bpmnRateLimitReset > now) {
    remaining = Math.ceil((state._bpmnRateLimitReset - now) / 1000);
    remaining = Math.min(remaining, 65);
  } else if (state._bpmnTokensRemaining > 0 && state._bpmnTokensRemaining >= 12000) {
    remaining = 20;
  } else {
    var insightsRecent = state._insightsTimestamp &&
      (now - state._insightsTimestamp) < 90_000;
    remaining = insightsRecent ? 60 : 45;
  }

  btn.disabled    = true;
  btn.textContent = '📄 Analisi (' + remaining + 's)';

  btn._cooldownInterval = setInterval(function() {
    remaining--;
    if (remaining <= 0) {
      clearInterval(btn._cooldownInterval);
      btn._cooldownInterval = null;
      btn.disabled    = false;
      btn.textContent = '📄 Analisi';
    } else {
      btn.textContent = '📄 Analisi (' + remaining + 's)';
    }
  }, 1000);
}

// Agganciato al momento in cui il BPMN viene generato o importato
// (dopo renderBpmnXml + initBpmnChat nell'esistente runBpmnGeneration)
const _origRenderBpmnXml = renderBpmnXml;
window._renderBpmnXmlWithJira = function(xml) {
  _origRenderBpmnXml(xml);
  setJiraButtonVisible(true);
};

// ─── APERTURA / CHIUSURA MODALE ──────────────────────────────────────────
const jiraModal = document.getElementById('jiraModal');

function openJiraModal() {
  // Reset UI
  document.getElementById('jiraProgress').classList.remove('visible');
  document.getElementById('jiraResult').classList.remove('visible');
  document.getElementById('btnJiraExport').disabled = false;

  // Precompila titolo
  const titleInput = document.getElementById('jiraIssueTitle');
  if (!titleInput.value) {
    titleInput.value = `Processo Sevenda — ${state.sessionId || state.replaySession?.id || 'sessione'}`;
  }

  // Precompila descrizione
  const descInput = document.getElementById('jiraDescription');
  if (!descInput.value) {
    const sid = state.sessionId || state.replaySession?.id || 'N/A';
    const cnt = state.eventCount || state.replayEvents?.length || 0;
    descInput.value = `Sessione registrata da Sevenda\nSession ID: ${sid}\nEventi catturati: ${cnt}`;
  }

  // Carica credenziali salvate
  state.port.postMessage({ type: 'GET_SETTING', payload: { key: 'jira_credentials' } });

  jiraModal.classList.add('open');
}

function closeJiraModal() {
  jiraModal.classList.remove('open');
}

document.getElementById('btnJira').addEventListener('click', openJiraModal);
document.getElementById('btnJiraClose').addEventListener('click', closeJiraModal);
document.getElementById('btnJiraCancel').addEventListener('click', closeJiraModal);
jiraModal.addEventListener('click', (e) => { if (e.target === jiraModal) closeJiraModal(); });
document.getElementById('linkJiraToken').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://id.atlassian.com/manage-profile/security/api-tokens' });
});

// Toggle stile checked sugli allegati
[
  ['jiraAttachXml',     'jiraAttachXmlItem'],
  ['jiraAttachSvg',     'jiraAttachSvgItem'],
  ['jiraAttachComment', 'jiraAttachCommentItem'],
].forEach(([cbId, itemId]) => {
  document.getElementById(cbId).addEventListener('change', function() {
    document.getElementById(itemId).classList.toggle('checked', this.checked);
  });
});

// Gestione SETTING_VALUE per le credenziali Jira
// Estende l'handler già esistente in handleSWMessage
const _origHandleSWMessage = handleSWMessage;
// Nota: non sovrascriviamo handleSWMessage perché è già registrato come listener.
// Aggiungiamo invece un secondo listener sulla porta dopo connect().
// Vedi _jiraSettingHandler sotto, registrato in connect() tramite patch.

function _applyJiraCredentials(value) {
  if (!value) return;
  try {
    const creds = typeof value === 'string' ? JSON.parse(value) : value;
    if (creds.url)        document.getElementById('jiraUrl').value        = creds.url;
    if (creds.email)      document.getElementById('jiraEmail').value      = creds.email;
    if (creds.projectKey) document.getElementById('jiraProjectKey').value = creds.projectKey;
    document.getElementById('jiraSaveCreds').checked = true;
  } catch {}
}

// ─── EXPORT JIRA ──────────────────────────────────────────────────────────
document.getElementById('btnJiraExport').addEventListener('click', runJiraExport);

async function runJiraExport() {
  const jiraUrl    = document.getElementById('jiraUrl').value.trim().replace(/\/$/, '');
  const email      = document.getElementById('jiraEmail').value.trim();
  const token      = document.getElementById('jiraToken').value.trim();
  const projectKey = document.getElementById('jiraProjectKey').value.trim().toUpperCase();
  const issueType  = document.getElementById('jiraIssueType').value;
  const title      = document.getElementById('jiraIssueTitle').value.trim();
  const description = document.getElementById('jiraDescription').value.trim();
  const doXml      = document.getElementById('jiraAttachXml').checked;
  const doSvg      = document.getElementById('jiraAttachSvg').checked;
  const doComment  = document.getElementById('jiraAttachComment').checked;
  const saveCreds  = document.getElementById('jiraSaveCreds').checked;

  if (!jiraUrl || !email || !token || !projectKey || !title) {
    showToast('Compila tutti i campi obbligatori (*)', 'error');
    return;
  }
  if (!state.currentBpmnXml) {
    showToast('Nessun BPMN disponibile da esportare', 'error');
    return;
  }

  const authHeader = 'Basic ' + btoa(`${email}:${token}`);

  if (saveCreds) {
    state.port.postMessage({
      type: 'SET_SETTING',
      payload: { key: 'jira_credentials', value: JSON.stringify({ url: jiraUrl, email, projectKey }) },
    });
  }

  const progressEl = document.getElementById('jiraProgress');
  const progressTxt = document.getElementById('jiraProgressText');
  const resultEl   = document.getElementById('jiraResult');
  const exportBtn  = document.getElementById('btnJiraExport');

  exportBtn.disabled = true;
  resultEl.classList.remove('visible');
  progressEl.classList.add('visible');

  const setProgress = (txt) => { progressTxt.textContent = txt; };

  try {
    // ── 1. Crea Issue ───────────────────────────────────────────────────
    setProgress('Creazione issue…');
    const issueRes = await fetch(`${jiraUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        fields: {
          project:     { key: projectKey },
          summary:     title,
          issuetype:   { name: issueType },
          description: {
            type: 'doc', version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: description || title }] }]
          }
        }
      }),
    });

    const issueData = await issueRes.json();
    if (!issueRes.ok) {
      const msg = issueData?.errors
        ? Object.values(issueData.errors).join(', ')
        : issueData?.errorMessages?.[0] || `HTTP ${issueRes.status}`;
      throw new Error(msg);
    }

    const issueKey = issueData.key;
    const issueId  = issueData.id;
    addSysLog(`✓ Jira issue creata: ${issueKey}`);

    // ── 2. Allega BPMN XML ───────────────────────────────────────────────
    if (doXml) {
      setProgress(`Allegando BPMN XML a ${issueKey}…`);
      await jiraAttachFile(jiraUrl, authHeader, issueId,
        `sevenda-${state.sessionId || 'bpmn'}.bpmn`,
        state.currentBpmnXml, 'application/xml');
      addSysLog('✓ BPMN XML allegato');
    }

    // ── 3. Allega SVG ────────────────────────────────────────────────────
    if (doSvg) {
      setProgress(`Generando SVG…`);
      const svg = await jiraGetSvg();
      if (svg) {
        await jiraAttachFile(jiraUrl, authHeader, issueId,
          `sevenda-${state.sessionId || 'bpmn'}.svg`,
          svg, 'image/svg+xml');
        addSysLog('✓ SVG allegato');
      } else {
        addSysLog('⚠ SVG non disponibile — apri la vista Diagramma almeno una volta');
      }
    }

    // ── 4. Aggiungi commento ─────────────────────────────────────────────
    if (doComment) {
      setProgress(`Aggiungendo commento a ${issueKey}…`);
      const commentText = jiraBuildComment(issueKey);
      await fetch(`${jiraUrl}/rest/api/3/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          body: { type: 'doc', version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: commentText }] }]
          }
        }),
      });
      addSysLog('✓ Commento aggiunto');
    }

    // ── Completato ───────────────────────────────────────────────────────
    progressEl.classList.remove('visible');
    resultEl.classList.add('visible');
    document.getElementById('jiraResultLink').textContent = issueKey;
    document.getElementById('jiraResultLink').href = `${jiraUrl}/browse/${issueKey}`;
    showToast(`✓ ${issueKey} creata con successo`, 'success');

  } catch (err) {
    progressEl.classList.remove('visible');
    exportBtn.disabled = false;

    let msg = err.message || 'Errore durante l\'export';
    if (msg.includes('401') || msg.includes('Unauthorized'))   msg = '401 — Email o API token non validi';
    else if (msg.includes('403') || msg.includes('Forbidden')) msg = '403 — Permessi insufficienti su questo progetto';
    else if (msg.includes('404'))                              msg = '404 — Project key non trovata o URL errato';
    else if (msg.includes('429'))                              msg = '429 — Troppe richieste, attendi qualche secondo';
    else if (msg.includes('Failed to fetch'))                  msg = 'Impossibile raggiungere Jira — verifica URL e connessione';

    showToast(`✗ ${msg}`, 'error');
    addSysLog(`✗ Jira export fallito: ${msg}`);
    console.error('[FL Jira]', err);
  }
}

async function jiraAttachFile(baseUrl, authHeader, issueId, filename, content, mime) {
  const fd = new FormData();
  fd.append('file', new Blob([content], { type: mime }), filename);
  const res = await fetch(`${baseUrl}/rest/api/3/issue/${issueId}/attachments`, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'X-Atlassian-Token': 'no-check', 'Accept': 'application/json' },
    body: fd,
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.errorMessages?.[0] || `Attach error: HTTP ${res.status}`);
  }
}

async function jiraGetSvg() {
  try {
    const viewer = getBpmnViewer();
    if (!viewer || !state.currentBpmnXml) return null;
    // Se il viewer non ha ancora caricato l'XML, lo carichiamo ora
    try { await viewer.importXML(state.currentBpmnXml); } catch {}
    const { svg } = await viewer.saveSVG();
    return svg;
  } catch { return null; }
}

function jiraBuildComment(issueKey) {
  const sid = state.sessionId || state.replaySession?.id || 'N/A';
  const cnt = state.eventCount || state.replayEvents?.length || 0;
  return [
    '📊 Sevenda — Riepilogo Sessione',
    '',
    `Session ID: ${sid}`,
    `Eventi catturati: ${cnt}`,
    '',
    'Il diagramma BPMN 2.0 è allegato come:',
    '  • file .bpmn (importabile in Camunda/Signavio)',
    '  • file .svg (immagine vettoriale)',
    '',
    `Generato da Sevenda — ${new Date().toLocaleString('it-IT')}`,
  ].join('\n');
}

// Patch: intercetta SETTING_VALUE per jira_credentials dopo connect()
// Aggiungiamo un listener aggiuntivo che viene registrato subito dopo connect()
function _patchPortForJira() {
  if (!state.port) return;
  state.port.onMessage.addListener((msg) => {
    if (msg.type === 'SETTING_VALUE' && msg.payload.key === 'jira_credentials') {
      _applyJiraCredentials(msg.payload.value);
    }
  });
}

// Patch su renderBpmnXml per attivare il bottone Jira automaticamente
const _origRunBpmnGeneration = runBpmnGeneration;

// ─── Attiva btn Jira ogni volta che viene generato/importato un BPMN ─────
// Sovrascriviamo il comportamento di showBpmnPanel aggiungendo il side effect
const _origShowBpmnPanel = showBpmnPanel;
window.showBpmnPanel = function() {
  _origShowBpmnPanel();
  if (state.currentBpmnXml) setJiraButtonVisible(true);
};

// Controlla anche dopo importBpmnFromClipboard
const _origImport = typeof importBpmnFromClipboard === 'function' ? importBpmnFromClipboard : null;

// ─── FINE STEP 9 ─────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 11 — INSIGHTS MODE (📊)
// Layer opzionale sopra il prompt builder. Non modifica il flusso BPMN.
// Quando attivo, dopo la generazione BPMN viene eseguita una seconda chiamata
// API in parallelo che produce: eventi GTM suggeriti, gap di tracking, tag plan JSON.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Stato Insights ──────────────────────────────────────────────────────────
state.insightsData      = null;
state._insightsEvents   = null;
state._insightsSessionId = null; // sessionId a cui appartengono gli Insights correnti

// Riferimenti DOM Insights — dichiarati qui come variabili globali
// così sono accessibili da tutte le funzioni del blocco Step 11
const _insightsView   = document.getElementById('insightsView');
const btnViewInsights = document.getElementById('btnViewInsights');

// Tab Insights — usa setBpmnView unificata
if (btnViewInsights) {
  btnViewInsights.addEventListener('click', () => setBpmnView('insights'));
}

// ─── Rilevamento strumenti di tracking ───────────────────────────────────────
function detectTrackingTools(events) {
  const urls = events.filter(e => e.source === 'network').map(e => e.network?.url || '');
  const r = {
    gtm:     { detected: false, id: null },
    ga4:     { detected: false, measurementId: null },
    hotjar:  { detected: false },
    segment: { detected: false },
    fbPixel: { detected: false },
    clarity: { detected: false },
  };
  for (const url of urls) {
    const gtmM = url.match(/googletagmanager\.com\/gtm\.js[^?]*\?[^"']*id=(GTM-[A-Z0-9]+)/);
    if (gtmM) { r.gtm.detected = true; r.gtm.id = gtmM[1]; }
    else if (url.includes('googletagmanager.com/gtm.js')) r.gtm.detected = true;

    const ga4M = url.match(/google-analytics\.com\/g\/collect.*[?&]tid=(G-[A-Z0-9]+)/);
    if (ga4M) { r.ga4.detected = true; r.ga4.measurementId = ga4M[1]; }
    else if (url.includes('google-analytics.com/g/collect')) r.ga4.detected = true;

    if (url.includes('hotjar.com/h/'))       r.hotjar.detected  = true;
    if (url.includes('cdn.segment.com') || url.includes('segment.io')) r.segment.detected = true;
    if (url.includes('facebook.com/tr'))     r.fbPixel.detected = true;
    if (url.includes('clarity.ms'))          r.clarity.detected = true;
  }
  return r;
}

// ─── Prompt Insights ─────────────────────────────────────────────────────────
function buildInsightsPrompt(events, context, sessionMeta, tracking) {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  // Deduplicazione NET: max 2 occorrenze per URL base, escludi SYS
  const netCount = {};
  const filtered = sorted.filter(ev => {
    if (!ev.source || ev.source === 'sys') return false;
    if (ev.source === 'network') {
      const key = (ev.network?.method || '') + '|' + (ev.network?.url || '').split('?')[0];
      netCount[key] = (netCount[key] || 0) + 1;
      if (netCount[key] > 2) return false;
    }
    return true;
  }).slice(0, 60);

  // Tronca URL a 80 caratteri rimuovendo query string lunghi
  function shortUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url.startsWith('http') ? url : 'https://x.com' + url);
      const base = u.hostname + u.pathname;
      const qs = u.search.length < 40 ? u.search : '';
      const full = base + qs;
      return full.length > 80 ? full.slice(0, 77) + '...' : full;
    } catch (e) {
      return url.slice(0, 80);
    }
  }

  const eventLines = filtered.map(function(ev, i) {
    const t = new Date(ev.timestamp).toISOString().slice(11, 19);
    if (ev.source === 'navigation') {
      return (i+1) + '. [NAV] ' + t + ' ' + (ev.navigation?.trigger || '') + ': ' + shortUrl(ev.navigation?.toUrl);
    }
    if (ev.source === 'interaction') {
      const it = ev.interaction || {};
      const tag = it.elementTag || '?';
      const id  = it.elementId ? '#' + it.elementId : '';
      const txt = it.elementText ? ' "' + it.elementText.slice(0, 40) + '"' : '';
      const act = it.dataAttributes?.['data-action'] ? ' [' + it.dataAttributes['data-action'] + ']' : '';
      return (i+1) + '. [UI] ' + t + ' ' + ev.type + ' ' + tag + id + act + txt;
    }
    if (ev.source === 'network') {
      const n = ev.network || {};
      const st = n.statusCode ? ' -> ' + n.statusCode : '';
      const dr = n.duration   ? ' (' + n.duration + 'ms)' : '';
      return (i+1) + '. [NET] ' + t + ' ' + (n.method || 'GET') + ' ' + shortUrl(n.url) + st + dr;
    }
    if (ev.source === 'error') {
      return (i+1) + '. [ERR] ' + t + ' ' + (ev.error?.message || '').slice(0, 80);
    }
    return (i+1) + '. [' + (ev.source || '?').toUpperCase() + '] ' + t + ' ' + ev.type;
  }).join('\n');

  const tc = [
    tracking.gtm.detected     ? ('GTM' + (tracking.gtm.id ? ' (' + tracking.gtm.id + ')' : '')) : 'GTM NON rilevato',
    tracking.ga4.detected     ? ('GA4' + (tracking.ga4.measurementId ? ' (' + tracking.ga4.measurementId + ')' : '')) : 'GA4 NON rilevato',
    tracking.hotjar.detected  ? 'Hotjar'  : null,
    tracking.segment.detected ? 'Segment' : null,
    tracking.fbPixel.detected ? 'Facebook Pixel' : null,
    tracking.clarity.detected ? 'Clarity' : null,
  ].filter(Boolean).join(', ');

  const dur = sessionMeta?.endTime && sessionMeta?.startTime
    ? Math.round((sessionMeta.endTime - sessionMeta.startTime) / 1000) + 's' : 'N/A';

  const schema = JSON.stringify({
    summary: 'descrizione processo max 120 caratteri',
    trackingTools: { gtmDetected: true, gtmId: 'GTM-X o null', ga4Detected: false, ga4MeasurementId: 'G-X o null' },
    suggestedEvents: [{
      id: 'evt_001', eventName: 'snake_case', description: 'breve',
      trigger: { type: 'click|form_submit|page_view|custom', condition: 'descrizione', cssSelector: 'o null' },
      dataLayer: { event: 'nome', chiave: 'valore' },
      priority: 'HIGH|MEDIUM|LOW', notes: 'note implementativa'
    }],
    trackingGaps: [{ id: 'gap_001', severity: 'HIGH|MEDIUM|LOW', description: 'gap', evidence: 'prova', suggestedFix: 'fix' }],
    tags: [{ id: 'tag_001', name: 'Nome', type: 'GA4_EVENT|CUSTOM_HTML', eventName: 'nome', parameters: [{ name: 'k', value: 'v' }], triggerId: 'trigger_001' }],
    triggers: [{ id: 'trigger_001', name: 'Nome', type: 'CLICK_ALL|FORM_SUBMISSION|PAGE_VIEW|CUSTOM_EVENT', filter: [{ type: 'CSS_SELECTOR', value: 'sel' }] }],
    variables: [{ id: 'var_001', name: 'Nome', type: 'AUTO_EVENT_VAR|DATA_LAYER_VAR|JS_VAR', value: 'dettaglio' }]
  });

  return 'Sei un esperto di digital analytics e Google Tag Manager.\n' +
    'Analizza questa sessione browser e produci un analisi di tracking GTM-ready.\n\n' +
    '## Contesto\n' + (context || 'Nessun contesto.').slice(0, 300) + '\n\n' +
    '## Sessione\n' +
    '- URL: ' + (sessionMeta?.url || 'N/A').slice(0, 80) + '\n' +
    '- Durata: ' + dur + '\n' +
    '- Tracking rilevato: ' + tc + '\n' +
    '- Eventi analizzati: ' + filtered.length + ' (su ' + events.length + ' totali)\n\n' +
    '## Eventi\n' + eventLines + '\n\n' +
    '## Output richiesto\n' +
    'Rispondi SOLO con JSON valido, senza testo aggiuntivo, senza markdown, senza backtick.\n\n' +
    schema;
}

// ─── Esecuzione analisi Insights ──────────────────────────────────────────────
async function runInsightsAnalysis(events, context, sessionMeta) {
  if (!state.apiKey || !events?.length) {
    if (!state.apiKey) showToast('🔑 Configura la API key nelle Impostazioni', 'error');
    if (!events?.length) showToast('Nessun evento da analizzare', 'error');
    return;
  }

  // Se gli Insights sono già stati generati per questa sessione, mostra il
  // risultato esistente senza ricalcolare (evita chiamate API ridondanti).
  const currentSessionId = sessionMeta?.id || state.sessionId || null;
  if (state.insightsData && state._insightsSessionId === currentSessionId) {
    showBpmnPanel();
    setBpmnView('insights');
    const btnIns = document.getElementById('btnViewInsights');
    if (btnIns) btnIns.classList.remove('hidden');
    renderInsightsView(state.insightsData, detectTrackingTools(state._insightsEvents || events));
    return;
  }

  // Apre il pannello BPMN (necessario perché insightsView è al suo interno)
  // e porta subito sulla vista Insights
  showBpmnPanel();
  setBpmnView('insights');

  // Ora _insightsView è nel DOM — aggiorna con spinner
  const insView = document.getElementById('insightsView');
  if (insView) {
    insView.innerHTML = `
      <div class="ins-generating">
        <div class="ins-spinner"></div>
        <div>Analisi Insights in corso…</div>
      </div>`;
  }

  // Rendi visibile il tab Insights nell'header BPMN
  const btnIns = document.getElementById('btnViewInsights');
  if (btnIns) btnIns.classList.remove('hidden');

  const tracking = detectTrackingTools(events);
  state._insightsEvents = events;

  try {
    const prompt = buildInsightsPrompt(events, context, sessionMeta, tracking);
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 90_000);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: controller.signal,
      headers: {
        'Content-Type': 'application/json', 'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }] }),
    });
    clearTimeout(tid);

    if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }

    const raw = (await res.json()).content?.[0]?.text || '';
    const cleaned = raw.replace(/^```json\s*/im,'').replace(/^```\s*/im,'').replace(/```\s*$/im,'').trim();

    // Ripara JSON troncato (Claude ha raggiunto max_tokens a metà risposta)
    let jsonStr = cleaned;
    try {
      JSON.parse(jsonStr); // tenta il parse diretto
    } catch (e) {
      // Cerca l'ultima virgola o proprietà valida e chiudi gli array/oggetti aperti
      // Strategia: trova l'ultima proprietà completa e tronca lì
      const lastComplete = jsonStr.lastIndexOf('"}');
      const lastArr      = jsonStr.lastIndexOf(']');
      const cutPoint     = Math.max(lastComplete + 2, lastArr + 1);
      if (cutPoint > 10) {
        jsonStr = jsonStr.slice(0, cutPoint);
        // Chiudi tutti gli oggetti/array aperti contando le parentesi
        let opens = 0, openArr = 0;
        for (const ch of jsonStr) {
          if (ch === '{') opens++;
          else if (ch === '}') opens--;
          else if (ch === '[') openArr++;
          else if (ch === ']') openArr--;
        }
        while (openArr > 0) { jsonStr += ']'; openArr--; }
        while (opens > 0)   { jsonStr += '}'; opens--; }
      }
    }

    const data = JSON.parse(jsonStr);
    state.insightsData       = data;
    state._insightsSessionId = currentSessionId;
    state._insightsTimestamp = Date.now();
    renderInsightsView(data, tracking);
    addSysLog('📊 Insights generati');
    showToast('📊 Insights pronti', 'success');

  } catch (err) {
    const insView2 = document.getElementById('insightsView');
    if (insView2) {
      // Salva i parametri per il retry
      const _retryEvents  = events;
      const _retryContext = context;
      const _retryMeta    = sessionMeta;

      insView2.innerHTML = `
        <div class="ins-empty">
          <div style="font-size:24px;margin-bottom:8px">⚠</div>
          <div style="color:var(--red);font-weight:600;margin-bottom:4px">Errore analisi Insights</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px">${escHtml(err.message)}</div>
          <button id="btnInsightsRetry" class="btn btn-xs" style="background:#7c3aed;color:#fff;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">
            ↺ Riprova
          </button>
        </div>`;

      document.getElementById('btnInsightsRetry')?.addEventListener('click', () => {
        runInsightsAnalysis(_retryEvents, _retryContext, _retryMeta);
      });
    }
    addSysLog(`⚠ Errore Insights: ${err.message}`);
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────────
function renderInsightsView(data, tracking) {
  const insightsView = document.getElementById('insightsView');
  if (!insightsView) return;
  const evN = (data.suggestedEvents||[]).length;
  const gpN = (data.trackingGaps||[]).length;

  const pills = [
    data.trackingTools?.gtmDetected ? `<span class="ins-summary-pill ins-pill-gtm">GTM ${data.trackingTools.gtmId||''}</span>` : '',
    data.trackingTools?.ga4Detected ? `<span class="ins-summary-pill ins-pill-ga4">GA4 ${data.trackingTools.ga4MeasurementId||''}</span>` : '',
    tracking.hotjar.detected  ? `<span class="ins-summary-pill ins-pill-none">Hotjar</span>` : '',
    tracking.segment.detected ? `<span class="ins-summary-pill ins-pill-none">Segment</span>` : '',
    tracking.fbPixel.detected ? `<span class="ins-summary-pill ins-pill-none">FB Pixel</span>` : '',
    (!data.trackingTools?.gtmDetected && !data.trackingTools?.ga4Detected)
      ? `<span class="ins-summary-pill ins-pill-none">Nessun tool rilevato</span>` : '',
  ].filter(Boolean).join('');

  const evHtml = (data.suggestedEvents||[]).map((ev, idx) => {
    const pc = {HIGH:'ins-priority-high',MEDIUM:'ins-priority-medium',LOW:'ins-priority-low'}[ev.priority]||'ins-priority-low';
    const trigger  = escHtml(ev.trigger?.condition || ev.trigger?.type || '—');
    const selector = ev.trigger?.cssSelector ? '<div class="ins-kv"><div class="ins-kv-label">CSS Selector</div><div class="ins-code">' + escHtml(ev.trigger.cssSelector) + '</div></div>' : '';
    const dl       = escHtml(JSON.stringify(ev.dataLayer||{},null,2));
    const notes    = ev.notes ? '<div class="ins-kv"><div class="ins-kv-label">Note</div><div style="font-size:10.5px;color:var(--text-muted)">' + escHtml(ev.notes) + '</div></div>' : '';
    return '<div class="ins-event-card">'
      + '<div class="ins-event-header" data-body="ins-body-' + idx + '">'
      + '<span class="ins-chev">▼</span>'
      + '<span class="ins-event-name">' + escHtml(ev.eventName) + '</span>'
      + '<span class="ins-priority ' + pc + '">' + escHtml(ev.priority) + '</span>'
      + '</div>'
      + '<div class="ins-event-body" id="ins-body-' + idx + '">'
      + '<div class="ins-kv"><div class="ins-kv-label">Trigger</div><div class="ins-trigger">' + trigger + '</div></div>'
      + selector
      + '<div class="ins-kv"><div class="ins-kv-label">dataLayer.push()</div><div class="ins-code">' + dl + '</div></div>'
      + notes
      + '</div>'
      + '</div>';
  }).join('');

  const gpHtml = (data.trackingGaps||[]).map(g => `
    <div class="ins-gap-card">
      <div class="ins-gap-title">⚠ ${escHtml(g.description)}<span class="ins-gap-severity${g.severity==='HIGH'?' high':''}">${escHtml(g.severity)}</span></div>
      <div class="ins-gap-desc">${escHtml(g.evidence||'')}</div>
      ${g.suggestedFix?`<div class="ins-gap-fix">💡 ${escHtml(g.suggestedFix)}</div>`:''}
    </div>`).join('');

  insightsView.innerHTML = `
    <div class="ins-summary"><span style="color:var(--text-muted);flex:1">${escHtml(data.summary||'')}</span>${pills}</div>
    <div class="ins-section">
      <div class="ins-section-title">Eventi GTM suggeriti <span>${evN}</span></div>
      ${evHtml||'<div class="ins-empty" style="padding:12px">Nessun evento identificato.</div>'}
    </div>
    <div class="ins-section">
      <div class="ins-section-title">Gap di tracking <span>${gpN}</span></div>
      ${gpHtml||'<div class="ins-empty" style="padding:12px;color:var(--green)">✓ Nessun gap rilevato.</div>'}
    </div>
    <div class="ins-actions">
      <button class="btn btn-insights btn-xs" id="btnExportTagPlan">⬇ Esporta Tag Plan JSON</button>
      <button class="btn btn-ghost btn-xs" id="btnCopyTagPlan">⎘ Copia JSON</button>
      <div style="flex:1"></div>
      <button class="btn btn-doc-analytics btn-xs" id="btnDocReport" title="Genera Analytics Report (.docx)">📄 Report</button>
    </div>`;

  document.getElementById('btnExportTagPlan')?.addEventListener('click', exportTagPlan);
  document.getElementById('btnCopyTagPlan')?.addEventListener('click',   copyTagPlan);
  document.getElementById('btnDocReport')?.addEventListener('click',     generateAnalyticsReport);

  // Event delegation per toggle card eventi — evita problemi con onclick inline
  insightsView.querySelectorAll('.ins-event-header[data-body]').forEach(hdr => {
    hdr.style.cursor = 'pointer';
    hdr.addEventListener('click', () => {
      const body = document.getElementById(hdr.dataset.body);
      const chev = hdr.querySelector('.ins-chev');
      if (!body) return;
      const isOpen = !body.classList.contains('collapsed');
      body.classList.toggle('collapsed', isOpen);
      if (chev) chev.textContent = isOpen ? '▶' : '▼';
    });
  });
}

// ─── Export Tag Plan ──────────────────────────────────────────────────────────
function buildTagPlanJson() {
  if (!state.insightsData) return null;
  return {
    tagPlanVersion: '1.0', generatedBy: 'Sevenda',
    generatedAt: new Date().toISOString(),
    sessionId: state.sessionId || state.replaySession?.id || 'N/A',
    containerInfo: state.insightsData.trackingTools || {},
    suggestedEvents: state.insightsData.suggestedEvents || [],
    trackingGaps:    state.insightsData.trackingGaps    || [],
    tags:            state.insightsData.tags            || [],
    triggers:        state.insightsData.triggers        || [],
    variables:       state.insightsData.variables       || [],
  };
}

function exportTagPlan() {
  const plan = buildTagPlanJson();
  if (!plan) { showToast('Nessun Tag Plan disponibile', 'error'); return; }
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `sevenda-tagplan-${state.sessionId||'export'}.json`;
  a.click(); URL.revokeObjectURL(url);
  addSysLog('⬇ Tag Plan JSON esportato');
  showToast('Tag Plan esportato ✓', 'success');
}

function copyTagPlan() {
  const plan = buildTagPlanJson();
  if (!plan) { showToast('Nessun Tag Plan disponibile', 'error'); return; }
  navigator.clipboard.writeText(JSON.stringify(plan, null, 2))
    .then(() => showToast('Tag Plan copiato ✓', 'success'))
    .catch(()  => showToast('Impossibile copiare', 'error'));
}

// ─── Hook nei bottoni Genera — STEP 11 (versione separata) ───────────────────
// I due bottoni sono completamente indipendenti: nessun toggle, nessun clone.
// btnGenerateBpmn     → solo BPMN (come prima)
// btnGenerateInsights → solo Insights (nuovo)
// In questo modo ogni utente usa solo ciò che serve.

el.btnGenerateBpmn.addEventListener('click', () => {
  const context = el.contextInput.value.trim();
  const meta = { id: state.sessionId, url: '', startTime: state.startTime, endTime: Date.now() };
  runBpmnGeneration(state.events, context, meta);
});

el.btnGenerateInsights.addEventListener('click', () => {
  const context = el.contextInput.value.trim();
  const meta = { id: state.sessionId, url: '', startTime: state.startTime, endTime: Date.now() };
  runInsightsAnalysis(state.events, context, meta);
});

el.btnReplayGenerateBpmn.addEventListener('click', () => {
  if (!state.replaySession) return;
  const ctx  = el.contextInput?.value?.trim() || '';
  generateBpmnFromReplay(ctx);
  switchView('live');
});

// Nuovo: Insights da replay
document.getElementById('btnReplayGenerateInsights')?.addEventListener('click', () => {
  if (!state.replaySession) return;
  const ctx  = el.contextInput?.value?.trim() || '';
  const evs  = state.replayEvents;
  const sess = state.replaySession;
  switchView('live');
  runInsightsAnalysis(evs, ctx, sess);
});

// ─── FINE STEP 11 ────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 12 — DOCUMENTAZIONE BPMN
// Documento 1: Analisi Tecnico-Funzionale (chiamata Claude + docx)
// Documento 2: Analytics Report (rendering diretto di insightsData + docx)
// Entrambi scaricabili come .docx tramite docx-js caricato dinamicamente.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Verifica che docx-js sia disponibile (caricato da vendor/docx.iife.js) ──
let _docxLib = null;
async function loadDocx() {
  if (_docxLib) return _docxLib;
  if (window.docx) { _docxLib = window.docx; return _docxLib; }
  throw new Error('docx-js non disponibile. Verifica che vendor/docx.iife.js sia presente nella cartella public/vendor/.');
}

// ─── Parsing task dall'XML BPMN ──────────────────────────────────────────────
function parseBpmnTasks(xml) {
  if (!xml) return [];
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xml, 'application/xml');
    const tags   = ['startEvent','endEvent','task','userTask','serviceTask',
                    'manualTask','sendTask','receiveTask','scriptTask',
                    'exclusiveGateway','parallelGateway','inclusiveGateway'];
    const tasks  = [];
    tags.forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => {
        tasks.push({ id: el.getAttribute('id'), name: el.getAttribute('name') || el.getAttribute('id'), type: tag });
      });
    });
    return tasks;
  } catch (e) { return []; }
}

// ─── Serializza eventi per il prompt ─────────────────────────────────────────
function serializeEventsForDoc(events) {
  const netCount = {};
  return events.filter(ev => {
    if (!ev.source || ev.source === 'sys') return false;
    if (ev.source === 'network') {
      const key = (ev.network?.method||'') + '|' + (ev.network?.url||'').split('?')[0];
      netCount[key] = (netCount[key]||0) + 1;
      return netCount[key] <= 2;
    }
    return true;
  }).slice(0, 50).map((ev, i) => {
    // Timestamp HH:MM:SS senza millisecondi
    const t = new Date(ev.timestamp).toISOString().slice(11, 19);
    if (ev.source === 'navigation')
      return (i+1) + '.[NAV]' + t + ' ' + (ev.navigation?.trigger||'') + ':' + (ev.navigation?.toUrl||'').slice(0,60);
    if (ev.source === 'interaction') {
      const it = ev.interaction || {};
      return (i+1) + '.[UI]' + t + ' ' + ev.type + ' ' + (it.elementTag||'') + (it.elementId?'#'+it.elementId:'') + (it.elementText?' "'+it.elementText.slice(0,30)+'"':'');
    }
    if (ev.source === 'network') {
      const n = ev.network || {};
      return (i+1) + '.[NET]' + t + ' ' + (n.method||'GET') + ' ' + (n.url||'').split('?')[0].slice(0,60) + (n.statusCode?'>'+n.statusCode:'') + (n.duration?'('+n.duration+'ms)':'');
    }
    if (ev.source === 'error')
      return (i+1) + '.[ERR]' + t + ' ' + (ev.error?.message||'').slice(0,60);
    return (i+1) + '.[' + (ev.source||'?').toUpperCase() + ']' + t;
  }).join('\n');
}

// ─── DOCUMENTO 1: Analisi Tecnico-Funzionale ─────────────────────────────────
async function generateBpmnAnalysis() {
  if (!state.currentBpmnXml) { showToast('Nessun BPMN disponibile', 'error'); return; }
  if (!state.apiKey)          { showToast('🔑 Configura la API key nelle Impostazioni', 'error'); return; }

  const btn = document.getElementById('btnDocAnalisi');
  const origText = btn?.textContent;
  if (btn) { btn.textContent = '⏳…'; btn.disabled = true; }

  try {
    const tasks    = parseBpmnTasks(state.currentBpmnXml);
    const events   = state.events?.length ? state.events : (state.replayEvents || []);
    const meta     = state.replaySession  || { id: state.sessionId, url: '', startTime: state.startTime, endTime: Date.now() };
    const context  = el.contextInput?.value?.trim() || '';
    const duration = meta.endTime && meta.startTime ? Math.round((meta.endTime - meta.startTime)/1000) + 's' : 'N/A';

    const tasksText = tasks.map((t,i) => (i+1) + '. [' + t.type + '] ' + t.name + ' (id: ' + t.id + ')').join('\n');
    const eventsText = serializeEventsForDoc(events);
    const metaText  = 'Contesto: ' + (context||'N/A') + '\nURL: ' + (meta.url||'N/A') + '\nDurata: ' + duration + '\nEventi totali: ' + events.length + '\nSessione: ' + (meta.id||state.sessionId||'N/A');

    addSysLog('📄 Chiamata Claude per analisi tecnico-funzionale…');

    // System prompt compatto — stessa qualità, ~60% token in meno
    const jsonSchema = '{"processName":"nome","executiveSummary":"narrativo completo","timeline":[{"step":1,"task":"nome","azione":"azione utente","sistema":"risposta sistema","durata":"Ns","esito":"Completato|Errore|Parziale","anomalie":"nessuna o descrizione"}],"taskAnalysis":[{"id":"T_1","nome":"nome","tipo":"userTask|serviceTask|etc","obiettivo":"scopo","azioniUtente":"cosa ha fatto","comportamentoSistema":"risposta app","eventiCorrelati":"eventi associati","valutazione":"Completato|Rallentato|Errore|Ripetuto|Abbandonato","criticita":"nessuna o descrizione","raccomandazioni":"nessuna o suggerimento"}],"anomalie":[{"anomalia":"descrizione","task":"task","evidenze":"dati","causa":"causa","impatto":"ALTO|MEDIO|BASSO"}],"comportamentale":"analisi narrativa","conclusioni":{"statoGenerale":"Completato|Interrotto|Degradato","criticita":["item"],"raccomandazioni":["item"]}}';

    const systemPrompt = 'Sei un analista tecnico-funzionale senior BPM. Ricevi task BPMN ed eventi di sessione. Produci analisi strutturata professionale per stakeholder business e team tecnici. Rispondi SOLO con JSON valido, nessun testo aggiuntivo, nessun markdown, nessun backtick. Schema: ' + jsonSchema;

    const userPrompt = 'BPMN Tasks:\n' + tasksText + '\n\nSession Events:\n' + eventsText + '\n\nMetadata:\n' + metaText;

    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 180_000); // 3 minuti

    // Messaggi progressivi — rassicurano l'utente durante l'elaborazione lunga
    const _w1 = setTimeout(() => addSysLog('⏳ Elaborazione in corso, l\'analisi è articolata…'), 30_000);
    const _w2 = setTimeout(() => addSysLog('⏳ Claude sta elaborando tutte le sezioni del documento…'), 75_000);
    const _w3 = setTimeout(() => addSysLog('⏳ Quasi pronto — assemblaggio in corso…'), 120_000);
    const clearWaiters = () => { clearTimeout(_w1); clearTimeout(_w2); clearTimeout(_w3); };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type':'application/json', 'x-api-key': state.apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:8192, system: systemPrompt, messages:[{ role:'user', content: userPrompt }] }),
    });
    clearTimeout(tid);

    clearWaiters();
    if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || 'HTTP '+res.status); }

    const raw  = (await res.json()).content?.[0]?.text || '';
    let jsonStr = raw.replace(/^```json\s*/im,'').replace(/^```\s*/im,'').replace(/```\s*$/im,'').trim();

    // Repair JSON troncato (Claude ha raggiunto max_tokens a metà risposta)
    try {
      JSON.parse(jsonStr);
    } catch (e) {
      const lastBrace  = jsonStr.lastIndexOf('"}');
      const lastBrack  = jsonStr.lastIndexOf(']');
      const cutPoint   = Math.max(lastBrace + 2, lastBrack + 1);
      if (cutPoint > 10) {
        jsonStr = jsonStr.slice(0, cutPoint);
        let opens = 0, openArr = 0;
        for (const ch of jsonStr) {
          if (ch === '{') opens++; else if (ch === '}') opens--;
          else if (ch === '[') openArr++; else if (ch === ']') openArr--;
        }
        while (openArr > 0) { jsonStr += ']'; openArr--; }
        while (opens > 0)   { jsonStr += '}'; opens--; }
      }
    }
    const data = JSON.parse(jsonStr);

    addSysLog('📄 Analisi ricevuta — assemblaggio documento…');
    await buildAndDownloadBpmnDoc(data, meta, context);
    showToast('📄 Analisi Tecnico-Funzionale scaricata ✓', 'success');
    addSysLog('📄 Documento scaricato: Analisi-Tecnico-Funzionale.docx');

  } catch (err) {
    if (typeof clearWaiters === 'function') clearWaiters();
    const isAbort = err.name === 'AbortError' || err.message.includes('aborted');
    const msg = isAbort
      ? '⏱ Timeout: la generazione ha impiegato più di 3 minuti. Riprova.'
      : err.message;
    showToast('✗ ' + msg, 'error');
    addSysLog('⚠ Errore Step 12: ' + msg);
    console.error('[FL Doc]', err);
  } finally {
    if (btn) { btn.textContent = origText || '📄 Analisi'; btn.disabled = false; }
  }
}

// ─── DOCUMENTO 2: Analytics Report ───────────────────────────────────────────
async function generateAnalyticsReport() {
  if (!state.insightsData) { showToast('Genera prima gli Insights', 'error'); return; }

  const btn = document.getElementById('btnDocReport');
  const origText = btn?.textContent;
  if (btn) { btn.textContent = '⏳…'; btn.disabled = true; }

  try {
    addSysLog('📄 Assemblaggio Analytics Report…');
    await buildAndDownloadAnalyticsDoc(state.insightsData, state._insightsEvents || [], state.replaySession || { id: state.sessionId });
    showToast('📄 Analytics Report scaricato ✓', 'success');
    addSysLog('📄 Documento scaricato: Analytics-Report.docx');
  } catch (err) {
    showToast('✗ Errore generazione report: ' + err.message, 'error');
    addSysLog('⚠ Errore Analytics Report: ' + err.message);
    console.error('[FL Doc]', err);
  } finally {
    if (btn) { btn.textContent = origText || '📄 Report'; btn.disabled = false; }
  }
}



// ─── BUILDER DOCUMENTO 1 — Analisi Tecnico-Funzionale ────────────────────────
async function buildAndDownloadBpmnDoc(data, meta, context) {
  const docx = await loadDocx();
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat, PageBreak } = docx;

  const C_BLACK='0A0A0A', C_GRAY='6B7280', C_LGRAY='9CA3AF';
  const C_BORDER='E5E7EB', C_ACCENT='F3F4F6';
  const C_RED='FEF2F2', C_YEL='FEFCE8', C_GRN='F0FDF4';
  const FONT='Inter';

  const tb={style:BorderStyle.SINGLE,size:2,color:C_BORDER};
  const tbs={top:tb,bottom:tb,left:tb,right:tb};
  const cm={top:100,bottom:100,left:140,right:140};

  function pn(n){ return new Paragraph({spacing:{before:0,after:200},children:[new TextRun({text:n,font:FONT,size:18,color:C_LGRAY})]}); }
  function H1(t){ return new Paragraph({spacing:{before:0,after:240},children:[new TextRun({text:t,font:FONT,size:52,bold:true,color:C_BLACK})]}); }
  function lead(t){ return new Paragraph({spacing:{before:0,after:320},children:[new TextRun({text:String(t||''),font:FONT,size:28,color:C_BLACK})]}); }
  function bd(t){ return new Paragraph({spacing:{before:0,after:160},children:[new TextRun({text:String(t||''),font:FONT,size:20,color:C_GRAY})]}); }
  function lbl(t){ return new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:t.toUpperCase(),font:FONT,size:16,color:C_LGRAY,bold:true})]}); }
  function sep(){ return new Paragraph({spacing:{before:400,after:0},border:{bottom:{style:BorderStyle.SINGLE,size:2,color:C_BORDER,space:0}},children:[new TextRun('')]}); }
  function sp(b){ return new Paragraph({spacing:{before:b||240,after:0},children:[new TextRun('')]}); }
  function blt(t){ return new Paragraph({numbering:{reference:'blt',level:0},spacing:{before:40,after:80},children:[new TextRun({text:String(t||''),font:FONT,size:20,color:C_GRAY})]}); }
  function pb(){ return new Paragraph({children:[new PageBreak()]}); }
  function mh(t,w){ return new TableCell({shading:{fill:C_BLACK,type:ShadingType.CLEAR},borders:tbs,margins:cm,width:{size:w,type:WidthType.DXA},children:[new Paragraph({children:[new TextRun({text:t,font:FONT,size:16,bold:true,color:'FFFFFF'})]})]}); }
  function mc(t,w,f){ return new TableCell({shading:{fill:f||'FFFFFF',type:ShadingType.CLEAR},borders:tbs,margins:cm,width:{size:w,type:WidthType.DXA},children:[new Paragraph({children:[new TextRun({text:String(t||'--'),font:FONT,size:18,color:C_BLACK})]})]}); }

  const dur=meta.endTime&&meta.startTime?Math.round((meta.endTime-meta.startTime)/1000)+'s':'N/A';
  const procName=data.processName||context||'Processo Sevenda';
  const sid=meta.id||state.sessionId||'N/A';
  const dd=new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'});

  const cover=[
    sp(2880),
    new Paragraph({spacing:{before:0,after:120},children:[new TextRun({text:'\u223f\u223f\u223f',font:FONT,size:28,color:C_LGRAY})]}),
    new Paragraph({spacing:{before:0,after:200},children:[new TextRun({text:'Sevenda',font:FONT,size:72,bold:true,color:C_BLACK})]}),
    new Paragraph({spacing:{before:0,after:80},children:[new TextRun({text:'Analisi Tecnico-Funzionale',font:FONT,size:36,color:C_BLACK})]}),
    new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:procName,font:FONT,size:36,color:C_BLACK})]}),
    sp(200),
    new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:dd+' \u00b7 Riservato',font:FONT,size:18,color:C_LGRAY})]}),
    new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:'Sessione: '+sid+' \u00b7 Durata: '+dur,font:FONT,size:18,color:C_LGRAY})]}),
    sep(),pb(),
  ];

  const sec1=[pn('01'),H1('Executive Summary'),lead(data.executiveSummary||'N/D.'),sep(),pb()];

  const tlRows=(data.timeline||[]).map(function(r,i){return new TableRow({children:[
    mc(r.step,500,i%2?'FFFFFF':C_ACCENT),mc(r.task,2000,i%2?'FFFFFF':C_ACCENT),
    mc(r.azione,1700,i%2?'FFFFFF':C_ACCENT),mc(r.sistema,1700,i%2?'FFFFFF':C_ACCENT),
    mc(r.durata,700,i%2?'FFFFFF':C_ACCENT),
    mc(r.esito,800,r.esito==='Completato'?C_GRN:r.esito==='Errore'?C_RED:(i%2?'FFFFFF':C_ACCENT)),
    mc(r.anomalie,1500,i%2?'FFFFFF':C_ACCENT),
  ]});});
  const sec2=[pn('02'),H1('Timeline Operativa'),
    tlRows.length?new Table({width:{size:8900,type:WidthType.DXA},columnWidths:[500,2000,1700,1700,700,800,1500],
      rows:[new TableRow({children:[mh('Step',500),mh('Task BPMN',2000),mh('Azione',1700),mh('Sistema',1700),mh('Durata',700),mh('Esito',800),mh('Anomalie',1500)]})].concat(tlRows)})
    :bd('Nessun dato.'),
    sep(),pb()];

  const sec3=[pn('03'),H1('Analisi Dettagliata per Task')];
  (data.taskAnalysis||[]).forEach(function(t,i){
    if(i>0)sec3.push(sp(320));
    sec3.push(new Paragraph({spacing:{before:0,after:120},border:{left:{style:BorderStyle.SINGLE,size:12,color:C_BLACK,space:6}},indent:{left:240},children:[new TextRun({text:t.nome||t.id,font:FONT,size:28,bold:true,color:C_BLACK})]}));
    [['Tipo',t.tipo],['Obiettivo',t.obiettivo],['Azioni utente',t.azioniUtente],['Sistema',t.comportamentoSistema],['Valutazione',t.valutazione],['Criticita',t.criticita],['Raccomandazioni',t.raccomandazioni]].forEach(function(kv){
      var k=kv[0],v=kv[1];
      if(v&&v!=='nessuna'&&v!=='nessuno'&&v!=='N/A')
        sec3.push(new Paragraph({spacing:{before:80,after:40},children:[new TextRun({text:k+': ',font:FONT,size:18,bold:true,color:C_BLACK}),new TextRun({text:String(v),font:FONT,size:18,color:C_GRAY})]}));
    });
  });
  sec3.push(sep());sec3.push(pb());

  const anRows=(data.anomalie||[]).map(function(r,i){return new TableRow({children:[
    mc(r.anomalia,2000,i%2?'FFFFFF':C_ACCENT),mc(r.task,1400,i%2?'FFFFFF':C_ACCENT),
    mc(r.evidenze,1900,i%2?'FFFFFF':C_ACCENT),mc(r.causa,1900,i%2?'FFFFFF':C_ACCENT),
    mc(r.impatto,700,r.impatto==='ALTO'?C_RED:r.impatto==='MEDIO'?C_YEL:C_GRN),
  ]});});
  const sec4=[pn('04'),H1('Analisi delle Anomalie'),
    anRows.length?new Table({width:{size:7900,type:WidthType.DXA},columnWidths:[2000,1400,1900,1900,700],
      rows:[new TableRow({children:[mh('Anomalia',2000),mh('Task',1400),mh('Evidenze',1900),mh('Causa',1900),mh('Impatto',700)]})].concat(anRows)})
    :bd('Nessuna anomalia.'),
    sep(),pb()];

  const sec5=[pn('05'),H1('Analisi Comportamentale'),bd(data.comportamentale||'N/D.'),sep(),pb()];

  const sec6=[
    pn('06'),H1('Conclusioni Finali'),
    lbl('Stato generale'),
    new Paragraph({spacing:{before:0,after:320},children:[new TextRun({text:data.conclusioni&&data.conclusioni.statoGenerale||'N/A',font:FONT,size:36,bold:true,color:C_BLACK})]}),
    lbl('Criticita principali'),
  ].concat((data.conclusioni&&data.conclusioni.criticita||[]).map(function(c){return blt(c);}))
  .concat([sp(200),lbl('Raccomandazioni')])
  .concat((data.conclusioni&&data.conclusioni.raccomandazioni||[]).map(function(r){return blt(r);}))
  .concat([sep(),sp(160),new Paragraph({spacing:{before:0,after:0},children:[new TextRun({text:'Sevenda v0.2.0 \u00b7 Analisi Tecnico-Funzionale \u00b7 '+dd+' \u00b7 sevenda.dev',font:FONT,size:16,color:C_LGRAY})]})]);

  var allChildren=cover.concat(sec1).concat(sec2).concat(sec3).concat(sec4).concat(sec5).concat(sec6);
  var doc=new Document({
    numbering:{config:[{reference:'blt',levels:[{level:0,format:LevelFormat.BULLET,text:'\u2014',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:480,hanging:240}}}}]}]},
    styles:{default:{document:{run:{font:FONT,size:22}}}},
    sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1440}}},children:allChildren}]
  });
  var blob=await Packer.toBlob(doc);
  downloadBlob(blob,'Sevenda-Analisi-'+(meta.id||state.sessionId||'export')+'.docx');
}

// ─── BUILDER DOCUMENTO 2 — Analytics Report ───────────────────────────────────
async function buildAndDownloadAnalyticsDoc(insights, events, meta) {
  const docx = await loadDocx();
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat, PageBreak } = docx;

  const C_BLACK='0A0A0A', C_GRAY='6B7280', C_LGRAY='9CA3AF';
  const C_BORDER='E5E7EB', C_ACCENT='F3F4F6';
  const C_RED='FEF2F2', C_YEL='FEFCE8', C_GRN='F0FDF4';
  const FONT='Inter';

  const tb={style:BorderStyle.SINGLE,size:2,color:C_BORDER};
  const tbs={top:tb,bottom:tb,left:tb,right:tb};
  const cm={top:100,bottom:100,left:140,right:140};

  function pn(n){ return new Paragraph({spacing:{before:0,after:200},children:[new TextRun({text:n,font:FONT,size:18,color:C_LGRAY})]}); }
  function H1(t){ return new Paragraph({spacing:{before:0,after:240},children:[new TextRun({text:t,font:FONT,size:52,bold:true,color:C_BLACK})]}); }
  function bd(t){ return new Paragraph({spacing:{before:0,after:160},children:[new TextRun({text:String(t||''),font:FONT,size:20,color:C_GRAY})]}); }
  function lbl(t){ return new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:t.toUpperCase(),font:FONT,size:16,color:C_LGRAY,bold:true})]}); }
  function sep(){ return new Paragraph({spacing:{before:400,after:0},border:{bottom:{style:BorderStyle.SINGLE,size:2,color:C_BORDER,space:0}},children:[new TextRun('')]}); }
  function sp(b){ return new Paragraph({spacing:{before:b||240,after:0},children:[new TextRun('')]}); }
  function blt(t){ return new Paragraph({numbering:{reference:'blt',level:0},spacing:{before:40,after:80},children:[new TextRun({text:String(t||''),font:FONT,size:20,color:C_GRAY})]}); }
  function pb(){ return new Paragraph({children:[new PageBreak()]}); }
  function mh(t,w){ return new TableCell({shading:{fill:C_BLACK,type:ShadingType.CLEAR},borders:tbs,margins:cm,width:{size:w,type:WidthType.DXA},children:[new Paragraph({children:[new TextRun({text:t,font:FONT,size:16,bold:true,color:'FFFFFF'})]})]}); }
  function mc(t,w,f){ return new TableCell({shading:{fill:f||'FFFFFF',type:ShadingType.CLEAR},borders:tbs,margins:cm,width:{size:w,type:WidthType.DXA},children:[new Paragraph({children:[new TextRun({text:String(t||'--'),font:FONT,size:18,color:C_BLACK})]})]}); }

  const tools=insights.trackingTools||{};
  const dd=new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'});
  const sid=meta&&meta.id||state.sessionId||'N/A';

  const cover=[
    sp(2880),
    new Paragraph({spacing:{before:0,after:120},children:[new TextRun({text:'\u223f\u223f\u223f',font:FONT,size:28,color:C_LGRAY})]}),
    new Paragraph({spacing:{before:0,after:200},children:[new TextRun({text:'Sevenda',font:FONT,size:72,bold:true,color:C_BLACK})]}),
    new Paragraph({spacing:{before:0,after:80},children:[new TextRun({text:'Analytics Report',font:FONT,size:36,color:C_BLACK})]}),
    new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:insights.summary||'Analisi sessione',font:FONT,size:36,color:C_BLACK})]}),
    sp(200),
    new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:dd+' \u00b7 Riservato',font:FONT,size:18,color:C_LGRAY})]}),
    new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:'Sessione: '+sid,font:FONT,size:18,color:C_LGRAY})]}),
    new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:'\u26a1 Generato da Insights cache \u00b7 nessuna chiamata AI',font:FONT,size:18,color:C_LGRAY})]}),
    sep(),pb(),
  ];

  var trRows=[
    ['Google Tag Manager',tools.gtmDetected?('Attivo'+(tools.gtmId?' ('+tools.gtmId+')'  :'')):'Non rilevato',tools.gtmDetected?'\u2713':'\u2717'],
    ['Google Analytics 4',tools.ga4Detected?('Attivo'+(tools.ga4MeasurementId?' ('+tools.ga4MeasurementId+')'  :'')):'Non rilevato',tools.ga4Detected?'\u2713':'\u2717'],
  ].map(function(r,i){return new TableRow({children:[mc(r[0],3200,i%2?'FFFFFF':C_ACCENT),mc(r[1],4900,i%2?'FFFFFF':C_ACCENT),mc(r[2],800,r[2]==='\u2713'?C_GRN:C_RED)]});});
  const sec1=[pn('01'),H1('Stato Tracking Attuale'),
    new Table({width:{size:8900,type:WidthType.DXA},columnWidths:[3200,4900,800],
      rows:[new TableRow({children:[mh('Tool',3200),mh('Stato',4900),mh('Rilevato',800)]})].concat(trRows)}),
    sep(),pb()];

  var evRows=(insights.suggestedEvents||[]).map(function(ev,i){return new TableRow({children:[
    mc(ev.eventName,2200,i%2?'FFFFFF':C_ACCENT),
    mc(ev.trigger&&(ev.trigger.condition||ev.trigger.type)||'--',3200,i%2?'FFFFFF':C_ACCENT),
    mc(ev.priority,700,ev.priority==='HIGH'?C_RED:ev.priority==='MEDIUM'?C_YEL:C_GRN),
    mc(ev.notes||'--',2800,i%2?'FFFFFF':C_ACCENT),
  ]});});
  const sec2=[pn('02'),H1('Eventi GTM Suggeriti'),
    evRows.length?new Table({width:{size:8900,type:WidthType.DXA},columnWidths:[2200,3200,700,2800],
      rows:[new TableRow({children:[mh('Evento',2200),mh('Trigger',3200),mh('Priorita',700),mh('Note',2800)]})].concat(evRows)})
    :bd('Nessun evento identificato.'),
    sep(),pb()];

  var gpRows=(insights.trackingGaps||[]).map(function(g,i){return new TableRow({children:[
    mc(g.description,2800,i%2?'FFFFFF':C_ACCENT),
    mc(g.severity,700,g.severity==='HIGH'?C_RED:g.severity==='MEDIUM'?C_YEL:C_GRN),
    mc(g.evidence,2400,i%2?'FFFFFF':C_ACCENT),
    mc(g.suggestedFix,3000,i%2?'FFFFFF':C_ACCENT),
  ]});});
  const sec3=[pn('03'),H1('Gap Critici di Tracking'),
    gpRows.length?new Table({width:{size:8900,type:WidthType.DXA},columnWidths:[2800,700,2400,3000],
      rows:[new TableRow({children:[mh('Gap',2800),mh('Severity',700),mh('Evidenza',2400),mh('Fix Suggerito',3000)]})].concat(gpRows)})
    :bd('Nessun gap rilevato.'),
    sep(),pb()];

  var acts=[]
    .concat((insights.trackingGaps||[]).filter(function(g){return g.severity==='HIGH';}).map(function(g){return 'Critico: '+g.suggestedFix;}))
    .concat((insights.trackingGaps||[]).filter(function(g){return g.severity==='MEDIUM';}).map(function(g){return 'Medio: '+g.suggestedFix;}))
    .concat((insights.suggestedEvents||[]).filter(function(e){return e.priority==='HIGH';}).map(function(e){return 'Implementare: '+e.eventName;}));

  var sec4=[pn('04'),H1("Piano d'Azione")]
    .concat(acts.length?acts.map(function(a){return blt(a);}):[ bd('Nessuna azione prioritaria.') ])
    .concat([sep(),sp(160),
      new Paragraph({spacing:{before:0,after:0},children:[new TextRun({text:'Sevenda v0.2.0 \u00b7 Analytics Report \u00b7 '+dd+' \u00b7 sevenda.dev',font:FONT,size:16,color:C_LGRAY})]})]);

  var allChildren=cover.concat(sec1).concat(sec2).concat(sec3).concat(sec4);
  var doc=new Document({
    numbering:{config:[{reference:'blt',levels:[{level:0,format:LevelFormat.BULLET,text:'\u2014',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:480,hanging:240}}}}]}]},
    styles:{default:{document:{run:{font:FONT,size:22}}}},
    sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1440}}},children:allChildren}]
  });
  var blob=await Packer.toBlob(doc);
  downloadBlob(blob,'Sevenda-Analytics-Report-'+(meta&&meta.id||state.sessionId||'export')+'.docx');
}


// ─── Download helper ──────────────────────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ─── FINE STEP 12 ────────────────────────────────────────────────────────────

// ── TEMA ──────────────────────────────────────────────────────────────────────
// Applica il tema salvato in chrome.storage.sync al caricamento del pannello
// e si aggiorna in tempo reale se l'utente lo cambia dalla options page.
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'light');
}

chrome.storage.sync.get('theme', (data) => {
  applyTheme(data.theme || 'light');
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.theme) {
    applyTheme(changes.theme.newValue);
  }
});

// Avvia
connect();
// Registra patch porta per Jira dopo che connect() ha creato state.port
_patchPortForJira();
