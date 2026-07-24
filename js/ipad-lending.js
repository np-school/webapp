/* ── Helper: อ่าน CSS variable จาก :root (ใช้กับ canvas/Chart.js ที่ไม่รองรับ var() ตรงๆ
     — ถ้าส่ง 'var(--x)' ตรงๆ ให้ Chart.js/canvas fillStyle มันจะ parse สีไม่ได้และ fallback
     เป็นสีดำเงียบๆ ต้อง resolve เป็นค่าสีจริงผ่าน getComputedStyle ก่อนเสมอ) ── */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ══════════════════════ STATE ══════════════════════ */
var currentUser  = null;
var ipadSubtabs; // handle จาก initSubtabs() — ผูกใน onAuth หลัง renderPage()
var STUDENTS     = [];   /* {id, name, grade, room} */
var DEVICES      = [];   /* {id, friendlyName, assetNumber, serialNumber, status} */
var BORROWS_OUT  = [];   /* currently borrowed (status = 'out') — real-time, จำนวนน้อยเพราะจำกัดด้วยจำนวน iPad ที่มี */
var parsedCsvRows = [];
var parsedStudentCsvRows = [];
var studentFilterGrade = 'all';
var studentFilterRoom  = 'all';
var STAFF = [];   /* ดึงอัตโนมัติจาก collection 'staff' (หน้า staff.html) */
var staffSearchQuery = '';
var ACCESSORY_CLAIMS = [];   /* {id, name, note, reportedBy, createdAt} — เคลมอุปกรณ์เสริม ไม่มีรหัสอ้างอิง */

/* ── ประวัติทั้งหมด (ipad_borrows ทุก doc) — แบ่งหน้า ทีละ 100 รายการ
     ไม่โหลดทั้งหมดมาไว้ในหน่วยความจำ เพื่อไม่ให้เว็บช้าลงเรื่อยๆ ตามจำนวนประวัติที่สะสม ── */
var BORROWS_HISTORY   = [];   /* ข้อมูลเฉพาะหน้าปัจจุบันที่กำลังแสดง (สูงสุด 100 แถว) */
var HISTORY_PAGE_SIZE = 100;
var historyPage         = 1;
var historyPageCursors  = [];   /* historyPageCursors[i] = เอกสารตัวสุดท้ายของหน้า (i+1) ใช้ทำ startAfter หน้าถัดไป */
var historyHasNext      = false;
var historyLoading      = false;

/* ══════════════════════════════════════════════════════════════
   สถิติ (กราฟด้านบน) — อัปเดตทุกครั้งที่ STUDENTS/DEVICES/BORROWS เปลี่ยน
   ══════════════════════════════════════════════════════════════ */
var _charts = {};
/* แสดงอุปกรณ์เสริมแยกเป็น badge สีเขียว (ยังไม่คืน/ยืมอยู่) / สีเทา (คืนเรียบร้อยแล้ว หรือไม่ได้ยืมชิ้นนี้)
   เรียงลำดับ: หัวชาร์จ, สายชาร์จ, ปากกา, เคส */
var ACC_ORDER = ['หัวชาร์จ', 'สายชาร์จ', 'ปากกา', 'เคส'];
var ACC_ICONS = { 'หัวชาร์จ': 'plug-zap', 'สายชาร์จ': 'cable', 'ปากกา': 'pen-tool', 'เคส': 'package' };

var borrowFilterType = 'all';

var editingBorrowId = null;

var currentReturnBorrowId = null;

var RETURN_ACC_ICONS = { 'หัวชาร์จ': 'plug-zap', 'สายชาร์จ': 'cable', 'ปากกา': 'pen-line', 'เคส': 'briefcase' };

var studentStatType  = 'student'; /* 'student' | 'staff' */
var studentStatMode  = 'grade';
var studentStatGrade = 'ม.4';

var editingStudentId = null;

/* ══════════════════════════════════════════════════════════════
   ปรับสถานะเคลม (ใช้ร่วมกันทั้งหน้า "ข้อมูล iPad" และหน้า "ส่งเคลม")
   ══════════════════════════════════════════════════════════════ */
var currentClaimDeviceId = null;

/* ══════════════════════════════════════════════════════════════
   เคลมไอแพดโดยตรงจากหน้า "ส่งเคลม" — เลือกเครื่องได้ทั้งเครื่องว่างและ
   เครื่องที่กำลังถูกยืมอยู่ ถ้าเครื่องกำลังถูกยืมอยู่ จะมีตัวเลือกให้
   "เปลี่ยนเครื่อง" ให้ผู้ยืมทันที (ไม่บังคับ — ไม่เลือกก็ได้ ผู้ยืมจะ
   ยังถือเครื่องเดิมที่ถูกส่งเคลมต่อไป จนกว่าจะมาคืน/แก้ไขทีหลัง)
   สถานะ condition ของเครื่องอ่าน/เขียนที่ ipad_devices ตัวเดียวกับหน้า
   "ข้อมูล iPad" และหน้ายืม (onBorrowDeviceInput กรอง condition==='claim'
   ออกจากรายการให้ยืมอยู่แล้ว) จึงอัปเดตแล้วเห็นผลตรงกันทุกหน้าโดยอัตโนมัติ
   ══════════════════════════════════════════════════════════════ */
var claimSelectedDeviceId  = null;
var claimSelectedBorrow    = null; /* รายการยืมที่ผูกกับเครื่องที่เลือก (ถ้ามี) */
var claimNewDeviceId       = null;

/* ══════════════════════ DATA LOADING ══════════════════════ */
function refreshStudentRoomFilterOptions() {
  var sel = document.getElementById('studentRoomFilter');
  if (!sel) return;
  var rooms = {};
  STUDENTS.forEach(function(s) {
    if (studentFilterGrade === 'all' || s.grade === studentFilterGrade) rooms[s.room] = true;
  });
  var roomList = Object.keys(rooms).sort(function(a,b){ return a.localeCompare(b,'th',{numeric:true}); });
  sel.innerHTML = '<option value="all">ทุกห้อง</option>' + roomList.map(function(r) {
    return '<option value="' + esc2(r) + '">ห้อง ' + esc2(r) + '</option>';
  }).join('');
  sel.value = studentFilterRoom;
}

function loadStaff() {
  /* ดึงครั้งเดียว ไม่ใช้ onSnapshot — หน้านี้ไม่มีจุดเขียนข้อมูล 'staff' เลย
     (จัดการที่หน้า staff.html) จึงไม่มีความเสี่ยงเรื่องข้อมูลค้าง */
  db.collection('staff').orderBy('name').get().then(function(snap) {
    STAFF = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    renderStaffTable();
    renderStatsCharts();
    renderStudentStatsChart();
    if (document.getElementById('borrowFilterGroup')) populateBorrowFilterGroupOptions();
  }).catch(function(e) { showToast('โหลดข้อมูลบุคลากรผิดพลาด: ' + e.message, 'error'); });
}

/* ══════════════════════════════════════════════════════════════
   ประวัติทั้งหมด — โหลดทีละหน้า (100 รายการ/หน้า) ด้วย Firestore cursor
   แทนที่จะโหลดทุก doc มาไว้ในหน่วยความจำตั้งแต่เปิดเว็บ
   ══════════════════════════════════════════════════════════════ */
function fetchHistoryPage(page) {
  if (historyLoading) return;
  historyLoading = true;

  var tbody = document.getElementById('historyTbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text3);">กำลังโหลด...</td></tr>';

  var query = db.collection('ipad_borrows').orderBy('createdAt', 'desc').limit(HISTORY_PAGE_SIZE);
  if (page > 1 && historyPageCursors[page - 2]) {
    query = query.startAfter(historyPageCursors[page - 2]);
  }

  query.get().then(function(snap) {
    BORROWS_HISTORY = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    historyHasNext = snap.docs.length === HISTORY_PAGE_SIZE;
    if (snap.docs.length) historyPageCursors[page - 1] = snap.docs[snap.docs.length - 1];
    historyPage = page;
    renderHistoryTable();
    updateHistoryPagerUI();
  }).catch(function(e) {
    showToast('โหลดประวัติผิดพลาด: ' + e.message, 'error');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--red-bright);">โหลดข้อมูลไม่สำเร็จ</td></tr>';
  }).then(function() {
    historyLoading = false;
  });
}

/* ══════════════════════════════════════════════════════════════
   Firestore listeners

   ── หมายเหตุ: loadStudents() / loadStaff() เปลี่ยนจาก onSnapshot (realtime)
   เป็นดึงครั้งเดียว (.get()) ──
   เหตุผล: ข้อมูลนักเรียน/บุคลากรเป็น "ทะเบียนอ้างอิง" ไม่ใช่สถานะที่ต้อง
   sync สดตลอดเวลาแบบ ipad_borrows (ที่ยังเป็น onSnapshot เหมือนเดิม 100%
   เพราะเป็นตัวเดียวที่ตัดสินว่า "เครื่องนี้ว่างไหม" ตอนบันทึกยืม-คืน)
   การเปิด realtime listener พร้อมกันทีเดียว 5 ตัวตอนโหลดหน้าทำให้ข้อมูล
   กว่าจะขึ้นช้า (แต่ละตัวคือ 1 long-polling channel ที่ต้อง handshake
   แยกกัน) ตัดเหลือแค่ตัวที่จำเป็นจริงๆ ช่วยให้หน้าโหลดข้อมูลไวขึ้น

   เพื่อไม่ให้ตารางนักเรียน/บุคลากรค้างข้อมูลเก่าหลังแก้ไขในหน้านี้เอง
   (เพิ่ม/แก้/ลบนักเรียน, import CSV) ทุกจุดที่เขียนข้อมูลไป
   'ipad_students' จะอัปเดต STUDENTS ในเครื่อง (optimistic) ทันทีเอง
   ไม่ต้องรอโหลดหน้าใหม่ — ดูจุด comment "sync STUDENTS local" ในแต่ละฟังก์ชัน
   ══════════════════════════════════════════════════════════════ */
function _onStudentsChanged() {
  renderStudentsTable();
  renderStudentStatsChart();
  if (document.getElementById('borrowFilterRoom')) populateBorrowFilterRoomOptions();
}

function loadStudents() {
  db.collection('ipad_students').get().then(function(snap) {
    STUDENTS = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    _onStudentsChanged();
  }).catch(function(e) { showToast('โหลดข้อมูลนักเรียนผิดพลาด: ' + e.message, 'error'); });
}

function loadDevices() {
  db.collection('ipad_devices').onSnapshot(function(snap) {
    DEVICES = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    renderDevicesTable();
    renderClaimsTable();
    var header = document.querySelector('#subpanel-devices .section-divider');
    if (header) header.innerHTML = '<i data-lucide="tablet" style="width:16px;height:16px;"></i> รายการ iPad ทั้งหมด (' + DEVICES.length + ')';
    renderStatsCharts();
    lucide.createIcons();
  }, function(e) { showToast('โหลดข้อมูล iPad ผิดพลาด: ' + e.message, 'error'); });
}

function loadAccessoryClaims() {
  db.collection('ipad_accessory_claims').orderBy('createdAt', 'desc').onSnapshot(function(snap) {
    ACCESSORY_CLAIMS = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    renderAccessoryClaimsTable();
  }, function(e) { showToast('โหลดข้อมูลเคลมอุปกรณ์เสริมผิดพลาด: ' + e.message, 'error'); });
}

function loadActiveBorrows() {
  /* ดึงเฉพาะรายการที่ "ยังไม่คืน" (real-time) — จำนวนถูกจำกัดด้วยจำนวน iPad ที่มีจริง
     ไม่ใช่ประวัติทั้งหมดที่โตขึ้นเรื่อยๆ ทุกวัน จึงไม่ต้องกังวลเรื่อง limit */
  db.collection('ipad_borrows').where('status', '==', 'out').onSnapshot(function(snap) {
    BORROWS_OUT = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    renderBorrowOutTable();
    renderDevicesTable();
    renderStudentsTable();
    renderStaffTable();
    renderStatsCharts();
    renderStudentStatsChart();
  }, function(e) { showToast('โหลดรายการที่กำลังยืมผิดพลาด: ' + e.message, 'error'); });
}

/* ══════════════════════ RENDER ══════════════════════ */
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════════════════════
   Page shell / sub-tabs
   ══════════════════════════════════════════════════════════════ */
