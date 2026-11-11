/* ══════════════════════════════════════════════════════════════
   finance-admin.js — หน้าเจ้าหน้าที่: กดยืนยันแต่ละขั้น + ทะเบียนลูกหนี้
   (ต้องโหลด finance-common.js ก่อน) สิทธิ์ตาม admins/{email}.permissions (financeCheck = ขั้น 1, financeCheque = ขั้น 2, financeLoan = ขั้น 3-4)
   ══════════════════════════════════════════════════════════════ */
var activeTab = 'todo';
var searchQ = '';
var ledgerFY = '';
var confirmCtx = null;
var stageFilter = '';   /* '' | review | revision | cover | approve | loan | late | done  (คลิกจากการ์ดสรุป) */
var deptFilter = 'finance';   /* 'finance' | 'supply' — ฝ่ายที่กำลังดูอยู่ (สลับได้จากแถบด้านบน) */
var catFilter = '';     /* '' | loan | claim | clear | purchase | payroll         (คลิกจากแถบหมวดหมู่) */

/* การ์ดสรุปด้านบน: แยกสีตามสถานะ — ข้อมูลสี/ชื่อมาจาก STAGE_META ใน finance-common.js (fdStage ก็อยู่ที่นั่น) */
var FD_STATS = STAGE_ORDER.map(function(k) { var m = STAGE_META[k]; return { k: k, label: m.label, color: m.color, icon: m.icon }; });

