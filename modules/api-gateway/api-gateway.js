/**
 * API Gateway
 * Main gateway that routes requests to appropriate handlers based on subscription tier
 */

import { subscriptionManager } from '../subscription/subscription-manager.js';
import { limitsEnforcer, LimitExceededError } from '../subscription/limits-enforcer.js';
import { subscriptionAPIClient } from '../subscription/subscription-api-client.js';
// Don't import upgradePrompts here - it uses DOM APIs not available in service worker
// Will be loaded dynamically when needed (only in panel/content context)
import { FreeAPIHandler } from './free-api-handler.js';
import { PaidAPIHandler } from './paid-api-handler.js';
import { BYOKAPIHandler } from './byok-api-handler.js';
import { FallbackHandler } from './fallback-handler.js';
import { SUBSCRIPTION_TIERS } from '../subscription/subscription-config.js';

class APIGateway {
  constructor() {
    // Lazy initialize handlers to avoid issues during service worker registration
    this._freeHandler = null;
    this._paidHandler = null;
    this._byokHandler = null;
    this._fallbackHandler = null;
    this.mode = 'auto'; // 'auto' | 'local' | 'server'
    this.initialized = false;
  }

  get freeHandler() {
    if (!this._freeHandler) {
      this._freeHandler = new FreeAPIHandler();
    }
    return this._freeHandler;
  }

  get paidHandler() {
    if (!this._paidHandler) {
      this._paidHandler = new PaidAPIHandler();
    }
    return this._paidHandler;
  }

  get byokHandler() {
    if (!this._byokHandler) {
      this._byokHandler = new BYOKAPIHandler();
    }
    return this._byokHandler;
  }

  get fallbackHandler() {
    if (!this._fallbackHandler) {
      this._fallbackHandler = new FallbackHandler();
    }
    return this._fallbackHandler;
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

    // Load mode from storage
    await this.loadMode();

    // Initialize handlers
    await this.freeHandler.initialize();
    await this.paidHandler.initialize();
    await this.byokHandler.initialize();

    this.initialized = true;
    console.log('[APIGateway] Initialized with mode:', this.mode);
  }

  /**
   * Make API call
   * @param {Array} messages - Messages array
   * @param {Object} options - API options
   * @param {Array<string>} options.models - Array of model IDs for race mode
   * @param {boolean} options.isRaceMode - Whether to use race mode
   * @param {Function} options.streamCallback - Streaming callback function
   * @returns {Promise<Object>} API response
   */
  async call(messages, options = {}) {
    await this.ensureInitialized();

    // 1. Detect tier
    const tier = await subscriptionManager.getTier();

    // 2. Check limits before making request
    const modelToCheck = options.model || (options.models && options.models[0]) || null;
    const canMake = await limitsEnforcer.canMakeRequest({
      provider: options.providerId,
      model: modelToCheck,
      estimatedTokens: options.estimatedTokens,
      feature: options.feature
    });

    if (!canMake.allowed) {
      // Show upgrade prompt if needed
      if (canMake.upgradePrompt) {
        await this.showUpgradePrompt(canMake);
      }

      // Throw error
      throw new LimitExceededError(
        canMake.reason,
        canMake.current,
        canMake.limit,
        canMake.reason
      );
    }

    // 3. Handle race mode
    if (options.isRaceMode && options.models && options.models.length >= 2) {
      return await this.callRaceMode(messages, options);
    }

    // 4. Route to appropriate handler for single model
    try {
      switch (tier) {
        case SUBSCRIPTION_TIERS.FREE:
          return await this.freeHandler.call(messages, options);

        case SUBSCRIPTION_TIERS.PROFESSIONAL:
        case SUBSCRIPTION_TIERS.PREMIUM:
          // Check mode
          const mode = await this.getMode();
          if (mode === 'local' || mode === 'auto') {
            // Try server first, fallback to local if needed
            try {
              return await this.paidHandler.call(messages, options);
            } catch (error) {
              if (this.fallbackHandler.shouldFallback(error)) {
                return await this.fallbackHandler.fallback(messages, options, error);
              }
              throw error;
            }
          } else {
            // Server mode only
            return await this.paidHandler.call(messages, options);
          }

        case SUBSCRIPTION_TIERS.BYOK:
          return await this.byokHandler.call(messages, options);

        default:
          // Default to free
          return await this.freeHandler.call(messages, options);
      }
    } catch (error) {
      // Handle errors
      if (error instanceof LimitExceededError) {
        throw error; // Re-throw limit errors
      }

      // For paid tier, try fallback if server error
      const tier = await subscriptionManager.getTier();
      if ((tier === SUBSCRIPTION_TIERS.PROFESSIONAL || tier === SUBSCRIPTION_TIERS.PREMIUM) &&
          this.fallbackHandler.shouldFallback(error)) {
        return await this.fallbackHandler.fallback(messages, options, error);
      }

      throw error;
    }
  }

