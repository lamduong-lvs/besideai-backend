// background/helpers/screenshot-helpers.js
// Screenshot helper functions

import { debugLog } from './utils.js';
import { getLang } from './i18n.js';
import { processOffscreen, captureFullPage } from './offscreen.js';

export const screenshotDataStore = new Map();

export function storeScreenshotData(dataUrl, filename) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    screenshotDataStore.set(id, { dataUrl, filename, timestamp: new Date().toISOString() });
    setTimeout(() => {
        screenshotDataStore.delete(id);
        debugLog('Store', 'Cleaned up screenshot data:', id);
    }, 5 * 60 * 1000);
    return id;
}

export async function handleScreenshot(type, tabId, forChat = false) {
    debugLog('Background', '=== SCREENSHOT START ===', { type, tabId, forChat });
    await chrome.tabs.sendMessage(tabId, { action: 'hideContextMenu' }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (type) {
        case 'screenshot-visible': {
            const visibleUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 100 });
            await openScreenshotViewer(visibleUrl, 'screenshot-visible.png');
            break;
        }
        case 'screenshot-area': {
            // Set flag forChat trong content script nếu cần
            if (forChat) {
                await chrome.tabs.sendMessage(tabId, { action: 'setScreenshotForChat', forChat: true }).catch(() => {});
            }
            await chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['styles/screenshot-area.css'] });
            await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['js/screenshot-area.js'] });
            break;
        }
        case 'screenshot-scroll': {
            try {
                const capturedData = await captureFullPage(tabId);
                if (!capturedData) throw new Error('captureFullPage returned null');
                const response = await processOffscreen({ action: 'stitchImages', data: capturedData });
                if (!response?.success || !response?.data) throw new Error(response?.error || 'Stitch failed');
                await openScreenshotViewer(response.data, 'screenshot-fullpage.png');
                debugLog('Background', '=== SCREENSHOT SUCCESS ===');
            } catch (error) {
                debugLog('Background', '=== SCREENSHOT FAILED ===', error.message);
                alert(getLang('errorScreenshot', { message: error.message }));
            }
            break;
        }
    }
}

