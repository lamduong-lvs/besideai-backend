/**
 * Google Meet Storage Utilities
 * Wrapper cho chrome.storage với helper functions
 */

class MeetStorage {
    constructor(prefix = 'meet_') {
        this.prefix = prefix;
        this.cache = new Map();
        this.useCache = true;
    }

    /**
     * Get prefixed key
     */
    getKey(key) {
        return `${this.prefix}${key}`;
    }

    /**
     * Get single value
     */
    async get(key, defaultValue = null) {
        const prefixedKey = this.getKey(key);

        // Check cache first
        if (this.useCache && this.cache.has(prefixedKey)) {
            return this.cache.get(prefixedKey);
        }

        try {
            const result = await chrome.storage.local.get(prefixedKey);
            const value = result[prefixedKey];

            if (value !== undefined) {
                // Update cache
                if (this.useCache) {
                    this.cache.set(prefixedKey, value);
                }
                return value;
            }

            return defaultValue;

        } catch (error) {
            console.error('[MeetStorage] Error getting value:', error);
            return defaultValue;
        }
    }

    /**
     * Get multiple values
     */
    async getMultiple(keys, defaultValues = {}) {
        const prefixedKeys = keys.map(key => this.getKey(key));
        const result = {};

        try {
            const data = await chrome.storage.local.get(prefixedKeys);

            keys.forEach(key => {
                const prefixedKey = this.getKey(key);
                const value = data[prefixedKey];

                if (value !== undefined) {
                    result[key] = value;
                    // Update cache
                    if (this.useCache) {
                        this.cache.set(prefixedKey, value);
                    }
                } else {
                    result[key] = defaultValues[key] || null;
                }
            });

            return result;

        } catch (error) {
            console.error('[MeetStorage] Error getting multiple values:', error);
            return defaultValues;
        }
    }

    /**
     * Set single value
     */
    async set(key, value) {
        const prefixedKey = this.getKey(key);

        try {
            await chrome.storage.local.set({ [prefixedKey]: value });

            // Update cache
            if (this.useCache) {
                this.cache.set(prefixedKey, value);
            }

            return true;

        } catch (error) {
            console.error('[MeetStorage] Error setting value:', error);
            
            // Check if quota exceeded
            if (error.message && error.message.includes('QUOTA')) {
                console.error('[MeetStorage] Storage quota exceeded');
            }
            
            return false;
        }
    }

    /**
     * Set multiple values
     */
    async setMultiple(data) {
        const prefixedData = {};

        Object.entries(data).forEach(([key, value]) => {
            const prefixedKey = this.getKey(key);
            prefixedData[prefixedKey] = value;

            // Update cache
            if (this.useCache) {
                this.cache.set(prefixedKey, value);
            }
        });

        try {
            await chrome.storage.local.set(prefixedData);
            return true;

        } catch (error) {
            console.error('[MeetStorage] Error setting multiple values:', error);
            return false;
        }
    }

    /**
     * Remove single value
     */
    async remove(key) {
        const prefixedKey = this.getKey(key);

        try {
            await chrome.storage.local.remove(prefixedKey);

            // Remove from cache
            if (this.useCache) {
                this.cache.delete(prefixedKey);
            }

            return true;

        } catch (error) {
            console.error('[MeetStorage] Error removing value:', error);
            return false;
        }
    }

    /**
     * Remove multiple values
     */
    async removeMultiple(keys) {
        const prefixedKeys = keys.map(key => this.getKey(key));

        try {
            await chrome.storage.local.remove(prefixedKeys);

            // Remove from cache
            if (this.useCache) {
                prefixedKeys.forEach(key => this.cache.delete(key));
            }

            return true;

        } catch (error) {
            console.error('[MeetStorage] Error removing multiple values:', error);
            return false;
        }
    }

