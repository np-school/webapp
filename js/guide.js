/* ══════════════════════ RENDER ══════════════════════ */
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══ Render ══ */
function renderPage() {
  return (
    /* Page header */
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title-row">' +
          '<div class="page-icon blue">' +
            '<i data-lucide="book-open" style="width:20px;height:20px;color:white;"></i>' +
          '</div>' +
          '<h1 class="page-title">คู่มือการใช้งาน</h1>' +
        '</div>' +
        '<p class="page-sub">NP Origins · อ่านทำความเข้าใจก่อนใช้งาน เพื่อให้การใช้บริการเป็นไปอย่างราบรื่น</p>' +
      '</div>' +
    '</div>' +

    /* ── Primary tab bar ── */
    '<div class="g-tabbar" id="gTabBar">' +
      '<button class="g-tab tab-active" id="gt-overview" onclick="switchGTab(\'overview\',this)">' +
        '<i data-lucide="layout-dashboard" style="width:15px;height:15px;"></i> ภาพรวมระบบ' +
      '</button>' +
      '<button class="g-tab" id="gt-room" onclick="switchGTab(\'room\',this)">' +
        '<i data-lucide="calendar" style="width:15px;height:15px;"></i> ขอใช้ห้อง/สถานที่' +
      '</button>' +
      '<button class="g-tab" id="gt-portfolio" onclick="switchGTab(\'portfolio\',this)">' +
        '<i data-lucide="send" style="width:15px;height:15px;"></i> ส่งงานประจำภาคเรียน' +
      '</button>' +
      '<button class="g-tab" id="gt-faq" onclick="switchGTab(\'faq\',this)">' +
        '<i data-lucide="help-circle" style="width:15px;height:15px;"></i> คำถามที่พบบ่อย' +
      '</button>' +
    '</div>' +

    /* ════════ TAB 1: ภาพรวม ════════ */
    '<div class="g-pane active" id="gp-overview">' +
      renderOverview() +
    '</div>' +

    /* ════════ TAB 2: ขอใช้ห้อง ════════ */
    '<div class="g-pane" id="gp-room">' +
      /* sub-tab bar */
      '<div class="sub-tab-bar scroll" id="gsub-room-bar">' +
        '<button class="sub-tab active" data-tab="user"><i data-lucide="user" style="width:14px;height:14px;"></i> สำหรับผู้ใช้งาน</button>' +
        '<button class="sub-tab" data-tab="status"><i data-lucide="list-checks" style="width:14px;height:14px;"></i> ความหมายสถานะ</button>' +
        '<button class="sub-tab" data-tab="admin"><i data-lucide="shield" style="width:14px;height:14px;"></i> สำหรับ Admin</button>' +
      '</div>' +
      '<div class="tab-pane active" data-panel="user" id="gsp-room-user">' + renderRoomUser() + '</div>' +
      '<div class="tab-pane" data-panel="status" id="gsp-room-status">' + renderRoomStatus() + '</div>' +
      '<div class="tab-pane" data-panel="admin" id="gsp-room-admin">' + renderRoomAdmin() + '</div>' +
    '</div>' +

    /* ════════ TAB 3: ส่งงาน ════════ */
    '<div class="g-pane" id="gp-portfolio">' +
      '<div class="sub-tab-bar purple scroll" id="gsub-portfolio-bar">' +
        '<button class="sub-tab active" data-tab="teacher"><i data-lucide="user" style="width:14px;height:14px;"></i> สำหรับครู</button>' +
        '<button class="sub-tab" data-tab="workflow"><i data-lucide="workflow" style="width:14px;height:14px;"></i> Workflow สถานะ</button>' +
        '<button class="sub-tab" data-tab="admin"><i data-lucide="shield" style="width:14px;height:14px;"></i> สำหรับ Admin</button>' +
      '</div>' +
      '<div class="tab-pane active" data-panel="teacher" id="gsp-portfolio-teacher">' + renderPortfolioTeacher() + '</div>' +
      '<div class="tab-pane" data-panel="workflow" id="gsp-portfolio-workflow">' + renderPortfolioWorkflow() + '</div>' +
      '<div class="tab-pane" data-panel="admin" id="gsp-portfolio-admin">' + renderPortfolioAdmin() + '</div>' +
    '</div>' +

    /* ════════ TAB 4: FAQ ════════ */
    '<div class="g-pane" id="gp-faq">' +
      renderFaq() +
    '</div>'
  );
}

/* ══ TAB CONTENT ══ */

