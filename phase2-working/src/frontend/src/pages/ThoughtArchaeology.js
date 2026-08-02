// Thought Archaeology - Weekly regret ledger
import api from '../lib/api.js';

export function ThoughtArchaeology() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
          <span class="material-symbols-rounded" style="color:var(--color-creative);font-size:28px;">history_edu</span>
          <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0;">Thought Archaeology</h1>
        </div>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          A zero-judgment review of what didn't move this week. Not a failure log — a gentle mirror.
        </p>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-top:1.5rem;">
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Expired This Week</div>
          <div id="stat-expired" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-error);">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Categories</div>
          <div id="stat-categories" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-tertiary);">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Archived</div>
          <div id="stat-archived" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-secondary);">—</div>
        </div>
      </div>

      <!-- The One Worth Revisiting -->
      <div id="top-thought" class="card-reveal" style="margin-top:1.5rem;display:none;">
        <div class="surface-card" style="padding:1.5rem;border-left:3px solid var(--color-creative);">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
            <span class="material-symbols-rounded" style="font-size:20px;color:var(--color-creative);">auto_awesome</span>
            <span style="font:var(--md-sys-typescale-label-medium);color:var(--color-creative);">The one worth revisiting</span>
          </div>
          <p id="top-thought-text" style="font:var(--md-sys-typescale-body-large);margin:0;"></p>
          <span id="top-thought-cat" class="classification-chip low" style="margin-top:0.5rem;"></span>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div id="category-breakdown" class="card-reveal" style="margin-top:1.5rem;display:none;">
        <h2 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Category Breakdown</h2>
        <div id="categories-list"></div>
      </div>

      <!-- All expired thoughts (expandable) -->
      <div class="card-reveal" style="margin-top:1.5rem;">
        <details>
          <summary style="font:var(--md-sys-typescale-title-medium);color:var(--md-sys-color-on-surface-variant);cursor:pointer;padding:0.5rem 0;">
            <span class="material-symbols-rounded" style="vertical-align:middle;font-size:18px;">expand_more</span>
            Show All Expired Thoughts
          </summary>
          <div id="all-expired" style="margin-top:1rem;display:flex;flex-direction:column;gap:0.5rem;">
            <p style="color:var(--md-sys-color-outline);">Loading...</p>
          </div>
        </details>
      </div>

      <!-- Action buttons -->
      <div class="card-reveal" style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap;">
        <button class="btn-m3 btn-tonal" id="btn-archive">
          <span class="material-symbols-rounded" style="font-size:18px;">archive</span>
          Archive All Expired
        </button>
        <button class="btn-m3 btn-outlined" id="btn-refresh">
          <span class="material-symbols-rounded" style="font-size:18px;">refresh</span>
          Refresh
        </button>
      </div>
    </div>`;

  async function loadData() {
    const data = await api.get('/features/archaeology');
    if (data.error) {
      container.querySelector('#stat-expired').textContent = '—';
      return;
    }

    const stats = data.stats || {};
    container.querySelector('#stat-expired').textContent = stats.totalExpired || 0;
    container.querySelector('#stat-categories').textContent = stats.categories || 0;
    container.querySelector('#stat-archived').textContent = stats.archivedCount || 0;

    // Top thought
    if (data.topThought) {
      container.querySelector('#top-thought').style.display = 'block';
      container.querySelector('#top-thought-text').textContent = data.topThought.content;
      container.querySelector('#top-thought-cat').textContent = data.topThought.category || 'general';
    }

    // Category breakdown
    if (data.categoryBreakdown?.length > 0) {
      container.querySelector('#category-breakdown').style.display = 'block';
      container.querySelector('#categories-list').innerHTML = data.categoryBreakdown.map(cat => `
        <div style="padding:0.75rem 0;border-bottom:1px solid var(--md-sys-color-outline-variant);display:flex;justify-content:space-between;align-items:center;">
          <span style="font:var(--md-sys-typescale-body-medium);text-transform:capitalize;">${cat.category}</span>
          <span class="classification-chip low">${cat.count} thought${cat.count > 1 ? 's' : ''} didn't move</span>
        </div>
      `).join('');
    }

    // All expired thoughts
    if (data.expired?.length > 0) {
      container.querySelector('#all-expired').innerHTML = data.expired.map(t => `
        <div class="surface-card" style="padding:0.75rem 1rem;opacity:0.8;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font:var(--md-sys-typescale-body-medium);">${escHtml(t.content)}</span>
            <span class="classification-chip ${t.urgencyTier || 'low'}" style="font-size:10px;">${t.category || 'general'}</span>
          </div>
        </div>
      `).join('');
    } else {
      container.querySelector('#all-expired').innerHTML = '<p style="color:var(--md-sys-color-outline);">No expired thoughts this week. Great job.</p>';
    }
  }

  container.querySelector('#btn-archive')?.addEventListener('click', async () => {
    const result = await api.post('/features/archaeology/clear', {});
    if (!result.error) {
      alert(`Archived ${result.archivedCount || 0} expired thoughts.`);
      loadData();
    }
  });

  container.querySelector('#btn-refresh')?.addEventListener('click', loadData);

  loadData();
  return container;
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
