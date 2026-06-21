/* ═══════════════════════════════════════════════
   Firebase Cloud Messaging (Push Notification)
   ทำงานคู่กับ caching logic ด้านล่าง — ไม่กระทบกัน
   ═══════════════════════════════════════════════ */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:        'AIzaSyDBtM8x62v2KafPuGtiE29gRF7IxM2pITU',
  authDomain:    'np-webapp-74616.firebaseapp.com',
  projectId:     'np-webapp-74616',
  storageBucket: 'np-webapp-74616.firebasestorage.app',
  messagingSenderId: '275537025660',
  appId:         '1:275537025660:web:4fdc11e0fe22e679f6c7f9'
});

var messaging = firebase.messaging();

/* แจ้งเตือนตอนแท็บปิด/อยู่เบื้องหลัง */
messaging.onBackgroundMessage(function(payload) {
  var data = payload.data || {};
  var title = data.title || 'NP Origins';
  var options = {
    body: data.body || '',
    icon: 'https://firebasestorage.googleapis.com/v0/b/np-webapp-74616.firebasestorage.app/o/img%2FNP_Origins-192.jpg?alt=media&token=6b6fa3d3-61e9-48ce-886a-d01bb376ff2f',
    badge: 'https://firebasestorage.googleapis.com/v0/b/np-webapp-74616.firebasestorage.app/o/img%2FNP_Origins-192.jpg?alt=media&token=6b6fa3d3-61e9-48ce-886a-d01bb376ff2f',
    data: data
  };
  self.registration.showNotification(title, options);
});

/* คลิกแจ้งเตือน → เปิด/โฟกัสหน้าที่เกี่ยวข้อง */
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || '/webapp/index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url.indexOf(targetUrl) !== -1 && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

var CACHE_NAME = 'np-origins-v9';
/* cache ทีละไฟล์ทั้งหมด — ไม่มีอะไร fail ได้
   cache.addAll แบบ all-or-nothing ทำให้ SW install fail ถ้าไฟล์ใดโหลดไม่ได้ */
var ALL_FILES = [
  '/webapp/index.html',
  '/webapp/guide.html',
  '/webapp/shared/common.js',
  '/webapp/shared/styles.css',
  '/webapp/shared/firebase.js',
  '/webapp/manifest.json',
  '/webapp/room-request.html',
  '/webapp/room-admin.html',
  '/webapp/portfolio-teacher.html',
  '/webapp/portfolio-admin.html'
];

/* ไฟล์ที่ต้องใช้ network-first (HTML, JS) เพื่อให้ได้ version ล่าสุดเสมอ */
function isNetworkFirst(url) {
  return url.endsWith('.html') || url.endsWith('.js');
}

/* Install — cache ทีละไฟล์ทั้งหมด พลาดได้ ไม่กระทบ install */
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(
        ALL_FILES.map(function(url) {
          return fetch(url).then(function(res) {
            if (res && res.status === 200) return cache.put(url, res);
          }).catch(function(err) {
            console.warn('SW cache skip:', url, err.message);
          });
        })
      );
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

  /* ข้าม Firebase, Google OAuth, Cloud Functions — ต้องออนไลน์เสมอ */
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
