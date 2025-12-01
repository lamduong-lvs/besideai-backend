// modules/auth/core/session-manager.js

/**
 * Session Manager
 * Quản lý session (lưu user) và lấy token từ chrome.identity
 * Emit events khi session thay đổi
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế các chuỗi Error và fallback (Đã đăng nhập, Unknown) bằng window.Lang.get()
 */

import { tokenStorage } from './token-storage.js';
// Xóa: buildURL, AUTH_ENDPOINTS (không cần cho local flow)

// Session events
export const SESSION_EVENTS = {
  CREATED: 'session:created',
  // Xóa: UPDATED, REFRESHED (không cần nữa)
  EXPIRED: 'session:expired', // Dùng khi get token thất bại
  DESTROYED: 'session:destroyed'
};

export class SessionManager {
  constructor() {
    this.eventListeners = new Map();
    // XÓA: refreshTimer, isRefreshing
    // XÓA: startSessionMonitoring()
  }

  /**
   * Establish session by storing user info
   * Now also syncs with backend
   */
  async establishSession(user) {
    try {
      console.log('[SessionManager] Establishing session...');
      
      await tokenStorage.setUser(user);
      
      // Sync user to backend (non-blocking)
      if (typeof window !== 'undefined') {
        // Lazy load userSync to avoid service worker issues
        import('../user-sync.js').then(({ userSync }) => {
          userSync.syncToBackend(user).catch(err => {
            console.warn('[SessionManager] Failed to sync user to backend:', err);
          });
        }).catch(err => {
          console.warn('[SessionManager] Failed to load userSync:', err);
        });
      }
      
      this.emit(SESSION_EVENTS.CREATED, user);
      
      console.log('[SessionManager] Session established successfully');
      
      return { user };
      
    } catch (error) {
      console.error('[SessionManager] Failed to establish session:', error);
      throw error;
    }
  }

  // XÓA: createSession, createLocalSession

  /**
   * Get current session (user object)
   * (Không thay đổi)
   */
  async getSession() {
    return await tokenStorage.getUser();
  }

  /**
   * Check if user is logged in
   * (Không thay đổi)
   */
  async isLoggedIn() {
    const session = await this.getSession();
    return session !== null;
  }

  /**
   * Get current user
   * (Không thay đổi)
   */
  async getCurrentUser() {
    const session = await this.getSession();
    return session || null;
  }

  /**
   * Get session token (từ chrome.identity)
   * (Cập nhật i18n)
   */
  async getToken() {
    // ✅ Đây là thay đổi cốt lõi
    return new Promise((resolve, reject) => {
      try {
        if (!chrome.identity) {
          // CẬP NHẬT i18n
          const errorMsg = window.Lang ? window.Lang.get('errorApiNotAvailable') : 'Chrome Identity API not available';
          return reject(new Error(errorMsg));
        }
        
        // Tự động cache và refresh
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (chrome.runtime.lastError) {
            // Lỗi này có nghĩa là người dùng đã đăng xuất hoặc thu hồi quyền
            console.warn('[SessionManager] Failed to get token (interactive: false):', chrome.runtime.lastError.message);
            // Kích hoạt event hết hạn để UI có thể cập nhật
            this.emit(SESSION_EVENTS.EXPIRED);
            resolve(null); // Trả về null, không reject
          } else {
            resolve(token);
          }
        });
      } catch (error) {
        console.error('[SessionManager] Error in getToken:', error);
        reject(error);
      }
    });
  }

  // XÓA: refreshSession (chrome.identity tự làm)

  /**
   * Destroy session (logout)
   * (Không thay đổi)
   */
  async destroySession() {
    try {
      console.log('[SessionManager] Destroying session...');
      
      // XÓA: Gọi backend logout

      // Clear local storage
      await tokenStorage.clearUser();
      await tokenStorage.clearGoogleToken();
      
      // XÓA: Dừng refresh timer
      
      this.emit(SESSION_EVENTS.DESTROYED);
      
      console.log('[SessionManager] Session destroyed');
      
    } catch (error) {
      // ✅ Xử lý lỗi context invalidated
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('[SessionManager] Context invalidated during destroySession. Emitting event anyway.');
        this.emit(SESSION_EVENTS.DESTROYED);
      } else {
        console.error('[SessionManager] Failed to destroy session:', error);
        throw error;
      }
    }
  }

  // XÓA: startSessionMonitoring, stopSessionMonitoring

  // --- Các hàm on, off, emit giữ nguyên ---
  
  /**
   * Add event listener
   * @param {string} event - Event name from SESSION_EVENTS
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit event
   * @private
   */
  emit(event, data = null) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[SessionManager] Event listener error (${event}):`, error);
      }
    });
    
    // Also dispatch as window event for cross-component communication
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
  }

  // --- Kết thúc các hàm giữ nguyên ---

  /**
   * Get session stats
   * @returns {Promise<Object>}
   * (Cập nhật i18n)
   */
  async getSessionStats() {
    // Thoát sớm nếu i18n.js chưa sẵn sàng
    if (!window.Lang) {
      console.error("SessionManager: window.Lang (i18n.js) is not ready.");
      return { isActive: false, user: null, timeRemaining: 0 };
    }

    const user = await this.getSession();
    
    if (!user) {
      return {
        isActive: false,
        user: null,
        timeRemaining: 0
      };
    }
    
    // Lấy ngôn ngữ hiện tại để định dạng ngày (nếu có)
    const langCode = window.Lang.getCurrentLanguage();
    
    // ✅ Sửa logic: Không còn thời gian hết hạn
    return {
      isActive: true,
      user: user,
      timeRemaining: Infinity, // Vô hạn
      // CẬP NHẬT i18n
      timeRemainingFormatted: window.Lang.get('loggedInStatus'),
      expiresAt: null, // Không có
      // CẬP NHẬT i18n
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleString(langCode) : window.Lang.get('unknown')
    };
  }

  // XÓA: formatTime
}

// Export singleton
export const sessionManager = new SessionManager();