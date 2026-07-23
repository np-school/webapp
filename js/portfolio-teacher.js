
/* ── Helper: อ่าน CSS variable จาก :root (ใช้กับ canvas ที่ไม่รองรับ var() ตรงๆ) ── */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
/* ── คำนวณปีการศึกษาและภาคเรียนอัตโนมัติจากวันที่ปัจจุบัน ──
   ภาคเรียนที่ 1: เปิด 16 พ.ค.  → ถึง 31 ต.ค.
   ภาคเรียนที่ 2: เปิด  1 พ.ย.  → ถึง 15 พ.ค. ปีถัดไป
   ปีการศึกษา (พ.ศ.) = ปี ค.ศ. + 543 โดย
     ภาคเรียน 1 → ปี พ.ศ. ของวันที่นั้น
     ภาคเรียน 2 ที่เปิดในเดือน พ.ย.–ธ.ค. → ปี พ.ศ. ของปีนั้น
     ภาคเรียน 2 ที่ยังค้างมาถึง ม.ค.–พ.ค. → ปี พ.ศ. ของปีก่อน
   ── ต้องรันก่อน var currentYear ด้านล่าง เพื่อให้ window._defaultYear
      ถูกตั้งค่าก่อนถูกอ่านไปใช้ ──
─────────────────────────────────────────── */
(function() {
  var now   = new Date();
  var month = now.getMonth() + 1; /* 1–12 */
  var day   = now.getDate();
  var ceYear = now.getFullYear();
  var sem, thYear;
  /* ภาคเรียน 1: 16 พ.ค. – 31 ต.ค. */
  if ((month === 5 && day >= 16) || (month >= 6 && month <= 10)) {
    sem = 1;
    thYear = ceYear + 543;
  /* ภาคเรียน 2: 1 พ.ย. – 15 พ.ค. */
  } else if (month >= 11) {
    sem = 2;
    thYear = ceYear + 543;
  } else {
    /* ม.ค. – 15 พ.ค.: ยังอยู่ในภาค 2 ของปีการศึกษาก่อน */
    sem = 2;
    thYear = (ceYear - 1) + 543;
  }
  window._defaultYear = thYear;
  window._defaultSem  = sem;
})();

/* ══════════════════════ STATE ══════════════════════ */
/* ════════════════════════════════════════════
   TEACHER PORTFOLIO – portfolio-teacher.html
   Google Drive upload edition
   ════════════════════════════════════════════ */

/* ─── CONFIG ─── */
var DRIVE_FOLDER_ID = '1w_4UHb7dfGk-qNHzrle73d6FQnUBAtwG'; /* NP-Portfolios folder ใน Shared Drive */
var MAX_FILES_PER_TOPIC = 5;
var GOOGLE_CLIENT_ID = '275537025660-49nigfmsb17jf4ha8a2rmopv7qnpk2ej.apps.googleusercontent.com';
var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

var _sharedDriveId = null;

/* ─── 4 ฝ่ายบริหาร ─── */
var DEPARTMENTS = [
  { id:'academic',  label:'ฝ่ายวิชาการ',         icon:'graduation-cap', color:'#1d4ed8', bg:'#eff6ff' },
  { id:'budget',    label:'ฝ่ายงบประมาณ',        icon:'banknote',       color:'#16a34a', bg:'#f0fdf4' },
  { id:'personnel', label:'ฝ่ายบริหารงานบุคคล', icon:'users',          color:'#7c3aed', bg:'#f5f3ff' },
  { id:'general',   label:'ฝ่ายบริหารทั่วไป',   icon:'building-2',     color:'#ea580c', bg:'#fff7ed' },
];

/* DOCUMENT_TYPES โหลดจาก Firestore (portfolio_doc_types) — fallback hardcode ถ้า collection ว่าง */
var DOCUMENT_TYPES = [
  { id:'syllabus',         label:'Course Syllabus',                 icon:'file-text',  color:'#3b82f6', bg:'#eff6ff', department:'academic'  },
  { id:'lesson_plan',      label:'แผนการจัดการเรียนรู้',            icon:'book-open',  color:'#8b5cf6', bg:'#f5f3ff', department:'academic'  },
  { id:'sufficiency',      label:'แผนเศรษฐกิจพอเพียง',             icon:'leaf',       color:'#22c55e', bg:'#f0fdf4', department:'academic'  },
  { id:'royal_policy',     label:'แผนพระบรมราโชบาย',               icon:'crown',      color:'#f59e0b', bg:'#fffbeb', department:'academic'  },
  { id:'competency',       label:'แผนสมรรถนะ',                     icon:'zap',        color:'#ec4899', bg:'#fdf2f8', department:'academic'  },
  { id:'research',         label:'รายงานวิจัยในชั้นเรียน',          icon:'microscope', color:'#06b6d4', bg:'#ecfeff', department:'academic'  },
  { id:'student_analysis', label:'รายงานวิเคราะห์ผู้เรียนรายบุคคล', icon:'users',      color:'#f97316', bg:'#fff7ed', department:'academic'  },
  { id:'media_register',   label:'ทะเบียนสื่อ',                    icon:'library',    color:'#6366f1', bg:'#eef2ff', department:'academic'  },
  { id:'student_work',     label:'ผลงานนักเรียน',                   icon:'star',       color:'#eab308', bg:'#fefce8', department:'academic'  },
];
var _docTypesLoaded = false;
var _docTypesUnsubscribe = null;
var currentStaffData = null;

/* ── ข้อมูลผู้มีสิทธิ์ตามตำแหน่งจาก admins collection ── */
var adminRoles = {
  headOfGroup: {},        /* กลุ่มสาระ → { name, email } */
  assistantAcademic: null,/* { name, email } */
  deputyAcademic: null,   /* { name, email } */
  director: null          /* { name, email } */
};
var currentYear      = window._defaultYear || 2568;
var currentSem       = window._defaultSem  || 1;
/* submissions: key = docTypeId + '_' + courseCode → { id, files, courseCode, courseName, ... } */
var submissions      = {};
var currentDocId     = null;
/* courseRows: array of { code, name, files: File[], activeCourseKey: string|null } */
var courseRows       = [];
/* which course panel's file-input is active (for file picker) */
var activeUploadRowIdx = null;
var driveAccessToken = null;
var pendingDeleteInfo = null; /* { subKey, fileIndex } */
var tokenClient      = null;
var pendingReplaceInfo = null;

var pendingUploadCallback = null;

/* ─── DELETE WHOLE SUBMISSION ─── */
var pendingDeleteSubKey = null;

var _isUploading = false;

/* ══════════════════════ DATA LOADING ══════════════════════ */
function loadDocTypesFromFirestore(callback) {
  if (_docTypesUnsubscribe) { _docTypesUnsubscribe(); _docTypesUnsubscribe = null; }

  _docTypesUnsubscribe = db.collection('portfolio_doc_types')
    .orderBy('order')
    .onSnapshot(function(snap) {
      if (!snap.empty) {
        DOCUMENT_TYPES = [];
        snap.forEach(function(d) {
          var data = d.data();
          /* กรอง active ฝั่ง client เพื่อไม่ต้องใช้ composite index */
          if (data.active === false) return;
          DOCUMENT_TYPES.push({
            id:         data.id         || d.id,
            label:      data.label      || '',
            short:      data.short      || '',
            icon:       data.icon       || 'file',
            color:      data.color      || '#7c3aed',
            bg:         colorToBg(data.color || '#7c3aed'),
            department: data.department || 'academic',
          });
        });
      }
      if (!_docTypesLoaded) {
        _docTypesLoaded = true;
        if (callback) callback();
      } else {
        updateProgressTotal();
        renderDocList();
      }
    }, function(err) {
      console.warn('portfolio_doc_types snapshot error:', err);
      if (!_docTypesLoaded) {
        _docTypesLoaded = true;
        if (callback) callback();
      }
    });
}

function loadAdminRoles() {
  db.collection('admins').get().then(function(snap) {
    snap.forEach(function(doc) {
      var d     = doc.data();
      var p     = d.permissions || {};   /* permissions อยู่ใน sub-object */
      var name  = d.name  || '';
      var email = doc.id  || '';

      /* หัวหน้ากลุ่มสาระ
         - p.headOfGroup = true/false
         - d.headOfGroupSubject = ชื่อกลุ่มสาระ (เช่น "คณิตศาสตร์")
         - d.headOfGroupName    = ชื่อคน
         - d.headOfGroupEmail   = email */
      if (p.headOfGroup) {
        var grp = d.headOfGroupSubject || '';
        if (grp) {
          adminRoles.headOfGroup[grp] = {
            name:  d.headOfGroupName  || name,
            email: d.headOfGroupEmail || email
          };
        }
      }
      /* ผช.ผอ.วิชาการ */
      if (p.assistantDirectorAcademic && !adminRoles.assistantAcademic) {
        adminRoles.assistantAcademic = { name: name, email: email };
      }
      /* รอง ผอ.วิชาการ */
      if (p.deputyDirectorAcademic && !adminRoles.deputyAcademic) {
        adminRoles.deputyAcademic = { name: name, email: email };
      }
      /* ผู้อำนวยการ */
      if (p.director && !adminRoles.director) {
        adminRoles.director = { name: name, email: email };
      }
    });
  }).catch(function(e) {
    console.warn('loadAdminRoles error:', e);
  });
}

/* ─── LOAD SUBMISSIONS ─── */
function loadSubmissions() {
  if (!currentUser) return;
  var key = currentYear + '_' + currentSem;
  db.collection('portfolio_submissions')
    .where('uid', '==', currentUser.uid)
    .where('yearSem', '==', key)
    .get()
    .then(function(snap) {
      submissions = {};
      snap.forEach(function(d) {
        var data = d.data();
        /* support both old (single course) and new (multi-course) docs */
        var subKey = data.docTypeId + '_' + (data.courseCode || '');
        submissions[subKey] = Object.assign({ id: d.id }, data);
      });
      renderDocList();
    })
    .catch(function(e){ console.error(e); renderDocList(); });
}

/* โหลด memo กลับมาเติมใน form fields */
function loadMemoDocument(docTypeId, callback) {
  var memoId = getMemoDocId(docTypeId);
  db.collection('portfolio_memos').doc(memoId).get()
    .then(function(doc) {
      if (doc.exists) {
        var d = doc.data();
        if (document.getElementById('memoRef'))     document.getElementById('memoRef').value     = ''; /* ไม่โหลดค่าเก่า ให้ครูพิมพ์ใหม่ทุกครั้ง */
        if (document.getElementById('memoDate'))    document.getElementById('memoDate').value    = d.memoDate    || thaiDateToday();
        if (document.getElementById('memoSubject')) document.getElementById('memoSubject').value = d.memoSubject || '';
        if (document.getElementById('memoTo'))      document.getElementById('memoTo').value      = d.memoTo      || 'ผู้อำนวยการโรงเรียนหนองกี่พิทยาคม';
        if (document.getElementById('memoThrough')) document.getElementById('memoThrough').value = d.memoThrough || '';
        if (document.getElementById('memoBody'))    document.getElementById('memoBody').value    = d.memoBody    || '';
        /* โหลดลายเซ็น (ถ้ามี URL ที่บันทึกไว้) */
        window._loadedMemoSignatureURL = d.signatureURL || '';
      } else {
        /* memo ยังไม่มี — เติม default */
        if (document.getElementById('memoDate')) document.getElementById('memoDate').value = thaiDateToday();
        if (document.getElementById('memoTo'))   document.getElementById('memoTo').value   = 'ผู้อำนวยการโรงเรียนหนองกี่พิทยาคม';
        window._loadedMemoSignatureURL = '';
      }
      if (callback) callback();
    })
    .catch(function(e) {
      console.warn('[Memo] loadMemoDocument error:', e);
      if (callback) callback();
    });
}

/* ══════════════════════ RENDER ══════════════════════ */
 /* จะถูก set อัตโนมัติจาก folder metadata ครั้งแรกที่ใช้งาน */

