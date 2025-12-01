/**
 * EVENT POPUP MANAGER
 * Quản lý hiển thị và tương tác với popup AI suggestions
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế tất cả các chuỗi văn bản (hard-coded strings) bằng window.Lang.get('key')
 * - Sửa lỗi logic dựa trên văn bản (ví dụ: 'includes("Không tìm thấy")')
 * - Xóa logic thừa (ví dụ: nút Sửa) đã được xử lý bởi i18n HTML.
 */

const EventPopup = {
  
  // State
  currentSuggestions: [],
  currentEmailData: null,
  popupElement: null,
  selectedCount: 0,
  currentPopupMode: 'event',
  elements: {},
  shadowContainer: null,
  rootNode: null,
  overlayElement: null,
  isReady: false,
  _initializing: null,

  getRootNode: function() {
    if (this.rootNode) return this.rootNode;
    if (this.shadowContainer?.shadowRoot) {
      this.rootNode = this.shadowContainer.shadowRoot;
      return this.rootNode;
    }
    return document;
  },

  getElementById: function(id) {
    const root = this.getRootNode();
    if (root && typeof root.getElementById === 'function') {
      return root.getElementById(id);
    }
    return document.getElementById(id);
  },

  queryRoot: function(selector) {
    const root = this.getRootNode();
    if (root && typeof root.querySelector === 'function') {
      return root.querySelector(selector);
    }
    return document.querySelector(selector);
  },

  getOverlayElement: function() {
    if (this.overlayElement) return this.overlayElement;
    const overlay = this.getElementById('ai-event-popup-overlay');
    if (overlay) {
      this.overlayElement = overlay;
    }
    return overlay;
  },

  /**
   * Helper: đặt nội dung cho element, hỗ trợ HTML (emoji icon)
   */
  setElementContent: function(element, content) {
    if (!element) return;
    if (typeof content === 'string' && content.includes('<')) {
      element.innerHTML = content;
    } else {
      element.textContent = content;
    }
  },

  showOverlay: function() {
    const overlay = this.getOverlayElement();
    if (!overlay) return;
    overlay.classList.remove('d-none');
    overlay.style.display = 'flex';
  },

  hideOverlay: function() {
    const overlay = this.getOverlayElement();
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.add('d-none');
  },

  /**
   * Áp dụng theme từ storage
   */
  applyTheme: async function() {
    try {
      const data = await chrome.storage.local.get('theme');
      const theme = data.theme === 'dark' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      
      // Áp dụng cho popup nếu đã tồn tại
      const overlay = this.getOverlayElement();
      if (overlay) {
        overlay.setAttribute('data-theme', theme);
      }
    } catch (e) {
      console.warn('[Gmail EventPopup] Error applying theme:', e);
    }
  },

  /**
   * Setup theme listener
   */
  setupThemeListener: function() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.theme) {
        const newTheme = changes.theme.newValue;
        if (newTheme === 'light' || newTheme === 'dark') {
          document.documentElement.setAttribute('data-theme', newTheme);
          
          // Cập nhật popup
          const overlay = this.getOverlayElement();
          if (overlay) {
            overlay.setAttribute('data-theme', newTheme);
          }
        }
      }
    });
  },

  /**
   * Khởi tạo popup
   */
  init: async function() {
    if (this.isReady) {
      return true;
    }
    if (this._initializing) {
      return this._initializing;
    }

    console.log("EventPopup: Initializing...");
    
    this._initializing = (async () => {
      // Áp dụng theme
      await this.applyTheme();
      this.setupThemeListener();
      
      try {
        await this.injectPopupHTML();
        console.log("EventPopup: HTML injected successfully.");

        this.cacheElements();
        console.log("EventPopup: Elements cached.");

        this.bindEvents();
        console.log("EventPopup: Events bound.");
        
        // Áp dụng lại theme sau khi inject HTML
        await this.applyTheme();
        
        this.isReady = true;
        console.log("EventPopup: Initialized successfully");
        return true;

      } catch (error) {
        this.isReady = false;
        console.error("EventPopup: Initialization failed:", error);
        throw error;
      }
    })();

    try {
      return await this._initializing;
    } finally {
      this._initializing = null;
    }
  },

  /**
   * Inject popup HTML vào Gmail
   * (Cập nhật: Đợi i18n load xong)
   */
  injectPopupHTML: async function() {
    return new Promise(async (resolve, reject) => {
      if (this.overlayElement) {
        console.log("EventPopup: HTML đã được inject từ trước.");
        resolve();
        return;
      }

      // Remove stale hosts/overlays if they exist in document
      const staleHost = document.getElementById('ai-event-popup-shadow');
      if (staleHost) {
        staleHost.remove();
      }
      const staleOverlay = document.getElementById('ai-event-popup-overlay');
      if (staleOverlay) {
        staleOverlay.remove();
      }
      
      // Đợi i18n load xong trước khi inject
      if (window.Lang && window.Lang.initializationPromise) {
        await window.Lang.initializationPromise;
      }
      
      const htmlPath = chrome.runtime.getURL('modules/gmail/aiquickactions/event-popup.html');
      
      fetch(htmlPath)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch HTML: ${response.statusText}`);
          }
          return response.text();
        })
        .then(async html => {

          // === SỬA LỖI ICON: Thay thế tất cả đường dẫn icon tương đối ===
          // Google Meet icon
          const iconPath = chrome.runtime.getURL('icons/svg/google-meet.svg');
          html = html.replace(
            'src="icons/svg/google-meet.svg"', 
            `src="${iconPath}"`
          );
          // Tất cả các icon khác (đường dẫn tương đối ../icons/svg/icon/...)
          html = html.replace(/src="\.\.\/icons\/svg\/icon\/([^"]+)"/g, (match, iconPath) => {
            return `src="${chrome.runtime.getURL(`icons/svg/icon/${iconPath}`)}"`;
          });
          // === KẾT THÚC SỬA LỖI ICON ===

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          const overlay = doc.getElementById('ai-event-popup-overlay');
          if (!overlay) {
            throw new Error("Không tìm thấy 'ai-event-popup-overlay' trong file HTML.");
          }
          
          // ✅ Load shadow-dom-helper nếu chưa có
          if (typeof window.createShadowContainer !== 'function') {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('utils/shadow-dom-helper.js');
            document.head.appendChild(script);
            // Wait a bit for script to load
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // ✅ Tạo Shadow DOM container
          let shadowContainer = null;
          if (typeof window.createShadowContainer === 'function') {
            shadowContainer = window.createShadowContainer({
              id: 'ai-event-popup-shadow',
              className: 'ai-event-popup-shadow-container',
              stylesheets: [
                'styles/components.css', // Để có d-none và các utility classes
                'modules/gmail/aiquickactions/event-popup.css'
              ]
            });
            
            this.shadowContainer = shadowContainer;
            this.rootNode = shadowContainer.shadowRoot;
            this.overlayElement = overlay;

            // Setup theme observer
            if (typeof window.setupThemeObserver === 'function') {
              window.setupThemeObserver(shadowContainer.shadowRoot);
            }
            
            // Append overlay vào shadow container
            shadowContainer.container.appendChild(overlay);
          } else {
            // Fallback: append trực tiếp vào body
            document.body.appendChild(overlay);
            this.shadowContainer = null;
            this.rootNode = document;
            this.overlayElement = overlay;
          }
          
          // === SỬA LỖI: Đảm bảo overlay được ẩn sau khi inject ===
          overlay.style.display = 'none';
          overlay.classList.add('d-none');
          
          // === CẬP NHẬT i18n ===
          // Sau khi chèn HTML, yêu cầu i18n.js dịch các thuộc tính data-i18n
          if (window.Lang && window.Lang.applyToDOM) {
            window.Lang.applyToDOM(overlay);
          }
          // === KẾT THÚC CẬP NHẬT ===
          
          resolve();
        })
        .catch(error => {
          console.error("EventPopup: Failed to load HTML:", error);
          reject(error);
        });
    });
  },

  /**
   * Cache các DOM elements thường dùng
   */
  cacheElements: function() {
    const root = this.getRootNode();
    const getById = (id) => (root?.getElementById ? root.getElementById(id) : document.getElementById(id));
    const query = (selector) => (root?.querySelector ? root.querySelector(selector) : document.querySelector(selector));

    this.elements = {
      overlay: this.getOverlayElement(),
      container: query('.ai-popup-container'),
      closeBtn: getById('ai-popup-close-btn'),
      manualAddBtn: getById('ai-manual-add-btn'), 
      title: getById('ai-popup-title'),
      loadingState: getById('ai-popup-loading'),
      errorState: getById('ai-popup-error'),
      emptyState: getById('ai-popup-empty'),
      suggestionsState: getById('ai-popup-suggestions'),
      errorMessage: getById('ai-error-message'),
      retryBtn: getById('ai-retry-btn'),
      suggestionsContainer: getById('ai-suggestions-container'),
      selectedCountSpan: getById('ai-selected-count'),
      cancelBtn: getById('ai-cancel-btn'),
      createBtn: getById('ai-create-btn'),
      cardTemplate: getById('ai-suggestion-card-template'),
      infoText: getById('ai-info-text')
    };
    
    if (!this.elements.overlay || !this.elements.cardTemplate || !this.elements.manualAddBtn) {
        console.error("EventPopup: cacheElements thất bại, một số elements bị null.");
    }
  },

  /**
   * Gắn sự kiện (Không thay đổi nhiều)
   */
  bindEvents: function() {
    const el = this.elements;
    
    if (!el.closeBtn || !el.cancelBtn || !el.overlay || !el.retryBtn || !el.createBtn || !el.manualAddBtn) {
        console.error("EventPopup: bindEvents thất bại do thiếu elements.");
        return;
    }
    
    el.closeBtn.addEventListener('click', () => this.hide());
    el.cancelBtn.addEventListener('click', () => this.hide());
    
    el.manualAddBtn.addEventListener('click', () => {
      const newType = this.currentPopupMode; 
      this.addNewManualCard(newType); 
    });
    
    el.overlay.addEventListener('click', (e) => {
      if (e.target === el.overlay) {
        this.hide();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.overlay.style.display !== 'none') {
        this.hide();
      }
    });
    
    el.retryBtn.addEventListener('click', () => {
      this.retry();
    });
    
    el.createBtn.addEventListener('click', () => {
      this.createSelectedEvents();
    });
    
    // Lắng nghe thay đổi ngôn ngữ
    this.setupLanguageListener();
  },
  
  /**
   * Lắng nghe thay đổi ngôn ngữ và cập nhật popup
   */
  setupLanguageListener: function() {
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
      if (namespace === 'sync' && changes.userLang && window.Lang) {
        const newLangCode = changes.userLang.newValue;
        const currentLang = window.Lang.getCurrentLanguage();
        
        if (newLangCode && newLangCode !== currentLang) {
          try {
            // Tải file ngôn ngữ mới
            const langUrl = chrome.runtime.getURL(`lang/${newLangCode}.json`);
            const response = await fetch(langUrl);
            if (!response.ok) throw new Error(`Không thể tải ${newLangCode}.json`);
            const newStrings = await response.json();
            
            // Cập nhật Lang service
            window.Lang.currentLang = newLangCode;
            window.Lang.strings = newStrings;
            document.documentElement.lang = newLangCode;
            
            // Cập nhật popup nếu đang hiển thị
            if (this.elements.overlay && this.elements.overlay.style.display !== 'none') {
              window.Lang.applyToDOM(this.elements.overlay);
              // Cập nhật lại các text động nếu cần
              this.updateDynamicTexts();
            }
            
            console.log(`[EventPopup] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
          } catch (error) {
            console.error('[EventPopup] Lỗi khi cập nhật ngôn ngữ:', error);
          }
        }
      }
    });
  },
  
  /**
   * Cập nhật các text động sau khi đổi ngôn ngữ
   */
  updateDynamicTexts: function() {
    if (!window.Lang) return;
    
    // Cập nhật selected count
    if (this.elements.selectedCountSpan) {
      this.elements.selectedCountSpan.textContent = `${this.selectedCount} ${window.Lang.get('selectedCountLabel')}`;
    }
    
    // Cập nhật nút create
    if (this.elements.createBtn) {
      this.setElementContent(this.elements.createBtn, window.Lang.get('createCalendarBtn'));
      this.elements.createBtn.disabled = (this.selectedCount === 0);
    }
    
    const warnings = this.elements.overlay?.querySelectorAll('.ai-card-time-warning:not(.d-none)');
    if (warnings && window.Lang) {
      warnings.forEach(warningEl => {
        warningEl.dataset.tooltip = window.Lang.get('timeWarningTooltip');
      });
    }
  },

  /**
   * Hiển thị popup với loading state
   * (Cập nhật i18n)
   */
  showLoading: function(messageKey = 'loadingAIText') {
    const el = this.elements;
    
    if (!el.overlay || !el.loadingState || !el.loadingState.querySelector('.ai-loading-text')) {
      console.error("EventPopup: Không thể showLoading, elements bị null.");
      return;
    }

    this.selectedCount = 0;
    if (this.elements.selectedCountSpan && window.Lang) {
        // Cập nhật text "0 được chọn"
        this.elements.selectedCountSpan.textContent = `0 ${window.Lang.get('selectedCountLabel')}`;
    }
    if (this.elements.createBtn && window.Lang) {
        // Cập nhật text nút "Tạo vào Calendar"
        this.elements.createBtn.disabled = true;
        this.setElementContent(this.elements.createBtn, window.Lang.get('createCalendarBtn'));
    }
    
    this.showOverlay();
    this.hideAllStates();
    
    el.loadingState.style.display = 'flex';
    
    // Cập nhật text loading (dịch key nếu là key, nếu không thì dùng thẳng)
    if(window.Lang) {
        const message = window.Lang.get(messageKey);
        el.loadingState.querySelector('.ai-loading-text').textContent = (message.startsWith('[') ? messageKey : message);
    }
  },

  /**
   * Hiển thị popup với error state
   * (Không thay đổi, vì errorMessage đã được dịch từ nơi gọi)
   */
  showError: function(errorMessage) {
    const el = this.elements;
    if (!el.overlay || !el.errorState || !el.errorMessage) {
      // Fallback alert nếu UI thất bại
      alert(errorMessage);
      return;
    }
    this.showOverlay();
    this.hideAllStates();
    el.errorState.style.display = 'flex';
    el.errorMessage.textContent = errorMessage;
  },

  /**
   * Hiển thị popup với empty state
   * (Không thay đổi, đã được xử lý bởi HTML)
   */
  showEmpty: function() {
    const el = this.elements;
    if (!el.overlay || !el.emptyState) return;
    this.showOverlay();
    this.hideAllStates();
    el.emptyState.style.display = 'flex';
  },

  /**
   * Hiển thị popup với event suggestions
   * (Cập nhật i18n)
   */
  showEventPopup: function(suggestions, emailData) {
    console.log("EventPopup: Showing events popup with", suggestions.length, "suggestions");
    
    this.currentSuggestions = suggestions; 
    this.currentEmailData = emailData;
	  this.currentPopupMode = 'event';
    
    const el = this.elements;
    if (!el.overlay || !el.title || !el.suggestionsState || !window.Lang) return;

    // Dịch tiêu đề popup
    this.setElementContent(el.title, window.Lang.get('eventPopupTitle'));
    this.showOverlay();
    
    const banner = el.suggestionsState.querySelector('.ai-info-banner');

    if (suggestions.length === 0) {
      this.hideAllStates();
      el.suggestionsState.style.display = 'block';
      el.suggestionsContainer.innerHTML = ''; 
      
      // Cập nhật banner "Không tìm thấy"
      if (banner && el.infoText) {
         banner.style.display = 'flex';
         this.setElementContent(el.infoText, window.Lang.get('emptyEventMessage'));
         el.infoText.dataset.isDefault = "false"; // Đánh dấu là không phải default
      }
      
      this.updateSelectedCount(); 
      return;
    }
    
    this.hideAllStates();
    el.suggestionsState.style.display = 'block';
    
    // Cập nhật banner "Chọn..." (default)
    if (banner && el.infoText) {
       banner.style.display = 'flex';
       this.setElementContent(el.infoText, window.Lang.get('infoTextDefault'));
       el.infoText.dataset.isDefault = "true"; // Đánh dấu là default
    }
    
    this.renderSuggestions(suggestions);
    this.updateSelectedCount();
  },

  /**
   * Hiển thị popup với task suggestions
   * (Cập nhật i18n)
   */
  showTaskPopup: function(suggestions, emailData) {
    console.log("EventPopup: Showing tasks popup with", suggestions.length, "suggestions");
    
    this.currentSuggestions = suggestions; 
    this.currentEmailData = emailData;
	  this.currentPopupMode = 'task';
    
    const el = this.elements;
    if (!el.overlay || !el.title || !el.suggestionsState || !window.Lang) return;

    // Dịch tiêu đề popup
    this.setElementContent(el.title, window.Lang.get('taskPopupTitle'));
    this.showOverlay();
    
    const banner = el.suggestionsState.querySelector('.ai-info-banner');
    
    if (suggestions.length === 0) {
      this.hideAllStates();
      el.suggestionsState.style.display = 'block';
      el.suggestionsContainer.innerHTML = ''; 
      
      // Cập nhật banner "Không tìm thấy"
      if (banner && el.infoText) {
         banner.style.display = 'flex';
         this.setElementContent(el.infoText, window.Lang.get('emptyTaskMessage'));
         el.infoText.dataset.isDefault = "false"; 
      }
      
      this.updateSelectedCount(); 
      return;
    }
    
    this.hideAllStates();
    el.suggestionsState.style.display = 'block';
    
    // Cập nhật banner "Chọn..." (default)
    if (banner && el.infoText) {
       banner.style.display = 'flex';
       this.setElementContent(el.infoText, window.Lang.get('infoTextDefault'));
       el.infoText.dataset.isDefault = "true";
    }
    
    this.renderSuggestions(suggestions);
    this.updateSelectedCount();
  },
  
  /**
   * HÀM MỚI: Xử lý nút "Nhắc nhở trả lời"
   * (Cập nhật i18n)
   */
  addAndEditReminder: function(emailData) {
    if (!window.Lang) return; // Thoát nếu i18n chưa sẵn sàng
    
    console.log("EventPopup: Adding new reminder card for:", emailData.subject);

    // 1. Set state cho popup
    this.currentPopupMode = 'task';
    this.currentEmailData = emailData;
    // Dịch tiêu đề popup
    this.setElementContent(this.elements.title, window.Lang.get('reminderPopupTitle')); 

    // 2. Tính toán thời gian
    const defaultDueDate = new Date(Date.now() + 2 * 60 * 60 * 1000); 

    // 3. Dịch các chuỗi cho suggestion
    const subject = emailData.subject || window.Lang.get('noTitle');
    const senderName = emailData.sender.name;
    const reminderTitle = window.Lang.get('reminderTitleTemplate', { subject: subject });
    const reminderDesc = 
      `<p>${window.Lang.get('reminderDesc1', { subject: subject })}</p>` +
      `<p>${window.Lang.get('reminderDesc2', { sender: senderName })}</p>`;

    // 4. Tạo một suggestion "Task" thủ công
    const defaultSuggestion = {
      tempId: `suggestion-reminder-${Date.now()}`,
      type: 'task',
      title: reminderTitle,
      description: reminderDesc,
      due: defaultDueDate.toISOString(), 
      allDay: false,
      attendees: [],
      location: '',
      confidence: 1.0, 
      // Dịch source_text
      source_text: window.Lang.get('manualSourceReminder'),
      threadId: emailData.threadId || 'unknown',
      userIndex: emailData.userIndex || 'u/0/',
      vi: { title: reminderTitle, description: reminderDesc },
      en: null,
      currentLang: 'vi',
      createMeet: false 
    };
    
    // 5. Định dạng suggestion
    const formatted = AIEventParser.formatSuggestionForDisplay(defaultSuggestion);
    
    const suggestionState = {
        ...defaultSuggestion, 
        ...formatted,
        due: defaultSuggestion.due 
    };
    
    // 6. Thêm suggestion này
    this.currentSuggestions = [suggestionState];
    
    // 7. Hiển thị popup và render card
    this.showOverlay();
    this.renderSuggestions([suggestionState]);

    // 8. Lấy card vừa tạo
    const card = this.elements.suggestionsContainer.querySelector('.ai-suggestion-card');
    
    if (card) {
      // 9. Tự động check
      const checkbox = card.querySelector('.ai-checkbox');
      if (checkbox) {
        checkbox.checked = true; 
      }
      this.updateSelectedCount(); 

      // 10. BẬT CHẾ ĐỘ EDIT
      this._enterEditMode(suggestionState, 0, card);
      
      // 11. Hiển thị popup
      this.hideAllStates();
      this.elements.suggestionsState.style.display = 'block';
      
      // 12. Ẩn banner info
      const banner = this.elements.suggestionsState.querySelector('.ai-info-banner');
      if (banner) {
         banner.style.display = 'none';
      }
    } else {
        // Fallback (dịch lỗi)
        this.showError(window.Lang.get('errorCreatingReminderCard'));
    }
  },

  /**
   * Hide popup
   * (Không thay đổi)
   */
  hide: function() {
    const el = this.elements;
    if (!el.overlay) return;
    
    this.hideOverlay();
    
    if (el.suggestionsContainer) {
      el.suggestionsContainer.innerHTML = '';
    }
    
    this.currentSuggestions = [];
    this.currentEmailData = null;
  },

  /**
   * Hide all states
   * (Không thay đổi)
   */
  hideAllStates: function() {
    const el = this.elements;
    if (el.loadingState) el.loadingState.style.display = 'none';
    if (el.errorState) el.errorState.style.display = 'none';
    if (el.emptyState) el.emptyState.style.display = 'none';
    if (el.suggestionsState) el.suggestionsState.style.display = 'none';
  },

  /**
   * Render suggestions vào UI
   * (Không thay đổi)
   */
  renderSuggestions: function(suggestions) {
    const container = this.elements.suggestionsContainer;
    if (!container) return;
    
    container.innerHTML = '';
    
    suggestions.forEach((suggestion, index) => {
      const formatted = AIEventParser.formatSuggestionForDisplay(suggestion);
      
      const suggestionState = {
          ...suggestion, 
          ...formatted,  
          vi: { title: formatted.displayTitle, description: formatted.description },
          en: null, 
          currentLang: 'vi',
          tempId: `suggestion-${Date.now()}-${index}`
      };
      
      this.currentSuggestions[index] = suggestionState; 
      
      const card = this.createSuggestionCard(suggestionState, index);
      container.appendChild(card);
    });
  },

  /**
   * Thêm card thủ công
   * (Cập nhật i18n)
   */
  addNewManualCard: function(type = 'event') {
    if (!window.Lang) return; // Thoát nếu i18n chưa sẵn sàng
    
    console.log("EventPopup: Adding new manual card:", type);

    const now = new Date();
    now.setMinutes(0, 0, 0); 
    const defaultStart = new Date(now.getTime());
    const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000); // +1 giờ
    
    // Dịch source_text
    const manualSourceText = window.Lang.get('manualSourceGeneric') || "Tạo thủ công";

    const defaultSuggestion = {
        tempId: `suggestion-manual-${Date.now()}`,
        type: type,
        title: '',
        description: '',
        start: (type === 'event') ? defaultStart.toISOString() : null,
        end: (type === 'event') ? defaultEnd.toISOString() : null,
        due: (type === 'task') ? defaultEnd.toISOString() : null,
        allDay: false,
        attendees: [],
        location: '',
        confidence: 1.0, 
        source_text: manualSourceText, // Đã dịch
        threadId: this.currentEmailData?.threadId || 'unknown',
        userIndex: this.currentEmailData?.userIndex || 'u/0/',
        vi: { title: '', description: '' },
        en: null,
        currentLang: 'vi',
        createMeet: false 
    };
    
    const formatted = AIEventParser.formatSuggestionForDisplay(defaultSuggestion);
    
    const suggestionState = {
        ...formatted,
        ...defaultSuggestion 
    };
    
    suggestionState.start = defaultSuggestion.start;
    suggestionState.end = defaultSuggestion.end;
    suggestionState.due = defaultSuggestion.due;
    
    const newIndex = this.currentSuggestions.push(suggestionState) - 1;
    
    const card = this.createSuggestionCard(suggestionState, newIndex);
    
    this.elements.suggestionsContainer.prepend(card);
    
    this.hideAllStates();
    this.elements.suggestionsState.style.display = 'block';
    
    // Cập nhật banner
    const banner = this.elements.suggestionsState.querySelector('.ai-info-banner');
    if (banner && this.elements.infoText) {
       // Sửa logic kiểm tra banner (không dựa vào text)
       const isDefaultBanner = this.elements.infoText.dataset.isDefault === "true";
       
       if (!isDefaultBanner) {
         // Nếu banner đang là "Không tìm thấy", cập nhật nó
         const bannerTextKey = (type === 'event') ? 'emptyEventMessage' : 'emptyTaskMessage';
         this.setElementContent(this.elements.infoText, window.Lang.get(bannerTextKey));
       } else {
         // Nếu banner đang là default, giữ nguyên
         this.setElementContent(this.elements.infoText, window.Lang.get('infoTextDefault'));
       }
    }
    
    this._enterEditMode(suggestionState, newIndex, card);
    
    const checkbox = card.querySelector('.ai-checkbox');
    if (checkbox) {
      checkbox.checked = true; 
      this.updateSelectedCount();
    }
    card.classList.remove('ai-unchecked');
  },
  
  /**
   * Tạo card
   * (Cập nhật i18n)
   */
  createSuggestionCard: function(suggestion, index) {
    const template = this.elements.cardTemplate;
    if (!template) return null;
    
    const card = template.content.cloneNode(true).querySelector('.ai-suggestion-card');
    card.setAttribute('data-suggestion-id', index);
    card.setAttribute('data-temp-id', suggestion.tempId);
    
    // === CẬP NHẬT i18n ===
    // Dịch các thuộc tính data-i18n trong card vừa clone
    if (window.Lang) {
      window.Lang.applyToDOM(card);
    }
    // === KẾT THÚC CẬP NHẬT ===
    
    this._updateCardDisplay(suggestion, card);
    
    const checkbox = card.querySelector('.ai-checkbox');
    checkbox.addEventListener('change', (e) => {
      card.classList.toggle('ai-unchecked', !e.target.checked);
      this.updateSelectedCount();
    });

    const sourceToggle = card.querySelector('.ai-source-toggle');
    const sourceTextEl = card.querySelector('.ai-source-text');
    sourceToggle.addEventListener('click', () => {
      const isVisible = sourceTextEl.style.display !== 'none';
      sourceTextEl.style.display = isVisible ? 'none' : 'block';
      // Dịch text nút
      const textKey = isVisible ? 'viewSourceText' : 'hideSourceText';
      this.setElementContent(sourceToggle.querySelector('span:last-child'), window.Lang.get(textKey));
    });
    if (suggestion.source_text) {
      sourceTextEl.textContent = `"${suggestion.source_text}"`;
    }

    const editBtn = card.querySelector('.ai-edit-btn');
    editBtn.addEventListener('click', () => {
      this._enterEditMode(suggestion, index, card);
    });

    const btnVi = card.querySelector('.ai-lang-btn-vi');
    const btnEn = card.querySelector('.ai-lang-btn-en');
    
    btnVi.addEventListener('click', () => {
      this._toggleLanguage(suggestion, index, card, 'vi');
    });
    btnEn.addEventListener('click', () => {
      this._toggleLanguage(suggestion, index, card, 'en');
    });

    return card;
  },

  /**
   * Sanitize HTML
   * (Không thay đổi)
   */
  sanitizeHTML: function(html) {
    if (!html) return '';
    if (!/[<>]/.test(html)) {
      return html.replace(/\n/g, '<br>');
    }
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const scripts = temp.querySelectorAll('script, iframe, object, embed');
    scripts.forEach(el => el.remove());
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
      if (el.href && el.href.startsWith('javascript:')) {
        el.removeAttribute('href');
      }
      if (el.src && el.src.startsWith('javascript:')) {
        el.removeAttribute('src');
      }
    });
    return temp.innerHTML;
  },

  /**
   * Cập nhật số lượng đã chọn
   * (Cập nhật i18n)
   */
  updateSelectedCount: function() {
    const checkboxes = document.querySelectorAll('.ai-checkbox:checked');
    this.selectedCount = checkboxes.length;
    
    if (this.elements.selectedCountSpan && window.Lang) {
      // Dịch " được chọn"
      this.elements.selectedCountSpan.textContent = `${this.selectedCount} ${window.Lang.get('selectedCountLabel')}`;
    }
    
    if (this.elements.createBtn) {
      this.elements.createBtn.disabled = this.selectedCount === 0;
    }
  },

  /**
   * Helper: Vào chế độ Edit
   * (Cập nhật i18n)
   */
  _enterEditMode: function(suggestion, index, card) {
    if (!card) {
      card = document.querySelector(`.ai-suggestion-card[data-temp-id="${suggestion.tempId}"]`);
    }
    if (!card) return;

    card.classList.add('ai-is-editing');

    const titleInput = card.querySelector('.ai-edit-title');
    const startInput = card.querySelector('.ai-edit-start');
    const endInput = card.querySelector('.ai-edit-end');
    const attendeesTextarea = card.querySelector('.ai-edit-attendees');
    const locationInput = card.querySelector('.ai-edit-location');
    const dueInput = card.querySelector('.ai-edit-due');
    const descEditor = card.querySelector('.ai-rich-text-editor');
    const meetCheckbox = card.querySelector('.ai-edit-create-meet');
    const meetCheckboxWrapper = card.querySelector('.ai-meet-checkbox-wrapper');
    
    const lang = suggestion.currentLang;
    const langData = suggestion[lang] || suggestion.vi;

    titleInput.value = langData.title;
    descEditor.innerHTML = this.sanitizeHTML(langData.description);
    startInput.value = this._formatISOForInput(suggestion.start);
    endInput.value = this._formatISOForInput(suggestion.end);
    attendeesTextarea.value = (suggestion.attendees || []).join(', ');
    locationInput.value = suggestion.location || '';
    if (suggestion.due) {
      dueInput.value = this._formatISOForInput(suggestion.due);
    }
    meetCheckbox.checked = suggestion.createMeet || false;

    const eventFields = card.querySelectorAll('.ai-event-field-group');
    const taskFields = card.querySelectorAll('.ai-task-field-group');

    if (suggestion.type === 'event') {
      eventFields.forEach(el => el.style.display = 'block');
      taskFields.forEach(el => el.style.display = 'none');
      meetCheckboxWrapper.style.display = 'flex'; 
    } else { // Task
      eventFields.forEach(el => el.style.display = 'none');
      taskFields.forEach(el => el.style.display = 'block');
      meetCheckboxWrapper.style.display = 'none';
    }

    const titleWrapper = titleInput.closest('.ai-rewrite-wrapper');
    const descWrapper = descEditor.closest('.ai-rewrite-wrapper');
    this._bindAIRewrite(titleWrapper, titleInput, suggestion, 'title');
    this._bindAIRewrite(descWrapper, descEditor, suggestion, 'description');

    const cancelBtn = card.querySelector('.ai-edit-cancel-btn');
    cancelBtn.onclick = () => {
      card.classList.remove('ai-is-editing');
      // Cập nhật kiểm tra (dùng key đã dịch)
      const manualSourceText = window.Lang.get('manualSourceGeneric') || "Tạo thủ công";
      if (suggestion.source_text === manualSourceText && !suggestion.title) {
        this._removeSuggestion(suggestion, index, card);
      }
    };

    const saveBtn = card.querySelector('.ai-edit-save-btn');
    saveBtn.onclick = () => {
      this._saveEdits(suggestion, index, card); 
    };
  },

  /**
   * Gắn logic AI Viết lại
   * (Cập nhật i18n)
   */
  _bindAIRewrite: function(wrapper, inputElement, suggestion, fieldName) {
    const submitBtn = wrapper.querySelector('.ai-btn-rewrite-submit');
    const redoBtn = wrapper.querySelector('.ai-btn-rewrite-redo');
    const undoBtn = wrapper.querySelector('.ai-btn-rewrite-undo');
    
    let originalText = (fieldName === 'title') ? inputElement.value : inputElement.innerHTML;
    let aiHasRewritten = false;

    const isEditor = (fieldName !== 'title');

    const updateText = (text) => {
      if (isEditor) {
        inputElement.innerHTML = text;
      } else {
        inputElement.value = text;
      }
    };

    const getText = () => {
      return isEditor ? inputElement.innerHTML : inputElement.value;
    };

    const setButtonsLoading = (isLoading) => {
        if (isLoading) {
            submitBtn.disabled = true;
            redoBtn.disabled = true;
            undoBtn.disabled = true;
            submitBtn.classList.add('ai-loading');
            redoBtn.classList.add('ai-loading');
        } else {
            submitBtn.disabled = false;
            redoBtn.disabled = false;
            undoBtn.disabled = false;
            submitBtn.classList.remove('ai-loading');
            redoBtn.classList.remove('ai-loading');
        }
    };

    const callAI = () => {
      const currentText = getText();
      if (!currentText.trim()) {
        // Dịch alert
        alert(window.Lang.get('errorEmptyRewrite'));
        return;
      }

      if (!aiHasRewritten) {
        originalText = currentText; 
      }

      setButtonsLoading(true); 
      
      chrome.runtime.sendMessage(
        {
          action: 'REWRITE_TEXT',
          text: currentText,
          context: `Viết lại ${fieldName} cho một ${suggestion.type}` 
        },
        (response) => {
          setButtonsLoading(false); 

          if (chrome.runtime.lastError || !response || !response.success) {
            const error = chrome.runtime.lastError?.message || response?.error?.message || "Lỗi AI";
            // Dịch alert
            alert(window.Lang.get('errorAIRewriteFailed') + error);
            return;
          }

          updateText(response.rewrittenText);
          aiHasRewritten = true;

          submitBtn.style.display = 'none';
          redoBtn.style.display = 'inline-flex';
          undoBtn.style.display = 'inline-flex';
        }
      );
    };

    submitBtn.onclick = callAI;
    redoBtn.onclick = callAI; 

    undoBtn.onclick = () => {
      updateText(originalText);
      aiHasRewritten = false;
      submitBtn.style.display = 'inline-flex';
      redoBtn.style.display = 'none';
      undoBtn.style.display = 'none';
    };
    
    submitBtn.style.display = 'inline-flex';
    redoBtn.style.display = 'none';
    undoBtn.style.display = 'none';
  },

  /**
   * Helper: Xóa suggestion
   * (Không thay đổi)
   */
  _removeSuggestion: function(suggestion, index, card) {
    card.remove();
    
    this.currentSuggestions = this.currentSuggestions.filter(
      s => s.tempId !== suggestion.tempId
    );
    
    this.updateSelectedCount();
    
    this.elements.suggestionsContainer.querySelectorAll('.ai-suggestion-card').forEach((c, i) => {
      c.setAttribute('data-suggestion-id', i);
    });
  },

  /**
   * Helper: Lưu các thay đổi từ Edit Mode
   * (Không thay đổi)
   */
  _saveEdits: function(suggestion, index, card) {
    const lang = suggestion.currentLang;
    
    const editedData = {
      title: card.querySelector('.ai-edit-title').value,
      description: card.querySelector('.ai-rich-text-editor').innerHTML,
      start: card.querySelector('.ai-edit-start').value,
      end: card.querySelector('.ai-edit-end').value,
      attendees: card.querySelector('.ai-edit-attendees').value,
      location: card.querySelector('.ai-edit-location').value,
      due: card.querySelector('.ai-edit-due').value,
      createMeet: card.querySelector('.ai-edit-create-meet').checked 
    };
    
    suggestion[lang].title = editedData.title;
    suggestion[lang].description = editedData.description;
    
    if (suggestion.type === 'event') {
      if (editedData.start) { suggestion.start = new Date(editedData.start).toISOString(); }
      if (editedData.end) { suggestion.end = new Date(editedData.end).toISOString(); }
      if (typeof editedData.attendees === 'string') {
        suggestion.attendees = editedData.attendees
          .split(',')
          .map(email => email.trim())
          .filter(email => email.length > 0 && email.includes('@'));
      }
    } else if (suggestion.type === 'task' && editedData.due) {
      suggestion.due = new Date(editedData.due).toISOString();
    }
    suggestion.location = editedData.location;
    suggestion.createMeet = editedData.createMeet;

    const masterSuggestion = this.currentSuggestions[index];
    
    masterSuggestion.start = suggestion.start;
    masterSuggestion.end = suggestion.end;
    masterSuggestion.attendees = suggestion.attendees;
    masterSuggestion.due = suggestion.due;
    masterSuggestion.location = suggestion.location;
    masterSuggestion.createMeet = suggestion.createMeet; 
    
    masterSuggestion[lang].title = editedData.title;
    masterSuggestion[lang].description = editedData.description;
    masterSuggestion.currentLang = lang;
    
    masterSuggestion.title = editedData.title;
    masterSuggestion.description = editedData.description;
    
    const formatted = AIEventParser.formatSuggestionForDisplay(masterSuggestion);
    
    suggestion.displayTime = formatted.displayTime;
    suggestion.displayAttendees = formatted.displayAttendees;
    suggestion.isPast = formatted.isPast;
    
    this._updateCardDisplay(suggestion, card);

    card.classList.remove('ai-is-editing');
  },

  /**
   * Helper: Cập nhật lại card UI
   * (Cập nhật i18n)
   */
  _updateCardDisplay: function(suggestion, card) {
    if (!card) {
      card = document.querySelector(`.ai-suggestion-card[data-temp-id="${suggestion.tempId}"]`);
    }
    if (!card) return;

    const langData = suggestion[suggestion.currentLang] || suggestion.vi;
    
    // Dịch tiêu đề (nếu rỗng)
    card.querySelector('.ai-card-title').textContent = langData.title || window.Lang.get('noTitle');
    const descRow = card.querySelector('.ai-card-description-row');
    const descEl = card.querySelector('.ai-card-description');
    if (langData.description) {
      if (descRow) descRow.style.display = 'flex';
      descEl.innerHTML = this.sanitizeHTML(langData.description);
    } else {
      if (descRow) descRow.style.display = 'none';
      descEl.innerHTML = '';
    }
    
    card.querySelector('.ai-card-time').textContent = suggestion.displayTime;
    const warningEl = card.querySelector('.ai-card-time-warning');
    if (warningEl) {
      const shouldShow = !!suggestion.isPast;
      warningEl.classList.toggle('d-none', !shouldShow);
      warningEl.style.display = shouldShow ? 'inline-flex' : 'none';
      if (shouldShow && window.Lang) {
        warningEl.dataset.tooltip = window.Lang.get('timeWarningTooltip') || warningEl.dataset.tooltip;
      }
    }

    const attendeesRow = card.querySelector('.ai-card-detail-row:has(.ai-card-attendees)');
    if (suggestion.type === 'event') {
        attendeesRow.style.display = 'flex';
        card.querySelector('.ai-card-attendees').textContent = suggestion.displayAttendees;
    } else {
        attendeesRow.style.display = 'none';
    }
    
    const locationRow = card.querySelector('.ai-card-detail-row:has(.ai-card-location)');
    // Đây là chuỗi từ AIEventParser, giả sử nó đã được dịch
    if (suggestion.displayLocation && suggestion.displayLocation !== window.Lang.get('errorNoLocation')) { 
      card.querySelector('.ai-card-location').textContent = suggestion.displayLocation;
      if (locationRow) locationRow.style.display = 'flex';
    } else {
      if (locationRow) locationRow.style.display = 'none';
    }

    const linkRow = card.querySelector('.ai-card-emaillink-row');
    const linkEl = card.querySelector('.ai-card-emaillink');
    if (suggestion.threadId && suggestion.threadId !== 'unknown' && suggestion.source_text !== window.Lang.get('manualSourceGeneric') && suggestion.source_text !== window.Lang.get('manualSourceReminder')) {
      if (linkRow && linkEl) {
          linkRow.style.display = 'flex';
          linkEl.href = `https://mail.google.com/mail/${suggestion.userIndex}#inbox/${suggestion.threadId}`;
      }
    } else {
      if (linkRow) linkRow.style.display = 'none';
    }

    const confidenceValue = Math.round(suggestion.confidence * 100);
    card.querySelector('.ai-confidence-value').textContent = `${confidenceValue}%`;
    card.querySelector('.ai-confidence-bar-fill').style.width = `${confidenceValue}%`;

    const typeBadge = card.querySelector('.ai-card-type-badge');
    typeBadge.textContent = suggestion.type === 'event' ? 'Event' : 'Task';
    typeBadge.classList.toggle('task-badge', suggestion.type === 'task');
    
    this._updateCardLanguageUI(card, suggestion.currentLang);
    
    // Ẩn nút "Xem nguồn" nếu là tạo thủ công (so sánh với key đã dịch)
    const sourceToggle = card.querySelector('.ai-source-toggle');
    if (suggestion.source_text === window.Lang.get('manualSourceGeneric') || suggestion.source_text === window.Lang.get('manualSourceReminder')) {
      sourceToggle.style.display = 'none';
    } else {
      sourceToggle.style.display = 'flex';
    }
  },

  /**
   * Helper: Format ISO date
   * (Không thay đổi)
   */
  _formatISOForInput: function(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset * 60000));
      return localDate.toISOString().slice(0, 16);
    } catch (e) {
      console.warn("Invalid date for input:", isoString);
      return '';
    }
  },

  /**
   * Xử lý chuyển đổi ngôn ngữ
   * (Không thay đổi)
   */
  _toggleLanguage: function(suggestion, index, card, newLang) {
    if (suggestion.currentLang === newLang) {
      return;
    }
    
    suggestion.currentLang = newLang;
    this.currentSuggestions[index].currentLang = newLang;
    
    if (newLang === 'vi') {
      this._updateCardDisplay(suggestion, card);
      return;
    }
    
    if (suggestion.en) {
      this._updateCardDisplay(suggestion, card);
      return;
    }
    
    this._translateSuggestion(suggestion, index, card);
  },

  /**
   * Gọi AI để dịch
   * (Cập nhật i18n)
   */
  _translateSuggestion: function(suggestion, index, card) {
    const viData = suggestion.vi;
    
    console.log("EventPopup: Đang dịch sang EN:", viData.title);
    
    chrome.runtime.sendMessage(
      {
        action: 'TRANSLATE_SUGGESTION',
        title: viData.title,
        description: viData.description,
        targetLang: 'en'
      },
      (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          const errorMessage = chrome.runtime.lastError?.message || response?.error?.message || response?.error || "Lỗi không xác định";
          
          console.error("EventPopup: Dịch thất bại.", "lastError:", (chrome.runtime.lastError?.message || "N/A"), "responseError:", (response?.error?.message || response?.error || "N/A"));
          
          // Dịch alert
          alert(window.Lang.get('errorTranslationFailed') + errorMessage);

          suggestion.currentLang = 'vi'; 
          this.currentSuggestions[index].currentLang = 'vi';
          this._updateCardLanguageUI(card, 'vi');
          return;
        }
        
        console.log("EventPopup: Dịch thành công:", response.result);
        
        suggestion.en = response.result; 
        this.currentSuggestions[index].en = response.result;
        
        this._updateCardDisplay(suggestion, card);
      }
    );
  },
  
  /**
   * Cập nhật UI của nút ngôn ngữ & nút Sửa
   * (Cập nhật i18n - Sửa lỗi)
   */
  _updateCardLanguageUI: function(card, activeLang) {
    const btnVi = card.querySelector('.ai-lang-btn-vi');
    const btnEn = card.querySelector('.ai-lang-btn-en');
    
    btnVi.classList.toggle('active', activeLang === 'vi');
    btnEn.classList.toggle('active', activeLang === 'en');

    // === SỬA LỖI ===
    // Xóa bỏ logic thay đổi text nút "Sửa"
    // `event-popup.html` với `data-i18n="editBtn"` đã tự động xử lý việc này.
    // const editBtn = card.querySelector('.ai-edit-btn');
    // if (editBtn) {
    //   editBtn.textContent = (activeLang === 'en') ? 'Edit' : 'Sửa';
    // }
  },


  /**
   * Retry parsing
   * (Cập nhật i18n)
   */
  retry: function() {
    if (!this.currentEmailData) {
      // Dịch lỗi
      this.showError(window.Lang.get('errorNoRetryData'));
      return;
    }
    
    // Dịch loading
    this.showLoading('retrying'); // 'retrying' là key
    const isTask = this.elements.title.textContent.includes(window.Lang.get('taskPopupTitle'));
    
    if (isTask) {
      AIEventParser.parseEmailForTasks(this.currentEmailData)
        .then(suggestions => {
          this.showTaskPopup(suggestions, this.currentEmailData);
        })
        .catch(error => {
          // Dịch lỗi
          this.showError(window.Lang.get('errorAIGeneric') + error.message);
        });
    } else {
      AIEventParser.parseEmailForEvents(this.currentEmailData)
        .then(suggestions => {
          this.showEventPopup(suggestions, this.currentEmailData);
        })
        .catch(error => {
          // Dịch lỗi
          this.showError(window.Lang.get('errorAIGeneric') + error.message);
        });
    }
  },

  /**
   * Create selected events/tasks
   * (Cập nhật i18n)
   */
  createSelectedEvents: function() {
    if (!window.Lang) return; // Thoát nếu i18n chưa sẵn sàng
    console.log("EventPopup: Creating selected events...");
    
    const cards = document.querySelectorAll('.ai-suggestion-card');
    const selectedSuggestionsData = [];
    const manualSourceText = window.Lang.get('manualSourceGeneric') || "Tạo thủ công";
    
    cards.forEach(card => {
      const checkbox = card.querySelector('.ai-checkbox');
      if (checkbox.checked) {
        const tempId = card.getAttribute('data-temp-id');
        const suggestionIndex = this.currentSuggestions.findIndex(s => s.tempId === tempId);

        if (suggestionIndex !== -1 && this.currentSuggestions[suggestionIndex]) {
            
            const suggestionState = this.currentSuggestions[suggestionIndex];
            
            // So sánh với key đã dịch
            if (suggestionState.source_text === manualSourceText && !suggestionState.title) {
                // Dịch confirm
                if (confirm(window.Lang.get('confirmUnsavedCard'))) {
                    this._saveEdits(suggestionState, suggestionIndex, card);
                    if (!suggestionState.title) {
                        // Dịch alert
                        alert(window.Lang.get('errorMissingTitleOnSave'));
                        return; 
                    }
                } else {
                    return; 
                }
            }

            const lang = suggestionState.currentLang;
            const langData = suggestionState[lang];
            
            const finalSuggestion = {
                ...suggestionState, 
                title: langData.title, 
                description: langData.description, 
            };
            
            delete finalSuggestion.vi;
            delete finalSuggestion.en;
            delete finalSuggestion.currentLang;
            delete finalSuggestion.tempId;

            selectedSuggestionsData.push({
                suggestion: finalSuggestion,
                originalIndex: suggestionIndex, 
                tempId: tempId 
            });
        }
      }
    });
    
    if (selectedSuggestionsData.length === 0) {
      // Dịch alert
      alert(window.Lang.get('errorNoItemSelected'));
      return;
    }
    
    this.elements.createBtn.disabled = true;
    // Dịch nút (với biến)
    this.setElementContent(this.elements.createBtn, window.Lang.get('creatingProgress', { c: 0, t: selectedSuggestionsData.length }));
    
    this.createEventsSequentially(selectedSuggestionsData, 0, []);
  },

  /**
   * Create events sequentially (one by one)
   * (Cập nhật i18n)
   */
  createEventsSequentially: function(selectedSuggestions, currentIndex, errorsOccurred) {
    if (currentIndex >= selectedSuggestions.length) {
      this.showCreationComplete(selectedSuggestions.length, errorsOccurred);
      return;
    }
    
    const { suggestion, tempId } = selectedSuggestions[currentIndex];
    
    console.log(`EventPopup: Creating ${currentIndex + 1}/${selectedSuggestions.length}:`, suggestion.title);
    
    // Dịch nút (với biến)
    this.setElementContent(this.elements.createBtn, window.Lang.get('creatingProgress', { c: currentIndex + 1, t: selectedSuggestions.length }));
    
    CalendarAPI.createEvent(suggestion)
      .then(result => {
        console.log("EventPopup: Created successfully:", result);
        const card = document.querySelector(`.ai-suggestion-card[data-temp-id="${tempId}"]`);
        if (card) {
          card.classList.add('card-success');
          card.classList.remove('card-error');
        }
        this.createEventsSequentially(selectedSuggestions, currentIndex + 1, errorsOccurred);
      })
      .catch(error => {
        console.error("EventPopup: Failed to create:", error);
        errorsOccurred.push(error);
        const card = document.querySelector(`.ai-suggestion-card[data-temp-id="${tempId}"]`);
        if (card) {
          card.classList.add('card-error');
          card.classList.remove('card-success');
        }
        this.createEventsSequentially(selectedSuggestions, currentIndex + 1, errorsOccurred);
      });
  },

  /**
   * Show creation complete
   * (Cập nhật i18n)
   */
  showCreationComplete: function(totalCount, errorsOccurred) {
    if (!window.Lang) return; // Thoát nếu i18n chưa sẵn sàng
    
    if (errorsOccurred && errorsOccurred.length > 0) {
      const successCount = totalCount - errorsOccurred.length;
      // Dịch nút (với biến)
      this.setElementContent(this.elements.createBtn, window.Lang.get('creationCompleteWithErrors', { s: successCount, t: totalCount }));
      this.elements.createBtn.disabled = false;
      
      setTimeout(() => {
        // Dịch nút
        this.setElementContent(this.elements.createBtn, window.Lang.get('createCalendarBtn'));
        // Dịch alert (với biến)
        alert(window.Lang.get('alertCompleteWithErrors', { successCount: successCount, totalCount: totalCount }));
      }, 2000);
      
    } else {
      // Dịch nút (với biến)
      this.setElementContent(this.elements.createBtn, window.Lang.get('creationCompleteSuccess', { t: totalCount }));
      this.elements.createBtn.disabled = false;
      
      setTimeout(() => {
        this.hide();
        // Dịch nút
        this.setElementContent(this.elements.createBtn, window.Lang.get('createCalendarBtn'));
      }, 2000);
    }
  }
};

// Auto-initialize khi DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        EventPopup.init();
        window.EventPopup = EventPopup; // Gán vào window
    }, 1000);
  });
} else {
  setTimeout(() => {
    EventPopup.init();
    window.EventPopup = EventPopup; // Gán vào window
  }, 1000);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventPopup;
}