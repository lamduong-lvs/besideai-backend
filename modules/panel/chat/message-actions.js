// message-actions.js
// Module xử lý các hành động trên messages (copy, edit, regenerate)

import { enhancedStorageManager } from '../utils/panel-utils.js';
import { stateManager } from '../storage/state-manager.js';
import { scrollToBottom } from './message-renderer.js';
import { updateGreetingVisibility } from './chat-state.js';

export async function handleCopyMessage(message, Lang, showSuccess, showError, copyBtnElement) {
  console.log('[MessageActions] handleCopyMessage called', {
    messageId: message?.id,
    hasCopyBtn: !!copyBtnElement,
    hasContent: !!message?.content
  });
  
  try {
    // Try to get text from DOM first (for rendered markdown), fallback to message.content
    let textToCopy = '';
    
    if (copyBtnElement) {
      const messageEl = copyBtnElement.closest('.message');
      console.log('[MessageActions] Message element found:', !!messageEl);
      if (messageEl) {
        const contentDiv = messageEl.querySelector('.message-content');
        console.log('[MessageActions] Content div found:', !!contentDiv);
        if (contentDiv) {
          // Get text content from rendered HTML (strips markdown formatting)
          textToCopy = contentDiv.innerText || contentDiv.textContent || '';
          console.log('[MessageActions] Text from DOM:', textToCopy.substring(0, 50));
          
          // If empty, try to get from dataset
          if (!textToCopy && contentDiv.dataset.rawContent) {
            textToCopy = contentDiv.dataset.rawContent;
            console.log('[MessageActions] Text from dataset:', textToCopy.substring(0, 50));
          }
        }
      }
    }
    
    // Fallback to message.content if still empty
    if (!textToCopy) {
      textToCopy = message.content || '';
      console.log('[MessageActions] Text from message.content:', textToCopy.substring(0, 50));
    }
    
    if (!textToCopy || textToCopy.trim().length === 0) {
      console.warn('[MessageActions] No content to copy');
      showError(Lang.get('errorNoContentToCopy') || 'Không có nội dung để sao chép');
      return;
    }
    
    console.log('[MessageActions] Copying text to clipboard, length:', textToCopy.trim().length);
    await navigator.clipboard.writeText(textToCopy.trim());
    console.log('[MessageActions] Text copied successfully');
    
    // Show visual feedback on copy button
    if (copyBtnElement) {
      const iconImg = copyBtnElement.querySelector('img');
      if (iconImg) {
        const originalSrc = iconImg.src;
        const originalAlt = iconImg.alt;
        
        // Get success icon path
        let successIconPath;
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            successIconPath = chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Check Circle.svg');
          }
        } catch (e) {
          console.warn('[MessageActions] Could not get success icon URL:', e);
        }
        if (!successIconPath) {
          successIconPath = '../../icons/svg/icon/Essentional, UI/Check Circle.svg';
        }
        
        // Change to success icon
        iconImg.src = successIconPath;
        iconImg.alt = 'Copied';
        copyBtnElement.classList.add('copy-success');
        
        // Reset after 2 seconds
        setTimeout(() => {
          if (iconImg && copyBtnElement) {
            iconImg.src = originalSrc;
            iconImg.alt = originalAlt;
            copyBtnElement.classList.remove('copy-success');
          }
        }, 2000);
      }
    }
    
    showSuccess(Lang.get('successMessageCopied'));
  } catch (error) {
    console.error('[MessageActions] Error copying message:', error);
    showError(Lang.get('errorCopyFailed', { error: error.message }));
  }
}

export async function handleEditMessage(messageEl, message, Lang, showSuccess) {
  try {
    // Lấy input từ module input mới
    const inputManager = window.inputManager;
    if (!inputManager) {
      console.error('[MessageActions] InputManager not found');
      return;
    }
    
    const activeInput = inputManager.getCurrent();
    if (!activeInput) {
      console.warn('[MessageActions] No active input found');
      return;
    }
    
    // Get message content from DOM first (for rendered markdown), fallback to message.content
    let messageContent = '';
    const contentDiv = messageEl.querySelector('.message-content');
    if (contentDiv) {
      // Get text content from rendered HTML (strips markdown formatting)
      messageContent = contentDiv.innerText || contentDiv.textContent || '';
      
      // If empty, try to get from dataset
      if (!messageContent && contentDiv.dataset.rawContent) {
        messageContent = contentDiv.dataset.rawContent;
      }
    }
    
    // Fallback to message.content if still empty
    if (!messageContent) {
      messageContent = message.content || '';
    }
    
    if (!messageContent || messageContent.trim().length === 0) {
      console.warn('[MessageActions] No content to edit');
      return;
    }
    
    // Find current index BEFORE removing element
    const allMessages = document.querySelectorAll('.message');
    const currentIndex = Array.from(allMessages).indexOf(messageEl);
    
    // Remove the message from conversation
    const conversationId = await stateManager.getCurrentConversationId();
    if (conversationId) {
      const conversation = await enhancedStorageManager.getConversation(conversationId);
      if (conversation) {
        const messageIndex = conversation.messages.findIndex(m => m.id === message.id);
        if (messageIndex !== -1) {
          // Remove this message and all messages after it
          conversation.messages = conversation.messages.slice(0, messageIndex);
          await enhancedStorageManager.saveConversation(conversation);
          
          // Remove message element from DOM
          messageEl.remove();
          
          // Remove all messages after this one from DOM
          if (currentIndex !== -1) {
            const remainingMessages = document.querySelectorAll('.message');
            for (let i = currentIndex; i < remainingMessages.length; i++) {
              remainingMessages[i].remove();
            }
          }
        }
      }
    }
    
    // Set input value từ module input mới
    activeInput.setValue(messageContent.trim());
    activeInput.focus();
    
    showSuccess(Lang.get('successMessageEdited') || 'Tin nhắn đã được chỉnh sửa');
  } catch (error) {
    console.error('[MessageActions] Error editing message:', error);
  }
}

export async function handleRegenerateMessage(messageEl, message, Lang, showError) {
  try {
    const conversationId = await stateManager.getCurrentConversationId();
    if (!conversationId) {
      showError(Lang.get('errorNoConversation'));
      return;
    }
    
    const conversation = await enhancedStorageManager.getConversation(conversationId);
    if (!conversation) {
      showError(Lang.get('errorConversationNotFound'));
      return;
    }
    
    // Find the user message that this assistant message responds to
    const messageIndex = conversation.messages.findIndex(m => m.id === message.id);
    if (messageIndex === -1 || messageIndex === 0) {
      showError(Lang.get('errorCannotRegenerate'));
      return;
    }
    
    // Verify this is an assistant message
    if (message.role !== 'assistant') {
      showError(Lang.get('errorCannotRegenerate') || 'Chỉ có thể regenerate tin nhắn của AI');
      return;
    }
    
    // Get the user message before this assistant message
    const userMessage = conversation.messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') {
      showError(Lang.get('errorCannotRegenerate') || 'Không tìm thấy tin nhắn user để regenerate');
      return;
    }
    
    // Trigger regeneration by calling handleRegenerateLastMessage
    // This will remove the assistant message and resend the last user message
    if (window.handleRegenerateLastMessage) {
      // Use the global function if available
      await window.handleRegenerateLastMessage();
    } else {
      console.error('[MessageActions] handleRegenerateLastMessage not available');
      showError(Lang.get('errorRegenerateNotAvailable') || 'Chức năng regenerate không khả dụng');
    }
  } catch (error) {
    console.error('[MessageActions] Error regenerating message:', error);
    showError(Lang.get('errorRegenerateFailed', { error: error.message }));
  }
}


