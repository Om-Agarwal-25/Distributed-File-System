'use strict';
/**
 * logEmitter.js — Singleton EventEmitter for real-time structured log events.
 *
 * Any module can do:
 *   const logEmitter = require('./logEmitter');
 *   logEmitter.emit('log', { type: 'upload', message: 'File received...' });
 *
 * The SSE route subscribes to these events and forwards them to the browser.
 */

const { EventEmitter } = require('events');

class LogEmitter extends EventEmitter {}

const logEmitter = new LogEmitter();
logEmitter.setMaxListeners(50); // support many concurrent SSE clients

/**
 * Convenience helper: emit a structured log event.
 * @param {string} type   — action category (upload|chunk|hash|merkle|node|download|verify|delete|error)
 * @param {string} message — human-readable log message
 */
logEmitter.log = function (type, message) {
  this.emit('log', { type, message, timestamp: new Date().toISOString() });
};

module.exports = logEmitter;
