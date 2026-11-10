/* ══════════════════════════════════════════════════════════════
   finance-admin.js — หน้าเจ้าหน้าที่: กดยืนยันแต่ละขั้น + ทะเบียนลูกหนี้
   (ต้องโหลด finance-common.js ก่อน) สิทธิ์ตามรายชื่อใน financeSettings/config
   ══════════════════════════════════════════════════════════════ */
var activeTab = 'todo';
var searchQ = '';
var ledgerFY = '';
var confirmCtx = null;

/* ปุ่มที่ผู้ใช้คนนี้กดได้กับเอกสารนี้ */
function actionsFor(d) {
  var out = [];
  if (canStep('s1')) {
    if (d.s1 === 'processing') {
      out.push({ sk: 's1', act: 'revision', label: 'ส่งกลับแก้ไข', cls: 'warn' });
      out.push({ sk: 's1', act: 'approve',  label: 'อนุมัติเอกสาร', cls: 'ok' });
    } else if (d.s1 === 'revision') {
      out.push({ sk: 's1', act: 'resume', label: 'แก้ไขแล้ว → กำลังดำเนินการ', cls: 'ok' });
    } else if (d.s1 === 'approved' && d.s2 !== 'approved') {
      out.push({ sk: 's1', act: 'revert', label: 'ยกเลิกการอนุมัติ', cls: 'plain', revert: true });
    }
  }
  if (stepsOf(d).indexOf('s2') > -1 && canStep('s2')) {
    if (d.s1 === 'approved' && d.s2 !== 'approved') {
      out.push({ sk: 's2', act: 'approve', label: 'อนุมัติ (ออกเช็คแล้ว)', cls: 'ok' });
    } else if (d.s2 === 'approved' && d.s3 !== 'paid') {
      out.push({ sk: 's2', act: 'revert', label: 'ยกเลิกการอนุมัติ', cls: 'plain', revert: true });
    }
  }
  if (stepsOf(d).indexOf('s3') > -1 && canStep('s3')) {
    if (d.s2 === 'approved' && d.s3 !== 'paid') {
      out.push({ sk: 's3', act: 'approve', label: 'ยืนยันชำระแล้ว', cls: 'ok' });
    } else if (d.s3 === 'paid') {
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
        (myRoles.sa ? '<button class="btn-secondary" onclick="openSettings()">ตั้งค่าผู้รับผิดชอบ</button>' : '') +
        '<a class="btn-secondary" href="finance-user.html" style="text-decoration:none;display:inline-block;">ส่งเอกสารของฉัน</a>' +
      '</div>' +
    '</div>' +
    '<div class="fd-tabs" id="fdTabs"></div>' +
    '<div class="fd-toolbar" id="fdToolbar"></div>' +
    '<div class="card" id="fdList" style="padding:0;overflow:hidden;"><div class="fd-empty">กำลังโหลด...</div></div>'
  );
}
function renderDenied() {
  return '<div class="card" style="padding:48px 20px;text-align:center;">' +
    '<h2 style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:8px;">ไม่มีสิทธิ์เข้าหน้านี้</h2>' +
    '<p style="color:var(--text2);font-size:14px;margin-bottom:18px;">หน้านี้สำหรับเจ้าหน้าที่ที่ได้รับมอบหมายในระบบเอกสารการเงินและพัสดุเท่านั้น</p>' +
    '<a href="finance-user.html" class="btn-primary" style="text-decoration:none;display:inline-block;">ไปหน้าส่งเอกสาร</a></div>';
}
function renderTabs() {
  var el = document.getElementById('fdTabs'); if (!el) return;
  var todo = allDocs.filter(pendingForMe).length;
  var tabs = [{ k: 'todo', l: 'รอฉันดำเนินการ', n: todo }, { k: 'all', l: 'ทุกรายการ' }, { k: 'ledger', l: 'ทะเบียนลูกหนี้' }];
  el.innerHTML = tabs.map(function(t) {
    return '<button class="tab-btn' + (activeTab === t.k ? ' active' : '') + '" onclick="setTab(\'' + t.k + '\')">' + t.l +
      (t.n ? '<span class="fd-count">' + t.n + '</span>' : '') + '</button>';
  }).join('');
  renderToolbar();
}
function renderToolbar() {
  var el = document.getElementById('fdToolbar'); if (!el) return;
  var html = '<input type="search" id="fdSearch" placeholder="ค้นหาชื่อ / โครงการ / เลขที่สัญญา" value="' + esc2(searchQ) + '" oninput="onSearch(this.value)">';
  if (activeTab === 'ledger') {
    var years = {};
    allDocs.forEach(function(d) { if (typeOf(d.type).loan && d.contractNo) years[d.fiscalYear] = 1; });
    var ys = Object.keys(years).sort().reverse();
    if (!ledgerFY && ys.length) ledgerFY = ys[0];
    html += '<select onchange="ledgerFY=this.value;renderList()">' +
      ys.map(function(y) { return '<option value="' + y + '"' + (y === String(ledgerFY) ? ' selected' : '') + '>ปีงบประมาณ ' + y + '</option>'; }).join('') +
      '</select><button class="btn-secondary" onclick="exportLedger()">ส่งออก CSV</button>';
  }
  el.innerHTML = html;
}
function onSearch(v) { searchQ = v.trim().toLowerCase(); renderList(); }
function setTab(k) { activeTab = k; searchQ = ''; renderTabs(); renderList(); }
function matchQ(d) {
  if (!searchQ) return true;
  return [d.name, d.title, d.contractNo, typeOf(d.type).label].join(' ').toLowerCase().indexOf(searchQ) > -1;
}
function renderList() {
  var el = document.getElementById('fdList'); if (!el) return;
  if (activeTab === 'ledger') return renderLedger(el);
  var rows = allDocs.filter(function(d) { return activeTab === 'all' || pendingForMe(d); }).filter(matchQ);
  if (!rows.length) {
    el.innerHTML = '<div class="fd-empty">' + (activeTab === 'todo' ? 'ไม่มีรายการที่รอคุณดำเนินการ' : 'ไม่พบรายการ') + '</div>';
    return;
  }
  el.innerHTML = rows.map(rowHtml).join('');
}

/* ── ทะเบียนลูกหนี้ (คอลัมน์ตรงกับสมุดเดิม) ── */
function ledgerRows() {
  return allDocs.filter(function(d) {
    return typeOf(d.type).loan && d.contractNo && String(d.fiscalYear) === String(ledgerFY) && matchQ(d);
  }).sort(function(a, b) { return parseInt(a.contractNo, 10) - parseInt(b.contractNo, 10); });
}
function renderLedger(el) {
  var rows = ledgerRows();
  if (!rows.length) { el.innerHTML = '<div class="fd-empty">ยังไม่มีสัญญายืมเงินที่อนุมัติในปีงบประมาณนี้</div>'; return; }
  var body = rows.map(function(d, i) {
    var s = d.settle || {};
    return '<tr class="' + (isOverdue(d) ? 'late' : '') + '" onclick="openDetail(\'' + d.id + '\')">' +
      '<td>' + (i + 1) + '</td><td>' + fmtD(d.loanDate) + '</td><td>' + esc2(d.contractNo) + '</td>' +
      '<td>' + esc2(d.name) + '</td><td>' + esc2(d.title) + '</td>' +
      '<td class="num">' + fmtMoney(d.amount) + '</td><td>' + fmtD(d.dueDate) + '</td>' +
      '<td>' + (d.s3 === 'paid' ? fmtD(s.date) : '<b>' + (isOverdue(d) ? 'เกินกำหนด' : 'ค้างชำระ') + '</b>') + '</td>' +
      '<td>' + esc2(s.voucherNo || '') + '</td>' +
      '<td class="num">' + (s.voucherAmount != null && s.voucherAmount !== '' ? fmtMoney(s.voucherAmount) : '') + '</td>' +
      '<td class="num">' + (s.cash ? fmtMoney(s.cash) : '') + '</td>' +
      '<td>' + esc2(d.fundType) + '</td></tr>';
  }).join('');
  el.innerHTML = '<div class="fd-ledger-wrap"><table class="fd-ledger"><thead><tr>' +
    '<th>ที่</th><th>วันที่ยืม</th><th>เลขที่สัญญา</th><th>ชื่อ-สกุล</th><th>กิจกรรม/โครงการ</th><th>จำนวนเงิน</th>' +
    '<th>วันครบกำหนด</th><th>วันที่ส่งใช้</th><th>เลขที่ใบสำคัญ</th><th>จำนวนเงินใบสำคัญ</th><th>เงินสด</th><th>ประเภทเงิน</th>' +
    '</tr></thead><tbody>' + body + '</tbody></table></div>';
}
function exportLedger() {
  var rows = ledgerRows();
  if (!rows.length) { showToast('ไม่มีข้อมูลให้ส่งออก', 'warn'); return; }
  function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
  var lines = [['ที่', 'วันที่ยืม', 'เลขที่สัญญา', 'ชื่อ-สกุล', 'กิจกรรม/โครงการ', 'จำนวนเงิน', 'วันครบกำหนด', 'วันที่ส่งใช้', 'เลขที่ใบสำคัญ', 'จำนวนเงินใบสำคัญ', 'เงินสด', 'ประเภทเงิน'].map(q).join(',')];
  rows.forEach(function(d, i) {
    var s = d.settle || {};
    lines.push([i + 1, fmtD(d.loanDate), d.contractNo, d.name, d.title, d.amount, fmtD(d.dueDate),
      d.s3 === 'paid' ? fmtD(s.date) : 'ค้างชำระ', s.voucherNo || '', s.voucherAmount || '', s.cash || '', d.fundType].map(q).join(','));
  });
  var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ทะเบียนคุมลูกหนี้เงินยืม-' + ledgerFY + '.csv';
  a.click();
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
}

function renderDetail(d) { buildDetailHtml(d, actionsFor(d), ''); }

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
    if (act === 'revert'   && d.s1 === 'approved' && d.s2 !== 'approved') u.s1 = 'processing';
  } else if (sk === 's2') {
    if (act === 'approve' && d.s1 === 'approved' && d.s2 !== 'approved') u.s2 = 'approved';
    if (act === 'revert'  && d.s2 === 'approved' && d.s3 !== 'paid')     u.s2 = 'waiting';
  } else if (sk === 's3') {
    if (act === 'approve' && d.s2 === 'approved' && d.s3 !== 'paid') { u.s3 = 'paid'; u.settle = extra || {}; }
    if (act === 'revert'  && d.s3 === 'paid') { u.s3 = 'unpaid'; u.settle = FV.delete(); }
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

/* ══════════════════════ ตั้งค่าผู้รับผิดชอบ (SuperAdmin) ══════════════════════ */
function openSettings() {
  ['s1', 's2', 's3'].forEach(function(k) {
    document.getElementById('cfg' + k.toUpperCase()).value = finCfg[k].join('\n');
  });
  openModal('settingsModal');
}
function saveSettings() {
  var out = {};
  ['s1', 's2', 's3'].forEach(function(k) {
    var seen = {};
    out[k] = document.getElementById('cfg' + k.toUpperCase()).value.split(/[\s,;]+/)
      .map(function(e) { return e.trim().toLowerCase(); })
      .filter(function(e) { if (e.indexOf('@') < 1 || seen[e]) return false; seen[e] = 1; return true; });
  });
  db.collection('financeSettings').doc('config').set(out).then(function() {
    finCfg = out;
    var em = (currentUser.email || '').toLowerCase();
    ['s1', 's2', 's3'].forEach(function(k) { myRoles[k] = out[k].indexOf(em) > -1; });
    closeModal('settingsModal'); showToast('บันทึกผู้รับผิดชอบแล้ว');
    startListener(); renderTabs();
  }).catch(function(err) { showToast('บันทึกไม่สำเร็จ: ' + (err.code || err.message), 'error'); });
}

/* ══════════════════════ INIT ══════════════════════ */
buildPage({
  appId:        'myApp',
  navSubtitle:  'จัดการเอกสารการเงินและพัสดุ',
  navTheme:     'dark',
  activePage:   'finance-admin',
  requireAdmin: false,

  onAuth: function(user, contentEl) {
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);

    loadFinCfg(user).then(function() {
      if (!isStaff()) { contentEl.innerHTML = renderDenied(); return; }
      activeTab = 'todo';
      contentEl.innerHTML = renderPage();
      lucide.createIcons();
      setupScrollTopButton();
      renderTabs();
      listenDocs(db.collection('financeDocs').orderBy('createdAt', 'desc').limit(500), function() { renderTabs(); renderList(); });
    });
  }
});
