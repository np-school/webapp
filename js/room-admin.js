/* ══════════════════════ STATE ══════════════════════ */
  var currentAdmin=null,allBookings=[],allRooms=[],currentFilter='all',pendingId=null,editRoomId=null,roomImageDataURL=null,roomImageBlob=null;

  /* ── Normalize legacy room names → current names ── */
  var ROOM_NAME_ALIAS={'ห้องประชุมปาริชาติ':'ห้องประชุมปาริชาต'};
  var currentPage=1,PAGE_SIZE=20;

  /* ══════════════════════════════════════
     SUMMARY TAB — Canvas bar charts
     ══════════════════════════════════════ */
  var sumPeriod='day';
  var _sumByRoom={};

/* ══════════════════════ DATA LOADING ══════════════════════ */
  function initListeners(){
    db.collection('bookings').orderBy('createdAt','desc').limit(500).onSnapshot(function(snap){
      allBookings=[];snap.forEach(function(d){var bk=Object.assign({id:d.id},d.data());bk.room=normalizeRoomName(bk.room||'');allBookings.push(bk);});
      updateStats();renderBookings();renderCharts();
    },function(err){
      console.error('bookings onSnapshot error:',err);
      showToast('โหลดรายการคำขอไม่สำเร็จ: '+err.message,'error');
    });
    db.collection('rooms').orderBy('name').onSnapshot(function(snap){
      allRooms=[];snap.forEach(function(d){var rm=Object.assign({id:d.id},d.data());rm.name=normalizeRoomName(rm.name||'');allRooms.push(rm);});renderRooms();
    },function(err){
      console.error('rooms onSnapshot error:',err);
      showToast('โหลดรายการห้องไม่สำเร็จ: '+err.message,'error');
    });
  }

