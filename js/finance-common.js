/* ══════════════════════════════════════════════════════════════
   finance-common.js — ส่วนที่ใช้ร่วมกันของระบบ "ส่งเอกสารการเงินและพัสดุ"
   ใช้โดย finance-user.html (ครู) และ finance-admin.html (เจ้าหน้าที่)
   ต้อง <script> ไฟล์นี้ก่อน finance-user.js / finance-admin.js
   Collections: financeDocs, counters (finloan-<ปีงบ>)
   สิทธิ์เจ้าหน้าที่: admins/{email}.permissions → financeCheck (ขั้น 1 ตรวจเอกสาร), financeCheque (ขั้น 2 ใบปะหน้า/เสนอผู้บริหาร), financeLoan (ขั้น 3 อนุมัติขอเบิกเงิน + ขั้น 4 สัญญายืมเงิน)
   ตั้งค่าได้ที่หน้า admin-role (กลุ่มบริหารงบประมาณ)
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════ CONSTANTS ══════════════════════ */
var DOC_TYPES = [
  { key: 'loan_trip',     label: 'ขอยืมเงินไปราชการ',              loan: true,  cat: 'loan'     },
  { key: 'loan_project',  label: 'ขอยืมเงินจัดทำโครงการ',          loan: true,  cat: 'loan'     },
  { key: 'claim_trip',    label: 'เบิกเงินไปราชการ',                              cat: 'claim'    },
  { key: 'claim_project', label: 'เบิกเงินจัดทำโครงการ',                          cat: 'claim'    },
  { key: 'clear_trip',    label: 'ล้างหนี้สัญญายืมเงินไปราชการ',    clear: true, cat: 'clear'    },
  { key: 'clear_project', label: 'ล้างหนี้สัญญายืมเงินจัดทำโครงการ', clear: true, cat: 'clear'    },
  { key: 'purchase',      label: 'ชุดเบิกจัดซื้อ/จัดจ้าง',                        cat: 'purchase' },
  { key: 'payroll',       label: 'ชุดเบิกเงินเดือนลูกจ้าง',                       cat: 'payroll'  }
];
/* หมวดหมู่เอกสาร (ใช้แยกสี/กลุ่มในหน้าเจ้าหน้าที่) — color = ชื่อชุดสีใน finance.css (.fd-cat-<color>) */
var DOC_CATS = {
  loan:     { label: 'ยืมเงิน',          full: 'ขอยืมเงิน (ไปราชการ / จัดทำโครงการ)',               color: 'sky',    icon: 'hand-coins'    },
  claim:    { label: 'เบิกเงิน',         full: 'เบิกเงิน (ไปราชการ / จัดทำโครงการ)',                color: 'green',  icon: 'receipt'       },
  clear:    { label: 'ล้างหนี้สัญญายืม',  full: 'ล้างหนี้สัญญายืมเงิน (ไปราชการ / จัดทำโครงการ)',    color: 'violet', icon: 'badge-check'   },
  purchase: { label: 'จัดซื้อ/จัดจ้าง',   full: 'ชุดเบิกจัดซื้อ/จัดจ้าง',                            color: 'amber',  icon: 'shopping-cart' },
  payroll:  { label: 'เงินเดือนลูกจ้าง',  full: 'ชุดเบิกเงินเดือนลูกจ้าง',                           color: 'ink',    icon: 'users'         }
};
var DOC_CAT_ORDER = ['loan', 'claim', 'clear', 'purchase', 'payroll'];
/* ฝ่ายที่รับผิดชอบเอกสาร: พัสดุ = ชุดเบิกจัดซื้อ/จัดจ้าง + ชุดเบิกเงินเดือนลูกจ้าง, ที่เหลือเป็นของการเงิน
   (ครูยังเลือกประเภทเอกสารจาก dropdown เดิม — ฝ่ายถูกกำหนดจากประเภทอัตโนมัติ ใช้แยกการแสดงผลในหน้าเจ้าหน้าที่) */