function renderPage() {
  return (
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title-row">' +
          '<div class="page-icon blue"><i data-lucide="tablet-smartphone" style="width:20px;height:20px;color:white;"></i></div>' +
          '<h1 class="page-title">ระบบยืม-คืน iPad</h1>' +
        '</div>' +
        '<p class="page-sub">บันทึกการยืม-คืน iPad ของนักเรียนชั้น ม.4-6</p>' +
      '</div>' +
    '</div>' +

    '<div class="ipad-stats-grid" id="ipadStatsGrid">' +
      '<div class="card"><div class="section-divider" style="margin:0 0 6px;border:none;padding:0;font-size:12.5px;">สถานะเครื่อง</div><canvas id="chartDeviceStatus"></canvas></div>' +
      '<div class="card"><div class="section-divider" style="margin:0 0 6px;border:none;padding:0;font-size:12.5px;" id="accessoriesChartTitle">อุปกรณ์เสริม (ยืมอยู่ / คงเหลือ)</div><canvas id="chartAccessories"></canvas></div>' +
      '<div class="card"><div class="section-divider" style="margin:0 0 6px;border:none;padding:0;font-size:12.5px;">นักเรียน/บุคลากรที่ยืมอยู่</div><canvas id="chartBorrowerType"></canvas></div>' +
    '</div>' +

    '<div class="card" style="margin-bottom:18px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">' +
        '<div class="section-divider" style="margin:0;border:none;padding:0;font-size:13px;"><i data-lucide="bar-chart-3" style="width:16px;height:16px;"></i> สถิติจำนวนนักเรียน/บุคลากร &amp; การยืม iPad</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="view-btn active" id="stuStatTypeStudent" onclick="setStudentStatType(\'student\')"><i data-lucide="graduation-cap" style="width:14px;height:14px;"></i> นักเรียน</button>' +
            '<button class="view-btn" id="stuStatTypeStaff" onclick="setStudentStatType(\'staff\')"><i data-lucide="briefcase" style="width:14px;height:14px;"></i> ครูและบุคลากร</button>' +
          '</div>' +
          '<div style="display:flex;gap:8px;" id="stuStatModeToggleWrap">' +
            '<button class="view-btn active" id="stuStatViewGrade" onclick="setStudentStatMode(\'grade\')">รายชั้น</button>' +
            '<button class="view-btn" id="stuStatViewRoom" onclick="setStudentStatMode(\'room\')">รายห้อง</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div id="stuStatGradeSelectWrap" style="display:none;gap:8px;margin-bottom:14px;flex-wrap:wrap;">' +
        '<button class="filter-pill active" onclick="setStudentStatGrade(\'ม.4\', this)">ม.4</button>' +
        '<button class="filter-pill" onclick="setStudentStatGrade(\'ม.5\', this)">ม.5</button>' +
        '<button class="filter-pill" onclick="setStudentStatGrade(\'ม.6\', this)">ม.6</button>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">' +
        '<div style="background:var(--bg);border-radius:12px;padding:12px 14px;">' +
          '<p style="font-size:11.5px;color:var(--text2);margin:0 0 4px;font-weight:600;" id="stuStatTotalLabel">นักเรียนทั้งหมด</p>' +
          '<p style="font-size:22px;font-weight:800;color:var(--text);margin:0;" id="stuStatTotalCount">0</p>' +
        '</div>' +
        '<div style="background:var(--amber-light);border-radius:12px;padding:12px 14px;">' +
          '<p style="font-size:11.5px;color:var(--amber);margin:0 0 4px;font-weight:600;">กำลังยืม iPad อยู่</p>' +
          '<p style="font-size:22px;font-weight:800;color:var(--amber);margin:0;" id="stuStatBorrowingCount">0</p>' +
        '</div>' +
        '<div style="background:var(--blue-light);border-radius:12px;padding:12px 14px;">' +
          '<p style="font-size:11.5px;color:var(--blue);margin:0 0 4px;font-weight:600;">สัดส่วนที่กำลังยืม</p>' +
          '<p style="font-size:22px;font-weight:800;color:var(--blue);margin:0;" id="stuStatPercent">0%</p>' +
        '</div>' +
      '</div>' +

      '<div style="position:relative;height:260px;"><canvas id="chartStudentStats"></canvas></div>' +
    '</div>' +

    '<div class="sub-tab-bar scroll" id="ipadSubtabBar">' +
      '<button class="sub-tab active" data-tab="borrow"><i data-lucide="repeat" style="width:14px;height:14px;"></i> ยืม-คืนอุปกรณ์</button>' +
      '<button class="sub-tab" data-tab="students"><i data-lucide="users" style="width:14px;height:14px;"></i> ข้อมูลนักเรียน</button>' +
      '<button class="sub-tab" data-tab="staff"><i data-lucide="id-card" style="width:14px;height:14px;"></i> รายชื่อบุคลากร</button>' +
      '<button class="sub-tab" data-tab="devices"><i data-lucide="tablet" style="width:14px;height:14px;"></i> ข้อมูล iPad</button>' +
      '<button class="sub-tab" data-tab="claims"><i data-lucide="triangle-alert" style="width:14px;height:14px;"></i> ส่งเคลม</button>' +
      '<button class="sub-tab" data-tab="history"><i data-lucide="history" style="width:14px;height:14px;"></i> ประวัติทั้งหมด</button>' +
    '</div>' +

    '<div class="tab-pane active" data-panel="borrow" id="subpanel-borrow">'   + renderBorrowPanel()   + '</div>' +
    '<div class="tab-pane" data-panel="students" id="subpanel-students">'        + renderStudentsPanel() + '</div>' +
    '<div class="tab-pane" data-panel="staff" id="subpanel-staff">'           + renderStaffPanel()    + '</div>' +
    '<div class="tab-pane" data-panel="devices" id="subpanel-devices">'         + renderDevicesPanel()  + '</div>' +
    '<div class="tab-pane" data-panel="claims" id="subpanel-claims">'          + renderClaimsPanel()   + '</div>' +
    '<div class="tab-pane" data-panel="history" id="subpanel-history">'         + renderHistoryPanel()  + '</div>'
  );
}
function renderStatsCharts() {
  if (typeof Chart === 'undefined') return;
  var outCount = BORROWS_OUT.length;
  var freeCount = Math.max(DEVICES.length - outCount, 0);
  var totalDevices = DEVICES.length;
  var chargerCount = BORROWS_OUT.filter(function(b){ return (b.accessories||[]).indexOf('หัวชาร์จ') !== -1; }).length;
  var cableCount   = BORROWS_OUT.filter(function(b){ return (b.accessories||[]).indexOf('สายชาร์จ') !== -1; }).length;
  var penCount  = BORROWS_OUT.filter(function(b){ return (b.accessories||[]).indexOf('ปากกา') !== -1; }).length;
  var caseCount = BORROWS_OUT.filter(function(b){ return (b.accessories||[]).indexOf('เคส') !== -1; }).length;
  var staffOutCount   = BORROWS_OUT.filter(function(b){ return b.borrowerType === 'staff'; }).length;
  var studentOutCount = outCount - staffOutCount;

  _drawChart('chartDeviceStatus', 'doughnut', ['ถูกยืมอยู่','ว่าง'], [outCount, freeCount], [cssVar('--c-green'), cssVar('--c-red')]);

  var accTitle = document.getElementById('accessoriesChartTitle');
  if (accTitle) accTitle.textContent = 'อุปกรณ์เสริม (ยืมอยู่ / คงเหลือ) — ชุดละ ' + totalDevices + ' ชิ้น';
  _drawAccessoriesChart(
    ['หัวชาร์จ','สายชาร์จ','ปากกา','เคส'],
    [chargerCount, cableCount, penCount, caseCount],
    totalDevices
  );

  _drawChart('chartBorrowerType', 'doughnut', ['นักเรียน','บุคลากร'], [studentOutCount, staffOutCount], [cssVar('--chart-1'), cssVar('--c-amber')]);
}
function _drawAccessoriesChart(labels, borrowedCounts, totalDevices) {
  var el = document.getElementById('chartAccessories');
  if (!el) return;
  var remaining = borrowedCounts.map(function(c) { return Math.max(totalDevices - c, 0); });
  if (_charts['chartAccessories']) _charts['chartAccessories'].destroy();
  _charts['chartAccessories'] = new Chart(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'ยืมอยู่',   data: borrowedCounts, backgroundColor: cssVar('--c-amber'), borderRadius: 4, maxBarThickness: 26, stack: 'a' },
        { label: 'คงเหลือ', data: remaining,      backgroundColor: cssVar('--border'), borderRadius: 4, maxBarThickness: 26, stack: 'a' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11, family: 'Sarabun' }, boxWidth: 12 } } },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11, family: 'Sarabun' } } },
        y: { stacked: true, beginAtZero: true, max: totalDevices, ticks: { precision: 0 } }
      }
    }
  });
}
function _drawChart(canvasId, type, labels, data, colors) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  if (_charts[canvasId]) _charts[canvasId].destroy();
  _charts[canvasId] = new Chart(el.getContext('2d'), {
    type: type,
    data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11, family: 'Sarabun' }, boxWidth: 12 } } },
      scales: type === 'bar' ? { y: { beginAtZero: true, ticks: { precision: 0 } } } : {}
    }
  });
}

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function fmtDate(v) {
  if (!v) return '-';
  var d = (v.toDate) ? v.toDate() : new Date(v);
  return d.toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit' });
}
/* ชื่อผู้ใช้ที่ล็อกอินอยู่ตอนนี้ ใช้ประทับอัตโนมัติว่า "บันทึกโดยใคร" ในทุกจุดที่มีการบันทึก/แก้ไขข้อมูล */
function currentUserLabel() {
  if (!currentUser) return '';
  return currentUser.displayName || currentUser.email || '';
}
/* label ที่ใช้ค้นหา/แสดงในช่องเลือกนักเรียน เช่น "12345 - สมชาย ใจดี" */
function studentLabel(s) {
  return s.studentId + ' - ' + s.firstName + ' ' + s.lastName;
}
function studentFullName(s) {
  return s.firstName + ' ' + s.lastName;
}
function accBadges(accessories, status) {
  accessories = accessories || [];
  var html = ACC_ORDER.map(function(name) {
    var has = accessories.indexOf(name) !== -1;
    var icon = ACC_ICONS[name] || 'circle';
    /* accessories ในเรคคอร์ดจะมีเฉพาะชิ้นที่ "ยังไม่คืน" เท่านั้น (ชิ้นที่คืนแล้วจะถูกเอาออกจาก array)
       เขียว = ยังอยู่กับผู้ยืม (ยืมอยู่ หรือ คืนเครื่องแล้วแต่ชิ้นนี้ยังไม่คืน) · เทา = ไม่ได้ยืม/คืนเรียบร้อยแล้ว */
    var cls = has ? 'yes' : 'none';
    return '<span class="acc-badge ' + cls + '" title="' + name + '"><i data-lucide="' + icon + '" style="width:14px;height:14px;"></i></span>';
  }).join('');
  var other = accessories.filter(function(a){ return ACC_ORDER.indexOf(a) === -1; });
  if (other.length) html += '<span class="acc-badge yes" title="' + esc2(other.join(', ')) + '"><i data-lucide="package" style="width:14px;height:14px;"></i></span>';
  return '<div class="acc-badge-wrap">' + html + '</div>';
}

/* ══════════════════════════════════════════════════════════════
   PANEL 1: ยืม-คืนอุปกรณ์
   ══════════════════════════════════════════════════════════════ */
function renderBorrowPanel() {
  return (
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">' +
        '<div class="section-divider" style="margin:0;border:none;padding:0;"><i data-lucide="list-checks" style="width:16px;height:16px;"></i> รายการที่กำลังถูกยืมอยู่ (<span id="borrowOutCount">' + BORROWS_OUT.length + '</span>)</div>' +
        '<button class="btn-primary" onclick="openBorrowModal()"><i data-lucide="plus" style="width:16px;height:16px;"></i> เพิ่มการยืม</button>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
        '<button class="view-btn active" id="borrowFilterTypeAll" onclick="setBorrowFilterType(\'all\')">ทั้งหมด</button>' +
        '<button class="view-btn" id="borrowFilterTypeStudent" onclick="setBorrowFilterType(\'student\')"><i data-lucide="graduation-cap" style="width:14px;height:14px;"></i> นักเรียน</button>' +
        '<button class="view-btn" id="borrowFilterTypeStaff" onclick="setBorrowFilterType(\'staff\')"><i data-lucide="briefcase" style="width:14px;height:14px;"></i> ครูและบุคลากร</button>' +
      '</div>' +
      '<div id="borrowFilterStudentWrap" style="display:none;gap:10px;flex-wrap:wrap;margin-bottom:12px;">' +
        '<select id="borrowFilterGrade" onchange="onBorrowFilterGradeChange()" style="max-width:150px;">' +
          '<option value="all">ทุกชั้น</option><option value="ม.4">ม.4</option><option value="ม.5">ม.5</option><option value="ม.6">ม.6</option>' +
        '</select>' +
        '<select id="borrowFilterRoom" onchange="renderBorrowOutTable()" style="max-width:150px;">' +
          '<option value="all">ทุกห้อง</option>' +
        '</select>' +
      '</div>' +
      '<div id="borrowFilterStaffWrap" style="display:none;gap:10px;flex-wrap:wrap;margin-bottom:12px;">' +
        '<select id="borrowFilterGroup" onchange="renderBorrowOutTable()" style="max-width:260px;">' +
          '<option value="all">ทุกกลุ่มสาระ/งาน</option>' +
        '</select>' +
      '</div>' +
      '<div class="ipad-search-row"><input type="text" id="borrowOutSearch" placeholder="ค้นหาชื่อ / เลขประจำตัว / Serial Number..." oninput="renderBorrowOutTable()"></div>' +
      '<div class="tbl-wrap"><table class="data-table borrow-out-table"><thead><tr>' +
        '<th>ผู้ยืม</th><th>ชั้น/ห้อง หรือ กลุ่มสาระ</th><th>เครื่อง (Serial)</th><th>อุปกรณ์เสริม</th><th>วันที่ยืม</th><th></th>' +
      '</tr></thead><tbody id="borrowOutTbody">' +
        '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text3);">กำลังโหลด...</td></tr>' +
      '</tbody></table></div>' +
    '</div>'
  );
}

