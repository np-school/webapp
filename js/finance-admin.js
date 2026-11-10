/* ══════════════════════════════════════════════════════════════
   finance-admin.js — หน้าเจ้าหน้าที่: กดยืนยันแต่ละขั้น + ทะเบียนลูกหนี้
   (ต้องโหลด finance-common.js ก่อน) สิทธิ์ตาม admins/{email}.permissions (financeCheck / financeCheque / financeLoan)
   ══════════════════════════════════════════════════════════════ */
var activeTab = 'todo';
var searchQ = '';
var ledgerFY = '';
var confirmCtx = null;
var stageFilter = '';   /* '' | review | revision | cheque | loan | late | done  (คลิกจากการ์ดสรุป) */
var catFilter = '';     /* '' | loan | claim | clear | purchase | payroll         (คลิกจากแถบหมวดหมู่) */

/* การ์ดสรุปด้านบน: แยกสีตามสถานะ — ข้อมูลสี/ชื่อมาจาก STAGE_META ใน finance-common.js (fdStage ก็อยู่ที่นั่น) */
var FD_STATS = STAGE_ORDER.map(function(k) { var m = STAGE_META[k]; return { k: k, label: m.label, color: m.color, icon: m.icon }; });

/* ปุ่มที่ผู้ใช้คนนี้กดได้กับเอกสารนี้ — ทุกขั้น (1-3) กด "ส่งกลับแก้ไข" ได้ตอนที่เอกสารอยู่ในขั้นนั้น */
function actionsFor(d) {
  var out = [], st = stepsOf(d);
  if (canStep('s1')) {
    if (d.s1 === 'processing') {
      out.push({ sk: 's1', act: 'revision', label: 'ส่งกลับแก้ไข', cls: 'warn' });
      out.push({ sk: 's1', act: 'approve',  label: 'อนุมัติเอกสาร', cls: 'ok' });
    } else if (d.s1 === 'revision') {
      out.push({ sk: 's1', act: 'resume', label: 'แก้ไขแล้ว → กำลังดำเนินการ', cls: 'ok' });
    } else if (d.s1 === 'approved' && d.s2 !== 'approved' && d.s2 !== 'revision') {
      out.push({ sk: 's1', act: 'revert', label: 'ยกเลิกการอนุมัติ', cls: 'plain', revert: true });
    }
  }
  if (st.indexOf('s2') > -1 && canStep('s2') && d.s1 === 'approved') {
    if (d.s2 === 'revision') {
      out.push({ sk: 's2', act: 'resume', label: 'แก้ไขแล้ว → รอเบิก/ออกเช็ค', cls: 'ok' });
    } else if (d.s2 !== 'approved') {
      out.push({ sk: 's2', act: 'revision', label: 'ส่งกลับแก้ไข', cls: 'warn' });
      out.push({ sk: 's2', act: 'approve',  label: 'อนุมัติ (ออกเช็คแล้ว)', cls: 'ok' });
    } else if (d.s3 !== 'paid' && d.s3 !== 'revision') {
      out.push({ sk: 's2', act: 'revert', label: 'ยกเลิกการอนุมัติ', cls: 'plain', revert: true });
    }
  }
  if (st.indexOf('s3') > -1 && canStep('s3') && d.s2 === 'approved') {
    if (d.s3 === 'revision') {
      out.push({ sk: 's3', act: 'resume', label: 'แก้ไขแล้ว → ค้างส่งใช้เงินยืม', cls: 'ok' });
    } else if (d.s3 !== 'paid') {
      out.push({ sk: 's3', act: 'revision', label: 'ส่งกลับแก้ไข', cls: 'warn' });
      out.push({ sk: 's3', act: 'approve',  label: 'ยืนยันชำระแล้ว', cls: 'ok' });
    } else {
      out.push({ sk: 's3', act: 'revert', label: 'ยกเลิกสถานะชำระแล้ว', cls: 'plain', revert: true });
    }
  }
  return out;
}
function pendingForMe(d) {
  return actionsFor(d).some(function(a) { return !a.revert && a.act !== 'revision'; });
}

