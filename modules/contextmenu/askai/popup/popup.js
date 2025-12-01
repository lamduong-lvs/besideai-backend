// askai/popup/popup.js - REFACTORED FOR JSON/MARKDOWN, ADAPTERS, RACE MODE PREP, THEME SYNC

import { themeManager } from '../../../../utils/theme.js';
import { auth } from '../../../../modules/auth/auth.js';
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
        console.error(`[Popup] Error saving target language:`, error);
    }
}

function detectVietnamese(text) {
    if (!text || text.trim().length === 0) return false;
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    return vietnameseChars.test(text);
}

// --- Global State ---
let messageHistory = [];
let currentType = 'chat'; // 'chat', 'translate', 'search'
let originalText = ''; // Can be plain text or HTML for translate
let isProcessing = false;
let currentTargetLanguage = 'vi'; // Default target language code (e.g., 'vi', 'en')
let isEditingMessage = false;
let currentUtterance = null; // Store utterance for TTS control
let userAvatarUrl = '../../../../icons/svg/icon/Users/User.svg'; // Default user avatar
let recognition; // Speech recognition instance
let isListening = false;
let singleLineHeight = 0;

// --- AI Configuration State (Read from storage) ---
let currentProvider = 'cerebras'; // Default provider ID
let isRaceModeEnabled = false;
let raceModelsList = []; // List of provider IDs for race mode

// Sử dụng key thay vì string cố định
const TITLES_KEYS = {
  chat: 'titleChat',
  translate: 'titleTranslate',
  search: 'titleSearch'
};

// ========================================
// --- AI PROVIDER ADAPTER REGISTRY ---
// ========================================

// Define the standard structure the UI expects
/* Standard JSON Structure:
{
  translation: "Translated text (may contain HTML)",
  explanation: {
    context: "...",
    wordChoice: "...", // Optional
    structure: "..." // Optional
  },
  vocabulary: [ // Only if targetLanguage is English
    { word: "Keyword", ipa: "/phonetic/", mean: "dịch nghĩa" }
  ]
}
*/

// Adapter for Cerebras (Assuming it returns the standard structure directly if prompted correctly)
function adaptCerebrasJSON(data) {
  // Add basic validation
  if (!data || typeof data.translation !== 'string') {
     console.error("Invalid Cerebras JSON received:", data);
     throw new Error(Lang.get("errorInvalidCerebras"));
  }
  // Ensure explanation exists
  data.explanation = data.explanation || { context: "", structure: "" };
  // Ensure vocabulary is an array if it exists
  data.vocabulary = data.vocabulary || [];
  return data;
}

// Placeholder for AwesomeAI adapter
function adaptAwesomeAI_JSON(data) {
  // Example: Convert AwesomeAI's format to our standard
  if (!data || !data.result || typeof data.result.translated_text !== 'string') {
      console.error("Invalid AwesomeAI JSON received:", data);
      throw new Error(Lang.get("errorInvalidAwesomeAI"));
  }
  return {
    translation: data.result.translated_text,
    explanation: {
      context: data.result.details || "", // Map 'details' to 'context'
      structure: "" // No structure info from AwesomeAI
    },
    vocabulary: (data.result.keywords || []).map(k => ({
      word: k.term || "",
      ipa: k.pron || "", // Map 'pron' to 'ipa'
      mean: k.def || ""  // Map 'def' to 'mean'
    }))
  };
}

// *** ADD NEW ADAPTER FUNCTIONS HERE WHEN ADDING PROVIDERS ***
// function adaptNewProviderJSON(data) { ... return standardizedData; }

const AI_PROVIDER_REGISTRY = {
  'Cerebras': adaptCerebrasJSON,
  'AwesomeAI': adaptAwesomeAI_JSON
  // *** ADD NEW PROVIDERS HERE ***
  // 'NewProvider': adaptNewProviderJSON
};

// Define a default adapter if the selected provider is not found in the registry
const DEFAULT_ADAPTER = adaptCerebrasJSON;

// ========================================
// --- SYSTEM PROMPT GENERATION ---
// ========================================

// Determines which prompt to use based on target language
function getSystemPrompt(targetLanguage, originalLangIsVietnamese) {
  // Use language code ('en') instead of full name ('English')
  if (targetLanguage === 'en' && originalLangIsVietnamese) {
    // Learning mode - Request JSON
    return getEnglishLearningSystemPrompt();
  } else {
    // Standard mode - Request Markdown
    const targetLangLabel = getLanguageLabel(targetLanguage);
    return getStandardTranslationSystemPrompt(targetLangLabel);
  }
}

// Prompt for English Learning Mode (JSON Output)
function getEnglishLearningSystemPrompt() {
  // (Các prompt hệ thống gửi cho AI không cần i18n, trừ khi bạn muốn)
  return `You are a professional translator and English teacher. You will receive user text that may contain simple HTML tags (like <b>, <i>, <strong>, <em>).

Translate ONLY the text content to English, and PRESERVE the HTML tags exactly as they were.

After the translation, provide a brief explanation in Vietnamese and list exactly 3 key English vocabulary words from the translation.

**RESPONSE MUST BE A SINGLE VALID JSON OBJECT, with NO additional text before or after.**

**JSON STRUCTURE:**
{
  "translation": "The translated text with preserved HTML",
  "explanation": {
    "context": "Vietnamese explanation of the context (max 1 sentence).",
    "structure": "Vietnamese comment on sentence structure (optional, max 1 sentence)."
  },
  "vocabulary": [
    { "word": "EnglishKeyword1", "ipa": "/phonetic_spelling/", "mean": "Vietnamese meaning" },
    { "word": "EnglishKeyword2", "ipa": "/phonetic_spelling/", "mean": "Vietnamese meaning" },
    { "word": "EnglishKeyword3", "ipa": "/phonetic_spelling/", "mean": "Vietnamese meaning" }
  ]
}

**RULES:**
- Only output the JSON object.
- Provide exactly 3 vocabulary items.
- Keep explanations concise.
- Ensure IPA is in slashes /.../.
`;
}

// Prompt for Standard Translation Mode (Markdown Output)
function getStandardTranslationSystemPrompt(targetLanguage) {
  // This is the old prompt, slightly modified for clarity
  return `You are a professional translator. Translate the following text to ${targetLanguage}. Preserve simple HTML tags (like <b>, <i>) if present in the original text.

After the translation, provide a brief, professional explanation in Vietnamese using bullet points.

**RESPONSE FORMAT (Markdown):**
**Translation:**
[The translated text with preserved HTML]

**Explanation:**
-   **Ngữ cảnh:** [Explain the context...].
-   **Lựa chọn từ:** [Explain key word choices...].
-   **Cấu trúc câu:** [Comment on structure...]

**QUAN TRỌNG:** Chỉ giải thích về nội dung, ngữ nghĩa, và lựa chọn từ. KHÔNG giải thích về định dạng Markdown hay cấu trúc trình bày của bạn.
(Use bullet points and **bold** key terms in your Vietnamese explanation.)`;
}

