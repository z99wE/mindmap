// Mission Control - Channel configuration, witness contacts, notification prefs
import api from '../lib/api.js';

export function MissionControl() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal"><span class="material-symbols-rounded" style="color:var(--md-sys-color-secondary);">settings_suggest</span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">Mission Control</h1>
      </div>
      <p class="card-reveal" style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin-bottom:1.5rem;">
        Connect messaging platforms, configure notification preferences, and manage witness contacts.
      </p>

      <div class="grid-panels">
        <!-- Channels -->
        <div class="surface-card card-reveal">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Connected Channels</h2>
          <div id="channels-list"><div class="anim-shimmer" style="height:100px;"></div></div>
          <button class="btn-m3 btn-tonal" style="margin-top:1rem;width:100%;" onclick="document.getElementById('add-channel-dialog').style.display='flex';">
            <span class="material-symbols-rounded" style="font-size:18px;">add</span> Connect Channel
          </button>
        </div>

        <!-- Witness Contacts -->
        <div class="surface-card card-reveal">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Witness Contacts</h2>
          <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-bottom:1rem;">
            People who get notified when you commit to something.
          </p>
          <div id="witness-list"></div>
          <div style="display:flex;gap:0.5rem;margin-top:1rem;">
            <input type="email" id="witness-email" class="input-m3" placeholder="witness@email.com" style="flex:1;">
            <button class="btn-m3 btn-outlined" id="add-witness-btn">Add</button>
          </div>
        </div>

        <!-- Notification Preferences -->
        <div class="surface-card card-reveal">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Notification Preferences</h2>
          <div id="notif-prefs">
            <label style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;cursor:pointer;">
              <input type="checkbox" id="pref-half-life" checked style="accent-color:var(--md-sys-color-primary);">
              <span style="font:var(--md-sys-typescale-body-medium);">Thought decay nudges</span>
            </label>
            <label style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;cursor:pointer;">
              <input type="checkbox" id="pref-commitment" checked style="accent-color:var(--md-sys-color-primary);">
              <span style="font:var(--md-sys-typescale-body-medium);">Commitment witnesses</span>
            </label>
            <label style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;cursor:pointer;">
              <input type="checkbox" id="pref-departure" checked style="accent-color:var(--md-sys-color-primary);">
              <span style="font:var(--md-sys-typescale-body-medium);">Departure alerts</span>
            </label>
            <label style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;cursor:pointer;">
              <input type="checkbox" id="pref-drift" checked style="accent-color:var(--md-sys-color-primary);">
              <span style="font:var(--md-sys-typescale-body-medium);">Drift detection</span>
            </label>
          </div>
          <button class="btn-m3 btn-tonal" style="margin-top:1rem;width:100%;" id="save-prefs-btn">Save Preferences</button>
        </div>
      </div>

      <!-- Delivery Routes -->
      <div class="surface-card card-reveal" style="margin-top:1.5rem;padding:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Delivery Routes</h2>
          <button class="btn-m3 btn-outlined" id="test-all-channels">
            <span class="material-symbols-rounded" style="font-size:18px;">cell_tower</span>
            Test All Channels
          </button>
        </div>
        <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-bottom:1rem;">
          Connect a channel = receive cognitive features there.
        </p>
        <div id="delivery-routes" style="display:flex;flex-direction:column;gap:0.75rem;">
          <div class="anim-shimmer" style="height:120px;"></div>
        </div>
        <div id="test-results" style="margin-top:1rem;display:none;"></div>
      </div>

      <!-- Add Channel Dialog -->
      <div id="add-channel-dialog" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);align-items:center;justify-content:center;">
        <div class="glass-strong" style="width:100%;max-width:440px;border-radius:var(--md-sys-shape-extra-large);padding:2rem;">
          <h2 style="font:var(--md-sys-typescale-title-large);margin-bottom:1rem;">Connect Channel</h2>
          <div style="display:flex;flex-direction:column;gap:1rem;">
            <div>
              <label style="font:var(--md-sys-typescale-label-medium);display:block;margin-bottom:0.35rem;">Platform</label>
              <select id="channel-platform" class="input-m3">
                <option value="slack">Slack</option><option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option><option value="discord">Discord</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label style="font:var(--md-sys-typescale-label-medium);display:block;margin-bottom:0.35rem;">Token / API Key</label>
              <input type="password" id="channel-token" class="input-m3" placeholder="Your bot token or API key">
            </div>
            <div>
              <label style="font:var(--md-sys-typescale-label-medium);display:block;margin-bottom:0.35rem;">Channel / Chat ID</label>
              <input type="text" id="channel-id" class="input-m3" placeholder="Channel or chat identifier">
            </div>
            <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:0.5rem;">
              <button class="btn-m3 btn-text" onclick="document.getElementById('add-channel-dialog').style.display='none';">Cancel</button>
              <button class="btn-m3 btn-filled" id="save-channel-btn">Connect</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  loadChannels(container);
  loadWitnessContacts(container);
  loadDeliveryRoutes(container);
  setupSaveHandlers(container);
  return container;
}

