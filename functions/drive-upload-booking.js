// ===========================================
// functions/drive-upload-booking.js
// อัปโหลด/ลบไฟล์แนบการจองห้อง (room-request.html) เข้า Google Drive
// โดยใช้ Service Account ตัวเดียวกับ functions/drive-upload.js (repair photos)
// ===========================================
//
// ทำไมต้องเป็น Service Account (ไม่ใช้ client-side OAuth แบบ portfolio-teacher.js)?
// ผู้จองห้องมีทั้งบุคลากรและ "บุคคลภายนอก" ที่ล็อกอินด้วย Gmail ส่วนตัว —
// คนกลุ่มนี้ไม่มีสิทธิ์เข้าถึง Shared Drive ของโรงเรียนอยู่แล้ว ถ้าใช้ client-side
// OAuth (ขอ token จากบัญชีผู้ใช้เองแบบพอร์ตโฟลิโอครู) จะเขียนไฟล์ไม่ได้เลย
// วิธีนี้ให้ "เซิร์ฟเวอร์" เป็นคนเขียนแทนเสมอ (สวมสิทธิ์ IMPERSONATE_EMAIL เดียวกับ
// drive-upload.js) ผู้จองไม่ต้องมีสิทธิ์ Drive ใดๆ เลย ใช้ได้กับทุกคนที่จองห้อง
//
// ✏️ ต้องตั้งค่าก่อนใช้งาน:
// 1) ถ้าเคย deploy functions/drive-upload.js (uploadRepairPhoto) ไปแล้ว
//    Service Account + Domain-Wide Delegation (secret DRIVE_SA_KEY) ใช้ตัวเดิมได้เลย
//    ไม่ต้องสร้างใหม่ — ข้ามไปข้อ 2 ได้
//    (ถ้ายังไม่เคยตั้ง ทำตามขั้นตอนในคอมเมนต์ต้นไฟล์ drive-upload.js ก่อน)
// 2) สร้างโฟลเดอร์ปลายทางใน Shared Drive สำหรับเก็บไฟล์แนบการจองห้องโดยเฉพาะ
//    (แยกจากโฟลเดอร์ portfolio/repair) แล้วแก้ ROOT_FOLDER_ID ด้านล่างเป็น Folder ID นั้น
//    (ต้องเป็นโฟลเดอร์ที่ IMPERSONATE_EMAIL เป็นเจ้าของ/มีสิทธิ์แก้ไขอยู่แล้ว)
// 3) ติดตั้ง dependency แล้ว deploy:
//      firebase deploy --only functions:uploadBookingAttachment,functions:deleteBookingAttachment
// 4) จะได้ URL หน้าตาแบบ:
//      https://REGION-PROJECT_ID.cloudfunctions.net/uploadBookingAttachment
//      https://REGION-PROJECT_ID.cloudfunctions.net/deleteBookingAttachment
//    เอา URL ทั้งสองไปใส่แทน BOOKING_UPLOAD_URL / BOOKING_DELETE_URL ใน
//    js/room-request.js และ shared/common.js ตามลำดับ
//
// ===========================================

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { google } = require("googleapis");
const { Readable } = require("stream");

const DRIVE_SA_KEY = defineSecret("DRIVE_SA_KEY"); // secret ตัวเดียวกับ drive-upload.js

/* ✏️ แก้เป็น Folder ID ของโฟลเดอร์ปลายทางสำหรับไฟล์แนบการจองห้องใน Shared Drive */
const ROOT_FOLDER_ID = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

/* ✏️ อีเมลจริงในโดเมนโรงเรียนที่ service account จะสวมสิทธิ์ — ใช้ตัวเดียวกับ
   drive-upload.js ได้เลยถ้า Domain-Wide Delegation ตั้งไว้แล้ว */
const IMPERSONATE_EMAIL = "nattapol@nongki.ac.th";

function cleanName(s) {
  return (s || "").toString().replace(/[\\/:*?"<>|]/g, "").trim();
}
function formatBangkok(date, opts) {
  return new Intl.DateTimeFormat("sv-SE", Object.assign({ timeZone: "Asia/Bangkok" }, opts)).format(date);
}
function getDriveClient() {
  const credentials = JSON.parse(DRIVE_SA_KEY.value());
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
    clientOptions: { subject: IMPERSONATE_EMAIL },
  });
  return google.drive({ version: "v3", auth });
}

