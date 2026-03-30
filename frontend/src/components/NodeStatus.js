/**
 * NodeStatus.js — Displays the current state of the Consistent Hash Ring.
 * Shows each physical storage node, its URL, and virtual node count.
 */

import React, { useEffect, useState } from 'react';
import { getNodes } from '../services/api';

export default function NodeStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNodes();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not fetch node status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNodes(); }, []);

  return (
    <div className="card fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p className="section-title" style={{ marginBottom: 0 }}>🖥️ Storage Nodes (Consistent Hash Ring)</p>
        <button className="btn btn-ghost" onClick={fetchNodes} style={{ fontSize: '0.8rem' }}>
          🔄 Refresh
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <span className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--danger)', padding: '1rem' }}>⚠️ {error}</div>
      )}

      {data && (
        <>
          {/* Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            {[
              { label: 'Physical Nodes', value: data.totalNodes },
              { label: 'Virtual Nodes Each', value: data.virtualNodesPerNode },
              { label: 'Total Ring Entries', value: data.totalNodes * data.virtualNodesPerNode },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                }}
              >
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-hover)' }}>{value}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</p>
              </div>
            ))}
          </div>

          <hr className="divider" />

          {/* Node list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.nodes.map((node, i) => (
              <div
                key={node.nodeUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px', height: '32px',
                    background: `hsl(${(i * 120) % 360}, 60%, 40%)`,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    N{i + 1}
                  </div>
                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      Node {i + 1}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {node.nodeUrl}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-accent">
                    {node.virtualNodes} virtual nodes
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Consistent hashing explanation */}
          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1rem',
            background: 'var(--accent-light)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(99,102,241,0.3)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}>
            💡 <strong>Consistent Hashing</strong>: Each node is represented by {data.virtualNodesPerNode} virtual nodes
            on the ring. File chunks are assigned by hashing their key and walking the ring clockwise.
            Only ~1/N fraction of chunks are remapped when a node is added or removed.
          </div>
        </>
      )}
    </div>
  );
}
