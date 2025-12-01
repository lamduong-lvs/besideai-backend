// background/helpers/tabs.js
// Tab listeners and helper functions

import { debugLog } from './utils.js';

// Cache để lưu windowId cho mỗi tab (tránh mất user gesture khi query)
export const tabWindowIdCache = new Map();

// Cache để lưu trạng thái panel (mở/đóng) cho mỗi tab
// true = panel đang mở, false/undefined = panel đang đóng
export const panelStateCache = new Map();

export function isInjectableURL(url) {
    if (!url) return false;
    const restrictedProtocols = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'view-source:', 'data:', 'file://'];
    return !restrictedProtocols.some(protocol => url.startsWith(protocol));
}

export async function isTabAccessible(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        return tab && isInjectableURL(tab.url);
    } catch (error) {
        return false;
    }
}

export async function safeMessageSend(tabId, message, timeout = 5000) {
    try {
        if (!await isTabAccessible(tabId)) {
            return { success: false, error: 'Tab not accessible' };
        }
        return await Promise.race([
            chrome.tabs.sendMessage(tabId, message),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Message timeout')), timeout))
        ]);
    } catch (error) {
        debugLog('SafeMessage', `Failed to send to tab ${tabId}:`, error.message);
        return { success: false, error: error.message };
    }
}

    export async function injectIntoTab(tabId, settings) {
    try {
        // ✅ MAP SETTINGS: Recorder settings có thể dùng tên khác
        // Hỗ trợ cả hai format: recorder format (controlBarEnabled, cameraEnabled, clickEffectEnabled)
        // và injection format (showControls, camera, clickEffect)
        const shouldInjectControlBar = settings.showControls || settings.controlBarEnabled;
        const shouldInjectCamera = settings.camera || settings.cameraEnabled;
        const shouldInjectClickEffect = settings.clickEffect || settings.clickEffectEnabled;
        const cameraShape = settings.cameraShape || 'circle';
        
        // Control Bar
        if (shouldInjectControlBar) {
            await chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['modules/screenshot/control-bar.css'] });
            await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['modules/screenshot/control-bar.js'] });
            await new Promise(resolve => setTimeout(resolve, 150));
            // Map settings để gửi cho control bar
            const controlBarSettings = {
                ...settings,
                showControls: shouldInjectControlBar,
                cameraEnabled: shouldInjectCamera,
                clickEffectEnabled: shouldInjectClickEffect,
                cameraShape: cameraShape
            };
            await safeMessageSend(tabId, { action: 'initControlBar', settings: controlBarSettings });
        }
        
        // Camera
        if (shouldInjectCamera) {
            await chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['modules/screenshot/camera-overlay.css'] });
            await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['modules/screenshot/camera-overlay.js'] });
            await safeMessageSend(tabId, { action: 'initCamera', cameraShape: cameraShape });
        }
        
        // Click Effect
        if (shouldInjectClickEffect) {
            await chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['modules/screenshot/click-effect.css'] });
            await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['modules/screenshot/click-effect.js'] });
        }
        
        debugLog('Injection', `Successfully injected into tab ${tabId}`, {
            controlBar: shouldInjectControlBar,
            camera: shouldInjectCamera,
            clickEffect: shouldInjectClickEffect
        });
        return true;
    } catch (err) {
        debugLog('Injection', `Failed to inject into tab ${tabId}:`, err.message);
        return false;
    }
}

