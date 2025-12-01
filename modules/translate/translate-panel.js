// Translation languages configuration (inline definition for simplicity)
const TRANSLATION_LANGUAGES = [
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'zh', label: '中文' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'es', label: 'Español' }
];

function getLanguageLabel(value) {
    if (value === 'auto') return 'Tự động phát hiện';
    const found = TRANSLATION_LANGUAGES.find((lang) => lang.value === value);
    return found ? found.label : value;
}

async function getTargetLanguageForFeature(featureName) {
    try {
        // First check feature-specific preference
        const featureKey = `${featureName}Settings`;
        const featureData = await chrome.storage.local.get(featureKey);
        if (featureData[featureKey]?.lastTargetLanguage) {
            return featureData[featureKey].lastTargetLanguage;
        }
        // Fallback to default from Settings
        const result = await chrome.storage.local.get('translateSettings');
        return result.translateSettings?.defaultTargetLanguage || 'vi';
    } catch {
        return 'vi';
    }
}

async function saveTargetLanguageForFeature(featureName, languageCode) {
    try {
        const featureKey = `${featureName}Settings`;
        const currentData = await chrome.storage.local.get(featureKey);
        const featureSettings = currentData[featureKey] || {};
        await chrome.storage.local.set({
            [featureKey]: { ...featureSettings, lastTargetLanguage: languageCode }
        });
    } catch (error) {
        console.error(`[TranslatePanel] Error saving target language:`, error);
    }
}

const AI_AVATAR_SRC = '../../icons/icon-16.png';
const COPY_ICON_SRC = '../../icons/svg/icon/Essentional, UI/Copy.svg';

let translateView;
let sourceSelect;
let targetSelect;
let sourceTextarea;
let resultContainer;
let submitBtn;
let clipboardBtn;
let advancedBtn;
let advancedMenu;

let langHelper = null;
let notifier = { showError: () => {}, showSuccess: () => {}, showInfo: () => {} };
let isTranslating = false;
let typingInterval = null;
let messageContentEl = null;
let messageTimestampEl = null;
let clipboardEnabled = false;
let advancedMode = 'standard';
let isAdvancedMenuOpen = false;
let runtimeListenerBound = false;
let selectionPasteDebounce = null;
let resizeHandle = null;
let isResizing = false;
let startY = 0;
let startHeight = 0;

export function initializeTranslatePanel(Lang, { showError, showSuccess, showInfo }) {
  langHelper = Lang;
  notifier = { showError, showSuccess, showInfo };

  translateView = document.getElementById('translateView');
  if (!translateView) return;

  sourceSelect = document.getElementById('translateSourceLang');
  targetSelect = document.getElementById('translateTargetLang');
  sourceTextarea = document.getElementById('translateSourceText');
  resultContainer = document.getElementById('translateResultContainer');
  submitBtn = document.getElementById('translateSubmitBtn');
  clipboardBtn = document.getElementById('translateClipboardToggle');
  advancedBtn = document.getElementById('translateAdvancedBtn');
  advancedMenu = document.getElementById('translateAdvancedMenu');

  populateLanguageSelects();
  loadDefaultTargetLanguage();
  setupFooterControls();
  setupResizeHandle();
  bindRuntimeListener();
  // DISABLED: Tooltip đã bị vô hiệu hóa để tránh layout shift
  // attachSmartTooltip(clipboardBtn);
  // attachSmartTooltip(advancedBtn);
  // attachSmartTooltip(submitBtn);
  // if (clipboardBtn && !clipboardBtn.dataset.tooltipText) {
  //   clipboardBtn.dataset.tooltipText = getLangString('translateClipboardTooltipOff') || 'Bật để tự động dán nội dung đã chọn';
  // }
  refreshAdvancedButtonState();
  
  // Khôi phục trạng thái Clipboard từ storage
  loadClipboardState();

  document.getElementById('translateSwapBtn')?.addEventListener('click', handleSwapLanguages);
  submitBtn?.addEventListener('click', handleTranslateSubmit);
  
  // Save target language preference when changed
  targetSelect?.addEventListener('change', (e) => {
    const langCode = e.target.value;
    if (langCode && langCode !== 'auto') {
      saveTargetLanguagePreference(langCode);
    }
  });

  sourceTextarea?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleTranslateSubmit();
    }
  });
}

