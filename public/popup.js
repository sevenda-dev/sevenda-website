// popup.js — Sevenda

// ── MODE SWITCH ───────────────────────────────────────────────────────────────
// Gestisce il toggle BPMN / Insights nel popup.
// La modalità viene salvata in chrome.storage.sync (persiste tra sessioni)
// e comunicata al panel tramite chrome.storage.onChanged.

const MODE_DESCRIPTIONS = {
  bpmn:     'Flussi di processo, errori tecnici, documentazione BPMN.',
  insights: 'Comportamento utente, tracking GTM/GA4, tag plan.',
};

const btnBpmn     = document.getElementById('modeBpmn');
const btnInsights = document.getElementById('modeInsights');
const modeDesc    = document.getElementById('modeDesc');

// Applica lo stato visivo del toggle al popup
function setModeUI(mode) {
  const isBpmn = mode === 'bpmn';
  btnBpmn.classList.toggle('active', isBpmn);
  btnInsights.classList.toggle('active', !isBpmn);
  modeDesc.textContent = MODE_DESCRIPTIONS[mode] || MODE_DESCRIPTIONS.bpmn;
}

// Carica la modalità salvata all'apertura del popup
chrome.storage.sync.get(['fl_mode'], (data) => {
  setModeUI(data.fl_mode || 'bpmn');
});

// Gestisce il click su "BPMN"
btnBpmn.addEventListener('click', () => {
  setModeUI('bpmn');
  // Salva in storage — il panel.js ascolta chrome.storage.onChanged e si adatta
  chrome.storage.sync.set({ fl_mode: 'bpmn' });
});

// Gestisce il click su "📊 Insights"
btnInsights.addEventListener('click', () => {
  setModeUI('insights');
  chrome.storage.sync.set({ fl_mode: 'insights' });
});

// ── DEVTOOLS ──────────────────────────────────────────────────────────────────
// Non è possibile aprire DevTools programmaticamente da un popup.
// Al click mostriamo un hint inline contestuale invece di chiudere senza feedback.
document.getElementById('btnDevtools').addEventListener('click', () => {
  const hint = document.getElementById('devtoolsHint');
  const isVisible = hint.classList.contains('visible');
  if (isVisible) {
    // secondo click: chiude il popup
    window.close();
  } else {
    hint.classList.add('visible');
  }
});

// ── SETTINGS ──────────────────────────────────────────────────────────────────
document.getElementById('btnSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ── SESSIONI ──────────────────────────────────────────────────────────────────
// Apre la options page navigando direttamente alla sezione "Sessioni salvate"
// tramite hash — options.js legge location.hash all'avvio.
document.getElementById('btnSessions').addEventListener('click', () => {
  const url = chrome.runtime.getURL('public/options.html') + '#sessions';
  chrome.tabs.create({ url });
  window.close();
});

// ── SUPPORTO ──────────────────────────────────────────────────────────────────
document.getElementById('btnAbout').addEventListener('click', () => {
  const url = chrome.runtime.getURL('public/options.html') + '#about';
  chrome.tabs.create({ url });
  window.close();
});

// ── STATUS SYNC ───────────────────────────────────────────────────────────────
try {
  chrome.runtime.sendMessage({ type: 'PING' }, () => {
    if (chrome.runtime.lastError) return;
    chrome.storage.session?.get?.(['isRecording'], (data) => {
      if (data?.isRecording) {
        document.getElementById('statusPill').className = 'status-pill recording';
        document.getElementById('statusText').textContent = 'REC';
      }
    });
  });
} catch (e) {}
