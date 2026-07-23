# บันทึกความก้าวหน้า: รวมสีทั้งเว็บให้เหลือไม่เกิน 12 สี

> ต่อเนื่องจากงาน "สีทั้งเว็บ" ใน `CLAUDE.md` — เริ่ม 2026-07-23
> ไม่นับโทนเทา/ข้อความ/เส้นขอบ (grayscale) และไม่นับชุดสีธีม (`--accent`/`--navbar-*`/`--blue`/`--purple` ที่ตั้งค่าได้จาก `settings.html`)

## ผลลัพธ์: เหลือ 6 สี (จากเดิม 11 กลุ่มโทนสี)

| สี | Hex (base) | ใช้กับ |
|---|---|---|
| 🟢 Green | `#16a34a` | success / อนุมัติ / งบประมาณ / วิชาการ |
| 🔴 Red | `#dc2626` | danger / ปฏิเสธ / error |
| 🟠 Amber | `#d97706` | warning / หัวหน้ากลุ่มสาระ / ผอ. (เข้มขึ้น) — รวม orange+yellow แล้ว |
| 🔵 Sky | `#0284c7` | info / ทั่วไป / ผู้ช่วย ผอ. — รวม cyan+blue-accent แล้ว |
| 🟣 Violet | `#7c3aed` | accent พิเศษ / รอง ผอ. ทุกฝ่าย |
| ⚫ Ink | `#1b263b` | SuperAdmin / role สูงสุด |

แต่ละสีมี 5 เฉดมาตรฐาน: `-pale` (bg อ่อนสุด) / `-tint` (bg รอง) / `-mid` (เส้นขอบ) / base / `-deep` (ตัวหนังสือเข้ม)
ตัวแปรใหม่อยู่ใน `shared/styles-new.css` ชื่อ `--c-{สี}-{เฉด}` เช่น `--c-green-pale`, `--c-sky-deep`

## สิ่งที่ทำไปแล้ว

### 1. `shared/styles-new.css`
- เพิ่มบล็อก **Core Content Palette** (30 tokens: 6 สี × 5 เฉด) เป็นแหล่งความจริงเดียว
- **Alias ทุก token สีเดิมให้ชี้มาที่ core palette** (ไม่ลบชื่อ token เดิม โค้ดหน้าอื่นที่อ้าง `var(--emerald))`, `var(--cyan)`, `var(--orange)`, `var(--yellow)`, `var(--blue-accent)`, `var(--violet-bright)` ฯลฯ ยังใช้ได้ปกติ แต่ค่าจริงรวมเป็นสีเดียวกันแล้ว):
  - `emerald` → green, `cyan`/`blue-accent`/`blue-bright`/`sky-bright` → sky, `orange`/`yellow` → amber, `violet-bright`/`violet-vivid`/`violet-hover` → violet/violet-mid
- **รวม Role Colors (17 บทบาท) จาก ~40 hex อิสระ เหลือ 6 hue เดียวกัน** — ใช้หลัก "hue = ระดับชั้น": ผู้ช่วย ผอ. ทุกฝ่าย = sky, รอง ผอ. ทุกฝ่าย = violet, SuperAdmin = ink, ผอ. = amber เข้ม ส่วนหัวหน้ากลุ่ม/ฝ่ายต่างๆ กระจาย green/sky/amber ตามเดิม
- แก้ **chart palette** (`--chart-1..9`): เดิม `chart-7/8/9` (emerald/orange/cyan) กลายเป็นสีซ้ำกับ `chart-2/3/6` เงียบๆ หลังรวมสี → เปลี่ยน `chart-7` เป็น ink แทน กันไม่ให้กราฟที่ใช้ครบ 7-9 สีมีสีซ้ำในชุดเดียวกัน
- ลบ `--red-bright` ที่ประกาศซ้ำ 2 จุดในไฟล์เดิม (ตัวหลังทับตัวแรกเงียบๆ แบบเดียวกับบั๊ก `setReviewStatus` ที่เคยเจอ)

### 2. แทนที่ hex hardcode ในไฟล์ `.js`/`.html` ด้วย `var(--c-*)` (mechanical, exact-match เท่านั้น)
รันสคริปต์แทนที่ hex ที่ตรงกับ family ที่ต้องรวม (emerald/cyan/orange/yellow/blue-accent + สีสถานะที่ใช้ค่าเดียวกันซ้ำในหลายไฟล์) ทั่วโปรเจกต์ ครอบคลุมไฟล์ที่ค้างอยู่ใน `CLAUDE.md` ครบทุกไฟล์:

