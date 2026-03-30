/**
 * api.js — Axios API client for the DFS backend.
 *
 * All API calls go through this module. The base URL is read from the
 * REACT_APP_API_URL environment variable (set in .env).
 */

import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 120000, // 2 min — allow time for large uploads
});

// ── File Operations ────────────────────────────────────────────────────────────

/**
 * Upload a file via multipart/form-data.
 * @param {File}     file     - Browser File object.
 * @param {string}   owner    - Optional owner identifier.
 * @param {Function} onProgress - Upload progress callback (0–100).
 */
export const uploadFile = (file, owner = 'anonymous', onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('owner', owner);

  return API.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });
};

/**
 * List all stored files.
 * @param {number} page  - Page number (default 1).
 * @param {number} limit - Items per page (default 20).
 */
export const listFiles = (page = 1, limit = 20) =>
  API.get('/files', { params: { page, limit } });

/**
 * Download a file by ID.
 * Returns a Blob URL that can be used to trigger a browser download.
 * @param {string} fileId
 * @returns {Promise<string>} Object URL.
 */
export const downloadFile = async (fileId) => {
  const response = await API.get(`/file/${fileId}`, { responseType: 'blob' });
  return window.URL.createObjectURL(new Blob([response.data]));
};

/**
 * Delete a file by ID.
 * @param {string} fileId
 */
export const deleteFile = (fileId) => API.delete(`/file/${fileId}`);

/**
 * Verify the integrity of a file by ID.
 * @param {string} fileId
 */
export const verifyFile = (fileId) => API.get(`/verify/${fileId}`);

/**
 * Get storage node statistics for the regular view.
 */
export const getNodes = () => API.get('/nodes');

/**
 * Get aggregated dashboard statistics (files, chunks, averages).
 */
export const getStats = () => API.get('/stats');

/**
 * Get full chunk metadata for the FileDetail panel.
 */
export const getFileDetail = (fileId) => API.get(`/file/${fileId}/detail`);

/**
 * Simulate corruption of a specific chunk (demo only).
 */
export const corruptChunk = (fileId, chunkIndex) => API.post(`/file/${fileId}/corrupt/${chunkIndex}`);

export default API;
