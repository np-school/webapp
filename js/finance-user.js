/* ══════════════════════════════════════════════════════════════
   finance-user.js — หน้าครู: ส่งเอกสารการเงินและพัสดุ + ดูสถานะของตัวเอง
   (ต้องโหลด finance-common.js ก่อน)
   ══════════════════════════════════════════════════════════════ */
var editingId = null;
var fDueTouched = false;
var statusFilter = 'all';

function renderPage() {
  return (
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title-row">' +
          '<div class="page-icon blue"><i data-lucide="file-text" style="width:20px;height:20px;color:white;"></i></div>' +
          '<h1 class="page-title">ส่งเอกสารการเงินและพัสดุ</h1>' +
        '</div>' +
        '<p class="page-sub">กรอกรายการแล้วนำเอกสารตัวจริงไปส่งที่ฝ่ายการเงินหรือฝ่ายพัสดุตามประเภทเอกสาร ติดตามสถานะแต่ละขั้นได้ที่นี่</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<button class="btn-primary" onclick="openForm()"><i data-lucide="plus" style="width:14px;height:14px;"></i> ส่งเอกสารใหม่</button>' +
      '</div>' +
    '</div>' +
    '<div class="fd-toolbar" id="fdFilter">' +
      '<button class="filter-pill active" onclick="setStatusFilter(\'all\',this)">ทั้งหมด</button>' +
      '<button class="filter-pill" onclick="setStatusFilter(\'progress\',this)">กำลังดำเนินการ</button>' +
      '<button class="filter-pill" onclick="setStatusFilter(\'revision\',this)">ต้องแก้ไข</button>' +
      '<button class="filter-pill" onclick="setStatusFilter(\'done\',this)">เสร็จสิ้น</button>' +
    '</div>' +
    '<div class="fd-list" id="fdList">' + emptyHtml('กำลังโหลด...') + '</div>'
  );
}
function setStatusFilter(v, el) {
  statusFilter = v;
  var pills = document.querySelectorAll('#fdFilter .filter-pill');
  for (var i = 0; i < pills.length; i++) pills[i].classList.remove('active');
  if (el) el.classList.add('active');
  renderList();
}
function renderList() {
  var el = document.getElementById('fdList'); if (!el) return;
  var rows = allDocs.filter(function(d) {
    if (statusFilter === 'all') return true;
    var tone = overallInfo(d).tone;
    if (statusFilter === 'done') return tone === 'done';
    if (statusFilter === 'revision') return !!revStepOf(d);
    return tone !== 'done' && !revStepOf(d);
  });
  if (!rows.length) {
    el.innerHTML = emptyHtml(allDocs.length ? 'ไม่พบรายการในสถานะนี้' : 'ยังไม่มีเอกสารที่คุณส่ง กดปุ่ม "ส่งเอกสารใหม่" เพื่อเริ่มต้น');
    return;
  }
  el.innerHTML = rows.map(rowHtml).join('');
}
/* ครูลบคำขอของตัวเองได้ตราบที่ขั้นตรวจเอกสารยังไม่อนุมัติ (กำลังตรวจ หรือถูกส่งกลับที่ขั้น 1) และยังไม่ออกเลขสัญญา */
function canDeleteMine(d) {
  return isMine(d) && (d.s1 === 'processing' || d.s1 === 'revision') && !d.contractNo;
}
function renderDetail(d) {
  var own = '', banner = '', rev = revStepOf(d);
  if (isMine(d) && rev) {
    /* ถูกส่งกลับ (ขั้นใดก็ได้): ปุ่มหลักอยู่ในแบนเนอร์ — แก้ข้อมูลก่อน แล้วกดส่งใหม่ เอกสารจะกลับไปรอตรวจที่ขั้นเดิม */
    banner = '<button class="btn-primary btn-sm" onclick="resubmitDoc(\'' + d.id + '\')">ส่งใหม่อีกครั้ง</button>' +
      '<button class="' + FD_BTN.edit + '" onclick="openForm(\'' + d.id + '\')">แก้ไขข้อมูล</button>' +
      (rev === 's1' && canDeleteMine(d) ? '<button class="' + FD_BTN.danger + '" onclick="deleteDoc(\'' + d.id + '\')">ลบรายการ</button>' : '');
  } else if (canDeleteMine(d)) {
    own = '<div class="fd-actions" style="margin-top:16px;"><button class="' + FD_BTN.edit + '" onclick="openForm(\'' + d.id + '\')">แก้ไขข้อมูล</button>' +
      '<button class="' + FD_BTN.danger + '" onclick="deleteDoc(\'' + d.id + '\')">ลบรายการ</button></div>';
  } else if (d.s1 === 'approved') {
    own = '<div class="fd-hint" style="margin-top:12px;">เอกสารผ่านการตรวจแล้ว ไม่สามารถแก้ไขข้อมูลได้ เว้นแต่เจ้าหน้าที่ส่งกลับให้แก้ไข หากต้องการแก้ไขกรุณาติดต่อ' + deptOf(d).short + '</div>';
  }
  if (isMine(d) && typeOf(d.type).loan && d.contractNo && d.s3 === 'approved' && d.s4 !== 'paid') {
    own += '<div class="fd-actions" style="margin-top:12px;"><button class="btn-primary btn-sm" onclick="closeModal(\'detailModal\');openClearFor(\'' + d.id + '\')">' +
      '<i data-lucide="badge-check" style="width:14px;height:14px;"></i> ส่งล้างหนี้สัญญานี้</button></div>';
  }
  buildDetailHtml(d, [], own, banner, false);
}
/* ผู้ส่งกดส่งใหม่หลังแก้ไข: ขั้นที่ถูกส่งกลับ revision → สถานะรอตรวจของขั้นนั้น (REV_BACK) — ต้องมี firestore.rules ที่อนุญาต */
function resubmitDoc(id) {
  var d = findDoc(id), rs = d ? revStepOf(d) : '';
  if (!d || !isMine(d) || !rs) return;
  if (!confirm('ส่งเอกสารนี้ให้เจ้าหน้าที่ตรวจอีกครั้งใช่หรือไม่?')) return;
  var FV = firebase.firestore.FieldValue, TS = firebase.firestore.Timestamp;
  var upd = { updatedAt: FV.serverTimestamp(),
    history: FV.arrayUnion({ step: rs, text: 'ผู้ส่งแก้ไขแล้ว ส่งใหม่อีกครั้ง', note: '', by: d.name || currentUser.displayName || currentUser.email, email: currentUser.email, at: TS.now() }) };
  upd[rs] = REV_BACK[rs];
  db.collection('financeDocs').doc(id).update(upd).then(function() {
    showToast('ส่งให้เจ้าหน้าที่ตรวจอีกครั้งแล้ว');
  }).catch(function(err) {
    console.error(err); showToast('ส่งไม่สำเร็จ: ' + (err.code || err.message), 'error');
  });
}

