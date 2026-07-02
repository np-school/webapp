/* ═══════════════════════════════════════════════
   shared/firebase.js
   Firebase Initialization & Shared Config
   ═══════════════════════════════════════════════ */

var firebaseConfig = {
  apiKey:        'AIzaSyDBtM8x62v2KafPuGtiE29gRF7IxM2pITU',
  authDomain:    'np-webapp-74616.firebaseapp.com',
  projectId:     'np-webapp-74616',
  storageBucket: 'np-webapp-74616.firebasestorage.app',
  messagingSenderId: '275537025660',
  appId:         '1:275537025660:web:4fdc11e0fe22e679f6c7f9'
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

var auth    = firebase.auth();
var db      = firebase.firestore();
/* บังคับใช้ long-polling แทน WebChannel streaming
   ช่วยลด error "Could not reach Cloud Firestore backend / transport errored"
   ที่เกิดบ่อยบนเครือข่ายที่บล็อก/ไม่รองรับ HTTP/2 streaming (เช่น เครือข่ายโรงเรียน, proxy) */
db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
/* storage SDK optional — โหลดเฉพาะหน้าที่ต้องการ */
var storage = (typeof firebase.storage === 'function') ? firebase.storage() : null;

/* ── LINE Config ── */
var LINE_CH        = '2009342857';
var LINE_CB        = 'https://np-school.github.io/webapp/index.html';
var LINE_PROXY_URL = 'https://us-central1-np-webapp-74616.cloudfunctions.net/lineProxy';

/* ═══════════════════════════════════════════════
   Push Notification (Firebase Cloud Messaging)
   เรียก setupPushNotification(user) หลัง login สำเร็จ
   ═══════════════════════════════════════════════ */
var VAPID_KEY = 'BFjNBoM8RKpspcsUtSQBY5tfFXL-6uxbHFUY-oNOXDOE5PxD1rYMIpqBAmz2DhISZQKRWtuAihEnLbxr4zZqPvo';

/* เช็คว่ากำลังรันแบบ standalone (เปิดจากไอคอนหน้าจอ Home) อยู่หรือไม่
   จำเป็นสำหรับ iOS: Notification API จะใช้งานได้เต็มรูปแบบก็ต่อเมื่อ
   เปิดผ่านไอคอนที่ Add to Home Screen แล้วเท่านั้น เปิดผ่าน Safari tab
   ธรรมดาจะขอ permission ไม่ได้ผลจริง */
function _isStandalonePWA() {
  return window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
}

/**
 * เรียกอัตโนมัติหลัง login (จาก common.js auth callback)
 * ทำหน้าที่แค่ "เช็คสถานะ" และ refresh token ถ้าเคย granted ไว้แล้วเท่านั้น
 * ⚠️ จะไม่เรียก Notification.requestPermission() ตรงนี้เด็ดขาด เพราะ callback
 * นี้เป็น async ที่หลุดจาก user gesture ไปแล้ว — iOS Safari จะเงียบไม่เด้ง
 * permission dialog ให้เลยถ้าเรียกจากจุดที่ไม่ใช่ synchronous call stack ของ
 * การแตะหน้าจอโดยตรง (Android/Chrome ไม่เข้มงวดเรื่องนี้ เลยดูเหมือนใช้ได้ปกติ)
 */
function setupPushNotification(user) {
  if (!user || !('Notification' in window) || typeof firebase.messaging !== 'function') {
    return Promise.resolve(null);
  }

  var isIOS = /iP(hone|od|ad)/.test(navigator.userAgent);

  if (Notification.permission === 'granted') {
    /* granted อยู่แล้ว → ขอ token/refresh ได้เลยโดยไม่ต้องมี gesture ใหม่ */
    return _requestAndSaveToken(user);
  }

  if (Notification.permission === 'denied') {
    return Promise.resolve(null); /* ผู้ใช้เคยปฏิเสธไปแล้ว ไม่รบกวนซ้ำ */
  }

  /* permission === 'default' (ยังไม่เคยถาม) */
  if (isIOS && !_isStandalonePWA()) {
    /* เปิดผ่าน Safari tab ปกติ ยังไม่ได้เปิดจากไอคอน Home — ข้ามไปก่อน
       รอให้ผู้ใช้เปิดจากไอคอนที่ติดตั้งแล้วค่อยขอ */
    console.log('iOS: กรุณาเปิดแอปจากไอคอนหน้าจอ Home เพื่อเปิดใช้การแจ้งเตือน');
    return Promise.resolve(null);
  }

  /* บอก common.js ให้แสดงปุ่ม "เปิดการแจ้งเตือน" ให้ผู้ใช้แตะเอง
     (ต้องเป็น real user gesture ถึงจะขอ permission ได้ผลบน iOS) */
  if (typeof window.onPushPermissionNeeded === 'function') {
    window.onPushPermissionNeeded(user);
  }
  return Promise.resolve(null);
}

/* helper: ครอบ promise ด้วย timeout กัน getToken()/getRegistration() ค้างตลอดไป
   (พบว่า Firebase Messaging SDK บางเวอร์ชันค้างเงียบๆ ไม่ resolve/reject บน
   iOS Safari — ต้องมี timeout เพื่อให้รู้ว่าค้างที่ไหน แทนที่จะรอไม่มีกำหนด) */
function _withTimeout(promise, ms, label) {
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      reject(new Error('TIMEOUT: ' + label + ' ใช้เวลาเกิน ' + (ms / 1000) + ' วินาที'));
    }, ms);
    promise.then(function(v) { clearTimeout(timer); resolve(v); },
                 function(e) { clearTimeout(timer); reject(e); });
  });
}

