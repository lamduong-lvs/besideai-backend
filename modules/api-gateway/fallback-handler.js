/**
 * Fallback Handler
 * Handles fallback when server is unavailable
 */

import { FreeAPIHandler } from './free-api-handler.js';
import { BYOKAPIHandler } from './byok-api-handler.js';
import { subscriptionManager } from '../subscription/subscription-manager.js';
import { subscriptionAPIClient } from '../subscription/subscription-api-client.js';

class FallbackHandler {
  constructor() {
    this.fallbackMode = null;
    this.lastFallbackTime = null;
    this.fallbackCooldown = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check if should fallback
   * @param {Error} error - Error from server
   * @returns {boolean}
   */
  shouldFallback(error) {
    // Check if error indicates server unavailable
    if (error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('503') ||
        error.message.includes('502') ||
        error.message.includes('504')) {
      return true;
    }

    return false;
  }

  /**
   * Handle fallback
   * @param {Array} messages - Messages array
   * @param {Object} options - API options
   * @param {Error} error - Original error
   * @returns {Promise<Object>} API response
   */
  async fallback(messages, options, error) {
    if (!this.shouldFallback(error)) {
      throw error; // Don't fallback, rethrow error
    }

    console.warn('[FallbackHandler] Server unavailable, falling back to local mode');

    // Determine fallback mode
    const fallbackMode = await this.determineFallbackMode();

    // Show notification to user
    this.showFallbackNotification(fallbackMode);

    // Use appropriate handler
    let handler;
    if (fallbackMode === 'byok') {
      handler = new BYOKAPIHandler();
    } else {
      handler = new FreeAPIHandler();
    }

    await handler.initialize();

    try {
      const response = await handler.call(messages, options);
      
      // Cache fallback decision
      this.fallbackMode = fallbackMode;
      this.lastFallbackTime = Date.now();

      return response;
    } catch (fallbackError) {
      console.error('[FallbackHandler] Fallback also failed:', fallbackError);
      throw new Error('Both server and fallback failed. Please check your connection.');
    }
  }

  /**
   * Determine fallback mode
   */
  async determineFallbackMode() {
    // Check if user has API keys (BYOK)
    const hasApiKeys = await subscriptionManager.checkApiKeys?.() || false;
    
    if (hasApiKeys) {
      return 'byok';
    }

    // Default to free tier
    return 'free';
  }

  /**
   * Show fallback notification
   */
  showFallbackNotification(mode) {
    const message = mode === 'byok' 
      ? 'Server unavailable. Using your API keys.'
      : 'Server unavailable. Using free tier mode.';

    // Show notification
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
        title: 'AI Chat Assistant',
        message: message
      });
    }

    // Also log
    console.log('[FallbackHandler]', message);
  }

  /**
   * Check if backend is available
   * @returns {Promise<boolean>}
   */
  async isBackendAvailable() {
    try {
      return await subscriptionAPIClient.isBackendAvailable();
    } catch (error) {
      return false;
    }
  }

  /**
   * Reset fallback state
   */
  reset() {
    this.fallbackMode = null;
    this.lastFallbackTime = null;
  }
}

// Export class
export { FallbackHandler };

