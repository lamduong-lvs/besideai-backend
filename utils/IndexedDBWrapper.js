// IndexedDBWrapper.js
// Wrapper chung cho IndexedDB operations, loại bỏ code trùng lặp

export class IndexedDBWrapper {
  constructor(dbName, storeName, version, indexes = []) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
    this.indexes = indexes; // Array of { name, keyPath, unique }
  }

  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Tạo indexes
          this.indexes.forEach(index => {
            if (!store.indexNames.contains(index.name)) {
              store.createIndex(index.name, index.keyPath, { unique: index.unique || false });
            }
          });
        }
      };
    });
  }

  async save(item) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Cập nhật timestamp nếu có
      if (item.updatedAt === undefined) {
        item.updatedAt = new Date().toISOString();
      }
      
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
      
      transaction.onerror = () => {
        reject(transaction.error || new Error('Transaction failed'));
      };
    });
  }

  async get(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(indexName = null) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = indexName 
        ? store.index(indexName).getAll()
        : store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
      
      transaction.onerror = () => {
        reject(transaction.error || new Error('Delete transaction failed'));
      };
    });
  }

  async clear() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOld(indexName, olderThan) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index(indexName);
      const request = index.openCursor();
      const cutoff = Date.now() - olderThan;
      let deleted = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const value = cursor.value;
          const timestamp = value[indexName] || value.timestamp || value.updatedAt;
          const timestampMs = typeof timestamp === 'string' 
            ? new Date(timestamp).getTime() 
            : timestamp;
          
          if (timestampMs < cutoff) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