// ========================================
// INITIALIZATION & DOMContentLoaded
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
	if (window.Lang && window.Lang.initializationPromise) {
    await window.Lang.initializationPromise;
  }
  console.log('[Popup] DOMContentLoaded');

  // 0. Set document title from i18n
  // (Phải chờ i18n.js tải xong. Giả định i18n.js chạy trước)
  if (window.Lang) {
    document.title = Lang.get('popupHtmlTitle');
  }

  // 1. Initialize Theme Manager & Add Listener
  await themeManager.init();
  chrome.storage.onChanged.addListener(handleStorageChange); // Add listener for theme sync

  // 2. Initialize Auth & Get User Avatar
  try {
    await auth.initialize();
    const user = await auth.getCurrentUser();
    if (user && user.picture) {
      userAvatarUrl = user.picture;
      console.log('[Popup] User avatar URL loaded:', userAvatarUrl);
    } else {
      console.warn('[Popup] Could not get user avatar.');
    }
  } catch (authError) {
    console.warn('[Popup] Auth init failed:', authError);
  }

  // 3. Read AI Settings from Storage
  try {
    const data = await chrome.storage.local.get(['aiProvider', 'raceSettings']);
    if (data.aiProvider) {
      currentProvider = data.aiProvider;
    }
    if (data.raceSettings) {
      isRaceModeEnabled = data.raceSettings.enabled || false;
      raceModelsList = data.raceSettings.models || [];
    }
    console.log('[Popup] AI Settings Loaded:', { currentProvider, isRaceModeEnabled, raceModelsList });
  } catch (error) {
    console.error('[Popup] Failed to load AI settings:', error);
  }

  // 4. Parse URL Params
  const urlParams = new URLSearchParams(window.location.search);
  currentType = urlParams.get('type') || 'chat';
  originalText = urlParams.get('text') || ''; // This can now be HTML

  // 5. Setup UI & Event Listeners
  updateHeaderUI();
  await populateLanguageSelector();
  await loadDefaultTargetLanguage();
  setupEventListeners();
  setupDraggableHeader();
  setupResizeHandle();
  setupSpeechRecognition();
  setupFooterUI();

  // Initial layout calculation
  const chatInput = document.getElementById('chatInput');
  if (chatInput) handleInputResize({ target: chatInput });

  // 6. Trigger initial action based on URL params
  await triggerInitialAction();
});

// Listener for theme changes from storage
function handleStorageChange(changes, namespace) {
  if (namespace === 'local' && changes.theme) {
    const newTheme = changes.theme.newValue === 'dark' ? 'dark' : 'light';
    console.log('[Popup] Theme changed in storage, updating UI:', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }
}


// ========================================
// INITIAL ACTION TRIGGER
// ========================================

async function triggerInitialAction() {
  console.log('[Popup] Triggering initial action. Type:', currentType, 'Text:', originalText.substring(0, 100)); // Show more text/HTML

  if (!originalText) {
    console.warn('[Popup] No original text provided');
    renderMessage('system', Lang.get('errorNoTextSelected'), `msg-system-${Date.now()}`);
    return;
  }

  if (currentType === 'translate') {
    // Check if we have a saved preference, otherwise auto-detect
    const languageSelector = document.getElementById('languageSelector');
    
    // If no preference set, auto-detect
    if (!currentTargetLanguage || currentTargetLanguage === 'vi') {
      const isVn = isVietnamese(originalText);
      // If Vietnamese, default to English; otherwise use saved preference or default to Vietnamese
      if (isVn) {
        currentTargetLanguage = 'en'; // Vietnamese -> English
      } else {
        // Use saved preference or default to 'vi'
        if (languageSelector && languageSelector.value) {
          currentTargetLanguage = languageSelector.value;
        } else {
          currentTargetLanguage = 'vi'; // Other -> Vietnamese
        }
      }
      
      console.log('[Popup] Auto-detected language:', isVn ? 'Vietnamese' : 'Other', '-> Target:', currentTargetLanguage);
    }

    // Update dropdown to reflect target language
    if (languageSelector) {
      languageSelector.value = currentTargetLanguage;
    }

    // Get the appropriate system prompt (JSON for English, Markdown otherwise)
    const isVn = isVietnamese(originalText);
    const systemPrompt = getSystemPrompt(currentTargetLanguage, isVn);

    // Prepare messages for the FIRST translation run only
    const messagesForFirstRun = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: originalText } // Send the HTML or text
    ];

    // Call runAction with this specific set of messages
    await runAction(messagesForFirstRun);

  } else if (currentType === 'search') {
    // (Search logic remains the same - uses plain text)
    const plainOriginalText = stripHtml(originalText); // Convert HTML to plain text for search prompt
    const systemPrompt = `Bạn là một trợ lý tìm kiếm thông minh. Người dùng đã bôi đen văn bản sau:\n"${plainOriginalText}"\n\nHãy cung cấp thông tin tìm kiếm hoặc giải thích về nội dung này.`;
    messageHistory.push({ role: 'system', content: systemPrompt });
    renderMessage('system', Lang.get('systemContextSavedSearch', { text: plainOriginalText.substring(0, 50) }), `msg-system-${Date.now()}`);

  } else if (currentType === 'chat') {
    // (Chat logic remains the same - uses plain text)
    const plainOriginalText = stripHtml(originalText); // Convert HTML to plain text for chat context
    showQuoteWrapper(plainOriginalText);
    const systemPrompt = `Bạn là một trợ lý AI thông minh. Người dùng đã bôi đen đoạn văn bản sau đây. Hãy dựa vào văn bản này để trả lời các câu hỏi tiếp theo của họ.\n\nVăn bản ngữ cảnh:\n"${plainOriginalText}"`;
    messageHistory.push({ role: 'system', content: systemPrompt });
    renderMessage('system', Lang.get('systemContextSavedChat', { text: plainOriginalText.substring(0, 50) }), `msg-system-${Date.now()}`);
  }

  console.log('[Popup] Initial action setup complete.');
}


function showQuoteWrapper(plainText) {
  const container = document.getElementById('messagesContainer');
  if (!container || !plainText) return;
  const displayText = plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;
  const quoteDiv = document.createElement('div');
  quoteDiv.className = 'quote-wrapper';
  quoteDiv.innerHTML = `
    <div class="quote-content">"${escapeHtml(displayText)}"</div>
    <button class="quote-close" title="${Lang.get("quoteCloseTitle")}">&times;</button>
  `;
  container.appendChild(quoteDiv);
  quoteDiv.querySelector('.quote-close').addEventListener('click', () => quoteDiv.remove());
}

// ========================================
// MESSAGE SENDING & PROCESSING
// ========================================

