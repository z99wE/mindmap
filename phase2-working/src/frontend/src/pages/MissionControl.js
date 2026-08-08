// Mission Control - Tabbed central hub for all configuration
import api from '../lib/api.js';
import { toast } from '../lib/toast.js';

export function MissionControl() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">CONFIGURATION</div>
        <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0 0 0.25rem;">Mission Control</h1>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          Central hub for channels, API keys, notifications, privacy, and geo-fences.
        </p>
      </div>

      <!-- Tab Bar -->
      <div class="tab-bar card-reveal" style="margin-top:1.5rem;" id="mc-tabs">
        <button class="tab active" data-tab="channels">Channels</button>
        <button class="tab" data-tab="keys">API Keys</button>
        <button class="tab" data-tab="notifications">Notifications</button>
        <button class="tab" data-tab="privacy">Privacy</button>
        <button class="tab" data-tab="geofences">Geo-fences</button>
      </div>

      <!-- Tab Panels -->
      <div id="tab-channels" class="tab-panel">
        ${channelsPanel()}
      </div>
      <div id="tab-keys" class="tab-panel" style="display:none;">
        ${keysPanel()}
      </div>
      <div id="tab-notifications" class="tab-panel" style="display:none;">
        ${notificationsPanel()}
      </div>
      <div id="tab-privacy" class="tab-panel" style="display:none;">
        ${privacyPanel()}
      </div>
      <div id="tab-geofences" class="tab-panel" style="display:none;">
        ${geofencesPanel()}
      </div>

      <!-- Add Channel Dialog -->
      <div id="add-channel-dialog" role="dialog" aria-modal="true" aria-labelledby="add-channel-title" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);align-items:center;justify-content:center;">
        <div class="glass-strong" style="width:100%;max-width:440px;border-radius:var(--md-sys-shape-extra-large);padding:2rem;">
          <h2 id="add-channel-title" style="font:var(--md-sys-typescale-title-large);margin-bottom:1rem;">Connect Channel</h2>
          <div style="display:flex;flex-direction:column;gap:1rem;">
            <div>
              <label for="channel-platform" class="mono-label" style="display:block;margin-bottom:0.35rem;">PLATFORM</label>
              <select id="channel-platform" class="input-m3">
                <option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option>
                <option value="slack">Slack</option><option value="discord">Discord</option>
                <option value="email">Email</option><option value="sms">SMS</option>
              </select>
            </div>
            <div id="channel-token-container">
              <div>
                <label for="channel-token" class="mono-label" style="display:block;margin-bottom:0.35rem;">TOKEN / API KEY</label>
                <input type="password" id="channel-token" class="input-m3" placeholder="Your bot token or API key">
              </div>
              <div style="margin-top:1rem;">
                <label for="channel-id" class="mono-label" style="display:block;margin-bottom:0.35rem;">CHANNEL / CHAT ID (Optional)</label>
                <input type="text" id="channel-id" class="input-m3" placeholder="Channel or chat identifier">
              </div>
            </div>
            <div id="channel-oauth-container" style="display:none;padding:1rem;background:rgba(var(--md-sys-color-primary-rgb),0.1);border-radius:8px;">
              <p style="font:var(--md-sys-typescale-body-medium);margin:0;color:var(--md-sys-color-primary);">This platform requires OAuth authentication. Click Connect to be redirected to the provider.</p>
            </div>
            <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:0.5rem;">
              <button class="btn-m3 btn-text" onclick="document.getElementById('add-channel-dialog').style.display='none';" aria-label="Cancel connecting channel">Cancel</button>
              <button class="btn-m3 btn-filled" id="save-channel-btn" aria-label="Connect channel">Connect</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Key Dialog -->
      <div id="add-key-dialog" role="dialog" aria-modal="true" aria-labelledby="add-key-title" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);align-items:center;justify-content:center;">
        <div class="glass-strong" style="width:100%;max-width:440px;border-radius:var(--md-sys-shape-extra-large);padding:2rem;">
          <h2 id="add-key-title" style="font:var(--md-sys-typescale-title-large);margin-bottom:1rem;">Add API Key</h2>
          <div style="display:flex;flex-direction:column;gap:1rem;">
            <div>
              <label for="key-provider" class="mono-label" style="display:block;margin-bottom:0.35rem;">PROVIDER</label>
              <select id="key-provider" class="input-m3">
                <option value="groq">Loading providers…</option>
              </select>
            </div>
            <div>
              <label for="key-value" class="mono-label" style="display:block;margin-bottom:0.35rem;">API KEY</label>
              <input type="password" id="key-value" class="input-m3" placeholder="Paste your API key">
            </div>
            <p id="key-provider-hint" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0;"></p>
            <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:0.5rem;">
              <button class="btn-m3 btn-text" onclick="document.getElementById('add-key-dialog').style.display='none';" aria-label="Cancel adding key">Cancel</button>
              <button class="btn-m3 btn-filled" id="save-key-btn" aria-label="Save API key">Save Key</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Geofence Dialog -->
      <div id="add-geofence-dialog" role="dialog" aria-modal="true" aria-labelledby="add-geofence-title" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);align-items:center;justify-content:center;">
        <div class="glass-strong" style="width:100%;max-width:440px;border-radius:var(--md-sys-shape-extra-large);padding:2rem;">
          <h2 id="add-geofence-title" style="font:var(--md-sys-typescale-title-large);margin-bottom:1rem;">Add Geo-fence</h2>
          <form id="geofence-form" style="display:flex;flex-direction:column;gap:1rem;">
            <div>
              <label for="gf-name" class="mono-label" style="display:block;margin-bottom:0.35rem;">NAME</label>
              <input type="text" id="gf-name" class="input-m3" placeholder="e.g., Office, Home, Gym" required>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div>
                <label for="gf-lat" class="mono-label" style="display:block;margin-bottom:0.35rem;">LATITUDE</label>
                <input type="number" step="any" id="gf-lat" class="input-m3" placeholder="40.7128" required>
              </div>
              <div>
                <label for="gf-lng" class="mono-label" style="display:block;margin-bottom:0.35rem;">LONGITUDE</label>
                <input type="number" step="any" id="gf-lng" class="input-m3" placeholder="-74.0060" required>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div>
                <label for="gf-radius" class="mono-label" style="display:block;margin-bottom:0.35rem;">RADIUS (METERS)</label>
                <input type="number" id="gf-radius" class="input-m3" placeholder="200" value="200" required>
              </div>
              <div>
                <label for="gf-trigger" class="mono-label" style="display:block;margin-bottom:0.35rem;">TRIGGER</label>
                <select id="gf-trigger" class="input-m3">
                  <option value="arrival">On Arrival</option>
                  <option value="departure">On Departure</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div>
              <label for="gf-tasks" class="mono-label" style="display:block;margin-bottom:0.35rem;">LINKED TASKS (OPTIONAL)</label>
              <input type="text" id="gf-tasks" class="input-m3" placeholder="e.g., Buy milk, Pick up package">
            </div>
            <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:0.5rem;">
              <button type="button" class="btn-m3 btn-text" onclick="document.getElementById('add-geofence-dialog').style.display='none';" aria-label="Cancel adding geo-fence">Cancel</button>
              <button type="submit" class="btn-m3 btn-filled" aria-label="Save geo-fence">Save Geo-fence</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;

  // Tab switching
  container.querySelectorAll('#mc-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('#mc-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      container.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
      const panel = container.querySelector(`#tab-${tab.dataset.tab}`);
      if (panel) panel.style.display = 'block';
    });
  });

  // Load all data
  loadChannels(container);
  loadKeys(container);
  loadKeyRouterStatus(container);
  loadNotifPrefs(container);
  loadPrivacy(container);
  loadGeofences(container);
  setupSaveHandlers(container);

  return container;
}

