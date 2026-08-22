// Predictive Cognitive Load — Standalone dashboard with charts and overload predictions
import api from '../lib/api.js';

const COLORS = {
  low: '#10b981',
  moderate: '#f59e0b',
  high: '#ef4444',
  primary: 'var(--md-sys-color-primary)',
  tertiary: 'var(--md-sys-color-tertiary)',
  outline: 'var(--md-sys-color-outline)',
  surfaceVariant: 'var(--md-sys-color-surface-variant)',
};

function esc(s) {
  return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function PredictiveLoad() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal">
        <span class="material-symbols-rounded" style="color:var(--md-sys-color-tertiary);">psychology</span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">Predictive Load</h1>
      </div>
      <p class="card-reveal" style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin-bottom:1.5rem;">
        ML-based cognitive overload prediction from your behavior patterns.
        No API calls needed — runs entirely on your data.
      </p>

      <!-- Real-Time Score + Forecast Row -->
      <div style="display:grid;grid-template-columns:280px 1fr;gap:1rem;margin-bottom:1rem;" class="card-reveal">
        <div class="surface-card" style="padding:1.5rem;display:flex;flex-direction:column;align-items:center;justify-content:center;" id="rt-gauge">
          <div class="anim-shimmer" style="width:120px;height:120px;border-radius:50%;"></div>
        </div>
        <div class="surface-card" style="padding:1.5rem;" id="forecast-panel">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.75rem;">4-Day Forecast</h3>
          <div class="anim-shimmer" style="height:80px;"></div>
        </div>
      </div>

      <!-- Insights -->
      <div class="surface-card card-reveal" style="padding:1.5rem;margin-bottom:1rem;" id="insights-panel">
        <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.75rem;">
          <span class="material-symbols-rounded" style="font-size:20px;vertical-align:middle;color:var(--md-sys-color-tertiary);">lightbulb</span>
          Insights
        </h3>
        <div id="insights-content"><div class="anim-shimmer" style="height:60px;"></div></div>
      </div>

      <!-- Patterns Row -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1rem;margin-bottom:1rem;" class="card-reveal">
        <div class="surface-card" style="padding:1.5rem;" id="hourly-panel">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.75rem;">Thinking Hours</h3>
          <div id="hourly-chart"><div class="anim-shimmer" style="height:80px;"></div></div>
        </div>
        <div class="surface-card" style="padding:1.5rem;" id="completion-panel">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.75rem;">Completion Rate</h3>
          <div id="completion-chart"><div class="anim-shimmer" style="height:80px;"></div></div>
        </div>
        <div class="surface-card" style="padding:1.5rem;" id="category-panel">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.75rem;">Category Breakdown</h3>
          <div id="category-chart"><div class="anim-shimmer" style="height:80px;"></div></div>
        </div>
      </div>

      <!-- Overdue Items -->
      <div class="surface-card card-reveal" style="padding:1.5rem;" id="overdue-panel">
        <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.75rem;">
          <span class="material-symbols-rounded" style="font-size:20px;vertical-align:middle;color:var(--md-sys-color-error);">warning</span>
          Needs Attention
        </h3>
        <div id="overdue-content"><div class="anim-shimmer" style="height:40px;"></div></div>
      </div>
    </div>`;

  // ── Fetch Data (async, .then pattern) ───────────────────────────────────
  Promise.all([
    api.get('/cognitive/prediction'),
    api.get('/cognitive/realtime'),
  ]).then(([predictionRes, realtimeRes]) => {
    renderGauge(container.querySelector('#rt-gauge'), realtimeRes);
    renderForecast(container.querySelector('#forecast-panel'), predictionRes);
    renderInsights(container.querySelector('#insights-content'), predictionRes);
    renderHourlyHeatmap(container.querySelector('#hourly-chart'), predictionRes);
    renderCompletion(container.querySelector('#completion-chart'), predictionRes);
    renderCategories(container.querySelector('#category-chart'), predictionRes);
    renderOverdue(container.querySelector('#overdue-content'), realtimeRes);
  }).catch(() => {
    // If APIs fail, show empty states
    ['rt-gauge', 'forecast-panel', 'insights-content', 'hourly-chart', 'completion-chart', 'category-chart', 'overdue-content'].forEach(id => {
      const el = container.querySelector(`#${id}`);
      if (el) el.innerHTML = '<div style="padding:0.5rem;color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Unable to load data.</div>';
    });
  });

  return container;
}

// ── Renderers ───────────────────────────────────────────────────────────────

