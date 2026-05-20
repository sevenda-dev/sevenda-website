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

1. Apri Chrome e vai su `chrome://extensions/`-
2. Attiva **Modalità sviluppatore** (toggle in alto a destra)
3. Clicca **Carica estensione non pacchettizzata**
4. Seleziona la cartella `sevenda/`