/* ดึง driveId ของ Shared Drive จาก folder ID — cache ไว้ใช้ซ้ำ */
function getSharedDriveId() {
  if (_sharedDriveId) return Promise.resolve(_sharedDriveId);
  return fetch(
    'https://www.googleapis.com/drive/v3/files/' + DRIVE_FOLDER_ID +
    '?fields=driveId,name&supportsAllDrives=true',
    { headers: driveHeaders() }
  )
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.driveId) { _sharedDriveId = d.driveId; return d.driveId; }
    /* ไม่ใช่ Shared Drive — คืน null แล้วใช้โหมด regular folder */
    return null;
  });
}

/* ─── HELPERS ─── */
function sanitizeForFilename(str) {
  return String(str || '').replace(/[\/\\:*?"<>|]/g,'').replace(/\s+/g,'_').trim();
}

function colorToBg(hex) { return hex + '15'; } /* { subKey, fileIndex } */

/* ─── GOOGLE IDENTITY / DRIVE AUTH ─── */
function initGoogleAuth() {
  if (typeof google === 'undefined' || !google.accounts) return;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: function(response) {
      if (response.error) {
        showToast('ไม่สามารถเข้าถึง Google Drive ได้', 'error');
        return;
      }
      driveAccessToken = response.access_token;
      document.getElementById('driveAuthNotice').style.display = 'none';
      /* ถ้ามีไฟล์รอ ส่งต่อ */
      if (pendingUploadCallback) { pendingUploadCallback(); pendingUploadCallback = null; }
    }
  });
}
function authorizeDrive(callback) {
  pendingUploadCallback = callback || null;
  if (!tokenClient) { showToast('Google API ยังไม่พร้อม', 'error'); return; }
  tokenClient.requestAccessToken({ prompt: '' });
}
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStaffInfoBadge() {
  if (!currentStaffData) return;
  var el = document.getElementById('staffInfoBadge');
  if (!el) return;
  var name     = currentStaffData.name     || '';
  var position = currentStaffData.position || '';
  var group    = currentStaffData.group    || '';
  el.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
      '<div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid rgba(255,255,255,.35);">' +
        '<i data-lucide="user" style="width:18px;height:18px;color:white;"></i>' +
      '</div>' +
      '<div>' +
        '<p style="font-size:14px;font-weight:800;color:white;line-height:1.3;">' + esc2(name) + '</p>' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;">' +
          (position ? '<span style="font-size:11px;font-weight:700;color:rgba(255,255,255,.75);">' + esc2(position) + '</span>' : '') +
          (group    ? '<span style="font-size:10px;font-weight:800;padding:2px 8px;background:rgba(255,255,255,.2);color:white;border-radius:20px;border:1px solid rgba(255,255,255,.3);">' + esc2(group) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  lucide.createIcons();
  autoFillSubjectGroup(group);
}

function autoFillSubjectGroup(group) {
  var MAP = {
    'วิทยาศาสตร์':'วิทยาศาสตร์','เทคโนโลยี':'เทคโนโลยี','คณิตศาสตร์':'คณิตศาสตร์',
    'ภาษาไทย':'ภาษาไทย','สังคมศึกษา ศาสนา และวัฒนธรรม':'สังคมศึกษา ศาสนา และวัฒนธรรม',
    'สุขศึกษาและพลศึกษา':'สุขศึกษาและพลศึกษา','ภาษาต่างประเทศ':'ภาษาต่างประเทศ',
    'ศิลปะ':'ศิลปะ','การงานอาชีพ':'การงานอาชีพ','แนะแนว':'แนะแนว',
  };
  window._defaultSubjectGroup = MAP[group] || '';
}

/* ─── YEAR / SEM UI INIT ─── */
function initYearSemUI() {
  document.getElementById('yearLabel').textContent   = currentYear;
  document.getElementById('displayYear').textContent = currentYear;
  document.getElementById('displaySem').textContent  = 'ภาคเรียนที่ ' + currentSem;
  document.getElementById('semPill1').className = 'sem-pill' + (currentSem===1?' active':'');
  document.getElementById('semPill2').className = 'sem-pill' + (currentSem===2?' active':'');
}

/* ─── RENDER ─── */
function renderDocList() {
  var list = document.getElementById('docList');
  var submittedDocIds = new Set();
  var html = '';

  /* รวบรวม subKeys ที่ส่งแล้วในแต่ละ docType */
  var docCourses = {}; /* docTypeId → [ subKey, ... ] */
  Object.keys(submissions).forEach(function(subKey) {
    var sub = submissions[subKey];
    if (!docCourses[sub.docTypeId]) docCourses[sub.docTypeId] = [];
    docCourses[sub.docTypeId].push(subKey);
    submittedDocIds.add(sub.docTypeId);
  });

  /* จัดกลุ่มตามฝ่าย */
  var byDept = {};
  DEPARTMENTS.forEach(function(dep) { byDept[dep.id] = []; });

  var globalIdx = 0;
  DOCUMENT_TYPES.forEach(function(dt) {
    globalIdx++;
    var deptId = dt.department || 'academic';
    if (!byDept[deptId]) byDept[deptId] = [];
    byDept[deptId].push({ dt: dt, idx: globalIdx });
  });

  /* วนแต่ละฝ่าย */
  DEPARTMENTS.forEach(function(dep) {
    var items = byDept[dep.id] || [];
    if (!items.length) return; /* ข้ามฝ่ายที่ไม่มีงาน */

    /* หัวข้อฝ่าย */
    html +=
      '<div style="display:flex;align-items:center;gap:10px;margin:18px 0 10px;">' +
        '<div style="width:32px;height:32px;border-radius:9px;background:' + dep.bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
          '<i data-lucide="' + dep.icon + '" style="width:16px;height:16px;color:' + dep.color + ';"></i>' +
        '</div>' +
        '<span style="font-size:14px;font-weight:800;color:var(--text-dark);">' + dep.label + '</span>' +
        '<div style="flex:1;height:1px;background:var(--border);"></div>' +
        '<span style="font-size:11px;font-weight:700;color:var(--text3);">' + items.length + ' รายการ</span>' +
      '</div>';

    /* รายการงานในฝ่ายนี้ */
    items.forEach(function(entry) {
      var dt      = entry.dt;
      var idx     = entry.idx;
      var courses = docCourses[dt.id] || [];
      var hasAny  = courses.length > 0;

      var statusLabel, statusBg, statusColor;
      if (!hasAny) {
        statusLabel = 'ยังไม่ส่ง'; statusBg = '#f1f5f9'; statusColor = '#94a3b8';
      } else {
        var allReviewed  = courses.every(function(k){ return ['head_reviewed','reviewed','assistant_reviewed','deputy_reviewed','final_approved'].indexOf(submissions[k].status||'submitted') >= 0; });
        var anyRevision  = courses.some(function(k){ return (submissions[k].status||'submitted') === 'revision'; });
        var allFinal     = courses.every(function(k){ return (submissions[k].status||'submitted') === 'final_approved'; });
        if (anyRevision) {
          statusLabel = 'มีรายวิชาแก้ไข'; statusBg = '#fef9c3'; statusColor = '#92400e';
        } else if (allFinal) {
          statusLabel = 'ผอ.อนุมัติครบทุกวิชา'; statusBg = '#d1fae5'; statusColor = '#065f46';
        } else if (allReviewed) {
          statusLabel = 'อยู่ระหว่างตรวจสอบ'; statusBg = '#dbeafe'; statusColor = '#1e40af';
        } else {
          statusLabel = 'ส่งแล้ว ' + courses.length + ' วิชา'; statusBg = '#dcfce7'; statusColor = '#15803d';
        }
      }

      var borderColor = !hasAny ? '#e2e8f0' : courses.some(function(k){ return (submissions[k].status||'') === 'revision'; }) ? '#f59e0b' : '#22c55e';

      html +=
        '<div style="background:white;border:1.5px solid ' + borderColor + ';border-left:4px solid ' + borderColor + ';border-radius:14px;padding:16px 18px;transition:all .2s;">' +
          '<div style="display:flex;align-items:flex-start;gap:14px;">' +
            '<div class="doc-icon" style="background:' + dt.bg + ';flex-shrink:0;">' +
              '<i data-lucide="' + dt.icon + '" style="width:20px;height:20px;color:' + dt.color + ';"></i>' +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                '<p style="font-size:14px;font-weight:800;color:var(--text-dark);">' + idx + '. ' + dt.label + '</p>' +
                '<span style="padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;background:' + statusBg + ';color:' + statusColor + ';">' + statusLabel + '</span>' +
              '</div>' +

              /* รายวิชาย่อย */
              (hasAny
                ? '<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">' +
                    courses.map(function(subKey) {
                      var sub     = submissions[subKey];
                      var status  = sub.status || 'submitted';
                      var slabel  = { submitted:'ส่งแล้ว', reviewed:'หัวหน้าฯ ตรวจ', head_reviewed:'หัวหน้าฯ ตรวจ', assistant_reviewed:'ผช.ผอ. ตรวจ', deputy_reviewed:'รอง ผอ. ตรวจ', final_approved:'ผอ.อนุมัติ', revision:'แก้ไข' }[status] || 'ส่งแล้ว';
                      var sbg     = { submitted:'#dcfce7', reviewed:'#e0f2fe', head_reviewed:'#e0f2fe', assistant_reviewed:'#fef3c7', deputy_reviewed:'#ede9fe', final_approved:'#d1fae5', revision:'#fef9c3' }[status] || '#dcfce7';
                      var scol    = { submitted:'#15803d', reviewed:'#0369a1', head_reviewed:'#0369a1', assistant_reviewed:'#92400e', deputy_reviewed:'#6d28d9', final_approved:'#065f46', revision:'#92400e' }[status] || '#15803d';
                      var files   = sub.files || [];
                      return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 12px;">' +
                        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                          '<span style="font-size:12px;font-weight:800;color:var(--accent);background:var(--accent-tint);padding:2px 8px;border-radius:6px;">' + esc2(sub.courseCode) + '</span>' +
                          '<span style="font-size:12px;font-weight:600;color:var(--text);">' + esc2(sub.courseName) + '</span>' +
                          '<span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:' + sbg + ';color:' + scol + ';">' + slabel + '</span>' +
                          '<span style="font-size:10px;font-weight:800;color:var(--text2);background:var(--bg-alt);padding:2px 8px;border-radius:10px;">' + files.length + '/' + MAX_FILES_PER_TOPIC + ' ไฟล์</span>' +
                        '</div>' +
                        (sub.note ? '<p style="font-size:11px;color:var(--text3);margin-top:4px;">· ' + esc2(sub.note) + '</p>' : '') +
                        (status === 'revision' && sub.adminNote
                          ? '<div style="margin-top:4px;padding:5px 8px;background:var(--amber-light);border-radius:6px;border:1px solid var(--amber-mid);"><p style="font-size:11px;color:var(--amber-dark);font-weight:700;">💬 ' + esc2(sub.adminNote) + '</p></div>'
                          : '') +
                        '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;">' +
                          '<button onclick="openManageCourseModal(\'' + esc(dt.id) + '\',\'' + esc(subKey) + '\')" style="padding:5px 12px;background:var(--bg);color:var(--text-mid);border-radius:8px;font-size:11px;font-weight:700;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;gap:4px;">' +
                            '<i data-lucide="pencil" style="width:11px;height:11px;"></i> จัดการไฟล์' +
                          '</button>' +
                          '<button onclick="openMemoModal(\'' + esc(subKey) + '\')" style="padding:5px 12px;background:var(--accent-tint);color:var(--accent);border-radius:8px;font-size:11px;font-weight:700;border:1px solid var(--accent-light);cursor:pointer;display:flex;align-items:center;gap:4px;">' +
                            '<i data-lucide="file-text" style="width:11px;height:11px;"></i> บันทึกข้อความ' +
                          '</button>' +
                          '<button onclick="promptDeleteSubmission(\'' + esc(subKey) + '\')" style="padding:5px 12px;background:#fff0f0;color:var(--red);border-radius:8px;font-size:11px;font-weight:700;border:1px solid var(--red-mid);cursor:pointer;display:flex;align-items:center;gap:4px;" title="ลบงานที่ส่งนี้ทั้งหมด">' +
                            '<i data-lucide="trash-2" style="width:11px;height:11px;"></i> ลบงาน' +
                          '</button>' +
                        '</div>' +
                      '</div>';
                    }).join('') +
                  '</div>'
                : '<p style="font-size:11px;color:var(--text3);margin-top:3px;">ยังไม่มีการส่งงาน</p>'
              ) +
            '</div>' +
            '<div style="flex-shrink:0;">' +
              '<button onclick="openUploadModal(\'' + dt.id + '\')" class="btn-primary" style="padding:7px 14px;border-radius:8px;font-size:12px;white-space:nowrap;">' +
                '<i data-lucide="plus" style="width:12px;height:12px;"></i>' +
                (hasAny ? 'เพิ่มวิชา' : 'ส่งงาน') +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
  });

  list.innerHTML = html;

  var total = DOCUMENT_TYPES.length;
  var submittedCount = submittedDocIds.size;
  var pct = total ? Math.round((submittedCount / total) * 100) : 0;
  document.getElementById('progressBar').style.width    = pct + '%';
  document.getElementById('progressText').textContent   = submittedCount + ' / ' + total + ' รายการ';
  lucide.createIcons();
}

function renderCourseRows() {
  var container = document.getElementById('courseRowsContainer');
  var html = '';
  courseRows.forEach(function(row, idx) {
    html +=
      '<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:12px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
          '<span style="font-size:12px;font-weight:800;color:var(--text2);background:var(--border);padding:2px 8px;border-radius:6px;">วิชาที่ ' + (idx+1) + '</span>' +
          (courseRows.length > 1
            ? '<button onclick="removeCourseRow(' + idx + ')" style="margin-left:auto;padding:3px 8px;background:var(--red-light);color:var(--red);border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">ลบ</button>'
            : '') +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-bottom:8px;">' +
          '<input type="text" placeholder="รหัสวิชา เช่น ว31101" maxlength="20" value="' + esc2(row.code) + '" onchange="courseRows[' + idx + '].code=this.value.trim()" style="font-size:13px;">' +
          '<input type="text" placeholder="ชื่อวิชา เช่น ฟิสิกส์ 1" value="' + esc2(row.name) + '" onchange="courseRows[' + idx + '].name=this.value.trim()" style="font-size:13px;">' +
        '</div>' +
        /* upload zone สำหรับวิชานี้ */
        '<div style="border:2px dashed var(--accent-light);border-radius:10px;padding:14px;text-align:center;cursor:pointer;background:#f8faff;transition:all .2s;" onclick="triggerFileInput(' + idx + ')" id="zone_' + idx + '">' +
          '<i data-lucide="file-up" style="width:22px;height:22px;color:var(--accent-light);margin-bottom:4px;"></i>' +
          '<p style="font-size:12px;font-weight:700;color:var(--accent);">คลิกเพื่อเพิ่ม PDF</p>' +
          '<p style="font-size:10px;color:var(--text3);margin-top:2px;">สูงสุด ' + MAX_FILES_PER_TOPIC + ' ไฟล์, PDF, 20MB</p>' +
        '</div>' +
        '<div id="queued_' + idx + '" style="margin-top:6px;display:flex;flex-direction:column;gap:4px;"></div>' +
      '</div>';
  });
  container.innerHTML = html;
  lucide.createIcons();
  /* re-render queued files */
  courseRows.forEach(function(_, i){ renderCourseQueuedFiles(i); });
}

function renderCourseFilePanels() {
  var panels = document.getElementById('courseFilePanels');
  var html = '';
  courseRows.forEach(function(row, idx) {
    var subKey = row.managingSubKey;
    var sub    = subKey ? submissions[subKey] : null;
    var files  = sub ? (sub.files || []) : [];
    var canAdd = files.length < MAX_FILES_PER_TOPIC;
    html +=
      '<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:12px;padding:14px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
          '<span style="font-size:13px;font-weight:800;color:var(--accent);background:var(--accent-tint);padding:3px 10px;border-radius:8px;">' + esc2(sub ? sub.courseCode : '') + '</span>' +
          '<span style="font-size:13px;font-weight:700;color:var(--text);">' + esc2(sub ? sub.courseName : '') + '</span>' +
          '<span style="font-size:11px;font-weight:800;color:var(--text2);background:var(--bg-alt);padding:2px 8px;border-radius:10px;margin-left:auto;">' + files.length + '/' + MAX_FILES_PER_TOPIC + ' ไฟล์</span>' +
        '</div>' +
        '<div id="existFileList_' + idx + '">' +
          files.map(function(f, fi) {
            return '<div class="file-entry" id="ef_' + idx + '_' + fi + '">' +
              '<i data-lucide="file-text" style="width:16px;height:16px;color:var(--blue-bright);flex-shrink:0;"></i>' +
              '<span class="file-slot-badge">' + (fi+1) + '</span>' +
              '<span class="file-entry-name" title="' + esc2(f.fileName) + '">' + esc2(f.fileName) + '</span>' +
              '<a href="' + esc2(f.fileUrl) + '" target="_blank" class="file-entry-link"><i data-lucide="external-link" style="width:14px;height:14px;"></i></a>' +
              '<button class="file-entry-replace" onclick="toggleManageReplaceZone(\'' + esc(subKey) + '\',' + fi + ',' + idx + ')" title="แทนที่"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
              '<button class="file-entry-del" onclick="promptDeleteFile(\'' + esc(subKey) + '\',' + fi + ')" title="ลบ"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
            '</div>' +
            '<div id="mReplaceZone_' + idx + '_' + fi + '" style="display:none;margin-bottom:6px;">' +
              '<div class="replace-zone" onclick="triggerManageReplace(\'' + esc(subKey) + '\',' + fi + ')">' +
                '<i data-lucide="upload-cloud" style="width:18px;height:18px;color:var(--accent-warn);margin-bottom:3px;"></i>' +
                '<p style="font-size:12px;font-weight:700;color:var(--role-director-color);">คลิกเพื่อเลือก PDF ใหม่แทนไฟล์ที่ ' + (fi+1) + '</p>' +
              '</div>' +
              '<div id="mReplaceProgress_' + idx + '_' + fi + '" style="display:none;margin-top:6px;">' +
                '<div class="pbar-bg"><div id="mReplaceBar_' + idx + '_' + fi + '" class="pbar-fill" style="width:0%;background:linear-gradient(90deg,var(--accent-warn),#fbbf24);"></div></div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        (canAdd
          ? '<div style="border:2px dashed var(--accent-light);border-radius:10px;padding:12px;text-align:center;cursor:pointer;background:#f8faff;margin-top:8px;" onclick="triggerFileInput(' + idx + ')">' +
              '<p style="font-size:12px;font-weight:700;color:var(--accent);">+ เพิ่มไฟล์ PDF</p>' +
            '</div>' +
            '<div id="queued_' + idx + '" style="margin-top:6px;display:flex;flex-direction:column;gap:4px;"></div>'
          : '<p style="font-size:11px;color:var(--text3);margin-top:6px;text-align:center;">ครบ ' + MAX_FILES_PER_TOPIC + ' ไฟล์แล้ว</p>'
        ) +
      '</div>';
  });
  panels.innerHTML = html;
  lucide.createIcons();
}

/* ─── FILE INPUT TRIGGER ─── */
function triggerFileInput(rowIdx) {
  activeUploadRowIdx = rowIdx;
  var inp = document.getElementById('fileInput');
  inp.value = '';
  inp.click();
}

function onFileSelected(input) {
  if (activeUploadRowIdx === null) return;
  var idx = activeUploadRowIdx;
  addFilesToRow(idx, Array.from(input.files));
  input.value = '';
}

function renderCourseQueuedFiles(rowIdx) {
  var container = document.getElementById('queued_' + rowIdx);
  if (!container) return;
  var row = courseRows[rowIdx];
  if (!row || row.files.length === 0) { container.innerHTML = ''; return; }
  var html = '';
  row.files.forEach(function(f, i) {
    html +=
      '<div class="file-entry">' +
        '<i data-lucide="file-text" style="width:15px;height:15px;color:var(--emerald);flex-shrink:0;"></i>' +
        '<span class="file-entry-name">' + esc2(f.name) + '</span>' +
        '<span class="file-entry-status">' + (f.size/1024/1024).toFixed(1) + 'MB</span>' +
        '<button class="file-entry-del" onclick="removeCourseFile(' + rowIdx + ',' + i + ')" aria-label="ลบไฟล์"><i data-lucide="x" style="width:13px;height:13px;"></i></button>' +
      '</div>';
  });
  container.innerHTML = html;
  lucide.createIcons();
}

/* ─── MANAGE REPLACE ─── */
function triggerManageReplace(subKey, fileIndex) {
  pendingReplaceInfo = { subKey: subKey, fileIndex: fileIndex };
  document.getElementById('replaceFileInput').value = '';
  document.getElementById('replaceFileInput').click();
}

function onReplaceFileSelected(input) {
  if (!input.files[0] || !pendingReplaceInfo) return;
  var file = input.files[0];
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    showToast('รองรับเฉพาะ PDF', 'error'); return;
  }
  if (file.size > 20*1024*1024) { showToast('เกิน 20MB', 'error'); return; }
  doReplaceFile(pendingReplaceInfo.subKey, pendingReplaceInfo.fileIndex, file);
  pendingReplaceInfo = null;
}

function doReplaceFile(subKey, fileIndex, newFile) {
  var sub = submissions[subKey];
  if (!sub || !sub.files || !sub.files[fileIndex]) return;
  var oldFile  = sub.files[fileIndex];
  var dt       = DOCUMENT_TYPES.find(function(d){ return d.id === currentDocId; });

  function proceed() {
    if (oldFile.fileId) {
      /* ── PATCH: อัปโหลดเนื้อหาใหม่ทับไฟล์เดิมใน Drive (fileId/link ไม่เปลี่ยน) ── */
      showToast('กำลังบันทึกทับไฟล์เดิม...', 'info');
      overwriteFileToDrive(oldFile.fileId, newFile)
      .then(function() {
        /* Firestore: แค่อัปเดต timestamp (fileId/fileName/fileUrl คงเดิม) */
        var updatedFiles = sub.files.slice();
        return db.collection('portfolio_submissions').doc(sub.id).update({
          files: updatedFiles,
          resubmittedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      })
      .then(function() {
        showToast('บันทึกทับไฟล์เดิมสำเร็จ ✓', 'success');
        closeUploadModal(); loadSubmissions();
      })
      .catch(function(e){ showToast('แทนที่ไม่สำเร็จ: ' + (e.message||e), 'error'); });
    } else {
      /* fallback: ไฟล์เก่าไม่มี fileId → อัปโหลดใหม่ปกติ */
      var staffName    = (currentStaffData && currentStaffData.name) || currentUser.displayName || '';
      var subjectGroup = document.getElementById('subjectGroup').value.trim() || sub.subjectGroup || '';
      var newName = sanitizeForFilename(subjectGroup) + '_' +
                    sanitizeForFilename(sub.courseCode || '') + '_' +
                    sanitizeForFilename(staffName) + '_' +
                    sanitizeForFilename(dt.label) + '_' +
                    (fileIndex + 1) + '.pdf';
      var yearFolderName = 'ปีการศึกษา ' + currentYear;
      var semFolderName  = 'ภาคเรียนที่ ' + currentSem;
      var docFolderName  = dt.label;
      ensureDriveFolder(DRIVE_FOLDER_ID, yearFolderName)
      .then(function(yId){ return ensureDriveFolder(yId, semFolderName); })
      .then(function(sId){ return ensureDriveFolder(sId, docFolderName); })
      .then(function(fId){ return uploadFileToDrive(newFile, newName, fId, null); })
      .then(function(result) {
        var updatedFiles = sub.files.slice();
        updatedFiles[fileIndex] = { fileId: result.id, fileName: newName, fileUrl: 'https://drive.google.com/file/d/' + result.id + '/view' };
        return db.collection('portfolio_submissions').doc(sub.id).update({
          files: updatedFiles,
          fileUrl: updatedFiles[0] ? updatedFiles[0].fileUrl : '',
          resubmittedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      })
      .then(function() {
        showToast('แทนที่ไฟล์สำเร็จ ✓', 'success');
        closeUploadModal(); loadSubmissions();
      })
      .catch(function(e){ showToast('แทนที่ไม่สำเร็จ: ' + (e.message||e), 'error'); });
    }
  }

  if (!driveAccessToken) authorizeDrive(proceed); else proceed();
}

/* ── PATCH: เขียนทับเนื้อหาไฟล์เดิมใน Drive โดยไม่เปลี่ยน fileId ── */
function overwriteFileToDrive(fileId, file) {
  return new Promise(function(resolve, reject) {
    var form = new FormData();
    form.append('file', file);
    var xhr = new XMLHttpRequest();
    xhr.open('PATCH',
      'https://www.googleapis.com/upload/drive/v3/files/' + fileId +
      '?uploadType=media&supportsAllDrives=true',
      true
    );
    xhr.setRequestHeader('Authorization', 'Bearer ' + driveAccessToken);
    xhr.onload = function() {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
      else reject(new Error('HTTP ' + xhr.status + ': ' + xhr.responseText));
    };
    xhr.onerror = function() { reject(new Error('Network error')); };
    xhr.send(file); /* ส่ง raw file (ไม่ต้อง FormData สำหรับ media upload) */
  });
}

/* ─── GOOGLE DRIVE FOLDER STRUCTURE ─── */
/*
  NP-Portfolios (DRIVE_FOLDER_ID) ใน Shared Drive NP-Webapp > กลุ่มวิชาการ
  └── ปีการศึกษา YYYY
      └── ภาคเรียนที่ N
          └── docType.label
              └── กลุ่มสาระ_ชื่อคนส่ง_ชื่องาน_ลำดับ.pdf
*/

function driveHeaders() {
  return { 'Authorization': 'Bearer ' + driveAccessToken };
}
function driveJsonHeaders() {
  return { 'Authorization': 'Bearer ' + driveAccessToken, 'Content-Type': 'application/json' };
}

function ensureDriveFolder(parentId, folderName) {
  return getSharedDriveId().then(function(driveId) {
    var query = "mimeType='application/vnd.google-apps.folder'" +
      " and name='" + folderName.replace(/'/g,"\\'") + "'" +
      " and '" + parentId + "' in parents" +
      " and trashed=false";

    /* สร้าง URL สำหรับ list — ถ้าเป็น Shared Drive ต้องใส่ driveId + corpora=drive */
    var listUrl = 'https://www.googleapis.com/drive/v3/files' +
      '?q=' + encodeURIComponent(query) +
      '&fields=files(id,name)' +
      '&supportsAllDrives=true&includeItemsFromAllDrives=true' +
      (driveId ? '&driveId=' + driveId + '&corpora=drive' : '');

    return fetch(listUrl, { headers: driveHeaders() })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.files && data.files.length > 0) return data.files[0].id;

        /* สร้างโฟลเดอร์ใหม่ */
        var body = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        };
        /* Shared Drive ต้องการ driveId ใน body ด้วย */
        if (driveId) body.driveId = driveId;

        return fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
          method: 'POST',
          headers: driveJsonHeaders(),
          body: JSON.stringify(body)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (!d.id) throw new Error('สร้างโฟลเดอร์ไม่สำเร็จ: ' + JSON.stringify(d));
          return d.id;
        });
      });
  });
}

/* ─── UPLOAD ALL COURSE ROWS (add mode) ─── */
function uploadAllCourseRows(rowsToSubmit, subjectGroup, note, btn) {
  var dt        = DOCUMENT_TYPES.find(function(d){ return d.id === currentDocId; });
  var staffName = (currentStaffData && currentStaffData.name) || currentUser.displayName || '';
  var yearFolderName = 'ปีการศึกษา ' + currentYear;
  var semFolderName  = 'ภาคเรียนที่ ' + currentSem;
  var docFolderName  = dt.label;

  var progressEl  = document.getElementById('uploadProgress');
  var progressBar = document.getElementById('uploadBar');
  var progressPct = document.getElementById('uploadPct');
  var progressLbl = document.getElementById('uploadProgressLabel');
  progressEl.style.display = 'block';
  progressBar.style.width  = '0%';

  /* หาโฟลเดอร์ก่อน แล้วอัปโหลดทีละวิชา */
  ensureDriveFolder(DRIVE_FOLDER_ID, yearFolderName)
  .then(function(yId){ return ensureDriveFolder(yId, semFolderName); })
  .then(function(sId){ return ensureDriveFolder(sId, docFolderName); })
  .then(function(docFolderId) {
    /* อัปโหลดทีละ row */
    function processRow(rowIdx) {
      if (rowIdx >= rowsToSubmit.length) return Promise.resolve();
      var row = rowsToSubmit[rowIdx];
      var uploadedFiles = [];
      function uploadNext(fi) {
        if (fi >= row.files.length) return Promise.resolve(uploadedFiles);
        var file    = row.files[fi];
        var fileNum = fi + 1;
        /* ชื่อไฟล์: กลุ่มสาระ_รหัสวิชา_ชื่อคนส่ง_ชื่องาน_ลำดับ.pdf */
        var newName = sanitizeForFilename(subjectGroup) + '_' +
                      sanitizeForFilename(row.code)     + '_' +
                      sanitizeForFilename(staffName)    + '_' +
                      sanitizeForFilename(dt.label)     + '_' +
                      fileNum + '.pdf';
        progressLbl.textContent = '[' + row.code + '] อัปโหลด ' + fileNum + '/' + row.files.length + ' – ' + newName;
        return uploadFileToDrive(file, newName, docFolderId, function(pct) {
          var overall = Math.round(((rowIdx / rowsToSubmit.length) + ((fi + pct/100) / row.files.length / rowsToSubmit.length)) * 100);
          progressBar.style.width = overall + '%';
          progressPct.textContent = overall + '%';
        })
        .then(function(result) {
          uploadedFiles.push({ fileId: result.id, fileName: newName, fileUrl: 'https://drive.google.com/file/d/' + result.id + '/view' });
          return uploadNext(fi + 1);
        });
      }
      return uploadNext(0).then(function(files) {
        return uploadSignatureToStorage(currentUser.uid, row.code, currentDocId)
          .then(function(sigURL) {
            return saveCourseSubmission(files, note, subjectGroup, row.code, row.name, sigURL);
          });
      }).then(function() {
        return processRow(rowIdx + 1);
      });
    }
    /* capture dataURL ก่อนเริ่ม loop (canvas อาจถูก reset ทีหลัง) */
    var _capturedSigDataURL = (typeof getSignatureDataURL === 'function' && !isSignatureEmpty())
      ? getSignatureDataURL() : '';

    return processRow(0).then(function() {
      /* บันทึก memo แบบ shared — อัปโหลดลายเซ็นที่ capture ไว้ก่อนหน้า */
      return uploadDataURLToStorage(_capturedSigDataURL, currentUser.uid, dt.id)
        .then(function(sigURL) {
          return saveMemoDocument(sigURL, dt.id);
        })
        .catch(function(e) { console.warn('[Memo] saveMemoDocument error:', e); });
    });
  })
  .then(function() {
    showToast('ส่งงานสำเร็จ ✓', 'success');
    closeUploadModal(); loadSubmissions();
    resetBtn(btn); progressEl.style.display = 'none';
    _isUploading = false;
  })
  .catch(function(e) {
    console.error(e);
    showToast('อัปโหลดไม่สำเร็จ: ' + (e.message || e), 'error');
    resetBtn(btn); progressEl.style.display = 'none';
    _isUploading = false;
  });
}

/* ─── UPLOAD MANAGE FILES (add files to existing course submission) ─── */
function uploadManageFiles(subKey, newFiles, subjectGroup, note, btn) {
  var sub       = submissions[subKey];
  var dt        = DOCUMENT_TYPES.find(function(d){ return d.id === currentDocId; });
  var staffName = (currentStaffData && currentStaffData.name) || currentUser.displayName || '';
  var existingFiles = sub ? (sub.files || []) : [];
  var startIndex = existingFiles.length;

  var yearFolderName = 'ปีการศึกษา ' + currentYear;
  var semFolderName  = 'ภาคเรียนที่ ' + currentSem;
  var docFolderName  = dt.label;

  var progressEl  = document.getElementById('uploadProgress');
  var progressBar = document.getElementById('uploadBar');
  var progressPct = document.getElementById('uploadPct');
  var progressLbl = document.getElementById('uploadProgressLabel');
  progressEl.style.display = 'block';
  progressBar.style.width  = '0%';

  ensureDriveFolder(DRIVE_FOLDER_ID, yearFolderName)
  .then(function(yId){ return ensureDriveFolder(yId, semFolderName); })
  .then(function(sId){ return ensureDriveFolder(sId, docFolderName); })
  .then(function(docFolderId) {
    var uploadedFiles = [];
    function uploadNext(idx) {
      if (idx >= newFiles.length) return Promise.resolve(uploadedFiles);
      var file    = newFiles[idx];
      var fileNum = startIndex + idx + 1;
      var newName = sanitizeForFilename(subjectGroup) + '_' +
                    sanitizeForFilename(sub ? sub.courseCode : '') + '_' +
                    sanitizeForFilename(staffName) + '_' +
                    sanitizeForFilename(dt.label) + '_' +
                    fileNum + '.pdf';
      progressLbl.textContent = 'กำลังอัปโหลด ' + (idx+1) + '/' + newFiles.length;
      return uploadFileToDrive(file, newName, docFolderId, function(pct){
        progressBar.style.width = pct + '%';
        progressPct.textContent = pct + '%';
      })
      .then(function(result) {
        uploadedFiles.push({ fileId: result.id, fileName: newName, fileUrl: 'https://drive.google.com/file/d/' + result.id + '/view' });
        return uploadNext(idx + 1);
      });
    }
    var _capturedSigDataURL = (typeof getSignatureDataURL === 'function' && !isSignatureEmpty())
      ? getSignatureDataURL() : '';
    return uploadNext(0);
  })
  .then(function(uploaded) {
    var allFiles = existingFiles.concat(uploaded);
    /* บันทึก memo shared document ด้วยลายเซ็นที่ capture ไว้ */
    uploadDataURLToStorage(_capturedSigDataURL, currentUser.uid, currentDocId)
      .then(function(sigURL) {
        saveMemoDocument(sigURL, currentDocId).catch(function(e){ console.warn('[Memo] save error:', e); });
      });
    var updateData = {
      files: allFiles,
      fileUrl: allFiles[0] ? allFiles[0].fileUrl : '',
      subjectGroup: subjectGroup,
      note: note,
      resubmittedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    return db.collection('portfolio_submissions').doc(sub.id).update(updateData);
  })
  .then(function() {
    showToast('เพิ่มไฟล์สำเร็จ ✓', 'success');
    closeUploadModal(); loadSubmissions();
    resetBtn(btn); progressEl.style.display = 'none';
  })
  .catch(function(e) {
    showToast('อัปโหลดไม่สำเร็จ: ' + (e.message||e), 'error');
    resetBtn(btn); progressEl.style.display = 'none';
  });
}

/* อัปโหลด dataURL ที่ capture ไว้แล้วไปยัง Storage — ไม่อ่าน canvas ใหม่ */
function uploadDataURLToStorage(dataURL, uid, docTypeId) {
  return new Promise(function(resolve) {
    if (!dataURL || dataURL.indexOf(',') === -1) { resolve(''); return; }
    if (typeof firebase === 'undefined' || typeof firebase.storage !== 'function') { resolve(''); return; }
    try {
      var byteString = atob(dataURL.split(',')[1]);
      var mimeType   = dataURL.split(',')[0].split(':')[1].split(';')[0];
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      var blob = new Blob([ab], { type: mimeType });
      /* path คงที่ — อัปโหลดทับได้ ไม่สะสมไฟล์เก่า */
      var path = 'signatures/' + currentYear + '/' + uid + '/memo_' + docTypeId + '.png';
      var uploadTask = firebase.storage().ref(path).put(blob, { contentType: 'image/png' });
      uploadTask.on('state_changed',
        null,
        function(err) { console.warn('[MemoSig] upload error:', err.code); resolve(''); },
        function() {
          uploadTask.snapshot.ref.getDownloadURL()
            .then(function(url) { resolve(url); })
            .catch(function(e) { console.warn('[MemoSig] getDownloadURL error:', e); resolve(''); });
        }
      );
    } catch(e) { console.warn('[MemoSig] dataURL error:', e); resolve(''); }
  });
}

/* ─── UPLOAD SIGNATURE TO FIREBASE STORAGE ─── */
function uploadSignatureToStorage(uid, courseCode, docTypeId) {
  return new Promise(function(resolve, reject) {
    if (typeof getSignatureDataURL !== 'function' || isSignatureEmpty()) {
      resolve(''); return;
    }

    /* ตรวจว่า Firebase Storage พร้อมใช้งาน */
    if (typeof firebase === 'undefined' || typeof firebase.storage !== 'function') {
      console.warn('Firebase Storage SDK ไม่พร้อม — ข้ามการอัปโหลดลายเซ็น');
      resolve(''); return;
    }

    var dataURL = getSignatureDataURL();
    if (!dataURL || dataURL.indexOf(',') === -1) { resolve(''); return; }

    /* แปลง dataURL → Blob */
    try {
      var byteString = atob(dataURL.split(',')[1]);
      var mimeType   = dataURL.split(',')[0].split(':')[1].split(';')[0];
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      var blob = new Blob([ab], { type: mimeType });

      /* path: signatures/{year}/{uid}/{docTypeId}_{courseCode}_{timestamp}.png */
      var ts   = Date.now();
      var path = 'signatures/' + currentYear + '/' + uid + '/' + docTypeId + '_' + sanitizeForFilename(courseCode) + '_' + ts + '.png';

      console.log('[Signature] กำลังอัปโหลดไปที่:', path);

      var storageRef = firebase.storage().ref(path);
      var uploadTask = storageRef.put(blob, { contentType: 'image/png' });

      uploadTask.on('state_changed',
        function(snapshot) {
          var pct = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100);
          console.log('[Signature] อัปโหลด ' + pct + '%');
        },
        function(err) {
          console.error('[Signature] อัปโหลดไม่สำเร็จ:', err.code, err.message);
          /* ถ้า Storage error → ไม่หยุดการส่งงาน resolve เป็น '' แทน */
          resolve('');
        },
        function() {
          uploadTask.snapshot.ref.getDownloadURL().then(function(url) {
            console.log('[Signature] อัปโหลดสำเร็จ:', url);
            resolve(url);
          }).catch(function(err) {
            console.error('[Signature] getDownloadURL error:', err);
            resolve('');
          });
        }
      );
    } catch(e) {
      console.error('[Signature] แปลง dataURL ไม่สำเร็จ:', e);
      resolve('');
    }
  });
}

function uploadFileToDrive(file, fileName, folderId, onProgress) {
  return new Promise(function(resolve, reject) {
    var metadata = { name: fileName, parents: [folderId] };
    var form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    var xhr = new XMLHttpRequest();
    xhr.open('POST',
      'https://www.googleapis.com/upload/drive/v3/files' +
      '?uploadType=multipart&fields=id,name&supportsAllDrives=true',
      true
    );
    xhr.setRequestHeader('Authorization', 'Bearer ' + driveAccessToken);
    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100));
    };
    xhr.onload = function() {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error('HTTP ' + xhr.status + ': ' + xhr.responseText));
      }
    };
    xhr.onerror = function() { reject(new Error('Network error')); };
    xhr.send(form);
  });
}

