/* ═══════════════════════════════════════════════
   shared/common.js
   Shared Functions – Navbar, Sidebar, Auth UI,
   Room Colors, Toast, Admin Check, Profile UI
   ═══════════════════════════════════════════════ */

/* ── Promise.finally polyfill ── */
if (!Promise.prototype.finally) {
  Promise.prototype.finally = function(fn) {
    return this.then(
      function(v) { return Promise.resolve(fn()).then(function() { return v; }); },
      function(e) { return Promise.resolve(fn()).then(function() { throw e; }); }
    );
  };
}

/* ════════════════════════════════
   Sidebar open/close
   ════════════════════════════════ */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ════════════════════════════════
   Toast
   ════════════════════════════════ */
function showToast(msg, type) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.style.background = type === 'error' ? '#ef4444' : type === 'warn' ? '#f59e0b' : '#22c55e';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() {
    t.classList.add('hide');
    setTimeout(function() { t.remove(); }, 300);
  }, 3500);
}

/* ════════════════════════════════
   Modal helpers
   ════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }

/* ════════════════════════════════
   Room Pastel Color System
   ════════════════════════════════ */
var ROOM_PASTEL_MAP = {
  'ห้องประชุมชวนชม'   : { bg:'#dbeafe', text:'#1e3a8a', border:'#93c5fd',  accent:'#2563eb' },
  'หอประชุมพุทธรักษา' : { bg:'#fef3c7', text:'#78350f', border:'#fcd34d',  accent:'#b45309' },
  'สนามกีฬากลาง'     : { bg:'#d1fae5', text:'#064e3b', border:'#6ee7b7',  accent:'#059669' },
  'ห้องประชุมราชพฤกษ์': { bg:'#fce7f3', text:'#831843', border:'#f9a8d4',  accent:'#db2777' },
  'โดมอเนกประสงค์'   : { bg:'#ffedd5', text:'#7c2d12', border:'#fdba74',  accent:'#ea580c' },
  'ห้องประชุมปาริชาติ' : { bg:'#ede9fe', text:'#4c1d95', border:'#c4b5fd',  accent:'#7c3aed' },
  'ห้องประชุมชวนชน'   : { bg:'#e0f2fe', text:'#0c4a6e', border:'#7dd3fc',  accent:'#0284c7' }
};
var ROOM_PASTEL_FB = [
  { bg:'#dbeafe', text:'#1e3a8a', border:'#93c5fd', accent:'#2563eb' },
  { bg:'#d1fae5', text:'#064e3b', border:'#6ee7b7', accent:'#059669' },
  { bg:'#ede9fe', text:'#4c1d95', border:'#c4b5fd', accent:'#7c3aed' },
  { bg:'#fce7f3', text:'#831843', border:'#f9a8d4', accent:'#db2777' },
  { bg:'#ffedd5', text:'#7c2d12', border:'#fdba74', accent:'#ea580c' },
  { bg:'#fef3c7', text:'#78350f', border:'#fcd34d', accent:'#b45309' },
  { bg:'#ccfbf1', text:'#134e4a', border:'#5eead4', accent:'#0d9488' },
  { bg:'#dcfce7', text:'#14532d', border:'#86efac', accent:'#16a34a' },
  { bg:'#e0f2fe', text:'#0c4a6e', border:'#7dd3fc', accent:'#0284c7' },
  { bg:'#fdf4ff', text:'#581c87', border:'#e9d5ff', accent:'#9333ea' }
];
function getRoomPastel(name) {
  if (ROOM_PASTEL_MAP[name]) return ROOM_PASTEL_MAP[name];
  var h = 0;
  for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % ROOM_PASTEL_FB.length;
  return ROOM_PASTEL_FB[h];
}

/* ════════════════════════════════
   In-App Browser Detection
   ════════════════════════════════ */
