// Brain Fragments - Animated brain area distribution
import api from '../lib/api.js';
import { renderErrorState } from '../components/ErrorState.js';
export function BrainFragments() {
  const container = document.createElement('div');
  const colors = { 'Prefrontal Cortex': 'var(--color-analytical)', 'Limbic System': 'var(--color-emotional)', 'Hippocampus': 'var(--color-creative)', 'Cerebellum': 'var(--color-urgency)' };
  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal"><span class="material-symbols-rounded" style="color:var(--md-sys-color-tertiary);">neurology</span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">Brain Fragments</h1>
      </div>
      <p class="card-reveal" style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin-bottom:1.5rem;">
        How your thoughts are distributed across cognitive brain areas.
      </p>
      <div class="grid-cards">
        <div class="surface-card glass-glow card-reveal" id="brain-chart" style="grid-column:1/-1;min-height:200px;">
          <div class="anim-shimmer" style="height:160px;"></div>
        </div>
        <div class="surface-card card-reveal" id="brain-details"><div class="anim-shimmer" style="height:120px;"></div></div>
      </div>
    </div>`;

  api.get('/features/brain').then(data => {
    if (data.error) { container.querySelector('#brain-chart').innerHTML = renderErrorState(data.error); return; }
    const areas = data.areas || [];
    const total = data.total || 0;

    // Radial chart visualization
    container.querySelector('#brain-chart').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:2rem;flex-wrap:wrap;padding:1rem;">
        <svg viewBox="0 0 200 200" width="180" height="180">
          ${renderRadialChart(areas, colors)}
        </svg>
        <div>
          <div style="font:var(--md-sys-typescale-headline-small);margin-bottom:0.5rem;">${total} thoughts</div>
          <div style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-outline);">classified across ${areas.length} brain areas</div>
        </div>
      </div>`;

    container.querySelector('#brain-details').innerHTML = `
      <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Distribution</h3>
      ${areas.map(a => `
        <div style="margin-bottom:0.75rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
            <span style="font:var(--md-sys-typescale-label-medium);">${a.area}</span>
            <span style="font:var(--md-sys-typescale-label-medium);color:${colors[a.area] || 'var(--md-sys-color-outline)'};">${a.percentage}%</span>
          </div>
          <div class="progress-bar"><span style="width:${a.percentage}%;background:${colors[a.area] || 'var(--md-sys-color-primary)'}"></span></div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.15rem;">${a.count} thoughts · avg importance ${a.avgImportance}</div>
        </div>
      `).join('')}`;
  });
  return container;
}

function renderRadialChart(areas, colors) {
  if (areas.length === 0 || areas.every(a => a.count === 0)) {
    return '<text x="100" y="105" text-anchor="middle" fill="#938d99" font-size="12">No data yet</text>';
  }
  const total = areas.reduce((s, a) => s + a.count, 0);
  let startAngle = 0;
  const cx = 100, cy = 100, r = 80;
  return areas.map(a => {
    const pct = a.count / total;
    const angle = pct * 360;
    const endAngle = startAngle + angle;
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    startAngle = endAngle;
    return `<path d="${path}" fill="${colors[a.area] || '#d0bcff'}" opacity="0.7" stroke="#141218" stroke-width="2">
      <title>${a.area}: ${a.percentage}%</title></path>`;
  }).join('') + `<circle cx="${cx}" cy="${cy}" r="35" fill="#1e1c22"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#e6e0e9" font-size="14" font-weight="600">${total}</text>`;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