/* ══════════════════════ FORM (สร้าง/แก้ไข) ══════════════════════ */
function openForm(id) {
  editingId = id || null;
  var d = id ? findDoc(id) : null;
  var typeSel = document.getElementById('fType');
  typeSel.innerHTML = DOC_TYPES.map(function(t) { return '<option value="' + t.key + '">' + t.label + '</option>'; }).join('');
  document.getElementById('fFund').innerHTML = FUNDS.map(function(f) { return '<option>' + f + '</option>'; }).join('');
  document.getElementById('formTitle').textContent = d ? 'แก้ไขข้อมูลเอกสาร' : 'ส่งเอกสารใหม่';
  typeSel.value = d ? d.type : DOC_TYPES[0].key;
  typeSel.disabled = !!d;
  document.getElementById('fName').value = d ? d.name : (currentUser.displayName || '');
  document.getElementById('fTitle').value = d ? d.title : '';
  document.getElementById('fAmount').value = d ? d.amount : '';
  document.getElementById('fFund').value = d ? d.fundType : FUNDS[0];
  document.getElementById('fNote').value = d ? (d.note || '') : '';
  var today = new Date();
  document.getElementById('fLoanDate').value = d && d.loanDate ? dateInputVal(d.loanDate) : dateInputVal(today);
  fDueTouched = !!(d && d.dueDate);
  document.getElementById('fDueDate').value = d && d.dueDate ? dateInputVal(d.dueDate) :
    dateInputVal(new Date(today.getTime() + DEFAULT_DUE_DAYS * 86400000));
  fillRefOptions(d ? d.refContractNo : '');
  onTypeChange();
  closeModal('detailModal');
  openModal('formModal');
}
/* สัญญาที่ล้างหนี้ได้: ของครูคนนี้ + ออกเลขแล้ว + ขั้น 3 อนุมัติเบิกเงินแล้ว (เงินออกจริง) + ยังไม่ปิดสัญญา
   และตรงชนิดกับเอกสารล้างหนี้ (ล้างหนี้ไปราชการ ↔ ยืมไปราชการ, ล้างหนี้โครงการ ↔ ยืมโครงการ)
   สัญญาที่เลือกไว้อยู่แล้ว (ตอนแก้ไขเอกสารเดิม) จะแสดงเสมอแม้ปิดไปแล้ว */
