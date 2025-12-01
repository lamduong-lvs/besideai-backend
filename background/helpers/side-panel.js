// background/helpers/side-panel.js
// Side panel helper functions

import { tabWindowIdCache, panelStateCache } from './tabs.js';
import { isInjectableURL } from './tabs.js';

export async function enableSidePanelForAllTabs() {
    try {
        // KHÔNG dùng global panel - mỗi tab quản lý riêng
        // Chỉ enable cho từng tab cụ thể
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            // Lưu windowId vào cache
            if (tab.id && tab.windowId) {
                tabWindowIdCache.set(tab.id, tab.windowId);
            }
            
            // Enable panel cho tab (không dùng global)
            if (tab.id && isInjectableURL(tab.url)) {
                try {
                    await chrome.sidePanel.setOptions({
                        tabId: tab.id,
                        enabled: true,
                        path: 'modules/panel/panel.html'
                    });
                } catch (error) {
                    // Ignore errors for individual tabs
                }
            }
        }
        console.log('[Background] Side panel enabled for all tabs (individual, not global), cache populated with', tabWindowIdCache.size, 'entries');
    } catch (error) {
        console.error('[Background] Error enabling side panel for all tabs:', error);
    }
}

export async function handleOpenSidePanel(tabId, sendResponse, sender) {
    // Info log - comment out to reduce console noise
    // console.log('[Background] handleOpenSidePanel called for tabId:', tabId, 'sender:', sender);
    
    // Lấy trạng thái hiện tại của panel cho tab này
    const isPanelOpen = panelStateCache.get(tabId) === true;
    
    try {
        if (isPanelOpen) {
            // Panel đang mở ở tab này -> Đóng CHỈ tab này
            // Info log - comment out to reduce console noise
            // console.log('[Background] Panel is open, closing for tab:', tabId);
            
            // Disable panel cho tab này
            await chrome.sidePanel.setOptions({
                tabId: tabId,
                enabled: false
            });
            
            // Cập nhật cache
            panelStateCache.set(tabId, false);
            
            // Info log - comment out to reduce console noise
            // console.log('[Background] Panel closed for tab:', tabId);
            sendResponse({ success: true });
        } else {
            // Panel đang đóng -> Mở CHỈ tab này
            // Info log - comment out to reduce console noise
            // console.log('[Background] Panel is closed, opening for tab:', tabId);
            
            // BƯỚC 1: Enable panel cho tab hiện tại (KHÔNG await để giữ user gesture)
            const enablePromise = chrome.sidePanel.setOptions({
                tabId: tabId,
                enabled: true,
                path: 'modules/panel/panel.html'
            }).catch(err => {
                console.warn('[Background] setOptions warning (may already be enabled):', err.message);
            });
            
            // BƯỚC 2: Gọi open() NGAY LẬP TỨC (không await enablePromise hay bất cứ thứ gì khác)
            // Điều này đảm bảo user gesture được giữ
            try {
                await chrome.sidePanel.open({ tabId: tabId });
                // Cập nhật state cho tab này
                panelStateCache.set(tabId, true);
                
                // BƯỚC 3: Sau khi mở thành công, disable tất cả tabs khác (không block)
                chrome.tabs.query({}).then(allTabs => {
                    const disablePromises = allTabs
                        .filter(tab => tab.id && tab.id !== tabId && isInjectableURL(tab.url))
                        .map(tab => 
                            chrome.sidePanel.setOptions({
                                tabId: tab.id,
                                enabled: false
                            }).then(() => {
                                panelStateCache.set(tab.id, false);
                            }).catch(() => {})
                        );
                    
                    Promise.all(disablePromises).then(() => {
                        // Info log - comment out to reduce console noise
                        // console.log('[Background] Other tabs disabled');
                    }).catch(() => {});
                });
                
                // Info log - comment out to reduce console noise
                // console.log('[Background] Panel opened for tabId:', tabId);
                sendResponse({ success: true });
            } catch (openError) {
                // Nếu lỗi "No active side panel", đợi enablePromise hoàn thành rồi retry
                if (openError.message?.includes('No active side panel')) {
                    console.log('[Background] Panel not ready, waiting for enable...');
                    // Đợi enablePromise hoàn thành
                    await enablePromise;
                    // Retry open() - vẫn trong user gesture context
                    await chrome.sidePanel.open({ tabId: tabId });
                    panelStateCache.set(tabId, true);
                    
                    // Disable các tabs khác sau khi mở thành công
                    chrome.tabs.query({}).then(allTabs => {
                        const disablePromises = allTabs
                            .filter(tab => tab.id && tab.id !== tabId && isInjectableURL(tab.url))
                            .map(tab => 
                                chrome.sidePanel.setOptions({
                                    tabId: tab.id,
                                    enabled: false
                                }).then(() => {
                                    panelStateCache.set(tab.id, false);
                                }).catch(() => {})
                            );
                        Promise.all(disablePromises).catch(() => {});
                    });
                    
                    console.log('[Background] Panel opened after retry for tabId:', tabId);
                    sendResponse({ success: true });
                } else {
                    throw openError;
                }
            }
        }
        
    } catch (error) {
        console.error('[Background] Error toggling side panel:', error);
        
        // Nếu lỗi "No active side panel", enable panel và yêu cầu user click lại
        if (error.message?.includes('No active side panel')) {
            try {
                // Enable panel cho tab này
                await chrome.sidePanel.setOptions({
                    tabId: tabId,
                    enabled: true,
                    path: 'modules/panel/panel.html'
                });
                console.log('[Background] Panel enabled for tab - User needs to click again');
                sendResponse({ success: false, error: 'Panel enabled. Please click again.' });
            } catch (enableError) {
                console.error('[Background] Error enabling panel:', enableError);
                sendResponse({ success: false, error: enableError.message });
            }
        } else {
            sendResponse({ success: false, error: error.message });
        }
    }
}

export async function handleCloseSidePanel(tabId, sendResponse) {
    try {
        console.log('[Background] handleCloseSidePanel called, closing panel for tab:', tabId);
        
        // Chỉ disable panel cho tab này (không ảnh hưởng tabs khác)
        await chrome.sidePanel.setOptions({
            tabId: tabId,
            enabled: false
        });
        
        // Cập nhật cache cho tab này
        panelStateCache.set(tabId, false);
        
        console.log('[Background] Panel closed for tab:', tabId);
        
        if (sendResponse) {
            sendResponse({ success: true });
        }
    } catch (error) {
        console.error('[Background] Error closing side panel:', error);
        if (sendResponse) {
            sendResponse({ success: false, error: error.message });
        }
    }
}