function renderBorrowOutTable() {
  var tbody = document.getElementById('borrowOutTbody');
  if (!tbody) return;
  var countEl = document.getElementById('borrowOutCount');
  if (countEl) countEl.textContent = BORROWS_OUT.length;
  var q = (document.getElementById('borrowOutSearch') ? document.getElementById('borrowOutSearch').value : '').trim().toLowerCase();

  var gradeFilter = document.getElementById('borrowFilterGrade') ? document.getElementById('borrowFilterGrade').value : 'all';
  var roomFilter  = document.getElementById('borrowFilterRoom')  ? document.getElementById('borrowFilterRoom').value  : 'all';
  var groupFilter = document.getElementById('borrowFilterGroup') ? document.getElementById('borrowFilterGroup').value : 'all';

  var list = BORROWS_OUT.filter(function(b) {
    var isStaffRow = b.borrowerType === 'staff';

    if (borrowFilterType === 'student' && isStaffRow) return false;
    if (borrowFilterType === 'staff' && !isStaffRow) return false;

    if (borrowFilterType === 'student') {
      if (gradeFilter !== 'all' && b.grade !== gradeFilter) return false;
      if (roomFilter  !== 'all' && b.room  !== roomFilter)  return false;
    }
    if (borrowFilterType === 'staff') {
      if (groupFilter !== 'all' && (b.grade || 'ไม่ระบุ') !== groupFilter) return false;
    }

    if (!q) return true;
    return (b.studentName || '').toLowerCase().indexOf(q) !== -1 ||
           (b.studentIdNum || '').toLowerCase().indexOf(q) !== -1 ||
           (b.serialNumber || '').toLowerCase().indexOf(q) !== -1;
  });
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text3);">ไม่พบรายการที่ถูกยืมอยู่</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(b) {
    var isStaff = b.borrowerType === 'staff';
    return (
      '<tr>' +
        '<td style="font-weight:700;">' + esc2(b.studentName) + '<br>' + (isStaff ? '<span style="font-size:10px;color:var(--accent-warn);font-weight:700;">(บุคลากร)</span>' : '<span style="font-size:10px;color:var(--accent);font-weight:700;">(นักเรียน)</span>') + '</td>' +
        '<td>' + esc2(b.grade) + ' / ' + esc2(b.room) + '</td>' +
        '<td style="white-space:nowrap;">' + esc2(b.friendlyName) + '<br><span style="font-size:11px;color:var(--text3);">' + esc2(b.serialNumber) + '</span></td>' +
        '<td>' + accBadges(b.accessories, b.status) + '</td>' +
        '<td>' + fmtDate(b.borrowDate) + (b.recordedBy ? '<br><span style="font-size:10px;color:var(--text3);">โดย ' + esc2(b.recordedBy) + '</span>' : '') + '</td>' +
        '<td><div style="display:flex;gap:6px;">' +
          '<button class="btn-icon" onclick="openEditBorrowModal(\'' + b.id + '\')" title="แก้ไข"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
          '<button class="btn-icon" onclick="openReturnModal(\'' + b.id + '\')" title="คืนอุปกรณ์"><i data-lucide="corner-down-left" style="width:14px;height:14px;"></i></button>' +
        '</div></td>' +
      '</tr>'
    );
  }).join('');
  lucide.createIcons();
}

function staffLabel(s) { return (s.name || ''); }

/* ── กล่องแนะนำแบบ custom (แทน native <datalist> ซึ่งบนมือถือ/ไอแพดหลายรุ่นไม่แสดงผล) ──
   dataArr: array ต้นทาง, labelFn/subFn: ข้อความบรรทัดบน/ล่างของแต่ละแถว, onPick: callback ตอนแตะเลือก */
function buildAcList(listEl, items, labelFn, subFn, onPick) {
  listEl.innerHTML = '';
  if (!items.length) { listEl.classList.remove('show'); return; }
  items.forEach(function(item) {
    var row = document.createElement('div');
    row.className = 'ac-item';
    var main = document.createElement('div');
    main.textContent = labelFn(item);
    var sub = document.createElement('div');
    sub.className = 'ac-sub';
    sub.textContent = subFn(item) || '';
    row.appendChild(main);
    row.appendChild(sub);
    /* mousedown + preventDefault กัน input เสีย focus (blur) ก่อนที่ click จะทำงาน โดยเฉพาะบนมือถือ */
    row.addEventListener('mousedown', function(e) { e.preventDefault(); });
    row.addEventListener('click', function() { onPick(item); });
    listEl.appendChild(row);
  });
  listEl.classList.add('show');
}

function onBorrowStudentInput() {
  var isStaff = document.getElementById('borrowerTypeStaff').checked;
  var input   = document.getElementById('borrowStudentInput');
  var listEl  = document.getElementById('studentAcList');
  var v = input.value.trim();
  var q = v.toLowerCase();

  if (isStaff) {
    document.getElementById('newStudentHint').style.display = 'none';
    var staffItems = STAFF.filter(function(s) { return !q || staffLabel(s).toLowerCase().indexOf(q) !== -1; }).slice(0, 30);
    buildAcList(listEl, staffItems, staffLabel, function(s) { return s.position || ''; }, function(s) {
      input.value = staffLabel(s);
      listEl.classList.remove('show');
    });
  } else {
    var match = STUDENTS.some(function(s) { return studentLabel(s) === v; });
    document.getElementById('newStudentHint').style.display = (v && !match) ? 'block' : 'none';
    var stuItems = STUDENTS.filter(function(s) { return !q || studentLabel(s).toLowerCase().indexOf(q) !== -1; }).slice(0, 30);
    buildAcList(listEl, stuItems, studentLabel, function(s) { return s.grade + '/' + s.room; }, function(s) {
      input.value = studentLabel(s);
      document.getElementById('newStudentHint').style.display = 'none';
      listEl.classList.remove('show');
    });
  }
}

function onBorrowDeviceInput() {
  var input  = document.getElementById('borrowDeviceInput');
  var listEl = document.getElementById('deviceAcList');
  var v = input.value.trim();
  var q = v.toLowerCase();

  /* map deviceId -> รายการยืมปัจจุบัน (ยกเว้นรายการที่กำลังแก้ไขอยู่ ให้เลือกกลับมาได้) */
  var borrowedMap = {};
  BORROWS_OUT.forEach(function(b) { if (b.id !== editingBorrowId) borrowedMap[b.deviceId] = b; });

  /* จับคู่ได้ทั้ง Serial Number และ Asset Number (เลขไอแพด) */
  var d = DEVICES.find(function(x) { return x.serialNumber === v || x.assetNumber === v; });
  var hint = document.getElementById('deviceInfoHint');
  if (!d) {
    hint.innerHTML = v ? 'ไม่พบข้อมูลเครื่องนี้ในระบบ' : '';
  } else {
    var bOut = borrowedMap[d.id];
    if (bOut) {
      hint.innerHTML = '<span style="color:var(--red);font-weight:700;">⚠️ ' + esc2(d.friendlyName) +
        ' ถูกยืมอยู่แล้ว โดย ' + esc2(bOut.studentName) + ' (ห้อง ' + esc2(bOut.grade) + '/' + esc2(bOut.room) + ')</span>';
    } else {
      hint.textContent = d.friendlyName + '  — ว่าง พร้อมให้ยืม';
    }
  }

  /* แสดงเครื่องที่ถูกยืมอยู่แล้วในลิสต์ด้วย (แต่กดเลือกไม่ได้) แทนการซ่อนไปเฉยๆ
     เพื่อไม่ให้เข้าใจผิดว่า "ไม่มีข้อมูล" ทั้งที่จริงๆ มีแต่ถูกยืมอยู่ */
  var items = DEVICES.filter(function(dv) {
    if (dv.condition === 'claim') return false;
    if (!q) return true;
    return dv.serialNumber.toLowerCase().indexOf(q) !== -1 ||
           (dv.friendlyName || '').toLowerCase().indexOf(q) !== -1 ||
           (dv.assetNumber || '').toLowerCase().indexOf(q) !== -1;
  }).slice(0, 30);

  renderDeviceAcList(listEl, items, borrowedMap, input);
}

function renderDeviceAcList(listEl, items, borrowedMap, input) {
  listEl.innerHTML = '';
  if (!items.length) { listEl.classList.remove('show'); return; }
  items.forEach(function(dv) {
    var bOut = borrowedMap[dv.id];
    var row = document.createElement('div');
    row.className = 'ac-item' + (bOut ? ' ac-item-disabled' : '');
    if (bOut) row.style.cssText = 'opacity:.6;cursor:not-allowed;';
    var main = document.createElement('div');
    main.textContent = dv.friendlyName;
    var sub = document.createElement('div');
    sub.className = 'ac-sub';
    if (bOut) {
      sub.innerHTML = esc2(dv.serialNumber) + ' — <span style="color:var(--red);">ถูกยืมโดย ' + esc2(bOut.studentName) + '</span>';
    } else {
      sub.textContent = dv.serialNumber;
    }
    row.appendChild(main);
    row.appendChild(sub);
    row.addEventListener('mousedown', function(e) { e.preventDefault(); });
    if (bOut) {
      row.addEventListener('click', function() {
        showToast(dv.friendlyName + ' ถูกยืมอยู่แล้ว โดย ' + bOut.studentName, 'warn');
      });
    } else {
      row.addEventListener('click', function() {
        input.value = dv.serialNumber;
        listEl.classList.remove('show');
        onBorrowDeviceInput();
      });
    }
    listEl.appendChild(row);
  });
  listEl.classList.add('show');
}

/* การ์ด 1 ชิ้น = ไอคอน+ชื่อ ด้านบน แล้วมีปุ่มเลือกสถานะ 3 ทาง ด้านล่าง
   (ไม่คืน / คืน-สภาพดี / คืน-ชำรุด) พื้นหลังการ์ดจะเปลี่ยนสีตามสถานะที่เลือก
   ให้เห็นชัดโดยไม่ต้องอ่านตัวหนังสือ ค่าเริ่มต้นของทุกชิ้นคือ "คืน-สภาพดี" */
function buildReturnRow(radioName, icon, label, sub) {
  return (
    '<div class="return-row" id="row_' + radioName + '" data-state="ok">' +
      '<div class="return-row-head">' +
        '<span class="rr-icon"><i data-lucide="' + icon + '"></i></span>' +
        '<span class="rr-label">' + esc2(label) + (sub ? '<span>' + esc2(sub) + '</span>' : '') + '</span>' +
      '</div>' +
      '<div class="return-state">' +
        '<label><input type="radio" name="' + radioName + '" value="none" onchange="onReturnRowChange(\'' + radioName + '\')"><i data-lucide="corner-up-left"></i> ไม่คืน</label>' +
        '<label><input type="radio" name="' + radioName + '" value="ok" checked onchange="onReturnRowChange(\'' + radioName + '\')"><i data-lucide="check-circle-2"></i> สภาพดี</label>' +
        '<label><input type="radio" name="' + radioName + '" value="claim" onchange="onReturnRowChange(\'' + radioName + '\')"><i data-lucide="triangle-alert"></i> ชำรุด</label>' +
      '</div>' +
    '</div>'
  );
}

function getReturnRowState(radioName) {
  var checked = document.querySelector('input[name="' + radioName + '"]:checked');
  return checked ? checked.value : 'none';
}

/* ══════════════════════════════════════════════════════════════
   PANEL 2: ข้อมูลนักเรียน
   ══════════════════════════════════════════════════════════════ */
function renderStudentsPanel() {
  return (
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">' +
        '<div id="studentTableFilterWrap" style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button class="filter-pill" onclick="filterStudents(\'ม.4\', this)">ม.4</button>' +
          '<button class="filter-pill" onclick="filterStudents(\'ม.5\', this)">ม.5</button>' +
          '<button class="filter-pill" onclick="filterStudents(\'ม.6\', this)">ม.6</button>' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="btn-secondary" onclick="openModal(\'modalImportStudents\')"><i data-lucide="upload" style="width:16px;height:16px;"></i> นำเข้า CSV</button>' +
          '<button class="btn-primary" onclick="openAddStudentModal()"><i data-lucide="user-plus" style="width:16px;height:16px;"></i> เพิ่มนักเรียน</button>' +
        '</div>' +
      '</div>' +
      '<div class="ipad-search-row">' +
        '<input type="text" id="studentSearch" placeholder="ค้นหาเลขประจำตัว / ชื่อ / นามสกุล..." oninput="renderStudentsTable()">' +
        '<select id="studentRoomFilter" onchange="onStudentRoomFilterChange()" style="width:auto;min-width:120px;"><option value="all">ทุกห้อง</option></select>' +
      '</div>' +
      '<div class="tbl-wrap"><table class="data-table"><thead><tr>' +
        '<th>เลขประจำตัว</th><th>ชื่อ</th><th>นามสกุล</th><th>ชั้น</th><th>ห้อง</th><th>สถานะยืม iPad</th><th></th>' +
      '</tr></thead><tbody id="studentsTbody">' +
        '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text3);">กำลังโหลด...</td></tr>' +
      '</tbody></table></div>' +
    '</div>'
  );
}

function setStudentStatType(type) {
  studentStatType = type;
  document.getElementById('stuStatTypeStudent').classList.toggle('active', type === 'student');
  document.getElementById('stuStatTypeStaff').classList.toggle('active', type === 'staff');

  /* ตัวเลือกรายชั้น/รายห้อง ใช้ได้เฉพาะโหมดนักเรียนเท่านั้น (บุคลากรไม่มีชั้น/ห้อง) */
  var modeToggleWrap = document.getElementById('stuStatModeToggleWrap');
  if (modeToggleWrap) modeToggleWrap.style.display = (type === 'student') ? 'flex' : 'none';
  document.getElementById('stuStatGradeSelectWrap').style.display = (type === 'student' && studentStatMode === 'room') ? 'flex' : 'none';

  document.getElementById('stuStatTotalLabel').textContent = (type === 'student') ? 'นักเรียนทั้งหมด' : 'ครูและบุคลากรทั้งหมด';
  renderStudentStatsChart();
}

function setStudentStatMode(mode) {
  studentStatMode = mode;
  document.getElementById('stuStatViewGrade').classList.toggle('active', mode === 'grade');
  document.getElementById('stuStatViewRoom').classList.toggle('active', mode === 'room');
  document.getElementById('stuStatGradeSelectWrap').style.display = (mode === 'room') ? 'flex' : 'none';
  renderStudentStatsChart();
}

function setStudentStatGrade(grade, btn) {
  studentStatGrade = grade;
  document.querySelectorAll('#stuStatGradeSelectWrap .filter-pill').forEach(function(el) { el.classList.remove('active'); });
  btn.classList.add('active');
  renderStudentStatsChart();
}

