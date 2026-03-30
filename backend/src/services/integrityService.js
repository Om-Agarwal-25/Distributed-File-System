/**
 * integrityService.js — File integrity verification using Merkle Trees.
 *
 * Workflow:
 *  1. Fetch all chunks from their storage nodes.
 *  2. Re-hash each chunk with SHA-256.
 *  3. Rebuild the Merkle Tree from the fresh hashes.
 *  4. Compare the computed root against the stored root.
 *  5. Identify any chunks whose hash has changed (corrupted chunks).
 */

'use strict';

const crypto = require('crypto');
const MerkleTree = require('../dataStructures/MerkleTree');
const storageService = require('./storageService');
const logger = require('../utils/logger');

/**
 * @typedef {Object} IntegrityResult
 * @property {boolean}  intact          - True if the file is uncorrupted.
 * @property {string}   storedRoot      - Merkle root stored at upload time.
 * @property {string}   computedRoot    - Merkle root computed from current chunks.
 * @property {number[]} corruptedChunks - Indices of chunks that failed hash check.
 */

/**
 * Verify the integrity of a stored file.
 *
 * @param {{ chunks: Array<{index, hash, nodeUrl, storageKey}>, merkleRoot: string }} metadata
 * @returns {Promise<IntegrityResult>}
 */
async function verifyIntegrity(metadata) {
  const { chunks: chunkMeta, merkleRoot: storedRoot } = metadata;

  // 1. Fetch all chunks from storage nodes
  const fetched = await storageService.fetchChunks(chunkMeta);

  // 2. Re-hash each obtained chunk; track any that failed to fetch or whose
  //    hash doesn't match the stored value
  const corruptedChunks = [];
  const freshHashes = fetched.map(({ index, data, error }) => {
    const storedChunkHash = chunkMeta.find((c) => c.index === index)?.hash;

    if (error || !data) {
      logger.warn(`[Integrity] Chunk ${index} could not be fetched: ${error}`);
      corruptedChunks.push(index);
      // Return the stored hash so the Merkle tree can still be built
      // The root mismatch will still be detected
      return storedChunkHash || 'missing';
    }

    const liveHash = crypto.createHash('sha256').update(data).digest('hex');
    if (liveHash !== storedChunkHash) {
      logger.warn(`[Integrity] Chunk ${index} hash mismatch — expected ${storedChunkHash}, got ${liveHash}`);
      corruptedChunks.push(index);
    }

    return liveHash;
  });

  // 3. Rebuild Merkle Tree from fresh hashes
  const freshTree = new MerkleTree(freshHashes);
  const computedRoot = freshTree.getRoot();

  // 4. Compare roots
  const intact = computedRoot === storedRoot && corruptedChunks.length === 0;

  return { intact, storedRoot, computedRoot, corruptedChunks };
}

module.exports = { verifyIntegrity };
