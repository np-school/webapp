/* ══════════════════════ STATE ══════════════════════ */
/* ══════════════════════════════════════════════════════════════
   ตั้งค่า Google Drive Upload (ผ่าน Firebase Cloud Function)
   ✏️ ต้องแก้: นำ URL ของ Cloud Function "uploadRepairPhoto" มาใส่ที่นี่
   วิธีติดตั้ง (ทำครั้งเดียว) — ดูรายละเอียดเต็มที่ functions/drive-upload.js:
   1) สร้าง Service Account ใน Google Cloud Console + โหลด JSON key
   2) แชร์โฟลเดอร์ Google Drive ปลายทางให้อีเมล service account (สิทธิ์ Editor)
   3) เก็บ JSON key เป็น secret: firebase functions:secrets:set DRIVE_SA_KEY
   4) แก้ ROOT_FOLDER_ID ใน functions/drive-upload.js
   5) cd functions && npm install googleapis && firebase deploy --only functions:uploadRepairPhoto
   6) คัดลอก URL ที่ได้ (เช่น https://us-central1-PROJECT_ID.cloudfunctions.net/uploadRepairPhoto)
      มาแทนค่าด้านล่างนี้
   ══════════════════════════════════════════════════════════════ */
var DRIVE_UPLOAD_URL = 'https://us-central1-np-webapp-74616.cloudfunctions.net/uploadRepairPhoto'; /* ✏️ */

/* ══ Categories / Buildings — โหลดจาก Firestore (จัดการได้ในหน้าแอดมิน "ตั้งค่า") ══ */
var REPAIR_CATEGORIES = [];
var REPAIR_BUILDINGS  = [];

/* ── สีประจำหมวดหมู่: สุ่มคงที่จาก id ของหมวดหมู่ (ไม่ต้องตั้งค่าเพิ่มในแอดมิน)
     หมวดหมู่เดียวกันจะได้สีเดิมเสมอไม่ว่าจะโหลดกี่ครั้งก็ตาม ── */
var CATEGORY_PALETTE = [
  { bg: '#eff6ff',   border: '#bfdbfe',   text: '#1e40af',   hex: '#1d4ed8' },
  { bg: '#f0fdf4',  border: '#86efac',  text: '#15803d',            hex: '#15803d' },
  { bg: '#fffbeb',  border: '#fde68a',  text: '#92400e',            hex: '#92400e' },
  { bg: '#fee2e2',    border: '#fecaca',    text: '#b91c1c',    hex: '#b91c1c' },
  { bg: '#e0f2fe',    border: '#7dd3fc',    text: '#075985',            hex: '#075985' },
  { bg: '#e0e1dd', border: '#415a77', text: '#1b263b', hex: '#6d28d9' }
];

/* ══ Status meta: label + color + workflow-step states ══ */
var WF_LABELS = ['แจ้งปัญหา','อนุมัติ','ดำเนินการ','ตรวจสอบ','ปิดงาน'];

/* ══ Page State ══ */
var currentUser   = null;
var myRepairs     = [];
var currentFilter = 'all';
var pendingPhotos = []; /* [{name, mimeType, base64, status:'pending'|'uploading'|'done'|'error', url}] */
var editingRepairId = null; /* ถ้าไม่ใช่ null = กำลังแก้ไขคำขอเดิม (เฉพาะตอนสถานะยังเป็น 'reported' เท่านั้น) */
var staffInfo     = null;
var subLocationTags = []; /* ห้อง/บริเวณที่เพิ่มไว้ในฟอร์มแจ้งซ่อม (เพิ่มได้หลายห้องต่อ 1 เรื่องแจ้ง) */
var MAX_PHOTOS = 8;

/* ── แถบกรองตามหมวดหมู่ (สร้างใหม่ทุกครั้งที่หมวดหมู่เปลี่ยน, สีของแต่ละปุ่มตรงกับสีหมวดหมู่) ── */
var currentCategoryFilter = 'all';

/* ══════════════════════ DATA LOADING ══════════════════════ */
function loadCategories() {
  db.collection('repair_categories').orderBy('createdAt', 'asc').onSnapshot(function(snap) {
    REPAIR_CATEGORIES = [];
    snap.forEach(function(doc) { REPAIR_CATEGORIES.push(Object.assign({ id: doc.id }, doc.data())); });
    populateCategorySelect();
    renderCategoryFilterBar();
    if (typeof renderList === 'function' && myRepairs) renderList();
  }, function(err) { console.error('loadCategories', err); });
}
function loadBuildings() {
  db.collection('repair_buildings').orderBy('createdAt', 'asc').onSnapshot(function(snap) {
    REPAIR_BUILDINGS = [];
    snap.forEach(function(doc) { REPAIR_BUILDINGS.push(Object.assign({ id: doc.id }, doc.data())); });
    populateBuildingSelect();
  }, function(err) { console.error('loadBuildings', err); });
} /* {name, phone} จาก staff collection ตาม email ของผู้ใช้ที่ login — ใช้เติมฟอร์มแจ้งซ่อมอัตโนมัติ */

/* ── ดึงชื่อ-เบอร์โทรจาก staff collection ตาม email เพื่อเติมฟอร์มแจ้งซ่อมอัตโนมัติ
     ถ้าไม่พบข้อมูล (ไม่มีชื่ออยู่ในทะเบียนบุคลากร) จะปล่อยให้ผู้ใช้กรอกเอง ── */
