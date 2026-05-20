/**
 * Sevenda — Storage Manager
 * 
 * Wrapper per IndexedDB. Gestisce:
 * - sessions: metadati delle sessioni di registrazione
 * - events:   eventi raw raccolti durante le sessioni
 * - drafts:   BPMN XML generati (Step 5)
 * - settings: configurazioni utente (Step 5)
 */

const DB_NAME    = 'sevenda';
const DB_VERSION = 1;

export class StorageManager {
  constructor() {
    this.db = null;
  }

  // ─── INIT ────────────────────────────────────────────────────────────────────
  init() {
    return new Promise((resolve, reject) => {
      if (this.db) { resolve(this.db); return; }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this._createStores(db);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[StorageManager] IndexedDB ready');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[StorageManager] IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  _createStores(db) {
    // Store: sessions
    if (!db.objectStoreNames.contains('sessions')) {
      const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
      sessionsStore.createIndex('status',    'status',    { unique: false });
      sessionsStore.createIndex('startTime', 'startTime', { unique: false });
      console.log('[StorageManager] Store "sessions" created');
    }

    // Store: events
    if (!db.objectStoreNames.contains('events')) {
      const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
      eventsStore.createIndex('sessionId', 'sessionId', { unique: false });
      eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
      eventsStore.createIndex('type',      'type',      { unique: false });
      console.log('[StorageManager] Store "events" created');
    }

    // Store: bpmn-drafts (utilizzato da Step 5)
    if (!db.objectStoreNames.contains('bpmn-drafts')) {
      const draftsStore = db.createObjectStore('bpmn-drafts', { keyPath: 'id' });
      draftsStore.createIndex('sessionId', 'sessionId', { unique: false });
      console.log('[StorageManager] Store "bpmn-drafts" created');
    }

    // Store: settings
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' });
      console.log('[StorageManager] Store "settings" created');
    }
  }

  // ─── SESSIONS ────────────────────────────────────────────────────────────────
  createSession(session) {
    return this._put('sessions', session);
  }

  updateSession(id, updates) {
    return this._update('sessions', id, updates);
  }

  getSession(id) {
    return this._get('sessions', id);
  }

  getAllSessions() {
    return this._getAll('sessions');
  }

  async incrementEventCount(sessionId, count) {
    const session = await this.getSession(sessionId);
    if (session) {
      session.eventCount = (session.eventCount || 0) + count;
      await this._put('sessions', session);
    }
  }

  // ─── EVENTS ──────────────────────────────────────────────────────────────────
  saveEvents(events) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }

      const tx    = this.db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');

      events.forEach(event => store.put(event));

      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  getEventsBySession(sessionId) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }

      const tx      = this.db.transaction('events', 'readonly');
      const store   = tx.objectStore('events');
      const index   = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror   = () => reject(request.error);
    });
  }

  deleteEventsBySession(sessionId) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }

      const tx    = this.db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const index = store.index('sessionId');
      const req   = index.openCursor(IDBKeyRange.only(sessionId));

      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };

      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  // ─── SETTINGS ────────────────────────────────────────────────────────────────
  async getSetting(key, defaultValue = null) {
    const record = await this._get('settings', key);
    return record ? record.value : defaultValue;
  }

  setSetting(key, value) {
    return this._put('settings', { key, value });
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────
  _put(storeName, record) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }

      const tx      = this.db.transaction(storeName, 'readwrite');
      const store   = tx.objectStore(storeName);
      const request = store.put(record);

      request.onsuccess = () => resolve(request.result);
      request.onerror   = () => reject(request.error);
    });
  }

  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }

      const tx      = this.db.transaction(storeName, 'readonly');
      const store   = tx.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror   = () => reject(request.error);
    });
  }

  _getAll(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not initialized')); return; }

      const tx      = this.db.transaction(storeName, 'readonly');
      const store   = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror   = () => reject(request.error);
    });
  }

  async _update(storeName, id, updates) {
    const existing = await this._get(storeName, id);
    if (!existing) {
      console.warn(`[StorageManager] Record not found for update: ${storeName}/${id}`);
      return;
    }
    return this._put(storeName, { ...existing, ...updates });
  }
}
