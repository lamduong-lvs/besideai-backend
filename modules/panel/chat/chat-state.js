// chat-state.js
// Module quản lý state của chat (load conversation, new chat, update title, etc.)

import { enhancedStorageManager } from '../utils/panel-utils.js';
import { stateManager } from '../storage/state-manager.js';
import { auth } from '../../auth/auth.js';
import { createNewConversation } from '../storage/conversation-utils.js';
import { scrollToBottom, renderMessage as defaultRenderMessage } from './message-renderer.js';
import { handleCopyMessage, handleEditMessage, handleRegenerateMessage } from './message-actions.js';

const defaultActionHandlers = {
  handleCopyMessage,
  handleEditMessage,
  handleRegenerateMessage
};

async function renderWithDefaults(message, Lang, showError, showSuccess, actionHandlers) {
  const handlers = actionHandlers || defaultActionHandlers;
  return defaultRenderMessage(message, Lang, showError, showSuccess, handlers);
}

export async function loadConversation(Lang, showError, renderMessageFn, actionHandlers) {
  try {
    const conversationId = await stateManager.getCurrentConversationId();
    if (!conversationId) {
      updateGreetingVisibility();
      return;
    }
    
    const conversation = await enhancedStorageManager.getConversation(conversationId);
    if (!conversation) {
      console.warn('[ChatState] Conversation not found:', conversationId);
      updateGreetingVisibility();
      return;
    }
    
    // Clear messages container
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Hide greeting
    const greetingSection = document.getElementById('greetingSection');
    if (greetingSection) {
      greetingSection.style.display = 'none';
    }
    
    // Render all messages
    const renderer = renderMessageFn || renderWithDefaults;
    for (const message of conversation.messages) {
      await renderer(message, Lang, showError, () => {}, actionHandlers || defaultActionHandlers);
    }
    
    scrollToBottom();
    updateGreetingVisibility();
  } catch (error) {
    console.error('[ChatState] Error loading conversation:', error);
    showError(Lang.get('errorLoadConversation', { error: error.message }));
  }
}

// Guard to prevent multiple simultaneous calls
let isHandlingNewChat = false;

export async function handleNewChat(Lang, showError, showSuccess, auth, updateDefaultModelName) {
  // Prevent multiple simultaneous calls
  if (isHandlingNewChat) {
    console.log('[ChatState] handleNewChat already in progress, ignoring duplicate call');
    return;
  }
  
  isHandlingNewChat = true;
  
  try {
    // Get current panel mode to ensure we create the right type of conversation
    const currentPanelMode = stateManager.getPanelMode();
    console.log('[ChatState] handleNewChat called, current panel mode:', currentPanelMode);
    
    // Save current conversation before creating new one
    const currentConversationId = await stateManager.getCurrentConversationId();
    if (currentConversationId) {
      console.log('[ChatState] Saving current conversation before creating new one, id:', currentConversationId);
      const currentConversation = await enhancedStorageManager.getConversation(currentConversationId);
      if (currentConversation) {
        // Always save current conversation before switching
        // This ensures it appears in history
        if (currentConversation.messages && currentConversation.messages.length > 0) {
          // Update title if needed
          if (!currentConversation.title || currentConversation.title === 'New Conversation') {
            const firstUserMessage = currentConversation.messages.find(m => m.role === 'user');
            if (firstUserMessage) {
              currentConversation.title = enhancedStorageManager.generateTitle(firstUserMessage.content);
            }
          }
          // Ensure metadata is up to date
          if (!currentConversation.metadata) {
            currentConversation.metadata = {};
          }
          currentConversation.metadata.messageCount = currentConversation.messages.length;
          currentConversation.metadata.type = currentPanelMode;
        } else {
          // Even if no messages, ensure metadata exists
          if (!currentConversation.metadata) {
            currentConversation.metadata = { messageCount: 0, type: currentPanelMode };
          }
        }
        // Update updatedAt timestamp
        currentConversation.updatedAt = new Date().toISOString();
        
        // Save conversation to ensure it's persisted in IndexedDB
        await enhancedStorageManager.saveConversation(currentConversation);
        console.log('[ChatState] ✓ Saved current conversation:', {
          id: currentConversationId,
          messageCount: currentConversation.messages?.length || 0,
          metadataMessageCount: currentConversation.metadata?.messageCount || 0,
          title: currentConversation.title
        });
      } else {
        console.warn('[ChatState] Current conversation not found:', currentConversationId);
      }
    } else {
      console.log('[ChatState] No current conversation to save');
    }
    
    // Create new conversation FIRST to ensure it's saved
    await createNewConversation(currentPanelMode);
    console.log('[ChatState] New conversation created:', enhancedStorageManager.currentConversationId);
    
    // Clear messages container AFTER creating new conversation
    const container = document.getElementById('messagesContainer');
    if (container) {
      // Remove all messages
      const messages = container.querySelectorAll('.message');
      messages.forEach(msg => msg.remove());
      
      // Remove loading message if exists
      const loadingMsg = container.querySelector('.loading-message');
      if (loadingMsg) {
        loadingMsg.remove();
      }
    }
    
    // Show greeting immediately
    const greetingSection = document.getElementById('greetingSection');
    if (greetingSection) {
      greetingSection.style.display = 'block';
    }
    
    // Update title immediately
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) {
      headerTitle.textContent = Lang.get('newConversationTitle');
    }
    
    // Update greeting with user name if available
    if (auth && auth.getCurrentUser) {
      try {
        const user = await auth.getCurrentUser();
        if (user && user.name) {
          const greetingTitle = document.getElementById('greetingTitle');
          if (greetingTitle) {
            greetingTitle.textContent = `${Lang.get('greetingTitle')} ${user.name},`;
          }
        }
      } catch (authError) {
        console.warn('[ChatState] Could not get user for greeting:', authError);
      }
    }
    
    // Update default model name if needed
    if (updateDefaultModelName) {
      try {
        await updateDefaultModelName();
      } catch (modelError) {
        console.warn('[ChatState] Could not update default model name:', modelError);
      }
    }
    
    // Ensure greeting visibility is correct
    updateGreetingVisibility();
    scrollToBottom();
    
    // Show success message
    showSuccess(Lang.get('successNewChatCreated'));
    
    console.log('[ChatState] handleNewChat completed successfully');
  } catch (error) {
    console.error('[ChatState] Error creating new chat:', error);
    showError(Lang.get('errorNewChat', { error: error.message }));
  } finally {
    // Reset guard after a short delay to allow UI to update
    setTimeout(() => {
      isHandlingNewChat = false;
    }, 500);
  }
}

