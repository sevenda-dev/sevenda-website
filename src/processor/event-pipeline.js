/**
 * Sevenda — Event Pipeline
 *
 * Pipeline di elaborazione eventi prima del salvataggio su IndexedDB.
 * Ogni evento passa attraverso:
 *   1. Filter    — scarta eventi irrilevanti o rumorosi
 *   2. Enrich    — aggiunge importance score e metadata
 *   3. Dedup     — elimina duplicati ravvicinati nel tempo
 *
 * Esportato come classe singleton usata dal service-worker.
 */

import { EventSchema } from './event-schema.js';

// ─── CONFIGURAZIONE ───────────────────────────────────────────────────────────

// Finestra temporale per la deduplicazione (ms)
const DEDUP_WINDOW_MS = 500;

// URL pattern da ignorare (tracking, analytics, ecc.)
const IGNORED_URL_PATTERNS = [
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /analytics\./,
  /hotjar\.com/,
  /segment\.com/,
  /mixpanel\.com/,
  /amplitude\.com/,
  /sentry\.io/,
  /bugsnag\.com/,
  /clarity\.ms/,
  /facebook\.com\/tr/,
  /doubleclick\.net/,
  /\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|ico)(\?|$)/i,
];

// Tipi di eventi che vogliamo sempre tenere indipendentemente dal filtro
const ALWAYS_KEEP_TYPES = new Set(['js_error', 'api_error', 'form_submit', 'page_navigate']);

// ─── PIPELINE ─────────────────────────────────────────────────────────────────

export class EventPipeline {
  constructor() {
    // Buffer per deduplicazione: eventKey → timestamp ultimo evento
    this._recentKeys = new Map();

    // Pulizia periodica del buffer dedup (ogni 10s)
    setInterval(() => this._cleanupDedupBuffer(), 10_000);
  }

  /**
   * Processa un array di eventi raw.
   * Ritorna solo gli eventi che passano la pipeline.
   *
   * @param {Object[]} events
   * @returns {Object[]} eventi filtrati, arricchiti, deduplicati
   */
  process(events) {
    const results = [];

    for (const event of events) {
      // 1. Filter
      if (!this._shouldKeep(event)) continue;

      // 2. Enrich (importance scoring)
      const enriched = this._enrich(event);

      // 3. Dedup
      if (this._isDuplicate(enriched)) continue;

      results.push(enriched);
    }

    return results;
  }

  /**
   * Processa un singolo evento.
   * @param {Object} event
   * @returns {Object|null}
   */
  processOne(event) {
    const results = this.process([event]);
    return results[0] ?? null;
  }

  // ─── FILTER ───────────────────────────────────────────────────────────────────
  _shouldKeep(event) {
    if (!event || !event.type || !event.source) return false;

    // Errori e form submit: sempre tenuti
    if (ALWAYS_KEEP_TYPES.has(event.type)) return true;

    // Filtra chiamate di rete irrilevanti
    if (event.source === 'network') {
      return this._keepNetworkEvent(event);
    }

    // Filtra mutazioni DOM di bassa qualità
    if (event.source === 'dom') {
      return this._keepDomEvent(event);
    }

    // Interazioni: filtra click su elementi senza testo/id/data-attribute
    if (event.source === 'interaction') {
      return this._keepInteractionEvent(event);
    }

    // Navigazione: sempre rilevante
    if (event.source === 'navigation') return true;

    // Default: tieni
    return true;
  }

  _keepNetworkEvent(event) {
    const url = event.network?.url || '';

    // Ignora URL di tracking/analytics/assets
    for (const pattern of IGNORED_URL_PATTERNS) {
      if (pattern.test(url)) return false;
    }

    // Tieni solo request e response (non entrambe le fasi per lo stesso URL se response arriva)
    // Le response sovrascrivono i request nella timeline — gestito dalla dedup
    return true;
  }

  _keepDomEvent(event) {
    // Tieni sempre modal open/close
    if (event.type === 'modal_open' || event.type === 'modal_close') return true;
    // Per dom_mutation generici, tieni solo se ha un summary significativo
    const summary = event.domMutation?.summary || '';
    return summary.length > 10;
  }

  _keepInteractionEvent(event) {
    const i = event.interaction || {};
    // Durante lo sviluppo tieni tutto
    const hasText   = (i.elementText?.length || 0) > 0;
    const hasId     = !!i.elementId;
    const hasAction = !!i.dataAttributes?.['data-action'];
    const isForm    = i.interactionType === 'form_submit';
    return true;
  }

  // ─── ENRICH ───────────────────────────────────────────────────────────────────
  _enrich(event) {
    // Ricalcola importance score usando la logica centralizzata
    const importance = EventSchema.scoreImportance(event);
    return { ...event, importance };
  }

  // ─── DEDUP ────────────────────────────────────────────────────────────────────
  _isDuplicate(event) {
    const key = this._dedupKey(event);
    if (!key) return false;

    const lastSeen = this._recentKeys.get(key);
    const now      = event.timestamp || Date.now();

    if (lastSeen && (now - lastSeen) < DEDUP_WINDOW_MS) {
      return true; // duplicato
    }

    this._recentKeys.set(key, now);
    return false;
  }

  _dedupKey(event) {
    switch (event.source) {
      case 'network': {
        const n = event.network || {};
        // Raggruppa per URL + method + phase (evita request+response duplicati)
        return `net:${n.method}:${n.url}:${n.phase}`;
      }
      case 'interaction': {
        const i = event.interaction || {};
        // Raggruppa click sullo stesso elemento nel time window
        return `int:${event.type}:${i.elementTag}:${i.elementId || i.elementText?.slice(0,20)}`;
      }
      case 'dom': {
        return `dom:${event.type}:${event.domMutation?.targetSelector}`;
      }
      case 'navigation': {
        return `nav:${event.navigation?.toUrl}`;
      }
      default:
        return null; // no dedup per errori
    }
  }

  _cleanupDedupBuffer() {
    const now     = Date.now();
    const cutoff  = now - DEDUP_WINDOW_MS * 10; // mantieni un buffer 10x la finestra
    for (const [key, ts] of this._recentKeys) {
      if (ts < cutoff) this._recentKeys.delete(key);
    }
  }
}

// Singleton esportato
export const pipeline = new EventPipeline();
