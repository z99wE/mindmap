// NotificationsLog - Notification history with delivery status
import api from '../lib/api.js';

export function NotificationsLog() {
  const container = document.createElement('div');

  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
          <div>
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
              <span class="dot" style="width:10px;height:10px;background:var(--md-sys-color-tertiary);box-shadow:0 0 12px rgba(16,185,129,0.3);"></span>
              <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0;">Notifications</h1>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
              Auto-signaled alerts from half-life decay, departure warnings, drift nudges, and more.
            </p>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn-m3 btn-outlined" id="btn-mark-all-read">
              Mark All Read
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="card-reveal" style="display:flex;gap:0.5rem;margin-top:1.5rem;flex-wrap:wrap;">
        <button class="chip-m3 active" data-filter="all">All</button>
        <button class="chip-m3" data-filter="unread">Unread</button>
        <button class="chip-m3" data-filter="half_life_nudge">Half-Life</button>
        <button class="chip-m3" data-filter="departure_alert">Departure</button>
        <button class="chip-m3" data-filter="drift_nudge">Drift</button>
        <button class="chip-m3" data-filter="commitment_witness">Commitment</button>
        <button class="chip-m3" data-filter="door_rule">Door Rule</button>
        <button class="chip-m3" data-filter="thought_revival">Revival</button>
      </div>

      <!-- Notification list -->
      <div id="notif-list" style="margin-top:1.5rem;display:flex;flex-direction:column;gap:0.75rem;">
        <div class="surface-card" style="padding:2rem;text-align:center;">
          <div class="tg-skeleton tg-skeleton--title"></div><div class="tg-skeleton"></div>
          <p style="color:var(--md-sys-color-outline);margin-top:1rem;">Loading notifications...</p>
        </div>
      </div>
    </div>`;

  let allNotifs = [];
  let currentFilter = 'all';

  async function loadData() {
    const data = await api.get('/notifications');
    if (data.error) {
      container.querySelector('#notif-list').innerHTML =
        `<div class="surface-card" style="padding:2rem;text-align:center;color:var(--md-sys-color-error);">
          ${data.offline ? 'Server offline' : data.error}
        </div>`;
      return;
    }

    allNotifs = data.notifications || [];
    renderList();
  }

  function renderList() {
    const list = container.querySelector('#notif-list');
    let filtered = allNotifs;

    if (currentFilter === 'unread') filtered = allNotifs.filter(n => !n.read);
    else if (currentFilter !== 'all') filtered = allNotifs.filter(n => n.type === currentFilter);

    if (filtered.length === 0) {
      list.innerHTML = `<div class="surface-card" style="padding:3rem;text-align:center;">
        <p class="mono-label" style="font-size:14px;color:var(--md-sys-color-outline);">NO NOTIFICATIONS</p>
        <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.5rem;">
          ${currentFilter === 'all' ? 'Auto-signaled alerts will appear here.' : `No ${currentFilter} notifications.`}
        </p>
      </div>`;
      return;
    }

    const typeMeta = {
      half_life_nudge: { color: 'var(--md-sys-color-tertiary)', label: 'HALF-LIFE' },
      departure_alert: { color: 'var(--md-sys-color-error)', label: 'DEPARTURE' },
      drift_nudge: { color: 'var(--md-sys-color-primary)', label: 'DRIFT' },
      commitment_witness: { color: 'var(--md-sys-color-secondary)', label: 'WITNESS' },
      door_rule: { color: 'var(--md-sys-color-tertiary)', label: 'DOOR' },
      thought_revival: { color: 'var(--md-sys-color-primary)', label: 'REVIVAL' },
    };

    list.innerHTML = filtered.map(n => {
      const typeInfo = typeMeta[n.type] || { color: 'var(--md-sys-color-outline)', label: 'NOTIF' };
      const isUnread = !n.read;
      const timeAgo = getTimeAgo(n.sent_at || n.created_at);

      return `<div class="surface-card card-reveal" style="padding:1rem 1.25rem;${isUnread ? '' : 'opacity:0.65;'}cursor:pointer;" data-id="${n.id}" onclick="markRead(${n.id})">
        <div style="display:flex;align-items:flex-start;gap:0.75rem;">
          <div style="width:40px;height:40px;border-radius:var(--md-sys-shape-medium);background:${typeInfo.color}15;display:grid;place-items:center;flex-shrink:0;">
            <span class="mono-label" style="color:${typeInfo.color};font-size:8px;">${typeInfo.label}</span>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
              <span style="font:var(--md-sys-typescale-title-small);${isUnread ? 'color:var(--md-sys-color-on-surface);' : 'color:var(--md-sys-color-on-surface-variant);'}">${formatType(n.type)}</span>
              <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);white-space:nowrap;">${timeAgo}</span>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);margin:0.25rem 0 0;color:var(--md-sys-color-on-surface-variant);">${n.message || ''}</p>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem;align-items:center;">
              ${n.channel ? `<span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);background:var(--md-sys-color-surface-container);padding:1px 6px;border-radius:var(--md-sys-shape-extra-small);">${n.channel}</span>` : ''}
              ${n.delivered
                ? `<span class="mono-label" style="color:var(--color-success);font-size:9px;">SENT</span>`
                : `<span class="mono-label" style="color:var(--md-sys-color-outline);font-size:9px;">PENDING</span>`
              }
              ${isUnread ? `<span style="width:8px;height:8px;border-radius:50%;background:var(--md-sys-color-primary);"></span>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    setTimeout(() => {
      list.querySelectorAll('.card-reveal').forEach((el, i) => {
        setTimeout(() => el.classList.add('revealed'), i * 40);
      });
    }, 50);
  }

  function formatType(type) {
    if (!type) return 'Notification';
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  // Filter chips
  container.querySelectorAll('.chip-m3').forEach(chip => {
    chip.addEventListener('click', () => {
      currentFilter = chip.dataset.filter;
      container.querySelectorAll('.chip-m3').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderList();
    });
  });

  // Mark as read
window.markRead = async (id) => {
  await api.put(`/notifications/${id}/read`);
    const notif = allNotifs.find(n => n.id === id);
    if (notif) notif.read = true;
    renderList();
  };

  // Mark all read
  container.querySelector('#btn-mark-all-read').addEventListener('click', async () => {
    await api.put('/notifications/read-all');
    allNotifs.forEach(n => n.read = true);
    renderList();
  });

  loadData();
  return container;
}
