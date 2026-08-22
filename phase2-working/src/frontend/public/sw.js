/**
 * SERVICE WORKER — Offline-First PWA for ReMentally
 *
 * Features:
 *   - Cache-first for static assets (CSS, JS, images)
 *   - Network-first for API calls (with offline fallback)
 *   - Background sync for offline thought submissions
 *   - Periodic background sync for notification delivery
 *   - Push notification handling
 *
 * Cost: $0 (pure browser APIs)
 */

const CACHE_NAME = 'rementally-v1';
const STATIC_CACHE = 'rementally-static-v1';
const API_CACHE = 'rementally-api-v1';

// Static assets to pre-cache on install
const PRE_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API endpoints to cache for offline access
const CACHEABLE_API_PATHS = [
  '/api/memory',
  '/api/memory/stats',
  '/api/keys',
  '/api/keys/providers',
  '/api/channels',
  '/api/notifications',
  '/api/cognitive/forecast',
  '/api/cognitive/debt-score',
  '/api/activities',
  '/api/agent/preferences',
];

// API endpoints that should NEVER be cached (write operations)
const NEVER_CACHE_PATHS = [
  '/api/process/message',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/billing',
  '/api/admin',
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing ReMentally Service Worker');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRE_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ReMentally Service Worker');
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== STATIC_CACHE && name !== API_CACHE && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch Strategy ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    // Handle POST to /api/process/message (offline queue)
    if (request.method === 'POST' && url.pathname === '/api/process/message') {
      event.respondWith(_handleOfflinePost(request));
    }
    // Invalidate API cache on write operations (POST/PUT/DELETE)
    // This ensures stale data is not served after mutations
    if (url.pathname.startsWith('/api/')) {
      event.waitUntil(_invalidateAPICache(url.pathname));
    }
    return;
  }

  // API requests — network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Never cache write operations or auth
    if (NEVER_CACHE_PATHS.some(p => url.pathname.startsWith(p))) {
      return;
    }

    // Only cache specific read endpoints
    if (CACHEABLE_API_PATHS.some(p => url.pathname.startsWith(p))) {
      event.respondWith(_networkFirstWithCache(request));
    }
    return;
  }

  // Static assets — cache-first
  event.respondWith(_cacheFirst(request));
});

// ── Caching Strategies ─────────────────────────────────────────────────────

async function _cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function _networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function _handleOfflinePost(request) {
  try {
    // Try network first
    const response = await fetch(request);
    return response;
  } catch {
    // Offline — queue for background sync
    const body = await request.clone().json();
    await _queueOfflineThought(body);

    // Notify the client that the thought is queued
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'OFFLINE_THOUGHT_QUEUED',
        data: { message: body.message, queuedAt: new Date().toISOString() },
      });
    }

    return new Response(JSON.stringify({
      offline: true,
      queued: true,
      message: 'Thought queued for sync when you\'re back online.',
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Offline Queue ──────────────────────────────────────────────────────────

async function _queueOfflineThought(thought) {
  const cache = await caches.open('rementally-offline-queue');
  const queueKey = `/queue/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const entry = {
    ...thought,
    queuedAt: new Date().toISOString(),
    synced: false,
  };
  await cache.put(new Request(queueKey), new Response(JSON.stringify(entry)));
}

async function _getOfflineQueue() {
  const cache = await caches.open('rementally-offline-queue');
  const keys = await cache.keys();
  const queue = [];
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const data = await response.json();
      queue.push({ key: key.url, ...data });
    }
  }
  return queue;
}

async function _clearOfflineQueue() {
  await caches.delete('rementally-offline-queue');
}

/**
 * Invalidate cached API responses after a write operation.
 * Maps write endpoints to the GET caches they affect.
 */
async function _invalidateAPICache(writePath) {
  try {
    const cache = await caches.open(API_CACHE);
    const keys = await cache.keys();
    const invalidations = {
      '/api/process/message': ['/api/memory', '/api/memory/stats'],
      '/api/memory': ['/api/memory', '/api/memory/stats'],
      '/api/channels': ['/api/channels'],
      '/api/keys': ['/api/keys', '/api/keys/status'],
      '/api/notifications': ['/api/notifications'],
      '/api/agent': ['/api/agent'],
      '/api/billing': ['/api/billing'],
      '/api/admin': [], // admin writes invalidate nothing for regular users
    };
    // Find which prefix matches
    const prefixes = Object.keys(invalidations).filter(p => writePath.startsWith(p));
    if (prefixes.length === 0) return;
    const urlsToInvalidate = new Set();
    for (const prefix of prefixes) {
      for (const url of invalidations[prefix]) urlsToInvalidate.add(url);
    }
    for (const req of keys) {
      const reqUrl = new URL(req.url);
      if ([...urlsToInvalidate].some(p => reqUrl.pathname.startsWith(p))) {
        await cache.delete(req);
      }
    }
  } catch {
    // Non-critical — ignore errors
  }
}

// ── Background Sync ────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-thoughts') {
    event.waitUntil(_syncOfflineThoughts());
  }
});

async function _syncOfflineThoughts() {
  const queue = await _getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`[SW] Syncing ${queue.length} offline thoughts`);

  for (const item of queue) {
    try {
      const response = await fetch('/api/process/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: item.message }),
      });

      if (response.ok) {
        // Remove from queue
        const cache = await caches.open('rementally-offline-queue');
        await cache.delete(new Request(item.key));

        // Notify client
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: 'OFFLINE_THOUGHT_SYNCED',
            data: { message: item.message },
          });
        }
      }
    } catch {
      // Will retry on next sync
    }
  }
}

// ── Push Notifications ─────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'ReMentally', body: event.data.text() };
  }

  const options = {
    body: data.body || 'New notification from ReMentally',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [100, 50, 100],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ReMentally', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Focus existing window or open new one
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(event.notification.data || '/');
    })
  );
});

// ── Periodic Background Sync (for notifications) ───────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(_checkNotifications());
  }
});

async function _checkNotifications() {
  try {
    const response = await fetch('/api/notifications?unreadOnly=true&limit=5');
    if (!response.ok) return;

    const data = await response.json();
    const unread = data.notifications?.filter(n => !n.delivered) || [];

    for (const notif of unread.slice(0, 3)) {
      await self.registration.showNotification(notif.title || 'ReMentally', {
        body: notif.message || notif.content,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: `notif-${notif.id}`,
      });
    }
  } catch {
    // Will retry on next periodic sync
  }
}

// ── Message Handler (for client communication) ─────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'SYNC_NOW') {
    _syncOfflineThoughts();
  }
  if (event.data?.type === 'QUEUE_THOUGHT') {
    _queueOfflineThought(event.data.thought);
  }
});
