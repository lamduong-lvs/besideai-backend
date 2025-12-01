// background/handlers/screenshot.js
// Handlers for screenshot-related actions

// These will be imported from background.js
let getLang, handleScreenshot, handleScreenshotArea, screenshotDataStore, PendingImagesDB, startRecordingSession;

const RESTRICTED_URL_SCHEMES = ['chrome://', 'edge://', 'about:', 'view-source:', 'chrome-extension://', 'devtools://'];

function isRestrictedUrl(url) {
  if (!url) return true;
  const normalized = url.toLowerCase();
  return RESTRICTED_URL_SCHEMES.some(prefix => normalized.startsWith(prefix));
}

export function initializeScreenshotHandlers(dependencies) {
  getLang = dependencies.getLang;
  handleScreenshot = dependencies.handleScreenshot;
  handleScreenshotArea = dependencies.handleScreenshotArea;
  screenshotDataStore = dependencies.screenshotDataStore;
  PendingImagesDB = dependencies.PendingImagesDB;
  startRecordingSession = dependencies.startRecordingSession; // Get the function via dependency injection
}

export async function handleContextMenuAction(request, sender, sendResponse) {
  let tabId;

  // Use tabId from request if provided (from panel), otherwise use sender.tab.id
  if (request.tabId) {
    tabId = request.tabId;
    console.log('[ScreenshotHandler] Using tabId from request:', tabId);
  } else if (sender.tab && sender.tab.id) {
    tabId = sender.tab.id;
    console.log('[ScreenshotHandler] Using tabId from sender:', tabId);
  } else {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id) {
        sendResponse({ success: false, error: getLang('errorNoActiveTab') });
        return;
      }
      tabId = activeTab.id;
      console.log('[ScreenshotHandler] Using active tabId:', tabId);
    } catch (e) {
      const errorMsg = getLang('errorQueryTab') + e.message;
      console.error("Lỗi khi query tab:", e);
      sendResponse({ success: false, error: errorMsg });
      return;
    }
  }

  // Handle screenshot actions
  if (request.type && (request.type.startsWith('screenshot-') || request.type === 'screenshot')) { 
    // Return true to indicate we will send response asynchronously
    (async () => {
      // ✅ Check feature availability (only for non-chat screenshots)
      if (!request.forChat) {
        try {
          const { checkFeatureAvailability } = await import('../../modules/features/feature-check-helper.js');
          const isAvailable = await checkFeatureAvailability('screenshot');
          if (!isAvailable) {
            sendResponse({ success: false, error: 'Screenshot feature is not available for your subscription tier' });
            return;
          }
        } catch (error) {
          console.error('[ScreenshotHandler] Error checking feature availability:', error);
          // Continue anyway if check fails
        }
      }

      let tabInfo = null;
      try {
        tabInfo = await chrome.tabs.get(tabId);
      } catch (err) {
        console.warn('[ScreenshotHandler] Unable to get tab info for screenshot:', err?.message || err);
      }
      const tabUrl = request.tabUrl || tabInfo?.url || sender.tab?.url || null;
      if (isRestrictedUrl(tabUrl)) {
        const errorMsg = getLang('errorScreenshotRestricted') || 'Không thể chụp tab này. Vui lòng chuyển sang trang khác.';
        console.warn('[ScreenshotHandler] Screenshot blocked for restricted URL:', tabUrl);
        sendResponse({ success: false, error: errorMsg });
        return;
      }
      
      const forChat = request.forChat === true; // Explicitly check for true
      const screenshotType = request.type === 'screenshot' ? 'screenshot-visible' : request.type;
      console.log('[ScreenshotHandler] Screenshot request:', { type: screenshotType, forChat, tabId });
      
      try {
        if (forChat) {
          await chrome.tabs.sendMessage(tabId, { 
            action: 'setScreenshotForChat', 
            forChat: true 
          }).catch(() => {});
        }
        await handleScreenshot(screenshotType, tabId, forChat);
        // Send success response
        sendResponse({ success: true });
      } catch (error) {
        console.error('[ScreenshotHandler] Error handling screenshot:', error);
        sendResponse({ success: false, error: error.message || 'Failed to capture screenshot' });
      }
    })();
    return true; // Indicate we will send response asynchronously
  }
  // Handle search action - open Google search in new tab
  else if (request.type === 'search') { 
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(request.selectedText)}`; 
    await chrome.tabs.create({ url: searchUrl }); 
  }
  // Handle chat, translate actions - show popup
  else if (request.type === 'chat' || request.type === 'translate') {
    await chrome.tabs.sendMessage(tabId, { 
      action: 'showActionPopup', 
      type: request.type, 
      selectedText: request.selectedText, 
      selectedHtml: request.selectedHtml || request.selectedText
    });
  }
  // Unknown action type
  else {
    console.warn('[ScreenshotHandler] Unknown action type:', request.type);
  }
  sendResponse({ success: true });
}

export async function handleScreenshotAreaSelected(request, sender, sendResponse) {
  if (!sender.tab || !sender.tab.id) {
    sendResponse({ success: false, error: 'No tab ID available' });
    return;
  }
  // Ensure forChat is passed correctly from request.data
  const forChat = request.data?.forChat === true;
  console.log('[ScreenshotHandler] handleScreenshotAreaSelected:', { 
    forChat, 
    tabId: sender.tab.id,
    hasData: !!request.data
  });
  await handleScreenshotArea({ ...request.data, forChat }, sender.tab.id); 
  sendResponse({ success: true }); 
}

export async function handleProcessScreenshotForChat(request, sender, sendResponse) {
  try {
    const { dataUrl, fileName, fileType } = request;
    if (!dataUrl) {
      sendResponse({ success: false, error: 'No dataUrl provided' });
      return;
    }
    
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageData = {
      id: imageId,
      dataUrl: dataUrl,
      fileName: fileName || 'screenshot.png',
      fileType: fileType || 'image/png',
      timestamp: Date.now()
    };
    
    const existingImages = await PendingImagesDB.getAll();
    const allImages = [...existingImages, imageData];
    
    await PendingImagesDB.saveAll(allImages);
    console.log('[Background] Saved image to PendingImagesDB:', imageId);
    
    try {
      await chrome.runtime.sendMessage({
        action: 'newImagePending',
        imageId: imageId
      });
      console.log('[Background] Sent newImagePending message to panel');
    } catch (msgError) {
      console.warn('[Background] Failed to send message to panel:', msgError);
    }
    
    sendResponse({ success: true, imageId: imageId });
  } catch (error) {
    console.error('[Background] Error processing screenshot for chat:', error);
    sendResponse({ success: false, error: error.message });
  }
}

export function handleGetScreenshotData(request, sender, sendResponse) {
  const data = screenshotDataStore.get(request.id);
  sendResponse(data || null);
}

export async function handleStartRecording(request, sender, sendResponse) {
    try {
        // Kiểm tra startRecordingSession có sẵn không
        if (typeof startRecordingSession !== 'function') {
            const errorMsg = 'startRecordingSession is not available.';
            console.error('[ScreenshotHandler]', errorMsg);
            sendResponse({ success: false, error: errorMsg });
            return;
        }
        
        // Xác định tabId: ưu tiên từ sender.tab, nếu không có thì lấy active tab
        let tabId = null;
        
        if (sender && sender.tab && sender.tab.id) {
            // Gọi từ content script hoặc extension page có tab
            tabId = sender.tab.id;
            console.log('[ScreenshotHandler] Using sender tab ID:', tabId);
        } else {
            // Gọi từ popup hoặc extension page không có tab - lấy active tab
            try {
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (activeTab && activeTab.id) {
                    tabId = activeTab.id;
                    console.log('[ScreenshotHandler] Using active tab ID (popup/extension page):', tabId);
                } else {
                    throw new Error('No active tab found');
                }
            } catch (error) {
                const errorMsg = 'Cannot start recording: No active tab available. Please open a tab first.';
                console.error('[ScreenshotHandler]', errorMsg, error);
                sendResponse({ success: false, error: errorMsg });
                return;
            }
        }
        
        if (!tabId) {
            const errorMsg = 'Cannot start recording: Unable to determine target tab.';
            console.error('[ScreenshotHandler]', errorMsg);
            sendResponse({ success: false, error: errorMsg });
            return;
        }
        
        console.log('[ScreenshotHandler] Received startRecording request with settings:', request.settings, 'tabId:', tabId);
        
        // ✅ CHỈ MỞ TAB RECORDER SETUP, KHÔNG CHỌN MÀN HÌNH NGAY
        // User sẽ xem lại cài đặt và bấm "Bắt đầu ghi hình" trong tab recorder
        // Lưu settings vào storage để tab recorder đọc
        await chrome.storage.local.set({ 
            recorderSettings: request.settings,
            recorderPendingStart: true // Flag để tab recorder biết cần tự động hiển thị setup
        });
        
        // Mở tab recorder
        const recorderUrl = chrome.runtime.getURL('modules/screenshot/recorder-tab.html');
        const recorderTab = await chrome.tabs.create({ url: recorderUrl, active: true });
        
        console.log('[ScreenshotHandler] Opened recorder tab for setup:', recorderTab.id);
        
        // Trả về success với recorderTabId
        sendResponse({ success: true, recorderTabId: recorderTab.id, message: 'Recorder tab opened for setup' });
        return;
        
        if (!result) {
            // User cancelled or no result
            console.log('[ScreenshotHandler] Recording cancelled or no result');
            sendResponse({ success: false, cancelled: true, message: 'User cancelled selection.' });
            return;
        }
        
        if (result.success && result.streamId) {
            // Send the streamId back to the tab so it can start getUserMedia immediately.
            console.log('[ScreenshotHandler] Recording initiated successfully, streamId:', result.streamId);
            sendResponse({ success: true, streamId: result.streamId, message: 'Recording initiated.' });
        } else if (result.cancelled) {
            // User cancelled
            console.log('[ScreenshotHandler] User cancelled selection');
            sendResponse({ success: false, cancelled: true, message: 'User cancelled selection.' });
        } else {
            // Unknown error
            const errorMsg = result.error || 'Unknown error occurred during recording setup.';
            console.error('[ScreenshotHandler] Recording failed:', errorMsg);
            sendResponse({ success: false, error: errorMsg });
        }
    } catch (error) {
        const errorMsg = error?.message || 'Unknown error occurred.';
        console.error('[ScreenshotHandler] Error during startRecordingSession:', error);
        sendResponse({ success: false, error: errorMsg });
    }
}
