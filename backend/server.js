/**
 * server.js — Entry point for the Distributed File Storage System backend.
 *
 * Responsibilities:
 *  - Load environment variables
 *  - Connect to MongoDB
 *  - Initialize the Express application
 *  - Initialise the Consistent Hash Ring with configured storage nodes
 *  - Start HTTP server
 */

'use strict';

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');

const app = require('./src/app');
const hashRing = require('./src/config/hashRing');
const logger = require('./src/utils/logger');

// ── Environment ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfs_db';
const STORAGE_NODES = process.env.STORAGE_NODES
  ? process.env.STORAGE_NODES.split(',').map((n) => n.trim())
  : ['http://localhost:4001', 'http://localhost:4002', 'http://localhost:4003'];

// ── Populate the Consistent Hash Ring with configured nodes ──────────────────
STORAGE_NODES.forEach((node) => hashRing.addNode(node));

// ── MongoDB Connection ────────────────────────────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info(`MongoDB connected → ${MONGO_URI}`);
  } catch (err) {
    logger.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  await connectDB();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info(`DFS Backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    logger.info(`Hash ring initialised with ${STORAGE_NODES.length} nodes × ${hashRing.virtualNodes} virtual nodes`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected. Bye!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
