/* ═══════════════════════════════════════════════════════════════
   ARKAN WALLET — Non-Custodial USDT TRC20 Module (Phase 1)
   المبدأ: الموقع لا يلمس المفاتيح الخاصة أبدًا.
   يُحفظ العنوان العام فقط في localStorage (arkan_wallet_addr).
   القراءة: TronLink (إن وُجد) أو TronGrid REST (عرض فقط).
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── الإعدادات ── */
var CFG={
  networks:{
    mainnet:{ label:'TRON Mainnet', grid:'https://api.trongrid.io',
      usdt:'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', scan:'https://tronscan.org/#' },
    nile:{ label:'Nile Testnet', grid:'https://nile.trongrid.io',
      /* عقد USDT التجريبي على Nile — تحقق منه مرة واحدة على nile.tronscan.org */
      usdt:'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf', scan:'https://nile.tronscan.org/#' }
  },
  defaultNet:'mainnet',
  storageKey:'arkan_wallet_addr',
  netKey:'arkan_wallet_net',
  txLimit:10
};

var S={ addr:null, net:CFG.defaultNet, live:false, busy:false };
var $=function(id){return document.getElementById(id);};

/* ── أدوات ── */
function shortAddr(a){ return a? a.slice(0,6)+'…'+a.slice(-6):''; }
function fmt(n,dp){ dp=(dp==null?2:dp);
  return Number.isFinite(n)? n.toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp}) : '—'; }
function toast(msg,err){
  var t=$('wToast'); if(!t)return;
  t.textContent=msg; t.className='wtoast on'+(err?' err':'');
  clearTimeout(t._h); t._h=setTimeout(function(){t.className='wtoast';},2600);
}
function isTronAddress(a){ return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a||''); }

/* ── كشف البيئة ── */
function hasTronLink(){ return !!(window.tronLink||window.tronWeb); }
function isMobile(){ return /iPhone|iPad|Android/i.test(navigator.userAgent); }

function detectNet(){
  try{
    var h=(window.tronWeb&&window.tronWeb.fullNode&&window.tronWeb.fullNode.host)||'';
    if(/nile/i.test(h)) return 'nile';
    if(/shasta/i.test(h)) return 'nile'; /* أي شبكة اختبار → عامل كـ testnet */
    if(h) return 'mainnet';
  }catch(e){}
  return localStorage.getItem(CFG.netKey)||CFG.defaultNet;
}
function net(){ return CFG.networks[S.net]||CFG.networks.mainnet; }

/* ── الربط بـ TronLink ── */
async function connect(){
  if(S.busy)return; S.busy=true; setBtnLoading('btnConnect',true);
  try{
    if(!hasTronLink()){ showInstallGuide(); return; }
    if(window.tronLink&&window.tronLink.request){
      var r=await window.tronLink.request({method:'tron_requestAccounts'});
      if(r&&r.code&&r.code!==200){ toast('رفض العميل الاتصال أو TronLink مقفل',true); return; }
    }
    var tries=0;
    while(tries++<20){
      var a=window.tronWeb&&window.tronWeb.defaultAddress&&window.tronWeb.defaultAddress.base58;
      if(a){ onConnected(a,true); return; }
      await new Promise(function(res){setTimeout(res,250);});
    }
    toast('افتح TronLink وفعّل المحفظة ثم أعد المحاولة',true);
  }catch(e){ toast('تعذر الاتصال: '+(e.message||e),true); }
  finally{ S.busy=false; setBtnLoading('btnConnect',false); }
}

function onConnected(addr,live){
  S.addr=addr; S.live=!!live; S.net=detectNet();
  localStorage.setItem(CFG.storageKey,addr);
  localStorage.setItem(CFG.netKey,S.net);
  render(); refresh();
}

function disconnect(){
  localStorage.removeItem(CFG.storageKey);
  S.addr=null; S.live=false; render();
  toast('تم فصل المحفظة من الموقع');
}

/* ── قراءة الأرصدة (TronGrid REST — يعمل حتى بدون TronLink) ── */
async function fetchAccount(addr){
  var r=await fetch(net().grid+'/v1/accounts/'+addr,{headers:{accept:'application/json'}});
  if(!r.ok) throw new Error('TronGrid '+r.status);
  var j=await r.json();
  return (j.data&&j.data[0])||null;
}

