/* ── คำนวณปีการศึกษาและภาคเรียนอัตโนมัติจากวันที่ปัจจุบัน (เหมือน portfolio-teacher.js เป๊ะ)
   ภาคเรียนที่ 1: เปิด 16 พ.ค.  → ถึง 31 ต.ค.
   ภาคเรียนที่ 2: เปิด  1 พ.ย.  → ถึง 15 พ.ค. ปีถัดไป
   ── ต้องรันก่อน var pfYear ด้านล่าง เพื่อให้ window._pfDefaultYear
      ถูกตั้งค่าก่อนถูกอ่านไปใช้ (เดิมอยู่ท้ายไฟล์ ทำให้ pfYear/pfSem
      ค้างที่ค่า fallback 2568/1 เสมอ ไม่เคยอัปเดตตามวันที่จริง) ──
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
  window._pfDefaultYear = thYear;
  window._pfDefaultSem  = sem;
})();

/* ══════════════════════ STATE ══════════════════════ */
  var npCurrentUser = null;
  /* ── Pastel Room Color System (shared) ── */
  var ROOM_PASTEL_MAP={
    'ห้องประชุมชวนชม'  :{bg:'#dbeafe',text:'#1e3a8a',border:'#93c5fd',accent:'var(--c-sky-deep)'},
    'หอประชุมพุทธรักษา':{bg:'#fef3c7',text:'#78350f',border:'#fcd34d',accent:'var(--c-amber-deep)'},
    'สนามกีฬากลาง'    :{bg:'#d1fae5',text:'#064e3b',border:'#6ee7b7',accent:'var(--c-green-deep)'},
    'ห้องประชุมราชพฤกษ์':{bg:'#fce7f3',text:'#831843',border:'#f9a8d4',accent:'#db2777'},
    'โดมอเนกประสงค์'  :{bg:'#ffedd5',text:'#7c2d12',border:'#fdba74',accent:'var(--c-amber)'},
    'ห้องประชุมปาริชาติ':{bg:'#ede9fe',text:'#4c1d95',border:'#c4b5fd',accent:'#7c3aed'},
    'ห้องประชุมชวนชน'  :{bg:'#e0f2fe',text:'#0c4a6e',border:'#7dd3fc',accent:'#0284c7'}
  };
  var ROOM_PASTEL_FB=[
    {bg:'#dbeafe',text:'#1e3a8a',border:'#93c5fd',accent:'var(--c-sky-deep)'},
    {bg:'#d1fae5',text:'#064e3b',border:'#6ee7b7',accent:'var(--c-green-deep)'},
    {bg:'#ede9fe',text:'#4c1d95',border:'#c4b5fd',accent:'#7c3aed'},
    {bg:'#fce7f3',text:'#831843',border:'#f9a8d4',accent:'#db2777'},
    {bg:'#ffedd5',text:'#7c2d12',border:'#fdba74',accent:'var(--c-amber)'},
    {bg:'#fef3c7',text:'#78350f',border:'#fcd34d',accent:'var(--c-amber-deep)'},
    {bg:'#ccfbf1',text:'#134e4a',border:'#5eead4',accent:'#0d9488'},
    {bg:'#dcfce7',text:'#14532d',border:'#86efac',accent:'var(--c-green)'},
    {bg:'#e0f2fe',text:'#0c4a6e',border:'#7dd3fc',accent:'#0284c7'},
    {bg:'#fdf4ff',text:'#581c87',border:'#e9d5ff',accent:'#9333ea'}
  ];

  /* ── Dashboard: Recent Repairs ── */
  /* ── ใช้ --status-* token กลาง (styles-new.css) แทน hex hardcode เดิม
     ให้ความหมายสถานะ (เตือน/อันตราย/สำเร็จ/ข้อมูล) ตรงกันทุกหน้าที่มีสถานะแจ้งซ่อม ── */
  var REPAIR_STATUS_META={
    reported: {label:'รออนุมัติ',        bg:'var(--status-warning-bg)', color:'var(--status-warning)'},
    rejected: {label:'ไม่อนุมัติ',        bg:'var(--status-danger-bg)',  color:'var(--status-danger)'},
    approved: {label:'รอซ่อม',           bg:'var(--status-info-bg)',    color:'var(--status-info)'},
    done:     {label:'รอตรวจสอบ',        bg:'var(--violet-light)',      color:'var(--violet)'},
    reopened: {label:'ซ่อมใหม่',         bg:'var(--status-danger-bg)',  color:'var(--status-danger)'},
    closed:   {label:'ปิดงานแล้ว',       bg:'var(--status-success-bg)', color:'var(--status-success)'}
  };

  /* ══ Public Calendar (no login required) ══ */
  

  var pubYear=new Date().getFullYear(),pubMonth=new Date().getMonth();
  var pubSelectedDate=new Date().toISOString().split('T')[0];
  var pubBookings=[],pubRooms=[];

  /* ส่ง LINE แจ้งเจ้าของเมื่อสถานะเปลี่ยน */
  var _lnCache = {};

  /* ════ Portfolio Dashboard ════ */
  /* PF_DOC_TYPES โหลดจาก Firestore (portfolio_doc_types) — ไม่ hardcode */
  /* ── เดิมแต่ละประเภทเอกสารสุ่มสีของตัวเอง 9 เฉดที่ไม่เกี่ยวกับกราฟ/สถิติหน้าอื่นเลย
     → เรียงลงบน --chart-1..9 ตัวเดียวกับที่กราฟ Food Court/Repair/Room ใช้ ให้เห็นแล้ว
     รู้สึกเป็นชุดสีเดียวกันทั้งเว็บ ── */
  var PF_DOC_TYPES = [
    { id:'syllabus',         label:'Course Syllabus',                 icon:'file-text',  color:'var(--chart-1)', bg:'var(--accent-tint)' },
    { id:'lesson_plan',      label:'แผนการจัดการเรียนรู้',            icon:'book-open',  color:'var(--chart-2)', bg:'var(--green-light)' },
    { id:'sufficiency',      label:'แผนเศรษฐกิจพอเพียง',             icon:'leaf',       color:'var(--chart-3)', bg:'var(--amber-light)' },
    { id:'royal_policy',     label:'แผนพระบรมราโชบาย',               icon:'crown',      color:'var(--chart-4)', bg:'var(--red-light)' },
    { id:'competency',       label:'แผนสมรรถนะ',                     icon:'zap',        color:'var(--chart-5)', bg:'var(--violet-light)' },
    { id:'research',         label:'รายงานวิจัยในชั้นเรียน',          icon:'microscope', color:'var(--chart-6)', bg:'var(--sky-light)' },
    { id:'student_analysis', label:'รายงานวิเคราะห์ผู้เรียนรายบุคคล', icon:'users',      color:'var(--chart-7)', bg:'var(--green-light)' },
    { id:'media_register',   label:'ทะเบียนสื่อ',                    icon:'library',    color:'var(--chart-8)', bg:'var(--orange-light)' },
    { id:'student_work',     label:'ผลงานนักเรียน',                   icon:'star',       color:'var(--chart-9)', bg:'var(--sky-light)' },
  ]; /* fallback — ถูกแทนที่เมื่อ Firestore โหลดสำเร็จ */
  var _pfDocTypesLoaded = false;
  var _pfDocTypesUnsub  = null;

  var pfYear = window._pfDefaultYear || 2568;
  var pfSem  = window._pfDefaultSem  || 1;
  var pfUid  = null;
  var pfIsStaff = false;

  var STATUS_LABEL = { none:'ยังไม่ส่ง', submitted:'ส่งแล้ว', head_reviewed:'หัวหน้าตรวจแล้ว', reviewed:'ตรวจแล้ว', final_approved:'อนุมัติแล้ว', revision:'ขอแก้ไข' };
  var STATUS_BG    = { none:'var(--bg-alt)', submitted:'var(--status-success-bg)', head_reviewed:'var(--status-info-bg)', reviewed:'var(--blue-light)', final_approved:'var(--violet-light)', revision:'var(--amber-light)' };
  var STATUS_COLOR = { none:'var(--status-neutral)', submitted:'var(--status-success)', head_reviewed:'var(--status-info)', reviewed:'var(--blue-dark)', final_approved:'var(--violet)', revision:'var(--status-warning)' };
  var STATUS_DOT   = { none:'var(--border-mid)', submitted:'var(--chart-2)', head_reviewed:'var(--chart-6)', reviewed:'var(--chart-1)', final_approved:'var(--chart-5)', revision:'var(--chart-3)' };
  /* ลำดับความสำคัญสำหรับจัดเรียงการ์ดเอกสารส่งงาน: ต้องแก้ไข/ยังไม่ส่งก่อน → กำลังตรวจ → อนุมัติแล้วไปท้ายสุด */
  var STATUS_PRIORITY = { revision:0, none:1, submitted:2, head_reviewed:3, reviewed:4, final_approved:5 };

