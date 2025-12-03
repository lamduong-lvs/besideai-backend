/**
 * Limits Enforcer
 * Enforces subscription limits before allowing API calls or feature usage
 */

import { subscriptionManager } from './subscription-manager.js';
import { usageTracker } from './usage-tracker.js';
import {
  isModelAllowedForTier,
  isFeatureEnabledForTier,
  getRequiredTierForFeature,
  getRequiredTierForModel
} from './subscription-config.js';

/**
 * Custom error for limit exceeded
 */
export class LimitExceededError extends Error {
  constructor(limitType, current, limit, reason = 'limit_exceeded') {
    super(`Limit exceeded: ${limitType}`);
    this.name = 'LimitExceededError';
    this.limitType = limitType;
    this.current = current;
    this.limit = limit;
    this.reason = reason;
  }
}

/**
 * Custom error for feature not available
 */
export class FeatureNotAvailableError extends Error {
  constructor(featureName, requiredTier) {
    super(`Feature not available: ${featureName}`);
    this.name = 'FeatureNotAvailableError';
    this.featureName = featureName;
    this.requiredTier = requiredTier;
  }
}

class LimitsEnforcer {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize limits enforcer
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    await subscriptionManager.ensureInitialized();
    await usageTracker.ensureInitialized();
    
