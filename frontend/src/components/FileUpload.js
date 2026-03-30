/**
 * FileUpload.js — Drag-and-drop file upload component.
 *
 * Features:
 *  - Drag-and-drop zone (via react-dropzone)
 *  - Upload progress bar
 *  - Displays summary of the upload result (fileId, Merkle root, chunk count)
 *  - Graceful error display
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../services/api';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default function FileUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (!acceptedFiles.length) return;
      const file = acceptedFiles[0];

      setUploading(true);
      setProgress(0);
      setResult(null);
      setError(null);

      try {
        const response = await uploadFile(file, 'anonymous', setProgress);
        setResult(response.data);
        onUploadSuccess?.(response.data.visualData);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Upload failed');
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    multiple: false,
  });

  return (
    <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
      <p className="section-title">⬆️ Upload File</p>

      {/* Drop zone (Fixed size) */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: isDragActive ? 'var(--accent-light)' : 'transparent',
          transition: 'all 0.2s ease',
          opacity: uploading ? 0.6 : 1,
          height: '160px', /* Fixed height */
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
          {uploading ? <div className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}/> : (isDragActive ? '📥' : '📂')}
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
          {uploading ? 'Uploading...' : (isDragActive ? 'Drop it here…' : 'Drag & drop a file, or click to select')}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Max 500 MB · Any file type
        </p>
      </div>

      {/* Fixed height status area to prevent layout shift */}
      <div style={{ position: 'relative', height: '110px', marginTop: '1rem', overflow: 'hidden' }}>
        
        {/* Progress bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          opacity: uploading ? 1 : 0, pointerEvents: uploading ? 'auto' : 'none',
          transition: 'opacity 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Uploading & distributing chunks…
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-hover)', fontWeight: 600 }}>
              {progress}%
            </span>
          </div>
          <div style={{ background: 'var(--border)', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent), #8b5cf6)',
                borderRadius: '9999px',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>

        {/* Error */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            opacity: error ? 1 : 0, pointerEvents: error ? 'auto' : 'none',
            padding: '0.75rem 1rem', background: 'var(--danger-light)',
            border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)',
            color: 'var(--danger)', fontSize: '0.875rem',
            transition: 'opacity 0.3s ease'
          }}
        >
          ❌ {error}
        </div>

        {/* Success result */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            opacity: (result && !uploading) ? 1 : 0, pointerEvents: (result && !uploading) ? 'auto' : 'none',
            padding: '1rem', background: 'var(--success-light)',
            border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)',
            transition: 'opacity 0.3s ease'
          }}
        >
          <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '0.5rem', marginTop: 0 }}>
            ✅ Upload complete
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', fontSize: '0.8rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>File ID</span>
              <span className="hash" style={{ display: 'block', margin: 0 }}>{result?.fileId?.slice(0, 12)}…</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Size</span>
              <span style={{ color: 'var(--text-secondary)', display: 'block' }}>{formatBytes(result?.totalSize || 0)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
