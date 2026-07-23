
/* ── Helper: อ่าน CSS variable จาก :root (ใช้กับ canvas ที่ไม่รองรับ var() ตรงๆ) ── */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
/* ── คำนวณปีการศึกษาและภาคเรียนอัตโนมัติจากวันที่ปัจจุบัน ──
   ภาคเรียนที่ 1: เปิด 16 พ.ค.  → ถึง 31 ต.ค.
   ภาคเรียนที่ 2: เปิด  1 พ.ย.  → ถึง 15 พ.ค. ปีถัดไป
   ── ต้องรันก่อน var currentYear ด้านล่าง เพื่อให้ window._defaultYear
      ถูกตั้งค่าก่อนถูกอ่านไปใช้ ──
─────────────────────────────────────────── */
(function() {
  var now    = new Date();
  var month  = now.getMonth() + 1;
  var day    = now.getDate();
  var ceYear = now.getFullYear();
  var sem, thYear;
  if ((month === 5 && day >= 16) || (month >= 6 && month <= 10)) {
    sem = 1; thYear = ceYear + 543;
  } else if (month >= 11) {
    sem = 2; thYear = ceYear + 543;
  } else {
    sem = 2; thYear = (ceYear - 1) + 543;
  }
  window._defaultYear = thYear;
  window._defaultSem  = sem;
})();

/* ══════════════════════ STATE ══════════════════════ */
/* ════════════════════════════════════════════
   PORTFOLIO ADMIN – portfolio-admin.html
   ════════════════════════════════════════════ */

/* ════════════════════════════════════════════
   PORTFOLIO ADMIN – portfolio-admin.html
   ════════════════════════════════════════════ */

var DOCUMENT_TYPES = [
  { id:'syllabus',         label:'Course Syllabus',               short:'Syllabus',  icon:'file-text',   color:'var(--c-sky)' },
  { id:'lesson_plan',      label:'แผนการจัดการเรียนรู้',          short:'แผนการ',    icon:'book-open',   color:'var(--c-violet)' },
  { id:'sufficiency',      label:'แผนเศรษฐกิจพอเพียง',           short:'เศรษฐกิจ',  icon:'leaf',        color:'var(--c-green)' },
  { id:'royal_policy',     label:'แผนพระบรมราโชบาย',             short:'ราโชบาย',   icon:'crown',       color:'var(--c-amber)' },
  { id:'competency',       label:'แผนสมรรถนะ',                   short:'สมรรถนะ',   icon:'zap',         color:'#ec4899' },
  { id:'research',         label:'รายงานวิจัยในชั้นเรียน',        short:'วิจัย',     icon:'microscope',  color:'var(--c-sky)' },
  { id:'student_analysis', label:'วิเคราะห์ผู้เรียนรายบุคคล',     short:'วิเคราะห์', icon:'users',       color:'var(--c-amber-tint)' },
  { id:'media_register',   label:'ทะเบียนสื่อ',                  short:'สื่อ',      icon:'library',     color:'#6366f1' },
  { id:'student_work',     label:'ผลงานนักเรียน',                 short:'ผลงาน',    icon:'star',        color:'var(--c-amber)' },
];
var currentYear = window._defaultYear || 2568;
var currentSem  = window._defaultSem  || 1;

var allSubs     = []; /* all submissions for year+sem */
var teacherMap  = {}; /* email → {displayName, staffName, email, position, staffGroup, subs:{}} */
var _initialDataLoaded = false; /* true หลัง loadAllSubmissions() โหลดข้อมูลจริงครั้งแรกสำเร็จ
                                    กัน renderCharts() ถูกเรียกจาก loadDocTypesFromFirestore()
                                    ตอน allSubs/teacherMap ยังว่างอยู่ (ทำให้ donut ขึ้น total=0 วูบก่อน) */
var currentFilter = 'all';
var currentView   = 'list';
var currentGroup  = 'all'; /* subject group filter */
var currentDocFilter = 'all'; /* doc type filter */
var currentReviewStatusFilter = 'all'; /* filter ตามสถานะการตรวจ: all/submitted/head_reviewed/assistant_reviewed/deputy_reviewed/final_approved/revision */
var availableGroups = []; /* กลุ่มสาระที่มีอยู่จริงใน staff (สร้าง dynamic) */

/* กลุ่มสาระที่นับเป็น "ครู" (ไม่รวมผู้บริหาร/เจ้าหน้าที่) */
var NON_TEACHER_GROUPS = ['ผู้บริหาร', 'เจ้าหน้าที่'];

/* ─── AUTH + ADMIN CHECK ─── */
var currentUserEmail = '';
var currentUserName  = '';  /* ชื่อจริงของผู้ตรวจ สำหรับบันทึกลงใน Firestore */
var myAdminSignatureURL = ''; /* ลายเซ็นของ "ผู้ตรวจคนนี้เอง" ที่เคยใช้ล่าสุด (admins/{email}.lastSignatureURL) — ไม่ใช่ลายเซ็นของขั้นตรวจก่อนหน้า */
var adminRoles = {};        /* { headOfGroups:{groupName:{name,email}}, assistantAcademic:{name,email}, deputyAcademic:{name,email}, director:{name,email} } */
var isHeadOfGroupOnly = false; /* true = หัวหน้ากลุ่มสาระ ไม่ใช่ portfolio admin เต็ม */
var headOfGroupName   = '';    /* ชื่อกลุ่มสาระของหัวหน้า */
var adminPermissions  = {};    /* สิทธิ์ทั้งหมดของผู้ใช้ปัจจุบัน */
var isSuperAdmin      = false;

/* ─── REVIEW MODAL ─── */
var reviewingSubId  = null;
var reviewingUid    = null;
var reviewingDocTypeId = null;
var selectedFileIdx = 0;        /* index ของไฟล์ที่เลือกอยู่ใน sub.files[] */
var selectedCourseKey = null;

/* ════════════════════════════════════════════
   SUB TAB SWITCHING
   ════════════════════════════════════════════ */
var currentSubTab = 'overview';

/* ════════════════════════════════════════════
   PANEL: รายกลุ่มสาระ
   ════════════════════════════════════════════ */
/* ════════════════════════════════════════════
   PANEL: รายกลุ่มสาระ
   ════════════════════════════════════════════ */

var _groupData = {}; /* cache ข้อมูลกลุ่ม */

var SEG_COLORS = { final:'var(--c-green)', deputy:'var(--c-violet)', assist:'var(--c-amber)', head:'var(--c-sky)', submitted:'var(--c-green)', revision:'var(--c-red-mid)' };
var SEG_LABELS = { final:'ผอ.อนุมัติ', deputy:'รอง ผอ.ตรวจแล้ว', assist:'ผช.ผอ.ตรวจแล้ว', head:'หัวหน้าฯ ตรวจแล้ว', submitted:'รอตรวจ', revision:'ให้แก้ไข' };
var SEG_KEYS   = ['final','deputy','assist','head','submitted','revision'];

/* ════════════════════════════════════════════
   TEACHER INDIVIDUAL PANEL
   ════════════════════════════════════════════ */

var selectedTeacherKey = null;   /* email key ของครูที่เลือก */
var teacherDonutCtx    = null;   /* canvas context */
var teacherDonutChartObj = null;

var editingDocTypeId = null; /* null = new, else Firestore doc id */
var selectedDtColor  = 'var(--c-sky)';
var dragSrcIndex     = null;

/* ── drag-to-reorder ── */
var dragDocs = [];

/* ════════════════════════════════════════════
   ADMIN MEMO MODAL — ดูบันทึกข้อความราชการ
   ════════════════════════════════════════════ */

/* A4 Scaler */
var adminMemoPage1Scale = 1;

/* ══════════════════════ DATA LOADING ══════════════════════ */
function loadAllSubmissions() {
  var main = document.getElementById('mainContent');
  main.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3);font-size:14px;"><i data-lucide="loader" style="width:28px;height:28px;animation:spin .8s linear infinite;"></i><p style="margin-top:12px;">กำลังโหลดข้อมูล...</p></div>';
  lucide.createIcons();

  var key = currentYear + '_' + currentSem;

  /* reset doc filter เมื่อ reload */
  currentDocFilter = 'all';
  buildDocFilterBar();
  currentReviewStatusFilter = 'all';
  buildReviewStatusFilterBar();

  /* ── ดึง staff + submissions "พร้อมกัน" (ไม่ใช่ต่อคิว) ──
     ⚠️ เดิม query staff เสร็จก่อนค่อย query submissions (.then ซ้อนกัน) ทั้งที่สอง
     query นี้ไม่ได้ขึ้นกับกันจริง ๆ แค่ต้องเอาผลมา merge ตอนท้ายเท่านั้น บนเน็ตโรงเรียน
     ที่บังคับ experimentalForceLongPolling อยู่แล้ว (แต่ละ request มี overhead สูงกว่า
     ปกติ) การรอสอง request ต่อคิวกันทำให้เวลาโหลดหน้าแรกช้าเกือบสองเท่าโดยไม่จำเป็น
     → เปลี่ยนเป็นยิงพร้อมกันด้วย Promise.all แล้วค่อยประมวลผลตามลำดับเดิม (staff ก่อน
     เพื่อสร้าง teacherMap แล้วค่อย merge submissions เข้าไป) */
  Promise.all([
    db.collection('staff').orderBy('name').get(),
    db.collection('portfolio_submissions').where('yearSem','==',key).get()
  ]).then(function(results) {
    var staffSnap = results[0];
    var snap      = results[1];

    allSubs = [];
    teacherMap = {};
    availableGroups = [];
    var groupSet = {};

    staffSnap.forEach(function(d) {
      var s = Object.assign({ id: d.id }, d.data());
      if (!s.email) return;
      var eKey = s.email.toLowerCase();
      var grp  = normaliseGroup(s.group);
      var isTeacher = NON_TEACHER_GROUPS.indexOf(grp) === -1;

      /* เก็บกลุ่มสาระที่เป็นครูจริง ๆ */
      if (isTeacher && grp && !groupSet[grp]) {
        groupSet[grp] = true;
        availableGroups.push(grp);
      }

      teacherMap[eKey] = {
        uid:          eKey,          /* ใช้ email เป็น key เหมือนเดิม */
        email:        eKey,
        staffName:    s.name  || '', /* ชื่อจริงจาก staff */
        displayName:  s.name  || eKey,
        position:     s.position || '',
        staffGroup:   grp,
        isTeacher:    isTeacher,
        subs:         {}
      };
    });

    /* สร้าง group filter bar ตามกลุ่มที่มีจริงใน staff */
    /* ถ้าเป็นหัวหน้ากลุ่มสาระ → ล็อก filter เฉพาะกลุ่มของตน */
    if (isHeadOfGroupOnly && headOfGroupName) {
      currentGroup = headOfGroupName;
    }
    buildGroupFilterBar();
    /* ซ่อน group filter bar ถ้าเป็น headOfGroup (ไม่ให้เปลี่ยนได้) */
    if (isHeadOfGroupOnly) {
      var bar = document.getElementById('groupFilterBar');
      if (bar) bar.style.display = 'none';
    }
    buildDocFilterBar();
    buildReviewStatusFilterBar();

    /* ── join submissions เข้ากับ teacherMap ── */
    snap.forEach(function(d) {
      var data = Object.assign({ id: d.id }, d.data());
      allSubs.push(data);
      var eKey = (data.email || '').toLowerCase();
      if (!eKey) return;

      if (!teacherMap[eKey]) {
        /* ครูส่งงานแต่ไม่มีใน staff → fallback จาก submission */
        teacherMap[eKey] = {
          uid:         data.uid || eKey,
          email:       eKey,
          staffName:   data.staffName || data.displayName || eKey,
          displayName: data.staffName || data.displayName || eKey,
          position:    data.staffPosition || '',
          staffGroup:  normaliseGroup(data.staffGroup || data.subjectGroup || ''),
          isTeacher:   true,
          subs:        {}
        };
      }

      /* Merge หลาย courseCode ใน docTypeId เดียวกัน
         แต่ละ Firestore doc = 1 รายวิชา เก็บไว้ใน _courses[] แยก
         sub ที่อยู่ใน teacherMap ทำหน้าที่เป็น container (มี _courses + merged status)
         ไม่ใช่ตัว doc จริง เพื่อป้องกัน circular reference */
      var existing = teacherMap[eKey].subs[data.docTypeId];
      if (!existing) {
        /* doc แรกของ docTypeId นี้ — สร้าง container ครอบอีกชั้น */
        teacherMap[eKey].subs[data.docTypeId] = {
          _isContainer: true,
          _courses:     [ data ],          /* เก็บ Firestore doc จริง ไม่ใช่ container */
          status:       data.status || 'submitted',
          docTypeId:    data.docTypeId,
          email:        data.email,
        };
      } else {
        /* doc ถัดไปของ docTypeId เดิม — push เข้า _courses เท่านั้น */
        existing._courses.push(data);
        /* คำนวณ merged status (ต่ำสุดของทุก doc) */
        var ORDER = PORTFOLIO_STATUS_ORDER; /* ✏️ ย้ายมา common.js แล้ว */
        existing.status = existing._courses.reduce(function(acc, c) {
          var s = c.status || 'submitted';
          return ORDER[s] < ORDER[acc] ? s : acc;
        }, 'final_approved');
      }
    });

    _initialDataLoaded = true;
    updateStats();
    renderView();
  }).catch(function(e) {
    main.innerHTML = '<div style="text-align:center;padding:40px;color:var(--red-bright);font-size:14px;">เกิดข้อผิดพลาด: ' + e.message + '</div>';
  });
}

/* ── load & render list ── */
function loadDocTypeList() {
  var list = document.getElementById('docTypeList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);"><i data-lucide="loader" style="width:24px;height:24px;animation:spin .8s linear infinite;"></i></div>';
  lucide.createIcons();

  db.collection('portfolio_doc_types').orderBy('order').get().then(function(snap) {
    /* ถ้า collection ว่าง → แสดง default (built-in) แต่ยังไม่บันทึก */
    var docs = [];
    snap.forEach(function(d) { docs.push(Object.assign({ _id: d.id }, d.data())); });

    /* ถ้ายังไม่มีเลย → เสนอ seed จาก DOCUMENT_TYPES ที่ hardcode */
    if (!docs.length) {
      list.innerHTML =
        '<div style="text-align:center;padding:40px 20px;">' +
          '<div style="width:56px;height:56px;background:var(--purple-light);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">' +
            '<i data-lucide="list-plus" style="width:28px;height:28px;color:var(--purple);"></i>' +
          '</div>' +
          '<p style="font-size:15px;font-weight:800;color:var(--text-dark);margin-bottom:6px;">ยังไม่มีหัวข้องานใน Firestore</p>' +
          '<p style="font-size:13px;color:var(--text2);margin-bottom:var(--gap-section);">คลิก "นำเข้าค่าเริ่มต้น" เพื่อเพิ่มหัวข้อที่ใช้อยู่ปัจจุบันทั้งหมด หรือเพิ่มทีละรายการ</p>' +
          '<button onclick="seedDefaultDocTypes()" style="padding:10px 20px;background:var(--purple);color:white;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px;">นำเข้าค่าเริ่มต้น (' + DOCUMENT_TYPES.length + ' รายการ)</button>' +
          '<button onclick="openDocTypeModal(null)" style="padding:10px 20px;background:white;color:var(--purple);border:1.5px solid var(--purple);border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;">+ เพิ่มใหม่</button>' +
        '</div>';
      lucide.createIcons();
      return;
    }

    renderDocTypeRows(docs);
  }).catch(function(e) {
    list.innerHTML = '<p style="color:var(--red-bright);padding:20px;font-size:13px;">โหลดไม่ได้: ' + e.message + '</p>';
  });
}

function syncToggleUI() {
  var on = document.getElementById('dtActive').checked;
  document.getElementById('dtActiveToggle').style.background = on ? 'var(--purple)' : 'var(--border)';
  document.getElementById('dtActiveKnob').style.transform    = on ? 'translateX(20px)' : 'translateX(0)';
}

function syncColorInput() {
  var val = document.getElementById('dtColor').value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    selectedDtColor = val;
    updateColorSwatches(val);
  }
}

/* ── load DOCUMENT_TYPES from Firestore into memory (replaces hardcoded array) ── */
function loadDocTypesFromFirestore() {
  db.collection('portfolio_doc_types').orderBy('order').get().then(function(snap) {
    if (snap.empty) return; /* ยังใช้ hardcoded ถ้าว่าง */
    DOCUMENT_TYPES = [];
    snap.forEach(function(d) {
      var data = d.data();
      if (data.active === false) return; /* กรอง inactive ฝั่ง client */
      DOCUMENT_TYPES.push({ id: data.id||d.id, label: data.label||'', short: data.short||'', icon: data.icon||'file', color: data.color||'var(--purple)', department: data.department||'academic' });
    });
    /* rebuild doc filter bar ตาม DOCUMENT_TYPES ใหม่
       เรียก renderCharts() เฉพาะตอนที่ allSubs/teacherMap โหลดจริงแล้วเท่านั้น
       (กันเคส initial load ที่ query นี้เสร็จก่อน loadAllSubmissions() แล้ว
       renderCharts() ไปวาดด้วยข้อมูลว่าง total=0 วูบก่อนของจริงจะมา) */
    if (currentSubTab === 'overview' && _initialDataLoaded) {
      buildDocFilterBar();
      renderCharts();
    }
  });
}

/* ══════════════════════ RENDER ══════════════════════ */
/* ── แสดงสถานะ submitted ให้ทุกคนเมื่อปีการศึกษา 2568 ── */
function fakeStatus(s) {
  return s || 'none';
}

/* normalise ชื่อกลุ่มสาระ ให้ใช้เปรียบเทียบได้ (ตัดช่องว่างพิเศษ) */
function normaliseGroup(g) {
  return (g || '').replace(/\s+/g, ' ').trim();
}
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

function bootApp(u) {
    var pageTitle = 'Admin – ติดตามส่งงานประจำภาคเรียน';
    if (!isSuperAdmin && !adminPermissions.headOfGroup &&
        !adminPermissions.assistantDirectorAcademic &&
        !adminPermissions.deputyDirectorAcademic &&
        !adminPermissions.director) {
      pageTitle = 'ติดตามส่งงานประจำภาคเรียน (ดูข้อมูลเท่านั้น)';
    }
    /* อัปเดต subtitle navbar ตาม role */
    var navSub = document.querySelector('.navbar-subtitle');
    if (navSub) navSub.textContent = pageTitle;

    initYearSemUI();
    /* โหลด admins ทั้งหมด เพื่อ fallback ชื่อผู้ตรวจในบันทึกข้อความ */
    db.collection('admins').get().then(function(snap) {
      adminRoles.headOfGroups = {};
      snap.forEach(function(d) {
        var data = d.data();
        var p = data.permissions || {};
        var nameVal = data.name || data.headOfGroupName || d.id;
        if (p.headOfGroup) {
          /* เก็บแยกตามกลุ่มสาระ (headOfGroupSubject) เพื่อดึงให้ตรงกับครูที่ส่ง */
          var grp = normaliseGroup(data.headOfGroupSubject || data.staffGroup || '');
          adminRoles.headOfGroups[grp] = { name: nameVal, email: d.id };
        }
        if (p.assistantDirectorAcademic) adminRoles.assistantAcademic  = { name: nameVal, email: d.id };
        if (p.deputyDirectorAcademic)    adminRoles.deputyAcademic     = { name: nameVal, email: d.id };
        if (p.director)                  adminRoles.director           = { name: nameVal, email: d.id };
      });
    }).catch(function(){});
    loadDocTypesFromFirestore(); /* โหลด DOCUMENT_TYPES จาก Firestore ก่อน แล้ว loadAllSubmissions ตาม */
    loadAllSubmissions();
    lucide.createIcons();
}

/* ─── YEAR / SEM UI INIT ─── */
function initYearSemUI() {
  document.getElementById('yearLabel').textContent = currentYear;
  document.getElementById('semPill1').className = 'sem-pill' + (currentSem===1?' active':'');
  document.getElementById('semPill2').className = 'sem-pill' + (currentSem===2?' active':'');
}

/* ── สร้าง group filter buttons dynamic จาก availableGroups ── */
function buildGroupFilterBar() {
  var bar = document.getElementById('groupFilterBar');
  if (!bar) return;

  /* ลบปุ่มเก่าทิ้งหมด (ยกเว้น label span และปุ่ม "ทั้งหมด") */
  var children = Array.prototype.slice.call(bar.children);
  children.forEach(function(el) {
    if (el.id !== 'grpAll' && el.tagName !== 'SPAN') bar.removeChild(el);
  });

  availableGroups.forEach(function(grp) {
    var btn = document.createElement('button');
    btn.className = 'filter-pill' + (currentGroup === grp ? ' active' : '');
    btn.id = 'grp_' + grp;
    btn.textContent = grp;
    btn.onclick = function() { setGroup(grp); };
    bar.appendChild(btn);
  });

  /* reset active state บนปุ่ม "ทั้งหมด" */
  document.getElementById('grpAll').className = 'filter-pill' + (currentGroup === 'all' ? ' active' : '');
}

/* ── รายการสถานะการตรวจที่เลือกดูได้ ── */
var REVIEW_STATUS_OPTIONS = [
  { id:'submitted',          label:'📤 รอหัวหน้าฯ ตรวจ' },
  { id:'head_reviewed',      label:'👤 รอ ผช.ผอ. ตรวจ' },
  { id:'assistant_reviewed', label:'🏅 รอรอง ผอ. ตรวจ' },
  { id:'deputy_reviewed',    label:'👑 รอ ผอ. อนุมัติ' },
  { id:'final_approved',     label:'✅ อนุมัติแล้ว' },
  { id:'revision',           label:'⚠️ ให้แก้ไข' }
];

/* ── สร้าง review-status filter buttons ── */
function buildReviewStatusFilterBar() {
  var bar = document.getElementById('reviewStatusFilterBar');
  if (!bar) return;

  var children = Array.prototype.slice.call(bar.children);
  children.forEach(function(el) {
    if (el.id !== 'rsAll' && el.tagName !== 'SPAN') bar.removeChild(el);
  });

  REVIEW_STATUS_OPTIONS.forEach(function(opt) {
    var btn = document.createElement('button');
    btn.className = 'filter-pill' + (currentReviewStatusFilter === opt.id ? ' active' : '');
    btn.id = 'rs_' + opt.id;
    btn.textContent = opt.label;
    btn.onclick = function() { setReviewStatusFilter(opt.id); };
    bar.appendChild(btn);
  });

  document.getElementById('rsAll').className = 'filter-pill' + (currentReviewStatusFilter === 'all' ? ' active' : '');
}

/* ⚠️ เดิมชื่อ setReviewStatus() ซ้ำกับฟังก์ชันอนุมัติเอกสารด้านล่าง (บรรทัด ~1426)
   เพราะทั้งไฟล์เป็น global scope ฟังก์ชันที่ประกาศทีหลังจะทับตัวนี้เสมอ ผลคือกดปุ่ม
   filter สถานะการตรวจแล้วดันไปเรียกฟังก์ชันอนุมัติแทน (โชว์ "กรุณาเขียนความคิดเห็นก่อนกดยืนยัน"
   ทั้งที่แค่กำลังกรองรายการ) → เปลี่ยนชื่อเป็น setReviewStatusFilter กันชนกัน */
function setReviewStatusFilter(s) {
  currentReviewStatusFilter = s;
  document.getElementById('rsAll').className = 'filter-pill' + (s === 'all' ? ' active' : '');
  REVIEW_STATUS_OPTIONS.forEach(function(opt) {
    var el = document.getElementById('rs_' + opt.id);
    if (el) el.className = 'filter-pill' + (s === opt.id ? ' active' : '');
  });
  renderView();
}

/* true ถ้าเอกสารชิ้นใดของครูคนนี้อยู่ในสถานะที่เลือกกรอง (เทียบจาก doc จริงใน _courses) */
function teacherHasReviewStatus(t, status) {
  return Object.values(t.subs).some(function(sub) {
    return (sub._courses || [sub]).some(function(doc) {
      if (doc._isContainer) return false;
      var st = doc.status || 'submitted';
      if (status === 'head_reviewed') return st === 'head_reviewed' || st === 'reviewed';
      return st === status;
    });
  });
}

