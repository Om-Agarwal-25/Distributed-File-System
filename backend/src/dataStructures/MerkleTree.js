/**
 * MerkleTree.js — Merkle Tree for chunk-level data integrity verification.
 *
 * Construction:
 *  - Input: an ordered array of SHA-256 hex hashes (one per file chunk).
 *  - Leaves are created by double-hashing each input: SHA-256(SHA-256(chunkHash)).
 *    This mirrors Bitcoin's Merkle tree design and prevents second-preimage attacks.
 *  - Internal nodes: SHA-256(leftChildHash + rightChildHash).
 *  - If the number of nodes at a level is odd, the last node is duplicated
 *    (standard Merkle tree convention).
 *  - The root hash summarises the entire file content.
 *
 * Verification:
 *  - Re-build the tree from the freshly-downloaded chunk hashes.
 *  - Compare the computed root to the stored root.
 *  - Any single-byte change to any chunk will produce a different root.
 *
 * Complexity: O(n) build, O(log n) proof generation (path to root).
 */

'use strict';

const crypto = require('crypto');

/**
 * Double-SHA-256 of a string.
 * @param {string} data - Hex string or any UTF-8 string.
 * @returns {string} 64-character lowercase hex string.
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function doubleSha256(data) {
  return sha256(sha256(data));
}

class MerkleTree {
  /**
   * @param {string[]} chunkHashes - Ordered array of SHA-256 hex hashes,
   *                                  one per file chunk.
   * @throws {Error} If chunkHashes is empty.
   */
  constructor(chunkHashes) {
    if (!Array.isArray(chunkHashes) || chunkHashes.length === 0) {
      throw new Error('MerkleTree requires at least one chunk hash.');
    }
    this._levels = []; // _levels[0] = leaves, _levels[last] = [root]
    this._build(chunkHashes);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Get the Merkle root hash.
   * @returns {string} 64-char hex SHA-256 root hash.
   */
  getRoot() {
    const topLevel = this._levels[this._levels.length - 1];
    return topLevel[0];
  }

  /**
   * Get the full tree structure — useful for debugging / visualisation.
   * @returns {string[][]} Array of levels, each level is an array of hex hashes.
   *                       Index 0 = leaf level, last index = root level.
   */
  getLevels() {
    return this._levels;
  }

  /**
   * Get the tree as a nested object from root to leaves.
   * @returns {Object} Root node with { hash, left, right }
   */
  getTreeAsObject() {
    if (this._levels.length === 0) return null;

    let currentNodes = this._levels[0].map((hash) => ({ hash, left: null, right: null }));

    for (let level = 1; level < this._levels.length; level++) {
      const nextNodes = [];
      const parentHashes = this._levels[level];

      for (let i = 0; i < currentNodes.length; i += 2) {
        const left = currentNodes[i];
        const right = i + 1 < currentNodes.length ? currentNodes[i + 1] : left;
        const parentHash = parentHashes[Math.floor(i / 2)];
        nextNodes.push({ hash: parentHash, left, right });
      }
      currentNodes = nextNodes;
    }
    return currentNodes[0];
  }

  /**
   * Generate a Merkle proof for the chunk at `index`.
   * The proof is a sequence of {hash, direction} objects that, combined with
   * the leaf hash at `index`, should produce the root.
   *
   * @param {number} index - Zero-based chunk index.
   * @returns {Array<{hash: string, direction: 'left'|'right'}>} Proof path.
   */
  getProof(index) {
    if (index < 0 || index >= this._levels[0].length) {
      throw new RangeError(`Index ${index} out of range (${this._levels[0].length} leaves).`);
    }

    const proof = [];
    let currentIdx = index;

    for (let level = 0; level < this._levels.length - 1; level++) {
      const currentLevel = this._levels[level];
      const isRightNode = currentIdx % 2 === 1;
      const siblingIdx = isRightNode ? currentIdx - 1 : currentIdx + 1;

      // If sibling doesn't exist (odd node at end), it was duplicated
      const siblingHash = siblingIdx < currentLevel.length
        ? currentLevel[siblingIdx]
        : currentLevel[currentIdx];

      proof.push({
        hash: siblingHash,
        direction: isRightNode ? 'left' : 'right',
      });

      currentIdx = Math.floor(currentIdx / 2);
    }

    return proof;
  }

  /**
   * Verify a Merkle proof against the stored root.
   *
   * @param {string}                                     leafHash - The leaf hash to verify.
   * @param {Array<{hash: string, direction: 'left'|'right'}>} proof    - Proof from getProof().
   * @returns {boolean} True if the proof is valid.
   */
  verifyProof(leafHash, proof) {
    let currentHash = leafHash;

    for (const { hash: siblingHash, direction } of proof) {
      if (direction === 'left') {
        currentHash = sha256(siblingHash + currentHash);
      } else {
        currentHash = sha256(currentHash + siblingHash);
      }
    }

    return currentHash === this.getRoot();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Build the tree bottom-up from chunk hashes.
   * @private
   */
  _build(chunkHashes) {
    // Leaf level: double-hash each input (prevents second-preimage attacks)
    let currentLevel = chunkHashes.map((h) => doubleSha256(h));
    this._levels.push([...currentLevel]);

    // Build upward until we reach the root
    while (currentLevel.length > 1) {
      const nextLevel = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        // If no right sibling, duplicate the left (standard Merkle convention)
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        nextLevel.push(sha256(left + right));
      }

      this._levels.push([...nextLevel]);
      currentLevel = nextLevel;
    }
  }
}

module.exports = MerkleTree;
