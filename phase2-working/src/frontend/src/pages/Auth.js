// Auth Page - Login / Register with M3 design
import api from '../lib/api.js';

export function Auth() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:70vh;">
      <div class="glass-strong" style="width:100%;max-width:440px;border-radius:var(--md-sys-shape-extra-large);padding:2.5rem;">
        <div style="text-align:center;margin-bottom:2rem;">
          <h1 style="font:var(--md-sys-typescale-headline-small);margin-bottom:0.5rem;">Welcome to Thought GPS</h1>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">Your cognitive coprocessor for navigating thoughts</p>
        </div>

        <div id="auth-tabs" style="display:flex;background:var(--md-sys-color-surface-container);border-radius:var(--md-sys-shape-full);padding:4px;margin-bottom:1.5rem;">
          <button class="auth-tab active" data-tab="login" style="flex:1;padding:0.6rem;border:none;border-radius:var(--md-sys-shape-full);cursor:pointer;font:var(--md-sys-typescale-label-large);background:var(--md-sys-color-primary);color:var(--md-sys-color-on-primary);">Sign In</button>
          <button class="auth-tab" data-tab="register" style="flex:1;padding:0.6rem;border:none;border-radius:var(--md-sys-shape-full);cursor:pointer;font:var(--md-sys-typescale-label-large);background:transparent;color:var(--md-sys-color-on-surface-variant);">Register</button>
        </div>

        <form id="auth-form" style="display:flex;flex-direction:column;gap:1rem;">
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

  // Local admin hint — shown only on dev/network instances where the server
  // seeds an admin account (production returns { available: false }).
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
    } catch (e) { /* hint unavailable — ignore */ }
  })();

  // Tab switching
  let mode = 'login';
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
    });
  });

  // Form submission
  container.querySelector('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#auth-email').value.trim();
    const password = container.querySelector('#auth-password').value;
    const errEl = container.querySelector('#auth-error');
    const btn = container.querySelector('#auth-submit');
    const spinner = container.querySelector('#auth-spinner');
    const submitText = container.querySelector('#auth-submit-text');

    errEl.style.display = 'none';
    btn.disabled = true;
    submitText.style.display = 'none';
    spinner.style.display = 'block';

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const result = await api.post(endpoint, { email, password });

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
    window.dispatchEvent(new CustomEvent('tg-auth-success', { detail: { user: result.user } }));
  });

  return container;
}