/* ── ลำดับขั้นตรวจ: 1=หัวหน้ากลุ่มสาระ 2=ผช.ผอ. 3=รอง ผอ. 4=ผอ. ──
   คืนค่า true ถ้าผู้ใช้ที่ล็อกอินอยู่ตอนนี้มีสิทธิ์ตรวจ "ขั้นนี้" ของครูคนนี้ */
function canIReviewStage(stage, t) {
  if (isSuperAdmin) return true;
  var p = adminPermissions || {};
  if (stage === 1) {
    /* หัวหน้ากลุ่มสาระตรวจได้เฉพาะครูในกลุ่มสาระของตัวเอง */
    return isHeadOfGroupOnly && !!headOfGroupName && normaliseGroup(t.staffGroup) === headOfGroupName;
  }
  if (stage === 2) return !!p.assistantDirectorAcademic;
  if (stage === 3) return !!p.deputyDirectorAcademic;
  if (stage === 4) return !!p.director;
  return false;
}

/* true ถ้าครูคนนี้มีรายการอย่างน้อย 1 ชิ้นที่ "ถึงคิว" ให้ผู้ตรวจที่ล็อกอินอยู่ตรวจตอนนี้ */
function hasItemForMeToReview(t) {
  var found = false;
  Object.values(t.subs).forEach(function(sub) {
    if (found) return;
    (sub._courses || [sub]).forEach(function(doc) {
      if (found || doc._isContainer) return;
      var st = doc.status || 'submitted';
      var stage = st === 'submitted' ? 1
                : (st === 'head_reviewed' || st === 'reviewed') ? 2
                : st === 'assistant_reviewed' ? 3
                : st === 'deputy_reviewed' ? 4
                : 0;
      if (stage && canIReviewStage(stage, t)) found = true;
    });
  });
  return found;
}

/* ── สร้าง doc type filter buttons ── */
function buildDocFilterBar() {
  var bar = document.getElementById('docFilterBar');
  if (!bar) return;

  /* ลบปุ่มเก่าทิ้งหมด (ยกเว้น label span และปุ่ม "ทั้งหมด") */
  var children = Array.prototype.slice.call(bar.children);
  children.forEach(function(el) {
    if (el.id !== 'docAll' && el.tagName !== 'SPAN') bar.removeChild(el);
  });

  DOCUMENT_TYPES.forEach(function(dt) {
    var btn = document.createElement('button');
    btn.className = 'filter-pill' + (currentDocFilter === dt.id ? ' active' : '');
    btn.id = 'doc_' + dt.id;
    btn.textContent = dt.label;
    btn.onclick = function() { setDocFilter(dt.id); };
    bar.appendChild(btn);
  });

  document.getElementById('docAll').className = 'filter-pill' + (currentDocFilter === 'all' ? ' active' : '');
}

/* ── helper: สร้าง merged-status map (email|docTypeId → status) จาก teacherMap ──
   ใช้ merged status เดียวกับที่ teacherMap.subs[docTypeId].status คำนวณไว้แล้ว
   (ต่ำสุดของทุก course ใน docType นั้น) เพื่อให้ stat cards, donut chart
   และกราฟอื่น ๆ นับจากฐานเดียวกัน ไม่นับ raw docs ซ้ำกัน */
function buildMergedStatusMap() {
  var map = {};
  Object.values(teacherMap).forEach(function(t) {
    if (!t.isTeacher) return;
    DOCUMENT_TYPES.forEach(function(dt) {
      var sub = t.subs[dt.id];
      var st  = sub ? (sub.status || 'submitted') : 'none';
      if (st === 'reviewed') st = 'head_reviewed';
      map[t.email + '|' + dt.id] = st;
    });
  });
  return map;
}
function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

function setView(v) {
  currentView = v;
  document.getElementById('viewList').className = 'view-btn' + (v==='list'?' active':'');
  document.getElementById('viewMatrix').className = 'view-btn' + (v==='matrix'?' active':'');
  renderView();
}

function setGroup(g) {
  currentGroup = g;
  /* update "ทั้งหมด" button */
  document.getElementById('grpAll').className = 'filter-pill' + (g === 'all' ? ' active' : '');
  /* update group buttons (dynamic) */
  availableGroups.forEach(function(grp) {
    var el = document.getElementById('grp_' + grp);
    if (el) el.className = 'filter-pill' + (g === grp ? ' active' : '');
  });
  renderView();
}

function getFilteredTeachers() {
  var q = (document.getElementById('searchInput').value||'').toLowerCase();
  return Object.values(teacherMap).filter(function(t) {
    if (!t.isTeacher) return false;
    /* search ชื่อจริง (staffName) และอีเมล */
    if (q && !(
      (t.staffName  || '').toLowerCase().includes(q) ||
      (t.email      || '').toLowerCase().includes(q) ||
      (t.staffGroup || '').toLowerCase().includes(q)
    )) return false;
    /* group filter — เทียบ staffGroup ที่ normalise แล้วตรง ๆ */
    if (currentGroup !== 'all') {
      if (normaliseGroup(t.staffGroup) !== normaliseGroup(currentGroup)) return false;
    }
    var count = Object.keys(t.subs).length;
    if (currentFilter === 'complete')   return count === DOCUMENT_TYPES.length;
    if (currentFilter === 'incomplete') return count < DOCUMENT_TYPES.length;
    if (currentFilter === 'pending')    return currentYear !== 2568 && Object.values(t.subs).some(function(s){ return s.status==='submitted' || s.status==='head_reviewed' || s.status==='assistant_reviewed' || s.status==='deputy_reviewed'; });
    /* doc type filter — กรองเฉพาะครูที่มีงานชนิดนั้น */
    if (currentDocFilter !== 'all' && !t.subs.hasOwnProperty(currentDocFilter)) return false;
    /* สถานะการตรวจ — กรองเฉพาะครูที่มีเอกสารอยู่ในสถานะที่เลือก */
    if (currentReviewStatusFilter !== 'all' && !teacherHasReviewStatus(t, currentReviewStatusFilter)) return false;
    return true;
  });
}

function renderView() {
  if (currentView === 'list') renderListView();
  else renderMatrixView();
}

function getNeedsReviewPriority(t) {
  /* 0=ไม่มีรอ, 1=รอหัวหน้าตรวจ, 2=รอผช.ผอ., 3=รอรอง ผอ., 4=รอ ผอ.อนุมัติ
     อ่านจาก doc.status ใน _courses โดยตรง */
  var hasSubmitted       = false;
  var hasHeadReviewed    = false;
  var hasAssistReviewed  = false;
  var hasDeputyReviewed  = false;
  Object.values(t.subs).forEach(function(sub) {
    var docs = sub._courses || [sub];
    docs.forEach(function(doc) {
      if (doc._isContainer) return;
      var st = doc.status || 'submitted';
      if (st === 'deputy_reviewed')    hasDeputyReviewed = true;
      if (st === 'assistant_reviewed') hasAssistReviewed = true;
      if (st === 'head_reviewed' || st === 'reviewed') hasHeadReviewed = true;
      if (st === 'submitted') hasSubmitted = true;
    });
  });
  if (hasDeputyReviewed)   return 4;
  if (hasAssistReviewed)   return 3;
  if (hasHeadReviewed)     return 2;
  if (hasSubmitted)        return 1;
  return 0;
}

