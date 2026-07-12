/* ═══════════════════════════════════════════════════════════
   profile.html – ดึงข้อมูลจาก portfolio_submissions จริง
   collection: portfolio_submissions
   fields: uid, yearSem (e.g. "2567_1"), docTypeId,
           courseCode, courseName, status, files[], note, adminNote
   ═══════════════════════════════════════════════════════════ */

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* DOCUMENT_TYPES fallback (จะถูก override จาก Firestore) */
var DOCUMENT_TYPES = [
  {id:'syllabus',         label:'Course Syllabus',                  icon:'file-text',  color:'#3b82f6', bg:'#eff6ff', department:'academic'},
  {id:'lesson_plan',      label:'แผนการจัดการเรียนรู้',             icon:'book-open',  color:'#8b5cf6', bg:'#f5f3ff', department:'academic'},
  {id:'sufficiency',      label:'แผนเศรษฐกิจพอเพียง',              icon:'leaf',       color:'#22c55e', bg:'#f0fdf4', department:'academic'},
  {id:'royal_policy',     label:'แผนพระบรมราโชบาย',                icon:'crown',      color:'#f59e0b', bg:'#fffbeb', department:'academic'},
  {id:'competency',       label:'แผนสมรรถนะ',                      icon:'zap',        color:'#ec4899', bg:'#fdf2f8', department:'academic'},
  {id:'research',         label:'รายงานวิจัยในชั้นเรียน',           icon:'microscope', color:'#06b6d4', bg:'#ecfeff', department:'academic'},
  {id:'student_analysis', label:'รายงานวิเคราะห์ผู้เรียนรายบุคคล', icon:'users',      color:'#f97316', bg:'#fff7ed', department:'academic'},
  {id:'media_register',   label:'ทะเบียนสื่อ',                     icon:'library',    color:'#6366f1', bg:'#eef2ff', department:'academic'},
  {id:'student_work',     label:'ผลงานนักเรียน',                    icon:'star',       color:'#eab308', bg:'#fefce8', department:'academic'},
];
var DEPARTMENTS = [
  {id:'academic',  label:'ฝ่ายวิชาการ',        icon:'graduation-cap', color:'var(--accent)', bg:'var(--accent-tint)'},
  {id:'budget',    label:'ฝ่ายงบประมาณ',       icon:'banknote',       color:'#16a34a', bg:'#f0fdf4'},
  {id:'personnel', label:'ฝ่ายบริหารงานบุคคล',icon:'users',          color:'#7c3aed', bg:'#f5f3ff'},
  {id:'general',   label:'ฝ่ายบริหารทั่วไป',  icon:'building-2',     color:'#ea580c', bg:'#fff7ed'},
];
var STATUS_LABEL = {
  submitted:'ส่งแล้ว', head_reviewed:'หัวหน้าฯ ตรวจ',
  reviewed:'หัวหน้าฯ ตรวจ', assistant_reviewed:'ผช.ผอ. ตรวจ',
  deputy_reviewed:'รอง ผอ. ตรวจ', final_approved:'ผอ.อนุมัติ', revision:'แก้ไข'
};
function colorToBg(hex){ return (hex||'#7c3aed')+'15'; }

/* globals */
var currentUser  = null;
var currentStaff = null;
var allSemData   = []; /* [{yearSem,year,sem,docs:{docTypeId:[subDocs]}}] */

/* ── View-mode: ถ้ามี ?staffId= = admin/staff ดูโปรไฟล์คนอื่น ── */
var _urlParams   = new URLSearchParams(location.search);
var _viewStaffId = _urlParams.get('staffId') || '';  /* staff doc id */
var isViewMode   = !!_viewStaffId;                    /* true = ดูโปรไฟล์คนอื่น */
var isEmbed      = _urlParams.get('embed') === '1';   /* true = โหลดใน iframe ของ staff.html */
var _viewStaff   = null; /* staff doc ของคนที่ถูกดู (view mode) */
var _viewUid     = '';   /* uid ของคนที่ถูกดู */

