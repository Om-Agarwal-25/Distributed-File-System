/**
 * fileController.js — Express request handlers for file operations.
 *
 * Each handler orchestrates the core services:
 *  uploadFile    → chunk → hash → Merkle → ConsistentHash → B-Tree → persist
 *  getFile       → lookup → fetch chunks → reassemble → return stream
 *  deleteFile    → remove chunks from nodes → B-Tree delete → mark DB record
 *  verifyFile    → fetch chunks → re-hash → rebuild Merkle → compare root
 *  listFiles     → return paginated metadata
 *  listNodes     → return hash ring state
 *  getStats      → aggregate stats + node health pings
 *  getFileDetail → full chunk metadata for FileDetail panel
 *  corruptChunk  → flip bytes in a chunk for demo corruption
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const FileMetadata = require('../models/FileMetadata');
const chunkingService = require('../services/chunkingService');
const storageService = require('../services/storageService');
const integrityService = require('../services/integrityService');
const BTree = require('../dataStructures/BTree');
const MerkleTree = require('../dataStructures/MerkleTree');
const hashRing = require('../config/hashRing');
const logger = require('../utils/logger');
const logEmitter = require('../utils/logEmitter');

// In-memory B-Tree for fast metadata lookups (persisted to MongoDB as source of truth)
const metadataBTree = new BTree(3); // order-3 (t=3) B-Tree

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Remove a temp file silently.
 * @param {string} filePath
 */
function cleanupTempFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) logger.warn(`Could not remove temp file ${filePath}: ${err.message}`);
  });
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/upload
 * Accepts a multipart/form-data request with a 'file' field.
 */
exports.uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
  }

  const tempPath = req.file.path;

  try {
    const fileId = uuidv4();
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const owner = req.body.owner || 'anonymous';

    logger.info(`[Upload] fileId=${fileId} name="${originalName}" size=${req.file.size}`);
    logEmitter.log('upload', `📁 File received: "${originalName}" (${(req.file.size / 1024).toFixed(1)} KB)`);

    const timings = {};
    let tStart = performance.now();

    // 1 & 2 — Chunk + hash
    const { chunks, fileHash, totalSize } = await chunkingService.chunkFile(tempPath);
    timings.chunking = performance.now() - tStart;

    logEmitter.log('chunk', `✂️ Split into ${chunks.length} chunk(s) in ${Math.round(timings.chunking)}ms`);
    logEmitter.log('hash',  `🔐 SHA-256 hashed all ${chunks.length} chunks — file hash: ${fileHash.slice(0, 12)}...`);

    // 3 — Build Merkle Tree
    tStart = performance.now();
    const chunkHashes = chunks.map((c) => c.hash);
    const merkleTree = new MerkleTree(chunkHashes);
    const merkleRoot = merkleTree.getRoot();
    timings.merkleBuild = performance.now() - tStart;

    logEmitter.log('merkle', `🌿 Merkle Tree built — root: ${merkleRoot.slice(0, 8)}... (${Math.round(timings.merkleBuild)}ms)`);

    // 4 & 5 — Assign chunks to nodes + upload
    tStart = performance.now();
    const chunkMeta = await storageService.distributeChunks(chunks, fileId, hashRing);
    timings.distribution = performance.now() - tStart;

    chunkMeta.forEach(c => {
      const port = c.nodeUrl.split(':').pop();
      logEmitter.log('node', `🔵 Chunk ${c.index} → ${c.nodeUrl.replace('http://', '')} (port ${port})`);
    });

    // 6 — Insert into in-memory B-Tree
    const metadata = {
      fileId,
      originalName,
      mimeType,
      totalSize,
      fileHash,
      merkleRoot,
      owner,
      chunks: chunkMeta,
      status: 'active',
      uploadTimeMs: Math.round(timings.chunking + timings.merkleBuild + timings.distribution)
    };
    metadataBTree.insert(fileId, metadata);

    // 7 — Persist to MongoDB
    const record = await FileMetadata.create(metadata);

    const totalMs = Math.round(timings.chunking + timings.merkleBuild + timings.distribution);
    logger.info(`[Upload] Success — fileId=${fileId} merkleRoot=${merkleRoot}`);
    logEmitter.log('upload', `✅ Upload complete — "${originalName}" distributed in ${totalMs}ms`);

    // Build visualData payload for the frontend dashboard
    const visualData = {
      chunks: chunkMeta.map(c => ({
        chunkIndex: c.index,
        hash: c.hash,
        assignedNode: c.nodeUrl,
      })),
      merkleTree: merkleTree.getTreeAsObject(),
      consistentHashRing: hashRing.getNodes().map(nodeUrl => ({
        nodeUrl,
        chunksAssigned: chunkMeta.filter(c => c.nodeUrl === nodeUrl).length
      })),
      btreeSnapshot: metadataBTree.toJSON(),
      timings: {
        chunking: Math.round(timings.chunking),
        merkleBuild: Math.round(timings.merkleBuild),
        distribution: Math.round(timings.distribution),
        total: totalMs
      }
    };

    return res.status(201).json({
      message: 'File uploaded and distributed successfully',
      fileId,
      originalName,
      totalSize,
      chunks: chunkMeta.length,
      merkleRoot,
      createdAt: record.createdAt,
      visualData
    });
  } catch (err) {
    logger.error(`[Upload] Error: ${err.message}`);
    logEmitter.log('error', `🚨 Upload error: ${err.message}`);
    throw err;
  } finally {
    cleanupTempFile(tempPath);
  }
};