function renderListView() {
  var teachers = getFilteredTeachers();
  var main = document.getElementById('mainContent');

  if (!teachers.length) {
    main.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3);"><i data-lucide="search-x" style="width:36px;height:36px;margin-bottom:12px;"></i><p style="font-size:14px;font-weight:700;">ไม่พบข้อมูล</p></div>';
    lucide.createIcons(); return;
  }

  /* ── เรียงลำดับ: รายการที่ "ถึงคิว" ให้ฉันตรวจก่อนเสมอ → งานรอตรวจก่อน → ตามเวลาส่งล่าสุด ── */
  teachers.sort(function(a, b) {
    var ma = hasItemForMeToReview(a) ? 1 : 0, mb = hasItemForMeToReview(b) ? 1 : 0;
    if (mb !== ma) return mb - ma; /* มีสิทธิ์ตรวจอยู่บนสุดเสมอ */
    var pa = getNeedsReviewPriority(a), pb = getNeedsReviewPriority(b);
    if (pb !== pa) return pb - pa; /* งานรอตรวจก่อน */
    return getLatestSubmitTime(b) - getLatestSubmitTime(a); /* ส่งล่าสุดก่อน */
  });

  /* นับว่ามีกี่คนรอตรวจ */
  var waitCount       = teachers.filter(function(t){ return getNeedsReviewPriority(t)===1; }).length;
  var headWaitCount   = teachers.filter(function(t){ return getNeedsReviewPriority(t)===2; }).length;
  var assistWaitCount = teachers.filter(function(t){ return getNeedsReviewPriority(t)===3; }).length;
  var deputyWaitCount = teachers.filter(function(t){ return getNeedsReviewPriority(t)===4; }).length;

  var summaryHtml = '';
  if (waitCount || headWaitCount || assistWaitCount || deputyWaitCount) {
    summaryHtml = '<div style="display:flex;gap:var(--gap-item);flex-wrap:wrap;margin-bottom:12px;padding:10px 14px;background:var(--yellow-light-2);border:1.5px solid var(--amber-mid);border-radius:12px;align-items:center;">' +
      '<i data-lucide="bell-ring" style="width:16px;height:16px;color:var(--role-director-color);flex-shrink:0;"></i>' +
      '<span style="font-size:13px;font-weight:700;color:var(--amber-dark);">มีงานรอตรวจ:</span>' +
      (waitCount       ? '<span class="review-badge waiting">📤 รอหัวหน้าฯ ' + waitCount + ' คน</span>' : '') +
      (headWaitCount   ? '<span class="review-badge head-wait">👤 รอ ผช.ผอ. ' + headWaitCount + ' คน</span>' : '') +
      (assistWaitCount ? '<span style="background:var(--role-hog-bg);color:var(--amber-dark);padding:2px 9px;border-radius:10px;font-size:10px;font-weight:700;border:1px solid var(--amber-mid);">🏅 รอรอง ผอ. ' + assistWaitCount + ' คน</span>' : '') +
      (deputyWaitCount ? '<span style="background:var(--purple-light);color:var(--indigo);padding:2px 9px;border-radius:10px;font-size:10px;font-weight:700;border:1px solid var(--purple-mid);">👑 รอ ผอ. ' + deputyWaitCount + ' คน</span>' : '') +
    '</div>';
  }

  var html = summaryHtml + '<div style="display:flex;flex-direction:column;gap:var(--gap-item);">';
  teachers.forEach(function(t) {
    var subCount = Object.keys(t.subs).length;
    var pct = Math.round((subCount / DOCUMENT_TYPES.length) * 100);
    /* นับจาก doc จริงใน _courses (ไม่ใช่ merged status ของ container) */
    var finalCount = 0, headRevCount = 0, assistRevCount = 0, deputyRevCount = 0, pendingCount = 0, revisionCount = 0;
    Object.values(t.subs).forEach(function(sub) {
      (sub._courses || [sub]).forEach(function(doc) {
        if (doc._isContainer) return;
        var st = fakeStatus(doc.status || 'submitted');
        if (st === 'final_approved')     finalCount++;
        else if (st === 'deputy_reviewed')    deputyRevCount++;
        else if (st === 'assistant_reviewed') assistRevCount++;
        else if (st === 'head_reviewed' || st === 'reviewed') headRevCount++;
        else if (st === 'submitted') pendingCount++;
        else if (st === 'revision')  revisionCount++;
      });
    });
    var reviewPriority = getNeedsReviewPriority(t);
    var isMyTurn = hasItemForMeToReview(t);

    /* row class ตามสถานะ — ถ้าถึงคิวให้ "ฉัน" ตรวจ ให้เด่นกว่าทุกสถานะอื่น */
    var rowClass = 'teacher-row';
    if      (isMyTurn)                 rowClass += ' my-turn';
    else if (reviewPriority === 2)     rowClass += ' needs-head-review';
    else if (reviewPriority === 1)     rowClass += ' needs-review';

    /* เวลาส่งล่าสุด */
    var latestTime = getLatestSubmitTime(t);
    var latestLabel = latestTime ? '<span class="sort-label"><i data-lucide="clock" style="width:10px;height:10px;"></i>' + formatDate({ toDate: function(){ return new Date(latestTime); } }) + '</span>' : '';

    html +=
      '<div class="' + rowClass + '">' +
        '<div class="teacher-header" onclick="toggleTeacher(\'' + t.uid + '\')">' +
          '<img src="https://ui-avatars.com/api/?name=' + encodeURIComponent(t.staffName||t.displayName) + '&background=7c3aed&color=fff&size=40" alt="' + esc2(t.staffName||t.displayName) + '" style="width:40px;height:40px;border-radius:50%;flex-shrink:0;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:center;gap:var(--gap-tight);flex-wrap:wrap;">' +
              '<p style="font-size:14px;font-weight:800;color:var(--text-dark);">' + esc2(t.staffName || t.displayName) + '</p>' +
              (t.position ? '<span style="font-size:10px;font-weight:700;background:var(--bg-alt);color:var(--text-mid);padding:1px 8px;border-radius:8px;">' + esc2(t.position) + '</span>' : '') +
              (isMyTurn ? '<span class="my-turn-badge">🔔 ถึงคิวคุณตรวจ</span>' : '') +
              (pendingCount   ? '<span class="review-badge waiting">📤 รอตรวจ ' + pendingCount + ' รายการ</span>' : '') +
              (headRevCount   ? '<span class="review-badge head-wait">👤 รอ ผช.ผอ. ' + headRevCount + ' รายการ</span>' : '') +
              (assistRevCount ? '<span style="background:var(--role-hog-bg);color:var(--amber-dark);padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;">🏅 รอรอง ผอ. ' + assistRevCount + '</span>' : '') +
              (deputyRevCount ? '<span style="background:var(--purple-light);color:var(--indigo);padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;">👑 รอ ผอ. ' + deputyRevCount + '</span>' : '') +
              (revisionCount  ? '<span style="background:var(--amber-light);color:var(--orange-deep-3);padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;">ให้แก้ไข ' + revisionCount + '</span>' : '') +
              (finalCount     ? '<span style="background:var(--role-budget-bg);color:var(--teal-dark);padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;">ผอ.อนุมัติ ✓ ' + finalCount + '</span>' : '') +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap;">' +
              (t.staffGroup ? '<span style="font-size:9px;font-weight:800;padding:2px 8px;background:var(--purple-light);color:var(--indigo-4);border-radius:8px;">' + esc2(t.staffGroup) + '</span>' : '') +
              '<p style="font-size:11px;color:var(--text3);">' + esc2(t.email) + '</p>' +
              latestLabel +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:var(--gap-tight);margin-top:6px;">' +
              '<div class="pbar-bg" style="flex:1;max-width:200px;"><div class="pbar-fill" style="width:' + pct + '%;"></div></div>' +
              '<span style="font-size:11px;font-weight:700;color:var(--purple);">' + subCount + '/' + DOCUMENT_TYPES.length + '</span>' +
              '<span style="font-size:10px;color:var(--text3);">(' + (currentYear===2568 ? subCount : finalCount) + ' ผอ.อนุมัติ)</span>' +
            '</div>' +
          '</div>' +
          '<i data-lucide="chevron-down" id="chevron-' + t.uid + '" style="width:16px;height:16px;color:var(--text3);transition:transform .2s;flex-shrink:0;"></i>' +
        '</div>' +
        '<div class="teacher-docs" id="docs-' + t.uid + '">' +
          '<div class="doc-grid">' +
            DOCUMENT_TYPES.map(function(dt) {
              var sub = t.subs[dt.id];
              var status = fakeStatus(sub ? (sub.status||'submitted') : 'none');
              var needsReview = sub && (status==='submitted' || status==='head_reviewed');

              /* ── per-course breakdown ── */
              var courseMap  = sub ? buildCourseMapFromSub(sub) : {};
              var courseKeys = Object.keys(courseMap);
              var isMulti    = courseKeys.length > 1;

              /* helper: สถานะของ course key = doc.status จาก _courses */
              function getCourseDocStatus(cKey) {
                var cFiles = courseMap[cKey] || [];
                if (!cFiles.length) return 'none';
                /* ดึงจาก _courses ของ sub โดยตรง */
                var cDocId = cFiles[0]._docId;
                if (cDocId && sub._courses) {
                  var cDoc = sub._courses.find(function(d){ return d.id === cDocId; });
                  if (cDoc) return cDoc.status || 'submitted';
                }
                return cFiles[0].status || 'submitted';
              }

              /* ── chip หลัก: ใช้ merged status (sub.status) ── */
              var chipStatus = status;
              if (isMulti) {
                var hasSubmitted      = courseKeys.some(function(k){ return getCourseDocStatus(k) === 'submitted'; });
                var hasHeadReviewed   = courseKeys.some(function(k){ return getCourseDocStatus(k) === 'head_reviewed'; });
                var hasAssistReviewed = courseKeys.some(function(k){ return getCourseDocStatus(k) === 'assistant_reviewed'; });
                var hasDeputyReviewed = courseKeys.some(function(k){ return getCourseDocStatus(k) === 'deputy_reviewed'; });
                var hasRevision       = courseKeys.some(function(k){ return getCourseDocStatus(k) === 'revision'; });
                var allFinal          = courseKeys.every(function(k){ return getCourseDocStatus(k) === 'final_approved'; });
                chipStatus = allFinal ? 'final_approved' : hasRevision ? 'revision' : hasDeputyReviewed ? 'deputy_reviewed' : hasAssistReviewed ? 'assistant_reviewed' : hasHeadReviewed ? 'head_reviewed' : hasSubmitted ? 'submitted' : status;
              }
              var chipNeedsReview = sub && (chipStatus==='submitted' || chipStatus==='head_reviewed');
              var chipCls = 'doc-chip chip-' + chipStatus + (chipNeedsReview ? ' needs-attention' : '');
              var icon = {
                none:'circle', submitted:'upload', head_reviewed:'user-check',
                reviewed:'check-circle', assistant_reviewed:'medal',
                deputy_reviewed:'crown', final_approved:'gem', revision:'alert-circle'
              }[chipStatus] || 'circle';

              /* ── per-course rows (แสดงเสมอถ้ามีหลาย course, แสดง wf bar ถ้า single) ── */
              var courseBreakdown = '';
              var wfHtml = '';

              if (isMulti) {
                /* แสดงแถวแยกทุก course พร้อม workflow bar ของแต่ละ course */
                courseBreakdown = '<div style="margin-top:4px;display:flex;flex-direction:column;gap:4px;">' +
                  courseKeys.map(function(cKey) {
                    var cFiles  = courseMap[cKey];
                    var cStatus = getCourseDocStatus(cKey);
                    var cCode   = cFiles[0].courseCode || cKey;
                    var cName   = cFiles[0].courseName || '';
                    var cIcon   = { none:'○', submitted:'↑', head_reviewed:'✓', reviewed:'✓', assistant_reviewed:'🏅', deputy_reviewed:'👑', final_approved:'★', revision:'!' }[cStatus] || '·';
                    var cColor  = { none:'var(--text3)', submitted:'var(--c-green)', head_reviewed:'var(--c-sky)', reviewed:'var(--c-sky)', assistant_reviewed:'var(--c-amber-deep)', deputy_reviewed:'var(--c-violet)', final_approved:'var(--c-green)', revision:'var(--c-amber)' }[cStatus] || 'var(--text3)';
                    var cBg     = { none:'var(--bg)', submitted:'var(--c-green-pale)', head_reviewed:'var(--sky-light)', reviewed:'var(--sky-light)', assistant_reviewed:'#fef3c7', deputy_reviewed:'var(--c-violet-pale)', final_approved:'#d1fae5', revision:'var(--c-amber-pale)' }[cStatus] || 'var(--bg)';
                    var cBorder = { none:'var(--border)', submitted:'var(--c-green-mid)', head_reviewed:'var(--c-sky-mid)', reviewed:'var(--c-sky-mid)', assistant_reviewed:'var(--c-amber-mid)', deputy_reviewed:'var(--purple-mid)', final_approved:'#6ee7b7', revision:'var(--c-amber-tint)' }[cStatus] || 'var(--border)';
                    var cDocIdForClick = cFiles[0]._docId || subDocId;
                    return '<div style="border:1.5px solid ' + cBorder + ';background:' + cBg + ';border-radius:8px;padding:4px 6px;cursor:pointer;" onclick="event.stopPropagation();openReviewCourse(\'' + cDocIdForClick + '\',\'' + t.uid + '\',\'' + dt.id + '\',\'' + esc(cKey) + '\')">' +
                      '<div style="display:flex;align-items:center;gap:4px;">' +
                        '<span style="font-size:10px;font-weight:800;color:' + cColor + ';">' + cIcon + '</span>' +
                        '<span style="font-size:9px;font-weight:800;color:var(--accent);background:var(--accent-tint);padding:1px 5px;border-radius:4px;">' + esc2(cCode) + '</span>' +
                        (cName ? '<span style="font-size:9px;color:var(--text-mid);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70px;">' + esc2(cName) + '</span>' : '') +
                      '</div>' +
                      buildWorkflowBar(cStatus) +
                    '</div>';
                  }).join('') +
                '</div>';
              } else if (sub) {
                /* single course → workflow bar เดียว */
                wfHtml = buildWorkflowBar(status);
              }

              var courseCountBadge = isMulti ? '<span style="background:var(--purple-light);color:var(--indigo);border-radius:6px;padding:1px 5px;font-size:9px;font-weight:800;margin-left:2px;">' + courseKeys.length + ' วิชา</span>' : '';
              /* sub เป็น container ไม่มี .id → ส่ง _courses[0].id หรือ '__container__' */
              var subDocId = sub ? (sub._courses && sub._courses[0] ? sub._courses[0].id : (sub.id || '')) : '';

              /* ── Notes button ── */
              var notesBtn = '';
              if (sub) {
                var hasTeacherNote = false, hasAdminNote = false, hasRevision = false;
                (sub._courses || [sub]).forEach(function(doc) {
                  if (doc._isContainer) return;
                  if (doc.note) hasTeacherNote = true;
                  if (doc.adminNote || doc.headNote || doc.assistantNote || doc.deputyNote || doc.directorNote) hasAdminNote = true;
                  if (doc.status === 'revision') hasRevision = true;
                });
                var notesCls = 'notes-btn' + (hasRevision ? ' has-revision' : hasAdminNote || hasTeacherNote ? ' has-note' : '');
                var notesIcon = hasRevision ? '⚠' : (hasAdminNote || hasTeacherNote) ? '💬' : '📝';
                var notesLabel = hasRevision ? 'แก้ไข' : (hasAdminNote || hasTeacherNote) ? 'บันทึก' : 'บันทึก';
                notesBtn = '<button class="' + notesCls + '" onclick="event.stopPropagation();openNotesModal(\'' + esc(t.uid) + '\',\'' + esc(dt.id) + '\')">' +
                  notesIcon + ' ' + notesLabel +
                '</button>';
              }

              return '<div style="display:flex;flex-direction:column;gap:4px;">' +
                '<button class="' + chipCls + '" onclick="openReview(\'' + subDocId + '\',\'' + t.uid + '\',\'' + dt.id + '\')" ' + (!sub?'disabled style="cursor:default;opacity:.6;"':'') + (chipNeedsReview?' style="box-shadow:0 0 0 2px var(--amber-2);"':'') + '>' +
                  '<i data-lucide="' + icon + '" style="width:12px;height:12px;flex-shrink:0;"></i>' +
                  '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">' + dt.label + '</span>' +
                  courseCountBadge +
                '</button>' +
                notesBtn +
                courseBreakdown +
                wfHtml +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
  });
  html += '</div>';
  main.innerHTML = html;
  lucide.createIcons();
}

/* ─── WORKFLOW BAR HELPER ─── */
function buildWorkflowBar(status) {
  var steps = [
    { key: 'submitted',          label: 'ครูส่งงาน',            icon: '📤' },
    { key: 'head_reviewed',      label: 'หัวหน้ากลุ่มสาระตรวจ', icon: '👤' },
    { key: 'assistant_reviewed', label: 'ผช.ผอ.วิชาการตรวจ',    icon: '🏅' },
    { key: 'deputy_reviewed',    label: 'รอง ผอ.วิชาการตรวจ',   icon: '👑' },
    { key: 'final_approved',     label: 'ผู้อำนวยการอนุมัติ',   icon: '🎖️' },
  ];
  /*
   * ORDER แมป "สถานะ" → "ดัชนีขั้นที่ผ่านไปแล้ว (done)"
   *   submitted        = ครูส่งแล้ว     → step 0 done, step 1 waiting
   *   head_reviewed    = หัวหน้าตรวจแล้ว → step 0+1 done, step 2 waiting
   *   assistant_reviewed → step 0+1+2 done, step 3 waiting
   *   deputy_reviewed  → step 0+1+2+3 done, step 4 waiting
   *   final_approved   → ทุก step done (4)
   *   reviewed (legacy)= เทียบเท่า head_reviewed
   */
  var ORDER = { submitted:0, reviewed:1, head_reviewed:1, assistant_reviewed:2, deputy_reviewed:3, final_approved:4, revision:-1 };
  var cur = ORDER[status] !== undefined ? ORDER[status] : -1;
  var isRevision = status === 'revision';

  var html = '<div class="workflow-bar">';
  steps.forEach(function(step, i) {
    if (i > 0) html += '<div class="wf-divider"></div>';
    var cls, label;
    if (isRevision) {
      if (i === 0) { cls = 'revision'; label = '⚠ ให้แก้ไข'; }
      else { cls = 'pending'; label = step.label; }
    } else if (i < cur) {
      /* ขั้นที่ผ่านแล้ว */
      cls = 'done';
      label = '✓ ' + step.label;
    } else if (i === cur) {
      /* ขั้นล่าสุดที่ผ่าน (หรือ final_approved) */
      cls = (status === 'final_approved') ? 'final' : 'done';
      label = '✓ ' + step.label;
    } else if (i === cur + 1) {
      /* ขั้นถัดไปที่กำลังรอ */
      cls = (status === 'final_approved') ? 'final' : 'active';
      label = (status === 'final_approved') ? '✓ ' + step.label : '⏳ ' + step.label;
    } else {
      cls = 'pending';
      label = step.label;
    }
    html += '<div class="wf-step ' + cls + '">' + label + '</div>';
  });
  html += '</div>';
  return html;
}

/* ─── MATRIX VIEW ─── */
function renderMatrixView() {
  var teachers = getFilteredTeachers();
  var main = document.getElementById('mainContent');

  if (!teachers.length) {
    main.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3);"><p style="font-size:14px;font-weight:700;">ไม่พบข้อมูล</p></div>';
    return;
  }

  /* เรียงเหมือน list view: ถึงคิวฉันตรวจก่อนเสมอ */
  teachers.sort(function(a, b) {
    var ma = hasItemForMeToReview(a) ? 1 : 0, mb = hasItemForMeToReview(b) ? 1 : 0;
    if (mb !== ma) return mb - ma;
    var pa = getNeedsReviewPriority(a), pb = getNeedsReviewPriority(b);
    if (pb !== pa) return pb - pa;
    return getLatestSubmitTime(b) - getLatestSubmitTime(a);
  });

  var html =
    '<div class="card" style="padding:16px;overflow-x:auto;">' +
    '<table class="matrix-table">' +
    '<thead><tr>' +
      '<th style="text-align:left;min-width:160px;padding-left:8px;">ครู</th>' +
      DOCUMENT_TYPES.map(function(dt){
        return '<th style="min-width:54px;" title="' + dt.label + '">' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">' +
            '<i data-lucide="' + dt.icon + '" style="width:13px;height:13px;color:' + dt.color + ';"></i>' +
            '<span>' + dt.short + '</span>' +
          '</div>' +
        '</th>';
      }).join('') +
      '<th>ส่งงานแล้ว</th>' +
    '</tr></thead><tbody>';

  teachers.forEach(function(t) {
    var count = Object.keys(t.subs).length;
    var reviewPriority = getNeedsReviewPriority(t);
    var isMyTurn = hasItemForMeToReview(t);
    var rowStyle = isMyTurn ? 'background:var(--violet-light);box-shadow:inset 3px 0 0 var(--violet);' : reviewPriority === 2 ? 'background:var(--sky-light);' : reviewPriority === 1 ? 'background:var(--yellow-light-3);' : '';
    html += '<tr style="' + rowStyle + '"><td style="padding:8px 8px;"><div style="display:flex;align-items:center;gap:var(--gap-tight);">' +
      '<img src="https://ui-avatars.com/api/?name=' + encodeURIComponent(t.staffName||t.displayName) + '&background=7c3aed&color=fff&size=28" alt="' + esc2(t.staffName||t.displayName) + '" style="width:28px;height:28px;border-radius:50%;flex-shrink:0;">' +
      '<div style="overflow:hidden;">' +
        '<p style="font-size:12px;font-weight:700;color:var(--text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">' + esc2(t.staffName || t.displayName) + '</p>' +
        (t.staffGroup ? '<p style="font-size:9px;color:var(--purple);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">' + esc2(t.staffGroup) + '</p>' : '') +
      '</div>' +
    '</div></td>';

    DOCUMENT_TYPES.forEach(function(dt) {
      var sub = t.subs[dt.id];
      var status = fakeStatus(sub ? (sub.status||'submitted') : 'none');
      var cellCls = 'matrix-cell cell-' + status;
      var icon = { none:'minus', submitted:'check', head_reviewed:'user-check', reviewed:'user-check', assistant_reviewed:'medal', deputy_reviewed:'crown', final_approved:'gem', revision:'alert-triangle' }[status] || 'minus';
      var iconColor = { none:'#d1d5db', submitted:'var(--c-green)', head_reviewed:'var(--c-sky)', reviewed:'var(--c-sky)', assistant_reviewed:'var(--c-amber-deep)', deputy_reviewed:'var(--c-violet)', final_approved:'var(--c-green)', revision:'var(--c-amber)' }[status] || 'var(--blue-pale)';
      html += '<td><div class="' + cellCls + '" onclick="' + (sub?'openReview(\''+sub.id+'\',\''+t.uid+'\',\''+dt.id+'\')':'') + '" title="' + dt.label + (sub?'\nส่งเมื่อ: '+formatDate(sub.submittedAt):'') + '">' +
        '<i data-lucide="' + icon + '" style="width:12px;height:12px;color:' + iconColor + ';"></i>' +
      '</div></td>';
    });

    html += '<td style="text-align:center;"><span style="font-size:13px;font-weight:800;color:' + (count===DOCUMENT_TYPES.length?'var(--purple)':'var(--text2)') + ';">' + count + '/' + DOCUMENT_TYPES.length + '</span></td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  main.innerHTML = html;
  lucide.createIcons();
}

/* จัดกลุ่มไฟล์ตาม courseCode → { courseCode: [file,...] } */
function buildCourseMap(sub) {
  return buildCourseMapFromSub(sub);
}
function buildCourseMapFromSub(sub) {
  var map = {};

  /* sub ตอนนี้เป็น container เสมอ (มี _courses[])
     แต่ละ element ใน _courses คือ Firestore doc จริง (มี .id) */
  var docs = sub._courses || [sub];

  docs.forEach(function(doc) {
    /* ป้องกัน doc ที่เป็น container ตัวเอง (circular) */
    if (doc._isContainer) return;

    var key = doc.courseCode || doc.id || '__single__';
    if (!map[key]) map[key] = [];

    /* doc.status คือสถานะจริงของ Firestore doc นั้น */
    var docStatus = doc.status || 'submitted';
    var docId     = doc.id;   /* Firestore document ID */

    if (doc.files && doc.files.length > 0) {
      doc.files.forEach(function(f) {
        map[key].push({
          url:          f.url || f.fileUrl || doc.fileUrl,
          fileUrl:      f.url || f.fileUrl || doc.fileUrl,
          fileName:     f.fileName || f.name,
          name:         f.fileName || f.name,
          courseCode:   f.courseCode  || doc.courseCode,
          courseName:   f.courseName  || doc.courseName,
          subjectGroup: f.subjectGroup || doc.subjectGroup,
          submittedAt:  f.submittedAt  || doc.submittedAt,
          note:         f.note || doc.note,
          /* status และ adminNote ดึงจาก doc เสมอ (canonical) */
          status:       docStatus,
          adminNote:    doc.adminNote || '',
          _docId:       docId,
        });
      });
    } else {
      /* ไม่มี files[] — fallback เป็น single file จาก doc fields */
      map[key].push({
        url:          doc.fileUrl,
        fileUrl:      doc.fileUrl,
        fileName:     doc.fileName || doc.fileUrl,
        name:         doc.fileName || doc.fileUrl,
        courseCode:   doc.courseCode,
        courseName:   doc.courseName,
        subjectGroup: doc.subjectGroup,
        submittedAt:  doc.submittedAt,
        note:         doc.note,
        status:       docStatus,
        adminNote:    doc.adminNote || '',
        _docId:       docId,
      });
    }
  });
  return map;
}

/* สร้าง object สำหรับ fillSingleFileInfo จาก file entry */
function buildFileInfoObj(sub, f) {
  return Object.assign({}, sub, {
    fileUrl:     f.url     || sub.fileUrl,
    fileName:    f.fileName || f.name,
    status:      f.status  || sub.status || 'submitted',
    adminNote:   f.adminNote !== undefined ? f.adminNote : (sub.adminNote || ''),
    submittedAt: f.submittedAt || sub.submittedAt,
    note:        f.note    || sub.note,
    courseCode:  f.courseCode  || sub.courseCode,
    courseName:  f.courseName  || sub.courseName,
    subjectGroup: f.subjectGroup || sub.subjectGroup,
  });
}

/* แสดง course selector และ highlight รายวิชาที่เลือก */
function renderCourseFileList(sub, courseMap, activeCourseKey) {
  selectedCourseKey = activeCourseKey;

  /* sync reviewingSubId ให้ตรงกับ course ที่เลือก */
  var activeFiles = courseMap[activeCourseKey] || [];
  if (activeFiles.length > 0 && activeFiles[0]._docId) {
    reviewingSubId = activeFiles[0]._docId;
  }

  var multiList = document.getElementById('multiFileList');
  var statusLabels = { submitted:'📤 รอตรวจ', head_reviewed:'👤 หัวหน้าฯ ✓', reviewed:'👤 หัวหน้าฯ ✓', assistant_reviewed:'🏅 ผช.ผอ. ✓', deputy_reviewed:'👑 รอง ผอ. ✓', final_approved:'🎖 ผอ.อนุมัติ', revision:'⚠ ให้แก้ไข', none:'ยังไม่มีไฟล์' };

  var html = Object.keys(courseMap).map(function(cKey) {
    var files    = courseMap[cKey];
    /* สถานะของรายวิชา = ดึงจาก doc.status โดยตรง (files[0]._docId → _courses) */
    var _cDocId = files.length > 0 ? files[0]._docId : null;
    var _cDocs  = sub._courses || [sub];
    var _cDoc   = _cDocId ? _cDocs.find(function(d){ return d.id === _cDocId; }) : null;
    var courseStatus = _cDoc ? (_cDoc.status || 'submitted') : getCourseStatus(files, sub.status);
    var isSelected   = cKey === activeCourseKey;
    var courseCode   = files[0].courseCode || sub.courseCode || cKey;
    var courseName   = files[0].courseName || sub.courseName || '';
    return '<div class="file-item fi-' + courseStatus + (isSelected?' selected':'') + '" onclick="selectCourse(\'' + esc(cKey) + '\')">' +
      '<i data-lucide="book-open" style="width:16px;height:16px;color:var(--purple);flex-shrink:0;"></i>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
          '<span style="font-size:12px;font-weight:800;color:var(--accent);background:var(--accent-tint);padding:2px 8px;border-radius:6px;">' + esc2(courseCode) + '</span>' +
          '<span style="font-size:12px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">' + esc2(courseName) + '</span>' +
        '</div>' +
        '<p style="font-size:10px;color:var(--text3);margin-top:2px;">' + files.length + ' ไฟล์</p>' +
      '</div>' +
      '<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:8px;flex-shrink:0;' + getStatusChipStyle(courseStatus) + '">' + (statusLabels[courseStatus]||courseStatus) + '</span>' +
    '</div>';
  }).join('');

  multiList.innerHTML = html;

  /* set selectedCourseKey ก่อน แล้วค่อยเรียก fillSingleFileInfo
     เพื่อให้ fillSingleFileInfo ดึง courseFiles จาก selectedCourseKey ที่อัปเดตแล้ว */
  selectedFileIdx = 0;
  fillSingleFileInfo({});   /* pass object ว่าง — fillSingleFileInfo จะดึงข้อมูลจาก courseMap เอง */
  lucide.createIcons();
}

/* คำนวณสถานะรวมของรายวิชาจากไฟล์ทั้งหมดในวิชานั้น */
function getCourseStatus(files, fallbackStatus) {
  if (!files || !files.length) return fallbackStatus || 'none';
  var order = { none:0, submitted:1, revision:2, head_reviewed:3, reviewed:3, final_approved:4 };
  return files.reduce(function(acc, f) {
    var s = f.status || fallbackStatus || 'submitted';
    return order[s] < order[acc] ? s : acc;
  }, 'final_approved');
}

/* (legacy — kept for single-file list fallback) */
function renderMultiFileList(sub, files, idx) {
  selectedFileIdx = idx;
  var multiList = document.getElementById('multiFileList');
  var statusLabels = { submitted:'📤 ส่งแล้ว รอตรวจ', head_reviewed:'👤 หัวหน้าฯ ✓', reviewed:'👤 หัวหน้าฯ ✓', assistant_reviewed:'🏅 ผช.ผอ. ✓', deputy_reviewed:'👑 รอง ผอ. ✓', final_approved:'🎖 ผอ.อนุมัติ', revision:'⚠ ให้แก้ไข', none:'ยังไม่มีไฟล์' };
  multiList.innerHTML = files.map(function(f, i) {
    var fStatus = f.status || sub.status || 'submitted';
    var isSelected = i === idx;
    return '<div class="file-item fi-' + fStatus + (isSelected?' selected':'') + '" onclick="selectFile(' + i + ')">' +
      '<i data-lucide="file-text" style="width:16px;height:16px;color:var(--purple);flex-shrink:0;"></i>' +
      '<div style="flex:1;min-width:0;">' +
        '<p style="font-size:13px;font-weight:700;color:var(--text-dark);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc2(f.name || 'ไฟล์ที่ ' + (i+1)) + '</p>' +
        '<p style="font-size:10px;color:var(--text3);">' + (f.submittedAt ? formatDate(f.submittedAt) : '-') + '</p>' +
      '</div>' +
      '<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:8px;flex-shrink:0;' + getStatusChipStyle(fStatus) + '">' + (statusLabels[fStatus]||fStatus) + '</span>' +
    '</div>';
  }).join('');
  var f = files[idx];
  fillSingleFileInfo(buildFileInfoObj(sub, f));
  lucide.createIcons();
}

function getStatusChipStyle(status) {
  var map = {
    submitted:          'background:var(--green-light);color:var(--green-deep);',
    head_reviewed:      'background:var(--sky-light);color:var(--role-hr-color);',
    reviewed:           'background:var(--sky-light);color:var(--role-hr-color);',
    assistant_reviewed: 'background:var(--role-hog-bg);color:var(--amber-dark);',
    deputy_reviewed:    'background:var(--purple-light);color:var(--indigo);',
    final_approved:     'background:var(--role-budget-bg);color:var(--teal-dark);',
    revision:           'background:var(--amber-light);color:var(--amber-dark);',
    none:               'background:var(--bg);color:var(--text3);',
  };
  return map[status] || map.none;
}

/* เติมข้อมูลรายวิชาที่เลือก
   sub = buildFileInfoObj(...) หรือ doc object
   แต่ข้อมูลที่แสดงดึงจาก courseFiles ของ selectedCourseKey โดยตรง
   เพื่อให้แน่ใจว่าเปลี่ยนวิชาแล้วข้อมูลเปลี่ยนตามจริง */
function fillSingleFileInfo(sub) {
  /* หา courseFiles จาก selectedCourseKey ปัจจุบัน (ถ้ามี) */
  var t       = teacherMap[reviewingUid];
  var origSub = t && t.subs[reviewingDocTypeId];
  var courseMap   = origSub ? buildCourseMap(origSub) : null;
  var courseFiles = (courseMap && selectedCourseKey) ? (courseMap[selectedCourseKey] || []) : [];

  /* ใช้ข้อมูลจาก courseFiles ถ้ามี ไม่งั้น fallback ไปที่ sub parameter */
  var displayFile = courseFiles.length > 0 ? courseFiles[0] : sub;

  /* ── สถานะเฉพาะของ course ที่เลือก ──
     อ่านจาก targetDoc.status (ระดับ Firestore doc) เป็นหลัก
     เพราะ setReviewStatus อัปเดตเฉพาะ doc.status ไม่แตะ files[].status */
  var curStatus = 'submitted';
  if (courseFiles.length > 0 && courseFiles[0]._docId && origSub) {
    var _fdocs = origSub._courses || [origSub];
    var _fdoc  = _fdocs.find(function(d){ return d.id === courseFiles[0]._docId; });
    curStatus  = _fdoc ? (_fdoc.status || 'submitted') : (courseFiles[0].status || sub.status || 'submitted');
  } else if (courseFiles.length > 0) {
    curStatus = courseFiles[0].status || (origSub ? origSub.status : 'submitted') || 'submitted';
  } else {
    curStatus = (origSub ? origSub.status : null) || sub.status || 'submitted';
  }

  var displayNote = displayFile.adminNote !== undefined ? displayFile.adminNote : (sub.adminNote || '');

  /* ── แสดงลายเซ็นของ "ผู้ตรวจที่ล็อกอินอยู่ตอนนี้เอง" ที่เคยใช้ล่าสุด ──
     ⚠️ เดิมโค้ดตรงนี้ดึง headSignatureURL/assistantSignatureURL ฯลฯ จากตัวเอกสาร
     ตาม curStatus ปัจจุบัน ซึ่งจริงๆ คือลายเซ็นของ "ผู้ตรวจขั้นก่อนหน้า" (คนละคนกับ
     คนที่กำลังจะเซ็นตอนนี้) ทำให้ผู้ตรวจขั้นถัดไปเห็นลายเซ็นคนอื่นแล้วกดใช้ผิด —
     แก้แล้วให้ดึงจาก myAdminSignatureURL ที่โหลดมาจาก admins/{email}.lastSignatureURL
     (บันทึกไว้ทุกครั้งที่ผู้ตรวจคนนี้เซ็นสำเร็จ ดู setReviewStatus()) แทน */
  var existSigDiv = document.getElementById('existingSigPreview');
  var existSigImg = document.getElementById('existingSigImg');
  if (existSigDiv && existSigImg) {
    if (myAdminSignatureURL) {
      existSigImg.src = myAdminSignatureURL;
      existSigDiv.style.display = 'block';
    } else {
      existSigDiv.style.display = 'none';
      existSigImg.src = '';
    }
  }
  if (typeof window.useMyExistingSignature === 'function') {
    var useBtn = document.getElementById('useExistingSigBtn');
    if (useBtn) useBtn.classList.remove('active');
  }

  var statusLabels = {
    submitted:          'ส่งงานแล้ว — รอหัวหน้ากลุ่มสาระตรวจ',
    head_reviewed:      'ผ่านหัวหน้ากลุ่มสาระ — รอ ผช.ผอ.วิชาการตรวจ',
    assistant_reviewed: 'ผ่าน ผช.ผอ.วิชาการ — รอ รอง ผอ.วิชาการตรวจ',
    deputy_reviewed:    'ผ่านรอง ผอ.วิชาการ — รอผู้อำนวยการอนุมัติ',
    reviewed:           'ผ่านหัวหน้ากลุ่มสาระ — รอ ผช.ผอ.วิชาการตรวจ',
    final_approved:     'ผู้อำนวยการอนุมัติแล้ว ✓',
    revision:           'ส่งคืนเพื่อแก้ไข'
  };

  if (courseFiles.length > 1) {
    /* หลายไฟล์ในวิชานี้ — แสดง list ลิงก์เปิดแต่ละไฟล์ */
    var fileListHtml = courseFiles.map(function(f, i) {
      var fStatus = f.status || curStatus;
      var borderColor = {submitted:'var(--c-green)',head_reviewed:'var(--c-sky)',reviewed:'var(--c-sky)',final_approved:'var(--purple)',revision:'var(--c-amber)'}[fStatus] || 'var(--border)';
      return '<div style="display:flex;align-items:center;gap:var(--gap-tight);padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:4px;border-left:3px solid ' + borderColor + ';">' +
        '<i data-lucide="file-text" style="width:13px;height:13px;color:var(--text2);flex-shrink:0;"></i>' +
        '<span style="font-size:11px;font-weight:600;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc2(f.fileName || f.name || 'ไฟล์ที่ ' + (i+1)) + '</span>' +
        '<a href="' + esc2(f.url || f.fileUrl || '#') + '" target="_blank" style="font-size:10px;color:var(--purple);font-weight:700;display:flex;align-items:center;gap:3px;text-decoration:none;padding:3px 7px;background:var(--purple-light);border-radius:6px;border:1px solid var(--role-dep-general-border);flex-shrink:0;">' +
          '<i data-lucide="external-link" style="width:10px;height:10px;"></i> เปิด' +
        '</a>' +
      '</div>';
    }).join('');
    document.getElementById('reviewFileName').textContent = displayFile.courseCode || '-';
    document.getElementById('reviewFileLink').href = displayFile.url || displayFile.fileUrl || '#';
    document.getElementById('reviewFileMeta').innerHTML =
      'ส่งเมื่อ: ' + formatDate(displayFile.submittedAt || sub.submittedAt) +
      ' · <strong>' + courseFiles.length + ' ไฟล์</strong>' +
      ' · สถานะ: ' + (statusLabels[curStatus] || curStatus) +
      '<div style="margin-top:6px;">' + fileListHtml + '</div>';
  } else {
    /* ไฟล์เดียว */
    var fUrl  = displayFile.url || displayFile.fileUrl || sub.fileUrl || '';
    var fName = displayFile.fileName || displayFile.name || sub.fileName || fUrl.slice(0,60) + '…';
    document.getElementById('reviewFileName').textContent = fName || '-';
    document.getElementById('reviewFileLink').href = fUrl || '#';
    document.getElementById('reviewFileMeta').textContent =
      'ส่งเมื่อ: ' + formatDate(displayFile.submittedAt || sub.submittedAt) +
      ' · สถานะ: ' + (statusLabels[curStatus] || curStatus);
  }

  /* แสดง note เก่า (ของขั้นนี้) เป็น reference แต่ไม่เขียนทับ textarea
     เพราะผู้ตรวจต้องกรอกความคิดเห็นใหม่ทุกครั้ง */
  var prevNoteRef = document.getElementById('prevNoteRef');
  if (!prevNoteRef) {
    /* สร้าง element แสดง note เก่าครั้งแรก */
    prevNoteRef = document.createElement('div');
    prevNoteRef.id = 'prevNoteRef';
    var noteTA = document.getElementById('adminNote');
    if (noteTA && noteTA.parentNode) noteTA.parentNode.insertBefore(prevNoteRef, noteTA.nextSibling);
  }
  /* map status → note field */
  var noteFieldMap2 = { head_reviewed:'headNote', reviewed:'headNote', assistant_reviewed:'assistantNote', deputy_reviewed:'deputyNote', final_approved:'directorNote', revision:'adminNote' };
  /* หา doc ของรายวิชาที่กำลังเลือกอยู่ (เหมือนที่หา curStatus ด้านบน) เพื่อดึง note เก่ามาโชว์
     ⚠️ เดิมใช้ตัวแปร _targetDocForSig ซึ่งไม่เคยถูกประกาศไว้เลย ทำให้ ReferenceError
     พัง openReview() ทุกครั้งที่คลิกงาน (ทุกคน ทุกรายการ) — แก้ให้หา doc จริงแทน */
  var _targetDocForSig = null;
  if (courseFiles.length > 0 && courseFiles[0]._docId && origSub) {
    var _ndocs = origSub._courses || [origSub];
    _targetDocForSig = _ndocs.find(function(d){ return d.id === courseFiles[0]._docId; }) || null;
  } else if (origSub) {
    _targetDocForSig = origSub;
  } else {
    _targetDocForSig = sub;
  }
  var prevNoteVal = _targetDocForSig ? (_targetDocForSig[noteFieldMap2[curStatus]] || '') : '';
  if (prevNoteVal) {
    prevNoteRef.style.cssText = 'margin-top:6px;padding:8px 12px;background:var(--amber-light);border-left:3px solid var(--accent-warn);border-radius:0 8px 8px 0;font-size:12px;color:var(--amber-dark);';
    prevNoteRef.innerHTML = '<strong>ความคิดเห็นที่เคยบันทึกไว้:</strong> ' + esc2(prevNoteVal);
  } else {
    prevNoteRef.style.display = 'none';
    prevNoteRef.innerHTML = '';
  }

  /* Workflow bar — ใช้สถานะของรายวิชาที่เลือก */
  var wfBox = document.getElementById('reviewWorkflowBar');
  if (wfBox) wfBox.innerHTML = buildWorkflowBar(curStatus);

  /* course info — ดึงจาก displayFile เสมอ */
  var courseInfoBox = document.getElementById('reviewCourseInfo');
  if (courseInfoBox) {
    var cText = '';
    var cGroup = displayFile.subjectGroup || sub.subjectGroup;
    var cCode  = displayFile.courseCode   || sub.courseCode;
    var cName  = displayFile.courseName   || sub.courseName;
    if (cGroup) cText += '<span style="font-size:10px;font-weight:800;background:var(--accent-tint);color:var(--accent);padding:2px 8px;border-radius:10px;">' + esc2(cGroup) + '</span> ';
    if (cCode)  cText += '<span style="font-size:12px;font-weight:700;color:var(--text-mid);">' + esc2(cCode) + '</span> ';
    if (cName)  cText += '<span style="font-size:12px;color:var(--text2);">· ' + esc2(cName) + '</span>';
    courseInfoBox.style.display = cText ? 'flex' : 'none';
    courseInfoBox.innerHTML = cText;
  }

  var noteBox  = document.getElementById('reviewNoteBox');
  var noteText = displayFile.note || sub.note;
  if (noteText) {
    noteBox.style.display = 'block';
    document.getElementById('reviewNoteText').textContent = '📝 หมายเหตุจากครู: ' + noteText;
  } else { noteBox.style.display = 'none'; }

  /* ── ปุ่มตามบทบาทและสถานะ ── */
  var btnBox = document.getElementById('reviewActionButtons');
  btnBox.innerHTML = '';

  var revisionBtn =
    '<button onclick="setReviewStatus(\'revision\')" style="flex:1;padding:11px;background:var(--amber-light);color:var(--amber-dark);border:1.5px solid var(--amber-mid);font-weight:700;border-radius:12px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">' +
      '<i data-lucide="pencil" style="width:14px;height:14px;"></i> ให้แก้ไข' +
    '</button>';

  var p = adminPermissions || {};

  /* ── superadmin: ตรวจได้ทุกขั้น ── */
  if (isSuperAdmin) {
    if (curStatus === 'final_approved') {
      btnBox.innerHTML =
        '<p style="font-size:12px;color:var(--teal-dark);padding:10px;background:var(--role-budget-bg);border-radius:10px;flex:1;text-align:center;font-weight:700;">✅ ผู้อำนวยการอนุมัติแล้ว</p>' +
        '<button onclick="setReviewStatus(\'revision\')" style="padding:11px 16px;background:var(--amber-light);color:var(--amber-dark);border:1.5px solid var(--amber-mid);font-weight:700;border-radius:12px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px;">' +
          '<i data-lucide="pencil" style="width:13px;height:13px;"></i> ยกเลิก / ให้แก้ไข' +
        '</button>';
    } else {
      /* แสดงปุ่มทุกขั้นที่สูงกว่าสถานะปัจจุบัน */
      var SA_ORDER = { none:-1, revision:-1, submitted:0, reviewed:1, head_reviewed:1, assistant_reviewed:2, deputy_reviewed:3, final_approved:4 };
      var saIdx = SA_ORDER[curStatus] !== undefined ? SA_ORDER[curStatus] : 0;
      var saHtml = revisionBtn;
      if (saIdx < 1) saHtml +=
        '<button onclick="setReviewStatus(\'head_reviewed\')" style="flex:1;padding:10px;background:var(--role-hr-color);color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;gap:5px;">' +
          '<i data-lucide="user-check" style="width:13px;height:13px;"></i> หัวหน้าฯ ✓' +
        '</button>';
      if (saIdx < 2) saHtml +=
        '<button onclick="setReviewStatus(\'assistant_reviewed\')" style="flex:1;padding:10px;background:var(--role-director-color);color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;gap:5px;">' +
          '<i data-lucide="medal" style="width:13px;height:13px;"></i> ผช.ผอ. ✓' +
        '</button>';
      if (saIdx < 3) saHtml +=
        '<button onclick="setReviewStatus(\'deputy_reviewed\')" style="flex:1;padding:10px;background:var(--role-dep-academic-color);color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;gap:5px;">' +
          '<i data-lucide="crown" style="width:13px;height:13px;"></i> รอง ผอ. ✓' +
        '</button>';
      if (saIdx < 4) saHtml +=
        '<button onclick="setReviewStatus(\'final_approved\')" style="flex:1;padding:10px;background:var(--green);color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;gap:5px;">' +
          '<i data-lucide="gem" style="width:13px;height:13px;"></i> ผอ.อนุมัติ ✓' +
        '</button>';
      btnBox.innerHTML = saHtml;
    }

  /* ── หัวหน้ากลุ่มสาระ ── */
  } else if (isHeadOfGroupOnly) {
    if (curStatus === 'submitted' || curStatus === 'revision') {
      btnBox.innerHTML =
        revisionBtn +
        '<button onclick="setReviewStatus(\'head_reviewed\')" style="flex:2;padding:11px;background:var(--role-hr-color);color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">' +
          '<i data-lucide="user-check" style="width:14px;height:14px;"></i> ผ่านการตรวจ (หัวหน้ากลุ่มสาระ)' +
        '</button>';
    } else if (curStatus === 'head_reviewed' || curStatus === 'reviewed') {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--role-hr-color);padding:10px;background:var(--sky-light);border-radius:10px;width:100%;text-align:center;font-weight:700;">✓ ตรวจแล้ว — รอ ผช.ผอ.วิชาการตรวจ</p>';
    } else if (curStatus === 'assistant_reviewed') {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--amber-dark);padding:10px;background:var(--role-hog-bg);border-radius:10px;width:100%;text-align:center;font-weight:700;">✓ ผ่าน ผช.ผอ.วิชาการแล้ว — รอรอง ผอ.วิชาการตรวจ</p>';
    } else if (curStatus === 'deputy_reviewed') {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--indigo);padding:10px;background:var(--purple-light);border-radius:10px;width:100%;text-align:center;font-weight:700;">✓ ผ่านรอง ผอ.แล้ว — รอผู้อำนวยการอนุมัติ</p>';
    } else if (curStatus === 'final_approved') {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--teal-dark);padding:10px;background:var(--role-budget-bg);border-radius:10px;width:100%;text-align:center;font-weight:700;">✅ ผู้อำนวยการอนุมัติแล้ว</p>';
    } else {
      btnBox.innerHTML =
        revisionBtn +
        '<button onclick="setReviewStatus(\'head_reviewed\')" style="flex:2;padding:11px;background:var(--role-hr-color);color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">' +
          '<i data-lucide="user-check" style="width:14px;height:14px;"></i> ผ่านการตรวจ (หัวหน้ากลุ่มสาระ)' +
        '</button>';
    }

  /* ── ผู้ช่วยผู้อำนวยการฝ่ายวิชาการ ── */
  } else if (p.assistantDirectorAcademic && !p.deputyDirectorAcademic && !p.director) {
    if (curStatus === 'head_reviewed' || curStatus === 'reviewed') {
      btnBox.innerHTML =
        revisionBtn +
        '<button onclick="setReviewStatus(\'assistant_reviewed\')" style="flex:2;padding:11px;background:var(--role-director-color);color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">' +
          '<i data-lucide="medal" style="width:14px;height:14px;"></i> ผ่านการตรวจ (ผช.ผอ.วิชาการ)' +
        '</button>';
    } else if (curStatus === 'assistant_reviewed') {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--amber-dark);padding:10px;background:var(--role-hog-bg);border-radius:10px;width:100%;text-align:center;font-weight:700;">✓ ตรวจแล้ว — รอรอง ผอ.วิชาการตรวจ</p>';
    } else if (curStatus === 'submitted' || curStatus === 'revision') {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--text2);padding:10px;background:var(--bg-alt);border-radius:10px;width:100%;text-align:center;font-weight:700;">⏳ รอหัวหน้ากลุ่มสาระตรวจก่อน</p>';
    } else if (curStatus === 'deputy_reviewed') {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--indigo);padding:10px;background:var(--purple-light);border-radius:10px;width:100%;text-align:center;font-weight:700;">✓ ผ่านรอง ผอ.แล้ว — รอผู้อำนวยการอนุมัติ</p>';
    } else if (curStatus === 'final_approved') {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--teal-dark);padding:10px;background:var(--role-budget-bg);border-radius:10px;width:100%;text-align:center;font-weight:700;">✅ ผู้อำนวยการอนุมัติแล้ว</p>';
    } else {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--text2);padding:10px;background:var(--bg-alt);border-radius:10px;width:100%;text-align:center;font-weight:700;">⏳ รอหัวหน้ากลุ่มสาระตรวจก่อน</p>';
    }

  /* ── รองผู้อำนวยการฝ่ายวิชาการ ── */
  } else if (p.deputyDirectorAcademic && !p.director) {
    if (curStatus === 'assistant_reviewed') {
      btnBox.innerHTML =
        revisionBtn +
        '<button onclick="setReviewStatus(\'deputy_reviewed\')" style="flex:2;padding:11px;background:var(--role-dep-academic-color);color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">' +
          '<i data-lucide="crown" style="width:14px;height:14px;"></i> ผ่านการตรวจ (รอง ผอ.วิชาการ)' +
        '</button>';
    } else if (curStatus === 'deputy_reviewed') {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--indigo);padding:10px;background:var(--purple-light);border-radius:10px;width:100%;text-align:center;font-weight:700;">✓ ตรวจแล้ว — รอผู้อำนวยการอนุมัติ</p>';
    } else if (curStatus === 'final_approved') {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--teal-dark);padding:10px;background:var(--role-budget-bg);border-radius:10px;width:100%;text-align:center;font-weight:700;">✅ ผู้อำนวยการอนุมัติแล้ว</p>';
    } else {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--text2);padding:10px;background:var(--bg-alt);border-radius:10px;width:100%;text-align:center;font-weight:700;">⏳ รอ ผช.ผอ.วิชาการตรวจก่อน</p>';
    }

  /* ── ผู้อำนวยการ ── */
  } else if (p.director) {
    if (curStatus === 'deputy_reviewed') {
      btnBox.innerHTML =
        revisionBtn +
        '<button onclick="setReviewStatus(\'final_approved\')" style="flex:2;padding:11px;background:var(--green);color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">' +
          '<i data-lucide="gem" style="width:14px;height:14px;"></i> อนุมัติ (ผู้อำนวยการ) ✓' +
        '</button>';
    } else if (curStatus === 'final_approved') {
      btnBox.innerHTML =
        '<p style="font-size:12px;color:var(--teal-dark);padding:10px;background:var(--role-budget-bg);border-radius:10px;flex:1;text-align:center;font-weight:700;">✅ อนุมัติแล้ว</p>' +
        '<button onclick="setReviewStatus(\'revision\')" style="padding:11px 16px;background:var(--amber-light);color:var(--amber-dark);border:1.5px solid var(--amber-mid);font-weight:700;border-radius:12px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px;">' +
          '<i data-lucide="pencil" style="width:13px;height:13px;"></i> ยกเลิก / ให้แก้ไข' +
        '</button>';
    } else {
      btnBox.innerHTML = '<p style="font-size:12px;color:var(--text2);padding:10px;background:var(--bg-alt);border-radius:10px;width:100%;text-align:center;font-weight:700;">⏳ รอรอง ผอ.วิชาการตรวจก่อน</p>';
    }

  /* ── portfolio (ฝ่ายวิชาการ) — ดูได้อย่างเดียว ไม่มีสิทธิ์ตรวจ ── */
  } else {
    var viewOnlyStatusLabels = {
      submitted:          '📤 ส่งงานแล้ว — รอหัวหน้ากลุ่มสาระตรวจ',
      head_reviewed:      '👤 ผ่านหัวหน้าฯ แล้ว — รอ ผช.ผอ.วิชาการตรวจ',
      reviewed:           '👤 ผ่านหัวหน้าฯ แล้ว — รอ ผช.ผอ.วิชาการตรวจ',
      assistant_reviewed: '🏅 ผ่าน ผช.ผอ.วิชาการแล้ว — รอ รอง ผอ.วิชาการตรวจ',
      deputy_reviewed:    '👑 ผ่านรอง ผอ.แล้ว — รอผู้อำนวยการอนุมัติ',
      final_approved:     '✅ ผู้อำนวยการอนุมัติแล้ว',
      revision:           '⚠️ ส่งคืนเพื่อแก้ไข'
    };
    var statusColors = {
      submitted:          { bg:'var(--c-green-pale)', color:'var(--c-green-deep)' },
      head_reviewed:      { bg:'var(--sky-light)', color:'var(--c-sky-deep)' },
      reviewed:           { bg:'var(--sky-light)', color:'var(--c-sky-deep)' },
      assistant_reviewed: { bg:'#fef3c7', color:'var(--c-amber-deep)' },
      deputy_reviewed:    { bg:'var(--purple-light)', color:'var(--c-violet-deep)' },
      final_approved:     { bg:'#d1fae5', color:'var(--c-green-deep)' },
      revision:           { bg:'var(--c-amber-pale)', color:'var(--c-amber-deep)' }
    };
    var sc = statusColors[curStatus] || { bg:'var(--bg-alt)', color:'var(--text2)' };
    btnBox.innerHTML =
      '<div style="width:100%;padding:10px 14px;border-radius:10px;background:' + sc.bg + ';display:flex;align-items:center;gap:var(--gap-tight);">' +
        '<i data-lucide="eye" style="width:14px;height:14px;color:' + sc.color + ';flex-shrink:0;"></i>' +
        '<p style="font-size:12px;font-weight:700;color:' + sc.color + ';margin:0;">' +
          (viewOnlyStatusLabels[curStatus] || curStatus) +
        '</p>' +
      '</div>' +
      '<div style="width:100%;padding:8px 14px;background:var(--bg);border:1px dashed var(--border);border-radius:10px;margin-top:6px;">' +
        '<p style="font-size:11px;color:var(--text3);margin:0;text-align:center;">' +
          '🔒 บัญชีนี้มีสิทธิ์ <strong>ดูข้อมูลเท่านั้น</strong> ไม่มีสิทธิ์ตรวจหรือเปลี่ยนสถานะ<br>' +
          'สิทธิ์ตรวจต้องเป็น: หัวหน้ากลุ่มสาระ / ผช.ผอ.วิชาการ / รอง ผอ.วิชาการ / ผู้อำนวยการ' +
        '</p>' +
      '</div>';
  }
  lucide.createIcons();
}

