// ============================================
// ListMow Service Worker
// Advanced caching with version control
// ============================================

const CACHE_VERSION = 'v2';
const CACHE_NAME = `listmow-${CACHE_VERSION}`;

// Assets to cache during installation
const STATIC_CACHE_URLS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './js/database.js',
    './js/properties.js',
    './js/settings.js',
    './js/history.js',
    './js/cycle.js',
    './js/statistics.js',
    './js/ui.js',
    './manifest.json',
    './icons/icon-192.svg',
    './icons/icon-512.svg'
];

// ============================================
// Install Event
// ============================================

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                console.log('[Service Worker] Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Install failed:', error);
            })
    );
});

// ============================================
// Activate Event
// ============================================

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Claim all clients immediately
            self.clients.claim()
        ])
        .then(() => {
            console.log('[Service Worker] Activated');
        })
        .catch((error) => {
            console.error('[Service Worker] Activate failed:', error);
        })
    );
});

// ============================================
// Fetch Event
// ============================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests (different origin)
    if (url.origin !== self.location.origin) {
        return;
    }

    // Strategy: Cache First for static assets, Network First for HTML
    if (isStaticAsset(request.url)) {
        event.respondWith(cacheFirst(request));
    } else if (isHtmlRequest(request.url)) {
        event.respondWith(networkFirst(request));
    } else {
        event.respondWith(cacheFirst(request));
    }
});

// ============================================
// Cache First Strategy
// ============================================

async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            console.log('[Service Worker] Serving from cache:', request.url);
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[Service Worker] Cache First failed:', error);
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// ============================================
// Network First Strategy
// ============================================

async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[Service Worker] Network failed, trying cache:', request.url);
        
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline fallback for HTML
        if (isHtmlRequest(request.url)) {
            return caches.match('./index.html');
        }

        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// ============================================
// Helper Functions
// ============================================

function isStaticAsset(url) {
    return url.match(/\.(js|css|svg|json)$/);
}

function isHtmlRequest(url) {
    return url.match(/\.html$/) || url.endsWith('/');
}

// ============================================
// Message Handler
// ============================================

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ============================================
// Sync Handler (for future use)
// ============================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // Placeholder for future sync functionality
    console.log('[Service Worker] Syncing data...');
}
