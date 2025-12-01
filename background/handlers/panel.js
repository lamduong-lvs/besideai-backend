// background/handlers/panel.js
// Handlers for side panel related actions

// These will be imported from background.js
let panelStateCache, tabWindowIdCache, isInjectableURL, getLang, handleOpenSidePanelInternal;

export function initializePanelHandlers(dependencies) {
  panelStateCache = dependencies.panelStateCache;
  tabWindowIdCache = dependencies.tabWindowIdCache;
  isInjectableURL = dependencies.isInjectableURL;
  getLang = dependencies.getLang;
  handleOpenSidePanelInternal = dependencies.handleOpenSidePanelInternal;
}

export async function handleOpenSidePanel(request, sender, sendResponse) {
  // Info log - comment out to reduce console noise
  // console.log('[Background] Received openSidePanel message, sender:', sender);
  let tabId = sender.tab && sender.tab.id ? sender.tab.id : null;
  if (!tabId) {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) tabId = activeTab.id;
    } catch (e) {}
  }
  if (!tabId) {
    console.error('[Background] No tab ID available for openSidePanel');
    sendResponse({ success: false, error: 'No tab ID available' });
    return;
  }
  
  if (sender.tab && sender.tab.windowId && !tabWindowIdCache.has(tabId)) {
    tabWindowIdCache.set(tabId, sender.tab.windowId);
    console.log('[Background] Cached windowId from sender.tab:', sender.tab.windowId);
  }
  
  // Use the handleOpenSidePanel function from side-panel.js
  await handleOpenSidePanelInternal(tabId, sendResponse, sender);
}

export async function handleCloseSidePanel(request, sender, sendResponse) {
  try {
    let tabId = request.tabId;
    if (!tabId && sender.tab && sender.tab.id) {
      tabId = sender.tab.id;
    }
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        tabId = activeTab.id;
      }
    }
    if (!tabId) {
      console.warn('[Background] closeSidePanel: No tab ID available');
      sendResponse({ success: false, error: 'No tab ID available' });
      return;
    }
    
    await chrome.sidePanel.setOptions({
      tabId: tabId,
      enabled: false
    });
    panelStateCache.set(tabId, false);
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Background] Error in closeSidePanel:', error);
    sendResponse({ success: false, error: error.message });
  }
}

export async function handlePanelClosed(request, sender, sendResponse) {
  try {
    let tabId = request.tabId;
    if (!tabId && sender.tab && sender.tab.id) {
      tabId = sender.tab.id;
    }
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        tabId = activeTab.id;
      }
    }
    
    if (tabId) {
      console.log('[Background] Panel closed at tab:', tabId, '- disabling other tabs');
      
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        enabled: false
      }).catch(() => {});
      panelStateCache.set(tabId, false);
      
      const allTabs = await chrome.tabs.query({});
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
      
      await Promise.all(disablePromises);
      console.log('[Background] All tabs disabled after panel closed');
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Background] Error in panelClosed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

export async function handleEnableSidePanelForTab(request, sender, sendResponse) {
  const tabId = request.tabId || sender.tab?.id;
  if (!tabId) {
    console.warn('[Background] enableSidePanelForTab: No tab ID available');
    sendResponse({ success: false, error: 'No tab ID available' });
    return;
  }
  console.log('[Background] Enabling panel for tab:', tabId);
  try {
    await chrome.sidePanel.setOptions({
      tabId: tabId,
      enabled: true,
      path: 'modules/panel/panel.html'
    });
    console.log('[Background] Panel enabled successfully for tab:', tabId);
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Background] Error enabling panel for tab:', tabId, error);
    sendResponse({ success: false, error: error.message });
  }
}

export async function handleEnsureSidePanelOpen(request, sender, sendResponse) {
  try {
    let tabId = request.tabId || (sender.tab && sender.tab.id) || null;
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) tabId = activeTab.id;
    }
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID available' });
      return;
    }
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: true,
      path: 'modules/panel/panel.html'
    }).catch(() => {});
    try {
      await chrome.sidePanel.open({ tabId });
      panelStateCache.set(tabId, true);
      sendResponse({ success: true, opened: true, enabled: true });
    } catch (error) {
      const msg = (error && error.message) || '';
      if (msg.includes('may only be called in response to a user gesture') || msg.includes('No active side panel')) {
        panelStateCache.set(tabId, true);
        sendResponse({ success: true, opened: false, enabled: true, message: 'Panel enabled but not opened (requires user gesture)' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('[Background] Error in ensureSidePanelOpen:', error);
    sendResponse({ success: false, error: error.message });
  }
}

export async function handleOpenSidePanelForTab(request, sender, sendResponse) {
  try {
    // Ưu tiên lấy tabId từ sender.tab để tránh phải query (có thể làm mất user gesture)
    let tabId = (sender.tab && sender.tab.id) || request.tabId || null;
    
    // Chỉ query nếu thực sự cần (tránh làm mất user gesture context)
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) tabId = activeTab.id;
    }
    
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID available' });
      return;
    }
    
    // Enable panel (không await để giữ user gesture context)
    const enablePromise = chrome.sidePanel.setOptions({
      tabId: tabId,
      enabled: true,
      path: 'modules/panel/panel.html'
    }).catch(() => {});
    
    // Gọi open() ngay lập tức (không await enablePromise) để giữ user gesture context
    // Đây là critical: phải gọi open() ngay trong user gesture context
    try {
      await chrome.sidePanel.open({ tabId: tabId });
      panelStateCache.set(tabId, true);
      // Đợi enablePromise hoàn thành (không block)
      enablePromise.catch(() => {});
      sendResponse({ success: true });
    } catch (openError) {
      // Nếu lỗi "No active side panel", đợi enablePromise rồi retry
      if (openError.message?.includes('No active side panel')) {
        console.log('[Background] Panel not ready, waiting for enable...');
        await enablePromise;
        // Retry open() - vẫn trong user gesture context (nếu còn)
        try {
          await chrome.sidePanel.open({ tabId: tabId });
          panelStateCache.set(tabId, true);
          sendResponse({ success: true });
        } catch (retryError) {
          console.error('[Background] Error opening side panel after retry:', retryError);
          // Nếu vẫn lỗi user gesture, chỉ enable panel và báo user click lại
          if (retryError.message?.includes('user gesture')) {
            sendResponse({ success: false, error: 'Panel enabled. Please click the button again.' });
          } else {
            sendResponse({ success: false, error: retryError.message });
          }
        }
      } else if (openError.message?.includes('user gesture')) {
        // Nếu lỗi user gesture ngay từ đầu, chỉ enable panel
        await enablePromise;
        sendResponse({ success: false, error: 'Panel enabled. Please click the button again.' });
      } else {
        console.error('[Background] Error opening side panel for tab:', openError);
        sendResponse({ success: false, error: openError.message });
      }
    }
  } catch (error) {
    console.error('[Background] Error in openSidePanelForTab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

