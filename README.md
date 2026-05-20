# Sevenda — Step 1: Foundation

## Struttura del progetto

```
sevenda/
├── manifest.json                        # MV3 Chrome Extension manifest
│
├── src/
│   ├── background/
│   │   ├── service-worker.js            # Event bus centrale + gestione sessioni
│   │   └── storage-manager.js          # IndexedDB wrapper
│   │
│   ├── content/
│   │   └── content-script.js           # Iniettato in ogni pagina
│   │
│   ├── devtools/
│   │   ├── devtools.html               # Entry point DevTools
│   │   └── devtools.js                 # Crea il pannello nel DevTools
│   │
│   └── processor/
│       └── event-schema.js             # Schema normalizzato degli eventi
│
└── public/
    ├── panel.html                       # UI del pannello DevTools
    ├── panel.js                         # Logica del pannello
    ├── popup.html                       # Popup icona toolbar
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

## Installazione in Chrome

1. Apri Chrome e vai su `chrome://extensions/`
2. Attiva **Modalità sviluppatore** (toggle in alto a destra)
3. Clicca **Carica estensione non pacchettizzata**
4. Seleziona la cartella `sevenda/`

## Verifica Step 1 ✓

Dopo il caricamento, eseguire questi controlli in ordine:

### 1. L'estensione si carica senza errori
- [ ] L'icona ◈ appare nella toolbar di Chrome
- [ ] Nessun errore nella card dell'estensione su `chrome://extensions/`
- [ ] Il service worker appare come "Attivo" nella card

### 2. Il popup funziona
- [ ] Clic sull'icona → appare il popup con le istruzioni per aprire DevTools

### 3. Il pannello DevTools è presente
- [ ] Apri DevTools (`F12`) su qualsiasi pagina
- [ ] Appare il tab **"BPMN Recorder"**
- [ ] Nel panel: status badge mostra "Idle" (grigio)
- [ ] La barra in basso mostra "Connesso al service worker"

### 4. Il ping/pong funziona (test comunicazione)
Apri la console del service worker (`chrome://extensions/` → Dettagli → "Service Worker"):
```javascript
// Invia un ping dal service worker
chrome.runtime.sendMessage({ type: 'PING' }, console.log)
// Atteso: { pong: true, timestamp: ... }
```

### 5. Start/Stop Recording
- [ ] Clicca "Avvia Registrazione" → status badge diventa rosso "REC"
- [ ] Il session ID appare nell'header
- [ ] Fai click sulla pagina → gli eventi appaiono nel log stream
- [ ] Clicca "Stop" → torna a "Idle"

### 6. IndexedDB popolata
Apri DevTools → Application → IndexedDB → `sevenda`:
- [ ] Store `sessions` contiene la sessione appena registrata
- [ ] Store `events` contiene gli eventi catturati
- [ ] Store `bpmn-drafts` esiste (vuoto, usato da Step 5)
- [ ] Store `settings` esiste (vuoto, usato da Step 5)

## Messaggi implementati (Step 1)

### Content Script → Service Worker
| Tipo | Payload | Scopo |
|------|---------|-------|
| `CONTENT_SCRIPT_READY` | — | Notifica inizializzazione |
| `EVENTS_BATCH` | `{ sessionId, events[] }` | Invia batch di eventi |
| `JS_ERROR` | `{ event }` | Errore JavaScript catturato |
| `PING` | — | Health check |

### DevTools Panel → Service Worker (via Port)
| Tipo | Payload | Scopo |
|------|---------|-------|
| `PANEL_INIT` | `{ tabId }` | Identifica la connessione |
| `START_RECORDING` | `{ url }` | Avvia la sessione |
| `STOP_RECORDING` | — | Ferma la sessione |
| `GET_SESSION_EVENTS` | `{ sessionId }` | Recupera eventi salvati |
| `GET_SESSIONS` | — | Lista sessioni |

### Service Worker → DevTools Panel (via Port)
| Tipo | Payload | Scopo |
|------|---------|-------|
| `STATE_SYNC` | `{ isRecording, sessionId }` | Stato iniziale |
| `RECORDING_STARTED` | `{ sessionId, timestamp }` | Conferma avvio |
| `RECORDING_STOPPED` | `{ sessionId, eventCount }` | Conferma stop |
| `EVENTS_RECEIVED` | `{ events[], sessionId }` | Streaming eventi |
| `ERROR` | `{ message }` | Errore interno |

## Prossimo step

**Step 2 — Event Capture** aggiungerà:
- `chrome.devtools.network` per intercettare le chiamate di rete
- `fetch` e `XHR` monkey-patch nel content script  
- `MutationObserver` per mutazioni DOM rilevanti
- Pipeline di filtro e scoring degli eventi
