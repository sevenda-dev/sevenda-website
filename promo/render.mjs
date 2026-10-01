#!/usr/bin/env node
// Rendering deterministico di promo.html → frames/frame-00000.png …
//
// Ogni frame è funzione pura del tempo: la pagina espone window.__seek(tMs),
// che porta tutte le animazioni CSS (pausate, sulla stessa timeline) a tMs.
// Per ogni frame: seek → due requestAnimationFrame (layout/paint post-seek)
// → screenshot. Viewport 1920×1080 con deviceScaleFactor 2 (PNG 3840×2160):
// encode.sh riscala a 1920×1080, così il testo resta nitido (supersampling).
//
// Uso:  node render.mjs [--fps 30] [--duration 45] [--out frames] [--only 0,150,900]
//       [--page promo-vertical.html --width 1080 --height 1920]   (variante 9:16)
//       CHROME_PATH=/percorso/chrome  (facoltativo, se non è installato `playwright`)

import { mkdirSync, rmSync, existsSync, createReadStream } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const FPS = parseInt(arg('--fps', '30'), 10);
const DURATION = parseFloat(arg('--duration', '45'));
const OUT = resolve(here, arg('--out', 'frames'));
const ONLY = arg('--only', null)?.split(',').map(Number) ?? null;
const PAGE = arg('--page', 'promo.html');                 // es. promo-vertical.html
const W = parseInt(arg('--width', '1920'), 10), H = parseInt(arg('--height', '1080'), 10);

// Playwright completo se installato, altrimenti playwright-core + CHROME_PATH
let chromium, launchOpts = { args: ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars'] };
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('playwright-core')); launchOpts.executablePath = process.env.CHROME_PATH; if (!launchOpts.executablePath) throw new Error('Installa `playwright` oppure imposta CHROME_PATH'); }

const N = Math.round(DURATION * FPS);
const frames = ONLY ?? Array.from({ length: N }, (_, i) => i);
if (!ONLY) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Server statico locale: evita le restrizioni di file:// sui font e rende
// il caricamento identico a ogni run (nessuna rete esterna coinvolta).
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const file = resolve(here, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(here) || !existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
await page.goto(`${base}/${PAGE}`, { waitUntil: 'load' });

// Pronto solo dopo document.fonts.ready + primo paint
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
const check = await page.evaluate(() => ({
  geist: document.fonts.check('600 32px Geist'), mono: document.fonts.check('400 16px "Geist Mono"'),
  animations: document.getAnimations().length,
  allPaused: document.getAnimations().every(a => a.playState === 'paused'),
}));
if (!check.geist || !check.mono) { console.error('Geist non caricato:', check); process.exit(2); }
console.log(`${PAGE} ${W}x${H}@2 · ready · Geist ok · ${check.animations} animations (all paused: ${check.allPaused}) · ${frames.length} frames @ ${FPS}fps`);

const t0 = Date.now();
for (const i of frames) {
  const t = i / FPS * 1000;
  await page.evaluate(t => window.__seek(t), t);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: `${OUT}/frame-${String(i).padStart(5, '0')}.png`, type: 'png', animations: 'allow', caret: 'hide' });
  if (i % (FPS * 5) === 0) process.stdout.write(`  frame ${i}/${N}  t=${(t / 1000).toFixed(1)}s\n`);
}
await browser.close();
server.close();
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${OUT}`);
