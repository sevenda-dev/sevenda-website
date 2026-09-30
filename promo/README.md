# Sevenda — promo video (45 s, deterministic render)

`promo.html` è una scena 1920×1080 in cui **tutte** le animazioni vivono sulla
stessa timeline CSS di 45 000 ms. Il video si ottiene portando quella timeline a
`t = i / fps` per ogni fotogramma, catturando uno screenshot e assemblando i PNG
con ffmpeg. Il risultato è nitido (cattura a 2×, downscale lanczos), usa il font
Geist reale caricato in locale e **due run producono frame byte-identici**.

## File

| File | Ruolo |
| --- | --- |
| `promo.html` | La scena: HTML + CSS autosufficienti, nessuna risorsa remota. Espone `window.__seek(tMs)` e `window.__ready`. |
| `fonts/Geist-Variable.woff2`, `fonts/GeistMono-Variable.woff2` | Geist e Geist Mono (SIL OFL), dal pacchetto npm [`geist`](https://www.npmjs.com/package/geist) 1.7.2, caricati via `@font-face`. |
| `logomark.png` | Logo doppio-diamante arancione (copia di `../logo-mark.png`). |
| `render.mjs` | Node + Playwright: apre la scena, esegue il seek fotogramma per fotogramma e salva `frames/frame-00000.png …` (3840×2160). |
| `encode.sh` | ffmpeg: `frames/*.png` → `sevenda-promo.mp4` 1920×1080, h264/yuv420p, crf 16, preset slow, faststart. |
| `package.json` | Script `render`, `encode`, `build` e la dipendenza `playwright-core`. |
| `build.py` | Generatore di `promo.html`: la timeline è scritta in secondi e convertita in percentuali dei 45 s (facoltativo, solo Python standard). |

Output: `sevenda-promo.mp4` (1920×1080, 30 fps, 45 s, senza audio).
`frames/`, `node_modules/` e i `.mp4` sono ignorati da git (`.gitignore`).

## Rigenerare tutto

```bash
cd promo
npm install                      # installa playwright-core

# 1) Chromium: o il pacchetto completo `playwright` (scarica il browser)…
npm i -D playwright && npx playwright install chromium
# …oppure un Chrome/Chromium già presente, indicato via CHROME_PATH
export CHROME_PATH=/percorso/di/chrome

# 2) Frame (1350 PNG a 3840×2160, ~1.5 s l'uno)
node render.mjs                  # opzioni: --fps 30 --duration 45 --out frames

# 3) Video
./encode.sh                      # oppure: FFMPEG=/percorso/ffmpeg ./encode.sh 30

# tutto insieme
npm run build
```

Con `--only` si rende un sottoinsieme di fotogrammi in un'altra cartella, utile
per anteprime e per il test di determinismo:

```bash
node render.mjs --only 100,500,1000 --out det-a
node render.mjs --only 100,500,1000 --out det-b
md5sum det-a/*.png det-b/*.png   # gli hash coincidono a coppie
```

## Come funziona il determinismo

* Ogni elemento animato ha `animation-duration: 45000ms`,
  `animation-timing-function: linear`, `animation-fill-mode: both`,
  `animation-play-state: paused` (classe `.a`) e un proprio `animation-name`.
  Le scene sono intervalli di percentuali dentro i 45 s (1 % = 450 ms);
  l'easing è dichiarato **dentro** i keyframe con `animation-timing-function`.
* Gli elementi fuori dalla propria finestra temporale restano a `opacity: 0`
  tramite i keyframe stessi; le transizioni fra scene sono crossfade + leggero
  scale/translate sulla stessa timeline.
* `window.__seek(tMs)` esegue `document.getAnimations().forEach(a => a.currentTime = tMs)`.
  `window.__ready` diventa `true` dopo `document.fonts.ready` e il primo paint.
* Il frame è quindi funzione pura del tempo: niente `requestAnimationFrame` per
  animare, niente `transition`, `<video>`/GIF, `Math.random`, `steps()`.
* `render.mjs` usa viewport 1920×1080 con `deviceScaleFactor: 2`, attende
  `__ready`, verifica `document.fonts.check(...)` per Geist e Geist Mono (esce
  con errore se il font non è quello reale), poi per ogni frame:
  `__seek(t)` → due `requestAnimationFrame` (layout/paint post-seek) → screenshot PNG.
  Gli asset sono serviti da un server HTTP locale interno allo script, così il
  caricamento dei font non dipende dalle restrizioni di `file://`.
* Il tratteggio dei message flow BPMN è rivelato da una `<mask>` SVG il cui path
  solido si disegna con `stroke-dashoffset`: anche questo è un keyframe CSS.

## Storyboard (testi on-screen in inglese)

| Tempo | Scena | Caption |
| --- | --- | --- |
| 0–4.5 s | Intro: logomark + "Turn any browser session into a clear process." + chip "Powered by Claude · BYOK" | — |
| 4.5–12 s | Record: mock di un checkout e-commerce, cursore a mano che naviga e clicca, pannello Sevenda con indicatore REC e log eventi | Record a real user session. |
| 12–22 s | BPMN 2.0: due pool (User / System), userTask e serviceTask, exclusiveGateway con rami yes/no, message flow tratteggiati che si disegnano fra i pool | AI-generated BPMN 2.0 — with isolated pools & message flows. |
| 22–29 s | Insights: card GA4/GTM con barre, sparkline, numeri chiave in arancione, tag suggeriti | Instant GA4 & GTM analytics insights. |
| 29–35 s | GTM Live Push: i tag volano nel container GTM, barra di avanzamento, spunta di successo | Push tags live to your GTM container. |
| 35–40 s | DNA Narrative: motivo "fingerprint" che si disegna, narrazione riga per riga | Turn flows into a shareable narrative. |
| 40–43 s | Team: libreria condivisa, avatar, click su Invite, toast "Invitation sent" | Share with your team. |
| 43–45 s | Outro sul gradiente: logomark + wordmark "Sevenda" + sevenda.dev | — |

Le feature mostrate sono solo quelle rilasciate: session recording, BPMN 2.0
multi-pool con message flow, GA4/GTM insights, GTM Live Push, DNA Narrative,
libreria condivisa/team, BYOK con Claude.

## Modificare la scena

`promo.html` è generato da `build.py` (`python3 build.py`): la timeline è scritta
in secondi con helper come `window()`, `pop()`, `draw()`, `cursor_path()` e
convertita in percentuali dei 45 s. Il file HTML resta comunque editabile a mano:
ogni keyframe è `percentuale = secondi / 45 × 100`. Per cambiare la durata totale
vanno aggiornati `DUR` in `build.py` (o `animation-duration` nella classe `.a`)
e l'opzione `--duration` di `render.mjs`.
