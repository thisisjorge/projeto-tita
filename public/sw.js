/**
 * Projeto Titã — Versioned Service Worker (PWA Shell + Offline Cache)
 * Conforms to REQ-8, ARCHITECTURE_LOCAL_FIRST.md, and tasks.md Phase 9 (Tasks 10.1 - 10.4)
 *
 * Rules:
 * 1. Cache name MUST follow `tita-shell-${RELEASE_ID}`.
 * 2. Precache core shell assets.
 * 3. Exclude all user data / API requests from cache.
 * 4. Keep last-good shell on failed install (cleanup only during activate of successful new worker).
 * 5. DO NOT call self.skipWaiting() automatically on install.
 * 6. Listen for SKIP_WAITING message to activate only upon explicit client/user approval.
 */

const RELEASE_ID = 'v1.0.0';
const SHELL_CACHE = `tita-shell-${RELEASE_ID}`;
// Downloaded media survives shell upgrades. Assets are pinned to a reviewed source.
const MEDIA_CACHE = 'tita-exercise-media-v1';

// Core static assets for application shell
const CORE_SHELL_ASSETS = [
  // BUILD_SHELL_ASSETS
  './',
  '/index.html',
  '/app',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/favicon.svg?v=emerald-rc',
  '/favicon.ico?v=emerald-rc',
  '/icons/favicon-16.png?v=emerald-rc',
  '/icons/favicon-32.png?v=emerald-rc',
  '/icons/apple-touch-icon.png',
];

// Install event: Pre-cache core shell resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(async (cache) => {
        // Pre-cache core assets safely without aborting install if an optional asset is not yet ready
        for (const asset of CORE_SHELL_ASSETS) {
          try {
            await cache.add(asset);
          } catch (err) {
            console.warn(`[SW] Precache skipped for ${asset}:`, err);
          }
        }
      })
      .catch((err) => {
        console.error('[SW] Install failed, preserving last-good shell:', err);
        throw err;
      }),
  );
  // Task 10.2: DO NOT call self.skipWaiting() here.
  // The worker must remain in 'waiting' state until user/client approves update!
});

// Activate event: Clean up old shell caches, preserving last-good shell until new one is active
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => {
              // Delete older shell caches, but preserve non-tita or current SHELL_CACHE
              const isTitaCache = key.startsWith('tita-shell-') || key.startsWith('projeto-tita-');
              return isTitaCache && key !== SHELL_CACHE;
            })
            .map(async (key) => {
              const old = await caches.open(key);
              const media = await caches.open(MEDIA_CACHE);
              for (const request of await old.keys()) {
                if (new URL(request.url).pathname.startsWith('/media/exercises/')) {
                  const response = await old.match(request);
                  if (response) await media.put(request, response);
                }
              }
              console.log(`[SW] Deleting obsolete cache: ${key}`);
              return caches.delete(key);
            }),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});

// Fetch event: Network-first for navigation, Cache-first for assets, exclude user data
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== 'GET') return;

  // 2. Only handle HTTP/HTTPS protocols
  if (!url.protocol.startsWith('http')) return;

  // 3. Exclude user data, sync endpoints, API calls from cache (REQ-8: user data isolated from cache)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/sync/') ||
    url.pathname.includes('/user-data/') ||
    url.searchParams.has('user_data')
  ) {
    return;
  }

  // 4. Handle cross-origin font requests (Google Fonts)
  if (url.origin !== self.location.origin) {
    if (
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')
    ) {
      event.respondWith(cacheFirst(request, SHELL_CACHE));
    }
    return;
  }

  // 5. Navigation requests: Network-first with Cache fallback to App Shell
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstNavigation(request, SHELL_CACHE));
    return;
  }

  // Download only the exercises opened by the user, never the whole catalog.
  if (url.pathname.startsWith('/media/exercises/')) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  // 6. Static shell assets: Cache-first with Network fallback
  event.respondWith(cacheFirst(request, SHELL_CACHE));
});

// Message event: Listen for SKIP_WAITING signal from client upon user update approval
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING from client. Activating new worker...');
    self.skipWaiting();
  }
});

/**
 * Network-first strategy for navigation requests with fallback to cached shell.
 */
async function networkFirstNavigation(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    // Fallback for SPA routing (/app/* or /v2/*)
    const url = new URL(request.url);
    if (url.pathname.startsWith('/app') || url.pathname.startsWith('/v2')) {
      const appShell = await cache.match('/app');
      if (appShell) return appShell;
    }

    const indexFallback = await cache.match('/index.html');
    if (indexFallback) return indexFallback;

    return new self.Response('Offline - Projeto Titã indisponível offline no momento.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * Cache-first strategy for static assets.
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new self.Response('', { status: 503, statusText: 'Offline Asset Unavailable' });
  }
}
