// Thought Export - Download thoughts as JSON or CSV
import api from '../lib/api.js';

export function ThoughtExport() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary);font-size:28px;">download</span>
          <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0;">Thought Export</h1>
        </div>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          Your thoughts, your data. Export everything, anytime. Full portability — JSON or CSV.
        </p>
      </div>

      <!-- Filters -->
      <div class="surface-card card-reveal" style="padding:1.5rem;margin-top:1.5rem;">
        <h2 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Filter Thoughts</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;">
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);display:block;margin-bottom:0.35rem;">Category</label>
            <select id="filter-category" class="input-m3">
              <option value="">All Categories</option>
              <option value="health">Health</option>
              <option value="finance">Finance</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="errand">Errand</option>
              <option value="commitment">Commitment</option>
            </select>
          </div>
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);display:block;margin-bottom:0.35rem;">Status</label>
            <select id="filter-status" class="input-m3">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="pending_clarification">Pending Clarification</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);display:block;margin-bottom:0.35rem;">Format</label>
            <select id="filter-format" class="input-m3">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1.25rem;">
          <button class="btn-m3 btn-filled" id="btn-preview">
            <span class="material-symbols-rounded" style="font-size:18px;">preview</span>
            Preview
          </button>
          <button class="btn-m3 btn-tonal" id="btn-download">
            <span class="material-symbols-rounded" style="font-size:18px;">download</span>
            Download
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div id="export-stats" class="card-reveal" style="margin-top:1.5rem;display:none;">
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;">
          <span style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">
            Total: <strong id="stat-total" style="color:var(--md-sys-color-primary);">0</strong> thoughts
          </span>
          <span style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">
            Exported: <strong id="stat-exported" style="color:var(--md-sys-color-secondary);">—</strong>
          </span>
        </div>
      </div>

      <!-- Preview -->
      <div id="preview-section" class="card-reveal" style="margin-top:1.5rem;display:none;">
        <h2 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.75rem;">Preview</h2>
        <pre id="export-preview" class="export-preview" style="max-height:400px;overflow:auto;"></pre>
      </div>
    </div>`;

  let cachedData = null;

  async function loadPreview() {
    const category = container.querySelector('#filter-category').value;
    const status = container.querySelector('#filter-status').value;
    const params = new URLSearchParams({ format: 'json' });
    if (category) params.set('category', category);
    if (status) params.set('status', status);

    const data = await api.get(`/memory/export?${params}`);
    if (data.error) {
      container.querySelector('#preview-section').style.display = 'block';
      container.querySelector('#export-preview').textContent = `Error: ${data.error}`;
      return;
    }

    cachedData = data;
    container.querySelector('#export-stats').style.display = 'block';
    container.querySelector('#stat-total').textContent = data.total || 0;
    container.querySelector('#stat-exported').textContent = new Date(data.exportedAt).toLocaleString();

    container.querySelector('#preview-section').style.display = 'block';
    const preview = (data.memories || []).slice(0, 20);
    container.querySelector('#export-preview').textContent = JSON.stringify(preview, null, 2);
  }

  async function downloadExport() {
    const category = container.querySelector('#filter-category').value;
    const status = container.querySelector('#filter-status').value;
    const format = container.querySelector('#filter-format').value;
    const params = new URLSearchParams({ format });
    if (category) params.set('category', category);
    if (status) params.set('status', status);

    if (format === 'csv') {
      // Download CSV via fetch
      const token = localStorage.getItem('tg_token');
      const resp = await fetch(`/api/memory/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'thought-gps-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // JSON download
      if (!cachedData) {
        cachedData = await api.get(`/memory/export?${params}`);
      }
      const blob = new Blob([JSON.stringify(cachedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'thought-gps-export.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  container.querySelector('#btn-preview')?.addEventListener('click', loadPreview);
  container.querySelector('#btn-download')?.addEventListener('click', downloadExport);

  // Auto-load preview on mount
  loadPreview();
  return container;
}
