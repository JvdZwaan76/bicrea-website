/* BICREA Florida — Service Worker
 * Caching strategy:
 *   - HTML pages: network-first (always try fresh, fall back to cache)
 *   - CSS/JS: stale-while-revalidate (instant from cache, revalidate in background)
 *   - Images: cache-first (immutable, long-cache)
 *   - Cross-origin (Google Fonts): cache-first with reasonable expiry
 *
 * Install strategy: best-effort (Promise.allSettled, not addAll). A missing
 * file in the shell list should NOT prevent the SW from activating — it just
 * means that file isn't precached and will fetch from network on first use.
 * Previously we used cache.addAll() which is atomic: any single 404 caused
 * the whole install to reject, leaving the SW in "redundant" state forever.
 *
 * Versioned cache name — bump on deploys to invalidate
 */
const VERSION = 'v13.5.6-2026-05-11';
const SHELL_CACHE = 'bicrea-shell-' + VERSION;
const PAGES_CACHE = 'bicrea-pages-' + VERSION;
const ASSETS_CACHE = 'bicrea-assets-' + VERSION;
const FONTS_CACHE = 'bicrea-fonts-' + VERSION;

// Files to pre-cache on install (the shell). Best-effort: missing files are
// silently skipped.
const SHELL_URLS = [
    '/',
    '/styles.css',
    '/script.js',
    '/favicon/favicon.svg'
];

// Install: best-effort pre-cache (no atomic failures)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => {
            // Cache each file independently. A failure for one URL doesn't
            // reject the whole install.
            return Promise.allSettled(
                SHELL_URLS.map((url) =>
                    cache.add(url).catch((err) => {
                        // Log but don't propagate — keep install successful
                        console.warn('[SW] precache skip:', url, err.message);
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// Activate: clean up old version caches
self.addEventListener('activate', (event) => {
    const VALID = [SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE, FONTS_CACHE];
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((k) => k.startsWith('bicrea-') && !VALID.includes(k))
                    .map((k) => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: routing strategy
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Skip Formspree, analytics, and any 3rd party we don't want to cache
    if (url.hostname.includes('formspree.io')) return;
    if (url.hostname.includes('google-analytics.com')) return;
    if (url.hostname.includes('googletagmanager.com')) return;

    // Google Fonts — cache-first
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(cacheFirst(req, FONTS_CACHE));
        return;
    }

    // Same-origin only beyond this point
    if (url.origin !== self.location.origin) return;

    // HTML — network-first
    if (req.destination === 'document' || req.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirst(req, PAGES_CACHE));
        return;
    }

    // CSS/JS — stale-while-revalidate
    if (req.destination === 'style' || req.destination === 'script') {
        event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
        return;
    }

    // Images — cache-first
    if (req.destination === 'image') {
        event.respondWith(cacheFirst(req, ASSETS_CACHE));
        return;
    }

    // Default: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(req, ASSETS_CACHE));
});

async function cacheFirst(req, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
        const response = await fetch(req);
        if (response && response.status === 200) cache.put(req, response.clone());
        return response;
    } catch (e) {
        return cached || Response.error();
    }
}

async function networkFirst(req, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(req);
        if (response && response.status === 200) cache.put(req, response.clone());
        return response;
    } catch (e) {
        const cached = await cache.match(req);
        if (cached) return cached;
        // Offline fallback to homepage if it exists in cache
        const home = await caches.match('/');
        return home || Response.error();
    }
}

async function staleWhileRevalidate(req, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((response) => {
        if (response && response.status === 200) cache.put(req, response.clone());
        return response;
    }).catch(() => cached);
    return cached || fetchPromise;
}
