/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TRANSLATOR MANAGER - SINGLE MODE                              │
 * │  Uses message passing to background for translation            │
 * └─────────────────────────────────────────────────────────────────┘
 */

// Simple stub for RacingHelper (removed, using single mode)
class RacingHelper {
    constructor() {
        this.enabled = false;
    }
    
    async init() {
        this.enabled = false;
    }
    
    isRacingEnabled() {
        return false;
    }
    
    async raceTranslation(text, source, target, options) {
        // Use message passing to background for translation via processAction
        try {
            // Build translation prompt
            const sourceLabel = source === 'auto' ? 'ngôn ngữ nguồn' : source;
            const targetLabel = target === 'vi' ? 'tiếng Việt' : target === 'en' ? 'English' : target;
            const systemPrompt = `You are a professional translator. Translate the following text from ${sourceLabel} to ${targetLabel}. Only return the translated text, no explanations or additional text.`;
            
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
            ];
            
            // Get AI config
            const configResponse = await chrome.runtime.sendMessage({ action: 'getAIConfig' });
            if (!configResponse?.success || !configResponse.config) {
                throw new Error('Failed to get AI config');
            }
            
            const response = await chrome.runtime.sendMessage({
                action: 'processAction',
                messages: messages,
                config: configResponse.config
            });
            
            if (!response || !response.success) {
                throw new Error(response?.error?.message || 'Translation failed');
            }
            
            return {
                response: response.result || '',
                cached: false,
                winner: null
            };
        } catch (error) {
            console.error('[TranslatorManager] Translation via message failed:', error);
            throw error;
        }
    }
    
    getRacingStats() {
        return { enabled: false };
    }
    
    clearCache() {
        // No-op
    }
}

// Try to import dependencies - if failed (e.g., loaded as regular script), will use fallback
let isSupportedLanguageFunc = null;
let getDefaultTargetLanguageFunc = null;
let detectVietnameseFunc = null;
let needsTranslationFunc = null;

// Load dependencies - check window first (if loaded via manifest), then try dynamic import
(function loadDependencies() {
  // Check if dependencies are already available in window (loaded via manifest)
  if (typeof window !== 'undefined') {
    if (window.isSupportedLanguage && window.getDefaultTargetLanguage && window.isVietnamese && window.needsTranslation) {
      isSupportedLanguageFunc = window.isSupportedLanguage;
      getDefaultTargetLanguageFunc = window.getDefaultTargetLanguage;
      detectVietnameseFunc = window.isVietnamese;
      needsTranslationFunc = window.needsTranslation;
      return; // Dependencies already loaded
    }
  }
  
  // Try dynamic import as fallback
  (async () => {
    try {
      const [translationLangModule, langDetectionModule] = await Promise.all([
        import(chrome.runtime.getURL('modules/common/config/translation-languages.js')).catch(() => null),
        import(chrome.runtime.getURL('modules/common/utils/language-detection.js')).catch(() => null)
      ]);
      
      if (translationLangModule) {
        isSupportedLanguageFunc = translationLangModule.isSupportedLanguage;
        getDefaultTargetLanguageFunc = translationLangModule.getDefaultTargetLanguage;
      }
      if (langDetectionModule) {
        detectVietnameseFunc = langDetectionModule.isVietnamese;
        needsTranslationFunc = langDetectionModule.needsTranslation;
      }
      
      // If still not loaded, use fallbacks
      if (!isSupportedLanguageFunc || !getDefaultTargetLanguageFunc || !detectVietnameseFunc || !needsTranslationFunc) {
        setupFallbacks();
      }
    } catch (error) {
      setupFallbacks();
    }
  })();
  
  function setupFallbacks() {
    isSupportedLanguageFunc = isSupportedLanguageFunc || ((code) => ['vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de', 'es', 'auto'].includes(code));
    getDefaultTargetLanguageFunc = getDefaultTargetLanguageFunc || (async () => {
      try {
        const data = await chrome.storage.local.get('translateSettings');
        return data.translateSettings?.defaultTargetLanguage || 'vi';
      } catch {
        return 'vi';
      }
    });
    detectVietnameseFunc = detectVietnameseFunc || ((text) => {
      if (!text || text.trim().length === 0) return false;
      const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
      return vietnameseChars.test(text);
    });
    needsTranslationFunc = needsTranslationFunc || ((text, targetLang) => {
      if (!text || text.trim().length === 0) return false;
      if (targetLang === 'vi' && detectVietnameseFunc(text)) return false;
      return true;
    });
  }
})();

