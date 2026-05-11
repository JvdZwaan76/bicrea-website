/*
 * BICREA Florida — Tombstone Service Worker (v13.5.9)
 * ============================================================================
 *
 * Starting in v13.5.9, bicrea.com no longer uses a Service Worker. This file
 * exists solely to clean up Service Workers installed by earlier versions
 * (v13.5.6 through v13.5.8). Those SWs had caching strategies that occasionally
 * served stale code during deploys; eliminating the SW entirely is the
 * simplest robust path for a marketing site.
 *
 * When a user who previously had an SW installed visits the site, the browser
 * automatically checks /sw.js for an update. The browser sees this new
 * version, installs it, and activates it (skipWaiting forces immediate
 * activation). On activation, this tombstone:
 *
 *   1. Claims all open tabs
 *   2. Deletes every cache the site previously created
 *   3. Unregisters itself
 *   4. Force-reloads open tabs so they pick up fresh code with no SW
 *
 * Subsequent page loads will register no Service Worker at all (the
 * registration code was removed from script.js in v13.5.9). The site
 * behaves as a standard CDN-served static site.
 *
 * NOTE: After ~30 days from deploy, this file can safely be deleted from
 * the repo. At that point, every plausible repeat visitor will have come
 * through and had their SW cleaned up. New visitors never had an SW to
 * begin with.
 *
 * No fetch handler is registered — all requests pass through to the network
 * unmodified, exactly as if there were no Service Worker.
 * ============================================================================
 */

self.addEventListener('install', () => {
    // Skip the "waiting" phase — activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            // 1. Take control of all open tabs from any prior SW
            await self.clients.claim();

            // 2. Delete every cache this site created in prior versions
            const cacheKeys = await caches.keys();
            const bicreaCaches = cacheKeys.filter((k) => k.startsWith('bicrea-'));
            await Promise.all(bicreaCaches.map((k) => caches.delete(k)));

            // 3. Unregister this Service Worker
            await self.registration.unregister();

            // 4. Force-reload all open tabs so they get fresh code without
            //    any SW interference
            const clients = await self.clients.matchAll({ type: 'window' });
            for (const client of clients) {
                if ('navigate' in client) {
                    client.navigate(client.url);
                }
            }
        })()
    );
});
