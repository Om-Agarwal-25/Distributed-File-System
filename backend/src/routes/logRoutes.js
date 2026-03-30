'use strict';
/**
 * logRoutes.js — SSE endpoint for real-time activity log streaming.
 *
 * GET /api/logs/stream
 *  Opens a persistent SSE connection. The browser receives log events
 *  emitted by logEmitter from anywhere in the backend.
 */

const express = require('express');
const router = express.Router();
const logEmitter = require('../utils/logEmitter');

/**
 * GET /api/logs/stream
 * Server-Sent Events endpoint. Each connected client gets a listener
 * on logEmitter; on disconnect the listener is removed to avoid leaks.
 */
router.get('/stream', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Prevent nginx buffering
  res.flushHeaders();

  // Send a heartbeat comment every 25 s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  // Send a welcome message so the client knows it's connected
  res.write(`data: ${JSON.stringify({ type: 'system', message: 'Connected to Activity Log', timestamp: new Date().toISOString() })}\n\n`);

  // Forward each log event as an SSE message
  const onLog = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  logEmitter.on('log', onLog);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    logEmitter.off('log', onLog);
  });
});

module.exports = router;