var _px={v:0,at:0};
async function getTrxPrice(){
  if(Date.now()-_px.at<300000&&_px.v)return _px.v;
  try{
    var r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd');
    var j=await r.json(); var p=j&&j.tron&&j.tron.usd;
    if(p){_px={v:p,at:Date.now()};return p;}
  }catch(e){}
  try{ /* بديل: Binance العام */
    var r2=await fetch('https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT');
    var j2=await r2.json(); var p2=parseFloat(j2.price);
    if(p2){_px={v:p2,at:Date.now()};return p2;}
  }catch(e){}
  return _px.v||0;
}

async function refresh(){
  if(!S.addr)return;
  var b=$('btnRefresh'); if(b)b.classList.add('spin');
  $('usdtBal').textContent='…'; $('trxBal').textContent='…';
  try{
    var acc=await fetchAccount(S.addr);
    var trx=acc? (acc.balance||0)/1e6 : 0;
    var usdt=0;
    if(acc&&acc.trc20){
      acc.trc20.forEach(function(o){
        var k=Object.keys(o)[0];
        if(k===net().usdt) usdt=Number(o[k])/1e6;
      });
    }
    $('usdtBal').textContent=fmt(usdt);
    $('trxBal').textContent=fmt(trx)+' TRX';
    var trxPrice=await getTrxPrice();
    var total=usdt+(trx*trxPrice);
    $('usdBal').textContent='إجمالي القيمة ≈ $'+fmt(total);
    var low=trx<25;
    $('gasWarn').style.display=low?'flex':'none';
    localStorage.setItem('arkan_wallet_lastbal',JSON.stringify({u:usdt,t:trx,at:Date.now()}));
    loadTxs();
  }catch(e){
    $('usdtBal').textContent='—'; $('trxBal').textContent='—';
    toast('تعذر جلب الرصيد — تحقق من الاتصال',true);
  }
  if(b)b.classList.remove('spin');
}

/* ── آخر المعاملات (قراءة فقط — للتحقق من الاستقبال) ── */
async function loadTxs(){
  var box=$('txList'); if(!box)return;
  try{
    var u=net().grid+'/v1/accounts/'+S.addr+'/transactions/trc20?limit='+CFG.txLimit+
          '&contract_address='+net().usdt;
    var r=await fetch(u,{headers:{accept:'application/json'}});
    var j=await r.json();
    var rows=(j.data||[]);
    if(!rows.length){ box.innerHTML='<div class="tx-empty">لا توجد معاملات USDT بعد — استقبل أول تحويل لتظهر هنا</div>'; return; }
    /* إشعار فوري داخل الصفحة عند وصول حوالة جديدة */
    try{
      var latestIn=rows.find(function(t){return t.to===S.addr;});
      if(latestIn){
        var key='arkan_wallet_lastin_'+S.addr;
        var prev=localStorage.getItem(key);
        if(prev&&prev!==latestIn.transaction_id){
          var amt=Number(latestIn.value)/Math.pow(10,(latestIn.token_info&&latestIn.token_info.decimals)||6);
          toast('💰 وصلت حوالة +'+fmt(amt)+' USDT');
          if(window.Notification&&Notification.permission==='granted')
            new Notification('محفظة أركان',{body:'وصلت حوالة +'+fmt(amt)+' USDT',icon:'arkan-icon-192.png'});
        }
        localStorage.setItem(key,latestIn.transaction_id);
      }
    }catch(e){}
    box.innerHTML=rows.map(function(t){
      var incoming=(t.to===S.addr);
      var amt=Number(t.value)/Math.pow(10,(t.token_info&&t.token_info.decimals)||6);
      var other=incoming?t.from:t.to;
      var d=new Date(t.block_timestamp);
      var when=d.toLocaleDateString('ar')+' '+d.toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'});
      return '<a class="tx" target="_blank" rel="noopener" href="'+net().scan+'/transaction/'+t.transaction_id+'">'+
        '<span class="tx-ic '+(incoming?'in':'out')+'">'+(incoming?'↓':'↑')+'</span>'+
        '<span class="tx-body"><b>'+(incoming?'استقبال':'إرسال')+'</b>'+
        '<small class="num">'+shortAddr(other)+'</small></span>'+
        '<span class="tx-amt '+(incoming?'in':'out')+'"><b class="num">'+(incoming?'+':'−')+fmt(amt)+'</b>'+
        '<small>'+when+'</small></span></a>';
    }).join('');
  }catch(e){ box.innerHTML='<div class="tx-empty">تعذر تحميل السجل</div>'; }
}

