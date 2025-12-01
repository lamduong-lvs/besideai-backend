// conversation-db.js
// IndexedDB helper để lưu trữ lịch sử chat với dung lượng lớn hơn

import { IndexedDBWrapper } from './IndexedDBWrapper.js';

const dbWrapper = new IndexedDBWrapper(
  'ConversationDB',
  'conversations',
  1,
  [
    { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
    { name: 'createdAt', keyPath: 'createdAt', unique: false }
  ]
);

export const ConversationDB = {
  dbName: 'ConversationDB',
  storeName: 'conversations',
  version: 1,

  async open() {
    return dbWrapper.open();
  },

  async saveConversation(conversation) {
    // Tính toán kích thước để log
    const conversationSize = JSON.stringify(conversation).length;
    const sizeKB = conversationSize / 1024;
    
    console.log('[ConversationDB] Saving conversation:', {
      id: conversation.id,
      title: conversation.title,
      messageCount: conversation.messages?.length || 0,
      sizeKB: sizeKB.toFixed(2)
    });
    
    try {
      const saved = await dbWrapper.save(conversation);
      console.log('[ConversationDB] Successfully saved conversation:', saved.id);
      return saved;
    } catch (error) {
      console.error('[ConversationDB] Failed to save conversation:', {
        id: conversation.id,
        errorName: error?.name,
        errorMessage: error?.message
      });
      throw error;
    }
  },

  async getConversation(conversationId) {
    try {
      const conversation = await dbWrapper.get(conversationId);
      if (conversation) {
        console.log('[ConversationDB] Retrieved conversation:', {
          id: conversation.id,
          title: conversation.title,
          messageCount: conversation.messages?.length || 0
        });
      } else {
        console.log('[ConversationDB] Conversation not found:', conversationId);
      }
      return conversation;
    } catch (error) {
      throw error;
    }
  },

  async getAllConversations() {
    try {
      const conversations = await dbWrapper.getAll('updatedAt');
      const result = conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
        messageCount: conv.messages?.length || 0,
        preview: this.generatePreview(conv),
        metadata: conv.metadata || { messageCount: conv.messages?.length || 0, type: 'chat' }
      }));
      
      // Sắp xếp theo updatedAt giảm dần (mới nhất trước)
      result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      console.log('[ConversationDB] Retrieved all conversations:', result.length);
      return result;
    } catch (error) {
      throw error;
    }
  },

  async deleteConversation(conversationId) {
    try {
      await dbWrapper.delete(conversationId);
      console.log('[ConversationDB] Deleted conversation:', conversationId);
      return true;
    } catch (error) {
      console.error('[ConversationDB] Error deleting conversation:', error);
      throw error;
    }
  },

  async clear() {
    try {
      await dbWrapper.clear();
      console.log('[ConversationDB] Cleared all conversations');
    } catch (error) {
      throw error;
    }
  },

  async deleteOld(olderThan = 2592000000) { // 30 ngày mặc định
    try {
      const deleted = await dbWrapper.deleteOld('updatedAt', olderThan);
      console.log('[ConversationDB] Deleted old conversations:', deleted);
      return deleted;
    } catch (error) {
      throw error;
    }
  },

  generatePreview(conversation) {
    if (!conversation.messages || conversation.messages.length === 0) {
      return 'Empty conversation';
    }
    
    // Tìm tin nhắn user cuối cùng để làm preview
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const message = conversation.messages[i];
      if (message.role === 'user' && message.content && message.content.trim()) {
        const preview = message.content.trim().substring(0, 100);
        return preview.length < message.content.length ? preview + '...' : preview;
      }
    }
    
    // Nếu không có tin nhắn user, dùng tin nhắn cuối cùng
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage && lastMessage.content) {
      const preview = lastMessage.content.trim().substring(0, 100);
      return preview.length < lastMessage.content.length ? preview + '...' : preview;
    }
    
    return 'No content';
  }
};
