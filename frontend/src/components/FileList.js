/**
 * FileList.js — Fetches and displays all stored files with download,
 * delete, and integrity-check actions.
 */

import React, { useEffect, useState } from 'react';
import { listFiles, downloadFile, deleteFile } from '../services/api';
import IntegrityBadge from './IntegrityBadge';

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString() : '—';

export default function FileList({ onDelete, onVerifyResult, onSelectFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchFiles = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listFiles(p, 10);
      setFiles(res.data.files);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(page); }, [page]);

  const handleDownload = async (file) => {
    try {
      const url = await downloadFile(file.fileId);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.originalName}"?`)) return;
    setDeletingId(file.fileId);
    try {
      await deleteFile(file.fileId);
      onDelete?.();
      fetchFiles(page);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeletingId(null);
    }
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

  return (
    <div className="card fade-in">
      <p className="section-title">📋 Stored Files</p>

      {error && (
        <div style={{ color: 'var(--danger)', padding: '1rem', textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ overflowX: 'auto', minHeight: '320px' }}>
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left', height: '40px' }}>
              <th style={{ padding: '0 0.5rem', width: '30%' }}>Name</th>
              <th style={{ padding: '0 0.5rem', width: '15%' }}>Size</th>
              <th style={{ padding: '0 0.5rem', width: '20%' }}>Uploaded</th>
              <th style={{ padding: '0 0.5rem', width: '15%' }}>Integrity</th>
              <th style={{ padding: '0 0.5rem', width: '20%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              /* Loading Skeletons */
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`} style={{ height: '52px', borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0 0.5rem' }}>
                    <Skeleton width="80%" height="14px" />
                    <div style={{ marginTop: '4px' }}><Skeleton width="60%" height="10px" /></div>
                  </td>
                  <td style={{ padding: '0 0.5rem' }}><Skeleton width="50%" height="14px" /></td>
                  <td style={{ padding: '0 0.5rem' }}><Skeleton width="70%" height="14px" /></td>
                  <td style={{ padding: '0 0.5rem' }}><Skeleton width="60%" height="20px" /></td>
                  <td style={{ padding: '0 0.5rem' }}><Skeleton width="70%" height="24px" /></td>
                </tr>
              ))
            ) : files.length === 0 ? (
              /* Empty State */
              <tr style={{ height: '52px' }}>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                  No files uploaded yet. Upload your first file above.
                </td>
              </tr>
            ) : (
              /* Files Data */
              files.map((file) => (
                <tr
                  key={file.fileId}
                  style={{
                    height: '52px',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.15s, opacity 0.3s, height 0.3s',
                    cursor: 'pointer',
                    opacity: deletingId === file.fileId ? 0.3 : 1,
                    overflow: 'hidden'
                  }}
                  onClick={() => onSelectFile?.(file)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0 0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.originalName}
                    </div>
                    <div className="hash" style={{ fontSize: '0.7rem' }}>{file.fileId.slice(0, 18)}…</div>
                  </td>
                  <td style={{ padding: '0 0.5rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatBytes(file.totalSize)}
                  </td>
                  <td style={{ padding: '0 0.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {formatDate(file.createdAt)}
                  </td>
                  <td style={{ padding: '0 0.5rem' }} onClick={e => e.stopPropagation()}>
                    <IntegrityBadge fileId={file.fileId} onVerifyResult={onVerifyResult} />
                  </td>
                  <td style={{ padding: '0 0.5rem' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ width: '32px', height: '28px', padding: 0, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleDownload(file)}
                        title="Download"
                      >
                        ⬇️
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ width: '32px', height: '28px', padding: 0, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleDelete(file)}
                        disabled={deletingId === file.fileId}
                        title="Delete"
                      >
                        {deletingId === file.fileId ? <span className="spinner" style={{ width: '12px', height: '12px' }} /> : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Container Fixed Height to avoid bounce */}
      <div style={{ height: '40px', marginTop: '1rem' }}>
      {pagination && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span style={{ lineHeight: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {page} / {pagination.pages}
          </span>
          <button
            className="btn btn-ghost"
            disabled={page === pagination.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