    this.initialized = true;
  }

  /**
   * Check if request is allowed
   * @param {Object} check - Request check object
   * @param {string} check.provider - Provider ID
   * @param {string} check.model - Model ID (full: provider/model)
   * @param {number} check.estimatedTokens - Estimated tokens (optional)
   * @param {string} check.feature - Feature name (optional)
   * @returns {Promise<{allowed: boolean, reason?: string, upgradePrompt?: boolean}>}
   */
  async canMakeRequest(check) {
    await this.ensureInitialized();

    const tier = await subscriptionManager.getTier();
    const limits = await subscriptionManager.getLimits();
    const status = await subscriptionManager.getStatus();

    // Check if subscription is active (for paid tiers)
    if (tier !== 'free') {
      if (status === 'expired' || status === 'cancelled') {
        return {
          allowed: false,
          reason: 'subscription_expired',
          upgradePrompt: true
        };
      }
    }

    // BYOK tier removed - all tiers now use Backend

    // Check model availability
    if (check.model) {
      const modelAllowed = isModelAllowedForTier(tier, check.model);
      if (!modelAllowed) {
        const requiredTier = getRequiredTierForModel(check.model);
        return {
          allowed: false,
          reason: 'model_not_available',
          requiredTier: requiredTier,
          upgradePrompt: true
        };
      }
    }

    // Check feature availability
    // Temporarily disabled - backend will handle feature checks
    // All features are allowed for now (until proper feature gating is implemented)
    if (check.feature && false) { // Disabled temporarily
      const featureAllowed = await subscriptionManager.hasFeature(check.feature);
      if (!featureAllowed) {
        const requiredTier = getRequiredTierForFeature(check.feature);
        return {
          allowed: false,
          reason: 'feature_not_available',
          featureName: check.feature,
          requiredTier: requiredTier,
          upgradePrompt: true
        };
      }
    }

    // Check request limits
    if (limits.requestsPerDay !== null) {
      const isExceeded = await usageTracker.isLimitExceeded('requestsPerDay', limits.requestsPerDay);
      if (isExceeded) {
        const today = await usageTracker.getTodayUsage();
        return {
          allowed: false,
          reason: 'daily_request_limit_exceeded',
          current: today.requests,
          limit: limits.requestsPerDay,
          upgradePrompt: true
        };
      }
    }

    // Check token limits (if estimated tokens provided)
    if (check.estimatedTokens && limits.tokensPerDay !== null) {
      const today = await usageTracker.getTodayUsage();
      const totalTokens = today.tokens + check.estimatedTokens;
      
      if (totalTokens > limits.tokensPerDay) {
        return {
          allowed: false,
          reason: 'daily_token_limit_exceeded',
          current: today.tokens,
          estimated: check.estimatedTokens,
          limit: limits.tokensPerDay,
          upgradePrompt: true
        };
      }
    }

    // Check max tokens per request
    if (check.estimatedTokens && limits.maxTokensPerRequest !== null) {
      if (check.estimatedTokens > limits.maxTokensPerRequest) {
        return {
          allowed: false,
          reason: 'max_tokens_per_request_exceeded',
          estimated: check.estimatedTokens,
          limit: limits.maxTokensPerRequest,
          upgradePrompt: true
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if model is allowed for current tier
   * @param {string} modelId - Full model ID (e.g., 'openai/gpt-4')
   * @returns {Promise<boolean>}
   */
  async isModelAllowed(modelId) {
    await this.ensureInitialized();
    const tier = await subscriptionManager.getTier();
    return isModelAllowedForTier(tier, modelId);
  }

  /**
   * Check if feature is allowed for current tier
   * @param {string} featureName - Feature name
   * @returns {Promise<boolean>}
   */
  async isFeatureAllowed(featureName) {
    await this.ensureInitialized();
    return await subscriptionManager.hasFeature(featureName);
  }

  /**
   * Check if feature usage time is allowed
   * @param {string} featureName - Feature name ('recording' | 'translation')
   * @param {number} durationMinutes - Duration in minutes
   * @returns {Promise<{allowed: boolean, reason?: string, remaining?: number}>}
   */
  async canUseFeature(featureName, durationMinutes = 0) {
    await this.ensureInitialized();

    // Check if feature is available
    const featureAllowed = await this.isFeatureAllowed(featureName);
    if (!featureAllowed) {
      const requiredTier = getRequiredTierForFeature(featureName);
      return {
        allowed: false,
        reason: 'feature_not_available',
        requiredTier: requiredTier
      };
    }

    const tier = await subscriptionManager.getTier();
    const limits = await subscriptionManager.getLimits();

    // BYOK tier removed - all tiers now use Backend

    // Check time limits
    let timeLimit = null;
    if (featureName === 'recording') {
      timeLimit = limits.recordingTimePerDay;
    } else if (featureName === 'translation') {
      timeLimit = limits.translationTimePerDay;
    }

    if (timeLimit === null || timeLimit === 0) {
      // No limit or feature not available for this tier
      return {
        allowed: false,
        reason: 'feature_not_available_for_tier'
      };
    }

    // Get current usage
    const currentUsage = await usageTracker.getTodayFeatureUsage(featureName);
    const totalUsage = currentUsage + durationMinutes;

    if (totalUsage > timeLimit) {
      return {
        allowed: false,
        reason: 'time_limit_exceeded',
        current: currentUsage,
        requested: durationMinutes,
        limit: timeLimit,
        remaining: Math.max(0, timeLimit - currentUsage)
      };
    }

    return {
      allowed: true,
      remaining: timeLimit - totalUsage
    };
  }

  /**
   * Get remaining quota
   * @param {string} limitType - Limit type
   * @returns {Promise<number>} Remaining quota
   */
  async getRemainingQuota(limitType) {
    await this.ensureInitialized();
    
    const limits = await subscriptionManager.getLimits();
    const limit = limits[limitType];

    if (limit === null || limit === undefined) {
      return Infinity; // Unlimited
    }

    return await usageTracker.getRemainingQuota(limitType, limit);
  }

  /**
   * Enforce limit (throws error if exceeded)
   * @param {string} limitType - Limit type
   * @param {number} value - Value to check
   * @param {number} limit - Limit value
   * @throws {LimitExceededError}
   */
  async enforceLimit(limitType, value, limit) {
    if (limit === null || limit === undefined) {
      return; // No limit
    }

    if (value >= limit) {
      throw new LimitExceededError(limitType, value, limit);
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

// Create singleton instance (same pattern as auth and apiManager)
const limitsEnforcer = new LimitsEnforcer();

// Export both class and instance
// Note: LimitExceededError and FeatureNotAvailableError are already exported above
export { LimitsEnforcer, limitsEnforcer };

// Make available globally
if (typeof window !== 'undefined') {
  window.limitsEnforcer = limitsEnforcer;
}

