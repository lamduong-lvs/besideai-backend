/**
 * Free API Handler
 * Handles API calls for free tier users
 */

import { usageTracker } from '../subscription/usage-tracker.js';
import { subscriptionManager } from '../subscription/subscription-manager.js';
// Don't import upgradePrompts here - it uses DOM APIs not available in service worker
import { apiManager } from '../../utils/api.js';

class FreeAPIHandler {
  constructor() {
    this.apiKeys = null; // Will be loaded from your backend/config
    this.apiManager = apiManager;
  }

  /**
   * Initialize handler
   */
  async initialize() {
    // Load API keys for free tier (your API keys)
    // These should be configured in your backend or environment
    // For now, we'll use a placeholder
    this.apiKeys = {
      openai: null, // TODO: Add your OpenAI API key
      googleai: null, // TODO: Add your Google AI API key
      cerebras: null // Cerebras is free, no key needed
    };
  }

  /**
   * Make API call for free tier
   * @param {Array} messages - Messages array
   * @param {Object} options - API options
   * @returns {Promise<Object>} API response
   */
  async call(messages, options = {}) {
    await this.ensureInitialized();

    // Force basic models only
    const model = this.ensureBasicModel(options.model || options.providerId);

    // Make API call using your API keys
    const response = await this.callAPI(messages, {
      ...options,
      model: model,
      providerId: this.getProviderFromModel(model)
    });

    // Track usage
    await usageTracker.trackCall({
      provider: response.providerId,
      model: response.modelId,
      tokens: response.tokens || { input: 0, output: 0, total: 0 },
      metadata: {
        feature: options.feature,
        tier: 'free',
        success: true
      }
    });

    // Show upgrade prompt if near limit
    const usage = await usageTracker.getTodayUsage();
    if (usage.requests >= 8) { // 80% of limit (8/10)
      await this.showNearLimitPrompt();
    }

    return response;
  }

  /**
   * Ensure model is basic (free tier only)
   * @param {string} model - Model ID
   * @returns {string} Basic model ID
   */
  ensureBasicModel(model) {
    const allowedModels = [
      'gpt-3.5-turbo',
      'gemini-1.5-flash',
      'llama-4-scout-17b-16e-instruct'
    ];

    // Check if model is in allowed list
    if (model && allowedModels.some(allowed => model.includes(allowed))) {
      return model;
    }

    // Default to cheapest model
    return 'gpt-3.5-turbo';
  }

  /**
   * Get provider from model ID
   */
  getProviderFromModel(model) {
    if (model.includes('gpt') || model.includes('openai')) {
      return 'openai';
    }
    if (model.includes('gemini') || model.includes('google')) {
      return 'googleai';
    }
    if (model.includes('claude') || model.includes('anthropic')) {
      return 'anthropic';
    }
    if (model.includes('llama') || model.includes('cerebras')) {
      return 'cerebras';
    }
    return 'openai'; // Default
  }

  /**
   * Make actual API call
   * This will use your API keys to call the AI providers
   */
  async callAPI(messages, options) {
    const providerId = options.providerId || 'openai';
    const model = options.model || 'gpt-3.5-turbo';

    // Ensure API manager is loaded
    await this.apiManager.loadFromStorage();

    // Temporarily set API keys for this call
    const originalConfig = this.apiManager.getProvider(providerId);
    const tempConfig = {
      ...originalConfig,
      apiKey: this.apiKeys[providerId] || originalConfig?.apiKey
    };

    this.apiManager.updateConfig(providerId, tempConfig);

    try {
      const response = await this.apiManager.sendMessage(messages, {
        providerId: providerId,
        model: model,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
        stream: options.stream || false
      });

      // Parse response to get tokens (if available)
      const tokens = this.extractTokensFromResponse(response, messages);

      return {
        content: response.content || response.text || '',
        providerId: providerId,
        modelId: model,
        fullModelId: `${providerId}/${model}`,
        tokens: tokens,
        streamed: response.streamed || false
      };
    } finally {
      // Restore original config
      if (originalConfig) {
        this.apiManager.updateConfig(providerId, originalConfig);
      }
    }

    // Fallback: direct API call
    return await this.directAPICall(providerId, model, messages, options);
  }

  /**
   * Direct API call (fallback)
   */
  async directAPICall(providerId, model, messages, options) {
    const apiKey = this.apiKeys[providerId];
    if (!apiKey && providerId !== 'cerebras') {
      throw new Error(`API key not configured for ${providerId}`);
    }

    let url, headers, body;

    switch (providerId) {
      case 'openai':
        url = 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        };
        body = {
          model: model,
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000
        };
        break;

      case 'googleai':
        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        headers = {
          'Content-Type': 'application/json'
        };
        body = {
          contents: messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })),
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2000
          }
        };
        break;

      default:
        throw new Error(`Provider ${providerId} not supported in free tier`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API call failed: ${response.status}`);
    }

    const data = await response.json();
    const tokens = this.extractTokensFromResponse(data, messages, providerId);

    return {
      content: this.extractContent(data, providerId),
      providerId: providerId,
      modelId: model,
      fullModelId: `${providerId}/${model}`,
      tokens: tokens,
      streamed: false
    };
  }

  /**
   * Extract content from API response
   */
  extractContent(data, providerId) {
    switch (providerId) {
      case 'openai':
        return data.choices?.[0]?.message?.content || '';
      case 'googleai':
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      default:
        return '';
    }
  }

  /**
   * Extract tokens from response
   */
  extractTokensFromResponse(response, messages, providerId) {
    // Try to get from response
    if (response.usage) {
      return {
        input: response.usage.prompt_tokens || response.usage.input_tokens || 0,
        output: response.usage.completion_tokens || response.usage.output_tokens || 0,
        total: response.usage.total_tokens || 0
      };
    }

    // Estimate tokens (rough estimate: 1 token ≈ 4 characters)
    const inputText = messages.map(m => m.content).join(' ');
    const outputText = response.content || response.text || '';
    
    return {
      input: Math.ceil(inputText.length / 4),
      output: Math.ceil(outputText.length / 4),
      total: Math.ceil((inputText.length + outputText.length) / 4)
    };
  }

  /**
   * Show near limit prompt
   * Only works in panel/content context (not in service worker)
   * In service worker, this is a no-op
   */
  async showNearLimitPrompt() {
    // Service worker context - can't show UI prompts
    if (typeof document === 'undefined') {
      return;
    }

    // Only try to show in DOM contexts (panel, content scripts)
    // Use window.upgradePrompts if available (set by panel)
    if (typeof window !== 'undefined' && window.upgradePrompts) {
      try {
        await window.upgradePrompts.show('near_limit', {
          current: 8,
          limit: 10,
          type: 'requests'
        });
      } catch (error) {
        console.warn('[FreeAPIHandler] Failed to show upgrade prompt:', error);
      }
    }
  }

  /**
   * Ensure initialized
   */
  async ensureInitialized() {
    if (!this.apiKeys) {
      await this.initialize();
    }
  }
}

// Export class
export { FreeAPIHandler };