/**
 * GET /api/file/:id
 * Retrieves and reassembles a file by fileId.
 */
exports.getFile = async (req, res) => {
  const { id: fileId } = req.params;

  // Try B-Tree first (fast), fall back to MongoDB
  let metadata = metadataBTree.search(fileId);
  if (!metadata) {
    metadata = await FileMetadata.findOne({ fileId, status: 'active' }).lean();
    if (metadata) metadataBTree.insert(fileId, metadata); // warm cache
  }

  if (!metadata) {
    return res.status(404).json({ error: `File not found: ${fileId}` });
  }

  logger.info(`[Download] fileId=${fileId} chunks=${metadata.chunks.length}`);
  logEmitter.log('download', `📥 Download started: "${metadata.originalName}" (${metadata.chunks.length} chunks)`);

  // Fetch all chunks from storage nodes and reassemble
  const fileBuffer = await storageService.reassembleFile(metadata.chunks);

  logEmitter.log('download', `📥 File reassembled: "${metadata.originalName}" (${(fileBuffer.length / 1024).toFixed(1)} KB)`);

  res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
  res.setHeader('Content-Length', fileBuffer.length);
  res.send(fileBuffer);
};

/**
 * DELETE /api/file/:id
 * Marks a file as deleted in MongoDB and removes chunks from nodes.
 */
exports.deleteFile = async (req, res) => {
  const { id: fileId } = req.params;

  const record = await FileMetadata.findOne({ fileId });
  if (!record) {
    return res.status(404).json({ error: `File not found: ${fileId}` });
  }

  logEmitter.log('delete', `🗑️ Deleting "${record.originalName}" (${record.chunks.length} chunks)...`);

  // Delete chunks from storage nodes
  await storageService.deleteChunks(record.chunks);

  // Mark as deleted in MongoDB (soft-delete preserves audit trail)
  record.status = 'deleted';
  await record.save();

  // Remove from B-Tree index
  metadataBTree.delete(fileId);

  logger.info(`[Delete] fileId=${fileId} removed`);
  logEmitter.log('delete', `🗑️ Deleted "${record.originalName}" successfully`);
  return res.json({ message: 'File deleted successfully', fileId });
};

/**
 * GET /api/verify/:id
 * Verifies file integrity by re-downloading chunks and comparing Merkle roots.
 */