function renderGauge(el, data) {
  if (!data || data.error) {
    el.innerHTML = '<div style="text-align:center;color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No data</div>';
    return;
  }
  const score = data.score || 0;
  const level = data.level || 'low';
  const color = COLORS[level] || COLORS.low;

  el.innerHTML = `
    <div style="position:relative;width:140px;height:140px;">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="58" fill="none" stroke="${COLORS.surfaceVariant}" stroke-width="12" />
        <circle cx="70" cy="70" r="58" fill="none" stroke="${color}" stroke-width="12"
          stroke-dasharray="${score * 3.64} 365"
          stroke-dashoffset="91"
          stroke-linecap="round"
          style="transition: stroke-dasharray 1s ease; filter: drop-shadow(0 0 6px ${color}40);" />
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <span style="font:var(--md-sys-typescale-headline-large);color:${color};line-height:1;">${score}</span>
        <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);text-transform:uppercase;">${level}</span>
      </div>
    </div>
    <div style="margin-top:0.75rem;text-align:center;">
      <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">
        ${data.todayCount} today · ${data.pendingCount} pending · ${data.overdue} overdue
      </div>
    </div>`;
}

function renderForecast(el, data) {
  if (!data || data.mode === 'insufficient') {
    el.innerHTML = `
      <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">4-Day Forecast</h3>
      <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Not enough data yet. Keep using ReMentally.</p>`;
    return;
  }
  const predictions = data.predictions || [];
  const maxVol = Math.max(...predictions.map(p => p.predictedVolume), 1);

  el.innerHTML = `
    <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">4-Day Forecast</h3>
    <div style="display:flex;align-items:flex-end;gap:8px;height:100px;">
      ${predictions.map((p, i) => {
        const h = (p.predictedVolume / maxVol) * 80;
        const barColor = p.isOverload ? COLORS.high : (p.overloadProbability > 50 ? COLORS.moderate : COLORS.low);
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="font:10px;color:var(--md-sys-color-outline);">${p.predictedVolume}</div>
          <div style="width:100%;height:${Math.max(h, 4)}px;background:${barColor};border-radius:var(--md-sys-shape-extra-small) var(--md-sys-shape-extra-small) 0 0;
            box-shadow:0 0 8px ${barColor}30;transition:height 0.5s ease;"></div>
          <div style="font:var(--md-sys-typescale-label-small);color:${i === 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'};">
            ${p.dayName.slice(0, 3)}
          </div>
          <div style="font:9px;color:${p.isOverload ? COLORS.high : COLORS.outline};">${p.overloadProbability}%</div>
          ${p.deadlines > 0 ? `<div style="font:9px;color:var(--md-sys-color-tertiary);">${p.deadlines} DL</div>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:0.75rem;display:flex;gap:1rem;">
      <div style="display:flex;align-items:center;gap:4px;font:10px var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">
        <span style="width:8px;height:8px;border-radius:2px;background:${COLORS.low};"></span> Safe
      </div>
      <div style="display:flex;align-items:center;gap:4px;font:10px var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">
        <span style="width:8px;height:8px;border-radius:2px;background:${COLORS.moderate};"></span> Watch
      </div>
      <div style="display:flex;align-items:center;gap:4px;font:10px var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">
        <span style="width:8px;height:8px;border-radius:2px;background:${COLORS.high};"></span> Overload
      </div>
    </div>`;
}

function renderInsights(el, data) {
  if (!data || data.mode === 'insufficient') {
    el.innerHTML = '<div style="padding:0.5rem 0;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Keep using ReMentally to unlock personalized insights.</div>';
    return;
  }
  const insights = data.insights || [];
  const patterns = data.patterns || {};

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0;">
      ${insights.map(i => `
        <div style="padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.5;">
          ${esc(i)}
        </div>
      `).join('')}
    </div>
    ${patterns.avgDailyThoughts != null ? `
      <div style="margin-top:1rem;display:flex;flex-wrap:wrap;gap:0.75rem;">
        <div class="chip" style="font:var(--md-sys-typescale-label-small);">${Math.round(patterns.avgDailyThoughts)} thoughts/day avg</div>
        <div class="chip" style="font:var(--md-sys-typescale-label-small);">${Math.round(patterns.completionRate * 100)}% completion</div>
        ${patterns.busiestDays?.length ? `<div class="chip" style="font:var(--md-sys-typescale-label-small);">Peak: ${patterns.busiestDays.join(', ')}</div>` : ''}
        ${patterns.avgResponseTime > 0 ? `<div class="chip" style="font:var(--md-sys-typescale-label-small);">Avg ${Math.round(patterns.avgResponseTime)}h to complete</div>` : ''}
      </div>
    ` : ''}`;
}

