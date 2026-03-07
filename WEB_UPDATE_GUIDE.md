# 🔄 การแก้ไขเว็บให้เรียก Firebase Functions โดยตรง
## โรงเรียนหนองกี่พิทยาคม

---

## 📝 สรุปการเปลี่ยนแปลง

เปลี่ยนจาก **Google Apps Script (GAS)** เป็น **Firebase Functions** เพื่อ:
- ✅ ใช้ระบบเดียวกัน (Firebase)
- ✅ ไม่ต้องพึ่ง Google Apps Script
- ✅ ส่ง LINE แจ้งเตือนอัตโนมัติผ่าน Firestore Triggers
- ✅ มี log เพื่อ debug ได้ง่ายขึ้น

---

## 🔧 รายละเอียดการแก้ไข (4 จุด)

### 1. เปลี่ยน URL จาก GAS เป็น Firebase Functions

**เดิม:**
```javascript
var GAS_URL = 'https://script.google.com/macros/s/AKfycbw.../exec';
```

**ใหม่:**
```javascript
var LINE_PROXY_URL = 'https://us-central1-np-webapp-74616.cloudfunctions.net/lineProxy';
```

---

### 2. เปลี่ยนฟังก์ชันจาก `gasGet` (GET) เป็น `callLineProxy` (POST)

**เดิม:**
```javascript
function gasGet(params, cb) {
  var qs = Object.keys(params).map(function(k){
    return encodeURIComponent(k)+'='+encodeURIComponent(params[k]);
  }).join('&');
  fetch(GAS_URL + '?' + qs)
    .then(function(r){ return r.json(); })
    .then(cb)
    .catch(function(e){ cb({ error: e.message }); });
}
```

**ใหม่:**
```javascript
function callLineProxy(params, cb) {
  fetch(LINE_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
    .then(function(r){ return r.json(); })
    .then(cb)
    .catch(function(e){ cb({ error: e.message }); });
}
```

---

### 3. ลบการบันทึก Firestore จากฝั่ง Client

**เดิม:**
```javascript
callLineProxy({ code, redirectUri, ... }, function(data) {
  if (data.lineUserId) {
    // ❌ บันทึกซ้ำจากฝั่ง client
    db.collection('users').doc(u.uid).set(lineData, {merge:true});
    // ❌ บันทึกซ้ำลง admins ถ้าเป็น admin
    db.collection('admins').doc(u.email.toLowerCase()).set(...);
    ...
  }
});
```

**ใหม่:**
```javascript
callLineProxy({ code, redirectUri, ... }, function(data) {
  if (data.lineUserId) {
    // ✅ Firebase Functions จะบันทึกให้แล้ว - ไม่ต้องบันทึกซ้ำ
    lineRender(true, data.lineName||'');
    lineToast('เชื่อมต่อ LINE สำเร็จ ✓','ok');
  }
});
```

**ทำไมต้องลบ?**
- Firebase Functions บันทึกให้แล้วในฝั่ง server (ปลอดภัยกว่า)
- ป้องกันการบันทึกซ้ำซ้อน
- ลด code ฝั่ง client

---

### 4. ปิดการส่ง LINE จากฝั่ง Client

**เดิม:**
```javascript
function lineListenBookings(uid) {
  db.collection('bookings').where('userId','==',uid).onSnapshot(function(snap){
    snap.docChanges().forEach(function(ch){
      if (ch.type !== 'modified') return;
      var b = ch.doc.data();
      // ❌ ส่ง LINE ผ่าน GAS จากฝั่ง client
      gasGet({ action:'sendLine', lineUserId:..., msg:... }, function(){});
    });
  });
}
```

**ใหม่:**
```javascript
function lineListenBookings(uid) {
  // ✅ ไม่ต้องทำอะไร - Firebase Functions จัดการส่ง LINE ให้อัตโนมัติ
}
```

**ทำไมต้องปิด?**
- Firebase Functions มี trigger `onBookingStatusChanged` ส่ง LINE ให้อัตโนมัติแล้ว
- ถ้าไม่ปิด จะส่ง LINE ซ้ำ 2 ครั้ง
- Functions ส่งข้อความที่สวยงามกว่า (Flex Message)

---

## 🚀 วิธี Deploy

### ขั้นตอนที่ 1: Deploy Firebase Functions (ทำก่อน!)

```bash
cd /path/to/firebase/project

# ใส่ไฟล์ index.js ใหม่ลงในโฟลเดอร์ functions/
# แล้ว deploy

firebase deploy --only functions
```

