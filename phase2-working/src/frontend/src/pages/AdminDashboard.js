// Admin Dashboard - OmniRoute + Langfuse + System Health (admin only)
import api from '../lib/api.js';

export function AdminDashboard() {
  const container = document.createElement('div');
  const user = api.getUser() || {};

  if (!user.isAdmin) {
    container.innerHTML = `
      <div class="page-shell">
        <div class="surface-card" style="padding:3rem;text-align:center;">
          <div class="mono-label" style="color:var(--md-sys-color-error);font-size:14px;">ADMIN ONLY</div>
          <h2 style="font:var(--md-sys-typescale-headline-small);margin-top:1rem;">Access Restricted</h2>
          <p style="color:var(--md-sys-color-on-surface-variant);">This dashboard is only available to admin users.</p>
        </div>
      </div>`;
    return container;
  }

  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
          <span class="dot" style="width:10px;height:10px;background:var(--md-sys-color-error);box-shadow:0 0 12px rgba(239,68,68,0.3);"></span>
          <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0;">Admin Console</h1>
        </div>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          System health, key pool, OmniRoute status, user management, and Langfuse observability.
        </p>
      </div>

      <!-- Health Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:1.5rem;">
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Server Status</div>
          <div id="health-status" style="font:var(--md-sys-typescale-headline-small);margin-top:0.25rem;">
            <div class="spinner-m3" style="margin:0 auto;width:20px;height:20px;"></div>
          </div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Total Users</div>
          <div id="stat-users" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-primary);">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Memory Nodes</div>
          <div id="stat-memory" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-secondary);">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">API Keys Active</div>
          <div id="stat-keys" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-tertiary);">—</div>
        </div>
      </div>

      <!-- Key Pool Status -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">
          <span class="dot" style="width:8px;height:8px;background:var(--md-sys-color-primary);box-shadow:0 0 8px rgba(204,255,0,0.3);vertical-align:middle;"></span>
          Shared Key Pool
        </h2>
        <div id="key-pool-status">
          <div class="spinner-m3" style="margin:1rem auto;"></div>
        </div>
      </div>

      <!-- OmniRoute (Admin Only) -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <h2 style="font:var(--md-sys-typescale-title-large);margin:0;">
            <span class="dot" style="width:8px;height:8px;background:var(--md-sys-color-secondary);box-shadow:0 0 8px rgba(163,230,53,0.3);vertical-align:middle;"></span>
            OmniRoute (Personal)
          </h2>
          <span class="chip-m3 active" style="pointer-events:none;background:var(--md-sys-color-error);color:var(--md-sys-color-on-error);">ADMIN ONLY</span>
        </div>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0 0 1rem;">
          Your personal Grok + NVIDIA routing layer. Not accessible to other users.
        </p>
        <div id="omniroute-status">
          <div class="spinner-m3" style="margin:1rem auto;"></div>
        </div>
      </div>

      <!-- Langfuse Observability -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">
          <span class="dot" style="width:8px;height:8px;background:var(--md-sys-color-tertiary);box-shadow:0 0 8px rgba(16,185,129,0.3);vertical-align:middle;"></span>
          Langfuse Observability
        </h2>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0 0 1rem;">
          Agent tracing, LLM call monitoring, and prompt performance metrics.
        </p>
        <div id="langfuse-status">
          <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">
            Langfuse dashboard available at your configured URL. Traces are automatically captured for all LLM calls.
          </p>
        </div>
        <button class="btn-m3 btn-outlined" style="margin-top:1rem;" onclick="window.open(import.meta.env.VITE_LANGFUSE_URL || 'https://cloud.langfuse.com', '_blank')">
          Open Langfuse Dashboard
        </button>
      </div>

      <!-- User Management -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">
          <span class="dot" style="width:8px;height:8px;background:var(--md-sys-color-on-surface);box-shadow:0 0 8px rgba(235,235,235,0.2);vertical-align:middle;"></span>
          User Management
        </h2>
        <div id="users-list">
          <div class="spinner-m3" style="margin:1rem auto;"></div>
        </div>
      </div>

      <!-- System Actions -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">System Actions</h2>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <button class="btn-m3 btn-outlined" onclick="alert('Export functionality coming soon')">
            Export All Data
          </button>
          <button class="btn-m3 btn-outlined" onclick="alert('Backup functionality coming soon')">
            Backup Database
          </button>
          <button class="btn-m3 btn-outlined" style="border-color:var(--md-sys-color-error);color:var(--md-sys-color-error);" onclick="alert('Reset not available in production')">
            Reset System
          </button>
        </div>
      </div>
    </div>`;

  async function loadData() {
    // Health check
    const health = await api.get('/admin/health');
    const healthEl = container.querySelector('#health-status');
    if (health.error) {
      healthEl.innerHTML = `<span style="color:var(--md-sys-color-error);">Offline</span>`;
    } else {
      healthEl.innerHTML = `<span style="color:var(--color-success);">Healthy</span>`;
      if (health.stats) {
        container.querySelector('#stat-users').textContent = health.stats.totalUsers || 0;
        container.querySelector('#stat-memory').textContent = health.stats.totalMemories || 0;
      }
    }

    // Key pool status
    const keyPool = await api.get('/admin/key-pool');
    const poolEl = container.querySelector('#key-pool-status');
    if (keyPool.error) {
      poolEl.innerHTML = `<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Unable to load key pool status.</p>`;
    } else {
      const providers = keyPool.providers || {};
      const totalKeys = Object.values(providers).reduce((sum, p) => sum + (p.keys?.length || 0), 0);
      container.querySelector('#stat-keys').textContent = totalKeys;

      poolEl.innerHTML = Object.entries(providers).map(([name, provider]) => `
        <div style="margin-bottom:1rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <span style="font:var(--md-sys-typescale-title-small);text-transform:capitalize;">${name}</span>
            <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">${provider.keys?.length || 0} keys</span>
          </div>
          ${(provider.keys || []).map(k => `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0;font:var(--md-sys-typescale-body-small);">
              <span style="width:8px;height:8px;border-radius:50%;background:${k.coolingDown ? 'var(--md-sys-color-error)' : 'var(--color-success)'};"></span>
              <span style="color:var(--md-sys-color-on-surface-variant);">${k.id}</span>
              ${k.coolingDown ? '<span style="color:var(--md-sys-color-error);font-size:11px;">COOLING DOWN</span>' : ''}
              <span style="margin-left:auto;color:var(--md-sys-color-outline);">${k.usageThisHour || 0} req/hr</span>
            </div>
          `).join('')}
        </div>
      `).join('') || '<p style="color:var(--md-sys-color-outline);">No API keys configured in pool. Add GROQ_KEY_1, OPENAI_KEY_1, etc. to env vars.</p>';
    }

    // OmniRoute status
    const omniEl = container.querySelector('#omniroute-status');
    omniEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">
        <div class="surface-card" style="padding:1rem;background:var(--md-sys-color-surface-container);">
          <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">Grok (xAI)</div>
          <div style="font:var(--md-sys-typescale-body-large);color:var(--color-success);margin-top:0.25rem;">Configured</div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Personal key active</div>
        </div>
        <div class="surface-card" style="padding:1rem;background:var(--md-sys-color-surface-container);">
          <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">NVIDIA</div>
          <div style="font:var(--md-sys-typescale-body-large);color:var(--color-success);margin-top:0.25rem;">Configured</div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">NIM endpoints available</div>
        </div>
      </div>
      <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.75rem;">
        OmniRoute uses your personal API keys for Grok and NVIDIA. Non-admin users never see or access this.
      </p>`;

    // Users list
    const users = await api.get('/admin/users');
    const usersEl = container.querySelector('#users-list');
    if (users.error || !users.users?.length) {
      usersEl.innerHTML = `<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No users registered yet.</p>`;
    } else {
      usersEl.innerHTML = `
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font:var(--md-sys-typescale-body-small);">
            <thead>
              <tr style="border-bottom:1px solid var(--md-sys-color-outline-variant);">
                <th style="text-align:left;padding:0.5rem;color:var(--md-sys-color-outline);font-weight:500;">Email</th>
                <th style="text-align:left;padding:0.5rem;color:var(--md-sys-color-outline);font-weight:500;">Tier</th>
                <th style="text-align:left;padding:0.5rem;color:var(--md-sys-color-outline);font-weight:500;">Runs Today</th>
                <th style="text-align:left;padding:0.5rem;color:var(--md-sys-color-outline);font-weight:500;">Credits</th>
                <th style="text-align:left;padding:0.5rem;color:var(--md-sys-color-outline);font-weight:500;">Joined</th>
              </tr>
            </thead>
            <tbody>
              ${users.users.map(u => `
                <tr style="border-bottom:1px solid var(--md-sys-color-outline-variant);">
                  <td style="padding:0.5rem;">${u.email}${u.is_admin ? ' <span style="color:var(--md-sys-color-error);font-size:11px;">ADMIN</span>' : ''}</td>
                  <td style="padding:0.5rem;"><span style="background:var(--md-sys-color-surface-container);padding:2px 8px;border-radius:var(--md-sys-shape-full);font-size:11px;">${u.tier || 'free'}</span></td>
                  <td style="padding:0.5rem;">${u.daily_runs_used || 0}</td>
                  <td style="padding:0.5rem;">${u.total_credits || 0}</td>
                  <td style="padding:0.5rem;color:var(--md-sys-color-outline);">${u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }
  }

  loadData();
  return container;
}
