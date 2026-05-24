const CACHE_NAME = 'mebcalc-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/robots.txt'
];

// On installation, cache the initial landing shell index.html and root path
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Pre-cache error during SW install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Clean up old caches on activation and claim clients immediately to intercept fetches on the very first page load
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // We only intercept GET requests coming to our own origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Strictly do NOT intercept or cache API endpoints or dev-server internal control planes
  if (url.pathname.startsWith('/api') || url.pathname.includes('__aistudio_internal_')) {
    return;
  }

  // Dynamic Cache with Network-First fallback logic for documents and assets.
  // This ensures that online users always get the latest scripts immediately,
  // while offline users get the cached assets correctly (index.html, CSS, JS, images).
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If the fetch succeeded and it's a valid 200 status, cache a clone of the response
        if (response.status === 200) {
          const cacheResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cacheResponse);
          });
        }
        return response;
      })
      .catch(() => {
        // Failed to fetch (Offline state / Network error)
        // First try to match the request in our caches. We MUST use { ignoreSearch: true }
        // because Vite/React bundler often appends cache-busting search params (?t= or ?v=) 
        // which would cause a cache miss on offline page refreshes!
        return caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If it is a navigation request (i.e., document requests or sub-routes with routers like /projects),
          // fallback to index.html (the SPA root) to let client-side router handle the routing gracefully offline!
          if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
            return caches.match('/', { ignoreSearch: true }).then((homeResponse) => {
              if (homeResponse) return homeResponse;
              return caches.match('/index.html', { ignoreSearch: true });
            });
          }

          return Response.error();
        });
      })
  );
});
