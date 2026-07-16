// ===========================================
// functions/portfolio-notifications.js
// Push Notification triggers สำหรับระบบส่งงานประจำภาคเรียน (Portfolio / Self-Assessment)
// ===========================================
//
// อ้างอิงโครงสร้าง Firestore จริงจากระบบ (ดู portfolio-teacher.js / portfolio-admin.js ฝั่ง frontend):
//
//   portfolio_submissions/{id}
//     - uid, email, displayName, staffName, staffPosition, staffGroup (ชื่อกลุ่มสาระ)
//     - yearSem, year, semester, docTypeId, courseCode, courseName, subjectGroup
//     - status: 'submitted' | 'head_reviewed' | 'reviewed' | 'assistant_reviewed'
//               | 'deputy_reviewed' | 'final_approved' | 'revision'
//     - adminNote / headNote / assistantNote / deputyNote / directorNote  (บันทึกความเห็นแยกตามขั้น)
//     - reviewedBy / headReviewedBy / assistantReviewedBy / deputyReviewedBy /
//       directorReviewedBy / lastRevisedBy  (= email ของผู้ตรวจที่ทำรายการล่าสุดของขั้นนั้น)
//     - submittedAt, resubmittedAt, updatedAt
//     (ดู saveCourseSubmission() ใน portfolio-teacher.js และ setReviewStatus()
//      ใน portfolio-admin.js สำหรับ field ทั้งหมด)
//
//   portfolio_doc_types/{id}
//     - label, order
//
//   admins/{email}              (email เป็น lowercase, ใช้เป็น doc id — เหมือนระบบอื่น)
//     - permissions: { headOfGroup, assistantDirectorAcademic, deputyDirectorAcademic,
//                       director, portfolio, bookings, repair, ... }
//     - headOfGroupSubject / staffGroup   (ชื่อกลุ่มสาระที่หัวหน้าคนนี้ดูแล — ต้องตรงกับ
//                                           staffGroup ของครูที่ส่งงาน หลัง normaliseGroup())
//     - name
//
// ใช้ sendToUser / sendToEmail จาก notifications.js (helper เดียวกับระบบจองห้อง/แจ้งซ่อม)
// เพื่อให้พฤติกรรมการส่ง + cleanup token ที่ใช้ไม่ได้แล้ว เหมือนกันทุกระบบ

const { getFirestore } = require("firebase-admin/firestore");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { sendToUser, sendToEmail } = require("./notifications");

const db = getFirestore();

/* normalise ชื่อกลุ่มสาระ ให้เทียบกันได้ (ตัดช่องว่างซ้ำ/หน้า-หลัง)
   ต้องเหมือนฟังก์ชัน normaliseGroup() ฝั่ง client ใน portfolio-admin.js เป๊ะ
   ไม่งั้นจะหาเจ้าของกลุ่มสาระไม่เจอเพราะช่องว่างไม่ตรงกัน */
function normaliseGroup(g) {
  return (g || "").replace(/\s+/g, " ").trim();
}

/**
 * โหลดรายชื่อผู้ตรวจแต่ละขั้นจาก collection "admins"
 * คืนค่าโครงสร้างเดียวกับตัวแปร adminRoles ฝั่ง client (bootApp() ใน portfolio-admin.js):
 *   { headOfGroups: { [กลุ่มสาระที่ normalise แล้ว]: {email,name} },
 *     assistantAcademic: {email,name}, deputyAcademic: {email,name}, director: {email,name} }
 */
async function getPortfolioAdminRoles() {
  const snap = await db.collection("admins").get();
  const roles = { headOfGroups: {} };
  snap.forEach((doc) => {
    const data = doc.data();
    const p = data.permissions || {};
    const email = doc.id;
    const name = data.name || data.headOfGroupName || email;
    if (p.headOfGroup) {
      const grp = normaliseGroup(data.headOfGroupSubject || data.staffGroup || "");
      roles.headOfGroups[grp] = { email, name };
    }
    if (p.assistantDirectorAcademic) roles.assistantAcademic = { email, name };
    if (p.deputyDirectorAcademic)    roles.deputyAcademic    = { email, name };
    if (p.director)                  roles.director          = { email, name };
  });
  return roles;
}

