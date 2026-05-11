/* ═══════════════════════════════════════════════
   shared/common.js
   Shared utilities + Portfolio Workflow Logic
   ═══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   WORKFLOW CONFIGURATION
   ลำดับขั้นตรวจสอบ portfolio
   ══════════════════════════════════════════════ */
var WORKFLOW = [
  {
    status:   'submitted',
    label:    'ครูส่งแล้ว',
    role:     'ครู',           // ผู้ที่ทำ action นี้
    next:     'หัวหน้ากลุ่มสาระตรวจแล้ว',
    reviewer: 'หัวหน้ากลุ่มสาระ',  // role ที่ต้องตรวจขั้นนี้
    color:    '#22c55e',
    bg:       '#dcfce7'
  },
  {
    status:   'หัวหน้ากลุ่มสาระตรวจแล้ว',
    label:    'หัวหน้ากลุ่มสาระตรวจแล้ว',
    role:     'หัวหน้ากลุ่มสาระ',
    next:     'ผู้ช่วยผู้อำนวยการตรวจแล้ว',
    reviewer: 'ผู้ช่วยผู้อำนวยการ',
    color:    '#f97316',
    bg:       '#fff7ed'
  },
  {
    status:   'ผู้ช่วยผู้อำนวยการตรวจแล้ว',
    label:    'ผู้ช่วยผู้อำนวยการตรวจแล้ว',
    role:     'ผู้ช่วยผู้อำนวยการ',
    next:     'รองผู้อำนวยการตรวจแล้ว',
    reviewer: 'รองผู้อำนวยการ',
    color:    '#eab308',
    bg:       '#fefce8'
  },
  {
    status:   'รองผู้อำนวยการตรวจแล้ว',
    label:    'รองผู้อำนวยการตรวจแล้ว',
    role:     'รองผู้อำนวยการ',
    next:     'ผู้อำนวยการตรวจแล้ว',
    reviewer: 'ผู้อำนวยการ',
    color:    '#3b82f6',
    bg:       '#dbeafe'
  },
  {
    status:   'ผู้อำนวยการตรวจแล้ว',
    label:    'ผู้อำนวยการตรวจแล้ว',
    role:     'ผู้อำนวยการ',
    next:     'final_approved',
    reviewer: null,   // ผู้อำนวยการกด approve = จบ
    color:    '#0ea5e9',
    bg:       '#e0f2fe'
  },
  {
    status:   'final_approved',
    label:    'อนุมัติแล้ว',
    role:     null,
    next:     null,
    reviewer: null,
    color:    '#7c3aed',
    bg:       '#f5f3ff'
  }
];

/* สถานะแก้ไข (ทุก role สามารถ reject ได้) */
var STATUS_REVISION = 'revision';
var STATUS_PENDING  = 'pending';

/* ── หาขั้นปัจจุบันใน workflow ── */
function getWorkflowStep(status) {
  return WORKFLOW.find(function(s) { return s.status === status; }) || null;
}

/* ── role ที่ต้องตรวจขั้นนี้ ── */
function getReviewerRole(status) {
  var step = getWorkflowStep(status);
  return step ? step.reviewer : null;
}

/* ── status ถัดไป ── */
function getNextStatus(status) {
  var step = getWorkflowStep(status);
  return step ? step.next : null;
}

/* ── ตรวจว่า role นี้มีสิทธิ์ approve เอกสารที่ status นี้ไหม ── */
function canApprove(userRole, docStatus) {
  var reviewer = getReviewerRole(docStatus);
  if (!reviewer) return false;
  // admin สามารถทำแทนทุก role ได้
  return userRole === reviewer || userRole === 'admin';
}

/* ── Label สถานะภาษาไทย ── */
function statusLabel(status) {
  if (status === STATUS_PENDING)  return 'รอส่ง';
  if (status === STATUS_REVISION) return 'ส่งกลับแก้ไข';
  var step = getWorkflowStep(status);
  return step ? step.label : status;
}

/* ── สีของสถานะ ── */
function statusColor(status) {
  if (status === STATUS_PENDING)  return { color: '#94a3b8', bg: '#f1f5f9' };
  if (status === STATUS_REVISION) return { color: '#b45309',  bg: '#fef9c3' };
  var step = getWorkflowStep(status);
  return step ? { color: step.color, bg: step.bg } : { color: '#94a3b8', bg: '#f1f5f9' };
}

/* ── Workflow progress bar HTML (5 steps) ── */
function workflowBarHtml(currentStatus) {
  var steps = [
    { key: 'submitted',                    short: 'ครูส่ง' },
    { key: 'หัวหน้ากลุ่มสาระตรวจแล้ว',    short: 'หน.สาระ' },
    { key: 'ผู้ช่วยผู้อำนวยการตรวจแล้ว',   short: 'ผช.ผอ.' },
    { key: 'รองผู้อำนวยการตรวจแล้ว',        short: 'รอง ผอ.' },
    { key: 'ผู้อำนวยการตรวจแล้ว',           short: 'ผอ.' },
    { key: 'final_approved',               short: 'อนุมัติ' }
  ];

  var currentIdx = steps.findIndex(function(s) { return s.key === currentStatus; });
  if (currentStatus === STATUS_REVISION) currentIdx = -2;  // ส่งกลับแก้ไข

  var html = '<div class="workflow-bar">';
  steps.forEach(function(s, i) {
    var cls;
    if (currentStatus === STATUS_REVISION) {
      cls = i === 0 ? 'revision' : 'pending';
    } else if (i < currentIdx) {
      cls = 'done';
    } else if (i === currentIdx) {
      cls = s.key === 'final_approved' ? 'final' : 'active';
    } else {
      cls = 'pending';
    }
    if (i > 0) html += '<div class="wf-divider"></div>';
    html += '<div class="wf-step ' + cls + '">' + s.short + '</div>';
  });
  html += '</div>';
  return html;
}

/* ══════════════════════════════════════════════
   UI Utilities
   ══════════════════════════════════════════════ */

/* ── Toast ── */
function showToast(msg, type) {
  var colors = { success:'#16a34a', error:'#dc2626', info:'#1d4ed8', warn:'#d97706' };
  var bg = colors[type] || colors.info;
  var t = document.createElement('div');
  t.className = 'toast';
  t.style.background = bg;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() {
    t.classList.add('hide');
    setTimeout(function() { t.remove(); }, 350);
  }, 2800);
}

/* ── Modal helpers ── */
function openModal(id)  { var m = document.getElementById(id); if (m) m.classList.add('open'); }
function closeModal(id) { var m = document.getElementById(id); if (m) m.classList.remove('open'); }

/* ── Sidebar toggle (mobile) ── */
function toggleSidebar() {
  var sw = document.querySelector('.sidebar-wrap');
  var ov = document.getElementById('sidebarOverlay');
  if (!sw) return;
  sw.classList.toggle('open');
  if (ov) ov.classList.toggle('open');
}

/* ── Date helpers ── */
function fmtDate(ts) {
  if (!ts) return '—';
  var d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'numeric' });
}

/* ── Hide loading overlay ── */
function hideLoading() {
  var el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}