const FEATURE_ROUTES = [
  { name: 'Thought Half-Life Nudges', icon: 'hourglass_empty', prefKey: 'halfLifeNudge' },
  { name: 'Commitment Witness', icon: 'task_alt', prefKey: 'commitmentWitness' },
  { name: 'Departure Brief', icon: 'directions_walk', prefKey: 'departureAlert' },
  { name: 'Weekly Archaeology', icon: 'history_edu', prefKey: 'archaeology' },
  { name: 'Thought Revival', icon: 'autorenew', prefKey: 'thoughtRevival' },
];

async function loadDeliveryRoutes(c) {
  const data = await api.get('/channels');
  const channels = data.channels || [];
  const el = c.querySelector('#delivery-routes');

  if (channels.length === 0) {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-medium);">No channels connected. Connect a channel above to start receiving cognitive nudges.</p>';
    return;
  }

  el.innerHTML = FEATURE_ROUTES.map(route => {
    const channelChips = channels.map(ch =>
      `<span class="chip ${ch.is_active ? 'chip-success' : 'chip-error'}" style="font-size:11px;">${ch.platform}</span>`
    ).join(' ');
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-primary);">${route.icon}</span>
        <span style="font:var(--md-sys-typescale-body-medium);">${route.name}</span>
      </div>
      <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">${channelChips}</div>
    </div>`;
  }).join('');

  // Test all channels handler
  c.querySelector('#test-all-channels')?.addEventListener('click', async () => {
    const resultsEl = c.querySelector('#test-results');
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = '<div class="spinner-m3" style="margin:0 auto;"></div><p style="text-align:center;color:var(--md-sys-color-outline);margin-top:0.5rem;">Testing channels...</p>';
    const results = [];
    for (const ch of channels) {
      try {
        const r = await api.post(`/channels/${ch.id}/test`, {});
        results.push({ platform: ch.platform, success: !r.error, message: r.message || r.error });
      } catch (e) {
        results.push({ platform: ch.platform, success: false, message: e.message });
      }
    }
    resultsEl.innerHTML = results.map(r =>
      `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;">
        <span class="material-symbols-rounded" style="font-size:18px;color:${r.success ? 'var(--color-success)' : 'var(--md-sys-color-error)'};">${r.success ? 'check_circle' : 'error'}</span>
        <span style="font:var(--md-sys-typescale-body-small);">${r.platform}: ${r.message}</span>
      </div>`
    ).join('');
  });
}

async function loadChannels(c) {
  const data = await api.get('/channels');
  const el = c.querySelector('#channels-list');
  if (data.error || !data.channels?.length) {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-medium);">No channels connected yet.</p>';
    return;
  }
  el.innerHTML = data.channels.map(ch => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <span class="chip ${ch.is_active ? 'chip-success' : 'chip-error'}">${ch.platform}</span>
        <span style="font:var(--md-sys-typescale-body-small);">${ch.display_name || ch.platform}</span>
      </div>
      <button class="icon-btn" onclick="deleteChannel('${ch.id}')" title="Disconnect">
        <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-error);">delete</span>
      </button>
    </div>`).join('');
}

async function loadWitnessContacts(c) {
  const me = await api.get('/auth/me');
  const el = c.querySelector('#witness-list');
  const contacts = me.witnessContacts || [];
  if (contacts.length === 0) {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No witness contacts added.</p>';
    return;
  }
  el.innerHTML = contacts.map(w => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0;">
      <span style="font:var(--md-sys-typescale-body-medium);">${w.email || w.name || w}</span>
      <button class="icon-btn" style="width:28px;height:28px;" onclick="removeWitness('${w.email || w}')">
        <span class="material-symbols-rounded" style="font-size:16px;">close</span>
      </button>
    </div>`).join('');
}

function setupSaveHandlers(c) {
  c.querySelector('#save-channel-btn')?.addEventListener('click', async () => {
    const platform = c.querySelector('#channel-platform').value;
    const token = c.querySelector('#channel-token').value;
    const channelId = c.querySelector('#channel-id').value;
    if (!token) return;
    const result = await api.post('/channels/connect', {
      platform, credentials: { token, chat_id: channelId }, displayName: platform,
    });
    if (!result.error) {
      c.querySelector('#add-channel-dialog').style.display = 'none';
      loadChannels(c);
    }
  });

  c.querySelector('#add-witness-btn')?.addEventListener('click', async () => {
    const email = c.querySelector('#witness-email').value.trim();
    if (!email) return;
    const me = await api.get('/auth/me');
    const contacts = [...(me.witnessContacts || []), { email }];
    await api.put('/auth/witness-contacts', { contacts });
    c.querySelector('#witness-email').value = '';
    loadWitnessContacts(c);
  });

  c.querySelector('#save-prefs-btn')?.addEventListener('click', async () => {
    const prefs = {
      halfLifeNudge: c.querySelector('#pref-half-life').checked,
      commitmentWitness: c.querySelector('#pref-commitment').checked,
      departureAlert: c.querySelector('#pref-departure').checked,
      driftDetection: c.querySelector('#pref-drift').checked,
    };
    await api.put('/auth/notification-prefs', { prefs });
    alert('Preferences saved!');
  });
}

window.deleteChannel = async (id) => { if (confirm('Disconnect this channel?')) { await api.del(`/channels/${id}`); window.showPage('mission-control'); } };
window.removeWitness = async (email) => { const me = await api.get('/auth/me'); const contacts = (me.witnessContacts || []).filter(w => (w.email || w) !== email); await api.put('/auth/witness-contacts', { contacts }); window.showPage('mission-control'); };
