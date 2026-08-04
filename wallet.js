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

/* ── الإرسال — يُفعّل في المرحلة الثانية بعد اختبار الاستقبال ── */
function sendSoon(){ toast('الإرسال يُفعّل في المرحلة الثانية بعد اختبار الاستقبال على الشبكة'); }

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

  $('btnConnect').addEventListener('click',connect);
  $('btnConnect2') && $('btnConnect2').addEventListener('click',connect);
  $('btnRefresh').addEventListener('click',refresh);
  $('btnCopy').addEventListener('click',copyAddr);
  $('btnCopy2').addEventListener('click',copyAddr);
  $('btnReceive').addEventListener('click',openReceive);
  $('btnQR').addEventListener('click',openReceive);
  $('btnSend').addEventListener('click',sendSoon);
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
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
window.ArkanWallet={refresh:refresh,state:function(){return {addr:S.addr,net:S.net,live:S.live};}};
})();