function loadStaffInfo(user) {
  if (typeof db === 'undefined' || !user.email) return;
  db.collection('staff').where('email', '==', user.email.toLowerCase()).limit(1).get()
    .then(function(snap) {
      if (!snap.empty) {
        var s = snap.docs[0].data();
        staffInfo = { name: s.name || '', phone: s.phone || '', position: s.position || '' };
      }
    })
    .catch(function(err) { console.error('loadStaffInfo error:', err); });
}

/* ══ Data ══ */
function loadData() {
  db.collection('repairs')
    .where('reporterUid', '==', currentUser.uid)
    .onSnapshot(function(snap) {
      myRepairs = [];
      snap.forEach(function(doc) { myRepairs.push(Object.assign({ id: doc.id }, doc.data())); });
      sortRepairList(myRepairs);
      renderStats();
      renderList();
    }, function(err) {
      console.error(err);
      document.getElementById('repairListWrap').innerHTML =
        '<div class="empty-state"><i data-lucide="alert-triangle" style="width:26px;height:26px;color:var(--red);"></i><p style="margin-top:8px;">โหลดข้อมูลไม่สำเร็จ</p></div>';
      lucide.createIcons();
    });
}

/* ══════════════════════ RENDER ══════════════════════ */
function getCategoryMeta(key) {
  for (var i = 0; i < REPAIR_CATEGORIES.length; i++) if (REPAIR_CATEGORIES[i].id === key) return REPAIR_CATEGORIES[i];
  return { id:key, label:key || 'ไม่ระบุ', icon:'help-circle' };
}
function hexToRgba(hex, alpha) {
  hex = (hex || '').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(function(ch) { return ch + ch; }).join('');
  var r = parseInt(hex.substring(0, 2), 16); if (isNaN(r)) r = 100;
  var g = parseInt(hex.substring(2, 4), 16); if (isNaN(g)) g = 100;
  var b = parseInt(hex.substring(4, 6), 16); if (isNaN(b)) b = 100;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
/* ── สีของแต่ละหมวดหมู่: ใช้สีที่ตั้งไว้เอง (จากแอดมิน) ก่อน ถ้าไม่มีค่อย fallback
     เป็นสีสุ่มคงที่จาก id เหมือนเดิม เพื่อให้กราฟ/ป้าย/การ์ด สีตรงกันทุกที่ ── */
function getCategoryColor(catId) {
  var cat = getCategoryMeta(catId);
  if (cat && cat.color) {
    return { bg: hexToRgba(cat.color, 0.14), border: hexToRgba(cat.color, 0.4), text: cat.color };
  }
  var key = catId || 'ไม่ระบุ';
  var hash = 0;
  for (var i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 1)) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[hash];
}

function getStatusMeta(r) {
  switch (r.status) {
    case 'reported': return { label:'รอตรวจสอบ/อนุมัติ',      color:'amber',  steps:['done','active','pending','pending','pending'] };
    case 'rejected': return { label:'ไม่อนุมัติ',              color:'red',    steps:['done','revision','pending','pending','pending'] };
    case 'approved': return { label: r.repairStatus === 'in_progress' ? 'กำลังซ่อม' : 'รอซ่อม (อนุมัติแล้ว)', color:'sky', steps:['done','done','active','pending','pending'] };
    case 'done':      return { label:'รอผู้แจ้งตรวจสอบ',       color:'purple', steps:['done','done','done','active','pending'] };
    case 'reopened':  return { label: r.repairStatus === 'in_progress' ? 'ส่งกลับไปซ่อมใหม่ (กำลังซ่อม)' : 'ส่งกลับไปซ่อมใหม่ (รอซ่อม)', color:'red', steps:['done','done','active','revision','pending'] };
    case 'closed':    return { label:'ปิดงานแล้ว',             color:'green',  steps:['done','done','done','done','final'] };
    default:          return { label:'ไม่ทราบสถานะ',           color:'amber',  steps:['pending','pending','pending','pending','pending'] };
  }
}

function buildWorkflowBar(steps) {
  var html = '<div class="workflow-bar">';
  for (var i = 0; i < WF_LABELS.length; i++) {
    html += '<div class="wf-step ' + steps[i] + '">' + WF_LABELS[i] + '</div>';
    if (i < WF_LABELS.length - 1) html += '<div class="wf-divider"></div>';
  }
  html += '</div>';
  return html;
}


