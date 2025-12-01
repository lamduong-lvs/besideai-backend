/**
 * Paid API Handler
 * Handles API calls for paid tier users (via backend server)
 */

import { subscriptionAPIClient } from '../subscription/subscription-api-client.js';
import { usageTracker } from '../subscription/usage-tracker.js';
import { subscriptionManager } from '../subscription/subscription-manager.js';

class PaidAPIHandler {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize handler
   */
  async initialize() {
    await subscriptionAPIClient.ensureInitialized();
    this.initialized = true;
  }

  /**
   * Make API call for paid tier
   * @param {Array} messages - Messages array
   * @param {Object} options - API options
   * @returns {Promise<Object>} API response
   */
  async call(messages, options = {}) {
    await this.ensureInitialized();

    // Get auth token
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required for paid tier');
    }

    // Get backend URL
    const backendUrl = await this.getBackendURL();

    // Make request to backend
    const response = await this.callBackendAPI(backendUrl, token, messages, options);

    // Track usage locally
    await usageTracker.trackCall({
      provider: response.providerId,
      model: response.modelId,
      tokens: response.tokens || { input: 0, output: 0, total: 0 },
      metadata: {
        feature: options.feature,
        tier: await subscriptionManager.getTier(),
        success: true
      }
    });

    // Sync usage to backend (async, don't wait)
    usageTracker.syncToBackend().catch(err => {
      console.error('[PaidAPIHandler] Failed to sync usage:', err);
    });

    return response;
  }

  /**
   * Get auth token
   */
  async getAuthToken() {
    try {
      // Get from chrome.identity (works in service worker)
      return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      });
    } catch (error) {
      console.error('[PaidAPIHandler] Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Get backend URL
   */
  async getBackendURL() {
    try {
      const data = await chrome.storage.local.get(['backend_config']);
      return data.backend_config?.url || 'https://besideai.work';
    } catch (error) {
      return 'https://besideai.work';
    }
  }

  /**
   * Call backend API
   */
  async callBackendAPI(backendUrl, token, messages, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds

    try {
      // Extract model ID from options (could be fullModelId like "openai/gpt-4o" or just "gpt-4o")
      let modelId = options.model || options.modelId;
      if (modelId && modelId.includes('/')) {
        // Extract just the model ID part
        modelId = modelId.split('/').pop();
      }

      // Handle streaming
      if (options.stream === true && options.streamCallback) {
        return await this.callBackendAPIStream(backendUrl, token, messages, {
          ...options,
          model: modelId
        }, options.streamCallback);
      }

      const response = await fetch(`${backendUrl}/api/ai/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          options: {
            temperature: options.temperature || 0.7,
            maxTokens: options.maxTokens || 2000,
            stream: false
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          // Auth expired, try to refresh
          await this.refreshAuth();
          // Retry once
          return this.callBackendAPI(backendUrl, token, messages, options);
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API call failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        content: data.content || '',
        providerId: data.provider || 'unknown',
        modelId: data.model || modelId,
        fullModelId: `${data.provider || 'unknown'}/${data.model || modelId}`,
        tokens: data.tokens || { input: 0, output: 0, total: 0 },
        streamed: false
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Call backend API with streaming
   */
  async callBackendAPIStream(backendUrl, token, messages, options, streamCallback) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds for streaming

    try {
      let modelId = options.model || options.modelId;
      if (modelId && modelId.includes('/')) {
        modelId = modelId.split('/').pop();
      }

      const response = await fetch(`${backendUrl}/api/ai/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          options: {
            temperature: options.temperature || 0.7,
            maxTokens: options.maxTokens || 2000,
            stream: true
          }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API call failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let tokens = { input: 0, output: 0, total: 0 };
      let model = modelId;
      let provider = 'unknown';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const json = JSON.parse(data);
                
                if (json.type === 'chunk' && json.content) {
                  fullContent += json.content;
                  if (streamCallback) {
                    streamCallback(json.content);
                  }
                } else if (json.type === 'done') {
                  tokens = json.tokens || tokens;
                  model = json.model || model;
                  provider = json.provider || provider;
                } else if (json.type === 'error') {
                  throw new Error(json.error || 'Streaming error');
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        clearTimeout(timeoutId);
      }

      return {
        content: fullContent,
        providerId: provider,
        modelId: model,
        fullModelId: `${provider}/${model}`,
        tokens: tokens,
        streamed: true
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Refresh authentication
   */
  async refreshAuth() {
    try {
      // Try to refresh via chrome.identity
      return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error('Authentication expired. Please login again.'));
          } else {
            resolve(token);
          }
        });
      });
    } catch (error) {
      console.error('[PaidAPIHandler] Failed to refresh auth:', error);
      throw new Error('Authentication expired. Please login again.');
    }
  }

  /**
   * Ensure initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export class
export { PaidAPIHandler };