async function handleSendMessage() {
    if (isEditingMessage || isProcessing) return;
    window.speechSynthesis.cancel(); // Stop TTS if any

    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 1. Always save and render user message
    const userMessageContent = text; // User input is always plain text
    messageHistory.push({ id: msgId, role: 'user', content: userMessageContent });
    renderMessage('user', userMessageContent, msgId);

    // Reset input
    input.value = '';
    handleInputResize({ target: input });

    // --- REVISED LOGIC FOR runAction CALL ---
    if (currentType === 'translate') {
        // A. TRANSLATE MODE: New input = New independent translation request

        // 1. Get target language from dropdown (user might have changed it)
        const languageSelector = document.getElementById('languageSelector');
        if (languageSelector && languageSelector.value) {
            currentTargetLanguage = languageSelector.value;
            // Save preference
            saveTargetLanguageForFeature('contextMenu', currentTargetLanguage).catch(err => {
              console.error('[Popup] Error saving target language preference:', err);
            });
        } else {
            // Fallback: auto-detect based on input text
            const isInputVn = isVietnamese(userMessageContent);
            currentTargetLanguage = isInputVn ? 'en' : 'vi';
        }

        // 2. Determine if original language is Vietnamese for prompt selection
        const isInputVn = isVietnamese(userMessageContent); // ✅ SỬA LỖI: Kiểm tra ngôn ngữ nhập
        // 3. Get the correct system prompt (JSON or Markdown)
        const systemPrompt = getSystemPrompt(currentTargetLanguage, isInputVn); // ✅ SỬA LỖI: Truyền cờ chính xác

        // 4. Create a specific message array for THIS run only
        const messagesForThisRun = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessageContent } // Send the new user text
        ];

        // 5. Call runAction with the specific messages
        await runAction(messagesForThisRun);

    } else {
        // B. CHAT/SEARCH MODE: Use the entire message history
        await runAction(); // Call with null to use global history
    }
}


async function runAction(messagesForThisRun = null) {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  if (!input || !sendBtn) return;

  isProcessing = true;
  input.disabled = true;
  sendBtn.disabled = true;

  const aiMsgId = `msg-ai-${Date.now()}`;
  const loadingEl = renderMessage('ai', '', aiMsgId, true);
  scrollToBottom();

  try {
    let messagesToSend;
    // Determine which message array to send
    if (messagesForThisRun) {
      // Use the specific array passed (for translate mode)
      messagesToSend = messagesForThisRun.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role,
        content: msg.content
      }));
      console.log('[Popup] Sending specific messages for this run:', messagesToSend.length);
    } else {
      // Use the global history (for chat/search mode)
      messagesToSend = messageHistory
        .filter(m => !m.isLoading && m.role !== 'system-error')
        .map(msg => ({
          role: msg.role === 'ai' ? 'assistant' : msg.role,
          content: msg.content
        }));
      console.log('[Popup] Sending global message history:', messagesToSend.length);
    }

    // Prepare AI Config for Background
    const aiConfig = {
      isRaceMode: isRaceModeEnabled,
      models: (isRaceModeEnabled && raceModelsList.length >= 2) ? raceModelsList : [currentProvider]
    };

    console.log('[Popup] Sending request to background with config:', aiConfig);

    // Send to background script
    const response = await chrome.runtime.sendMessage({
      action: 'processAction',
      type: currentType,
      messages: messagesToSend,
      config: aiConfig
    });

    console.log('[Popup] Response received from background:', response);

    // ✅ KIỂM TRA RESPONSE NGAY TỪ ĐẦU
    if (!response || !response.success) {
      // ❌ XỬ LÝ LỖI TỪ BACKGROUND
      const errorMsg = response?.error || Lang.get('errorGeneric');
      console.error('[Popup] Error from background:', errorMsg);
      messageHistory.push({ id: aiMsgId, role: 'system-error', content: errorMsg });
      updateMessage(loadingEl, errorMsg, aiMsgId, true); // Render error state
      return; // ⚠️ DỪNG XỬ LÝ, KHÔNG CHẠY CODE BẾN DƯỚI
    }

    // ✅ RESPONSE THÀNH CÔNG - XỬ LÝ KẾT QUẢ
    const aiResponseContent = response.result;
    const providerUsed = response.providerUsed || currentProvider;
    const usedFullModelId = response.usedFullModelId;

    // Trích xuất JSON nếu có
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const jsonMatch = aiResponseContent.match(jsonRegex);
    let contentToParse = jsonMatch && jsonMatch[1] ? jsonMatch[1].trim() : aiResponseContent;

    console.log('[Popup] Content to parse:', contentToParse.substring(0, 200));

    // Lưu tin nhắn gốc vào lịch sử
    messageHistory.push({ id: aiMsgId, role: 'ai', content: aiResponseContent });

    let renderedHtmlContent;
    let isJsonMode = false;

    // ✅ THỬ XỬ LÝ JSON TRƯỚC
    try {
      const jsonData = JSON.parse(contentToParse);

      // Kiểm tra cấu trúc JSON hợp lệ
      if (jsonData && typeof jsonData.translation === 'string') {
        // ✅ XỬ LÝ JSON THÀNH CÔNG
        isJsonMode = true;
        console.log('[Popup] Processing response as JSON from provider:', providerUsed);

        const adapter = AI_PROVIDER_REGISTRY[providerUsed.toLowerCase()] || DEFAULT_ADAPTER;
        const standardizedData = adapter(jsonData);
        renderedHtmlContent = buildLearningLayoutFromJSON(standardizedData);

        updateMessage(loadingEl, renderedHtmlContent, aiMsgId, false, isJsonMode, usedFullModelId);
      } else {
        // JSON không đúng cấu trúc -> ném lỗi để xử lý như Markdown
        throw new Error(Lang.get("errorInvalidAIJSON"));
      }

    } catch (parseError) {
      // ❌ LỖI PARSE JSON HOẶC CẤU TRÚC SAI -> XỬ LÝ MARKDOWN
      console.log('[Popup] Processing response as Markdown due to error:', parseError.message);
      isJsonMode = false;

      renderedHtmlContent = getWrappedTranslationHTML(aiResponseContent);
      updateMessage(loadingEl, renderedHtmlContent, aiMsgId, false, false, usedFullModelId);
    }

  } catch (error) {
    // ❌ LỖI RUNTIME (network, etc.)
    const errorMsg = Lang.get('errorConnection') + error.message;
    console.error('[Popup] Runtime error during runAction:', error);
    messageHistory.push({ id: aiMsgId, role: 'system-error', content: errorMsg });
    updateMessage(loadingEl, errorMsg, aiMsgId, true);
    
  } finally {
    isProcessing = false;
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
    scrollToBottom();
  }
}

// ========================================
// LANGUAGE CHANGE HANDLER
// ========================================

async function handleLanguageChange(e) {
  if (currentType !== 'translate' || isProcessing) return;

  const newTargetLanguage = e.target.value;
  currentTargetLanguage = newTargetLanguage;
  
  // Save preference
  await saveTargetLanguageForFeature('contextMenu', newTargetLanguage);
  
  console.log('[Popup] Language changed to:', newTargetLanguage);

  // Find the most recent USER message to retranslate
  const lastUserMessageIndex = messageHistory.findLastIndex(m => m.role === 'user');

  if (lastUserMessageIndex > -1) {
    const textToRetranslate = messageHistory[lastUserMessageIndex].content; // Can be HTML or text

    // Remove AI/error messages after the last user message from history
    messageHistory = messageHistory.slice(0, lastUserMessageIndex + 1);

    // Determine if original language is Vietnamese for prompt selection
    // Note: This assumes the LAST user message's language determines the direction.
    const isOriginalVn = isVietnamese(textToRetranslate);

    // Get the appropriate system prompt for the NEW target language
    const systemPrompt = getSystemPrompt(newTargetLanguage, isOriginalVn);

    // Remove old system prompt and add the new one
    messageHistory = messageHistory.filter(m => m.role !== 'system');
    messageHistory.unshift({ role: 'system', content: systemPrompt });

    // --- Remove AI/Error messages from DOM ---
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        // Find the DOM element corresponding to the last user message
        const lastUserMsgEl = messagesContainer.querySelector(`.message[data-message-id="${messageHistory[lastUserMessageIndex].id}"]`);

        if (lastUserMsgEl) {
            let nextSibling = lastUserMsgEl.nextElementSibling;
            while (nextSibling && (nextSibling.classList.contains('ai-message') || nextSibling.classList.contains('system-message'))) {
                const toRemove = nextSibling;
                nextSibling = nextSibling.nextElementSibling;
                toRemove.remove();
            }
        } else {
             console.warn("Could not find last user message element in DOM for removal.");
        }
    }
    // --- End DOM Removal ---

    // Prepare messages JUST for this re-translation run
    const messagesForThisRun = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: textToRetranslate }
    ];

    // Call runAction with the specific messages
    await runAction(messagesForThisRun);
  } else {
      console.warn("No user message found to retranslate.");
  }
}


