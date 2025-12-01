/**
 * Conflict Resolver
 * Handles conflicts between local and backend data
 */

class ConflictResolver {
  constructor() {
    this.conflictLog = [];
  }

  /**
   * Resolve subscription conflict
   * @param {Object} localData - Local subscription data
   * @param {Object} backendData - Backend subscription data
   * @param {string} strategy - Resolution strategy ('backend-wins' | 'local-wins' | 'merge')
   * @returns {Object} Resolved data
   */
  resolveSubscriptionConflict(localData, backendData, strategy = 'backend-wins') {
    if (!backendData) {
      return localData;
    }

    if (!localData) {
      return backendData;
    }

    switch (strategy) {
      case 'backend-wins':
        return this.backendWins(localData, backendData);
      
      case 'local-wins':
        return this.localWins(localData, backendData);
      
      case 'merge':
        return this.mergeSubscription(localData, backendData);
      
      default:
        return this.backendWins(localData, backendData);
    }
  }

  /**
   * Resolve usage conflict
   * @param {Object} localUsage - Local usage data
   * @param {Object} backendUsage - Backend usage data
   * @param {string} strategy - Resolution strategy
   * @returns {Object} Resolved usage data
   */
  resolveUsageConflict(localUsage, backendUsage, strategy = 'merge') {
    if (!backendUsage) {
      return localUsage;
    }

    if (!localUsage) {
      return backendUsage;
    }

    switch (strategy) {
      case 'backend-wins':
        return backendUsage;
      
      case 'local-wins':
        return localUsage;
      
      case 'merge':
        return this.mergeUsage(localUsage, backendUsage);
      
      default:
        return this.mergeUsage(localUsage, backendUsage);
    }
  }

  /**
   * Backend wins strategy
   * @private
   */
  backendWins(localData, backendData) {
    this.logConflict('subscription', 'backend-wins', localData, backendData);
    return backendData;
  }

  /**
   * Local wins strategy
   * @private
   */
  localWins(localData, backendData) {
    this.logConflict('subscription', 'local-wins', localData, backendData);
    return localData;
  }

  /**
   * Merge subscription data
   * @private
   */
  mergeSubscription(localData, backendData) {
    // Backend tier is source of truth
    // But keep local metadata if exists
    const merged = {
      ...backendData,
      // Keep local metadata
      ...(localData.metadata && { metadata: localData.metadata })
    };

    this.logConflict('subscription', 'merge', localData, backendData, merged);
    return merged;
  }

  /**
   * Merge usage data
   * @private
   */
  mergeUsage(localUsage, backendUsage) {
    // Use maximum values to avoid losing usage data
    const merged = {
      tokens: {
        today: Math.max(localUsage.tokens?.today || 0, backendUsage.tokens?.today || 0),
        month: Math.max(localUsage.tokens?.month || 0, backendUsage.tokens?.month || 0),
        limit: backendUsage.tokens?.limit || localUsage.tokens?.limit || 0
      },
      requests: {
        today: Math.max(localUsage.requests?.today || 0, backendUsage.requests?.today || 0),
        month: Math.max(localUsage.requests?.month || 0, backendUsage.requests?.month || 0),
        limit: backendUsage.requests?.limit || localUsage.requests?.limit || 0
      },
      time: {
        recording: Math.max(localUsage.time?.recording || 0, backendUsage.time?.recording || 0),
        translation: Math.max(localUsage.time?.translation || 0, backendUsage.time?.translation || 0),
        limit: backendUsage.time?.limit || localUsage.time?.limit || 0
      },
      lastSyncedAt: Math.max(
        localUsage.lastSyncedAt || 0,
        backendUsage.lastSyncedAt || 0
      )
    };

    this.logConflict('usage', 'merge', localUsage, backendUsage, merged);
    return merged;
  }

  /**
   * Log conflict for debugging
   * @private
   */
  logConflict(type, strategy, localData, backendData, resolved = null) {
    const conflict = {
      type,
      strategy,
      timestamp: Date.now(),
      local: localData,
      backend: backendData,
      resolved: resolved || (strategy === 'backend-wins' ? backendData : localData)
    };

    this.conflictLog.push(conflict);

    // Keep only last 50 conflicts
    if (this.conflictLog.length > 50) {
      this.conflictLog = this.conflictLog.slice(-50);
    }

    console.log(`[ConflictResolver] ${type} conflict resolved using ${strategy}:`, conflict);
  }

  /**
   * Get conflict log
   * @returns {Array} Conflict log
   */
  getConflictLog() {
    return [...this.conflictLog];
  }

  /**
   * Clear conflict log
   */
  clearConflictLog() {
    this.conflictLog = [];
  }

  /**
   * Detect if there's a conflict
   * @param {Object} localData - Local data
   * @param {Object} backendData - Backend data
   * @returns {boolean}
   */
  hasConflict(localData, backendData) {
    if (!localData || !backendData) {
      return false;
    }

    // Check for subscription tier conflict
    if (localData.tier && backendData.tier && localData.tier !== backendData.tier) {
      return true;
    }

    // Check for usage conflicts (significant difference)
    if (localData.usage && backendData.usage) {
      const tokenDiff = Math.abs(
        (localData.usage.tokens?.today || 0) - (backendData.usage.tokens?.today || 0)
      );
      
      if (tokenDiff > 1000) { // More than 1000 tokens difference
        return true;
      }
    }

    return false;
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();

