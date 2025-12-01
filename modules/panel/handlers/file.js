// file.js
// File handling utilities

import { PendingImagesDB } from '../storage/pending-images-db.js';
import { processCropImage } from '../media/image-processor.js';
import { showImagePreview } from '../ui/preview.js';
import { showError } from '../utils/toast.js';

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function restorePendingImages(Lang) {
  try {
    const metadata = await chrome.storage.local.get(['pendingImagesCount', 'pendingImagesTimestamp']);
    if (metadata.pendingImagesCount && metadata.pendingImagesCount > 0) {
      const timestamp = metadata.pendingImagesTimestamp || Date.now();
      const age = Date.now() - timestamp;
      if (age < 300000) {
        console.log('[Panel] Restoring pendingImages from IndexedDB:', metadata.pendingImagesCount, 'files');
        try {
          const images = await PendingImagesDB.getAll();
          if (images && images.length > 0) {
            window.pendingImages = images;
            showImagePreview();
            console.log('[Panel] Successfully restored', images.length, 'images from IndexedDB');
          } else {
            console.log('[Panel] No images found in IndexedDB, clearing metadata');
            window.pendingImages = [];
            await chrome.storage.local.remove(['pendingImagesCount', 'pendingImagesTimestamp']).catch(() => { });
          }
        } catch (dbError) {
          console.error('[Panel] Error reading from IndexedDB:', dbError);
          window.pendingImages = [];
          await chrome.storage.local.remove(['pendingImagesCount', 'pendingImagesTimestamp']).catch(() => { });
        }
      } else {
        console.log('[Panel] PendingImages too old, clearing...');
        window.pendingImages = [];
        await PendingImagesDB.clear().catch(() => { });
        await chrome.storage.local.remove(['pendingImagesCount', 'pendingImagesTimestamp']).catch(() => { });
      }
    } else {
      const oldData = await chrome.storage.local.get(['pendingImagesData', 'pendingImagesTimestamp']);
      if (oldData.pendingImagesData && Array.isArray(oldData.pendingImagesData) && oldData.pendingImagesData.length > 0) {
        const timestamp = oldData.pendingImagesTimestamp || Date.now();
        const age = Date.now() - timestamp;
        if (age < 300000) {
          console.log('[Panel] Found old format pendingImages, migrating to IndexedDB...');
          window.pendingImages = oldData.pendingImagesData;
          try {
            await PendingImagesDB.saveAll(window.pendingImages);
            await chrome.storage.local.set({
              pendingImagesCount: window.pendingImages.length,
              pendingImagesTimestamp: Date.now()
            });
            await chrome.storage.local.remove(['pendingImagesData']).catch(() => { });
            showImagePreview();
          } catch (migrateError) {
            console.error('[Panel] Error migrating to IndexedDB:', migrateError);
          }
        } else {
          window.pendingImages = [];
          await chrome.storage.local.remove(['pendingImagesData', 'pendingImagesTimestamp']).catch(() => { });
        }
      } else {
        window.pendingImages = [];
      }
    }
    try {
      await PendingImagesDB.deleteOld(300000);
    } catch (cleanupError) {
    }
  } catch (error) {
    console.error('[Panel] Error restoring pending images:', error);
    window.pendingImages = [];
  }
}

export async function savePendingImagesToStorage() {
  try {
    const metadata = (window.pendingImages || []).map(file => ({
      id: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
    }));
    if (metadata.length > 0) {
      await chrome.storage.local.set({ pendingImagesMetadata: metadata });
    } else {
      await chrome.storage.local.remove(['pendingImagesMetadata']);
    }
  } catch (error) {
    console.error('[Panel] Error saving pending images metadata to storage:', error);
  }
}


