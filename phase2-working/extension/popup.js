// UnZonko Browser Extension — Popup Script

const API_BASE = 'https://unzonko.onrender.com/api';
let token = null;

// Load token and refresh view
chrome.storage.local.get(['token', 'email'], async (data) => {
  token = data.token;
  if (token) {
    document.getElementById('badge').style.display = 'none';
    document.querySelector('.dot').className = 'dot'; // green
    document.getElementById('statusText').textContent = 'Connected';
    await loadActivities();
  } else {
    document.querySelector('.dot').className = 'dot offline';
    document.getElementById('statusText').textContent = 'Not signed in';
    document.getElementById('activities').innerHTML =
      '<div class="empty"><a href="https://unzonko.onrender.com" target="_blank" style="color:#ccff00;">Sign in to UnZonko</a></div>';
  }
});

// Capture thought
document.getElementById('sendBtn').addEventListener('click', async () => {
  const text = document.getElementById('capture').value.trim();
  if (!text || !token) return;
  document.getElementById('sendBtn').disabled = true;
  document.getElementById('sendBtn').textContent = 'Saving...';
  try {
    await fetch(`${API_BASE}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ content: text, category: 'general' }),
    });
    document.getElementById('capture').value = '';
    document.getElementById('sendBtn').textContent = 'Captured!';
    setTimeout(() => {
      document.getElementById('sendBtn').textContent = 'Capture Thought';
      document.getElementById('sendBtn').disabled = false;
    }, 1500);
    await loadActivities();
  } catch {
    document.getElementById('sendBtn').textContent = 'Failed';
    document.getElementById('sendBtn').disabled = false;
  }
});

// Load recent activities
async function loadActivities() {
  try {
    const resp = await fetch(`${API_BASE}/activities?limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await resp.json();
    const el = document.getElementById('activities');
    if (!data.activities?.length) {
      el.innerHTML = '<div class="empty">No recent activity</div>';
      return;
    }
    el.innerHTML = data.activities.map(a => `
      <div class="activity">
        <strong>${a.title || a.activity_type}</strong>
        ${a.summary ? '<br>' + a.summary : ''}
        <div class="activity-time">${timeAgo(new Date(a.created_at))}</div>
      </div>
    `).join('');
    const count = data.unreadCount || 0;
    const badge = document.getElementById('badge');
    if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = 'inline'; }
    else { badge.style.display = 'none'; }
  } catch {
    document.getElementById('activities').innerHTML = '<div class="empty">Offline</div>';
  }
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
