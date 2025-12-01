/*
 * File: root/modules/gmail/aisidepanel/side-panel.js
 * Mục đích: Chèn nút "AI Tóm tắt email" và quản lý side panel
 *
 * ĐÃ NÂNG CẤP (v7 - i18n):
 * 1. (SỬA LỖI) Sửa lỗi cú pháp "Và widthPx =" thành "const widthPx =".
 * 2. (i18n) Cập nhật injectPanelHtml để dùng data-i18n.
 * 3. (i18n) Cập nhật injectPanelTriggerButton để dùng window.Lang.get().
 * 4. (i18n) Cập nhật togglePanel để dịch thông báo lỗi.
 */

console.log("Module AISidePanel đã tải (Phiên bản Chat).");

// === 1. ĐỊNH NGHĨA ===

// Helper function để tạo icon img tag
function getIconImg(iconPath, size = 'md', alt = '') {
  const iconUrl = chrome.runtime.getURL(iconPath);
  const sizeClass = size === 'sm' ? 'icon-sm' : size === 'md' ? 'icon-md' : 'icon-lg';
  return `<img src="${iconUrl}" alt="${alt}" class="icon ${sizeClass}" style="vertical-align: middle;">`;
}

const ICON_SPARKLE = getIconImg('icons/svg/icon/Design, Tools/icon-ai-menu.svg', 'md', 'AI');
const ICON_SEND = getIconImg('icons/svg/icon/Arrows Action/Send Square.svg', 'md', 'Send');

const BUTTON_ID = 'ai-side-panel-trigger-btn';
const PANEL_ID = 'ai-side-panel-container';
const RESIZER_ID = 'ai-panel-resizer';
const CLOSE_BTN_ID = 'ai-panel-close-btn';

const GEMINI_BUTTON_CONTAINER_SELECTOR = 'div.einvLd';
const GMAIL_CONTENT_SELECTOR = 'div.bkK';
const GMAIL_HEADER_SELECTOR = '#gb';

let isResizing = false;
let lastDownX = 0;

// === 0. THEME SUPPORT ===
/**
 * Áp dụng theme từ storage
 */
async function applyTheme() {
    try {
        const data = await chrome.storage.local.get('theme');
        const theme = data.theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Áp dụng cho panel nếu đã tồn tại
        const panel = document.getElementById(PANEL_ID);
        if (panel) {
            panel.setAttribute('data-theme', theme);
        }
    } catch (e) {
        console.warn('[Gmail AISidePanel] Error applying theme:', e);
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
                
                // Cập nhật panel
                const panel = document.getElementById(PANEL_ID);
                if (panel) {
                    panel.setAttribute('data-theme', newTheme);
                }
            }
        }
    });
}

// === 2. HÀM KHỞI TẠO CHÍNH ===
// (Cập nhật để đợi i18n)
async function initializeAISidePanel(gmail) {
  console.log("AISidePanel: Khởi tạo...");
  
  // Áp dụng theme
  await applyTheme();
  setupThemeListener();

  if (!document.getElementById(PANEL_ID)) {
    await injectPanelHtml();
    addPanelListeners();
    // Áp dụng lại theme sau khi inject HTML
    await applyTheme();
  }

  const mainContainer = document.querySelector('div[role="main"]');
  if (mainContainer) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          const target = document.querySelector(GEMINI_BUTTON_CONTAINER_SELECTOR);
          if (target && !document.getElementById(BUTTON_ID)) {
            console.log("AISidePanel: Phát hiện vị trí. Đang chèn nút...");
            injectPanelTriggerButton(target);
          }
        }
      }
    });

    observer.observe(mainContainer, {
      childList: true,
      subtree: true
    });
  }

  gmail.observe.on('view_thread', () => {
    setTimeout(() => {
      const target = document.querySelector(GEMINI_BUTTON_CONTAINER_SELECTOR);
      if (target && !document.getElementById(BUTTON_ID)) {
        injectPanelTriggerButton(target);
      }
    }, 1000);
  });
  
  // Thiết lập listener cho thay đổi ngôn ngữ
  setupLanguageListener();
}


// === 3. CHÈN HTML VÀ NÚT ===

/**
 * Chèn HTML cho khung panel
 * (Cập nhật i18n)
 */