function renderStudentStatsChart() {
  if (typeof Chart === 'undefined') return;
  var totalEl = document.getElementById('stuStatTotalCount');
  if (!totalEl) return;

  var labels, totals, borrowing, datasetLabel1, datasetLabel2;

  if (studentStatType === 'staff') {
    /* ── โหมดครูและบุคลากร: จัดกลุ่มตาม "กลุ่มสาระ/งาน" (s.group) ─────── */
    var borrowedStaffIds = {};
    BORROWS_OUT.forEach(function(b) { if (b.borrowerType === 'staff') borrowedStaffIds[b.studentId] = true; });

    var groupsSet = {};
    STAFF.forEach(function(s) { groupsSet[s.group || 'ไม่ระบุ'] = true; });
    var groups = Object.keys(groupsSet).sort(function(a, b) { return a.localeCompare(b, 'th'); });

    labels = groups;
    totals = groups.map(function(g) {
      return STAFF.filter(function(s) { return (s.group || 'ไม่ระบุ') === g; }).length;
    });
    borrowing = groups.map(function(g) {
      return STAFF.filter(function(s) { return (s.group || 'ไม่ระบุ') === g && borrowedStaffIds[s.id]; }).length;
    });
    datasetLabel1 = 'บุคลากรทั้งหมด';
    datasetLabel2 = 'กำลังยืม iPad';
  } else {
    /* ── โหมดนักเรียน: จัดกลุ่มตามชั้น หรือ ห้อง ──────────────────────── */
    var borrowedIds = {};
    BORROWS_OUT.forEach(function(b) { if (b.borrowerType !== 'staff') borrowedIds[b.studentId] = true; });

    if (studentStatMode === 'grade') {
      var grades = ['ม.4', 'ม.5', 'ม.6'];
      labels = grades;
      totals = grades.map(function(g) { return STUDENTS.filter(function(s) { return s.grade === g; }).length; });
      borrowing = grades.map(function(g) {
        return STUDENTS.filter(function(s) { return s.grade === g && borrowedIds[s.id]; }).length;
      });
    } else {
      var roomsSet = {};
      STUDENTS.forEach(function(s) { if (s.grade === studentStatGrade) roomsSet[s.room] = true; });
      var rooms = Object.keys(roomsSet).sort(function(a, b) { return a.localeCompare(b, 'th', { numeric: true }); });
      labels = rooms.map(function(r) { return 'ห้อง ' + r; });
      totals = rooms.map(function(r) {
        return STUDENTS.filter(function(s) { return s.grade === studentStatGrade && s.room === r; }).length;
      });
      borrowing = rooms.map(function(r) {
        return STUDENTS.filter(function(s) { return s.grade === studentStatGrade && s.room === r && borrowedIds[s.id]; }).length;
      });
    }
    datasetLabel1 = 'นักเรียนทั้งหมด';
    datasetLabel2 = 'กำลังยืม iPad';
  }

  var total = totals.reduce(function(a, b) { return a + b; }, 0);
  var totalBorrowing = borrowing.reduce(function(a, b) { return a + b; }, 0);
  totalEl.textContent = total;
  document.getElementById('stuStatBorrowingCount').textContent = totalBorrowing;
  document.getElementById('stuStatPercent').textContent = total ? Math.round(totalBorrowing / total * 100) + '%' : '0%';

  var el = document.getElementById('chartStudentStats');
  if (!el) return;
  if (_charts['chartStudentStats']) _charts['chartStudentStats'].destroy();
  _charts['chartStudentStats'] = new Chart(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: datasetLabel1, data: totals, backgroundColor: cssVar('--chart-1'), borderRadius: 4, maxBarThickness: 28 },
        { label: datasetLabel2, data: borrowing, backgroundColor: cssVar('--c-amber'), borderRadius: 4, maxBarThickness: 28 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11, family: 'Sarabun' }, boxWidth: 12 } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Sarabun' } } },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function renderStudentsTable() {
  var tbody = document.getElementById('studentsTbody');
  if (!tbody) return;
  refreshStudentRoomFilterOptions();
  var q = (document.getElementById('studentSearch') ? document.getElementById('studentSearch').value : '').trim().toLowerCase();
  var borrowedByStudentId = {};
  BORROWS_OUT.forEach(function(b) { if (b.borrowerType !== 'staff') borrowedByStudentId[b.studentId] = b; });
  var list = STUDENTS.filter(function(s) {
    if (studentFilterGrade !== 'all' && s.grade !== studentFilterGrade) return false;
    if (studentFilterRoom !== 'all' && s.room !== studentFilterRoom) return false;
    if (q) {
      var txt = ((s.studentId||'') + (s.firstName||'') + (s.lastName||'')).toLowerCase();
      if (txt.indexOf(q) === -1) return false;
    }
    return true;
  }).sort(function(a,b) { return (a.grade+a.room+a.studentId).localeCompare(b.grade+b.room+b.studentId, 'th'); });
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text3);">ไม่มีข้อมูลนักเรียน</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(s) {
    var b = borrowedByStudentId[s.id];
    var statusCell = b ?
      ('<span style="color:var(--green);font-weight:700;">' + esc2(b.friendlyName) +
       '</span><br><span style="font-size:11px;color:var(--green);">' + esc2(b.serialNumber) + '</span>') :
      '<span class="borrow-badge-no">● ไม่ได้ยืม</span>';
    return (
      '<tr>' +
        '<td>' + esc2(s.studentId) + '</td>' +
        '<td style="font-weight:700;">' + esc2(s.firstName) + '</td>' +
        '<td style="font-weight:700;">' + esc2(s.lastName) + '</td>' +
        '<td>' + esc2(s.grade) + '</td>' +
        '<td>' + esc2(s.room) + '</td>' +
        '<td style="white-space:nowrap;">' + statusCell + '</td>' +
        '<td><div style="display:flex;gap:6px;">' +
          '<button class="btn-icon" onclick="openEditStudentModal(\'' + s.id + '\')" title="แก้ไข"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
          '<button class="btn-icon danger" onclick="deleteStudent(\'' + s.id + '\')" title="ลบ"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
        '</div></td>' +
      '</tr>'
    );
  }).join('');
  lucide.createIcons();
}

/* ══════════════════════════════════════════════════════════════
   PANEL 2B: รายชื่อบุคลากร (ดึงอัตโนมัติจาก collection 'staff')
   ══════════════════════════════════════════════════════════════ */
function renderStaffPanel() {
  return (
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">' +
        '<div class="section-divider" style="margin:0;border:none;padding:0;"><i data-lucide="id-card" style="width:16px;height:16px;"></i> รายชื่อบุคลากร (' + STAFF.length + ') — ข้อมูลดึงมาจากหน้าบุคลากรอัตโนมัติ</div>' +
      '</div>' +
      '<div class="ipad-search-row"><input type="text" id="staffSearch" placeholder="ค้นหาชื่อ / ตำแหน่ง / กลุ่มสาระ..." oninput="renderStaffTable()"></div>' +
      '<div class="tbl-wrap"><table class="data-table"><thead><tr>' +
        '<th>ชื่อ-สกุล</th><th>ตำแหน่ง</th><th>กลุ่มสาระ/งาน</th><th>สถานะยืม iPad</th>' +
      '</tr></thead><tbody id="staffTbody">' +
        '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text3);">กำลังโหลด...</td></tr>' +
      '</tbody></table></div>' +
    '</div>'
  );
}

function renderStaffTable() {
  var tbody = document.getElementById('staffTbody');
  if (!tbody) return;
  var q = (document.getElementById('staffSearch') ? document.getElementById('staffSearch').value : '').trim().toLowerCase();
  var borrowedByStaffId = {};
  BORROWS_OUT.forEach(function(b) { if (b.borrowerType === 'staff') borrowedByStaffId[b.studentId] = b; });
  var list = STAFF.filter(function(s) {
    if (!q) return true;
    return ((s.name||'') + (s.position||'') + (s.group||'')).toLowerCase().indexOf(q) !== -1;
  }).sort(function(a,b) { return (a.name||'').localeCompare(b.name||'', 'th'); });
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text3);">ไม่พบข้อมูลบุคลากร</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(s) {
    var b = borrowedByStaffId[s.id];
    var statusCell = b ?
      ('<span style="color:var(--green);font-weight:700;">' + esc2(b.friendlyName) +
       '</span><br><span style="font-size:11px;color:var(--green);">' + esc2(b.serialNumber) + '</span>') :
      '<span class="borrow-badge-no">● ไม่ได้ยืม</span>';
    return (
      '<tr>' +
        '<td style="font-weight:700;">' + esc2(s.name) + '</td>' +
        '<td>' + esc2(s.position || '-') + '</td>' +
        '<td>' + esc2(s.group || '-') + '</td>' +
        '<td style="white-space:nowrap;">' + statusCell + '</td>' +
      '</tr>'
    );
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   PANEL 3: ข้อมูล iPad
   ══════════════════════════════════════════════════════════════ */
function renderDevicesPanel() {
  return (
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">' +
        '<div class="section-divider" style="margin:0;border:none;padding:0;"><i data-lucide="tablet" style="width:16px;height:16px;"></i> รายการ iPad ทั้งหมด (' + DEVICES.length + ')</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="btn-secondary" onclick="openModal(\'modalImport\')"><i data-lucide="upload" style="width:16px;height:16px;"></i> นำเข้า CSV</button>' +
          '<button class="btn-primary" onclick="openModal(\'modalDevice\')"><i data-lucide="plus" style="width:16px;height:16px;"></i> เพิ่ม iPad</button>' +
        '</div>' +
      '</div>' +
      '<div class="ipad-search-row"><input type="text" id="deviceSearch" placeholder="ค้นหา Friendly Name / Asset / Serial Number..." oninput="renderDevicesTable()"></div>' +
      '<div class="tbl-wrap"><table class="data-table"><thead><tr>' +
        '<th>Friendly Name</th><th>Asset Number</th><th>Serial Number</th><th>สถานะ</th><th></th>' +
      '</tr></thead><tbody id="devicesTbody">' +
        '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3);">กำลังโหลด...</td></tr>' +
      '</tbody></table></div>' +
    '</div>'
  );
}

function renderDevicesTable() {
  var tbody = document.getElementById('devicesTbody');
  if (!tbody) return;
  if (!DEVICES.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3);">ยังไม่มีข้อมูล iPad — ลองนำเข้าไฟล์ CSV</td></tr>';
    return;
  }
  var q = (document.getElementById('deviceSearch') ? document.getElementById('deviceSearch').value : '').trim().toLowerCase();
  var borrowedMap = {};
  BORROWS_OUT.forEach(function(b) { borrowedMap[b.deviceId] = b; });
  var filtered = DEVICES.filter(function(d) {
    if (!q) return true;
    return ((d.friendlyName||'') + (d.assetNumber||'') + (d.serialNumber||'')).toLowerCase().indexOf(q) !== -1;
  }).sort(function(a, b) {
    return (a.assetNumber||'').localeCompare((b.assetNumber||''), 'th', { numeric: true, sensitivity: 'base' });
  });
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3);">ไม่พบข้อมูล</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(function(d) {
    var out = borrowedMap[d.id];
    var isClaim = d.condition === 'claim' && !out;
    var statusBadge = out ?
      ('<span style="font-size:11.5px;font-weight:700;color:var(--green);">' + esc2(out.studentName) + '</span><br>' +
       '<span style="font-size:11px;color:var(--green);">ห้อง ' + esc2(out.grade) + '/' + esc2(out.room) + '</span>') :
      (isClaim ? '<span class="badge-claim">ส่งเคลม</span>' : '<span class="ipad-badge-free">ว่าง</span>');
    return (
      '<tr>' +
        '<td style="font-weight:700;">' + esc2(d.friendlyName) + '</td>' +
        '<td>' + esc2(d.assetNumber) + '</td>' +
        '<td>' + esc2(d.serialNumber) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn-icon" onclick="openClaimStatusModal(\'' + d.id + '\')" title="ปรับสถานะเคลม"><i data-lucide="triangle-alert" style="width:14px;height:14px;"></i></button> ' +
          '<button class="btn-icon danger" onclick="deleteDevice(\'' + d.id + '\')" aria-label="ลบ"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
        '</td>' +
      '</tr>'
    );
  }).join('');
  lucide.createIcons();
}

function onClaimDeviceInput() {
  var input  = document.getElementById('claimDeviceInput');
  var listEl = document.getElementById('claimDeviceAcList');
  var v = input.value.trim();
  var q = v.toLowerCase();

  /* map deviceId -> รายการยืมปัจจุบัน เพื่อโชว์ว่าเครื่องไหนถูกยืมอยู่ */
  var borrowedMap = {};
  BORROWS_OUT.forEach(function(b) { borrowedMap[b.deviceId] = b; });

  var d = DEVICES.find(function(x) { return x.serialNumber === v || x.assetNumber === v; });
  var hint = document.getElementById('claimDeviceInfoHint');
  if (!d) {
    hint.innerHTML = v ? 'ไม่พบข้อมูลเครื่องนี้ในระบบ' : '';
    claimSelectedDeviceId = null;
    claimSelectedBorrow = null;
    document.getElementById('claimSwapGroup').style.display = 'none';
  } else if (d.condition === 'claim') {
    hint.innerHTML = '<span style="color:var(--red);font-weight:700;">⚠️ เครื่องนี้ถูกส่งเคลมอยู่แล้ว</span>';
    claimSelectedDeviceId = null;
    claimSelectedBorrow = null;
    document.getElementById('claimSwapGroup').style.display = 'none';
  } else {
    claimSelectedDeviceId = d.id;
    claimSelectedBorrow = borrowedMap[d.id] || null;
    if (claimSelectedBorrow) {
      hint.innerHTML = '<span style="color:var(--role-director-color);font-weight:700;">' + esc2(d.friendlyName) +
        ' — กำลังถูกยืมอยู่โดย ' + esc2(claimSelectedBorrow.studentName) + ' (ห้อง ' + esc2(claimSelectedBorrow.grade) + '/' + esc2(claimSelectedBorrow.room) + ')</span>';
      document.getElementById('claimSwapBorrowerName').textContent = claimSelectedBorrow.studentName;
      document.getElementById('claimSwapGroup').style.display = 'block';
      document.getElementById('claimSwapNo').checked = true;
      onClaimSwapChange();
    } else {
      hint.textContent = d.friendlyName + ' — ว่าง (ไม่ได้ถูกยืมอยู่)';
      document.getElementById('claimSwapGroup').style.display = 'none';
    }
  }

  var items = DEVICES.filter(function(dv) {
    if (dv.condition === 'claim') return false;
    if (!q) return true;
    return dv.serialNumber.toLowerCase().indexOf(q) !== -1 ||
           (dv.friendlyName || '').toLowerCase().indexOf(q) !== -1 ||
           (dv.assetNumber || '').toLowerCase().indexOf(q) !== -1;
  }).slice(0, 30);

  buildAcList(listEl, items, function(dv) { return dv.friendlyName; }, function(dv) {
    var bOut = borrowedMap[dv.id];
    return dv.serialNumber + (bOut ? '  ·  ยืมอยู่โดย ' + bOut.studentName : '  ·  ว่าง');
  }, function(dv) {
    input.value = dv.serialNumber;
    listEl.classList.remove('show');
    onClaimDeviceInput();
  });
}

