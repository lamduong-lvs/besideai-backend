/**
 * Translation Languages Configuration
 * Danh sách 8 ngôn ngữ dịch được hỗ trợ (nhất quán với i18n.js)
 */

// Define constants (without export - will export later)
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

/**
 * Get language label by code
 * @param {string} value - Language code (e.g., 'vi', 'en', 'auto')
 * @returns {string} Language label
 */
function getLanguageLabel(value) {
    if (value === 'auto') {
        return 'Tự động phát hiện';
    }
    const found = TRANSLATION_LANGUAGES.find((lang) => lang.value === value);
    return found ? found.label : value;
}

/**
 * Check if language code is supported
 * @param {string} code - Language code
 * @returns {boolean}
 */
function isSupportedLanguage(code) {
    if (code === 'auto') return true;
    return TRANSLATION_LANGUAGES.some(lang => lang.value === code);
}

/**
 * Get default target language from Settings
 * @returns {Promise<string>} Default target language code
 */
async function getDefaultTargetLanguage() {
    try {
        const result = await chrome.storage.local.get('translateSettings');
        if (result.translateSettings && result.translateSettings.defaultTargetLanguage) {
            const lang = result.translateSettings.defaultTargetLanguage;
            if (isSupportedLanguage(lang)) {
                return lang;
            }
        }
    } catch (error) {
        console.error('[TranslationLanguages] Error loading default target language:', error);
    }
    return 'vi'; // Fallback to Vietnamese
}

/**
 * Get target language for a specific feature
 * Priority: feature preference > default from Settings > fallback
 * @param {string} featureName - Feature name ('translatePanel', 'contextMenu', 'meetTranslation', 'teamsTranslation')
 * @returns {Promise<string>} Target language code
 */
async function getTargetLanguageForFeature(featureName) {
    try {
        // First, check feature-specific preference
        const featureKey = `${featureName}Settings` || `${featureName}`;
        const featureData = await chrome.storage.local.get(featureKey);
        if (featureData[featureKey] && featureData[featureKey].lastTargetLanguage) {
            const lang = featureData[featureKey].lastTargetLanguage;
            if (isSupportedLanguage(lang)) {
                return lang;
            }
        }
        
        // Fallback to default from Settings
        return await getDefaultTargetLanguage();
    } catch (error) {
        console.error(`[TranslationLanguages] Error loading target language for ${featureName}:`, error);
        return 'vi'; // Final fallback
    }
}

/**
 * Save target language preference for a feature
 * @param {string} featureName - Feature name
 * @param {string} languageCode - Language code to save
 */
async function saveTargetLanguageForFeature(featureName, languageCode) {
    if (!isSupportedLanguage(languageCode)) {
        console.warn(`[TranslationLanguages] Invalid language code: ${languageCode}`);
        return;
    }
    
    try {
        const featureKey = `${featureName}Settings` || `${featureName}`;
        const currentData = await chrome.storage.local.get(featureKey);
        const featureSettings = currentData[featureKey] || {};
        
        await chrome.storage.local.set({
            [featureKey]: {
                ...featureSettings,
                lastTargetLanguage: languageCode
            }
        });
        
        console.log(`[TranslationLanguages] Saved target language for ${featureName}: ${languageCode}`);
    } catch (error) {
        console.error(`[TranslationLanguages] Error saving target language for ${featureName}:`, error);
    }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT FOR MULTIPLE MODULE SYSTEMS
// ═══════════════════════════════════════════════════════════════════

// CommonJS export (for require)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TRANSLATION_LANGUAGES,
        getLanguageLabel,
        isSupportedLanguage,
        getDefaultTargetLanguage,
        getTargetLanguageForFeature,
        saveTargetLanguageForFeature
    };
}

// Global window export (for scripts loaded via manifest)
if (typeof window !== 'undefined') {
    window.TRANSLATION_LANGUAGES = TRANSLATION_LANGUAGES;
    window.getLanguageLabel = getLanguageLabel;
    window.isSupportedLanguage = isSupportedLanguage;
    window.getDefaultTargetLanguage = getDefaultTargetLanguage;
    window.getTargetLanguageForFeature = getTargetLanguageForFeature;
    window.saveTargetLanguageForFeature = saveTargetLanguageForFeature;
}

// Note: ES6 exports removed - this file is loaded as regular script in manifest
// For HTML pages, use window.* directly or import from a wrapper module

