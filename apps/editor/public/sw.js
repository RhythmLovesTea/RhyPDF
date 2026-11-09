// RhyPDF Service Worker - Offline Shell & WASM Caching
const CACHE_NAME = 'rhypdf-shell-v1';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/pdfium.wasm'
];

// Injected during production build by scripts/inject_sw_precache.mjs
const INJECTED_ASSETS = /* __PRECACHE_DYNAMIC_ASSETS__ */ [];

const PRECACHE_ASSETS = Array.from(new Set([...STATIC_PRECACHE, ...INJECTED_ASSETS]));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // Precache all static and build assets
        await Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            fetch(url)
              .then((res) => {
                if (res.ok) {
                  return cache.put(url, res);
                }
              })
              .catch((err) => {
                console.warn('[SW] Precache item failed:', url, err);
              })
          )
        );

        // Also fetch index.html and dynamically scan for any referenced script/css
        try {
          const indexRes = await fetch('/index.html');
          if (indexRes.ok) {
            const html = await indexRes.clone().text();
            await cache.put('/index.html', indexRes);
            const matches = html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g);
            for (const match of matches) {
              const assetUrl = match[1];
              try {
                const assetRes = await fetch(assetUrl);
                if (assetRes.ok) {
                  await cache.put(assetUrl, assetRes);
                }
              } catch (_) {}
            }
          }
        } catch (_) {}
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key.startsWith('rhypdf-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // 1. Navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              cache.put('/index.html', response.clone());
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return new Response(
            '<!doctype html><html><body><h1>Offline</h1><p>RhyPDF is available offline.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. WASM files, fonts, and hashed assets: Cache-First
  const isWasm = url.pathname.endsWith('.wasm');
  const isFont = url.pathname.endsWith('.ttf') || url.pathname.endsWith('.woff2');
  const isAsset = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/');

  if (isWasm || isFont || isAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Stale-While-Revalidate for other static resources
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'PING') {
    event.ports[0]?.postMessage({ type: 'PONG', version: CACHE_NAME });
  }
});
