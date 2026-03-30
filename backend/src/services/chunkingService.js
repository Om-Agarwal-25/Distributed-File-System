/**
 * chunkingService.js — Splits an uploaded file into fixed-size chunks and
 * computes SHA-256 hashes for each chunk and the complete file.
 *
 * Design:
 *  - Uses Node.js streams to process files without loading the entire file
 *    into memory at once (important for large files).
 *  - Default chunk size: 1 MB (configurable via CHUNK_SIZE_BYTES env var).
 *  - Returns an ordered array of chunk descriptors, plus the whole-file hash.
 */

'use strict';

const fs = require('fs');
const crypto = require('crypto');

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE_BYTES || '1048576', 10); // 1 MB default

/**
 * @typedef {Object} ChunkDescriptor
 * @property {number} index     - Zero-based chunk index.
 * @property {Buffer} data      - Raw bytes of the chunk.
 * @property {string} hash      - SHA-256 hex hash of the chunk data.
 * @property {number} size      - Byte length of the chunk.
 */

/**
 * @typedef {Object} ChunkingResult
 * @property {ChunkDescriptor[]} chunks    - Ordered array of chunk descriptors.
 * @property {string}            fileHash  - SHA-256 hash of the entire file.
 * @property {number}            totalSize - Total file size in bytes.
 */

/**
 * Split a file on disk into fixed-size chunks and hash each one.
 *
 * @param {string} filePath - Absolute path to the file on disk.
 * @returns {Promise<ChunkingResult>}
 */
async function chunkFile(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
    const chunks = [];
    const wholeFileHasher = crypto.createHash('sha256');
    let index = 0;
    let totalSize = 0;

    stream.on('data', (buffer) => {
      // Each 'data' event delivers at most CHUNK_SIZE bytes
      // (the last chunk may be smaller)
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      wholeFileHasher.update(buffer);

      chunks.push({
        index,
        data: buffer, // Buffer reference — passed to storageService, then released
        hash,
        size: buffer.length,
      });

      totalSize += buffer.length;
      index++;
    });

    stream.on('end', () => {
      const fileHash = wholeFileHasher.digest('hex');
      resolve({ chunks, fileHash, totalSize });
    });

    stream.on('error', reject);
  });
}

module.exports = { chunkFile, CHUNK_SIZE };
