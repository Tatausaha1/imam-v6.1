/**
 * IMAM PWA Service Worker
 * Strategi update agresif agar aplikasi cepat mengambil versi terbaru
 */

const CACHE_NAME = 'imam-static-v2';
const RUNTIME_CACHE = 'imam-runtime-v2';
const API_PROXY_PREFIX = '/api-proxy';
const GEMINI_TARGET_PREFIX = 'https://generativelanguage.googleapis.com';

const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = request.url;

  if (requestUrl.startsWith(GEMINI_TARGET_PREFIX)) {
    const remainingPathAndQuery = requestUrl.substring(GEMINI_TARGET_PREFIX.length);
    const proxyUrl = `${self.location.origin}${API_PROXY_PREFIX}${remainingPathAndQuery}`;

    event.respondWith(
      fetch(new Request(proxyUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? request.body : undefined,
        duplex: request.method !== 'GET' ? 'half' : undefined
      })).catch(() => new Response(JSON.stringify({ error: 'OFFLINE: Tidak dapat terhubung ke AI.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseClone));
          return networkResponse;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/')))
    );
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    requestUrl.includes('esm.sh') ||
    requestUrl.includes('aistudiocdn.com') ||
    requestUrl.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })
    );
  }
});
