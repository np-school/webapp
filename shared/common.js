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

/* ════════════════════════════════
   Admin Access Check
   (หน้า index/room-booking ใช้เพื่อแสดงเมนู admin)
   ════════════════════════════════ */
function checkAdminAccess(email) {
  if (!email) return;
  db.collection('admins').doc(email.toLowerCase()).get()
    .then(function(doc) {
      if (doc.exists) {
        var sec = document.getElementById('adminSidebarSection');
        if (sec) { sec.style.display = 'block'; lucide.createIcons(); }
      }
    })
    .catch(function() {});
}

/* ════════════════════════════════
   Navbar Builder
   buildNavbar(subtitle, isPurple)
   ════════════════════════════════ */
function buildNavbar(subtitle, isPurple) {
  var nav = document.getElementById('navbar');
  if (!nav) return;
  nav.className = 'navbar' + (isPurple ? ' purple' : '');
  nav.innerHTML =
    '<div class="navbar-inner">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<button id="hamburgerBtn" onclick="openSidebar()" style="padding:8px;background:rgba(255,255,255,.15);border:none;border-radius:8px;cursor:pointer;color:white;display:flex;">' +
          '<i data-lucide="menu" style="width:20px;height:20px;"></i>' +
        '</button>' +
        '<img src="https://nongki.ac.th/np2019/img/home/logo_np.gif" alt="Logo" style="height:48px;">' +
        '<div style="border-left:1px solid rgba(255,255,255,.25);padding-left:12px;">' +
          '<div style="font-size:15px;font-weight:800;color:white;line-height:1.2;">โรงเรียนหนองกี่พิทยาคม</div>' +
          '<div style="font-size:11px;color:' + (isPurple ? '#ddd6fe' : '#bfdbfe') + ';">' + subtitle + '</div>' +
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
      '<img src="' + ph + '" style="width:38px;height:38px;border-radius:50%;border:2px solid rgba(255,255,255,.25);">' +
      '<button onclick="handleLogout()" style="padding:7px;background:rgba(255,255,255,.15);border:none;border-radius:8px;cursor:pointer;color:white;display:flex;">' +
        '<i data-lucide="log-out" style="width:18px;height:18px;"></i>' +
      '</button>' +
    '</div>';
  lucide.createIcons();
}

function resetNavUI() {
  var el = document.getElementById('userNavSection');
  if (!el) return;
  el.innerHTML =
    '<button onclick="handleLogin()" style="padding:9px 18px;background:white;color:#1d4ed8;font-weight:700;border-radius:10px;border:none;cursor:pointer;font-size:13px;">เข้าสู่ระบบด้วย Google</button>';
  lucide.createIcons();
}

/* ════════════════════════════════
   Sidebar Profile
   ════════════════════════════════ */