function renderPage() {
  return (
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title-row">' +
          '<div class="page-icon purple"><i data-lucide="file-check" style="width:20px;height:20px;color:white;"></i></div>' +
          '<h1 class="page-title">จัดการเอกสารการเงินและพัสดุ</h1>' +
        '</div>' +
        '<p class="page-sub">ตรวจและกดยืนยันสถานะเอกสารของครูทีละขั้น พร้อมทะเบียนคุมลูกหนี้เงินยืม</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<a class="btn-secondary" href="finance-user.html" style="text-decoration:none;display:inline-block;">ส่งเอกสารของฉัน</a>' +
      '</div>' +
    '</div>' +
    '<div class="sub-tab-bar purple scroll" id="fdTabs" style="margin-bottom:var(--gap-section);"></div>' +
    '<div class="fd-stats" id="fdStats"></div>' +
    '<div class="card fd-filter-card">' +
      '<div class="fd-toolbar">' +
        '<input type="text" class="search-box" id="fdSearch" placeholder="ค้นหาชื่อ / โครงการ / เลขที่สัญญา" oninput="onSearch(this.value)">' +
        '<span class="fd-ledger-ctl" id="fdLedgerCtl"></span>' +
      '</div>' +
      '<div class="fd-catbar" id="fdCats"></div>' +
    '</div>' +
    '<div class="fd-list" id="fdList">' + emptyHtml('กำลังโหลด...') + '</div>'
  );
}
function renderDenied() {
  return '<div class="card" style="padding:48px 20px;text-align:center;">' +
    '<h2 style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:8px;">ไม่มีสิทธิ์เข้าหน้านี้</h2>' +
    '<p style="color:var(--text2);font-size:14px;margin-bottom:18px;">หน้านี้สำหรับเจ้าหน้าที่ที่ได้รับสิทธิ์ระบบเอกสารการเงินและพัสดุเท่านั้น</p>' +
    '<a href="index.html" class="btn-primary" style="text-decoration:none;display:inline-block;">กลับหน้าแรก</a></div>';
}