class TranslatorManager {
    constructor() {
        this.racingHelper = null;
        this.isActive = false;
        this.settings = {
            targetLanguage: 'vi',
            sourceLanguage: 'auto',
            enableRacing: false
        };
        
        // Queue for translations
        this.translationQueue = [];
        this.isProcessing = false;
        
        // Callbacks
        this.onTranslation = null;
        this.onError = null;
        
        console.log('[TranslatorManager] 🌐 Instance created');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * INITIALIZATION
     * ═══════════════════════════════════════════════════════════════
     */

    async init() {
        console.log('[TranslatorManager] 📥 Initializing...');
        
        try {
            // Initialize racing helper
            this.racingHelper = new RacingHelper();
            await this.racingHelper.init();
            
            // Load settings
            await this.loadSettings();
            
            console.log('[TranslatorManager] ✓ Initialized:', {
                targetLang: this.settings.targetLanguage,
                racingEnabled: this.racingHelper.isRacingEnabled()
            });

        } catch (error) {
            console.error('[TranslatorManager] ✗ Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['translateSettings', 'translatorSettings', 'raceSettings']);
            
            // Priority: translateSettings (new) > translatorSettings (old, for backward compatibility)
            if (result.translateSettings) {
                this.settings = {
                    ...this.settings,
                    targetLanguage: result.translateSettings.defaultTargetLanguage || this.settings.targetLanguage,
                    sourceLanguage: result.translateSettings.sourceLanguage || this.settings.sourceLanguage
                };
            } else if (result.translatorSettings) {
                // Backward compatibility
                this.settings = {
                    ...this.settings,
                    ...result.translatorSettings
                };
            }
            
            // If still no target language, load from default
            if (!this.settings.targetLanguage || !(isSupportedLanguageFunc ? isSupportedLanguageFunc(this.settings.targetLanguage) : ['vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de', 'es'].includes(this.settings.targetLanguage))) {
                this.settings.targetLanguage = getDefaultTargetLanguageFunc ? await getDefaultTargetLanguageFunc() : 'vi';
            }

            if (result.raceSettings) {
                this.settings.enableRacing = result.raceSettings.enabled || false;
            }

            console.log('[TranslatorManager] ✓ Settings loaded:', this.settings);

        } catch (error) {
            console.error('[TranslatorManager] ✗ Failed to load settings:', error);
            // Fallback to default
            this.settings.targetLanguage = getDefaultTargetLanguageFunc ? await getDefaultTargetLanguageFunc().catch(() => 'vi') : 'vi';
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * TRANSLATION
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Translate text
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language (optional, uses settings if not provided)
     * @returns {Promise<string>} - Translated text
     */
    /**
 * Translate text with Vietnamese detection
 */
async translate(text, targetLang = null) {
    if (!text || !text.trim()) {
        console.warn('[TranslatorManager] ⚠ Empty text, skipping');
        return '';
    }

    const target = targetLang || this.settings.targetLanguage;
    const source = this.settings.sourceLanguage;

    // Validate target language
    const isValidLang = isSupportedLanguageFunc ? isSupportedLanguageFunc(target) : ['vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de', 'es'].includes(target);
    if (!isValidLang) {
        console.warn('[TranslatorManager] ⚠ Invalid target language:', target, '- using default');
        this.settings.targetLanguage = getDefaultTargetLanguageFunc ? await getDefaultTargetLanguageFunc().catch(() => 'vi') : 'vi';
        return this.translate(text, this.settings.targetLanguage); // Retry with default
    }
    
    // ✅ CHECK IF ALREADY IN TARGET LANGUAGE - Skip translation
    const shouldTranslate = needsTranslationFunc ? needsTranslationFunc(text, target) : (target !== 'vi' || !this.isVietnamese(text));
    if (!shouldTranslate) {
        console.log('[TranslatorManager] ⏭️ Text is already in target language, skipping translation');
        return text; // Return original text
    }

    console.log('[TranslatorManager] 🔄 Translating:', {
        text: text.substring(0, 50) + '...',
        from: source,
        to: target,
        racing: this.racingHelper.isRacingEnabled()
    });

    try {
        const result = await this.racingHelper.raceTranslation(
            text,
            source,
            target,
            {
                temperature: 0.3,
                maxTokens: 1000
            }
        );

        const translated = result.response;
        
        console.log('[TranslatorManager] ✓ Translated:', {
            original: text.substring(0, 30) + '...',
            translated: translated.substring(0, 30) + '...',
            cached: result.cached,
            winner: result.winner?.modelId
        });

        if (this.onTranslation) {
            this.onTranslation({
                original: text,
                translated: translated,
                ...result
            });
        }

        return translated;

    } catch (error) {
        console.error('[TranslatorManager] ✗ Translation failed:', error);
        
        if (this.onError) {
            this.onError(error);
        }
        
        throw error;
    }
}

/**
 * Detect if text is Vietnamese (uses shared utility)
 */
isVietnamese(text) {
    if (detectVietnameseFunc) {
        return detectVietnameseFunc(text);
    }
    // Fallback if dependency not loaded yet
    if (!text || text.trim().length === 0) return false;
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    return vietnameseChars.test(text);
}

/**
 * Get supported languages
 */
getSupportedLanguages() {
    // Re-export from constants (avoid circular dependency)
    // For now, return the 8 languages directly
    return ['vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de', 'es'];
}

    /**
     * Queue translation for processing
     */
    queueTranslation(text, targetLang = null) {
        console.log('[TranslatorManager] 📋 Queued:', text.substring(0, 30) + '...');
        
        this.translationQueue.push({
            text,
            targetLang,
            timestamp: Date.now()
        });

        // Process queue if not already processing
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Process translation queue
     */
    async processQueue() {
        if (this.isProcessing || this.translationQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log('[TranslatorManager] 🔄 Processing queue:', this.translationQueue.length);

        while (this.translationQueue.length > 0) {
            const item = this.translationQueue.shift();
            
            try {
                await this.translate(item.text, item.targetLang);
            } catch (error) {
                console.error('[TranslatorManager] ✗ Queue item failed:', error);
            }

            // Small delay between translations
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.isProcessing = false;
        console.log('[TranslatorManager] ✓ Queue processed');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * BATCH TRANSLATION
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Translate multiple texts
     */
    async translateBatch(texts, targetLang = null) {
        console.log('[TranslatorManager] 📦 Batch translation:', texts.length, 'items');

        const results = [];

        for (const text of texts) {
            try {
                const translated = await this.translate(text, targetLang);
                results.push({
                    original: text,
                    translated: translated,
                    success: true
                });
            } catch (error) {
                results.push({
                    original: text,
                    translated: null,
                    success: false,
                    error: error.message
                });
            }
        }

        console.log('[TranslatorManager] ✓ Batch complete:', {
            total: results.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        });

        return results;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * CONTROL
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Start translator
     */
    start() {
        this.isActive = true;
        console.log('[TranslatorManager] ▶️ Started');
    }

    /**
     * Stop translator
     */
    stop() {
        this.isActive = false;
        this.translationQueue = [];
        this.isProcessing = false;
        console.log('[TranslatorManager] ⏹️ Stopped');
    }

    /**
     * Check if active
     */
    isRunning() {
        return this.isActive;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * SETTINGS
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Update target language
     */
    setTargetLanguage(lang) {
        this.settings.targetLanguage = lang;
        console.log('[TranslatorManager] 🌐 Target language:', lang);
    }

    /**
     * Update source language
     */
    setSourceLanguage(lang) {
        this.settings.sourceLanguage = lang;
        console.log('[TranslatorManager] 🌐 Source language:', lang);
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * CALLBACKS
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Set translation callback
     */
    setOnTranslation(callback) {
        this.onTranslation = callback;
        console.log('[TranslatorManager] 📞 Translation callback set');
    }

    /**
     * Set error callback
     */
    setOnError(callback) {
        this.onError = callback;
        console.log('[TranslatorManager] 📞 Error callback set');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * STATISTICS
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Get translation statistics
     */
    getStatistics() {
        const racingStats = this.racingHelper.getRacingStats();
        
        return {
            active: this.isActive,
            queueLength: this.translationQueue.length,
            racing: racingStats,
            settings: this.settings
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.racingHelper.clearCache();
        console.log('[TranslatorManager] 🗑️ Cache cleared');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * DEBUG
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Test translation
     */
    async test() {
        console.log('[TranslatorManager] 🧪 Testing...');
        
        try {
            const result = await this.translate('Hello, how are you?', 'vi');
            console.log('[TranslatorManager] ✓ Test passed:', result);
            return { success: true, result };
        } catch (error) {
            console.error('[TranslatorManager] ✗ Test failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Log current status
     */
    logStatus() {
        console.log('[TranslatorManager] 📊 Status:', {
            active: this.isActive,
            queue: this.translationQueue.length,
            processing: this.isProcessing,
            settings: this.settings,
            racing: this.racingHelper.isRacingEnabled()
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslatorManager;
}

// Make available globally
window.TranslatorManager = TranslatorManager;

// Info log - comment out to reduce console noise
// console.log('[TranslatorManager] 🌐 Module loaded ✓');