function updateSidebarProfile(user) {
  var ph = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=1d4ed8&color=fff';
  var el = document.getElementById('sidebarProfile');
  if (!el) return;
  el.innerHTML =
    '<div style="background:white;padding:14px 16px;border-radius:16px;border:1px solid #e2e8f0;">' +
      '<div style="display:flex;align-items:center;gap:10px;overflow:hidden;">' +
        '<img src="' + ph + '" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;">' +
        '<div style="overflow:hidden;">' +
          '<p style="font-size:12px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (user.displayName || '') + '</p>' +
          '<p style="font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (user.email || '') + '</p>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* ════════════════════════════════════════════════
   Sidebar Builder
   buildSidebar(activePage)

   activePage:
     'index'        → หน้าแรก (logged in)
     'room-booking' → หน้าจองห้อง
     'admin'        → หน้า admin (แสดง sub-tabs แทน adminSidebarSection)

   ══ วิธีเพิ่ม/แก้เมนู แก้ที่นี่ที่เดียว ══

   MAIN_MENU / SERVICE_MENU
     { label, icon, href }      → ลิงก์
     { label, icon, onclick }   → ปุ่ม JS

   ADMIN_TABS (เฉพาะหน้า admin)
     { id, label, icon }
     id ตรงกับ switchTab(id) ใน admin.html
   ════════════════════════════════════════════════ */

var MAIN_MENU = [
  { label: 'หน้าแรก', icon: 'home', href: 'index.html' },
];

var SERVICE_MENU = [
  { label: 'ระบบขอใช้ห้อง/สถานที่', icon: 'calendar', href: 'room-booking.html' },
  { label: 'ระบบขอใช้ข้อมูล CCTV',  icon: 'monitor',  onclick: "showToast('ระบบนี้อยู่ระหว่างพัฒนา','warn')" },
];

var ADMIN_TABS = [
  { id: 'bookings', label: 'คำขอทั้งหมด', icon: 'layout-list' },
  { id: 'rooms',    label: 'จัดการห้อง',   icon: 'door-open'   },
  { id: 'admins',   label: 'จัดการ Admin',  icon: 'shield'      },
];

function buildSidebar(activePage) {
  var el = document.getElementById('sidebarInner');
  if (!el) return;

  var isAdminPage = activePage === 'admin';

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
    var active = activePage === key || (activePage === 'index' && key === 'index');
    html += _sidebarBtn(item, active, false);
  });

  /* ── บริการออนไลน์ ── */
  html += '<div class="sec-label" style="margin-top:6px;">บริการออนไลน์</div>';
  SERVICE_MENU.forEach(function(item) {
    var key = item.href ? item.href.replace('.html', '') : '';
    html += _sidebarBtn(item, activePage === key, false);
  });

  /* ── Admin section ── */
  if (isAdminPage) {
    /* หน้า admin: แสดง sub-tabs โดยตรง ไม่ต้องซ่อน */
    html += '<div style="margin:12px 16px;height:1px;background:#e9d5ff;"></div>';
    html += '<div class="sec-label" style="color:#7c3aed;">สำหรับเจ้าหน้าที่</div>';
    ADMIN_TABS.forEach(function(tab) {
      var active = tab.id === 'bookings'; /* default active = bookings */
      var cls = 'sidebar-btn admin-btn' + (active ? ' active' : '');
      html +=
        '<button onclick="switchTab(\'' + tab.id + '\',this)" id="sbtn-' + tab.id + '" class="' + cls + '">' +
          '<i data-lucide="' + tab.icon + '" style="width:19px;height:19px;flex-shrink:0;' + (active ? '' : 'color:#7c3aed;') + '"></i>' +
          '<span>' + tab.label + '</span>' +
          (tab.id === 'bookings'
            ? '<span style="margin-left:auto;font-size:9px;background:#7c3aed;color:white;padding:2px 7px;border-radius:10px;font-weight:800;flex-shrink:0;">ADMIN</span>'
            : '') +
        '</button>';
    });
  } else {
    /* หน้าอื่น: แสดงลิงก์ไป admin.html ซ่อนไว้ก่อน (checkAdminAccess จะเปิด) */
    html +=
      '<div id="adminSidebarSection" style="display:none;">' +
        '<div style="margin:12px 16px;height:1px;background:#e9d5ff;"></div>' +
        '<div class="sec-label" style="color:#7c3aed;">สำหรับเจ้าหน้าที่</div>' +
        '<a href="admin.html" class="sidebar-btn admin-btn">' +
          '<i data-lucide="shield" style="width:19px;height:19px;flex-shrink:0;color:#7c3aed;"></i>' +
          '<span>จัดการระบบจอง</span>' +
          '<span style="margin-left:auto;font-size:9px;background:#7c3aed;color:white;padding:2px 7px;border-radius:10px;font-weight:800;flex-shrink:0;">ADMIN</span>' +
        '</a>' +
      '</div>';
  }

  /* ── profile slot ── */
  html += '<div style="flex:1;"></div><div style="padding:4px 4px 8px;" id="sidebarProfile"></div>';

  el.innerHTML = html;
  lucide.createIcons();
}

/* ── internal helper ── */
function _sidebarBtn(item, isActive, isAdmin) {
  var cls = 'sidebar-btn' + (isAdmin ? ' admin-btn' : '') + (isActive ? ' active' : '');
  var inner =
    '<i data-lucide="' + item.icon + '" style="width:19px;height:19px;flex-shrink:0;"></i>' +
    '<span>' + item.label + '</span>';
  if (item.href) {
    return '<a href="' + item.href + '" class="' + cls + '">' + inner + '</a>';
  } else {
    return '<button onclick="' + item.onclick + '" class="' + cls + '">' + inner + '</button>';
  }
}
