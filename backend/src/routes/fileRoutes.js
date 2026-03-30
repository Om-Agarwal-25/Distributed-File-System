/**
 * fileRoutes.js — Express router for all file-related API endpoints.
 *
 * Routes:
 *  POST   /api/upload              — Upload a file
 *  GET    /api/file/:id            — Download / retrieve a file
 *  DELETE /api/file/:id            — Delete a file
 *  GET    /api/verify/:id          — Verify integrity of a stored file
 *  GET    /api/files               — List all stored files (metadata only)
 *  GET    /api/nodes               — List all nodes & their chunk counts
 *  GET    /api/stats               — Aggregate stats + node health
 *  GET    /api/file/:id/detail     — Full chunk metadata for FileDetail panel
 *  POST   /api/file/:id/corrupt/:chunkIndex — Simulate chunk corruption
 */

'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const router = express.Router();

const fileController = require('../controllers/fileController');

// ── Multer config: store to OS temp dir, accept any file type ─────────────────
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB hard limit
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/file/:id', fileController.getFile);
router.delete('/file/:id', fileController.deleteFile);
router.get('/verify/:id', fileController.verifyFile);
router.get('/files', fileController.listFiles);
router.get('/nodes', fileController.listNodes);
router.get('/stats', fileController.getStats);
router.get('/file/:id/detail', fileController.getFileDetail);
router.post('/file/:id/corrupt/:chunkIndex', fileController.corruptChunk);

module.exports = router;

