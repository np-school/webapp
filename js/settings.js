/* ══════════════════════ STATE ══════════════════════ */
/* ══════════════════════════════════════
   ธีมสีทั้งเว็บ — แอดมิน (SuperAdmin) เท่านั้นที่แก้ได้
   บันทึกที่ site_config/theme ใน Firestore แล้ว common.js
   (applySiteThemeColors) จะดึงไปใช้ในทุกหน้าอัตโนมัติ
   ══════════════════════════════════════ */
var THEME_ROLES = {
  member: { label: 'ผู้ใช้งานทั่วไป', desc: 'navTheme: blue · หน้าสมาชิก/นักเรียน', fallback: '#1d4ed8' },
  staff:  { label: 'เจ้าหน้าที่',      desc: 'navTheme: dark · หน้าแอดมิน/เจ้าหน้าที่', fallback: '#0d1b2a' },
};
var SHADE_SLOTS = [
  { key: 'primary', label: 'หลัก',     hint: 'navbar, ปุ่มหลัก' },
  { key: 'dark',    label: 'เข้ม',     hint: 'ตอนชี้เมาส์ (hover)' },
  { key: 'light',   label: 'อ่อน',     hint: 'เส้นขอบ, ไอคอนรอง' },
  { key: 'tint',    label: 'พื้นหลัง', hint: 'พื้นการ์ด/badge อ่อนๆ' }
];

/* ══ Announcement helpers ══ */
var ANN_TYPES = {
  info:    { label: 'ข้อมูล',   icon: 'info',           iconColor: '#1d4ed8', badgeClass: 'ann-badge-info',    wrapClass: 'ann-type-info' },
  warning: { label: 'แจ้งเตือน', icon: 'alert-triangle', iconColor: '#d97706', badgeClass: 'ann-badge-warning', wrapClass: 'ann-type-warning' },
  success: { label: 'ข่าวดี',   icon: 'check-circle-2', iconColor: '#16a34a', badgeClass: 'ann-badge-success', wrapClass: 'ann-type-success' },
  urgent:  { label: 'ด่วน',     icon: 'bell-ring',       iconColor: '#dc2626', badgeClass: 'ann-badge-urgent',  wrapClass: 'ann-type-urgent' },
};
var currentUserEmail = null;
var isAdmin          = false;
var isSuperAdmin      = false;
var siteThemeConfig  = {};  /* { member:{primary,dark,light,tint}, staff:{...} } จาก site_config/theme */

/* ══ Announcement Modal (extended) ══
   ฟิลด์: scope, startDate, endDate, noExpiry, department, imageUrl
   (order ไม่แสดง UI — ใช้ createdAt เรียงลำดับเบื้องหลัง) */

var annEditId      = null;
var annImgFile_obj = null;   /* File รอ upload */
var annImgExistUrl = '';

