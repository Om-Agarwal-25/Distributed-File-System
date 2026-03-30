/**
 * storageService.js — Communicates with storage nodes to upload, download,
 * and delete file chunks.
 *
 * Storage nodes expose a simple REST API:
 *  PUT    /chunks/:key        — Store a chunk (Buffer body)
 *  GET    /chunks/:key        — Retrieve a chunk
 *  DELETE /chunks/:key        — Delete a chunk
 *
 * Each chunk is stored under a key generated as:
 *   `{fileId}-chunk-{chunkIndex}`
 *
 * The storageService uses the Consistent Hash Ring (passed in from server.js)
 * to determine which node each chunk belongs to.
 */

'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Distribute file chunks across storage nodes using the hash ring.
 *
 * @param {import('../services/chunkingService').ChunkDescriptor[]} chunks
 * @param {string} fileId
 * @param {import('../dataStructures/ConsistentHashing')} hashRing
 * @returns {Promise<Array<{index, hash, size, nodeUrl, storageKey}>>}
 */
async function distributeChunks(chunks, fileId, hashRing) {
  const uploadPromises = chunks.map(async (chunk) => {
    const storageKey = `${fileId}-chunk-${chunk.index}`;
    const nodeUrl = hashRing.getNode(storageKey);

    try {
      await axios.put(`${nodeUrl}/chunks/${storageKey}`, chunk.data, {
        headers: { 'Content-Type': 'application/octet-stream' },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      logger.debug(`[Storage] Uploaded chunk ${storageKey} → ${nodeUrl}`);

      return {
        index: chunk.index,
        hash: chunk.hash,
        size: chunk.size,
        nodeUrl,
        storageKey,
      };
    } catch (err) {
      logger.error(`[Storage] Failed to upload chunk ${storageKey} to ${nodeUrl}: ${err.message}`);
      throw err;
    }
  });

  return Promise.all(uploadPromises);
}

/**
 * Reassemble a file by fetching all chunks from their respective nodes.
 *
 * @param {Array<{index, nodeUrl, storageKey, size}>} chunkMeta - Ordered chunk descriptors.
 * @returns {Promise<Buffer>} Reassembled file buffer.
 */
async function reassembleFile(chunkMeta) {
  // Sort by index to guarantee correct order
  const sorted = [...chunkMeta].sort((a, b) => a.index - b.index);

  const buffers = await Promise.all(
    sorted.map(async ({ storageKey, nodeUrl }) => {
      try {
        const response = await axios.get(`${nodeUrl}/chunks/${storageKey}`, {
          responseType: 'arraybuffer',
        });
        return Buffer.from(response.data);
      } catch (err) {
        logger.error(`[Storage] Failed to fetch chunk ${storageKey} from ${nodeUrl}: ${err.message}`);
        throw err;
      }
    })
  );

  return Buffer.concat(buffers);
}

/**
 * Fetch individual chunks without reassembling — used for integrity verification.
 *
 * @param {Array<{index, nodeUrl, storageKey}>} chunkMeta
 * @returns {Promise<Array<{index, data: Buffer}>>}
 */
async function fetchChunks(chunkMeta) {
  const sorted = [...chunkMeta].sort((a, b) => a.index - b.index);

  return Promise.all(
    sorted.map(async ({ index, storageKey, nodeUrl }) => {
      try {
        const response = await axios.get(`${nodeUrl}/chunks/${storageKey}`, {
          responseType: 'arraybuffer',
        });
        return { index, data: Buffer.from(response.data) };
      } catch (err) {
        logger.error(`[Storage] fetchChunks: chunk ${storageKey} @ ${nodeUrl} — ${err.message}`);
        return { index, data: null, error: err.message };
      }
    })
  );
}

/**
 * Delete chunks from their storage nodes.
 *
 * @param {Array<{nodeUrl, storageKey}>} chunkMeta
 * @returns {Promise<void>}
 */
async function deleteChunks(chunkMeta) {
  await Promise.all(
    chunkMeta.map(async ({ storageKey, nodeUrl }) => {
      try {
        await axios.delete(`${nodeUrl}/chunks/${storageKey}`);
        logger.debug(`[Storage] Deleted chunk ${storageKey} from ${nodeUrl}`);
      } catch (err) {
        // Log but don't fail — node may be down, chunk may already be gone
        logger.warn(`[Storage] Could not delete chunk ${storageKey} from ${nodeUrl}: ${err.message}`);
      }
    })
  );
}

module.exports = { distributeChunks, reassembleFile, fetchChunks, deleteChunks };
