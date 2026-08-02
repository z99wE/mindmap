// Auth Page - Login / Register with M3 design
import api from '../lib/api.js';

export function Auth() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:70vh;">
      <div class="glass-strong" style="width:100%;max-width:440px;border-radius:var(--md-sys-shape-extra-large);padding:2.5rem;">
        <div style="text-align:center;margin-bottom:2rem;">
          <div style="width:56px;height:56px;border-radius:var(--md-sys-shape-large);background:linear-gradient(135deg,var(--md-sys-color-primary-container),var(--md-sys-color-secondary-container));display:inline-grid;place-items:center;margin-bottom:1rem;">
            <span class="material-symbols-rounded" style="font-size:28px;color:#fff;">explore</span>
          </div>
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

        <p style="text-align:center;margin-top:1.5rem;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">
          Disposable email addresses are not allowed. Use a real email to get started.
        </p>
      </div>
    </div>`;

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
