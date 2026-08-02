// Memory - Real memories from DB with search and export
import api from '../lib/api.js';

export function Memory() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal"><span class="material-symbols-rounded" style="color:var(--md-sys-color-primary);">memory</span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">Memory Archive</h1>
      </div>
      <div class="card-reveal" style="display:flex;gap:0.75rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        <input type="text" id="mem-search" class="input-m3" placeholder="Search memories..." style="flex:1;min-width:200px;">
        <button class="btn-m3 btn-outlined" id="search-btn"><span class="material-symbols-rounded" style="font-size:18px;">search</span></button>
        <button class="btn-m3 btn-tonal" id="export-btn"><span class="material-symbols-rounded" style="font-size:18px;">download</span> Export</button>
      </div>
      <div id="mem-list" class="card-reveal"><div class="anim-shimmer" style="height:200px;"></div></div>
    </div>`;

  async function loadMems(q) {
    const data = q ? await api.get(`/memory/search?q=${encodeURIComponent(q)}`) : await api.get('/memory?limit=50');
    const items = data.memories || data.results || [];
    const el = container.querySelector('#mem-list');
    if (items.length === 0) { el.innerHTML = '<div class="surface-card" style="text-align:center;padding:2rem;color:var(--md-sys-color-outline);">No memories found.</div>'; return; }
    el.innerHTML = items.map(m => `
      <div class="surface-card" style="margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">
          <div style="flex:1;">
            <p style="font:var(--md-sys-typescale-body-medium);margin-bottom:0.5rem;">${escHtml(m.content)}</p>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              ${m.category ? `<span class="chip">${m.category}</span>` : ''}
              ${m.cognitiveLoad || m.cognitive_load ? `<span class="chip chip-primary">${m.cognitiveLoad || m.cognitive_load}</span>` : ''}
              ${m.brainArea || m.brain_area ? `<span class="chip">${m.brainArea || m.brain_area}</span>` : ''}
            </div>
          </div>
          <button class="icon-btn" onclick="deleteMem('${m.id}')" title="Delete">
            <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-error);">delete</span>
          </button>
        </div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.5rem;">${new Date(m.createdAt || m.created_at).toLocaleDateString()}</div>
      </div>`).join('');
  }

  container.querySelector('#search-btn').addEventListener('click', () => loadMems(container.querySelector('#mem-search').value));
  container.querySelector('#mem-search').addEventListener('keydown', e => { if (e.key === 'Enter') loadMems(e.target.value); });
  container.querySelector('#export-btn').addEventListener('click', async () => {
    const data = await api.get('/memory/export?format=json');
    if (!data.error) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'thought-gps-memories.json'; a.click();
    }
  });
  loadMems();
  return container;
}
function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
window.deleteMem = async (id) => { if (confirm('Delete this memory?')) { await api.del(`/memory/${id}`); window.showPage('memory'); } };
