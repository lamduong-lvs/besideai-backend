// event-listeners.js
// Event listeners setup

import { stateManager } from '../storage/state-manager.js';
import { enhancedStorageManager } from '../utils/panel-utils.js';
import { createNewConversation } from '../storage/conversation-utils.js';
import {
  handleGmailBtn,
  setComposeGmailMode,
  setGmailContextSummary
} from '../controllers/gmail-controller.js';
import { handleRecBtn, initializeRecordPanel } from '../controllers/recorder-controller.js';
import {
  loadConversation as chatLoadConversation,
  handleNewChat as chatHandleNewChat,
  updateConversationTitle,
  updateGreetingVisibility,
  updateGreetingWithUserName
} from '../chat/chat-ui.js';
import { auth } from '../../auth/auth.js';
import {
  handleScreenshotAction,
  hidePanelForScreenshot,
  showPanelAfterScreenshot,
  handleScreenshotForChat
} from '../handlers/screenshot.js';
import {
  fileToDataURL
} from '../handlers/file.js';
import { processCropImage } from '../media/image-processor.js';
import { showImagePreview } from '../ui/preview.js';
import { setActiveSidebarButton, updateSidebarActiveState } from '../ui/sidebar.js';
import { setupResizeHandle } from '../ui/resize.js';
import { setupScrollToBottomButton } from '../ui/scroll.js';
import { removeBrowserTooltips } from '../ui/tooltips.js';
// handleInputResize import removed
import { updateDefaultModelName } from '../utils/model.js';
import { showError, showInfo, showSuccess } from '../utils/toast.js';
import { applyPanelModeLayout } from '../ui/mode-layout.js';
import { focusTranslateInput, resetTranslatePanel } from '../../translate/translate-panel.js';
import { initializeGmailInput, switchToGmailInput } from '../controllers/gmail-controller.js';
import { switchToChatInput, switchToPdfChatInput } from '../input-integration.js';
import { handleSendMessage } from '../chat/chat-send.js';
import { handleCopyMessage, handleEditMessage, handleRegenerateMessage } from '../chat/message-actions.js';
import { renderMessage } from '../chat/chat-ui.js';

/**
 * Setup main chat input với onSubmit callback
 */
export function setupChatInput() {
  // Tạo action handlers object
  const actionHandlers = {
    handleCopyMessage,
    handleEditMessage,
    handleRegenerateMessage
  };

  // Wrapper for renderMessage with action handlers
  const renderMessageWithHandlers = async (message, Lang, showError, showSuccess) => {
    return await renderMessage(message, Lang, showError, showSuccess, actionHandlers);
  };

  // Helper function để gọi handleSendMessage
  const handleChatSubmit = async (value) => {
    try {
      console.log('[EventListeners] handleChatSubmit called with value:', value ? value.substring(0, 50) : 'empty');
      const Lang = window.Lang || { get: (key) => `[${key}]` };
      const { showError, showSuccess } = await import('../utils/toast.js');
      const { getComposeGmailMode, getGmailContextSummary } = await import('../controllers/gmail-controller.js');
      
      const composeMode = typeof getComposeGmailMode === 'function' ? getComposeGmailMode() : false;
      const contextSummary = typeof getGmailContextSummary === 'function' ? getGmailContextSummary() : '';
      
      // Truyền value vào handleSendMessage để tránh lấy từ input đã bị clear
      await handleSendMessage(composeMode, contextSummary, Lang, showError, showSuccess, renderMessageWithHandlers, actionHandlers, value);
    } catch (error) {
      console.error('[EventListeners] Error in handleChatSubmit:', error);
      const { showError } = await import('../utils/toast.js');
      const Lang = window.Lang || { get: (key) => `[${key}]` };
      showError(Lang.get("errorGenericPrefix", { error: error.message }) || `Lỗi: ${error.message}`);
    }
  };

  // Chuyển sang input main chat với onSubmit callback
  console.log('[EventListeners] Calling switchToChatInput...');
  const chatInput = switchToChatInput({
    onSubmit: handleChatSubmit
  });

  if (chatInput) {
    console.log('[EventListeners] Main chat input initialized');
    console.log('[EventListeners] Chat input container:', document.getElementById('chat-input-container'));
    window.chatInput = chatInput;
    
    // Setup toolbar action listeners (history, newChat buttons)
    setupMainChatToolbarListeners();
    
    // Update model name for main chat input
    setTimeout(async () => {
      try {
        const { updateDefaultModelName } = await import('../utils/model.js');
        await updateDefaultModelName();
      } catch (error) {
        console.error('[EventListeners] Failed to update model name:', error);
      }
    }, 200);
  } else {
    console.error('[EventListeners] Failed to initialize main chat input');
  }
}

