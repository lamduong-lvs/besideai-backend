/**
 * PDF Chat Configuration
 * 
 * Sử dụng Gemini API Key từ API Manager (apiConfigs.googleai)
 * User cần config Gemini trong Settings > Cấu hình chung > Google Gemini
 * 
 * Lấy default values từ setting/config/providers/googleai.js để tránh trùng lặp
 */

import { googleaiConfig } from '../../../setting/config/providers/googleai.js';

/**
 * Get default model from centralized config
 */
function getDefaultModel() {
  return googleaiConfig.defaultModel || 'gemini-1.5-flash';
}

/**
 * Get API endpoint from centralized config
 */
function getDefaultApiEndpoint() {
  const baseURL = googleaiConfig.defaultBaseURL || 'https://generativelanguage.googleapis.com/v1beta/models';
  // Remove /models suffix if present, as PDF Chat uses /v1beta directly
  return baseURL.replace(/\/models$/, '') || 'https://generativelanguage.googleapis.com/v1beta';
}

export const PDF_CHAT_CONFIG = {
  // Provider - CHỈ hỗ trợ Gemini
  provider: 'googleai',
  
  // Default model - lấy từ cấu hình tập trung (googleaiConfig)
  // Sử dụng getter để luôn lấy giá trị mới nhất
  get defaultModel() {
    return getDefaultModel();
  },
  
  // Limits - riêng cho PDF Chat
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxPages: 200,
  
  // API endpoint - lấy từ cấu hình tập trung (googleaiConfig)
  // Sử dụng getter để luôn lấy giá trị mới nhất
  get apiEndpoint() {
    return getDefaultApiEndpoint();
  },
  
  // Storage keys
  storageKeys: {
    selectedModel: 'pdfChat_selectedModel' // CHỈ LƯU MODEL, KHÔNG LƯU API KEY
  }
};

/**
 * Load config: Lấy API key từ Gemini config chung + model riêng cho PDF
 */
export async function loadPDFChatConfig() {
  try {
    const data = await chrome.storage.local.get([
      'apiConfigs',                              // API configs từ API Manager
      PDF_CHAT_CONFIG.storageKeys.selectedModel  // Model riêng cho PDF Chat
    ]);
    
    // Lấy Gemini config từ API Manager
    const geminiConfig = data.apiConfigs?.googleai || {};
    const apiKey = geminiConfig.apiKey || '';
    const availableModels = geminiConfig.models || [];
    
    // Lấy model đã chọn hoặc dùng default
    let selectedModel = data[PDF_CHAT_CONFIG.storageKeys.selectedModel];
    
    // Nếu chưa chọn, dùng model đầu tiên hoặc default từ config tập trung
    if (!selectedModel) {
      if (availableModels.length > 0) {
        selectedModel = availableModels[0].id;
      } else {
        // Lấy default từ config đã lưu hoặc từ googleaiConfig
        selectedModel = geminiConfig.currentModel || PDF_CHAT_CONFIG.defaultModel;
      }
    }
    
    return {
      apiKey: apiKey,
      model: selectedModel,
      availableModels: availableModels,
      hasApiKey: !!apiKey,
      hasModels: availableModels.length > 0
    };
  } catch (error) {
    console.error('[PDF Chat Config] Error loading config:', error);
    return {
      apiKey: '',
      model: PDF_CHAT_CONFIG.defaultModel,
      availableModels: [],
      hasApiKey: false,
      hasModels: false
    };
  }
}

/**
 * Get API endpoint from stored config or use default
 */
export function getApiEndpoint() {
  try {
    // Try to get from storage first (synchronous check)
    // Note: This is a fallback, actual endpoint should come from loadPDFChatConfig()
    return PDF_CHAT_CONFIG.apiEndpoint;
  } catch (error) {
    console.error('[PDF Chat Config] Error getting API endpoint:', error);
    return 'https://generativelanguage.googleapis.com/v1beta';
  }
}

/**
 * Save config: CHỈ lưu model (API key đã có rồi)
 */
export async function savePDFChatModel(model) {
  try {
    await chrome.storage.local.set({
      [PDF_CHAT_CONFIG.storageKeys.selectedModel]: model
    });
    console.log('[PDF Chat Config] Model saved:', model);
    return true;
  } catch (error) {
    console.error('[PDF Chat Config] Error saving model:', error);
    return false;
  }
}

/**
 * DEPRECATED: Use loadPDFChatConfig() instead
 * This function is kept for backward compatibility but may be removed in future versions
 * 
 * Get Gemini config from Settings (API Manager)
 * @deprecated Use loadPDFChatConfig() which provides more complete information
 */
export async function getGeminiConfig() {
  console.warn('[PDF Chat Config] getGeminiConfig() is deprecated. Use loadPDFChatConfig() instead.');
  const config = await loadPDFChatConfig();
  return {
    apiKey: config.apiKey,
    baseUrl: PDF_CHAT_CONFIG.apiEndpoint,
    hasConfig: config.hasApiKey
  };
}

