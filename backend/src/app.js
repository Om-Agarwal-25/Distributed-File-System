/**
 * app.js — Express application factory.
 *
 * Sets up middleware, mounts routes, and provides a central error handler.
 * Deliberately separated from server.js so it can be imported in tests
 * without actually binding to a port.
 */

'use strict';

require('express-async-errors'); // Patch async route handlers to forward errors
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const fileRoutes = require('./routes/fileRoutes');
const logRoutes = require('./routes/logRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');

const app = express();

// ── Core Middleware ───────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan('dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', fileRoutes);
app.use('/api/logs', logRoutes);

// ── 404 & Error Handling ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
