/**
 * Language Detection Utility
 * Phát hiện ngôn ngữ (hiện tại chỉ hỗ trợ Vietnamese detection)
 */

/**
 * Detect if text is Vietnamese
 * Uses diacritics and common Vietnamese words
 * @param {string} text - Text to check
 * @returns {boolean} True if text appears to be Vietnamese
 */
function isVietnamese(text) {
    if (!text || text.trim().length === 0) return false;
    
    // Vietnamese diacritics patterns
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    
    // Common Vietnamese words (high frequency)
    const vietnameseWords = [
        'là', 'của', 'và', 'có', 'trong', 'được', 'các', 'này', 'cho', 'không', 
        'một', 'với', 'để', 'những', 'hay', 'về', 'khi', 'bạn', 'tôi', 'họ',
        'này', 'đó', 'nếu', 'như', 'thì', 'mà', 'sẽ', 'cũng', 'đã', 'rất',
        'nhiều', 'nơi', 'việc', 'người', 'thời', 'năm', 'ngày', 'tháng', 'năm'
    ];
    
    // Check if text contains Vietnamese characters
    const hasVietnameseChars = vietnameseChars.test(text);
    
    // Check percentage of Vietnamese words
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) return false;
    
    const vietnameseWordCount = words.filter(w => vietnameseWords.includes(w)).length;
    const vietnameseWordRatio = vietnameseWordCount / words.length;
    
    // Consider Vietnamese if has diacritics OR high Vietnamese word ratio (>30%)
    return hasVietnameseChars || vietnameseWordRatio > 0.3;
}

/**
 * Detect language from text (basic detection)
 * Currently only supports Vietnamese detection
 * @param {string} text - Text to analyze
 * @returns {string} Detected language code ('vi' or 'unknown')
 */
function detectLanguage(text) {
    if (!text || text.trim().length === 0) return 'unknown';
    
    if (isVietnamese(text)) {
        return 'vi';
    }
    
    return 'unknown';
}

/**
 * Check if text should be translated based on target language
 * @param {string} text - Text to check
 * @param {string} targetLanguage - Target language code
 * @returns {boolean} True if translation is needed
 */
function needsTranslation(text, targetLanguage) {
    if (!text || text.trim().length === 0) return false;
    
    // If target is Vietnamese and text is already Vietnamese, skip translation
    if (targetLanguage === 'vi' && isVietnamese(text)) {
        return false;
    }
    
    // Other languages: always translate (can be enhanced later)
    return true;
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT FOR MULTIPLE MODULE SYSTEMS
// ═══════════════════════════════════════════════════════════════════

// CommonJS export (for require)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isVietnamese,
        detectLanguage,
        needsTranslation
    };
}

// Global window export (for scripts loaded via manifest)
if (typeof window !== 'undefined') {
    window.isVietnamese = isVietnamese;
    window.detectLanguage = detectLanguage;
    window.needsTranslation = needsTranslation;
}

// Note: ES6 exports removed - this file is loaded as regular script in manifest
// For HTML pages, use window.* directly or import from a wrapper module