export function focusTranslateInput() {
  sourceTextarea?.focus();
}

export function resetTranslatePanel() {
  if (sourceTextarea) {
    sourceTextarea.value = '';
  }
  clearTypingInterval();
  messageContentEl = null;
  messageTimestampEl = null;
  if (resultContainer) {
    resultContainer.innerHTML = `
      <p class="translate-result-placeholder" data-i18n="translateResultPlaceholder">
        ${getLangString('translateResultPlaceholder') || 'Kết quả dịch sẽ được hiển thị tại đây.'}
      </p>
    `;
  }
  // Không reset clipboard state - giữ nguyên trạng thái đã lưu
}

function populateLanguageSelects() {
  if (!sourceSelect || !targetSelect) return;

  const autoOption = document.createElement('option');
  autoOption.value = 'auto';
  autoOption.textContent = getLangString('translateAutoDetect') || 'Tự động phát hiện';
  sourceSelect.appendChild(autoOption);

  TRANSLATION_LANGUAGES.forEach((lang) => {
    const option = document.createElement('option');
    option.value = lang.value;
    option.textContent = lang.label;
    sourceSelect.appendChild(option.cloneNode(true));
    targetSelect.appendChild(option);
  });

  sourceSelect.value = 'auto';
  // Target language will be set by loadDefaultTargetLanguage()
}

async function loadDefaultTargetLanguage() {
  if (!targetSelect) return;
  
  try {
    const defaultLang = await getTargetLanguageForFeature('translatePanel');
    targetSelect.value = defaultLang;
    console.log('[TranslatePanel] Loaded default target language:', defaultLang);
  } catch (error) {
    console.error('[TranslatePanel] Error loading default target language:', error);
    targetSelect.value = 'vi'; // Fallback
  }
}

function saveTargetLanguagePreference(langCode) {
  saveTargetLanguageForFeature('translatePanel', langCode).catch(error => {
    console.error('[TranslatePanel] Error saving target language preference:', error);
  });
}

function handleSwapLanguages() {
  if (!sourceSelect || !targetSelect) return;

  const sourceValue = sourceSelect.value;
  const targetValue = targetSelect.value;

  if (sourceValue === 'auto') {
    sourceSelect.value = targetValue;
    targetSelect.value = 'vi';
  } else {
    sourceSelect.value = targetValue;
    targetSelect.value = sourceValue;
  }
}

async function handleTranslateSubmit() {
  if (isTranslating) return;
  if (!sourceTextarea || !submitBtn) return;

  const text = sourceTextarea.value.trim();
  if (!text) {
    notifier.showError(getLangString('translateErrorEmpty') || 'Vui lòng nhập nội dung cần dịch.');
    return;
  }

  const sourceLang = sourceSelect?.value || 'auto';
  const targetLang = targetSelect?.value || 'vi';

  isTranslating = true;
  setButtonLoading(true);
  startTypingIndicator();

  try {
    const configResponse = await chrome.runtime.sendMessage({ action: 'getAIConfig' });
    if (!configResponse?.success || !configResponse.config) {
      throw new Error(getLangString('translateErrorConfig') || 'Không thể tải cấu hình AI.');
    }

    const messages = buildTranslateMessages(text, sourceLang, targetLang);
    const response = await chrome.runtime.sendMessage({
      action: 'processAction',
      messages,
      config: configResponse.config
    });

    if (!response?.success) {
      throw new Error(response?.error?.message || getLangString('translateErrorResponse') || 'Không thể dịch nội dung.');
    }

    const content = response.result || '';
    await renderTranslationResult(content || '');
  } catch (error) {
    console.error('[TranslatePanel] Failed to translate:', error);
    notifier.showError(error.message || getLangString('translateErrorResponse'));
  } finally {
    isTranslating = false;
    setButtonLoading(false);
    clearTypingInterval();
  }
}

