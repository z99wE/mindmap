// UnZonko — Service Worker
const CACHE = 'unzonko-v1';
const ASSETS = ['/', '/icon.svg', '/manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/')) return; // never cache API
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    })).catch(() => caches.match('/'))
  );
});

self.addEventListener('push', (e) => {
  let data = { title: 'UnZonko', body: 'New notification', icon: '/icon.svg' };
  if (e.data) { try { data = { ...data, ...e.data.json() }; } catch { data.body = e.data.text(); } }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: data.icon, tag: 'unzonko',
    data: { url: data.url || '/' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cls => {
    for (const c of cls) { if (c.url.includes(url)) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
