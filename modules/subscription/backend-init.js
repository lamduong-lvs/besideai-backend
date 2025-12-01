/**
 * Backend Initialization
 * Centralized initialization for all backend-related sync systems
 */

import { userSync } from '../auth/core/user-sync.js';
import { subscriptionManager } from './subscription-manager.js';
import { usageTracker } from './usage-tracker.js';
import { migrationManager } from './migration-manager.js';
import { subscriptionAPIClient } from './subscription-api-client.js';

class BackendInit {
  constructor() {
    this.initialized = false;
    this.syncStarted = false;
  }

  /**
   * Initialize all backend systems
   * @param {Object} options - Initialization options
   * @param {boolean} options.startSync - Start periodic sync (default: true)
   * @param {boolean} options.checkMigration - Check and run migration (default: true)
   * @param {boolean} options.syncOnInit - Sync immediately on init (default: false)
   */
  async initialize(options = {}) {
    if (this.initialized) {
      return;
    }

    const {
      startSync = true,
      checkMigration = true,
      syncOnInit = false
    } = options;

    try {
      console.log('[BackendInit] Initializing backend systems...');

      // 1. Initialize API client first
      await subscriptionAPIClient.initialize();
      console.log('[BackendInit] API client initialized');

      // 2. Check backend availability
      const isAvailable = await subscriptionAPIClient.isBackendAvailable();
      
      if (isAvailable) {
        console.log('[BackendInit] Backend available, enabling sync');
      } else {
        // This is expected when backend is not ready - don't log as warning
        // Only log if in development mode for debugging
        if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
          console.log('[BackendInit] Backend unavailable (expected if not configured), using local mode');
        }
      }

      // 3. Check and run migration if needed
      if (checkMigration && isAvailable) {
        const needsMigration = await migrationManager.needsMigration();
        const hasLocalData = await migrationManager.hasLocalData();

        if (needsMigration && hasLocalData) {
          console.log('[BackendInit] Running migration...');
          try {
            await migrationManager.migrate();
            console.log('[BackendInit] Migration completed');
          } catch (error) {
            console.error('[BackendInit] Migration failed:', error);
            // Continue even if migration fails
          }
        }
      }

      // 4. Initial sync if requested
      if (syncOnInit && isAvailable) {
        await this.performInitialSync();
      }

      // 5. Start periodic syncs
      if (startSync && isAvailable) {
        this.startPeriodicSyncs();
      }

      this.initialized = true;
      console.log('[BackendInit] Backend systems initialized successfully');
    } catch (error) {
      console.error('[BackendInit] Initialization failed:', error);
      // Continue even if initialization fails (graceful degradation)
      this.initialized = true;
    }
  }

  /**
   * Perform initial sync from backend
   * @private
   */
  async performInitialSync() {
    try {
      console.log('[BackendInit] Performing initial sync...');

      // Sync in parallel
      await Promise.allSettled([
        userSync.syncFromBackend(),
        subscriptionManager.syncSubscriptionFromBackend(),
        usageTracker.syncUsageToBackend()
      ]);

      console.log('[BackendInit] Initial sync completed');
    } catch (error) {
      console.error('[BackendInit] Initial sync failed:', error);
    }
  }

  /**
   * Start periodic syncs
   */
  startPeriodicSyncs() {
    if (this.syncStarted) {
      return;
    }

    try {
      userSync.startPeriodicSync();
      usageTracker.startPeriodicSync();
      this.syncStarted = true;
      console.log('[BackendInit] Periodic syncs started');
    } catch (error) {
      console.error('[BackendInit] Failed to start periodic syncs:', error);
    }
  }

  /**
   * Stop periodic syncs
   */
  stopPeriodicSyncs() {
    try {
      userSync.stopPeriodicSync();
      usageTracker.stopPeriodicSync();
      this.syncStarted = false;
      console.log('[BackendInit] Periodic syncs stopped');
    } catch (error) {
      console.error('[BackendInit] Failed to stop periodic syncs:', error);
    }
  }

  /**
   * Manual sync all data
   * @returns {Promise<Object>} Sync results
   */
  async syncAll() {
    try {
      const results = await Promise.allSettled([
        userSync.syncFromBackend(),
        subscriptionManager.syncSubscriptionFromBackend(),
        usageTracker.syncUsageToBackend()
      ]);

      return {
        user: results[0].status === 'fulfilled' ? results[0].value : null,
        subscription: results[1].status === 'fulfilled' ? results[1].value : null,
        usage: results[2].status === 'fulfilled' ? results[2].value : null,
        errors: results
          .map((r, i) => r.status === 'rejected' ? { index: i, error: r.reason } : null)
          .filter(Boolean)
      };
    } catch (error) {
      console.error('[BackendInit] Sync all failed:', error);
      throw error;
    }
  }

  /**
   * Check backend health
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      return await subscriptionAPIClient.isBackendAvailable();
    } catch (error) {
      console.error('[BackendInit] Health check failed:', error);
      return false;
    }
  }

  /**
   * Set backend URL
   * @param {string} url - Backend URL
   */
  async setBackendURL(url) {
    try {
      await subscriptionAPIClient.setBackendURL(url);
      console.log('[BackendInit] Backend URL set to:', url);
      
      // Re-initialize if already initialized
      if (this.initialized) {
        await this.initialize({ startSync: this.syncStarted });
      }
    } catch (error) {
      console.error('[BackendInit] Failed to set backend URL:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const backendInit = new BackendInit();

