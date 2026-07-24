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
let recType='income';
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

    if(!txSnap.empty){
      transactions=[];
      txSnap.forEach(function(doc){ transactions.push(doc.data()); });
    } else {
      /* ครั้งแรก – seed ข้อมูลตัวอย่างขึ้น Firestore */
      transactions.forEach(function(t){ fcSaveTransaction(t); });
    }

    if(metaSnap.exists && metaSnap.data().recurringItems && metaSnap.data().recurringItems.length){
      recurringItems=metaSnap.data().recurringItems;
    } else {
      fcSaveRecurring();
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
  sorted.forEach(t=>{bal+=t.income-t.expense;map[t.id]=bal;});
  transactions.forEach(t=>t.balance=map[t.id]||0);
}

// ── DASHBOARD ──
function renderDashboard(){
  const totalIn=transactions.reduce((s,t)=>s+t.income,0);
  const totalOut=transactions.reduce((s,t)=>s+t.expense,0);
  const balance=totalIn-totalOut;
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

  document.getElementById('kpiGrid').innerHTML=`
    <div class="kpi income"><div class="kpi-icon">💰</div>
      <div class="kpi-label">รายรับรวม</div>
      <div class="kpi-value">฿${fmt(totalIn)}</div>
      <div class="kpi-sub">${incTx} รายการ, ${days} วัน</div></div>
    <div class="kpi expense"><div class="kpi-icon">💸</div>
      <div class="kpi-label">รายจ่ายรวม</div>
      <div class="kpi-value">฿${fmt(totalOut)}</div>
      <div class="kpi-sub">ค่าใช้จ่ายทั้งหมด</div></div>
    <div class="kpi balance"><div class="kpi-icon">🏦</div>
      <div class="kpi-label">คงเหลือสุทธิ</div>
      <div class="kpi-value" style="color:${balance>=0?'var(--green)':'var(--red)'}">฿${fmt(balance)}</div>
      <div class="kpi-sub">${balance>=0?'✅ กำไร':'⚠️ ขาดทุน'}</div></div>
    <div class="kpi avg"><div class="kpi-icon">📊</div>
      <div class="kpi-label">เฉลี่ยรายได้/วัน</div>
      <div class="kpi-value">฿${fmt(totalIn/days)}</div>
      <div class="kpi-sub">เฉลี่ยจาก ${days} วัน</div></div>
  `;

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
  const incomes=days.map(d=>transactions.filter(t=>t.date===d).reduce((s,t)=>s+t.income,0));
  const expenses=days.map(d=>transactions.filter(t=>t.date===d).reduce((s,t)=>s+t.expense,0));
  if(barChart) barChart.destroy();
  barChart=new Chart(document.getElementById('barChart'),{type:'bar',data:{labels,datasets:[{label:'รายรับ',data:incomes,backgroundColor:hexToRgba(cssVar('--c-green'),.75),borderRadius:6},{label:'รายจ่าย',data:expenses,backgroundColor:hexToRgba(cssVar('--c-red'),.65),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{family:'Sarabun',size:12}}}},scales:{x:{ticks:{font:{family:'Sarabun',size:10}}},y:{ticks:{font:{family:'Sarabun',size:10},callback:v=>'฿'+v.toLocaleString()}}}}});
}