// ── Panel HTML Templates ──────────────────────────────────────────────────

function channelsPanel() {
  return `
    <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Connected Channels</h2>
        <button class="btn-m3 btn-tonal" onclick="document.getElementById('add-channel-dialog').style.display='flex';">
          <span style="font:700 14px/1 'Space Grotesk';">+</span> Connect
        </button>
      </div>
      <div id="channels-list"><div class="anim-shimmer" style="height:80px;"></div></div>
      <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0.9rem 0 0;line-height:1.5;display:flex;gap:0.5rem;align-items:flex-start;">
        <span class="material-symbols-rounded" aria-hidden="true" style="font-size:16px;color:var(--md-sys-color-primary);flex-shrink:0;">info</span>
        <span>Connectivity and delivery depend on the channel provider you connect and your current usage limits with that provider — they do not depend on how Thought GPS functions.</span>
      </p>
    </div>
    <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;">
      <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">Delivery Routes</h2>
      <div id="delivery-routes"></div>
      <button class="btn-m3 btn-outlined" style="margin-top:1rem;width:100%;" id="test-all-channels">
        <span class="mono-label" style="font-size:9px;color:var(--md-sys-color-primary);">TEST</span> Test All Channels
      </button>
      <div id="test-results" style="margin-top:1rem;display:none;"></div>
    </div>`;
}