| ไฟล์ | จุดที่แก้ |
|---|---|
| `js/portfolio-admin.js` | 109 |
| `js/index.js` | 9 |
| `js/portfolio-teacher.js` | 21 |
| `js/room-request.js` | 9 |
| `js/repair-admin.js` | 12 |
| `js/repair-user.js` | 5 |
| `js/room-admin.js` | 11 |
| `js/admin-role.js` | 8 |
| `js/settings.js` | 4 |
| `js/staff.js` | 4 |
| `js/ipad-lending.js` | 5 |
| `js/profile.js` | 1 (+ แก้ collision สีซ้ำใน timeline array 2 จุด) |
| `guide.html`, `index.html`, `portfolio-admin.html`, `portfolio-teacher.html`, `profile.html`, `settings.html`, `staff.html` | 3–18 ต่อไฟล์ |

ตรวจ syntax ทุกไฟล์ `.js` ด้วย `node --check` ผ่านหมดแล้ว (ไม่มีไฟล์พัง)

**แก้บั๊กสีซ้ำที่พบระหว่างทำ**: `js/profile.js` มี array สี timeline dot 7 สี ที่หลังรวมสีแล้ว `--chart-8` (amber) ชนกับ `--chart-3` (amber) ในชุดเดียวกัน → เปลี่ยนไปใช้ `--chart-7` (ink) แทนเพื่อให้ยังแยกสีได้ครบ 7 จุด

## ยังไม่ได้ทำ / ต้องรีวิวเพิ่ม

1. **`shared/common.js` (96 hex), `js/index.js` (68 เหลือ), `js/room-request.js` (54 เหลือ)** — ส่วนใหญ่คือชุดสีตกแต่งรายห้อง/รายประเภท (เช่น สีห้องประชุมแต่ละห้อง) ที่ไม่ใช่สีสถานะ/role โดยตรง ต้องรีวิวทีละชุดว่าอันไหนควร map เข้า 6 สี core อันไหนเป็น decorative เฉพาะจุดจริงๆ (คล้ายกรณี color-swatch เลือกสีเอกสารที่ตั้งใจไม่แตะ)
2. **`js/portfolio-admin.js` ยังเหลือ hex 70 จุด, `index.html` 20 จุด, `settings.html`/`portfolio-admin.html` ~10 จุด** — ส่วนที่เหลือหลัง pass แรกนี้ ส่วนใหญ่เป็น rgba()/สี neutral/สีที่ไม่ตรง exact match กับ dictionary ที่ใช้ ต้องแกะรายจุดต่อ
3. **จุดที่ตั้งใจไม่แตะ**: `DEPT_COLORS.academic:'#1d4ed8'` ใน `portfolio-admin.js` ตรงกับค่า default ของ `--accent` (สีธีม) พอดี เว้นไว้ไม่แตะเพราะกำกวมกับสีธีม, color-swatch เลือกสีประเภทเอกสาร (`selectDtColor`) เว้นไว้เหมือนเดิมเพราะบันทึกลง Firestore จริง
4. **Role colors ที่รวมแล้ว (`--role-*`) ยังไม่ได้ตรวจด้วยตาจริงบนเว็บ** — เปลี่ยน hue ของบางบทบาท (เช่น general/hr จาก blue → sky, dep-budget/dep-general/dep-personnel จาก navy เข้ม → violet-deep) แนะนำเปิด `admin-role.html` เช็ค contrast/ความชัดเจนจริงก่อน deploy

## อัปเดต: รีวิวข้อ 1 แล้ว (`common.js` / `index.js` / `room-request.js`) — 2026-07-23

**สรุป**: เช็ค hex ที่เหลือทั้งหมดในไฟล์เหล่านี้แล้ว เกือบทั้งหมดคือ `ROOM_PASTEL_MAP` / `ROOM_PASTEL_FB` (ชุดสีพาสเทลแยกตามห้อง/สถานที่ ~10 hue) ซ้ำกัน 3 ที่ (common.js, index.js, room-request.js) — **ตัดสินใจว่าเป็น decorative จริง ไม่ merge เข้า 6 สี core** เพราะมีหน้าที่แยกแยะ "ห้อง" ให้ต่างกันชัดเจน คล้ายเคส `selectDtColor` ที่เว้นไว้ก่อนหน้านี้ (แต่ accent ของแต่ละห้องบางอันก็ alias ไปที่ `--c-*` อยู่แล้วบางส่วน)

**แก้จริง**: hex สีเทากลาง `#94a3b8` (ตรงกับ `--text3` เป๊ะ) พบซ้ำ 10 จุดใน 3 ไฟล์ → แทนด้วย `var(--text3)` แล้ว (เช็ค `node --check` ผ่านทั้ง 3 ไฟล์)
- เหลือ `#94a3b822` (2 จุด, index.js:797 / room-request.js:581) ไว้ตามเดิม เพราะเป็น string concat ต่อท้าย alpha hex ใช้ `var()` ตรงๆ ไม่ได้

**ยังไม่แตะ (ตั้งใจ)**: ชุดสี `ROOM_PASTEL_MAP/FB` ทั้งหมด (decorative), `#06C755` ใน index.js (สีแบรนด์ LINE)

## อัปเดต: รีวิวข้อ 2 แล้ว (`portfolio-admin.js` / `index.html`) — 2026-07-23