function onClaimNewDeviceInput() {
  var input  = document.getElementById('claimNewDeviceInput');
  var listEl = document.getElementById('claimNewDeviceAcList');
  var v = input.value.trim();
  var q = v.toLowerCase();

  var borrowedMap = {};
  BORROWS_OUT.forEach(function(b) { borrowedMap[b.deviceId] = b; });

  var d = DEVICES.find(function(x) { return x.serialNumber === v || x.assetNumber === v; });
  var hint = document.getElementById('claimNewDeviceInfoHint');
  if (!d) {
    hint.innerHTML = v ? 'ไม่พบข้อมูลเครื่องนี้ในระบบ' : '';
    claimNewDeviceId = null;
  } else if (d.id === claimSelectedDeviceId || d.condition === 'claim' || borrowedMap[d.id]) {
    hint.innerHTML = '<span style="color:var(--red);font-weight:700;">⚠️ ไม่สามารถเลือกเครื่องนี้ได้ (ถูกยืม/ส่งเคลมอยู่ หรือเป็นเครื่องเดิม)</span>';
    claimNewDeviceId = null;
  } else {
    claimNewDeviceId = d.id;
    hint.textContent = d.friendlyName + ' — ว่าง พร้อมให้ยืม';
  }

  /* รายการเครื่องที่เลือกได้: ไม่ใช่เครื่องเดิมที่กำลังจะเคลม, ไม่ถูกยืมอยู่, ไม่ได้ส่งเคลมอยู่ */
  var items = DEVICES.filter(function(dv) {
    if (dv.id === claimSelectedDeviceId) return false;
    if (dv.condition === 'claim') return false;
    if (borrowedMap[dv.id]) return false;
    if (!q) return true;
    return dv.serialNumber.toLowerCase().indexOf(q) !== -1 ||
           (dv.friendlyName || '').toLowerCase().indexOf(q) !== -1 ||
           (dv.assetNumber || '').toLowerCase().indexOf(q) !== -1;
  }).slice(0, 30);

  buildAcList(listEl, items, function(dv) { return dv.friendlyName; }, function(dv) { return dv.serialNumber + '  ·  ว่าง'; }, function(dv) {
    input.value = dv.serialNumber;
    listEl.classList.remove('show');
    onClaimNewDeviceInput();
  });
}

/* ══════════════════════════════════════════════════════════════
   PANEL: ส่งเคลม — รวมเครื่องที่สถานะ condition === 'claim' ทั้งหมด
   ══════════════════════════════════════════════════════════════ */
function renderClaimsPanel() {
  return (
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">' +
        '<div class="section-divider" style="margin:0;border:none;padding:0;"><i data-lucide="triangle-alert" style="width:16px;height:16px;"></i> รายการส่งเคลม (<span id="claimsCount">0</span>)</div>' +
        '<button class="btn-primary" onclick="openClaimDeviceModal()"><i data-lucide="plus" style="width:16px;height:16px;"></i> เคลมไอแพด</button>' +
      '</div>' +
      '<div class="ipad-search-row"><input type="text" id="claimsSearch" placeholder="ค้นหา Friendly Name / Serial / รายละเอียด..." oninput="renderClaimsTable()"></div>' +
      '<div class="tbl-wrap"><table class="data-table"><thead><tr>' +
        '<th>เครื่อง</th><th>Serial</th><th>รายละเอียดปัญหา</th><th>วันที่ส่งเคลม</th><th>แจ้งโดย</th><th></th>' +
      '</tr></thead><tbody id="claimsTbody">' +
        '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text3);">กำลังโหลด...</td></tr>' +
      '</tbody></table></div>' +
    '</div>' +

    '<div class="card" style="margin-top:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">' +
        '<div class="section-divider" style="margin:0;border:none;padding:0;"><i data-lucide="cable" style="width:16px;height:16px;"></i> เคลมอุปกรณ์เสริม (<span id="accClaimsCount">0</span>)</div>' +
        '<button class="btn-primary" onclick="openAccessoryClaimModal()"><i data-lucide="plus" style="width:16px;height:16px;"></i> เพิ่มเคลมอุปกรณ์เสริม</button>' +
      '</div>' +
      '<div class="tbl-wrap"><table class="data-table"><thead><tr>' +
        '<th>อุปกรณ์เสริม</th><th>รายละเอียดปัญหา</th><th>วันที่แจ้ง</th><th>แจ้งโดย</th><th></th>' +
      '</tr></thead><tbody id="accClaimsTbody">' +
        '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3);">กำลังโหลด...</td></tr>' +
      '</tbody></table></div>' +
    '</div>'
  );
}

function renderClaimsTable() {
  var tbody = document.getElementById('claimsTbody');
  if (!tbody) return;
  var claimed = DEVICES.filter(function(d) { return d.condition === 'claim'; });
  var countEl = document.getElementById('claimsCount');
  if (countEl) countEl.textContent = claimed.length;

  var q = (document.getElementById('claimsSearch') ? document.getElementById('claimsSearch').value : '').trim().toLowerCase();
  var filtered = claimed.filter(function(d) {
    if (!q) return true;
    return ((d.friendlyName||'') + (d.serialNumber||'') + (d.claimNote||'') + (d.claimReportedBy||'')).toLowerCase().indexOf(q) !== -1;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text3);">' +
      (claimed.length ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีเครื่องที่ส่งเคลมอยู่ในขณะนี้ 🎉') + '</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function(d) {
    return (
      '<tr>' +
        '<td style="font-weight:700;">' + esc2(d.friendlyName) + '</td>' +
        '<td>' + esc2(d.serialNumber) + '</td>' +
        '<td>' + (d.claimNote ? esc2(d.claimNote) : '<span style="color:var(--text3);">— ไม่ได้ระบุ —</span>') + '</td>' +
        '<td style="white-space:nowrap;">' + (d.claimDate ? fmtDate(d.claimDate) : '-') + '</td>' +
        '<td>' + esc2(d.claimReportedBy || '-') + (d.claimUpdatedBy ? '<br><span style="font-size:10px;color:var(--text3);">บันทึกโดย ' + esc2(d.claimUpdatedBy) + '</span>' : '') + '</td>' +
        '<td><button class="btn-secondary btn-sm" onclick="openClaimStatusModal(\'' + d.id + '\')"><i data-lucide="wrench" style="width:14px;height:14px;"></i> จัดการ</button></td>' +
      '</tr>'
    );
  }).join('');
  lucide.createIcons();
}

function resolveAccessoryClaim(id) {
  if (!confirm('ปิดรายการเคลมนี้ (ลบออกจากลิสต์)?')) return;
  db.collection('ipad_accessory_claims').doc(id).delete().then(function() {
    showToast('ปิดรายการเคลมแล้ว ✅');
  }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
}

function renderAccessoryClaimsTable() {
  var tbody = document.getElementById('accClaimsTbody');
  if (!tbody) return;
  var countEl = document.getElementById('accClaimsCount');
  if (countEl) countEl.textContent = ACCESSORY_CLAIMS.length;

  if (!ACCESSORY_CLAIMS.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3);">ไม่มีอุปกรณ์เสริมที่ส่งเคลมอยู่ในขณะนี้ 🎉</td></tr>';
    return;
  }

  tbody.innerHTML = ACCESSORY_CLAIMS.map(function(c) {
    return (
      '<tr>' +
        '<td style="font-weight:700;"><span class="badge-claim">' + esc2(c.name) + '</span></td>' +
        '<td>' + (c.note ? esc2(c.note) : '<span style="color:var(--text3);">— ไม่ได้ระบุ —</span>') + '</td>' +
        '<td style="white-space:nowrap;">' + fmtDate(c.createdAt) + '</td>' +
        '<td>' + esc2(c.reportedBy || '-') + '</td>' +
        '<td><button class="btn-secondary btn-sm" onclick="resolveAccessoryClaim(\'' + c.id + '\')"><i data-lucide="check" style="width:14px;height:14px;"></i> ปิดเคลม</button></td>' +
      '</tr>'
    );
  }).join('');
  lucide.createIcons();
}


function parseCsv(text) {
  /* รองรับ field ที่ครอบด้วย double quote และมี comma อยู่ข้างในได้ */
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;
  text = text.replace(/^\uFEFF/, ''); /* ตัด BOM */
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i+1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i+1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else { field += c; }
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* ── CSV Import: นักเรียน (เลขประจำตัว / ชื่อ / นามสกุล / ชั้น / ห้อง) ── */
function _findCol(header, aliases) {
  for (var i = 0; i < header.length; i++) {
    var h = header[i].trim().toLowerCase();
    for (var j = 0; j < aliases.length; j++) {
      if (h === aliases[j]) return i;
    }
  }
  return -1;
}
function _normalizeGrade(v) {
  v = (v || '').toString().trim().replace(/\s+/g, '');
  if (/^ม\.?4$/.test(v) || v === '4') return 'ม.4';
  if (/^ม\.?5$/.test(v) || v === '5') return 'ม.5';
  if (/^ม\.?6$/.test(v) || v === '6') return 'ม.6';
  return v;
}

/* ══════════════════════════════════════════════════════════════
   PANEL 4: ประวัติทั้งหมด + Export CSV
   ══════════════════════════════════════════════════════════════ */
function renderHistoryPanel() {
  return (
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">' +
        '<input type="text" id="historySearch" placeholder="ค้นหาในหน้านี้ (เลขประจำตัว / ชื่อนักเรียน / Serial Number)" style="max-width:340px;" oninput="renderHistoryTable()">' +
        '<button class="btn-secondary" id="exportHistoryBtn" onclick="exportHistoryCsv()"><i data-lucide="download" style="width:16px;height:16px;"></i> ส่งออกเป็น CSV (ทั้งหมด)</button>' +
      '</div>' +
      '<div class="tbl-wrap"><table class="data-table history-table"><thead><tr>' +
        '<th>นักเรียน</th><th>ชั้น/ห้อง</th><th>เครื่อง (Serial)</th><th>อุปกรณ์เสริม</th><th>วันที่ยืม</th><th>วันที่คืน</th><th>สถานะ</th>' +
      '</tr></thead><tbody id="historyTbody">' +
        '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text3);">กำลังโหลด...</td></tr>' +
      '</tbody></table></div>' +
      '<div style="display:flex;justify-content:center;align-items:center;gap:14px;margin-top:16px;flex-wrap:wrap;">' +
        '<button class="btn-secondary" id="historyPrevBtn" onclick="historyPrevPage()" disabled><i data-lucide="chevron-left" style="width:14px;height:14px;"></i> หน้าก่อนหน้า</button>' +
        '<span id="historyPageInfo" style="font-size:13px;font-weight:700;color:var(--text2);">หน้า 1</span>' +
        '<button class="btn-secondary" id="historyNextBtn" onclick="historyNextPage()">หน้าถัดไป <i data-lucide="chevron-right" style="width:14px;height:14px;"></i></button>' +
      '</div>' +
    '</div>'
  );
}

function renderHistoryTable() {
  var tbody = document.getElementById('historyTbody');
  if (!tbody) return;
  var q = (document.getElementById('historySearch') ? document.getElementById('historySearch').value : '').trim().toLowerCase();
  var list = BORROWS_HISTORY.filter(function(b) {
    if (!q) return true;
    return (b.studentName  || '').toLowerCase().indexOf(q) !== -1 ||
           (b.studentIdNum || '').toLowerCase().indexOf(q) !== -1 ||
           (b.serialNumber || '').toLowerCase().indexOf(q) !== -1;
  });
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text3);">ไม่พบข้อมูล</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(b) {
    return (
      '<tr>' +
        '<td style="font-weight:700;">' + esc2(b.studentName) + (b.borrowerType === 'staff' ? '<br><span style="font-size:10px;color:var(--accent-warn);font-weight:700;">(บุคลากร)</span>' : '') + '</td>' +
        '<td>' + esc2(b.grade) + ' / ' + esc2(b.room) + '</td>' +
        '<td>' + esc2(b.friendlyName) + '<br><span style="font-size:11px;color:var(--text3);">' + esc2(b.serialNumber) + '</span></td>' +
        '<td>' + accBadges(b.accessories, b.status) + '</td>' +
        '<td>' + fmtDate(b.borrowDate) + (b.recordedBy ? '<br><span style="font-size:10px;color:var(--text3);">โดย ' + esc2(b.recordedBy) + '</span>' : '') + '</td>' +
        '<td>' + (b.status === 'in' ? (fmtDate(b.returnDate) + (b.returnedBy ? '<br><span style="font-size:10px;color:var(--text3);">โดย ' + esc2(b.returnedBy) + '</span>' : '')) : '-') + '</td>' +
        '<td>' + (b.status === 'in' ? (b.returnCondition === 'claim' ? '<span class="badge-claim">คืนแล้ว (ส่งเคลม)</span>' : '<span class="ipad-badge-free">คืนแล้ว</span>') : '<span class="ipad-badge-borrowed">ยังไม่คืน</span>') + '</td>' +
      '</tr>'
    );
  }).join('');
  lucide.createIcons();
}

