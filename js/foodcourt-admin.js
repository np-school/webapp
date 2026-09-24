/* ══════════════════════ STATE ══════════════════════ */
// ══════════════════════════════════════
// DATA
// ══════════════════════════════════════
const CSV_RAW = `วันที่,รายการ,รายรับ,รายจ่าย,คงเหลือ,หมายเหตุ
2026-05-18,รับเงิน % ร้านค้าโรงอาหาร,6854,,6854,
2026-05-18,ร้านสวัสดิการโรงเรียน,864,,7718,
2026-05-18,ร้านเกดเอง,161,,7879,
2026-05-18,ร้านน้ำโรงอาหาร,136,,8015,
2026-05-18,ร้านสตรอเบอร์รี่โยเกิร์ต,35,,8050,
2026-05-18,ร้านเจเจ,134,,8184,
2026-05-18,ร้านโมโม่ชา,96,,8280,
2026-05-18,ค่าแรงคนเติมเงิน,,700,7580,
2026-05-18,ซื้อวัสดุอุปกรณ์,,710,6870,
2026-05-18,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,900,5970,18 ร้าน
2026-05-19,รับเงิน % ร้านค้าโรงอาหาร,8394,,14364,
2026-05-19,ร้านสวัสดิการโรงเรียน,1079,,15443,
2026-05-19,ร้านเกดเอง,158,,15601,
2026-05-19,ร้านน้ำโรงอาหาร,132,,15733,
2026-05-19,ร้านสตรอเบอร์รี่โยเกิร์ต,22,,15755,
2026-05-19,ร้านเจเจ,206,,15961,
2026-05-19,ร้านโมโม่ชา,112,,16073,
2026-05-19,ค่าแรงคนเติมเงิน,,700,15373,
2026-05-19,ค่าน้ำมันรถ อาหาร และเครื่องดื่ม,,1500,13873,
2026-05-19,ค่าหัวแปลง USB,,295,13578,
2026-05-19,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,850,12728,17 ร้าน
2026-05-20,รับเงิน % ร้านค้าโรงอาหาร,7120,,19848,
2026-05-20,ร้านสวัสดิการโรงเรียน,958,,20806,
2026-05-20,ร้านเกดเอง,112,,20918,
2026-05-20,ร้านน้ำโรงอาหาร,109,,21027,
2026-05-20,ร้านสตรอเบอร์รี่โยเกิร์ต,46,,21073,
2026-05-20,ร้านเจเจ,210,,21283,
2026-05-20,ร้านโมโม่ชา,88,,21371,
2026-05-20,ค่าแรงคนเติมเงิน,,700,20671,
2026-05-20,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,900,19771,18 ร้าน
2026-05-21,รับเงิน % ร้านค้าโรงอาหาร,8961,,28732,
2026-05-21,ร้านสวัสดิการโรงเรียน,1001,,29733,
2026-05-21,ร้านเกดเอง,179,,29912,
2026-05-21,ร้านน้ำโรงอาหาร,142,,30054,
2026-05-21,ร้านสตรอเบอร์รี่โยเกิร์ต,87,,30141,
2026-05-21,ร้านเจเจ,301,,30442,
2026-05-21,ร้านโมโม่ชา,128,,30570,
2026-05-21,ค่าแรงคนเติมเงิน,,700,29870,
2026-05-21,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,900,28970,18 ร้าน
2026-05-22,รับเงิน % ร้านค้าโรงอาหาร,8538,,37508,
2026-05-22,ร้านสวัสดิการโรงเรียน,940,,38448,
2026-05-22,ร้านเกดเอง,170,,38618,
2026-05-22,ร้านน้ำโรงอาหาร,126,,38744,
2026-05-22,ร้านสตรอเบอร์รี่โยเกิร์ต,90,,38834,
2026-05-22,ร้านเจเจ,282,,39116,
2026-05-22,ร้านโมโม่ชา,116,,39232,
2026-05-22,ค่าแรงคนเติมเงิน,,700,38532,
2026-05-22,ค่าแรงคนทำความสะอาด,,6000,32532,
2026-05-22,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,900,31632,18 ร้าน
2026-05-25,รับเงิน % ร้านค้าโรงอาหาร,8122,,39754,
2026-05-25,ร้านสวัสดิการโรงเรียน,1046,,40800,
2026-05-25,ร้านเกดเอง,167,,40967,
2026-05-25,ร้านน้ำโรงอาหาร,136,,41103,
2026-05-25,ร้านสตรอเบอร์รี่โยเกิร์ต,120,,41223,
2026-05-25,ร้านเจเจ,301,,41524,
2026-05-25,ร้านโมโม่ชา,109,,41633,
2026-05-25,ค่าแรงคนเติมเงิน,,700,40933,
2026-05-25,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,850,40083,17 ร้าน
2026-05-26,รับเงิน % ร้านค้าโรงอาหาร,9137,,49220,
2026-05-26,ร้านสวัสดิการโรงเรียน,986,,50206,
2026-05-26,ร้านเกดเอง,205,,50411,
2026-05-26,ร้านน้ำโรงอาหาร,163,,50574,
2026-05-26,ร้านสตรอเบอร์รี่โยเกิร์ต,117,,50691,
2026-05-26,ร้านเจเจ,320,,51011,
2026-05-26,ร้านโมโม่ชา,131,,51142,
2026-05-26,ค่าแรงคนเติมเงิน,,700,50442,
2026-05-26,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,850,49592,17 ร้าน
2026-05-27,รับเงิน % ร้านค้าโรงอาหาร,8318,,57910,
2026-05-27,ร้านสวัสดิการโรงเรียน,995,,58905,
2026-05-27,ร้านเกดเอง,179,,59084,
2026-05-27,ร้านน้ำโรงอาหาร,148,,59232,
2026-05-27,ร้านสตรอเบอร์รี่โยเกิร์ต,117,,59349,
2026-05-27,ร้านเจเจ,257,,59606,
2026-05-27,ร้านโมโม่ชา,103,,59709,
2026-05-27,ค่าแรงคนเติมเงิน,,700,59009,
2026-05-27,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,900,58109,18 ร้าน
2026-05-28,รับเงิน % ร้านค้าโรงอาหาร,8290,,66399,
2026-05-28,ร้านสวัสดิการโรงเรียน,803,,67202,
2026-05-28,ร้านเกดเอง,185,,67387,
2026-05-28,ร้านน้ำโรงอาหาร,161,,67548,
2026-05-28,ร้านสตรอเบอร์รี่โยเกิร์ต,98,,67646,
2026-05-28,ร้านเจเจ,237,,67883,
2026-05-28,ร้านโมโม่ชา,110,,67993,
2026-05-28,ค่าแรงคนเติมเงิน,,700,67293,
2026-05-28,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,900,66393,18 ร้าน
2026-05-29,รับเงิน % ร้านค้าโรงอาหาร,8726,,75119,
2026-05-29,ร้านสวัสดิการโรงเรียน,902,,76021,
2026-05-29,ร้านเกดเอง,206,,76227,
2026-05-29,ร้านน้ำโรงอาหาร,136,,76363,
2026-05-29,ร้านสตรอเบอร์รี่โยเกิร์ต,108,,76471,
2026-05-29,ร้านเจเจ,295,,76766,
2026-05-29,ร้านโมโม่ชา,133,,76899,
2026-05-29,ค่าแรงคนเติมเงิน,,700,76199,
2026-05-29,ค่าแรงคนทำความสะอาด,,6000,70199,
2026-05-29,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,900,69299,18 ร้าน
2026-06-04,รับเงิน % ร้านค้าโรงอาหาร,8355,,77654,
2026-06-04,ร้านสวัสดิการโรงเรียน,901,,78555,
2026-06-04,ร้านเกดเอง,226,,78781,
2026-06-04,ร้านน้ำโรงอาหาร,156,,78937,
2026-06-04,ร้านสตรอเบอร์รี่โยเกิร์ต,104,,79041,
2026-06-04,ร้านเจเจ,263,,79304,
2026-06-04,ค่าแรงคนเติมเงิน,,700,78604,
2026-06-04,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,900,77704,18 ร้าน
2026-06-05,รับเงิน % ร้านค้าโรงอาหาร,7857,,85561,
2026-06-05,ร้านสวัสดิการโรงเรียน,843,,86404,
2026-06-05,ร้านเกดเอง,204,,86608,
2026-06-05,ร้านน้ำโรงอาหาร,131,,86739,
2026-06-05,ร้านสตรอเบอร์รี่โยเกิร์ต,102,,86841,
2026-06-05,ร้านเจเจ,271,,87112,
2026-06-05,ค่าแรงคนเติมเงิน,,700,86412,
2026-06-05,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,850,85562,17 ร้าน
2026-06-06,รับเงิน % ร้านค้าโรงอาหาร,6730,,92292,
2026-06-06,ร้านสวัสดิการโรงเรียน,764,,93056,
2026-06-06,ร้านเกดเอง,183,,93239,
2026-06-06,ร้านน้ำโรงอาหาร,114,,93353,
2026-06-06,ร้านสตรอเบอร์รี่โยเกิร์ต,75,,93428,
2026-06-06,ร้านเจเจ,228,,93656,
2026-06-06,ค่าแรงคนเติมเงิน,,700,92956,
2026-06-06,ค่าแรงคนทำความสะอาด,,4500,88456,
2026-06-06,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,600,87856,12 ร้าน
2026-06-08,รับเงิน % ร้านค้าโรงอาหาร,8091,,95947,
2026-06-08,ร้านสวัสดิการโรงเรียน,911,,96858,
2026-06-08,ร้านเกดเอง,216,,97074,
2026-06-08,ร้านน้ำโรงอาหาร,154,,97228,
2026-06-08,ร้านสตรอเบอร์รี่โยเกิร์ต,94,,97322,
2026-06-08,ร้านเจเจ,252,,97574,
2026-06-08,ค่าแรงคนเติมเงิน,,700,96874,
2026-06-08,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,850,96024,17 ร้าน
2026-06-09,รับเงิน % ร้านค้าโรงอาหาร,8654,,104678,
2026-06-09,ร้านสวัสดิการโรงเรียน,934,,105612,
2026-06-09,ร้านเกดเอง,238,,105850,
2026-06-09,ร้านน้ำโรงอาหาร,154,,106004,
2026-06-09,ร้านสตรอเบอร์รี่โยเกิร์ต,102,,106106,
2026-06-09,ร้านเจเจ,299,,106405,
2026-06-09,ค่าแรงคนเติมเงิน,,700,105705,
2026-06-09,นำเข้ารายได้โรงเรียน ร้าน*50 บาท,,900,104805,18 ร้าน`;