// Tab event listeners
export function setupTabListeners(recordingState, injectIntoTabFn) {
    chrome.tabs.onCreated.addListener(async (tab) => {
        // Lưu windowId vào cache ngay khi tab được tạo
        if (tab.id && tab.windowId) {
            tabWindowIdCache.set(tab.id, tab.windowId);
            console.log('[Background] Cached windowId for tab:', tab.id, '->', tab.windowId);
        }
        
        // KHÔNG enable panel tự động cho tab mới
        // Panel chỉ được enable khi user chủ động mở
        console.log('[Background] New tab created, panel NOT enabled (user must open manually):', tab.id);
        
        // ✅ INJECT VÀO TAB MỚI KHI ĐANG RECORDING
        if (recordingState.isRecording && tab.id !== recordingState.recorderTabId) {
            if (recordingState.targetTabs && recordingState.targetTabs.length > 0) {
                // TAB SHARING MODE - Chỉ inject vào tab được share
                if (recordingState.targetTabs.includes(tab.id)) {
                    debugLog('TabCreated', '🎯 TAB MODE - New tab is the shared tab, will inject when loaded', tab.id);
                } else {
                    debugLog('TabCreated', 'TAB MODE - Skipping new tab (not the shared tab)', tab.id);
                    return;
                }
            } else {
                // SCREEN MODE - Inject vào tất cả tab mới
                debugLog('TabCreated', '📺 SCREEN MODE - New tab detected, will inject when loaded', tab.id);
            }
        }
    });

    // Lắng nghe khi tab được activate (chuyển tab)
    // KHÔNG làm gì cả - mỗi tab quản lý panel riêng
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
        // Không cần xử lý gì - panel sẽ tự động giữ trạng thái của từng tab
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        // Lưu windowId vào cache khi tab được update
        if (tab.id && tab.windowId) {
            tabWindowIdCache.set(tab.id, tab.windowId);
        }
        
        // Chỉ enable panel nếu tab này đã có panel trước đó (kiểm tra cache)
        if (changeInfo.status === 'complete' && tab.id && isInjectableURL(tab.url)) {
            // Kiểm tra xem tab này có đang mở panel không
            const wasPanelOpen = panelStateCache.get(tab.id) === true;
            
            if (wasPanelOpen) {
                // Tab này đã mở panel trước đó, enable lại
                try {
                    await chrome.sidePanel.setOptions({
                        tabId: tab.id,
                        enabled: true,
                        path: 'modules/panel/panel.html'
                    });
                    // Info log - comment out to reduce console noise
                    // console.log('[Background] Panel re-enabled for tab (was open before):', tab.id);
                } catch (error) {
                    console.warn('[Background] Error re-enabling panel for tab:', error);
                }
            } else {
                // Tab này chưa mở panel, KHÔNG enable tự động
                // Info log - comment out to reduce console noise
                // console.log('[Background] Tab loaded, panel not enabled (user must open manually):', tab.id);
            }
        }
        
        // ✅ INJECT VÀO TAB KHI ĐANG RECORDING (bao gồm cả tab mới và tab reload)
        if (changeInfo.status === 'complete' && recordingState.isRecording) {
            if (tabId === recordingState.recorderTabId) {
                debugLog('TabUpdated', '⏭️ Skipping recorder tab', { tabId });
                return;
            }
            
            // Kiểm tra xem tab có injectable URL không
            if (!isInjectableURL(tab.url)) {
                debugLog('TabUpdated', '⏭️ Skipping non-injectable tab', { tabId, url: tab.url });
                return;
            }
            
            // Kiểm tra settings có tồn tại không
            if (!recordingState.settings) {
                console.warn('[Background] Cannot inject: recordingState.settings is null', { tabId });
                return;
            }
            
            if (recordingState.targetTabs && recordingState.targetTabs.length > 0) {
                // TAB SHARING MODE - Chỉ inject vào tab được share
                if (!recordingState.targetTabs.includes(tabId)) {
                    debugLog('TabUpdated', '⏭️ TAB MODE - Skipping tab (not the shared tab)', { tabId, url: tab.url });
                    return;
                }
                debugLog('TabUpdated', '🎯 TAB MODE - Injecting into target tab', { tabId, url: tab.url });
            } else {
                // SCREEN MODE - Inject vào tất cả tab (bao gồm tab mới)
                debugLog('TabUpdated', '📺 SCREEN MODE - Injecting into tab', { tabId, url: tab.url });
            }
            
            // Inject vào tab với delay nhỏ để đảm bảo tab đã sẵn sàng
            try {
                // Đợi một chút để đảm bảo tab đã load xong hoàn toàn
                await new Promise(resolve => setTimeout(resolve, 100));
                await injectIntoTabFn(tabId, recordingState.settings);
                debugLog('TabUpdated', '✅ Successfully injected into tab', { tabId, url: tab.url });
            } catch (err) {
                console.warn('[Background] Failed to inject into tab:', tabId, err);
                debugLog('TabUpdated', '❌ Injection failed', { tabId, url: tab.url, error: err.message });
            }
        }
    });

    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
        // Xóa windowId và panel state khỏi cache khi tab bị đóng
        tabWindowIdCache.delete(tabId);
        panelStateCache.delete(tabId);
    });
}

