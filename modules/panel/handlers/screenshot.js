// screenshot.js
// Screenshot handling

import { processCropImage } from '../media/image-processor.js';
import { getProcessingImageId, setProcessingImageId, resetProcessingImageId } from '../media/image-processor.js';
import { showImagePreview } from '../ui/preview.js';
import { showError, showInfo } from '../utils/toast.js';
import { checkFeatureAvailability } from '../../features/feature-check-helper.js';

export async function handleCropImage(Lang) {
  console.log('[Panel] Starting crop image...');
  try {
    // Get current tab - use the tab that opened the panel
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || !tab.id) {
      showError(Lang && typeof Lang.get === 'function' ? Lang.get('errorNoTab') : 'Không thể lấy thông tin tab hiện tại');
      return;
    }
    
    console.log('[Panel] Sending screenshot-area request for chat, tabId:', tab.id);
    chrome.runtime.sendMessage({
      action: 'contextMenuAction',
      type: 'screenshot-area',
      forChat: true,
      tabId: tab.id
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Panel] Error triggering screenshot:', chrome.runtime.lastError);
        const errorMsg = Lang && typeof Lang.get === 'function' 
          ? Lang.get('errorCropImageFailed') 
          : 'Không thể khởi động chức năng cắt ảnh';
        showError(errorMsg);
      } else if (!response || response.success === false) {
        const responseError = Lang && typeof Lang.get === 'function'
          ? Lang.get('errorScreenshot', { message: response?.error || 'Không thể chụp tab này' })
          : (response?.error || 'Không thể chụp tab này');
        showError(responseError);
      } else {
        const infoMsg = Lang && typeof Lang.get === 'function'
          ? Lang.get('infoCropImageSelectArea')
          : 'Vui lòng chọn vùng ảnh cần cắt trên trang web';
        showInfo(infoMsg);
      }
    });
  } catch (error) {
    console.error('[Panel] Error in handleCropImage:', error);
    const errorMsg = Lang && typeof Lang.get === 'function'
      ? Lang.get('errorCropImageFailed')
      : 'Lỗi khi khởi động chức năng cắt ảnh: ' + error.message;
    showError(errorMsg);
  }
}

export async function handleScreenshotForChat(dataUrl, Lang) {
  console.log('[Panel] handleScreenshotForChat called, dataUrl present:', !!dataUrl);
  console.log('[Panel] handleScreenshotForChat dataUrl length:', dataUrl?.length || 0);
  if (!dataUrl) {
    console.error('[Panel] No dataUrl provided in handleScreenshotForChat');
    showError(Lang.get('errorCropImageFailed') || 'Lỗi: Không nhận được dữ liệu ảnh');
    return;
  }
  const dataUrlSize = new TextEncoder().encode(dataUrl).length;
  const dataUrlSizeKB = dataUrlSize / 1024;
  const dataUrlSizeMB = dataUrlSize / 1024 / 1024;
  console.log('[Panel] Screenshot received via message, size:', dataUrlSizeKB.toFixed(2), 'KB', `(${dataUrlSizeMB.toFixed(2)}MB)`);
  const imageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('[Panel] Generated image ID:', imageId);
  const processingCropImageId = getProcessingImageId();
  console.log('[Panel] Current processingCropImageId:', processingCropImageId);
  console.log('[Panel] Current pendingImages count:', window.pendingImages?.length || 0);
  if (processingCropImageId) {
    const currentTime = Date.now();
    const processingTime = parseInt(processingCropImageId.split('_')[1]) || 0;
    const timeDiff = currentTime - processingTime;
    if (timeDiff < 1000) {
      console.log('[Panel] Image being processed recently, checking if duplicate...');
    }
  }
  if (window.pendingImages && window.pendingImages.length > 0) {
    const newDataUrlSize = dataUrl.length;
    const newDataUrlPrefix = dataUrl.substring(0, 100);
    const isAlreadyProcessed = window.pendingImages.some(img => {
      if (!img.dataUrl) return false;
      const imgSize = img.dataUrl.length;
      const imgPrefix = img.dataUrl.substring(0, 100);
      return imgSize === newDataUrlSize && imgPrefix === newDataUrlPrefix;
    });
    if (isAlreadyProcessed) {
      console.log('[Panel] Image already processed (same size and prefix), skipping duplicate from message...');
      return;
    }
  }
  setProcessingImageId(imageId);
  console.log('[Panel] Set processingCropImageId to:', imageId);
  try {
    console.log('[Panel] Processing screenshot from message...');
    await processCropImage(dataUrl, null, null, showError, Lang, showImagePreview);
    console.log('[Panel] Successfully processed screenshot from message');
    resetProcessingImageId();
  } catch (error) {
    console.error('[Panel] Error processing screenshot from message:', error);
    console.error('[Panel] Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      dataUrlSizeKB: dataUrlSizeKB.toFixed(2)
    });
    showError(Lang.get('errorCropImageFailed') || 'Lỗi khi xử lý ảnh cắt: ' + error.message);
    resetProcessingImageId();
  }
}

