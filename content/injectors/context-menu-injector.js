// context-menu-injector.js
// Custom context menu functionality for text selection

export class ContextMenu {
  constructor() {
    this.element = null;
    this.selectedText = '';
    this.selectedHtml = '';
    this.showTime = 0; // Thời điểm menu được hiển thị
    this.isShowingFromSelection = false; // Flag để track xem menu đang được hiển thị từ selection
    this.isHandlingAction = false; // Flag để track xem đang xử lý action (ngăn handleTextSelection ẩn menu)
    this.copyButtonOriginalHTML = null; // Lưu HTML gốc của nút copy để reset
    this.enabled = true; // Default enabled, will be loaded from settings
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.create();
    this.attachEvents();
    this.setupMessageListener();
    this.setupSettingsListener();
    console.log('[ContextMenu] Initialized successfully, enabled:', this.enabled);
  }
  
  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get('contextMenuSettings');
      const settings = result.contextMenuSettings || {};
      // Default to true if not set (backward compatibility)
      this.enabled = settings.enabled !== false;
      console.log('[ContextMenu] Settings loaded, enabled:', this.enabled);
    } catch (error) {
      console.error('[ContextMenu] Failed to load settings:', error);
      this.enabled = true; // Default to enabled on error
    }
  }
  
  /**
   * Setup listener for settings changes
   */
  setupSettingsListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.contextMenuSettings) {
        const newSettings = changes.contextMenuSettings.newValue || {};
        this.enabled = newSettings.enabled !== false;
        console.log('[ContextMenu] Settings updated, enabled:', this.enabled);
        
        // Hide menu if disabled
        if (!this.enabled && this.element && this.element.classList.contains('show')) {
          this.hide();
        }
      }
    });
  }

  /**
   * Tạo menu element và thêm vào DOM
   */
  create() {
    // Tạo div container cho menu
    this.element = document.createElement('div');
    this.element.className = 'ai-context-menu';
    
    // Tạo HTML cho các nút bấm
    // Lưu ý: Sử dụng Lang nếu có, nếu không dùng text mặc định
    const getText = (key, fallback) => {
      if (window.Lang && typeof window.Lang.get === 'function') {
        return window.Lang.get(key) || fallback;
      }
      return fallback;
    };

    this.element.innerHTML = `
      <div class="ai-context-menu-icons">
        <button class="ai-context-icon" data-action="chat" data-tooltip="${getText('contextMenuChat', 'Hỏi AI')}">
          <img src="${chrome.runtime.getURL('icons/svg/icon/Messages, Conversation/Chat Round.svg')}" class="icon" />
        </button>
        <button class="ai-context-icon" data-action="translate" data-tooltip="${getText('contextMenuTranslate', 'Dịch')}">
          <img src="${chrome.runtime.getURL('icons/svg/icon/Messages, Conversation/Forward.svg')}" class="icon" />
        </button>
        <button class="ai-context-icon" data-action="search" data-tooltip="${getText('contextMenuSearch', 'Tìm kiếm')}">
          <img src="${chrome.runtime.getURL('icons/svg/icon/Search/Magnifer.svg')}" class="icon" />
        </button>
        <button class="ai-context-icon" data-action="copy" data-tooltip="${getText('contextMenuCopy', 'Copy')}">
          <img src="${chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Copy.svg')}" class="icon" />
        </button>
        <div class="ai-context-icon-wrapper">
          <button class="ai-context-icon" data-action="screenshot" data-tooltip="Chụp ảnh">
            <img src="${chrome.runtime.getURL('icons/svg/icon/Electronic, Devices/Monitor.svg')}" class="icon" />
          </button>
          <div class="ai-screenshot-dropdown">
            <button class="ai-context-icon" data-action="screenshot-visible" data-tooltip="Màn hình hiện tại">
              <img src="${chrome.runtime.getURL('icons/svg/icon/Electronic, Devices/Monitor.svg')}" class="icon" />
            </button>
            <button class="ai-context-icon" data-action="screenshot-area" data-tooltip="Vùng tùy chọn">
              <img src="${chrome.runtime.getURL('icons/svg/icon/Design, Tools/Crop.svg')}" class="icon" />
            </button>
            <button class="ai-context-icon" data-action="screenshot-scroll" data-tooltip="Toàn bộ trang">
              <img src="${chrome.runtime.getURL('icons/svg/icon/Video, Audio, Sound/Full Screen.svg')}" class="icon" />
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Xóa hoàn toàn title và alt attributes để ngăn tooltip mặc định của trình duyệt
    const allButtons = this.element.querySelectorAll('.ai-context-icon');
    allButtons.forEach(button => {
      // Xóa title attribute ngay lập tức - đảm bảo không có title nào
      // Sử dụng setAttribute với empty string rồi remove để đảm bảo xóa hoàn toàn
      button.setAttribute('title', '');
      button.removeAttribute('title');
      
      // Xóa alt attribute từ img - đảm bảo không có alt nào
      const img = button.querySelector('img');
      if (img) {
        // Set empty rồi remove để đảm bảo xóa hoàn toàn
        img.setAttribute('alt', '');
        img.removeAttribute('alt');
        img.setAttribute('aria-hidden', 'true');
      }
      
      // Prevent tooltip mặc định bằng cách xóa title trước khi tooltip hiển thị
      const preventNativeTooltip = (e) => {
        // Xóa title ngay lập tức - set empty rồi remove để đảm bảo xóa hoàn toàn
        if (button.hasAttribute('title')) {
          button.setAttribute('title', '');
          button.removeAttribute('title');
        }
        if (button.title) {
          button.title = '';
          delete button.title;
        }
        // Xóa alt từ img - set empty rồi remove
        const imgEl = button.querySelector('img');
        if (imgEl) {
          if (imgEl.hasAttribute('alt')) {
            imgEl.setAttribute('alt', '');
            imgEl.removeAttribute('alt');
          }
          if (imgEl.alt) {
            imgEl.alt = '';
            delete imgEl.alt;
          }
        }
      };
      
      // Thêm listeners để ngăn tooltip mặc định - sử dụng capture phase để chạy trước
      const preventTooltipHandler = (e) => {
        preventNativeTooltip(e);
        // Đảm bảo xóa title và alt một lần nữa
        if (button.hasAttribute('title')) {
          button.setAttribute('title', '');
          button.removeAttribute('title');
        }
        if (button.title) {
          button.title = '';
          delete button.title;
        }
        const imgEl = button.querySelector('img');
        if (imgEl) {
          if (imgEl.hasAttribute('alt')) {
            imgEl.setAttribute('alt', '');
            imgEl.removeAttribute('alt');
          }
          if (imgEl.alt) {
            imgEl.alt = '';
            delete imgEl.alt;
          }
        }
      };
      
      button.addEventListener('mouseenter', preventTooltipHandler, { capture: true, passive: false });
      button.addEventListener('mouseover', preventTooltipHandler, { capture: true, passive: false });
      button.addEventListener('mousemove', preventTooltipHandler, { capture: true, passive: false });
      
      // Ngăn tooltip bằng cách intercept sự kiện trước khi browser xử lý
      button.addEventListener('mouseenter', (e) => {
        // Xóa title ngay lập tức trong capture phase - set empty rồi remove
        if (button.hasAttribute('title')) {
          button.setAttribute('title', '');
          button.removeAttribute('title');
        }
        if (button.title) {
          button.title = '';
          delete button.title;
        }
      }, { capture: true });
      
      // Thêm một lớp bảo vệ cuối cùng: prevent tooltip bằng cách set title=" " (space) và dùng CSS ẩn
      // Nhưng vì user muốn XÓA không phải ẨN, nên ta không set title gì cả
      // Chỉ dùng MutationObserver và event listeners
      
      // Sử dụng MutationObserver để theo dõi và xóa title nếu được thêm lại
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
            if (button.hasAttribute('title')) {
              button.setAttribute('title', '');
              button.removeAttribute('title');
            }
            if (button.title) {
              button.title = '';
              delete button.title;
            }
          }
          // Kiểm tra img alt
          const imgEl = button.querySelector('img');
          if (imgEl) {
            if (imgEl.hasAttribute('alt')) {
              imgEl.setAttribute('alt', '');
              imgEl.removeAttribute('alt');
            }
            if (imgEl.alt) {
              imgEl.alt = '';
              delete imgEl.alt;
            }
          }
        });
      });
      
      observer.observe(button, {
        attributes: true,
        attributeFilter: ['title']
      });
      
      // Quan sát img element
      if (img) {
        observer.observe(img, {
          attributes: true,
          attributeFilter: ['alt']
        });
      }
      
      // Lưu observer để có thể disconnect sau này
      button._tooltipObserver = observer;
    });
    
    // Lưu HTML gốc của nút copy để có thể reset sau này
    const copyButton = this.element.querySelector('[data-action="copy"]');
    if (copyButton) {
      this.copyButtonOriginalHTML = copyButton.innerHTML;
    }
    
    // ✅ Load shadow-dom-helper nếu chưa có
    if (typeof window.createShadowContainer !== 'function') {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('utils/shadow-dom-helper.js');
      document.head.appendChild(script);
    }
    
    // ✅ Tạo Shadow DOM container
    let shadowContainer = null;
    if (typeof window.createShadowContainer === 'function') {
      shadowContainer = window.createShadowContainer({
        id: 'ai-context-menu-shadow',
        className: 'ai-context-menu-shadow-container',
        stylesheets: ['content/css/content.css']
      });
      
      // Setup theme observer
      if (typeof window.setupThemeObserver === 'function') {
        window.setupThemeObserver(shadowContainer.shadowRoot);
      }
      
      // Append menu vào shadow container
      shadowContainer.container.appendChild(this.element);
      this.shadowContainer = shadowContainer; // Store reference
    } else {
      // Fallback: append trực tiếp vào body
      document.body.appendChild(this.element);
    }
    
    // Đảm bảo menu có style cơ bản ngay cả khi CSS chưa load
    this.element.style.position = 'fixed';
    this.element.style.zIndex = '2147483643';
    this.element.style.opacity = '0';
    this.element.style.visibility = 'hidden';
    this.element.style.pointerEvents = 'none';
  }

  /**
   * Gắn các event listeners
   */
  attachEvents() {
    // Lắng nghe sự kiện mouseup để phát hiện text selection
    document.addEventListener('mouseup', (e) => {
      // Bỏ qua nếu click vào menu hoặc dropdown để tránh menu bị nhảy
      if (this.element && this.element.contains(e.target)) {
        return;
      }
      this.handleTextSelection(e);
    });

    // Lắng nghe sự kiện selectionchange để phát hiện khi selection bị mất
    let selectionChangeTimeout = null;
    document.addEventListener('selectionchange', () => {
      // Chỉ kiểm tra nếu menu đang hiển thị
      if (!this.element || !this.element.classList.contains('show')) {
        return;
      }

      // Bỏ qua nếu đang xử lý action
      if (this.isHandlingAction) {
        return;
      }

      // Debounce để tránh kiểm tra quá nhiều lần
      if (selectionChangeTimeout) {
        clearTimeout(selectionChangeTimeout);
      }

      selectionChangeTimeout = setTimeout(() => {
        // Kiểm tra lại điều kiện sau delay
        if (!this.element || !this.element.classList.contains('show') || this.isHandlingAction) {
          return;
        }

        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        // Nếu không còn selection và menu đang hiển thị, ẩn menu
        if (selectedText.length === 0) {
          console.log('[ContextMenu] Selection cleared - hiding menu');
          this.isShowingFromSelection = false;
          this.hide();
        }
      }, 50);
    });

    // Lắng nghe click vào các nút trong menu
    if (this.element) {
      this.element.addEventListener('click', (e) => {
        // Ngăn chặn sự kiện lan truyền để menu không bị hide ngay lập tức
        e.stopPropagation();

        const button = e.target.closest('.ai-context-icon');
        if (button) {
          const action = button.dataset.action;
          if (action) {
            // Kiểm tra xem button có nằm trong dropdown không
            const isInDropdown = button.closest('.ai-screenshot-dropdown');
            
            // Xử lý toggle dropdown cho screenshot button (chỉ khi không trong dropdown)
            if (action === 'screenshot' && !isInDropdown) {
              this.toggleScreenshotDropdown(button);
              return;
            }
            
            // Xử lý các action screenshot khác (trong dropdown)
            if (action === 'screenshot-visible' || action === 'screenshot-area' || action === 'screenshot-scroll') {
              this.handleScreenshotAction(action, button);
              return;
            }
            
            // Các action khác (không phải screenshot) - đóng dropdown nếu đang mở
            if (action !== 'screenshot') {
              // Đóng dropdown trước khi xử lý action
              this.hideScreenshotDropdown();
              this.handleAction(action, button);
            }
          }
        }
      });
    }

    // Ẩn menu khi click ra ngoài
    // Lưu ý: Bỏ qua click ngay sau khi menu được hiển thị từ selection để tránh ẩn menu ngay lập tức
    document.addEventListener('click', (e) => {
      if (!this.element) return;
      
      const screenshotWrapper = this.element.querySelector('.ai-context-icon-wrapper');
      const dropdown = screenshotWrapper ? screenshotWrapper.querySelector('.ai-screenshot-dropdown') : null;
      const isDropdownOpen = dropdown && dropdown.classList.contains('show');
      
      // Bỏ qua nếu đang xử lý action và dropdown không mở
      if (this.isHandlingAction && !isDropdownOpen) {
        return;
      }
      
      // Kiểm tra xem click có nằm trong menu hoặc dropdown không
      const clickedInMenu = this.element.contains(e.target);
      const clickedInWrapper = screenshotWrapper && screenshotWrapper.contains(e.target);
      
      // Nếu click ra ngoài menu hoàn toàn
      if (!clickedInMenu) {
        // Nếu menu vừa mới được hiển thị từ selection (trong vòng 300ms), bỏ qua click này
        if (this.isShowingFromSelection) {
          const timeSinceShow = Date.now() - this.showTime;
          console.log('[ContextMenu] Click detected, timeSinceShow:', timeSinceShow, 'ms');
          if (timeSinceShow < 300) {
            // Bỏ qua click này - menu vừa mới được hiển thị
            console.log('[ContextMenu] Ignoring click - menu just shown from selection');
            return;
          }
          // Đã qua 300ms, reset flag
          this.isShowingFromSelection = false;
        }
        
        // Click ra ngoài menu -> đóng cả dropdown và menu
        console.log('[ContextMenu] Click outside menu - hiding dropdown and menu');
        this.hideScreenshotDropdown();
        this.hide();
      } else if (isDropdownOpen && !clickedInWrapper) {
        // Nếu dropdown đang mở và click vào phần khác của menu (ngoài wrapper)
        // Đóng cả dropdown và menu để đảm bảo UI sạch sẽ
        console.log('[ContextMenu] Dropdown open, click outside wrapper - hiding dropdown and menu');
        this.hideScreenshotDropdown();
        this.hide();
      } else if (!clickedInWrapper && screenshotWrapper) {
        // Click trong menu nhưng ngoài wrapper (dropdown đã đóng) -> không làm gì
        // Menu vẫn mở để người dùng có thể chọn action khác
      }
    });

    // Ẩn menu khi nhấn phím ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.element?.classList.contains('show')) {
        this.hide();
      }
    });
  }

  /**
   * Xử lý text selection khi mouseup
   */
  handleTextSelection(e) {
    // Kiểm tra xem context menu có được bật không
    if (!this.enabled) {
      console.log('[ContextMenu] Context menu is disabled in settings');
      return;
    }
    
    // Bỏ qua nếu đang xử lý action (để tránh ẩn menu khi click vào button)
    if (this.isHandlingAction) {
      console.log('[ContextMenu] Ignoring handleTextSelection - action in progress');
      return;
    }

    // Sử dụng setTimeout để chờ trình duyệt cập nhật selection
    setTimeout(() => {
      // Kiểm tra lại flag sau delay (có thể đã bị thay đổi)
      if (this.isHandlingAction || !this.enabled) {
        console.log('[ContextMenu] Ignoring handleTextSelection after delay - action in progress or disabled');
        return;
      }

      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      console.log('[ContextMenu] handleTextSelection - selectedText length:', selectedText.length);
      
      if (selectedText.length > 0) {
        // Có text được bôi đen
        this.selectedText = selectedText;
        this.selectedHtml = this.getSelectionHtml(selection);
        // Đánh dấu rằng menu đang được hiển thị từ selection
        this.isShowingFromSelection = true;
        // Hiển thị menu tại vị trí chuột
        console.log('[ContextMenu] Showing menu at:', e.clientX, e.clientY);
        this.show(e.clientX, e.clientY);
      } else {
        // Không có text được bôi đen, ẩn menu nếu không đang xử lý action
        if (!this.isHandlingAction && this.element && this.element.classList.contains('show')) {
          console.log('[ContextMenu] handleTextSelection - no selection, hiding menu');
          this.isShowingFromSelection = false;
          this.hide();
        }
      }
    }, 50); // Tăng delay lên 50ms để đảm bảo selection được cập nhật đúng
  }

  /**
   * Lấy HTML của vùng selection
   */
  getSelectionHtml(selection) {
    if (!selection || selection.rangeCount === 0) {
      return '';
    }

    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    return container.innerHTML;
  }

  /**
   * Hiển thị menu tại vị trí (x, y)
   */
  show(x, y) {
    if (!this.element) return;

    // Đặt vị trí tạm thời để có thể tính toán kích thước
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    this.element.style.visibility = 'hidden'; // Ẩn nhưng vẫn chiếm không gian để tính toán
    
    // Force reflow để trình duyệt tính toán kích thước
    this.element.offsetHeight;
    
    // Lấy kích thước thực tế của menu
    const menuRect = this.element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Ước tính kích thước nếu chưa có (fallback)
    const menuWidth = menuRect.width || 200;
    const menuHeight = menuRect.height || 50;
    
    let posX = x;
    let posY = y - menuHeight - 10; // Đặt menu phía trên chuột

    // Điều chỉnh nếu menu bị tràn ra ngoài
    if (posX + menuWidth > viewportWidth) {
      posX = viewportWidth - menuWidth - 10;
    }
    if (posX < 10) {
      posX = 10;
    }
    
    if (posY < 10) {
      posY = y + 10; // Đặt menu phía dưới chuột nếu không đủ chỗ phía trên
    }
    if (posY + menuHeight > viewportHeight) {
      posY = viewportHeight - menuHeight - 10;
    }

    // Cập nhật vị trí cuối cùng
    this.element.style.left = `${posX}px`;
    this.element.style.top = `${posY}px`;
    this.element.style.visibility = 'visible'; // Hiển thị lại
    this.element.style.pointerEvents = 'auto'; // Bật lại pointer events
    this.element.style.opacity = '1'; // Đảm bảo hiện hoàn toàn kể cả khi CSS chưa load
    
    // Thêm class 'show' để hiển thị menu với animation
    this.element.classList.add('show');
    
    // Ghi lại thời điểm menu được hiển thị
    this.showTime = Date.now();
    
    // Đảm bảo xóa hoàn toàn tooltip mặc định khi show menu
    this.removeAllBrowserTooltips();
    
    // Reset nút copy về trạng thái ban đầu khi hiển thị menu
    this.resetCopyButton();
    
    console.log('[ContextMenu] Menu shown at position:', posX, posY, 'isShowingFromSelection:', this.isShowingFromSelection);
  }

  /**
   * Xóa hoàn toàn tất cả tooltip mặc định của trình duyệt
   */
  removeAllBrowserTooltips() {
    if (!this.element) return;
    
    const allButtons = this.element.querySelectorAll('.ai-context-icon');
    allButtons.forEach(button => {
      // Xóa title ngay lập tức - đảm bảo xóa hoàn toàn
      // Set empty rồi remove để đảm bảo browser không cache tooltip
      if (button.hasAttribute('title')) {
        button.setAttribute('title', '');
        button.removeAttribute('title');
      }
      // Đảm bảo không có title attribute nào
      if (button.title) {
        button.title = '';
        delete button.title;
      }
      
      // Xóa alt từ img - đảm bảo xóa hoàn toàn
      const img = button.querySelector('img');
      if (img) {
        if (img.hasAttribute('alt')) {
          img.setAttribute('alt', '');
          img.removeAttribute('alt');
        }
        // Đảm bảo không có alt property nào
        if (img.alt) {
          img.alt = '';
          delete img.alt;
        }
        img.setAttribute('aria-hidden', 'true');
      }
    });
  }

  /**
   * Reset nút copy về trạng thái ban đầu
   */
  resetCopyButton() {
    if (!this.element) return;
    
    const copyButton = this.element.querySelector('[data-action="copy"]');
    if (copyButton && this.copyButtonOriginalHTML) {
      copyButton.innerHTML = this.copyButtonOriginalHTML;
      copyButton.style.background = '';
      // Đảm bảo không có title và alt sau khi reset - xóa hoàn toàn
      if (copyButton.hasAttribute('title')) {
        copyButton.setAttribute('title', '');
        copyButton.removeAttribute('title');
      }
      if (copyButton.title) {
        copyButton.title = '';
        delete copyButton.title;
      }
      const img = copyButton.querySelector('img');
      if (img) {
        if (img.hasAttribute('alt')) {
          img.setAttribute('alt', '');
          img.removeAttribute('alt');
        }
        if (img.alt) {
          img.alt = '';
          delete img.alt;
        }
        img.setAttribute('aria-hidden', 'true');
      }
      // Đảm bảo MutationObserver vẫn hoạt động
      if (!copyButton._tooltipObserver) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
              if (copyButton.hasAttribute('title')) {
                copyButton.removeAttribute('title');
              }
            }
            const imgEl = copyButton.querySelector('img');
            if (imgEl && imgEl.hasAttribute('alt')) {
              imgEl.removeAttribute('alt');
            }
          });
        });
        observer.observe(copyButton, {
          attributes: true,
          attributeFilter: ['title']
        });
        if (img) {
          observer.observe(img, {
            attributes: true,
            attributeFilter: ['alt']
          });
        }
        copyButton._tooltipObserver = observer;
      }
    }
  }

  /**
   * Ẩn menu
   * @param {boolean} clearSelection - Nếu true, sẽ xóa selection. Mặc định false để không xóa selection khi chỉ ẩn menu
   */
  hide(clearSelection = false) {
    // Ẩn dropdown screenshot nếu có
    this.hideScreenshotDropdown();
    
    // Cleanup tooltip observers trước khi hide
    if (this.element) {
      const allButtons = this.element.querySelectorAll('.ai-context-icon');
      allButtons.forEach(button => {
        if (button._tooltipObserver) {
          button._tooltipObserver.disconnect();
          delete button._tooltipObserver;
        }
      });
    }
    
    if (this.element) {
      this.element.classList.remove('show');
      this.element.style.visibility = 'hidden';
      this.element.style.pointerEvents = 'none';
      this.element.style.opacity = '0'; // Ẩn hoàn toàn kể cả khi CSS chưa load
    }
    this.selectedText = '';
    this.selectedHtml = '';
    this.showTime = 0; // Reset thời điểm hiển thị
    this.isShowingFromSelection = false; // Reset flag
    // Không reset isHandlingAction ở đây vì có thể action vẫn đang xử lý
    
    // Chỉ xóa selection khi được yêu cầu rõ ràng (ví dụ: sau khi copy thành công)
    if (clearSelection && window.getSelection && typeof window.getSelection === 'function') {
      try {
        const selection = window.getSelection();
        if (selection.removeAllRanges && typeof selection.removeAllRanges === 'function') {
          selection.removeAllRanges();
        } else if (selection.empty && typeof selection.empty === 'function') {
          selection.empty();
        }
      } catch (e) {
        // Ignore errors when clearing selection
      }
    }
  }

  /**
   * Xử lý khi click vào một action button
   */
  handleAction(action, buttonElement) {
    // Đánh dấu đang xử lý action để tránh handleTextSelection ẩn menu
    this.isHandlingAction = true;

    // Lưu selectedText và selectedHtml trước khi hide (vì hide() sẽ xóa chúng)
    const selectedText = this.selectedText;
    const selectedHtml = this.selectedHtml;

    if (!selectedText || selectedText.trim().length === 0) {
      console.warn('[ContextMenu] No text selected');
      this.isHandlingAction = false; // Reset flag
      return;
    }

    // Xử lý action 'copy' riêng (không cần gửi đến background)
    if (action === 'copy') {
      this.handleCopy(selectedText, buttonElement);
      return; // handleCopy sẽ reset flag sau khi hoàn thành
    }

    // Ẩn menu ngay lập tức cho các action khác
    this.hide();
    this.isHandlingAction = false; // Reset flag

    // Các action khác: gửi đến background script
    // Nếu là 'translate', gửi selectedHtml; ngược lại gửi selectedText
    const content = action === 'translate' ? (selectedHtml || selectedText) : selectedText;
    
    chrome.runtime.sendMessage({
      action: 'contextMenuAction',
      type: action,
      selectedText: content
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[ContextMenu] Error sending message:', chrome.runtime.lastError.message);
      } else {
        console.log('[ContextMenu] Action sent:', action, response);
      }
    });
  }

  /**
   * Xử lý copy action
   */
  async handleCopy(textToCopy, buttonElement) {
    // Hiển thị hiệu ứng trên button
    if (buttonElement) {
      // Thay icon bằng checkmark
      buttonElement.classList.add('context-menu-success');
      buttonElement.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    }

    let copySuccess = false;

    try {
      await navigator.clipboard.writeText(textToCopy);
      console.log('[ContextMenu] Text copied to clipboard');
      copySuccess = true;
      
      // Hiển thị thông báo (nếu có Lang)
      if (window.Lang && typeof window.Lang.get === 'function') {
        console.log(window.Lang.get('contextMenuCopied') || 'Đã copy văn bản');
      }
    } catch (error) {
      console.error('[ContextMenu] Failed to copy text:', error);
      
      // Fallback: sử dụng document.execCommand
      // Tạm thời disable selection detection
      this.isShowingFromSelection = false;
      
      // Lưu handler gốc trước khi disable
      const originalHandleTextSelection = this.handleTextSelection.bind(this);
      
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        document.body.appendChild(textArea);
        
        // Tạm thời disable mouseup listener để tránh trigger khi select textarea
        this.handleTextSelection = () => {}; // Disable temporarily
        
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        
        document.body.removeChild(textArea);
        console.log('[ContextMenu] Text copied using fallback method');
        copySuccess = true;
        
        // Restore selection handler sau một delay ngắn
        setTimeout(() => {
          this.handleTextSelection = originalHandleTextSelection;
        }, 100);
      } catch (fallbackError) {
        console.error('[ContextMenu] Fallback copy also failed:', fallbackError);
        // Restore handler ngay lập tức nếu có lỗi
        this.handleTextSelection = originalHandleTextSelection;
      }
    }

    // Ẩn menu sau một delay ngắn để người dùng thấy hiệu ứng
    // Chỉ xóa selection nếu copy thành công
    setTimeout(() => {
      this.hide(copySuccess); // Xóa selection nếu copy thành công
      this.isHandlingAction = false; // Reset flag sau khi hoàn thành
    }, 600);
  }

  /**
   * Toggle dropdown menu của screenshot
   */
  toggleScreenshotDropdown(button) {
    if (!this.element) return;
    
    // Đánh dấu đang xử lý action để tránh handleTextSelection làm menu nhảy
    this.isHandlingAction = true;
    
    const wrapper = button.closest('.ai-context-icon-wrapper');
    if (!wrapper) return;
    
    const dropdown = wrapper.querySelector('.ai-screenshot-dropdown');
    if (!dropdown) return;
    
    const isVisible = dropdown.classList.contains('show');
    
    // Ẩn tất cả dropdown khác trước
    this.hideScreenshotDropdown();
    
    // Toggle dropdown hiện tại
    if (!isVisible) {
      dropdown.classList.add('show');
      // Reset flag sau một chút để người dùng có thể click vào dropdown
      setTimeout(() => {
        // Giữ flag true nếu dropdown vẫn đang hiển thị
        if (!dropdown.classList.contains('show')) {
          this.isHandlingAction = false;
        }
      }, 100);
    } else {
      // Nếu đang ẩn dropdown, reset flag
      this.isHandlingAction = false;
    }
  }

  /**
   * Ẩn dropdown menu của screenshot
   */
  hideScreenshotDropdown() {
    if (!this.element) return;
    
    const dropdowns = this.element.querySelectorAll('.ai-screenshot-dropdown');
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('show');
    });
    
    // Reset flag nếu đang không có dropdown nào hiển thị
    if (dropdowns.length === 0 || Array.from(dropdowns).every(d => !d.classList.contains('show'))) {
      // Giữ flag một chút để tránh trigger ngay lập tức
      setTimeout(() => {
        // Chỉ reset nếu không có dropdown nào đang hiển thị
        const anyVisible = this.element.querySelector('.ai-screenshot-dropdown.show');
        if (!anyVisible) {
          this.isHandlingAction = false;
        }
      }, 50);
    }
  }

  /**
   * Xử lý action screenshot từ dropdown
   */
  handleScreenshotAction(action, button) {
    // Đánh dấu đang xử lý action để tránh menu bị trigger lại
    this.isHandlingAction = true;
    
    // Ẩn dropdown
    this.hideScreenshotDropdown();
    
    // Ẩn menu ngay lập tức
    this.hide();
    
    // Reset flag sau một chút để đảm bảo menu đã ẩn
    setTimeout(() => {
      this.isHandlingAction = false;
    }, 100);
    
    // Gửi message để trigger screenshot với type cụ thể
    chrome.runtime.sendMessage({
      action: 'contextMenuAction',
      type: action, // screenshot-visible, screenshot-area, screenshot-scroll
      forChat: false // Screenshot từ context menu không phải cho chat
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[ContextMenu] Error sending screenshot message:', chrome.runtime.lastError.message);
      } else {
        console.log('[ContextMenu] Screenshot action sent:', action, response);
      }
    });
  }

  /**
   * Xử lý screenshot action (legacy - giữ để tương thích)
   */
  handleScreenshot() {
    // Gọi với type mặc định là screenshot-visible
    this.handleScreenshotAction('screenshot-visible', null);
  }

  /**
   * Setup message listener để nhận lệnh ẩn menu từ background
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'hideContextMenu') {
        this.hide();
        sendResponse({ success: true });
      }
      return false;
    });
  }

  /**
   * Destroy menu (cleanup)
   */
  destroy() {
    this.hide();
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