function isInAppBrowser() {
  var ua = navigator.userAgent || '';
  return /Line\//i.test(ua)
    || /FBAN|FBAV|Instagram|MicroMessenger|WebView/i.test(ua)
    || (/iPhone|iPod|iPad/.test(ua) && !/Safari\//.test(ua));
}

/* ════════════════════════════════
   Auth Handlers
   ════════════════════════════════ */
function handleLogin() {
  var ov = document.getElementById('loadingOverlay');
  if (ov) ov.style.display = 'flex';
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch(function(e) {
      console.error(e);
      if (ov) ov.style.display = 'none';
    });
}
function handleLogout() {
  var ov = document.getElementById('loadingOverlay');
  if (ov) ov.style.display = 'flex';
  auth.signOut().then(function() {
    window.location.href = 'index.html';
  });
}

/* auth.onAuthStateChanged — ใช้ใน index.html / หน้าอื่นๆ แยกต่างหาก
   ════════════════════════════════════════════════ */

/* ════════════════════════════════
   Admin Access Check
   ดึง permissions จริงจาก Firestore แล้วแสดงเฉพาะ
   เมนูที่ user มีสิทธิ์ — ทำงานบนทุกหน้า
   ════════════════════════════════ */
function checkAdminAccess(email) {
  if (!email) return;
  var lEmail = email.toLowerCase();
  var isSA   = lEmail === SUPERADMIN_EMAIL;

  db.collection('admins').doc(lEmail).get()
    .then(function(doc) {
      if (!doc.exists) return;
      var p = doc.data().permissions || {};

      /* แสดง section wrapper */
      var sec = document.getElementById('adminSidebarSection');
      if (sec) { sec.style.display = 'block'; lucide.createIcons(); }

      /* ซ่อน/แสดงแต่ละ item ตาม permission */
      _toggleAdminItem('adminMenuItem-portfolio',  isSA || !!p.portfolio || !!p.headOfGroup);
      _toggleAdminItem('adminMenuItem-booking',    isSA || !!p.bookings);
      _toggleAdminItem('adminMenuItem-staff',      isSA || !!p.staff);
      _toggleAdminItem('adminMenuItem-foodcourt',  isSA || !!p.foodcourt);

      /* SuperAdmin-only */
      if (isSA) {
        var slot = document.getElementById('superadminSidebarSlot');
        if (slot) { slot.style.display = 'block'; lucide.createIcons(); }
      }
    })
    .catch(function() {});
}

function _toggleAdminItem(id, show) {
  var el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
}

/* ════════════════════════════════
   Navbar Builder
/* ════════════════════════════════════════════════════════════════
   buildPageShell(config)
   ──────────────────────────────────────────────────────────────
   สร้าง HTML shell ทั้งหน้า (app-shell + navbar + main-grid +
   sidebar + content-area) แล้ว inject เข้า container ที่กำหนด

   config: {
     appId        {string}   id ของ app wrapper div (required)
     navSubtitle  {string}   subtitle ที่แสดงใน navbar
     navTheme     {string}   'blue' | 'dark' | 'purple' (default: 'blue')
     activePage   {string}   activePage ส่งต่อไป buildSidebar()
     onReady      {function} callback(contentEl) เรียกหลัง shell พร้อม
   }

   วิธีใช้ใน HTML:
     <!-- โครงสร้างที่ต้องมีใน body -->
     <div id="loadingOverlay"><div class="spinner"></div></div>
     <div id="sidebarOverlay" onclick="closeSidebar()"></div>
     <div id="myApp" style="display:none;"></div>

     <!-- ใน script (หลัง auth check) -->
     buildPageShell({
       appId:       'myApp',
       navSubtitle: 'ชื่อหน้า',
       navTheme:    'dark',
       activePage:  'my-page',
       onReady: function(contentEl) {
         contentEl.innerHTML = '<p>เนื้อหาหน้านี้</p>';
         lucide.createIcons();
       }
     });

   หมายเหตุ:
   - ถ้า onReady ไม่ได้ส่งมา จะได้ contentEl ที่ว่างเปล่า
   - shell ใช้ .app-shell / .main-grid / .main-grid-inner / .content-area
     ที่ define ไว้ใน styles-new.css แล้ว
   ════════════════════════════════════════════════════════════════ */

function buildPageShell(config) {
  config = config || {};
  var appId      = config.appId      || 'appShell';
  var subtitle   = config.navSubtitle || '';
  var theme      = config.navTheme    || 'blue';
  var activePage = config.activePage  || '';
  var onReady    = typeof config.onReady === 'function' ? config.onReady : null;

  var appEl = document.getElementById(appId);
  if (!appEl) { console.warn('buildPageShell: ไม่พบ element id="' + appId + '"'); return; }

  /* ── ใส่ class app-shell ── */
  appEl.classList.add('app-shell');

  /* ── Inject structure ── */
  appEl.innerHTML =
    '<nav id="navbar" class="navbar"></nav>' +

    '<div class="main-grid">' +
      '<div class="main-grid-inner">' +

        '<div class="sidebar-wrap" id="sidebar">' +
          '<div class="sidebar-inner" id="sidebarInner"></div>' +
        '</div>' +

        '<div class="content-area" id="pageContent"></div>' +

      '</div>' +
    '</div>';

  /* ── Build shared components ── */
  buildNavbar(subtitle, theme);
  buildSidebar(activePage);

  /* ── Call onReady with contentEl ── */
  var contentEl = document.getElementById('pageContent');
  if (onReady && contentEl) onReady(contentEl);
}

/* ════════════════════════════════════════════════════════════════
   buildPage(config)
   ──────────────────────────────────────────────────────────────
   Convenience wrapper: buildPageShell + auth guard ในก้าวเดียว

   config (extends buildPageShell config):
     requireAdmin  {string|boolean}
       - false (default) : ทุกคน login แล้วเข้าได้
       - 'superadmin'    : เฉพาะ SuperAdmin
       - 'admin'         : มี permission อย่างน้อย 1 อย่าง

     accessDeniedEl {string}  id ของ access-denied div (default: 'accessDenied')
     onAuth         {function(user, contentEl)} เรียกหลัง auth pass แล้ว

   วิธีใช้:
     buildPage({
       appId:        'myApp',
       navSubtitle:  'ชื่อหน้า',
       navTheme:     'dark',
       activePage:   'my-page',
       requireAdmin: false,
       onAuth: function(user, contentEl) {
         updateNavUser(user);
         updateSidebarProfile(user);
         checkAdminAccess(user.email);
         contentEl.innerHTML = '<p>สวัสดี ' + user.displayName + '</p>';
         lucide.createIcons();
       }
     });
   ════════════════════════════════════════════════════════════════ */

function buildPage(config) {
  config = config || {};
  var appId         = config.appId          || 'appShell';
  var requireAdmin  = config.requireAdmin   || false;
  var deniedId      = config.accessDeniedEl || 'accessDenied';
  var onAuth        = typeof config.onAuth === 'function' ? config.onAuth : null;

  auth.onAuthStateChanged(function(user) {
    var loadEl = document.getElementById('loadingOverlay');

    /* ── ไม่ได้ login → redirect ── */
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    /* ── ตรวจ admin access ─────────────────────── */
    function _proceed(contentEl) {
      var appEl = document.getElementById(appId);
      /* ลบ display:none ออก ให้ CSS class .app-shell จัดการ flex display เอง */
      if (appEl) appEl.style.removeProperty('display');
      if (loadEl) loadEl.style.display = 'none';
      if (onAuth) onAuth(user, contentEl);
    }

    function _deny() {
      if (loadEl) loadEl.style.display = 'none';
      var deniedEl = document.getElementById(deniedId);
      if (deniedEl) { deniedEl.style.display = 'flex'; lucide.createIcons(); }
    }

    if (!requireAdmin) {
      /* ไม่ต้องการ admin — build shell แล้วโทร onAuth ทันที */
      buildPageShell({
        appId:       appId,
        navSubtitle: config.navSubtitle,
        navTheme:    config.navTheme,
        activePage:  config.activePage,
      });
      var appEl2 = document.getElementById(appId);
      if (appEl2) appEl2.style.removeProperty('display');
      if (loadEl) loadEl.style.display = 'none';
      if (onAuth) onAuth(user, document.getElementById('pageContent'));
      return;
    }

    /* ตรวจสิทธิ์จาก Firestore */
    var lEmail = user.email.toLowerCase();
    var isSA   = lEmail === SUPERADMIN_EMAIL;

    db.collection('admins').doc(lEmail).get()
      .then(function(doc) {
        var hasAccess = false;

        if (requireAdmin === 'superadmin') {
          hasAccess = isSA;
        } else if (requireAdmin === 'admin') {
          hasAccess = doc.exists;
        } else {
          /* requireAdmin เป็น permission key เช่น 'bookings' */
          if (isSA) {
            hasAccess = true;
          } else if (doc.exists) {
            var p = doc.data().permissions || {};
            hasAccess = !!p[requireAdmin];
          }
        }

        if (!hasAccess) { _deny(); return; }

        buildPageShell({
          appId:       appId,
          navSubtitle: config.navSubtitle,
          navTheme:    config.navTheme,
          activePage:  config.activePage,
        });
        _proceed(document.getElementById('pageContent'));
      })
      .catch(function() { _deny(); });
  });
}


   buildNavbar(subtitle, theme)
   theme: 'blue' (ผู้ใช้ทั่วไป, default) | 'dark' (เจ้าหน้าที่) | 'purple' (legacy)
   backward compat: buildNavbar(subtitle, true) → 'purple'
   ════════════════════════════════ */
function buildNavbar(subtitle, theme) {
  var nav = document.getElementById('navbar');
  if (!nav) return;

  /* backward-compat: isPurple=true → 'purple' */
  if (theme === true)  theme = 'purple';
  if (!theme)          theme = 'blue';

  nav.className = 'navbar ' + theme;

  nav.innerHTML =
    '<div class="navbar-inner">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<button id="hamburgerBtn" onclick="openSidebar()" class="navbar-hamburger">' +
          '<i data-lucide="menu" style="width:20px;height:20px;"></i>' +
        '</button>' +
        '<a href="https://2022.nongki.ac.th/" target="_blank" rel="noopener" style="display:flex;align-items:center;flex-shrink:0;">' +
          '<img src="https://firebasestorage.googleapis.com/v0/b/np-webapp-74616.firebasestorage.app/o/img%2Flogo_np.gif?alt=media&token=caa0869b-c98f-4ad3-8ee9-930e8789602e" alt="โรงเรียนหนองกี่พิทยาคม" class="navbar-logo">' +
        '</a>' +
        '<a href="index.html" style="display:flex;align-items:center;flex-shrink:0;">' +
          '<img src="https://firebasestorage.googleapis.com/v0/b/np-webapp-74616.firebasestorage.app/o/img%2Flogo_nporigins.png?alt=media&token=7ad2b246-5cd4-40f8-b28f-69d47ae16e70" alt="NP Origins" class="navbar-logo">' +
        '</a>' +
        '<div class="navbar-divider">' +
          '<div class="navbar-title">โรงเรียนหนองกี่พิทยาคม</div>' +
          '<div class="navbar-subtitle">' + subtitle + '</div>' +
        '</div>' +
      '</div>' +
      '<div id="userNavSection"></div>' +
    '</div>';
  lucide.createIcons();
}

/* ════════════════════════════════
   Navbar User UI
   ════════════════════════════════ */
function updateNavUser(user) {
  var el = document.getElementById('userNavSection');
  if (!el) return;
  var ph = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=1d4ed8&color=fff';
  el.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;">' +
      '<img src="' + ph + '" class="navbar-user-avatar">' +
      '<button onclick="handleLogout()" class="navbar-logout-btn">' +
        '<i data-lucide="log-out" style="width:18px;height:18px;"></i>' +
      '</button>' +
    '</div>';
  lucide.createIcons();
}

function resetNavUI() {
  var el = document.getElementById('userNavSection');
  if (!el) return;
  el.innerHTML =
    '<button onclick="handleLogin()" class="navbar-login-btn">เข้าสู่ระบบด้วย Google</button>';
  lucide.createIcons();
}

/* ════════════════════════════════
   Sidebar Profile
   ════════════════════════════════ */
function updateSidebarProfile(user) {
  var ph = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=1d4ed8&color=fff';
  var el = document.getElementById('sidebarProfile');
  if (!el) return;

  function _renderProfile(name, position, group) {
    var sub1 = position || '';
    var sub2 = group ? (
      ['ผู้บริหาร','เจ้าหน้าที่','แนะแนว'].indexOf(group) !== -1
        ? group
        : 'กลุ่มสาระ' + group
    ) : '';
    var subHtml = '';
    if (sub1 && sub2) {
      subHtml =
        '<p style="font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4;">' + sub1 + '</p>' +
        '<p style="font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4;">' + sub2 + '</p>';
    } else if (sub1 || sub2) {
      subHtml =
        '<p style="font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4;">' + (sub1 || sub2) + '</p>';
    } else {
      subHtml =
        '<p style="font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (user.email || '') + '</p>';
    }
    el.innerHTML =
      '<div style="background:white;padding:12px 14px;border-radius:16px;border:1px solid #e2e8f0;">' +
        '<div style="display:flex;align-items:center;gap:10px;overflow:hidden;">' +
          '<img src="' + ph + '" style="width:38px;height:38px;border-radius:50%;flex-shrink:0;border:2px solid #e2e8f0;">' +
          '<div style="overflow:hidden;min-width:0;">' +
            '<p style="font-size:12px;font-weight:800;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</p>' +
            subHtml +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ดึงข้อมูลจาก staff collection ตาม email */
  if (typeof db !== 'undefined' && user.email) {
    db.collection('staff').where('email', '==', user.email.toLowerCase()).limit(1).get()
      .then(function(snap) {
        if (!snap.empty) {
          var s = snap.docs[0].data();
          _renderProfile(s.name || user.displayName || user.email, s.position || '', s.group || '');
        } else {
          _renderProfile(user.displayName || user.email, '', '');
        }
      })
      .catch(function() {
        _renderProfile(user.displayName || user.email, '', '');
      });
  } else {
    _renderProfile(user.displayName || user.email, '', '');
  }
}

/* ════════════════════════════════════════════════
   Sidebar Builder
   buildSidebar(activePage)

/*
   activePage:
     'index'            → หน้าแรก
     'profile'          → My Portfolio (โปรไฟล์บุคลากร)
     'room-request'     → หน้าจองห้อง
     'room-admin'    → หน้า admin จองห้อง (แสดง tab)
     'portfolio-admin'  → หน้า admin ส่งงาน
     'admin-role'       → หน้าจัดการสิทธิ์
     'staff'            → หน้าบุคลากร

   ── วิธีเพิ่ม/แก้เมนู แก้ที่นี่ที่เดียว ──
   ════════════════════════════════════════════════ */

var MAIN_MENU = [
  { label: 'หน้าแรก',          icon: 'home',         href: 'index.html'   },
  { label: 'My Portfolio',      icon: 'layout-dashboard', href: 'profile.html' },
  { label: 'คู่มือการใช้งาน',   icon: 'book-open',    href: 'guide.html'   },
];

var GROUP_MENU = [
  {
    group: 'กลุ่มบริหารงบประมาณ',
    icon: 'banknote',
    items: [],
  },
  {
    group: 'กลุ่มบริหารงานบุคคล',
    icon: 'users',
    items: [],
  },
  {
    group: 'กลุ่มวิชาการ',
    icon: 'graduation-cap',
    items: [
      { label: 'ส่งงานประจำภาคเรียน', icon: 'send', href: 'portfolio-teacher.html' },
    ],
  },
  {
    group: 'กลุ่มบริหารทั่วไป',
    icon: 'building-2',
    items: [
      { label: 'ระบบขอใช้ห้อง/สถานที่', icon: 'calendar', href: 'room-request.html' },
      { label: 'ระบบขอใช้ข้อมูล CCTV',  icon: 'cctv',     onclick: "showToast('ระบบนี้อยู่ระหว่างพัฒนา','warn')" },
    ],
  },
];

/* ── SuperAdmin-only ── */
var SUPERADMIN_EMAIL = 'nattapol@nongki.ac.th';

/* ════════════════════════════════
   Admin Group Menu items
   (แต่ละ item มี id เพื่อให้ checkAdminAccess toggle ได้)
   ════════════════════════════════ */
var ADMIN_GROUP_MENU = [
  {
    group: 'กลุ่มบริหารงบประมาณ',
    icon: 'banknote',
    items: [],
  },
  {
    group: 'กลุ่มบริหารงานบุคคล',
    icon: 'users',
    items: [
      { id: 'adminMenuItem-staff', label: 'จัดการข้อมูลบุคลากร', icon: 'user-cog', href: 'staff.html' },
    ],
  },
  {
    group: 'กลุ่มวิชาการ',
    icon: 'graduation-cap',
    items: [
      { id: 'adminMenuItem-portfolio', label: 'ติดตามส่งงานครู', icon: 'folder-check', href: 'portfolio-admin.html' },
    ],
  },
  {
    group: 'กลุ่มบริหารทั่วไป',
    icon: 'building-2',
    items: [
      { id: 'adminMenuItem-booking',    label: 'จัดการระบบขอใช้ห้อง/สถานที่', icon: 'calendar-cog', href: 'room-admin.html' },
      { id: 'adminMenuItem-foodcourt',  label: 'บัญชีรายได้ Food Court',       icon: 'utensils',     href: 'foodcourt-admin.html' },
    ],
  },
];

function buildSidebar(activePage) {
  var el = document.getElementById('sidebarInner');
  if (!el) return;

  /* ── close button ── */
  var html =
    '<div style="display:flex;justify-content:flex-end;margin-bottom:8px;">' +
      '<button onclick="closeSidebar()" style="padding:7px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;display:flex;">' +
        '<i data-lucide="x" style="width:16px;height:16px;color:#64748b;"></i>' +
      '</button>' +
    '</div>';

  /* ── เมนูหลัก ── */
  html += '<div class="sec-label">เมนูหลัก</div>';
  MAIN_MENU.forEach(function(item) {
    var key = item.href ? item.href.replace('.html', '') : '';
    var active = activePage === key;
    html += _sidebarBtn(item, active, false);
  });

  /* ── บริการออนไลน์ แยกกลุ่ม ── */
  html += '<div class="sec-label" style="margin-top:6px;">บริการออนไลน์</div>';
  GROUP_MENU.forEach(function(g) {
    html +=
      '<div class="sidebar-group-label">' +
        '<i data-lucide="' + g.icon + '" style="width:12px;height:12px;color:#94a3b8;flex-shrink:0;"></i>' +
        '<span style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:.4px;text-transform:uppercase;">' + g.group + '</span>' +
      '</div>';
    if (!g.items.length) {
      html += '<div class="sidebar-dev-note">อยู่ระหว่างพัฒนา</div>';
    } else {
      g.items.forEach(function(item) {
        var key = item.href ? item.href.replace('.html', '') : '';
        html += _sidebarBtn(item, activePage === key, false, true);
      });
    }
  });

  /* ── Admin section (แสดงทุกหน้า แต่ซ่อนไว้ก่อน checkAdminAccess จะ toggle) ── */
  var adminGroupHtml = '';
  ADMIN_GROUP_MENU.forEach(function(g) {
    /* สร้าง rows ของกลุ่มนี้ก่อน ถ้าไม่มี item ที่แสดงได้เลย ข้ามทั้งกลุ่ม */
    var rowsHtml = '';
    g.items.forEach(function(item) {
      var key     = item.href ? item.href.replace('.html', '') : '';
      var isActive = activePage === key;

      var cls = 'sidebar-btn admin-btn' + (isActive ? ' active' : '');
      var inner =
        '<i data-lucide="' + item.icon + '" style="width:16px;height:16px;flex-shrink:0;' + (isActive ? '' : 'color:#7c3aed;') + '"></i>' +
        '<span>' + item.label + '</span>' +
        (item.badge ? '<span style="margin-left:auto;font-size:9px;background:#7c3aed;color:white;padding:2px 7px;border-radius:10px;font-weight:800;flex-shrink:0;">' + item.badge + '</span>' : '');

      var wrapId = item.id ? ' id="' + item.id + '"' : '';
      if (item.href) {
        rowsHtml += '<a href="' + item.href + '" class="' + cls + '" style="padding-left:28px;"' + wrapId + '>' + inner + '</a>';
      } else {
        rowsHtml += '<button onclick="' + item.onclick + '" class="' + cls + '" style="padding-left:28px;"' + wrapId + '>' + inner + '</button>';
      }
    });

    if (!rowsHtml) return;

    adminGroupHtml +=
      '<div class="sidebar-group-label">' +
        '<i data-lucide="' + g.icon + '" style="width:12px;height:12px;color:#a78bfa;flex-shrink:0;"></i>' +
        '<span style="font-size:10px;font-weight:800;color:#a78bfa;letter-spacing:.4px;text-transform:uppercase;">' + g.group + '</span>' +
      '</div>' +
      rowsHtml;
  });

  html +=
    '<div id="adminSidebarSection" style="display:none;">' +
      '<div class="sidebar-admin-divider"></div>' +
      '<div class="sec-label" style="color:#7c3aed;">สำหรับเจ้าหน้าที่</div>' +
      adminGroupHtml +
      /* SuperAdmin-only slot */
      '<div id="superadminSidebarSlot" style="display:none;">' +
        '<div class="sidebar-superadmin-label">' +
          '<i data-lucide="shield" style="width:10px;height:10px;color:#a78bfa;flex-shrink:0;"></i>' +
          '<span style="font-size:10px;font-weight:800;color:#a78bfa;letter-spacing:.4px;text-transform:uppercase;">SuperAdmin</span>' +
        '</div>' +
        '<a href="admin-role.html" class="sidebar-btn admin-btn' + (activePage === 'admin-role' ? ' active' : '') + '" style="padding-left:28px;">' +
          '<i data-lucide="shield-check" style="width:16px;height:16px;flex-shrink:0;' + (activePage === 'admin-role' ? '' : 'color:#7c3aed;') + '"></i>' +
          '<span>จัดการสิทธิ์ Admin</span>' +
          '<span style="margin-left:auto;font-size:9px;background:#7c3aed;color:white;padding:2px 7px;border-radius:10px;font-weight:800;flex-shrink:0;">ADMIN</span>' +
        '</a>' +
      '</div>' +
    '</div>';

  /* ── profile slot ── */
  html += '<div style="flex:1;"></div><div style="padding:4px 4px 8px;" id="sidebarProfile"></div>';

  el.innerHTML = html;
  lucide.createIcons();
}

/* ── internal helper ── */
function _sidebarBtn(item, isActive, isAdmin, isSubItem) {
  var cls = 'sidebar-btn' + (isAdmin ? ' admin-btn' : '') + (isActive ? ' active' : '');
  var indent = isSubItem ? 'padding-left:28px;' : '';
  var inner =
    '<i data-lucide="' + item.icon + '" style="width:16px;height:16px;flex-shrink:0;"></i>' +
    '<span>' + item.label + '</span>';
  if (item.href) {
    return '<a href="' + item.href + '" class="' + cls + '" style="' + indent + '">' + inner + '</a>';
  } else {
    return '<button onclick="' + item.onclick + '" class="' + cls + '" style="' + indent + '">' + inner + '</button>';
  }
}