// ========================================
// MESSAGE ACTIONS (Copy, TTS, Edit, Regen)
// ========================================

// Centralized click handler for message actions and vocab speakers
function setupMessageActionDelegation() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.addEventListener('click', (e) => {
            if (isEditingMessage) return; // Prevent actions during edit

            const actionButton = e.target.closest('.action-btn');
            const vocabSpeakerBtn = e.target.closest('.vocab-speaker-btn');

            if (actionButton) {
                // --- Handle Standard Actions (Copy, TTS, Edit, Regen) ---
                const action = actionButton.dataset.action;
                const messageEl = actionButton.closest('.message');
                const msgId = messageEl?.dataset.messageId;

                if (!msgId) return;
                const msgIndex = messageHistory.findIndex(m => m.id === msgId);
                if (msgIndex === -1) return;

                const message = messageHistory[msgIndex];

                 // Stop any ongoing TTS if clicking a different action
                if (action !== 'tts' && action !== 'vocab-speak') {
                    window.speechSynthesis.cancel();
                    clearAllVocabSpeakerEffects(); // Clear vocab effects too
                }


                switch (action) {
                    case 'copy':
                        handleCopy(actionButton, message.content, messageEl); // Pass raw content
                        break;
                    case 'tts':
                        handleTTS(message.content, actionButton, messageEl); // Pass raw content
                        break;
                    case 'edit':
                        if (message.role === 'user') handleEdit(messageEl, msgIndex);
                        break;
                    case 'regenerate':
                     if (message.role === 'ai' || message.role === 'system-error') handleRegenerate(msgIndex); // ✅ SỬA LỖI
                    break;
                }

            } else if (vocabSpeakerBtn) {
                // --- Handle Vocabulary Speaker Click ---
                const wordToSpeak = vocabSpeakerBtn.dataset.word;
                if (wordToSpeak) {
                    speakWord(wordToSpeak, vocabSpeakerBtn);
                }
            }
        });
    }
}


function handleCopy(button, rawAiContent, messageEl) {
  let textToParse = '';
  let isTranslationMode = (currentType === 'translate');
  let highlightTarget = null;

  try {
    // Attempt to parse JSON first (for English learning mode)
    const jsonData = JSON.parse(rawAiContent);
    if (jsonData && typeof jsonData.translation === 'string') {
        textToParse = jsonData.translation; // Get only translation from JSON
        if (messageEl) {
            highlightTarget = messageEl.querySelector('.translation-text');
        }
        isTranslationMode = true; // Ensure highlight works even if currentType somehow changed
    } else {
      // Parsed JSON but invalid, fall back to parsing the raw string as Markdown
       textToParse = rawAiContent;
       isTranslationMode = false; // Not the learning mode JSON
    }
  } catch (e) {
    // Failed JSON parse, assume it's Markdown
    textToParse = rawAiContent;
    // Check if it's Markdown translation using regex
    if (isTranslationMode) {
        const translationRegex = /\*\*Translation:\*\*\s*([\s\S]*?)\s*\*\*Explanation:\*\*/i;
        const match = rawAiContent.match(translationRegex);
        if (match && match[1]) {
            textToParse = match[1].trim(); // Get translation from Markdown
             if (messageEl) {
                highlightTarget = messageEl.querySelector('.translation-text');
             }
        } else {
             isTranslationMode = false; // Regex failed, copy everything
             textToParse = rawAiContent;
        }
    }
  }

  // Now, parse the selected text (either full or translation part)
  let plainText = '';
  try {
    // If textToParse contains HTML tags from the AI, parse them
    const tempDiv = document.createElement('div');
    // Use DOMPurify if available and needed, otherwise simple parse
    tempDiv.innerHTML = marked.parse(textToParse);
    plainText = tempDiv.textContent || tempDiv.innerText || '';
  } catch (parseError) {
    console.error(Lang.get("errorParseMarkdownCopy", { error: parseError }));
    // Basic fallback: remove markdown bold/italic
    plainText = textToParse.replace(/[*_]{1,2}(.+?)[*_]{1,2}/g, '$1');
  }

  // --- Clipboard and Highlight Logic ---
  navigator.clipboard.writeText(plainText).then(() => {
    // Apply highlight only if it's translation mode and we found the target
    if (isTranslationMode && highlightTarget) {
      highlightTarget.classList.add('copy-highlight');
    }

    const originalHTML = button.innerHTML;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>`; // Checkmark

    setTimeout(() => {
      button.innerHTML = originalHTML;
      if (isTranslationMode && highlightTarget) {
        highlightTarget.classList.remove('copy-highlight');
      }
    }, 1500);

  }).catch(err => {
    console.error(Lang.get("errorCopyFailed", { error: err }));
    // Show error icon briefly
    const originalHTML = button.innerHTML;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
         <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>`; // Error X
    setTimeout(() => { button.innerHTML = originalHTML; }, 2000);
  });
}


