// chat-ui.js (Refactored)
// Module chính quản lý UI và logic của chat - imports và exports các modules con

import { renderMessage, scrollToBottom, formatTimestamp, updateTimestamp, escapeHtml, getFileTypeIcon, createFilesContainer } from './message-renderer.js';
import { handleCopyMessage, handleEditMessage, handleRegenerateMessage } from './message-actions.js';
import { loadConversation, handleNewChat, updateConversationTitle, updateGreetingVisibility, createLoadingMessage, updateGreetingWithUserName } from './chat-state.js';
import { handleSendMessage } from './chat-send.js';
import { auth } from '../../auth/auth.js';

// Re-export all functions for backward compatibility
export {
  renderMessage,
  scrollToBottom,
  formatTimestamp,
  updateTimestamp,
  escapeHtml,
  getFileTypeIcon,
  createFilesContainer,
  handleCopyMessage,
  handleEditMessage,
  handleRegenerateMessage,
  loadConversation,
  handleNewChat,
  updateConversationTitle,
  updateGreetingVisibility,
  createLoadingMessage,
  updateGreetingWithUserName,
  handleSendMessage
};

// Initialize chat UI with event listeners
export function initializeChatUI(Lang, showError, showSuccess, auth, updateDefaultModelName, getComposeGmailMode, getGmailContextSummary, handleInputResize, handleCropImage, handleRegenerateLastMessage, openHistoryPanel, renderMessageFn) {
  console.log('[ChatUI] Initializing chat UI...');
  
  // Chat input removed - không còn sử dụng chat input container

  // Create action handlers object
  const actionHandlers = {
    handleCopyMessage,
    handleEditMessage,
    handleRegenerateMessage
  };

  // Wrapper for renderMessage with action handlers
  const renderMessageWithHandlers = async (message, Lang, showError, showSuccess) => {
    return await renderMessage(message, Lang, showError, showSuccess, actionHandlers);
  };

  // Helper function to safely call handleSendMessage
  const safeHandleSendMessage = async () => {
    try {
      const composeMode = typeof getComposeGmailMode === 'function' ? getComposeGmailMode() : false;
      const contextSummary = typeof getGmailContextSummary === 'function' ? getGmailContextSummary() : '';
      await handleSendMessage(composeMode, contextSummary, Lang, showError, showSuccess, renderMessageWithHandlers, actionHandlers);
    } catch (error) {
      console.error('[ChatUI] Error in handleSendMessage:', error);
      showError(Lang.get("errorGenericPrefix", { error: error.message }) || `Lỗi: ${error.message}`);
    }
  };

  // Chat input removed - không còn lắng nghe events từ chat input
  
  // Các buttons sẽ được xử lý bởi các module khác hoặc được thêm lại sau

  console.log('[ChatUI] Chat UI initialization complete');
}

