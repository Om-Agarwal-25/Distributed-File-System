/**
 * server.js — Lightweight Express server for a single storage node.
 *
 * Each storage node container runs this server. It provides:
 *  PUT    /chunks/:key   — Store a chunk (raw binary body)
 *  GET    /chunks/:key   — Retrieve a stored chunk
 *  DELETE /chunks/:key   — Delete a stored chunk
 *  GET    /health        — Health check
 *  GET    /stats         — Storage statistics (chunk count, total bytes)
 *
 * Chunks are stored as individual files in a local ./data directory,
 * which maps to a Docker volume for persistence.
 */

'use strict';

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4001;
const NODE_ID = process.env.NODE_ID || 'node-unknown';
const DATA_DIR = path.resolve(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Parse raw binary bodies for chunk uploads
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));
app.use(express.json());

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sanitise chunkKey to a safe filename (alphanumeric + dash + underscore). */
const safeKey = (key) => key.replace(/[^a-zA-Z0-9\-_]/g, '_');
const chunkPath = (key) => path.join(DATA_DIR, safeKey(key));

// ── Routes ────────────────────────────────────────────────────────────────────

/** Health check */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', nodeId: NODE_ID, timestamp: new Date().toISOString() });
});

/** Storage statistics */
app.get('/stats', (_req, res) => {
  const files = fs.readdirSync(DATA_DIR);
  let totalBytes = 0;
  files.forEach((f) => {
    try { totalBytes += fs.statSync(path.join(DATA_DIR, f)).size; } catch (_) {}
  });
  res.json({ nodeId: NODE_ID, chunkCount: files.length, totalBytes });
});

/**
 * PUT /chunks/:key — Upload / overwrite a chunk.
 * Body must be raw binary (Content-Type: application/octet-stream).
 */
app.put('/chunks/:key', (req, res) => {
  const key = req.params.key;
  const data = req.body; // Buffer (express.raw)

  if (!data || !Buffer.isBuffer(data) || data.length === 0) {
    return res.status(400).json({ error: 'Empty or invalid body. Send raw binary data.' });
  }

  try {
    fs.writeFileSync(chunkPath(key), data);
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return res.status(201).json({ key, size: data.length, sha256: hash, nodeId: NODE_ID });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /chunks/:key — Retrieve a stored chunk as binary.
 */
app.get('/chunks/:key', (req, res) => {
  const filePath = chunkPath(req.params.key);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Chunk not found: ${req.params.key}` });
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.sendFile(filePath);
});

/**
 * DELETE /chunks/:key — Remove a stored chunk.
 */
app.delete('/chunks/:key', (req, res) => {
  const filePath = chunkPath(req.params.key);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Chunk not found: ${req.params.key}` });
  }

  fs.unlinkSync(filePath);
  res.json({ message: `Chunk ${req.params.key} deleted`, nodeId: NODE_ID });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[${NODE_ID}] Storage node listening on port ${PORT} | data dir: ${DATA_DIR}`);
});

module.exports = app; // for testing
