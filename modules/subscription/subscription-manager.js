/**
 * Subscription Manager
 * Manages subscription status, tier detection, and feature availability
 */

import {
  SUBSCRIPTION_TIERS,
  getLimitsForTier,
  getFeaturesForTier,
  DEFAULT_SUBSCRIPTION_CONFIG
} from './subscription-config.js';
import { subscriptionAPIClient } from './subscription-api-client.js';
import { conflictResolver } from './conflict-resolver.js';
// Don't import auth directly - it may cause issues in service worker
// Will use chrome.identity directly or lazy load

const STORAGE_KEY = 'subscription_status';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

class SubscriptionManager {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.initialized = false;
  }

  /**
   * Initialize subscription manager
   * Detects tier and loads subscription status
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Load from storage
      await this.loadFromStorage();
      
      // Detect tier if not set
      if (!this.cache || !this.cache.tier) {
        const tier = await this.detectTier();
        await this.setTier(tier);
      }
      
      this.initialized = true;
      console.log('[SubscriptionManager] Initialized with tier:', this.cache?.tier);
    } catch (error) {
      console.error('[SubscriptionManager] Initialization failed:', error);
      // Default to free tier
      await this.setTier(SUBSCRIPTION_TIERS.FREE);
      this.initialized = true;
    }
  }

  /**
   * Detect current subscription tier
   * Priority: Backend subscription > Free
   * All tiers use Backend for AI calls
   */
  async detectTier() {
    try {
      // 1. Check if user is authenticated
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        console.log('[SubscriptionManager] Not authenticated, defaulting to free tier');
        return SUBSCRIPTION_TIERS.FREE;
      }

      // 2. Check subscription status from backend
      try {
        const subscription = await this.getSubscriptionStatusFromBackend();
        if (subscription?.tier) {
          // Validate tier (only allow Free, Professional, Premium)
          const validTiers = [SUBSCRIPTION_TIERS.FREE, SUBSCRIPTION_TIERS.PROFESSIONAL, SUBSCRIPTION_TIERS.PREMIUM];
          if (validTiers.includes(subscription.tier)) {
            console.log('[SubscriptionManager] Tier detected from backend:', subscription.tier);
            return subscription.tier;
          }
        }
      } catch (error) {
        console.warn('[SubscriptionManager] Failed to get subscription from backend:', error);
        // Fallback to free if backend unavailable
      }

      // 3. Default to free
      return SUBSCRIPTION_TIERS.FREE;
    } catch (error) {
      console.error('[SubscriptionManager] Tier detection failed:', error);
      return SUBSCRIPTION_TIERS.FREE;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      // Try to use chrome.identity directly (works in service worker)
      // Fallback to storage check
      const data = await chrome.storage.local.get(['auth_user_info']);
      if (data.auth_user_info) {
        return true;
      }
      
      // Try to get auth token (if available, user is authenticated)
      return new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (chrome.runtime.lastError || !token) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('[SubscriptionManager] Failed to check authentication:', error);
      return false;
    }
  }

  /**
   * Get subscription status from backend
   * @returns {Promise<Object|null>} Subscription status or null if unavailable
   */
  async getSubscriptionStatusFromBackend() {
    try {
      await subscriptionAPIClient.ensureInitialized();
      const status = await subscriptionAPIClient.getSubscriptionStatus();
      return status;
    } catch (error) {
      // Don't log as error if it's auth expired or network error (expected)
      if (error.message?.includes('Authentication expired')) {
        console.warn('[SubscriptionManager] Authentication expired, using local data');
      } else if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        console.warn('[SubscriptionManager] Network error, using local data');
      } else {
        console.warn('[SubscriptionManager] Backend unavailable, using local data:', error.message);
      }
      return null;
    }
  }

  /**
   * Sync subscription status from backend
   * @returns {Promise<boolean>} Success status
   */
  async syncSubscriptionFromBackend() {
    try {
      const backendData = await this.getSubscriptionStatusFromBackend();
      
      if (!backendData) {
        return false; // Backend unavailable
      }

      // Resolve conflicts if local data exists
      const localData = this.cache;
      const resolvedData = conflictResolver.resolveSubscriptionConflict(
        localData,
        backendData,
        'backend-wins' // Backend is source of truth
      );

      // Update cache
      this.cache = {
        ...resolvedData,
        lastSynced: Date.now()
      };
      this.cacheTimestamp = Date.now();

      // Save to storage
      await this.saveToStorage();

      console.log('[SubscriptionManager] Subscription synced from backend:', this.cache.tier);
      return true;
    } catch (error) {
      console.error('[SubscriptionManager] Failed to sync from backend:', error);
      return false;
    }
  }

  /**
   * Update subscription status to backend
   * @param {Object} subscriptionData - Subscription data to update
   * @returns {Promise<boolean>} Success status
   */
  async updateSubscriptionStatus(subscriptionData) {
    try {
      await subscriptionAPIClient.ensureInitialized();
      
      // Update local first
      this.cache = {
        ...(this.cache || {}),
        ...subscriptionData,
        lastSynced: Date.now()
      };
      await this.saveToStorage();

      // Sync to backend (non-blocking)
      subscriptionAPIClient.request('/api/subscription/status', {
        method: 'PUT',
        body: JSON.stringify(subscriptionData)
      }).catch(err => {
        console.warn('[SubscriptionManager] Failed to update backend:', err);
      });

      return true;
    } catch (error) {
      console.error('[SubscriptionManager] Failed to update subscription:', error);
      return false;
    }
  }

  /**
   * Handle subscription tier change
   * @param {string} newTier - New tier
   * @param {Object} metadata - Additional metadata
   */
  async handleSubscriptionChange(newTier, metadata = {}) {
    console.log('[SubscriptionManager] Subscription changed to:', newTier);
    
    await this.setTier(newTier);
    
    // Update backend if available
    await this.updateSubscriptionStatus({
      tier: newTier,
      ...metadata,
      updatedAt: Date.now()
    });

    // Emit event if in panel context
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('subscription:changed', {
        detail: { tier: newTier, metadata }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Get current subscription tier
   * @returns {Promise<string>} Tier name
   */
  async getTier() {
    await this.ensureInitialized();
    return this.cache?.tier || SUBSCRIPTION_TIERS.FREE;
  }

  /**
   * Set subscription tier
   * @param {string} tier - Tier name
   */
  async setTier(tier) {
    if (!Object.values(SUBSCRIPTION_TIERS).includes(tier)) {
      console.warn('[SubscriptionManager] Invalid tier:', tier);
      tier = SUBSCRIPTION_TIERS.FREE;
    }

    const subscription = {
      ...DEFAULT_SUBSCRIPTION_CONFIG,
      ...(this.cache || {}),
      tier: tier,
      lastSynced: Date.now()
    };

    this.cache = subscription;
    this.cacheTimestamp = Date.now();
    
    await this.saveToStorage();
    console.log('[SubscriptionManager] Tier set to:', tier);
  }

  /**
   * Get subscription status
   * @returns {Promise<string>} Status: 'active' | 'expired' | 'cancelled' | 'trial' | 'none'
   */
  async getStatus() {
    await this.ensureInitialized();
    
    if (!this.cache) {
      return 'none';
    }

    const tier = this.cache.tier;
    
    // Free tier is always active
    if (tier === SUBSCRIPTION_TIERS.FREE) {
      return 'active';
    }

    // Check trial expiration
    if (this.cache.trialEndsAt) {
      if (Date.now() > this.cache.trialEndsAt) {
        return 'expired';
      }
      return 'trial';
    }

    // Check subscription expiration
    if (this.cache.expiresAt) {
      if (Date.now() > this.cache.expiresAt) {
        return 'expired';
      }
    }

    return this.cache.status || 'active';
  }

  /**
   * Check if subscription is active
   * @returns {Promise<boolean>}
   */
  async isActive() {
    const status = await this.getStatus();
    return status === 'active' || status === 'trial';
  }

  /**
   * Get limits for current tier
   * @returns {Promise<Object>} Limits object
   */
  async getLimits() {
    const tier = await this.getTier();
    return getLimitsForTier(tier);
  }

  /**
   * Get available features for current tier
   * @returns {Promise<Object>} Features object
   */
  async getFeatures() {
    const tier = await this.getTier();
    return getFeaturesForTier(tier);
  }

  /**
   * Check if feature is available for current tier
   * @param {string} featureName - Feature name
   * @returns {Promise<boolean>}
   */
  async hasFeature(featureName) {
    const features = await this.getFeatures();
    return features[featureName] === true;
  }


  /**
   * Sync subscription status with backend
   * @returns {Promise<void>}
   */
  async sync() {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        // Not authenticated, no need to sync
        return;
      }

      const subscription = await this.getSubscriptionStatusFromBackend();
      if (subscription) {
        this.cache = {
          ...DEFAULT_SUBSCRIPTION_CONFIG,
          ...this.cache,
          ...subscription,
          lastSynced: Date.now()
        };
        await this.saveToStorage();
        console.log('[SubscriptionManager] Synced with backend');
      }
    } catch (error) {
      console.error('[SubscriptionManager] Sync failed:', error);
      // Don't throw - allow offline operation
    }
  }

  /**
   * Load subscription status from storage
   */
  async loadFromStorage() {
    try {
      const data = await chrome.storage.local.get([STORAGE_KEY]);
      const stored = data[STORAGE_KEY];
      
      if (stored) {
        this.cache = stored;
        this.cacheTimestamp = Date.now();
      } else {
        this.cache = { ...DEFAULT_SUBSCRIPTION_CONFIG };
      }
    } catch (error) {
      console.error('[SubscriptionManager] Failed to load from storage:', error);
      this.cache = { ...DEFAULT_SUBSCRIPTION_CONFIG };
    }
  }

  /**
   * Save subscription status to storage
   */
  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY]: this.cache
      });
    } catch (error) {
      console.error('[SubscriptionManager] Failed to save to storage:', error);
    }
  }

  /**
   * Ensure manager is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Clear cache (force reload)
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Check if cache is valid
   */
  isCacheValid() {
    if (!this.cache || !this.cacheTimestamp) {
      return false;
    }
    return (Date.now() - this.cacheTimestamp) < CACHE_EXPIRY;
  }
}

// Create singleton instance (same pattern as auth and apiManager)
const subscriptionManager = new SubscriptionManager();

// Export both class and instance
export { SubscriptionManager, subscriptionManager };

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.subscriptionManager = subscriptionManager;
}

