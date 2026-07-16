# CLAUDE.md

คำแนะนำสำหรับ Claude Code เมื่อทำงานกับโค้ดในโปรเจกต์นี้

## ภาพรวมโปรเจกต์

**NP Origins** — ระบบบริการออนไลน์ของโรงเรียนหนองกี่พิทยาคม (Nong Ki Pittayakom School)
เป็น Multi-page PWA (ไม่มี framework/bundler) เขียนด้วย HTML + Vanilla JS (global scope, ES5-style)
ต่อกับ Firebase เป็น backend ทั้งหมด (Auth, Firestore, Storage, Cloud Functions, Cloud Messaging)

- **Frontend hosting**: GitHub Pages (ดูจาก `LINE_CB` ใน `shared/firebase.js` ที่ชี้ไป `np-school.github.io/webapp/`) — **ไม่ใช่** Firebase Hosting (`firebase.json` มีแค่ config ของ Functions เท่านั้น ไม่มี `hosting` block)
- **Backend**: Firebase project `np-webapp-74616`
- **Auth**: Google Sign-In เท่านั้น (`auth.signInWithPopup` + `GoogleAuthProvider`)
- **ภาษา**: UI ทั้งหมดเป็นภาษาไทย, โค้ด/คอมเมนต์ผสมไทย-อังกฤษ

## โครงสร้างโฟลเดอร์

```
/
├── *.html                  หน้าแต่ละหน้า (1 หน้า = 1 ฟีเจอร์ ดูตารางด้านล่าง)
├── page-template.html      Template สำหรับสร้างหน้าใหม่ (copy แล้ว rename)
├── js/
│   ├── page-name.js        ⚠️ ตัวอย่าง/template เท่านั้น ไม่ได้ใช้งานจริง (คู่กับ page-template.html)
│   └── <page>.js            โค้ดเฉพาะหน้า 1 ไฟล์ต่อ 1 หน้า (global scope, ไม่มี import/export)
├── shared/
│   ├── firebase.js          Firebase config + init, LINE config, push notification setup
│   ├── common.js            buildPage()/buildPageShell() — navbar, sidebar, auth guard, toast,
│   │                        theme system, date formatters ฯลฯ (ใช้ร่วมทุกหน้า)
│   └── styles-new.css       Design token system (CSS variables) + ทุก component style
├── functions/
│   ├── index.js             ⚠️ Entry point จริง (ตาม package.json "main") — ดู "ปัญหาที่รู้" ด้านล่าง
│   ├── functions-index.js   ⚠️ ไฟล์ซ้ำ/ไม่ได้ใช้งานจริง อย่าแก้ไฟล์นี้โดยคิดว่ามีผล deploy
│   ├── notifications.js     Push notification triggers: booking + repair
│   ├── portfolio-notifications.js  Push notification triggers: portfolio (ยังไม่ถูก export จาก index.js จริง)
│   └── drive-upload.js      อัปโหลดรูปแจ้งซ่อมไป Google Drive
├── manifest.json / sw.js / firebase-messaging-sw.js   PWA + push notification service worker
└── firebase.json / .firebaserc                        Firebase CLI config (functions only)
```

## แผนที่หน้า → ฟีเจอร์

| หน้า | ฟีเจอร์ | สิทธิ์ |
|---|---|---|
| `index.html` | หน้าแรก/ล็อกอิน | ทุกคน |
| `staff.html` | ข้อมูลบุคลากร | staff permission |
| `profile.html` | โปรไฟล์/My Portfolio | ล็อกอินแล้ว |
| `guide.html` | คู่มือการใช้งาน | ทุกคน |
| `room-request.html` / `room-admin.html` | จอง/จัดการห้องประชุม | user / bookings permission |
| `repair-user.html` / `repair-admin.html` | แจ้งซ่อม / จัดการแจ้งซ่อม | user / repair permission |
| `ipad-lending.html` | ยืม-คืน iPad | ipad permission |
| `foodcourt-admin.html` | บัญชีรายได้ Food Court | foodcourt permission |
| `portfolio-teacher.html` / `portfolio-admin.html` | ส่งงานครู / ติดตามส่งงาน | user / portfolio permission |
| `admin-role.html` | จัดการสิทธิ์ admin | SuperAdmin เท่านั้น |
| `settings.html` | ตั้งค่าสีธีมเว็บไซต์ | SuperAdmin เท่านั้น |

