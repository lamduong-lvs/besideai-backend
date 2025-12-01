// model.js
// Model name display utilities

// Import from panel-utils wrapper for consistent imports
import { apiManager } from './panel-utils.js';

export async function updateDefaultModelName() {
  try {
    const configResponse = await chrome.runtime.sendMessage({ 
      action: 'getAIConfig' 
    });
    if (!configResponse || !configResponse.success || !configResponse.config) {
      // Update input module with default value
      await updateModelNameDisplay(null);
      return;
    }
    const { config } = configResponse;
    if (config.isRaceMode && config.models && config.models.length > 0) {
      // In race mode, show first model initially
      const firstModel = config.models[0];
      await updateModelNameDisplay(firstModel);
    } else if (config.models && config.models.length > 0) {
      // In single mode, show the default model
      const defaultModel = config.models[0];
      await updateModelNameDisplay(defaultModel);
    } else {
      // No models configured
      await updateModelNameDisplay(null);
    }
  } catch (error) {
    console.error('[Panel] Failed to update default model name:', error);
    await updateModelNameDisplay(null);
  }
}

export async function updateModelNameDisplay(fullModelId, inputType = null) {
  let displayName = '...';
  
  // PDF Chat có model riêng, cần load từ pdfChat_selectedModel
  if (inputType === 'pdfChat') {
    try {
      const { loadPDFChatConfig } = await import('../../pdf-chat/config/pdf-chat-config.js');
      const pdfConfig = await loadPDFChatConfig();
      const modelId = pdfConfig.model;
      
      // Lấy display name từ Gemini models
      await apiManager.loadFromStorage();
      const geminiConfig = apiManager.getProvider('googleai');
      if (geminiConfig && geminiConfig.models) {
        const modelInfo = geminiConfig.models.find(m => m.id === modelId);
        if (modelInfo && modelInfo.displayName) {
          displayName = modelInfo.displayName;
        } else {
          displayName = modelId;
        }
      } else {
        displayName = modelId;
      }
    } catch (error) {
      console.error('[Panel] Failed to load PDF Chat model:', error);
      displayName = '...';
    }
  } else if (fullModelId) {
    // Chat và các input types khác dùng fullModelId
    try {
      await apiManager.loadFromStorage();
      const separatorIndex = fullModelId.indexOf('/');
      if (separatorIndex === -1) {
        displayName = fullModelId;
      } else {
        const providerId = fullModelId.substring(0, separatorIndex);
        const modelId = fullModelId.substring(separatorIndex + 1);
        const providerConfig = apiManager.getProvider(providerId);
        if (providerConfig) {
          const modelInfo = providerConfig.models.find(m => m.id === modelId);
          if (modelInfo && modelInfo.displayName) {
            displayName = modelInfo.displayName;
          } else {
            displayName = modelId;
          }
        } else {
          displayName = modelId;
        }
      }
    } catch (error) {
      console.error('[Panel] Failed to update model name:', error);
      displayName = fullModelId.split('/').pop() || fullModelId;
    }
  }
  
  // Update old model name element (if exists) - for backward compatibility
  const modelNameEl = document.getElementById('modelName');
  if (modelNameEl) {
    modelNameEl.textContent = displayName;
  }
  
  // Update model name for all input types that have toolbar
  try {
    console.log('[Panel] Updating model name display:', displayName, 'for input type:', inputType || 'all');
    
    // Update model name từ module input mới
    const inputManager = window.inputManager;
    if (!inputManager) {
      console.warn('[Panel] InputManager not found, cannot update model name');
      return;
    }
    
    const inputTypes = [
      { containerId: 'chat-input-container', name: 'chat' },
      { containerId: 'pdf-chat-input-container', name: 'pdfChat' },
      { containerId: 'gmail-input-container', name: 'gmail' }
    ];
    
    inputTypes.forEach(({ containerId, name }) => {
      try {
        // Nếu chỉ update cho một input type cụ thể, skip các type khác
        if (inputType && inputType !== name) {
          return;
        }
        
        // Khi inputType === null (update tất cả), skip PDF Chat vì nó có model riêng
        if (!inputType && name === 'pdfChat') {
          return;
        }
        
        const input = inputManager.get(containerId);
        if (input && typeof input.updateModelName === 'function') {
          input.updateModelName(displayName);
        }
      } catch (error) {
        console.warn(`[Panel] Failed to update model name for ${name} input:`, error);
      }
    });
  } catch (error) {
    console.error('[Panel] Failed to update input module model name:', error);
  }
}

