/**
 * Models Service (Extension)
 * Fetches available models from backend
 */

import { subscriptionAPIClient } from './subscription-api-client.js';

class ModelsService {
  constructor() {
    this.models = null;
    this.lastFetch = null;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize models service
   */
  async initialize() {
    await subscriptionAPIClient.ensureInitialized();
  }

  /**
   * Fetch models from backend
   * @param {string} tier - Optional tier override
   * @returns {Promise<Array>} Array of available models
   */
  async fetchModels(tier = null) {
    try {
      await this.initialize();
      
      const baseURL = subscriptionAPIClient.baseURL;
      const url = tier ? `${baseURL}/api/models?tier=${tier}` : `${baseURL}/api/models`;
      
      // Try to get auth token for better tier detection
      let headers = {};
      try {
        const token = await subscriptionAPIClient.getAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        // No auth, will get free tier models
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        this.models = data.models;
        this.categories = data.categories || {};
        this.defaultModel = data.defaultModel;
        this.recommendedModels = data.recommendedModels;
        this.tier = data.tier;
        this.lastFetch = Date.now();
        
        // Cache in local storage
        try {
          await chrome.storage.local.set({
            backendModels: data.models,
            backendCategories: data.categories || {},
            backendDefaultModel: data.defaultModel,
            backendRecommendedModels: data.recommendedModels,
            backendModelsTimestamp: Date.now()
          });
        } catch (error) {
          console.warn('[ModelsService] Failed to cache models:', error);
        }
        
        return data.models;
      } else {
        throw new Error(data.message || 'Failed to fetch models');
      }
    } catch (error) {
      console.error('[ModelsService] Error fetching models:', error);
      throw error;
    }
  }

  /**
   * Get available models (with caching)
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise<Array>} Array of available models
   */
  async getModels(forceRefresh = false) {
    // Check cache
    if (!forceRefresh && this.models && this.lastFetch) {
      const cacheAge = Date.now() - this.lastFetch;
      if (cacheAge < this.cacheTTL) {
        return this.models;
      }
    }

    // Try to load from local storage cache first
    if (!forceRefresh) {
      try {
        const cached = await chrome.storage.local.get([
          'backendModels',
          'backendCategories',
          'backendDefaultModel',
          'backendRecommendedModels',
          'backendModelsTimestamp'
        ]);
        
        if (cached.backendModels && cached.backendModelsTimestamp) {
          const cacheAge = Date.now() - cached.backendModelsTimestamp;
          if (cacheAge < this.cacheTTL) {
            this.models = cached.backendModels;
            this.categories = cached.backendCategories || {};
            this.defaultModel = cached.backendDefaultModel;
            this.recommendedModels = cached.backendRecommendedModels || [];
            this.lastFetch = cached.backendModelsTimestamp;
            return this.models;
          }
        }
      } catch (error) {
        console.warn('[ModelsService] Failed to load cached models:', error);
      }
    }

    // Fetch from backend
    return await this.fetchModels();
  }

  /**
   * Get models grouped by category
   * @returns {Promise<Object>} Models grouped by category
   */
  async getModelsByCategory() {
    if (!this.models) {
      await this.getModels();
    }
    
    const grouped = {};
    this.models.forEach(model => {
      const category = model.category || 'llm';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(model);
    });
    
    return grouped;
  }

  /**
   * Get categories
   * @returns {Promise<Object>} Categories object
   */
  async getCategories() {
    if (!this.models) {
      await this.getModels();
    }
    return this.categories || {};
  }

  /**
   * Get default model
   * @returns {Promise<string|null>} Default model ID (format: provider/modelId)
   */
  async getDefaultModel() {
    if (!this.models) {
      await this.getModels();
    }
    
    if (this.defaultModel) {
      // Format: provider/modelId
      const model = this.models.find(m => m.id === this.defaultModel);
      if (model) {
        return `${model.provider}/${model.id}`;
      }
      return this.defaultModel.includes('/') ? this.defaultModel : null;
    }
    
    // Fallback to first model
    if (this.models && this.models.length > 0) {
      const firstModel = this.models[0];
      return `${firstModel.provider}/${firstModel.id}`;
    }
    
    return null;
  }

  /**
   * Get recommended models
   * @returns {Promise<Array>} Recommended model IDs
   */
  async getRecommendedModels() {
    if (!this.models) {
      await this.getModels();
    }
    return this.recommendedModels || [];
  }

  /**
   * Get model by ID
   * @param {string} modelId - Model ID
   * @returns {Promise<Object|null>} Model object
   */
  async getModelById(modelId) {
    if (!this.models) {
      await this.getModels();
    }
    return this.models?.find(m => m.id === modelId) || null;
  }

  /**
   * Check if model is available for tier
   * @param {string} modelId - Model ID
   * @param {string} tier - Subscription tier
   * @returns {Promise<boolean>} True if available
   */
  async isModelAvailable(modelId, tier) {
    const model = await this.getModelById(modelId);
    if (!model) {
      return false;
    }

    const tierMap = {
      'free': ['free'],
      'pro': ['free', 'pro'],
      'premium': ['free', 'pro', 'premium']
    };

    const allowedTiers = tierMap[tier] || ['free'];
    return allowedTiers.includes(model.tier);
  }
}

// Export singleton instance
export const modelsService = new ModelsService();