function renderOverview() {
  return (
    '<div class="card" style="margin-bottom:16px;">' +
      '<div class="page-title-row" style="margin-bottom:12px;">' +
        '<div class="page-icon blue"><i data-lucide="layout-dashboard" style="width:18px;height:18px;color:white;"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">NP Origins คืออะไร</span>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--text-mid);line-height:1.8;margin-bottom:18px;">' +
        'NP Origins คือ<strong>ระบบบริการออนไลน์ของโรงเรียนหนองกี่พิทยาคม</strong> ที่รวบรวมบริการต่างๆ ไว้ในที่เดียว เข้าใช้งานได้ผ่าน Google Account ของโรงเรียน <strong>(@nongki.ac.th)</strong> ปัจจุบันเปิดให้บริการ 2 ระบบหลัก' +
      '</p>' +
      '<div class="sys-grid">' +
        '<div class="sys-card sys-card-blue">' +
          '<div style="font-size:22px;">🏫</div>' +
          '<div class="sys-card-title">ขอใช้ห้อง / สถานที่</div>' +
          '<div class="sys-card-desc">จองห้องประชุม ห้องเรียน หรือสถานที่ต่างๆ ของโรงเรียน พร้อมระบบอนุมัติโดยเจ้าหน้าที่</div>' +
        '</div>' +
        '<div class="sys-card sys-card-purple">' +
          '<div style="font-size:22px;">📋</div>' +
          '<div class="sys-card-title">ส่งงานประจำภาคเรียน</div>' +
          '<div class="sys-card-desc">อัปโหลดเอกสารภาระงานของครู ผ่านกระบวนการตรวจสอบหลายขั้นตอนจนถึงผู้บริหาร</div>' +
        '</div>' +
      '</div>' +
      '<div class="sdiv">การเข้าสู่ระบบ</div>' +
      '<div class="g-step">' +
        '<div class="g-num" style="background:var(--accent-tint);color:var(--accent);">1</div>' +
        '<div><div class="g-step-title">เข้าเว็บไซต์หรือแอปพลิเคชัน</div>' +
        '<div class="g-step-desc">เปิด NP Origins ผ่านเบราว์เซอร์หรือ Add to Home Screen บน iOS/Android เพื่อใช้งานแบบ PWA</div></div>' +
      '</div>' +
      '<div class="g-step">' +
        '<div class="g-num" style="background:var(--accent-tint);color:var(--accent);">2</div>' +
        '<div><div class="g-step-title">คลิก "เข้าสู่ระบบด้วย Google"</div>' +
        '<div class="g-step-desc">เลือกบัญชี <strong>@nongki.ac.th</strong> เท่านั้น บัญชีส่วนตัว Gmail จะไม่สามารถเข้าใช้งานได้</div></div>' +
      '</div>' +
      '<div class="g-step">' +
        '<div class="g-num" style="background:var(--accent-tint);color:var(--accent);">3</div>' +
        '<div><div class="g-step-title">เลือกระบบจาก Sidebar</div>' +
        '<div class="g-step-desc">เมื่อเข้าสู่ระบบสำเร็จ เลือกเมนูที่ต้องการจาก Sidebar ด้านซ้าย บนมือถือกดปุ่มเมนู ☰ มุมบนซ้ายเพื่อเปิด Sidebar</div></div>' +
      '</div>' +
      '<div class="g-alert g-alert-blue">' +
        '<i data-lucide="info" style="width:16px;height:16px;flex-shrink:0;margin-top:1px;"></i>' +
        '<div>ระบบรองรับการแจ้งเตือนผ่าน <strong>LINE</strong> หากเชื่อมต่อ LINE Token ไว้ในโปรไฟล์ จะได้รับแจ้งเตือนผลการอนุมัติและการแจ้งเตือนก่อนถึงเวลา</div>' +
      '</div>' +
    '</div>'
  );
}

