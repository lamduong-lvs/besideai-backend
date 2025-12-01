// image-processor.js
// Module xử lý ảnh: compress và process crop images

import { PendingImagesDB } from '../storage/pending-images-db.js';

// Biến toàn cục để tránh xử lý trùng lặp
let processingCropImageId = null;

export function getProcessingImageId() {
  return processingCropImageId;
}

export function setProcessingImageId(id) {
  processingCropImageId = id;
}

export function resetProcessingImageId() {
  processingCropImageId = null;
}

// Hàm nén ảnh
export async function compressImage(dataUrl, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!dataUrl || typeof dataUrl !== 'string') {
      reject(new Error('Invalid image data'));
      return;
    }
    const normalizedDataUrl = dataUrl.trim();
    const supportedSource = normalizedDataUrl.startsWith('data:image/') || normalizedDataUrl.startsWith('blob:');
    if (!supportedSource) {
      console.warn('[ImageProcessor] compressImage - Unsupported data URL format, skipping compression');
      resolve(normalizedDataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const originalWidth = img.width;
        const originalHeight = img.height;
        const totalPixels = originalWidth * originalHeight;
        console.log('[ImageProcessor] compressImage - Original dimensions:', originalWidth, 'x', originalHeight, `(${(totalPixels / 1000000).toFixed(2)}MP)`);

        const MAX_CANVAS_DIMENSION = 8192;

        let width = originalWidth;
        let height = originalHeight;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
          console.log('[ImageProcessor] compressImage - Scaled to maxWidth:', width, 'x', height);
        }

        if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
          const scaleX = MAX_CANVAS_DIMENSION / width;
          const scaleY = MAX_CANVAS_DIMENSION / height;
          const scale = Math.min(scaleX, scaleY);
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
          console.log('[ImageProcessor] compressImage - Scaled down to fit canvas limit:', width, 'x', height);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        console.log('[ImageProcessor] compressImage - Canvas dimensions:', canvas.width, 'x', canvas.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        try {
          ctx.drawImage(img, 0, 0, width, height);
        } catch (drawError) {
          console.error('[ImageProcessor] compressImage - Error drawing image:', drawError);
          reject(new Error('Failed to draw image to canvas: ' + drawError.message));
          return;
        }

        canvas.toBlob((blob) => {
          if (!blob) {
            console.warn('[ImageProcessor] compressImage - Canvas blob is null, returning original data');
            resolve(normalizedDataUrl);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const resultSize = new TextEncoder().encode(reader.result).length / 1024;
            console.log('[ImageProcessor] compressImage - Compressed result size:', resultSize.toFixed(2), 'KB');
            resolve(reader.result);
          };
          reader.onerror = (error) => {
            console.error('[ImageProcessor] compressImage - FileReader error:', error);
            resolve(normalizedDataUrl);
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', quality);
      } catch (error) {
        console.error('[ImageProcessor] compressImage - Error in image processing:', error);
        resolve(normalizedDataUrl);
      }
    };
    img.onerror = (error) => {
      const errorMsg = error?.target?.error?.message || error?.message || 'Failed to load image';
      console.warn('[ImageProcessor] compressImage - Image load error, using original data:', errorMsg);
      // If image fails to load, return original dataUrl without compression
      // This is not a critical error, just skip compression
      resolve(normalizedDataUrl);
    };
    img.src = normalizedDataUrl;
  });
}

  // Hàm xử lý ảnh đã cắt
  export async function processCropImage(dataUrl, fileName = null, fileType = null, showError, Lang, showImagePreview) {
    console.log('[ImageProcessor] processCropImage called', {
      fileName,
      fileType,
      dataUrlLength: dataUrl?.length,
      dataUrlSizeKB: dataUrl ? (new TextEncoder().encode(dataUrl).length / 1024).toFixed(2) : 0
    });

    // Lấy textarea từ module input mới
    const inputManager = window.inputManager;
    let chatInput = null;

    if (inputManager) {
      const activeInput = inputManager.getCurrent();
      if (activeInput && activeInput.textarea) {
        chatInput = activeInput.textarea.getElement();
      }
    }

    if (!chatInput) {
      console.error('[ImageProcessor] Chat input not found');
      showError(Lang.get('errorCropImageInputNotFound'));
      return;
    }

    if (!window.pendingImages) {
      console.log('[ImageProcessor] Initializing pendingImages array');
      window.pendingImages = [];
    }

    if (window.pendingImages.length >= 10) {
      showError(Lang.get('errorMaxFilesExceeded') || 'Chỉ được đính kèm tối đa 10 file');
      return;
    }

    let finalDataUrl = dataUrl;
    // Determine file type - default to image/png only if no type provided and it looks like an image
    let finalFileType = fileType;
    if (!finalFileType) {
      // Try to detect from data URL
      const dataUrlMatch = dataUrl.match(/^data:([^;]+);/i);
      if (dataUrlMatch) {
        finalFileType = dataUrlMatch[1];
      } else {
        // Default based on file name extension if available
        if (fileName) {
          const ext = fileName.split('.').pop().toLowerCase();
          const mimeTypes = {
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'pdf': 'application/pdf',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp'
          };
          finalFileType = mimeTypes[ext] || 'application/octet-stream';
        } else {
          finalFileType = 'image/png'; // Default fallback
        }
      }
    }

    if (finalFileType.startsWith('image/')) {
      try {
        const originalSize = new TextEncoder().encode(dataUrl).length;
        const originalSizeMB = originalSize / 1024 / 1024;

        console.log('[ImageProcessor] Original image file size:', originalSizeMB.toFixed(2), 'MB');

        const isAlreadyCompressed = finalFileType === 'image/jpeg' || finalFileType === 'image/jpg';

        if (!isAlreadyCompressed && originalSizeMB > 2) {
          console.log('[ImageProcessor] Compressing large PNG image...');

          let maxWidth = 1920;
          let quality = 0.8;

          if (originalSizeMB > 5) {
            maxWidth = 1280;
            quality = 0.7;
          } else if (originalSizeMB > 2) {
            maxWidth = 1600;
            quality = 0.75;
          }

          finalDataUrl = await compressImage(dataUrl, maxWidth, quality);
          finalFileType = 'image/jpeg';

          const compressedSize = new TextEncoder().encode(finalDataUrl).length;
          const compressedSizeMB = compressedSize / 1024 / 1024;
          console.log('[ImageProcessor] Image compressed, file size:', compressedSizeMB.toFixed(2), 'MB');

          if (compressedSizeMB > 10) {
            console.warn('[ImageProcessor] Image still too large, trying more aggressive compression...');
            finalDataUrl = await compressImage(dataUrl, 1024, 0.6);
          }
        }
      } catch (error) {
        // Compression failed, but this is not always a critical error
        console.warn('[ImageProcessor] Failed to compress image, using original:', error.message);
        const originalSize = new TextEncoder().encode(dataUrl).length / 1024 / 1024;
        // Only show error if image is too large
        if (originalSize > 10) {
          showError(Lang.get('errorImageTooLarge') || 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB.');
        }
      }
    }

    // Add the image to the pending images array
    const pendingImage = {
      id: Date.now(), // Unique ID
      dataUrl: finalDataUrl,
      fileName: fileName || 'image',
      fileType: finalFileType,
      timestamp: Date.now(),
      status: 'pending', // 'pending', 'processing', 'done', 'failed'
      error: null,
    };

    window.pendingImages.push(pendingImage);

    // Save to DB
    await PendingImagesDB.saveAll(window.pendingImages);

    // Show preview if function provided
    if (typeof showImagePreview === 'function') {
      showImagePreview(pendingImage);
    }

    return finalDataUrl;
  }
