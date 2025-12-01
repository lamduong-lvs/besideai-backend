import { updateSidebarActiveState } from './ui/sidebar.js';
import { removeBrowserTooltips } from './ui/tooltips.js';
import { showImagePreview } from './ui/preview.js';
import { resetPanelVisibilityStyles } from './handlers/screenshot.js';
import { applyPanelModeLayout } from './ui/mode-layout.js';
import { initializeTranslatePanel, focusTranslateInput, resetTranslatePanel } from '../translate/translate-panel.js';
import '../pdf-chat/pdf-chat.js'; // Import to register window.initPDFChat
import { initializeGmailInput, switchToGmailInput } from './controllers/gmail-controller.js';
import { getCurrentMode } from './input-integration.js';

// Handlers
import { setupAuthListeners } from './handlers/auth.js';
// Legacy input handlers removed - now handled by modules/input
import { restorePendingImages } from './handlers/file.js';
import { setupPanelMessageListener } from './handlers/message.js';
import { handleCropImage, handleScreenshotForChat } from './handlers/screenshot.js';

// Init
import { initializeApp } from './init/app-init.js';
import { setupEventListeners } from './init/event-listeners.js';
import { auth } from '../auth/auth.js';

// Storage & State
import { stateManager } from './storage/state-manager.js';
import { enhancedStorageManager, apiManager } from './utils/panel-utils.js';

// Utils
import { showError, showSuccess, showInfo } from './utils/toast.js';
import { updateDefaultModelName } from './utils/model.js';

// Chat
import {
  renderMessage,
  createLoadingMessage,
  updateGreetingVisibility
} from './chat/chat-ui.js';
import { loadConversation as chatLoadConversation } from './chat/chat-state.js';
import {
  handleCopyMessage,
  handleEditMessage,
  handleRegenerateMessage
} from './chat/message-actions.js';
import { initializeChatUI } from './chat/chat-ui.js';

// Controllers
import { initializeSettingsPanel } from './controllers/settings-controller.js';
import { initializeHistoryPanel, openHistoryPanel } from './controllers/history-controller.js';
import { initializeRecordPanel } from './controllers/recorder-controller.js';
import {
  getComposeGmailMode,
  getGmailContextSummary,
  setComposeGmailMode,
  updateHeaderForGmailCompose,
  setGmailContextSummary,
  renderGmailSummaryInPanel
} from './controllers/gmail-controller.js';

// Media
import { setupSpeechRecognition, handleMicClick } from './media/speech.js';

const Lang = window.Lang || {
  get: (key) => `[${key}]`,
  applyToDOM: () => { }
};

// Add toast styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  @keyframes slideDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

