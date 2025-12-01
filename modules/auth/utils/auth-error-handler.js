// modules/auth/utils/error-handler.js

/**
 * Error Handler
 * Centralized error handling và user-friendly error messages
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế tất cả các chuỗi văn bản lỗi (Error messages) bằng window.Lang.get()
 */

/**
 * Auth error types
 */
export const AuthErrorType = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  USER_CANCELLED: 'USER_CANCELLED',
  BACKEND: 'BACKEND',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Auth Error class
 */
export class AuthError extends Error {
  constructor(type, message, originalError = null) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }

  /**
   * Get user-friendly message
   */
  getUserMessage() {
    return this.message;
  }

  /**
   * Get technical details (for logging)
   */
  getTechnicalDetails() {
    return {
      type: this.type,
      message: this.message,
      originalError: this.originalError?.message || null,
      stack: this.stack,
      timestamp: new Date(this.timestamp).toISOString()
    };
  }
}

/**
 * Parse error and return AuthError
 * @param {Error} error - Original error
 * @returns {AuthError}
 */
export function parseAuthError(error) {
  // Thoát sớm nếu i18n.js chưa sẵn sàng
  if (!window.Lang) {
    console.error("AuthErrorHandler: window.Lang (i18n.js) is not ready.");
    // Trả về lỗi gốc nếu không thể dịch
    return new AuthError(AuthErrorType.UNKNOWN, error.message || "Unknown error", error);
  }

  // Already an AuthError
  if (error instanceof AuthError) {
    return error;
  }

  const message = error.message || 'Unknown error';

  // Network errors
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('ECONNREFUSED')
  ) {
    return new AuthError(
      AuthErrorType.NETWORK,
      window.Lang.get('errorNetwork'), // Đã dịch
      error
    );
  }

  // User cancelled
  if (
    message.includes('cancel') ||
    message.includes('cancelled') ||
    message.includes('denied')
  ) {
    return new AuthError(
      AuthErrorType.USER_CANCELLED,
      window.Lang.get('errorUserCancelled'), // Đã dịch
      error
    );
  }

  // Session expired
  if (
    message.includes('expired') ||
    message.includes('SESSION_EXPIRED')
  ) {
    return new AuthError(
      AuthErrorType.SESSION_EXPIRED,
      window.Lang.get('errorSessionExpired'), // Đã dịch
      error
    );
  }

  // Invalid token
  if (
    message.includes('invalid token') ||
    message.includes('INVALID_TOKEN') ||
    message.includes('malformed')
  ) {
    return new AuthError(
      AuthErrorType.INVALID_TOKEN,
      window.Lang.get('errorInvalidToken'), // Đã dịch
      error
    );
  }

  // Authentication failed
  if (
    message.includes('authentication failed') ||
    message.includes('login failed') ||
    message.includes('401')
  ) {
    return new AuthError(
      AuthErrorType.AUTHENTICATION,
      window.Lang.get('errorAuthFailed'), // Đã dịch
      error
    );
  }

  // Authorization failed
  if (
    message.includes('forbidden') ||
    message.includes('403') ||
    message.includes('unauthorized')
  ) {
    return new AuthError(
      AuthErrorType.AUTHORIZATION,
      window.Lang.get('errorForbidden'), // Đã dịch
      error
    );
  }

  // Backend errors
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('server error')
  ) {
    return new AuthError(
      AuthErrorType.BACKEND,
      window.Lang.get('errorBackend'), // Đã dịch
      error
    );
  }

  // Unknown error
  return new AuthError(
    AuthErrorType.UNKNOWN,
    window.Lang.get('errorUnknown'), // Đã dịch
    error
  );
}

/**
 * Handle error and show appropriate message
 * @param {Error} error
 * @param {Function} showNotification - Callback to show notification
 */
export function handleAuthError(error, showNotification = null) {
  const authError = parseAuthError(error);

  // Log technical details
  console.error('[AuthError]', authError.getTechnicalDetails());

  // Show user message
  if (showNotification) {
    showNotification(authError.getUserMessage(), 'error');
  }

  return authError;
}

/**
 * Create specific error types
 */
export const createAuthError = {
  // Thoát sớm nếu i18n.js chưa sẵn sàng
  _getMessage: (key, fallback) => (window.Lang ? window.Lang.get(key) : fallback),

  network: (originalError = null) => new AuthError(
    AuthErrorType.NETWORK,
    createAuthError._getMessage('errorNetwork', 'Network error. Please check your connection.'),
    originalError
  ),

  authentication: (originalError = null) => new AuthError(
    AuthErrorType.AUTHENTICATION,
    createAuthError._getMessage('errorAuthFailed', 'Authentication failed. Please try again.'),
    originalError
  ),

  sessionExpired: (originalError = null) => new AuthError(
    AuthErrorType.SESSION_EXPIRED,
    createAuthError._getMessage('errorSessionExpired', 'Session expired. Please login again.'),
    originalError
  ),

  invalidToken: (originalError = null) => new AuthError(
    AuthErrorType.INVALID_TOKEN,
    createAuthError._getMessage('errorInvalidToken', 'Invalid token. Please login again.'),
    originalError
  ),

  userCancelled: () => new AuthError(
    AuthErrorType.USER_CANCELLED,
    createAuthError._getMessage('errorUserCancelled', 'Login was cancelled.'),
    null
  ),

  backend: (originalError = null) => new AuthError(
    AuthErrorType.BACKEND,
    createAuthError._getMessage('errorBackend', 'Server error. Please try again later.'),
    originalError
  )
};

/**
 * Retry wrapper for async functions
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Max number of retries
 * @param {number} delay - Delay between retries (ms)
 * @returns {Promise}
 */
export async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on user cancellation
      if (error.message?.includes('cancel')) {
        throw error;
      }

      // Don't retry on authentication errors
      if (error.message?.includes('401') || error.message?.includes('authentication')) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (i < maxRetries - 1) {
        const waitTime = delay * Math.pow(2, i);
        // CẬP NHẬT i18n (cho console log)
        const logMsg = window.Lang 
          ? window.Lang.get('logRetryAttempt', { i: i + 1, waitTime: waitTime })
          : `[Retry] Attempt ${i + 1} failed, retrying in ${waitTime}ms...`;
        console.log(logMsg);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

/**
 * Log error to backend (optional)
 * @param {AuthError} error
 */
export async function logErrorToBackend(error) {
  try {
    // Optional: Send error to backend for monitoring
    // Uncomment if you have error logging endpoint
    /*
    await fetch('https://api.yourapp.com/errors/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(error.getTechnicalDetails())
    });
    */
  } catch (loggingError) {
    console.error('[Error Logging] Failed to log error:', loggingError);
  }
}