// Self-cleaning Service Worker: deletes old caches and unregisters immediately
// to prevent mobile white-screen cache locks across app updates.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Do not intercept network requests - allow direct browser network access
self.addEventListener('fetch', () => {
  return;
});
