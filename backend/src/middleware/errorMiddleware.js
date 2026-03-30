/**
 * errorMiddleware.js — Centralised Express error and 404 handlers.
 */

'use strict';

const logger = require('../utils/logger');

/**
 * 404 handler — called when no route matched.
 */
exports.notFoundHandler = (req, res, _next) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

/**
 * Global error handler — called when next(err) is invoked or an async route
 * throws (thanks to express-async-errors).
 */
exports.errorHandler = (err, req, res, _next) => {
  logger.error(`[ErrorHandler] ${err.message}`, { stack: err.stack });

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal Server Error'
    : err.message;

  res.status(status).json({ error: message });
};
