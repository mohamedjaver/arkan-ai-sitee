/* ARKAN Wallet Badge — شارة المحفظة الحية عبر الموقع
   يقرأ العنوان المحفوظ محليًا؛ إن وُجد يعرض: 🟢 الرصيد + العنوان المختصر → wallet.html
   بدون مفاتيح، بدون تخزين حساس. */
(function(){
'use strict';
var ADDR_KEY='arkan_wallet_addr', BAL_KEY='arkan_wallet_lastbal';
var USDT='TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', GRID='https://api.trongrid.io';
var addr=null;
try{ addr=localStorage.getItem(ADDR_KEY); }catch(e){}
var isBsc=/^0x[0-9a-fA-F]{40}$/.test(addr||'');
if(!addr||(!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)&&!isBsc)) return;

var short=addr.slice(0,4)+'…'+addr.slice(-4);
var fmt=function(n){ return Number.isFinite(n)? n.toLocaleString('en-US',{maximumFractionDigits:n>=1000?0:2}) : '…'; };

function ensureChip(){
  var chip=document.getElementById('wChip');
  if(!chip){
    chip=document.createElement('a');
    chip.id='wChip'; chip.href='wallet.html';
    document.body.appendChild(chip);
  }else if(chip.parentNode!==document.body){
    document.body.appendChild(chip); /* أخرجه من الهيدر كي لا يتداخل مع الشعار */
  }
  /* التنسيق يُطبَّق دائمًا: مثبت تحت الشريط العلوي، في المنتصف */
  chip.style.cssText='position:fixed;top:calc(env(safe-area-inset-top,0px) + 76px);left:50%;transform:translateX(-50%);z-index:59;'+
    'display:inline-flex;align-items:center;gap:8px;text-decoration:none;white-space:nowrap;'+
    'background:rgba(7,20,52,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);'+
    'border:1px solid rgba(92,255,177,.35);border-radius:999px;padding:7px 13px;'+
    'color:#EAF5FF;font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;font-size:12px;font-weight:600;'+
    'box-shadow:0 8px 24px rgba(0,20,60,.35)';
  chip.hidden=false; chip.removeAttribute('hidden'); chip.style.display='inline-flex';
  chip.innerHTML='<span class="wdot" style="width:8px;height:8px;border-radius:50%;background:#5CFFB1;'+
    'box-shadow:0 0 8px #5CFFB1;animation:wblink 2s infinite"></span>'+
    '<b id="wChipBal" style="font-variant-numeric:tabular-nums;direction:ltr">…</b>'+
    '<span style="opacity:.75">USDT · '+(isBsc?'BEP20':'TRC20')+'</span>'+
    '<span style="opacity:.55;font-size:10.5px;direction:ltr">'+short+'</span>'+
    '<span id="wChipX" title="فصل المحفظة" style="margin-inline-start:2px;width:18px;height:18px;border-radius:50%;'+
    'display:grid;place-items:center;background:rgba(255,255,255,.12);font-size:11px;line-height:1">✕</span>';
  var x=chip.querySelector('#wChipX');
  if(x) x.addEventListener('click',function(ev){
    ev.preventDefault(); ev.stopPropagation();
    if(!confirm('فصل المحفظة من هذا الجهاز؟ أموالك تبقى في محفظتك على البلوكتشين.')) return;
    try{localStorage.removeItem(ADDR_KEY);localStorage.removeItem(BAL_KEY);}catch(e){}
    chip.remove();
  });
  if(!document.getElementById('wChipCss')){
    var st=document.createElement('style'); st.id='wChipCss';
    st.textContent='@keyframes wblink{50%{opacity:.35}}';
    document.head.appendChild(st);
  }
  return chip;
}

function setBal(v){
  var b=document.getElementById('wChipBal'); if(b)b.textContent=fmt(v);
  /* بطاقة قسم المحفظة في الرئيسية → رصيدك الحقيقي بدل النموذج */
  var amt=document.querySelector('.wkard .wamt');
  if(amt) amt.innerHTML=Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'<small>USDT</small>';
  var lbl=document.querySelector('.wkard .wlbl');
  if(lbl) lbl.textContent='ARKAN WALLET · محفظتك';
  var ad=document.querySelector('.wkard .waddr');
  if(ad) ad.textContent='⧉  '+addr.slice(0,6)+'····'+addr.slice(-6);
}

async function loadBal(){
  /* كاش 5 دقائق ثم تحديث من الشبكة */
  try{
    var c=JSON.parse(localStorage.getItem(BAL_KEY)||'null');
    if(c&&typeof c.u==='number'){ setBal(c.u); if(Date.now()-c.at<300000) return; }
  }catch(e){}
  try{
    var u=0;
    if(isBsc){
      var data='0x70a08231'+addr.slice(2).toLowerCase().padStart(64,'0');
      var rb=await fetch('https://bsc-dataseed.bnbchain.org',{method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',
          params:[{to:'0x55d398326f99059fF775485246999027B3197955',data:data},'latest']})});
      var xb=await rb.json(); u=parseInt(xb.result,16)/1e18||0;
      setBal(u);
      localStorage.setItem(BAL_KEY,JSON.stringify({u:u,t:0,at:Date.now()}));
    }else{
      var r=await fetch(GRID+'/v1/accounts/'+addr,{headers:{accept:'application/json'}});
      var j=await r.json(); var acc=j.data&&j.data[0];
      if(acc&&acc.trc20) acc.trc20.forEach(function(o){ var k=Object.keys(o)[0]; if(k===USDT) u=Number(o[k])/1e6; });
      setBal(u);
      localStorage.setItem(BAL_KEY,JSON.stringify({u:u,t:acc?(acc.balance||0)/1e6:0,at:Date.now()}));
    }
  }catch(e){}
}

function boot(){ ensureChip(); loadBal(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
