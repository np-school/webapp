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

> **`firestore.rules`** — **[2026-07 อัปเดต] มีไฟล์นี้อยู่ใน repo แล้ว** (เดิมไม่เคยมีมาก่อน ดูรายละเอียดที่มาใน Changelog) พร้อม `firebase.json` ที่เพิ่ม block `firestore` ให้ deploy ได้ — **แต่ยังไม่ยืนยันว่า deploy จริงขึ้น production แล้วหรือยัง และยังไม่เทียบว่าตรงกับ rule ที่ใช้งานจริงบน Firebase Console หรือไม่** ดูรายละเอียด/สถานะล่าสุดที่หัวข้อ "🔴 ลำดับความสำคัญตอนนี้" ด้านล่าง — **ก่อนแก้โค้ดฝั่ง client ที่เขียนตรงเข้า Firestore field ใหม่ ต้องเช็ค Firebase Console ก่อนเสมอว่า rule ที่ deploy จริงอนุญาตหรือยัง** เพราะจะเจอ `permission-denied` เงียบๆ ตอน production

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

### 🔴 ลำดับความสำคัญตอนนี้ (Priority Now)

1. **ยืนยันสถานะ `firestore.rules` บน production** — ไฟล์เพิ่งถูกเพิ่มเข้า repo (ดู Changelog) พร้อม `firebase.json` block ที่รองรับ `firebase deploy --only firestore:rules` แล้ว แต่ **ยังไม่ยืนยันว่ามีคน deploy จริงหรือยัง** และยังไม่เทียบว่าตรงกับ rule ที่ใช้งานอยู่จริงบน Firebase Console หรือไม่ (rule ตัวจริงเดิมจัดการแยกนอก repo มาตลอด) — นี่คือ **ความเสี่ยงเชิง production สูงสุดตอนนี้**: ถ้า client เขียน field ใหม่เข้า Firestore (เช่น `admins/{id}.lastSignatureURL`, `staff/{id}` self-sync) โดยที่ rule จริงบน Console ยังไม่ตรงกับไฟล์ในเครื่อง จะเจอ `permission-denied` เงียบๆ ตอน production โดยไม่มี error ให้เห็นล่วงหน้าตอน dev
   - ขั้นตอนที่ต้องทำ: (1) เปิด Firebase Console → Firestore → Rules → เทียบเนื้อหากับ `firestore.rules` ในเครื่องทีละบรรทัด (2) ถ้าไม่ตรงกัน ตัดสินใจร่วมทีมว่าจะ deploy ไฟล์ในเครื่องทับ หรือดึงจาก Console มา sync ใส่ repo แทน (3) หลัง confirm ตรงกันแล้ว บันทึกวันที่ deploy จริงไว้ใน Changelog ด้านล่างเพื่อไม่ให้ค้างสถานะ "ยังไม่ยืนยัน" อีก
