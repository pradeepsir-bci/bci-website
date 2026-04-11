// BCI Service Worker — v1.0
// Caches static assets for faster loading and basic offline support

const CACHE_NAME = 'bci-cache-v1';

// Assets to cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// External CDN resources to cache when first fetched
const CDN_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
];

// ─── Install ───────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(err) {
        console.log('[BCI SW] Pre-cache failed (some assets may not exist yet):', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if(req.method !== 'GET') return;

  // Skip Firebase, Cloudinary API calls — always fetch fresh
  if(
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken') ||
    url.hostname.includes('api.cloudinary.com')
  ) return;

  // Strategy: Cache-first for CDN fonts/scripts, Network-first for app shell
  const isCDN = CDN_ORIGINS.some(function(o){ return url.hostname.includes(o); });

  if(isCDN) {
    // Cache-first: CDN assets rarely change
    event.respondWith(
      caches.match(req).then(function(cached) {
        if(cached) return cached;
        return fetch(req).then(function(response) {
          if(!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, clone);
          });
          return response;
        });
      })
    );
  } else if(url.origin === self.location.origin) {
    // Network-first for own assets (index.html etc.) with cache fallback
    event.respondWith(
      fetch(req).then(function(response) {
        if(!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(req, clone);
        });
        return response;
      }).catch(function() {
        // Offline fallback: serve from cache
        return caches.match(req).then(function(cached) {
          if(cached) return cached;
          // If index.html is cached, serve it for any navigation
          if(req.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline — content not cached', {
            status: 503,
            headers: {'Content-Type': 'text/plain'}
          });
        });
      })
    );
  }
});