function buildTranslateMessages(text, sourceLang, targetLang) {
  const targetLabel = getLanguageLabel(targetLang);
  const sourceLabel = sourceLang === 'auto'
    ? (getLangString('translateAutoDetect') || 'Tự động phát hiện')
    : getLanguageLabel(sourceLang);

  const instructions = sourceLang === 'auto'
    ? `Hãy tự động phát hiện ngôn ngữ gốc của đoạn văn và dịch sang ${targetLabel}.`
    : `Hãy dịch đoạn văn từ ${sourceLabel} sang ${targetLabel}.`;

  let systemPrompt = 'Bạn là một chuyên gia dịch thuật chính xác. Trả lời chỉ với nội dung đã dịch.';
  let userPrompt = `${instructions}\n\nVăn bản cần dịch:\n"""${text}"""`;

  if (advancedMode === 'terminology') {
    systemPrompt = `Bạn là chuyên gia dịch thuật thuật ngữ. Trả lời đúng định dạng JSON sau:
{
  "translation": "Chuỗi dịch nguyên văn, không thêm ký tự đặc biệt",
  "explanation": [
    "- Gạch đầu dòng giải thích ngắn gọn bằng tiếng Việt",
    "- Không dùng định dạng đậm/nghiêng/bảng"
  ]
}
Không thêm bất kỳ văn bản nào ngoài JSON.`;
    userPrompt = `Hãy dịch đoạn văn sau sang ${targetLabel}. Giữ nguyên định dạng câu gốc, không thêm bullet hoặc đánh số trong phần dịch.

Văn bản:
"""${text.replace(/"/g, '\\"')}"""`;
  } else {
    const modeInstructions = 'Dịch tự nhiên, dễ hiểu và giữ nguyên định dạng quan trọng.';
    systemPrompt = `Bạn là một chuyên gia dịch thuật chính xác. ${modeInstructions} Trả lời chỉ với nội dung đã dịch.`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function setButtonLoading(isLoading) {
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
}

async function renderTranslationResult(content) {
  const messageContent = ensureMessageContainer();
  clearTypingInterval();
  messageContent.innerHTML = '';

  if (advancedMode === 'terminology' && renderTerminologyResult(messageContent, content)) {
    updateTimestampToNow();
    return;
  }

  const cleanContent = content.replace(/^"{2}\s*/, '').replace(/\s*"{2}$/,'');

  if (typeof marked !== 'undefined') {
    try {
      messageContent.innerHTML = marked.parse(cleanContent);
      updateTimestampToNow();
      return;
    } catch (error) {
      console.warn('[TranslatePanel] Markdown render failed, fallback to streaming text:', error);
      messageContent.textContent = '';
    }
  }

  await streamText(messageContent, cleanContent);
  updateTimestampToNow();
}

function getLangString(key) {
  if (langHelper && typeof langHelper.get === 'function') {
    return langHelper.get(key);
  }
  return null;
}

function setupFooterControls() {
  clipboardBtn?.addEventListener('click', () => toggleClipboard(!clipboardEnabled));
  advancedBtn?.addEventListener('click', toggleAdvancedMenu);
  document.addEventListener('click', (event) => {
    if (!isAdvancedMenuOpen) return;
    if (advancedBtn?.contains(event.target) || advancedMenu?.contains(event.target)) return;
    closeAdvancedMenu();
  });
  advancedMenu?.querySelectorAll('.advanced-option').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode || 'standard';
      setAdvancedMode(mode);
      closeAdvancedMenu();
    });
    // DISABLED: Tooltip đã bị vô hiệu hóa
    // setAdvancedOptionTooltip(button);
    // attachSmartTooltip(button);
  });
}

function setupResizeHandle() {
  resizeHandle = document.getElementById('translateResizeHandle');
  if (!resizeHandle || !sourceTextarea) return;

  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    startY = e.clientY;
    startHeight = sourceTextarea.offsetHeight;
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    
    // Thêm class để thay đổi cursor
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  });
}

