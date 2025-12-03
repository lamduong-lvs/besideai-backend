// modules/auth/core/oauth-handler.js

/**
 * OAuth Handler
 * Xử lý Google OAuth2 flow sử dụng Chrome Identity API
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế các chuỗi Error bằng window.Lang.get(key)
 * - Sử dụng OAUTH_ERRORS.messageKey (từ oauth-config.js)
 */

import { OAUTH_CONFIG, OAUTH_ERRORS, buildIdentityOptions } from '../config/oauth-config.js';
import { GOOGLE_ENDPOINTS } from '../config/endpoints.js';

export class OAuthHandler {
  constructor() {
    this.currentToken = null;
    this.tokenExpiryTime = null;
  }

  /**
   * Bắt đầu OAuth flow - Lấy Google token
   * @param {string} accountHint - Email hint (optional)
   * @returns {Promise<string>} Google access token
   */
  async getGoogleToken(accountHint = null) {
    // Thoát sớm nếu i18n.js chưa sẵn sàng
    if (!window.Lang) {
      console.error("OAuthHandler: window.Lang (i18n.js) is not ready.");
      throw new Error("i18n service not loaded.");
    }
    
    try {
      console.log('[OAuth] Starting authentication flow...');
      
      const options = buildIdentityOptions();
      
      const token = await this.requestToken(options);
      
      if (!token) {
        // CẬP NHẬT i18n: Dùng messageKey từ config
        throw new Error(window.Lang.get(OAUTH_ERRORS.INVALID_TOKEN.messageKey));
      }
      
      console.log('[OAuth] Token obtained successfully');
      
      this.currentToken = token;
      this.tokenExpiryTime = Date.now() + OAUTH_CONFIG.tokenSettings.cacheDuration;
      
      return token;
      
    } catch (error) {
      console.error('[OAuth] Authentication failed:', error);
      throw this.handleOAuthError(error);
    }
  }