/* ══════════════════════ DATA LOADING ══════════════════════ */
function loadAnnouncements() {
  var wrap = document.getElementById('annListWrap');
  if (!wrap) return;
  wrap.innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--text3);font-size:13px;">กำลังโหลด...</div>';
  db.collection('announcements').orderBy('createdAt','desc').limit(50).get()
    .then(function(snap) {
      if (snap.empty) {
        wrap.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text3);font-size:13px;">ยังไม่มีประกาศ</div>';
        return;
      }
      wrap.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;">';
      var html = '';
      snap.forEach(function(doc) {
        var d = doc.data(); var t = ANN_TYPES[d.type] || ANN_TYPES.info;
        var date = '';
        try { date = (d.createdAt.toDate()).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}); } catch(e){}
        html += '<div class="ann-card" style="' + (d.active ? '' : 'opacity:.5;') + '">' +
          '<div class="ann-icon-wrap ' + t.wrapClass + '">' +
            '<i data-lucide="' + t.icon + '" style="width:18px;height:18px;color:' + t.iconColor + ';"></i>' +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">' +
              '<span class="ann-badge ' + t.badgeClass + '">' + t.label + '</span>' +
              (d.active ? '' : '<span class="ann-badge" style="background:var(--bg-alt);color:var(--text3);">ซ่อนอยู่</span>') +
              '<span style="font-size:11px;color:var(--text3);margin-left:auto;">' + date + '</span>' +
            '</div>' +
            '<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;">' + (d.title||'') + '</div>' +
            (d.body ? '<div style="font-size:13px;color:var(--text2);line-height:1.6;">' + (d.body||'') + '</div>' : '') +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">' +
            '<button onclick="openAnnModal(\'' + doc.id + '\')" style="padding:6px 10px;background:var(--bg-alt);border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--text-mid);font-family:Sarabun,sans-serif;">' +
              '<i data-lucide="edit-3" style="width:12px;height:12px;"></i> แก้ไข' +
            '</button>' +
            '<button onclick="toggleAnnActive(\'' + doc.id + '\',' + d.active + ')" style="padding:6px 10px;background:' + (d.active ? 'var(--orange-light)' : '#f0fdf4') + ';border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:' + (d.active ? 'var(--amber-dark)' : '#15803d') + ';font-family:Sarabun,sans-serif;">' +
              '<i data-lucide="' + (d.active ? 'eye-off' : 'eye') + '" style="width:12px;height:12px;"></i> ' + (d.active ? 'ซ่อน' : 'แสดง') +
            '</button>' +
            '<button onclick="deleteAnn(\'' + doc.id + '\')" style="padding:6px 10px;background:var(--red-light);border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--red-dark);font-family:Sarabun,sans-serif;">' +
              '<i data-lucide="trash-2" style="width:12px;height:12px;"></i> ลบ' +
            '</button>' +
          '</div>' +
        '</div>';
      });
      wrap.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;">' + html + '</div>';
      lucide.createIcons();
    })
    .catch(function() { wrap.innerHTML = '<div style="text-align:center;padding:32px;color:var(--red-bright);font-size:13px;">โหลดข้อมูลไม่ได้</div>'; });
}

/* ══════════════════════ RENDER ══════════════════════ */
/* ─── setAnnType ─── */
function setAnnType(type) {
  document.querySelectorAll('[name="annType"]').forEach(function(r) { r.checked = (r.value === type); });
  document.querySelectorAll('.ann-type-opt').forEach(function(el) {
    el.className = 'ann-type-opt' + (el.dataset.type === type ? ' sel-' + type : '');
  });
}

/* ─── setAnnScope ─── */
function setAnnScope(scope) {
  document.querySelectorAll('[name="annScope"]').forEach(function(r) { r.checked = (r.value === scope); });
  document.querySelectorAll('.ann-scope-opt').forEach(function(el) {
    el.className = 'ann-scope-opt' + (el.dataset.scope === scope ? ' sel-' + scope : '');
  });
}

/* ══ Render ══ */
function renderPage() {
  var showAnnTab = isAdmin;
  return (
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title-row">' +
          '<div class="page-icon blue">' +
            '<i data-lucide="settings-2" style="width:20px;height:20px;color:white;"></i>' +
          '</div>' +
          '<h1 class="page-title">ตั้งค่า</h1>' +
        '</div>' +
        '<p class="page-sub">จัดการการตั้งค่าระบบ</p>' +
      '</div>' +
    '</div>' +

    '<div class="sub-tab-bar" id="settingsSubtabBar">' +
      '<button class="sub-tab active" data-tab="theme">' +
        '<i data-lucide="palette" style="width:14px;height:14px;"></i> ธีมสี' +
      '</button>' +
      (showAnnTab ?
        '<button class="sub-tab" data-tab="announcements">' +
          '<i data-lucide="bell" style="width:14px;height:14px;"></i> ประกาศข่าว' +
        '</button>' : '') +
    '</div>' +

    '<div class="tab-pane active" data-panel="theme">' +
      '<div class="settings-section-title">ธีมสีเว็บไซต์</div>' +
      (isSuperAdmin ? renderThemeEditor() : renderThemeReadOnly()) +
    '</div>' +

    (showAnnTab ?
      '<div class="tab-pane" data-panel="announcements">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">' +
          '<div class="settings-section-title" style="margin-bottom:0;">ประกาศข่าวสำหรับ Admin</div>' +
          '<button onclick="openAnnModal(null)" style="display:flex;align-items:center;gap:7px;padding:9px 16px;background:var(--accent,var(--blue));color:white;font-weight:700;border:none;border-radius:12px;cursor:pointer;font-size:13px;font-family:Sarabun,sans-serif;">' +
            '<i data-lucide="plus" style="width:14px;height:14px;"></i> เพิ่มประกาศ' +
          '</button>' +
        '</div>' +
        '<div id="annListWrap"><div style="text-align:center;padding:40px;color:var(--text3);font-size:13px;">คลิกแท็บนี้เพื่อโหลดประกาศ</div></div>' +
      '</div>' : '')
  );
}

