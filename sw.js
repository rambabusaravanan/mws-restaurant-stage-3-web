const CACHE_PREFIX = 'mws-restaurant';
const CACHE_NAME = CACHE_PREFIX + '-v3.7';

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

const dynamicUrls = ['/restaurants/', '/reviews']
self.addEventListener('fetch', event => {
    event.respondWith(
        caches
            .match(event.request)
            .then(cacheResponse => {

                var clonnedRequest = event.request.clone();
                let isDynamic = dynamicUrls.find(du => clonnedRequest.url.indexOf(du)!==-1)

                // Cache hit - return response (for static)
                if (!isDynamic && cacheResponse) {
                    return cacheResponse;
                }
                
                return fetch(clonnedRequest)
                    .then(fetchResponse => {
                        console.log("sw fetch: [freshhit] " + clonnedRequest.url)

                        // Ignore Cache - for dynamic
                        if(isDynamic)
                            return fetchResponse;

                        // Check if we received a valid response
                        let isBasic = fetchResponse && fetchResponse.type === 'basic' && fetchResponse.status === 200;  // Not just valid 'basic' type
                        let isOpaque = fetchResponse && fetchResponse.type === 'opaque';                                // Also needs 'opaque' to cache map images
                        if(!isBasic && !isOpaque) {
                            console.log("sw fetch: [invalid]", clonnedRequest.url, fetchResponse)
                            return fetchResponse;
                        }
            
                        console.log("sw fetch: [cached] " + clonnedRequest.url)
                        let clonnedResponse = fetchResponse.clone();
                        return caches
                            .open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, clonnedResponse);
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
  