/* ดึงชื่อประเภทเอกสาร (label) จาก docTypeId เพื่อใช้ประกอบข้อความแจ้งเตือน */
async function getDocTypeLabel(docTypeId) {
  if (!docTypeId) return "";
  try {
    const doc = await db.collection("portfolio_doc_types").doc(docTypeId).get();
    return doc.exists ? doc.data().label || "" : "";
  } catch (e) {
    return "";
  }
}

/* สร้างข้อความอ้างอิงรายวิชา/เอกสารให้อ่านง่าย เช่น "ว21101 คณิตศาสตร์พื้นฐาน" */
function describeSubmission(data, docLabel) {
  const course = [data.courseCode, data.courseName].filter(Boolean).join(" ");
  return course || docLabel || "เอกสารส่งงาน";
}

// ===========================================
// 1) ครูส่งงานใหม่/ส่งเอกสารรายวิชาใหม่ (สร้าง doc ใหม่ status: 'submitted')
//    -> แจ้งหัวหน้ากลุ่มสาระที่ตรงกับ staffGroup ของครูคนนั้น
// ===========================================
exports.onNewPortfolioSubmission = onDocumentCreated(
  "portfolio_submissions/{subId}",
  async (event) => {
    const data = event.data.data();
    if (data.status !== "submitted") return;

    const roles = await getPortfolioAdminRoles();
    const grp = normaliseGroup(data.staffGroup);
    const head = roles.headOfGroups[grp];
    if (!head) {
      console.warn(
        `[portfolio] ไม่พบหัวหน้ากลุ่มสาระ "${grp}" ใน admins — ข้ามการแจ้งเตือน ` +
        `(ตรวจ field headOfGroupSubject ใน admins ให้ตรงกับ staffGroup "${data.staffGroup}" ของครู)`
      );
      return;
    }

    const docLabel = await getDocTypeLabel(data.docTypeId);
    await sendToEmail(
      head.email,
      "มีงานส่งใหม่รอตรวจ 📤",
      `${data.staffName || data.displayName || "ครู"} ส่ง "${describeSubmission(data, docLabel)}" (${docLabel || "เอกสาร"})`,
      { url: "/webapp/portfolio-admin.html" }
    );
  }
);

// ===========================================
// 2) ครูส่งไฟล์แก้ไขซ้ำหลังถูกขอแก้ไข (resubmittedAt เปลี่ยน)
//    -> แจ้งผู้ตรวจที่ขอแก้ไขล่าสุด (lastRevisedBy)
//    หมายเหตุ: การส่งไฟล์แก้ไขไม่ได้เปลี่ยนค่า status (ยังเป็น 'revision' ค้างอยู่จนกว่า
//    ผู้ตรวจจะเข้ามาตรวจอีกครั้ง) จึงต้องเช็คจาก resubmittedAt แทน ไม่ใช่จาก status
// ===========================================
exports.onPortfolioResubmitted = onDocumentUpdated(
  "portfolio_submissions/{subId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    const beforeTs = before.resubmittedAt ? before.resubmittedAt.toMillis() : 0;
    const afterTs = after.resubmittedAt ? after.resubmittedAt.toMillis() : 0;
    if (afterTs === 0 || afterTs === beforeTs) return;
    /* ถ้า status เปลี่ยนไปพร้อมกันในการเขียนครั้งเดียวกันด้วย ให้ onPortfolioStatusChanged
       จัดการแจ้งเตือนแทน กันแจ้งซ้ำ 2 ครั้งสำหรับการเขียนครั้งเดียว */
    if (before.status !== after.status) return;

    const reviewerEmail = after.lastRevisedBy;
    if (!reviewerEmail) return;

    const docLabel = await getDocTypeLabel(after.docTypeId);
    await sendToEmail(
      reviewerEmail,
      "ครูส่งไฟล์แก้ไขแล้ว 🔄",
      `${after.staffName || after.displayName || "ครู"} ส่งไฟล์แก้ไข "${describeSubmission(after, docLabel)}" กลับมาแล้ว`,
      { url: "/webapp/portfolio-admin.html" }
    );
  }
);

