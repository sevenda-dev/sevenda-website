#!/usr/bin/env node
// Asset per la pagina aziendale LinkedIn, catturati a 4× e ridotti con ffmpeg (lanczos):
//   logo   → stills/linkedin-logo.html   300×300  → stills/sevenda-linkedin-logo-300.{png,jpg}
//   banner → stills/linkedin-banner.html 1128×191 → stills/sevenda-linkedin-banner-1128x191.{png,jpg}
//   cover01…cover05 → copertine del banner a rotazione (Premium): 1128×191 css px resi a 2× →
//                     stills/sevenda-linkedin-cover-0N-2256x382.png (PNG, ben sotto i 3 MB)
// Uso: CHROME_PATH=/percorso/chrome node render-linkedin.mjs [logo] [banner]   (FFMPEG=… per il binario)
import { existsSync, createReadStream, unlinkSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
const here = dirname(fileURLToPath(import.meta.url));
const JOBS = {
  logo:   { html: 'linkedin-logo.html',   w: 300,  h: 300, out: 'sevenda-linkedin-logo-300' },
  banner: { html: 'linkedin-banner.html', w: 1128, h: 191, out: 'sevenda-linkedin-banner-1128x191' },
  cover01: { html: 'linkedin-banner.html',   w: 1128, h: 191, direct: 2, out: 'sevenda-linkedin-cover-01-2256x382' },
  cover02: { html: 'linkedin-cover-02.html', w: 1128, h: 191, direct: 2, out: 'sevenda-linkedin-cover-02-2256x382' },
  cover03: { html: 'linkedin-cover-03.html', w: 1128, h: 191, direct: 2, out: 'sevenda-linkedin-cover-03-2256x382' },
  cover04: { html: 'linkedin-cover-04.html', w: 1128, h: 191, direct: 2, out: 'sevenda-linkedin-cover-04-2256x382' },
  cover05: { html: 'linkedin-cover-05.html', w: 1128, h: 191, direct: 2, out: 'sevenda-linkedin-cover-05-2256x382' },
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
let chromium, opts = { args: ['--no-sandbox', '--font-render-hinting=none', '--hide-scrollbars'] };
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('playwright-core')); opts.executablePath = process.env.CHROME_PATH; }
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const f = resolve(here, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(here) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] ?? 'application/octet-stream' }); createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch(opts);
for (const n of names) {
  const j = JOBS[n]; if (!j) { console.error('sconosciuto:', n); process.exit(1); }
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.direct || 4 });
  await page.goto(`http://127.0.0.1:${server.address().port}/stills/${j.html}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
  if (j.direct) { await page.screenshot({ path: resolve(here, `stills/${j.out}.png`), type: 'png' }); await page.close(); console.log('ok', n, `${j.w * j.direct}x${j.h * j.direct}`); continue; }
  const big = resolve(here, `stills/${j.out}@4x.png`);
  await page.screenshot({ path: big, type: 'png' }); await page.close();
  const vf = `scale=${j.w}:${j.h}:flags=lanczos`;
  execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-i', big, '-vf', vf, resolve(here, `stills/${j.out}.png`)]);
  execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-i', big, '-vf', `${vf},format=yuvj444p`, '-q:v', '1', resolve(here, `stills/${j.out}.jpg`)]);
  unlinkSync(big); console.log('ok', n, `${j.w}x${j.h}`);
}
await browser.close(); server.close();
