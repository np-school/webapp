// ===========================================
// functions/finance-notifications.js
// Push Notification triggers สำหรับระบบเอกสารการเงินและพัสดุ (NP Origins)
// ===========================================
//
// อ้างอิงโครงสร้าง Firestore จริงจากระบบ (ดู finance-common.js / finance-admin.js):
//
//   financeDocs/{docId}
//     - uid, name (ชื่อผู้ส่ง), type (ประเภทเอกสาร), title, amount
//     - fundType, fiscalYear, contractNo, refContractNo
//     - s1: 'processing' | 'approved' | 'revision'
//     - s2: 'waiting'    | 'approved' | 'revision'
//     - s3: 'waiting'    | 'approved' | 'revision'
//     - s4: 'unpaid'     | 'paid'     | 'revision'    (เฉพาะเอกสารยืมเงิน)
//     - history: [{ step, text, note, by, email, at }]
//     - createdAt, updatedAt
//
//   admins/{email}
//     - permissions: { financeCheck (s1), financeCheque (s2), financeLoan (s3+s4), ... }
//
//   fcmTokens/{token}
//     - userId, email, updatedAt
//
// สิทธิ์เจ้าหน้าที่ที่เกี่ยวข้อง:
//   financeCheck   → ขั้น 1 ตรวจเอกสาร
//   financeCheque  → ขั้น 2 ทำใบปะหน้า/เสนอผู้บริหาร
//   financeLoan    → ขั้น 3 อนุมัติขอเบิกเงิน + ขั้น 4 ติดตามสัญญายืมเงิน
//
// ใช้ sendToUser / sendToEmail / sendToPermission จาก notifications.js
// (helper เดียวกับระบบจองห้อง/แจ้งซ่อม/portfolio)

const { getFirestore } = require("firebase-admin/firestore");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { sendToUser, sendToEmail, sendToPermission } = require("./notifications");

const db = getFirestore();

/* ชื่อประเภทเอกสาร (ตรงกับ DOC_TYPES ใน finance-common.js) */
const DOC_TYPE_LABELS = {
  loan_trip:      "ขอยืมเงินไปราชการ",
  loan_project:   "ขอยืมเงินจัดทำโครงการ",
  claim_trip:     "เบิกเงินไปราชการ",
  claim_project:  "เบิกเงินจัดทำโครงการ",
  clear_trip:     "ล้างหนี้สัญญายืมเงินไปราชการ",
  clear_project:  "ล้างหนี้สัญญายืมเงินจัดทำโครงการ",
  purchase:       "ชุดเบิกจัดซื้อ/จัดจ้าง",
  payroll:        "ชุดเบิกเงินเดือนลูกจ้าง",
};
/* ประเภทที่เป็นเอกสารยืมเงิน (มีขั้น s4) */
const LOAN_TYPES = new Set(["loan_trip", "loan_project"]);
/* ประเภทที่มีขั้นเดียว (s1 อย่างเดียว) */
const CLEAR_TYPES = new Set(["clear_trip", "clear_project"]);

function docTypeLabel(type) {
  return DOC_TYPE_LABELS[type] || type || "เอกสาร";
}

/** ชื่อย่อของประเภทเอกสาร (ใช้ในข้อความแจ้งเตือน) เช่น "ยืมเงินไปราชการ" → "ขอยืมเงินไปราชการ" */
function describeDoc(d) {
  const typeLabel = docTypeLabel(d.type);
  const ref = d.contractNo ? ` (สัญญา ${d.contractNo})` : "";
  return `${typeLabel}${ref} — ${d.title || ""}`.trim().replace(/—\s*$/, "").trim();
}

// ===========================================
// 1) ผู้ส่งสร้างเอกสารใหม่ → แจ้งเจ้าหน้าที่ financeCheck (ขั้น 1)
// ===========================================
exports.onNewFinanceDoc = onDocumentCreated(
  "financeDocs/{docId}",
  async (event) => {
    const data = event.data.data();
    // ต้องเป็นเอกสารใหม่ที่ s1 = 'processing' เท่านั้น
    if (data.s1 !== "processing") return;

    const desc = describeDoc(data);
    const name = data.name || "ผู้ส่ง";

    await sendToPermission(
      "financeCheck",
      "📄 เอกสารการเงินใหม่",
      `${name} ส่ง ${desc}`,
      {
        type:   "finance_new",
        docId:  event.params.docId,
        screen: "finance-admin",
      }
    );
  }
);