export function updateConversationTitle(content, Lang) {
  const headerTitle = document.querySelector('.header-title');
  if (!headerTitle) return;
  
  if (content && content.trim()) {
    // Use first 50 characters of content as title
    const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
    headerTitle.textContent = title;
  } else {
    headerTitle.textContent = Lang.get('newConversationTitle');
  }
}

export function updateGreetingVisibility() {
  const container = document.getElementById('messagesContainer');
  const greetingSection = document.getElementById('greetingSection');
  
  if (!container || !greetingSection) return;
  
  const hasMessages = container.querySelectorAll('.message').length > 0;
  greetingSection.style.display = hasMessages ? 'none' : 'block';
}

export function createLoadingMessage(Lang) {
  const container = document.getElementById('messagesContainer');
  if (!container) return null;
  
  // Remove existing loading message if any
  const existingLoading = container.querySelector('.loading-message');
  if (existingLoading) {
    existingLoading.remove();
  }
  
  // Get AI avatar
  const DEFAULT_AI_AVATAR = '../../icons/icon-16.png';
  const { src: avatarSrc } = getAvatarMetadata('assistant');
  
  const loadingEl = document.createElement('div');
  loadingEl.className = 'message assistant loading-message';
  loadingEl.id = 'loadingMessage';
  
  const loadingText = Lang.get('loadingGeneratingAnswer') || 'Đang tạo câu trả lời...';
  
  loadingEl.innerHTML = `
    <div class="message-avatar">
      <img src="${avatarSrc}" alt="AI">
    </div>
    <div class="message-body">
      <div class="message-content">
        <div class="loading-content">
          <span class="loading-text">${loadingText}</span>
          <div class="loading-dots">
            <span class="dot">.</span>
            <span class="dot">.</span>
            <span class="dot">.</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  container.appendChild(loadingEl);
  scrollToBottom();
  
  return loadingEl;
}

// Helper function to get avatar metadata (same as in message-renderer.js)
function getAvatarMetadata(role) {
  if (role === 'assistant') {
    return { src: '../../icons/icon-16.png', className: '' };
  }
  const userAvatar = (typeof window !== 'undefined' && window.__AISidePanelUserAvatar) 
    ? window.__AISidePanelUserAvatar 
    : '../../icons/svg/icon/Users/User.svg';
  const className = userAvatar.startsWith('http') ? 'user-avatar-img' : '';
  return { src: userAvatar, className };
}

export async function updateGreetingWithUserName(auth) {
  try {
    if (!auth || !auth.getCurrentUser) return;
    
    const user = await auth.getCurrentUser();
    if (!user || !user.name) return;
    
    const greetingTitle = document.getElementById('greetingTitle');
    if (greetingTitle) {
      greetingTitle.textContent = `Chào, ${user.name}`;
    }
  } catch (error) {
    console.error('[ChatState] Error updating greeting with user name:', error);
  }
}