/* ── الاستقبال + QR ── */
function openReceive(){
  if(!S.addr)return;
  $('rcvAddr').textContent=S.addr;
  var holder=$('qrBox'); holder.innerHTML='';
  try{
    var qr=window.qrcode(0,'M'); qr.addData(S.addr); qr.make();
    holder.innerHTML=qr.createSvgTag({cellSize:5,margin:2,scalable:true});
    var svg=holder.querySelector('svg');
    if(svg){svg.removeAttribute('width');svg.removeAttribute('height');}
  }catch(e){ holder.innerHTML='<div class="tx-empty">تعذر إنشاء QR — انسخ العنوان يدويًا</div>'; }
  $('rcvModal').classList.add('on');
}
function copyAddr(){
  if(!S.addr)return;
  (navigator.clipboard? navigator.clipboard.writeText(S.addr):Promise.reject())
    .then(function(){toast('تم نسخ العنوان ✓');})
    .catch(function(){
      var i=document.createElement('input'); i.value=S.addr; document.body.appendChild(i);
      i.select(); document.execCommand('copy'); i.remove(); toast('تم نسخ العنوان ✓');
    });
}

/* ═══════ المرحلة 2: الإرسال بتوقيع TronLink ═══════ */
var SEND={to:null,amt:0,tx:null,when:null,confirmed:false};

function openSend(){
  if(!S.addr)return;
  if(!S.live||!window.tronWeb||!window.tronWeb.ready&&!(window.tronWeb&&window.tronWeb.defaultAddress&&window.tronWeb.defaultAddress.base58)){
    toast('الإرسال يتطلب فتح الصفحة داخل تطبيق TronLink (وضع العرض لا يوقّع)',true);
    $('guideModal').classList.add('on'); return;
  }
  $('sendForm').style.display='block'; $('sendConfirm').style.display='none'; $('sendBusy').style.display='none';
  $('sendTo').value=''; $('sendAmt').value='';
  $('sendModal').classList.add('on');
}

function reviewSend(){
  var to=($('sendTo').value||'').trim();
  var amt=parseFloat(($('sendAmt').value||'').replace(/,/g,''));
  var bal=parseFloat(($('usdtBal').textContent||'0').replace(/,/g,''))||0;
  if(!isTronAddress(to)){ toast('عنوان المستلم غير صالح',true); return; }
  if(to===S.addr){ toast('لا يمكن الإرسال إلى نفس المحفظة',true); return; }
  if(!(amt>0)){ toast('أدخل مبلغًا صحيحًا',true); return; }
  if(amt>bal){ toast('المبلغ أكبر من رصيدك ('+fmt(bal)+' USDT)',true); return; }
  SEND.to=to; SEND.amt=amt;
  $('cAmt').textContent=fmt(amt)+' USDT';
  $('cFrom').textContent=shortAddr(S.addr); $('cTo').textContent=shortAddr(to);
  $('sendForm').style.display='none'; $('sendConfirm').style.display='block';
}