/* อัปโหลด admin signature ไปยัง Firebase Storage */
function uploadAdminSignatureToStorage(docId, status) {
  if (typeof isAdminSigEmpty === 'function' && isAdminSigEmpty()) {
    return Promise.resolve(null);
  }
  var dataURL = getAdminSigDataURL();
  if (!dataURL) return Promise.resolve(null);

  /* ถ้าเลือก "ใช้ลายเซ็นนี้" (ลายเซ็นเดิมที่เคยอัปโหลดไว้แล้ว) ค่าที่ได้จะเป็น URL
     ของ Firebase Storage อยู่แล้ว (ขึ้นต้นด้วย http ไม่ใช่ data: จาก canvas/ไฟล์ใหม่)
     → ใช้ URL เดิมได้เลย ไม่ต้องอัปโหลดซ้ำ */
  if (dataURL.indexOf('data:') !== 0) {
    return Promise.resolve(dataURL);
  }

  /* ใช้ window.storage (patch แล้ว) เพื่อให้แน่ใจว่า storageBucket ถูกต้อง */
  var storageInstance = (typeof window.storage !== 'undefined') ? window.storage : firebase.storage();
  var storageRef = storageInstance.ref();
  console.log('[AdminSig] กำลังอัปโหลด storage bucket:', storageInstance.app.options.storageBucket);
  var sigFieldMap = {
    head_reviewed:      'headSignature',
    reviewed:           'headSignature',
    assistant_reviewed: 'assistantSignature',
    deputy_reviewed:    'deputySignature',
    final_approved:     'directorSignature',
  };
  var folder = sigFieldMap[status] || 'reviewSignature';
  var path = 'admin_signatures/' + folder + '/' + docId + '_' + Date.now() + '.png';

  /* แปลง dataURL → Blob */
  var byteStr = atob(dataURL.split(',')[1]);
  var arr = new Uint8Array(byteStr.length);
  for (var i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
  var blob = new Blob([arr], { type: 'image/png' });

  return storageRef.child(path).put(blob).then(function(snap) {
    console.log('[AdminSig] อัปโหลดสำเร็จ path:', path);
    return snap.ref.getDownloadURL();
  }).catch(function(e) {
    console.error('[AdminSig] อัปโหลดลายเซ็นไม่สำเร็จ:', e.code, e.message);
    showToast('⚠ บันทึกลายเซ็นไม่สำเร็จ: ' + e.message, 'warn');
    return null;
  });
}

function setReviewStatus(status) {
  var note = document.getElementById('adminNote').value.trim();

  /* ── บังคับเขียนความคิดเห็นทุกขั้นที่เป็นการ "ผ่าน/อนุมัติ" ── */
  var approvalStatuses = ['head_reviewed', 'reviewed', 'assistant_reviewed', 'deputy_reviewed', 'final_approved'];
  if (approvalStatuses.indexOf(status) !== -1 && !note) {
    var noteEl = document.getElementById('adminNote');
    if (noteEl) {
      noteEl.style.borderColor = 'var(--red-bright)';
      noteEl.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
      noteEl.focus();
      setTimeout(function(){
        noteEl.style.borderColor = '';
        noteEl.style.boxShadow = '';
      }, 2500);
    }
    showToast('กรุณาเขียนความคิดเห็นก่อนกดยืนยัน', 'warn');
    return;
  }

  /* ── บังคับเซ็นลายเซ็นทุกขั้นที่เป็นการ "ผ่าน/อนุมัติ" (วาดเอง หรือแนบไฟล์ อย่างใดอย่างหนึ่ง) ── */
  if (approvalStatuses.indexOf(status) !== -1 && typeof isAdminSigEmpty === 'function' && isAdminSigEmpty()) {
    var isFileModeActive = document.getElementById('adminSigFilePane') && document.getElementById('adminSigFilePane').style.display !== 'none';
    var sigTargetEl = isFileModeActive ? document.getElementById('adminSigFileDrop') : document.getElementById('adminSigCanvas');
    if (sigTargetEl) {
      sigTargetEl.style.outline = '2px solid var(--red-bright)';
      sigTargetEl.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
      setTimeout(function() {
        sigTargetEl.style.outline = '';
        sigTargetEl.style.boxShadow = '';
      }, 2500);
    }
    showToast('กรุณาเซ็นลายมือชื่อหรือแนบไฟล์ลายเซ็นก่อนกดยืนยัน', 'warn');
    return;
  }

  var toastMsgs = {
    head_reviewed:      'ผ่านการตรวจ (หัวหน้ากลุ่มสาระ) ✓',
    assistant_reviewed: 'ผ่านการตรวจ (ผช.ผอ.วิชาการ) ✓',
    deputy_reviewed:    'ผ่านการตรวจ (รอง ผอ.วิชาการ) ✓',
    final_approved:     'ผู้อำนวยการอนุมัติแล้ว ✅',
    reviewed:           'ผ่านการตรวจ (หัวหน้ากลุ่มสาระ) ✓',
    revision:           'ส่งคืนเพื่อแก้ไข'
  };
  var toastType = (status === 'revision') ? 'warn' : 'success';

  var t   = teacherMap[reviewingUid];
  var sub = t && t.subs[reviewingDocTypeId];
  if (!sub) return;

  /* ── หา Firestore doc ID ของรายวิชาที่เลือกอยู่ ──
     แต่ละ courseCode = Firestore doc แยก (_docId เก็บใน buildCourseMapFromSub)
     selectedCourseKey = courseCode ที่ user คลิกเลือก
     reviewingSubId    = doc.id ที่ sync ไว้ใน renderCourseFileList / openReview */
  var targetDocId = reviewingSubId;

  /* ยืนยันจาก courseMap อีกครั้ง (กันกรณี reviewingSubId ยังเก่า) */
  if (selectedCourseKey) {
    var cm = buildCourseMapFromSub(sub);
    var cf = cm[selectedCourseKey] || [];
    if (cf.length > 0 && cf[0]._docId) {
      targetDocId = cf[0]._docId;
    }
  }

  if (!targetDocId) {
    showToast('ไม่พบเอกสารที่จะอัปเดต', 'error');
    return;
  }

  /* หา Firestore doc จริงใน _courses */
  var courses = sub._courses || [];
  var targetDoc = courses.find(function(d){ return d.id === targetDocId; });

  /* ── map status → field name สำหรับเก็บ note แยกต่อขั้น ── */
  var noteFieldMap = {
    head_reviewed:      'headNote',
    reviewed:           'headNote',
    assistant_reviewed: 'assistantNote',
    deputy_reviewed:    'deputyNote',
    final_approved:     'directorNote',
    revision:           'adminNote'   /* revision ใช้ adminNote เดิม (แสดงให้ครูเห็น) */
  };
  var noteField = noteFieldMap[status] || 'adminNote';

  /* ── สร้าง payload: บันทึก note ลง field ของขั้นนั้น + เก็บ timestamp/reviewedBy แยกขั้นด้วย ── */
  var reviewerFieldMap = {
    head_reviewed:      'headReviewedBy',
    reviewed:           'headReviewedBy',
    assistant_reviewed: 'assistantReviewedBy',
    deputy_reviewed:    'deputyReviewedBy',
    final_approved:     'directorReviewedBy',
    revision:           'lastRevisedBy'
  };
  var reviewerField = reviewerFieldMap[status] || 'reviewedBy';

  var updatePayload = {
    status:     status,
    adminNote:  status === 'revision' ? note : (targetDoc ? (targetDoc.adminNote || '') : ''),
    reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
    reviewedBy: currentUserEmail,
  };
  updatePayload[noteField]     = note;
  updatePayload[reviewerField] = currentUserEmail;

  /* บันทึกชื่อจริงของผู้ตรวจแต่ละขั้น (สำหรับแสดงในบันทึกข้อความ) */
  var nameFieldMap = {
    head_reviewed:      'headReviewerName',
    reviewed:           'headReviewerName',
    assistant_reviewed: 'assistantReviewerName',
    deputy_reviewed:    'deputyReviewerName',
    final_approved:     'directorReviewerName',
  };
  if (nameFieldMap[status] && currentUserName) {
    updatePayload[nameFieldMap[status]] = currentUserName;
  }

  /* ── อัปเดตเฉพาะ status/note ระดับ document เท่านั้น — อัปโหลดลายเซ็นก่อน ── */
  /* map status → field เก็บ URL ลายเซ็นผู้ตรวจ */
  var sigUrlFieldMap = {
    head_reviewed:      'headSignatureURL',
    reviewed:           'headSignatureURL',
    assistant_reviewed: 'assistantSignatureURL',
    deputy_reviewed:    'deputySignatureURL',
    final_approved:     'directorSignatureURL',
  };

  /* ปุ่มทุกปุ่มใน reviewActionButtons ให้ disable ระหว่างรอ */
  var actionBtns = document.querySelectorAll('#reviewActionButtons button');
  actionBtns.forEach(function(b){ b.disabled = true; });

  uploadAdminSignatureToStorage(targetDocId, status).then(function(sigURL) {
    if (sigURL && sigUrlFieldMap[status]) {
      updatePayload[sigUrlFieldMap[status]] = sigURL;

      /* บันทึกลายเซ็นนี้ไว้เป็น "ลายเซ็นล่าสุดของผู้ตรวจคนนี้เอง" เพื่อให้เลือก
         "ใช้ลายเซ็นนี้" ได้ในครั้งถัดไปโดยไม่ต้องวาด/แนบไฟล์ใหม่ — ข้ามการเขียนถ้าเป็น
         URL เดิมที่เพิ่งเลือกใช้ซ้ำอยู่แล้ว (กันเขียน Firestore โดยไม่จำเป็น) */
      if (sigURL !== myAdminSignatureURL) {
        myAdminSignatureURL = sigURL;
        db.collection('admins').doc(currentUserEmail).set(
          { lastSignatureURL: sigURL }, { merge: true }
        ).catch(function(e) { console.warn('บันทึก lastSignatureURL ไม่สำเร็จ:', e); });
      }
    }
    return db.collection('portfolio_submissions').doc(targetDocId).update(updatePayload);
  }).then(function() {
    showToast(toastMsgs[status] || status, toastType);

    /* อัปเดต in-memory เฉพาะ Firestore doc ที่เลือก */
    if (targetDoc) {
      targetDoc.status    = status;
      targetDoc.adminNote = updatePayload.adminNote;
      targetDoc[noteField]     = note;
      targetDoc[reviewerField] = currentUserEmail;
      if (nameFieldMap[status] && currentUserName) {
        targetDoc[nameFieldMap[status]] = currentUserName;
      }
      if (updatePayload[sigUrlFieldMap[status]]) {
        targetDoc[sigUrlFieldMap[status]] = updatePayload[sigUrlFieldMap[status]];
      }
    }

    /* คำนวณ merged status ของ container ใหม่ (ต่ำสุดของทุก doc) */
    var ORDER = PORTFOLIO_STATUS_ORDER; /* ✏️ ย้ายมา common.js แล้ว */
    sub.status = courses.reduce(function(acc, c) {
      var s = c.status || 'submitted';
      return ORDER[s] < ORDER[acc] ? s : acc;
    }, 'final_approved');

    closeModal('reviewModal');
    loadAllSubmissions();
  }).catch(function(e){
    actionBtns.forEach(function(b){ b.disabled = false; });
    showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  });
}

/* ─── HELPERS ─── */

/* ══════════════════════════════════════
   CHARTS
   ══════════════════════════════════════ */

function renderCharts() {
  renderDonutChart();
  renderGroupBars();
  renderDocTypeBars();
}

/* ── 1. Donut Chart (Canvas) ── */
function renderDonutChart() {
  /* เรียงให้ none อยู่แรก วาดเป็น base แล้วสีอื่นทับทีหลัง */
  var statusConfig = [
    { key:'none',               label:'ยังไม่ส่ง',                color:cssVar('--border') },
    { key:'revision',           label:'ให้แก้ไข',                 color:cssVar('--c-red-mid') },
    { key:'submitted',          label:'รอตรวจ',                   color:cssVar('--c-green') },
    { key:'head_reviewed',      label:'หัวหน้าฯ ตรวจแล้ว',        color:cssVar('--c-sky') },
    { key:'assistant_reviewed', label:'ผช.ผอ.ตรวจแล้ว',           color:cssVar('--c-amber') },
    { key:'deputy_reviewed',    label:'รอง ผอ.ตรวจแล้ว',          color:cssVar('--c-violet') },
    { key:'final_approved',     label:'ผอ.อนุมัติแล้ว',           color:cssVar('--c-green') },
  ];

  var teacherList = Object.values(teacherMap).filter(function(t){ return t.isTeacher; });
  var total = teacherList.length * DOCUMENT_TYPES.length;
  var counts = {};
  statusConfig.forEach(function(s){ counts[s.key] = 0; });

  /* ใช้ merged-status map เดียวกับ updateStats() เพื่อให้กราฟตรงกับ stat cards */
  var mergedMap = buildMergedStatusMap();
  Object.values(mergedMap).forEach(function(st) {
    if (counts[st] !== undefined) counts[st]++;
    else counts['submitted']++;
  });

  /* Draw donut ด้วย fill arc จริง (ไม่ใช้ stroke) */
  var canvas = document.getElementById('donutChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var size = 220;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  var cx = size / 2, cy = size / 2;
  var outerR = 90, innerR = 62;
  ctx.clearRect(0, 0, size, size);

  var startAngle = -Math.PI / 2;
  statusConfig.forEach(function(s) {
    var count = counts[s.key] || 0;
    if (!count) return;
    var slice = (count / total) * 2 * Math.PI;
    var endAngle = startAngle + slice;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();

    startAngle = endAngle;
  });

  /* ตัดรูวงแหวนตรงกลาง */
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();

  /* Center label */
  console.log('[Donut] total='+total+' counts='+JSON.stringify(counts)+' allSubs='+allSubs.length);
  document.getElementById('donutTotal').textContent = total;

  /* Legend — แสดงเรียงจาก approved → none */
  var legendConfig = [{key:"final_approved",label:"ผอ.อนุมัติแล้ว",color:"var(--c-green)"},{key:"deputy_reviewed",label:"รอง ผอ.ตรวจแล้ว",color:"var(--c-violet)"},{key:"assistant_reviewed",label:"ผช.ผอ.ตรวจแล้ว",color:"var(--c-amber)"},{key:"head_reviewed",label:"หัวหน้าฯ ตรวจแล้ว",color:"var(--c-sky)"},{key:"submitted",label:"รอตรวจ",color:"var(--c-green)"},{key:"revision",label:"ให้แก้ไข",color:"var(--c-red-mid)"},{key:"none",label:"ยังไม่ส่ง",color:"var(--border)"}];
  var leg = document.getElementById("donutLegend");
  leg.innerHTML = legendConfig.map(function(s) {



    var pct = total > 0 ? Math.round((counts[s.key] / total) * 100) : 0;
    var isZero = counts[s.key] === 0;
    return '<div style="display:flex;align-items:center;gap:var(--gap-item);">' +
      '<div style="width:12px;height:12px;border-radius:50%;background:' + s.color + ';flex-shrink:0;' + (isZero?'opacity:.45;':'') + '"></div>' +
      '<span style="font-size:13px;font-weight:600;color:' + (isZero?'var(--text3)':'var(--text-mid)') + ';flex:1;">' + s.label + '</span>' +
      '<span style="font-size:13px;font-weight:800;color:' + (isZero?'var(--text3)':'var(--text-dark)') + ';">' + counts[s.key] +
        ' <span style="font-size:11px;font-weight:600;color:var(--text3);">(' + pct + '%)</span>' +
      '</span>' +
    '</div>';
  }).join('');
}

/* ── 2. Group bars ── */
function renderGroupBars() {
  var container = document.getElementById('groupBars');
  if (!container) return;

  /* คำนวณ % ผ่านวิชาการต่อกลุ่มสาระ */
  var groupData = {};
  availableGroups.forEach(function(g) { groupData[g] = { total:0, approved:0 }; });

  Object.values(teacherMap).forEach(function(t) {
    if (!t.isTeacher) return;
    var g = normaliseGroup(t.staffGroup);
    if (!groupData[g]) groupData[g] = { total:0, approved:0 };
    DOCUMENT_TYPES.forEach(function(dt) {
      groupData[g].total++;
      var sub = t.subs[dt.id];
      if (fakeStatus(sub ? sub.status : 'none') === 'final_approved') groupData[g].approved++;
    });
  });

  /* เรียงจาก % สูงไปต่ำ */
  var sorted = Object.keys(groupData).sort(function(a,b){
    var pa = groupData[a].total > 0 ? groupData[a].approved/groupData[a].total : 0;
    var pb = groupData[b].total > 0 ? groupData[b].approved/groupData[b].total : 0;
    return pb - pa;
  });

  if (!sorted.length) {
    container.innerHTML = '<p style="font-size:12px;color:var(--text3);text-align:center;padding:20px;">ไม่มีข้อมูล</p>';
    return;
  }

  container.innerHTML = sorted.map(function(g) {
    var d   = groupData[g];
    var pct = d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0;
    var color = pct >= 80 ? 'var(--emerald)' : pct >= 50 ? 'var(--accent-warn)' : 'var(--c-red-mid)';
    return '<div class="hbar-row">' +
      '<div class="hbar-label">' +
        '<span class="hbar-name" title="' + esc2(g) + '">' + esc2(g) + '</span>' +
        '<span class="hbar-pct" style="color:' + color + ';">' + pct + '%</span>' +
      '</div>' +
      '<div class="hbar-track">' +
        '<div class="hbar-fill" style="width:' + pct + '%;background:' + (pct >= 80 ? 'linear-gradient(90deg,var(--emerald),var(--green-mid))' : pct >= 50 ? 'linear-gradient(90deg,var(--accent-warn),var(--role-hog-border))' : 'linear-gradient(90deg,var(--red-bright),var(--rose-pale))') + ';"></div>' +
      '</div>' +
      '<div style="font-size:9px;color:var(--text3);font-weight:600;margin-top:1px;">' + d.approved + '/' + d.total + ' รายการ</div>' +
    '</div>';
  }).join('');
}

/* ── 3. Doc type bars ── */
function renderDocTypeBars() {
  var container = document.getElementById('docTypeBars');
  if (!container) return;

  var teacherCount = Object.values(teacherMap).filter(function(t){ return t.isTeacher; }).length;
  if (!teacherCount) { container.innerHTML = ''; return; }

  container.innerHTML = DOCUMENT_TYPES.map(function(dt) {
    var submitted     = allSubs.filter(function(s){ return s.docTypeId === dt.id && fakeStatus(s.status) !== 'none'; }).length;
    var finalApproved = allSubs.filter(function(s){ return s.docTypeId === dt.id && s.status === 'final_approved'; }).length;
    var pct = Math.round((submitted / teacherCount) * 100);
    var pctFinal = Math.round((finalApproved / teacherCount) * 100);

    return '<div class="docbar-row">' +
      '<div class="docbar-icon" style="background:' + dt.color + '18;">' +
        '<i data-lucide="' + dt.icon + '" style="width:13px;height:13px;color:' + dt.color + ';"></i>' +
      '</div>' +
      '<span class="docbar-label" title="' + esc2(dt.label) + '">' + esc2(dt.short || dt.label) + '</span>' +
      '<div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0;width:90px;">' +
        '<div class="docbar-track" style="width:90px;">' +
          '<div class="docbar-fill" style="width:' + pct + '%;background:' + dt.color + '55;"></div>' +
        '</div>' +
        '<div class="docbar-track" style="width:90px;">' +
          '<div class="docbar-fill" style="width:' + pctFinal + '%;background:' + dt.color + ';"></div>' +
        '</div>' +
      '</div>' +
      '<span class="docbar-num">' + submitted + '/' + teacherCount + '</span>' +
    '</div>';
  }).join('');
  lucide.createIcons();
}

function buildGroupData() {
  _groupData = {};
  Object.values(teacherMap).forEach(function(t) {
    if (!t.isTeacher) return;
    var grp = normaliseGroup(t.staffGroup) || 'ไม่ระบุกลุ่ม';
    if (!_groupData[grp]) _groupData[grp] = { teachers:[], submitted:0, head:0, assist:0, deputy:0, final:0, revision:0, total:0 };
    _groupData[grp].teachers.push(t);
    _groupData[grp].total += DOCUMENT_TYPES.length;
    Object.values(t.subs).forEach(function(sub) {
      (sub._courses || [sub]).forEach(function(doc) {
        if (doc._isContainer) return;
        var st = doc.status || 'submitted';
        if      (st === 'final_approved')                      _groupData[grp].final++;
        else if (st === 'deputy_reviewed')                     _groupData[grp].deputy++;
        else if (st === 'assistant_reviewed')                  _groupData[grp].assist++;
        else if (st === 'head_reviewed' || st === 'reviewed')  _groupData[grp].head++;
        else if (st === 'revision')                            _groupData[grp].revision++;
        else                                                   _groupData[grp].submitted++;
      });
    });
  });
}

function renderGroupPanel() {
  buildGroupData();
  var groups = Object.keys(_groupData).sort();

  /* populate dropdown */
  var sel = document.getElementById('groupSelectDropdown');
  if (sel) {
    sel.innerHTML = '<option value="">-- เลือกกลุ่มสาระ --</option>' +
      groups.map(function(g){ return '<option value="' + esc2(g) + '">' + esc2(g) + ' (' + _groupData[g].teachers.length + ' คน)</option>'; }).join('');
  }

  renderGroupBarChart(groups);
  renderGroupDetail(); /* reset detail area */
  lucide.createIcons();
}

/* ── กราฟแท่งเปรียบเทียบทุกกลุ่ม ── */
function renderGroupBarChart(groups) {
  var chartEl  = document.getElementById('groupBarChart');
  var legendEl = document.getElementById('groupChartLegend');
  if (!chartEl) return;

  /* legend */
  if (legendEl) {
    legendEl.innerHTML = SEG_KEYS.map(function(k) {
      return '<div style="display:flex;align-items:center;gap:4px;">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:' + SEG_COLORS[k] + ';flex-shrink:0;"></div>' +
        '<span style="font-size:10px;font-weight:700;color:var(--text-mid);">' + SEG_LABELS[k] + '</span>' +
      '</div>';
    }).join('');
  }

  if (!groups.length) {
    chartEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:14px;">ยังไม่มีข้อมูล</div>';
    return;
  }

  /* หา max สำหรับ scale */
  var maxTotal = 0;
  groups.forEach(function(g){ if (_groupData[g].total > maxTotal) maxTotal = _groupData[g].total; });

  var barH = 36; /* ความสูงแต่ละแถว px */
  var labelW = 160; /* ความกว้าง label */
  var numW   = 52;
  var chartW = 'calc(100% - ' + (labelW + numW) + 'px)';

  var html = '<div style="display:flex;flex-direction:column;gap:var(--gap-tight);">';

  /* header row */
  html += '<div style="display:flex;align-items:center;gap:0;padding-bottom:6px;border-bottom:1px solid var(--bg-alt);">' +
    '<div style="width:' + labelW + 'px;font-size:10px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;flex-shrink:0;">กลุ่มสาระ</div>' +
    '<div style="flex:1;font-size:10px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">จำนวนงาน (สถานะ)</div>' +
    '<div style="width:' + numW + 'px;font-size:10px;font-weight:800;color:var(--text3);text-align:right;flex-shrink:0;">ส่งแล้ว%</div>' +
  '</div>';

  groups.forEach(function(g) {
    var d = groupData = _groupData[g];
    var sentCount = d.submitted + d.head + d.assist + d.deputy + d.final + d.revision;
    var pct = d.total > 0 ? Math.round((sentCount / d.total) * 100) : 0;

    /* stacked bar segments */
    var bars = SEG_KEYS.map(function(k) {
      var v = d[k] || 0;
      if (!v || !maxTotal) return '';
      var w = Math.max(2, Math.round((v / maxTotal) * 100));
      return '<div style="height:' + barH + 'px;width:' + w + '%;background:' + SEG_COLORS[k] + ';display:flex;align-items:center;justify-content:center;transition:width .5s;" title="' + SEG_LABELS[k] + ': ' + v + ' รายการ">' +
        (v >= 2 ? '<span style="font-size:9px;font-weight:800;color:rgba(255,255,255,.9);">' + v + '</span>' : '') +
      '</div>';
    }).join('');

    html += '<div style="display:flex;align-items:center;gap:0;cursor:pointer;" onclick="jumpToGroup(\'' + esc(g) + '\')" title="คลิกเพื่อดูรายละเอียดกลุ่ม ' + esc2(g) + '">' +
      /* label */
      '<div style="width:' + labelW + 'px;flex-shrink:0;padding-right:10px;">' +
        '<p style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc2(g) + '</p>' +
        '<p style="font-size:10px;color:var(--text3);">' + d.teachers.length + ' คน</p>' +
      '</div>' +
      /* bar */
      '<div style="flex:1;display:flex;height:' + barH + 'px;border-radius:8px;overflow:hidden;background:var(--bg-alt);">' +
        bars +
      '</div>' +
      /* pct */
      '<div style="width:' + numW + 'px;text-align:right;flex-shrink:0;padding-left:8px;">' +
        '<span style="font-size:13px;font-weight:800;color:' + (pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--purple)' : 'var(--c-amber)') + ';">' + pct + '%</span>' +
      '</div>' +
    '</div>';
  });

  html += '</div>';
  chartEl.innerHTML = html;
}

/* ── กด bar → เลือก group ใน dropdown ── */
function jumpToGroup(grp) {
  var sel = document.getElementById('groupSelectDropdown');
  if (!sel) return;
  sel.value = grp;
  renderGroupDetail();
  /* scroll ไปที่ detail */
  var det = document.getElementById('groupDetailContent');
  if (det) det.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ── รายละเอียดของกลุ่มที่เลือก ── */
function renderGroupDetail() {
  var sel = document.getElementById('groupSelectDropdown');
  var det = document.getElementById('groupDetailContent');
  if (!sel || !det) return;
  var grp = sel.value;
  if (!grp || !_groupData[grp]) {
    det.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);">' +
      '<i data-lucide="mouse-pointer-click" style="width:32px;height:32px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;"></i>' +
      '<p style="font-size:13px;font-weight:700;">เลือกกลุ่มสาระด้านบนเพื่อดูรายละเอียด</p>' +
    '</div>';
    lucide.createIcons();
    return;
  }

  var d = _groupData[grp];
  var sentCount = d.submitted + d.head + d.assist + d.deputy + d.final + d.revision;
  var pct  = d.total > 0 ? Math.round((sentCount / d.total) * 100) : 0;
  var fPct = d.total > 0 ? Math.round((d.final   / d.total) * 100) : 0;

  /* stat row */
  var statCards = [
    { label:'ครูทั้งหมด',   val:d.teachers.length, color:'var(--purple)', bg:'var(--purple-light)', icon:'users' },
    { label:'ส่งงานแล้ว%', val:pct + '%',           color:'var(--c-green)', bg:'#dcfce7', icon:'send' },
    { label:'ผ่าน ผอ.%',   val:fPct + '%',          color:'var(--c-green)', bg:'var(--c-green-tint)', icon:'shield-check' },
    { label:'รอตรวจ',      val:d.submitted,          color:'var(--c-sky)', bg:'var(--sky-light)', icon:'clock' },
    { label:'ยังไม่ส่ง',   val:Math.max(0, d.total - sentCount), color:'var(--c-red-mid)', bg:'#fee2e2', icon:'alert-circle' },
  ].map(function(s) {
    return '<div class="stat-card" style="flex-direction:column;gap:4px;padding:12px 14px;">' +
      '<div style="width:32px;height:32px;border-radius:10px;background:' + s.bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
        '<i data-lucide="' + s.icon + '" style="width:15px;height:15px;color:' + s.color + ';"></i>' +
      '</div>' +
      '<p style="font-size:20px;font-weight:800;color:' + s.color + ';">' + s.val + '</p>' +
      '<p style="font-size:10px;color:var(--text2);font-weight:600;">' + s.label + '</p>' +
    '</div>';
  }).join('');

  /* กราฟแท่งแนวนอน: แต่ละประเภทงาน */
  var docBars = DOCUMENT_TYPES.map(function(dt) {
    /* นับแยกตามสถานะของกลุ่มนี้ */
    var counts = { final:0, deputy:0, assist:0, head:0, submitted:0, revision:0, none:0 };
    d.teachers.forEach(function(t) {
      var sub = t.subs[dt.id];
      if (!sub) { counts.none++; return; }
      var st = (sub.status || 'submitted');
      if      (st === 'final_approved')                     counts.final++;
      else if (st === 'deputy_reviewed')                    counts.deputy++;
      else if (st === 'assistant_reviewed')                 counts.assist++;
      else if (st === 'head_reviewed' || st === 'reviewed') counts.head++;
      else if (st === 'revision')                           counts.revision++;
      else                                                  counts.submitted++;
    });
    var sentHere = d.teachers.length - counts.none;
    var pctHere  = d.teachers.length > 0 ? Math.round((sentHere / d.teachers.length) * 100) : 0;

    /* stacked segments */
    var segs = SEG_KEYS.map(function(k) {
      var v = counts[k] || 0;
      if (!v) return '';
      var w = Math.round((v / d.teachers.length) * 100);
      return '<div style="height:20px;width:' + w + '%;background:' + SEG_COLORS[k] + ';display:flex;align-items:center;justify-content:center;" title="' + SEG_LABELS[k] + ': ' + v + '">' +
        (v >= 1 ? '<span style="font-size:9px;font-weight:800;color:rgba(255,255,255,.9);">' + v + '</span>' : '') +
      '</div>';
    }).join('');

    var noneBar = counts.none > 0
      ? '<div style="height:20px;width:' + Math.round((counts.none/d.teachers.length)*100) + '%;background:var(--bg-alt);"></div>'
      : '';

    return '<div style="display:flex;align-items:center;gap:var(--gap-item);margin-bottom:var(--gap-tight);">' +
      '<div style="width:28px;height:28px;border-radius:8px;background:' + (dt.color+'22') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
        '<i data-lucide="' + dt.icon + '" style="width:13px;height:13px;color:' + dt.color + ';"></i>' +
      '</div>' +
      '<div style="width:140px;flex-shrink:0;">' +
        '<p style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + esc2(dt.label) + '">' + esc2(dt.label) + '</p>' +
      '</div>' +
      '<div style="flex:1;display:flex;height:20px;border-radius:6px;overflow:hidden;background:var(--bg);">' +
        segs + noneBar +
      '</div>' +
      '<span style="font-size:12px;font-weight:800;color:' + (pctHere>=100?'var(--green)':pctHere>=60?'var(--purple)':'var(--c-amber)') + ';min-width:36px;text-align:right;">' + pctHere + '%</span>' +
    '</div>';
  }).join('');

  /* รายชื่อครู */
  var teacherRows = d.teachers.slice().sort(function(a,b){ return (b.subs ? Object.keys(b.subs).length : 0) - (a.subs ? Object.keys(a.subs).length : 0); }).map(function(t) {
    var subCount = Object.keys(t.subs).length;
    var pctT = Math.round((subCount / DOCUMENT_TYPES.length) * 100);
    var barColor = pctT >= 100 ? 'var(--green)' : pctT >= 60 ? 'var(--purple)' : pctT >= 30 ? 'var(--accent-warn)' : 'var(--c-red-mid)';
    var docChips = DOCUMENT_TYPES.map(function(dt) {
      var sub = t.subs[dt.id];
      var st = fakeStatus(sub ? (sub.status || 'submitted') : 'none');
      var chipColor = { none:'var(--border)', submitted:'var(--c-green-mid)', head_reviewed:'var(--c-sky-mid)', reviewed:'var(--c-sky-mid)', assistant_reviewed:'var(--c-amber-mid)', deputy_reviewed:'var(--purple-mid)', final_approved:'#6ee7b7', revision:'#fca5a5' }[st] || 'var(--border)';
      return '<div style="width:18px;height:18px;border-radius:5px;background:' + chipColor + ';" title="' + esc2(dt.label) + '"></div>';
    }).join('');

    return '<div style="display:flex;align-items:center;gap:var(--gap-item);padding:8px 0;border-bottom:1px solid var(--bg);">' +
      '<img src="https://ui-avatars.com/api/?name=' + encodeURIComponent(t.staffName||t.email) + '&background=7c3aed&color=fff&size=28" alt="' + esc2(t.staffName||t.email) + '" style="width:30px;height:30px;border-radius:50%;flex-shrink:0;">' +
      '<div style="flex:1;min-width:0;">' +
        '<p style="font-size:12px;font-weight:700;color:var(--text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc2(t.staffName||t.email) + '</p>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:3px;">' +
          '<div style="flex:1;height:4px;background:var(--bg-alt);border-radius:4px;overflow:hidden;">' +
            '<div style="width:' + pctT + '%;height:100%;background:' + barColor + ';border-radius:4px;"></div>' +
          '</div>' +
          '<span style="font-size:10px;font-weight:800;color:var(--text2);min-width:32px;text-align:right;">' + subCount + '/' + DOCUMENT_TYPES.length + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:3px;flex-wrap:wrap;max-width:200px;justify-content:flex-end;">' + docChips + '</div>' +
    '</div>';
  }).join('');

  det.innerHTML =
    /* stat cards */
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:var(--gap-item);margin-bottom:var(--gap-section);" class="group-stat-cards">' + statCards + '</div>' +
    /* .group-stat-cards responsive rule ย้ายไป styles-new.css แล้ว (section 32) — ไม่ inject <style> ซ้ำทุกครั้งที่ render อีกต่อไป */
    /* doc bars */
    '<div style="margin-bottom:var(--gap-section);">' +
      '<p style="font-size:13px;font-weight:800;color:var(--text-dark);margin-bottom:12px;">การส่งงานแยกตามประเภท</p>' +
      docBars +
    '</div>' +
    /* teacher list */
    '<div>' +
      '<p style="font-size:13px;font-weight:800;color:var(--text-dark);margin-bottom:var(--gap-tight);">รายชื่อครูในกลุ่ม (' + d.teachers.length + ' คน)</p>' +
      teacherRows +
    '</div>';

  lucide.createIcons();
}

/* ── Dropdown Search ── */
function renderTeacherDropdown() {
  var q = (document.getElementById('teacherSearchInput').value || '').toLowerCase().trim();
  var wrap = document.getElementById('teacherDropdownWrap');
  var drop = document.getElementById('teacherDropdown');

  if (!q) { wrap.style.display = 'none'; return; }

  var results = Object.values(teacherMap).filter(function(t) {
    if (!t.isTeacher) return false;
    return (t.staffName || '').toLowerCase().includes(q) ||
           (t.email     || '').toLowerCase().includes(q) ||
           (t.staffGroup|| '').toLowerCase().includes(q);
  }).slice(0, 10);

  if (!results.length) {
    drop.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text3);font-size:13px;">ไม่พบครูที่ค้นหา</div>';
    wrap.style.display = 'block';
    return;
  }

  drop.innerHTML = results.map(function(t) {
    var name = t.staffName || t.displayName || t.email;
    var avatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=7c3aed&color=fff&size=40';
    return '<div class="teacher-search-item" onclick="selectTeacher(\'' + esc(t.email) + '\')">' +
      '<img src="' + avatar + '" alt="' + esc2(name) + '" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;">' +
      '<div style="min-width:0;">' +
        '<p style="font-size:13px;font-weight:700;color:var(--text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc2(name) + '</p>' +
        '<p style="font-size:11px;color:var(--purple);font-weight:600;">' + esc2(t.staffGroup || '') + (t.position ? ' · ' + esc2(t.position) : '') + '</p>' +
      '</div>' +
      '<span style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:8px;background:var(--purple-light);color:var(--purple);flex-shrink:0;">' + Object.keys(t.subs).length + '/' + DOCUMENT_TYPES.length + '</span>' +
    '</div>';
  }).join('');
  wrap.style.display = 'block';

  /* close when clicking outside */
  document.onclick = function(ev) {
    if (!document.getElementById('teacherDropdownWrap').contains(ev.target) &&
        !document.getElementById('teacherSearchInput').contains(ev.target)) {
      wrap.style.display = 'none';
    }
  };
}

function clearTeacherSelection() {
  selectedTeacherKey = null;
  document.getElementById('selectedTeacherPill').style.display = 'none';
  document.getElementById('teacherDetailPanel').style.display  = 'none';
  document.getElementById('teacherNoSelect').style.display     = 'block';
}

/* ── Render full detail for selected teacher ── */
function renderTeacherDetail(t) {
  var total = DOCUMENT_TYPES.length;
  var submitted = 0, head = 0, assist = 0, deputy = 0, final = 0, revision = 0, none = 0;

  /* count by merged container status per slot */
  DOCUMENT_TYPES.forEach(function(dt) {
    var sub = t.subs[dt.id];
    if (!sub) { none++; return; }
    var st = sub.status || 'submitted';
    if (st === 'reviewed') st = 'head_reviewed';
    if (st === 'final_approved')     final++;
    else if (st === 'deputy_reviewed')    deputy++;
    else if (st === 'assistant_reviewed') assist++;
    else if (st === 'head_reviewed') head++;
    else if (st === 'revision')  revision++;
    else submitted++; /* submitted */
  });

  /* Stat cards */
  var sentCount = total - none;
  document.getElementById('ts_submitted').textContent = sentCount;
  document.getElementById('ts_submittedOf').textContent = 'จาก ' + total + ' รายการ';
  document.getElementById('ts_head').textContent   = head + deputy + assist + final;
  document.getElementById('ts_assist').textContent  = assist + deputy + final;
  document.getElementById('ts_final').textContent   = final;
  document.getElementById('ts_missing').textContent  = none;

  /* Donut */
  var name = t.staffName || t.displayName || t.email;
  document.getElementById('teacherChartSub').textContent = name;
  document.getElementById('teacherDonutTotal').textContent = total;
  renderTeacherDonut({ none: none, submitted: submitted, head_reviewed: head, assistant_reviewed: assist, deputy_reviewed: deputy, final_approved: final, revision: revision });

  /* Doc type bars */
  renderTeacherDocBars(t);

  /* Submission detail table */
  renderTeacherSubTable(t);
}

/* ── Donut chart for teacher ── */
function renderTeacherDonut(counts) {
  var STATUS_CFG = [
    { key:'none',               label:'ยังไม่ส่ง',               color:cssVar('--border-mid') },
    { key:'submitted',          label:'รอตรวจ (ครูส่งแล้ว)',      color:cssVar('--c-green') },
    { key:'revision',           label:'ให้แก้ไข',                color:cssVar('--c-red-mid') },
    { key:'head_reviewed',      label:'หัวหน้าฯ ตรวจแล้ว',       color:cssVar('--c-sky') },
    { key:'assistant_reviewed', label:'ผช.ผอ. ตรวจแล้ว',         color:cssVar('--c-amber') },
    { key:'deputy_reviewed',    label:'รอง ผอ. ตรวจแล้ว',        color:cssVar('--c-violet') },
    { key:'final_approved',     label:'ผอ. อนุมัติ',              color:cssVar('--c-green') },
  ];

  var canvas = document.getElementById('teacherDonutChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var logicalW = 160, logicalH = 160;
  canvas.width  = logicalW * dpr;
  canvas.height = logicalH * dpr;
  canvas.style.width  = logicalW + 'px';
  canvas.style.height = logicalH + 'px';
  ctx.scale(dpr, dpr);
  var w = logicalW, h = logicalH;
  var cx = w/2, cy = h/2, R = Math.min(w,h)/2 - 8, ri = R * 0.55;
  ctx.clearRect(0,0,w,h);

  var data = STATUS_CFG.map(function(s){ return { label:s.label, color:s.color, count:counts[s.key]||0 }; }).filter(function(d){ return d.count > 0; });
  var total = data.reduce(function(a,b){ return a+b.count; }, 0);

  var legend = document.getElementById('teacherDonutLegend');
  if (!total) {
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fillStyle=cssVar('--bg-alt'); ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,ri,0,Math.PI*2); ctx.fillStyle='white'; ctx.fill();
    if (legend) legend.innerHTML = '<p style="text-align:center;color:var(--text3);font-size:12px;">ยังไม่มีงานส่ง</p>';
    return;
  }

  var gap = 0.03;
  var start = -Math.PI/2;
  data.forEach(function(d) {
    var sweep = (d.count / total) * Math.PI * 2 - gap;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,R,start,start+sweep);
    ctx.closePath(); ctx.fillStyle = d.color; ctx.fill();
    start += sweep + gap;
  });
  ctx.beginPath(); ctx.arc(cx,cy,ri,0,Math.PI*2);
  ctx.fillStyle='white'; ctx.fill();

  if (legend) {
    legend.innerHTML = data.map(function(d){
      return '<div class="legend-row"><div class="legend-dot" style="background:'+d.color+'"></div><span class="legend-label">'+d.label+'</span><span class="legend-val">'+d.count+'</span></div>';
    }).join('');
  }
}