  /**
   * Request token using chrome.identity API
   * @private
   */
  requestToken(options) {
    return new Promise((resolve, reject) => {
      if (!chrome.identity) {
        // CẬP NHẬT i18n
        const errorMsg = window.Lang ? window.Lang.get('errorApiNotAvailable') : 'Chrome Identity API not available';
        reject(new Error(errorMsg));
        return;
      }
      
      chrome.identity.getAuthToken(options, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  }

  /**
   * Lấy thông tin user từ Google
   * @param {string} token - Google access token
   * @returns {Promise<Object>} User info
   */
  async getUserInfo(token) {
    // Thoát sớm nếu i18n.js chưa sẵn sàng
    if (!window.Lang) {
      console.error("OAuthHandler: window.Lang (i18n.js) is not ready.");
      throw new Error("i18n service not loaded.");
    }

    try {
      console.log('[OAuth] Fetching user info from Google...');
      
      const response = await fetch(GOOGLE_ENDPOINTS.userInfo, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // CẬP NHẬT i18n
        throw new Error(window.Lang.get('errorFetchUserInfo') + response.status);
      }
      
      const userInfo = await response.json();
      
      console.log('[OAuth] User info retrieved:', userInfo.email);
      
      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verified_email: userInfo.verified_email
      };
      
    } catch (error) {
      console.error('[OAuth] Failed to get user info:', error);
      throw error;
    }
  }

  /**
   * Verify token còn valid không
   * (Không thay đổi - logic nội bộ, không có lỗi cho user)
   */
  async verifyToken(token) {
    try {
      const response = await fetch(
        `${GOOGLE_ENDPOINTS.tokenInfo}?access_token=${token}`
      );
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      
      if (data.expires_in && data.expires_in > 0) {
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('[OAuth] Token verification failed:', error);
      return false;
    }
  }

  /**
   * Refresh token nếu cần
   * (Không thay đổi - logic nội bộ)
   */
  async refreshToken() {
    try {
      console.log('[OAuth] Refreshing token...');
      
      await this.removeCachedToken();
      
      const token = await this.requestToken({ interactive: false });
      
      if (token) {
        this.currentToken = token;
        this.tokenExpiryTime = Date.now() + OAUTH_CONFIG.tokenSettings.cacheDuration;
        console.log('[OAuth] Token refreshed successfully');
        return token;
      }
      
      return await this.getGoogleToken();
      
    } catch (error) {
      console.error('[OAuth] Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Revoke token (logout)
   * (Không thay đổi - logic nội bộ)
   */
  async revokeToken(token) {
    try {
      console.log('[OAuth] Revoking token...');
      
      const response = await fetch(
        `${GOOGLE_ENDPOINTS.revoke}?token=${token}`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        console.warn('[OAuth] Token revocation returned non-OK status');
      }
      
      await this.removeCachedToken();
      
      this.currentToken = null;
      this.tokenExpiryTime = null;
      
      console.log('[OAuth] Token revoked successfully');
      
    } catch (error) {
      console.error('[OAuth] Token revocation failed:', error);
      await this.removeCachedToken();
      this.currentToken = null;
      this.tokenExpiryTime = null;
    }
  }

  /**
   * Remove cached token from Chrome
   * @private
   */
  removeCachedToken() {
    return new Promise((resolve) => {
      if (!chrome.identity) {
        resolve();
        return;
      }
      
      chrome.identity.clearAllCachedAuthTokens(() => {
        console.log('[OAuth] Cached tokens cleared');
        resolve();
      });
    });
  }

  /**
   * Check if token is about to expire
   * @returns {boolean}
   */
  isTokenExpiringSoon() {
    if (!this.tokenExpiryTime) {
      return true;
    }
    
    const timeUntilExpiry = this.tokenExpiryTime - Date.now();
    return timeUntilExpiry < OAUTH_CONFIG.tokenSettings.refreshBeforeExpiry;
  }

  /**
   * Get cached token if valid
   * @returns {string|null}
   */
  getCachedToken() {
    if (this.currentToken && !this.isTokenExpiringSoon()) {
      return this.currentToken;
    }
    return null;
  }

  /**
   * Handle OAuth errors
   * @private
   * (Cập nhật i18n)
   */
  handleOAuthError(error) {
    // Thoát sớm nếu i18n.js chưa sẵn sàng
    if (!window.Lang) {
      console.error("OAuthHandler: window.Lang (i18n.js) is not ready.");
      return new Error(error.message || "i18n service not loaded.");
    }

    // User cancelled
    if (error.message && (error.message.includes('cancel') || error.message.includes('User declining'))) {
      // Dùng key từ config
      return new Error(window.Lang.get(OAUTH_ERRORS.USER_CANCELLED.messageKey));
    }
    
    // Network error
    if (error.message && error.message.includes('network')) {
      // Dùng key từ config
      return new Error(window.Lang.get(OAUTH_ERRORS.NETWORK_ERROR.messageKey));
    }
    
    // Token revoked
    if (error.message && error.message.includes('revoked')) {
      // Dùng key từ config
      return new Error(window.Lang.get(OAUTH_ERRORS.TOKEN_REVOKED.messageKey));
    }
    
    // Unknown error
    // Dùng key từ config
    return new Error(window.Lang.get(OAUTH_ERRORS.UNKNOWN_ERROR.messageKey) + ': ' + error.message);
  }

  /**
   * Complete login flow
   * Supports both Chrome Identity API (default) and Web-based OAuth
   */
  async login(accountHint = null, useWebFlow = false) {
    try {
      let token;
      
      if (useWebFlow) {
        // Web-based OAuth flow: Open web login page
        console.log('[OAuth] Starting web-based login flow...');
        token = await this.loginViaWeb();
      } else {
        // Chrome Identity API flow (default)
        token = await this.getGoogleToken();
      }
      
      const user = await this.getUserInfo(token);
      
      return { token, user };
      
    } catch (error) {
      console.error('[OAuth] Login failed:', error);
      throw error;
    }
  }

  /**
   * Login via web page (opens web login, redirects back to extension)
   * This method opens a web login page and waits for the callback.html to send the token
   */
  async loginViaWeb() {
    return new Promise((resolve, reject) => {
      // Generate unique promise ID first
      const promiseId = `web_auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get extension ID
      const extensionId = chrome.runtime.id;
      const callbackUrl = chrome.runtime.getURL('modules/auth/callback.html');
      
      // Build web login URL with extension callback
      const webLoginUrl = new URL('https://besideai.work/login');
      webLoginUrl.searchParams.set('extension_callback', callbackUrl);
      webLoginUrl.searchParams.set('extension_id', extensionId);
      webLoginUrl.searchParams.set('promise_id', promiseId);
      
      console.log('[OAuth] Opening web login page:', webLoginUrl.toString());
      
      // Open web login in new tab
      chrome.tabs.create({ url: webLoginUrl.toString() }, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        const tabId = tab.id;
        console.log('[OAuth] Web login tab opened:', tabId);
        
        // Store promise info in chrome.storage (accessible from background)
        chrome.storage.local.set({
          [`web_auth_pending_${promiseId}`]: {
            tabId: tabId,
            timestamp: Date.now()
          }
        });
        
        // Use chrome.storage.onChanged to detect when token is stored
        const storageListener = (changes, areaName) => {
          if (areaName === 'local' && changes.web_auth_token && changes.web_auth_token.newValue) {
            const storedToken = changes.web_auth_token.newValue;
            console.log('[OAuth] Received token from web callback via storage');
            
            // Remove listener
            chrome.storage.onChanged.removeListener(storageListener);
            
            // Close the login tab
            chrome.tabs.remove(tabId).catch(() => {});
            
            // Clean up storage
            chrome.storage.local.remove(`web_auth_pending_${promiseId}`);
            
            resolve(storedToken);
          }
        };
        
        chrome.storage.onChanged.addListener(storageListener);
        
        // Also listen for direct message from background (fallback)
        const messageListener = (message, sender, sendResponse) => {
          if (message.action === 'auth_web_callback_token' && 
              (message.promiseId === promiseId || message.promiseId === 'any')) {
            console.log('[OAuth] Received token from web callback via message');
            
            // Remove listeners
            chrome.runtime.onMessage.removeListener(messageListener);
            chrome.storage.onChanged.removeListener(storageListener);
            
            // Close the login tab
            chrome.tabs.remove(tabId).catch(() => {});
            
            // Clean up storage
            chrome.storage.local.remove(`web_auth_pending_${promiseId}`);
            
            if (message.token) {
              resolve(message.token);
            } else {
              reject(new Error(message.error || 'No token received'));
            }
          }
        };
        
        chrome.runtime.onMessage.addListener(messageListener);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(messageListener);
          chrome.storage.onChanged.removeListener(storageListener);
          chrome.tabs.remove(tabId).catch(() => {});
          chrome.storage.local.remove(`web_auth_pending_${promiseId}`);
          reject(new Error('Login timeout. Please try again.'));
        }, 5 * 60 * 1000);
      });
    });
  }

  /**
   * Logout - revoke token
   * (Không thay đổi)
   */
  async logout() {
    try {
      if (this.currentToken) {
        await this.revokeToken(this.currentToken);
      } else {
        try {
          const token = await this.requestToken({ interactive: false });
          if (token) {
            await this.revokeToken(token);
          }
        } catch (e) {
          // Ignore errors
        }
      }
      
      console.log('[OAuth] Logout completed');
      
    } catch (error) {
      console.error('[OAuth] Logout error:', error);
      throw error;
    }
  }
}