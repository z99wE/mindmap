// Cognitive Load - Real distribution charts
import api from '../lib/api.js';

export function CognitiveLoad() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal"><span class="dot" style="width:10px;height:10px;background:var(--md-sys-color-primary);box-shadow:0 0 12px rgba(204,255,0,0.3);"></span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">Cognitive Load</h1>
      </div>
      <p class="card-reveal" style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin-bottom:1.5rem;">
        Creative vs analytical split, emotional tone distribution, and trends over time.
      </p>
      <div class="grid-cards">
        <div class="surface-card card-reveal" id="load-dist">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Load Distribution</h3>
          <div class="anim-shimmer" style="height:100px;"></div>
        </div>
        <div class="surface-card card-reveal" id="tone-dist">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Emotional Tones</h3>
          <div class="anim-shimmer" style="height:100px;"></div>
        </div>
      </div>
      <div class="surface-card card-reveal" style="margin-top:1rem;" id="trend-section">
        <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">14-Day Trend</h3>
        <div id="trend-chart" style="min-height:100px;"><div class="anim-shimmer" style="height:80px;"></div></div>
      </div>
      <!-- Predictive Cognitive Load -->
      <div class="surface-card card-reveal" style="margin-top:1rem;" id="prediction-section">
        <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;">
          <span class="material-symbols-rounded" style="font-size:20px;vertical-align:middle;color:var(--md-sys-color-tertiary);">psychology</span>
          Predictive Load
        </h3>
        <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin:0 0 1rem;">ML-based overload prediction from your behavior patterns.</p>
        <div id="prediction-content"><div class="anim-shimmer" style="height:120px;"></div></div>
      </div>
      <!-- Real-time Load -->
      <div class="surface-card card-reveal" style="margin-top:1rem;" id="realtime-section">
        <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Real-Time Load Score</h3>
        <div id="realtime-content"><div class="anim-shimmer" style="height:60px;"></div></div>
      </div>
    </div>`;

  api.get('/features/cognitive-load').then(data => {
    if (data.error) return;
    const dist = data.distribution || [];
    const tones = data.emotionalTones || [];
    const trend = data.trend || [];

    // Distribution bars
    const distEl = container.querySelector('#load-dist');
    const loadColors = { analytical: 'var(--color-analytical)', creative: 'var(--color-creative)', emotional: 'var(--color-emotional)', planning: 'var(--md-sys-color-secondary)' };
    distEl.innerHTML = `<h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Load Distribution</h3>` +
      (dist.length > 0 ? dist.map(d => `
        <div style="margin-bottom:0.75rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
            <span style="font:var(--md-sys-typescale-label-medium);">${d.type}</span>
            <span style="font:var(--md-sys-typescale-label-medium);">${d.percentage}%</span>
          </div>
          <div class="progress-bar"><span style="width:${d.percentage}%;background:${loadColors[d.type] || 'var(--md-sys-color-primary)'}"></span></div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${d.count} thoughts</div>
        </div>`).join('')
      : '<div class="tg-state"><div class="tg-state-title">No load data yet</div><div class="tg-state-body">Process a few thoughts and the distribution across analytical, creative and emotional load will appear here.</div></div>');

    // Tones
    const toneEl = container.querySelector('#tone-dist');
    toneEl.innerHTML = `<h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Emotional Tones</h3>` +
      (tones.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">${tones.map(t =>
        `<span class="chip">${t.tone} · ${t.count}</span>`
      ).join('')}</div>` : '<div class="tg-state"><div class="tg-state-title">No tone data yet</div><div class="tg-state-body">Tone is derived from processed thoughts. This panel fills in as they come through.</div></div>');

    // Trend (simple bar chart)
    if (trend.length > 0) {
      const dates = [...new Set(trend.map(t => t.date))].sort();
      const maxCount = Math.max(...dates.map(d => trend.filter(t => t.date === d).reduce((s, t) => s + t.count, 0)));
      container.querySelector('#trend-chart').innerHTML = `
        <div style="display:flex;align-items:flex-end;gap:4px;height:100px;">
          ${dates.map(d => {
            const dayCount = trend.filter(t => t.date === d).reduce((s, t) => s + t.count, 0);
            const h = maxCount > 0 ? (dayCount / maxCount * 80) : 0;
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;">
              <div style="width:100%;height:${h}px;background:var(--md-sys-color-primary);border-radius:var(--md-sys-shape-extra-small) var(--md-sys-shape-extra-small) 0 0;min-height:2px;"></div>
              <span style="font:8px 'Inter';color:var(--md-sys-color-outline);margin-top:2px;">${d.slice(5)}</span>
            </div>`;
          }).join('')}
        </div>`;
    }
  });

  // Load predictive cognitive load
  api.get('/cognitive/prediction').then(data => {
    const el = container.querySelector('#prediction-content');
    if (!data || data.mode === 'insufficient') {
      el.innerHTML = '<div style="padding:0.75rem;color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Not enough data yet. Keep using ReMentally and I\'ll learn your patterns.</div>';
      return;
    }

    const predictions = data.predictions || [];
    const insights = data.insights || [];

    el.innerHTML = `
      ${predictions.length > 0 ? `
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
          ${predictions.map(p => `
            <div style="flex:1;min-width:120px;padding:0.75rem;border-radius:var(--md-sys-shape-medium);background:${p.isOverload ? 'rgba(255,138,158,0.1)' : 'rgba(204,255,0,0.05)'};border:1px solid ${p.isOverload ? 'rgba(255,138,158,0.2)' : 'rgba(204,255,0,0.1)'};">
              <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);">${p.dayName}</div>
              <div style="font:var(--md-sys-typescale-title-medium);">${p.predictedVolume} thoughts</div>
              <div style="font:var(--md-sys-typescale-body-small);color:${p.isOverload ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-outline)'};">${p.overloadProbability}% overload risk</div>
              ${p.deadlines > 0 ? `<div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-tertiary);">${p.deadlines} deadline(s)</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${insights.length > 0 ? `
        <div style="margin-top:0.5rem;">
          ${insights.map(i => `<div style="padding:0.5rem 0;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);border-bottom:1px solid var(--md-sys-color-outline-variant);">${i}</div>`).join('')}
        </div>
      ` : ''}
      ${data.patterns ? `
        <div style="margin-top:1rem;display:flex;gap:1rem;flex-wrap:wrap;">
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Avg: ${Math.round(data.patterns.avgDailyThoughts)}/day</div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Completion: ${Math.round(data.patterns.completionRate * 100)}%</div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Peak: ${data.patterns.peakHours.map(h => h + ':00').join(', ')}</div>
        </div>
      ` : ''}
    `;
  }).catch(() => {});

  // Load real-time load score
  api.get('/cognitive/realtime').then(data => {
    const el = container.querySelector('#realtime-content');
    if (!data) return;
    const score = data.score || 0;
    const level = data.level || 'low';
    const colors = { low: '#10b981', moderate: '#f59e0b', high: '#ef4444' };
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;">
        <div style="width:80px;height:80px;border-radius:50%;background:conic-gradient(${colors[level]} ${score * 3.6}deg, var(--md-sys-color-surface-variant) 0deg);display:flex;align-items:center;justify-content:center;">
          <div style="width:60px;height:60px;border-radius:50%;background:var(--md-sys-color-surface);display:flex;align-items:center;justify-content:center;">
            <span style="font:var(--md-sys-typescale-headline-small);color:${colors[level]};">${score}</span>
          </div>
        </div>
        <div>
          <div style="font:var(--md-sys-typescale-title-medium);text-transform:capitalize;">${level} load</div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${data.todayCount} today · ${data.pendingCount} pending · ${data.overdue} overdue</div>
        </div>
      </div>
    `;
  }).catch(() => {});

  return container;
}
