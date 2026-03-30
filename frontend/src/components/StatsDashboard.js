/**
 * StatsDashboard.js — Displays live statistics about the DFS cluster.
 * Fetches from /api/stats every 5 seconds. Uses Recharts for visualisations.
 */

import React, { useEffect, useState } from 'react';
import { getStats, getNodes } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Node colors from the spec
const NODE_COLORS = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function StatsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      // Fetch both aggregator stats and node info concurrently
      const [statsRes, nodesRes] = await Promise.all([
        getStats(),
        getNodes() // need virtual node info for context if desired
      ]);
      setStats({ ...statsRes.data, nodeMeta: nodesRes.data });
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    const intervalId = setInterval(fetchDashboardStats, 5000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        <span className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
        <p style={{ marginTop: '0.75rem' }}>Loading Cluster Stats…</p>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare data for bar chart
  const barData = Object.entries(stats.chunksPerNode).map(([nodeUrl, count]) => {
    // Extract node port or name from URL for cleaner display
    const label = nodeUrl.replace('http://', '').replace('localhost:', 'Node ');
    return { name: label, chunks: count, url: nodeUrl };
  }).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="card fade-in" style={{ marginBottom: '1.5rem' }}>
      <p className="section-title" style={{ marginBottom: '1rem' }}>📊 Cluster Statistics</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.5rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Files</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.totalFiles}</p>
        </div>
        <div style={{ padding: '1.5rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Chunks</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--viz-chunk)', lineHeight: 1 }}>{stats.totalChunks}</p>
        </div>
        <div style={{ padding: '1.5rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Upload Time</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.averageUploadTime}<span style={{fontSize: '1rem', fontWeight: 500, marginLeft: '0.2rem', color: 'var(--text-muted)'}}>ms</span></p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Bar Chart */}
        <div style={{ height: '240px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>Chunks Distribution (Bar)</p>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                <Bar dataKey="chunks" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={NODE_COLORS[index % NODE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data</div>
          )}
        </div>

        {/* Donut Chart */}
        <div style={{ height: '240px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>Storage Load (Donut)</p>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={barData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="chunks"
                  stroke="none"
                >
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={NODE_COLORS[index % NODE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data</div>
          )}
        </div>
      </div>

      {stats.lastUploadedFile && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Latest Upload:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{stats.lastUploadedFile.name} ({(new Date(stats.lastUploadedFile.timestamp)).toLocaleString()})</span>
        </div>
      )}
    </div>
  );
}