/* ดึงชุดสี 4 ระดับของ role นั้นๆ — ถ้ายังไม่เคยตั้ง (หรือเป็นข้อมูลเก่าแบบ 1 สี) ให้คำนวณ default */
function getRoleShades(roleKey) {
  var set = siteThemeConfig[roleKey];
  if (set && set.primary) return set;
  var legacy = siteThemeConfig[roleKey + 'Accent']; /* เผื่อข้อมูลเก่า memberAccent/staffAccent */
  return computeShades(legacy || THEME_ROLES[roleKey].fallback);
}

/* ══ ธีมสีทั้งเว็บ — read-only (ผู้ใช้ทั่วไป/แอดมินธรรมดา) ══ */
function renderThemeReadOnly() {
  return (
    '<p style="font-size:13px;color:var(--text2,var(--text2));margin-bottom:16px;">สีของเว็บไซต์ถูกกำหนดโดยผู้ดูแลระบบส่วนกลาง ใช้ค่าเดียวกันทุกหน้า/ทุกผู้ใช้</p>' +
    '<div style="display:flex;gap:16px;flex-wrap:wrap;">' +
      ['member', 'staff'].map(function(roleKey) {
        var shades = getRoleShades(roleKey);
        var meta = THEME_ROLES[roleKey];
        return (
          '<div style="padding:14px 18px;border:1px solid var(--border,var(--border));border-radius:14px;min-width:230px;">' +
            '<div style="font-weight:700;font-size:13px;color:var(--text);">' + meta.label + '</div>' +
            '<div style="font-size:11px;color:var(--text3);margin-bottom:10px;">' + meta.desc + '</div>' +
            '<div style="display:flex;gap:6px;">' +
              SHADE_SLOTS.map(function(slot) {
                return '<div title="' + slot.label + ' (' + slot.hint + '): ' + shades[slot.key] + '" style="width:32px;height:32px;border-radius:8px;background:' + shades[slot.key] + ';box-shadow:0 2px 6px rgba(0,0,0,.12);"></div>';
              }).join('') +
            '</div>' +
          '</div>'
        );
      }).join('') +
    '</div>'
  );
}

/* ══ ธีมสีทั้งเว็บ — editor (SuperAdmin เท่านั้น) ══
   Flow: กรอก "สีหลัก" → กด "สร้างเฉดอัตโนมัติ" ได้ 4 สี (หลัก/เข้ม/อ่อน/พื้นหลัง)
   เป็นค่าเริ่มต้น แล้วปรับทีละสีต่อได้อิสระ พร้อม preview สดใน mockup การ์ด */
function renderThemeEditor() {
  return (
    '<p style="font-size:13px;color:var(--text2,var(--text2));margin-bottom:18px;">กรอกสีหลักแล้วกด "สร้างเฉดอัตโนมัติ" เพื่อได้ชุดสี 4 ระดับ จากนั้นปรับแต่ละสีเพิ่มเติมได้ตามต้องการ</p>' +
    '<div class="theme-cards-row" style="max-width:none;grid-template-columns:1fr 1fr;">' +
      ['member', 'staff'].map(renderThemeEditorCard).join('') +
    '</div>' +
    '<button onclick="saveSiteTheme()" id="saveThemeBtn" style="margin-top:20px;padding:11px 24px;background:var(--accent);color:white;font-weight:700;border:none;border-radius:12px;cursor:pointer;font-size:13px;font-family:Sarabun,sans-serif;">บันทึกสีทั้งเว็บ</button>'
  );
}

