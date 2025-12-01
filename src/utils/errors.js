/**
 * Custom Error Classes
 * For better error handling and type checking
 */

/**
 * Base API Error class
 */
export class APIError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.error = this._getErrorName(status);
  }

  _getErrorName(status) {
    const statusMap = {
      400: 'bad_request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not_found',
      409: 'conflict',
      422: 'unprocessable_entity',
      429: 'too_many_requests',
      500: 'internal_server_error',
      503: 'service_unavailable'
    };
    return statusMap[status] || 'internal_server_error';
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends APIError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(message, 400, code);
    this.name = 'BadRequestError';
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends APIError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends APIError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends APIError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends APIError {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super(message, 409, code);
    this.name = 'ConflictError';
  }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends APIError {
  constructor(message = 'Validation failed', code = 'VALIDATION_ERROR', details = null) {
    super(message, 422, code);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Too Many Requests Error (429)
 */
export class TooManyRequestsError extends APIError {
  constructor(message = 'Too many requests', code = 'RATE_LIMIT_EXCEEDED', retryAfter = null) {
    super(message, 429, code);
    this.name = 'TooManyRequestsError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends APIError {
  constructor(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    super(message, 500, code);
    this.name = 'InternalServerError';
  }
}

/**
 * Service Unavailable Error (503)
 */
export class ServiceUnavailableError extends APIError {
  constructor(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
    this.name = 'ServiceUnavailableError';
  }
}