/* ── Doc type bars per teacher ── */
function renderTeacherDocBars(t) {
  var container = document.getElementById('teacherDocBars');
  if (!container) return;

  var STATUS_LABEL = { submitted:'รอตรวจ', head_reviewed:'หัวหน้าฯ ✓', reviewed:'หัวหน้าฯ ✓', assistant_reviewed:'ผช.ผอ. ✓', deputy_reviewed:'รอง ผอ. ✓', final_approved:'ผอ. อนุมัติ', revision:'ให้แก้ไข' };
  var STATUS_COLOR = { submitted:'var(--c-green)', head_reviewed:'var(--c-sky)', reviewed:'var(--c-sky)', assistant_reviewed:'var(--c-amber)', deputy_reviewed:'var(--c-violet)', final_approved:'var(--purple)', revision:'var(--c-red-mid)' };
  var STATUS_ORDER = PORTFOLIO_STATUS_ORDER; /* ✏️ ย้ายมา common.js แล้ว */
  var MAX = 6;

  container.innerHTML = DOCUMENT_TYPES.map(function(dt) {
    var sub = t.subs[dt.id];
    var st  = sub ? (sub.status || 'submitted') : 'none';
    var ord = STATUS_ORDER[st] || 0;
    var pct = Math.round((ord / MAX) * 100);
    var color = STATUS_COLOR[st] || 'var(--border)';
    var label = sub ? (STATUS_LABEL[st] || st) : 'ยังไม่ส่ง';
    var coursesHtml = '';
    if (sub && sub._courses && sub._courses.length > 1) {
      coursesHtml = '<span style="font-size:9px;font-weight:800;background:var(--purple-light);color:var(--purple);padding:1px 6px;border-radius:6px;margin-left:4px;">' + sub._courses.length + ' วิชา</span>';
    }
    return '<div class="docbar-row" style="margin-bottom:12px;">' +
      '<div class="docbar-icon" style="background:' + dt.color + '18;">' +
        '<i data-lucide="' + dt.icon + '" style="width:13px;height:13px;color:' + dt.color + ';"></i>' +
      '</div>' +
      '<span class="docbar-label" title="' + esc2(dt.label) + '">' + esc2(dt.short || dt.label) + coursesHtml + '</span>' +
      '<div class="docbar-track" style="width:100px;flex-shrink:0;">' +
        '<div class="docbar-fill" style="width:' + pct + '%;background:' + color + ';"></div>' +
      '</div>' +
      '<span style="font-size:10px;font-weight:800;color:' + (sub?color:'var(--text3)') + ';min-width:80px;text-align:right;">' + esc2(label) + '</span>' +
    '</div>';
  }).join('');
  lucide.createIcons();
}

