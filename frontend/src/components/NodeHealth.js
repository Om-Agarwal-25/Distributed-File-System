/**
 * NodeHealth.js — Displays health indicator cards for each DFS storage node.
 * Auto-refreshes every 5 seconds by lifting state via onStatsUpdate prop.
 */

import React, { useEffect, useState } from 'react';
import { getStats } from '../services/api';

const NODE_COLORS = {
  0: '#378ADD',
  1: '#7F77DD',
  2: '#1D9E75',
};

const portFromUrl = (url) => url.split(':').pop();
const nameFromUrl = (url, i) => `Node ${i + 1}`;

const Skeleton = ({ width, height }) => (
  <div style={{
    width, height,
    background: 'linear-gradient(90deg, #1e293b 25%, #2d3f55 50%, #1e293b 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '6px'
  }}/>
);

export default function NodeHealth({ onStatsReady, onRefreshState }) {
  const [nodes, setNodes] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    onRefreshState?.(true);
    try {
      const { data } = await getStats();
      setNodes(data.nodes || []);
      onStatsReady?.(data);
    } catch (err) {
      console.error('NodeHealth fetch failed', err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      onRefreshState?.(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, []);

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ flex: '1 1 200px', height: '120px' }}>
            <Skeleton width="100%" height="100%" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
      {nodes.map((node, i) => {
        const alive = node.status === 'alive';
        const color = NODE_COLORS[i % Object.keys(NODE_COLORS).length];
        return (
          <div
            key={node.nodeUrl}
            style={{
              flex: '1 1 200px',
              height: '120px',
              background: 'var(--bg-secondary)',
              border: `1px solid ${alive ? color + '55' : '#ef444455'}`,
              borderRadius: 'var(--radius)',
              padding: '1rem',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}
          >
            {/* Color accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: alive ? color : '#ef4444' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  {nameFromUrl(node.nodeUrl, i)}
                </p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0' }}>
                  :{portFromUrl(node.nodeUrl)}
                </p>
              </div>
              {/* Status dot with refreshing opacity fade */}
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: alive ? '#22c55e' : '#ef4444',
                boxShadow: alive ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
                flexShrink: 0, marginTop: '4px',
                opacity: refreshing ? 0.3 : 1,
                transition: 'opacity 0.3s ease'
              }} />
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chunks</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color }}>
                {node.chunkCount}
              </span>
            </div>

            <div style={{ marginTop: '4px' }}>
              <span style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: '999px',
                background: alive ? '#22c55e22' : '#ef444422',
                color: alive ? '#22c55e' : '#ef4444',
                fontWeight: 600,
                display: 'inline-block',
                opacity: refreshing ? 0.5 : 1,
                transition: 'opacity 0.3s ease'
              }}>
                {alive ? '● ALIVE' : '● DOWN'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
