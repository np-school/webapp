# Tailwind CSS — Self-hosted Build

`shared/tailwind-built.css` คือไฟล์ Tailwind v2.2.19 ที่ purge แล้ว (เหลือเฉพาะ base reset
+ class ที่ใช้จริงในโปรเจกต์) แทนที่การโหลดจาก jsdelivr CDN แบบเต็มไฟล์แบบเดิม

**สิ่งสำคัญ:** จากการสแกนโค้ดจริง โปรเจกต์นี้แทบไม่ได้ใช้ Tailwind utility class เลย
(ใช้ custom class จาก `styles-new.css` เป็นหลัก) ดังนั้นไฟล์นี้เล็กมาก (~5.6 KB) และเก็บไว้
เผื่อกรณีมีการใช้ utility class เพิ่มในอนาคต — ถ้าต้องการ ให้พิจารณาตัด Tailwind ออกทั้งหมด
แล้วย้ายอะไรที่จำเป็นไปไว้ใน `styles-new.css` แทน (ดู CLAUDE.md หัวข้อ "ปัญหาที่รู้อยู่แล้ว")

## วิธี rebuild ไฟล์นี้ (เมื่อเพิ่ม class ใหม่ในโค้ดแล้ว CSS เดิมไม่พอ)

ไม่มี build step อัตโนมัติ ต้องรันเองแล้ว commit ไฟล์ผลลัพธ์เข้า repo:

```bash
# ครั้งแรก (ติดตั้ง Tailwind CLI v2.2.19 ให้ตรงกับที่ config ไว้)
mkdir -p /tmp/tw-build && cd /tmp/tw-build
npm init -y
npm install tailwindcss@2.2.19

# copy config จากโฟลเดอร์นี้
cp <repo>/shared/tailwind-source/tailwind.config.js .
cp <repo>/shared/tailwind-source/input.css .

# แก้ path ใน tailwind.config.js ให้ชี้ไปที่ repo จริงของคุณ (purge.content)

# build
./node_modules/.bin/tailwind build input.css -o output.min.css -c tailwind.config.js --minify

# copy ผลลัพธ์กลับเข้า repo (ใส่ comment header ไว้บนสุดแบบเดิมด้วยก็ได้)
cp output.min.css <repo>/shared/tailwind-built.css
```

จากนั้น commit `shared/tailwind-built.css` ตามปกติ — ไม่ต้องมี CI/build step ใดๆ เพิ่ม
