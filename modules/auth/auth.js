// modules/auth/auth.js

/**
 * Main Auth Module Interface
 * Entry point cho authentication system
 */

import { OAuthHandler } from './core/oauth-handler.js';
import { sessionManager, SESSION_EVENTS as SM_EVENTS } from './core/session-manager.js';

// Re-export SESSION_EVENTS
export const SESSION_EVENTS = SM_EVENTS;

class AuthModule {
  constructor() {
    this.oauthHandler = new OAuthHandler();
    this.sessionManager = sessionManager;
    this.initialized = false;
  }

  /**
   * Initialize auth module
   */
  async initialize() {
    if (this.initialized) {
      console.log('[Auth] Already initialized');
      return;
    }

    try {
      // Info log - comment out to reduce console noise
      // console.log('[Auth] Initializing...');
      
      // Check existing session (user)
      const hasSession = await this.sessionManager.isLoggedIn();
      
      if (hasSession) {
        const user = await this.sessionManager.getCurrentUser();
        // Info log - comment out to reduce console noise
        // console.log('[Auth] Existing session found:', user?.email);
      }
      
      this.initialized = true;
      // Info log - comment out to reduce console noise
      // console.log('[Auth] ✅ Initialization complete');
      
    } catch (error) {
      console.error('[Auth] ❌ Initialization failed:', error);
    }
  }

  /**
   * Login with Google
   */
  async login() { // Xóa accountHint
    try {
      console.log('[Auth] Starting login flow...');
      
      // Step 1: Lấy token và user info từ Google (interactive: true)
      const { token, user } = await this.oauthHandler.login();
      
      // Step 2: "Establish" session (chỉ lưu user info)
      await this.sessionManager.establishSession(user);
      
      // Step 3: Verify token is cached in Chrome Identity API
      // Small delay to ensure token is cached
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Step 4: Verify token can be retrieved (non-interactive)
      try {
        const verifyToken = await new Promise((resolve, reject) => {
          chrome.identity.getAuthToken({ interactive: false }, (verifyToken) => {
            if (chrome.runtime.lastError) {
              console.warn('[Auth] Token verification failed (non-interactive):', chrome.runtime.lastError.message);
              // Token might not be cached yet, but that's okay - it will be cached on next use
              resolve(null);
            } else {
              resolve(verifyToken);
            }
          });
        });
        
        if (verifyToken && verifyToken === token) {
          console.log('[Auth] ✅ Token verified and cached');
        } else if (verifyToken) {
          console.log('[Auth] ⚠️ Token retrieved but different (might be refreshed)');
        } else {
          console.log('[Auth] ⚠️ Token not yet cached, will be cached on next API call');
        }
      } catch (verifyError) {
        console.warn('[Auth] Token verification error (non-critical):', verifyError);
        // Non-critical - token will be cached on next use
      }
      
      console.log('[Auth] ✅ Login successful:', user.email);
      
      return user;
      
    } catch (error) {
      console.error('[Auth] ❌ Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      console.log('[Auth] Logging out...');
      
      // Step 1: Thu hồi token Google và xóa cache của Chrome
      await this.oauthHandler.logout();
      
      // Step 2: Xóa user info khỏi storage
      await this.sessionManager.destroySession();
      
      console.log('[Auth] ✅ Logout successful');
      
    } catch (error) {
      console.error('[Auth] ❌ Logout failed:', error);
      throw error;
    }
  }

  /**
   * Check if logged in
   */
  async isLoggedIn() {
    try {
      // Logic này giữ nguyên, nhưng giờ nó kiểm tra `user` thay vì `session`
      return await this.sessionManager.isLoggedIn();
    } catch (error) {
      console.error('[Auth] isLoggedIn error:', error);
      return false;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    try {
      // Giữ nguyên
      return await this.sessionManager.getCurrentUser();
    } catch (error) {
      console.error('[Auth] getCurrentUser error:', error);
      return null;
    }
  }

  /**
   * Get auth token
   */
  async getToken() {
    try {
      // Logic này giữ nguyên, nhưng giờ nó gọi chrome.identity
      return await this.sessionManager.getToken();
    } catch (error) {
      console.error('[Auth] getToken error:', error);
      return null;
    }
  }

  // XÓA: refreshSession (không cần thiết ở lớp này nữa)

  /**
   * Get session stats
   */
  async getSessionStats() {
    try {
      // Giữ nguyên (logic bên trong đã được cập nhật)
      return await this.sessionManager.getSessionStats();
    } catch (error) {
      console.error('[Auth] getSessionStats error:', error);
      return {
        isActive: false,
        user: null,
        timeRemaining: 0
      };
    }
  }

  // --- Các hàm on, off giữ nguyên ---
  /**
   * Add event listener
   */
  on(event, callback) {
    this.sessionManager.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    this.sessionManager.off(event, callback);
  }
}

// Export singleton
export const auth = new AuthModule();