async function injectPanelHtml() {
  // Đợi i18n load xong trước khi inject
  if (window.Lang && window.Lang.initializationPromise) {
    await window.Lang.initializationPromise;
  }
  
  const panelHtml = `
    <div class="ai-side-panel" id="${PANEL_ID}">
      <div class="ai-panel-resizer" id="${RESIZER_ID}"></div>
      
      <div class="ai-panel-header">
        <div class="ai-panel-title" data-i18n="sidePanelTitle">
          ${ICON_SPARKLE} AI Chat & Tóm tắt
        </div>
        <span class="ai-panel-close" id="${CLOSE_BTN_ID}" data-i18n-title="closeBtnLabel" title="Đóng">
          <img src="${chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Close Circle.svg')}" alt="Close" class="icon icon-sm">
        </span>
      </div>
      
      <div class="ai-panel-content-wrapper"> <div class="ai-modal-body" id="ai-panel-chat-window"> 
        
        <div id="ai-summary-top-pane">
          
          <div id="ai-summary-error"></div>
          <div class="ai-modal-loading" id="ai-modal-loading">
            <div class="spinner"></div>
            <p data-i18n="summarizingText">Đang tóm tắt email...</p>
          </div>
          
          <div id="ai-summary-result"></div> 
          
          <div class="ai-chat-loading d-none" id="ai-chat-loading">
             <div class="spinner"></div>
          </div>
          
        </div>
        
        </div>
        
        <div class="ai-panel-chat-input-area">
        
          <div class="ai-chat-input-wrapper-single-border">
          
            <textarea id="ai-chat-input-textarea" 
                      data-i18n-placeholder="chatPlaceholder" 
                      placeholder="Hỏi AI bất cứ điều gì..." 
                      rows="1"></textarea>
            
            <div class="ai-chat-toolbar">
              <button id="ai-chat-send-btn" data-i18n-title="sendBtnTitle" title="Gửi">
                ${ICON_SEND}
              </button>
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
      id: 'ai-side-panel-shadow',
      className: 'ai-side-panel-shadow-container',
      stylesheets: ['modules/gmail/aisidepanel/side-panel.css']
    });
    
    // Setup theme observer
    if (typeof window.setupThemeObserver === 'function') {
      window.setupThemeObserver(shadowContainer.shadowRoot);
    }
    
    // Inject HTML vào shadow container
    shadowContainer.container.innerHTML = panelHtml;
  } else {
    // Fallback: inject trực tiếp vào body
    document.body.insertAdjacentHTML('beforeend', panelHtml);
  }
  
  // === CẬP NHẬT i18n ===
  // Yêu cầu i18n.js dịch các thuộc tính data-i18n của panel vừa chèn
  if (window.Lang && window.Lang.applyToDOM) {
    window.Lang.applyToDOM(document.getElementById(PANEL_ID));
  }
}


/**
 * Chèn nút "AI Tóm tắt email"
 * (Cập nhật i18n)
 */
function injectPanelTriggerButton(targetContainer) {
  if (document.getElementById(BUTTON_ID)) return; // Đã chèn
  if (!window.Lang) return; // Chưa sẵn sàng i18n

  const aiButton = document.createElement('button');
  aiButton.id = BUTTON_ID;
  aiButton.className = 'ai-summary-side-button';
  
  // Dịch nút (Giả sử bạn có key 'sidePanelButtonText' trong file lang.json)
  // Nếu không, nó sẽ dùng 'sidePanelTitle' làm fallback
  const buttonText = window.Lang.get('sidePanelButtonText') || window.Lang.get('sidePanelTitle');
  aiButton.innerHTML = ICON_SPARKLE + ' ' + buttonText.replace('✨ ', ''); // Bỏ icon nếu có
  
  aiButton.type = 'button';

  aiButton.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // THAY ĐỔI: Luôn mở Panel và hiển thị tóm tắt (không toggle)
    (async () => {
      try {
        // Luôn mở side panel (không toggle) - sử dụng openSidePanelForTab để đảm bảo mở được
        // Gọi ngay trong user gesture context để tránh mất user gesture
        const openResult = await chrome.runtime.sendMessage({ action: 'openSidePanelForTab' }).catch(() => ({ success: false }));
        
        // Nếu openSidePanelForTab không thành công, thử ensureSidePanelOpen
        if (!openResult || !openResult.success) {
          await chrome.runtime.sendMessage({ action: 'ensureSidePanelOpen' }).catch(() => {});
        }
        
        // Đợi một chút để đảm bảo Panel đã sẵn sàng nhận message
        await new Promise(resolve => setTimeout(resolve, 200));

        // Gửi loading để Panel mở cuộc hội thoại mới + seed user message + tạo streaming port
        let messageId = null;
        try {
          const loadingResp = await chrome.runtime.sendMessage({ action: 'SHOW_GMAIL_LOADING' });
          if (loadingResp && loadingResp.success && loadingResp.messageId) {
            messageId = loadingResp.messageId;
            console.log('[AISidePanel] Received messageId for streaming:', messageId);
          }
        } catch (e1) {
          console.error('[AISidePanel] Error sending SHOW_GMAIL_LOADING:', e1);
        }

        // Cố gắng đọc email hiện tại
        let summaryPayload = null;
        if (window.EmailDOMReader) {
          const emailData = await window.EmailDOMReader.readEmails();
          if (emailData && emailData.emails && emailData.emails.length > 0) {
            const { subject, emails } = emailData;
            const fullEmailText = emails.map((email, index) => {
              return `=== Email ${index + 1} ===\nTừ: ${email.from.name || email.from.address}\nThời gian: ${email.timestamp}\nChủ đề: ${subject}\nNội dung:\n${email.content_text}`;
            }).join('\n\n---\n\n');
            const currentLangName = window.Lang ? (window.Lang.get(`lang_${window.Lang.getCurrentLanguage().replace('-', '_')}`) || "Tiếng Việt") : "Tiếng Việt";
            
            // Gửi SUMMARIZE_EMAIL với messageId để sử dụng streaming
            const resp = await chrome.runtime.sendMessage({
              action: 'SUMMARIZE_EMAIL',
              text: fullEmailText,
              subject: subject,
              emailCount: emails.length,
              language: currentLangName,
              prompt: `Tóm tắt chuỗi email sau bằng ${currentLangName}.
QUAN TRỌNG: Định dạng đầu ra của bạn PHẢI LÀ MARKDOWN.`,
              messageId: messageId // Gửi messageId để background sử dụng streaming port
            });
            
            // Nếu streaming được sử dụng, không cần gửi DISPLAY_GMAIL_SUMMARY
            // Panel sẽ nhận chunks qua streaming port
            if (resp && resp.success) {
              if (resp.streaming) {
                // Streaming is in progress, panel will receive chunks via port
                console.log('[AISidePanel] Gmail summary streaming started');
                // Update header title when streaming completes (handled by panel)
              } else if (resp.result) {
                // Non-streaming fallback (backward compatibility)
                const aiResult = resp.result;
                summaryPayload = {
                  subject,
                  summaryMarkdown: aiResult.content,
                  fullModelId: aiResult.fullModelId,
                  context: `Chủ đề: ${subject}\n\nNội dung tóm tắt:\n${aiResult.content}`
                };
              }
            }
          }
        }
        
        // Gửi kết quả đến Panel (chỉ nếu không streaming)
        if (summaryPayload) {
          await chrome.runtime.sendMessage({ action: 'DISPLAY_GMAIL_SUMMARY', payload: summaryPayload });
        } else if (!messageId) {
          // Chỉ gửi error nếu không có streaming
          await chrome.runtime.sendMessage({ action: 'DISPLAY_GMAIL_ERROR', error: window.Lang ? window.Lang.get('errorSummarizeFailed') : 'Không thể tóm tắt email.' });
        }
      } catch (err) {
        console.error('AISidePanel: Error when routing to main panel:', err);
        // Fallback: cố mở Panel (không toggle)
        chrome.runtime.sendMessage({ action: 'ensureSidePanelOpen' }).catch(() => {});
      }
    })();
  };

  targetContainer.appendChild(aiButton);
}


// === 4. LOGIC PANEL (MỞ/ĐÓNG, KÉO THẢ, ĐẨY) ===

/**
 * Tự động thay đổi chiều cao textarea khi gõ
 * (Không thay đổi)
 */
function handleTextareaInput(event) {
  const textarea = event.target;
  textarea.style.height = 'auto'; // Reset chiều cao
  textarea.style.height = `${textarea.scrollHeight}px`;
}

/**
 * Gán các sự kiện cho panel (đóng, kéo thả)
 * (Không thay đổi)
 */
function addPanelListeners() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  
  const resizer = document.getElementById(RESIZER_ID);
  const closeBtn = document.getElementById(CLOSE_BTN_ID);

  if (closeBtn) {
    closeBtn.onclick = () => togglePanel(false);
  }

  if (resizer) {
    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      lastDownX = e.clientX;
      panel.style.transition = 'none';
      applyPushEffect(true, panel.offsetWidth, true); 
      document.body.style.userSelect = 'none';
    });
  }

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const offset = e.clientX - lastDownX;
    const currentWidth = panel.offsetWidth;
    let newWidth = panel.offsetWidth - offset;
    const minWidth = 535;
    const maxWidth = window.innerWidth * 0.8;
    const clampedToMin = newWidth < minWidth;
    const clampedToMax = newWidth > maxWidth;
    if (clampedToMin) newWidth = minWidth;
    if (clampedToMax) newWidth = maxWidth;
    // Chỉ set lại width và cập nhật push effect nếu thực sự thay đổi
    if (newWidth !== currentWidth) {
      panel.style.width = `${newWidth}px`;
      applyPushEffect(true, newWidth, true);
    }
    // Chỉ cập nhật mốc kéo khi chưa chạm giới hạn để tránh "đẩy" thêm khi đã đạt min/max
    if (!clampedToMin && !clampedToMax) {
      lastDownX = e.clientX;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      panel.style.transition = 'transform 0.3s ease-in-out';
      document.body.style.userSelect = 'auto';
      applyPushEffect(true, panel.offsetWidth, false);
    }
  });
}

/**
 * Mở hoặc đóng panel
 * (Cập nhật i18n)
 */
function togglePanel(forceState) {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  
  const isOpen = panel.classList.contains('open');
  const newState = (forceState !== undefined) ? forceState : !isOpen;

  if (newState === isOpen) return;

  if (newState) {
    // === ĐANG MỞ PANEL ===
    panel.classList.add('open');
    applyPushEffect(true, panel.offsetWidth); 

    const textarea = document.getElementById('ai-chat-input-textarea');
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.rows = 1;
        textarea.removeEventListener('input', handleTextareaInput); 
        textarea.addEventListener('input', handleTextareaInput, false);
    }
    
    const panelRootElement = document.getElementById(PANEL_ID);
    
    // Thoát nếu i18n chưa sẵn sàng
    if (!window.Lang) {
       console.error("AISidePanel: window.Lang (i18n.js) chưa sẵn sàng.");
       return;
    }
    
    if (window.gmailInstance) { 
        if (window.AITools && window.AITools.startSummaryProcess) {
            window.AITools.startSummaryProcess(panelRootElement); 
        } else {
            console.warn("AISidePanel: AITools.startSummaryProcess() chưa sẵn sàng.");
            const errorEl = panelRootElement.querySelector('#ai-summary-error');
            if (errorEl) {
                // Dịch lỗi
                errorEl.innerText = window.Lang.get('errorSummarizerModule');
                errorEl.style.display = 'block';
                panelRootElement.querySelector('#ai-modal-loading').style.display = 'none';
            }
        }
    } else {
         console.error("AISidePanel: gmailInstance chưa sẵn sàng khi mở panel.");
    }
    
    if (window.AITools && window.AITools.attachReusableHandlers) {
        window.AITools.attachReusableHandlers(panelRootElement);
    } else {
        console.warn("AISidePanel: AITools.attachReusableHandlers() chưa sẵn sàng.");
    }

  } else {
    // === ĐANG ĐÓNG PANEL ===
    panel.classList.remove('open');
    applyPushEffect(false);
  }
}



/**
 * Áp dụng hiệu ứng "đẩy" (push)
 * (Không thay đổi)
 */
function applyPushEffect(isOpening, width, isResizing = false) {
  try {
    const content = document.querySelector(GMAIL_CONTENT_SELECTOR);
    const widthPx = isOpening ? `${width}px` : '0px';
    const transitionStyle = isResizing ? 'none' : 'margin-right 0.3s ease-in-out';

    if (content) {
      content.style.transition = transitionStyle;
      content.style.marginRight = isOpening ? `${width - 37}px` : '0px';
    }
    
  } catch (e) {
    console.warn("AISidePanel: Lỗi khi áp dụng hiệu ứng đẩy.", e);
  }
}


/**
 * Lắng nghe thay đổi ngôn ngữ và cập nhật side panel
 */
function setupLanguageListener() {
  // Đảm bảo chỉ đăng ký listener một lần
  if (window._sidePanelLangListenerSetup) return;
  window._sidePanelLangListenerSetup = true;
  
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
          
          // Cập nhật panel nếu đã được inject
          const panel = document.getElementById(PANEL_ID);
          if (panel) {
            window.Lang.applyToDOM(panel);
          }
          
          // Re-inject trigger button với ngôn ngữ mới
          const triggerButton = document.getElementById(BUTTON_ID);
          if (triggerButton && window.Lang) {
            const buttonText = window.Lang.get('sidePanelButtonText') || window.Lang.get('sidePanelTitle');
            triggerButton.innerHTML = ICON_SPARKLE + ' ' + buttonText.replace('✨ ', '');
          } else {
            // Nếu button chưa tồn tại, thử inject lại
            setTimeout(() => {
              const target = document.querySelector(GEMINI_BUTTON_CONTAINER_SELECTOR);
              if (target && !document.getElementById(BUTTON_ID)) {
                injectPanelTriggerButton(target);
              } else if (target && document.getElementById(BUTTON_ID)) {
                const btn = document.getElementById(BUTTON_ID);
                const buttonText = window.Lang.get('sidePanelButtonText') || window.Lang.get('sidePanelTitle');
                btn.innerHTML = ICON_SPARKLE + ' ' + buttonText.replace('✨ ', '');
              }
            }, 500);
          }
          
          console.log(`[AISidePanel] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
        } catch (error) {
          console.error('[AISidePanel] Lỗi khi cập nhật ngôn ngữ:', error);
        }
      }
    }
  });
}

