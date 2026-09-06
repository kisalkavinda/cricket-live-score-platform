/**
 * CPL Cricket Live Scoring - Service Worker (PWA Shell Cache)
 * 
 * Safety Rules:
 * 1. NEVER cache POST, PUT, DELETE, or mutation requests.
 * 2. NEVER cache sensitive APIs, admin tokens, or database credentials.
 * 3. Never fabricate authenticated server data.
 * 4. Cache application shell and static assets so scorer UI can reopen during network outages.
 */

const CACHE_NAME = 'cpl-scorer-shell-v1';

const STATIC_SHELL_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Safety Rule 1: Never intercept or cache non-GET requests (mutations, server actions)
  if (request.method !== 'GET') {
    return;
  }

  // Safety Rule 2: Never cache sensitive API endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth') ||
    url.pathname.includes('/admin-auth')
  ) {
    return;
  }

  // Static Assets (_next/static, fonts, icons, images): Cache-first with network fallback
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.wasm')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached and refresh in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Navigation Requests (HTML Page Shells): Network-first with Cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: Serve previously cached version of this navigation route
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If this exact URL not cached, return the root shell if available
          const rootCached = await caches.match('/');
          if (rootCached) {
            return rootCached;
          }
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>CPL Scorer Offline</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background:#0F0C0C;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;"><div><h2>You are currently offline</h2><p>Please reload when connected or use the installed PWA scorer.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
  }
});
