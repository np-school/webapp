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
│   ├── styles-new.css       Design token system (CSS variables) + ทุก component style
│   ├── tailwind-built.css   Tailwind ที่ build+purge แล้ว (ไฟล์ที่ทุกหน้า `<link>` จริง)
│   └── tailwind-source/     Config/README สำหรับ rebuild tailwind-built.css (ไม่มี build step อัตโนมัติ)
├── functions/
│   ├── index.js             Entry point จริง (ตาม package.json "main") — export ครบทั้ง booking/repair/portfolio/drive-upload แล้ว
│   ├── notifications.js     Push notification triggers: booking + repair
│   ├── portfolio-notifications.js  Push notification triggers: portfolio (export จาก index.js แล้ว)
│   └── drive-upload.js      อัปโหลดรูปแจ้งซ่อมไป Google Drive
├── .github/workflows/deploy-functions.yml   CI: auto-deploy **เฉพาะ** onBookingStatusChanged + onNewBookingCreated
│                                            เมื่อ push เข้า main ที่แตะ functions/**, firebase.json, .firebaserc
│                                            (function อื่นทั้งหมด รวม repair/portfolio/drive-upload ยังต้อง deploy มือ — ดูหัวข้อ "คำสั่งที่ใช้บ่อย")
├── manifest.json / sw.js / firebase-messaging-sw.js   PWA + push notification service worker
└── firebase.json / .firebaserc                        Firebase CLI config (functions only)
```

> **`firestore.rules`** — **ไม่มีไฟล์นี้อยู่ใน repo ที่ track ด้วย git เลย** (เช็คแล้วไม่เคยมีใน git history ของ repo นี้มาก่อน) ทั้งที่โค้ดหลายจุด (เช่น `admins/{id}.lastSignatureURL`, `staff/{id}` self-sync ที่พูดถึงใน Changelog ด้านล่าง) พึ่งพา rule ที่ควรจะอยู่ในไฟล์นี้ — แปลว่า Firestore Security Rules ตัวจริงถูกจัดการแยกอยู่นอก repo นี้ (เช่นแก้ตรงผ่าน Firebase Console หรือเก็บใน repo/ที่เก็บอื่น) **ก่อนแก้โค้ดฝั่ง client ที่เขียนตรงเข้า Firestore field ใหม่ ต้องถามทีม/เช็ค Firebase Console ก่อนเสมอว่า rule อนุญาตหรือยัง** เพราะจะเจอ `permission-denied` เงียบๆ ตอน production โดยไม่มีไฟล์ในเครื่องให้ตรวจสอบล่วงหน้า

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
- **Accessibility**: `<img>` ทุกตัว (ทั้งใน `.html` และที่ render ผ่านการต่อ string ใน `.js`) ต้องมี `alt` เสมอ — ถ้าค่าที่ใส่มาจากข้อมูลผู้ใช้ (ชื่อครู/staff) ต้อง escape ด้วย `esc2()` ก่อนเสมอ (กัน XSS แบบเดียวกับตอนแทรก HTML text อื่นๆ), ไอคอนตกแต่ง (`<svg>` ที่มีข้อความข้างๆ สื่อความหมายซ้ำอยู่แล้ว เช่นโลโก้ Google/LINE ในปุ่ม, จุด timeline) ต้องมี `aria-hidden="true"`, ส่วนปุ่มที่มีแค่ไอคอน `data-lucide` ไม่มีข้อความเลย (เช่นปุ่มปิด modal, ปุ่มลบ, ปุ่มเปลี่ยนเดือน/ปี) ต้องมี `aria-label` ที่สื่อการกระทำเสมอ (`title` ก็นับว่าใช้ได้ถ้ามีอยู่แล้ว) — ดู pattern การใส่ label ตาม action ในการ์ดหัวข้อ Changelog ด้านล่าง

## ปัญหาที่รู้อยู่แล้ว / ต้องระวัง

### 🔲 ต้องทำต่อ (ยังไม่แก้)

1. **Hardcoded hex color ใน `js/*.js` (~1,375 จุด)** — มากสุดที่ `portfolio-admin.js` (~384) และ `profile.js` (~230) แก้ยากกว่าไฟล์ `.html` เพราะสีบางจุดขึ้นกับ status/state ของข้อมูล ต้องเช็ค context ทีละจุด (รายละเอียดใน Changelog)
2. **ไฟล์ JS ใหญ่เกินไป ควรแตกโมดูล**: `portfolio-admin.js` (~3,480 บรรทัด), `repair-admin.js` (~2,230), `ipad-lending.js` (~2,080), `portfolio-teacher.js` (~2,060), `profile.js` (~1,950)
3. **พิจารณาตัด Tailwind ออกทั้งหมด** — สแกนแล้วพบว่าโปรเจกต์แทบไม่ได้ใช้ Tailwind utility class เลย (ดู Changelog) ความเสี่ยงต่ำถ้าจะเอาออก

### ⚠️ ข้อควรระวัง (ไม่ใช่งานค้าง แค่รู้ไว้กันพลาด)

- `js/page-name.js` **ไม่ใช่หน้าเว็บจริง** เป็นแค่ template คู่กับ `page-template.html` อย่าแก้คิดว่ามีผลกับหน้าไหน
- Favicon/manifest icons อ้าง Firebase Storage URL ที่มี access token ฝังอยู่ — token หมดอายุ/rule เปลี่ยน = ไอคอนพังทั้งเว็บพร้อมกัน
- **`firestore.rules` ไม่อยู่ใน repo นี้** — ก่อนแก้โค้ดฝั่ง client ที่เขียน field ใหม่เข้า Firestore ต้องเช็คกับทีม/Firebase Console ก่อนเสมอ ไม่งั้นเจอ `permission-denied` เงียบๆ ตอน production
- **CI (`.github/workflows/deploy-functions.yml`) deploy อัตโนมัติแค่ 2 function** (`onBookingStatusChanged`, `onNewBookingCreated`) — function อื่น (repair/portfolio/drive-upload) ต้อง deploy มือเสมอ
- อย่า commit `.DS_Store`, `__MACOSX/`, `node_modules/`, หรือไฟล์ secret (`serviceAccountKey.json`, `*.env`) — มีอยู่ใน `.gitignore` แล้วแต่ต้องเช็คซ้ำก่อน commit ทุกครั้ง

## แก้ไปแล้ว (Changelog)

> สรุปสั้นๆ เรียงใหม่สุดก่อน — รายละเอียดเชิงลึก/ขั้นตอนแก้แบบเต็มดูได้จาก commit message หรือถามได้ถ้าต้องการบริบทเพิ่ม

- ✅ **Accessibility**: เพิ่ม `alt` ให้ `<img>` ทุกตัว (28 จุด), `aria-hidden` ให้ `<svg>` ตกแต่ง (12 จุด), `aria-label` ให้ปุ่มไอคอนล้วน (49 จุด) ทั่วโปรเจกต์ — convention ใหม่ดูหัวข้อ "Conventions ที่ต้องรู้ก่อนแก้โค้ด" → Accessibility
- ✅ **Hex color → CSS variable ใน inline style ของทุกไฟล์ `.html`**: แทนที่ไป 741/786 จุด + เพิ่ม token ใหม่ใน `styles-new.css` (ยกเว้นสี LINE brand ที่ตั้งใจไม่แตะ) — เหลือ hex hardcode ใน `js/*.js` อีก ~1,375 จุดเป็นงานค้าง (ดูหัวข้อด้านบน)
- ✅ **Self-host + purge Tailwind CSS** แทนโหลดเต็มจาก jsdelivr CDN — build ไว้ที่ `shared/tailwind-built.css`, source/วิธี rebuild อยู่ที่ `shared/tailwind-source/` (ไม่มี build step อัตโนมัติ ต้องรันเองแล้ว commit ผลลัพธ์)
- ✅ **`functions/index.js` export ฟังก์ชันแจ้งเตือนพอร์ตโฟลิโอที่หายไป** (`onNewPortfolioSubmission`, `onPortfolioResubmitted`, `onPortfolioStatusChanged`) — เดิม export ผิดไฟล์ที่ไม่ตรงกับ `main` ใน `package.json` เลยไม่เคย deploy จริง, ลบไฟล์เก่าทิ้งแล้ว
- ✅ **`portfolio-admin.js`**: แก้ฟังก์ชันชื่อชนกัน `setReviewStatus` (2 จุดในไฟล์เดียวกัน ตัวหลังทับตัวแรกเงียบๆ) → เปลี่ยนตัว filter เป็น `setReviewStatusFilter`
- ✅ **`portfolio-admin.js`/`.html`**: เพิ่มฟีเจอร์ "ใช้ลายเซ็นนี้" (reuse ลายเซ็นผู้ตรวจล่าสุดจาก `admins/{email}.lastSignatureURL`) + แก้บั๊กโชว์ลายเซ็นผิดคน (เดิมดึงจากขั้นตรวจก่อนหน้าแทนที่จะเป็นขั้นถัดไป) — ฟีเจอร์นี้ทำงานได้เพราะมี rule แยกใน `firestore.rules` ที่อนุญาตให้ผู้ตรวจ (ไม่ใช่แค่ SuperAdmin) เขียน field `lastSignatureURL` ของ doc ตัวเองได้ ถ้า rule นี้หายไปฟีเจอร์จะเงียบๆ ใช้ไม่ได้ (`permission-denied` ใน `.catch()`)
- ✅ **`portfolio-admin.js`**: แก้ด่านเข้าเว็บ (accessDenied) ที่บล็อกผู้ตรวจขั้น 2/3/4 ผิด — เดิมเช็คแค่ `p.portfolio`/`p.headOfGroup` ไม่ครอบคลุมสิทธิ์ `assistantDirectorAcademic`/`deputyDirectorAcademic`/`director` ที่ `canIReviewStage()` ใช้จริง

## คำสั่งที่ใช้บ่อย

```bash
# Deploy Cloud Functions เท่านั้น
firebase deploy --only functions

# Deploy เฉพาะ function เดียว
firebase deploy --only functions:onBookingStatusChanged

# ติดตั้ง dependencies ของ functions
cd functions && npm install
```

> **CI (`.github/workflows/deploy-functions.yml`) ทำงานอัตโนมัติแค่บางส่วน**: push เข้า main ที่แตะ `functions/**`/`firebase.json`/`.firebaserc` จะ trigger deploy อัตโนมัติ แต่ deploy แค่ 2 function เท่านั้น (`onBookingStatusChanged`, `onNewBookingCreated`) — function อื่นทั้งหมด (repair notifications, portfolio notifications, drive-upload) **ต้อง deploy มือด้วยคำสั่งด้านบนเสมอ** ไม่งั้นโค้ดที่แก้ใน `functions/notifications.js`/`functions/portfolio-notifications.js`/`functions/drive-upload.js` จะไม่ถูก deploy จริงทั้งที่ push ขึ้น main แล้ว

> โปรเจกต์นี้ไม่มี build step สำหรับ frontend (ไม่มี `npm run build`/bundler) — แก้ไฟล์ `.html`/`.js`/`.css` แล้ว push ขึ้น GitHub Pages ได้เลย