/* ══════════════════════ RENDER ══════════════════════ */
  // LINE handled by Cloud Functions
  /* ── Helper: อ่าน CSS variable จาก :root (ใช้กับ canvas ที่ไม่รองรับ var() ตรงๆ) ── */
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function normalizeRoomName(n){return ROOM_NAME_ALIAS[n]||n;}
  function scrollToTopContent() {
    var content = document.getElementById('pageContent');
    if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderBookings(){
    var search=(document.getElementById('searchInput').value||'').toLowerCase();
    var list=allBookings.filter(function(b){
      if(currentFilter!=='all'&&b.status!==currentFilter)return false;
      if(search){var txt=((b.fullName||b.userName||'')+(b.room||'')+(b.purpose||'')+(b.date||'')).toLowerCase();if(txt.indexOf(search)===-1)return false;}
      return true;
    });
    var el=document.getElementById('bookingsList');
    var pb=document.getElementById('paginationBar');

    if(!list.length){
      el.innerHTML='<div style="text-align:center;padding:48px;color:var(--text3);font-style:italic;">ไม่พบรายการ</div>';
      if(pb)pb.innerHTML='';
      return;
    }

    var totalPages=Math.ceil(list.length/PAGE_SIZE);
    if(currentPage>totalPages)currentPage=1;
    var start=(currentPage-1)*PAGE_SIZE;
    var pageItems=list.slice(start,start+PAGE_SIZE);

    el.innerHTML=pageItems.map(function(b){
      var sLabel=b.status==='approved'?'อนุมัติแล้ว':b.status==='rejected'?'ไม่อนุมัติ':'รอพิจารณา';
      var sCls='badge-'+(b.status||'pending');
      var equip=(b.equipment&&b.equipment.length)?b.equipment.join(' · '):null;
      return '<div class="booking-card status-'+(b.status||'pending')+'">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--gap-card);flex-wrap:wrap;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:center;gap:var(--gap-tight);margin-bottom:9px;flex-wrap:wrap;">' +
              '<span style="font-size:15px;font-weight:800;color:var(--text);">'+b.room+'</span><span class="'+sCls+'">'+sLabel+'</span>' +
              (b.hasLayout?'<span style="font-size:10px;font-weight:700;background:var(--purple-light);color:var(--purple);padding:2px 8px;border-radius:20px;cursor:pointer;" onclick="openFileViewAdmin(\''+b.id+'\')">📎 ดูไฟล์แนบ</span>':'')+
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:2px 14px;font-size:12px;color:var(--text-mid);margin-bottom:7px;">' +
              '<span><b style="color:var(--text);">วันที่:</b> '+b.date+'</span>' +
              '<span><b style="color:var(--text);">เวลา:</b> '+(b.startTime||'-')+' – '+(b.endTime||'-')+'</span>' +
              '<span><b style="color:var(--text);">ผู้จอง:</b> '+(b.fullName||b.userName||'-')+'</span>' +
              '<span><b style="color:var(--text);">ตำแหน่ง:</b> '+(b.position||'-')+'</span>' +
              '<span><b style="color:var(--text);">เบอร์โทร:</b> '+(b.phone?'<a href="tel:'+b.phone+'" style="color:var(--blue);font-weight:700;text-decoration:none;">'+b.phone+'</a>':'-')+'</span>' +
              '<span><b style="color:var(--text);">ผู้เข้าร่วม:</b> '+(b.attendees||'-')+' คน</span>' +
              '<span><b style="color:var(--text);">วัตถุประสงค์:</b> '+b.purpose+'</span>' +
            '</div>' +
            (equip?'<div style="font-size:11px;color:var(--text-mid);background:var(--bg);padding:5px 10px;border-radius:8px;margin-bottom:5px;">🔧 '+equip+'</div>':'')+
            (b.approveNote&&b.status==='approved'?'<div style="font-size:12px;background:var(--role-academic-bg);color:var(--green-deep);padding:6px 12px;border-radius:8px;font-weight:600;margin-top:4px;">💬 '+b.approveNote+'</div>':'')+
            (b.approvedBy&&b.status==='approved'?'<div style="font-size:11px;color:var(--green-deep);margin-top:3px;opacity:.8;">✅ อนุมัติโดย: '+b.approvedBy+'</div>':'')+
            (b.rejectReason?'<div style="font-size:12px;background:var(--red-light);color:var(--red-dark);padding:6px 12px;border-radius:8px;font-weight:600;margin-top:4px;">❌ เหตุผล: '+b.rejectReason+'</div>':'')+
            (b.rejectedBy&&b.status==='rejected'?'<div style="font-size:11px;color:var(--red-dark);margin-top:3px;opacity:.8;">❌ ไม่อนุมัติโดย: '+b.rejectedBy+'</div>':'')+
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">' +
            (b.status==='pending'?
              '<button class="btn-approve" onclick="openApprove(\''+b.id+'\',\''+esc(b.room)+'\',\''+esc(b.date)+'\')"><i data-lucide="check" style="width:11px;height:11px;"></i>อนุมัติ</button>' +
              '<button class="btn-reject" onclick="openReject(\''+b.id+'\',\''+esc(b.room)+'\',\''+esc(b.date)+'\')"><i data-lucide="x" style="width:11px;height:11px;"></i>ไม่อนุมัติ</button>'
            :(b.status==='approved'?
              '<button class="btn-reject" onclick="openReject(\''+b.id+'\',\''+esc(b.room)+'\',\''+esc(b.date)+'\')"><i data-lucide="x" style="width:11px;height:11px;"></i>ยกเลิก</button>':''
            ))+
            '<button class="btn-delete" onclick="openDelete(\''+b.id+'\',\''+esc(b.room)+'\')" title="ลบ"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    /* Pagination bar */
    if(pb){
      if(totalPages<=1){pb.innerHTML='<span style="font-size:12px;color:var(--text3);font-weight:600;">ทั้งหมด '+list.length+' รายการ</span>';return;}
      var html='<span style="font-size:12px;color:var(--text3);font-weight:600;margin-right:6px;">'+list.length+' รายการ</span>';
      html+='<button class="page-btn" onclick="goPage('+(currentPage-1)+')" '+(currentPage===1?'disabled':'')+'>‹ ก่อน</button>';
      var from=Math.max(1,currentPage-2),to=Math.min(totalPages,currentPage+2);
      if(from>1){html+='<button class="page-btn" onclick="goPage(1)">1</button>';if(from>2)html+='<span style="color:var(--text3);font-size:12px;padding:0 4px;">…</span>';}
      for(var p=from;p<=to;p++){html+='<button class="page-btn'+(p===currentPage?' active':'')+'" onclick="goPage('+p+')">'+p+'</button>';}
      if(to<totalPages){if(to<totalPages-1)html+='<span style="color:var(--text3);font-size:12px;padding:0 4px;">…</span>';html+='<button class="page-btn" onclick="goPage('+totalPages+')">'+totalPages+'</button>';}
      html+='<button class="page-btn" onclick="goPage('+(currentPage+1)+')" '+(currentPage===totalPages?'disabled':'')+'>ถัดไป ›</button>';
      pb.innerHTML=html;
    }
    lucide.createIcons();
  }

  function esc(s){return(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}

  function renderRooms(){
    var c=document.getElementById('roomsList');
    if(!allRooms.length){c.innerHTML='<div style="text-align:center;padding:48px;color:var(--text3);font-style:italic;">ยังไม่มีห้อง</div>';return;}
    c.innerHTML=allRooms.map(function(r){
      var imgThumb=r.imageUrl?'<img src="'+r.imageUrl+'" alt="รูปห้อง '+esc2(r.name)+'" style="width:44px;height:36px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid var(--border);">':'<div style="width:44px;height:36px;background:var(--purple-light);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;" role="img" aria-label="ไม่มีรูปห้อง"><i data-lucide="image" style="width:16px;height:16px;color:var(--purple-accent);" aria-hidden="true"></i></div>';
      return'<div class="list-item"><div style="display:flex;align-items:center;gap:var(--gap-item);flex:1;min-width:0;">'+imgThumb+'<div style="min-width:0;"><p style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+r.name+'</p><p style="font-size:12px;color:var(--text2);">'+(r.capacity?'ความจุ '+r.capacity+' คน':'')+' '+(r.detail?'· '+r.detail:'')+'</p></div></div><div style="display:flex;gap:var(--gap-tight);flex-shrink:0;"><button class="btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="openRoomEdit(\''+r.id+'\')"><i data-lucide="pencil" style="width:12px;height:12px;display:inline;margin-right:2px;vertical-align:-1px;"></i>แก้ไข</button><button class="btn-delete" onclick="deleteRoom(\''+r.id+'\',\''+esc(r.name)+'\')" aria-label="ลบ"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></div></div>';
    }).join('');
    lucide.createIcons();
  }
  function clearRoomImageUI(){document.getElementById('roomImageFile').value='';document.getElementById('roomUploadDefault').style.display='block';document.getElementById('roomUploadPreview').style.display='none';document.getElementById('roomUploadArea').classList.remove('has-file');}
  function clearRoomImage(ev){if(ev)ev.stopPropagation();clearRoomImageUI();roomImageDataURL=null;roomImageBlob=null;}  // kept for mini-chart on expand

  function setSumPeriod(p,el){
    sumPeriod=p;
    document.querySelectorAll('[id^="sum-pill-"]').forEach(function(b){b.classList.remove('active');});
    el.classList.add('active');
    renderSummary();
  }

  function parseDateFromBooking(b){
    var dateStr=b.date||'';var parsed=null;
    if(/^\d{4}-\d{2}-\d{2}/.test(dateStr)){parsed=new Date(dateStr);}
    else if(/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)){var p=dateStr.split('/');var y=parseInt(p[2]);parsed=new Date(y-(y>2500?543:0),parseInt(p[1])-1,parseInt(p[0]));}
    else if(b.createdAt&&b.createdAt.toDate){parsed=b.createdAt.toDate();}
    return(parsed&&!isNaN(parsed))?parsed:null;
  }

  function inPeriod(d,period){
    if(!d)return false;
    var now=new Date(),y=now.getFullYear(),m=now.getMonth(),day=now.getDate();
    if(period==='day') return d.getFullYear()===y&&d.getMonth()===m&&d.getDate()===day;
    if(period==='week'){var ws=new Date(y,m,day-now.getDay());ws.setHours(0,0,0,0);var we=new Date(ws);we.setDate(ws.getDate()+7);return d>=ws&&d<we;}
    if(period==='month') return d.getFullYear()===y&&d.getMonth()===m;
    if(period==='year') return d.getFullYear()===y;
    return false;
  }

  function periodLabel(period){
    var now=new Date();
    if(period==='day') return 'วันที่ '+now.toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
    if(period==='week'){var dow=now.getDay(),ws=new Date(now);ws.setDate(now.getDate()-dow);ws.setHours(0,0,0,0);var we=new Date(ws);we.setDate(ws.getDate()+6);return 'สัปดาห์ '+ws.toLocaleDateString('th-TH',{day:'numeric',month:'short'})+' – '+we.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});}
    if(period==='month') return now.toLocaleDateString('th-TH',{year:'numeric',month:'long'});
    if(period==='year') return 'ปี '+now.toLocaleDateString('th-TH',{year:'numeric'});
    return '';
  }

  /* ── build trend buckets ── */
  function buildTrendBuckets(period){
    var now=new Date(),y=now.getFullYear(),m=now.getMonth(),day=now.getDate();
    var buckets=[];
    if(period==='day'){
      for(var h=0;h<24;h++){(function(hh){buckets.push({label:(hh<10?'0':'')+hh+':00',total:0,approved:0,pending:0,rejected:0,fn:function(d){return d.getHours()===hh;}});})(h);}
    } else if(period==='week'){
      var dayNames=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
      var ws=new Date(y,m,day-now.getDay());ws.setHours(0,0,0,0);
      for(var i=0;i<7;i++){(function(ii){var d2=new Date(ws);d2.setDate(ws.getDate()+ii);var dd=d2.getDate(),dm=d2.getMonth(),dy=d2.getFullYear();buckets.push({label:dayNames[ii]+' '+dd,total:0,approved:0,pending:0,rejected:0,fn:function(d){return d.getFullYear()===dy&&d.getMonth()===dm&&d.getDate()===dd;}});})(i);}
    } else if(period==='month'){
      var dim=new Date(y,m+1,0).getDate();
      for(var i=1;i<=dim;i++){(function(dd){buckets.push({label:''+dd,total:0,approved:0,pending:0,rejected:0,fn:function(d){return d.getFullYear()===y&&d.getMonth()===m&&d.getDate()===dd;}});})(i);}
    } else if(period==='year'){
      var mN=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
      for(var i=0;i<12;i++){(function(mi){buckets.push({label:mN[mi],total:0,approved:0,pending:0,rejected:0,fn:function(d){return d.getFullYear()===y&&d.getMonth()===mi;}});})(i);}
    }
    return buckets;
  }

  /* ── draw grouped bar chart (rooms × 3 status) ── */
  function drawGroupedBar(canvasId,rooms,byRoom){
    var canvas=document.getElementById(canvasId);if(!canvas)return;
    var dpr=window.devicePixelRatio||1;
    var W=canvas.parentElement.clientWidth||600;
    var minW=Math.max(W,rooms.length*80);
    var H=230;
    canvas.width=minW*dpr;canvas.height=H*dpr;
    canvas.style.width=minW+'px';canvas.style.height=H+'px';
    var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
    var cW=minW,cH=H,padL=38,padR=16,padT=18,padB=52;
    var chartW=cW-padL-padR,chartH=cH-padT-padB;
    var maxVal=1;rooms.forEach(function(r){maxVal=Math.max(maxVal,byRoom[r].total);});

    // Y grid + labels
    ctx.strokeStyle='var(--border)';ctx.lineWidth=1;
    for(var i=0;i<=4;i++){
      var yy=padT+chartH-(chartH/4*i);
      ctx.beginPath();ctx.moveTo(padL,yy);ctx.lineTo(padL+chartW,yy);ctx.stroke();
      ctx.fillStyle='var(--text3)';ctx.font='bold 9px Sarabun,sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';
      ctx.fillText(Math.round(maxVal/4*i),padL-5,yy);
    }

    var barColors=['var(--c-green)','var(--c-amber)','var(--c-red-mid)'];
    var barKeys=['approved','pending','rejected'];
    var groupW=chartW/rooms.length;
    var nBars=3,barPadG=groupW*0.12,barW=Math.max(6,(groupW-barPadG*2)/nBars-2);

    rooms.forEach(function(room,gi){
      var d=byRoom[room];
      var gx=padL+gi*groupW+barPadG;
      // total bar background (light)
      var totalH=maxVal>0?(d.total/maxVal)*chartH:0;
      ctx.fillStyle='rgba(124,58,237,0.08)';
      ctx.fillRect(padL+gi*groupW+2,padT+chartH-totalH,groupW-4,totalH);

      barKeys.forEach(function(key,bi){
        var val=d[key]||0;
        var bh=maxVal>0?(val/maxVal)*chartH:0;
        var bx=gx+bi*(barW+2);
        var by=padT+chartH-bh;
        var rr=Math.min(4,bh/2);
        ctx.beginPath();
        if(bh>1){ctx.moveTo(bx+rr,by);ctx.lineTo(bx+barW-rr,by);ctx.arcTo(bx+barW,by,bx+barW,by+rr,rr);ctx.lineTo(bx+barW,by+bh);ctx.lineTo(bx,by+bh);ctx.lineTo(bx,by+rr);ctx.arcTo(bx,by,bx+rr,by,rr);}
        ctx.closePath();ctx.fillStyle=barColors[bi];ctx.globalAlpha=0.88;ctx.fill();ctx.globalAlpha=1;
        if(val>0){ctx.fillStyle='var(--text)';ctx.font='bold 8px Sarabun,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(val,bx+barW/2,by-1);}
      });
      // total label
      if(d.total>0){
        ctx.fillStyle=cssVar('--purple');ctx.font='bold 9px Sarabun,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';
        ctx.fillText('รวม '+d.total,padL+gi*groupW+groupW/2,padT+chartH-(maxVal>0?(d.total/maxVal)*chartH:0)-2);
      }
      // room name
      var lx=padL+gi*groupW+groupW/2;
      ctx.fillStyle=cssVar('--text-slate');ctx.font='bold 9px Sarabun,sans-serif';ctx.textAlign='center';ctx.textBaseline='top';
      var name=room.length>10?room.substring(0,10)+'…':room;
      ctx.fillText(name,lx,padT+chartH+5);
      // sub line
      ctx.strokeStyle='var(--border)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(padL+gi*groupW,padT+chartH+3);ctx.lineTo(padL+gi*groupW,padT+chartH);ctx.stroke();
    });
    // axes
    ctx.strokeStyle=cssVar('--border-mid');ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(padL,padT+chartH);ctx.lineTo(padL+chartW,padT+chartH);ctx.stroke();
    ctx.beginPath();ctx.moveTo(padL,padT);ctx.lineTo(padL,padT+chartH);ctx.stroke();
  }

  /* ── draw trend chart (all bookings over sub-periods) ── */
  function drawTrendChart(canvasId,buckets,height){
    var canvas=document.getElementById(canvasId);if(!canvas)return;
    var H=height||160;
    var dpr=window.devicePixelRatio||1;
    var W=canvas.parentElement.clientWidth||600;
    var minW=Math.max(W,buckets.length*28);
    canvas.width=minW*dpr;canvas.height=H*dpr;
    canvas.style.width=minW+'px';canvas.style.height=H+'px';
    var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
    var cW=minW,cH=H,padL=36,padR=14,padT=14,padB=36;
    var chartW=cW-padL-padR,chartH=cH-padT-padB;
    var maxVal=Math.max(1,Math.max.apply(null,buckets.map(function(b){return b.total;})));

    ctx.strokeStyle='var(--border)';ctx.lineWidth=1;
    for(var i=0;i<=4;i++){
      var yy=padT+chartH-(chartH/4*i);
      ctx.beginPath();ctx.moveTo(padL,yy);ctx.lineTo(padL+chartW,yy);ctx.stroke();
      ctx.fillStyle='var(--text3)';ctx.font='bold 9px Sarabun,sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';
      ctx.fillText(Math.round(maxVal/4*i),padL-4,yy);
    }

    var bw=chartW/buckets.length;
    var barW=Math.max(6,bw*0.45);
    var totalPts=[],apPts=[];

    buckets.forEach(function(bk,i){
      var x=padL+i*bw+bw/2;
      var bh=maxVal>0?(bk.total/maxVal)*chartH:0;
      var ah=maxVal>0?(bk.approved/maxVal)*chartH:0;
      // stacked look: rejected at bottom, pending middle, approved top
      var rh=maxVal>0?(bk.rejected/maxVal)*chartH:0;
      var ph=maxVal>0?(bk.pending/maxVal)*chartH:0;
      var base=padT+chartH;
      if(rh>0){ctx.fillStyle='rgba(239,68,68,0.55)';ctx.fillRect(x-barW/2,base-rh,barW,rh);}
      if(ph>0){ctx.fillStyle='rgba(245,158,11,0.65)';ctx.fillRect(x-barW/2,base-rh-ph,barW,ph);}
      if(ah>0){ctx.fillStyle='rgba(34,197,94,0.75)';ctx.fillRect(x-barW/2,base-rh-ph-ah,barW,ah);}

      totalPts.push({x:x,y:padT+chartH-bh});
      apPts.push({x:x,y:padT+chartH-ah});

      var step=buckets.length>20?Math.ceil(buckets.length/10):buckets.length>10?2:1;
      if(i%step===0){ctx.fillStyle='var(--text2)';ctx.font='bold 8px Sarabun,sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(bk.label,x,padT+chartH+4);}
    });

    function drawLine(pts,color,lw){
      if(pts.length<2)return;
      ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
      for(var i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
      ctx.strokeStyle=color;ctx.lineWidth=lw||2;ctx.lineJoin='round';ctx.stroke();
      pts.forEach(function(p){ctx.beginPath();ctx.arc(p.x,p.y,3,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();});
    }
    drawLine(totalPts,cssVar('--purple'),2.5);

    ctx.strokeStyle=cssVar('--border-mid');ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(padL,padT+chartH);ctx.lineTo(padL+chartW,padT+chartH);ctx.stroke();
    ctx.beginPath();ctx.moveTo(padL,padT);ctx.lineTo(padL,padT+chartH);ctx.stroke();
  }

  /* ── main renderSummary ── */
  function renderSummary(){
    var label=document.getElementById('sumPeriodLabel');
    if(label) label.textContent='ช่วงเวลา: '+periodLabel(sumPeriod);
    var cpl=document.getElementById('sumChartPeriodLabel');
    if(cpl) cpl.textContent=periodLabel(sumPeriod);

    var filtered=allBookings.filter(function(b){return inPeriod(parseDateFromBooking(b),sumPeriod);});

    // grand totals
    var gt={total:0,approved:0,pending:0,rejected:0};
    filtered.forEach(function(b){gt.total++;if(b.status==='approved')gt.approved++;else if(b.status==='pending')gt.pending++;else if(b.status==='rejected')gt.rejected++;});
    var totalsEl=document.getElementById('sumTotals');
    if(totalsEl){
      var grandDefs=[{label:'ทั้งหมด',val:gt.total,icon:'calendar',bg:'var(--purple-light)',ic:'var(--purple)'},{label:'อนุมัติแล้ว',val:gt.approved,icon:'check-circle',bg:'#dcfce7',ic:'var(--green)'},{label:'รอพิจารณา',val:gt.pending,icon:'clock',bg:'var(--c-amber-pale)',ic:'var(--c-amber)'},{label:'ไม่อนุมัติ',val:gt.rejected,icon:'x-circle',bg:'var(--red-light)',ic:'var(--red)'}];
      totalsEl.innerHTML=grandDefs.map(function(g){return '<div class="sum-grand-card"><div style="width:40px;height:40px;background:'+g.bg+';border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="'+g.icon+'" style="width:18px;height:18px;color:'+g.ic+';"></i></div><div><p style="font-size:10px;color:var(--text2);font-weight:700;">'+g.label+'</p><p style="font-size:22px;font-weight:800;line-height:1;color:var(--text);">'+g.val+'</p></div></div>';}).join('');
      lucide.createIcons();
    }

    // group by room
    _sumByRoom={};
    filtered.forEach(function(b){
      var r=b.room||'ไม่ระบุ';
      if(!_sumByRoom[r])_sumByRoom[r]={total:0,approved:0,pending:0,rejected:0,items:[],key:r.replace(/[^a-zA-Z0-9]/g,'_')};
      _sumByRoom[r].total++;
      if(b.status==='approved')_sumByRoom[r].approved++;
      else if(b.status==='pending')_sumByRoom[r].pending++;
      else if(b.status==='rejected')_sumByRoom[r].rejected++;
      _sumByRoom[r].items.push(b);
    });
    var sortedRooms=Object.keys(_sumByRoom).sort(function(a,b){return _sumByRoom[b].total-_sumByRoom[a].total;});

    // grouped bar chart
    var barEmpty=document.getElementById('sumBarEmpty'),barCanvas=document.getElementById('sumBarChart');
    if(!sortedRooms.length){if(barCanvas)barCanvas.style.display='none';if(barEmpty)barEmpty.style.display='block';}
    else{if(barCanvas)barCanvas.style.display='block';if(barEmpty)barEmpty.style.display='none';setTimeout(function(){drawGroupedBar('sumBarChart',sortedRooms,_sumByRoom);},40);}

    // trend chart
    var trendSubTexts={day:'แบ่งเป็นรายชั่วโมง (แท่งซ้อน: เขียว=อนุมัติ, เหลือง=รอ, แดง=ไม่อนุมัติ)',week:'แบ่งเป็นรายวันในสัปดาห์',month:'แบ่งเป็นรายวันในเดือน',year:'แบ่งเป็นรายเดือน'};
    var trendSub=document.getElementById('sumTrendSub');if(trendSub)trendSub.textContent=trendSubTexts[sumPeriod]||'';
    var buckets=buildTrendBuckets(sumPeriod);
    allBookings.forEach(function(b){var d=parseDateFromBooking(b);if(!d)return;buckets.forEach(function(bk){if(bk.fn(d)){bk.total++;if(b.status==='approved')bk.approved++;else if(b.status==='pending')bk.pending++;else if(b.status==='rejected')bk.rejected++;}});});
    var trendEmpty=document.getElementById('sumTrendEmpty'),trendCanvas=document.getElementById('sumTrendChart');
    var hasAny=buckets.some(function(bk){return bk.total>0;});
    if(!hasAny){if(trendCanvas)trendCanvas.style.display='none';if(trendEmpty)trendEmpty.style.display='block';}
    else{if(trendCanvas)trendCanvas.style.display='block';if(trendEmpty)trendEmpty.style.display='none';setTimeout(function(){drawTrendChart('sumTrendChart',buckets,160);},40);}

    // per-room cards
    var listEl=document.getElementById('summaryList');if(!listEl)return;
    if(!sortedRooms.length){listEl.innerHTML='';return;}
    var maxTotal=_sumByRoom[sortedRooms[0]].total||1;

    listEl.innerHTML=sortedRooms.map(function(room){
      var d=_sumByRoom[room];
      var totalBarPct=Math.round((d.total/maxTotal)*100);
      var cardId='sum-card-'+d.key;
      var recentItems=d.items.slice(0,5);
      var detailRows=recentItems.map(function(b){
        var sColor=b.status==='approved'?'var(--c-green)':b.status==='rejected'?'var(--c-red-mid)':'var(--c-amber)';
        var sLabel=b.status==='approved'?'อนุมัติ':b.status==='rejected'?'ไม่อนุมัติ':'รอพิจารณา';
        return '<div class="sum-booking-row"><span class="sdot" style="background:'+sColor+';"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:var(--text);">'+(b.fullName||b.userName||'-')+'</span><span style="color:var(--text2);flex-shrink:0;white-space:nowrap;">'+b.date+'</span><span style="color:var(--text2);flex-shrink:0;white-space:nowrap;">'+(b.startTime||'-')+' – '+(b.endTime||'-')+'</span><span style="background:'+sColor+'22;color:'+sColor+';border-radius:10px;padding:1px 7px;font-weight:700;flex-shrink:0;">'+sLabel+'</span></div>';
      }).join('');
      var moreNote=d.items.length>5?'<p style="font-size:10px;color:var(--text3);text-align:right;margin-top:6px;">+ อีก '+(d.items.length-5)+' รายการ</p>':'';
      return '<div class="sum-room-card" id="'+cardId+'">'+
        '<div class="sum-room-header" onclick="toggleSumDetail(\''+cardId+'\',\''+room.replace(/'/g,'\\\'')+'\')" >'+
          '<div style="flex:1;min-width:0;">'+
            '<p class="sum-room-title">'+room+'</p>'+
            '<div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap;">'+
              '<span class="sum-badge sum-badge-total">ทั้งหมด '+d.total+'</span>'+
              '<span class="sum-badge sum-badge-approved">✅ '+d.approved+'</span>'+
              '<span class="sum-badge sum-badge-pending">⏳ '+d.pending+'</span>'+
              '<span class="sum-badge sum-badge-rejected">❌ '+d.rejected+'</span>'+
            '</div>'+
          '</div>'+
          '<div style="display:flex;flex-direction:column;gap:2px;min-width:90px;flex-shrink:0;">'+
            '<div class="sum-bar-track" style="height:12px;"><div class="sum-bar-fill" style="width:'+totalBarPct+'%;background:linear-gradient(90deg,var(--purple),var(--purple-accent));"></div></div>'+
            '<p style="font-size:10px;color:var(--text3);font-weight:600;text-align:right;">'+totalBarPct+'%</p>'+
          '</div>'+
          '<i data-lucide="chevron-down" style="width:16px;height:16px;color:var(--text3);flex-shrink:0;transition:transform .2s;" id="chev-'+cardId+'"></i>'+
        '</div>'+
        '<div class="sum-room-body" id="sum-body-'+cardId+'" style="display:none;">'+
          '<p style="font-size:11px;font-weight:800;color:var(--text-mid);margin-bottom:6px;">แนวโน้มรายห้อง — <span style="color:var(--purple);">'+periodLabel(sumPeriod)+'</span></p>'+
          '<div style="overflow-x:auto;margin-bottom:var(--gap-card);"><canvas id="mini-'+cardId+'" height="100" style="display:block;min-width:200px;"></canvas></div>'+
          '<p style="font-size:11px;font-weight:800;color:var(--text-mid);margin-bottom:6px;">รายการล่าสุด</p>'+
          '<div class="sum-booking-list">'+detailRows+'</div>'+moreNote+
        '</div>'+
      '</div>';
    }).join('');

    lucide.createIcons();
  }

  /* ══════════════════════════════════════
     CHARTS
     ══════════════════════════════════════ */
  function renderCharts(){
    renderDonutChart();
    renderRoomBars();
    renderMonthBars();
  }

  /* ── 1. Donut: สถานะ ── */
  function renderDonutChart(){
    var statusConfig=[
      {key:'approved', label:'อนุมัติแล้ว',   color:'var(--c-green)'},
      {key:'pending',  label:'รอพิจารณา',     color:'var(--c-amber)'},
      {key:'rejected', label:'ไม่อนุมัติ',    color:'var(--c-red-mid)'},
    ];
    var counts={approved:0,pending:0,rejected:0};
    allBookings.forEach(function(b){var s=b.status||'pending';if(counts[s]!==undefined)counts[s]++;});
    var total=allBookings.length;

    var canvas=document.getElementById('donutChart');
    if(!canvas)return;
    var ctx=canvas.getContext('2d');
    var cx=80,cy=80,r=68,thick=22;
    ctx.clearRect(0,0,160,160);
    var startAngle=-Math.PI/2,gap=0.025;
    statusConfig.forEach(function(s){
      var slice=total>0?(counts[s.key]/total)*(2*Math.PI):0;
      if(slice<0.001)return;
      ctx.beginPath();
      ctx.arc(cx,cy,r,startAngle+gap/2,startAngle+slice-gap/2);
      ctx.arc(cx,cy,r-thick,startAngle+slice-gap/2,startAngle+gap/2,true);
      ctx.closePath();ctx.fillStyle=s.color;ctx.fill();
      startAngle+=slice;
    });
    if(total===0){ctx.beginPath();ctx.arc(cx,cy,r,0,2*Math.PI);ctx.arc(cx,cy,r-thick,2*Math.PI,0,true);ctx.closePath();ctx.fillStyle='var(--border)';ctx.fill();}
    document.getElementById('donutTotal').textContent=total;
    var leg=document.getElementById('donutLegend');
    leg.innerHTML=statusConfig.map(function(s){
      var pct=total>0?Math.round((counts[s.key]/total)*100):0;
      return '<div class="legend-row">'+
        '<div class="legend-dot" style="background:'+s.color+';"></div>'+
        '<span class="legend-label">'+s.label+'</span>'+
        '<span class="legend-val">'+counts[s.key]+' <span style="font-size:10px;color:var(--text3);font-weight:600;">('+pct+'%)</span></span>'+
      '</div>';
    }).join('');
  }

  /* ── 2. ห้องที่จองมากสุด ── */
  function renderRoomBars(){
    var container=document.getElementById('roomBars');
    if(!container)return;
    var roomCount={};
    allBookings.filter(function(b){return b.status==='approved';}).forEach(function(b){
      var r=b.room||'ไม่ระบุ';
      roomCount[r]=(roomCount[r]||0)+1;
    });
    var sorted=Object.keys(roomCount).sort(function(a,b){return roomCount[b]-roomCount[a];}).slice(0,10);
    if(!sorted.length){container.innerHTML='<p style="font-size:12px;color:var(--text3);text-align:center;padding:20px;">ยังไม่มีข้อมูล</p>';return;}
    var max=roomCount[sorted[0]]||1;
    container.innerHTML=sorted.map(function(room){
      var cnt=roomCount[room];
      var pct=Math.round((cnt/max)*100);
      var color=pct>=80?'linear-gradient(90deg,var(--blue),var(--accent-mid))':pct>=50?'linear-gradient(90deg,var(--purple),var(--purple-accent))':'linear-gradient(90deg,var(--sky),var(--sky-mid))';
      return '<div class="hbar-row">'+
        '<div class="hbar-label">'+
          '<span class="hbar-name" title="'+room+'">'+room+'</span>'+
          '<span class="hbar-pct">'+cnt+' ครั้ง</span>'+
        '</div>'+
        '<div class="hbar-track"><div class="hbar-fill" style="width:'+pct+'%;background:'+color+';"></div></div>'+
      '</div>';
    }).join('');
  }

  /* ── 3. คำขอรายเดือน (6 เดือนล่าสุด) ── */
  function renderMonthBars(){
    var container=document.getElementById('monthBars');
    if(!container)return;
    var now=new Date(),months=[];
    for(var i=5;i>=0;i--){
      var d=new Date(now.getFullYear(),now.getMonth()-i,1);
      months.push({year:d.getFullYear(),month:d.getMonth(),label:d.toLocaleDateString('th-TH',{month:'short',year:'2-digit'}),count:0});
    }
    allBookings.forEach(function(b){
      var dateStr=b.date||'';
      var parsed=null;
      if(/^\d{4}-\d{2}-\d{2}/.test(dateStr)){parsed=new Date(dateStr);}
      else if(/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)){var p=dateStr.split('/');parsed=new Date(parseInt(p[2])-(p[2]>2500?543:0),parseInt(p[1])-1,parseInt(p[0]));}
      else if(b.createdAt&&b.createdAt.toDate){parsed=b.createdAt.toDate();}
      if(!parsed||isNaN(parsed))return;
      months.forEach(function(m){if(parsed.getFullYear()===m.year&&parsed.getMonth()===m.month)m.count++;});
    });
    var max=Math.max.apply(null,months.map(function(m){return m.count;}))||1;
    container.innerHTML=months.map(function(m){
      var pct=Math.round((m.count/max)*100);
      return '<div class="tbar-row" style="display:flex;align-items:center;gap:var(--gap-tight);margin-bottom:10px;">'+
        '<span style="font-size:10px;font-weight:700;color:var(--text2);min-width:44px;flex-shrink:0;">'+m.label+'</span>'+
        '<div style="flex:1;background:var(--bg-alt);border-radius:4px;height:8px;overflow:hidden;">'+
          '<div style="height:100%;border-radius:4px;width:'+pct+'%;background:linear-gradient(90deg,var(--purple),var(--purple-accent));transition:width .5s ease;"></div>'+
        '</div>'+
        '<span style="font-size:10px;font-weight:800;color:var(--text2);min-width:24px;text-align:right;">'+m.count+'</span>'+
      '</div>';
    }).join('');
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

  function updateStats(){var p=0,a=0,r=0;allBookings.forEach(function(b){if(b.status==='pending')p++;else if(b.status==='approved')a++;else if(b.status==='rejected')r++;});document.getElementById('statPending').textContent=p;document.getElementById('statApproved').textContent=a;document.getElementById('statRejected').textContent=r;document.getElementById('statTotal').textContent=allBookings.length;}

  function setFilter(f,el){currentFilter=f;currentPage=1;document.querySelectorAll('.filter-pill').forEach(function(b){b.classList.remove('active');});el.classList.add('active');renderBookings();}

  function goPage(p){
    var search=(document.getElementById('searchInput').value||'').toLowerCase();
    var list=allBookings.filter(function(b){
      if(currentFilter!=='all'&&b.status!==currentFilter)return false;
      if(search){var txt=((b.fullName||b.userName||'')+(b.room||'')+(b.purpose||'')+(b.date||'')).toLowerCase();if(txt.indexOf(search)===-1)return false;}
      return true;
    });
    var totalPages=Math.ceil(list.length/PAGE_SIZE);
    if(p<1||p>totalPages)return;
    currentPage=p;
    renderBookings();
    document.getElementById('tab-bookings').scrollTop=0;
  }

  function openApprove(id,room,date){pendingId=id;document.getElementById('approveModalSub').textContent=room+' · '+date;document.getElementById('approveNote').value='';openModal('approveModal');}
  function confirmApprove(){var note=document.getElementById('approveNote').value;db.collection('bookings').doc(pendingId).update({status:'approved',approveNote:note,approvedBy:currentAdmin.displayName||currentAdmin.email,approvedByEmail:currentAdmin.email,approvedAt:firebase.firestore.FieldValue.serverTimestamp()}).then(function(){closeModal('approveModal');showToast('อนุมัติคำขอเรียบร้อย ✓');db.collection('bookings').doc(pendingId).get().then(function(doc){if(!doc.exists)return;var b=doc.data();});}).catch(function(e){showToast(e.message,'error');});}

  function openReject(id,room,date){pendingId=id;document.getElementById('rejectModalSub').textContent=room+' · '+date;document.getElementById('rejectReason').value='';openModal('rejectModal');}
  function confirmReject(){var r=document.getElementById('rejectReason').value.trim();if(!r){showToast('กรุณาระบุเหตุผล','warn');return;}db.collection('bookings').doc(pendingId).update({status:'rejected',rejectReason:r,rejectedBy:currentAdmin.displayName||currentAdmin.email,rejectedByEmail:currentAdmin.email,rejectedAt:firebase.firestore.FieldValue.serverTimestamp()}).then(function(){closeModal('rejectModal');showToast('บันทึกการไม่อนุมัติแล้ว');db.collection('bookings').doc(pendingId).get().then(function(doc){if(!doc.exists)return;var b=doc.data();});}).catch(function(e){showToast(e.message,'error');});}

  function openDelete(id,room){pendingId=id;document.getElementById('deleteModalText').textContent='ต้องการลบคำขอห้อง "'+room+'" ใช่หรือไม่?';openModal('deleteModal');}
  function confirmDelete(){db.collection('bookings').doc(pendingId).delete().then(function(){closeModal('deleteModal');showToast('ลบแล้ว');}).catch(function(e){showToast(e.message,'error');});}
  function openRoomModal(){
    editRoomId=null;roomImageDataURL=null;roomImageBlob=null;
    document.getElementById('roomModalTitle').textContent='เพิ่มห้องใหม่';
    document.getElementById('roomName').value='';document.getElementById('roomCapacity').value='';document.getElementById('roomDetail').value='';
    clearRoomImageUI();
    openModal('roomModal');
  }
  function openRoomEdit(id){
    var r=allRooms.find(function(x){return x.id===id;});if(!r)return;
    editRoomId=id;roomImageDataURL=r.imageUrl||null;roomImageBlob=null;
    document.getElementById('roomModalTitle').textContent='แก้ไขห้อง';
    document.getElementById('roomName').value=r.name||'';document.getElementById('roomCapacity').value=r.capacity||'';document.getElementById('roomDetail').value=r.detail||'';
    if(r.imageUrl){document.getElementById('roomPreviewImg').src=r.imageUrl;document.getElementById('roomFileName').textContent='รูปภาพที่บันทึกไว้';document.getElementById('roomFileSize').textContent='';document.getElementById('roomUploadDefault').style.display='none';document.getElementById('roomUploadPreview').style.display='block';document.getElementById('roomUploadArea').classList.add('has-file');}
    else{clearRoomImageUI();}
    openModal('roomModal');
  }
  function handleRoomImage(input){
    var file=input.files[0];if(!file)return;
    if(file.size>15*1024*1024){showToast('ไฟล์ใหญ่เกิน 15MB','warn');input.value='';return;}
    var reader=new FileReader();
    reader.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        // Target: base64 string must be < 680,000 chars (~500KB binary) to fit Firestore 1MB doc limit safely
        var TARGET=680000;
        // Step 1: scale down — start at max 800px, step down if needed
        var scales=[800,640,480,360];
        var dataUrl='',finalW=img.width,finalH=img.height;
        for(var si=0;si<scales.length;si++){
          var MAX=scales[si];
          var w=img.width,h=img.height;
          if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
          // Step 2: try quality from 0.75 down
          var canvas=document.createElement('canvas');
          canvas.width=w;canvas.height=h;
          canvas.getContext('2d').drawImage(img,0,0,w,h);
          var q=0.75,found=false;
          while(q>=0.3){
            dataUrl=canvas.toDataURL('image/jpeg',q);
            if(dataUrl.length<=TARGET){finalW=w;finalH=h;found=true;break;}
            q=Math.round((q-0.05)*100)/100;
          }
          if(found)break;
        }
        // Fallback: use last result even if still slightly over (better than nothing)
        if(!dataUrl)dataUrl=canvas.toDataURL('image/jpeg',0.3);
        roomImageDataURL=dataUrl;
        // convert dataUrl -> Blob for Storage upload
        var byteStr=atob(dataUrl.split(',')[1]);
        var bytes=new Uint8Array(byteStr.length);
        for(var bi=0;bi<byteStr.length;bi++)bytes[bi]=byteStr.charCodeAt(bi);
        roomImageBlob=new Blob([bytes],{type:'image/jpeg'});
        var kb=(dataUrl.length*0.75/1024).toFixed(0);
        document.getElementById('roomPreviewImg').src=dataUrl;
        document.getElementById('roomFileName').textContent=file.name;
        document.getElementById('roomFileSize').textContent='✓ บีบอัดแล้ว '+kb+' KB · '+finalW+'×'+finalH+'px';
        document.getElementById('roomUploadDefault').style.display='none';
        document.getElementById('roomUploadPreview').style.display='block';
        document.getElementById('roomUploadArea').classList.add('has-file');
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  }
  function saveRoom(){
    var name=document.getElementById('roomName').value.trim();
    if(!name){showToast('กรุณาระบุชื่อห้อง','warn');return;}
    var data={name:name,capacity:document.getElementById('roomCapacity').value.trim(),detail:document.getElementById('roomDetail').value.trim(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};

    function finishSave(){
      var p=editRoomId?db.collection('rooms').doc(editRoomId).update(data):db.collection('rooms').add(Object.assign(data,{createdAt:firebase.firestore.FieldValue.serverTimestamp()}));
      p.then(function(){closeModal('roomModal');showToast(editRoomId?'แก้ไขห้องแล้ว':'เพิ่มห้องใหม่แล้ว ✓');}).catch(function(e){showToast(e.message,'error');});
    }

    if(roomImageBlob){
      if(!storage){showToast('Storage ยังไม่พร้อมใช้งาน','error');return;}
      var path='room-images/'+(editRoomId||'new_'+Date.now())+'_'+Date.now()+'.jpg';
      var ref=storage.ref().child(path);
      showToast('กำลังอัปโหลดรูปภาพ...');
      ref.put(roomImageBlob,{contentType:'image/jpeg'}).then(function(snap){
        return snap.ref.getDownloadURL();
      }).then(function(url){
        data.imageUrl=url;
        finishSave();
      }).catch(function(e){showToast('อัปโหลดรูปไม่สำเร็จ: '+e.message,'error');});
    } else {
      if(roomImageDataURL)data.imageUrl=roomImageDataURL;
      finishSave();
    }
  }
  function deleteRoom(id,name){if(!confirm('ต้องการลบห้อง "'+name+'" ใช่หรือไม่?'))return;db.collection('rooms').doc(id).delete().then(function(){showToast('ลบห้องแล้ว');}).catch(function(e){showToast(e.message,'error');});}

  /* ── File View (Admin) ── */
  function openFileViewAdmin(bookingId){
    var b=allBookings.find(function(x){return x.id===bookingId;});
    if(!b||!b.hasLayout){showToast('ไม่มีไฟล์แนบ','warn');return;}
    var modal=document.getElementById('fileViewModal');
    var img=document.getElementById('fileViewImg');
    var errEl=document.getElementById('fileViewError');
    document.getElementById('fileViewName').textContent=b.layoutName||'ไฟล์แนบ';
    if(b.layoutUrl){img.src=b.layoutUrl;img.style.display='block';errEl.style.display='none';}
    else if(b.layoutDataURL){img.src=b.layoutDataURL;img.style.display='block';errEl.style.display='none';}
    else{img.style.display='none';errEl.style.display='block';errEl.innerHTML='<p style="font-size:13px;color:var(--text3);">ไฟล์ชื่อ: <b>'+(b.layoutName||'-')+'</b><br><span style="font-size:11px;">ไม่มีข้อมูล URL ของรูปภาพ</span></p>';}
    modal.classList.add('open');document.body.style.overflow='hidden';
  }
  function closeFileView(){document.getElementById('fileViewModal').classList.remove('open');document.body.style.overflow='';}

  function toggleSumDetail(cardId,roomName){
    var body=document.getElementById('sum-body-'+cardId);
    var chev=document.getElementById('chev-'+cardId);
    if(!body)return;
    var isHidden=body.style.display==='none';
    body.style.display=isHidden?'block':'none';
    if(chev)chev.style.transform=isHidden?'rotate(180deg)':'rotate(0deg)';
    if(isHidden){
      // build buckets for this room only
      var roomData=_sumByRoom[roomName]||null;
      if(!roomData)return;
      var bks=buildTrendBuckets(sumPeriod);
      roomData.items.forEach(function(b){
        var d=parseDateFromBooking(b);if(!d)return;
        bks.forEach(function(bk){if(bk.fn(d)){bk.total++;if(b.status==='approved')bk.approved++;else if(b.status==='pending')bk.pending++;else if(b.status==='rejected')bk.rejected++;}});
      });
      setTimeout(function(){drawTrendChart('mini-'+cardId,bks,100);},30);
    }
  }

  /* ══════════════════════ INIT ══════════════════════ */
  buildPage({
    appId:        'roomAdminApp',
    navSubtitle:  'NP Origins · Admin Dashboard',
    navTheme:     'dark',
    activePage:   'room-admin',
    requireAdmin: 'bookings',

    onAuth: function(user, contentEl) {
      currentAdmin = user;
      updateNavUser(user);
      buildSidebar('room-admin');
      checkAdminAccess(user.email);
      updateSidebarProfile(user);

      /* inject page content จาก <template> */
      var tpl = document.getElementById('roomAdminContent');
      if (tpl) contentEl.appendChild(tpl.content.cloneNode(true));

      initListeners();
      initSubtabs('roomSubtabBar', {
        onChange: function (tab) {
          if (tab === 'summary') renderSummary();
        }
      });
      lucide.createIcons();
      setupScrollTopButton();
    }
  });

  lucide.createIcons();


