/**
 * User Profile Sync
 * Syncs user profile data between local storage and backend
 */

import { apiClient } from './api-client.js';
import { tokenStorage } from './token-storage.js';

class UserSync {
  constructor() {
    this.syncing = false;
    this.lastSyncTime = null;
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Sync user profile from backend
   * @returns {Promise<Object|null>} User profile or null if failed
   */
  async syncFromBackend() {
    if (this.syncing) {
      console.log('[UserSync] Already syncing, skipping...');
      return null;
    }

    this.syncing = true;

    try {
      console.log('[UserSync] Syncing user profile from backend...');
      
      const user = await apiClient.get('/api/users/me');
      
      if (user) {
        // Merge with local data (preserve local preferences if not in backend)
        const localUser = await tokenStorage.getUser();
        const mergedUser = this.mergeUserData(localUser, user);
        
        // Save merged data
        await tokenStorage.setUser(mergedUser);
        
        this.lastSyncTime = Date.now();
        console.log('[UserSync] User profile synced successfully');
        
        return mergedUser;
      }
      
      return null;
    } catch (error) {
      // Don't log as error if it's auth expired or network error (expected)
      if (error.message?.includes('Authentication expired')) {
        console.warn('[UserSync] Authentication expired, using local data');
      } else if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        console.warn('[UserSync] Network error, using local data:', error.message);
      } else if (error.message?.includes('window is not defined')) {
        // Service Worker context - this is expected
        console.warn('[UserSync] Service Worker context, using local data');
      } else {
        console.error('[UserSync] Failed to sync from backend:', error);
      }
      
      // If backend unavailable, return local data
      const localUser = await tokenStorage.getUser();
      return localUser;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Sync user profile to backend
   * @param {Object} userData - User data to sync
   * @returns {Promise<boolean>} Success status
   */
  async syncToBackend(userData) {
    if (this.syncing) {
      console.log('[UserSync] Already syncing, skipping...');
      return false;
    }

    this.syncing = true;

    try {
      console.log('[UserSync] Syncing user profile to backend...');
      
      await apiClient.put('/api/users/me', {
        preferences: userData.preferences || {},
        updatedAt: Date.now()
      });
      
      this.lastSyncTime = Date.now();
      console.log('[UserSync] User profile synced to backend successfully');
      
      return true;
    } catch (error) {
      // Don't log as error if it's auth expired or network error (expected)
      if (error.message?.includes('Authentication expired')) {
        console.warn('[UserSync] Authentication expired, skipping sync');
      } else if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        console.warn('[UserSync] Network error, skipping sync:', error.message);
      } else if (error.message?.includes('window is not defined')) {
        // Service Worker context - this is expected
        console.warn('[UserSync] Service Worker context, skipping sync');
      } else {
        console.error('[UserSync] Failed to sync to backend:', error);
      }
      return false;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Get user from backend
   * @returns {Promise<Object|null>} User profile or null
   */
  async getUserFromBackend() {
    try {
      const user = await apiClient.get('/api/users/me');
      return user;
    } catch (error) {
      console.error('[UserSync] Failed to get user from backend:', error);
      return null;
    }
  }

  /**
   * Merge local and backend user data
   * @param {Object|null} localUser - Local user data
   * @param {Object} backendUser - Backend user data
   * @returns {Object} Merged user data
   */
  mergeUserData(localUser, backendUser) {
    if (!localUser) {
      return backendUser;
    }

    // Merge preferences (local takes precedence for user experience)
    const mergedPreferences = {
      ...(backendUser.preferences || {}),
      ...(localUser.preferences || {})
    };

    return {
      // Backend data (source of truth)
      id: backendUser.id || localUser.id,
      email: backendUser.email || localUser.email,
      name: backendUser.name || localUser.name,
      picture: backendUser.picture || localUser.picture,
      googleId: backendUser.googleId || localUser.googleId,
      verified_email: backendUser.verified_email ?? localUser.verified_email,
      
      // Timestamps
      createdAt: backendUser.createdAt || localUser.createdAt,
      updatedAt: backendUser.updatedAt || Date.now(),
      
      // Merged preferences
      preferences: mergedPreferences,
      
      // Keep local metadata if exists
      ...(localUser.metadata && { metadata: localUser.metadata })
    };
  }

  /**
   * Update user preferences
   * @param {Object} preferences - Preferences to update
   * @returns {Promise<boolean>} Success status
   */
  async updatePreferences(preferences) {
    try {
      // Update local first
      const localUser = await tokenStorage.getUser();
      if (localUser) {
        localUser.preferences = {
          ...(localUser.preferences || {}),
          ...preferences
        };
        await tokenStorage.setUser(localUser);
      }

      // Sync to backend (non-blocking)
      this.syncToBackend({ preferences }).catch(err => {
        console.warn('[UserSync] Failed to sync preferences to backend:', err);
      });

      return true;
    } catch (error) {
      console.error('[UserSync] Failed to update preferences:', error);
      return false;
    }
  }

  /**
   * Check if sync is needed
   * @returns {boolean}
   */
  needsSync() {
    if (!this.lastSyncTime) {
      return true;
    }
    
    return (Date.now() - this.lastSyncTime) > this.syncInterval;
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
        this.syncFromBackend().catch(err => {
          console.warn('[UserSync] Periodic sync failed:', err);
        });
      }
    }, this.syncInterval);
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
}

// Export singleton instance
export const userSync = new UserSync();

