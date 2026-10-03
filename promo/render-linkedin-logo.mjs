#!/usr/bin/env node
// Logo Sevenda per LinkedIn: 300×300 px, arancione su nero. Cattura a 4× (1200×1200)
// in stills/linkedin-logo@4x.png; ffmpeg lo riduce a 300×300 (PNG e JPG).
// Uso: CHROME_PATH=/percorso/chrome node render-linkedin-logo.mjs
import { existsSync, createReadStream } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
const here = dirname(fileURLToPath(import.meta.url));
let chromium, opts = { args: ['--no-sandbox', '--hide-scrollbars'] };
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('playwright-core')); opts.executablePath = process.env.CHROME_PATH; }
const MIME = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  const f = resolve(here, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(here) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] ?? 'application/octet-stream' }); createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch(opts);
const page = await browser.newPage({ viewport: { width: 300, height: 300 }, deviceScaleFactor: 4 });
await page.goto(`http://127.0.0.1:${server.address().port}/stills/linkedin-logo.html`, { waitUntil: 'load' });
await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
await page.screenshot({ path: resolve(here, 'stills/linkedin-logo@4x.png'), type: 'png' });
await browser.close(); server.close(); console.log('ok');