/* ── ตัดชื่ออาคารออกจากข้อความสถานที่ "อาคาร 1 - ห้อง 101" → "อาคาร 1" ── */
function getBuildingNameFromLocation(loc) {
  if (!loc) return '';
  var idx = loc.indexOf(' - ');
  return idx === -1 ? loc : loc.substring(0, idx);
}
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══ Render: หน้าหลัก ══ */
function renderPage() {
  return (
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title-row">' +
          '<div class="page-icon" style="background:linear-gradient(135deg,var(--amber),var(--accent-warn));">' +
            '<i data-lucide="wrench" style="width:20px;height:20px;color:white;"></i>' +
          '</div>' +
          '<h1 class="page-title">แจ้งซ่อม</h1>' +
        '</div>' +
        '<p class="page-sub">แจ้งปัญหาอาคาร สถานที่ และอุปกรณ์ภายในโรงเรียน</p>' +
      '</div>' +
      '<button class="btn-primary amber" onclick="openNewReportModal()">' +
        '<i data-lucide="plus" style="width:15px;height:15px;"></i> แจ้งซ่อมใหม่' +
      '</button>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--gap-card);margin-bottom:var(--gap-section);" id="repStatGrid"></div>' +

    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;" id="repFilterBar">' +
      '<button class="filter-pill active" data-f="all" onclick="setFilter(\'all\')">ทั้งหมด</button>' +
      '<button class="filter-pill" data-f="open" onclick="setFilter(\'open\')">กำลังดำเนินการ</button>' +
      '<button class="filter-pill" data-f="done" onclick="setFilter(\'done\')">รอตรวจสอบ</button>' +
      '<button class="filter-pill" data-f="closed" onclick="setFilter(\'closed\')">ปิดงานแล้ว</button>' +
    '</div>' +

    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;" id="repCatFilterBar"></div>' +

    '<div id="repairListWrap">' +
      '<div class="empty-state"><i data-lucide="loader" style="width:26px;height:26px;"></i><p style="margin-top:8px;">กำลังโหลด...</p></div>' +
    '</div>'
  );
}

function renderStats() {
  var all = myRepairs.length;
  var open = myRepairs.filter(function(r) { return ['reported','approved','reopened'].indexOf(r.status) !== -1; }).length;
  var waitReview = myRepairs.filter(function(r) { return r.status === 'done'; }).length;
  var closed = myRepairs.filter(function(r) { return r.status === 'closed'; }).length;

  function stat(icon, color, bg, val, label) {
    return (
      '<div class="stat-card">' +
        '<div style="width:44px;height:44px;border-radius:12px;background:' + bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
          '<i data-lucide="' + icon + '" style="width:20px;height:20px;color:' + color + ';"></i>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:20px;font-weight:800;color:var(--text);">' + val + '</div>' +
          '<div style="font-size:11px;color:var(--text2);font-weight:600;">' + label + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  document.getElementById('repStatGrid').innerHTML =
    stat('clipboard-list', '#1d4ed8',   '#eff6ff',   all,        'แจ้งซ่อมทั้งหมด') +
    stat('loader-circle',  '#0284c7',    '#e0f2fe',    open,       'กำลังดำเนินการ') +
    stat('eye',            '#0d1b2a', '#e0e1dd', waitReview, 'รอฉันตรวจสอบ') +
    stat('check-check',    '#16a34a',  '#f0fdf4',  closed,     'ปิดงานแล้ว');
  lucide.createIcons();
}
function renderCategoryFilterBar() {
  var bar = document.getElementById('repCatFilterBar');
  if (!bar) return;

  var html = '<button class="filter-pill' + (currentCategoryFilter === 'all' ? ' active' : '') +
    '" data-cf="all" onclick="setCategoryFilter(\'all\')">ทุกหมวดหมู่</button>';

  REPAIR_CATEGORIES.forEach(function(c) {
    var col = getCategoryColor(c.id);
    var isActive = currentCategoryFilter === c.id;
    html += '<button class="filter-pill' + (isActive ? ' active' : '') + '" data-cf="' + c.id + '" ' +
      'onclick="setCategoryFilter(\'' + c.id + '\')" ' +
      'style="' + (isActive ? ('background:' + col.text + ';border-color:' + col.text + ';color:#fff;') : ('color:' + col.text + ';border-color:' + col.border + ';')) + '">' +
      '<i data-lucide="' + (c.icon || 'wrench') + '" style="width:11px;height:11px;vertical-align:-1px;margin-right:3px;"></i>' + esc2(c.label) +
    '</button>';
  });

  bar.innerHTML = html;
  lucide.createIcons();
}

function renderList() {
  var list = myRepairs.filter(function(r) {
    if (currentCategoryFilter !== 'all' && r.category !== currentCategoryFilter) return false;
    if (currentFilter === 'all') return true;
    if (currentFilter === 'open') return ['reported','approved','reopened'].indexOf(r.status) !== -1;
    if (currentFilter === 'done') return r.status === 'done';
    if (currentFilter === 'closed') return ['closed','rejected'].indexOf(r.status) !== -1;
    return true;
  });

  var wrap = document.getElementById('repairListWrap');
  if (!list.length) {
    wrap.innerHTML =
      '<div class="empty-state">' +
        '<i data-lucide="clipboard-check" style="width:32px;height:32px;color:var(--text3);"></i>' +
        '<p style="margin-top:10px;font-weight:700;">ยังไม่มีรายการแจ้งซ่อมในหมวดนี้</p>' +
      '</div>';
    lucide.createIcons();
    return;
  }

  var html = '';
  list.forEach(function(r) { html += renderRepairCard(r); });
  wrap.innerHTML = html;
  lucide.createIcons();
}

function renderRepairCard(r) {
  var cat = getCategoryMeta(r.category);
  var col = getCategoryColor(r.category);
  var meta = getStatusMeta(r);
  var stepDots = meta.steps.map(function(s) {
    return '<i class="' + (s === 'done' || s === 'active' || s === 'final' ? 'on' : (s === 'revision' ? 'bad' : '')) + '"></i>';
  }).join('');

  return (
    '<div class="card rp-card" style="background:' + col.bg + ';border-color:' + col.border + ';border-left:4px solid ' + col.text + ';" onclick="openDetail(\'' + r.id + '\')">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">' +
        '<div style="min-width:0;flex:1;">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">' +
            (r.priority === 'urgent' ? '<span class="rp-urgent"><i data-lucide="alert-triangle" style="width:11px;height:11px;"></i> เร่งด่วน</span>' : '') +
            '<span class="rp-cat-chip" style="background:rgba(255,255,255,.6);color:' + col.text + ';"><i data-lucide="' + cat.icon + '" style="width:11px;height:11px;"></i> ' + cat.label + '</span>' +
          '</div>' +
          '<div style="font-size:15px;font-weight:800;color:var(--text);">' + esc2(r.title || '') + '</div>' +
          '<div style="font-size:12.5px;color:var(--text2);margin-top:2px;display:flex;align-items:center;gap:5px;">' +
            '<i data-lucide="map-pin" style="width:12px;height:12px;"></i> ' + esc2(r.location || '') +
          '</div>' +
        '</div>' +
        '<span class="rp-status c-' + meta.color + '">' + meta.label + '</span>' +
      '</div>' +
      '<div class="rp-mini-wf">' + stepDots + '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:8px;">แจ้งเมื่อ ' + fmtDate(r.createdAt) + '</div>' +
    '</div>'
  );
}

function uploadOnePhoto(item) {
  if (!DRIVE_UPLOAD_URL || DRIVE_UPLOAD_URL.indexOf('XXXXXX') !== -1) {
    item.status = 'error';
    renderPhotoList();
    showToast('ยังไม่ได้ตั้งค่าอัปโหลดรูปไป Google Drive (ข้ามรูปนี้)', 'warn');
    return;
  }
  item.status = 'uploading';
  renderPhotoList();

  fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: item.name,
      mimeType: item.mimeType,
      data: item.base64,
      location: currentLocationText(),
      title: document.getElementById('frTitle').value.trim(),
      reportDate: new Date().toISOString()
    })
  })
    .then(function(res) {
      return res.json().then(function(data) {
        if (!res.ok || !data || !data.url) {
          throw new Error((data && data.error) || ('อัปโหลดไม่สำเร็จ (HTTP ' + res.status + ')'));
        }
        return data;
      });
    })
    .then(function(data) {
      item.status = 'done';
      item.url = data.url;
      renderPhotoList();
    })
    .catch(function(err) {
      console.error(err);
      item.status = 'error';
      renderPhotoList();
      showToast('อัปโหลดรูป "' + item.name + '" ไม่สำเร็จ: ' + (err && err.message ? err.message : err), 'error');
    });
}