const SHOP_TRANSFER_NAME = 'นำเข้ารายได้โรงเรียน ร้าน*50 บาท';

let transactions=parseCSV(CSV_RAW);
let period='week';
let addType='income';
let recKinds=['in'];
let dailySubFilter='all';
let barChart,lineChart,donutChart;

let recurringItems=[
  {id:1,type:'income',name:'รับเงิน % ร้านค้าโรงอาหาร',amount:0,desc:'% ยอดขายรายวันจากร้านค้า'},
  {id:2,type:'income',name:'ร้านสวัสดิการโรงเรียน',amount:0,desc:''},
  {id:3,type:'income',name:'ร้านเกดเอง',amount:0,desc:''},
  {id:4,type:'income',name:'ร้านน้ำโรงอาหาร',amount:0,desc:''},
  {id:5,type:'income',name:'ร้านสตรอเบอร์รี่โยเกิร์ต',amount:0,desc:''},
  {id:6,type:'income',name:'ร้านเจเจ',amount:0,desc:''},
  {id:7,type:'income',name:'ร้านโมโม่ชา',amount:0,desc:''},
  {id:8,type:'expense',name:'ค่าแรงคนเติมเงิน',amount:700,desc:'ทุกวันทำการ'},
  {id:9,type:'expense',name:'ค่าแรงคนทำความสะอาด',amount:6000,desc:'รายสัปดาห์'},
  {id:10,type:'expense',name:SHOP_TRANSFER_NAME,amount:900,desc:'นำส่งโรงเรียน – คำนวณจากจำนวนร้าน × 50',shopCount:true},
];

const fmt=n=>Math.round(n).toLocaleString('th-TH');
const fmtDateShort=d=>new Date(d+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});
const today=()=>new Date().toISOString().split('T')[0];
/* ── สี --chart-N เป็น CSS variable ใช้ตรงๆ กับ Chart.js/Canvas ไม่ได้
   (canvas fillStyle ไม่รู้จัก var(), เงียบๆ fallback เป็นสีดำ — นี่คือสาเหตุที่กราฟ/โดนัทเพี้ยน)
   ต้อง resolve เป็นค่าสีจริงผ่าน getComputedStyle ก่อนเสมอ ── */
function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#64748b';
}
/* แปลง hex → rgba() พร้อม alpha (ใช้ร่วมกับ cssVar() เพื่อให้กราฟดึงสีจาก token กลางได้
   แม้ต้องการความโปร่งใส ซึ่ง CSS var เฉยๆ ทำไม่ได้ตรงๆ) */
function hexToRgba(hex, alpha){
  hex = (hex || '').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(function(ch){ return ch + ch; }).join('');
  var r = parseInt(hex.substring(0,2),16); if (isNaN(r)) r = 100;
  var g = parseInt(hex.substring(2,4),16); if (isNaN(g)) g = 100;
  var b = parseInt(hex.substring(4,6),16); if (isNaN(b)) b = 100;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
const colors=['--chart-1','--chart-2','--chart-3','--chart-4','--chart-5','--chart-6','--chart-7','--chart-8','--chart-9'].map(cssVar);

/* FC_MIGRATE_START */
/* ── โมเดลรายการประจำ v2 ──
   kinds    = แท็กได้หลายอัน ['in','out','school'] (รับ/จ่าย/หักเข้าบัญชีร้านน้ำโรงเรียน)
   defaults = จำนวนเงินปกติ 3 ช่อง {in,out,school} (0 = ไม่แน่นอน) ตรงกับ 3 คอลัมน์ของฟอร์มบันทึกรายวัน
   v1 เดิมมี type:'income'|'expense' + amount ช่องเดียว → migrate เป็น kinds 1 แท็ก + defaults ช่องนั้น
   คงฟิลด์ type/amount ไว้ (sync จากแท็กแรก) เพื่อให้ client เก่าที่ยังแคชอยู่ (sw.js) อ่านต่อได้ */
var FC_KINDS = {
  'in':    {label:'รายรับ',       cls:'badge-in',     legacy:'income'},
  'out':   {label:'รายจ่าย',      cls:'badge-out',    legacy:'expense'},
  'school':{label:'หักบัญชีร้านน้ำ', cls:'badge-school', legacy:'expense'},
  'fc':    {label:'หักบัญชี Food Court', cls:'badge-fc', legacy:'expense'}
};
function withLegacy(r){ var k=r.kinds[0]; r.type=FC_KINDS[k].legacy; r.amount=r.defaults[k]||0; return r; }
function normalizeRecurring(r){
  if(r && r.v===2 && r.defaults && Array.isArray(r.kinds) && r.kinds.length) return r; // migrate แล้ว → คืนอ็อบเจ็กต์เดิม
  var k = r.type==='expense' ? 'out' : 'in';
  var d = {'in':0,'out':0,'school':0,'fc':0}; d[k] = parseFloat(r.amount)||0;
  return withLegacy(Object.assign({}, r, {v:2, kinds:[k], defaults:d}));
}
function dflt(r,k){ return (r.defaults && r.defaults[k]) || 0; }
/* แท็กของแถวธุรกรรม: อ่านจากยอดจริงในแถว → 1 แถวมีได้หลายแท็ก */
function txTags(r){ var t=[]; if(r.income>0)t.push('in'); if(r.expense>0)t.push('out'); if(r.schoolDeduct>0)t.push('school'); if(r.fcDeduct>0)t.push('fc'); return t; }
function tagBadges(ks){
  if(!ks.length) return '<span style="color:var(--text2)">-</span>';
  return '<div class="tag-row">'+ks.map(function(k){return '<span class="badge '+FC_KINDS[k].cls+'">'+FC_KINDS[k].label+'</span>';}).join('')+'</div>';
}
/* FC_MIGRATE_END */

/* FC_STATS_START */
/* ── สถิติมาตรฐาน 5 ตัว: รายรับ / รายจ่าย / หักเข้าบัญชีร้านน้ำโรงเรียน / หักเข้าบัญชี Food Court / สุทธิ
   ทุกแท็บ (แดชบอร์ด, รายงาน สัปดาห์/เดือน/เปรียบเทียบ/ปี) เรียกจากชุดฟังก์ชันนี้ที่เดียว
   สุทธิ = รับ − จ่าย − หักร้านน้ำ − หัก FC (สูตรเดียวกับ recomputeBalance) ── */
function fcSum(rows){
  var o={inc:0,exp:0,school:0,fc:0,net:0};
  rows.forEach(function(t){ o.inc+=t.income||0; o.exp+=t.expense||0; o.school+=t.schoolDeduct||0; o.fc+=t.fcDeduct||0; });
  o.net=o.inc-o.exp-o.school-o.fc; return o;
}
function fcSeries(rows,keys,keyOf){
  var g={}; rows.forEach(function(t){ var k=keyOf(t); (g[k]=g[k]||[]).push(t); });
  var S=keys.map(function(k){ return fcSum(g[k]||[]); });
  var pick=function(f){ return S.map(function(x){ return x[f]; }); };
  return {inc:pick('inc'),exp:pick('exp'),school:pick('school'),fc:pick('fc'),net:pick('net')};
}
function fcTot(S){
  var add=function(a){ return a.reduce(function(x,y){ return x+y; },0); };
  return {inc:add(S.inc),exp:add(S.exp),school:add(S.school),fc:add(S.fc),net:add(S.net)};
}
function fcBarSets(S,radius,order){
  var mk=function(label,data,color,a){ var d={type:'bar',label:label,data:data,backgroundColor:hexToRgba(cssVar(color),a),borderRadius:radius}; if(order) d.order=order; return d; };
  return [mk('รายรับ',S.inc,'--c-green',.75), mk('รายจ่าย',S.exp,'--c-red',.65), mk('หักร้านน้ำโรงเรียน',S.school,'--c-amber',.75), mk('หัก Food Court',S.fc,'--fc-orange',.8)];
}
function fcNetLine(S,radius){
  return {type:'line',label:'สุทธิ',data:S.net,borderColor:cssVar('--chart-1'),backgroundColor:hexToRgba(cssVar('--chart-1'),.08),tension:.3,pointRadius:radius,order:1};
}
function fcChartOpts(xSize){
  return {responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{family:'Sarabun',size:12}}}},scales:{x:{ticks:{font:{family:'Sarabun',size:xSize}}},y:{ticks:{font:{family:'Sarabun',size:10},callback:function(v){ return '฿'+v.toLocaleString(); }}}}};
}
function fcKpiHtml(o,sub){
  sub=sub||{};
  var netCol=o.net>=0?'var(--green)':'var(--red)';
  var cards=[
    ['income','💰','รายรับ',o.inc,'var(--green)',sub.inc],
    ['expense','💸','รายจ่าย',o.exp,'var(--red)',sub.exp],
    ['school','🏫','หักเข้าบัญชีร้านน้ำโรงเรียน',o.school,'var(--amber)',sub.school],
    ['fc','🍽️','หักเข้าบัญชี Food Court',o.fc,'var(--fc-orange)',sub.fc],
    ['balance','🏦','สุทธิ',o.net,netCol,sub.net||(o.net>=0?'✅ กำไร':'⚠️ ขาดทุน')]
  ];
  return cards.map(function(c){
    return '<div class="kpi '+c[0]+'"><div class="kpi-icon">'+c[1]+'</div><div class="kpi-label">'+c[2]+'</div><div class="kpi-value" style="color:'+c[4]+'">฿'+fmt(c[3])+'</div><div class="kpi-sub">'+(c[5]||'&nbsp;')+'</div></div>';
  }).join('');
}
function setFcKpi(id,o,sub){ var el=document.getElementById(id); if(!el) return; el.classList.add('kpi5'); el.innerHTML=fcKpiHtml(o,sub); }
/* ส่วนหัว + แถวของตารางสรุป (สัปดาห์/เดือน) ให้ครบ 5 คอลัมน์ */
function fcTh(first){
  var r='style="text-align:right"';
  return '<th>'+first+'</th><th '+r+'>รายรับ</th><th '+r+'>รายจ่าย</th><th '+r+'>หักร้านน้ำ<br>โรงเรียน</th><th '+r+'>หักบัญชี<br>Food Court</th><th '+r+'>สุทธิ</th>';
}
function fcTds(S,i){
  var z=function(v,cls){ return '<td class="'+cls+'" style="text-align:right">'+(v>0?'฿'+fmt(v):'')+'</td>'; };
  return '<td class="td-in" style="text-align:right">฿'+fmt(S.inc[i])+'</td><td class="td-out" style="text-align:right">฿'+fmt(S.exp[i])+'</td>'+z(S.school[i],'td-school')+z(S.fc[i],'td-fc')+
    '<td style="text-align:right;font-weight:700;color:'+(S.net[i]>=0?'var(--green)':'var(--red)')+'">฿'+fmt(S.net[i])+'</td>';
}
/* FC_STATS_END */