function refLoans(selected) {
  var ft = document.getElementById('fType').value;
  var want = ft === 'clear_trip' ? 'loan_trip' : (ft === 'clear_project' ? 'loan_project' : null);
  return allDocs.filter(function(d) {
    if (!isMine(d) || !typeOf(d.type).loan || !d.contractNo) return false;
    if (want && d.type !== want) return false;
    return d.contractNo === selected || (d.s3 === 'approved' && d.s4 !== 'paid');
  });
}
function fillRefOptions(selected) {
  var list = refLoans(selected);
  var opts = ['<option value="">— เลือกสัญญา —</option>'];
  list.forEach(function(d) {
    opts.push('<option value="' + esc2(d.contractNo) + '"' + (d.contractNo === selected ? ' selected' : '') + '>' +
      esc2(d.contractNo + ' — ' + d.title.slice(0, 50)) + '</option>');
  });
  document.getElementById('fRef').innerHTML = opts.join('');
  onRefChange(true);
  var info = document.getElementById('fRefInfo');
  if (!list.length && info) {
    info.innerHTML = '<span style="color:var(--c-red-deep,#b91c1c);">ไม่พบสัญญายืมเงินที่ได้รับอนุมัติเบิกเงินแล้วและยังค้างชำระ หากเคยยืมนอกระบบนี้ กรุณาติดต่อ' +
      esc2((DEPTS.finance).short) + '</span>';
  }
}
/* เลือกสัญญาแล้วโชว์รายละเอียดให้ตรวจ + เติมชื่อกิจกรรม/ยอดให้ถ้ายังว่าง (แก้ไขต่อได้) */
function onRefChange(keepFields) {
  var no = document.getElementById('fRef').value, info = document.getElementById('fRefInfo');
  var d = null;
  allDocs.forEach(function(x) { if (isMine(x) && typeOf(x.type).loan && x.contractNo === no) d = x; });
  if (!info) return;
  if (!d) { info.textContent = 'แสดงเฉพาะสัญญาของคุณที่ได้รับอนุมัติเบิกเงินแล้วและยังค้างชำระ'; return; }
  info.innerHTML = 'สัญญา ' + esc2(d.contractNo) + ' · ยอดยืม <b>฿' + fmtMoney(d.amount) + '</b> · ยืมวันที่ ' + fmtD(d.loanDate) +
    ' · ครบกำหนด ' + fmtD(d.dueDate) + '<br>' + esc2(d.title);
  if (keepFields === true) return;
  var tEl = document.getElementById('fTitle'), aEl = document.getElementById('fAmount');
  if (!tEl.value.trim()) tEl.value = 'ล้างหนี้สัญญายืมเงิน ' + d.contractNo + ' — ' + d.title;
  if (!aEl.value) aEl.value = d.amount;
}
function onTypeChange() {
  var t = typeOf(document.getElementById('fType').value);
  document.getElementById('fLoanBox').style.display = t.loan ? 'grid' : 'none';
  document.getElementById('fClearBox').style.display = t.clear ? 'block' : 'none';
  if (t.clear) fillRefOptions(document.getElementById('fRef').value);
  var sub = document.getElementById('formSub');
  if (sub) sub.textContent = 'กรอกครั้งเดียว แล้วนำเอกสารตัวจริงส่งที่' + (DEPTS.supply.cats.indexOf(t.cat) > -1 ? DEPTS.supply : DEPTS.finance).short;
}
/* ปุ่มในการ์ดสัญญายืม: เปิดฟอร์มล้างหนี้พร้อมเลือกสัญญานี้ให้ */
function openClearFor(id) {
  var d = findDoc(id); if (!d || !isMine(d) || !typeOf(d.type).loan) return;
  openForm();
  var typeSel = document.getElementById('fType');
  typeSel.value = d.type === 'loan_trip' ? 'clear_trip' : 'clear_project';
  onTypeChange();
  document.getElementById('fRef').value = d.contractNo;
  onRefChange();
}
function onLoanDateChange() {
  if (fDueTouched) return;
  var d = parseDateInput(document.getElementById('fLoanDate').value);
  if (d) document.getElementById('fDueDate').value = dateInputVal(new Date(d.getTime() + DEFAULT_DUE_DAYS * 86400000));
}
function saveForm() {
  var key = document.getElementById('fType').value, t = typeOf(key);
  var name = document.getElementById('fName').value.trim();
  var title = document.getElementById('fTitle').value.trim();
  var amount = parseFloat(document.getElementById('fAmount').value);
  var fund = document.getElementById('fFund').value;
  var note = document.getElementById('fNote').value.trim();
  if (!name || !title) { showToast('กรอกชื่อและกิจกรรม/โครงการให้ครบ', 'warn'); return; }
  if (!(amount > 0)) { showToast('จำนวนเงินต้องมากกว่า 0', 'warn'); return; }
  var loanDate = null, dueDate = null;
  if (t.loan) {
    loanDate = parseDateInput(document.getElementById('fLoanDate').value);
    dueDate  = parseDateInput(document.getElementById('fDueDate').value);
    if (!loanDate || !dueDate) { showToast('กรอกวันที่ยืมและวันครบกำหนด', 'warn'); return; }
    if (dueDate < loanDate) { showToast('วันครบกำหนดต้องไม่ก่อนวันที่ยืม', 'warn'); return; }
  }
  var ref = t.clear ? document.getElementById('fRef').value : '';
  if (t.clear && !ref) { showToast('เลือกสัญญายืมเงินที่ต้องการล้างหนี้', 'warn'); return; }
  var TS = firebase.firestore.Timestamp, FV = firebase.firestore.FieldValue;
  var btn = document.getElementById('formSaveBtn'); btn.disabled = true;
  var hist = { step: 'doc', text: editingId ? 'ผู้ส่งแก้ไขข้อมูล' : 'ส่งเอกสาร', by: name, email: currentUser.email, at: TS.now() };
  var p;
  if (editingId) {
    var upd = { name: name, title: title, amount: amount, fundType: fund, note: note, refContractNo: ref,
      updatedAt: FV.serverTimestamp(), history: FV.arrayUnion(hist) };
    if (t.loan) { upd.loanDate = TS.fromDate(loanDate); upd.dueDate = TS.fromDate(dueDate); }
    p = db.collection('financeDocs').doc(editingId).update(upd);
  } else {
    var doc = { uid: currentUser.uid, email: (currentUser.email || '').toLowerCase(), name: name, type: key, title: title,
      amount: amount, fundType: fund, note: note, refContractNo: ref,
      fiscalYear: fiscalYearOf(loanDate || new Date()),
      s1: 'processing', s2: 'waiting', s3: 'waiting', s4: 'unpaid', history: [hist],
      createdAt: FV.serverTimestamp(), updatedAt: FV.serverTimestamp() };
    if (t.loan) { doc.loanDate = TS.fromDate(loanDate); doc.dueDate = TS.fromDate(dueDate); }
    p = db.collection('financeDocs').add(doc);
  }
  p.then(function() {
    closeModal('formModal');
    showToast(editingId ? 'บันทึกการแก้ไขแล้ว' : 'ส่งรายการเรียบร้อย อย่าลืมนำเอกสารตัวจริงไปส่งที่' + (DEPTS.supply.cats.indexOf(t.cat) > -1 ? DEPTS.supply : DEPTS.finance).short);
  }).catch(function(err) {
    console.error(err); showToast('บันทึกไม่สำเร็จ: ' + (err.code || err.message), 'error');
  }).then(function() { btn.disabled = false; });
}
function deleteDoc(id) {
  var d = findDoc(id);
  if (!d || !canDeleteMine(d)) { showToast('ลบไม่ได้ เอกสารนี้ผ่านการตรวจหรือออกเลขสัญญาแล้ว', 'warn'); return; }
  if (!confirm('ลบคำขอ "' + (d.title || '').slice(0, 40) + '" ใช่หรือไม่?\nการลบแล้วกู้คืนไม่ได้')) return;
  db.collection('financeDocs').doc(id).delete()
    .then(function() { closeModal('detailModal'); detailId = null; showToast('ลบรายการแล้ว'); })
    .catch(function(err) { showToast('ลบไม่สำเร็จ: ' + (err.code || err.message), 'error'); });
}

/* ══════════════════════ INIT ══════════════════════ */
buildPage({
  appId:        'myApp',
  navSubtitle:  'ส่งเอกสารการเงินและพัสดุ',
  navTheme:     'blue',
  activePage:   'finance-user',
  requireAdmin: false,

  onAuth: function(user, contentEl) {
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);

    contentEl.innerHTML = renderPage();
    lucide.createIcons();
    setupScrollTopButton();

    currentUser = user;
    listenDocs(db.collection('financeDocs').where('uid', '==', user.uid), renderList);
  }
});