    /**
     * Clear all with prefix
     */
    async clear() {
        try {
            const allData = await chrome.storage.local.get(null);
            const keysToRemove = Object.keys(allData).filter(key => 
                key.startsWith(this.prefix)
            );

            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
            }

            // Clear cache
            if (this.useCache) {
                this.cache.clear();
            }

            return true;

        } catch (error) {
            console.error('[MeetStorage] Error clearing storage:', error);
            return false;
        }
    }

    /**
     * Get all keys with prefix
     */
    async getAllKeys() {
        try {
            const allData = await chrome.storage.local.get(null);
            return Object.keys(allData)
                .filter(key => key.startsWith(this.prefix))
                .map(key => key.replace(this.prefix, ''));

        } catch (error) {
            console.error('[MeetStorage] Error getting all keys:', error);
            return [];
        }
    }

    /**
     * Get all data with prefix
     */
    async getAll() {
        try {
            const allData = await chrome.storage.local.get(null);
            const result = {};

            Object.entries(allData).forEach(([key, value]) => {
                if (key.startsWith(this.prefix)) {
                    const unprefixedKey = key.replace(this.prefix, '');
                    result[unprefixedKey] = value;
                }
            });

            return result;

        } catch (error) {
            console.error('[MeetStorage] Error getting all data:', error);
            return {};
        }
    }

    /**
     * Check if key exists
     */
    async has(key) {
        const value = await this.get(key);
        return value !== null;
    }

    /**
     * Get storage usage
     */
    async getUsage() {
        try {
            const bytesInUse = await chrome.storage.local.getBytesInUse(null);
            const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default

            return {
                used: bytesInUse,
                quota: quota,
                available: quota - bytesInUse,
                percentage: (bytesInUse / quota) * 100
            };

        } catch (error) {
            console.error('[MeetStorage] Error getting usage:', error);
            return null;
        }
    }

    /**
     * Get usage for specific keys
     */
    async getKeysUsage(keys) {
        const prefixedKeys = keys.map(key => this.getKey(key));

        try {
            const bytesInUse = await chrome.storage.local.getBytesInUse(prefixedKeys);
            return bytesInUse;

        } catch (error) {
            console.error('[MeetStorage] Error getting keys usage:', error);
            return 0;
        }
    }

    /**
     * Watch for changes
     */
    watch(key, callback) {
        const prefixedKey = this.getKey(key);

        const listener = (changes, areaName) => {
            if (areaName !== 'local') return;

            if (changes[prefixedKey]) {
                const { oldValue, newValue } = changes[prefixedKey];
                callback(newValue, oldValue);

                // Update cache
                if (this.useCache) {
                    this.cache.set(prefixedKey, newValue);
                }
            }
        };

        chrome.storage.onChanged.addListener(listener);

        // Return unwatch function
        return () => {
            chrome.storage.onChanged.removeListener(listener);
        };
    }

    /**
     * Watch for any changes with prefix
     */
    watchAll(callback) {
        const listener = (changes, areaName) => {
            if (areaName !== 'local') return;

            const relevantChanges = {};

            Object.entries(changes).forEach(([key, change]) => {
                if (key.startsWith(this.prefix)) {
                    const unprefixedKey = key.replace(this.prefix, '');
                    relevantChanges[unprefixedKey] = change;

                    // Update cache
                    if (this.useCache) {
                        this.cache.set(key, change.newValue);
                    }
                }
            });

            if (Object.keys(relevantChanges).length > 0) {
                callback(relevantChanges);
            }
        };

        chrome.storage.onChanged.addListener(listener);

        // Return unwatch function
        return () => {
            chrome.storage.onChanged.removeListener(listener);
        };
    }

    /**
     * Increment numeric value
     */
    async increment(key, amount = 1) {
        const value = await this.get(key, 0);
        const newValue = (typeof value === 'number' ? value : 0) + amount;
        await this.set(key, newValue);
        return newValue;
    }

    /**
     * Decrement numeric value
     */
    async decrement(key, amount = 1) {
        return await this.increment(key, -amount);
    }

    /**
     * Toggle boolean value
     */
    async toggle(key) {
        const value = await this.get(key, false);
        const newValue = !value;
        await this.set(key, newValue);
        return newValue;
    }

    /**
     * Push to array
     */
    async push(key, item) {
        const array = await this.get(key, []);
        if (Array.isArray(array)) {
            array.push(item);
            await this.set(key, array);
            return array;
        }
        return null;
    }

    /**
     * Pop from array
     */
    async pop(key) {
        const array = await this.get(key, []);
        if (Array.isArray(array) && array.length > 0) {
            const item = array.pop();
            await this.set(key, array);
            return item;
        }
        return null;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Enable/disable cache
     */
    setUseCache(enabled) {
        this.useCache = enabled;
        if (!enabled) {
            this.clearCache();
        }
    }

    /**
     * Export all data
     */
    async export() {
        const allData = await this.getAll();
        return JSON.stringify(allData, null, 2);
    }

    /**
     * Import data
     */
    async import(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            await this.setMultiple(data);
            return true;
        } catch (error) {
            console.error('[MeetStorage] Error importing data:', error);
            return false;
        }
    }

    /**
     * Backup data
     */
    async backup() {
        const data = await this.getAll();
        return {
            timestamp: Date.now(),
            prefix: this.prefix,
            data: data
        };
    }

    /**
     * Restore from backup
     */
    async restore(backup) {
        if (!backup || !backup.data) {
            return false;
        }

        try {
            await this.setMultiple(backup.data);
            return true;
        } catch (error) {
            console.error('[MeetStorage] Error restoring backup:', error);
            return false;
        }
    }
}

// Create default instance
const meetStorage = new MeetStorage('meet_');

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MeetStorage,
        meetStorage
    };
}

// Make available globally
window.MeetStorage = MeetStorage;
window.meetStorage = meetStorage;