function renderRoomUser() {
  return (
    '<div class="card" style="margin-bottom:16px;">' +
      '<div class="page-title-row" style="margin-bottom:12px;">' +
        '<div class="page-icon blue"><i data-lucide="calendar-plus" style="width:18px;height:18px;color:white;"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">ขั้นตอนการขอใช้ห้อง/สถานที่</span>' +
      '</div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--accent-tint);color:var(--accent);">1</div><div>' +
        '<div class="g-step-title">เข้าสู่ระบบด้วย Google Account</div>' +
        '<div class="g-step-desc">คลิก "เข้าสู่ระบบด้วย Google" แล้วเลือกบัญชี <strong>@nongki.ac.th</strong> ของโรงเรียน</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--accent-tint);color:var(--accent);">2</div><div>' +
        '<div class="g-step-title">เลือกห้องและตรวจสอบปฏิทิน</div>' +
        '<div class="g-step-desc">เลือกห้องที่ต้องการจาก Sidebar หรือ Dropdown แล้วดูปฏิทิน วันที่มีจุดสีเหลืองหมายถึงมีการจองอยู่แล้ว วันสีแดงหมายถึงจองเต็มแล้ว</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--accent-tint);color:var(--accent);">3</div><div>' +
        '<div class="g-step-title">กดปุ่ม "จองห้อง / สถานที่"</div>' +
        '<div class="g-step-desc">คลิกปุ่มสีน้ำเงินมุมขวาบน กรอกข้อมูลให้ครบ ได้แก่ ชื่อ-สกุล ตำแหน่ง วัตถุประสงค์ วันที่/เวลา จำนวนผู้เข้าร่วม และอุปกรณ์ที่ต้องการ</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--accent-tint);color:var(--accent);">4</div><div>' +
        '<div class="g-step-title">เลือกช่วงเวลา</div>' +
        '<div class="g-step-desc">มี 2 โหมด: <strong>คลาสเรียน</strong> (คาบที่ 1–8 พร้อมช่วงพักกลางวัน) หรือ <strong>กำหนดเอง</strong> (เลือกช่วงเวลาอิสระ) ช่วงที่ถูกจองแล้วจะแสดงเป็นสีแดง</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--accent-tint);color:var(--accent);">5</div><div>' +
        '<div class="g-step-title">แนบไฟล์ผังที่นั่ง (ถ้ามี)</div>' +
        '<div class="g-step-desc">หากมีการจัดผังที่นั่งหรือแผนผังการใช้งาน สามารถแนบไฟล์ภาพได้ เพื่อให้เจ้าหน้าที่พิจารณาได้สะดวกขึ้น</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--role-academic-bg);color:var(--green-deep);">6</div><div>' +
        '<div class="g-step-title">รอการพิจารณาและรับแจ้งผล</div>' +
        '<div class="g-step-desc">เจ้าหน้าที่จะพิจารณาภายใน 1–2 วันทำการ ผลจะแสดงในหน้า "การจองของฉัน" และแจ้งผ่าน LINE หากเชื่อมต่อไว้</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--role-academic-bg);color:var(--green-deep);">✓</div><div>' +
        '<div class="g-step-title">นำหลักฐานติดต่อห้องบริหารทั่วไป</div>' +
        '<div class="g-step-desc">เมื่อได้รับการอนุมัติ ให้แคปหน้าจอสถานะ "อนุมัติ" หรือพิมพ์ใบยืนยัน ไปแสดงที่ห้องบริหารทั่วไปก่อนใช้งานสถานที่</div>' +
      '</div></div>' +
      '<div class="g-alert g-alert-yellow">' +
        '<i data-lucide="alert-triangle" style="width:16px;height:16px;flex-shrink:0;margin-top:1px;"></i>' +
        '<div>กรุณาส่งคำขอล่วงหน้าอย่างน้อย <strong>1 วันทำการ</strong> คำขอที่ส่งในวันเดียวกันหรือช่วงวันหยุดอาจไม่ทันการพิจารณา</div>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="page-title-row" style="margin-bottom:12px;">' +
        '<div class="page-icon" style="background:var(--yellow-light);"><i data-lucide="calendar-days" style="width:18px;height:18px;color:var(--role-director-color);"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">ฟีเจอร์บนหน้าปฏิทิน</span>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;font-size:13px;color:var(--text-mid);">' +
        '<div style="display:flex;gap:12px;align-items:flex-start;"><span style="background:var(--role-hog-bg);color:var(--role-director-color);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;flex-shrink:0;">จุดเหลือง</span><span>วันที่มีการจองบางช่วงเวลา (ยังจองได้ในช่วงที่ว่าง)</span></div>' +
        '<div style="display:flex;gap:12px;align-items:flex-start;"><span style="background:var(--red-light);color:var(--red-dark);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;flex-shrink:0;">วันแดง</span><span>วันที่มีการจองเต็มทั้งวัน ไม่สามารถจองเพิ่มได้</span></div>' +
        '<div style="display:flex;gap:12px;align-items:flex-start;"><span style="background:var(--accent);color:white;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;flex-shrink:0;">วันนี้</span><span>วันปัจจุบัน แสดงด้วยพื้นหลังน้ำเงิน</span></div>' +
        '<div style="display:flex;gap:12px;align-items:flex-start;"><span style="background:var(--accent-tint);color:var(--accent);border:1.5px solid var(--accent);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;flex-shrink:0;">เลือกแล้ว</span><span>วันที่คุณเลือกสำหรับคำขอปัจจุบัน</span></div>' +
      '</div>' +
      '<div class="sdiv" style="margin-top:18px;">ฟีเจอร์เสริม</div>' +
      '<div style="font-size:13px;color:var(--text-mid);line-height:1.9;">' +
        '• <strong>จองหลายวัน:</strong> เลือกหลายวันพร้อมกันได้ในคำขอเดียว ระบบจะแสดงวันที่เลือกเป็น Tag สีฟ้า<br>' +
        '• <strong>สถิติห้องรายเดือน:</strong> แถบด้านข้างแสดงห้องที่ถูกจองบ่อยที่สุดในเดือนนั้น<br>' +
        '• <strong>ตัวกรอง:</strong> กรองดูคำขอตามสถานะ (รอตรวจ/อนุมัติ/ไม่อนุมัติ) หรือค้นหาชื่อผู้จอง' +
      '</div>' +
    '</div>'
  );
}

