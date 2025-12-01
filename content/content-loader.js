async function syncTheme() {
  try {
    const { theme } = await chrome.storage.local.get('theme');
    const currentTheme = (theme === 'dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
  } catch (error) {
    console.warn('[Theme Sync] Failed:', error);
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

syncTheme();

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.theme) {
    syncTheme();
  }
});

class SidePanel {
  constructor() {
    this.init();
    this.isContextValid = true;
    this.checkContextValidity();
  }

  async init() {
    this.setupMessageListener();
  }

  setupMessageListener() {
  }

  // Check if extension context is still valid
  checkContextValidity() {
    try {
      // Try to access chrome.runtime.id to check if context is valid
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        this.isContextValid = true;
      } else {
        this.isContextValid = false;
      }
    } catch (error) {
      this.isContextValid = false;
    }
  }

  // Helper function to safely send messages
  async safeSendMessage(message) {
    // Check context validity first
    this.checkContextValidity();
    
    if (!this.isContextValid) {
      console.warn('[SidePanel] Extension context invalidated. Please reload the page or extension.');
      return null;
    }

    try {
      // Check if chrome.runtime is available
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        throw new Error('chrome.runtime.sendMessage is not available');
      }

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;
            // Kiểm tra các lỗi thường gặp khi Service Worker chưa sẵn sàng
            if (errorMsg && (
              errorMsg.includes('Receiving end does not exist') ||
              errorMsg.includes('Could not establish connection') ||
              errorMsg.includes('Extension context invalidated') ||
              errorMsg.includes('message port closed')
            )) {
              console.warn('[Content] Background script not ready:', errorMsg);
              resolve(null); // Trả về null thay vì reject để tránh crash
            } else {
              reject(new Error(errorMsg || 'Unknown error'));
            }
          } else {
            resolve(response);
          }
        });
      });
      return response;
    } catch (error) {
      // Check if error is due to invalidated context
      const isInvalidatedError = error.message && (
        error.message.includes('Extension context invalidated') ||
        error.message.includes('message port closed') ||
        error.message.includes('Receiving end does not exist') ||
        error.message.includes('Could not establish connection')
      );
      
      if (isInvalidatedError) {
        console.warn('[SidePanel] Extension context invalidated. The extension may have been reloaded. Please refresh the page.');
        this.isContextValid = false;
        return null;
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  async toggle() {
    console.log('[SidePanel] Sending openSidePanel (toggle) message...');
    
    try {
      const response = await this.safeSendMessage({ action: 'openSidePanel' });
      
      if (response === null) {
        // Context was invalidated, show user-friendly message
        console.warn('[SidePanel] Could not send message - extension context invalidated. Please reload the page.');
        return;
      }
      
      if (response?.success) {
        console.log('[SidePanel] Toggle message sent successfully.');
      } else {
        console.warn('[SidePanel] Toggle response indicates failure:', response);
      }
    } catch (error) {
      // Handle other errors
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('[SidePanel] Extension context invalidated. Please reload the page to continue.');
        this.isContextValid = false;
      } else {
        console.error('[SidePanel] Error sending toggle message:', error);
      }
    }
  }
}

let actionPopupIframeContainer = null;
let isDraggingPopup = false; let dragOffsetX = 0; let dragOffsetY = 0; let dragRAF = null;
let isResizingPopup = false; let resizeStartX = 0; let resizeStartY = 0;
let resizeStartWidth = 0; let resizeStartHeight = 0; let resizeRAF = null;
const MIN_POPUP_WIDTH = 450; const MIN_POPUP_HEIGHT = 550;

