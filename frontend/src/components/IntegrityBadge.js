/**
 * IntegrityBadge.js — Inline button that triggers Merkle-based integrity
 * verification for a file and displays the result.
 */

import React, { useState } from 'react';
import { verifyFile } from '../services/api';

export default function IntegrityBadge({ fileId, onVerifyResult }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ok' | 'corrupted'
  const [details, setDetails] = useState(null);

  const handleVerify = async (e) => {
    e.stopPropagation();
    setStatus('loading');
    setDetails(null);
    try {
      const res = await verifyFile(fileId);
      setDetails(res.data);
      setStatus(res.data.match ? 'ok' : 'corrupted');
      onVerifyResult?.(res.data);
    } catch {
      setStatus('error');
    }
  };

  let content;
  if (status === 'idle') {
    content = (
      <button className="btn btn-ghost" style={{ width: '100%', height: '24px', padding: 0, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleVerify}>
        🔍 Verify
      </button>
    );
  } else if (status === 'loading') {
    content = (
      <span className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', height: '24px', justifyContent: 'center', boxSizing: 'border-box' }}>
        <span className="spinner" style={{ width: '0.7rem', height: '0.7rem' }} /> Verifying…
      </span>
    );
  } else if (status === 'ok') {
    content = (
      <span className="badge badge-success" title={`Merkle root: ${details?.storedRoot?.slice(0, 12)}…`} style={{ display: 'flex', alignItems: 'center', width: '100%', height: '24px', justifyContent: 'center', boxSizing: 'border-box' }}>
        ✅ Intact
      </span>
    );
  } else if (status === 'corrupted') {
    content = (
      <span
        className="badge badge-danger"
        title={`Corrupted chunks: ${details?.corruptedChunks?.join(', ')}`}
        style={{ display: 'flex', alignItems: 'center', width: '100%', height: '24px', justifyContent: 'center', boxSizing: 'border-box' }}
      >
        ❌ Corrupted
      </span>
    );
  } else {
    content = <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', width: '100%', height: '24px', justifyContent: 'center', boxSizing: 'border-box' }}>⚠️ Error</span>;
  }

  return (
    <div style={{ width: '100px', display: 'inline-block' }}>
      {content}
    </div>
  );
}
