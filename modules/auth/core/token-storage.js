// modules/auth/core/token-storage.js

/**
 * Token Storage
 * Quản lý việc lưu trữ data người dùng
 * Sử dụng chrome.storage.local với namespace
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế các chuỗi cảnh báo (warns) bằng window.Lang.get()
 */

const STORAGE_KEYS = {
  USER_INFO: 'auth_user_info', // <-- Đổi tên từ SESSION
  GOOGLE_TOKEN: 'auth_google_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_PREFERENCES: 'auth_user_prefs'
};

export class TokenStorage {
  constructor() {
    this.cache = new Map(); // In-memory cache
  }

  /**
   * ✅ THÊM: Check if extension context is valid
   * @private
   */
  isExtensionValid() {
    try {
      return !!(chrome && chrome.storage && chrome.storage.local);
    } catch (e) {
      return false;
    }
  }

  /**
   * Store user data
   * @param {Object} user - User info object
   */
  async setUser(user) {
    try {
      if (!this.isExtensionValid()) {
        console.warn('[TokenStorage] Extension context invalid, not setting user.');
        this.cache.set(STORAGE_KEYS.USER_INFO, user); // Lưu vào cache
        return;
      }
      
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_INFO]: user
      });
      
      this.cache.set(STORAGE_KEYS.USER_INFO, user);
      console.log('[TokenStorage] User stored successfully');
      
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        // CẬP NHẬT i18n
        console.warn(`[TokenStorage] ${window.Lang ? window.Lang.get('errorContextReloadSet') : 'Extension was reloaded. User not saved.'}`);
        this.cache.set(STORAGE_KEYS.USER_INFO, user); // Fallback
        return;
      }
      console.error('[TokenStorage] Failed to store user:', error);
      throw error;
    }
  }

  /**
   * Get user data
   * @returns {Promise<Object|null>}
   */
  async getUser() {
    try {
      // Try cache first
      if (this.cache.has(STORAGE_KEYS.USER_INFO)) {
        return this.cache.get(STORAGE_KEYS.USER_INFO);
      }
      
      if (!this.isExtensionValid()) {
        console.warn('[TokenStorage] Extension context invalid, cannot get user.');
        return null;
      }

      // Get from storage
      const result = await chrome.storage.local.get(STORAGE_KEYS.USER_INFO);
      const user = result[STORAGE_KEYS.USER_INFO];
      
      if (!user) {
        return null;
      }
      
      this.cache.set(STORAGE_KEYS.USER_INFO, user);
      return user;
      
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        // CẬP NHẬT i18n
        console.warn(`[TokenStorage] ${window.Lang ? window.Lang.get('errorContextReloadGet') : 'Extension was reloaded, please refresh the page'}`);
        return null;
      }
      console.error('[TokenStorage] Failed to get user:', error);
      return null;
    }
  }

  /**
   * Clear user
   */
  async clearUser() {
    try {
      if (!this.isExtensionValid()) {
        console.warn('[TokenStorage] Extension context invalid, skipping clearUser.');
        this.cache.delete(STORAGE_KEYS.USER_INFO);
        return;
      }
      
      await chrome.storage.local.remove(STORAGE_KEYS.USER_INFO);
      this.cache.delete(STORAGE_KEYS.USER_INFO);
      
      console.log('[TokenStorage] User cleared');
      
    } catch (error) {
      console.error('[TokenStorage] Failed to clear user:', error);
      // Ném lỗi để session-manager có thể xử lý
      throw error;
    }
  }

  // --- Các hàm set/get/clearGoogleToken, set/getUserPreferences giữ nguyên ---
  // (Không có văn bản nào cần dịch)
  
  /**
   * Store Google token separately (optional)
   * @param {string} token - Google access token
   * @param {number} expiresIn - Expiry in seconds
   */
  async setGoogleToken(token, expiresIn = 3600) {
    try {
      if (!this.isExtensionValid()) return;
      const data = {
        token,
        expiresAt: Date.now() + (expiresIn * 1000)
      };
      
      await chrome.storage.local.set({
        [STORAGE_KEYS.GOOGLE_TOKEN]: data
      });
      
      this.cache.set(STORAGE_KEYS.GOOGLE_TOKEN, data);
      console.log('[TokenStorage] Google token stored');
      
    } catch (error) {
      console.error('[TokenStorage] Failed to store Google token:', error);
    }
  }

  /**
   * Get Google token
   * @returns {Promise<string|null>}
   */
  async getGoogleToken() {
    try {
      // Check cache
      if (this.cache.has(STORAGE_KEYS.GOOGLE_TOKEN)) {
        const cached = this.cache.get(STORAGE_KEYS.GOOGLE_TOKEN);
        if (cached.expiresAt > Date.now()) {
          return cached.token;
        }
      }
      
      if (!this.isExtensionValid()) return null;

      // Get from storage
      const result = await chrome.storage.local.get(STORAGE_KEYS.GOOGLE_TOKEN);
      const data = result[STORAGE_KEYS.GOOGLE_TOKEN];
      
      if (!data || data.expiresAt < Date.now()) {
        return null;
      }
      
      this.cache.set(STORAGE_KEYS.GOOGLE_TOKEN, data);
      return data.token;
      
    } catch (error) {
      console.error('[TokenStorage] Failed to get Google token:', error);
      return null;
    }
  }

  /**
   * Clear Google token
   */
  async clearGoogleToken() {
    try {
      if (!this.isExtensionValid()) {
         this.cache.delete(STORAGE_KEYS.GOOGLE_TOKEN);
         return;
      }
      await chrome.storage.local.remove(STORAGE_KEYS.GOOGLE_TOKEN);
      this.cache.delete(STORAGE_KEYS.GOOGLE_TOKEN);
      
      console.log('[TokenStorage] Google token cleared');
      
    } catch (error) {
      console.error('[TokenStorage] Failed to clear Google token:', error);
    }
  }

  /**
   * Store user preferences
   * @param {Object} preferences
   */
  async setUserPreferences(preferences) {
    try {
      if (!this.isExtensionValid()) return;
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_PREFERENCES]: preferences
      });
      console.log('[TokenStorage] User preferences saved');
    } catch (error) {
      console.error('[TokenStorage] Failed to save preferences:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   * @returns {Promise<Object>}
   */
  async getUserPreferences() {
    try {
      if (!this.isExtensionValid()) return {};
      const result = await chrome.storage.local.get(STORAGE_KEYS.USER_PREFERENCES);
      return result[STORAGE_KEYS.USER_PREFERENCES] || {};
      
    } catch (error) {
      console.error('[TokenStorage] Failed to get preferences:', error);
      return {};
    }
  }


  // --- Kết thúc các hàm giữ nguyên ---

  /**
   * Clear all auth data
   */
  async clearAll() {
    try {
      if (!this.isExtensionValid()) {
        console.warn('[TokenStorage] Extension context invalid, skipping clearAll.');
        this.cache.clear();
        return;
      }
      
      await chrome.storage.local.remove([
        STORAGE_KEYS.USER_INFO, // <-- Cập nhật
        STORAGE_KEYS.GOOGLE_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN
      ]);
      
      this.cache.clear();
      console.log('[TokenStorage] All auth data cleared');
      
    } catch (error) {
      console.error('[TokenStorage] Failed to clear all data:', error);
      throw error;
    }
  }

  // XÓA: getSession, setSession, updateSession, clearSession
  // XÓA: hasValidSession, getSessionTimeRemaining, isSessionExpiringSoon
  // THÊM: setUser, getUser, clearUser (như trên)

  /**
   * Clear in-memory cache only
   */
  clearCache() {
    this.cache.clear();
    console.log('[TokenStorage] Memory cache cleared');
  }

  // ... (Hàm getStorageStats giữ nguyên) ...
    /**
   * Get storage usage statistics
   * @returns {Promise<Object>}
   */
  async getStorageStats() {
    try {
      if (!this.isExtensionValid()) return {};
      const result = await chrome.storage.local.get(null);
      const authKeys = Object.keys(STORAGE_KEYS).map(k => STORAGE_KEYS[k]);
      const authData = {};
      
      authKeys.forEach(key => {
        if (result[key]) {
          authData[key] = {
            size: JSON.stringify(result[key]).length,
            hasData: true
          };
        } else {
          authData[key] = {
            size: 0,
            hasData: false
          };
        }
      });
      
      return authData;
      
    } catch (error) {
      console.error('[TokenStorage] Failed to get storage stats:', error);
      return {};
    }
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorage();