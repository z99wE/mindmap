// API Keys - Server-side vault with AES-256 encryption
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
          <select id="key-provider" class="input-m3" style="width:160px;">
            <option value="groq">Groq</option><option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option><option value="nvidia">NVIDIA NIM</option>
          </select>
          <input type="password" id="key-value" class="input-m3" placeholder="Your API key" style="flex:1;min-width:200px;" ${!isPremium ? 'disabled' : ''}>
          <button class="btn-m3 btn-filled" id="add-key-btn" ${!isPremium ? 'disabled' : ''}>Add Key</button>
        </div>
      </div>
      <div id="keys-list" class="card-reveal"><div class="anim-shimmer" style="height:100px;"></div></div>
    </div>`;

  api.get('/keys').then(data => {
    const el = container.querySelector('#keys-list');
    const keys = data.keys || {};
    const entries = Object.entries(keys);
    if (entries.length === 0) {
      el.innerHTML = '<div class="surface-card" style="text-align:center;padding:2rem;color:var(--md-sys-color-outline);">No API keys configured. Free tier uses shared pool keys.</div>';
      return;
    }
    el.innerHTML = `<div class="surface-card" style="padding:0;">` + entries.map(([provider, info]) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;border-bottom:1px solid var(--md-sys-color-outline-variant);">
        <div>
          <span class="chip chip-primary" style="margin-right:0.5rem;">${provider}</span>
          <span style="font:var(--md-sys-typescale-body-medium);font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;">${info.masked}</span>
        </div>
        <button class="icon-btn" onclick="deleteKey('${provider}')" title="Remove">
          <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-error);">delete</span>
        </button>
      </div>`).join('') + '</div>';
  });

  container.querySelector('#add-key-btn')?.addEventListener('click', async () => {
    const provider = container.querySelector('#key-provider').value;
    const key = container.querySelector('#key-value').value.trim();
    if (!key) return;
    const result = await api.post('/keys', { provider, key });
    if (result.error) { toast.show(result.error, 'error'); return; }
    container.querySelector('#key-value').value = '';
    window.showPage('api-keys');
  });

  return container;
}
window.deleteKey = async (provider) => { if (confirm(`Remove ${provider} key?`)) { await api.del(`/keys/${provider}`); window.showPage('api-keys'); } };
