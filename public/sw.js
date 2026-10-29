const CACHE_NAME = 'mebcalc-v3';
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

  // Strictly do NOT intercept or cache API endpoints, exports, or dev-server internal control planes
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.includes('__aistudio_internal_') ||
    url.pathname.endsWith('.pdf') ||
    url.pathname.endsWith('.zip') ||
    url.pathname.endsWith('.xlsx') ||
    url.pathname.endsWith('.csv')
  ) {
    return;
  }

  // Dynamic Cache with Network-First fallback logic for documents and core UI static assets.
  // We limit caching to essential UI static files (js, css, html, images, fonts) and trim cache size.
  const isCacheableAsset = /\.(html|js|css|svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(url.pathname) ||
    request.mode === 'navigate' ||
    url.pathname === '/';

  event.respondWith(
    fetch(request)
      .then((response) => {
        // If the fetch succeeded and it's a valid 200 status for core UI assets, cache a clone of the response
        if (response.status === 200 && isCacheableAsset) {
          const cacheResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cacheResponse);
            // Prune cache if it grows beyond 60 entries
            cache.keys().then((keys) => {
              if (keys.length > 60) {
                cache.delete(keys[0]);
              }
            });
          });
        }
        return response;
      })
      .catch(() => {
        // Failed to fetch (Offline state / Network error)
        return caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

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

// Notification Click Handler: focuses open window or opens application on notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