## รูปแบบมาตรฐานของการสร้างหน้าใหม่

1. Copy `page-template.html` → `<ชื่อหน้า>.html`
2. Copy `js/page-name.js` → `js/<ชื่อหน้า>.js` แล้วแก้ `<script src="js/page-name.js">` ใน HTML ที่ copy มาให้ตรงกัน
3. แก้ config ใน `buildPage({...})`: `appId`, `navSubtitle`, `navTheme` (`'blue'` ผู้ใช้ทั่วไป / `'dark'` เจ้าหน้าที่), `activePage`, `requireAdmin`
4. เขียน `renderPage()` (คืนค่าเป็น HTML string) และ `loadData()` ใน `onAuth` callback
5. ถ้าต้องขึ้นเมนู sidebar ใหม่ แก้ที่เดียวคือ `MAIN_MENU` / `GROUP_MENU` / `ADMIN_GROUP_MENU` ใน `shared/common.js`

**อย่า** เขียน navbar/sidebar/auth guard เองในหน้าใหม่ — ทุกอย่างมาจาก `buildPage()`/`buildPageShell()` ใน `common.js` แล้ว

## Firestore Collections

`admins`, `announcements`, `bookings`, `fcmTokens`, `foodcourt_meta`, `ipad_accessory_claims`,
`ipad_borrows`, `ipad_devices`, `ipad_students`, `portfolio_doc_types`, `portfolio_memos`,
`portfolio_submissions`, `repair_buildings`, `repair_categories`, `repair_responsible`, `repairs`,
`rooms`, `site_config`, `staff`, `staff_career_history`, `staff_development`, `staff_duties`,
`staff_education`, `staff_media`, `staff_profile`, `staff_profile_sync`, `staff_teaching`, `users`

- ระบบสิทธิ์: `admins/{email}` (email เป็น lowercase = doc id) → field `permissions: { bookings, repair, staff, foodcourt, portfolio, ipad }`
- SuperAdmin ถูก hardcode ไว้เป็นอีเมลเดียวใน **2 ที่แยกกัน** ต้องแก้พร้อมกันเสมอ:
  - `shared/common.js` → `var SUPERADMIN_EMAIL`
  - `functions/notifications.js` (คอมเมนต์ระบุไว้ว่าต้องตรงกัน)

## Conventions ที่ต้องรู้ก่อนแก้โค้ด

- โค้ด JS ทุกไฟล์เป็น **global scope** (`var`, ไม่มี module system) — ระวังชื่อฟังก์ชัน/ตัวแปรชนกันข้ามไฟล์
- Render HTML ด้วยการต่อ string (`'<div>' + ... + '</div>'`) ไม่ใช้ template engine — ใช้ `esc()` เมื่อแทรกค่าใน inline `onclick="fn('...')"` และ `esc2()` เมื่อแทรกเป็น HTML text เพื่อกัน XSS
- Date/เวลา: ใช้ `formatDate()` หรือ `fmtDate()` จาก `common.js` (มีอยู่ 2 ชื่อเพราะเดิมซ้ำกันหลายไฟล์ รวมมาไว้ที่เดียวแล้ว) — อย่าสร้างฟังก์ชัน format วันที่ใหม่ซ้ำ
- ปีการศึกษาไทยใช้ `getAcademicYear()` (พ.ค.–ต.ค. = เทอม 1, พ.ย.–เม.ย. = เทอม 2)
- สีธีม: ห้าม hardcode hex ใหม่ในหน้าเว็บ ให้ใช้ CSS variable (`var(--accent)` ฯลฯ) จาก `styles-new.css` — ผู้ดูแลระบบ (SuperAdmin) สามารถเปลี่ยนสีธีมได้จริงผ่าน `settings.html` ซึ่งจะ query `site_config/theme` แล้วเขียนทับ CSS variable ที่ `document.body` (**ไม่ใช่** `document.documentElement`) เพราะ `body.theme-staff`/`body.theme-blue` ใน CSS ชนะการ inherit จาก parent เสมอ — ดูคอมเมนต์ยาวใน `_setAccentVars()` ก่อนแก้จุดนี้
- Firestore บังคับ `experimentalForceLongPolling: true` เพราะเน็ตโรงเรียนบล็อก HTTP/2 streaming — **ห้ามลบ/ปิดค่านี้** แม้จะดูเหมือนไม่จำเป็นในเครื่อง dev
- มี in-app browser detection (LINE/FB/IG WebView) ที่ redirect/บล็อกออกไปเปิด browser จริง เพราะ Google Sign-In ใช้ใน WebView ไม่ได้ — logic นี้อยู่ซ้ำ 2 ที่ (`index.html` inline script และ `common.js` → `isInAppBrowser()`) ถ้าจะแก้ regex ต้องแก้ทั้งสองจุด
- `checkAdminAccess()` มี cache ผ่าน `localStorage` (`np_admin_access_cache_<email>`) เพื่อกันเมนูไม่ขึ้นตอนเน็ตช้า แล้วค่อย fetch จริงซ้ำ — ถ้า debug เรื่องเมนู admin ไม่ขึ้น/ขึ้นผิด ให้เคลียร์ localStorage ก่อน

