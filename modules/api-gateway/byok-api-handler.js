/**
 * BYOK (Bring Your Own Key) API Handler
 * Handles API calls using user's own API keys
 */

import { usageTracker } from '../subscription/usage-tracker.js';
import { apiManager } from '../../utils/api.js';

class BYOKAPIHandler {
  constructor() {
    this.apiManager = apiManager;
  }

  /**
   * Initialize handler
   */
  async initialize() {
    // Load API manager from storage
    await this.apiManager.loadFromStorage();
  }

  /**
   * Make API call using user's API keys
   * @param {Array} messages - Messages array
   * @param {Object} options - API options
   * @returns {Promise<Object>} API response
   */
  async call(messages, options = {}) {
    await this.ensureInitialized();

    const providerId = options.providerId || 'openai';
    const model = options.model || 'gpt-4';

    // Check if user has API key for this provider
    const config = this.apiManager.getProvider(providerId);
    if (!config || !config.apiKey) {
      // Check if Cerebras (free, no key needed)
      if (providerId.toLowerCase() === 'cerebras') {
        // OK, continue
      } else {
        throw new Error(`API key not configured for ${providerId}. Please add your API key in settings.`);
      }
    }

    // Make API call using user's API keys
    const response = await this.apiManager.sendMessage(messages, {
      providerId: providerId,
      model: model,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2000,
      stream: options.stream || false
    });

    // Track usage (optional, for user's own reference)
    // User pays for their own API, so we just track for analytics
    await usageTracker.trackCall({
      provider: providerId,
      model: model,
      tokens: this.extractTokens(response),
      metadata: {
        feature: options.feature,
        tier: 'byok',
        success: true
      }
    });

    return {
      content: response.content || response.text || '',
      providerId: providerId,
      modelId: model,
      fullModelId: `${providerId}/${model}`,
      tokens: this.extractTokens(response),
      streamed: response.streamed || false
    };
  }

  /**
   * Extract tokens from response
   */
  extractTokens(response) {
    if (response.usage) {
      return {
        input: response.usage.prompt_tokens || response.usage.input_tokens || 0,
        output: response.usage.completion_tokens || response.usage.output_tokens || 0,
        total: response.usage.total_tokens || 0
      };
    }

    // Estimate if not available
    const inputText = Array.isArray(response.messages) 
      ? response.messages.map(m => m.content).join(' ')
      : '';
    const outputText = response.content || response.text || '';
    
    return {
      input: Math.ceil(inputText.length / 4),
      output: Math.ceil(outputText.length / 4),
      total: Math.ceil((inputText.length + outputText.length) / 4)
    };
  }

  /**
   * Ensure initialized
   */
  async ensureInitialized() {
    if (!this.apiManager) {
      await this.initialize();
    }
  }
}

// Export class
export { BYOKAPIHandler };

