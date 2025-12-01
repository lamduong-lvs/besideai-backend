(async function() {
  'use strict';
  
  // Đợi i18n load xong trước khi sử dụng
  if (window.Lang && window.Lang.initializationPromise) {
    await window.Lang.initializationPromise;
  }
  
  if (window.gmailInstance) {
    console.log(window.Lang ? window.Lang.get("logGmailInstanceExists") : "Gmail instance đã tồn tại");
    return;
  }
  
  if (typeof jQuery === 'undefined') {
    console.error(window.Lang ? window.Lang.get("errorJQueryNotLoaded") : "jQuery chưa được load");
    return;
  }
  
  if (typeof Gmail === 'undefined') {
    console.error(window.Lang ? window.Lang.get("errorGmailJsNotLoaded") : "Gmail.js chưa được load");
    return;
  }
  
  try {
    window.gmailInstance = new Gmail();
    // Tắt cảnh báo API cũ (không bắt buộc nhưng giữ lại cũng không sao)
    window.gmailInstance.DISABLE_OLD_GMAIL_API_DEPRECATION_WARNINGS = true;
    
    console.log(window.Lang ? window.Lang.get("logGmailInstanceCreated") : "Đã tạo shared Gmail instance");
    
    window.gmailInstance.utils = {
      debounce: function(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func(...args), wait);
        };
      },
      
      createCache: function() {
        const cache = new Map();
        return {
          get: function(key) {
            const item = cache.get(key);
            if (!item) return null;
            if (item.expiry && Date.now() > item.expiry) {
              cache.delete(key);
              return null;
            }
            return item.value;
          },
          set: function(key, value, ttlMinutes = 5) {
            cache.set(key, {
              value: value,
              expiry: Date.now() + (ttlMinutes * 60 * 1000)
            });
          },
          clear: function() {
            cache.clear();
          }
        };
      },
      
      sanitizeHTML: function(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
      },

      // ✅ BỔ SUNG: Hàm tiện ích để loại bỏ thẻ HTML
      // (Đã được khuyến nghị ở lượt trước)
      stripHTML: function(html) {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
      },
      
      // ✅ SỬA LẠI: Hàm lấy dữ liệu an toàn
      safeGetEmailData: function(callback, errorCallback) {
        try {
          if (window.gmailInstance.new && window.gmailInstance.new.get) {
            
            // 1. Lấy ID luồng hiện tại
            const threadId = window.gmailInstance.new.get.thread_id();
            if (!threadId) {
              if (errorCallback) errorCallback(window.Lang ? window.Lang.get("errorNoThreadId") : "Không thể tìm thấy Thread ID. Email có thể chưa tải xong.");
              return;
            }

            // 2. Lấy dữ liệu luồng từ cache của gmail.js
            const newData = window.gmailInstance.new.get.thread_data(threadId);
            
            if (newData && newData.emails && newData.emails.length > 0) {
              // 3. Thành công, trả về dữ liệu
              callback(newData); 
              return;
            }
          }
          
          // 4. LỖI: Cache không có dữ liệu
          // KHÔNG gọi lại API cũ. Thay vào đó, báo lỗi.
          if (errorCallback) {
            errorCallback(window.Lang ? window.Lang.get("errorNoCacheData") : "Không thể lấy dữ liệu email từ cache. Vui lòng chờ email tải xong hoàn toàn và thử lại.");
          }

        } catch (error) {
          console.error(window.Lang ? window.Lang.get("errorEmailData") : "Lỗi khi lấy dữ liệu email:", error);
          if (errorCallback) errorCallback(error.message);
        }
      }
    };
    
    // Phần quản lý sự kiện (giữ nguyên)
    window.gmailInstance.events = {
      _handlers: {},
      on: function(event, handler) {
        if (!this._handlers[event]) {
          this._handlers[event] = [];
        }
        this._handlers[event].push(handler);
      },
      emit: function(event, ...args) {
        if (!this._handlers[event]) return;
        this._handlers[event].forEach(handler => {
          try {
            handler(...args);
        } catch (e) {
          console.error(window.Lang ? window.Lang.get("errorEventHandler") : "Error in event handler:", e);
        }
        });
      },
      off: function(event, handler) {
        if (!this._handlers[event]) return;
        this._handlers[event] = this._handlers[event].filter(h => h !== handler);
      }
    };
    
  } catch (error) {
    console.error(window.Lang ? window.Lang.get("errorCreateInstance") : "Lỗi khi tạo Gmail instance:", error);
  }
  
  // Cleanup (giữ nguyên)
  window.addEventListener('beforeunload', () => {
    if (window.gmailInstance) {
      try {
        window.gmailInstance.observe.off();
      } catch (e) {
        console.error(window.Lang ? window.Lang.get("errorCleanup") : "Error during cleanup:", e);
      }
    }
  });
  
})();