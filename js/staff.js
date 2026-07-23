/* ════ State ════ */
var allStaff = [], currentFilter = 'all', editingId = null, deleteId = null, parsedCSV = [];

/* ════ Init ════ */
var canWrite = false; /* set after auth */
var SUPER_ADMIN_EMAIL = 'nattapol@nongki.ac.th';

/* ════ Render Table ════ */
var GROUP_COLORS = { 'วิทยาศาสตร์':'วิทยาศาสตร์','เทคโนโลยี':'เทคโนโลยี','คณิตศาสตร์':'คณิตศาสตร์','ภาษาไทย':'ภาษาไทย','สังคมศึกษา ศาสนา และวัฒนธรรม':'สังคมศึกษา ศาสนา และวัฒนธรรม','สุขศึกษาและพลศึกษา':'สุขศึกษาและพลศึกษา','ภาษาต่างประเทศ':'ภาษาต่างประเทศ','ศิลปะ':'ศิลปะ','การงานอาชีพ':'การงานอาชีพ','แนะแนว':'แนะแนว','เจ้าหน้าที่':'เจ้าหน้าที่','ผู้บริหาร':'ผู้บริหาร' };
var AVATAR_COLORS = ['#1d4ed8','var(--c-violet)','var(--c-green-deep)','var(--c-amber-deep)','var(--c-sky-deep)','#be185d','var(--c-amber)','#0d9488'];

/* ════ Import CSV / Paste ════ */
var importTab = 'file';

/* ═══════════════════════════════════════════
   SAR Modal – แสดงภาพรวม SAR ของบุคลากร
   ═══════════════════════════════════════════ */
var _smStaffId = '', _smStaffData = null;

/* ══════════════════════ DATA LOADING ══════════════════════ */
/* ════ Firestore ════ */
function initStaffListener() {
  db.collection('staff').orderBy('name').onSnapshot(function(snap) {
    allStaff = [];
    snap.forEach(function(d) { allStaff.push(Object.assign({ id: d.id }, d.data())); });
    updateStats();
    renderStaff();
  });
}

/* ══════════════════════ RENDER ══════════════════════ */
function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

function getInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[parts.length - 2][0] || '') + (parts[parts.length - 1][0] || '');
  return parts[0][0] || '?';
}
function getAvatarColor(name) {
  var h = 0;
  for (var i = 0; i < (name||'').length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function renderStaff() {
  var search = (document.getElementById('searchInput').value || '').toLowerCase();
  var list = allStaff.filter(function(s) {
    if (currentFilter !== 'all' && s.group !== currentFilter) return false;
    if (search) {
      var txt = ((s.name||'') + (s.position||'') + (s.email||'') + (s.group||'') + (s.subject||'')).toLowerCase();
      if (txt.indexOf(search) === -1) return false;
    }
    return true;
  });

  var tbody = document.getElementById('staffTableBody');
  var empty = document.getElementById('staffEmptyState');
  var countLabel = document.getElementById('staffCountLabel');

  if (!list.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    countLabel.textContent = '';
    return;
  }
  empty.style.display = 'none';
  countLabel.textContent = 'แสดง ' + list.length + ' รายการ';

  tbody.innerHTML = list.map(function(s, idx) {
    var initials = getInitials(s.name);
    var avatarColor = getAvatarColor(s.name);
    var groupKey = GROUP_COLORS[s.group] || 'อื่น';
    var groupLabelMap = {'วิทยาศาสตร์':'วิทยาศาสตร์','เทคโนโลยี':'เทคโนโลยี','คณิตศาสตร์':'คณิตศาสตร์','ภาษาไทย':'ภาษาไทย','สังคมศึกษา ศาสนา และวัฒนธรรม':'สังคมศึกษา ศาสนา และวัฒนธรรม','สุขศึกษาและพลศึกษา':'สุขศึกษาและพลศึกษา','ภาษาต่างประเทศ':'ภาษาต่างประเทศ','ศิลปะ':'ศิลปะ','การงานอาชีพ':'การงานอาชีพ','แนะแนว':'แนะแนว','เจ้าหน้าที่':'เจ้าหน้าที่','ผู้บริหาร':'ผู้บริหาร'};
    var groupLabel = groupLabelMap[s.group] || (s.group || '-');

    return '<tr>' +
      '<td style="color:var(--text3);font-size:12px;">' + (idx + 1) + '</td>' +
      '<td>' +
        '<div style="display:flex;align-items:center;gap:var(--gap-item);">' +
          '<div class="avatar-initials" style="background:' + avatarColor + ';">' + initials + '</div>' +
          '<div>' +
            '<a href="javascript:void(0)" onclick="openSarModal(\'' + s.id + '\',\'' + esc(s.email||'') + '\')" ' +
              'style="font-weight:700;color:var(--text-dark);font-size:13px;text-decoration:none;cursor:pointer;" ' +
              'onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text-dark)\'">' +
              esc2(s.name || '') +
            '</a>' +
            (s.subject ? '<p style="font-size:11px;color:var(--text3);">วิชา: ' + esc2(s.subject) + '</p>' : '') +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td><span class="pos-tag">' + esc2(s.position || '-') + '</span>' +
        (s.role ? '<br><span style="font-size:10px;color:var(--violet);font-weight:700;margin-top:3px;display:inline-block;">⭐ ' + esc2(s.role) + '</span>' : '') +
      '</td>' +
      '<td><span class="group-badge" data-group="' + esc2(s.group||'') + '">' + esc2(groupLabel) + '</span></td>' +
      '<td class="hide-mobile">' +
        (s.email ? '<a href="mailto:' + esc2(s.email) + '" style="color:var(--accent);font-weight:600;font-size:12px;text-decoration:none;">' + esc2(s.email) + '</a>' : '<span style="color:var(--border-mid);">-</span>') +
      '</td>' +
      '<td class="hide-mobile" style="font-size:12px;">' +
        (s.phone ? '<a href="tel:' + esc2(s.phone) + '" style="color:var(--accent);text-decoration:none;font-weight:600;">' + esc2(s.phone) + '</a>' : '<span style="color:var(--border-mid);">-</span>') +
      '</td>' +
      '<td>' +
        '<div style="display:flex;gap:5px;justify-content:center;">' +
          (canWrite ? '<button class="btn-icon" onclick="openEditModal(\'' + s.id + '\')" title="แก้ไข"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>' : '') +
          (canWrite ? '<button class="btn-icon red" onclick="openDeleteModal(\'' + s.id + '\',\'' + esc(s.name) + '\')" title="ลบ"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>' : '<span style="font-size:11px;color:var(--border-mid);">-</span>') +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
  lucide.createIcons();
}


function parsePasteData() {
  var text = document.getElementById('csvPasteArea').value;
  if (!text.trim()) { document.getElementById('importPreview').style.display = 'none'; return; }
  parseCSVText(text, '\t');
}

function detectDelimiter(text) {
  var firstLine = text.split('\n')[0];
  if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) return '\t';
  return ',';
}

function parseCSVText(text, delim) {
  var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
  if (!lines.length) { showToast('ไม่พบข้อมูลในไฟล์', 'warn'); return; }

  // Parse header
  var headers = parseCSVLine(lines[0], delim).map(function(h) { return h.toLowerCase().trim(); });

  // Map column indices
  var colMap = {
    name:     findCol(headers, ['ชื่อ-นามสกุล','ชื่อนามสกุล','ชื่อ','name','fullname','full_name']),
    position: findCol(headers, ['ตำแหน่ง','position','pos','rank']),
    group:    findCol(headers, ['กลุ่มงาน','กลุ่ม','group','department','dept']),
    email:    findCol(headers, ['อีเมล','email','e-mail','mail']),
    phone:    findCol(headers, ['เบอร์โทร','เบอร์','phone','tel','telephone']),
    subject:  findCol(headers, ['วิชาที่สอน','วิชา','subject','subjects']),
    note:     findCol(headers, ['หมายเหตุ','note','notes','remark']),
  };

  if (colMap.name === -1) { showToast('ไม่พบคอลัมน์ "ชื่อ-นามสกุล" หรือ "name"', 'warn'); return; }
  if (colMap.position === -1) { showToast('ไม่พบคอลัมน์ "ตำแหน่ง" หรือ "position"', 'warn'); return; }
  if (colMap.group === -1) { showToast('ไม่พบคอลัมน์ "กลุ่มงาน" หรือ "group"', 'warn'); return; }

  var rows = [];
  var warnings = [];
  var validGroups = ['วิทยาศาสตร์','เทคโนโลยี','คณิตศาสตร์','ภาษาไทย','สังคมศึกษา ศาสนา และวัฒนธรรม','สุขศึกษาและพลศึกษา','ภาษาต่างประเทศ','ศิลปะ','การงานอาชีพ','แนะแนว','ผู้บริหาร','เจ้าหน้าที่'];

  for (var i = 1; i < lines.length; i++) {
    var cells = parseCSVLine(lines[i], delim);
    var name = cells[colMap.name] || '';
    if (!name.trim()) continue;

    var group = cells[colMap.group] || '';
    // normalize group
    var g = group;
    if (g.includes('การงาน') || g.includes('อาชีพ')) group = 'การงานอาชีพ';
    else if (g.includes('วิทยาศาสตร์') && !g.includes('เทคโนโลยี')) group = 'วิทยาศาสตร์';
    else if (g.includes('เทคโนโลยี') && !g.includes('วิทยาศาสตร์')) group = 'เทคโนโลยี';
    else if (g.includes('วิทยาศาสตร์') && g.includes('เทคโนโลยี')) group = 'วิทยาศาสตร์';
    else if (g.includes('คณิตศาสตร์')) group = 'คณิตศาสตร์';
    else if (g.includes('ต่างประเทศ') || g.includes('ภาษาอังกฤษ')) group = 'ภาษาต่างประเทศ';
    else if (g.includes('ภาษาไทย')) group = 'ภาษาไทย';
    else if (g.includes('ศิลปะ')) group = 'ศิลปะ';
    else if (g.includes('สังคม')) group = 'สังคมศึกษา ศาสนา และวัฒนธรรม';
    else if (g.includes('สุขศึกษา') || g.includes('พลศึกษา')) group = 'สุขศึกษาและพลศึกษา';
    else if (g.includes('แนะแนว')) group = 'แนะแนว';
    else if (g.includes('บริหาร') && !g.includes('งาน')) group = 'ผู้บริหาร';
    else if (g.includes('เจ้าหน้าที่') || g.includes('ธุรการ')) group = 'เจ้าหน้าที่';
    else if (!validGroups.includes(group)) { warnings.push('แถวที่ '+(i+1)+': กลุ่ม "'+group+'" ไม่รู้จัก → ใช้ "เจ้าหน้าที่"'); group = 'เจ้าหน้าที่'; }

    rows.push({
      name:     name.trim(),
      position: colMap.position >= 0 ? (cells[colMap.position] || '').trim() : '',
      group:    group,
      email:    colMap.email >= 0 ? (cells[colMap.email] || '').trim() : '',
      phone:    colMap.phone >= 0 ? (cells[colMap.phone] || '').trim() : '',
      subject:  colMap.subject >= 0 ? (cells[colMap.subject] || '').trim() : '',
      note:     colMap.note >= 0 ? (cells[colMap.note] || '').trim() : '',
    });
  }

  parsedCSV = rows;
  showImportPreview(rows, headers, warnings);
}

function findCol(headers, aliases) {
  for (var i = 0; i < headers.length; i++) {
    for (var j = 0; j < aliases.length; j++) {
      if (headers[i].includes(aliases[j])) return i;
    }
  }
  return -1;
}

function parseCSVLine(line, delim) {
  if (delim === '\t') return line.split('\t').map(function(v) { return v.trim(); });
  // Simple CSV parser supporting quoted fields
  var result = [], current = '', inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim()); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function clearImport() {
  parsedCSV = [];
  document.getElementById('csvFileInput').value = '';
  document.getElementById('csvPasteArea').value = '';
  document.getElementById('csvDropArea').classList.remove('has-file');
  document.getElementById('importPreview').style.display = 'none';
  document.getElementById('importCount').textContent = '0';
  var btn = document.getElementById('importConfirmBtn');
  btn.disabled = true; btn.style.opacity = '.5'; btn.style.cursor = 'not-allowed';
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

function updateStats() {
  var subs = ['วิทยาศาสตร์','เทคโนโลยี','คณิตศาสตร์','ภาษาไทย','สังคมศึกษา ศาสนา และวัฒนธรรม','สุขศึกษาและพลศึกษา','ภาษาต่างประเทศ','ศิลปะ','การงานอาชีพ','แนะแนว'];
  document.getElementById('statTotal').textContent = allStaff.length;
  document.getElementById('statAcademic').textContent = allStaff.filter(function(s) { return subs.indexOf(s.group) >= 0; }).length;
  document.getElementById('statBudget').textContent = allStaff.filter(function(s) { return s.group === 'เจ้าหน้าที่'; }).length;
  document.getElementById('statAdmin').textContent = allStaff.filter(function(s) { return s.group === 'ผู้บริหาร'; }).length;
}

/* ════ Filter ════ */
function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-pill').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
  renderStaff();
}

/* ════ Add/Edit Modal ════ */
function openAddModal() {
  editingId = null;
  document.getElementById('staffModalTitle').textContent = 'เพิ่มบุคลากร';
  document.getElementById('staffModalSaveLbl').textContent = 'เพิ่มบุคลากร';
  ['fName','fPosition','fEmail','fPhone','fSubject','fNote'].forEach(function(id) { document.getElementById(id).value = ''; });
  document.getElementById('fGroup').value = '';
  document.getElementById('fRole').value = '';
  document.getElementById('fAcademicRank').value = '';
  openModal('staffModal');
}

function openEditModal(id) {
  var s = allStaff.find(function(x) { return x.id === id; });
  if (!s) return;
  editingId = id;
  document.getElementById('staffModalTitle').textContent = 'แก้ไขข้อมูลบุคลากร';
  document.getElementById('staffModalSaveLbl').textContent = 'บันทึก';
  document.getElementById('fName').value = s.name || '';
  document.getElementById('fPosition').value = s.position || '';
  document.getElementById('fGroup').value = s.group || '';
  document.getElementById('fEmail').value = s.email || '';
  document.getElementById('fPhone').value = s.phone || '';
  document.getElementById('fSubject').value = s.subject || '';
  document.getElementById('fNote').value = s.note || '';
  document.getElementById('fRole').value = s.role || '';
  document.getElementById('fAcademicRank').value = s.academic_rank || '';
  openModal('staffModal');
}

function saveStaff() {
  if (!canWrite) { showToast('คุณไม่มีสิทธิ์จัดการข้อมูลบุคลากร', 'warn'); return; }
  var name     = document.getElementById('fName').value.trim();
  var position = document.getElementById('fPosition').value.trim();
  var group    = document.getElementById('fGroup').value;
  if (!name)     { showToast('กรุณากรอกชื่อ-นามสกุล', 'warn'); return; }
  if (!position) { showToast('กรุณากรอกตำแหน่ง', 'warn'); return; }
  if (!group)    { showToast('กรุณาเลือกกลุ่มสาระ / กลุ่มงาน', 'warn'); return; }

  var now   = firebase.firestore.FieldValue.serverTimestamp();
  var email = document.getElementById('fEmail').value.trim().toLowerCase();
  var phone = document.getElementById('fPhone').value.trim();
  var academic_rank = document.getElementById('fAcademicRank').value;
  var data  = {
    name:      name,
    position:  position,
    group:     group,
    role:      document.getElementById('fRole').value,
    academic_rank: academic_rank,
    email:     email,
    phone:     phone,
    subject:   document.getElementById('fSubject').value.trim(),
    note:      document.getElementById('fNote').value.trim(),
    updatedAt: now
  };

  var staffPromise = editingId
    ? db.collection('staff').doc(editingId).update(data)
    : db.collection('staff').add(Object.assign({}, data, { createdAt: now }));

  staffPromise.then(function() {
    /* ── ซิงค์ไปยัง staff_profile_sync (keyed by email) ── */
    if (email) {
      /* staff_profile_sync ใช้ email เป็น doc id
         profile.html จะอ่านจากที่นี่เพื่อแสดง field ที่ admin เป็นเจ้าของ */
      db.collection('staff_profile_sync').doc(email).set({
        email:         email,
        name:          name,
        position:      position,
        group:         group,
        academic_rank: academic_rank || data.role || '',
        subject:       data.subject || '',
        phone:         phone,
        syncedAt:      now,
        syncedBy:      'admin'
      }, { merge: true }).catch(function(e){ console.warn('sync warn:', e); });
    }
    closeModal('staffModal');
    showToast(editingId ? 'อัปเดตข้อมูลแล้ว ✓' : 'เพิ่มบุคลากรแล้ว ✓');
  }).catch(function(e) { showToast(e.message, 'error'); });
}

/* ════ Delete ════ */
function openDeleteModal(id, name) {
  deleteId = id;
  document.getElementById('deleteModalSub').textContent = name;
  openModal('deleteModal');
}
function confirmDelete() {
  if (!canWrite) { showToast('คุณไม่มีสิทธิ์ลบข้อมูลบุคลากร', 'warn'); return; }
  if (!deleteId) return;
  db.collection('staff').doc(deleteId).delete().then(function() {
    closeModal('deleteModal');
    showToast('ลบข้อมูลแล้ว');
  }).catch(function(e) { showToast(e.message, 'error'); });
}

/* ════ Modal helpers ════ */
/* openModal overridden here (not in common.js) to also refresh lucide icons inside the modal on open.
   closeModal intentionally NOT redefined — uses common.js's version. */
function openModal(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden'; lucide.createIcons(); }

/* ════ Export CSV ════ */
function exportCSV() {
  if (!allStaff.length) { showToast('ไม่มีข้อมูลให้ส่งออก', 'warn'); return; }
  var headers = ['ชื่อ-นามสกุล','ตำแหน่ง','กลุ่มงาน','อีเมล','เบอร์โทร','วิชาที่สอน','หมายเหตุ'];
  var rows = allStaff.map(function(s) {
    return [s.name,s.position,s.group,s.email,s.phone,s.subject,s.note].map(function(v) {
      var str = String(v || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) str = '"' + str.replace(/"/g, '""') + '"';
      return str;
    }).join(',');
  });
  var csv = '\uFEFF' + [headers.join(',')].concat(rows).join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'staff_np_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('ส่งออก CSV แล้ว ✓');
}
function openImportModal() {
  parsedCSV = [];
  document.getElementById('csvFileInput').value = '';
  document.getElementById('csvPasteArea').value = '';
  document.getElementById('csvDropArea').classList.remove('has-file');
  document.getElementById('importPreview').style.display = 'none';
  document.getElementById('importConfirmBtn').disabled = true;
  document.getElementById('importConfirmBtn').style.opacity = '.5';
  document.getElementById('importConfirmBtn').style.cursor = 'not-allowed';
  document.getElementById('importCount').textContent = '0';
  switchImportTab('file');
  openModal('importModal');
}

function switchImportTab(tab) {
  importTab = tab;
  document.getElementById('importFilePanel').style.display = tab === 'file' ? '' : 'none';
  document.getElementById('importPastePanel').style.display = tab === 'paste' ? '' : 'none';
  document.getElementById('tabFileBtn').style.borderBottomColor  = tab === 'file'  ? 'var(--accent)' : 'transparent';
  document.getElementById('tabPasteBtn').style.borderBottomColor = tab === 'paste' ? 'var(--accent)' : 'transparent';
  document.getElementById('tabFileBtn').style.color  = tab === 'file'  ? 'var(--accent)' : 'var(--text2)';
  document.getElementById('tabPasteBtn').style.color = tab === 'paste' ? 'var(--accent)' : 'var(--text2)';
}

function handleCsvDrop(e) {
  e.preventDefault();
  document.getElementById('csvDropArea').classList.remove('dragging');
  var file = e.dataTransfer.files[0];
  if (file) handleCsvFile(file);
}

function handleCsvFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var text = e.target.result;
    // detect delimiter
    parseCSVText(text, detectDelimiter(text));
    document.getElementById('csvDropArea').classList.add('has-file');
  };
  reader.readAsText(file, 'UTF-8');
}

function showImportPreview(rows, headers, warnings) {
  var previewCols = ['name','position','group','email'];
  var colLabels = { name:'ชื่อ-นามสกุล', position:'ตำแหน่ง', group:'กลุ่มงาน', email:'อีเมล' };

  document.getElementById('previewCount').textContent = rows.length;
  document.getElementById('importCount').textContent = rows.length;

  var thead = '<tr>';
  previewCols.forEach(function(c) { thead += '<th>' + colLabels[c] + '</th>'; });
  thead += '</tr>';
  document.getElementById('previewHead').innerHTML = thead;

  var tbody = '';
  var showRows = rows.slice(0, 10);
  showRows.forEach(function(r) {
    tbody += '<tr>';
    previewCols.forEach(function(c) { tbody += '<td>' + esc2(r[c] || '') + '</td>'; });
    tbody += '</tr>';
  });
  if (rows.length > 10) tbody += '<tr><td colspan="4" style="text-align:center;color:var(--text3);font-style:italic;">... และอีก ' + (rows.length - 10) + ' รายการ</td></tr>';
  document.getElementById('previewBody').innerHTML = tbody;

  if (warnings.length) {
    document.getElementById('importWarning').style.display = '';
    document.getElementById('importWarning').innerHTML = '⚠️ ' + warnings.slice(0,3).map(function(w){return esc2(w);}).join('<br>') + (warnings.length > 3 ? '<br>... และอีก '+(warnings.length-3)+' คำเตือน' : '');
  } else {
    document.getElementById('importWarning').style.display = 'none';
  }

  document.getElementById('importPreview').style.display = '';
  var btn = document.getElementById('importConfirmBtn');
  if (rows.length > 0) {
    btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true; btn.style.opacity = '.5'; btn.style.cursor = 'not-allowed';
  }
}

function confirmImport() {
  if (!canWrite) { showToast('คุณไม่มีสิทธิ์นำเข้าข้อมูลบุคลากร', 'warn'); return; }
  if (!parsedCSV.length) return;
  var btn = document.getElementById('importConfirmBtn');
  btn.disabled = true; btn.textContent = 'กำลังนำเข้า...';

  var batch = db.batch();
  var now = firebase.firestore.FieldValue.serverTimestamp();
  parsedCSV.forEach(function(row) {
    var ref = db.collection('staff').doc();
    batch.set(ref, Object.assign(row, { createdAt: now, updatedAt: now }));
  });

  batch.commit().then(function() {
    closeModal('importModal');
    showToast('นำเข้า ' + parsedCSV.length + ' รายการสำเร็จ ✓');
  }).catch(function(e) {
    showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="check" style="width:14px;height:14px;"></i> นำเข้าข้อมูล (' + parsedCSV.length + ' รายการ)';
    lucide.createIcons();
  });
}

/* ════ Download Template CSV ════ */
function downloadTemplate() {
  var headers = ['ชื่อ-นามสกุล','ตำแหน่ง','กลุ่มสาระ','อีเมล','เบอร์โทร','วิชาที่สอน','หมายเหตุ'];
  var examples = [
    ['นายสมชาย ใจดี','ครูชำนาญการ','คณิตศาสตร์','somchai@nongki.ac.th','081-234-5678','คณิตศาสตร์',''],
    ['นางสาวสมหญิง รักเรียน','ครูชำนาญการพิเศษ','วิทยาศาสตร์ และเทคโนโลยี','somying@nongki.ac.th','082-345-6789','ฟิสิกส์, เคมี',''],
    ['นายวิชัย มานะดี','ครู','ภาษาไทย','wichai@nongki.ac.th','083-456-7890','ภาษาไทย',''],
    ['นางสมศรี สอนดี','ครูชำนาญการ','ภาษาต่างประเทศ','somsri@nongki.ac.th','084-567-8901','ภาษาอังกฤษ',''],
    ['นายประเสริฐ ก้าวไกล','ครู','วิทยาศาสตร์ และเทคโนโลยี','prasert@nongki.ac.th','085-678-9012','วิทยาการคำนวณ',''],
    ['นายวิทยา นำทาง','ครู','แนะแนว','wittaya@nongki.ac.th','086-789-0123','แนะแนว',''],
    ['นายอำนาจ บริหารดี','รองผู้อำนวยการ','ผู้บริหาร','amnart@nongki.ac.th','087-890-1234','','ฝ่ายวิชาการ'],
    ['นางสาวพิมพ์ใจ ขยันงาน','เจ้าหน้าที่ธุรการ','เจ้าหน้าที่','pimjai@nongki.ac.th','088-901-2345','','งานธุรการ'],
  ];
  var note = [
    '# กลุ่มสาระที่รองรับ: วิทยาศาสตร์ / เทคโนโลยี / คณิตศาสตร์ / ภาษาไทย / สังคมศึกษา ศาสนา และวัฒนธรรม / สุขศึกษาและพลศึกษา / ภาษาต่างประเทศ / ศิลปะ / การงานอาชีพ / แนะแนว / เจ้าหน้าที่ / ผู้บริหาร',
    '# กรุณาลบแถว # และแถวตัวอย่างออกก่อนนำเข้าระบบ'
  ];
  var rows = examples.map(function(r) {
    return r.map(function(v) {
      var s = String(v || '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) s = '"' + s.replace(/"/g,'""') + '"';
      return s;
    }).join(',');
  });
  var csv = '\uFEFF' + note.join('\n') + '\n' + headers.join(',') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'template_staff_np.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('ดาวน์โหลด Template CSV แล้ว ✓');
}

function openSarModal(staffId, staffEmail) {
  _smStaffId   = staffId;
  var s = allStaff.find(function(x){ return x.id === staffId; });
  _smStaffData = s || null;

  var name     = (s && s.name)     || '—';
  var position = (s && s.position) || '';
  var group    = (s && s.group)    || '';
  document.getElementById('sarModalName').textContent     = name;
  document.getElementById('sarModalPosition').textContent = position;
  document.getElementById('sarModalGroup').textContent    = group;
  document.getElementById('sarModalProfileLink').href     = 'profile.html?staffId=' + staffId;

  var ini = name.trim().split(' ').slice(0,2).map(function(w){return (w||'')[0]||'';}).join('').toUpperCase() || '?';
  document.getElementById('sarModalInitials').textContent = ini;

  /* โหลด iframe */
  var iframe = document.getElementById('sarModalIframe');
  iframe.src = '';
  document.getElementById('sarModalLoading').style.display = 'block';
  iframe.style.display = 'none';

  document.getElementById('sarModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();

  /* หน่วง 1 tick เพื่อให้ modal render ก่อน แล้วค่อยโหลด iframe */
  setTimeout(function() {
    iframe.src = 'profile.html?staffId=' + encodeURIComponent(staffId) + '&embed=1';
  }, 50);
}

function closeSarModal() {
  document.getElementById('sarModal').classList.remove('open');
  document.body.style.overflow = '';
  /* clear iframe src เพื่อหยุด Firebase listener ใน profile.html */
  var iframe = document.getElementById('sarModalIframe');
  if (iframe) iframe.src = '';
}

/* ══════════════════════ INIT ══════════════════════ */
buildPage({
  appId:        'staffApp',
  navSubtitle:  'NP Origins · จัดการบุคลากร',
  navTheme:     'dark',
  activePage:   'staff',
  requireAdmin: 'staff',

  onAuth: function(user, contentEl) {
    /* inject page content จาก <template> */
    var tpl = document.getElementById('staffContent');
    if (tpl) contentEl.appendChild(tpl.content.cloneNode(true));

    updateNavUser(user);
    checkAdminAccess(user.email);
    updateSidebarProfile(user);

    /* ── ตรวจสิทธิ์เขียนข้อมูล ── */
    var lEmail = user.email.toLowerCase();
    var isSA = lEmail === SUPER_ADMIN_EMAIL;
    db.collection('admins').doc(lEmail).get().then(function(doc) {
      var perms = (doc.exists && doc.data().permissions) ? doc.data().permissions : {};
      canWrite = isSA || !!perms.staff;
      if (!canWrite) {
        document.querySelectorAll('.write-gated').forEach(function(el){ el.style.display='none'; });
      }
    });

    initStaffListener();
    lucide.createIcons();
    setupScrollTopButton();
  }
});
/* ═══════════════ END SAR Modal ═══════════════ */

lucide.createIcons();