2. ✅ **[2026-07] เก็บงาน hex color → CSS variable ในไฟล์ `.js` ทั้ง 10 ไฟล์เสร็จแล้ว** (`portfolio-admin.js`, `room-request.js`, `staff.js`, `admin-role.js`, `settings.js`, `room-admin.js`, `repair-user.js`, `repair-admin.js`, `ipad-lending.js` (ไม่มี hex ค้างอยู่แล้วตั้งแต่แรก), `portfolio-teacher.js`) — เฉพาะจุดที่เป็น **สี status/type ที่มีความหมาย** (แสดงผลผ่าน inline style ธรรมดา) เท่านั้นที่แปลงเป็น `var(--c-*)`; จุดที่เป็น **สีเฉพาะ/decorative แบบ one-off ไม่มี token คู่ตรง** (เช่นสีประจำห้องประชุมใน `room-request.js`, สี avatar สุ่มบางสีใน `staff.js`/`admin-role.js`) **ตั้งใจไม่แตะ** ตามธรรมเนียมเดิมของโปรเจกต์ (ดู `styles-new.css` ที่ก็ hardcode ค่าเดียวกันแบบไม่ตั้ง token เช่นกัน) — รายละเอียดเหตุผลแต่ละไฟล์ดูใน Changelog ด้านล่าง
   - 🐛 **บั๊กที่เจอระหว่างทาง (แก้แล้ว)**: `repair-user.js`/`repair-admin.js` มี field `hex` (ใน `CATEGORY_PALETTE`), array `pool` (ใน `randomCatColor()`) และ `PRINT_BADGE_COLORS` ที่ถูกงานแปลงสีรอบก่อนเผลอเปลี่ยนบางค่าเป็น `var(--...)` ทั้งที่ 3 จุดนี้ **ใช้ไม่ได้กับ `var()`**: `hex`/`pool` ถูกส่งเข้า `<input type="color" value="...">` ตรงๆ และเข้าฟังก์ชัน `hexToRgba()` ที่ทำ `parseInt(hex, 16)` (parse ค่า `var(--...)` ไม่ได้ กลายเป็นสีเทา/ดำเงียบๆ), ส่วน `PRINT_BADGE_COLORS` ใช้เฉพาะใน `openPrintWindow()` ที่เปิดหน้าต่างพิมพ์เป็นเอกสาร HTML แยกต่างหาก (`window.open`) **ไม่ได้ `<link>` โยง `shared/styles-new.css`** เลย ทำให้ `var()` ทุกตัวใน context นั้นไม่ resolve — แก้กลับเป็น literal hex ครบแล้วทั้ง 3 จุด
   - ⚠️ **ยังไม่ได้แก้ (นอก scope งานสีรอบนี้)**: ฟังก์ชัน `openPrintWindow()` ใน `repair-admin.js` (บรรทัด ~2116 เป็นต้นไป) มี `var(--text)`, `var(--blue-light-3)`, `var(--gray-light)`, `var(--indigo-5)`, `var(--bg-alt)`, `var(--text2)` ฯลฯ อยู่ใน `<style>` ของเอกสารพิมพ์แยกอีกจำนวนมาก ซึ่ง **ทั้งหมดไม่ resolve เช่นกัน** เพราะเหตุผลเดียวกัน (ไม่มี `:root` ให้อ้างอิงในหน้าต่างนั้น) — ควรรีวิวทั้งฟังก์ชันแยกเป็นงานถัดไป (ทางเลือก: แปลงเป็น literal hex ทั้งหมดเหมือนที่แก้ `PRINT_BADGE_COLORS`ไปแล้ว หรือฝัง `<link>`/inline `:root` block เข้าไปในเอกสารพิมพ์แทน)

### 🔲 ต้องทำต่อ (ยังไม่แก้)

