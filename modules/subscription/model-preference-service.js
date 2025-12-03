/**
 * Model Preference Service
 * Manages user's preferred model selection
 * Syncs with Backend and local storage
 */

import { subscriptionAPIClient } from './subscription-api-client.js';
import { modelsService } from './models-service.js';

class ModelPreferenceService {
  constructor() {
    this.preferredModel = null;
    this.lastSync = null;
  }

  /**
   * Initialize service
   */
  async initialize() {
    await subscriptionAPIClient.ensureInitialized();
    await modelsService.initialize();
  }

  /**
   * Get user's preferred model
   * Priority: Local storage > Backend > Default from Backend
   * @returns {Promise<string|null>} Preferred model ID
   */
  async getPreferredModel() {
    try {
      await this.initialize();

      // 1. Check local storage first
      const local = await chrome.storage.local.get(['selectedModel']);
      if (local.selectedModel) {
        this.preferredModel = local.selectedModel;
        return local.selectedModel;
      }

      // 2. Try to get from Backend
      try {
        const backendModel = await this.getFromBackend();
        if (backendModel) {
          await chrome.storage.local.set({ selectedModel: backendModel });
          this.preferredModel = backendModel;
          return backendModel;
        }
      } catch (error) {
        console.warn('[ModelPreferenceService] Failed to get from Backend:', error);
      }

      // 3. Get default from Backend
      const defaultModel = await modelsService.getDefaultModel();
      if (defaultModel) {
        await chrome.storage.local.set({ selectedModel: defaultModel });
        this.preferredModel = defaultModel;
        return defaultModel;
      }

      return null;
    } catch (error) {
      console.error('[ModelPreferenceService] Error getting preferred model:', error);
      return null;
    }
  }

  /**
   * Set user's preferred model
   * Saves to local storage and syncs to Backend
   * @param {string} modelId - Model ID
   * @returns {Promise<void>}
   */
  async setPreferredModel(modelId) {
    try {
      await this.initialize();

      // Validate model exists
      const model = await modelsService.getModelById(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      // Save to local storage
      await chrome.storage.local.set({ selectedModel: modelId });
      this.preferredModel = modelId;

      // Sync to Backend (async, don't wait)
      this.saveToBackend(modelId).catch(error => {
        console.warn('[ModelPreferenceService] Failed to sync to Backend:', error);
      });

      return modelId;
    } catch (error) {
      console.error('[ModelPreferenceService] Error setting preferred model:', error);
      throw error;
    }
  }

  /**
   * Get preferred model from Backend
   * @returns {Promise<string|null>} Model ID or null
   */
  async getFromBackend() {
    try {
      const response = await subscriptionAPIClient.request('/api/models/preference');
      if (response.success && response.preferredModel) {
        return response.preferredModel;
      }
      return null;
    } catch (error) {
      // 401 or other errors - return null (will use default)
      if (error.message?.includes('Authentication')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Save preferred model to Backend
   * @param {string} modelId - Model ID
   * @returns {Promise<void>}
   */
  async saveToBackend(modelId) {
    try {
      await subscriptionAPIClient.request('/api/models/preference', {
        method: 'POST',
        body: JSON.stringify({ modelId })
      });
      this.lastSync = Date.now();
    } catch (error) {
      // Don't throw - local storage is saved, Backend sync is optional
      console.warn('[ModelPreferenceService] Failed to save to Backend:', error);
    }
  }

  /**
   * Clear preferred model
   * @returns {Promise<void>}
   */
  async clearPreferredModel() {
    await chrome.storage.local.remove(['selectedModel']);
    this.preferredModel = null;
  }
}

// Export singleton instance
export const modelPreferenceService = new ModelPreferenceService();

