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

// ถ้ามี Cloud Function อื่นอยู่แล้ว (เช่น lineProxy) ให้ require/export เพิ่มที่นี่
// ตัวอย่าง: exports.lineProxy = require("./line-proxy").lineProxy;