/* วาดใหม่ทุกส่วน (เรียกตอนข้อมูลเปลี่ยน / เปลี่ยนแท็บ) */
function refreshAll() {
  renderTabs(); renderStats(); renderCats(); renderToolbar(); renderList();
}
function renderTabs() {
  var el = document.getElementById('fdTabs'); if (!el) return;
  var todo = allDocs.filter(pendingForMe).length;
  var tabs = [
    { k: 'todo',   l: 'รอฉันดำเนินการ', i: 'inbox',     n: todo },
    { k: 'all',    l: 'ทุกรายการ',      i: 'layers' },
    { k: 'ledger', l: 'ทะเบียนลูกหนี้',  i: 'book-open' }
  ];
  el.innerHTML = tabs.map(function(t) {
    return '<button class="sub-tab' + (activeTab === t.k ? ' active' : '') + '" onclick="setTab(\'' + t.k + '\')">' +
      '<i data-lucide="' + t.i + '" style="width:14px;height:14px;"></i> ' + t.l +
      (t.n ? '<span class="fd-count">' + t.n + '</span>' : '') + '</button>';
  }).join('');
  lucide.createIcons();
}
/* การ์ดสรุปตามสถานะ — กดเพื่อกรอง (กดซ้ำเพื่อยกเลิก) */
function renderStats() {
  var el = document.getElementById('fdStats'); if (!el) return;
  el.style.display = activeTab === 'ledger' ? 'none' : '';
  var n = {};
  allDocs.forEach(function(d) { var s = fdStage(d); n[s] = (n[s] || 0) + 1; });
  el.innerHTML = FD_STATS.map(function(s) {
    var on = activeTab !== 'todo' && stageFilter === s.k;
    return '<button type="button" class="stat-card fd-stat fd-cat-' + s.color + (on ? ' active' : '') + '" aria-pressed="' + on + '" onclick="setStageFilter(\'' + s.k + '\')">' +
      '<span class="fd-stat-ico"><i data-lucide="' + s.icon + '"></i></span>' +
      '<span><span class="fd-stat-n">' + (n[s.k] || 0) + '</span><span class="fd-stat-l">' + s.label + '</span></span>' +
    '</button>';
  }).join('');
  lucide.createIcons();
}
/* แถบเลือกหมวดหมู่ (แต่ละหมวดมีสีของตัวเอง) พร้อมจำนวนรายการ */
function renderCats() {
  var el = document.getElementById('fdCats'); if (!el) return;
  if (activeTab === 'ledger') { el.style.display = 'none'; return; }
  el.style.display = '';
  var rows = tabRows(), n = {};
  rows.forEach(function(d) { var k = catKeyOf(d); n[k] = (n[k] || 0) + 1; });
  function pill(key, color, icon, label, count) {
    return '<button type="button" class="fd-pill fd-cat-' + color + (catFilter === key ? ' active' : '') + '" aria-pressed="' + (catFilter === key) + '" onclick="setCat(\'' + key + '\')">' +
      '<i data-lucide="' + icon + '"></i>' + label + '<span class="n">' + count + '</span></button>';
  }
  el.innerHTML = pill('', 'all', 'layout-grid', 'ทุกหมวดหมู่', rows.length) +
    DOC_CAT_ORDER.map(function(k) { var c = DOC_CATS[k]; return pill(k, c.color, c.icon, c.label, n[k] || 0); }).join('') +
    ((stageFilter || catFilter) ? '<button type="button" class="fd-clear" onclick="clearFilters()"><i data-lucide="x"></i>ล้างตัวกรอง</button>' : '');
  lucide.createIcons();
}
/* ส่วนควบคุมของแท็บทะเบียนลูกหนี้ (เลือกปีงบประมาณ + ส่งออก) */
function renderToolbar() {
  var el = document.getElementById('fdLedgerCtl'); if (!el) return;
  if (activeTab !== 'ledger') { el.innerHTML = ''; return; }
  var years = {};
  allDocs.forEach(function(d) { if (typeOf(d.type).loan && d.contractNo) years[d.fiscalYear] = 1; });
  var ys = Object.keys(years).sort().reverse();
  if (!ledgerFY && ys.length) ledgerFY = ys[0];
  el.innerHTML = '<select onchange="ledgerFY=this.value;renderList()" aria-label="ปีงบประมาณ">' +
    ys.map(function(y) { return '<option value="' + y + '"' + (y === String(ledgerFY) ? ' selected' : '') + '>ปีงบประมาณ ' + y + '</option>'; }).join('') +
    '</select><button class="btn-secondary" onclick="exportLedger()">ส่งออก CSV</button>';
}
function onSearch(v) { searchQ = v.trim().toLowerCase(); renderCats(); renderList(); }
function setTab(k) {
  activeTab = k; searchQ = ''; stageFilter = '';
  var s = document.getElementById('fdSearch'); if (s) s.value = '';
  refreshAll();
}
function setStageFilter(k) {
  stageFilter = stageFilter === k && activeTab !== 'todo' ? '' : k;
  if (activeTab !== 'all') { activeTab = 'all'; searchQ = ''; var s = document.getElementById('fdSearch'); if (s) s.value = ''; }
  refreshAll();
}
function setCat(k) { catFilter = catFilter === k ? '' : k; renderCats(); renderList(); }
function clearFilters() { stageFilter = ''; catFilter = ''; refreshAll(); }
function matchQ(d) {
  if (!searchQ) return true;
  return [d.name, d.title, d.contractNo, typeOf(d.type).label, catOf(d).label].join(' ').toLowerCase().indexOf(searchQ) > -1;
}
/* รายการตามแท็บ + การ์ดสถานะ + คำค้น (ยังไม่กรองหมวดหมู่ — ใช้นับจำนวนบนแถบหมวดหมู่) */
function tabRows() {
  return allDocs.filter(function(d) {
    return (activeTab === 'all' || pendingForMe(d)) && (!stageFilter || fdStage(d) === stageFilter) && matchQ(d);
  });
}
function renderList() {
  var el = document.getElementById('fdList'); if (!el) return;
  if (activeTab === 'ledger') return renderLedger(el);
  var rows = tabRows().filter(function(d) { return !catFilter || catKeyOf(d) === catFilter; });
  if (!rows.length) {
    var filtered = stageFilter || catFilter || searchQ;
    el.innerHTML = emptyHtml(filtered ? 'ไม่พบรายการตามตัวกรองนี้' : (activeTab === 'todo' ? 'ไม่มีรายการที่รอคุณดำเนินการ' : 'ยังไม่มีรายการ'));
    return;
  }
  el.innerHTML = groupByCat(rows).map(function(g) {
    var c = DOC_CATS[g.key] || DOC_CAT_OTHER;
    return '<section class="fd-group fd-cat-' + c.color + '">' +
      '<div class="fd-group-h"><span class="fd-group-ico"><i data-lucide="' + c.icon + '"></i></span>' +
      '<span class="fd-group-t">' + esc2(c.label) + '</span>' +
      '<span class="fd-group-n">' + g.rows.length + ' รายการ</span></div>' +
      g.rows.map(adminRowHtml).join('') +
    '</section>';
  }).join('');
  lucide.createIcons();
}
/* จัดกลุ่มตามหมวดหมู่ (เรียงตาม DOC_CAT_ORDER) ในกลุ่มเรียงใหม่สุดไว้บน — หมวดที่ไม่รู้จักต่อท้าย */
function groupByCat(rows) {
  var map = {}, out = [];
  rows.forEach(function(d) { var k = catKeyOf(d); (map[k] = map[k] || []).push(d); });
  function newestFirst(a, b) {
    var ta = a.createdAt ? toDate(a.createdAt).getTime() : Date.now();
    var tb = b.createdAt ? toDate(b.createdAt).getTime() : Date.now();
    return tb - ta;
  }
  DOC_CAT_ORDER.forEach(function(k) {
    if (map[k]) { out.push({ key: k, rows: map[k].sort(newestFirst) }); delete map[k]; }
  });
  Object.keys(map).forEach(function(k) { out.push({ key: k, rows: map[k].sort(newestFirst) }); });
  return out;
}
/* การ์ดรายการของหน้าเจ้าหน้าที่ (แบบกะทัดรัด 2 บรรทัด):
   บรรทัด 1 = ป้ายหมวด + หัวข้อ + ยอดเงิน · บรรทัด 2 = ผู้ส่ง/วันที่ + แถบสีสถานะแต่ละขั้น */