var DEPTS = {
  finance: { label: 'การเงิน', short: 'ฝ่ายการเงิน', icon: 'wallet',  cats: ['loan', 'claim', 'clear'] },
  supply:  { label: 'พัสดุ',    short: 'ฝ่ายพัสดุ',   icon: 'package', cats: ['purchase', 'payroll'] }
};
var DEPT_ORDER = ['finance', 'supply'];
var DOC_CAT_OTHER = { label: 'อื่นๆ', color: 'ink', icon: 'file-text' };
var FUNDS = ['เงินอุดหนุนค่าจัดการเรียนการสอน', 'เงินบำรุงการศึกษา', 'เงินกิจกรรมพัฒนาผู้เรียน'];
var STEP_META = {
  s1: { name: 'ตรวจเอกสาร',                 short: 'ตรวจเอกสาร' },
  s2: { name: 'ทำใบปะหน้า/เสนอผู้บริหาร',    short: 'เสนอผู้บริหาร' },
  s3: { name: 'อนุมัติเอกสารขอเบิกเงิน',      short: 'อนุมัติเบิกเงิน' },
  s4: { name: 'ติดตามสัญญายืมเงิน',           short: 'สัญญายืมเงิน' }   /* เฉพาะเอกสารยืมเงิน */
};
/* สถานะเริ่มต้น / สถานะเสร็จของแต่ละขั้น (ทุกขั้นมี 'revision' = ส่งกลับแก้ไข เพิ่มจากนี้) */
var STEP_INIT = { s1: 'processing', s2: 'waiting', s3: 'waiting', s4: 'unpaid' };
var STEP_DONE = { s1: 'approved',   s2: 'approved', s3: 'approved', s4: 'paid' };
var ACTIONS = {
  's1:approve':  { title: 'อนุมัติเอกสาร',                    btn: 'ยืนยันอนุมัติ' },
  's1:revision': { title: 'ส่งกลับแก้ไข',                     btn: 'ส่งกลับแก้ไข', noteRequired: true },
  's1:resume':   { title: 'แก้ไขเรียบร้อย กลับไปกำลังดำเนินการ', btn: 'ยืนยัน' },
  's1:revert':   { title: 'ยกเลิกการอนุมัติ (ตรวจเอกสาร)',     btn: 'ยกเลิกการอนุมัติ' },
  's2:approve':  { title: 'อนุมัติใบปะหน้า — เสนอผู้บริหารแล้ว', btn: 'ยืนยัน' },
  's2:revision': { title: 'ส่งกลับแก้ไข (ใบปะหน้า/เสนอผู้บริหาร)', btn: 'ส่งกลับแก้ไข', noteRequired: true },
  's2:resume':   { title: 'แก้ไขเรียบร้อย กลับไปรอทำใบปะหน้า/เสนอผู้บริหาร', btn: 'ยืนยัน' },
  's2:revert':   { title: 'ยกเลิกการอนุมัติ (ใบปะหน้า/เสนอผู้บริหาร)', btn: 'ยกเลิกการอนุมัติ' },
  's3:approve':  { title: 'อนุมัติเอกสารขอเบิกเงิน',            btn: 'ยืนยันอนุมัติ' },
  's3:revision': { title: 'ส่งกลับแก้ไข (ขอเบิกเงิน)',          btn: 'ส่งกลับแก้ไข', noteRequired: true },
  's3:resume':   { title: 'แก้ไขเรียบร้อย กลับไปรออนุมัติขอเบิกเงิน', btn: 'ยืนยัน' },
  's3:revert':   { title: 'ยกเลิกการอนุมัติ (ขอเบิกเงิน)',      btn: 'ยกเลิกการอนุมัติ' },
  's4:revision': { title: 'ส่งกลับแก้ไข (สัญญายืมเงิน)',       btn: 'ส่งกลับแก้ไข', noteRequired: true },
  's4:resume':   { title: 'แก้ไขเรียบร้อย กลับไปค้างส่งใช้เงินยืม', btn: 'ยืนยัน' },
  's4:approve':  { title: 'ยืนยันชำระแล้ว (ปิดสัญญายืมเงิน)',   btn: 'ยืนยันชำระแล้ว', settle: true },
  's4:revert':   { title: 'ยกเลิกสถานะชำระแล้ว',               btn: 'ยกเลิกสถานะ' }
};
var DEFAULT_DUE_DAYS = 15;
/* ถูกส่งกลับที่ขั้นไหน → ผู้ส่งกด "ส่งใหม่อีกครั้ง" แล้วกลับไปสถานะรอตรวจของ "ขั้นเดิม" (ไม่ต้องเริ่มขั้น 1 ใหม่) */
var REV_BACK = { s1: 'processing', s2: 'waiting', s3: 'waiting', s4: 'unpaid' };

/* ══════════════════════ STATE (ร่วม) ══════════════════════ */
var currentUser = null;
var myRoles = { sa: false, s1: false, s2: false, s3: false };
var allDocs = [];
var detailId = null;
var unsubDocs = null;