  /**
   * Call in race mode (multiple models)
   * @param {Array} messages - Messages array
   * @param {Object} options - API options
   * @returns {Promise<Object>} Winner result
   */
  async callRaceMode(messages, options) {
    const { models } = options;
    const tier = await subscriptionManager.getTier();

    // Race mode only available for BYOK or paid tiers
    if (tier === SUBSCRIPTION_TIERS.FREE) {
      throw new Error('Race mode is not available for free tier');
    }

    // Use BYOK handler for race mode (uses user's API keys)
    if (tier === SUBSCRIPTION_TIERS.BYOK) {
      // Race mode with BYOK - call all models in parallel
      const promises = models.map(modelId => {
        const [providerId, model] = modelId.split('/');
        return this.byokHandler.call(messages, {
          ...options,
          providerId,
          model,
          isRaceMode: true
        }).catch(error => ({
          error: error.message,
          modelId: modelId,
          providerId: providerId
        }));
      });

      const results = await Promise.all(promises);
      const successful = results.filter(r => !r.error);
      
      if (successful.length === 0) {
        throw new Error('All models failed in race mode');
      }

      // Return fastest successful result
      return successful[0];
    }

    // For paid tiers, use backend if available, otherwise fallback to BYOK
    try {
      const mode = await this.getMode();
      if (mode === 'server') {
        // Backend race mode (if supported)
        return await this.paidHandler.call(messages, {
          ...options,
          isRaceMode: true,
          models: models
        });
      }
    } catch (error) {
      // Fallback to local race mode
    }

    // Fallback: Use BYOK handler (if user has keys) or free handler
    if (tier !== SUBSCRIPTION_TIERS.FREE) {
      // Try BYOK first
      try {
        const promises = models.map(modelId => {
          const [providerId, model] = modelId.split('/');
          return this.byokHandler.call(messages, {
            ...options,
            providerId,
            model,
            isRaceMode: true
          }).catch(error => ({
            error: error.message,
            modelId: modelId
          }));
        });

        const results = await Promise.all(promises);
        const successful = results.filter(r => !r.error);
        
        if (successful.length > 0) {
          return successful[0];
        }
      } catch (error) {
        // Continue to fallback
      }
    }

    // Final fallback: Use first model only
    const firstModel = models[0];
    const [providerId, model] = firstModel.split('/');
    return await this.call(messages, {
      ...options,
      providerId,
      model,
      isRaceMode: false
    });
  }

  /**
   * Get current mode
   * @returns {Promise<string>} 'auto' | 'local' | 'server'
   */
  async getMode() {
    await this.ensureInitialized();
    return this.mode;
  }

  /**
   * Set mode
   * @param {string} mode - 'auto' | 'local' | 'server'
   */
  async setMode(mode) {
    if (!['auto', 'local', 'server'].includes(mode)) {
      console.warn('[APIGateway] Invalid mode:', mode);
      return;
    }

    this.mode = mode;
    await this.saveMode();
    console.log('[APIGateway] Mode set to:', mode);
  }

  /**
   * Check if mode is available
   * @param {string} mode - 'local' | 'server'
   * @returns {Promise<boolean>}
   */
  async isModeAvailable(mode) {
    if (mode === 'local') {
      // Local mode is always available (free tier or BYOK)
      return true;
    }

    if (mode === 'server') {
      // Check if backend is available
      try {
        return await subscriptionAPIClient.isBackendAvailable();
      } catch (error) {
        return false;
      }
    }

    return false;
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
   * Load mode from storage
   */
  async loadMode() {
    try {
      const data = await chrome.storage.local.get(['api_gateway_mode']);
      if (data.api_gateway_mode) {
        this.mode = data.api_gateway_mode;
      }
    } catch (error) {
      console.error('[APIGateway] Failed to load mode:', error);
      this.mode = 'auto';
    }
  }

  /**
   * Save mode to storage
   */
  async saveMode() {
    try {
      await chrome.storage.local.set({
        api_gateway_mode: this.mode
      });
    } catch (error) {
      console.error('[APIGateway] Failed to save mode:', error);
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

