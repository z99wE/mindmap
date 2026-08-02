// Dashboard - Real stats from backend with Obsidian/Orange-Red design
import api from '../lib/api.js';

export function Dashboard() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">OVERVIEW</div>
        <h1 style="font:700 2rem/1.1 'Space Grotesk',system-ui;letter-spacing:-0.06em;margin:0;">Dashboard</h1>
      </div>

      <!-- Stat Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:1.5rem;" id="dash-stats">
        <div class="surface-card card-reveal" style="padding:1.25rem;"><div class="anim-shimmer" style="height:60px;"></div></div>
        <div class="surface-card card-reveal" style="padding:1.25rem;"><div class="anim-shimmer" style="height:60px;"></div></div>
        <div class="surface-card card-reveal" style="padding:1.25rem;"><div class="anim-shimmer" style="height:60px;"></div></div>
        <div class="surface-card card-reveal" style="padding:1.25rem;"><div class="anim-shimmer" style="height:60px;"></div></div>
      </div>

      <!-- Run Usage + Cognitive Load -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1.5rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Run Usage</h3>
          <div id="run-gauge"><div class="progress-bar"><span style="width:0%"></span></div></div>
          <p id="run-text" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.5rem;">Loading...</p>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Cognitive Load</h3>
          <div id="cog-load" style="display:flex;flex-direction:column;gap:0.5rem;">
            <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Loading...</p>
          </div>
        </div>
      </div>

      <!-- Memory Growth + 14-Day Trend -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Memory by Category</h3>
          <div id="mem-chart" style="display:flex;flex-direction:column;gap:0.5rem;">
            <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Loading...</p>
          </div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">14-Day Activity</h3>
          <div id="trend-chart" style="min-height:100px;">
            <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Loading...</p>
          </div>
        </div>
      </div>

      <!-- Predictive Intelligence & Agent Swarm -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;border:1px solid rgba(204,255,0,0.15);">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;color:var(--md-sys-color-primary);">
            <span class="material-symbols-rounded">psychology</span>
            ADHD Predictive Insight
          </h3>
          <div id="predictive-insight-card" style="display:flex;flex-direction:column;gap:0.75rem;">
            <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Analyzing cognitive patterns...</p>
          </div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;background:#000000;border:1px solid rgba(163,230,53,0.15);">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;color:var(--md-sys-color-secondary);">
            <span class="material-symbols-rounded">terminal</span>
            Swarm Co-Processor Feed
          </h3>
          <div id="swarm-feed" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#a3e635;height:120px;overflow-y:auto;line-height:1.5;display:flex;flex-direction:column;gap:4px;">
            <div style="color:var(--md-sys-color-outline)">[System] Initializing Swarm Co-Processors...</div>
          </div>
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

  // Stat cards
  const statsEl = c.querySelector('#dash-stats');
  if (!billing.error) {
    const tierLabel = (billing.tier || 'free').charAt(0).toUpperCase() + (billing.tier || 'free').slice(1);
    statsEl.innerHTML = `
      <div class="surface-card" style="padding:1.25rem;border-left:3px solid var(--md-sys-color-primary);">
        <div class="mono-label" style="color:var(--md-sys-color-outline);font-size:10px;text-transform:uppercase;margin-bottom:0.35rem;">Plan</div>
        <div style="font:700 1.5rem/1 'Space Grotesk',system-ui;color:var(--md-sys-color-primary);">${tierLabel}</div>
      </div>
      <div class="surface-card" style="padding:1.25rem;border-left:3px solid var(--md-sys-color-secondary);">
        <div class="mono-label" style="color:var(--md-sys-color-outline);font-size:10px;text-transform:uppercase;margin-bottom:0.35rem;">Runs Left</div>
        <div style="font:700 1.5rem/1 'Space Grotesk',system-ui;color:var(--md-sys-color-secondary);">${billing.dailyRunsRemaining ?? 0}</div>
      </div>
      <div class="surface-card" style="padding:1.25rem;border-left:3px solid #10b981;">
        <div class="mono-label" style="color:var(--md-sys-color-outline);font-size:10px;text-transform:uppercase;margin-bottom:0.35rem;">Credits</div>
        <div style="font:700 1.5rem/1 'Space Grotesk',system-ui;color:#10b981;">${billing.totalCredits ?? 0}</div>
      </div>
      <div class="surface-card" style="padding:1.25rem;border-left:3px solid #a3e635;">
        <div class="mono-label" style="color:var(--md-sys-color-outline);font-size:10px;text-transform:uppercase;margin-bottom:0.35rem;">Memories</div>
        <div style="font:700 1.5rem/1 'Space Grotesk',system-ui;color:#a3e635;">${memStats.total || 0}</div>
      </div>`;

    // Run gauge
    const pct = billing.dailyRunsLimit > 0 ? Math.round(billing.dailyRunsUsed / billing.dailyRunsLimit * 100) : 0;
    c.querySelector('#run-gauge').innerHTML = `
      <div style="position:relative;height:8px;border-radius:4px;background:var(--md-sys-color-surface-container-highest);overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:var(--md-sys-color-primary);border-radius:4px;transition:width 0.5s ease;"></div>
      </div>`;
    c.querySelector('#run-text').textContent = `${billing.dailyRunsUsed || 0} / ${billing.dailyRunsLimit || 0} runs used today`;
  } else {
    statsEl.innerHTML = '<div class="surface-card" style="padding:1.25rem;color:var(--md-sys-color-error);grid-column:1/-1;">Unable to load billing status.</div>';
  }

  // Cognitive Load
  if (!cogData.error && cogData.distribution?.length > 0) {
    const loadColors = { critical: '#f44336', high: '#ff9800', medium: '#ccff00', low: '#10b981' };
    c.querySelector('#cog-load').innerHTML = cogData.distribution.map(d => `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
          <span class="mono-label" style="font-size:10px;text-transform:uppercase;color:var(--md-sys-color-on-surface-variant);">${d.type}</span>
          <span class="mono-label" style="font-size:10px;color:${loadColors[d.type] || 'var(--md-sys-color-outline)'};">${d.percentage}%</span>
        </div>
        <div style="height:4px;border-radius:2px;background:var(--md-sys-color-surface-container-highest);overflow:hidden;">
          <div style="height:100%;width:${d.percentage}%;background:${loadColors[d.type] || 'var(--md-sys-color-primary)'};border-radius:2px;"></div>
        </div>
      </div>
    `).join('');

    // Trend chart
    if (cogData.trend?.length > 0) {
      const dates = [...new Set(cogData.trend.map(t => t.date))].sort();
      const maxCount = Math.max(...dates.map(d => cogData.trend.filter(t => t.date === d).reduce((s, t) => s + t.count, 0)), 1);
      c.querySelector('#trend-chart').innerHTML = `
        <div style="display:flex;align-items:flex-end;gap:4px;height:100px;">
          ${dates.map(d => {
            const dayCount = cogData.trend.filter(t => t.date === d).reduce((s, t) => s + t.count, 0);
            const h = Math.max(2, (dayCount / maxCount) * 80);
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;">
              <div style="width:100%;height:${h}px;background:var(--md-sys-color-primary);border-radius:2px 2px 0 0;opacity:0.8;"></div>
              <span style="font:8px var(--font-mono),monospace;color:var(--md-sys-color-outline);margin-top:2px;">${d.slice(5)}</span>
            </div>`;
          }).join('')}
        </div>`;
    } else {
      c.querySelector('#trend-chart').innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No activity in the last 14 days.</p>';
    }
  }

  // Memory by category
  let topCategory = 'Uncategorized';
  if (!memStats.error && memStats.byCategory?.length > 0) {
    // Sort to find top category
    const sorted = [...memStats.byCategory].sort((a, b) => b.count - a.count);
    if (sorted[0]) topCategory = sorted[0].category;

    c.querySelector('#mem-chart').innerHTML = memStats.byCategory.slice(0, 8).map(cat => {
      const pct = memStats.total > 0 ? Math.round(cat.count / memStats.total * 100) : 0;
      return `<div>
        <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
          <span style="font:var(--md-sys-typescale-label-small);text-transform:capitalize;">${cat.category}</span>
          <span class="mono-label" style="font-size:10px;color:var(--md-sys-color-primary);">${cat.count}</span>
        </div>
        <div style="height:4px;border-radius:2px;background:var(--md-sys-color-surface-container-highest);overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:var(--md-sys-color-primary);border-radius:2px;"></div>
        </div>
      </div>`;
    }).join('');
  } else if (!memStats.error) {
    c.querySelector('#mem-chart').innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No memories yet.</p>';
  }

  // Load Predictive ADHD insights
  const predCard = c.querySelector('#predictive-insight-card');
  if (predCard) {
    const criticalCount = (cogData.distribution || []).find(d => d.type === 'critical')?.count || 0;
    const highCount = (cogData.distribution || []).find(d => d.type === 'high')?.count || 0;
    const isHighRisk = (criticalCount + highCount) > 2;

    predCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:12px;color:var(--md-sys-color-outline);">Burnout Risk Level</span>
        <span class="classification-chip ${isHighRisk ? 'critical' : 'low'}" style="font-size:10px;">${isHighRisk ? 'HIGH RISK' : 'LOW RISK'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:12px;color:var(--md-sys-color-outline);">Hyperfixation Target</span>
        <span style="font-size:12px;font-weight:bold;color:var(--md-sys-color-primary);">${topCategory.toUpperCase()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:12px;color:var(--md-sys-color-outline);">Task Drift Prediction</span>
        <span style="font-size:12px;color:#ff9800;font-weight:bold;">${isHighRisk ? '+28% (Severe)' : 'Stable'}</span>
      </div>
      <p style="font-size:11px;line-height:1.4;margin-top:0.5rem;color:var(--md-sys-color-on-surface-variant);background:rgba(204,255,0,0.03);padding:0.5rem;border-radius:4px;border:1px dashed rgba(204,255,0,0.15);">
        <strong>Futurism Trend:</strong> ${isHighRisk 
          ? 'Critical load detected. Congestion spikes predicted for Tuesday. We suggest immediate task pruning or witness escalation.' 
          : 'Cognitive bandwidth is optimal. Your mental drift pattern is balanced. Keep capturing thoughts to maintain clarity.'}
      </p>
    `;
  }

  // Load Swarm feed simulator
  const swarmFeed = c.querySelector('#swarm-feed');
  if (swarmFeed) {
    const agents = ['Hermes-1', 'NanoClaw-4', 'OpenClaw-2', 'Hermes-3', 'NanoClaw-2'];
    const logs = [
      'Scanning unanchored commitments...',
      'Memory drift score updated to 0.18',
      'Archived 3 unfulfilled expired thoughts.',
      'Analyzing week-over-week regret themes.',
      'Co-processing location stagnation triggers.',
      'Checking geofence home-exit thresholds.',
      'Purging 15-day free storage segment...',
      'Validating witness escalation triggers...'
    ];

    const intervalId = setInterval(() => {
      // Don't log if page was switched away and container unmounted
      if (!document.body.contains(swarmFeed)) {
        clearInterval(intervalId);
        return;
      }
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const log = logs[Math.floor(Math.random() * logs.length)];
      const timestamp = new Date().toLocaleTimeString();
      const div = document.createElement('div');
      div.innerHTML = `<span style="color:var(--md-sys-color-outline)">[${timestamp}]</span> <span style="color:var(--md-sys-color-primary)">[${agent}]</span> ${log}`;
      swarmFeed.appendChild(div);
      if (swarmFeed.childNodes.length > 25) {
        swarmFeed.removeChild(swarmFeed.firstChild);
      }
      swarmFeed.scrollTop = swarmFeed.scrollHeight;
    }, 4000);
  }
}
