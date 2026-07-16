// ===========================================
// functions/notifications.js
// Push Notification triggers สำหรับระบบจองห้อง (NP Origins)
// ===========================================
//
// อ้างอิงโครงสร้าง Firestore จริงจากระบบ:
//
//   bookings/{bookingId}
//     - userId, userName, userPhoto
//     - room, date, startTime, endTime, purpose
//     - status: 'pending' | 'approved' | 'rejected'
//     - createdAt, updatedAt
//
//   admins/{email}              (email เป็น lowercase, ใช้เป็น doc id)
//     - permissions: { bookings: true, staff: true, portfolio: true, foodcourt: true, ... }
//
//   fcmTokens/{token}
//     - userId, email, updatedAt
//
// SUPERADMIN_EMAIL ถูกกำหนดไว้ใน common.js ฝั่ง frontend
// ในฝั่ง Cloud Functions ต้องกำหนดซ้ำที่นี่ (แก้ค่าด้านล่างให้ตรงกับของจริง)

const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const {
  onDocumentUpdated,
  onDocumentCreated,
} = require("firebase-functions/v2/firestore");

// SUPERADMIN_EMAIL เดียวกับที่กำหนดไว้ใน common.js (บรรทัด var SUPERADMIN_EMAIL = ...)
const SUPERADMIN_EMAIL = "nattapol@nongki.ac.th";

const db = getFirestore();
const messaging = getMessaging();

/**
 * ส่งแจ้งเตือนไปยังผู้ใช้ตาม userId (ทุก token ที่เคยลงทะเบียนไว้)
 */
async function sendToUser(userId, title, body, data = {}) {
  const tokensSnap = await db
    .collection("fcmTokens")
    .where("userId", "==", userId)
    .get();

  if (tokensSnap.empty) return;

  const tokens = tokensSnap.docs.map((doc) => doc.id);
  await sendAndCleanup(tokens, title, body, data);
}

/**
 * ส่งแจ้งเตือนไปยังเจ้าหน้าที่ทุกคนที่มี permission ที่กำหนด (เช่น "bookings")
 * รวม SuperAdmin ด้วยเสมอ
 */
async function sendToPermission(permissionKey, title, body, data = {}) {
  const adminsSnap = await db.collection("admins").get();

  const targetEmails = [];
  adminsSnap.forEach((doc) => {
    const perms = doc.data().permissions || {};
    if (perms[permissionKey]) {
      targetEmails.push(doc.id); // doc id คือ email (lowercase)
    }
  });

  // SuperAdmin ได้รับแจ้งเตือนทุก permission เสมอ ไม่ต้องมี doc ใน admins ก็ได้
  if (!targetEmails.includes(SUPERADMIN_EMAIL)) {
    targetEmails.push(SUPERADMIN_EMAIL);
  }

  if (targetEmails.length === 0) return;

  // ดึง token ของทุก email ที่เกี่ยวข้อง (Firestore 'in' query รับสูงสุด 30 ค่า/ครั้ง)
  const tokens = [];
  for (let i = 0; i < targetEmails.length; i += 30) {
    const chunk = targetEmails.slice(i, i + 30);
    const snap = await db
      .collection("fcmTokens")
      .where("email", "in", chunk)
      .get();
    snap.forEach((doc) => tokens.push(doc.id));
  }

  if (tokens.length === 0) return;
  await sendAndCleanup(tokens, title, body, data);
}

/**
 * Helper: ส่งจริง + ลบ token ที่ใช้ไม่ได้แล้วออกจาก Firestore
 */
async function sendAndCleanup(tokens, title, body, data) {
  /* ส่งแบบ data-only (ไม่มี field "notification") โดยเจตนา —
     ถ้าใส่ทั้ง notification + data พร้อมกัน บางเบราว์เซอร์ (เช่น Chrome บน Android)
     จะ auto-display แจ้งเตือนจาก field notification เองอัตโนมัติ
     ซ้ำกับที่ onBackgroundMessage ใน sw.js แสดงเองอีกที → ขึ้นแจ้งเตือนซ้อนกัน 2 อัน
     (อันนึงไม่มีโลโก้เพราะเป็น default ของระบบ, อีกอันมีโลโก้จากโค้ดเรา)
     data-only message ทำให้ onBackgroundMessage เป็นคนคุมการแสดงผลทั้งหมดแต่ผู้เดียว
     ⚠️ ค่าทุกตัวใน data ต้องเป็น string เท่านั้น (ข้อจำกัดของ FCM data payload) */
  const response = await messaging.sendEachForMulticast({
    data: Object.assign({ title, body }, data),
    tokens,
  });

  console.log(
    `ส่งแจ้งเตือน: สำเร็จ ${response.successCount}, ล้มเหลว ${response.failureCount}`
  );

  const deletions = [];
  response.responses.forEach((res, idx) => {
    if (!res.success) {
      const code = res.error?.code;
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        deletions.push(db.collection("fcmTokens").doc(tokens[idx]).delete());
      }
    }
  });
  await Promise.all(deletions);
}

/**
 * ส่งแจ้งเตือนไปยังอีเมลที่ระบุโดยตรง (ใช้กับผู้ตรวจแต่ละขั้นของระบบส่งงาน
 * ที่ทราบอีเมลอยู่แล้วจาก admins collection — ไม่ต้องวนเช็ค permission ทั้งหมดแบบ sendToPermission)
 */
