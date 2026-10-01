#!/usr/bin/env node
// Renderizza stills/opening.html e stills/closing.html in PNG 1080×1920
// (cattura a 2× → 2160×3840 "@2x"; encode con ffmpeg lanczos per la versione 1080×1920).
// Uso: CHROME_PATH=/percorso/chrome node render-stills.mjs [opening closing opening-it closing-it]
import { existsSync, createReadStream } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
const here = dirname(fileURLToPath(import.meta.url));
let chromium, opts = { args: ['--no-sandbox', '--font-render-hinting=none', '--hide-scrollbars'] };
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('playwright-core')); opts.executablePath = process.env.CHROME_PATH; }
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const f = resolve(here, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(here) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] ?? 'application/octet-stream' }); createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(opts);
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['opening', 'closing'];   // es. opening-it closing-it
for (const name of names) {
  await page.goto(`${base}/stills/${name}.html`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const ok = await page.evaluate(() => document.fonts.check('700 40px "Geist Mono"') || document.fonts.check('800 40px Geist'));
  if (!ok) { console.error('Geist Mono non caricato'); process.exit(2); }
  await page.screenshot({ path: resolve(here, `stills/sevenda-9x16-${name}@2x.png`), type: 'png' });
  console.log('ok', name);
}
await browser.close(); server.close();
