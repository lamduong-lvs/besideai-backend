// state-manager.js
// Quản lý tập trung tất cả trạng thái của panel, loại bỏ race conditions

class StateManager {
  constructor() {
    this.panelMode = 'chat'; // 'chat' | 'gmail' | 'translate' | 'pdfChat'
    this.currentConversationId_chat = null;
    this.currentConversationId_gmail = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Load trạng thái từ storage
      const data = await chrome.storage.local.get([
        'panelMode',
        'currentConversationId_chat',
        'currentConversationId_gmail',
        'currentConversationId' // Tương thích ngược
      ]);
      
      // Khôi phục panelMode
      if (data.panelMode && ['chat', 'gmail', 'translate', 'pdfChat'].includes(data.panelMode)) {
        this.panelMode = data.panelMode;
      }
      
      // Khôi phục conversation IDs
      if (data.currentConversationId_chat) {
        this.currentConversationId_chat = data.currentConversationId_chat;
      }
      if (data.currentConversationId_gmail) {
        this.currentConversationId_gmail = data.currentConversationId_gmail;
      }
      
      // Tương thích ngược: nếu có currentConversationId cũ, gán vào chat
      if (data.currentConversationId && !this.currentConversationId_chat) {
        this.currentConversationId_chat = data.currentConversationId;
      }
      
      this.initialized = true;
      console.log('[StateManager] Initialized:', {
        panelMode: this.panelMode,
        currentConversationId_chat: this.currentConversationId_chat,
        currentConversationId_gmail: this.currentConversationId_gmail
      });
    } catch (error) {
      console.error('[StateManager] Error initializing:', error);
      this.initialized = true; // Vẫn đánh dấu đã khởi tạo để không retry
    }
  }

  getPanelMode() {
    return this.panelMode;
  }

  async setPanelMode(mode) {
    if (!['chat', 'gmail', 'translate', 'pdfChat'].includes(mode)) {
      throw new Error(`Invalid panelMode: ${mode}`);
    }
    
    this.panelMode = mode;
    
    // Tự động lưu vào storage (đồng bộ)
    try {
      await chrome.storage.local.set({ panelMode: mode });
      console.log('[StateManager] Panel mode set to:', mode);
    } catch (error) {
      console.error('[StateManager] Error saving panelMode:', error);
      throw error;
    }
  }

  getCurrentConversationId() {
    // Tự động trả về ID phù hợp dựa trên panelMode
    if (this.panelMode === 'gmail') {
      return this.currentConversationId_gmail;
    }
    return this.currentConversationId_chat;
  }

  async setCurrentConversationId(conversationId, mode = null) {
    const targetMode = mode || this.panelMode;
    
    if (targetMode === 'gmail') {
      this.currentConversationId_gmail = conversationId;
      await chrome.storage.local.set({ 
        currentConversationId_gmail: conversationId,
        currentConversationId: conversationId // Tương thích ngược
      });
    } else {
      this.currentConversationId_chat = conversationId;
      await chrome.storage.local.set({ 
        currentConversationId_chat: conversationId,
        currentConversationId: conversationId // Tương thích ngược
      });
    }
    
    console.log('[StateManager] Conversation ID set:', {
      mode: targetMode,
      id: conversationId
    });
  }

  async saveCurrentConversationId() {
    // Lưu conversation ID hiện tại dựa trên mode
    const currentId = this.getCurrentConversationId();
    if (currentId) {
      await this.setCurrentConversationId(currentId);
    }
  }

  // Helper để lưu conversation ID từ mode khác (khi chuyển mode)
  async saveConversationIdForMode(conversationId, mode) {
    if (mode === 'gmail') {
      this.currentConversationId_gmail = conversationId;
      await chrome.storage.local.set({ 
        currentConversationId_gmail: conversationId,
        currentConversationId: conversationId
      });
    } else {
      this.currentConversationId_chat = conversationId;
      await chrome.storage.local.set({ 
        currentConversationId_chat: conversationId,
        currentConversationId: conversationId
      });
    }
  }

  async init() {
    return this.initialize();
  }
}

// Export singleton instance
const stateManager = new StateManager();
export { stateManager };