/* ── Submission detail table ── */
function renderTeacherSubTable(t) {
  var container = document.getElementById('teacherSubTable');
  if (!container) return;

  var STATUS_LABEL = { submitted:'📤 รอตรวจ', head_reviewed:'👤 หัวหน้าฯ ✓', reviewed:'👤 หัวหน้าฯ ✓', assistant_reviewed:'🏅 ผช.ผอ. ✓', deputy_reviewed:'👑 รอง ผอ. ✓', final_approved:'🎖 ผอ. อนุมัติ', revision:'⚠ ให้แก้ไข', none:'ยังไม่ส่ง' };
  var STATUS_BG    = { submitted:'var(--c-green-pale)', head_reviewed:'var(--sky-light)', reviewed:'var(--sky-light)', assistant_reviewed:'#fef3c7', deputy_reviewed:'var(--purple-light)', final_approved:'#d1fae5', revision:'var(--c-red-pale)', none:'var(--bg)' };
  var STATUS_COLOR = { submitted:'var(--c-green-deep)', head_reviewed:'var(--c-sky-deep)', reviewed:'var(--c-sky-deep)', assistant_reviewed:'var(--c-amber-deep)', deputy_reviewed:'var(--c-violet-deep)', final_approved:'var(--c-green-deep)', revision:'var(--c-red)', none:'var(--text3)' };

  var sentCount = DOCUMENT_TYPES.filter(function(dt){ return t.subs[dt.id]; }).length;
  document.getElementById('teacherSubCount').textContent = 'ส่งแล้ว ' + sentCount + '/' + DOCUMENT_TYPES.length + ' รายการ';

  var html = '';
  DOCUMENT_TYPES.forEach(function(dt, idx) {
    var sub = t.subs[dt.id];
    var st  = sub ? (sub.status || 'submitted') : 'none';
    var bg  = STATUS_BG[st] || 'var(--bg)';
    var clr = STATUS_COLOR[st] || 'var(--text3)';
    var lbl = STATUS_LABEL[st] || st;
    var rowId = 'tsr-' + idx;

    html += '<div class="sub-doc-row">';
    html += '<div class="sub-doc-header" onclick="toggleSubDocRow(\'' + rowId + '\')">' +
      '<div style="width:32px;height:32px;border-radius:10px;background:' + dt.color + '18;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
        '<i data-lucide="' + dt.icon + '" style="width:15px;height:15px;color:' + dt.color + ';"></i>' +
      '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<p style="font-size:13px;font-weight:700;color:var(--text-dark);">' + esc2(dt.label) + '</p>';

    if (sub && sub._courses) {
      var allFinal = sub._courses.every(function(d){ return d.status === 'final_approved'; });
      var total = sub._courses.length;
      html += '<p style="font-size:11px;color:var(--text2);margin-top:1px;">' + total + ' รายวิชา' + (allFinal ? ' · ทั้งหมด ผอ.อนุมัติแล้ว' : '') + '</p>';
    }

    html += '</div>' +
      '<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:10px;background:' + bg + ';color:' + clr + ';flex-shrink:0;">' + lbl + '</span>' +
      (sub ? '<button onclick="event.stopPropagation();openNotesModal(\'' + esc(t.email) + '\',\'' + esc(dt.id) + '\')" class="notes-btn' + (st==='revision'?' has-revision':((function(){var docs2=(sub._courses||[sub]);var hasN=docs2.some(function(d){return d.note||d.adminNote||d.headNote||d.assistantNote||d.deputyNote||d.directorNote;});return hasN?' has-note':'';})()) ) + '" style="flex-shrink:0;">💬 บันทึก</button>' : '') +
      '<i data-lucide="chevron-down" id="chev-' + rowId + '" style="width:14px;height:14px;color:var(--text3);transition:transform .2s;flex-shrink:0;margin-left:4px;"></i>' +
    '</div>';

    html += '<div class="sub-doc-body" id="body-' + rowId + '">';

    if (!sub) {
      html += '<div style="padding:12px;text-align:center;color:var(--text3);font-size:13px;">⚠ ยังไม่มีการส่งงาน</div>';
    } else {
      /* workflow bar */
      html += buildWorkflowBar(st);

      /* per-course breakdown */
      var docs = sub._courses || [sub];
      docs.forEach(function(doc) {
        if (doc._isContainer) return;
        var dSt = doc.status || 'submitted';
        var dBg  = STATUS_BG[dSt]    || 'var(--bg)';
        var dClr = STATUS_COLOR[dSt] || 'var(--text3)';
        var dLbl = STATUS_LABEL[dSt] || dSt;

        html += '<div class="course-sub-row">' +
          '<div style="display:flex;align-items:center;gap:var(--gap-tight);flex-wrap:wrap;">';

        if (doc.courseCode) {
          html += '<span style="font-size:11px;font-weight:800;color:var(--accent);background:var(--accent-tint);padding:2px 8px;border-radius:6px;">' + esc2(doc.courseCode) + '</span>';
        }
        if (doc.courseName) {
          html += '<span style="font-size:11px;font-weight:700;color:var(--text-slate);">' + esc2(doc.courseName) + '</span>';
        }
        html += '<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:8px;background:' + dBg + ';color:' + dClr + ';margin-left:auto;">' + dLbl + '</span>';
        /* ปุ่มบันทึกข้อความรายวิชา */
        if (doc.id) {
          html += '<button onclick="event.stopPropagation();openAdminMemoModal(\'' + esc(doc.id) + '\',\'' + esc(t.email) + '\',\'' + esc(dt.id) + '\')" style="flex-shrink:0;display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:7px;border:1.5px solid var(--accent-light);background:var(--accent-tint);color:var(--accent);font-size:10px;font-weight:700;cursor:pointer;font-family:\'Sarabun\',sans-serif;"><i data-lucide="file-text" style="width:10px;height:10px;"></i> บันทึกข้อความ</button>';
        }

        /* file link */
        if (doc.fileUrl || (doc.files && doc.files.length)) {
          var url = doc.fileUrl || (doc.files[0].url || doc.files[0].fileUrl);
          var fname = doc.fileName || (doc.files && doc.files[0].fileName) || 'เปิดไฟล์';
          html += '</div><div style="margin-top:6px;display:flex;align-items:center;gap:6px;">' +
            '<i data-lucide="file" style="width:13px;height:13px;color:var(--text3);flex-shrink:0;"></i>' +
            '<a href="' + esc2(url) + '" target="_blank" style="font-size:12px;color:var(--purple);font-weight:700;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">' + esc2(fname) + '</a>' +
            '<a href="' + esc2(url) + '" target="_blank" style="font-size:11px;color:var(--purple);font-weight:700;display:flex;align-items:center;gap:3px;text-decoration:none;padding:3px 8px;background:var(--purple-light);border-radius:6px;border:1px solid var(--role-dep-general-border);flex-shrink:0;">' +
              '<i data-lucide="external-link" style="width:11px;height:11px;"></i> เปิด' +
            '</a>';
        } else {
          html += '</div><div style="margin-top:6px;">';
        }

        /* submitted at */
        if (doc.submittedAt) {
          html += '<span style="font-size:10px;color:var(--text3);display:flex;align-items:center;gap:3px;margin-top:4px;"><i data-lucide="clock" style="width:10px;height:10px;"></i> ส่งเมื่อ ' + formatDate(doc.submittedAt) + '</span>';
        }
        html += '</div>';

        /* teacher note */
        if (doc.note) {
          html += '<div class="note-bubble teacher" style="margin-top:6px;">' +
            '<p style="font-size:11px;font-weight:700;color:var(--green-deep);margin-bottom:3px;">📝 บันทึกจากครู</p>' +
            '<p style="font-size:12px;color:var(--green-dark-2);line-height:1.6;">' + esc2(doc.note) + '</p>' +
          '</div>';
        }

        /* admin note (revision) */
        if (doc.adminNote) {
          var noteCls = dSt === 'revision' ? 'revision' : 'admin';
          html += '<div class="note-bubble ' + noteCls + '" style="margin-top:6px;">' +
            '<p style="font-size:11px;font-weight:700;color:' + (dSt==='revision'?'var(--red)':'var(--c-amber-deep)') + ';margin-bottom:3px;">' + (dSt==='revision'?'⚠ หมายเหตุการแก้ไข':'💬 ความเห็นผู้ตรวจ') + '</p>' +
            '<p style="font-size:12px;color:' + (dSt==='revision'?'var(--rose-deep)':'#78350f') + ';line-height:1.6;">' + esc2(doc.adminNote) + '</p>' +
          '</div>';
        }

        html += '</div>'; /* end course-sub-row */
      });
    }

    html += '</div></div>'; /* end sub-doc-body + sub-doc-row */
  });

  container.innerHTML = html;
  lucide.createIcons();
}

function renderDocTypeRows(docs) {
  var list = document.getElementById('docTypeList');
  if (!docs.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px;">ยังไม่มีหัวข้องาน · กด "เพิ่มหัวข้องาน" เพื่อเริ่มต้น</div>';
    return;
  }

  list.innerHTML = docs.map(function(dt, i) {
    var DEPT_LABELS = { academic:'ฝ่ายวิชาการ', budget:'ฝ่ายงบประมาณ', personnel:'ฝ่ายบริหารงานบุคคล', general:'ฝ่ายบริหารทั่วไป' };
    var DEPT_COLORS = { academic:'#1d4ed8', budget:'var(--c-green)', personnel:'var(--purple)', general:'var(--c-amber)' };
    var DEPT_BG     = { academic:'var(--accent-tint)', budget:'var(--c-green-pale)', personnel:'var(--c-violet-pale)', general:'var(--c-amber-pale)' };
    var deptKey = dt.department || 'academic';
    var deptBadge = '<span style="background:' + (DEPT_BG[deptKey]||'var(--bg-alt)') + ';color:' + (DEPT_COLORS[deptKey]||'var(--text2)') + ';font-size:10px;font-weight:700;padding:1px 8px;border-radius:8px;">' + (DEPT_LABELS[deptKey]||deptKey) + '</span>';
    var activeLabel = dt.active === false
      ? '<span style="background:var(--bg-alt);color:var(--text3);font-size:10px;font-weight:700;padding:1px 8px;border-radius:8px;">ซ่อน</span>'
      : '<span style="background:var(--role-academic-bg);color:var(--green-deep);font-size:10px;font-weight:700;padding:1px 8px;border-radius:8px;">ใช้งาน</span>';
    return '<div class="dt-row" draggable="true" data-index="' + i + '" data-docid="' + esc2(dt._id) + '" ' +
        'ondragstart="dtDragStart(event,' + i + ')" ondragover="dtDragOver(event)" ondrop="dtDrop(event,' + i + ',\'' + esc(dt._id) + '\')" ondragleave="dtDragLeave(event)" ondragend="dtDragEnd()">' +
      '<div class="dt-drag-handle" title="ลากเพื่อเรียงลำดับ">' +
        '<i data-lucide="grip-vertical" style="width:16px;height:16px;"></i>' +
      '</div>' +
      '<div class="dt-icon-preview" style="background:' + (dt.color||'var(--purple)') + '18;">' +
        '<i data-lucide="' + (dt.icon||'file') + '" style="width:18px;height:18px;color:' + (dt.color||'var(--purple)') + ';"></i>' +
      '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;align-items:center;gap:var(--gap-tight);flex-wrap:wrap;">' +
          '<p style="font-size:14px;font-weight:800;color:var(--text-dark);">' + esc2(dt.label) + '</p>' +
          (dt.short ? '<span style="font-size:10px;font-weight:700;background:var(--bg-alt);color:var(--text-mid);padding:1px 8px;border-radius:8px;">ย่อ: ' + esc2(dt.short) + '</span>' : '') +
          deptBadge +
          activeLabel +
        '</div>' +
        '<p style="font-size:11px;color:var(--text3);margin-top:2px;">id: ' + esc2(dt.id||dt._id) + ' · ไอคอน: ' + esc2(dt.icon||'-') + '</p>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:var(--gap-tight);flex-shrink:0;">' +
        '<button onclick="openDocTypeModal(\'' + esc(dt._id) + '\')" style="padding:7px 14px;border:1.5px solid var(--border);background:white;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;color:var(--purple);display:flex;align-items:center;gap:5px;">' +
          '<i data-lucide="pencil" style="width:13px;height:13px;"></i> แก้ไข' +
        '</button>' +
        '<button onclick="deleteDocType(\'' + esc(dt._id) + '\',\'' + esc(dt.label) + '\')" style="padding:7px;border:1.5px solid var(--red-light);background:var(--rose-light-2);border-radius:10px;cursor:pointer;color:var(--red);display:flex;align-items:center;">' +
          '<i data-lucide="trash-2" style="width:14px;height:14px;"></i>' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');
  lucide.createIcons();
}

/* ── seed default doc types from hardcoded DOCUMENT_TYPES ── */
function seedDefaultDocTypes() {
  var batch = db.batch();
  DOCUMENT_TYPES.forEach(function(dt, i) {
    var ref = db.collection('portfolio_doc_types').doc(dt.id);
    batch.set(ref, { id: dt.id, label: dt.label, short: dt.short||'', icon: dt.icon||'file', color: dt.color||'var(--purple)', order: i, active: true, department: dt.department||'academic' });
  });
  batch.commit().then(function() {
    showToast('นำเข้าหัวข้อเริ่มต้นสำเร็จ', 'var(--c-green)');
    loadDocTypeList();
  }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'var(--c-red-mid)'); });
}

