/**
 * ChunkDistribution.js — Recharts bar + donut charts + stat cards.
 * Data sourced from GET /api/stats. Auto-refreshes every 5 seconds.
 */

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

const NODE_PALETTE = ['#378ADD', '#7F77DD', '#1D9E75'];

const portLabel = (nodeUrl) => {
  const port = nodeUrl.split(':').pop();
  return `Node :${port}`;
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

export default function ChunkDistribution({ statsData, refreshing }) {
  const [stats, setStats] = useState(statsData || null);

  useEffect(() => {
    if (statsData) setStats(statsData);
  }, [statsData]);

  const barData = stats ? Object.entries(stats.chunksPerNode || {})
    .map(([nodeUrl, count], i) => ({
      name: portLabel(nodeUrl),
      chunks: count,
      color: NODE_PALETTE[i % NODE_PALETTE.length],
    }))
    .sort((a, b) => a.name.localeCompare(b.name)) : [];

  return (
    <div className="card" style={{ marginTop: '1.5rem', minHeight: '430px', display: 'flex', flexDirection: 'column' }}>
      <p className="section-title" style={{ marginBottom: '1rem' }}>📊 Chunk Distribution</p>

      {/* Chart Container - Fixed Height */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', height: '260px', opacity: refreshing ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
        
        {/* Bar Chart */}
        <div style={{ flex: '1 1 300px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '4px' }}>Chunks per Node</p>
          <div style={{ flex: 1, position: 'relative' }}>
            {!stats ? <Skeleton width="100%" height="100%" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: '6px' }} />
                  <Bar dataKey="chunks" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div style={{ flex: '1 1 260px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '4px' }}>Storage %</p>
          <div style={{ flex: 1, position: 'relative' }}>
            {!stats ? <Skeleton width="100%" height="100%" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={barData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={4}
                    dataKey="chunks"
                    nameKey="name"
                    stroke="none"
                  >
                    {barData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: '6px' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.25rem' }}>
        {!stats ? (
           <>
             <Skeleton width="100%" height="86px" />
             <Skeleton width="100%" height="86px" />
             <Skeleton width="100%" height="86px" />
           </>
        ) : [
          { label: 'Total Files', value: stats.totalFiles ?? 0, color: 'var(--text-primary)' },
          { label: 'Total Chunks', value: stats.totalChunks ?? 0, color: '#f97316' },
          { label: 'Avg Upload', value: `${stats.averageUploadTime ?? 0} ms`, color: 'var(--text-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ minWidth: 0, padding: '1rem', background: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 700, color, lineHeight: 1, opacity: refreshing ? 0.7 : 1, transition: 'opacity 0.2s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
