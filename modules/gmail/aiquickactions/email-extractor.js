/**
 * EMAIL EXTRACTOR
 * Trích xuất và xử lý nội dung email từ Gmail DOM
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế các chuỗi Error và fallback (No Subject, Unknown) bằng window.Lang.get()
 */

const EmailExtractor = {
  
  /**
   * Trích xuất toàn bộ data từ email element
   * @param {HTMLElement} emailElement - DOM element của email (div.adn)
   * @returns {Object} Email data
   */
  extractEmailData: function(emailElement) {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) {
      console.error("EmailExtractor: window.Lang (i18n.js) is not ready.");
      throw new Error("i18n service not loaded.");
    }
    
    try {
      console.log("EmailExtractor: Bắt đầu trích xuất email data...");
      
      const threadContainer = emailElement.closest('div.if, div.iY');
      if (!threadContainer) {
          // Dịch lỗi
          throw new Error(window.Lang.get('errorNoThreadContainer'));
      }
      
      const data = {
        subject: this.getSubject(emailElement),
        body: this.getCleanedBody(threadContainer), 
        sender: this.getSender(emailElement), 
        recipients: this.getRecipients(emailElement), 
        date: this.getDate(emailElement), 
        timezone: this.getUserTimezone(),
        threadId: this.getThreadId(),
        userIndex: this.getUserIndex()
      };
      
      console.log("EmailExtractor: Đã trích xuất:", data);
      return data;
      
    } catch (error) {
      console.error("EmailExtractor: Lỗi khi trích xuất:", error);
      // Dịch lỗi (Thêm ": " để nối)
      throw new Error(window.Lang.get('errorCannotReadEmail') + ": " + error.message);
    }
  },

  /**
   * Lấy subject của email
   * (Cập nhật i18n)
   */
  getSubject: function(emailElement) {
    const threadContainer = emailElement.closest('div.if, div.iY');
    if (threadContainer) {
      const subjectEl = threadContainer.querySelector('h2.hP');
      if (subjectEl) {
        return subjectEl.textContent.trim();
      }
    }
    
    const subjectEl = document.querySelector('h2.hP');
    if (subjectEl) {
      return subjectEl.textContent.trim();
    }
    
    // Dịch fallback
    return window.Lang ? window.Lang.get('noSubject') : '(No Subject)';
  },

  /**
   * Lấy thông tin người gửi
   * (Cập nhật i18n)
   */
  getSender: function(emailElement) {
    const senderEl = emailElement.querySelector('span.gD[email]');
    if (senderEl) {
      return {
        name: senderEl.getAttribute('name') || senderEl.textContent.trim(),
        email: senderEl.getAttribute('email')
      };
    }
    
    // Dịch fallback
    return {
      name: window.Lang ? window.Lang.get('unknownSender') : 'Unknown',
      email: 'unknown@example.com'
    };
  },

  /**
   * Lấy danh sách người nhận
   * (Không thay đổi)
   */
  getRecipients: function(emailElement) {
    const recipients = {
      to: [],
      cc: []
    };
    
    const toElements = emailElement.querySelectorAll('span.g2[email]');
    toElements.forEach(el => {
      recipients.to.push({
        name: el.getAttribute('name') || el.textContent.trim(),
        email: el.getAttribute('email')
      });
    });
    
    const ccContainer = emailElement.querySelector('span.hb');
    if (ccContainer) {
      const ccElements = ccContainer.querySelectorAll('span[email]');
      ccElements.forEach(el => {
        recipients.cc.push({
          name: el.getAttribute('name') || el.textContent.trim(),
          email: el.getAttribute('email')
        });
      });
    }
    
    return recipients;
  },

  /**
   * Lấy ngày gửi email
   * (Không thay đổi)
   */
  getDate: function(emailElement) {
    const dateEl = emailElement.querySelector('span.g3');
    if (dateEl) {
      const dateText = dateEl.getAttribute('title') || dateEl.textContent.trim();
      return dateText;
    }
    return new Date().toISOString();
  },

  /**
   * Lấy timezone của user
   * (Không thay đổi)
   */
  getUserTimezone: function() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
  },

  /**
   * Lấy Thread ID từ URL
   * (Không thay đổi)
   */
  getThreadId: function() {
    const hash = window.location.hash;
    
    let match = hash.match(/#(?:inbox|sent|drafts|spam|trash)\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    match = hash.match(/#label\/[^\/]+\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    match = hash.match(/#search\/[^\/]+\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    match = hash.match(/\/([a-zA-Z0-9]{10,})$/);
    if (match && match[1]) {
      return match[1];
    }
    
    console.warn("EmailExtractor: Could not extract thread ID from URL:", hash);
    return 'unknown';
  },

  /**
   * Lấy User Index
   * (Không thay đổi)
   */
  getUserIndex: function() {
    const path = window.location.pathname;
    const match = path.match(/\/mail\/(u\/\d+)\//);
    if (match && match[1]) {
      return match[1] + '/'; 
    }
    return 'u/0/'; 
  },

  /**
   * Lấy message ID
   * (Không thay đổi)
   */
  getMessageId: function(emailElement) {
    return emailElement.getAttribute('data-message-id') || 
           emailElement.getAttribute('data-legacy-message-id') ||
           'unknown';
  },

  /**
   * Lấy và làm sạch nội dung của TOÀN BỘ EMAIL THREAD
   * (Không thay đổi)
   */
  getCleanedBody: function(threadContainer) {
    let fullThreadText = '';
    
    const emailElements = threadContainer.querySelectorAll('div.adn');
    
    emailElements.forEach((emailElement, index) => {
      const bodyEl = emailElement.querySelector('div.a3s');
      if (!bodyEl) return;
      
      const sender = this.getSender(emailElement);
      const date = this.getDate(emailElement);
      
      const clonedBody = bodyEl.cloneNode(true);
      
      this.removeUnwantedElements(clonedBody);
      
      let text = this.getTextContent(clonedBody);
      
      text = this.cleanupText(text);
      
      // Ghép nối (sử dụng tiếng Anh cho các tiền tố này 
      // vì nó là đầu vào cho AI, không phải cho người dùng)
      fullThreadText += `\n\n--- Email ${index + 1} | From: ${sender.name} (${sender.email}) | Date: ${date} ---\n`;
      fullThreadText += text;
    });
    
    if (fullThreadText.length > 8000) { 
      fullThreadText = fullThreadText.substring(0, 8000) + '\n\n[...email thread bị cắt do quá dài...]';
    }
    
    return fullThreadText.trim();
  },


  /**
   * Xóa các elements không cần thiết
   * (Không thay đổi)
   */
  removeUnwantedElements: function(container) {
    const signatures = container.querySelectorAll('.gmail_signature, .gmail-signature');
    signatures.forEach(el => el.remove());
    
    const quotes = container.querySelectorAll('.gmail_quote, blockquote');
    quotes.forEach(el => el.remove());
    
    const autoElements = container.querySelectorAll('.adL, .adm, .h5');
    autoElements.forEach(el => el.remove());
    
    const translations = container.querySelectorAll('.ai-translation-result');
    translations.forEach(el => el.remove());
    
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      const alt = img.getAttribute('alt');
      if (alt) {
        const textNode = document.createTextNode(`[Image: ${alt}]`);
        img.parentNode.replaceChild(textNode, img);
      } else {
        img.remove();
      }
    });
  },

  /**
   * Lấy text content, giữ lại line breaks
   * (Không thay đổi)
   */
  getTextContent: function(element) {
    let text = '';
    
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (['P', 'DIV', 'BR', 'LI'].includes(node.tagName)) {
          text += '\n';
        }
      }
    }
    
    return text;
  },

  /**
   * Clean up text
   * (Không thay đổi)
   */
  cleanupText: function(text) {
    text = text.replace(/ +/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    return text.trim();
  },

  /**
   * Detect language của email
   * (Không thay đổi)
   */
  detectLanguage: function(text) {
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    
    if (vietnameseChars.test(text)) {
      return 'vi';
    }
    
    const commonEnglish = /\b(the|is|at|which|on|in|and|to|for|with)\b/i;
    if (commonEnglish.test(text)) {
      return 'en';
    }
    
    return 'unknown';
  },

  /**
   * Extract URLs
   * (Không thay đổi)
   */
  extractLinks: function(emailElement) {
    const links = [];
    const anchorElements = emailElement.querySelectorAll('a[href]');
    
    anchorElements.forEach(a => {
      const href = a.getAttribute('href');
      const text = a.textContent.trim();
      
      if (!href.includes('mail.google.com')) {
        links.push({
          url: href,
          text: text
        });
      }
    });
    
    return links;
  },

  /**
   * Extract meeting links
   * (Không thay đổi)
   */
  extractMeetingLinks: function(emailElement) {
    const links = this.extractLinks(emailElement);
    const meetingPatterns = [
      /zoom\.us\/j\//i,
      /meet\.google\.com\//i,
      /teams\.microsoft\.com\//i,
      /webex\.com\//i
    ];
    
    return links.filter(link => 
      meetingPatterns.some(pattern => pattern.test(link.url))
    );
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailExtractor;
}

// Thêm vào window object để đảm bảo nó có sẵn trong global scope
window.EmailExtractor = EmailExtractor;