function handleResize(e) {
  if (!isResizing || !sourceTextarea) return;
  
  const deltaY = e.clientY - startY;
  const newHeight = Math.max(160, startHeight + deltaY); // Min height 160px
  sourceTextarea.style.height = `${newHeight}px`;
}

function stopResize() {
  if (!isResizing) return;
  
  isResizing = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  
  // Khôi phục cursor và user-select
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

function toggleClipboard(enabled) {
  clipboardEnabled = enabled;
  if (clipboardBtn) {
    clipboardBtn.dataset.active = String(enabled);
    // DISABLED: Tooltip đã bị vô hiệu hóa
    // clipboardBtn.dataset.tooltipText = enabled
    //   ? (getLangString('translateClipboardTooltipOn') || 'Đang tự động dán nội dung đã chọn')
    //   : (getLangString('translateClipboardTooltipOff') || 'Bật để tự động dán nội dung đã chọn');
  }
  saveClipboardState(enabled);
  updateSelectionMonitor(enabled);
}

async function saveClipboardState(enabled) {
  try {
    await chrome.storage.local.set({ translateClipboardEnabled: enabled });
  } catch (error) {
    console.warn('[TranslatePanel] Failed to save clipboard state:', error);
  }
}

async function loadClipboardState() {
  try {
    const result = await chrome.storage.local.get(['translateClipboardEnabled']);
    const savedState = result.translateClipboardEnabled === true;
    
    // Cập nhật biến trạng thái
    clipboardEnabled = savedState;
    
    // Đồng bộ UI
    if (clipboardBtn) {
      clipboardBtn.dataset.active = String(clipboardEnabled);
      // DISABLED: Tooltip đã bị vô hiệu hóa
      // clipboardBtn.dataset.tooltipText = clipboardEnabled
      //   ? (getLangString('translateClipboardTooltipOn') || 'Đang tự động dán nội dung đã chọn')
      //   : (getLangString('translateClipboardTooltipOff') || 'Bật để tự động dán nội dung đã chọn');
    }
    
    // Đảm bảo content script được đồng bộ với trạng thái
    // (quan trọng khi panel mở lại sau khi đóng)
    updateSelectionMonitor(clipboardEnabled);
  } catch (error) {
    console.warn('[TranslatePanel] Failed to load clipboard state:', error);
  }
}

function toggleAdvancedMenu() {
  isAdvancedMenuOpen = !isAdvancedMenuOpen;
  if (advancedBtn?.parentElement) {
    advancedBtn.parentElement.classList.toggle('open', isAdvancedMenuOpen);
  }
  refreshAdvancedButtonState();
}

function closeAdvancedMenu() {
  isAdvancedMenuOpen = false;
  if (advancedBtn?.parentElement) {
    advancedBtn.parentElement.classList.remove('open');
  }
  refreshAdvancedButtonState();
}

function setAdvancedMode(mode) {
  advancedMode = mode;
  advancedMenu?.querySelectorAll('.advanced-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  refreshAdvancedButtonState();
}

function refreshAdvancedButtonState() {
  if (!advancedBtn) return;
  advancedBtn.dataset.active = 'true';
  advancedBtn.dataset.mode = advancedMode;
  const tooltip = advancedMode === 'terminology'
    ? (getLangString('translateAdvancedTerminologyTooltip') || 'Dịch thuật ngữ, giải thích chi tiết các thuật ngữ chuyên ngành')
    : (getLangString('translateAdvancedStandardTooltip') || 'Dịch thông thường, tự nhiên và giữ ngữ cảnh');
  // DISABLED: Tooltip đã bị vô hiệu hóa
  // advancedBtn.dataset.tooltipText = tooltip;
  const label = advancedBtn.querySelector('span');
  if (label) {
    if (advancedMode === 'terminology') {
      label.textContent = getLangString('translateAdvancedTerminology') || 'Dịch thuật ngữ';
    } else {
      label.textContent = getLangString('translateAdvancedStandard') || 'Dịch thông thường';
    }
  }
}

async function updateSelectionMonitor(enabled) {
  const tab = await getActiveTab();
  if (!tab?.id) {
    console.warn('[TranslatePanel] No active tab found for selection monitor');
    return;
  }
  try {
    await sendMessageToTab(tab.id, { action: 'translateSelectionMonitor', enabled });
  } catch (error) {
    // Chỉ log warning cho các lỗi không phải do content script chưa sẵn sàng hoặc channel đóng
    const errorMessage = error?.message || String(error);
    const isCommonError = errorMessage.includes('Could not establish connection') ||
                         errorMessage.includes('Receiving end does not exist') ||
                         errorMessage.includes('Extension context invalidated') ||
                         errorMessage.includes('message port closed') ||
                         errorMessage.includes('message channel closed') ||
                         errorMessage.includes('The message port closed');
    
    if (!isCommonError) {
      console.warn('[TranslatePanel] Failed to update selection monitor:', errorMessage);
    }
    // Không throw error để không làm gián đoạn flow chính
  }
}

function bindRuntimeListener() {
  if (runtimeListenerBound) return;
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  runtimeListenerBound = true;
}

function handleRuntimeMessage(message) {
  if (message?.action === 'translateSelectionChanged') {
    handleIncomingSelection(message.text || '');
  }
}

function handleIncomingSelection(text) {
  if (!clipboardEnabled || !text || !sourceTextarea) return;
  if (!isTranslateViewVisible()) return;
  clearTimeout(selectionPasteDebounce);
  selectionPasteDebounce = setTimeout(() => {
    sourceTextarea.value = text;
    sourceTextarea.focus();
    sourceTextarea.setSelectionRange(text.length, text.length);
  }, 120);
}

function isTranslateViewVisible() {
  return translateView && translateView.style.display !== 'none';
}

function handleCopyTranslation() {
  if (!messageContentEl) return;
  const text = messageContentEl.textContent?.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    notifier.showSuccess(getLangString('successCopied') || 'Đã copy vào clipboard');
  }).catch(() => {
    notifier.showError(getLangString('errorCopy') || 'Không thể copy nội dung');
  });
}

