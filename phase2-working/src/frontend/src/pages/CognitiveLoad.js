// Cognitive Load - Real distribution charts
import api from '../lib/api.js';

export function CognitiveLoad() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal"><span class="material-symbols-rounded" style="color:var(--md-sys-color-primary);">monitoring</span>
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
      : '<p style="color:var(--md-sys-color-outline);">No data yet. Process some thoughts to see cognitive load distribution.</p>');

    // Tones
    const toneEl = container.querySelector('#tone-dist');
    toneEl.innerHTML = `<h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Emotional Tones</h3>` +
      (tones.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">${tones.map(t =>
        `<span class="chip">${t.tone} · ${t.count}</span>`
      ).join('')}</div>` : '<p style="color:var(--md-sys-color-outline);">No tone data yet.</p>');

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
  return container;
}
