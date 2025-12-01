/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  MICROSOFT TEAMS CONTENT SCRIPT                                 │
 * │  Entry point cho Microsoft Teams                                │
 * └─────────────────────────────────────────────────────────────────┘
 * * Mục đích:
 * 1. Khởi tạo các trình quản lý CHUNG (Translator, Summarizer, PiP).
 * 2. Khởi tạo các trình quản lý CỤ THỂ (TeamsCaptionCapture, TeamsControlBar).
 * 3. Kết nối luồng dữ liệu: Bắt phụ đề -> Lọc -> Dịch -> Hiển thị PiP.
 */

console.log('[TeamsExt] Microsoft Teams Extension loaded');

// --- Global managers ---
// (Các trình quản lý chung sẽ được tải từ /modules/common/)
let translatorManager = null;
let summarizerManager = null;
let pipWindow = null;
let captionFilter = null;
let isInitialized = false;
let isStartingTranslation = false;
let teamsUI = null;
let currentTargetLanguage = 'vi'; // Current target language for translation

// (Các trình quản lý cụ thể cho Teams)
let controlBar = null;
let captionCapture = null;
let captionPollingInterval = null;

/**
 * ═══════════════════════════════════════════════════════════════
 * UTILITY FUNCTIONS (Tái sử dụng từ Meet)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Hiển thị thông báo
 */
