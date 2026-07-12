/* ══════════════════════ STATE ══════════════════════ */
var SUPER_ADMIN = 'nattapol@nongki.ac.th';
var currentUser = null;
var allAdmins   = [];  // [{email, data:{name,permissions,...}}]
var editingEmail = null;
var deletingEmail = null;
var currentView = 'group';
var quickPerm = null; // {email, permKey, newVal}

/* ── Staff data (for picker) ── */
var allStaffList = []; // [{id, name, email, group, role}]
var staffPickerOpen = false;

/* ── Staff Picker: toggle dropdown ── */
var _staffFilteredCache = [];

/* ── Head-of-group custom picker ── */
var hogPickerOpen = false;
var _hogFilteredCache = [];
var _selectedHog = null;

var PERM_DEFS = [
  {
    key: 'ipad',
    label: 'ระบบยืม-คืนไอแพด',
    desc: 'อนุมัติ/บันทึกการยืม-คืนไอแพดของโรงเรียน',
    group: 'กลุ่มบริหารงบประมาณ',
    icon: 'tablet-smartphone',
    get color()  { return cssVar('--role-budget-color');  },
    get bg()     { return cssVar('--role-budget-bg');     },
    get border() { return cssVar('--role-budget-border'); }
  },
  {
    key: 'bookings',
    label: 'ระบบจองห้อง',
    desc: 'อนุมัติ/ปฏิเสธคำขอ และจัดการห้อง',
    group: 'กลุ่มบริหารทั่วไป',
    icon: 'calendar-cog',
    get color()  { return cssVar('--role-general-color');  },
    get bg()     { return cssVar('--role-general-bg');     },
    get border() { return cssVar('--role-general-border'); }
  },
  {
    key: 'foodcourt',
    label: 'Food Court',
    desc: 'บันทึกและดูรายรับ–รายจ่าย Food Court',
    group: 'กลุ่มบริหารทั่วไป',
    icon: 'utensils',
    get color()  { return cssVar('--role-general-color');  },
    get bg()     { return cssVar('--role-general-bg');     },
    get border() { return cssVar('--role-general-border'); }
  },
  {
    key: 'repair',
    label: 'จัดการระบบแจ้งซ่อม',
    desc: 'อนุมัติ มอบหมายช่าง และติดตามงานแจ้งซ่อมทั้งหมด',
    group: 'กลุ่มบริหารทั่วไป',
    icon: 'wrench',
    get color()  { return cssVar('--role-general-color');  },
    get bg()     { return cssVar('--role-general-bg');     },
    get border() { return cssVar('--role-general-border'); }
  },
  {
    key: 'portfolio',
    label: 'ติดตามส่งงานครู (ดูอย่างเดียว)',
    desc: 'ดูภาพรวมการส่งงาน · ไม่มีสิทธิ์ตรวจ/เปลี่ยนสถานะ',
    group: 'กลุ่มวิชาการ',
    icon: 'eye',
    get color()  { return cssVar('--role-academic-color');  },
    get bg()     { return cssVar('--role-academic-bg');     },
    get border() { return cssVar('--role-academic-border'); }
  },
  {
    key: 'staff',
    label: 'ข้อมูลบุคลากร',
    desc: 'เพิ่ม แก้ไข นำเข้า CSV',
    group: 'กลุ่มบริหารงานบุคคล',
    icon: 'user-cog',
    get color()  { return cssVar('--role-hr-color');  },
    get bg()     { return cssVar('--role-hr-bg');     },
    get border() { return cssVar('--role-hr-border'); }
  },
  {
    key: 'headOfGroup',
    label: 'หัวหน้ากลุ่มสาระ',
    desc: 'ดูและตรวจสอบการส่งงานในกลุ่มสาระของตน',
    group: 'หัวหน้ากลุ่มสาระ',
    icon: 'star',
    get color()  { return cssVar('--role-hog-color');  },
    get bg()     { return cssVar('--role-hog-bg');     },
    get border() { return cssVar('--role-hog-border'); }
  },
  {
    key: 'admins',
    label: 'จัดการ Admin',
    desc: 'SuperAdmin เท่านั้น',
    group: 'SuperAdmin',
    icon: 'shield',
    get color()  { return cssVar('--role-super-color');  },
    get bg()     { return cssVar('--role-super-bg');     },
    get border() { return cssVar('--role-super-border'); }
  },
  {
    key: 'assistantDirectorAcademic',
    label: 'ผู้ช่วย ผอ.ฝ่ายวิชาการ',
    desc: 'ตรวจงานครูขั้นที่ 2 ได้ทุกกลุ่มสาระ (หลังหัวหน้าฯ ตรวจ)',
    group: 'ผู้ช่วยผู้อำนวยการ',
    icon: 'medal',
    get color()  { return cssVar('--role-asst-academic-color');  },
    get bg()     { return cssVar('--role-asst-academic-bg');     },
    get border() { return cssVar('--role-asst-academic-border'); }
  },
  {
    key: 'assistantDirectorBudget',
    label: 'ผู้ช่วย ผอ.ฝ่ายบริหารงบประมาณ',
    desc: 'ดูแลและกำกับงานด้านงบประมาณ',
    group: 'ผู้ช่วยผู้อำนวยการ',
    icon: 'medal',
    get color()  { return cssVar('--role-asst-budget-color');  },
    get bg()     { return cssVar('--role-asst-budget-bg');     },
    get border() { return cssVar('--role-asst-budget-border'); }
  },
  {
    key: 'assistantDirectorGeneral',
    label: 'ผู้ช่วย ผอ.ฝ่ายบริหารทั่วไป',
    desc: 'ดูแลและกำกับงานด้านบริหารทั่วไป',
    group: 'ผู้ช่วยผู้อำนวยการ',
    icon: 'medal',
    get color()  { return cssVar('--role-asst-general-color');  },
    get bg()     { return cssVar('--role-asst-general-bg');     },
    get border() { return cssVar('--role-asst-general-border'); }
  },
  {
    key: 'assistantDirectorPersonnel',
    label: 'ผู้ช่วย ผอ.ฝ่ายบริหารงานบุคคล',
    desc: 'ดูแลและกำกับงานด้านบริหารงานบุคคล',
    group: 'ผู้ช่วยผู้อำนวยการ',
    icon: 'medal',
    get color()  { return cssVar('--role-asst-personnel-color');  },
    get bg()     { return cssVar('--role-asst-personnel-bg');     },
    get border() { return cssVar('--role-asst-personnel-border'); }
  },
  {
    key: 'assistantDirectorStudent',
    label: 'ผู้ช่วย ผอ.ฝ่ายกิจการนักเรียน',
    desc: 'ดูแลและกำกับงานด้านกิจการนักเรียน',
    group: 'ผู้ช่วยผู้อำนวยการ',
    icon: 'medal',
    get color()  { return cssVar('--role-asst-student-color');  },
    get bg()     { return cssVar('--role-asst-student-bg');     },
    get border() { return cssVar('--role-asst-student-border'); }
  },
  {
    key: 'deputyDirectorAcademic',
    label: 'รองผู้อำนวยการฝ่ายวิชาการ',
    desc: 'ตรวจงานครูขั้นที่ 3 ได้ทุกกลุ่มสาระ (หลัง ผช.ผอ. ตรวจ)',
    group: 'รองผู้อำนวยการ',
    icon: 'crown',
    get color()  { return cssVar('--role-dep-academic-color');  },
    get bg()     { return cssVar('--role-dep-academic-bg');     },
    get border() { return cssVar('--role-dep-academic-border'); }
  },
  {
    key: 'deputyDirectorBudget',
    label: 'รองผู้อำนวยการฝ่ายบริหารงบประมาณ',
    desc: 'กำกับและอนุมัติงานด้านงบประมาณ',
    group: 'รองผู้อำนวยการ',
    icon: 'crown',
    get color()  { return cssVar('--role-dep-budget-color');  },
    get bg()     { return cssVar('--role-dep-budget-bg');     },
    get border() { return cssVar('--role-dep-budget-border'); }
  },
  {
    key: 'deputyDirectorGeneral',
    label: 'รองผู้อำนวยการฝ่ายบริหารทั่วไป',
    desc: 'กำกับและอนุมัติงานด้านบริหารทั่วไป',
    group: 'รองผู้อำนวยการ',
    icon: 'crown',
    get color()  { return cssVar('--role-dep-general-color');  },
    get bg()     { return cssVar('--role-dep-general-bg');     },
    get border() { return cssVar('--role-dep-general-border'); }
  },
  {
    key: 'deputyDirectorPersonnel',
    label: 'รองผู้อำนวยการฝ่ายบริหารงานบุคคล',
    desc: 'กำกับและอนุมัติงานด้านบริหารงานบุคคล',
    group: 'รองผู้อำนวยการ',
    icon: 'crown',
    get color()  { return cssVar('--role-dep-personnel-color');  },
    get bg()     { return cssVar('--role-dep-personnel-bg');     },
    get border() { return cssVar('--role-dep-personnel-border'); }
  },
  {
    key: 'director',
    label: 'ผู้อำนวยการ',
    desc: 'สิทธิ์สูงสุดระดับบริหาร · อนุมัติงานครูขั้นสุดท้าย',
    group: 'ผู้อำนวยการ',
    icon: 'gem',
    get color()  { return cssVar('--role-director-color');  },
    get bg()     { return cssVar('--role-director-bg');     },
    get border() { return cssVar('--role-director-border'); }
  },
];

