/*
 * File: root/modules/gmail/summarizer.js
 * (ĐÃ NÂNG CẤP v8 - i18n)
 * - Đã cập nhật toàn bộ file để sử dụng window.Lang.get()
 * - injectModalHtml() đã được cập nhật với data-i18n attributes.
 * - Tất cả alert(), innerText, placeholder động đã được quốc tế hóa.
 */

console.log("Module AI Summarizer đã tải.");

// Khởi tạo (Cập nhật để disable deprecation warnings)
const gmail_summarizer = window.gmailInstance || new Gmail();
if (!window.gmailInstance) {
  window.gmailInstance = gmail_summarizer;
}
// Disable deprecation warnings for this instance
if (gmail_summarizer) {
  gmail_summarizer.DISABLE_OLD_GMAIL_API_DEPRECATION_WARNINGS = true;
}

// === (MỚI) HÀM HELPER ĐỊNH DẠNG MODEL NAME ===
// (Không thay đổi)
function formatModelName(fullModelId) {
    if (!fullModelId) return '...';
    try {
        const parts = fullModelId.split('/');
        if (parts.length < 2) return fullModelId;
        const modelName = parts[1];
        const provider = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        return `${modelName} (${provider})`;
    } catch (e) {
        return fullModelId; // Fallback
    }
}

// === (MỚI) HÀM HELPER TẠO METADATA (YÊU CẦU 2) ===
// (Không thay đổi)
function createMetadataFooter(role, modelId = null) {
    const metadataDiv = document.createElement('div');
    metadataDiv.className = 'ai-chat-metadata';
    
    // Lấy ngôn ngữ hiện tại để định dạng ngày giờ
    const langCode = window.Lang ? window.Lang.getCurrentLanguage() : 'vi-VN';
    
    const now = new Date();
    const time = now.toLocaleTimeString(langCode, { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString(langCode, { day: '2-digit', month: '2-digit', year: '2-digit' });
    
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'timestamp';
    timestampSpan.textContent = `${time}, ${date}`;
    metadataDiv.appendChild(timestampSpan);
    
    if (role === 'ai' && modelId) {
        const modelSpan = document.createElement('span');
        modelSpan.className = 'model-name';
        modelSpan.textContent = formatModelName(modelId);
        metadataDiv.appendChild(modelSpan);
    }
    
    return metadataDiv;
}


// === 1. TẠO ĐỐI TƯỢNG TOÀN CỤC ===
// (Không thay đổi)
window.AITools = window.AITools || {
  currentGeneratedDraft: "",
  currentSummary: "", 
  currentOptions: {
    length: 'auto',
    formality: 'auto',
    format: 'email',
    tone: 'auto'
  },
  
  startSummaryProcess: null,
  displaySummary: null,
  showError: null,
  skipToComposeView: null,
  handleCompose: null,
  handleQuery: null,
  handleRefine: null,
  handleCopy: null,
  handleInsert: null,
  attachReusableHandlers: null
};

let currentThreadObject = null;
let openedComposeWindow = null;

// Helper function để tạo icon img tag
function getIconImg(iconPath, size = 'sm', alt = '') {
  const iconUrl = chrome.runtime.getURL(iconPath);
  const sizeClass = size === 'sm' ? 'icon-sm' : size === 'md' ? 'icon-md' : 'icon-lg';
  const sizePx = size === 'sm' ? '14px' : size === 'md' ? '18px' : '24px';
  return `<img src="${iconUrl}" alt="${alt}" class="icon ${sizeClass}" style="vertical-align: middle; width: ${sizePx}; height: ${sizePx}; max-width: ${sizePx}; max-height: ${sizePx};">`;
}

const ICON_COPY = getIconImg('icons/svg/icon/Essentional, UI/Copy.svg', 'md', 'Copy');
const ICON_REGENERATE = getIconImg('icons/svg/icon/Arrows/Refresh.svg', 'md', 'Regenerate');
const ICON_INSERT = getIconImg('icons/svg/icon/Essentional, UI/Check Circle.svg', 'md', 'Insert');
// Icon cho control wrapper và button - dùng size 'sm' (14px) để phù hợp với text
const ICON_LANGUAGE = getIconImg('icons/svg/icon/Text Formatting/Text.svg', 'sm', 'Language');
const ICON_OPTIONS = getIconImg('icons/svg/icon/Settings, Fine Tuning/Settings.svg', 'sm', 'Options');

// === 0. THEME SUPPORT ===
/**
 * Áp dụng theme từ storage
 */
async function applyTheme() {
    try {
        const data = await chrome.storage.local.get('theme');
        const theme = data.theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Áp dụng cho modal nếu đã tồn tại
        const modal = document.getElementById('ai-summary-modal');
        if (modal) {
            modal.setAttribute('data-theme', theme);
        }
    } catch (e) {
        console.warn('[Gmail Summarizer] Error applying theme:', e);
    }
}

/**
 * Setup theme listener
 */
function setupThemeListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.theme) {
            const newTheme = changes.theme.newValue;
            if (newTheme === 'light' || newTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', newTheme);
                
                // Cập nhật modal
                const modal = document.getElementById('ai-summary-modal');
                if (modal) {
                    modal.setAttribute('data-theme', newTheme);
                }
            }
        }
    });
}

// === 2. GMAIL OBSERVERS & INJECTORS ===
// (Cập nhật i18n cho tên nút - Đợi i18n load xong)
gmail_summarizer.observe.on('load', async () => {
  await injectModalHtml();
  await applyTheme();
  setupThemeListener();
  setupLanguageListener();
});
// === Hàm helper để lấy thread_id với nhiều phương pháp fallback ===
const getThreadId = () => {
  // Phương pháp 1: Dùng Gmail API
  let thread_id = null;
  if (gmail_summarizer.new && gmail_summarizer.new.get) {
    thread_id = gmail_summarizer.new.get.thread_id();
  } else if (gmail_summarizer.get) {
    thread_id = gmail_summarizer.get.thread_id();
  }
  
  // Phương pháp 2: Từ DOM element
  if (!thread_id) {
    const threadElem = document.querySelector('[data-thread-perm-id]');
    if (threadElem) {
      thread_id = threadElem.getAttribute('data-thread-perm-id');
      if (thread_id && thread_id.startsWith('#')) {
        thread_id = thread_id.substring(1);
      }
    }
  }
  
  // Phương pháp 3: Từ URL
  if (!thread_id && window.EmailDOMReader && window.EmailDOMReader.getThreadId) {
    thread_id = window.EmailDOMReader.getThreadId();
  }
  
  // Phương pháp 4: Parse từ URL trực tiếp
  if (!thread_id) {
    const hash = window.location.hash;
    const match = hash.match(/\/([a-zA-Z0-9_-]{10,})$/);
    if (match && match[1]) {
      thread_id = match[1];
    }
  }
  
  return thread_id;
};

// === Hàm chèn nút "Soạn AI" vào dưới cùng email (bên cạnh Reply/Reply all/Forward) ===
// Học từ cách AISidePanel chèn nút - đơn giản và hiệu quả
const COMPOSE_AI_BUTTON_ID = 'ai-compose-view-trigger-button';
const REPLY_BUTTON_CONTAINER_SELECTOR = 'div.amn';