function renderPhotoList() {
  var wrap = document.getElementById('frPhotoList');
  if (!wrap) return;
  var html = '';
  pendingPhotos.forEach(function(p, idx) {
    html +=
      '<div class="rp-photo-thumb">' +
        '<img src="' + p.localSrc + '" alt="รูปแนบแจ้งซ่อม ' + (idx + 1) + '">' +
        (p.status !== 'done' ? '<div class="up">' + (p.status === 'uploading' ? 'กำลังอัปโหลด...' : p.status === 'error' ? 'อัปโหลดไม่สำเร็จ' : 'รออัปโหลด') + '</div>' : '') +
        '<button class="rm" onclick="event.stopPropagation();removePhoto(' + idx + ')" aria-label="ลบไฟล์"><i data-lucide="x" style="width:11px;height:11px;"></i></button>' +
      '</div>';
  });
  wrap.innerHTML = html;
  lucide.createIcons();
}

/* ── ห้อง/บริเวณ: ใส่ได้หลายห้อง (chip) ── */
function renderSubLocationChips() {
  var wrap = document.getElementById('frSubLocationChips');
  if (!wrap) return;
  wrap.innerHTML = subLocationTags.map(function(t, idx) {
    return '<span class="rp-room-chip">' + esc2(t) +
      '<button type="button" onclick="event.stopPropagation();removeSubLocationTag(' + idx + ')" aria-label="ลบรายการห้อง/บริเวณ"><i data-lucide="x" style="width:10px;height:10px;"></i></button></span>';
  }).join('');
  lucide.createIcons();
}

function addSubLocationTagFromInput() {
  var inp = document.getElementById('frSubLocation');
  if (!inp) return;
  var val = inp.value.trim();
  if (!val) return;
  if (subLocationTags.indexOf(val) === -1) subLocationTags.push(val);
  inp.value = '';
  renderSubLocationChips();
}

function removeSubLocationTag(idx) {
  subLocationTags.splice(idx, 1);
  renderSubLocationChips();
}

function onSubLocationKeydown(ev) {
  if (ev.key === 'Enter' || ev.key === ',') {
    ev.preventDefault();
    addSubLocationTagFromInput();
  } else if (ev.key === 'Backspace' && !ev.target.value && subLocationTags.length) {
    /* กด Backspace ตอนช่องว่าง = ลบ chip ล่าสุด (สะดวกเวลาพิมพ์ผิด) */
    subLocationTags.pop();
    renderSubLocationChips();
  }
}

/* ประกอบข้อความสถานที่จาก "อาคาร - ห้อง/บริเวณ (หลายห้อง คั่นด้วย , )" ที่เลือก/กรอกไว้ */
function currentLocationText() {
  var buildingId = document.getElementById('frBuilding').value;
  var building = REPAIR_BUILDINGS.filter(function(b) { return b.id === buildingId; })[0];
  var sub = subLocationTags.join(', ');
  if (!building) return sub;
  return sub ? (building.name + ' - ' + sub) : building.name;
}

