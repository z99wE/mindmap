// Thought Export - Download thoughts as JSON or CSV
import api from '../lib/api.js';
import { toast } from '../lib/toast.js';

export function ThoughtExport() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
          <span class="dot" style="width:10px;height:10px;background:var(--md-sys-color-primary);box-shadow:0 0 12px rgba(204,255,0,0.3);"></span>
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
            <label for="filter-category" style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);display:block;margin-bottom:0.35rem;">Category</label>
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
            <label for="filter-status" style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);display:block;margin-bottom:0.35rem;">Status</label>
            <select id="filter-status" class="input-m3">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="pending_clarification">Pending Clarification</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label for="filter-format" style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);display:block;margin-bottom:0.35rem;">Format</label>
            <select id="filter-format" class="input-m3">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="markdown">Markdown (.md)</option>
              <option value="vortex">I am thinking (Vortex JSON)</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1.25rem;">
          <button class="btn-m3 btn-filled" id="btn-download" aria-label="Download exported thoughts">
            Download Export
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

      <!-- Preview section removed -->
    </div>`;

  async function downloadExport() {
    const category = container.querySelector('#filter-category').value;
    const status = container.querySelector('#filter-status').value;
    const format = container.querySelector('#filter-format').value;
    const params = new URLSearchParams({ format });
    if (category) params.set('category', category);
    if (status) params.set('status', status);

    const token = localStorage.getItem('mentally_token');
    
    // For CSV and Markdown, download directly via fetch
    if (format === 'csv' || format === 'markdown') {
      const resp = await fetch(`/api/memory/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mentally-export.${format === 'markdown' ? 'md' : 'csv'}`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // JSON and Vortex download
      const data = await api.get(`/memory/export?${params}`);
      if (data.error) {
        toast.show(`Export failed: ${data.error}`, 'error');
        return;
      }
      
      const fileName = format === 'vortex' ? 'mentally-vortex-map.json' : 'mentally-export.json';
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  container.querySelector('#btn-download')?.addEventListener('click', downloadExport);

  return container;
}
