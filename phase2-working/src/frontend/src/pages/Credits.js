import api from '../lib/api.js';

export function Credits() {
  const container = document.createElement('div');
  const user = api.getUser() || {};
  const currentTier = user.tier || 'free';

  container.innerHTML = `
    <div class="page-shell">
      <!-- Header -->
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div class="mono-label" style="margin-bottom:0.5rem;color:var(--md-sys-color-primary);">SUBSCRIPTION</div>
        <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0 0 0.25rem;">Credits &amp; Tiers</h1>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          Choose the plan that fits your workflow. All plans include full cognitive features.
        </p>
      </div>

      <!-- Current Usage Strip -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:1.5rem;">
        <div class="surface-card card-reveal" style="padding:1.25rem 1.5rem;">
          <div class="mono-label" style="color:var(--md-sys-color-outline);">CURRENT PLAN</div>
          <div id="current-tier" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-primary);margin-top:0.25rem;">${currentTier.toUpperCase()}</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem 1.5rem;">
          <div class="mono-label" style="color:var(--md-sys-color-outline);">RUNS TODAY</div>
          <div style="display:flex;align-items:baseline;gap:0.5rem;margin-top:0.25rem;">
            <span id="runs-used" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-secondary);">—</span>
            <span id="runs-limit" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);"></span>
          </div>
          <div class="progress-bar" style="margin-top:0.5rem;height:4px;">
            <div class="progress-fill" id="runs-bar" style="width:0%;"></div>
          </div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem 1.5rem;">
          <div class="mono-label" style="color:var(--md-sys-color-outline);">CREDIT BALANCE</div>
          <div id="credit-balance" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-tertiary);margin-top:0.25rem;">—</div>
        </div>
      </div>

      <!-- Tier Cards -->
      <h2 style="font:var(--md-sys-typescale-title-large);margin-top:2.5rem;margin-bottom:1rem;">Choose Your Plan</h2>
      <div class="bento-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;">

        <!-- Free Tier -->
        <div class="surface-card card-reveal" style="padding:2rem;${currentTier === 'free' ? 'border-color:rgba(255,69,0,0.5);box-shadow:0 0 20px rgba(255,69,0,0.08);' : ''}">
          ${currentTier === 'free' ? '<div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">● CURRENT PLAN</div>' : ''}
          <h3 style="font:var(--md-sys-typescale-title-large);margin:0 0 0.25rem;">Free</h3>
          <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0 0 1rem;">Get started with your own API keys</p>
          <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-on-surface);">$0<span style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-outline);">/month</span></div>
          <ul style="list-style:none;padding:0;margin:1.25rem 0;display:flex;flex-direction:column;gap:0.6rem;">
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>10 runs/day
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Your own API keys (required)
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Basic memory graph
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>All cognitive features
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Push notifications
            </li>
          </ul>
          ${currentTier !== 'free' ? '<button class="btn-m3 btn-outlined" style="width:100%;" onclick="switchTier(\'free\')">Switch to Free</button>' : '<button class="btn-m3 btn-outlined" style="width:100%;opacity:0.5;" disabled>Current Plan</button>'}
        </div>

        <!-- Pro Tier -->
        <div class="surface-card card-reveal" style="padding:2rem;position:relative;overflow:hidden;${currentTier === 'pro' ? 'border-color:rgba(255,69,0,0.5);box-shadow:0 0 30px rgba(255,69,0,0.12);' : ''}">
          <div style="position:absolute;top:0;right:0;background:var(--md-sys-color-primary);color:#fff;font:var(--md-sys-typescale-label-small);padding:4px 14px;border-radius:0 0 0 var(--md-sys-shape-small);letter-spacing:0.08em;">BEST VALUE</div>
          ${currentTier === 'pro' ? '<div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">● CURRENT PLAN</div>' : ''}
          <h3 style="font:var(--md-sys-typescale-title-large);margin:0 0 0.25rem;">Pro</h3>
          <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0 0 1rem;">Power users who need more runs</p>
          <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-on-surface);">$5<span style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-outline);">/month</span></div>
          <ul style="list-style:none;padding:0;margin:1.25rem 0;display:flex;flex-direction:column;gap:0.6rem;">
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>500 runs/day
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Your own API keys
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Full memory graph
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Live web search (Tavily/Firecrawl)
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>All cognitive features
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Priority support
            </li>
          </ul>
          ${currentTier !== 'pro' ? '<button class="btn-m3 btn-filled" style="width:100%;" onclick="subscribePro()">Upgrade to Pro</button>' : '<button class="btn-m3 btn-filled" style="width:100%;opacity:0.6;" disabled>Current Plan</button>'}
        </div>

        <!-- Managed Tier (Coming Soon) -->
        <div class="surface-card card-reveal" style="padding:2rem;opacity:0.85;">
          <div class="mono-label" style="color:var(--md-sys-color-tertiary);margin-bottom:0.5rem;">COMING SOON</div>
          <h3 style="font:var(--md-sys-typescale-title-large);margin:0 0 0.25rem;">Managed</h3>
          <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0 0 1rem;">No API keys needed — we handle everything</p>
          <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-on-surface);">TBD</div>
          <ul style="list-style:none;padding:0;margin:1.25rem 0;display:flex;flex-direction:column;gap:0.6rem;">
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-tertiary);">check</span>Unlimited runs
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-tertiary);">check</span>No API keys needed
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-tertiary);">check</span>Managed LLM infrastructure
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-tertiary);">check</span>Custom routing
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-tertiary);">check</span>SLA guarantee
            </li>
          </ul>
          <div id="waitlist-section">
            <div style="display:flex;gap:0.5rem;">
              <input type="email" id="waitlist-email" placeholder="your@email.com" style="flex:1;padding:0.6rem 1rem;background:rgba(255,255,255,0.05);border:1px solid var(--md-sys-color-outline-variant);border-radius:var(--md-sys-shape-small);color:var(--md-sys-color-on-surface);font:var(--md-sys-typescale-body-medium);outline:none;" />
              <button class="btn-m3 btn-outlined" id="btn-waitlist" style="white-space:nowrap;">Join Waitlist</button>
            </div>
            <div id="waitlist-status" style="margin-top:0.5rem;"></div>
          </div>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:2rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">Transaction History</h2>
        <div id="tx-history" style="display:flex;flex-direction:column;gap:0.5rem;">
          <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Loading...</p>
        </div>
      </div>
    </div>`;

  // Waitlist signup
  const btnWaitlist = container.querySelector('#btn-waitlist');
  if (btnWaitlist) {
    btnWaitlist.addEventListener('click', async () => {
      const email = container.querySelector('#waitlist-email')?.value?.trim();
      const status = container.querySelector('#waitlist-status');
      if (!email || !email.includes('@')) {
        status.innerHTML = '<p style="color:var(--md-sys-color-error);font:var(--md-sys-typescale-body-small);">Please enter a valid email.</p>';
        return;
      }
      btnWaitlist.disabled = true;
      btnWaitlist.textContent = 'Joining...';
      const result = await api.post('/billing/waitlist', { email });
      if (result.error) {
        status.innerHTML = `<p style="color:var(--md-sys-color-error);font:var(--md-sys-typescale-body-small);">${result.error}</p>`;
        btnWaitlist.disabled = false;
        btnWaitlist.textContent = 'Join Waitlist';
      } else {
        status.innerHTML = '<p style="color:var(--color-success);font:var(--md-sys-typescale-body-small);">You\'re on the list! We\'ll notify you when Managed is ready.</p>';
        container.querySelector('#waitlist-email').value = '';
        btnWaitlist.textContent = 'Joined ✓';
      }
    });
  }

  // Load data
  async function loadData() {
    const me = await api.get('/auth/me');
    if (me.id) {
      const tier = me.tier || 'free';
      container.querySelector('#current-tier').textContent = tier.toUpperCase();
      container.querySelector('#runs-used').textContent = `${me.daily_runs_used || 0}`;
      const limit = tier === 'pro' ? 500 : 10;
      container.querySelector('#runs-limit').textContent = `/ ${limit} runs`;
      const pct = Math.min(100, ((me.daily_runs_used || 0) / limit) * 100);
      const bar = container.querySelector('#runs-bar');
      if (bar) bar.style.width = `${pct}%`;
      container.querySelector('#credit-balance').textContent = `${me.credits || 0}`;
    }

    // Load transaction history
    const txEl = container.querySelector('#tx-history');
    try {
      const tx = await api.get('/billing/transactions');
      if (tx.length === 0) {
        txEl.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No transactions yet.</p>';
      } else {
        txEl.innerHTML = tx.slice(0, 20).map(t => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
            <div>
              <div style="font:var(--md-sys-typescale-body-medium);">${t.type || 'transaction'}</div>
              <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${new Date(t.created_at).toLocaleDateString()}</div>
            </div>
            <div style="font:var(--md-sys-typescale-body-medium);color:${t.amount > 0 ? 'var(--color-success)' : 'var(--md-sys-color-error)'};">
              ${t.amount > 0 ? '+' : ''}${t.amount} credits
            </div>
          </div>
        `).join('');
      }
    } catch {
      txEl.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No transactions yet.</p>';
    }
  }

  loadData();

  // Expose global functions for onclick handlers
  window.subscribePro = async () => {
    const result = await api.post('/billing/subscribe', { tier: 'pro' });
    if (result.error) {
      alert(result.error);
      return;
    }
    alert('Upgraded to Pro! Refreshing...');
    const me = await api.get('/auth/me');
    if (me.id) api.setUser(me);
    window.showPage?.('credits');
  };

  window.switchTier = async (tier) => {
    if (!confirm(`Switch to ${tier.toUpperCase()} plan?`)) return;
    const result = await api.post('/billing/subscribe', { tier });
    if (result.error) {
      alert(result.error);
      return;
    }
    const me = await api.get('/auth/me');
    if (me.id) api.setUser(me);
    window.showPage?.('credits');
  };

  return container;
}
