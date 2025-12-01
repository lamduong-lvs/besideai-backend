// conversation-utils.js
// Utility functions chung cho conversation management

import { enhancedStorageManager } from '../utils/panel-utils.js';
import { stateManager } from './state-manager.js';

/**
 * Tạo conversation mới và cập nhật state
 * Thay thế logic lặp ở 4 nơi: chatBtn, gmailBtn, handleNewChat, loadConversation
 */
export async function createNewConversation(type = null) {
  const currentMode = type || stateManager.getPanelMode();
  const panelMode = currentMode === 'translate' ? 'chat' : currentMode;
  await enhancedStorageManager.createConversation(null, panelMode);
  
  if (enhancedStorageManager.currentConversationId) {
    await stateManager.setCurrentConversationId(enhancedStorageManager.currentConversationId, panelMode);
  }
  
  return enhancedStorageManager.currentConversationId;
}

