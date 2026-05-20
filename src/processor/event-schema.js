/**
 * Sevenda — Event Schema
 * 
 * Definisce la struttura normalizzata di tutti gli eventi del sistema.
 * Ogni evento, indipendentemente dalla sorgente, converge in questo formato.
 * 
 * EventType enum:
 *   Network:      api_call, api_response, api_error
 *   Interaction:  click, form_submit, input_change
 *   Navigation:   page_navigate, route_change
 *   DOM:          modal_open, modal_close, dom_mutation
 *   Error:        js_error, network_error
 */

// ─── GENERATORE ID ────────────────────────────────────────────────────────────
function generateEventId() {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── EVENT SCHEMA ─────────────────────────────────────────────────────────────
export const EventSchema = {

  /**
   * Evento base — tutti i campi comuni
   */
  createBase(source, type, sessionId) {
    return {
      id:        generateEventId(),
      sessionId: sessionId || null,
      timestamp: Date.now(),
      source,       // 'network' | 'dom' | 'interaction' | 'error' | 'navigation'
      type,         // EventType string
      importance:   'MEDIUM', // verrà ricalcolato dal processor (Step 2)
    };
  },

  /**
   * Evento di interazione utente (click, submit, input)
   * 
   * @param {Object} data
   * @param {string} data.interactionType - 'click' | 'form_submit' | 'input_change'
   * @param {string} data.elementTag      - tag HTML dell'elemento (es: 'button')
   * @param {string} data.elementId       - id HTML se presente
   * @param {string} data.elementText     - testo visibile dell'elemento (max 100 chars)
   * @param {string} data.elementType     - attributo type (es: 'submit', 'text')
   * @param {Object} data.dataAttributes  - { 'data-action': 'add-to-cart', ... }
   * @param {string} data.xpath           - XPath relativo all'elemento
   * @param {string} data.href            - href se è un link
   */
  createInteractionEvent(data, sessionId) {
    const typeMap = {
      click:       'click',
      form_submit: 'form_submit',
      input_change:'input_change',
    };
    return {
      ...this.createBase('interaction', typeMap[data.interactionType] || 'click', sessionId),
      interaction: {
        interactionType: data.interactionType,
        elementTag:      data.elementTag      || 'unknown',
        elementId:       data.elementId       || null,
        elementText:     data.elementText     || null,
        elementType:     data.elementType     || null,
        dataAttributes:  data.dataAttributes  || {},
        xpath:           data.xpath           || '',
        href:            data.href            || null,
      },
    };
  },

  /**
   * Evento di navigazione (cambio URL, pushState, popState)
   * 
   * @param {Object} data
   * @param {string} data.fromUrl - URL di partenza
   * @param {string} data.toUrl   - URL di destinazione
   * @param {string} data.trigger - 'pushState' | 'popState' | 'replaceState' | 'session-start'
   */
  createNavigationEvent(data, sessionId) {
    const type = data.trigger === 'session-start' ? 'page_navigate' : 'route_change';
    return {
      ...this.createBase('navigation', type, sessionId),
      navigation: {
        fromUrl: data.fromUrl || '',
        toUrl:   data.toUrl   || '',
        trigger: data.trigger || 'unknown',
      },
    };
  },

  /**
   * Evento di chiamata di rete (fetch/XHR) — Step 2
   * Già definito qui per coerenza dello schema.
   * 
   * @param {Object} data
   * @param {string} data.url             - URL della richiesta
   * @param {string} data.method          - GET | POST | PUT | DELETE | PATCH
   * @param {number} data.statusCode      - HTTP status code (0 se non ancora risposta)
   * @param {number} data.duration        - durata in ms (null se non completata)
   * @param {string} data.requestBody     - body della request (troncato a 500 chars)
   * @param {string} data.responsePreview - preview della response (troncata a 500 chars)
   * @param {string} data.phase           - 'request' | 'response' | 'error'
   */
  createNetworkEvent(data, sessionId) {
    const typeMap = {
      request:  'api_call',
      response: 'api_response',
      error:    'api_error',
    };
    return {
      ...this.createBase('network', typeMap[data.phase] || 'api_call', sessionId),
      network: {
        url:             data.url             || '',
        method:          (data.method         || 'GET').toUpperCase(),
        statusCode:      data.statusCode      || 0,
        duration:        data.duration        || null,
        requestBody:     data.requestBody     || null,
        responsePreview: data.responsePreview || null,
        phase:           data.phase           || 'request',
      },
    };
  },

  /**
   * Evento di errore JavaScript o promise rejection
   * 
   * @param {Object} data
   * @param {string} data.message   - messaggio di errore
   * @param {string} data.filename  - file sorgente
   * @param {number} data.lineno    - numero di riga
   * @param {number} data.colno     - numero di colonna
   * @param {string} data.stack     - stack trace
   * @param {string} data.errorType - 'js-error' | 'promise-rejection' | 'network-error'
   */
  createErrorEvent(data, sessionId) {
    return {
      ...this.createBase('error', 'js_error', sessionId),
      importance: 'HIGH', // gli errori sono sempre HIGH importance
      error: {
        message:   data.message   || 'Unknown error',
        filename:  data.filename  || null,
        lineno:    data.lineno    || null,
        colno:     data.colno     || null,
        stack:     data.stack     || null,
        errorType: data.errorType || 'js-error',
      },
    };
  },

  /**
   * Evento di mutazione DOM — Step 2
   * 
   * @param {Object} data
   * @param {string} data.mutationType   - 'childList' | 'attributes' | 'characterData'
   * @param {string} data.targetSelector - CSS selector dell'elemento modificato
   * @param {string} data.summary        - descrizione leggibile della mutazione
   * @param {string} data.domEventType   - 'modal_open' | 'modal_close' | 'dom_mutation'
   */
  createDomEvent(data, sessionId) {
    return {
      ...this.createBase('dom', data.domEventType || 'dom_mutation', sessionId),
      domMutation: {
        mutationType:   data.mutationType   || 'childList',
        targetSelector: data.targetSelector || '',
        summary:        data.summary        || '',
      },
    };
  },

  // ─── IMPORTANCE SCORING ───────────────────────────────────────────────────
  // Verrà usato dal processor al Layer 2 (Step 2).
  // Incluso qui per centralizzare la logica di scoring.
  scoreImportance(event) {
    let score = 0;

    switch (event.source) {
      case 'network':
        score += 10;
        if (['POST','PUT','DELETE','PATCH'].includes(event.network?.method)) score += 5;
        if (event.network?.statusCode >= 400) score += 8;
        if (event.network?.statusCode >= 500) score += 5; // bonus per server error
        break;

      case 'interaction':
        if (event.interaction?.elementTag === 'button') score += 7;
        if (event.interaction?.elementTag === 'a')      score += 4;
        if (event.interaction?.dataAttributes?.['data-action']) score += 5;
        if ((event.interaction?.elementText?.length || 0) > 0) score += 3;
        if (event.type === 'form_submit') score += 8;
        break;

      case 'navigation':
        score += 9;
        break;

      case 'error':
        score += 10;
        break;

      case 'dom':
        score += 2; // DOM mutations di default bassa importanza
        break;
    }

    if (score >= 10) return 'HIGH';
    if (score >= 5)  return 'MEDIUM';
    return 'LOW';
  },
};

// ─── COSTANTI ESPORTATE ───────────────────────────────────────────────────────
export const EVENT_SOURCES = ['network', 'dom', 'interaction', 'error', 'navigation'];

export const EVENT_TYPES = [
  // Network
  'api_call', 'api_response', 'api_error',
  // Interaction
  'click', 'form_submit', 'input_change',
  // Navigation
  'page_navigate', 'route_change',
  // DOM
  'modal_open', 'modal_close', 'dom_mutation',
  // Error
  'js_error', 'network_error',
];

export const IMPORTANCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];
