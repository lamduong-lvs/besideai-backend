/**
 * API Gateway
 * Unified gateway - ALL AI calls go through Backend
 * No local calls, no fallback, no mode system
 * Supports: Free, Professional, Premium tiers
 */

import { subscriptionManager } from '../subscription/subscription-manager.js';
import { limitsEnforcer, LimitExceededError } from '../subscription/limits-enforcer.js';
import { subscriptionAPIClient } from '../subscription/subscription-api-client.js';
import { BackendAPIHandler } from './backend-api-handler.js';
import { SUBSCRIPTION_TIERS } from '../subscription/subscription-config.js';

class APIGateway {
  constructor() {
    // Lazy initialize handler to avoid issues during service worker registration
    this._backendHandler = null;
    this.initialized = false;
  }

  get backendHandler() {
    if (!this._backendHandler) {
      this._backendHandler = new BackendAPIHandler();
    }
    return this._backendHandler;
  }

  /**
   * Initialize API Gateway
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    await subscriptionManager.ensureInitialized();
    await limitsEnforcer.ensureInitialized();

    // Initialize backend handler (only handler needed)
    await this.backendHandler.initialize();

    this.initialized = true;
    console.log('[APIGateway] Initialized - All AI calls go through Backend');
  }

  /**
   * Make API call
   * ALL calls go through Backend - no local calls, no fallback
   * @param {Array} messages - Messages array
   * @param {Object} options - API options
   * @param {Function} options.streamCallback - Streaming callback function
   * @returns {Promise<Object>} API response
   */
  async call(messages, options = {}) {
    await this.ensureInitialized();

    // 1. Check limits locally (for UI feedback, backend will also check)
    // Note: Feature check is disabled temporarily - backend will handle all checks
    const modelToCheck = options.model || (options.models && options.models[0]) || null;
    try {
      const canMake = await limitsEnforcer.canMakeRequest({
        provider: options.providerId,
        model: modelToCheck,
        estimatedTokens: options.estimatedTokens
        // Feature check disabled - backend will handle feature availability
        // feature: options.feature
      });

      if (!canMake.allowed) {
        // Only block if it's a hard limit (token/request limits)
        // Don't block for feature_not_available - let backend handle it
        if (canMake.reason === 'feature_not_available') {
          // Skip feature check - backend will handle
          console.log('[APIGateway] Feature check skipped, backend will handle');
        } else {
          // Show upgrade prompt if needed
          if (canMake.upgradePrompt) {
            await this.showUpgradePrompt(canMake);
          }

          // Throw error for hard limits (token/request limits)
          throw new LimitExceededError(
            canMake.reason,
            canMake.current,
            canMake.limit,
            canMake.reason
          );
        }
      }
    } catch (error) {
      // Re-throw limit errors (except feature_not_available)
      if (error instanceof LimitExceededError) {
        if (error.reason === 'feature_not_available') {
          // Skip - backend will handle
          console.log('[APIGateway] Feature check error skipped, backend will handle');
        } else {
          throw error;
        }
      }
      // For other errors, continue (backend will handle)
    }

    // 2. ALL calls go through Backend - no exceptions (Single mode only)
    // Backend will handle tier-based limits, model access, etc.
    try {
      return await this.backendHandler.call(messages, options);
    } catch (error) {
      // Handle errors from backend
      if (error instanceof LimitExceededError) {
        throw error; // Re-throw limit errors
      }

      // Handle backend errors with better context
      if (error.code === 'model_not_available' || error.message?.includes('model_not_available')) {
        const limitError = new LimitExceededError(
          'model_not_available',
          0,
          0,
          error.message || 'Model not available for your subscription tier'
        );
        throw limitError;
      }

      // Handle feature_not_available from backend
      if (error.code === 'feature_not_available' || error.message?.includes('feature_not_available')) {
        const limitError = new LimitExceededError(
          'feature_not_available',
          0,
          0,
          error.message || 'Feature not available for your subscription tier'
        );
        throw limitError;
      }

      // Backend errors - no fallback, just throw
      // Error message should be clear from backend
      throw error;
    }
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
   * Show upgrade prompt
   * Only works in panel/content context (not in service worker)
   * In service worker, this is a no-op
   */
  async showUpgradePrompt(checkResult) {
    // Service worker context - can't show UI prompts
    // Upgrade prompts will be shown from panel/content script context instead
    if (typeof document === 'undefined') {
      return;
    }

    // Only try to show in DOM contexts (panel, content scripts)
    // Use window.upgradePrompts if available (set by panel)
    if (typeof window !== 'undefined' && window.upgradePrompts) {
      try {
        await window.upgradePrompts.show(checkResult.reason, {
          current: checkResult.current,
          limit: checkResult.limit,
          requiredTier: checkResult.requiredTier,
          featureName: checkResult.featureName
        });
      } catch (error) {
        console.warn('[APIGateway] Failed to show upgrade prompt:', error);
      }
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

// Export class only - don't create instance at top-level
export { APIGateway };

// Export getter function that creates instance on first call (lazy)
let apiGatewayInstance = null;
export function getApiGateway() {
  if (!apiGatewayInstance) {
    apiGatewayInstance = new APIGateway();
  }
  return apiGatewayInstance;
}

// Don't export apiGateway object at top-level to avoid instantiation issues
// It will be created when getApiGateway() is called

