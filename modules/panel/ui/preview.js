// preview.js
// Image/file preview management

import { PendingImagesDB } from '../storage/pending-images-db.js';
import { getFileTypeIcon } from '../chat/chat-ui.js';

let showImagePreviewTimer = null;

export function showImagePreview() {
  if (showImagePreviewTimer) {
    clearTimeout(showImagePreviewTimer);
    showImagePreviewTimer = null;
  }
  console.log('[Panel] ========== showImagePreview START ==========');
  console.log('[Panel] window.pendingImages:', window.pendingImages);
  console.log('[Panel] window.pendingImages.length:', window.pendingImages?.length);
  if (!window.pendingImages || window.pendingImages.length === 0) {
    console.log('[Panel] No images to display, removing preview container if exists');
    const oldContainer = document.getElementById('imagePreviewContainer');
    if (oldContainer) {
      oldContainer.remove();
      console.log('[Panel] Old preview container removed');
    }
    console.log('[Panel] ========== showImagePreview END (no images) ==========');
    return;
  }
  console.log('[Panel] showImagePreview called with', window.pendingImages.length, 'images');
  const oldContainer = document.getElementById('imagePreviewContainer');
  if (oldContainer) {
    console.log('[Panel] Removing old preview container');
    oldContainer.remove();
  }
  const previewContainer = document.createElement('div');
  previewContainer.id = 'imagePreviewContainer';
  previewContainer.className = 'image-preview-container';
  console.log('[Panel] Created new preview container');
  window.pendingImages.forEach((fileData, index) => {
    console.log('[Panel] Processing file', index + 1, 'of', window.pendingImages.length, ':', {
      id: fileData.id,
      fileName: fileData.fileName,
      fileType: fileData.fileType,
      hasDataUrl: !!fileData.dataUrl,
      dataUrlLength: fileData.dataUrl?.length || 0
    });
    const fileItem = document.createElement('div');
    fileItem.className = 'preview-file-item';
    fileItem.setAttribute('data-file-id', fileData.id);
    fileItem.setAttribute('data-file-index', index);
    let previewElement;
    if (fileData.fileType && fileData.fileType.startsWith('image/')) {
      previewElement = document.createElement('img');
      previewElement.src = fileData.dataUrl;
      previewElement.alt = fileData.fileName || 'Preview';
      previewElement.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 4px;
        object-fit: cover;
        border: 1px solid var(--border-color);
        display: block;
      `;
      previewElement.addEventListener('load', () => {
        console.log('[Panel] Image', index + 1, 'loaded successfully:', fileData.fileName);
      });
      previewElement.addEventListener('error', (e) => {
        // Silently handle image load errors in preview - this is not a critical error
        // Just fallback to icon without logging error
        console.warn('[Panel] Image preview failed for', fileData.fileName, '- using icon fallback');
        previewElement.style.display = 'none';
        const fallbackIcon = document.createElement('div');
        fallbackIcon.style.cssText = `
          width: 60px;
          height: 60px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
        `;
        const iconHtml = getFileTypeIcon(fileData.fileType, fileData.fileName);
        if (iconHtml) {
          fallbackIcon.innerHTML = iconHtml;
          // Adjust icon size to fit preview container
          const iconImg = fallbackIcon.querySelector('img');
          if (iconImg) {
            iconImg.style.width = '100%';
            iconImg.style.height = '100%';
            iconImg.style.objectFit = 'contain';
          }
        } else {
          fallbackIcon.innerHTML = '<div style="font-size: var(--font-2xl);">📄</div>';
        }
        fileItem.insertBefore(fallbackIcon, previewElement);
      });
    } else {
      // For non-image files, use icon SVG
      previewElement = document.createElement('div');
      previewElement.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 4px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
      `;
      const iconHtml = getFileTypeIcon(fileData.fileType, fileData.fileName);
      if (iconHtml) {
        previewElement.innerHTML = iconHtml;
        // Adjust icon size to fit preview container
        const iconImg = previewElement.querySelector('img');
        if (iconImg) {
          iconImg.style.width = '100%';
          iconImg.style.height = '100%';
          iconImg.style.objectFit = 'contain';
        }
      } else {
        // Fallback if no icon
        previewElement.innerHTML = '<div style="font-size: var(--font-2xl);">📄</div>';
      }
    }
    const fileNameEl = document.createElement('div');
    fileNameEl.className = 'preview-file-name';
    fileNameEl.style.cssText = `
      font-size: var(--font-xxs);
      color: var(--text-secondary);
      max-width: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
    `;
    fileNameEl.textContent = fileData.fileName || 'File';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'preview-remove-btn';
    removeBtn.setAttribute('data-file-id', fileData.id);
    removeBtn.setAttribute('aria-label', 'Xóa ảnh này');
    removeBtn.innerHTML = `
      <img src="../../icons/svg/icon/Essentional, UI/Trash Bin Trash.svg" alt="Xóa" class="icon" style="width: 14px; height: 14px; filter: brightness(0) invert(1);">
    `;
    (function(fileId, fileName) {
      removeBtn.addEventListener('click', function(e) {
        console.log('[Panel] ========== REMOVE BUTTON CLICKED ==========');
        console.log('[Panel] File ID:', fileId);
        console.log('[Panel] File name:', fileName);
        console.log('[Panel] Event target:', e.target);
        console.log('[Panel] Event currentTarget:', e.currentTarget);
        e.stopPropagation();
        e.preventDefault();
        const fileIndex = window.pendingImages.findIndex(f => f.id === fileId);
        console.log('[Panel] File index in array:', fileIndex);
        if (fileIndex !== -1) {
          const removedFile = window.pendingImages[fileIndex];
          window.pendingImages.splice(fileIndex, 1);
          console.log('[Panel] File removed from array. Remaining count:', window.pendingImages.length);
          if (window.pendingImages.length > 0) {
            PendingImagesDB.saveAll(window.pendingImages).then(() => {
              console.log('[Panel] Updated IndexedDB after file removal');
            }).catch(error => {
              console.error('[Panel] Error updating IndexedDB after file removal:', error);
            });
          } else {
            PendingImagesDB.clear().then(() => {
              console.log('[Panel] Cleared IndexedDB after removing all files');
            }).catch(error => {
              console.error('[Panel] Error clearing IndexedDB:', error);
            });
          }
          console.log('[Panel] Refreshing preview after removal...');
          showImagePreview();
        } else {
          console.error('[Panel] File not found in pendingImages:', fileId);
        }
      });
    })(fileData.id, fileData.fileName);
    fileItem.appendChild(previewElement);
    fileItem.appendChild(fileNameEl);
    fileItem.appendChild(removeBtn);
    previewContainer.appendChild(fileItem);
    console.log('[Panel] File item', index + 1, 'added to container. Container children count:', previewContainer.children.length);
  });
  const counter = document.createElement('div');
  counter.className = 'preview-counter';
  counter.style.cssText = `
    font-size: var(--font-xs);
    color: var(--text-secondary);
    margin-left: auto;
    padding: 4px 8px;
    background: var(--bg-secondary);
    border-radius: 4px;
  `;
  counter.textContent = `${window.pendingImages.length}/10`;
  previewContainer.appendChild(counter);
  console.log('[Panel] Total items in container (including counter):', previewContainer.children.length);
  let footerInput = document.querySelector('.footer-input');
  if (!footerInput) {
    console.warn('[Panel] footer-input not found, retrying in 100ms...');
    setTimeout(() => {
      footerInput = document.querySelector('.footer-input');
      if (footerInput) {
        console.log('[Panel] Found footer-input on retry, appending preview container');
        footerInput.appendChild(previewContainer);
        console.log('[Panel] Preview container appended to footer-input (retry)');
        checkContainerAfterAppend();
      } else {
        console.error('[Panel] ERROR: Could not find footer-input element after retry');
        console.log('[Panel] ========== showImagePreview END (error) ==========');
      }
    }, 100);
    return;
  }
  console.log('[Panel] Found footer-input, appending preview container');
  footerInput.appendChild(previewContainer);
  console.log('[Panel] Preview container appended to footer-input');
  function checkContainerAfterAppend() {
    setTimeout(() => {
      const addedContainer = document.getElementById('imagePreviewContainer');
      if (addedContainer) {
        const rect = addedContainer.getBoundingClientRect();
        const fileItems = addedContainer.querySelectorAll('.preview-file-item');
        console.log('[Panel] ========== CONTAINER CHECK ==========');
        console.log('[Panel] Container exists:', true);
        console.log('[Panel] Container visible:', rect.width > 0 && rect.height > 0);
        console.log('[Panel] Container dimensions:', {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        });
        console.log('[Panel] Container children count:', addedContainer.children.length);
        console.log('[Panel] File items count:', fileItems.length);
        console.log('[Panel] Container computed styles:', {
          display: window.getComputedStyle(addedContainer).display,
          visibility: window.getComputedStyle(addedContainer).visibility,
          opacity: window.getComputedStyle(addedContainer).opacity,
          position: window.getComputedStyle(addedContainer).position,
          zIndex: window.getComputedStyle(addedContainer).zIndex
        });
        console.log('[Panel] Container parent:', addedContainer.parentElement?.className);
        fileItems.forEach((item, idx) => {
          const itemRect = item.getBoundingClientRect();
          const removeBtn = item.querySelector('.preview-remove-btn');
          console.log('[Panel] File item', idx + 1, ':', {
            visible: itemRect.width > 0 && itemRect.height > 0,
            dimensions: { width: itemRect.width, height: itemRect.height },
            hasRemoveBtn: !!removeBtn,
            removeBtnVisible: removeBtn ? (removeBtn.offsetWidth > 0 && removeBtn.offsetHeight > 0) : false
          });
        });
        if (rect.width === 0 || rect.height === 0) {
          console.warn('[Panel] Container not visible, forcing display...');
          addedContainer.style.display = 'flex';
          addedContainer.style.visibility = 'visible';
          addedContainer.style.opacity = '1';
          addedContainer.style.height = 'auto';
          setTimeout(() => {
            const newRect = addedContainer.getBoundingClientRect();
            console.log('[Panel] Container after force display:', {
              visible: newRect.width > 0 && newRect.height > 0,
              width: newRect.width,
              height: newRect.height
            });
          }, 100);
        }
        console.log('[Panel] ========== END CONTAINER CHECK ==========');
      } else {
        console.error('[Panel] ERROR: Container not found in DOM after appending');
      }
      console.log('[Panel] ========== showImagePreview END ==========');
    }, 300);
  }
  checkContainerAfterAppend();
}

