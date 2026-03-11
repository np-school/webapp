var CACHE_NAME = 'np-origins-v1';
var STATIC_FILES = [
  '/index.html',
  '/room-booking.html',
  '/admin.html',
  '/guide.html',
  '/shared/common.js',
  '/shared/styles.css',
  '/shared/firebase.js',
  '/manifest.json'
];

/* Install — cache static files */
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_FILES);
    })
  );
});

/* Activate — clear old caches */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

/* Fetch — cache-first for static, network-first for Firestore/API */
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  /* ข้าม Firebase API, Firestore, Auth — ต้องออนไลน์เสมอ */
  if (url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('firebase') && url.includes('googleapis.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      /* มีใน cache → ส่ง cache ก่อน แล้ว fetch update ไว้ใน background */
      if (cached) {
        fetch(e.request).then(function(fresh) {
          if (fresh && fresh.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, fresh);
            });
          }
        }).catch(function() {});
        return cached;
      }
      /* ไม่มีใน cache → fetch จาก network */
      return fetch(e.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      });
    })
  );
});