function handleTTS(rawAiContent, buttonEl, messageEl) {
  let textToRead = '';
  let language = 'en-US'; // Default TTS language
  let highlightTarget = null;

  try {
      // Try parsing JSON (English learning mode)
      const jsonData = JSON.parse(rawAiContent);
      if (jsonData && typeof jsonData.translation === 'string') {
          textToRead = jsonData.translation;
          language = 'en-US'; // Always English for this mode's translation
           if (messageEl) {
              highlightTarget = messageEl.querySelector('.translation-text');
           }
      } else {
           // Invalid JSON, fallback to raw content as Markdown
           textToRead = rawAiContent;
      }
  } catch(e) {
      // Failed JSON parse, assume Markdown
      textToRead = rawAiContent;
      // Try to extract translation using regex (Standard mode)
      const translationRegex = /\*\*Translation:\*\*\s*([\s\S]*?)\s*\*\*Explanation:\*\*/i;
      const match = rawAiContent.match(translationRegex);
      if (match && match[1]) {
          textToRead = match[1].trim(); // Use only translation part
           if (messageEl) {
              highlightTarget = messageEl.querySelector('.translation-text');
           }
          // Set language based on the target language of the translation
          language = (currentTargetLanguage === 'vi') ? 'vi-VN' : 
                     (currentTargetLanguage === 'en') ? 'en-US' :
                     'en-US'; // Default to English
      } else {
          // Regex failed, read the whole raw content
          textToRead = rawAiContent;
          // Guess language for the whole content (less reliable)
          language = isVietnamese(textToRead) ? 'vi-VN' : 'en-US';
          highlightTarget = messageEl.querySelector('.message-content'); // Highlight whole bubble
      }
  }


  // Convert the selected text (translation or full) to plain text
  let plainText = '';
  try {
      const tempDiv = document.createElement('div');
      // Parse potential HTML within the textToRead
      tempDiv.innerHTML = marked.parse(textToRead);
      plainText = tempDiv.textContent || tempDiv.innerText || '';
  } catch (parseError) {
      console.error(Lang.get("errorParseMarkdownTTS", { error: parseError }));
      plainText = textToRead.replace(/[*_]{1,2}(.+?)[*_]{1,2}/g, '$1'); // Basic fallback
  }

  // --- TTS Logic with Speed and Effects ---
  const ttsWrapper = buttonEl.closest('.tts-controls-wrapper');
  if (!ttsWrapper) return; // Should exist if button exists
  const speedSlider = ttsWrapper.querySelector('.tts-speed-slider');

  // Toggle: Stop if speaking the same text
  if (currentUtterance && currentUtterance.text === plainText && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); // This will trigger onend
      return;
  }
  window.speechSynthesis.cancel(); // Stop any previous speech

  currentUtterance = new SpeechSynthesisUtterance(plainText);
  currentUtterance.lang = language;
  currentUtterance.rate = parseFloat(speedSlider.value) || 1;

  // Function to handle restarting TTS on speed change
  const restartOnSpeedChange = () => {
      window.speechSynthesis.cancel(); // Stop current speech
      // Re-trigger TTS with a small delay to allow onend cleanup
      setTimeout(() => {
          handleTTS(rawAiContent, buttonEl, messageEl);
      }, 50);
  };

  // Function to clean up effects and listeners
  const stopEffects = () => {
      buttonEl.classList.remove('is-speaking');
      if (highlightTarget) highlightTarget.classList.remove('tts-highlight');
      speedSlider.classList.remove('show');
      ttsWrapper.classList.remove('is-active');
      speedSlider.removeEventListener('change', restartOnSpeedChange);
      currentUtterance = null; // Clear the current utterance tracker
  };

  currentUtterance.onstart = () => {
      buttonEl.classList.add('is-speaking');
      if (highlightTarget) highlightTarget.classList.add('tts-highlight');
      speedSlider.classList.add('show');
      ttsWrapper.classList.add('is-active');
      // Add listener ONLY when starting
      speedSlider.addEventListener('change', restartOnSpeedChange);
  };

  currentUtterance.onend = stopEffects;
  currentUtterance.onerror = (event) => {
      console.error(Lang.get("errorTTSPlayback", { error: event.error }));
      stopEffects();
  };

  // Speak
  window.speechSynthesis.speak(currentUtterance);
}


function handleEdit(messageEl, msgIndex) {
    isEditingMessage = true;

    const messageContent = messageEl.querySelector('.message-content');
    const actionsDiv = messageEl.querySelector('.message-actions');
    const originalContent = messageHistory[msgIndex].content; // This is plain text

    if (!messageContent || !actionsDiv) return;

    messageContent.style.display = 'none';
    actionsDiv.style.display = 'none';

    const editContainer = document.createElement('div');
    editContainer.className = 'edit-container';
    editContainer.innerHTML = `
      <textarea class="edit-textarea">${escapeHtml(originalContent)}</textarea>
      <div class="edit-actions">
        <button class="edit-btn cancel-btn" title="${Lang.get("cancelBtn")}">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <button class="edit-btn save-btn" title="${Lang.get("saveAndResendBtnTitle")}">
           <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </button>
      </div>
    `;

    messageEl.querySelector('.message-body').appendChild(editContainer);

    const textarea = editContainer.querySelector('textarea');
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length; // Move cursor to end

    const exitEdit = (runAgain = false) => {
      editContainer.remove();
      messageContent.style.display = '';
      actionsDiv.style.display = '';
      isEditingMessage = false;
      if (runAgain) {
          handleSendMessage(); // Trigger send if needed
      }
    };

    editContainer.querySelector('.cancel-btn').onclick = () => exitEdit(false);
    editContainer.querySelector('.save-btn').onclick = async () => {
        const newContent = textarea.value.trim();
        if (newContent && newContent !== originalContent) {
            // Remove messages after the edited one from history AND DOM
            messageHistory.splice(msgIndex); // Remove edited and subsequent messages

            const container = document.getElementById('messagesContainer');
            let nextSibling = messageEl.nextElementSibling;
            while (nextSibling) {
                const toRemove = nextSibling;
                nextSibling = nextSibling.nextElementSibling;
                toRemove.remove();
            }
            messageEl.remove(); // Remove the original user message element

            // Add the new message to history and render it
            const newMsgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            messageHistory.push({ id: newMsgId, role: 'user', content: newContent });
            renderMessage('user', newContent, newMsgId);

            // Re-run the action (translate, chat, search) using the appropriate logic
             if (currentType === 'translate') {
                const isInputVn = isVietnamese(newContent);
                // Use saved preference or auto-detect
                const languageSelector = document.getElementById('languageSelector');
                const targetLang = languageSelector?.value || (isInputVn ? 'en' : 'vi');
                const systemPrompt = getSystemPrompt(targetLang, isInputVn);
                const messagesForThisRun = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: newContent }
                ];
                await runAction(messagesForThisRun);
            } else {
                 // For chat/search, remove the old system prompt if exists and add new context if needed
                 messageHistory = messageHistory.filter(m => m.role !== 'system');
                 // Add appropriate system prompt back based on currentType if needed
                 // Then call runAction() which will use the updated history
                await runAction();
            }

        }
        exitEdit(false); // Exit edit mode without sending again
    };
     // Allow saving with Enter key
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            editContainer.querySelector('.save-btn').click();
        }
    });
}


// popup.js