function showNotification(message, type = 'info') {
    // (Bạn có thể tùy chỉnh CSS cho thông báo này nếu muốn)
    const notification = document.createElement('div');
    notification.className = `teams-ext-notification teams-ext-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#5059c9'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 2147483647;
        font-size: 14px;
        font-family: var(--font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif);
        animation: slideIn 0.3s ease;
    `;
    
    // ✅ Load shadow-dom-helper và tạo shadow container cho notifications
    if (typeof window.createShadowContainer !== 'function') {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('utils/shadow-dom-helper.js');
        document.head.appendChild(script);
    }
    
    // ✅ Get or create shared shadow container
    if (!window.__teamsNotificationShadow && typeof window.createShadowContainer === 'function') {
        window.__teamsNotificationShadow = window.createShadowContainer({
            id: 'teams-notifications-shadow',
            className: 'teams-notifications-shadow-container',
            stylesheets: ['modules/microsoft-teams/ui/teams-translator-popup.css']
        });
        
        if (typeof window.setupThemeObserver === 'function') {
            window.setupThemeObserver(window.__teamsNotificationShadow.shadowRoot);
        }
    }
    
    // ✅ Append vào Shadow DOM container hoặc body (fallback)
    if (window.__teamsNotificationShadow && window.__teamsNotificationShadow.container) {
        window.__teamsNotificationShadow.container.appendChild(notification);
    } else {
        document.body.appendChild(notification);
    }
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Shared utilities - will be loaded dynamically
let isVietnameseDetector = null;
let getTargetLanguageForFeatureFunc = null;

// Load shared utilities
(async () => {
  try {
    const [langDetectionModule, translationLangModule] = await Promise.all([
      import(chrome.runtime.getURL('modules/common/utils/language-detection.js')),
      import(chrome.runtime.getURL('modules/common/config/translation-languages.js'))
    ]);
    isVietnameseDetector = langDetectionModule.isVietnamese;
    getTargetLanguageForFeatureFunc = translationLangModule.getTargetLanguageForFeature;
    console.log('[TeamsExt] Shared utilities loaded');
  } catch (error) {
    console.error('[TeamsExt] Failed to load shared utilities:', error);
    // Fallback implementation
    isVietnameseDetector = (text) => {
      if (!text || text.trim().length === 0) return false;
      const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
      return vietnameseChars.test(text);
    };
    getTargetLanguageForFeatureFunc = async () => 'vi';
  }
})();

// Use shared utility
function isVietnamese(text) {
  if (isVietnameseDetector) {
    return isVietnameseDetector(text);
  }
  // Fallback if not loaded yet
  if (!text || text.trim().length === 0) return false;
  const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  return vietnameseChars.test(text);
}

/**
 * ═══════════════════════════════════════════════════════════════
 * INITIALIZATION
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Khởi tạo các trình quản lý
 */
async function initializeManagers() {
    if (isInitialized) {
        console.log('[TeamsExt] Already initialized');
        return;
    }
    console.log('[TeamsExt] Initializing managers...');

    try {
        // --- 1. Khởi tạo các trình quản lý CHUNG (từ /modules/common/) ---
        translatorManager = new TranslatorManager();
        await translatorManager.init();
        console.log('[TeamsExt] ✓ TranslatorManager initialized');
        
        // Load target language from Settings
        try {
            if (getTargetLanguageForFeatureFunc) {
                currentTargetLanguage = await getTargetLanguageForFeatureFunc('teamsTranslation');
            } else {
                // Fallback: load directly from storage
                const data = await chrome.storage.local.get('translateSettings');
                currentTargetLanguage = data.translateSettings?.defaultTargetLanguage || 'vi';
            }
            console.log('[TeamsExt] ✓ Loaded target language:', currentTargetLanguage);
        } catch (error) {
            console.warn('[TeamsExt] Failed to load target language, using default:', error);
            currentTargetLanguage = 'vi';
        }

        summarizerManager = new SummarizerManager();
        await summarizerManager.init();
        console.log('[TeamsExt] ✓ SummarizerManager initialized');
        
        // Khởi tạo bộ lọc (từ /modules/common/)
        captionFilter = new CaptionFilter();
        // (Tạm thời dùng cài đặt mặc định, bạn có thể thêm logic load settings sau)
        captionFilter.updateSettings({
            minLength: 5, debounceMs: 500, similarityThreshold: 0.80, maxCacheSize: 50
        });
        console.log('[TeamsExt] ✓ CaptionFilter initialized');

        // --- 2. Khởi tạo trình bắt phụ đề CỤ THỂ CỦA TEAMS ---
        // (Giả định tệp teams-caption-capture.js đã được nạp)
        if (typeof TeamsCaptionCapture === 'undefined') {
            throw new Error('TeamsCaptionCapture class not loaded');
        }
        captionCapture = new TeamsCaptionCapture();
        
        // Đăng ký hàm callback
        captionCapture.onCaption(async (caption) => {
            await processNewCaption(caption.text, caption.speaker);
        });
        console.log('[TeamsExt] ✓ TeamsCaptionCapture initialized');
		if (typeof TeamsTranslatorUI !== 'undefined') {
            teamsUI = new TeamsTranslatorUI();
            console.log('[TeamsExt] ✓ TeamsTranslatorUI initialized');
        } else {
            console.warn('[TeamsExt] ⚠ TeamsTranslatorUI class not found');
        }
        isInitialized = true;

        // Make available globally for debugging
        window.TeamsExt = {
            translatorManager,
            summarizerManager,
            captionCapture,
            pipWindow
        };
        
        console.log('[TeamsExt] 🏎️ Teams Module ready!');
        
    } catch (error) {
        console.error('[TeamsExt] ✗ Initialization failed:', error);
        showNotification('Failed to initialize Teams module: ' + error.message, 'error');
    }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * UI INJECTION & HANDLING
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * ═══════════════════════════════════════════════════════════════
 * CORE TRANSLATION LOGIC (Tái sử dụng logic của Meet)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Bắt đầu dịch
 */
async function startTranslation() {
    if (isStartingTranslation) {
        console.warn('[TeamsExt] ⚠️ Translation is already starting...');
        return;
    }
    isStartingTranslation = true;
    console.log('[TeamsExt] Starting translation...');

    // ✅ Check feature availability
    try {
        const { checkFeatureAvailability } = await import('../features/feature-check-helper.js');
        const isAvailable = await checkFeatureAvailability('teamsTranslation', {
            durationMinutes: 120 // Estimate 2 hours for meeting
        });
        if (!isAvailable) {
            isStartingTranslation = false;
            return; // Upgrade prompt already shown
        }
    } catch (error) {
        console.error('[TeamsExt] Error checking feature availability:', error);
        // Continue anyway if check fails
    }

    if (!isInitialized) {
        showNotification('Extension chưa sẵn sàng', 'error');
        isStartingTranslation = false;
        return;
    }

    try {
        // 1. Khởi tạo hoặc Hiển thị PiP (từ /modules/common/)
        if (!pipWindow) {
            console.log('[TeamsExt] 📦 Creating PiP window...');
            
            // --- SỬA LỖI: Truyền summarizerManager vào ---
            pipWindow = new TranslationPiPWindow(summarizerManager); 
            // --- KẾT THÚC SỬA LỖI ---
            
            pipWindow.onClose((status) => {
                stopTranslation(); // Dừng hoàn toàn khi PiP bị đóng (khác với Meet)
            });
            
            // Cung cấp PiP cho các module khác (nếu cần)
            if (window.TeamsExt) window.TeamsExt.pipWindow = pipWindow;

        }
        await pipWindow.show(); 
        console.log('[TeamsExt] ✅ PiP shown');

        // 2. Bật CC (Logic cụ thể của Teams)
        // (Giả định 'captionCapture' có hàm checkCaptionsEnabled)
        console.log('[TeamsExt] 🎬 Enabling CC...');
        const ccEnabled = await captionCapture.checkCaptionsEnabled();
        
        if (!ccEnabled) {
            // (Giả định 'teams-translator-ui.js' đã được nạp)
            if (typeof TeamsTranslatorUI !== 'undefined') {
                const teamsUI = new TeamsTranslatorUI();
                teamsUI.showCaptionsGuidance(); // Hiển thị popup hướng dẫn của Teams
            } else {
                showNotification('Vui lòng bật phụ đề trực tiếp trong Teams (Dấu ... > Bật phụ đề)', 'info');
            }
        }
        
        // 3. Bắt đầu bắt phụ đề
        if (captionCapture) {
            const result = await captionCapture.start();
            
            if (!result.success) {
                console.log('[TeamsExt] Starting caption polling...');
                startCaptionPolling(); // Bắt đầu dò tìm phụ đề
                showNotification('Đang chờ phụ đề Teams...', 'info');
            } else {
                showNotification('Đã bắt đầu dịch!', 'success');
            }
        }
        
        if (controlBar) {
            controlBar.setTranslating(true);
        }
        
    } catch (error) {
        console.error('[TeamsExt] Failed to start translation:', error);
        showNotification('Lỗi: ' + error.message, 'error');
        if (pipWindow) pipWindow.remove();
        pipWindow = null;
    } finally {
        isStartingTranslation = false;
    }
}

/**
 * Dừng dịch
 */
async function stopTranslation() {
    console.log('[TeamsExt] Stopping translation...');
    isStartingTranslation = false;

    if (captionPollingInterval) {
        clearInterval(captionPollingInterval);
        captionPollingInterval = null;
    }
    
    if (captionCapture) {
        captionCapture.stop();
    }
    
    if (pipWindow) {
        pipWindow.remove(); // Hủy hoàn toàn cửa sổ PiP khi dừng
        pipWindow = null;
        if (window.TeamsExt) window.TeamsExt.pipWindow = null;
    }
    
    if (controlBar) {
        controlBar.setTranslating(false);
    }
    
    showNotification('Đã dừng dịch phụ đề', 'info');
}

/**
 * Dò tìm phụ đề (nếu chưa bật)
 */
function startCaptionPolling() {
    if (captionPollingInterval) clearInterval(captionPollingInterval);
    
    console.log('[TeamsExt] 🔄 Starting caption polling for Teams...');
    let attempts = 0;
    
    captionPollingInterval = setInterval(async () => {
        attempts++;
        if (!captionCapture || attempts > 60) { // Dừng sau 30s
            console.log('[TeamsExt] ⏸️ Stopping caption polling (timeout)');
            clearInterval(captionPollingInterval);
            captionPollingInterval = null;
            return;
        }

        // (Giả định captionCapture có hàm này)
        const ccEnabled = await captionCapture.checkCaptionsEnabled();
        
        if (ccEnabled) {
            console.log('[TeamsExt] ✅ Teams Captions detected! Starting capture.');
            clearInterval(captionPollingInterval);
            captionPollingInterval = null;
            
            const result = await captionCapture.start();
            if (result.success) {
                showNotification('Đã bắt đầu dịch!', 'success');
            }
        } else {
            console.log(`[TeamsExt] ⏳ Polling ${attempts}/60...`);
        }
    }, 500); // Check mỗi 0.5s
}

/**
 * Xử lý phụ đề mới (Tái sử dụng 100% logic của Meet)
 */
async function processNewCaption(text, speaker = 'Unknown') {
    console.log(`[TeamsExt] 📨 Received caption from [${speaker}]:`, text.substring(0, 100));
    
    if (!captionFilter) {
        console.warn('[TeamsExt] CaptionFilter not ready, skipping');
        return;
    }
    
    // 1. Lọc
    if (!captionFilter.shouldProcess(text)) {
        console.log(`[TeamsExt] ⏭️ Caption filtered out`);
        return;
    }
    
    console.log(`[TeamsExt] ✅ Processing caption...`);
    
    // 2. Phát hiện ngôn ngữ
    const isVi = isVietnamese(text);
    let translatedString = text;
    let needsTranslation = !isVi;
    
    // 3. Gửi bản gốc cho PiP
    if (pipWindow && pipWindow.isVisible()) {
        pipWindow.updateCaption(speaker, text, null); // null = đang dịch
    }

    try {
        let winnerModel = null;

        // 4. Dịch (nếu cần)
        if (needsTranslation && translatorManager) {
            // Use current target language (loaded from Settings)
            const translationResult = await translatorManager.translate(text, currentTargetLanguage);
            
            if (translationResult && typeof translationResult === 'object') {
                translatedString = translationResult.response;
                winnerModel = translationResult.winner ? translationResult.winner.modelId : translationResult.modelId;
            } else {
                translatedString = translationResult;
            }
        } else {
            translatedString = text; // Dùng bản gốc nếu là tiếng Việt
        }
        
        // 5. Gửi bản dịch cho PiP
        if (pipWindow) {
            pipWindow.updateCaption(speaker, text, translatedString);
            
            if (winnerModel && pipWindow.isVisible()) {
                pipWindow.updateWinnerModel(winnerModel);
            }
        }

        // 6. Gửi cho Trình tóm tắt (luôn gửi tiếng Việt)
        if (summarizerManager) {
            const textForSummary = isVi ? text : translatedString;
            summarizerManager.addText(`[${speaker}]: ${textForSummary}`);
        }
        
    } catch (error) {
        console.error('[TeamsExt] ❌ Failed to process:', error);
        if (pipWindow) {
            pipWindow.updateCaption(speaker, text, "[Lỗi dịch]");
        }
    }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * MAIN ENTRY POINT
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Kiểm tra xem có phải trang Teams không
 */
function isTeamsPage() {
    const hostname = window.location.hostname;
    return hostname.includes('teams.microsoft.com') || hostname.includes('teams.live.com');
}

/**
 * Áp dụng theme từ storage
 */
async function applyTheme() {
    try {
        const data = await chrome.storage.local.get('theme');
        const theme = data.theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Áp dụng cho PiP window nếu đã tồn tại
        const pipWindow = document.getElementById('meetTranslationPiP');
        if (pipWindow) {
            pipWindow.setAttribute('data-theme', theme);
        }
        
        console.log('[TeamsExt] Theme applied:', theme);
    } catch (e) {
        console.warn('[TeamsExt] Error applying theme:', e);
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
                
                // Cập nhật PiP window
                const pipWindow = document.getElementById('meetTranslationPiP');
                if (pipWindow) {
                    pipWindow.setAttribute('data-theme', newTheme);
                }
                
                console.log('[TeamsExt] Theme updated:', newTheme);
            }
        }
    });
}

