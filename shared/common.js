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

  /* LINE / In-App Browser → redirect ไม่ทำงาน บล็อกเลย */
  if (isInAppBrowser()) {
    if (ov) ov.style.display = 'none';
    _showOpenInBrowserAlert();
    return;
  }

  /* ใช้ redirect แทน popup เพื่อรองรับ mobile browser ทุกตัว */
  auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider())
    .catch(function(e) {
      console.error(e);
      if (ov) ov.style.display = 'none';
      showToast('เข้าสู่ระบบไม่สำเร็จ: ' + e.message, 'error');
    });
}

/* รับผล redirect กลับมา — เรียกครั้งเดียวตอนโหลดหน้า */
function handleRedirectResult() {
  if (isInAppBrowser()) return; /* ไม่ต้องรอใน in-app browser */
  auth.getRedirectResult()
    .then(function(result) {
      /* result.user จะมีค่าถ้า redirect login สำเร็จ — onAuthStateChanged จัดการต่อ */
      if (result && result.user) {
        console.log('Redirect login success:', result.user.email);
      }
    })
    .catch(function(e) {
      console.error('Redirect result error:', e);
      /* auth/web-storage-unsupported = Safari ITP บล็อก 3rd-party cookie */
      if (e.code === 'auth/web-storage-unsupported' || e.code === 'auth/operation-not-supported-in-this-environment') {
        showToast('เบราว์เซอร์ไม่รองรับการล็อกอิน กรุณาใช้ Chrome หรือ Safari', 'error');
      }
    });
}

/* แสดง alert แนะนำให้เปิดใน browser จริง */
function _showOpenInBrowserAlert() {
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPod|iPad/.test(ua);
  var currentUrl = window.location.href;

  /* สร้าง overlay */
  var overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(15,23,42,.7);z-index:99999;' +
    'display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(4px);';

  var steps = isIOS
    ? '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;text-align:left;">' +
        '<div style="width:22px;height:22px;background:#1d4ed8;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">1</div>' +
        '<p style="font-size:13px;color:#334155;line-height:1.6;">กดปุ่ม <strong>··· (สามจุด)</strong> มุมขวาบนของ LINE</p></div>' +
        '<div style="display:flex;align-items:flex-start;gap:10px;text-align:left;">' +
        '<div style="width:22px;height:22px;background:#1d4ed8;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">2</div>' +
        '<p style="font-size:13px;color:#334155;line-height:1.6;">เลือก <strong>"เปิดใน Safari"</strong></p></div>'
    : '<div style="display:flex;align-items:flex-start;gap:10px;text-align:left;">' +
        '<div style="width:22px;height:22px;background:#1d4ed8;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">1</div>' +
        '<p style="font-size:13px;color:#334155;line-height:1.6;">กดปุ่ม <strong>··· (สามจุด)</strong> แล้วเลือก <strong>"เปิดใน Chrome"</strong></p></div>';

  overlay.innerHTML =
    '<div style="background:white;border-radius:20px;padding:28px 24px;max-width:360px;width:100%;text-align:center;">' +
      '<div style="width:60px;height:60px;background:#eff6ff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
      '</div>' +
      '<h2 style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:8px;">กรุณาเปิดในเบราว์เซอร์</h2>' +
      '<p style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:20px;">ระบบล็อกอิน Google ไม่รองรับการเปิดผ่าน LINE Browser</p>' +
      '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:20px;">' + steps + '</div>' +
      '<button id="_copyLinkBtn" style="width:100%;padding:12px;background:#1d4ed8;color:white;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:10px;">📋 คัดลอกลิงก์</button>' +
      '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="width:100%;padding:10px;background:#f1f5f9;color:#64748b;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">ปิด</button>' +
    '</div>';

  document.body.appendChild(overlay);

  document.getElementById('_copyLinkBtn').addEventListener('click', function() {
    var btn = this;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl).then(function() {
        btn.textContent = '✓ คัดลอกแล้ว!';
        btn.style.background = '#16a34a';
      });
    } else {
      /* fallback */
      var ta = document.createElement('textarea');
      ta.value = currentUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      btn.textContent = '✓ คัดลอกแล้ว!';
      btn.style.background = '#16a34a';
    }
  });
}

function handleLogout() {
  var ov = document.getElementById('loadingOverlay');
  if (ov) ov.style.display = 'flex';
  auth.signOut().then(function() {
    window.location.href = 'index.html';
  });
}

/* เรียก handleRedirectResult() ใน onAuthStateChanged ของแต่ละหน้า
   ตัวอย่าง (วางไว้ก่อน auth.onAuthStateChanged):
   ─────────────────────────────────────────────
   handleRedirectResult();
   auth.onAuthStateChanged(function(user) { ... });
   ───────────────────────────────────────────── */

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
        '<a href="https://2022.nongki.ac.th/" target="_blank" rel="noopener" style="display:flex;align-items:center;flex-shrink:0;">' +
          '<img src="https://firebasestorage.googleapis.com/v0/b/np-webapp-74616.firebasestorage.app/o/img%2Flogo_np.gif?alt=media&token=caa0869b-c98f-4ad3-8ee9-930e8789602e" alt="โรงเรียนหนองกี่พิทยาคม" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.3);">' +
        '</a>' +
        '<a href="index.html" style="display:flex;align-items:center;flex-shrink:0;">' +
          '<img src="https://firebasestorage.googleapis.com/v0/b/np-webapp-74616.firebasestorage.app/o/img%2Flogo_nporigins.png?alt=media&token=7ad2b246-5cd4-40f8-b28f-69d47ae16e70" alt="NP Origins" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.3);">' +
        '</a>' +
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
      '<div style="display:flex;align-items:center;gap:7px;padding:6px 14px 3px;margin-top:2px;">' +
        '<i data-lucide="' + g.icon + '" style="width:12px;height:12px;color:#94a3b8;flex-shrink:0;"></i>' +
        '<span style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:.4px;text-transform:uppercase;">' + g.group + '</span>' +
      '</div>';
    if (!g.items.length) {
      html += '<div style="padding:5px 14px 4px 36px;font-size:11px;color:#cbd5e1;font-style:italic;">อยู่ระหว่างพัฒนา</div>';
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
      '<div style="display:flex;align-items:center;gap:7px;padding:6px 14px 3px;margin-top:2px;">' +
        '<i data-lucide="' + g.icon + '" style="width:12px;height:12px;color:#a78bfa;flex-shrink:0;"></i>' +
        '<span style="font-size:10px;font-weight:800;color:#a78bfa;letter-spacing:.4px;text-transform:uppercase;">' + g.group + '</span>' +
      '</div>' +
      rowsHtml;
  });

  html +=
    '<div id="adminSidebarSection" style="display:none;">' +
      '<div style="margin:12px 16px;height:1px;background:#e9d5ff;"></div>' +
      '<div class="sec-label" style="color:#7c3aed;">สำหรับเจ้าหน้าที่</div>' +
      adminGroupHtml +
      /* SuperAdmin-only slot */
      '<div id="superadminSidebarSlot" style="display:none;">' +
        '<div style="margin:8px 16px 4px;display:flex;align-items:center;gap:6px;">' +
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
