/* ══════════════════════════════════════════════════════════════
   finance-common.js — ส่วนที่ใช้ร่วมกันของระบบ "ส่งเอกสารการเงินและพัสดุ"
   ใช้โดย finance-user.html (ครู) และ finance-admin.html (เจ้าหน้าที่)
   ต้อง <script> ไฟล์นี้ก่อน finance-user.js / finance-admin.js
   Collections: financeDocs, counters (finloan-<ปีงบ>)
   สิทธิ์เจ้าหน้าที่: admins/{email}.permissions → financeCheck (ขั้น 1), financeCheque (ขั้น 2), financeLoan (ขั้น 3)
   ตั้งค่าได้ที่หน้า admin-role (กลุ่มบริหารงบประมาณ)
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════ CONSTANTS ══════════════════════ */
var DOC_TYPES = [
  { key: 'loan_trip',     label: 'ขอยืมเงินไปราชการ',              loan: true  },
  { key: 'loan_project',  label: 'ขอยืมเงินจัดทำโครงการ',          loan: true  },
  { key: 'claim_trip',    label: 'เบิกเงินไปราชการ'                              },
  { key: 'claim_project', label: 'เบิกเงินจัดทำโครงการ'                          },
  { key: 'clear_trip',    label: 'ล้างหนี้สัญญายืมเงินไปราชการ',    clear: true },
  { key: 'clear_project', label: 'ล้างหนี้สัญญายืมเงินจัดทำโครงการ', clear: true },
  { key: 'purchase',      label: 'ชุดเบิกจัดซื้อ/จัดจ้าง'                        },
  { key: 'payroll',       label: 'ชุดเบิกเงินเดือนลูกจ้าง'                       }
];
var FUNDS = ['เงินอุดหนุนค่าจัดการเรียนการสอน', 'เงินบำรุงการศึกษา', 'เงินกิจกรรมพัฒนาผู้เรียน'];
var STEP_META = {
  s1: { name: 'ตรวจเอกสาร',                 short: 'ตรวจเอกสาร' },
  s2: { name: 'ตรวจสอบเอกสารขอเบิกเงิน',    short: 'ขอเบิกเงิน' },
  s3: { name: 'ตรวจสอบสัญญายืมเงิน',        short: 'สัญญายืมเงิน' }
};
var ACTIONS = {
  's1:approve':  { title: 'อนุมัติเอกสาร',                    btn: 'ยืนยันอนุมัติ' },
  's1:revision': { title: 'ส่งกลับแก้ไข',                     btn: 'ส่งกลับแก้ไข', noteRequired: true },
  's1:resume':   { title: 'แก้ไขเรียบร้อย กลับไปกำลังดำเนินการ', btn: 'ยืนยัน' },
  's1:revert':   { title: 'ยกเลิกการอนุมัติ (ตรวจเอกสาร)',     btn: 'ยกเลิกการอนุมัติ' },
  's2:approve':  { title: 'อนุมัติเอกสารขอเบิกเงิน (ออกเช็คแล้ว)', btn: 'ยืนยันอนุมัติ' },
  's2:revert':   { title: 'ยกเลิกการอนุมัติ (ขอเบิกเงิน)',     btn: 'ยกเลิกการอนุมัติ' },
  's3:approve':  { title: 'ยืนยันชำระแล้ว (ปิดสัญญายืมเงิน)',   btn: 'ยืนยันชำระแล้ว', settle: true },
  's3:revert':   { title: 'ยกเลิกสถานะชำระแล้ว',               btn: 'ยกเลิกสถานะ' }
};
var DEFAULT_DUE_DAYS = 15;

/* ══════════════════════ STATE (ร่วม) ══════════════════════ */
var currentUser = null;
var myRoles = { sa: false, s1: false, s2: false, s3: false };
var allDocs = [];
var detailId = null;
var unsubDocs = null;