// Store the handler function to allow removal
let mainChatToolbarActionHandler = null;

/**
 * Setup event listeners for main chat toolbar actions (history, newChat)
 * Only setup once to avoid duplicate event listeners
 */
function setupMainChatToolbarListeners() {
  // If already setup, remove old listener first
  if (mainChatToolbarActionHandler) {
    document.removeEventListener('input:toolbar-action', mainChatToolbarActionHandler);
    mainChatToolbarActionHandler = null;
  }
  
  // Create named handler function
  mainChatToolbarActionHandler = async (event) => {
    const { type, containerId, action } = event.detail;
    
    // Only handle events from Main Chat input
    if (type !== 'chat' || containerId !== 'chat-input-container') {
      return;
    }
    
    console.log('[Main Chat] Toolbar action:', action);
    
    // Handle history button click
    if (action === 'history') {
      try {
        const Lang = window.Lang || { get: (key) => `[${key}]` };
        const { showError } = await import('../utils/toast.js');
        const { renderMessage } = await import('../chat/chat-ui.js');
        const { openHistoryPanel } = await import('../controllers/history-controller.js');
        if (typeof openHistoryPanel === 'function') {
          await openHistoryPanel(Lang, showError, renderMessage);
        } else {
          console.error('[Main Chat] openHistoryPanel function not found');
        }
      } catch (error) {
        console.error('[Main Chat] Error opening history panel:', error);
      }
      return;
    }
    
    // Handle crop button click
    if (action === 'crop') {
      try {
        const Lang = window.Lang || { get: (key) => `[${key}]` };
        const { handleCropImage } = await import('../handlers/screenshot.js');
        if (typeof handleCropImage === 'function') {
          await handleCropImage(Lang);
        } else {
          console.error('[Main Chat] handleCropImage function not found');
        }
      } catch (error) {
        console.error('[Main Chat] Error handling crop image:', error);
      }
      return;
    }
    
    // Handle newChat button click
    if (action === 'newChat') {
      try {
        const Lang = window.Lang || { get: (key) => `[${key}]` };
        const { showError, showSuccess } = await import('../utils/toast.js');
        const { auth } = await import('../../auth/auth.js');
        const { updateDefaultModelName } = await import('../utils/model.js');
        const { handleNewChat } = await import('../chat/chat-state.js');
        if (typeof handleNewChat === 'function') {
          await handleNewChat(Lang, showError, showSuccess, auth, updateDefaultModelName);
        } else {
          console.error('[Main Chat] handleNewChat function not found');
        }
      } catch (error) {
        console.error('[Main Chat] Error handling new chat:', error);
      }
      return;
    }
  };
  
  // Add event listener
  document.addEventListener('input:toolbar-action', mainChatToolbarActionHandler);
  console.log('[Main Chat] Toolbar action listeners setup complete');
  
  // Listen for attachments-added event from input module
  document.addEventListener('input:attachments-added', async (event) => {
    const { type, containerId, attachments } = event.detail;
    
    // Only handle events from Main Chat input
    if (type !== 'chat' || containerId !== 'chat-input-container') {
      return;
    }
    
    console.log('[Main Chat] Attachments added:', attachments);
    
    try {
      const { fileToDataURL } = await import('../handlers/file.js');
      const { processCropImage } = await import('../media/image-processor.js');
      const { showImagePreview } = await import('../ui/preview.js');
      const { showError } = await import('../utils/toast.js');
      const { PendingImagesDB } = await import('../storage/pending-images-db.js');
      const Lang = window.Lang || { get: (key) => `[${key}]` };
      
      if (!window.pendingImages) {
        window.pendingImages = [];
      }
      
      // Process each attachment
      for (const attachment of attachments) {
        if (attachment.file) {
          // Convert file to data URL
          const dataUrl = await fileToDataURL(attachment.file);
          
          if (attachment.file.type.startsWith('image/')) {
            // Process image as crop image (adds to pendingImages)
            await processCropImage(
              dataUrl,
              attachment.file.name,
              attachment.file.type,
              showError,
              Lang,
              showImagePreview
            );
          } else {
            // Non-image file - add to pendingImages as attached file
            const fileData = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              dataUrl: dataUrl,
              fileName: attachment.file.name,
              fileType: attachment.file.type,
              size: attachment.file.size
            };
            
            window.pendingImages.push(fileData);
            
            // Save to IndexedDB
            await PendingImagesDB.saveAll(window.pendingImages);
            
            // Show preview
            showImagePreview();
          }
        }
      }
    } catch (error) {
      console.error('[Main Chat] Error processing attachments:', error);
      const { showError } = await import('../utils/toast.js');
      showError(error.message || 'Lỗi khi xử lý file đính kèm');
    }
  });
}