function previewDtIcon() {
  var icon = document.getElementById('dtIcon').value.trim() || 'file';
  var el = document.getElementById('dtIconPreviewIcon');
  el.setAttribute('data-lucide', icon);
  lucide.createIcons();
}

function setDtIcon(icon) {
  document.getElementById('dtIcon').value = icon;
  previewDtIcon();
}
function scaleAdminA4() {
  var el = document.getElementById('adminMemoContent');
  if (el) {
    var wrapper = el.parentElement;
    if (wrapper) {
      el.style.transform = 'scale(1)';
      el.style.transformOrigin = 'top left';
      var paperW = el.scrollWidth;
      var available = wrapper.offsetWidth;
      if (paperW > 0 && available > 0) {
        var scale = Math.min(1, available / paperW);
        adminMemoPage1Scale = scale;
        el.style.transform = 'scale(' + scale + ')';
        el.style.transformOrigin = 'top left';
        var leftOffset = (available - paperW * scale) / 2;
        el.style.marginLeft = Math.max(0, leftOffset) + 'px';
        wrapper.style.height = (el.scrollHeight * scale) + 'px';
      }
    }
  }
  var el2 = document.getElementById('adminMemoPage2Content');
  if (el2 && adminMemoPage1Scale) {
    var wrapper2 = el2.parentElement;
    if (wrapper2) {
      el2.style.transform = 'scale(' + adminMemoPage1Scale + ')';
      el2.style.transformOrigin = 'top left';
      var paperW2 = el2.scrollWidth;
      var leftOffset2 = (wrapper2.offsetWidth - paperW2 * adminMemoPage1Scale) / 2;
      el2.style.marginLeft = Math.max(0, leftOffset2) + 'px';
      wrapper2.style.height = (el2.scrollHeight * adminMemoPage1Scale) + 'px';
      wrapper2.style.overflow = 'visible';
    }
  }
}

function toThaiNumeralsAdmin(s) {
  if (!s) return '';
  var thaiDigits = ['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙'];
  return String(s).replace(/[0-9]/g, function(d){ return thaiDigits[parseInt(d)]; });
}

function thaiDateTodayAdmin() {
  var d = new Date();
  var thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  return d.getDate() + ' ' + thMonths[d.getMonth()] + ' ' + (d.getFullYear() + 543);
}

function renderAdminMemoBody(el, text) {
  if (!el || !text) return;
  var paragraphs = text.split('\n');
  el.innerHTML = paragraphs.map(function(p) {
    if (!p.trim()) return '<div style="height:0.8em;"></div>';
    return '<p style="margin:0;text-indent:2.5em;font-size:12pt;line-height:1.8;">' + p + '</p>';
  }).join('');
}
function _renderAdminMemoModal(doc, t, docTypeId, memoData) {
  var dt = DOCUMENT_TYPES.find(function(d){ return d.id === docTypeId; }) || {};

  var staffName = t.staffName || t.displayName || t.email;
  var staffPos  = t.position  || '';
  var staffGrp  = t.staffGroup || '';

  var sem  = currentSem  || '';
  var year = currentYear || '';

  /* ── อ่านข้อมูล memo จาก shared document (memoData) ── */
  var memo = memoData || {};

  /* ── ที่ / วันที่ / เรื่อง ── */
  function setT(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val || '';
  }

  setT('adminMemoPrintRef',     toThaiNumeralsAdmin(memo.memoRef || ''));
  setT('adminMemoPrintDate',    toThaiNumeralsAdmin(memo.memoDate || thaiDateTodayAdmin()));

  var autoSubject = 'ส่ง' + (dt.label || 'งาน') + ' ประจำภาคเรียนที่ ' + sem + ' ปีการศึกษา ' + year;
  setT('adminMemoPrintSubject', toThaiNumeralsAdmin(memo.memoSubject || autoSubject));
  setT('adminMemoPrintTo',      memo.memoTo || 'ผู้อำนวยการโรงเรียนหนองกี่พิทยาคม');

  /* ── เนื้อหา ── */
  var autoBody =
    'ด้วย' + (staffName ? 'ข้าพเจ้า ' + staffName : 'ข้าพเจ้า') +
    (staffPos ? '  ตำแหน่ง ' + staffPos : '') +
    (staffGrp ? '  กลุ่มสาระการเรียนรู้' + staffGrp : '') +
    '\nขอส่ง' + (dt.label || 'งาน') +
    (doc.courseCode || doc.courseName ? '  รายวิชา ' + (doc.courseCode||'') + '  ' + (doc.courseName||'') : '') +
    '\nประจำภาคเรียนที่ ' + sem + '  ปีการศึกษา ' + year +
    (doc.files && doc.files.length ? '  จำนวน ' + doc.files.length + ' ไฟล์' : '') +
    '  ตามเอกสารที่แนบมาพร้อมนี้' +
    '\n\nจึงเรียนมาเพื่อโปรดทราบและพิจารณา';

  var bodyEl = document.getElementById('adminMemoBodyText');
  renderAdminMemoBody(bodyEl, toThaiNumeralsAdmin(memo.memoBody || autoBody));

  /* ── ลายมือชื่อครู ── */
  setT('adminMemoSignName',  staffName ? '( ' + staffName + ' )' : '');
  setT('adminMemoSignPos',   staffPos  ? 'ตำแหน่ง ' + staffPos  : 'ครู');
  setT('adminMemoSignGroup', staffGrp  ? 'กลุ่มสาระการเรียนรู้' + staffGrp : '');

  /* ลายเซ็นรูปภาพ — อ่านจาก memo shared doc */
  var adminSigImg = document.getElementById('adminMemoSignImg');
  if (adminSigImg) {
    var sigSrc = memo.signatureURL || doc.signatureURL || doc.signatureUrl || '';
    if (sigSrc) { adminSigImg.src = sigSrc; adminSigImg.style.display = 'block'; }
    else { adminSigImg.style.display = 'none'; }
  }

  /* ── หน้า 2: ความคิดเห็นผู้ตรวจ ── */
  var page2 = document.getElementById('adminMemoPage2');
  if (page2) page2.style.display = 'block';

  function setNote(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }
  setNote('adminPage2HeadNote',      doc.headNote      || '');
  setNote('adminPage2AssistantNote', doc.assistantNote || '');
  setNote('adminPage2DeputyNote',    doc.deputyNote    || '');
  setNote('adminPage2DirectorNote',  doc.directorNote  || '');

  /* ชื่อผู้ตรวจแต่ละขั้น — fallback จาก adminRoles ถ้าไม่มีบันทึกไว้ */
  function setReviewerName(id, name) {
    var el = document.getElementById(id);
    if (el) el.textContent = name ? '( ' + name + ' )' : '(                                   )';
  }
  /* หัวหน้ากลุ่มสาระ: ดึงตรงกับกลุ่มของครูผู้ส่ง */
  var teacherGroup = normaliseGroup(t.staffGroup || '');
  var headOfGroupsMap = (adminRoles.headOfGroups) || {};
  var headFallback = headOfGroupsMap[teacherGroup] || Object.values(headOfGroupsMap)[0] || null;
  var headName      = doc.headReviewerName      || (headFallback && headFallback.name) || '';
  var assistantName = doc.assistantReviewerName || (adminRoles.assistantAcademic && adminRoles.assistantAcademic.name) || '';
  var deputyName    = doc.deputyReviewerName    || (adminRoles.deputyAcademic    && adminRoles.deputyAcademic.name)    || '';
  var directorName  = doc.directorReviewerName  || (adminRoles.director          && adminRoles.director.name)          || '';
  setReviewerName('adminPage2HeadSign',      headName);
  setReviewerName('adminPage2AssistantSign', assistantName);
  setReviewerName('adminPage2DeputySign',    deputyName);
  setReviewerName('adminPage2DirectorSign',  directorName);

  /* ── ลายเซ็นดิจิตอลผู้ตรวจแต่ละขั้น ── */
  function setReviewerSig(imgId, url) {
    var el = document.getElementById(imgId);
    if (!el) return;
    if (url) { el.src = url; el.style.display = 'block'; }
    else      { el.src = ''; el.style.display = 'none'; }
  }
  setReviewerSig('adminPage2HeadSigImg',      doc.headSignatureURL      || '');
  setReviewerSig('adminPage2AssistantSigImg', doc.assistantSignatureURL || '');
  setReviewerSig('adminPage2DeputySigImg',    doc.deputySignatureURL    || '');
  setReviewerSig('adminPage2DirectorSigImg',  doc.directorSignatureURL  || '');

  document.getElementById('adminMemoModal').classList.add('open');
  document.body.style.overflow = 'hidden';

  setTimeout(scaleAdminA4, 80);
  setTimeout(scaleAdminA4, 300);
  lucide.createIcons();
}

/* ══════════════════════ EVENT HANDLERS ══════════════════════ */
/* ══ ปุ่มย้อนกลับไปด้านบน — scroll เกิดที่ .content-area (id="pageContent") ══ */
function setupScrollTopButton() {
  var content = document.getElementById('pageContent');
  var btn = document.getElementById('scrollTopBtn');
  if (!content || !btn) return;
  content.addEventListener('scroll', function() {
    btn.classList.toggle('show', content.scrollTop > 300);
  });
}

/* ─── YEAR / SEM ─── */
function changeYear(d) {
  currentYear += d;
  document.getElementById('yearLabel').textContent = currentYear;
  loadAllSubmissions();
}
function selectSem(s) {
  currentSem = s;
  document.getElementById('semPill1').className = 'sem-pill' + (s===1?' active':'');
  document.getElementById('semPill2').className = 'sem-pill' + (s===2?' active':'');
  loadAllSubmissions();
}

function setDocFilter(d) {
  currentDocFilter = d;
  document.getElementById('docAll').className = 'filter-pill' + (d === 'all' ? ' active' : '');
  DOCUMENT_TYPES.forEach(function(dt) {
    var el = document.getElementById('doc_' + dt.id);
    if (el) el.className = 'filter-pill' + (d === dt.id ? ' active' : '');
  });
  renderView();
}

function updateStats() {
  var teacherList = Object.values(teacherMap).filter(function(t){ return t.isTeacher; });
  var teachers  = teacherList.length;

  /* นับจาก merged status (1 ครู × 1 docType = 1 slot) แทนการนับ raw docs */
  var mergedMap     = buildMergedStatusMap();
  var statuses      = Object.values(mergedMap);
  var submitted     = statuses.filter(function(s){ return s !== 'none'; }).length;
  var reviewed      = statuses.filter(function(s){
    return s === 'head_reviewed' || s === 'assistant_reviewed' || s === 'deputy_reviewed';
  }).length;
  var finalApproved = statuses.filter(function(s){ return s === 'final_approved'; }).length;
  var pending       = statuses.filter(function(s){ return s === 'none'; }).length;

  document.getElementById('statTeachers').textContent = teachers;
  document.getElementById('statSubmitted').textContent = submitted;
  document.getElementById('statReviewed').textContent = reviewed;
  document.getElementById('statFinalApproved').textContent = finalApproved;
  document.getElementById('statPending').textContent = pending;

  /* อัปเดตกราฟเสมอ */
  renderCharts();
}

/* ─── FILTER / VIEW ─── */
function setFilter(f) {
  currentFilter = f;
  ['filterAll','filterIncomplete','filterComplete','filterPending'].forEach(function(id) {
    document.getElementById(id).className = 'filter-pill' + (id === 'filter'+cap(f) ? ' active' : '');
  });
  renderView();
}

/* ─── LIST VIEW ─── */
function getLatestSubmitTime(t) {
  /* หาเวลาส่งล่าสุดของครูคนนี้ — sub เป็น container อ่านจาก _courses */
  var times = [];
  Object.values(t.subs).forEach(function(sub) {
    var docs = sub._courses || [sub];
    docs.forEach(function(doc) {
      if (doc._isContainer) return;
      if (!doc.submittedAt) return;
      var d = doc.submittedAt.toDate ? doc.submittedAt.toDate() : new Date(doc.submittedAt);
      times.push(d.getTime());
    });
  });
  return times.length ? Math.max.apply(null, times) : 0;
}

function toggleTeacher(uid) {
  var docs = document.getElementById('docs-' + uid);
  var chev = document.getElementById('chevron-' + uid);
  var open = docs.classList.toggle('open');
  if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
}   /* courseCode ของรายวิชาที่เลือกอยู่ (สำหรับ multi-course) */

function openReview(subId, uid, docTypeId) {
  if (!subId) return;
  var t = teacherMap[uid];
  var sub = t && t.subs[docTypeId];
  if (!sub) return;

  var dt = DOCUMENT_TYPES.find(function(d){ return d.id===docTypeId; });
  reviewingUid       = uid;
  reviewingDocTypeId = docTypeId;
  selectedFileIdx    = 0;
  selectedCourseKey  = null;

  /* สร้าง courseMap เพื่อกำหนด selectedCourseKey และ reviewingSubId ตั้งแต่แรก */
  var courseMap  = buildCourseMapFromSub(sub);
  var courseKeys = Object.keys(courseMap);

  /* ตั้งค่าเริ่มต้น: เลือก course แรกเสมอ */
  if (courseKeys.length > 0) {
    selectedCourseKey = courseKeys[0];
    var firstFiles = courseMap[courseKeys[0]];
    reviewingSubId = (firstFiles.length > 0 && firstFiles[0]._docId)
      ? firstFiles[0]._docId
      : (sub._courses ? sub._courses[0].id : (sub.id || subId));
  } else {
    reviewingSubId = sub.id || subId;
  }

  document.getElementById('reviewModalTitle').textContent = dt.label;
  document.getElementById('reviewModalSub').textContent =
    (t.staffName || t.displayName) +
    (t.position  ? ' · ' + t.position  : '') +
    (t.staffGroup ? ' · ' + t.staffGroup : '') +
    ' · ปีการศึกษา ' + currentYear + ' ภาคเรียน ' + currentSem;

  /* ── แสดง badge บทบาทผู้ตรวจ ── */
  var badgeEl = document.getElementById('reviewRoleBadge');
  if (badgeEl) {
    var p2 = adminPermissions || {};
    var badgeCfg = isSuperAdmin
      ? { label:'⚡ SuperAdmin', bg:'var(--purple-light)', color:'var(--c-violet-deep)' }
      : isHeadOfGroupOnly
      ? { label:'⭐ หัวหน้ากลุ่มสาระ', bg:'#fef3c7', color:'var(--c-amber-deep)' }
      : p2.assistantDirectorAcademic && !p2.deputyDirectorAcademic && !p2.director
      ? { label:'🏅 ผช.ผอ.วิชาการ (ขั้น 2)', bg:'#cffafe', color:'var(--c-sky-deep)' }
      : p2.deputyDirectorAcademic && !p2.director
      ? { label:'👑 รอง ผอ.วิชาการ (ขั้น 3)', bg:'var(--purple-light)', color:'var(--c-violet)' }
      : p2.director
      ? { label:'🎖 ผู้อำนวยการ (ขั้น 4)', bg:'#fef3c7', color:'var(--c-amber-deep)' }
      : { label:'👁 ดูข้อมูลเท่านั้น', bg:'var(--bg-alt)', color:'var(--text2)' };
    badgeEl.style.background = badgeCfg.bg;
    badgeEl.style.color = badgeCfg.color;
    badgeEl.textContent = badgeCfg.label;
    badgeEl.style.display = 'inline-flex';
  }

  var multiSection = document.getElementById('multiFileSection');

  if (courseKeys.length > 1) {
    /* หลายวิชา (หลาย Firestore doc): แสดง course selector */
    multiSection.style.display = 'block';
    renderCourseFileList(sub, courseMap, courseKeys[0]);
  } else if (courseKeys.length === 1) {
    /* วิชาเดียว: ซ่อน selector แสดงตรงๆ */
    multiSection.style.display = 'none';
    fillSingleFileInfo({});
  } else {
    multiSection.style.display = 'none';
    fillSingleFileInfo(sub);
  }

  document.getElementById('reviewModal').classList.add('open');
  document.body.style.overflow = 'hidden';

  /* ซ่อน textarea หมายเหตุถ้าดูอย่างเดียว */
  var p3 = adminPermissions || {};
  var canReview = isSuperAdmin || isHeadOfGroupOnly ||
    p3.assistantDirectorAcademic || p3.deputyDirectorAcademic || p3.director;
  var noteSection = document.getElementById('reviewNoteSection');
  if (noteSection) noteSection.style.display = canReview ? 'block' : 'none';

  /* เคลียร์ note + signature เมื่อเปิด modal ใหม่ทุกครั้ง */
  var noteEl = document.getElementById('adminNote');
  if (noteEl) noteEl.value = '';
  if (typeof clearAdminSignature === 'function') clearAdminSignature();
  if (typeof initAdminSigPadNow  === 'function') initAdminSigPadNow();

  lucide.createIcons();
}

/* เปิด modal โดย pre-select รายวิชาที่ระบุ */
function openReviewCourse(subId, uid, docTypeId, cKey) {
  openReview(subId, uid, docTypeId);
  var t   = teacherMap[uid];
  var sub = t && t.subs[docTypeId];
  if (!sub) return;
  var courseMap = buildCourseMapFromSub(sub);
  var keys = Object.keys(courseMap);
  if (keys.length > 1 && courseMap[cKey]) {
    renderCourseFileList(sub, courseMap, cKey);
  }
}

function selectCourse(cKey) {
  var t   = teacherMap[reviewingUid];
  var sub = t && t.subs[reviewingDocTypeId];
  if (!sub) return;
  var courseMap = buildCourseMap(sub);
  renderCourseFileList(sub, courseMap, cKey);
  lucide.createIcons();
}

function selectFile(idx) {
  var t   = teacherMap[reviewingUid];
  var sub = t && t.subs[reviewingDocTypeId];
  if (!sub || !sub.files) return;
  renderMultiFileList(sub, sub.files, idx);
}

function onPortfolioSubtabChange(tab) {
  currentSubTab = tab;
  if (tab === 'doctypes') loadDocTypeList();
  if (tab === 'group')    renderGroupPanel();
}

/* ════════════════════════════════════════════
   NOTES TIMELINE MODAL
   ════════════════════════════════════════════ */

