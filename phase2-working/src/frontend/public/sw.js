// Mentally — Service Worker
// Cache versioning: bump CACHE_VERSION to force re-cache all assets
const CACHE_VERSION = 1;
const CACHE = `mentally-v${CACHE_VERSION}`;
const ASSETS = ['/', '/icon.svg', '/manifest.json'];

// Skip waiting so the new SW activates immediately
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Clean up old caches on activation
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE && key.startsWith('mentally-'))
          .map((key) => caches.delete(key))
      );
    })
  );
  e.waitUntil(self.clients.claim());
});

// Network-first for navigation requests, cache-first for static assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache API requests
  if (url.pathname.startsWith('/api/')) return;

  // For navigation requests (HTML), try network first, fall back to cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // Cache the latest HTML shell
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', clone));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // For static assets (JS, CSS, images), cache-first with network update
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    }).catch(() => caches.match('/'))
  );
});

// Push notifications
self.addEventListener('push', (e) => {
  let data = { title: 'Mentally', body: 'New notification', icon: '/icon.svg' };
  if (e.data) {
    try {
      data = { ...data, ...e.data.json() };
    } catch {
      data.body = e.data.text();
    }
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      tag: 'mentally',
      data: { url: data.url || '/' },
    })
  );
});

// Notification click → focus or open window
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(url)) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
