/**
 * Sevenda — DevTools Entry Point (Step 2)
 *
 * Novità Step 2:
 * - Intercetta le chiamate di rete tramite chrome.devtools.network.onRequestFinished
 *   (più affidabile del monkey-patch per alcune tipologie di richieste)
 * - Le richieste vengono inoltrate al service worker tramite messaggio one-shot
 *
 * Nota: chrome.devtools.network cattura TUTTE le richieste della tab ispezionata,
 * incluse quelle che il monkey-patch nel content script potrebbe perdere (es: worker,
 * prefetch, richieste del browser stesso).
 */

import { EventSchema } from '../processor/event-schema.js';

// ─── PANNELLO ────────────────────────────────────────────────────────────────
chrome.devtools.panels.create(
  'Sevenda',
  '/public/icons/icon16.png',
  '/public/panel.html',
  (panel) => {
    console.log('[FL DevTools] Panel created');

    panel.onShown.addListener(() => {
      console.log('[FL DevTools] Panel shown');
    });

    panel.onHidden.addListener(() => {
      console.log('[FL DevTools] Panel hidden');
    });
  }
);

// ─── NETWORK INTERCEPTION (chrome.devtools.network) ──────────────────────────
/**
 * Intercetta ogni richiesta completata nella tab ispezionata.
 * Viene eseguito nel contesto DevTools, quindi ha accesso a
 * chrome.devtools.network senza bisogno di permessi extra.
 *
 * Lo usiamo in OR con il monkey-patch nel content script:
 * - Il monkey-patch cattura request + response con body preview
 * - chrome.devtools.network cattura tutto il resto (service worker, prefetch, ecc.)
 *
 * La pipeline nel service worker deduplica eventuali duplicati.
 */
chrome.devtools.network.onRequestFinished.addListener((request) => {
  const entry    = request;
  const url      = entry.request?.url      || '';
  const method   = (entry.request?.method  || 'GET').toUpperCase();
  const status   = entry.response?.status  || 0;
  const duration = entry.time              || null; // ms totali della richiesta

  // Preview del body di risposta (asincrono)
  entry.getContent((content, _encoding) => {
    const responsePreview = content
      ? content.slice(0, 500)
      : null;

    const event = EventSchema.createNetworkEvent({
      url,
      method,
      statusCode:      status,
      duration:        Math.round(duration),
      requestBody:     null, // non disponibile via devtools.network
      responsePreview,
      phase:           status >= 400 ? 'error' : 'response',
    }, null); // sessionId non disponibile qui, verrà recuperato dal SW

    // Invia al service worker
    chrome.runtime.sendMessage({
      type:    'NETWORK_EVENT',
      payload: event,
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Service worker non disponibile — silenzioso
      }
    });
  });
});

console.log('[FL DevTools] Network listener attached');
