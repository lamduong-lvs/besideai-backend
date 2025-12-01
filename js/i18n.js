/**
 * Dịch vụ Quốc tế hóa (i18n) v2.1
 * * Đặt tại: root/js/i18n.js
 * * Nâng cấp:
 * - Hỗ trợ 8 ngôn ngữ (vi, en, ja, ko, zh, fr, de, es).
 * - Tự động phát hiện ngôn ngữ từ trình duyệt khi lần đầu chạy.
 * - Fallback về tiếng Anh nếu không phát hiện được ngôn ngữ.
 * - Ưu tiên: Cài đặt đã lưu > Ngôn ngữ Trình duyệt > Tiếng Anh (mặc định).
 * - Cung cấp danh sách ngôn ngữ cho trang Cài đặt.
 * - Giả định thư mục `lang/` (chứa các file .json) nằm ở thư mục GỐC (root) của extension.
 */
(function() {
  // 1. Chỉ khởi tạo một lần
  if (window.Lang) return;

  const LangService = {
    
    // Ngôn ngữ mặc định (fallback về tiếng Anh)
    defaultLang: 'en',

    // Danh sách các ngôn ngữ được hỗ trợ
    // (Bạn có thể gọi Lang.getSupportedLanguages() từ trang cài đặt)
    supportedLanguages: [
      { code: 'vi',    name: 'Tiếng Việt' },
      { code: 'en',    name: 'English' },
      { code: 'ja',    name: '日本語' }, // Tiếng Nhật
      { code: 'ko',    name: '한국어' }, // Tiếng Hàn
      { code: 'zh',    name: '简体中文' }, // Tiếng Trung (Giản thể) - Đổi từ zh-CN
      { code: 'fr',    name: 'Français' }, // Tiếng Pháp
      { code: 'de',    name: 'Deutsch' }, // Tiếng Đức
      { code: 'es',    name: 'Español' }  // Tiếng Tây Ban Nha
    ],

    // Nơi lưu trữ các chuỗi JSON đã tải
    strings: {},
    
    // Ngôn ngữ đang được sử dụng
    currentLang: 'en',

    /**
     * Map ngôn ngữ trình duyệt sang ngôn ngữ extension
     * Xử lý các trường hợp: 'zh-CN', 'zh-TW', 'zh-HK' → 'zh'
     * 'en-US', 'en-GB', 'en-AU' → 'en'
     * @param {string} browserLang - Ngôn ngữ từ trình duyệt (ví dụ: 'en-US', 'vi-VN', 'zh-CN')
     * @returns {string|null} Mã ngôn ngữ extension hoặc null nếu không match
     */
    mapBrowserLangToExtensionLang: function(browserLang) {
      if (!browserLang) return null;
      
      // Lấy phần base language (trước dấu -)
      const baseLang = browserLang.split('-')[0].toLowerCase();
      
      // Mapping trực tiếp
      const langMap = {
        'vi': 'vi',
        'en': 'en',
        'ja': 'ja',
        'ko': 'ko',
        'zh': 'zh',  // zh-CN, zh-TW, zh-HK đều map về 'zh'
        'fr': 'fr',
        'de': 'de',
        'es': 'es'
      };
      
      return langMap[baseLang] || null;
    },

    /**
     * Khởi tạo dịch vụ
     * Ưu tiên: Cài đặt đã lưu > Ngôn ngữ Trình duyệt > Mặc định
     */
    init: async function() {
      let targetLang = this.defaultLang;

      try {
        // 1. Ưu tiên: Lấy cài đặt đã lưu của người dùng
        const data = await chrome.storage.sync.get('userLang');
        if (data.userLang) {
          targetLang = data.userLang;
        } else {
          // 2. Ưu tiên 2: Dùng ngôn ngữ trình duyệt nếu được hỗ trợ
          // Thử cả chrome.i18n.getUILanguage() và navigator.language
          const browserLang1 = chrome.i18n.getUILanguage();
          const browserLang2 = navigator.language || navigator.userLanguage;
          const browserLang = browserLang1 || browserLang2;

          // Map sang ngôn ngữ extension
          const mappedLang = this.mapBrowserLangToExtensionLang(browserLang);

          if (mappedLang && this.supportedLanguages.some(l => l.code === mappedLang)) {
            targetLang = mappedLang;
            // Lưu ngôn ngữ đã phát hiện vào storage (chỉ lần đầu)
            try {
              await chrome.storage.sync.set({ userLang: targetLang });
              console.log(`i18n: Đã tự động phát hiện và lưu ngôn ngữ: ${targetLang} (từ trình duyệt: ${browserLang})`);
            } catch (e) {
              console.warn('i18n: Không thể lưu ngôn ngữ đã phát hiện', e);
            }
          } else {
            // Không match → fallback về tiếng Anh
            targetLang = 'en';
            try {
              await chrome.storage.sync.set({ userLang: 'en' });
              console.log(`i18n: Không phát hiện được ngôn ngữ từ trình duyệt (${browserLang}), dùng mặc định: en`);
            } catch (e) {
              console.warn('i18n: Không thể lưu ngôn ngữ mặc định', e);
            }
          }
        }
      } catch (e) {
        console.warn('i18n: Không thể đọc chrome.storage.sync, dùng mặc định. Lỗi:', e);
        targetLang = this.defaultLang;
      }
      
      // 3. Cuối cùng, xác thực lại ngôn ngữ
      if (!this.supportedLanguages.some(l => l.code === targetLang)) {
        targetLang = this.defaultLang;
      }

      this.currentLang = targetLang;

      // 4. Tải file ngôn ngữ JSON tương ứng
      try {
        // Đường dẫn này LÀ TƯƠNG ĐỐI VỚI GỐC CỦA EXTENSION (root)
        // (Vị trí của file i18n.js này không ảnh hưởng đến đường dẫn)
        const langUrl = chrome.runtime.getURL(`lang/${this.currentLang}.json`);
        let responseOk = false;
        try {
          const response = await fetch(langUrl);
          if (response.ok) {
            this.strings = await response.json();
            responseOk = true;
          }
        } catch (e) {
          // ignore and try background fallback
        }
        // Fallback: nhờ background fetch nếu trang không thể fetch được
        if (!responseOk) {
          try {
            const swResp = await chrome.runtime.sendMessage({ action: 'I18N_FETCH', lang: this.currentLang });
            if (swResp && swResp.success && swResp.data) {
              this.strings = swResp.data;
              responseOk = true;
            }
          } catch (e2) {}
        }
        if (!responseOk) {
          // Nếu file không tồn tại, fallback về tiếng Anh
          console.warn(`i18n: File ${this.currentLang}.json không tồn tại, fallback về tiếng Anh`);
          if (this.currentLang !== 'en') {
            this.currentLang = 'en';
            const fallbackUrl = chrome.runtime.getURL('lang/en.json');
            try {
              const fallbackResponse = await fetch(fallbackUrl);
              if (fallbackResponse.ok) {
                this.strings = await fallbackResponse.json();
                responseOk = true;
                // Cập nhật storage với ngôn ngữ fallback
                try {
                  await chrome.storage.sync.set({ userLang: 'en' });
                } catch (e) {
                  console.warn('i18n: Không thể lưu ngôn ngữ fallback', e);
                }
              }
            } catch (e) {
              // ignore
            }
          }
          if (!responseOk) {
            throw new Error(`Không thể tải file ngôn ngữ: ${this.currentLang}.json`);
          }
        }
        // Info log - comment out to reduce console noise
        // console.log(`i18n: Đã tải ngôn ngữ ${this.currentLang}`);
        
        // 5. Đặt thuộc tính 'lang' cho thẻ <html>
        document.documentElement.lang = this.currentLang;
        
      } catch (error) {
        console.error('i18n: Lỗi nghiêm trọng khi tải file ngôn ngữ!', error);
        // Fallback về ngôn ngữ mặc định nếu tải lỗi
        if (this.currentLang !== this.defaultLang) {
          console.warn(`i18n: Fallback về ngôn ngữ "${this.defaultLang}"`);
          this.currentLang = this.defaultLang;
          await this.init(); // Thử lại với ngôn ngữ mặc định
        }
      }
    },

    /**
     * Hàm chính để LẤY chuỗi dịch
     * @param {string} key - Mã key trong file JSON (ví dụ: "loadingAIText")
     * @param {Object} [replaces] - (Tùy chọn) Object để thay thế (ví dụ: {name: "Lam"})
     * @returns {string} Chuỗi đã dịch
     */
    /**
     * Helper function để thay thế emoji bằng SVG icons
     * @param {string} str - Chuỗi có chứa emoji
     * @returns {string} Chuỗi đã thay thế emoji bằng HTML icon
     */
    replaceEmojiWithIcons: function(str) {
      if (!str || typeof str !== 'string') return str;
      
      // Mapping emoji -> icon path
      const emojiMap = {
        '✨': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Magic Stick.svg') + '" alt="sparkles" class="icon icon-sm"></span>',
        '📅': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Time/Calendar.svg') + '" alt="calendar" class="icon icon-sm"></span>',
        '✅': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Check Circle.svg') + '" alt="check" class="icon icon-sm"></span>',
        '🎯': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Target.svg') + '" alt="target" class="icon icon-sm"></span>',
        '💡': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Bolt.svg') + '" alt="lightbulb" class="icon icon-sm"></span>',
        '📝': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Messages, Conversation/Pen.svg') + '" alt="memo" class="icon icon-sm"></span>',
        '🚀': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Astronomy/Rocket.svg') + '" alt="rocket" class="icon icon-sm"></span>',
        '❌': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Close Circle.svg') + '" alt="cross" class="icon icon-sm"></span>',
        '⚠': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Danger Triangle.svg') + '" alt="warning" class="icon icon-sm"></span>',
        '⏭️': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Arrows/Arrow Right.svg') + '" alt="next" class="icon icon-sm"></span>',
        '✏️': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Messages, Conversation/Pen.svg') + '" alt="pencil" class="icon icon-sm"></span>',
        '🖌️': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Design, Tools/Paint Roller.svg') + '" alt="brush" class="icon icon-sm"></span>',
        '🖊️': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Messages, Conversation/Pen.svg') + '" alt="pen" class="icon icon-sm"></span>',
        '💨': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Weather/Wind.svg') + '" alt="spray" class="icon icon-sm"></span>',
        '✂️': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Scissors.svg') + '" alt="scissors" class="icon icon-sm"></span>',
        '✓': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Check Circle.svg') + '" alt="check" class="icon icon-sm"></span>',
        '✕': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Close Circle.svg') + '" alt="cross" class="icon icon-sm"></span>',
        '📧': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Messages, Conversation/Letter.svg') + '" alt="email" class="icon icon-sm"></span>',
        '🔒': '<span class="emoji-icon"><img src="' + chrome.runtime.getURL('icons/svg/icon/Security/Lock.svg') + '" alt="lock" class="icon icon-sm"></span>'
      };
      
      let result = str;
      for (const [emoji, iconHtml] of Object.entries(emojiMap)) {
        result = result.replace(new RegExp(emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), iconHtml);
      }
      
      return result;
    },

    get: function(key, replaces = null) {
      let str = this.strings[key];
      
      if (str === undefined) {
        console.warn(`i18n: Thiếu key: "${key}" trong file "${this.currentLang}.json"`);
        return `[${key}]`; // Trả về key nếu không tìm thấy
      }
      
      // Xử lý thay thế (ví dụ: "Tạo %t% items" -> "Tạo 5 items")
      if (replaces) {
        for (const rKey in replaces) {
          // Dùng RegExp để thay thế tất cả (global)
          str = str.replace(new RegExp(`%${rKey}%`, 'g'), replaces[rKey]);
        }
      }
      
      // Thay thế emoji bằng SVG icons
      str = this.replaceEmojiWithIcons(str);
      
      return str;
    },

    /**
     * Tự động dịch các phần tử HTML trong một vùng DOM
     * Sử dụng: <div data-i18n="key">Văn bản cũ</div>
     * <input data-i18n-placeholder="key">
     * <button data-i18n-title="key"></button>
     * * @param {HTMLElement} rootElement - Vùng DOM cần được dịch (mặc định là toàn bộ document)
     */
    applyToDOM: function(rootElement = document) {
      if (!rootElement) return;

      // Dịch văn bản (data-i18n)
      rootElement.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = this.get(key);
        // Nếu có HTML (icons), dùng innerHTML, ngược lại dùng textContent
        if (translated.includes('<')) {
          el.innerHTML = translated;
        } else {
          el.textContent = translated;
        }
      });

      // Dịch placeholder (data-i18n-placeholder)
      rootElement.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = this.get(key);
      });

      // Dịch title/tooltip (data-i18n-title)
      rootElement.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = this.get(key);
      });

      // Dịch giá trị (data-i18n-value)
      rootElement.querySelectorAll('[data-i18n-value]').forEach(el => {
        const key = el.getAttribute('data-i18n-value');
        el.value = this.get(key);
      });
    },

    /**
     * Lấy ngôn ngữ hiện tại (ví dụ: 'vi', 'en')
     * @returns {string} Mã ngôn ngữ hiện tại
     */
    getCurrentLanguage: function() {
      return this.currentLang;
    },

    /**
     * Lấy danh sách các ngôn ngữ được hỗ trợ
     * @returns {Array<Object>} Ví dụ: [{ code: 'vi', name: 'Tiếng Việt' }, ...]
     */
    getSupportedLanguages: function() {
      return this.supportedLanguages;
    },

    /**
     * Đặt và LƯU ngôn ngữ mới (cập nhật động không cần reload)
     * * @param {string} langCode - "vi", "en", v.v.
     */
    setLanguage: async function(langCode) {
      // 1. Kiểm tra xem có phải ngôn ngữ hợp lệ không
      if (!this.supportedLanguages.some(l => l.code === langCode)) {
        console.error(`i18n: Ngôn ngữ không được hỗ trợ: ${langCode}`);
        return;
      }

      // 2. Không làm gì nếu ngôn ngữ không đổi
      if (this.currentLang === langCode) return;
      
      // 3. Lưu cài đặt mới
      try {
        await chrome.storage.sync.set({ userLang: langCode });
      } catch (e) {
        console.error('i18n: Không thể lưu cài đặt ngôn ngữ', e);
        return;
      }
      
      // 4. Tải file ngôn ngữ mới và cập nhật động
      try {
        const langUrl = chrome.runtime.getURL(`lang/${langCode}.json`);
        let newStrings = null;
        try {
          const response = await fetch(langUrl);
          if (response.ok) {
            newStrings = await response.json();
          }
        } catch (e) {
          // ignore and try background fallback
        }
        if (!newStrings) {
          const swResp = await chrome.runtime.sendMessage({ action: 'I18N_FETCH', lang: langCode });
          if (swResp && swResp.success && swResp.data) {
            newStrings = swResp.data;
          }
        }
        if (!newStrings) {
          throw new Error(`Không thể tải file ngôn ngữ: ${langCode}.json`);
        }
        
        // Cập nhật ngôn ngữ hiện tại và strings
        this.currentLang = langCode;
        this.strings = newStrings;
        
        // Cập nhật thuộc tính lang của HTML
        document.documentElement.lang = langCode;
        
        // Áp dụng ngôn ngữ mới cho toàn bộ DOM
        this.applyToDOM();
        
        console.log(`i18n: Đã chuyển đổi ngôn ngữ sang ${langCode}`);
      } catch (e) {
        console.error('i18n: Lỗi khi tải ngôn ngữ mới', e);
      }
    }
  };

  // Gán vào window để các file khác có thể gọi
  window.Lang = LangService;

// (THAY ĐỔI) Khởi tạo và gán promise vào window
// để các script khác có thể "await" (chờ)
window.Lang.initializationPromise = (async () => {
  await window.Lang.init();

  // Tự động dịch các phần tử tĩnh khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.Lang.applyToDOM());
  } else {
    window.Lang.applyToDOM(); // Dịch các phần tử tĩnh của trang
  }
})();

})();