function renderThemeEditorCard(roleKey) {
  var meta   = THEME_ROLES[roleKey];
  var shades = getRoleShades(roleKey);
  return (
    '<div style="border:1px solid var(--border,var(--border));border-radius:14px;overflow:hidden;">' +
      /* live preview mockup */
      '<div id="preview-navbar-' + roleKey + '" class="theme-navbar-strip" style="background:' + shades.primary + ';">' +
        '<div class="strip-circle"></div>' +
        '<div class="strip-lines"><div class="strip-line"></div><div class="strip-line short"></div></div>' +
        '<div class="strip-btn"></div>' +
      '</div>' +
      '<div class="theme-body-mock">' +
        '<div class="mock-sidebar"><div class="mock-sb-item"></div><div class="mock-sb-item"></div><div class="mock-sb-item"></div></div>' +
        '<div class="mock-content">' +
          '<div id="preview-btn-' + roleKey + '" class="mock-btn" style="background:' + shades.primary + ';"></div>' +
          '<div class="mock-line"></div><div class="mock-line s"></div>' +
        '</div>' +
      '</div>' +
      '<div style="padding:14px 16px;border-top:1px solid var(--border,var(--border));">' +
        '<div style="font-weight:700;font-size:13px;color:var(--text);">' + meta.label + '</div>' +
        '<div style="font-size:11px;color:var(--text3);margin-bottom:12px;">' + meta.desc + '</div>' +

        /* สีหลัก + ปุ่มสร้างเฉดอัตโนมัติ */
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
          '<input type="color" id="color-' + roleKey + '-primary" value="' + shades.primary + '" oninput="onShadeInput(\'' + roleKey + '\',\'primary\')" style="width:38px;height:38px;border:none;border-radius:9px;cursor:pointer;padding:0;background:none;">' +
          '<input type="text" id="hex-' + roleKey + '-primary" value="' + shades.primary + '" oninput="onShadeHexInput(\'' + roleKey + '\',\'primary\')" maxlength="7" style="width:82px;padding:7px 9px;border:1px solid var(--border,var(--border));border-radius:8px;font-size:11px;font-family:monospace;text-transform:uppercase;">' +
          '<button onclick="autoGenerateShades(\'' + roleKey + '\')" title="สร้างเฉดอัตโนมัติจากสีหลัก" style="margin-left:auto;padding:7px 10px;border:1px solid var(--border,var(--border));background:var(--bg);border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;color:var(--text2,var(--text2));font-family:Sarabun,sans-serif;">↻ สร้างเฉดอัตโนมัติ</button>' +
        '</div>' +

        /* dark / light / tint แก้ทีละสี */
        '<div style="display:flex;gap:8px;">' +
          ['dark', 'light', 'tint'].map(function(slotKey) {
            var slot = SHADE_SLOTS.filter(function(s) { return s.key === slotKey; })[0];
            return (
              '<div style="flex:1;">' +
                '<div style="font-size:10px;color:var(--text3);font-weight:700;margin-bottom:2px;">' + slot.label + '</div>' +
                '<div style="font-size:9px;color:var(--border-mid);margin-bottom:4px;">' + slot.hint + '</div>' +
                '<input type="color" id="color-' + roleKey + '-' + slotKey + '" value="' + shades[slotKey] + '" oninput="onShadeInput(\'' + roleKey + '\',\'' + slotKey + '\')" style="width:100%;height:30px;border:none;border-radius:7px;cursor:pointer;padding:0;background:none;">' +
              '</div>'
            );
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function onShadeInput(roleKey, slotKey) {
  var v = document.getElementById('color-' + roleKey + '-' + slotKey).value;
  if (slotKey === 'primary') document.getElementById('hex-' + roleKey + '-primary').value = v;
  updateThemePreview(roleKey);
}
function onShadeHexInput(roleKey, slotKey) {
  var v = document.getElementById('hex-' + roleKey + '-' + slotKey).value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    document.getElementById('color-' + roleKey + '-' + slotKey).value = v;
    updateThemePreview(roleKey);
  }
}
/* สร้างเฉด dark/light/tint ใหม่จากสีหลักที่กรอกอยู่ตอนนี้ */
function autoGenerateShades(roleKey) {
  var primary = document.getElementById('hex-' + roleKey + '-primary').value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(primary)) { showToast('สีหลักไม่ถูกต้อง (ต้องเป็น #RRGGBB)'); return; }
  var shades = computeShades(primary);
  ['dark', 'light', 'tint'].forEach(function(slotKey) {
    document.getElementById('color-' + roleKey + '-' + slotKey).value = shades[slotKey];
  });
  updateThemePreview(roleKey);
}
function readShadesFromForm(roleKey) {
  var out = {};
  var hexRe = /^#[0-9a-fA-F]{6}$/;
  for (var i = 0; i < SHADE_SLOTS.length; i++) {
    var key = SHADE_SLOTS[i].key;
    var v = document.getElementById('color-' + roleKey + '-' + key).value.trim();
    if (!hexRe.test(v)) return null;
    out[key] = v;
  }
  return out;
}
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════ EVENT HANDLERS ══════════════════════ */
     /* URL เดิม (กรณี edit) */

/* ─── openAnnModal ─── */
function openAnnModal(id) {
  annEditId      = id || null;
  annImgFile_obj = null;

  document.getElementById('annModalTitle').textContent = id ? 'แก้ไขประกาศ' : 'เพิ่มประกาศใหม่';
  document.getElementById('annModalSub').textContent   = id ? 'แก้ไขข้อมูลประกาศที่มีอยู่' : 'กรอกข้อมูลและบันทึกประกาศใหม่';

  if (!id) {
    document.getElementById('annTitle').value     = '';
    document.getElementById('annBody').value      = '';
    document.getElementById('annActive').checked  = true;
    document.getElementById('annStartDate').value = '';
    document.getElementById('annEndDate').value   = '';
    document.getElementById('annNoExpiry').checked = false;
    document.getElementById('annDeptSelect').value = '';
    document.getElementById('annDeptOther').value  = '';
    document.getElementById('annDeptOther').style.display = 'none';
    toggleNoExpiry(false);
    setAnnType('info');
    setAnnScope('external');
    resetAnnImage();
    annImgExistUrl = '';
  } else {
    db.collection('announcements').doc(id).get().then(function(doc) {
      if (!doc.exists) return;
      var d = doc.data();
      document.getElementById('annTitle').value    = d.title  || '';
      document.getElementById('annBody').value     = d.body   || '';
      document.getElementById('annActive').checked = d.active !== false;
      setAnnType(d.type   || 'info');
      setAnnScope(d.scope || 'external');

      var noExpiry = d.noExpiry === true || (!d.startDate && !d.endDate);
      document.getElementById('annNoExpiry').checked = noExpiry;
      toggleNoExpiry(noExpiry);
      if (!noExpiry) {
        document.getElementById('annStartDate').value = d.startDate || '';
        document.getElementById('annEndDate').value   = d.endDate   || '';
      }

      var dept    = d.department || '';
      var stdOpts = ['ฝ่ายบริหาร','งานวิชาการ','งานบุคคล','งานการเงิน','งานพัสดุ','งานอาคารสถานที่','งานปกครอง','งานแนะแนว','งานสัมพันธ์ชุมชน','งานสารสนเทศ'];
      if (dept && stdOpts.indexOf(dept) === -1) {
        document.getElementById('annDeptSelect').value = 'other';
        document.getElementById('annDeptOther').value  = dept;
        document.getElementById('annDeptOther').style.display = 'block';
      } else {
        document.getElementById('annDeptSelect').value = dept;
        document.getElementById('annDeptOther').style.display = 'none';
      }

      annImgExistUrl = d.imageUrl || '';
      if (annImgExistUrl) {
        document.getElementById('annImgPreview').src = annImgExistUrl;
        document.getElementById('annImgPreview').style.display = 'block';
        document.getElementById('annImgDrop').classList.add('has-file');
        document.getElementById('annImgName').textContent    = 'รูปภาพที่มีอยู่';
        document.getElementById('annImgName').style.display  = 'block';
      } else {
        resetAnnImage();
      }
      lucide.createIcons();
    });
  }

  openModal('annModal');
  lucide.createIcons();
}

function closeAnnModal() { closeModal('annModal'); }

/* ─── toggleNoExpiry ─── */
function toggleNoExpiry(checked) {
  var row = document.getElementById('annDateRow');
  if (!row) return;
  row.style.opacity      = checked ? '.35' : '1';
  row.style.pointerEvents = checked ? 'none' : '';
  if (checked) {
    document.getElementById('annStartDate').value = '';
    document.getElementById('annEndDate').value   = '';
  }
}

/* ─── onDeptChange ─── */
function onDeptChange(val) {
  var other = document.getElementById('annDeptOther');
  other.style.display = (val === 'other') ? 'block' : 'none';
  if (val !== 'other') other.value = '';
}

/* ─── Image helpers ─── */
function handleAnnImage(evt) {
  var file = evt.target.files && evt.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('รูปภาพต้องไม่เกิน 5 MB', 'error'); return; }
  annImgFile_obj = file;
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('annImgPreview').src = e.target.result;
    document.getElementById('annImgPreview').style.display = 'block';
    document.getElementById('annImgDrop').classList.add('has-file');
    document.getElementById('annImgName').textContent   = file.name;
    document.getElementById('annImgName').style.display = 'block';
    annImgExistUrl = '';
    lucide.createIcons();
  };
  reader.readAsDataURL(file);
}
function removeAnnImage(evt) {
  evt.stopPropagation();
  resetAnnImage();
  annImgExistUrl = '';
  annImgFile_obj = null;
}
function resetAnnImage() {
  document.getElementById('annImgFile').value = '';
  document.getElementById('annImgPreview').src = '';
  document.getElementById('annImgPreview').style.display = 'none';
  document.getElementById('annImgDrop').classList.remove('has-file');
  document.getElementById('annImgName').style.display = 'none';
  document.getElementById('annImgName').textContent = '';
}