**แก้จริง (exact-match กับ token ที่มีอยู่แล้ว)**:
- `portfolio-admin.js`: 19 ค่า hex → แทนด้วย token เดิม เช่น `#e0f2fe`→`var(--sky-light)`, `#e2e8f0`→`var(--border)`, `#f0fdf4`→`var(--c-green-pale)`, `#7dd3fc`→`var(--c-sky-mid)`, `#64748b`→`var(--text2)`, `#94a3b8`→`var(--text3)`, `#fcd34d`→`var(--c-amber-mid)`, `#f8fafc`→`var(--bg)`, `#f5f3ff`→`var(--c-violet-pale)`, `#86efac`→`var(--c-green-mid)`, `#fde68a`→`var(--c-amber-tint)`, `#f1f5f9`→`var(--bg-alt)` ฯลฯ (`node --check` ผ่าน)
- `index.html`: `#f87171`→`var(--c-red-mid)`, `#bbf7d0`→`var(--c-green-tint)`

**พบบั๊ก/ความไม่สม่ำเสมอที่ควรรีวิวต่อ (ไม่ใช่ exact-match เลยยังไม่แตะ)**: ใน `portfolio-admin.js` มีแผนที่สถานะ (`STATUS_BG`/`cBg`/`cBorder`/`chipColor`) 4 ชุดที่ทำหน้าที่เดียวกัน (none/submitted/head_reviewed/assistant_reviewed/deputy_reviewed/final_approved/revision) แต่ใช้เฉดสีไม่ตรงกันเอง เช่น:
  - `final_approved` bg ใช้ `#d1fae5` (ไม่ตรง core), border บางที่ใช้ `#6ee7b7` บางที่ใช้ `--c-green-mid`
  - `revision` border ใช้ `#fde68a`(→amber-tint แล้ว) ในชุดหนึ่ง แต่ใช้ `#fca5a5` ในอีกชุด (คนละสีกันเลย)
  - `#78350f` (adminNote สีน้ำตาลเข้ม) ใกล้เคียงแต่ไม่ตรง `--c-amber-deep`
  → ต้องตัดสินใจเชิงความหมายว่าใช้เฉดไหนเป็นมาตรฐาน ไม่ใช่แค่แทนที่กลไก แนะนำรีวิวแยกเป็นงานถัดไป

**เหลือเป็น decorative ตั้งใจไม่แตะ**: `#ec4899`/`#6366f1`/`#cffafe` (สีแท็บ/badge เฉพาะจุด), `rgba(255,255,255,.9)`, `rgba(239,68,68,.15)`, และ `#1d4ed8` ใน `DEPT_COLORS.academic` (ตามที่บันทึกไว้เดิมว่ากำกวมกับสีธีม) — ใน `index.html` เช่นกัน: `#166534`/`#1e3a8a`/`#fdba74`/`#fbbf24`/`#34d399`/`#a78bfa`/`#4285F4`/`#ede9fe` ไม่ตรง token ใดเป๊ะ เก็บไว้รีวิวทีหลัง

## อัปเดต: ไล่สีเฉพาะ "กราฟ" (pie/donut/bar/hbar) ทุกหน้า — 2026-07-23 (รอบถัดไป)

โฟกัสเฉพาะสีที่ใช้ในกราฟ (ไม่ใช่ badge/สีตกแต่งทั่วไป) เพราะกราฟหลายหน้าเรนเดอร์บน `<canvas>` (Chart.js) ซึ่ง **`var(--x)` ใช้ตรงๆ ไม่ได้** (fillStyle ของ canvas ไม่รู้จัก CSS var เงียบๆ fallback เป็นสีดำ) เลยเป็นจุดที่มักหลุด hardcode กลับมาแม้ไฟล์นั้นจะมี `cssVar()` helper อยู่แล้ว:

- **`js/foodcourt-admin.js`**: กราฟแท่งรายรับ/รายจ่าย (`renderBarChart` + จุดเดียวกันในรายงานสัปดาห์/เดือน/ปี รวม 6 จุด) และพื้นที่ fill ของกราฟเส้น "สุทธิ" (3 จุด) hardcode เป็น `rgba(22,163,74,.75)` / `rgba(220,38,38,.65)` / `rgba(29,78,216,.08)` ทั้งที่ตรงกับ `--c-green`/`--c-red`/`--accent` เป๊ะ และไฟล์นี้มี `cssVar()` อยู่แล้ว (โดนัทร้านค้าใช้ `cssVar` ผ่าน `--chart-1..9` ถูกต้องอยู่แล้ว จุดนี้เลยดูไม่เข้าธีมเมื่อเทียบกับกราฟโดนัทข้างๆ) → เพิ่มฟังก์ชัน `hexToRgba()` ในไฟล์นี้ (pattern เดียวกับที่มีอยู่แล้วใน `repair-admin.js`) แล้วเปลี่ยนทุกจุดเป็น `hexToRgba(cssVar('--c-green'),.75)` ฯลฯ ผลคือกราฟรายรับ/รายจ่าย/สุทธิ จะย้อมสีเดียวกับกราฟโดนัทและตามธีม accent ที่ตั้งค่าไว้แล้ว
- **`js/ipad-lending.js`**: กราฟแท่ง "อุปกรณ์เสริม" ส่วน "คงเหลือ" hardcode `#e2e8f0` (ตรงกับ `--border` เป๊ะ) → เปลี่ยนเป็น `cssVar('--border')`
- **`js/repair-admin.js` + `js/repair-user.js`** (`CATEGORY_PALETTE` ที่ใช้กับกราฟโดนัท/hbar หมวดหมู่แจ้งซ่อม ต้อง sync กันสองไฟล์): เฉดสี sky (entry ที่ 5) ฟิลด์ `text` hardcode `'#075985'` ทั้งที่ 5 entry ที่เหลือใช้ `var(--*)` หมด และค่านี้ตรงกับ `--c-sky-deep` เป๊ะ → เปลี่ยนเป็น `var(--c-sky-deep)` (ฟิลด์ `hex` ของทุก entry ต้องคงเป็น literal hex ต่อไป เพราะใช้เป็นค่า `<input type="color">` ซึ่งรับ `var()` ไม่ได้)
- ตรวจ `node --check` ผ่านทั้ง 4 ไฟล์ที่แก้ (`foodcourt-admin.js`, `ipad-lending.js`, `repair-admin.js`, `repair-user.js`)

**ยังไม่ได้แตะ (นอกสโคป "กราฟ" ของรอบนี้)**: สีพาสเทลรายห้อง (`ROOM_PASTEL_MAP/FB`), gradient แถบ `--blue/--purple/--sky` ใน `room-admin.js` (`renderRoomBars`/`renderMonthBars` — เป็นสีธีมที่ตั้งใจแยกจาก core 6 สีตามบันทึกเดิม), และปัญหา `STATUS_BG`/`chipColor` 4 ชุดไม่ตรงกันใน `portfolio-admin.js` ที่บันทึกไว้แล้วด้านบน (ไม่ใช่กราฟ เป็น badge/chip)

## อัปเดต: แยกสี "กราฟ" ออกจากสีธีม (`--accent`/`--blue`/`--purple`) ให้ตายตัว — 2026-07-23 (รอบถัดไปอีกครั้ง)

**โจทย์**: เดิมกราฟบางจุดอ้างสีธีม (`--accent`, `--blue`, `--purple`) ทางอ้อม ทำให้กราฟเปลี่ยนสีไปด้วยทุกครั้งที่แอดมินปรับสีธีมใน `settings.html` (ตั้งใจให้ธีมกระทบแค่ navbar/ปุ่ม/ไอคอน ไม่ควรกระทบกราฟ) — จุดที่ผูกกับธีมโดยไม่ตั้งใจคือ `--blue*` (alias ไปที่ `--accent*`) และ `--purple*` (ปกติ alias ไปที่ `--c-ink*` แต่ถูก override เป็น `--accent*` อีกทีใน `body.theme-staff`) ส่วน `--c-*` (core 6 สี), `--sky*`, `--green*`, `--red*`, `--amber*`, `--violet*` **ไม่เคยถูก override ด้วยธีมเลย** จึงใช้เป็นฐานที่ตายตัวจริงได้

**แก้**:
- `shared/styles-new.css`: `--chart-1` เดิม alias `var(--accent)` → เปลี่ยนเป็นค่าคงที่ `#1d4ed8` ตรงๆ (ค่าเริ่มต้นเท่าเดิม แต่จากนี้ไม่ขยับตามธีม) — กระทบเป็นวงกว้างเพราะ `--chart-1` ถูกใช้ซ้ำใน `profile.js`/`index.js` สำหรับสี doc-type/badge สถานะด้วย
- `js/foodcourt-admin.js`: กราฟเส้น "สุทธิ" (3 จุด) เดิมใช้ `cssVar('--accent')` → เปลี่ยนเป็น `cssVar('--chart-1')`
- `js/ipad-lending.js`: โดนัท "นักเรียน/บุคลากร" และแท่ง "จำนวนนักเรียน/บุคลากร" เดิมใช้ `cssVar('--accent')` → เปลี่ยนเป็น `cssVar('--chart-1')`
- `js/repair-admin.js` + `js/repair-user.js` (`CATEGORY_PALETTE` sync กันสองไฟล์): entry แรก (`var(--blue-*)`) → เปลี่ยนเป็น `var(--c-violet-*)` ตายตัว, entry สุดท้าย (`var(--purple-*)` ซึ่งโดน override เป็นสีธีมใน `body.theme-staff`) → เปลี่ยนเป็น `var(--c-ink-*)` ตรงๆ
- `js/room-admin.js`: กราฟแท่งแนวนอน "ห้องที่ใช้บ่อย" (`renderRoomBars`), "คำขอรายเดือน" (`renderMonthBars`), และแถบสรุปรวม (`sum-bar-fill`) เดิมไล่เฉดผ่าน `var(--blue)/var(--accent-mid)` และ `var(--purple)/var(--purple-accent)` → เปลี่ยนเป็นชุด `var(--c-violet)/var(--c-violet-deep)` (สูงสุด), `var(--c-ink)/var(--c-ink-deep|mid)` (กลาง/รวม), `var(--sky)/var(--sky-mid)` เดิม (ต่ำสุด — ตัวนี้ตายตัวอยู่แล้วไม่ต้องแก้)
- ตรวจ `node --check` ผ่านทุกไฟล์ที่แก้

