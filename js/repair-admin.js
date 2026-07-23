/* ══════════════════════ STATE ══════════════════════ */
/* ══ Categories (ต้องตรงกับ repair-user.html) ══ */
/* ══ Categories / Buildings — โหลดจาก Firestore (ตั้งค่าได้ในแท็บ "ตั้งค่า") ══ */
var REPAIR_CATEGORIES = [];
var REPAIR_BUILDINGS  = [];
var REPAIR_RESPONSIBLE = []; /* รายชื่อผู้รับผิดชอบ (คัดมาจาก staff.html) — ตั้งค่าได้ในแท็บ "ตั้งค่า" */
var DEFAULT_CATEGORIES = [
  { id:'electric',  label:'ไฟฟ้า',                 icon:'zap' },
  { id:'plumbing',  label:'ประปา',                 icon:'droplet' },
  { id:'aircon',    label:'เครื่องปรับอากาศ',       icon:'wind' },
  { id:'building',  label:'อาคาร/สถานที่',          icon:'building-2' },
  { id:'it',        label:'คอมพิวเตอร์/เครือข่าย',  icon:'monitor' },
  { id:'furniture', label:'เฟอร์นิเจอร์',           icon:'armchair' },
  { id:'other',     label:'อื่นๆ',                  icon:'more-horizontal' }
];

/* ── สีประจำหมวดหมู่: สุ่มคงที่จาก id ของหมวดหมู่ (ต้อง sync logic เดียวกับ repair-user.html
     เพื่อให้หมวดหมู่เดียวกันได้สีเดียวกันทั้งสองหน้า) ── */
var CATEGORY_PALETTE = [
  { bg: 'var(--blue-light)',   border: 'var(--blue-mid)',   text: 'var(--blue-dark)',   hex: '#1d4ed8' },
  { bg: 'var(--green-light)',  border: 'var(--green-mid)',  text: '#15803d',            hex: '#15803d' },
  { bg: 'var(--amber-light)',  border: 'var(--amber-mid)',  text: '#92400e',            hex: '#92400e' },
  { bg: 'var(--red-light)',    border: 'var(--red-mid)',    text: 'var(--red-dark)',    hex: '#b91c1c' },
  { bg: 'var(--sky-light)',    border: 'var(--sky-mid)',    text: '#075985',            hex: '#075985' },
  { bg: 'var(--purple-light)', border: 'var(--purple-mid)', text: 'var(--purple-dark)', hex: '#6d28d9' }
];

var WF_LABELS = ['แจ้งปัญหา','อนุมัติ','ดำเนินการ','ตรวจสอบ','ปิดงาน'];

/* ══ Page State ══ */
var currentUser    = null;
var allRepairs     = [];
var currentFilter  = 'all';
var currentSearch  = '';
var currentSubTab  = 'active';
var repSubTabs, repReportSubtabs; // handle จาก initSubtabs() — ผูกใน onAuth หลัง renderPage()
var currentActiveBuildingFilter = ''; /* กรองรายการ "การแจ้งซ่อม" (ใหม่/กำลังดำเนินการ) รายอาคาร */
var currentActiveCategoryFilter = ''; /* กรองรายการ "การแจ้งซ่อม" (ใหม่/กำลังดำเนินการ) รายหมวดหมู่ */
var currentCategoryFilter = 'all'; /* กรองตารางประวัติทั้งหมด รายหมวดหมู่ */

/* ── ตัวกรองช่วงเวลา: ใช้ร่วมกันทั้งหน้า "การแจ้งซ่อม" (scope=active) และ "ประวัติทั้งหมด" (scope=history)
     แต่ละหน้าเลือกช่วงเวลาเป็นอิสระจากกัน โหมด: all / week / month (เลือกเดือน+ปี) / year (เลือกปี)
     ปีย้อนหลังเลือกได้สูงสุด 3 ปี (ปีปัจจุบัน + ย้อนหลัง 2 ปี) ── */
var periodState = {
  active:  { period: 'all', month: new Date().getMonth(), year: new Date().getFullYear() },
  history: { period: 'all', month: new Date().getMonth(), year: new Date().getFullYear() },
  print:   { period: 'all', month: new Date().getMonth(), year: new Date().getFullYear() }
};
/* ผู้รับผิดชอบที่เลือกไว้ในโมดัล "พิมพ์รายงาน" ('' = ทั้งหมด) */
var printTechnicianFilter = '';
/* สถานะที่เลือกไว้ในโมดัล "พิมพ์รายงาน" ('' = ทั้งหมด แยกตามสถานะ) */
var printStatusFilter = '';
var PERIOD_MODE_LABELS = { all: 'ทั้งหมด', week: 'สัปดาห์นี้', month: 'รายเดือน', year: 'รายปี' };
var THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
var PERIOD_MAX_YEARS_BACK = 3;

/* ══════════════════════════════════════════════════════════════
   Staff Picker: เลือกช่างผู้รับผิดชอบจากข้อมูลบุคลากร (staff.html)
   ใช้ suffix แยกอินสแตนซ์ระหว่างฟอร์ม "อนุมัติ" ('') กับ "มอบหมาย/อัปเดต" ('2')
   เป็น combobox — พิมพ์กรองรายชื่อได้ หรือพิมพ์ชื่อเองได้ (เช่น ช่างภายนอก)
   ══════════════════════════════════════════════════════════════ */
var REPAIR_STAFF_LIST = [];
var _repTechFilteredCache = {};

/* ══════════════════════════════════════════════════════════════
   ตั้งค่า: รายชื่อผู้รับผิดชอบ (repair_responsible)
   คัดเลือกมาจากข้อมูลบุคลากร (staff.html / คอลเลกชัน "staff")
   ใช้เป็นตัวเลือกลัดของช่อง "ช่างผู้รับผิดชอบ" ตอนอนุมัติแผนซ่อม/มอบหมายงาน
   (ยังพิมพ์ชื่อเองได้เสมอ ไม่ได้บังคับว่าต้องเลือกจากรายชื่อนี้เท่านั้น)
   ══════════════════════════════════════════════════════════════ */
var _respSelectedStaff  = null; /* บุคลากรที่เพิ่งถูกเลือกจาก dropdown ก่อนกดเพิ่ม */
var _respFilteredCache  = [];

/* ══════════════════════════════════════════════════════════════
   Data: repairs
   ══════════════════════════════════════════════════════════════ */