/* ════════════════════════════════════════════
   SHARED MEMO DOCUMENT — portfolio_memos
   key: {uid}_{docTypeId}_{year}_{sem}
   ทั้งครูและ admin อ่าน/เขียน doc เดียวกัน
   ════════════════════════════════════════════ */

function getMemoDocId(docTypeId) {
  var dt = docTypeId || currentDocId || '';
  return currentUser.uid + '_' + dt + '_' + currentYear + '_' + currentSem;
}

/* ─── THAI DATE ─── */
function toThaiNumerals(str) {
  return String(str).replace(/[0-9]/g, function(d) {
    return '๐๑๒๓๔๕๖๗๘๙'[parseInt(d)];
  });
}

/* แปลงข้อความ (แบ่งด้วย \n) เป็น <p> หลายย่อหน้า
   - บรรทัดแรกของแต่ละย่อหน้า: indent 1.5cm
   - บรรทัด wrap ถัดไปชิดซ้าย (ไม่ indent) */
function renderMemoBody(container, text) {
  if (!container) return;
  container.innerHTML = '';
  var paragraphs = String(text || '').split('\n');
  paragraphs.forEach(function(para) {
    var p = document.createElement('p');
    /* hanging indent: text-indent ลบ padding-left ออก ให้ wrap ชิดซ้าย */
    p.style.cssText = [
      'margin:0',
      'padding-left:0',
      'text-indent:1.5cm',
      'line-height:1.6',
      'text-align:justify',
      'text-justify:inter-character',
      'word-break:break-word'
    ].join(';');
    p.textContent = para;
    container.appendChild(p);
  });
}