function injectComposeAIButton(targetContainer) {
  // Kiểm tra xem đã chèn nút chưa (giống AISidePanel)
  if (document.getElementById(COMPOSE_AI_BUTTON_ID)) return;
  if (!window.Lang) return;
  
  // Kiểm tra container có chứa nút Reply/Reply all/Forward không
  const hasReplyButton = targetContainer.querySelector('button[aria-label="Trả lời"]') ||
                         targetContainer.querySelector('button[aria-label="Reply"]') ||
                         targetContainer.querySelector('button[aria-label="Trả lời tất cả"]') ||
                         targetContainer.querySelector('button[aria-label="Reply all"]') ||
                         targetContainer.querySelector('button[aria-label="Chuyển tiếp"]') ||
                         targetContainer.querySelector('button[aria-label="Forward"]');
  
  if (!hasReplyButton) return;
  
  // Tìm nút Forward (nút cuối cùng) để chèn sau nó
  const forwardButton = targetContainer.querySelector('button[aria-label="Chuyển tiếp"]') ||
                        targetContainer.querySelector('button[aria-label="Forward"]');
  const replyAllButton = targetContainer.querySelector('button[aria-label="Trả lời tất cả"]') ||
                         targetContainer.querySelector('button[aria-label="Reply all"]');
  const replyButton = targetContainer.querySelector('button[aria-label="Trả lời"]') ||
                      targetContainer.querySelector('button[aria-label="Reply"]');
  
  const lastButton = forwardButton || replyAllButton || replyButton;
  if (!lastButton) return;
  
  // Tìm span wrapper của nút cuối cùng
  const targetSpan = lastButton.closest('span[data-is-tooltip-wrapper="true"]');
  if (!targetSpan) return;
  
  // Tạo nút "Soạn AI" với cấu trúc giống Gmail
  const aiButtonSpan = document.createElement('span');
  aiButtonSpan.setAttribute('data-is-tooltip-wrapper', 'true');
  
  const aiButtonDiv = document.createElement('div');
  aiButtonDiv.className = 'bzc-Uw-LV-Zr';
  aiButtonDiv.setAttribute('data-is-touch-wrapper', 'true');
  
  const aiButton = document.createElement('button');
  aiButton.id = COMPOSE_AI_BUTTON_ID;
  aiButton.className = 'AeBiU-I AeBiU-I-ql-JX-O AeBiU-I-ql-ay5-ays AeBiU-I-ql-Uw AeBiU-kSE8rc-FoKg4d-a2N-YoZ4jf WYwWZb ai-compose-trigger-button ai-view-trigger-button';
  aiButton.type = 'button';
  aiButton.setAttribute('aria-label', window.Lang.get('composeAIBtn') || 'Soạn AI');
  aiButton.setAttribute('tabindex', '0');
  aiButton.setAttribute('role', 'link');
  
  const sparkleIcon = getIconImg('icons/svg/icon/Design, Tools/icon-ai-menu.svg', 'md', 'AI');
  const buttonText = window.Lang.get('composeAIBtn') || 'Soạn AI';
  
  aiButton.innerHTML = `
    <span class="XjoK4b"></span>
    <span class="UTNHae" jscontroller="LBaJxb" jsname="m9ZlFb" soy-skip=""></span>
    <span class="AeBiU-ano"></span>
    <span class="AeBiU-ank-Rtc0Jf AeBiU-ank-Rtc0Jf-ql-O" jsname="Xr1QTb">
      <span class="notranslate" aria-hidden="true">${sparkleIcon}</span>
    </span>
    <span jsname="V67aGc" class="AeBiU-anl" aria-hidden="true">${buttonText}</span>
    <span class="AeBiU-ank-Rtc0Jf AeBiU-ank-Rtc0Jf-ql-Sh" jsname="UkTUqb"></span>
  `;
  
  aiButtonDiv.appendChild(aiButton);
  aiButtonSpan.appendChild(aiButtonDiv);
  
  // Chèn sau span của nút cuối cùng
  targetSpan.parentNode.insertBefore(aiButtonSpan, targetSpan.nextSibling);
  
  // Xử lý click
  aiButton.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const thread_id = getThreadId();
    if (!thread_id) {
      console.warn("AI Summarizer: Không tìm thấy thread_id");
      alert(window.Lang.get('errorCannotReadEmail') || "Không thể lấy thông tin email.");
      return;
    }
    
    // Click nút Reply để mở compose window
    const replyBtn = document.querySelector('button[aria-label="Trả lời tất cả"]') ||
                     document.querySelector('button[aria-label="Reply all"]') ||
                     document.querySelector('button[aria-label="Trả lời"]') ||
                     document.querySelector('button[aria-label="Reply"]');
    if (replyBtn) replyBtn.click();
    
    showSummaryModal();
    startSummaryProcess(thread_id, document.getElementById('ai-modal-main-content'));
  };
}

// === Observer logic (giống AISidePanel) ===
if (gmail_summarizer && gmail_summarizer.observe) {
  // Observer cho view_thread
  gmail_summarizer.observe.on('view_thread', (thread) => {
    currentThreadObject = thread;
    setTimeout(() => {
      const target = document.querySelector(REPLY_BUTTON_CONTAINER_SELECTOR);
      if (target && !document.getElementById(COMPOSE_AI_BUTTON_ID)) {
        injectComposeAIButton(target);
      }
    }, 1000);
  });
  
  // MutationObserver (giống AISidePanel)
  const mainContainer = document.querySelector('div[role="main"]');
  if (mainContainer) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          const target = document.querySelector(REPLY_BUTTON_CONTAINER_SELECTOR);
          if (target && !document.getElementById(COMPOSE_AI_BUTTON_ID)) {
            injectComposeAIButton(target);
          }
        }
      }
    });

    observer.observe(mainContainer, {
      childList: true,
      subtree: true
    });
  }
  
  // Kiểm tra định kỳ để đảm bảo nút luôn hiển thị (mỗi 2 giây)
  let checkInterval = null;
  const checkAndInject = () => {
    const target = document.querySelector(REPLY_BUTTON_CONTAINER_SELECTOR);
    if (target && !document.getElementById(COMPOSE_AI_BUTTON_ID)) {
      injectComposeAIButton(target);
    }
  };
  
  // Bắt đầu kiểm tra định kỳ sau khi Gmail load
  if (gmail_summarizer.observe.is_loaded && gmail_summarizer.observe.is_loaded()) {
    checkInterval = setInterval(checkAndInject, 2000);
  } else {
    gmail_summarizer.observe.on('load', () => {
      checkInterval = setInterval(checkAndInject, 2000);
    });
  }
  
  // Lưu interval để có thể clear sau này nếu cần
  window._aiComposeButtonCheckInterval = checkInterval;
}
let composeWindowInterval = null;
gmail_summarizer.observe.on('compose', (composeWindow) => {
    openedComposeWindow = composeWindow;
    if (composeWindowInterval) clearInterval(composeWindowInterval);
    const injectComposeButton = () => {
        try {
            if (!composeWindow.$el || composeWindow.$el.closest('body').length === 0) {
                clearInterval(composeWindowInterval);
                return;
            }
            const sendButton = composeWindow.$el.find('div[data-tooltip^="Gửi"]');
            if (!sendButton || sendButton.length === 0) return;
            const sendButtonGroup = sendButton.closest('.dC'); 
            if (!sendButtonGroup || sendButtonGroup.length === 0) return;
            const mainToolbar = sendButtonGroup.parent();
            if (!mainToolbar || mainToolbar.length === 0) return;
            if (mainToolbar.find('.ai-compose-trigger-button').length > 0) return; 
            const aiButton = document.createElement('button');
            aiButton.className = 'ai-compose-trigger-button'; 
            aiButton.type = 'button';
            // Dịch nút
            const sparkleIcon = getIconImg('icons/svg/icon/Design, Tools/icon-ai-menu.svg', 'md', 'AI');
            aiButton.innerHTML = sparkleIcon + ' ' + (window.Lang ? window.Lang.get('composeAIBtn') : 'Soạn AI');
            sendButtonGroup.before(aiButton);
            aiButton.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                const modalRoot = document.getElementById('ai-modal-main-content');
                const composeType = composeWindow.type();
                // Dịch context
                const newEmailContext = window.Lang ? window.Lang.get('composeNewEmailContext') : "Đây là một email mới.";
                const replyContext = window.Lang ? window.Lang.get('composeReplyContext') : "Đang trả lời/chuyển tiếp email.";
                
                if (composeType === 'compose') {
                    showSummaryModal();
                    skipToComposeView(newEmailContext, modalRoot);
                } else {
                    const thread_id = composeWindow.thread_id();
                    if (!thread_id) {
                        showSummaryModal();
                        skipToComposeView(replyContext, modalRoot);
                    } else {
                        showSummaryModal();
                        startSummaryProcess(thread_id, modalRoot);
                    }
                }
            };
        } catch (error) { console.warn("AI Summarizer (Compose): Lỗi khi chèn nút lặp lại", error); }
    };
    injectComposeButton();
    composeWindowInterval = setInterval(injectComposeButton, 1000);
    gmail_summarizer.observe.on('compose_destroyed', (destroyedCompose) => {
        if (destroyedCompose === composeWindow && composeWindowInterval) {
            clearInterval(composeWindowInterval);
            composeWindowInterval = null;
        }
    });
});

