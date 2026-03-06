/**
 * Firebase Cloud Functions — LINE Notification System
 * โรงเรียนหนองกี่พิทยาคม
 *
 * Functions:
 *  1. lineProxy/exchangeCode  — รับ LINE code แลกเป็น lineUserId แล้วบันทึก Firestore
 *  2. onBookingCreated        — trigger เมื่อมี booking ใหม่ → แจ้ง admin ทุกคน
 *  3. onBookingStatusChanged  — trigger เมื่อ status เปลี่ยน → แจ้งเจ้าของคำขอ
 *  4. reminderJob             — cron ทุก 5 นาที → แจ้งก่อนถึงเวลาจอง 15 นาที
 */

const functions  = require('firebase-functions');
const admin      = require('firebase-admin');
const axios      = require('axios');
const cors       = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

/* ─── CONFIG ──────────────────────────────────────────── */
const LINE_CHANNEL_ID     = '2009342919';
const LINE_CHANNEL_SECRET = '823b953e742a40c6ea254e5c2da4a146'; // จาก LINE Login channel basic settings
const LINE_ACCESS_TOKEN   = 'XnxyH72xr8fYmg8VFgdcZhijYUfZxW0dqxZ6Qz/2oMeK66xaPcdCjbju10drLGMfs5wh0uCjHV69fLnT5gthk69eg2M6F07/vZC/sYVax1j+mPjAHX0nxya/GFNgn0Hj5Xahq8RJKGcHGpogGXy1cgdB04t89/1O/w1cDnyilFU=';
const LINE_API             = 'https://api.line.me/v2/bot/message/push';

/* ─── HELPER: ส่งข้อความ LINE ───────────────────────── */
async function sendLine(lineUserId, messages) {
  if (!lineUserId) return;
  try {
    await axios.post(LINE_API, {
      to       : lineUserId,
      messages : Array.isArray(messages) ? messages : [messages],
    }, {
      headers: {
        'Content-Type'  : 'application/json',
        'Authorization' : `Bearer ${LINE_ACCESS_TOKEN}`,
      },
    });
  } catch (err) {
    console.error('sendLine error:', lineUserId, err?.response?.data || err.message);
  }
}

/* ─── HELPER: ดึง lineUserId จาก firebaseUid ────────── */
async function getLineUid(firebaseUid) {
  if (!firebaseUid) return null;
  const doc = await db.collection('users').doc(firebaseUid).get();
  return doc.exists ? (doc.data().lineUserId || null) : null;
}

/* ─── HELPER: ดึง lineUserId ของ admin ทุกคน ────────── */
async function getAllAdminLineUids() {
  const snap = await db.collection('admins').get();
  const uids = [];
  for (const doc of snap.docs) {
    const email = doc.id;
    // หา firebase uid จาก email
    const userSnap = await db.collection('users')
      .where('email', '==', email).limit(1).get();
    if (!userSnap.empty) {
      const lineUid = userSnap.docs[0].data().lineUserId;
      if (lineUid) uids.push(lineUid);
    }
  }
  return uids;
}

/* ─── HELPER: สร้างข้อความ bubble สวยงาม ─────────────── */
function bookingFlexMsg(title, body, color, footer) {
  return {
    type    : 'flex',
    altText : title,
    contents: {
      type  : 'bubble',
      size  : 'kilo',
      header: {
        type    : 'box',
        layout  : 'vertical',
        contents: [{ type:'text', text: title, color:'#ffffff', weight:'bold', size:'md' }],
        backgroundColor: color,
        paddingAll: '14px',
      },
      body: {
        type    : 'box',
        layout  : 'vertical',
        spacing : 'sm',
        contents: body,
        paddingAll: '14px',
      },
      footer: footer ? {
        type    : 'box',
        layout  : 'vertical',
        contents: [{ type:'text', text: footer, size:'xs', color:'#aaaaaa', wrap:true }],
        paddingAll: '10px',
      } : undefined,
    },
  };
}

function textLine(label, value) {
  return {
    type    : 'box',
    layout  : 'horizontal',
    contents: [
      { type:'text', text: label, size:'xs', color:'#888888', flex:2 },
      { type:'text', text: value || '-', size:'xs', color:'#333333', flex:4, wrap:true },
    ],
  };
}