function renderLineChart(){
  const days=[...new Set(transactions.map(t=>t.date))].sort();const labels=days.map(fmtDateShort);
  const nets=days.map(d=>transactions.filter(t=>t.date===d).reduce((s,t)=>s+t.income-t.expense,0));
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
  const totalIn = periodTx.reduce((s,t) => s + t.income, 0);
  const totalOut = periodTx.reduce((s,t) => s + t.expense, 0);
  const net = totalIn - totalOut;

  document.getElementById('recSummaryKpi').innerHTML = `
    <div style="background:var(--green-lt);border:1px solid var(--green-mid);border-radius:12px;padding:14px 16px">
      <div style="font-size:10px;font-weight:800;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">รายรับ</div>
      <div style="font-size:20px;font-weight:800;color:var(--green)">฿${fmt(totalIn)}</div>
    </div>
    <div style="background:var(--red-lt);border:1px solid var(--red-mid);border-radius:12px;padding:14px 16px">
      <div style="font-size:10px;font-weight:800;color:var(--red);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">รายจ่าย</div>
      <div style="font-size:20px;font-weight:800;color:var(--red)">฿${fmt(totalOut)}</div>
    </div>
    <div style="background:${net>=0?'var(--blue-lt)':'var(--red-lt)'};border:1px solid ${net>=0?'var(--blue-mid)':'var(--red-mid)'};border-radius:12px;padding:14px 16px">
      <div style="font-size:10px;font-weight:800;color:${net>=0?'var(--blue)':'var(--red)'};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">สุทธิ</div>
      <div style="font-size:20px;font-weight:800;color:${net>=0?'var(--blue)':'var(--red)'}">฿${fmt(net)}</div>
    </div>
  `;

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
  const inc=recurringItems.filter(r=>r.type==='income');
  const exp=recurringItems.filter(r=>r.type==='expense');
  document.getElementById('manageRecIncome').innerHTML=inc.length
    ? inc.map(r=>manageRecCard(r)).join('')
    : '<div style="color:var(--text2);font-size:12px;padding:10px 0">ไม่มีรายการ</div>';
  document.getElementById('manageRecExpense').innerHTML=exp.length
    ? exp.map(r=>manageRecCard(r)).join('')
    : '<div style="color:var(--text2);font-size:12px;padding:10px 0">ไม่มีรายการ</div>';
}

function manageRecCard(r){
  const amtLabel=r.amount>0?'฿'+fmt(r.amount)+'/ครั้ง':(r.shopCount?'คำนวณจากจำนวนร้าน':'ยอดไม่แน่นอน');
  return `<div class="manage-rec-card ${r.type}-type">
    <div style="font-size:22px;flex-shrink:0">${r.type==='income'?'💰':'💸'}</div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:800;font-size:13px;margin-bottom:3px">${r.name}</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:6px">${amtLabel}${r.desc?' · '+r.desc:''}</div>
      <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="deleteRec(${r.id})">🗑 ลบ</button>
    </div>
  </div>`;
}

function renderDailyEntry(){
  if(!document.getElementById('entryDate').value) document.getElementById('entryDate').value=today();

  const recIncome=recurringItems.filter(r=>r.type==='income');
  const recExpense=recurringItems.filter(r=>r.type==='expense');

  document.getElementById('entryRecIncome').innerHTML=recIncome.length
    ? recIncome.map(r=>entryRow(r)).join('')
    : '<div style="color:var(--text2);font-size:12px">ไม่มีรายการ</div>';

  document.getElementById('entryRecExpense').innerHTML=recExpense.length
    ? recExpense.map(r=>entryRow(r)).join('')
    : '<div style="color:var(--text2);font-size:12px">ไม่มีรายการ</div>';

  renderExtraEntryRows('income');
  renderExtraEntryRows('expense');
  updateEntrySumBar();
}

