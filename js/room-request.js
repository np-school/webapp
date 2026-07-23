/* ══════════════════════ STATE ══════════════════════ */
/* ══ Page State ══ */
var currentUser = null;
var allBookings = [], allRooms = [];
var viewYear = new Date().getFullYear(), viewMonth = new Date().getMonth();
var selectedDate = new Date().toISOString().split('T')[0];
var selectedFile = null, selectedFileDataURL = null, selectedFileBlob = null;
var activeRoomFilter = 'all';
var bookingPage = 0;
var PAGE_SIZE = 20;

/* ══════════════════════════════════════════════════════════════
   Multi-Date Picker
   ══════════════════════════════════════════════════════════════ */
var mdpYear = new Date().getFullYear(), mdpMonth = new Date().getMonth();
var selectedDates = [];

/* ══ Time Slots ══ */
var TIME_SLOTS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
var timeMode = 'range', rangeStart = -1, rangeEnd = -1;
var blockedSlots = [], editingBookingId = null;

/* ══ Room Color (from common.js fallback local copy) ══ */
var ROOM_PASTEL_MAP = {
  'ห้องประชุมชวนชม'  : {bg:'#dbeafe',text:'#1e3a8a',border:'#93c5fd',accent:'var(--c-sky-deep)'},
  'หอประชุมพุทธรักษา': {bg:'#fef3c7',text:'#78350f',border:'#fcd34d',accent:'var(--c-amber-deep)'},
  'สนามกีฬากลาง'    : {bg:'#d1fae5',text:'#064e3b',border:'#6ee7b7',accent:'var(--c-green-deep)'},
  'ห้องประชุมราชพฤกษ์': {bg:'#fce7f3',text:'#831843',border:'#f9a8d4',accent:'#db2777'},
  'โดมอเนกประสงค์'  : {bg:'#ffedd5',text:'#7c2d12',border:'#fdba74',accent:'var(--c-amber)'},
  'ห้องประชุมปาริชาต' : {bg:'#ede9fe',text:'#4c1d95',border:'#c4b5fd',accent:'#7c3aed'},
  'ห้องประชุมชวนชน'  : {bg:'#e0f2fe',text:'#0c4a6e',border:'#7dd3fc',accent:'#0284c7'}
};
var ROOM_PASTEL_FALLBACK = [
  {bg:'#dbeafe',text:'#1e3a8a',border:'#93c5fd',accent:'var(--c-sky-deep)'},
  {bg:'#d1fae5',text:'#064e3b',border:'#6ee7b7',accent:'var(--c-green-deep)'},
  {bg:'#ede9fe',text:'#4c1d95',border:'#c4b5fd',accent:'#7c3aed'},
  {bg:'#fce7f3',text:'#831843',border:'#f9a8d4',accent:'#db2777'},
  {bg:'#ffedd5',text:'#7c2d12',border:'#fdba74',accent:'var(--c-amber)'},
  {bg:'#fef3c7',text:'#78350f',border:'#fcd34d',accent:'var(--c-amber-deep)'},
  {bg:'#e0f2fe',text:'#0c4a6e',border:'#7dd3fc',accent:'#0284c7'},
  {bg:'#fdf4ff',text:'#581c87',border:'#e9d5ff',accent:'#9333ea'}
];

/* ══ Name alias ══ */
var ROOM_NAME_ALIAS = {'ห้องประชุมปาริชาติ': 'ห้องประชุมปาริชาต'};