/* ══════════════════════ HELPERS ══════════════════════ */
function isStaff() { return myRoles.sa || myRoles.s1 || myRoles.s2 || myRoles.s3; }
/* ขั้น 4 (สัญญายืมเงิน) ใช้สิทธิ์เดียวกับขั้น 3 (financeLoan) */
function canStep(sk) { return myRoles.sa || myRoles[sk === 's4' ? 's3' : sk]; }
function typeOf(key) {
  for (var i = 0; i < DOC_TYPES.length; i++) if (DOC_TYPES[i].key === key) return DOC_TYPES[i];
  return { key: key, label: key || '-' };
}
/* หมวดหมู่ของเอกสาร: คืน key ('loan' | 'claim' | ...) และข้อมูลสี/ไอคอน */
function catKeyOf(d) { return typeOf(d.type).cat || ''; }
function catOf(d) { return DOC_CATS[catKeyOf(d)] || DOC_CAT_OTHER; }
/* ชื่อเต็มของหมวด (ใช้เป็นหัวข้อกลุ่มในหน้าเจ้าหน้าที่) — ถ้าไม่มี full ใช้ label */
function catFull(c) { return (c && (c.full || c.label)) || ''; }
/* ฝ่ายของเอกสาร: 'supply' (พัสดุ) หรือ 'finance' (การเงิน — ค่าเริ่มต้นของทุกประเภทที่ไม่ใช่พัสดุ) */
function deptKeyOf(d) {
  var c = catKeyOf(d);
  return DEPTS.supply.cats.indexOf(c) > -1 ? 'supply' : 'finance';
}
function deptOf(d) { return DEPTS[deptKeyOf(d)]; }
/* ทุกประเภท: ตรวจเอกสาร → ใบปะหน้า/เสนอผู้บริหาร → อนุมัติขอเบิกเงิน | ล้างหนี้ = ตรวจเอกสารขั้นเดียว | ยืมเงิน = + ติดตามสัญญา (s4) */
function stepsOf(d) {
  var t = typeOf(d.type);
  if (t.clear) return ['s1'];
  return t.loan ? ['s1', 's2', 's3', 's4'] : ['s1', 's2', 's3'];
}
function prevDone(d, sk) {
  var st = stepsOf(d), i = st.indexOf(sk);
  return i < 1 || d[st[i - 1]] === STEP_DONE[st[i - 1]];
}
/* ขั้นที่กำลังถูกส่งกลับให้แก้ไข ('s1' | 's2' | 's3' | '' = ไม่มี) — เอกสารหนึ่งใบมีได้ขั้นเดียวเสมอ */
function revStepOf(d) {
  var st = stepsOf(d);
  for (var i = 0; i < st.length; i++) if (d[st[i]] === 'revision') return st[i];
  return '';
}
function toDate(ts) { return !ts ? null : (ts.toDate ? ts.toDate() : new Date(ts)); }
function fmtD(ts) {
  var d = toDate(ts);
  return d ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
}
function fmtMoney(n) {
  return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDT(ts) {
  var d = toDate(ts); if (!d) return '-';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
}
/* ขั้นปัจจุบันของเอกสาร (หนึ่งใบอยู่ได้ขั้นเดียว) + สี/ข้อความอธิบายที่ใช้ทั้งการ์ดสรุปและแบนเนอร์ใน modal */
var STAGE_META = {
  review:   { label: 'รอตรวจเอกสาร',     color: 'amber',  icon: 'search',         title: 'เจ้าหน้าที่กำลังตรวจเอกสาร',
              user: 'อย่าลืมนำเอกสารตัวจริงไปส่งที่{DEPT} เจ้าหน้าที่จะตรวจและอนุมัติหรือส่งกลับให้แก้ไข',
              staff: 'ตรวจเอกสารแล้วกด "อนุมัติเอกสาร" หรือ "ส่งกลับแก้ไข" ที่ขั้นที่ 1' },
  revision: { label: 'ส่งกลับแก้ไข',      color: 'violet', icon: 'undo-2',         title: 'ถูกส่งกลับให้แก้ไข',
              user: 'แก้ไขข้อมูลตามเหตุผลที่แจ้ง แล้วกด "ส่งใหม่อีกครั้ง" เพื่อให้เจ้าหน้าที่ตรวจต่อ',
              staff: 'รอผู้ส่งแก้ไขและส่งกลับมาใหม่ (หรือกด "แก้ไขแล้ว" แทนผู้ส่งในขั้นที่ถูกส่งกลับ)' },
  cover:    { label: 'รอเสนอผู้บริหาร',   color: 'sky',    icon: 'file-text',      title: 'ผ่านการตรวจเอกสารแล้ว รอทำใบปะหน้าและเสนอผู้บริหาร',
              user: 'ไม่ต้องทำอะไรเพิ่ม รอ{DEPT}ทำใบปะหน้าและเสนอผู้บริหาร',
              staff: 'ทำใบปะหน้าและเสนอผู้บริหารแล้วกด \"เสนอผู้บริหารแล้ว\" ที่ขั้นที่ 2' },
  approve:  { label: 'รออนุมัติเบิก',      color: 'teal',   icon: 'banknote',       title: 'เสนอผู้บริหารแล้ว รออนุมัติเอกสารขอเบิกเงิน',
              user: 'ไม่ต้องทำอะไรเพิ่ม รอผู้บริหารอนุมัติและ{DEPT}ดำเนินการเบิกเงิน',
              staff: 'เมื่อผู้บริหารอนุมัติแล้วกด \"อนุมัติเอกสารขอเบิกเงิน\" ที่ขั้นที่ 3' },
  loan:     { label: 'ค้างส่งใช้เงินยืม',  color: 'ink',    icon: 'wallet',         title: 'ค้างส่งใช้เงินยืม',
              user: 'นำหลักฐานมาส่งใช้เงินยืมภายในวันครบกำหนด',
              staff: 'เมื่อผู้ยืมส่งใช้แล้วกด "ยืนยันชำระแล้ว" ที่ขั้นสุดท้าย' },
  late:     { label: 'เกินกำหนดส่งใช้',    color: 'red',    icon: 'triangle-alert', title: 'เกินกำหนดส่งใช้เงินยืม',
              user: 'เลยวันครบกำหนดส่งใช้แล้ว กรุณาติดต่อ{DEPT}โดยเร็ว',
              staff: 'เลยวันครบกำหนดส่งใช้ ควรติดตามผู้ยืม' },
  done:     { label: 'เสร็จสิ้น',          color: 'green',  icon: 'check-check',    title: 'ดำเนินการเสร็จสิ้น',
              user: 'เอกสารนี้ผ่านทุกขั้นตอนแล้ว', staff: 'เอกสารนี้ผ่านทุกขั้นตอนแล้ว' }
};
var STAGE_ORDER = ['review', 'revision', 'cover', 'approve', 'loan', 'late', 'done'];
var STAGE_OF_STEP = { s1: 'review', s2: 'cover', s3: 'approve' };
function fdStage(d) {
  var st = stepsOf(d);
  for (var i = 0; i < st.length; i++) {
    var sk = st[i];
    if (d[sk] === 'revision') return 'revision';
    if (d[sk] !== STEP_DONE[sk]) return sk === 's4' ? (isOverdue(d) ? 'late' : 'loan') : STAGE_OF_STEP[sk];
  }
  return 'done';
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
  if (!typeOf(d.type).loan || d.s4 === 'paid' || d.s3 !== 'approved' || !d.dueDate) return false;
  var t = new Date(); t.setHours(0, 0, 0, 0);
  return toDate(d.dueDate) < t;
}
function stepInfo(d, sk) {
  if (d[sk] === STEP_DONE[sk])  return { tone: 'done', label: sk === 's4' ? 'ชำระแล้ว' : 'อนุมัติ' };
  if (!prevDone(d, sk))         return { tone: 'wait', label: 'รอขั้นก่อนหน้า' };
  if (d[sk] === 'revision')     return { tone: 'warn', label: 'รอผู้ส่งแก้ไข' };
  if (sk === 's4') return isOverdue(d) ? { tone: 'late', label: 'ค้างชำระ (เกินกำหนด)' } : { tone: 'active', label: 'ค้างชำระ' };
  return { tone: 'active', label: 'กำลังดำเนินการ' };
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
/* ปุ่มในรายละเอียด/ขั้นตอน → class กลางของระบบ (styles-new.css) */
var FD_BTN = {
  ok:     'btn-approve',
  warn:   'btn-primary amber btn-sm',
  plain:  'btn btn-ghost btn-sm',
  danger: 'btn-danger',
  edit:   'btn-secondary btn-sm'
};
/* กล่องข้อความว่าง/กำลังโหลด/ผิดพลาด ใช้ .empty-state กลาง */
function emptyHtml(msg) { return '<div class="card"><div class="empty-state">' + msg + '</div></div>'; }
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
    if (el) el.innerHTML = emptyHtml('โหลดข้อมูลไม่สำเร็จ (' + esc2(err.code || err.message) + ')');
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
    return '<span class="status-badge t-' + i.tone + '" title="' + esc2(STEP_META[sk].name + ': ' + i.label) + '"><b>' + STEP_META[sk].short + '</b>' + i.label + '</span>';
  }).join('');
  /* การ์ดกะทัดรัด 2 บรรทัด: [ประเภท · หัวข้อ ........ ยอดเงิน] / [ผู้ส่ง · วันที่ ........ สถานะแต่ละขั้น] */
  return '<div class="booking-card fd-row fd-tone-' + overallInfo(d).tone + '" onclick="openDetail(\'' + d.id + '\')">' +
    '<div class="fd-row-main">' +
      '<span class="fd-type">' + esc2(typeOf(d.type).label) + (d.contractNo ? ' · ' + esc2(d.contractNo) : '') + '</span>' +
      '<span class="fd-title">' + esc2(d.title) + '</span>' +
    '</div>' +
    '<div class="fd-amt">฿' + fmtMoney(d.amount) + '</div>' +
    '<div class="fd-meta">' + esc2(d.name) + ' · ' + fmtD(d.createdAt || new Date()) + '</div>' +
    '<div class="fd-chips">' + chips + '</div>' +
  '</div>';
}