/* ปุ่มที่ผู้ใช้คนนี้กดได้กับเอกสารนี้ — ทุกขั้น (1-4) กด "ส่งกลับแก้ไข" ได้ตอนที่เอกสารอยู่ในขั้นนั้น */
var BTN_LABEL = {
  s1: { approve: 'อนุมัติเอกสาร',            resume: 'แก้ไขแล้ว → กำลังดำเนินการ' },
  s2: { approve: 'เสนอผู้บริหารแล้ว',         resume: 'แก้ไขแล้ว → รอทำใบปะหน้า/เสนอผู้บริหาร' },
  s3: { approve: 'อนุมัติเอกสารขอเบิกเงิน',   resume: 'แก้ไขแล้ว → รออนุมัติขอเบิกเงิน' },
  s4: { approve: 'ยืนยันชำระแล้ว',           resume: 'แก้ไขแล้ว → ค้างส่งใช้เงินยืม', revert: 'ยกเลิกสถานะชำระแล้ว' }
};
/* ขั้นถัดไปเริ่มแล้ว (อนุมัติแล้ว/กำลังถูกส่งกลับ) → ห้ามยกเลิกการอนุมัติขั้นนี้ */
function nextBlocksRevert(d, sk) {
  var st = stepsOf(d), n = st[st.indexOf(sk) + 1];
  return !!n && (d[n] === STEP_DONE[n] || d[n] === 'revision');
}
function actionsFor(d) {
  var out = [];
  stepsOf(d).forEach(function(sk) {
    if (!canStep(sk) || !prevDone(d, sk)) return;
    var L = BTN_LABEL[sk];
    if (d[sk] === 'revision') {
      out.push({ sk: sk, act: 'resume', label: L.resume, cls: 'ok' });
    } else if (isOpen(d, sk)) {
      out.push({ sk: sk, act: 'revision', label: 'ส่งกลับแก้ไข', cls: 'warn' });
      out.push({ sk: sk, act: 'approve',  label: L.approve, cls: 'ok' });
    } else if (d[sk] === STEP_DONE[sk] && !nextBlocksRevert(d, sk)) {
      out.push({ sk: sk, act: 'revert', label: L.revert || 'ยกเลิกการอนุมัติ', cls: 'plain', revert: true });
    }
  });
  return out;
}
/* เอกสารเฉพาะฝ่ายที่เลือกอยู่ — ทุกส่วนของหน้า (แท็บ/การ์ดสรุป/หมวด/ทะเบียน) ใช้ชุดนี้ */
function deptDocs() { return allDocs.filter(function(d) { return deptKeyOf(d) === deptFilter; }); }
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
        '<p class="page-sub">ตรวจและกดยืนยันสถานะเอกสารของครูทีละขั้น แยกเป็นเอกสารฝ่ายการเงินและฝ่ายพัสดุ</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        (myRoles.sa || myRoles.s1 ? '<button class="btn-secondary" onclick="syncClearedLoans()" title="ปิดสัญญายืมที่ล้างหนี้อนุมัติแล้วแต่ยังค้างสถานะ">ซิงค์สถานะสัญญายืม</button>' : '') +
        '<a class="btn-secondary" href="finance-user.html" style="text-decoration:none;display:inline-block;">ส่งเอกสารของฉัน</a>' +
      '</div>' +
    '</div>' +
    '<div class="fd-depts" id="fdDepts"></div>' +
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
  renderDepts(); renderTabs(); renderStats(); renderCats(); renderToolbar(); renderList();
}
/* ตัวสลับฝ่าย: การเงิน | พัสดุ พร้อมจำนวนรายการที่รอฉันดำเนินการของแต่ละฝ่าย */
function renderDepts() {
  var el = document.getElementById('fdDepts'); if (!el) return;
  var todo = {}, total = {};
  allDocs.forEach(function(d) {
    var k = deptKeyOf(d);
    total[k] = (total[k] || 0) + 1;
    if (pendingForMe(d)) todo[k] = (todo[k] || 0) + 1;
  });
  el.innerHTML = DEPT_ORDER.map(function(k) {
    var dp = DEPTS[k], c = DOC_CATS[dp.cats[0]];
    var sub = dp.cats.map(function(ck) { return DOC_CATS[ck].label; }).join(' · ');
    return '<button type=\"button\" class=\"fd-dept fd-cat-' + (k === 'supply' ? 'amber' : 'sky') + (deptFilter === k ? ' active' : '') + '\" aria-pressed=\"' + (deptFilter === k) + '\" onclick=\"setDept(\'' + k + '\')\">' +
      '<span class=\"fd-dept-ico\"><i data-lucide=\"' + dp.icon + '\"></i></span>' +
      '<span><span class=\"fd-dept-t\">เอกสาร' + dp.label + '</span><span class=\"fd-dept-s\">' + esc2(sub) + ' · ทั้งหมด ' + (total[k] || 0) + ' รายการ</span></span>' +
      (todo[k] ? '<span class=\"fd-dept-n\" title=\"รอคุณดำเนินการ\">' + todo[k] + '</span>' : '') +
    '</button>';
  }).join('');
  lucide.createIcons();
}
function setDept(k) {
  if (!DEPTS[k] || deptFilter === k) return;
  deptFilter = k; catFilter = ''; stageFilter = ''; searchQ = '';
  /* ทะเบียนลูกหนี้มีเฉพาะสัญญายืมเงิน (ฝ่ายการเงิน) */
  if (k !== 'finance' && activeTab === 'ledger') activeTab = 'todo';
  var s = document.getElementById('fdSearch'); if (s) s.value = '';
  refreshAll();
}
function renderTabs() {
  var el = document.getElementById('fdTabs'); if (!el) return;
  var todo = deptDocs().filter(pendingForMe).length;
  var tabs = [
    { k: 'todo',   l: 'รอดำเนินการ', i: 'inbox',     n: todo },
    { k: 'all',    l: 'รายการทั้งหมด',      i: 'layers' },
    { k: 'ledger', l: 'ทะเบียนลูกหนี้',  i: 'book-open' }
  ].filter(function(t) { return t.k !== 'ledger' || deptFilter === 'finance'; });
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
  deptDocs().forEach(function(d) { var s = fdStage(d); n[s] = (n[s] || 0) + 1; });
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
    return '<button type="button" class="fd-pill fd-cat-' + color + (catFilter === key ? ' active' : '') + '" aria-pressed="' + (catFilter === key) + '" title="' + esc2(catFull(DOC_CATS[key]) || label) + '" onclick="setCat(\'' + key + '\')">' +
      '<i data-lucide="' + icon + '"></i>' + label + '<span class="n">' + count + '</span></button>';
  }
  el.innerHTML = pill('', 'all', 'layout-grid', 'ทุกหมวดหมู่ของ' + DEPTS[deptFilter].label, rows.length) +
    DOC_CAT_ORDER.filter(function(k) { return DEPTS[deptFilter].cats.indexOf(k) > -1; }).map(function(k) { var c = DOC_CATS[k]; return pill(k, c.color, c.icon, c.label, n[k] || 0); }).join('') +
    ((stageFilter || catFilter) ? '<button type="button" class="fd-clear" onclick="clearFilters()"><i data-lucide="x"></i>ล้างตัวกรอง</button>' : '');
  lucide.createIcons();
}
/* ส่วนควบคุมของแท็บทะเบียนลูกหนี้ (เลือกปีงบประมาณ + ส่งออก) */
function renderToolbar() {
  var el = document.getElementById('fdLedgerCtl'); if (!el) return;
  if (activeTab !== 'ledger') { el.innerHTML = ''; return; }
  var years = {};
  deptDocs().forEach(function(d) { if (typeOf(d.type).loan && d.contractNo) years[d.fiscalYear] = 1; });
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
  return deptDocs().filter(function(d) {
    return (activeTab === 'all' || pendingForMe(d)) && (!stageFilter || fdStage(d) === stageFilter) && matchQ(d);
  });
}
function renderList() {
  var el = document.getElementById('fdList'); if (!el) return;
  if (activeTab === 'ledger') return renderLedger(el);
  var rows = tabRows().filter(function(d) { return !catFilter || catKeyOf(d) === catFilter; });
  if (!rows.length) {
    var filtered = stageFilter || catFilter || searchQ;
    el.innerHTML = emptyHtml(filtered ? 'ไม่พบรายการตามตัวกรองนี้' : (activeTab === 'todo' ? 'ไม่มีรายการ' + DEPTS[deptFilter].label + 'ที่รอคุณดำเนินการ' : 'ยังไม่มีรายการเอกสาร' + DEPTS[deptFilter].label));
    return;
  }
  el.innerHTML = groupByCat(rows).map(function(g) {
    var c = DOC_CATS[g.key] || DOC_CAT_OTHER;
    return '<section class="fd-group fd-cat-' + c.color + '">' +
      '<div class="fd-group-h"><span class="fd-group-ico"><i data-lucide="' + c.icon + '"></i></span>' +
      '<span class="fd-group-t">' + esc2(catFull(c)) + '</span>' +
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
  return deptDocs().filter(function(d) {
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
/* ชื่อย่อประเภทเงินสำหรับคอลัมน์แคบในตาราง (เอาเมาส์ชี้ดูชื่อเต็ม / ส่งออก CSV ใช้ชื่อเต็ม) */
function fundShort(f) {
  return String(f || '').replace(/^เงินอุดหนุนค่าจัดการเรียนการสอน$/, 'อุดหนุนค่าจัดการเรียนการสอน').replace(/^เงิน/, '');
}
function ledgerStatusBadge(d) {
  if (d.s4 === 'paid') return '<span class="fd-bar t-done">ชำระแล้ว</span>';
  if (isOverdue(d))    return '<span class="fd-bar t-late">เกินกำหนด</span>';
  return '<span class="fd-bar t-active">ค้างชำระ</span>';
}
function ledgerTableHtml(rows) {
  var THEAD = '<thead><tr>' +
    '<th style="width:36px">ที่</th>' +
    '<th>วันที่ยืม</th>' +
    '<th>เลขที่สัญญา</th>' +
    '<th>ชื่อ-สกุล</th>' +
    '<th class="c-title">กิจกรรม/โครงการ</th>' +
    '<th class="num">จำนวนเงิน</th>' +
    '<th>วันครบกำหนด</th>' +
    '<th>สถานะ</th>' +
    '<th>วันที่ส่งใช้</th>' +
    '<th>เลขที่ใบสำคัญ</th>' +
    '<th class="num">ใบสำคัญ (บาท)</th>' +
    '<th class="num">เงินสด</th>' +
    '<th>ประเภทเงิน</th>' +
    '</tr></thead>';
  var body = rows.map(function(d, i) {
    var s = d.settle || {};
    var late = isOverdue(d);
    var rowCls = d.s4 === 'paid' ? 'fd-lrow-done' : (late ? 'fd-lrow-late' : 'fd-lrow-open');
    return '<tr class="' + rowCls + '" onclick="openDetail(\'' + d.id + '\')">' +
      '<td style="color:var(--text3);font-size:12px;text-align:center">' + (i + 1) + '</td>' +
      '<td>' + fmtD(d.loanDate) + '</td>' +
      '<td><b>' + esc2(d.contractNo) + '</b></td>' +
      '<td class="c-name">' + esc2(d.name) + '</td>' +
      '<td class="c-title" title="' + esc2(d.title) + '"><span>' + esc2(d.title) + '</span></td>' +
      '<td class="num" style="font-weight:800">฿' + fmtMoney(d.amount) + '</td>' +
      '<td>' + fmtD(d.dueDate) + '</td>' +
      '<td>' + ledgerStatusBadge(d) + '</td>' +
      '<td>' + (d.s4 === 'paid' ? fmtD(s.date) : '') + '</td>' +
      '<td>' + esc2(s.voucherNo || '') + '</td>' +
      '<td class="num">' + (s.voucherAmount != null && s.voucherAmount !== '' ? fmtMoney(s.voucherAmount) : '') + '</td>' +
      '<td class="num">' + (s.cash ? fmtMoney(s.cash) : '') + '</td>' +
      '<td title="' + esc2(d.fundType) + '">' + esc2(fundShort(d.fundType)) + '</td></tr>';
  }).join('');
  return '<div class="tbl-wrap fd-ledger-wrap"><table class="data-table fd-ledger">' + THEAD + '<tbody>' + body + '</tbody></table></div>';
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
      d.s4 === 'paid' ? fmtD(s.date) : 'ค้างชำระ', s.voucherNo || '', s.voucherAmount || '', s.cash || '', d.fundType].map(q).join(','));
  });
  var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ทะเบียนคุมลูกหนี้เงินยืม-' + ledgerFY + '.csv';
  a.click();
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
}

/* แก้ไข/ลบข้อมูลเอกสาร: SuperAdmin และผู้ตรวจเอกสาร (ขั้น 1) — ตรงกับ firestore.rules */
function canManageDocs() { return myRoles.sa || myRoles.s1; }
function manageHtml(d) {
  if (!canManageDocs()) return '';
  return '<div class="fd-actions" style="margin-top:16px;">' +
    '<button class="' + FD_BTN.edit + '" onclick="openEditForm(\'' + d.id + '\')">แก้ไขข้อมูล</button>' +
    '<button class="' + FD_BTN.danger + '" onclick="deleteDocStaff(\'' + d.id + '\')">ลบรายการ</button></div>';
}
function renderDetail(d) { buildDetailHtml(d, actionsFor(d), manageHtml(d), '', true); }

/* ══════════════════════ แก้ไข / ลบ โดยเจ้าหน้าที่ ══════════════════════ */
var staffEditId = null;
function openEditForm(id) {
  var d = findDoc(id); if (!d || !canManageDocs()) return;
  var t = typeOf(d.type);
  staffEditId = id;
  var typeSel = document.getElementById('fType');
  typeSel.innerHTML = '<option>' + esc2(t.label) + '</option>'; typeSel.disabled = true;
  var funds = FUNDS.slice(); if (d.fundType && funds.indexOf(d.fundType) < 0) funds.push(d.fundType);
  document.getElementById('fFund').innerHTML = funds.map(function(f) { return '<option>' + esc2(f) + '</option>'; }).join('');
  document.getElementById('formSub').textContent = t.label + ' — ' + (d.contractNo ? 'สัญญาเลขที่ ' + d.contractNo + ' — ' : '') + d.name;
  document.getElementById('fName').value = d.name || '';
  document.getElementById('fTitle').value = d.title || '';
  document.getElementById('fAmount').value = d.amount || '';
  document.getElementById('fFund').value = d.fundType || funds[0];
  document.getElementById('fNote').value = d.note || '';
  document.getElementById('fLoanBox').style.display = t.loan ? 'grid' : 'none';
  if (t.loan) {
    document.getElementById('fLoanDate').value = dateInputVal(d.loanDate);
    document.getElementById('fDueDate').value = dateInputVal(d.dueDate);
  }
  document.getElementById('fClearBox').style.display = t.clear ? 'block' : 'none';
  if (t.clear) {
    var opts = ['<option value="">— ไม่ระบุ —</option>'];
    allDocs.filter(function(x) {
      return x.uid === d.uid && typeOf(x.type).loan && x.contractNo && (x.s4 !== 'paid' || x.contractNo === d.refContractNo);
    }).forEach(function(x) {
      opts.push('<option value="' + esc2(x.contractNo) + '"' + (x.contractNo === d.refContractNo ? ' selected' : '') + '>' +
        esc2(x.contractNo + ' — ' + (x.title || '').slice(0, 50)) + '</option>');
    });
    document.getElementById('fRef').innerHTML = opts.join('');
  }
  closeModal('detailModal');
  openModal('formModal');
}
function saveStaffEdit() {
  var d = findDoc(staffEditId); if (!d || !canManageDocs()) return;
  var t = typeOf(d.type);
  var name = document.getElementById('fName').value.trim();
  var title = document.getElementById('fTitle').value.trim();
  var amount = parseFloat(document.getElementById('fAmount').value);
  if (!name || !title) { showToast('กรอกชื่อและกิจกรรม/โครงการให้ครบ', 'warn'); return; }
  if (!(amount > 0)) { showToast('จำนวนเงินต้องมากกว่า 0', 'warn'); return; }
  var TS = firebase.firestore.Timestamp, FV = firebase.firestore.FieldValue;
  var upd = { name: name, title: title, amount: amount, fundType: document.getElementById('fFund').value,
    note: document.getElementById('fNote').value.trim(),
    refContractNo: t.clear ? document.getElementById('fRef').value : '',
    updatedAt: FV.serverTimestamp(),
    history: FV.arrayUnion({ step: 'doc', text: 'เจ้าหน้าที่แก้ไขข้อมูล', note: '', by: currentUser.displayName || currentUser.email, email: currentUser.email, at: TS.now() }) };
  if (t.loan) {
    var loanDate = parseDateInput(document.getElementById('fLoanDate').value);
    var dueDate  = parseDateInput(document.getElementById('fDueDate').value);
    if (!loanDate || !dueDate) { showToast('กรอกวันที่ยืมและวันครบกำหนด', 'warn'); return; }
    if (dueDate < loanDate) { showToast('วันครบกำหนดต้องไม่ก่อนวันที่ยืม', 'warn'); return; }
    upd.loanDate = TS.fromDate(loanDate); upd.dueDate = TS.fromDate(dueDate);
  }
  var btn = document.getElementById('formSaveBtn'); btn.disabled = true;
  db.collection('financeDocs').doc(staffEditId).update(upd).then(function() {
    closeModal('formModal'); showToast('บันทึกการแก้ไขแล้ว');
    openDetail(staffEditId);
  }).catch(function(err) {
    console.error(err); showToast('บันทึกไม่สำเร็จ: ' + (err.code || err.message), 'error');
  }).then(function() { btn.disabled = false; });
}
function deleteDocStaff(id) {
  var d = findDoc(id); if (!d || !canManageDocs()) return;
  var msg = 'ลบรายการ "' + (d.title || '').slice(0, 40) + '" ของ ' + d.name + ' ใช่หรือไม่?\nการลบแล้วกู้คืนไม่ได้';
  if (d.contractNo) msg += '\n\nเอกสารนี้ออกเลขที่สัญญา ' + d.contractNo + ' แล้ว การลบจะทำให้เลขที่สัญญาในทะเบียนลูกหนี้ขาดหาย';
  if (!confirm(msg)) return;
  db.collection('financeDocs').doc(id).delete()
    .then(function() { closeModal('detailModal'); detailId = null; showToast('ลบรายการแล้ว'); })
    .catch(function(err) { showToast('ลบไม่สำเร็จ: ' + (err.code || err.message), 'error'); });
}

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
    if (res && res.autoSettled) showToast('อนุมัติแล้ว — ปิดสัญญายืมเงิน ' + res.autoSettled + ' อัตโนมัติ');
    else if (res && res.autoReverted) showToast('ยกเลิกแล้ว — สัญญายืมเงิน ' + res.autoReverted + ' กลับเป็นค้างส่งใช้');
    else if (res && res.autoMissing) showToast('อนุมัติแล้ว แต่ไม่พบสัญญายืมเงิน ' + res.autoMissing + ' ของผู้ยืมคนนี้ กรุณาปิดสัญญาเอง', 'warn');
    else if (res && res.autoSkipped) showToast('อนุมัติแล้ว แต่ยังไม่ปิดสัญญา ' + res.autoSkipped + ' อัตโนมัติ (สัญญาอยู่ระหว่างแก้ไข) กรุณาปิดเอง', 'warn');
    else showToast(res && res.contractNo ? 'อนุมัติแล้ว — ออกเลขที่สัญญา ' + res.contractNo : 'บันทึกสถานะแล้ว');
  }).catch(function(err) {
    console.error(err); showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
  }).then(function() { btn.disabled = false; });
}
/* คำนวณการเปลี่ยนสถานะ — คืน null ถ้า state ปัจจุบันไม่ตรงเงื่อนไข (กันกดซ้ำ/คนละเครื่อง) */
function computeUpdate(d, sk, act, extra) {
  var u = {}, FV = firebase.firestore.FieldValue;
  if (stepsOf(d).indexOf(sk) < 0 || !prevDone(d, sk)) return null;
  var cur = d[sk];
  if (act === 'approve' && isOpen(d, sk)) {
    u[sk] = STEP_DONE[sk];
    if (sk === 's4') u.settle = extra || {};
  } else if (act === 'revision' && isOpen(d, sk)) {
    u[sk] = 'revision';
  } else if (act === 'resume' && cur === 'revision') {
    u[sk] = STEP_INIT[sk];
  } else if (act === 'revert' && cur === STEP_DONE[sk] && !nextBlocksRevert(d, sk)) {
    u[sk] = STEP_INIT[sk];
    if (sk === 's4') u.settle = FV.delete();
  }
  return Object.keys(u).length ? u : null;
}
/* เอกสารยืมเงินที่เอกสารล้างหนี้ฉบับนี้อ้างถึง (ของครูคนเดียวกัน + เลขสัญญาตรงกัน) */
function findLoanFor(d) {
  var found = null;
  allDocs.forEach(function(x) {
    if (x.uid === d.uid && typeOf(x.type).loan && x.contractNo && x.contractNo === d.refContractNo) found = x;
  });
  return found;
}
/* หา id สัญญายืมเงินที่เอกสารล้างหนี้อ้างถึง — หาใน allDocs ก่อน ถ้าไม่เจอ (เช่น เก่าเกิน limit 500 ที่โหลดมา) ค้นจาก Firestore ตรงๆ */
function findLoanId(d) {
  var local = findLoanFor(d);
  if (local) return Promise.resolve(local.id);
  if (!d.refContractNo || !d.uid) return Promise.resolve(null);
  return db.collection('financeDocs').where('uid', '==', d.uid).where('contractNo', '==', d.refContractNo).get()
    .then(function(qs) {
      var id = null;
      qs.forEach(function(s) { if (typeOf(s.data().type).loan) id = s.id; });
      return id;
    }).catch(function(err) { console.error('findLoanId', err); return null; });
}
function applyStep(docId, sk, act, note, extra) {
  if (!canStep(sk)) return Promise.reject(new Error('คุณไม่มีสิทธิ์ในขั้นตอนนี้'));
  var ref = db.collection('financeDocs').doc(docId), result = {};
  var pre = findDoc(docId);
  var preLink = !!pre && sk === 's1' && (act === 'approve' || act === 'revert') && typeOf(pre.type).clear && !!pre.refContractNo;
  return (preLink ? findLoanId(pre) : Promise.resolve(null)).then(function(loanId) {
  return db.runTransaction(function(tx) {
    return tx.get(ref).then(function(snap) {
      if (!snap.exists) throw new Error('ไม่พบเอกสาร');
      var d = snap.data();
      var u = computeUpdate(d, sk, act, extra);
      if (!u) throw new Error('สถานะของรายการเปลี่ยนไปแล้ว กรุณาปิดแล้วเปิดใหม่');
      var needNo = sk === 's1' && act === 'approve' && typeOf(d.type).loan && !d.contractNo;
      var cref = db.collection('counters').doc('finloan-' + d.fiscalYear);
      /* ล้างหนี้ (ขั้น 1) อนุมัติ/ยกเลิกอนุมัติ → ปรับสถานะสัญญายืมเงินที่เกี่ยวข้องอัตโนมัติ */
      var linkClear = sk === 's1' && (act === 'approve' || act === 'revert') && typeOf(d.type).clear && !!d.refContractNo;
      var lref = linkClear && loanId ? db.collection('financeDocs').doc(loanId) : null;
      if (linkClear && act === 'approve' && !lref) result.autoMissing = d.refContractNo;   /* ไม่พบสัญญาที่อ้างถึง — แจ้งให้ปิดเอง ไม่เงียบ */
      return Promise.all([
        needNo ? tx.get(cref) : Promise.resolve(null),
        lref ? tx.get(lref) : Promise.resolve(null)
      ]).then(function(rd) {
        var cs = rd[0], ls = rd[1];
        var by = currentUser.displayName || currentUser.email, nowTs = firebase.firestore.Timestamp.now();
        var FV = firebase.firestore.FieldValue;
        if (needNo) {
          var n = (cs && cs.exists ? cs.data().n : 0) + 1;
          tx.set(cref, { n: n }, { merge: true });
          u.contractNo = result.contractNo = pad2(n) + '/' + d.fiscalYear;
        }
        var meta = ACTIONS[sk + ':' + act];
        u.history = (d.history || []).concat([{
          step: sk, text: meta.title, note: note || '',
          by: by, email: currentUser.email, at: nowTs
        }]);
        u.updatedAt = FV.serverTimestamp();
        tx.update(ref, u);

        if (linkClear) {
          var ld = ls && ls.exists ? ls.data() : null;
          if (act === 'approve') {
            if (ld && ld.s3 === 'approved' && ld.s4 === 'unpaid') {
              tx.update(lref, {
                s4: 'paid',
                settle: { date: nowTs, voucherNo: '', voucherAmount: null, cash: null, auto: true, clearDocId: docId, clearTitle: d.title || '' },
                history: (ld.history || []).concat([{
                  step: 's4', text: 'ปิดสัญญายืมเงินอัตโนมัติ (อนุมัติเอกสารล้างหนี้แล้ว)', note: d.title || '',
                  by: by, email: currentUser.email, at: nowTs
                }]),
                updatedAt: FV.serverTimestamp()
              });
              result.autoSettled = ld.contractNo;
            } else if (ld && ld.s4 !== 'paid') {
              result.autoSkipped = ld.contractNo;   /* เช่น สัญญาถูกส่งกลับแก้ไขอยู่ — ให้ปิดเองที่ขั้นสัญญายืมเงิน */
            }
          } else if (ld && ld.s4 === 'paid' && ld.settle && ld.settle.auto === true && ld.settle.clearDocId === docId) {
            /* ย้อนเฉพาะสัญญาที่ระบบปิดให้จากเอกสารนี้ — ไม่แตะสัญญาที่เจ้าหน้าที่กดปิดเอง */
            tx.update(lref, {
              s4: 'unpaid', settle: FV.delete(),
              history: (ld.history || []).concat([{
                step: 's4', text: 'ยกเลิกการปิดสัญญาอัตโนมัติ (ยกเลิกอนุมัติเอกสารล้างหนี้)', note: '',
                by: by, email: currentUser.email, at: nowTs
              }]),
              updatedAt: FV.serverTimestamp()
            });
            result.autoReverted = ld.contractNo;
          }
        }
      });
    });
  }).then(function() { return result; });
  });
}