function showActionPopupIframe(type, selectedContent) {
  window.getSelection()?.removeAllRanges();
  if (actionPopupIframeContainer) { closeActionPopupIframe(actionPopupIframeContainer); }

  const container = document.createElement('div');
  container.className = 'ai-action-popup-iframe-container';
  const iframe = document.createElement('iframe');
  iframe.className = 'ai-action-popup-iframe';
  iframe.allow = 'clipboard-write; microphone;';

  const url = new URL(chrome.runtime.getURL('modules/contextmenu/askai/popup/popup.html'));
  url.searchParams.append('type', type);
  url.searchParams.append('text', selectedContent);

  iframe.src = url.href;
  container.appendChild(iframe);
  
  // ✅ Load shadow-dom-helper nếu chưa có
  if (typeof window.createShadowContainer !== 'function') {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('utils/shadow-dom-helper.js');
    document.head.appendChild(script);
  }
  
  // ✅ Tạo Shadow DOM container cho iframe popup
  let shadowContainer = null;
  if (typeof window.createShadowContainer === 'function') {
    shadowContainer = window.createShadowContainer({
      id: 'ai-action-popup-iframe-shadow',
      className: 'ai-action-popup-iframe-shadow-container',
      stylesheets: ['modules/contextmenu/askai/popup/popup.css']
    });
    
    // Setup theme observer
    if (typeof window.setupThemeObserver === 'function') {
      window.setupThemeObserver(shadowContainer.shadowRoot);
    }
    
    // Append container vào shadow DOM
    shadowContainer.container.appendChild(container);
    container.shadowContainer = shadowContainer; // Store reference
  } else {
    // Fallback: append trực tiếp vào body
    document.body.appendChild(container);
  }
  
  actionPopupIframeContainer = container;

  positionPopup(container);
  requestAnimationFrame(() => {
      container.classList.add('popup-visible');
      container.classList.remove('popup-hidden');
  });
}

function closeActionPopupIframe(containerToClose = null) {
  const container = containerToClose || actionPopupIframeContainer;
  if (container && container.parentNode) {
    container.classList.add('popup-hidden');
    container.classList.remove('popup-visible');
    setTimeout(() => { container.remove(); }, 200);
    if (container === actionPopupIframeContainer) { actionPopupIframeContainer = null; }
  }
}

function positionPopup(element) {
  const width = parseInt(element.style.width) || MIN_POPUP_WIDTH;
  const height = parseInt(element.style.height) || MIN_POPUP_HEIGHT;
  const x = Math.max(20, (window.innerWidth - width) / 2);
  const y = Math.max(20, (window.innerHeight - height) / 2);
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  if (!element.style.width) element.style.width = `${MIN_POPUP_WIDTH}px`;
  if (!element.style.height) element.style.height = `${MIN_POPUP_HEIGHT}px`;
}


function onPopupDragStart(iframeMouseX, iframeMouseY) {
  if (!actionPopupIframeContainer) return;
  isDraggingPopup = true;
  dragOffsetX = iframeMouseX; dragOffsetY = iframeMouseY;

  const dragOverlay = document.createElement('div'); dragOverlay.id = 'ai-drag-overlay';
  document.body.appendChild(dragOverlay);

  const throttledDrag = (e) => {
    if (!isDraggingPopup || !actionPopupIframeContainer) return;
    if (dragRAF) cancelAnimationFrame(dragRAF);
    dragRAF = requestAnimationFrame(() => {
      const newLeft = e.clientX - dragOffsetX;
      const newTop = e.clientY - dragOffsetY;
      const popupWidth = actionPopupIframeContainer.offsetWidth;
      const popupHeight = actionPopupIframeContainer.offsetHeight;
      const maxLeft = window.innerWidth - popupWidth;
      const maxTop = window.innerHeight - popupHeight;
      const finalLeft = Math.max(0, Math.min(newLeft, maxLeft));
      const finalTop = Math.max(0, Math.min(newTop, maxTop));
      actionPopupIframeContainer.style.left = `${finalLeft}px`;
      actionPopupIframeContainer.style.top = `${finalTop}px`;
    });
  };

  dragOverlay.addEventListener('mousemove', throttledDrag);
  dragOverlay.addEventListener('mouseup', onPopupDragEnd);

  const iframe = actionPopupIframeContainer.querySelector('.ai-action-popup-iframe');
  if (iframe) iframe.style.pointerEvents = 'none';
}

function onPopupDragEnd() {
  isDraggingPopup = false;
  if (dragRAF) cancelAnimationFrame(dragRAF); dragRAF = null;
  const overlay = document.getElementById('ai-drag-overlay');
  if (overlay) overlay.remove();
  const iframe = actionPopupIframeContainer?.querySelector('.ai-action-popup-iframe');
  if (iframe) iframe.style.pointerEvents = 'auto'; // Kích hoạt lại iframe
}


