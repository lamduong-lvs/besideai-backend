/**
 * Rate Limiting Middleware
 * Simple in-memory rate limiter (for development)
 * For production, consider using Redis-based rate limiter
 */

// In-memory store (will be reset on server restart)
const rateLimitStore = new Map();

/**
 * Simple rate limiter middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.keyGenerator - Function to generate key (default: IP)
 * @returns {Function} Express middleware
 */
export function rateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute default
    max = 100, // 100 requests per window
    keyGenerator = (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip || 'unknown';
    },
    message = 'Too many requests, please try again later'
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || now - entry.resetTime > windowMs) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        error: 'too_many_requests',
        message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000) // seconds
      });
    }

    next();
  };
}

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.resetTime > 0) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Default rate limiter (100 requests per minute)
 */
export const defaultRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 100
});

/**
 * Strict rate limiter (10 requests per minute)
 */
export const strictRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10
});

