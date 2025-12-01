/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  RACING HELPER - INTEGRATED WITH MAIN EXTENSION                │
 * │  Uses apiManager and settings from main extension              │
 * │  Format: provider/modelId (e.g., "openai/gpt-4o-mini")        │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế tất cả các chuỗi Error bằng window.Lang.get()
 * - Cập nhật buildSummaryPrompt để chèn các key đã dịch vào prompt
 */

class RacingHelper {
    constructor() {
        this.settings = {
            enableRacingMode: false,
            racingModels: [], // Array of "provider/modelId"
            racingTimeout: 10000,
            cancelSlowerRequests: true
        };
        
        this.activeRaces = new Map();
        this.raceResults = new Map();
        this.rateLimitWindows = new Map();
        this.translationCache = new Map();
        this.maxCacheSize = 100;
        
        console.log('[RacingHelper] 🏎️ Initialized');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * INITIALIZATION - LOAD FROM SETTINGS
     * ═══════════════════════════════════════════════════════════════
     */

    async init() {
        console.log('[RacingHelper] 📥 Loading settings from storage...');
        
        try {
            const result = await chrome.storage.local.get(['raceSettings', 'aiProvider']);
            
            if (result.raceSettings) {
                this.settings = {
                    ...this.settings,
                    enableRacingMode: result.raceSettings.enabled || false,
                    racingModels: result.raceSettings.models || []
                };
                
                console.log('[RacingHelper] ✓ Settings loaded:', {
                    enabled: this.settings.enableRacingMode,
                    models: this.settings.racingModels
                });
            } else {
                console.log('[RacingHelper] ⚠ No race settings found, using defaults');
            }

            // Load default model as fallback
            if (result.aiProvider && !this.settings.enableRacingMode) {
                console.log('[RacingHelper] 📌 Default model:', result.aiProvider);
            }

        } catch (error) {
            console.error('[RacingHelper] ✗ Failed to load settings:', error);
        }
    }

    /**
     * Update settings from storage change
     */
    updateSettings(newSettings) {
        console.log('[RacingHelper] 🔄 Updating settings:', newSettings);
        this.settings = {
            ...this.settings,
            ...newSettings
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * RACING CORE - INTEGRATED WITH BACKGROUND.JS
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Race multiple models by sending request to background
     * @param {string} prompt - Prompt to send
     * @param {object} options - Options
     * @returns {Promise<object>} - Response with winner info
     */
    async race(prompt, options = {}) {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) {
            console.error("RacingHelper: window.Lang (i18n.js) is not ready.");
            throw new Error("i18n service not loaded.");
        }
        
        console.log('[RacingHelper] 🏁 Starting race...');
        
        if (!this.settings.enableRacingMode) {
            // Dịch lỗi
            throw new Error(window.Lang.get('errorRacingDisabled'));
        }

        if (this.settings.racingModels.length < 2) {
            // Dịch lỗi
            throw new Error(window.Lang.get('errorRacingMinModels'));
        }

        const raceId = Date.now().toString();
        const startTime = Date.now();

        console.log('[RacingHelper] 📊 Racing models:', this.settings.racingModels);

        try {
            // Send race request to background
            const response = await chrome.runtime.sendMessage({
                action: 'processAction',
                messages: [{ role: 'user', content: prompt }],
                config: {
                    isRaceMode: true,
                    models: this.settings.racingModels
                }
            });

            const totalTime = Date.now() - startTime;

            if (response.success) {
                console.log('[RacingHelper] 🏆 Winner:', response.usedFullModelId, `(${totalTime}ms)`);
                
                return {
                    response: response.result,
                    winner: {
                        modelId: response.usedFullModelId,
                        provider: response.providerUsed,
                        latency: totalTime
                    },
                    raceTime: totalTime,
                    raceId
                };
            } else {
                // Dịch lỗi
                throw new Error(response.error || window.Lang.get('errorRacingFailed'));
            }

        } catch (error) {
			if (error && error.message.includes('Extension context invalidated')) {
                console.warn('[RacingHelper] ✗ Race failed: Context invalidated. Background script đã khởi động lại.');
                // Dịch lỗi
                throw new Error(window.Lang.get('errorConnectionRetry'));
            }
            console.error('[RacingHelper] ✗ Race failed:', error);
            throw error;
        }
    }

    /**
     * Send to single model via background
     */
    async sendSingle(prompt, options = {}) {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) {
            console.error("RacingHelper: window.Lang (i18n.js) is not ready.");
            throw new Error("i18n service not loaded.");
        }
        
        console.log('[RacingHelper] 📤 Sending to single model...');

        const result = await chrome.storage.local.get(['aiProvider']);
        const defaultModel = result.aiProvider || this.settings.racingModels[0];

        if (!defaultModel) {
            // Dịch lỗi
            throw new Error(window.Lang.get('errorModelNotConfigured'));
        }

        console.log('[RacingHelper] 📌 Using model:', defaultModel);

        try {
            const jsonResponse = options.jsonResponse || false;
            
            const response = await chrome.runtime.sendMessage({
                action: 'processAction',
                messages: [{ role: 'user', content: prompt }],
                config: {
                    isRaceMode: false,
                    models: [defaultModel],
                    jsonResponse: jsonResponse 
                }
            });

            if (response.success) {
                console.log('[RacingHelper] ✓ Response received');
                return {
                    response: response.result,
                    modelId: response.usedFullModelId,
                    provider: response.providerUsed
                };
            } else {
                // Dịch lỗi
                throw new Error(response.error || window.Lang.get('errorRequestFailed'));
            }

        } catch (error) {
			if (error && error.message.includes('Extension context invalidated')) {
                console.warn('[RacingHelper] ✗ Single request failed: Context invalidated. Background script đã khởi động lại.');
                // Dịch lỗi
                throw new Error(window.Lang.get('errorConnectionRetry'));
            }
            console.error('[RacingHelper] ✗ Single request failed:', error);
            throw error;
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * TRANSLATION RACING
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Race translation with caching
     */
    async raceTranslation(text, sourceLang, targetLang, options = {}) {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) {
            console.error("RacingHelper: window.Lang (i18n.js) is not ready.");
            throw new Error("i18n service not loaded.");
        }
        
        console.log('[RacingHelper] 🌐 Racing translation:', {
            text: text.substring(0, 50) + '...',
            from: sourceLang,
            to: targetLang
        });

        // Check cache first
        const cacheKey = `${text}:${sourceLang}:${targetLang}`;
        if (this.translationCache.has(cacheKey)) {
            console.log('[RacingHelper] ✓ Cache hit!');
            const cachedResult = this.translationCache.get(cacheKey);

            try {
                const winnerModelId = cachedResult.winner ? cachedResult.winner.modelId : cachedResult.modelId;
                if (window.MeetExt && window.MeetExt.pipWindow && winnerModelId) {
                    window.MeetExt.pipWindow.updateWinnerModel(winnerModelId);
                }
            } catch (e) { 
                // Dịch lỗi
                console.error(window.Lang.get('errorCacheWinnerUpdate'), e);
            }

            return {
                ...cachedResult,
                cached: true
            };
        }

        // Build translation prompt
        const prompt = this.buildTranslationPrompt(text, sourceLang, targetLang);

        try {
            let result;
            
            if (this.settings.enableRacingMode && this.settings.racingModels.length >= 2) {
                console.log('[RacingHelper] 🏎️ Using racing mode');
                result = await this.race(prompt, options);
            } else {
                console.log('[RacingHelper] 🚗 Using single model');
                result = await this.sendSingle(prompt, options);
            }

            try {
                const winnerModelId = result.winner ? result.winner.modelId : result.modelId;
                const pip = window.MeetExt?.pipWindow || window.TeamsExt?.pipWindow;

                if (pip && winnerModelId) {
                    pip.updateWinnerModel(winnerModelId);
                    console.log('[RacingHelper] ⬆️ Sent winner ID to PiP:', winnerModelId);
                } else if (!pip) {
                    console.warn('[RacingHelper] ⚠️ Không tìm thấy window.MeetExt.pipWindow hoặc window.TeamsExt.pipWindow. Model winner sẽ không được hiển thị.');
                }
            } catch (e) {
                // Dịch lỗi
                console.error(window.Lang.get('errorPipUpdate'), e);
            }

            // Add to cache
            this.addToCache(cacheKey, result);

            return {
                ...result,
                cached: false,
                sourceLang,
                targetLang
            };

        } catch (error) {
            console.error('[RacingHelper] ✗ Translation failed:', error);
            throw error;
        }
    }

    /**
     * Build translation prompt
     * (Cập nhật i18n)
     */
    buildTranslationPrompt(text, sourceLang, targetLang) {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) {
            console.error("RacingHelper: window.Lang (i18n.js) is not ready.");
            // Dùng fallback tiếng Anh nếu i18n lỗi
            return `Translate the following text from ${sourceLang} to ${targetLang}. Only return the translation, no explanations:\n\n${text}`;
        }
        
        // Lấy tên ngôn ngữ đã dịch
        const sourceLanguage = window.Lang.get(`lang_${sourceLang}`) || sourceLang;
        const targetLanguage = window.Lang.get(`lang_${targetLang}`) || targetLang;

        // Vẫn giữ prompt bằng tiếng Anh (AI hiểu tốt nhất)
        return `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translation, no explanations:

${text}`;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * SUMMARIZATION
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Generate summary (single model, high quality)
     */
    async generateSummary(captions, options = {}) {
        console.log('[RacingHelper] 📝 Generating summary...');
        console.log('[RacingHelper] 📊 Captions count:', captions.length);

        // Build summary prompt (đã được i18n)
        const prompt = this.buildSummaryPrompt(captions, options);

        try {
            // Always use single model for summary (quality over speed)
            const result = await this.sendSingle(prompt, {
                temperature: 0.5,
                maxTokens: 2000,
                ...options
            });

            console.log('[RacingHelper] ✓ Summary generated');

            return result;

        } catch (error) {
            console.error('[RacingHelper] ✗ Summary generation failed:', error);
            throw error;
        }
    }

    /**
     * Build summary prompt
     * (Cập nhật i18n)
     */
    buildSummaryPrompt(captions, options = {}) {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) {
            console.error("RacingHelper: window.Lang (i18n.js) is not ready.");
            // Dùng prompt tiếng Việt cứng (fallback)
            return `Bạn PHẢI trả lời bằng tiếng Việt. TẤT CẢ nội dung trong phản hồi của bạn PHẢI là tiếng Việt.\n\nAnalyze the following meeting transcript...\n...`;
        }
        
        const {
            language = 'vi',
            style = 'detailed',
            includeTimestamps = true,
            includeSpeakers = true
        } = options;

        // Format captions (Không thay đổi)
        let captionsText = '';
        captions.forEach((caption, index) => {
            let line = '';
            if (includeTimestamps) {
                line += `[${caption.timestamp || index}] `;
            }
            if (includeSpeakers && caption.speaker) {
                line += `${caption.speaker}: `;
            }
            line += caption.text;
            captionsText += line + '\n';
        });

        // Lấy tên ngôn ngữ (ví dụ: "Tiếng Việt")
        const langName = window.Lang.get(`lang_${language.replace('-', '_')}`) || "Tiếng Việt";
        // Lấy chỉ dẫn (ví dụ: "Bạn PHẢI trả lời bằng tiếng Việt...")
        const languageInstruction = language === 'vi' 
            ? window.Lang.get('promptSummaryVI')
            : window.Lang.get('promptSummaryEN');

        // Lấy các key cho ví dụ JSON
        const exampleMain = window.Lang.get('promptExampleMain', { lang: langName });
        const exampleKeyPoint = window.Lang.get('promptExampleKeyPoint');
        const exampleDecision = window.Lang.get('promptExampleDecision');
        const exampleTask = window.Lang.get('promptExampleTask');
        const exampleAssignee = window.Lang.get('promptExampleAssignee');
        const exampleDeadline = window.Lang.get('promptExampleDeadline');

        // Giữ prompt chính bằng tiếng Anh (AI hiểu tốt nhất)
        return `${languageInstruction}

Analyze the following meeting transcript and return ONLY a valid JSON object.

Meeting Transcript:
${captionsText}

Return JSON in this EXACT format (ALL text fields MUST be in ${langName}):
{
  "main": "(${exampleMain})",
  "keyPoints": ["${exampleKeyPoint} 1", "${exampleKeyPoint} 2", "${exampleKeyPoint} 3"],
  "decisions": ["${exampleDecision} 1", "${exampleDecision} 2"],
  "actionItems": [
    {"task": "${exampleTask}", "assignee": "${exampleAssignee}", "deadline": "${exampleDeadline}"}
  ]
}

CRITICAL RULES:
1. Return ONLY the JSON object - NO markdown, NO \`\`\`json blocks, NO explanations
2. ALL text content MUST be written in ${langName}
3. Use the exact JSON structure shown above
4. Keep field names in English, but values in ${langName}`;
}

    /**
     * ═══════════════════════════════════════════════════════════════
     * CACHE MANAGEMENT
     * ═══════════════════════════════════════════════════════════════
     */

    addToCache(key, value) {
        // Remove oldest if cache full
        if (this.translationCache.size >= this.maxCacheSize) {
            const firstKey = this.translationCache.keys().next().value;
            this.translationCache.delete(firstKey);
            console.log('[RacingHelper] 🗑️ Cache cleanup');
        }

        this.translationCache.set(key, value);
        console.log('[RacingHelper] 💾 Added to cache:', key.substring(0, 30) + '...');
    }

    clearCache() {
        this.translationCache.clear();
        console.log('[RacingHelper] 🗑️ Cache cleared');
    }

    getCacheStats() {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) return { size: this.translationCache.size, maxSize: this.maxCacheSize, hitRate: "N/A" };
        
        return {
            size: this.translationCache.size,
            maxSize: this.maxCacheSize,
            // Dịch 'N/A'
            hitRate: window.Lang.get('statusNA')
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * HELPERS
     * ═══════════════════════════════════════════════════════════════
     */

    isRacingEnabled() {
        const enabled = this.settings.enableRacingMode && 
                       this.settings.racingModels.length >= 2;
        console.log('[RacingHelper] 🔍 Racing enabled:', enabled);
        return enabled;
    }

    getSettings() {
        return { ...this.settings };
    }

    getRaceResults(raceId = null) {
        if (raceId) {
            return this.raceResults.get(raceId);
        }
        return Array.from(this.raceResults.values());
    }

    /**
     * Get racing statistics
     */
    getRacingStats() {
        const results = Array.from(this.raceResults.values());
        
        console.log('[RacingHelper] 📊 Stats:', {
            totalRaces: results.length,
            cacheSize: this.translationCache.size
        });

        return {
            totalRaces: results.length,
            cache: this.getCacheStats(), // Đã được dịch
            models: this.settings.racingModels
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * DEBUG & TESTING
     * ═══════════════════════════════════════════════════════════════
     */

    async testConnection() {
        console.log('[RacingHelper] 🧪 Testing connection...');
        
        try {
            const result = await this.sendSingle('Hello, please respond with "OK"', {
                maxTokens: 10,
                temperature: 0
            });

            console.log('[RacingHelper] ✓ Test passed:', result);
            return { success: true, result };

        } catch (error) {
            console.error('[RacingHelper] ✗ Test failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Log current configuration
     */
    logConfig() {
        console.log('[RacingHelper] 📋 Configuration:', {
            racingEnabled: this.settings.enableRacingMode,
            models: this.settings.racingModels,
            timeout: this.settings.racingTimeout,
            cancelSlower: this.settings.cancelSlowerRequests,
            cacheSize: this.translationCache.size
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RacingHelper;
}

// Make available globally
window.RacingHelper = RacingHelper;

console.log('[RacingHelper] 🏎️ Module loaded ✓');