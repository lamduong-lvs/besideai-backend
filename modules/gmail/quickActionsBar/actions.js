console.log("Module QuickActionsBar da tai.");

// === 0. THEME SUPPORT ===
/**
 * Áp dụng theme từ storage
 */
async function applyTheme() {
    try {
        const data = await chrome.storage.local.get('theme');
        const theme = data.theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Áp dụng cho các container nếu đã tồn tại
        const containers = document.querySelectorAll('.ai-custom-actions-container, .quick-actions-dropdown');
        containers.forEach(container => {
            container.setAttribute('data-theme', theme);
        });
    } catch (e) {
        console.warn('[Gmail QuickActions] Error applying theme:', e);
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
                
                // Cập nhật các container
                const containers = document.querySelectorAll('.ai-custom-actions-container, .quick-actions-dropdown');
                containers.forEach(container => {
                    container.setAttribute('data-theme', newTheme);
                });
            }
        }
    });
}

// === 1. ĐỊNH NGHĨA ICONS (Sử dụng icon từ icons/svg/icon) ===
function getIconImg(iconPath, size = 'sm', alt = '') {
  const iconUrl = chrome.runtime.getURL(iconPath);
  const sizeClass = size === 'sm' ? 'icon-sm' : size === 'md' ? 'icon-md' : 'icon-lg';
  return `<img src="${iconUrl}" alt="${alt}" class="icon ${sizeClass}" style="vertical-align: middle; margin-right: 4px; opacity: 1;">`;
}

const ICON_TRANSLATE = getIconImg('icons/svg/icon/Text Formatting/Text.svg', 'sm', 'Translate');
const ICON_PLUS = getIconImg('icons/svg/icon/Essentional, UI/Add Circle.svg', 'sm', 'Add');
const ICON_CALENDAR = getIconImg('icons/svg/icon/Time/Calendar.svg', 'md', 'Calendar');
const ICON_TODO = getIconImg('icons/svg/icon/List/Checklist.svg', 'md', 'Todo');
const ICON_LINK = getIconImg('icons/svg/icon/Text Formatting/Link.svg', 'md', 'Link');
const ICON_REMINDER = getIconImg('icons/svg/icon/Time/Alarm.svg', 'md', 'Reminder');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureEventPopupReady(timeout = 6000) {
  const start = Date.now();
  while (!window.EventPopup) {
    if (Date.now() - start > timeout) {
      throw new Error('EventPopup is not available');
    }
    await sleep(100);
  }
  
  const popup = window.EventPopup;
  if (typeof popup.init === 'function' && !popup.isReady) {
    await popup.init();
  }
  return popup;
}

  // === 2. HÀM KHỞI TẠO CHÍNH ===