async function sendToEmail(email, title, body, data = {}) {
  if (!email) return;
  const tokensSnap = await db
    .collection("fcmTokens")
    .where("email", "==", String(email).toLowerCase())
    .get();

  if (tokensSnap.empty) return;

  const tokens = tokensSnap.docs.map((doc) => doc.id);
  await sendAndCleanup(tokens, title, body, data);
}

/* export helper functions ให้ trigger ไฟล์อื่น (เช่น portfolio-notifications.js) เรียกใช้ซ้ำได้
   โดยไม่ต้องคัดลอกโค้ดส่งแจ้งเตือน/cleanup token ซ้ำ */
exports.sendToUser = sendToUser;
exports.sendToEmail = sendToEmail;
exports.sendToPermission = sendToPermission;

// ===========================================
// 1) สถานะ booking เปลี่ยน (pending -> approved/rejected) -> แจ้งผู้จอง
// ===========================================
exports.onBookingStatusChanged = onDocumentUpdated(
  "bookings/{bookingId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status === after.status) return;

    const statusText =
      after.status === "approved"
        ? "ได้รับการอนุมัติแล้ว ✅"
        : after.status === "rejected"
        ? "ถูกปฏิเสธ ❌"
        : after.status;

    await sendToUser(
      after.userId,
      "สถานะการจองห้องอัปเดต",
      `การจอง "${after.room || ""}" วันที่ ${after.date || ""} ${statusText}`,
      { url: "/webapp/room-request.html" }
    );
  }
);

// ===========================================
// 2) มีคำขอจองห้องใหม่ -> แจ้งเจ้าหน้าที่ที่มี permission "bookings"
// ===========================================
exports.onNewBookingCreated = onDocumentCreated(
  "bookings/{bookingId}",
  async (event) => {
    const data = event.data.data();

    await sendToPermission(
      "bookings",
      "มีคำขอจองห้องใหม่",
      `${data.userName || "ผู้ใช้"} ขอจอง "${data.room || ""}" วันที่ ${
        data.date || ""
      }`,
      { url: "/webapp/room-admin.html" }
    );
  }
);

// ===========================================
// 3) มีรายการแจ้งซ่อมใหม่ (สถานะ "reported") -> แจ้งเจ้าหน้าที่ที่มี permission "repair"
// ===========================================
exports.onNewRepairCreated = onDocumentCreated(
  "repairs/{repairId}",
  async (event) => {
    const data = event.data.data();

    await sendToPermission(
      "repair",
      "มีรายการแจ้งซ่อมใหม่",
      `${data.reporterName || data.reporterEmail || "ผู้แจ้ง"} แจ้ง "${
        data.title || ""
      }" ที่ ${data.location || "-"}`,
      { url: "/webapp/repair-admin.html" }
    );
  }
);

// ===========================================
// 4) สถานะแจ้งซ่อมเปลี่ยน (approved/rejected/waiting/done/closed ฯลฯ)
//    -> แจ้งผู้แจ้งซ่อม (reporterUid)
//    ยกเว้นตอนเปลี่ยนเป็น "reopened" เพราะเคสนั้นเป็นฝั่งผู้แจ้งกดเองอยู่แล้ว
//    (มี onRepairReopened แจ้งสตาฟแยกไว้ต่างหากด้านล่าง)
// ===========================================
const REPAIR_STATUS_TEXT = {
  approved: "ได้รับการอนุมัติแล้ว ✅",
  rejected: "ถูกปฏิเสธ ❌",
  waiting: "รอดำเนินการซ่อม/รออะไหล่ ⏳",
  inprogress: "กำลังดำเนินการซ่อม 🔧",
  done: "ดำเนินการซ่อมเสร็จแล้ว ✅",
  closed: "ปิดงานแล้ว 📁",
};

exports.onRepairStatusChanged = onDocumentUpdated(
  "repairs/{repairId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status === after.status) return;
    if (after.status === "reopened") return; // จัดการแยกใน onRepairReopened

    if (!after.reporterUid) return;

    const statusText = REPAIR_STATUS_TEXT[after.status] || after.status;

    await sendToUser(
      after.reporterUid,
      "สถานะแจ้งซ่อมอัปเดต",
      `"${after.title || ""}" ${statusText}`,
      { url: "/webapp/repair-user.html" }
    );
  }
);

// ===========================================
// 5) งานซ่อมถูกเปิดใหม่ (ผู้แจ้งตรวจสอบแล้วยังไม่เรียบร้อย: done -> reopened)
//    -> แจ้งเจ้าหน้าที่ที่มี permission "repair" อีกครั้ง เพราะต้องรับเรื่องใหม่
// ===========================================
exports.onRepairReopened = onDocumentUpdated(
  "repairs/{repairId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status === after.status) return;
    if (after.status !== "reopened") return;

    await sendToPermission(
      "repair",
      "มีงานซ่อมถูกเปิดใหม่ ⚠️",
      `ผู้แจ้งตรวจสอบแล้วว่า "${after.title || ""}" ยังไม่เรียบร้อย (${
        after.reporterName || after.reporterEmail || "ผู้แจ้ง"
      })`,
      { url: "/webapp/repair-admin.html" }
    );
  }
);