function thaiDateToday() {
  var d = new Date();
  var months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  return toThaiNumerals(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + toThaiNumerals(d.getFullYear() + 543);
}

function _renderMemoModal(subKey, memoData) {
  var sub = submissions[subKey];
  if (!sub) return;
  var dt = DOCUMENT_TYPES.find(function(d){ return d.id === sub.docTypeId; }) || {};

  var staffName = (currentStaffData && currentStaffData.name)     || sub.staffName     || '';
  var staffPos  = (currentStaffData && currentStaffData.position) || sub.staffPosition || '';
  var staffGrp  = (currentStaffData && currentStaffData.group)    || sub.staffGroup    || '';

  /* ── อ่านข้อมูล memo จาก shared document (memoData) ── */
  var memo = memoData || {};

  /* ── ที่ / วันที่ / เรื่อง ── */
  document.getElementById('memoPrintRef').textContent     = toThaiNumerals(memo.memoRef     || '');
  document.getElementById('memoPrintDate').textContent    = toThaiNumerals(memo.memoDate    || thaiDateToday());
  var autoSubject = 'ส่ง' + (dt.label || 'งาน') + ' ประจำภาคเรียนที่ ' + sub.semester + ' ปีการศึกษา ' + sub.year;
  document.getElementById('memoPrintSubject').textContent = toThaiNumerals(memo.memoSubject || autoSubject);

  /* ── เรียน ── */
  document.getElementById('memoPrintTo').textContent = memo.memoTo || 'ผู้อำนวยการโรงเรียนหนองกี่พิทยาคม';

  /* ── เนื้อหา ── */
  var autoBody =
    'ด้วย' + (staffName ? 'ข้าพเจ้า ' + staffName : 'ข้าพเจ้า') +
    (staffPos  ? '  ตำแหน่ง ' + staffPos  : '') +
    (staffGrp  ? '  กลุ่มสาระการเรียนรู้' + staffGrp : '') +
    '\nขอส่ง' + (dt.label || 'งาน') +
    '  รายวิชา ' + (sub.courseCode || '') + '  ' + (sub.courseName || '') +
    '\nประจำภาคเรียนที่ ' + sub.semester + '  ปีการศึกษา ' + sub.year +
    '  จำนวน ' + (sub.files ? sub.files.length : 0) + ' ไฟล์' +
    '  ตามเอกสารที่แนบมาพร้อมนี้' +
    '\n\nจึงเรียนมาเพื่อโปรดทราบและพิจารณา';
  var bodyEl = document.getElementById('memoBodyInlineText');
  renderMemoBody(bodyEl, toThaiNumerals(memo.memoBody || autoBody));

  /* ── ลายมือชื่อ ── */
  document.getElementById('memoSignName').textContent  = staffName ? '( ' + staffName + ' )' : '';
  document.getElementById('memoSignPos').textContent   = staffPos  ? 'ตำแหน่ง ' + staffPos  : 'ครู';
  document.getElementById('memoSignGroup').textContent = staffGrp  ? 'กลุ่มสาระการเรียนรู้' + staffGrp : '';

  /* แสดงลายเซ็นจาก shared memo doc */
  var sigImg = document.getElementById('memoSignatureImg');
  if (sigImg) {
    var sigSrc = memo.signatureURL || '';
    if (sigSrc && sigSrc.length > 10) {
      sigImg.src = sigSrc;
      sigImg.style.display = 'block';
    } else {
      sigImg.src = '';
      sigImg.style.display = 'none';
    }
  }

  document.getElementById('memoModal').classList.add('open');
  document.body.style.overflow = 'hidden';

  /* ── หน้า 2: ความคิดเห็นผู้ตรวจแต่ละขั้น ── */
  var page2 = document.getElementById('memoPage2');
  var headNote      = sub.headNote      || '';
  var assistantNote = sub.assistantNote || '';
  var deputyNote    = sub.deputyNote    || '';
  var directorNote  = sub.directorNote  || '';

  /* แสดงหน้า 2 เสมอ (พิมพ์จะขึ้นหน้าใหม่อัตโนมัติ) */
  if (page2) page2.style.display = 'block';

  /* ชื่อหัวหน้ากลุ่มสาระ — ดึงจาก sub ถ้ามี หรือจาก adminRoles ตามกลุ่มของครู */
  var headSignNameEl = document.getElementById('page2HeadSignName');
  if (headSignNameEl) {
    var headName = sub.headReviewerName || '';
    if (!headName && staffGrp && adminRoles.headOfGroup[staffGrp]) {
      headName = adminRoles.headOfGroup[staffGrp].name;
    }
    headSignNameEl.textContent = headName ? '( ' + headName + ' )' : '(                                   )';
  }
  var headSigImg = document.getElementById('page2HeadSignImg');
  if (headSigImg) {
    if (sub.headSignatureURL) { headSigImg.src = sub.headSignatureURL; headSigImg.style.display = 'block'; }
    else { headSigImg.src = ''; headSigImg.style.display = 'none'; }
  }

  /* ผช.ผอ.วิชาการ */
  var assistantSignEl = document.getElementById('page2AssistantSignName');
  if (assistantSignEl) {
    var assistantName = (sub.assistantReviewerName) || (adminRoles.assistantAcademic && adminRoles.assistantAcademic.name) || '';
    assistantSignEl.textContent = assistantName ? '( ' + assistantName + ' )' : '(                                   )';
  }
  var assistantSigImg = document.getElementById('page2AssistantSignImg');
  if (assistantSigImg) {
    if (sub.assistantSignatureURL) { assistantSigImg.src = sub.assistantSignatureURL; assistantSigImg.style.display = 'block'; }
    else { assistantSigImg.src = ''; assistantSigImg.style.display = 'none'; }
  }

  /* รอง ผอ.วิชาการ */
  var deputySignEl = document.getElementById('page2DeputySignName');
  if (deputySignEl) {
    var deputyName = (sub.deputyReviewerName) || (adminRoles.deputyAcademic && adminRoles.deputyAcademic.name) || '';
    deputySignEl.textContent = deputyName ? '( ' + deputyName + ' )' : '(                                   )';
  }
  var deputySigImg = document.getElementById('page2DeputySignImg');
  if (deputySigImg) {
    if (sub.deputySignatureURL) { deputySigImg.src = sub.deputySignatureURL; deputySigImg.style.display = 'block'; }
    else { deputySigImg.src = ''; deputySigImg.style.display = 'none'; }
  }

  /* ผู้อำนวยการ */
  var directorSignEl = document.getElementById('page2DirectorSignName');
  if (directorSignEl) {
    var directorName = (sub.directorReviewerName) || (adminRoles.director && adminRoles.director.name) || '';
    directorSignEl.textContent = directorName ? '( ' + directorName + ' )' : '(                                   )';
  }
  var directorSigImg = document.getElementById('page2DirectorSignImg');
  if (directorSigImg) {
    if (sub.directorSignatureURL) { directorSigImg.src = sub.directorSignatureURL; directorSigImg.style.display = 'block'; }
    else { directorSigImg.src = ''; directorSigImg.style.display = 'none'; }
  }

  function setNote(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '';
  }
  setNote('page2HeadNote',      headNote);
  setNote('page2AssistantNote', assistantNote);
  setNote('page2DeputyNote',    deputyNote);
  setNote('page2DirectorNote',  directorNote);

  scaleA4();
  lucide.createIcons();
}

/* ─── HELPERS ─── */

function renderInlineMemoPreview() {
  var dt = (typeof DOCUMENT_TYPES !== 'undefined' && DOCUMENT_TYPES.find(function(d){ return d.id === currentDocId; })) || {};

  var staffName = (currentStaffData && currentStaffData.name)     || (currentUser && currentUser.displayName) || '';
  var staffPos  = (currentStaffData && currentStaffData.position) || '';
  var staffGrp  = (currentStaffData && currentStaffData.group)    || '';

  var sem  = currentSem  || '';
  var year = currentYear || '';

  var ref     = (document.getElementById('memoRef')     && document.getElementById('memoRef').value.trim())     || '';
  var date    = (document.getElementById('memoDate')    && document.getElementById('memoDate').value.trim())    || thaiDateToday();
  var autoSubject = 'ส่ง' + (dt.label || 'งาน') + ' ประจำภาคเรียนที่ ' + sem + ' ปีการศึกษา ' + year;
  var subject = (document.getElementById('memoSubject') && document.getElementById('memoSubject').value.trim()) || autoSubject;
  var to      = (document.getElementById('memoTo')      && document.getElementById('memoTo').value.trim())      || 'ผู้อำนวยการโรงเรียนหนองกี่พิทยาคม';
  var through = (document.getElementById('memoThrough') && document.getElementById('memoThrough').value.trim()) || '';

  var courseCode = '';
  var courseName = '';
  var fileCount  = 0;
  if (typeof courseRows !== 'undefined' && courseRows && courseRows.length > 0) {
    var firstRow = courseRows[0];
    courseCode = firstRow.code || '';
    courseName = firstRow.name || '';
    fileCount  = firstRow.files ? firstRow.files.length : 0;
  }
  var autoBody =
    'ด้วย' + (staffName ? 'ข้าพเจ้า ' + staffName : 'ข้าพเจ้า') +
    (staffPos ? '  ตำแหน่ง ' + staffPos : '') +
    (staffGrp ? '  กลุ่มสาระการเรียนรู้' + staffGrp : '') +
    '\nขอส่ง' + (dt.label || 'งาน') +
    (courseCode || courseName ? '  รายวิชา ' + courseCode + '  ' + courseName : '') +
    '\nประจำภาคเรียนที่ ' + sem + '  ปีการศึกษา ' + year +
    (fileCount > 0 ? '  จำนวน ' + fileCount + ' ไฟล์' : '') +
    '  ตามเอกสารที่แนบมาพร้อมนี้' +
    '\n\nจึงเรียนมาเพื่อโปรดทราบและพิจารณา';
  var body = (document.getElementById('memoBody') && document.getElementById('memoBody').value.trim()) || autoBody;

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = toThaiNumerals(val);
  }
  setText('prevRef', ref);
  setText('prevDate', date);
  setText('prevSubject', subject);
  setText('prevTo', to);

  var bodyEl = document.getElementById('prevBody');
  renderMemoBody(bodyEl, toThaiNumerals(body));

  setText('prevSignName', staffName ? '( ' + staffName + ' )' : '');
  setText('prevSignPos',  staffPos  ? 'ตำแหน่ง ' + staffPos : 'ครู');
  setText('prevSignGroup', staffGrp ? 'กลุ่มสาระการเรียนรู้' + staffGrp : '');
}

