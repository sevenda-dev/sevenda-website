// options.js — Sevenda
// Tutto lo script estratto da options.html per conformità CSP di Chrome MV3.

// ── NAVIGATION ───────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('section-' + btn.dataset.section).classList.add('active');
  });
});

// ── TEMA — anteprima immediata ────────────────────────────────────────────────
// Applica il tema sull'elemento <html> della options page stessa
// in modo che l'utente veda il risultato in tempo reale al click sui radio.
function applyThemePreview(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'auto');
}

// ── RADIO GROUPS ─────────────────────────────────────────────────────────────
document.querySelectorAll('.radios').forEach(grp => {
  grp.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      grp.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Se è il gruppo del tema, applica subito l'anteprima
      if (grp.id === 'themeRadios') {
        applyThemePreview(btn.dataset.val);
      }
    });
  });
});

// ── SOURCE CHIPS ──────────────────────────────────────────────────────────────
document.querySelectorAll('#sourceChips .chip').forEach(c => {
  c.addEventListener('click', () => c.classList.toggle('active'));
});

// ── MODEL GRID ────────────────────────────────────────────────────────────────
document.querySelectorAll('#modelGrid .model-chip').forEach(c => {
  c.addEventListener('click', () => {
    document.querySelectorAll('#modelGrid .model-chip').forEach(x => x.classList.remove('selected'));
    c.classList.add('selected');
  });
});

// ── API KEY ───────────────────────────────────────────────────────────────────
const apiKeyEl  = document.getElementById('apiKey');
const keyStatus = document.getElementById('keyStatus');

document.getElementById('btnToggleKey').addEventListener('click', function () {
  const show = apiKeyEl.type === 'password';
  apiKeyEl.type    = show ? 'text' : 'password';
  this.textContent = show ? 'Nascondi' : 'Mostra';
});

document.getElementById('btnSaveKey').addEventListener('click', async () => {
  const val = apiKeyEl.value.trim();
  if (!val) {
    showKeyStatus('invalid', '⚠ Inserisci una API key');
    return;
  }
  if (!val.startsWith('sk-ant-')) {
    showKeyStatus('invalid', '✕ La chiave deve iniziare con sk-ant-');
    return;
  }
  try {
    await chrome.storage.sync.set({ anthropicApiKey: val });
    showKeyStatus('valid', '✓ API key salvata');
  } catch (e) {
    showKeyStatus('invalid', '✕ Errore: ' + e.message);
  }
});

function showKeyStatus(type, msg) {
  keyStatus.className   = 'key-status ' + type;
  keyStatus.textContent = msg;
}

// ── SAVE HELPERS ─────────────────────────────────────────────────────────────
async function saveSettings(data, feedbackId) {
  try {
    await chrome.storage.sync.set(data);
    const fb = document.getElementById(feedbackId);
    fb.classList.add('show');
    setTimeout(() => fb.classList.remove('show'), 2500);
  } catch (e) {
    console.error('[FL Options]', e);
  }
}

document.getElementById('btnSaveAI').addEventListener('click', () => {
  saveSettings({
    selectedModel: document.querySelector('#modelGrid .model-chip.selected')?.dataset.model,
    outputLang:    document.getElementById('outputLang').value,
    maxTokens:     parseInt(document.getElementById('maxTokens').value),
    temperature:   parseFloat(document.getElementById('temperature').value),
  }, 'saveOkAI');
});

document.getElementById('btnSaveCapture').addEventListener('click', () => {
  const activeSources = [...document.querySelectorAll('#sourceChips .chip.active')].map(c => c.dataset.src);
  const excluded = document.getElementById('excludedDomains').value
    .split(',').map(s => s.trim()).filter(Boolean);
  saveSettings({
    activeSources,
    minImportance:   document.querySelector('#importanceRadios .radio-btn.active')?.dataset.val,
    excludedDomains: excluded,
    maxEvents:       parseInt(document.getElementById('maxEvents').value),
    flushInterval:   parseInt(document.getElementById('flushInterval').value),
  }, 'saveOkCapture');
});

document.getElementById('btnSaveGeneral').addEventListener('click', () => {
  saveSettings({
    theme:         document.querySelector('#themeRadios .radio-btn.active')?.dataset.val,
    autoScroll:    document.getElementById('autoScroll').checked,
    showDom:       document.getElementById('showDom').checked,
    timestampFmt:  document.querySelector('#tsRadios .radio-btn.active')?.dataset.val,
    retentionDays: parseInt(document.getElementById('retentionDays').value),
  }, 'saveOkGeneral');
});

document.getElementById('btnSavePrompt').addEventListener('click', () => {
  saveSettings({ systemPrompt: document.getElementById('systemPrompt').value }, 'saveOkPrompt');
});

document.getElementById('btnResetPrompt').addEventListener('click', () => {
  document.getElementById('systemPrompt').value = DEFAULT_PROMPT;
});