export async function handleScreenshotArea({ x, y, width, height, devicePixelRatio, forChat }, tabId) {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    const response = await processOffscreen({ 
        action: 'cropImage', 
        data: { 
            dataUrl, 
            cropConfig: { x, y, width, height, devicePixelRatio } 
        } 
    });
    
    if (response?.success) {
        if (forChat) {
            // Chiến lược: 
            // - Ảnh nhỏ (< 800KB): Chỉ dùng postMessage, KHÔNG lưu vào storage (tránh duplicate)
            // - Ảnh lớn (>= 800KB): Chỉ dùng storage, KHÔNG gửi postMessage
            const dataUrlSize = new TextEncoder().encode(response.data).length;
            const dataUrlSizeKB = dataUrlSize / 1024;
            const dataUrlSizeMB = dataUrlSize / 1024 / 1024;
            const maxPostMessageSize = 800 * 1024; // 800KB
            
            console.log('[Background] Crop image size:', dataUrlSizeKB.toFixed(2), 'KB', `(${dataUrlSizeMB.toFixed(2)}MB)`);
            
            let storageSaved = false;
            
            // Chỉ lưu vào storage nếu ảnh lớn (>= 800KB)
            // Ảnh nhỏ sẽ được gửi qua postMessage, không cần storage
            if (dataUrlSize >= maxPostMessageSize) {
                console.log('[Background] Large image, saving to storage only (no postMessage)');
                try {
                    // Xóa dữ liệu cũ trước để giải phóng không gian
                    try {
                        await chrome.storage.local.remove(['pendingCropImage', 'pendingCropImageTimestamp']);
                    } catch (cleanupError) {
                        // Ignore cleanup errors
                    }
                    
                    // Lưu vào storage cho ảnh lớn
                    await chrome.storage.local.set({ 
                        pendingCropImage: response.data,
                        pendingCropImageTimestamp: Date.now()
                    });
                    storageSaved = true;
                    console.log('[Background] Successfully saved large image to storage');
                } catch (error) {
                    // Xử lý lỗi quota exceeded hoặc lỗi khác
                    const errorMsg = error.message || error.toString() || '';
                    const isQuotaError = errorMsg.toLowerCase().includes('quota') || 
                                       errorMsg.includes('QuotaBytes') ||
                                       errorMsg.includes('QUOTA_BYTES');
                    
                    if (isQuotaError) {
                        console.warn('[Background] Storage quota exceeded, trying aggressive cleanup...');
                        // Thử xóa nhiều dữ liệu cũ hơn để giải phóng không gian
                        try {
                            // Xóa tất cả dữ liệu liên quan đến pending images
                            await chrome.storage.local.remove([
                                'pendingCropImage', 
                                'pendingCropImageTimestamp',
                                'pendingImagesData',
                                'pendingImagesTimestamp',
                                'pendingImagesCount'
                            ]);
                            console.log('[Background] Cleaned up old pending image data');
                            
                            // Thử lại một lần nữa
                            try {
                                await chrome.storage.local.set({ 
                                    pendingCropImage: response.data,
                                    pendingCropImageTimestamp: Date.now()
                                });
                                storageSaved = true;
                                console.log('[Background] Successfully saved after aggressive cleanup');
                            } catch (retryError) {
                                console.warn('[Background] Still cannot save after cleanup:', retryError.message);
                            }
                        } catch (cleanupError) {
                            console.warn('[Background] Cannot cleanup storage:', cleanupError);
                        }
                    } else {
                        console.error('[Background] Failed to save crop image:', error);
                    }
                }
            } else {
                console.log('[Background] Small image, will use postMessage only (no storage)');
            }
            
            // Không thể tự động mở panel do Chrome yêu cầu user gesture
            // Chỉ đảm bảo panel được enable và gửi notification
            try {
                // Đảm bảo panel được enable
                await chrome.sidePanel.setOptions({
                    tabId: tabId,
                    enabled: true,
                    path: 'modules/panel/panel.html'
                }).catch(() => {});
                
                // Gửi notification để user biết cần mở panel
                try {
                    const notificationMessage = storageSaved 
                        ? (getLang('notificationCropImageMessage') || 'Click vào icon extension để mở Panel và xem ảnh đã cắt')
                        : (getLang('notificationCropImageMessageImmediate') || 'Mở Panel ngay để xem ảnh đã cắt (ảnh chỉ có sẵn khi Panel đang mở)');
                    
                    await chrome.notifications.create({
                        type: 'basic',
                        iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
                        title: getLang('notificationCropImageTitle') || 'Ảnh đã được cắt',
                        message: notificationMessage
                    });
                } catch (notifError) {
                    console.warn('[Background] Could not show notification:', notifError);
                }
                
                // Gửi message đến content script để forward đến panel
                // Chiến lược: 
                // - Ảnh nhỏ (< 800KB): Chỉ gửi postMessage, KHÔNG lưu storage (đã xử lý ở trên)
                // - Ảnh lớn (>= 800KB): Chỉ dùng storage, KHÔNG gửi postMessage
                setTimeout(async () => {
                    try {
                        const dataUrlSize = new TextEncoder().encode(response.data).length;
                        const dataUrlSizeKB = dataUrlSize / 1024;
                        const maxMessageSize = 800 * 1024; // 800KB
                        
                        // Chỉ gửi message nếu ảnh nhỏ (< 800KB) và chưa lưu vào storage
                        if (dataUrlSize < maxMessageSize && !storageSaved) {
                            console.log('[Background] Sending small image via message passing:', dataUrlSizeKB.toFixed(2), 'KB');
                            // Gửi đến content script (content script sẽ forward đến panel qua postMessage)
                            try {
                                await chrome.tabs.sendMessage(tabId, { 
                                    action: 'screenshotAreaForChat', 
                                    dataUrl: response.data 
                                });
                                console.log('[Background] Message sent successfully via message passing');
                            } catch (msgError) {
                                console.warn('[Background] Failed to send message:', msgError.message);
                                // Fallback: lưu vào storage nếu message fail
                                console.log('[Background] Falling back to storage method');
                                try {
                                    await chrome.storage.local.set({ 
                                        pendingCropImage: response.data,
                                        pendingCropImageTimestamp: Date.now()
                                    });
                                    storageSaved = true;
                                    console.log('[Background] Saved to storage as fallback');
                                } catch (storageError) {
                                    console.error('[Background] Failed to save to storage as fallback:', storageError);
                                }
                            }
                        } else if (dataUrlSize >= maxMessageSize) {
                            console.log('[Background] Large image, using storage only (no message passing):', dataUrlSizeKB.toFixed(2), 'KB');
                            // Ảnh lớn đã được lưu vào storage ở trên, panel sẽ nhận qua storage listener
                        } else {
                            console.log('[Background] Image already saved to storage, skipping message passing');
                        }
                    } catch (error) {
                        console.error('[Background] Error in message sending logic:', error);
                    }
                }, 50); // Giảm delay để panel nhận nhanh hơn
            } catch (error) {
                console.error('[Background] Error setting up panel:', error);
            }
        } else {
            await openScreenshotViewer(response.data, 'screenshot-area.png');
        }
    } else {
        console.error("Crop failed:", response?.error);
    }
}

export async function openScreenshotViewer(dataUrl, filename) {
    try {
        debugLog('Background', 'Storing screenshot data...');
        const dataId = storeScreenshotData(dataUrl, filename);
        debugLog('Background', 'Data stored with ID:', dataId);
        const viewerUrl = chrome.runtime.getURL(`modules/screenshot-editor/viewer.html?id=${dataId}`);
        await chrome.tabs.create({ url: viewerUrl, active: true });
        debugLog('Background', 'Viewer opened successfully');
    } catch (error) {
        debugLog('Background', 'Viewer error:', error.message);
        console.error('[Background] Failed to open viewer:', error);
        alert(getLang('errorViewer', { message: error.message }));
    }
}