/* ══════════════════════ EVENT HANDLERS ══════════════════════ */
function updateProgressTotal() {
  /* อัปเดตตัวเลข total ใน progress bar ให้ตรงกับ DOCUMENT_TYPES จริง */
  var el = document.getElementById('progressText');
  if (!el) return;
  var current = el.textContent.split('/')[0].trim();
  el.textContent = current + ' / ' + DOCUMENT_TYPES.length + ' รายการ';
}

/* ══ ปุ่มย้อนกลับไปด้านบน — scroll เกิดที่ .content-area (id="pageContent") ══ */
function setupScrollTopButton() {
  var content = document.getElementById('pageContent');
  var btn = document.getElementById('scrollTopBtn');
  if (!content || !btn) return;
  content.addEventListener('scroll', function() {
    btn.classList.toggle('show', content.scrollTop > 300);
  });
}

function showStaffDenied(email) {
  var loadEl = document.getElementById('loadingOverlay');
  if (loadEl) loadEl.style.display = 'none';
  var denied = document.getElementById('staffDenied');
  if (denied) {
    document.getElementById('staffDeniedEmail').textContent = email || '';
    denied.style.display = 'flex';
  }
  lucide.createIcons();
}

/* ─── YEAR / SEM ─── */
function changeYear(d) {
  currentYear += d;
  document.getElementById('yearLabel').textContent    = currentYear;
  document.getElementById('displayYear').textContent  = currentYear;
  loadSubmissions();
}
function selectSem(s) {
  currentSem = s;
  document.getElementById('semPill1').className = 'sem-pill' + (s===1?' active':'');
  document.getElementById('semPill2').className = 'sem-pill' + (s===2?' active':'');
  document.getElementById('displaySem').textContent   = 'ภาคเรียนที่ ' + s;
  loadSubmissions();
}