/* ── AUTH + APP SHELL ── */
if (isEmbed) {
  /* Embed mode: ไม่ใช้ navbar/sidebar, แต่ยังต้องตรวจสอบ auth */
  auth.onAuthStateChanged(function(u){
    var loadEl = document.getElementById('loadingOverlay');
    if (loadEl) loadEl.style.display = 'none';
    if (!u) return;
    currentUser = u;
    var appEl = document.getElementById('profileApp');
    var tpl   = document.getElementById('profileContent');
    if (appEl) {
      appEl.classList.add('content-area');
      appEl.style.removeProperty('display');
      if (tpl) appEl.appendChild(tpl.content.cloneNode(true));
    }
    lucide.createIcons();
    init();
  });
} else {
  buildPage({
    appId:        'profileApp',
    navSubtitle:  isViewMode ? 'ดูโปรไฟล์บุคลากร' : 'My Portfolio',
    navTheme:     'blue',
    activePage:   'profile',

    onAuth: function(user, contentEl) {
      currentUser = user;
      updateNavUser(user);
      updateSidebarProfile(user);
      checkAdminAccess(user.email);

      /* inject page content จาก <template> */
      var tpl = document.getElementById('profileContent');
      if (tpl) contentEl.appendChild(tpl.content.cloneNode(true));

      lucide.createIcons();
      init();
      setupScrollTopButton();
    }
  });
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
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

function init(){
  /* ── ซ่อน edit controls ทั้งหมดถ้าอยู่ใน view mode ── */
  if(isViewMode){
    document.querySelectorAll('.edit-only').forEach(function(el){ el.style.display='none'; });
    /* แสดง back button */
    var backBar = document.getElementById('viewModeBar');
    if(backBar) backBar.style.display='flex';
  }

  /* ── โหลดข้อมูลแบบขนาน ── */
  var staffDone = false, dtDone = false;
  function tryRender(){
    if(staffDone && dtDone) loadSubmissions();
  }

  if(isViewMode){
    /* ── View mode: โหลด staff doc ด้วย staffId จาก URL ── */
    db.collection('staff').doc(_viewStaffId).get()
      .then(function(doc){
        if(doc.exists){
          _viewStaff = Object.assign({ _id: doc.id }, doc.data());
          currentStaff = _viewStaff;
          _viewUid  = _viewStaff.uid || '';
        }
      })
      .catch(function(){})
      .then(function(){
        fillHeroStatic();
        staffDone = true;
        tryRender();
      });
  } else {
    /* ── Normal mode: โหลด staff doc ด้วย email ── */
    db.collection('staff')
      .where('email','==', currentUser.email.toLowerCase()).limit(1).get()
      .then(function(snap){
        if(!snap.empty){
          currentStaff = Object.assign({ _id: snap.docs[0].id }, snap.docs[0].data());
          /* ── Sync uid กลับ staff collection เพื่อให้ view-mode ใช้ได้ ── */
          var staffDocId = snap.docs[0].id;
          var storedUid  = snap.docs[0].data().uid || '';
          if(storedUid !== currentUser.uid){
            db.collection('staff').doc(staffDocId)
              .update({ uid: currentUser.uid })
              .catch(function(){});
          }
        }
      })
      .catch(function(){})
      .then(function(){
        fillHeroStatic();
        staffDone = true;
        tryRender();
      });
  }

  /* Doc types */
  db.collection('portfolio_doc_types').orderBy('order').get()
    .then(function(snap){
      if(!snap.empty){
        var list=[];
        snap.forEach(function(d){
          var data=d.data();
          if(data.active===false) return;
          list.push({
            id: data.id||d.id, label:data.label||'', short:data.short||'',
            icon:data.icon||'file', color:data.color||'#7c3aed',
            bg: colorToBg(data.color), department:data.department||'academic'
          });
        });
        if(list.length) DOCUMENT_TYPES=list;
      }
    })
    .catch(function(){})
    .then(function(){
      dtDone = true;
      tryRender();
    });

  /* Safety timeout 8s */
  setTimeout(function(){
    if(!staffDone){ staffDone=true; fillHeroStatic(); }
    if(!dtDone){ dtDone=true; }
    tryRender();
  }, 8000);
}

/* ── Fill hero ── */
function fillHeroStatic(){
  var staff = isViewMode ? _viewStaff : currentStaff;
  var name  = (staff && staff.name) || (!isViewMode ? (currentUser.displayName || currentUser.email) : '—');
  var email = (staff && staff.email) || (!isViewMode ? currentUser.email : '');
  document.getElementById('profileName').textContent     = name;
  document.getElementById('profileEmail').textContent    = email;
  document.getElementById('profilePosition').textContent = (staff && staff.position) || '';
  document.getElementById('profileGroup').textContent    = (staff && staff.group)    || '';
  var photoURL = (staff && staff.photoURL) || (!isViewMode ? currentUser.photoURL : '');
  setAvatar(photoURL, name);
  /* อัปเดต banner */
  if(isViewMode){
    var nm = document.getElementById('viewModeName');
    if(nm) nm.textContent = 'กำลังดูโปรไฟล์: ' + name + ' — (โหมดอ่านอย่างเดียว)';
  }
  lucide.createIcons();
}

/* ── helper: uid ที่ใช้ query ── */
function _targetUid(){
  return isViewMode ? _viewUid : (currentUser ? currentUser.uid : '');
}

/* ── guard: block write ops in view mode ── */
function _assertNotViewMode(){
  if(isViewMode){ showToast('โหมดดูอย่างเดียว — ไม่สามารถแก้ไขข้อมูลได้','warn'); return false; }
  return true;
}

function setAvatar(url,name){
  var wrap=document.getElementById('avatarWrap');
  if(url){
    var img=document.createElement('img');
    img.src=url;
    img.onerror=function(){ setInitials(wrap,name); };
    wrap.innerHTML=''; wrap.appendChild(img);
  } else { setInitials(wrap,name); }
}
function setInitials(wrap,name){
  var ini=(String(name||'?')).split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase()||'?';
  wrap.innerHTML='<span class="avatar-initials">'+ini+'</span>';
}

/* ── Load all submissions ── */
function loadSubmissions(){
  /* view mode: ใช้ uid ของ staff ที่ถูกดู ถ้าไม่มี uid = ยังไม่เคย login ระบบ */
  var targetUid = isViewMode ? _viewUid : currentUser.uid;

  if(!targetUid){
    /* บุคลากรคนนี้ยังไม่เคย login → ไม่มี portfolio */
    finishRender();
    return;
  }

  db.collection('portfolio_submissions')
    .where('uid','==', targetUid)
    .get()
    .then(function(snap){ buildSemData(snap.docs); })
    .catch(function(e){
      console.error('portfolio_submissions query error:', e);
      db.collection('portfolio_submissions')
        .where('uid','==', targetUid)
        .get()
        .then(function(snap){ buildSemData(snap.docs); })
        .catch(function(e2){ console.error(e2); finishRender(); });
    });
}

/* ── Group docs by yearSem → docTypeId ── */
function buildSemData(docs){
  var map={};
  docs.forEach(function(d){
    if(!d.exists) return;
    var data=d.data();
    var ys = data.yearSem || '';
    if(!ys) return;
    if(!map[ys]) map[ys]={ yearSem:ys, docs:{} };
    var dtId = data.docTypeId || '';
    if(!dtId) return;
    if(!map[ys].docs[dtId]) map[ys].docs[dtId]=[];
    map[ys].docs[dtId].push(Object.assign({_id:d.id}, data));
  });

  /* sort yearSem desc */
  allSemData = Object.values(map).sort(function(a,b){
    return b.yearSem.localeCompare(a.yearSem);
  });

  /* parse year/sem numbers */
  allSemData.forEach(function(s){
    var parts=s.yearSem.split('_');
    s.year = parseInt(parts[0])||0;
    s.sem  = parseInt(parts[1])||0;
  });

  finishRender();
}

/* ── Compute stats & render ── */
function finishRender(){
  computeStats();
  renderSemList(allSemData);
  renderSarOverview();
  /* overlay ถูกซ่อนแล้วใน fillHeroStatic — ไม่ต้องซ่อนซ้ำ */
  lucide.createIcons();
}

function computeStats(){
  /* stats removed from hero — keep function for future use */
}

/* ── Semester tab system ── */
var currentSemFilter = 'all';
var currentSemIdx = 0;

function renderSemList(data){
  buildSemTabs(data);
}

function buildSemTabs(data){
  var bar = document.getElementById('semTabBar');
  if(!bar) return;
  if(!data || !data.length){
    bar.innerHTML = '';
    document.getElementById('semDetail').innerHTML =
      '<div style="text-align:center;padding:56px 20px;background:white;border-radius:18px;border:1.5px solid #e2e8f0;">' +
      '<div style="font-size:38px;margin-bottom:14px;">📂</div>' +
      '<div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;">ยังไม่มีข้อมูลการส่งงาน</div>' +
      '<div style="font-size:13px;color:#94a3b8;">ข้อมูลจะแสดงเมื่อมีการส่งงานในระบบ</div></div>';
    return;
  }
  /* data is sorted newest first — index 0 = current */
  bar.innerHTML = data.map(function(sem, idx){
    var isSem2 = sem.sem === 2;
    var isActive = idx === currentSemIdx;
    var bg    = isActive ? (isSem2 ? '#7c3aed' : 'var(--accent)') : 'white';
    var color = isActive ? 'white' : '#475569';
    var border= isActive ? 'transparent' : '#e2e8f0';
    var label = 'ภาค ' + sem.sem + '/' + sem.year;
    return '<button onclick="selectSemTab('+idx+')" style="' +
      'flex-shrink:0;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:700;' +
      'background:'+bg+';color:'+color+';border:1.5px solid '+border+';' +
      'cursor:pointer;white-space:nowrap;transition:all .2s;' +
      (idx===0 ? 'box-shadow:0 2px 8px rgba(0,0,0,.08);' : '') +
      '">'+label+(idx===0?'<span style="font-size:10px;margin-left:5px;opacity:.75;">ปัจจุบัน</span>':'')+'</button>';
  }).join('');
  renderSemDetail(data[currentSemIdx]);
  lucide.createIcons();
}

function selectSemTab(idx){
  currentSemIdx = idx;
  var filterVal = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : 'all';
  var data = filterVal === 'all' ? allSemData : allSemData.filter(function(sem){
    return Object.values(sem.docs).some(function(courses){
      return courses.some(function(c){ return (c.status||'submitted')===filterVal; });
    });
  });
  buildSemTabs(data);
}

function renderSemDetail(sem){
  var container = document.getElementById('semDetail');
  if(!sem){ container.innerHTML=''; return; }
  container.innerHTML = '';
  var block = buildSemBlock(sem, true);
  /* force open, hide toggle arrow */
  block.style.cursor = 'default';
  var header = block.querySelector('.sem-header');
  if(header){
    header.style.cursor = 'default';
    header.onclick = null;
    var chevron = header.querySelector('.sem-chevron');
    if(chevron) chevron.style.display = 'none';
  }
  container.appendChild(block);
  lucide.createIcons();
}

function buildSemBlock(sem, openByDefault){
  /* count submitted entries */
  var allCourses=[];
  Object.values(sem.docs).forEach(function(arr){ arr.forEach(function(c){ allCourses.push(c); }); });
  var total=allCourses.length;
  var done=allCourses.filter(function(c){ return c.status && c.status!=='none'; }).length;
  var pct=total?Math.round(done/total*100):0;
  var isSem2=sem.sem===2;

  var block=document.createElement('div');
  block.className='sem-block'+(openByDefault?' open':'');

  /* summary counts */
  var statusCounts={};
  allCourses.forEach(function(c){
    var st=c.status||'submitted';
    statusCounts[st]=(statusCounts[st]||0)+1;
  });
  var sumItems=[
    {key:'submitted',key2:'head_reviewed|reviewed',lbl:'ส่งแล้ว',          color:'#15803d'},
    {key:'head_reviewed',                           lbl:'หัวหน้าตรวจ',     color:'#0369a1'},
    {key:'reviewed',                                lbl:'ตรวจแล้ว',        color:'var(--accent-dark)'},
    {key:'assistant_reviewed',                      lbl:'ผช.ผอ.ตรวจ',      color:'#92400e'},
    {key:'deputy_reviewed',                         lbl:'รอง ผอ.ตรวจ',     color:'#6d28d9'},
    {key:'final_approved',                          lbl:'อนุมัติ',         color:'#065f46'},
    {key:'revision',                                lbl:'แก้ไข',           color:'#dc2626'},
  ].filter(function(i){ return (statusCounts[i.key]||0)>0; });

  var sumHtml='';
  if(sumItems.length){
    sumHtml='<div class="sum-strip">';
    sumItems.forEach(function(i){
      sumHtml+='<div class="sum-item">' +
        '<div class="sum-val" style="color:'+i.color+'">'+(statusCounts[i.key]||0)+'</div>' +
        '<div class="sum-lbl">'+i.lbl+'</div></div>';
    });
    sumHtml+='</div>';
  }

  block.innerHTML=
    '<div class="sem-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
      '<span class="sem-badge'+(isSem2?' sem2':'')+'">ภาค '+sem.sem+' / '+sem.year+'</span>' +
      '<div class="sem-progress-bar"><div class="sem-progress-fill'+(isSem2?' purple':'')+'" style="width:'+pct+'%"></div></div>' +
      '<span class="sem-count">'+total+' รายวิชา</span>' +
      '<i data-lucide="chevron-down" class="sem-chevron" style="width:16px;height:16px;"></i>' +
    '</div>' +
    '<div class="sem-body">' +
      sumHtml +
      buildDeptSections(sem) +
    '</div>';

  return block;
}

/* ── Build department sections inside a semester ── */
function buildDeptSections(sem){
  var html='';
  DEPARTMENTS.forEach(function(dep){
    var dtInDep = DOCUMENT_TYPES.filter(function(dt){ return dt.department===dep.id; });
    var hasAny  = dtInDep.some(function(dt){ return (sem.docs[dt.id]||[]).length>0; });
    if(!hasAny) return;

    html+='<div class="dept-header">' +
      '<div style="width:28px;height:28px;border-radius:8px;background:'+dep.bg+';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
        '<i data-lucide="'+dep.icon+'" style="width:14px;height:14px;color:'+dep.color+';"></i>' +
      '</div>' +
      '<span style="font-size:13px;font-weight:800;color:#0f172a;">'+dep.label+'</span>' +
      '<div class="dept-divider"></div>' +
    '</div>';

    dtInDep.forEach(function(dt){
      var courses = sem.docs[dt.id] || [];
      if(!courses.length) return;
      html += buildDocGroup(dt, courses);
    });
  });

  /* doc types ที่ไม่มี department match */
  var unmapped=[];
  Object.keys(sem.docs).forEach(function(dtId){
    var found=DOCUMENT_TYPES.find(function(x){ return x.id===dtId; });
    if(!found) unmapped.push({id:dtId, label:dtId, icon:'file', color:'#64748b', bg:'#f8fafc', department:'other'});
  });
  unmapped.forEach(function(dt){
    var courses=sem.docs[dt.id]||[];
    if(!courses.length) return;
    html+=buildDocGroup(dt, courses);
  });

  if(!html) html='<div class="empty-block">ยังไม่มีการส่งงานในภาคเรียนนี้</div>';
  return '<div style="padding:0 0 12px;">'+html+'</div>';
}

function buildDocGroup(dt, courses){
  /* aggregate status */
  var anyRevision = courses.some(function(c){ return (c.status||'')==='revision'; });
  var allFinal    = courses.every(function(c){ return (c.status||'')==='final_approved'; });
  var allReviewed = courses.every(function(c){
    return ['head_reviewed','reviewed','assistant_reviewed','deputy_reviewed','final_approved'].indexOf(c.status||'submitted')>=0;
  });
  var groupBadge, groupBadgeClass;
  if(anyRevision){  groupBadge='มีรายวิชาแก้ไข'; groupBadgeClass='s-revision'; }
  else if(allFinal){ groupBadge='ผอ.อนุมัติครบ'; groupBadgeClass='s-final_approved'; }
  else if(allReviewed){ groupBadge='อยู่ระหว่างตรวจ'; groupBadgeClass='s-reviewed'; }
  else { groupBadge='ส่งแล้ว '+courses.length+' วิชา'; groupBadgeClass='s-submitted'; }

  var borderLeft = anyRevision ? '#f59e0b' : allFinal ? '#7c3aed' : '#22c55e';

  var courseRows='';
  courses.forEach(function(c){
    var st   = c.status||'submitted';
    var stLbl= STATUS_LABEL[st]||st;
    var files= c.files||[];
    courseRows+=
      '<div class="course-row">' +
        (c.courseCode ? '<span class="course-code">'+esc(c.courseCode)+'</span>' : '') +
        '<span class="course-name">'+esc(c.courseName||c.courseCode||'—')+'</span>' +
        '<span class="file-count">'+files.length+' ไฟล์</span>' +
        '<span class="s-badge s-'+st+'">'+stLbl+'</span>' +
      '</div>' +
      (c.adminNote && st==='revision' ?
        '<div style="padding:0 14px 8px;"><div class="admin-note">💬 '+esc(c.adminNote)+'</div></div>' : '');
  });

  return '<div class="doc-group" style="border-left:3px solid '+borderLeft+';">' +
    '<div class="doc-group-header">' +
      '<div class="doc-icon-box" style="background:'+dt.bg+';">' +
        '<i data-lucide="'+dt.icon+'" style="width:18px;height:18px;color:'+dt.color+';"></i>' +
      '</div>' +
      '<span class="doc-group-title">'+esc(dt.label)+'</span>' +
      '<span class="s-badge '+groupBadgeClass+'">'+groupBadge+'</span>' +
    '</div>' +
    courseRows +
  '</div>';
}

/* ── Subtab switch ── */
function switchSubtab(id, btn){
  document.querySelectorAll('.subtab-panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.subtab-btn').forEach(function(b){ b.classList.remove('active'); });
  document.getElementById('panel-'+id).classList.add('active');
  btn.classList.add('active');
  if(id==='personal')    { loadPersonal(); loadEducation(); }
  if(id==='career')      loadCareerHistory();

  if(id==='teaching')    loadTeaching();
  if(id==='duties')      loadDuties();
  if(id==='development') loadDevelopment();
  if(id==='media')       loadMedia();
  if(id==='sar')         renderSarOverview();
}

/* ════════════════════════════════════════
   SAR OVERVIEW – render all sections
   ════════════════════════════════════════ */
function renderSarOverview(){
  renderSarPersonal();
  renderSarEducation();
  renderSarSchoolHistory();
  renderSarTeaching();
  renderSarDuties();
  renderSarDev();
  renderSarMedia();
  loadPortfolioForSar();
  if(!personalData||!personalData.uid) loadPersonalForSar();
  if(!educationItems.length)           loadEducationForSar();
  if(!careerHistoryItems.length)       loadCareerHistoryForSar();
  if(!teachingItems.length)            loadTeachingForSar();
  if(!dutyItems.length)                loadDutiesForSar();
  if(!devItems.length)                 loadDevForSar();
  if(!mediaItems.length)               loadMediaForSar();
}

function sarVal(v){ return v ? '<span class="sar-val">'+esc(v)+'</span>' : '<span class="sar-val empty-val">—</span>'; }
function sarRow(lbl,v){ return '<div class="sar-row"><span class="sar-lbl">'+lbl+'</span>'+sarVal(v)+'</div>'; }

function renderSarPersonal(){
  var p = personalData  || {};
  var a = adminSyncData || {};
  var name     = a.name     || (currentStaff&&currentStaff.name)     || p.fullname || '';
  var position = a.position || (currentStaff&&currentStaff.position) || '';
  var group    = a.group    || (currentStaff&&currentStaff.group)    || '';
  var acrank   = a.academic_rank || '';
  var birthday = thDate(p.birthday);
  var age      = calcAge(p.birthday);
  var html =
    sarRow('ชื่อ-นามสกุล',       name) +
    sarRow('ตำแหน่ง',            position) +
    sarRow('กลุ่มสาระ / กลุ่มงาน', group) +
    (acrank ? sarRow('วิทยฐานะ', acrank) : '') +
    sarRow('วันเกิด',            birthday + (age?' (อายุ '+age+')':'')) +
    sarRow('สัญชาติ',            p.nationality||'') +
    sarRow('เชื้อชาติ',          p.ethnicity||'') +
    sarRow('ศาสนา',              p.religion||'') +
    sarRow('ที่อยู่ปัจจุบัน',    p.address||'') +
    sarRow('เบอร์โทรศัพท์',      a.phone||p.phone||'');
  document.getElementById('sar-personal-body').innerHTML = html || '<div class="sar-empty">ยังไม่มีข้อมูล</div>';
  lucide.createIcons();
}

function renderSarSchoolHistory(){
  var el = document.getElementById('sar-career-body');
  if(!el) return;
  if(!careerHistoryItems.length){
    el.innerHTML = '<div class="sar-empty">ยังไม่มีข้อมูลประวัติการทำงาน</div>';
    return;
  }
  var colors      = ['#22c55e','#3b82f6','#f59e0b','#ec4899','#06b6d4','#7c3aed','#f97316'];
  var borderColors= ['#bbf7d0','#bfdbfe','#fde68a','#fbcfe8','#a5f3fc','#c4b5fd','#fed7aa'];
  el.innerHTML = '<div class="career-timeline" style="height:100%;">' +
    careerHistoryItems.map(function(item, idx){
      var col = colors[idx % colors.length];
      var bdr = borderColors[idx % borderColors.length];
      var isFirst   = idx === 0;
      var isCurrent = !item.end_date;
      var periodStr = item.start_date ? thDate(item.start_date) : '';
      if(item.end_date) periodStr += ' – ' + thDate(item.end_date);
      var durStr = '';
      if(item.start_date){
        var from = new Date(item.start_date);
        var to   = item.end_date ? new Date(item.end_date) : new Date();
        var yy = to.getFullYear()-from.getFullYear(), mm = to.getMonth()-from.getMonth();
        if(mm<0){yy--;mm+=12;}
        if(yy>0||mm>0) durStr = yy+' ปี '+mm+' เดือน';
      }
      var labelBadge = '';
      if(isFirst)   labelBadge += '<span style="font-size:10px;font-weight:800;color:#15803d;background:#dcfce7;border:1px solid #86efac;padding:2px 8px;border-radius:20px;margin-right:4px;">🟢 แรกบรรจุ</span>';
      if(isCurrent) labelBadge += '<span style="font-size:10px;font-weight:800;color:#0369a1;background:#e0f2fe;padding:2px 8px;border-radius:20px;">ปัจจุบัน</span>';
      return '<div class="ct-node">' +
        '<div class="ct-dot" style="color:'+col+';background:'+bdr+';">' +
          '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="'+col+'"/></svg>' +
        '</div>' +
        '<div class="ct-card" style="border-color:'+bdr+';">' +
          (labelBadge ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">'+labelBadge+'</div>' : '') +
          (periodStr  ? '<div class="ct-period"><i data-lucide="calendar" style="width:11px;height:11px;"></i>'+esc(periodStr)+'</div>' : '') +
          '<div class="ct-school">'+esc(item.school||'')+'</div>' +
          (item.department?'<div class="ct-dept">'+esc(item.department)+'</div>':'') +
          '<div class="ct-chips">' +
            (item.position?'<span class="ct-chip" style="background:var(--accent-tint);color:var(--accent);">'+esc(item.position)+'</span>':'') +
            (item.academic_rank?'<span class="ct-chip" style="background:#fffbeb;color:#b45309;">'+esc(item.academic_rank)+'</span>':'') +
          '</div>' +
          (durStr?'<div class="ct-service-bar" style="margin-top:8px;"></div><div class="ct-service-lbl">ระยะเวลา '+durStr+'</div>':'') +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
  lucide.createIcons();
}

function renderSarTeaching(){
  var el=document.getElementById('sar-teaching-body');
  if(!teachingItems.length){ el.innerHTML='<div class="sar-empty">ยังไม่มีข้อมูลภาระงานสอน</div>'; return; }
  var total=0;
  var rows=teachingItems.map(function(item){
    total+=(parseInt(item.periods)||0);
    return '<div class="sar-teach-row">' +
      (item.code?'<span class="sar-teach-code">'+esc(item.code)+'</span>':'') +
      '<span class="sar-teach-name">'+esc(item.name||'')+'</span>' +
      '<span class="sar-teach-periods">'+esc(String(item.periods||0))+' คาบ/สัปดาห์</span>' +
      (item.level?'<span class="sar-teach-level">'+esc(item.level)+'</span>':'') +
    '</div>';
  }).join('');
  el.innerHTML = rows + '<div class="sar-teach-total">รวม '+total+' คาบ/สัปดาห์</div>';
}

function renderSarDuties(){
  var el=document.getElementById('sar-duties-body');
  if(!dutyItems.length){ el.innerHTML='<div class="sar-empty">ยังไม่มีข้อมูลงานที่ได้รับมอบหมาย</div>'; return; }
  var colors=['#f97316','#1d4ed8','#7c3aed','#16a34a','#e11d48','#0891b2'];
  el.innerHTML=dutyItems.map(function(item,i){
    return '<div class="sar-row" style="align-items:flex-start;">' +
      '<div class="sar-duty-dot" style="width:8px;height:8px;border-radius:50%;background:'+colors[i%colors.length]+';flex-shrink:0;margin-top:5px;"></div>' +
      '<span class="sar-duty-text">'+esc(item.task||'')+'</span>' +
      (item.group?'<span class="sar-duty-group">'+esc(item.group)+'</span>':'') +
    '</div>';
  }).join('');
}

function renderSarDev(){
  var el=document.getElementById('sar-dev-body');
  if(!devItems.length){ el.innerHTML='<div class="sar-empty">ยังไม่มีข้อมูลการพัฒนาตนเอง</div>'; return; }
  el.innerHTML=devItems.map(function(item){
    return '<div class="sar-dev-item">' +
      '<div class="sar-dev-dot"></div>' +
      '<div><div class="sar-dev-title">'+esc(item.title||'')+'</div>' +
        '<div class="sar-dev-meta">'+(item.organizer?esc(item.organizer)+' · ':'')+(item.date_str?esc(item.date_str):'')+(item.hours?' · '+item.hours+' ชม.':'')+'</div>' +
      '</div></div>';
  }).join('');
}

function renderSarMedia(){
  var el=document.getElementById('sar-media-body');
  if(!mediaItems.length){ el.innerHTML='<div class="sar-empty">ยังไม่มีข้อมูลสื่อนวัตกรรม</div>'; return; }
  el.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">' +
    mediaItems.map(function(item){
      return '<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;display:flex;align-items:flex-start;gap:9px;">' +
        '<div class="sar-media-icon"><i data-lucide="'+(item.icon||'layout-grid')+'" style="width:15px;height:15px;color:#06b6d4;"></i></div>' +
        '<div style="min-width:0;"><div class="sar-media-name">'+esc(item.name||'')+'</div>' +
          (item.subject?'<div class="sar-media-sub">'+esc(item.subject)+'</div>':'') +
          (item.url?'<a href="'+esc(item.url)+'" target="_blank" style="font-size:10px;color:var(--accent);font-weight:700;">เปิดลิงก์</a>':'') +
        '</div></div>';
    }).join('') + '</div>';
  lucide.createIcons();
}

/* SAR data loaders */
/* ─── SECTION: ประวัติการศึกษา ─── */
var educationItems = [];
var EDU_LEVEL_OPTS = ['ต่ำกว่าปริญญาตรี','ปริญญาตรี','ปริญญาโท','ปริญญาเอก'];
var EDU_COLORS = { 'ต่ำกว่าปริญญาตรี':'#64748b', 'ปริญญาตรี':'#1d4ed8', 'ปริญญาโท':'#7c3aed', 'ปริญญาเอก':'#0369a1' };
var EDU_BG    = { 'ต่ำกว่าปริญญาตรี':'#f1f5f9', 'ปริญญาตรี':'#eff6ff', 'ปริญญาโท':'#f5f3ff', 'ปริญญาเอก':'#e0f2fe' };

function loadEducation(){
  if(!currentUser) return;
  db.collection('staff_education').where('uid','==',_targetUid()).get()
    .then(function(snap){
      educationItems = [];
      snap.forEach(function(d){ educationItems.push(Object.assign({_id:d.id},d.data())); });
      var levelOrder = {'ต่ำกว่าปริญญาตรี':0,'ปริญญาตรี':1,'ปริญญาโท':2,'ปริญญาเอก':3};
      educationItems.sort(function(a,b){ return (levelOrder[a.level]||0)-(levelOrder[b.level]||0); });
      renderEducation();
    }).catch(function(e){ console.error('loadEducation error:',e); renderEducation(); });
}

function renderEducation(){
  var el = document.getElementById('educationList');
  if(!el) return;
  if(!educationItems.length){
    el.innerHTML = '<div class="empty-block" style="padding:24px 16px;">' +
      '<div style="font-size:28px;margin-bottom:8px;">🎓</div>' +
      '<div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:3px;">ยังไม่มีข้อมูลการศึกษา</div>' +
      '<div style="font-size:12px;color:#94a3b8;">กด "+ เพิ่ม" เพื่อบันทึกประวัติการศึกษา</div>' +
    '</div>';
    return;
  }
  var levelOrder = {'ต่ำกว่าปริญญาตรี':0,'ปริญญาตรี':1,'ปริญญาโท':2,'ปริญญาเอก':3};
  var sorted = educationItems.slice().sort(function(a,b){ return (levelOrder[a.level]||0)-(levelOrder[b.level]||0); });
  el.innerHTML = '<div style="display:grid;gap:10px;">' +
    sorted.map(function(item){
      var col = EDU_COLORS[item.level] || '#64748b';
      var bg  = EDU_BG[item.level]    || '#f8fafc';
      return '<div style="background:'+bg+';border:1.5px solid '+col+'22;border-left:4px solid '+col+';border-radius:12px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">' +
            '<span style="font-size:10px;font-weight:800;color:'+col+';background:white;border:1px solid '+col+'44;padding:2px 9px;border-radius:20px;">'+esc(item.level||'')+'</span>' +
            (item.degree ? '<span style="font-size:12px;font-weight:700;color:#0f172a;">'+esc(item.degree)+'</span>' : '') +
          '</div>' +
          (item.institution ? '<div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:3px;">'+esc(item.institution)+'</div>' : '') +
          (item.major ? '<div style="font-size:11px;font-weight:600;color:#64748b;">วิชาเอก: '+esc(item.major)+'</div>' : '') +
          (item.grad_year ? '<div style="font-size:11px;font-weight:600;color:#94a3b8;margin-top:3px;">ปีที่สำเร็จการศึกษา: '+esc(item.grad_year)+'</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:5px;flex-shrink:0;">' +
          '<button class="del-btn" style="background:var(--accent-tint);" onclick="editEducationItem(\''+item._id+'\')" title="แก้ไข">' +
            '<i data-lucide="pencil" style="width:13px;height:13px;color:var(--accent);"></i></button>' +
          '<button class="del-btn" onclick="deleteEducationItem(\''+item._id+'\')" title="ลบ">' +
            '<i data-lucide="trash-2" style="width:13px;height:13px;color:#ef4444;"></i></button>' +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
  lucide.createIcons();
}

function addEducationItem(editId, prefill){
  prefill = prefill || {};
  var html = '<div id="eduModal" style="position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);">' +
    '<div style="background:white;border-radius:20px;width:100%;max-width:440px;padding:26px;">' +
    '<h3 style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:18px;">'+(editId?'แก้ไข':'เพิ่ม')+' ประวัติการศึกษา</h3>' +
    '<div style="display:grid;gap:13px;">' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">ระดับการศึกษา</div>' +
        '<select id="em_level" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;">' +
          EDU_LEVEL_OPTS.map(function(l){ return '<option'+(prefill.level===l?' selected':'')+'>'+l+'</option>'; }).join('') +
        '</select></div>' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">สถาบันที่เรียน</div>' +
        '<input type="text" id="em_institution" value="'+esc(prefill.institution||'')+'" placeholder="เช่น มหาวิทยาลัยราชภัฏบุรีรัมย์"></div>' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">วุฒิการศึกษา</div>' +
        '<input type="text" id="em_degree" value="'+esc(prefill.degree||'')+'" placeholder="เช่น ครุศาสตรบัณฑิต, วท.บ."></div>' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">วิชาเอก / สาขาวิชา</div>' +
        '<input type="text" id="em_major" value="'+esc(prefill.major||'')+'" placeholder="เช่น คอมพิวเตอร์ศึกษา"></div>' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">ปีที่สำเร็จการศึกษา (พ.ศ.)</div>' +
        '<input type="text" id="em_grad_year" value="'+esc(prefill.grad_year||'')+'" placeholder="เช่น 2558" maxlength="4"></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end;">' +
      '<button class="btn-secondary" onclick="document.getElementById(\'eduModal\').remove()">ยกเลิก</button>' +
      '<button class="btn-primary purple" onclick="saveEducationItem(\''+( editId||'')+'\')"><i data-lucide="check" style="width:14px;height:14px;"></i> บันทึก</button>' +
    '</div>' +
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  lucide.createIcons();
}

function editEducationItem(id){
  var item = educationItems.find(function(x){ return x._id===id; });
  if(!item) return;
  addEducationItem(id, item);
}

function saveEducationItem(editId){
  if(!_assertNotViewMode()) return;
  var level       = document.getElementById('em_level').value;
  var institution = document.getElementById('em_institution').value.trim();
  var degree      = document.getElementById('em_degree').value.trim();
  var major       = document.getElementById('em_major').value.trim();
  var grad_year   = document.getElementById('em_grad_year').value.trim();
  if(!institution){ showToast('กรุณากรอกสถาบันที่เรียน','warn'); return; }
  var levelOrder  = {'ต่ำกว่าปริญญาตรี':0,'ปริญญาตรี':1,'ปริญญาโท':2,'ปริญญาเอก':3};
  var data = { uid:currentUser.uid, level:level, institution:institution, degree:degree, major:major, grad_year:grad_year, sort_order:levelOrder[level]||0 };
  var col = db.collection('staff_education');
  var p = editId ? col.doc(editId).set(data) : col.add(data);
  p.then(function(){
    document.getElementById('eduModal').remove();
    showToast(editId?'อัปเดตแล้ว':'เพิ่มข้อมูลแล้ว','success');
    loadEducation();
  }).catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}

function deleteEducationItem(id){
  if(!_assertNotViewMode()) return;
  if(!confirm('ลบรายการนี้?')) return;
  db.collection('staff_education').doc(id).delete()
    .then(function(){ showToast('ลบแล้ว'); loadEducation(); })
    .catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}

function loadPersonalForSar(){
  if(!currentUser) return;
  var email = isViewMode
    ? ((_viewStaff && _viewStaff.email) || '')
    : currentUser.email.toLowerCase();
  Promise.all([
    db.collection('staff_profile').doc(_targetUid()).get().catch(function(){ return null; }),
    db.collection('staff_profile_sync').doc(email).get().catch(function(){ return null; })
  ]).then(function(results){
    var profileDoc = results[0];
    var syncDoc    = results[1];
    if(profileDoc && profileDoc.exists) personalData  = profileDoc.data();
    if(syncDoc    && syncDoc.exists)    adminSyncData = syncDoc.data();
    renderSarPersonal();
  });
}
function loadCareerForSar(){
  if(!currentUser) return;
  db.collection('staff_profile').doc(_targetUid()).get().then(function(d){
    careerData = d.exists ? d.data() : {};
    renderSarCareer();
  }).catch(function(){});
}
function renderSarEducation(){
  var el = document.getElementById('sar-education-body');
  if(!el) return;
  if(!educationItems.length){
    el.innerHTML = '<div class="sar-empty">ยังไม่มีข้อมูลการศึกษา</div>';
    return;
  }
  var levelOrder = {'ต่ำกว่าปริญญาตรี':0,'ปริญญาตรี':1,'ปริญญาโท':2,'ปริญญาเอก':3};
  var sorted = educationItems.slice().sort(function(a,b){ return (levelOrder[a.level]||0)-(levelOrder[b.level]||0); });
  el.innerHTML = sorted.map(function(item){
    var col = EDU_COLORS[item.level] || '#64748b';
    var bg  = EDU_BG[item.level]    || '#f8fafc';
    return '<div class="sar-row" style="align-items:flex-start;gap:10px;padding:8px 0;">' +
      '<div style="width:8px;height:8px;border-radius:50%;background:'+col+';flex-shrink:0;margin-top:5px;"></div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">' +
          '<span style="font-size:10px;font-weight:800;color:'+col+';background:'+bg+';border:1px solid '+col+'44;padding:1px 7px;border-radius:20px;">'+esc(item.level||'')+'</span>' +
          (item.degree ? '<span style="font-size:12px;font-weight:700;color:#0f172a;">'+esc(item.degree)+'</span>' : '') +
        '</div>' +
        (item.institution ? '<div style="font-size:12px;font-weight:600;color:#334155;">'+esc(item.institution)+'</div>' : '') +
        (item.major ? '<div style="font-size:11px;color:#94a3b8;">วิชาเอก: '+esc(item.major)+'</div>' : '') +
        (item.grad_year ? '<div style="font-size:11px;color:#94a3b8;">สำเร็จการศึกษา พ.ศ. '+esc(item.grad_year)+'</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function loadEducationForSar(){
  if(!currentUser) return;
  db.collection('staff_education').where('uid','==',_targetUid()).get()
    .then(function(snap){
      educationItems = [];
      snap.forEach(function(d){ educationItems.push(Object.assign({_id:d.id},d.data())); });
      var levelOrder = {'ต่ำกว่าปริญญาตรี':0,'ปริญญาตรี':1,'ปริญญาโท':2,'ปริญญาเอก':3};
      educationItems.sort(function(a,b){ return (levelOrder[a.level]||0)-(levelOrder[b.level]||0); });
      renderSarEducation();
    }).catch(function(){});
}

function loadCareerHistoryForSar(){
  if(!currentUser) return;
  db.collection('staff_career_history').where('uid','==',_targetUid()).get()
    .then(function(snap){
      careerHistoryItems = [];
      snap.forEach(function(d){ careerHistoryItems.push(Object.assign({_id:d.id},d.data())); });
      careerHistoryItems.sort(function(a,b){ return (a.start_date||'').localeCompare(b.start_date||''); });
      renderSarSchoolHistory();
    }).catch(function(){});
}
function loadTeachingForSar(){
  if(!currentUser) return;
  db.collection('staff_teaching').where('uid','==',_targetUid()).get()
    .then(function(snap){
      teachingItems=[];
      snap.forEach(function(d){ teachingItems.push(Object.assign({_id:d.id},d.data())); });
      renderSarTeaching();
    }).catch(function(){});
}
function loadDutiesForSar(){
  if(!currentUser) return;
  db.collection('staff_duties').where('uid','==',_targetUid()).get()
    .then(function(snap){
      dutyItems=[];
      snap.forEach(function(d){ dutyItems.push(Object.assign({_id:d.id},d.data())); });
      renderSarDuties();
    }).catch(function(){});
}
function loadDevForSar(){
  if(!currentUser) return;
  db.collection('staff_development').where('uid','==',_targetUid()).get()
    .then(function(snap){
      devItems=[];
      snap.forEach(function(d){ devItems.push(Object.assign({_id:d.id},d.data())); });
      renderSarDev();
    }).catch(function(){});
}
function loadMediaForSar(){
  if(!currentUser) return;
  db.collection('staff_media').where('uid','==',_targetUid()).get()
    .then(function(snap){
      mediaItems=[];
      snap.forEach(function(d){ mediaItems.push(Object.assign({_id:d.id},d.data())); });
      renderSarMedia();
    }).catch(function(){});
}
/* ════════════════ END SAR OVERVIEW ════════════════ */

/* ════════════════════════════════════════
   HELPER: auto compute age from birthday
   ════════════════════════════════════════ */
function calcAge(dateStr){
  if(!dateStr) return '';
  var d=new Date(dateStr), now=new Date();
  var age=now.getFullYear()-d.getFullYear();
  var m=now.getMonth()-d.getMonth();
  if(m<0||(m===0&&now.getDate()<d.getDate())) age--;
  return age+' ปี';
}
function calcService(dateStr){
  if(!dateStr) return '';
  var d=new Date(dateStr), now=new Date();
  var yy=now.getFullYear()-d.getFullYear();
  var mm=now.getMonth()-d.getMonth();
  if(mm<0){ yy--; mm+=12; }
  return yy+' ปี '+mm+' เดือน';
}
function thDate(dateStr){
  if(!dateStr) return '';
  var d=new Date(dateStr);
  var months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  return d.getDate()+' '+months[d.getMonth()]+' '+(d.getFullYear()+543);
}
function setValEl(id, val){
  var el=document.getElementById(id);
  if(!el) return;
  el.textContent=val||'—';
  el.classList.toggle('empty',!val);
}

/* ─── SECTION: ข้อมูลส่วนตัว ─── */
var personalData  = {};  /* user-owned fields */
var adminSyncData = {};  /* admin-owned fields จาก staff_profile_sync */

function loadPersonal(){
  if(!currentUser) return;
  var email = isViewMode
    ? ((_viewStaff && _viewStaff.email) || '')
    : currentUser.email.toLowerCase();

  /* โหลดทั้งสอง collection พร้อมกัน แล้ว merge */
  Promise.all([
    db.collection('staff_profile').doc(_targetUid()).get().catch(function(){ return null; }),
    db.collection('staff_profile_sync').doc(email).get().catch(function(){ return null; })
  ]).then(function(results){
    var profileDoc = results[0];
    var syncDoc    = results[1];

    personalData  = (profileDoc && profileDoc.exists) ? profileDoc.data() : {};
    adminSyncData = (syncDoc    && syncDoc.exists)    ? syncDoc.data()    : {};

    renderPersonalView();
  });
}
function renderPersonalView(){
  var p = personalData;
  var a = adminSyncData;

  /* Admin-owned: ใช้จาก sync ก่อน fallback staff */
  setValEl('v_fullname',  a.name     || (currentStaff&&currentStaff.name) || p.fullname || '');
  setValEl('v_position',  a.position || (currentStaff&&currentStaff.position) || '');
  setValEl('v_group',     a.group    || (currentStaff&&currentStaff.group) || '');
  setValEl('v_acrank',    a.academic_rank || '');

  /* User-owned */
  setValEl('v_birthday',    thDate(p.birthday));
  setValEl('v_age',         calcAge(p.birthday));
  setValEl('v_nationality', p.nationality||'');
  document.getElementById('v_ethnicity').textContent = p.ethnicity||'—';
  setValEl('v_religion',    p.religion||'');
  setValEl('v_phone',       a.phone||p.phone||'');
  setValEl('v_address',     p.address||'');

  loadEducation();
  lucide.createIcons();
}
function editSection(section){
  if(!_assertNotViewMode()) return;
  var viewEl=document.getElementById(section+'View');
  var editEl=document.getElementById(section+'Edit');
  viewEl.style.display='none'; editEl.style.display='block';
  /* fill inputs */
  if(section==='personal'){
    var p = personalData;
    var a = adminSyncData;
    /* fill staff-linked (synced) fields — editable ทั้งสองฝั่ง */
    document.getElementById('e_fullname').value = a.name          || (currentStaff&&currentStaff.name)          || '';
    document.getElementById('e_position').value = a.position      || (currentStaff&&currentStaff.position)      || '';
    document.getElementById('e_group').value    = a.group         || (currentStaff&&currentStaff.group)         || '';
    document.getElementById('e_acrank').value   = a.academic_rank || (currentStaff&&currentStaff.academic_rank) || '';
    /* fill user-editable inputs */
    document.getElementById('e_birthday').value    = p.birthday    || '';
    document.getElementById('e_nationality').value = p.nationality || '';
    document.getElementById('e_ethnicity').value   = p.ethnicity   || '';
    document.getElementById('e_religion').value    = p.religion    || '';
    document.getElementById('e_phone').value       = a.phone       || p.phone || '';
    document.getElementById('e_address').value     = p.address     || '';
  } else if(section==='career'){
    var c=careerData;
    document.getElementById('e_start_date').value    = c.start_date     || '';
    document.getElementById('e_cur_position').value  = c.cur_position   || (currentStaff&&currentStaff.position)||'';
    document.getElementById('e_academic_rank').value = c.academic_rank  || '';
    document.getElementById('e_cur_school').value    = c.cur_school     || '';
    document.getElementById('e_department').value    = c.department     || '';
    document.getElementById('e_first_school').value  = c.first_school   || '';
    document.getElementById('e_cur_school_date').value = c.cur_school_date || '';
    document.getElementById('e_subject_group').value = c.subject_group  || (currentStaff&&currentStaff.group)||'';
    document.getElementById('e_major_subject').value = c.major_subject  || '';
  }
  /* replace edit button with save/cancel */
  var actionsEl=document.getElementById(section+'Actions') ||
    document.querySelector('#panel-'+section+' .btn-primary')?.parentElement;
  /* inject save/cancel inline */
  var editBar=editEl.nextElementSibling || editEl;
  /* simpler: swap button in header */
  var hdr=document.querySelector('#panel-'+section+' .info-card > div:first-child');
  hdr.querySelector('.btn-primary').style.display='none';
  var sc=document.createElement('div');
  sc.id='sc_'+section;
  sc.style.display='flex'; sc.style.gap='8px';
  sc.innerHTML='<button class="btn-approve" onclick="saveSection(\''+section+'\')">' +
    '<i data-lucide="check" style="width:14px;height:14px;"></i> บันทึก</button>' +
    '<button class="btn-secondary" onclick="cancelSection(\''+section+'\')">' +
    '<i data-lucide="x" style="width:14px;height:14px;"></i> ยกเลิก</button>';
  hdr.appendChild(sc);
  lucide.createIcons();
}
function cancelSection(section){
  document.getElementById(section+'View').style.display='block';
  document.getElementById(section+'Edit').style.display='none';
  var sc=document.getElementById('sc_'+section); if(sc) sc.remove();
  var hdr=document.querySelector('#panel-'+section+' .info-card > div:first-child');
  var eb=hdr.querySelector('.btn-primary'); if(eb) eb.style.display='';
}
function saveSection(section){
  if(!_assertNotViewMode()) return;
  var now = firebase.firestore.FieldValue.serverTimestamp();
  var profileRef = db.collection('staff_profile').doc(_targetUid());

  if(section==='personal'){
    var phoneVal    = document.getElementById('e_phone').value.trim();
    var nameVal     = document.getElementById('e_fullname').value.trim();
    var positionVal = document.getElementById('e_position').value.trim();
    var groupVal    = document.getElementById('e_group').value;
    var acrankVal   = document.getElementById('e_acrank').value;

    if(!nameVal)     { showToast('กรุณากรอกชื่อ-นามสกุล','warn');          return; }
    if(!positionVal) { showToast('กรุณากรอกตำแหน่ง','warn');               return; }
    if(!groupVal)     { showToast('กรุณาเลือกกลุ่มสาระ / กลุ่มงาน','warn'); return; }

    var userFields = {
      uid:         currentUser.uid,
      birthday:    document.getElementById('e_birthday').value,
      nationality: document.getElementById('e_nationality').value.trim(),
      ethnicity:   document.getElementById('e_ethnicity').value.trim(),
      religion:    document.getElementById('e_religion').value.trim(),
      phone:       phoneVal,
      address:     document.getElementById('e_address').value.trim(),
      updatedAt:   now
    };
    /* merge=true เพื่อไม่ทับ field อื่นที่มีอยู่ใน staff_profile */
    var savePromises = [ profileRef.set(userFields, { merge: true }) ];

    /* ── field ที่ลิงก์กับ staff.html (ชื่อ/ตำแหน่ง/กลุ่มสาระ/วิทยฐานะ/เบอร์โทร)
       เขียนกลับ 2 ที่: staff_profile_sync (ให้ profile.html ทุกคนอ่านทันที)
       และ staff/{docId} โดยตรง (ให้ staff.html ที่ฟัง onSnapshot เห็นทันทีด้วย) ── */
    var syncEmail  = currentUser.email.toLowerCase();
    var staffLinkedFields = {
      name:          nameVal,
      position:      positionVal,
      group:         groupVal,
      academic_rank: acrankVal,
      phone:         phoneVal
    };
    if(syncEmail){
      savePromises.push(
        db.collection('staff_profile_sync').doc(syncEmail).set(Object.assign({
          email:    syncEmail,
          syncedAt: now,
          syncedBy: 'user'
        }, staffLinkedFields), { merge: true })
      );
    }
    if(currentStaff && currentStaff._id){
      savePromises.push(
        db.collection('staff').doc(currentStaff._id).update(Object.assign({
          updatedAt: now
        }, staffLinkedFields))
      );
    }

    Promise.all(savePromises)
      .then(function(){
        /* อัปเดต personalData / adminSyncData / currentStaff ใน memory */
        Object.assign(personalData, userFields);
        Object.assign(adminSyncData, staffLinkedFields);
        if(currentStaff) Object.assign(currentStaff, staffLinkedFields);
        showToast('บันทึกข้อมูลส่วนตัวแล้ว','success');
        cancelSection('personal');
        renderPersonalView();
        fillHeroStatic();
      })
      .catch(function(e){
        console.error('saveSection personal error:', e);
        showToast('เกิดข้อผิดพลาด: ' + (e.message||e), 'error');
      });

  } else if(section==='career'){
    careerData={
      uid:             currentUser.uid,
      start_date:      document.getElementById('e_start_date').value,
      cur_position:    document.getElementById('e_cur_position').value.trim(),
      academic_rank:   document.getElementById('e_academic_rank').value,
      cur_school:      document.getElementById('e_cur_school').value.trim(),
      department:      document.getElementById('e_department').value.trim(),
      first_school:    document.getElementById('e_first_school').value.trim(),
      cur_school_date: document.getElementById('e_cur_school_date').value,
      subject_group:   document.getElementById('e_subject_group').value.trim(),
      major_subject:   document.getElementById('e_major_subject').value.trim(),
      updatedAt:       now
    };
    profileRef.set(careerData, {merge:true})
      .then(function(){
        showToast('บันทึกประวัติการทำงานแล้ว','success');
        cancelSection('career');
        renderCareerView();
        /* sync ไปยัง staff — best-effort */
        db.collection('staff').where('email','==', currentUser.email.toLowerCase()).limit(1).get()
          .then(function(snap){
            if(snap.empty) return;
            var updates = { updatedAt: now };
            if(careerData.cur_position)  updates.position = careerData.cur_position;
            if(careerData.subject_group) updates.group    = careerData.subject_group;
            if(careerData.academic_rank) updates.role     = careerData.academic_rank;
            snap.docs[0].ref.update(updates).catch(function(){});
          }).catch(function(){});
      })
      .catch(function(e){
        console.error('saveSection career error:', e);
        showToast('เกิดข้อผิดพลาด: ' + (e.message||e), 'error');
      });
  }
}

/* ─── SECTION: ประวัติการทำงาน ─── */
var careerData={};
function loadCareer(){
  if(!currentUser) return;
  var email = isViewMode
    ? ((_viewStaff && _viewStaff.email) || '')
    : currentUser.email.toLowerCase();
  db.collection('staff_profile').doc(_targetUid()).get().then(function(d){
    careerData = d.exists ? d.data() : {};
    if(!careerData.cur_position && email){
      db.collection('staff_profile_sync').doc(email).get().then(function(s){
        if(s.exists){
          var sync = s.data();
          if(!careerData.cur_position)  careerData.cur_position  = sync.position      || '';
          if(!careerData.subject_group) careerData.subject_group = sync.subject_group || '';
          if(!careerData.academic_rank) careerData.academic_rank = sync.academic_rank || '';
        }
        renderCareerView();
      }).catch(function(){ renderCareerView(); });
    } else {
      renderCareerView();
    }
  }).catch(function(){ renderCareerView(); });
}
function buildCareerTimelineHTML(c){
  if(!c || (!c.start_date && !c.cur_school && !c.first_school)){
    return '<div style="text-align:center;padding:32px 16px;color:#94a3b8;font-size:13px;font-weight:600;">ยังไม่มีข้อมูลประวัติการทำงาน</div>';
  }
  var html = '';
  var pos   = c.cur_position || (currentStaff&&currentStaff.position) || 'ครู';
  var rank  = c.academic_rank || '';
  var group = c.subject_group || (currentStaff&&currentStaff.group) || '';
  var major = c.major_subject || '';

  /* ── Node 1: โรงเรียนแรกบรรจุ ── */
  if(c.first_school && c.start_date){
    var svc1 = '';
    if(c.cur_school_date && c.first_school !== c.cur_school){
      /* มีโรงเรียนปัจจุบันที่ต่างออกไป — คำนวณระยะเวลาที่โรงเรียนแรก */
      var d1=new Date(c.start_date), d2=new Date(c.cur_school_date);
      var yy=d2.getFullYear()-d1.getFullYear(), mm=d2.getMonth()-d1.getMonth();
      if(mm<0){yy--;mm+=12;}
      svc1=yy+' ปี '+mm+' เดือน';
    }
    html += '<div class="ct-node">' +
      '<div class="ct-dot" style="color:#22c55e;background:#dcfce7;">' +
        '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#22c55e"/></svg>' +
      '</div>' +
      '<div class="ct-card" style="border-color:#bbf7d0;">' +
        '<div class="ct-period"><i data-lucide="calendar" style="width:11px;height:11px;"></i>'+thDate(c.start_date)+' · เริ่มรับราชการ</div>' +
        '<div class="ct-school">'+esc(c.first_school)+'</div>' +
        (c.department?'<div class="ct-dept">'+esc(c.department)+'</div>':'') +
        '<div class="ct-chips">' +
          '<span class="ct-chip" style="background:var(--accent-tint);color:var(--accent);">'+esc(pos)+'</span>' +
          (group?'<span class="ct-chip" style="background:#f5f3ff;color:#7c3aed;">'+esc(group)+'</span>':'') +
          (major?'<span class="ct-chip" style="background:#f8fafc;color:#475569;">วิชาเอก : '+esc(major)+'</span>':'') +
        '</div>' +
        (svc1?'<div class="ct-service-bar"></div><div class="ct-service-lbl">ระยะเวลา '+svc1+'</div>':'') +
      '</div>' +
    '</div>';
  }

  /* ── Node 2: โรงเรียนปัจจุบัน (ถ้าต่างจากแรกบรรจุ) ── */
  var showCur = c.cur_school && (c.cur_school !== c.first_school || !c.first_school);
  if(showCur){
    var svcNow = calcService(c.cur_school_date || c.start_date);
    html += '<div class="ct-node">' +
      '<div class="ct-dot" style="color:#3b82f6;background:var(--accent-tint);">' +
        '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#3b82f6"/></svg>' +
      '</div>' +
      '<div class="ct-card" style="border-color:var(--accent-light);">' +
        '<div class="ct-period">' +
          '<i data-lucide="calendar" style="width:11px;height:11px;"></i>' +
          (c.cur_school_date ? thDate(c.cur_school_date) : (c.start_date ? thDate(c.start_date) : '')) +
          ' &nbsp;<span class="ct-now-badge"><i data-lucide="radio" style="width:9px;height:9px;"></i> ปัจจุบัน</span>' +
        '</div>' +
        '<div class="ct-school">'+esc(c.cur_school)+'</div>' +
        (c.department?'<div class="ct-dept">'+esc(c.department)+'</div>':'') +
        '<div class="ct-chips">' +
          '<span class="ct-chip" style="background:var(--accent-tint);color:var(--accent);">'+esc(pos)+'</span>' +
          (rank?'<span class="ct-chip" style="background:#fffbeb;color:#b45309;">วิทยฐานะ : '+esc(rank)+'</span>':'') +
          (group?'<span class="ct-chip" style="background:#f5f3ff;color:#7c3aed;">'+esc(group)+'</span>':'') +
          (major?'<span class="ct-chip" style="background:#f8fafc;color:#475569;">วิชาเอก : '+esc(major)+'</span>':'') +
        '</div>' +
        (svcNow?'<div class="ct-service-bar"></div><div class="ct-service-lbl">อายุราชการรวม '+calcService(c.start_date)+(svcNow?' · โรงเรียนนี้ '+svcNow:'')+'</div>':'') +
      '</div>' +
    '</div>';
  } else if(!c.first_school && c.cur_school){
    /* มีแค่โรงเรียนเดียว */
    var svcNow2 = calcService(c.start_date);
    html += '<div class="ct-node">' +
      '<div class="ct-dot" style="color:#3b82f6;background:var(--accent-tint);">' +
        '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#3b82f6"/></svg>' +
      '</div>' +
      '<div class="ct-card" style="border-color:var(--accent-light);">' +
        '<div class="ct-period">' +
          (c.start_date?'<i data-lucide="calendar" style="width:11px;height:11px;"></i>'+thDate(c.start_date)+' &nbsp;':'') +
          '<span class="ct-now-badge"><i data-lucide="radio" style="width:9px;height:9px;"></i> ปัจจุบัน</span>' +
        '</div>' +
        '<div class="ct-school">'+esc(c.cur_school)+'</div>' +
        (c.department?'<div class="ct-dept">'+esc(c.department)+'</div>':'') +
        '<div class="ct-chips">' +
          '<span class="ct-chip" style="background:var(--accent-tint);color:var(--accent);">'+esc(pos)+'</span>' +
          (rank?'<span class="ct-chip" style="background:#fffbeb;color:#b45309;">วิทยฐานะ : '+esc(rank)+'</span>':'') +
          (group?'<span class="ct-chip" style="background:#f5f3ff;color:#7c3aed;">'+esc(group)+'</span>':'') +
          (major?'<span class="ct-chip" style="background:#f8fafc;color:#475569;">วิชาเอก : '+esc(major)+'</span>':'') +
        '</div>' +
        (svcNow2?'<div class="ct-service-bar"></div><div class="ct-service-lbl">อายุราชการรวม '+svcNow2+'</div>':'') +
      '</div>' +
    '</div>';
  } else if(!c.cur_school && c.first_school){
    /* ไม่มีโรงเรียนปัจจุบันแยก — แสดง now badge บน node แรกแทน */
  }

  return '<div class="career-timeline">'+html+'</div>';
}

function renderCareerView(){
  var c=careerData;
  document.getElementById('careerTimeline').innerHTML = buildCareerTimelineHTML(c);
  lucide.createIcons();
}

/* ─── SECTION: ประวัติการย้ายโรงเรียน (sub-collection) ─── */
var careerHistoryItems = [];

function loadCareerHistory(){
  if(!currentUser) return;
  var el = document.getElementById('careerHistoryList');
  if(el) el.innerHTML = '<div class="empty-block">กำลังโหลด...</div>';

  db.collection('staff_career_history')
    .where('uid','==', _targetUid())
    .orderBy('start_date')
    .get()
    .then(function(snap){
      careerHistoryItems = [];
      snap.forEach(function(d){ careerHistoryItems.push(Object.assign({_id:d.id}, d.data())); });
      renderCareerHistory();
    })
    .catch(function(){
      /* fallback ไม่มี index — ไม่ orderBy */
      db.collection('staff_career_history')
        .where('uid','==', _targetUid()).get()
        .then(function(snap){
          careerHistoryItems = [];
          snap.forEach(function(d){ careerHistoryItems.push(Object.assign({_id:d.id}, d.data())); });
          /* sort client-side */
          careerHistoryItems.sort(function(a,b){ return (a.start_date||'').localeCompare(b.start_date||''); });
          renderCareerHistory();
        }).catch(function(){ renderCareerHistory(); });
    });
}

function renderCareerHistory(){
  var el = document.getElementById('careerHistoryList');
  if(!el) return;
  if(!careerHistoryItems.length){
    el.innerHTML = '<div class="empty-block" style="padding:32px 20px;">' +
      '<div style="font-size:32px;margin-bottom:10px;">🏫</div>' +
      '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">ยังไม่มีข้อมูลโรงเรียน</div>' +
      '<div style="font-size:12px;color:#94a3b8;">กด "+ เพิ่มโรงเรียน" เพื่อบันทึกทุกโรงเรียนตั้งแต่แรกบรรจุจนถึงปัจจุบัน</div>' +
    '</div>';
    return;
  }

  var colors      = ['#22c55e','#3b82f6','#f59e0b','#ec4899','#06b6d4','#7c3aed','#f97316'];
  var borderColors= ['#bbf7d0','#bfdbfe','#fde68a','#fbcfe8','#a5f3fc','#c4b5fd','#fed7aa'];
  var total = careerHistoryItems.length;

  el.innerHTML = '<div class="career-timeline">' +
    careerHistoryItems.map(function(item, idx){
      var col = colors[idx % colors.length];
      var bdr = borderColors[idx % borderColors.length];
      var isFirst  = idx === 0;
      var isCurrent = !item.end_date;

      /* period label */
      var periodStr = item.start_date ? thDate(item.start_date) : '';
      if(item.end_date) periodStr += ' – ' + thDate(item.end_date);

      /* duration */
      var durStr = '';
      if(item.start_date){
        var from = new Date(item.start_date);
        var to   = item.end_date ? new Date(item.end_date) : new Date();
        var yy = to.getFullYear()-from.getFullYear(), mm = to.getMonth()-from.getMonth();
        if(mm<0){yy--;mm+=12;}
        if(yy>0||mm>0) durStr = yy+' ปี '+mm+' เดือน';
      }

      /* label badges */
      var labelBadge = '';
      if(isFirst)   labelBadge += '<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;color:#15803d;background:#dcfce7;border:1px solid #86efac;padding:2px 8px;border-radius:20px;margin-right:4px;">🟢 แรกบรรจุ</span>';
      if(isCurrent) labelBadge += '<span class="ct-now-badge"><i data-lucide="radio" style="width:9px;height:9px;"></i> ปัจจุบัน</span>';

      return '<div class="ct-node">' +
        '<div class="ct-dot" style="color:'+col+';background:'+bdr+';">' +
          '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="'+col+'"/></svg>' +
        '</div>' +
        '<div class="ct-card" style="border-color:'+bdr+';">' +
          (labelBadge ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">'+labelBadge+'</div>' : '') +
          (periodStr  ? '<div class="ct-period"><i data-lucide="calendar" style="width:11px;height:11px;"></i>'+esc(periodStr)+'</div>' : '') +
          '<div class="ct-school">'+esc(item.school||'')+'</div>' +
          (item.department?'<div class="ct-dept">'+esc(item.department)+'</div>':'') +
          '<div class="ct-chips">' +
            (item.position?'<span class="ct-chip" style="background:var(--accent-tint);color:var(--accent);">'+esc(item.position)+'</span>':'') +
            (item.academic_rank?'<span class="ct-chip" style="background:#fffbeb;color:#b45309;">'+esc(item.academic_rank)+'</span>':'') +
          '</div>' +
          (durStr?'<div class="ct-service-bar" style="margin-top:8px;"></div><div class="ct-service-lbl">ระยะเวลา '+durStr+'</div>':'') +
          '<div style="display:flex;justify-content:flex-end;margin-top:10px;gap:6px;">' +
            '<button class="del-btn" onclick="editCareerHistoryItem(\''+item._id+'\')" title="แก้ไข" style="background:var(--accent-tint);">' +
              '<i data-lucide="pencil" style="width:13px;height:13px;color:var(--accent);"></i></button>' +
            '<button class="del-btn" onclick="deleteCareerHistoryItem(\''+item._id+'\')" title="ลบ">' +
              '<i data-lucide="trash-2" style="width:13px;height:13px;color:#ef4444;"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
  lucide.createIcons();
}

function addCareerHistoryItem(editId, prefill){
  prefill = prefill || {};
  var modalId = 'chModal';
  var existing = document.getElementById(modalId);
  if(existing) existing.remove();

  var html = '<div id="'+modalId+'" style="position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);">' +
    '<div style="background:white;border-radius:20px;width:100%;max-width:460px;padding:26px;">' +
    '<h3 style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px;">'+(editId?'แก้ไข':'เพิ่ม')+' โรงเรียน</h3>' +
    '<p style="font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:18px;">ถ้าไม่ใส่วันสิ้นสุด ระบบจะถือว่าเป็นโรงเรียนปัจจุบัน</p>' +
    '<div style="display:grid;gap:13px;">' +

    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">ชื่อโรงเรียน <span style="color:#ef4444;">*</span></div>' +
      '<input type="text" id="ch_school" placeholder="เช่น โรงเรียนหนองกี่พิทยาคม" value="'+esc(prefill.school||'')+'"></div>' +

    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">สังกัด สพม./สพป.</div>' +
      '<input type="text" id="ch_department" placeholder="เช่น สพม. บุรีรัมย์" value="'+esc(prefill.department||'')+'"></div>' +

    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">วันที่เริ่มงาน</div>' +
        '<input type="date" id="ch_start_date" value="'+esc(prefill.start_date||'')+'"></div>' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">วันที่สิ้นสุด <span style="color:#94a3b8;font-weight:600;">(เว้นถ้าปัจจุบัน)</span></div>' +
        '<input type="date" id="ch_end_date" value="'+esc(prefill.end_date||'')+'"></div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">ตำแหน่ง</div>' +
        '<input type="text" id="ch_position" placeholder="เช่น ครู" value="'+esc(prefill.position||'')+'"></div>' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">วิทยฐานะ</div>' +
        '<select id="ch_academic_rank">' +
          '<option value="">ไม่มี/ไม่ระบุ</option>' +
          '<option'+(prefill.academic_rank==='ครูชำนาญการ'?' selected':'')+'>ครูชำนาญการ</option>' +
          '<option'+(prefill.academic_rank==='ครูชำนาญการพิเศษ'?' selected':'')+'>ครูชำนาญการพิเศษ</option>' +
          '<option'+(prefill.academic_rank==='ครูเชี่ยวชาญ'?' selected':'')+'>ครูเชี่ยวชาญ</option>' +
          '<option'+(prefill.academic_rank==='ครูเชี่ยวชาญพิเศษ'?' selected':'')+'>ครูเชี่ยวชาญพิเศษ</option>' +
        '</select></div>' +
    '</div>' +

    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end;">' +
    '<button class="btn-secondary" onclick="document.getElementById(\''+modalId+'\').remove()">ยกเลิก</button>' +
    '<button class="btn-primary purple" onclick="saveCareerHistoryItem('+(editId?'\''+editId+'\'':'null')+')"><i data-lucide="check" style="width:14px;height:14px;"></i> บันทึก</button>' +
    '</div></div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
  lucide.createIcons();
}

function editCareerHistoryItem(id){
  var item = careerHistoryItems.find(function(i){ return i._id===id; });
  if(!item) return;
  addCareerHistoryItem(id, item);
}

function saveCareerHistoryItem(editId){
  if(!_assertNotViewMode()) return;
  var school = document.getElementById('ch_school').value.trim();
  if(!school){ showToast('กรุณากรอกชื่อโรงเรียน','warn'); return; }

  var data = {
    uid:          currentUser.uid,
    school:       school,
    department:   document.getElementById('ch_department').value.trim(),
    start_date:   document.getElementById('ch_start_date').value,
    end_date:     document.getElementById('ch_end_date').value,
    position:     document.getElementById('ch_position').value.trim(),
    academic_rank:document.getElementById('ch_academic_rank').value,
    updatedAt:    firebase.firestore.FieldValue.serverTimestamp()
  };

  var promise = editId
    ? db.collection('staff_career_history').doc(editId).set(data, {merge:true})
    : db.collection('staff_career_history').add(data);

  promise
    .then(function(){
      document.getElementById('chModal').remove();
      showToast(editId?'แก้ไขข้อมูลแล้ว':'เพิ่มประวัติแล้ว','success');
      loadCareerHistory();
    })
    .catch(function(e){ showToast('เกิดข้อผิดพลาด: '+(e.message||e),'error'); });
}

function deleteCareerHistoryItem(id){
  if(!_assertNotViewMode()) return;
  if(!confirm('ลบประวัติการย้ายโรงเรียนนี้?')) return;
  db.collection('staff_career_history').doc(id).delete()
    .then(function(){ showToast('ลบแล้ว'); loadCareerHistory(); })
    .catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}

/* ─── SECTION: ภาระงานสอน ─── */
var teachingItems=[];
function loadTeaching(){
  if(!currentUser) return;
  db.collection('staff_teaching').where('uid','==',_targetUid()).orderBy('order').get()
    .then(function(snap){
      teachingItems=[];
      snap.forEach(function(d){ teachingItems.push(Object.assign({_id:d.id},d.data())); });
      renderTeaching();
    }).catch(function(){
      db.collection('staff_teaching').where('uid','==',_targetUid()).get()
        .then(function(snap){
          teachingItems=[];
          snap.forEach(function(d){ teachingItems.push(Object.assign({_id:d.id},d.data())); });
          renderTeaching();
        }).catch(function(){ renderTeaching(); });
    });
}
function renderTeaching(){
  var el=document.getElementById('teachingList');
  if(!teachingItems.length){ el.innerHTML='<div class="empty-block">ยังไม่มีข้อมูลภาระงานสอน</div>'; document.getElementById('teachTotal').textContent=''; return; }
  var total=0;
  el.innerHTML=teachingItems.map(function(item){
    total+=(parseInt(item.periods)||0);
    return '<div class="teach-row">' +
      '<span class="teach-code">'+esc(item.code||'')+'</span>' +
      '<div style="flex:1;min-width:0;"><div class="teach-name">'+esc(item.name||'')+'</div></div>' +
      '<span class="teach-periods">'+esc(String(item.periods||0))+' คาบ</span>' +
      '<span class="teach-level">'+esc(item.level||'')+'</span>' +
      '<button class="del-btn" onclick="deleteTeachItem(\''+item._id+'\')" title="ลบ"><i data-lucide="trash-2" style="width:13px;height:13px;color:#ef4444;"></i></button>' +
    '</div>';
  }).join('');
  document.getElementById('teachTotal').textContent='รวม '+total+' คาบ/สัปดาห์';
  lucide.createIcons();
}
function addTeachRow(){
  /* simple inline modal */
  var html='<div id="teachModal" style="position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);">' +
    '<div style="background:white;border-radius:20px;width:100%;max-width:420px;padding:24px;">' +
    '<h3 style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:16px;">เพิ่มรายวิชา</h3>' +
    '<div style="display:grid;gap:12px;">' +
    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">รหัสวิชา</div><input type="text" id="tm_code" placeholder="เช่น ท22102"></div>' +
    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">ชื่อวิชา</div><input type="text" id="tm_name" placeholder="เช่น ภาษาไทยพื้นฐาน"></div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">คาบ/สัปดาห์</div><input type="number" id="tm_periods" placeholder="0" min="0"></div>' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">ระดับชั้น</div><input type="text" id="tm_level" placeholder="เช่น ม.5/10"></div>' +
    '</div></div>' +
    '<div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end;">' +
    '<button class="btn-secondary" onclick="document.getElementById(\'teachModal\').remove()">ยกเลิก</button>' +
    '<button class="btn-approve" onclick="saveTeachRow()"><i data-lucide="check" style="width:14px;height:14px;"></i> บันทึก</button></div>' +
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  lucide.createIcons();
}
function saveTeachRow(){
  if(!_assertNotViewMode()) return;
  var code=document.getElementById('tm_code').value.trim();
  var name=document.getElementById('tm_name').value.trim();
  var periods=parseInt(document.getElementById('tm_periods').value)||0;
  var level=document.getElementById('tm_level').value.trim();
  if(!name){ showToast('กรุณากรอกชื่อวิชา','warn'); return; }
  db.collection('staff_teaching').add({ uid:currentUser.uid, code:code, name:name, periods:periods, level:level, order:teachingItems.length })
    .then(function(){ document.getElementById('teachModal').remove(); showToast('เพิ่มรายวิชาแล้ว','success'); loadTeaching(); })
    .catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}
function deleteTeachItem(id){
  if(!_assertNotViewMode()) return;
  if(!confirm('ลบรายวิชานี้?')) return;
  db.collection('staff_teaching').doc(id).delete()
    .then(function(){ showToast('ลบแล้ว'); loadTeaching(); })
    .catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}

/* ─── SECTION: งานที่ได้รับมอบหมาย ─── */
var dutyItems=[];
function loadDuties(){
  if(!currentUser) return;
  db.collection('staff_duties').where('uid','==',_targetUid()).get()
    .then(function(snap){
      dutyItems=[];
      snap.forEach(function(d){ dutyItems.push(Object.assign({_id:d.id},d.data())); });
      renderDuties();
    }).catch(function(){ renderDuties(); });
}
function renderDuties(){
  var el=document.getElementById('dutiesList');
  if(!dutyItems.length){ el.innerHTML='<div class="empty-block">ยังไม่มีข้อมูลงานที่ได้รับมอบหมาย</div>'; return; }
  el.innerHTML='<div>'+dutyItems.map(function(item){
    return '<div class="duty-item">' +
      '<div class="duty-dot"></div>' +
      '<div class="duty-text">'+esc(item.task||'')+'</div>' +
      (item.group?'<span class="duty-group">'+esc(item.group)+'</span>':'') +
      '<button class="del-btn" onclick="deleteDutyItem(\''+item._id+'\')" title="ลบ" style="margin-left:6px;"><i data-lucide="trash-2" style="width:13px;height:13px;color:#ef4444;"></i></button>' +
    '</div>';
  }).join('')+'</div>';
  lucide.createIcons();
}
function addDutyRow(){
  var html='<div id="dutyModal" style="position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);">' +
    '<div style="background:white;border-radius:20px;width:100%;max-width:420px;padding:24px;">' +
    '<h3 style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:16px;">เพิ่มงานที่ได้รับมอบหมาย</h3>' +
    '<div style="display:grid;gap:12px;">' +
    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">กลุ่มงาน</div><input type="text" id="dm_group" placeholder="เช่น งานหลักสูตรสถานศึกษา"></div>' +
    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">รายละเอียดงาน</div><textarea id="dm_task" rows="3" placeholder="อธิบายงานที่ได้รับมอบหมาย"></textarea></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end;">' +
    '<button class="btn-secondary" onclick="document.getElementById(\'dutyModal\').remove()">ยกเลิก</button>' +
    '<button class="btn-primary purple" onclick="saveDutyRow()"><i data-lucide="check" style="width:14px;height:14px;"></i> บันทึก</button></div>' +
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  lucide.createIcons();
}
function saveDutyRow(){
  if(!_assertNotViewMode()) return;
  var group=document.getElementById('dm_group').value.trim();
  var task=document.getElementById('dm_task').value.trim();
  if(!task){ showToast('กรุณากรอกรายละเอียดงาน','warn'); return; }
  db.collection('staff_duties').add({ uid:currentUser.uid, group:group, task:task })
    .then(function(){ document.getElementById('dutyModal').remove(); showToast('เพิ่มงานแล้ว','success'); loadDuties(); })
    .catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}
function deleteDutyItem(id){
  if(!_assertNotViewMode()) return;
  if(!confirm('ลบรายการนี้?')) return;
  db.collection('staff_duties').doc(id).delete()
    .then(function(){ showToast('ลบแล้ว'); loadDuties(); })
    .catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}

/* ─── SECTION: การพัฒนาตนเอง ─── */
var devItems=[];
function loadDevelopment(){
  if(!currentUser) return;
  db.collection('staff_development').where('uid','==',_targetUid()).get()
    .then(function(snap){
      devItems=[];
      snap.forEach(function(d){ devItems.push(Object.assign({_id:d.id},d.data())); });
      renderDev();
    }).catch(function(){ renderDev(); });
}
function renderDev(){
  var el=document.getElementById('devList');
  if(!devItems.length){ el.innerHTML='<div class="empty-block">ยังไม่มีข้อมูลการพัฒนาตนเอง</div>'; return; }
  el.innerHTML=devItems.map(function(item){
    return '<div class="dev-item">' +
      '<div class="dev-dot"></div>' +
      '<div style="flex:1;">' +
        '<div class="dev-title">'+esc(item.title||'')+'</div>' +
        '<div class="dev-meta">'+(item.organizer?esc(item.organizer)+' · ':'')+esc(item.date_str||'')+(item.hours?' · '+item.hours+' ชั่วโมง':'')+'</div>' +
      '</div>' +
      '<button class="del-btn" onclick="deleteDevItem(\''+item._id+'\')" title="ลบ"><i data-lucide="trash-2" style="width:13px;height:13px;color:#ef4444;"></i></button>' +
    '</div>';
  }).join('');
  lucide.createIcons();
}
function addDevItem(){
  var html='<div id="devModal" style="position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);">' +
    '<div style="background:white;border-radius:20px;width:100%;max-width:440px;padding:24px;">' +
    '<h3 style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:16px;">เพิ่มการพัฒนาตนเอง</h3>' +
    '<div style="display:grid;gap:12px;">' +
    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">ชื่อการอบรม/กิจกรรม</div><input type="text" id="dv_title" placeholder="เช่น อบรมการจัดการเรียนรู้เชิงรุก"></div>' +
    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">หน่วยงานที่จัด</div><input type="text" id="dv_organizer" placeholder="เช่น สพม. นครราชสีมา"></div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">วันที่/ช่วงเวลา</div><input type="text" id="dv_date" placeholder="เช่น 14-16 มิ.ย. 2567"></div>' +
      '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">จำนวนชั่วโมง</div><input type="number" id="dv_hours" placeholder="0" min="0"></div>' +
    '</div></div>' +
    '<div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end;">' +
    '<button class="btn-secondary" onclick="document.getElementById(\'devModal\').remove()">ยกเลิก</button>' +
    '<button class="btn-primary amber" onclick="saveDevItem()"><i data-lucide="check" style="width:14px;height:14px;"></i> บันทึก</button></div>' +
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  lucide.createIcons();
}
function saveDevItem(){
  if(!_assertNotViewMode()) return;
  var title=document.getElementById('dv_title').value.trim();
  var organizer=document.getElementById('dv_organizer').value.trim();
  var date_str=document.getElementById('dv_date').value.trim();
  var hours=parseInt(document.getElementById('dv_hours').value)||0;
  if(!title){ showToast('กรุณากรอกชื่อการอบรม','warn'); return; }
  db.collection('staff_development').add({ uid:currentUser.uid, title:title, organizer:organizer, date_str:date_str, hours:hours })
    .then(function(){ document.getElementById('devModal').remove(); showToast('เพิ่มรายการแล้ว','success'); loadDevelopment(); })
    .catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}
function deleteDevItem(id){
  if(!_assertNotViewMode()) return;
  if(!confirm('ลบรายการนี้?')) return;
  db.collection('staff_development').doc(id).delete()
    .then(function(){ showToast('ลบแล้ว'); loadDevelopment(); })
    .catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}

/* ─── SECTION: สื่อนวัตกรรม ─── */
var mediaItems=[];
var MEDIA_ICONS=['youtube','canva','kahoot','quizizz','padlet','mentimeter','wordwall','flipgrid','book','image','video','music','code-2','globe','file-text'];
function loadMedia(){
  if(!currentUser) return;
  db.collection('staff_media').where('uid','==',_targetUid()).get()
    .then(function(snap){
      mediaItems=[];
      snap.forEach(function(d){ mediaItems.push(Object.assign({_id:d.id},d.data())); });
      renderMedia();
    }).catch(function(){ renderMedia(); });
}
function renderMedia(){
  var el=document.getElementById('mediaList');
  if(!mediaItems.length){ el.innerHTML='<div class="empty-block">ยังไม่มีข้อมูลสื่อนวัตกรรม</div>'; return; }
  el.innerHTML=mediaItems.map(function(item){
    return '<div class="media-item">' +
      '<div class="media-icon"><i data-lucide="'+(item.icon||'layout-grid')+'" style="width:20px;height:20px;color:#06b6d4;"></i></div>' +
      '<div style="flex:1;">' +
        '<div class="media-name">'+esc(item.name||'')+'</div>' +
        '<div class="media-subject">'+esc(item.subject||'')+(item.url?'<a href="'+esc(item.url)+'" target="_blank" style="color:var(--accent);margin-left:8px;font-size:11px;"> เปิดลิงก์</a>':'')+'</div>' +
      '</div>' +
      '<button class="del-btn" onclick="deleteMediaItem(\''+item._id+'\')" title="ลบ"><i data-lucide="trash-2" style="width:13px;height:13px;color:#ef4444;"></i></button>' +
    '</div>';
  }).join('');
  lucide.createIcons();
}
function addMediaItem(){
  var html='<div id="mediaModal" style="position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);">' +
    '<div style="background:white;border-radius:20px;width:100%;max-width:440px;padding:24px;">' +
    '<h3 style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:16px;">เพิ่มสื่อนวัตกรรม</h3>' +
    '<div style="display:grid;gap:12px;">' +
    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">ชื่อสื่อ/นวัตกรรม</div><input type="text" id="mm_name" placeholder="เช่น แบบฝึกภาษา จับใจความ"></div>' +
    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">รายวิชา/กลุ่มสาระ</div><input type="text" id="mm_subject" placeholder="เช่น ภาษาไทย ม.5"></div>' +
    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">ลิงก์ (ถ้ามี)</div><input type="text" id="mm_url" placeholder="https://..."></div>' +
    '<div><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;">ประเภทสื่อ</div><select id="mm_icon"><option value="layout-grid">ทั่วไป</option><option value="youtube">YouTube</option><option value="image">รูปภาพ/Infographic</option><option value="video">วิดีโอ</option><option value="file-text">เอกสาร/ใบงาน</option><option value="globe">เว็บไซต์</option><option value="code-2">แอปพลิเคชัน</option><option value="music">เสียง/Podcast</option></select></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end;">' +
    '<button class="btn-secondary" onclick="document.getElementById(\'mediaModal\').remove()">ยกเลิก</button>' +
    '<button class="btn-approve" style="background:#06b6d4;" onclick="saveMediaItem()"><i data-lucide="check" style="width:14px;height:14px;"></i> บันทึก</button></div>' +
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  lucide.createIcons();
}
function saveMediaItem(){
  if(!_assertNotViewMode()) return;
  var name=document.getElementById('mm_name').value.trim();
  var subject=document.getElementById('mm_subject').value.trim();
  var url=document.getElementById('mm_url').value.trim();
  var icon=document.getElementById('mm_icon').value;
  if(!name){ showToast('กรุณากรอกชื่อสื่อ','warn'); return; }
  db.collection('staff_media').add({ uid:currentUser.uid, name:name, subject:subject, url:url, icon:icon })
    .then(function(){ document.getElementById('mediaModal').remove(); showToast('เพิ่มสื่อแล้ว','success'); loadMedia(); })
    .catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}
function deleteMediaItem(id){
  if(!_assertNotViewMode()) return;
  if(!confirm('ลบรายการนี้?')) return;
  db.collection('staff_media').doc(id).delete()
    .then(function(){ showToast('ลบแล้ว'); loadMedia(); })
    .catch(function(){ showToast('เกิดข้อผิดพลาด','error'); });
}

function filterByStatus(){
  applyFilter();
}
function applyFilter(){
  currentSemIdx = 0; /* reset to newest when filter changes */
  var val = document.getElementById('filterStatus').value;
  if(val==='all'){ buildSemTabs(allSemData); return; }
  var filtered = allSemData.filter(function(sem){
    return Object.values(sem.docs).some(function(courses){
      return courses.some(function(c){ return (c.status||'submitted')===val; });
    });
  });
  buildSemTabs(filtered);
}

/* ══════════════════════════════════════════════
   PORTFOLIO SUMMARY (SAR panel)
   ดึงข้อมูลจาก portfolio_submissions ภาคเรียนปัจจุบัน
   ══════════════════════════════════════════════ */
(function(){
  /* คำนวณภาคเรียนปัจจุบันแบบเดียวกับ portfolio-teacher.html */
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
  window._sarPortYear = thYear;
  window._sarPortSem  = sem;
})();

/* DOCUMENT_TYPES fallback (แต่จะโหลดจาก Firestore ถ้าทำได้) */
var _sarDocTypes = [
  { id:'syllabus',         label:'Course Syllabus',                 icon:'file-text',  color:'#3b82f6', bg:'var(--accent-tint)' },
  { id:'lesson_plan',      label:'แผนการจัดการเรียนรู้',            icon:'book-open',  color:'#8b5cf6', bg:'#f5f3ff' },
  { id:'sufficiency',      label:'แผนเศรษฐกิจพอเพียง',             icon:'leaf',       color:'#22c55e', bg:'#f0fdf4' },
  { id:'royal_policy',     label:'แผนพระบรมราโชบาย',               icon:'crown',      color:'#f59e0b', bg:'#fffbeb' },
  { id:'competency',       label:'แผนสมรรถนะ',                     icon:'zap',        color:'#ec4899', bg:'#fdf2f8' },
  { id:'research',         label:'รายงานวิจัยในชั้นเรียน',          icon:'microscope', color:'#06b6d4', bg:'#ecfeff' },
  { id:'student_analysis', label:'รายงานวิเคราะห์ผู้เรียนรายบุคคล', icon:'users',      color:'#f97316', bg:'#fff7ed' },
  { id:'media_register',   label:'ทะเบียนสื่อ',                    icon:'library',    color:'#6366f1', bg:'#eef2ff' },
  { id:'student_work',     label:'ผลงานนักเรียน',                   icon:'star',       color:'#eab308', bg:'#fefce8' },
];
var _sarPortSubs = null; /* cache */
var _sarDocTypesLoaded = false;

function _getDocTypeInfo(id) {
  return _sarDocTypes.find(function(d){ return d.id === id; }) || { id:id, label:id, icon:'file', color:'#64748b', bg:'#f1f5f9' };
}

function loadPortfolioForSar() {
  var el = document.getElementById('portfolioDocList');
  var semLbl = document.getElementById('portfolioSemLabel');
  if (!el) return;
  if (!currentUser) { el.innerHTML = '<div class="sar-empty">ไม่พบข้อมูลผู้ใช้</div>'; return; }

  var portYear = window._sarPortYear || 2568;
  var portSem  = window._sarPortSem  || 1;
  var key      = portYear + '_' + portSem;

  if (semLbl) semLbl.textContent = 'ปีการศึกษา ' + portYear + ' ภาคเรียนที่ ' + portSem;
  el.innerHTML = '<div class="sar-empty">กำลังโหลด...</div>';

  /* โหลด doc types จาก Firestore ก่อน (ถ้ายังไม่เคย) */
  function fetchAndRender() {
    db.collection('portfolio_submissions')
      .where('uid', '==', _targetUid())
      .where('yearSem', '==', key)
      .get()
      .then(function(snap) {
        var subs = {};
        snap.forEach(function(d) {
          var data = d.data();
          var subKey = data.docTypeId + '_' + (data.courseCode || '');
          subs[subKey] = Object.assign({ id: d.id }, data);
        });
        _sarPortSubs = subs;
        renderPortfolioSummary(subs, portYear, portSem);
      })
      .catch(function(e) {
        console.warn('loadPortfolioForSar error:', e);
        el.innerHTML = '<div class="sar-empty">ไม่สามารถโหลดข้อมูลได้</div>';
      });
  }

  /* โหลด doc types จาก Firestore ถ้ายังไม่มี */
  if (!_sarDocTypesLoaded) {
    db.collection('portfolio_doc_types').orderBy('order').get()
      .then(function(snap) {
        if (!snap.empty) {
          _sarDocTypes = [];
          snap.forEach(function(d) {
            var data = d.data();
            if (data.active === false) return;
            _sarDocTypes.push({
              id:     data.id     || d.id,
              label:  data.label  || '',
              icon:   data.icon   || 'file',
              color:  data.color  || '#64748b',
              bg:     (data.color || '#64748b') + '15',
            });
          });
        }
        _sarDocTypesLoaded = true;
        fetchAndRender();
      })
      .catch(function() { _sarDocTypesLoaded = true; fetchAndRender(); });
  } else {
    fetchAndRender();
  }
}

function renderPortfolioSummary(subs, portYear, portSem) {
  var el  = document.getElementById('portfolioDocList');
  var bar = document.getElementById('portfolioProgressBar');
  var txt = document.getElementById('portfolioProgressText');
  if (!el) return;

  /* รวบรวม docTypeId → [subKeys] */
  var docCourses = {};
  Object.keys(subs).forEach(function(subKey) {
    var dtId = subs[subKey].docTypeId;
    if (!dtId) return;
    if (!docCourses[dtId]) docCourses[dtId] = [];
    docCourses[dtId].push(subKey);
  });

  var totalDocs     = _sarDocTypes.length;
  var submittedDocs = 0;
  _sarDocTypes.forEach(function(dt) { if (docCourses[dt.id] && docCourses[dt.id].length) submittedDocs++; });
  var pct = totalDocs ? Math.round((submittedDocs / totalDocs) * 100) : 0;

  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = submittedDocs + ' / ' + totalDocs + ' รายการ';

  if (!_sarDocTypes.length) {
    el.innerHTML = '<div class="sar-empty">ยังไม่มีข้อมูลประเภทเอกสาร</div>';
    return;
  }

  var STATUS_LABEL = { submitted:'ส่งแล้ว', head_reviewed:'หัวหน้าฯ ตรวจ', reviewed:'ตรวจแล้ว',
    assistant_reviewed:'ผช.ผอ. ตรวจ', deputy_reviewed:'รอง ผอ. ตรวจ', final_approved:'ผอ.อนุมัติ', revision:'แก้ไข' };
  var STATUS_COLOR = { submitted:'#15803d', head_reviewed:'#0369a1', reviewed:'#1e40af',
    assistant_reviewed:'#92400e', deputy_reviewed:'#6d28d9', final_approved:'#065f46', revision:'#92400e' };
  var STATUS_BG    = { submitted:'#dcfce7', head_reviewed:'#e0f2fe', reviewed:'#dbeafe',
    assistant_reviewed:'#fef3c7', deputy_reviewed:'#ede9fe', final_approved:'#d1fae5', revision:'#fef9c3' };

  var html = '<div style="display:grid;gap:2px;">';

  _sarDocTypes.forEach(function(dt) {
    var courses = docCourses[dt.id] || [];
    var hasAny  = courses.length > 0;

    /* ไอคอนสถานะรวม */
    var overallBadge = '';
    if (!hasAny) {
      overallBadge = '<span style="font-size:10px;font-weight:700;color:#94a3b8;background:#f1f5f9;padding:1px 8px;border-radius:20px;">ยังไม่ส่ง</span>';
    } else {
      var anyRevision = courses.some(function(k){ return subs[k].status === 'revision'; });
      var allFinal    = courses.every(function(k){ return subs[k].status === 'final_approved'; });
      var obg, ocol, olbl;
      if (anyRevision)  { obg = '#fef9c3'; ocol = '#92400e'; olbl = 'มีรายวิชาแก้ไข'; }
      else if (allFinal){ obg = '#d1fae5'; ocol = '#065f46'; olbl = 'ผอ.อนุมัติครบ'; }
      else              { obg = '#dcfce7'; ocol = '#15803d'; olbl = 'ส่งแล้ว ' + courses.length + ' วิชา'; }
      overallBadge = '<span style="font-size:10px;font-weight:700;color:'+ocol+';background:'+obg+';padding:1px 8px;border-radius:20px;">'+olbl+'</span>';
    }

    /* course chips */
    var chipsHtml = '';
    if (hasAny) {
      chipsHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">';
      courses.forEach(function(subKey) {
        var sub    = subs[subKey];
        var status = sub.status || 'submitted';
        var files  = sub.files  || [];
        var chipClass = 'port-course-chip' + (status === 'revision' ? ' revision' : (files.length ? ' has-files' : ''));
        var stBg  = STATUS_BG[status]    || '#dcfce7';
        var stCol = STATUS_COLOR[status] || '#15803d';
        var stLbl = STATUS_LABEL[status] || 'ส่งแล้ว';

        chipsHtml +=
          '<div class="' + chipClass + '" title="' + esc(sub.courseName || '') + '">' +
            (sub.courseCode ? '<span class="port-course-code">' + esc(sub.courseCode) + '</span>' : '') +
            '<span class="port-course-name">' + esc(sub.courseName || '(ไม่ระบุ)') + '</span>' +
            '<span style="font-size:9px;font-weight:800;color:' + stCol + ';background:' + stBg + ';padding:1px 6px;border-radius:4px;white-space:nowrap;">' + stLbl + '</span>' +
            /* ปุ่มเปิดไฟล์ */
            (files.length
              ? files.map(function(f, fi) {
                  if (!f || !f.fileUrl) return '';
                  return '<a href="' + esc(f.fileUrl) + '" target="_blank" class="port-file-link" title="' + esc(f.fileName || ('ไฟล์ ' + (fi+1))) + '" onclick="event.stopPropagation();">' +
                    '<i data-lucide="file-text" style="width:11px;height:11px;"></i>' + (fi+1) +
                    '</a>';
                }).join('')
              : '') +
          '</div>';
      });
      chipsHtml += '</div>';
    }

    html +=
      '<div class="port-doc-row">' +
        '<div class="port-doc-icon" style="background:' + dt.bg + ';">' +
          '<i data-lucide="' + dt.icon + '" style="width:16px;height:16px;color:' + dt.color + ';"></i>' +
        '</div>' +
        '<div class="port-doc-info">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
            '<span class="port-doc-title">' + esc(dt.label) + '</span>' +
            overallBadge +
          '</div>' +
          chipsHtml +
        '</div>' +
      '</div>';
  });

  html += '</div>';
  el.innerHTML = html;
  lucide.createIcons();
}

