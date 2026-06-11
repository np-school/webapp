var CACHE_NAME = 'np-origins-v8';
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

/* ไฟล์ HTML/JS ของแอป — ใช้ stale-while-revalidate
   (ตอบจาก cache ทันทีถ้ามี แล้วค่อยอัปเดต cache เบื้องหลัง) */
function isAppShell(url) {
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

  /* Stale-While-Revalidate สำหรับ HTML และ JS
     → ตอบจาก cache ทันที (เร็ว, ไม่ต้องรอ network)
     → พร้อมกันนั้น fetch ของใหม่จาก network มาอัปเดต cache ไว้สำหรับครั้งถัดไป
     → ถ้าไม่มี cache เลย (เปิดครั้งแรก) ค่อย fallback ไป network */
  if (isAppShell(url)) {
    e.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var fetchPromise = fetch(e.request).then(function(response) {
            if (response && response.status === 200) {
              cache.put(e.request, response.clone());
            }
            return response;
          }).catch(function() {
            /* ออฟไลน์ และไม่มีของใหม่ → ใช้ cache เดิม (ถ้ามี) */
            return cached;
          });

          /* มี cache → ตอบทันที, อัปเดตเบื้องหลัง
             ไม่มี cache → รอ network */
          return cached || fetchPromise;
        });
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
