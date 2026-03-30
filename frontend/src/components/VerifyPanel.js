/**
 * VerifyPanel.js — Visual integrity verification triggered when "Verify" is clicked on a file.
 * Animates re-hashing and tree rebuilding.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function VerifyPanel({ verifyData, onClose }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 0: Loading, Stage 1: File Hashes Checked, Stage 2: Merkle Tree Result
    const timer1 = setTimeout(() => setStage(1), 1000); // simulate fetch/hash delay
    const timer2 = setTimeout(() => setStage(2), 2500); // simulate merkle build
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [verifyData]);

  if (!verifyData) return null;

  const { match, merkleRootSaved, merkleRootRecomputed, chunkResults } = verifyData;

  return (
    <div className="card fade-in" style={{ marginTop: '1.5rem', position: 'relative' }}>
      <button className="btn btn-ghost" onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px' }}>✖</button>
      <p className="section-title">🔍 Integrity Verification</p>

      {stage === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <span className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
          <p style={{ marginTop: '0.75rem' }}>Re-fetching chunks from nodes...</p>
        </div>
      )}

      {stage >= 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Verifying Chunk Hashes...</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {chunkResults.map((c, i) => (
              <motion.div
                key={c.chunkIndex}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: 'spring' }}
                style={{
                  padding: '4px 8px',
                  background: c.status === 'matching' ? 'var(--viz-merkle)' : 'var(--danger)',
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
              >
                C{c.chunkIndex}: {c.status === 'matching' ? '✔' : '✖'}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {stage >= 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: `2px solid ${match ? 'var(--viz-merkle)' : 'var(--danger)'}` }}>
          {match ? (
            <>
              <h2 style={{ color: 'var(--viz-merkle)', marginBottom: '0.5rem' }}>✅ All chunks intact. Merkle root matches.</h2>
              <p className="hash" style={{ color: 'var(--text-primary)' }}>Saved: {merkleRootSaved}</p>
              <p className="hash" style={{ color: 'var(--text-primary)' }}>Computed: {merkleRootRecomputed}</p>
            </>
          ) : (
            <>
              <h2 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>❌ Corruption Detected! Merkle root mismatch.</h2>
              <p className="hash" style={{ color: 'var(--danger)' }}>Saved: {merkleRootSaved}</p>
              <p className="hash" style={{ color: 'var(--danger)' }}>Computed: {merkleRootRecomputed}</p>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