function loadData() {
  db.collection('repairs')
    .onSnapshot(function(snap) {
      allRepairs = [];
      snap.forEach(function(doc) { allRepairs.push(Object.assign({ id: doc.id }, doc.data())); });
      sortRepairList(allRepairs);
      renderStats();
      renderActivePanel();
      renderAssigneePanel();
      renderTable();
      if (currentSubTab === 'report') renderReportPanel();
    }, function(err) {
      console.error(err);
      showToast('โหลดข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    });
}

function loadRepairStaffList() {
  db.collection('staff').orderBy('name').get().then(function(snap) {
    REPAIR_STAFF_LIST = [];
    snap.forEach(function(doc) {
      var s = doc.data();
      REPAIR_STAFF_LIST.push({ name: s.name || '', position: s.position || '', group: s.group || '' });
    });
  }).catch(function(err) { console.error('loadRepairStaffList', err); });
}

/* ══════════════════════════════════════════════════════════════
   ตั้งค่า: หมวดหมู่การแจ้งซ่อม (repair_categories)
   ══════════════════════════════════════════════════════════════ */
function loadCategories() {
  db.collection('repair_categories').orderBy('createdAt', 'asc').onSnapshot(function(snap) {
    if (snap.empty) { seedDefaultCategories(); return; }
    REPAIR_CATEGORIES = [];
    snap.forEach(function(doc) { REPAIR_CATEGORIES.push(Object.assign({ id: doc.id }, doc.data())); });
    renderCatList();
    renderActiveCategoryFilterSelect();
    renderHistoryCategoryFilterBar();
    renderActivePanel();
    renderTable();
  }, function(err) { console.error('loadCategories', err); });
}

/* ══════════════════════════════════════════════════════════════
   ตั้งค่า: อาคาร / สถานที่ (repair_buildings)
   อาคาร: เจ้าหน้าที่สร้าง/ลบเท่านั้น
   สถานที่ย่อย (subLocations): สมาชิกทั่วไปเพิ่มได้เองตอนแจ้งซ่อม (repair-user.html)
   ที่นี่เจ้าหน้าที่ทำได้แค่ "ลบ" รายการที่พิมพ์ผิด/ซ้ำ เพื่อความสะอาดของข้อมูล
   ══════════════════════════════════════════════════════════════ */
function loadBuildings() {
  db.collection('repair_buildings').orderBy('createdAt', 'asc').onSnapshot(function(snap) {
    REPAIR_BUILDINGS = [];
    snap.forEach(function(doc) { REPAIR_BUILDINGS.push(Object.assign({ id: doc.id }, doc.data())); });
    renderBldList();
    renderActiveBuildingFilterSelect();
  }, function(err) { console.error('loadBuildings', err); });
}

function loadResponsibleList() {
  db.collection('repair_responsible').orderBy('createdAt', 'asc').onSnapshot(function(snap) {
    REPAIR_RESPONSIBLE = [];
    snap.forEach(function(doc) { REPAIR_RESPONSIBLE.push(Object.assign({ id: doc.id }, doc.data())); });
    renderRespList();
    renderAssigneePanel();
  }, function(err) { console.error('loadResponsibleList', err); });
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
/* ── สีของแต่ละหมวดหมู่: ใช้สีที่ตั้งไว้เอง (เลือกได้ตอนเพิ่ม/แก้ไขหมวดหมู่) ก่อน
     ถ้าไม่มีค่อย fallback เป็นสีสุ่มคงที่จาก id เหมือนเดิม (sync กับ repair-user.html
     เพื่อให้หมวดหมู่เดียวกันได้สีเดียวกันทั้งสองหน้า รวมถึงกราฟ) ── */
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
    case 'reported': return { label:'รออนุมัติ',                color:'amber',  steps:['done','active','pending','pending','pending'] };
    case 'rejected': return { label:'ไม่อนุมัติ',                color:'red',    steps:['done','revision','pending','pending','pending'] };
    case 'approved': return { label: r.repairStatus === 'in_progress' ? 'กำลังซ่อม' : 'รอซ่อม', color:'sky', steps:['done','done','active','pending','pending'] };
    case 'done':      return { label:'รอผู้แจ้งตรวจสอบ',         color:'purple', steps:['done','done','done','active','pending'] };
    case 'reopened':  return { label: r.repairStatus === 'in_progress' ? 'ซ่อมใหม่ (กำลังซ่อม)' : 'ซ่อมใหม่ (รอซ่อม)', color:'red', steps:['done','done','active','revision','pending'] };
    case 'closed':    return { label:'ปิดงานแล้ว',               color:'green',  steps:['done','done','done','done','final'] };
    default:          return { label:'ไม่ทราบสถานะ',             color:'amber',  steps:['pending','pending','pending','pending','pending'] };
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

/* fmtDate() ใช้ตัวกลางจาก common.js (ดูย้อนหลังได้สูงสุด 3 ปี) */

function getPeriodRange(scope) {
  var st = periodState[scope];
  var now = new Date();
  if (st.period === 'week') {
    var day = now.getDay();
    var diffToMonday = (day === 0 ? -6 : 1 - day);
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    var end = new Date(start); end.setDate(start.getDate() + 7);
    return [start, end];
  }
  if (st.period === 'month') {
    var start = new Date(st.year, st.month, 1);
    var end = new Date(st.year, st.month + 1, 1);
    return [start, end];
  }
  if (st.period === 'year') {
    var start = new Date(st.year, 0, 1);
    var end = new Date(st.year + 1, 0, 1);
    return [start, end];
  }
  return null; /* all */
}

/* ── แถบเลือกช่วงเวลา: ปุ่มโหมด + (ถ้าเลือกรายเดือน/รายปี) ป๊อปอัปเลือกเดือน/ปีแบบสวย ── */
function renderPeriodBar(containerId, scope) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var st = periodState[scope];

  var html = ['all', 'week', 'month', 'year'].map(function(p) {
    var active = st.period === p;
    return '<button class="filter-pill' + (active ? ' active' : '') + '" onclick="setPeriodMode(\'' + scope + '\',\'' + p + '\')">' + PERIOD_MODE_LABELS[p] + '</button>';
  }).join('');

  if (st.period === 'month' || st.period === 'year') {
    var label = st.period === 'month' ? (THAI_MONTHS[st.month] + ' ' + (st.year + 543)) : ('ปี ' + (st.year + 543));
    html +=
      '<div class="period-picker" style="position:relative;display:inline-block;">' +
        '<button type="button" onclick="togglePeriodPopover(\'' + scope + '\')" ' +
          'style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;border:1px solid var(--border);background:var(--white);font-size:12.5px;font-weight:700;color:var(--text);cursor:pointer;">' +
          '<i data-lucide="calendar" style="width:13px;height:13px;color:var(--purple);"></i>' + label +
          '<i data-lucide="chevron-down" style="width:12px;height:12px;color:var(--text3);"></i>' +
        '</button>' +
        '<div id="periodPopover-' + scope + '" class="period-popover" style="display:none;position:fixed;z-index:9999;background:var(--white);border:1px solid var(--border);border-radius:14px;box-shadow:0 10px 28px rgba(0,0,0,.14);padding:12px;width:230px;max-width:calc(100vw - 24px);box-sizing:border-box;">' +
          renderPeriodPopoverBody(scope) +
        '</div>' +
      '</div>';
  }
  el.innerHTML = html;
  lucide.createIcons();
}

function renderPeriodPopoverBody(scope) {
  var st = periodState[scope];
  var curYear = new Date().getFullYear();
  var curMonth = new Date().getMonth();
  var years = [];
  for (var i = 0; i < PERIOD_MAX_YEARS_BACK; i++) years.push(curYear - i);

  if (st.period === 'year') {
    return (
      '<div style="font-size:10.5px;font-weight:800;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px;">เลือกปี (ย้อนหลังสูงสุด ' + PERIOD_MAX_YEARS_BACK + ' ปี)</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;">' +
      years.map(function(y) {
        var active = y === st.year;
        return '<button type="button" onclick="setPeriodYear(\'' + scope + '\',' + y + ')" style="text-align:left;padding:9px 12px;border-radius:10px;border:1px solid ' + (active ? 'var(--purple)' : 'var(--border)') + ';background:' + (active ? 'var(--purple)' : 'var(--white)') + ';color:' + (active ? 'var(--gray-light)' : 'var(--text)') + ';font-size:13px;font-weight:700;cursor:pointer;transition:.15s;">พ.ศ. ' + (y + 543) + '</button>';
      }).join('') +
      '</div>'
    );
  }

  /* month mode */
  var yearIdx = years.indexOf(st.year);
  var prevDisabled = yearIdx >= years.length - 1; /* ไปปีเก่ากว่านี้ไม่ได้แล้ว (สุดขอบ 3 ปีย้อนหลัง) */
  var nextDisabled = yearIdx <= 0; /* ไปปีถัดไปไม่ได้ถ้าอยู่ปีปัจจุบันแล้ว */

  var monthsGrid = THAI_MONTHS.map(function(m, idx) {
    var future = (st.year === curYear && idx > curMonth);
    var active = idx === st.month;
    return '<button type="button" ' + (future ? 'disabled' : ('onclick="setPeriodMonth(\'' + scope + '\',' + idx + ')"')) +
      ' style="padding:8px 0;border-radius:9px;border:1px solid ' + (active ? 'var(--purple)' : 'var(--border)') + ';background:' + (active ? 'var(--purple)' : 'var(--white)') + ';color:' + (future ? 'var(--text3)' : (active ? 'var(--gray-light)' : 'var(--text)')) + ';font-size:12.5px;font-weight:700;cursor:' + (future ? 'not-allowed' : 'pointer') + ';opacity:' + (future ? '.4' : '1') + ';">' + m + '</button>';
  }).join('');

  return (
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
      '<button type="button" ' + (prevDisabled ? 'disabled' : ('onclick="stepPeriodYear(\'' + scope + '\',-1)"')) +
        ' style="width:26px;height:26px;border-radius:8px;border:1px solid var(--border);background:var(--white);display:flex;align-items:center;justify-content:center;cursor:' + (prevDisabled ? 'not-allowed' : 'pointer') + ';opacity:' + (prevDisabled ? '.35' : '1') + ';" aria-label="ปีก่อนหน้า"><i data-lucide="chevron-left" style="width:14px;height:14px;"></i></button>' +
      '<div style="font-size:13.5px;font-weight:800;color:var(--text);">พ.ศ. ' + (st.year + 543) + '</div>' +
      '<button type="button" ' + (nextDisabled ? 'disabled' : ('onclick="stepPeriodYear(\'' + scope + '\',1)"')) +
        ' style="width:26px;height:26px;border-radius:8px;border:1px solid var(--border);background:var(--white);display:flex;align-items:center;justify-content:center;cursor:' + (nextDisabled ? 'not-allowed' : 'pointer') + ';opacity:' + (nextDisabled ? '.35' : '1') + ';" aria-label="ปีถัดไป"><i data-lucide="chevron-right" style="width:14px;height:14px;"></i></button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">' + monthsGrid + '</div>'
  );
}

/* เปิด/ปิดป๊อปอัปเลือกเดือน-ปี (ปิดตัวอื่นเสมอเวลาเปิดตัวใหม่ และปิดเมื่อคลิกนอกกล่อง) */
/* จัดตำแหน่งป๊อปอัปให้อยู่ในจอเสมอ (กันล้นซ้าย/ขวา) โดยเช็คพื้นที่จริงหลัง render */
function positionPeriodPopover(scope) {
  var el = document.getElementById('periodPopover-' + scope);
  if (!el || el.style.display !== 'block') return;
  var wrap = el.closest('.period-picker');
  var btn = wrap ? wrap.querySelector('button') : null;
  if (!btn) return;

  var btnRect = btn.getBoundingClientRect();
  var popRect = el.getBoundingClientRect(); /* ใช้ขนาดจริงหลัง render (width/height คงที่พอ) */
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var margin = 8;

  /* แนวนอน: ชิดซ้ายปุ่มเป็นค่าเริ่มต้น แต่ถ้าล้นขวาจอ ให้เลื่อนมาชิดขอบขวาปุ่มแทน */
  var left = btnRect.left;
  if (left + popRect.width > vw - margin) left = btnRect.right - popRect.width;
  if (left < margin) left = margin;

  /* แนวตั้ง: ปกติวางใต้ปุ่ม แต่ถ้าพื้นที่ด้านล่างไม่พอ ให้เปิดขึ้นด้านบนปุ่มแทน */
  var top = btnRect.bottom + 6;
  if (top + popRect.height > vh - margin) {
    var above = btnRect.top - 6 - popRect.height;
    top = above > margin ? above : margin;
  }

  el.style.left = left + 'px';
  el.style.top  = top + 'px';
  el.style.right = 'auto';
}

function rerenderPeriodScope(scope) {
  if (scope === 'active') { renderStats(); renderActivePanel(); }
  else if (scope === 'history') { renderTable(); }
  else if (scope === 'print') { renderPeriodBar('printPeriodBar', 'print'); }
}
function reopenPeriodPopover(scope) {
  /* render ใหม่ทำให้ popover ถูกสร้างใหม่ (ปิดอยู่โดย default) — เปิดกลับให้ทันทีเพื่อให้เลือกต่อได้ลื่นๆ */
  setTimeout(function() {
    var el = document.getElementById('periodPopover-' + scope);
    if (el) { el.style.display = 'block'; positionPeriodPopover(scope); }
  }, 0);
}
function setPeriodMode(scope, mode) {
  periodState[scope].period = mode;
  if ((mode === 'month' || mode === 'year') && !periodState[scope].year) periodState[scope].year = new Date().getFullYear();
  rerenderPeriodScope(scope);
  if (mode === 'month' || mode === 'year') reopenPeriodPopover(scope);
}
function setPeriodMonth(scope, m) {
  periodState[scope].month = parseInt(m, 10);
  rerenderPeriodScope(scope); /* เลือกเดือนแล้วถือว่าเสร็จ — ป๊อปอัปปิดตามปกติ */
}
function setPeriodYear(scope, y) {
  periodState[scope].year = parseInt(y, 10);
  rerenderPeriodScope(scope); /* เลือกปีแล้วถือว่าเสร็จ (โหมดรายปี) — ป๊อปอัปปิดตามปกติ */
}
function stepPeriodYear(scope, delta) {
  var curYear = new Date().getFullYear();
  var minYear = curYear - (PERIOD_MAX_YEARS_BACK - 1);
  var y = periodState[scope].year + delta;
  if (y > curYear) y = curYear;
  if (y < minYear) y = minYear;
  periodState[scope].year = y;
  var curMonth = new Date().getMonth();
  if (y === curYear && periodState[scope].month > curMonth) periodState[scope].month = curMonth;
  rerenderPeriodScope(scope);
  reopenPeriodPopover(scope); /* ใช้ลูกศรเลื่อนปีอยู่ — เก็บป๊อปอัปให้เปิดค้างไว้เลือกเดือนต่อ */
}
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════════════════════
   Render: หน้าหลัก — sub-tab: การแจ้งซ่อม / ประวัติทั้งหมด / ตั้งค่า
   ══════════════════════════════════════════════════════════════ */
function renderPage() {
  return (
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title-row">' +
          '<div class="page-icon" style="background:linear-gradient(135deg,var(--purple),var(--purple-mid));">' +
            '<i data-lucide="wrench" style="width:20px;height:20px;color:white;"></i>' +
          '</div>' +
          '<h1 class="page-title">จัดการระบบแจ้งซ่อม</h1>' +
        '</div>' +
        '<p class="page-sub">ตรวจอนุมัติ มอบหมายช่าง และติดตามงานซ่อมทั้งหมด</p>' +
      '</div>' +
      '<button class="btn-primary" onclick="openPrintReportModal()">' +
        '<i data-lucide="printer" style="width:15px;height:15px;"></i> พิมพ์รายงาน' +
      '</button>' +
    '</div>' +

    '<div class="sub-tab-bar" id="repSubTabBar">' +
      '<button class="sub-tab active" data-tab="active"><i data-lucide="inbox" style="width:14px;height:14px;"></i> การแจ้งซ่อม</button>' +
      '<button class="sub-tab" data-tab="assignee"><i data-lucide="users" style="width:14px;height:14px;"></i> ผู้รับผิดชอบ</button>' +
      '<button class="sub-tab" data-tab="history"><i data-lucide="history" style="width:14px;height:14px;"></i> ประวัติทั้งหมด</button>' +
      '<button class="sub-tab" data-tab="report"><i data-lucide="bar-chart-3" style="width:14px;height:14px;"></i> รายงาน</button>' +
      '<button class="sub-tab" data-tab="settings"><i data-lucide="settings" style="width:14px;height:14px;"></i> ตั้งค่า</button>' +
    '</div>' +

    /* ── Panel: การแจ้งซ่อม (ใหม่ / กำลังดำเนินการ) ── */
    '<div class="tab-pane active" data-panel="active" id="repPanelActive">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:12px;">' +
        '<span style="font-size:11.5px;color:var(--text3);font-weight:700;white-space:nowrap;"><i data-lucide="calendar-days" style="width:12px;height:12px;display:inline;vertical-align:-2px;margin-right:3px;"></i>ช่วงเวลา</span>' +
        '<div id="repActivePeriodBar" style="display:flex;gap:6px;flex-wrap:wrap;"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--gap-card);margin-bottom:var(--gap-section);" id="repStatGrid"></div>' +

      '<div class="chart-grid">' +
        '<div class="chart-card">' +
          '<div class="chart-title"><i data-lucide="building-2" style="width:13px;height:13px;display:inline;vertical-align:-2px;margin-right:4px;color:var(--sky);"></i>แยกตามอาคาร</div>' +
          '<div class="chart-sub">นับรวมย้อนหลังทั้งหมดทุกสถานะ (รวมที่ปิดงานแล้ว) — คลิกแท่งเพื่อกรองรายการด้านล่าง</div>' +
          '<div id="repBuildingChart"></div>' +
        '</div>' +
        '<div class="chart-card">' +
          '<div class="chart-title"><i data-lucide="tags" style="width:13px;height:13px;display:inline;vertical-align:-2px;margin-right:4px;color:var(--purple);"></i>แยกตามหมวดหมู่</div>' +
          '<div class="chart-sub">นับรวมย้อนหลังทั้งหมด ตามอาคารที่เลือกไว้ด้านล่าง (หรือทุกอาคารหากยังไม่เลือก)</div>' +
          '<div id="repCategoryChart"></div>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between;margin:22px 0 10px;">' +
        '<div class="rp-sec-title" style="margin:0;"><i data-lucide="bell-ring" style="width:15px;height:15px;color:var(--amber);"></i> รายการแจ้งซ่อมใหม่ (รออนุมัติ)</div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<label for="repActiveBuildingFilter" style="font-size:11.5px;color:var(--text3);font-weight:700;white-space:nowrap;"><i data-lucide="filter" style="width:12px;height:12px;display:inline;vertical-align:-2px;margin-right:3px;"></i>อาคาร</label>' +
          '<select id="repActiveBuildingFilter" onchange="setActiveBuildingFilter(this.value)" style="max-width:200px;"><option value="">ทุกอาคาร</option></select>' +
          '<label for="repActiveCategoryFilter" style="font-size:11.5px;color:var(--text3);font-weight:700;white-space:nowrap;">หมวดหมู่</label>' +
          '<select id="repActiveCategoryFilter" onchange="setActiveCategoryFilter(this.value)" style="max-width:200px;"><option value="">ทุกหมวดหมู่</option></select>' +
        '</div>' +
      '</div>' +
      '<div id="repNewList"></div>' +
      '<div class="rp-sec-title"><i data-lucide="hammer" style="width:15px;height:15px;color:var(--sky);"></i> รายการที่กำลังดำเนินการ</div>' +
      '<div id="repProgressList"></div>' +
    '</div>' +

    /* ── Panel: ผู้รับผิดชอบ (สรุปงานที่มอบหมายให้แต่ละคน) ── */
    '<div class="tab-pane" data-panel="assignee" id="repPanelAssignee">' +
      '<div id="assigneeGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;"></div>' +
    '</div>' +

    /* ── Panel: ประวัติทั้งหมด ── */
    '<div class="tab-pane" data-panel="history" id="repPanelHistory">' +
      '<div class="card" style="margin-bottom:16px;">' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;">' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;" id="repFilterBar">' +
            '<button class="filter-pill active" data-f="all" onclick="setFilter(\'all\')">ทั้งหมด</button>' +
            '<button class="filter-pill" data-f="reported" onclick="setFilter(\'reported\')">รออนุมัติ</button>' +
            '<button class="filter-pill" data-f="progress" onclick="setFilter(\'progress\')">กำลังซ่อม</button>' +
            '<button class="filter-pill" data-f="done" onclick="setFilter(\'done\')">รอตรวจสอบ</button>' +
            '<button class="filter-pill" data-f="closed" onclick="setFilter(\'closed\')">ปิดงานแล้ว</button>' +
            '<button class="filter-pill" data-f="rejected" onclick="setFilter(\'rejected\')">ไม่อนุมัติ</button>' +
          '</div>' +
          '<input type="text" id="repSearchInput" placeholder="ค้นหาเรื่อง/สถานที่/ผู้แจ้ง..." style="max-width:240px;" oninput="setSearch(this.value)">' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-soft);">' +
          '<span style="font-size:11.5px;color:var(--text3);font-weight:700;white-space:nowrap;"><i data-lucide="calendar-days" style="width:12px;height:12px;display:inline;vertical-align:-2px;margin-right:3px;"></i>ช่วงเวลา</span>' +
          '<div id="repHistoryPeriodBar" style="display:flex;gap:6px;flex-wrap:wrap;"></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-soft);" id="repCatFilterBar"></div>' +
      '</div>' +
      '<div class="card" style="padding:0;overflow-x:auto;">' +
        '<table class="data-table" id="repairTable">' +
          '<thead><tr>' +
            '<th>วันที่แจ้ง</th><th>เรื่อง / สถานที่</th><th>หมวดหมู่</th><th>ผู้แจ้ง</th><th>สถานะ</th><th></th>' +
          '</tr></thead>' +
          '<tbody id="repairTableBody"></tbody>' +
        '</table>' +
        '<div id="repairEmptyState" style="display:none;"></div>' +
      '</div>' +
    '</div>' +

    /* ── Panel: รายงาน (สถิติรายสัปดาห์/รายเดือน/เปรียบเทียบ/รายปี/หมวดหมู่) ── */
    '<div class="tab-pane" data-panel="report" id="repPanelReport">' +
      '<div class="sub-tab-bar" id="repReportNav" style="margin-bottom:16px;">' +
        '<button class="sub-tab active" data-tab="week">รายสัปดาห์</button>' +
        '<button class="sub-tab" data-tab="month">รายเดือน</button>' +
        '<button class="sub-tab" data-tab="compare">เปรียบเทียบรายเดือน</button>' +
        '<button class="sub-tab" data-tab="year">รายปี</button>' +
        '<button class="sub-tab" data-tab="category">แยกตามหมวดหมู่</button>' +
      '</div>' +

      '<div class="tab-pane active" data-panel="week" id="repRptWeek">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
          '<div style="font-size:11.5px;color:var(--text3);font-weight:700;"><i data-lucide="calendar-days" style="width:12px;height:12px;display:inline;vertical-align:-2px;margin-right:3px;"></i>แจ้งซ่อมย้อนหลังรายสัปดาห์ (จันทร์–อาทิตย์)</div>' +
          '<div style="display:flex;gap:6px;" id="repRptWeekRangeBar">' +
            '<button class="filter-pill active" onclick="setReportWeekRange(8,this)">8 สัปดาห์</button>' +
            '<button class="filter-pill" onclick="setReportWeekRange(12,this)">12 สัปดาห์</button>' +
            '<button class="filter-pill" onclick="setReportWeekRange(26,this)">26 สัปดาห์</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--gap-card);margin-bottom:var(--gap-section);" id="repRptWeekKpi"></div>' +
        '<div class="chart-card"><div class="chart-title">จำนวนแจ้งซ่อมต่อสัปดาห์</div><div id="repRptWeekChart"></div></div>' +
      '</div>' +

      '<div class="tab-pane" data-panel="month" id="repRptMonth">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
          '<div style="font-size:11.5px;color:var(--text3);font-weight:700;">สถิติของเดือนที่เลือก</div>' +
          '<select id="repRptMonthSelect" onchange="setReportMonth(this.value)" style="max-width:200px;"></select>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--gap-card);margin-bottom:var(--gap-section);" id="repRptMonthKpi"></div>' +
        '<div class="chart-grid">' +
          '<div class="chart-card"><div class="chart-title">แยกตามสถานะ</div><div id="repRptMonthStatusChart"></div></div>' +
          '<div class="chart-card"><div class="chart-title">แยกตามหมวดหมู่</div><div id="repRptMonthCatChart"></div></div>' +
        '</div>' +
      '</div>' +

      '<div class="tab-pane" data-panel="compare" id="repRptCompare">' +
        '<div style="font-size:11.5px;color:var(--text3);font-weight:700;margin-bottom:12px;">เปรียบเทียบจำนวนแจ้งซ่อมของแต่ละเดือน (ทุกเดือนที่มีข้อมูล)</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--gap-card);margin-bottom:var(--gap-section);" id="repRptCompareKpi"></div>' +
        '<div class="chart-card"><div class="chart-title">จำนวนแจ้งซ่อมรายเดือน</div><div id="repRptCompareChart"></div></div>' +
      '</div>' +

      '<div class="tab-pane" data-panel="year" id="repRptYear">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
          '<div style="font-size:11.5px;color:var(--text3);font-weight:700;">สรุปรายปี แยกตาม 12 เดือน</div>' +
          '<select id="repRptYearSelect" onchange="setReportYear(this.value)" style="max-width:140px;"></select>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--gap-card);margin-bottom:var(--gap-section);" id="repRptYearKpi"></div>' +
        '<div class="chart-card"><div class="chart-title">จำนวนแจ้งซ่อมรายเดือน</div><div id="repRptYearChart"></div></div>' +
      '</div>' +

      '<div class="tab-pane" data-panel="category" id="repRptCategory">' +
        '<div style="font-size:11.5px;color:var(--text3);font-weight:700;margin-bottom:12px;">สถิติการแจ้งซ่อมแยกตามหมวดหมู่ (ทั้งหมดทุกช่วงเวลา)</div>' +
        '<div class="chart-grid">' +
          '<div class="chart-card"><div class="chart-title">สัดส่วนตามหมวดหมู่</div><div id="repRptCatDonut"></div></div>' +
          '<div class="chart-card" style="padding:0;overflow-x:auto;">' +
            '<div class="chart-title" style="padding:18px 20px 0;">ตารางสรุป</div>' +
            '<table class="data-table" id="repRptCatTable">' +
              '<thead><tr><th>หมวดหมู่</th><th style="text-align:right">จำนวน</th><th style="text-align:right">สัดส่วน</th><th style="text-align:right">ปิดงานแล้ว</th></tr></thead>' +
              '<tbody></tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ── Panel: ตั้งค่า (หมวดหมู่ / สถานที่) ── */
    '<div class="tab-pane" data-panel="settings" id="repPanelSettings">' +
      '<div class="rp-settings-grid">' +

        '<div class="card">' +
          '<div class="rp-sec-title" style="margin-top:0;"><i data-lucide="tags" style="width:15px;height:15px;color:var(--purple);"></i> หมวดหมู่การแจ้งซ่อม</div>' +
          '<div class="rp-inline-form">' +
            '<input type="text" id="newCatLabel" placeholder="ชื่อหมวดหมู่ เช่น กระจก/ประตู">' +
            '<input type="text" id="newCatIcon" placeholder="ไอคอน (lucide) เช่น wrench" style="max-width:150px;">' +
            '<input type="color" id="newCatColor" value="' + randomCatColor() + '" title="เลือกสีหมวดหมู่" style="width:40px;height:34px;padding:2px;border-radius:8px;cursor:pointer;flex-shrink:0;">' +
            '<button class="btn-primary" onclick="addCategory()"><i data-lucide="plus" style="width:14px;height:14px;"></i> เพิ่ม</button>' +
          '</div>' +
          '<p style="font-size:11px;color:var(--text3);margin-top:-8px;margin-bottom:12px;">ชื่อไอคอนดูได้ที่ <a href="https://lucide.dev/icons" target="_blank" rel="noopener">lucide.dev/icons</a> (ไม่ใส่ก็ได้ ระบบจะใช้ไอคอนเริ่มต้น)</p>' +
          '<div id="catList"></div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="rp-sec-title" style="margin-top:0;"><i data-lucide="building-2" style="width:15px;height:15px;color:var(--sky);"></i> อาคาร / สถานที่</div>' +
          '<div class="rp-inline-form">' +
            '<input type="text" id="newBldName" placeholder="ชื่ออาคาร เช่น อาคาร 1">' +
            '<button class="btn-primary" onclick="addBuilding()"><i data-lucide="plus" style="width:14px;height:14px;"></i> เพิ่ม</button>' +
          '</div>' +
          '<p style="font-size:11px;color:var(--text3);margin-top:-8px;margin-bottom:12px;">เจ้าหน้าที่ตั้งชื่ออาคารไว้ล่วงหน้า ส่วนสถานที่ย่อย (เช่น ห้อง/บริเวณ) สมาชิกจะพิมพ์เพิ่มเองตอนแจ้งซ่อม แล้วจะถูกบันทึกไว้ให้เลือกในครั้งถัดไปโดยอัตโนมัติ</p>' +
          '<div id="bldList"></div>' +
        '</div>' +

        '<div class="card" style="grid-column:1 / -1;">' +
          '<div class="rp-sec-title" style="margin-top:0;"><i data-lucide="user-check" style="width:15px;height:15px;color:var(--green);"></i> รายชื่อผู้รับผิดชอบ (ช่างซ่อม)</div>' +
          '<p style="font-size:11px;color:var(--text3);margin-top:-8px;margin-bottom:12px;">เลือกรายชื่อจากข้อมูลบุคลากร (หน้า "บุคลากร") เพื่อกำหนดเป็นตัวเลือกลัดของ "ช่างผู้รับผิดชอบ" ตอนอนุมัติแผนซ่อม — หากยังไม่เพิ่มชื่อไว้ที่นี่ ตอนอนุมัติจะยังพิมพ์ชื่อเองได้ตามปกติ</p>' +
          '<div class="rp-inline-form">' +
            '<div class="staff-picker-wrap" id="respPickerWrap" style="flex:1;min-width:200px;">' +
              '<input type="text" id="newRespName" class="staff-picker-input" placeholder="พิมพ์ชื่อบุคลากรเพื่อค้นหา..." autocomplete="off" oninput="filterRespPicker()" onfocus="openRespPicker()">' +
              '<div class="staff-picker-dropdown" id="respDropdown"><div id="respPickerList"></div></div>' +
            '</div>' +
            '<button class="btn-primary" onclick="addResponsible()"><i data-lucide="plus" style="width:14px;height:14px;"></i> เพิ่ม</button>' +
          '</div>' +
          '<div id="respList"></div>' +
        '</div>' +

      '</div>' +
    '</div>'
  );
}

function renderStats() {
  renderPeriodBar('repActivePeriodBar', 'active');
  var scoped = filterByPeriod(allRepairs, 'active');
  var reported = scoped.filter(function(r) { return r.status === 'reported'; }).length;
  var progress = scoped.filter(function(r) { return ['approved','reopened'].indexOf(r.status) !== -1; }).length;
  var waitReview = scoped.filter(function(r) { return r.status === 'done'; }).length;
  var closed = scoped.filter(function(r) { return r.status === 'closed'; }).length;

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

  var el = document.getElementById('repStatGrid');
  if (!el) return;
  el.innerHTML =
    stat('inbox',          'var(--amber)',  'var(--amber-light)',  reported,   'รออนุมัติ') +
    stat('hammer',         'var(--sky)',    'var(--sky-light)',    progress,   'กำลังซ่อม') +
    stat('eye',            'var(--purple)', 'var(--purple-light)', waitReview, 'รอผู้แจ้งตรวจสอบ') +
    stat('check-check',    'var(--green)',  'var(--green-light)',  closed,     'ปิดงานแล้ว');
  lucide.createIcons();
}

/* ── Panel "การแจ้งซ่อม": แยกรายการใหม่ / กำลังดำเนินการ ── */
function renderActivePanel() {
  var newList = document.getElementById('repNewList');
  var progList = document.getElementById('repProgressList');
  if (!newList || !progList) return;

  var periodScoped = filterByPeriod(allRepairs, 'active');
  var newItemsAll  = periodScoped.filter(function(r) { return r.status === 'reported'; });
  var progItemsAll = periodScoped.filter(function(r) { return ['approved','reopened','done'].indexOf(r.status) !== -1; });

  var newItems  = filterByActiveCategory(filterByActiveBuilding(newItemsAll));
  var progItems = filterByActiveCategory(filterByActiveBuilding(progItemsAll));

  newList.innerHTML  = newItems.length  ? newItems.map(renderMiniCard).join('')  : emptyMini((currentActiveBuildingFilter || currentActiveCategoryFilter) ? 'ไม่มีรายการแจ้งซ่อมใหม่ตรงกับตัวกรองนี้' : 'ไม่มีรายการแจ้งซ่อมใหม่');
  progList.innerHTML = progItems.length ? progItems.map(renderMiniCard).join('') : emptyMini((currentActiveBuildingFilter || currentActiveCategoryFilter) ? 'ไม่มีงานที่กำลังดำเนินการตรงกับตัวกรองนี้' : 'ไม่มีงานที่กำลังดำเนินการ');

  /* กราฟอาคาร/หมวดหมู่: นับตามช่วงเวลาที่เลือกไว้ด้านบน (ทุกสถานะ รวมที่ปิดงานแล้ว) */
  renderBuildingChart(periodScoped);
  renderCategoryChart(filterByActiveBuilding(periodScoped));

  renderPeriodBar('repActivePeriodBar', 'active');
  lucide.createIcons();
}

/* ── ตัดชื่ออาคารออกจากข้อความสถานที่ "อาคาร 1 - ห้อง 101" → "อาคาร 1" ── */
function getBuildingNameFromLocation(loc) {
  if (!loc) return '';
  var idx = loc.indexOf(' - ');
  return idx === -1 ? loc : loc.substring(0, idx);
}

/* ── กราฟแท่งแนวนอน: จำนวนงานแยกตามอาคาร (คลิกเพื่อกรอง) ── */
function renderBuildingChart(list) {
  var el = document.getElementById('repBuildingChart');
  if (!el) return;

  var counts = {};
  list.forEach(function(r) {
    var b = getBuildingNameFromLocation(r.location) || 'ไม่ระบุอาคาร';
    counts[b] = (counts[b] || 0) + 1;
  });
  var keys = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });

  if (!keys.length) {
    el.innerHTML = '<div class="empty-state" style="padding:20px 0;"><i data-lucide="building-2" style="width:24px;height:24px;color:var(--text3);"></i><p style="margin-top:6px;font-size:12.5px;">ยังไม่มีข้อมูล</p></div>';
    lucide.createIcons();
    return;
  }

  var max = Math.max.apply(null, keys.map(function(k) { return counts[k]; }));
  el.innerHTML = keys.map(function(k) {
    var count  = counts[k];
    var pct    = Math.max(6, Math.round(count / max * 100));
    var active = currentActiveBuildingFilter === k;
    return (
      '<div class="hbar-row" style="cursor:pointer;" onclick="setActiveBuildingFilter(\'' + (active ? '' : k.replace(/'/g, "\\'")) + '\')" title="คลิกเพื่อ' + (active ? 'ยกเลิกการกรอง' : 'กรองตามอาคารนี้') + '">' +
        '<div class="hbar-label"><span class="hbar-name" style="' + (active ? 'color:var(--purple);' : '') + '">' + esc2(k) + (active ? ' ✓' : '') + '</span><span class="hbar-pct">' + count + '</span></div>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' + pct + '%;background:' + (active ? 'var(--purple)' : 'var(--sky)') + ';"></div></div>' +
      '</div>'
    );
  }).join('');
}

/* ── โดนัท: สัดส่วนงานแยกตามหมวดหมู่ (สีของกราฟตรงกับสีหมวดหมู่ที่ตั้งไว้ในแท็บ "ตั้งค่า") ── */
function renderCategoryChart(list) {
  var el = document.getElementById('repCategoryChart');
  if (!el) return;

  var total = list.length;
  if (!total) {
    el.innerHTML = '<div class="empty-state" style="padding:20px 0;"><i data-lucide="pie-chart" style="width:24px;height:24px;color:var(--text3);"></i><p style="margin-top:6px;font-size:12.5px;">ยังไม่มีข้อมูล</p></div>';
    lucide.createIcons();
    return;
  }

  var counts = {};
  list.forEach(function(r) {
    var key = r.category || 'other';
    counts[key] = (counts[key] || 0) + 1;
  });
  var keys = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });

  var cursor = 0;
  var gradientParts = [];
  var legendHtml = '';
  keys.forEach(function(key, i) {
    var cat   = getCategoryMeta(key);
    var count = counts[key];
    var pct   = count / total * 100;
    var color = getCategoryColor(key).text;
    gradientParts.push(color + ' ' + cursor + '% ' + (cursor + pct) + '%');
    cursor += pct;
    legendHtml +=
      '<div class="legend-row">' +
        '<span style="display:flex;align-items:center;gap:6px;min-width:0;">' +
          '<span class="legend-dot" style="background:' + color + ';"></span>' +
          '<span class="legend-label" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + cat.label + '</span>' +
        '</span>' +
        '<span class="legend-val">' + count + '</span>' +
      '</div>';
  });

  el.innerHTML =
    '<div class="donut-wrap" style="width:130px;height:130px;margin:0 auto;">' +
      '<div style="width:130px;height:130px;border-radius:50%;background:conic-gradient(' + gradientParts.join(',') + ');"></div>' +
      '<div class="donut-center" style="top:50%;left:50%;transform:translate(-50%,-50%);width:76px;height:76px;background:var(--white);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
        '<div class="donut-big">' + total + '</div>' +
        '<div class="donut-label">งาน</div>' +
      '</div>' +
    '</div>' +
    '<div class="donut-legend">' + legendHtml + '</div>';

  lucide.createIcons();
}