/* ══════════════════════ DATA LOADING ══════════════════════ */
function initData() {
  function safeRun(fn, lbl) { try { fn(); } catch(e) { console.error(lbl + ':', e); } }

  /* ── Rooms ── */
  /* onSnapshot ทำงานเหมือน get() ในการยิงครั้งแรกอยู่แล้ว ไม่ต้องเรียก get() ซ้ำ */
  db.collection('rooms').onSnapshot(function(snap) {
    allRooms = [];
    snap.forEach(function(d) {
      var rm = Object.assign({id: d.id}, d.data());
      rm.name = normalizeRoomName(rm.name || '');
      allRooms.push(rm);
    });
    allRooms.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
    safeRun(renderRoomTabs,   'rt-tabs');
    safeRun(renderRoomBanner, 'rt-banner');
    safeRun(renderRoomStats,  'rt-stats');
    safeRun(function() { lucide.createIcons(); }, 'lucide');
  }, function(e) {
    console.error('rooms onSnapshot:', e);
    showToast('โหลดข้อมูลห้องไม่สำเร็จ: ' + (e.message || e.code || 'unknown error'), 'error');
  });

  /* ── Bookings ── */
  db.collection('bookings').onSnapshot(function(snap) {
    safeRun(function() { processBookings(snap); }, 'rt');
  }, function(e) {
    console.error('bookings onSnapshot:', e);
    showToast('โหลดข้อมูลการจองไม่สำเร็จ: ' + (e.message || e.code || 'unknown error'), 'error');
    var tbody = document.getElementById('mainBookingTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--red-bright);padding:40px;">โหลดข้อมูลไม่สำเร็จ — กรุณาตรวจสอบการเชื่อมต่อหรือสิทธิ์การเข้าถึง</td></tr>';
  });
}

/* ══════════════════════ RENDER ══════════════════════ */
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

function mdpDateStr(y, m, d) { return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
function mdpToday()          { return new Date().toISOString().split('T')[0]; }

function mdpRender() {
  var today = mdpToday();
  var months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  document.getElementById('mdpMonthLabel').textContent = months[mdpMonth] + ' ' + (mdpYear + 543);
  var first = new Date(mdpYear, mdpMonth, 1).getDay();
  var daysInMonth = new Date(mdpYear, mdpMonth + 1, 0).getDate();
  var daysInPrev  = new Date(mdpYear, mdpMonth, 0).getDate();
  var room = document.getElementById('roomSelect').value;
  var bookedDates = {};
  if (room) {
    allBookings.forEach(function(b) {
      if (b.status === 'rejected') return;
      if (b.room !== room || !b.date) return;
      var p = b.date.split('-');
      if (parseInt(p[0]) === mdpYear && parseInt(p[1]) - 1 === mdpMonth) bookedDates[b.date] = true;
    });
  }
  var grid = document.getElementById('mdpDays');
  grid.innerHTML = '';
  /* empty cells before first day */
  for (var i = 0; i < first; i++) {
    var e = document.createElement('div');
    e.style.cssText = 'aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border-radius:7px;color:var(--border-mid);';
    e.textContent = daysInPrev - first + i + 1;
    grid.appendChild(e);
  }
  /* actual days */
  for (var d = 1; d <= daysInMonth; d++) {
    var ds = mdpDateStr(mdpYear, mdpMonth, d);
    var isPast = ds < today;
    var isSel  = selectedDates.indexOf(ds) !== -1;
    var isBk   = !!bookedDates[ds];
    var el = document.createElement('div');
    el.style.cssText = 'aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border-radius:7px;cursor:pointer;border:1px solid transparent;transition:all .12s;position:relative;';
    if (isPast)    { el.style.color = 'var(--border-mid)'; el.style.cursor = 'not-allowed'; }
    else if (isSel){ el.style.background = 'var(--accent)'; el.style.color = 'white'; el.style.fontWeight = '800'; }
    else           { el.style.color = 'var(--text)'; }
    if (isBk && !isSel) { el.style.background = 'var(--yellow-light)'; el.style.color = 'var(--role-director-color)'; }
    el.textContent = d;
    if (isBk) {
      var dot = document.createElement('span');
      dot.style.cssText = 'position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:' + (isSel ? 'white' : 'var(--c-amber)') + ';';
      el.appendChild(dot);
    }
    (function(dateStr, past) {
      if (!past) el.onmouseenter = function() { if (selectedDates.indexOf(dateStr) === -1) el.style.background = 'var(--accent-tint)'; };
      if (!past) el.onmouseleave = function() { if (selectedDates.indexOf(dateStr) === -1) el.style.background = isBk ? 'var(--yellow-light)' : ''; };
      el.onclick = function() { mdpToggleDay(dateStr, past); };
    })(ds, isPast);
    grid.appendChild(el);
  }
  /* trailing empty cells */
  var total = first + daysInMonth;
  var trailing = Math.ceil(total / 7) * 7 - total;
  for (var j = 1; j <= trailing; j++) {
    var t = document.createElement('div');
    t.style.cssText = 'aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border-radius:7px;color:var(--border-mid);';
    t.textContent = j;
    grid.appendChild(t);
  }
  /* tag strip */
  var tagWrap = document.getElementById('mdpTags');
  if (!selectedDates.length) { tagWrap.innerHTML = '<span style="font-size:11px;color:var(--text3);font-style:italic;">ยังไม่ได้เลือกวันที่</span>'; return; }
  tagWrap.innerHTML = selectedDates.map(function(ds) {
    var p = ds.split('-'); var d2 = new Date(+p[0], +p[1] - 1, +p[2]);
    var dnames = ['อา','จ','อ','พ','พฤ','ศ','ส'];
    var lbl = dnames[d2.getDay()] + ' ' + p[2] + '/' + p[1] + '/' + (+p[0] + 543);
    return '<span class="mdp-tag">' + lbl + '<button type="button" onclick="mdpRemoveDay(\'' + ds + '\')">×</button></span>';
  }).join('');
}

/* ══ Room dropdown ══ */
function populateRooms() {
  var sel = document.getElementById('roomSelect');
  var cur = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  allRooms.forEach(function(r) {
    var o = document.createElement('option'); o.value = r.name; o.textContent = r.name + (r.capacity ? ' (' + r.capacity + ' คน)' : ''); sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

function setTimeMode(mode) {
  if (mode === 'allday' && blockedSlots.length > 0) { showToast('มีช่วงเวลาถูกจองอยู่แล้ว ไม่สามารถเลือก "ทั้งวัน" ได้', 'warn'); return; }
  timeMode = mode;
  document.getElementById('modeRange').classList.toggle('active', mode === 'range');
  document.getElementById('modeAllDay').classList.toggle('active', mode === 'allday');
  document.getElementById('timePickerWrap').style.display = mode === 'range' ? 'block' : 'none';
  if (mode === 'allday') { rangeStart = 0; rangeEnd = TIME_SLOTS.length - 1; } else { rangeStart = -1; rangeEnd = -1; renderTimeSlots(); }
  updateTimeSummary();
}

function buildTimeSlotGrid() {
  var grid = document.getElementById('timeSlotGrid'); grid.innerHTML = '';
  TIME_SLOTS.slice(0, -1).forEach(function(t, i) {
    var startH = parseInt(t);
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'time-slot-btn'; btn.textContent = startH + '.00-' + (startH + 1) + '.00'; btn.dataset.index = i;
    if (blockedSlots.indexOf(i) !== -1) btn.classList.add('ts-blocked');
    btn.onclick = function() { if (blockedSlots.indexOf(i) !== -1) { showToast('ช่วงเวลานี้ถูกจองแล้ว', 'warn'); return; } clickSlot(i); };
    grid.appendChild(btn);
  });
}

function renderTimeSlots() {
  document.querySelectorAll('.time-slot-btn').forEach(function(btn) {
    var i = parseInt(btn.dataset.index);
    if (blockedSlots.indexOf(i) !== -1) { btn.className = 'time-slot-btn ts-blocked'; return; }
    btn.className = 'time-slot-btn';
    if (rangeStart !== -1 && i >= rangeStart && i <= rangeEnd) btn.classList.add(i === rangeStart || i === rangeEnd ? 'selected' : 'in-range');
  });
}

function getTimeRange() {
  if (rangeStart === -1) return null;
  return { start: TIME_SLOTS[rangeStart], end: String(parseInt(TIME_SLOTS[rangeEnd]) + 1).padStart(2, '0') + ':00' };
}

function computeBlockedSlots() {
  blockedSlots = [];
  var room = document.getElementById('roomSelect').value;
  var date = selectedDates.length ? selectedDates[0] : null;
  if (!room || !date) return;
  allBookings.forEach(function(b) {
    if (b.status === 'rejected') return;
    if (editingBookingId && b.id === editingBookingId) return;
    if (b.room !== room || b.date !== date) return;
    var si = TIME_SLOTS.indexOf(b.startTime);
    var endHr = parseInt(b.endTime) - 1;
    var ei = TIME_SLOTS.indexOf(String(endHr).padStart(2, '0') + ':00');
    if (si === -1 || ei === -1) return;
    for (var x = si; x <= ei; x++) { if (blockedSlots.indexOf(x) === -1) blockedSlots.push(x); }
  });
}
function getEquipment() {
  var items = [];
  var simple = { sound:'ชุดเครื่องเสียง', projector:'เครื่องฉายโปรเจคเตอร์', signal:'สัญญาณเสียงเพื่อต่อพ่วง', appletv:'Apple TV', photo:'ถ่ายภาพ' };
  Object.keys(simple).forEach(function(id) { if (document.getElementById('cb-' + id).checked) items.push(simple[id]); });
  ['table','chair','sofa'].forEach(function(id) { if (document.getElementById('cb-' + id).checked) { var q = document.getElementById('qty-' + id).value; var n = id === 'table' ? 'โต๊ะ' : id === 'chair' ? 'เก้าอี้' : 'ชุดโซฟา'; var u = id === 'sofa' ? 'ชุด' : 'ตัว'; items.push(n + ' ' + (q || '?') + ' ' + u); } });
  if (document.getElementById('cb-other').checked) { var oth = document.getElementById('qty-other').value; if (oth) items.push(oth); }
  return items;
}
function clearFile(ev) { if (ev) ev.stopPropagation(); document.getElementById('layoutFile').value = ''; document.getElementById('uploadDefault').style.display = 'block'; document.getElementById('uploadPreview').style.display = 'none'; document.getElementById('uploadArea').classList.remove('has-file'); selectedFile = null; selectedFileDataURL = null; selectedFileBlob = null; }
function renderCalendar() {
  var grid = document.getElementById('calendarDaysGrid');
  var label = document.getElementById('currentMonthLabel');
  if (!grid || !label) return;
  grid.innerHTML = '';
  var first = new Date(viewYear, viewMonth, 1).getDay(), days = new Date(viewYear, viewMonth + 1, 0).getDate();
  var today = new Date().toISOString().split('T')[0];
  label.textContent = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth));
  for (var i = 0; i < first; i++) { var e = document.createElement('div'); e.className = 'cal-day empty'; grid.appendChild(e); }
  var bmap = {};
  allBookings.forEach(function(b) {
    if (b.status === 'rejected') return;
    if (activeRoomFilter !== 'all' && b.room !== activeRoomFilter) return;
    if (!bmap[b.date]) bmap[b.date] = []; bmap[b.date].push(b);
  });
  for (var d = 1; d <= days; d++) {
    var dk = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var db = bmap[dk] || [];
    var el = document.createElement('div');
    var cls = 'cal-day';
    if (dk === today) cls += ' is-today';
    if (db.length > 0) cls += ' has-booking';
    if (db.length >= 3) cls += ' is-full';
    if (dk === selectedDate) cls += ' is-selected';
    el.className = cls; el.textContent = d;
    (function(k) { el.onclick = function() { selectedDate = k; renderCalendar(); updateDayView(k, getFilteredBookings(k)); }; })(dk);
    grid.appendChild(el);
  }
  /* trailing empty cells to complete last row */
  var total = first + days;
  var trailing = Math.ceil(total / 7) * 7 - total;
  for (var j = 0; j < trailing; j++) { var t = document.createElement('div'); t.className = 'cal-day empty'; grid.appendChild(t); }
}

function getFilteredBookings(dateKey) {
  return allBookings.filter(function(b) {
    if (b.status === 'rejected') return false;
    if (b.date !== dateKey) return false;
    if (activeRoomFilter !== 'all' && b.room !== activeRoomFilter) return false;
    return true;
  });
}
function getRoomPastel(n) {
  if (ROOM_PASTEL_MAP[n]) return ROOM_PASTEL_MAP[n];
  var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % ROOM_PASTEL_FALLBACK.length;
  return ROOM_PASTEL_FALLBACK[h];
}
function normalizeRoomName(n) { return ROOM_NAME_ALIAS[n] || n; }

/* ══ Firestore ══ */
function processBookings(snap) {
  try {
    allBookings = [];
    var today = new Date().toISOString().split('T')[0], app = 0, pen = 0;
    snap.forEach(function(d) { var bk = Object.assign({id: d.id}, d.data()); bk.room = normalizeRoomName(bk.room || ''); allBookings.push(bk); });
    allBookings.sort(function(a, b) {
      var da = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      var db = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0; return db - da;
    });
    allBookings.forEach(function(b) { if (b.date === today) { if (b.status === 'approved') app++; else if (b.status !== 'rejected') pen++; } });
    var appEl = document.getElementById('approvedToday'); if (appEl) appEl.textContent = app;
    var penEl = document.getElementById('pendingToday');  if (penEl) penEl.textContent = pen;
    renderBookingTable(); renderCalendar();
    updateDayView(selectedDate, getFilteredBookings(selectedDate));
    renderRoomStats();
    if (document.getElementById('bookingModal').classList.contains('open')) mdpRender();
    lucide.createIcons();
  } catch(e) { console.error('processBookings:', e); }
}

function renderBookingTable() {
  var tbody = document.getElementById('mainBookingTableBody');
  if (!tbody) return;
  var totalPages = Math.ceil(allBookings.length / PAGE_SIZE) || 1;
  if (bookingPage >= totalPages) bookingPage = totalPages - 1;
  var start = bookingPage * PAGE_SIZE;
  var pageItems = allBookings.slice(start, start + PAGE_SIZE);
  if (!allBookings.length) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text3);padding:40px;">ยังไม่มีประวัติการจอง</td></tr>'; }
  else {
    var tbl = '';
    pageItems.forEach(function(b, i) {
      var globalIdx = allBookings.length - start - i;
      var ok = b.status === 'approved', rej = b.status === 'rejected';
      var now = new Date(), eDate = b.date && b.endTime ? new Date(b.date + 'T' + b.endTime + ':00') : null;
      var isDone = eDate && now > eDate;
      var rp = getRoomPastel(b.room || '');
      var badgeCls   = isDone ? 'badge-d' : ok ? 'badge-g' : rej ? 'badge-r' : 'badge-a';
      var badgeLabel = isDone ? '✅ เสร็จสิ้น' : ok ? '✅ อนุมัติ' : rej ? '❌ ปฏิเสธ' : '⏳ รอตรวจ';
      var canEdit = b.status === 'pending' && currentUser && b.userId === currentUser.uid;
      var fileBtn = b.hasLayout ? '<button onclick="event.stopPropagation();openFileView(this.dataset.id)" data-id="' + b.id + '" style="background:var(--indigo-light);border:1.5px solid var(--indigo-pale);color:var(--violet);border-radius:8px;padding:3px 8px;font-weight:700;font-size:10px;cursor:pointer;">📎 ดูไฟล์</button>' : '—';
      var personLabel = b.personType === 'external' ? '<span style="font-size:10px;background:var(--orange-light);color:var(--orange);border:1px solid var(--amber-pale);border-radius:8px;padding:1px 7px;font-weight:700;">ภายนอก</span>' : '<span style="font-size:10px;background:var(--blue-light);color:var(--blue);border:1px solid var(--blue-mid);border-radius:8px;padding:1px 7px;font-weight:700;">ภายใน</span>';
      var actionBtns = '';
      if (canEdit) actionBtns += '<button onclick="event.stopPropagation();toggleModal(this.dataset.id)" data-id="' + b.id + '" style="background:var(--blue-light);border:1.5px solid var(--blue-mid);color:var(--blue);border-radius:8px;padding:4px 8px;font-weight:700;font-size:11px;cursor:pointer;margin-bottom:3px;">✏️ แก้ไข</button> ';
      if (canEdit) actionBtns += '<button onclick="event.stopPropagation();cancelBooking(this.dataset.id)" data-id="' + b.id + '" style="background:var(--rose-light-4);border:1.5px solid var(--rose-light-5);color:var(--rose-3);border-radius:8px;padding:4px 8px;font-weight:700;font-size:11px;cursor:pointer;">✕ ยกเลิก</button>';
      if (!actionBtns) actionBtns = '—';
      tbl += '<tr onclick="viewDate(this.dataset.date)" data-date="' + esc(b.date) + '" style="border-left:3px solid ' + rp.accent + ';cursor:pointer;">' +
        '<td style="text-align:center;color:var(--text3);font-family:monospace;padding:11px 14px;">' + globalIdx + '</td>' +
        '<td style="font-weight:700;padding:11px 14px;">' + esc2(b.date) + '</td>' +
        '<td style="padding:11px 14px;"><span style="display:inline-flex;align-items:center;gap:4px;background:' + rp.bg + ';color:' + rp.text + ';font-weight:700;font-size:11px;padding:2px 8px;border-radius:20px;border:1px solid ' + rp.border + ';">' + esc2(b.room) + '</span></td>' +
        '<td style="padding:11px 14px;">' + esc2(b.startTime || '-') + '-' + esc2(b.endTime || '-') + '</td>' +
        '<td style="font-size:11px;padding:11px 14px;">' + esc2(b.fullName || b.userName || '-') + '</td>' +
        '<td style="padding:11px 14px;">' + personLabel + '</td>' +
        '<td style="max-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:11px 14px;">' + esc2(b.purpose || '') + '</td>' +
        '<td style="text-align:center;padding:11px 14px;"><span class="' + badgeCls + '">' + badgeLabel + '</span></td>' +
        '<td style="text-align:center;padding:11px 14px;">' + fileBtn + '</td>' +
        '<td style="white-space:nowrap;padding:11px 14px;">' + actionBtns + '</td>' +
      '</tr>';
    });
    tbody.innerHTML = tbl;
  }
  var pgWrap = document.getElementById('bookingPagination');
  if (!pgWrap) return;
  if (totalPages <= 1) { pgWrap.innerHTML = ''; return; }
  pgWrap.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;padding:10px 16px;border-top:1px solid var(--border-soft);">' +
      '<span style="font-size:12px;color:var(--text2);">หน้า ' + (bookingPage + 1) + ' / ' + totalPages + ' (' + allBookings.length + ' รายการ)</span>' +
      '<button onclick="goBookingPage(' + (bookingPage - 1) + ')" ' + (bookingPage === 0 ? 'disabled' : '') + ' class="page-btn">← ก่อนหน้า</button>' +
      '<button onclick="goBookingPage(' + (bookingPage + 1) + ')" ' + (bookingPage >= totalPages - 1 ? 'disabled' : '') + ' class="btn-primary btn-sm">ถัดไป →</button>' +
    '</div>';
}

function viewDate(d) { var p = d.split('-'); viewYear = +p[0]; viewMonth = +p[1] - 1; selectedDate = d; renderCalendar(); updateDayView(d, getFilteredBookings(d)); }

/* ══ Room Tabs ══ */
function renderRoomTabs() {
  var wrap = document.getElementById('roomTabsWrap');
  if (!wrap) return;
  wrap.querySelectorAll('button[data-room]').forEach(function(b) { b.remove(); });
  allRooms.forEach(function(r) {
    var btn = document.createElement('button'); btn.className = 'room-tab'; btn.textContent = r.name; btn.dataset.room = r.name;
    btn.onclick = function() { selectRoomFilter(r.name, btn); }; wrap.appendChild(btn);
  });
}

/* ══ Room Banner ══ */
function renderRoomBanner() {
  var banner = document.getElementById('roomBanner');
  if (!banner) return;
  if (activeRoomFilter === 'all') {
    banner.innerHTML = '<div style="padding:14px 18px;display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,var(--blue) 0%,var(--blue-bright) 100%);border-radius:16px;"><i data-lucide="building-2" style="width:22px;height:22px;color:white;flex-shrink:0;"></i><div><div style="font-weight:800;color:white;font-size:14px;">ทุกห้องและสถานที่</div><div style="font-size:11px;color:var(--blue-mid);">แสดงการจองทั้งหมดในระบบ</div></div></div>';
    lucide.createIcons(); return;
  }
  var room = allRooms.find(function(r) { return r.name === activeRoomFilter; });
  if (!room) { banner.innerHTML = ''; return; }
  var rp = getRoomPastel(room.name);
  if (room.imageUrl) {
    banner.innerHTML = '<div id="roomBannerInner" style="position:relative;height:140px;border-radius:16px;overflow:hidden;background:' + rp.accent + ';background-image:url(\'' + esc(room.imageUrl) + '\');background-size:cover;background-position:center;"><div style="position:absolute;bottom:0;left:0;right:0;padding:14px 18px;background:linear-gradient(to top,rgba(15,23,42,.75),transparent);"><div style="font-weight:800;color:white;font-size:15px;">' + esc2(room.name) + '</div><div style="font-size:11px;color:rgba(255,255,255,.8);">' + (room.capacity ? 'ความจุ ' + esc2(room.capacity) + ' คน' : '') + (room.detail ? ' · ' + esc2(room.detail) : '') + '</div></div></div>';
  } else {
    banner.innerHTML = '<div style="padding:14px 18px;background:' + rp.bg + ';display:flex;align-items:center;gap:12px;border-radius:16px;border-left:4px solid ' + rp.border + ';"><div style="width:44px;height:44px;background:' + rp.accent + ';border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="door-open" style="width:22px;height:22px;color:white;"></i></div><div><div style="font-weight:800;color:var(--text);font-size:14px;">' + esc2(room.name) + '</div><div style="font-size:12px;color:var(--text2);">' + (room.capacity ? 'ความจุ ' + esc2(room.capacity) + ' คน · ' : '') + esc2(room.detail || '') + '</div></div></div>';
  }
  lucide.createIcons();
}

/* ══ Monthly Stats ══ */
function renderRoomStats() {
  var label = document.getElementById('statsMonthLabel');
  var wrap  = document.getElementById('roomStatsWrap');
  if (!label || !wrap) return;
  label.textContent = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth));
  var prefix = viewYear + '-' + String(viewMonth + 1).padStart(2, '0');
  var counts = {};
  allBookings.forEach(function(b) { if (b.status === 'rejected') return; if (!b.date || b.date.indexOf(prefix) !== 0) return; if (!counts[b.room]) counts[b.room] = 0; counts[b.room]++; });
  var rooms = activeRoomFilter === 'all' ? allRooms : allRooms.filter(function(r) { return r.name === activeRoomFilter; });
  if (!rooms.length) { wrap.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:10px;">ยังไม่มีห้อง</div>'; return; }
  var max = 0; rooms.forEach(function(r) { if ((counts[r.name] || 0) > max) max = (counts[r.name] || 0); });
  wrap.innerHTML = rooms.map(function(r) {
    var c = counts[r.name] || 0, pct = max > 0 ? (c / max * 100) : 0;
    return '<div><div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:var(--text);margin-bottom:3px;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">' + esc2(r.name) + '</span><span style="color:var(--blue);flex-shrink:0;">' + c + ' ครั้ง</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:' + pct + '%;"></div></div></div>';
  }).join('');
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

function mdpToggleDay(ds, isPast) {
  if (isPast) return;
  var idx = selectedDates.indexOf(ds);
  if (idx === -1) selectedDates.push(ds); else selectedDates.splice(idx, 1);
  selectedDates.sort();
  mdpRender(); onRoomOrDateChange();
}
function mdpRemoveDay(ds) { selectedDates = selectedDates.filter(function(d) { return d !== ds; }); mdpRender(); onRoomOrDateChange(); }
function mdpChangeMonth(dir) { mdpMonth += dir; if (mdpMonth < 0) { mdpMonth = 11; mdpYear--; } if (mdpMonth > 11) { mdpMonth = 0; mdpYear++; } mdpRender(); }

function clickSlot(i) {
  if (rangeStart === -1) { rangeStart = i; rangeEnd = i; }
  else if (i === rangeStart && rangeEnd === rangeStart) { rangeStart = -1; rangeEnd = -1; }
  else { if (i < rangeStart) rangeStart = i; else rangeEnd = i; }
  var hasBlock = false;
  for (var x = rangeStart; x <= rangeEnd; x++) { if (blockedSlots.indexOf(x) !== -1) { hasBlock = true; break; } }
  if (hasBlock) { showToast('มีช่วงเวลาที่ถูกจองอยู่ในช่วงที่เลือก กรุณาเลือกใหม่', 'warn'); rangeStart = i; rangeEnd = i; }
  renderTimeSlots(); updateTimeSummary();
}

function updateTimeSummary() {
  var el = document.getElementById('timeSummary');
  if (rangeStart === -1) { el.style.display = 'none'; return; }
  var s = TIME_SLOTS[rangeStart];
  var endHr = parseInt(TIME_SLOTS[rangeEnd]) + 1;
  var e = String(endHr).padStart(2, '0') + ':00';
  el.textContent = s + ' – ' + e + ' น. (' + (rangeEnd - rangeStart + 1) + ' ชั่วโมง)';
  el.style.display = 'block';
}

function onRoomOrDateChange() {
  mdpRender();
  computeBlockedSlots();
  var alldayBtn = document.getElementById('modeAllDay');
  if (timeMode === 'allday' && blockedSlots.length > 0) {
    timeMode = 'range';
    document.getElementById('modeRange').classList.add('active');
    document.getElementById('modeAllDay').classList.remove('active');
    document.getElementById('timePickerWrap').style.display = 'block';
    rangeStart = -1; rangeEnd = -1; updateTimeSummary();
    showToast('มีการจองในวันแรกที่เลือกแล้ว ไม่สามารถเลือกทั้งวันได้', 'warn');
  }
  if (rangeStart !== -1) {
    for (var x = rangeStart; x <= rangeEnd; x++) { if (blockedSlots.indexOf(x) !== -1) { rangeStart = -1; rangeEnd = -1; updateTimeSummary(); break; } }
  }
  if (alldayBtn) {
    if (blockedSlots.length > 0) { alldayBtn.disabled = true; alldayBtn.style.opacity = '0.45'; alldayBtn.title = 'มีช่วงเวลาถูกจองแล้ว'; }
    else { alldayBtn.disabled = false; alldayBtn.style.opacity = '1'; alldayBtn.title = ''; }
  }
  buildTimeSlotGrid(); renderTimeSlots();
}

/* ══ Equipment ══ */
function toggleEquip(id, el) {
  var cb = document.getElementById('cb-' + id); cb.checked = !cb.checked; el.classList.toggle('checked', cb.checked);
  var w = document.getElementById('wrap-' + id); if (w) w.style.display = cb.checked ? 'flex' : 'none';
}
function resetEquipment() {
  ['sound','projector','signal','appletv','table','chair','sofa','photo','other'].forEach(function(id) {
    var cb = document.getElementById('cb-' + id); if (cb) cb.checked = false;
    var el = document.getElementById('eq-' + id); if (el) el.classList.remove('checked');
    var w  = document.getElementById('wrap-' + id); if (w) w.style.display = 'none';
    var q  = document.getElementById('qty-' + id);  if (q) q.value = '';
  });
}

/* ══ File Upload ══ */
function handleFile(input) {
  var file = input.files[0]; var errEl = document.getElementById('fileError'); errEl.style.display = 'none';
  if (!file) return;
  if (!file.type.startsWith('image/')) { errEl.textContent = 'กรุณาเลือกไฟล์รูปภาพเท่านั้น'; errEl.style.display = 'block'; input.value = ''; return; }
  if (file.size > 15 * 1024 * 1024) { errEl.textContent = 'ไฟล์ใหญ่เกิน 15MB'; errEl.style.display = 'block'; input.value = ''; return; }
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var TARGET = 680000, scales = [1200, 900, 700, 500], dataUrl = '', finalW = img.width, finalH = img.height;
      if (file.size < 200 * 1024) { dataUrl = ev.target.result; } else {
        for (var si = 0; si < scales.length; si++) {
          var MAX = scales[si], w = img.width, h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          var canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          var q = 0.82, found = false;
          while (q >= 0.3) { dataUrl = canvas.toDataURL('image/jpeg', q); if (dataUrl.length <= TARGET) { finalW = w; finalH = h; found = true; break; } q = Math.round((q - 0.05) * 100) / 100; }
          if (found) break;
        }
      }
      selectedFileDataURL = dataUrl; selectedFile = { name: file.name, size: file.size };
      var byteStr = atob(dataUrl.split(',')[1]), bytes = new Uint8Array(byteStr.length);
      for (var bi = 0; bi < byteStr.length; bi++) bytes[bi] = byteStr.charCodeAt(bi);
      selectedFileBlob = new Blob([bytes], { type: 'image/jpeg' });
      var kb = (dataUrl.length * 0.75 / 1024).toFixed(0);
      document.getElementById('previewImg').src = dataUrl;
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileSize').textContent = '✓ บีบอัดแล้ว ' + kb + ' KB · ' + finalW + '×' + finalH + 'px';
      document.getElementById('uploadDefault').style.display = 'none';
      document.getElementById('uploadPreview').style.display = 'block';
      document.getElementById('uploadArea').classList.add('has-file');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

/* ══ Modal ══ */
function toggleModal(editId) {
  var m = document.getElementById('bookingModal');
  if (!m.classList.contains('open')) {
    editingBookingId = editId || null;
    closeSidebar();  /* ปิด sidebar ก่อนเปิด modal */
    m.classList.add('open'); document.body.style.overflow = 'hidden';
    populateRooms();
    document.getElementById('termsCheck').checked = false;
    if (editId) {
      var b = allBookings.find(function(x) { return x.id === editId; });
      if (b) {
        document.getElementById('modalTitle').innerHTML = '<i data-lucide="pencil" style="width:19px;height:19px;"></i> แก้ไขคำขอจอง';
        document.getElementById('editBookingId').value = editId;
        document.getElementById('roomSelect').value = b.room || '';
        selectedDates = b.date ? [b.date] : [];
        if (b.date) { var p = b.date.split('-'); mdpYear = +p[0]; mdpMonth = +p[1] - 1; }
        document.getElementById('personType').value = b.personType || '';
        document.getElementById('fullName').value = b.fullName || '';
        document.getElementById('position').value = b.position || '';
        document.getElementById('phone').value = b.phone || '';
        document.getElementById('attendees').value = b.attendees || '';
        document.getElementById('purpose').value = b.purpose || '';
        document.getElementById('submitBtn').textContent = 'บันทึกการแก้ไข';
      }
    } else {
      document.getElementById('modalTitle').innerHTML = '<i data-lucide="calendar" style="width:19px;height:19px;"></i> แบบฟอร์มการจอง';
      document.getElementById('editBookingId').value = '';
      selectedDates = []; mdpYear = new Date().getFullYear(); mdpMonth = new Date().getMonth();
      document.getElementById('personType').value = '';
      document.getElementById('phone').value = '';
      document.getElementById('submitBtn').textContent = 'ยืนยันข้อมูลการจอง';
    }
    mdpRender();
    timeMode = 'range'; rangeStart = -1; rangeEnd = -1; setTimeMode('range');
    computeBlockedSlots();
    var ab = document.getElementById('modeAllDay');
    if (ab) { if (blockedSlots.length > 0) { ab.disabled = true; ab.style.opacity = '0.45'; } else { ab.disabled = false; ab.style.opacity = '1'; } }
    buildTimeSlotGrid(); lucide.createIcons();
  } else {
    m.classList.remove('open'); document.body.style.overflow = '';
    document.getElementById('bookingForm').reset();
    resetEquipment(); clearFile(null);
    selectedDates = []; rangeStart = -1; rangeEnd = -1; editingBookingId = null; blockedSlots = [];
  }
}

/* ══ Calendar ══ */
function changeMonth(d) { viewMonth += d; if (viewMonth > 11) { viewMonth = 0; viewYear++; } if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderCalendar(); renderRoomStats(); }

function updateDayView(dateKey, dayBookings) {
  var list  = document.getElementById('todayBookingsList');
  var lbl   = document.getElementById('selectedDateLabel');
  if (!list) return;
  if (lbl) lbl.textContent = new Date(dateKey + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (!dayBookings || !dayBookings.length) { list.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--border-mid);font-style:italic;">ไม่มีข้อมูลการจองในวันที่เลือก</div>'; return; }
  var now = new Date();
  list.innerHTML = dayBookings.map(function(b) {
    var ok = b.status === 'approved';
    var eDate = new Date(dateKey + 'T' + (b.endTime || '23:59') + ':00');
    var isDone = !isNaN(eDate) && now > eDate;
    var p = getRoomPastel(b.room || '');
    var cardBg = isDone ? 'var(--bg-alt)' : p.bg, cardBorder = isDone ? 'var(--border-mid)' : p.border, cardText = isDone ? 'var(--text3)' : p.text;
    var purposeBg = isDone ? '#94a3b822' : p.accent + '22', badgeBg = isDone ? '#94a3b8' : p.accent;
    var statusTxt = isDone ? '✅ เสร็จสิ้น' : ok ? '✅ อนุมัติ' : '⏳ รอตรวจ';
    var fileBtn = b.hasLayout ? '<button onclick="openFileView(this.dataset.id)" data-id="' + b.id + '" style="display:inline-flex;align-items:center;gap:4px;margin-top:5px;background:var(--indigo-light);border:1px solid var(--indigo-pale);color:var(--violet);border-radius:6px;padding:3px 8px;font-weight:700;font-size:10px;cursor:pointer;">📎 ดูไฟล์แนบ</button>' : '';
    return '<div style="padding:14px 16px;background:' + cardBg + ';border-radius:14px;margin-bottom:10px;border:1.5px solid ' + cardBorder + ';">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:800;font-size:14px;color:' + cardText + ';margin-bottom:5px;">' + esc2(b.room) + '</div>' +
          '<div style="font-size:11px;color:' + cardText + ';opacity:.75;margin-bottom:2px;">⏰ ' + esc2(b.startTime || '?') + ' – ' + esc2(b.endTime || '?') + ' · 👤 ' + esc2(b.fullName || b.userName || '-') + '</div>' +
          '<div style="font-size:11px;color:' + cardText + ';background:' + purposeBg + ';padding:4px 8px;border-radius:6px;margin-top:5px;">📌 ' + esc2(b.purpose || '-') + '</div>' +
          (b.attendees ? '<div style="font-size:10px;color:' + cardText + ';opacity:.7;margin-top:3px;">👥 ' + esc2(b.attendees) + ' คน</div>' : '') +
          fileBtn +
        '</div>' +
        '<span style="font-size:9px;font-weight:700;padding:3px 9px;border-radius:20px;flex-shrink:0;white-space:nowrap;background:' + badgeBg + ';color:white;">' + statusTxt + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function goBookingPage(p) { var t = Math.ceil(allBookings.length / PAGE_SIZE) || 1; if (p < 0 || p >= t) return; bookingPage = p; renderBookingTable(); }

function cancelBooking(id) {
  if (!confirm('ยืนยันการยกเลิกคำขอนี้?')) return;
  db.collection('bookings').doc(id).delete()
    .then(function() { showToast('ยกเลิกคำขอเรียบร้อยแล้ว'); })
    .catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
}

/* ══ Submit ══ */
function submitBooking(e) {
  e.preventDefault();
  var tr = getTimeRange();
  if (!tr) { showToast('กรุณาเลือกช่วงเวลาอย่างน้อย 1 ชั่วโมง', 'warn'); return; }
  if (!selectedDates.length) { showToast('กรุณาเลือกวันที่อย่างน้อย 1 วัน', 'warn'); return; }
  if (!document.getElementById('termsCheck').checked) { showToast('กรุณายอมรับข้อกำหนดก่อนส่งคำขอ', 'warn'); return; }
  var btn = document.getElementById('submitBtn'); btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
  var editId = document.getElementById('editBookingId').value;
  var baseData = {
    userId: currentUser.uid, userName: currentUser.displayName, userPhoto: currentUser.photoURL,
    personType: document.getElementById('personType').value,
    fullName: document.getElementById('fullName').value,
    position: document.getElementById('position').value,
    phone: document.getElementById('phone').value,
    attendees: parseInt(document.getElementById('attendees').value) || 0,
    room: document.getElementById('roomSelect').value,
    startTime: tr.start, endTime: tr.end,
    purpose: document.getElementById('purpose').value,
    equipment: getEquipment()
  };
  function doSave() {
    var p;
    if (editId) {
      p = db.collection('bookings').doc(editId).update(Object.assign({}, baseData, { date: selectedDates[0], status: 'pending', updatedAt: firebase.firestore.FieldValue.serverTimestamp(), approveNote: '', approvedBy: '', rejectReason: '', rejectedBy: '' }));
    } else {
      var batch = db.batch();
      selectedDates.forEach(function(ds) { var ref = db.collection('bookings').doc(); batch.set(ref, Object.assign({}, baseData, { date: ds, status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp() })); });
      p = batch.commit();
    }
    p.then(function() { toggleModal(); var n = selectedDates.length; showToast(editId ? 'แก้ไขคำขอแล้ว ✓' : (n > 1 ? 'บันทึก ' + n + ' วันสำเร็จ ✓' : 'บันทึกข้อมูลสำเร็จ ✓')); })
     .catch(function(err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); })
     .finally(function() { btn.disabled = false; btn.textContent = editId ? 'บันทึกการแก้ไข' : 'ยืนยันข้อมูลการจอง'; });
  }
  if (selectedFileBlob) {
    if (!storage) { showToast('Storage ยังไม่พร้อมใช้งาน', 'error'); btn.disabled = false; btn.textContent = editId ? 'บันทึกการแก้ไข' : 'ยืนยันข้อมูลการจอง'; return; }
    var path = 'booking-attachments/' + currentUser.uid + '/' + Date.now() + '_' + selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var ref = storage.ref().child(path);
    showToast('กำลังอัปโหลดไฟล์แนบ...');
    ref.put(selectedFileBlob, { contentType: 'image/jpeg' }).then(function(snap) { return snap.ref.getDownloadURL(); }).then(function(url) {
      baseData.hasLayout = true; baseData.layoutName = selectedFile.name; baseData.layoutUrl = url; doSave();
    }).catch(function(err) { showToast('อัปโหลดไฟล์ไม่สำเร็จ: ' + err.message, 'error'); btn.disabled = false; btn.textContent = editId ? 'บันทึกการแก้ไข' : 'ยืนยันข้อมูลการจอง'; });
  } else { baseData.hasLayout = false; baseData.layoutName = null; doSave(); }
}

function selectRoomFilter(name, btn) {
  activeRoomFilter = name;
  document.querySelectorAll('#roomTabsWrap .room-tab').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  renderCalendar(); updateDayView(selectedDate, getFilteredBookings(selectedDate)); renderRoomBanner(); renderRoomStats();
}

/* ══ File View Modal ══ */
function openFileView(bookingId) {
  if (!bookingId) {
    if (!selectedFileDataURL) { showToast('ยังไม่มีรูปที่แนบ', 'warn'); return; }
    document.getElementById('fileViewImg').src = selectedFileDataURL;
    document.getElementById('fileViewImg').style.display = 'block';
    document.getElementById('fileViewError').style.display = 'none';
    document.getElementById('fileViewName').textContent = selectedFile ? selectedFile.name : 'ไฟล์แนบ';
    document.getElementById('fileViewModal').classList.add('open'); document.body.style.overflow = 'hidden';
    lucide.createIcons(); return;
  }
  var b = allBookings.find(function(x) { return x.id === bookingId; });
  if (!b || !b.hasLayout) { showToast('ไม่มีไฟล์แนบ', 'warn'); return; }
  var img = document.getElementById('fileViewImg'), errEl = document.getElementById('fileViewError');
  img.style.display = 'block'; errEl.style.display = 'none';
  document.getElementById('fileViewName').textContent = b.layoutName || 'ไฟล์แนบ';
  if (b.layoutUrl) img.src = b.layoutUrl;
  else if (b.layoutDataURL) img.src = b.layoutDataURL;
  else { img.style.display = 'none'; errEl.style.display = 'block'; errEl.textContent = 'ไม่พบ URL ของไฟล์แนบ'; }
  document.getElementById('fileViewModal').classList.add('open'); document.body.style.overflow = 'hidden';
  lucide.createIcons();
}
function closeFileView() { document.getElementById('fileViewModal').classList.remove('open'); document.body.style.overflow = ''; }

/* ══ History Filter ══ */
function filterHistoryTable() {
  var q  = (document.getElementById('historySearch')      || {value: ''}).value.toLowerCase();
  var st = (document.getElementById('historyStatusFilter') || {value: ''}).value;
  var tbody = document.getElementById('mainBookingTableBody'); if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(function(tr) {
    var txt = tr.textContent.toLowerCase();
    var matchQ  = !q || txt.indexOf(q) !== -1;
    var matchSt = !st;
    if (!matchSt) {
      var badge = tr.querySelector('[class^="badge-"]');
      if (st === 'pending'  && badge && badge.classList.contains('badge-a')) matchSt = true;
      if (st === 'approved' && badge && badge.classList.contains('badge-g')) matchSt = true;
      if (st === 'rejected' && badge && badge.classList.contains('badge-r')) matchSt = true;
    }
    tr.style.display = (matchQ && matchSt) ? '' : 'none';
  });
}

/* ══════════════════════ INIT ══════════════════════ */
/* ══════════════════════════════════════════════════════════════
   buildPage() — auth guard + shell builder
   navTheme: 'blue' สำหรับผู้ใช้ทั่วไป
   ══════════════════════════════════════════════════════════════ */
buildPage({
  appId:        'myApp',
  navSubtitle:  'ระบบขอใช้ห้อง/สถานที่',
  navTheme:     'blue',
  activePage:   'room-request',
  requireAdmin: false,

  onAuth: function(user, contentEl) {
    currentUser = user;
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);

    /* inject page content จาก <template> */
    var tpl = document.getElementById('roomRequestContent');
    if (tpl) contentEl.appendChild(tpl.content.cloneNode(true));

    lucide.createIcons();
    renderCalendar();      /* แสดงเลขวันทันที ก่อนข้อมูลมา */
    renderRoomStats();

    initData();
    setupScrollTopButton();
  }
});

lucide.createIcons();