function adminRowHtml(d) {
  var c = catOf(d);
  var bars = stepsOf(d).map(function(sk) {
    var i = stepInfo(d, sk);
    return '<span class="fd-bar t-' + i.tone + '" title="' + esc2(STEP_META[sk].name + ': ' + i.label) + '"><b>' + STEP_META[sk].short + '</b>' + esc2(i.label) + '</span>';
  }).join('');
  return '<div class="fd-card fd-cat-' + c.color + '" onclick="openDetail(\'' + d.id + '\')">' +
    '<div class="fd-card-l1">' +
      '<span class="fd-cat-chip" title="' + esc2(typeOf(d.type).label) + '"><i data-lucide="' + c.icon + '"></i>' + esc2(typeOf(d.type).label) + '</span>' +
      '<span class="fd-title">' + esc2(d.title) + '</span>' +
      (activeTab === 'all' && pendingForMe(d) ? '<span class="fd-mine">รอคุณ</span>' : '') +
      '<span class="fd-amt">฿' + fmtMoney(d.amount) + '</span>' +
    '</div>' +
    '<div class="fd-card-l2">' +
      '<span class="fd-meta"><span><i data-lucide="user"></i>' + esc2(d.name) + '</span>' +
        '<span><i data-lucide="calendar"></i>' + fmtD(d.createdAt || new Date()) + '</span>' +
        (d.contractNo ? '<span><i data-lucide="file-text"></i>' + esc2(d.contractNo) + '</span>' : '') + '</span>' +
      '<span class="fd-bars">' + bars + '</span>' +
    '</div>' +
  '</div>';
}