// ===========================================
// 2) สถานะเปลี่ยน → แจ้งคนที่เกี่ยวข้อง
//    - ผู้ส่ง: ทุกกรณี (อนุมัติ / ส่งกลับแก้ไข / เสร็จสิ้น)
//    - เจ้าหน้าที่ขั้นถัดไป: เมื่อขั้นก่อนหน้าอนุมัติแล้ว
// ===========================================
exports.onFinanceDocStatusChanged = onDocumentUpdated(
  "financeDocs/{docId}",
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();
    const docId  = event.params.docId;
    const desc   = describeDoc(after);
    const name   = after.name || "ผู้ส่ง";
    const uid    = after.uid;

    // ── ขั้น 1 (financeCheck) ──────────────────────────────────

    // s1: processing → approved  (ตรวจเอกสารแล้ว อนุมัติ)
    if (before.s1 !== "approved" && after.s1 === "approved") {
      // แจ้งผู้ส่ง
      if (uid) {
        await sendToUser(
          uid,
          "✅ ผ่านการตรวจเอกสารแล้ว",
          `เอกสาร "${desc}" ผ่านการตรวจเอกสาร (ขั้น 1) แล้ว`,
          { type: "finance_s1_approved", docId, screen: "finance-user" }
        );
      }

      // เอกสารล้างหนี้มีแค่ขั้น 1 → ถ้า s1 approved = เสร็จสิ้นแล้ว ไม่ต้องแจ้งขั้นต่อ
      if (CLEAR_TYPES.has(after.type)) return;

      // แจ้งเจ้าหน้าที่ขั้น 2 (financeCheque)
      await sendToPermission(
        "financeCheque",
        "📋 มีเอกสารรอทำใบปะหน้า",
        `${name} — ${desc} ผ่านขั้น 1 แล้ว รอทำใบปะหน้า/เสนอผู้บริหาร`,
        { type: "finance_s2_pending", docId, screen: "finance-admin" }
      );
      return;
    }

    // s1: → revision  (ส่งกลับแก้ไขขั้น 1)
    if (before.s1 !== "revision" && after.s1 === "revision") {
      const note = _lastNote(after.history, "s1");
      if (uid) {
        await sendToUser(
          uid,
          "🔄 เอกสารถูกส่งกลับแก้ไข",
          `เอกสาร "${desc}" ถูกส่งกลับให้แก้ไข (ขั้นตรวจเอกสาร)` + (note ? ` — ${note}` : ""),
          { type: "finance_revision", step: "s1", docId, screen: "finance-user" }
        );
      }
      return;
    }

    // s1: revision → processing  (ผู้ส่งกด "ส่งใหม่อีกครั้ง" หลังแก้ไข)
    if (before.s1 === "revision" && after.s1 === "processing") {
      await sendToPermission(
        "financeCheck",
        "🔁 เอกสารส่งกลับมาใหม่",
        `${name} แก้ไขและส่ง ${desc} กลับมาแล้ว`,
        { type: "finance_resubmit", step: "s1", docId, screen: "finance-admin" }
      );
      return;
    }

    // ── ขั้น 2 (financeCheque) ─────────────────────────────────

    // s2: waiting → approved  (เสนอผู้บริหารแล้ว)
    if (before.s2 !== "approved" && after.s2 === "approved") {
      // แจ้งผู้ส่ง
      if (uid) {
        await sendToUser(
          uid,
          "✅ เสนอผู้บริหารแล้ว",
          `เอกสาร "${desc}" เสนอผู้บริหารแล้ว (ขั้น 2) รออนุมัติขอเบิกเงิน`,
          { type: "finance_s2_approved", docId, screen: "finance-user" }
        );
      }
      // แจ้งเจ้าหน้าที่ขั้น 3 (financeLoan)
      await sendToPermission(
        "financeLoan",
        "💰 มีเอกสารรออนุมัติขอเบิกเงิน",
        `${name} — ${desc} ผ่านขั้น 2 แล้ว รออนุมัติเอกสารขอเบิกเงิน`,
        { type: "finance_s3_pending", docId, screen: "finance-admin" }
      );
      return;
    }

    // s2: → revision
    if (before.s2 !== "revision" && after.s2 === "revision") {
      const note = _lastNote(after.history, "s2");
      if (uid) {
        await sendToUser(
          uid,
          "🔄 เอกสารถูกส่งกลับแก้ไข",
          `เอกสาร "${desc}" ถูกส่งกลับให้แก้ไข (ขั้นใบปะหน้า/เสนอผู้บริหาร)` + (note ? ` — ${note}` : ""),
          { type: "finance_revision", step: "s2", docId, screen: "finance-user" }
        );
      }
      return;
    }

    // s2: revision → waiting  (ส่งใหม่หลังแก้ไข)
    if (before.s2 === "revision" && after.s2 === "waiting") {
      await sendToPermission(
        "financeCheque",
        "🔁 เอกสารส่งกลับมาใหม่",
        `${name} แก้ไขและส่ง ${desc} กลับมาแล้ว (ขั้น 2)`,
        { type: "finance_resubmit", step: "s2", docId, screen: "finance-admin" }
      );
      return;
    }

    // ── ขั้น 3 (financeLoan) ───────────────────────────────────

    // s3: waiting → approved  (อนุมัติขอเบิกเงิน)
    if (before.s3 !== "approved" && after.s3 === "approved") {
      if (uid) {
        const isLoan = LOAN_TYPES.has(after.type);
        await sendToUser(
          uid,
          "✅ อนุมัติเอกสารขอเบิกเงินแล้ว",
          `เอกสาร "${desc}" อนุมัติขอเบิกเงินแล้ว` +
            (isLoan ? " กรุณาติดตามกำหนดส่งใช้เงินยืม" : ""),
          { type: "finance_s3_approved", docId, screen: "finance-user" }
        );
      }
      // เอกสารยืมเงิน → แจ้งเจ้าหน้าที่ให้ติดตามสัญญา (ขั้น 4)
      if (LOAN_TYPES.has(after.type)) {
        await sendToPermission(
          "financeLoan",
          "📑 สัญญายืมเงินรอติดตาม",
          `${name} — ${desc} อนุมัติแล้ว รอผู้ยืมส่งใช้เงิน`,
          { type: "finance_s4_pending", docId, screen: "finance-admin" }
        );
      }
      return;
    }

    // s3: → revision
    if (before.s3 !== "revision" && after.s3 === "revision") {
      const note = _lastNote(after.history, "s3");
      if (uid) {
        await sendToUser(
          uid,
          "🔄 เอกสารถูกส่งกลับแก้ไข",
          `เอกสาร "${desc}" ถูกส่งกลับให้แก้ไข (ขั้นอนุมัติขอเบิกเงิน)` + (note ? ` — ${note}` : ""),
          { type: "finance_revision", step: "s3", docId, screen: "finance-user" }
        );
      }
      return;
    }

    // s3: revision → waiting  (ส่งใหม่หลังแก้ไข)
    if (before.s3 === "revision" && after.s3 === "waiting") {
      await sendToPermission(
        "financeLoan",
        "🔁 เอกสารส่งกลับมาใหม่",
        `${name} แก้ไขและส่ง ${desc} กลับมาแล้ว (ขั้น 3)`,
        { type: "finance_resubmit", step: "s3", docId, screen: "finance-admin" }
      );
      return;
    }

    // ── ขั้น 4 (สัญญายืมเงิน — เฉพาะ loan_trip / loan_project) ──

    // s4: unpaid → paid  (ยืนยันชำระแล้ว / ปิดสัญญา)
    if (before.s4 !== "paid" && after.s4 === "paid") {
      if (uid) {
        await sendToUser(
          uid,
          "🎉 ปิดสัญญายืมเงินแล้ว",
          `เอกสาร "${desc}" ปิดสัญญายืมเงินเรียบร้อยแล้ว`,
          { type: "finance_s4_paid", docId, screen: "finance-user" }
        );
      }
      return;
    }

    // s4: → revision
    if (before.s4 !== "revision" && after.s4 === "revision") {
      const note = _lastNote(after.history, "s4");
      if (uid) {
        await sendToUser(
          uid,
          "🔄 สัญญายืมเงินถูกส่งกลับแก้ไข",
          `เอกสาร "${desc}" ถูกส่งกลับให้แก้ไข (ขั้นสัญญายืมเงิน)` + (note ? ` — ${note}` : ""),
          { type: "finance_revision", step: "s4", docId, screen: "finance-user" }
        );
      }
      return;
    }

    // s4: revision → unpaid  (ส่งใหม่หลังแก้ไข)
    if (before.s4 === "revision" && after.s4 === "unpaid") {
      await sendToPermission(
        "financeLoan",
        "🔁 เอกสารสัญญายืมส่งกลับมาใหม่",
        `${name} แก้ไขและส่ง ${desc} กลับมาแล้ว (ขั้น 4)`,
        { type: "finance_resubmit", step: "s4", docId, screen: "finance-admin" }
      );
      return;
    }
  }
);

// ===========================================
// Helper: ดึงหมายเหตุล่าสุดจาก history ของขั้นที่กำหนด
// ===========================================
function _lastNote(history, step) {
  if (!Array.isArray(history)) return "";
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].step === step && history[i].note) return history[i].note;
  }
  return "";
}