/* ══════════════════════════════════════════════════════
   1. lineProxy — HTTP endpoint (เรียกจากหน้าเว็บ)
   POST /exchangeCode
   body: { code, redirectUri, firebaseUid, userEmail, userName }
   ══════════════════════════════════════════════════════ */
exports.lineProxy = functions
  .region('us-central1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      const { code, redirectUri, firebaseUid, userEmail, userName } = req.body;
      if (!code || !redirectUri || !firebaseUid) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      try {
        /* แลก code → access_token */
        const tokenRes = await axios.post(
          'https://api.line.me/oauth2/v2.1/token',
          new URLSearchParams({
            grant_type   : 'authorization_code',
            code,
            redirect_uri : redirectUri,
            client_id    : LINE_CHANNEL_ID,
            client_secret: LINE_CHANNEL_SECRET,
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenRes.data.access_token;

        /* ดึงข้อมูล profile */
        const profileRes = await axios.get('https://api.line.me/v2/profile', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const lineUserId = profileRes.data.userId;
        const lineName   = profileRes.data.displayName;
        const linePic    = profileRes.data.pictureUrl;

        /* บันทึก Firestore users/{firebaseUid} */
        await db.collection('users').doc(firebaseUid).set({
          lineUserId,
          lineName,
          linePic,
          email    : userEmail,
          name     : userName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        /* ส่งข้อความต้อนรับ */
        await sendLine(lineUserId, {
          type: 'text',
          text: `✅ เชื่อมต่อระบบสำเร็จ!\n\nสวัสดีคุณ ${lineName} 👋\nตอนนี้คุณจะได้รับแจ้งเตือนผ่าน LINE เมื่อ:\n• ผลอนุมัติ/ไม่อนุมัติคำขอ\n• ใกล้ถึงเวลาใช้ห้อง (ก่อน 15 นาที)\n\nโรงเรียนหนองกี่พิทยาคม 🏫`,
        });

        return res.json({ lineUserId, lineName });

      } catch (err) {
        console.error('exchangeCode error:', err?.response?.data || err.message);
        return res.status(500).json({ error: err?.response?.data?.error_description || err.message });
      }
    });
  });

/* ══════════════════════════════════════════════════════
   2. onBookingCreated — แจ้ง admin เมื่อมีคำขอใหม่
   ══════════════════════════════════════════════════════ */
exports.onBookingCreated = functions
  .region('us-central1')
  .firestore.document('bookings/{bookingId}')
  .onCreate(async (snap) => {
    const b = snap.data();
    const adminLineUids = await getAllAdminLineUids();
    if (!adminLineUids.length) return;

    const msg = bookingFlexMsg(
      '📋 มีคำขอจองใหม่!',
      [
        textLine('ห้อง',       b.room),
        textLine('วันที่',      b.date),
        textLine('เวลา',       `${b.startTime} – ${b.endTime}`),
        textLine('ผู้จอง',    b.fullName || b.userName),
        textLine('วัตถุประสงค์', b.purpose),
        textLine('ผู้เข้าร่วม', `${b.attendees || '-'} คน`),
      ],
      '#1d4ed8',
      'กรุณาเข้าระบบ Admin เพื่อพิจารณาคำขอ'
    );

    await Promise.all(adminLineUids.map(uid => sendLine(uid, msg)));
  });

/* ══════════════════════════════════════════════════════
   3. onBookingStatusChanged — แจ้งผู้จองเมื่อสถานะเปลี่ยน
   ══════════════════════════════════════════════════════ */
exports.onBookingStatusChanged = functions
  .region('us-central1')
  .firestore.document('bookings/{bookingId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after  = change.after.data();

    // ส่งแจ้งเตือนเฉพาะเมื่อ status เปลี่ยนจริงๆ
    if (before.status === after.status) return;

    const lineUserId = await getLineUid(after.userId);
    if (!lineUserId) return;

    const isApproved = after.status === 'approved';
    const isRejected = after.status === 'rejected';
    if (!isApproved && !isRejected) return;

    const color     = isApproved ? '#16a34a' : '#dc2626';
    const titleIcon = isApproved ? '✅' : '❌';
    const titleTxt  = isApproved ? 'อนุมัติคำขอแล้ว!' : 'ไม่อนุมัติคำขอ';

    const bodyItems = [
      textLine('ห้อง',  after.room),
      textLine('วันที่', after.date),
      textLine('เวลา',  `${after.startTime} – ${after.endTime}`),
    ];

    if (isApproved && after.approveNote) {
      bodyItems.push(textLine('หมายเหตุ', after.approveNote));
    }
    if (isRejected && after.rejectReason) {
      bodyItems.push(textLine('เหตุผล', after.rejectReason));
    }

    const footer = isApproved
      ? 'กรุณานำเอกสารไปติดต่อที่ห้องธุรการก่อนใช้งาน'
      : 'หากมีข้อสงสัยกรุณาติดต่อเจ้าหน้าที่';

    const msg = bookingFlexMsg(`${titleIcon} ${titleTxt}`, bodyItems, color, footer);
    await sendLine(lineUserId, msg);

    // แจ้ง admin ด้วย (เฉพาะกรณี user แก้ไขคำขอ → status กลับเป็น pending)
    if (after.status === 'pending' && before.status !== 'pending') {
      const adminLineUids = await getAllAdminLineUids();
      const adminMsg = bookingFlexMsg(
        '🔄 คำขอถูกแก้ไขใหม่',
        [
          textLine('ห้อง',    after.room),
          textLine('วันที่',  after.date),
          textLine('เวลา',   `${after.startTime} – ${after.endTime}`),
          textLine('ผู้จอง', after.fullName || after.userName),
        ],
        '#7c3aed',
        'คำขอถูก reset เป็นรอพิจารณา กรุณาตรวจสอบในระบบ'
      );
      await Promise.all(adminLineUids.map(uid => sendLine(uid, adminMsg)));
    }
  });

/* ══════════════════════════════════════════════════════
   4. reminderJob — cron ทุก 5 นาที
   แจ้งเตือนก่อนถึงเวลาจอง 15 นาที (เฉพาะที่ approved)
   ══════════════════════════════════════════════════════ */
exports.reminderJob = functions
  .region('us-central1')
  .pubsub.schedule('every 5 minutes')
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    const now   = new Date();
    const tz    = 7 * 60; // UTC+7
    const local = new Date(now.getTime() + tz * 60000);

    const todayStr = local.toISOString().split('T')[0]; // YYYY-MM-DD
    const hh = local.getUTCHours();
    const mm = local.getUTCMinutes();

    // หาเวลา target = ตอนนี้ + 15 นาที
    const targetMins = hh * 60 + mm + 15;
    const targetHH   = Math.floor(targetMins / 60) % 24;
    const targetMM   = targetMins % 60;
    const targetTime = `${String(targetHH).padStart(2,'0')}:${String(targetMM).padStart(2,'0')}`;

    // ดึง booking ที่ approved วันนี้
    const snap = await db.collection('bookings')
      .where('status', '==', 'approved')
      .where('date', '==', todayStr)
      .get();

    for (const doc of snap.docs) {
      const b = doc.data();
      if (!b.startTime) continue;

      // เช็คว่า startTime ตรงกับ targetTime (ให้ tolerance ±1 นาที)
      const [bHH, bMM] = b.startTime.split(':').map(Number);
      const bMins   = bHH * 60 + bMM;
      const diff    = Math.abs(bMins - targetMins);
      if (diff > 1) continue; // ไม่ใช่ช่วงเวลาที่ต้องแจ้ง

      // ตรวจว่าแจ้งไปแล้วหรือยัง (ป้องกันส่งซ้ำ)
      const sentKey = `reminded_${todayStr}_${b.startTime}`;
      if (b[sentKey]) continue;

      const lineUserId = await getLineUid(b.userId);
      if (lineUserId) {
        const msg = bookingFlexMsg(
          '⏰ แจ้งเตือน: ใกล้ถึงเวลาจองแล้ว!',
          [
            textLine('ห้อง',   b.room),
            textLine('วันที่', b.date),
            textLine('เวลา',  `${b.startTime} – ${b.endTime}`),
            textLine('เริ่ม', `อีก ~15 นาที`),
          ],
          '#d97706',
          'กรุณาเตรียมตัวให้พร้อม'
        );
        await sendLine(lineUserId, msg);
      }

      // Mark ว่าแจ้งไปแล้ว
      await doc.ref.update({ [sentKey]: true });
    }

    return null;
  });
