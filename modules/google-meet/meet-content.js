/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  GOOGLE MEET CONTENT SCRIPT - Fixed Version                     │
 * │  Proper Control Bar Injection                                   │
 * └─────────────────────────────────────────────────────────────────┘
 */

console.log('[MeetExt] Google Meet Extension loaded');

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
    console.log('[MeetExt] Shared utilities loaded');
  } catch (error) {
    console.error('[MeetExt] Failed to load shared utilities:', error);
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

// Global managers
let translatorManager = null;
let summarizerManager = null;
let controlBar = null;
let pipWindow = null;
let isInitialized = false;
let captionFilter = null;
let captionCapture = null;
let summarizerUI = null;
let isStartingTranslation = false;
let currentTargetLanguage = 'vi'; // Current target language for translation

/**
 * ═══════════════════════════════════════════════════════════════
 * INITIALIZATION
 * ═══════════════════════════════════════════════════════════════
 */
 

/**
 * Initialize Translation & Summarization managers
 */
async function initializeManagers() {
    if (isInitialized) {
        console.log('[MeetExt] Already initialized');
        return;
    }

    console.log('[MeetExt] Initializing managers...');

    try {
        // Check if required classes are available
        if (typeof TranslatorManager === 'undefined') {
            throw new Error('TranslatorManager not loaded');
        }
        if (typeof SummarizerManager === 'undefined') {
            throw new Error('SummarizerManager not loaded');
        }

        // Initialize TranslatorManager
        translatorManager = new TranslatorManager();
        await translatorManager.init();
        console.log('[MeetExt] ✓ TranslatorManager initialized');
        
        // Load target language from Settings
        try {
            if (getTargetLanguageForFeatureFunc) {
                currentTargetLanguage = await getTargetLanguageForFeatureFunc('meetTranslation');
            } else {
                // Fallback: load directly from storage
                const data = await chrome.storage.local.get('translateSettings');
                currentTargetLanguage = data.translateSettings?.defaultTargetLanguage || 'vi';
            }
            console.log('[MeetExt] ✓ Loaded target language:', currentTargetLanguage);
        } catch (error) {
            console.warn('[MeetExt] Failed to load target language, using default:', error);
            currentTargetLanguage = 'vi';
        }

        // Initialize SummarizerManager
        summarizerManager = new SummarizerManager();
        await summarizerManager.init();
        console.log('[MeetExt] ✓ SummarizerManager initialized');
		
		// Initialize CaptionCapture
        if (typeof CaptionCapture === 'undefined') {
            throw new Error('CaptionCapture class not loaded');
        }
        captionCapture = new CaptionCapture();
        
        // Đăng ký hàm callback để xử lý caption
        captionCapture.onCaption(async (caption) => {
            // Chúng ta sẽ dùng hàm processNewCaption
            await processNewCaption(caption.text, caption.speaker);
        });
        console.log('[MeetExt] ✓ CaptionCapture initialized');

        // Mark as initialized
        isInitialized = true;

        // Make available globally for debugging
        window.translatorManager = translatorManager;
        window.summarizerManager = summarizerManager;
		window.captionCapture = captionCapture;

        console.log('[MeetExt] ✓ Translation & Summarization ready!');
        
        // Show success notification
        showNotification('Translation & Summarization activated!', 'success');

    } catch (error) {
        console.error('[MeetExt] ✗ Initialization failed:', error);
        showNotification('Failed to initialize Translation & Summarization: ' + error.message, 'error');
    }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * GOOGLE MEET DETECTION
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Check if we're on Google Meet
 */
function isGoogleMeet() {
    return window.location.hostname === 'meet.google.com';
}

/**
 * Check if we're in a meeting (not landing page)
 */
function isInMeeting() {
    // Meeting URLs look like: meet.google.com/abc-defg-hij
    const path = window.location.pathname;
    return path.length > 1 && path !== '/';
}

/**
 * Wait for Google Meet to be ready
 */
function waitForMeetReady() {
    return new Promise((resolve) => {
        // Check if meeting UI is loaded
        const checkInterval = setInterval(() => {
            // Look for Google Meet's main elements
            const meetingContainer = document.querySelector('[data-meeting-title]') ||
                                    document.querySelector('[data-self-name]') ||
                                    document.querySelector('.g3VIld'); // Meet's main container

            if (meetingContainer) {
                clearInterval(checkInterval);
                console.log('[MeetExt] Google Meet UI detected');
                resolve();
            }
        }, 500);

        // Timeout after 30 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            console.log('[MeetExt] Timeout waiting for Meet UI');
            resolve();
        }, 30000);
    });
}