**ตรวจสอบว่า deploy สำเร็จ:**
```
✓ functions[lineProxy]: Successful update operation.
Function URL: https://us-central1-np-webapp-74616.cloudfunctions.net/lineProxy
```

---

### ขั้นตอนที่ 2: อัปโหลด index.html ใหม่

1. นำไฟล์ `index.html` ที่แก้ไขแล้วไปแทนที่ในโปรเจค
2. Push ไปยัง GitHub repository
3. รอ GitHub Pages rebuild (~1-2 นาที)

**ถ้าใช้ GitHub:**
```bash
cd /path/to/your/github/repo

# ลบไฟล์เก่า และใส่ไฟล์ใหม่
cp /path/to/new/index.html ./index.html

git add index.html
git commit -m "เปลี่ยนจาก GAS เป็น Firebase Functions"
git push origin main
```

---

### ขั้นตอนที่ 3: Clear Cache เบราว์เซอร์

หลังจาก deploy เว็บแล้ว:
1. เปิด https://np-school.github.io/webapp/
2. กด `Ctrl + Shift + R` (Windows/Linux) หรือ `Cmd + Shift + R` (Mac)
3. หรือเปิด DevTools → Application → Clear Storage → Clear site data

---

## 🧪 วิธีทดสอบ

### ทดสอบที่ 1: เชื่อมต่อ LINE

1. **Login** เข้าระบบด้วย Google
2. **กดปุ่ม** "เชื่อมต่อ LINE"
3. **อนุญาต** ใน LINE Login
4. **ตรวจสอบ:**
   - ✅ เว็บแสดง "✅ เชื่อมต่อ LINE แล้ว"
   - ✅ ได้รับข้อความต้อนรับทาง LINE
   - ✅ ตรวจสอบ Firestore `users/{uid}` มี `lineUserId`

---

### ทดสอบที่ 2: ดู Logs ใน Firebase Console

1. ไปที่ https://console.firebase.google.com/project/np-webapp-74616/functions/logs
2. กด Filter → เลือก `lineProxy`
3. ควรเห็น log:

```
=== LINE Login Exchange Code ===
User: user@example.com ( ชื่อผู้ใช้ )
✓ LINE Profile: ชื่อ LINE → Uxxx...
✓ บันทึก Firestore สำเร็จ
```

---

### ทดสอบที่ 3: สร้างคำขอจอง (ผู้ใช้ทั่วไป)

1. **ผู้ใช้ที่เชื่อมต่อ LINE แล้ว** สร้างคำขอจองห้อง
2. **ตรวจสอบ:**
   - ✅ Admin ที่เชื่อมต่อ LINE ได้รับแจ้งเตือน
   - ❌ Admin ที่ยังไม่ได้เชื่อมต่อ LINE ไม่ได้รับ

3. **ดู Logs:**
```
=== Booking Created ===
ห้อง: ห้องประชุม | ผู้จอง: นายสมชาย | วันที่: 2026-03-10
พบ admin จำนวน: 3 - emails: ['admin1@...', 'admin2@...', 'admin3@...']
✓ Admin เชื่อมต่อ LINE: admin1@... → Uxxx...
○ Admin ยังไม่เชื่อมต่อ LINE: admin2@...
✓ Admin เชื่อมต่อ LINE: admin3@... → Uxxx...
รวม admin ที่เชื่อมต่อ LINE: 2 คน
→ ส่งแจ้งเตือนไปยัง admin 2 คน
```

---

### ทดสอบที่ 4: Admin อนุมัติ/ไม่อนุมัติ

1. **Admin อนุมัติ** คำขอจอง
2. **ตรวจสอบ:**
   - ✅ ผู้จองที่เชื่อมต่อ LINE ได้รับแจ้งเตือน (Flex Message สวยงาม)
   - ❌ ผู้จองที่ยังไม่เชื่อมต่อ LINE ไม่ได้รับ

3. **ดู Logs:**
```
=== Booking Updated ===
ห้อง: ห้องประชุม | สถานะ: pending → approved
→ ส่งแจ้งเตือนไปยังผู้จอง
✓ ส่ง LINE สำเร็จ: Uxxx...
```

---

## 🔍 ตรวจสอบปัญหา

### ปัญหา: ไม่ได้รับ LINE แจ้งเตือน

**ตรวจสอบ:**
1. ✅ User เชื่อมต่อ LINE แล้วหรือยัง?
   - เข้า Firestore → `users/{uid}` → มี `lineUserId` หรือไม่