function keysPanel() {
  return `
    <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <div>
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">API Key Vault</h2>
          <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0.25rem 0 0;">Keys are AES-256 encrypted. Never exposed to the frontend.</p>
        </div>
        <button class="btn-m3 btn-tonal" onclick="document.getElementById('add-key-dialog').style.display='flex';">
          <span style="font:700 14px/1 'Space Grotesk';">+</span> Add Key
        </button>
      </div>
      <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0 0 0.9rem;line-height:1.5;display:flex;gap:0.5rem;align-items:flex-start;">
        <span class="material-symbols-rounded" aria-hidden="true" style="font-size:16px;color:var(--md-sys-color-primary);flex-shrink:0;">info</span>
        <span>Connectivity and response limits depend on the provider you choose and your current usage limits with that provider — they do not depend on how Thought GPS functions.</span>
      </p>
      <div id="keys-list"><div class="anim-shimmer" style="height:80px;"></div></div>
    </div>
    <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;">
      <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.25rem;">Key Router Status</h2>
      <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0 0 0.75rem;">
        What's connected right now. Failed keys cool down for 60s and the router automatically tries the next key — or the next provider with the same function.
      </p>
      <div id="key-router-status"><div class="anim-shimmer" style="height:60px;"></div></div>
    </div>
    <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;">
      <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Live Data Sources</h2>
      <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0 0 1rem;">
        Add API keys for web search and scraping. DuckDuckGo and Wikipedia sources are always available.
      </p>
      <div id="live-data-status"></div>
    </div>`;
}

function notificationsPanel() {
  return `
    <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;">
      <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">Notification Preferences</h2>
      <div id="notif-prefs">
        <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);cursor:pointer;">
          <input type="checkbox" id="pref-half-life" checked style="accent-color:var(--md-sys-color-primary);width:18px;height:18px;">
          <div><div style="font:var(--md-sys-typescale-body-medium);">Thought decay nudges</div><div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Get reminded as thoughts approach expiry</div></div>
        </label>
        <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);cursor:pointer;">
          <input type="checkbox" id="pref-commitment" checked style="accent-color:var(--md-sys-color-primary);width:18px;height:18px;">
          <div><div style="font:var(--md-sys-typescale-body-medium);">Commitment witnesses</div><div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Accountability partner notifications</div></div>
        </label>
        <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);cursor:pointer;">
          <input type="checkbox" id="pref-departure" checked style="accent-color:var(--md-sys-color-primary);width:18px;height:18px;">
          <div><div style="font:var(--md-sys-typescale-body-medium);">Departure alerts</div><div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Briefing when leaving a geo-fence</div></div>
        </label>
        <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);cursor:pointer;">
          <input type="checkbox" id="pref-drift" checked style="accent-color:var(--md-sys-color-primary);width:18px;height:18px;">
          <div><div style="font:var(--md-sys-typescale-body-medium);">Drift detection</div><div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Alert when focus shifts unexpectedly</div></div>
        </label>
        <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;cursor:pointer;">
          <input type="checkbox" id="pref-push" style="accent-color:var(--md-sys-color-primary);width:18px;height:18px;">
          <div><div style="font:var(--md-sys-typescale-body-medium);">Browser push notifications</div><div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Receive nudges even when tab is closed</div></div>
        </label>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1.5rem;">
        <button class="btn-m3 btn-filled" id="save-prefs-btn">Save Preferences</button>
        <button class="btn-m3 btn-outlined" id="enable-push-btn">
          <span class="mono-label" style="font-size:9px;">PUSH</span> Enable Push
        </button>
      </div>
    </div>
    <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;">
      <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">Quiet Hours</h2>
      <div style="display:flex;gap:1rem;align-items:center;">
        <div><label class="mono-label" style="display:block;margin-bottom:0.25rem;">FROM</label><input type="time" id="quiet-from" class="input-m3" value="22:00" style="width:120px;"></div>
        <div><label class="mono-label" style="display:block;margin-bottom:0.25rem;">TO</label><input type="time" id="quiet-to" class="input-m3" value="07:00" style="width:120px;"></div>
      </div>
    </div>`;
}

