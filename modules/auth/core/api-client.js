// modules/auth/core/api-client.js

/**
 * Authenticated API Client
 * Tự động attach auth headers và handle 401 errors
 * Wrapper for fetch with authentication
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế các chuỗi Error bằng window.Lang.get()
 */

import { sessionManager } from './session-manager.js';
import { getAPIBaseURL, REQUEST_SETTINGS, HTTP_STATUS } from '../config/endpoints.js';

export class APIClient {
  constructor(baseURL = null) {
    this.baseURL = baseURL || getAPIBaseURL();
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Make authenticated request
   * @param {string} endpoint - API endpoint (e.g., '/api/users/me')
   * @param {Object} options - Fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    // Thoát sớm nếu i18n.js chưa sẵn sàng
    if (!window.Lang) {
      console.error("APIClient: window.Lang (i18n.js) is not ready.");
      // Ném lỗi bằng tiếng Anh (vì không thể dịch)
      throw new Error("i18n service not loaded.");
    }
    
    try {
      // Get auth token (✅ Logic này giờ đã tự động refresh)
      const token = await sessionManager.getToken();
      
      if (!token) {
        // Điều này xảy ra nếu getAuthToken(interactive: false) thất bại
        // CẬP NHẬT i18n
        throw new Error(window.Lang.get('errorNoToken'));
      }
      
      // Build full URL
      const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${this.baseURL}${endpoint}`;
      
      // Merge headers
      const headers = {
        ...this.defaultHeaders,
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };
      
      // Make request
      const response = await this.fetchWithTimeout(url, {
        ...options,
        headers
      }, REQUEST_SETTINGS.timeout);
      
      // Handle 401 - Token expired or invalid
      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        console.log('[APIClient] 401 Unauthorized, Google token may be invalid or revoked.');
        
        try {
          if (chrome.identity && chrome.identity.clearAllCachedAuthTokens) {
             chrome.identity.clearAllCachedAuthTokens(() => {
               console.log('[APIClient] Cleared cached tokens due to 401.');
             });
          }
        } catch (e) {
           console.warn('[APIClient] Failed to clear cached tokens:', e);
        }
        
        // Đăng xuất người dùng khỏi session local
        await sessionManager.destroySession();
        // CẬP NHẬT i18n
        throw new Error(window.Lang.get('errorSessionExpired'));
      }
      
      // Handle other error status codes
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      
      // Parse response
      return await this.parseResponse(response);
      
    } catch (error) {
      console.error('[APIClient] Request failed:', error);
      throw error;
    }
  }

  // --- Các hàm còn lại (get, post, put, patch, delete, upload, v.v.) giữ nguyên ---
  
    /**
   * GET request
   * @param {string} endpoint
   * @param {Object} params - Query parameters
   */
  async get(endpoint, params = null) {
    let url = endpoint;
    
    // Add query params
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url = `${endpoint}?${queryString}`;
    }
    
    return await this.request(url, {
      method: 'GET'
    });
  }

  /**
   * POST request
   * @param {string} endpoint
   * @param {Object} data - Request body
   */
  async post(endpoint, data = null) {
    return await this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null
    });
  }

  /**
   * PUT request
   * @param {string} endpoint
   * @param {Object} data
   */
  async put(endpoint, data = null) {
    return await this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null
    });
  }

  /**
   * PATCH request
   * @param {string} endpoint
   * @param {Object} data
   */
  async patch(endpoint, data = null) {
    return await this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint
   */
  async delete(endpoint) {
    return await this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * Upload file
   * @param {string} endpoint
   * @param {FormData} formData
   */
  async upload(endpoint, formData) {
    // Get token
    const token = await sessionManager.getToken();
    
    if (!token) {
      // CẬP NHẬT i18n
      if (!window.Lang) throw new Error("i18n service not loaded.");
      throw new Error(window.Lang.get('errorNoToken'));
    }
    
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData, browser will set it automatically
      },
      body: formData
    });
    
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }
    
    return await this.parseResponse(response);
  }

  /**
   * Fetch with timeout
   * @private
   */
  fetchWithTimeout(url, options, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // CẬP NHẬT i18n
        const errorMsg = window.Lang ? window.Lang.get('errorRequestTimeout') : 'Request timeout';
        reject(new Error(errorMsg));
      }, timeout);
      
      fetch(url, options)
        .then(response => {
          clearTimeout(timer);
          resolve(response);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Parse response based on content type
   * @private
   */
  async parseResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    if (contentType && contentType.includes('text')) {
      return await response.text();
    }
    
    if (contentType && contentType.includes('blob')) {
      return await response.blob();
    }
    
    // Default to text
    return await response.text();
  }

  /**
   * Handle error responses
   * @private
   */
  async handleErrorResponse(response) {
    let errorMessage = `Request failed with status ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // If not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  /**
   * Make request without authentication (public endpoints)
   * @param {string} endpoint
   * @param {Object} options
   */
  async publicRequest(endpoint, options = {}) {
    try {
      const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${this.baseURL}${endpoint}`;
      
      const headers = {
        ...this.defaultHeaders,
        ...options.headers
      };
      
      const response = await this.fetchWithTimeout(url, {
        ...options,
        headers
      }, REQUEST_SETTINGS.timeout);
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      
      return await this.parseResponse(response);
      
    } catch (error) {
      console.error('[APIClient] Public request failed:', error);
      throw error;
    }
  }

  /**
   * Check API health
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const response = await this.publicRequest('/health', {
        method: 'GET'
      });
      return response.status === 'ok';
    } catch (error) {
      console.error('[APIClient] Health check failed:', error);
      return false;
    }
  }

  /**
   * Set custom headers for all requests
   * @param {Object} headers
   */
  setDefaultHeaders(headers) {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      ...headers
    };
  }

  /**
   * Get current base URL
   * @returns {string}
   */
  getBaseURL() {
    return this.baseURL;
  }

  /**
   * Set base URL
   * @param {string} url
   */
  setBaseURL(url) {
    this.baseURL = url;
  }
}

// Export singleton instance
export const apiClient = new APIClient();