function renderHourlyHeatmap(el, data) {
  const patterns = data?.patterns;
  const peakHours = patterns?.peakHours || [];
  const now = new Date().getHours();

  const hours = Array.from({ length: 24 }, (_, h) => {
    let intensity = 0;
    if (peakHours.includes(h)) intensity = 1.0;
    else if (peakHours.some(p => Math.abs(p - h) <= 1)) intensity = 0.5;
    else if (peakHours.some(p => Math.abs(p - h) <= 2)) intensity = 0.25;
    return { hour: h, intensity, isNow: h === now };
  });

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:3px;">
      ${hours.map(h => `
        <div title="${h.hour}:00${h.isNow ? ' (now)' : ''}" style="
          aspect-ratio:1;border-radius:3px;
          background:${h.isNow ? 'var(--md-sys-color-primary)' :
            h.intensity > 0 ? `rgba(204,255,0,${0.15 + h.intensity * 0.6})` :
            'var(--md-sys-color-surface-variant)'};
          ${h.isNow ? 'box-shadow:0 0 8px rgba(204,255,0,0.4);' : ''}
          transition:background 0.3s;"></div>
      `).join('')}
    </div>
    <div style="margin-top:0.5rem;display:flex;justify-content:space-between;">
      <span style="font:9px;color:var(--md-sys-color-outline);">0:00</span>
      <span style="font:9px;color:var(--md-sys-color-outline);">6:00</span>
      <span style="font:9px;color:var(--md-sys-color-outline);">12:00</span>
      <span style="font:9px;color:var(--md-sys-color-outline);">18:00</span>
      <span style="font:9px;color:var(--md-sys-color-outline);">23:00</span>
    </div>`;
}

function renderCompletion(el, data) {
  const patterns = data?.patterns;
  const rate = patterns?.completionRate ?? 0;
  const overdue = data?.currentLoad?.overdue ?? 0;
  const pct = Math.round(rate * 100);
  const color = pct >= 70 ? COLORS.low : pct >= 40 ? COLORS.moderate : COLORS.high;

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;">
      <div style="position:relative;width:80px;height:80px;">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="${COLORS.surfaceVariant}" stroke-width="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke="${color}" stroke-width="8"
            stroke-dasharray="${pct * 2.01} 201"
            stroke-dashoffset="50"
            stroke-linecap="round" />
        </svg>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <span style="font:var(--md-sys-typescale-title-large);color:${color};">${pct}%</span>
        </div>
      </div>
      <div>
        <div style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
          ${overdue > 0 ? `${overdue} overdue item${overdue > 1 ? 's' : ''}` : 'No overdue items'}
        </div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.25rem;">
          ${pct >= 70 ? 'Great pace — keep marking thoughts done' :
            pct >= 40 ? 'Moderate — try completing some pending items' :
            'Low completion — tackle overdue items first'}
        </div>
      </div>
    </div>`;
}

function renderCategories(el, data) {
  const categories = data?.patterns?.categoryDistribution || {};
  const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, c]) => s + c, 0) || 1;

  const catColors = {
    general: '#a78bfa', work: '#60a5fa', tasks: '#34d399', personal: '#fbbf24',
    health: '#f87171', shopping: '#fb923c', commitment: '#c084fc', planning: '#22d3ee',
    preferences: '#e879f9', thought: '#94a3b8',
  };

  el.innerHTML = entries.length > 0 ? `
    <div style="display:flex;flex-direction:column;gap:0.5rem;">
      ${entries.slice(0, 6).map(([cat, count]) => {
        const pct = Math.round((count / total) * 100);
        const c = catColors[cat] || 'var(--md-sys-color-primary)';
        return `<div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);text-transform:capitalize;">${esc(cat)}</span>
            <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">${count} (${pct}%)</span>
          </div>
          <div style="height:6px;border-radius:3px;background:var(--md-sys-color-surface-variant);overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${c};border-radius:3px;transition:width 0.5s ease;"></div>
          </div>
        </div>`;
      }).join('')}
    </div>` : '<div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">No categories yet.</div>';
}

function renderOverdue(el, data) {
  const overdue = data?.overdue ?? 0;
  if (overdue === 0) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;border-radius:var(--md-sys-shape-medium);background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);">
        <span class="material-symbols-rounded" style="color:#10b981;">check_circle</span>
        <div>
          <div style="font:var(--md-sys-typescale-body-medium);color:#10b981;">All clear</div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">No overdue items. Your cognitive debt is clean.</div>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-error);margin-bottom:0.75rem;">
      ${overdue} overdue item${overdue > 1 ? 's' : ''} contributing to cognitive debt
    </div>`;

  api.get('/memory?status=pending&limit=20').then(data => {
    const items = (data.memories || data || []).filter(m =>
      m.expires_at && new Date(m.expires_at) < new Date() && m.status === 'pending'
    ).slice(0, 5);

    if (items.length > 0) {
      el.innerHTML += items.map(m => `
        <div style="padding:0.6rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);display:flex;align-items:flex-start;gap:0.5rem;">
          <span class="material-symbols-rounded" style="font-size:16px;color:var(--md-sys-color-error);margin-top:2px;">schedule</span>
          <div style="flex:1;min-width:0;">
            <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(m.content)}</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">
              ${m.category || 'general'} · due ${new Date(m.expires_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      `).join('');
    }
  }).catch(() => {});
}
