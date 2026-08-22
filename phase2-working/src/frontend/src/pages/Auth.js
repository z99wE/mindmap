// Auth Page - Login / Register with extended profile fields
import api from '../lib/api.js';

// Country list (abbreviated — common ones first)
const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana',
  'Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Chad','Chile','China',
  'Colombia','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Estonia','Ethiopia','Finland','France','Gabon','Georgia','Germany','Ghana',
  'Greece','Guatemala','Guinea','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland',
  'Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan','Latvia','Lebanon',
  'Libya','Lithuania','Luxembourg','Madagascar','Malaysia','Mali','Malta','Mexico','Moldova','Monaco','Mongolia',
  'Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nepal','Netherlands','New Zealand','Nicaragua',
  'Niger','Nigeria','Norway','Oman','Pakistan','Palestine','Panama','Paraguay','Peru','Philippines','Poland',
  'Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Sierra Leone','Singapore',
  'Slovakia','Slovenia','Somalia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland',
  'Syria','Taiwan','Tajikistan','Tanzania','Thailand','Tunisia','Turkey','Turkmenistan','Uganda','Ukraine',
  'United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen',
  'Zambia','Zimbabwe'
];

const PROFESSIONS = [
  'Student','Software Engineer','Product Manager','Designer','Data Scientist','Researcher','Writer / Author',
  'Entrepreneur / Founder','Consultant','Teacher / Educator','Doctor / Healthcare','Lawyer','Scientist',
  'Artist / Creative','Marketing / Growth','Finance / Analyst','Sales','Operations','HR / People','Other'
];

