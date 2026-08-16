// UnZonko - Service Worker for Web Push Notifications
// This SW handles push events and notification interactions

const CACHE_NAME = 'thought-gps-v1';

// Install: skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event: show notification from server payload
self.addEventListener('push', (event) => {
  let data = {
    title: 'UnZonko',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'default',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        data: { url: payload.url || '/', ...payload.data },
        vibrate: payload.vibrate || [100, 50, 100],
        actions: payload.actions || [],
        renotify: payload.renotify !== false,
        silent: payload.silent || false,
      };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      vibrate: data.vibrate,
      actions: data.actions,
      renotify: data.renotify,
      silent: data.silent,
    })
  );
});

// Notification click: open URL or focus existing tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const action = event.action;

  // Handle action buttons
  if (action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close (optional analytics)
self.addEventListener('notificationclose', (event) => {
  // Could track dismissed notifications here
});