// ── PRESET PROMPT ─────────────────────────────────────────────────────────────
// Legge il valore iniziale del textarea come default (prima che loadSettings lo sovrascriva)
const DEFAULT_PROMPT = document.getElementById('systemPrompt').value;

const PRESETS = {
  minimal:  `Analizza gli eventi e genera un BPMN 2.0 XML minimale.\nEventi: {{EVENTS}}\nRispondi SOLO con l'XML.`,
  detailed: `Sei un esperto BPMN. Crea un processo BPMN 2.0 dettagliato con attori, attività, gateway e gestione errori.\nContesto: {{CONTEXT}}\nEventi: {{EVENTS}}\nOutput: XML BPMN 2.0 valido per Camunda Modeler.`,
  swimlane: `Genera BPMN 2.0 con Swimlanes (Frontend / Backend API / Database).\nContesto: {{CONTEXT}}\nEventi: {{EVENTS}}\nIncludi bpmn:Collaboration e bpmn:Participant.`,
};

// Sostituisce i precedenti onclick="applyPreset(...)" rimossi dall'HTML
document.querySelectorAll('.chip[data-preset]').forEach(chip => {
  chip.addEventListener('click', () => {
    const key = chip.dataset.preset;
    document.getElementById('systemPrompt').value = PRESETS[key] || DEFAULT_PROMPT;
  });
});

// ── DANGER ZONE ───────────────────────────────────────────────────────────────
document.getElementById('btnClearSessions').addEventListener('click', () => {
  if (!confirm('Eliminare TUTTE le sessioni? Questa azione è irreversibile.')) return;
  // TODO: implementare con StorageManager
  alert('Sessioni eliminate (da implementare con StorageManager)');
});

document.getElementById('btnClearSettings').addEventListener('click', () => {
  if (!confirm('Ripristinare tutte le impostazioni?')) return;
  try {
    chrome.storage.sync.clear(() => location.reload());
  } catch (e) {
    location.reload();
  }
});

// ── DEVTOOLS ──────────────────────────────────────────────────────────────────
document.getElementById('btnOpenDevtools').addEventListener('click', () => {
  // Non è possibile aprire DevTools programmaticamente — nessun feedback necessario,
  // l'utente sa già che deve usare F12 (hint visibile nella sezione Interfaccia).
});

// ── LOAD SETTINGS + HASH NAVIGATION ──────────────────────────────────────────
async function loadSettings() {
  try {
    const d = await chrome.storage.sync.get(null);

    if (d.anthropicApiKey) {
      apiKeyEl.value = d.anthropicApiKey;
      showKeyStatus('valid', '✓ API key configurata');
    }

    if (d.selectedModel) {
      document.querySelectorAll('#modelGrid .model-chip').forEach(c => {
        c.classList.toggle('selected', c.dataset.model === d.selectedModel);
      });
    }

    if (d.outputLang)                document.getElementById('outputLang').value    = d.outputLang;
    if (d.maxTokens)                 document.getElementById('maxTokens').value     = d.maxTokens;
    if (d.temperature !== undefined) document.getElementById('temperature').value   = d.temperature;
    if (d.autoScroll  !== undefined) document.getElementById('autoScroll').checked  = d.autoScroll;
    if (d.showDom     !== undefined) document.getElementById('showDom').checked     = d.showDom;
    if (d.flushInterval)             document.getElementById('flushInterval').value = d.flushInterval;
    if (d.maxEvents   !== undefined) document.getElementById('maxEvents').value     = d.maxEvents;
    if (d.retentionDays !== undefined) document.getElementById('retentionDays').value = d.retentionDays;
    if (d.systemPrompt)              document.getElementById('systemPrompt').value  = d.systemPrompt;

    if (d.excludedDomains?.length)
      document.getElementById('excludedDomains').value = d.excludedDomains.join(', ');

    if (d.activeSources) {
      document.querySelectorAll('#sourceChips .chip').forEach(c => {
        c.classList.toggle('active', d.activeSources.includes(c.dataset.src));
      });
    }

    const setRadio = (groupId, val) => {
      if (!val) return;
      document.querySelectorAll(`#${groupId} .radio-btn`).forEach(b => {
        b.classList.toggle('active', b.dataset.val === val);
      });
    };

    setRadio('themeRadios',      d.theme);
    setRadio('tsRadios',         d.timestampFmt);
    setRadio('importanceRadios', d.minImportance);

    // Applica il tema salvato sulla options page stessa
    applyThemePreview(d.theme || 'dark');

  } catch (e) {
    console.log('[FL Options] Not in extension context:', e.message);
  }

  // Naviga alla sezione indicata dall'hash (es: #sessions, #about)
  // usato quando il popup apre la options page con un target specifico.
  const hash = location.hash.replace('#', '');
  if (hash) {
    const targetBtn = document.querySelector(`.nav-item[data-section="${hash}"]`);
    if (targetBtn) targetBtn.click();
  }
}

if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
  loadSettings();
}