**ไม่แตะ (ตั้งใจ — เป็น UI chrome ไม่ใช่กราฟ)**: ปุ่ม/แท็บ/badge/ไอคอนที่อ้าง `var(--purple)`/`var(--accent)` ใน `repair-admin.js`, `room-admin.js`, `portfolio-admin.js` (เช่นปุ่ม "นำเข้าค่าเริ่มต้น", badge จำนวนเอกสาร, ไอคอนหัวโมดัล) — ตามที่ต้องการให้ธีมยังคุมส่วนนี้ต่อไปตามปกติ, และ `DEPT_COLORS.academic:'#1d4ed8'` ใน `portfolio-admin.js` ที่เป็น literal hex อยู่แล้ว (ไม่ใช่ `var()`) จึงตายตัวอยู่แล้วโดยไม่ต้องแก้

**พบแต่ไม่แตะ (นอกสโคป)**: `CATEGORY_PALETTE` entry ที่ 2/3 (`hex: 'var(--c-green-deep)'`, `hex: 'var(--c-amber-deep)'`) ใส่ CSS var() ไว้ในฟิลด์ `hex` ซึ่งใช้เป็นค่า `<input type="color">` — ช่องนี้รับได้แค่ literal hex เท่านั้น ถ้าเปิดแก้ไขหมวดหมู่นั้นใน UI color picker อาจไม่ขึ้นสีที่ถูกต้อง (คนละปัญหากับเรื่องธีม แนะนำแก้แยกเป็นอีกงาน)

## อัปเดต: กวาด literal hex ที่หลุดอยู่ใน `shared/styles-new.css` เอง — 2026-07-23 (รอบวิเคราะห์ทั้งเว็บ)

**ที่มา**: วิเคราะห์ทั้งเว็บแล้วพบว่าเว็บยัง "รู้สึกหลายสี ไม่ไปทางเดียวกัน" ไม่ใช่เพราะแนวคิด 6 สีหลักผิด แต่เพราะไฟล์ CSS กลางเองมี literal hex เขียนตรงๆ ในกฎ component 118 จุด (จากทั้งหมด 166 จุดที่เจอ hex ในไฟล์นี้ ที่เหลือ 65 จุดคือ token declaration ที่ถูกต้องอยู่แล้ว) แบ่งเป็น 3 แบบ:

1. **ตรงกับ token core เป๊ะ แต่ยังพิมพ์เป็น `#hex`** (42 จุด) — swap เป็น `var(--c-*)`/`var(--border)`/`var(--bg-alt)` ตรงๆ:
   `#15803d`→`--c-green-deep` (9), `#f1f5f9`→`--bg-alt` (8), `#778da9`→`--c-ink-tint` (7), `#e0e1dd`→`--c-ink-pale` (5), `#e2e8f0`→`--border` (4), `#0d1b2a`→`--c-ink-deep` (3), `#16a34a`/`#bae6fd`/`#5b21b6` (2 จุดต่อค่า)
