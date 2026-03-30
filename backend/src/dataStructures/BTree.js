/**
 * BTree.js — Production-quality B-Tree implementation for file metadata indexing.
 *
 * A B-Tree of minimum degree `t` satisfies:
 *  - Every node has at most (2t - 1) keys.
 *  - Every non-root node has at least (t - 1) keys.
 *  - All leaves are at the same depth.
 *
 * Operations:
 *  insert(key, value)  — O(log n) amortised
 *  search(key)         — O(log n)
 *  delete(key)         — O(log n)
 *  inOrder()           — O(n) traversal returning sorted [key, value] pairs
 *
 * Keys are compared lexicographically (strings) which works well for UUIDs.
 */

'use strict';

// ── BTreeNode ─────────────────────────────────────────────────────────────────
class BTreeNode {
  /**
   * @param {boolean} isLeaf - Whether this node is a leaf.
   */
  constructor(isLeaf = true) {
    this.isLeaf = isLeaf;
    /** @type {string[]} */
    this.keys = [];
    /** @type {any[]} */
    this.values = []; // parallel array — values[i] corresponds to keys[i]
    /** @type {BTreeNode[]} */
    this.children = [];
  }
}

// ── BTree ─────────────────────────────────────────────────────────────────────
class BTree {
  /**
   * @param {number} t - Minimum degree (t ≥ 2). Affects node capacity.
   *                     t=3 → each node can hold 2–5 keys.
   */
  constructor(t = 3) {
    if (t < 2) throw new RangeError('Minimum degree t must be ≥ 2');
    this.t = t;
    this.root = new BTreeNode(true);
    this.size = 0; // track number of stored key-value pairs
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Insert a key-value pair. If the key exists, its value is updated.
   * @param {string} key
   * @param {any}    value
   */
  insert(key, value) {
    const root = this.root;

    // Check if the key already exists → update in-place
    if (this._update(root, key, value)) return;

    // If root is full, split it before inserting
    if (root.keys.length === 2 * this.t - 1) {
      const newRoot = new BTreeNode(false);
      newRoot.children.push(this.root);
      this._splitChild(newRoot, 0);
      this.root = newRoot;
    }

    this._insertNonFull(this.root, key, value);
    this.size++;
  }

  /**
   * Search for a value by key.
   * @param {string} key
   * @returns {any|null} The associated value, or null if not found.
   */
  search(key) {
    return this._search(this.root, key);
  }

  /**
   * Delete a key from the tree.
   * @param {string} key
   * @returns {boolean} true if the key was found and deleted.
   */
  delete(key) {
    const found = this._delete(this.root, key);
    if (found) {
      this.size--;
      // If root has no keys (after merging), update root
      if (this.root.keys.length === 0 && !this.root.isLeaf) {
        this.root = this.root.children[0];
      }
    }
    return found;
  }

  /**
   * In-order traversal.
   * @returns {Array<{key: string, value: any}>} Sorted entries.
   */
  inOrder() {
    const result = [];
    this._inOrder(this.root, result);
    return result;
  }

  /** @returns {number} Number of key-value pairs stored. */
  getSize() {
    return this.size;
  }

  /**
   * Serialize the tree structure for the visual dashboard.
   * @returns {Object} JSON representation of the tree branches and keys.
   */
  toJSON() {
    return this._nodeToJSON(this.root);
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Helper to serialize a node recursively.
   * @private
   */
  _nodeToJSON(node) {
    if (!node) return null;
    return {
      keys: [...node.keys], // clone array
      isLeaf: node.isLeaf,
      children: node.isLeaf ? [] : node.children.map(c => this._nodeToJSON(c))
    };
  }

  /**
   * Try to update an existing key in the subtree rooted at node.
   * @private
   */
  _update(node, key, value) {
    const idx = node.keys.findIndex((k) => k === key);
    if (idx !== -1) {
      node.values[idx] = value;
      return true;
    }
    if (node.isLeaf) return false;

    // Find the child to descend into
    let childIdx = node.keys.length;
    for (let i = 0; i < node.keys.length; i++) {
      if (key < node.keys[i]) { childIdx = i; break; }
    }
    return this._update(node.children[childIdx], key, value);
  }

  /**
   * Insert key into a node guaranteed to be non-full.
   * @private
   */
  _insertNonFull(node, key, value) {
    let i = node.keys.length - 1;

    if (node.isLeaf) {
      // Shift keys/values right to make room
      node.keys.push(null);
      node.values.push(null);
      while (i >= 0 && key < node.keys[i]) {
        node.keys[i + 1] = node.keys[i];
        node.values[i + 1] = node.values[i];
        i--;
      }
      node.keys[i + 1] = key;
      node.values[i + 1] = value;
    } else {
      // Find the child to recurse into
      while (i >= 0 && key < node.keys[i]) i--;
      i++;
      if (node.children[i].keys.length === 2 * this.t - 1) {
        this._splitChild(node, i);
        if (key > node.keys[i]) i++;
      }
      this._insertNonFull(node.children[i], key, value);
    }
  }

  /**
   * Split the i-th child of parent (which must be full).
   * @private
   */
  _splitChild(parent, i) {
    const t = this.t;
    const fullChild = parent.children[i];
    const newChild = new BTreeNode(fullChild.isLeaf);

    // The median key moves up to the parent
    const medianKey = fullChild.keys[t - 1];
    const medianVal = fullChild.values[t - 1];

    // New child gets the right half
    newChild.keys = fullChild.keys.splice(t); // keys[t..2t-2]
    newChild.values = fullChild.values.splice(t);
    fullChild.keys.pop(); // remove median from left child (keys[t-1])
    fullChild.values.pop();

    if (!fullChild.isLeaf) {
      newChild.children = fullChild.children.splice(t);
    }

    // Insert median into parent
    parent.keys.splice(i, 0, medianKey);
    parent.values.splice(i, 0, medianVal);
    parent.children.splice(i + 1, 0, newChild);
  }

  /**
   * Recursive search.
   * @private
   */
  _search(node, key) {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;
    if (i < node.keys.length && key === node.keys[i]) return node.values[i];
    if (node.isLeaf) return null;
    return this._search(node.children[i], key);
  }

  /**
   * Recursive delete. Returns true if the key was deleted.
   * @private
   */
  _delete(node, key) {
    const t = this.t;
    const idx = node.keys.indexOf(key);

    if (idx !== -1) {
      // Case 1: key found in this node
      if (node.isLeaf) {
        node.keys.splice(idx, 1);
        node.values.splice(idx, 1);
        return true;
      }

      const leftChild = node.children[idx];
      const rightChild = node.children[idx + 1];

      if (leftChild.keys.length >= t) {
        // Case 2a: left child has ≥ t keys → replace with predecessor
        const [predKey, predVal] = this._getPredecessor(leftChild);
        node.keys[idx] = predKey;
        node.values[idx] = predVal;
        return this._delete(leftChild, predKey);
      } else if (rightChild.keys.length >= t) {
        // Case 2b: right child has ≥ t keys → replace with successor
        const [succKey, succVal] = this._getSuccessor(rightChild);
        node.keys[idx] = succKey;
        node.values[idx] = succVal;
        return this._delete(rightChild, succKey);
      } else {
        // Case 2c: both children have t-1 keys → merge
        this._merge(node, idx);
        return this._delete(leftChild, key);
      }
    } else {
      // key not in this node
      if (node.isLeaf) return false; // key doesn't exist

      let childIdx = node.keys.length;
      for (let i = 0; i < node.keys.length; i++) {
        if (key < node.keys[i]) { childIdx = i; break; }
      }

      const child = node.children[childIdx];
      if (child.keys.length < t) {
        this._fill(node, childIdx);
        // After fill, the child index may have shifted (during merge)
        return this._delete(node, key);
      }
      return this._delete(child, key);
    }
  }

  /** Get the in-order predecessor key,value from a subtree. @private */
  _getPredecessor(node) {
    while (!node.isLeaf) node = node.children[node.children.length - 1];
    return [node.keys[node.keys.length - 1], node.values[node.values.length - 1]];
  }

  /** Get the in-order successor key,value from a subtree. @private */
  _getSuccessor(node) {
    while (!node.isLeaf) node = node.children[0];
    return [node.keys[0], node.values[0]];
  }

  /**
   * Merge child[idx+1] into child[idx], pulling down the separator key.
   * @private
   */
  _merge(parent, idx) {
    const leftChild = parent.children[idx];
    const rightChild = parent.children[idx + 1];

    // Pull the separator key down into the left child
    leftChild.keys.push(parent.keys[idx]);
    leftChild.values.push(parent.values[idx]);

    // Copy right child's keys and children into left child
    leftChild.keys.push(...rightChild.keys);
    leftChild.values.push(...rightChild.values);
    if (!leftChild.isLeaf) leftChild.children.push(...rightChild.children);

    // Remove the separator and the right child from the parent
    parent.keys.splice(idx, 1);
    parent.values.splice(idx, 1);
    parent.children.splice(idx + 1, 1);
  }

  /**
   * Ensure child[idx] has at least t keys (before descending into it).
   * @private
   */
  _fill(parent, idx) {
    const t = this.t;
    const leftSibling = idx > 0 ? parent.children[idx - 1] : null;
    const rightSibling = idx < parent.children.length - 1 ? parent.children[idx + 1] : null;

    if (leftSibling && leftSibling.keys.length >= t) {
      this._borrowFromPrev(parent, idx);
    } else if (rightSibling && rightSibling.keys.length >= t) {
      this._borrowFromNext(parent, idx);
    } else {
      if (leftSibling) {
        this._merge(parent, idx - 1);
      } else {
        this._merge(parent, idx);
      }
    }
  }

  /** Borrow a key from the left sibling. @private */
  _borrowFromPrev(parent, idx) {
    const child = parent.children[idx];
    const sibling = parent.children[idx - 1];

    child.keys.unshift(parent.keys[idx - 1]);
    child.values.unshift(parent.values[idx - 1]);

    parent.keys[idx - 1] = sibling.keys.pop();
    parent.values[idx - 1] = sibling.values.pop();

    if (!sibling.isLeaf) child.children.unshift(sibling.children.pop());
  }

  /** Borrow a key from the right sibling. @private */
  _borrowFromNext(parent, idx) {
    const child = parent.children[idx];
    const sibling = parent.children[idx + 1];

    child.keys.push(parent.keys[idx]);
    child.values.push(parent.values[idx]);

    parent.keys[idx] = sibling.keys.shift();
    parent.values[idx] = sibling.values.shift();

    if (!sibling.isLeaf) child.children.push(sibling.children.shift());
  }

  /** In-order traversal helper. @private */
  _inOrder(node, result) {
    for (let i = 0; i < node.keys.length; i++) {
      if (!node.isLeaf) this._inOrder(node.children[i], result);
      result.push({ key: node.keys[i], value: node.values[i] });
    }
    if (!node.isLeaf) this._inOrder(node.children[node.keys.length], result);
  }
}

module.exports = BTree;