## ปัญหาที่รู้อยู่แล้ว / ต้องระวัง

1. **`functions/index.js` (entry point จริง) ไม่ได้ export ฟังก์ชันแจ้งเตือนพอร์ตโฟลิโอ** — `onNewPortfolioSubmission`, `onPortfolioResubmitted`, `onPortfolioStatusChanged` มีเขียนอยู่ใน `functions/portfolio-notifications.js` และถูก export ไว้ใน `functions/functions-index.js` เท่านั้น ซึ่งไฟล์นั้นไม่ตรงกับ `main` ใน `functions/package.json` (`"main": "index.js"`) แปลว่า Cloud Functions 3 ตัวนี้**อาจไม่ได้ deploy จริง** ต้องตรวจสอบและรวม export เข้า `index.js` ตัวจริง แล้วลบ/rename `functions-index.js` ทิ้งเพื่อไม่ให้สับสนอีก
2. **Tailwind CDN v2.2.19 (ปี 2021)** โหลดเต็มทุกหน้าโดยไม่ purge ซ้ำซ้อนกับ design token system ใน `styles-new.css` — ควรพิจารณาตัดออกหรือ build ผ่าน CLI
3. **ไฟล์ JS ใหญ่เกินไป**: `portfolio-admin.js` (3,240 บรรทัด), `ipad-lending.js`, `portfolio-teacher.js`, `profile.js`, `repair-admin.js` — ควรแตกเป็นโมดูลย่อยเมื่อมีโอกาส
4. **`js/page-name.js` ไม่ใช่หน้าเว็บจริง** เป็นแค่ template ตัวอย่าง อย่าแก้ไฟล์นี้คิดว่ามีผลกับหน้าใดหน้าหนึ่ง
5. Favicon/manifest icons อ้างอิง Firebase Storage URL ที่มี access token ฝังอยู่ — ถ้า token หมดอายุ/rule เปลี่ยน ไอคอนทั้งเว็บพังพร้อมกัน
6. อย่า commit `.DS_Store`, `__MACOSX/`, `node_modules/`, หรือไฟล์ secret (`serviceAccountKey.json`, `*.env`) — มีอยู่ใน `.gitignore` แล้วแต่ต้องเช็คซ้ำก่อน commit ทุกครั้ง

## คำสั่งที่ใช้บ่อย

```bash
# Deploy Cloud Functions เท่านั้น
firebase deploy --only functions

# Deploy เฉพาะ function เดียว
firebase deploy --only functions:onBookingStatusChanged

# ติดตั้ง dependencies ของ functions
cd functions && npm install
```

> โปรเจกต์นี้ไม่มี build step สำหรับ frontend (ไม่มี `npm run build`/bundler) — แก้ไฟล์ `.html`/`.js`/`.css` แล้ว push ขึ้น GitHub Pages ได้เลย
