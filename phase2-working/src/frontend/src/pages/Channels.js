// Channels - Messaging platform configuration
import api from '../lib/api.js';
import { toast } from '../lib/toast.js';

export function Channels() {
  const container = document.createElement('div');
  const user = api.getUser();
  const isPremium = user?.tier === 'premium' || user?.isAdmin || api.isDev();
  
	  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal"><span class="material-symbols-rounded" style="color:var(--md-sys-color-tertiary);">forum</span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">Connected Channels</h1>
      </div>
      ${!isPremium ? '<div class="card-reveal" style="padding:1rem;border-radius:var(--md-sys-shape-medium);background:rgba(255,184,108,.08);border:1px solid rgba(255,184,108,.2);color:var(--color-analytical);margin-bottom:1rem;font:var(--md-sys-typescale-body-medium);"><span class="material-symbols-rounded" style="font-size:18px;vertical-align:middle;">lock</span> Free tier allows up to 2 basic channels. <a href="#" onclick="showPage(\'credits\')" style="text-decoration:underline;">Upgrade now</a> for unlimited channels and SMS/WhatsApp.</div>' : ''}
      
      <div class="surface-card card-reveal" style="margin-bottom:1rem;">
        <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Channel Routing Mode</h3>
        <div style="display:flex;gap:1rem;align-items:center;">
          <label style="font:var(--md-sys-typescale-body-medium); display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="radio" name="routing_mode" value="failover" checked>
            Failover (Sequential Backup)
          </label>
          <label style="font:var(--md-sys-typescale-body-medium); display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="radio" name="routing_mode" value="broadcast">
            Broadcast (Parallel Sending)
          </label>
          <button class="btn-m3 btn-tonal" id="save-routing-btn" style="margin-left:auto; padding: 0.25rem 1rem;">Save Mode</button>
        </div>
      </div>

      <div class="surface-card card-reveal" style="margin-bottom:1rem;">
        <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Add Channel</h3>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1rem;">
          <select id="channel-platform" class="input-m3" style="width:200px;">
            <option value="">Loading platforms…</option>
          </select>
          <input type="text" id="channel-name" class="input-m3" placeholder="Display Name (optional)" style="flex:1;min-width:200px;">
        </div>
        <div id="dynamic-fields" style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1rem;"></div>
        <div id="setup-guide" style="display:none;padding:0.75rem;border-radius:var(--md-sys-shape-medium);background:rgba(204,255,0,0.04);border:1px solid rgba(204,255,0,0.12);margin-bottom:1rem;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);line-height:1.6;"></div>
        <button class="btn-m3 btn-filled" id="add-channel-btn">Connect Channel</button>
      </div>

      <div id="channels-list" class="card-reveal"><div class="anim-shimmer" style="height:100px;"></div></div>
    </div>`;

  let platforms = [];

  // Fetch routing preference
  api.get('/auth/me').then(data => {
    const prefs = data.notification_prefs || {};
    if (prefs.channel_routing_mode === 'broadcast') {
      container.querySelector('input[value="broadcast"]').checked = true;
    }
  });

  container.querySelector('#save-routing-btn').addEventListener('click', async () => {
    const mode = container.querySelector('input[name="routing_mode"]:checked').value;
    const res = await api.put('/auth/notification-prefs', { prefs: { channel_routing_mode: mode } });
    if (res.error) toast.show(res.error, 'error');
    else toast.show('Routing mode saved successfully', 'success');
  });

  // Populate the platform dropdown
  api.get('/channels/platforms').then((data) => {
    platforms = data.platforms || [];
    const select = container.querySelector('#channel-platform');
    const dynamicFieldsContainer = container.querySelector('#dynamic-fields');
    
    select.innerHTML = '<option value="">Select a platform…</option>' + platforms.map((p) =>
      `<option value="${p.id}">${p.name}</option>`
    ).join('');

	    select.addEventListener('change', () => {
	      const def = platforms.find((p) => p.id === select.value);
	      dynamicFieldsContainer.innerHTML = '';
	      const guideEl = container.querySelector('#setup-guide');
	      if (def && def.fields) {
	        def.fields.forEach(field => {
	          const input = document.createElement('input');
	          // simple check for sensitive fields to make them password fields
	          input.type = field.includes('token') || field.includes('key') || field.includes('password') || field.includes('secret') ? 'password' : 'text';
	          input.id = `field-${field}`;
	          input.dataset.field = field;
	          input.className = 'input-m3';
	          input.placeholder = field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
	          dynamicFieldsContainer.appendChild(input);
	        });
	      }
	      // Show setup guide
	      const guides = {
	        telegram: '🤖 <b>To get your bot token:</b><br>1. Open <a href="https://t.me/botfather" target="_blank" style="color:#ccff00;">@BotFather</a> on Telegram<br>2. Send <code>/newbot</code> and follow prompts<br>3. Copy the <b>bot token</b> (looks like <code>123456:ABC-DEF1234ghIkl</code>)<br>4. Enter your Telegram <b>user ID</b> as Chat ID (get it from <a href="https://t.me/userinfobot" target="_blank" style="color:#ccff00;">@userinfobot</a>)',
	        slack: '💬 <b>To connect Slack:</b><br>1. Go to <a href="https://api.slack.com/apps" target="_blank" style="color:#ccff00;">api.slack.com/apps</a><br>2. Create an app or use an existing one<br>3. Under OAuth & Permissions, add <b>chat:write</b> and <b>im:write</b> scopes<br>4. Install to workspace and copy the <b>Bot Token</b> (starts with <code>xoxb-</code>)<br>5. For Channel ID: right-click a channel → "Copy link" → use the ID after <code>/archives/</code>',
	        discord: '🎮 <b>To set up Discord:</b><br>1. Go to <a href="https://discord.com/developers/applications" target="_blank" style="color:#ccff00;">Discord Developer Portal</a><br>2. Create an application → Bot → Copy <b>bot token</b><br>3. Enable <b>Message Content Intent</b> under Bot settings<br>4. Use OAuth2 URL Generator to invite the bot to your server<br>5. Channel ID: right-click channel → Copy ID (enable Developer Mode)',
	        whatsapp: '📱 <b>WhatsApp requires a Meta Business Account:</b><br>1. Go to <a href="https://business.facebook.com" target="_blank" style="color:#ccff00;">Meta Business Suite</a><br>2. Create a WhatsApp Business Account (free)<br>3. Get your <b>Phone Number ID</b> and <b>API Key</b> from the App Dashboard<br>4. Configure webhook URL: <code>https://yourdomain.com/api/webhooks/whatsapp</code>',
	        email: '📧 <b>For Email (SMTP):</b><br>1. Use any SMTP provider (Gmail, SendGrid, Mailgun, etc.)<br>2. <b>Gmail users:</b> Enable 2FA → Generate App Password<br>3. <b>SendGrid:</b> Create API Key with Mail Send permission<br>4. SMTP Port: 587 (TLS) or 465 (SSL)',
	        sms: '📟 <b>For SMS (Twilio):</b><br>1. Sign up at <a href="https://twilio.com" target="_blank" style="color:#ccff00;">Twilio</a> (free credits included)<br>2. Get a phone number with SMS capability<br>3. API Key format: <code>ACCOUNT_SID:AUTH_TOKEN</code><br>4. Phone number with country code, e.g. <code>+15551234567</code>',
	        signal: '🔒 <b>Signal requires a self-hosted gateway:</b><br>1. Install <a href="https://github.com/AsamK/signal-cli" target="_blank" style="color:#ccff00;">signal-cli</a> on a server<br>2. Register your phone number with <code>signal-cli register</code><br>3. Set up the REST API wrapper or use a cloud gateway<br>4. Enter your phone number with country code',
	        twitter: '🐦 <b>To connect Twitter/X:</b><br>1. Go to <a href="https://developer.twitter.com" target="_blank" style="color:#ccff00;">developer.twitter.com</a><br>2. Create a Project → App → Generate <b>API Key</b> + <b>API Secret</b><br>3. Generate <b>Access Token</b> + <b>Access Token Secret</b> (with Read+Write)<br>4. Free tier allows 500 tweets/month',
	        bluesky: '🦋 <b>To connect Bluesky:</b><br>1. Create a Bluesky account (free)<br>2. Go to Settings → App Passwords<br>3. Create an App Password for Mentally<br>4. Enter your <b>handle</b> (e.g. user.bsky.social) and the <b>App Password</b>',
	      };
	      if (guideEl) {
	        if (guides[select.value]) {
	          guideEl.innerHTML = guides[select.value];
	          guideEl.style.display = 'block';
	        } else {
	          guideEl.style.display = 'none';
	        }
	      }
	    });
  }).catch(() => {
    container.querySelector('#channel-platform').innerHTML = '<option value="">Platforms unavailable</option>';
  });

  function loadChannels() {
    api.get('/channels').then(data => {
      const el = container.querySelector('#channels-list');
      const channels = data.channels || [];
      if (channels.length === 0) {
        el.innerHTML = '<div class="surface-card" style="text-align:center;padding:2rem;color:var(--md-sys-color-outline);">No channels connected yet.</div>';
        return;
      }
      el.innerHTML = '<div class="surface-card" style="padding:0;">' + channels.map(ch => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;border-bottom:1px solid var(--md-sys-color-outline-variant);">
          <div style="display:flex;align-items:center;gap:1rem;">
            <span class="chip chip-primary">${ch.platform}</span>
            <span style="font:var(--md-sys-typescale-body-medium);font-weight:bold;">${ch.display_name}</span>
            <label class="toggle-switch">
              <input type="checkbox" onchange="toggleChannel('${ch.id}')" ${ch.is_active ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn-m3 btn-tonal" style="padding: 0.25rem 0.5rem;" onclick="testChannel('${ch.id}')">Test</button>
            <button class="icon-btn" onclick="deleteChannel('${ch.id}')" title="Remove">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-error);">delete</span>
            </button>
          </div>
        </div>`).join('') + '</div>';
    });
  }

  loadChannels();

  container.querySelector('#add-channel-btn')?.addEventListener('click', async () => {
    const platform = container.querySelector('#channel-platform').value;
    const displayName = container.querySelector('#channel-name').value.trim();
    if (!platform) { toast.show('Select a platform first', 'error'); return; }
    
    const platformDef = platforms.find((p) => p.id === platform);
    const credentials = {};
    let missingField = false;

    if (platformDef && platformDef.fields) {
      platformDef.fields.forEach(field => {
        const val = container.querySelector(`#field-${field}`)?.value.trim();
        if (!val) missingField = true;
        credentials[field] = val;
      });
    }

    if (missingField) { toast.show('Please fill in all required fields', 'error'); return; }

    const result = await api.post('/channels/connect', { platform, displayName, credentials });
    if (result.error) { toast.show(result.error, 'error'); return; }
    
    // reset form
    container.querySelector('#channel-platform').value = '';
    container.querySelector('#channel-name').value = '';
    container.querySelector('#dynamic-fields').innerHTML = '';
    toast.show('Channel connected successfully', 'success');
    loadChannels();
  });

  // Attach global functions for inline handlers
  window.toggleChannel = async (id) => {
    const res = await api.put(`/channels/${id}/toggle`);
    if (res.error) { toast.show(res.error, 'error'); loadChannels(); }
    else toast.show('Channel toggled', 'success');
  };

  window.deleteChannel = async (id) => {
    if (!confirm('Remove this channel?')) return;
    const res = await api.del(`/channels/${id}`);
    if (res.error) toast.show(res.error, 'error');
    loadChannels();
  };

  window.testChannel = async (id) => {
    toast.show('Sending test message...', 'info');
    const res = await api.post(`/channels/${id}/test`);
    if (res.error) toast.show(res.error, 'error');
    else toast.show('Test message sent successfully!', 'success');
  };

  return container;
}