1. **Hardcoded hex color ใน `js/*.js`** — งานกำลังทำอยู่ (ดู Changelog): แก้แล้ว `index.js`, `profile.js`, `foodcourt-admin.js` (รวม `shared/common.js` → `showToast()`) เปลี่ยนไปใช้ `--chart-N`/`--status-*` token กลางที่เพิ่มใน `styles-new.css` แล้ว — ยังเหลือ `portfolio-admin.js` (~52 จุด), `room-request.js`, `portfolio-teacher.js`, `repair-admin.js`, `staff.js`, `admin-role.js`, `settings.js`, `room-admin.js`, `repair-user.js`, `ipad-lending.js` แก้ยากกว่าไฟล์ `.html` เพราะสีบางจุดขึ้นกับ status/state ของข้อมูล และบางจุดต่อ string เป็น hex+alpha (`hex+'15'`) ที่ใช้ `var()` แทนไม่ได้ ต้องเช็ค context ทีละจุด
2. **ไฟล์ JS ใหญ่เกินไป ควรแตกโมดูล**: `portfolio-admin.js` (~3,480 บรรทัด), `repair-admin.js` (~2,230), `ipad-lending.js` (~2,080), `portfolio-teacher.js` (~2,060), `profile.js` (~1,950)
3. **พิจารณาตัด Tailwind ออกทั้งหมด** — สแกนแล้วพบว่าโปรเจกต์แทบไม่ได้ใช้ Tailwind utility class เลย (ดู Changelog) ความเสี่ยงต่ำถ้าจะเอาออก
4. **รวม token สี `styles-new.css` ให้เป็นชุดเดียว (unify color system)** — เริ่มทำแล้ว ดูสถานะย่อยด้านล่าง:
   - [x] `--blue` / `--blue-dark` / `--blue-light` ใน `:root` default (theme-blue) alias ไปที่ `--accent` / `--accent-dark` / `--accent-tint` แล้ว — เดิม hardcode แยกขาด ทำให้จุดที่อ้าง `var(--blue)` ไม่ตามสีธีมที่แอดมินตั้งจาก `site_config/theme` (บั๊กจริง ตามที่ `.navbar.blue`/`.navbar.dark` ทำถูกอยู่แล้วแต่จุดอื่นไม่ตาม) ค่า default ไม่เปลี่ยน
   - [x] `styles-new.css` — แทนที่ hex ที่ซ้ำกับ token เดิมเป๊ะ 55 จุด (นอก `:root`/`body.theme-staff`) ด้วย `var(--token)`
   - [x] เพิ่ม `--line-green` / `--line-green-dark` (สี LINE brand `#06C755` เดิม hardcode กระจาย ไม่มี token)
   - [x] `index.html` — แทนที่ `#06C755` ด้วย `var(--line-green)` 12 จุด
   - [x] Quick win: แทนที่ hex inline ที่ตรงกับ token เดิม (ไม่รวม `--accent`/`--blue`/`--purple`/`--navbar-*` เพื่อไม่ให้เผลอผูกกับธีมไดนามิกโดยไม่ตั้งใจ) — รวม 307 จุด ใน `index.html`, `profile.html`, `portfolio-admin.html`, `guide.html`, `settings.html`, `portfolio-teacher.html`, `ipad-lending.html`, `staff.html`
   - [x] `--matrix-*` (18 ตัว, ตาราง Permissions) ค่าเหมือน `--role-*-color` เป๊ะ แต่ประกาศแยก → เปลี่ยนเป็น `var(--role-*-color)` ทั้งหมด (3 ตัวที่ไม่มี role คู่ตรงชี้ไปที่ token ฐานแทน: `--matrix-foodcourt-color`→`--sky`, `--matrix-admin-color`→`--role-super-color`, `--matrix-action-color`→`--text2`)
   - [ ] `--blue-mid` (`#bfdbfe`) และ `--blue-ring` ยังไม่ได้ผูกกับ `--accent` เพราะไม่มีค่าคู่ตรงกันเป๊ะ (`--accent-light`/`--accent-mid` ค่าต่างกัน) ต้องตัดสินใจว่าจะคำนวณ shade ใหม่จาก `--accent` (กระทบสี default เล็กน้อย) หรือปล่อยคงที่
   - [ ] เปลี่ยนชื่อ `--purple-*` (สื่อผิด จริงคือ navy/ink ไม่ใช่ม่วง) — ยังไม่ rename เพราะมี ~208 จุดอ้างอิงทั่วโปรเจกต์ ต้องเช็ค `common.js`/`buildNavbar` ก่อนว่าไม่มีที่ไหนอ้างชื่อ string ตรงๆ
   - [ ] inline hex ใน `.html` ที่ยังไม่มี token คู่ (สีเฉพาะโมดูล เช่น portfolio=เขียว/ม่วง, foodcourt=ส้ม) ต้องรีวิวทีละหน้าก่อนตั้ง token ใหม่:
     - [x] `portfolio-admin.html` — เจอระบบสีตามขั้นตอนตรวจพอร์ตโฟลิโอ (submitted/head/assistant/deputy/final) กระจาย hardcode ใน `<style>` ของไฟล์ → เพิ่ม token ใหม่ 12 ตัวใน `styles-new.css` (`--green-pale`, `--green-dark`, `--red-pale`, `--sky-bright/-pale/-mist`, `--violet-bright/-pale/-dark`, `--emerald-dark`, `--yellow-pale/-dark`) แล้วแทนที่ครบ **ยกเว้น** สี swatch ใน color-picker เลือกสีประเภทเอกสาร (`selectDtColor`) ที่ตั้งใจไม่แตะ เพราะเป็นค่าที่บันทึกลง Firestore จริง ไม่ใช่สีตกแต่ง (เหลือ `#fafbff` 1 จุด decorative เล็กน้อยเกินกว่าจะตั้ง token)
     - [x] `profile.html` — เพิ่ม token violet-family เพิ่มเติม (`--violet-vivid/-tint/-soft/-hover`) + `--cyan-light` แล้วแทนที่ครบ (เหลือ `#1e3a8a`, `#f8fbff` 2 จุด decorative one-off ไม่คุ้มตั้ง token)
     - [ ] `index.html` (22), `guide.html` (15), `portfolio-teacher.html` (13), `settings.html` (13), `staff.html` (4), `room-request.html` (3), `foodcourt-admin.html` (1)