/* ─── UPLOAD MODAL (add new course) ─── */
function openUploadModal(docTypeId) {
  currentDocId  = docTypeId;
  courseRows    = []; /* reset: เริ่มต้นด้วยแถวว่างหนึ่งแถว */
  activeUploadRowIdx = null;

  var dt = DOCUMENT_TYPES.find(function(d){ return d.id === docTypeId; });

  document.getElementById('modalTitle').textContent    = 'ส่งงาน: ' + dt.label;
  document.getElementById('modalSemLabel').textContent = 'ปีการศึกษา ' + currentYear + ' ภาคเรียนที่ ' + currentSem;
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('submitNote').value = '';
  document.getElementById('courseFilePanels').innerHTML = '';
  document.getElementById('courseRowsContainer').innerHTML = '';

  /* โหลด memo fields จาก portfolio_memos (shared document) */
  loadMemoDocument(docTypeId, function() {
    /* ถ้ายังไม่มี memoDate ให้ใส่วันนี้ */
    if (!document.getElementById('memoDate').value) document.getElementById('memoDate').value = thaiDateToday();
    /* ถ้ายังไม่มี memoThrough ให้ใส่ชื่อหัวหน้ากลุ่มสาระอัตโนมัติ */
    if (!document.getElementById('memoThrough').value && currentStaffData && currentStaffData.group) {
      var headInfo = adminRoles.headOfGroup[currentStaffData.group];
      if (headInfo && headInfo.name) document.getElementById('memoThrough').value = headInfo.name;
    }
  });
  switchMemoTab('edit');

  /* auto-fill กลุ่มสาระ */
  if (window._defaultSubjectGroup) {
    document.getElementById('subjectGroup').value = window._defaultSubjectGroup;
  } else {
    document.getElementById('subjectGroup').value = '';
  }

  /* เพิ่มแถวรายวิชาแรก */
  addCourseRow();

  document.getElementById('uploadModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
  if (typeof initSignaturePadNow === 'function') initSignaturePadNow();
}

/* ─── MANAGE MODAL (จัดการไฟล์ของวิชาที่ส่งแล้ว) ─── */
function openManageCourseModal(docTypeId, subKey) {
  currentDocId = docTypeId;
  var sub = submissions[subKey];
  if (!sub) return;
  var dt    = DOCUMENT_TYPES.find(function(d){ return d.id === docTypeId; });
  var files = sub.files || [];

  document.getElementById('modalTitle').textContent    = 'จัดการงาน: ' + dt.label;
  document.getElementById('modalSemLabel').textContent = 'ปีการศึกษา ' + currentYear + ' ภาคเรียนที่ ' + currentSem;
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('submitNote').value = sub.note || '';
  document.getElementById('subjectGroup').value = sub.subjectGroup || '';
  document.getElementById('courseRowsContainer').innerHTML = '';
  document.getElementById('uploadProgress').style.display = 'none';

  /* restore memo fields */
  /* โหลด memo fields จาก portfolio_memos (shared document) */
  loadMemoDocument(docTypeId, function() {
    if (!document.getElementById('memoDate').value) document.getElementById('memoDate').value = thaiDateToday();
    if (!document.getElementById('memoThrough').value && currentStaffData && currentStaffData.group) {
      var headInfoR = adminRoles.headOfGroup[currentStaffData.group];
      if (headInfoR && headInfoR.name) document.getElementById('memoThrough').value = headInfoR.name;
    }
  });
  switchMemoTab('edit');

  /* แสดง panel ของวิชานี้ */
  courseRows = [{ code: sub.courseCode, name: sub.courseName, files: [], managingSubKey: subKey }];
  renderCourseFilePanels();

  document.getElementById('uploadModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
  if (typeof initSignaturePadNow === 'function') initSignaturePadNow();
}

/* ─── COURSE ROW MANAGEMENT ─── */
function addCourseRow() {
  courseRows.push({ code: '', name: '', files: [], managingSubKey: null });
  renderCourseRows();
}

function removeCourseRow(idx) {
  courseRows.splice(idx, 1);
  if (courseRows.length === 0) addCourseRow();
  else renderCourseRows();
}

function addFilesToRow(rowIdx, newFiles) {
  var row = courseRows[rowIdx];
  if (!row) return;
  var managingFiles = row.managingSubKey ? (submissions[row.managingSubKey] ? submissions[row.managingSubKey].files.length : 0) : 0;
  var total = managingFiles + row.files.length;
  newFiles.forEach(function(f) {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      showToast(f.name + ' – รองรับเฉพาะ PDF', 'error'); return;
    }
    if (f.size > 20*1024*1024) { showToast(f.name + ' – เกิน 20MB', 'error'); return; }
    if (total >= MAX_FILES_PER_TOPIC) { showToast('ครบ ' + MAX_FILES_PER_TOPIC + ' ไฟล์แล้ว', 'error'); return; }
    row.files.push(f); total++;
  });
  renderCourseQueuedFiles(rowIdx);
}

function removeCourseFile(rowIdx, fileIdx) {
  courseRows[rowIdx].files.splice(fileIdx, 1);
  renderCourseQueuedFiles(rowIdx);
}

function toggleManageReplaceZone(subKey, fileIndex, rowIdx) {
  var sub = submissions[subKey];
  if (!sub) return;
  var files = sub.files || [];
  files.forEach(function(_, fi) {
    var z = document.getElementById('mReplaceZone_' + rowIdx + '_' + fi);
    if (fi !== fileIndex && z) z.style.display = 'none';
  });
  var zone = document.getElementById('mReplaceZone_' + rowIdx + '_' + fileIndex);
  if (zone) zone.style.display = zone.style.display === 'none' ? 'block' : 'none';
  lucide.createIcons();
}

/* ─── DELETE FILE ─── */
function promptDeleteFile(subKey, fileIndex) {
  var sub = submissions[subKey];
  var fileName = sub && sub.files && sub.files[fileIndex] ? sub.files[fileIndex].fileName : '';
  pendingDeleteInfo = { subKey: subKey, fileIndex: fileIndex };
  document.getElementById('deleteFileName').textContent = fileName;
  /* reset ปุ่มทุกครั้งที่เปิด modal ใหม่ */
  var btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = false;
  btn.textContent = 'ลบไฟล์';
  document.getElementById('confirmDeleteModal').classList.add('open');
  lucide.createIcons();
}
function closeDeleteModal() {
  document.getElementById('confirmDeleteModal').classList.remove('open');
  pendingDeleteInfo = null;
  /* reset ปุ่มเสมอเมื่อปิด */
  var btn = document.getElementById('confirmDeleteBtn');
  if (btn) { btn.disabled = false; btn.textContent = 'ลบไฟล์'; }
}
function confirmDelete() {
  if (!pendingDeleteInfo) return;
  var subKey    = pendingDeleteInfo.subKey;
  var fileIndex = pendingDeleteInfo.fileIndex;
  var sub = submissions[subKey];
  if (!sub || !sub.files) { closeDeleteModal(); return; }

  var btn = document.getElementById('confirmDeleteBtn');
  var fileToDelete = sub.files[fileIndex];
  var newFiles = sub.files.filter(function(_, i){ return i !== fileIndex; });
  var isDeletingAll = newFiles.length === 0;

  /* ── ลบลายเซ็นจาก Storage (เฉพาะกรณีลบทั้ง submission) ── */
  function deleteSignatureFromStorage() {
    if (!isDeletingAll) return Promise.resolve();
    var sigURL = sub.signatureURL || '';
    if (!sigURL) return Promise.resolve();
    try {
      var ref = firebase.storage().refFromURL(sigURL);
      return ref.delete().catch(function(e) {
        /* ถ้าลบไม่ได้ (ไฟล์ถูกลบแล้ว / permission) ไม่ต้อง block การลบ doc */
        console.warn('[Signature] ลบจาก Storage ไม่สำเร็จ:', e.code);
      });
    } catch(e) {
      console.warn('[Signature] refFromURL error:', e);
      return Promise.resolve();
    }
  }

  function updateFirestore() {
    if (isDeletingAll) return db.collection('portfolio_submissions').doc(sub.id).delete();
    return db.collection('portfolio_submissions').doc(sub.id).update({
      files: newFiles, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  function proceedDelete() {
    btn.disabled = true; btn.textContent = 'กำลังลบ...';

    var driveDeletePromise = Promise.resolve();
    if (fileToDelete && fileToDelete.fileId) {
      /* ลบจาก Drive จริง ๆ (มี token แล้วแน่นอน) */
      driveDeletePromise = fetch(
        'https://www.googleapis.com/drive/v3/files/' + fileToDelete.fileId + '?supportsAllDrives=true',
        { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + driveAccessToken } }
      ).then(function(res) {
        if (!res.ok && res.status !== 404) throw new Error('Drive delete failed: ' + res.status);
      });
    }

    driveDeletePromise
      .then(deleteSignatureFromStorage)
      .then(updateFirestore)
      .then(function() {
        showToast('ลบไฟล์สำเร็จ', 'success');
        closeDeleteModal();
        if (isDeletingAll) {
          delete submissions[subKey];
          closeUploadModal();
        } else {
          submissions[subKey] = Object.assign({}, sub, { files: newFiles });
          var rowIdx = courseRows.findIndex(function(r){ return r.managingSubKey === subKey; });
          if (rowIdx >= 0) renderCourseFilePanels();
        }
        renderDocList();
      }).catch(function(e) {
        showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
        btn.disabled = false; btn.textContent = 'ลบไฟล์';
      });
  }

  /* ต้อง auth Drive ก่อนเสมอเพื่อให้ลบได้จริง */
  if (fileToDelete && fileToDelete.fileId && !driveAccessToken) {
    btn.disabled = true; btn.textContent = 'รอการอนุญาต Drive...';
    authorizeDrive(function() {
      btn.disabled = false; btn.textContent = 'ลบไฟล์';
      proceedDelete();
    });
  } else {
    proceedDelete();
  }
}

function promptDeleteSubmission(subKey) {
  var sub = submissions[subKey];
  if (!sub) return;
  pendingDeleteSubKey = subKey;
  var label = (sub.courseCode ? sub.courseCode + ' ' : '') + (sub.courseName || '');
  document.getElementById('deleteSubCourseName').textContent = label;
  var btn = document.getElementById('confirmDeleteSubBtn');
  btn.disabled = false;
  btn.textContent = 'ลบงาน';
  document.getElementById('confirmDeleteSubModal').classList.add('open');
  lucide.createIcons();
}

function closeDeleteSubModal() {
  document.getElementById('confirmDeleteSubModal').classList.remove('open');
  pendingDeleteSubKey = null;
  var btn = document.getElementById('confirmDeleteSubBtn');
  if (btn) { btn.disabled = false; btn.textContent = 'ลบงาน'; }
}

function confirmDeleteSubmission() {
  if (!pendingDeleteSubKey) return;
  var subKey = pendingDeleteSubKey;
  var sub = submissions[subKey];
  if (!sub) { closeDeleteSubModal(); return; }

  var btn = document.getElementById('confirmDeleteSubBtn');
  btn.disabled = true;
  btn.textContent = 'กำลังลบ...';

  var files = sub.files || [];

  /* ลบลายเซ็นจาก Storage */
  function deleteSignature() {
    var sigURL = sub.signatureURL || '';
    if (!sigURL) return Promise.resolve();
    try {
      var ref = firebase.storage().refFromURL(sigURL);
      return ref.delete().catch(function(e) {
        console.warn('[Signature] ลบไม่สำเร็จ:', e.code);
      });
    } catch(e) {
      console.warn('[Signature] refFromURL error:', e);
      return Promise.resolve();
    }
  }

  /* ลบไฟล์ทุกไฟล์จาก Drive */
  function deleteAllDriveFiles() {
    if (!driveAccessToken) return Promise.resolve();
    var promises = files.filter(function(f){ return f && f.fileId; }).map(function(f) {
      return fetch(
        'https://www.googleapis.com/drive/v3/files/' + f.fileId + '?supportsAllDrives=true',
        { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + driveAccessToken } }
      ).then(function(res) {
        if (!res.ok && res.status !== 404) console.warn('Drive delete warning:', res.status, f.fileId);
      }).catch(function(e) { console.warn('Drive delete error:', e); });
    });
    return Promise.all(promises);
  }

  /* ลบ Firestore doc */
  function deleteFirestoreDoc() {
    return db.collection('portfolio_submissions').doc(sub.id).delete();
  }

  function proceedDeleteSub() {
    deleteAllDriveFiles()
      .then(deleteSignature)
      .then(deleteFirestoreDoc)
      .then(function() {
        showToast('ลบงานเรียบร้อย ✓', 'success');
        delete submissions[subKey];
        closeDeleteSubModal();
        renderDocList();
      })
      .catch(function(e) {
        showToast('เกิดข้อผิดพลาด: ' + (e.message || e), 'error');
        btn.disabled = false;
        btn.textContent = 'ลบงาน';
      });
  }

  /* ถ้ามีไฟล์ใน Drive ต้อง auth ก่อน */
  var hasDriveFiles = files.some(function(f){ return f && f.fileId; });
  if (hasDriveFiles && !driveAccessToken) {
    btn.textContent = 'รอการอนุญาต Drive...';
    authorizeDrive(function() {
      btn.disabled = true;
      btn.textContent = 'กำลังลบ...';
      proceedDeleteSub();
    });
  } else {
    proceedDeleteSub();
  }
}

/* ─── CLOSE MODAL ─── */
function closeUploadModal() {
  document.getElementById('uploadModal').classList.remove('open');
  document.body.style.overflow = '';
  courseRows = [];
}
function submitDoc() {
  if (!currentUser || !currentDocId) return;
  if (_isUploading) { showToast('กำลังอัปโหลด กรุณารอสักครู่...', 'info'); return; }
  var subjectGroup = document.getElementById('subjectGroup').value.trim();
  var note         = document.getElementById('submitNote').value.trim();
  var btn          = document.getElementById('submitBtn');

  if (!subjectGroup) { showToast('กรุณาเลือกกลุ่มสาระการเรียนรู้', 'error'); return; }

  /* ── บังคับกรอกเลขที่บันทึกข้อความ ── */
  var memoRefVal = document.getElementById('memoRef') ? document.getElementById('memoRef').value.trim() : '';
  if (!memoRefVal) {
    showToast('กรุณากรอกเลขที่บันทึกข้อความ (ช่อง "ที่")', 'error');
    document.getElementById('memoRef').focus();
    /* สลับไปแท็บ กรอกข้อมูล ถ้าอยู่แท็บ preview */
    switchMemoTab('edit');
    return;
  }

  /* ── บังคับเซ็นลายเซ็น (วาดเอง หรือแนบไฟล์ อย่างใดอย่างหนึ่ง) ── */
  if (typeof isSignatureEmpty === 'function' && isSignatureEmpty()) {
    showToast('กรุณาเซ็นลายมือชื่อ หรือแนบไฟล์ลายเซ็น ก่อนส่ง', 'error');
    switchMemoTab('edit');
    return;
  }

  /* ตรวจสอบว่าอยู่ใน manage mode (มี managingSubKey) หรือ add mode */
  var isManageMode = courseRows.length === 1 && courseRows[0].managingSubKey;

  if (isManageMode) {
    /* manage mode: บันทึก meta เท่านั้น (ไฟล์จัดการแยกผ่าน panel) */
    var subKey = courseRows[0].managingSubKey;
    var sub    = submissions[subKey];
    var newFiles = courseRows[0].files; /* ไฟล์ใหม่ที่จะเพิ่ม */

    if (newFiles.length > 0) {
      /* มีไฟล์ใหม่ → อัปโหลดแล้ว save */
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px;animation:spin .8s linear infinite;"></i> กำลังบันทึก...';
      lucide.createIcons();
      if (!driveAccessToken) {
        document.getElementById('driveAuthNotice').style.display = 'block';
        authorizeDrive(function(){ uploadManageFiles(subKey, newFiles, subjectGroup, note, btn); });
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px;"></i> ส่งงาน';
        lucide.createIcons();
        return;
      }
      uploadManageFiles(subKey, newFiles, subjectGroup, note, btn);
    } else {
      /* ไม่มีไฟล์ใหม่ → บันทึก meta เท่านั้น */
      uploadSignatureToStorage(currentUser.uid, sub.courseCode || '', currentDocId)
        .then(function(sigURL) {
          var updateData = {
            subjectGroup: subjectGroup,
            note: note,
            memoDate:    document.getElementById('memoDate').value.trim(),
            memoSubject: document.getElementById('memoSubject').value.trim(),
            memoTo:      document.getElementById('memoTo').value.trim(),
            memoThrough: document.getElementById('memoThrough').value.trim(),
            memoBody:    document.getElementById('memoBody').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          };
          if (sigURL) updateData.signatureURL = sigURL;
          return db.collection('portfolio_submissions').doc(sub.id).update(updateData);
        })
        .then(function() {
          showToast('บันทึกสำเร็จ ✓', 'success');
          closeUploadModal(); loadSubmissions();
        }).catch(function(e){ showToast('เกิดข้อผิดพลาด: ' + e.message, 'error'); });
    }
    return;
  }

  /* ADD MODE: ตรวจสอบแต่ละแถว */
  var validRows = [];
  var ok = true;
  courseRows.forEach(function(row, i) {
    var code = row.code || document.querySelector('#courseRowsContainer div:nth-child(' + (i+1) + ') input:nth-child(1)')
                         ? (document.querySelectorAll('#courseRowsContainer input[placeholder^="รหัส"]')[i] || {}).value || row.code
                         : row.code;
    /* read from DOM inputs directly */
    var inputs = document.querySelectorAll('#courseRowsContainer div > div > input');
    /* inputs arranged as [code0, name0, code1, name1, ...] */
  });

  /* อ่านค่าจาก DOM โดยตรง */
  var codeInputs = document.querySelectorAll('#courseRowsContainer input[placeholder^="รหัสวิชา"]');
  var nameInputs = document.querySelectorAll('#courseRowsContainer input[placeholder^="ชื่อวิชา"]');

  var hasError = false;
  var rowsToSubmit = [];
  courseRows.forEach(function(row, i) {
    var code = codeInputs[i] ? codeInputs[i].value.trim() : row.code;
    var name = nameInputs[i] ? nameInputs[i].value.trim() : row.name;
    row.code = code; row.name = name;
    if (!code) { showToast('กรุณากรอกรหัสวิชาวิชาที่ ' + (i+1), 'error'); hasError = true; return; }
    if (!name) { showToast('กรุณากรอกชื่อวิชาวิชาที่ ' + (i+1), 'error'); hasError = true; return; }
    if (row.files.length === 0) { showToast('กรุณาเพิ่มไฟล์สำหรับวิชา ' + code, 'error'); hasError = true; return; }
    /* ตรวจว่า courseCode ซ้ำกับที่ส่งแล้วหรือไม่ */
    var existSubKey = currentDocId + '_' + code;
    if (submissions[existSubKey]) {
      showToast('รหัสวิชา ' + code + ' ส่งแล้ว ใช้ปุ่ม "จัดการไฟล์" แทน', 'error'); hasError = true; return;
    }
    rowsToSubmit.push({ code: code, name: name, files: row.files });
  });
  if (hasError) return;

  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px;animation:spin .8s linear infinite;"></i> กำลังบันทึก...';
  lucide.createIcons();

  if (!driveAccessToken) {
    document.getElementById('driveAuthNotice').style.display = 'block';
    authorizeDrive(function(){ _isUploading = true; uploadAllCourseRows(rowsToSubmit, subjectGroup, note, btn); });
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px;"></i> ส่งงาน';
    lucide.createIcons();
    return;
  }
  _isUploading = true;
  uploadAllCourseRows(rowsToSubmit, subjectGroup, note, btn);
}

function saveCourseSubmission(allFiles, note, subjectGroup, courseCode, courseName, signatureURL) {
  var key    = currentYear + '_' + currentSem;
  var now    = firebase.firestore.FieldValue.serverTimestamp();
  var subKey = currentDocId + '_' + courseCode;
  var existing = submissions[subKey];
  var data = {
    uid:           currentUser.uid,
    email:         currentUser.email,
    displayName:   currentUser.displayName || '',
    staffName:     (currentStaffData && currentStaffData.name)     || currentUser.displayName || '',
    staffPosition: (currentStaffData && currentStaffData.position) || '',
    staffGroup:    (currentStaffData && currentStaffData.group)    || '',
    yearSem:       key,
    year:          currentYear,
    semester:      currentSem,
    docTypeId:     currentDocId,
    files:         allFiles,
    fileUrl:       allFiles.length > 0 ? allFiles[0].fileUrl : '',
    note:          note,
    subjectGroup:  subjectGroup,
    courseCode:    courseCode,
    courseName:    courseName,
    status:        'submitted',
    updatedAt:     now,
    submittedAt:   now,
    resubmittedAt: null,
  };
  return db.collection('portfolio_submissions').add(data);
}

function resetBtn(btn) {
  btn.disabled  = false;
  btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px;"></i> ส่งงาน';
  lucide.createIcons();
}

/* บันทึก memo แยกออกจาก submission → portfolio_memos */
function saveMemoDocument(signatureURL, docTypeId) {
  var memoId = getMemoDocId(docTypeId);
  var data = {
    uid:          currentUser.uid,
    email:        currentUser.email,
    staffName:    (currentStaffData && currentStaffData.name)     || currentUser.displayName || '',
    staffPosition:(currentStaffData && currentStaffData.position) || '',
    staffGroup:   (currentStaffData && currentStaffData.group)    || '',
    docTypeId:    docTypeId || currentDocId,
    year:         currentYear,
    semester:     currentSem,
    yearSem:      currentYear + '_' + currentSem,
    memoRef:      (document.getElementById('memoRef')     && document.getElementById('memoRef').value.trim())     || '',
    memoDate:     (document.getElementById('memoDate')    && document.getElementById('memoDate').value.trim())    || '',
    memoSubject:  (document.getElementById('memoSubject') && document.getElementById('memoSubject').value.trim()) || '',
    memoTo:       (document.getElementById('memoTo')      && document.getElementById('memoTo').value.trim())      || 'ผู้อำนวยการโรงเรียนหนองกี่พิทยาคม',
    memoThrough:  (document.getElementById('memoThrough') && document.getElementById('memoThrough').value.trim()) || '',
    memoBody:     (document.getElementById('memoBody')    && document.getElementById('memoBody').value.trim())    || '',
    signatureURL: signatureURL || '',
    updatedAt:    firebase.firestore.FieldValue.serverTimestamp(),
  };
  /* set + merge: อัปเดตทับ doc เดิมได้ */
  return db.collection('portfolio_memos').doc(memoId).set(data, { merge: true });
}

/* ─── MEMO MODAL ─── */
function openMemoModal(subKey) {
  var sub = submissions[subKey];
  if (!sub) { showToast('ไม่พบข้อมูลการส่งงาน','error'); return; }

  /* ดึง fresh data จาก Firestore สำหรับ note/ลายเซ็นผู้ตรวจ */
  var freshSub = sub;
  var fetchSub = sub.id
    ? db.collection('portfolio_submissions').doc(sub.id).get().then(function(doc) {
        if (doc.exists) {
          var fresh = doc.data();
          ['headNote','assistantNote','deputyNote','directorNote',
           'headReviewerName','assistantReviewerName','deputyReviewerName','directorReviewerName',
           'headSignatureURL','assistantSignatureURL','deputySignatureURL','directorSignatureURL'
          ].forEach(function(f){ if (fresh[f] !== undefined) sub[f] = fresh[f]; });
          submissions[subKey] = sub;
          freshSub = sub;
        }
      }).catch(function(){})
    : Promise.resolve();

  /* ดึง memo doc แบบ shared จาก portfolio_memos — ใช้ currentYear/currentSem ให้ตรงกับ getMemoDocId() */
  var memoId = currentUser.uid + '_' + sub.docTypeId + '_' + currentYear + '_' + currentSem;
  var fetchMemo = db.collection('portfolio_memos').doc(memoId).get()
    .then(function(mDoc) { return mDoc.exists ? mDoc.data() : null; })
    .catch(function(){ return null; });

  Promise.all([fetchSub, fetchMemo]).then(function(results) {
    var memoData = results[1];
    _renderMemoModal(subKey, memoData);
  });
}

function closeMemoModal() {
  document.getElementById('memoModal').classList.remove('open');
  document.body.style.overflow = '';
}
/* ─── MEMO TAB SWITCH + INLINE PREVIEW ─── */
function switchMemoTab(tab) {
  var editPane    = document.getElementById('memoEditPane');
  var previewPane = document.getElementById('memoPreviewPane');
  var tabEdit     = document.getElementById('memoTabEdit');
  var tabPreview  = document.getElementById('memoTabPreview');
  if (!editPane || !previewPane) return;

  if (tab === 'preview') {
    renderInlineMemoPreview();
    editPane.style.display    = 'none';
    previewPane.style.display = 'block';
    tabEdit.style.background    = 'white';
    tabEdit.style.color         = '#1d4ed8';
    tabEdit.style.borderColor   = '#93c5fd';
    tabPreview.style.background = '#1d4ed8';
    tabPreview.style.color      = 'white';
    tabPreview.style.borderColor= '#1d4ed8';
  } else {
    editPane.style.display    = 'flex';
    previewPane.style.display = 'none';
    tabEdit.style.background    = '#1d4ed8';
    tabEdit.style.color         = 'white';
    tabEdit.style.borderColor   = '#1d4ed8';
    tabPreview.style.background = 'white';
    tabPreview.style.color      = '#1d4ed8';
    tabPreview.style.borderColor= '#93c5fd';
  }
}

/* ══════════════════════ INIT ══════════════════════ */
window.onload = function() {
  if (typeof google !== 'undefined' && google.accounts) initGoogleAuth();
};

/* ─── AUTH / PAGE SHELL ───
   buildPage() จะ handle auth guard + navbar/sidebar shell ให้
   (theme 'blue' = ผู้ใช้ทั่วไป/ครู) จากนั้นตรวจสอบ staff collection เพิ่มเอง */
buildPage({
  appId:        'myApp',
  navSubtitle:  'ระบบส่งงานประจำภาคเรียน',
  navTheme:     'blue',
  activePage:   'portfolio-teacher',
  requireAdmin: false,

  onAuth: function(u, contentEl) {
    db.collection('staff').where('email', '==', u.email.toLowerCase()).limit(1).get()
      .then(function(snap) {
        if (snap.empty) { showStaffDenied(u.email); return; }
        currentUser      = u;
        currentStaffData = snap.docs[0].data();

        updateNavUser(u);
        updateSidebarProfile(u);
        checkAdminAccess(u.email);

        /* inject page content จาก <template> */
        var tpl = document.getElementById('portfolioContent');
        if (tpl) contentEl.appendChild(tpl.content.cloneNode(true));

        renderStaffInfoBadge();
        initYearSemUI();
        loadAdminRoles();
        /* โหลด DOCUMENT_TYPES จาก Firestore ก่อน แล้วค่อย loadSubmissions */
        loadDocTypesFromFirestore(function() {
          loadSubmissions();
        });
        lucide.createIcons();
        setupScrollTopButton();
        /* init Google auth after user confirmed */
        setTimeout(initGoogleAuth, 500);
      })
      .catch(function(e) {
        showStaffDenied(u.email);
      });
  }
});

/* ─── SUBMIT ─── */
/* ─── SIGNATURE PAD ─── */
(function() {
  var canvas, ctx, drawing = false, hasSig = false;
  var lastX, lastY;
  var sigMode = 'draw';      /* 'draw' = วาดเองบน canvas | 'file' = แนบไฟล์รูปภาพ */
  var fileDataURL = '';
  var hasFileSig  = false;

  function initSignaturePad() {
    canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = cssVar('--text');
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    /* scale canvas to devicePixelRatio for crisp rendering */
    var rect = canvas.getBoundingClientRect();
    canvas.width  = Math.floor(rect.width  * (window.devicePixelRatio || 1));
    canvas.height = Math.floor(rect.height * (window.devicePixelRatio || 1));
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    canvas.style.width  = rect.width  + 'px';
    canvas.style.height = rect.height + 'px';

    function getPos(e) {
      var r = canvas.getBoundingClientRect();
      var src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    }
    function start(e) {
      e.preventDefault();
      drawing = true;
      var p = getPos(e);
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      lastX = p.x; lastY = p.y;
    }
    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      var p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastX = p.x; lastY = p.y;
      hasSig = true;
    }
    function end(e) { drawing = false; }

    canvas.addEventListener('mousedown',  start);
    canvas.addEventListener('mousemove',  move);
    canvas.addEventListener('mouseup',    end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove',  move,  { passive: false });
    canvas.addEventListener('touchend',   end);
  }

  /* ── สลับโหมด วาดเอง / แนบไฟล์ ── */
  function updateSigModeUI() {
    var drawBtn  = document.getElementById('sigModeDraw');
    var fileBtn  = document.getElementById('sigModeFile');
    var drawPane = document.getElementById('sigDrawPane');
    var filePane = document.getElementById('sigFilePane');
    if (drawBtn)  drawBtn.className  = 'sigpad-mode-btn' + (sigMode === 'draw' ? ' active' : '');
    if (fileBtn)  fileBtn.className  = 'sigpad-mode-btn' + (sigMode === 'file' ? ' active' : '');
    if (drawPane) drawPane.style.display = sigMode === 'draw' ? 'block' : 'none';
    if (filePane) filePane.style.display = sigMode === 'file' ? 'block' : 'none';
  }
  window.setSigMode = function(mode) {
    sigMode = mode;
    updateSigModeUI();
  };

  /* ── รับไฟล์ที่แนบเข้ามา (ตรวจ/ย่อขนาด ผ่าน readSignatureImageFile() จาก common.js) ── */
  window.handleSigFile = function(file) {
    if (typeof readSignatureImageFile !== 'function') return;
    readSignatureImageFile(file, function(dataURL) {
      fileDataURL = dataURL;
      hasFileSig  = true;
      var img         = document.getElementById('sigFilePreviewImg');
      var wrap        = document.getElementById('sigFilePreviewWrap');
      var placeholder = document.getElementById('sigFilePlaceholder');
      if (img)         img.src = dataURL;
      if (wrap)        wrap.style.display = 'flex';
      if (placeholder) placeholder.style.display = 'none';
    }, function(errMsg) {
      if (typeof showToast === 'function') showToast('⚠ ' + errMsg, 'warn');
    });
  };

  window.clearSigFile = function() {
    fileDataURL = '';
    hasFileSig  = false;
    var input       = document.getElementById('sigFileInput');
    var wrap        = document.getElementById('sigFilePreviewWrap');
    var placeholder = document.getElementById('sigFilePlaceholder');
    if (input)       input.value = '';
    if (wrap)        wrap.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
  };

  window.clearSignature = function() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio||1), canvas.height / (window.devicePixelRatio||1));
    hasSig = false;
  };

  window.isSignatureEmpty = function() {
    return sigMode === 'file' ? !hasFileSig : !hasSig;
  };

  window.getSignatureDataURL = function() {
    if (sigMode === 'file') return fileDataURL;
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
  };

  /* init ทุกครั้งที่ modal เปิด (เพราะ canvas อาจเพิ่งถูก render)
     reset ทั้งโหมดวาดและโหมดไฟล์ กันลายเซ็นเก่าค้างข้ามไปใช้กับงานชิ้นถัดไป */
  window.initSignaturePadNow = function() {
    hasSig  = false;
    sigMode = 'draw';
    window.clearSigFile();
    updateSigModeUI();
    setTimeout(initSignaturePad, 80);
  };
})();


