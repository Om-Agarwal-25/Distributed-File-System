/**
 * logger.js — Simple structured logger using console with log levels.
 *
 * In production you would swap this for winston or pino, but for this
 * project a lightweight wrapper keeps dependencies minimal.
 */

'use strict';

const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL || 'debug'];

const timestamp = () => new Date().toISOString();

const log = (level, msg, meta) => {
  if (LEVELS[level] > CURRENT_LEVEL) return;
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  if (meta) {
    console[level === 'error' ? 'error' : 'log'](`${prefix} ${msg}`, meta);
  } else {
    console[level === 'error' ? 'error' : 'log'](`${prefix} ${msg}`);
  }
};

module.exports = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  http: (msg, meta) => log('http', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
