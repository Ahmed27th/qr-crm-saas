const CACHE_NAME = 'qr-crm-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(e.request);
        if (response.status === 200) {
          cache.put(e.request, response.clone());
        }
        return response;
      } catch {
        return cache.match(e.request) || new Response('Offline', { status: 503 });
      }
    })
  );
});
