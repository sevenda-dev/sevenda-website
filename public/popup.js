// popup.js — Sevenda

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