/* ── ทะเบียนลูกหนี้ (คอลัมน์ตรงกับสมุดเดิม) แยกกลุ่มตามประเภทสัญญา ── */
function ledgerRows() {
  return allDocs.filter(function(d) {
    return typeOf(d.type).loan && d.contractNo && String(d.fiscalYear) === String(ledgerFY) && matchQ(d);
  }).sort(function(a, b) { return parseInt(a.contractNo, 10) - parseInt(b.contractNo, 10); });
}
/* จัดกลุ่มรายการทะเบียนลูกหนี้ตาม type (loan_trip / loan_project) — เรียงตาม DOC_TYPES */
function groupLedgerRows(rows) {
  var map = {}, out = [];
  rows.forEach(function(d) { (map[d.type] = map[d.type] || []).push(d); });
  DOC_TYPES.forEach(function(t) { if (t.loan && map[t.key]) out.push({ type: t, rows: map[t.key] }); });
  return out;
}
function ledgerStatusBadge(d) {
  if (d.s3 === 'paid') return '<span class="fd-bar t-done"><i data-lucide="check-circle" style="width:11px;height:11px;"></i>ชำระแล้ว</span>';
  if (isOverdue(d))    return '<span class="fd-bar t-late"><i data-lucide="triangle-alert" style="width:11px;height:11px;"></i>เกินกำหนด</span>';
  return '<span class="fd-bar t-active"><i data-lucide="wallet" style="width:11px;height:11px;"></i>ค้างชำระ</span>';
}
function ledgerCardHtml(d, i) {
  var s = d.settle || {};
  var cat = DOC_CATS[typeOf(d.type).cat] || DOC_CAT_OTHER;
  var paid = d.s3 === 'paid';
  var settleRow = paid
    ? '<span><i data-lucide="calendar-check"></i>ส่งใช้ ' + fmtD(s.date) + '</span>' +
      (s.voucherNo ? '<span><i data-lucide="file-text"></i>' + esc2(s.voucherNo) + '</span>' : '') +
      (s.voucherAmount != null && s.voucherAmount !== '' ? '<span><i data-lucide="receipt"></i>฿' + fmtMoney(s.voucherAmount) + '</span>' : '')
    : '<span><i data-lucide="calendar-x"></i>ครบกำหนด ' + fmtD(d.dueDate) + '</span>';
  return '<div class="fd-card fd-cat-' + cat.color + '" onclick="openDetail(\'' + d.id + '\')">' +
    '<div class="fd-card-l1">' +
      '<span class="fd-cat-chip"><i data-lucide="file-text"></i>' + esc2(d.contractNo) + '</span>' +
      '<span class="fd-title">' + esc2(d.title) + '</span>' +
      ledgerStatusBadge(d) +
      '<span class="fd-amt">฿' + fmtMoney(d.amount) + '</span>' +
    '</div>' +
    '<div class="fd-card-l2">' +
      '<span class="fd-meta">' +
        '<span><i data-lucide="user"></i>' + esc2(d.name) + '</span>' +
        '<span><i data-lucide="calendar"></i>ยืม ' + fmtD(d.loanDate) + '</span>' +
        settleRow +
        (d.fundType ? '<span><i data-lucide="landmark"></i>' + esc2(d.fundType) + '</span>' : '') +
      '</span>' +
    '</div>' +
  '</div>';
}
function ledgerTableHtml(rows) {
  return '<div style="display:flex;flex-direction:column;gap:var(--gap-item);">' +
    rows.map(function(d, i) { return ledgerCardHtml(d, i); }).join('') +
  '</div>';
}
function renderLedger(el) {
  var rows = ledgerRows();
  if (!rows.length) { el.innerHTML = emptyHtml('ยังไม่มีสัญญายืมเงินที่อนุมัติในปีงบประมาณนี้'); return; }
  var groups = groupLedgerRows(rows);
  el.innerHTML = groups.map(function(g) {
    var cat = DOC_CATS[g.type.cat] || DOC_CAT_OTHER;
    return '<section class="fd-group fd-cat-' + cat.color + '">' +
      '<div class="fd-group-h">' +
        '<span class="fd-group-ico"><i data-lucide="' + cat.icon + '"></i></span>' +
        '<span class="fd-group-t">' + esc2(g.type.label) + '</span>' +
        '<span class="fd-group-n">' + g.rows.length + ' รายการ</span>' +
      '</div>' +
      ledgerTableHtml(g.rows) +
    '</section>';
  }).join('');
  lucide.createIcons();
}
function exportLedger() {
  var rows = ledgerRows();
  if (!rows.length) { showToast('ไม่มีข้อมูลให้ส่งออก', 'warn'); return; }
  function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
  var lines = [['ที่', 'ประเภท', 'วันที่ยืม', 'เลขที่สัญญา', 'ชื่อ-สกุล', 'กิจกรรม/โครงการ', 'จำนวนเงิน', 'วันครบกำหนด', 'วันที่ส่งใช้', 'เลขที่ใบสำคัญ', 'จำนวนเงินใบสำคัญ', 'เงินสด', 'ประเภทเงิน'].map(q).join(',')];
  rows.forEach(function(d, i) {
    var s = d.settle || {};
    lines.push([i + 1, typeOf(d.type).label, fmtD(d.loanDate), d.contractNo, d.name, d.title, d.amount, fmtD(d.dueDate),
      d.s3 === 'paid' ? fmtD(s.date) : 'ค้างชำระ', s.voucherNo || '', s.voucherAmount || '', s.cash || '', d.fundType].map(q).join(','));
  });
  var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ทะเบียนคุมลูกหนี้เงินยืม-' + ledgerFY + '.csv';
  a.click();
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
}