export function Auth() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:70vh;padding:1rem 0;">
      <div class="glass-strong card-reveal" style="width:100%;max-width:480px;border-radius:var(--md-sys-shape-extra-large);padding:2.5rem;">
        <div style="text-align:center;margin-bottom:2rem;">
          <h1 style="font:var(--md-sys-typescale-headline-small);margin-bottom:0.5rem;">Welcome to ReMentally</h1>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">Your cognitive coprocessor for navigating thoughts</p>
        </div>

        <div id="auth-tabs" style="display:flex;background:var(--md-sys-color-surface-container);border-radius:var(--md-sys-shape-full);padding:4px;margin-bottom:1.5rem;">
          <button class="auth-tab active" data-tab="login" style="flex:1;padding:0.6rem;border:none;border-radius:var(--md-sys-shape-full);cursor:pointer;font:var(--md-sys-typescale-label-large);background:var(--md-sys-color-primary);color:var(--md-sys-color-on-primary);">Sign In</button>
          <button class="auth-tab" data-tab="register" style="flex:1;padding:0.6rem;border:none;border-radius:var(--md-sys-shape-full);cursor:pointer;font:var(--md-sys-typescale-label-large);background:transparent;color:var(--md-sys-color-on-surface-variant);">Register</button>
        </div>

        <form id="auth-form" style="display:flex;flex-direction:column;gap:1rem;">

          <!-- Register-only fields (shown/hidden via JS) -->
          <div id="reg-fields" style="display:none;flex-direction:column;gap:1rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
              <div>
                <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">First Name <span style="color:var(--md-sys-color-error)">*</span></label>
                <input type="text" id="auth-firstname" class="input-m3" placeholder="Jane" autocomplete="given-name">
              </div>
              <div>
                <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Last Name <span style="color:var(--md-sys-color-error)">*</span></label>
                <input type="text" id="auth-lastname" class="input-m3" placeholder="Doe" autocomplete="family-name">
              </div>
            </div>

            <div>
              <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">
                Username <span style="color:var(--md-sys-color-outline);font-size:0.8em;">(optional)</span>
              </label>
              <div style="position:relative;">
                <span style="position:absolute;left:0.9rem;top:50%;transform:translateY(-50%);color:var(--md-sys-color-outline);font:500 14px var(--font-mono);">@</span>
                <input type="text" id="auth-username" class="input-m3" placeholder="yourhandle" style="padding-left:2rem;" autocomplete="username" maxlength="20">
              </div>
              <span style="font:11px/1.4 var(--font-body);color:var(--md-sys-color-outline);margin-top:3px;display:block;">3–20 chars, letters/numbers/underscores</span>
            </div>

            <div>
              <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">What do you do?</label>
              <select id="auth-profession" class="input-m3" style="cursor:pointer;">
                <option value="">Select your profession</option>
                ${PROFESSIONS.map(p => `<option value="${p}">${p}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Country</label>
              <select id="auth-country" class="input-m3" style="cursor:pointer;">
                <option value="">Select your country</option>
                ${COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Always visible fields -->
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Email</label>
            <input type="email" id="auth-email" class="input-m3" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Password</label>
            <input type="password" id="auth-password" class="input-m3" placeholder="Min 8 characters" required minlength="8" autocomplete="current-password">
          </div>

          <div id="auth-error" style="display:none;padding:0.75rem;border-radius:var(--md-sys-shape-small);background:rgba(255,138,158,.1);color:var(--md-sys-color-error);font:var(--md-sys-typescale-body-small);"></div>

          <button type="submit" id="auth-submit" class="btn-m3 btn-filled" style="width:100%;margin-top:0.5rem;">
            <span id="auth-submit-text">Sign In</span>
            <div id="auth-spinner" class="spinner" style="display:none;width:20px;height:20px;"></div>
          </button>
        </form>

        <div id="auth-dev-admin" style="display:none;margin-top:1.25rem;"></div>

        <p style="text-align:center;margin-top:1.5rem;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">
          Disposable email addresses are not allowed. Use a real email to get started.
        </p>
      </div>
    </div>`;

  // Local admin hint
  const hintBox = container.querySelector('#auth-dev-admin');
  (async () => {
    try {
      const hint = await api.get('/auth/dev-admin-hint');
      if (!hint?.available) return;
      hintBox.innerHTML = `
        <div style="padding:0.9rem 1rem;border-radius:var(--md-sys-shape-medium);background:rgba(204,255,0,0.07);border:1px solid rgba(204,255,0,0.28);">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
            <span class="material-symbols-rounded" style="font-size:18px;color:#ccff00;">admin_panel_settings</span>
            <span style="font:600 12px/1 var(--font-body);letter-spacing:0.06em;color:#d4ff33;text-transform:uppercase;">Local Admin</span>
          </div>
          <div style="font:500 12px/1.7 var(--font-mono);color:var(--md-sys-color-on-surface-variant);word-break:break-all;">
            ${hint.email}<br>${hint.password}
          </div>
          <button type="button" id="auth-dev-admin-fill" class="btn-m3 btn-tonal" style="width:100%;margin-top:0.6rem;min-height:36px;font-size:13px;">
            Sign in as local admin
          </button>
        </div>`;
      hintBox.style.display = 'block';
      hintBox.querySelector('#auth-dev-admin-fill').addEventListener('click', () => {
        container.querySelector('.auth-tab[data-tab="login"]')?.click();
        container.querySelector('#auth-email').value = hint.email;
        container.querySelector('#auth-password').value = hint.password;
        container.querySelector('#auth-form').requestSubmit();
      });
    } catch (e) { /* hint unavailable */ }
  })();

  // Tab switching
  let mode = 'login';
  const regFields = container.querySelector('#reg-fields');
  container.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.tab;
      container.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.toggle('active', t === tab);
        t.style.background = t === tab ? 'var(--md-sys-color-primary)' : 'transparent';
        t.style.color = t === tab ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)';
      });
      container.querySelector('#auth-submit-text').textContent = mode === 'login' ? 'Sign In' : 'Create Account';
      container.querySelector('#auth-password').setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password');
      // Show/hide register-only fields
      regFields.style.display = mode === 'register' ? 'flex' : 'none';
      // First name required on register
      container.querySelector('#auth-firstname').required = mode === 'register';
    });
  });

  // Form submission
  container.querySelector('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email     = container.querySelector('#auth-email').value.trim();
    const password  = container.querySelector('#auth-password').value;
    const errEl     = container.querySelector('#auth-error');
    const btn       = container.querySelector('#auth-submit');
    const spinner   = container.querySelector('#auth-spinner');
    const submitText = container.querySelector('#auth-submit-text');

    errEl.style.display = 'none';
    btn.disabled = true;
    submitText.style.display = 'none';
    spinner.style.display = 'block';

    let payload = { email, password };
    if (mode === 'register') {
      const firstName  = container.querySelector('#auth-firstname').value.trim();
      const lastName   = container.querySelector('#auth-lastname').value.trim();
      const username   = container.querySelector('#auth-username').value.trim();
      const profession = container.querySelector('#auth-profession').value;
      const country    = container.querySelector('#auth-country').value;

      if (!firstName) {
        errEl.textContent = 'First name is required';
        errEl.style.display = 'block';
        btn.disabled = false;
        submitText.style.display = 'inline';
        spinner.style.display = 'none';
        return;
      }
      payload = { ...payload, firstName, lastName, username, profession, country };
    }

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const result = await api.post(endpoint, payload);

    btn.disabled = false;
    submitText.style.display = 'inline';
    spinner.style.display = 'none';

    if (result.error) {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
      return;
    }

    // Success
    api.setToken(result.token, result.refreshToken);
    api.setUser(result.user);
    window.dispatchEvent(new CustomEvent('rementally-auth-success', { detail: { user: result.user } }));
  });

  return container;
}
