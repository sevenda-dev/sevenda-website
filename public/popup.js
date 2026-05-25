// popup.js — Sevenda

// ── ONBOARDING ────────────────────────────────────────────────────────────────
// Mostrato solo al primo avvio (fl_onboarded non impostato in chrome.storage.sync).
// 3 step: Welcome → Scelta modalità → Istruzioni DevTools.
// Al completamento: nasconde #onboarding, mostra #mainBody, salva fl_onboarded.
// Non tocca nulla della logica esistente (mode switch, devtools hint, status sync).

(function initOnboarding() {
  const onboarding = document.getElementById('onboarding');
  const mainBody   = document.getElementById('mainBody');

  // Recupera lo stato di onboarding e la modalità salvata
  chrome.storage.sync.get(['fl_onboarded', 'fl_mode'], (data) => {

    // Se già completato: mostra direttamente il corpo principale
    if (data.fl_onboarded) {
      onboarding.style.display = 'none';
      mainBody.style.display   = 'block';
      return;
    }

    // ── Riferimenti DOM onboarding ──────────────────────────────────────
    const steps    = [
      document.getElementById('obStep1'),
      document.getElementById('obStep2'),
      document.getElementById('obStep3'),
    ];
    const dots     = [
      document.getElementById('obDot1'),
      document.getElementById('obDot2'),
      document.getElementById('obDot3'),
    ];
    const obBack   = document.getElementById('obBack');
    const obCardBpmn     = document.getElementById('obCardBpmn');
    const obCardInsights = document.getElementById('obCardInsights');
    const obStep2Cta     = document.getElementById('obStep2Cta');
    const obStep3Action  = document.getElementById('obStep3Action');
    const obTip          = document.getElementById('obTip');

    let currentStep     = 0; // 0-indexed
    let selectedMode    = data.fl_mode || null; // pre-seleziona se già impostata

    // Aggiorna la selezione visiva delle card modalità
    function updateModeCards() {
      obCardBpmn.classList.toggle('selected',     selectedMode === 'bpmn');
      obCardInsights.classList.toggle('selected', selectedMode === 'insights');
      // Abilita la CTA solo dopo la selezione
      obStep2Cta.disabled = !selectedMode;
    }

    // Aggiorna dots e pulsante indietro
    function updateNav() {
      dots.forEach((d, i) => d.classList.toggle('active', i === currentStep));
      obBack.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    }

    // Mostra lo step indicato (0, 1, 2)
    function goToStep(n) {
      steps[currentStep].classList.remove('active');
      currentStep = n;
      steps[currentStep].classList.add('active');
      updateNav();

      // Step 3: aggiorna il tip e il testo azione in base alla modalità scelta
      if (currentStep === 2) {
        const isBpmn = selectedMode !== 'insights';
        obStep3Action.innerHTML = isBpmn
          ? 'Visualizza gli eventi e genera <kbd>BPMN</kbd>'
          : 'Visualizza gli eventi e genera <kbd>📊 Insights</kbd>';
        obTip.className = 'ob-tip ' + (isBpmn ? 'bpmn' : 'insights');
        obTip.textContent = isBpmn
          ? '💡 In modalità BPMN vedi tutti gli eventi inclusi DOM ed ERR — utile per analisi tecniche.'
          : '💡 In modalità Insights il log mostra solo NAV, UI e NET rilevanti — nessun rumore tecnico.';
      }
    }

    // Completa l'onboarding: salva stato + modalità, mostra corpo principale
    function completeOnboarding() {
      // Salva fl_onboarded e la modalità scelta — il panel.js le leggerà
      // tramite chrome.storage.onChanged e applicherà applyMode() automaticamente
      chrome.storage.sync.set({ fl_onboarded: true, fl_mode: selectedMode || 'bpmn' });
      onboarding.style.display = 'none';
      mainBody.style.display   = 'block';
      // Aggiorna il toggle del mode switch nel corpo principale
      // per riflettere la scelta fatta durante l'onboarding
      setModeUI(selectedMode || 'bpmn');
    }

    // ── Event listener onboarding ────────────────────────────────────────
    document.getElementById('obStep1Cta').addEventListener('click', () => goToStep(1));

    // Selezione card modalità — mutuamente esclusiva
    obCardBpmn.addEventListener('click', () => {
      selectedMode = 'bpmn';
      updateModeCards();
    });
    obCardInsights.addEventListener('click', () => {
      selectedMode = 'insights';
      updateModeCards();
    });

    obStep2Cta.addEventListener('click', () => goToStep(2));

    // Step 3 CTA: completa l'onboarding e apre il hint DevTools
    document.getElementById('obStep3Cta').addEventListener('click', () => {
      completeOnboarding();
      // Mostra automaticamente l'hint DevTools così l'utente sa cosa fare
      document.getElementById('devtoolsHint').classList.add('visible');
    });

    // Pulsante indietro — torna allo step precedente
    obBack.addEventListener('click', () => {
      if (currentStep > 0) goToStep(currentStep - 1);
    });

    // Inizializza la selezione se già impostata (ritorno al popup)
    updateModeCards();
    updateNav();
  });
})();

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