export function setupEventListeners(Lang) {
  console.log('[EventListeners] Setting up event listeners...');

  const expandBtn = document.getElementById('expandBtn');
  if (expandBtn) {
    console.log('[EventListeners] Found expandBtn, attaching listener');
    expandBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://lavasa.vn' });
    });
  } else {
    console.warn('[EventListeners] expandBtn not found!');
  }
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      try {
        const settingUrl = chrome.runtime.getURL('setting/setting.html');
        if (!settingUrl) {
          throw new Error(Lang.get("errorGetSettingsUrl"));
        }
        chrome.tabs.create({ url: settingUrl });
        chrome.runtime.sendMessage({ action: 'closeSidePanel' }).catch(() => { });
      } catch (error) {
        console.error('[Panel] Failed to open settings tab:', error);
        if (error.message.includes('Extension context invalidated')) {
          showError(Lang.get("errorExtContext"));
        } else {
          showError(Lang.get("errorOpenSettings", { error: error.message }));
        }
      }
    });
  }
  setTimeout(() => {
    const screenshotBtn = document.getElementById('screenshotBtn');
    const screenshotDropdown = document.getElementById('screenshotDropdown');
    if (screenshotBtn && screenshotDropdown) {
      console.log('[EventListeners] Found screenshotBtn and dropdown, attaching listeners');
      screenshotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        screenshotDropdown.classList.toggle('show');
      });
      document.addEventListener('click', (e) => {
        if (!screenshotBtn.contains(e.target) && !screenshotDropdown.contains(e.target)) {
          screenshotDropdown.classList.remove('show');
        }
      });
      const dropdownItems = screenshotDropdown.querySelectorAll('.dropdown-item');
      dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = e.currentTarget.dataset.action;
          screenshotDropdown.classList.remove('show');
          handleScreenshotAction(action, Lang);
        });
      });
    }
  }, 200);
  const gmailBtn = document.getElementById('gmailBtn');
  if (gmailBtn) {
    console.log('[EventListeners] Found gmailBtn, attaching listener');
    gmailBtn.addEventListener('click', async () => {
      updateSidebarActiveState('gmail');
      applyPanelModeLayout('gmail');
      try {
        await handleGmailBtn(Lang, showError, chatLoadConversation);
      } catch (error) {
        console.error('[EventListeners] Gmail button handler error:', error);
      }
    });
  } else {
    console.warn('[EventListeners] gmailBtn not found!');
  }

  const translateBtn = document.getElementById('translateBtn');
  if (translateBtn) {
    console.log('[EventListeners] Found translateBtn, attaching listener');
    translateBtn.addEventListener('click', async () => {
      try {
        updateSidebarActiveState('translate');
        applyPanelModeLayout('translate');
        resetTranslatePanel();
        focusTranslateInput();
      } catch (error) {
        console.error('[EventListeners] Failed to activate translate mode:', error);
        showError(error.message || 'Không thể mở chế độ dịch.');
      }
    });
  } else {
    console.warn('[EventListeners] translateBtn not found!');
  }

  const pdfChatBtn = document.getElementById('pdfChatBtn');
  if (pdfChatBtn) {
    console.log('[EventListeners] Found pdfChatBtn, attaching listener');
    pdfChatBtn.addEventListener('click', async () => {
      try {
        updateSidebarActiveState('pdfChat');
        applyPanelModeLayout('pdfChat');
        // Initialize PDF Chat module
        if (typeof window.initPDFChat === 'function') {
          await window.initPDFChat();
        }
        // Chuyển sang input pdf chat
        switchToPdfChatInput();
      } catch (error) {
        console.error('[EventListeners] Failed to activate PDF Chat mode:', error);
        showError(error.message || 'Không thể mở chế độ PDF Chat.');
      }
    });
  } else {
    console.warn('[EventListeners] pdfChatBtn not found!');
  }
  const recBtn2 = document.getElementById('recBtn');
  if (recBtn2) {
    console.log('[EventListeners] Found recBtn, attaching listener');
    recBtn2.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRecBtn();
    });
  } else {
    console.warn('[EventListeners] recBtn not found!');
  }
  setTimeout(() => {
    const videoBtn = document.getElementById('videoBtn');
    const videoDropdown = document.getElementById('videoDropdown');
    if (videoBtn && videoDropdown) {
      videoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        videoDropdown.classList.toggle('show');
      });
      document.addEventListener('click', (e) => {
        if (!videoBtn.contains(e.target) && !videoDropdown.contains(e.target)) {
          videoDropdown.classList.remove('show');
        }
      });
      const videoDropdownItems = videoDropdown.querySelectorAll('.dropdown-item');
      videoDropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = e.currentTarget.dataset.action;
          videoDropdown.classList.remove('show');
          if (action === 'record-screen') {
            chrome.storage.local.set({ startupTab: 'capture-panel' }, () => {
              chrome.runtime.sendMessage({ action: 'openRecorderPopup' });
            });
            chrome.runtime.sendMessage({ action: 'closeSidePanel' }).catch(() => { });
          } else if (action === 'record-meet') {
            showInfo(Lang.get("infoFeatureDev"));
          }
        });
      });
    }
  }, 200);
  window.addEventListener('message', (event) => {
    if (event.data.action === 'screenshotStarted') {
      hidePanelForScreenshot();
    } else if (event.data.action === 'screenshotCompleted' || event.data.action === 'screenshotCancelled') {
      showPanelAfterScreenshot();
    } else if (event.data.action === 'screenshotAreaForChat') {
      handleScreenshotForChat(event.data.dataUrl, Lang);
    }
  });
  // Setup user popup toggle - delay to ensure DOM is ready
  setTimeout(() => {
    const userBtn = document.getElementById('userBtn');
    const userPopup = document.getElementById('userPopup');
    if (userBtn && userPopup) {
      console.log('[EventListeners] Setting up user popup toggle');
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const isShowing = userPopup.classList.contains('show');
        if (isShowing) {
          userPopup.classList.remove('show');
        } else {
          userPopup.classList.add('show');
        }
        console.log('[EventListeners] User popup toggled, showing:', !isShowing);
      });
      
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (userPopup.classList.contains('show')) {
          if (!userBtn.contains(e.target) && !userPopup.contains(e.target)) {
            userPopup.classList.remove('show');
            console.log('[EventListeners] User popup closed (outside click)');
          }
        }
      });
    } else {
      console.warn('[EventListeners] User button or popup not found:', { userBtn: !!userBtn, userPopup: !!userPopup });
    }
  }, 500); // Increase delay to ensure UserMenu is rendered
  document.getElementById('webSummaryBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoWebSummaryDev"));
  });
  document.getElementById('webTranslateBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoWebTranslateDev"));
  });
  document.getElementById('feature3Btn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeature3Dev"));
  });
  document.getElementById('feature4Btn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeature4Dev"));
  });
  document.getElementById('feature5Btn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeature5Dev"));
  });
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.userLang && window.Lang) {
      const newLangCode = changes.userLang.newValue;
      const currentLang = window.Lang.getCurrentLanguage();
      if (newLangCode && newLangCode !== currentLang) {
        try {
          const langUrl = chrome.runtime.getURL(`lang/${newLangCode}.json`);
          const response = await fetch(langUrl);
          if (!response.ok) throw new Error(`Không thể tải ${newLangCode}.json`);
          const newStrings = await response.json();
          window.Lang.currentLang = newLangCode;
          window.Lang.strings = newStrings;
          document.documentElement.lang = newLangCode;
          window.Lang.applyToDOM();
          setTimeout(() => {
            removeBrowserTooltips();
          }, 50);
          console.log(`[Panel] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
        } catch (error) {
          console.error('[Panel] Lỗi khi cập nhật ngôn ngữ:', error);
        }
      }
    }
  });
  document.getElementById('fullScreenChatBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeatureDev"));
  });
  document.getElementById('deepResearchBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeatureDev"));
  });
  document.getElementById('highlightsBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeatureDev"));
  });
  document.getElementById('aiSlidesBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeatureDev"));
  });
  document.getElementById('beginnerGuideBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeatureDev"));
  });
  const chatBtn = document.getElementById('chatBtn');
  if (chatBtn) {
    console.log('[EventListeners] Found chatBtn, attaching listener');
    chatBtn.addEventListener('click', async () => {
      const currentPanelMode = stateManager.getPanelMode();
      console.log('[Panel] Chat button clicked, current panelMode:', currentPanelMode);
      if (currentPanelMode === 'gmail' && enhancedStorageManager.currentConversationId) {
        console.log('[Panel] Saving Gmail conversation:', enhancedStorageManager.currentConversationId);
        await stateManager.setCurrentConversationId(enhancedStorageManager.currentConversationId, 'gmail');
      }
      await stateManager.setPanelMode('chat');
      setComposeGmailMode(false);
      setGmailContextSummary('');
      console.log('[Panel] Switched to chat mode');
      const messagesContainer = document.getElementById('messagesContainer');
      if (messagesContainer) {
        const messageElements = messagesContainer.querySelectorAll('.message');
        console.log('[Panel] Removing', messageElements.length, 'existing messages');
        messageElements.forEach(msg => msg.remove());
        const loadingMsg = messagesContainer.querySelector('.loading-message');
        if (loadingMsg) {
          console.log('[Panel] Removing loading message');
          loadingMsg.remove();
        }
      }
      const chatConversationId = stateManager.getCurrentConversationId();
      console.log('[Panel] currentConversationId_chat from state:', chatConversationId);
      if (chatConversationId) {
        console.log('[Panel] Loading chat conversation:', chatConversationId);
        enhancedStorageManager.currentConversationId = chatConversationId;
        // Create action handlers for loadConversation
        const actionHandlers = {
          handleCopyMessage,
          handleEditMessage,
          handleRegenerateMessage
        };
        const renderMessageWithHandlers = async (message, Lang, showError, showSuccess) => {
          return await renderMessage(message, Lang, showError, showSuccess, actionHandlers);
        };
        await chatLoadConversation(Lang, showError, renderMessageWithHandlers, actionHandlers);
      } else {
        console.log('[Panel] No currentConversationId_chat found, creating new conversation');
        await createNewConversation('chat');
        if (enhancedStorageManager.currentConversationId) {
          console.log('[Panel] Created new chat conversation:', enhancedStorageManager.currentConversationId);
          updateConversationTitle('', Lang);
          updateGreetingVisibility();
          updateGreetingWithUserName(auth);
        }
      }
      const headerTitle = document.querySelector('.header-title');
      if (headerTitle) {
        headerTitle.textContent = (Lang.get && Lang.get('newConversationTitle')) ? Lang.get('newConversationTitle') : 'Cuộc hội thoại mới';
        console.log('[Panel] Header title updated to:', headerTitle.textContent);
      }
      applyPanelModeLayout('chat');
      
      // Setup và chuyển sang input main chat
      setupChatInput();
      
      setActiveSidebarButton('chatBtn');
      // Chat input removed - không còn focus chat input
    });
  }
  // recBtn is already handled above (line 158-167) with handleRecBtn()
  document.getElementById('agentBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeatureDev"));
  });
  document.getElementById('writeBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeatureDev"));
  });
  document.getElementById('ocrBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeatureDev"));
  });
  document.getElementById('grammarBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeatureDev"));
  });
  document.getElementById('askBtn')?.addEventListener('click', () => {
    // Focus vào input từ module input mới
    const inputManager = window.inputManager;
    if (inputManager) {
      const activeInput = inputManager.getCurrent();
      if (activeInput) {
        activeInput.focus();
      }
    }
  });
  document.getElementById('moreBtn')?.addEventListener('click', () => {
    showInfo(Lang.get("infoFeatureDev"));
  });
  document.getElementById('modelSelector')?.addEventListener('click', () => {
    showInfo('Model selector - Coming soon');
  });
  document.getElementById('scissorsBtn')?.addEventListener('click', () => {
    showInfo('Scissors - Coming soon');
  });
  if (!window.pendingImages) {
    window.pendingImages = [];
  }
  showImagePreview();
  // Legacy attachBtn and fileInput listeners removed - handled by input module

  document.getElementById('bookBtn')?.addEventListener('click', () => {
    showInfo('Book - Coming soon');
  });
  document.getElementById('filterBtn')?.addEventListener('click', () => {
    showInfo('Filter - Coming soon');
  });
  document.getElementById('clockBtn')?.addEventListener('click', () => {
    showInfo('Clock - Coming soon');
  });
  // Note: newChatBtn is handled in chat-ui.js, no need to handle it here
  // If plusChatBtn exists in the future, add it here
  const thinkBtn = document.getElementById('thinkBtn');
  const deepResearchBtn = document.getElementById('deepResearchBtn');
  if (thinkBtn) {
    thinkBtn.addEventListener('click', () => {
      thinkBtn.classList.toggle('active');
      if (thinkBtn.classList.contains('active')) {
        deepResearchBtn?.classList.remove('active');
      }
      showInfo('Think mode - Coming soon');
    });
  }
  if (deepResearchBtn) {
    deepResearchBtn.addEventListener('click', () => {
      deepResearchBtn.classList.toggle('active');
      if (deepResearchBtn.classList.contains('active')) {
        thinkBtn?.classList.remove('active');
      }
      showInfo('Deep Research - Coming soon');
    });
  }
  document.getElementById('giftBtn')?.addEventListener('click', () => {
    showInfo('Gift - Coming soon');
  });
  document.getElementById('heartBtn')?.addEventListener('click', () => {
    showInfo('Heart - Coming soon');
  });
  document.getElementById('helpBtn')?.addEventListener('click', () => {
    showInfo('Help - Coming soon');
  });
  document.getElementById('downBtn')?.addEventListener('click', () => {
    showInfo('More options - Coming soon');
  });
  updateGreetingVisibility();
  setupResizeHandle();
  setTimeout(() => {
    setupScrollToBottomButton();
  }, 100);
}