/**
 * เรียกจาก onclick ของปุ่ม "เปิดการแจ้งเตือน" เท่านั้น
 * ต้องอยู่ใน synchronous call stack ของการแตะปุ่มโดยตรง ห้ามมี await/then
 * คั่นก่อนเรียก Notification.requestPermission() ไม่งั้น iOS จะไม่เด้ง dialog
 * @param {Function} [onStatus] - callback(text) รายงานสถานะทีละขั้น สำหรับโชว์บนจอ
 */
function requestPushPermission(user, onStatus) {
  function status(s) {
    console.log('[push]', s);
    if (typeof onStatus === 'function') onStatus(s);
  }

  if (!user || !('Notification' in window)) {
    status('เบราว์เซอร์นี้ไม่รองรับ Notification API');
    return Promise.resolve(null);
  }

  status('กำลังขอ permission...');
  return Notification.requestPermission().then(function(permission) {
    status('permission = ' + permission);
    if (permission !== 'granted') {
      console.warn('ผู้ใช้ไม่ได้อนุญาตการแจ้งเตือน');
      return null;
    }
    return _requestAndSaveToken(user, status);
  }).catch(function(err) {
    status('เกิดข้อผิดพลาด: ' + (err && err.message ? err.message : err));
    console.error('requestPushPermission error:', err);
    return null;
  });
}
window.requestPushPermission = requestPushPermission;

function _requestAndSaveToken(user, status) {
  status = status || function() {};

  /* เช็คก่อนว่า browser นี้รองรับ Firebase Messaging จริงไหม (compat SDK มี
     firebase.messaging.isSupported() ให้เช็คแบบ sync) กัน error ที่ไม่ชัดเจน */
  if (firebase.messaging.isSupported && !firebase.messaging.isSupported()) {
    status('เบราว์เซอร์นี้ไม่รองรับ Firebase Messaging (isSupported = false)');
    return Promise.resolve(null);
  }

  status('กำลังเช็ค service worker registration...');
  return _withTimeout(navigator.serviceWorker.getRegistration('/webapp/'), 8000, 'getRegistration')
    .then(function(reg) {
      if (!reg) {
        status('ไม่พบ service worker ที่ scope /webapp/');
        throw new Error('ไม่มี SW registration ที่ scope /webapp/');
      }
      status('พบ SW แล้ว (' + (reg.active ? 'active' : 'ยังไม่ active') + ') กำลังขอ FCM token...');
      /* sw.js ลงทะเบียนไว้แล้วใน page-template.html — ใช้ตัวเดิม ไม่ลงทะเบียนซ้ำ */
      var messaging = firebase.messaging();
      return _withTimeout(
        messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg }),
        12000,
        'getToken'
      );
    })
    .then(function(token) {
      if (!token) {
        status('ไม่ได้ token กลับมา (ค่าว่าง)');
        return null;
      }
      status('ได้ token แล้ว กำลังบันทึกลง Firestore...');

      /* ลบ token เก่าของ userId เดิมทิ้งก่อน (กันมี token ซ้ำหลายตัว → แจ้งเตือนซ้ำ)
         เก็บไว้แค่ token ตัวล่าสุด (ตัวที่กำลังจะบันทึกนี้) */
      return db.collection('fcmTokens').where('userId', '==', user.uid).get().then(function(snap) {
        var batch = db.batch();
        snap.forEach(function(doc) {
          if (doc.id !== token) batch.delete(doc.ref);
        });
        return batch.commit();
      }).then(function() {
        return db.collection('fcmTokens').doc(token).set({
          userId: user.uid,
          email: (user.email || '').toLowerCase(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }).then(function() {
        status('บันทึก token สำเร็จ ✅ เปิดแจ้งเตือนแล้ว');
        console.log('FCM token บันทึกแล้ว:', token);
        return token;
      });
    })
    .catch(function(err) {
      status('ล้มเหลว: ' + (err && err.message ? err.message : err));
      console.error('_requestAndSaveToken error:', err);
      return null;
    });
}

/* แสดงแจ้งเตือนตอนเปิดหน้าเว็บอยู่ (foreground) */
if (typeof firebase.messaging === 'function') {
  try {
    firebase.messaging().onMessage(function(payload) {
      var data = payload.data || {};
      if (data.title && Notification.permission === 'granted') {
        var n = new Notification(data.title, { body: data.body || '' });
        n.onclick = function() {
          var url = data.url || '/webapp/index.html';
          window.open(url, '_blank');
        };
      }
    });
  } catch (e) { /* messaging ใช้ไม่ได้ในบางเบราว์เซอร์ เช่น Safari บางเวอร์ชัน — ข้ามไปเฉยๆ */ }
}
