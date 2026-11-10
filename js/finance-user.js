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
        '<p class="page-sub">กรอกรายการแล้วนำเอกสารตัวจริงไปส่งที่ฝ่ายการเงิน ติดตามสถานะแต่ละขั้นได้ที่นี่</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<span id="staffLink"></span>' +
        '<button class="btn-primary" onclick="openForm()">+ ส่งเอกสารใหม่</button>' +
      '</div>' +
    '</div>' +
    '<div class="fd-toolbar">' +
      '<select id="fdFilter" onchange="statusFilter=this.value;renderList()">' +
        '<option value="all">ทุกสถานะ</option><option value="progress">กำลังดำเนินการ</option>' +
        '<option value="revision">ต้องแก้ไข</option><option value="done">เสร็จสิ้น</option>' +
      '</select>' +
    '</div>' +
    '<div class="card" id="fdList" style="padding:0;overflow:hidden;"><div class="fd-empty">กำลังโหลด...</div></div>'
  );
}
function renderList() {
  var el = document.getElementById('fdList'); if (!el) return;
  var rows = allDocs.filter(function(d) {
    if (statusFilter === 'all') return true;
    var tone = overallInfo(d).tone;
    if (statusFilter === 'done') return tone === 'done';
    if (statusFilter === 'revision') return d.s1 === 'revision';
    return tone !== 'done' && d.s1 !== 'revision';
  });
  if (!rows.length) {
    el.innerHTML = '<div class="fd-empty">' + (allDocs.length ? 'ไม่พบรายการในสถานะนี้' : 'ยังไม่มีเอกสารที่คุณส่ง กดปุ่ม "ส่งเอกสารใหม่" เพื่อเริ่มต้น') + '</div>';
    return;
  }
  el.innerHTML = rows.map(rowHtml).join('');
}
function renderDetail(d) {
  var own = '';
  if (isMine(d) && d.s1 !== 'approved') {
    own = '<div class="fd-actions" style="margin-top:16px;"><button class="fd-btn warn" onclick="openForm(\'' + d.id + '\')">แก้ไขข้อมูล</button>' +
      (d.s1 === 'processing' ? '<button class="fd-btn danger" onclick="deleteDoc(\'' + d.id + '\')">ลบรายการ</button>' : '') + '</div>';
  } else if (d.s1 === 'approved') {
    own = '<div class="fd-hint" style="margin-top:12px;">เอกสารผ่านการตรวจแล้ว ไม่สามารถแก้ไขข้อมูลได้ หากต้องการแก้ไขกรุณาติดต่อฝ่ายการเงิน</div>';
  }
  buildDetailHtml(d, [], own);
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
function fillRefOptions(selected) {
  var opts = ['<option value="">— ไม่ระบุ —</option>'];
  allDocs.filter(function(d) { return isMine(d) && typeOf(d.type).loan && d.contractNo && d.s3 !== 'paid'; })
    .forEach(function(d) {
      opts.push('<option value="' + esc2(d.contractNo) + '"' + (d.contractNo === selected ? ' selected' : '') + '>' +
        esc2(d.contractNo + ' — ' + d.title.slice(0, 50)) + '</option>');
    });
  document.getElementById('fRef').innerHTML = opts.join('');
}
function onTypeChange() {
  var t = typeOf(document.getElementById('fType').value);
  document.getElementById('fLoanBox').style.display = t.loan ? 'grid' : 'none';
  document.getElementById('fClearBox').style.display = t.clear ? 'block' : 'none';
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
      s1: 'processing', s2: 'waiting', s3: 'unpaid', history: [hist],
      createdAt: FV.serverTimestamp(), updatedAt: FV.serverTimestamp() };
    if (t.loan) { doc.loanDate = TS.fromDate(loanDate); doc.dueDate = TS.fromDate(dueDate); }
    p = db.collection('financeDocs').add(doc);
  }
  p.then(function() {
    closeModal('formModal');
    showToast(editingId ? 'บันทึกการแก้ไขแล้ว' : 'ส่งรายการเรียบร้อย อย่าลืมนำเอกสารตัวจริงไปส่งที่ฝ่ายการเงิน');
  }).catch(function(err) {
    console.error(err); showToast('บันทึกไม่สำเร็จ: ' + (err.code || err.message), 'error');
  }).then(function() { btn.disabled = false; });
}
function deleteDoc(id) {
  if (!confirm('ลบรายการนี้ใช่หรือไม่?')) return;
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

    listenDocs(db.collection('financeDocs').where('uid', '==', user.uid), renderList);
    /* เจ้าหน้าที่ (ตามรายชื่อที่ตั้งไว้) จะเห็นปุ่มไปหน้าเจ้าหน้าที่ */
    loadFinCfg(user).then(function() {
      var slot = document.getElementById('staffLink');
      if (slot && isStaff()) slot.innerHTML = '<a class="btn-secondary" href="finance-admin.html" style="text-decoration:none;display:inline-block;">หน้าเจ้าหน้าที่</a>';
    });
  }
});