async function handleRegenerate(aiMsgIndex) {
  let userMessageContent;
  let userMessageId;

  // 1. Tìm tin nhắn user ngay trước tin nhắn AI/lỗi
  let userMsgIndex = -1;
  for (let i = aiMsgIndex - 1; i >= 0; i--) {
    if (messageHistory[i].role === 'user') {
      userMsgIndex = i;
      userMessageContent = messageHistory[i].content;
      userMessageId = messageHistory[i].id;
      break;
    }
  }

  // 2. Xóa tin nhắn khỏi DOM
  const container = document.getElementById('messagesContainer');
  if (!container) return;

  if (userMsgIndex === -1) {
    // ✅ SỬA LỖI: Lỗi ngay lần đầu, không có tin nhắn user trong lịch sử
    console.log("[Popup] No user msg in history, attempting to use initial 'originalText'.");
    
    if (!originalText) {
      console.error("Cannot regenerate, no preceding user message and no originalText found.");
      return; // Không thể cứu vãn
    }
    
    // Sử dụng văn bản gốc (từ lúc bôi đen)
    userMessageContent = originalText;
    
    // Xóa toàn bộ lịch sử (vì nó chỉ chứa tin nhắn lỗi)
    messageHistory.splice(0, messageHistory.length);
    
    // Xóa toàn bộ tin nhắn khỏi DOM (chỉ là tin nhắn lỗi)
    container.innerHTML = ''; // Xóa sạch

  } else {
    // --- Logic cũ (hoạt động bình thường khi đã có lịch sử chat) ---
    // Xóa tin nhắn AI/lỗi và các tin nhắn sau nó khỏi lịch sử
    messageHistory.splice(aiMsgIndex);

    // Xóa các tin nhắn tương ứng khỏi DOM
    // Tìm DOM element của tin nhắn user ngay trước đó
    const userMessageElement = container.querySelector(`.message[data-message-id="${userMessageId}"]`);
    
    if (userMessageElement) {
      let elementToRemove = userMessageElement.nextElementSibling;
      while (elementToRemove) {
        const nextElement = elementToRemove.nextElementSibling;
        elementToRemove.remove();
        elementToRemove = nextElement;
      }
    }
  }

  // 3. Chạy lại hành động (dùng userMessageContent đã lấy)
  if (currentType === 'translate') {
    // Đối với Dịch: Tạo một danh sách tin nhắn cụ thể
    const isInputVn = isVietnamese(userMessageContent); // Kiểm tra dựa trên nội dung
    
    // Xác định đúng ngôn ngữ đích
    const languageSelector = document.getElementById('languageSelector');
    let targetLang = currentTargetLanguage || 'vi';
    
    // Use dropdown value if available, otherwise auto-detect
    if (languageSelector && languageSelector.value) {
        targetLang = languageSelector.value;
    } else {
        // Auto-detect if no preference
        if (isInputVn) {
            targetLang = 'en';
        } else {
            targetLang = 'vi';
        }
        // Update dropdown to reflect auto-detected language
        if (languageSelector) {
            languageSelector.value = targetLang;
        }
    }
    
    const systemPrompt = getSystemPrompt(targetLang, isInputVn);
    const messagesForThisRun = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessageContent } // Dùng nội dung đã lưu
    ];
    await runAction(messagesForThisRun);

  } else {
    // Đối với Chat/Search: Chỉ cần gọi runAction()
    // (Vì messageHistory đã được cắt ngắn chính xác)
    await runAction();
  }
}


// ========================================
// --- UI RENDERING & HTML BUILDING ---
// ========================================

// Builds the HTML for the English learning layout from standardized JSON data
function buildLearningLayoutFromJSON(data) {
  let vocabHtml = '';
  if (data.vocabulary && data.vocabulary.length > 0) {
    vocabHtml = '<ul>';
    data.vocabulary.forEach(item => {
      // Sanitize parts before inserting
      const word = escapeHtml(item.word || '');
      const ipa = escapeHtml(item.ipa || '');
      const mean = escapeHtml(item.mean || '');
      const speakerSVG = `
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>`;

      vocabHtml += `
        <li>
          <strong>${word}</strong>
          ${ipa ? `<i>(${ipa})</i>` : ''}:
          ${mean}
          <button class="vocab-speaker-btn" data-word="${word}" title="${Lang.get("vocabSpeakTitle", { word: word })}">${speakerSVG}</button>
        </li>`;
    });
    vocabHtml += '</ul>';
  }

  // Build explanation section
  let explanationHtml = '<ul>';
   if (data.explanation?.context) {
       explanationHtml += `<li><strong>${Lang.get("vocabContext")}</strong> ${escapeHtml(data.explanation.context)}</li>`;
   }
   if (data.explanation?.structure) {
        explanationHtml += `<li><strong>${Lang.get("vocabStructure")}</strong> ${escapeHtml(data.explanation.structure)}</li>`;
   }
   explanationHtml += '</ul>';


  // Combine all parts
  // Use marked.parse for the translation part to handle potential HTML tags inside it
  const translationHTML = (data.translation || '').trim();

  return `
    <div class="translation-wrapper">
      <p><strong>${Lang.get("translationLabel")}</strong></p>
      <div class="translation-text">${translationHTML}</div>
    </div>
    <div class="explanation-wrapper">
      <p><strong>${Lang.get("explanationLabel")}</strong></p>
      <div class="explanation-text">
        ${explanationHtml}
        ${vocabHtml ? `<p><strong>${Lang.get("vocabKey")}</strong></p>` + vocabHtml : ''}
      </div>
    </div>
  `;
}


// Renders Markdown for non-English translations (fallback)
function getWrappedTranslationHTML(markdownContent) {
  // ✅ SỬA LỖI: Thêm "|Dịch" và "|Giải thích" vào regex để khớp với cả
  // kết quả trả về bằng Tiếng Việt (như trong Ảnh 1)
  const regex = /\*\*(Translation|Dịch):\*\*\s*([\s\S]*?)\s*\*\*(Explanation|Giải thích):\*\*\s*([\s\S]*)/i;
  const match = markdownContent.match(regex);

  if (match && match[1] !== undefined && match[3] !== undefined) {
    // Phân tích nội dung dịch và giải thích một cách riêng biệt
    // match[2] là nội dung dịch, match[4] là nội dung giải thích
    const translationHTML = marked.parse(match[2].trim());
    const explanationHTML = marked.parse(match[4].trim());

    return `
      <div class="translation-wrapper">
        <p><strong>${Lang.get("translationLabel")}</strong></p>
        <div class="translation-text">${translationHTML}</div>
      </div>
      <div class="explanation-wrapper">
        <p><strong>${Lang.get("explanationLabel")}</strong></p>
        <div class="explanation-text">${explanationHTML}</div>
      </div>
    `;
  } else {
    // Nếu định dạng sai, chỉ cần phân tích toàn bộ nội dung
    console.warn("[Popup] Fallback Markdown format incorrect, parsing full content.");
    return marked.parse(markdownContent);
  }
}

// ========================================
// --- HTML BUILDER FOR ACTIONS (BỊ THIẾU) ---
// ========================================