function renderDetailBody(r) {
  var cat = getCategoryMeta(r.category);
  var meta = getStatusMeta(r);

  var photosHtml = '';
  if (r.photos && r.photos.length) {
    photosHtml = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">' +
      r.photos.map(function(p, i) {
        return '<a href="' + p.url + '" target="_blank" rel="noopener" class="rp-photo-thumb"><img src="' + p.url + '" alt="รูปแนบแจ้งซ่อม ' + (i + 1) + '"></a>';
      }).join('') + '</div>';
  }

  var logsHtml = '';
  if (r.logs && r.logs.length) {
    logsHtml = '<div style="margin-top:8px;">' + r.logs.slice().reverse().map(function(l) {
      return (
        '<div class="rp-log-item">' +
          '<div class="rp-log-dot"></div>' +
          '<div>' +
            '<div style="font-size:12.5px;font-weight:700;color:var(--text);">' + esc2(l.note || '') + '</div>' +
            '<div style="font-size:11px;color:var(--text3);">' + esc2(l.byName || '') + ' · ' + fmtDate(l.at) + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('') + '</div>';
  }

  var reviewActions = '';
  if (r.status === 'done') {
    reviewActions =
      '<div class="section-divider"><i data-lucide="clipboard-check" style="width:14px;height:14px;"></i> ตรวจสอบความเรียบร้อย</div>' +
      '<p style="font-size:12.5px;color:var(--text2);margin-bottom:12px;">ช่างแจ้งว่าดำเนินการซ่อมเสร็จแล้ว กรุณาตรวจสอบและยืนยันผล</p>' +
      (r.repairNote ? '<div class="card" style="background:var(--bg-alt);padding:12px;margin-bottom:12px;"><b style="font-size:12px;">บันทึกจากช่าง:</b><p style="font-size:12.5px;color:var(--text2);margin-top:4px;">' + esc2(r.repairNote) + '</p></div>' : '') +
      '<textarea id="reviewNoteInput" rows="2" placeholder="หมายเหตุ (ถ้ามี)"></textarea>' +
      '<div style="display:flex;gap:10px;margin-top:10px;">' +
        '<button class="btn-reject" style="flex:1;justify-content:center;" onclick="submitReview(\'' + r.id + '\',\'fail\')"><i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> ยังไม่เรียบร้อย</button>' +
        '<button class="btn-approve" style="flex:1;justify-content:center;" onclick="submitReview(\'' + r.id + '\',\'pass\')"><i data-lucide="check" style="width:14px;height:14px;"></i> เรียบร้อยแล้ว ปิดงาน</button>' +
      '</div>';
  }

  var editDeleteActions = '';
  if (r.status === 'reported') {
    editDeleteActions =
      '<div class="section-divider" style="margin-top:18px;"><i data-lucide="settings-2" style="width:14px;height:14px;"></i> จัดการคำขอ</div>' +
      '<p style="font-size:11.5px;color:var(--text3);margin-bottom:10px;">แก้ไขหรือลบคำขอนี้ได้ ตราบใดที่เจ้าหน้าที่ยังไม่พิจารณา (อนุมัติ/ไม่อนุมัติ)</p>' +
      '<div style="display:flex;gap:10px;">' +
        '<button class="btn-secondary" style="flex:1;justify-content:center;" onclick="openEditModal(\'' + r.id + '\')"><i data-lucide="pencil" style="width:14px;height:14px;"></i> แก้ไขคำขอ</button>' +
        '<button class="btn-reject" style="flex:1;justify-content:center;" onclick="deleteMyRepair(\'' + r.id + '\')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> ลบคำขอ</button>' +
      '</div>';
  }

  return (
    '<div class="modal-header">' +
      '<div class="modal-title-group">' +
        '<div class="modal-title-icon" style="background:var(--amber-light);"><i data-lucide="' + cat.icon + '" style="color:var(--amber);"></i></div>' +
        '<div><h3>' + esc2(r.title || '') + '</h3><p>' + cat.label + ' · ' + esc2(r.location || '') + '</p></div>' +
      '</div>' +
      '<button class="modal-close" onclick="closeModal(\'detailModal\')" aria-label="ปิด"><i data-lucide="x"></i></button>' +
    '</div>' +

    '<span class="rp-status c-' + meta.color + '">' + meta.label + '</span>' +
    buildWorkflowBar(meta.steps) +

    '<div class="section-divider" style="margin-top:18px;"><i data-lucide="file-text" style="width:14px;height:14px;"></i> รายละเอียด</div>' +
    '<p style="font-size:13px;color:var(--text2);line-height:1.6;">' + esc2(r.description || '') + '</p>' +
    photosHtml +

    reviewActions +
    editDeleteActions +

    '<div class="section-divider" style="margin-top:18px;"><i data-lucide="history" style="width:14px;height:14px;"></i> ประวัติดำเนินการ</div>' +
    logsHtml
  );
}

/* ══════════════════════ EVENT HANDLERS ══════════════════════ */
function setupScrollTopButton() {
  var content = document.getElementById('pageContent');
  var btn = document.getElementById('scrollTopBtn');
  if (!content || !btn) return;
  content.addEventListener('scroll', function() {
    btn.classList.toggle('show', content.scrollTop > 300);
  });
}

function populateCategorySelect() {
  var sel = document.getElementById('frCategory');
  if (!sel) return;
  var prev = sel.value;
  var html = '';
  REPAIR_CATEGORIES.forEach(function(c) { html += '<option value="' + c.id + '">' + esc2(c.label) + '</option>'; });
  sel.innerHTML = html;
  if (prev && REPAIR_CATEGORIES.some(function(c) { return c.id === prev; })) sel.value = prev;
}

function populateBuildingSelect() {
  var sel = document.getElementById('frBuilding');
  if (!sel) return;
  var prev = sel.value;
  var html = '<option value="">— เลือกอาคาร —</option>';
  REPAIR_BUILDINGS.forEach(function(b) { html += '<option value="' + b.id + '">' + esc2(b.name) + '</option>'; });
  sel.innerHTML = html;
  if (prev && REPAIR_BUILDINGS.some(function(b) { return b.id === prev; })) sel.value = prev;
  onBuildingChange();
}

/* เติม datalist สถานที่ย่อยที่เคยมีคนแจ้งไว้แล้วในอาคารที่เลือก ให้เลือกได้ทันที */
function onBuildingChange() {
  var sel = document.getElementById('frBuilding');
  var list = document.getElementById('frSubLocationList');
  if (!sel || !list) return;
  var b = REPAIR_BUILDINGS.filter(function(x) { return x.id === sel.value; })[0];
  var subs = (b && b.subLocations) || [];
  list.innerHTML = subs.map(function(s) { return '<option value="' + esc2(s) + '">'; }).join('');
}

/* ── เรียงรายการแจ้งซ่อม: "เร่งด่วน" อยู่บนสุดเสมอ ไม่ว่าจะแจ้งเมื่อไหร่
     ภายในกลุ่มเดียวกัน (เร่งด่วน / ปกติ) เรียงจากแจ้งเก่าสุดไปใหม่สุด ── */
function sortRepairList(arr) {
  arr.sort(function(a, b) {
    var aUrgent = a.priority === 'urgent' ? 0 : 1;
    var bUrgent = b.priority === 'urgent' ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    var at = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0;
    var bt = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0;
    return at - bt; /* เก่าไว้ก่อน */
  });
  return arr;
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('#repFilterBar .filter-pill').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-f') === f);
  });
  renderList();
}

function setCategoryFilter(catId) {
  currentCategoryFilter = catId;
  renderCategoryFilterBar();
  renderList();
}

/* ══════════════════════════════════════════════════════════════
   แจ้งซ่อมใหม่
   ══════════════════════════════════════════════════════════════ */
function openNewReportModal() {
  editingRepairId = null;
  document.getElementById('frModalTitle').textContent = 'แจ้งซ่อมใหม่';
  document.getElementById('frModalSub').textContent = 'กรอกรายละเอียดจุดที่ชำรุดให้ครบถ้วน';

  if (REPAIR_CATEGORIES.length) document.getElementById('frCategory').value = REPAIR_CATEGORIES[0].id;
  applyStaffAutofill();
  document.getElementById('frBuilding').value = '';
  onBuildingChange();
  subLocationTags = [];
  document.getElementById('frSubLocation').value = '';
  renderSubLocationChips();
  document.getElementById('frTitle').value = '';
  document.getElementById('frDescription').value = '';
  document.querySelector('input[name="frPriority"][value="normal"]').checked = true;
  pendingPhotos = [];
  renderPhotoList();
  openModal('newReportModal');
}

/* ── เติมชื่อ/เบอร์โทรในฟอร์มแจ้งซ่อมจากข้อมูลบุคลากร (staffInfo) ถ้ามี
     ถ้าไม่มี (ไม่พบชื่อในทะเบียนบุคลากร) จะปล่อยว่างให้ผู้ใช้กรอกเอง ── */
function applyStaffAutofill() {
  var nameEl  = document.getElementById('frName');
  var phoneEl = document.getElementById('frPhone');
  var posEl   = document.getElementById('frPosition');
  var hint    = document.getElementById('frAutofillHint');

  var hasName  = !!(staffInfo && staffInfo.name);
  var hasPhone = !!(staffInfo && staffInfo.phone);
  var hasPos   = !!(staffInfo && staffInfo.position);

  nameEl.value  = hasName  ? staffInfo.name  : (currentUser.displayName || '');
  phoneEl.value = hasPhone ? staffInfo.phone : '';
  if (posEl) posEl.value = hasPos ? staffInfo.position : '';

  if (hint) hint.style.display = (hasName || hasPhone || hasPos) ? 'flex' : 'none';

  lucide.createIcons();
}

/* ── แก้ไขคำขอเดิม (ทำได้เฉพาะตอนสถานะยังเป็น "reported" คือยังไม่ถูกพิจารณา) ── */
function openEditModal(id) {
  var r = myRepairs.filter(function(x) { return x.id === id; })[0];
  if (!r) return;
  if (r.status !== 'reported') {
    showToast('แก้ไขได้เฉพาะคำขอที่ยังไม่ถูกพิจารณาเท่านั้น', 'warn');
    return;
  }

  editingRepairId = id;
  document.getElementById('frModalTitle').textContent = 'แก้ไขคำขอแจ้งซ่อม';
  document.getElementById('frModalSub').textContent = 'แก้ไขรายละเอียดคำขอก่อนที่เจ้าหน้าที่จะพิจารณา';

  if (REPAIR_CATEGORIES.length) document.getElementById('frCategory').value = r.category || REPAIR_CATEGORIES[0].id;
  document.getElementById('frName').value = r.reporterName || '';
  document.getElementById('frPhone').value = r.reporterPhone || '';
  if (document.getElementById('frPosition')) document.getElementById('frPosition').value = r.reporterPosition || '';
  var hintEl = document.getElementById('frAutofillHint');
  if (hintEl) hintEl.style.display = 'none';
  document.querySelector('input[name="frPriority"][value="' + (r.priority === 'urgent' ? 'urgent' : 'normal') + '"]').checked = true;

  var buildingName = getBuildingNameFromLocation(r.location);
  var matched = REPAIR_BUILDINGS.filter(function(b) { return b.name === buildingName; })[0];
  document.getElementById('frBuilding').value = matched ? matched.id : '';
  onBuildingChange();

  var subLoc = '';
  if (matched) {
    var sepIdx = (r.location || '').indexOf(' - ');
    subLoc = sepIdx === -1 ? '' : r.location.substring(sepIdx + 3);
  } else {
    subLoc = r.location || '';
  }
  subLocationTags = subLoc ? subLoc.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];
  document.getElementById('frSubLocation').value = '';
  renderSubLocationChips();

  document.getElementById('frTitle').value = r.title || '';
  document.getElementById('frDescription').value = r.description || '';

  /* โหลดรูปเดิม (ที่อัปโหลดไว้แล้ว) มาแสดงเป็น "รูปที่แนบไว้แล้ว" ในฟอร์ม */
  pendingPhotos = (r.photos || []).map(function(p) {
    return { name: p.name || '', mimeType: '', base64: null, status: 'done', url: p.url, localSrc: p.url };
  });
  renderPhotoList();

  closeModal('detailModal');
  openModal('newReportModal');
}