### ⚠️ ข้อควรระวัง (ไม่ใช่งานค้าง แค่รู้ไว้กันพลาด)

- `js/page-name.js` **ไม่ใช่หน้าเว็บจริง** เป็นแค่ template คู่กับ `page-template.html` อย่าแก้คิดว่ามีผลกับหน้าไหน
- Favicon/manifest icons อ้าง Firebase Storage URL ที่มี access token ฝังอยู่ — token หมดอายุ/rule เปลี่ยน = ไอคอนพังทั้งเว็บพร้อมกัน
- **`firestore.rules` เพิ่งถูกเพิ่มเข้า repo แล้ว** (ก่อนหน้านี้ไม่มีไฟล์นี้อยู่เลย) พร้อม `firebase.json` ที่เพิ่ม block `firestore.rules` — **ยังไม่ได้ยืนยันว่า deploy จริงหรือยัง** ก่อนแก้โค้ดฝั่ง client ที่เขียน field ใหม่เข้า Firestore ควรเช็คให้แน่ใจก่อนว่า deploy แล้วและตรงกับที่ใช้งานจริงบน Console ไม่งั้นเจอ `permission-denied` เงียบๆ ตอน production
- **CI (`.github/workflows/deploy-functions.yml`) deploy อัตโนมัติแค่ 2 function** (`onBookingStatusChanged`, `onNewBookingCreated`) — function อื่น (repair/portfolio/drive-upload) ต้อง deploy มือเสมอ
- อย่า commit `.DS_Store`, `__MACOSX/`, `node_modules/`, หรือไฟล์ secret (`serviceAccountKey.json`, `*.env`) — มีอยู่ใน `.gitignore` แล้วแต่ต้องเช็คซ้ำก่อน commit ทุกครั้ง

## แก้ไปแล้ว (Changelog)

> สรุปสั้นๆ เรียงใหม่สุดก่อน — รายละเอียดเชิงลึก/ขั้นตอนแก้แบบเต็มดูได้จาก commit message หรือถามได้ถ้าต้องการบริบทเพิ่ม

