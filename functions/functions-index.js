// ===========================================
// functions/index.js
// Entry point ของ Cloud Functions (NP Origins)
// ===========================================

const { initializeApp } = require("firebase-admin/app");
initializeApp();

// ── Push Notification triggers (ดู functions/notifications.js) ──
const notifications = require("./notifications");
exports.onBookingStatusChanged = notifications.onBookingStatusChanged;
exports.onNewBookingCreated = notifications.onNewBookingCreated;
exports.onNewRepairCreated = notifications.onNewRepairCreated;
exports.onRepairStatusChanged = notifications.onRepairStatusChanged;
exports.onRepairReopened = notifications.onRepairReopened;

// ── Push Notification triggers สำหรับระบบส่งงานประจำภาคเรียน (ดู functions/portfolio-notifications.js) ──
const portfolioNotifications = require("./portfolio-notifications");
exports.onNewPortfolioSubmission = portfolioNotifications.onNewPortfolioSubmission;
exports.onPortfolioResubmitted = portfolioNotifications.onPortfolioResubmitted;
exports.onPortfolioStatusChanged = portfolioNotifications.onPortfolioStatusChanged;

// ── อัปโหลดรูปแจ้งซ่อมไป Google Drive (ดู functions/drive-upload.js) ──
exports.uploadRepairPhoto = require("./drive-upload").uploadRepairPhoto;

// ถ้ามี Cloud Function อื่นอยู่แล้ว (เช่น lineProxy) ให้ require/export เพิ่มที่นี่
// ตัวอย่าง: exports.lineProxy = require("./line-proxy").lineProxy;
