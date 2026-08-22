// Memory - Real memories from DB with search and export
import api from '../lib/api.js';
import { toast } from '../lib/toast.js';

export function Memory() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-container">
      <div class="section-header card-reveal"><span class="material-symbols-rounded" style="color:var(--md-sys-color-primary);">memory</span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">Memory Archive</h1>
      </div>
      <div id="backup-warning"></div>

      <!-- Shared Memories Section -->
      <div class="surface-card card-reveal" style="padding:1rem;margin-bottom:1rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0;display:flex;align-items:center;gap:0.5rem;">
            <span class="material-symbols-rounded" style="font-size:18px;">people</span>
            Shared With Me
          </h3>
          <span id="shared-count" class="chip" style="font-size:11px;">0</span>
        </div>
        <div id="shared-list" style="max-height:200px;overflow-y:auto;">
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);padding:0.5rem 0;">Loading...</div>
        </div>
      </div>

      <div class="card-reveal" style="display:flex;gap:0.75rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        <input type="text" id="mem-search" class="input-m3" placeholder="Search memories..." style="flex:1;min-width:200px;">
        <button class="btn-m3 btn-outlined" id="search-btn"><span class="material-symbols-rounded" style="font-size:18px;">search</span></button>
        <button class="btn-m3 btn-tonal" id="export-btn"><span class="material-symbols-rounded" style="font-size:18px;">download</span> Export</button>
        <button class="btn-m3 btn-tonal" id="import-btn"><span class="material-symbols-rounded" style="font-size:18px;">upload</span> Import</button>
        <input type="file" id="import-file-input" style="display:none;" accept=".json">
      </div>
      <div id="mem-list" class="card-reveal"><div class="anim-shimmer" style="height:200px;"></div></div>

      <!-- Share Modal -->
      <div id="share-modal" style="display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.8);align-items:center;justify-content:center;padding:1rem;">
        <div class="glass-strong" style="width:100%;max-width:400px;border-radius:var(--md-sys-shape-extra-large);padding:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="font:var(--md-sys-typescale-title-medium);margin:0;">Share Memory</h3>
            <button class="icon-btn" onclick="document.getElementById('share-modal').style.display='none'" aria-label="Close"><span class="material-symbols-rounded">close</span></button>
          </div>
          <input type="email" id="share-email" class="input-m3" placeholder="User's email address..." style="width:100%;margin-bottom:0.75rem;">
          <select id="share-permission" class="input-m3" style="width:100%;margin-bottom:0.75rem;">
            <option value="view">Can view</option>
            <option value="comment">Can comment</option>
            <option value="edit">Can edit</option>
          </select>
          <button class="btn-m3 btn-filled" id="share-confirm-btn" style="width:100%;">Share</button>
        </div>
      </div>

      <!-- Trace Modal -->
      <div id="trace-modal" style="display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.8);align-items:center;justify-content:center;padding:1rem;">
        <div class="glass-strong" style="width:100%;max-width:600px;max-height:80vh;overflow-y:auto;border-radius:var(--md-sys-shape-extra-large);padding:2rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
            <h2 style="font:var(--md-sys-typescale-title-large);margin:0;">Cognitive Trace</h2>
            <button class="icon-btn" onclick="document.getElementById('trace-modal').style.display='none'" aria-label="Close trace modal"><span class="material-symbols-rounded">close</span></button>
          </div>
          <div id="trace-timeline" style="display:flex;flex-direction:column;gap:1rem;"></div>
        </div>
      </div>
    </div>`;

  function renderBackupWarning() {
    const lastBackup = localStorage.getItem('mentally_last_backup');
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
        <div class="surface-card liquid-glass" style="margin-bottom:1.5rem; border:1px solid rgba(204,255,0,0.26) !important; padding:1rem; display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; background:rgba(204,255,0,0.035);">
          <div style="flex:1;">
            <div style="font-weight:600; color:var(--color-analytical); margin-bottom:0.25rem; display:flex; align-items:center; gap:0.5rem; font-family:var(--font-heading); letter-spacing:-0.01em;">
              <span class="material-symbols-rounded" style="font-size:18px;">archive</span>
              Storage Conservation Alert
            </div>
            <div style="font:var(--md-sys-typescale-body-small); color:var(--md-sys-color-on-surface-variant); line-height:1.6;">
              Raw thoughts older than ~5 days are periodically purged. Click Export to back up your full cognitive history to your local browser index.
            </div>
          </div>
          <button class="btn-m3 btn-filled" id="warning-export-btn">Export</button>
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
          <div style="display:flex;gap:0.25rem;">
            <button class="icon-btn" onclick="shareMemory('${m.id}')" title="Share">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-secondary);">share</span>
            </button>
            <button class="icon-btn" onclick="deleteMem('${m.id}')" title="Delete">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-error);">delete</span>
            </button>
          </div>
        </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem;">
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${new Date(m.createdAt || m.created_at).toLocaleDateString()}</div>
          <button class="btn-m3 btn-tonal" onclick="window.viewTrace('${m.id}')" style="padding:0 0.75rem;height:28px;"><span class="material-symbols-rounded" style="font-size:16px;">timeline</span> Trace</button>
        </div>
      </div>`).join('');
  }

  window.viewTrace = async (id) => {
    try {
      const data = await api.get('/memory/' + id + '/traces');
      const containerEl = document.getElementById('trace-timeline');
      if (!data.traces || data.traces.length === 0) {
        containerEl.innerHTML = '<div style="color:var(--md-sys-color-outline);">No traces available for this thought.</div>';
      } else {
        containerEl.innerHTML = data.traces.map((t, i) => `
          <div style="padding-left:1.5rem;border-left:2px solid var(--md-sys-color-primary);position:relative;">
            <div style="position:absolute;left:-6px;top:0;width:10px;height:10px;border-radius:50%;background:var(--md-sys-color-primary);"></div>
            <div style="font-weight:bold;margin-bottom:0.25rem;text-transform:uppercase;font-size:12px;color:var(--md-sys-color-primary);">${t.span_name}</div>
            <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);background:rgba(255,255,255,0.05);padding:0.75rem;border-radius:8px;">
              ${t.output ? JSON.stringify(t.output, null, 2).substring(0, 300) + (JSON.stringify(t.output).length > 300 ? '...' : '') : (t.status || 'pending')}
            </div>
          </div>
        `).join('');
      }
      document.getElementById('trace-modal').style.display = 'flex';
    } catch (e) {
      console.error(e);
    }
  };

  container.querySelector('#search-btn').addEventListener('click', () => loadMems(container.querySelector('#mem-search').value));
  container.querySelector('#mem-search').addEventListener('keydown', e => { if (e.key === 'Enter') loadMems(e.target.value); });
  container.querySelector('#export-btn').addEventListener('click', async () => {
    const data = await api.get('/memory/export?format=json');
    if (!data.error) {
      try {
        const { saveLocalMemories } = await import('../lib/indexedDb.js');
        await saveLocalMemories(data.memories || []);
        localStorage.setItem('mentally_last_backup', new Date().toISOString());
        renderBackupWarning();
      } catch (e) {
        console.error('IndexedDB backup failed:', e);
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mentally-memories.json'; a.click();
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
        if (!Array.isArray(memories) || memories.length === 0) {
          toast.show('No memories found in the backup file.', 'error');
          return;
        }

        const { saveLocalMemories } = await import('../lib/indexedDb.js');
        await saveLocalMemories(memories);
        toast.show(`Success: Imported ${memories.length} memories into local device storage!`, 'success');
        loadMems();
      } catch (err) {
        toast.show('Failed to parse backup file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  });

  async function loadSharedMemories() {
    try {
      const data = await api.get('/sharing');
      const el = container.querySelector('#shared-list');
      const countEl = container.querySelector('#shared-count');
      if (!data.shared || data.shared.length === 0) {
        el.innerHTML = '<div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);padding:0.5rem 0;">No memories shared with you.</div>';
        if (countEl) countEl.textContent = '0';
        return;
      }
      if (countEl) countEl.textContent = data.shared.length;
      el.innerHTML = data.shared.map(s => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <div style="flex:1;">
            <div style="font:var(--md-sys-typescale-body-small);">${escHtml(s.content || '(no content)')}</div>
            <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);font-size:11px;">
              From: ${escHtml(s.owner_email)} · ${s.permission}
            </div>
          </div>
        </div>
      `).join('');
    } catch {
      const el = container.querySelector('#shared-list');
      if (el) el.innerHTML = '<div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);padding:0.5rem 0;">Sharing unavailable</div>';
    }
  }

  renderBackupWarning();
  loadMems();
  loadSharedMemories();
  return container;
}
function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
window.shareMemory = (memoryId) => {
  const modal = document.getElementById('share-modal');
  const emailInput = document.getElementById('share-email');
  const permSelect = document.getElementById('share-permission');
  const confirmBtn = document.getElementById('share-confirm-btn');
  if (!modal || !emailInput) return;
  emailInput.value = '';
  permSelect.value = 'view';
  modal.style.display = 'flex';
  confirmBtn.onclick = async () => {
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) { toast.show('Enter a valid email', 'error'); return; }
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Sharing...';
    const res = await api.post('/sharing/share', { memoryId, email, permission: permSelect.value });
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Share';
    if (res.error) toast.show(res.error, 'error');
    else { toast.show('Shared!', 'success'); modal.style.display = 'none'; }
  };
};
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
