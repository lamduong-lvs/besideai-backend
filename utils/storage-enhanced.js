// utils/storage-enhanced.js
// Phiên bản nâng cấp của storageManager sử dụng IndexedDB thay vì chrome.storage.local

import { ConversationDB } from './conversation-db.js';

// ========================================
// KIỂM TRA NGỮ CẢNH
// ========================================

/**
 * Kiểm tra xem ngữ cảnh extension có còn hợp lệ không.
 * @returns {boolean}
 */
function isContextValid() {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
}

// ========================================
// ENHANCED STORAGE MANAGER
// ========================================

class EnhancedStorageManager {
  constructor() {
    this.currentConversationId = null;
    // Vẫn sử dụng chrome.storage.local cho một số dữ liệu nhỏ như currentConversationId
    this.smallDataKeys = ['currentConversationId', 'panelInputText', 'panelMessagesUpdated'];
  }
  
  // ========================================
  // CONVERSATION MANAGEMENT
  // ========================================
  
  async createConversation(firstMessage = null, type = 'chat') {
    if (!isContextValid()) return null;

    const conversation = {
      id: 'conv_' + Date.now(),
      title: firstMessage ? this.generateTitle(firstMessage.content) : 'New Conversation',
      messages: firstMessage ? [firstMessage] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        provider: 'cerebras',
        model: 'llama-4-scout-17b-16e-instruct',
        temperature: 0.7
      },
      metadata: {
        messageCount: firstMessage ? 1 : 0,
        totalTokens: 0,
        type: type // 'chat' hoặc 'gmail'
      }
    };
    
    await ConversationDB.saveConversation(conversation);
    this.currentConversationId = conversation.id;
    
    // Lưu currentConversationId vào chrome.storage.local theo type
    const storageKey = type === 'gmail' ? 'currentConversationId_gmail' : 'currentConversationId_chat';
    await chrome.storage.local.set({ 
      [storageKey]: conversation.id,
      currentConversationId: conversation.id // Giữ lại để tương thích ngược
    });
    