/* หา/สร้างโฟลเดอร์รายเดือน เช่น "2026-09" ใต้ ROOT_FOLDER_ID (เหมือน drive-upload.js) */
async function getOrCreateMonthFolder(drive, d) {
  const monthKey = formatBangkok(d, { year: "numeric", month: "2-digit" });
  const listRes = await drive.files.list({
    q: `'${ROOT_FOLDER_ID}' in parents and name='${monthKey}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: "allDrives",
  });
  if (listRes.data.files && listRes.data.files.length > 0) return listRes.data.files[0].id;
  const folder = await drive.files.create({
    requestBody: { name: monthKey, mimeType: "application/vnd.google-apps.folder", parents: [ROOT_FOLDER_ID] },
    fields: "id",
    supportsAllDrives: true,
  });
  return folder.data.id;
}

exports.uploadBookingAttachment = onRequest(
  { secrets: [DRIVE_SA_KEY], cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }
    try {
      const data = req.body || {};
      if (!data.data || !data.filename) {
        res.status(400).json({ error: "ข้อมูลรูปไม่ครบ (ต้องมี filename และ data)" });
        return;
      }

      const drive = getDriveClient();
      const d = data.bookingDate ? new Date(data.bookingDate) : new Date();
      const monthFolderId = await getOrCreateMonthFolder(drive, d);

      const dateStr = formatBangkok(d, { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/-/g, "");
      const ext = (data.filename.match(/\.[a-zA-Z0-9]+$/) || [""])[0] || ".jpg";
      const baseName = dateStr + "-" + cleanName(data.room) + "-" + cleanName(data.requesterName) + ext;

      const buffer = Buffer.from(data.data, "base64");
      const stream = Readable.from(buffer);

      const file = await drive.files.create({
        requestBody: { name: baseName, parents: [monthFolderId] },
        media: { mimeType: data.mimeType || "image/jpeg", body: stream },
        fields: "id, name",
        supportsAllDrives: true,
      });

      try {
        await drive.permissions.create({
          fileId: file.data.id,
          requestBody: { role: "reader", type: "anyone" },
          supportsAllDrives: true,
        });
      } catch (shareErr) {
        // บาง Google Workspace org ปิดการแชร์แบบ "Anyone with the link" ไว้ที่ระดับ
        // Admin Console — fallback มาแชร์แบบ "ใครก็ได้ในโดเมนองค์กร" แทน (ดูคำอธิบาย
        // เต็มๆ ใน drive-upload.js)
        console.warn("permissions.create(type=anyone) ล้มเหลว กำลัง fallback เป็น type=domain:", shareErr && shareErr.message);
        await drive.permissions.create({
          fileId: file.data.id,
          requestBody: { role: "reader", type: "domain", domain: "nongki.ac.th" },
          supportsAllDrives: true,
        });
      }

      res.json({
        fileId: file.data.id,
        url: "https://drive.google.com/thumbnail?id=" + file.data.id + "&sz=w2000",
        name: file.data.name,
      });
    } catch (err) {
      console.error("uploadBookingAttachment error:", err);
      res.status(500).json({ error: (err && err.message) || "อัปโหลดไม่สำเร็จ" });
    }
  }
);

/* ลบไฟล์แนบ — เรียกตอนผู้จองยกเลิก / แอดมินลบคำขอ (room-request.js, room-admin.js)
   และตอน auto-cleanup ไฟล์เก่ากว่า 1 ปี (ดู functions/cleanup-old-booking-attachments.js) */
exports.deleteBookingAttachment = onRequest(
  { secrets: [DRIVE_SA_KEY], cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }
    try {
      const { fileId } = req.body || {};
      if (!fileId) { res.status(400).json({ error: "ต้องระบุ fileId" }); return; }

      const drive = getDriveClient();
      try {
        await drive.files.delete({ fileId, supportsAllDrives: true });
      } catch (err) {
        /* 404 = ไฟล์ถูกลบไปแล้วก่อนหน้า (เช่น auto-cleanup ลบไปแล้ว) ถือว่าสำเร็จ ไม่ต้อง throw */
        if (!(err && (err.code === 404 || err.status === 404))) throw err;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("deleteBookingAttachment error:", err);
      res.status(500).json({ error: (err && err.message) || "ลบไฟล์ไม่สำเร็จ" });
    }
  }
);