- ✅ **`styles-new.css` — รวม token สี (ต่อยอดจากงาน "สีทั้งเว็บ" ด้านล่าง)**: alias `--blue`/`--blue-dark`/`--blue-light` ให้ชี้ไปที่ `--accent`* ใน default `:root` (แก้บั๊กจุดที่อ้าง `var(--blue)` ไม่ตามสีธีมที่แอดมินตั้ง), แทนที่ hex ซ้ำกับ token เดิม 55 จุดในไฟล์นี้, เพิ่ม `--line-green`/`--line-green-dark`, และรวม `--matrix-*` (18 ตัว) ให้ชี้ไปที่ `var(--role-*-color)` แทนการ hardcode ซ้ำ (ดูรายละเอียด/ของค้างในหัวข้อ "ต้องทำต่อ" ข้อ 4)
- ✅ **`index.html`, `profile.html`, `portfolio-admin.html`, `guide.html`, `settings.html`, `portfolio-teacher.html`, `ipad-lending.html`, `staff.html`**: แทนที่ hex inline ที่ตรงกับ token เดิม 307 จุด (ไม่แตะ hex ที่ตรงกับ `--accent`/`--blue`/`--purple`/`--navbar-*` เพื่อไม่ให้เผลอผูกกับธีมไดนามิกโดยไม่ตั้งใจ)
- ✅ **`firestore.rules` + `firebase.json`**: เพิ่มไฟล์ `firestore.rules` เข้า repo เป็นครั้งแรก (เดิมไม่มีไฟล์นี้อยู่เลย จัดการแยกนอก repo) พร้อมเพิ่ม block `firestore` ใน `firebase.json` ให้ `firebase deploy --only firestore:rules` ใช้ได้ — **ยังไม่ยืนยันว่า deploy จริงแล้วหรือยัง** ต้องเทียบกับกฎที่ใช้งานอยู่บน Console ก่อน deploy เสมอ
- ✅ **สีทั้งเว็บ — เริ่มงานรวมชุดสีให้เป็นโทนเดียวกัน** (ผู้ใช้แจ้งว่าแต่ละหน้า/กราฟสีไม่เข้ากัน) กำลังทำอยู่ ทำไปแล้ว:
  - **`shared/styles-new.css`**: เจอบั๊ก — เคยมีบล็อก "Auto-added tokens" 72 ตัวที่ประกาศ `--green`/`--blue`/`--amber`/`--violet` ซ้ำชื่อกับ token ที่ตั้งใจออกแบบไว้ด้านบน ด้วยค่าคนละตัว (CSS ใช้ค่าที่ประกาศทีหลังสุดเสมอ ทำให้ token ตัวจริงถูกทับเงียบๆ) → ลบบล็อกนี้ทิ้งทั้งหมด แล้วเพิ่ม **Chart Palette** (`--chart-1` ถึง `--chart-9`) กับ **Status Palette** (`--status-success/warning/danger/info/neutral` + `-bg`) ที่อ้างอิง token เดิม ให้ทุกกราฟ/badge ในเว็บดึงจากชุดเดียวกัน
  - **`js/index.js`**: ย้าย `REPAIR_STATUS_META`, `STATUS_BG/COLOR/DOT` (mini progress portfolio), `PF_DOC_TYPES` ไปใช้ token กลาง + แก้บั๊ก `ANN_CLR` ของประกาศสาธารณะกับประกาศบนแดชบอร์ดใช้เฉดสีคนละชุดสำหรับ type เดียวกัน (ตอนนี้ใช้ token เดียวกันทั้งคู่)
  - **`js/profile.js`**: เจอชุดสีประเภทเอกสาร (9 สี) hardcode ซ้ำกัน **3 จุด** ในไฟล์/โปรเจกต์ (`DOCUMENT_TYPES`, `_sarDocTypes` ในไฟล์นี้ + `PF_DOC_TYPES` ใน `index.js`) → รวมเป็น `--chart-N` ชุดเดียว, แก้บั๊ก `STATUS_COLOR`/`STATUS_BG` ของ workflow ตรวจ portfolio ที่มี 2 บล็อกในไฟล์เดียวกันให้สี `revision` ไม่ตรงกัน (จุดหนึ่งแดง อีกจุดเหลือง) ให้ใช้ token เดียวกัน, รวม timeline color array ที่ซ้ำกัน 2 จุด
  - **`js/foodcourt-admin.js` + `shared/common.js`**: แก้บั๊กจริง — `showToast(msg, type)` ใน `common.js` เช็คแค่ `type === 'error'`/`'warn'` แต่ `foodcourt-admin.js` ส่ง hex ตรงๆ (`'#dc2626'`/`'#16a34a'`) เข้าไปแทน ทำให้ไม่ตรงเงื่อนไขไหนเลย **toast แจ้งเตือน error ทุกอันเลยตกไปแสดงเป็นสีเขียว (สำเร็จ) ผิดความหมาย** → เปลี่ยนไปส่ง `'error'` ตรงๆ และแก้ `common.js`/กราฟ Food Court (`colors` array) ให้ใช้ `--chart-N`/`--status-*`
  - ✅ **[2026-07] แก้ครบแล้ว**: `portfolio-admin.js`, `room-request.js`, `portfolio-teacher.js`, `repair-admin.js`, `staff.js`, `admin-role.js`, `settings.js`, `room-admin.js`, `repair-user.js`, `ipad-lending.js` — ดูรายละเอียด/บั๊กที่เจอระหว่างทางในหัวข้อ "🔴 ลำดับความสำคัญตอนนี้" ข้อ 2 ด้านบน
- ✅ **Accessibility**: เพิ่ม `alt` ให้ `<img>` ทุกตัว (28 จุด), `aria-hidden` ให้ `<svg>` ตกแต่ง (12 จุด), `aria-label` ให้ปุ่มไอคอนล้วน (49 จุด) ทั่วโปรเจกต์ — convention ใหม่ดูหัวข้อ "Conventions ที่ต้องรู้ก่อนแก้โค้ด" → Accessibility
- ✅ **Hex color → CSS variable ใน inline style ของทุกไฟล์ `.html`**: แทนที่ไป 741/786 จุด + เพิ่ม token ใหม่ใน `styles-new.css` (ยกเว้นสี LINE brand ที่ตั้งใจไม่แตะ) — ส่วน `js/*.js` ดูหัวข้อ "สีทั้งเว็บ" ด้านบน (กำลังทำอยู่)
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
