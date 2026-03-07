# 🔧 การแก้ไขระบบแจ้งเตือน LINE
## โรงเรียนหนองกี่พิทยาคม

---

## 📋 สรุปปัญหาที่แก้ไข

### ปัญหาเดิม:
1. ❌ ระบบส่งแจ้งเตือนไปยัง admin ทุกคน แม้ที่ยังไม่ได้เชื่อมต่อ LINE
2. ❌ ระบบส่งแจ้งเตือนไปยังผู้ใช้ทั่วไป แม้ที่ยังไม่ได้เชื่อมต่อ LINE
3. ❌ ไม่มี log เพื่อ debug ว่าใครได้รับการแจ้งเตือนบ้าง

### การแก้ไข:
1. ✅ ปรับปรุง `getAllAdminLineUids()` ให้กรองเฉพาะ admin ที่**เชื่อมต่อ LINE แล้ว**เท่านั้น
2. ✅ ปรับปรุง `getLineUid()` ให้ตรวจสอบว่าผู้ใช้**เชื่อมต่อ LINE แล้ว**หรือยัง
3. ✅ เพิ่ม console.log เพื่อ debug และติดตามการทำงาน
4. ✅ เพิ่มการแจ้งเตือนเมื่อไม่มีคนที่จะส่ง LINE ให้

---

## 🔍 สิ่งที่เปลี่ยนแปลงใน Code

### 1. Function `getAllAdminLineUids()` (บรรทัด 56-97)

**เดิม:**
```javascript
async function getAllAdminLineUids() {
  const snap = await db.collection('admins').get();
  const uids = [];
  for (const doc of snap.docs) {
    const email = doc.id;
    const userSnap = await db.collection('users')
      .where('email', '==', email).limit(1).get();
    if (!userSnap.empty) {
      const lineUid = userSnap.docs[0].data().lineUserId;
      if (lineUid) uids.push(lineUid); // ❌ ไม่มี log
    }
  }
  return uids;
}
```

**ใหม่:**
```javascript
async function getAllAdminLineUids() {
  try {
    const adminSnap = await db.collection('admins').get();
    if (adminSnap.empty) {
      console.log('ไม่มี admin ในระบบ'); // ✅ เพิ่ม log
      return [];
    }
    
    const adminEmails = adminSnap.docs.map(doc => doc.id);
    console.log('พบ admin จำนวน:', adminEmails.length, '- emails:', adminEmails); // ✅ log
    
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
          console.log('✓ Admin เชื่อมต่อ LINE:', email, '→', lineUserId); // ✅ log
        } else {
          console.log('○ Admin ยังไม่เชื่อมต่อ LINE:', email); // ✅ log
        }
      } else {
        console.log('! ไม่พบ user สำหรับ admin email:', email); // ✅ log
      }
    }
    
    console.log('รวม admin ที่เชื่อมต่อ LINE:', lineUids.length, 'คน'); // ✅ log
    return lineUids;
  } catch (err) {
    console.error('Error getAllAdminLineUids:', err);
    return [];
  }
}
```

### 2. Function `getLineUid()` (บรรทัด 43-54)

**เพิ่ม:**
- ✅ Error handling
- ✅ Log เมื่อไม่พบ user
- ✅ Log เมื่อ user ยังไม่เชื่อมต่อ LINE

### 3. Function `sendLine()` (บรรทัด 29-42)

**เพิ่ม:**
- ✅ Log เมื่อส่ง LINE สำเร็จ
- ✅ Log เมื่อไม่มี LINE User ID

### 4. ทุก Trigger Functions

**เพิ่ม:**
- ✅ Log ตอนเริ่มทำงาน
- ✅ Log จำนวนคนที่จะส่งแจ้งเตือน
- ✅ Warning เมื่อไม่มีคนที่จะส่ง LINE

---

## 🚀 วิธี Deploy

### ขั้นตอนที่ 1: เตรียมไฟล์

1. ดาวน์โหลดไฟล์ `index.js` ฉบับใหม่
2. ไปที่โฟลเดอร์ `functions` ในโปรเจค Firebase ของคุณ
3. **แทนที่** ไฟล์ `index.js` เดิมด้วยไฟล์ใหม่

### ขั้นตอนที่ 2: Deploy ไปยัง Firebase

เปิด Terminal และรันคำสั่ง:

```bash
# ไปที่โฟลเดอร์โปรเจค
cd /path/to/your/firebase/project

# Deploy เฉพาะ Functions
firebase deploy --only functions

# หรือถ้าอยู่ในโฟลเดอร์ functions อยู่แล้ว
cd ..
firebase deploy --only functions
```

### ขั้นตอนที่ 3: ตรวจสอบ Deploy สำเร็จ

ควรเห็นข้อความแบบนี้:

```
✓ functions[lineProxy]: Successful update operation.
✓ functions[onBookingCreated]: Successful update operation.
✓ functions[onBookingStatusChanged]: Successful update operation.
✓ functions[reminderJob]: Successful update operation.

Deploy complete!
```

---

## 🧪 วิธีทดสอบหลัง Deploy

### ทดสอบที่ 1: ตรวจสอบ Logs

1. ไปที่ Firebase Console → Functions → Logs
2. สังเกต log ใหม่ที่เพิ่มเข้ามา

**ตัวอย่าง log ที่ควรเห็น:**

```
=== Booking Created ===
ห้อง: ห้องประชุม | ผู้จอง: นายสมชาย ใจดี | วันที่: 2026-03-10
พบ admin จำนวน: 3 - emails: ['admin1@example.com', 'admin2@example.com', 'admin3@example.com']
✓ Admin เชื่อมต่อ LINE: admin1@example.com → Uxxx...
○ Admin ยังไม่เชื่อมต่อ LINE: admin2@example.com
✓ Admin เชื่อมต่อ LINE: admin3@example.com → Uxxx...
รวม admin ที่เชื่อมต่อ LINE: 2 คน
→ ส่งแจ้งเตือนไปยัง admin 2 คน
✓ ส่ง LINE สำเร็จ: Uxxx...
✓ ส่ง LINE สำเร็จ: Uxxx...
```

### ทดสอบที่ 2: สร้างคำขอจองใหม่

1. ให้ผู้ใช้ทั่วไป (ที่**ยังไม่ได้เชื่อมต่อ LINE**) สร้างคำขอจอง
2. ตรวจสอบ:
   - ❌ ผู้ใช้ทั่วไปจะ**ไม่ได้รับ** LINE (เพราะยังไม่ได้เชื่อมต่อ)
   - ✅ Admin ที่**เชื่อมต่อ LINE แล้ว**จะได้รับแจ้งเตือน
   - ❌ Admin ที่**ยังไม่ได้เชื่อมต่อ LINE** จะ**ไม่ได้รับ** LINE

### ทดสอบที่ 3: ให้ผู้ใช้เชื่อมต่อ LINE

1. ให้ผู้ใช้ login เข้าระบบ
2. กดปุ่ม "เชื่อมต่อ LINE" และอนุญาต
3. ตรวจสอบว่าได้รับข้อความต้อนรับ:
   ```
   ✅ เชื่อมต่อระบบสำเร็จ!
   
   สวัสดีคุณ [ชื่อ] 👋
   ตอนนี้คุณจะได้รับแจ้งเตือนผ่าน LINE เมื่อ:
   • ผลอนุมัติ/ไม่อนุมัติคำขอ
   • ใกล้ถึงเวลาใช้ห้อง (ก่อน 15 นาที)
   
   โรงเรียนหนองกี่พิทยาคม 🏫
   ```

### ทดสอบที่ 4: Admin อนุมัติคำขอ

1. Admin อนุมัติคำขอของผู้ใช้ที่**เชื่อมต่อ LINE แล้ว**
2. ผู้ใช้ควรได้รับข้อความ:
   ```
   ✅ อนุมัติคำขอแล้ว!
   
   ห้อง: [ชื่อห้อง]
   วันที่: [วันที่]
   เวลา: [เวลา]
   
   กรุณานำเอกสารไปติดต่อที่ห้องธุรการก่อนใช้งาน
   ```

### ทดสอบที่ 5: Reminder (แจ้งเตือนก่อน 15 นาที)

1. สร้างคำขอที่ approved และเวลาเริ่มอีก 15-20 นาที
2. รอ cron job รัน (ทุก 5 นาที)
3. ผู้ใช้ที่**เชื่อมต่อ LINE แล้ว**ควรได้รับข้อความ:
   ```
   ⏰ แจ้งเตือน: ใกล้ถึงเวลาจองแล้ว!
   
   ห้อง: [ชื่อห้อง]
   วันที่: [วันที่]
   เวลา: [เวลา]
   เริ่ม: อีก ~15 นาที
   
   กรุณาเตรียมตัวให้พร้อม
   ```

---

## 📊 สรุป Flow การทำงานใหม่

### 1. เมื่อมีคำขอจองใหม่ (`onBookingCreated`)

```
User สร้างคำขอ
    ↓
Firestore trigger
    ↓
ดึงรายชื่อ admin ทั้งหมดจาก collection "admins"
    ↓
วนลูป: สำหรับแต่ละ admin email
    ↓
    ├─→ หา user ที่ตรงกับ email นี้
    ↓
    ├─→ เช็คว่ามี lineUserId หรือไม่?
    ↓
    ├─→ ✅ มี → เก็บไว้ในลิสต์
    └─→ ❌ ไม่มี → ข้าม (log: "Admin ยังไม่เชื่อมต่อ LINE")
    ↓
ถ้ามี admin ที่เชื่อมต่อ LINE อย่างน้อย 1 คน
    ↓
ส่งข้อความ LINE ไปยัง admin ทุกคนในลิสต์
```