/* ปิดสัญญายืมเงินที่ค้างอยู่ แต่เอกสารล้างหนี้ที่อ้างถึงอนุมัติ (ขั้น 1) ไปแล้ว — ใช้แก้ข้อมูลเก่าที่อนุมัติก่อนมีระบบปิดอัตโนมัติ */
function syncClearedLoans() {
  var FV = firebase.firestore.FieldValue, TS = firebase.firestore.Timestamp;
  var by = currentUser.displayName || currentUser.email;
  var pairs = [];
  allDocs.forEach(function(c) {
    if (!typeOf(c.type).clear || c.s1 !== 'approved' || !c.refContractNo) return;
    var l = findLoanFor(c);
    if (l && l.s3 === 'approved' && l.s4 !== 'paid' && l.s4 !== 'revision') pairs.push({ clear: c, loan: l });
  });
  if (!pairs.length) { showToast('ไม่พบสัญญายืมที่ค้างและมีเอกสารล้างหนี้อนุมัติแล้ว'); return Promise.resolve(0); }
  if (!confirm('พบสัญญายืมเงิน ' + pairs.length + ' รายการที่ล้างหนี้อนุมัติแล้วแต่ยังค้างสถานะ\nต้องการปิดสัญญาให้อัตโนมัติใช่หรือไม่?')) return Promise.resolve(0);
  var done = 0;
  return pairs.reduce(function(p, x) {
    return p.then(function() {
      var lref = db.collection('financeDocs').doc(x.loan.id), cref = db.collection('financeDocs').doc(x.clear.id);
      return db.runTransaction(function(tx) {
        return Promise.all([tx.get(lref), tx.get(cref)]).then(function(r) {
          var ld = r[0].data(), cd = r[1].data(), now = TS.now();
          if (!ld || !cd || cd.s1 !== 'approved' || ld.s3 !== 'approved' || ld.s4 !== 'unpaid') return;
          tx.update(lref, {
            s4: 'paid',
            settle: { date: now, voucherNo: '', voucherAmount: null, cash: null, auto: true, clearDocId: x.clear.id, clearTitle: cd.title || '' },
            history: (ld.history || []).concat([{ step: 's4', text: 'ปิดสัญญายืมเงินอัตโนมัติ (อนุมัติเอกสารล้างหนี้แล้ว)', note: cd.title || '', by: by, email: currentUser.email, at: now }]),
            updatedAt: FV.serverTimestamp()
          });
          done++;
        });
      }).catch(function(err) { console.error('syncClearedLoans', x.loan.id, err); });
    });
  }, Promise.resolve()).then(function() { showToast('ปิดสัญญายืมเงินที่ค้างแล้ว ' + done + ' รายการ'); return done; });
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
      var firstLoad = true;
      listenDocs(db.collection('financeDocs').orderBy('createdAt', 'desc').limit(500), function() {
        /* โหลดครั้งแรก: ถ้าฝ่ายการเงินไม่มีงานรอแต่ฝ่ายพัสดุมี ให้เปิดฝ่ายพัสดุก่อน */
        if (firstLoad) {
          firstLoad = false;
          var has = {}; allDocs.forEach(function(d) { if (pendingForMe(d)) has[deptKeyOf(d)] = true; });
          if (!has.finance && has.supply) deptFilter = 'supply';
        }
        refreshAll();
      });
    });
  }
});
