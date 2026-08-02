// Thought Afterlife - Half-life decay visualization
import api from '../lib/api.js';

export function ThoughtAfterlife() {
  const container = document.createElement('div');

  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary);font-size:28px;">hourglass_empty</span>
          <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0;">Thought Afterlife</h1>
        </div>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          Watch your thoughts decay — or escalate. Urgent items glow hotter as their half-life expires.
        </p>
      </div>

      <!-- Stats Row -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:1.5rem;">
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Active Thoughts</div>
          <div id="stat-active" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-primary);">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Expiring Soon</div>
          <div id="stat-expiring" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-error);">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Escalated</div>
          <div id="stat-escalated" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-tertiary);">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Archived</div>
          <div id="stat-archived" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-secondary);">—</div>
        </div>
      </div>

      <!-- Tier Filter Chips -->
      <div class="card-reveal" style="display:flex;gap:0.5rem;margin-top:1.5rem;flex-wrap:wrap;">
        <button class="chip-m3 active" data-filter="all">All</button>
        <button class="chip-m3" data-filter="critical">Critical (&lt;2h)</button>
        <button class="chip-m3" data-filter="high">High (&lt;24h)</button>
        <button class="chip-m3" data-filter="medium">Medium</button>
        <button class="chip-m3" data-filter="low">Low</button>
        <button class="chip-m3" data-filter="archived">Archived</button>
      </div>

      <!-- Thoughts List -->
      <div id="thoughts-list" style="margin-top:1.5rem;display:flex;flex-direction:column;gap:1rem;">
        <div class="surface-card" style="padding:2rem;text-align:center;">
          <div class="spinner-m3" style="margin:0 auto;"></div>
          <p style="color:var(--md-sys-color-outline);margin-top:1rem;">Loading thought decay data...</p>
        </div>
      </div>

      <!-- Archived Section -->
      <div class="card-reveal" style="margin-top:2rem;">
        <details>
          <summary style="font:var(--md-sys-typescale-title-medium);color:var(--md-sys-color-on-surface-variant);cursor:pointer;padding:0.5rem 0;">
            <span class="material-symbols-rounded" style="vertical-align:middle;font-size:18px;">archive</span>
            Expired Thoughts Archive
          </summary>
          <div id="archived-list" style="margin-top:1rem;display:flex;flex-direction:column;gap:0.75rem;">
            <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Loading...</p>
          </div>
        </details>
      </div>
    </div>`;

  let allThoughts = [];
  let currentFilter = 'all';

  async function loadData() {
    const data = await api.get('/features/half-life');
    if (data.error) {
      container.querySelector('#thoughts-list').innerHTML =
        `<div class="surface-card" style="padding:2rem;text-align:center;color:var(--md-sys-color-error);">
          ${data.offline ? 'Server offline' : data.error}
        </div>`;
      return;
    }

    allThoughts = data.thoughts || [];
    const archived = allThoughts.filter(t => t.archived || t.status === 'expired');
    const active = allThoughts.filter(t => !t.archived && t.status !== 'expired');
    const expiring = active.filter(t => (t.hours_remaining || 999) < 24);
    const escalated = active.filter(t => (t.notified_tier || 0) >= 2);

    container.querySelector('#stat-active').textContent = active.length;
    container.querySelector('#stat-expiring').textContent = expiring.length;
    container.querySelector('#stat-escalated').textContent = escalated.length;
    container.querySelector('#stat-archived').textContent = archived.length;

    renderThoughts(active);
    renderArchived(archived);
  }

  function renderThoughts(thoughts) {
    const list = container.querySelector('#thoughts-list');
    let filtered = thoughts;

    if (currentFilter === 'critical') filtered = thoughts.filter(t => t.urgency_tier === 'critical' || (t.hours_remaining || 999) < 2);
    else if (currentFilter === 'high') filtered = thoughts.filter(t => t.urgency_tier === 'high' || ((t.hours_remaining || 999) >= 2 && (t.hours_remaining || 999) < 24));
    else if (currentFilter === 'medium') filtered = thoughts.filter(t => t.urgency_tier === 'medium');
    else if (currentFilter === 'low') filtered = thoughts.filter(t => t.urgency_tier === 'low');

    if (filtered.length === 0) {
      list.innerHTML = `<div class="surface-card" style="padding:2rem;text-align:center;">
        <span class="material-symbols-rounded" style="font-size:48px;color:var(--md-sys-color-outline);">check_circle</span>
        <p style="color:var(--md-sys-color-outline);margin-top:0.5rem;">No thoughts in this category</p>
      </div>`;
      return;
    }

    list.innerHTML = filtered.map(t => {
      const hrs = t.hours_remaining ?? 999;
      const pct = t.half_life_hours ? Math.max(0, Math.min(100, (hrs / t.half_life_hours) * 100)) : 100;
      const tierColor = hrs < 2 ? 'var(--md-sys-color-error)' : hrs < 24 ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-secondary)';
      const tierLabel = hrs < 2 ? 'CRITICAL' : hrs < 24 ? 'URGENT' : 'STABLE';
      const tierIcon = hrs < 2 ? 'warning' : hrs < 24 ? 'schedule' : 'hourglass_full';
      const escLevel = t.notified_tier || 0;

      return `<div class="surface-card card-reveal" style="padding:1.25rem;border-left:3px solid ${tierColor};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
              <span class="material-symbols-rounded" style="font-size:18px;color:${tierColor};">${tierIcon}</span>
              <span style="font:var(--md-sys-typescale-label-small);color:${tierColor};background:${tierColor}15;padding:2px 8px;border-radius:var(--md-sys-shape-full);">${tierLabel}</span>
              ${escLevel >= 2 ? `<span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-error);background:rgba(255,138,158,.1);padding:2px 8px;border-radius:var(--md-sys-shape-full);">ESCALATED x${escLevel}</span>` : ''}
              ${t.urgency_tier ? `<span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">${t.urgency_tier}</span>` : ''}
            </div>
            <p style="font:var(--md-sys-typescale-body-large);margin:0 0 0.5rem;">${t.value || t.attribute || 'Untitled thought'}</p>
            <div style="display:flex;gap:1rem;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">
              ${t.category ? `<span>${t.category}</span>` : ''}
              ${t.action_verb ? `<span>Action: ${t.action_verb}</span>` : ''}
              ${t.half_life_hours ? `<span>Half-life: ${t.half_life_hours}h</span>` : ''}
            </div>
          </div>
          <div style="text-align:right;min-width:100px;">
            <div style="font:var(--md-sys-typescale-title-small);color:${tierColor};">${hrs < 1 ? '< 1h' : `${Math.round(hrs)}h`}</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">remaining</div>
            ${t.expires_at ? `<div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);margin-top:2px;" title="Expires: ${new Date(t.expires_at).toLocaleString()}">⏱ ${formatCountdown(t.expires_at)}</div>` : ''}
          </div>
        </div>
        <!-- Decay bar -->
        <div style="margin-top:0.75rem;height:4px;border-radius:2px;background:var(--md-sys-color-surface-container-highest);overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${tierColor};border-radius:2px;transition:width 0.5s ease;"></div>
        </div>
        <!-- 3-tier escalation indicators -->
        <div style="display:flex;gap:0.35rem;margin-top:0.5rem;">
          <div style="width:8px;height:8px;border-radius:50%;background:${escLevel >= 1 ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-outline-variant)'};" title="Nudge 1 (50%)"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:${escLevel >= 2 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-outline-variant)'};" title="Nudge 2 (25%)"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:${escLevel >= 3 ? '#ff1744' : 'var(--md-sys-color-outline-variant)'};" title="Final (expired)"></div>
          <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);margin-left:0.25rem;">Escalation level</span>
        </div>
      </div>`;
    }).join('');

    // Stagger reveal
    setTimeout(() => {
      list.querySelectorAll('.card-reveal').forEach((el, i) => {
        setTimeout(() => el.classList.add('revealed'), i * 60);
      });
    }, 50);
  }

  function renderArchived(archived) {
    const list = container.querySelector('#archived-list');
    if (archived.length === 0) {
      list.innerHTML = `<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No expired thoughts yet.</p>`;
      return;
    }
    list.innerHTML = archived.slice(0, 20).map(t =>
      `<div class="surface-card" style="padding:0.75rem 1rem;opacity:0.7;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font:var(--md-sys-typescale-body-medium);">${t.value || t.attribute || 'Untitled'}</span>
          <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">${t.category || ''}</span>
        </div>
      </div>`
    ).join('');
  }

  // Filter chip handlers
  container.querySelectorAll('.chip-m3').forEach(chip => {
    chip.addEventListener('click', () => {
      currentFilter = chip.dataset.filter;
      container.querySelectorAll('.chip-m3').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const active = allThoughts.filter(t => !t.archived && t.status !== 'expired');
      renderThoughts(active);
    });
  });

  loadData();
  // Live countdown ticker
  setInterval(() => {
    container.querySelectorAll('[data-expires]').forEach(el => {
      const exp = el.dataset.expires;
      if (exp) el.textContent = formatCountdown(exp);
    });
  }, 60000);
  return container;
}

function formatCountdown(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return 'Expired';
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs >= 24) return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}