/* ─── saveAnn ─── */
function saveAnn() {
  var title     = (document.getElementById('annTitle').value    || '').trim();
  var body      = (document.getElementById('annBody').value     || '').trim();
  var active    = document.getElementById('annActive').checked;
  var noExpiry  = document.getElementById('annNoExpiry').checked;
  var startDate = noExpiry ? '' : (document.getElementById('annStartDate').value || '');
  var endDate   = noExpiry ? '' : (document.getElementById('annEndDate').value   || '');
  var typeEl    = document.querySelector('[name="annType"]:checked');
  var type      = typeEl ? typeEl.value : 'info';
  var scopeEl   = document.querySelector('[name="annScope"]:checked');
  var scope     = scopeEl ? scopeEl.value : 'external';
  var deptSel   = document.getElementById('annDeptSelect').value;
  var department = (deptSel === 'other')
    ? (document.getElementById('annDeptOther').value || '').trim()
    : deptSel;

  if (!title)      { showToast('กรุณากรอกชื่อเรื่อง', 'error'); return; }
  if (!department) { showToast('กรุณาเลือกฝ่าย/หน่วยงาน', 'error'); return; }
  if (!noExpiry && startDate && endDate && endDate < startDate) {
    showToast('วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่ม', 'error'); return;
  }

  var btn = document.getElementById('annSaveBtn');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2" style="width:15px;height:15px;"></i> กำลังบันทึก...';
  lucide.createIcons();

  var data = {
    title: title, body: body, type: type,
    scope: scope, active: active, noExpiry: noExpiry,
    startDate: startDate, endDate: endDate, department: department,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  function doSave(imageUrl) {
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    else if (annImgExistUrl)   data.imageUrl = annImgExistUrl;

    var p = annEditId
      ? db.collection('announcements').doc(annEditId).update(data)
      : db.collection('announcements').add(Object.assign({}, data, {
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: (typeof currentUserEmail !== 'undefined' ? currentUserEmail : '')
        }));
    p.then(function() {
      showToast(annEditId ? 'แก้ไขประกาศแล้ว' : 'เพิ่มประกาศใหม่แล้ว');
      closeAnnModal();
      loadAnnouncements();
    }).catch(function(e) {
      showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    }).finally(function() {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="save" style="width:15px;height:15px;"></i> บันทึก';
      lucide.createIcons();
    });
  }

  if (annImgFile_obj && storage) {
    var ext   = annImgFile_obj.name.split('.').pop();
    var fname = 'announcements/' + Date.now() + '.' + ext;
    var ref   = storage.ref(fname);
    ref.put(annImgFile_obj)
      .then(function() { return ref.getDownloadURL(); })
      .then(function(url) { doSave(url); })
      .catch(function(e) {
        showToast('อัปโหลดรูปไม่ได้: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" style="width:15px;height:15px;"></i> บันทึก';
        lucide.createIcons();
      });
  } else {
    doSave(undefined);
  }
}

/* ─── Click handlers (scope + type radios) ─── */
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.ann-type-opt').forEach(function(el) {
    el.addEventListener('click', function() { setAnnType(el.dataset.type); });
  });
  document.querySelectorAll('.ann-scope-opt').forEach(function(el) {
    el.addEventListener('click', function() { setAnnScope(el.dataset.scope); });
  });
});

