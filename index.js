/**
 * Firebase Cloud Functions — LINE Notification System (ปรับปรุงแล้ว)
 * โรงเรียนหนองกี่พิทยาคม
 *
 * Functions:
 *  1. lineProxy/exchangeCode  — รับ LINE code แลกเป็น lineUserId แล้วบันทึก Firestore
 *  2. onBookingCreated        — trigger เมื่อมี booking ใหม่ → แจ้ง admin ที่เชื่อมต่อ LINE แล้วเท่านั้น
 *  3. onBookingStatusChanged  — trigger เมื่อ status เปลี่ยน → แจ้งเจ้าของคำขอที่เชื่อมต่อ LINE แล้ว
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
  if (!lineUserId) {
    console.log('ไม่มี LINE User ID - ข้าม');
    return;
  }
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
    console.log('✓ ส่ง LINE สำเร็จ:', lineUserId);
  } catch (err) {
    console.error('❌ sendLine error:', lineUserId, err?.response?.data || err.message);
  }
}

/* ─── HELPER: ดึง lineUserId จาก firebaseUid ────────── */
async function getLineUid(firebaseUid) {
  if (!firebaseUid) {
    console.log('ไม่มี Firebase UID');
    return null;
  }
  try {
    const doc = await db.collection('users').doc(firebaseUid).get();
    if (!doc.exists) {
      console.log('ไม่พบ user:', firebaseUid);
      return null;
    }
    const lineUserId = doc.data().lineUserId || null;
    if (!lineUserId) {
      console.log('User ยังไม่เชื่อมต่อ LINE:', firebaseUid);
    }
    return lineUserId;
  } catch (err) {
    console.error('Error getLineUid:', err);
    return null;
  }
}

/* ─── HELPER: ดึง lineUserId ของ admin ที่เชื่อมต่อ LINE แล้วเท่านั้น ────────── */
async function getAllAdminLineUids() {
  try {
    // ดึงรายชื่อ email ของ admin ทั้งหมด
    const adminSnap = await db.collection('admins').get();
    if (adminSnap.empty) {
      console.log('ไม่มี admin ในระบบ');
      return [];
    }
    
    const adminEmails = adminSnap.docs.map(doc => doc.id);
    console.log('พบ admin จำนวน:', adminEmails.length, '- emails:', adminEmails);
    
    // ดึง users ที่มี email ตรงกับ admin และเชื่อมต่อ LINE แล้ว
    const lineUids = [];
    
    for (const email of adminEmails) {
      const userSnap = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        const lineUserId = userData.lineUserId;
        
        if (lineUserId) {
          lineUids.push(lineUserId);
          console.log('✓ Admin เชื่อมต่อ LINE:', email, '→', lineUserId);
        } else {
          console.log('○ Admin ยังไม่เชื่อมต่อ LINE:', email);
        }
      } else {
        console.log('! ไม่พบ user สำหรับ admin email:', email);
      }
    }
    
    console.log('รวม admin ที่เชื่อมต่อ LINE:', lineUids.length, 'คน');
    return lineUids;
  } catch (err) {
    console.error('Error getAllAdminLineUids:', err);
    return [];
  }
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
        console.log('=== LINE Login Exchange Code ===');
        console.log('User:', userEmail, '(', userName, ')');
        
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

        console.log('✓ LINE Profile:', lineName, '→', lineUserId);

        /* บันทึก Firestore users/{firebaseUid} */
        await db.collection('users').doc(firebaseUid).set({
          lineUserId,
          lineName,
          linePic,
          email    : userEmail,
          name     : userName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log('✓ บันทึก Firestore สำเร็จ');

        /* ส่งข้อความต้อนรับ */
        await sendLine(lineUserId, {
          type: 'text',
          text: `✅ เชื่อมต่อระบบสำเร็จ!\n\nสวัสดีคุณ ${lineName} 👋\nตอนนี้คุณจะได้รับแจ้งเตือนผ่าน LINE เมื่อ:\n• ผลอนุมัติ/ไม่อนุมัติคำขอ\n• ใกล้ถึงเวลาใช้ห้อง (ก่อน 15 นาที)\n\nโรงเรียนหนองกี่พิทยาคม 🏫`,
        });

        return res.json({ lineUserId, lineName });

      } catch (err) {
        console.error('❌ exchangeCode error:', err?.response?.data || err.message);
        return res.status(500).json({ error: err?.response?.data?.error_description || err.message });
      }
    });
  });

/* ══════════════════════════════════════════════════════
   2. onBookingCreated — แจ้ง admin ที่เชื่อมต่อ LINE แล้วเท่านั้น เมื่อมีคำขอใหม่
   ══════════════════════════════════════════════════════ */
