/**
 * Usage Tracker
 * Tracks API usage, tokens, and feature usage locally
 */

import { subscriptionAPIClient } from './subscription-api-client.js';
import { conflictResolver } from './conflict-resolver.js';

const STORAGE_KEY = 'usage_tracking';
const USAGE_HISTORY_KEY = 'usage_history';
const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes

class UsageTracker {
  constructor() {
    this.cache = null;
    this.syncing = false;
    this.lastSyncTime = null;
    this.syncQueue = [];
  }

  /**
   * Initialize usage tracker
   */
  async initialize() {
    await this.loadFromStorage();
  }

  /**
   * Track an API call
   * @param {Object} record - Usage record
   * @param {string} record.provider - Provider ID (e.g., 'openai')
   * @param {string} record.model - Model ID (e.g., 'gpt-4')
   * @param {Object} record.tokens - Token counts {input, output, total}
   * @param {Object} record.metadata - Additional metadata
   */
  async trackCall(record) {
    try {
      await this.ensureInitialized();

      const now = new Date();
      const today = this.getDateKey(now);
      const month = this.getMonthKey(now);

      // Initialize if needed
      if (!this.cache.current) {
        this.cache.current = {
          day: { date: today, requests: 0, tokens: 0, calls: [] },
          month: { year: now.getFullYear(), month: now.getMonth() + 1, requests: 0, tokens: 0 }
        };
      }

      // Check if day changed
      if (this.cache.current.day.date !== today) {
        // Move current day to history
        await this.archiveDay(this.cache.current.day);
        // Reset day
        this.cache.current.day = { date: today, requests: 0, tokens: 0, calls: [] };
      }

      // Check if month changed
      const currentMonth = this.getMonthKey(now);
      const storedMonth = `${this.cache.current.month.year}-${String(this.cache.current.month.month).padStart(2, '0')}`;
      if (currentMonth !== storedMonth) {
        // Reset month
        this.cache.current.month = {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          requests: 0,
          tokens: 0
        };
      }

      // Add call record
      const callRecord = {
        id: this.generateId(),
        timestamp: now.getTime(),
        provider: record.provider,
        model: record.model,
        tokens: {
          input: record.tokens?.input || 0,
          output: record.tokens?.output || 0,
          total: record.tokens?.total || (record.tokens?.input || 0) + (record.tokens?.output || 0)
        },
        metadata: record.metadata || {}
      };

      // Update counters
      this.cache.current.day.requests += 1;
      this.cache.current.day.tokens += callRecord.tokens.total;
      this.cache.current.day.calls.push(callRecord);

      this.cache.current.month.requests += 1;
      this.cache.current.month.tokens += callRecord.tokens.total;

      // Keep only last 100 calls per day (to avoid storage bloat)
      if (this.cache.current.day.calls.length > 100) {
        this.cache.current.day.calls = this.cache.current.day.calls.slice(-100);
      }

      await this.saveToStorage();

      // Emit event for usage update
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('usage:updated', {
          detail: {
            type: 'call',
            tokens: callRecord.tokens.total,
            today: await this.getTodayUsage()
          }
        });
        window.dispatchEvent(event);
      }

      console.log('[UsageTracker] Tracked call:', {
        provider: record.provider,
        model: record.model,
        tokens: callRecord.tokens.total
      });
    } catch (error) {
      console.error('[UsageTracker] Failed to track call:', error);
    }
  }

  /**
   * Track feature usage (recording, translation time)
   * @param {string} featureName - Feature name ('recording' | 'translation')
   * @param {number} durationMinutes - Duration in minutes
   */
  async trackFeatureUsage(featureName, durationMinutes) {
    try {
      await this.ensureInitialized();

      const now = new Date();
      const today = this.getDateKey(now);

      // Initialize feature usage tracking
      if (!this.cache.features) {
        this.cache.features = {};
      }

      if (!this.cache.features[today]) {
        this.cache.features[today] = {
          date: today,
          recording: 0,
          translation: 0
        };
      }

      // Check if day changed
      if (this.cache.features[today].date !== today) {
        this.cache.features[today] = {
          date: today,
          recording: 0,
          translation: 0
        };
      }

      // Update feature usage
      if (featureName === 'recording' || featureName === 'translation') {
        this.cache.features[today][featureName] += durationMinutes;
      }

      await this.saveToStorage();

      // Queue sync to backend (non-blocking)
      this.queueSync().catch(err => {
        console.warn('[UsageTracker] Failed to queue sync:', err);
      });

      // Emit event for usage update
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('usage:updated', {
          detail: {
            type: 'feature',
            feature: featureName,
            duration: durationMinutes
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('[UsageTracker] Failed to track feature usage:', error);
    }
  }

  /**
   * Sync usage to backend
   * @returns {Promise<boolean>} Success status
   */
  async syncUsageToBackend() {
    if (this.syncing) {
      return false; // Already syncing
    }

    this.syncing = true;

    try {
      await subscriptionAPIClient.ensureInitialized();

      const todayUsage = await this.getTodayUsage();
      const monthUsage = await this.getMonthUsage();
      const todayFeatureUsage = await this.getTodayFeatureUsage('recording');
      const todayTranslationUsage = await this.getTodayFeatureUsage('translation');

      const usageData = {
        tokens: {
          today: todayUsage.tokens || 0,
          month: monthUsage.tokens || 0
        },
        requests: {
          today: todayUsage.requests || 0,
          month: monthUsage.requests || 0
        },
        time: {
          recording: todayFeatureUsage || 0,
          translation: todayTranslationUsage || 0
        },
        timestamp: Date.now()
      };

      // Sync to backend (non-blocking, don't throw on error)
      subscriptionAPIClient.syncUsage(usageData).catch(err => {
        // Don't log as error if it's auth expired (expected)
        if (err.message?.includes('Authentication expired')) {
          console.warn('[UsageTracker] Authentication expired, skipping sync');
        } else {
          console.warn('[UsageTracker] Failed to sync to backend:', err.message);
        }
      });
      
      this.lastSyncTime = Date.now();
      console.log('[UsageTracker] Usage synced to backend');
      
      return true;
    } catch (error) {
      // Don't log as error if it's auth expired or network error (expected)
      if (error.message?.includes('Authentication expired')) {
        console.warn('[UsageTracker] Authentication expired, skipping sync');
      } else if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        console.warn('[UsageTracker] Network error, skipping sync:', error.message);
      } else {
        console.error('[UsageTracker] Failed to sync to backend:', error);
      }
      return false;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Get usage from backend
   * @param {string} period - 'day' | 'month'
   * @returns {Promise<Object|null>} Usage data or null
   */
  async getUsageFromBackend(period = 'day') {
    try {
      await subscriptionAPIClient.ensureInitialized();
      const usage = await subscriptionAPIClient.getUsage(period);
      return usage;
    } catch (error) {
      console.error('[UsageTracker] Failed to get usage from backend:', error);
      return null;
    }
  }

  /**
   * Merge local and backend usage data
   * @param {Object} localUsage - Local usage data
   * @param {Object} backendUsage - Backend usage data
   * @returns {Object} Merged usage data
   */
  mergeUsageData(localUsage, backendUsage) {
    if (!backendUsage) {
      return localUsage;
    }

    if (!localUsage) {
      return backendUsage;
    }

    return conflictResolver.resolveUsageConflict(localUsage, backendUsage, 'merge');
  }

  /**
   * Queue sync operation
   * @returns {Promise<void>}
   */
  async queueSync() {
    // Add to queue
    this.syncQueue.push({
      timestamp: Date.now(),
      type: 'usage'
    });

    // Process queue if not syncing and enough time passed
    if (!this.syncing && this.needsSync()) {
      await this.processSyncQueue();
    }
  }

  /**
   * Process sync queue
   * @returns {Promise<void>}
   */
  async processSyncQueue() {
    if (this.syncQueue.length === 0) {
      return;
    }

    // Clear queue
    this.syncQueue = [];

    // Sync to backend
    await this.syncUsageToBackend();
  }

  /**
   * Check if sync is needed
   * @returns {boolean}
   */
  needsSync() {
    if (!this.lastSyncTime) {
      return true;
    }
    
    return (Date.now() - this.lastSyncTime) > SYNC_INTERVAL;
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync() {
    if (this.syncTimer) {
      return; // Already started
    }

    this.syncTimer = setInterval(() => {
      if (this.needsSync()) {
        this.syncUsageToBackend().catch(err => {
          console.warn('[UsageTracker] Periodic sync failed:', err);
        });
      }
    }, SYNC_INTERVAL);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Get today's usage
   * @returns {Promise<Object>} Usage stats
   */
  async getTodayUsage() {
    await this.ensureInitialized();

    const now = new Date();
    const today = this.getDateKey(now);

    // Check if day changed
    if (!this.cache.current || this.cache.current.day.date !== today) {
      return {
        date: today,
        requests: 0,
        tokens: 0,
        calls: []
      };
    }

    return {
      date: this.cache.current.day.date,
      requests: this.cache.current.day.requests,
      tokens: this.cache.current.day.tokens,
      calls: this.cache.current.day.calls
    };
  }

  /**
   * Get this month's usage
   * @returns {Promise<Object>} Usage stats
   */
  async getMonthUsage() {
    await this.ensureInitialized();

    const now = new Date();
    const currentMonth = {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };

    if (!this.cache.current || 
        this.cache.current.month.year !== currentMonth.year ||
        this.cache.current.month.month !== currentMonth.month) {
      return {
        year: currentMonth.year,
        month: currentMonth.month,
        requests: 0,
        tokens: 0
      };
    }

    return {
      year: this.cache.current.month.year,
      month: this.cache.current.month.month,
      requests: this.cache.current.month.requests,
      tokens: this.cache.current.month.tokens
    };
  }

  /**
   * Get feature usage for today
   * @param {string} featureName - Feature name
   * @returns {Promise<number>} Usage in minutes
   */
  async getTodayFeatureUsage(featureName) {
    await this.ensureInitialized();

    const now = new Date();
    const today = this.getDateKey(now);

    if (!this.cache.features || !this.cache.features[today]) {
      return 0;
    }

    return this.cache.features[today][featureName] || 0;
  }

  /**
   * Get usage for a period
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Usage stats
   */
  async getUsagePeriod(startDate, endDate) {
    await this.ensureInitialized();

    const result = {
      requests: 0,
      tokens: 0,
      calls: []
    };

    // Get from current
    if (this.cache.current && this.cache.current.day) {
      const dayDate = new Date(this.cache.current.day.date);
      if (dayDate >= startDate && dayDate <= endDate) {
        result.requests += this.cache.current.day.requests;
        result.tokens += this.cache.current.day.tokens;
        result.calls.push(...this.cache.current.day.calls);
      }
    }

    // Get from history
    if (this.cache.history) {
      for (const dayData of this.cache.history) {
        const dayDate = new Date(dayData.date);
        if (dayDate >= startDate && dayDate <= endDate) {
          result.requests += dayData.requests;
          result.tokens += dayData.tokens;
          result.calls.push(...dayData.calls);
        }
      }
    }

    return result;
  }

  /**
   * Check if limit is exceeded
   * @param {string} limitType - Limit type ('requestsPerDay' | 'tokensPerDay' | 'requestsPerMonth' | 'tokensPerMonth')
   * @param {number} limit - Limit value
   * @returns {Promise<boolean>}
   */
  async isLimitExceeded(limitType, limit) {
    if (limit === null || limit === undefined) {
      return false; // No limit
    }

    let current = 0;

    switch (limitType) {
      case 'requestsPerDay':
        const today = await this.getTodayUsage();
        current = today.requests;
        break;
      case 'tokensPerDay':
        const todayUsage = await this.getTodayUsage();
        current = todayUsage.tokens;
        break;
      case 'requestsPerMonth':
        const month = await this.getMonthUsage();
        current = month.requests;
        break;
      case 'tokensPerMonth':
        const monthUsage = await this.getMonthUsage();
        current = monthUsage.tokens;
        break;
      default:
        return false;
    }

    return current >= limit;
  }

  /**
   * Get remaining quota
   * @param {string} limitType - Limit type
   * @param {number} limit - Limit value
   * @returns {Promise<number>} Remaining quota
   */
  async getRemainingQuota(limitType, limit) {
    if (limit === null || limit === undefined) {
      return Infinity; // Unlimited
    }

    let current = 0;

    switch (limitType) {
      case 'requestsPerDay':
        const today = await this.getTodayUsage();
        current = today.requests;
        break;
      case 'tokensPerDay':
        const todayUsage = await this.getTodayUsage();
        current = todayUsage.tokens;
        break;
      case 'requestsPerMonth':
        const month = await this.getMonthUsage();
        current = month.requests;
        break;
      case 'tokensPerMonth':
        const monthUsage = await this.getMonthUsage();
        current = monthUsage.tokens;
        break;
      default:
        return Infinity;
    }

    return Math.max(0, limit - current);
  }

  /**
   * Reset usage (for new period)
   * @returns {Promise<void>}
   */
  async resetUsage() {
    this.cache = {
      current: null,
      features: {},
      history: this.cache?.history || []
    };
    await this.saveToStorage();
  }

  /**
   * Sync usage to backend (for paid tier)
   * @returns {Promise<void>}
   */
  async syncToBackend() {
    // TODO: Implement when backend is ready
    // For now, just log
    console.log('[UsageTracker] Sync to backend (not implemented yet)');
  }

  /**
   * Archive day data to history
   */
  async archiveDay(dayData) {
    if (!this.cache.history) {
      this.cache.history = [];
    }

    // Add to history
    this.cache.history.push({
      date: dayData.date,
      requests: dayData.requests,
      tokens: dayData.tokens,
      calls: dayData.calls.slice(-50) // Keep only last 50 calls
    });

    // Keep only last 30 days of history
    if (this.cache.history.length > 30) {
      this.cache.history = this.cache.history.slice(-30);
    }
  }

  /**
   * Get date key (YYYY-MM-DD)
   */
  getDateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Get month key (YYYY-MM)
   */
  getMonthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load from storage
   */
  async loadFromStorage() {
    try {
      const data = await chrome.storage.local.get([STORAGE_KEY, USAGE_HISTORY_KEY]);
      
      this.cache = {
        current: data[STORAGE_KEY]?.current || null,
        features: data[STORAGE_KEY]?.features || {},
        history: data[USAGE_HISTORY_KEY] || []
      };
    } catch (error) {
      console.error('[UsageTracker] Failed to load from storage:', error);
      this.cache = {
        current: null,
        features: {},
        history: []
      };
    }
  }

  /**
   * Save to storage
   */
  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY]: {
          current: this.cache.current,
          features: this.cache.features
        },
        [USAGE_HISTORY_KEY]: this.cache.history
      });
    } catch (error) {
      console.error('[UsageTracker] Failed to save to storage:', error);
    }
  }

  /**
   * Ensure initialized
   */
  async ensureInitialized() {
    if (!this.cache) {
      await this.initialize();
    }
  }
}

// Create singleton instance (same pattern as auth and apiManager)
const usageTracker = new UsageTracker();

// Export both class and instance
export { UsageTracker, usageTracker };

// Make available globally
if (typeof window !== 'undefined') {
  window.usageTracker = usageTracker;
}

