# คู่มือ Deploy ระบบแจ้งเตือน LINE
## โรงเรียนหนองกี่พิทยาคม

---

## สิ่งที่ต้องทำ 5 ขั้นตอน

---

### ขั้นที่ 1 — ตั้งค่า LINE Login Channel (Callback URL)

1. ไปที่ https://developers.line.biz/console/
2. เลือก Channel **"NP Origins"** (LINE Login, ID: 2009342857)
3. คลิกแท็บ **"LINE Login"**
4. หัวข้อ **"Callback URL"** → กด Edit → เพิ่ม:
   ```
   https://np-school.github.io/webapp/index.html
   ```
5. กด **Update**

---

### ขั้นที่ 2 — เปิดใช้ Blaze Plan ใน Firebase

Cloud Functions ต้องการ Blaze Plan (pay-as-you-go) แต่ใช้งานในขนาดโรงเรียน **ฟรี** (อยู่ใน free tier)

1. ไปที่ https://console.firebase.google.com/project/np-webapp-74616
2. คลิก **"Upgrade"** → เลือก **Blaze Plan**
3. ใส่ข้อมูลบัตร (ไม่มีการเรียกเก็บเงินถ้าใช้ไม่เกิน free quota)

---

### ขั้นที่ 3 — ติดตั้ง Firebase CLI และ Deploy Functions

เปิด Terminal (Mac/Linux) หรือ Command Prompt (Windows):

```bash
# ติดตั้ง Firebase CLI (ถ้ายังไม่มี)
npm install -g firebase-tools

# Login
firebase login

# เข้าไปในโฟลเดอร์ functions ที่ดาวน์โหลดมา
cd functions

# ติดตั้ง dependencies
npm install

# กลับไปโฟลเดอร์หลัก แล้ว init (ถ้ายังไม่มี firebase.json)
cd ..
firebase use np-webapp-74616

# Deploy เฉพาะ Functions
firebase deploy --only functions
```

**หลัง deploy สำเร็จ** จะเห็น URL ของ lineProxy เช่น:
```
✓ functions[lineProxy]: Successful create operation.
Function URL: https://us-central1-np-webapp-74616.cloudfunctions.net/lineProxy
```

---

### ขั้นที่ 4 — ตั้งค่า Firestore Rules

ไปที่ Firebase Console → Firestore → Rules → เพิ่ม:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // bookings — อ่านได้ทุกคน, เขียนได้เฉพาะ login
    match /bookings/{id} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         exists(/databases/$(database)/documents/admins/$(request.auth.token.email)));
    }

    // rooms — อ่านได้ทุกคน, แก้ไขได้เฉพาะ admin
    match /rooms/{id} {
      allow read: if true;
      allow write: if request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }

    // admins — อ่านได้เฉพาะ login, แก้ไขได้เฉพาะ admin
    match /admins/{email} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }

    // users — เจ้าของอ่าน/เขียนได้ตัวเอง, Cloud Functions เข้าได้ทั้งหมด
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

### ขั้นที่ 5 — อัปโหลด index.html ขึ้น GitHub

1. นำไฟล์ `index.html` ที่ได้มาอัปโหลดขึ้น GitHub repo ที่ `https://np-school.github.io/webapp/`
2. รอ GitHub Pages rebuild (~1 นาที)

---

## ทดสอบระบบ

1. **ทดสอบปุ่มเชื่อมต่อ LINE**
   - เข้า https://np-school.github.io/webapp/
   - Login Google → เห็นการ์ด "เชื่อมต่อ LINE"
   - กดปุ่ม → ระบบ redirect ไป LINE Login
   - อนุญาต → กลับมาหน้าเว็บ → การ์ดเปลี่ยนเป็น "✅ เชื่อมต่อ LINE แล้ว"
   - ตรวจสอบ LINE ได้รับข้อความต้อนรับ

2. **ทดสอบแจ้งเตือน admin (คำขอใหม่)**
   - ให้ผู้ใช้คนอื่น login และจองห้อง
   - admin ควรได้รับ LINE แจ้งเตือนทันที

3. **ทดสอบแจ้งสถานะ**
   - admin อนุมัติ/ไม่อนุมัติคำขอ
   - ผู้จองควรได้รับ LINE แจ้งผล

4. **ทดสอบแจ้งเตือน 15 นาที**
   - สร้างการจองที่ approved ให้เวลาเริ่มต้นอีก 15 นาที
   - รอ cron รัน (ทุก 5 นาที) → ได้รับแจ้งเตือน

---

## โครงสร้างข้อมูล Firestore ที่เพิ่มมา

```
users/{firebaseUid}
  ├── lineUserId: string    ← LINE User ID
  ├── lineName: string      ← ชื่อใน LINE
  ├── linePic: string       ← รูปโปรไฟล์ LINE
  ├── email: string
  ├── name: string
  └── updatedAt: timestamp
```

---

## หมายเหตุ

- **LINE Channel Secret** (`823b953e...`) ใน `functions/index.js` ใช้สำหรับ แลก code → token
- **Channel Access Token** ใช้สำหรับส่งข้อความ ถ้า expire ต้อง Issue ใหม่และอัปเดตใน `index.js`
- cron job `reminderJob` รันทุก 5 นาที ใช้ Cloud Scheduler (ฟรี 3 jobs แรก)
