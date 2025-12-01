/**
 * Error Handler for AI Module
 * Provides unified error handling and formatting
 */

export class AIError extends Error {
  constructor(message, code, provider = null, statusCode = null) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export class APIError extends AIError {
  constructor(message, statusCode, provider) {
    super(message, 'API_ERROR', provider, statusCode);
    this.name = 'APIError';
  }
}

export class ValidationError extends AIError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', null, null);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NetworkError extends AIError {
  constructor(message) {
    super(message, 'NETWORK_ERROR', null, null);
    this.name = 'NetworkError';
  }
}

/**
 * Format error for user display
 */
export function formatError(error, getLang = null) {
  if (!error) return 'Unknown error occurred';
  
  // If error has a formatted message, use it
  if (error.userMessage) return error.userMessage;
  
  // Try to get translated message
  if (getLang && typeof getLang === 'function') {
    const errorKey = `error${error.code || 'Generic'}`;
    const translated = getLang(errorKey);
    if (translated && translated !== errorKey) {
      return translated;
    }
  }
  
  // Fallback to error message
  return error.message || 'An error occurred';
}

/**
 * Check if error is related to file/image support
 */
export function isFileSupportError(error) {
  if (!error || !error.message) return false;
  
  const msg = error.message.toLowerCase();
  return (
    msg.includes('image') ||
    msg.includes('file') ||
    msg.includes('attachment') ||
    msg.includes('document') ||
    msg.includes('multimodal') ||
    msg.includes('unsupported') ||
    msg.includes('not support')
  );
}