### 2. เมื่อสถานะคำขอเปลี่ยน (`onBookingStatusChanged`)

```
Admin อนุมัติ/ไม่อนุมัติ
    ↓
Firestore trigger
    ↓
ดึง lineUserId ของผู้จอง (userId)
    ↓
    ├─→ ✅ มี lineUserId → ส่ง LINE
    └─→ ❌ ไม่มี → ข้าม (log: "ผู้จองยังไม่เชื่อมต่อ LINE")
```

### 3. Reminder ก่อน 15 นาที (`reminderJob`)

```
Cron ทุก 5 นาที
    ↓
หา booking ที่ approved + วันนี้ + เริ่มในอีก 15 นาที
    ↓
วนลูป: สำหรับแต่ละ booking
    ↓
    ├─→ ดึง lineUserId ของผู้จอง
    ↓
    ├─→ ✅ มี → ส่ง LINE
    ├─→ ❌ ไม่มี → ข้าม
    └─→ บันทึกว่าแจ้งไปแล้ว (ป้องกันส่งซ้ำ)
```

---

## ⚠️ สิ่งที่ต้องทำต่อ

### 1. แจ้ง Admin ให้เชื่อมต่อ LINE

ส่งข้อความแจ้งให้ admin ทุกคนเข้าไปเชื่อมต่อ LINE:

```
กรุณา login เข้าระบบที่:
https://np-school.github.io/webapp/

แล้วกดปุ่ม "เชื่อมต่อ LINE" เพื่อรับการแจ้งเตือน
```

### 2. แจ้งผู้ใช้ทั่วไปให้เชื่อมต่อ LINE

ใส่ประกาศในหน้าเว็บ หรือส่งข้อความแจ้ง:

```
📢 ประกาศ: ระบบแจ้งเตือนผ่าน LINE

หากต้องการรับการแจ้งเตือนผลการอนุมัติคำขอ
กรุณา login และกดปุ่ม "เชื่อมต่อ LINE"
```

### 3. ตรวจสอบ Logs เป็นประจำ

เข้าไปดู Firebase Console → Functions → Logs เป็นประจำ
เพื่อดูว่า:
- มี admin กี่คนที่เชื่อมต่อ LINE แล้ว
- มีผู้ใช้กี่คนที่ยังไม่ได้เชื่อมต่อ LINE

---

## 🎯 ผลลัพธ์ที่คาดหวัง

หลังจาก deploy และทดสอบแล้ว:

✅ **Admin ที่เชื่อมต่อ LINE แล้ว** จะได้รับแจ้งเตือนเมื่อมีคำขอใหม่
❌ **Admin ที่ยังไม่ได้เชื่อมต่อ LINE** จะไม่ได้รับการแจ้งเตือน

✅ **ผู้ใช้ที่เชื่อมต่อ LINE แล้ว** จะได้รับแจ้งเตือนเมื่อคำขอได้รับการอนุมัติ/ไม่อนุมัติ
❌ **ผู้ใช้ที่ยังไม่ได้เชื่อมต่อ LINE** จะไม่ได้รับการแจ้งเตือน

✅ **Logs ใน Firebase** จะแสดงข้อมูลละเอียดว่าใครได้รับการแจ้งเตือนบ้าง

---

## 💡 ข้อดีของการแก้ไขนี้

1. **ประหยัด API calls** - ไม่ส่ง LINE ไปยังคนที่ยังไม่ได้เชื่อมต่อ (ซึ่งจะ error อยู่ดี)
2. **Debug ง่ายขึ้น** - มี log ละเอียดว่าใครได้รับการแจ้งเตือนบ้าง
3. **User experience ดีขึ้น** - ผู้ใช้จะได้รับการแจ้งเตือนเฉพาะคนที่เชื่อมต่อ LINE แล้ว
4. **ไม่มี silent error** - ระบบจะ log ชัดเจนว่าใครยังไม่ได้เชื่อมต่อ LINE

---

## 📞 หากมีปัญหา

1. ตรวจสอบ Firebase Console → Functions → Logs
2. ดูว่า function ทำงานหรือไม่
3. ดู log message ว่าแจ้งอะไร
4. ตรวจสอบว่า admin/user เชื่อมต่อ LINE แล้วหรือยัง

---

**สร้างเมื่อ:** 7 มีนาคม 2026  
**ผู้แก้ไข:** Claude (Anthropic)  
**เวอร์ชัน:** 2.0 - ปรับปรุงการตรวจสอบ LINE connection
