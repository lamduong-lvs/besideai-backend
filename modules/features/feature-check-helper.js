/**
 * Feature Check Helper
 * Utility functions for checking feature availability before use
 */

import { featureGates } from './feature-gates.js';
import { limitsEnforcer } from '../subscription/limits-enforcer.js';
import { upgradePrompts } from './upgrade-prompts.js';

/**
 * Check if feature is available and show upgrade prompt if not
 * @param {string} featureName - Feature name
 * @param {Object} options - Options
 * @param {number} options.durationMinutes - Duration in minutes (for time-based features)
 * @returns {Promise<boolean>} True if available, false if not
 */
export async function checkFeatureAvailability(featureName, options = {}) {
  try {
    // Check if feature is allowed
    const isAllowed = await featureGates.isAllowed(featureName);
    
    if (!isAllowed) {
      const requiredTier = await featureGates.getRequiredTier(featureName);
      await upgradePrompts.show('feature_not_available', {
        featureName: featureName,
        requiredTier: requiredTier
      });
      return false;
    }

    // For time-based features, check time limits
    if (options.durationMinutes !== undefined && options.durationMinutes > 0) {
      const canUse = await limitsEnforcer.canUseFeature(featureName, options.durationMinutes);
      
      if (!canUse.allowed) {
        if (canUse.reason === 'time_limit_exceeded') {
          await upgradePrompts.show('limit_reached', {
            type: 'time',
            current: canUse.current,
            limit: canUse.limit,
            featureName: featureName
          });
        } else {
          await upgradePrompts.show('feature_not_available', {
            featureName: featureName,
            requiredTier: canUse.requiredTier
          });
        }
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[FeatureCheckHelper] Error checking feature:', error);
    return false;
  }
}

/**
 * Check feature availability and throw error if not available
 * @param {string} featureName - Feature name
 * @param {Object} options - Options
 * @throws {Error} If feature is not available
 */
export async function requireFeature(featureName, options = {}) {
  const isAvailable = await checkFeatureAvailability(featureName, options);
  if (!isAvailable) {
    throw new Error(`Feature ${featureName} is not available for your subscription tier`);
  }
}

