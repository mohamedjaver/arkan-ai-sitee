/* ═══ BDL · bdl-cycle.js — دورة USDT (1392) ═══
   الزبون يدفع كوانزا ويستلم أوقية · المورد الأنغولي يحوّل الكوانزا إلى USDT · مشتري دبي يدفع أوقية مقابل USDT.
   تُحفظ الدورة في meta.cycle على عمليات التسوية نفسها — لا جداول جديدة ولا مساس بالتسعير. */
(function(){'use strict';
  var CY=window.__CYC={c:null,open:false,busy:false,arm:null};
  function $(id){return document.getElementById(id);}
  function n(v){var x=parseFloat(String(v==null?'':v).replace(/[^\d.]/g,''));return isFinite(x)?x:0;}
  function f(v,d){return Number(v||0).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function say(m){try{toast(m);}catch(e){}}
  function ops(){try{return selected()||[];}catch(e){return [];}}
  function blank(){return {id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),rs:0,ru:0,usdt:[],mru:[]};}
  /* أسعار الأوقية تُكتب كما تتفاوض (قديمة 434.2 / 0.371) وتُحوَّل تلقائيًا إلى MRU */
  function ruNew(v){v=n(v);return v>=100?v/10:v;}
  function sum(a){return (a||[]).reduce(function(s,x){return s+(Number(x.a)||0);},0);}
  /* حساب الدورة — دالة صافية تُستخدم في البطاقة وفي «كل الدورات» */
  function calc(c,aoa,mruCust){var rs=n(c.rs),ru=ruNew(c.ru),o={rs:rs,ru:ru,aoa:aoa||0,mruCust:mruCust||0,ok:rs>0&&ru>0};
    o.rc=(aoa>0&&mruCust>0)?mruCust/aoa:0;                 /* سعر الزبون MRU لكل كوانزا */
    o.cost=o.ok?ru/rs:0;                                   /* ما تجلبه كل كوانزا فعلًا من دبي */
    o.margin=(o.ok&&o.rc>0)?(o.cost-o.rc)/o.rc*100:0;
    o.usdtExp=(rs>0&&aoa>0)?aoa/rs:0;
    o.mruExp=o.usdtExp*ru;
    o.profitExp=(o.ok&&aoa>0&&mruCust>0)?o.mruExp-mruCust:0;
    o.usdtGot=sum(c.usdt);o.mruGot=sum(c.mru);
    o.usdtLeft=Math.max(0,o.usdtExp-o.usdtGot);o.mruLeft=Math.max(0,o.mruExp-o.mruGot);
    o.done=o.ok&&o.mruExp>0&&o.mruGot>=o.mruExp*0.995;
    o.profitReal=o.mruGot-mruCust;
    return o;}
  CY.calc=calc;
  function base(){var s=ops(),aoa=0,mru=0,okPair=true;
    try{aoa=(typeof SS!=='undefined'&&SS.dueCcy==='AOA')?Number(SS.due)||0:0;}catch(e){}
    s.forEach(function(t){if(t.ccy==='MRU')mru+=Number(t.amount)||0;else okPair=false;});
    return {aoa:aoa,mru:mru,ok:okPair&&s.length>0};}
  var CSS='#cyBox{margin:10px 0;border:1px solid #C9D6EA;background:#fff;font-family:inherit}#cyBox *{box-sizing:border-box}'
    +'#cyBox .hd{display:flex;align-items:center;gap:8px;padding:11px 12px;background:#0B2447;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent}#cyBox .hd b{font-size:13.5px;font-weight:800}#cyBox .hd span{flex:1;min-width:0;font-size:11.5px;font-weight:700;color:#F2C65A;text-align:end;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#cyBox .hd i{font-style:normal;font-size:11px;opacity:.8}'
    +'#cyBox .bd{padding:12px}#cyBox .in{display:grid;grid-template-columns:1fr 1fr;gap:8px}#cyBox label{display:block;font-size:11px;font-weight:800;color:#5C7699;margin-bottom:4px}'
    +'#cyBox input{width:100%;height:46px;border:1.5px solid #B9C8DE;border-radius:0;background:#fff;padding:0 10px;font-family:"IBM Plex Mono",monospace;font-size:16px;font-weight:700;color:#0B2447;direction:ltr;text-align:center;outline:none}#cyBox input:focus{border-color:#0A56B8}'
    +'#cyBox .hint{font-size:10.5px;color:#8A6100;margin-top:3px;min-height:14px;direction:rtl}'
    +'#cyBox .kp{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:#DCE4EF;border:1px solid #DCE4EF;margin-top:10px}#cyBox .kp div{background:#F7FAFF;padding:9px 6px;text-align:center}#cyBox .kp small{display:block;font-size:10px;font-weight:800;color:#5C7699}#cyBox .kp b{display:block;margin-top:3px;font-family:"IBM Plex Mono",monospace;font-size:14px;color:#0B2447;direction:ltr}#cyBox .kp b.g{color:#0B7A3B}#cyBox .kp b.r{color:#B00020}'
    +'#cyBox .pf{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-top:10px;padding:11px 12px;background:#0B2F70;color:#fff}#cyBox .pf span{font-size:12px;font-weight:800}#cyBox .pf b{font-family:"IBM Plex Mono",monospace;font-size:17px;direction:ltr}#cyBox .pf.neg{background:#B00020}'
    +'#cyBox .lg{margin-top:12px;border:1px solid #DCE4EF}#cyBox .lg .t{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;background:#F2F6FC;font-size:12px;font-weight:800;color:#0B2447}#cyBox .lg .t b{font-family:"IBM Plex Mono",monospace;direction:ltr}#cyBox .lg .br{height:6px;background:#F6E3B0}#cyBox .lg .br i{display:block;height:100%;background:#0E8F5B}'
    +'#cyBox .lg .rw{display:flex;align-items:center;gap:8px;padding:7px 10px;border-top:1px solid #EEF2F8;font-size:12px}#cyBox .lg .rw b{font-family:"IBM Plex Mono",monospace;font-size:13.5px;color:#0B2447;direction:ltr}#cyBox .lg .rw span{flex:1;min-width:0;color:#5C7699;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#cyBox .lg .rw button{flex:none;height:30px;padding:0 9px;border:1px solid #B00020;background:#fff;color:#B00020;font-family:inherit;font-weight:800;font-size:11px;cursor:pointer}#cyBox .lg .rw button.arm{background:#B00020;color:#fff}'
    +'#cyBox .ad{display:grid;grid-template-columns:1fr 1.2fr auto;gap:6px;padding:8px 10px;border-top:1px solid #EEF2F8}#cyBox .ad input{height:42px;font-size:14px}#cyBox .ad input.tx{font-family:inherit;font-size:12.5px;font-weight:600;direction:rtl;text-align:start}#cyBox .ad button{height:42px;padding:0 14px;border:0;background:#0B2F70;color:#fff;font-family:inherit;font-weight:800;font-size:12.5px;cursor:pointer}'
    +'#cyBox .all{display:block;width:100%;height:44px;margin-top:12px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer}#cyBox .nt{font-size:11.5px;color:#5C7699;line-height:1.7;margin-top:8px}'
    +'#cyAll{position:fixed;inset:0;z-index:100050;background:#F4F7FB;display:flex;flex-direction:column;font-family:inherit}#cyAll .th{display:flex;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 14px 12px;background:#0B2447;color:#fff}#cyAll .th b{flex:1;font-size:15px}#cyAll .th button{height:38px;padding:0 14px;border:1px solid rgba(255,255,255,.6);background:transparent;color:#fff;font-family:inherit;font-weight:800;font-size:12.5px;cursor:pointer}'
    +'#cyAll .sc{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:12px 12px calc(20px + env(safe-area-inset-bottom))}#cyAll .tot{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#DCE4EF;border:1px solid #DCE4EF;margin-bottom:12px}#cyAll .tot div{background:#fff;padding:11px 8px;text-align:center}#cyAll .tot small{display:block;font-size:10.5px;font-weight:800;color:#5C7699}#cyAll .tot b{display:block;margin-top:4px;font-family:"IBM Plex Mono",monospace;font-size:15px;color:#0B2447;direction:ltr}'
    +'#cyAll .cd{background:#fff;border:1px solid #DCE4EF;border-inline-start:5px solid #E0A300;margin-bottom:10px;padding:11px 12px}#cyAll .cd.dn{border-inline-start-color:#0E8F5B}#cyAll .cd .h{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:800;color:#0B2447}#cyAll .cd .h span{font-size:11px;color:#5C7699;font-weight:700}#cyAll .cd .l{display:flex;justify-content:space-between;gap:8px;margin-top:7px;font-size:12px;color:#3A4F6E}#cyAll .cd .l b{font-family:"IBM Plex Mono",monospace;color:#0B2447;direction:ltr}#cyAll .cd .l b.a{color:#8A6100}#cyAll .cd .l b.g{color:#0B7A3B}#cyAll .cd .l b.r{color:#B00020}#cyAll .em{padding:40px 16px;text-align:center;color:#5C7699;font-size:13px}';
  function css(){if($('cyCss'))return;var s=document.createElement('style');s.id='cyCss';s.textContent=CSS;document.head.appendChild(s);}
  function box(){var b=$('cyBox');if(b)return b;var rb=$('ssRateBox');if(!rb||!rb.parentNode)return null;css();b=document.createElement('div');b.id='cyBox';rb.parentNode.insertBefore(b,rb.nextSibling);
    b.addEventListener('click',onClick);b.addEventListener('input',onInput);b.addEventListener('change',onChange);return b;}
  function logH(key,title,unit,list,exp,dec,ph){var got=sum(list),pc=exp>0?Math.min(100,Math.round(got/exp*100)):0;
    var h='<div class="lg"><div class="t"><span>'+title+'</span><b>'+f(got,dec)+(exp>0?' / '+f(exp,dec):'')+' '+unit+'</b></div><div class="br"><i style="width:'+pc+'%"></i></div>';
    (list||[]).forEach(function(x,i){var d=x.t?new Date(x.t):null,ds=d?(('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)):'';
      h+='<div class="rw"><b>'+f(x.a,dec)+'</b><span>'+esc(x.n||'')+(ds?' · '+ds:'')+'</span><button type="button" data-a="del" data-k="'+key+'" data-i="'+i+'"'+(CY.arm===key+i?' class="arm"':'')+'>'+(CY.arm===key+i?'تأكيد الحذف':'حذف')+'</button></div>';});
    h+='<div class="ad"><input inputmode="decimal" data-k="'+key+'" data-f="a" placeholder="المبلغ"><input class="tx" data-k="'+key+'" data-f="n" placeholder="'+ph+'"><button type="button" data-a="add" data-k="'+key+'">إضافة</button></div></div>';return h;}
  function render(keep){var b=box();if(!b)return;var bs=base(),c=CY.c;
    if(!bs.ok||!c){b.style.display='none';return;}b.style.display='';
    var k=calc(c,bs.aoa,bs.mru),hd;
    if(!k.ok)hd='أدخل سعر المورد وسعر دبي';
    else if(!k.rc)hd='تكلفتك '+f(k.cost*10,4);
    else hd='هامش '+f(k.margin,2)+'% · ربح '+f(k.profitExp,0)+' MRU';
    if(keep){ /* تحديث الأرقام دون إعادة بناء الحقول أثناء الكتابة */
      var q=function(s){return b.querySelector(s);};
      if(q('.hd span'))q('.hd span').textContent=hd;if(q('#cyK'))q('#cyK').innerHTML=kp(k);if(q('#cyP'))q('#cyP').outerHTML=pf(k);
      if(q('#cyHu'))q('#cyHu').textContent=ruHint(c.ru);return;}
    var h='<div class="hd" data-a="tg"><b>دورة USDT</b><span>'+esc(hd)+'</span><i>'+(CY.open?'▴':'▾')+'</i></div>';
    if(CY.open){h+='<div class="bd"><div class="in"><div><label>سعر المورد — كوانزا لكل USDT</label><input inputmode="decimal" data-r="rs" value="'+(c.rs||'')+'" placeholder="1160"><div class="hint"></div></div>'
        +'<div><label>سعر دبي — أوقية لكل USDT</label><input inputmode="decimal" data-r="ru" value="'+(c.ru||'')+'" placeholder="434.2"><div class="hint" id="cyHu">'+ruHint(c.ru)+'</div></div></div>'
        +'<div class="kp" id="cyK">'+kp(k)+'</div>'+pf(k)
        +logH('usdt','USDT مستلم من المورد','USDT',c.usdt,k.usdtExp,2,'المورد / رقم التحويل')
        +logH('mru','أوقية مستلمة من دبي','MRU',c.mru,k.mruExp,0,'المشتري / ملاحظة')
        +(k.done?'<div class="pf'+(k.profitReal<0?' neg':'')+'" style="background:#0E8F5B"><span>الربح الفعلي — اكتملت الدورة</span><b>'+f(k.profitReal,0)+' MRU</b></div>':'')
        +'<button type="button" class="all" data-a="all">كل الدورات — المفتوحة والمكتملة</button>'
        +'<div class="nt">المبالغ بالأوقية الجديدة MRU كما في رأس التسوية. اكتب الأسعار كما تتفاوض (434.2 أو 43.42) والنظام يوحّدها.</div></div>';}
    b.innerHTML=h;}
  function ruHint(v){v=n(v);return v>=100?'= '+f(v/10,3)+' MRU لكل USDT':'';}
  function kp(k){return '<div><small>سعر الزبون</small><b>'+(k.rc?f(k.rc*10,4):'—')+'</b></div><div><small>تكلفتك (أعلى سعر تعرضه)</small><b>'+(k.ok?f(k.cost*10,4):'—')+'</b></div><div><small>الهامش</small><b class="'+(k.margin<0?'r':'g')+'">'+(k.ok&&k.rc?f(k.margin,2)+'%':'—')+'</b></div>';}
  function pf(k){return '<div id="cyP" class="pf'+(k.profitExp<0?' neg':'')+'"><span>'+(k.profitExp<0?'خسارة متوقعة':'الربح المتوقع')+'</span><b>'+(k.ok&&k.rc?f(k.profitExp,0)+' MRU':'—')+'</b></div>';}
  async function save(){var s=ops(),c=CY.c;if(!s.length||!c)return false;if(CY.busy){CY.again=true;return true;}CY.busy=true;var ok=true;
    try{c.upd=new Date().toISOString();var snap=JSON.parse(JSON.stringify(c));
      for(var i=0;i<s.length;i++){var t=s[i],nm=Object.assign({},t.meta||{},{cycle:snap});
        var r=await fetch(SB+'/bdl_transactions?id=eq.'+encodeURIComponent(t.id),{method:'PATCH',headers:H(),body:JSON.stringify({meta:nm})});
        if(r.ok)t.meta=nm;else ok=false;}}catch(e){ok=false;}
    CY.busy=false;if(CY.again){CY.again=false;return save();}
    if(!ok)say('تعذّر حفظ الدورة — تحقق من الاتصال');return ok;}
  function onInput(e){var i=e.target;if(!i.dataset||!i.dataset.r||!CY.c)return;CY.c[i.dataset.r]=n(i.value);render(true);}
  function onChange(e){var i=e.target;if(i.dataset&&i.dataset.r)save();}
  async function onClick(e){var a=e.target.closest('[data-a]');if(!a||!CY.c)return;var act=a.dataset.a,k=a.dataset.k,b=$('cyBox');
    if(act==='tg'){CY.open=!CY.open;CY.arm=null;render();return;}
    if(act==='all'){openAll();return;}
    if(act==='add'){var ia=b.querySelector('input[data-k="'+k+'"][data-f="a"]'),inn=b.querySelector('input[data-k="'+k+'"][data-f="n"]'),v=n(ia.value);
      if(!(v>0)){say('اكتب المبلغ أولًا');ia.focus();return;}
      CY.c[k]=(CY.c[k]||[]).concat([{a:v,n:String(inn.value||'').trim().slice(0,80),t:new Date().toISOString()}]);CY.arm=null;render();
      if(await save())say('سُجّل '+f(v,k==='usdt'?2:0)+' '+(k==='usdt'?'USDT':'MRU')+' ✓');return;}
    if(act==='del'){var key=k+a.dataset.i;if(CY.arm!==key){CY.arm=key;render();return;}
      CY.c[k].splice(+a.dataset.i,1);CY.arm=null;render();await save();return;}}
  function load(){var s=ops(),c=null;s.forEach(function(t){var x=t.meta&&t.meta.cycle;if(x&&(!c||String(x.upd||'')>String(c.upd||'')))c=x;});
    CY.c=c?JSON.parse(JSON.stringify(c)):blank();CY.c.usdt=CY.c.usdt||[];CY.c.mru=CY.c.mru||[];CY.open=false;CY.arm=null;render();}
  /* ── كل الدورات: متابعة الأرجل الثلاث لكل دورة ── */
  async function openAll(){css();var d=$('cyAll');if(d)d.parentNode.removeChild(d);d=document.createElement('div');d.id='cyAll';
    d.innerHTML='<div class="th"><b>كل الدورات</b><button type="button">إغلاق</button></div><div class="sc"><div class="em">جارٍ التحميل…</div></div>';
    d.querySelector('button').onclick=function(){d.parentNode.removeChild(d);};document.body.appendChild(d);
    var sc=d.querySelector('.sc');
    try{var sel='select=id,amount,ccy,settle_amount,settle_ccy,status,meta,created_at,customer_id&order=created_at.desc',rows=null;
      var r=await fetch(SB+'/bdl_transactions?'+sel+'&meta->cycle=not.is.null&limit=600',{headers:H()});
      if(r.ok)rows=await r.json();else{r=await fetch(SB+'/bdl_transactions?'+sel+'&limit=800',{headers:H()});rows=r.ok?await r.json():[];}
      rows=rows.filter(function(t){return t.meta&&t.meta.cycle&&t.meta.cycle.id;});
      var names={};try{var ids=[];rows.forEach(function(t){if(t.customer_id&&ids.indexOf(t.customer_id)<0)ids.push(t.customer_id);});
        if(ids.length){var rc=await fetch(SB+'/bdl_customers?select=id,name&id=in.('+ids.slice(0,150).join(',')+')',{headers:H()});if(rc.ok)(await rc.json()).forEach(function(x){names[x.id]=x.name;});}}catch(e){}
      sc.innerHTML=allH(group(rows),names);}catch(e){sc.innerHTML='<div class="em">تعذّر التحميل — تحقق من الاتصال</div>';}}
  function group(rows){var g={},ord=[];rows.forEach(function(t){var c=t.meta.cycle,x=g[c.id];if(!x){x=g[c.id]={c:c,aoa:0,mru:0,paid:0,cust:t.customer_id,at:t.created_at,settled:true};ord.push(c.id);}
      if(String(c.upd||'')>String(x.c.upd||''))x.c=c;
      if(t.ccy==='MRU')x.mru+=Number(t.amount)||0;if((t.settle_ccy||'AOA')==='AOA')x.aoa+=Number(t.settle_amount)||0;
      x.paid+=Number(t.meta.paid_aoa)||0;if(t.status!=='settled')x.settled=false;if(t.created_at<x.at)x.at=t.created_at;});
    return ord.map(function(id){var x=g[id];x.k=calc(x.c,x.aoa,x.mru);return x;});}
  CY.group=group;
  function allH(list,names){if(!list.length)return '<div class="em">لا توجد دورات بعد — افتح تسوية وأدخل سعر المورد وسعر دبي في بطاقة «دورة USDT».</div>';
    var open=list.filter(function(x){return !x.k.done;}),uL=0,mL=0,pE=0,pR=0;
    list.forEach(function(x){if(!x.k.done){uL+=x.k.usdtLeft;mL+=x.k.mruLeft;pE+=x.k.profitExp;}else pR+=x.k.profitReal;});
    var h='<div class="tot"><div><small>دورات مفتوحة</small><b>'+open.length+' / '+list.length+'</b></div><div><small>ربح متوقع (المفتوحة)</small><b>'+f(pE,0)+' MRU</b></div><div><small>USDT باقٍ عند الموردين</small><b>'+f(uL,2)+'</b></div><div><small>أوقية باقية من دبي</small><b>'+f(mL,0)+'</b></div><div style="grid-column:1/3"><small>ربح فعلي (المكتملة)</small><b>'+f(pR,0)+' MRU</b></div></div>';
    list.forEach(function(x){var k=x.k,d=new Date(x.at),ds=('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear(),cp=x.aoa>0?Math.round(x.paid/x.aoa*100):0;
      h+='<div class="cd'+(k.done?' dn':'')+'"><div class="h"><b>'+esc(names[x.cust]||'زبون')+'</b><span>'+ds+' · '+(k.done?'مكتملة':'مفتوحة')+'</span></div>'
        +'<div class="l"><span>الزبون — كوانزا مدفوعة</span><b class="'+(cp>=100?'g':'a')+'">'+f(x.paid,0)+' / '+f(x.aoa,0)+'</b></div>'
        +'<div class="l"><span>المورد — USDT @ '+f(k.rs,0)+'</span><b class="'+(k.usdtLeft<1?'g':'a')+'">'+f(k.usdtGot,2)+' / '+f(k.usdtExp,2)+'</b></div>'
        +'<div class="l"><span>دبي — أوقية @ '+f(k.ru,2)+'</span><b class="'+(k.done?'g':'a')+'">'+f(k.mruGot,0)+' / '+f(k.mruExp,0)+'</b></div>'
        +'<div class="l"><span>'+(k.done?'الربح الفعلي':'الربح المتوقع')+' · هامش '+f(k.margin,2)+'%</span><b class="'+((k.done?k.profitReal:k.profitExp)<0?'r':'g')+'">'+f(k.done?k.profitReal:k.profitExp,0)+' MRU</b></div></div>';});
    return h;}
  CY.allH=allH;
  function init(){var ov=$('ovl-settle');if(!ov)return;var was=false;
    new MutationObserver(function(){var on=ov.classList.contains('on');if(on&&!was){was=true;setTimeout(load,350);}else if(!on&&was){was=false;CY.c=null;}}).observe(ov,{attributes:true,attributeFilter:['class']});
    var due=$('ssDue');if(due)new MutationObserver(function(){if(CY.c&&!document.activeElement.closest('#cyBox'))render();}).observe(due,{childList:true,characterData:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
