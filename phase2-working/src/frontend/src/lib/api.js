// Centralized API Client with JWT auth
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Local / local-network instances (localhost, 127.0.0.1, LAN IPs) keep every
// feature unlocked — the server's /api/health env flag is authoritative and
// overrides this after first fetch.
function detectLocalHost() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
}

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('mentally_token');
    this.refreshToken = localStorage.getItem('mentally_refresh_token');
    this.isDevInstance = detectLocalHost();
  }

  setIsDev(isDev) { this.isDevInstance = !!isDev; }
  isDev() { return this.isDevInstance; }

  setToken(token, refreshToken) {
    this.token = token;
    this.refreshToken = refreshToken;
    if (token) localStorage.setItem('mentally_token', token);
    else localStorage.removeItem('mentally_token');
    if (refreshToken) localStorage.setItem('mentally_refresh_token', refreshToken);
    else localStorage.removeItem('mentally_refresh_token');
  }

  clearAuth() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('mentally_token');
    localStorage.removeItem('mentally_refresh_token');
    localStorage.removeItem('mentally_user');
  }

  isLoggedIn() {
    return !!this.token;
  }

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('mentally_user'));
    } catch { return null; }
  }

  setUser(user) {
    localStorage.setItem('mentally_user', JSON.stringify(user));
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
      window.dispatchEvent(new CustomEvent('mentally-auth-required'));
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
  del(path, body) { return this.request(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }); }
}

// Singleton
const api = new ApiClient();
export default api;
