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

function setupPushNotification(user) {
  if (!user || !('Notification' in window) || typeof firebase.messaging !== 'function') {
    return Promise.resolve(null);
  }

  return Notification.requestPermission().then(function(permission) {
    if (permission !== 'granted') {
      console.warn('ผู้ใช้ไม่ได้อนุญาตการแจ้งเตือน');
      return null;
    }

    return navigator.serviceWorker.getRegistration('/webapp/').then(function(reg) {
      /* sw.js ลงทะเบียนไว้แล้วใน page-template.html — ใช้ตัวเดิม ไม่ลงทะเบียนซ้ำ */
      var messaging = firebase.messaging();
      return messaging.getToken({
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: reg
      });
    }).then(function(token) {
      if (!token) {
        console.warn('ไม่สามารถขอ FCM token ได้');
        return null;
      }

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
        console.log('FCM token บันทึกแล้ว');
        return token;
      });
    });
  }).catch(function(err) {
    console.error('setupPushNotification error:', err);
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