/* ── เติมตัวเลือกอาคารในดรอปดาวน์กรอง (เรียกจาก loadBuildings) ── */
function renderActiveBuildingFilterSelect() {
  var sel = document.getElementById('repActiveBuildingFilter');
  if (!sel) return;
  var current = currentActiveBuildingFilter;
  sel.innerHTML = '<option value="">ทุกอาคาร</option>' +
    REPAIR_BUILDINGS.map(function(b) {
      return '<option value="' + esc2(b.name).replace(/"/g, '&quot;') + '">' + esc2(b.name) + '</option>';
    }).join('');
  sel.value = current;
}

function emptyMini(text) {
  return '<div class="empty-state" style="padding:20px 0;"><i data-lucide="inbox" style="width:24px;height:24px;color:var(--text3);"></i><p style="margin-top:6px;font-size:12.5px;">' + text + '</p></div>';
}

function renderMiniCard(r) {
  var cat = getCategoryMeta(r.category);
  var col = getCategoryColor(r.category);
  var meta = getStatusMeta(r);
  return (
    '<div class="rp-mini-card" style="background:' + col.bg + ';border-color:' + col.border + ';border-left:4px solid ' + col.text + ';" onclick="openDetail(\'' + r.id + '\')">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">' +
        '<div style="min-width:0;flex:1;">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">' +
            (r.priority === 'urgent' ? '<span class="rp-urgent-tag"><i data-lucide="alert-triangle" style="width:11px;height:11px;"></i>เร่งด่วน</span>' : '') +
            '<span style="font-size:13.5px;font-weight:800;color:var(--text);">' + esc2(r.title || '') + '</span>' +
          '</div>' +
          '<div style="font-size:11.5px;color:var(--text3);display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
            '<span style="display:flex;align-items:center;gap:4px;color:' + col.text + ';font-weight:700;"><i data-lucide="' + cat.icon + '" style="width:11px;height:11px;"></i>' + cat.label + '</span>' +
            '<span style="display:flex;align-items:center;gap:4px;"><i data-lucide="map-pin" style="width:11px;height:11px;"></i>' + esc2(r.location || '') + '</span>' +
            '<span>' + esc2(r.reporterName || r.reporterEmail || '') + '</span>' +
            (r.reporterPhone ? '<span style="display:flex;align-items:center;gap:4px;"><i data-lucide="phone" style="width:11px;height:11px;"></i>' + esc2(r.reporterPhone) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<span class="rp-status c-' + meta.color + '">' + meta.label + '</span>' +
      '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════════════════════════
   Panel "ผู้รับผิดชอบ": สรุปงานที่มอบหมายให้แต่ละคน + สถิติตามสถานะ
   จับคู่งานกับคนด้วยชื่อใน r.technician (เทียบแบบ trim+lowercase)
   แสดงการ์ดตามรายชื่อผู้รับผิดชอบที่ตั้งค่าไว้ (REPAIR_RESPONSIBLE) ก่อน
   แล้วต่อท้ายด้วยชื่ออื่นๆ ที่เคยถูกพิมพ์มอบหมายเอง (ไม่ได้อยู่ในรายชื่อที่ตั้งค่าไว้)
   ══════════════════════════════════════════════════════════════ */
function _normName(s) { return (s || '').trim().toLowerCase(); }

function getAssigneeList() {
  var seen = {};
  var list = [];

  REPAIR_RESPONSIBLE.forEach(function(r) {
    var key = _normName(r.name);
    if (!key || seen[key]) return;
    seen[key] = true;
    list.push({ name: r.name, position: r.position || '', group: r.group || '', curated: true });
  });

  allRepairs.forEach(function(r) {
    var name = (r.technician || '').trim();
    var key = _normName(name);
    if (!key || seen[key]) return;
    seen[key] = true;
    list.push({ name: name, position: '', group: '', curated: false });
  });

  return list;
}

function renderAssigneePanel() {
  var el = document.getElementById('assigneeGrid');
  if (!el) return;

  var assignees = getAssigneeList();

  if (!assignees.length) {
    el.innerHTML = emptyMini('ยังไม่มีผู้รับผิดชอบ — เพิ่มรายชื่อได้ในแท็บ "ตั้งค่า" หรือระบุชื่อตอนอนุมัติแผนซ่อม');
    lucide.createIcons();
    return;
  }

  el.innerHTML = assignees.map(renderAssigneeCard).join('');
  lucide.createIcons();
}

function renderAssigneeCard(person) {
  var mine = allRepairs.filter(function(r) { return _normName(r.technician) === _normName(person.name); });

  var inProgress = mine.filter(function(r) { return (r.status === 'approved' || r.status === 'reopened') && r.repairStatus !== 'waiting'; }).length;
  var waiting    = mine.filter(function(r) { return (r.status === 'approved' || r.status === 'reopened') && r.repairStatus === 'waiting'; }).length;
  var review     = mine.filter(function(r) { return r.status === 'done'; }).length;
  var closed     = mine.filter(function(r) { return r.status === 'closed'; }).length;
  var total      = mine.length;

  var activeJobs = mine.filter(function(r) { return r.status !== 'closed'; })
    .sort(function(a, b) {
      var ta = a.updatedAt && a.updatedAt.toMillis ? a.updatedAt.toMillis() : 0;
      var tb = b.updatedAt && b.updatedAt.toMillis ? b.updatedAt.toMillis() : 0;
      return tb - ta;
    });

  var jobsHtml = activeJobs.length
    ? activeJobs.map(renderMiniCard).join('')
    : '<p style="font-size:12px;color:var(--text3);padding:4px 0 0;">ไม่มีงานค้างอยู่ในมือตอนนี้</p>';

  return (
    '<div class="card rp-assignee-card">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
        '<div style="width:38px;height:38px;border-radius:50%;background:var(--sky-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
          '<i data-lucide="user-round" style="width:18px;height:18px;color:var(--sky);"></i>' +
        '</div>' +
        '<div style="min-width:0;flex:1;">' +
          '<div style="font-size:14.5px;font-weight:800;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc2(person.name) + '</div>' +
          (person.position ? ('<div style="font-size:11.5px;color:var(--text3);">' + esc2(person.position) + (person.group ? (' · ' + esc2(person.group)) : '') + '</div>') : '') +
        '</div>' +
        '<span class="rp-status c-sky" title="งานทั้งหมดที่เคยได้รับมอบหมาย">' + total + ' งาน</span>' +
      '</div>' +

      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">' +
        '<span class="rp-status c-sky"><i data-lucide="wrench" style="width:11px;height:11px;"></i> กำลังซ่อม ' + inProgress + '</span>' +
        '<span class="rp-status c-amber"><i data-lucide="clock" style="width:11px;height:11px;"></i> รอซ่อม/รออะไหล่ ' + waiting + '</span>' +
        '<span class="rp-status c-purple"><i data-lucide="eye" style="width:11px;height:11px;"></i> รอตรวจสอบ ' + review + '</span>' +
        '<span class="rp-status c-green"><i data-lucide="check-check" style="width:11px;height:11px;"></i> ปิดงานแล้ว ' + closed + '</span>' +
      '</div>' +

      '<div class="rp-sec-title" style="margin:0 0 8px;font-size:12px;"><i data-lucide="list-checks" style="width:13px;height:13px;color:var(--text3);"></i> งานที่ยังไม่ปิด (' + activeJobs.length + ')</div>' +
      jobsHtml +
    '</div>'
  );
}

/* ── แถบกรองตามหมวดหมู่ของตาราง "ประวัติทั้งหมด" (สีปุ่มตรงกับสีหมวดหมู่นั้นๆ) ── */
function renderHistoryCategoryFilterBar() {
  var bar = document.getElementById('repCatFilterBar');
  if (!bar) return;

  var html = '<button class="filter-pill' + (currentCategoryFilter === 'all' ? ' active' : '') +
    '" data-cf="all" onclick="setHistoryCategoryFilter(\'all\')">ทุกหมวดหมู่</button>';

  REPAIR_CATEGORIES.forEach(function(c) {
    var col = getCategoryColor(c.id);
    var isActive = currentCategoryFilter === c.id;
    html += '<button class="filter-pill' + (isActive ? ' active' : '') + '" data-cf="' + c.id + '" ' +
      'onclick="setHistoryCategoryFilter(\'' + c.id + '\')" ' +
      'style="' + (isActive ? ('background:' + col.text + ';border-color:' + col.text + ';color:var(--gray-light);') : ('color:' + col.text + ';border-color:' + col.border + ';')) + '">' +
      '<i data-lucide="' + (c.icon || 'wrench') + '" style="width:11px;height:11px;vertical-align:-1px;margin-right:3px;"></i>' + esc2(c.label) +
    '</button>';
  });

  bar.innerHTML = html;
  lucide.createIcons();
}

/* ── Panel "ประวัติทั้งหมด" ── */
function renderTable() {
  var tbody = document.getElementById('repairTableBody');
  if (!tbody) return;
  renderPeriodBar('repHistoryPeriodBar', 'history');

  var list = filterByPeriod(allRepairs, 'history').filter(function(r) {
    if (currentCategoryFilter !== 'all' && r.category !== currentCategoryFilter) return false;
    if (currentFilter === 'reported' && r.status !== 'reported') return false;
    if (currentFilter === 'progress' && ['approved','reopened'].indexOf(r.status) === -1) return false;
    if (currentFilter === 'done' && r.status !== 'done') return false;
    if (currentFilter === 'closed' && r.status !== 'closed') return false;
    if (currentFilter === 'rejected' && r.status !== 'rejected') return false;
    if (currentSearch) {
      var hay = ((r.title || '') + ' ' + (r.location || '') + ' ' + (r.reporterName || '')).toLowerCase();
      if (hay.indexOf(currentSearch) === -1) return false;
    }
    return true;
  });

  var emptyEl = document.getElementById('repairEmptyState');

  if (!list.length) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = '<div class="empty-state"><i data-lucide="inbox" style="width:28px;height:28px;color:var(--text3);"></i><p style="margin-top:8px;">ไม่พบรายการ</p></div>';
    lucide.createIcons();
    return;
  }
  emptyEl.style.display = 'none';

  var html = '';
  list.forEach(function(r) {
    var cat = getCategoryMeta(r.category);
    var col = getCategoryColor(r.category);
    var meta = getStatusMeta(r);
    html +=
      '<tr class="rp-row" style="background:' + col.bg + ';" onclick="openDetail(\'' + r.id + '\')">' +
        '<td style="white-space:nowrap;font-size:12px;color:var(--text2);border-left:4px solid ' + col.text + ';">' + fmtDate(r.createdAt) + '</td>' +
        '<td>' +
          '<div style="font-weight:700;color:var(--text);display:flex;align-items:center;gap:7px;flex-wrap:wrap;">' +
            (r.priority === 'urgent' ? '<span class="rp-urgent-tag"><i data-lucide="alert-triangle" style="width:11px;height:11px;"></i>เร่งด่วน</span>' : '') +
            esc2(r.title || '') +
          '</div>' +
          '<div style="font-size:11.5px;color:var(--text3);display:flex;align-items:center;gap:4px;margin-top:2px;"><i data-lucide="map-pin" style="width:11px;height:11px;"></i>' + esc2(r.location || '') + '</div>' +
        '</td>' +
        '<td><span style="font-size:11.5px;color:' + col.text + ';font-weight:700;display:flex;align-items:center;gap:5px;"><i data-lucide="' + cat.icon + '" style="width:13px;height:13px;"></i>' + cat.label + '</span></td>' +
        '<td style="font-size:12.5px;">' + esc2(r.reporterName || r.reporterEmail || '') +
          (r.reporterPhone ? '<div style="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px;margin-top:2px;"><i data-lucide="phone" style="width:10px;height:10px;"></i>' + esc2(r.reporterPhone) + '</div>' : '') +
        '</td>' +
        '<td><span class="rp-status c-' + meta.color + '">' + meta.label + '</span></td>' +
        '<td><button class="btn-icon" onclick="event.stopPropagation();openDetail(\'' + r.id + '\')" aria-label="ดูรายละเอียด"><i data-lucide="chevron-right" style="width:16px;height:16px;"></i></button></td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
  lucide.createIcons();
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
  } else {
    photosHtml = '<p style="font-size:12px;color:var(--text3);margin-top:4px;">ไม่มีรูปภาพแนบ</p>';
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

  var actionHtml = renderActionPanel(r);

  return (
    '<div class="modal-header">' +
      '<div class="modal-title-group">' +
        '<div class="modal-title-icon" style="background:var(--purple-light);"><i data-lucide="' + cat.icon + '" style="color:var(--purple);"></i></div>' +
        '<div><h3>' + esc2(r.title || '') + '</h3><p>' + cat.label + ' · ' + esc2(r.location || '') + '</p></div>' +
      '</div>' +
      '<button class="modal-close" onclick="closeModal(\'detailModal\')" aria-label="ปิด"><i data-lucide="x"></i></button>' +
    '</div>' +

    '<span class="rp-status c-' + meta.color + '">' + meta.label + '</span>' +
    buildWorkflowBar(meta.steps) +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px;font-size:12.5px;">' +
      '<div><b style="color:var(--text3);font-size:11px;text-transform:uppercase;">ผู้แจ้ง</b><p style="margin-top:2px;">' + esc2(r.reporterName || '') + '</p><p style="color:var(--text3);">' + esc2(r.reporterEmail || '') + '</p>' + (r.reporterPhone ? '<p style="color:var(--text3);display:flex;align-items:center;gap:4px;margin-top:2px;"><i data-lucide="phone" style="width:12px;height:12px;"></i>' + esc2(r.reporterPhone) + '</p>' : '') + '</div>' +
      '<div><b style="color:var(--text3);font-size:11px;text-transform:uppercase;">ความเร่งด่วน</b><p style="margin-top:2px;">' + (r.priority === 'urgent' ? '<span style="color:var(--red-dark);font-weight:800;">เร่งด่วน</span>' : 'ปกติ') + '</p></div>' +
    '</div>' +

    '<div class="section-divider" style="margin-top:18px;"><i data-lucide="file-text" style="width:14px;height:14px;"></i> รายละเอียด</div>' +
    '<p style="font-size:13px;color:var(--text2);line-height:1.6;">' + esc2(r.description || '') + '</p>' +
    photosHtml +

    actionHtml +

    '<div class="section-divider" style="margin-top:18px;"><i data-lucide="history" style="width:14px;height:14px;"></i> ประวัติดำเนินการ</div>' +
    logsHtml +

    '<div class="section-divider" style="margin-top:18px;"><i data-lucide="triangle-alert" style="width:14px;height:14px;color:var(--red-dark);"></i> โซนอันตราย</div>' +
    '<p style="font-size:11.5px;color:var(--text3);margin-bottom:10px;">ลบรายการแจ้งซ่อมนี้ทิ้งถาวร (ใช้กรณีแจ้งซ้ำ/แจ้งผิด/ข้อมูลทดสอบ) — ไม่สามารถกู้คืนได้</p>' +
    '<button class="btn-reject" style="width:100%;justify-content:center;" onclick="deleteRepairAdmin(\'' + r.id + '\')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> ลบรายการแจ้งซ่อมนี้</button>'
  );
}

function techInputId(suffix) { return 'actTechnician' + suffix; }

function renderTechPickerList(suffix, query) {
  var listEl = document.getElementById('techPickerList' + suffix);
  if (!listEl) return;

  /* ใช้รายชื่อ "ผู้รับผิดชอบ" ที่เจ้าหน้าที่คัดไว้ในแท็บตั้งค่าก่อน
     ถ้ายังไม่ได้ตั้งค่าไว้เลย (ว่าง) ให้ fallback ไปใช้รายชื่อบุคลากรทั้งหมดแทน
     เพื่อไม่ให้ระบบใช้งานไม่ได้ก่อนเจ้าหน้าที่ตั้งค่า */
  var sourceList = REPAIR_RESPONSIBLE.length ? REPAIR_RESPONSIBLE : REPAIR_STAFF_LIST;

  if (!sourceList.length) {
    listEl.innerHTML = '<div class="staff-picker-loading">กำลังโหลดรายชื่อบุคลากร...</div>';
    return;
  }

  var q = (query || '').trim().toLowerCase();
  var filtered = sourceList.filter(function(s) {
    return !q || (s.name + ' ' + s.position + ' ' + s.group).toLowerCase().indexOf(q) >= 0;
  }).slice(0, 30);
  _repTechFilteredCache[suffix] = filtered;

  if (!filtered.length) {
    listEl.innerHTML = '<div class="staff-picker-empty">ไม่พบรายชื่อบุคลากรที่ตรงกัน — พิมพ์เพื่อระบุชื่อเอง</div>';
    return;
  }

  listEl.innerHTML = filtered.map(function(s, idx) {
    return (
      '<div class="staff-picker-item" data-idx="' + idx + '">' +
        '<i data-lucide="user-round" style="width:14px;height:14px;color:var(--text3);flex-shrink:0;pointer-events:none;"></i>' +
        '<div style="min-width:0;pointer-events:none;">' +
          '<p style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc2(s.name) + '</p>' +
          '<p style="font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
            (s.position ? esc2(s.position) : '') + (s.group ? (' · ' + esc2(s.group)) : '') +
          '</p>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  listEl.onclick = function(e) {
    var item = e.target.closest('[data-idx]');
    if (!item) return;
    var idx = parseInt(item.getAttribute('data-idx'), 10);
    var s = _repTechFilteredCache[suffix][idx];
    if (s) selectTechPicker(suffix, s.name);
  };
  lucide.createIcons();
}

function renderActionPanel(r) {
  /* ── สถานะ: reported → อนุมัติ / ไม่อนุมัติ ── */
  if (r.status === 'reported') {
    return (
      '<div class="rp-action-card">' +
        '<h4><i data-lucide="check-circle-2" style="width:15px;height:15px;color:var(--green);"></i> อนุมัติแผนการซ่อม</h4>' +
        '<div class="form-group" style="margin-bottom:10px;">' +
          '<label class="form-label">ช่างผู้รับผิดชอบ</label>' +
          '<div class="staff-picker-wrap" id="techPickerWrap">' +
            '<input type="text" id="actTechnician" class="staff-picker-input" style="cursor:text;" placeholder="พิมพ์หรือเลือกชื่อช่าง/ผู้รับผิดชอบ..." autocomplete="off" oninput="filterTechPicker(\'\')" onfocus="openTechPicker(\'\')">' +
            '<div class="staff-picker-dropdown" id="techDropdown"><div id="techPickerList"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:6px;">' +
          '<label class="form-label">สถานะการซ่อม</label>' +
          '<div class="segmented">' +
            '<label><input type="radio" name="actRepairStatus" value="in_progress" checked> <i data-lucide="wrench"></i> ซ่อมได้ทันที</label>' +
            '<label><input type="radio" name="actRepairStatus" value="waiting"> <i data-lucide="clock"></i> รอซ่อม/รออะไหล่</label>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:6px;">' +
          '<label class="form-label">หมายเหตุแผนซ่อม</label>' +
          '<textarea id="actPlanNote" rows="2" placeholder="เช่น แผนงาน/กำหนดการเบื้องต้น"></textarea>' +
        '</div>' +
        '<button class="btn-approve" style="width:100%;justify-content:center;margin-top:6px;" onclick="approveRepair(\'' + r.id + '\')"><i data-lucide="check" style="width:14px;height:14px;"></i> อนุมัติ</button>' +
      '</div>' +
      '<div class="rp-action-card">' +
        '<h4><i data-lucide="x-circle" style="width:15px;height:15px;color:var(--red);"></i> ไม่อนุมัติ</h4>' +
        '<textarea id="actRejectNote" rows="2" placeholder="ระบุเหตุผลที่ไม่อนุมัติ"></textarea>' +
        '<button class="btn-reject" style="width:100%;justify-content:center;margin-top:10px;" onclick="rejectRepair(\'' + r.id + '\')"><i data-lucide="x" style="width:14px;height:14px;"></i> ไม่อนุมัติ</button>' +
      '</div>'
    );
  }

  /* ── สถานะ: approved / reopened → มอบหมาย/อัปเดต + บันทึกซ่อมเสร็จ ── */
  if (r.status === 'approved' || r.status === 'reopened') {
    return (
      '<div class="rp-action-card">' +
        '<h4><i data-lucide="user-cog" style="width:15px;height:15px;color:var(--sky);"></i> มอบหมาย / อัปเดตสถานะซ่อม</h4>' +
        (r.reopened || r.status === 'reopened' ? ('<div class="card" style="background:var(--red-light);padding:10px 12px;margin-bottom:10px;"><b style="font-size:11.5px;color:var(--red-dark);">ผู้แจ้งตรวจสอบแล้วยังไม่เรียบร้อย:</b><p style="font-size:12px;color:var(--red-dark);margin-top:2px;">' + esc2(r.reviewNote || '-') + '</p></div>') : '') +
        '<div class="form-group" style="margin-bottom:10px;">' +
          '<label class="form-label">ช่างผู้รับผิดชอบ</label>' +
          '<div class="staff-picker-wrap" id="techPickerWrap2">' +
            '<input type="text" id="actTechnician2" class="staff-picker-input" style="cursor:text;" value="' + esc2(r.technician || '') + '" placeholder="พิมพ์หรือเลือกชื่อช่าง/ผู้รับผิดชอบ..." autocomplete="off" oninput="filterTechPicker(\'2\')" onfocus="openTechPicker(\'2\')">' +
            '<div class="staff-picker-dropdown" id="techDropdown2"><div id="techPickerList2"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:10px;">' +
          '<label class="form-label">สถานะการซ่อม</label>' +
          '<div class="segmented">' +
            '<label><input type="radio" name="actRepairStatus2" value="in_progress" ' + (r.repairStatus !== 'waiting' ? 'checked' : '') + '> <i data-lucide="wrench"></i> กำลังซ่อม</label>' +
            '<label><input type="radio" name="actRepairStatus2" value="waiting" ' + (r.repairStatus === 'waiting' ? 'checked' : '') + '> <i data-lucide="clock"></i> รอซ่อม/รออะไหล่</label>' +
          '</div>' +
        '</div>' +
        '<button class="btn-primary" style="width:100%;justify-content:center;" onclick="updateAssignment(\'' + r.id + '\')"><i data-lucide="save" style="width:14px;height:14px;"></i> บันทึกการมอบหมาย</button>' +
      '</div>' +
      '<div class="rp-action-card">' +
        '<h4><i data-lucide="check-check" style="width:15px;height:15px;color:var(--green);"></i> บันทึกว่าซ่อมเสร็จแล้ว</h4>' +
        '<textarea id="actRepairNote" rows="2" placeholder="สรุปสิ่งที่ดำเนินการซ่อม"></textarea>' +
        '<button class="btn-approve" style="width:100%;justify-content:center;margin-top:10px;" onclick="markDone(\'' + r.id + '\')"><i data-lucide="check" style="width:14px;height:14px;"></i> ซ่อมเสร็จแล้ว ส่งให้ผู้แจ้งตรวจสอบ</button>' +
      '</div>'
    );
  }

  /* ── สถานะ: done → รอผู้แจ้งตรวจสอบ (เจ้าหน้าที่ปิดงานแทนได้กรณีผู้แจ้งไม่ตอบกลับ) ── */
  if (r.status === 'done') {
    return (
      '<div class="rp-action-card">' +
        '<h4><i data-lucide="hourglass" style="width:15px;height:15px;color:var(--purple);"></i> รอผู้แจ้งตรวจสอบความเรียบร้อย</h4>' +
        '<p style="font-size:12px;color:var(--text2);margin-bottom:10px;">หากผู้แจ้งไม่เข้ามาตรวจสอบภายในเวลาที่เหมาะสม เจ้าหน้าที่สามารถปิดงานแทนได้</p>' +
        '<textarea id="actCloseNote" rows="2" placeholder="หมายเหตุการปิดงานแทน"></textarea>' +
        '<button class="btn-secondary" style="width:100%;justify-content:center;margin-top:10px;" onclick="forceClose(\'' + r.id + '\')"><i data-lucide="lock" style="width:14px;height:14px;"></i> ปิดงานแทนผู้แจ้ง</button>' +
      '</div>'
    );
  }

  return '';
}

function pushLog(id, status, note, extra) {
  var payload = Object.assign({
    status: status,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    logs: firebase.firestore.FieldValue.arrayUnion({
      status: status, note: note, byName: currentUser.displayName || currentUser.email, at: firebase.firestore.Timestamp.now()
    })
  }, extra || {});
  return db.collection('repairs').doc(id).update(payload);
}
function allRepairsStatusOf(id) {
  var r = allRepairs.filter(function(x) { return x.id === id; })[0];
  return r ? r.status : 'approved';
}

function markDone(id) {
  var note = document.getElementById('actRepairNote').value.trim();
  if (!note) { showToast('กรุณาสรุปสิ่งที่ดำเนินการซ่อม', 'warn'); return; }

  pushLog(id, 'done', 'ดำเนินการซ่อมเสร็จแล้ว — ' + note,
    { repairNote: note, doneAt: firebase.firestore.FieldValue.serverTimestamp() }
  ).then(function() {
    showToast('บันทึกแล้ว รอผู้แจ้งตรวจสอบ ✅');
    closeModal('detailModal');
  }).catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

/* ── เติมตัวเลือกหมวดหมู่ในดรอปดาวน์กรองของแผง "การแจ้งซ่อม" ── */
function renderActiveCategoryFilterSelect() {
  var sel = document.getElementById('repActiveCategoryFilter');
  if (!sel) return;
  var current = currentActiveCategoryFilter;
  sel.innerHTML = '<option value="">ทุกหมวดหมู่</option>' +
    REPAIR_CATEGORIES.map(function(c) {
      return '<option value="' + c.id + '">' + esc2(c.label) + '</option>';
    }).join('');
  sel.value = current;
}

/* ครั้งแรกที่ยังไม่มีข้อมูล ให้เติมหมวดหมู่เริ่มต้น (คงชื่อ key เดิมไว้ ไม่ให้กระทบข้อมูลเก่า) */
function seedDefaultCategories() {
  var batch = db.batch();
  DEFAULT_CATEGORIES.forEach(function(c) {
    var ref = db.collection('repair_categories').doc(c.id);
    batch.set(ref, { label: c.label, icon: c.icon, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  });
  batch.commit().catch(function(err) { console.error('seedDefaultCategories', err); });
}

/* สุ่มสี hex สวยๆ ให้ input color ตอนเปิดฟอร์ม (ผู้ใช้เปลี่ยนเองได้ก่อนกด "เพิ่ม") */
function randomCatColor() {
  var pool = ['#2563eb', '#15803d', '#b45309', '#dc2626', '#0369a1', '#7c3aed', '#db2777', '#0f766e', '#4f46e5', '#ca8a04'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderCatList() {
  var el = document.getElementById('catList');
  if (!el) return;
  if (!REPAIR_CATEGORIES.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text3);">ยังไม่มีหมวดหมู่</p>';
    return;
  }
  el.innerHTML = REPAIR_CATEGORIES.map(function(c) {
    var col = getCategoryColor(c.id);
    return (
      '<div class="rp-set-row">' +
        '<i data-lucide="' + (c.icon || 'wrench') + '" style="width:16px;height:16px;color:' + col.text + ';flex-shrink:0;"></i>' +
        '<span class="grow" style="font-size:13px;font-weight:600;color:var(--text);">' + esc2(c.label) + '</span>' +
        '<input type="color" value="' + (c.color || col.hex || '#64748b') + '" title="เปลี่ยนสีหมวดหมู่" ' +
          'onchange="updateCategoryColor(\'' + c.id + '\', this.value)" ' +
          'style="width:28px;height:28px;padding:1px;border-radius:6px;cursor:pointer;flex-shrink:0;border:1px solid var(--border);">' +
        '<button class="btn-icon" onclick="deleteCategory(\'' + c.id + '\',\'' + esc2(c.label).replace(/'/g,"\\'") + '\')" title="ลบ"><i data-lucide="trash-2" style="width:15px;height:15px;color:var(--red-dark);"></i></button>' +
      '</div>'
    );
  }).join('');
  lucide.createIcons();
}

function renderBldList() {
  var el = document.getElementById('bldList');
  if (!el) return;
  if (!REPAIR_BUILDINGS.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text3);">ยังไม่มีอาคาร — เพิ่มอาคารก่อน สมาชิกจึงจะเลือกอาคารตอนแจ้งซ่อมได้</p>';
    return;
  }
  el.innerHTML = REPAIR_BUILDINGS.map(function(b) {
    var subs = b.subLocations || [];
    var chips = subs.length
      ? subs.map(function(s) {
          return '<span class="rp-chip">' + esc2(s) + '<button onclick="removeSubLocation(\'' + b.id + '\',\'' + esc2(s).replace(/'/g,"\\'") + '\')" title="ลบรายการนี้"><i data-lucide="x" style="width:10px;height:10px;"></i></button></span>';
        }).join('')
      : '<span style="font-size:11.5px;color:var(--text3);">ยังไม่มีสถานที่ย่อยที่เคยใช้แจ้ง</span>';

    return (
      '<div class="rp-bld-item">' +
        '<div class="rp-bld-head">' +
          '<span class="rp-bld-name"><i data-lucide="building-2" style="width:15px;height:15px;color:var(--sky);"></i>' + esc2(b.name) + '</span>' +
          '<button class="btn-icon" onclick="deleteBuilding(\'' + b.id + '\',\'' + esc2(b.name).replace(/'/g,"\\'") + '\')" title="ลบอาคาร"><i data-lucide="trash-2" style="width:15px;height:15px;color:var(--red-dark);"></i></button>' +
        '</div>' +
        '<div style="margin-top:8px;">' + chips + '</div>' +
      '</div>'
    );
  }).join('');
  lucide.createIcons();
}

function renderRespPickerList(query) {
  var listEl = document.getElementById('respPickerList');
  if (!listEl) return;

  if (!REPAIR_STAFF_LIST.length) {
    listEl.innerHTML = '<div class="staff-picker-loading">กำลังโหลดรายชื่อบุคลากร...</div>';
    return;
  }

  var existingNames = REPAIR_RESPONSIBLE.map(function(r) { return r.name; });
  var q = (query || '').trim().toLowerCase();
  var filtered = REPAIR_STAFF_LIST.filter(function(s) {
    if (existingNames.indexOf(s.name) >= 0) return false; /* เพิ่มไว้แล้ว ไม่ต้องแสดงซ้ำ */
    return !q || (s.name + ' ' + s.position + ' ' + s.group).toLowerCase().indexOf(q) >= 0;
  }).slice(0, 30);
  _respFilteredCache = filtered;

  if (!filtered.length) {
    listEl.innerHTML = '<div class="staff-picker-empty">ไม่พบรายชื่อที่ตรงกัน หรือเพิ่มไว้ครบแล้ว</div>';
    return;
  }

  listEl.innerHTML = filtered.map(function(s, idx) {
    return (
      '<div class="staff-picker-item" data-idx="' + idx + '">' +
        '<i data-lucide="user-round" style="width:14px;height:14px;color:var(--text3);flex-shrink:0;pointer-events:none;"></i>' +
        '<div style="min-width:0;pointer-events:none;">' +
          '<p style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc2(s.name) + '</p>' +
          '<p style="font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
            (s.position ? esc2(s.position) : '') + (s.group ? (' · ' + esc2(s.group)) : '') +
          '</p>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  listEl.onclick = function(e) {
    var item = e.target.closest('[data-idx]');
    if (!item) return;
    var idx = parseInt(item.getAttribute('data-idx'), 10);
    var s = _respFilteredCache[idx];
    if (s) selectRespPicker(s);
  };
  lucide.createIcons();
}

function renderRespList() {
  var el = document.getElementById('respList');
  if (!el) return;
  if (!REPAIR_RESPONSIBLE.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text3);">ยังไม่มีรายชื่อผู้รับผิดชอบ — เพิ่มจากช่องค้นหาด้านบน (ถ้ายังไม่เพิ่ม ตอนอนุมัติจะเลือกจากรายชื่อบุคลากรทั้งหมดแทน)</p>';
    return;
  }
  el.innerHTML = REPAIR_RESPONSIBLE.map(function(r) {
    return (
      '<div class="rp-set-row">' +
        '<i data-lucide="user-round" style="width:16px;height:16px;color:var(--green);flex-shrink:0;"></i>' +
        '<span class="grow" style="font-size:13px;font-weight:600;color:var(--text);">' + esc2(r.name) +
          (r.position ? (' <span style="font-weight:400;color:var(--text3);font-size:11.5px;">· ' + esc2(r.position) + '</span>') : '') +
        '</span>' +
        '<button class="btn-icon" onclick="deleteResponsible(\'' + r.id + '\',\'' + esc2(r.name).replace(/'/g,"\\'") + '\')" title="ลบ"><i data-lucide="trash-2" style="width:15px;height:15px;color:var(--red-dark);"></i></button>' +
      '</div>'
    );
  }).join('');
  lucide.createIcons();
}

/* ══════════════════════ EVENT HANDLERS ══════════════════════ */
function filterByPeriod(list, scope) {
  var range = getPeriodRange(scope);
  if (!range) return list;
  return list.filter(function(r) {
    if (!r.createdAt) return false;
    var d = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
    return d >= range[0] && d < range[1];
  });
}
function togglePeriodPopover(scope) {
  var el = document.getElementById('periodPopover-' + scope);
  if (!el) return;
  var willOpen = el.style.display !== 'block';
  document.querySelectorAll('.period-popover').forEach(function(p) { p.style.display = 'none'; });
  el.style.display = willOpen ? 'block' : 'none';
  if (willOpen) positionPeriodPopover(scope);
}
document.addEventListener('click', function(e) {
  if (!e.target.closest || !e.target.closest('.period-picker')) {
    document.querySelectorAll('.period-popover').forEach(function(p) { p.style.display = 'none'; });
  }
});
/* popover เป็น position:fixed (อิง viewport) จึงไม่เลื่อนตาม content ที่ scroll เอง —
   ปิดไปเลยเมื่อผู้ใช้เลื่อนหน้า กันปัญหากล่องค้างผิดตำแหน่ง */
document.addEventListener('scroll', function() {
  document.querySelectorAll('.period-popover').forEach(function(p) { p.style.display = 'none'; });
}, true);

function setupScrollTopButton() {
  var content = document.getElementById('pageContent');
  var btn = document.getElementById('scrollTopBtn');
  if (!content || !btn) return;
  content.addEventListener('scroll', function() {
    btn.classList.toggle('show', content.scrollTop > 300);
  });
}

/* ══════════════════════════════════════════════════════════════
   รายงาน: สถิติรายสัปดาห์ / รายเดือน / เปรียบเทียบรายเดือน / รายปี / หมวดหมู่
   ใช้รูปแบบกราฟเดียวกับแท็บ "การแจ้งซ่อม" (hbar-row + donut conic-gradient)
   นับจากทุกรายการ (allRepairs) ไม่จำกัดสถานะ ยกเว้นรายการที่ไม่มี createdAt
   ══════════════════════════════════════════════════════════════ */
var reportView       = 'week';
var reportWeekRange  = 8;
var reportMonthSel   = null; /* 'YYYY-MM' */
var reportYearSel    = null; /* 'YYYY' */

function rDate(r) {
  if (!r.createdAt) return null;
  return r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
}
function repWeekStart(d) {
  var dt = new Date(d); dt.setHours(0, 0, 0, 0);
  var day = (dt.getDay() + 6) % 7; /* จันทร์ = 0 */
  dt.setDate(dt.getDate() - day);
  return dt;
}
function repWeekKey(d) { return repWeekStart(d).toISOString().split('T')[0]; }
function repWeekLabel(key) {
  var s = new Date(key + 'T00:00:00'); var e = new Date(s); e.setDate(s.getDate() + 6);
  return s.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' – ' + e.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}
function repMonthKeyOf(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
function repMonthLabelOf(key) {
  var p = key.split('-'); var idx = parseInt(p[1], 10) - 1;
  return THAI_MONTHS[idx] + ' ' + (parseInt(p[0], 10) + 543);
}

function reportKpi(icon, color, bg, val, label) {
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

/* กราฟแท่งแนวนอนทั่วไปแบบไม่คลิกกรอง (ใช้กับกราฟไทม์ไลน์ในหน้ารายงาน) */
function reportHbarList(rows, color, emptyIcon) {
  if (!rows.length) {
    return '<div class="empty-state" style="padding:20px 0;"><i data-lucide="' + (emptyIcon || 'bar-chart-3') + '" style="width:24px;height:24px;color:var(--text3);"></i><p style="margin-top:6px;font-size:12.5px;">ยังไม่มีข้อมูล</p></div>';
  }
  var max = Math.max.apply(null, rows.map(function(r) { return r.count; }));
  if (max <= 0) max = 1;
  return rows.map(function(r) {
    var pct = Math.max(3, Math.round(r.count / max * 100));
    return (
      '<div class="hbar-row">' +
        '<div class="hbar-label"><span class="hbar-name">' + esc2(r.label) + '</span><span class="hbar-pct">' + r.count + '</span></div>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' + pct + '%;background:' + (r.color || color) + ';"></div></div>' +
      '</div>'
    );
  }).join('');
}

/* โดนัทหมวดหมู่ทั่วไป (ใช้ซ้ำได้ทั้งในเดือนที่เลือก และภาพรวมทั้งหมด) */
function reportRenderCategoryDonut(list, el) {
  var total = list.length;
  if (!total) {
    el.innerHTML = '<div class="empty-state" style="padding:20px 0;"><i data-lucide="pie-chart" style="width:24px;height:24px;color:var(--text3);"></i><p style="margin-top:6px;font-size:12.5px;">ยังไม่มีข้อมูล</p></div>';
    return;
  }
  var counts = {};
  list.forEach(function(r) { var key = r.category || 'other'; counts[key] = (counts[key] || 0) + 1; });
  var keys = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });

  var cursor = 0, gradientParts = [], legendHtml = '';
  keys.forEach(function(key) {
    var cat = getCategoryMeta(key);
    var count = counts[key];
    var pct = count / total * 100;
    var color = getCategoryColor(key).text;
    gradientParts.push(color + ' ' + cursor + '% ' + (cursor + pct) + '%');
    cursor += pct;
    legendHtml +=
      '<div class="legend-row">' +
        '<span style="display:flex;align-items:center;gap:6px;min-width:0;">' +
          '<span class="legend-dot" style="background:' + color + ';"></span>' +
          '<span class="legend-label" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + cat.label + '</span>' +
        '</span>' +
        '<span class="legend-val">' + count + '</span>' +
      '</div>';
  });

  el.innerHTML =
    '<div class="donut-wrap" style="width:130px;height:130px;margin:0 auto;">' +
      '<div style="width:130px;height:130px;border-radius:50%;background:conic-gradient(' + gradientParts.join(',') + ');"></div>' +
      '<div class="donut-center" style="top:50%;left:50%;transform:translate(-50%,-50%);width:76px;height:76px;background:var(--white);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
        '<div class="donut-big">' + total + '</div><div class="donut-label">งาน</div>' +
      '</div>' +
    '</div>' +
    '<div class="donut-legend">' + legendHtml + '</div>';
}

function populateReportSelectors() {
  var withDate = allRepairs.filter(function(r) { return rDate(r); });

  var months = [];
  withDate.forEach(function(r) { var k = repMonthKeyOf(rDate(r)); if (months.indexOf(k) === -1) months.push(k); });
  months.sort();
  var msel = document.getElementById('repRptMonthSelect');
  if (msel) {
    msel.innerHTML = months.map(function(m) { return '<option value="' + m + '">' + repMonthLabelOf(m) + '</option>'; }).join('');
    if (months.length) {
      reportMonthSel = (reportMonthSel && months.indexOf(reportMonthSel) !== -1) ? reportMonthSel : months[months.length - 1];
      msel.value = reportMonthSel;
    }
  }

  var years = [];
  withDate.forEach(function(r) { var y = String(rDate(r).getFullYear()); if (years.indexOf(y) === -1) years.push(y); });
  years.sort();
  var ysel = document.getElementById('repRptYearSelect');
  if (ysel) {
    ysel.innerHTML = years.map(function(y) { return '<option value="' + y + '">ปี ' + (parseInt(y, 10) + 543) + '</option>'; }).join('');
    if (years.length) {
      reportYearSel = (reportYearSel && years.indexOf(reportYearSel) !== -1) ? reportYearSel : years[years.length - 1];
      ysel.value = reportYearSel;
    }
  }
}

function renderReportPanel() {
  populateReportSelectors();
  if (reportView === 'week') renderReportWeek();
  else if (reportView === 'month') renderReportMonth();
  else if (reportView === 'compare') renderReportCompare();
  else if (reportView === 'year') renderReportYear();
  else if (reportView === 'category') renderReportCategory();
}

function onRepReportSubtabChange(view) {
  reportView = view;
  if (view === 'week') renderReportWeek();
  if (view === 'month') renderReportMonth();
  if (view === 'compare') renderReportCompare();
  if (view === 'year') renderReportYear();
  if (view === 'category') renderReportCategory();
}

function setReportWeekRange(n, el) {
  reportWeekRange = n;
  document.querySelectorAll('#repRptWeekRangeBar .filter-pill').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
  renderReportWeek();
}
function setReportMonth(v) { reportMonthSel = v; renderReportMonth(); }
function setReportYear(v) { reportYearSel = v; renderReportYear(); }

/* ── รายสัปดาห์ ── */
function renderReportWeek() {
  var kpiEl = document.getElementById('repRptWeekKpi');
  var chartEl = document.getElementById('repRptWeekChart');
  if (!kpiEl || !chartEl) return;

  var withDate = allRepairs.filter(function(r) { return rDate(r); });
  var byWeek = {};
  withDate.forEach(function(r) {
    var k = repWeekKey(rDate(r));
    if (!byWeek[k]) byWeek[k] = { total: 0, closed: 0, urgent: 0 };
    byWeek[k].total++;
    if (r.status === 'closed') byWeek[k].closed++;
    if (r.priority === 'urgent') byWeek[k].urgent++;
  });
  var weeks = Object.keys(byWeek).sort();
  var shown = weeks.slice(-reportWeekRange);

  var totalAll = shown.reduce(function(s, w) { return s + byWeek[w].total; }, 0);
  var closedAll = shown.reduce(function(s, w) { return s + byWeek[w].closed; }, 0);
  var avg = shown.length ? (totalAll / shown.length) : 0;
  var bestIdx = -1, bestVal = -1;
  shown.forEach(function(w, i) { if (byWeek[w].total > bestVal) { bestVal = byWeek[w].total; bestIdx = i; } });

  kpiEl.innerHTML =
    reportKpi('inbox', 'var(--sky)', 'var(--sky-light)', totalAll, 'แจ้งซ่อมรวม (' + shown.length + ' สัปดาห์)') +
    reportKpi('check-check', 'var(--green)', 'var(--green-light)', closedAll, 'ปิดงานแล้ว') +
    reportKpi('bar-chart-3', 'var(--purple)', 'var(--purple-light)', avg.toFixed(1), 'เฉลี่ย/สัปดาห์') +
    reportKpi('flame', 'var(--red)', 'var(--red-light)', bestIdx >= 0 ? repWeekLabel(shown[bestIdx]) : '-', 'สัปดาห์ที่แจ้งมากที่สุด');

  var rows = shown.map(function(w) { return { label: repWeekLabel(w), count: byWeek[w].total }; }).reverse();
  chartEl.innerHTML = reportHbarList(rows, 'var(--sky)');
  lucide.createIcons();
}

/* ── รายเดือน ── */
function renderReportMonth() {
  var sel = document.getElementById('repRptMonthSelect');
  var kpiEl = document.getElementById('repRptMonthKpi');
  var statusEl = document.getElementById('repRptMonthStatusChart');
  var catEl = document.getElementById('repRptMonthCatChart');
  if (!sel || !kpiEl || !statusEl || !catEl) return;
  var month = reportMonthSel || sel.value;
  if (!month) { kpiEl.innerHTML = ''; statusEl.innerHTML = ''; catEl.innerHTML = ''; return; }

  var rows = allRepairs.filter(function(r) { var d = rDate(r); return d && repMonthKeyOf(d) === month; });
  var total = rows.length;
  var closed = rows.filter(function(r) { return r.status === 'closed'; }).length;
  var pending = rows.filter(function(r) { return ['reported', 'approved', 'reopened'].indexOf(r.status) !== -1; }).length;
  var urgent = rows.filter(function(r) { return r.priority === 'urgent'; }).length;

  kpiEl.innerHTML =
    reportKpi('inbox', 'var(--sky)', 'var(--sky-light)', total, 'แจ้งซ่อมรวมในเดือนนี้') +
    reportKpi('check-check', 'var(--green)', 'var(--green-light)', closed, 'ปิดงานแล้ว') +
    reportKpi('hourglass', 'var(--amber)', 'var(--amber-light)', pending, 'ยังไม่ปิดงาน') +
    reportKpi('flame', 'var(--red)', 'var(--red-light)', urgent, 'แจ้งเร่งด่วน');

  var statusCounts = { reported: 0, approved: 0, reopened: 0, done: 0, closed: 0, rejected: 0 };
  rows.forEach(function(r) { if (statusCounts.hasOwnProperty(r.status)) statusCounts[r.status]++; else statusCounts.reported++; });
  var statusLabels = { reported: 'รออนุมัติ', approved: 'กำลังซ่อม/รอซ่อม', reopened: 'ซ่อมใหม่', done: 'รอตรวจสอบ', closed: 'ปิดงานแล้ว', rejected: 'ไม่อนุมัติ' };
  var statusColors = { reported: 'var(--amber)', approved: 'var(--sky)', reopened: 'var(--red)', done: 'var(--purple)', closed: 'var(--green)', rejected: 'var(--text3)' };
  var statusRows = Object.keys(statusCounts).filter(function(k) { return statusCounts[k] > 0; }).map(function(k) { return { label: statusLabels[k], count: statusCounts[k], color: statusColors[k] }; });
  statusEl.innerHTML = reportHbarList(statusRows, 'var(--sky)', 'inbox');

  reportRenderCategoryDonut(rows, catEl);
  lucide.createIcons();
}

/* ── เปรียบเทียบรายเดือน ── */
function renderReportCompare() {
  var kpiEl = document.getElementById('repRptCompareKpi');
  var chartEl = document.getElementById('repRptCompareChart');
  if (!kpiEl || !chartEl) return;

  var withDate = allRepairs.filter(function(r) { return rDate(r); });
  var byMonth = {};
  withDate.forEach(function(r) {
    var k = repMonthKeyOf(rDate(r));
    if (!byMonth[k]) byMonth[k] = { total: 0, closed: 0 };
    byMonth[k].total++;
    if (r.status === 'closed') byMonth[k].closed++;
  });
  var months = Object.keys(byMonth).sort();

  var bestIdx = -1, bestVal = -1, worstIdx = -1, worstVal = Infinity;
  months.forEach(function(m, i) {
    var v = byMonth[m].total;
    if (v > bestVal) { bestVal = v; bestIdx = i; }
    if (v < worstVal) { worstVal = v; worstIdx = i; }
  });
  var avg = months.length ? (months.reduce(function(s, m) { return s + byMonth[m].total; }, 0) / months.length) : 0;
  var lastMonth = months.length ? months[months.length - 1] : null;
  var latestClosedRate = lastMonth ? Math.round(byMonth[lastMonth].closed / (byMonth[lastMonth].total || 1) * 100) : 0;

  kpiEl.innerHTML =
    reportKpi('trophy', 'var(--green)', 'var(--green-light)', bestIdx >= 0 ? repMonthLabelOf(months[bestIdx]) : '-', 'เดือนที่แจ้งมากที่สุด (' + (bestIdx >= 0 ? bestVal : 0) + ')') +
    reportKpi('trending-down', 'var(--sky)', 'var(--sky-light)', worstIdx >= 0 ? repMonthLabelOf(months[worstIdx]) : '-', 'เดือนที่แจ้งน้อยที่สุด (' + (worstIdx >= 0 && worstVal !== Infinity ? worstVal : 0) + ')') +
    reportKpi('bar-chart-3', 'var(--purple)', 'var(--purple-light)', avg.toFixed(1), 'เฉลี่ย/เดือน') +
    reportKpi('check-check', 'var(--amber)', 'var(--amber-light)', latestClosedRate + '%', 'ปิดงานแล้ว (เดือนล่าสุด)');

  var rows = months.map(function(m) { return { label: repMonthLabelOf(m), count: byMonth[m].total }; }).reverse();
  chartEl.innerHTML = reportHbarList(rows, 'var(--purple)');
  lucide.createIcons();
}

/* ── รายปี ── */
function renderReportYear() {
  var sel = document.getElementById('repRptYearSelect');
  var kpiEl = document.getElementById('repRptYearKpi');
  var chartEl = document.getElementById('repRptYearChart');
  if (!sel || !kpiEl || !chartEl) return;
  var year = reportYearSel || sel.value;
  if (!year) { kpiEl.innerHTML = ''; chartEl.innerHTML = ''; return; }
  year = parseInt(year, 10);

  var rows = allRepairs.filter(function(r) { var d = rDate(r); return d && d.getFullYear() === year; });
  var monthCounts = [0,0,0,0,0,0,0,0,0,0,0,0];
  rows.forEach(function(r) { monthCounts[rDate(r).getMonth()]++; });
  var total = rows.length;
  var closed = rows.filter(function(r) { return r.status === 'closed'; }).length;
  var activeMonths = monthCounts.filter(function(c) { return c > 0; }).length;
  var bestIdx = monthCounts.indexOf(Math.max.apply(null, monthCounts));

  kpiEl.innerHTML =
    reportKpi('inbox', 'var(--sky)', 'var(--sky-light)', total, 'แจ้งซ่อมรวมทั้งปี') +
    reportKpi('check-check', 'var(--green)', 'var(--green-light)', closed, 'ปิดงานแล้ว') +
    reportKpi('bar-chart-3', 'var(--purple)', 'var(--purple-light)', activeMonths ? (total / activeMonths).toFixed(1) : '0', 'เฉลี่ย/เดือน') +
    reportKpi('flame', 'var(--amber)', 'var(--amber-light)', total ? THAI_MONTHS[bestIdx] : '-', 'เดือนที่แจ้งมากที่สุด');

  var mrows = THAI_MONTHS.map(function(m, i) { return { label: m, count: monthCounts[i] }; });
  chartEl.innerHTML = reportHbarList(mrows, 'var(--sky)');
  lucide.createIcons();
}

/* ── แยกตามหมวดหมู่ (ทั้งหมดทุกช่วงเวลา) ── */
function renderReportCategory() {
  var donutEl = document.getElementById('repRptCatDonut');
  var tblBody = document.querySelector('#repRptCatTable tbody');
  if (!donutEl || !tblBody) return;

  var list = allRepairs;
  reportRenderCategoryDonut(list, donutEl);

  var total = list.length;
  var counts = {}, closedCounts = {};
  list.forEach(function(r) {
    var key = r.category || 'other';
    counts[key] = (counts[key] || 0) + 1;
    if (r.status === 'closed') closedCounts[key] = (closedCounts[key] || 0) + 1;
  });
  var keys = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });

  tblBody.innerHTML = keys.length ? keys.map(function(key) {
    var cat = getCategoryMeta(key);
    var count = counts[key];
    var pct = total ? Math.round(count / total * 100) : 0;
    var closed = closedCounts[key] || 0;
    return '<tr><td style="font-weight:700;">' + esc2(cat.label) + '</td><td style="text-align:right;">' + count + '</td><td style="text-align:right;">' + pct + '%</td><td style="text-align:right;">' + closed + '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:16px 0;">ยังไม่มีข้อมูล</td></tr>';
  lucide.createIcons();
}

function onRepSubtabChange(tab) {
  currentSubTab = tab;
  if (tab === 'active') renderActivePanel();
  if (tab === 'assignee') renderAssigneePanel();
  if (tab === 'history') renderTable();
  if (tab === 'report') renderReportPanel();
}

/* ── เรียงรายการแจ้งซ่อม: "เร่งด่วน" อยู่บนสุดเสมอ ไม่ว่าจะแจ้งเมื่อไหร่
     ภายในกลุ่มเดียวกัน (เร่งด่วน / ปกติ) เรียงจากแจ้งเก่าสุดไปใหม่สุด — ต้องตรงกับ repair-user.html ── */
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

function filterByActiveBuilding(list) {
  if (!currentActiveBuildingFilter) return list;
  return list.filter(function(r) { return getBuildingNameFromLocation(r.location) === currentActiveBuildingFilter; });
}

function filterByActiveCategory(list) {
  if (!currentActiveCategoryFilter) return list;
  return list.filter(function(r) { return r.category === currentActiveCategoryFilter; });
}

function setActiveBuildingFilter(name) {
  currentActiveBuildingFilter = name || '';
  var sel = document.getElementById('repActiveBuildingFilter');
  if (sel) sel.value = currentActiveBuildingFilter;
  renderActivePanel();
}

function setActiveCategoryFilter(catId) {
  currentActiveCategoryFilter = catId || '';
  var sel = document.getElementById('repActiveCategoryFilter');
  if (sel) sel.value = currentActiveCategoryFilter;
  renderActivePanel();
}



function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('#repFilterBar .filter-pill').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-f') === f);
  });
  renderTable();
}
function setSearch(v) {
  currentSearch = (v || '').toLowerCase();
  renderTable();
}

function setHistoryCategoryFilter(catId) {
  currentCategoryFilter = catId;
  renderHistoryCategoryFilterBar();
  renderTable();
}

/* ══════════════════════════════════════════════════════════════
   Modal รายละเอียด + การดำเนินการ
   ══════════════════════════════════════════════════════════════ */
function openDetail(id) {
  var r = allRepairs.filter(function(x) { return x.id === id; })[0];
  if (!r) return;
  document.getElementById('detailModalBody').innerHTML = renderDetailBody(r);
  lucide.createIcons();
  openModal('detailModal');
}

function deleteRepairAdmin(id) {
  var r = allRepairs.filter(function(x) { return x.id === id; })[0];
  if (!confirm('ลบคำขอแจ้งซ่อม "' + (r ? esc2(r.title || '') : '') + '" ใช่หรือไม่? การลบไม่สามารถกู้คืนได้ (ประวัติ/รูปภาพจะหายไปทั้งหมด)')) return;

  db.collection('repairs').doc(id).delete().then(function() {
    showToast('ลบรายการแจ้งซ่อมแล้ว');
    closeModal('detailModal');
  }).catch(function(err) {
    showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  });
}

function openTechPicker(suffix) {
  var dd = document.getElementById('techDropdown' + suffix);
  if (!dd) return;
  dd.classList.add('open');
  var input = document.getElementById(techInputId(suffix));
  renderTechPickerList(suffix, input ? input.value : '');
}
function closeTechPicker(suffix) {
  var dd = document.getElementById('techDropdown' + suffix);
  if (dd) dd.classList.remove('open');
}
/* ปิด dropdown เมื่อคลิกนอกกล่อง */
document.addEventListener('mousedown', function(e) {
  ['', '2'].forEach(function(suffix) {
    var wrap = document.getElementById('techPickerWrap' + suffix);
    var dd = document.getElementById('techDropdown' + suffix);
    if (wrap && dd && dd.classList.contains('open') && !wrap.contains(e.target)) {
      dd.classList.remove('open');
    }
  });
});

function filterTechPicker(suffix) {
  var input = document.getElementById(techInputId(suffix));
  openTechPicker(suffix);
  renderTechPickerList(suffix, input ? input.value : '');
}

function selectTechPicker(suffix, name) {
  var input = document.getElementById(techInputId(suffix));
  if (input) input.value = name;
  closeTechPicker(suffix);
}

function approveRepair(id) {
  var technician = document.getElementById('actTechnician').value.trim();
  var repairStatus = document.querySelector('input[name="actRepairStatus"]:checked').value;
  var planNote = document.getElementById('actPlanNote').value.trim();

  if (!technician) { showToast('กรุณาระบุช่างผู้รับผิดชอบ', 'warn'); return; }

  pushLog(id, 'approved',
    'อนุมัติแผนซ่อม มอบหมายให้ ' + technician + (planNote ? (' — ' + planNote) : ''),
    { technician: technician, repairStatus: repairStatus, planNote: planNote,
      approvedByName: currentUser.displayName || currentUser.email, approvedAt: firebase.firestore.FieldValue.serverTimestamp() }
  ).then(function() {
    showToast('อนุมัติเรียบร้อย ✅');
    closeModal('detailModal');
  }).catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

function rejectRepair(id) {
  var reason = document.getElementById('actRejectNote').value.trim();
  if (!reason) { showToast('กรุณาระบุเหตุผลที่ไม่อนุมัติ', 'warn'); return; }

  pushLog(id, 'rejected', 'ไม่อนุมัติ — ' + reason, { rejectNote: reason })
    .then(function() {
      showToast('บันทึกผลไม่อนุมัติแล้ว');
      closeModal('detailModal');
    }).catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

function updateAssignment(id) {
  var technician = document.getElementById('actTechnician2').value.trim();
  var repairStatus = document.querySelector('input[name="actRepairStatus2"]:checked').value;
  if (!technician) { showToast('กรุณาระบุช่างผู้รับผิดชอบ', 'warn'); return; }

  pushLog(id, allRepairsStatusOf(id), 'อัปเดตการมอบหมาย: ' + technician + ' — ' + (repairStatus === 'waiting' ? 'รอซ่อม/รออะไหล่' : 'กำลังซ่อม'),
    { technician: technician, repairStatus: repairStatus }
  ).then(function() {
    showToast('บันทึกการมอบหมายแล้ว ✅');
    closeModal('detailModal');
  }).catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

function forceClose(id) {
  var note = document.getElementById('actCloseNote').value.trim();
  pushLog(id, 'closed', 'ปิดงานโดยเจ้าหน้าที่' + (note ? (' — ' + note) : ''),
    { closeNote: note, closedAt: firebase.firestore.FieldValue.serverTimestamp() }
  ).then(function() {
    showToast('ปิดงานเรียบร้อย ✅');
    closeModal('detailModal');
  }).catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

function addCategory() {
  var labelInput = document.getElementById('newCatLabel');
  var iconInput  = document.getElementById('newCatIcon');
  var colorInput = document.getElementById('newCatColor');
  var label = labelInput.value.trim();
  var icon  = iconInput.value.trim() || 'wrench';
  var color = (colorInput && colorInput.value) || randomCatColor();
  if (!label) { showToast('กรุณากรอกชื่อหมวดหมู่', 'warn'); return; }

  db.collection('repair_categories').add({
    label: label, icon: icon, color: color, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    labelInput.value = ''; iconInput.value = ''; if (colorInput) colorInput.value = randomCatColor();
    showToast('เพิ่มหมวดหมู่แล้ว ✅');
  }).catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

/* แก้สีหมวดหมู่ที่มีอยู่แล้ว (สีจะเปลี่ยนพร้อมกันทุกที่ทั้งป้าย/การ์ด/กราฟ เพราะอ่านจาก Firestore ตัวเดียว) */
function updateCategoryColor(id, color) {
  db.collection('repair_categories').doc(id).update({ color: color })
    .catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

function deleteCategory(id, label) {
  if (!confirm('ลบหมวดหมู่ "' + label + '" ใช่หรือไม่? (รายการแจ้งซ่อมเก่าที่เคยใช้หมวดหมู่นี้จะยังอยู่ แต่จะแสดงเป็น "ไม่ระบุ")')) return;
  db.collection('repair_categories').doc(id).delete()
    .then(function() { showToast('ลบหมวดหมู่แล้ว'); })
    .catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

function addBuilding() {
  var nameInput = document.getElementById('newBldName');
  var name = nameInput.value.trim();
  if (!name) { showToast('กรุณากรอกชื่ออาคาร', 'warn'); return; }

  db.collection('repair_buildings').add({
    name: name, subLocations: [], createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    nameInput.value = '';
    showToast('เพิ่มอาคารแล้ว ✅');
  }).catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

function deleteBuilding(id, name) {
  if (!confirm('ลบอาคาร "' + name + '" พร้อมรายการสถานที่ย่อยทั้งหมดใช่หรือไม่?')) return;
  db.collection('repair_buildings').doc(id).delete()
    .then(function() { showToast('ลบอาคารแล้ว'); })
    .catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

function removeSubLocation(buildingId, value) {
  db.collection('repair_buildings').doc(buildingId).update({
    subLocations: firebase.firestore.FieldValue.arrayRemove(value)
  }).catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

function openRespPicker() {
  var dd = document.getElementById('respDropdown');
  if (!dd) return;
  dd.classList.add('open');
  var input = document.getElementById('newRespName');
  renderRespPickerList(input ? input.value : '');
}
function closeRespPicker() {
  var dd = document.getElementById('respDropdown');
  if (dd) dd.classList.remove('open');
}
/* ปิด dropdown เมื่อคลิกนอกกล่อง */
document.addEventListener('mousedown', function(e) {
  var wrap = document.getElementById('respPickerWrap');
  var dd = document.getElementById('respDropdown');
  if (wrap && dd && dd.classList.contains('open') && !wrap.contains(e.target)) {
    dd.classList.remove('open');
  }
});

function filterRespPicker() {
  _respSelectedStaff = null;
  openRespPicker();
  var input = document.getElementById('newRespName');
  renderRespPickerList(input ? input.value : '');
}

function selectRespPicker(s) {
  _respSelectedStaff = s;
  var input = document.getElementById('newRespName');
  if (input) input.value = s.name;
  closeRespPicker();
}

function addResponsible() {
  var input = document.getElementById('newRespName');
  var name = input.value.trim();
  if (!name) { showToast('กรุณาเลือกหรือพิมพ์ชื่อบุคลากร', 'warn'); return; }
  if (REPAIR_RESPONSIBLE.some(function(r) { return r.name === name; })) {
    showToast('มีชื่อนี้อยู่ในรายชื่อผู้รับผิดชอบแล้ว', 'warn'); return;
  }

  /* ถ้าชื่อตรงกับที่เพิ่งเลือกจาก dropdown ให้แนบตำแหน่ง/กลุ่มไปด้วย */
  var s = (_respSelectedStaff && _respSelectedStaff.name === name) ? _respSelectedStaff : null;

  db.collection('repair_responsible').add({
    name: name,
    position: s ? (s.position || '') : '',
    group: s ? (s.group || '') : '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    input.value = '';
    _respSelectedStaff = null;
    showToast('เพิ่มรายชื่อผู้รับผิดชอบแล้ว ✅');
  }).catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

function deleteResponsible(id, name) {
  if (!confirm('ลบ "' + name + '" ออกจากรายชื่อผู้รับผิดชอบใช่หรือไม่? (ไม่กระทบรายชื่อบุคลากรหลักในหน้า "บุคลากร")')) return;
  db.collection('repair_responsible').doc(id).delete()
    .then(function() { showToast('ลบแล้ว'); })
    .catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); });
}

/* ══════════════════════════════════════════════════════════════
   พิมพ์รายงาน: เลือกช่วงเวลา (รายสัปดาห์/รายเดือน/รายปี ย้อนหลังได้) +
   ผู้รับผิดชอบ (หรือ "ทั้งหมด") แล้วเปิดหน้าต่างใหม่สำหรับสั่งพิมพ์
   ══════════════════════════════════════════════════════════════ */
function renderPrintTechnicianFilterSelect() {
  var sel = document.getElementById('printTechnicianFilter');
  if (!sel) return;
  var current = printTechnicianFilter;
  var names = getAssigneeList().map(function(p) { return p.name; }).sort(function(a, b) { return a.localeCompare(b, 'th'); });
  sel.innerHTML = '<option value="">ทั้งหมด</option>' +
    names.map(function(n) { return '<option value="' + esc2(n).replace(/"/g, '&quot;') + '">' + esc2(n) + '</option>'; }).join('');
  sel.value = current;
}

function openPrintReportModal() {
  periodState.print = { period: 'all', month: new Date().getMonth(), year: new Date().getFullYear() };
  printTechnicianFilter = '';
  printStatusFilter = '';
  var statusSel = document.getElementById('printStatusFilter');
  if (statusSel) statusSel.value = '';
  renderPeriodBar('printPeriodBar', 'print');
  renderPrintTechnicianFilterSelect();
  openModal('printReportModal');
}

function periodLabelText(scope) {
  var st = periodState[scope];
  if (st.period === 'week')  return 'รายสัปดาห์นี้';
  if (st.period === 'month') return 'เดือน ' + THAI_MONTHS[st.month] + ' พ.ศ. ' + (st.year + 543);
  if (st.period === 'year')  return 'ปี พ.ศ. ' + (st.year + 543);
  return 'ทั้งหมด (ทุกช่วงเวลา)';
}

var PRINT_STATUS_LABELS = {
  '': 'ทั้งหมด แยกตามสถานะ',
  reported: 'แจ้งใหม่ (รออนุมัติ)',
  progress: 'กำลังซ่อม',
  done:     'รอผู้แจ้งตรวจสอบ',
  closed:   'ปิดงานแล้ว'
};
function matchesPrintStatus(r, statusFilter) {
  if (!statusFilter) return true;
  if (statusFilter === 'reported') return r.status === 'reported';
  if (statusFilter === 'progress') return ['approved', 'reopened'].indexOf(r.status) !== -1;
  if (statusFilter === 'done')     return r.status === 'done';
  if (statusFilter === 'closed')   return r.status === 'closed';
  return true;
}

function doPrintReport() {
  var sel = document.getElementById('printTechnicianFilter');
  printTechnicianFilter = sel ? sel.value : '';
  var statusSel = document.getElementById('printStatusFilter');
  printStatusFilter = statusSel ? statusSel.value : '';

  var list = filterByPeriod(allRepairs, 'print');
  if (printTechnicianFilter) {
    list = list.filter(function(r) { return _normName(r.technician) === _normName(printTechnicianFilter); });
  }
  if (printStatusFilter) {
    list = list.filter(function(r) { return matchesPrintStatus(r, printStatusFilter); });
  }
  /* เรียงจากแจ้งก่อนไปหลังตามวันที่ ให้อ่านเป็นไทม์ไลน์ง่าย */
  list = list.slice().sort(function(a, b) {
    var at = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0;
    var bt = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0;
    return at - bt;
  });

  if (!list.length) {
    showToast('ไม่พบรายการแจ้งซ่อมที่ตรงกับเงื่อนไขที่เลือก', 'warn');
    return;
  }

  openPrintWindow(list);
  closeModal('printReportModal');
}

/* สีป้ายสถานะสำหรับหน้าพิมพ์ (คู่กับ getStatusMeta().color) */
var PRINT_BADGE_COLORS = {
  amber:  { bg: '#fef3c7', text: '#92400e' },
  sky:    { bg: '#e0f2fe', text: '#075985' },
  purple: { bg: '#ede9fe', text: '#5b21b6' },
  green:  { bg: '#dcfce7', text: '#15803d' },
  red:    { bg: '#fee2e2', text: '#b91c1c' }
};

/* การ์ดของรายการเดียว ใช้ร่วมกันทั้งโหมด "สถานะเดียว" และโหมด "ทั้งหมด แยกตามสถานะ" */
function renderPrintItem(r, idx) {
  var cat = getCategoryMeta(r.category);
  var meta = getStatusMeta(r);
  var badge = PRINT_BADGE_COLORS[meta.color] || PRINT_BADGE_COLORS.amber;

  var photosHtml = '';
  if (r.photos && r.photos.length) {
    photosHtml =
      '<div class="photos-title">รูปภาพที่แนบ (' + r.photos.length + ' รูป)</div>' +
      '<div class="photos">' + r.photos.map(function(p) {
        return '<div class="photo-box"><img src="' + p.url + '" alt="รูปแนบ"></div>';
      }).join('') + '</div>';
  } else {
    photosHtml = '<div class="no-photo">ไม่มีรูปภาพแนบ</div>';
  }

  return (
    '<div class="item">' +
      '<div class="item-head">' +
        '<h2>' + (idx + 1) + '. ' + esc2(r.title || '(ไม่มีหัวข้อ)') + '</h2>' +
        '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">' +
          (r.priority === 'urgent' ? '<span class="urgent-badge">เร่งด่วน</span>' : '') +
          '<span class="status-badge" style="background:' + badge.bg + ';color:' + badge.text + ';">' + esc2(meta.label) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="item-body">' +
        '<div class="info-grid">' +
          '<div><span class="label">ผู้แจ้ง</span>' + esc2(r.reporterName || r.reporterEmail || '-') + (r.reporterPosition ? (' <span class="dim">(' + esc2(r.reporterPosition) + ')</span>') : '') + '</div>' +
          '<div><span class="label">เบอร์โทร</span>' + esc2(r.reporterPhone || '-') + '</div>' +
          '<div><span class="label">วันเวลาที่แจ้ง</span>' + fmtDate(r.createdAt) + '</div>' +
          '<div><span class="label">สถานที่</span>' + esc2(r.location || '-') + '</div>' +
          '<div><span class="label">หมวดหมู่</span>' + esc2(cat.label) + '</div>' +
          '<div><span class="label">ผู้รับผิดชอบ</span>' + esc2(r.technician || '-') + '</div>' +
        '</div>' +
        '<div class="desc-box"><span class="label" style="display:block;margin-bottom:3px;">รายละเอียด</span>' + esc2(r.description || '-') + '</div>' +
        photosHtml +
      '</div>' +
    '</div>'
  );
}

/* ลำดับ/หัวข้อของแต่ละกลุ่มสถานะ เวลาเลือก "ทั้งหมด แยกตามสถานะ" */
var PRINT_STATUS_GROUPS = [
  { key: 'reported', label: 'แจ้งใหม่ (รออนุมัติ)' },
  { key: 'progress', label: 'กำลังซ่อม' },
  { key: 'done',     label: 'รอผู้แจ้งตรวจสอบ' },
  { key: 'closed',   label: 'ปิดงานแล้ว' }
];

function openPrintWindow(list) {
  var win = window.open('', '_blank');
  if (!win) {
    showToast('เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตป๊อปอัปสำหรับเว็บนี้แล้วลองอีกครั้ง', 'warn');
    return;
  }

  var periodLabel = periodLabelText('print');
  var statusLabel = PRINT_STATUS_LABELS[printStatusFilter] || 'ทั้งหมด แยกตามสถานะ';
  var techLabel = printTechnicianFilter ? esc2(printTechnicianFilter) : 'ทั้งหมด';
  var now = new Date();
  var printedAt = now.toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'numeric' }) +
                  ' ' + now.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' });

  var itemsHtml;
  if (!printStatusFilter) {
    /* "ทั้งหมด แยกตามสถานะ" — จัดกลุ่มเป็นหมวดสถานะ มีหัวข้อคั่นแต่ละกลุ่ม
       (รายการสถานะ "ไม่อนุมัติ" ไม่รวมอยู่ในตัวเลือกนี้ ถ้าต้องการดูให้เลือกกรองที่ตารางประวัติแทน) */
    itemsHtml = PRINT_STATUS_GROUPS.map(function(g) {
      var items = list.filter(function(r) { return matchesPrintStatus(r, g.key); });
      if (!items.length) return '';
      return '<div class="section-title">' + g.label + ' (' + items.length + ' รายการ)</div>' +
        items.map(function(r, idx) { return renderPrintItem(r, idx); }).join('');
    }).join('');
  } else {
    itemsHtml = list.map(function(r, idx) { return renderPrintItem(r, idx); }).join('');
  }

  var html =
    '<!doctype html><html lang="th"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>รายงานแจ้งซ่อม</title>' +
    '<style>' +
      '@page{ size: A4; margin: 14mm 12mm; }' +
      '*{box-sizing:border-box;}' +
      'body{font-family:Sarabun,Tahoma,sans-serif;color:var(--text);margin:0;padding:22px;background:var(--blue-light-3);}' +
      '.page-wrap{max-width:840px;margin:0 auto;background:var(--gray-light);padding:26px 30px;border-radius:12px;}' +

      '.report-header{border-bottom:3px solid var(--indigo-5);padding-bottom:14px;margin-bottom:16px;}' +
      '.report-header h1{font-size:19px;margin:0 0 3px;color:var(--text);}' +
      '.report-header .school{font-size:12px;color:var(--text2);}' +

      '.meta-box{background:var(--bg-alt);border-radius:10px;padding:12px 16px;margin-bottom:20px;' +
        'display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;font-size:12px;color:var(--text-mid);}' +
      '.meta-box .full{grid-column:1 / -1;border-top:1px solid var(--border);margin-top:4px;padding-top:6px;font-weight:700;color:var(--text-slate);}' +
      '.meta-box b{color:var(--text);}' +

      '.section-title{font-size:14px;font-weight:800;color:var(--indigo-5);margin:22px 0 10px;padding-bottom:6px;' +
        'border-bottom:2px solid var(--indigo-light-2);page-break-after:avoid;}' +
      '.section-title:first-of-type{margin-top:0;}' +

      '.item{border:1px solid var(--border-mid);border-radius:12px;margin-bottom:16px;overflow:hidden;page-break-inside:avoid;}' +
      '.item-head{background:var(--blue-light);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid var(--blue-light-4);}' +
      '.item-head h2{font-size:13.5px;margin:0;color:var(--indigo-deep-2);font-weight:800;}' +
      '.status-badge{display:inline-block;padding:3px 11px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap;}' +
      '.urgent-badge{display:inline-block;padding:3px 11px;border-radius:20px;font-size:11px;font-weight:800;background:var(--red-light);color:var(--red-dark);white-space:nowrap;}' +

      '.item-body{padding:14px 16px;}' +
      '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px 20px;font-size:12.5px;margin-bottom:12px;}' +
      '.info-grid .label{display:block;font-size:10.5px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:1px;}' +
      '.dim{color:var(--text3);font-size:11.5px;}' +

      '.desc-box{background:var(--bg);border-radius:8px;padding:10px 12px;font-size:12.5px;line-height:1.6;margin-bottom:14px;white-space:pre-wrap;}' +
      '.desc-box .label{display:block;font-size:10.5px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:4px;}' +

      '.photos-title{font-size:11px;font-weight:800;color:var(--text-mid);margin-bottom:8px;text-transform:uppercase;letter-spacing:.3px;}' +
      '.photos{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
      '.photo-box{border-radius:10px;overflow:hidden;border:1px solid var(--border-mid);background:var(--bg);}' +
      '.photo-box img{display:block;width:100%;height:280px;object-fit:cover;}' +
      '.no-photo{font-size:12px;color:var(--text3);font-style:italic;}' +

      '.no-print{max-width:840px;margin:0 auto 16px;}' +
      '.no-print button{padding:10px 22px;border-radius:9px;border:none;background:var(--indigo);color:var(--gray-light);font-weight:700;font-size:13.5px;cursor:pointer;}' +

      '@media print{' +
        'body{background:var(--gray-light);padding:0;}' +
        '.page-wrap{max-width:none;padding:0;border-radius:0;}' +
        '.no-print{display:none;}' +
        '.item{border-color:var(--text3);}' +
        '.photo-box img{height:250px;}' +
      '}' +
    '</style></head><body>' +
      '<div class="no-print"><button onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button></div>' +
      '<div class="page-wrap">' +
        '<div class="report-header">' +
          '<h1>รายงานการแจ้งซ่อม</h1>' +
          '<div class="school">โรงเรียนหนองกี่พิทยาคม</div>' +
        '</div>' +
        '<div class="meta-box">' +
          '<div>ช่วงเวลา: <b>' + periodLabel + '</b></div>' +
          '<div>สถานะ: <b>' + esc2(statusLabel) + '</b></div>' +
          '<div>ผู้รับผิดชอบ: <b>' + techLabel + '</b></div>' +
          '<div>พิมพ์เมื่อ: <b>' + printedAt + '</b></div>' +
          '<div class="full">รวมทั้งหมด ' + list.length + ' รายการ</div>' +
        '</div>' +
        itemsHtml +
      '</div>' +
    '</body></html>';

  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* ══════════════════════ INIT ══════════════════════ */
/* ══════════════════════════════════════════════════════════════
   buildPage() — auth guard (ต้องมีสิทธิ์ 'repair') + shell builder

   ✏️ ต้องเพิ่มสิทธิ์ 'repair' ให้เจ้าหน้าที่ที่เกี่ยวข้องในเอกสาร
      admins/{email} → permissions.repair = true (ใน Firestore)
   ══════════════════════════════════════════════════════════════ */
buildPage({
  appId:        'myApp',
  navSubtitle:  'จัดการระบบแจ้งซ่อม',
  navTheme:     'dark',
  activePage:   'repair-admin',
  requireAdmin: 'repair', /* ✏️ permission key */

  onAuth: function(user, contentEl) {
    currentUser = user;
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);

    contentEl.innerHTML = renderPage();
    lucide.createIcons();

    repSubTabs = initSubtabs('repSubTabBar', { onChange: onRepSubtabChange });
    repReportSubtabs = initSubtabs('repReportNav', { onChange: onRepReportSubtabChange });

    loadData();
    loadCategories();
    loadBuildings();
    loadRepairStaffList();
    loadResponsibleList();
    setupScrollTopButton();
  }
});


