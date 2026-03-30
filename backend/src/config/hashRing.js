/**
 * hashRing.js — Singleton Consistent Hash Ring instance.
 *
 * Exporting the ring from its own module (instead of from server.js) avoids
 * the circular-dependency problem where fileController.js → server.js →
 * app.js → fileController.js would leave `hashRing` undefined at import time.
 *
 * Usage:
 *   const hashRing = require('../config/hashRing');
 *   hashRing.addNode('http://node1:4001');
 *   hashRing.getNode('some-chunk-key');
 */

'use strict';

const ConsistentHashing = require('../dataStructures/ConsistentHashing');

const VIRTUAL_NODES = parseInt(process.env.VIRTUAL_NODES || '150', 10);

// Single instance shared across the entire backend process
const hashRing = new ConsistentHashing(VIRTUAL_NODES);

module.exports = hashRing;