function getActionsHTML(role, isError = false) { // ✅ SỬA LỖI: Thêm tham số isError
  if (role !== 'user' && role !== 'ai') return ''; // Chỉ user và AI có hành động

  // Định nghĩa SVG icons
  const copyIconSVG = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
  const editIconSVG = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
  const regenIconSVG = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`;
  const ttsIconSVG = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;

  let buttons = '';

  if (role === 'user') {
    // Nút cho tin nhắn của User
    buttons = `
      <button class="action-btn" data-action="copy" title="${Lang.get("copyBtnTitle")}">${copyIconSVG}</button>
      <button class="action-btn" data-action="edit" title="${Lang.get("editBtnTitle")}">${editIconSVG}</button>
    `;
  } else if (role === 'ai') {
    // Nút cho tin nhắn của AI
    buttons = `
      <button class="action-btn" data-action="copy" title="${Lang.get("copyBtnTitle")}">${copyIconSVG}</button>
      <button class="action-btn" data-action="regenerate" title="${Lang.get("regenerateBtnTitle")}">${regenIconSVG}</button>
    `;
    
    // CHỈ thêm nút Loa và thanh tốc độ nếu đang ở chế độ Dịch
    if (!isError && currentType === 'translate') {
      buttons += `
        <div class="tts-controls-wrapper">
          <button class="action-btn" data-action="tts" title="${Lang.get("readAloudBtnTitle")}">${ttsIconSVG}</button>
          <input type="range" class="tts-speed-slider"
                 min="0.5" max="2" step="0.25" value="1"
                 title="${Lang.get("ttsSpeedSliderTitle")}">
        </div>
      `;
    }
  }

  // Trả về HTML của các nút
  return `<div class="message-actions">${buttons}</div>`;
}

// ========================================
// --- UI RENDERING & HTML BUILDING ---
// ========================================

// popup.js

// NOW ACCEPTS RENDERED HTML content for AI messages AND usedFullModelId
function updateMessage(loadingEl, contentOrHtml, msgId, isError = false, isJsonMode = false, usedFullModelId = null) {
  // 1. Validate inputs
  if (!loadingEl) {
    console.error("updateMessage failed: loadingEl not found for msgId", msgId);
    return;
  }
  const body = loadingEl.querySelector('.message-body');
  if (!body) {
     console.error("updateMessage failed: message-body not found in loadingEl for msgId", msgId);
     // Attempt to remove the broken loading element
     loadingEl.remove();
     scrollToBottom();
     return;
  }

  // 2. Prepare content based on error status
  let finalHtmlContent;
  if (isError) {
      // Display error message directly (escaped)
      finalHtmlContent = escapeHtml(contentOrHtml);
  } else {
      // Assume contentOrHtml is already processed HTML (from JSON or Markdown)
      // Trim to remove potential leading/trailing whitespace that might affect layout
      finalHtmlContent = (contentOrHtml || '').trim();
      // Basic check if content is empty after processing
      if (!finalHtmlContent) {
          finalHtmlContent = Lang.get("errorNoContentReturned"); // Provide fallback content
          isError = true; // Treat empty successful response potentially as an error visually
      }
  }

  // 3. Get action buttons HTML (pass error status)
  // Ensure 'ai' role is passed correctly, and the error status
  const actionsHTML = getActionsHTML('ai', isError);

  // 4. Create model info HTML (if available and not an error)
  const modelInfoHTML = (!isError && usedFullModelId)
      ? `<div class="model-info">${escapeHtml(usedFullModelId)}</div>`
      : '';

  // 5. Update the innerHTML of the message body
  // Ensure the structure includes the message-content div and the new message-footer
  body.innerHTML = `
    <div class="message-content ${isError ? 'error' : ''}">${finalHtmlContent}</div>
    <div class="message-footer">
      ${actionsHTML}
      ${modelInfoHTML}
    </div>
  `; // <-- Semicolon here marks the end of the innerHTML assignment

  // 6. Clean up loading/error classes on the main message element
  loadingEl.classList.remove('loading-message'); // Remove loading class regardless
  if (isError) {
      loadingEl.classList.add('system-message'); // Use system styling for errors
      loadingEl.classList.remove('ai-message');
  } else {
      loadingEl.classList.remove('system-message');
      loadingEl.classList.add('ai-message'); // Ensure correct class for successful AI response
  }

  // 7. Scroll to bottom
  scrollToBottom();

} // <-- Dấu } NÀY là kết thúc của hàm updateMessage



function renderMessage(role, content, msgId, isLoading = false) {
  const container = document.getElementById('messagesContainer');
  if (!container) return null;

  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}-message`;
  if (isLoading) messageEl.classList.add('loading-message'); // Add class for loading
  messageEl.dataset.messageId = msgId;

  // --- Avatar Logic (Remains the same) ---
  const aiAvatar = chrome.runtime.getURL("icons/icon-16.png");
  let avatarIcon = (role === 'user') ? userAvatarUrl : aiAvatar;
  let avatarClass = (role === 'user') ? 'user-avatar-img' : 'ai-avatar-img';
  // --- End Avatar Logic ---

  let messageContentHTML = '';
  if (isLoading) {
    messageContentHTML = `<div class="loading-state"><div class="spinner"></div><span>${Lang.get("stateProcessing")}</span></div>`;
  } else {
    // Render based on role - only AI messages potentially need complex rendering later
    const htmlContent = (role === 'system' || role === 'user')
      ? escapeHtml(content) // System/User are always plain text
      : marked.parse(content); // Initial AI render (will be updated by updateMessage)

    messageContentHTML = `<div class="message-content">${htmlContent}</div>`;
  }

  // Actions are only added AFTER loading is complete by updateMessage
  const actionsHTML = (role === 'user') ? getActionsHTML(role, false) : ''; // ✅ SỬA LỖI: Thống nhất logic, truyền isError = false

  messageEl.innerHTML = `
    <div class="message-avatar">
      <img src="${avatarIcon}" alt="${role}" class="${avatarClass}">
    </div>
    <div class="message-body">
      ${messageContentHTML}
      ${actionsHTML}
    </div>
  `;

  container.appendChild(messageEl);
  scrollToBottom();
  return messageEl; // Return the created element (used by updateMessage)
}

// ========================================
// --- VOCABULARY TTS ---
// ========================================

// Speak a single word with effects
function speakWord(word, buttonEl) {
    if (!word || !buttonEl) return;

    window.speechSynthesis.cancel(); // Stop any other speech
    clearAllVocabSpeakerEffects(); // Clear effects from other buttons

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US'; // Vocab is always English

    utterance.onstart = () => {
        buttonEl.classList.add('is-speaking-vocab');
    };
    utterance.onend = () => {
        buttonEl.classList.remove('is-speaking-vocab');
    };
    utterance.onerror = (event) => {
        console.error(Lang.get("errorVocabTTS", { error: event.error }));
        buttonEl.classList.remove('is-speaking-vocab');
    };

    window.speechSynthesis.speak(utterance);
}

// Helper to remove speaking effect from ALL vocab buttons
function clearAllVocabSpeakerEffects() {
    document.querySelectorAll('.vocab-speaker-btn.is-speaking-vocab').forEach(btn => {
        btn.classList.remove('is-speaking-vocab');
    });
}


// ========================================
// UTILITIES
// ========================================

function handleInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  if (e.ctrlKey && e.key === 'm') { e.preventDefault(); toggleListening(); }
}

function handleInputResize(e) {
  const textarea = e.target;
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
  requestAnimationFrame(updateInputLayout); // Use requestAnimationFrame
}

function updateInputLayout() {
    const textarea = document.getElementById('chatInput');
    const footerInput = document.getElementById('footerInput');
    if (!textarea || !footerInput) return;

    // Calculate single line height ONCE
    if (singleLineHeight === 0) {
        const style = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.5);
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const paddingBottom = parseFloat(style.paddingBottom) || 0;
        singleLineHeight = lineHeight + paddingTop + paddingBottom;
        console.log("Calculated singleLineHeight:", singleLineHeight);
    }

    // Check if scrollHeight is significantly larger than single line height
    const isMultiLine = textarea.scrollHeight > (singleLineHeight + 4); // Add buffer

    // Apply classes based on state
    if (isMultiLine) {
        footerInput.classList.add('is-multiline');
        footerInput.classList.remove('is-single-line');
    } else {
        footerInput.classList.add('is-single-line');
        footerInput.classList.remove('is-multiline');
    }
}