function privacyPanel() {
  return `
    <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;">
      <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">Data & Privacy</h2>
      <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);cursor:pointer;">
        <input type="checkbox" id="pref-data-sharing" checked style="accent-color:var(--md-sys-color-primary);width:18px;height:18px;">
        <div><div style="font:var(--md-sys-typescale-body-medium);">LLM enrichment</div><div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Allow sending thoughts to LLM for AI-powered responses</div></div>
      </label>
      <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;cursor:pointer;">
        <input type="checkbox" id="pref-web-search" checked style="accent-color:var(--md-sys-color-primary);width:18px;height:18px;">
        <div><div style="font:var(--md-sys-typescale-body-medium);">Enable web search</div><div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Enrich thoughts with live web data (Tavily, DuckDuckGo)</div></div>
      </label>
    </div>
    <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;">
      <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">Data Management</h2>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
        <button class="btn-m3 btn-outlined" id="export-data-btn">
          <span class="mono-label" style="font-size:9px;">EXPORT</span> Export All Data
        </button>
        <button class="btn-m3 btn-outlined" id="delete-account-btn" style="border-color:var(--md-sys-color-error);color:var(--md-sys-color-error);">
          <span class="mono-label" style="font-size:9px;color:var(--md-sys-color-error);">DELETE</span> Delete Account
        </button>
      </div>
    </div>`;
}

function geofencesPanel() {
  return `
    <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <div>
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Geo-fences</h2>
          <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0.25rem 0 0;">Location-based triggers for departure briefs and task nudges.</p>
        </div>
        <button class="btn-m3 btn-tonal" onclick="document.getElementById('add-geofence-dialog').style.display='flex';">
          <span style="font:700 14px/1 'Space Grotesk';">+</span> Add
        </button>
      </div>
      <div id="geofences-list"><div class="anim-shimmer" style="height:80px;"></div></div>
    </div>`;
}

// ── Data Loaders ──────────────────────────────────────────────────────────

const FEATURE_ROUTES = [
  { name: 'Thought Half-Life Nudges', icon: 'HALF-LIFE' },
  { name: 'Commitment Witness', icon: 'WITNESS' },
  { name: 'Departure Brief', icon: 'DEPART' },
  { name: 'Weekly Archaeology', icon: 'ARCHAEO' },
  { name: 'Thought Revival', icon: 'REVIVE' },
];

async function loadChannels(c) {
  const data = await api.get('/channels');
  const channels = data.channels || [];
  const listEl = c.querySelector('#channels-list');
  const routesEl = c.querySelector('#delivery-routes');

  if (channels.length === 0) {
    listEl.innerHTML = '<div class="tg-state"><div class="tg-state-title">No channels connected</div><div class="tg-state-body">Connect a channel to let Mission Control route thoughts where you already work.</div></div>';
  } else {
    listEl.innerHTML = channels.map(ch => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="chip ${ch.is_active ? 'chip-success' : 'chip-error'}">${ch.platform}</span>
          <span style="font:var(--md-sys-typescale-body-small);">${ch.display_name || ch.platform}</span>
        </div>
        <button class="btn-m3 btn-icon" onclick="deleteChannel('${ch.id}')" title="Disconnect">
          <span style="font:600 11px/1 'Space Grotesk';color:var(--md-sys-color-error);">DEL</span>
        </button>
      </div>`).join('');
  }

  // Delivery routes
  if (channels.length > 0) {
    routesEl.innerHTML = FEATURE_ROUTES.map(route => {
      const channelChips = channels.map(ch =>
        `<span class="chip ${ch.is_active ? 'chip-success' : 'chip-error'}" style="font-size:11px;">${ch.platform}</span>`
      ).join(' ');
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="mono-label" style="font-size:9px;color:var(--md-sys-color-primary);">${route.icon}</span>
          <span style="font:var(--md-sys-typescale-body-medium);">${route.name}</span>
        </div>
        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">${channelChips}</div>
      </div>`;
    }).join('');
  } else {
    routesEl.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Connect a channel to see delivery routes.</p>';
  }

  // Test channels
  c.querySelector('#test-all-channels')?.addEventListener('click', async () => {
    const resultsEl = c.querySelector('#test-results');
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = '<div class="tg-skeleton tg-skeleton--title"></div><div class="tg-skeleton"></div>';
    const results = [];
    for (const ch of channels) {
      const r = await api.post(`/channels/${ch.id}/test`, {});
      results.push({ platform: ch.platform, success: !r.error, message: r.message || r.error });
    }
    resultsEl.innerHTML = results.map(r =>
      `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0;">
        <span class="mono-label" style="font-size:9px;color:${r.success ? 'var(--color-success)' : 'var(--md-sys-color-error)'};">${r.success ? 'PASS' : 'FAIL'}</span>
        <span style="font:var(--md-sys-typescale-body-small);">${r.platform}: ${r.message}</span>
      </div>`).join('');
  });
}