/* ══════════════════════ DATA LOADING ══════════════════════ */
  function fetchUserStats(uid){
    // ไม่ใช้ orderBy ร่วมกับ where เพื่อหลีกเลี่ยง Firestore composite index — เรียงฝั่ง client แทน
    db.collection('bookings').where('userId','==',uid).onSnapshot(function(snap){
      document.getElementById('bookingCount').textContent=snap.size+' รายการ';
      var bookings=[];
      snap.forEach(function(d){bookings.push(Object.assign({id:d.id},d.data()));});
      bookings.sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
      renderMyBookings(bookings);
    },function(err){
      console.error('fetchUserStats error:',err);
      var empty=document.getElementById('myBookingsEmpty');
      if(empty){empty.style.display='block';empty.textContent='ไม่สามารถโหลดข้อมูลได้: '+err.message;}
    });
  }

  function loadDashboardRepairs(uid){
    // ไม่ใช้ orderBy ร่วมกับ where เพื่อหลีกเลี่ยง Firestore composite index — เรียงฝั่ง client แทน
    db.collection('repairs').where('reporterUid','==',uid).onSnapshot(function(snap){
      var list=[];
      snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
      list.sort(function(a,b){
        var ta=a.createdAt?a.createdAt.seconds:0, tb=b.createdAt?b.createdAt.seconds:0;
        return tb-ta;
      });
      renderDashboardRepairs(list.slice(0,5));
    },function(err){
      console.error('loadDashboardRepairs error:',err);
      var empty=document.getElementById('repairDashEmpty');
      if(empty){empty.style.display='block';empty.textContent='ไม่สามารถโหลดข้อมูลได้: '+err.message;}
    });
  }

  function lineLoadStatus(uid) {
    db.collection('users').doc(uid).get().then(function(doc) {
      lineRender(doc.exists && !!doc.data().lineUserId, doc.exists ? (doc.data().lineName||'') : '');
    }).catch(function(){ lineRender(false,''); });
  }
  function lineListenBookings(uid) {
    // ปิดการส่ง LINE จาก client แล้ว
    // Firebase Cloud Function (onBookingStatusChanged) จัดการส่ง LINE ให้อัตโนมัติ
  }

  /* โหลด doc types จาก Firestore — เรียกครั้งเดียวตอน pfInit */
  function pfLoadDocTypes(callback) {
    if (_pfDocTypesUnsub) { _pfDocTypesUnsub(); _pfDocTypesUnsub = null; }
    _pfDocTypesUnsub = db.collection('portfolio_doc_types')
      .orderBy('order')
      .onSnapshot(function(snap) {
        if (!snap.empty) {
          var loaded = [];
          snap.forEach(function(d) {
            var data = d.data();
            if (data.active === false) return; /* กรอง inactive ฝั่ง client */
            loaded.push({
              id:    data.id    || d.id,
              label: data.label || '',
              short: data.short || '',
              icon:  data.icon  || 'file',
              /* หมายเหตุ: ต้องเป็น hex จริง ห้ามใช้ var(--x) เพราะ pfColorToBg()
                 ต่อ string '15' (alpha) ท้าย hex ตรงๆ — #7c3aed คือค่าเดียวกับ --violet */
              color: data.color || '#7c3aed',
              bg:    pfColorToBg(data.color || '#7c3aed'),
            });
          });
          if (loaded.length) PF_DOC_TYPES = loaded;
        }
        if (!_pfDocTypesLoaded) {
          _pfDocTypesLoaded = true;
          if (callback) callback();
        } else {
          /* realtime update — re-render ถ้าข้อมูลส่งโหลดอยู่แล้ว */
          if (pfUid) pfLoad();
        }
      }, function(err) {
        console.warn('pfLoadDocTypes error:', err);
        if (!_pfDocTypesLoaded) {
          _pfDocTypesLoaded = true;
          if (callback) callback(); /* ใช้ fallback ต่อไป */
        }
      });
  }

  function pfLoad() {
    if (!pfUid) return;
    var key = pfYear + '_' + pfSem;
    var emptyEl = document.getElementById('pfEmpty');
    if (emptyEl) emptyEl.textContent = 'กำลังโหลด...';
    db.collection('portfolio_submissions')
      .where('uid', '==', pfUid)
      .where('yearSem', '==', key)
      .get()
      .then(function(snap) {
        var subs = {};
        snap.forEach(function(d) {
          var data = d.data();
          subs[data.docTypeId] = data;
        });
        pfRender(subs);
      })
      .catch(function(e) {
        /* อาจไม่ใช่บุคลากร — ซ่อน section */
        var wrap = document.getElementById('pfDocList');
        if (wrap) wrap.innerHTML = '<div style="text-align:center;padding:24px 0;font-size:12px;color:var(--text3);font-style:italic;">ไม่พบข้อมูลบุคลากร — ระบบส่งงานสำหรับครูเท่านั้น</div>';
        document.getElementById('pfProgressWrap') && (document.getElementById('pfProgressWrap').style.display = 'none');
        var statEl = document.getElementById('pfStatCount');
        if (statEl) statEl.textContent = '–';
      });
  }

  /* เรียก callback ทันทีที่โหลด */

  /* ── Public Announcements ── */
  function loadPublicAnnouncements() {
    var TODAY = new Date().toISOString().slice(0, 10); /* YYYY-MM-DD */

    var ANN_ICON  = { info:'info', warning:'alert-triangle', success:'check-circle-2', urgent:'bell-ring' };
    var ANN_LABEL = { info:'ข้อมูล', warning:'แจ้งเตือน', success:'ข่าวดี', urgent:'ด่วน' };
    /* ── เดิม ANN_CLR ในฟังก์ชันนี้กับ loadDashboardAnnouncements() ด้านล่าง
       ใช้เฉดสีคนละชุดสำหรับ type เดียวกัน (เช่น info เป็นคนละสีฟ้า) ทำให้
       ประกาศแบบเดียวกันดูสีไม่ตรงกันระหว่าง public banner กับ dashboard
       → รวมมาใช้ --status-* token ชุดเดียวกันทั้งสองจุด ── */
    var ANN_CLR   = { info:'var(--status-info)', warning:'var(--status-warning)', success:'var(--status-success)', urgent:'var(--status-danger)' };

    /* ── ไม่ใช้ orderBy เพื่อหลีกเลี่ยง composite index ──
       ดึง active=true ทั้งหมด แล้วเรียงและกรองฝั่ง client */
    db.collection('announcements')
      .where('active', '==', true)
      .limit(30)
      .get()
      .then(function(snap) {
        if (snap.empty) return;

        /* เรียง createdAt desc ฝั่ง client */
        var docs = [];
        snap.forEach(function(doc) { docs.push(doc); });
        docs.sort(function(a, b) {
          var ta = a.data().createdAt ? a.data().createdAt.seconds : 0;
          var tb = b.data().createdAt ? b.data().createdAt.seconds : 0;
          return tb - ta;
        });

        var html = '';
        docs.forEach(function(doc) {
          var d    = doc.data();
          var type = d.type || 'info';

          /* กรอง scope: แสดงเฉพาะ external หรือไม่มี scope field (ข้อมูลเก่า) */
          var scope = (d.scope !== undefined && d.scope !== null) ? d.scope : 'external';
          if (scope === 'internal') return;

          /* กรองตามช่วงวันที่ */
          if (!d.noExpiry) {
            if (d.startDate && TODAY < d.startDate) return;
            if (d.endDate   && TODAY > d.endDate)   return;
          }

          /* วันที่สร้าง */
          var dateStr = '';
          try { dateStr = d.createdAt.toDate().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}); } catch(e){}

          html +=
            '<div class="ann-pub-card type-' + esc2(type) + '">' +
              '<i data-lucide="' + (ANN_ICON[type]||'info') + '" ' +
                'style="width:18px;height:18px;flex-shrink:0;margin-top:3px;color:' + (ANN_CLR[type]||'var(--accent-mid)') + ';"></i>' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;">' +
                  '<span class="ann-pub-badge ' + esc2(type) + '">' + (ANN_LABEL[type]||'ข้อมูล') + '</span>' +
                  (d.department ? '<span class="ann-pub-dept"><i data-lucide="building-2" style="width:10px;height:10px;"></i>' + esc2(d.department) + '</span>' : '') +
                  (dateStr ? '<span class="ann-pub-date">' + dateStr + '</span>' : '') +
                '</div>' +
                '<div style="font-size:14px;font-weight:800;color:var(--bg-alt);line-height:1.4;">' + esc2(d.title||'') + '</div>' +
                (d.body ? '<div style="font-size:13px;color:rgba(255,255,255,.6);line-height:1.65;margin-top:5px;">' + esc2(d.body) + '</div>' : '') +
                (d.imageUrl ? '<img src="' + esc2(d.imageUrl) + '" class="ann-pub-img" alt="ภาพประกาศ" loading="lazy">' : '') +
              '</div>' +
            '</div>';
        });

        if (!html) return;
        var box = document.getElementById('annBoxList');
        var sec = document.getElementById('annSection');
        if (box) box.innerHTML = html;
        if (sec) sec.style.display = 'block';
        lucide.createIcons();
      })
      .catch(function(e) { console.warn('ann load error:', e); });
  }
  /* ── Dashboard Announcements (after login) ── */
  function loadDashboardAnnouncements() {
    var TODAY = new Date().toISOString().slice(0, 10);
    var ANN_ICON  = { info:'info', warning:'alert-triangle', success:'check-circle-2', urgent:'bell-ring' };
    var ANN_LABEL = { info:'ข้อมูล', warning:'แจ้งเตือน', success:'ข่าวดี', urgent:'ด่วน' };
    var ANN_CLR   = { info:'var(--status-info)', warning:'var(--status-warning)', success:'var(--status-success)', urgent:'var(--status-danger)' };
    var ANN_BG    = { info:'var(--sky-light)', warning:'var(--amber-light)', success:'var(--green-light)', urgent:'var(--red-light)' };
    var ANN_BORDER= { info:'var(--sky-mid)', warning:'var(--amber-mid)', success:'var(--green-mid)', urgent:'var(--red-mid)' };
    var ANN_TEXT  = { info:'var(--blue-dark)', warning:'var(--amber-dark)', success:'var(--status-success)', urgent:'var(--red-dark)' };
    var ANN_BADGE_BG  = { info:'var(--blue-mid)', warning:'var(--amber-light)', success:'var(--green-light)', urgent:'var(--red-light)' };

    db.collection('announcements')
      .where('active', '==', true)
      .limit(30)
      .get()
      .then(function(snap) {
        var box  = document.getElementById('annDashList');
        var sec  = document.getElementById('annDashSection');
        if (!box || !sec) return;
        if (snap.empty) { sec.style.display = 'none'; return; }

        var docs = [];
        snap.forEach(function(doc) { docs.push(doc); });
        docs.sort(function(a, b) {
          var ta = a.data().createdAt ? a.data().createdAt.seconds : 0;
          var tb = b.data().createdAt ? b.data().createdAt.seconds : 0;
          return tb - ta;
        });

        var html = '';
        docs.forEach(function(doc) {
          var d    = doc.data();
          var type = d.type || 'info';
          /* กรองวันที่ */
          if (!d.noExpiry) {
            if (d.startDate && TODAY < d.startDate) return;
            if (d.endDate   && TODAY > d.endDate)   return;
          }
          var dateStr = '';
          try { dateStr = d.createdAt.toDate().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}); } catch(e){}

          html +=
            '<div style="display:flex;align-items:flex-start;gap:12px;padding:13px 4px;border-bottom:1px solid var(--bg);">' +
              '<div style="width:42px;height:42px;background:' + (ANN_BG[type]||'var(--blue-light)') + ';border-radius:11px;' +
                'border:1.5px solid ' + (ANN_BORDER[type]||'var(--blue-mid)') + ';' +
                'display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                '<i data-lucide="' + (ANN_ICON[type]||'info') + '" style="width:18px;height:18px;color:' + (ANN_CLR[type]||'var(--blue-bright)') + ';"></i>' +
              '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:5px;">' +
                  '<span style="font-size:10px;font-weight:800;padding:2px 9px;border-radius:20px;' +
                    'background:' + (ANN_BADGE_BG[type]||'var(--role-general-bg)') + ';color:' + (ANN_TEXT[type]||'var(--blue-dark)') + ';">' +
                    (ANN_LABEL[type]||'ข้อมูล') + '</span>' +
                  (d.department ? '<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;background:var(--bg-alt);color:var(--text2);">' + esc2(d.department) + '</span>' : '') +
                  (dateStr ? '<span style="font-size:10px;color:var(--text3);font-weight:600;margin-left:auto;white-space:nowrap;">' + dateStr + '</span>' : '') +
                '</div>' +
                '<div style="font-size:13px;font-weight:800;color:var(--text-dark);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc2(d.title||'') + '</div>' +
                (d.body ? '<div style="font-size:12px;color:var(--text2);line-height:1.6;margin-top:4px;">' + esc2(d.body) + '</div>' : '') +
                (d.imageUrl ? '<img src="' + esc2(d.imageUrl) + '" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin-top:10px;border:1px solid var(--border);" alt="ภาพประกาศ" loading="lazy">' : '') +
              '</div>' +
            '</div>';
        });

        if (!html) { sec.style.display = 'none'; return; }
        box.innerHTML = html;
        sec.style.display = 'block';
        lucide.createIcons();
      })
      .catch(function(e) { console.warn('ann dash error:', e); });
  }