exports.verifyFile = async (req, res) => {
  const { id: fileId } = req.params;

  let metadata = metadataBTree.search(fileId);
  if (!metadata) {
    metadata = await FileMetadata.findOne({ fileId, status: 'active' }).lean();
  }

  if (!metadata) {
    return res.status(404).json({ error: `File not found: ${fileId}` });
  }

  logEmitter.log('verify', `🔍 Verify started: "${metadata.originalName}" (${metadata.chunks.length} chunks)`);

  const result = await integrityService.verifyIntegrity(metadata);

  // Emit per-chunk results
  metadata.chunks.forEach(chunk => {
    const corrupted = result.corruptedChunks.includes(chunk.index);
    logEmitter.log('verify', corrupted
      ? `❌ Chunk ${chunk.index} — CORRUPTED`
      : `✅ Chunk ${chunk.index} — OK`
    );
  });

  if (result.intact) {
    logEmitter.log('verify', `✅ "${metadata.originalName}" integrity verified — Merkle root matches`);
  } else {
    logEmitter.log('verify', `❌ "${metadata.originalName}" CORRUPTED — Merkle mismatch. Bad chunks: ${result.corruptedChunks.join(', ')}`);
  }

  logger.info(
    `[Verify] fileId=${fileId} intact=${result.intact} storedRoot=${result.storedRoot} computedRoot=${result.computedRoot}`
  );

  // Map into detailed format required by the VerifyPanel
  const chunkResults = metadata.chunks.map(chunk => ({
    chunkIndex: chunk.index,
    status: result.corruptedChunks.includes(chunk.index) ? 'corrupted' : 'matching'
  }));

  return res.json({
    fileId,
    originalName: metadata.originalName,
    match: result.intact,
    merkleRootSaved: result.storedRoot,
    merkleRootRecomputed: result.computedRoot,
    chunkResults,
  });
};

/**
 * GET /api/files
 * Returns a paginated list of all active file metadata records.
 */
exports.listFiles = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
  const skip = (page - 1) * limit;

  const [files, total] = await Promise.all([
    FileMetadata.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-chunks') // omit chunk detail for listing
      .lean(),
    FileMetadata.countDocuments({ status: 'active' }),
  ]);

  return res.json({
    files,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

/**
 * GET /api/nodes
 * Returns the current state of the consistent hash ring.
 */
exports.listNodes = async (_req, res) => {
  const nodes = hashRing.getNodes();
  const ringInfo = nodes.map((node) => ({
    nodeUrl: node,
    virtualNodes: hashRing.getVirtualNodeCount(node),
  }));

  return res.json({
    totalNodes: nodes.length,
    virtualNodesPerNode: hashRing.virtualNodes,
    nodes: ringInfo,
  });
};

/**
 * GET /api/stats
 * Aggregate statistics for the dashboard, including per-node health status.
 */
exports.getStats = async (req, res) => {
  // Aggregate stats from MongoDB
  const stats = await FileMetadata.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalChunks: { $sum: { $size: "$chunks" } },
        avgUploadTime: { $avg: "$uploadTimeMs" }
      }
    }
  ]);

  // Determine chunks per node by checking all active files
  const allActive = await FileMetadata.find({ status: 'active' }).select('chunks.nodeUrl').lean();
  const chunksPerNode = {};
  for (const file of allActive) {
    for (const chunk of file.chunks) {
      chunksPerNode[chunk.nodeUrl] = (chunksPerNode[chunk.nodeUrl] || 0) + 1;
    }
  }

  // Ping each node's /health endpoint concurrently
  const ringNodes = hashRing.getNodes();
  const nodeHealthResults = await Promise.allSettled(
    ringNodes.map(async (nodeUrl) => {
      const res = await axios.get(`${nodeUrl}/health`, { timeout: 2000 });
      return { nodeUrl, status: 'alive', nodeId: res.data.nodeId };
    })
  );

  const nodes = nodeHealthResults.map((r, i) => ({
    nodeUrl: ringNodes[i],
    status: r.status === 'fulfilled' ? 'alive' : 'down',
    chunkCount: chunksPerNode[ringNodes[i]] || 0,
  }));

  // Last uploaded file
  const lastFile = await FileMetadata.findOne({ status: 'active' })
    .sort({ createdAt: -1 })
    .select('originalName createdAt')
    .lean();

  const agg = stats[0] || { totalFiles: 0, totalChunks: 0, avgUploadTime: 0 };

  return res.json({
    totalFiles: agg.totalFiles,
    totalChunks: agg.totalChunks,
    chunksPerNode,
    averageUploadTime: Math.round(agg.avgUploadTime || 0),
    lastUploadedFile: lastFile ? {
      name: lastFile.originalName,
      timestamp: lastFile.createdAt
    } : null,
    nodes,
  });
};

