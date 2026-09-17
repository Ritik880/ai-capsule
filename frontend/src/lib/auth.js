import axios from 'axios';
import { API_BASE } from './api';

export async function fetchMe() {
  const res = await axios.get(`${API_BASE}/auth/me`, { withCredentials: true });
  return res.data.user;
}

export async function logout() {
  await axios.post(`${API_BASE}/auth/logout`, {}, { withCredentials: true });
}
