// history-controller.js
// Module quản lý history panel

import { enhancedStorageManager } from '../utils/panel-utils.js';
import { stateManager } from '../storage/state-manager.js';
import { renderMessage, scrollToBottom, updateConversationTitle, updateGreetingVisibility } from '../chat/chat-ui.js';
import { SlideInPanel } from '../components/SlideInPanel.js';

let historyPanel = null;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createHistoryPanelInstance(Lang) {
  if (!historyPanel) {
    historyPanel = new SlideInPanel({
      id: 'historyPanel',
      wrapperClass: 'history-panel',
      title: 'historyTitle',
      overlayClass: 'history-overlay',
      contentClass: 'history-content',
      headerClass: 'history-header',
      titleClass: 'history-title',
      closeBtnId: 'historyClose',
      bodyId: 'historyPanelBody',
      onClose: () => {
        historyPanel = null;
      }
    });
  }
  return historyPanel;
}

export function closeHistoryPanel() {
  if (historyPanel) {
    historyPanel.close();
  }
}

export async function openHistoryPanel(Lang, showError, renderMessageFn) {
  const panel = createHistoryPanelInstance(Lang);
  panel.open(Lang);
  await loadHistoryList(Lang, showError, renderMessageFn);
}

async function loadHistoryList(Lang, showError, renderMessageFn) {
  const body = document.getElementById('historyPanelBody');
  if (!body) return;
  
  try {
    const list = await enhancedStorageManager.getAllConversations();
    
    const panelMode = stateManager.getPanelMode();
    const currentId = stateManager.getCurrentConversationId();
    
    // Filter conversations: exclude current one and only show those with messages
    // Check both messageCount and actual messages array length for reliability
    const historyConversations = list.filter(conv => {
      if (conv.id === currentId) return false;
      // Check if conversation has messages (either via metadata or actual messages array)
      const hasMessages = (conv.metadata && conv.metadata.messageCount > 0) || 
                          (conv.messages && conv.messages.length > 0);
      return hasMessages;
    });
    
    if (historyConversations.length === 0) {
      body.innerHTML = `
        <div class="history-empty">
          <svg class="history-empty-icon" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          <div>${Lang.get("historyEmpty")}</div>
        </div>
      `;
      return;
    }
    
    body.innerHTML = '';
    
    historyConversations.forEach(conv => {
      const item = createHistoryItem(conv, Lang, showError, renderMessageFn);
      body.appendChild(item);
    });
  } catch (error) {
    console.error('[HistoryController] loadHistoryList error:', error);
    body.innerHTML = `
      <div class="history-empty">
        <div>${Lang.get("historyError", { error: error.message })}</div>
      </div>
    `;
  }
}

function createHistoryItem(conversation, Lang, showError, renderMessageFn) {
  const item = document.createElement('div');
  item.className = 'history-item';
  
  const title = conversation.title || Lang.get("historyUntitled");
  const preview = conversation.preview || Lang.get("historyNoContent");
  const messageCount = conversation.metadata?.messageCount || 0;
  const convType = conversation.metadata?.type || 'chat';
  
  const date = new Date(conversation.updatedAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const typeIcon = convType === 'gmail' 
    ? '<img src="../../icons/svg/icon/Messages, Conversation/Letter.svg" width="16" height="16" alt="Gmail" class="history-type-icon">'
    : '<img src="../../icons/svg/icon/Messages, Conversation/Chat Round.svg" width="16" height="16" alt="Chat" class="history-type-icon">';
  
  item.innerHTML = `
    <div class="history-item-header">
      <div class="history-item-title">
        <span class="history-type-icon">${typeIcon}</span>
        ${escapeHtml(title)}
      </div>
      <div class="history-item-date">${date}</div>
    </div>
    <div class="history-item-preview">${escapeHtml(preview)}</div>
    <div class="history-item-meta">${messageCount} tin nhắn</div>
    <div class="history-item-actions">
      <button class="history-action-btn open-btn">${Lang.get("historyOpen")}</button>
      <button class="history-action-btn delete-btn delete">${Lang.get("historyDelete")}</button>
    </div>
  `;
  
  item.querySelector('.open-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    loadHistoryConversation(conversation.id, Lang, showError, renderMessageFn);
  });
  
  item.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteHistoryConversation(conversation.id, Lang, showError);
  });
  
  item.addEventListener('click', () => loadHistoryConversation(conversation.id, Lang, showError, renderMessageFn));
  
  return item;
}

async function loadHistoryConversation(conversationId, Lang, showError, renderMessageFn) {
  try {
    const conversation = await enhancedStorageManager.getConversation(conversationId);
    if (!conversation) {
      showError(Lang.get("errorHistoryNotFound"));
      return;
    }
    
    const convType = conversation.metadata?.type || 'chat';
    
    await stateManager.setPanelMode(convType);
    enhancedStorageManager.currentConversationId = conversationId;
    await stateManager.setCurrentConversationId(conversationId, convType);
    
    const messagesContainer = document.getElementById('messagesContainer');
    const messageElements = messagesContainer.querySelectorAll('.message');
    messageElements.forEach(msg => msg.remove());
    const loadingMsg = messagesContainer.querySelector('.loading-message');
    if (loadingMsg) loadingMsg.remove();
    
    for (const message of conversation.messages) {
      await renderMessageFn(message, Lang, showError, null);
    }
    scrollToBottom();
    
    if (conversation.messages.length > 0) {
      const firstUserMessage = conversation.messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        updateConversationTitle(firstUserMessage.content, Lang);
      }
    } else {
      updateConversationTitle('', Lang);
    }
    
    updateGreetingVisibility();
    
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) {
      if (convType === 'gmail') {
        headerTitle.textContent = Lang.get('gmailSummaryTitle') || 'Tóm tắt Email';
      } else {
        headerTitle.textContent = Lang.get('newConversationTitle') || 'Cuộc hội thoại mới';
      }
    }
    
    closeHistoryPanel();
  } catch (error) {
    console.error('[HistoryController] loadHistoryConversation error:', error);
    showError(Lang.get("errorHistoryLoad", { error: error.message }));
  }
}

async function deleteHistoryConversation(conversationId, Lang, showError) {
  try {
    await enhancedStorageManager.deleteConversation(conversationId);
    await loadHistoryList(Lang, showError, null);
  } catch (error) {
    console.error('[HistoryController] deleteHistoryConversation error:', error);
    showError(Lang.get("errorHistoryDelete", { error: error.message }));
  }
}

export function initializeHistoryPanel(Lang, showError, renderMessage) {
  // History button event listener sẽ được gắn trong initializeChatUI
  // Vì history button nằm trong footer của chat UI
}
