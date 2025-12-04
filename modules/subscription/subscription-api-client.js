/**
 * Subscription API Client
 * Communicates with backend server for subscription management
 */

const DEFAULT_BACKEND_URL = 'https://besideai-backend.vercel.app';
const REQUEST_TIMEOUT = 30000; // 30 seconds

class SubscriptionAPIClient {
  constructor() {
    this.baseURL = null;
    this.initialized = false;
  }

  /**
   * Initialize API client
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Load backend URL from storage or use default
    try {
      const data = await chrome.storage.local.get(['backend_config']);
      this.baseURL = data.backend_config?.url || DEFAULT_BACKEND_URL;
    } catch (error) {
      console.error('[SubscriptionAPIClient] Failed to load config:', error);
      this.baseURL = DEFAULT_BACKEND_URL;
    }

    this.initialized = true;
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
      console.error('[SubscriptionAPIClient] Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Make authenticated request
   */
  async request(endpoint, options = {}) {
    await this.ensureInitialized();

    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          // Don't throw immediately - log and return null for graceful degradation
          console.warn('[SubscriptionAPIClient] Authentication expired (401)');
          throw new Error('Authentication expired');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Get subscription status from backend
   * @returns {Promise<Object>} Subscription status
   */
  async getSubscriptionStatus() {
    try {
      return await this.request('/api/subscription/status');
    } catch (error) {
      // Don't log as error if it's auth expired (expected)
      if (error.message?.includes('Authentication expired')) {
        console.warn('[SubscriptionAPIClient] Authentication expired, user needs to login');
      } else {
        console.error('[SubscriptionAPIClient] Failed to get subscription status:', error);
      }
      throw error;
    }
  }

  /**
   * Get usage from backend
   * @param {string} period - Period ('day' | 'month')
   * @returns {Promise<Object>} Usage data
   */
  async getUsage(period = 'day') {
    try {
      return await this.request(`/api/usage?period=${period}`);
    } catch (error) {
      console.error('[SubscriptionAPIClient] Failed to get usage:', error);
      throw error;
    }
  }

  /**
   * Sync usage to backend
   * @param {Object} usageData - Usage data
   * @returns {Promise<void>}
   */
  async syncUsage(usageData) {
    try {
      await this.request('/api/usage/sync', {
        method: 'POST',
        body: JSON.stringify(usageData)
      });
    } catch (error) {
      // Don't log as error if it's auth expired (expected)
      if (error.message?.includes('Authentication expired')) {
        console.warn('[SubscriptionAPIClient] Authentication expired, skipping usage sync');
      } else {
        console.error('[SubscriptionAPIClient] Failed to sync usage:', error);
      }
      // Don't throw - usage sync is non-critical
      // throw error;
    }
  }

  /**
   * Upgrade subscription
   * @param {string} tier - Tier to upgrade to
   * @param {string} billingCycle - 'monthly' | 'yearly'
   * @returns {Promise<Object>} Subscription data
   */
  async upgradeSubscription(tier, billingCycle = 'monthly') {
    try {
      return await this.request('/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({ tier, billingCycle })
      });
    } catch (error) {
      console.error('[SubscriptionAPIClient] Failed to upgrade subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   * @returns {Promise<void>}
   */
  async cancelSubscription() {
    try {
      await this.request('/api/subscription/cancel', {
        method: 'POST'
      });
    } catch (error) {
      console.error('[SubscriptionAPIClient] Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription limits
   * @returns {Promise<Object>} Limits object
   */
  async getSubscriptionLimits() {
    try {
      return await this.request('/api/subscription/limits');
    } catch (error) {
      console.error('[SubscriptionAPIClient] Failed to get limits:', error);
      throw error;
    }
  }

  /**
   * Check if backend is available
   * @returns {Promise<boolean>}
   */
  async isBackendAvailable() {
    try {
      const result = await this.healthCheck();
      return result !== null; // Return true only if health check succeeded
    } catch (error) {
      // Backend not available - this is expected and not an error
      return false;
    }
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      await this.ensureInitialized();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds for health check

      // Health endpoint is at /api/health (Vercel serverless function)
      const response = await fetch(`${this.baseURL}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Don't log as error if it's a network/CORS issue (expected when backend not ready)
      // Only log as warning for debugging
      if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
        // This is expected when backend is not available - don't log as error
        return null;
      }
      // For other errors, log as warning
      console.warn('[SubscriptionAPIClient] Health check failed:', error.message);
      throw error;
    }
  }

  /**
   * Set backend URL
   * @param {string} url - Backend URL
   */
  async setBackendURL(url) {
    this.baseURL = url;
    await chrome.storage.local.set({
      backend_config: { url: url }
    });
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
const subscriptionAPIClient = new SubscriptionAPIClient();

// Export both class and instance
export { SubscriptionAPIClient, subscriptionAPIClient };

// Make available globally
if (typeof window !== 'undefined') {
  window.subscriptionAPIClient = subscriptionAPIClient;
}