function entryRow(r){
  if(r.shopCount){
    return `<div style="display:flex;align-items:center;gap:var(--gap-card);padding:12px 16px;background:var(--slate-lt);border:1px solid var(--border);border-radius:12px">
      <div style="flex:1;min-width:0;font-weight:700;font-size:13px">${r.name}</div>
      <div class="shop-count-wrap" style="margin-left:0">
        <input class="shop-count-input" type="number" id="entryShopCount-${r.id}" min="0" placeholder="ร้าน" oninput="updateEntrySumBar()">
        <span style="font-size:11px;color:var(--text2)">ร้าน × 50</span>
      </div>
    </div>`;
  }
  return `<div style="display:flex;align-items:center;gap:var(--gap-card);padding:12px 16px;background:var(--slate-lt);border:1px solid var(--border);border-radius:12px">
    <div style="flex:1;min-width:0;font-weight:700;font-size:13px">${r.name}</div>
    <div style="display:flex;align-items:center;gap:6px">
      <input type="number" id="entryAmt-${r.id}" min="0" placeholder="0" style="width:130px;text-align:right" value="${r.amount>0?'':''}" oninput="updateEntrySumBar()">
      <span style="font-size:14px;font-weight:800;color:var(--text2)">฿</span>
    </div>
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
  const recIncome=recurringItems.filter(r=>r.type==='income');
  const recExpense=recurringItems.filter(r=>r.type==='expense');
  document.getElementById('modalEntryRecIncome').innerHTML=recIncome.map(r=>modalEntryRow(r)).join('') || '<div style="color:var(--text2);font-size:12px">ไม่มีรายการ</div>';
  document.getElementById('modalEntryRecExpense').innerHTML=recExpense.map(r=>modalEntryRow(r)).join('') || '<div style="color:var(--text2);font-size:12px">ไม่มีรายการ</div>';
  renderModalExtraRows('income');
  renderModalExtraRows('expense');
  updateModalSumBar();
}

function modalEntryRow(r){
  if(r.shopCount){
    return `<div style="display:flex;align-items:center;gap:var(--gap-card);padding:10px 14px;background:var(--slate-lt);border:1px solid var(--border);border-radius:10px">
      <div style="flex:1;min-width:0;font-weight:700;font-size:13px">${r.name}</div>
      <div class="shop-count-wrap" style="margin-left:0">
        <input class="shop-count-input" type="number" id="mEntryShopCount-${r.id}" min="0" placeholder="ร้าน" oninput="updateModalSumBar()">
        <span style="font-size:11px;color:var(--text2)">ร้าน × 50</span>
      </div>
    </div>`;
  }
  return `<div style="display:flex;align-items:center;gap:var(--gap-card);padding:10px 14px;background:var(--slate-lt);border:1px solid var(--border);border-radius:10px">
    <div style="flex:1;min-width:0;font-weight:700;font-size:13px">${r.name}</div>
    <div style="display:flex;align-items:center;gap:6px">
      <input type="number" id="mEntryAmt-${r.id}" min="0" placeholder="0" style="width:120px;text-align:right" oninput="updateModalSumBar()">
      <span style="font-size:13px;font-weight:800;color:var(--text2)">฿</span>
    </div>
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
function setRecType(t){
  recType=t;
  ['recCardIn','recCardOut'].forEach(id=>{
    const el=document.getElementById(id);
    el.className='modal-type-card '+(id==='recCardIn'?'income':'expense')+(t===(id==='recCardIn'?'income':'expense')?' active':'');
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
  const totalIn=rows.reduce((s,t)=>s+t.income,0);
  const totalOut=rows.reduce((s,t)=>s+t.expense,0);
  const net=totalIn-totalOut;
  document.getElementById('monthlyChartKpi').innerHTML=`
    <span style="font-weight:800;color:var(--green)">รับ ฿${fmt(totalIn)}</span>
    <span style="color:var(--text2)">|</span>
    <span style="font-weight:800;color:var(--red)">จ่าย ฿${fmt(totalOut)}</span>
    <span style="color:var(--text2)">|</span>
    <span style="font-weight:800;color:${net>=0?'var(--blue)':'var(--red)'}">สุทธิ ฿${fmt(net)}</span>
  `;

  // Group by date
  const days=[...new Set(rows.map(t=>t.date))].sort();
  const labels=days.map(fmtDateShort);
  const incomes=days.map(d=>rows.filter(t=>t.date===d).reduce((s,t)=>s+t.income,0));
  const expenses=days.map(d=>rows.filter(t=>t.date===d).reduce((s,t)=>s+t.expense,0));

  if(monthlyBarChart) monthlyBarChart.destroy();
  monthlyBarChart=new Chart(document.getElementById('monthlyBarChart'),{
    type:'bar',
    data:{labels,datasets:[
      {label:'รายรับ',data:incomes,backgroundColor:hexToRgba(cssVar('--c-green'),.75),borderRadius:5},
      {label:'รายจ่าย',data:expenses,backgroundColor:hexToRgba(cssVar('--c-red'),.65),borderRadius:5}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{family:'Sarabun',size:11}}}},scales:{x:{ticks:{font:{family:'Sarabun',size:9}}},y:{ticks:{font:{family:'Sarabun',size:10},callback:v=>'฿'+v.toLocaleString()}}}}
  });
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
  const totalOut=rows.reduce((s,r)=>s+r.expense,0);const net=totalIn-totalOut;
  document.getElementById('sumBar').innerHTML=`
    <div class="sum-item"><div class="sum-label">รายรับ</div><div class="sum-val" style="color:var(--green)">฿${fmt(totalIn)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">รายจ่าย</div><div class="sum-val" style="color:var(--red)">฿${fmt(totalOut)}</div></div>
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
    return `<div class="day-section">
      <div class="day-header">
        <div class="day-title">${fmtDateShort(date)}</div>
        <div class="day-stats">
          <span class="day-in">+฿${fmt(dayIn)}</span>
          <span class="day-out">-฿${fmt(dayOut)}</span>
        </div>
      </div>
      <div class="tbl-wrap">
        <table><thead><tr>
          <th>รายการ</th><th>ประเภท</th>
          <th style="text-align:right">รายรับ</th><th style="text-align:right">รายจ่าย</th>
          <th>หมายเหตุ</th><th></th>
        </tr></thead><tbody>
          ${items.map(r=>`<tr>
            <td style="font-weight:600">${r.name}${r.name===SHOP_TRANSFER_NAME&&r.note?` <span class="amount-highlight">${r.note}</span>`:''}</td>
            <td><span class="badge ${r.income>0?'badge-in':'badge-out'}">${r.income>0?'รายรับ':'รายจ่าย'}</span></td>
            <td class="td-in" style="text-align:right">${r.income>0?'฿'+fmt(r.income):''}</td>
            <td class="td-out" style="text-align:right">${r.expense>0?'฿'+fmt(r.expense):''}</td>
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
  const byWeek={};
  transactions.forEach(t=>{
    const w=_weekStart(t.date);
    if(!byWeek[w]) byWeek[w]={income:0,expense:0};
    byWeek[w].income+=t.income; byWeek[w].expense+=t.expense;
  });
  const weeks=Object.keys(byWeek).sort().slice(-rptWeekRange);
  const labels=weeks.map(_weekLabel);
  const incomes=weeks.map(w=>byWeek[w].income);
  const expenses=weeks.map(w=>byWeek[w].expense);
  const nets=weeks.map((w,i)=>incomes[i]-expenses[i]);

  const totalIn=incomes.reduce((a,b)=>a+b,0);
  const totalOut=expenses.reduce((a,b)=>a+b,0);
  const avgIn=weeks.length?totalIn/weeks.length:0;
  const bestWeekIdx=nets.length?nets.indexOf(Math.max(...nets)):-1;

  document.getElementById('rptWeekKpi').innerHTML=`
    <div class="kpi income"><div class="kpi-icon">💰</div><div class="kpi-label">รายรับรวม</div><div class="kpi-value">฿${fmt(totalIn)}</div><div class="kpi-sub">${weeks.length} สัปดาห์</div></div>
    <div class="kpi expense"><div class="kpi-icon">💸</div><div class="kpi-label">รายจ่ายรวม</div><div class="kpi-value">฿${fmt(totalOut)}</div><div class="kpi-sub">${weeks.length} สัปดาห์</div></div>
    <div class="kpi balance"><div class="kpi-icon">🏦</div><div class="kpi-label">สุทธิรวม</div><div class="kpi-value" style="color:${(totalIn-totalOut)>=0?'var(--green)':'var(--red)'}">฿${fmt(totalIn-totalOut)}</div><div class="kpi-sub">${(totalIn-totalOut)>=0?'✅ กำไร':'⚠️ ขาดทุน'}</div></div>
    <div class="kpi avg"><div class="kpi-icon">📊</div><div class="kpi-label">เฉลี่ยรายรับ/สัปดาห์</div><div class="kpi-value">฿${fmt(avgIn)}</div><div class="kpi-sub">${bestWeekIdx>=0?'สัปดาห์ดีสุด: '+labels[bestWeekIdx]:'-'}</div></div>
  `;

  if(rptWeekChart) rptWeekChart.destroy();
  rptWeekChart=new Chart(document.getElementById('rptWeekChart'),{
    type:'bar',
    data:{labels,datasets:[
      {type:'bar',label:'รายรับ',data:incomes,backgroundColor:hexToRgba(cssVar('--c-green'),.75),borderRadius:6,order:2},
      {type:'bar',label:'รายจ่าย',data:expenses,backgroundColor:hexToRgba(cssVar('--c-red'),.65),borderRadius:6,order:2},
      {type:'line',label:'สุทธิ',data:nets,borderColor:cssVar('--chart-1'),backgroundColor:hexToRgba(cssVar('--chart-1'),.08),tension:.3,pointRadius:3,order:1}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{family:'Sarabun',size:12}}}},scales:{x:{ticks:{font:{family:'Sarabun',size:10}}},y:{ticks:{font:{family:'Sarabun',size:10},callback:v=>'฿'+v.toLocaleString()}}}}
  });

  document.getElementById('rptWeekTable').innerHTML=`<table><thead><tr>
      <th>สัปดาห์</th><th style="text-align:right">รายรับ</th><th style="text-align:right">รายจ่าย</th><th style="text-align:right">สุทธิ</th>
    </tr></thead><tbody>
      ${weeks.map((w,i)=>`<tr>
        <td style="font-weight:600">${labels[i]}</td>
        <td class="td-in" style="text-align:right">฿${fmt(incomes[i])}</td>
        <td class="td-out" style="text-align:right">฿${fmt(expenses[i])}</td>
        <td style="text-align:right;font-weight:700;color:${nets[i]>=0?'var(--green)':'var(--red)'}">฿${fmt(nets[i])}</td>
      </tr>`).reverse().join('')}
    </tbody></table>`;
}

/* ── รายเดือน ── */
function renderReportMonth(){
  const month=document.getElementById('rptMonthSelect').value;
  if(!month) return;
  const rows=transactions.filter(t=>t.date.startsWith(month));
  const days=[...new Set(rows.map(t=>t.date))].sort();
  const labels=days.map(fmtDateShort);
  const incomes=days.map(d=>rows.filter(t=>t.date===d).reduce((s,t)=>s+t.income,0));
  const expenses=days.map(d=>rows.filter(t=>t.date===d).reduce((s,t)=>s+t.expense,0));

  const totalIn=rows.reduce((s,t)=>s+t.income,0);
  const totalOut=rows.reduce((s,t)=>s+t.expense,0);
  const net=totalIn-totalOut;

  document.getElementById('rptMonthKpi').innerHTML=`
    <div class="kpi income"><div class="kpi-icon">💰</div><div class="kpi-label">รายรับรวม</div><div class="kpi-value">฿${fmt(totalIn)}</div><div class="kpi-sub">${days.length} วันที่มีรายการ</div></div>
    <div class="kpi expense"><div class="kpi-icon">💸</div><div class="kpi-label">รายจ่ายรวม</div><div class="kpi-value">฿${fmt(totalOut)}</div></div>
    <div class="kpi balance"><div class="kpi-icon">🏦</div><div class="kpi-label">สุทธิ</div><div class="kpi-value" style="color:${net>=0?'var(--green)':'var(--red)'}">฿${fmt(net)}</div><div class="kpi-sub">${net>=0?'✅ กำไร':'⚠️ ขาดทุน'}</div></div>
    <div class="kpi avg"><div class="kpi-icon">📊</div><div class="kpi-label">เฉลี่ยรายรับ/วัน</div><div class="kpi-value">฿${fmt(days.length?totalIn/days.length:0)}</div></div>
  `;

  if(rptMonthChart) rptMonthChart.destroy();
  rptMonthChart=new Chart(document.getElementById('rptMonthChart'),{type:'bar',data:{labels,datasets:[{label:'รายรับ',data:incomes,backgroundColor:hexToRgba(cssVar('--c-green'),.75),borderRadius:6},{label:'รายจ่าย',data:expenses,backgroundColor:hexToRgba(cssVar('--c-red'),.65),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{family:'Sarabun',size:12}}}},scales:{x:{ticks:{font:{family:'Sarabun',size:9}}},y:{ticks:{font:{family:'Sarabun',size:10},callback:v=>'฿'+v.toLocaleString()}}}}});

  const shopMap={};
  rows.filter(t=>t.income>0).forEach(t=>{shopMap[t.name]=(shopMap[t.name]||0)+t.income;});
  const slabels=Object.keys(shopMap);const sdata=Object.values(shopMap);const bg=slabels.map((_,i)=>colors[i%colors.length]);
  if(rptMonthDonut) rptMonthDonut.destroy();
  rptMonthDonut=new Chart(document.getElementById('rptMonthDonut'),{type:'doughnut',data:{labels:slabels,datasets:[{data:sdata,backgroundColor:bg,borderWidth:2,borderColor:'white'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'65%'}});
  document.getElementById('rptMonthLegend').innerHTML=slabels.map((l,i)=>`<div class="legend-item"><div class="legend-dot" style="background:${bg[i]}"></div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l}</div><div style="font-size:10px;color:var(--text2)">฿${fmt(sdata[i])}</div></div></div>`).join('');
}

/* ── เปรียบเทียบรายเดือน ── */
function renderReportCompare(){
  const byMonth={};
  transactions.forEach(t=>{
    const m=t.date.slice(0,7);
    if(!byMonth[m]) byMonth[m]={income:0,expense:0};
    byMonth[m].income+=t.income; byMonth[m].expense+=t.expense;
  });
  const months=Object.keys(byMonth).sort();
  const labels=months.map(m=>{const d=new Date(m+'-01T00:00:00');return d.toLocaleDateString('th-TH',{month:'short',year:'2-digit'});});
  const incomes=months.map(m=>byMonth[m].income);
  const expenses=months.map(m=>byMonth[m].expense);
  const nets=months.map((m,i)=>incomes[i]-expenses[i]);

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
  rptCompareChart=new Chart(document.getElementById('rptCompareChart'),{
    type:'bar',
    data:{labels,datasets:[
      {type:'bar',label:'รายรับ',data:incomes,backgroundColor:hexToRgba(cssVar('--c-green'),.75),borderRadius:6,order:2},
      {type:'bar',label:'รายจ่าย',data:expenses,backgroundColor:hexToRgba(cssVar('--c-red'),.65),borderRadius:6,order:2},
      {type:'line',label:'สุทธิ',data:nets,borderColor:cssVar('--chart-1'),backgroundColor:hexToRgba(cssVar('--chart-1'),.08),tension:.3,pointRadius:4,order:1}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{family:'Sarabun',size:12}}}},scales:{x:{ticks:{font:{family:'Sarabun',size:10}}},y:{ticks:{font:{family:'Sarabun',size:10},callback:v=>'฿'+v.toLocaleString()}}}}
  });

  document.getElementById('rptCompareTable').innerHTML=`<table><thead><tr>
      <th>เดือน</th><th style="text-align:right">รายรับ</th><th style="text-align:right">รายจ่าย</th><th style="text-align:right">สุทธิ</th>
    </tr></thead><tbody>
      ${months.map((m,i)=>`<tr>
        <td style="font-weight:600">${labels[i]}</td>
        <td class="td-in" style="text-align:right">฿${fmt(incomes[i])}</td>
        <td class="td-out" style="text-align:right">฿${fmt(expenses[i])}</td>
        <td style="text-align:right;font-weight:700;color:${nets[i]>=0?'var(--green)':'var(--red)'}">฿${fmt(nets[i])}</td>
      </tr>`).reverse().join('')}
    </tbody></table>`;
}

/* ── รายปี ── */
function renderReportYear(){
  const year=document.getElementById('rptYearSelect').value;
  if(!year) return;
  const rows=transactions.filter(t=>t.date.startsWith(year));
  const monthNames=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const incomes=monthNames.map((_,i)=>rows.filter(t=>parseInt(t.date.slice(5,7),10)-1===i).reduce((s,t)=>s+t.income,0));
  const expenses=monthNames.map((_,i)=>rows.filter(t=>parseInt(t.date.slice(5,7),10)-1===i).reduce((s,t)=>s+t.expense,0));

  const totalIn=rows.reduce((s,t)=>s+t.income,0);
  const totalOut=rows.reduce((s,t)=>s+t.expense,0);
  const net=totalIn-totalOut;
  const activeMonths=monthNames.filter((_,i)=>incomes[i]>0||expenses[i]>0).length;

  document.getElementById('rptYearKpi').innerHTML=`
    <div class="kpi income"><div class="kpi-icon">💰</div><div class="kpi-label">รายรับรวมทั้งปี</div><div class="kpi-value">฿${fmt(totalIn)}</div><div class="kpi-sub">${activeMonths} เดือนที่มีข้อมูล</div></div>
    <div class="kpi expense"><div class="kpi-icon">💸</div><div class="kpi-label">รายจ่ายรวมทั้งปี</div><div class="kpi-value">฿${fmt(totalOut)}</div></div>
    <div class="kpi balance"><div class="kpi-icon">🏦</div><div class="kpi-label">สุทธิทั้งปี</div><div class="kpi-value" style="color:${net>=0?'var(--green)':'var(--red)'}">฿${fmt(net)}</div><div class="kpi-sub">${net>=0?'✅ กำไร':'⚠️ ขาดทุน'}</div></div>
    <div class="kpi avg"><div class="kpi-icon">📊</div><div class="kpi-label">เฉลี่ยรายรับ/เดือน</div><div class="kpi-value">฿${fmt(activeMonths?totalIn/activeMonths:0)}</div></div>
  `;

  if(rptYearChart) rptYearChart.destroy();
  rptYearChart=new Chart(document.getElementById('rptYearChart'),{type:'bar',data:{labels:monthNames,datasets:[{label:'รายรับ',data:incomes,backgroundColor:hexToRgba(cssVar('--c-green'),.75),borderRadius:6},{label:'รายจ่าย',data:expenses,backgroundColor:hexToRgba(cssVar('--c-red'),.65),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{family:'Sarabun',size:12}}}},scales:{x:{ticks:{font:{family:'Sarabun',size:11}}},y:{ticks:{font:{family:'Sarabun',size:10},callback:v=>'฿'+v.toLocaleString()}}}}});
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
  let totalIn=0,totalOut=0;
  recurringItems.forEach(r=>{
    if(r.shopCount){
      const c=parseInt(document.getElementById('entryShopCount-'+r.id)?.value)||0;
      totalOut+=c*50;
    } else {
      const v=parseFloat(document.getElementById('entryAmt-'+r.id)?.value)||0;
      if(r.type==='income') totalIn+=v; else totalOut+=v;
    }
  });
  extraEntryRows.income.forEach(r=>{totalIn+=parseFloat(document.getElementById('entryExtraAmt-'+r.id)?.value)||0;});
  extraEntryRows.expense.forEach(r=>{totalOut+=parseFloat(document.getElementById('entryExtraAmt-'+r.id)?.value)||0;});
  const net=totalIn-totalOut;
  document.getElementById('entrySumBar').innerHTML=`
    <div class="sum-item"><div class="sum-label">รายรับ</div><div class="sum-val" style="color:var(--green)">฿${fmt(totalIn)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">รายจ่าย</div><div class="sum-val" style="color:var(--red)">฿${fmt(totalOut)}</div></div>
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
      const v=parseFloat(document.getElementById('entryAmt-'+r.id)?.value)||0;
      if(v>0){
        const t={id:Date.now()+Math.random(),date,name:r.name,income:r.type==='income'?v:0,expense:r.type==='expense'?v:0,balance:0,note:'',recurring:true};
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
  let totalIn=0,totalOut=0;
  recurringItems.forEach(r=>{
    if(r.shopCount){
      const c=parseInt(document.getElementById('mEntryShopCount-'+r.id)?.value)||0;
      totalOut+=c*50;
    } else {
      const v=parseFloat(document.getElementById('mEntryAmt-'+r.id)?.value)||0;
      if(r.type==='income') totalIn+=v; else totalOut+=v;
    }
  });
  modalExtraRows.income.forEach(r=>{totalIn+=parseFloat(document.getElementById('mExtraAmt-'+r.id)?.value)||0;});
  modalExtraRows.expense.forEach(r=>{totalOut+=parseFloat(document.getElementById('mExtraAmt-'+r.id)?.value)||0;});
  const net=totalIn-totalOut;
  document.getElementById('modalSumBar').innerHTML=`
    <div class="sum-item"><div class="sum-label">รายรับ</div><div class="sum-val" style="color:var(--green)">฿${fmt(totalIn)}</div></div>
    <div class="divider"></div>
    <div class="sum-item"><div class="sum-label">รายจ่าย</div><div class="sum-val" style="color:var(--red)">฿${fmt(totalOut)}</div></div>
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
      const v=parseFloat(document.getElementById('mEntryAmt-'+r.id)?.value)||0;
      if(v>0){ const t={id:Date.now()+Math.random(),date,name:r.name,income:r.type==='income'?v:0,expense:r.type==='expense'?v:0,balance:0,note:'',recurring:true}; transactions.push(t);newTx.push(t);count++; }
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
  const amount=parseFloat(document.getElementById('recAmount').value)||0;
  const desc=document.getElementById('recDesc').value.trim();
  if(!name){showToast('กรุณาใส่ชื่อรายการ','error');return;}
  recurringItems.push({id:Date.now(),type:recType,name,amount,desc});
  document.getElementById('recName').value='';
  document.getElementById('recAmount').value='';
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


