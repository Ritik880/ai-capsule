import axios from 'axios';

// In dev, Vite serves the frontend on :5173 and the API is on :3001.
// In production the backend serves this built frontend itself (same origin),
// so requests can just be relative — no CORS needed.
export const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

export default api;
