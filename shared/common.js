var CACHE_NAME = 'np-origins-v4';
var STATIC_FILES = [
  '/webapp/index.html',
  '/webapp/room-request.html',
  '/webapp/room-admin.html',
  '/webapp/guide.html',
  '/webapp/portfolio-teacher.html',
  '/webapp/portfolio-admin.html',
  '/webapp/shared/common.js',
  '/webapp/shared/styles.css',
  '/webapp/shared/firebase.js',
  '/webapp/manifest.json'
];

/* ไฟล์ที่ต้องใช้ network-first (HTML, JS) เพื่อให้ได้ version ล่าสุดเสมอ */
function isNetworkFirst(url) {
  return url.endsWith('.html') || url.endsWith('.js');
}

/* Install — cache static files */
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_FILES);
    })
  );
});

/* Activate — clear ALL old caches (รวม v2) */
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

/* Fetch */
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  /* ข้าม Firebase API, Firestore, Auth — ต้องออนไลน์เสมอ */
  if (url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('accounts.google.com') ||
      url.includes('oauth2.googleapis.com') ||
      url.includes('cloudfunctions.net') ||
      (url.includes('firebase') && url.includes('googleapis.com'))) {
    return;
  }

  /* Network-first สำหรับ HTML และ JS — ได้ของใหม่ทันที */
  if (isNetworkFirst(url)) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        /* offline fallback → ใช้ cache แทน */
        return caches.match(e.request);
      })
    );
    return;
  }

  /* Cache-first สำหรับ font, image, CSS */
  e.respondWith(
    caches.match(e.request).then(function(cached) {
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