/* ══════════════════════ RENDER ══════════════════════ */
  function scrollToTopContent() {
    var content = document.getElementById('pageContent');
    if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* iOS 16.4+ Safari มี Notification API ให้เห็นถึงแม้ยังไม่ได้ add to home screen ก็ตาม
     แต่ requestPermission() จะใช้งานไม่ได้จริงจนกว่าจะเปิดผ่านไอคอนที่ติดตั้งแล้ว (ดู firebase.js)
     เลยต้องเช็คแยกกรณีนี้ เพื่อโชว์การ์ดแนะนำ "เพิ่มลงหน้าจอ Home" แทนปุ่ม "เปิดการแจ้งเตือน" ปกติ */
  function _isIOSDevice() { return /iP(hone|od|ad)/.test(navigator.userAgent); }
  function _isStandaloneMode() {
    return window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }

  /* เรียกตรงนี้จาก onclick ของปุ่ม (user gesture) เท่านั้น — ห้ามเรียกอัตโนมัติ
     เพราะ Safari/iOS จะไม่โชว์ prompt ขอ permission ถ้าไม่ได้มาจาก tap ของผู้ใช้โดยตรง */
  function enableNotifPermission() {
    if (!npCurrentUser || typeof setupPushNotification !== 'function') return;
    var btn = document.getElementById('notifPermBtn');
    btn.disabled = true;
    btn.textContent = 'กำลังเปิด...';
    setupPushNotification(npCurrentUser).then(function(token) {
      var banner = document.getElementById('notifPermBanner');
      if (token) {
        showToast('เปิดการแจ้งเตือนสำเร็จ ✓');
        banner.style.display = 'none';
      } else {
        /* ผู้ใช้กด block หรือ requestPermission ล้มเหลว */
        btn.disabled = false;
        btn.textContent = 'เปิดการแจ้งเตือน';
        if (Notification.permission === 'denied') {
          banner.style.display = 'none'; /* บล็อกแล้ว ต้องไปแก้ที่ตั้งค่าเบราว์เซอร์เอง โชว์ปุ่มต่อไปไม่มีประโยชน์ */
        }
      }
    });
  }
  function getRoomPastel(n){
    if(ROOM_PASTEL_MAP[n])return ROOM_PASTEL_MAP[n];
    var h=0;for(var i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))%ROOM_PASTEL_FB.length;
    return ROOM_PASTEL_FB[h];
  }

  function renderMyBookings(bookings){
    var wrap=document.getElementById('myBookingsList');
    var empty=document.getElementById('myBookingsEmpty');
    var moreEl=document.getElementById('myBookingsMore');
    if(!wrap)return;
    if(!bookings.length){
      if(empty){empty.style.display='block';empty.textContent='ยังไม่มีรายการจอง';}
      return;
    }
    if(empty)empty.style.display='none';
    if(moreEl)moreEl.style.display=bookings.length>5?'block':'none';
    var now=new Date();
    wrap.innerHTML=bookings.slice(0,5).map(function(b){
      var ok=b.status==='approved',rej=b.status==='rejected';
      var eDate=new Date((b.date||'')+'T'+(b.endTime||'23:59')+':00');
      var isDone=ok&&!isNaN(eDate)&&now>eDate;
      var p=getRoomPastel(b.room||'');var color=p.accent;
      var statusTxt=isDone?'✅ เสร็จสิ้น':ok?'✅ อนุมัติ':rej?'❌ ปฏิเสธ':'⏳ รอตรวจ';
      var statusBg=isDone?'var(--bg-alt);color:var(--text2)':ok?'var(--role-budget-bg);color:var(--teal-dark)':rej?'var(--red-light);color:var(--rose-deep)':'var(--yellow-light);color:var(--amber-dark)';
      var dateStr='';
      try{dateStr=new Date(b.date+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});}catch(e){dateStr=b.date||'';}
      return '<div style="display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid var(--bg);">'+
        '<div style="width:42px;height:42px;background:'+p.accent+';border-radius:11px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">'+
          '<span style="font-size:9px;font-weight:800;color:rgba(255,255,255,.8);line-height:1;">'+(b.date?new Date(b.date+'T00:00:00').toLocaleDateString('th-TH',{month:'short'}):'')+'</span>'+
          '<span style="font-size:14px;font-weight:900;color:white;line-height:1;">'+(b.date?new Date(b.date+'T00:00:00').getDate():'')+'</span>'+
        '</div>'+
        '<div style="flex:1;min-width:0;">'+
          '<div style="font-size:13px;font-weight:800;color:'+p.text+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+b.room+'</div>'+
          '<div style="font-size:11px;color:var(--text2);">'+(b.startTime||'?')+' – '+(b.endTime||'?')+' &nbsp;·&nbsp; '+(b.purpose||'-')+'</div>'+
        '</div>'+
        '<span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;flex-shrink:0;background:'+statusBg+';">'+statusTxt+'</span>'+
      '</div>';
    }).join('');
    lucide.createIcons();
  }

  function renderDashboardRepairs(list){
    var wrap=document.getElementById('repairDashList');
    var empty=document.getElementById('repairDashEmpty');
    if(!wrap)return;
    if(!list.length){
      if(empty){empty.style.display='block';empty.textContent='ยังไม่มีรายการแจ้งซ่อม';}
      return;
    }
    if(empty)empty.style.display='none';
    wrap.innerHTML=list.map(function(r){
      var st=REPAIR_STATUS_META[r.status]||{label:r.status||'-',bg:'var(--bg-alt)',color:'var(--text2)'};
      if(r.status==='approved'&&r.repairStatus==='in_progress'){st=Object.assign({},st,{label:'กำลังซ่อม'});}
      if(r.status==='reopened'&&r.repairStatus==='in_progress'){st=Object.assign({},st,{label:'ซ่อมใหม่ (กำลังซ่อม)'});}
      var dateStr='';
      try{dateStr=r.createdAt.toDate().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});}catch(e){}
      return '<div style="display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid var(--bg);">'+
        '<div style="width:42px;height:42px;background:var(--orange-light);border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+
          '<i data-lucide="wrench" style="width:18px;height:18px;color:var(--orange);"></i>'+
        '</div>'+
        '<div style="flex:1;min-width:0;">'+
          '<div style="font-size:13px;font-weight:800;color:var(--text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc2(r.title||'-')+'</div>'+
          '<div style="font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc2(r.location||'-')+(dateStr?' &nbsp;·&nbsp; '+dateStr:'')+'</div>'+
        '</div>'+
        '<span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;flex-shrink:0;white-space:nowrap;background:'+st.bg+';color:'+st.color+';">'+st.label+'</span>'+
      '</div>';
    }).join('');
    lucide.createIcons();
  }

  function pubRenderCalendar(){
    var grid=document.getElementById('pubCalGrid2');
    var label=document.getElementById('pubMonthLabel');
    if(!grid||!label)return;
    grid.innerHTML='';
    label.textContent=new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric'}).format(new Date(pubYear,pubMonth));
    var first=new Date(pubYear,pubMonth,1).getDay(); // 0=อา ... 6=ส
    var days=new Date(pubYear,pubMonth+1,0).getDate();
    var today=new Date().toISOString().split('T')[0];
    var bmap={};
    pubBookings.forEach(function(b){
      if(b.status==='rejected')return;
      if(!bmap[b.date])bmap[b.date]=[];
      bmap[b.date].push(b);
    });
    for(var d=1;d<=days;d++){
      var idx=first+(d-1);          // ตำแหน่งช่องที่ d (0-based) นับจากช่องแรกของตาราง
      var row=Math.floor(idx/7)+1;  // แถวที่ (1-based)
      var col=(idx%7)+1;            // คอลัมน์ที่ (1-based) ต้องตรงกับ อา จ อ พ พฤ ศ ส
      var dk=pubYear+'-'+String(pubMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      var db=bmap[dk]||[];
      var el=document.createElement('div');
      var cls='pub-cal-day';
      if(dk===today)cls+=' is-today';
      if(db.length>0)cls+=' has-booking';
      if(db.length>=3)cls+=' is-full';
      if(dk===pubSelectedDate)cls+=' is-selected';
      el.className=cls;el.textContent=d;
      el.style.gridRow=row;
      el.style.gridColumn=col;
      (function(k,bk){el.onclick=function(){pubSelectedDate=k;pubRenderCalendar();pubUpdateDayView(k,bk);};})(dk,db);
      grid.appendChild(el);
    }
  }

  function pubRenderStats(){
    var label=document.getElementById('pubStatsMonth');
    var wrap=document.getElementById('pubStatsWrap');
    if(!label||!wrap)return;
    label.textContent=new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric'}).format(new Date(pubYear,pubMonth));
    var prefix=pubYear+'-'+String(pubMonth+1).padStart(2,'0');
    var counts={};
    pubBookings.forEach(function(b){
      if(b.status==='rejected')return;
      if(!b.date||b.date.indexOf(prefix)!==0)return;
      if(!counts[b.room])counts[b.room]=0;counts[b.room]++;
    });
    if(!pubRooms.length){wrap.innerHTML='<div style="font-size:11px;color:var(--text3);text-align:center;padding:10px;">ยังไม่มีข้อมูล</div>';return;}
    var max=0;pubRooms.forEach(function(r){if((counts[r.name]||0)>max)max=(counts[r.name]||0);});
    if(max===0){wrap.innerHTML='<div style="font-size:11px;color:var(--text3);text-align:center;padding:6px;">ไม่มีการจองในเดือนนี้</div>';return;}
    wrap.innerHTML=pubRooms.map(function(r){
      var c=counts[r.name]||0;if(!c)return'';
      var p=getRoomPastel(r.name);var color=p.accent;
      var pct=max>0?(c/max*100):0;
      return '<div><div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:var(--text);margin-bottom:3px;">'+
        '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;color:'+color+';">'+r.name+'</span>'+
        '<span style="color:'+color+';flex-shrink:0;">'+c+' ครั้ง</span></div>'+
        '<div class="pub-stat-bar"><div class="pub-stat-fill" style="width:'+pct+'%;background:'+color+';"></div></div></div>';
    }).filter(Boolean).join('');
    if(!wrap.innerHTML)wrap.innerHTML='<div style="font-size:11px;color:var(--text3);text-align:center;padding:6px;">ไม่มีการจองในเดือนนี้</div>';
  }

  // Load public data (bookings + rooms) without auth
  function initPublicCalendar(){
    db.collection('rooms').orderBy('name').get().then(function(snap){
      pubRooms=[];snap.forEach(function(d){pubRooms.push(Object.assign({id:d.id},d.data()));});
      var rc=document.getElementById('heroRoomCount');if(rc)rc.textContent=pubRooms.length;
    });
    db.collection('bookings').orderBy('date').get().then(function(snap){
      pubBookings=[];
      snap.forEach(function(d){pubBookings.push(Object.assign({id:d.id},d.data()));});
      pubRenderCalendar();
      pubRenderStats();
      // Hero stats: count this month's approved bookings
      var now=new Date();var ym=now.getFullYear()+'-'+(String(now.getMonth()+1).padStart(2,'0'));
      var monthCount=pubBookings.filter(function(b){return b.date&&b.date.indexOf(ym)===0&&b.status!=='rejected';}).length;
      var bc=document.getElementById('heroBookingCount');if(bc)bc.textContent=monthCount;
      // Auto-show today
      var todayBk=pubBookings.filter(function(b){return b.date===pubSelectedDate&&b.status!=='rejected';});
      pubUpdateDayView(pubSelectedDate,todayBk);
      lucide.createIcons();
    });
  }

  /* ════ LINE ════ */
  function callLineProxy(params, cb) {
    fetch(LINE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
      .then(function(r){ return r.json(); })
      .then(cb)
      .catch(function(e){ cb({ error: e.message }); });
  }

  function lineRender(ok, name) {
    var txt = document.getElementById('lineTxt');
    var sub = document.getElementById('lineSub');
    var btn = document.getElementById('lineBtn');
    if (!txt) return;
    if (ok) {
      txt.textContent = '\u2705 \u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d LINE \u0e41\u0e25\u0e49\u0e27' + (name?' \u00b7 '+name:'');
      sub.textContent = '\u0e04\u0e38\u0e13\u0e08\u0e30\u0e44\u0e14\u0e49\u0e23\u0e31\u0e1a\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e1c\u0e48\u0e32\u0e19 LINE \u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34';
      btn.textContent = '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d';
      btn.style.color = 'var(--red)';
      btn.onclick = lineDisconnect;
    } else {
      txt.textContent = '\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d LINE \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e23\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19';
      sub.textContent = '\u0e23\u0e31\u0e1a\u0e41\u0e08\u0e49\u0e07\u0e1c\u0e25\u0e04\u0e33\u0e02\u0e2d \u0e41\u0e25\u0e30\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e01\u0e48\u0e2d\u0e19\u0e16\u0e36\u0e07\u0e40\u0e27\u0e25\u0e32\u0e08\u0e2d\u0e07 15 \u0e19\u0e32\u0e17\u0e35';
      btn.textContent = '\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d LINE';
      btn.style.color = 'var(--green)';
      btn.onclick = lineConnect;
    }
  }

  function lineConnect() {
    var state = Math.random().toString(36).slice(2);
    localStorage.setItem('ls', state);
    location.href = 'https://access.line.me/oauth2/v2.1/authorize?' +
      'response_type=code&client_id=' + LINE_CH +
      '&redirect_uri=' + encodeURIComponent(LINE_CB) +
      '&state=' + state + '&scope=profile%20openid&nonce=' + Math.random().toString(36).slice(2);
  }

  function lineDisconnect() {
    if (!confirm('\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d LINE \u0e43\u0e0a\u0e48\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?')) return;
    var u = auth.currentUser; if (!u) return;
    db.collection('users').doc(u.uid).update({
      lineUserId: firebase.firestore.FieldValue.delete(),
      lineName:   firebase.firestore.FieldValue.delete(),
    }).then(function(){ lineRender(false,''); lineToast('\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e41\u0e25\u0e49\u0e27','w'); });
  }

  function lineToast(msg, type) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;color:white;font-weight:700;font-size:14px;font-family:Sarabun,sans-serif;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.15);';
    t.style.background = type==='e'?'var(--red-bright)':type==='w'?'var(--accent-warn)':'#06C755';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 4000);
  }

  function pfColorToBg(hex) { return hex + '15'; }

  function pfRender(subs) {
    var wrap = document.getElementById('pfDocList');
    var emptyEl = document.getElementById('pfEmpty');
    var progWrap = document.getElementById('pfProgressWrap');
    var progBar  = document.getElementById('pfProgressBar');
    var progTxt  = document.getElementById('pfProgressText');
    if (!wrap) return;

    var submittedCount = 0;
    var approvedCount  = 0;
    PF_DOC_TYPES.forEach(function(dt) {
      var s = (subs[dt.id] && subs[dt.id].status) || 'none';
      if (s !== 'none') submittedCount++;
      if (s === 'final_approved') approvedCount++;
    });

    /* Progress */
    if (progWrap) progWrap.style.display = 'block';
    var pct = Math.round((submittedCount / PF_DOC_TYPES.length) * 100);
    if (progBar) progBar.style.width = pct + '%';
    if (progTxt) progTxt.textContent = submittedCount + ' / ' + PF_DOC_TYPES.length + ' รายการ' + (approvedCount ? ' · อนุมัติแล้ว ' + approvedCount : '');

    /* การ์ดสรุปใน Stats Row ด้านบน (งานส่งภาคเรียนนี้) */
    var statEl = document.getElementById('pfStatCount');
    if (statEl) statEl.innerHTML = submittedCount + '<span style="font-size:14px;font-weight:700;color:var(--text3);">/' + PF_DOC_TYPES.length + '</span>';

    if (emptyEl) emptyEl.style.display = 'none';

    /* เรียงการ์ดตามความสำคัญ: ต้องแก้ไข/ยังไม่ส่งขึ้นก่อน → กำลังตรวจ → อนุมัติแล้วไปท้ายสุด
       (เห็นงานที่ต้องทำก่อน ไม่ต้องไล่หาในลิสต์ยาวๆ) */
    var sortedDocTypes = PF_DOC_TYPES.slice().sort(function(a, b) {
      var sa = (subs[a.id] && subs[a.id].status) || 'none';
      var sb = (subs[b.id] && subs[b.id].status) || 'none';
      var pa = STATUS_PRIORITY[sa] !== undefined ? STATUS_PRIORITY[sa] : 99;
      var pb = STATUS_PRIORITY[sb] !== undefined ? STATUS_PRIORITY[sb] : 99;
      return pa - pb;
    });

    /* Doc chips grid */
    wrap.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:8px;">' +
      sortedDocTypes.map(function(dt) {
        var sub    = subs[dt.id];
        var status = sub ? (sub.status || 'submitted') : 'none';
        var label  = STATUS_LABEL[status] || status;
        var bg     = STATUS_BG[status]    || 'var(--bg-alt)';
        var color  = STATUS_COLOR[status] || 'var(--text3)';
        var dot    = STATUS_DOT[status]   || 'var(--blue-pale)';
        var updatedAt = '';
        if (sub && sub.updatedAt) {
          try {
            var d = sub.updatedAt.toDate ? sub.updatedAt.toDate() : new Date(sub.updatedAt);
            updatedAt = d.toLocaleDateString('th-TH', { day:'numeric', month:'short' });
          } catch(e) {}
        }
        var borderLeft = status === 'none' ? '' : 'border-left:3px solid ' + dot + ';';
        return '<div style="background:white;border:1.5px solid var(--border);' + borderLeft + 'border-radius:12px;padding:12px 13px;display:flex;align-items:flex-start;gap:9px;">' +
          '<div style="width:32px;height:32px;border-radius:9px;background:' + dt.bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            '<i data-lucide="' + dt.icon + '" style="width:15px;height:15px;color:' + dt.color + ';"></i>' +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:11px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + dt.label + '</div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">' +
              '<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:' + bg + ';color:' + color + ';white-space:nowrap;">' +
                '<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:' + dot + ';margin-right:3px;vertical-align:middle;"></span>' +
                label +
              '</span>' +
              (updatedAt ? '<span style="font-size:10px;color:var(--text3);">' + updatedAt + '</span>' : '') +
            '</div>' +
            (status === 'revision' && sub && sub.adminNote ? '<div style="font-size:10px;color:var(--amber-dark);margin-top:5px;background:var(--amber-light);padding:3px 7px;border-radius:6px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (sub.adminNote||'') + '">💬 ' + (sub.adminNote||'') + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
    lucide.createIcons();
  }

  /* เรียก pfLoad เมื่อ user ล็อกอินแล้ว — ตรวจก่อนว่าเป็น staff */
  function pfInit(uid, email) {
    pfUid = uid;
    pfUpdateSemLabel();
    db.collection('staff').where('email', '==', email.toLowerCase()).limit(1).get()
      .then(function(snap) {
        if (snap.empty) {
          /* ไม่ใช่ staff — แสดงข้อความแจ้ง */
          var wrap = document.getElementById('pfDocList');
          if (wrap) wrap.innerHTML = '<div style="text-align:center;padding:24px 0;font-size:12px;color:var(--text3);font-style:italic;">\u0e23\u0e30\u0e1a\u0e1a\u0e2a\u0e48\u0e07\u0e07\u0e32\u0e19\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e04\u0e23\u0e39\u0e41\u0e25\u0e30\u0e1a\u0e38\u0e04\u0e25\u0e32\u0e01\u0e23\u0e42\u0e23\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19</div>';
          document.getElementById('pfProgressWrap') && (document.getElementById('pfProgressWrap').style.display = 'none');
          var pfStatEl = document.getElementById('pfStatCount');
          if (pfStatEl) pfStatEl.textContent = '–';
          return;
        }
        pfIsStaff = true;
        /* โหลด doc types จาก Firestore ก่อน แล้วค่อย load submissions */
        pfLoadDocTypes(function() { pfLoad(); });
      })
      .catch(function() {
        pfIsStaff = true;
        pfLoadDocTypes(function() { pfLoad(); });
      });
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

  /* แสดง banner เฉพาะตอน browser รองรับ Notification API, ยังไม่เคยตอบ allow/block,
     และไม่ใช่กรณี iOS ที่ยังไม่ได้ add to home screen (กรณีนั้นให้โชว์การ์ดแนะนำแทน) */
  function checkNotifPermBanner() {
    var banner = document.getElementById('notifPermBanner');
    if (!banner) return;
    var needsA2HS = _isIOSDevice() && !_isStandaloneMode();
    if ('Notification' in window && Notification.permission === 'default' && !needsA2HS) {
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }

  /* แสดงการ์ดแนะนำ "เพิ่มลงหน้าจอ Home" เฉพาะ iOS ที่ยังไม่ได้ add to home screen
     และยังไม่เคยตอบ allow/block การแจ้งเตือน (ถ้า block ไปแล้วก็ไม่มีประโยชน์จะเตือนซ้ำ) */
  function checkA2HSCard() {
    var card = document.getElementById('a2hsCard');
    if (!card) return;
    var needsA2HS = _isIOSDevice() && !_isStandaloneMode();
    var alreadyDenied = ('Notification' in window) && Notification.permission === 'denied';
    card.style.display = (needsA2HS && !alreadyDenied) ? 'block' : 'none';
  }

  /* ── Login Gate ── */
  function showLoginGate(title, desc, icon) {
    document.getElementById('loginGateTitle').textContent = title || 'เข้าสู่ระบบก่อนใช้งาน';
    document.getElementById('loginGateDesc').textContent = desc || 'กรุณาเข้าสู่ระบบด้วยบัญชี Google เพื่อใช้บริการ';
    var iconEl = document.getElementById('loginGateIcon');
    if (icon) { iconEl.innerHTML = '<i data-lucide="'+icon+'" style="width:28px;height:28px;color:var(--accent);"></i>'; lucide.createIcons(); }
    document.getElementById('loginGate').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLoginGate() {
    document.getElementById('loginGate').classList.remove('open');
    document.body.style.overflow = '';
  }

  function showTab(name){
    document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active');});
    document.querySelectorAll('.sidebar-btn').forEach(function(b){b.classList.remove('active');});
    var t=document.getElementById('tab-'+name),b=document.getElementById('btn-'+name);
    if(t)t.classList.add('active');if(b)b.classList.add('active');
    closeSidebar();
  }

  function pubChangeMonth(d){pubMonth+=d;if(pubMonth>11){pubMonth=0;pubYear++;}if(pubMonth<0){pubMonth=11;pubYear--;}pubRenderCalendar();pubRenderStats();}

  function pubUpdateDayView(dateKey,dayBookings){
    var list=document.getElementById('pubDayList');
    var label=document.getElementById('pubDateLabel');
    if(!list)return;
    label.textContent=new Date(dateKey+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});
    if(!dayBookings||!dayBookings.length){
      list.innerHTML='<div style="text-align:center;padding:60px 0;color:var(--border-mid);font-size:14px;font-style:italic;">ไม่มีข้อมูลการจองในวันที่เลือก</div>';
      return;
    }
    list.innerHTML=dayBookings.map(function(b){
      var ok=b.status==='approved';
      var p=getRoomPastel(b.room||'');var color=p.accent;
      var now=new Date();var eDate=new Date(dateKey+'T'+(b.endTime||'23:59')+':00');
      var isDone=!isNaN(eDate)&&now>eDate;
      var statusTxt=isDone?'✅ เสร็จสิ้น':ok?'✅ อนุมัติ':'⏳ รอตรวจ';
      var cardBg=isDone?'var(--bg-alt)':p.bg;
      var cardBorder=isDone?'var(--border-mid)':p.border;
      var cardText=isDone?'var(--text3)':p.text;
      var purposeBg=isDone?'#94a3b822':p.accent+'18';
      var badgeBg=isDone?'var(--text3)':p.accent;
      return '<div style="padding:14px 16px;background:'+cardBg+';border-radius:14px;margin-bottom:10px;border:1.5px solid '+cardBorder+';">'+
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">'+
          '<div style="flex:1;min-width:0;">'+
            '<div style="font-weight:800;font-size:14px;color:'+cardText+';margin-bottom:5px;">'+b.room+'</div>'+
            '<div style="font-size:11px;color:'+cardText+'99;margin-bottom:4px;">⏰ '+(b.startTime||'?')+' – '+(b.endTime||'?')+' &nbsp;·&nbsp; 👤 '+(b.fullName||b.userName||'-')+'</div>'+
            '<div style="font-size:11px;color:'+cardText+';background:'+purposeBg+';padding:4px 9px;border-radius:6px;margin-top:6px;">📌 '+(b.purpose||'-')+'</div>'+
          '</div>'+
          '<span style="font-size:9px;font-weight:800;padding:3px 9px;border-radius:20px;flex-shrink:0;background:'+badgeBg+';color:white;white-space:nowrap;">'+statusTxt+'</span>'+
        '</div>'+
      '</div>';
    }).join('');
  }

  /* LINE callback handler */
  function lineHandleCb() {
    var p     = new URLSearchParams(location.search);
    var code  = p.get('code');
    var state = p.get('state');
    var err   = p.get('error');
    if (!code && !err) return;
    history.replaceState({}, '', location.pathname);
    if (err) { lineToast('\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d LINE','w'); return; }
    if (state !== localStorage.getItem('ls')) { lineToast('\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08: state \u0e44\u0e21\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19','e'); return; }
    localStorage.removeItem('ls');
    /* รอ auth พร้อม */
    var t = 0, iv = setInterval(function(){
      t += 400;
      if (t > 15000) { clearInterval(iv); lineToast('Timeout \u0e01\u0e23\u0e38\u0e13\u0e32\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48','e'); return; }
      var u = auth.currentUser; if (!u) return;
      clearInterval(iv);
      /* แลก code ผ่าน Firebase Function */
      var btn = document.getElementById('lineBtn');
      if (btn) { btn.disabled = true; btn.textContent = '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d...'; }
      callLineProxy({
        code: code,
        redirectUri: LINE_CB,
        firebaseUid: u.uid,
        userEmail: u.email,
        userName: u.displayName,
      }, function(data) {
        if (data.lineUserId) {
          // Firebase Function บันทึก Firestore และส่ง LINE ต้อนรับให้แล้ว
          lineRender(true, data.lineName||'');
          lineToast('\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d LINE \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 \u2713','ok');
        } else {
          if (btn) { btn.disabled = false; btn.textContent = '\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d LINE'; }
          lineToast('\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08: '+(data.error||'-'),'e');
        }
      });
    }, 400);
  }

  function pfUpdateSemLabel() {
    var el = document.getElementById('pfCurrentSemLabel');
    if (el) el.textContent = 'ปีการศึกษา ' + pfYear + ' ภาคเรียนที่ ' + pfSem;
  }

/* ══════════════════════ INIT ══════════════════════ */
  buildPageShell({
    appId:       'myApp',
    navSubtitle: 'ระบบบริการออนไลน์',
    navTheme:    'blue',
    activePage:  'index',
    onReady: function(contentEl) {
      contentEl.appendChild(document.getElementById('publicView'));
      contentEl.appendChild(document.getElementById('privateView'));
      lucide.createIcons();
      setupScrollTopButton();
    }
  });

  auth.onAuthStateChanged(function(user){
    if(user){
      npCurrentUser = user;
      document.body.classList.remove('guest-mode');
      document.getElementById('publicView').style.display='none';
      document.getElementById('privateView').style.display='block';
      document.getElementById('welcomeText').textContent='สวัสดี, '+user.displayName;
      updateNavUser(user);updateSidebarProfile(user);
      fetchUserStats(user.uid);checkAdminAccess(user.email);lineLoadStatus(user.uid);lineListenBookings(user.uid);
      /* ไม่เรียก setupPushNotification อัตโนมัติตรงนี้ — Safari/iOS บล็อก requestPermission()
         ถ้าไม่ได้มาจาก user gesture (เช่น tap ปุ่ม) ต้องให้ผู้ใช้กดปุ่มเองในแบนเนอร์ด้านล่างแทน */
      checkNotifPermBanner();
      checkA2HSCard();
      pfInit(user.uid, user.email);
      loadDashboardAnnouncements();
      loadDashboardRepairs(user.uid);
    }else{
      npCurrentUser = null;
      document.body.classList.add('guest-mode');
      document.getElementById('publicView').style.display='block';
      document.getElementById('privateView').style.display='none';
      resetNavUI();
      loadPublicAnnouncements();
    }
    document.getElementById('loadingOverlay').style.display='none';
    lucide.createIcons();
  });
  initPublicCalendar();

  lineHandleCb();

  lucide.createIcons();


