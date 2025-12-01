// modules/auth/config/endpoints.js

/**
 * API Endpoints Configuration
 * Quản lý tất cả API endpoints cho authentication
 */

// Detect environment
const isDevelopment = !('update_url' in chrome.runtime.getManifest());

/**
 * Base URLs cho từng environment
 */
export const API_BASE_URLS = {
  development: 'http://localhost:3000',
  staging: 'https://besideai-backend.vercel.app',
  production: 'https://besideai.work'
};

/**
 * Get current API base URL
 */
export function getAPIBaseURL() {
  if (isDevelopment) {
    return API_BASE_URLS.development;
  }
  return API_BASE_URLS.production;
}

/**
 * Authentication endpoints
 */
export const AUTH_ENDPOINTS = {
  // Đăng nhập với Google token
  googleAuth: '/api/auth/google',
  
  // Refresh session token
  refreshToken: '/api/auth/refresh',
  
  // Đăng xuất
  logout: '/api/auth/logout',
  
  // Lấy thông tin user hiện tại
  getProfile: '/api/auth/me',
  
  // Verify token
  verifyToken: '/api/auth/verify'
};

/**
 * Build full URL
 */
export function buildURL(endpoint) {
  const base = getAPIBaseURL();
  return `${base}${endpoint}`;
}

/**
 * Request timeout settings
 */
export const REQUEST_SETTINGS = {
  timeout: 30000,  // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000  // 1 second
};

/**
 * Google API endpoints
 */
export const GOOGLE_ENDPOINTS = {
  userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
  tokenInfo: 'https://www.googleapis.com/oauth2/v3/tokeninfo',
  revoke: 'https://oauth2.googleapis.com/revoke'
};

/**
 * Response status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Custom error codes from backend
 */
export const BACKEND_ERROR_CODES = {
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED'
};