/**
 * ═══════════════════════════════════════════════════════════════
 * UI INJECTION - FIXED VERSION
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `meet-ext-notification meet-ext-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Inject control bar - FIXED VERSION
 */
async function injectControlBar() {
    console.log('[MeetExt] Injecting control bar...');
    
    try {
        // Check if MeetControlBar class is available
        if (typeof MeetControlBar === 'undefined') {
            console.error('[MeetExt] MeetControlBar class not found!');
            throw new Error('MeetControlBar class not loaded');
        }

        // Create control bar instance
        controlBar = new MeetControlBar();
        await controlBar.inject();
        
        // Setup event handlers
        setupControlBarHandlers();
        
        // Make available globally
        window.meetControlBar = controlBar;
        
        console.log('[MeetExt] ✓ Control bar injected successfully');
        
    } catch (error) {
        console.error('[MeetExt] ✗ Failed to inject control bar:', error);
        showNotification('Failed to show control bar: ' + error.message, 'error');
    }
}

/**
 * Setup control bar event handlers
 */
function setupControlBarHandlers() {
    if (!controlBar) return;

    // Record button
    controlBar.on('record', async () => {
        console.log('[MeetExt] Record button clicked');
        // TODO: Implement recording
        showNotification('Recording feature coming soon!', 'info');
    });

    // Stop record button
    controlBar.on('stopRecord', async () => {
        console.log('[MeetExt] Stop record button clicked');
        // TODO: Implement stop recording
    });

    // Translate button
controlBar.on('translate', async (data) => {
    console.log('[MeetExt] Translate button clicked:', data);
    
    if (data.action === 'show') {
        // Show PiP window
        await startTranslation();
    } else if (data.action === 'hide') {
        // Hide PiP window but keep translating
        if (pipWindow) {
            pipWindow.hide();
            controlBar.setStatus('Translation running (window hidden)', 'translating');
        }
    }
});

    // Summary button
    controlBar.on('summarize', async () => {
        console.log('[MeetExt] Summarize button clicked');
        await generateSummary();
    });

    // Close button
    controlBar.on('close', () => {
        console.log('[MeetExt] Close button clicked');
        controlBar.hide();
    });
}

/**
 * Start translation
 */