/* ══════════════════════ EVENT HANDLERS ══════════════════════ */
/* ══════════════════════════════════════════════════════════════
   ปุ่มย้อนกลับไปด้านบน (ลอยมุมขวาล่าง)
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

function onIpadSubtabChange(name) {
  if (name === 'history') {
    fetchHistoryPage(historyPage || 1);   /* โหลด/รีเฟรชหน้าปัจจุบันทุกครั้งที่เปิดแท็บนี้ */
  }
}

function setBorrowFilterType(type) {
  borrowFilterType = type;
  document.getElementById('borrowFilterTypeAll').classList.toggle('active', type === 'all');
  document.getElementById('borrowFilterTypeStudent').classList.toggle('active', type === 'student');
  document.getElementById('borrowFilterTypeStaff').classList.toggle('active', type === 'staff');

  document.getElementById('borrowFilterStudentWrap').style.display = (type === 'student') ? 'flex' : 'none';
  document.getElementById('borrowFilterStaffWrap').style.display   = (type === 'staff')   ? 'flex' : 'none';

  if (type === 'student') {
    document.getElementById('borrowFilterGrade').value = 'all';
    populateBorrowFilterRoomOptions();
  } else if (type === 'staff') {
    populateBorrowFilterGroupOptions();
  }
  renderBorrowOutTable();
}

function onBorrowFilterGradeChange() {
  populateBorrowFilterRoomOptions();
  renderBorrowOutTable();
}

/* เติมตัวเลือก "ห้อง" ตามชั้นที่เลือก (ดึงจากข้อมูลนักเรียนทั้งหมด ไม่ใช่แค่คนที่ยืมอยู่
   เพื่อให้เลือกดูห้องที่ยังไม่มีใครยืมได้ด้วย) */
function populateBorrowFilterRoomOptions() {
  var sel = document.getElementById('borrowFilterRoom');
  if (!sel) return;
  var grade = document.getElementById('borrowFilterGrade').value;
  var roomsSet = {};
  STUDENTS.forEach(function(s) {
    if (grade === 'all' || s.grade === grade) roomsSet[s.room] = true;
  });
  var rooms = Object.keys(roomsSet).sort(function(a, b) { return a.localeCompare(b, 'th', { numeric: true }); });
  sel.innerHTML = '<option value="all">ทุกห้อง</option>' +
    rooms.map(function(r) { return '<option value="' + esc2(r) + '">ห้อง ' + esc2(r) + '</option>'; }).join('');
}

/* เติมตัวเลือก "กลุ่มสาระ/งาน" จากข้อมูลบุคลากรทั้งหมด */
function populateBorrowFilterGroupOptions() {
  var sel = document.getElementById('borrowFilterGroup');
  if (!sel) return;
  var groupsSet = {};
  STAFF.forEach(function(s) { groupsSet[s.group || 'ไม่ระบุ'] = true; });
  var groups = Object.keys(groupsSet).sort(function(a, b) { return a.localeCompare(b, 'th'); });
  sel.innerHTML = '<option value="all">ทุกกลุ่มสาระ/งาน</option>' +
    groups.map(function(g) { return '<option value="' + esc2(g) + '">' + esc2(g) + '</option>'; }).join('');
}

function openBorrowModal() {
  editingBorrowId = null;
  document.getElementById('borrowModalTitle').textContent = 'บันทึกการยืม iPad';
  document.getElementById('borrowModalSub').textContent = 'เลือกนักเรียนและอุปกรณ์ที่ต้องการยืม';
  document.getElementById('borrowSaveBtn').textContent = 'บันทึกการยืม';
  document.getElementById('borrowStudentInput').value = '';
  document.getElementById('borrowDeviceInput').value = '';
  document.getElementById('deviceInfoHint').textContent = '';
  document.getElementById('newStudentHint').style.display = 'none';
  document.getElementById('accCharger').checked = false;
  document.getElementById('accCable').checked = false;
  document.getElementById('accPen').checked = false;
  document.getElementById('accCase').checked = false;
  document.getElementById('accOther').value = '';
  document.getElementById('borrowDate').value = todayStr();
  document.getElementById('borrowerTypeStudent').checked = true;
  document.getElementById('borrowerTypeStudent').disabled = false;
  document.getElementById('borrowerTypeStaff').disabled = false;
  onBorrowerTypeChange();
  openModal('modalBorrow');
}

/* แก้ไขข้อมูลการยืมที่มีอยู่แล้ว (เปลี่ยนเครื่อง/อุปกรณ์เสริม/วันที่ยืมได้ — ไม่เปลี่ยนตัวผู้ยืม) */
function openEditBorrowModal(id) {
  var b = BORROWS_OUT.find(function(x) { return x.id === id; });
  if (!b) return;
  editingBorrowId = id;
  document.getElementById('borrowModalTitle').textContent = 'แก้ไขข้อมูลการยืม';
  document.getElementById('borrowModalSub').textContent = 'แก้ไขเครื่อง / อุปกรณ์เสริม / วันที่ยืม';
  document.getElementById('borrowSaveBtn').textContent = 'บันทึกการแก้ไข';
  document.getElementById('newStudentHint').style.display = 'none';

  var isStaff = b.borrowerType === 'staff';
  document.getElementById('borrowerTypeStaff').checked = isStaff;
  document.getElementById('borrowerTypeStudent').checked = !isStaff;
  /* ล็อกประเภทผู้ยืมไว้ตอนแก้ไข เพื่อไม่ให้สลับ list แล้วข้อมูลผู้ยืมเดิมหาย */
  document.getElementById('borrowerTypeStudent').disabled = true;
  document.getElementById('borrowerTypeStaff').disabled = true;
  onBorrowerTypeChange();

  document.getElementById('borrowStudentInput').value = b.studentName;
  document.getElementById('borrowDeviceInput').value = b.serialNumber;
  document.getElementById('deviceInfoHint').textContent = b.friendlyName;
  var accs = b.accessories || [];
  document.getElementById('accCharger').checked = accs.indexOf('หัวชาร์จ') !== -1;
  document.getElementById('accCable').checked  = accs.indexOf('สายชาร์จ') !== -1;
  document.getElementById('accPen').checked    = accs.indexOf('ปากกา') !== -1;
  document.getElementById('accCase').checked   = accs.indexOf('เคส') !== -1;
  var other = accs.filter(function(a){ return ACC_ORDER.indexOf(a) === -1; });
  document.getElementById('accOther').value = other.join(', ');
  document.getElementById('borrowDate').value = b.borrowDate || todayStr();

  openModal('modalBorrow');
}

function onBorrowerTypeChange() {
  var isStaff = document.getElementById('borrowerTypeStaff').checked;
  document.getElementById('borrowStudentInput').placeholder = isStaff ? 'พิมพ์ชื่อ-นามสกุลบุคลากร...' : 'พิมพ์เลขประจำตัว หรือชื่อ-นามสกุลนักเรียน...';
  document.getElementById('borrowStudentLabel').textContent = isStaff ? 'บุคลากร' : 'นักเรียน';
  document.getElementById('borrowStudentInput').value = '';
  document.getElementById('newStudentHint').style.display = 'none';
  document.getElementById('studentAcList').classList.remove('show');
}