function renderRoomStatus() {
  return (
    '<div class="card" style="margin-bottom:16px;">' +
      '<div class="page-title-row" style="margin-bottom:16px;">' +
        '<div class="page-icon" style="background:var(--yellow-light);"><i data-lucide="clock" style="width:18px;height:18px;color:var(--role-director-color);"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">ความหมายของสถานะคำขอจองห้อง</span>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px;">' +
        '<div class="status-row"><span class="sbadge sb-pending" style="flex-shrink:0;">⏳ รอตรวจ</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">คำขอถูกส่งเรียบร้อยแล้ว กำลังรอเจ้าหน้าที่ห้องบริหารทั่วไปพิจารณา ยังไม่มีการตัดสินใจ</div></div>' +
        '<div class="status-row"><span class="sbadge sb-approved" style="flex-shrink:0;">✅ อนุมัติ</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">คำขอได้รับการอนุมัติ สามารถใช้งานสถานที่ได้ตามวันเวลาที่ขอ อย่าลืมนำหลักฐานไปแสดงที่ห้องบริหารทั่วไป</div></div>' +
        '<div class="status-row"><span class="sbadge sb-rejected" style="flex-shrink:0;">✗ ไม่อนุมัติ</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">คำขอไม่ผ่านการอนุมัติ อาจเนื่องจากสถานที่ถูกจองซ้อน หรือข้อมูลไม่ครบ ดูเหตุผลในรายละเอียดแล้วส่งใหม่ได้</div></div>' +
        '<div class="status-row"><span class="sbadge sb-done" style="flex-shrink:0;">✅ เสร็จสิ้น</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">การจองผ่านพ้นวันเวลาที่ระบุแล้ว ระบบเปลี่ยนสถานะโดยอัตโนมัติ แสดงด้วยสีเทาเพื่อแยกจากการจองที่ยังใช้งานอยู่</div></div>' +
      '</div>' +
      '<div class="g-alert g-alert-blue">' +
        '<i data-lucide="info" style="width:16px;height:16px;flex-shrink:0;margin-top:1px;"></i>' +
        '<div>หากสถานะเป็น "ไม่อนุมัติ" สามารถส่งคำขอใหม่ได้ โดยแก้ไขข้อมูลหรือเลือกวันเวลาอื่น ระบบไม่มีฟังก์ชันแก้ไขคำขอที่ส่งไปแล้ว</div>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="page-title-row" style="margin-bottom:12px;">' +
        '<div class="page-icon blue"><i data-lucide="git-branch" style="width:18px;height:18px;color:white;"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">Flow การทำงานของระบบจองห้อง</span>' +
      '</div>' +
      '<div style="overflow-x:auto;"><div style="min-width:460px;">' +
        '<div class="flow-row"><div class="flow-box fb-blue">ครูส่งคำขอ</div><div class="flow-arrow">→</div><div class="flow-box fb-yellow">รอตรวจ</div><div class="flow-arrow">→</div><div class="flow-box fb-gray">Admin ตรวจสอบ</div></div>' +
        '<div style="margin:10px 0 4px;display:flex;gap:16px;flex-wrap:wrap;">' +
          '<div><div class="flow-row" style="margin:4px 0;"><div class="flow-arrow" style="padding-left:0;">↓ อนุมัติ</div></div><div class="flow-box fb-green">อนุมัติ → ใช้งานได้</div></div>' +
          '<div style="margin-left:8px;"><div class="flow-row" style="margin:4px 0;"><div class="flow-arrow" style="padding-left:0;">↓ ปฏิเสธ</div></div><div class="flow-box fb-red">ไม่อนุมัติ → ส่งใหม่</div></div>' +
        '</div>' +
        '<div style="margin-top:12px;" class="flow-row"><div class="flow-box fb-green">อนุมัติ</div><div class="flow-arrow">→</div><div class="flow-box fb-blue">แจ้ง LINE</div><div class="flow-arrow">→</div><div class="flow-box fb-gray">ใช้งานสถานที่</div><div class="flow-arrow">→</div><div class="flow-box sbadge sb-done" style="border-radius:10px;padding:9px 14px;font-size:12px;">เสร็จสิ้น (auto)</div></div>' +
      '</div></div>' +
      '<div class="g-alert g-alert-green">' +
        '<i data-lucide="bell" style="width:16px;height:16px;flex-shrink:0;margin-top:1px;"></i>' +
        '<div>ระบบส่งแจ้งเตือน LINE <strong>อัตโนมัติ</strong> ทั้งเมื่ออนุมัติ/ปฏิเสธ และก่อนถึงเวลาจอง 15 นาที (ต้องเชื่อมต่อ LINE ก่อน)</div>' +
      '</div>' +
    '</div>'
  );
}

function renderRoomAdmin() {
  return (
    '<div class="card">' +
      '<div class="page-title-row" style="margin-bottom:12px;">' +
        '<div class="page-icon" style="background:var(--indigo-light);"><i data-lucide="shield-check" style="width:18px;height:18px;color:var(--violet);"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">คู่มือสำหรับ Admin ห้อง</span>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--text-mid);line-height:1.8;margin-bottom:16px;">' +
        'Admin มีหน้าจัดการพิเศษ (<strong>admin-room.html</strong>) ที่ครูทั่วไปไม่สามารถเข้าถึงได้ ระบบตรวจสอบสิทธิ์ผ่าน email list ที่กำหนดไว้ใน Firestore' +
      '</p>' +
      '<div class="sdiv">การพิจารณาคำขอ</div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--indigo-light);color:var(--violet);">1</div><div>' +
        '<div class="g-step-title">เข้าหน้า Admin Dashboard</div>' +
        '<div class="g-step-desc">เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ Admin ระบบจะแสดง Dashboard พร้อมสรุปคำขอแยกตามสถานะ และสถิติห้องที่ถูกจองบ่อย</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--indigo-light);color:var(--violet);">2</div><div>' +
        '<div class="g-step-title">กรองและค้นหาคำขอ</div>' +
        '<div class="g-step-desc">ใช้ filter pill (รอตรวจ/อนุมัติ/ไม่อนุมัติ) หรือช่องค้นหาเพื่อหาคำขอที่ต้องการ คำขอ "รอตรวจ" จะแสดงขอบซ้ายสีส้ม</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--indigo-light);color:var(--violet);">3</div><div>' +
        '<div class="g-step-title">อนุมัติหรือปฏิเสธคำขอ</div>' +
        '<div class="g-step-desc">คลิกปุ่ม <strong style="color:var(--green);">✓ อนุมัติ</strong> หรือ <strong style="color:var(--red);">✗ ปฏิเสธ</strong> (พร้อมใส่หมายเหตุ) ระบบจะส่ง LINE แจ้งผู้ขอทันทีผ่าน Cloud Function</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--indigo-light);color:var(--violet);">4</div><div>' +
        '<div class="g-step-title">ดูไฟล์แนบผังที่นั่ง</div>' +
        '<div class="g-step-desc">กดปุ่ม "ดูไฟล์" บนการ์ดคำขอ ระบบจะแสดงรูปภาพผังที่นั่งที่ผู้ขอแนบมา</div>' +
      '</div></div>' +
      '<div class="sdiv">การจัดการห้อง/สถานที่</div>' +
      '<div style="font-size:13px;color:var(--text-mid);line-height:1.9;">' +
        '• <strong>เพิ่มห้อง:</strong> กรอกชื่อห้อง ความจุ รายละเอียด และอัปโหลดรูปภาพห้อง<br>' +
        '• <strong>แก้ไขห้อง:</strong> คลิกที่รายการห้องแล้วแก้ไขข้อมูลได้ทันที<br>' +
        '• <strong>ลบห้อง:</strong> ลบออกจากระบบ (คำขอที่ผูกกับห้องนั้นยังแสดงอยู่)<br>' +
        '• <strong>จัดการอุปกรณ์:</strong> เพิ่ม/ลบรายการอุปกรณ์ที่ให้เลือกในแบบฟอร์ม' +
      '</div>' +
      '<div class="sdiv">แผงสถิติ</div>' +
      '<div style="font-size:13px;color:var(--text-mid);line-height:1.9;">' +
        '• <strong>Donut Chart:</strong> สัดส่วนคำขอ รอตรวจ / อนุมัติ / ไม่อนุมัติ<br>' +
        '• <strong>Bar Chart:</strong> ห้องที่ถูกจองบ่อยที่สุดในเดือนปัจจุบัน<br>' +
        '• <strong>Line Chart:</strong> แนวโน้มจำนวนคำขอรายวันในเดือนนั้น' +
      '</div>' +
    '</div>'
  );
}