/* ══════════════════════ HELPERS ══════════════════════ */
function isStaff() { return myRoles.sa || myRoles.s1 || myRoles.s2 || myRoles.s3; }
function canStep(sk) { return myRoles.sa || myRoles[sk]; }
function typeOf(key) {
  for (var i = 0; i < DOC_TYPES.length; i++) if (DOC_TYPES[i].key === key) return DOC_TYPES[i];
  return { key: key, label: key || '-' };
}
function stepsOf(d) {
  var t = typeOf(d.type), a = ['s1'];
  if (!t.clear) a.push('s2');
  if (t.loan) a.push('s3');
  return a;
}
function toDate(ts) { return !ts ? null : (ts.toDate ? ts.toDate() : new Date(ts)); }
function fmtD(ts) {
  var d = toDate(ts);
  return d ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
}
function fmtMoney(n) {
  return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function dateInputVal(ts) {
  var d = toDate(ts); if (!d) return '';
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function parseDateInput(v) {
  if (!v) return null;
  var p = v.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}
/* ปีงบประมาณไทย เริ่ม 1 ต.ค. */
function fiscalYearOf(date) {
  return (date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear()) + 543;
}
function isOverdue(d) {
  if (!typeOf(d.type).loan || d.s3 === 'paid' || d.s2 !== 'approved' || !d.dueDate) return false;
  var t = new Date(); t.setHours(0, 0, 0, 0);
  return toDate(d.dueDate) < t;
}
function stepInfo(d, sk) {
  if (sk === 's1') {
    if (d.s1 === 'approved') return { tone: 'done',   label: 'อนุมัติ' };
    if (d.s1 === 'revision') return { tone: 'warn',   label: 'แก้ไข' };
    return { tone: 'active', label: 'กำลังดำเนินการ' };
  }
  if (sk === 's2') {
    if (d.s2 === 'approved') return { tone: 'done',   label: 'อนุมัติ' };
    if (d.s1 === 'approved') return { tone: 'active', label: 'กำลังดำเนินการ' };
    return { tone: 'wait', label: 'รอขั้นก่อนหน้า' };
  }
  if (d.s3 === 'paid')       return { tone: 'done', label: 'ชำระแล้ว' };
  if (d.s2 !== 'approved')   return { tone: 'wait', label: 'รอขั้นก่อนหน้า' };
  return isOverdue(d) ? { tone: 'late', label: 'ค้างชำระ (เกินกำหนด)' } : { tone: 'active', label: 'ค้างชำระ' };
}
function overallInfo(d) {
  var steps = stepsOf(d);
  for (var i = 0; i < steps.length; i++) {
    var inf = stepInfo(d, steps[i]);
    if (inf.tone !== 'done') return { tone: inf.tone, label: STEP_META[steps[i]].short + ': ' + inf.label };
  }
  return { tone: 'done', label: 'เสร็จสิ้น' };
}
function isMine(d) { return currentUser && d.uid === currentUser.uid; }
function lastHist(d, sk) {
  var h = d.history || [];
  for (var i = h.length - 1; i >= 0; i--) if (h[i].step === sk) return h[i];
  return null;
}
function findDoc(id) { for (var i = 0; i < allDocs.length; i++) if (allDocs[i].id === id) return allDocs[i]; return null; }

/* โหลดสิทธิ์ของผู้ใช้คนนี้จาก admins/{email}.permissions (ครูทั่วไปไม่มี doc → ไม่มีสิทธิ์เจ้าหน้าที่) */
function loadFinRoles(user) {
  currentUser = user;
  var em = (user.email || '').toLowerCase();
  myRoles.sa = em === SUPERADMIN_EMAIL;
  return db.collection('admins').doc(em).get()
    .then(function(doc) {
      var p = doc.exists ? (doc.data().permissions || {}) : {};
      myRoles.s1 = !!p.financeCheck;
      myRoles.s2 = !!p.financeCheque;
      myRoles.s3 = !!p.financeLoan;
    })
    .catch(function(err) { console.warn('โหลดสิทธิ์เจ้าหน้าที่ไม่สำเร็จ', err); });
}
/* ฟัง financeDocs ตาม query ที่ส่งมา (หน้าครู = เฉพาะของตัวเอง, หน้าเจ้าหน้าที่ = ทั้งหมด) */
function listenDocs(query, onChange) {
  if (unsubDocs) unsubDocs();
  unsubDocs = query.onSnapshot(function(snap) {
    allDocs = snap.docs.map(function(x) { var d = x.data(); d.id = x.id; return d; });
    allDocs.sort(function(a, b) {
      var ta = a.createdAt ? toDate(a.createdAt).getTime() : Date.now();
      var tb = b.createdAt ? toDate(b.createdAt).getTime() : Date.now();
      return tb - ta;
    });
    onChange();
    if (detailId) { var d = findDoc(detailId); if (d) renderDetail(d); else closeModal('detailModal'); }
  }, function(err) {
    console.error(err);
    var el = document.getElementById('fdList');
    if (el) el.innerHTML = '<div class="fd-empty">โหลดข้อมูลไม่สำเร็จ (' + esc2(err.code || err.message) + ')</div>';
  });
}

/* ══════════════════════ RENDER (ร่วม) ══════════════════════ */
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}
function rowHtml(d) {
  var chips = stepsOf(d).map(function(sk) {
    var i = stepInfo(d, sk);
    return '<span class="fd-chip ' + i.tone + '"><b>' + STEP_META[sk].short + '</b>' + i.label + '</span>';
  }).join('');
  return '<div class="fd-row" onclick="openDetail(\'' + d.id + '\')">' +
    '<div>' +
      '<div class="fd-type">' + esc2(typeOf(d.type).label) + (d.contractNo ? ' · สัญญาเลขที่ ' + esc2(d.contractNo) : '') + '</div>' +
      '<div class="fd-title">' + esc2(d.title) + '</div>' +
      '<div class="fd-meta">' + esc2(d.name) + ' · ส่งเมื่อ ' + fmtD(d.createdAt || new Date()) + '</div>' +
    '</div>' +
    '<div class="fd-amt">฿' + fmtMoney(d.amount) + '</div>' +
    '<div class="fd-chips">' + chips + '</div>' +
  '</div>';
}


/* เปิดรายละเอียด — renderDetail(d) ประกาศแยกในแต่ละหน้า */
function openDetail(id) {
  var d = findDoc(id); if (!d) return;
  detailId = id; renderDetail(d); openModal('detailModal');
}
/* ส่วนเนื้อหาของ modal รายละเอียด: ข้อมูล + ความคืบหน้า + ประวัติ
   acts      = ปุ่มยืนยันขั้นตอน (เฉพาะหน้าเจ้าหน้าที่, หน้าครูส่ง [])
   extraHtml = ปุ่มเพิ่มเติมท้ายรายละเอียด (หน้าครู: แก้ไข/ลบ) */
function buildDetailHtml(d, acts, extraHtml) {
  var t = typeOf(d.type), loan = !!t.loan;
  document.getElementById('detailTitle').textContent = t.label;
  document.getElementById('detailSub').textContent = overallInfo(d).label;
  var facts = [
    ['ผู้ส่ง', d.name], ['จำนวนเงิน', '฿' + fmtMoney(d.amount)], ['ประเภทเงิน', d.fundType],
    ['วันที่ส่งข้อมูล', fmtD(d.createdAt || new Date())]
  ];
  if (loan) {
    facts.push(['เลขที่สัญญา', d.contractNo || 'ยังไม่ออกเลข (ออกเมื่อตรวจเอกสารอนุมัติ)'],
      ['วันที่ยืม', fmtD(d.loanDate)], ['วันครบกำหนดส่งใช้', fmtD(d.dueDate) + (isOverdue(d) ? ' (เกินกำหนด)' : '')]);
  }
  if (d.refContractNo) facts.push(['ล้างหนี้สัญญาเลขที่', d.refContractNo]);
  if (d.note) facts.push(['หมายเหตุ', d.note]);

  var steps = stepsOf(d).map(function(sk, i) {
    var inf = stepInfo(d, sk), h = lastHist(d, sk);
    var sa = (acts || []).filter(function(a) { return a.sk === sk; });
    return '<li class="fd-step ' + inf.tone + '"><div class="fd-dot">' + (inf.tone === 'done' ? '✓' : (i + 1)) + '</div><div>' +
      '<div class="fd-step-name">' + STEP_META[sk].name + '</div>' +
      '<div class="fd-step-state">' + inf.label + '</div>' +
      (h ? '<div class="fd-step-by">' + esc2(h.by) + ' · ' + fmtD(h.at) + (h.note ? ' · ' + esc2(h.note) : '') + '</div>' : '') +
      (sa.length ? '<div class="fd-actions">' + sa.map(function(a) {
        return '<button class="fd-btn ' + a.cls + '" onclick="openConfirm(\'' + d.id + '\',\'' + a.sk + '\',\'' + a.act + '\')">' + a.label + '</button>';
      }).join('') + '</div>' : '') +
    '</div></li>';
  }).join('');

  var hist = (d.history || []).slice().reverse().map(function(h) {
    return '<li><time>' + fmtD(h.at) + '</time>' + esc2(h.text) + ' — ' + esc2(h.by) + (h.note ? ' (' + esc2(h.note) + ')' : '') + '</li>';
  }).join('');

  document.getElementById('detailBody').innerHTML =
    '<dl class="fd-facts">' + facts.map(function(f) { return '<div><dt>' + f[0] + '</dt><dd>' + esc2(f[1]) + '</dd></div>'; }).join('') + '</dl>' +
    '<div class="fd-h">ความคืบหน้า</div><ol class="fd-steps">' + steps + '</ol>' + (extraHtml || '') +
    '<div class="fd-h">ประวัติ</div><ul class="fd-hist">' + hist + '</ul>';
}

function setupScrollTopButton() {
  var content = document.getElementById('pageContent');
  var btn = document.getElementById('scrollTopBtn');
  if (!content || !btn) return;
  content.addEventListener('scroll', function() { btn.classList.toggle('show', content.scrollTop > 300); });
}