function addNewStudentInline() {
  var studentId = document.getElementById('newStudentId').value.trim();
  var firstName = document.getElementById('newStudentFirstName').value.trim();
  var lastName  = document.getElementById('newStudentLastName').value.trim();
  var grade     = document.getElementById('newStudentGrade').value;
  var room      = document.getElementById('newStudentRoom').value.trim();
  if (!studentId || !firstName || !lastName || !room) { showToast('กรอกข้อมูลนักเรียนให้ครบ', 'warn'); return; }
  db.collection('ipad_students').add({
    studentId: studentId, firstName: firstName, lastName: lastName, grade: grade, room: room,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(ref) {
    /* sync STUDENTS local ทันที — STUDENTS ไม่ใช่ onSnapshot อีกแล้ว ต้อง
       เติมเองให้ saveBorrow() ที่ผู้ใช้จะกดต่อทันทีหาเจอ ไม่งั้นจะเจอ
       "ไม่พบนักเรียนนี้ในระบบ" ทั้งที่เพิ่งเพิ่มไปหมาดๆ */
    STUDENTS.push({ id: ref.id, studentId: studentId, firstName: firstName, lastName: lastName, grade: grade, room: room });
    showToast('เพิ่มนักเรียนแล้ว ✅');
    document.getElementById('newStudentHint').style.display = 'none';
    document.getElementById('borrowStudentInput').value = studentId + ' - ' + firstName + ' ' + lastName;
  }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
}

function saveBorrow() {
  var isStaff      = document.getElementById('borrowerTypeStaff').checked;
  var borrowerName = document.getElementById('borrowStudentInput').value.trim();
  var serial       = document.getElementById('borrowDeviceInput').value.trim();
  var borrowDate   = document.getElementById('borrowDate').value;
  var accessories  = [];
  if (document.getElementById('accCharger').checked) accessories.push('หัวชาร์จ');
  if (document.getElementById('accCable').checked) accessories.push('สายชาร์จ');
  if (document.getElementById('accPen').checked) accessories.push('ปากกา');
  if (document.getElementById('accCase').checked) accessories.push('เคส');
  var other = document.getElementById('accOther').value.trim();
  if (other) accessories.push(other);

  if (!borrowerName || !serial || !borrowDate) { showToast('กรอกข้อมูลให้ครบก่อนบันทึก', 'warn'); return; }

  var device = DEVICES.find(function(d) { return d.serialNumber === serial; });
  if (!device)  { showToast('ไม่พบ Serial Number นี้ในระบบ', 'warn'); return; }
  var conflictBorrow = BORROWS_OUT.find(function(b) { return b.deviceId === device.id && b.id !== editingBorrowId; });
  if (conflictBorrow) {
    showToast('เครื่องนี้ถูกยืมอยู่แล้ว โดย ' + conflictBorrow.studentName, 'warn'); return;
  }

  if (editingBorrowId) {
    /* แก้ไขรายการเดิม — ไม่แตะต้องข้อมูลผู้ยืม (studentId/studentName/grade/room/borrowerType) */
    var updatePayload = {
      deviceId: device.id, friendlyName: device.friendlyName, serialNumber: device.serialNumber,
      accessories: accessories,
      borrowDate: borrowDate,
      recordedBy: currentUserLabel()
    };
    db.collection('ipad_borrows').doc(editingBorrowId).update(updatePayload).then(function() {
      showToast('แก้ไขข้อมูลการยืมสำเร็จ ✅');
      closeModal('modalBorrow');
      editingBorrowId = null;
    }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
    return;
  }

  var payload = {
    deviceId: device.id, friendlyName: device.friendlyName, serialNumber: device.serialNumber,
    accessories: accessories,
    borrowDate: borrowDate,
    returnDate: null,
    status: 'out',
    createdBy: currentUser ? currentUser.email : '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    recordedBy: currentUserLabel()
  };

  if (isStaff) {
    var staffMember = STAFF.find(function(s) { return staffLabel(s) === borrowerName; });
    if (!staffMember) { showToast('ไม่พบบุคลากรนี้ในระบบ (รายชื่อบุคลากรดึงมาจากหน้าบุคลากรอัตโนมัติ)', 'warn'); return; }
    payload.borrowerType = 'staff';
    payload.studentId    = staffMember.id;
    payload.studentIdNum = '';
    payload.studentName  = staffMember.name;
    payload.grade        = staffMember.group || '-';
    payload.room         = staffMember.position || '-';
  } else {
    var student = STUDENTS.find(function(s) { return studentLabel(s) === borrowerName; });
    if (!student) { showToast('ไม่พบนักเรียนนี้ในระบบ กรุณาเพิ่มนักเรียนก่อน', 'warn'); return; }
    payload.borrowerType = 'student';
    payload.studentId    = student.id;
    payload.studentIdNum = student.studentId;
    payload.studentName  = studentFullName(student);
    payload.grade        = student.grade;
    payload.room         = student.room;
  }

  db.collection('ipad_borrows').add(payload).then(function() {
    showToast('บันทึกการยืมสำเร็จ ✅');
    closeModal('modalBorrow');
  }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
}

function openReturnModal(id) {
  var b = BORROWS_OUT.find(function(x) { return x.id === id; });
  if (!b) return;
  currentReturnBorrowId = id;
  document.getElementById('returnModalSub').textContent = b.studentName + ' — ' + b.friendlyName + ' (' + b.serialNumber + ')';
  var accs = b.accessories || [];
  var html = buildReturnRow('retDevice', 'tablet-smartphone', 'เครื่อง iPad', b.serialNumber);
  html += accs.map(function(name, i) {
    var icon = RETURN_ACC_ICONS[name] || 'package';
    return buildReturnRow('retAcc_' + i, icon, name, null);
  }).join('');
  if (!accs.length) html += '<p style="font-size:12px;color:var(--text3);">(ไม่มีอุปกรณ์เสริมที่ยืมเพิ่ม)</p>';
  document.getElementById('returnItemsList').innerHTML = html;
  document.getElementById('returnClaimNote').value = '';
  document.getElementById('returnClaimNoteGroup').style.display = 'none';
  openModal('modalReturn');
  lucide.createIcons();
}

/* อัปเดตสีพื้นหลังการ์ดตามสถานะที่เลือก + โชว์/ซ่อนช่องกรอกรายละเอียดปัญหา */
function onReturnRowChange(radioName) {
  var checked = document.querySelector('input[name="' + radioName + '"]:checked');
  var row = document.getElementById('row_' + radioName);
  if (row && checked) row.setAttribute('data-state', checked.value);

  var anyClaim = false;
  document.querySelectorAll('#returnItemsList .return-row').forEach(function(r) {
    if (r.getAttribute('data-state') === 'claim') anyClaim = true;
  });
  document.getElementById('returnClaimNoteGroup').style.display = anyClaim ? 'block' : 'none';
}

function confirmReturn() {
  var b = BORROWS_OUT.find(function(x) { return x.id === currentReturnBorrowId; });
  if (!b) { closeModal('modalReturn'); return; }

  var deviceState = getReturnRowState('retDevice');
  var deviceReturned = deviceState !== 'none';
  var condition = deviceState === 'claim' ? 'claim' : 'ok';
  var claimNote = document.getElementById('returnClaimNote').value.trim();

  var allAccs = b.accessories || [];
  var checkedAccs = [], claimedAccs = [], remainingAccs = [];
  allAccs.forEach(function(name, i) {
    var state = getReturnRowState('retAcc_' + i);
    if (state === 'none') { remainingAccs.push(name); return; }
    checkedAccs.push(name);
    if (state === 'claim') claimedAccs.push(name);
  });

  if (!deviceReturned && !checkedAccs.length) {
    showToast('กรุณาเลือกอย่างน้อย 1 รายการที่จะคืน', 'warn'); return;
  }

  var updates = { accessories: remainingAccs };
  if (deviceReturned) {
    updates.status = 'in';
    updates.returnDate = todayStr();
    updates.returnCondition = condition;
    updates.claimNote = condition === 'claim' ? claimNote : '';
    updates.returnedBy = currentUserLabel();
  }

  db.collection('ipad_borrows').doc(b.id).update(updates).then(function() {
    showToast(deviceReturned ? 'บันทึกการคืนเครื่องแล้ว ✅' : 'บันทึกการคืนอุปกรณ์เสริมแล้ว ✅');
    closeModal('modalReturn');
    /* อัปเดตสถานะเครื่อง (ว่าง/ส่งเคลม) แยกเป็นอีกคำขอหนึ่ง — ไม่ให้ล้มทั้งการคืน
       ถ้า Firestore rules ยังไม่อนุญาตให้แก้ไข field 'condition' ในคอลเลกชัน ipad_devices */
    if (deviceReturned) {
      var deviceUpdates = { condition: condition };
      if (condition === 'claim') {
        deviceUpdates.claimNote = claimNote;
        deviceUpdates.claimDate = todayStr();
        deviceUpdates.claimReportedBy = b.studentName;
        deviceUpdates.claimUpdatedBy = currentUserLabel();
      } else {
        deviceUpdates.claimNote = firebase.firestore.FieldValue.delete();
        deviceUpdates.claimDate = firebase.firestore.FieldValue.delete();
        deviceUpdates.claimReportedBy = firebase.firestore.FieldValue.delete();
        deviceUpdates.claimUpdatedBy = firebase.firestore.FieldValue.delete();
      }
      db.collection('ipad_devices').doc(b.deviceId).update(deviceUpdates).catch(function(e) {
        showToast('บันทึกการคืนสำเร็จ แต่ตั้งสถานะเครื่องไม่สำเร็จ (' + e.message + ') — กรุณาตรวจสอบสิทธิ์การเขียนคอลเลกชัน ipad_devices ใน Firestore Rules', 'warn');
      });
    }
    /* สร้างรายการเคลมอุปกรณ์เสริมอัตโนมัติ ให้ชิ้นที่เลือก "ชำรุด" ตอนคืน ไปโผล่ในหน้าส่งเคลมทันที */
    claimedAccs.forEach(function(name) {
      db.collection('ipad_accessory_claims').add({
        name: name,
        note: claimNote,
        reportedBy: b.studentName,
        recordedBy: currentUserLabel(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function(e) {
        showToast('บันทึกเคลม ' + name + ' ไม่สำเร็จ: ' + e.message, 'warn');
      });
    });
  }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
}

function filterStudents(grade, btn) {
  studentFilterGrade = grade;
  studentFilterRoom = 'all';
  document.querySelectorAll('#studentTableFilterWrap .filter-pill').forEach(function(el) { el.classList.remove('active'); });
  btn.classList.add('active');
  refreshStudentRoomFilterOptions();
  renderStudentsTable();
}

function onStudentRoomFilterChange() {
  studentFilterRoom = document.getElementById('studentRoomFilter').value;
  renderStudentsTable();
}

function openAddStudentModal() {
  editingStudentId = null;
  document.getElementById('studentModalTitle').textContent = 'เพิ่มนักเรียน';
  document.getElementById('studentSaveBtn').textContent = 'บันทึก';
  document.getElementById('stuId').value = '';
  document.getElementById('stuId').disabled = false;
  document.getElementById('stuIdLockHint').style.display = 'none';
  document.getElementById('stuFirstName').value = '';
  document.getElementById('stuLastName').value = '';
  document.getElementById('stuGrade').value = 'ม.4';
  document.getElementById('stuRoom').value = '';
  openModal('modalStudent');
}

function openEditStudentModal(id) {
  var s = STUDENTS.find(function(x) { return x.id === id; });
  if (!s) return;
  editingStudentId = id;
  document.getElementById('studentModalTitle').textContent = 'แก้ไขข้อมูลนักเรียน';
  document.getElementById('studentSaveBtn').textContent = 'บันทึกการแก้ไข';
  document.getElementById('stuId').value = s.studentId || '';
  document.getElementById('stuId').disabled = true; /* เลขประจำตัวใช้อ้างอิงในระบบ ห้ามแก้ */
  document.getElementById('stuIdLockHint').style.display = 'block';
  document.getElementById('stuFirstName').value = s.firstName || '';
  document.getElementById('stuLastName').value = s.lastName || '';
  document.getElementById('stuGrade').value = s.grade || 'ม.4';
  document.getElementById('stuRoom').value = s.room || '';
  openModal('modalStudent');
}

function saveStudent() {
  var studentId = document.getElementById('stuId').value.trim();
  var firstName = document.getElementById('stuFirstName').value.trim();
  var lastName  = document.getElementById('stuLastName').value.trim();
  var grade     = document.getElementById('stuGrade').value;
  var room      = document.getElementById('stuRoom').value.trim();
  if (!studentId || !firstName || !lastName || !room) { showToast('กรอกข้อมูลให้ครบ', 'warn'); return; }

  if (editingStudentId) {
    /* โหมดแก้ไข: อัปเดตชื่อ/นามสกุล/ชั้น/ห้อง (เลขประจำตัวถูกล็อคไว้ไม่ให้แก้) */
    db.collection('ipad_students').doc(editingStudentId).update({
      firstName: firstName, lastName: lastName, grade: grade, room: room
    }).then(function() {
      /* sync STUDENTS local — ไม่มี onSnapshot คอยอัปเดตให้แล้ว */
      var s = STUDENTS.find(function(x) { return x.id === editingStudentId; });
      if (s) { s.firstName = firstName; s.lastName = lastName; s.grade = grade; s.room = room; }
      _onStudentsChanged();
      showToast('แก้ไขข้อมูลนักเรียนสำเร็จ ✅');
      closeModal('modalStudent');
      editingStudentId = null;
    }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
    return;
  }

  if (STUDENTS.some(function(s) { return s.studentId === studentId; })) {
    showToast('เลขประจำตัวนี้มีอยู่แล้วในระบบ', 'warn'); return;
  }
  db.collection('ipad_students').add({
    studentId: studentId, firstName: firstName, lastName: lastName, grade: grade, room: room,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(ref) {
    /* sync STUDENTS local */
    STUDENTS.push({ id: ref.id, studentId: studentId, firstName: firstName, lastName: lastName, grade: grade, room: room });
    _onStudentsChanged();
    showToast('เพิ่มนักเรียนสำเร็จ ✅');
    closeModal('modalStudent');
    document.getElementById('stuId').value = '';
    document.getElementById('stuFirstName').value = '';
    document.getElementById('stuLastName').value = '';
    document.getElementById('stuRoom').value = '';
  }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
}

function deleteStudent(id) {
  if (!confirm('ลบนักเรียนคนนี้ออกจากระบบ?')) return;
  db.collection('ipad_students').doc(id).delete()
    .then(function() {
      /* sync STUDENTS local */
      STUDENTS = STUDENTS.filter(function(s) { return s.id !== id; });
      _onStudentsChanged();
      showToast('ลบแล้ว');
    })
    .catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
}

function saveDevice() {
  var friendlyName = document.getElementById('devFriendly').value.trim();
  var assetNumber  = document.getElementById('devAsset').value.trim();
  var serialNumber = document.getElementById('devSerial').value.trim();
  if (!friendlyName || !serialNumber) { showToast('กรอก Friendly Name และ Serial Number', 'warn'); return; }
  if (DEVICES.some(function(d) { return d.serialNumber === serialNumber; })) {
    showToast('Serial Number นี้มีอยู่แล้วในระบบ', 'warn'); return;
  }
  db.collection('ipad_devices').add({
    friendlyName: friendlyName, assetNumber: assetNumber, serialNumber: serialNumber,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    showToast('เพิ่ม iPad สำเร็จ ✅');
    closeModal('modalDevice');
    document.getElementById('devFriendly').value = '';
    document.getElementById('devAsset').value = '';
    document.getElementById('devSerial').value = '';
  }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
}

function deleteDevice(id) {
  if (!confirm('ลบ iPad เครื่องนี้ออกจากระบบ?')) return;
  db.collection('ipad_devices').doc(id).delete()
    .then(function() { showToast('ลบแล้ว'); })
    .catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
}

function openClaimStatusModal(deviceId) {
  var d = DEVICES.find(function(x) { return x.id === deviceId; });
  if (!d) return;
  currentClaimDeviceId = deviceId;
  document.getElementById('claimStatusSub').textContent = d.friendlyName + ' (' + d.serialNumber + ')';
  var isClaim = d.condition === 'claim';
  document.getElementById('claimStatusOk').checked = !isClaim;
  document.getElementById('claimStatusClaim').checked = isClaim;
  document.getElementById('claimStatusNote').value = d.claimNote || '';
  document.getElementById('claimStatusNoteGroup').style.display = isClaim ? 'block' : 'none';
  openModal('modalClaimStatus');
}

function onClaimStatusChange() {
  var isClaim = document.getElementById('claimStatusClaim').checked;
  document.getElementById('claimStatusNoteGroup').style.display = isClaim ? 'block' : 'none';
}

function saveClaimStatus() {
  if (!currentClaimDeviceId) return;
  var isClaim = document.getElementById('claimStatusClaim').checked;
  var note = document.getElementById('claimStatusNote').value.trim();
  var updates = { condition: isClaim ? 'claim' : 'ok' };
  if (isClaim) {
    updates.claimNote = note;
    updates.claimDate = todayStr();
    updates.claimUpdatedBy = currentUserLabel();
  } else {
    updates.claimNote        = firebase.firestore.FieldValue.delete();
    updates.claimDate        = firebase.firestore.FieldValue.delete();
    updates.claimReportedBy  = firebase.firestore.FieldValue.delete();
    updates.claimUpdatedBy   = firebase.firestore.FieldValue.delete();
  }
  db.collection('ipad_devices').doc(currentClaimDeviceId).update(updates).then(function() {
    showToast('ปรับสถานะเรียบร้อย ✅');
    closeModal('modalClaimStatus');
  }).catch(function(e) {
    showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  });
}

function openClaimDeviceModal() {
  claimSelectedDeviceId = null;
  claimSelectedBorrow   = null;
  claimNewDeviceId      = null;
  document.getElementById('claimDeviceInput').value = '';
  document.getElementById('claimDeviceInfoHint').textContent = '';
  document.getElementById('claimDeviceNote').value = '';
  document.getElementById('claimSwapGroup').style.display = 'none';
  document.getElementById('claimSwapNo').checked = true;
  document.getElementById('claimNewDeviceGroup').style.display = 'none';
  document.getElementById('claimNewDeviceInput').value = '';
  document.getElementById('claimNewDeviceInfoHint').textContent = '';
  openModal('modalClaimDevice');
}

function onClaimSwapChange() {
  var wantsSwap = document.getElementById('claimSwapYes').checked;
  document.getElementById('claimNewDeviceGroup').style.display = wantsSwap ? 'block' : 'none';
  if (!wantsSwap) {
    claimNewDeviceId = null;
    document.getElementById('claimNewDeviceInput').value = '';
    document.getElementById('claimNewDeviceInfoHint').textContent = '';
  }
}

function saveClaimDevice() {
  if (!claimSelectedDeviceId) { showToast('กรุณาเลือกเครื่องที่ต้องการส่งเคลมก่อน', 'warn'); return; }
  var device = DEVICES.find(function(d) { return d.id === claimSelectedDeviceId; });
  if (!device) { showToast('ไม่พบข้อมูลเครื่องนี้ในระบบ', 'warn'); return; }

  var note = document.getElementById('claimDeviceNote').value.trim();
  var wantsSwap = claimSelectedBorrow && document.getElementById('claimSwapYes').checked;

  if (wantsSwap && !claimNewDeviceId) {
    showToast('กรุณาเลือกเครื่องใหม่ให้ผู้ยืม หรือเลือก "ไม่เปลี่ยนเครื่อง"', 'warn');
    return;
  }

  var claimUpdates = {
    condition: 'claim',
    claimNote: note,
    claimDate: todayStr(),
    claimReportedBy: claimSelectedBorrow ? claimSelectedBorrow.studentName : currentUserLabel(),
    claimUpdatedBy: currentUserLabel()
  };

  var chain = db.collection('ipad_devices').doc(claimSelectedDeviceId).update(claimUpdates);

  if (wantsSwap) {
    var newDevice = DEVICES.find(function(d) { return d.id === claimNewDeviceId; });
    if (!newDevice) { showToast('ไม่พบข้อมูลเครื่องใหม่ที่เลือก', 'warn'); return; }
    chain = chain.then(function() {
      return db.collection('ipad_borrows').doc(claimSelectedBorrow.id).update({
        deviceId: newDevice.id,
        friendlyName: newDevice.friendlyName,
        serialNumber: newDevice.serialNumber,
        recordedBy: currentUserLabel()
      });
    });
  }

  chain.then(function() {
    showToast(wantsSwap ? 'ส่งเคลมและเปลี่ยนเครื่องให้ผู้ยืมสำเร็จ ✅' : 'บันทึกการส่งเคลมสำเร็จ ✅');
    closeModal('modalClaimDevice');
  }).catch(function(e) {
    showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  });
}

/* ══════════════════════════════════════════════════════════════
   เคลมอุปกรณ์เสริม — ไม่มีรหัสอ้างอิง เก็บแค่ชื่ออุปกรณ์เสริม + รายละเอียด
   ══════════════════════════════════════════════════════════════ */
function openAccessoryClaimModal() {
  document.getElementById('accClaimName').value = 'หัวชาร์จ';
  document.getElementById('accClaimNameOther').value = '';
  document.getElementById('accClaimNameOther').style.display = 'none';
  document.getElementById('accClaimNote').value = '';
  openModal('modalAccessoryClaim');
}

function onAccClaimNameChange() {
  var isOther = document.getElementById('accClaimName').value === 'อื่นๆ';
  document.getElementById('accClaimNameOther').style.display = isOther ? 'block' : 'none';
}

function saveAccessoryClaim() {
  var selected = document.getElementById('accClaimName').value;
  var name = selected === 'อื่นๆ' ? document.getElementById('accClaimNameOther').value.trim() : selected;
  var note = document.getElementById('accClaimNote').value.trim();
  if (!name) { showToast('กรุณาระบุชื่ออุปกรณ์เสริม', 'warn'); return; }

  db.collection('ipad_accessory_claims').add({
    name: name,
    note: note,
    reportedBy: currentUserLabel(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    showToast('บันทึกเคลมอุปกรณ์เสริมแล้ว ✅');
    closeModal('modalAccessoryClaim');
  }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
}

function handleCsvFile(evt) {
  var file = evt.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var rows = parseCsv(e.target.result);
    if (!rows.length) { showToast('อ่านไฟล์ไม่สำเร็จ', 'error'); return; }
    var header = rows[0].map(function(h) { return h.trim(); });
    var idxFriendly = header.indexOf('Friendly Name');
    var idxAsset    = header.indexOf('Asset Number');
    var idxSerial   = header.indexOf('Serial Number');
    if (idxFriendly === -1 || idxSerial === -1) {
      showToast('ไม่พบคอลัมน์ Friendly Name / Serial Number ในไฟล์นี้', 'error');
      return;
    }
    var existingSerials = {};
    DEVICES.forEach(function(d) { existingSerials[d.serialNumber] = true; });

    parsedCsvRows = [];
    var seen = {};
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !r.length) continue;
      var serial = (r[idxSerial] || '').trim();
      if (!serial || seen[serial]) continue;
      seen[serial] = true;
      parsedCsvRows.push({
        friendlyName: (r[idxFriendly] || '').trim(),
        assetNumber:  idxAsset !== -1 ? (r[idxAsset] || '').trim() : '',
        serialNumber: serial,
        isNew: !existingSerials[serial]
      });
    }
    var newCount = parsedCsvRows.filter(function(x) { return x.isNew; }).length;
    document.getElementById('importPreview').innerHTML =
      'พบเครื่องทั้งหมด <b>' + parsedCsvRows.length + '</b> รายการในไฟล์ — ' +
      '<span style="color:var(--green-deep);font-weight:700;">' + newCount + ' รายการใหม่</span> จะถูกเพิ่มเข้าระบบ ' +
      '(รายการที่มี Serial Number ซ้ำกับที่มีอยู่แล้วจะถูกข้าม)';
    document.getElementById('importConfirmBtn').disabled = (newCount === 0);
  };
  reader.readAsText(file, 'UTF-8');
}

function confirmImport() {
  var toAdd = parsedCsvRows.filter(function(x) { return x.isNew; });
  if (!toAdd.length) return;
  var btn = document.getElementById('importConfirmBtn');
  btn.disabled = true; btn.textContent = 'กำลังนำเข้า...';

  var batchSize = 400; /* Firestore batch limit 500 */
  var batches = [];
  for (var i = 0; i < toAdd.length; i += batchSize) batches.push(toAdd.slice(i, i + batchSize));

  var chain = Promise.resolve();
  batches.forEach(function(chunk) {
    chain = chain.then(function() {
      var batch = db.batch();
      chunk.forEach(function(d) {
        var ref = db.collection('ipad_devices').doc();
        batch.set(ref, {
          friendlyName: d.friendlyName, assetNumber: d.assetNumber, serialNumber: d.serialNumber,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      return batch.commit();
    });
  });

  chain.then(function() {
    showToast('นำเข้าข้อมูลสำเร็จ ✅ (' + toAdd.length + ' รายการ)');
    closeModal('modalImport');
    document.getElementById('importPreview').innerHTML = '';
    document.getElementById('csvFileInput').value = '';
    btn.textContent = 'นำเข้าข้อมูล'; btn.disabled = true;
    parsedCsvRows = [];
  }).catch(function(e) {
    showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    btn.textContent = 'นำเข้าข้อมูล'; btn.disabled = false;
  });
}

function downloadStudentCsvTemplate() {
  var csvContent = '\uFEFF' + 'เลขประจำตัว,ชื่อ,นามสกุล,ชั้น,ห้อง\r\n' + '12345,สมชาย,ใจดี,ม.4,1\r\n';
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'student-import-template.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleStudentCsvFile(evt) {
  var file = evt.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var rows = parseCsv(e.target.result);
    if (!rows.length) { showToast('อ่านไฟล์ไม่สำเร็จ', 'error'); return; }
    var header = rows[0];
    var idxId    = _findCol(header, ['เลขประจำตัว','เลขประจำตัวนักเรียน','studentid','student_id','id']);
    var idxFirst = _findCol(header, ['ชื่อ','firstname','first_name','ชื่อจริง']);
    var idxLast  = _findCol(header, ['นามสกุล','lastname','last_name']);
    var idxGrade = _findCol(header, ['ชั้น','grade','class']);
    var idxRoom  = _findCol(header, ['ห้อง','room']);

    if (idxId === -1 || idxFirst === -1 || idxLast === -1 || idxGrade === -1 || idxRoom === -1) {
      showToast('ไม่พบคอลัมน์ครบตามที่ต้องการ (เลขประจำตัว/ชื่อ/นามสกุล/ชั้น/ห้อง) — ลองดาวน์โหลดไฟล์ตัวอย่าง', 'error');
      return;
    }

    var existingIds = {};
    STUDENTS.forEach(function(s) { existingIds[s.studentId] = true; });

    parsedStudentCsvRows = [];
    var seen = {};
    var skippedInvalidGrade = 0;
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !r.length) continue;
      var sid = (r[idxId] || '').trim();
      if (!sid || seen[sid]) continue;
      var grade = _normalizeGrade(r[idxGrade]);
      if (['ม.4','ม.5','ม.6'].indexOf(grade) === -1) { skippedInvalidGrade++; continue; }
      seen[sid] = true;
      parsedStudentCsvRows.push({
        studentId: sid,
        firstName: (r[idxFirst] || '').trim(),
        lastName:  (r[idxLast]  || '').trim(),
        grade: grade,
        room: (r[idxRoom] || '').trim(),
        isNew: !existingIds[sid]
      });
    }
    var newCount = parsedStudentCsvRows.filter(function(x) { return x.isNew; }).length;
    document.getElementById('importStudentPreview').innerHTML =
      'พบนักเรียนทั้งหมด <b>' + parsedStudentCsvRows.length + '</b> รายการในไฟล์ — ' +
      '<span style="color:var(--green-deep);font-weight:700;">' + newCount + ' รายการใหม่</span> จะถูกเพิ่มเข้าระบบ ' +
      '(รายการที่มีเลขประจำตัวซ้ำกับที่มีอยู่แล้วจะถูกข้าม' +
      (skippedInvalidGrade ? ', ' + skippedInvalidGrade + ' แถวถูกข้ามเพราะชั้นไม่ถูกต้อง' : '') + ')';
    document.getElementById('importStudentConfirmBtn').disabled = (newCount === 0);
  };
  reader.readAsText(file, 'UTF-8');
}

function confirmStudentImport() {
  var toAdd = parsedStudentCsvRows.filter(function(x) { return x.isNew; });
  if (!toAdd.length) return;
  var btn = document.getElementById('importStudentConfirmBtn');
  btn.disabled = true; btn.textContent = 'กำลังนำเข้า...';

  var batchSize = 400;
  var batches = [];
  for (var i = 0; i < toAdd.length; i += batchSize) batches.push(toAdd.slice(i, i + batchSize));

  var addedLocally = [];   /* เก็บไว้ sync เข้า STUDENTS local หลัง commit สำเร็จ */
  var chain = Promise.resolve();
  batches.forEach(function(chunk) {
    chain = chain.then(function() {
      var batch = db.batch();
      chunk.forEach(function(s) {
        var ref = db.collection('ipad_students').doc();
        batch.set(ref, {
          studentId: s.studentId, firstName: s.firstName, lastName: s.lastName, grade: s.grade, room: s.room,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        /* ref.id ถูกสร้างฝั่ง client ทันทีตั้งแต่เรียก .doc() ไม่ต้องรอ commit
           เก็บไว้เติม STUDENTS local ได้เลย ไม่ต้อง re-fetch ทั้ง collection */
        addedLocally.push({ id: ref.id, studentId: s.studentId, firstName: s.firstName, lastName: s.lastName, grade: s.grade, room: s.room });
      });
      return batch.commit();
    });
  });

  chain.then(function() {
    /* sync STUDENTS local ทั้งหมดทีเดียว */
    Array.prototype.push.apply(STUDENTS, addedLocally);
    _onStudentsChanged();
    showToast('นำเข้ารายชื่อนักเรียนสำเร็จ ✅ (' + toAdd.length + ' รายการ)');
    closeModal('modalImportStudents');
    document.getElementById('importStudentPreview').innerHTML = '';
    document.getElementById('csvStudentFileInput').value = '';
    btn.textContent = 'นำเข้าข้อมูล'; btn.disabled = true;
    parsedStudentCsvRows = [];
  }).catch(function(e) {
    showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    btn.textContent = 'นำเข้าข้อมูล'; btn.disabled = false;
  });
}

function exportHistoryCsv() {
  var btn = document.getElementById('exportHistoryBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" style="width:16px;height:16px;"></i> กำลังดึงข้อมูลทั้งหมด...';
    lucide.createIcons();
  }

  /* ส่งออกดึงข้อมูล "ทั้งหมด" แบบครั้งเดียวตอนผู้ใช้กดปุ่มจริงๆ เท่านั้น
     (ไม่ได้โหลดค้างไว้ตลอดเวลาเหมือนเดิม จึงไม่กระทบความเร็วตอนเปิดหน้าเว็บ) */
  db.collection('ipad_borrows').orderBy('createdAt', 'desc').get().then(function(snap) {
    var all = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    if (!all.length) { showToast('ยังไม่มีข้อมูลให้ส่งออก', 'warn'); return; }

    var header = ['เลขประจำตัว','ชื่อนักเรียน','ชั้น','ห้อง','Friendly Name','Serial Number','อุปกรณ์เสริม','วันที่ยืม','วันที่คืน','สถานะ'];
    function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var lines = [header.map(csvCell).join(',')];
    all.forEach(function(b) {
      lines.push([
        b.studentIdNum, b.studentName, b.grade, b.room, b.friendlyName, b.serialNumber,
        (b.accessories || []).join('; '), b.borrowDate || '',
        b.status === 'in' ? (b.returnDate || '') : '',
        b.status === 'in' ? 'คืนแล้ว' : 'ยังไม่คืน'
      ].map(csvCell).join(','));
    });
    var csvContent = '\uFEFF' + lines.join('\r\n');
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'ipad-lending-history-' + todayStr() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }).catch(function(e) {
    showToast('ส่งออกข้อมูลผิดพลาด: ' + e.message, 'error');
  }).then(function() {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="download" style="width:16px;height:16px;"></i> ส่งออกเป็น CSV (ทั้งหมด)';
      lucide.createIcons();
    }
  });
}

function historyNextPage() { if (historyHasNext) fetchHistoryPage(historyPage + 1); }
function historyPrevPage() { if (historyPage > 1) fetchHistoryPage(historyPage - 1); }

function updateHistoryPagerUI() {
  var info    = document.getElementById('historyPageInfo');
  var prevBtn = document.getElementById('historyPrevBtn');
  var nextBtn = document.getElementById('historyNextBtn');
  if (info)    info.textContent = 'หน้า ' + historyPage + ' (' + BORROWS_HISTORY.length + ' รายการ)';
  if (prevBtn) prevBtn.disabled = historyPage <= 1;
  if (nextBtn) nextBtn.disabled = !historyHasNext;
}

/* ══════════════════════ INIT ══════════════════════ */
/* ══════════════════════════════════════════════════════════════
   Auth guard + shell
   ══════════════════════════════════════════════════════════════ */
buildPage({
  appId:        'myApp',
  navSubtitle:  'ระบบยืม-คืน iPad',
  navTheme:     'dark',
  activePage:   'ipad-lending',
  requireAdmin: 'ipad',    /* เฉพาะแอดมินที่มีสิทธิ์ permissions.ipad == true (หรือ SuperAdmin) เท่านั้นที่เข้าได้ */

  onAuth: function(user, contentEl) {
    currentUser = user;
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);

    contentEl.innerHTML = renderPage();
    lucide.createIcons();

    ipadSubtabs = initSubtabs('ipadSubtabBar', { onChange: onIpadSubtabChange });

    document.getElementById('borrowDate').value = todayStr();
    loadStudents();
    loadStaff();
    loadDevices();
    loadActiveBorrows();
    loadAccessoryClaims();
    setupScrollTopButton();
  }
});



