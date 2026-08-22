// Profile Page — view and edit user profile, sign out
import api from '../lib/api.js';

const PROFESSIONS = [
  'Student','Software Engineer','Product Manager','Designer','Data Scientist','Researcher','Writer / Author',
  'Entrepreneur / Founder','Consultant','Teacher / Educator','Doctor / Healthcare','Lawyer','Scientist',
  'Artist / Creative','Marketing / Growth','Finance / Analyst','Sales','Operations','HR / People','Other'
];

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina',
  'Botswana','Brazil','Brunei','Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia',
  'Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt',
  'Estonia','Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Haiti',
  'Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica',
  'Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Libya','Lithuania','Luxembourg',
  'Malaysia','Mali','Malta','Mexico','Moldova','Monaco','Mongolia','Morocco','Mozambique','Myanmar',
  'Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway','Oman','Pakistan','Palestine',
  'Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda',
  'Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea',
  'Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand','Tunisia',
  'Turkey','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay',
  'Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
];

export function Profile() {
  const user = api.getUser() || {};
  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '—';
  const initials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || user.email?.[0] || '')).toUpperCase() || '?';

  const el = document.createElement('div');
  el.className = 'page-shell';
  el.innerHTML = `
    <div style="max-width:640px;margin:0 auto;padding:0 0 3rem;">

      <!-- Header -->
      <div class="surface-card card-reveal" style="border-radius:var(--md-sys-shape-extra-large);padding:2rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:1.5rem;">
        <!-- Avatar -->
        <div style="flex-shrink:0;width:72px;height:72px;border-radius:50%;background:linear-gradient(145deg,var(--md-sys-color-primary),var(--md-sys-color-secondary));display:flex;align-items:center;justify-content:center;font:700 28px/1 var(--font-display);color:var(--md-sys-color-on-primary);">
          ${initials}
        </div>
        <div style="flex:1;min-width:0;">
          <h1 style="font:var(--md-sys-typescale-headline-small);margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="profile-name-display">
            ${esc(user.firstName ? user.firstName + (user.lastName ? ' ' + user.lastName : '') : user.email?.split('@')[0] || 'User')}
          </h1>
          <p style="margin:0 0 6px;font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">${esc(user.email || '')}</p>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;background:rgba(204,255,0,0.12);border:1px solid rgba(204,255,0,0.3);font:600 11px var(--font-body);color:#ccff00;letter-spacing:0.06em;text-transform:uppercase;">
              <span class="material-symbols-rounded" style="font-size:13px;">verified</span>
              ${(user.tier || 'free').toUpperCase()}
            </span>
            ${user.username ? `<span style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">@${user.username}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Edit Profile Form -->
      <div class="surface-card card-reveal" style="border-radius:var(--md-sys-shape-extra-large);padding:2rem;margin-bottom:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1.5rem;display:flex;align-items:center;gap:0.5rem;">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary);">edit</span>
          Edit Profile
        </h2>
        <form id="profile-form" style="display:flex;flex-direction:column;gap:1.2rem;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
            <div>
              <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">First Name</label>
              <input type="text" id="prof-firstname" class="input-m3" value="${esc(user.firstName || '')}" placeholder="Jane">
            </div>
            <div>
              <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Last Name</label>
              <input type="text" id="prof-lastname" class="input-m3" value="${user.lastName || ''}" placeholder="Doe">
            </div>
          </div>
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Username</label>
            <div style="position:relative;">
              <span style="position:absolute;left:0.9rem;top:50%;transform:translateY(-50%);color:var(--md-sys-color-outline);font:500 14px var(--font-mono);">@</span>
              <input type="text" id="prof-username" class="input-m3" value="${user.username || ''}" placeholder="yourhandle" style="padding-left:2rem;" maxlength="20">
            </div>
          </div>
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">What do you do?</label>
            <select id="prof-profession" class="input-m3" style="cursor:pointer;">
              <option value="">Select your profession</option>
              ${PROFESSIONS.map(p => `<option value="${p}" ${user.profession === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Country</label>
            <select id="prof-country" class="input-m3" style="cursor:pointer;">
              <option value="">Select your country</option>
              ${COUNTRIES.map(c => `<option value="${c}" ${user.country === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div id="profile-msg" style="display:none;"></div>
          <button type="submit" class="btn-m3 btn-filled" style="width:100%;">
            <span class="material-symbols-rounded">save</span> Save Changes
          </button>
        </form>
      </div>

      <!-- Account Info -->
      <div class="surface-card card-reveal" style="border-radius:var(--md-sys-shape-extra-large);padding:2rem;margin-bottom:1.5rem;" id="agent-prefs-card">
        <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1.5rem;display:flex;align-items:center;gap:0.5rem;">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-secondary);">psychology</span>
          Agent Preferences
        </h2>
        <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);margin-bottom:1rem;">
          Your agent adapts to how you think. These preferences are injected into every AI response.
        </p>
        <div id="agent-prefs-form" style="display:flex;flex-direction:column;gap:1rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <label style="font:var(--md-sys-typescale-body-medium);">Response Style</label>
            <select id="pref-style" class="input-m3" style="width:auto;min-width:140px;">
              <option value="concise">Concise</option>
              <option value="detailed">Detailed</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </select>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <label style="font:var(--md-sys-typescale-body-medium);">Use Bullet Points</label>
            <label class="toggle-switch"><input type="checkbox" id="pref-bullets" checked><span class="slider"></span></label>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <label style="font:var(--md-sys-typescale-body-medium);">Enable Quiet Hours</label>
            <label class="toggle-switch"><input type="checkbox" id="pref-quiet"><span class="slider"></span></label>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;" id="quiet-times" style="display:none;">
            <div><label style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">Start</label><input type="time" id="pref-quiet-start" class="input-m3" value="22:00"></div>
            <div><label style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">End</label><input type="time" id="pref-quiet-end" class="input-m3" value="08:00"></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <label style="font:var(--md-sys-typescale-body-medium);">Nudge Frequency</label>
            <select id="pref-nudge" class="input-m3" style="width:auto;min-width:140px;">
              <option value="low">Low</option>
              <option value="normal" selected>Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Custom Instructions</label>
            <textarea id="pref-instructions" class="input-m3" placeholder="e.g., 'Always ask for a deadline when I say remind me'" rows="2" style="resize:vertical;"></textarea>
          </div>
          <div id="agent-prefs-msg" style="display:none;"></div>
          <button class="btn-m3 btn-filled" id="save-agent-prefs" style="width:100%;">Save Agent Preferences</button>
        </div>
      </div>

      <!-- Account Info -->
      <div class="surface-card card-reveal" style="border-radius:var(--md-sys-shape-extra-large);padding:2rem;margin-bottom:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;display:flex;align-items:center;gap:0.5rem;">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary);">info</span>
          Account Info
        </h2>
        <div style="display:flex;flex-direction:column;gap:0.75rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
            <span style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">Email</span>
            <span style="font:var(--md-sys-typescale-body-medium);">${esc(user.email || '—')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
            <span style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">Plan</span>
            <span style="font:var(--md-sys-typescale-body-medium);text-transform:capitalize;">${esc(user.tier || 'free')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
            <span style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">Daily runs used</span>
            <span style="font:var(--md-sys-typescale-body-medium);">${user.dailyRunsUsed ?? 0} / ${user.dailyRunsLimit ?? 10}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;">
            <span style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">Member since</span>
            <span style="font:var(--md-sys-typescale-body-medium);">${joinDate}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="surface-card card-reveal" style="border-radius:var(--md-sys-shape-extra-large);padding:2rem;">
        <button id="prof-upgrade" class="btn-m3 btn-tonal" style="width:100%;margin-bottom:0.75rem;justify-content:flex-start;gap:0.75rem;" onclick="showPage('credits')">
          <span class="material-symbols-rounded">upgrade</span> Upgrade Plan
        </button>
        <button id="prof-signout" class="btn-m3" style="width:100%;justify-content:flex-start;gap:0.75rem;color:var(--md-sys-color-error);border:1px solid var(--md-sys-color-error);">
          <span class="material-symbols-rounded">logout</span> Sign Out
        </button>
      </div>
    </div>`;

  // Save profile handler
  el.querySelector('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = el.querySelector('#profile-msg');
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    msg.style.display = 'none';

    const payload = {
      firstName:  el.querySelector('#prof-firstname').value.trim() || undefined,
      lastName:   el.querySelector('#prof-lastname').value.trim() || undefined,
      username:   el.querySelector('#prof-username').value.trim() || undefined,
      profession: el.querySelector('#prof-profession').value || undefined,
      country:    el.querySelector('#prof-country').value || undefined,
    };

    const result = await api.put('/auth/profile', payload);
    btn.disabled = false;

    if (result.error) {
      msg.style.cssText = 'display:block;padding:0.75rem;border-radius:8px;background:rgba(255,138,158,.1);color:var(--md-sys-color-error);font:var(--md-sys-typescale-body-small);margin-bottom:0;';
      msg.textContent = result.error;
    } else {
      msg.style.cssText = 'display:block;padding:0.75rem;border-radius:8px;background:rgba(204,255,0,.08);color:#ccff00;font:var(--md-sys-typescale-body-small);margin-bottom:0;';
      msg.textContent = '✓ Profile saved';
      // Update local user cache
      const updatedUser = { ...api.getUser(), ...result };
      api.setUser(updatedUser);
      // Update display name
      const nameDisplay = el.querySelector('#profile-name-display');
      if (nameDisplay) {
        const fn = result.firstName || api.getUser()?.firstName || '';
        const ln = result.lastName || api.getUser()?.lastName || '';
        nameDisplay.textContent = fn ? `${fn}${ln ? ' ' + ln : ''}` : api.getUser()?.email?.split('@')[0] || 'User';
      }
      // Update top bar chip
      if (window.__updateUserChip) window.__updateUserChip();
      setTimeout(() => { msg.style.display = 'none'; }, 3000);
    }
  });

  // Load agent preferences
  async function loadAgentPrefs() {
    try {
      const data = await api.get('/agent/preferences');
      if (data.preferences) {
        const p = data.preferences;
        const styleEl = el.querySelector('#pref-style');
        if (styleEl) styleEl.value = p.response_style || 'concise';
        const bulletsEl = el.querySelector('#pref-bullets');
        if (bulletsEl) bulletsEl.checked = p.bullet_points !== false;
        const quietEl = el.querySelector('#pref-quiet');
        if (quietEl) quietEl.checked = !!p.quiet_hours_enabled;
        toggleQuietTimes(!!p.quiet_hours_enabled);
        const qsEl = el.querySelector('#pref-quiet-start');
        if (qsEl) qsEl.value = p.quiet_hours_start || '22:00';
        const qeEl = el.querySelector('#pref-quiet-end');
        if (qeEl) qeEl.value = p.quiet_hours_end || '08:00';
        const nudgeEl = el.querySelector('#pref-nudge');
        if (nudgeEl) nudgeEl.value = p.nudge_frequency || 'normal';
        const instEl = el.querySelector('#pref-instructions');
        if (instEl) instEl.value = p.custom_instructions || '';
      }
    } catch { /* defaults */ }
  }

  function toggleQuietTimes(show) {
    const qt = document.getElementById('quiet-times');
    if (qt) qt.style.display = show ? 'grid' : 'none';
  }

  document.addEventListener('change', (e) => {
    if (e.target.id === 'pref-quiet') toggleQuietTimes(e.target.checked);
  });

  el.querySelector('#save-agent-prefs').addEventListener('click', async () => {
    const msg = el.querySelector('#agent-prefs-msg');
    const btn = el.querySelector('#save-agent-prefs');
    btn.disabled = true;
    msg.style.display = 'none';
    const prefs = {
      response_style: el.querySelector('#pref-style')?.value || 'concise',
      bullet_points: el.querySelector('#pref-bullets')?.checked ?? true,
      quiet_hours_enabled: el.querySelector('#pref-quiet')?.checked ?? false,
      quiet_hours_start: el.querySelector('#pref-quiet-start')?.value || '22:00',
      quiet_hours_end: el.querySelector('#pref-quiet-end')?.value || '08:00',
      nudge_frequency: el.querySelector('#pref-nudge')?.value || 'normal',
      custom_instructions: el.querySelector('#pref-instructions')?.value?.trim() || '',
    };
    const result = await api.put('/agent/preferences', prefs);
    btn.disabled = false;
    if (result.error) {
      msg.style.cssText = 'display:block;padding:0.75rem;border-radius:8px;background:rgba(255,138,158,.1);color:var(--md-sys-color-error);font:var(--md-sys-typescale-body-small);';
      msg.textContent = result.error;
    } else {
      msg.style.cssText = 'display:block;padding:0.75rem;border-radius:8px;background:rgba(204,255,0,.08);color:#ccff00;font:var(--md-sys-typescale-body-small);';
      msg.textContent = '✓ Agent preferences saved';
      setTimeout(() => { msg.style.display = 'none'; }, 3000);
    }
  });

  // Sign out handler
  el.querySelector('#prof-signout').addEventListener('click', () => {
    if (confirm('Are you sure you want to sign out?')) {
      api.clearAuth();
      window.dispatchEvent(new CustomEvent('rementally-auth-required'));
    }
  });

  return el;
}
