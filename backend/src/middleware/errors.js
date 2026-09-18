const { fail } = require('../utils/response');

// 404 for unknown /api routes.
function notFound(req, res) {
  return fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

// Centralized error handler — must be registered last.
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[error] ${req.method} ${req.originalUrl} ->`, err.message);
  }
  return fail(res, status === 500 ? 'Internal server error' : err.message, status);
}

module.exports = { notFound, errorHandler };
