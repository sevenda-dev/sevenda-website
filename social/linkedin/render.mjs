// Esporta ogni .card di cards.html in out/<id>.png (1080×1350)
// e unisce le slide del carosello in out/post-02-carousel.pdf (post "documento" LinkedIn).
// Uso: CHROME_PATH=/percorso/chrome node render.mjs   (dipendenze: quelle di ../../promo)
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../promo/package.json'));
const { chromium } = require('playwright-core');

const out = path.join(here, 'out');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'cards.html')).href);
await page.evaluate(() => document.fonts.ready);

const ids = await page.$$eval('.card', els => els.map(e => e.id));
for (const id of ids) {
  await page.locator('#' + id).screenshot({ path: path.join(out, id + '.png') });
  console.log('✓', id);
}

// PDF del carosello: una pagina 1080×1350 per slide, solo le .carousel
await page.addStyleTag({ content: `
  @page { size: 1080px 1350px; margin: 0; }
  body { padding: 0 !important; gap: 0 !important; background: #0d0d0d !important; }
  .card:not(.carousel) { display: none !important; }
  .carousel { break-after: page; }` });
await page.pdf({ path: path.join(out, 'post-02-carousel.pdf'), width: '1080px', height: '1350px', printBackground: true });
console.log('✓ post-02-carousel.pdf');
await browser.close();