function initializeQuickActions(gmail) {
  console.log("AI Actions DEBUG: initializeQuickActions ĐÃ CHẠY.");
  
  // Áp dụng theme
  applyTheme();
  setupThemeListener();

  // Xử lý dropdown chung (gán 1 lần)
  document.addEventListener('click', (event) => {
    document.querySelectorAll('.quick-actions-wrapper.open').forEach(wrapper => {
      if (!wrapper.contains(event.target)) {
        wrapper.classList.remove('open');
      }
    });
  });

  // === LẮNG NGHE THAY ĐỔI NGÔN NGỮ ===
  setupLanguageListener();

  /**
   * HÀM CHÈN NÚT CHÍNH
   * (Cập nhật i18n)
   * Expose ra window để có thể gọi từ listener toàn cục
   */
  function injectButtonsToEmail(currentEmail) {
    try {
      // (Phần logic tìm DOM giữ nguyên)
      const emailBody = currentEmail.querySelector('div.a3s');
      if (!emailBody || emailBody.offsetParent === null) {
        return;
      }
      const senderHeader = currentEmail.querySelector('h3.iw');
      if (!senderHeader) {
          return; 
      }
      const ancestorRow = senderHeader?.closest('tr.acZ');
      if (!ancestorRow) {
          return; 
      }
      const targetLocation = ancestorRow.querySelector('td.gH.VYc0jb div.gK');
      if (!targetLocation) {
          return; 
      }
      if (targetLocation.querySelector('.ai-custom-actions-container')) {
        return; 
      }

      // Thoát nếu window.Lang chưa sẵn sàng
      if (!window.Lang) {
        console.warn("AI Actions: window.Lang (i18n.js) chưa sẵn sàng, tạm dừng chèn nút.");
        return;
      }
      
      console.log("AI Actions DEBUG: THÀNH CÔNG! Đang chèn nút cho email đang mở.");

      // ✅ Load shadow-dom-helper nếu chưa có
      if (typeof window.createShadowContainer !== 'function') {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('utils/shadow-dom-helper.js');
        document.head.appendChild(script);
      }

      // ✅ Tạo Shadow DOM container cho buttons (unique per email)
      const emailId = currentEmail.getAttribute('data-thread-id') || 
                     currentEmail.querySelector('[data-thread-id]')?.getAttribute('data-thread-id') ||
                     Date.now().toString();
      const shadowId = `ai-actions-${emailId}-shadow`;
      
      let shadowContainer = null;
      if (typeof window.createShadowContainer === 'function') {
        shadowContainer = window.createShadowContainer({
          id: shadowId,
          className: 'ai-actions-shadow-container',
          stylesheets: ['modules/gmail/quickActionsBar/actions.css']
        });
        
        // Setup theme observer
        if (typeof window.setupThemeObserver === 'function') {
          window.setupThemeObserver(shadowContainer.shadowRoot);
        }
      }

      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'ai-custom-actions-container';

      // === TẠO NÚT 1: DỊCH EMAIL (Đã dịch) ===
      const translateButton = document.createElement('button');
      translateButton.className = 'ai-gradient-button'; 
      translateButton.innerHTML = ICON_TRANSLATE + window.Lang.get('translateEmailBtn');
      translateButton.title = window.Lang.get('translateEmailTitle');

      // ★★★★★ BẮT ĐẦU LOGIC DỊCH TUẦN TỰ (V9 - Cập nhật i18n) ★★★★★
      translateButton.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const contentElement = currentEmail.querySelector('div.a3s');
        if (!contentElement) { 
          // Dịch alert
          alert(window.Lang.get('errorNoContentToTranslate')); 
          return; 
        }

        // 1. LOGIC BẬT/TẮT
        if (contentElement.dataset.translated === 'true') {
            const translations = contentElement.querySelectorAll('.ai-translation-result');
            if (translations.length === 0) {
                contentElement.dataset.translated = 'false';
            } else {
                const isHidden = translations[0].style.display === 'none';
                if (isHidden) {
                    translations.forEach(node => { node.style.display = ''; });
                    // Dịch nút
                    translateButton.innerHTML = ICON_TRANSLATE + window.Lang.get('translateEmailOff');
                    translateButton.classList.add('ai-button-translated');
                } else {
                    translations.forEach(node => { node.style.display = 'none'; });
                    // Dịch nút
                    translateButton.innerHTML = ICON_TRANSLATE + window.Lang.get('translateEmailBtn');
                    translateButton.classList.remove('ai-button-translated');
                }
                return; 
            }
        }
        
        // 2. LOGIC DỊCH LẦN ĐẦU (Tuần tự)
        
        // 2.1. Tìm đúng container (Giữ nguyên)
        let textContainer = contentElement.querySelector('[class*="WordSection1"]'); 
        if (!textContainer) {
            textContainer = contentElement.querySelector('div[dir="ltr"]'); 
        }
        if (!textContainer) {
            textContainer = contentElement.firstElementChild; 
        }
        if (!textContainer) {
             // Dịch alert
             alert(window.Lang.get('errorNoTextContainer'));
             return;
        }

        // (Hàm helper giữ nguyên)
        function getTextFromNodes(nodes) {
            let text = "";
            nodes.forEach(n => {
                if (text.length > 0 && n.previousSibling?.tagName !== 'BR' && text.slice(-1) !== '\n') {
                    if (n.nodeType === Node.TEXT_NODE && n.previousSibling?.nodeType === Node.TEXT_NODE) {
                       text += ' '; 
                    }
                }
                if (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'BR') {
                    text += '\n';
                } else {
                    text += n.textContent;
                }
            });
            return text.trim();
        }

        // 2.2. Xây dựng danh sách tác vụ (TASKS) (Giữ nguyên)
        let translationTasks = []; 
        let currentParagraphNodes = []; 
        const childNodes = Array.from(textContainer.childNodes);
        for (const node of childNodes) {
            let isQuoteHeader = false;
            if (node.nodeType === Node.ELEMENT_NODE) {
                const bTag = node.querySelector('b');
                if (bTag && bTag.textContent.includes('From:')) {
                    isQuoteHeader = true;
                }
            }
            if ((node.nodeType === Node.ELEMENT_NODE && node.closest('.gmail_signature, .gmail_quote, blockquote, .iX, .ai-translation-result')) || isQuoteHeader) {
                if (currentParagraphNodes.length > 0) {
                    translationTasks.push(currentParagraphNodes);
                }
                currentParagraphNodes = []; 
                break; 
            }
            let element = (node.nodeType === Node.ELEMENT_NODE) ? node : node.parentElement;
            if (element && element.dataset.aiTranslated === 'true') {
                continue;
            }
            if ((node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) ||
                (node.nodeType === Node.ELEMENT_NODE && ['SPAN', 'FONT', 'I', 'B', 'U', 'A'].includes(node.tagName))) {
                currentParagraphNodes.push(node);
            }
            else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
                 currentParagraphNodes.push(node); 
                 if (currentParagraphNodes.length > 0) {
                    translationTasks.push(currentParagraphNodes);
                 }
                 currentParagraphNodes = []; 
            }
            else if (node.nodeType === Node.ELEMENT_NODE && ['P', 'DIV', 'LI', 'OL', 'UL'].includes(node.tagName)) {
                if (currentParagraphNodes.length > 0) {
                    translationTasks.push(currentParagraphNodes);
                }
                currentParagraphNodes = []; 
                if (['OL', 'UL'].includes(node.tagName)) {
                    const listItems = node.querySelectorAll('li');
                    listItems.forEach(li => {
                        translationTasks.push([li]); 
                    });
                } else if (node.textContent.trim().length > 0) {
                    translationTasks.push([node]); 
                }
            }
        }
        if (currentParagraphNodes.length > 0) {
            translationTasks.push(currentParagraphNodes);
        }

        // 2.3. Lọc các tác vụ rỗng hoặc không cần dịch (Giữ nguyên)
        const validTasks = translationTasks.map(nodes => {
            const text = getTextFromNodes(nodes);
            const lastNode = nodes[nodes.length - 1];
            return { nodes, text, lastNode };
        }).filter(task => 
            task.text.length >= 5 && 
            !/^(Best regards|Sincerely|Trân trọng|Thank you|Cảm ơn)/i.test(task.text)
        );

        if (validTasks.length === 0) {
            // Dịch alert
            alert(window.Lang.get('errorNoParsToTranslate'));
            return;
        }
        
        // 2.4. Thực thi TUẦN TỰ (Sequential)
        translateButton.disabled = true;
        let translatedCount = 0;
        
        for (const task of validTasks) {
            translatedCount++;
            // Dịch nút (với biến)
            translateButton.innerHTML = window.Lang.get('translatingProgress', { c: translatedCount, t: validTasks.length });

            try {
                const response = await new Promise((res, rej) => {
                  chrome.runtime.sendMessage(
                    { action: 'TRANSLATE_TEXT', text: task.text, targetLang: 'vi' },
                    (r) => {
                      if (chrome.runtime.lastError) rej(new Error(chrome.runtime.lastError.message));
                      else if (!r || !r.success) rej(new Error(r?.error || 'Unknown AI error'));
                      else res(r);
                    }
                  );
                });
                
                const translationBlock = document.createElement('p'); 
                translationBlock.className = 'ai-translation-result'; 
                translationBlock.innerHTML = response.translatedText.replace(/\n/g, '<br>');
                
                if (task.lastNode.nextSibling) {
                    task.lastNode.parentNode.insertBefore(translationBlock, task.lastNode.nextSibling);
                } else {
                    task.lastNode.parentNode.appendChild(translationBlock);
                }
                
                task.nodes.forEach(n => {
                    let target = (n.nodeType === Node.ELEMENT_NODE) ? n : n.parentElement;
                    if(target && !target.classList.contains('ai-translation-result')) {
                        target.dataset.aiTranslated = 'true';
                    }
                });

            } catch (error) {
                console.error('Lỗi dịch đoạn:', task.text, error);
            }
        }

        // 2.5. Hoàn thành
        contentElement.dataset.translated = 'true'; 
        // Dịch nút
        translateButton.innerHTML = ICON_TRANSLATE + window.Lang.get('translateEmailOff');
        translateButton.classList.add('ai-button-translated');
        translateButton.disabled = false; 
      };
      // ★★★★★ KẾT THÚC LOGIC DỊCH (V9) ★★★★★


      // === TẠO NÚT 2: HÀNH ĐỘNG NHANH (Đã dịch) ===
      const quickActionsWrapper = document.createElement('div');
      quickActionsWrapper.className = 'quick-actions-wrapper';
      const triggerButton = document.createElement('button');
      triggerButton.className = 'ai-gradient-button'; 
      triggerButton.innerHTML = ICON_PLUS + window.Lang.get('actionsBtn');
      triggerButton.title = window.Lang.get('actionsBtnTitle');
      const dropdownMenu = document.createElement('div');
      dropdownMenu.className = 'quick-actions-dropdown';

      // --- Nút 3.1: Tạo Events AI (Đã dịch) ---
      const eventsOption = document.createElement('button');
      eventsOption.className = 'quick-actions-option';
      eventsOption.dataset.action = 'events';
      eventsOption.innerHTML = ICON_CALENDAR + window.Lang.get('createEventsAIBtn');
      eventsOption.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          const popup = await ensureEventPopupReady();
          console.log("AI Actions: Bắt đầu tạo Events AI...");
          
          // Dịch loading (truyền key)
          popup.showLoading('loadingAIText');
          
          const emailData = EmailExtractor.extractEmailData(currentEmail);
          console.log("AI Actions: Đã extract email data:", emailData);
          
          const suggestions = await AIEventParser.parseEmailForEvents(emailData);
          console.log("AI Actions: Nhận được", suggestions.length, "event suggestions");
          
          popup.showEventPopup(suggestions, emailData);
          
        } catch (error) {
          console.error("AI Actions: Lỗi khi tạo Events:", error);
          
          // Dịch lỗi (truyền chuỗi đã dịch)
          try {
            const popup = window.EventPopup && window.EventPopup.isReady ? window.EventPopup : null;
            if (popup?.showError) {
              popup.showError(window.Lang.get('errorCreatingEvents') + error.message);
            } else {
              alert(window.Lang.get('errorPopupNotInitialized') || "Critical Error: EventPopup is not initialized. Please reload the page.");
            }
          } catch (e2) {
            console.error("Lỗi nghiêm trọng: EventPopup chưa được khởi tạo.", e2);
            // Dịch alert (dùng key)
            alert(window.Lang.get('errorPopupNotInitialized') || "Critical Error: EventPopup is not initialized. Please reload the page.");
          }
        }
      };

      // --- Nút 3.2: Tạo Tasks AI (Đã dịch) ---
      const tasksOption = document.createElement('button');
      tasksOption.className = 'quick-actions-option';
      tasksOption.dataset.action = 'tasks';
      tasksOption.innerHTML = ICON_TODO + window.Lang.get('createTasksAIBtn');
      tasksOption.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          const popup = await ensureEventPopupReady();
          console.log("AI Actions: Bắt đầu tạo Tasks AI...");
          
          // Dịch loading (truyền key)
          popup.showLoading('loadingAIText');
          
          const emailData = EmailExtractor.extractEmailData(currentEmail);
          console.log("AI Actions: Đã extract email data:", emailData);
          
          const suggestions = await AIEventParser.parseEmailForTasks(emailData);
          console.log("AI Actions: Nhận được", suggestions.length, "task suggestions");
          
          popup.showTaskPopup(suggestions, emailData);
          
        } catch (error) {
          console.error("AI Actions: Lỗi khi tạo Tasks:", error);

          // Dịch lỗi (truyền chuỗi đã dịch)
          try {
            const popup = window.EventPopup && window.EventPopup.isReady ? window.EventPopup : null;
            if (popup?.showError) {
              popup.showError(window.Lang.get('errorCreatingTasks') + error.message);
            } else {
              alert(window.Lang.get('errorPopupNotInitialized') || "Critical Error: EventPopup is not initialized. Please reload the page.");
            }
          } catch (e2) {
            console.error("Lỗi nghiêm trọng: EventPopup chưa được khởi tạo.", e2);
            // Dịch alert (dùng key)
            alert(window.Lang.get('errorPopupNotInitialized') || "Critical Error: EventPopup is not initialized. Please reload the page.");
          }
        }
      };

      // --- Nút 3.3: Nhắc nhở trả lời (Đã dịch) ---
      const remindOption = document.createElement('button');
      remindOption.className = 'quick-actions-option';
      remindOption.dataset.action = 'reminder';
      remindOption.innerHTML = ICON_REMINDER + window.Lang.get('followUpReminderBtn');
      remindOption.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          const popup = await ensureEventPopupReady();
          console.log("AI Actions: Bắt đầu tạo Nhắc nhở...");
          
          // Dịch loading (truyền key)
          popup.showLoading('preparingReminder');
          
          const emailData = EmailExtractor.extractEmailData(currentEmail);
          
          popup.addAndEditReminder(emailData);
          
        } catch (error) {
          console.error("AI Actions: Lỗi khi tạo Nhắc nhở:", error);
          // Dịch lỗi
          const popup = window.EventPopup && window.EventPopup.isReady ? window.EventPopup : null;
          if (popup?.showError) {
            popup.showError(window.Lang.get('errorCreatingReminder') + error.message);
          } else {
            alert(window.Lang.get('errorPopupNotInitialized') || "Critical Error: EventPopup is not initialized. Please reload the page.");
          }
        }
      };
      
      // --- Nút 3.4: Copy Link (Đã dịch) ---
      const copyLinkOption = document.createElement('button');
      copyLinkOption.className = 'quick-actions-option';
      copyLinkOption.dataset.action = 'link';
      copyLinkOption.innerHTML = ICON_LINK + window.Lang.get('copyLinkBtn');
      copyLinkOption.onclick = (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        const emailLink = window.location.href; 
        navigator.clipboard.writeText(emailLink).then(() => { 
          const originalText = copyLinkOption.innerHTML; 
          // Dịch text
          copyLinkOption.innerHTML = window.Lang.get('copiedSuccess'); 
          setTimeout(() => { 
            copyLinkOption.innerHTML = originalText; 
          }, 2000); 
        }).catch(err => { 
          // Dịch alert
          alert(window.Lang.get('errorCopyLink') + emailLink); 
        }); 
      };

      // Thêm các option vào dropdown
      dropdownMenu.appendChild(eventsOption);
      dropdownMenu.appendChild(tasksOption);
      dropdownMenu.appendChild(remindOption);
      dropdownMenu.appendChild(copyLinkOption);

      // Thêm trigger và dropdown vào wrapper
      quickActionsWrapper.appendChild(triggerButton);
      quickActionsWrapper.appendChild(dropdownMenu);
      
      // Thêm 2 nút vào container chung
      buttonContainer.appendChild(translateButton);
      buttonContainer.appendChild(quickActionsWrapper);
      
      // ✅ Chèn vào Shadow DOM container hoặc trực tiếp vào Gmail DOM
      if (shadowContainer && shadowContainer.container) {
        // Inject shadow host vào Gmail DOM
        targetLocation.prepend(shadowContainer.host);
        // Inject buttons vào shadow container
        shadowContainer.container.appendChild(buttonContainer);
      } else {
        // Fallback: inject trực tiếp vào Gmail DOM
        targetLocation.prepend(buttonContainer);
      }

      // Logic đóng/mở dropdown
      triggerButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        quickActionsWrapper.classList.toggle('open');
      };
      
      // Đảm bảo click vào dropdown không đóng dropdown
      dropdownMenu.onclick = (e) => {
        e.stopPropagation();
      };
      
    } catch (error) {
        console.error("AI Actions: Lỗi trong lúc chèn nút:", error);
    }
  }
  
  // Expose hàm ra window để có thể gọi từ listener toàn cục
  window._injectButtonsToEmail = injectButtonsToEmail;


  // **Các trình quan sát và kiểm tra định kỳ**
  // (Không thay đổi)
  gmail.observe.on('load', () => {
      console.log("AI Actions DEBUG: Sự kiện 'load' đã kích hoạt.");
      
      function scanAndInjectButtons() {
          const openedEmails = document.querySelectorAll('div.adn');
          openedEmails.forEach(emailElement => {
              const emailBody = emailElement.querySelector('div.a3s');
              if (emailBody && emailBody.offsetParent !== null) {
                  injectButtonsToEmail(emailElement);
              }
          });
      }

      // 1. Chèn nút cho email đã mở sẵn
      setTimeout(() => {
          console.log("AI Actions DEBUG: Quét email đã mở sẵn...");
          scanAndInjectButtons();
      }, 1000);

      // 2. Kiểm tra định kỳ mỗi 2 giây
      setInterval(() => {
          scanAndInjectButtons();
      }, 2000);

      // 3. Quan sát khi mở thread mới
      gmail.observe.on('view_thread', () => { 
          console.log("AI Actions DEBUG: Sự kiện 'view_thread' đã kích hoạt.");
          setTimeout(scanAndInjectButtons, 500);
      });

      // 4. MutationObserver để bắt khi email expand/collapse
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.type === 'attributes' || mutation.addedNodes.length > 0) {
                  scanAndInjectButtons();
              }
          });
      });

      const emailContainer = document.querySelector('div[role="main"]');
      if (emailContainer) {
          observer.observe(emailContainer, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['class', 'style']
          });
          console.log("AI Actions DEBUG: MutationObserver đã được gán.");
      }

      // 5. Patch expand() (dự phòng)
      try {
          if (!gmail.dom.email.prototype._ai_patched) {
              const originalExpand = gmail.dom.email.prototype.expand;
              gmail.dom.email.prototype.expand = function() {
                  const result = originalExpand.apply(this, arguments);
                  setTimeout(scanAndInjectButtons, 300);
                  return result;
              };
              gmail.dom.email.prototype._ai_patched = true;
              console.log("AI Actions DEBUG: Patch 'expand' thành công.");
          }
      } catch (e) {
          console.error("AI Actions: Không thể patch expand().", e);
      }
  });

  /**
   * Lắng nghe thay đổi ngôn ngữ và cập nhật các nút đã inject
   */
  function setupLanguageListener() {
    // Đảm bảo chỉ đăng ký listener một lần
    if (window._quickActionsLangListenerSetup) return;
    window._quickActionsLangListenerSetup = true;
    
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
            
            // Cập nhật tất cả các nút đã được inject
            document.querySelectorAll('.ai-gradient-button').forEach(button => {
              // Kiểm tra loại nút và cập nhật text
              if (button.innerHTML.includes(ICON_TRANSLATE)) {
                const isTranslated = button.classList.contains('ai-button-translated');
                button.innerHTML = ICON_TRANSLATE + (isTranslated 
                  ? window.Lang.get('translateEmailOff')
                  : window.Lang.get('translateEmailBtn'));
                button.title = window.Lang.get('translateEmailTitle');
              }
            });
            
            // Cập nhật các option trong dropdown
            document.querySelectorAll('.quick-actions-option').forEach(option => {
              const action = option.dataset.action;
              if (action === 'events') {
                option.innerHTML = ICON_CALENDAR + window.Lang.get('createEventsAIBtn');
              } else if (action === 'tasks') {
                option.innerHTML = ICON_TODO + window.Lang.get('createTasksAIBtn');
              } else if (action === 'link') {
                option.innerHTML = ICON_LINK + window.Lang.get('copyLinkBtn');
              } else if (action === 'reminder') {
                option.innerHTML = ICON_REMINDER + window.Lang.get('followUpReminderBtn');
              }
            });
            
            // Trigger lại scan để cập nhật các email mới mở
            if (gmail && gmail.observe) {
              setTimeout(() => {
                const openedEmails = document.querySelectorAll('div.adn');
                openedEmails.forEach(emailElement => {
                  const emailBody = emailElement.querySelector('div.a3s');
                  if (emailBody && emailBody.offsetParent !== null) {
                    // Xóa container cũ và inject lại với ngôn ngữ mới
                    const oldContainer = emailElement.querySelector('.ai-custom-actions-container');
                    if (oldContainer) {
                      oldContainer.remove();
                    }
                    injectButtonsToEmail(emailElement);
                  }
                });
              }, 100);
            }
            
            console.log(`[QuickActions] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
          } catch (error) {
            console.error('[QuickActions] Lỗi khi cập nhật ngôn ngữ:', error);
          }
        }
      }
    });
  }

  // === 4. CSS đã được di chuyển vào actions.css ===
  // CSS hiện được load qua manifest.json content_scripts
  // Tất cả hardcoded colors đã được thay bằng CSS variables

  console.log("QuickActionsBar: Đã khởi tạo và gán observers thành công.");
}


// === 5. HÀM LOADER (Không thay đổi) ===
function runWhenGmailReady() {
    // Kiểm tra Gmail constructor và jQuery đã có chưa
    if (typeof Gmail === 'function' && typeof jQuery !== 'undefined') {
        // Khởi tạo gmailInstance nếu chưa có
        if (!window.gmailInstance) {
            console.log("QuickActionsBar: Đang khởi tạo Gmail instance...");
            window.gmailInstance = new Gmail(jQuery);
        }
        
        // Kiểm tra observe đã sẵn sàng
        if (window.gmailInstance && window.gmailInstance.observe) {
            console.log("QuickActionsBar: Gmail instance đã sẵn sàng. Đang chạy initializeQuickActions...");
            initializeQuickActions(window.gmailInstance);
        } else {
            setTimeout(runWhenGmailReady, 500);
        }
    } else {
        // Chưa sẵn sàng, kiểm tra lại
        setTimeout(runWhenGmailReady, 500);
    }
}

// === ĐĂNG KÝ LISTENER NGÔN NGỮ TOÀN CỤC (Trước khi Gmail load) ===
// Đảm bảo listener được đăng ký ngay cả khi script chưa khởi tạo xong
if (!window._quickActionsLangListenerSetup) {
  window._quickActionsLangListenerSetup = true;
  
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.userLang && window.Lang) {
      const newLangCode = changes.userLang.newValue;
      const currentLang = window.Lang.getCurrentLanguage();
      
      if (newLangCode && newLangCode !== currentLang) {
        console.log(`[QuickActions] Phát hiện thay đổi ngôn ngữ: ${currentLang} -> ${newLangCode}`);
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
          
          // Cập nhật tất cả các nút đã được inject
          document.querySelectorAll('.ai-gradient-button').forEach(button => {
            if (button.innerHTML.includes(ICON_TRANSLATE)) {
              const isTranslated = button.classList.contains('ai-button-translated');
              button.innerHTML = ICON_TRANSLATE + (isTranslated 
                ? window.Lang.get('translateEmailOff')
                : window.Lang.get('translateEmailBtn'));
              button.title = window.Lang.get('translateEmailTitle');
            }
          });
          
          // Cập nhật các option trong dropdown
          document.querySelectorAll('.quick-actions-option').forEach(option => {
            const action = option.dataset.action;
            if (action === 'events') {
              option.innerHTML = ICON_CALENDAR + window.Lang.get('createEventsAIBtn');
            } else if (action === 'tasks') {
              option.innerHTML = ICON_TODO + window.Lang.get('createTasksAIBtn');
            } else if (action === 'link') {
              option.innerHTML = ICON_LINK + window.Lang.get('copyLinkBtn');
            } else if (action === 'reminder') {
              option.innerHTML = ICON_REMINDER + window.Lang.get('followUpReminderBtn');
            }
          });
          
          // Trigger lại scan để re-inject các email đã mở với ngôn ngữ mới
          setTimeout(() => {
            const openedEmails = document.querySelectorAll('div.adn');
            console.log(`[QuickActions] Tìm thấy ${openedEmails.length} email đã mở, đang re-inject...`);
            openedEmails.forEach(emailElement => {
              const emailBody = emailElement.querySelector('div.a3s');
              if (emailBody && emailBody.offsetParent !== null) {
                // Xóa container cũ và inject lại với ngôn ngữ mới
                const oldContainer = emailElement.querySelector('.ai-custom-actions-container');
                if (oldContainer) {
                  oldContainer.remove();
                }
                // Gọi lại hàm inject nếu có trong scope
                if (window._injectButtonsToEmail) {
                  window._injectButtonsToEmail(emailElement);
                }
              }
            });
          }, 300);
          
          console.log(`[QuickActions] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
        } catch (error) {
          console.error('[QuickActions] Lỗi khi cập nhật ngôn ngữ:', error);
        }
      }
    }
  });
  
  console.log('[QuickActions] Đã đăng ký listener ngôn ngữ toàn cục');
}

// Bắt đầu chạy hàm loader
runWhenGmailReady();