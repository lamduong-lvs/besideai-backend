/**
 * Request Logger Middleware
 * Logs incoming requests for debugging and monitoring
 */

/**
 * Request logger middleware
 * Logs method, path, IP, and response time
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();
  const { method, path, ip } = req;

  // Log request
  console.log(`[${new Date().toISOString()}] ${method} ${path} - ${ip}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    const logLevel = statusCode >= 500 ? 'ERROR' : 
                     statusCode >= 400 ? 'WARN' : 'INFO';
    
    console.log(
      `[${new Date().toISOString()}] ${method} ${path} - ${statusCode} - ${duration}ms`
    );
  });

  next();
}

/**
 * Error logger middleware
 * Logs errors with stack trace
 */
export function errorLogger(err, req, res, next) {
  const { method, path, ip } = req;
  
  console.error(`[${new Date().toISOString()}] ERROR ${method} ${path} - ${ip}`);
  console.error('Error:', err.message);
  
  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error('Stack:', err.stack);
  }

  next(err);
}

