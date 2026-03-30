/**
 * UploadVisualizer.js — Framer Motion-based animated visualizer for file upload stages.
 * Steps:
 * 1. Chunking
 * 2. Hashing
 * 3. Merkle Tree Building
 * 4. Consistent Hashing Cluster Distribution
 * 5. B-Tree Metadata Insertion
 * 6. Done / Summary
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UploadVisualizer({ visualData, onComplete }) {
  const [stage, setStage] = useState(0);

  // Auto-advance stages every 1 second
  useEffect(() => {
    if (stage < 6) {
      const timer = setTimeout(() => setStage(s => s + 1), 1500); // 1.5s gives time for animations to play
      return () => clearTimeout(timer);
    } else {
      onComplete && onComplete();
    }
  }, [stage, onComplete]);

  if (!visualData) return null;

  const { chunks, merkleTree, consistentHashRing, btreeSnapshot, timings } = visualData;

  const renderStage = () => {
    switch (stage) {
      case 1: // Chunking
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stage-container">
            <h4>Stage 1: File Chunking <span style={{color: 'var(--text-muted)'}}>({timings.chunking}ms)</span></h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '1rem', justifyContent: 'center' }}>
              {chunks.map((c, i) => (
                <motion.div
                  key={c.chunkIndex}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1, type: 'spring' }}
                  style={{
                    padding: '8px 16px', background: 'var(--viz-chunk)', color: '#fff', borderRadius: '4px', fontWeight: 'bold'
                  }}
                >
                  Chunk {c.chunkIndex}
                </motion.div>
              ))}
            </div>
          </motion.div>
        );

      case 2: // Hashing
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stage-container">
            <h4>Stage 2: Chunk Hashing <span style={{color: 'var(--text-muted)'}}>({timings.chunking}ms)</span></h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '1rem', alignItems: 'center' }}>
              {chunks.map((c, i) => (
                <motion.div
                  key={c.chunkIndex}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div style={{ padding: '4px 8px', background: 'var(--viz-chunk)', color: '#fff', borderRadius: '4px', fontSize: '0.8rem' }}>C{c.chunkIndex}</div>
                  <div>→</div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 'auto' }}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--viz-hash)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  >
                    {c.hash.slice(0, 16)}...
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );

      case 3: // Merkle Tree
        const renderTree = (node, depth = 0) => {
          if (!node) return null;
          return (
            <div key={node.hash} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (4 - depth) * 0.3 }}
                style={{
                  padding: '4px 8px',
                  background: 'var(--viz-merkle)',
                  color: '#fff',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  border: depth === 0 ? '2px solid #fff' : 'none',
                  boxShadow: depth === 0 ? '0 0 10px var(--viz-merkle)' : 'none',
                  marginBottom: '1rem',
                  zIndex: 2
                }}
              >
                {node.hash.slice(0, 8)}
              </motion.div>
              {(node.left || node.right) && (
                <div style={{ display: 'flex', gap: '2rem', borderTop: '2px solid var(--border)', paddingTop: '1rem', position: 'relative' }}>
                  {node.left && renderTree(node.left, depth + 1)}
                  {node.right && node.right !== node.left && renderTree(node.right, depth + 1)}
                </div>
              )}
            </div>
          );
        };
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stage-container" style={{overflowX: 'auto'}}>
            <h4>Stage 3: Merkle Tree <span style={{color: 'var(--text-muted)'}}>({timings.merkleBuild}ms)</span></h4>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
              {renderTree(merkleTree)}
            </div>
          </motion.div>
        );

      case 4: // Consistent Hashing Ring
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stage-container">
            <h4>Stage 4: Consistent Hashing Cluster Distribution <span style={{color: 'var(--text-muted)'}}>({timings.distribution}ms)</span></h4>
            <div style={{ position: 'relative', width: '200px', height: '200px', margin: '2rem auto', borderRadius: '50%', border: '4px solid var(--border)' }}>
              {consistentHashRing.map((node, index) => {
                const angle = (index / consistentHashRing.length) * Math.PI * 2 - Math.PI / 2;
                const x = 100 + 80 * Math.cos(angle) - 20; // 20 is half width
                const y = 100 + 80 * Math.sin(angle) - 20;
                
                return (
                  <motion.div
                    key={node.nodeUrl}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.2, type: 'spring' }}
                    style={{
                      position: 'absolute', top: y, left: x, width: '40px', height: '40px',
                      background: 'var(--viz-ring)', color: '#fff', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 'bold', zIndex: 10
                    }}
                  >
                    N{index+1}
                  </motion.div>
                );
              })}
              {/* Chunks flying to nodes */}
              {chunks.map((c, i) => {
                const nodeIndex = consistentHashRing.findIndex(n => n.nodeUrl === c.assignedNode);
                const angle = (nodeIndex / consistentHashRing.length) * Math.PI * 2 - Math.PI / 2;
                const tx = 80 * Math.cos(angle);
                const ty = 80 * Math.sin(angle);
                
                return (
                  <motion.div
                    key={'c'+i}
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{ x: tx, y: ty, opacity: 1 }}
                    transition={{ delay: 1 + i * 0.1, duration: 0.5 }}
                    style={{
                      position: 'absolute', top: '90px', left: '90px', width: '20px', height: '20px',
                      background: 'var(--viz-chunk)', borderRadius: '4px', zIndex: 5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff'
                    }}
                  >
                    C{c.chunkIndex}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        );

      case 5: // B-Tree
        const renderBTree = (node, depth = 0) => {
          if (!node) return null;
          return (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: depth * 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 10px' }}
            >
              <div style={{ display: 'flex', gap: '4px', padding: '8px', background: 'var(--viz-btree)', borderRadius: '6px', color: '#fff', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                {node.keys.map(k => <div key={k} style={{padding: '2px 4px', background: 'rgba(0,0,0,0.2)', borderRadius:'2px'}}>{k.slice(0, 4)}</div>)}
              </div>
              {node.children && node.children.length > 0 && (
                <div style={{ display: 'flex', marginTop: '1rem', gap: '1rem', borderTop: '2px solid var(--border)', paddingTop: '1rem' }}>
                  {node.children.map((c, i) => <div key={i}>{renderBTree(c, depth + 1)}</div>)}
                </div>
              )}
            </motion.div>
          );
        };
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stage-container" style={{overflowX: 'auto'}}>
            <h4>Stage 5: Metadata Indexed in B-Tree</h4>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
              {renderBTree(btreeSnapshot)}
            </div>
          </motion.div>
        );

      case 6: // Done Summary
        return (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="stage-container">
            <h3 style={{color: 'var(--success)', marginBottom: '1rem'}}>✅ File Distributed and Indexed</h3>
            <div style={{display: 'flex', gap: '2rem', justifyContent: 'center', fontSize: '0.9rem'}}>
              <div>
                <p style={{color: 'var(--text-muted)'}}>Chunks Generated</p>
                <p style={{fontSize: '1.5rem', fontWeight:'bold', color: 'var(--viz-chunk)'}}>{chunks.length}</p>
              </div>
              <div>
                <p style={{color: 'var(--text-muted)'}}>Time Taken</p>
                <p style={{fontSize: '1.5rem', fontWeight:'bold', color: 'var(--text-primary)'}}>{timings.total} ms</p>
              </div>
              <div>
                <p style={{color: 'var(--text-muted)'}}>Data Integrity</p>
                <p style={{fontSize: '1.5rem', fontWeight:'bold', color: 'var(--viz-merkle)'}}>Secured (Merkle)</p>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card" style={{ marginTop: '1.5rem', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} style={{width: '100%', textAlign: 'center'}}>
          {stage > 0 && renderStage()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
