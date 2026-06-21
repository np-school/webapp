// ===========================================
// firebase-messaging-sw.js
// ต้องอยู่ที่ "root" ของเว็บไซต์ เช่น https://yourdomain.com/firebase-messaging-sw.js
// (ห้ามอยู่ในโฟลเดอร์ย่อย ไม่งั้นจะลงทะเบียนไม่ได้ถูกต้อง)
// ===========================================

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

// แก้ค่าด้านล่างนี้ให้เหมือนกับ firebase-init.js (ใช้ config เดียวกัน)
firebase.initializeApp({
  apiKey: "AIzaSyDBtM8x62v2KafPuGtiE29gRF7IxM2pITU",
  authDomain: "np-webapp-74616.firebaseapp.com",
  databaseURL: "https://np-webapp-74616-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "np-webapp-74616",
  storageBucket: "np-webapp-74616.firebasestorage.app",
  messagingSenderId: "275537025660",
  appId: "1:275537025660:web:4fdc11e0fe22e679f6c7f9",
});

const messaging = firebase.messaging();

// จัดการแจ้งเตือนตอนเว็บถูกปิด/อยู่เบื้องหลัง (background)
messaging.onBackgroundMessage((payload) => {
  console.log("ได้รับแจ้งเตือนตอนปิดแท็บ/เบื้องหลัง:", payload);

  const { title, body } = payload.notification || {};

  const notificationTitle = title || "มีการแจ้งเตือนใหม่";
  const notificationOptions = {
    body: body || "",
    icon: "/icons/notification-icon.png", // เปลี่ยนเป็น path ไอคอนของคุณ
    badge: "/icons/badge-icon.png",
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ทำให้คลิกแจ้งเตือนแล้วเปิดหน้าเว็บที่ต้องการ
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
