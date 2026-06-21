// ===========================================
// firebase-init.js
// เชื่อมต่อ Firebase + จัดการ Push Notification
// ===========================================

// 1) แก้ค่าด้านล่างนี้ให้เป็นค่าจาก Firebase Console
//    (Project Settings > General > Your apps > Web app)
const firebaseConfig = {
  apiKey: "AIzaSyDBtM8x62v2KafPuGtiE29gRF7IxM2pITU",
  authDomain: "np-webapp-74616.firebaseapp.com",
  databaseURL: "https://np-webapp-74616-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "np-webapp-74616",
  storageBucket: "np-webapp-74616.firebasestorage.app",
  messagingSenderId: "275537025660",
  appId: "1:275537025660:web:4fdc11e0fe22e679f6c7f9",
};

// 2) แก้ค่านี้ให้เป็น VAPID key จาก
//    Project Settings > Cloud Messaging > Web configuration > Key pair
const VAPID_KEY =
  "BFjNBoM8RKpspcsUtSQBY5tfFXL-6uxbHFUY-oNOXDOE5PxD1rYMIpqBAmz2DhISZQKRWtuAihEnLbxr4zZqPvo";

// Import แบบ ES module (ใช้กับ <script type="module">)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getMessaging,
  getToken,
  onMessage,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ตั้งชื่อ app แยก ("messaging") ไม่ใช้ชื่อ default
// เพราะหน้าเว็บ initializeApp() ของ [DEFAULT] ไปแล้วผ่าน compat SDK ใน shared/firebase.js
// ถ้าเรียก initializeApp() ซ้ำชื่อ default จะ error "Firebase App named '[DEFAULT]' already exists"
const app = initializeApp(firebaseConfig, "messaging");
const messaging = getMessaging(app);
const db = getFirestore(app);

/**
 * ขอ permission แจ้งเตือนจากผู้ใช้ และถ้าอนุญาต ให้ขอ FCM token
 * แล้วบันทึก token นั้นลง Firestore (collection "fcmTokens")
 *
 * @param {string} userId - uid ของผู้ใช้ (user.uid)
 * @param {string} email - อีเมลผู้ใช้ (user.email) ใช้สำหรับแจ้งเตือนตาม permission
 * @param {string} role - เช่น "staff" หรือ "customer" เผื่อใช้กรองตอนส่ง
 */
export async function setupPushNotification(userId, email, role = "customer") {
  try {
    // ขอ permission จากเบราว์เซอร์
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.warn("ผู้ใช้ไม่ได้อนุญาตการแจ้งเตือน");
      return null;
    }

    // ลงทะเบียน Service Worker (ไฟล์ firebase-messaging-sw.js)
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    // ขอ FCM token ของอุปกรณ์/เบราว์เซอร์นี้
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("ไม่สามารถขอ token ได้ ตรวจสอบ permission อีกครั้ง");
      return null;
    }

    console.log("FCM Token:", token);

    // บันทึก token ลง Firestore เพื่อให้ Cloud Function เรียกใช้ส่งแจ้งเตือนได้
    // โครงสร้าง: fcmTokens/{token} = { userId, role, updatedAt }
    await setDoc(doc(db, "fcmTokens", token), {
      userId,
      email,
      role,
      updatedAt: serverTimestamp(),
    });

    // ฟังข้อความตอนที่หน้าเว็บเปิดอยู่ (foreground)
    onMessage(messaging, (payload) => {
      console.log("ได้รับแจ้งเตือนตอนเปิดหน้าเว็บอยู่:", payload);

      // แสดง notification เองตอน foreground (เพราะ FCM จะไม่ auto-show ตอนเปิดแท็บอยู่)
      const { title, body } = payload.notification || {};
      if (title) {
        new Notification(title, {
          body: body || "",
          icon: "/icons/notification-icon.png",
        });
      }
    });

    return token;
  } catch (err) {
    console.error("เกิดข้อผิดพลาดตอนตั้งค่า push notification:", err);
    return null;
  }
}

// expose เป็น global function เพราะหน้า .html อื่นเรียกใช้แบบ
// `if (typeof setupPushNotification === 'function') setupPushNotification(...)`
// ไม่ได้ import แบบ ES module
window.setupPushNotification = setupPushNotification;