// ── FIRESTORE PERSISTENCE ──
const FC_TX_COLL = 'foodcourt_transactions';
const FC_META_DOC = db.collection('foodcourt_meta').doc('config');

// ── DASHBOARD RECURRING SUMMARY ──
let recPeriod = 'day';

// ── DAILY ENTRY (บันทึกรายวัน) ──
let extraEntryRows={income:[],expense:[]};

let _quickLogRec=null;

// ── ADD MODAL (daily-entry style) ──
let modalExtraRows={income:[],expense:[]};

// ── MONTHLY CHART ──
var monthlyBarChart;
var fcDailySubtabs, fcReportSubtabs, fcManageSubtabs; // handle จาก initSubtabs() — ผูกใน onAuth หลัง renderShell()

// ── AUTH + BOOT ──
var currentUser = null;

/* ══════════════════════ DATA LOADING ══════════════════════ */
/* โหลดข้อมูลจาก Firestore — ถ้ายังไม่เคยมีข้อมูล (ครั้งแรก) จะ seed จาก CSV/ค่าเริ่มต้น แล้วบันทึกขึ้น Firestore */
function loadFoodcourtData(){
  return Promise.all([
    db.collection(FC_TX_COLL).get(),
    FC_META_DOC.get()
  ]).then(function(results){
    var txSnap=results[0], metaSnap=results[1];

    /* txSeeded = เคย seed/รีเซ็ตแล้ว → คอลเลกชันว่างเปล่าต้องหมายถึง "ว่างจริง" ไม่ใช่ "ยังไม่เคยเริ่ม"
       (เดิมเช็คแค่ txSnap.empty ทำให้กดรีเซ็ตแล้วรีโหลด ข้อมูลตัวอย่างถูก seed กลับมาทุกครั้ง) */
    var txSeeded = metaSnap.exists && metaSnap.data().txSeeded;
    if(!txSnap.empty){
      transactions=[];
      txSnap.forEach(function(doc){ transactions.push(doc.data()); });
      if(!txSeeded) FC_META_DOC.set({txSeeded:true},{merge:true}).catch(function(e){console.error('mark seeded',e);});
    } else if(txSeeded){
      transactions=[];
    } else {
      /* ครั้งแรกจริงๆ – seed ข้อมูลตัวอย่างขึ้น Firestore แล้วทำเครื่องหมายไว้ */
      transactions.forEach(function(t){ fcSaveTransaction(t); });
      FC_META_DOC.set({txSeeded:true},{merge:true}).catch(function(e){console.error('mark seeded',e);});
    }

    var fromDb = metaSnap.exists && metaSnap.data().recurringItems && metaSnap.data().recurringItems.length;
    var rawRec = fromDb ? metaSnap.data().recurringItems : recurringItems;
    var recChanged = !fromDb;
    recurringItems = rawRec.map(function(r){ var n=normalizeRecurring(r); if(n!==r) recChanged=true; return n; });
    if(recChanged){
      /* migrate v1→v2: เก็บสำเนาข้อมูลเดิมไว้ที่ recurringItemsBackupV1 (เขียนครั้งเดียว) แล้วบันทึกรูปแบบใหม่ */
      var upd={recurringItems:recurringItems};
      if(fromDb && !metaSnap.data().recurringItemsBackupV1){ upd.recurringItemsBackupV1=rawRec; upd.recurringMigratedAt=new Date().toISOString(); }
      FC_META_DOC.set(upd,{merge:true}).catch(function(e){console.error('migrate recurring',e);});
    }

    recomputeBalance();
    populateMonthFilter();
  }).catch(function(e){
    console.error('โหลดข้อมูล Food Court ไม่สำเร็จ',e);
    showToast('โหลดข้อมูลจาก Firestore ไม่สำเร็จ ใช้ข้อมูลตัวอย่างชั่วคราว','error');
    recomputeBalance();
  });
}

/* ══════════════════════ RENDER ══════════════════════ */
function parseCSV(raw){
  const lines=raw.trim().split('\n');const rows=[];
  for(let i=1;i<lines.length;i++){
    const cols=lines[i].split(',');
    if(cols.length<4) continue;
    rows.push({id:Date.now()+i,date:cols[0].trim(),name:cols[1].trim(),income:parseFloat(cols[2])||0,expense:parseFloat(cols[3])||0,balance:parseFloat(cols[4])||0,note:cols[5]?cols[5].trim():'',recurring:false});
  }
  return rows;
}

function recomputeBalance(){
  const sorted=[...transactions].sort((a,b)=>a.date.localeCompare(b.date)||(a.id-b.id));
  let bal=0;const map={};
  sorted.forEach(t=>{bal+=t.income-t.expense-(t.schoolDeduct||0)-(t.fcDeduct||0);map[t.id]=bal;});
  transactions.forEach(t=>t.balance=map[t.id]||0);
}

// ── DASHBOARD ──
function renderDashboard(){
  const o=fcSum(transactions);
  const days=[...new Set(transactions.map(t=>t.date))].length;
  const incTx=transactions.filter(t=>t.income>0).length;

  const latestDate=[...new Set(transactions.map(t=>t.date))].sort().pop();
  const chip=document.getElementById('lastUpdatedChip');
  if(latestDate){
    document.getElementById('lastUpdated').textContent=fmtDateShort(latestDate);
    chip.style.display='inline-flex';
  } else {
    chip.style.display='none';
  }

  setFcKpi('kpiGrid',o,{inc:incTx+' รายการ, '+days+' วัน · เฉลี่ย ฿'+fmt(days?o.inc/days:0)+'/วัน'});

  renderBarChart();renderLineChart();renderDonut();renderDashboardRecurring();
}

function getFilteredDays(){
  const all=[...new Set(transactions.map(t=>t.date))].sort();
  if(period==='all') return all;
  if(period==='month'){const now=new Date(),m=now.getMonth(),y=now.getFullYear();return all.filter(d=>{const dt=new Date(d+'T00:00:00');return dt.getMonth()===m&&dt.getFullYear()===y;});}
  if(period==='week'){const now=new Date();now.setHours(0,0,0,0);const wStart=new Date(now);wStart.setDate(now.getDate()-now.getDay()+1);return all.filter(d=>new Date(d+'T00:00:00')>=wStart);}
  return all;
}
function setPeriod(p,el){period=p;document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderBarChart();}

function renderBarChart(){
  const days=getFilteredDays();const labels=days.map(fmtDateShort);
  const S=fcSeries(transactions,days,t=>t.date);
  if(barChart) barChart.destroy();
  barChart=new Chart(document.getElementById('barChart'),{type:'bar',data:{labels,datasets:fcBarSets(S,6)},options:fcChartOpts(10)});
}

function renderLineChart(){
  const days=[...new Set(transactions.map(t=>t.date))].sort();const labels=days.map(fmtDateShort);
  const nets=fcSeries(transactions,days,t=>t.date).net;
  if(lineChart) lineChart.destroy();
  lineChart=new Chart(document.getElementById('lineChart'),{type:'line',data:{labels,datasets:[{label:'กำไร/ขาดทุนสุทธิ',data:nets,borderColor:cssVar('--chart-1'),backgroundColor:hexToRgba(cssVar('--chart-1'),.08),fill:true,tension:.35,pointBackgroundColor:cssVar('--chart-1'),pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{family:'Sarabun',size:12}}}},scales:{x:{ticks:{font:{family:'Sarabun',size:9}}},y:{ticks:{font:{family:'Sarabun',size:10},callback:v=>'฿'+v.toLocaleString()}}}}});
}