function onPopupResizeStart(iframeMouseX, iframeMouseY) {
  if (!actionPopupIframeContainer || isResizingPopup) return;
  isResizingPopup = true;
  const rect = actionPopupIframeContainer.getBoundingClientRect();
  resizeStartX = rect.left + iframeMouseX; resizeStartY = rect.top + iframeMouseY;
  resizeStartWidth = rect.width; resizeStartHeight = rect.height;

  const dragOverlay = document.createElement('div'); dragOverlay.id = 'ai-drag-overlay';
  dragOverlay.style.cursor = 'nwse-resize';
  document.body.appendChild(dragOverlay);

  dragOverlay.addEventListener('mousemove', throttledResize);
  dragOverlay.addEventListener('mouseup', onPopupResizeEnd);

  const iframe = actionPopupIframeContainer.querySelector('.ai-action-popup-iframe');
  if (iframe) iframe.style.pointerEvents = 'none';
}

function throttledResize(e) {
  if (!isResizingPopup || !actionPopupIframeContainer) return;
  if (resizeRAF) cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(() => {
    const deltaX = e.clientX - resizeStartX; const deltaY = e.clientY - resizeStartY;
    let newWidth = resizeStartWidth + deltaX; let newHeight = resizeStartHeight + deltaY;
    newWidth = Math.max(MIN_POPUP_WIDTH, newWidth);
    newHeight = Math.max(MIN_POPUP_HEIGHT, newHeight);
    actionPopupIframeContainer.style.width = `${newWidth}px`;
    actionPopupIframeContainer.style.height = `${newHeight}px`;
  });
}

function onPopupResizeEnd() {
  if (!isResizingPopup) return; isResizingPopup = false;
  if (resizeRAF) cancelAnimationFrame(resizeRAF); resizeRAF = null;
  const overlay = document.getElementById('ai-drag-overlay');
  if (overlay) overlay.remove();
  const iframe = actionPopupIframeContainer?.querySelector('.ai-action-popup-iframe');
  if (iframe) iframe.style.pointerEvents = 'auto'; // Kích hoạt lại iframe
}


window.addEventListener('message', (event) => {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      return;
    }
    if (event.origin !== `chrome-extension://${chrome.runtime.id}`) return;
  } catch (error) {
    // Extension context invalidated, ignore message
    return;
  }
  if (event.data) {
    switch (event.data.action) {
      case 'closeActionPopup': closeActionPopupIframe(); break;
      case 'startDragPopup': onPopupDragStart(event.data.clientX, event.data.clientY); break;
      case 'startResizePopup': onPopupResizeStart(event.data.clientX, event.data.clientY); break;
      case 'triggerScreenshot':
        if (event.data.forChat) {
          window.screenshotForChat = true;
        }
        break;
    }
  }
});

// Safely setup message listener with error handling
try {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Handle setScreenshotForChat message to set the flag
      if (request.action === 'setScreenshotForChat') {
        window.screenshotForChat = request.forChat === true;
        console.log('[Content] Set screenshotForChat flag:', window.screenshotForChat);
        sendResponse({ success: true });
        return true;
      }
      
      // Handle showActionPopup from context menu
      if (request.action === 'showActionPopup') {
        try {
          const { type, selectedText, selectedHtml } = request;
          if (type && selectedText) {
            showActionPopupIframe(type, selectedText);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Missing type or selectedText' });
          }
        } catch (error) {
          console.error('[Content] Error showing action popup:', error);
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }
      
      if (request.action === 'screenshotAreaForChat') {
        try {
          console.log('[Content] Forwarding screenshot to background.js for processing');
          
          // Check if context is still valid
          if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            console.warn('[Content] Extension context invalidated, cannot forward screenshot');
            sendResponse({ success: false, error: 'Extension context invalidated' });
            return false;
          }
          
          chrome.runtime.sendMessage({
            action: 'processScreenshotForChat',
            dataUrl: request.dataUrl,
            fileName: 'screenshot-area.png',
            fileType: 'image/png'
          }, (response) => {
            if (chrome.runtime.lastError) {
              const errorMsg = chrome.runtime.lastError.message;
              // Kiểm tra các lỗi thường gặp khi Service Worker chưa sẵn sàng
              if (errorMsg && (
                errorMsg.includes('Receiving end does not exist') ||
                errorMsg.includes('Could not establish connection') ||
                errorMsg.includes('Extension context invalidated') ||
                errorMsg.includes('message port closed')
              )) {
                console.warn('[Content] Background script not ready for screenshot:', errorMsg);
                sendResponse({ success: false, error: 'Background script not ready. Please try again.' });
                return false;
              }
              // Xử lý các lỗi khác
              console.error('[Content] Error forwarding screenshot:', errorMsg);
              sendResponse({ success: false, error: errorMsg });
            } else {
              console.log('[Content] Background processed screenshot successfully');
              sendResponse({ success: true });
            }
          });
          window.screenshotForChat = false;
          return true;
        } catch (error) {
          console.error('[Content] Error forwarding screenshot:', error);
          sendResponse({ success: false, error: error.message });
          return false;
        }
      }
      return false;
    });
  }
} catch (error) {
  console.warn('[Content] Could not setup message listener:', error);
}