async function doSend(){
  if(S.busy)return; S.busy=true;
  $('sendConfirm').style.display='none'; $('sendBusy').style.display='block';
  $('busyMsg').textContent='بانتظار توقيعك في TronLink…';
  try{
    var c=await window.tronWeb.contract().at(net().usdt);
    var sun=window.tronWeb.toSun? window.tronWeb.toSun(SEND.amt): Math.round(SEND.amt*1e6);
    var txid=await c.transfer(SEND.to,String(sun)).send({feeLimit:50000000});
    SEND.tx=(typeof txid==='string')?txid:(txid&&txid.txid)||String(txid);
    SEND.when=new Date(); SEND.confirmed=false;
    $('sendModal').classList.remove('on');
    $('dAmt').textContent=fmt(SEND.amt);
    $('dScan').href=net().scan+'/transaction/'+SEND.tx;
    $('dStatus').textContent='قيد التأكيد على الشبكة…';
    $('doneModal').classList.add('on');
    trackConfirm(SEND.tx);
    setTimeout(refresh,4000);
  }catch(e){
    var msg=(e&&(e.message||e.error||e))+'';
    if(/Confirmation declined|cancel|reject/i.test(msg)) toast('ألغيت التوقيع — لم يُرسل شيء',true);
    else if(/balance|energy|bandwidth|fee/i.test(msg)) toast('رصيد TRX غير كافٍ لرسوم الشبكة',true);
    else toast('فشل الإرسال: '+msg.slice(0,80),true);
    $('sendBusy').style.display='none'; $('sendConfirm').style.display='block';
  }
  S.busy=false;
}

async function trackConfirm(txid){
  for(var i=0;i<20;i++){
    await new Promise(function(r){setTimeout(r,4000);});
    try{
      var r=await fetch(net().grid+'/wallet/gettransactioninfobyid',{method:'POST',
        headers:{'content-type':'application/json'},body:JSON.stringify({value:txid})});
      var j=await r.json();
      if(j&&j.blockNumber){
        SEND.confirmed=true;
        var el=$('dStatus'); if(el){el.textContent='✓ مؤكدة على البلوكتشين — البلوك '+j.blockNumber; el.style.color='var(--green)';}
        return;
      }
    }catch(e){}
  }
}