    return conversation;
  }
  
  async getConversation(conversationId) {
    if (!isContextValid()) return null;

    try {
      const conversation = await ConversationDB.getConversation(conversationId);
      return conversation;
    } catch(e) {
      console.warn('Error getting conversation:', e);
      return null;
    }
  }
  
  async saveConversation(conversation) {
    if (!isContextValid()) return;
    
    try {
      await ConversationDB.saveConversation(conversation);
    } catch(error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }
  
  async deleteConversation(conversationId) {
    if (!isContextValid()) return;
    
    try {
      await ConversationDB.deleteConversation(conversationId);
      
      // Nếu deleted conversation was current, tạo mới
      if (this.currentConversationId === conversationId) {
        await this.createConversation();
      }
    } catch(error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
  
  async getAllConversations() {
    if (!isContextValid()) return [];
    
    try {
      const conversations = await ConversationDB.getAllConversations();
      return conversations;
    } catch(error) {
      console.error('Error getting all conversations:', error);
      return [];
    }
  }
  
  generateTitle(content) {
    const maxLength = 50;
    const cleaned = content.trim().replace(/\s+/g, ' ');
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    return cleaned.substring(0, maxLength) + '...';
  }
  
  // ========================================
  // MESSAGE MANAGEMENT
  // ========================================
  
  async addMessage(message) {
    // Đảm bảo có currentConversationId
    if (!this.currentConversationId) {
      // Thử lấy từ chrome.storage.local
      const data = await chrome.storage.local.get('currentConversationId');
      if (data.currentConversationId) {
        this.currentConversationId = data.currentConversationId;
      } else {
        // Tạo conversation mới nếu chưa có
        await this.createConversation();
      }
    }
    
    let conversation = await this.getConversation(this.currentConversationId);
    
    // Nếu vẫn không có conversation, tạo mới
    if (!conversation) {
      console.log('[EnhancedStorage] Conversation not found, creating new one');
      await this.createConversation();
      conversation = await this.getConversation(this.currentConversationId);
    }
    
    if (!conversation) {
      throw new Error('Failed to create or retrieve conversation');
    }
    
    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    conversation.metadata.messageCount = conversation.messages.length;
    
    if (conversation.messages.length === 1 && message.role === 'user') {
      conversation.title = this.generateTitle(message.content);
    }
    
    if (message.metadata && message.metadata.tokens) {
      conversation.metadata.totalTokens += message.metadata.tokens.total || 0;
    }
    
    await this.saveConversation(conversation);
    
    return conversation;
  }
  
  async updateMessage(messageId, updates) {
    const conversation = await this.getConversation(this.currentConversationId);
    
    if (!conversation) {
      throw new Error('No active conversation');
    }
    
    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }
    
    Object.assign(conversation.messages[messageIndex], updates);
    conversation.updatedAt = new Date().toISOString();
    
    await this.saveConversation(conversation);
    
    return conversation.messages[messageIndex];
  }
  
  async deleteMessage(messageId) {
    const conversation = await this.getConversation(this.currentConversationId);
    
    if (!conversation) {
      throw new Error('No active conversation');
    }
    
    conversation.messages = conversation.messages.filter(m => m.id !== messageId);
    conversation.metadata.messageCount = conversation.messages.length;
    conversation.updatedAt = new Date().toISOString();
    
    await this.saveConversation(conversation);
  }
  
  async getMessageById(messageId) {
    const conversation = await this.getConversation(this.currentConversationId);
    
    if (!conversation) {
      return null;
    }
    
    return conversation.messages.find(m => m.id === messageId) || null;
  }
  
  // ========================================
  // EXPORT & IMPORT
  // ========================================
  
  async exportConversation(conversationId) {
    const conversation = await this.getConversation(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    let markdown = `# ${conversation.title}\n\n`;
    markdown += `**Created:** ${new Date(conversation.createdAt).toLocaleString()}\n`;
    markdown += `**Messages:** ${conversation.metadata.messageCount}\n\n`;
    markdown += `---\n\n`;
    
    for (const message of conversation.messages) {
      const role = message.role === 'user' ? '**👤 You**' : '**🤖 AI**';
      const time = new Date(message.timestamp).toLocaleString();
      markdown += `### ${role}\n`;
      markdown += `*${time}*\n\n`;
      markdown += `${message.content}\n\n`;
      
      // Thêm thông tin về file đính kèm nếu có
      if (message.attachedFiles && message.attachedFiles.length > 0) {
        markdown += `**Attachments:** ${message.attachedFiles.map(f => f.fileName).join(', ')}\n\n`;
      }
      
      markdown += `---\n\n`;
    }
    
    return markdown;
  }
  
  async exportAllData() {
    if (!isContextValid()) return "{}";
    
    try {
      // Lấy dữ liệu từ chrome.storage.local (chỉ các key nhỏ)
      const smallData = await chrome.storage.local.get(this.smallDataKeys);
      
      // Lấy tất cả conversations từ IndexedDB
      const conversations = await ConversationDB.getAllConversations();
      const fullConversations = [];
      
      for (const convSummary of conversations) {
        const fullConv = await ConversationDB.getConversation(convSummary.id);
        if (fullConv) {
          fullConversations.push(fullConv);
        }
      }
      
      const allData = {
        ...smallData,
        conversations: fullConversations
      };
      
      return JSON.stringify(allData, null, 2);
    } catch(error) {
      console.error('Error exporting all data:', error);
      return "{}";
    }
  }
  
  async importData(jsonString) {
    if (!isContextValid()) return { success: false, message: 'Extension context invalid' };
    
    try {
      const data = JSON.parse(jsonString);
      
      // Import dữ liệu nhỏ vào chrome.storage.local
      const smallData = {};
      for (const key of this.smallDataKeys) {
        if (data[key] !== undefined) {
          smallData[key] = data[key];
        }
      }
      await chrome.storage.local.set(smallData);
      
      // Import conversations vào IndexedDB
      if (data.conversations && Array.isArray(data.conversations)) {
        for (const conversation of data.conversations) {
          await ConversationDB.saveConversation(conversation);
        }
      }
      
      return { success: true, message: 'Data imported successfully' };
    } catch (error) {
      throw new Error('Invalid JSON format: ' + error.message);
    }
  }
  
  // ========================================
  // SEARCH
  // ========================================
  
  async searchConversations(query) {
    const list = await this.getAllConversations();
    const lowerQuery = query.toLowerCase();
    
    return list.filter(conv => {
      return conv.title.toLowerCase().includes(lowerQuery) ||
             conv.preview.toLowerCase().includes(lowerQuery);
    });
  }
  
  async searchMessages(conversationId, query) {
    const conversation = await this.getConversation(conversationId);
    
    if (!conversation) {
      return [];
    }
    
    const lowerQuery = query.toLowerCase();
    
    return conversation.messages.filter(message => {
      return message.content.toLowerCase().includes(lowerQuery);
    });
  }
  
  // ========================================
  // CLEANUP & MAINTENANCE
  // ========================================
  
  async clearAllHistory() {
    if (!isContextValid()) return;
    
    try {
      await ConversationDB.clear();
      this.currentConversationId = null;
      
      // Xóa currentConversationId từ chrome.storage.local
      await chrome.storage.local.remove('currentConversationId');
      
      // Tạo conversation mới
      await this.createConversation();
    } catch(error) {
      console.error('Error clearing all history:', error);
      throw error;
    }
  }
  
  async deleteOldConversations(daysOld) {
    try {
      const olderThan = daysOld * 24 * 60 * 60 * 1000; // Chuyển đổi sang mili giây
      const deletedCount = await ConversationDB.deleteOld(olderThan);
      
      // Nếu conversation hiện tại bị xóa, tạo mới
      if (this.currentConversationId) {
        const currentConv = await this.getConversation(this.currentConversationId);
        if (!currentConv) {
          await this.createConversation();
        }
      }
      
      return deletedCount;
    } catch(error) {
      console.error('Error deleting old conversations:', error);
      throw error;
    }
  }
  
  async getStorageInfo() {
    if (!isContextValid()) return null;
    
    try {
      // Lấy thông tin từ chrome.storage.local
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default
      
      // Lấy thông tin từ IndexedDB (ước tính)
      const conversations = await ConversationDB.getAllConversations();
      let indexedDBSize = 0;
      
      for (const convSummary of conversations) {
        const fullConv = await ConversationDB.getConversation(convSummary.id);
        if (fullConv) {
          indexedDBSize += JSON.stringify(fullConv).length;
        }
      }
      
      const totalSize = bytesInUse + indexedDBSize;
      const estimatedQuota = 100 * 1024 * 1024; // 100MB ước tính cho IndexedDB
      const percentUsed = (totalSize / estimatedQuota) * 100;
      
      return {
        chromeStorage: {
          bytesInUse,
          quota,
          percentUsed: (bytesInUse / quota) * 100,
          humanReadable: {
            used: this.formatBytes(bytesInUse),
            quota: this.formatBytes(quota)
          }
        },
        indexedDB: {
          estimatedSize: indexedDBSize,
          humanReadable: this.formatBytes(indexedDBSize)
        },
        total: {
          estimatedSize: totalSize,
          percentUsed: percentUsed.toFixed(2),
          humanReadable: this.formatBytes(totalSize)
        }
      };
    } catch(error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
  
  async optimizeStorage() {
    const storageInfo = await this.getStorageInfo();
    
    if (storageInfo && storageInfo.total.percentUsed > 80) {
      const conversations = await this.getAllConversations();
      conversations.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      
      const deleteCount = Math.ceil(conversations.length * 0.2);
      const toDelete = conversations.slice(0, deleteCount);
      
      for (const conv of toDelete) {
        await ConversationDB.deleteConversation(conv.id);
      }
      
      return {
        optimized: true,
        deletedCount: deleteCount,
        newStorageInfo: await this.getStorageInfo()
      };
    }
    
    return {
      optimized: false,
      message: 'Storage usage is below optimization threshold'
    };
  }
  
  // ========================================
  // STATISTICS
  // ========================================
  
  async getStatistics() {
    const conversations = await this.getAllConversations();
    let totalMessages = 0;
    let totalTokens = 0;
    
    for (const convSummary of conversations) {
      totalMessages += convSummary.messageCount || 0;
      
      const fullConv = await ConversationDB.getConversation(convSummary.id);
      if (fullConv && fullConv.metadata) {
        totalTokens += fullConv.metadata.totalTokens || 0;
      }
    }
    
    return {
      totalConversations: conversations.length,
      totalMessages,
      totalTokens,
      averageMessagesPerConversation: conversations.length > 0 
        ? Math.round(totalMessages / conversations.length) 
        : 0,
      oldestConversation: conversations.length > 0 
        ? conversations[conversations.length - 1].updatedAt 
        : null,
      newestConversation: conversations.length > 0 
        ? conversations[0].updatedAt 
        : null
    };
  }
  
  // ========================================
  // MIGRATION HELPERS
  // ========================================
  
  async migrateFromOldStorage() {
    if (!isContextValid()) return { success: false, message: 'Extension context invalid' };
    
    try {
      // Kiểm tra xem đã migrate chưa
      const migrationStatus = await chrome.storage.local.get('migrationToIndexedDB');
      if (migrationStatus.migrationToIndexedDB) {
        return { success: true, message: 'Already migrated' };
      }
      
      // Lấy tất cả conversations từ chrome.storage.local
      const conversationsList = await chrome.storage.local.get('conversationsList');
      if (!conversationsList.conversationsList || conversationsList.conversationsList.length === 0) {
        // Đánh dấu đã migrate ngay cả khi không có dữ liệu
        await chrome.storage.local.set({ migrationToIndexedDB: true });
        return { success: true, message: 'No conversations to migrate' };
      }
      
      let migratedCount = 0;
      let errorCount = 0;
      
      // Migrate từng conversation
      for (const convSummary of conversationsList.conversationsList) {
        try {
          const key = `conversation_${convSummary.id}`;
          const convData = await chrome.storage.local.get(key);
          
          if (convData[key]) {
            await ConversationDB.saveConversation(convData[key]);
            migratedCount++;
            
            // Xóa conversation cũ khỏi chrome.storage.local
            await chrome.storage.local.remove(key);
          }
        } catch(error) {
          console.error(`Error migrating conversation ${convSummary.id}:`, error);
          errorCount++;
        }
      }
      
      // Xóa conversationsList khỏi chrome.storage.local
      await chrome.storage.local.remove('conversationsList');
      
      // Đánh dấu đã migrate
      await chrome.storage.local.set({ migrationToIndexedDB: true });
      
      return {
        success: true,
        message: `Migrated ${migratedCount} conversations successfully`,
        migratedCount,
        errorCount
      };
    } catch(error) {
      console.error('Error during migration:', error);
      return {
        success: false,
        message: 'Migration failed: ' + error.message
      };
    }
  }
}

// ========================================
// ERROR CLASS
// ========================================

class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageError';
  }
}

// ========================================
// EXPORT
// ========================================

const enhancedStorageManager = new EnhancedStorageManager();

export {
  enhancedStorageManager,
  EnhancedStorageManager,
  StorageError
};
