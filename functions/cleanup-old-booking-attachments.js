// ===========================================
// functions/cleanup-old-booking-attachments.js
// ลบไฟล์แนบการจองห้องที่เก่ากว่า RETENTION_DAYS วันโดยอัตโนมัติ (ประหยัดพื้นที่ Drive)
// รันเป็น scheduled function ทุกวัน — ไม่ลบ document การจองใน Firestore เพื่อให้
// ยังดูประวัติการจองย้อนหลังได้ แค่ล้างไฟล์แนบ + เคลียร์ field ที่ชี้ไปยังไฟล์นั้น
// ===========================================

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore } = require("firebase-admin/firestore");
const { google } = require("googleapis");

const DRIVE_SA_KEY = defineSecret("DRIVE_SA_KEY"); // secret ตัวเดียวกับ drive-upload-booking.js
const IMPERSONATE_EMAIL = "nattapol@nongki.ac.th";
const RETENTION_DAYS = 365;

function cutoffDateStr() {
  var d = new Date();
  d.setDate(d.getDate() - RETENTION_DAYS);
  /* booking.date เก็บเป็นสตริง 'YYYY-MM-DD' (Asia/Bangkok) — เทียบแบบ string
     ได้ตรงๆ เพราะเป็นรูปแบบ ISO เรียงตามลำดับเวลาอยู่แล้ว */
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(d);
}

exports.cleanupOldBookingAttachments = onSchedule(
  { schedule: "0 3 * * *", timeZone: "Asia/Bangkok", region: "us-central1", secrets: [DRIVE_SA_KEY] },
  async () => {
    const db = getFirestore();
    const cutoff = cutoffDateStr();

    const snap = await db.collection("bookings")
      .where("hasLayout", "==", true)
      .where("date", "<", cutoff)
      .get();

    if (snap.empty) {
      console.log("[cleanup] ไม่มีไฟล์แนบการจองห้องเก่ากว่า " + RETENTION_DAYS + " วันที่ต้องลบ");
      return;
    }
    console.log("[cleanup] พบ " + snap.size + " booking ที่มีไฟล์แนบเก่ากว่า " + cutoff);

    const credentials = JSON.parse(DRIVE_SA_KEY.value());
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
      clientOptions: { subject: IMPERSONATE_EMAIL },
    });
    const drive = google.drive({ version: "v3", auth });

    for (const doc of snap.docs) {
      const b = doc.data();
      try {
        if (b.layoutFileId) {
          /* ไฟล์แนบที่อัปโหลดผ่าน uploadBookingAttachment (Drive) */
          await drive.files.delete({ fileId: b.layoutFileId, supportsAllDrives: true })
            .catch(function(e) { if (!(e && (e.code === 404 || e.status === 404))) throw e; });
        }
        /* หมายเหตุ: booking เก่าที่อัปโหลดไว้ก่อนย้ายมาใช้ Drive (มี layoutUrl เป็น
           Firebase Storage download URL แต่ไม่มี layoutFileId) จะไม่ถูกลบไฟล์จริงจาก
           ฟังก์ชันนี้ — ให้ใช้สคริปต์ล้าง Firebase Storage แยกต่างหากสำหรับข้อมูลเก่าก้อนนั้น
           ครั้งเดียวตอนย้ายระบบ (ไฟล์ใหม่ทั้งหมดหลังจากนี้จะมี layoutFileId เสมอ) */
        await doc.ref.update({
          hasLayout: false,
          layoutUrl: null,
          layoutFileId: null,
          layoutName: null,
          layoutDeletedAt: new Date(),
          layoutDeletedReason: "auto-cleanup-" + RETENTION_DAYS + "d",
        });
        console.log("[cleanup] ลบไฟล์แนบของ booking " + doc.id + " สำเร็จ");
      } catch (e) {
        console.error("[cleanup] ลบไฟล์แนบของ booking " + doc.id + " ไม่สำเร็จ:", e && e.message);
      }
    }
  }
);