function handlePhotoSelect(files) {
  var remain = MAX_PHOTOS - pendingPhotos.length;
  if (remain <= 0) { showToast('แนบได้สูงสุด ' + MAX_PHOTOS + ' รูป', 'warn'); return; }

  var arr = Array.prototype.slice.call(files).slice(0, remain);
  arr.forEach(function(file) {
    if (!/^image\//.test(file.type)) return;
    var reader = new FileReader();
    reader.onload = function() {
      var base64 = reader.result.split(',')[1];
      var item = { name: file.name, mimeType: file.type, base64: base64, status: 'pending', url: null, localSrc: reader.result };
      pendingPhotos.push(item);
      renderPhotoList();
      uploadOnePhoto(item);
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('frFileInput').value = '';
}

function removePhoto(idx) {
  pendingPhotos.splice(idx, 1);
  renderPhotoList();
}

function submitReport() {
  /* เผื่อผู้ใช้พิมพ์ห้องสุดท้ายค้างไว้แล้วกดส่งเลยโดยไม่ได้กด Enter */
  addSubLocationTagFromInput();

  var category    = document.getElementById('frCategory').value;
  var name        = document.getElementById('frName').value.trim();
  var phone       = document.getElementById('frPhone').value.trim();
  var priority    = document.querySelector('input[name="frPriority"]:checked').value;
  var buildingId  = document.getElementById('frBuilding').value;
  var building    = REPAIR_BUILDINGS.filter(function(b) { return b.id === buildingId; })[0];
  var location    = currentLocationText();
  var title       = document.getElementById('frTitle').value.trim();
  var description = document.getElementById('frDescription').value.trim();
  var positionEl  = document.getElementById('frPosition');
  var position    = positionEl ? positionEl.value.trim() : '';

  if (!name || !phone || !buildingId || !subLocationTags.length || !title || !description) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อผู้แจ้ง / เบอร์โทร / อาคาร / ห้อง-บริเวณ / หัวข้อ / รายละเอียด)', 'warn');
    return;
  }
  var phoneDigits = phone.replace(/[^0-9]/g, '');
  if (phoneDigits.length < 9 || phoneDigits.length > 10) {
    showToast('กรุณากรอกเบอร์โทรให้ถูกต้อง (9-10 หลัก)', 'warn');
    return;
  }
  if (pendingPhotos.some(function(p) { return p.status === 'uploading'; })) {
    showToast('กรุณารอให้อัปโหลดรูปภาพเสร็จก่อน', 'warn');
    return;
  }

  var photos = pendingPhotos.filter(function(p) { return p.status === 'done' && p.url; })
    .map(function(p) { return { url: p.url, name: p.name }; });

  if (!photos.length) {
    showToast('กรุณาแนบรูปภาพอย่างน้อย 1 รูปก่อนส่งเรื่องแจ้งซ่อม', 'warn');
    return;
  }

  var btn = document.getElementById('frSubmitBtn');
  var isEdit = !!editingRepairId;
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader" style="width:15px;height:15px;"></i> กำลัง' + (isEdit ? 'บันทึก' : 'ส่ง') + '...';
  lucide.createIcons();

  function saveSubLocationIfNew() {
    if (!building) return;
    var newOnes = subLocationTags.filter(function(s) {
      return !building.subLocations || building.subLocations.indexOf(s) === -1;
    });
    if (newOnes.length) {
      db.collection('repair_buildings').doc(buildingId).update({
        subLocations: firebase.firestore.FieldValue.arrayUnion.apply(null, newOnes)
      }).catch(function(err) { console.error('save subLocation failed', err); });
    }
  }

  function resetSubmitBtn() {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" style="width:15px;height:15px;"></i> ' + (editingRepairId ? 'บันทึกการแก้ไข' : 'ส่งเรื่องแจ้งซ่อม');
    lucide.createIcons();
  }

  if (isEdit) {
    db.collection('repairs').doc(editingRepairId).update({
      category: category,
      priority: priority,
      location: location,
      title: title,
      description: description,
      photos: photos,
      reporterName: name,
      reporterPhone: phone,
      reporterPosition: position,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      logs: firebase.firestore.FieldValue.arrayUnion({
        status: 'reported', note: 'ผู้แจ้งแก้ไขรายละเอียดคำขอ', byName: currentUser.displayName || currentUser.email, at: firebase.firestore.Timestamp.now()
      })
    }).then(function() {
      showToast('บันทึกการแก้ไขสำเร็จ ✅');
      closeModal('newReportModal');
      editingRepairId = null;
      saveSubLocationIfNew();
    }).catch(function(err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }).finally(resetSubmitBtn);
    return;
  }

  db.collection('repairs').add({
    category: category,
    priority: priority,
    location: location,
    title: title,
    description: description,
    photos: photos,
    status: 'reported',
    repairStatus: null,
    reporterUid: currentUser.uid,
    reporterName: name,
    reporterEmail: (currentUser.email || '').toLowerCase(),
    reporterPhone: phone,
    reporterPosition: position,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    logs: [{ status: 'reported', note: 'แจ้งปัญหาเข้าสู่ระบบ', byName: currentUser.displayName || currentUser.email, at: firebase.firestore.Timestamp.now() }]
  }).then(function() {
    showToast('ส่งเรื่องแจ้งซ่อมสำเร็จ ✅');
    closeModal('newReportModal');
    saveSubLocationIfNew();
  }).catch(function(err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }).finally(resetSubmitBtn);
}

/* ══════════════════════════════════════════════════════════════
   รายละเอียด + ตรวจสอบงาน
   ══════════════════════════════════════════════════════════════ */
function openDetail(id) {
  var r = myRepairs.filter(function(x) { return x.id === id; })[0];
  if (!r) return;
  document.getElementById('detailModalBody').innerHTML = renderDetailBody(r);
  lucide.createIcons();
  openModal('detailModal');
}

/* ── ลบคำขอของตัวเอง (ทำได้เฉพาะตอนสถานะยังเป็น "reported" คือยังไม่ถูกพิจารณา) ── */
function deleteMyRepair(id) {
  var r = myRepairs.filter(function(x) { return x.id === id; })[0];
  if (!r) return;
  if (r.status !== 'reported') {
    showToast('ลบได้เฉพาะคำขอที่ยังไม่ถูกพิจารณาเท่านั้น', 'warn');
    return;
  }
  if (!confirm('ลบคำขอแจ้งซ่อม "' + (r.title || '') + '" ใช่หรือไม่? การลบไม่สามารถกู้คืนได้')) return;

  db.collection('repairs').doc(id).delete().then(function() {
    showToast('ลบคำขอแจ้งซ่อมแล้ว');
    closeModal('detailModal');
  }).catch(function(err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  });
}

function submitReview(id, result) {
  var note = (document.getElementById('reviewNoteInput').value || '').trim();
  var newStatus = result === 'pass' ? 'closed' : 'reopened';
  var logNote = result === 'pass'
    ? 'ผู้แจ้งยืนยันว่าซ่อมเรียบร้อย — ปิดงาน' + (note ? (' (' + note + ')') : '')
    : 'ผู้แจ้งตรวจสอบแล้วยังไม่เรียบร้อย ส่งกลับให้ดำเนินการซ่อมต่อ' + (note ? (' (' + note + ')') : '');

  db.collection('repairs').doc(id).update({
    status: newStatus,
    reviewResult: result,
    reviewNote: note,
    reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
    closedAt: result === 'pass' ? firebase.firestore.FieldValue.serverTimestamp() : null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    logs: firebase.firestore.FieldValue.arrayUnion({
      status: newStatus, note: logNote, byName: currentUser.displayName || currentUser.email, at: firebase.firestore.Timestamp.now()
    })
  }).then(function() {
    showToast(result === 'pass' ? 'ปิดงานเรียบร้อย ✅' : 'ส่งกลับให้ดำเนินการซ่อมต่อแล้ว');
    closeModal('detailModal');
  }).catch(function(err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  });
}

/* ══════════════════════ INIT ══════════════════════ */
/* ══════════════════════════════════════════════════════════════
   buildPage() — auth guard + shell builder
   ══════════════════════════════════════════════════════════════ */
buildPage({
  appId:        'myApp',
  navSubtitle:  'ระบบแจ้งซ่อม',
  navTheme:     'blue',
  activePage:   'repair-user',
  requireAdmin: false,

  onAuth: function(user, contentEl) {
    currentUser = user;
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);
    loadStaffInfo(user);

    contentEl.innerHTML = renderPage();
    lucide.createIcons();

    loadCategories();
    loadBuildings();
    loadData();
    setupScrollTopButton();
  }
});