async function handleRegenerateLastMessage() {
  try {
    const conversationId = await stateManager.getCurrentConversationId();
    if (!conversationId) {
      showError(Lang.get("errorNoConversation") || 'Không có cuộc hội thoại');
      return;
    }

    const conversation = await enhancedStorageManager.getConversation(conversationId);
    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
      showInfo(Lang.get("infoNoMessages") || 'Không có tin nhắn để regenerate');
      return;
    }

    // Find the last assistant message (using reverse find for compatibility)
    let lastAIMessageIndex = -1;
    let lastAIMessage = null;
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'assistant') {
        lastAIMessageIndex = i;
        lastAIMessage = conversation.messages[i];
        break;
      }
    }

    if (lastAIMessageIndex === -1 || !lastAIMessage) {
      showInfo(Lang.get("infoNoAIMessage") || 'Không có phản hồi AI để regenerate');
      return;
    }

    // Find the message element in DOM
    const messageEl = document.querySelector(`[data-message-id="${lastAIMessage.id}"]`);
    if (!messageEl) {
      showError(Lang.get("errorMessageNotFound") || 'Không tìm thấy tin nhắn');
      return;
    }

    // Remove the assistant message from conversation
    conversation.messages = conversation.messages.slice(0, lastAIMessageIndex);
    await enhancedStorageManager.saveConversation(conversation);

    // Remove message element from DOM
    messageEl.remove();

    // Now resend the last user message to regenerate
    // Find the last user message (should be right before the removed assistant message)
    const lastUserMessage = conversation.messages[conversation.messages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      showError(Lang.get("errorCannotRegenerate") || 'Không thể regenerate: không tìm thấy tin nhắn user');
      return;
    }

    // Create loading message
    const loadingEl = createLoadingMessage(Lang);

    // Send to background for AI processing
    try {
      // Get AI config
      const aiConfigResponse = await chrome.runtime.sendMessage({ action: 'getAIConfig' });
      if (!aiConfigResponse || !aiConfigResponse.success) {
        throw new Error(aiConfigResponse?.error?.message || 'Failed to get AI config');
      }
      const config = aiConfigResponse.config;

      // Prepare messages for API
      const messagesForAPI = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        images: msg.images,
        attachedFiles: msg.attachedFiles
      }));

      // Prepare images and attachedFiles from last user message
      const images = lastUserMessage.images || [];
      const attachedFiles = lastUserMessage.attachedFiles || [];

      let response;
      try {
        response = await chrome.runtime.sendMessage({
          action: 'processActionStream',
          messages: messagesForAPI,
          images: images.length > 0 ? images.map(img => img.dataUrl || img) : undefined,
          attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined,
          config: config
        });

        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message || 'Extension runtime error');
        }
      } catch (sendError) {
        console.error('[Panel] Error sending regenerate message:', sendError);
        throw sendError;
      }

      // Remove loading message
      if (loadingEl) {
        loadingEl.remove();
      }

      if (!response) {
        showError(Lang.get('errorSendMessage', { error: 'Không nhận được phản hồi từ server' }) || 'Không nhận được phản hồi từ server');
        return;
      }

      if (response.success) {
        // Create assistant message
        const assistantMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: response.result,
          timestamp: new Date().toISOString()
        };

        // Add to conversation
        conversation.messages.push(assistantMessage);
        await enhancedStorageManager.saveConversation(conversation);

        // Render assistant message
        // Use renderMessage from chat-ui.js if available
        if (renderMessage) {
          const actionHandlers = {
            handleCopyMessage,
            handleEditMessage,
            handleRegenerateMessage
          };
          await renderMessage(assistantMessage, Lang, showError, showSuccess, actionHandlers);
          updateGreetingVisibility();
        } else {
          console.error('[Panel] renderMessage function not available');
          showError('Không thể hiển thị tin nhắn');
        }
      } else {
        // Extract error message
        let errorMessage = 'Lỗi không xác định';
        if (response.error) {
          if (typeof response.error === 'string') {
            errorMessage = response.error;
          } else if (response.error.message) {
            errorMessage = response.error.message;
          }
        }
        showError(errorMessage);
      }
    } catch (error) {
      // Remove loading message
      if (loadingEl) {
        loadingEl.remove();
      }
      console.error('[Panel] Error regenerating message:', error);
      showError(Lang.get("errorGenericPrefix", { error: error.message }) || `Lỗi: ${error.message}`);
    }
  } catch (error) {
    console.error('[Panel] Failed to regenerate last message:', error);
    showError(Lang.get("errorGenericPrefix", { error: error.message }) || `Lỗi: ${error.message}`);
  }
}

// Utils modules are now imported statically at the top
// This matches how background.js imports them successfully
console.log('[Panel] ✓ apiManager and storageManager imported statically');

// Initialize panel
// ===========================
// PDF CHAT MODULE
// ===========================
// Initialize panel
// ===========================
// PDF CHAT MODULE
// ===========================
// PDF Chat initialization is now handled by modules/pdf-chat/pdf-chat.js
// which is imported at the top of this file.


