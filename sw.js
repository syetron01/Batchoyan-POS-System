// sw.js - Service Worker

// !! IMPORTANT: Update this version number whenever you make changes to any of the cached files !!
const CACHE_NAME = 'iloilo-batchoy-pos-cache-v3'; // Example: incremented version

const urlsToCache = [
  './', // This caches the root path, often resolving to index.html
  './index.html',
  './style.css',
  './script.js',
  './manifest.json', // Cache the manifest file itself

  // Add paths to your primary icons located in the ./images/ folder
  // Ensure these filenames match what you have and what's in your manifest.json
  './images/icon-192x192.png',
  './images/icon-512x512.png',
  // Add other critical icons if you have them and they are referenced
  // e.g., './images/apple-touch-icon.png',
  // e.g., './images/favicon-32x32.png',

  // External resources (fonts, icon libraries)
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
  // Add any other essential external resources here
];

// Install event: Cache core assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell files:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete, skipping waiting.');
        return self.skipWaiting(); // Force the waiting service worker to become the active service worker.
      })
      .catch(error => {
        console.error('Service Worker: Caching failed during install:', error);
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Activation complete, claiming clients.');
        return self.clients.claim(); // Take control of uncontrolled clients (open tabs) immediately.
    })
    .catch(error => {
        console.error('Service Worker: Activation failed:', error);
    })
  );
});

// Fetch event: Serve cached content when offline, or fetch from network
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    // For non-GET requests, just fetch from network without trying cache.
    // event.respondWith(fetch(event.request)); // Uncomment if you want to explicitly handle non-GET
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        // console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request).then(
          (networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
              // If not a valid response (e.g. opaque responses from CDNs for external resources if not CORS-enabled, or errors)
              // just return it without caching.
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log('Service Worker: Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('Service Worker: Fetch failed; possibly offline or network error.', error, event.request.url);
          // Optionally, you could return a generic offline fallback page here
          // For example:
          // if (event.request.mode === 'navigate') { // Only for page navigations
          //   return caches.match('./offline.html'); // You'd need to create and cache offline.html
          // }
          // For this POS, if core assets are cached, it should mostly work.
          // If an API call fails, the app's own error handling should take over.
        });
      })
  );
});