// ===========================================
// 3) ผู้ตรวจเปลี่ยนสถานะ (ตรวจผ่าน/อนุมัติ/ขอแก้ไข)
//    -> แจ้งครูผู้ส่งเสมอ + แจ้งผู้ตรวจขั้นถัดไปด้วย (ถ้ายังไม่ใช่ขั้นสุดท้าย)
// ===========================================
const PORTFOLIO_STATUS_TEXT = {
  head_reviewed: "หัวหน้ากลุ่มสาระตรวจผ่านแล้ว ✓",
  reviewed: "หัวหน้ากลุ่มสาระตรวจผ่านแล้ว ✓",
  assistant_reviewed: "ผู้ช่วย ผอ.วิชาการตรวจผ่านแล้ว ✓",
  deputy_reviewed: "รอง ผอ.วิชาการตรวจผ่านแล้ว ✓",
  final_approved: "ผู้อำนวยการอนุมัติแล้ว 🎉",
  revision: "ถูกส่งกลับให้แก้ไข ⚠️",
};

/* field เก็บบันทึกความเห็นของแต่ละขั้น (ตรงกับ noteFieldMap ใน portfolio-admin.js) */
const PORTFOLIO_NOTE_FIELD = {
  head_reviewed: "headNote",
  reviewed: "headNote",
  assistant_reviewed: "assistantNote",
  deputy_reviewed: "deputyNote",
  final_approved: "directorNote",
  revision: "adminNote",
};

/* ขั้นถัดไปที่ต้องแจ้งเตือนต่อ เมื่อขั้นปัจจุบันผ่านแล้ว (ไม่มี key = ไม่มีขั้นถัดไป/จบแล้ว) */
const NEXT_REVIEWER_ROLE = {
  head_reviewed: "assistantAcademic",
  reviewed: "assistantAcademic",
  assistant_reviewed: "deputyAcademic",
  deputy_reviewed: "director",
};

exports.onPortfolioStatusChanged = onDocumentUpdated(
  "portfolio_submissions/{subId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status === after.status) return;
    if (!after.uid) return;

    const docLabel = await getDocTypeLabel(after.docTypeId);
    const subjectLabel = describeSubmission(after, docLabel);
    const statusText = PORTFOLIO_STATUS_TEXT[after.status] || after.status;
    const note = after[PORTFOLIO_NOTE_FIELD[after.status]] || "";

    /* 1) แจ้งครูผู้ส่งเสมอ ไม่ว่าจะผ่าน/ถูกขอแก้ไข */
    await sendToUser(
      after.uid,
      "สถานะงานส่งอัปเดต",
      `"${subjectLabel}" ${statusText}` + (note ? ` — "${note}"` : ""),
      { url: "/webapp/portfolio-teacher.html" }
    );

    /* 2) แจ้งผู้ตรวจขั้นถัดไป (ถ้ายังไม่ใช่ขั้นสุดท้าย และไม่ใช่การขอแก้ไข) */
    const nextRole = NEXT_REVIEWER_ROLE[after.status];
    if (!nextRole) return;

    const roles = await getPortfolioAdminRoles();
    const nextReviewer = roles[nextRole];
    if (!nextReviewer) return;

    await sendToEmail(
      nextReviewer.email,
      "มีงานรอตรวจขั้นถัดไป 📋",
      `"${subjectLabel}" ของ ${after.staffName || after.displayName || "ครู"} ผ่านขั้นก่อนหน้าแล้ว รอการตรวจจากท่าน`,
      { url: "/webapp/portfolio-admin.html" }
    );
  }
);
