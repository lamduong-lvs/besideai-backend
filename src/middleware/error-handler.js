/**
 * Error Handler Middleware
 * Standardizes error responses
 */

/**
 * Error handler middleware
 * Must be last middleware in the chain
 */
export function errorHandler(err, req, res, next) {
  // Default error
  let status = 500;
  let error = 'internal_server_error';
  let message = 'An internal server error occurred';
  let code = null;

  // Handle known error types
  if (err.status) {
    status = err.status;
  }

  if (err.code) {
    code = err.code;
  }

  // PostgreSQL errors
  if (err.code === '23505') {
    // Unique violation
    status = 409;
    error = 'conflict';
    message = 'Resource already exists';
    code = 'DUPLICATE_ENTRY';
  } else if (err.code === '23503') {
    // Foreign key violation
    status = 400;
    error = 'invalid_request';
    message = 'Invalid reference';
    code = 'FOREIGN_KEY_VIOLATION';
  } else if (err.code === '23502') {
    // Not null violation
    status = 400;
    error = 'invalid_request';
    message = 'Required field is missing';
    code = 'NULL_VIOLATION';
  } else if (err.code === '42P01') {
    // Table does not exist
    status = 500;
    error = 'internal_server_error';
    message = 'Database table not found';
    code = 'TABLE_NOT_FOUND';
  } else if (err.code === 'ECONNREFUSED') {
    // Database connection refused
    status = 503;
    error = 'service_unavailable';
    message = 'Database connection failed';
    code = 'DATABASE_UNAVAILABLE';
  }

  // HTTP status code errors
  if (status === 400) {
    error = error === 'internal_server_error' ? 'bad_request' : error;
    message = err.message || message;
  } else if (status === 401) {
    error = 'unauthorized';
    message = err.message || 'Authentication required';
    code = code || 'AUTH_REQUIRED';
  } else if (status === 403) {
    error = 'forbidden';
    message = err.message || 'Access forbidden';
    code = code || 'FORBIDDEN';
  } else if (status === 404) {
    error = 'not_found';
    message = err.message || 'Resource not found';
    code = code || 'NOT_FOUND';
  } else if (status === 409) {
    error = error === 'internal_server_error' ? 'conflict' : error;
    message = err.message || message;
  } else if (status === 422) {
    error = 'unprocessable_entity';
    message = err.message || 'Validation failed';
    code = code || 'VALIDATION_ERROR';
  } else if (status === 503) {
    error = 'service_unavailable';
    message = err.message || 'Service temporarily unavailable';
  }

  // Custom error format
  if (err.error) {
    error = err.error;
  }
  if (err.message && !message.includes(err.message)) {
    message = err.message;
  }

  // Log error
  if (status >= 500) {
    console.error('[Error Handler]', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
      status,
      code
    });
  }

  // Response
  const response = {
    success: false,
    error,
    message
  };

  if (code) {
    response.code = code;
  }

  if (process.env.NODE_ENV === 'development') {
    response.details = err.stack;
  }

  res.status(status).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'not_found',
    message: `Route ${req.method} ${req.path} not found`
  });
}

