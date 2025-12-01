/**
 * Usage Tracking Middleware
 * Tracks API usage for analytics
 */

/**
 * Usage tracking middleware
 * Logs API usage for monitoring
 */
export function usageTracker(req, res, next) {
  const startTime = Date.now();
  const { method, path, user } = req;

  // Track response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    // Log usage (can be sent to analytics service)
    if (user && statusCode < 400) {
      // Track successful requests
      console.log(`[Usage Tracker] ${method} ${path} - User: ${user.id} - ${duration}ms`);
      
      // TODO: Send to analytics service (e.g., Vercel Analytics, custom service)
    }
  });

  next();
}