// === 5. HÀM LOADER ===
// (Cập nhật i18n - Đợi i18n load xong)
async function runWhenGmailReady() {
    // Thêm điều kiện kiểm tra window.Lang (i18n.js)
    if (typeof Gmail === 'function' && typeof jQuery !== 'undefined' && window.Lang) {
        // Đợi i18n initialization hoàn thành
        if (window.Lang.initializationPromise) {
            await window.Lang.initializationPromise;
        }
        
        if (!window.gmailInstance) {
            console.log("AISidePanel: Đang khởi tạo Gmail instance...");
            window.gmailInstance = new Gmail(jQuery);
        }
        
        if (window.gmailInstance && window.gmailInstance.observe) {
            console.log("AISidePanel: Gmail instance và i18n đã sẵn sàng. Đang chạy initializeAISidePanel...");
            await initializeAISidePanel(window.gmailInstance);
        } else {
            setTimeout(runWhenGmailReady, 500);
        }
    } else {
        // Kiểm tra lại nếu Gmail hoặc i18n chưa sẵn sàng
        setTimeout(runWhenGmailReady, 500);
    }
}

// === ĐĂNG KÝ LISTENER NGÔN NGỮ TOÀN CỤC (Trước khi Gmail load) ===
// Đảm bảo listener được đăng ký ngay cả khi script chưa khởi tạo xong
if (!window._sidePanelLangListenerSetup) {
  window._sidePanelLangListenerSetup = true;
  
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.userLang && window.Lang) {
      const newLangCode = changes.userLang.newValue;
      const currentLang = window.Lang.getCurrentLanguage();
      
      if (newLangCode && newLangCode !== currentLang) {
        console.log(`[AISidePanel] Phát hiện thay đổi ngôn ngữ: ${currentLang} -> ${newLangCode}`);
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
          
          // Cập nhật panel nếu đã được inject
          const panel = document.getElementById(PANEL_ID);
          if (panel) {
            window.Lang.applyToDOM(panel);
          }
          
          // Re-inject trigger button với ngôn ngữ mới
          setTimeout(() => {
            const triggerButton = document.getElementById(BUTTON_ID);
            if (triggerButton && window.Lang) {
              const buttonText = window.Lang.get('sidePanelButtonText') || window.Lang.get('sidePanelTitle');
              triggerButton.innerHTML = ICON_SPARKLE + ' ' + buttonText.replace('✨ ', '');
            } else {
              // Nếu button chưa tồn tại, thử inject lại
              const target = document.querySelector(GEMINI_BUTTON_CONTAINER_SELECTOR);
              if (target && !document.getElementById(BUTTON_ID)) {
                if (typeof injectPanelTriggerButton === 'function') {
                  injectPanelTriggerButton(target);
                }
              } else if (target && document.getElementById(BUTTON_ID)) {
                const btn = document.getElementById(BUTTON_ID);
                const buttonText = window.Lang.get('sidePanelButtonText') || window.Lang.get('sidePanelTitle');
                btn.innerHTML = ICON_SPARKLE + ' ' + buttonText.replace('✨ ', '');
              }
            }
          }, 300);
          
          console.log(`[AISidePanel] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
        } catch (error) {
          console.error('[AISidePanel] Lỗi khi cập nhật ngôn ngữ:', error);
        }
      }
    }
  });
  
  console.log('[AISidePanel] Đã đăng ký listener ngôn ngữ toàn cục');
}

// Bắt đầu chạy
runWhenGmailReady();