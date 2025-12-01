// Re-export from common config for backward compatibility
// Since translation-languages.js is loaded as regular script in manifest, access from window

// Access from window (if loaded via manifest)
// These will be available immediately if translation-languages.js is loaded before this file
const TRANSLATION_LANGUAGES = typeof window !== 'undefined' ? window.TRANSLATION_LANGUAGES : null;
const getLanguageLabel = typeof window !== 'undefined' ? window.getLanguageLabel : null;
const isSupportedLanguage = typeof window !== 'undefined' ? window.isSupportedLanguage : null;
const getDefaultTargetLanguage = typeof window !== 'undefined' ? window.getDefaultTargetLanguage : null;
const getTargetLanguageForFeature = typeof window !== 'undefined' ? window.getTargetLanguageForFeature : null;
const saveTargetLanguageForFeature = typeof window !== 'undefined' ? window.saveTargetLanguageForFeature : null;

// Export for ES modules
// Note: If these are null, the importing file should wait or use window directly
export { 
  TRANSLATION_LANGUAGES, 
  getLanguageLabel,
  isSupportedLanguage,
  getDefaultTargetLanguage,
  getTargetLanguageForFeature,
  saveTargetLanguageForFeature
};

