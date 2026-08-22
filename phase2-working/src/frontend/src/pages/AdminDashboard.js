// Admin Dashboard - OmniRoute + Langfuse + System Health (admin only)
import api from '../lib/api.js';
import { toast } from '../lib/toast.js';

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
          <span class="dot" style="width:10px;height:10px;background:#ccff00;box-shadow:0 0 12px rgba(204,255,0,0.5);"></span>
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
            <div class="tg-skeleton tg-skeleton--title"></div><div class="tg-skeleton"></div>
          </div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Total Users</div>
          <div id="stat-users" style="font:var(--md-sys-typescale-headline-large);color:#ccff00;">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Memory Nodes</div>
          <div id="stat-memory" style="font:var(--md-sys-typescale-headline-large);color:#a3e635;">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">API Keys Active</div>
          <div id="stat-keys" style="font:var(--md-sys-typescale-headline-large);color:#10b981;">—</div>
        </div>
      </div>

      <!-- Key Pool Status -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">
          <span class="dot" style="width:8px;height:8px;background:var(--md-sys-color-primary);box-shadow:0 0 8px rgba(204,255,0,0.3);vertical-align:middle;"></span>
          Shared Key Pool
        </h2>
        <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);margin:0 0 1rem;">Keys added here are used automatically for all users. Users never see these keys — they just get AI responses.</p>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1rem;">
          <select id="pool-provider" class="input-m3" style="width:180px;">
            <option value="groq">Groq</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="nvidia">NVIDIA</option>
            <option value="gemini">Gemini</option>
            <option value="compatible">OpenAI-Compatible</option>
          </select>
          <input type="password" id="pool-key" class="input-m3" placeholder="API key" style="flex:1;min-width:200px;">
          <input type="text" id="pool-endpoint" class="input-m3" placeholder="Custom endpoint (optional)" style="width:250px;display:none;">
          <button class="btn-m3 btn-filled" id="add-pool-key-btn">Add to Pool</button>
        </div>
        <div id="key-pool-status">
          <div class="tg-skeleton tg-skeleton--title"></div><div class="tg-skeleton"></div>
        </div>
      </div>

      <!-- OmniRoute (Admin Only) -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <h2 style="font:var(--md-sys-typescale-title-large);margin:0;">
            <span class="dot" style="width:8px;height:8px;background:var(--md-sys-color-secondary);box-shadow:0 0 8px rgba(163,230,53,0.3);vertical-align:middle;"></span>
            OmniRoute (Personal)
          </h2>
          <span class="chip-m3 active" style="pointer-events:none;background:rgba(204,255,0,0.12);color:#d4ff33;border:1px solid rgba(204,255,0,0.3);">ADMIN ONLY</span>
        </div>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0 0 1rem;">
          Your personal Grok + NVIDIA routing layer. Not accessible to other users.
        </p>
        <div id="omniroute-status">
          <div class="tg-skeleton tg-skeleton--title"></div><div class="tg-skeleton"></div>
        </div>
      </div>

      <!-- User Management -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">
          <span class="dot" style="width:8px;height:8px;background:var(--md-sys-color-on-surface);box-shadow:0 0 8px rgba(235,235,235,0.2);vertical-align:middle;"></span>
          User Management
        </h2>
        <div id="users-list">
          <div class="tg-skeleton tg-skeleton--title"></div><div class="tg-skeleton"></div>
        </div>
      </div>

      <!-- System Actions -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">System Actions</h2>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <button class="btn-m3 btn-outlined" id="btn-export">
            Export All Data
          </button>
          <button class="btn-m3 btn-outlined" id="btn-backup">
            Backup Database
          </button>
          <button class="btn-m3 btn-outlined" style="border-color:rgba(255,255,255,0.16);color:var(--md-sys-color-on-surface-variant);" onclick="window.dispatchEvent(new CustomEvent('tg-toast', { detail: { message: 'System reset is disabled.', type: 'error' } }))">
            Reset System
          </button>
        </div>
      </div>

      <!-- Pattern Analytics (Cross-User Insights) -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;display:flex;align-items:center;gap:0.5rem;">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-secondary);">insights</span>
          Cross-User Pattern Analytics
        </h2>
        <div id="analytics-content">
          <div class="anim-shimmer" style="height:120px;"></div>
        </div>
      </div>

      <!-- Channel Management (Admin) -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">
          <span class="dot" style="width:8px;height:8px;background:#84cc16;box-shadow:0 0 8px rgba(132,204,22,0.3);vertical-align:middle;"></span>
          Channel Management
        </h2>
        <div id="channel-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:1.5rem;">
          <div class="surface-card" style="padding:0.75rem;text-align:center;">
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">Total Channels</div>
            <div id="ch-total" style="font:var(--md-sys-typescale-title-large);color:#ccff00;">—</div>
          </div>
          <div class="surface-card" style="padding:0.75rem;text-align:center;">
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">Active</div>
            <div id="ch-active" style="font:var(--md-sys-typescale-title-large);color:#a3e635;">—</div>
          </div>
          <div class="surface-card" style="padding:0.75rem;text-align:center;">
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">PulseKit Global</div>
            <div id="ch-global" style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">—</div>
          </div>
        </div>

        <div id="channel-breakdown"></div>

        <div id="all-channels-list" style="margin-top:1rem;">
          <div class="tg-skeleton tg-skeleton--title"></div>
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
      if (health.users != null) container.querySelector('#stat-users').textContent = health.users;
      if (health.memories != null) container.querySelector('#stat-memory').textContent = health.memories;
    }

    // Key pool status
    const keyPool = await api.get('/admin/key-pool');
    const poolEl = container.querySelector('#key-pool-status');
    if (keyPool.error) {
      poolEl.innerHTML = `<div class="tg-state tg-state--error"><div class="tg-state-title">Key pool status unavailable</div><div class="tg-state-body">The pool did not respond. Nothing has changed on the keys themselves.</div><button class="tg-state-action" onclick="showPage(&#39;admin&#39;)">Try again</button></div>`;
    } else {
      const totalKeys = keyPool.totalKeys || 0;
      const byProvider = keyPool.byProvider || {};
      const cooling = keyPool.coolingDown || [];
      const usage = keyPool.usage || [];
      container.querySelector('#stat-keys').textContent = totalKeys;

      poolEl.innerHTML = Object.entries(byProvider).map(([name, count]) => {
        const rows = usage.filter(u => u.id.startsWith(name)).map(k => `
          <div style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0;font:var(--md-sys-typescale-body-small);">
            <span style="width:8px;height:8px;border-radius:50%;background:${cooling.some(c => c.id === k.id) ? 'var(--md-sys-color-error)' : 'var(--color-success)'};flex-shrink:0;"></span>
            <span style="color:var(--md-sys-color-on-surface-variant);">${k.id}</span>
            ${cooling.some(c => c.id === k.id) ? '<span style="color:var(--md-sys-color-error);font-size:11px;">COOLING DOWN</span>' : ''}
            <span style="margin-left:auto;color:var(--md-sys-color-outline);">${k.count || 0} req/hr</span>
          </div>
        `).join('');
        return `
          <div style="margin-bottom:1rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
              <span style="font:var(--md-sys-typescale-title-small);text-transform:capitalize;">${name}</span>
              <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">${count} key${count > 1 ? 's' : ''}</span>
            </div>
            ${rows || '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Ready — no usage this hour.</p>'}
          </div>`;
      }).join('') || '<p style="color:var(--md-sys-color-outline);">No API keys configured in pool. Add keys above or set env vars.</p>';

      // Load database-backed keys
      try {
        const dbKeys = await api.get('/admin/key-pool/list');
        if (dbKeys.keys && dbKeys.keys.length > 0) {
          poolEl.innerHTML += '<div style="margin-top:1rem;border-top:1px solid var(--md-sys-color-outline-variant);padding-top:1rem;"><h4 style="font:var(--md-sys-typescale-title-small);margin:0 0 0.5rem;">Database Keys</h4>' +
            dbKeys.keys.map(k => `
              <div style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0;font:var(--md-sys-typescale-body-small);">
                <span style="width:8px;height:8px;border-radius:50%;background:${k.is_active ? 'var(--color-success)' : 'var(--md-sys-color-error)'};flex-shrink:0;"></span>
                <span class="chip chip-primary" style="font-size:10px;">${k.provider}</span>
                <span style="color:var(--md-sys-color-on-surface-variant);">${k.masked_key}</span>
                <button class="icon-btn" onclick="window.removePoolKey('${k.id}')" title="Remove" style="margin-left:auto;">
                  <span class="material-symbols-rounded" style="font-size:16px;color:var(--md-sys-color-error);">delete</span>
                </button>
              </div>
            `).join('') + '</div>';
        }
      } catch {}
    }

    // Pool key add/remove handlers
    const poolProvider = container.querySelector('#pool-provider');
    const poolEndpoint = container.querySelector('#pool-endpoint');
    if (poolProvider && poolEndpoint) {
      poolProvider.addEventListener('change', () => {
        poolEndpoint.style.display = poolProvider.value === 'compatible' ? 'block' : 'none';
      });
    }
    container.querySelector('#add-pool-key-btn')?.addEventListener('click', async () => {
      const provider = container.querySelector('#pool-provider').value;
      const key = container.querySelector('#pool-key').value.trim();
      const endpoint = container.querySelector('#pool-endpoint').value.trim() || undefined;
      if (!key) { alert('Enter a key'); return; }
      const result = await api.post('/admin/key-pool', { provider, key, endpoint });
      if (result.error) { alert(result.error); return; }
      container.querySelector('#pool-key').value = '';
      showPage('admin');
    });

    // Export button listener
    const btnExport = container.querySelector('#btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', async () => {
        btnExport.textContent = 'Exporting...';
        const data = await api.get('/memory/export');
        if (data && !data.error) {
          const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'export.json';
          a.click();
        } else {
          toast.show(data?.error || 'Export failed', 'error');
        }
        btnExport.textContent = 'Export All Data';
      });
    }

    // Backup button listener
    const btnBackup = container.querySelector('#btn-backup');
    if (btnBackup) {
      btnBackup.addEventListener('click', async () => {
        btnBackup.textContent = 'Backing up...';
        const data = await api.get('/admin/backup');
        if (data && !data.error) {
          const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'system_backup.json';
          a.click();
        } else {
          toast.show(data?.error || 'Backup failed', 'error');
        }
        btnBackup.textContent = 'Backup Database';
      });
    }

    // OmniRoute status
    const omniEl = container.querySelector('#omniroute-status');
    const hasXai = keyPool && keyPool.byProvider && (keyPool.byProvider['xai'] || 0) > 0;
    const hasNvidia = keyPool && keyPool.byProvider && (keyPool.byProvider['nvidia'] || 0) > 0;
    
    omniEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">
        <div class="surface-card" style="padding:1rem;background:var(--md-sys-color-surface-container);">
          <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">Grok (xAI)</div>
          <div style="font:var(--md-sys-typescale-body-large);color:${hasXai ? 'var(--color-success)' : 'var(--md-sys-color-error)'};margin-top:0.25rem;">${hasXai ? 'Configured' : 'Missing'}</div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${hasXai ? 'Personal key active' : 'Add XAI_API_KEY'}</div>
        </div>
        <div class="surface-card" style="padding:1rem;background:var(--md-sys-color-surface-container);">
          <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">NVIDIA</div>
          <div style="font:var(--md-sys-typescale-body-large);color:${hasNvidia ? 'var(--color-success)' : 'var(--md-sys-color-error)'};margin-top:0.25rem;">${hasNvidia ? 'Configured' : 'Missing'}</div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${hasNvidia ? 'NIM endpoints available' : 'Add NVIDIA_API_KEY'}</div>
        </div>
      </div>
      <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.75rem;">
        OmniRoute uses your personal API keys for Grok and NVIDIA. Non-admin users never see or access this.
      </p>`;

    // Users list
    const users = await api.get('/admin/users');
    const usersEl = container.querySelector('#users-list');
    if (users.error || !users.users?.length) {
      usersEl.innerHTML = `<div class="tg-state"><div class="tg-state-title">No users registered yet</div><div class="tg-state-body">New accounts appear here as soon as they sign up.</div></div>`;
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
                  <td style="padding:0.5rem;">${u.email || u.id?.slice(0, 8) || '—'}${u.is_admin ? ' <span style="color:#ccff00;font-size:11px;font-weight:600;">ADMIN</span>' : ''}</td>
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

	    // Channel management stats
	    const chStats = await api.get('/admin/channels/stats');
	    if (!chStats.error) {
	      container.querySelector('#ch-total').textContent = chStats.total || 0;
	      container.querySelector('#ch-active').textContent = chStats.active || 0;
	      const globalChs = (chStats.globalChannels || []).join(', ') || 'none';
	      container.querySelector('#ch-global').textContent = globalChs + (chStats.pulseKitLive ? ' 🟢' : ' ⚪');

	      // Platform breakdown
	      const breakdownEl = container.querySelector('#channel-breakdown');
	      if (chStats.byPlatform?.length) {
	        breakdownEl.innerHTML = `
	          <div style="font:var(--md-sys-typescale-title-small);margin-bottom:0.5rem;color:var(--md-sys-color-outline);">By Platform</div>
	          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
	            ${chStats.byPlatform.map(p => `
	              <span class="chip-m3" style="background:rgba(132,204,22,0.1);border:1px solid rgba(132,204,22,0.2);color:#ccff00;padding:0.25rem 0.75rem;border-radius:var(--md-sys-shape-full);font:var(--md-sys-typescale-label-small);">
	                ${p.platform} <strong>${p.count}</strong>
	              </span>
	            `).join('')}
	          </div>`;
	      } else {
	        breakdownEl.innerHTML = '<div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">No user channels configured yet.</div>';
	      }
	    }

	    // All channels list
	    const allCh = await api.get('/admin/channels');
	    const allChEl = container.querySelector('#all-channels-list');
	    if (allCh.error || !allCh.channels?.length) {
	      allChEl.innerHTML = '<div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);padding:0.5rem 0;">No channels have been connected by any user.</div>';
	    } else {
	      allChEl.innerHTML = `
	        <div style="font:var(--md-sys-typescale-title-small);margin-bottom:0.5rem;color:var(--md-sys-color-outline);">All User Channels</div>
	        <div style="overflow-x:auto;">
	          <table style="width:100%;border-collapse:collapse;font:var(--md-sys-typescale-body-small);">
	            <thead>
	              <tr style="border-bottom:1px solid var(--md-sys-color-outline-variant);">
	                <th style="text-align:left;padding:0.4rem;color:var(--md-sys-color-outline);font-weight:500;">Platform</th>
	                <th style="text-align:left;padding:0.4rem;color:var(--md-sys-color-outline);font-weight:500;">User</th>
	                <th style="text-align:left;padding:0.4rem;color:var(--md-sys-color-outline);font-weight:500;">Display</th>
	                <th style="text-align:left;padding:0.4rem;color:var(--md-sys-color-outline);font-weight:500;">Status</th>
	                <th style="text-align:left;padding:0.4rem;color:var(--md-sys-color-outline);font-weight:500;">Actions</th>
	              </tr>
	            </thead>
	            <tbody>
	              ${allCh.channels.map(ch => `
	                <tr style="border-bottom:1px solid var(--md-sys-color-outline-variant);">
	                  <td style="padding:0.4rem;"><span class="chip-m3" style="background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:var(--md-sys-shape-full);font-size:11px;text-transform:capitalize;">${ch.platform}</span></td>
	                  <td style="padding:0.4rem;color:var(--md-sys-color-on-surface-variant);max-width:120px;overflow:hidden;text-overflow:ellipsis;" title="${ch.user_email || ch.user_id}">${ch.user_email || ch.user_id?.slice(0, 12) || '—'}</td>
	                  <td style="padding:0.4rem;">${ch.display_name || '—'}</td>
	                  <td style="padding:0.4rem;">
	                    <span style="display:inline-flex;align-items:center;gap:4px;color:${ch.is_active ? 'var(--color-success)' : 'var(--md-sys-color-outline)'}">
	                      <span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;"></span>
	                      ${ch.is_active ? 'Active' : 'Inactive'}
	                    </span>
	                  </td>
	                  <td style="padding:0.4rem;">
	                    <button class="btn-m3 btn-tonal" style="padding:0.15rem 0.5rem;font-size:11px;" onclick="adminTestChannel('${ch.id}')">Test</button>
	                  </td>
	                </tr>
	              `).join('')}
	            </tbody>
	          </table>
	        </div>`;
	    }
	  }

	  loadData();

	  // Add global function for admin test delivery
	  window.adminTestChannel = async (id) => {
	    toast.show('Testing channel delivery...', 'info');
	    const res = await api.post(`/admin/channels/${id}/deliver`);
	    if (res.error) toast.show(res.error, 'error');
	    else if (res.success) toast.show(`Delivered via ${res.channel} (${res.via})`, 'success');
	    else toast.show(`Delivery: ${res.errors?.join(', ') || 'unknown'}`, 'error');
	  };

	  // Remove a shared pool key
	  window.removePoolKey = async (keyId) => {
	    if (!confirm('Remove this key from the shared pool? Users will no longer benefit from it.')) return;
	    const res = await api.del(`/admin/key-pool/${keyId}`);
	    if (res.error) toast.show(res.error, 'error');
	    else { toast.show('Key removed from pool', 'success'); showPage('admin'); }
	  };

	  return container;
}
