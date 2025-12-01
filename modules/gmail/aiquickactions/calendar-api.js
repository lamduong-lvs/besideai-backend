/**
 * GOOGLE CALENDAR API
 * Tích hợp với Google Calendar để tạo events/tasks
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế tất cả các chuỗi văn bản (Error, buildDescription) bằng window.Lang.get()
 */

const CalendarAPI = {
  
  // API Config
  API_BASE: 'https://www.googleapis.com/calendar/v3',
  SCOPES: ['https://www.googleapis.com/auth/calendar.events'],
  
  // State
  isInitialized: false,
  accessToken: null,
  calendarId: 'primary', // Default calendar

  /**
   * Khởi tạo Calendar API
   * (Cập nhật i18n cho lỗi)
   */
  init: async function() {
    if (this.isInitialized) {
      return true;
    }
    
    try {
      console.log("CalendarAPI: Initializing...");
      
      await this.getAuthToken();
      
      this.isInitialized = true;
      console.log("CalendarAPI: Initialized successfully");
      return true;
      
    } catch (error) {
      console.error("CalendarAPI: Initialization failed:", error);
      // Dịch lỗi
      const errorMsg = window.Lang ? window.Lang.get('errorCalendarConnect') : "Không thể kết nối Google Calendar: ";
      throw new Error(errorMsg + error.message);
    }
  },

  /**
   * Get OAuth access token
   * (Cập nhật i18n cho lỗi)
   */
  getAuthToken: function() {
    return new Promise((resolve, reject) => {
      console.log("CalendarAPI (ContentScript): Đang yêu cầu token từ background...");
      
      chrome.runtime.sendMessage(
        { action: 'GET_AUTH_TOKEN' }, 
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("CalendarAPI Error:", chrome.runtime.lastError.message);
            // Dịch lỗi
            const errorMsg = window.Lang ? window.Lang.get('errorConnection') : "Lỗi kết nối đến background: ";
            reject(new Error(errorMsg + chrome.runtime.lastError.message));
          } else if (response && response.success) {
            this.accessToken = response.token;
            console.log("CalendarAPI (ContentScript): Đã nhận token.");
            resolve(response.token);
          } else {
            console.error("CalendarAPI Error:", response?.error);
            // Dịch lỗi
            const errorMsg = window.Lang ? window.Lang.get('errorGetToken') : "Không thể lấy token từ background script.";
            reject(new Error(response?.error || errorMsg));
          }
        }
      );
    });
  },

  /**
   * Tạo một event mới
   * (Cập nhật i18n cho lỗi)
   */
  createEvent: async function(suggestion) {
    try {
      if (!this.isInitialized || !this.accessToken) {
        console.log("CalendarAPI: Chưa khởi tạo, đang chạy init...");
        await this.init();
      }
      
      console.log("CalendarAPI: Creating event:", suggestion.title);
      
      const eventData = this.convertToCalendarFormat(suggestion);
      
      const apiUrl = `${this.API_BASE}/calendars/${this.calendarId}/events?conferenceDataVersion=1`;

      const response = await fetch(
        apiUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API Error ${response.status}`);
      }
      
      const result = await response.json();
      console.log("CalendarAPI: Event created:", result.htmlLink);
      console.log("CalendarAPI: Meet link (nếu có):", result.hangoutLink);
      
      return {
        success: true,
        eventId: result.id,
        eventLink: result.htmlLink,
        meetLink: result.hangoutLink 
      };
      
    } catch (error) {
      console.error("CalendarAPI: Failed to create event:", error);
      
      if (error.message.includes('401') || error.message.includes('Invalid Credentials')) {
        this.accessToken = null;
        this.isInitialized = false;
        console.log("CalendarAPI: Token có thể đã hết hạn, xóa cache.");
        // Dịch lỗi
        const errorMsg = window.Lang ? window.Lang.get('errorTokenExpired') : "Token hết hạn hoặc không hợp lệ. Vui lòng thử lại.";
        throw new Error(errorMsg);
      }
      
      throw error;
    }
  },

  /**
   * Batch create multiple events
   * (Không thay đổi)
   */
  batchCreateEvents: async function(suggestions) {
    console.log(`CalendarAPI: Batch creating ${suggestions.length} events...`);
    
    const results = [];
    
    for (const suggestion of suggestions) {
      try {
        const result = await this.createEvent(suggestion);
        results.push({
          success: true,
          title: suggestion.title,
          result: result
        });
      } catch (error) {
        results.push({
          success: false,
          title: suggestion.title,
          error: error.message
        });
      }
    }
    
    return results;
  },

  /**
   * Convert AI suggestion to Google Calendar API format
   * (Không thay đổi)
   */
  convertToCalendarFormat: function(suggestion) {
    const event = {
      summary: suggestion.title,
      // buildDescription đã được cập nhật i18n
      description: this.buildDescription(suggestion), 
      location: suggestion.location || '',
    };
    
    if (suggestion.type === 'event') {
      if (suggestion.allDay) {
        event.start = {
          date: this.formatDateOnly(suggestion.start)
        };
        event.end = {
          date: this.formatDateOnly(suggestion.end || suggestion.start)
        };
      } else {
        event.start = {
          dateTime: suggestion.start,
          timeZone: this.getUserTimezone()
        };
        event.end = {
          dateTime: suggestion.end,
          timeZone: this.getUserTimezone()
        };
      }
      
      if (suggestion.attendees && suggestion.attendees.length > 0) {
        event.attendees = suggestion.attendees.map(email => ({
          email: email
        }));
        event.sendNotifications = true;
      }

      if (suggestion.createMeet === true) {
        event.conferenceData = {
          createRequest: {
            requestId: `askai-meet-${Date.now()}-${Math.random()}`, 
            conferenceSolutionKey: {
              type: "hangoutsMeet" 
            }
          }
        };
      }
      
    } else {
      // Tasks
      if (suggestion.due) {
        event.start = {
          dateTime: suggestion.due,
          timeZone: this.getUserTimezone()
        };
        event.end = {
          dateTime: suggestion.due,
          timeZone: this.getUserTimezone()
        };
      } else {
        const today = new Date();
        event.start = {
          date: this.formatDateOnly(today.toISOString())
        };
        event.end = {
          date: this.formatDateOnly(today.toISOString())
        };
      }
      
      event.colorId = '11'; // Red
    }
    
    event.reminders = {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 }
      ]
    };
    
    return event;
  },

  /**
   * Build description with metadata
   * (Cập nhật i18n)
   */
  buildDescription: function(suggestion) {
    // Thoát nếu i18n chưa sẵn sàng
    if (!window.Lang) {
      console.warn("CalendarAPI.buildDescription: window.Lang (i18n.js) chưa sẵn sàng.");
      return suggestion.description || "Nội dung được tạo bởi AI.";
    }

    let desc = '';
    
    if (suggestion.description) {
      desc += suggestion.description + '\n\n';
    }
    
    desc += '━━━━━━━━━━━━━━━━━━━━━━\n';
    // Dịch chuỗi
    desc += window.Lang.get('createdFromEmail') + '\n';
    
    // Dịch chuỗi "Tạo thủ công"
    const manualSourceText = window.Lang.get('manualSourceGeneric') || "Tạo thủ công";
    const manualSourceReminder = window.Lang.get('manualSourceReminder') || "Tạo thủ công (Nhắc nhở)";

    if (suggestion.source_text && suggestion.source_text !== manualSourceText && suggestion.source_text !== manualSourceReminder) {
      // Dịch chuỗi
      desc += `\n${window.Lang.get('sourceEmailQuote')}\n`;
      desc += `"${suggestion.source_text}"\n`;
    }
    
    if (suggestion.confidence < 1.0) {
        // Dịch chuỗi
        desc += `\n${window.Lang.get('aiConfidenceLabel')} ${Math.round(suggestion.confidence * 100)}%`;
    }
    
    if (suggestion.threadId && suggestion.threadId !== 'unknown' && suggestion.source_text !== manualSourceText && suggestion.source_text !== manualSourceReminder) {
      const emailLink = `https://mail.google.com/mail/${suggestion.userIndex}#inbox/${suggestion.threadId}`;
      desc += `\n\n━━━━━━━━━━━━━━━━━━━━━━\n`;
      // Dịch chuỗi
      desc += `${window.Lang.get('sourceEmailLink')}\n${emailLink}`;
    }
    
    return desc;
  },

  /**
   * Format date only (for all-day events)
   * (Không thay đổi)
   */
  formatDateOnly: function(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Get user timezone
   * (Không thay đổi)
   */
  getUserTimezone: function() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
  },

  /**
   * List calendars
   * (Không thay đổi)
   */
  listCalendars: async function() {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      
      const response = await fetch(
        `${this.API_BASE}/users/me/calendarList`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }
      
      const data = await response.json();
      return data.items || [];
      
    } catch (error) {
      console.error("CalendarAPI: Failed to list calendars:", error);
      return [];
    }
  },

  /**
   * Check for conflicts
   * (Không thay đổi)
   */
  checkConflicts: async function(startTime, endTime) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      
      const response = await fetch(
        `${this.API_BASE}/calendars/${this.calendarId}/events?` +
        `timeMin=${encodeURIComponent(startTime)}&` +
        `timeMax=${encodeURIComponent(endTime)}&` +
        `singleEvents=true`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.items || [];
      
    } catch (error) {
      console.error("CalendarAPI: Failed to check conflicts:", error);
      return [];
    }
  },

  /**
   * Fallback: Open Google Calendar with pre-filled data
   * (Không thay đổi)
   */
  openCalendarWebUI: function(suggestion) {
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams();
    
    params.append('action', 'TEMPLATE');
    params.append('text', suggestion.title);
    
    if (suggestion.description) {
      params.append('details', suggestion.description);
    }
    
    if (suggestion.location) {
      params.append('location', suggestion.location);
    }
    
    if (suggestion.type === 'event') {
      const startDate = new Date(suggestion.start);
      const endDate = new Date(suggestion.end);
      
      if (suggestion.allDay) {
        params.append('dates', 
          this.formatDateOnly(suggestion.start) + '/' + 
          this.formatDateOnly(suggestion.end)
        );
      } else {
        params.append('dates', 
          this.formatCalendarDate(startDate) + '/' + 
          this.formatCalendarDate(endDate)
        );
      }
    }
    
    const url = `${baseUrl}?${params.toString()}`;
    window.open(url, '_blank');
  },

  /**
   * Format date for Google Calendar web UI
   * (Không thay đổi)
   */
  formatCalendarDate: function(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  },

  /**
   * Revoke token
   * (Không thay đổi)
   */
  revokeToken: function() {
    console.warn("CalendarAPI.revokeToken() is deprecated. Call auth.logout() from background.");
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarAPI;
}