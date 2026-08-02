// Commitments - Active commitment tracker with witness status
import api from '../lib/api.js';

export function Commitments() {
  const container = document.createElement('div');

  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
          <div>
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
              <span class="material-symbols-rounded" style="color:var(--md-sys-color-secondary);font-size:28px;">task_alt</span>
              <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0;">Commitments</h1>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
              Track promises, deadlines, and witness accountability.
            </p>
          </div>
          <button class="btn-m3 btn-filled" id="btn-add-commitment">
            <span class="material-symbols-rounded" style="font-size:18px;">add</span>
            New Commitment
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-top:1.5rem;">
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Active</div>
          <div id="stat-active" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-primary);">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Overdue</div>
          <div id="stat-overdue" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-error);">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">With Witness</div>
          <div id="stat-witness" style="font:var(--md-sys-typescale-headline-large);color:var(--md-sys-color-secondary);">—</div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.25rem;text-align:center;">
          <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-outline);">Completed</div>
          <div id="stat-completed" style="font:var(--md-sys-typescale-headline-large);color:var(--color-success);">—</div>
        </div>
      </div>

      <!-- Commitments list -->
      <div id="commitments-list" style="margin-top:1.5rem;display:flex;flex-direction:column;gap:1rem;">
        <div class="surface-card" style="padding:2rem;text-align:center;">
          <div class="spinner-m3" style="margin:0 auto;"></div>
          <p style="color:var(--md-sys-color-outline);margin-top:1rem;">Loading commitments...</p>
        </div>
      </div>
    </div>

    <!-- Add Commitment Dialog -->
    <div id="add-dialog" class="dialog-overlay" style="display:none;">
      <div class="glass-strong" style="width:100%;max-width:480px;border-radius:var(--md-sys-shape-extra-large);padding:2rem;">
        <h2 style="font:var(--md-sys-typescale-headline-small);margin:0 0 1.5rem;">New Commitment</h2>
        <form id="commitment-form" style="display:flex;flex-direction:column;gap:1rem;">
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">What did you commit to?</label>
            <input type="text" id="c-value" class="input-m3" placeholder="e.g., Submit proposal by Friday" required>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div>
              <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Deadline</label>
              <input type="datetime-local" id="c-deadline" class="input-m3">
            </div>
            <div>
              <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Category</label>
              <input type="text" id="c-category" class="input-m3" placeholder="work, personal...">
            </div>
          </div>
          <div>
            <label style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:0.35rem;">Witness (email or name)</label>
            <input type="text" id="c-witness" class="input-m3" placeholder="accountability partner">
          </div>
          <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:0.5rem;">
            <button type="button" class="btn-m3 btn-text" id="btn-cancel">Cancel</button>
            <button type="submit" class="btn-m3 btn-filled">Save Commitment</button>
          </div>
        </form>
      </div>
    </div>`;

  async function loadData() {
    const data = await api.get('/features/commitments');
    if (data.error) {
      container.querySelector('#commitments-list').innerHTML =
        `<div class="surface-card" style="padding:2rem;text-align:center;color:var(--md-sys-color-error);">
          ${data.offline ? 'Server offline' : data.error}
        </div>`;
      return;
    }

    const commitments = data.commitments || [];
    const active = commitments.filter(c => c.status !== 'completed');
    const overdue = active.filter(c => c.overdue || (c.days_until != null && c.days_until < 0));
    const withWitness = active.filter(c => c.witness_contact);
    const completed = commitments.filter(c => c.status === 'completed');

    container.querySelector('#stat-active').textContent = active.length;
    container.querySelector('#stat-overdue').textContent = overdue.length;
    container.querySelector('#stat-witness').textContent = withWitness.length;
    container.querySelector('#stat-completed').textContent = completed.length;

    renderList(commitments);
  }

  function renderList(commitments) {
    const list = container.querySelector('#commitments-list');

    if (commitments.length === 0) {
      list.innerHTML = `<div class="surface-card" style="padding:3rem;text-align:center;">
        <span class="material-symbols-rounded" style="font-size:56px;color:var(--md-sys-color-outline);">task_alt</span>
        <p style="font:var(--md-sys-typescale-body-large);color:var(--md-sys-color-on-surface-variant);margin-top:1rem;">No commitments yet</p>
        <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Add your first commitment to start tracking accountability.</p>
      </div>`;
      return;
    }

    list.innerHTML = commitments.map(c => {
      const isOverdue = c.overdue || (c.days_until != null && c.days_until < 0);
      const isCompleted = c.status === 'completed';
      const daysUntil = c.days_until;
      const borderColor = isCompleted ? 'var(--color-success)' : isOverdue ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-secondary)';

      let timeLabel = '';
      if (isCompleted) timeLabel = 'Completed';
      else if (isOverdue) timeLabel = `${Math.abs(daysUntil)}d overdue`;
      else if (daysUntil === 0) timeLabel = 'Due today';
      else if (daysUntil === 1) timeLabel = 'Due tomorrow';
      else if (daysUntil != null) timeLabel = `${daysUntil}d remaining`;

      // Witness status
      const hasWitness = !!c.witness_contact;
      const witnessNotified = !!c.witness_notified;
      const witnessStatus = hasWitness
        ? (witnessNotified ? 'Notified' : 'Pending')
        : 'No witness';
      const witnessColor = witnessNotified ? 'var(--color-success)' : hasWitness ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-outline)';

      // Deadline display
      const deadlineDisplay = c.expires_at
        ? new Date(c.expires_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : c.deadline_epoch
          ? new Date(c.deadline_epoch).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : 'No deadline';

      return `<div class="surface-card card-reveal" style="padding:1.25rem;border-left:3px solid ${borderColor};${isCompleted ? 'opacity:0.6;' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;flex-wrap:wrap;">
              ${isCompleted
                ? `<span class="material-symbols-rounded" style="font-size:20px;color:var(--color-success);">check_circle</span>`
                : isOverdue
                  ? `<span class="material-symbols-rounded" style="font-size:20px;color:var(--md-sys-color-error);">error</span>`
                  : `<span class="material-symbols-rounded" style="font-size:20px;color:var(--md-sys-color-secondary);">schedule</span>`
              }
              <span style="font:var(--md-sys-typescale-label-small);color:${borderColor};background:${borderColor}15;padding:2px 8px;border-radius:var(--md-sys-shape-full);">${timeLabel}</span>
              ${c.category ? `<span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);background:var(--md-sys-color-surface-container);padding:2px 8px;border-radius:var(--md-sys-shape-full);">${c.category}</span>` : ''}
            </div>
            <p style="font:var(--md-sys-typescale-body-large);margin:0 0 0.5rem;${isCompleted ? 'text-decoration:line-through;' : ''}">${c.value || 'Untitled commitment'}</p>
            <div style="display:flex;align-items:center;gap:0.75rem;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);flex-wrap:wrap;">
              <span style="display:flex;align-items:center;gap:0.25rem;">
                <span class="material-symbols-rounded" style="font-size:14px;">calendar_today</span>
                ${deadlineDisplay}
              </span>
              <span style="display:flex;align-items:center;gap:0.25rem;color:${witnessColor};">
                <span class="material-symbols-rounded" style="font-size:14px;">${witnessNotified ? 'verified_user' : hasWitness ? 'person' : 'person_off'}</span>
                ${witnessStatus}${hasWitness ? `: ${c.witness_contact}` : ''}
              </span>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;">
            ${!isCompleted && !hasWitness ? `<button class="btn-m3 btn-icon" title="Add witness" onclick="addWitness(${c.id})">
              <span class="material-symbols-rounded" style="font-size:20px;color:var(--md-sys-color-tertiary);">person_add</span>
            </button>` : ''}
            ${!isCompleted ? `<button class="btn-m3 btn-icon" title="Mark complete" onclick="completeCommitment(${c.id})">
              <span class="material-symbols-rounded" style="font-size:20px;color:var(--color-success);">check_circle</span>
            </button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');

    setTimeout(() => {
      list.querySelectorAll('.card-reveal').forEach((el, i) => {
        setTimeout(() => el.classList.add('revealed'), i * 60);
      });
    }, 50);
  }

  // Add commitment dialog
  const dialog = container.querySelector('#add-dialog');
  container.querySelector('#btn-add-commitment').addEventListener('click', () => {
    dialog.style.display = 'flex';
  });
  container.querySelector('#btn-cancel').addEventListener('click', () => {
    dialog.style.display = 'none';
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.style.display = 'none';
  });

  container.querySelector('#commitment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = container.querySelector('#c-value').value.trim();
    const deadline = container.querySelector('#c-deadline').value;
    const category = container.querySelector('#c-category').value.trim();
    const witness = container.querySelector('#c-witness').value.trim();

    const result = await api.post('/memory', {
      attribute: 'commitment.active',
      value,
      category: category || 'commitment',
      witness_contact: witness || null,
      deadline_epoch: deadline ? new Date(deadline).getTime() : null,
    });

    if (!result.error) {
      dialog.style.display = 'none';
      container.querySelector('#commitment-form').reset();
      loadData();
    }
  });

  // Global complete handler
  window.completeCommitment = async (id) => {
    const result = await api.put(`/memory/${id}/complete`, { status: 'completed' });
    if (!result.error) loadData();
  };

  // Global add witness handler
  window.addWitness = async (id) => {
    const contact = prompt('Enter witness name or email:');
    if (!contact) return;
    const result = await api.post(`/features/commitments/${id}/witness`, { witness_contact: contact });
    if (!result.error) loadData();
  };

  loadData();
  return container;
}