async function loadKeys(c) {
  const data = await api.get('/keys');
  const keys = data.keys || {};
  const el = c.querySelector('#keys-list');
  const liveEl = c.querySelector('#live-data-status');

  const providerIcons = { groq: 'bolt', openai: 'auto_awesome', anthropic: 'psychology', nvidia: 'memory', ollama: 'dns', tavily: 'travel_explore', firecrawl: 'public' };

  // Flatten: each key (multiple per provider) becomes its own row
  const rows = [];
  for (const [provider, list] of Object.entries(keys)) {
    const listArr = Array.isArray(list) ? list : [list];
    listArr.forEach((info, i) => {
      if (info && info.masked) rows.push({ provider, masked: info.masked, id: info.id, index: i, count: listArr.length });
    });
  }

  if (rows.length === 0) {
    el.innerHTML = '<div class="tg-state"><div class="tg-state-title">No keys in the vault</div><div class="tg-state-body">Add your first key to enable AI-powered responses. Keys stay encrypted and scoped to your account.</div></div>';
  } else {
    el.innerHTML = rows.map(k => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span class="mono-label" style="font-size:9px;color:var(--md-sys-color-primary);">${k.provider.toUpperCase()}</span>
          ${k.count > 1 ? `<span class="mono-label" style="font-size:9px;color:var(--md-sys-color-outline);">#${k.index + 1}</span>` : ''}
          <div>
            <div style="font:var(--md-sys-typescale-body-medium);text-transform:capitalize;">${k.provider}</div>
            <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);font-family:var(--font-mono);">${k.masked}</div>
          </div>
        </div>
        <button class="btn-m3 btn-icon" onclick="deleteKey('${k.provider}','${k.id}')" title="Remove">
          <span style="font:600 11px/1 'Space Grotesk';color:var(--md-sys-color-error);">DEL</span>
        </button>
      </div>`).join('');
  }

  // Live data status
  const tavilyKey = keys.tavily;
  const firecrawlKey = keys.firecrawl;
  liveEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.5rem;">
      <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0;">
        <span class="mono-label" style="font-size:9px;color:var(--color-success);">ACTIVE</span>
        <span style="font:var(--md-sys-typescale-body-small);">DuckDuckGo (always available)</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0;">
        <span class="mono-label" style="font-size:9px;color:var(--color-success);">ACTIVE</span>
        <span style="font:var(--md-sys-typescale-body-small);">Wikipedia (always available)</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0;">
        <span class="mono-label" style="font-size:9px;color:${tavilyKey ? 'var(--color-success)' : 'var(--md-sys-color-outline)'};">${tavilyKey ? 'ACTIVE' : 'OFFLINE'}</span>
        <span style="font:var(--md-sys-typescale-body-small);">Tavily ${tavilyKey ? '(connected)' : '(add key above)'}</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0;">
        <span class="mono-label" style="font-size:9px;color:${firecrawlKey ? 'var(--color-success)' : 'var(--md-sys-color-outline)'};">${firecrawlKey ? 'ACTIVE' : 'OFFLINE'}</span>
        <span style="font:var(--md-sys-typescale-body-small);">Firecrawl ${firecrawlKey ? '(connected)' : '(add key above)'}</span>
      </div>
    </div>`;
}

async function loadKeyRouterStatus(c) {
  const el = c.querySelector('#key-router-status');
  if (!el) return;
  try {
    const data = await api.get('/keys/status');
    const providers = data.providers || {};
    const entries = Object.entries(providers);
    if (entries.length === 0) {
      el.innerHTML = '<div class="tg-state"><div class="tg-state-title">No keys connected</div><div class="tg-state-body">Shared pool keys serve requests automatically until you add your own.</div></div>';
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
  } catch {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Router status unavailable.</p>';
  }
}

async function loadNotifPrefs(c) {
  const me = await api.get('/auth/me');
  const prefs = me.notificationPrefs || {};
  if (prefs.halfLifeNudge === false) c.querySelector('#pref-half-life').checked = false;
  if (prefs.commitmentWitness === false) c.querySelector('#pref-commitment').checked = false;
  if (prefs.departureAlert === false) c.querySelector('#pref-departure').checked = false;
  if (prefs.driftDetection === false) c.querySelector('#pref-drift').checked = false;
  if (prefs.pushEnabled) c.querySelector('#pref-push').checked = true;
  if (prefs.quietFrom) c.querySelector('#quiet-from').value = prefs.quietFrom;
  if (prefs.quietTo) c.querySelector('#quiet-to').value = prefs.quietTo;
}

async function loadPrivacy(c) {
  const me = await api.get('/auth/me');
  if (me.data_sharing === false) c.querySelector('#pref-data-sharing').checked = false;
  if (me.web_search === false) c.querySelector('#pref-web-search').checked = false;
}

async function loadGeofences(c) {
  const el = c.querySelector('#geofences-list');
  try {
    const data = await api.get('/geofences');
    const geofences = data.geofences || [];
    if (geofences.length === 0) {
      el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-medium);">No geo-fences configured. Add locations to get departure briefs and arrival nudges.</p>';
      return;
    }
    const triggerIcons = { arrival: 'login', departure: 'logout', both: 'swap_horiz' };
    el.innerHTML = geofences.map(g => `
      <div class="surface-card" style="padding:1rem;margin-bottom:0.75rem;border-left:3px solid var(--md-sys-color-primary);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font:var(--md-sys-typescale-title-small);margin-bottom:0.25rem;">${escHtml(g.name)}</div>
            <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">
              ${g.lat?.toFixed(4)}, ${g.lng?.toFixed(4)} · ${g.radius}m ·
              <span class="mono-label" style="font-size:9px;vertical-align:middle;">${(triggerIcons[g.trigger_type] || 'GEO').toUpperCase()}</span> ${g.trigger_type}
            </div>
            ${g.linked_tasks?.length ? `<div style="margin-top:0.25rem;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-secondary);">Tasks: ${g.linked_tasks.join(', ')}</div>` : ''}
          </div>
          <button class="btn-m3 btn-icon" onclick="deleteGeofence('${g.id}')" title="Remove">
            <span style="font:600 11px/1 'Space Grotesk';color:var(--md-sys-color-error);">DEL</span>
          </button>
        </div>
      </div>`).join('');
  } catch {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Geo-fences not available yet.</p>';
  }
}

// ── Save Handlers ──────────────────────────────────────────────────────────

function setupSaveHandlers(c) {
  // Per-platform contextual help shown in the dialog
  const PLATFORM_HELP = {
    telegram: {
      tokenLabel: 'BOT TOKEN',
      tokenHint: 'From @BotFather → /newbot → copy token (e.g. 7123456789:AAF...)',
      idLabel: 'YOUR CHAT ID',
      idHint: 'Message @userinfobot on Telegram to get your numeric chat ID',
    },
    discord: {
      tokenLabel: 'BOT TOKEN',
      tokenHint: 'discord.com/developers → Your App → Bot → Reset Token',
      idLabel: 'YOUR USER/CHANNEL ID',
      idHint: 'Right-click your username → Copy User ID (enable Developer Mode first)',
    },
    slack: {
      tokenLabel: 'BOT TOKEN (xoxb-...)',
      tokenHint: 'api.slack.com/apps → OAuth & Permissions → Bot Token',
      idLabel: 'YOUR SLACK USER/CHANNEL ID',
      idHint: 'In Slack: right-click your name → Copy Member ID (starts with U...)',
    },
    email: {
      tokenLabel: 'EMAIL ADDRESS',
      tokenHint: 'e.g. yourname@gmail.com',
      idLabel: 'APP PASSWORD',
      idHint: 'Gmail: myaccount.google.com → Security → App Passwords (not your normal password)',
    },
    whatsapp: { tokenLabel: 'API KEY', tokenHint: 'Premium plan required', idLabel: 'PHONE NUMBER', idHint: '' },
    sms:      { tokenLabel: 'API KEY', tokenHint: 'Premium plan required', idLabel: 'PHONE NUMBER', idHint: '' },
  };

  function updateChannelDialogFields(platform) {
    const help = PLATFORM_HELP[platform] || { tokenLabel: 'TOKEN / API KEY', tokenHint: '', idLabel: 'CHANNEL / CHAT ID', idHint: '' };
    c.querySelector('#channel-token-container').style.display = 'block';
    c.querySelector('#channel-oauth-container').style.display = 'none';

    // Update labels and hints
    const tokenLabel = c.querySelector('label[for="channel-token"], #channel-token').closest('div')?.querySelector('.mono-label');
    if (tokenLabel) tokenLabel.textContent = help.tokenLabel;
    const tokenInput = c.querySelector('#channel-token');
    if (tokenInput && help.tokenHint) tokenInput.placeholder = help.tokenHint;

    const idLabel = c.querySelector('#channel-id').closest('div')?.querySelector('.mono-label');
    if (idLabel) idLabel.textContent = help.idLabel;
    const idInput = c.querySelector('#channel-id');
    if (idInput && help.idHint) idInput.placeholder = help.idHint;
  }

  // Initialize with default platform
  updateChannelDialogFields(c.querySelector('#channel-platform')?.value || 'telegram');

  // Backend-driven provider list for the Add Key dialog
  api.get('/keys/providers').then((data) => {
    const select = c.querySelector('#key-provider');
    if (!select) return;
    const registry = data.providers || [];
    select.innerHTML = '<option value="">Select a provider…</option>' + registry.map((p) =>
      `<option value="${p.id}">${p.name}</option>`
    ).join('');
    select.addEventListener('change', () => {
      const hint = c.querySelector('#key-provider-hint');
      if (!hint) return;
      const def = registry.find((p) => p.id === select.value);
      hint.textContent = def ? (def.requiresKey
        ? `${def.name}: ${def.note}. Keys stay AES-256 encrypted and never leave the server.`
        : `${def.name}: ${def.note} — no key required; connectivity depends on your local server being reachable.`) : '';
    });
  }).catch(() => {
    const select = c.querySelector('#key-provider');
    if (select) select.innerHTML = '<option value="groq">Groq</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="nvidia">NVIDIA NIM</option>';
  });

  c.querySelector('#channel-platform')?.addEventListener('change', (e) => {
    updateChannelDialogFields(e.target.value);
  });

  // Save channel — sends correct credential structure to backend → stored encrypted → PulseKit picks up on delivery
  c.querySelector('#save-channel-btn')?.addEventListener('click', async () => {
    const platform = c.querySelector('#channel-platform').value;
    const token = c.querySelector('#channel-token').value.trim();
    const channelId = c.querySelector('#channel-id').value.trim();

    if (!token) {
      toast.show('Please enter your bot token or API key', 'error');
      return;
    }

    // Build credentials object matching what PulseKit channel drivers expect
    let credentials = {};
    if (platform === 'telegram') {
      credentials = { bot_token: token, recipient_id: channelId };
    } else if (platform === 'discord') {
      credentials = { bot_token: token, recipient_id: channelId };
    } else if (platform === 'slack') {
      credentials = { bot_token: token, recipient_id: channelId }; // channel ID or user ID
    } else if (platform === 'email') {
      // token field = email address, channelId = app password
      credentials = {
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_user: token,       // email address
        smtp_pass: channelId,   // app password
        smtp_from: `Thought GPS <${token}>`,
        recipient_id: token,    // deliver to the same address
      };
    } else {
      credentials = { bot_token: token, recipient_id: channelId };
    }

    const result = await api.post('/channels/connect', {
      platform,
      credentials,
      displayName: platform.charAt(0).toUpperCase() + platform.slice(1),
    });

    if (result.error) {
      toast.show(result.error, 'error');
    } else {
      toast.show(`${platform} connected! Test it below.`, 'success');
      c.querySelector('#add-channel-dialog').style.display = 'none';
      c.querySelector('#channel-token').value = '';
      c.querySelector('#channel-id').value = '';
      loadChannels(c);
    }
  });


  // Save API key
  c.querySelector('#save-key-btn')?.addEventListener('click', async () => {
    const provider = c.querySelector('#key-provider').value;
    const key = c.querySelector('#key-value').value.trim();
    if (!provider) { toast.show('Select a provider first', 'error'); return; }
    if (!key) return;
    const result = await api.post('/keys', { provider, key });
    if (result.error) {
      toast.show(result.error, 'error');
      return;
    }
    c.querySelector('#add-key-dialog').style.display = 'none';
    c.querySelector('#key-value').value = '';
    loadKeys(c);
  });

  // Save notification prefs
  c.querySelector('#save-prefs-btn')?.addEventListener('click', async () => {
    const prefs = {
      halfLifeNudge: c.querySelector('#pref-half-life').checked,
      commitmentWitness: c.querySelector('#pref-commitment').checked,
      departureAlert: c.querySelector('#pref-departure').checked,
      driftDetection: c.querySelector('#pref-drift').checked,
      pushEnabled: c.querySelector('#pref-push').checked,
      quietFrom: c.querySelector('#quiet-from').value,
      quietTo: c.querySelector('#quiet-to').value,
    };
    await api.put('/auth/notification-prefs', { prefs });
    toast.show('Preferences saved!', 'success');
  });

  // Enable push
  c.querySelector('#enable-push-btn')?.addEventListener('click', async () => {
    if (!('Notification' in window)) { toast.show('Push notifications not supported in this browser.', 'error'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      c.querySelector('#pref-push').checked = true;
      toast.show('Push notifications enabled!', 'success');
    } else {
      toast.show('Push permission denied. Please allow notifications in browser settings.', 'error');
    }
  });

  // Privacy toggles
  c.querySelector('#pref-data-sharing')?.addEventListener('change', async (e) => {
    await api.put('/auth/data-sharing', { dataSharing: e.target.checked });
  });
  c.querySelector('#pref-web-search')?.addEventListener('change', async (e) => {
    await api.put('/auth/web-search', { webSearch: e.target.checked });
  });

  // Export data
  c.querySelector('#export-data-btn')?.addEventListener('click', async () => {
    const data = await api.get('/memory/export?format=json');
    if (!data.error) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'thought-gps-export.json'; a.click();
    }
  });

  // Delete account (two-step GDPR flow: request token, then delete with confirmation)
  c.querySelector('#delete-account-btn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure? This will permanently delete all your data. This cannot be undone.')) return;
    try {
      const req = await api.post('/memory/account/delete-request', {});
      if (req.error || !req.confirmationToken) {
        toast.show(req.error || 'Could not start account deletion', 'error');
        return;
      }
      const result = await api.del('/auth/account', { confirmationToken: req.confirmationToken });
      if (!result.error) {
        api.clearAuth();
        window.showPage?.('home');
      } else {
        toast.show(result.error, 'error');
      }
    } catch (err) {
      toast.show('Account deletion failed', 'error');
    }
  });

  // Geofence form
  c.querySelector('#geofence-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const geofence = {
      name: c.querySelector('#gf-name').value.trim(),
      lat: parseFloat(c.querySelector('#gf-lat').value),
      lng: parseFloat(c.querySelector('#gf-lng').value),
      radius: parseInt(c.querySelector('#gf-radius').value),
      trigger_type: c.querySelector('#gf-trigger').value,
      linked_tasks: c.querySelector('#gf-tasks').value.split(',').map(s => s.trim()).filter(Boolean),
    };
    const result = await api.post('/geofences', geofence);
    if (!result.error) {
      c.querySelector('#add-geofence-dialog').style.display = 'none';
      c.querySelector('#geofence-form').reset();
      loadGeofences(c);
    } else {
      toast.show(result.error, 'error');
    }
  });

  // Accessibility: Close modals on Escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      const modals = ['add-channel-dialog', 'add-key-dialog', 'add-geofence-dialog'];
      modals.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && modal.style.display !== 'none') {
          modal.style.display = 'none';
        }
      });
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  // Cleanup when container is removed from DOM (handled generically if possible, but safe to attach)
}

// ── Global handlers ────────────────────────────────────────────────────────
window.deleteChannel = async (id) => { if (confirm('Disconnect?')) { await api.del(`/channels/${id}`); window.showPage?.('mission-control'); } };
window.deleteKey = async (provider, keyId) => { if (!confirm(`Remove this ${provider} key?`)) return; await api.del(keyId ? `/keys/${provider}/${keyId}` : `/keys/${provider}`); window.showPage?.('mission-control'); };
window.deleteGeofence = async (id) => { if (confirm('Remove this geo-fence?')) { await api.del(`/geofences/${id}`); window.showPage?.('mission-control'); } };

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
