/**
 * Limits Enforcer (Backend)
 * Enforces subscription limits before allowing API calls
 */

import { Usage } from '../models/index.js';
import { SUBSCRIPTION_LIMITS } from '../config/subscription-limits.js';

/**
 * Check if user can make request
 * @param {Object} params - Check parameters
 * @param {string} params.userId - User ID
 * @param {string} params.tier - Subscription tier
 * @param {string} params.feature - Feature name
 * @param {string} params.model - Model ID (optional)
 * @returns {Promise<void>} Throws error if limit exceeded
 */
export async function checkLimit({ userId, tier, feature, model }) {
  const limits = SUBSCRIPTION_LIMITS[tier] || SUBSCRIPTION_LIMITS.free;
  
  // Get today's usage
  const todayUsage = await Usage.getTodayUsage(userId);
  
  // Check token limit
  if (limits.maxTokensPerDay && todayUsage.tokens >= limits.maxTokensPerDay) {
    const error = new Error(`Daily token limit exceeded (${limits.maxTokensPerDay} tokens)`);
    error.status = 429;
    error.code = 'TOKEN_LIMIT_EXCEEDED';
    throw error;
  }
  
  // Check request limit
  if (limits.maxRequestsPerDay && todayUsage.requests >= limits.maxRequestsPerDay) {
    const error = new Error(`Daily request limit exceeded (${limits.maxRequestsPerDay} requests)`);
    error.status = 429;
    error.code = 'REQUEST_LIMIT_EXCEEDED';
    throw error;
  }
  
  // Check feature-specific limits
  // Note: Feature availability check is disabled - all features are allowed
  // Only check usage limits, not feature availability
  if (feature === 'ai_call') {
    if (limits.maxAICallsPerDay && todayUsage.requests >= limits.maxAICallsPerDay) {
      const error = new Error(`Daily AI call limit exceeded (${limits.maxAICallsPerDay} calls)`);
      error.status = 429;
      error.code = 'AI_CALL_LIMIT_EXCEEDED';
      throw error;
    }
  }
  
  // Feature availability check disabled - all features allowed for now
  // This will be re-enabled when proper feature gating is implemented
}

/**
 * Limits enforcer instance
 */
export const limitsEnforcer = {
  checkLimit
};