function renderDonut(){
  const shopMap={};
  transactions.filter(t=>t.income>0).forEach(t=>{shopMap[t.name]=(shopMap[t.name]||0)+t.income;});
  const labels=Object.keys(shopMap);const data=Object.values(shopMap);const bg=labels.map((_,i)=>colors[i%colors.length]);
  if(donutChart) donutChart.destroy();
  donutChart=new Chart(document.getElementById('donutChart'),{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:bg,borderWidth:2,borderColor:'white'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'65%'}});
  document.getElementById('donutLegend').innerHTML=labels.map((l,i)=>`<div class="legend-item"><div class="legend-dot" style="background:${bg[i]}"></div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l}</div><div style="font-size:10px;color:var(--text2)">฿${fmt(data[i])}</div></div></div>`).join('');
}

function setRecPeriod(p, el) {
  recPeriod = p;
  document.querySelectorAll('#recPeriodTabs .ptab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderDashboardRecurring();
}

function getRecPeriodTx() {
  const now = new Date();
  return transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    if (recPeriod === 'day') {
      return t.date === today();
    } else if (recPeriod === 'week') {
      const wStart = new Date(now); wStart.setHours(0,0,0,0);
      wStart.setDate(now.getDate() - now.getDay() + 1);
      return d >= wStart;
    } else if (recPeriod === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else if (recPeriod === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function renderDashboardRecurring() {
  const periodTx = getRecPeriodTx();
  const o = fcSum(periodTx);
  const tiles=[['รายรับ',o.inc,'green'],['รายจ่าย',o.exp,'red'],['หักร้านน้ำโรงเรียน',o.school,'amber'],['หัก Food Court',o.fc,'fc-orange'],['สุทธิ',o.net,o.net>=0?'blue':'red']];
  const tok=c=>c==='fc-orange'?['var(--fc-orange-light)','var(--fc-orange)','var(--fc-orange)']:['var(--'+c+'-light)','var(--'+c+'-mid)','var(--'+c+')'];
  const kpiEl=document.getElementById('recSummaryKpi');
  kpiEl.style.gridTemplateColumns='repeat(auto-fit,minmax(120px,1fr))';
  kpiEl.innerHTML=tiles.map(t=>{const c=tok(t[2]);return `<div style="background:${c[0]};border:1px solid ${c[1]};border-radius:12px;padding:12px 14px"><div style="font-size:10px;font-weight:800;color:${c[2]};letter-spacing:.3px;margin-bottom:6px">${t[0]}</div><div style="font-size:18px;font-weight:800;color:${c[2]}">฿${fmt(t[1])}</div></div>`;}).join('');

  // Group by name
  const incMap = {}, expMap = {};
  periodTx.forEach(t => {
    if (t.income > 0) incMap[t.name] = (incMap[t.name]||0) + t.income;
    if (t.expense > 0) expMap[t.name] = (expMap[t.name]||0) + t.expense;
  });

  const renderSummaryList = (map) => {
    const entries = Object.entries(map).sort((a,b) => b[1]-a[1]);
    if (!entries.length) return '<div style="color:var(--text2);font-size:12px;padding:10px 0">ไม่มีรายการในช่วงนี้</div>';
    return entries.map(([name, amount]) => `
      <div class="rec-item" style="border-left:none;margin-bottom:6px">
        <div style="flex:1;min-width:0">
          <div class="rec-name" style="font-size:12px">${name}</div>
        </div>
        <div style="font-size:13px;font-weight:800;color:var(--text)">฿${fmt(amount)}</div>
      </div>`).join('');
  };

  document.getElementById('dashRecIncome').innerHTML = renderSummaryList(incMap);
  document.getElementById('dashRecExpense').innerHTML = renderSummaryList(expMap);
}

// ── MANAGE ──
function renderManage(){
  const inc=recurringItems.filter(r=>r.kinds[0]==='in');   // จัดกลุ่มตามแท็กแรก; แท็กทั้งหมดโชว์ในการ์ด
  const exp=recurringItems.filter(r=>r.kinds[0]!=='in');
  document.getElementById('manageRecIncome').innerHTML=inc.length
    ? inc.map(r=>manageRecCard(r)).join('')
    : '<div style="color:var(--text2);font-size:12px;padding:10px 0">ไม่มีรายการ</div>';
  document.getElementById('manageRecExpense').innerHTML=exp.length
    ? exp.map(r=>manageRecCard(r)).join('')
    : '<div style="color:var(--text2);font-size:12px;padding:10px 0">ไม่มีรายการ</div>';
}

function manageRecCard(r){
  const ks=r.kinds, d=r.defaults||{};
  const amtLabel=r.shopCount?'คำนวณจากจำนวนร้าน':ks.map(k=>FC_KINDS[k].label+' '+(d[k]>0?'฿'+fmt(d[k])+'/ครั้ง':'ไม่แน่นอน')).join(' · ');
  return `<div class="manage-rec-card ${r.type}-type">
    <div style="font-size:22px;flex-shrink:0">${ks[0]==='in'?'💰':ks[0]==='out'?'💸':'🏦'}</div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:800;font-size:13px;margin-bottom:3px">${r.name}</div>
      <div style="margin-bottom:4px">${tagBadges(ks)}</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:6px">${amtLabel}${r.desc?' · '+r.desc:''}</div>
      <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="deleteRec(${r.id})">🗑 ลบ</button>
    </div>
  </div>`;
}

function renderDailyEntry(){
  if(!document.getElementById('entryDate').value) document.getElementById('entryDate').value=today();

  document.getElementById('entryRecAll').innerHTML=recurringItems.length
    ? recurringItems.map(r=>entryRow(r)).join('')
    : '<div style="color:var(--text2);font-size:12px">ไม่มีรายการ</div>';

  renderExtraEntryRows('income');
  renderExtraEntryRows('expense');
  updateEntrySumBar();
}

function entryRow(r){
  if(r.shopCount){
    return `<div class="rec-entry-row">
      <div class="rec-entry-name">${r.name}</div>
      <div class="shop-count-wrap" style="margin-left:0">
        <input class="shop-count-input" type="number" id="entryShopCount-${r.id}" min="0" placeholder="ร้าน" oninput="updateEntrySumBar()">
        <span style="font-size:11px;color:var(--text2)">ร้าน × 50</span>
      </div>
    </div>`;
  }
  return `<div class="rec-entry-row">
    <div class="rec-entry-name">${r.name}</div>
    <input type="number" class="rec-entry-input in" id="entryAmtIn-${r.id}" min="0" placeholder="${dflt(r,'in')}" oninput="updateEntrySumBar()">
    <input type="number" class="rec-entry-input out" id="entryAmtOut-${r.id}" min="0" placeholder="${dflt(r,'out')}" oninput="updateEntrySumBar()">
    <input type="number" class="rec-entry-input school" id="entryAmtSchool-${r.id}" min="0" placeholder="${dflt(r,'school')}" oninput="updateEntrySumBar()">
    <input type="number" class="rec-entry-input fc" id="entryAmtFc-${r.id}" min="0" placeholder="${dflt(r,'fc')}" oninput="updateEntrySumBar()">
  </div>`;
}
function renderExtraEntryRows(type){
  const wrap=document.getElementById(type==='income'?'entryExtraIncome':'entryExtraExpense');
  wrap.innerHTML=extraEntryRows[type].length ? extraEntryRows[type].map(r=>`
    <div style="display:flex;align-items:center;gap:var(--gap-tight)">
      <input type="text" placeholder="ชื่อรายการ..." style="flex:1" id="entryExtraName-${r.id}" value="${r.name}">
      <input type="number" min="0" placeholder="0" style="width:120px;text-align:right" id="entryExtraAmt-${r.id}" value="${r.amount}" oninput="updateEntrySumBar()">
      <span style="font-size:14px;font-weight:800;color:var(--text2)">฿</span>
      <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="removeExtraEntryRow('${type}',${r.id})">✕</button>
    </div>`).join('') : '';
}

function renderModalEntryRows(){
  document.getElementById('modalEntryRecAll').innerHTML=recurringItems.length
    ? recurringItems.map(r=>modalEntryRow(r)).join('')
    : '<div style="color:var(--text2);font-size:12px">ไม่มีรายการ</div>';
  renderModalExtraRows('income');
  renderModalExtraRows('expense');
  updateModalSumBar();
}

function modalEntryRow(r){
  if(r.shopCount){
    return `<div class="rec-entry-row">
      <div class="rec-entry-name">${r.name}</div>
      <div class="shop-count-wrap" style="margin-left:0">
        <input class="shop-count-input" type="number" id="mEntryShopCount-${r.id}" min="0" placeholder="ร้าน" oninput="updateModalSumBar()">
        <span style="font-size:11px;color:var(--text2)">ร้าน × 50</span>
      </div>
    </div>`;
  }
  return `<div class="rec-entry-row">
    <div class="rec-entry-name">${r.name}</div>
    <input type="number" class="rec-entry-input in" id="mEntryAmtIn-${r.id}" min="0" placeholder="${dflt(r,'in')}" oninput="updateModalSumBar()">
    <input type="number" class="rec-entry-input out" id="mEntryAmtOut-${r.id}" min="0" placeholder="${dflt(r,'out')}" oninput="updateModalSumBar()">
    <input type="number" class="rec-entry-input school" id="mEntryAmtSchool-${r.id}" min="0" placeholder="${dflt(r,'school')}" oninput="updateModalSumBar()">
    <input type="number" class="rec-entry-input fc" id="mEntryAmtFc-${r.id}" min="0" placeholder="${dflt(r,'fc')}" oninput="updateModalSumBar()">
  </div>`;
}
function renderModalExtraRows(type){
  const wrap=document.getElementById(type==='income'?'modalExtraIncome':'modalExtraExpense');
  wrap.innerHTML=modalExtraRows[type].map(r=>`
    <div style="display:flex;align-items:center;gap:var(--gap-tight)">
      <input type="text" placeholder="ชื่อรายการ..." style="flex:1" id="mExtraName-${r.id}" value="${r.name}">
      <input type="number" min="0" placeholder="0" style="width:110px;text-align:right" id="mExtraAmt-${r.id}" value="${r.amount}" oninput="updateModalSumBar()">
      <span style="font-size:13px;font-weight:800;color:var(--text2)">฿</span>
      <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="removeModalExtraRow('${type}',${r.id})">✕</button>
    </div>`).join('');
}

// ── RECURRING MANAGE (add/delete) ──
function toggleRecKind(k){
  recKinds = recKinds.includes(k) ? recKinds.filter(x=>x!==k) : recKinds.concat(k);
  syncRecKindCards();
}
function syncRecKindCards(){
  [['in','recCardIn','income'],['out','recCardOut','expense'],['school','recCardSchool','school'],['fc','recCardFc','fc']].forEach(([k,id,cls])=>{
    document.getElementById(id).className='modal-type-card '+cls+(recKinds.includes(k)?' active':'');
  });
}
function renderMonthlyChart(month){
  const wrap = document.getElementById('monthlyChartWrap');
  if(!month){ wrap.style.display='none'; if(monthlyBarChart){monthlyBarChart.destroy();monthlyBarChart=null;} return; }

  const rows = transactions.filter(t=>t.date.startsWith(month));
  if(!rows.length){ wrap.style.display='none'; return; }
  wrap.style.display='block';

  // ชื่อเดือนสำหรับ title
  const [y,mo]=month.split('-');
  const mLabel=new Date(parseInt(y),parseInt(mo)-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
  document.getElementById('monthlyChartTitle').textContent='สรุป '+mLabel;

  // KPI
  const o=fcSum(rows);
  document.getElementById('monthlyChartKpi').innerHTML=[['รับ',o.inc,'var(--green)'],['จ่าย',o.exp,'var(--red)'],['หักร้านน้ำ',o.school,'var(--amber)'],['หัก Food Court',o.fc,'var(--fc-orange)'],['สุทธิ',o.net,o.net>=0?'var(--blue)':'var(--red)']].map(x=>`<span style="font-weight:800;color:${x[2]}">${x[0]} ฿${fmt(x[1])}</span>`).join('<span style="color:var(--text2)">|</span>');

  // Group by date
  const days=[...new Set(rows.map(t=>t.date))].sort();
  const labels=days.map(fmtDateShort);
  const S=fcSeries(rows,days,t=>t.date);

  if(monthlyBarChart) monthlyBarChart.destroy();
  monthlyBarChart=new Chart(document.getElementById('monthlyBarChart'),{type:'bar',data:{labels,datasets:fcBarSets(S,5)},options:fcChartOpts(9)});
}

// ── DAILY ──
function renderDaily(){
  const filterMonth=document.getElementById('filterMonth').value;
  renderMonthlyChart(filterMonth);
  const filterSearch=document.getElementById('filterSearch').value.toLowerCase();
  let rows=[...transactions].sort((a,b)=>b.date.localeCompare(a.date)||(b.id-a.id));
  if(filterMonth) rows=rows.filter(r=>r.date.startsWith(filterMonth));
  if(dailySubFilter==='income') rows=rows.filter(r=>r.income>0);
  if(dailySubFilter==='expense') rows=rows.filter(r=>r.expense>0);
  if(filterSearch) rows=rows.filter(r=>r.name.toLowerCase().includes(filterSearch)||r.note.toLowerCase().includes(filterSearch));

  const totalIn=rows.reduce((s,r)=>s+r.income,0);
  const totalOut=rows.reduce((s,r)=>s+r.expense,0);
  const totalSchool=rows.reduce((s,r)=>s+(r.schoolDeduct||0),0);
  const totalFc=rows.reduce((s,r)=>s+(r.fcDeduct||0),0);
  const net=totalIn-totalOut-totalSchool-totalFc;
  document.getElementById('sumBar').innerHTML=`
    <div class="sum-item"><div class="sum-label">รายรับ</div><div class="sum-val" style="color:var(--green)">฿${fmt(totalIn)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">รายจ่าย</div><div class="sum-val" style="color:var(--red)">฿${fmt(totalOut)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">หักเข้าบัญชีร้านน้ำโรงเรียน</div><div class="sum-val" style="color:var(--amber)">฿${fmt(totalSchool)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">หักเข้าบัญชี Food Court</div><div class="sum-val" style="color:var(--fc-orange)">฿${fmt(totalFc)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">สุทธิ</div><div class="sum-val" style="color:${net>=0?'var(--green)':'var(--red)'}">฿${fmt(net)}</div></div>
    <div style="margin-left:auto;font-size:11px;color:var(--text2)">${rows.length} รายการ</div>
  `;

  if(!rows.length){document.getElementById('dailyList').innerHTML=`<div class="empty"><div class="empty-icon">📭</div><div>ไม่พบรายการ</div></div>`;return;}

  const byDate={};rows.forEach(r=>{(byDate[r.date]=byDate[r.date]||[]).push(r);});
  const dates=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));

  document.getElementById('dailyList').innerHTML=dates.map(date=>{
    const items=byDate[date];
    const dayIn=items.reduce((s,i)=>s+i.income,0);const dayOut=items.reduce((s,i)=>s+i.expense,0);
    const daySchool=items.reduce((s,i)=>s+(i.schoolDeduct||0),0);
    const dayFc=items.reduce((s,i)=>s+(i.fcDeduct||0),0);
    return `<div class="day-section">
      <div class="day-header">
        <div class="day-title">${fmtDateShort(date)}</div>
        <div class="day-stats">
          <span class="day-in">+฿${fmt(dayIn)}</span>
          <span class="day-out">-฿${fmt(dayOut)}</span>
          <span style="color:var(--amber);font-weight:700">หักเข้าบัญชีร้านน้ำโรงเรียน ฿${fmt(daySchool)}</span>
          <span style="color:var(--fc-orange);font-weight:700">หักเข้าบัญชี Food Court ฿${fmt(dayFc)}</span>
        </div>
      </div>
      <div class="tbl-wrap">
        <table><thead><tr>
          <th>รายการ</th><th>ประเภท</th>
          <th style="text-align:right">รายรับ</th><th style="text-align:right">รายจ่าย</th><th style="text-align:right">หักเข้าบัญชี<br>ร้านน้ำโรงเรียน</th><th style="text-align:right">หักเข้าบัญชี<br>Food Court</th>
          <th>หมายเหตุ</th><th></th>
        </tr></thead><tbody>
          ${items.map(r=>`<tr>
            <td style="font-weight:600">${r.name}${r.name===SHOP_TRANSFER_NAME&&r.note?` <span class="amount-highlight">${r.note}</span>`:''}</td>
            <td>${tagBadges(txTags(r))}</td>
            <td class="td-in" style="text-align:right">${r.income>0?'฿'+fmt(r.income):''}</td>
            <td class="td-out" style="text-align:right">${r.expense>0?'฿'+fmt(r.expense):''}</td>
            <td class="td-school" style="text-align:right">${r.schoolDeduct>0?'฿'+fmt(r.schoolDeduct):''}</td>
            <td class="td-fc" style="text-align:right">${r.fcDeduct>0?'฿'+fmt(r.fcDeduct):''}</td>
            <td style="color:var(--text2);font-size:12px">${r.note&&r.name!==SHOP_TRANSFER_NAME?r.note:r.name===SHOP_TRANSFER_NAME?'':'-'}</td>
            <td><button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="deleteRow(${r.id})">ลบ</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
  }).join('');
}
// ── REPORT (รายงาน) ──
let rptWeekRange=8;
let rptWeekChart,rptMonthChart,rptMonthDonut,rptCompareChart,rptYearChart;

function onFcReportSubtabChange(panel){
  if(panel==='week') renderReportWeek();
  if(panel==='month') renderReportMonth();
  if(panel==='compare') renderReportCompare();
  if(panel==='year') renderReportYear();
}

function renderReportAll(){
  populateReportSelectors();
  renderReportWeek();
}

/* หาเลขสัปดาห์ ISO-like: จันทร์เป็นวันแรกของสัปดาห์ */
function _weekStart(d){const dt=new Date(d+'T00:00:00');const day=(dt.getDay()+6)%7;dt.setDate(dt.getDate()-day);return dt.toISOString().split('T')[0];}
function _weekLabel(wStart){const s=new Date(wStart+'T00:00:00');const e=new Date(s);e.setDate(s.getDate()+6);
  return s.toLocaleDateString('th-TH',{day:'numeric',month:'short'})+' – '+e.toLocaleDateString('th-TH',{day:'numeric',month:'short'});}

function setRptWeekRange(n,el){
  rptWeekRange=n;
  document.querySelectorAll('#rptWeekNav .ptab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  renderReportWeek();
}

function populateReportSelectors(){
  const months=[...new Set(transactions.map(t=>t.date.slice(0,7)))].sort();
  const monthSel=document.getElementById('rptMonthSelect');
  const curMonth=monthSel.value;
  monthSel.innerHTML=months.map(m=>{const d=new Date(m+'-01T00:00:00');return `<option value="${m}">${d.toLocaleDateString('th-TH',{month:'long',year:'numeric'})}</option>`;}).join('');
  if(months.length) monthSel.value=months.includes(curMonth)?curMonth:months[months.length-1];

  const years=[...new Set(transactions.map(t=>t.date.slice(0,4)))].sort();
  const yearSel=document.getElementById('rptYearSelect');
  const curYear=yearSel.value;
  yearSel.innerHTML=years.map(y=>`<option value="${y}">ปี ${y}</option>`).join('');
  if(years.length) yearSel.value=years.includes(curYear)?curYear:years[years.length-1];
}

/* ── รายสัปดาห์ ── */
function renderReportWeek(){
  const weeks=[...new Set(transactions.map(t=>_weekStart(t.date)))].sort().slice(-rptWeekRange);
  const labels=weeks.map(_weekLabel);
  const S=fcSeries(transactions,weeks,t=>_weekStart(t.date));
  const tot=fcTot(S);
  const bestWeekIdx=S.net.length?S.net.indexOf(Math.max(...S.net)):-1;
  setFcKpi('rptWeekKpi',tot,{inc:weeks.length+' สัปดาห์ · เฉลี่ย ฿'+fmt(weeks.length?tot.inc/weeks.length:0)+'/สัปดาห์',net:bestWeekIdx>=0?'สัปดาห์ดีสุด: '+labels[bestWeekIdx]:''});

  if(rptWeekChart) rptWeekChart.destroy();
  rptWeekChart=new Chart(document.getElementById('rptWeekChart'),{type:'bar',data:{labels,datasets:fcBarSets(S,6,2).concat([fcNetLine(S,3)])},options:fcChartOpts(10)});

  document.getElementById('rptWeekTable').innerHTML=`<table><thead><tr>${fcTh('สัปดาห์')}</tr></thead><tbody>
      ${weeks.map((w,i)=>`<tr><td style="font-weight:600">${labels[i]}</td>${fcTds(S,i)}</tr>`).reverse().join('')}
    </tbody></table>`;
}

/* ── รายเดือน ── */
function renderReportMonth(){
  const month=document.getElementById('rptMonthSelect').value;
  if(!month) return;
  const rows=transactions.filter(t=>t.date.startsWith(month));
  const days=[...new Set(rows.map(t=>t.date))].sort();
  const labels=days.map(fmtDateShort);
  const S=fcSeries(rows,days,t=>t.date);
  const o=fcSum(rows);
  setFcKpi('rptMonthKpi',o,{inc:days.length+' วันที่มีรายการ · เฉลี่ย ฿'+fmt(days.length?o.inc/days.length:0)+'/วัน'});

  if(rptMonthChart) rptMonthChart.destroy();
  rptMonthChart=new Chart(document.getElementById('rptMonthChart'),{type:'bar',data:{labels,datasets:fcBarSets(S,6).concat([fcNetLine(S,3)])},options:fcChartOpts(9)});

  const shopMap={};
  rows.filter(t=>t.income>0).forEach(t=>{shopMap[t.name]=(shopMap[t.name]||0)+t.income;});
  const slabels=Object.keys(shopMap);const sdata=Object.values(shopMap);const bg=slabels.map((_,i)=>colors[i%colors.length]);
  if(rptMonthDonut) rptMonthDonut.destroy();
  rptMonthDonut=new Chart(document.getElementById('rptMonthDonut'),{type:'doughnut',data:{labels:slabels,datasets:[{data:sdata,backgroundColor:bg,borderWidth:2,borderColor:'white'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'65%'}});
  document.getElementById('rptMonthLegend').innerHTML=slabels.map((l,i)=>`<div class="legend-item"><div class="legend-dot" style="background:${bg[i]}"></div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l}</div><div style="font-size:10px;color:var(--text2)">฿${fmt(sdata[i])}</div></div></div>`).join('');
}

/* ── เปรียบเทียบรายเดือน ── */
function renderReportCompare(){
  const months=[...new Set(transactions.map(t=>t.date.slice(0,7)))].sort();
  const labels=months.map(m=>{const d=new Date(m+'-01T00:00:00');return d.toLocaleDateString('th-TH',{month:'short',year:'2-digit'});});
  const S=fcSeries(transactions,months,t=>t.date.slice(0,7));
  const nets=S.net;

  const bestIdx=nets.length?nets.indexOf(Math.max(...nets)):-1;
  const worstIdx=nets.length?nets.indexOf(Math.min(...nets)):-1;
  const avgNet=nets.length?nets.reduce((a,b)=>a+b,0)/nets.length:0;
  let momChange='-';
  if(nets.length>=2){
    const prev=nets[nets.length-2],cur=nets[nets.length-1];
    const pct=prev!==0?((cur-prev)/Math.abs(prev)*100):0;
    momChange=(pct>=0?'+':'')+pct.toFixed(1)+'% เทียบเดือนก่อน';
  }

  document.getElementById('rptCompareKpi').innerHTML=`
    <div class="kpi balance"><div class="kpi-icon">🏆</div><div class="kpi-label">เดือนดีที่สุด</div><div class="kpi-value" style="font-size:18px">${bestIdx>=0?labels[bestIdx]:'-'}</div><div class="kpi-sub">${bestIdx>=0?'สุทธิ ฿'+fmt(nets[bestIdx]):''}</div></div>
    <div class="kpi expense"><div class="kpi-icon">📉</div><div class="kpi-label">เดือนต่ำที่สุด</div><div class="kpi-value" style="font-size:18px">${worstIdx>=0?labels[worstIdx]:'-'}</div><div class="kpi-sub">${worstIdx>=0?'สุทธิ ฿'+fmt(nets[worstIdx]):''}</div></div>
    <div class="kpi avg"><div class="kpi-icon">📊</div><div class="kpi-label">เฉลี่ยสุทธิ/เดือน</div><div class="kpi-value">฿${fmt(avgNet)}</div></div>
    <div class="kpi income"><div class="kpi-icon">📈</div><div class="kpi-label">แนวโน้มล่าสุด</div><div class="kpi-value" style="font-size:16px">${momChange}</div></div>
  `;

  if(rptCompareChart) rptCompareChart.destroy();
  rptCompareChart=new Chart(document.getElementById('rptCompareChart'),{type:'bar',data:{labels,datasets:fcBarSets(S,6,2).concat([fcNetLine(S,4)])},options:fcChartOpts(10)});

  document.getElementById('rptCompareTable').innerHTML=`<table><thead><tr>${fcTh('เดือน')}</tr></thead><tbody>
      ${months.map((m,i)=>`<tr><td style="font-weight:600">${labels[i]}</td>${fcTds(S,i)}</tr>`).reverse().join('')}
    </tbody></table>`;
}

/* ── รายปี ── */
function renderReportYear(){
  const year=document.getElementById('rptYearSelect').value;
  if(!year) return;
  const rows=transactions.filter(t=>t.date.startsWith(year));
  const monthNames=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const S=fcSeries(rows,monthNames.map((_,i)=>i),t=>parseInt(t.date.slice(5,7),10)-1);
  const o=fcSum(rows);
  const activeMonths=monthNames.filter((_,i)=>S.inc[i]>0||S.exp[i]>0||S.school[i]>0||S.fc[i]>0).length;
  setFcKpi('rptYearKpi',o,{inc:activeMonths+' เดือนที่มีข้อมูล · เฉลี่ย ฿'+fmt(activeMonths?o.inc/activeMonths:0)+'/เดือน'});

  if(rptYearChart) rptYearChart.destroy();
  rptYearChart=new Chart(document.getElementById('rptYearChart'),{type:'bar',data:{labels:monthNames,datasets:fcBarSets(S,6,2).concat([fcNetLine(S,3)])},options:fcChartOpts(11)});
}

function scrollToTopContent() {
  var content = document.getElementById('pageContent');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderShell() {
  return document.getElementById('foodcourtShell').innerHTML;
}

/* ══════════════════════ EVENT HANDLERS ══════════════════════ */
function fcSaveTransaction(t){
  db.collection(FC_TX_COLL).doc(String(t.id)).set(t).catch(function(e){console.error('save tx',e);});
}
function fcDeleteTransaction(id){
  db.collection(FC_TX_COLL).doc(String(id)).delete().catch(function(e){console.error('delete tx',e);});
}
/* รีเซ็ตระบบ: ลบ "รายการที่บันทึกแล้วทั้งหมด" (ธุรกรรมรายวัน + รายการประจำที่ล็อกไว้)
   แต่ไม่แตะ "รายการประจำ" (recurringItems / ชื่อร้าน / รายจ่ายประจำที่ตั้งค่าไว้ใน FC_META_DOC) */
function resetAllTransactions(){
  if(!confirm('⚠️ ลบรายการที่บันทึกไว้ทั้งหมด ระบบจะเหมือนเริ่มต้นใหม่\n\n(รายการประจำ เช่น ชื่อร้าน/รายรับ-รายจ่ายประจำที่ตั้งค่าไว้ จะยังอยู่ ไม่ถูกลบ)\n\nการกระทำนี้กู้คืนไม่ได้ ยืนยันหรือไม่?')) return;
  if(!confirm('ยืนยันอีกครั้ง: ต้องการลบรายการที่บันทึกไว้ทั้งหมดจริงหรือไม่?')) return;

  db.collection(FC_TX_COLL).get().then(function(snap){
    /* batch ลบได้ไม่เกิน 500 รายการ/ครั้ง → แบ่งชุดละ 400 */
    const refs=[]; snap.forEach(function(d){ refs.push(d.ref); });
    let chain=Promise.resolve();
    for(let i=0;i<refs.length;i+=400){
      (function(chunk){ chain=chain.then(function(){ const b=db.batch(); chunk.forEach(function(r){ b.delete(r); }); return b.commit(); }); })(refs.slice(i,i+400));
    }
    /* ทำเครื่องหมายว่ารีเซ็ตแล้ว เพื่อกันการ seed ข้อมูลตัวอย่างกลับมาตอนโหลดหน้าใหม่ */
    return chain.then(function(){ return FC_META_DOC.set({txSeeded:true},{merge:true}); });
  }).then(function(){
    transactions=[];
    recomputeBalance();
    populateMonthFilter();
    renderDashboard();
    if(typeof renderDaily==='function') renderDaily();
    if(typeof renderDailyEntry==='function') renderDailyEntry();
    showToast('รีเซ็ตระบบแล้ว รายการทั้งหมดถูกลบ');
  }).catch(function(e){
    console.error('reset ไม่สำเร็จ',e);
    showToast('รีเซ็ตไม่สำเร็จ กรุณาลองใหม่','error');
  });
}

function fcSaveRecurring(){
  FC_META_DOC.set({recurringItems:recurringItems},{merge:true}).catch(function(e){console.error('save recurring',e);});
}

// ── SIDEBAR + TABS ──
function switchTab(id,el){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  document.querySelectorAll('.content-area .sub-tab-bar .sub-tab').forEach(b=>b.classList.remove('active'));
  const tabBtn=el||document.getElementById('sb-'+id);
  if(tabBtn) tabBtn.classList.add('active');
  if(id==='dashboard') renderDashboard();
  if(id==='daily') renderDaily();
  if(id==='report') renderReportAll();
  if(id==='manage'){ renderManage(); renderDailyEntry(); }
}

function onFcDailySubtabChange(tab){
  dailySubFilter=tab;
  renderDaily();
}

function onFcManageSubtabChange(panel){
  if(panel==='recurring') renderManage();
  if(panel==='entry') renderDailyEntry();
}

/* ปุ่ม "เพิ่มรายการ" → ไปที่จัดการรายการ → บันทึกรายวัน */
function goToDailyEntry(){
  switchTab('manage',document.getElementById('sb-manage'));
  fcManageSubtabs.activate('entry');
}

function addExtraEntryRow(type){
  extraEntryRows[type].push({id:Date.now()+Math.random(),name:'',amount:''});
  renderExtraEntryRows(type);
  updateEntrySumBar();
}
function removeExtraEntryRow(type,id){
  extraEntryRows[type]=extraEntryRows[type].filter(r=>r.id!==id);
  renderExtraEntryRows(type);
  updateEntrySumBar();
}

function updateEntrySumBar(){
  let totalIn=0,totalOut=0,totalSchool=0,totalFc=0;
  recurringItems.forEach(r=>{
    if(r.shopCount){
      const c=parseInt(document.getElementById('entryShopCount-'+r.id)?.value)||0;
      totalOut+=c*50;
    } else {
      totalIn+=parseFloat(document.getElementById('entryAmtIn-'+r.id)?.value)||0;
      totalOut+=parseFloat(document.getElementById('entryAmtOut-'+r.id)?.value)||0;
      totalSchool+=parseFloat(document.getElementById('entryAmtSchool-'+r.id)?.value)||0;
      totalFc+=parseFloat(document.getElementById('entryAmtFc-'+r.id)?.value)||0;
    }
  });
  extraEntryRows.income.forEach(r=>{totalIn+=parseFloat(document.getElementById('entryExtraAmt-'+r.id)?.value)||0;});
  extraEntryRows.expense.forEach(r=>{totalOut+=parseFloat(document.getElementById('entryExtraAmt-'+r.id)?.value)||0;});
  const net=totalIn-totalOut-totalSchool-totalFc;
  document.getElementById('entrySumBar').innerHTML=`
    <div class="sum-item"><div class="sum-label">รายรับ</div><div class="sum-val" style="color:var(--green)">฿${fmt(totalIn)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">รายจ่าย</div><div class="sum-val" style="color:var(--red)">฿${fmt(totalOut)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">หักเข้าบัญชีร้านน้ำโรงเรียน</div><div class="sum-val" style="color:var(--amber)">฿${fmt(totalSchool)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">หักเข้าบัญชี Food Court</div><div class="sum-val" style="color:var(--fc-orange)">฿${fmt(totalFc)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">สุทธิ</div><div class="sum-val" style="color:${net>=0?'var(--green)':'var(--red)'}">฿${fmt(net)}</div></div>
  `;
}

function saveDailyEntry(){
  const date=document.getElementById('entryDate').value;
  if(!date){showToast('กรุณาเลือกวันที่','error');return;}
  let count=0;
  let newTx=[];

  recurringItems.forEach(r=>{
    if(r.shopCount){
      const c=parseInt(document.getElementById('entryShopCount-'+r.id)?.value)||0;
      if(c>0){
        const t={id:Date.now()+Math.random(),date,name:r.name,income:0,expense:c*50,balance:0,note:c+' ร้าน',recurring:true};
        transactions.push(t);newTx.push(t);count++;
      }
    } else {
      const vin=parseFloat(document.getElementById('entryAmtIn-'+r.id)?.value)||0;
      const vout=parseFloat(document.getElementById('entryAmtOut-'+r.id)?.value)||0;
      const vschool=parseFloat(document.getElementById('entryAmtSchool-'+r.id)?.value)||0;
      const vfc=parseFloat(document.getElementById('entryAmtFc-'+r.id)?.value)||0;
      if(vin>0||vout>0||vschool>0||vfc>0){
        const t={id:Date.now()+Math.random(),date,name:r.name,income:vin,expense:vout,schoolDeduct:vschool,fcDeduct:vfc,balance:0,note:'',recurring:true};
        transactions.push(t);newTx.push(t);count++;
      }
    }
  });

  ['income','expense'].forEach(type=>{
    extraEntryRows[type].forEach(r=>{
      const name=(document.getElementById('entryExtraName-'+r.id)?.value||'').trim();
      const amount=parseFloat(document.getElementById('entryExtraAmt-'+r.id)?.value)||0;
      if(name&&amount>0){
        const t={id:Date.now()+Math.random(),date,name,income:type==='income'?amount:0,expense:type==='expense'?amount:0,balance:0,note:'',recurring:false};
        transactions.push(t);newTx.push(t);count++;
      }
    });
  });

  if(!count){showToast('ไม่มีรายการที่จะบันทึก','error');return;}

  recomputeBalance();
  newTx.forEach(t=>fcSaveTransaction(t));
  extraEntryRows={income:[],expense:[]};
  populateMonthFilter();
  renderDailyEntry();
  renderDashboard();
  showToast('บันทึกรายวันแล้ว '+count+' รายการ');
}
function openQuickLog(recId){
  _quickLogRec=recurringItems.find(r=>r.id===recId);if(!_quickLogRec) return;
  document.getElementById('quickLogTitle').textContent='📝 '+_quickLogRec.name;
  document.getElementById('quickLogTypeBadge').innerHTML=`<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:${_quickLogRec.type==='income'?'var(--green-lt)':'var(--red-lt)'};color:${_quickLogRec.type==='income'?'var(--green)':'var(--red)'}">${_quickLogRec.type==='income'?'รายรับ':'รายจ่าย'}</span>`;
  document.getElementById('quickLogDate').value=today();
  document.getElementById('quickLogAmount').value=_quickLogRec.amount||'';
  document.getElementById('quickLogNote').value='';
  document.getElementById('quickLogModal').classList.add('open');
}
function closeQuickLogModal(){document.getElementById('quickLogModal').classList.remove('open');}
function saveQuickLog(){
  if(!_quickLogRec) return;
  const date=document.getElementById('quickLogDate').value;
  const amount=parseFloat(document.getElementById('quickLogAmount').value)||0;
  const note=document.getElementById('quickLogNote').value.trim();
  if(!date||!amount){showToast('กรุณากรอกข้อมูลให้ครบ','error');return;}
  const isIncome=_quickLogRec.type==='income';
  const t={id:Date.now(),date,name:_quickLogRec.name,income:isIncome?amount:0,expense:isIncome?0:amount,balance:0,note,recurring:true};
  transactions.push(t);
  recomputeBalance();fcSaveTransaction(t);closeQuickLogModal();renderDashboard();
  showToast('บันทึก "'+_quickLogRec.name+'" แล้ว');
}

// ── SHOP COUNT MODAL ──
function openShopCountModalFromRec(recId){
  const input=document.getElementById('shopCount-'+recId);
  const prefilledCount=input?(parseInt(input.value)||0):0;
  document.getElementById('shopCountDate').value=today();
  document.getElementById('shopCountNum').value=prefilledCount||'';
  document.getElementById('shopCountNote').value='';
  updateShopPreview();document.getElementById('shopCountModal').classList.add('open');
}
function closeShopCountModal(){document.getElementById('shopCountModal').classList.remove('open');}
function updateShopPreview(){
  const count=parseInt(document.getElementById('shopCountNum').value)||0;const amount=count*50;
  document.getElementById('shopPreview').innerHTML=`<div class="preview-amount">฿${fmt(amount)}</div><div class="preview-label">= ${count} ร้าน × 50 บาท</div>`;
}
function saveShopCount(){
  const date=document.getElementById('shopCountDate').value;
  const count=parseInt(document.getElementById('shopCountNum').value)||0;
  const note=document.getElementById('shopCountNote').value.trim();
  if(!date){showToast('กรุณาเลือกวันที่','error');return;}
  if(!count){showToast('กรุณาใส่จำนวนร้าน','error');return;}
  const amount=count*50;
  const t={id:Date.now(),date,name:SHOP_TRANSFER_NAME,income:0,expense:amount,balance:0,note:(note||count+' ร้าน'),recurring:true};
  transactions.push(t);
  recomputeBalance();fcSaveTransaction(t);closeShopCountModal();renderDashboard();
  showToast('บันทึกแล้ว: '+count+' ร้าน = ฿'+fmt(amount));
}

function openAddModal(){
  document.getElementById('addDate').value=today();
  modalExtraRows={income:[],expense:[]};
  renderModalEntryRows();
  document.getElementById('addModal').classList.add('open');
}
function closeAddModal(){document.getElementById('addModal').classList.remove('open');}

function addModalExtraRow(type){
  modalExtraRows[type].push({id:Date.now()+Math.random(),name:'',amount:''});
  renderModalExtraRows(type);
  updateModalSumBar();
}
function removeModalExtraRow(type,id){
  modalExtraRows[type]=modalExtraRows[type].filter(r=>r.id!==id);
  renderModalExtraRows(type);
  updateModalSumBar();
}

function updateModalSumBar(){
  let totalIn=0,totalOut=0,totalSchool=0,totalFc=0;
  recurringItems.forEach(r=>{
    if(r.shopCount){
      const c=parseInt(document.getElementById('mEntryShopCount-'+r.id)?.value)||0;
      totalOut+=c*50;
    } else {
      totalIn+=parseFloat(document.getElementById('mEntryAmtIn-'+r.id)?.value)||0;
      totalOut+=parseFloat(document.getElementById('mEntryAmtOut-'+r.id)?.value)||0;
      totalSchool+=parseFloat(document.getElementById('mEntryAmtSchool-'+r.id)?.value)||0;
      totalFc+=parseFloat(document.getElementById('mEntryAmtFc-'+r.id)?.value)||0;
    }
  });
  modalExtraRows.income.forEach(r=>{totalIn+=parseFloat(document.getElementById('mExtraAmt-'+r.id)?.value)||0;});
  modalExtraRows.expense.forEach(r=>{totalOut+=parseFloat(document.getElementById('mExtraAmt-'+r.id)?.value)||0;});
  const net=totalIn-totalOut-totalSchool-totalFc;
  document.getElementById('modalSumBar').innerHTML=`
    <div class="sum-item"><div class="sum-label">รายรับ</div><div class="sum-val" style="color:var(--green)">฿${fmt(totalIn)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">รายจ่าย</div><div class="sum-val" style="color:var(--red)">฿${fmt(totalOut)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">หักเข้าบัญชีร้านน้ำโรงเรียน</div><div class="sum-val" style="color:var(--amber)">฿${fmt(totalSchool)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">หักเข้าบัญชี Food Court</div><div class="sum-val" style="color:var(--fc-orange)">฿${fmt(totalFc)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">สุทธิ</div><div class="sum-val" style="color:${net>=0?'var(--green)':'var(--red)'}">฿${fmt(net)}</div></div>
  `;
}

function saveModalEntry(){
  const date=document.getElementById('addDate').value;
  if(!date){showToast('กรุณาเลือกวันที่','error');return;}
  let count=0; let newTx=[];
  recurringItems.forEach(r=>{
    if(r.shopCount){
      const c=parseInt(document.getElementById('mEntryShopCount-'+r.id)?.value)||0;
      if(c>0){ const t={id:Date.now()+Math.random(),date,name:r.name,income:0,expense:c*50,balance:0,note:c+' ร้าน',recurring:true}; transactions.push(t);newTx.push(t);count++; }
    } else {
      const vin=parseFloat(document.getElementById('mEntryAmtIn-'+r.id)?.value)||0;
      const vout=parseFloat(document.getElementById('mEntryAmtOut-'+r.id)?.value)||0;
      const vschool=parseFloat(document.getElementById('mEntryAmtSchool-'+r.id)?.value)||0;
      const vfc=parseFloat(document.getElementById('mEntryAmtFc-'+r.id)?.value)||0;
      if(vin>0||vout>0||vschool>0||vfc>0){ const t={id:Date.now()+Math.random(),date,name:r.name,income:vin,expense:vout,schoolDeduct:vschool,fcDeduct:vfc,balance:0,note:'',recurring:true}; transactions.push(t);newTx.push(t);count++; }
    }
  });
  ['income','expense'].forEach(type=>{
    modalExtraRows[type].forEach(r=>{
      const name=(document.getElementById('mExtraName-'+r.id)?.value||'').trim();
      const amount=parseFloat(document.getElementById('mExtraAmt-'+r.id)?.value)||0;
      if(name&&amount>0){ const t={id:Date.now()+Math.random(),date,name,income:type==='income'?amount:0,expense:type==='expense'?amount:0,balance:0,note:'',recurring:false}; transactions.push(t);newTx.push(t);count++; }
    });
  });
  if(!count){showToast('ไม่มีรายการที่จะบันทึก','error');return;}
  recomputeBalance();
  newTx.forEach(t=>fcSaveTransaction(t));
  populateMonthFilter();
  closeAddModal();
  renderDashboard();
  showToast('บันทึกแล้ว '+count+' รายการ');
}
function saveRecurring(){
  const name=document.getElementById('recName').value.trim();
  const d={'in':parseFloat(document.getElementById('recAmtIn').value)||0,'out':parseFloat(document.getElementById('recAmtOut').value)||0,'school':parseFloat(document.getElementById('recAmtSchool').value)||0,'fc':parseFloat(document.getElementById('recAmtFc').value)||0};
  const desc=document.getElementById('recDesc').value.trim();
  if(!name){showToast('กรุณาใส่ชื่อรายการ','error');return;}
  const kinds=['in','out','school','fc'].filter(k=>recKinds.includes(k)||d[k]>0);  // ช่องที่กรอกยอด = ติดแท็กให้อัตโนมัติ
  if(!kinds.length){showToast('เลือกประเภทอย่างน้อย 1 อย่าง','error');return;}
  recurringItems.push(withLegacy({v:2,id:Date.now(),name,desc,kinds,defaults:d}));
  document.getElementById('recName').value='';
  ['recAmtIn','recAmtOut','recAmtSchool','recAmtFc'].forEach(id=>{document.getElementById(id).value='';});
  recKinds=['in'];syncRecKindCards();
  document.getElementById('recDesc').value='';
  fcSaveRecurring();
  renderManage();renderDashboardRecurring();
  showToast('เพิ่มรายการประจำแล้ว');
}
function deleteRec(id){
  if(!confirm('ลบรายการประจำนี้?')) return;
  recurringItems=recurringItems.filter(r=>r.id!==id);
  fcSaveRecurring();
  renderManage();renderDashboardRecurring();
  showToast('ลบรายการประจำแล้ว','error');
}

// ── POPULATE MONTH FILTER ──
function populateMonthFilter(){
  const months=[...new Set(transactions.map(t=>t.date.slice(0,7)))].sort((a,b)=>b.localeCompare(a));
  const sel=document.getElementById('filterMonth');
  const cur=sel.value;
  sel.innerHTML='<option value="">ทุกเดือน</option>'+months.map(m=>{
    const [y,mo]=m.split('-');
    const d=new Date(parseInt(y),parseInt(mo)-1,1);
    const label=d.toLocaleDateString('th-TH',{month:'long',year:'numeric'});
    return `<option value="${m}"${m===cur?' selected':''}>${label}</option>`;
  }).join('');
  // default to current month if exists
  if(!cur){
    const thisMonth=new Date().toISOString().slice(0,7);
    if(months.includes(thisMonth)) sel.value=thisMonth;
  }
}

function deleteRow(id){
  if(!confirm('ลบรายการนี้?')) return;
  transactions=transactions.filter(t=>t.id!==id);
  recomputeBalance();fcDeleteTransaction(id);renderDaily();
  if(document.getElementById('tab-dashboard').classList.contains('active')) renderDashboard();
  showToast('ลบรายการเรียบร้อย','error');
}

// ── EXPORT CSV ──
function exportCSV(){
  recomputeBalance();
  const sorted=[...transactions].sort((a,b)=>a.date.localeCompare(b.date)||(a.id-b.id));
  const header='วันที่,รายการ,รายรับ,รายจ่าย,คงเหลือ,หมายเหตุ';
  const rows=sorted.map(t=>`${t.date},${t.name},${t.income||''},${t.expense||''},${t.balance||''},${t.note||''}`);
  const blob=new Blob(['\ufeff',[header,...rows].join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='FoodCourt_'+today()+'.csv';a.click();
  showToast('ส่งออก CSV แล้ว');
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

/* ══════════════════════ INIT ══════════════════════ */
buildPage({
  appId:        'foodcourtApp',
  navSubtitle:  'บัญชีรายได้ Food Court',
  navTheme:     'dark',
  activePage:   'foodcourt-admin',
  requireAdmin: 'foodcourt',

  onAuth: function(user, contentEl) {
    currentUser = user;
    updateNavUser(user);
    updateSidebarProfile(user);
    checkAdminAccess(user.email);

    contentEl.innerHTML = renderShell();
    lucide.createIcons();

    fcDailySubtabs = initSubtabs('fcDailySubtabBar', { onChange: onFcDailySubtabChange });
    fcReportSubtabs = initSubtabs('fcReportSubtabBar', { onChange: onFcReportSubtabChange });
    fcManageSubtabs = initSubtabs('fcManageSubtabBar', { onChange: onFcManageSubtabChange });

    loadFoodcourtData().then(function(){
      renderDashboard();
    });
    setupScrollTopButton();
  }
});


