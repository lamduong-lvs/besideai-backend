// utils/storage.js

// ========================================
// STORAGE MANAGER
// ========================================

/**
 * ✅ THÊM: Kiểm tra xem ngữ cảnh extension có còn hợp lệ không.
 * @returns {boolean}
 */
function isContextValid() {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
}

class StorageManager {
  constructor() {
    this.currentConversationId = null;
  }
  
  // ========================================
  // CONVERSATION MANAGEMENT
  // ========================================
  
  async createConversation(firstMessage = null) {
    if (!isContextValid()) return null; // ✅ KIỂM TRA

    const conversation = {
      id: 'conv_' + Date.now(),
      title: firstMessage ? this.generateTitle(firstMessage) : Lang.get("storageNewConversation"),
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
        totalTokens: 0
      }
    };
    
    await this.saveConversation(conversation);
    this.currentConversationId = conversation.id;
    
    // Save current conversation ID
    await chrome.storage.local.set({ currentConversationId: conversation.id });
    
    return conversation;
  }
  
  async getConversation(conversationId) {
    if (!isContextValid()) return null; // ✅ KIỂM TRA

    try {
        const key = `conversation_${conversationId}`;
        const data = await chrome.storage.local.get(key);
        // Kiểm tra chrome.runtime.lastError sau khi gọi API
        if (chrome.runtime.lastError) {
            console.warn(Lang.get("storageErrorContext", { message: chrome.runtime.lastError.message }));
            return null;
        }
        return data[key] || null;
    } catch(e) {
        console.warn(Lang.get("storageErrorGetConv"), e);
        return null;
    }
  }
  
  async saveConversation(conversation) {
    if (!isContextValid()) return; // ✅ KIỂM TRA
    const key = `conversation_${conversation.id}`;
    await chrome.storage.local.set({ [key]: conversation });
    
    // Update conversations list
    await this.updateConversationsList(conversation);
  }
  
  async deleteConversation(conversationId) {
    if (!isContextValid()) return; // ✅ KIỂM TRA
    const key = `conversation_${conversationId}`;
    await chrome.storage.local.remove(key);
    
    // Update list
    let list = await this.getAllConversations();
    if(list) { // Check if list is valid
        list = list.filter(c => c.id !== conversationId);
        await chrome.storage.local.set({ conversationsList: list });
    }
    
    // If deleted conversation was current, create new one
    if (this.currentConversationId === conversationId) {
      await this.createConversation();
    }
  }
  
  async getAllConversations() {
    if (!isContextValid()) return []; // ✅ KIỂM TRA
    const data = await chrome.storage.local.get('conversationsList');
    if (chrome.runtime.lastError) return [];
    return data.conversationsList || [];
  }
  
  async updateConversationsList(conversation) {
    if (!isContextValid()) return; // ✅ KIỂM TRA
    let list = await this.getAllConversations();
    
    const index = list.findIndex(c => c.id === conversation.id);
    const summary = {
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
      messageCount: conversation.metadata.messageCount,
      preview: this.generatePreview(conversation)
    };
    
    if (index !== -1) {
      list[index] = summary;
    } else {
      list.unshift(summary);
    }
    
    list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    if (list.length > 100) {
      list = list.slice(0, 100);
    }
    
    await chrome.storage.local.set({ conversationsList: list });
  }
  
  generateTitle(content) {
    const maxLength = 50;
    const cleaned = content.trim().replace(/\s+/g, ' ');
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    return cleaned.substring(0, maxLength) + '...';
  }
  
  generatePreview(conversation) {
    if (conversation.messages.length === 0) {
      return Lang.get("storageEmptyConversation");
    }
    
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const preview = lastMessage.content.substring(0, 100);
    
    return preview.length < lastMessage.content.length ? preview + '...' : preview;
  }
  
  // ========================================
  // MESSAGE MANAGEMENT
  // ========================================
  
  async addMessage(message) {
    const conversation = await this.getConversation(this.currentConversationId);
    
    if (!conversation) {
      throw new StorageError(Lang.get("storageErrorNoConversation"));
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
      throw new StorageError(Lang.get("storageErrorNoConversation"));
    }
    
    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) {
      throw new StorageError(Lang.get("storageErrorMessageNotFound"));
    }
    
    Object.assign(conversation.messages[messageIndex], updates);
    conversation.updatedAt = new Date().toISOString();
    
    await this.saveConversation(conversation);
    
    return conversation.messages[messageIndex];
  }
  
  async deleteMessage(messageId) {
    const conversation = await this.getConversation(this.currentConversationId);
    
    if (!conversation) {
      throw new StorageError(Lang.get("storageErrorNoConversation"));
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
      throw new StorageError(Lang.get("storageErrorConvNotFound"));
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
      markdown += `---\n\n`;
    }
    
    return markdown;
  }
  
  async exportAllData() {
    if (!isContextValid()) return "{}"; // ✅ KIỂM TRA
    const allData = await chrome.storage.local.get(null);
    if(chrome.runtime.lastError) return "{}";
    return JSON.stringify(allData, null, 2);
  }
  
  async importData(jsonString) {
    if (!isContextValid()) return { success: false, message: Lang.get("storageErrorExportContext") }; // ✅ KIỂM TRA
    try {
      const data = JSON.parse(jsonString);
      await chrome.storage.local.set(data);
      return { success: true, message: Lang.get("storageImportSuccess") };
    } catch (error) {
      throw new StorageError(Lang.get("storageErrorInvalidJSON", { message: error.message }));
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
    if (!isContextValid()) return; // ✅ KIỂM TRA
    const conversations = await this.getAllConversations();
    
    for (const conv of conversations) {
      await chrome.storage.local.remove(`conversation_${conv.id}`);
    }
    
    await chrome.storage.local.remove('conversationsList');
    this.currentConversationId = null;
    
    await this.createConversation();
  }
  
  async deleteOldConversations(daysOld) {
    const conversations = await this.getAllConversations();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let deletedCount = 0;
    
    for (const conv of conversations) {
      const convDate = new Date(conv.updatedAt);
      if (convDate < cutoffDate) {
        await this.deleteConversation(conv.id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
  
  async getStorageInfo() {
    if (!isContextValid()) return null; // ✅ KIỂM TRA
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    if(chrome.runtime.lastError) return null;

    const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default
    const percentUsed = (bytesInUse / quota) * 100;
    
    return {
      bytesInUse,
      quota,
      percentUsed: percentUsed.toFixed(2),
      remainingBytes: quota - bytesInUse,
      humanReadable: {
        used: this.formatBytes(bytesInUse),
        quota: this.formatBytes(quota),
        remaining: this.formatBytes(quota - bytesInUse)
      }
    };
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
    
    if (storageInfo && storageInfo.percentUsed > 80) { // ✅ Check if storageInfo is valid
      const conversations = await this.getAllConversations();
      conversations.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      
      const deleteCount = Math.ceil(conversations.length * 0.2);
      const toDelete = conversations.slice(0, deleteCount);
      
      for (const conv of toDelete) {
        await this.deleteConversation(conv.id);
      }
      
      return {
        optimized: true,
        deletedCount: deleteCount,
        newStorageInfo: await this.getStorageInfo()
      };
    }
    
    return {
      optimized: false,
      message: Lang.get("storageOptimizeThreshold")
    };
  }
  
  // ========================================
  // STATISTICS
  // ========================================
  
  async getStatistics() {
    const conversations = await this.getAllConversations();
    let totalMessages = 0;
    let totalTokens = 0;
    
    for (const conv of conversations) {
      totalMessages += conv.messageCount || 0;
      
      const fullConv = await this.getConversation(conv.id);
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

const storageManager = new StorageManager();

export {
  storageManager,
  StorageManager,
  StorageError
};