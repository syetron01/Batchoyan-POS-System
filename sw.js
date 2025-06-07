// sw.js - Service Worker

// !! IMPORTANT: Update this version number whenever you make changes to any of the cached files !!
const CACHE_NAME = 'iloilo-batchoy-pos-cache-v6'; // Version incremented to force update

const urlsToCache = [
  './', 
  './index.html',
  './style.css',
  './script.js',
  './manifest.json', 

  // Icons - paths now reflect your structure: ./images/platform/filename.png
  './images/android/android-launchericon-192-192.png',
  './images/android/android-launchericon-512-512.png',
  // Add other Android sizes you want to pre-cache if they are commonly used by your manifest
  './images/android/android-launchericon-144-144.png',
  './images/android/android-launchericon-96-96.png',
  './images/android/android-launchericon-72-72.png',
  './images/android/android-launchericon-48-48.png',

  // iOS icons (example, adjust to actual filenames in your images/ios/ folder)
  './images/ios/180.png', // Or whatever your primary apple-touch-icon is named
  // './images/ios/167.png', // etc.

  // Favicons (example, adjust to actual filenames if you have them in images/android/ or images/ directly)
  // './images/android/android-launchericon-32-32.png', // If you use an android icon as favicon
  // './images/android/android-launchericon-16-16.png',


  // External resources
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// Install event: Cache core assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing (' + CACHE_NAME + ')...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell files:', urlsToCache);
        // Use {cache: 'reload'} to ensure fresh copies are fetched during install for these critical assets
        const cachePromises = urlsToCache.map(urlToCache => {
            return cache.add(new Request(urlToCache, {cache: 'reload'})).catch(err => {
                console.warn(`Service Worker: Failed to cache ${urlToCache} during install:`, err);
            });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Service Worker: Installation complete, skipping waiting.');
        return self.skipWaiting(); 
      })
      .catch(error => {
        console.error('Service Worker: Caching failed during install phase:', error);
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating (' + CACHE_NAME + ')...');
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
        return self.clients.claim(); 
    })
    .catch(error => {
        console.error('Service Worker: Activation failed:', error);
    })
  );
});

// Fetch event: Serve cached content when offline, or fetch from network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return; // Only handle GET requests for caching
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Cache hit - return response
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          (networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
              return networkResponse; // Return non-cacheable responses directly
            }

            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log('Service Worker: Caching new resource from network:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('Service Worker: Fetch failed; network error or offline.', error, event.request.url);
          // You could return a custom offline fallback page here if desired and cached
          // For example:
          // if (event.request.mode === 'navigate' && urlsToCache.includes('./offline.html')) {
          //   return caches.match('./offline.html');
          // }
        });
      })
  );
});