/* ═══════ إيصال PDF احترافي (Canvas → jsPDF) ═══════ */
async function makeReceipt(){
  try{
    await (document.fonts&&document.fonts.ready||Promise.resolve());
    var W=1240,H=1754, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    var x=cv.getContext('2d');
    /* خلفية */
    x.fillStyle='#F5F9FF'; x.fillRect(0,0,W,H);
    /* رأس متدرج */
    var g=x.createLinearGradient(0,0,W,420); g.addColorStop(0,'#062A6E'); g.addColorStop(.65,'#0056D6'); g.addColorStop(1,'#0B8BE8');
    x.fillStyle=g; x.fillRect(0,0,W,420);
    x.fillStyle='rgba(38,161,123,.35)'; x.beginPath(); x.arc(W-140,60,220,0,7); x.fill();
    /* شعار */
    x.fillStyle='#fff'; x.font='800 54px Archivo, Arial'; x.textAlign='left'; x.direction='ltr';
    x.fillText('ARKAN',70,120);
    x.fillStyle='#7FE3C1'; x.fillText('RATES',282,120);
    x.fillStyle='rgba(255,255,255,.8)'; x.font='400 26px "IBM Plex Sans Arabic"'; x.textAlign='right'; x.direction='rtl';
    x.fillText('إيصال تحويل USDT · TRC20', W-70,118);
    /* المبلغ */
    x.textAlign='center'; x.direction='ltr'; x.fillStyle='#fff';
    x.font='700 110px Archivo, Arial';
    x.fillText('-'+fmt(SEND.amt)+' USDT', W/2, 290);
    x.font='500 28px "IBM Plex Sans Arabic"'; x.direction='rtl';
    x.fillStyle='#9FF5D2';
    x.fillText(SEND.confirmed?'✓ مؤكدة على البلوكتشين':'قيد التأكيد على الشبكة', W/2, 360);
    /* بطاقة التفاصيل */
    function card(y,h){ x.fillStyle='#fff'; x.strokeStyle='#D9E5F2'; x.lineWidth=2;
      rr(x,70,y,W-140,h,26); x.fill(); x.stroke(); }
    function rr(c,px,py,pw,ph,r){ c.beginPath(); c.moveTo(px+r,py); c.arcTo(px+pw,py,px+pw,py+ph,r);
      c.arcTo(px+pw,py+ph,px,py+ph,r); c.arcTo(px,py+ph,px,py,r); c.arcTo(px,py,px+pw,py,r); c.closePath(); }
    card(480,560);
    var rows=[
      ['من محفظة',S.addr],
      ['إلى محفظة',SEND.to],
      ['الشبكة','TRON · TRC20'],
      ['رقم المعاملة TxID',SEND.tx],
      ['التاريخ والوقت',SEND.when.toLocaleString('ar-MR',{dateStyle:'medium',timeStyle:'short'})]
    ];
    var ry=560;
    rows.forEach(function(rw,i){
      x.textAlign='right'; x.direction='rtl'; x.fillStyle='#486581';
      x.font='500 26px "IBM Plex Sans Arabic"'; x.fillText(rw[0], W-120, ry);
      x.textAlign='left'; x.direction='ltr'; x.fillStyle='#102A43';
      var mono=/^T|^[0-9a-f]{20}/.test(rw[1]);
      x.font=(mono?'600 24px "Courier New", monospace':'600 26px "IBM Plex Sans Arabic"');
      var v=rw[1];
      if(v.length>46){ x.fillText(v.slice(0,46),120,ry-14); x.fillText(v.slice(46),120,ry+18); }
      else x.fillText(v,120,ry);
      if(i<rows.length-1){ x.strokeStyle='#EAF2FB'; x.beginPath(); x.moveTo(110,ry+42); x.lineTo(W-110,ry+42); x.stroke(); }
      ry+=98;
    });
    /* QR التحقق */
    card(1090,470);
    x.textAlign='right'; x.direction='rtl'; x.fillStyle='#102A43'; x.font='600 30px "IBM Plex Sans Arabic"';
    x.fillText('تحقق علني من المعاملة', W-120, 1170);
    x.fillStyle='#486581'; x.font='400 24px "IBM Plex Sans Arabic"';
    x.fillText('امسح الرمز لعرض هذا التحويل على Tronscan', W-120, 1218);
    x.fillText('سجل عام غير قابل للتعديل على شبكة TRON', W-120, 1260);
    var link=net().scan+'/transaction/'+SEND.tx;
    var q=window.qrcode(0,'M'); q.addData(link); q.make();
    var n=q.getModuleCount(), size=300, cell=size/n, qx=120, qy=1150;
    x.fillStyle='#fff'; x.fillRect(qx-14,qy-14,size+28,size+28);
    x.fillStyle='#102A43';
    for(var r2=0;r2<n;r2++)for(var c2=0;c2<n;c2++) if(q.isDark(r2,c2)) x.fillRect(qx+c2*cell,qy+r2*cell,cell+.5,cell+.5);
    /* تذييل */
    x.textAlign='center'; x.direction='rtl'; x.fillStyle='#486581'; x.font='400 22px "IBM Plex Sans Arabic"';
    x.fillText('arkanrates.com — إيصال مولّد آليًا من محفظة أركان اللامركزية', W/2, 1660);
    x.font='400 20px Arial'; x.direction='ltr';
    x.fillText('ARKAN INTERNATIONAL TRADING · Non-Custodial Wallet · '+new Date().getFullYear(), W/2, 1700);

    var img=cv.toDataURL('image/jpeg',.92);
    var JS=window.jspdf&&window.jspdf.jsPDF;
    if(!JS){ /* بديل: تنزيل صورة */ dl(img,'ARKAN-receipt-'+SEND.tx.slice(0,8)+'.jpg'); return; }
    var pdf=new JS({unit:'pt',format:'a4'});
    var pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight();
    pdf.addImage(img,'JPEG',0,0,pw,ph);
    pdf.save('ARKAN-receipt-'+SEND.tx.slice(0,8)+'.pdf');
    toast('تم إنشاء الإيصال ✓');
  }catch(e){ toast('تعذر إنشاء الإيصال: '+(e.message||e),true); }
}
function dl(href,name){ var a=document.createElement('a'); a.href=href; a.download=name; document.body.appendChild(a); a.click(); a.remove(); }

/* ── دليل التثبيت (آيفون/أندرويد بدون TronLink) ── */
function showInstallGuide(){ $('guideModal').classList.add('on'); }
function openInTronLink(){
  var url=location.href.split('#')[0];
  var param=encodeURIComponent(JSON.stringify({url:url,action:'open',protocol:'tronlink',version:'1.0'}));
  location.href='tronlinkoutside://pull.activity?param='+param;
  setTimeout(function(){ /* لم يُفتح التطبيق */ 
    toast('إن لم يُفتح TronLink: افتح التطبيق ← Discover ← الصق رابط الموقع',true);
  },1600);
}

