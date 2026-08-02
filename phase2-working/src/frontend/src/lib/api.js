// Centralized API Client with JWT auth
const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('tg_token');
    this.refreshToken = localStorage.getItem('tg_refresh_token');
  }

  setToken(token, refreshToken) {
    this.token = token;
    this.refreshToken = refreshToken;
    if (token) localStorage.setItem('tg_token', token);
    else localStorage.removeItem('tg_token');
    if (refreshToken) localStorage.setItem('tg_refresh_token', refreshToken);
    else localStorage.removeItem('tg_refresh_token');
  }

  clearAuth() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('tg_token');
    localStorage.removeItem('tg_refresh_token');
    localStorage.removeItem('tg_user');
  }

  isLoggedIn() {
    return !!this.token;
  }

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('tg_user'));
    } catch { return null; }
  }

  setUser(user) {
    localStorage.setItem('tg_user', JSON.stringify(user));
  }

  async request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    try {
      const resp = await fetch(url, { ...options, headers });

      // Auto-refresh on 401
      if (resp.status === 401 && this.refreshToken) {
        const refreshed = await this._refresh();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.token}`;
          const retryResp = await fetch(url, { ...options, headers });
          return this._handleResponse(retryResp);
        }
      }

      return this._handleResponse(resp);
    } catch (err) {
      if (err.message === 'NETWORK_ERROR' || err.message.includes('Failed to fetch')) {
        return { error: 'Network error. Is the server running?', offline: true };
      }
      throw err;
    }
  }

  async _handleResponse(resp) {
    if (resp.status === 401) {
      this.clearAuth();
      window.dispatchEvent(new CustomEvent('tg-auth-required'));
      return { error: 'Authentication required' };
    }
    const data = await resp.json();
    if (!resp.ok) return { error: data.error || `HTTP ${resp.status}` };
    return data;
  }

  async _refresh() {
    try {
      const resp = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!resp.ok) { this.clearAuth(); return false; }
      const data = await resp.json();
      this.setToken(data.token, data.refreshToken);
      return true;
    } catch { return false; }
  }

  // Convenience methods
  get(path) { return this.request(path); }
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); }
  put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); }
  del(path) { return this.request(path, { method: 'DELETE' }); }
}

// Singleton
const api = new ApiClient();
export default api;
