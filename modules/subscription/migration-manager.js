/**
 * Migration Manager
 * Handles migration from local data to backend
 */

import { tokenStorage } from '../auth/core/token-storage.js';
import { subscriptionManager } from './subscription-manager.js';
import { usageTracker } from './usage-tracker.js';
import { subscriptionAPIClient } from './subscription-api-client.js';
import { userSync } from '../auth/core/user-sync.js';

const MIGRATION_KEY = 'migration_completed';

class MigrationManager {
  constructor() {
    this.migrating = false;
  }

  /**
   * Check if migration is needed
   * @returns {Promise<boolean>}
   */
  async needsMigration() {
    try {
      const data = await chrome.storage.local.get([MIGRATION_KEY]);
      return !data[MIGRATION_KEY];
    } catch (error) {
      console.error('[MigrationManager] Failed to check migration status:', error);
      return false;
    }
  }

  /**
   * Check if local data exists
   * @returns {Promise<boolean>}
   */
  async hasLocalData() {
    try {
      // Check for user data
      const user = await tokenStorage.getUser();
      if (user) {
        return true;
      }

      // Check for subscription data
      const subscription = await subscriptionManager.getTier();
      if (subscription && subscription !== 'free') {
        return true;
      }

      // Check for usage data
      const usage = await usageTracker.getTodayUsage();
      if (usage && (usage.tokens > 0 || usage.requests > 0)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('[MigrationManager] Failed to check local data:', error);
      return false;
    }
  }

  /**
   * Migrate all data to backend
   * @returns {Promise<boolean>} Success status
   */
  async migrate() {
    if (this.migrating) {
      console.log('[MigrationManager] Migration already in progress');
      return false;
    }

    this.migrating = true;

    try {
      console.log('[MigrationManager] Starting migration...');

      // 1. Migrate user data
      await this.migrateUserData();

      // 2. Migrate subscription data
      await this.migrateSubscriptionData();

      // 3. Migrate usage data
      await this.migrateUsageData();

      // 4. Mark migration as complete
      await this.markAsMigrated();

      console.log('[MigrationManager] Migration completed successfully');
      return true;
    } catch (error) {
      console.error('[MigrationManager] Migration failed:', error);
      return false;
    } finally {
      this.migrating = false;
    }
  }

  /**
   * Migrate user data
   * @private
   */
  async migrateUserData() {
    try {
      const localUser = await tokenStorage.getUser();
      
      if (!localUser) {
        console.log('[MigrationManager] No local user data to migrate');
        return;
      }

      console.log('[MigrationManager] Migrating user data...');
      
      // Sync user to backend
      await userSync.syncToBackend(localUser);
      
      console.log('[MigrationManager] User data migrated');
    } catch (error) {
      console.error('[MigrationManager] Failed to migrate user data:', error);
      throw error;
    }
  }

  /**
   * Migrate subscription data
   * @private
   */
  async migrateSubscriptionData() {
    try {
      const tier = await subscriptionManager.getTier();
      const status = await subscriptionManager.getStatus();
      
      if (tier === 'free') {
        console.log('[MigrationManager] No subscription data to migrate (free tier)');
        return;
      }

      console.log('[MigrationManager] Migrating subscription data...');
      
      // Update subscription status on backend
      await subscriptionManager.updateSubscriptionStatus({
        tier,
        status,
        migratedAt: Date.now()
      });
      
      console.log('[MigrationManager] Subscription data migrated');
    } catch (error) {
      console.error('[MigrationManager] Failed to migrate subscription data:', error);
      throw error;
    }
  }

  /**
   * Migrate usage data
   * @private
   */
  async migrateUsageData() {
    try {
      const todayUsage = await usageTracker.getTodayUsage();
      const monthUsage = await usageTracker.getMonthUsage();
      
      if (!todayUsage || (todayUsage.tokens === 0 && todayUsage.requests === 0)) {
        console.log('[MigrationManager] No usage data to migrate');
        return;
      }

      console.log('[MigrationManager] Migrating usage data...');
      
      // Sync usage to backend
      const todayFeatureUsage = await usageTracker.getTodayFeatureUsage('recording');
      const todayTranslationUsage = await usageTracker.getTodayFeatureUsage('translation');

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
        timestamp: Date.now(),
        migrated: true
      };

      await subscriptionAPIClient.syncUsage(usageData);
      
      console.log('[MigrationManager] Usage data migrated');
    } catch (error) {
      console.error('[MigrationManager] Failed to migrate usage data:', error);
      throw error;
    }
  }

  /**
   * Mark migration as complete
   * @private
   */
  async markAsMigrated() {
    try {
      await chrome.storage.local.set({
        [MIGRATION_KEY]: {
          completed: true,
          completedAt: Date.now(),
          version: '1.0'
        }
      });
    } catch (error) {
      console.error('[MigrationManager] Failed to mark migration:', error);
      throw error;
    }
  }

  /**
   * Check if migration is complete
   * @returns {Promise<boolean>}
   */
  async isMigrated() {
    try {
      const data = await chrome.storage.local.get([MIGRATION_KEY]);
      return data[MIGRATION_KEY]?.completed === true;
    } catch (error) {
      console.error('[MigrationManager] Failed to check migration:', error);
      return false;
    }
  }

  /**
   * Reset migration (for testing)
   */
  async resetMigration() {
    try {
      await chrome.storage.local.remove(MIGRATION_KEY);
      console.log('[MigrationManager] Migration reset');
    } catch (error) {
      console.error('[MigrationManager] Failed to reset migration:', error);
    }
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager();