async function startTranslation() {
    // 1. KIỂM TRA KHÓA
    if (isStartingTranslation) {
        console.warn('[MeetExt] ⚠️ Đã bỏ qua, quá trình dịch đang được khởi động...');
        return;
    }

    // 2. ĐẶT KHÓA
    isStartingTranslation = true;
    console.log('[MeetExt] Starting translation...');

    // ✅ Check feature availability
    try {
        const { checkFeatureAvailability } = await import('../features/feature-check-helper.js');
        const isAvailable = await checkFeatureAvailability('meetTranslation', {
            durationMinutes: 120 // Estimate 2 hours for meeting
        });
        if (!isAvailable) {
            isStartingTranslation = false;
            return; // Upgrade prompt already shown
        }
    } catch (error) {
        console.error('[MeetExt] Error checking feature availability:', error);
        // Continue anyway if check fails
    }

    if (!isInitialized) {
        showNotification('Extension chưa sẵn sàng', 'error');
        isStartingTranslation = false;
        return;
    }

    try {
        // 3. KIỂM TRA VÀ TÁI SỬ DỤNG CỬA SỔ
        if (pipWindow) {
            console.log('[MeetExt] ✓ Đã có cửa sổ, hiển thị lại');
            
            await pipWindow.show(); 
            
            // CRITICAL FIX: Đảm bảo CC được BẬT
            console.log('[MeetExt] 🎬 Ensuring CC is enabled...');
            
            const ccEnabled = await captionCapture.checkCaptionsEnabled();
            if (!ccEnabled) {
                console.log('[MeetExt] CC not enabled, trying to enable...');
                
                const ccButton = document.querySelector('[aria-label*="Turn on captions"], [aria-label*="Bật phụ đề"]');
                if (ccButton) {
                    ccButton.click();
                    console.log('[MeetExt] ✓ CC button clicked');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            // LUÔN restart CaptionCapture
            if (captionCapture) {
                console.log('[MeetExt] 🔄 Restarting CaptionCapture...');
                
                if (captionCapture.isCapturing) {
                    captionCapture.stop();
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                let retryCount = 0;
                let startSuccess = false;
                
                while (retryCount < 3 && !startSuccess) {
                    const result = await captionCapture.start();
                    
                    if (result.success) {
                        console.log('[MeetExt] ✅ CaptionCapture restarted');
                        startSuccess = true;
                    } else {
                        retryCount++;
                        console.warn(`[MeetExt] ⚠️ Retry ${retryCount}/3`);
                        if (retryCount < 3) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }
                
                if (!startSuccess) {
                    console.warn('[MeetExt] Starting polling...');
                    startCaptionPolling();
                }
            }
            
            if (controlBar) {
                controlBar.setTranslating(true);
            }
            
            isStartingTranslation = false;
            return;
        }
        
        // 4. TẠO MỚI (lần đầu)
        console.log('[MeetExt] 📦 Creating PiP window...');
        pipWindow = new TranslationPiPWindow(); 
        
        pipWindow.onClose((status) => {
            if (status === 'hidden') {
                console.log('[MeetExt] PiP hidden');
                
                if (controlBar) {
                    controlBar.isTranslating = false;
                    controlBar.setTranslating(false);
                    controlBar.setStatus('Translation running (window hidden)', 'translating');
                }
            } else {
                stopTranslation();
            }
        });
        
        await pipWindow.show(); 

        if (window.MeetExt) {
            window.MeetExt.pipWindow = pipWindow;
        }
        
        console.log('[MeetExt] ✅ PiP shown');
        
        // 5. BẬT CC
        console.log('[MeetExt] 🎬 Enabling CC...');
        const ccEnabled = await captionCapture.checkCaptionsEnabled();
        if (!ccEnabled) {
            const ccButton = document.querySelector('[aria-label*="caption" i], [aria-label*="phụ đề" i]');
            if (ccButton && ccButton.getAttribute('aria-pressed') !== 'true') {
                ccButton.click();
                console.log('[MeetExt] ✓ CC clicked');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // 6. START CAPTURE
        if (captionCapture) {
            const result = await captionCapture.start();
            
            if (!result.success) {
                console.log('[MeetExt] Starting polling...');
                startCaptionPolling();
                showNotification('Đang chờ phụ đề...', 'info');
            } else {
                showNotification('Đã bắt đầu dịch!', 'success');
            }
        }
        
        if (controlBar) {
            controlBar.setTranslating(true);
        }
        
    } catch (error) {
        console.error('[MeetExt] Failed:', error);
        showNotification('Lỗi: ' + error.message, 'error');
        
        if (pipWindow) {
            pipWindow.remove();
            pipWindow = null;
        }
    } finally {
        isStartingTranslation = false;
        console.log('[MeetExt] Complete. Lock released.');
    }
}

/**
 * Stop translation
 */
async function stopTranslation() {
    console.log('[MeetExt] Stopping translation...');
    
    // Mở khóa, phòng trường hợp khóa bị kẹt
    isStartingTranslation = false;

    try {
        // Stop polling nếu đang chạy
        if (captionPollingInterval) {
            clearInterval(captionPollingInterval);
            captionPollingInterval = null;
        }
        
        // Stop capturing (QUAN TRỌNG)
        if (captionCapture) {
            captionCapture.stop();
            console.log('[MeetExt] ⏹️ Caption capture TẠM DỪNG');
        }
        
        // --- BẮT ĐẦU SỬA LỖI ---
        // ✅ FIX: ẨN (HIDE) thay vì HỦY (REMOVE)
        if (pipWindow) {
            pipWindow.hide(); // Chỉ ẩn cửa sổ
            // KHÔNG set pipWindow = null
            // KHÔNG set window.MeetExt.pipWindow = null
            console.log('[MeetExt] ✓ PiP window ĐÃ ẨN');
        }
        
        // Dọn dẹp mọi cửa sổ PiP "mồ côi" (nếu có)
        // (Vẫn giữ logic này phòng trường hợp lỗi)
        const allPiPs = document.querySelectorAll('#meetTranslationPiP');
        if (allPiPs.length > 0) {
            allPiPs.forEach(pip => {
                // Nếu pip không phải là container đang quản lý, xóa nó
                if (pipWindow && pip !== pipWindow.container) {
                    pip.remove();
                    console.log(`[MeetExt] 🗑️ Removed orphan PiP`);
                }
            });
        }
        // --- KẾT THÚC SỬA LỖI ---
        
        // Update control bar state
        if (controlBar) {
            controlBar.setTranslating(false);
        }
        
        showNotification('Đã dừng dịch phụ đề', 'info');
        
    } catch (error) {
        console.error('[MeetExt] Failed to stop translation:', error);
        showNotification('Lỗi khi dừng dịch: ' + error.message, 'error');
    }
}

/**
 * ✅ IMPROVED: Polling thông minh hơn
 */
let captionPollingInterval = null;

function startCaptionPolling() {
    if (captionPollingInterval) {
        clearInterval(captionPollingInterval);
    }
    
    console.log('[MeetExt] 🔄 Starting smart caption polling...');
    let attempts = 0;
    const maxAttempts = 40; // Giảm từ 60 xuống 40 (20 giây)
    let lastCheckTime = Date.now();
    
    captionPollingInterval = setInterval(async () => {
        attempts++;
        const elapsed = ((Date.now() - lastCheckTime) / 1000).toFixed(1);
        
        if (!captionCapture || attempts > maxAttempts) {
            console.log('[MeetExt] ⏸️ Stopping caption polling (timeout)');
            clearInterval(captionPollingInterval);
            captionPollingInterval = null;
            showNotification('Không phát hiện phụ đề. Hãy thử bật CC thủ công.', 'warning');
            return;
        }
        
        // ✅ Kiểm tra CC button trước
        const ccButton = document.querySelector('[aria-label*="caption" i], [aria-label*="phụ đề" i]');
        const ccActive = ccButton && (
            ccButton.getAttribute('aria-pressed') === 'true' ||
            (ccButton.getAttribute('aria-label') || '').includes('Turn off') ||
            (ccButton.getAttribute('aria-label') || '').includes('Tắt')
        );
        
        if (ccActive) {
            console.log(`[MeetExt] ✅ CC button detected as ACTIVE (${elapsed}s)`);
            
            // Đợi thêm 500ms để DOM render xong
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const result = await captionCapture.start();
            if (result.success) {
                clearInterval(captionPollingInterval);
                captionPollingInterval = null;
                showNotification('Đã bắt đầu dịch phụ đề!', 'success');
                return;
            }
        }
        
        console.log(`[MeetExt] ⏳ Polling ${attempts}/${maxAttempts} (${elapsed}s) - CC: ${ccActive ? 'ON' : 'OFF'}`);
        
    }, 500);
}

/**
 * Generate summary
 * ✅ PHIÊN BẢN ĐÃ SỬA: Ủy quyền cho pipWindow.summaryRenderer
 */
async function generateSummary() {
    // 1. Kiểm tra xem pipWindow và summaryRenderer đã sẵn sàng chưa
    if (!pipWindow || !pipWindow.summaryRenderer) {
        showNotification('Cửa sổ tóm tắt chưa sẵn sàng.', 'error');
        console.error('[MeetExt] pipWindow or summaryRenderer is not initialized.');
        return;
    }

    // 2. Kiểm tra xem có caption không (logic này từ summarizer-ui.js)
    // Chúng ta cần hỏi summarizerManager vì nó là nguồn dữ liệu
    if (summarizerManager && summarizerManager.getCaptionsCount() === 0) {
        showNotification('Không có phụ đề nào để tóm tắt.', 'info');
        return;
    }

    console.log('[MeetExt] Delegating summary generation to SummaryRenderer...');

    try {
        // 3. Cập nhật nút bấm (BẮT ĐẦU)
        if (controlBar) {
            controlBar.setSummarizing(true);
        }

        // 4. Chuyển sang tab tóm tắt (quan trọng)
        pipWindow.switchTab('summary');
        
        // 5. GỌI HÀM CHÍNH:
        // Yêu cầu summaryRenderer tự tạo tóm tắt.
        // Hàm này (trong summaryrenderer.js) sẽ tự:
        // - Lấy lịch sử
        // - Gọi API tóm tắt
        // - Tự hiển thị trạng thái "Đang tạo..."
        // - Tự hiển thị kết quả (hoặc lỗi) vào tab
        await pipWindow.summaryRenderer.generateSummary();

    } catch (error) {
        // Bắt các lỗi nghiêm trọng (ví dụ: pipWindow.summaryRenderer bị hỏng)
        console.error('[MeetExt] Failed to delegate summary generation:', error);
        showNotification('Không thể bắt đầu tạo tóm tắt: ' + error.message, 'error');
    
    } finally {
        // 6. Cập nhật nút bấm (KẾT THÚC)
        // Dù thành công hay thất bại, hãy reset nút
        if (controlBar) {
            controlBar.setSummarizing(false);
        }
    }
}

/**
 * Process captured caption text - (NÂNG CẤP SETTING)
 */
/**
 * Process captured caption text - WITH LANGUAGE DETECTION
 */
async function processNewCaption(text, speaker = 'Unknown') {
    console.log(`[MeetExt] 📨 Received caption from [${speaker}]:`, text.substring(0, 100));
    
    // Initialize caption filter if not exists
    if (!captionFilter) {
        captionFilter = new CaptionFilter();
        
        try {
            const result = await chrome.storage.local.get('meetFilterSettings');
            const defaults = {
                minLength: 5,
                debounceMs: 500,
                similarityThreshold: 0.80,
                maxCacheSize: 50
            };
            
            if (result.meetFilterSettings) {
                const savedSettings = result.meetFilterSettings;
                defaults.minLength = savedSettings.minLength || defaults.minLength;
                defaults.debounceMs = savedSettings.debounceMs || defaults.debounceMs;
            }
            
            captionFilter.updateSettings(defaults);
            console.log('[MeetExt] ✓ Caption filter initialized');

        } catch (error) {
            console.error('[MeetExt] Error loading filter settings:', error);
            captionFilter.updateSettings({
                minLength: 5, debounceMs: 500, similarityThreshold: 0.80, maxCacheSize: 50
            });
        }
    }
    
    // Filter check
    if (!captionFilter.shouldProcess(text)) {
        console.log(`[MeetExt] ⏭️ Caption filtered out`);
        return;
    }
    
    console.log(`[MeetExt] ✅ Processing caption...`);
    
    // ✅ LANGUAGE DETECTION
    const isVi = isVietnamese(text);
    console.log(`[MeetExt] 🌐 Language detected:`, isVi ? 'Vietnamese' : 'Other');
    
    let translatedString = text; // Default to original text
    let needsTranslation = !isVi; // Only translate if NOT Vietnamese
    
    // Send original text to PiP first (if visible)
    if (pipWindow && pipWindow.isVisible()) {
        pipWindow.updateCaption(speaker, text, null);
        console.log(`[MeetExt] 📤 Sent to PiP (original)`);
    }

    try {
        let winnerModel = null;

        // ✅ CONDITIONAL TRANSLATION - Only translate if NOT Vietnamese
        if (needsTranslation && translatorManager) {
            console.log('[MeetExt] 🔄 Translating to Vietnamese...');
            
            // Use current target language (loaded from Settings)
            const translationResult = await translatorManager.translate(text, currentTargetLanguage);
            
            if (translationResult && typeof translationResult === 'object') {
                translatedString = translationResult.response;
                winnerModel = translationResult.winner ? translationResult.winner.modelId : translationResult.modelId;
            } else {
                translatedString = translationResult;
            }
            
            console.log(`[MeetExt] ✅ Translated:`, translatedString.substring(0, 100));
        } else {
            console.log('[MeetExt] ⏭️ Skipped translation (Vietnamese detected)');
            translatedString = text; // Use original
        }
        
        // Update PiP Window with translation
        if (pipWindow) {
            // ✅ Pass both original and translated
            // If Vietnamese: translated = original (no translation needed)
            pipWindow.updateCaption(speaker, text, translatedString);
            
            if (pipWindow.isVisible()) {
                console.log(`[MeetExt] 📤 Sent to PiP (${needsTranslation ? 'translated' : 'original'})`);
                
                if (winnerModel) {
                    pipWindow.updateWinnerModel(winnerModel);
                    console.log(`[MeetExt] 🏆 Winner Model:`, winnerModel);
                }
            } else {
                console.log(`[MeetExt] 📦 Caption buffered (window hidden)`);
            }
        }

        // Add to summarizer (use Vietnamese text if available, otherwise translated)
        if (summarizerManager) {
            const textForSummary = isVi ? text : translatedString;
            summarizerManager.addText(`[${speaker}]: ${textForSummary}`);
        }
        
    } catch (error) {
        console.error('[MeetExt] ❌ Failed to process:', error);
        
        if (pipWindow) {
            pipWindow.updateCaption(speaker, text, "[Lỗi dịch]");
        }
    }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * STORAGE LISTENER (NÂNG CẤP SETTING)
 * ═══════════════════════════════════════════════════════════════
 */

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.meetFilterSettings) {
        if (captionFilter) {
            const newSettings = changes.meetFilterSettings.newValue;
            console.log('[MeetExt] 🔄 Filter settings changed, updating filter:', newSettings);
            // Cập nhật captionFilter đang chạy
            captionFilter.updateSettings({
                minLength: newSettings.minLength,
                debounceMs: newSettings.debounceMs
            });
        }
    }
});

/**
 * ═══════════════════════════════════════════════════════════════
 * MAIN ENTRY POINT
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Main initialization
 */
/**
 * Áp dụng theme từ storage
 */
async function applyTheme() {
    try {
        const data = await chrome.storage.local.get('theme');
        const theme = data.theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Áp dụng cho control bar nếu đã tồn tại
        const controlBar = document.getElementById('meetExtensionControlBar');
        if (controlBar) {
            controlBar.setAttribute('data-theme', theme);
        }
        
        // Áp dụng cho PiP window nếu đã tồn tại
        const pipWindow = document.getElementById('meetTranslationPiP');
        if (pipWindow) {
            pipWindow.setAttribute('data-theme', theme);
        }
        
        console.log('[MeetExt] Theme applied:', theme);
    } catch (e) {
        console.warn('[MeetExt] Error applying theme:', e);
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
                
                // Cập nhật control bar
                const controlBar = document.getElementById('meetExtensionControlBar');
                if (controlBar) {
                    controlBar.setAttribute('data-theme', newTheme);
                }
                
                // Cập nhật PiP window
                const pipWindow = document.getElementById('meetTranslationPiP');
                if (pipWindow) {
                    pipWindow.setAttribute('data-theme', newTheme);
                }
                
                console.log('[MeetExt] Theme updated:', newTheme);
            }
        }
    });
}

async function main() {
    console.log('[MeetExt] Starting main initialization...');

    // Áp dụng theme ngay từ đầu
    await applyTheme();
    setupThemeListener();

    // Check if we're on Google Meet
    if (!isGoogleMeet()) {
        console.log('[MeetExt] Not on Google Meet, exiting');
        return;
    }

    console.log('[MeetExt] On Google Meet page');

    // Check if in meeting
    if (!isInMeeting()) {
        console.log('[MeetExt] Not in meeting yet, will wait...');
        return;
    }

    console.log('[MeetExt] In meeting, waiting for UI...');

    // Wait for Meet UI to be ready
    await waitForMeetReady();

    // Initialize managers
    await initializeManagers();

    // Inject UI - FIXED VERSION
    await injectControlBar();
    
    // Áp dụng lại theme sau khi inject UI
    await applyTheme();

    console.log('[MeetExt] Initialization complete! 🎉');
}

/**
 * ═══════════════════════════════════════════════════════════════
 * START
 * ═══════════════════════════════════════════════════════════════
 */

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

// Also run when page fully loaded
window.addEventListener('load', () => {
    if (!isInitialized) {
        main();
    }
});

// Watch for navigation (SPA behavior)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('[MeetExt] URL changed:', url);
        
        // Re-initialize if entering a meeting
        if (isInMeeting() && !isInitialized) {
            main();
        }
    }
}).observe(document, { subtree: true, childList: true });

// Export for debugging
window.MeetExt = {
    translatorManager,
    summarizerManager,
    controlBar,
    pipWindow,
	captionCapture,
    isInitialized: () => isInitialized,
    reinitialize: main,
    startTranslation,
    stopTranslation
};

/**
 * ✅ DEBUG: Kiểm tra và cleanup PiP duplicate định kỳ
 */
setInterval(() => {
    const allPiPs = document.querySelectorAll('#meetTranslationPiP');
    if (allPiPs.length > 1) {
        console.warn('[MeetExt] ⚠️ Detected duplicate PiP windows:', allPiPs.length);
        console.log('[MeetExt] 🗑️ Auto-cleaning duplicates...');
        
        // Giữ lại cái đầu tiên nếu pipWindow ref đến nó, hoặc giữ cái mới nhất
        allPiPs.forEach((pip, index) => {
            if (index > 0) {
                pip.remove();
                console.log(`[MeetExt] Removed duplicate PiP #${index}`);
            }
        });
    }
}, 3000); // Check mỗi 3 giây

console.log('[MeetExt] Script loaded, waiting for initialization...');