2. ✅ Functions deploy สำเร็จหรือยัง?
   - ดูที่ Firebase Console → Functions
3. ✅ ดู Logs ว่ามี error หรือไม่
   - Firebase Console → Functions → Logs

---

### ปัญหา: เว็บแสดง "เชื่อมต่อไม่สำเร็จ"

**ตรวจสอบ:**
1. ✅ เปิด DevTools (F12) → Console → ดู error
2. ✅ ตรวจสอบว่า Firebase Functions URL ถูกต้อง:
   ```
   https://us-central1-np-webapp-74616.cloudfunctions.net/lineProxy
   ```
3. ✅ ตรวจสอบว่า CORS ถูกเปิดใช้งาน (ควรเปิดอยู่แล้ว)

---

### ปัญหา: แจ้งเตือนซ้ำ 2 ครั้ง

**สาเหตุ:** ยังไม่ได้ปิด `lineListenBookings` หรือยังไม่ได้อัปโหลดเว็บใหม่

**แก้ไข:**
1. ตรวจสอบว่าอัปโหลด `index.html` ใหม่แล้วหรือยัง
2. Clear cache เบราว์เซอร์
3. Reload หน้าเว็บ (Ctrl + Shift + R)

---

## 📊 สรุป Flow ใหม่

### Flow 1: เชื่อมต่อ LINE

```
User กดปุ่ม "เชื่อมต่อ LINE"
    ↓
Redirect ไป LINE Login
    ↓
LINE callback พร้อม code
    ↓
เว็บเรียก Firebase Functions (lineProxy)
    ↓
Functions แลก code → lineUserId
    ↓
Functions บันทึกลง Firestore users/{uid}
    ↓
Functions ส่งข้อความต้อนรับทาง LINE
    ↓
✅ เสร็จสิ้น
```

---

### Flow 2: สร้างคำขอจอง → แจ้ง Admin

```
User สร้างคำขอจอง
    ↓
Firestore trigger: onBookingCreated
    ↓
ดึง admin ที่เชื่อมต่อ LINE แล้ว
    ↓
ส่ง LINE Flex Message → Admin ที่เชื่อมต่อ LINE
    ↓
✅ Admin ได้รับแจ้งเตือน
```

---

### Flow 3: Admin อนุมัติ → แจ้งผู้จอง

```
Admin อนุมัติคำขอ
    ↓
Firestore trigger: onBookingStatusChanged
    ↓
ดึง lineUserId ของผู้จอง
    ↓
ส่ง LINE Flex Message → ผู้จอง (ถ้าเชื่อมต่อ LINE แล้ว)
    ↓
✅ ผู้จองได้รับแจ้งเตือน
```

---

### Flow 4: Reminder ก่อน 15 นาที

```
Cron job ทุก 5 นาที
    ↓
หา booking ที่ approved + เริ่มในอีก 15 นาที
    ↓
ส่ง LINE Flex Message → ผู้จอง (ถ้าเชื่อมต่อ LINE แล้ว)
    ↓
✅ ผู้จองได้รับแจ้งเตือน
```

---

## ✅ Checklist การ Deploy

- [ ] Deploy Firebase Functions (`firebase deploy --only functions`)
- [ ] ตรวจสอบ Functions URL ใน Console
- [ ] อัปโหลด `index.html` ใหม่ไปยัง GitHub
- [ ] รอ GitHub Pages rebuild
- [ ] Clear cache เบราว์เซอร์
- [ ] ทดสอบเชื่อมต่อ LINE
- [ ] ทดสอบสร้างคำขอจอง
- [ ] ทดสอบ admin อนุมัติ
- [ ] ตรวจสอบ Logs ใน Firebase Console
- [ ] แจ้ง admin/user ให้เชื่อมต่อ LINE

---

## 🎉 ผลลัพธ์ที่ได้

✅ ไม่ต้องพึ่ง Google Apps Script อีกต่อไป  
✅ ระบบเป็นอันเดียวกันใน Firebase  
✅ ส่ง LINE อัตโนมัติผ่าน Firestore Triggers  
✅ ข้อความ LINE สวยงามขึ้น (Flex Message)  
✅ มี Logs เพื่อ Debug ได้ง่าย  
✅ ส่งแจ้งเตือนเฉพาะคนที่เชื่อมต่อ LINE แล้ว  

---

**สร้างเมื่อ:** 7 มีนาคม 2026  
**เวอร์ชัน:** 2.0 - เปลี่ยนจาก GAS เป็น Firebase Functions
