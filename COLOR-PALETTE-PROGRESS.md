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

## คำสั่งที่ใช้ทำงานนี้ (ไว้รันซ้ำ/ตรวจสอบ)

```bash
# เช็ค hex ที่เหลือทั้งโปรเจกต์
grep -rnoI "#[0-9a-fA-F]\{6\}\|#[0-9a-fA-F]\{3\}\b" --include="*.js" --include="*.html" . | grep -v -E "node_modules|/\.git/" | cut -d: -f1 | sort | uniq -c | sort -rn

# เช็ค syntax ไฟล์ JS หลังแก้
for f in js/*.js; do node --check "$f"; done
```