// ===========================
// MAIN INITIALIZATION
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Panel] DOMContentLoaded - Starting initialization...');
  console.log('[Panel] apiManager available:', typeof apiManager !== 'undefined');
  console.log('[Panel] storageManager available:', typeof storageManager !== 'undefined');

  // ✅ Check if should show welcome screen
  try {
    const data = await chrome.storage.local.get(['show_welcome_screen']);
    if (data.show_welcome_screen) {
      const { onboardingManager } = await import('../subscription/onboarding-manager.js');
      await onboardingManager.initialize();
      await onboardingManager.showWelcomeScreen();
      // Clear flag
      await chrome.storage.local.set({ show_welcome_screen: false });
    }
  } catch (error) {
    console.error('[Panel] Error showing welcome screen:', error);
  }

  try {

    resetPanelVisibilityStyles();
    const chatView = document.getElementById('chatView');
    const recordView = document.getElementById('recordView');
    const translateView = document.getElementById('translateView');
    const pdfChatView = document.getElementById('pdfChatView');

    if (chatView) chatView.style.display = 'flex';
    if (recordView) recordView.style.display = 'none';
    if (translateView) translateView.style.display = 'none';
    if (pdfChatView) pdfChatView.style.display = 'none';

    // Handle visibility changes (e.g., when switching tabs/apps)
    // This should NOT trigger panelClosed - only reset styles when visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        resetPanelVisibilityStyles();
        // Footer input visibility is now handled by input module
      }
      // Don't send panelClosed when hidden - this happens when user switches to other apps
      // We only want to notify when panel is actually closed/unloaded
    }, { once: false });

    // Only notify panelClosed when page is actually unloaded (not just hidden)
    // pagehide fires when the panel is closed by user or when navigating away
    window.addEventListener('pagehide', (event) => {
      // Only notify if page is not being kept in bfcache (persisted = false)
      // This means the panel is actually being closed, not just cached
      if (!event.persisted) {
        console.log('[Panel] Panel pagehide event (not persisted), notifying background...');
        chrome.runtime.sendMessage({ action: 'panelClosed' }).catch(() => { });
      } else {
        console.log('[Panel] Panel pagehide event (persisted in bfcache), not notifying background');
      }
    });

    // Also listen for beforeunload as a backup - this fires when panel is definitely closing
    window.addEventListener('beforeunload', () => {
      console.log('[Panel] Panel beforeunload event, notifying background...');
      chrome.runtime.sendMessage({ action: 'panelClosed' }).catch(() => { });
    });

    console.log('[Panel] Setting up auth listeners...');
    setupAuthListeners(Lang);
    if (window.Lang) {
      document.title = Lang.get('panelTitle');
    }

    console.log('[Panel] Initializing state manager...');
    await stateManager.init();
    updateSidebarActiveState(stateManager.getPanelMode());
    applyPanelModeLayout(stateManager.getPanelMode());
    if (stateManager.getPanelMode() === 'translate') {
      focusTranslateInput();
    } else if (stateManager.getPanelMode() === 'pdfChat') {
      // Initialize PDF Chat if it's the active mode
      if (typeof window.initPDFChat === 'function') {
        await window.initPDFChat();
      }
    }

    console.log('[Panel] Initializing app...');
    await initializeApp(Lang);

    console.log('[Panel] Setting up message listener...');
    setupPanelMessageListener(Lang);

    console.log('[Panel] Initializing settings panel...');
    initializeSettingsPanel(Lang, showError, showSuccess, showInfo, apiManager);

    console.log('[Panel] Initializing history panel...');
    initializeHistoryPanel(Lang, showError, renderMessage);

    console.log('[Panel] Initializing record panel...');
    initializeRecordPanel();

    console.log('[Panel] Initializing translate panel...');
    initializeTranslatePanel(Lang, { showError, showSuccess, showInfo });

    // Setup event listeners first to ensure all buttons are ready
    console.log('[Panel] Setting up event listeners...');
    setupEventListeners(Lang);
    
    // applyPanelModeLayout sẽ tự động setup input cho mode hiện tại
    // Không cần setup riêng ở đây nữa

    // Make handleRegenerateLastMessage available globally for message-actions.js
    window.handleRegenerateLastMessage = handleRegenerateLastMessage;

    // Initialize chat UI after event listeners are set up
    // Use setTimeout to ensure DOM is fully ready
    console.log('[Panel] Scheduling chat UI initialization...');
    setTimeout(() => {
      console.log('[Panel] Initializing chat UI...');
      try {
        // Pass handleInputResize from input module if needed, or null if handled internally
        // Since we removed handleInputResize import, we might need to pass a dummy or fix this.
        // Actually, chat-ui.js uses handleInputResize for the textarea.
        // The new input module handles resizing internally, so we might not need to pass it if chat-ui.js is updated to not use it or if we pass a no-op.
        // However, chat-ui.js attaches it to 'input' event.
        // Let's pass a no-op for now as the new input module handles it.
        const noOp = () => { };
        initializeChatUI(Lang, showError, showSuccess, auth, updateDefaultModelName, getComposeGmailMode, getGmailContextSummary, noOp, handleCropImage, handleRegenerateLastMessage, openHistoryPanel, renderMessage);
      } catch (error) {
        console.error('[Panel] Error initializing chat UI:', error);
      }
    }, 100);

    console.log('[Panel] Setting up speech recognition...');
    // Chat input removed - không còn setup speech recognition cho chat input
    // Speech recognition sẽ được setup bởi các module khác (PDF Chat, Translate, Gmail) nếu cần

    console.log('[Panel] Loading conversation...');
    // Create action handlers for loadConversation
    const actionHandlers = {
      handleCopyMessage,
      handleEditMessage,
      handleRegenerateMessage
    };
    // Create renderMessage wrapper with action handlers
    const renderMessageWithHandlers = async (message, Lang, showError, showSuccess) => {
      return await renderMessage(message, Lang, showError, showSuccess, actionHandlers);
    };
    await chatLoadConversation(Lang, showError, renderMessageWithHandlers, actionHandlers);

    try {
      const data = await chrome.storage.local.get(['panelStartupMode', 'gmailSummaryPayload']);
      if (data.panelStartupMode === 'gmail-compose') {
        setComposeGmailMode(true);
        updateHeaderForGmailCompose(Lang);
        chrome.storage.local.remove(['panelStartupMode']).catch(() => { });
      } else if (data.panelStartupMode === 'gmail-summary' && data.gmailSummaryPayload) {
        // enhancedStorageManager is imported in gmail-controller.js, so we don't need to pass it
        // But renderGmailSummaryInPanel expects it as parameter, so we need to import it dynamically
        const { enhancedStorageManager } = await import('../../utils/storage-enhanced.js');
        await renderGmailSummaryInPanel(data.gmailSummaryPayload, enhancedStorageManager, Lang);
        setGmailContextSummary(data.gmailSummaryPayload.context || '');
        chrome.storage.local.remove(['panelStartupMode', 'gmailSummaryPayload']).catch(() => { });
      }
    } catch (e) {
      console.warn('[Panel] Failed to apply startup mode:', e);
    }

    setTimeout(() => {
      removeBrowserTooltips();
    }, 100);

    if (!window.pendingImages) {
      window.pendingImages = [];
    }
    await restorePendingImages(Lang);
    // Legacy input storage sync removed

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        if (changes.currentConversationId) {
          const isFromNewChat = changes.currentConversationId.newValue &&
            !changes.currentConversationId.oldValue;
          if (!isFromNewChat) {
            // Create action handlers for loadConversation
            const actionHandlers = {
              handleCopyMessage,
              handleEditMessage,
              handleRegenerateMessage
            };
            const renderMessageWithHandlers = async (message, Lang, showError, showSuccess) => {
              return await renderMessage(message, Lang, showError, showSuccess, actionHandlers);
            };
            chatLoadConversation(Lang, showError, renderMessageWithHandlers, actionHandlers);
          }
        }
        // Legacy panelInputText listener removed - handled by input module
        if (changes.panelMessagesUpdated) {
          // Create action handlers for loadConversation
          const actionHandlers = {
            handleCopyMessage,
            handleEditMessage,
            handleRegenerateMessage
          };
          const renderMessageWithHandlers = async (message, Lang, showError, showSuccess) => {
            return await renderMessage(message, Lang, showError, showSuccess, actionHandlers);
          };
          chatLoadConversation(Lang, showError, renderMessageWithHandlers, actionHandlers);
        }
        if (changes.panelMode) {
          const newMode = changes.panelMode.newValue;
          updateSidebarActiveState(newMode);
          applyPanelModeLayout(newMode);
          if (newMode === 'translate') {
            focusTranslateInput();
          }
        }
      }
    });

    console.log('[Panel] Initialization complete!');
  } catch (error) {
    console.error('[Panel] Fatal error during initialization:', error);
    const errorMsg = error.message || 'Unknown error';
    document.body.innerHTML = `
      <div class="error-display">
        <h2>Extension Error</h2>
        <p>Failed to initialize panel. Please reload the extension.</p>
        <p><strong>Error:</strong> ${errorMsg}</p>
        <details>
          <summary>Stack trace</summary>
          <pre class="error-stack">${error.stack || 'No stack trace'}</pre>
        </details>
      </div>
    `;
  }
});
