const CACHE_NAME = 'xiwu-space-v1';
const ASSETS = [
  '/XW/',
  '/XW/index.html',
  '/XW/manifest.webmanifest',
  '/XW/icons/icon-192.png',
  '/XW/icons/icon-512.png',
  '/XW/css/base.css',
  '/XW/css/layout.css',
  '/XW/css/modules.css',
  '/XW/js/db.js',
  '/XW/js/store.js',
  '/XW/js/router.js',
  '/XW/js/modal.js',
  '/XW/js/app.js',
  '/XW/js/modules/home.js',
  '/XW/js/modules/today.js',
  '/XW/js/modules/media.js',
  '/XW/js/modules/dev.js',
  '/XW/js/modules/schedule.js',
  '/XW/js/modules/fitness.js',
  '/XW/js/modules/diet.js',
  '/XW/js/modules/game.js',
  '/XW/js/modules/settings.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});