export async function handleScreenshotAction(action, Lang) {
  console.log('[Panel] Sending screenshot action:', action);
  
  try {
    // ✅ Check feature availability
    const isAvailable = await checkFeatureAvailability('screenshot');
    if (!isAvailable) {
      return; // Upgrade prompt already shown
    }

    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    if (!tab || !tab.id) {
      showError(Lang.get('errorNoTab') || 'Không thể lấy thông tin tab hiện tại');
      return;
    }
    
    // Hide panel for all screenshot types
    hidePanelForScreenshot();
    
    // Close panel immediately for all screenshot types (same as screenshot-area behavior)
    // This matches the behavior where screenshot-area closes panel immediately when script is injected
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: 'closeSidePanel' }).catch(() => {});
    }, 100);
    
    // Send screenshot request directly to background script
    chrome.runtime.sendMessage({
      action: 'contextMenuAction',
      type: action,
      tabId: tab.id,
      tabUrl: tab.url
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Panel] Error triggering screenshot:', chrome.runtime.lastError);
        // Panel already closed, error will be shown in viewer or alert
        return;
      }
      
      if (!response || response.success === false) {
        const errorMsg = response?.error || Lang.get('errorScreenshot') || 'Không thể chụp màn hình';
        console.error('[Panel] Screenshot failed:', errorMsg);
        // Panel already closed, error will be shown in viewer or alert
        return;
      }
      
      // Success - screenshot will be processed in background
      // Panel already closed, viewer will open automatically
    });
  } catch (error) {
    console.error('[Panel] Error in handleScreenshotAction:', error);
    showError(Lang.get('errorScreenshot') || 'Lỗi khi chụp màn hình: ' + error.message);
    showPanelAfterScreenshot();
  }
}

function getScreenshotTypeName(action, Lang) {
  const names = {
    'screenshot-visible': Lang.get("screenshotTypeVisible"),
    'screenshot-area': Lang.get("screenshotTypeArea"),
    'screenshot-scroll': Lang.get("screenshotTypeScroll")
  };
  return names[action] || Lang.get("screenshotTypeDefault");
}

export function hidePanelForScreenshot() {
  const popupContainer = document.querySelector('.popup-container');
  if (popupContainer) {
    popupContainer.style.opacity = '0';
    popupContainer.style.pointerEvents = 'none';
    popupContainer.style.transition = 'opacity 0.2s';
  }
}

export function showPanelAfterScreenshot() {
  const popupContainer = document.querySelector('.popup-container');
  if (popupContainer) {
    setTimeout(() => {
      popupContainer.style.opacity = '1';
      popupContainer.style.pointerEvents = 'auto';
      popupContainer.style.transition = '';
      resetPanelVisibilityStyles();
    }, 300);
  }
}

export function resetPanelVisibilityStyles() {
  const popupContainer = document.querySelector('.popup-container');
  if (!popupContainer) return;
  popupContainer.style.opacity = '';
  popupContainer.style.pointerEvents = '';
  popupContainer.style.transition = '';
}