function renderPortfolioTeacher() {
  return (
    '<div class="card" style="margin-bottom:16px;">' +
      '<div class="page-title-row" style="margin-bottom:12px;">' +
        '<div class="page-icon" style="background:var(--indigo-light);"><i data-lucide="send" style="width:18px;height:18px;color:var(--violet);"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">ขั้นตอนการส่งงานประจำภาคเรียน</span>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--text-mid);line-height:1.8;margin-bottom:16px;">' +
        'ระบบนี้สำหรับ<strong>ครูผู้สอน</strong>ส่งเอกสารภาระงานประจำภาคเรียน เช่น แผนการจัดการเรียนรู้ บันทึกหลังสอน และเอกสารประกอบอื่นๆ ผ่านกระบวนการตรวจสอบหลายขั้นตอน' +
      '</p>' +
      '<div class="g-step"><div class="g-num" style="background:var(--indigo-light);color:var(--violet);">1</div><div>' +
        '<div class="g-step-title">เข้าสู่ระบบและเลือกเมนู "ส่งงานประจำภาคเรียน"</div>' +
        '<div class="g-step-desc">ล็อกอินด้วย <strong>@nongki.ac.th</strong> แล้วเลือกเมนู <strong>ส่งงานประจำภาคเรียน</strong> จาก Sidebar</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--indigo-light);color:var(--violet);">2</div><div>' +
        '<div class="g-step-title">เลือกภาคเรียนที่ต้องการส่ง</div>' +
        '<div class="g-step-desc">กดปุ่มภาคเรียน (เช่น 1/2567 หรือ 2/2567) ที่ด้านบน ระบบจะแสดงรายการเอกสารที่ต้องส่ง</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--indigo-light);color:var(--violet);">3</div><div>' +
        '<div class="g-step-title">ดูรายการเอกสารที่ต้องส่ง</div>' +
        '<div class="g-step-desc">ระบบแสดงรายการเอกสารทั้งหมด พร้อมสถานะปัจจุบัน มีแถบ Progress Ring แสดงเปอร์เซ็นต์ความสำเร็จโดยรวม</div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--indigo-light);color:var(--violet);">4</div><div>' +
        '<div class="g-step-title">คลิกที่รายการเอกสารเพื่ออัปโหลด</div>' +
        '<div class="g-step-desc">คลิกการ์ดเอกสาร กดพื้นที่อัปโหลดหรือลากไฟล์มาวาง รองรับ PDF, Word (.docx, .doc), ภาพ (.jpg, .png) ขนาดไม่เกิน <strong>10 MB</strong></div>' +
      '</div></div>' +
      '<div class="g-step"><div class="g-num" style="background:var(--role-academic-bg);color:var(--green-deep);">✓</div><div>' +
        '<div class="g-step-title">รอการอนุมัติขั้นสุดท้าย</div>' +
        '<div class="g-step-desc">เมื่อผ่านครบทุกขั้นตอนจนสถานะเป็น <span class="sbadge sb-final_approved" style="font-size:10px;">● อนุมัติแล้ว</span> ถือว่าการส่งงานเสร็จสมบูรณ์</div>' +
      '</div></div>' +
      '<div class="g-alert g-alert-blue">' +
        '<i data-lucide="info" style="width:16px;height:16px;flex-shrink:0;margin-top:1px;"></i>' +
        '<div>สามารถส่งงานซ้ำหรือเปลี่ยนไฟล์ได้หากถูกขอแก้ไข ระบบจะแสดงไฟล์ล่าสุดแก่ผู้ตรวจสอบเสมอ และเก็บประวัติการส่งทุกครั้งไว้</div>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="page-title-row" style="margin-bottom:12px;">' +
        '<div class="page-icon" style="background:var(--yellow-light);"><i data-lucide="zap" style="width:18px;height:18px;color:var(--role-director-color);"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">ฟีเจอร์สำคัญในหน้าส่งงาน</span>' +
      '</div>' +
      '<div style="font-size:13px;color:var(--text-mid);line-height:1.9;">' +
        '• <strong>Progress Ring:</strong> แสดงเปอร์เซ็นต์งานที่ส่งครบแล้วในภาคเรียน (นับเฉพาะที่อนุมัติแล้ว)<br>' +
        '• <strong>แยกตามภาคเรียน:</strong> กดปุ่มเลือกภาคเรียนได้ ระบบจะโหลดรายการเอกสารของภาคนั้น<br>' +
        '• <strong>อัปโหลดซ้ำ:</strong> กดปุ่ม "เปลี่ยนไฟล์" บนการ์ดเอกสารที่ส่งแล้ว เพื่ออัปโหลดไฟล์ใหม่แทน<br>' +
        '• <strong>ดูไฟล์ที่ส่ง:</strong> กดลิงก์บนการ์ดเพื่อเปิดหรือดาวน์โหลดไฟล์ล่าสุดที่ส่งไปแล้ว<br>' +
        '• <strong>บันทึกข้อความราชการ:</strong> สร้างบันทึกข้อความราชการ (Memo) สรุปรายการเอกสารที่ส่ง พร้อมพิมพ์ได้ทันที' +
      '</div>' +
    '</div>'
  );
}