/* ── واجهة ── */
function setBtnLoading(id,on){ var b=$(id); if(b){b.disabled=on;b.classList.toggle('loading',on);} }
function render(){
  var connected=!!S.addr;
  $('vDisc').style.display=connected?'none':'block';
  $('vConn').style.display=connected?'block':'none';
  if(connected){
    $('addrShort').textContent=shortAddr(S.addr);
    $('netBadge').textContent=net().label;
    $('netBadge').className='net-badge'+(S.net!=='mainnet'?' test':'');
    $('modeBadge').style.display=S.live?'none':'inline-flex';
    var scanA=$('scanLink'); if(scanA) scanA.href=net().scan+'/address/'+S.addr;
  }
}

function boot(){
  /* استرجاع عنوان محفوظ → وضع عرض، ثم ترقية إلى live إذا كان TronLink حاضرًا */
  var saved=localStorage.getItem(CFG.storageKey);
  if(saved&&isTronAddress(saved)){ S.addr=saved; S.net=detectNet(); S.live=false; }
  /* ترقية تلقائية عند حقن TronLink */
  var upgrade=function(){
    var a=window.tronWeb&&window.tronWeb.defaultAddress&&window.tronWeb.defaultAddress.base58;
    if(a){ S.addr=a; S.live=true; S.net=detectNet(); localStorage.setItem(CFG.storageKey,a); render(); refresh(); }
  };
  window.addEventListener('message',function(ev){
    var m=ev.data&&ev.data.message;
    if(m&&(m.action==='setAccount'||m.action==='accountsChanged'||m.action==='connect')) upgrade();
    if(m&&m.action==='setNode'){ S.net=detectNet(); render(); refresh(); }
  });
  setTimeout(upgrade,600);
  render(); if(S.addr) refresh();
  setInterval(function(){ if(S.addr&&!document.hidden) refresh(); },45000);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden&&S.addr) refresh(); });
  if(window.Notification&&Notification.permission==='default')
    setTimeout(function(){ try{Notification.requestPermission();}catch(e){} },4000);

  $('btnConnect').addEventListener('click',connect);
  $('btnConnect2') && $('btnConnect2').addEventListener('click',connect);
  $('btnRefresh').addEventListener('click',refresh);
  $('btnCopy').addEventListener('click',copyAddr);
  $('btnCopy2').addEventListener('click',copyAddr);
  $('btnReceive').addEventListener('click',openReceive);
  $('btnQR').addEventListener('click',openReceive);
  $('btnSend').addEventListener('click',openSend);
  $('sendReview').addEventListener('click',reviewSend);
  $('sendBack').addEventListener('click',function(){$('sendConfirm').style.display='none';$('sendForm').style.display='block';});
  $('sendGo').addEventListener('click',doSend);
  $('sendMax').addEventListener('click',function(){ $('sendAmt').value=($('usdtBal').textContent||'').replace(/,/g,''); });
  $('btnPdf').addEventListener('click',makeReceipt);
  $('btnDisc').addEventListener('click',disconnect);
  $('btnTLOpen').addEventListener('click',openInTronLink);
  $('btnManual').addEventListener('click',function(){ $('addrModal').classList.add('on'); setTimeout(function(){$('manualAddr').focus();},250); });
  $('btnManualGo').addEventListener('click',function(){
    var a=($('manualAddr').value||'').trim();
    if(!isTronAddress(a)){ toast('عنوان TRON غير صالح — يبدأ بـ T ويتكون من 34 حرفًا',true); return; }
    $('addrModal').classList.remove('on');
    onConnected(a,false);
    toast('تم الربط في وضع العرض ✓');
  });
  document.querySelectorAll('[data-close]').forEach(function(el){
    el.addEventListener('click',function(){ $(el.dataset.close).classList.remove('on'); });
  });
  document.querySelectorAll('.modal').forEach(function(m){
    m.addEventListener('click',function(e){ if(e.target===m) m.classList.remove('on'); });
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
window.ArkanWallet={refresh:refresh,state:function(){return {addr:S.addr,net:S.net,live:S.live};}};
})();
