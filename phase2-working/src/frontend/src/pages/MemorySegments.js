// Memory Segments - Real memory graph visualization
import api from '../lib/api.js';

export function MemorySegments() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal"><span class="material-symbols-rounded" style="color:var(--md-sys-color-secondary);">scatter_plot</span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">Memory Segments</h1>
      </div>
      <p class="card-reveal" style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin-bottom:1.5rem;">
        Explore your knowledge graph — categories, relationships, and connected thoughts.
      </p>
      <div id="segments-content" class="grid-cards"><div class="surface-card card-reveal"><div class="anim-shimmer" style="height:200px;"></div></div></div>
    </div>`;

  api.get('/memory/stats').then(data => {
    if (data.error) { container.querySelector('#segments-content').innerHTML = `<div class="surface-card" style="color:var(--md-sys-color-error);">${data.error}</div>`; return; }
    const cats = data.byCategory || [];
    const total = data.total || 0;
    container.querySelector('#segments-content').innerHTML = cats.length > 0 ? cats.map(cat => {
      const pct = total > 0 ? Math.round(cat.count / total * 100) : 0;
      return `<div class="surface-card card-reveal glass-glow" style="cursor:pointer;" onclick="showPage('memory')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
          <h3 style="font:var(--md-sys-typescale-title-small);">${cat.category}</h3>
          <span class="chip">${cat.count}</span>
        </div>
        <div class="progress-bar"><span style="width:${pct}%"></span></div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.5rem;">${pct}% of all memories</div>
      </div>`;
    }).join('') : '<div class="tg-state" style="grid-column:1/-1;"><div class="tg-state-title">No memory segments yet</div><div class="tg-state-body">Start capturing thoughts and segments will form into a browsable knowledge graph.</div></div>';
  });
  return container;
}
