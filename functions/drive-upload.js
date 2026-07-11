// ===========================================
// functions/drive-upload.js
// อัปโหลดรูปแจ้งซ่อมเข้า Google Drive โดยใช้ Service Account
// (ทดแทนวิธีเดิมที่ใช้ Google Apps Script Web App)
// ===========================================
//
// ✏️ ต้องตั้งค่าก่อนใช้งาน (ทำครั้งเดียว):
//
// 1) สร้าง Service Account
//    - ไปที่ Google Cloud Console (โปรเจกต์เดียวกับ Firebase) > IAM & Admin > Service Accounts
//    - Create Service Account เช่น "drive-uploader"
//    - เข้าไปที่ service account ที่สร้าง > Keys > Add Key > Create new key > JSON
//      จะได้ไฟล์ .json โหลดลงเครื่อง (เก็บเป็นความลับ ห้าม commit ขึ้น GitHub)
//
// 2) ตั้งค่า Domain-Wide Delegation (แทนการแชร์โฟลเดอร์ข้ามโดเมน เพราะ
//    Google Workspace ของโรงเรียนไม่อนุญาตให้ allowlist โดเมน gserviceaccount.com)
//    - เปิดไฟล์ JSON key หา field "client_id" (ตัวเลขยาวๆ)
//    - แอดมิน Workspace เข้า admin.google.com > Security > API Controls
//      > Domain-wide Delegation > Add new
//    - ใส่ Client ID จากข้อบน + OAuth Scope: https://www.googleapis.com/auth/drive
//    - Save
//    ผลคือ service account จะ "สวมสิทธิ์" เป็นอีเมลจริงในโดเมนได้ (ตัวแปร
//    IMPERSONATE_EMAIL ด้านล่าง) ไฟล์ที่สร้างจะเป็นของอีเมลนั้นโดยตรง
//    ไม่ต้องแชร์โฟลเดอร์กับ service account เลย
//
// 3) เก็บ JSON key เป็น Secret ของ Cloud Functions (ไม่ต้องใส่ค่าตรงในโค้ด)
//    รันคำสั่งนี้ในเครื่อง (ต้องติดตั้ง firebase-tools แล้ว):
//
//      firebase functions:secrets:set DRIVE_SA_KEY
//
//    แล้ววางเนื้อหาไฟล์ .json ทั้งไฟล์ (ทั้งก้อน) ตอนที่มันถาม
//
// 4) แก้ ROOT_FOLDER_ID ด้านล่างให้เป็น Folder ID ของโฟลเดอร์ปลายทาง
//    (ต้องเป็นโฟลเดอร์ที่ IMPERSONATE_EMAIL เป็นเจ้าของ หรือมีสิทธิ์แก้ไขอยู่แล้ว)
//
// 5) ติดตั้ง dependency แล้ว deploy:
//      cd functions && npm install googleapis
//      firebase deploy --only functions:uploadRepairPhoto
//
// 6) จะได้ URL หน้าตาแบบ:
//      https://REGION-PROJECT_ID.cloudfunctions.net/uploadRepairPhoto
//    เอา URL นี้ไปใส่แทน DRIVE_UPLOAD_URL ใน repair-user.html
//
// ===========================================

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { google } = require("googleapis");
const { Readable } = require("stream");

const DRIVE_SA_KEY = defineSecret("DRIVE_SA_KEY");

/* ✏️ แก้เป็น Folder ID ของโฟลเดอร์ปลายทางใน Google Drive */
const ROOT_FOLDER_ID = "1SPhonqNzoYj9I0xzy7VI6rs_fCmoaNe9";

/* ✏️ อีเมลจริงในโดเมนโรงเรียนที่ service account จะสวมสิทธิ์ (ต้องตั้ง
   Domain-Wide Delegation ไว้แล้วตามขั้นตอนข้อ 2 ด้านบน) — ต้องเป็นเจ้าของ
   หรือมีสิทธิ์แก้ไขโฟลเดอร์ ROOT_FOLDER_ID อยู่แล้ว */
const IMPERSONATE_EMAIL = "nattapol@nongki.ac.th";

function cleanName(s) {
  return (s || "").toString().replace(/[\\/:*?"<>|]/g, "").trim();
}

/* วันที่แบบ Asia/Bangkok โดยไม่ต้องพึ่งไลบรารีเสริม */
function formatBangkok(date, opts) {
  return new Intl.DateTimeFormat("sv-SE", Object.assign({ timeZone: "Asia/Bangkok" }, opts)).format(date);
}

exports.uploadRepairPhoto = onRequest(
  { secrets: [DRIVE_SA_KEY], cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const data = req.body || {};
      if (!data.data || !data.filename) {
        res.status(400).json({ error: "ข้อมูลรูปไม่ครบ (ต้องมี filename และ data)" });
        return;
      }

      const credentials = JSON.parse(DRIVE_SA_KEY.value());
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive"],
        clientOptions: { subject: IMPERSONATE_EMAIL }, // สวมสิทธิ์เป็นบัญชีจริงในโดเมน
      });
      const drive = google.drive({ version: "v3", auth });

      const d = data.reportDate ? new Date(data.reportDate) : new Date();

      /* หา/สร้างโฟลเดอร์รายเดือน เช่น "2569-07" ปีพ.ศ. เหมือนโค้ด Apps Script เดิม
         (ใช้ ค.ศ. ก็ได้ถ้าต้องการ เปลี่ยน monthKey ด้านล่างได้ตามสะดวก) */
      const monthKey = formatBangkok(d, { year: "numeric", month: "2-digit" }); // yyyy-MM (ค.ศ.)

      const listRes = await drive.files.list({
        q: `'${ROOT_FOLDER_ID}' in parents and name='${monthKey}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
      });

      let monthFolderId;
      if (listRes.data.files && listRes.data.files.length > 0) {
        monthFolderId = listRes.data.files[0].id;
      } else {
        const folder = await drive.files.create({
          requestBody: {
            name: monthKey,
            mimeType: "application/vnd.google-apps.folder",
            parents: [ROOT_FOLDER_ID],
          },
          fields: "id",
        });
        monthFolderId = folder.data.id;
      }

      const dateStr = formatBangkok(d, { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/-/g, "");
      const ext = (data.filename.match(/\.[a-zA-Z0-9]+$/) || [""])[0];
      const baseName = dateStr + "-" + cleanName(data.location) + "-" + cleanName(data.title) + ext;

      const buffer = Buffer.from(data.data, "base64");
      const stream = Readable.from(buffer);

      const file = await drive.files.create({
        requestBody: { name: baseName, parents: [monthFolderId] },
        media: { mimeType: data.mimeType || "application/octet-stream", body: stream },
        fields: "id, name",
      });

      // เปิดสิทธิ์ให้ดูได้ผ่านลิงก์ (เหมือน setSharing ANYONE_WITH_LINK / VIEW ในโค้ด Apps Script เดิม)
      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: { role: "reader", type: "anyone" },
      });

      res.json({
        url: "https://drive.google.com/uc?id=" + file.data.id,
        name: file.data.name,
      });
    } catch (err) {
      console.error("uploadRepairPhoto error:", err);
      res.status(500).json({ error: (err && err.message) || "อัปโหลดไม่สำเร็จ" });
    }
  }
);