exports.onBookingCreated = functions
  .region('us-central1')
  .firestore.document('bookings/{bookingId}')
  .onCreate(async (snap) => {
    console.log('=== Booking Created ===');
    const b = snap.data();
    console.log('ห้อง:', b.room, '| ผู้จอง:', b.fullName || b.userName, '| วันที่:', b.date);
    
    // ดึง LINE UID ของ admin ที่เชื่อมต่อ LINE แล้วเท่านั้น
    const adminLineUids = await getAllAdminLineUids();
    
    if (!adminLineUids.length) {
      console.log('⚠️ ไม่มี admin ที่เชื่อมต่อ LINE - ไม่ส่งแจ้งเตือน');
      return;
    }

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

    console.log(`→ ส่งแจ้งเตือนไปยัง admin ${adminLineUids.length} คน`);
    await Promise.all(adminLineUids.map(uid => sendLine(uid, msg)));
  });

/* ══════════════════════════════════════════════════════
   3. onBookingStatusChanged — แจ้งผู้จองที่เชื่อมต่อ LINE แล้วเมื่อสถานะเปลี่ยน
   ══════════════════════════════════════════════════════ */
exports.onBookingStatusChanged = functions
  .region('us-central1')
  .firestore.document('bookings/{bookingId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after  = change.after.data();

    console.log('=== Booking Updated ===');
    console.log('ห้อง:', after.room, '| สถานะ:', before.status, '→', after.status);

    // ส่งแจ้งเตือนเฉพาะเมื่อ status เปลี่ยนจริงๆ
    if (before.status === after.status) {
      console.log('สถานะไม่เปลี่ยน - ข้าม');
      return;
    }

    const lineUserId = await getLineUid(after.userId);
    if (!lineUserId) {
      console.log('⚠️ ผู้จองยังไม่เชื่อมต่อ LINE - ไม่ส่งแจ้งเตือน');
      return;
    }

    const isApproved = after.status === 'approved';
    const isRejected = after.status === 'rejected';
    if (!isApproved && !isRejected) {
      console.log('สถานะไม่ใช่ approved/rejected - ข้าม');
      return;
    }

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
    
    console.log('→ ส่งแจ้งเตือนไปยังผู้จอง');
    await sendLine(lineUserId, msg);

    // แจ้ง admin ด้วย (เฉพาะกรณี user แก้ไขคำขอ → status กลับเป็น pending)
    if (after.status === 'pending' && before.status !== 'pending') {
      console.log('คำขอถูก reset เป็น pending - แจ้ง admin');
      const adminLineUids = await getAllAdminLineUids();
      
      if (adminLineUids.length === 0) {
        console.log('⚠️ ไม่มี admin ที่เชื่อมต่อ LINE');
        return;
      }
      
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
      console.log(`→ ส่งแจ้งเตือนไปยัง admin ${adminLineUids.length} คน`);
      await Promise.all(adminLineUids.map(uid => sendLine(uid, adminMsg)));
    }
  });

/* ══════════════════════════════════════════════════════
   4. reminderJob — cron ทุก 5 นาที
   แจ้งเตือนก่อนถึงเวลาจอง 15 นาที (เฉพาะที่ approved และเชื่อมต่อ LINE แล้ว)
   ══════════════════════════════════════════════════════ */
exports.reminderJob = functions
  .region('us-central1')
  .pubsub.schedule('every 5 minutes')
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    console.log('=== Reminder Job Started ===');
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

    console.log('วันที่:', todayStr, '| เวลาเป้าหมาย:', targetTime);

    // ดึง booking ที่ approved วันนี้
    const snap = await db.collection('bookings')
      .where('status', '==', 'approved')
      .where('date', '==', todayStr)
      .get();

    console.log('พบ booking ที่ approved:', snap.size, 'รายการ');

    for (const doc of snap.docs) {
      const b = doc.data();
      if (!b.startTime) continue;

      // เช็คว่า startTime ตรงกับ targetTime (ให้ tolerance ±1 นาที)
      const [bHH, bMM] = b.startTime.split(':').map(Number);
      const bMins   = bHH * 60 + bMM;
      const diff    = Math.abs(bMins - targetMins);
      if (diff > 1) continue; // ไม่ใช่ช่วงเวลาที่ต้องแจ้ง

      console.log('→ ตรวจพบ booking ที่ต้องแจ้งเตือน:', b.room, b.startTime);

      // ตรวจว่าแจ้งไปแล้วหรือยัง (ป้องกันส่งซ้ำ)
      const sentKey = `reminded_${todayStr}_${b.startTime}`;
      if (b[sentKey]) {
        console.log('  แจ้งเตือนไปแล้ว - ข้าม');
        continue;
      }

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
        console.log('  ส่งแจ้งเตือนไปยังผู้จอง');
        await sendLine(lineUserId, msg);
      } else {
        console.log('  ผู้จองยังไม่เชื่อมต่อ LINE - ข้าม');
      }

      // Mark ว่าแจ้งไปแล้ว
      await doc.ref.update({ [sentKey]: true });
    }

    console.log('=== Reminder Job Completed ===');
    return null;
  });