function openNotesModal(uid, docTypeId) {
  var t = teacherMap[uid];
  var sub = t && t.subs[docTypeId];
  var dt = DOCUMENT_TYPES.find(function(d){ return d.id === docTypeId; });
  if (!dt) return;

  document.getElementById('notesModalTitle').textContent = dt.label;
  document.getElementById('notesModalSub').textContent =
    (t ? (t.staffName || t.displayName) : uid) + ' · ปีการศึกษา ' + currentYear + ' ภาคเรียน ' + currentSem;

  var body = document.getElementById('notesModalBody');

  if (!sub) {
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);"><i data-lucide="inbox" style="width:32px;height:32px;margin-bottom:10px;"></i><p style="font-size:13px;font-weight:700;">ยังไม่มีการส่งงาน</p></div>';
    document.getElementById('notesModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
    return;
  }

  var docs = sub._courses || [sub];
  var html = '';

  docs.forEach(function(doc) {
    if (doc._isContainer) return;

    var dSt = doc.status || 'submitted';
    var courseLabel = doc.courseCode
      ? '<span style="font-size:11px;font-weight:800;color:var(--accent);background:var(--accent-tint);padding:2px 8px;border-radius:6px;">' + esc2(doc.courseCode) + '</span>' + (doc.courseName ? ' <span style="font-size:11px;color:var(--text-slate);font-weight:600;">' + esc2(doc.courseName) + '</span>' : '')
      : '<span style="font-size:11px;color:var(--text2);font-weight:600;">รายการเดียว</span>';

    html += '<div style="margin-bottom:var(--gap-section);">';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--bg-alt);">' +
      courseLabel + '</div>';

    /* Build timeline entries */
    var entries = [];

    /* 1. Teacher submitted */
    if (doc.submittedAt) {
      entries.push({
        emoji: '📤', bg: '#dcfce7', border: 'var(--c-green)',
        label: 'ครูส่งงาน',
        who: t ? (t.staffName || t.displayName) : uid,
        when: formatDate(doc.submittedAt),
        note: doc.note || null,
        noteStyle: 'teacher',
      });
    }

    /* 2. Head note */
    if (doc.headNote || doc.status === 'head_reviewed' || doc.status === 'reviewed') {
      entries.push({
        emoji: '👤', bg: 'var(--sky-light)', border: 'var(--c-sky)',
        label: 'หัวหน้ากลุ่มสาระตรวจ',
        who: doc.headReviewerName || doc.reviewedBy || '',
        when: doc.reviewedAt ? formatDate(doc.reviewedAt) : '',
        note: doc.headNote || null,
        noteStyle: 'admin',
      });
    }

    /* 3. Assistant note */
    if (doc.assistantNote || doc.status === 'assistant_reviewed') {
      entries.push({
        emoji: '🏅', bg: '#fef3c7', border: 'var(--c-amber)',
        label: 'ผช.ผอ.วิชาการตรวจ',
        who: doc.assistantReviewerName || '',
        when: '',
        note: doc.assistantNote || null,
        noteStyle: 'admin',
      });
    }

    /* 4. Deputy note */
    if (doc.deputyNote || doc.status === 'deputy_reviewed') {
      entries.push({
        emoji: '👑', bg: 'var(--purple-light)', border: 'var(--c-violet)',
        label: 'รอง ผอ.วิชาการตรวจ',
        who: doc.deputyReviewerName || '',
        when: '',
        note: doc.deputyNote || null,
        noteStyle: 'admin',
      });
    }

    /* 5. Director note */
    if (doc.directorNote || doc.status === 'final_approved') {
      entries.push({
        emoji: '🎖', bg: '#d1fae5', border: 'var(--c-green)',
        label: 'ผู้อำนวยการอนุมัติ',
        who: doc.directorReviewerName || '',
        when: '',
        note: doc.directorNote || null,
        noteStyle: 'admin',
      });
    }

    /* 6. Revision note */
    if (doc.status === 'revision' && doc.adminNote) {
      entries.push({
        emoji: '⚠', bg: 'var(--c-red-pale)', border: 'var(--c-red-mid)',
        label: 'ส่งคืนเพื่อแก้ไข',
        who: doc.lastRevisedBy || doc.reviewedBy || '',
        when: doc.reviewedAt ? formatDate(doc.reviewedAt) : '',
        note: doc.adminNote,
        noteStyle: 'revision',
      });
    }

    if (!entries.length) {
      html += '<p style="font-size:12px;color:var(--text3);text-align:center;padding:12px;">ยังไม่มีบันทึกข้อความ</p>';
    } else {
      html += '<div class="note-timeline">';
      entries.forEach(function(e, idx) {
        var isLast = idx === entries.length - 1;
        html += '<div class="note-tl-item">' +
          '<div class="note-tl-line">' +
            '<div class="note-tl-dot" style="background:' + e.bg + ';border-color:' + e.border + ';">' + e.emoji + '</div>' +
            (!isLast ? '<div class="note-tl-connector"></div>' : '') +
          '</div>' +
          '<div class="note-tl-body">' +
            '<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-top:4px;">' +
              '<span style="font-size:12px;font-weight:800;color:var(--text-dark);">' + e.label + '</span>' +
              (e.who ? '<span style="font-size:10px;color:var(--purple);font-weight:700;">โดย ' + esc2(e.who) + '</span>' : '') +
              (e.when ? '<span style="font-size:10px;color:var(--text3);">' + e.when + '</span>' : '') +
            '</div>' +
            (e.note ?
              '<div style="margin-top:6px;padding:8px 12px;border-radius:8px;border-left:3px solid ' + e.border + ';background:' + e.bg + ';">' +
                '<p style="font-size:12px;color:var(--text-slate);line-height:1.7;">' + esc2(e.note) + '</p>' +
              '</div>'
            : '<p style="font-size:11px;color:var(--text3);font-style:italic;margin-top:4px;">ไม่มีบันทึกข้อความ</p>') +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
  });

  body.innerHTML = html || '<p style="text-align:center;color:var(--text3);font-size:13px;padding:24px;">ไม่มีข้อมูล</p>';
  document.getElementById('notesModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
}

function selectTeacher(email) {
  selectedTeacherKey = email;
  var t = teacherMap[email];
  if (!t) return;

  /* hide dropdown */
  document.getElementById('teacherDropdownWrap').style.display = 'none';
  document.getElementById('teacherSearchInput').value = '';

  /* show pill */
  var name   = t.staffName || t.displayName || t.email;
  var avatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=7c3aed&color=fff&size=72';
  document.getElementById('selectedTeacherAvatar').src = avatar;
  document.getElementById('selectedTeacherName').textContent  = name;
  document.getElementById('selectedTeacherMeta').textContent  = (t.staffGroup || '') + (t.position ? ' · ' + t.position : '') + ' · ' + t.email;
  document.getElementById('selectedTeacherPill').style.display = 'flex';

  /* show detail panel */
  document.getElementById('teacherNoSelect').style.display    = 'none';
  document.getElementById('teacherDetailPanel').style.display = 'flex';

  renderTeacherDetail(t);
  lucide.createIcons();
}

function toggleSubDocRow(rowId) {
  var body = document.getElementById('body-' + rowId);
  var chev = document.getElementById('chev-' + rowId);
  var open = body.classList.toggle('open');
  if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
} /* snapshot ของ list ขณะ drag */

function dtDragStart(ev, idx) {
  dragSrcIndex = idx;
  ev.currentTarget.classList.add('dragging');
  ev.dataTransfer.effectAllowed = 'move';
  /* snapshot current docs */
  dragDocs = Array.prototype.slice.call(document.getElementById('docTypeList').querySelectorAll('.dt-row')).map(function(el){ return el.dataset.docid; });
}
function dtDragOver(ev) {
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  ev.currentTarget.classList.add('drag-over');
}
function dtDragLeave(ev) { ev.currentTarget.classList.remove('drag-over'); }
function dtDragEnd() {
  document.querySelectorAll('.dt-row').forEach(function(el){ el.classList.remove('dragging','drag-over'); });
}
function dtDrop(ev, targetIdx, targetDocId) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('drag-over');
  if (dragSrcIndex === null || dragSrcIndex === targetIdx) return;

  /* reorder dragDocs */
  var moved = dragDocs.splice(dragSrcIndex, 1)[0];
  dragDocs.splice(targetIdx, 0, moved);

  /* batch update order */
  var batch = db.batch();
  dragDocs.forEach(function(docId, i) {
    batch.update(db.collection('portfolio_doc_types').doc(docId), { order: i });
  });
  batch.commit().then(function() {
    loadDocTypeList();
    /* อัปเดต DOCUMENT_TYPES ใน memory ด้วย */
    loadDocTypesFromFirestore();
  }).catch(function(e){ showToast('เรียงลำดับไม่ได้: ' + e.message, 'var(--c-red-mid)'); });
  dragSrcIndex = null;
}

/* ── open add/edit modal ── */
function openDocTypeModal(firestoreId) {
  editingDocTypeId = firestoreId;
  document.getElementById('dtModalTitle').textContent = firestoreId ? 'แก้ไขหัวข้องาน' : 'เพิ่มหัวข้องาน';
  document.getElementById('dtLabel').value  = '';
  document.getElementById('dtShort').value  = '';
  document.getElementById('dtId').value     = '';
  document.getElementById('dtIcon').value   = 'file';
  document.getElementById('dtColor').value  = 'var(--c-sky)';
  document.getElementById('dtActive').checked = true;
  document.getElementById('dtDepartment').value = 'academic';
  selectedDtColor = 'var(--c-sky)';
  updateColorSwatches('var(--c-sky)');
  syncToggleUI();
  previewDtIcon();

  if (firestoreId) {
    db.collection('portfolio_doc_types').doc(firestoreId).get().then(function(d) {
      if (!d.exists) return;
      var data = d.data();
      document.getElementById('dtLabel').value  = data.label  || '';
      document.getElementById('dtShort').value  = data.short  || '';
      document.getElementById('dtId').value     = data.id     || firestoreId;
      document.getElementById('dtIcon').value   = data.icon   || 'file';
      document.getElementById('dtColor').value  = data.color  || 'var(--c-sky)';
      document.getElementById('dtActive').checked = data.active !== false;
      document.getElementById('dtDepartment').value = data.department || 'academic';
      selectedDtColor = data.color || 'var(--c-sky)';
      updateColorSwatches(selectedDtColor);
      syncToggleUI();
      previewDtIcon();
    });
  }

  /* toggle knob wiring */
  document.getElementById('dtActive').onchange = syncToggleUI;

  openModal('docTypeModal');
}

function selectDtColor(color, el) {
  selectedDtColor = color;
  document.getElementById('dtColor').value = color;
  updateColorSwatches(color);
}

function updateColorSwatches(color) {
  document.querySelectorAll('#dtColorPicker .color-swatch').forEach(function(sw) {
    sw.classList.toggle('selected', sw.dataset.color === color);
  });
}

/* ── save doc type ── */
function saveDocType() {
  var label  = document.getElementById('dtLabel').value.trim();
  var short  = document.getElementById('dtShort').value.trim();
  var id     = document.getElementById('dtId').value.trim();
  var icon   = document.getElementById('dtIcon').value.trim() || 'file';
  var color  = document.getElementById('dtColor').value.trim() || 'var(--c-sky)';
  var active = document.getElementById('dtActive').checked;
  var department = document.getElementById('dtDepartment').value || 'academic';

  if (!label) { showToast('กรุณากรอกชื่อหัวข้อ', 'var(--c-red-mid)'); return; }
  if (!id)    { showToast('กรุณากรอกรหัสหัวข้อ', 'var(--c-red-mid)'); return; }
  if (!/^[a-z0-9_]+$/.test(id)) { showToast('รหัสใช้ได้เฉพาะ a-z, 0-9, _', 'var(--c-red-mid)'); return; }

  var saveData = { id: id, label: label, short: short, icon: icon, color: color, active: active, department: department };

  var prom;
  if (editingDocTypeId) {
    prom = db.collection('portfolio_doc_types').doc(editingDocTypeId).update(saveData);
  } else {
    /* กำหนด order ต่อท้าย */
    prom = db.collection('portfolio_doc_types').orderBy('order','desc').limit(1).get().then(function(snap) {
      var nextOrder = snap.empty ? 0 : (snap.docs[0].data().order || 0) + 1;
      saveData.order = nextOrder;
      /* ใช้ id เป็น Firestore doc id */
      return db.collection('portfolio_doc_types').doc(id).set(saveData);
    });
  }

  prom.then(function() {
    showToast(editingDocTypeId ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มหัวข้องานใหม่แล้ว', 'var(--c-green)');
    closeModal('docTypeModal');
    loadDocTypeList();
    loadDocTypesFromFirestore(); /* อัปเดต DOCUMENT_TYPES ใน memory */
  }).catch(function(e) { showToast('เกิดข้อผิดพลาด: ' + e.message, 'var(--c-red-mid)'); });
}

/* ── delete doc type ── */
function deleteDocType(firestoreId, label) {
  if (!confirm('ลบหัวข้อ "' + label + '" ออกจากระบบ?\n\nงานที่ครูส่งไปแล้วจะยังอยู่ใน Firestore แต่จะไม่แสดงในมุมมองติดตาม')) return;
  db.collection('portfolio_doc_types').doc(firestoreId).delete().then(function() {
    showToast('ลบหัวข้อแล้ว', 'var(--c-amber)');
    loadDocTypeList();
    loadDocTypesFromFirestore();
  }).catch(function(e){ showToast('ลบไม่ได้: ' + e.message, 'var(--c-red-mid)'); });
}

function initAdminA4Scaler() {
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.target.classList && m.target.classList.contains('open')) {
        setTimeout(scaleAdminA4, 80);
        setTimeout(scaleAdminA4, 300);
      }
    });
  });
  var modal = document.getElementById('adminMemoModal');
  if (modal) observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', function(){ setTimeout(scaleAdminA4, 50); });
}

/* เปิด memo modal จากหน้า admin — อ่าน memo จาก portfolio_memos (shared doc) */
function openAdminMemoModal(docId, teacherEmail, docTypeId) {
  var t = teacherMap[teacherEmail];
  if (!t) { showToast('ไม่พบข้อมูลครู', 'error'); return; }
  var sub = t.subs[docTypeId];
  if (!sub) { showToast('ยังไม่มีการส่งงาน', 'warn'); return; }

  /* หา uid ของครู จาก submission */
  var docRef = docId
    ? db.collection('portfolio_submissions').doc(docId)
    : (sub._courses && sub._courses[0] && sub._courses[0].id
        ? db.collection('portfolio_submissions').doc(sub._courses[0].id)
        : null);

  /* ดึง uid ของครูจาก submission เพื่อสร้าง memoId */
  function proceedWithUid(uid) {
    var memoId = uid + '_' + docTypeId + '_' + currentYear + '_' + currentSem;
    db.collection('portfolio_memos').doc(memoId).get()
      .then(function(mDoc) {
        var memoData = mDoc.exists ? mDoc.data() : null;

        /* รวบรวม docId ทั้งหมดที่ต้อง fetch (ตัวที่คลิก + ทุก course) */
        var idsToFetch = [];
        if (docId) idsToFetch.push(docId);
        if (sub._courses) {
          sub._courses.forEach(function(c) {
            if (c.id && idsToFetch.indexOf(c.id) === -1) idsToFetch.push(c.id);
          });
        }
        if (!idsToFetch.length) {
          _renderAdminMemoModal(Object.assign({}, sub), t, docTypeId, memoData);
          return;
        }

        /* field ที่ต้องรวมจากทุก course */
        var sigFields = ['headSignatureURL','assistantSignatureURL','deputySignatureURL','directorSignatureURL',
                         'headReviewerName','assistantReviewerName','deputyReviewerName','directorReviewerName',
                         'headNote','assistantNote','deputyNote','directorNote'];

        /* fetch ทุก doc แล้ว merge ลายเซ็นเข้าด้วยกัน */
        Promise.all(idsToFetch.map(function(id){
          return db.collection('portfolio_submissions').doc(id).get().catch(function(){ return null; });
        })).then(function(snaps) {
          /* ใช้ doc ที่ตรงกับ docId เป็นฐาน ไม่ก็ตัวแรก */
          var primary = null;
          snaps.forEach(function(s) {
            if (s && s.exists && s.id === docId) primary = Object.assign({ id: s.id }, s.data());
          });
          if (!primary && snaps[0] && snaps[0].exists) {
            primary = Object.assign({ id: snaps[0].id }, snaps[0].data());
          }
          if (!primary) {
            primary = Object.assign({ id: docId || idsToFetch[0] }, (sub._courses && sub._courses[0]) || sub);
          }

          /* เติม field ลายเซ็น/ชื่อ/note จาก course อื่น ๆ ถ้า primary ยังว่าง */
          snaps.forEach(function(s) {
            if (!s || !s.exists) return;
            var d = s.data();
            sigFields.forEach(function(f) {
              if (!primary[f] && d[f]) primary[f] = d[f];
            });
          });

          _renderAdminMemoModal(primary, t, docTypeId, memoData);
        }).catch(function() {
          var fallback = Object.assign({ id: docId || idsToFetch[0] }, (sub._courses && sub._courses[0]) || sub);
          _renderAdminMemoModal(fallback, t, docTypeId, memoData);
        });
      })
      .catch(function(e) {
        console.warn('[AdminMemo] loadMemo error:', e);
        var fallback = Object.assign({ id: docId || '' }, (sub._courses && sub._courses[0]) || sub);
        _renderAdminMemoModal(fallback, t, docTypeId, null);
      });
  }

  /* ถ้ามี docRef ให้ดึง uid จาก Firestore; ถ้าไม่มีก็ใช้ uid จาก teacherMap หรือ email */
  if (docRef) {
    docRef.get().then(function(d) {
      var uid = (d.exists && d.data().uid) || t.uid || teacherEmail;
      proceedWithUid(uid);
    }).catch(function() { proceedWithUid(t.uid || teacherEmail); });
  } else {
    proceedWithUid(t.uid || teacherEmail);
  }
}

function closeAdminMemoModal() {
  var modal = document.getElementById('adminMemoModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

/* เรียก init เมื่อ DOM พร้อม */
document.addEventListener('DOMContentLoaded', initAdminA4Scaler);

/* ══════════════════════ INIT ══════════════════════ */
/* ── buildPage() — auth guard + shell + sidebar อัตโนมัติ ── */
buildPage({
  appId:        'adminApp',
  navSubtitle:  'ติดตามส่งงานครู',
  navTheme:     'dark',
  activePage:   'portfolio-admin',
  requireAdmin: 'admin',          /* ต้องมีในตาราง admins (portfolio/headOfGroup check ใน onAuth) */

  onAuth: function(user, contentEl) {
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);

    currentUserEmail = user.email.toLowerCase();
    currentUserName  = user.displayName || '';

    /* inject page content จาก <template> */
    var tpl = document.getElementById('portfolioAdminContent');
    if (tpl) contentEl.appendChild(document.importNode(tpl.content, true));

    lucide.createIcons();
    initSubtabs('portfolioSubtabBar', { onChange: onPortfolioSubtabChange });
    setupScrollTopButton();

    /* ── ตรวจสิทธิ์เพิ่มเติม (portfolio / headOfGroup) ── */
    db.collection('admins').doc(currentUserEmail).get().then(function(doc) {
      var p = doc.exists ? (doc.data().permissions || {}) : {};
      myAdminSignatureURL = doc.exists ? (doc.data().lastSignatureURL || '') : '';
      var isSA = currentUserEmail === SUPERADMIN_EMAIL || !!p.superadmin;
      isSuperAdmin = isSA;
      var hasPortfolio   = isSA || !!p.portfolio;
      var hasHeadOfGroup = !!p.headOfGroup;
      /* ⚠️ เดิมด่านเข้าเว็บเช็คแค่ hasPortfolio/hasHeadOfGroup แต่ระบบตรวจ 4 ขั้น
         (canIReviewStage()) ใช้สิทธิ์คนละฟิลด์กัน (assistantDirectorAcademic /
         deputyDirectorAcademic / director) ทำให้ผู้ตรวจขั้น 2/3/4 ที่ไม่ได้ติ๊ก
         'portfolio' ควบคู่ไปด้วย โดนบล็อกที่ accessDenied เข้าเว็บไม่ได้เลย
         ทั้งที่ควรมีสิทธิ์ตรวจ → รวมสิทธิ์ทั้ง 3 ขั้นเข้ามาด่านเข้าเว็บด้วย */
      var hasReviewerStage = !!p.assistantDirectorAcademic || !!p.deputyDirectorAcademic || !!p.director;

      adminPermissions = isSA
        ? { portfolio:true, assistantDirectorAcademic:true, deputyDirectorAcademic:true, director:true }
        : p;

      if (!hasPortfolio && !hasHeadOfGroup && !hasReviewerStage) {
        document.getElementById('adminApp').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'flex';
        lucide.createIcons();
        return;
      }

      /* ── ชื่อจริง + headOfGroup lock ── */
      db.collection('staff').where('email','==',currentUserEmail).limit(1).get().then(function(ss) {
        if (!ss.empty) {
          currentUserName = ss.docs[0].data().name || currentUserName;
          if (!hasPortfolio && hasHeadOfGroup) {
            isHeadOfGroupOnly = true;
            headOfGroupName = normaliseGroup(ss.docs[0].data().group || '');
          }
        } else if (!hasPortfolio && hasHeadOfGroup) {
          isHeadOfGroupOnly = true;
        }
        bootApp(user);
      }).catch(function() {
        if (!hasPortfolio && hasHeadOfGroup) isHeadOfGroupOnly = true;
        bootApp(user);
      });
    }).catch(function() {
      document.getElementById('accessDenied').style.display = 'flex';
    });
  }
});

/* ════════════════════════════════════════════
   ADMIN SIGNATURE PAD
   ════════════════════════════════════════════ */
(function() {
  var canvas, ctx, drawing = false, hasSig = false;
  var sigMode = 'draw';      /* 'draw' = วาดเองบน canvas | 'file' = แนบไฟล์รูปภาพ | 'existing' = ใช้ลายเซ็นเดิมที่เคยเซ็นไว้ */
  var fileDataURL = '';
  var hasFileSig  = false;
  var existingSigURLSelected = ''; /* URL ลายเซ็นเดิมที่กด "ใช้ลายเซ็นนี้" เลือกไว้ */

  /* ความกว้างเส้นอ้างอิง ณ ความกว้าง canvas มาตรฐาน (420px ตามที่ประกาศใน HTML)
     ⚠️ canvas ใช้ width:100% (ยืดตามความกว้างจอ) แต่สูงคงที่ 90px — ถ้าใช้ lineWidth
     คงที่ตรงๆ เส้นจะ "ดูหนา" บนจอแคบ (มือถือ) และ "ดูบาง" บนจอกว้าง (คอม) เพราะสัดส่วน
     เส้นต่อขนาดลายเซ็นไม่เท่ากัน จึงคำนวณ lineWidth ให้ scale ตามความกว้าง canvas จริง
     เทียบกับความกว้างอ้างอิงเสมอ ทำให้เส้นหนาเท่ากันทุกอุปกรณ์/ทุกขั้นตอนการตรวจ */
  var SIG_REF_WIDTH = 420;
  var SIG_REF_LINE_WIDTH = 2;

  function _sigLineWidth(cssWidth) {
    return SIG_REF_LINE_WIDTH * (cssWidth / SIG_REF_WIDTH);
  }

  function _applySigPenStyle(cssWidth) {
    ctx.strokeStyle = cssVar('--text');
    ctx.lineWidth   = _sigLineWidth(cssWidth);
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }

  function initAdminSigPad() {
    canvas = document.getElementById('adminSigCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    var rect = canvas.getBoundingClientRect();
    canvas.width  = Math.floor(rect.width  * (window.devicePixelRatio || 1));
    canvas.height = Math.floor(rect.height * (window.devicePixelRatio || 1));
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    canvas.style.width  = rect.width  + 'px';
    canvas.style.height = rect.height + 'px';

    /* ตั้ง pen style ครั้งเดียวหลัง scale เสร็จ — คำนวณ lineWidth ตามความกว้างจริง
       ของ canvas เทียบกับค่าอ้างอิง ไม่ใช้ค่าคงที่ตรงๆ อีกต่อไป */
    _applySigPenStyle(rect.width);

    function getPos(e) {
      var r = canvas.getBoundingClientRect();
      var src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    }
    function start(e) { e.preventDefault(); drawing = true; var p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
    function move(e)  { if (!drawing) return; e.preventDefault(); var p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasSig = true; }
    function end()    { drawing = false; }

    canvas.addEventListener('mousedown',  start);
    canvas.addEventListener('mousemove',  move);
    canvas.addEventListener('mouseup',    end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove',  move,  { passive: false });
    canvas.addEventListener('touchend',   end);
  }

  /* ── สลับโหมด วาดเอง / แนบไฟล์ ── */
  function updateAdminSigModeUI() {
    var drawBtn  = document.getElementById('adminSigModeDraw');
    var fileBtn  = document.getElementById('adminSigModeFile');
    var drawPane = document.getElementById('adminSigDrawPane');
    var filePane = document.getElementById('adminSigFilePane');
    if (drawBtn)  drawBtn.className  = 'sigpad-mode-btn' + (sigMode === 'draw' ? ' active' : '');
    if (fileBtn)  fileBtn.className  = 'sigpad-mode-btn' + (sigMode === 'file' ? ' active' : '');
    if (drawPane) drawPane.style.display = sigMode === 'draw' ? 'block' : 'none';
    if (filePane) filePane.style.display = sigMode === 'file' ? 'block' : 'none';
  }
  window.setAdminSigMode = function(mode) {
    sigMode = mode;
    /* สลับไปวาดเอง/แนบไฟล์ = ยกเลิกการเลือก "ใช้ลายเซ็นเดิม" */
    existingSigURLSelected = '';
    var useBtn = document.getElementById('useExistingSigBtn');
    if (useBtn) useBtn.classList.remove('active');
    updateAdminSigModeUI();
  };

  /* ── กด "ใช้ลายเซ็นนี้" บนลายเซ็นของตัวเองที่เคยใช้ล่าสุด ──
     ใช้ URL เดิมได้เลยโดยไม่ต้องอัปโหลดใหม่ (ดู uploadAdminSignatureToStorage ที่ข้าม
     การอัปโหลดถ้าค่าที่ได้จาก getAdminSigDataURL() เป็น http URL อยู่แล้ว ไม่ใช่ data:) */
  window.useMyExistingSignature = function() {
    if (typeof myAdminSignatureURL === 'undefined' || !myAdminSignatureURL) return;
    existingSigURLSelected = myAdminSignatureURL;
    sigMode = 'existing';
    var useBtn  = document.getElementById('useExistingSigBtn');
    var drawBtn = document.getElementById('adminSigModeDraw');
    var fileBtn = document.getElementById('adminSigModeFile');
    if (useBtn)  useBtn.classList.add('active');
    if (drawBtn) drawBtn.className = 'sigpad-mode-btn';
    if (fileBtn) fileBtn.className = 'sigpad-mode-btn';
    if (typeof showToast === 'function') showToast('เลือกใช้ลายเซ็นเดิมแล้ว ✓', 'success');
  };

  /* ── รับไฟล์ที่แนบเข้ามา (ตรวจ/ย่อขนาด ผ่าน readSignatureImageFile() จาก common.js) ── */
  window.handleAdminSigFile = function(file) {
    if (typeof readSignatureImageFile !== 'function') return;
    readSignatureImageFile(file, function(dataURL) {
      fileDataURL = dataURL;
      hasFileSig  = true;
      var img         = document.getElementById('adminSigFilePreviewImg');
      var wrap        = document.getElementById('adminSigFilePreviewWrap');
      var placeholder = document.getElementById('adminSigFilePlaceholder');
      if (img)         img.src = dataURL;
      if (wrap)        wrap.style.display = 'flex';
      if (placeholder) placeholder.style.display = 'none';
    }, function(errMsg) {
      if (typeof showToast === 'function') showToast('⚠ ' + errMsg, 'warn');
    });
  };

  window.clearAdminSigFile = function() {
    fileDataURL = '';
    hasFileSig  = false;
    var input       = document.getElementById('adminSigFileInput');
    var wrap        = document.getElementById('adminSigFilePreviewWrap');
    var placeholder = document.getElementById('adminSigFilePlaceholder');
    if (input)       input.value = '';
    if (wrap)        wrap.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
  };

  window.clearAdminSignature = function() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio||1), canvas.height / (window.devicePixelRatio||1));
    hasSig = false;
  };
  window.isAdminSigEmpty = function() {
    if (sigMode === 'existing') return !existingSigURLSelected;
    return sigMode === 'file' ? !hasFileSig : !hasSig;
  };
  window.getAdminSigDataURL = function() {
    if (sigMode === 'existing') return existingSigURLSelected;
    if (sigMode === 'file') return fileDataURL;
    return canvas ? canvas.toDataURL('image/png') : '';
  };
  /* init ทุกครั้งที่ modal เปิด — reset ทั้งโหมดวาดและโหมดไฟล์ กันลายเซ็นเก่าค้าง
     ข้ามไปใช้กับการตรวจงานชิ้นถัดไปโดยไม่ได้ตั้งใจ */
  window.initAdminSigPadNow = function() {
    hasSig  = false;
    sigMode = 'draw';
    existingSigURLSelected = '';
    var useBtn = document.getElementById('useExistingSigBtn');
    if (useBtn) useBtn.classList.remove('active');
    window.clearAdminSigFile();
    updateAdminSigModeUI();
    setTimeout(initAdminSigPad, 80);
  };
})();



