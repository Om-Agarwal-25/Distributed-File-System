/**
 * App.js — Root application component for the DFS Visual Dashboard.
 *
 * Layout (single-page, top to bottom):
 *  1. Header — project name, student name, animated gradient background
 *  2. NodeHealth — 3 cards in a row, auto-refreshing
 *  3. Two-column section:
 *     Left  — File Upload + (UploadVisualizer after upload) + FileList (clickable rows)
 *             FileDetail opens as modal on row click
 *     Right — ActivityLog (fixed 400px height, scrollable terminal)
 *  4. VerifyPanel — appears below two columns when Verify is triggered
 *  5. ChunkDistribution — full-width charts, data from shared stats state
 */

import React, { useState, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import NodeStatus from './components/NodeStatus';
import NodeHealth from './components/NodeHealth';
import ActivityLog from './components/ActivityLog';
import ChunkDistribution from './components/ChunkDistribution';
import UploadVisualizer from './components/UploadVisualizer';
import VerifyPanel from './components/VerifyPanel';
import FileDetail from './components/FileDetail';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'nodes'

  // Upload visualizer data
  const [visualData, setVisualData] = useState(null);

  // Verify panel data
  const [verifyData, setVerifyData] = useState(null);

  // FileDetail panel
  const [selectedFile, setSelectedFile] = useState(null);

  // Shared stats state (lifted from NodeHealth)
  const [statsData, setStatsData] = useState(null);
  const [statsRefreshing, setStatsRefreshing] = useState(false);

  const handleUploadSuccess = useCallback((newVisualData) => {
    setRefreshKey(k => k + 1);
    setVisualData(newVisualData || null);
    setVerifyData(null);
  }, []);

  const handleVerifyResult = useCallback((data) => {
    setVerifyData(data);
    setVisualData(null);
    setSelectedFile(null);
  }, []);

  const handleStatsReady = useCallback((data) => {
    setStatsData(data);
  }, []);

  return (
    <div className="app" style={{ background: '#0f172a', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2744 100%)',
        borderBottom: '1px solid #1e3a5f',
        padding: '1rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            fontSize: '1.75rem', background: '#1e40af22', borderRadius: '10px',
            padding: '6px 10px', border: '1px solid #1e40af44',
          }}>🗄️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>
              Distributed File Storage System
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
              B-Tree · Consistent Hashing · Merkle Trees · MERN Stack
            </p>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('dashboard')}
          >📊 Dashboard</button>
          <button
            className={`btn ${activeTab === 'nodes' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('nodes')}
          >🖥️ Nodes</button>
        </nav>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem' }}>

        {activeTab === 'dashboard' ? (
          <>
            {/* Row 1: Node Health Cards */}
            <NodeHealth onStatsReady={handleStatsReady} onRefreshState={setStatsRefreshing} />

            {/* Row 2: Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>

              {/* Left column: Upload + Visualizer + File List */}
              <div>
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <FileUpload onUploadSuccess={handleUploadSuccess} />
                  {visualData && (
                    <UploadVisualizer
                      visualData={visualData}
                      onComplete={() => {}}
                    />
                  )}
                </div>

                <FileList
                  key={refreshKey}
                  onDelete={() => setRefreshKey(k => k + 1)}
                  onVerifyResult={handleVerifyResult}
                  onSelectFile={setSelectedFile}
                />
              </div>

              {/* Right column: Activity Log */}
              <div style={{ position: 'sticky', top: '80px' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Activity
                </p>
                <ActivityLog />
              </div>
            </div>

            {/* Verify Panel */}
            {verifyData && (
              <div style={{ marginTop: '1.5rem' }}>
                <VerifyPanel verifyData={verifyData} onClose={() => setVerifyData(null)} />
              </div>
            )}

            {/* Row 3: Chunk Distribution Charts (full width) */}
            <ChunkDistribution statsData={statsData} refreshing={statsRefreshing} />
          </>
        ) : (
          <NodeStatus />
        )}
      </main>

      {/* ── File Detail Modal ────────────────────────────────────────────────── */}
      {selectedFile && (
        <FileDetail
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onVerify={(data) => {
            setVerifyData(data);
            setSelectedFile(null);
          }}
        />
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{
        textAlign: 'center', padding: '1.25rem',
        borderTop: '1px solid #1e293b',
        color: '#475569', fontSize: '0.75rem',
        marginTop: '2rem',
      }}>
        DFS System · MERN Stack · Docker · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
