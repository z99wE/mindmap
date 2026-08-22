// ReMentally Browser Extension — Background Service Worker
// Checks for unread count, handles auth, manages alarm

const API_BASE = 'https://rementally.onrender.com/api';

// Check auth and unread count every 5 minutes
chrome.alarms.create('heartbeat', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'heartbeat') await checkUnread();
});

// Listen for token from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SET_TOKEN') {
    chrome.storage.local.set({ token: msg.token, email: msg.email });
    sendResponse({ ok: true });
  }
  if (msg.type === 'CLEAR_TOKEN') {
    chrome.storage.local.remove(['token', 'email']);
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ ok: true });
  }
  if (msg.type === 'GET_STATUS') {
    checkUnread().then(sendResponse);
    return true; // keep channel open
  }
});

async function checkUnread() {
  try {
    const { token } = await chrome.storage.local.get('token');
    if (!token) {
      chrome.action.setBadgeText({ text: '' });
      return { loggedIn: false };
    }
    const resp = await fetch(`${API_BASE}/activities/unread-count`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) {
      if (resp.status === 401) {
        chrome.storage.local.remove(['token', 'email']);
        chrome.action.setBadgeText({ text: '' });
        return { loggedIn: false };
      }
      return { loggedIn: false };
    }
    const data = await resp.json();
    const count = data?.count || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    return { loggedIn: true, count };
  } catch {
    return { loggedIn: false };
  }
}
