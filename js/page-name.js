/* ✏️ ไฟล์นี้ให้ rename ตามชื่อหน้า เช่น "library.js"
   และแก้ path ใน page-template.html บรรทัด
   <script src="js/page-name.js"> ให้ตรงกับชื่อไฟล์ใหม่ (เช่น "js/library.js")
   จากนั้นเซฟไว้ที่โฟลเดอร์ /js/ */

/* ══════════════════════════════════════════════════════════════
   buildPage() — auth guard + shell builder ในก้าวเดียว

   ✏️ ตัวเลือกที่ต้องแก้:
     appId        → id ของ <div id="myApp">
     navSubtitle  → ข้อความบรรทัดที่ 2 ใน navbar
     navTheme     → 'blue' (ผู้ใช้ทั่วไป) | 'dark' (เจ้าหน้าที่)
     activePage   → ชื่อหน้า สำหรับ highlight เมนู sidebar
                    ดูค่าที่รองรับใน buildSidebar() ใน common.js
     requireAdmin → false           : ทุกคนที่ login แล้วเข้าได้
                    'admin'         : ต้องมีในตาราง admins
                    'superadmin'    : SuperAdmin เท่านั้น
                    'bookings'      : ต้องมีสิทธิ์ bookings
                    'staff'         : ต้องมีสิทธิ์ staff
                    (permission key อื่นๆ ตามที่ define ใน Firestore)
   ══════════════════════════════════════════════════════════════ */
buildPage({
  appId:        'myApp',
  navSubtitle:  'ชื่อหน้า',        /* ✏️ */
  navTheme:     'dark',             /* ✏️ 'blue' | 'dark' */
  activePage:   'my-page',          /* ✏️ */
  requireAdmin: false,              /* ✏️ */

  onAuth: function(user, contentEl) {
    /* user  — Firebase user object (email, displayName, photoURL, ...)
       contentEl — <div class="content-area"> ที่พร้อมรับ HTML */

    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);

    /* ── render page content ── */
    contentEl.innerHTML = renderPage();
    lucide.createIcons();

    /* ── โหลดข้อมูล ── */
    loadData();
    setupScrollTopButton();
  }
});

/* ══ Page State ══ */
var currentUser = null;

/* ══════════════════════════════════════════════════════════════
   ปุ่มย้อนกลับไปด้านบน (✏️ ฟังก์ชันมาตรฐาน คงไว้ทุกหน้า ไม่ต้องแก้)
   scroll จริงเกิดที่ .content-area (id="pageContent") ไม่ใช่ window
   ══════════════════════════════════════════════════════════════ */
function setupScrollTopButton() {
  var content = document.getElementById('pageContent');
  var btn = document.getElementById('scrollTopBtn');
  if (!content || !btn) return;
  content.addEventListener('scroll', function() {
    btn.classList.toggle('show', content.scrollTop > 300);
  });
}
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══ Render ══ */
function renderPage() {
  return (
    /* Page header */
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title-row">' +
          '<div class="page-icon blue">' +
            '<i data-lucide="home" style="width:20px;height:20px;color:white;"></i>' +  /* ✏️ icon */
          '</div>' +
          '<h1 class="page-title">ชื่อหน้า</h1>' +  /* ✏️ */
        '</div>' +
        '<p class="page-sub">คำอธิบายหน้านี้</p>' +  /* ✏️ */
      '</div>' +
      /* ปุ่มด้านขวา (ถ้ามี) */
      /* '<button class="btn-primary" onclick="openAddModal()">+ เพิ่มรายการ</button>' */
    '</div>' +

    /* เนื้อหา */
    '<div class="card" id="mainContent">' +
      '<p style="padding:40px;text-align:center;color:#94a3b8;">กำลังโหลด...</p>' +
    '</div>'
  );
}

/* ══ Data ══ */
function loadData() {
  /* TODO: ดึงข้อมูลจาก Firestore และ render */
}