// ========================================
// Translate Selection Monitor
// ========================================
const translateSelectionMonitor = {
  enabled: false,
  handler: null,
  debounceTimer: null,
  lastText: ''
};

function configureTranslateSelection(enabled) {
  if (enabled && !translateSelectionMonitor.enabled) {
    translateSelectionMonitor.handler = handleTranslateSelectionChange;
    document.addEventListener('mouseup', translateSelectionMonitor.handler);
    document.addEventListener('keyup', translateSelectionMonitor.handler);
    translateSelectionMonitor.enabled = true;
  } else if (!enabled && translateSelectionMonitor.enabled) {
    document.removeEventListener('mouseup', translateSelectionMonitor.handler);
    document.removeEventListener('keyup', translateSelectionMonitor.handler);
    translateSelectionMonitor.handler = null;
    translateSelectionMonitor.enabled = false;
    translateSelectionMonitor.lastText = '';
  }
}

function handleTranslateSelectionChange() {
  if (translateSelectionMonitor.debounceTimer) {
    clearTimeout(translateSelectionMonitor.debounceTimer);
  }
  translateSelectionMonitor.debounceTimer = setTimeout(() => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    if (!text || text === translateSelectionMonitor.lastText) return;
    translateSelectionMonitor.lastText = text;
    try {
      chrome.runtime.sendMessage({ action: 'translateSelectionChanged', text });
    } catch (error) {
      console.warn('[Content] Failed to forward selection:', error);
    }
  }, 150);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'translateSelectionMonitor') {
    configureTranslateSelection(Boolean(message.enabled));
    // Kiểm tra sendResponse có còn available và channel chưa đóng
    if (sendResponse && typeof sendResponse === 'function') {
      try {
        sendResponse({ success: true });
      } catch (error) {
        // Ignore nếu channel đã đóng
        console.debug('[Content] Selection monitor response channel closed');
      }
    }
    return false; // Không async, trả về false
  }
});

let floatingIcon = null;
let contextMenu = null;
let sidePanel = null;

function injectCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('content/css/content.css');
  document.head.appendChild(link);
}

if (window.self === window.top) {
  injectCSS();
  
  (async () => {
    try {
      const [floatingModule, contextMenuModule] = await Promise.all([
        import(chrome.runtime.getURL('content/injectors/floating-icon-injector.js')),
        import(chrome.runtime.getURL('content/injectors/context-menu-injector.js'))
      ]);
      
      const FloatingIconClass = floatingModule?.FloatingIcon;
      const ContextMenuClass = contextMenuModule?.ContextMenu;
      
      sidePanel = new SidePanel();
      
      chrome.storage.local.get(['showFloatingIcon', 'contextMenuSettings'], (data) => {
        const showFloatingIcon = data?.showFloatingIcon !== false;
        
        if (showFloatingIcon && typeof FloatingIconClass === 'function') {
          try {
            floatingIcon = new FloatingIconClass(sidePanel);
          } catch (error) {
            console.error('[ContentLoader] Error initializing FloatingIcon:', error);
          }
        }
        
        // Initialize ContextMenu regardless of settings (it will check internally)
        // This allows settings to be changed dynamically without re-injecting
        if (typeof ContextMenuClass === 'function') {
          try {
            contextMenu = new ContextMenuClass();
          } catch (error) {
            console.error('[ContentLoader] Error initializing ContextMenu:', error);
          }
        }
      });
    } catch (error) {
      console.error('[ContentLoader] Failed to load modules:', error);
    }
  })();
}