function renderDetail(d) { buildDetailHtml(d, actionsFor(d), '', '', true); }

/* ══════════════════════ ยืนยันแต่ละขั้น ══════════════════════ */
function openConfirm(id, sk, act) {
  var d = findDoc(id), meta = ACTIONS[sk + ':' + act]; if (!d || !meta) return;
  confirmCtx = { id: id, sk: sk, act: act, meta: meta };
  document.getElementById('confirmTitle').textContent = meta.title;
  document.getElementById('confirmSub').textContent = typeOf(d.type).label + ' — ' + d.name;
  document.getElementById('confirmBtn').textContent = meta.btn;
  document.getElementById('confirmNote').value = '';
  document.getElementById('confirmNoteLabel').textContent = meta.noteRequired ? 'ระบุสิ่งที่ต้องแก้ไข (จำเป็น)' : 'หมายเหตุ (ถ้ามี)';
  document.getElementById('settleBox').style.display = meta.settle ? 'block' : 'none';
  if (meta.settle) {
    document.getElementById('sDate').value = dateInputVal(new Date());
    document.getElementById('sVoucherNo').value = '';
    document.getElementById('sVoucherAmt').value = d.amount || '';
    document.getElementById('sCash').value = '';
  }
  openModal('confirmModal');
}
function submitConfirm() {
  var c = confirmCtx; if (!c) return;
  var note = document.getElementById('confirmNote').value.trim();
  if (c.meta.noteRequired && !note) { showToast('กรุณาระบุสิ่งที่ต้องแก้ไข', 'warn'); return; }
  var extra = null;
  if (c.meta.settle) {
    var sd = parseDateInput(document.getElementById('sDate').value);
    var va = parseFloat(document.getElementById('sVoucherAmt').value);
    var ca = parseFloat(document.getElementById('sCash').value);
    extra = {
      date: sd ? firebase.firestore.Timestamp.fromDate(sd) : firebase.firestore.Timestamp.now(),
      voucherNo: document.getElementById('sVoucherNo').value.trim(),
      voucherAmount: isNaN(va) ? null : va,
      cash: isNaN(ca) ? null : ca
    };
  }
  var btn = document.getElementById('confirmBtn'); btn.disabled = true;
  applyStep(c.id, c.sk, c.act, note, extra).then(function(res) {
    closeModal('confirmModal');
    showToast(res && res.contractNo ? 'อนุมัติแล้ว — ออกเลขที่สัญญา ' + res.contractNo : 'บันทึกสถานะแล้ว');
  }).catch(function(err) {
    console.error(err); showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
  }).then(function() { btn.disabled = false; });
}
/* คำนวณการเปลี่ยนสถานะ — คืน null ถ้า state ปัจจุบันไม่ตรงเงื่อนไข (กันกดซ้ำ/คนละเครื่อง) */
function computeUpdate(d, sk, act, extra) {
  var u = {}, FV = firebase.firestore.FieldValue;
  if (sk === 's1') {
    if (act === 'approve'  && d.s1 === 'processing') u.s1 = 'approved';
    if (act === 'revision' && d.s1 === 'processing') u.s1 = 'revision';
    if (act === 'resume'   && d.s1 === 'revision')   u.s1 = 'processing';
    if (act === 'revert'   && d.s1 === 'approved' && d.s2 !== 'approved' && d.s2 !== 'revision') u.s1 = 'processing';
  } else if (sk === 's2') {
    var s2Open = d.s1 === 'approved' && d.s2 !== 'approved' && d.s2 !== 'revision';
    if (act === 'approve'  && s2Open) u.s2 = 'approved';
    if (act === 'revision' && s2Open) u.s2 = 'revision';
    if (act === 'resume'   && d.s1 === 'approved' && d.s2 === 'revision') u.s2 = 'waiting';
    if (act === 'revert'   && d.s2 === 'approved' && d.s3 !== 'paid' && d.s3 !== 'revision') u.s2 = 'waiting';
  } else if (sk === 's3') {
    var s3Open = d.s2 === 'approved' && d.s3 !== 'paid' && d.s3 !== 'revision';
    if (act === 'approve'  && s3Open) { u.s3 = 'paid'; u.settle = extra || {}; }
    if (act === 'revision' && s3Open) u.s3 = 'revision';
    if (act === 'resume'   && d.s2 === 'approved' && d.s3 === 'revision') u.s3 = 'unpaid';
    if (act === 'revert'   && d.s3 === 'paid') { u.s3 = 'unpaid'; u.settle = FV.delete(); }
  }
  return Object.keys(u).length ? u : null;
}
function applyStep(docId, sk, act, note, extra) {
  if (!canStep(sk)) return Promise.reject(new Error('คุณไม่มีสิทธิ์ในขั้นตอนนี้'));
  var ref = db.collection('financeDocs').doc(docId), result = {};
  return db.runTransaction(function(tx) {
    return tx.get(ref).then(function(snap) {
      if (!snap.exists) throw new Error('ไม่พบเอกสาร');
      var d = snap.data();
      var u = computeUpdate(d, sk, act, extra);
      if (!u) throw new Error('สถานะของรายการเปลี่ยนไปแล้ว กรุณาปิดแล้วเปิดใหม่');
      var needNo = sk === 's1' && act === 'approve' && typeOf(d.type).loan && !d.contractNo;
      var cref = db.collection('counters').doc('finloan-' + d.fiscalYear);
      return (needNo ? tx.get(cref) : Promise.resolve(null)).then(function(cs) {
        if (needNo) {
          var n = (cs && cs.exists ? cs.data().n : 0) + 1;
          tx.set(cref, { n: n }, { merge: true });
          u.contractNo = result.contractNo = pad2(n) + '/' + d.fiscalYear;
        }
        var meta = ACTIONS[sk + ':' + act];
        u.history = (d.history || []).concat([{
          step: sk, text: meta.title, note: note || '',
          by: currentUser.displayName || currentUser.email, email: currentUser.email,
          at: firebase.firestore.Timestamp.now()
        }]);
        u.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        tx.update(ref, u);
      });
    });
  }).then(function() { return result; });
}

/* ══════════════════════ INIT ══════════════════════ */
buildPage({
  appId:        'myApp',
  navSubtitle:  'จัดการเอกสารการเงินและพัสดุ',
  navTheme:     'dark',
  activePage:   'finance-admin',
  requireAdmin: 'admin',

  onAuth: function(user, contentEl) {
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);

    loadFinRoles(user).then(function() {
      if (!isStaff()) { contentEl.innerHTML = renderDenied(); return; }
      activeTab = 'todo';
      contentEl.innerHTML = renderPage();
      lucide.createIcons();
      setupScrollTopButton();
      refreshAll();
      listenDocs(db.collection('financeDocs').orderBy('createdAt', 'desc').limit(500), refreshAll);
    });
  }
});
