/**
 * ConsistentHashing.js — Consistent hash ring for distributing file chunks
 * across storage nodes (Docker containers).
 *
 * Algorithm:
 *  - Each physical node is represented by `virtualNodes` virtual nodes on a
 *    360-degree integer ring (0 – 2^32 - 1).
 *  - Virtual nodes are placed by hashing "{nodeUrl}#vn{i}" with MD5, then
 *    taking the first 8 hex chars as a uint32.
 *  - Chunk assignment: hash the chunkKey → walk the ring clockwise to find
 *    the first virtual node ≥ hash → return its owning physical node.
 *  - Adding/removing a physical node only remaps a 1/N fraction of keys on
 *    average, where N is the number of physical nodes.
 *
 * Complexity:
 *  addNode    — O(V log V)  where V = total virtual nodes on ring
 *  removeNode — O(V)
 *  getNode    — O(log V)    binary search on sorted ring
 */

'use strict';

const crypto = require('crypto');

class ConsistentHashing {
  /**
   * @param {number} virtualNodes - Number of virtual nodes per physical node.
   *                                Higher values improve distribution uniformity.
   *                                Typical range: 100–300.
   */
  constructor(virtualNodes = 150) {
    this.virtualNodes = virtualNodes;
    /** @type {Map<string, string>} Maps virtual-node hash key → physical node URL */
    this._ring = new Map();
    /** @type {string[]} Sorted list of hash-ring positions (as hex strings for lexicographic order) */
    this._sortedKeys = [];
    /** @type {Set<string>} Physical node URLs currently on the ring */
    this._nodes = new Set();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Add a physical node to the ring by placing `virtualNodes` virtual entries.
   * @param {string} nodeUrl - URL of the storage node (e.g. "http://node1:4001").
   */
  addNode(nodeUrl) {
    if (this._nodes.has(nodeUrl)) return; // idempotent
    this._nodes.add(nodeUrl);

    for (let i = 0; i < this.virtualNodes; i++) {
      const vnKey = this._hash(`${nodeUrl}#vn${i}`);
      this._ring.set(vnKey, nodeUrl);
      this._insertSorted(vnKey);
    }
  }

  /**
   * Remove a physical node (and all its virtual nodes) from the ring.
   * @param {string} nodeUrl
   */
  removeNode(nodeUrl) {
    if (!this._nodes.has(nodeUrl)) return;
    this._nodes.delete(nodeUrl);

    for (let i = 0; i < this.virtualNodes; i++) {
      const vnKey = this._hash(`${nodeUrl}#vn${i}`);
      this._ring.delete(vnKey);
      this._removeSorted(vnKey);
    }
  }

  /**
   * Get the storage node responsible for a given chunk key.
   * Uses binary search to find the first ring position ≥ hash(chunkKey).
   *
   * @param {string} chunkKey - Unique identifier for the chunk (e.g. "fileId-chunkIndex").
   * @returns {string} URL of the responsible storage node.
   * @throws {Error} If the ring is empty (no nodes have been added).
   */
  getNode(chunkKey) {
    if (this._sortedKeys.length === 0) {
      throw new Error('ConsistentHashing: ring is empty — add at least one node first.');
    }

    const hash = this._hash(chunkKey);
    const idx = this._bisect(hash);

    // If hash is beyond all ring positions, wrap around to the first
    const ringKey = this._sortedKeys[idx % this._sortedKeys.length];
    return this._ring.get(ringKey);
  }

  /**
   * Return all physical nodes currently on the ring.
   * @returns {string[]}
   */
  getNodes() {
    return Array.from(this._nodes);
  }

  /**
   * Return the number of virtual nodes on the ring for a specific physical node.
   * Useful for debugging / diagnostics.
   * @param {string} nodeUrl
   * @returns {number}
   */
  getVirtualNodeCount(nodeUrl) {
    return this._nodes.has(nodeUrl) ? this.virtualNodes : 0;
  }

  /**
   * Return the raw ring state (sorted virtual-node positions + their owner).
   * @returns {Array<{position: string, nodeUrl: string}>}
   */
  getRingState() {
    return this._sortedKeys.map((k) => ({ position: k, nodeUrl: this._ring.get(k) }));
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Compute an MD5 hash of the input string and return the first 8 hex characters
   * as a zero-padded 8-digit hex string (represents a uint32 range of 0 – FFFFFFFF).
   *
   * MD5 is used here purely for speed and distribution quality — NOT for security.
   *
   * @private
   * @param {string} input
   * @returns {string} 8-character lowercase hex string.
   */
  _hash(input) {
    return crypto.createHash('md5').update(input).digest('hex').slice(0, 8);
  }

  /**
   * Insert a key into the sorted ring array while maintaining sort order.
   * Uses a simple insertion into the correct position (ring size is bounded by
   * nodeCount × virtualNodes, so this is acceptable).
   * @private
   */
  _insertSorted(key) {
    const idx = this._bisect(key);
    this._sortedKeys.splice(idx, 0, key);
  }

  /**
   * Remove a key from the sorted ring array.
   * @private
   */
  _removeSorted(key) {
    const idx = this._sortedKeys.indexOf(key);
    if (idx !== -1) this._sortedKeys.splice(idx, 1);
  }

  /**
   * Binary search: find the index of the first element ≥ key.
   * Returns this._sortedKeys.length if all elements are < key (wrap-around case).
   * @private
   */
  _bisect(key) {
    let lo = 0;
    let hi = this._sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._sortedKeys[mid] < key) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}

module.exports = ConsistentHashing;
