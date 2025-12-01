// gmail-controller.js
// Module quản lý logic Gmail

import { enhancedStorageManager } from '../utils/panel-utils.js';
import { stateManager } from '../storage/state-manager.js';
import { renderMessage, scrollToBottom, updateTimestamp, updateConversationTitle } from '../chat/chat-ui.js';
import { switchToGmailInput as switchToGmailInputFromIntegration } from '../input-integration.js';

let composeGmailMode = false;
let gmailContextSummary = "";

/**
 * Khởi tạo input cho gmail
 * @param {Object} options - Tùy chọn khởi tạo
 */
export function initializeGmailInput(options = {}) {
  return switchToGmailInputFromIntegration(options);
}

/**
 * Chuyển sang input gmail
 * @param {Object} options - Tùy chọn
 */
export function switchToGmailInput(options = {}) {
  return switchToGmailInputFromIntegration(options);
}

export function getComposeGmailMode() {
  return composeGmailMode;
}

export function setComposeGmailMode(value) {
  composeGmailMode = value;
}

export function getGmailContextSummary() {
  return gmailContextSummary;
}

export function setGmailContextSummary(value) {
  gmailContextSummary = value;
}

export function updateHeaderForGmailCompose(Lang) {
  try {
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) {
      headerTitle.textContent = (Lang.get && Lang.get('composeAIBtn')) ? Lang.get('composeAIBtn') : 'Soạn AI';
    }
  } catch (e) {}
}

export async function renderGmailSummaryInPanel(payload, enhancedStorageManager, Lang) {
  try {
    const { subject, summaryMarkdown, fullModelId, context } = payload;
    const intro = subject ? `Chủ đề: ${subject}\n\n` : '';
    const content = `${intro}${summaryMarkdown || ''}`;
    const aiMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      role: 'assistant',
      content: content,
      timestamp: new Date().toISOString()
    };
    const el = await renderMessage(aiMessage, Lang, null, null);
    const contentDiv = el.querySelector('.message-content');
    if (typeof marked !== 'undefined') {
      contentDiv.innerHTML = marked.parse(aiMessage.content);
    } else {
      contentDiv.textContent = aiMessage.content;
    }
    await enhancedStorageManager.addMessage(aiMessage);
    await chrome.storage.local.set({ panelMessagesUpdated: Date.now() });
    updateTimestamp(el, aiMessage.timestamp);
    scrollToBottom();
  } catch (e) {
    console.error('[GmailController] renderGmailSummaryInPanel error:', e);
  }
}

export async function handleGmailBtn(Lang, showError, loadConversation) {
  try {
    // Khởi tạo input gmail
    console.log('[Gmail] Initializing Gmail input...');
    const gmailInput = switchToGmailInput({
      onSubmit: (value) => {
        // Xử lý submit từ input gmail
        console.log('[Gmail] Gmail input submitted:', value);
        handleGmailSubmit(value);
      }
    });
    
    if (gmailInput) {
      console.log('[Gmail] Gmail input initialized');
      window.gmailInput = gmailInput;
    } else {
      console.error('[Gmail] Failed to initialize Gmail input');
    }
    
    // Lưu lại hội thoại chat hiện tại
    const currentPanelMode = stateManager.getPanelMode();
    if (currentPanelMode === 'chat' && enhancedStorageManager.currentConversationId) {
      await stateManager.saveConversationIdForMode(
        enhancedStorageManager.currentConversationId,
        'chat'
      );
    }
    
    await stateManager.setPanelMode('gmail');
    await chrome.storage.local.set({ panelStartupMode: 'gmail-compose' });
    
    // Tìm tab Gmail hiện có
    const tabs = await chrome.tabs.query({ url: '*://mail.google.com/*' });
    if (tabs && tabs.length > 0) {
      const targetTab = tabs[0];
      await chrome.tabs.update(targetTab.id, { active: true });
      await chrome.runtime.sendMessage({ action: 'ensureSidePanelOpen', tabId: targetTab.id }).catch(() => {});
      
      const stored = await chrome.storage.local.get(['currentConversationId_gmail']);
      
      if (stored.currentConversationId_gmail) {
        enhancedStorageManager.currentConversationId = stored.currentConversationId_gmail;
        await stateManager.setCurrentConversationId(stored.currentConversationId_gmail, 'gmail');
        await loadConversation(Lang, showError);
      } else {
        await enhancedStorageManager.createConversation(null, 'gmail');
        if (enhancedStorageManager.currentConversationId) {
          await stateManager.setCurrentConversationId(enhancedStorageManager.currentConversationId, 'gmail');
        }
        await loadConversation(Lang, showError);
      }
    } else {
      const gmailTab = await chrome.tabs.create({ url: 'https://mail.google.com/' });
      if (gmailTab && gmailTab.id) {
        await chrome.tabs.update(gmailTab.id, { active: true }).catch(() => {});
        await chrome.runtime.sendMessage({ action: 'ensureSidePanelOpen', tabId: gmailTab.id }).catch(() => {});
        
        await enhancedStorageManager.createConversation(null, 'gmail');
        if (enhancedStorageManager.currentConversationId) {
          await stateManager.setCurrentConversationId(enhancedStorageManager.currentConversationId, 'gmail');
        }
      }
    }
  } catch (error) {
    console.error('[GmailController] Failed to open Gmail compose mode:', error);
    showError(Lang.get("errorGenericPrefix", { error: error.message }) || `Lỗi: ${error.message}`);
  }
}

// Xử lý submit từ input gmail
function handleGmailSubmit(value) {
  // Gọi hàm xử lý từ Gmail controller
  if (window.gmailController) {
    window.gmailController.composeEmail(value);
  }
}