function ensureMessageContainer() {
  if (!resultContainer) return null;
  if (messageContentEl) return messageContentEl;

  resultContainer.innerHTML = '';
  const messageEl = document.createElement('div');
  messageEl.className = 'message assistant assistant-message translate-message';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = `<img src="${AI_AVATAR_SRC}" alt="AI">`;

  const body = document.createElement('div');
  body.className = 'message-body';

  const content = document.createElement('div');
  content.className = 'message-content markdown-content';

  const footer = document.createElement('div');
  footer.className = 'message-footer';

  const timestamp = document.createElement('span');
  timestamp.className = 'timestamp';
  timestamp.textContent = getLangString('translateStatusTranslating') || 'Đang trả lời...';

  const actions = document.createElement('div');
  actions.className = 'action-buttons';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn copy-btn';
  copyBtn.innerHTML = `<img src="${COPY_ICON_SRC}" alt="Copy">`;
  copyBtn.title = getLangString('copyMessage') || 'Copy';
  // DISABLED: Tooltip đã bị vô hiệu hóa
  // copyBtn.dataset.tooltipText = getLangString('copyMessage') || 'Copy';
  copyBtn.addEventListener('click', handleCopyTranslation);

  actions.appendChild(copyBtn);
  footer.appendChild(timestamp);
  footer.appendChild(actions);

  body.appendChild(content);
  body.appendChild(footer);
  messageEl.appendChild(avatar);
  messageEl.appendChild(body);
  resultContainer.appendChild(messageEl);

  messageContentEl = content;
  messageTimestampEl = timestamp;
  return messageContentEl;
}

function startTypingIndicator() {
  const contentEl = ensureMessageContainer();
  if (!contentEl) return;

  clearTypingInterval();
  let dotCount = 0;
  contentEl.textContent = 'Đang trả lời';
  typingInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    const dots = '.'.repeat(dotCount);
    contentEl.textContent = `Đang trả lời${dots}`;
    if (messageTimestampEl) {
      messageTimestampEl.textContent = `Đang trả lời${dots}`;
    }
  }, 400);
}

function clearTypingInterval() {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
}

