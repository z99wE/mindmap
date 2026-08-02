// Dashboard - Real stats from backend
import api from '../lib/api.js';

export function Dashboard() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-container">
      <h1 class="card-reveal" style="font:var(--md-sys-typescale-headline-medium);margin-bottom:1.5rem;">Dashboard</h1>
      <div class="grid-stats card-reveal" id="dash-stats">
        <div class="stat-card"><div class="anim-shimmer" style="height:60px;"></div></div>
        <div class="stat-card"><div class="anim-shimmer" style="height:60px;"></div></div>
        <div class="stat-card"><div class="anim-shimmer" style="height:60px;"></div></div>
        <div class="stat-card"><div class="anim-shimmer" style="height:60px;"></div></div>
      </div>
      <div class="grid-cards" style="margin-top:1.5rem;">
        <div class="surface-card card-reveal">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Run Usage</h3>
          <div id="run-gauge"><div class="progress-bar"><span style="width:0%"></span></div></div>
          <p id="run-text" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.5rem;">Loading...</p>
        </div>
        <div class="surface-card card-reveal">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Memory Growth</h3>
          <div id="mem-chart" style="display:flex;gap:0.5rem;flex-wrap:wrap;"></div>
        </div>
      </div>
    </div>`;

  loadDashboard(container);
  return container;
}

async function loadDashboard(c) {
  const [billing, memStats, cogData] = await Promise.all([
    api.get('/billing/status'),
    api.get('/memory/stats'),
    api.get('/features/cognitive-load'),
  ]);

  const statsEl = c.querySelector('#dash-stats');
  if (!billing.error) {
    statsEl.innerHTML = `
      <div class="stat-card"><div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);text-transform:uppercase;">Tier</div>
        <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-primary);">${billing.tier}</div></div>
      <div class="stat-card"><div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);text-transform:uppercase;">Runs Left</div>
        <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-secondary);">${billing.dailyRunsRemaining}</div></div>
      <div class="stat-card"><div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);text-transform:uppercase;">Credits</div>
        <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-tertiary);">${billing.totalCredits}</div></div>
      <div class="stat-card"><div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);text-transform:uppercase;">Memories</div>
        <div style="font:var(--md-sys-typescale-headline-small);color:var(--color-emotional);">${memStats.total || 0}</div></div>`;

    const pct = billing.dailyRunsLimit > 0 ? Math.round(billing.dailyRunsUsed / billing.dailyRunsLimit * 100) : 0;
    c.querySelector('#run-gauge').innerHTML = `<div class="progress-bar"><span style="width:${pct}%"></span></div>`;
    c.querySelector('#run-text').textContent = `${billing.dailyRunsUsed} / ${billing.dailyRunsLimit} runs used today`;
  }

  if (!memStats.error && memStats.byCategory?.length > 0) {
    c.querySelector('#mem-chart').innerHTML = memStats.byCategory.slice(0, 8).map(cat => {
      const pct = memStats.total > 0 ? Math.round(cat.count / memStats.total * 100) : 0;
      return `<div style="flex:1;min-width:80px;">
        <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);margin-bottom:0.25rem;">${cat.category}</div>
        <div class="progress-bar"><span style="width:${pct}%"></span></div>
        <div style="font:var(--md-sys-typescale-label-small);text-align:center;margin-top:0.15rem;">${cat.count}</div>
      </div>`;
    }).join('');
  }
}
