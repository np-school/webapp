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
│   ├── index.js             Entry point จริง (ตาม package.json "main") — export ครบทั้ง booking/repair/portfolio/drive-upload แล้ว
│   ├── notifications.js     Push notification triggers: booking + repair
│   ├── portfolio-notifications.js  Push notification triggers: portfolio (export จาก index.js แล้ว)
│   └── drive-upload.js      อัปโหลดรูปแจ้งซ่อมไป Google Drive
├── manifest.json / sw.js / firebase-messaging-sw.js   PWA + push notification service worker
└── firebase.json / .firebaserc                        Firebase CLI config (functions only)
```

> **`firestore.rules`** (root) — Firestore Security Rules ตัวจริงที่ deploy จริง (`firebase deploy --only firestore:rules`)
> ทุกครั้งที่เพิ่ม field ใหม่ที่ client เขียนตรงเข้า Firestore (ไม่ผ่าน Cloud Function) **ต้องเช็คไฟล์นี้ด้วยเสมอ**
> ว่า rule อนุญาตให้เขียนหรือยัง ไม่งั้นจะเจอ `permission-denied` เงียบๆ ตอน production (ไม่ error ตอน dev
> เพราะมักลืมเทสต์ด้วย account ที่ไม่ใช่ SuperAdmin) — ดู pattern การล็อกแบบ "แก้ได้แค่ doc ตัวเอง + field
> ที่กำหนดเท่านั้น" ที่ใช้ซ้ำหลายจุดในไฟล์นี้ (เช่น `admins/{id}.lastSignatureURL`, `staff/{id}` self-sync)

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

- โค้ด JS ทุกไฟล์เป็น **global scope** (`var`, ไม่มี module system) — ระวังชื่อฟังก์ชัน/ตัวแปรชนกันข้ามไฟล์ **และภายในไฟล์เดียวกันด้วย** (เคยเกิดจริงใน `portfolio-admin.js`: มี `function setReviewStatus` ประกาศซ้ำ 2 จุดในไฟล์เดียวกันโดยไม่ได้ตั้งใจ ตัวที่ประกาศทีหลังทับตัวแรกเงียบๆ ไม่มี error เตือน) — ถ้าไฟล์ไหนยาวเกิน ~1000 บรรทัด ควร `grep -n "^function ชื่อนี้"` เช็คก่อนตั้งชื่อฟังก์ชันใหม่ทุกครั้ง
- Render HTML ด้วยการต่อ string (`'<div>' + ... + '</div>'`) ไม่ใช้ template engine — ใช้ `esc()` เมื่อแทรกค่าใน inline `onclick="fn('...')"` และ `esc2()` เมื่อแทรกเป็น HTML text เพื่อกัน XSS
- Date/เวลา: ใช้ `formatDate()` หรือ `fmtDate()` จาก `common.js` (มีอยู่ 2 ชื่อเพราะเดิมซ้ำกันหลายไฟล์ รวมมาไว้ที่เดียวแล้ว) — อย่าสร้างฟังก์ชัน format วันที่ใหม่ซ้ำ
- ปีการศึกษาไทยใช้ `getAcademicYear()` (พ.ค.–ต.ค. = เทอม 1, พ.ย.–เม.ย. = เทอม 2)
- สีธีม: ห้าม hardcode hex ใหม่ในหน้าเว็บ ให้ใช้ CSS variable (`var(--accent)` ฯลฯ) จาก `styles-new.css` — ผู้ดูแลระบบ (SuperAdmin) สามารถเปลี่ยนสีธีมได้จริงผ่าน `settings.html` ซึ่งจะ query `site_config/theme` แล้วเขียนทับ CSS variable ที่ `document.body` (**ไม่ใช่** `document.documentElement`) เพราะ `body.theme-staff`/`body.theme-blue` ใน CSS ชนะการ inherit จาก parent เสมอ — ดูคอมเมนต์ยาวใน `_setAccentVars()` ก่อนแก้จุดนี้
- Firestore บังคับ `experimentalForceLongPolling: true` เพราะเน็ตโรงเรียนบล็อก HTTP/2 streaming — **ห้ามลบ/ปิดค่านี้** แม้จะดูเหมือนไม่จำเป็นในเครื่อง dev
- มี in-app browser detection (LINE/FB/IG WebView) ที่ redirect/บล็อกออกไปเปิด browser จริง เพราะ Google Sign-In ใช้ใน WebView ไม่ได้ — logic นี้อยู่ซ้ำ 2 ที่ (`index.html` inline script และ `common.js` → `isInAppBrowser()`) ถ้าจะแก้ regex ต้องแก้ทั้งสองจุด
- `checkAdminAccess()` มี cache ผ่าน `localStorage` (`np_admin_access_cache_<email>`) เพื่อกันเมนูไม่ขึ้นตอนเน็ตช้า แล้วค่อย fetch จริงซ้ำ — ถ้า debug เรื่องเมนู admin ไม่ขึ้น/ขึ้นผิด ให้เคลียร์ localStorage ก่อน

## ปัญหาที่รู้อยู่แล้ว / ต้องระวัง

1. ~~**Tailwind CDN v2.2.19 (ปี 2021)** โหลดเต็มทุกหน้าโดยไม่ purge ซ้ำซ้อนกับ design token system ใน `styles-new.css`~~ — **แก้แล้ว** ดู Changelog ด้านล่าง (self-hosted + purge) แต่ยังพิจารณาตัดออกทั้งหมดได้ในอนาคต เพราะสแกนแล้วพบว่าโปรเจกต์แทบไม่ได้ใช้ Tailwind utility class เลยจริงๆ (ใช้ custom class จาก `styles-new.css` เป็นหลัก)
2. **ไฟล์ JS ใหญ่เกินไป**: `portfolio-admin.js` (3,240 บรรทัด), `ipad-lending.js`, `portfolio-teacher.js`, `profile.js`, `repair-admin.js` — ควรแตกเป็นโมดูลย่อยเมื่อมีโอกาส
3. **`js/page-name.js` ไม่ใช่หน้าเว็บจริง** เป็นแค่ template ตัวอย่าง อย่าแก้ไฟล์นี้คิดว่ามีผลกับหน้าใดหน้าหนึ่ง
4. Favicon/manifest icons อ้างอิง Firebase Storage URL ที่มี access token ฝังอยู่ — ถ้า token หมดอายุ/rule เปลี่ยน ไอคอนทั้งเว็บพังพร้อมกัน
5. อย่า commit `.DS_Store`, `__MACOSX/`, `node_modules/`, หรือไฟล์ secret (`serviceAccountKey.json`, `*.env`) — มีอยู่ใน `.gitignore` แล้วแต่ต้องเช็คซ้ำก่อน commit ทุกครั้ง

## แก้ไปแล้ว (Changelog)

- ✅ **Self-host + purge Tailwind CSS แทนโหลดเต็มจาก jsdelivr CDN** — เดิมทั้ง 15 ไฟล์ HTML โหลด `https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css` แบบเต็มไม่ purge ทุกหน้า ตอนนี้แก้เป็น:
  1. Build ด้วย Tailwind CLI v2.2.19 (ตรงเวอร์ชันเดิม กัน class เพี้ยน) โดยสแกน content จากทุก `.html` + `js/*.js` + `shared/*.js` (เพราะหน้าเว็บ render HTML ด้วยการต่อ string ใน JS) ได้ผลลัพธ์ purge แล้วที่ `shared/tailwind-built.css` (minified ~5.6 KB จากเดิมโหลดเต็มไฟล์)
  2. แก้ `<link>` ในทั้ง 15 ไฟล์ (`admin-role.html`, `foodcourt-admin.html`, `guide.html`, `index.html`, `ipad-lending.html`, `page-template.html`, `portfolio-admin.html`, `portfolio-teacher.html`, `profile.html`, `repair-admin.html`, `repair-user.html`, `room-admin.html`, `room-request.html`, `settings.html`, `staff.html`) ให้ชี้ไป `shared/tailwind-built.css` แทน — ลำดับโหลดยังคงเดิม (ก่อน `shared/styles-new.css` เสมอ)
  3. เก็บ config/วิธี rebuild ไว้ที่ `shared/tailwind-source/` (README + `tailwind.config.js` + `input.css`) — **ไม่มี build step อัตโนมัติ/ไม่มี CI ใหม่** ต้องรันเองตอน dev แล้ว commit ไฟล์ผลลัพธ์เข้า repo ตรงๆ ตาม convention เดิมของโปรเจกต์ (ดูวิธีใน README นั้น)
  4. **ข้อค้นพบสำคัญ**: สแกน class ที่ใช้จริงทั้งโปรเจกต์แล้วพบว่าแทบไม่มีการใช้ Tailwind utility class เลย (`class="..."` ที่ดูเหมือนใช่ส่วนใหญ่กลับเป็น custom class จาก `styles-new.css` เช่น `empty-block`, `kpi-grid` ที่บังเอิญมีคำว่า block/grid ปนอยู่) ไฟล์ purge แล้วจึงเหลือแค่ CSS reset พื้นฐาน (`modern-normalize`) เป็นหลัก — ถ้ามีเวลา ควรพิจารณาตัด Tailwind ออกทั้งหมดในอนาคต ความเสี่ยงต่ำกว่าที่คาดไว้เดิม

- ✅ **`functions/index.js` เพิ่ม export ฟังก์ชันแจ้งเตือนพอร์ตโฟลิโอ** — เดิม `onNewPortfolioSubmission`, `onPortfolioResubmitted`, `onPortfolioStatusChanged` ถูก export ไว้ผิดไฟล์ (`functions/functions-index.js` ซึ่งไม่ตรงกับ `main` ใน `package.json` เลยไม่เคย deploy จริง) ตอนนี้แก้ให้ `index.js` ตัวจริง `require("./portfolio-notifications")` และ export ทั้ง 3 ฟังก์ชันแล้ว — **ต้องลบ `functions/functions-index.js` ทิ้งด้วย** เพื่อไม่ให้สับสนอีกในอนาคต (ถ้ายังไม่ได้ลบ ให้ลบก่อน commit ครั้งถัดไป)

- ✅ **`portfolio-admin.js` แก้ชื่อฟังก์ชันชนกัน `setReviewStatus`** — เดิมมี `function setReviewStatus` ประกาศซ้ำ 2 ที่ในไฟล์เดียวกัน (ทั้งไฟล์เป็น global scope): ตัวแรก (~บรรทัด 417) เป็น filter ปุ่ม "สถานะการตรวจ" ในหน้า Overview, ตัวหลัง (~บรรทัด 1438) เป็นฟังก์ชันอนุมัติ/ตีกลับเอกสารในหน้ารายละเอียด เพราะ JS ให้ประกาศทีหลังทับตัวแรกเสมอ ผลคือกด filter แล้วดันไปรันฟังก์ชันอนุมัติแทน (เด้ง toast "กรุณาเขียนความคิดเห็นก่อนกดยืนยัน" ทั้งที่แค่กำลังกรองรายการ) → เปลี่ยนชื่อฟังก์ชัน filter เป็น `setReviewStatusFilter` (อัปเดตทั้ง `portfolio-admin.js` และ onclick ใน `portfolio-admin.html`) ฟังก์ชันอนุมัติเดิมไม่ต้องแตะ

- ✅ **`portfolio-admin.js`/`.html` เพิ่มฟีเจอร์ "ใช้ลายเซ็นนี้" (reuse ลายเซ็นผู้ตรวจ) + แก้บั๊กโชว์ลายเซ็นผิดคน** — เดิม modal ตรวจงานมีกล่อง "ลายเซ็นที่เซ็นไว้แล้ว" แต่ไปดึงลายเซ็นจาก field ของ**ขั้นตรวจก่อนหน้า** บนตัวเอกสาร (เช่นถ้า `curStatus` เป็น `head_reviewed` จะดึง `headSignatureURL` มาโชว์ ทั้งที่ควรเป็นลายเซ็นของผู้ตรวจขั้นถัดไปที่กำลังจะเซ็น) แก้แล้วให้:
  1. บันทึกลายเซ็นล่าสุดของผู้ตรวจแต่ละคน (ไม่ใช่ต่อเอกสาร) ไว้ที่ `admins/{email}.lastSignatureURL` ทุกครั้งที่เซ็นสำเร็จ (ทำใน `setReviewStatus()`)
  2. โหลดค่านี้มาเก็บใน global var `myAdminSignatureURL` ตอน `onAuth` (piggyback กับ query `admins/{email}` ที่มีอยู่แล้วสำหรับเช็ค permission)
  3. `fillSingleFileInfo()` โชว์ `myAdminSignatureURL` แทนของเดิม พร้อมปุ่ม **"ใช้ลายเซ็นนี้"** (`useMyExistingSignature()`) กดแล้วใช้ได้ทันทีไม่ต้องอัปโหลดซ้ำ — sig pad IIFE เพิ่มโหมด `'existing'` และ `uploadAdminSignatureToStorage()` จะข้ามการอัปโหลดถ้าค่าที่ได้เป็น URL (`http...`) อยู่แล้วแทนที่จะเป็น `data:` URL ใหม่จาก canvas/ไฟล์
  4. **ต้องอัปเดต `firestore.rules` คู่กันด้วย** — เดิม `admins/{id}` เขียนได้แค่ SuperAdmin เท่านั้น (`allow write: if isSuperAdmin();`) ทำให้ผู้ตรวจคนอื่นเซฟ `lastSignatureURL` ไม่ได้เลย (permission-denied เงียบๆ ใน `.catch()`) → เพิ่ม `allow create/update` แยกเฉพาะกรณีนี้ ล็อกให้แก้ได้แค่ doc ตัวเอง + field `lastSignatureURL` เท่านั้น ห้ามแตะ `permissions`

- ✅ **`portfolio-admin.js` แก้ด่านเข้าเว็บ (accessDenied) บล็อกผู้ตรวจขั้น 2/3/4 ผิด** — ด่านเข้าเว็บใน `onAuth` (บรรทัด ~3270) เดิมเช็คแค่ `p.portfolio` กับ `p.headOfGroup` แต่ระบบตรวจ 4 ขั้นจริง (`canIReviewStage()`) ใช้สิทธิ์คนละฟิลด์ (`p.assistantDirectorAcademic` / `p.deputyDirectorAcademic` / `p.director`) ทำให้ผู้ตรวจขั้น 2/3/4 ที่ตั้งสิทธิ์ผ่าน `admin-role.html` แต่ไม่ได้ติ๊ก `portfolio` ควบคู่ไปด้วย เข้าหน้า `portfolio-admin.html` ไม่ได้เลย (โดน accessDenied ทันที) → เพิ่มตัวแปร `hasReviewerStage` รวมสิทธิ์ทั้ง 3 ขั้นเข้าไปในเงื่อนไขด่านเข้าเว็บด้วย **หมายเหตุ:** ถ้าตั้งสิทธิ์ผู้ตรวจผ่าน `admin-role.html` ควรตรวจสอบว่า UI ของหน้านั้น mapping ฟิลด์ตรงกับที่ `portfolio-admin.js` ใช้จริงด้วย (`portfolio`, `headOfGroup`, `assistantDirectorAcademic`, `deputyDirectorAcademic`, `director` — คนละชุดกับ `permissions.bookings/repair/staff/foodcourt/ipad` ที่ใช้ในหน้าอื่น)

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
