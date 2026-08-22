// API Keys - Server-side vault with AES-256 encryption
// Provider list is configured FROM THE BACKEND (GET /api/keys/providers), so
// the UI always matches what the server supports. Hundreds of keys per
// provider are allowed — each row deletes independently.
import api from '../lib/api.js';
import { toast } from '../lib/toast.js';

export function APIKeys() {
  const container = document.createElement('div');
  const user = api.getUser();
  const isPremium = user?.tier === 'premium' || user?.isAdmin || api.isDev();
  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal"><span class="material-symbols-rounded" style="color:var(--md-sys-color-tertiary);">key</span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">API Vault</h1>
      </div>
      ${!isPremium ? '<div class="card-reveal" style="padding:1rem;border-radius:var(--md-sys-shape-medium);background:rgba(255,184,108,.08);border:1px solid rgba(255,184,108,.2);color:var(--color-analytical);margin-bottom:1rem;font:var(--md-sys-typescale-body-medium);"><span class="material-symbols-rounded" style="font-size:18px;vertical-align:middle;">lock</span> BYO API keys require Premium tier. <a href="#" onclick="showPage(\'credits\')" style="text-decoration:underline;">Upgrade now</a></div>' : ''}
      <div class="surface-card card-reveal" style="margin-bottom:1rem;">
        <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Add API Key</h3>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <select id="key-provider" class="input-m3" style="width:200px;">
            <option value="">Loading providers…</option>
          </select>
          <input type="password" id="key-value" class="input-m3" placeholder="Your API key" style="flex:1;min-width:200px;" ${!isPremium ? 'disabled' : ''}>
          <button class="btn-m3 btn-filled" id="add-key-btn" ${!isPremium ? 'disabled' : ''}>Add Key</button>
        </div>
        <p id="provider-hint" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0.75rem 0 0;"></p>
      </div>
      <div class="surface-card card-reveal" style="margin-bottom:1rem;padding:1rem;border-radius:var(--md-sys-shape-medium);background:rgba(var(--md-sys-color-primary-rgb),0.05);border:1px solid rgba(var(--md-sys-color-primary-rgb),0.12);">
        <div style="display:flex;gap:0.6rem;align-items:flex-start;">
          <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-primary);flex-shrink:0;">info</span>
          <p id="usage-disclaimer" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);margin:0;line-height:1.5;">
            Connectivity and response limits depend on the provider you choose and your current usage limits with that provider — they do not depend on how Mentally functions.
          </p>
        </div>
      </div>
      <div class="surface-card card-reveal" style="margin-bottom:1rem;">
        <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.25rem;">Key Router Status</h3>
        <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0 0 0.75rem;">Every connected provider and key. If a key fails, it cools down for 60s and the router automatically tries the next key — or the next provider with the same function.</p>
        <div id="key-router-status"><div class="anim-shimmer" style="height:60px;"></div></div>
      </div>
      <div id="keys-list" class="card-reveal"><div class="anim-shimmer" style="height:100px;"></div></div>
    </div>`;

  let registry = [];

  // Populate the provider dropdown from the backend registry
  api.get('/keys/providers').then((data) => {
    registry = data.providers || [];
    const select = container.querySelector('#key-provider');
    const hint = container.querySelector('#provider-hint');
    select.innerHTML = '<option value="">Select a provider…</option>' + registry.map((p) =>
      `<option value="${p.id}">${p.name}</option>`
    ).join('');
    select.addEventListener('change', () => {
      const def = registry.find((p) => p.id === select.value);
      if (def) {
        hint.textContent = def.requiresKey
          ? `${def.name}: ${def.note}. Keys stay AES-256 encrypted and never leave the server.`
          : `${def.name}: ${def.note} — no key required; connectivity depends on your local server being reachable.`;
      } else {
        hint.textContent = '';
      }
    });
  }).catch(() => {
    container.querySelector('#key-provider').innerHTML = '<option value="">Providers unavailable</option>';
  });

  // Key Router status — what's actually connected, per key
  api.get('/keys/status').then(data => {
    const el = container.querySelector('#key-router-status');
    const providers = data.providers || {};
    const entries = Object.entries(providers);
    if (entries.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No keys configured yet — shared pool keys serve requests automatically.</div>';
      return;
    }
    el.innerHTML = entries.map(([provider, info]) => `
      <div style="padding:0.65rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;">
          <span class="chip chip-success">${provider}</span>
          <span style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);">${info.count} key${info.count > 1 ? 's' : ''} connected</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">${(info.keys || []).map(k => `
          <span class="mono-label" style="font-size:9px;padding:0.2rem 0.5rem;border-radius:6px;background:${k.coolingDown ? 'rgba(239,68,68,0.12)' : 'rgba(204,255,0,0.08)'};color:${k.coolingDown ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface-variant)'};">${k.masked}${k.coolingDown ? ' · cooling' : ''}</span>`).join('')}
        </div>
      </div>`).join('');
  }).catch(() => {
    const el = container.querySelector('#key-router-status');
    if (el) el.innerHTML = '<div style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Router status unavailable.</div>';
  });

  api.get('/keys').then(data => {
    const el = container.querySelector('#keys-list');
    const keys = data.keys || {};
    const entries = Object.entries(keys);
    if (entries.length === 0) {
      el.innerHTML = '<div class="surface-card" style="text-align:center;padding:2rem;color:var(--md-sys-color-outline);">No API keys configured yet. Shared pool keys are used automatically.</div>';
      return;
    }
    el.innerHTML = '<div class="surface-card" style="padding:0;">' + entries.map(([provider, list]) => {
      const listArr = Array.isArray(list) ? list : [list];
      return listArr.map((info, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;border-bottom:1px solid var(--md-sys-color-outline-variant);">
        <div>
          <span class="chip chip-primary" style="margin-right:0.5rem;">${provider}</span>
          ${listArr.length > 1 ? `<span class="mono-label" style="font-size:9px;color:var(--md-sys-color-outline);margin-right:0.5rem;">#${i + 1}</span>` : ''}
          <span style="font:var(--md-sys-typescale-body-medium);font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;">${info.masked}</span>
        </div>
        <button class="icon-btn" onclick="deleteKey('${provider}','${info.id}')" title="Remove">
          <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-error);">delete</span>
        </button>
      </div>`).join('');
    }).join('') + '</div>';
  });

  container.querySelector('#add-key-btn')?.addEventListener('click', async () => {
    const provider = container.querySelector('#key-provider').value;
    const key = container.querySelector('#key-value').value.trim();
    if (!provider) { toast.show('Select a provider first', 'error'); return; }
    if (!key) return;
    const result = await api.post('/keys', { provider, key });
    if (result.error) { toast.show(result.error, 'error'); return; }
    container.querySelector('#key-value').value = '';
    window.showPage('api-keys');
  });

  return container;
}
window.deleteKey = async (provider, keyId) => {
  if (!confirm(`Remove this ${provider} key?`)) return;
  const path = keyId ? `/keys/${provider}/${keyId}` : `/keys/${provider}`;
  await api.del(path);
  window.showPage('api-keys');
};
