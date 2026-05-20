/**
 * Sevenda — DOM Observer
 *
 * Usa MutationObserver per rilevare cambiamenti strutturali rilevanti:
 * - Apertura/chiusura modal/dialog
 * - Aggiunta/rimozione di elementi significativi
 *
 * Filtra il rumore (mutazioni banali) prima di emettere eventi.
 */

import { EventSchema } from '../processor/event-schema.js';

// Selettori che identificano un "modal"
const MODAL_SELECTORS = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '.modal',
  '.dialog',
  '[class*="modal"]',
  '[class*="dialog"]',
  '[class*="overlay"]',
  '[class*="drawer"]',
];

// Attributi di visibilità che triggherano un re-check
const VISIBILITY_ATTRS = ['style', 'class', 'hidden', 'aria-hidden', 'open'];

// Selettori da ignorare (troppo rumore)
const NOISE_SELECTORS = [
  'script', 'style', 'link', 'meta',
  '[class*="tooltip"]',
  '[class*="spinner"]',
  '[class*="loader"]',
];

export class DomObserver {
  constructor({ onEvent, sessionId }) {
    this._onEvent   = onEvent;
    this._sessionId = sessionId;
    this._observer  = null;
    this._active    = false;

    // Tiene traccia dei modal attualmente aperti (per rilevare close)
    this._openModals = new WeakSet();
  }

  // ─── PUBLIC API ──────────────────────────────────────────────────────────────
  startObserving() {
    if (this._active) return;
    this._active = true;

    this._observer = new MutationObserver((mutations) => {
      this._processMutations(mutations);
    });

    this._observer.observe(document.body, {
      childList:     true,   // aggiunta/rimozione nodi
      subtree:       true,   // tutto il DOM
      attributes:    true,   // cambiamenti attributi
      attributeFilter: VISIBILITY_ATTRS,
    });

    console.log('[FL DOM] Observer started');
  }

  stopObserving() {
    if (!this._active) return;
    this._active = false;
    this._observer?.disconnect();
    this._observer = null;
    this._openModals = new WeakSet();
    console.log('[FL DOM] Observer stopped');
  }

  updateSessionId(sessionId) {
    this._sessionId = sessionId;
  }

  // ─── CORE ────────────────────────────────────────────────────────────────────
  _processMutations(mutations) {
    for (const mutation of mutations) {

      // 1. Nodi aggiunti/rimossi
      if (mutation.type === 'childList') {
        this._handleChildList(mutation);
      }

      // 2. Cambiamenti di attributi (visibilità)
      if (mutation.type === 'attributes') {
        this._handleAttributeChange(mutation);
      }
    }
  }

  _handleChildList(mutation) {
    // Nodi aggiunti
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (this._isNoise(node)) continue;

      const modal = this._findModal(node);
      if (modal) {
        this._openModals.add(modal);
        this._emit(EventSchema.createDomEvent({
          mutationType:   'childList',
          targetSelector: this._getSelector(modal),
          summary:        `Modal aperto: ${this._describeElement(modal)}`,
          domEventType:   'modal_open',
        }, this._sessionId));
        return; // un evento per mutation è sufficiente
      }

      // Mutazione generica rilevante (es: lista aggiornata, contenuto inserito)
      if (this._isSignificant(node)) {
        this._emit(EventSchema.createDomEvent({
          mutationType:   'childList',
          targetSelector: this._getSelector(mutation.target),
          summary:        `Elemento aggiunto: ${this._describeElement(node)}`,
          domEventType:   'dom_mutation',
        }, this._sessionId));
      }
    }

    // Nodi rimossi
    for (const node of mutation.removedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (this._isNoise(node)) continue;

      const modal = this._findModal(node);
      if (modal && this._openModals.has(modal)) {
        this._openModals.delete(modal);
        this._emit(EventSchema.createDomEvent({
          mutationType:   'childList',
          targetSelector: this._getSelector(modal),
          summary:        `Modal chiuso: ${this._describeElement(modal)}`,
          domEventType:   'modal_close',
        }, this._sessionId));
      }
    }
  }

  _handleAttributeChange(mutation) {
    const node = mutation.target;
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (this._isNoise(node)) return;

    const modal = this._isModal(node) ? node : null;
    if (!modal) return;

    const isVisible = this._isVisible(modal);
    const wasOpen   = this._openModals.has(modal);

    if (isVisible && !wasOpen) {
      this._openModals.add(modal);
      this._emit(EventSchema.createDomEvent({
        mutationType:   'attributes',
        targetSelector: this._getSelector(modal),
        summary:        `Modal visibile: ${this._describeElement(modal)} [attr: ${mutation.attributeName}]`,
        domEventType:   'modal_open',
      }, this._sessionId));
    } else if (!isVisible && wasOpen) {
      this._openModals.delete(modal);
      this._emit(EventSchema.createDomEvent({
        mutationType:   'attributes',
        targetSelector: this._getSelector(modal),
        summary:        `Modal nascosto: ${this._describeElement(modal)} [attr: ${mutation.attributeName}]`,
        domEventType:   'modal_close',
      }, this._sessionId));
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────
  _emit(event) {
    if (this._active && event) {
      this._onEvent(event);
    }
  }

  _findModal(node) {
    if (this._isModal(node)) return node;
    // Cerca dentro il nodo aggiunto
    for (const sel of MODAL_SELECTORS) {
      const found = node.querySelector?.(sel);
      if (found) return found;
    }
    return null;
  }

  _isModal(node) {
    return MODAL_SELECTORS.some(sel => node.matches?.(sel));
  }

  _isVisible(node) {
    if (node.hasAttribute?.('hidden')) return false;
    if (node.getAttribute?.('aria-hidden') === 'true') return false;
    const style = node.style;
    if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    // Controlla computed style solo se è nel DOM
    if (document.contains(node)) {
      const cs = window.getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    }
    return true;
  }

  _isNoise(node) {
    return NOISE_SELECTORS.some(sel => {
      try { return node.matches?.(sel); } catch { return false; }
    });
  }

  _isSignificant(node) {
    // Considera significativi nodi con testo o elementi interattivi
    const tag = node.tagName?.toLowerCase();
    const SIGNIFICANT_TAGS = ['section', 'article', 'main', 'aside', 'header', 'footer', 'nav', 'form', 'table', 'ul', 'ol'];
    if (SIGNIFICANT_TAGS.includes(tag)) return true;
    if (node.querySelectorAll?.('button, a, input, select').length > 0) return true;
    return false;
  }

  _getSelector(node) {
    if (!node) return '';
    if (node.id) return `#${node.id}`;
    const tag = node.tagName?.toLowerCase() || 'unknown';
    const cls = node.className && typeof node.className === 'string'
      ? '.' + node.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    return `${tag}${cls}`;
  }

  _describeElement(node) {
    if (!node) return 'unknown';
    const tag  = node.tagName?.toLowerCase() || '?';
    const id   = node.id ? `#${node.id}` : '';
    const role = node.getAttribute?.('role') ? `[role=${node.getAttribute('role')}]` : '';
    const aria = node.getAttribute?.('aria-label') ? `"${node.getAttribute('aria-label')}"` : '';
    return `<${tag}${id}${role}${aria}>`;
  }
}