function renderPortfolioWorkflow() {
  return (
    '<div class="card">' +
      '<div class="page-title-row" style="margin-bottom:12px;">' +
        '<div class="page-icon" style="background:var(--indigo-light);"><i data-lucide="git-branch" style="width:18px;height:18px;color:var(--violet);"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">Workflow สถานะเอกสารส่งงาน (5 ขั้นตอน)</span>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--text-mid);line-height:1.8;margin-bottom:16px;">' +
        'เอกสารแต่ละชิ้นผ่านกระบวนการตรวจสอบหลายขั้น ตั้งแต่ครูส่งจนถึงผู้บริหารอนุมัติขั้นสุดท้าย' +
      '</p>' +
      '<div class="wf-bar" style="margin-bottom:20px;">' +
        '<div class="wf-step wf-done"><i data-lucide="upload" style="width:12px;height:12px;"></i><span>ส่งแล้ว</span></div>' +
        '<div class="wf-div"></div>' +
        '<div class="wf-step wf-active"><i data-lucide="eye" style="width:12px;height:12px;"></i><span>หัวหน้าตรวจ</span></div>' +
        '<div class="wf-div"></div>' +
        '<div class="wf-step wf-pend"><i data-lucide="user-check" style="width:12px;height:12px;"></i><span>ผู้ตรวจสอบ</span></div>' +
        '<div class="wf-div"></div>' +
        '<div class="wf-step wf-pend"><i data-lucide="user-check" style="width:12px;height:12px;"></i><span>รองผอ.</span></div>' +
        '<div class="wf-div"></div>' +
        '<div class="wf-step wf-final"><i data-lucide="shield-check" style="width:12px;height:12px;"></i><span>อนุมัติแล้ว</span></div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px;">' +
        '<div class="status-row"><span class="sbadge" style="background:var(--bg-alt);color:var(--text2);white-space:nowrap;flex-shrink:0;">— ยังไม่ส่ง</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">ยังไม่มีการอัปโหลดไฟล์ การ์ดมีขอบซ้ายสีเทา</div></div>' +
        '<div class="status-row"><span class="sbadge sb-submitted" style="white-space:nowrap;flex-shrink:0;">● ส่งแล้ว</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">อัปโหลดไฟล์สำเร็จ รอหัวหน้ากลุ่มสาระตรวจสอบ การ์ดมีขอบซ้ายสีเขียว</div></div>' +
        '<div class="status-row"><span class="sbadge sb-head_reviewed" style="white-space:nowrap;flex-shrink:0;">● หัวหน้าตรวจแล้ว</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">หัวหน้ากลุ่มสาระตรวจสอบผ่านแล้ว ส่งต่อให้ผู้ตรวจสอบระดับถัดไป การ์ดมีขอบซ้ายสีฟ้า</div></div>' +
        '<div class="status-row"><span class="sbadge sb-reviewed" style="white-space:nowrap;flex-shrink:0;">● ผู้ตรวจสอบตรวจแล้ว</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">ผ่านการตรวจสอบระดับกลาง รอรองผู้อำนวยการพิจารณา</div></div>' +
        '<div class="status-row"><span class="sbadge sb-deputy_reviewed" style="white-space:nowrap;flex-shrink:0;">● รองผอ. ตรวจแล้ว</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">ผ่านการตรวจสอบจากรองผู้อำนวยการ รอผู้บริหารอนุมัติขั้นสุดท้าย</div></div>' +
        '<div style="display:flex;align-items:flex-start;gap:14px;padding:13px;background:var(--violet-light);border-radius:12px;border:1px solid var(--role-dep-general-border);"><span class="sbadge sb-final_approved" style="white-space:nowrap;flex-shrink:0;">● อนุมัติแล้ว</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">ผ่านการอนุมัติขั้นสุดท้าย เอกสารชิ้นนี้เสร็จสมบูรณ์ ไม่ต้องดำเนินการใดเพิ่มเติม</div></div>' +
        '<div style="display:flex;align-items:flex-start;gap:14px;padding:13px;background:var(--amber-light);border-radius:12px;border:1px solid var(--amber-mid);"><span class="sbadge sb-revision" style="white-space:nowrap;flex-shrink:0;">⚠ ขอแก้ไข</span><div style="font-size:13px;color:var(--text-mid);line-height:1.6;">ผู้ตรวจสอบขอให้แก้ไขเอกสาร อ่านข้อเสนอแนะ แก้ไขไฟล์ แล้วอัปโหลดใหม่ สถานะจะกลับเป็น "ส่งแล้ว" เพื่อรอตรวจรอบใหม่</div></div>' +
      '</div>' +
      '<div class="g-alert g-alert-yellow">' +
        '<i data-lucide="alert-triangle" style="width:16px;height:16px;flex-shrink:0;margin-top:1px;"></i>' +
        '<div>หากสถานะแสดง <strong>"ขอแก้ไข"</strong> ให้ตรวจสอบข้อเสนอแนะในรายละเอียดเอกสาร และอัปโหลดไฟล์ใหม่โดยเร็ว</div>' +
      '</div>' +
    '</div>'
  );
}