function deleteAnn(id) {
  if (!confirm('ลบประกาศนี้?')) return;
  db.collection('announcements').doc(id).delete()
    .then(function() { showToast('ลบประกาศแล้ว'); loadAnnouncements(); })
    .catch(function(e) { showToast('เกิดข้อผิดพลาด','error'); });
}

function toggleAnnActive(id, current) {
  db.collection('announcements').doc(id).update({ active: !current, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
    .then(function() { showToast(!current ? 'เปิดใช้งานแล้ว' : 'ปิดการแสดงผลแล้ว'); loadAnnouncements(); });
}

/* อัปเดต mockup preview สดๆ ตามค่าที่กำลังกรอก (ยังไม่ได้บันทึก)
   navbar และปุ่ม ในเว็บจริงใช้สี "หลัก" (primary) เหมือนกัน ส่วนสี "เข้ม" มีผลแค่ตอน hover
   ทำให้ preview ตรงกับพฤติกรรมจริง ไม่ใช่ผูกกับสีเข้มแบบเดิม */
function updateThemePreview(roleKey) {
  var primary = document.getElementById('color-' + roleKey + '-primary').value;
  document.getElementById('preview-navbar-' + roleKey).style.background = primary;
  document.getElementById('preview-btn-' + roleKey).style.background    = primary;
}
function saveSiteTheme() {
  var member = readShadesFromForm('member');
  var staff  = readShadesFromForm('staff');
  if (!member || !staff) {
    showToast('รูปแบบสีไม่ถูกต้อง (ต้องเป็น #RRGGBB)');
    return;
  }
  var btn = document.getElementById('saveThemeBtn');
  btn.disabled = true;
  btn.textContent = 'กำลังบันทึก...';
  db.collection('site_config').doc('theme').set({
    member:       member,
    staff:        staff,
    updatedAt:    firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy:    currentUserEmail
  }, { merge: true }).then(function() {
    siteThemeConfig = { member: member, staff: staff };
    /* preview สีทันทีในหน้านี้ (settings.html ใช้ navTheme:'blue' เสมอ) */
    if (typeof applySiteThemeColors === 'function') applySiteThemeColors('blue');
    try { localStorage.setItem('np_site_theme_cache', JSON.stringify(siteThemeConfig)); } catch (e) {}
    showToast('บันทึกสีทั้งเว็บเรียบร้อย');
  }).catch(function(err) {
    showToast('บันทึกไม่สำเร็จ: ' + (err && err.message ? err.message : err));
  }).finally(function() {
    btn.disabled = false;
    btn.textContent = 'บันทึกสีทั้งเว็บ';
  });
}

/* ══ ปุ่มย้อนกลับไปด้านบน — scroll เกิดที่ .content-area (id="pageContent") ══ */
function setupScrollTopButton() {
  var content = document.getElementById('pageContent');
  var btn = document.getElementById('scrollTopBtn');
  if (!content || !btn) return;
  content.addEventListener('scroll', function() {
    btn.classList.toggle('show', content.scrollTop > 300);
  });
}

/* ══════════════════════ INIT ══════════════════════ */
/* ══ Boot ══ */
buildPage({
  appId:        'settingsApp',
  navSubtitle:  'ตั้งค่า',
  navTheme:     'blue',
  activePage:   'settings',
  requireAdmin: false,

  onAuth: function(user, contentEl) {
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);
    currentUserEmail = user.email;

    /* ตรวจสอบ admin เพื่อแสดง/ซ่อน tab ประกาศ + ดึงค่าธีมสีทั้งเว็บปัจจุบัน */
    var lEmail = user.email.toLowerCase();
    isSuperAdmin = lEmail === (typeof SUPERADMIN_EMAIL !== 'undefined' ? SUPERADMIN_EMAIL : '');
    Promise.all([
      db.collection('admins').doc(lEmail).get(),
      db.collection('site_config').doc('theme').get()
    ])
      .then(function(results) {
        isAdmin = isSuperAdmin || results[0].exists;
        siteThemeConfig = results[1].exists ? results[1].data() : {};
        contentEl.innerHTML = renderPage();
        initSubtabs('settingsSubtabBar', {
          onChange: function (tab) { if (tab === 'announcements') loadAnnouncements(); }
        });
        /* init type radio click handlers */
        document.querySelectorAll('.ann-type-opt').forEach(function(el) {
          el.addEventListener('click', function() { setAnnType(el.dataset.type); });
        });
        setupScrollTopButton();
      })
      .catch(function() {
        isAdmin = false;
        siteThemeConfig = {};
        contentEl.innerHTML = renderPage();
        initSubtabs('settingsSubtabBar');
        setupScrollTopButton();
      });
  }
});


