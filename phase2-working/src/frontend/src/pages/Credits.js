// Credits & Tiers - Razorpay checkout + subscription management
import api from '../lib/api.js';

export function Credits() {
  const container = document.createElement('div');
  const user = api.getUser() || {};

  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-tertiary);font-size:28px;">payments</span>
          <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0;">Credits & Tiers</h1>
        </div>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          Manage your subscription, purchase extra runs, and track usage.
        </p>
      </div>

      <!-- Current Plan -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-top:1.5rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Current Plan</div>
          <div id="current-tier" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-primary);margin-top:0.25rem;">${(user.tier || 'free').toUpperCase()}</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Runs Today</div>
          <div id="runs-used" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-tertiary);margin-top:0.25rem;">—</div>
          <div id="runs-limit" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);"></div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Credit Balance</div>
          <div id="credit-balance" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-secondary);margin-top:0.25rem;">—</div>
        </div>
      </div>

      <!-- Tier Cards -->
      <h2 style="font:var(--md-sys-typescale-title-large);margin-top:2rem;margin-bottom:1rem;">Choose Your Plan</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;">

        <!-- Free -->
        <div class="surface-card card-reveal" style="padding:1.5rem;${user.tier === 'free' ? 'border:1px solid var(--md-sys-color-primary);' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="font:var(--md-sys-typescale-title-large);margin:0;">Free</h3>
            ${user.tier === 'free' ? '<span class="chip-m3 active" style="pointer-events:none;">Current</span>' : ''}
          </div>
          <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-on-surface);">$0<span style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-outline);">/month</span></div>
          <ul style="list-style:none;padding:0;margin:1rem 0;display:flex;flex-direction:column;gap:0.5rem;">
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>10 runs/day
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Shared API keys
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Basic memory graph
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-outline);">
              <span class="material-symbols-rounded" style="font-size:18px;">close</span>BYO keys
            </li>
          </ul>
        </div>

        <!-- Premium -->
        <div class="surface-card card-reveal" style="padding:1.5rem;position:relative;overflow:hidden;${user.tier === 'premium' ? 'border:1px solid var(--md-sys-color-primary);' : ''}">
          <div style="position:absolute;top:0;right:0;background:var(--md-sys-color-primary);color:var(--md-sys-color-on-primary);font:var(--md-sys-typescale-label-small);padding:4px 12px;border-radius:0 0 0 var(--md-sys-shape-small);">BEST VALUE</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="font:var(--md-sys-typescale-title-large);margin:0;">Premium</h3>
            ${user.tier === 'premium' ? '<span class="chip-m3 active" style="pointer-events:none;">Current</span>' : ''}
          </div>
          <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-on-surface);">$5<span style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-outline);">/month</span></div>
          <ul style="list-style:none;padding:0;margin:1rem 0;display:flex;flex-direction:column;gap:0.5rem;">
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>500 runs/day
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>BYO API keys
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>All cognitive features
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Channel delivery
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Buy extra runs ($1=50)
            </li>
          </ul>
          ${user.tier !== 'premium' ? '<button class="btn-m3 btn-filled" style="width:100%;" onclick="subscribePremium()">Upgrade to Premium</button>' : ''}
        </div>

        <!-- Enterprise -->
        <div class="surface-card card-reveal" style="padding:1.5rem;opacity:0.85;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="font:var(--md-sys-typescale-title-large);margin:0;">Enterprise</h3>
            <span class="chip-m3" style="pointer-events:none;background:var(--md-sys-color-tertiary);color:var(--md-sys-color-on-tertiary);">COMING SOON</span>
          </div>
          <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-on-surface);">Custom</div>
          <ul style="list-style:none;padding:0;margin:1rem 0;display:flex;flex-direction:column;gap:0.5rem;">
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Unlimited runs
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Custom infra
            </li>
            <li style="display:flex;align-items:center;gap:0.5rem;font:var(--md-sys-typescale-body-medium);">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);">check</span>Managed support
            </li>
          </ul>
          <button class="btn-m3 btn-outlined" style="width:100%;" disabled>Join Waitlist</button>
        </div>
      </div>

      <!-- Extra Runs Purchase -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:2rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">Buy Extra Runs</h2>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0 0 1.5rem;">
          $1 = 50 additional runs. Available for Premium users.
        </p>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.5rem;">
          <button class="chip-m3 run-pkg active" data-runs="50" data-price="1">50 runs ($1)</button>
          <button class="chip-m3 run-pkg" data-runs="250" data-price="5">250 runs ($5)</button>
          <button class="chip-m3 run-pkg" data-runs="500" data-price="10">500 runs ($10)</button>
          <button class="chip-m3 run-pkg" data-runs="2500" data-price="50">2500 runs ($50)</button>
        </div>
        <button class="btn-m3 btn-filled" id="btn-buy-runs" style="min-width:200px;">
          <span class="material-symbols-rounded" style="font-size:18px;">shopping_cart</span>
          <span id="buy-label">Buy 50 runs for $1</span>
        </button>
        <div id="purchase-status" style="margin-top:1rem;"></div>
      </div>

      <!-- Transaction History -->
      <div class="surface-card card-reveal" style="padding:2rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-large);margin:0 0 1rem;">Transaction History</h2>
        <div id="tx-history" style="display:flex;flex-direction:column;gap:0.5rem;">
          <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Loading...</p>
        </div>
      </div>
    </div>`;

  let selectedRuns = 50;
  let selectedPrice = 1;

  // Run package selection
  container.querySelectorAll('.run-pkg').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedRuns = parseInt(chip.dataset.runs);
      selectedPrice = parseInt(chip.dataset.price);
      container.querySelectorAll('.run-pkg').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      container.querySelector('#buy-label').textContent = `Buy ${selectedRuns} runs for $${selectedPrice}`;
    });
  });

  // Buy runs button
  container.querySelector('#btn-buy-runs').addEventListener('click', async () => {
    const result = await api.post('/billing/create-order', {
      amount: selectedPrice,
      currency: 'USD',
      type: 'credit_purchase',
      runs: selectedRuns,
    });

    const status = container.querySelector('#purchase-status');
    if (result.error) {
      status.innerHTML = `<p style="color:var(--md-sys-color-error);font:var(--md-sys-typescale-body-small);">${result.error}</p>`;
      return;
    }

    if (result.orderId) {
      status.innerHTML = `<p style="color:var(--color-success);font:var(--md-sys-typescale-body-small);">
        Order created (${result.orderId}). Razorpay checkout would open here in production.
      </p>`;
    }
  });

  // Load data
  async function loadData() {
    const me = await api.get('/auth/me');
    if (me.id) {
      container.querySelector('#current-tier').textContent = (me.tier || 'free').toUpperCase();
      container.querySelector('#runs-used').textContent = `${me.daily_runs_used || 0}`;
      const limit = me.tier === 'premium' ? 500 : 10;
      container.querySelector('#runs-limit').textContent = `of ${limit} daily runs`;
      container.querySelector('#credit-balance').textContent = `${me.total_credits || 0}`;
    }

    // Load tiers info
    const tiers = await api.get('/billing/tiers');
    if (!tiers.error) {
      // Tiers data available
    }

    // Transaction history
    const txEl = container.querySelector('#tx-history');
    txEl.innerHTML = `<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No transactions yet. Purchase runs or upgrade to see history.</p>`;
  }

  // Global subscribe handler
  window.subscribePremium = async () => {
    const result = await api.post('/billing/create-order', {
      amount: 5,
      currency: 'USD',
      type: 'subscription',
      plan: 'premium',
    });
    if (result.error) {
      alert(result.error);
    } else {
      alert(`Subscription order created. Razorpay checkout would open here.`);
    }
  };

  loadData();
  return container;
}
