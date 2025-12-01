/**
 * Feature Gates
 * Controls feature availability based on subscription tier
 */

import { subscriptionManager } from '../subscription/subscription-manager.js';
import { getRequiredTierForFeature } from '../subscription/subscription-config.js';

class FeatureGates {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize feature gates
   */
  async initialize() {
    await subscriptionManager.ensureInitialized();
    this.initialized = true;
  }

  /**
   * Check if feature is allowed for current tier
   * @param {string} featureName - Feature name
   * @returns {Promise<boolean>}
   */
  async isAllowed(featureName) {
    await this.ensureInitialized();
    return await subscriptionManager.hasFeature(featureName);
  }

  /**
   * Get required tier for feature
   * @param {string} featureName - Feature name
   * @returns {Promise<string>} Required tier
   */
  async getRequiredTier(featureName) {
    return getRequiredTierForFeature(featureName);
  }

  /**
   * Show upgrade prompt if feature is not allowed
   * @param {string} featureName - Feature name
   * @returns {Promise<boolean>} True if allowed, false if not
   */
  async showUpgradePromptIfNeeded(featureName) {
    const isAllowed = await this.isAllowed(featureName);
    
    if (!isAllowed) {
      const requiredTier = await this.getRequiredTier(featureName);
      
      if (typeof window !== 'undefined' && window.showUpgradePrompt) {
        window.showUpgradePrompt('feature_not_available', {
          featureName: featureName,
          requiredTier: requiredTier
        });
      }
      
      return false;
    }
    
    return true;
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

// Create singleton instance
const featureGates = new FeatureGates();

// Export both class and instance
export { FeatureGates, featureGates };

// Make available globally
if (typeof window !== 'undefined') {
  window.featureGates = featureGates;
}