2. **สีความหมายเดียวกันแต่มี "2 เฉดจริง" ต่างกันเงียบๆ** (เจอเพราะไม่ผ่าน token เลยไม่มีอะไรบังคับให้ตรงกัน):
   - "amber เข้ม" มี `--c-amber-deep` (#92400e) กับ `#b45309` แยกกัน 5 จุด → รวมเป็น `var(--c-amber-deep)` ทั้งหมด
   - "sky เข้ม" มี `--c-sky-deep` (#075985) กับ `#0369a1` แยกกัน 3 จุด → รวมเป็น `var(--c-sky-deep)` ทั้งหมด
3. **กลุ่มพื้นหลังขาว/เทาอ่อนเกือบขาวที่ต่างกันจริงแต่ตาแยกไม่ออก** — `#f8faff` (4 จุด) และ `#fafbfd` (3 จุด) ใกล้เคียง `--bg` (#f8fafc) มากจนไม่มีเหตุผลต้องแยก → รวมเป็น `var(--bg)` ทั้งหมด (ไม่ต้องสร้าง token ใหม่ ใช้ตัวที่มีอยู่แล้ว)

รวม **42 จุดที่แก้ในรอบนี้** ทั้งหมดอยู่นอกบล็อก `body.theme-staff` และนอก `:root` token declarations โดยตั้งใจ — ไม่แตะ:
- `--accent`/`--accent-light`/`--accent-tint` ค่า default และค่าที่ override ใน `body.theme-staff` (แม้บางค่าจะเลขตรงกับ `--c-ink-*` พอดี) เพราะเป็นคนละกลไก (สีธีมที่แอดมินปรับได้ vs สี core ที่ตายตัว) ตามที่ตกลงไว้ในรอบก่อนหน้า
- กลุ่มเทาอ่อนอีก 3 ค่า (`#f5f5f3`/`#f0f1ef`/`#f8f8f7`) ที่อยู่ใน `body.theme-staff` เพราะเป็นค่าเฉพาะของธีมนั้น ไม่ใช่ core palette
- `#ede9fe` ใน `group-badge[data-group="ภาษาต่างประเทศ"]` (ใกล้เคียง `--c-violet-tint` แต่ไม่ตรงเป๊ะ) — เว้นไว้พิจารณาแยก ไม่ mechanical-replace ค่าที่ไม่ตรงเป๊ะ

ตรวจแล้ว: ไม่มี self-reference (`--x: var(--x)`), จำนวน `{`/`}` สมดุล (631/631) หลังแก้

**ยังไม่ได้ทำ (นอกสโคปรอบนี้ — เป็นสีในไฟล์ .js ไม่ใช่ CSS กลาง)**: `shared/common.js` (90 hex), `js/index.js` (65), `js/room-request.js` (52) ส่วนใหญ่คือ `ROOM_PASTEL_MAP` ที่ตั้งใจแยกไว้แล้ว แต่ยังไม่ได้ไล่ทีละจุดว่ามีของหลุดปนอยู่ไหมในรอบนี้

## คำสั่งที่ใช้ทำงานนี้ (ไว้รันซ้ำ/ตรวจสอบ)

```bash
# เช็ค hex ที่เหลือทั้งโปรเจกต์
grep -rnoI "#[0-9a-fA-F]\{6\}\|#[0-9a-fA-F]\{3\}\b" --include="*.js" --include="*.html" . | grep -v -E "node_modules|/\.git/" | cut -d: -f1 | sort | uniq -c | sort -rn

# เช็ค syntax ไฟล์ JS หลังแก้
for f in js/*.js; do node --check "$f"; done
```

## อัปเดต: รวม hex เข้า CSS variable รอบใหม่ + รวมมาตรฐานสถานะใน portfolio-admin.js — 2026-07-23 (ต่อ)

### `shared/common.js` — แก้จริง 19 จุด
- `#64748b`→`var(--text2)` (3), `#e2e8f0`→`var(--border)` (2), `#1e293b`→`var(--text)` (1),
  `#f1f5f9`→`var(--bg-alt)` (1), `#7c3aed`→`var(--c-violet)` (6), `#a78bfa`→`var(--violet-hover)` (4),
  `#0d1b2a`→`var(--accent)` (2) — เลือก `--accent` เพราะเป็น banner แจ้งเตือน push notification ตั้งใจให้เป็นสีธีมหลัก ไม่ใช่สีสถานะตายตัว (กำกวมกับ `--c-ink-deep` ที่ค่าตรงกันพอดี ผู้ใช้ยืนยันแล้ว)
- เหลือไม่แตะ: `#fff`/`#facc15` (ไม่มี token ตรงเป๊ะ), ROOM_PASTEL_MAP/FB (decorative ตามเดิม)

### `js/room-request.js` — ตรวจแล้ว ไม่ต้องแก้เพิ่ม
- ที่เหลือทั้งหมดคือ ROOM_PASTEL (decorative) + `#94a3b822` (string concat alpha ที่มีบันทึกไว้แล้วว่าใช้ `var()` ตรงๆ ไม่ได้)

### `js/index.js` — แก้จริง 1 จุด
- `REPAIR_STATUS_META` fallback: `bg:'#f1f5f9',color:'#64748b'` → `bg:'var(--bg-alt)',color:'var(--text2)'`
- ไม่แตะ: ROOM_PASTEL, `#7c3aed` ใน `pfColorToBg()` (มีคอมเมนต์กำกับชัดเจนว่าต้องเป็น hex จริงเพราะฟังก์ชันต่อ string alpha ท้าย hex ตรงๆ ใช้ `var()` ไม่ได้), `#06C755` (สีแบรนด์ LINE), `#94a3b822`

### `js/portfolio-admin.js` — รวมมาตรฐานสถานะ 4 ชุด (`cBg`/`cBorder`/`chipColor`/`STATUS_BG`) ให้ตรงกันทั้งหมด
พบว่า 4 ชุดที่ทำหน้าที่เดียวกัน (แสดงสีตามสถานะการตรวจ portfolio) ใช้เฉดไม่ตรงกันเอง แก้โดยกำหนดมาตรฐานเดียว:

| สถานะ | bg | border |
|---|---|---|
| none | `--bg` | `--border` |
| submitted | `--c-green-pale` | `--c-green-mid` |
| head_reviewed / reviewed | `--sky-light` | `--c-sky-mid` |
| assistant_reviewed | `--c-amber-pale` | `--c-amber-mid` |
| deputy_reviewed | `--c-violet-pale` | `--c-violet-mid` |
| final_approved | `--c-green-tint` (เข้มกว่า submitted) | `--c-green-mid` |
| revision | `--c-red-pale` | `--c-red-mid` |

**การตัดสินใจที่มีผลต่อหน้าตาจริง (ผู้ใช้ยืนยันแล้ว)**:
1. `revision` เดิมมี 2/4 จุดใช้โทน amber อีก 2/4 ใช้โทนแดง → เลือก**แดง**เป็นมาตรฐาน (กันชนกับ `assistant_reviewed` ที่เป็น amber อยู่แล้ว และสื่อความเร่งด่วนกว่า)
2. `deputy_reviewed` เดิมบางจุดใช้ `--purple-mid`/`--purple-light` ซึ่ง**แกว่งค่าตามธีมที่แอดมินตั้ง** (เพราะ `body.theme-staff` override `--purple-*` ให้ผูกกับ `--accent` แทน) → เปลี่ยนเป็น `--c-violet-*` ที่ตายตัว ไม่ผูกธีม เพื่อให้สถานะนี้หน้าตาเหมือนกันทุกธีม

**ผลกระทบที่มองเห็นได้จริง (ควรรีวิวก่อน deploy)**: badge "ส่งกลับแก้ไข" เปลี่ยนจากส้ม/เหลืองเป็นแดงใน 2 จุดที่เคยเป็น amber, badge "รอง ผอ. ตรวจ" อาจเปลี่ยนสีเล็กน้อยถ้าธีมปัจจุบันไม่ใช่ default

### ยังไม่ได้ทำ (รอบถัดไป)
- `js/portfolio-teacher.js` (20 hex), `js/repair-admin.js` (18), `js/repair-user.js` (4), `js/admin-role.js` (11), `js/settings.js`/`js/staff.js`/`js/foodcourt-admin.js`/`js/room-admin.js` (เหลือน้อย)
- ไฟล์ `.html` ทั้งหมด (~9 ไฟล์ ที่ยังมี inline style hex)

## อัปเดต: ตรวจครบทุกไฟล์ที่เหลือ (js + html) — 2026-07-23 (รอบสุดท้าย)

### `js/portfolio-teacher.js` — แก้จริง 6 จุด
- `#f0fdf4`→`var(--c-green-pale)` (2), `#7c3aed`→`var(--c-violet)` (1), `#f5f3ff`→`var(--c-violet-pale)` (2), `#fffbeb`→`var(--c-amber-pale)` (1)
- **รวมมาตรฐานสถานะ `sbg` map ให้ตรงกับ `portfolio-admin.js`** (พบว่าเป็น 4-way-inconsistency แบบเดียวกัน): submitted/head_reviewed/reviewed/assistant_reviewed/deputy_reviewed/final_approved/revision ใช้ token ชุดเดียวกับที่ตกลงไว้ก่อนหน้าแล้วทั้งหมด
- ไม่แตะ: `#eff6ff`,`#fdf2f8`+`#ec4899`,`#eef2ff`+`#6366f1`,`#fefce8` (ไม่มี token ตรงเป๊ะ, สีตกแต่งประเภทเอกสาร), `colorToBg()` ที่ต่อ alpha string (ยืนยันจาก `function colorToBg(hex){ return hex+'15'; }`)

### `js/repair-admin.js` — แก้จริง 2 จุด
- `#7c3aed`→`var(--c-violet)` ใน pool สีหมวดหมู่, `#e0f2fe`→`var(--sky-light)`
- ไม่แตะ: field `hex:` ใน object สถานะ (4 จุด) และ fallback ใน `<input type="color" value="...">` — **ต้องเป็น hex จริง เพราะ input[type=color] ไม่รับ `var()`**; อีก 4 สี (amber/purple/green/red ใน object badge) ไม่มี token ตรงเป๊ะ

### `js/repair-user.js` — ตรวจแล้ว ไม่ต้องแก้
- hex ทั้งหมดเป็น field `hex:` สำหรับ color-picker input เหมือน repair-admin.js

### `js/admin-role.js` — แก้จริง 3 จุด
- `#e2e8f0`→`var(--border)` ทั้ง 3 จุด (border ปกติ, border hover, avatar border)
- **ไม่แตะ (ต้องทบทวน)**: `#0d1b2a` ใน colors pool 2 จุด (บรรทัด 492, 545) — บริบทนี้คือสีอวตารตาม role ซึ่งต่างจาก common.js (banner) ที่ใช้ `--accent` ไปแล้ว ในบริบทนี้ตามเอกสาร "SuperAdmin = ink" น่าจะควรเป็น `var(--c-ink-deep)` แทน ไม่ใช่ `var(--accent)` — **ยังไม่ได้แก้ รอ confirm** เพราะเป็นคนละความหมายกับที่เคยตัดสินใจไปแล้ว
- ไม่แตะ: `#1d4ed8` (กำกวมกับ `--accent` เหมือน `DEPT_COLORS.academic` เดิม), `background=7c3aed` ใน URL ui-avatars.com (ต่อ string ใน URL ใช้ `var()` ไม่ได้)

### `js/settings.js` — แก้จริง 1 จุด
- `#f0fdf4`→`var(--c-green-pale)`
- ไม่แตะ: `#1d4ed8`/`#0d1b2a` (เป็นค่า default ของ "ธีมพรีเซ็ต" ที่ตั้งใจ hardcode ให้ตรงกับค่า default ใน CSS ไม่ใช่สีสถานะ)

### `js/staff.js` — แก้จริง 3 จุด
- `#7c3aed`→`var(--c-violet)`, `#64748b`→`var(--text2)` (2 จุด)
- ไม่แตะ: `#1d4ed8` (เหตุผลเดียวกับข้างต้น)

### `js/foodcourt-admin.js`, `js/room-admin.js`, `js/profile.js` — ตรวจแล้ว ไม่แก้เพิ่ม
- `foodcourt-admin.js`: hex เป็นค่า fallback ของ `getComputedStyle(...).trim() || '#64748b'` เอง จะใช้ `var()` เป็น fallback ของการอ่าน `var()` ไม่ได้ (circular)
- `room-admin.js`: `#dcfce7` ไม่มี token ตรงเป๊ะ
- `profile.js`: ทุกจุดเป็น `col+'22'`/`col+'44'` (ต่อ alpha string เหมือน colorToBg) หรือ fallback ธรรมดาที่ต่อ string ต่อ ใช้ `var()` ไม่ได้

### ไฟล์ `.html` — แก้จริงรวม 8 จุด
- `guide.html`: `#bbf7d0`(×2)→`var(--c-green-tint)`, `#c4b5fd`(×2)→`var(--c-violet-mid)`
- `profile.html`: `#bbf7d0`(×2)→`var(--c-green-tint)`
- `foodcourt-admin.html`: `#c4b5fd`→`var(--c-violet-mid)`
- `index.html`: `#a78bfa`→`var(--violet-hover)`
- `room-request.html`: `#f87171`(×2)→`var(--c-red-mid)`
- ไม่แตะ (ไม่มี token ตรงเป๊ะ หรือเป็นของตั้งใจ): `#ede9fe` (violet ที่ไม่ตรงเฉดมาตรฐาน — พบ 3 จุด ควรรีวิวว่าใกล้ violet-pale พอจะรวมไหม), gradient สี decorative (`#1e3a8a`,`#fbbf24`,`#34d399`,`#10b981`,`#fdba74`,`#166534` ฯลฯ), สีแบรนด์ (`#4285F4` Google, SVG `#fff`), color-swatch เลือกเอกสาร (`portfolio-admin.html` #ec4899/#6366f1/#14b8a6 — ตั้งใจไม่แตะเดิม)

## สรุปสถานะรวมทั้งโปรเจกต์ (จบรอบนี้)
ทุกไฟล์ `.js`/`.html` ได้รับการตรวจสอบครบแล้ว 100% แก้จริงรวม ~40 จุดในรอบนี้ (นับตั้งแต่ common.js เป็นรวม ~60+ จุดทั้งโปรเจกต์) ที่เหลือทั้งหมดเป็น 3 กลุ่ม: (1) ตั้งใจไม่แตะเพราะเป็น decorative/แบรนด์/ผู้ใช้เลือกเอง (2) ทางเทคนิคใช้ `var()` ไม่ได้ (string concat, input[type=color], url) (3) ไม่มี token ตรงเป๊ะ ต้องตัดสินใจเชิงความหมายเพิ่มก่อนรวม (เช่น `#ede9fe`, `#0d1b2a` ใน admin-role.js)

**รอ confirm จากคุณ**: `#0d1b2a` ใน `js/admin-role.js` (colors pool role avatar) — ใช้ `var(--c-ink-deep)` ตามความหมาย "SuperAdmin = ink" ดีไหม?

## อัปเดต: ปิดจุดค้างสุดท้าย — 2026-07-23

- `js/admin-role.js` บรรทัด 492, 545: `#0d1b2a` → `var(--c-ink-deep)` (2 จุด) — ยืนยันแล้วว่าบริบทนี้คือสีอวตารตาม role ("SuperAdmin = ink") ต่างจาก `#0d1b2a` ใน `common.js` ที่เป็น banner theme จึงใช้ `--accent`

**สถานะ: ตรวจสอบและแก้ไขครบทุกไฟล์ในโปรเจกต์แล้ว ไม่มีจุดค้างที่ต้องตัดสินใจเพิ่มเติม**