function renderPortfolioAdmin() {
  return (
    '<div class="card">' +
      '<div class="page-title-row" style="margin-bottom:12px;">' +
        '<div class="page-icon" style="background:var(--indigo-light);"><i data-lucide="shield-check" style="width:18px;height:18px;color:var(--violet);"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">คู่มือสำหรับ Admin งาน</span>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--text-mid);line-height:1.8;margin-bottom:16px;">' +
        'มีหน้าจัดการพิเศษ (<strong>admin-portfolio.html</strong>) สำหรับผู้ที่มีสิทธิ์ตรวจสอบ ระบบแบ่งตามบทบาท ดังนี้' +
      '</p>' +
      '<table class="role-table">' +
        '<thead><tr><th>บทบาท</th><th>สิ่งที่ทำได้</th></tr></thead>' +
        '<tbody>' +
          '<tr><td><strong>หัวหน้ากลุ่มสาระ</strong></td><td>ตรวจสอบงานครูในกลุ่มตัวเอง เปลี่ยนสถานะ submitted → head_reviewed หรือขอแก้ไข</td></tr>' +
          '<tr><td><strong>ผู้ตรวจสอบ (ฝ่ายวิชาการ)</strong></td><td>ตรวจสอบงานต่อจากหัวหน้ากลุ่มสาระ เปลี่ยนสถานะ head_reviewed → reviewed</td></tr>' +
          '<tr><td><strong>รองผู้อำนวยการ</strong></td><td>ตรวจสอบในลำดับถัดไป reviewed → deputy_reviewed</td></tr>' +
          '<tr><td><strong>ผู้บริหาร / ผู้อำนวยการ</strong></td><td>อนุมัติขั้นสุดท้าย deputy_reviewed → final_approved</td></tr>' +
        '</tbody>' +
      '</table>' +
      '<div class="g-alert g-alert-blue" style="margin-top:16px;">' +
        '<i data-lucide="info" style="width:16px;height:16px;flex-shrink:0;margin-top:1px;"></i>' +
        '<div>Admin แต่ละบทบาทเห็นได้เฉพาะงานที่อยู่ใน "คิว" ของตัวเอง ไม่สามารถข้ามขั้นหรือย้อนสถานะได้ ยกเว้นกรณีขอแก้ไข</div>' +
      '</div>' +
    '</div>'
  );
}