/* เปิดรายละเอียด — renderDetail(d) ประกาศแยกในแต่ละหน้า */
function openDetail(id) {
  var d = findDoc(id); if (!d) return;
  detailId = id; renderDetail(d); openModal('detailModal');
}
/* ส่วนเนื้อหาของ modal รายละเอียด: แบนเนอร์สถานะ (บอกว่าตอนนี้เป็นอย่างไร + ต้องทำอะไรต่อ) → ยอดเงิน/ข้อมูล → ขั้นตอน → ประวัติ
   acts       = ปุ่มยืนยันขั้นตอน (เฉพาะหน้าเจ้าหน้าที่, หน้าครูส่ง [])
   extraHtml  = ปุ่มเพิ่มเติมท้ายขั้นตอน (หน้าครู: แก้ไข/ลบ)
   bannerActs = ปุ่มในแบนเนอร์ (หน้าครู: ส่งใหม่อีกครั้ง / แก้ไขข้อมูล เมื่อถูกส่งกลับ)
   staffView  = true เมื่อเปิดจากหน้าเจ้าหน้าที่ (ใช้เลือกข้อความแนะนำ) */
function buildDetailHtml(d, acts, extraHtml, bannerActs, staffView) {
  var t = typeOf(d.type), loan = !!t.loan, cat = catOf(d);
  var stage = fdStage(d), sm = STAGE_META[stage];
  document.getElementById('detailTitle').textContent = t.label;
  document.getElementById('detailSub').textContent = d.title || '';
  var ico = document.querySelector('#detailModal .modal-title-icon');
  if (ico) {
    ico.className = 'modal-title-icon fd-cat-' + cat.color;
    ico.style.background = 'var(--cat-pale)';
    ico.innerHTML = '<i data-lucide="' + cat.icon + '" style="color:var(--cat);"></i>';
  }

  /* แบนเนอร์สถานะ */
  var reason = '', bannerTitle = sm.title;
  if (stage === 'revision') {
    var rs = revStepOf(d), rmeta = ACTIONS[rs + ':revision'];
    if (rs) bannerTitle += ' (ขั้นที่ ' + (stepsOf(d).indexOf(rs) + 1) + ' ' + STEP_META[rs].name + ')';
    var h1 = rmeta ? (d.history || []).slice().reverse().filter(function(h) { return h.step === rs && h.text === rmeta.title; })[0] : null;
    if (h1 && h1.note) reason = '<div class="fd-banner-reason"><span>เหตุผลที่ส่งกลับ</span>' + esc2(h1.note) + '</div>';
  }
  var banner = '<div class="fd-banner fd-cat-' + sm.color + '">' +
    '<div class="fd-banner-ico"><i data-lucide="' + sm.icon + '"></i></div>' +
    '<div class="fd-banner-body"><div class="fd-banner-t">' + esc2(bannerTitle) + '</div>' +
    '<div class="fd-banner-d">' + (staffView ? sm.staff : sm.user).replace(/\{DEPT\}/g, deptOf(d).short) + '</div>' + reason +
    (bannerActs ? '<div class="fd-banner-act">' + bannerActs + '</div>' : '') + '</div></div>';

  /* ยอดเงิน + ข้อมูลอื่น */
  var facts = [['ผู้ส่ง', d.name], ['ประเภทเงิน', d.fundType], ['วันที่ส่งข้อมูล', fmtD(d.createdAt || new Date())]];
  if (loan) {
    facts.push(['เลขที่สัญญา', d.contractNo || 'ยังไม่ออกเลข (ออกเมื่ออนุมัติ)'],
      ['วันที่ยืม', fmtD(d.loanDate)], ['ครบกำหนดส่งใช้', fmtD(d.dueDate) + (isOverdue(d) ? ' (เกินกำหนด)' : '')]);
  }
  if (d.refContractNo) facts.push(['ล้างหนี้สัญญาเลขที่', d.refContractNo]);
  if (d.note) facts.push(['หมายเหตุ', d.note]);
  var summary = '<div class="fd-sum"><div class="fd-sum-amt"><span>จำนวนเงิน</span><b>฿' + fmtMoney(d.amount) + '</b></div>' +
    '<dl class="fd-facts">' + facts.map(function(f) { return '<div><dt>' + f[0] + '</dt><dd>' + esc2(f[1]) + '</dd></div>'; }).join('') + '</dl></div>';

  /* ขั้นตอน: การ์ดต่อขั้น สีตามสถานะ */
  var steps = stepsOf(d).map(function(sk, i) {
    var inf = stepInfo(d, sk), h = lastHist(d, sk);
    var sa = (acts || []).filter(function(a) { return a.sk === sk; });
    return '<li class="fd-sc t-' + inf.tone + '"><div class="fd-sc-dot">' + (inf.tone === 'done' ? '✓' : (i + 1)) + '</div><div class="fd-sc-body">' +
      '<div class="fd-sc-h"><span class="fd-sc-name">' + STEP_META[sk].name + '</span><span class="status-badge fd-status t-' + inf.tone + '">' + inf.label + '</span></div>' +
      (h ? '<div class="fd-sc-by">' + esc2(h.by) + ' · ' + fmtDT(h.at) + (h.note ? '<span class="fd-sc-note">“' + esc2(h.note) + '”</span>' : '') + '</div>' : '') +
      (sa.length ? '<div class="fd-actions">' + sa.map(function(a) {
        return '<button class="' + (FD_BTN[a.cls] || FD_BTN.ok) + '" onclick="openConfirm(\'' + d.id + '\',\'' + a.sk + '\',\'' + a.act + '\')">' + a.label + '</button>';
      }).join('') + '</div>' : '') +
    '</div></li>';
  }).join('');

  /* ประวัติ: ไทม์ไลน์ใหม่สุดอยู่บน พับเก็บได้ */
  function kind(txt) {
    if (/ส่งกลับ/.test(txt)) return 'warn';
    if (/ยกเลิก/.test(txt)) return 'late';
    if (/อนุมัติ|ชำระ/.test(txt)) return 'done';
    return 'active';
  }
  var hs = (d.history || []).slice().reverse();
  var hist = hs.map(function(h) {
    return '<li class="k-' + kind(h.text || '') + '"><span class="fd-tl-dot"></span><div>' +
      '<div class="fd-tl-t">' + esc2(h.text) + '</div>' +
      '<div class="fd-tl-s">' + esc2(h.by) + ' · ' + fmtDT(h.at) + '</div>' +
      (h.note ? '<div class="fd-tl-n">' + esc2(h.note) + '</div>' : '') + '</div></li>';
  }).join('');

  document.getElementById('detailBody').innerHTML = banner + summary +
    '<div class="fd-h">ความคืบหน้า</div><ol class="fd-scs">' + steps + '</ol>' + (extraHtml || '') +
    '<details class="fd-histbox"><summary>ประวัติการดำเนินการ <span class="status-badge t-wait">' + hs.length + ' รายการ</span></summary>' +
    '<ol class="fd-tl">' + hist + '</ol></details>';
  if (window.lucide) lucide.createIcons();
}

function setupScrollTopButton() {
  var content = document.getElementById('pageContent');
  var btn = document.getElementById('scrollTopBtn');
  if (!content || !btn) return;
  content.addEventListener('scroll', function() { btn.classList.toggle('show', content.scrollTop > 300); });
}
