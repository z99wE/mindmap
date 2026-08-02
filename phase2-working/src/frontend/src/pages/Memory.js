// Memory - Real memories from DB with search and export
import api from '../lib/api.js';

export function Memory() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal"><span class="material-symbols-rounded" style="color:var(--md-sys-color-primary);">memory</span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">Memory Archive</h1>
      </div>
      <div id="backup-warning"></div>
      <div class="card-reveal" style="display:flex;gap:0.75rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        <input type="text" id="mem-search" class="input-m3" placeholder="Search memories..." style="flex:1;min-width:200px;">
        <button class="btn-m3 btn-outlined" id="search-btn"><span class="material-symbols-rounded" style="font-size:18px;">search</span></button>
        <button class="btn-m3 btn-tonal" id="export-btn"><span class="material-symbols-rounded" style="font-size:18px;">download</span> Export</button>
        <button class="btn-m3 btn-tonal" id="import-btn"><span class="material-symbols-rounded" style="font-size:18px;">upload</span> Import</button>
        <input type="file" id="import-file-input" style="display:none;" accept=".json">
      </div>
      <div id="mem-list" class="card-reveal"><div class="anim-shimmer" style="height:200px;"></div></div>
    </div>`;

  function renderBackupWarning() {
    const lastBackup = localStorage.getItem('thought_gps_last_backup');
    const warningEl = container.querySelector('#backup-warning');
    if (!warningEl) return;

    let showWarning = true;
    if (lastBackup) {
      const diffTime = Math.abs(new Date() - new Date(lastBackup));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        showWarning = false;
      }
    }

    if (showWarning) {
      warningEl.innerHTML = `
        <div class="surface-card liquid-glass" style="margin-bottom:1.5rem; border: 1px solid var(--md-sys-color-error) !important; padding:1rem; display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
          <div style="flex:1;">
            <div style="font-weight:bold; color:var(--md-sys-color-error); margin-bottom:0.25rem; display:flex; align-items:center; gap:0.5rem;">
              <span class="material-symbols-rounded" style="font-size:18px;">warning</span>
              Storage Conservation Alert
            </div>
            <div style="font:var(--md-sys-typescale-body-small); color:var(--md-sys-color-on-surface-variant);">
              To keep server storage free under the 500MB limit, raw thoughts older than 7 days are periodically purged. Click Export to back up your full cognitive history to your local browser index.
            </div>
          </div>
          <button class="btn-m3 btn-tonal" id="warning-export-btn" style="background:rgba(239,68,68,0.2); color:#ff4d4d; border:1px solid rgba(239,68,68,0.3);">Backup Now</button>
        </div>`;
      warningEl.querySelector('#warning-export-btn').addEventListener('click', () => container.querySelector('#export-btn').click());
    } else {
      warningEl.innerHTML = '';
    }
  }

  async function loadMems(q) {
    let serverItems = [];
    try {
      const data = q ? await api.get(`/memory/search?q=${encodeURIComponent(q)}`) : await api.get('/memory?limit=50');
      serverItems = data.memories || data.results || [];
    } catch (e) {
      console.warn('Failed to load memories from server, falling back to local database.', e);
    }

    // Load from local IndexedDB
    let localItems = [];
    try {
      const { searchLocalMemories } = await import('../lib/indexedDb.js');
      localItems = await searchLocalMemories(q, 100);
    } catch (e) {
      console.error('IndexedDB retrieval failed:', e);
    }

    // Merge and deduplicate by ID
    const mergedMap = new Map();
    localItems.forEach(item => mergedMap.set(item.id, item));
    serverItems.forEach(item => mergedMap.set(item.id, item));

    const items = Array.from(mergedMap.values())
      .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));

    const el = container.querySelector('#mem-list');
    if (items.length === 0) { el.innerHTML = '<div class="surface-card" style="text-align:center;padding:2rem;color:var(--md-sys-color-outline);">No memories found.</div>'; return; }
    el.innerHTML = items.map(m => `
      <div class="surface-card" style="margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">
          <div style="flex:1;">
            <p style="font:var(--md-sys-typescale-body-medium);margin-bottom:0.5rem;">${escHtml(m.content)}</p>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              ${m.category ? `<span class="chip">${m.category}</span>` : ''}
              ${m.cognitive_load || m.cognitiveLoad ? `<span class="chip chip-primary">${m.cognitive_load || m.cognitiveLoad}</span>` : ''}
              ${m.brain_area || m.brainArea ? `<span class="chip">${m.brain_area || m.brainArea}</span>` : ''}
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
      try {
        const { saveLocalMemories } = await import('../lib/indexedDb.js');
        await saveLocalMemories(data.memories || []);
        localStorage.setItem('thought_gps_last_backup', new Date().toISOString());
        renderBackupWarning();
      } catch (e) {
        console.error('IndexedDB backup failed:', e);
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'thought-gps-memories.json'; a.click();
    }
  });

  container.querySelector('#import-btn').addEventListener('click', () => {
    container.querySelector('#import-file-input').click();
  });

  container.querySelector('#import-file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const memories = parsed.memories || parsed.results || [];
        if (memories.length === 0) {
          alert('No memories found in the backup file.');
          return;
        }

        const { saveLocalMemories } = await import('../lib/indexedDb.js');
        await saveLocalMemories(memories);
        alert(`Success: Imported ${memories.length} memories into local device storage!`);
        loadMems();
      } catch (err) {
        alert('Failed to parse backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  renderBackupWarning();
  loadMems();
  return container;
}
function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
window.deleteMem = async (id) => {
  if (confirm('Delete this memory?')) {
    try {
      await api.del(`/memory/${id}`);
    } catch (e) {}
    try {
      const { deleteLocalMemory } = await import('../lib/indexedDb.js');
      await deleteLocalMemory(id);
    } catch (e) {}
    window.showPage('memory');
  }
};