/**
 * Main
 * SỬA ĐỔI: Chỉ khởi tạo ControlBar.
 * ControlBar (polling) sẽ tự tìm UI và kích hoạt initializeManagers.
 */
async function main() {
    // Áp dụng theme ngay từ đầu
    await applyTheme();
    setupThemeListener();
    
    // 1. Kiểm tra trang (Đã sửa lỗi này ở Bước 1)
    if (!isTeamsPage()) {
        console.log('[TeamsExt] Not on Teams page, exiting');
        return;
    }

    console.log('[TeamsExt] On Teams page. Bắt đầu theo dõi UI cuộc họp...');

    // 2. Chỉ khởi tạo Control Bar
    // (Giả định tệp teams-control-bar.js đã được nạp)
    if (typeof TeamsControlBar === 'undefined') {
        throw new Error('TeamsControlBar class not loaded');
    }
    
    // Nếu controlBar cũ còn, hủy nó đi
    if (controlBar) {
        controlBar.remove();
    }

    controlBar = new TeamsControlBar();
    
    // 3. LẮNG NGHE tín hiệu 'ui_ready' từ control bar
    controlBar.on('ui_ready', async (targetBar) => {
        // CHỈ KHI UI SẴN SÀNG, MỚI KHỞI TẠO MỌI THỨ
        if (!isInitialized) {
            console.log('[TeamsExt] UI cuộc họp đã sẵn sàng. Đang khởi tạo managers...');
            await initializeManagers();
        }
    });
    
    // 4. LẮNG NGHE tín hiệu khi UI biến mất (ví dụ: rời cuộc họp)
    controlBar.on('ui_lost', () => {
        console.log('[TeamsExt] UI cuộc họp đã biến mất. Đang dừng...');
        stopTranslation(false); // Dừng nhưng không ẩn thông báo
        isInitialized = false;
        // Xóa các manager cũ
        translatorManager = null;
        summarizerManager = null;
        pipWindow = null;
        captionFilter = null;
    });

    // 5. LẮNG NGHE nút Dịch
    controlBar.on('translate', async (data) => {
        console.log('[TeamsExt] Translate button clicked:', data);
        if (data.action === 'show') {
			
			// Kiểm tra xem phụ đề đã bật chưa
            if (captionCapture && teamsUI) {
                const captionsOn = await captionCapture.checkCaptionsEnabled();
                
                // Nếu CHƯA BẬT, thì mới thử bật
                if (!captionsOn) {
                    console.log('[TeamsExt] Captions not on. Attempting to auto-enable...');
                    // Gọi hàm lõi "thầm lặng" (không hiển thị popup)
                    teamsUI.clickEnableCaptionsLogic(); 
                }
            }
            await startTranslation();
        } else if (data.action === 'hide') {
            if (pipWindow) {
                pipWindow.hide();
            }
        }
    });

    // 6. Bắt đầu polling
    await controlBar.inject(); 

    window.teamsControlBar = controlBar;
}

// --- Chạy ---
// (Teams là một SPA, cần cẩn thận với việc load)
let hasRun = false;

const runOnce = () => {
    if (hasRun) return;
    hasRun = true;
    main().catch(console.error);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runOnce);
} else {
    // Chờ một chút để đảm bảo UI của Teams đã render
    setTimeout(runOnce, 2000);
}

// Watch for navigation (SPA behavior)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('[TeamsExt] URL changed:', url);
        // Reset và chạy lại nếu cần
        hasRun = false;
        setTimeout(runOnce, 2000);
    }
}).observe(document, { subtree: true, childList: true });