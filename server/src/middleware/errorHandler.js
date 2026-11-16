/**
 * Centralized Error Handling Middleware (Phase 1: Standardized Responses)
 * Guarantees standard JSON error structures across all failure modes
 * and terminates unhandled fatal server crashes.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || (res.statusCode && res.statusCode >= 400 ? res.statusCode : 500);

  let errorCode = 'INTERNAL_SERVER_ERROR';
  if (statusCode === 400) errorCode = 'BAD_REQUEST';
  else if (statusCode === 401) errorCode = 'UNAUTHORIZED';
  else if (statusCode === 403) errorCode = 'FORBIDDEN';
  else if (statusCode === 404) errorCode = 'NOT_FOUND';
  else if (statusCode === 429) errorCode = 'RATE_LIMIT_EXCEEDED';

  if (err.code === 'CORS_FORBIDDEN' || (err.message && err.message.startsWith('CORS_FORBIDDEN'))) {
    errorCode = 'CORS_FORBIDDEN';
  }

  const response = {
    success: false,
    code: err.code || errorCode,
    message: err.message || 'An unexpected internal server error occurred.'
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  // Only include stack trace in non-production environments
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler for unknown endpoints
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
}

/**
 * Async Controller Wrapper to safely catch unhandled rejections
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
