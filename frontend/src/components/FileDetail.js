/**
 * FileDetail.js — Expanded file detail panel with full chunk table,
 * Simulate Corruption button, and integrated Verify action.
 *
 * Props:
 *  file         — basic file row meta from FileList (fileId, originalName, etc.)
 *  onClose      — callback to close the panel (Escape / click outside)
 *  onVerify     — callback to show VerifyPanel with result data
 */

import React, { useEffect, useState, useCallback } from 'react';
import { verifyFile } from '../services/api';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const NODE_COLORS = {
  4001: '#378ADD',
  4002: '#7F77DD',
  4003: '#1D9E75',
};

const portFromUrl = (url) => url.split(':').pop();
const nodeColor = (url) => NODE_COLORS[portFromUrl(url)] || '#8b949e';

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const Skeleton = ({ width, height }) => (
  <div style={{
    width, height,
    background: 'linear-gradient(90deg, #1e293b 25%, #2d3f55 50%, #1e293b 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '6px'
  }}/>
);

export default function FileDetail({ file, onClose, onVerify }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [corruptTarget, setCorruptTarget] = useState('');
  const [corruptMsg, setCorruptMsg] = useState(null);
  const [corrupting, setCorrupting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Fetch full detail
  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE}/file/${file.fileId}/detail`)
      .then(r => { setDetail(r.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [file.fileId]);

  const handleCorrupt = useCallback(async () => {
    if (corruptTarget === '') return;
    setCorrupting(true);
    setCorruptMsg(null);
    try {
      const r = await axios.post(`${API_BASE}/file/${file.fileId}/corrupt/${corruptTarget}`);
      const port = r.data.nodeUrl.split(':').pop();
      setCorruptMsg(`⚠️ Chunk ${r.data.chunkIndex} has been corrupted on Node (port ${port})`);
    } catch (err) {
      setCorruptMsg(`❌ Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setCorrupting(false);
    }
  }, [file.fileId, corruptTarget]);

  const handleVerify = useCallback(async () => {
    setVerifying(true);
    try {
      const r = await verifyFile(file.fileId);
      onVerify?.(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  }, [file.fileId, onVerify]);

  return (
    <>
      <style>
        {`@keyframes expandPanel {
          from { max-height: 0; opacity: 0; overflow: hidden; }
          to { max-height: 800px; opacity: 1; overflow: hidden; }
        }`}
      </style>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 100, backdropFilter: 'blur(4px)',
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 101, width: 'min(92vw, 760px)',
        height: '600px', // Fixed final height to prevent shrinking
        background: '#1e293b', border: '1px solid #334155',
        borderRadius: '12px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        animation: 'expandPanel 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#f1f5f9' }}>📂 {file.originalName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1.25rem', flex: 1 }}>
          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} width="100%" height="52px" />)
            ) : [
              ['Size', formatBytes(detail.totalSize)],
              ['Chunks', detail.chunks.length],
              ['Owner', detail.owner],
              ['Upload Time', `${detail.uploadTimeMs ?? '—'} ms`],
              ['Uploaded', new Date(detail.createdAt).toLocaleString()],
              ['File ID', detail.fileId.slice(0, 18) + '…'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#0f172a', borderRadius: '6px', padding: '0.6rem 0.85rem' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>{k}</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#f1f5f9', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Merkle Root */}
          <div style={{ background: '#0f172a', borderRadius: '6px', padding: '0.6rem 0.85rem', marginBottom: '1.25rem', height: '64px' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Merkle Root</p>
            {loading ? <div style={{ marginTop: '8px' }}><Skeleton width="80%" height="16px" /></div> : (
              <p style={{ margin: '4px 0 0', fontFamily: 'monospace', fontSize: '0.8rem', color: '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail.merkleRoot}</p>
            )}
          </div>

          {/* Chunk Table */}
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chunk Distribution</p>
          <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #334155', marginBottom: '1.25rem', minHeight: '180px' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#64748b' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, width: '15%' }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, width: '20%' }}>Size</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, width: '30%' }}>Node</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, width: '35%' }}>Hash</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={`skel-${i}`} style={{ borderTop: '1px solid #1e293b', height: '40px' }}>
                      <td style={{ padding: '7px 10px' }}><Skeleton width="40%" height="14px" /></td>
                      <td style={{ padding: '7px 10px' }}><Skeleton width="60%" height="14px" /></td>
                      <td style={{ padding: '7px 10px' }}><Skeleton width="80%" height="20px" /></td>
                      <td style={{ padding: '7px 10px' }}><Skeleton width="90%" height="14px" /></td>
                    </tr>
                  ))
                ) : (
                  detail.chunks.sort((a, b) => a.index - b.index).map(c => (
                    <tr key={c.index} style={{ borderTop: '1px solid #1e293b', height: '40px' }}>
                      <td style={{ padding: '7px 10px', color: '#f97316', fontWeight: 600 }}>{c.index}</td>
                      <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{formatBytes(c.size)}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: nodeColor(c.nodeUrl) + '22', color: nodeColor(c.nodeUrl), fontSize: '0.75rem', fontWeight: 600 }}>
                          :{portFromUrl(c.nodeUrl)}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#a855f7', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.hash.slice(0, 14)}…
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Simulate Corruption */}
          <div style={{ background: '#0f172a', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', border: '1px solid #422006' }}>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', color: '#f97316', fontWeight: 600 }}>🧪 Simulate Corruption</p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={corruptTarget}
                onChange={e => setCorruptTarget(e.target.value)}
                disabled={loading}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', padding: '6px 10px', borderRadius: '6px', fontSize: '0.82rem', flex: 1 }}
              >
                <option value="">Select chunk to corrupt…</option>
                {!loading && detail.chunks.sort((a, b) => a.index - b.index).map(c => (
                  <option key={c.index} value={c.index}>Chunk {c.index} (Node :{portFromUrl(c.nodeUrl)})</option>
                ))}
              </select>
              <button
                onClick={handleCorrupt}
                disabled={corrupting || corruptTarget === '' || loading}
                style={{
                  minWidth: '90px', padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: corruptTarget === '' ? '#334155' : '#dc2626', color: '#fff', fontSize: '0.82rem', fontWeight: 600
                }}
              >
                {corrupting ? <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', display: 'inline-block' }} /> : 'Corrupt'}
              </button>
            </div>
            {/* Fixed height for message area */}
            <div style={{ height: '24px', marginTop: '0.5rem' }}>
              {corruptMsg && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#fbbf24', fontFamily: 'monospace' }}>{corruptMsg}</p>
              )}
            </div>
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={verifying || loading}
            style={{
              width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #10b981',
              background: '#10b98111', color: '#10b981', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
            }}
          >
            {verifying ? <><div className="spinner" style={{ width: '16px', height: '16px', borderColor: '#10b981', borderTopColor: 'transparent' }}/> Verifying…</> : '🔍 Verify Integrity'}
          </button>
        </div>
      </div>
    </>
  );
}