function renderFaq() {
  var faqsRoom = [
    ['สามารถจองห้องล่วงหน้าได้กี่วัน?', 'ไม่มีกำหนดขั้นต่ำสูงสุด แต่แนะนำให้จองล่วงหน้าอย่างน้อย <strong>1 วันทำการ</strong> เพื่อให้ Admin มีเวลาพิจารณา คำขอในวันเดียวกันหรือช่วงวันหยุดอาจไม่ทันได้รับการพิจารณา'],
    ['จองห้องเดียวกันหลายคนพร้อมกันได้ไหม?', 'ได้ แต่ระบบจะอนุมัติตามลำดับที่ส่งก่อน-หลัง หากช่วงเวลาซ้อนกัน ผู้ส่งทีหลังจะได้รับการปฏิเสธโดยอัตโนมัติ ควรตรวจสอบปฏิทินก่อนส่งคำขอ'],
    ['ถ้าต้องการยกเลิกการจองต้องทำอย่างไร?', 'ปัจจุบันระบบยังไม่รองรับการยกเลิกด้วยตัวเอง หากต้องการยกเลิก ให้ติดต่อเจ้าหน้าที่ห้องบริหารทั่วไปโดยตรง'],
  ];
  var faqsPortfolio = [
    ['ส่งงานได้กี่ไฟล์ต่อเอกสาร?', 'แต่ละเอกสารรองรับ <strong>1 ไฟล์</strong> ต่อการส่ง หากต้องการอัปเดตให้อัปโหลดไฟล์ใหม่แทนที่ไฟล์เดิมได้เลย ระบบจะแสดงไฟล์ล่าสุดแก่ผู้ตรวจสอบ'],
    ['ไฟล์ประเภทใดบ้างที่ระบบรองรับ?', 'รองรับ <strong>PDF, Word (.docx, .doc), ภาพ (.jpg, .jpeg, .png)</strong> ขนาดสูงสุด 10 MB ต่อไฟล์ แนะนำให้ส่งเป็น PDF เพื่อความสะดวกในการตรวจสอบ'],
    ['ถ้าสถานะ "ขอแก้ไข" ต้องทำอย่างไร?', 'คลิกที่เอกสารนั้นเพื่อดูความคิดเห็นจากผู้ตรวจสอบ จากนั้นแก้ไขเอกสาร แล้วอัปโหลดไฟล์ใหม่ผ่านปุ่ม "เปลี่ยนไฟล์" สถานะจะกลับเป็น "ส่งแล้ว" เพื่อรอตรวจรอบใหม่'],
    ['ครูแต่ละคนเห็นงานของคนอื่นได้ไหม?', 'ครูแต่ละคนเห็นได้เฉพาะ <strong>งานของตัวเอง</strong> เท่านั้น หัวหน้ากลุ่มสาระและผู้มีสิทธิ์ Admin เท่านั้นที่สามารถดูงานของครูทุกคนได้ในหน้า Admin'],
  ];

  function makeFaqs(list, prefix) {
    return list.map(function(f, i) {
      return '<div class="faq-item">' +
        '<button class="faq-q" onclick="toggleFaq(this)">' +
          '<span>' + f[0] + '</span>' +
          '<i data-lucide="chevron-down" style="width:16px;height:16px;color:var(--text3);flex-shrink:0;transition:transform .2s;"></i>' +
        '</button>' +
        '<div class="faq-a">' + f[1] + '</div>' +
      '</div>';
    }).join('');
  }

  return (
    '<div class="card" style="margin-bottom:16px;">' +
      '<div class="page-title-row" style="margin-bottom:16px;">' +
        '<div class="page-icon blue"><i data-lucide="calendar" style="width:18px;height:18px;color:white;"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">คำถามเกี่ยวกับระบบจองห้อง</span>' +
      '</div>' +
      makeFaqs(faqsRoom, 'room') +
    '</div>' +
    '<div class="card" style="margin-bottom:16px;">' +
      '<div class="page-title-row" style="margin-bottom:16px;">' +
        '<div class="page-icon" style="background:var(--indigo-light);"><i data-lucide="send" style="width:18px;height:18px;color:var(--violet);"></i></div>' +
        '<span style="font-size:16px;font-weight:800;color:var(--text);">คำถามเกี่ยวกับระบบส่งงาน</span>' +
      '</div>' +
      makeFaqs(faqsPortfolio, 'portfolio') +
    '</div>' +
    '<div class="cta-wrap">' +
      '<a class="cta-btn cta-blue" href="room-booking.html"><i data-lucide="calendar-plus" style="width:18px;height:18px;"></i> ระบบจองห้อง/สถานที่</a>' +
      '<a class="cta-btn cta-purple" href="teacher-portfolio.html"><i data-lucide="send" style="width:18px;height:18px;"></i> ระบบส่งงานประจำภาคเรียน</a>' +
    '</div>'
  );
}

/* ══ Tab functions (run after render) ══ */
function initTabs() {
  guideRoomSubtabs      = initSubtabs('gsub-room-bar');
  guidePortfolioSubtabs = initSubtabs('gsub-portfolio-bar');
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

function switchGTab(name, btn) {
  document.querySelectorAll('.g-pane').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.g-tab').forEach(function(b){ b.classList.remove('tab-active','tab-active-purple'); });
  var el = document.getElementById('gp-' + name);
  if (el) el.classList.add('active');
  var colorClass = name === 'portfolio' ? 'tab-active-purple' : 'tab-active';
  btn.classList.add(colorClass);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

var guideRoomSubtabs, guidePortfolioSubtabs; // handle จาก initSubtabs() — ผูกใน initTabs() หลัง renderPage()

function toggleFaq(btn) {
  var answer = btn.nextElementSibling;
  var icon   = btn.querySelector('[data-lucide="chevron-down"]');
  var isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-a').forEach(function(a){ a.classList.remove('open'); });
  document.querySelectorAll('.faq-q [data-lucide="chevron-down"]').forEach(function(i){ i.style.transform = ''; });
  if (!isOpen) {
    answer.classList.add('open');
    if (icon) icon.style.transform = 'rotate(180deg)';
  }
}

/* ══════════════════════ INIT ══════════════════════ */
buildPage({
  appId:        'guideApp',
  navSubtitle:  'คู่มือการใช้งาน',
  navTheme:     'blue',
  activePage:   'guide',
  requireAdmin: false,
  requireAuth:  false,

  onAuth: function(user, contentEl) {
    if (user) {
      updateNavUser(user);
      updateSidebarProfile(user);
      checkAdminAccess(user.email);
    }

    contentEl.innerHTML = renderPage();
    lucide.createIcons();
    initTabs();
    setupScrollTopButton();
  }
});

/* ── Deep-link support ── */
(function(){
  var h = window.location.hash;
  var map = {
    '#sec-room':             ['room',      'room',      'user'],
    '#sec-status':           ['room',      'room',      'status'],
    '#sec-portfolio':        ['portfolio', 'portfolio', 'teacher'],
    '#sec-portfolio-status': ['portfolio', 'portfolio', 'workflow'],
    '#sec-faq':              ['faq',       null,        null],
  };
  if (map[h]) {
    var t = map[h];
    /* tabs init after onAuth — defer */
    window.addEventListener('load', function() {
      var btn = document.getElementById('gt-' + t[0]);
      if (btn) switchGTab(t[0], btn);
      if (t[1] && t[2]) {
        var handle = t[1] === 'room' ? guideRoomSubtabs : guidePortfolioSubtabs;
        if (handle) handle.activate(t[2]);
      }
    });
  }
})();