// === 3. MODAL HELPER FUNCTIONS (MAINLY FOR POPUP) ===
// (Không thay đổi)
function skipToComposeView(context = "Soạn email mới...", rootElement) {
    if (!rootElement) rootElement = document.getElementById('ai-modal-main-content');
    if (rootElement) {
        rootElement.style.height = 'auto';
        window.AITools.skipToComposeView(context, rootElement);
    } else { console.error("summarizer.js: Không tìm thấy #ai-modal-main-content!"); }
}
async function startSummaryProcess(thread_id, rootElement) {
    if (!rootElement) rootElement = document.getElementById('ai-modal-main-content');
    if (rootElement) {
        rootElement.style.height = null;
        await window.AITools.startSummaryProcess(thread_id, rootElement);
    } else { console.error("summarizer.js: Không tìm thấy #ai-modal-main-content!"); }
}
function displaySummary(summaryMarkdown, rootElement, modelId) {
    if (!rootElement) rootElement = document.getElementById('ai-modal-main-content');
    window.AITools.displaySummary(summaryMarkdown, rootElement, modelId);
}
function showError(message, rootElement) {
    if (!rootElement) rootElement = document.getElementById('ai-modal-main-content');
    window.AITools.showError(message, rootElement);
}
function handleCompose(rootElement) {
    if (!rootElement) rootElement = document.getElementById('ai-modal-main-content');
    window.AITools.handleCompose(rootElement);
}
function handleRefine(rootElement) {
    if (!rootElement) rootElement = document.getElementById('ai-modal-main-content');
    window.AITools.handleRefine(rootElement);
}
function showSummaryModal() {
  const modal = document.getElementById('ai-summary-modal');
  const modalContent = document.getElementById('ai-modal-main-content');
  if (modal) {
    modal.style.display = 'block';
    modalContent.style.display = 'flex'; 
    document.getElementById('ai-modal-footer').classList.remove('show');
    if (!modal.dataset.positioned) {
        modalContent.style.width = '700px'; 
        const rect = modalContent.getBoundingClientRect();
        const newTop = (window.innerHeight - rect.height) / 2;
        const newLeft = (window.innerWidth - rect.width) / 2;
        modalContent.style.top = Math.max(10, newTop) + 'px'; 
        modalContent.style.left = Math.max(10, newLeft) + 'px';
    }
    setTimeout(() => modal.classList.add('show'), 10);
  }
}
function closeSummaryModal() {
  const modal = document.getElementById('ai-summary-modal');
  const modalContent = document.getElementById('ai-modal-main-content');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        modalContent.style.display = 'none';
    }, 300);
  }
  const errorEl = document.getElementById('ai-summary-error');
  if (errorEl) errorEl.style.display = 'none';
}
function makeModalDraggable(modalOverlay, modalContent, dragHandle) {
  let offsetX = 0, offsetY = 0;
  dragHandle.onmousedown = dragMouseDown;
  function dragMouseDown(e) {
    e = e || window.event; e.preventDefault(); e.stopPropagation();
    modalOverlay.dataset.positioned = 'true'; 
    offsetX = e.clientX - modalContent.offsetLeft;
    offsetY = e.clientY - modalContent.offsetTop;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  function elementDrag(e) {
    e = e || window.event; e.preventDefault(); e.stopPropagation();
    modalContent.style.top = (e.clientY - offsetY) + "px";
    modalContent.style.left = (e.clientX - offsetX) + "px";
  }
  function closeDragElement() {
    document.onmouseup = null; document.onmousemove = null;
  }
}
function makeModalResizable(modalContent, resizerHandle) {
  let original_w = 0, original_h = 0, original_x = 0, original_y = 0;
  let minWidth = 400; let minHeight = 350;
  resizerHandle.onmousedown = function(e) {
    e.preventDefault(); e.stopPropagation();
    original_w = parseFloat(getComputedStyle(modalContent, null).getPropertyValue('width').replace('px', ''));
    original_h = parseFloat(getComputedStyle(modalContent, null).getPropertyValue('height').replace('px', ''));
    original_x = e.clientX; original_y = e.clientY;
    document.onmousemove = elementResize;
    document.onmouseup = stopResize;
  }
  function elementResize(e) {
    e.preventDefault(); e.stopPropagation();
    const width = original_w + (e.clientX - original_x);
    const height = original_h + (e.clientY - original_y);
    modalContent.style.width = Math.max(minWidth, width) + 'px';
    modalContent.style.height = Math.max(minHeight, height) + 'px';
  }
  function stopResize() {
    document.onmousemove = null; document.onmouseup = null;
  }
}

/**
 * Chèn HTML Modal
 * (Cập nhật i18n toàn bộ - Đợi i18n load xong)
 */
async function injectModalHtml() {
  if (document.getElementById('ai-summary-modal')) return;
  
  // Đợi i18n load xong trước khi inject
  if (window.Lang && window.Lang.initializationPromise) {
    await window.Lang.initializationPromise;
  }
  
  // Danh sách ngôn ngữ (tạm thời) - Lý tưởng nhất là lấy từ window.Lang.getSupportedLanguages()
  // Nhưng file i18n.js của bạn chỉ có 5 ngôn ngữ, tôi sẽ dùng 5 ngôn ngữ đó
  const languages = [
      { code: 'vi',    nameKey: 'lang_vi',    name: 'Tiếng Việt' },
      { code: 'en',    nameKey: 'lang_en',    name: 'English' },
      { code: 'ja',    nameKey: 'lang_ja',    name: '日本語' },
      { code: 'ko',    nameKey: 'lang_ko',    name: '한국어' },
      { code: 'zh-CN', nameKey: 'lang_zh_CN', name: '简体中文' } 
      // LƯU Ý: file lang.json của bạn dùng "lang_zh" cho Tiếng Trung
      // Tôi sẽ dùng "lang_zh"
  ];
  
  // Tạo các <option>
  const langOptionsHtml = (window.Lang ? 
    window.Lang.getSupportedLanguages() : languages)
    .map(lang => 
      // Lấy tên ngôn ngữ từ file JSON, ví dụ: lang.name = "Tiếng Việt"
      `<option value="${lang.code}" data-i18n="${lang.nameKey || `lang_${lang.code}`}">${lang.name}</option>`
    ).join('');

  const modalHtml = `
    <div class="ai-modal-overlay" id="ai-summary-modal">
      <div class="ai-modal-content d-none" id="ai-modal-main-content" draggable="false">
        
        <div class="ai-modal-header" id="ai-modal-drag-handle" draggable="false">
          <div class="ai-modal-title" data-i18n="composeModalTitle">
            <img src="${chrome.runtime.getURL('icons/svg/icon/Design, Tools/icon-ai-menu.svg')}" alt="AI" class="icon icon-md" style="vertical-align: middle; margin-right: 4px; width: 18px; height: 18px;"> AI Trả lời & Soạn thảo
          </div>
          <span class="ai-modal-close" id="ai-modal-close-btn" data-i18n-title="closeBtnLabel" title="Đóng">&times;</span>
        </div>
        
        <div class="ai-modal-body">
          <div id="ai-summary-top-pane">
            <div id="ai-summary-error"></div>
            <div class="ai-modal-loading" id="ai-modal-loading">
              <div class="spinner"></div>
              <p data-i18n="summarizingText">Đang tóm tắt email...</p>
            </div>
            <div id="ai-summary-result"></div>
          </div>
          <div id="ai-summary-bottom-pane" class="d-none">
            <div class="ai-compose-input-wrapper">
              <div id="ai-compose-prompt-input" 
                   contenteditable="true" 
                   data-i18n-placeholder="composePlaceholder"
                   data-placeholder="Nhập nội dung bạn muốn trả lời (ví dụ: 'đồng ý', 'hỏi lại deadline')... AI sẽ giúp bạn soạn thảo đầy đủ."></div>
              <div class="ai-compose-controls">
                <div class="ai-control-wrapper">
                  ${ICON_LANGUAGE}
                  <select id="ai-compose-lang-select" class="ai-control-select">
                    <!-- Các ngôn ngữ được chèn tại đây -->
                    ${langOptionsHtml}
                  </select>
                </div>
                <button id="ai-compose-options-btn" class="ai-control-btn" data-i18n-title="optionsBtnLabel" title="Thay đổi tùy chọn">
                  ${ICON_OPTIONS}
                  <span id="ai-compose-options-label" data-i18n="optAuto">Tự động</span>
                </button>
                <button id="ai-compose-send-btn" data-i18n="createAIBtn">Tạo</button> 
              </div>
            </div>
          </div>
        </div>
        
        <div class="ai-modal-footer" id="ai-modal-footer">
          <div class="ai-footer-left">
            <input id="ai-refine-prompt-input" data-i18n-placeholder="refinePlaceholder" placeholder="Làm cho nó ngắn hơn, chuyên nghiệp hơn..."/>
          </div>
          <div class="ai-footer-right">
            <button id="ai-copy-btn" class="ai-footer-icon-btn" data-i18n-title="copyBtnTitle" title="Copy">${ICON_COPY}</button>
            <button id="ai-regen-btn" class="ai-footer-icon-btn" data-i18n-title="regenerateBtnTitle" title="Tạo lại">${ICON_REGENERATE}</button>
            <button id="ai-insert-btn" class="ai-footer-icon-btn" data-i18n-title="insertBtnTitle" title="Chèn vào email">${ICON_INSERT}</button>
          </div>
        </div>
        
        <div class="ai-modal-resizer" id="ai-modal-resizer"></div>
        
        <!-- POPUP TÙY CHỌN (Đã dịch) -->
        <div class="ai-options-popup" id="ai-options-popup">
          <div class="ai-options-section">
            <div class="ai-options-title" data-i18n="optLength">Độ dài</div>
            <div class="ai-options-group" data-group="length">
              <button class="ai-option-btn selected" data-value="auto" data-i18n="optAuto">Tự động</button>
              <button class="ai-option-btn" data-value="short" data-i18n="optShort">Ngắn</button>
              <button class="ai-option-btn" data-value="medium" data-i18n="optMedium">Trung bình</button>
              <button class="ai-option-btn" data-value="long" data-i18n="optLong">Dài</button>
            </div>
          </div>
          <div class="ai-options-section">
            <div class="ai-options-title" data-i18n="optFormality">Độ trang trọng</div>
            <div class="ai-options-group" data-group="formality">
              <button class="ai-option-btn selected" data-value="auto" data-i18n="optAuto">Tự động</button>
              <button class="ai-option-btn" data-value="friendly" data-i18n="optFriendly">Thân mật</button>
              <button class="ai-option-btn" data-value="neutral" data-i18n="optNeutral">Trung lập</button>
              <button class="ai-option-btn" data-value="formal" data-i18n="optFormal">Chính thức</button>
            </div>
          </div>
          <div class="ai-options-section">
            <div class="ai-options-title" data-i18n="optFormat">Định dạng</div>
            <div class="ai-options-group" data-group="format">
              <button class="ai-option-btn selected" data-value="email" data-i18n="optEmail">Email</button>
              <button class="ai-option-btn" data-value="message" data-i18n="optMessage">Tin nhắn</button>
              <button class="ai-option-btn" data-value="comment" data-i18n="optComment">Bình luận</button>
              <button class="ai-option-btn" data-value="paragraph" data-i18n="optParagraph">Đoạn văn</button>
            </div>
          </div>
          <div class="ai-options-section">
            <div class="ai-options-title" data-i18n="optTone">Giọng điệu</div>
            <div class="ai-options-group" data-group="tone">
              <button class="ai-option-btn selected" data-value="auto" data-i18n="optAuto">Tự động</button>
              <button class="ai-option-btn" data-value="enthusiastic" data-i18n="optEnthusiastic">Nhiệt tình</button>
              <button class="ai-option-btn" data-value="humorous" data-i18n="optHumorous">Hài hước</button>
              <button class="ai-option-btn" data-value="caring" data-i18n="optCaring">Quan tâm</button>
              <button class="ai-option-btn" data-value="humble" data-i18n="optHumble">Khiêm tốn</button>
              <button class="ai-option-btn" data-value="optimistic" data-i18n="optOptimistic">Lạc quan</button>
              <button class="ai-option-btn" data-value="empathetic" data-i18n="optEmpathetic">Đồng cảm</button>
              <button class="ai-option-btn" data-value="direct" data-i18n="optDirect">Thẳng thắn</button>
              <button class="ai-option-btn" data-value="sincere" data-i18n="optSincere">Chân thành</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
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
      id: 'ai-summary-modal-shadow',
      className: 'ai-summary-modal-shadow-container',
      stylesheets: ['modules/gmail/aiSummarizer/summarizer.css']
    });
    
    // Setup theme observer
    if (typeof window.setupThemeObserver === 'function') {
      window.setupThemeObserver(shadowContainer.shadowRoot);
    }
    
    // Inject HTML vào shadow container
    shadowContainer.container.innerHTML = modalHtml;
    
    // Thêm CSS trực tiếp vào shadow DOM để đảm bảo icon size được áp dụng
    const style = document.createElement('style');
    style.textContent = `
      .ai-control-wrapper img,
      .ai-control-wrapper img.icon,
      .ai-control-wrapper img.icon-sm,
      .ai-control-wrapper img.icon-md,
      .ai-control-wrapper .icon,
      .ai-control-wrapper .icon-sm,
      .ai-control-wrapper .icon-md {
        width: 14px !important;
        height: 14px !important;
        max-width: 14px !important;
        max-height: 14px !important;
      }
      .ai-control-btn img,
      .ai-control-btn img.icon,
      .ai-control-btn img.icon-sm,
      .ai-control-btn img.icon-md,
      .ai-control-btn .icon,
      .ai-control-btn .icon-sm,
      .ai-control-btn .icon-md {
        width: 14px !important;
        height: 14px !important;
        max-width: 14px !important;
        max-height: 14px !important;
      }
    `;
    shadowContainer.shadowRoot.appendChild(style);
    
    // Set style trực tiếp vào icon elements sau khi inject HTML
    // Sử dụng MutationObserver để đảm bảo element đã được inject
    const setIconSizes = () => {
      const wrapper = shadowContainer.container.querySelector('.ai-control-wrapper');
      const btn = shadowContainer.container.querySelector('.ai-control-btn');
      
      if (wrapper) {
        const icon = wrapper.querySelector('img');
        if (icon) {
          // Set style trực tiếp bằng cssText để đảm bảo override mọi style khác
          const currentStyle = icon.getAttribute('style') || '';
          icon.setAttribute('style', currentStyle + ' width: 14px !important; height: 14px !important; max-width: 14px !important; max-height: 14px !important;');
          // Cũng set bằng style object
          icon.style.setProperty('width', '14px', 'important');
          icon.style.setProperty('height', '14px', 'important');
          icon.style.setProperty('max-width', '14px', 'important');
          icon.style.setProperty('max-height', '14px', 'important');
        }
      }
      
      if (btn) {
        const icon = btn.querySelector('img');
        if (icon) {
          // Set style trực tiếp bằng cssText để đảm bảo override mọi style khác
          const currentStyle = icon.getAttribute('style') || '';
          icon.setAttribute('style', currentStyle + ' width: 14px !important; height: 14px !important; max-width: 14px !important; max-height: 14px !important;');
          // Cũng set bằng style object
          icon.style.setProperty('width', '14px', 'important');
          icon.style.setProperty('height', '14px', 'important');
          icon.style.setProperty('max-width', '14px', 'important');
          icon.style.setProperty('max-height', '14px', 'important');
        }
      }
    };
    
    // Gọi ngay và sau một chút để đảm bảo
    setIconSizes();
    setTimeout(setIconSizes, 50);
    setTimeout(setIconSizes, 200);
    
    // Sử dụng MutationObserver để theo dõi khi element được thêm vào
    const observer = new MutationObserver(() => {
      setIconSizes();
    });
    observer.observe(shadowContainer.container, {
      childList: true,
      subtree: true
    });
    
    // Dừng observer sau 2 giây
    setTimeout(() => observer.disconnect(), 2000);
  } else {
    // Fallback: inject trực tiếp vào body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  // === CẬP NHẬT i18n ===
  // Dịch các thuộc tính data-i18n của modal vừa chèn
  if (window.Lang && window.Lang.applyToDOM) {
    window.Lang.applyToDOM(document.getElementById('ai-summary-modal'));
  }
  
  // Gắn sự kiện (Không thay đổi)
  document.getElementById('ai-modal-close-btn').onclick = closeSummaryModal;
  const modalRoot = document.getElementById('ai-modal-main-content');
  document.getElementById('ai-compose-send-btn').onclick = () => {
      window.AITools.handleCompose(modalRoot);
  };
  const refineInput = document.getElementById('ai-refine-prompt-input');
  refineInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.AITools.handleRefine(modalRoot);
      }
  };
  document.getElementById('ai-regen-btn').onclick = () => {
      window.AITools.handleRefine(modalRoot);
  }; 
  document.getElementById('ai-copy-btn').onclick = window.AITools.handleCopy;
  document.getElementById('ai-insert-btn').onclick = window.AITools.handleInsert;
  const optionsPopup = document.getElementById('ai-options-popup');
  const optionsBtn = document.getElementById('ai-compose-options-btn');
  const toggleOptionsPopup = (e) => {
    e.stopPropagation();
    const btnRect = optionsBtn.getBoundingClientRect();
    optionsPopup.style.display = optionsPopup.style.display === 'block' ? 'none' : 'block';
    optionsPopup.style.bottom = (window.innerHeight - btnRect.top + 10) + 'px';
    optionsPopup.style.right = (window.innerWidth - btnRect.right) + 'px';
  };
  optionsBtn.onclick = toggleOptionsPopup;
  
  // Hàm cập nhật text nút Tùy chọn
  // (Cập nhật i18n)
  function updateOptionsButtonLabel() {
    const optionsLabel = document.getElementById('ai-compose-options-label');
    if (!optionsLabel || !window.Lang) return; // Thoát nếu i18n chưa sẵn sàng

    // Lấy text đã được dịch từ các nút option
    const lengthTextEl = document.querySelector('.ai-options-group[data-group="length"] .ai-option-btn.selected');
    const toneTextEl = document.querySelector('.ai-options-group[data-group="tone"] .ai-option-btn.selected');
    if (!lengthTextEl || !toneTextEl) return;
    
    const lengthText = lengthTextEl.textContent; // "Ngắn", "Short", v.v.
    const toneText = toneTextEl.textContent;     // "Hài hước", "Humorous", v.v.
    
    let parts = [];
    if (window.AITools.currentOptions.length !== 'auto') parts.push(lengthText);
    if (window.AITools.currentOptions.tone !== 'auto') parts.push(toneText);
    
    if (parts.length === 0) { 
      // Dịch "Tự động"
      optionsLabel.innerText = window.Lang.get('optAuto'); 
    } else { 
      optionsLabel.innerText = parts.join(', '); 
    }
  }
  
  optionsPopup.addEventListener('click', (e) => {
    if (e.target.classList.contains('ai-option-btn')) {
      const btn = e.target;
      const group = btn.closest('.ai-options-group');
      const groupName = group.dataset.group;
      group.querySelectorAll('.ai-option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      window.AITools.currentOptions[groupName] = btn.dataset.value;
      updateOptionsButtonLabel(); // Gọi hàm đã dịch
    }
  });
  document.addEventListener('click', (e) => {
    if (optionsPopup.style.display === 'block' && 
        !optionsPopup.contains(e.target) && 
        e.target !== optionsBtn &&
        (optionsBtn && !optionsBtn.contains(e.target))
       ) {
      optionsPopup.style.display = 'none';
    }
  });
  updateOptionsButtonLabel(); // Gọi hàm đã dịch
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSummaryModal(); });
  makeModalDraggable(document.getElementById('ai-summary-modal'), document.getElementById('ai-modal-main-content'), document.getElementById('ai-modal-drag-handle'));
  makeModalResizable(document.getElementById('ai-modal-main-content'), document.getElementById('ai-modal-resizer'));
}

// ==========================================================
// === PHẦN 3: CÁC HÀM TÁI SỬ DỤNG (ĐÃ CẬP NHẬT i18n) ===
// ==========================================================

/**
 * (NÂNG CẤP V4 - SỬA LỖI) Tóm tắt
 * (Cập nhật i18n)
 */
window.AITools.startSummaryProcess = async function(arg1, arg2) {
    
    let rootElement;
    if (arg1 && typeof arg1.querySelector === 'function') {
        rootElement = arg1;
    } else if (arg2 && typeof arg2.querySelector === 'function') {
        rootElement = arg2;
    } else {
        rootElement = document.getElementById('ai-side-panel-container') || document.getElementById('ai-modal-main-content');
    }

    if (!rootElement || !window.Lang) { 
      console.error("AITools: Không tìm thấy rootElement hoặc window.Lang (i18n.js)!"); 
      return; 
    }

    const loadingEl = rootElement.querySelector('#ai-modal-loading');
    const topPane = rootElement.querySelector('#ai-summary-top-pane');
    const resultEl = rootElement.querySelector('#ai-summary-result');
    const errorEl = rootElement.querySelector('#ai-summary-error');
    const bottomPane = rootElement.querySelector('#ai-summary-bottom-pane');
    const footer = rootElement.querySelector('#ai-modal-footer');
    const chatScroller = rootElement.querySelector('.ai-modal-body');

    topPane.style.display = 'block'; 
    loadingEl.style.display = 'flex';
    resultEl.innerHTML = '';
    errorEl.style.display = 'none';
    if (bottomPane) bottomPane.style.display = 'none'; 
    if (footer) footer.classList.remove('show'); 
    window.AITools.currentGeneratedDraft = "";
    window.AITools.currentSummary = "";
    
    try {
      console.log("AITools: Đang gọi EmailDOMReader.readEmails()...");
      const emailData = await window.EmailDOMReader.readEmails();

      if (!emailData || !emailData.emails || emailData.emails.length === 0) {
        // Dịch lỗi
        window.AITools.showError(window.Lang.get('errorEmailDOMReader'), rootElement);
        if (rootElement.id === 'ai-modal-main-content' && window.AITools.skipToComposeView) {
            // Dịch context
            window.AITools.skipToComposeView(window.Lang.get('errorCannotReadEmail'), rootElement);
        }
        return;
      }

      const { subject, emails } = emailData;

      const fullEmailText = emails.map((email, index) => {
          return `=== Email ${index + 1} ===\nTừ: ${email.from.name || email.from.address}\nThời gian: ${email.timestamp}\nChủ đề: ${subject}\nNội dung:\n${email.content_text}`;
      }).join('\n\n---\n\n');
      
      // Lấy ngôn ngữ hiện tại để yêu cầu AI tóm tắt
      const currentLangName = window.Lang.get(`lang_${window.Lang.getCurrentLanguage().replace('-', '_')}`) || "Tiếng Việt";
      
      chrome.runtime.sendMessage(
          {
            action: 'SUMMARIZE_EMAIL', 
            text: fullEmailText,
            subject: subject, 
            emailCount: emails.length,
            language: currentLangName, // Đã dịch
            prompt: `Tóm tắt chuỗi email sau bằng ${currentLangName}.
            QUAN TRỌNG: Định dạng đầu ra của bạn PHẢI LÀ MARKDOWN.
            Sử dụng Markdown cho bảng, danh sách, in đậm.
            Tạo một bảng tóm tắt với 2 cột: "Ngày / Người gửi" và "Nội dung chính".
            Sau đó, liệt kê "Các điểm quan trọng cần ghi nhớ" bằng danh sách bullet.
            
            Đây là chuỗi email:
            ${fullEmailText}`
          },
          (response) => {
            loadingEl.style.display = 'none';
            if (chrome.runtime.lastError) {
                // Dịch lỗi
                const errorMsg = chrome.runtime.lastError.message.includes("context invalidated") 
                    ? window.Lang.get('errorContextInvalidated')
                    : window.Lang.get('errorConnection') + chrome.runtime.lastError.message;
                window.AITools.showError(errorMsg, rootElement);

            } else if (!response || !response.success) {
                // Dịch lỗi
                window.AITools.showError(window.Lang.get('errorAIGeneric') + (response?.error?.message || response?.error || "Unknown error"), rootElement);
            } else {
                const aiResult = response.result; 
                window.AITools.currentSummary = `Chủ đề: ${subject}\n\nNội dung tóm tắt:\n${aiResult.content}`; 
                window.AITools.displaySummary(aiResult.content, rootElement, aiResult.fullModelId); 
                if (bottomPane) bottomPane.style.display = 'flex';
                if(chatScroller) {
                    chatScroller.scrollTop = chatScroller.scrollHeight;
                }
            }
          }
      );
    } catch (errorDetails) {
      // Dịch lỗi
      const errorMsg = (errorDetails?.message || errorDetails.toString()).includes("context invalidated")
          ? window.Lang.get('errorContextInvalidated')
          : "Lỗi nghiêm trọng (AITools): " + (errorDetails?.message || errorDetails);

      window.AITools.showError(errorMsg, rootElement);
      console.error("Lỗi AITools.startSummaryProcess:", errorDetails);
      if (rootElement.id === 'ai-modal-main-content' && window.AITools.skipToComposeView) {
          // Dịch context
          window.AITools.skipToComposeView(window.Lang.get('errorCannotReadEmail'), rootElement);
      }
    }
};

/**
 * Bỏ qua tóm tắt (Dùng cho Modal)
 * (Không thay đổi)
 */
window.AITools.skipToComposeView = function(context, rootElement) {
  if (!rootElement) rootElement = document.getElementById('ai-modal-main-content');
  if (!rootElement) return;

    const topPane = rootElement.querySelector('#ai-summary-top-pane');
    const bottomPane = rootElement.querySelector('#ai-summary-bottom-pane');

    rootElement.querySelector('#ai-modal-loading').style.display = 'none';
    topPane.style.display = 'none';
    rootElement.querySelector('#ai-summary-error').style.display = 'none';
    bottomPane.style.display = 'flex'; 
    
    window.AITools.currentSummary = context;
    window.AITools.currentGeneratedDraft = "";
    rootElement.querySelector('#ai-compose-prompt-input').innerHTML = '';
    rootElement.querySelector('#ai-modal-footer').classList.remove('show');
};

/**
 * (NÂNG CẤP v7) Hiển thị tóm tắt
 * (Cập nhật i18n)
 */
window.AITools.displaySummary = function(summaryMarkdown, rootElement, modelId) {
  if (!rootElement || !window.Lang) return; // Thoát nếu i18n chưa sẵn sàng
  
  const resultEl = rootElement.querySelector('#ai-summary-result');
  if (!resultEl) { console.error("AITools.displaySummary: Không tìm thấy #ai-summary-result"); return; }
  
  // 1. Tạo nội dung tóm tắt (Giữ nguyên)
  const contentDiv = document.createElement('div');
  contentDiv.className = "ai-summary-content"; 
  try {
    const cleanSummary = summaryMarkdown.replace(/(\r\n|\r|\n)/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const dirtyHtml = marked.parse(cleanSummary);
    const minifiedHtml = dirtyHtml.replace(/>\s+</g, '><').trim();
    const cleanHtml = DOMPurify.sanitize(minifiedHtml, {
        USE_PROFILES: {html: true}, 
        ADD_ATTR: ['style', 'align'] 
    });
    contentDiv.innerHTML = cleanHtml;
  } catch (err) {
    console.error("Lỗi parse Markdown:", err);
    contentDiv.innerText = summaryMarkdown;
  }

  // 2. Tạo wrapper (Giữ nguyên)
  const wrapperDiv = document.createElement('div');
  wrapperDiv.className = "ai-summary-wrapper"; 
  
  // 3. Dịch nút "Xem thêm"
  const readMoreBtn = document.createElement('div');
  readMoreBtn.className = "ai-read-more-btn";
  readMoreBtn.innerText = window.Lang.get('readMore');
  
  // 4. Dịch nút "Thu gọn"
  const collapseBtn = document.createElement('div');
  collapseBtn.className = "ai-collapse-btn"; 
  collapseBtn.innerText = window.Lang.get('collapse');

  // 5. Logic click (Giữ nguyên)
  const expandSummary = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!wrapperDiv.classList.contains('expanded')) {
          wrapperDiv.classList.add('expanded');
          const chatScroller = rootElement.querySelector('.ai-modal-body');
          if (chatScroller) chatScroller.scrollTop = chatScroller.scrollHeight;
      }
  };
  const collapseSummary = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (wrapperDiv.classList.contains('expanded')) {
          wrapperDiv.classList.remove('expanded');
          if (wrapperDiv.scrollIntoView) {
              wrapperDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
      }
  };
  
  wrapperDiv.onclick = expandSummary; 
  readMoreBtn.onclick = expandSummary; 
  collapseBtn.onclick = collapseSummary; 

  // 6. Lắp ráp (Giữ nguyên)
  wrapperDiv.appendChild(contentDiv);
  wrapperDiv.appendChild(readMoreBtn);
  wrapperDiv.appendChild(collapseBtn); 
  
  resultEl.innerHTML = ''; 
  resultEl.appendChild(wrapperDiv); 
  
  // 7. Thêm metadata (Giữ nguyên)
  resultEl.appendChild(createMetadataFooter('ai', modelId));
  
  const chatScroller = rootElement.querySelector('.ai-modal-body');
  if (chatScroller) chatScroller.scrollTop = chatScroller.scrollHeight;
};

/**
 * Hiển thị lỗi
 * (Không thay đổi)
 */
window.AITools.showError = function(message, rootElement) {
  if (!rootElement) rootElement = document.getElementById('ai-modal-main-content');
  if (!rootElement) return;

  const errorEl = rootElement.querySelector('#ai-summary-error');
  const loadingEl = rootElement.querySelector('#ai-modal-loading');
  if (errorEl) {
    errorEl.innerText = message;
    errorEl.style.display = 'block';
  }
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
  console.error("Lỗi AITools:", message);
};

/**
 * SOẠN THẢO (Cho Popup Modal)
 * (Cập nhật i18n)
 */
window.AITools.handleCompose = function(rootElement) {
  if (!rootElement || !window.Lang) return; // Thoát nếu i18n chưa sẵn sàng

  const promptInput = rootElement.querySelector('#ai-compose-prompt-input');
  const sendBtn = rootElement.querySelector('#ai-compose-send-btn');
  const footer = rootElement.querySelector('#ai-modal-footer');
  const langSelect = rootElement.querySelector('#ai-compose-lang-select');
  // Lấy text của option đã chọn (ví dụ: "Tiếng Việt")
  const lang = langSelect.options[langSelect.selectedIndex].text;
  
  const optionsPrompt = `Độ dài: ${window.AITools.currentOptions.length}, Độ trang trọng: ${window.AITools.currentOptions.formality}, Định dạng: ${window.AITools.currentOptions.format}, Giọng điệu: ${window.AITools.currentOptions.tone}`;
  let userPrompt = promptInput.innerText;
  if (!userPrompt || userPrompt.trim() === '') {
    // Dịch alert
    alert(window.Lang.get('errorEmptyCompose'));
    return;
  }
  let finalPrompt = `Hãy soạn một email trả lời dựa trên ý chính sau: "${userPrompt}".
    Ngôn ngữ: ${lang}.
    Tuỳ chọn: ${optionsPrompt}.
    Bối cảnh: ${window.AITools.currentSummary}
    
    QUAN TRỌNG:
    1. Định dạng đầu ra của bạn PHẢI LÀ MARKDOWN.
    2. CHỈ SỬ DỤNG MỘT DẤU XUỐNG DÒNG (single newline) giữa các đoạn văn.
    3. CHỈ SỬ DỤNG MỘT DẤU XUỐNG DÒNG giữa các mục danh sách (bullet point).
    4. Không bao gồm dòng tiêu đề (Subject) hay chữ ký.`;
  
  sendBtn.disabled = true;
  // Dịch nút
  sendBtn.innerText = window.Lang.get('creating');
  footer.classList.remove('show'); 

  chrome.runtime.sendMessage(
    {
      action: 'COMPOSE_EMAIL', 
      context: window.AITools.currentSummary,
      prompt: finalPrompt 
    },
    (response) => {
      sendBtn.disabled = false;
      // Dịch nút
      sendBtn.innerText = window.Lang.get('regenerateBtn');
      if (chrome.runtime.lastError) {
        // Dịch alert
        alert(window.Lang.get('errorConnection') + chrome.runtime.lastError.message);
      } else if (!response || !response.success) {
        // Dịch alert
        alert(window.Lang.get('errorAIGeneric') + (response?.error || "Unknown error"));
      } else {
        window.AITools.currentGeneratedDraft = response.draft;
        const dirtyHtml = marked.parse(response.draft);
        const cleanHtml = DOMPurify.sanitize(dirtyHtml, { USE_PROFILES: {html: true} });
        promptInput.innerHTML = cleanHtml;
        footer.classList.add('show');
      }
    }
  );
};

/**
 * (NÂNG CẤP) HỎI ĐÁP (Cho Side Panel)
 * (Cập nhật i18n)
 */
window.AITools.handleQuery = function(rootElement) {
  if (!rootElement || !window.Lang) return; // Thoát nếu i18n chưa sẵn sàng

  const textarea = rootElement.querySelector('#ai-chat-input-textarea');
  const sendBtn = rootElement.querySelector('#ai-chat-send-btn');
  const chatWindow = rootElement.querySelector('#ai-summary-result');
  const chatScroller = rootElement.querySelector('.ai-modal-body'); 
  const loadingEl = rootElement.querySelector('#ai-chat-loading');
  
  if (!textarea || !sendBtn || !chatWindow || !loadingEl || !chatScroller) {
      console.error("AITools.handleQuery: Thiếu thành phần UI Chat.");
      // Dịch alert (dùng key mới 'errorChatUI')
      alert(window.Lang.get('errorChatUI'));
      return;
  }

  let userQuery = textarea.value.trim();
  if (!userQuery) return;
  
  const userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'ai-chat-message user';
  userMessageDiv.innerText = userQuery;
  chatWindow.appendChild(userMessageDiv);
  chatWindow.appendChild(createMetadataFooter('user'));
  
  textarea.value = '';
  textarea.style.height = 'auto';
  textarea.focus();
  chatScroller.scrollTop = chatScroller.scrollHeight;

  sendBtn.disabled = true;
  loadingEl.style.display = 'flex'; 

  const currentChatContext = window.AITools.currentSummary;

  chrome.runtime.sendMessage(
    {
      action: 'QUERY_EMAIL_CONTEXT', 
      context: currentChatContext,
      query: userQuery
    },
    (response) => {
      sendBtn.disabled = false;
      loadingEl.style.display = 'none'; 
      
      // Dịch lỗi
      let aiAnswer = window.Lang.get('errorNoAIResponse');
      let modelId = null; 
      let isError = true;
      
      if (chrome.runtime.lastError) {
          // Dịch lỗi
          const errorMsg = chrome.runtime.lastError.message.includes("context invalidated") 
              ? window.Lang.get('errorContextInvalidated')
              : window.Lang.get('errorConnection') + chrome.runtime.lastError.message;
          aiAnswer = errorMsg;
      } else if (!response || !response.success) {
        // Dịch lỗi
        aiAnswer = window.Lang.get('errorAIGeneric') + (response?.error?.message || response?.error || "Unknown error");
      } else {
        const aiResult = response.result;
        aiAnswer = aiResult.content;
        modelId = aiResult.fullModelId;
        isError = false;
      }
      
      const aiMessageDiv = document.createElement('div');
      aiMessageDiv.className = 'ai-chat-message ai';
      
      try {
          const dirtyHtml = marked.parse(aiAnswer);
          aiMessageDiv.innerHTML = DOMPurify.sanitize(dirtyHtml, { USE_PROFILES: {html: true} });
      } catch (e) {
          aiMessageDiv.innerText = aiAnswer;
      }
      chatWindow.appendChild(aiMessageDiv);
      
      // Thêm metadata
      chatWindow.appendChild(createMetadataFooter('ai', modelId));

      chatScroller.scrollTop = chatScroller.scrollHeight;
      
      if (!isError) {
          window.AITools.currentSummary += `\n\nUser: ${userQuery}\nAI: ${aiAnswer}`;
      }
    }
  );
};


/**
 * Tinh chỉnh (Dùng cho Modal)
 * (Cập nhật i18n)
 */
window.AITools.handleRefine = function(rootElement) {
    if (!rootElement || !window.Lang) return; // Thoát nếu i18n chưa sẵn sàng

    const refineInput = rootElement.querySelector('#ai-refine-prompt-input');
    const promptInput = rootElement.querySelector('#ai-compose-prompt-input');
    const langSelect = rootElement.querySelector('#ai-compose-lang-select');
    const lang = langSelect.options[langSelect.selectedIndex].text;

    // Dịch prompt mặc định
    let userPrompt = refineInput.value || window.Lang.get('regenerateBtn');
    userPrompt += `\nNgôn ngữ: ${lang}.
    QUAN TRỌNG:
    1. Định dạng đầu ra của bạn PHẢI LÀ MARKDOWN.
    2. CHỈ SỬ DỤNG MỘT DẤU XUỐNG DÒNG (single newline) giữa các đoạn văn và mục danh sách.
    3. Không bao gồm dòng tiêu đề (Subject) hay chữ ký.`;

    const sendBtn = rootElement.querySelector('#ai-compose-send-btn');
    const footer = rootElement.querySelector('#ai-modal-footer');
    
    sendBtn.disabled = true;
    // Dịch nút
    sendBtn.innerText = window.Lang.get('creating');
    footer.classList.remove('show'); 
    
    chrome.runtime.sendMessage(
      {
        action: 'COMPOSE_EMAIL', 
        context: window.AITools.currentGeneratedDraft,
        prompt: userPrompt 
      },
      (response) => {
        sendBtn.disabled = false;
        // Dịch nút (phân biệt 2 chế độ)
        const btnTextKey = (rootElement.id === 'ai-side-panel-container') ? 'sendBtnTitle' : 'regenerateBtn';
        sendBtn.innerText = window.Lang.get(btnTextKey);
        
        if (chrome.runtime.lastError) {
          // Dịch alert
          alert(window.Lang.get('errorConnection') + chrome.runtime.lastError.message);
        } else if (!response || !response.success) {
          // Dịch alert
          alert(window.Lang.get('errorAIGeneric') + (response?.error || "Unknown error"));
        } else {
          window.AITools.currentGeneratedDraft = response.draft;
          const dirtyHtml = marked.parse(response.draft);
          const cleanHtml = DOMPurify.sanitize(dirtyHtml, { USE_PROFILES: {html: true} });
          promptInput.innerHTML = cleanHtml;
          refineInput.value = ''; 
          footer.classList.add('show');
        }
      }
    );
};

/**
 * Copy (Hàm dùng chung)
 * (Cập nhật i18n)
 */
window.AITools.handleCopy = function() {
    if (!window.Lang) return;
    navigator.clipboard.writeText(window.AITools.currentGeneratedDraft);
    // Dịch alert
    alert(window.Lang.get('alertCopiedMarkdown'));
};

/**
 * Insert (Hàm dùng chung)
 * (Cập nhật i18n)
 */
window.AITools.handleInsert = function() {
    if (!window.Lang) return;
    
    if (openedComposeWindow && window.AITools.currentGeneratedDraft) {
      const dirtyHtml = marked.parse(window.AITools.currentGeneratedDraft);
      const cleanHtml = DOMPurify.sanitize(dirtyHtml, { USE_PROFILES: {html: true} });
      openedComposeWindow.body(cleanHtml); 
      openedComposeWindow.$el.find('div[contenteditable=true]').focus(); 
      
      closeSummaryModal();
      const sidePanel = document.getElementById('ai-side-panel-container');
      if (sidePanel && sidePanel.classList.contains('open')) {
          sidePanel.classList.remove('open');
          const content = document.querySelector('div[role="main"]');
          if (content) content.style.marginRight = '0px';
      }
    } else {
      // Dịch alert
      alert(window.Lang.get('errorNoComposeWindow'));
    }
};


/**
 * (NÂNG CẤP) Gắn các trình xử lý
 * (Không thay đổi)
 */
window.AITools.attachReusableHandlers = function(rootElement) {
  console.log("AITools: Đang gắn trình xử lý CHAT cho", rootElement.id);

  const sendBtn = rootElement.querySelector('#ai-chat-send-btn');
  const textarea = rootElement.querySelector('#ai-chat-input-textarea');

  if (!sendBtn || !textarea) {
      console.error("AITools.attachReusableHandlers: Không tìm thấy #ai-chat-send-btn hoặc #ai-chat-input-textarea.");
      return; 
  }
  
  if (sendBtn.dataset.handlerAttached) return;
  sendBtn.dataset.handlerAttached = 'true';

  sendBtn.onclick = () => {
      window.AITools.handleQuery(rootElement); 
  };
  
  textarea.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.AITools.handleQuery(rootElement);
      }
  };
  
  textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight) + 'px';
  });
  
  console.log("AITools: Đã gắn trình xử lý CHAT thành công.");
};

/**
 * Lắng nghe thay đổi ngôn ngữ và cập nhật modal và các nút
 */
function setupLanguageListener() {
  // Đảm bảo chỉ đăng ký listener một lần
  if (window._summarizerLangListenerSetup) return;
  window._summarizerLangListenerSetup = true;
  
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
          
          // Cập nhật modal nếu đã được inject
          const modal = document.getElementById('ai-summary-modal');
          if (modal) {
            window.Lang.applyToDOM(modal);
          }
          
          // Re-inject các nút với ngôn ngữ mới
          document.querySelectorAll('.ai-compose-trigger-button').forEach(button => {
            const sparkleIcon = getIconImg('icons/svg/icon/Design, Tools/icon-ai-menu.svg', 'md', 'AI');
            button.innerHTML = sparkleIcon + ' ' + window.Lang.get('composeAIBtn');
          });
          
          // Trigger lại inject cho các nút view thread nếu cần
          if (viewThreadInterval) {
            clearInterval(viewThreadInterval);
            viewThreadInterval = null;
          }
          
          // Re-inject view button nếu cần
          setTimeout(() => {
            // Tìm nút với nhiều selector fallback
            let targetButton = document.querySelector('button[aria-label="Trả lời tất cả"]') ||
                              document.querySelector('button[aria-label="Reply all"]') ||
                              document.querySelector('button[aria-label="Trả lời"]') ||
                              document.querySelector('button[aria-label="Reply"]') ||
                              document.querySelector('button[aria-label*="Reply"]') ||
                              document.querySelector('button[aria-label*="Trả lời"]') ||
                              document.querySelector('button[aria-label="Chuyển tiếp"]') ||
                              document.querySelector('button[aria-label="Forward"]') ||
                              document.querySelector('button[aria-label*="Forward"]') ||
                              document.querySelector('button[aria-label*="Chuyển tiếp"]');
            
            if (targetButton) {
              let buttonContainer = targetButton.closest('div.amn') ||
                                   targetButton.closest('div[role="toolbar"]') ||
                                   targetButton.closest('div[class*="amn"]') ||
                                   targetButton.parentElement?.parentElement;
              
              if (buttonContainer) {
                const existingBtn = buttonContainer.querySelector('.ai-view-trigger-button');
                if (existingBtn) {
                  const sparkleIcon = getIconImg('icons/svg/icon/Design, Tools/icon-ai-menu.svg', 'md', 'AI');
                  existingBtn.innerHTML = sparkleIcon + ' ' + window.Lang.get('composeAIBtn');
                }
              }
            }
          }, 100);
          
          console.log(`[Summarizer] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
        } catch (error) {
          console.error('[Summarizer] Lỗi khi cập nhật ngôn ngữ:', error);
        }
      }
    }
  });
}

