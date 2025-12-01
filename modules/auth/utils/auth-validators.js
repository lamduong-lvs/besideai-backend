// modules/auth/utils/validators.js

/**
 * Validation utilities
 * Functions để validate email, tokens, và các input khác
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế các chuỗi Error và console.error bằng window.Lang.get()
 */

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate JWT format
 * @param {string} token
 * @returns {boolean}
 */
export function isValidJWT(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // JWT format: header.payload.signature
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    return false;
  }
  
  // Each part should be base64 encoded
  try {
    parts.forEach(part => {
      // CẬP NHẬT i18n
      if (!part) throw new Error(window.Lang ? window.Lang.get('errorJwtEmptyPart') : 'Empty part');
      atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Decode JWT payload (without verification)
 * @param {string} token
 * @returns {Object|null}
 */
export function decodeJWT(token) {
  if (!isValidJWT(token)) {
    return null;
  }
  
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    // CẬP NHẬT i18n
    const errorMsg = window.Lang ? window.Lang.get('errorJwtDecodeFailed') : '[Validators] Failed to decode JWT:';
    console.error(errorMsg, error);
    return null;
  }
}

/**
 * Check if JWT is expired
 * @param {string} token
 * @returns {boolean}
 */
export function isJWTExpired(token) {
  const payload = decodeJWT(token);
  
  if (!payload || !payload.exp) {
    return true; // Consider invalid tokens as expired
  }
  
  // exp is in seconds, Date.now() is in milliseconds
  const expiryTime = payload.exp * 1000;
  return Date.now() >= expiryTime;
}

/**
 * Get JWT expiry time
 * @param {string} token
 * @returns {number|null} Timestamp in milliseconds
 */
export function getJWTExpiry(token) {
  const payload = decodeJWT(token);
  
  if (!payload || !payload.exp) {
    return null;
  }
  
  return payload.exp * 1000;
}

/**
 * Get time until JWT expires
 * @param {string} token
 * @returns {number} Milliseconds until expiry, or 0 if expired
 */
export function getJWTTimeRemaining(token) {
  const expiryTime = getJWTExpiry(token);
  
  if (!expiryTime) {
    return 0;
  }
  
  const remaining = expiryTime - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Validate Google OAuth token format
 * @param {string} token
 * @returns {boolean}
 */
export function isValidGoogleToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Google tokens typically start with "ya29."
  // and are quite long (>100 chars)
  return token.startsWith('ya29.') && token.length > 100;
}

/**
 * Validate user object structure
 * @param {Object} user
 * @returns {boolean}
 */
export function isValidUserObject(user) {
  if (!user || typeof user !== 'object') {
    return false;
  }
  
  // Required fields
  const requiredFields = ['id', 'email'];
  
  for (const field of requiredFields) {
    if (!user[field]) {
      return false;
    }
  }
  
  // Validate email
  if (!isValidEmail(user.email)) {
    return false;
  }
  
  return true;
}

/**
 * Validate session object structure
 * @param {Object} session
 * @returns {boolean}
 */
export function isValidSessionObject(session) {
  if (!session || typeof session !== 'object') {
    return false;
  }
  
  // Required fields
  if (!session.token || !session.user || !session.expiresAt) {
    return false;
  }
  
  // Validate user
  if (!isValidUserObject(session.user)) {
    return false;
  }
  
  // Validate expiry time
  if (typeof session.expiresAt !== 'number' || session.expiresAt <= 0) {
    return false;
  }
  
  return true;
}

/**
 * Sanitize email (trim, lowercase)
 * @param {string} email
 * @returns {string}
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  return email.trim().toLowerCase();
}

/**
 * Sanitize user input (remove dangerous characters)
 * @param {string} input
 * @returns {string}
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove HTML tags and trim
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate URL format
 * @param {string} url
 * @returns {boolean}
 */
export function isValidURL(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Validate API endpoint format
 * @param {string} endpoint
 * @returns {boolean}
 */
export function isValidEndpoint(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') {
    return false;
  }
  
  // Should start with /
  if (!endpoint.startsWith('/')) {
    return false;
  }
  
  // Should not contain whitespace
  if (/\s/.test(endpoint)) {
    return false;
  }
  
  return true;
}

/**
 * Validate timestamp
 * @param {number} timestamp
 * @returns {boolean}
 */
export function isValidTimestamp(timestamp) {
  if (typeof timestamp !== 'number') {
    return false;
  }
  
  // Should be positive
  if (timestamp <= 0) {
    return false;
  }
  
  // Should be reasonable (not too far in past or future)
  const now = Date.now();
  const tenYearsAgo = now - (10 * 365 * 24 * 60 * 60 * 1000);
  const tenYearsFromNow = now + (10 * 365 * 24 * 60 * 60 * 1000);
  
  return timestamp >= tenYearsAgo && timestamp <= tenYearsFromNow;
}

/**
 * Format validation error message
 * @param {string} field
 * @param {string} reason
 * @returns {string}
 */
export function getValidationError(field, reason) {
  // CẬP NHẬT i18n
  if (!window.Lang) {
    return `Invalid ${field}: ${reason}`; // Fallback
  }
  // Dùng key 'errorValidation' với placeholders
  return window.Lang.get('errorValidation', { field: field, reason: reason });
}