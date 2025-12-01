/**
 * AI EVENT PARSER
 * Gọi AI để phân tích email và trả về suggestions
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế tất cả các chuỗi văn bản (hard-coded strings) bằng window.Lang.get('key')
 */

const AIEventParser = {
  
  /**
   * Parse email để tìm Events
   * (Không thay đổi)
   */
  parseEmailForEvents: async function(emailData) {
    console.log("AIEventParser: Đang parse Events từ email...");
    
    try {
      // 1. Build prompt
      const prompt = PromptTemplates.buildEventPrompt(emailData);
      
      // 2. Call AI
      const aiResponse = await this.callAI(prompt);
      
      // 3. Parse và validate response
      const suggestions = this.parseAIResponse(aiResponse);
      
      // 4. Filter by confidence
      const validSuggestions = suggestions.filter(s => s.confidence >= 0.7);
      
      // 5. Gắn threadId và userIndex
      validSuggestions.forEach(s => {
        s.threadId = emailData.threadId || 'unknown';
        s.userIndex = emailData.userIndex || 'u/0/';
      });
      
      console.log(`AIEventParser: Tìm thấy ${validSuggestions.length} events hợp lệ`);
      return validSuggestions;
      
    } catch (error) {
      console.error("AIEventParser: Lỗi khi parse events:", error);
      throw error;
    }
  },

  /**
   * Parse email để tìm Tasks
   * (Không thay đổi)
   */
  parseEmailForTasks: async function(emailData) {
    console.log("AIEventParser: Đang parse Tasks từ email...");
    
    try {
      const prompt = PromptTemplates.buildTaskPrompt(emailData);
      const aiResponse = await this.callAI(prompt);
      const suggestions = this.parseAIResponse(aiResponse);
      const validSuggestions = suggestions.filter(s => s.confidence >= 0.7);
      
      validSuggestions.forEach(s => {
        s.threadId = emailData.threadId || 'unknown';
        s.userIndex = emailData.userIndex || 'u/0/';
      });
      
      console.log(`AIEventParser: Tìm thấy ${validSuggestions.length} tasks hợp lệ`);
      return validSuggestions;
      
    } catch (error) {
      console.error("AIEventParser: Lỗi khi parse tasks:", error);
      throw error;
    }
  },

  /**
   * Gọi AI thông qua Chrome runtime message
   * (Cập nhật i18n cho thông báo lỗi)
   */
  callAI: function(prompt) {
    return new Promise((resolve, reject) => {
      console.log("AIEventParser: Đang gửi request tới AI...");
      
      // Gửi message đến background script để gọi AI
      chrome.runtime.sendMessage(
        {
          action: 'ANALYZE_EMAIL_FOR_EVENTS',
          prompt: prompt
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("AI Error:", chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (!response || !response.success) {
            console.error("AI Response Error:", response);
            // Dịch chuỗi lỗi
            const errorMsg = response?.error || (window.Lang ? window.Lang.get('errorNoAIResponse') : 'AI không phản hồi');
            reject(new Error(errorMsg));
            return;
          }
          
          console.log("AIEventParser: Nhận được response từ AI");
          resolve(response.result);
        }
      );
    });
  },

  /**
   * Parse AI response thành structured data
   * (Không thay đổi)
   */
  parseAIResponse: function(aiResponse) {
    try {
      let cleanedResponse = aiResponse.trim();
      
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      cleanedResponse = cleanedResponse.trim();
      
      const parsed = JSON.parse(cleanedResponse);
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        console.warn("AI Response không có suggestions array");
        return [];
      }
      
      const validatedSuggestions = parsed.suggestions
        .map(s => this.validateSuggestion(s))
        .filter(s => s !== null);
      
      return validatedSuggestions;
      
    } catch (error) {
      console.error("AIEventParser: Lỗi parse JSON:", error);
      console.log("Raw response:", aiResponse);
      return this.fallbackParse(aiResponse);
    }
  },

  /**
   * Validate một suggestion
   * (Không thay đổi)
   */
  validateSuggestion: function(suggestion) {
    try {
      if (!suggestion.type || !suggestion.title) {
        console.warn("Suggestion thiếu type hoặc title:", suggestion);
        return null;
      }
      
      if (!['event', 'task'].includes(suggestion.type)) {
        console.warn("Invalid type:", suggestion.type);
        return null;
      }
      
      if (suggestion.confidence < 0 || suggestion.confidence > 1) {
        console.warn("Invalid confidence:", suggestion.confidence);
        suggestion.confidence = 0.5;
      }
      
      if (suggestion.type === 'event') {
        if (!suggestion.start) {
          console.warn("Event thiếu start time:", suggestion);
          return null;
        }
        
        if (!this.isValidDateTime(suggestion.start)) {
          console.warn("Invalid start time format:", suggestion.start);
          return null;
        }
        
        if (!suggestion.end) {
          const startDate = new Date(suggestion.start);
          startDate.setHours(startDate.getHours() + 1);
          suggestion.end = startDate.toISOString();
        }
      }
      
      if (suggestion.type === 'task' && suggestion.due) {
        if (!this.isValidDateTime(suggestion.due)) {
          console.warn("Invalid due time format:", suggestion.due);
          suggestion.due = null;
        }
      }
      
      if (suggestion.attendees) {
        suggestion.attendees = suggestion.attendees.filter(email => 
          this.isValidEmail(email)
        );
      } else {
        suggestion.attendees = [];
      }
      
      suggestion.allDay = suggestion.allDay || false;
      suggestion.location = suggestion.location || '';
      suggestion.description = suggestion.description || '';
      suggestion.priority = suggestion.priority || 'medium';
      
      return suggestion;
      
    } catch (error) {
      console.error("Lỗi validate suggestion:", error);
      return null;
    }
  },

  /**
   * Validate datetime string (ISO 8601)
   * (Không thay đổi)
   */
  isValidDateTime: function(dateString) {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  },

  /**
   * Validate email address
   * (Không thay đổi)
   */
  isValidEmail: function(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Fallback parsing nếu JSON parse thất bại
   * (Không thay đổi)
   */
  fallbackParse: function(aiResponse) {
    console.log("AIEventParser: Thử fallback parsing...");
    
    const jsonPattern = /\{[\s\S]*?\}/g;
    const matches = aiResponse.match(jsonPattern);
    
    if (!matches) {
      return [];
    }
    
    const suggestions = [];
    for (const match of matches) {
      try {
        const obj = JSON.parse(match);
        if (obj.type && obj.title) {
          const validated = this.validateSuggestion(obj);
          if (validated) {
            suggestions.push(validated);
          }
        }
      } catch (e) {
        // Skip invalid JSON
        continue;
      }
    }
    
    return suggestions;
  },

  /**
   * Format suggestion để hiển thị trong UI
   * (Cập nhật i18n)
   */
  formatSuggestionForDisplay: function(suggestion) {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) {
      console.error("AIEventParser: window.Lang (i18n.js) is not ready.");
      // Trả về dữ liệu thô để tránh lỗi
      return {
        ...suggestion,
        displayTitle: suggestion.title,
        displayTime: suggestion.start || suggestion.due || '...',
        displayAttendees: '...',
        displayLocation: '...',
        confidenceLabel: '...',
        confidenceColor: '#ccc'
      };
    }
    
    const formatted = {
      ...suggestion,
      displayTitle: suggestion.title,
      displayTime: '',
      displayAttendees: '',
      // Dịch chuỗi "Không có"
      displayLocation: suggestion.location || window.Lang.get('errorNoLocation'),
      // Dịch Confidence
      confidenceLabel: this.getConfidenceLabel(suggestion.confidence),
      confidenceColor: this.getConfidenceColor(suggestion.confidence),
      isPast: false,
      threadId: suggestion.threadId, 
      userIndex: suggestion.userIndex
    };
    
    // Format time display
    if (suggestion.type === 'event') {
      formatted.displayTime = this.formatEventTime(suggestion.start, suggestion.end, suggestion.allDay);
      formatted.isPast = new Date(suggestion.start) < new Date();
    } else {
      formatted.displayTime = suggestion.due 
        ? this.formatTaskDue(suggestion.due)
        // Dịch chuỗi "Không có deadline"
        : window.Lang.get('noDeadline'); 
      if (suggestion.due) {
        formatted.isPast = new Date(suggestion.due) < new Date();
      }
    }
    
    // Format attendees
    if (suggestion.attendees && suggestion.attendees.length > 0) {
      if (suggestion.attendees.length <= 3) {
        formatted.displayAttendees = suggestion.attendees.join(', ');
      } else {
        // Dịch chuỗi "và X người khác"
        const remaining = suggestion.attendees.length - 2;
        formatted.displayAttendees = `${suggestion.attendees.slice(0, 2).join(', ')} ${window.Lang.get('attendeesAndOthers', {n: remaining})}`;
      }
    } else {
      // Dịch chuỗi "Chỉ bạn"
      formatted.displayAttendees = window.Lang.get('attendeesOnlyYou');
    }
    
    return formatted;
  },

  /**
   * Format event time cho display
   * (Cập nhật i18n)
   */
  formatEventTime: function(start, end, allDay) {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) return "...";
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (allDay) {
      // Dịch chuỗi "Cả ngày - "
      return `${window.Lang.get('allDay')} - ${this.formatDate(startDate)}`;
    }
    
    const isSameDay = startDate.toDateString() === endDate.toDateString();
    
    if (isSameDay) {
      return `${this.formatDate(startDate)}, ${this.formatTime(startDate)} - ${this.formatTime(endDate)}`;
    } else {
      return `${this.formatDateTime(startDate)} → ${this.formatDateTime(endDate)}`;
    }
  },

  /**
   * Format task due date
   * (Cập nhật i18n)
   */
  formatTaskDue: function(due) {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) return "...";
    
    const dueDate = new Date(due);
    // Dịch chuỗi "Đến hạn: "
    return `${window.Lang.get('duePrefix')} ${this.formatDateTime(dueDate)}`;
  },

  /**
   * Format date only
   * (Không thay đổi - Lấy ngôn ngữ từ i18n)
   */
  formatDate: function(date) {
    // Lấy ngôn ngữ hiện tại từ service (ví dụ: 'vi', 'en')
    const langCode = window.Lang ? window.Lang.getCurrentLanguage().split('-')[0] : 'vi';
    
    return date.toLocaleDateString(langCode, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  /**
   * Format time only
   * (Không thay đổi - Lấy ngôn ngữ từ i18n)
   */
  formatTime: function(date) {
    const langCode = window.Lang ? window.Lang.getCurrentLanguage().split('-')[0] : 'vi';
    
    return date.toLocaleTimeString(langCode, {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Format datetime
   * (Không thay đổi)
   */
  formatDateTime: function(date) {
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
  },

  /**
   * Get confidence label
   * (Cập nhật i18n)
   */
  getConfidenceLabel: function(confidence) {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) return "...";
    
    if (confidence >= 0.9) return window.Lang.get('confidenceHigh');
    if (confidence >= 0.8) return window.Lang.get('confidenceMedium');
    if (confidence >= 0.7) return window.Lang.get('confidenceLow');
    return window.Lang.get('confidenceVeryLow');
  },

  /**
   * Get confidence color
   * (Không thay đổi)
   */
  getConfidenceColor: function(confidence) {
    if (confidence >= 0.9) return '#34a853'; // Green
    if (confidence >= 0.8) return '#f86a01'; // Orange
    if (confidence >= 0.7) return '#f9ab00'; // Yellow
    return '#ea4335'; // Red
  }
};

// Thêm vào window object để đảm bảo nó có sẵn trong global scope
window.AIEventParser = AIEventParser;

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIEventParser;
}