async function streamText(targetEl, text) {
  const cleanText = text;
  const total = cleanText.length;
  let index = 0;

  return new Promise((resolve) => {
    const step = () => {
      if (index >= total) {
        resolve();
        return;
      }
      targetEl.textContent += cleanText.charAt(index);
      index += 1;
      setTimeout(step, 12);
    };
    step();
  });
}

function updateTimestampToNow() {
  if (!messageTimestampEl) return;
  messageTimestampEl.textContent = formatTimestamp(new Date());
}

function formatTimestamp(date) {
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${time} | ${day}`;
}

function getActiveTab() {
  return new Promise((resolve) => {
    if (!chrome?.tabs?.query) {
      resolve(null);
      return;
    }
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      resolve(tabs && tabs.length ? tabs[0] : null);
    });
  });
}

function sendMessageToTab(tabId, payload) {
  return new Promise((resolve, reject) => {
    if (!chrome?.tabs?.sendMessage) {
      resolve();
      return;
    }
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        // Trích xuất message từ error object
        const errorMessage = lastError.message || String(lastError);
        reject(new Error(errorMessage));
      } else {
        resolve(response);
      }
    });
  });
}

function renderTerminologyResult(container, rawContent) {
  const data = parseTerminologyJson(rawContent);
  if (!data) return false;

  const translationSection = document.createElement('div');
  translationSection.className = 'translate-terminology-section';
  translationSection.innerHTML = `
    <div class="translate-terminology-title">${getLangString('translateTerminologyTranslation') || 'Bản dịch'}</div>
    <p class="translate-terminology-content">${data.translation || ''}</p>
  `;
  container.appendChild(translationSection);

  if (Array.isArray(data.explanation) && data.explanation.length) {
    const explanationSection = document.createElement('div');
    explanationSection.className = 'translate-terminology-section';
    explanationSection.innerHTML = `
      <div class="translate-terminology-title">${getLangString('translateTerminologyExplanation') || 'Giải thích thuật ngữ'}</div>
    `;
    const list = document.createElement('div');
    list.className = 'translate-terminology-explanation';
    data.explanation.forEach((item) => {
      const bullet = document.createElement('div');
      bullet.className = 'translate-terminology-bullet';
      const cleanItem = String(item || '').replace(/^\s*[-•]\s*/, '').trim();
      bullet.textContent = cleanItem;
      list.appendChild(bullet);
    });
    explanationSection.appendChild(list);
    container.appendChild(explanationSection);
  }
  return true;
}

function attachSmartTooltip(element) {
  if (!element) return;
  element.removeAttribute('title');
  element.addEventListener('mouseenter', () => {
    element.removeAttribute('title');
    element.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right');
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const preferTop = rect.bottom + 60 > viewportHeight;
    element.classList.add(preferTop ? 'tooltip-top' : 'tooltip-bottom');
    if (rect.right + 280 > viewportWidth) {
      element.classList.add('tooltip-left');
    } else if (rect.left - 140 < 0) {
      element.classList.add('tooltip-right');
    }
  });
}

function setAdvancedOptionTooltip(button) {
  if (!button) return;
  // DISABLED: Tooltip đã bị vô hiệu hóa
  // const mode = button.dataset.mode === 'terminology' ? 'terminology' : 'standard';
  // const tooltip = mode === 'terminology'
  //   ? (getLangString('translateAdvancedTerminologyOptionTooltip') || 'Dịch nguyên câu và giải thích thuật ngữ')
  //   : (getLangString('translateAdvancedStandardOptionTooltip') || 'Dịch nhanh, tự nhiên và giữ ngữ cảnh');
  // button.dataset.tooltipText = tooltip;
}

function parseTerminologyJson(rawContent) {
  if (!rawContent) return null;
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  const candidate = jsonMatch ? jsonMatch[0] : rawContent;
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object') {
      return {
        translation: parsed.translation || '',
        explanation: Array.isArray(parsed.explanation) ? parsed.explanation : []
      };
    }
  } catch (error) {
    console.warn('[TranslatePanel] Failed to parse terminology JSON:', error);
  }
  return null;
}

