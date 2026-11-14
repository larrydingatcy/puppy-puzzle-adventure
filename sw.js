const LEGACY_CACHE_PREFIX = 'phonics-picnic-';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all([
      ...cacheNames
        .filter((name) => name.startsWith(LEGACY_CACHE_PREFIX))
        .map((name) => caches.delete(name)),
      self.registration.unregister(),
    ]);

    const openPages = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    await Promise.all(openPages.map((client) => client.navigate(client.url)));
  })());
});
