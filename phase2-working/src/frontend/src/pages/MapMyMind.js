// ReMentally - Navigation-style thought visualization
import api from '../lib/api.js';
import { renderErrorState } from '../components/ErrorState.js';

export function MapMyMind() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">NAVIGATION</div>
        <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0 0 0.25rem;">Mind Navigation</h1>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          Where are your thoughts heading? Navigate your mental landscape by theme, urgency, and connections.
        </p>
      </div>

      <!-- Summary Card -->
      <div id="route-summary" class="card-reveal surface-card" style="padding:1.25rem 1.5rem;margin-top:1.5rem;border-left:3px solid var(--md-sys-color-primary);">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span class="dot" style="width:12px;height:12px;border-radius:50%;background:var(--md-sys-color-primary);box-shadow:0 0 10px rgba(204,255,0,0.4);"></span>
          <div>
            <div style="font:var(--md-sys-typescale-title-small);">Today's route</div>
            <div id="route-stats" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);"><span class="tg-skeleton" style="display:inline-block;width:9rem;vertical-align:middle;"></span></div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card-reveal" style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap;">
        <button class="chip-m3 active" data-period="week">This Week</button>
        <button class="chip-m3" data-period="today">Today</button>
        <button class="chip-m3" data-period="month">This Month</button>
        <button class="chip-m3" data-period="all">All Time</button>
        <span style="width:1px;background:var(--md-sys-color-outline-variant);margin:0 0.5rem;"></span>
        <select id="filter-category" class="input-m3" style="width:auto;padding:0.35rem 0.75rem;font-size:13px;">
          <option value="">All Categories</option>
        </select>
        <select id="filter-status" class="input-m3" style="width:auto;padding:0.35rem 0.75rem;font-size:13px;">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <!-- Mind Map Visualization -->
      <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1.5rem;min-height:400px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Thought Map</h2>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn-m3 btn-icon" id="btn-zoom-in" title="Zoom in"><span style="font:700 14px/1 'Space Grotesk';">+</span></button>
            <button class="btn-m3 btn-icon" id="btn-zoom-out" title="Zoom out"><span style="font:700 14px/1 'Space Grotesk';">-</span></button>
          </div>
        </div>
        <div id="mind-map-canvas" style="position:relative;overflow:auto;min-height:350px;">
          <div class="anim-shimmer" style="height:300px;"></div>
        </div>
      </div>

      <!-- Navigate Mode -->
      <div id="navigate-section" class="surface-card card-reveal" style="padding:1.5rem;margin-top:1rem;display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">
            <span class="mono-label" style="color:var(--md-sys-color-primary);font-size:10px;vertical-align:middle;">NAVIGATE</span>
            Navigate Mode
          </h2>
          <span id="nav-counter" class="mono-label" style="color:var(--md-sys-color-outline);">0 / 0</span>
        </div>
        <div id="navigate-card" style="padding:1rem;border-radius:var(--md-sys-shape-large);background:var(--md-sys-color-surface-container-high);min-height:120px;">
          <p style="color:var(--md-sys-color-outline);">Press "Start Route" to step through your thoughts one by one.</p>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1rem;justify-content:center;">
          <button class="btn-m3 btn-outlined" id="nav-prev">&lt; Previous</button>
          <button class="btn-m3 btn-filled" id="nav-start">Start Route</button>
          <button class="btn-m3 btn-outlined" id="nav-next">Next &gt;</button>
        </div>
      </div>

      <!-- Theme Clusters -->
      <div class="card-reveal" style="margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Theme Clusters</h2>
        <div id="theme-clusters" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;">
          <div class="anim-shimmer" style="height:100px;"></div>
        </div>
      </div>
    </div>`;

  let allThoughts = [];
  let currentPeriod = 'week';
  let navigateIdx = 0;
  let navigating = false;

  async function loadData(period, category, status) {
    const params = new URLSearchParams();
    if (period && period !== 'all') params.set('period', period);
    if (category) params.set('category', category);
    if (status) params.set('status', status);

    const data = await api.get(`/features/mind-map?${params}`);
    if (data.error) {
      container.querySelector('#mind-map-canvas').innerHTML = renderErrorState(data.error);
      return;
    }

    allThoughts = data.thoughts || [];
    const themes = data.themes || [];
    const connections = data.connections || [];
    const stats = data.stats || {};

    // Route summary
    container.querySelector('#route-stats').textContent =
      `${stats.total} thoughts, ${stats.themes} themes, ${stats.urgent} urgent, ${stats.commitments} commitments`;

    // Populate category filter
    const catSelect = container.querySelector('#filter-category');
    const cats = [...new Set(allThoughts.map(t => t.category))].filter(Boolean);
    catSelect.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');

    // Render mind map
    renderMindMap(themes, connections);

    // Render theme clusters
    renderThemeClusters(themes);

    // Show navigate section
    container.querySelector('#navigate-section').style.display = 'block';
  }

  function renderMindMap(themes, connections) {
    const canvas = container.querySelector('#mind-map-canvas');
    if (allThoughts.length === 0) {
      canvas.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--md-sys-color-outline);"><p style="font:700 24px/1 \'Space Grotesk\';opacity:0.2;margin-bottom:0.5rem;">NO THOUGHTS</p><p style="margin-top:0.5rem;">No thoughts to map. Start capturing!</p></div>';
      return;
    }

    const themeColors = {};
    const colorPalette = ['#ccff00', '#a3e635', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
    themes.forEach((t, i) => { themeColors[t.theme] = colorPalette[i % colorPalette.length]; });

    // Simple node-based layout
    canvas.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;padding:1rem;">
        ${themes.map(theme => {
          const color = themeColors[theme.theme] || 'var(--md-sys-color-primary)';
          return `<div style="border:1px solid ${color}33;border-radius:var(--md-sys-shape-large);padding:1rem;min-width:220px;max-width:350px;flex:1;background:${color}08;">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
              <div style="width:10px;height:10px;border-radius:50%;background:${color};"></div>
              <span class="mono-label" style="color:${color};text-transform:uppercase;">${escHtml(theme.theme)}</span>
              <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);margin-left:auto;">${theme.count}</span>
            </div>
            ${theme.thoughts.slice(0, 4).map(t => {
              const urgColor = t.urgencyTier === 'critical' ? 'var(--md-sys-color-error)' : t.urgencyTier === 'high' ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-outline)';
              return `<div style="padding:0.4rem 0.5rem;margin-bottom:0.35rem;border-radius:var(--md-sys-shape-small);background:var(--md-sys-color-surface-container);cursor:pointer;border-left:2px solid ${urgColor};" onclick="showThoughtDetail('${t.id}')">
                <div style="font:var(--md-sys-typescale-body-small);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(t.content)}</div>
                <div style="display:flex;gap:0.25rem;margin-top:0.15rem;">
                  ${t.urgencyTier ? `<span style="font:9px var(--font-mono);color:${urgColor};text-transform:uppercase;">${t.urgencyTier}</span>` : ''}
                  ${t.halfLifeHours ? `<span style="font:9px var(--font-mono);color:var(--md-sys-color-outline);">${t.halfLifeHours}h</span>` : ''}
                </div>
              </div>`;
            }).join('')}
            ${theme.count > 4 ? `<div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);text-align:center;">+${theme.count - 4} more</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      ${connections.length > 0 ? `<div style="padding:0.5rem 1rem;border-top:1px solid var(--md-sys-color-outline-variant);"><div class="mono-label" style="color:var(--md-sys-color-outline);margin-bottom:0.5rem;">CONNECTIONS (${connections.length})</div><div style="display:flex;gap:0.5rem;flex-wrap:wrap;">${connections.slice(0, 8).map(c => `<span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);background:var(--md-sys-color-surface-container);padding:2px 8px;border-radius:var(--md-sys-shape-full);">${c.label}</span>`).join('')}</div></div>` : ''}`;
  }

  function renderThemeClusters(themes) {
    const el = container.querySelector('#theme-clusters');
    if (themes.length === 0) {
      el.innerHTML = '<div class="tg-state"><div class="tg-state-title">No themes detected yet</div><div class="tg-state-body">Themes emerge once there are enough thoughts to cluster. Keep capturing and the map will draw itself.</div></div>';
      return;
    }
    el.innerHTML = themes.map(t => {
      const urgent = t.thoughts.filter(th => th.urgencyTier === 'critical' || th.urgencyTier === 'high').length;
      return `<div class="surface-card" style="padding:1rem;cursor:pointer;" onclick="document.querySelector('[data-period]').click();">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <span style="font:var(--md-sys-typescale-title-small);text-transform:capitalize;">${escHtml(t.theme)}</span>
          <span class="mono-label" style="color:var(--md-sys-color-primary);">${t.count}</span>
        </div>
        <div style="display:flex;gap:0.5rem;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">
          <span>${t.count} thoughts</span>
          ${urgent > 0 ? `<span style="color:var(--md-sys-color-error);">${urgent} urgent</span>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // Navigate mode
  const navStart = container.querySelector('#nav-start');
  const navPrev = container.querySelector('#nav-prev');
  const navNext = container.querySelector('#nav-next');
  const navCard = container.querySelector('#navigate-card');
  const navCounter = container.querySelector('#nav-counter');

  function renderNavCard() {
    if (allThoughts.length === 0) { navCard.innerHTML = '<p style="color:var(--md-sys-color-outline);">No thoughts to navigate.</p>'; return; }
    const t = allThoughts[navigateIdx];
    const urgColor = t.urgencyTier === 'critical' ? 'var(--md-sys-color-error)' : t.urgencyTier === 'high' ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-outline)';
    navCard.innerHTML = `
      <div style="font:var(--md-sys-typescale-body-large);margin-bottom:0.75rem;">${escHtml(t.content)}</div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <span class="chip" style="border-color:${urgColor};color:${urgColor};">${t.urgencyTier || 'normal'}</span>
        <span class="chip">${t.category || 'general'}</span>
        ${t.halfLifeHours ? `<span class="chip">${t.halfLifeHours}h half-life</span>` : ''}
        ${t.emotionalTone ? `<span class="chip">${t.emotionalTone}</span>` : ''}
      </div>
      <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.5rem;">${new Date(t.createdAt).toLocaleString()}</div>`;
    navCounter.textContent = `${navigateIdx + 1} / ${allThoughts.length}`;
  }

  navStart.addEventListener('click', () => {
    navigating = !navigating;
    navStart.textContent = navigating ? 'Pause Route' : 'Start Route';
    if (navigating) { navigateIdx = 0; renderNavCard(); }
  });
  navPrev.addEventListener('click', () => { navigateIdx = Math.max(0, navigateIdx - 1); renderNavCard(); });
  navNext.addEventListener('click', () => { navigateIdx = Math.min(allThoughts.length - 1, navigateIdx + 1); renderNavCard(); });

  // Period filter chips
  container.querySelectorAll('[data-period]').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('[data-period]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentPeriod = chip.dataset.period;
      loadData(currentPeriod, container.querySelector('#filter-category').value, container.querySelector('#filter-status').value);
    });
  });

  // Category/status filters
  container.querySelector('#filter-category').addEventListener('change', () => {
    loadData(currentPeriod, container.querySelector('#filter-category').value, container.querySelector('#filter-status').value);
  });
  container.querySelector('#filter-status').addEventListener('change', () => {
    loadData(currentPeriod, container.querySelector('#filter-category').value, container.querySelector('#filter-status').value);
  });

  // Global show detail handler
  window.showThoughtDetail = (id) => {
    const t = allThoughts.find(th => th.id === id);
    if (!t) return;
    navigateIdx = allThoughts.findIndex(th => th.id === id);
    renderNavCard();
    container.querySelector('#navigate-section').scrollIntoView({ behavior: 'smooth' });
  };

  loadData('week');
  return container;
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