// === ĐĂNG KÝ LISTENER NGÔN NGỮ TOÀN CỤC (Trước khi Gmail load) ===
// Đảm bảo listener được đăng ký ngay cả khi script chưa khởi tạo xong
if (!window._summarizerLangListenerSetup) {
  window._summarizerLangListenerSetup = true;
  
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.userLang && window.Lang) {
      const newLangCode = changes.userLang.newValue;
      const currentLang = window.Lang.getCurrentLanguage();
      
      if (newLangCode && newLangCode !== currentLang) {
        console.log(`[Summarizer] Phát hiện thay đổi ngôn ngữ: ${currentLang} -> ${newLangCode}`);
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
          
          // Cập nhật modal nếu đã được inject
          const modal = document.getElementById('ai-summary-modal');
          if (modal) {
            window.Lang.applyToDOM(modal);
          }
          
          // Re-inject các nút với ngôn ngữ mới
          setTimeout(() => {
            document.querySelectorAll('.ai-compose-trigger-button').forEach(button => {
              const sparkleIcon = getIconImg('icons/svg/icon/Design, Tools/icon-ai-menu.svg', 'md', 'AI');
            button.innerHTML = sparkleIcon + ' ' + window.Lang.get('composeAIBtn');
            });
            
            // Re-inject view button nếu cần
            let targetButton = document.querySelector('button[aria-label="Trả lời tất cả"]') ||
                              document.querySelector('button[aria-label="Reply all"]') ||
                              document.querySelector('button[aria-label="Trả lời"]') ||
                              document.querySelector('button[aria-label="Reply"]') ||
                              document.querySelector('button[aria-label*="Reply"]') ||
                              document.querySelector('button[aria-label*="Trả lời"]') ||
                              document.querySelector('button[aria-label="Chuyển tiếp"]') ||
                              document.querySelector('button[aria-label="Forward"]') ||
                              document.querySelector('button[aria-label*="Forward"]') ||
                              document.querySelector('button[aria-label*="Chuyển tiếp"]');
            
            if (targetButton) {
              let buttonContainer = targetButton.closest('div.amn') ||
                                   targetButton.closest('div[role="toolbar"]') ||
                                   targetButton.closest('div[class*="amn"]') ||
                                   targetButton.parentElement?.parentElement;
              
              if (buttonContainer) {
                const existingBtn = buttonContainer.querySelector('.ai-view-trigger-button');
                if (existingBtn) {
                  const sparkleIcon = getIconImg('icons/svg/icon/Design, Tools/icon-ai-menu.svg', 'md', 'AI');
                  existingBtn.innerHTML = sparkleIcon + ' ' + window.Lang.get('composeAIBtn');
                }
              }
            }
          }, 300);
          
          console.log(`[Summarizer] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
        } catch (error) {
          console.error('[Summarizer] Lỗi khi cập nhật ngôn ngữ:', error);
        }
      }
    }
  });
  
  console.log('[Summarizer] Đã đăng ký listener ngôn ngữ toàn cục');
}