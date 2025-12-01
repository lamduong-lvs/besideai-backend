/**
 * Feature Flags
 * Defines feature availability per tier
 */

import { TIER_FEATURES, getFeaturesForTier, isFeatureEnabledForTier, getRequiredTierForFeature } from '../subscription/subscription-config.js';

// Re-export for convenience
export { TIER_FEATURES, getFeaturesForTier, isFeatureEnabledForTier, getRequiredTierForFeature };

/**
 * Get all features for a tier
 * @param {string} tier - Tier name
 * @returns {Object} Features object
 */
export function getAllFeaturesForTier(tier) {
  return getFeaturesForTier(tier);
}

/**
 * Check if feature is enabled
 * @param {string} tier - Tier name
 * @param {string} featureName - Feature name
 * @returns {boolean}
 */
export function isFeatureEnabled(tier, featureName) {
  return isFeatureEnabledForTier(tier, featureName);
}

/**
 * Get required tier for feature
 * @param {string} featureName - Feature name
 * @returns {string} Required tier
 */
export function getRequiredTier(featureName) {
  return getRequiredTierForFeature(featureName);
}

