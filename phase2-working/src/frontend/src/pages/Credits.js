import api from '../lib/api.js';
import { toast } from '../lib/toast.js';

export function Credits() {
  const container = document.createElement('div');
  const user = api.getUser() || {};
  const currentTier = user.tier || 'free';

  container.innerHTML = `
    <div class="page-shell">
      <!-- Header -->
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div class="mono-label" style="margin-bottom:0.5rem;color:var(--md-sys-color-primary);">SUBSCRIPTION</div>
        <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0 0 0.25rem;">Credits &amp; Tiers</h1>          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          ReMentally is free for everyone. Early Adopter spots unlock higher limits and priority access.
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
            <div class="progress-fill" id="runsbar" style="width:0%;"></div>
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
        <div class="surface-card card-reveal" style="padding:2rem;${currentTier === 'free' ? 'border-color:rgba(204,255,0,0.5);box-shadow:0 0 20px rgba(204,255,0,0.08);' : ''}">
          ${currentTier === 'free' ? '<div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">CURRENT PLAN</div>' : ''}
          <h3 style="font:var(--md-sys-typescale-title-large);margin:0 0 0.25rem;">Free</h3>
          <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0 0 1rem;">Get started with local-first storage</p>
          <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-on-surface);">$0<span style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-outline);">/month</span></div>
          <ul style="list-style:none;padding:0;margin:1.25rem 0;display:flex;flex-direction:column;gap:0.6rem;">
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>10 runs/day
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>Your own API keys (required)
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>Basic memory graph
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>15-day server storage vault
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>Local backup &amp; import sync
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>Max 2 connected channels
            </li>
          </ul>
          ${currentTier !== 'free' ? '<button class="btn-m3 btn-outlined" style="width:100%;" onclick="switchTier(\'free\')">Switch to Free</button>' : '<button class="btn-m3 btn-outlined" style="width:100%;opacity:0.5;" disabled>Current Plan</button>'}
        </div>
 
        <!-- Early Adopter Tier -->
        <div class="surface-card card-reveal" style="padding:2rem;position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;right:0;background:var(--md-sys-color-primary);color:#000;font:var(--md-sys-typescale-label-small);padding:4px 14px;border-radius:0 0 0 var(--md-sys-shape-small);letter-spacing:0.08em;">LIMITED SPOTS</div>
          <h3 style="font:var(--md-sys-typescale-title-large);margin:0 0 0.25rem;">Early Adopter</h3>
          <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0 0 1rem;">Higher limits, priority access, all channels</p>
          <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-on-surface);">Waitlist</div>
          <ul style="list-style:none;padding:0;margin:1.25rem 0;display:flex;flex-direction:column;gap:0.6rem;">
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>500 runs/day
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>Shared LLM pool (no keys needed)
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>All 10 integration channels
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>Unlimited server storage
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>Live web search (Tavily/Firecrawl)
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);flex-shrink:0;"></span>Priority support
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

      <!-- Cognitive Navigation Boosters -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:2rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 0.25rem;">Cognitive Navigation Boosters</h2>
        <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);margin:0 0 1.5rem;">
          Ran out of daily Explorer Plus runs? Activate a temporary 15-day booster pack. Limit 3 purchases in any 30-day window. Only available when runs are at least 50% consumed.
        </p>

        <!-- Active Boosters Panel -->
        <div id="active-boosters-status" style="margin-bottom:1.5rem;display:none;padding:1rem;background:rgba(204,255,0,0.05);border:1px solid rgba(204,255,0,0.15);border-radius:var(--md-sys-shape-medium);">
          <div style="font-weight:bold;color:var(--md-sys-color-primary);margin-bottom:0.5rem;display:flex;align-items:center;gap:0.5rem;">
            <span class="material-symbols-rounded" style="font-size:18px;">explore</span>
            Active Boosters
          </div>
          <div id="active-boosters-list" style="display:flex;flex-direction:column;gap:0.5rem;"></div>
        </div>

        <div class="bento-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;">
          <div class="surface-card" style="padding:1.5rem;text-align:center;border:1px solid rgba(255,255,255,0.06);">

            <h4 style="font:var(--md-sys-typescale-title-medium);margin:0;">Compass Pack</h4>
            <div style="font:700 1.25rem/1.5 'Space Grotesk';color:var(--md-sys-color-primary);margin:0.25rem 0;">50 Runs</div>
            <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-bottom:1rem;">$2.00 (Expires in 15d)</p>
            <button class="btn-m3 btn-tonal" style="width:100%;" onclick="buyBooster('compass')">Activate Pack</button>
          </div>
          <div class="surface-card" style="padding:1.5rem;text-align:center;border:1px solid rgba(255,255,255,0.06);">

            <h4 style="font:var(--md-sys-typescale-title-medium);margin:0;">Radar Pack</h4>
            <div style="font:700 1.25rem/1.5 'Space Grotesk';color:var(--md-sys-color-primary);margin:0.25rem 0;">100 Runs</div>
            <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-bottom:1rem;">$4.00 (Expires in 15d)</p>
            <button class="btn-m3 btn-tonal" style="width:100%;" onclick="buyBooster('radar')">Activate Pack</button>
          </div>
          <div class="surface-card" style="padding:1.5rem;text-align:center;border:1px solid rgba(255,255,255,0.06);">

            <h4 style="font:var(--md-sys-typescale-title-medium);margin:0;">Sextant Pack</h4>
            <div style="font:700 1.25rem/1.5 'Space Grotesk';color:var(--md-sys-color-primary);margin:0.25rem 0;">200 Runs</div>
            <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-bottom:1rem;">$7.00 (Expires in 15d)</p>
            <button class="btn-m3 btn-tonal" style="width:100%;" onclick="buyBooster('sextant')">Activate Pack</button>
          </div>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:2rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">Transaction History</h2>
        <div id="tx-history" style="display:flex;flex-direction:column;gap:0.5rem;">
          <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);"><span class="tg-skeleton" style="display:inline-block;width:9rem;vertical-align:middle;"></span></p>
        </div>
      </div>
    </div>`;

  // Waitlist signup (Early Adopter)
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
      const result = await api.post('/billing/waitlist', { email, tier: 'early_adopter' });
      if (result.error) {
        status.innerHTML = `<p style="color:var(--md-sys-color-error);font:var(--md-sys-typescale-body-small);">${result.error}</p>`;
        btnWaitlist.disabled = false;
        btnWaitlist.textContent = 'Join Waitlist';
      } else {
        status.innerHTML = '<p style="color:var(--color-success);font:var(--md-sys-typescale-body-small);">You\'re on the list! We\'ll notify you when Early Adopter spots open.</p>';
        container.querySelector('#waitlist-email').value = '';
        btnWaitlist.textContent = 'Joined';
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
      const bar = container.querySelector('#runsbar');
      if (bar) bar.style.width = `${pct}%`;
      container.querySelector('#credit-balance').textContent = `${me.totalCredits || 0}`;
    }

    // Load active boosters status
    try {
      const bData = await api.get('/billing/boosters');
      const bStatus = container.querySelector('#active-boosters-status');
      const bList = container.querySelector('#active-boosters-list');
      if (bData?.boostersList?.length > 0 && bStatus && bList) {
        bStatus.style.display = 'block';
        bList.innerHTML = bData.boostersList.map(b => {
          const daysLeft = Math.max(0, Math.ceil((new Date(b.expires_at) - new Date()) / (1000 * 60 * 60 * 24)));
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.04);padding-bottom:4px;margin-top:4px;">
              <span><strong>${b.bundle_name}</strong> (${b.total_runs - b.runs_used} / ${b.total_runs} remaining)</span>
              <span style="color:var(--md-sys-color-outline);">Expires in ${daysLeft} days</span>
            </div>`;
        }).join('');
      } else if (bStatus) {
        bStatus.style.display = 'none';
      }
    } catch (e) {
      console.warn('Could not load boosters status:', e);
    }

    // Load transaction history
    const txEl = container.querySelector('#tx-history');
    try {
      const tx = await api.get('/billing/history');
      const txList = tx.transactions || [];
      if (txList.length === 0) {
        txEl.innerHTML = '<div class="tg-state"><div class="tg-state-title">No transactions yet</div><div class="tg-state-body">Credit purchases and usage will be listed here with a running balance.</div></div>';
      } else {
        txEl.innerHTML = txList.slice(0, 20).map(t => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);">
            <div>
              <div style="font:var(--md-sys-typescale-body-medium);text-transform:capitalize;">${t.type || 'transaction'}</div>
              <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${new Date(t.created_at).toLocaleDateString()}</div>
            </div>
            <div style="font:var(--md-sys-typescale-body-medium);color:${(t.runs_credited || t.amount) > 0 ? 'var(--color-success)' : 'var(--md-sys-color-error)'};">
              ${(t.runs_credited || t.amount) > 0 ? '+' : ''}${t.runs_credited || t.amount} runs/credits
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.warn('Could not load transactions:', e);
    }
  }

  loadData();

  // Expose global functions for onclick handlers
  window.buyBooster = async (bundleId) => {
    const result = await api.post('/billing/buy-booster', { bundleId });
    if (result.error) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show(result.message || 'Booster activated successfully!', 'success');
    const me = await api.get('/auth/me');
    if (me.id) api.setUser(me);
    window.showPage?.('credits');
  };

  window.switchTier = async (tier) => {
    if (!confirm(`Switch to ${tier.toUpperCase()} plan?`)) return;
    const result = await api.post('/billing/subscribe', { tier });
    if (result.error) {
      toast.show(result.error, 'error');
      return;
    }
    const me = await api.get('/auth/me');
    if (me.id) api.setUser(me);
    window.showPage?.('credits');
  };

  return container;
}
