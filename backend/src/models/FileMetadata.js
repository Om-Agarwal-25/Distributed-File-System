/**
 * FileMetadata.js — Mongoose model for persisted file metadata.
 *
 * Each document represents one uploaded file that has been chunked,
 * distributed across storage nodes, and indexed in the B-Tree.
 */

'use strict';

const mongoose = require('mongoose');

// ── Chunk sub-document schema ─────────────────────────────────────────────────
const ChunkSchema = new mongoose.Schema(
  {
    /** Zero-based index of this chunk within the file */
    index: { type: Number, required: true },
    /** SHA-256 hex digest of this chunk's raw bytes */
    hash: { type: String, required: true },
    /** Size in bytes of this chunk */
    size: { type: Number, required: true },
    /** URL of the storage node that holds this chunk */
    nodeUrl: { type: String, required: true },
    /** Key used to address the chunk on the storage node */
    storageKey: { type: String, required: true },
  },
  { _id: false }
);

// ── File metadata schema ──────────────────────────────────────────────────────
const FileMetadataSchema = new mongoose.Schema(
  {
    /** Unique file identifier (UUID v4) — also used as the B-Tree key */
    fileId: { type: String, required: true, unique: true, index: true },

    /** Original filename as provided by the uploader */
    originalName: { type: String, required: true },

    /** MIME type of the file */
    mimeType: { type: String, default: 'application/octet-stream' },

    /** Total size of the file in bytes */
    totalSize: { type: Number, required: true },

    /** Ordered list of chunk descriptors */
    chunks: { type: [ChunkSchema], required: true },

    /** Merkle root hash of all chunk hashes — used for integrity verification */
    merkleRoot: { type: String, required: true },

    /** SHA-256 hash of the entire original file */
    fileHash: { type: String, required: true },

    /** Username or ID of the uploader (extensible for auth) */
    owner: { type: String, default: 'anonymous' },

    /** High-level status of the file */
    status: {
      type: String,
      enum: ['active', 'deleted', 'corrupted'],
      default: 'active',
    },
    
    /** Total time taken to upload and process the file (ms) */
    uploadTimeMs: { type: Number, default: 0 },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    versionKey: false,
  }
);

module.exports = mongoose.model('FileMetadata', FileMetadataSchema);
