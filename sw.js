const CACHE_PREFIX = 'mws-restaurant';
const CACHE_NAME = CACHE_PREFIX + '-v2.3';

const pages = [
    '/',
    'index.html',
    'restaurant.html',
];

const assets = [
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
    'https://unpkg.com/idb@2.1.3/lib/idb.js',
    'css/styles.css',
    'js/main.js',
    'js/restaurant_info.js',
    'js/dbhelper.js',
];

self.addEventListener('install', event => {
    console.log("sw install: with cache " + CACHE_NAME)
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(cache => cache.addAll([...pages, ...assets]))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches
            .match(event.request)
            .then(cacheResponse => {
                console.log("sw fetch: " + event.request.url)
                return cacheResponse || fetch(event.request)
                    .then(fetchResponse => {
                        console.log("sw fetch: [fresh] " + event.request.url)
                        return caches
                            .open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, fetchResponse.clone());
                                return fetchResponse;
                            });
                    });
            })
    );
});

self.addEventListener('activate', function(event) {  
    console.log("sw activate:")
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
                console.log("sw activate: deleting cache " + cacheName)
                return caches.delete(cacheName);
            }
          })
        );
      })
    );
  });
  