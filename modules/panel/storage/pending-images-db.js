// pending-images-db.js
// IndexedDB helper để lưu pending images với dung lượng lớn hơn

import { IndexedDBWrapper } from './IndexedDBWrapper.js';

const dbWrapper = new IndexedDBWrapper(
  'PendingImagesDB',
  'pendingImages',
  1,
  [
    { name: 'timestamp', keyPath: 'timestamp', unique: false }
  ]
);

export const PendingImagesDB = {
  dbName: 'PendingImagesDB',
  storeName: 'pendingImages',
  version: 1,

  async open() {
    return dbWrapper.open();
  },

  async saveAll(images) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Log thông tin trước khi lưu
      const imageSizes = images.map(img => {
        const size = img.dataUrl ? new TextEncoder().encode(img.dataUrl).length : 0;
        return { id: img.id, sizeKB: (size / 1024).toFixed(2) };
      });
      console.log('[PendingImagesDB] Saving images:', imageSizes);
      
      // Xóa tất cả dữ liệu cũ
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        console.log('[PendingImagesDB] Cleared old data');
        
        // Lưu từng ảnh với error handling chi tiết
        const promises = images.map((image, index) => {
          return new Promise((resolveItem, rejectItem) => {
            try {
              const dataUrlSize = image.dataUrl ? new TextEncoder().encode(image.dataUrl).length : 0;
              const dataUrlSizeKB = dataUrlSize / 1024;
              
              const data = {
                id: image.id || `img_${Date.now()}_${index}`,
                dataUrl: image.dataUrl,
                fileName: image.fileName,
                fileType: image.fileType,
                timestamp: Date.now()
              };
              
              console.log(`[PendingImagesDB] Saving image ${index + 1}/${images.length}:`, {
                id: data.id,
                sizeKB: dataUrlSizeKB.toFixed(2),
                fileName: data.fileName
              });
              
              const request = store.add(data);
              request.onsuccess = () => {
                console.log(`[PendingImagesDB] Successfully saved image ${index + 1}/${images.length}`);
                resolveItem();
              };
              request.onerror = () => {
                const error = request.error;
                console.error(`[PendingImagesDB] Failed to save image ${index + 1}/${images.length}:`, {
                  id: data.id,
                  sizeKB: dataUrlSizeKB.toFixed(2),
                  errorName: error?.name,
                  errorMessage: error?.message
                });
                rejectItem(error || new Error('Unknown IndexedDB error'));
              };
            } catch (error) {
              console.error(`[PendingImagesDB] Error preparing image ${index + 1}/${images.length}:`, error);
              rejectItem(error);
            }
          });
        });
        
        Promise.all(promises)
          .then(() => {
            transaction.oncomplete = () => {
              console.log('[PendingImagesDB] Transaction completed successfully');
              resolve(images.length);
            };
            transaction.onerror = () => {
              const error = transaction.error;
              console.error('[PendingImagesDB] Transaction error:', {
                errorName: error?.name,
                errorMessage: error?.message
              });
              reject(error || new Error('Transaction failed'));
            };
          })
          .catch((error) => {
            console.error('[PendingImagesDB] Promise.all failed:', error);
            reject(error);
          });
      };
      
      clearRequest.onerror = () => {
        const error = clearRequest.error;
        console.error('[PendingImagesDB] Clear error:', error);
        reject(error || new Error('Failed to clear old data'));
      };
    });
  },

  async getAll() {
    try {
      const images = await dbWrapper.getAll('timestamp');
      return images.map(item => ({
        id: item.id,
        dataUrl: item.dataUrl,
        fileName: item.fileName,
        fileType: item.fileType
      }));
    } catch (error) {
      throw error;
    }
  },

  async clear() {
    try {
      await dbWrapper.clear();
    } catch (error) {
      throw error;
    }
  },

  async deleteOld(olderThan = 300000) { // 5 phút mặc định
    try {
      return await dbWrapper.deleteOld('timestamp', olderThan);
    } catch (error) {
      throw error;
    }
  }
};