/**
 * GET /api/file/:id/detail
 * Returns full chunk metadata for the FileDetail panel.
 */
exports.getFileDetail = async (req, res) => {
  const { id: fileId } = req.params;

  const metadata = await FileMetadata.findOne({ fileId, status: 'active' }).lean();
  if (!metadata) {
    return res.status(404).json({ error: `File not found: ${fileId}` });
  }

  return res.json({
    fileId: metadata.fileId,
    originalName: metadata.originalName,
    mimeType: metadata.mimeType,
    totalSize: metadata.totalSize,
    fileHash: metadata.fileHash,
    merkleRoot: metadata.merkleRoot,
    owner: metadata.owner,
    uploadTimeMs: metadata.uploadTimeMs,
    createdAt: metadata.createdAt,
    chunks: metadata.chunks.map(c => ({
      index: c.index,
      size: c.size,
      nodeUrl: c.nodeUrl,
      storageKey: c.storageKey,
      hash: c.hash,
    })),
  });
};

/**
 * POST /api/file/:id/corrupt/:chunkIndex
 * Fetches a chunk and flips bytes at its midpoint to simulate corruption.
 * For demo/educational purposes only.
 */
exports.corruptChunk = async (req, res) => {
  const { id: fileId, chunkIndex: chunkIndexStr } = req.params;
  const chunkIndex = parseInt(chunkIndexStr, 10);

  const metadata = await FileMetadata.findOne({ fileId, status: 'active' }).lean();
  if (!metadata) {
    return res.status(404).json({ error: `File not found: ${fileId}` });
  }

  const chunk = metadata.chunks.find(c => c.index === chunkIndex);
  if (!chunk) {
    return res.status(404).json({ error: `Chunk ${chunkIndex} not found for file ${fileId}` });
  }

  try {
    // 1. Fetch the original chunk binary
    const fetchResp = await axios.get(`${chunk.nodeUrl}/chunks/${chunk.storageKey}`, {
      responseType: 'arraybuffer',
      timeout: 5000,
    });
    const originalBuffer = Buffer.from(fetchResp.data);

    if (originalBuffer.length < 4) {
      return res.status(400).json({ error: 'Chunk is too small to corrupt safely' });
    }

    // 2. Flip ~8 bytes near the middle
    const corruptedBuffer = Buffer.from(originalBuffer);
    const mid = Math.floor(corruptedBuffer.length / 2);
    for (let i = 0; i < Math.min(8, corruptedBuffer.length - mid); i++) {
      corruptedBuffer[mid + i] = corruptedBuffer[mid + i] ^ 0xFF; // flip all bits
    }

    // 3. Re-upload corrupted version back to the same node
    await axios.put(`${chunk.nodeUrl}/chunks/${chunk.storageKey}`, corruptedBuffer, {
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 5000,
    });

    const port = chunk.nodeUrl.split(':').pop();
    logEmitter.log('error', `⚠️ Chunk ${chunkIndex} of "${metadata.originalName}" corrupted on node port ${port}`);
    logger.warn(`[Corrupt] Corrupted chunk ${chunkIndex} of fileId=${fileId} on ${chunk.nodeUrl}`);

    return res.json({
      message: `Chunk ${chunkIndex} has been corrupted`,
      chunkIndex,
      nodeUrl: chunk.nodeUrl,
      originalSize: originalBuffer.length,
    });
  } catch (err) {
    logger.error(`[Corrupt] Failed: ${err.message}`);
    return res.status(500).json({ error: `Failed to corrupt chunk: ${err.message}` });
  }
};
