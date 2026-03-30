/**
 * ActivityLog.js — Real-time terminal-style activity log via Server-Sent Events.
 * Connects to GET /api/logs/stream and displays log lines.
 */

import React, { useEffect, useRef, useState } from 'react';

const MAX_LINES = 100;

const EMOJI_MAP = {
  upload:   '📁',
  chunk:    '✂️',
  hash:     '🔐',
  merkle:   '🌿',
  node:     '🔵',
  download: '📥',
  verify:   '🔍',
  delete:   '🗑️',
  error:    '🚨',
  system:   '⚙️',
};

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour12: false });
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([
    { type: 'system', message: 'Connecting to activity stream…', timestamp: new Date().toISOString() }
  ]);
  const bottomRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const streamUrl = apiBase.replace('/api', '') + '/api/logs/stream';
    const es = new EventSource(streamUrl);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setLogs(prev => {
          const next = [...prev, payload];
          return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
        });
      } catch (e) {}
    };

    es.onerror = () => {
      setLogs(prev => [...prev, {
        type: 'error',
        message: 'Stream disconnected. Will retry…',
        timestamp: new Date().toISOString(),
      }].slice(-MAX_LINES));
    };

    return () => es.close();
  }, []);

  // Auto-scroll to bottom on new log
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleClear = () => setLogs([]);

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: '8px',
      height: '400px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderBottom: '1px solid #30363d',
        background: '#161b22'
      }}>
        <span style={{ color: '#8b949e', fontFamily: 'monospace', fontSize: '12px' }}>
          ● Activity Log — {logs.length} events
        </span>
        <button
          onClick={handleClear}
          style={{
            background: 'transparent', border: '1px solid #30363d', color: '#8b949e',
            fontSize: '11px', cursor: 'pointer', padding: '2px 8px', borderRadius: '4px',
          }}
        >
          Clear
        </button>
      </div>
      {/* Log Lines */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0', scrollBehavior: 'smooth' }}>
        {logs.map((log, i) => (
          <div
            key={i}
            style={{
              display: 'flex', gap: '8px', padding: '2px 12px',
              fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6',
              color: log.type === 'error' ? '#ff7b72' : '#3fb950',
              animation: 'slideFadeIn 0.3s ease-out forwards',
            }}
          >
            <span style={{ color: '#484f58', flexShrink: 0 }}>{formatTime(log.timestamp)}</span>
            <span style={{ flexShrink: 0 }}>{EMOJI_MAP[log.type] || '📋'}</span>
            <span style={{ wordBreak: 'break-all' }}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