/* ── Group definitions ── */
var GROUP_DEFS = [
  {
    key: 'super',
    label: 'SuperAdmin',
    subtitle: 'มีสิทธิ์ครบทุกระบบ — ไม่สามารถลบหรือแก้ไขสิทธิ์ได้',
    icon: 'crown',
    get color()  { return cssVar('--role-super-color');  },
    get bg()     { return cssVar('--role-super-bg');     },
    get border() { return cssVar('--role-super-border'); },
    filter: function(a){ return a.email.toLowerCase()===SUPER_ADMIN; }
  },
  {
    key: 'budget',
    label: 'กลุ่มบริหารงบประมาณ',
    subtitle: 'ดูแลระบบยืม-คืนไอแพด',
    icon: 'banknote',
    get color()  { return cssVar('--role-budget-color');  },
    get bg()     { return cssVar('--role-budget-bg');     },
    get border() { return cssVar('--role-budget-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.ipad;
    }
  },
  {
    key: 'general',
    label: 'กลุ่มบริหารทั่วไป',
    subtitle: 'ดูแลระบบจองห้อง บัญชีรายได้ Food Court และระบบแจ้งซ่อม',
    icon: 'building-2',
    get color()  { return cssVar('--role-general-color');  },
    get bg()     { return cssVar('--role-general-bg');     },
    get border() { return cssVar('--role-general-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.bookings || !!p.foodcourt || !!p.repair;
    }
  },
  {
    key: 'academic',
    label: 'กลุ่มวิชาการ',
    subtitle: 'ดูแลระบบติดตามส่งงานประจำภาคเรียน',
    icon: 'graduation-cap',
    get color()  { return cssVar('--role-academic-color');  },
    get bg()     { return cssVar('--role-academic-bg');     },
    get border() { return cssVar('--role-academic-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.portfolio;
    }
  },
  {
    key: 'hr',
    label: 'กลุ่มบริหารงานบุคคล',
    subtitle: 'ดูแลระบบข้อมูลบุคลากร',
    icon: 'users',
    get color()  { return cssVar('--role-hr-color');  },
    get bg()     { return cssVar('--role-hr-bg');     },
    get border() { return cssVar('--role-hr-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.staff;
    }
  },
  {
    key: 'headofgroup',
    label: 'หัวหน้ากลุ่มสาระ',
    subtitle: 'ดูและตรวจสอบการส่งงานในกลุ่มสาระของตน',
    icon: 'star',
    get color()  { return cssVar('--role-hog-color');  },
    get bg()     { return cssVar('--role-hog-bg');     },
    get border() { return cssVar('--role-hog-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.headOfGroup && !p.portfolio;
    }
  },
  {
    key: 'assistantdirectoracademic',
    label: 'ผู้ช่วย ผอ.ฝ่ายวิชาการ',
    subtitle: 'ดูแลและกำกับงานด้านวิชาการ',
    icon: 'medal',
    get color()  { return cssVar('--role-asst-academic-color');  },
    get bg()     { return cssVar('--role-asst-academic-bg');     },
    get border() { return cssVar('--role-asst-academic-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.assistantDirectorAcademic && !p.deputyDirectorAcademic && !p.deputyDirectorBudget && !p.deputyDirectorGeneral && !p.deputyDirectorPersonnel && !p.director;
    }
  },
  {
    key: 'assistantdirectorbudget',
    label: 'ผู้ช่วย ผอ.ฝ่ายบริหารงบประมาณ',
    subtitle: 'ดูแลและกำกับงานด้านงบประมาณ',
    icon: 'medal',
    get color()  { return cssVar('--role-asst-budget-color');  },
    get bg()     { return cssVar('--role-asst-budget-bg');     },
    get border() { return cssVar('--role-asst-budget-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.assistantDirectorBudget && !p.deputyDirectorAcademic && !p.deputyDirectorBudget && !p.deputyDirectorGeneral && !p.deputyDirectorPersonnel && !p.director;
    }
  },
  {
    key: 'assistantdirectorgeneral',
    label: 'ผู้ช่วย ผอ.ฝ่ายบริหารทั่วไป',
    subtitle: 'ดูแลและกำกับงานด้านบริหารทั่วไป',
    icon: 'medal',
    get color()  { return cssVar('--role-asst-general-color');  },
    get bg()     { return cssVar('--role-asst-general-bg');     },
    get border() { return cssVar('--role-asst-general-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.assistantDirectorGeneral && !p.deputyDirectorAcademic && !p.deputyDirectorBudget && !p.deputyDirectorGeneral && !p.deputyDirectorPersonnel && !p.director;
    }
  },
  {
    key: 'assistantdirectorpersonnel',
    label: 'ผู้ช่วย ผอ.ฝ่ายบริหารงานบุคคล',
    subtitle: 'ดูแลและกำกับงานด้านบริหารงานบุคคล',
    icon: 'medal',
    get color()  { return cssVar('--role-asst-personnel-color');  },
    get bg()     { return cssVar('--role-asst-personnel-bg');     },
    get border() { return cssVar('--role-asst-personnel-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.assistantDirectorPersonnel && !p.deputyDirectorAcademic && !p.deputyDirectorBudget && !p.deputyDirectorGeneral && !p.deputyDirectorPersonnel && !p.director;
    }
  },
  {
    key: 'assistantdirectorstudent',
    label: 'ผู้ช่วย ผอ.ฝ่ายกิจการนักเรียน',
    subtitle: 'ดูแลและกำกับงานด้านกิจการนักเรียน',
    icon: 'medal',
    get color()  { return cssVar('--role-asst-student-color');  },
    get bg()     { return cssVar('--role-asst-student-bg');     },
    get border() { return cssVar('--role-asst-student-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.assistantDirectorStudent && !p.deputyDirectorAcademic && !p.deputyDirectorBudget && !p.deputyDirectorGeneral && !p.deputyDirectorPersonnel && !p.director;
    }
  },
  {
    key: 'deputydirectoracademic',
    label: 'รองผู้อำนวยการฝ่ายวิชาการ',
    subtitle: 'กำกับและอนุมัติงานด้านวิชาการ',
    icon: 'crown',
    get color()  { return cssVar('--role-dep-academic-color');  },
    get bg()     { return cssVar('--role-dep-academic-bg');     },
    get border() { return cssVar('--role-dep-academic-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.deputyDirectorAcademic && !p.director;
    }
  },
  {
    key: 'deputydirectorbudget',
    label: 'รองผู้อำนวยการฝ่ายบริหารงบประมาณ',
    subtitle: 'กำกับและอนุมัติงานด้านงบประมาณ',
    icon: 'crown',
    get color()  { return cssVar('--role-dep-budget-color');  },
    get bg()     { return cssVar('--role-dep-budget-bg');     },
    get border() { return cssVar('--role-dep-budget-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.deputyDirectorBudget && !p.director;
    }
  },
  {
    key: 'deputydirectorgeneral',
    label: 'รองผู้อำนวยการฝ่ายบริหารทั่วไป',
    subtitle: 'กำกับและอนุมัติงานด้านบริหารทั่วไป',
    icon: 'crown',
    get color()  { return cssVar('--role-dep-general-color');  },
    get bg()     { return cssVar('--role-dep-general-bg');     },
    get border() { return cssVar('--role-dep-general-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.deputyDirectorGeneral && !p.director;
    }
  },
  {
    key: 'deputydirectorpersonnel',
    label: 'รองผู้อำนวยการฝ่ายบริหารงานบุคคล',
    subtitle: 'กำกับและอนุมัติงานด้านบริหารงานบุคคล',
    icon: 'crown',
    get color()  { return cssVar('--role-dep-personnel-color');  },
    get bg()     { return cssVar('--role-dep-personnel-bg');     },
    get border() { return cssVar('--role-dep-personnel-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.deputyDirectorPersonnel && !p.director;
    }
  },
  {
    key: 'director',
    label: 'ผู้อำนวยการ',
    subtitle: 'เข้าถึงทุกส่วนของระบบ มีสิทธิ์สูงสุดระดับบริหาร',
    icon: 'gem',
    get color()  { return cssVar('--role-director-color');  },
    get bg()     { return cssVar('--role-director-bg');     },
    get border() { return cssVar('--role-director-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !!p.director;
    }
  },
  {
    key: 'none',
    label: 'ยังไม่มีสิทธิ์',
    subtitle: 'บัญชีที่ยังไม่ได้รับสิทธิ์ใดเลย',
    icon: 'user-x',
    get color()  { return cssVar('--role-none-color');  },
    get bg()     { return cssVar('--role-none-bg');     },
    get border() { return cssVar('--role-none-border'); },
    filter: function(a){
      if(a.email.toLowerCase()===SUPER_ADMIN) return false;
      var p=a.data.permissions||{};
      return !p.ipad&&!p.bookings&&!p.foodcourt&&!p.portfolio&&!p.staff&&!p.headOfGroup&&!p.assistantDirectorAcademic&&!p.assistantDirectorBudget&&!p.assistantDirectorGeneral&&!p.assistantDirectorPersonnel&&!p.assistantDirectorStudent&&!p.deputyDirectorAcademic&&!p.deputyDirectorBudget&&!p.deputyDirectorGeneral&&!p.deputyDirectorPersonnel&&!p.director;
    }
  }
];

/* ══════════════════════ SEARCH ══════════════════════ */
var searchQuery='';

/* ══════════════════════ DATA LOADING ══════════════════════ */
/* ── Load staff collection once ── */
function loadStaffList() {
  db.collection('staff').orderBy('name').get().then(function(snap) {
    allStaffList = [];
    snap.forEach(function(d) {
      var dat = d.data();
      allStaffList.push({ id: d.id, name: dat.name||'', email: dat.email||'', group: dat.group||'', role: dat.role||'' });
    });
    renderStaffPickerList('');
  }).catch(function(){});
}

/* ══════════════════════ DATA ══════════════════════ */
function subscribeAdmins(){
  db.collection('admins').onSnapshot(function(snap){
    allAdmins=[];
    snap.forEach(function(d){ allAdmins.push({email:d.id, data:d.data()||{}}); });
    allAdmins.sort(function(a,b){
      if(a.email.toLowerCase()===SUPER_ADMIN) return -1;
      if(b.email.toLowerCase()===SUPER_ADMIN) return 1;
      return (a.data.name||a.email).localeCompare(b.data.name||b.email, 'th');
    });
    renderStats();
    renderCurrentView();
    lucide.createIcons();
  });
}

/* ══════════════════════ RENDER ══════════════════════ */
function renderStaffPickerList(query) {
  var listEl = document.getElementById('staffPickerList');
  if (!allStaffList.length) {
    listEl.innerHTML = '<div class="staff-picker-loading">กำลังโหลดรายชื่อ...</div>';
    return;
  }
  var q = (query || '').toLowerCase();
  var filtered = allStaffList.filter(function(s) {
    return !q || (s.name + s.email + s.group).toLowerCase().indexOf(q) >= 0;
  });
  _staffFilteredCache = filtered;
  if (!filtered.length) {
    listEl.innerHTML = '<div class="staff-picker-empty">ไม่พบรายชื่อ</div>';
    return;
  }
  var curEmail = (document.getElementById('fEmail').value || '').trim().toLowerCase();
  var colors = ['#1d4ed8','#0d1b2a','#15803d','#b45309','#0369a1','#be185d','#d97706','#0d9488'];
  listEl.innerHTML = filtered.map(function(s, idx) {
    var initials = getInitialsSP(s.name);
    var ci = 0; for (var i=0;i<s.name.length;i++) ci=(ci*31+s.name.charCodeAt(i))%colors.length;
    var isSel = s.email && s.email.toLowerCase() === curEmail;
    var isHead = s.role === 'หัวหน้ากลุ่มสาระ';
    return '<div class="staff-picker-item' + (isSel?' selected':'') + '" data-idx="' + idx + '">' +
      '<div style="width:30px;height:30px;border-radius:50%;background:' + colors[ci] + ';display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:800;flex-shrink:0;pointer-events:none;">' + initials + '</div>' +
      '<div style="min-width:0;pointer-events:none;">' +
        '<p style="font-size:13px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc2(s.name) + '</p>' +
        '<p style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          (s.group ? esc2(s.group) : '') +
          (isHead ? ' · <span style="color:#d97706;font-weight:700;">⭐ หัวหน้ากลุ่มสาระ</span>' : '') +
          (s.email ? ' · ' + esc2(s.email) : '') +
        '</p>' +
      '</div>' +
    '</div>';
  }).join('');

  /* ผูก event ผ่าน event delegation บน listEl แทน inline onclick */
  listEl.onclick = function(e) {
    var item = e.target.closest('[data-idx]');
    if (!item) return;
    var idx = parseInt(item.getAttribute('data-idx'), 10);
    var s = _staffFilteredCache[idx];
    if (s) selectStaffPicker(s.name, s.email);
  };
}

function getInitialsSP(name) {
  if (!name) return '?';
  var parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[parts.length-2][0]||'') + (parts[parts.length-1][0]||'');
  return parts[0][0]||'?';
}

function renderHogPickerList(query) {
  var listEl = document.getElementById('hogPickerList');
  if (!listEl) return;
  /* แสดงบุคลากรทั้งหมด — ไม่จำกัดเฉพาะ role หัวหน้ากลุ่มสาระ */
  if (!allStaffList.length) {
    listEl.innerHTML = '<div class="staff-picker-loading">กำลังโหลดรายชื่อ...</div>';
    return;
  }
  var q = (query || '').toLowerCase();
  var filtered = allStaffList.filter(function(s){
    return !q || (s.name + s.email + s.group + s.role).toLowerCase().indexOf(q) >= 0;
  });
  _hogFilteredCache = filtered;
  if (!filtered.length) {
    listEl.innerHTML = '<div class="staff-picker-empty">ไม่พบรายชื่อ</div>';
    return;
  }
  var colors = ['#1d4ed8','#0d1b2a','#15803d','#b45309','#0369a1','#be185d','#d97706','#0d9488'];
  var curEmail = _selectedHog ? _selectedHog.email : '';
  listEl.innerHTML = filtered.map(function(s, idx) {
    var initials = getInitialsSP(s.name);
    var ci = 0; for(var i=0;i<s.name.length;i++) ci=(ci*31+s.name.charCodeAt(i))%colors.length;
    var isSel = s.email && s.email === curEmail;
    var isHead = s.role === 'หัวหน้ากลุ่มสาระ';
    return '<div class="staff-picker-item' + (isSel?' selected':'') + '" data-hog-idx="' + idx + '">' +
      '<div style="width:30px;height:30px;border-radius:50%;background:' + colors[ci] + ';display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:800;flex-shrink:0;pointer-events:none;">' + initials + '</div>' +
      '<div style="min-width:0;pointer-events:none;">' +
        '<p style="font-size:13px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc2(s.name) + '</p>' +
        '<p style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          (s.group ? esc2(s.group) : '') +
          (isHead ? ' · <span style="color:#d97706;font-weight:700;">⭐ หัวหน้ากลุ่มสาระ</span>' : '') +
          (s.email ? ' · ' + esc2(s.email) : '') +
        '</p>' +
      '</div>' +
    '</div>';
  }).join('');

  listEl.onclick = function(e) {
    var item = e.target.closest('[data-hog-idx]');
    if (!item) return;
    var idx = parseInt(item.getAttribute('data-hog-idx'), 10);
    var s = _hogFilteredCache[idx];
    if (s) selectHogPicker(s);
  };
}

function restoreHogPicker(email) {
  _selectedHog = null;
  var found = allStaffList.find(function(s){ return s.email === email || s.name === email; });
  if (found) {
    _selectedHog = found;
    var disp = document.getElementById('hogPickerDisplay');
    if (disp) disp.value = found.name + (found.email ? '  ·  ' + found.email : '') + (found.group ? '  ·  ' + found.group : '');
    var info = document.getElementById('headOfGroupInfo');
    if (info) info.textContent = '✅ ' + found.name + (found.group ? ' · กลุ่ม' + found.group : '') + (found.email ? ' · ' + found.email : '');
  }
}

/* ── Permission definitions ── */
/* ── Helper: อ่าน CSS variable จาก :root ── */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════ STATS ══════════════════════ */
function renderStats(){
  var total=allAdmins.length;
  var noPerms=allAdmins.filter(function(a){
    if(a.email.toLowerCase()===SUPER_ADMIN) return false;
    var p=a.data.permissions||{};
    return !p.ipad&&!p.bookings&&!p.foodcourt&&!p.portfolio&&!p.staff&&!p.headOfGroup&&!p.assistantDirectorAcademic&&!p.assistantDirectorBudget&&!p.assistantDirectorGeneral&&!p.assistantDirectorPersonnel&&!p.assistantDirectorStudent&&!p.deputyDirectorAcademic&&!p.deputyDirectorBudget&&!p.deputyDirectorGeneral&&!p.deputyDirectorPersonnel&&!p.director;
  }).length;
  var withPerms=total-1-noPerms; // exclude super
  var statData=[
    {label:'Admin ทั้งหมด', val:total, icon:'users',        get color(){return cssVar('--role-super-color');},    get bg(){return cssVar('--role-super-bg');}},
    {label:'มีสิทธิ์แล้ว',  val:withPerms, icon:'shield-check', get color(){return cssVar('--role-academic-color');}, get bg(){return cssVar('--role-academic-bg');}},
    {label:'ยังไม่มีสิทธิ์', val:noPerms, icon:'shield-off',    get color(){return cssVar('--role-hog-color');},      get bg(){return cssVar('--role-hog-bg');}},
    {label:'กลุ่มงาน',      val:16, icon:'layout-grid',         get color(){return cssVar('--role-hr-color');},       get bg(){return cssVar('--role-hr-bg');}},
  ];
  document.getElementById('statsRow').innerHTML=statData.map(function(s){
    return '<div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:14px 16px;display:flex;align-items:center;gap:var(--gap-item);box-shadow:0 2px 6px rgba(0,0,0,.04);">' +
      '<div style="width:38px;height:38px;background:'+s.bg+';border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
        '<i data-lucide="'+s.icon+'" style="width:17px;height:17px;color:'+s.color+';"></i>' +
      '</div>' +
      '<div>' +
        '<p style="font-size:10px;color:#64748b;font-weight:700;">'+s.label+'</p>' +
        '<p style="font-size:22px;font-weight:800;line-height:1.1;color:#1e293b;">'+s.val+'</p>' +
      '</div></div>';
  }).join('');
  lucide.createIcons();
}

function renderCurrentView(){
  if(currentView==='group') renderGroupView();
  else if(currentView==='list') renderListView();
  else renderMatrix();
}

/* ══════════════════════ GROUP VIEW ══════════════════════ */
function renderGroupView(){
  var grid=document.getElementById('groupGrid');
  var html='';
  GROUP_DEFS.forEach(function(g){
    var members=filterAdmins(allAdmins.filter(g.filter));
    var isEmpty=members.length===0;
    html+='<div style="border:1.5px solid '+g.border+';border-radius:14px;overflow:hidden;">';
    /* Group header */
    html+='<div style="background:'+g.bg+';padding:14px 18px;border-bottom:1px solid '+g.border+';display:flex;align-items:center;gap:var(--gap-item);">';
    html+='<div style="width:34px;height:34px;background:'+g.color+'22;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">';
    html+='<i data-lucide="'+g.icon+'" style="width:16px;height:16px;color:'+g.color+';"></i></div>';
    html+='<div style="flex:1;min-width:0;">';
    html+='<p style="font-weight:800;font-size:14px;color:'+g.color+';">'+g.label+'</p>';
    html+='<p style="font-size:11px;color:#64748b;">'+g.subtitle+'</p></div>';
    html+='<span style="font-size:11px;font-weight:800;background:'+g.color+';color:white;padding:2px 9px;border-radius:20px;flex-shrink:0;">'+members.length+' คน</span>';
    html+='</div>';
    /* Members */
    html+='<div style="padding:12px;display:flex;flex-direction:column;gap:var(--gap-tight);">';
    if(isEmpty){
      html+='<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;font-style:italic;">ไม่มี Admin ในกลุ่มนี้</div>';
    } else {
      members.forEach(function(a){
        html+=renderAdminMiniCard(a, g.key==='super');
      });
    }
    html+='</div></div>';
  });
  grid.innerHTML=html;
  lucide.createIcons();
}

function renderAdminMiniCard(a, isSuperCard){
  var isSA=a.email.toLowerCase()===SUPER_ADMIN;
  var ph=a.data.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(a.data.name||a.email)+'&background=7c3aed&color=fff&size=64';
  var perms=a.data.permissions||{};
  if(isSA) perms={ipad:true,bookings:true,rooms:true,foodcourt:true,repair:true,portfolio:true,staff:true,admins:true};

  var permBadges=PERM_DEFS.filter(function(p){return perms[p.key];}).map(function(p){
    return '<span class="perm-badge" style="background:'+p.bg+';color:'+p.color+';border:1px solid '+p.border+';">' +
      '<i data-lucide="'+p.icon+'" style="width:9px;height:9px;"></i>'+p.label+'</span>';
  }).join('');
  if(!permBadges) permBadges='<span style="font-size:10px;color:#94a3b8;font-style:italic;">ยังไม่มีสิทธิ์</span>';

  var superBadge=isSA?'<span style="font-size:9px;background:'+cssVar('--role-super-badge-bg')+';color:white;padding:1px 7px;border-radius:7px;font-weight:800;">⭐ SuperAdmin</span>':'';

  var actions='';
  if(!isSA){
    actions='<div style="display:flex;gap:5px;flex-shrink:0;">' +
      '<button class="btn-icon" onclick="openEditModal(\''+esc(a.email)+'\')" title="แก้ไขสิทธิ์"><i data-lucide="settings-2" style="width:13px;height:13px;"></i></button>' +
      '<button class="btn-icon danger" onclick="openDeleteModal(\''+esc(a.email)+'\')" title="ลบ Admin"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>' +
      '</div>';
  }

  return '<div style="display:flex;align-items:flex-start;gap:var(--gap-item);padding:10px;border:1px solid #f1f5f9;border-radius:10px;background:white;transition:border-color .15s;" onmouseenter="this.style.borderColor=\'var(--accent-light)\'" onmouseleave="this.style.borderColor=\'#f1f5f9\'">' +
    '<img src="'+ph+'" style="width:38px;height:38px;border-radius:50%;border:2px solid #e2e8f0;flex-shrink:0;" onerror="this.src=\'https://ui-avatars.com/api/?name=A&background=7c3aed&color=fff&size=64\'">' +
    '<div style="flex:1;min-width:0;">' +
      '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:3px;">' +
        '<p style="font-size:13px;font-weight:700;color:#1e293b;">'+esc2(a.data.name||a.email)+'</p>' +
        superBadge +
      '</div>' +
      '<p style="font-size:11px;color:#94a3b8;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc2(a.email)+'</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:4px;">'+permBadges+'</div>' +
    '</div>' +
    actions +
  '</div>';
}

/* ══════════════════════ LIST VIEW ══════════════════════ */
function renderListView(){
  var el=document.getElementById('adminListEl');
  var list=filterAdmins(allAdmins);
  if(!list.length){el.innerHTML='<div class="empty-state"><i data-lucide="search-x" style="width:40px;height:40px;margin:0 auto 10px;display:block;color:#cbd5e1;"></i>ไม่พบผลลัพธ์</div>';lucide.createIcons();return;}
  el.innerHTML=list.map(function(a){
    var isSA=a.email.toLowerCase()===SUPER_ADMIN;
    var ph=a.data.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(a.data.name||a.email)+'&background=7c3aed&color=fff&size=64';
    var perms=a.data.permissions||{};
    if(isSA) perms={ipad:true,bookings:true,rooms:true,foodcourt:true,repair:true,portfolio:true,staff:true,admins:true};

    var permBadges=PERM_DEFS.filter(function(p){return perms[p.key];}).map(function(p){
      return '<span class="perm-badge" style="background:'+p.bg+';color:'+p.color+';border:1px solid '+p.border+';">' +
        '<i data-lucide="'+p.icon+'" style="width:9px;height:9px;"></i>'+p.label+'</span>';
    }).join('');
    if(!permBadges) permBadges='<span style="font-size:11px;color:#94a3b8;font-style:italic;">ยังไม่มีสิทธิ์</span>';

    var superBadge=isSA?'<span style="font-size:9px;background:linear-gradient(135deg,#0d1b2a,#415a77);color:white;padding:2px 8px;border-radius:8px;font-weight:800;">⭐ SuperAdmin</span>':'';
    var actions=isSA?'':
      '<div style="display:flex;gap:6px;flex-shrink:0;align-items:center;">' +
        '<button class="btn-icon" onclick="openEditModal(\''+esc(a.email)+'\')" style="background:var(--accent-tint);color:var(--accent);"><i data-lucide="settings-2" style="width:13px;height:13px;"></i><span style="font-size:11px;font-weight:700;margin-left:3px;">แก้ไขสิทธิ์</span></button>' +
        '<button class="btn-icon danger" onclick="openDeleteModal(\''+esc(a.email)+'\')"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>' +
      '</div>';

    return '<div style="display:flex;align-items:center;gap:var(--gap-card);padding:14px 16px;border:1.5px solid '+(isSA?'#778da9':'#e2e8f0')+';border-radius:14px;background:'+(isSA?'#e0e1dd':'white')+';transition:border-color .15s;" onmouseenter="this.style.borderColor=\'#778da9\'" onmouseleave="this.style.borderColor=\''+(isSA?'#778da9':'#e2e8f0')+'\'">'+
      '<img src="'+ph+'" style="width:44px;height:44px;border-radius:50%;border:2px solid '+(isSA?'#778da9':'#e2e8f0')+';flex-shrink:0;" onerror="this.src=\'https://ui-avatars.com/api/?name=A&background=7c3aed&color=fff&size=64\'">'+
      '<div style="flex:1;min-width:0;">'+
        '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-bottom:3px;">'+
          '<p style="font-weight:700;font-size:14px;color:#1e293b;">'+esc2(a.data.name||a.email)+'</p>'+superBadge+
        '</div>'+
        '<p style="font-size:11px;color:#94a3b8;margin-bottom:6px;">'+esc2(a.email)+'</p>'+
        '<div style="display:flex;flex-wrap:wrap;gap:5px;">'+permBadges+'</div>'+
      '</div>'+
      actions+
    '</div>';
  }).join('');
  lucide.createIcons();
}

/* ══════════════════════ MATRIX VIEW ══════════════════════ */
function renderMatrix(){
  var tbody=document.getElementById('matrixBody');
  var list=filterAdmins(allAdmins);
  if(!list.length){tbody.innerHTML='<tr><td colspan="19" style="text-align:center;padding:52px;color:#94a3b8;font-style:italic;">ไม่พบผลลัพธ์</td></tr>';return;}

  tbody.innerHTML=list.map(function(a){
    var isSA=a.email.toLowerCase()===SUPER_ADMIN;
    var perms=a.data.permissions||{};
    if(isSA) perms={ipad:true,bookings:true,rooms:true,foodcourt:true,repair:true,portfolio:true,staff:true,admins:true,assistantDirectorAcademic:true,assistantDirectorBudget:true,assistantDirectorGeneral:true,assistantDirectorPersonnel:true,assistantDirectorStudent:true,deputyDirectorAcademic:true,deputyDirectorBudget:true,deputyDirectorGeneral:true,deputyDirectorPersonnel:true,director:true};

    var permKeys=['ipad','bookings','foodcourt','repair','portfolio','staff','headOfGroup','assistantDirectorAcademic','assistantDirectorBudget','assistantDirectorGeneral','assistantDirectorPersonnel','assistantDirectorStudent','deputyDirectorAcademic','deputyDirectorBudget','deputyDirectorGeneral','deputyDirectorPersonnel','director','admins'];
    var cells=permKeys.map(function(pk){
      var has=!!perms[pk];
      var pd=PERM_DEFS.find(function(x){return x.key===pk;});
      var canToggle=!isSA&&pk!=='admins';
      if(canToggle){
        return '<td style="text-align:center;padding:10px 14px;border-bottom:1px solid #f1f5f9;">' +
          '<button onclick="openQuickPerm(\''+esc(a.email)+'\',\''+pk+'\','+has+')" title="คลิกเพื่อเปลี่ยน" style="background:none;border:none;cursor:pointer;padding:0;">' +
            (has
              ? '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:'+pd.bg+';border-radius:8px;border:1.5px solid '+pd.border+';">' +
                  '<i data-lucide="check" style="width:13px;height:13px;color:'+pd.color+';"></i></span>'
              : '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#f8fafc;border-radius:8px;border:1.5px solid #e2e8f0;">' +
                  '<i data-lucide="minus" style="width:11px;height:11px;color:#cbd5e1;"></i></span>'
            ) +
          '</button></td>';
      } else {
        return '<td style="text-align:center;padding:10px 14px;border-bottom:1px solid #f1f5f9;">' +
          (has
            ? '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:'+pd.bg+';border-radius:8px;border:1.5px solid '+pd.border+';margin:0 auto;">' +
                '<i data-lucide="check" style="width:13px;height:13px;color:'+pd.color+';"></i></span>'
            : '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#f8fafc;border-radius:8px;border:1.5px solid #e2e8f0;margin:0 auto;">' +
                '<i data-lucide="minus" style="width:11px;height:11px;color:#cbd5e1;"></i></span>'
          ) +
        '</td>';
      }
    }).join('');

    var ph=a.data.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(a.data.name||a.email)+'&background=7c3aed&color=fff&size=48';
    var superBadge=isSA?'<span style="font-size:9px;background:linear-gradient(135deg,#0d1b2a,#415a77);color:white;padding:1px 6px;border-radius:6px;font-weight:800;margin-left:4px;">SA</span>':'';

    var actionCell=isSA
      ? '<td style="text-align:center;padding:10px 14px;border-bottom:1px solid #f1f5f9;">–</td>'
      : '<td style="text-align:center;padding:10px 14px;border-bottom:1px solid #f1f5f9;">' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:5px;">' +
            '<button class="btn-icon" onclick="openEditModal(\''+esc(a.email)+'\')" title="แก้ไข"><i data-lucide="settings-2" style="width:12px;height:12px;"></i></button>' +
            '<button class="btn-icon danger" onclick="openDeleteModal(\''+esc(a.email)+'\')" title="ลบ"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>' +
          '</div></td>';

    return '<tr style="background:'+(isSA?'#e0e1dd':'white')+';">' +
      '<td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;">' +
        '<div style="display:flex;align-items:center;gap:9px;">' +
          '<img src="'+ph+'" style="width:32px;height:32px;border-radius:50%;border:1.5px solid #e2e8f0;flex-shrink:0;" onerror="this.src=\'https://ui-avatars.com/api/?name=A&background=7c3aed&color=fff&size=48\'">' +
          '<div>' +
            '<p style="font-size:12px;font-weight:700;color:#1e293b;display:inline;">'+esc2(a.data.name||a.email)+'</p>'+superBadge+
            '<p style="font-size:10px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;">'+esc2(a.email)+'</p>' +
          '</div>' +
        '</div></td>' +
      cells +
      actionCell +
    '</tr>';
  }).join('');
  lucide.createIcons();
}

/* ══════════════════════ HELPERS ══════════════════════ */
/* esc()/esc2() ใช้ตัวกลางจาก common.js (เดิมประกาศซ้ำที่นี่ด้วยโค้ดเดียวกัน) */

/* ══════════════════════ EVENT HANDLERS ══════════════════════ */
function toggleStaffDropdown() {
  var dd = document.getElementById('staffDropdown');
  if (dd.classList.contains('open')) {
    dd.classList.remove('open');
    staffPickerOpen = false;
  } else {
    dd.classList.add('open');
    staffPickerOpen = true;
    document.getElementById('staffSearchInput').value = '';
    renderStaffPickerList('');
    setTimeout(function(){ document.getElementById('staffSearchInput').focus(); }, 50);
  }
}

/* ปิด dropdown เมื่อคลิกนอก — ใช้ focusout แทน document click เพื่อไม่ขัด item click */
document.addEventListener('mousedown', function(e) {
  if (!staffPickerOpen) return;
  var wrap = document.getElementById('staffPickerWrap2');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('staffDropdown').classList.remove('open');
    staffPickerOpen = false;
  }
});

function filterStaffPicker() {
  var q = document.getElementById('staffSearchInput').value;
  renderStaffPickerList(q);
}

function selectStaffPicker(name, email) {
  document.getElementById('fName').value = name || '';
  if (email) {
    var emailWrap = document.getElementById('emailWrap');
    if (emailWrap && emailWrap.style.display !== 'none') {
      document.getElementById('fEmail').value = email;
    }
  }
  document.getElementById('staffPickerDisplay').value = name + (email ? '  ·  ' + email : '');
  document.getElementById('staffDropdown').classList.remove('open');
  staffPickerOpen = false;
} // {name, email, group}

function toggleHogDropdown() {
  var dd = document.getElementById('hogDropdown');
  if (dd.classList.contains('open')) {
    dd.classList.remove('open');
    hogPickerOpen = false;
  } else {
    dd.classList.add('open');
    hogPickerOpen = true;
    document.getElementById('hogSearchInput').value = '';
    renderHogPickerList('');
    setTimeout(function(){ document.getElementById('hogSearchInput').focus(); }, 50);
  }
}

document.addEventListener('mousedown', function(e) {
  if (!hogPickerOpen) return;
  var wrap = document.getElementById('hogPickerWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('hogDropdown').classList.remove('open');
    hogPickerOpen = false;
  }
});

function filterHogPicker() {
  renderHogPickerList(document.getElementById('hogSearchInput').value);
}

function selectHogPicker(s) {
  _selectedHog = s;
  document.getElementById('hogPickerDisplay').value = s.name + (s.email ? '  ·  ' + s.email : '') + (s.group ? '  ·  ' + s.group : '');
  document.getElementById('headOfGroupInfo').textContent = '✅ ' + s.name + (s.group ? ' · กลุ่ม' + s.group : '') + (s.email ? ' · ' + s.email : '');
  // auto-fill name/email if adding new
  if (document.getElementById('emailWrap').style.display !== 'none' && s.email) {
    document.getElementById('fEmail').value = s.email;
  }
  document.getElementById('fName').value = s.name;
  document.getElementById('staffPickerDisplay').value = s.name + (s.email ? '  ·  ' + s.email : '');
  document.getElementById('hogDropdown').classList.remove('open');
  hogPickerOpen = false;
}

function resetHogPicker() {
  _selectedHog = null;
  var disp = document.getElementById('hogPickerDisplay');
  if (disp) disp.value = '';
  var info = document.getElementById('headOfGroupInfo');
  if (info) info.textContent = '';
}

function onPermChange(key) {
  var cb = document.getElementById('perm-' + key);
  var wrap = document.getElementById('wrap-' + key);
  if (cb && wrap) wrap.classList.toggle('active', cb.checked);

  /* headOfGroup panel */
  if (key === 'headOfGroup') {
    var panel = document.getElementById('headOfGroupPanel');
    if (panel) {
      if (cb && cb.checked) {
        panel.classList.add('show');
        renderHogPickerList('');
      } else {
        panel.classList.remove('show');
      }
    }
  }
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

/* ══════════════════════ VIEW SWITCH ══════════════════════ */
function switchView(v, btn){
  currentView=v;
  ['group','list','matrix'].forEach(function(k){
    document.getElementById('view-'+k).style.display=(k===v)?'block':'none';
    var b=document.getElementById('vbtn-'+k);
    if(b) b.className='view-tab'+(k===v?' active':'');
  });
  renderCurrentView();
}
function applySearch(){
  searchQuery=(document.getElementById('searchBox').value||'').toLowerCase().trim();
  renderCurrentView();
}

function filterAdmins(list){
  if(!searchQuery) return list;
  return list.filter(function(a){
    return a.email.toLowerCase().indexOf(searchQuery)!==-1 ||
      (a.data.name||'').toLowerCase().indexOf(searchQuery)!==-1;
  });
}

/* ══════════════════════ MODAL: ADD/EDIT ══════════════════════ */
function resetStaffPicker() {
  document.getElementById('staffPickerDisplay').value = '';
  document.getElementById('staffDropdown').classList.remove('open');
  staffPickerOpen = false;
}

function openAddModal(){
  editingEmail=null;
  document.getElementById('modalTitle').textContent='เพิ่ม Admin ใหม่';
  document.getElementById('modalSaveLbl').textContent='เพิ่ม Admin';
  document.getElementById('fName').value='';
  document.getElementById('fEmail').value='';
  document.getElementById('emailWrap').style.display='';
  document.getElementById('staffPickerWrap').style.display='';
  resetStaffPicker();
  document.getElementById('headOfGroupPanel').classList.remove('show');
  resetHogPicker();
  ['ipad','bookings','foodcourt','repair','portfolio','staff','headOfGroup','assistantDirectorAcademic','assistantDirectorBudget','assistantDirectorGeneral','assistantDirectorPersonnel','assistantDirectorStudent','deputyDirectorAcademic','deputyDirectorBudget','deputyDirectorGeneral','deputyDirectorPersonnel','director'].forEach(function(k){
    var el=document.getElementById('perm-'+k);
    if(el){el.checked=false; onPermChange(k);}
  });
  openModal('adminModal');
  lucide.createIcons();
}

function openEditModal(email){
  editingEmail=email;
  var admin=allAdmins.find(function(a){return a.email===email;});
  if(!admin) return;
  document.getElementById('modalTitle').textContent='แก้ไขสิทธิ์ — '+admin.email;
  document.getElementById('modalSaveLbl').textContent='บันทึก';
  document.getElementById('fName').value=admin.data.name||'';
  document.getElementById('emailWrap').style.display='none';
  document.getElementById('staffPickerWrap').style.display='';
  // show picker display with current name
  document.getElementById('staffPickerDisplay').value = admin.data.name || '';
  document.getElementById('staffDropdown').classList.remove('open');
  var p=admin.data.permissions||{};
  ['ipad','bookings','foodcourt','repair','portfolio','staff','headOfGroup','assistantDirectorAcademic','assistantDirectorBudget','assistantDirectorGeneral','assistantDirectorPersonnel','assistantDirectorStudent','deputyDirectorAcademic','deputyDirectorBudget','deputyDirectorGeneral','deputyDirectorPersonnel','director'].forEach(function(k){
    var el=document.getElementById('perm-'+k);
    if(el){el.checked=!!p[k]; onPermChange(k);}
  });
  // restore headOfGroup panel & picker
  resetHogPicker();
  if (p.headOfGroup) {
    document.getElementById('headOfGroupPanel').classList.add('show');
    var savedHead = admin.data.headOfGroupEmail || admin.data.name || '';
    restoreHogPicker(savedHead || email);
  }
  openModal('adminModal');
  lucide.createIcons();
}

function saveAdmin(){
  var name=(document.getElementById('fName').value||'').trim();
  var bookings=document.getElementById('perm-bookings').checked;
  var isHeadOfGroup = document.getElementById('perm-headOfGroup').checked;
  var perms={
    ipad:               document.getElementById('perm-ipad').checked,
    bookings:           bookings,
    rooms:              bookings,
    foodcourt:          document.getElementById('perm-foodcourt').checked,
    repair:             document.getElementById('perm-repair').checked,
    portfolio:          document.getElementById('perm-portfolio').checked,
    staff:              document.getElementById('perm-staff').checked,
    headOfGroup:        isHeadOfGroup,
    assistantDirectorAcademic:  document.getElementById('perm-assistantDirectorAcademic').checked,
    assistantDirectorBudget:    document.getElementById('perm-assistantDirectorBudget').checked,
    assistantDirectorGeneral:   document.getElementById('perm-assistantDirectorGeneral').checked,
    assistantDirectorPersonnel: document.getElementById('perm-assistantDirectorPersonnel').checked,
    assistantDirectorStudent:   document.getElementById('perm-assistantDirectorStudent').checked,
    deputyDirectorAcademic:   document.getElementById('perm-deputyDirectorAcademic').checked,
    deputyDirectorBudget:     document.getElementById('perm-deputyDirectorBudget').checked,
    deputyDirectorGeneral:    document.getElementById('perm-deputyDirectorGeneral').checked,
    deputyDirectorPersonnel:  document.getElementById('perm-deputyDirectorPersonnel').checked,
    director:           document.getElementById('perm-director').checked,
    admins:             false
  };

  // extra: save headOfGroup staff info
  var extraData = {};
  if (isHeadOfGroup) {
    if (_selectedHog) {
      extraData.headOfGroupEmail   = _selectedHog.email || '';
      extraData.headOfGroupName    = _selectedHog.name || '';
      extraData.headOfGroupSubject = _selectedHog.group || '';
      if (!name) name = _selectedHog.name;
    }
  }

  if(editingEmail){
    db.collection('admins').doc(editingEmail).update(Object.assign({
      name: name, permissions: perms,
      updatedBy: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, extraData)).then(function(){ closeModal('adminModal'); showToast('อัปเดตสิทธิ์แล้ว ✓'); })
    .catch(function(e){ showToast(e.message,'error'); });
  } else {
    var email=(document.getElementById('fEmail').value||'').trim().toLowerCase();
    if(!email||!email.includes('@')){ showToast('กรุณาระบุ email ให้ถูกต้อง','warn'); return; }
    if(email===SUPER_ADMIN){ showToast('email นี้เป็น SuperAdmin อยู่แล้ว','warn'); return; }
    db.collection('admins').doc(email).set(Object.assign({
      name: name, permissions: perms,
      addedBy: currentUser.email,
      addedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, extraData)).then(function(){ closeModal('adminModal'); showToast('เพิ่ม Admin แล้ว ✓'); })
    .catch(function(e){ showToast(e.message,'error'); });
  }
}

/* ══════════════════════ MODAL: DELETE ══════════════════════ */
function openDeleteModal(email){
  deletingEmail=email;
  var admin=allAdmins.find(function(a){return a.email===email;});
  document.getElementById('deleteModalText').textContent='ต้องการลบ Admin "' + (admin&&admin.data.name?admin.data.name+' ('+email+')':email) + '" ใช่หรือไม่?';
  openModal('deleteModal');
  lucide.createIcons();
}

function confirmDelete(){
  if(!deletingEmail) return;
  if(deletingEmail===SUPER_ADMIN){ showToast('ไม่สามารถลบ SuperAdmin ได้','warn'); return; }
  db.collection('admins').doc(deletingEmail).delete()
    .then(function(){ closeModal('deleteModal'); showToast('ลบ Admin แล้ว'); deletingEmail=null; })
    .catch(function(e){ showToast(e.message,'error'); });
}

/* ══════════════════════ MODAL: QUICK PERM ══════════════════════ */
function openQuickPerm(email, permKey, currentVal){
  var admin=allAdmins.find(function(a){return a.email===email;});
  var pd=PERM_DEFS.find(function(x){return x.key===permKey;});
  var newVal=!currentVal;
  quickPerm={email:email, permKey:permKey, newVal:newVal};
  document.getElementById('quickPermSub').textContent=(admin&&admin.data.name?admin.data.name+' · ':'')+email;
  document.getElementById('quickPermText').textContent=(newVal?'✅ มอบสิทธิ์':'❌ ถอดสิทธิ์')+' "'+pd.label+'" ให้กับ Admin คนนี้';
  openModal('quickPermModal');
  lucide.createIcons();
}

function confirmQuickPerm(){
  if(!quickPerm) return;
  var admin=allAdmins.find(function(a){return a.email===quickPerm.email;});
  if(!admin) return;
  var perms=Object.assign({}, admin.data.permissions||{});
  perms[quickPerm.permKey]=quickPerm.newVal;
  db.collection('admins').doc(quickPerm.email).update({
    permissions: perms,
    updatedBy: currentUser.email,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){
    closeModal('quickPermModal');
    showToast((quickPerm.newVal?'มอบ':'ถอด')+'สิทธิ์แล้ว ✓');
    quickPerm=null;
  }).catch(function(e){ showToast(e.message,'error'); });
}

/* ══════════════════════ INIT ══════════════════════ */
buildPage({
  appId:        'adminRoleApp',
  navSubtitle:  'NP Origins · จัดการสิทธิ์ Admin',
  navTheme:     'dark',
  activePage:   'admin-role',
  requireAdmin: 'superadmin',

  onAuth: function(user, contentEl) {
    currentUser = user;
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);

    /* inject page content จาก <template> */
    var tpl = document.getElementById('adminRoleContent');
    if (tpl) contentEl.appendChild(tpl.content.cloneNode(true));

    lucide.createIcons();
    subscribeAdmins();
    loadStaffList();
    setupScrollTopButton();
  }
});


lucide.createIcons();


