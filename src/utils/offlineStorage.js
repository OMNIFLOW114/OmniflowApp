// src/utils/offlineStorage.js
class OfflineStorage {
  constructor() {
    this.dbName = 'omniflow_offline_db';
    this.dbVersion = 1;
    this.db = null;
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store for offline data
        if (!db.objectStoreNames.contains('offlineData')) {
          const store = db.createObjectStore('offlineData', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('expiry', 'expiry');
        }
        
        // Store for pending actions
        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionStore = db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
          actionStore.createIndex('type', 'type');
          actionStore.createIndex('timestamp', 'timestamp');
        }
        
        // Cache for API responses
        if (!db.objectStoreNames.contains('apiCache')) {
          const cacheStore = db.createObjectStore('apiCache', { keyPath: 'url' });
          cacheStore.createIndex('expiry', 'expiry');
        }
      };
    });
  }

  async saveData(key, data, expiryMinutes = 60) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      
      const item = {
        key,
        data,
        timestamp: Date.now(),
        expiry: Date.now() + (expiryMinutes * 60 * 1000)
      };
      
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getData(key) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const item = request.result;
        if (item && item.expiry > Date.now()) {
          resolve(item.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async cacheApiResponse(url, data, expiryMinutes = 30) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['apiCache'], 'readwrite');
      const store = transaction.objectStore('apiCache');
      
      const cacheItem = {
        url,
        data,
        timestamp: Date.now(),
        expiry: Date.now() + (expiryMinutes * 60 * 1000)
      };
      
      const request = store.put(cacheItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedApiResponse(url) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['apiCache'], 'readonly');
      const store = transaction.objectStore('apiCache');
      const request = store.get(url);
      
      request.onsuccess = () => {
        const item = request.result;
        if (item && item.expiry > Date.now()) {
          resolve(item.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addPendingAction(type, data) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      
      const action = {
        type,
        data,
        timestamp: Date.now(),
        status: 'pending'
      };
      
      const request = store.add(action);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readonly');
      const store = transaction.objectStore('pendingActions');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingAction(id) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache() {
    if (!this.db) await this.init();
    
    const now = Date.now();
    
    // Clear expired offline data
    const offlineTransaction = this.db.transaction(['offlineData'], 'readwrite');
    const offlineStore = offlineTransaction.objectStore('offlineData');
    const offlineIndex = offlineStore.index('expiry');
    const offlineRange = IDBKeyRange.upperBound(now);
    const offlineRequest = offlineIndex.openCursor(offlineRange);
    
    offlineRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    // Clear expired API cache
    const cacheTransaction = this.db.transaction(['apiCache'], 'readwrite');
    const cacheStore = cacheTransaction.objectStore('apiCache');
    const cacheIndex = cacheStore.index('expiry');
    const cacheRange = IDBKeyRange.upperBound(now);
    const cacheRequest = cacheIndex.openCursor(cacheRange);
    
    cacheRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }
}

export const offlineStorage = new OfflineStorage();