function scrollToBottom() {
  const container = document.getElementById('messagesContainer');
  if (container) container.scrollTop = container.scrollHeight;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Use shared language detection utility
const isVietnamese = detectVietnamese;

// Helper to remove HTML tags
function stripHtml(html){
   if (!html) return '';
   let tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
}

// ========================================
// SPEECH RECOGNITION (No changes needed)
// ========================================
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById('micBtn');

  if (!SpeechRecognition) {
    console.warn(Lang.get("errorWebSpeechNotSupported"));
    if(micBtn) micBtn.style.display = 'none';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'vi-VN';

  const chatInput = document.getElementById('chatInput');

  recognition.onstart = () => { isListening = true; micBtn.classList.add('is-listening'); chatInput.placeholder = Lang.get("placeholderListening"); };
  recognition.onend = () => { isListening = false; micBtn.classList.remove('is-listening'); setupFooterUI(); recognition.stop(); };
  recognition.onresult = (event) => {
    let interimTranscript = '', finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      else interimTranscript += event.results[i][0].transcript;
    }
    chatInput.value = finalTranscript + interimTranscript;
    handleInputResize({ target: chatInput });
    if (finalTranscript) { chatInput.value = finalTranscript.trim(); handleInputResize({ target: chatInput }); /* handleSendMessage(); */ }
  };
  recognition.onerror = (event) => {
    console.error(Lang.get("errorSpeechRecognition", { error: event.error }));
    if(event.error === 'not-allowed' || event.error === 'service-not-allowed') alert(Lang.get("alertNeedMicPermission"));
    isListening = false; micBtn.classList.remove('is-listening'); setupFooterUI();
  };
}

function toggleListening() {
  if (!recognition) return;
  if (isListening) { recognition.stop(); }
  else {
    try {
      const langSelector = document.getElementById('languageSelector');
      // Set recognition language based on current target language
      // If translating to English, recognize Vietnamese; otherwise recognize English
      recognition.lang = (currentType === 'translate' && langSelector && langSelector.value === 'en') ? 'vi-VN' : 
                         (currentType === 'translate' && langSelector && langSelector.value === 'vi') ? 'en-US' :
                         'vi-VN'; // Default to Vietnamese
      recognition.start();
    } catch(e) { console.error(Lang.get("errorStartRecording", { error: e })); }
  }
}

// ========================================
// DRAGGABLE HEADER (No changes needed)
// ========================================
function setupDraggableHeader() {
  const header = document.getElementById('popupHeader');
  if (!header) return;
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.header-btn') || e.target.closest('.language-selector')) return;
    e.preventDefault();
    window.parent.postMessage({ action: 'startDragPopup', clientX: e.clientX, clientY: e.clientY }, '*');
  });
}

// ========================================
// RESIZE HANDLE (No changes needed)
// ========================================
function setupResizeHandle() {
  const handle = document.getElementById('resizeHandle');
  if (!handle) return;
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault(); e.stopPropagation();
    window.parent.postMessage({ action: 'startResizePopup', direction: 'bottom-right', clientX: e.clientX, clientY: e.clientY }, '*');
  });
}


// ========================================
// UI SETUP (Header & Footer Placeholders)
// ========================================
function updateHeaderUI() {
  const titleEl = document.getElementById('popupTitle');
  const iconEl = document.getElementById('headerIcon');
  const languageSelector = document.getElementById('languageSelector');
  if (!titleEl || !iconEl || !window.Lang) return; // Thêm kiểm tra window.Lang
  
  titleEl.textContent = Lang.get(TITLES_KEYS[currentType]) || Lang.get('titleChat');
  // (Icon setting logic remains the same)
  if (currentType === 'translate') {
      iconEl.innerHTML = '<path stroke-width="2" stroke="currentColor" fill="none" d="M4 5h7M9 3v2c0 4.418-2.239 8-5 8M5 9c-.003 2.144 2.952 3.908 6.7 4M12 20l4-9 4 9M19.1 18h-6.2"/>';
      if (languageSelector) languageSelector.style.display = 'block';
  } else if (currentType === 'search') {
      iconEl.innerHTML = '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>';
      if (languageSelector) languageSelector.style.display = 'none';
  } else { // chat
      iconEl.innerHTML = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>';
      if (languageSelector) languageSelector.style.display = 'none';
  }
}

function setupFooterUI() {
  const chatInput = document.getElementById('chatInput');
  if (!chatInput || !window.Lang) return; // Thêm kiểm tra window.Lang
  
  // Dynamic placeholder based on type
  chatInput.placeholder = (currentType === 'translate')
    ? Lang.get('placeholderTranslate')
    : Lang.get('chatPlaceholder');
}

// ========================================
// EVENT LISTENERS SETUP
// ========================================
function setupEventListeners() {
  const closeBtn = document.getElementById('closeBtn');
  const sendBtn = document.getElementById('sendBtn');
  const chatInput = document.getElementById('chatInput');
  const languageSelector = document.getElementById('languageSelector');
  const micBtn = document.getElementById('micBtn');

  if (closeBtn) closeBtn.addEventListener('click', handleClose);
  if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);
  if (chatInput) {
    chatInput.addEventListener('keydown', handleInputKeydown);
    chatInput.addEventListener('input', handleInputResize);
  }
  if (languageSelector) languageSelector.addEventListener('change', handleLanguageChange);
  if (micBtn) micBtn.addEventListener('click', toggleListening);

  // Use delegation for message actions
  setupMessageActionDelegation();

  // Stop TTS on popup close
  window.addEventListener('unload', () => { window.speechSynthesis.cancel(); });

   // Stop TTS on click outside controls
   document.addEventListener('mousedown', (e) => {
    if (window.speechSynthesis.speaking) {
      // Check if click is outside BOTH main TTS controls AND vocab speaker buttons
      if (!e.target.closest('.tts-controls-wrapper') && !e.target.closest('.vocab-speaker-btn')) {
        window.speechSynthesis.cancel();
        clearAllVocabSpeakerEffects(); // Clear vocab effects too
      }
    }
  }, true); // Use capture phase
}

// ========================================
// LANGUAGE SELECTOR HELPERS
// ========================================

/**
 * Populate language selector dropdown with 8 supported languages
 */
async function populateLanguageSelector() {
  const languageSelector = document.getElementById('languageSelector');
  if (!languageSelector) return;

  // Clear existing options
  languageSelector.innerHTML = '';

  // Add 8 languages from constants
  TRANSLATION_LANGUAGES.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.value;
    option.textContent = lang.label;
    languageSelector.appendChild(option);
  });

  console.log('[Popup] Language selector populated with 8 languages');
}

/**
 * Load default target language from Settings or feature preference
 */
async function loadDefaultTargetLanguage() {
  const languageSelector = document.getElementById('languageSelector');
  if (!languageSelector) return;

  try {
    // Priority: feature preference > Settings default > 'vi'
    const defaultLang = await getTargetLanguageForFeature('contextMenu');
    
    if (languageSelector.querySelector(`option[value="${defaultLang}"]`)) {
      languageSelector.value = defaultLang;
      currentTargetLanguage = defaultLang;
      console.log('[Popup] Loaded default target language:', defaultLang);
    } else {
      // Fallback to 'vi' if saved language is not in list
      languageSelector.value = 'vi';
      currentTargetLanguage = 'vi';
    }
  } catch (error) {
    console.error('[Popup] Error loading default target language:', error);
    languageSelector.value = 'vi';
    currentTargetLanguage = 'vi';
  }
}

// Close handler
function handleClose() {
  window.speechSynthesis.cancel(); // Stop TTS before closing
  window.parent.postMessage({ action: 'closeActionPopup' }, '*');
}