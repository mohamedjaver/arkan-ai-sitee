/* bdl-cycles-page.js — صفحة «الدورات» (Build 1406 · 1407 المركز المكشوف ومقارنة الهامش): تحل محل تبويب «العمليات» كاملًا.
   طبقة عرض فوق bdl-cycle.js: تقرأ الدورات المحفوظة في meta.cycle وتعرضها كبطاقات بثلاث محطات
   (الزبون كوانزا ← المورد USDT ← دبي أوقية)، مع مؤشرات إجمالية وفلاتر. لا تغيّر أي حساب ولا أي حفظ. */
(function(){'use strict';
  var P={rows:[],names:{},list:[],f:'run',busy:false,at:0};
  function $(i){return document.getElementById(i);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function f(v,d){return Number(v||0).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});}
  function say(m){try{toast(m);}catch(e){}}
  function CY(){return window.__CYC||{};}
  function css(){if($('cypCss'))return;var s=document.createElement('style');s.id='cypCss';s.textContent=
    '#v-ops.cyp>#opsDash,#v-ops.cyp>.fbar,#v-ops.cyp>#opList,#v-ops.cyp>#opBridge,#v-ops.cyp #cyHub{display:none!important}'+
    '#cyPage{padding-bottom:90px}'+
    '#cyPage .hd{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:2px 0 12px}#cyPage .hd h2{margin:0;font-size:20px;font-weight:800;color:#0B2447}#cyPage .hd p{margin:3px 0 0;font-size:12px;color:#5C7699}'+
    '#cyPage .hd .ac{display:flex;gap:6px;flex:none}#cyPage .hd button{height:38px;padding:0 12px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;font-weight:800;font-size:12px;cursor:pointer}#cyPage .hd button.nv{background:#0B2F70;color:#fff}'+
    '#cyPage .kp{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}#cyPage .kp>div{background:#fff;border:1px solid var(--line);border-inline-start:5px solid #2F6FD0;padding:11px 12px;min-width:0}'+
    '#cyPage .kp small{display:block;font-size:11px;font-weight:700;color:#5C7699}#cyPage .kp b{display:block;margin-top:4px;font-family:"IBM Plex Mono",monospace;font-size:18px;color:#0B2447;direction:ltr;text-align:start;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#cyPage .kp b i{font-style:normal;font-size:11px;color:#5C7699;font-weight:600}'+
    '#cyPage .kp .g{border-inline-start-color:#0E8F5B}#cyPage .kp .g b{color:#0B7A3B}#cyPage .kp .a{border-inline-start-color:#E0A300}#cyPage .kp .w{grid-column:1/3;background:#0B2F70;border-color:#0B2F70}#cyPage .kp .w small{color:rgba(255,255,255,.75)}#cyPage .kp .w b{color:#fff;font-size:22px}#cyPage .kp .w b i{color:rgba(255,255,255,.7)}'+
    '#cyPage .fl{display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;-webkit-overflow-scrolling:touch}#cyPage .fl button{flex:none;height:38px;padding:0 14px;border:1.5px solid #C9D6EA;background:#fff;color:#0B2F70;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer;white-space:nowrap}#cyPage .fl button.on{background:#0B2F70;border-color:#0B2F70;color:#fff}#cyPage .fl button span{font-family:"IBM Plex Mono",monospace;margin-inline-start:6px;opacity:.8}'+
    '#cyPage .sec{margin:16px 0 8px;font-size:12.5px;font-weight:800;color:#5C7699;display:flex;align-items:center;gap:8px}#cyPage .sec:after{content:"";flex:1;height:1px;background:var(--line)}'+
    '#cyPage .cd{background:#fff;border:1px solid var(--line);border-inline-start:5px solid #2F6FD0;margin-bottom:10px;box-shadow:0 2px 10px rgba(11,47,112,.05)}#cyPage .cd.dn{border-inline-start-color:#0E8F5B}#cyPage .cd.nw{border-inline-start-color:#E0A300}'+
    '#cyPage .ch{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:13px 14px 4px}#cyPage .ch b{display:block;font-size:16px;font-weight:800;color:#0B2447}#cyPage .ch small{display:block;margin-top:3px;font-size:11.5px;color:#5C7699}'+
    '#cyPage .bd{flex:none;font-size:10.5px;font-weight:800;padding:4px 9px}#cyPage .bd.o{background:#E8F0FD;color:#0B2F70}#cyPage .bd.d{background:#DDF3E5;color:#0B7A3B}#cyPage .bd.n{background:#FFF1CC;color:#8A6100}'+
    '#cyPage .cd .trk3{background:none;border:0;padding:8px 8px 0}#cyPage .cd .trk3 .st3{width:104px}'+
    '#cyPage .lg{padding:6px 14px 2px}#cyPage .lg>div{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;padding:6px 0;border-top:1px dashed var(--line)}#cyPage .lg span{font-size:12px;color:#5C7699}#cyPage .lg b{font-family:"IBM Plex Mono",monospace;font-size:12.5px;color:#0B2447;direction:ltr}'+
    '#cyPage .lg i{grid-column:1/3;display:block;height:4px;background:#E3EAF4}#cyPage .lg i u{display:block;height:100%;background:#2F6FD0}#cyPage .lg .ok i u{background:#0E8F5B}#cyPage .lg .ok b{color:#0B7A3B}'+
    '#cyPage .ft{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px 13px;margin-top:4px;background:#F7F9FC;border-top:1px solid var(--line)}#cyPage .ft div small{display:block;font-size:11px;color:#5C7699}#cyPage .ft div b{display:block;font-family:"IBM Plex Mono",monospace;font-size:16px;color:#0B7A3B;direction:ltr;text-align:start}#cyPage .ft div b.r{color:#B00020}'+
    '#cyPage .ft button{flex:none;height:44px;padding:0 20px;border:0;background:#0B2F70;color:#fff;font-family:inherit;font-weight:800;font-size:13.5px;cursor:pointer}#cyPage .cd.nw .ft button{background:#0E8F5B}#cyPage .ft button:disabled{opacity:.5}'+
    '#cyPage .xp{background:#FFF1F2;border:1.5px solid #B00020;border-inline-start-width:6px;margin-bottom:12px}#cyPage .xp.hot{background:#B00020;color:#fff}#cyPage .xt{padding:11px 12px 8px}#cyPage .xt small{display:block;font-size:11.5px;font-weight:800;color:#B00020}#cyPage .xt b{display:block;font-family:"IBM Plex Mono",monospace;font-size:24px;color:#8A1A2B;direction:ltr;text-align:start;margin-top:2px}#cyPage .xt b i{font-style:normal;font-size:12px}#cyPage .xt span{display:block;font-size:11.5px;color:#8A1A2B;margin-top:2px}'+
    '#cyPage .xp.hot .xt small,#cyPage .xp.hot .xt b,#cyPage .xp.hot .xt span{color:#fff}'+
    '#cyPage .xl{display:flex;gap:6px;overflow-x:auto;padding:0 12px 11px;-webkit-overflow-scrolling:touch}#cyPage .xl button{flex:none;border:1px solid #E7B6BD;background:#fff;color:#8A1A2B;padding:6px 10px;font-family:"IBM Plex Mono",monospace;font-size:12.5px;font-weight:700;cursor:pointer;text-align:start;direction:ltr}#cyPage .xl button b{display:block;font-family:"IBM Plex Sans Arabic",sans-serif;font-size:11.5px;color:#0B2447;direction:rtl}#cyPage .xl button small{display:block;font-family:"IBM Plex Sans Arabic",sans-serif;font-size:10px;font-weight:600;color:#8A97AD;direction:rtl}'+
    '#cyPage .ex{display:flex;align-items:center;gap:8px;margin:6px 14px 0;padding:7px 10px;background:#FFF1F2;border:1px solid #F1C4CA}#cyPage .ex b{font-family:"IBM Plex Mono",monospace;font-size:12.5px;color:#B00020;direction:ltr}#cyPage .ex span{font-size:11.5px;color:#8A1A2B}'+
    '#cyPage .ft em{font-style:normal;font-weight:800;margin-inline-start:4px}#cyPage .ft em.up{color:#0B7A3B}#cyPage .ft em.dw{color:#B00020}'+
    '#cyPage .em{background:#fff;border:1px dashed #C9D6EA;padding:26px 14px;text-align:center;color:#5C7699;font-size:13px;line-height:1.8}#cyPage .up{font-size:10.5px;color:#8A97AD;text-align:center;margin-top:8px}';
    document.head.appendChild(s);}
  /* 1407: المركز المكشوف — USDT استُلم من المورد ولم يُبَع لدبي بعد (معرَّض لتحرك السعر). العمر بطريقة «الأقدم يُباع أولًا». */
  function heldOf(c){var ins=(c.usdt||[]).filter(function(e){return (e.d||'in')==='in';}).map(function(e){return {a:Number(e.a)||0,t:e.t?new Date(e.t).getTime():0};}).sort(function(a,b){return a.t-b.t;});
    var out=(c.usdt||[]).reduce(function(s,e){return s+((e.d||'in')==='out'?(Number(e.a)||0):0);},0),left=0,old=0;
    ins.forEach(function(e){var use=Math.min(e.a,out);out-=use;var r=e.a-use;if(r>0.5){left+=r;if(!old&&e.t)old=e.t;}});return {a:left,t:old};}
  function ageTxt(t){if(!t)return '';var h=Math.max(0,(Date.now()-t)/36e5);return h<1?'منذ أقل من ساعة':h<48?'منذ '+Math.round(h)+' ساعة':'منذ '+Math.round(h/24)+' يوم';}
  function avgMargin(L){var a=L.filter(function(x){return x.k.ok&&x.k.rc>0;}).sort(function(x,y){return String(y.at).localeCompare(String(x.at));}).slice(0,10);
    return a.length>=3?{v:a.reduce(function(s,x){return s+x.k.margin;},0)/a.length,n:a.length}:null;}
  function groups(){try{return (typeof GROUPS!=='undefined'?GROUPS:[]).filter(function(g){return g.ccy==='MRU';});}catch(e){return [];}}
  function pct(a,b){return b>0?Math.max(0,Math.min(100,Math.round(a/b*100))):0;}
  function leg(lab,a,b,d){var p=pct(a,b),ok=b>0&&a>=b*0.995;return '<div'+(ok?' class="ok"':'')+'><span>'+lab+'</span><b>'+f(a,d)+' / '+f(b,d)+'</b><i><u style="width:'+p+'%"></u></i></div>';}
  function cardCycle(x){var k=x.k,d=new Date(x.at),ds=('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
    var c1=x.aoa>0&&x.paid>=x.aoa*0.995,c2=k.usdtExp>0&&k.usdtGot>=k.usdtExp*0.995,cur=k.done?3:!c1?0:!c2?1:2,pf=k.done?k.profitReal:k.profitExp;
    var tr=typeof trk3==='function'?trk3(cur,['الزبون · كوانزا','المورد · USDT','دبي · أوقية'],[pct(x.paid,x.aoa)+'%',pct(k.usdtGot,k.usdtExp)+'%',pct(k.mruGot,k.mruExp)+'%'],!k.done,true):'';
    return '<div class="cd'+(k.done?' dn':'')+'"><div class="ch"><div><b>'+esc(P.names[x.cust]||'زبون')+'</b><small>'+ds+' · '+f(x.mru,0)+' MRU ↔ '+f(x.aoa,0)+' AOA</small></div><span class="bd '+(k.done?'d':'o')+'">'+(k.done?'مكتملة':'جارية')+'</span></div>'+(x.h&&x.h.a>=1&&!k.done?'<div class="ex"><b>مكشوف '+f(x.h.a,2)+' USDT</b><span>لم يُبَع لدبي بعد'+(x.h.t?' · '+ageTxt(x.h.t):'')+'</span></div>':'')+tr+
      '<div class="lg">'+leg('الزبون دفع كوانزا',x.paid,x.aoa,0)+leg('المورد سلّم USDT @ '+f(k.rs,0),k.usdtGot,k.usdtExp,2)+leg('USDT بِيع لدبي',k.usdtOut,k.usdtGot,2)+leg('دبي سلّمت أوقية @ '+f(k.ru,2),k.mruGot,k.mruExp,0)+leg('دُفع للزبون أوقية',k.mruOut,x.mru,0)+'</div>'+
      '<div class="ft"><div><small>'+(k.done?'الربح الفعلي':'الربح المتوقع')+' · هامش '+f(k.margin,2)+'%'+(P.avg&&k.ok&&k.rc>0?' <em class="'+(k.margin>=P.avg.v?'up':'dw')+'">'+(k.margin>=P.avg.v?'▲':'▼')+' '+f(Math.abs(k.margin-P.avg.v),2)+' عن المتوسط</em>':'')+'</small><b'+(pf<0?' class="r"':'')+'>'+f(pf,0)+' MRU</b></div><button type="button" data-c="'+esc(x.c.id)+'">فتح الدورة</button></div></div>';}
  function cardNew(g){var k=gKey(g);return '<div class="cd nw"><div class="ch"><div><b>'+esc(g.customer_name)+'</b><small>'+g.tx_count+' عمليات · '+f(g.total_amount,0)+' MRU'+(g.total_settle>0?' ↔ '+f(g.total_settle,0)+' '+esc(g.settle_ccy||'AOA'):'')+'</small></div><span class="bd n">بلا دورة</span></div>'+
      '<div class="ft"><div><small>أدخل سعر المورد وسعر دبي لبدء المتابعة</small></div><button type="button" data-g="'+esc(k)+'">بدء دورة</button></div></div>';}
  function render(){css();var v=$('v-ops');if(!v)return;var pg=$('cyPage');if(!pg){pg=document.createElement('div');pg.id='cyPage';v.insertBefore(pg,v.firstChild);pg.addEventListener('click',onClick);}
    var L=P.list,run=L.filter(function(x){return !x.k.done;}),done=L.filter(function(x){return x.k.done;});
    /* مجموعات أوقية مفتوحة ليس لها دورة جارية */
    var busy={};P.rows.forEach(function(t){if(t.status==='open'||t.status==='settling')busy[t.customer_id]=1;});
    var fresh=groups().filter(function(g){return !busy[g.customer_id];});
    var uL=0,mL=0,pE=0,pR=0;L.forEach(function(x){if(!x.k.done){uL+=x.k.usdtLeft;mL+=x.k.mruLeft;pE+=x.k.profitExp;}else pR+=x.k.profitReal;});
    P.avg=avgMargin(L);var ex=run.map(function(x){x.h=heldOf(x.c);return x;}).filter(function(x){return x.h.a>=1;}).sort(function(a,b){return (a.h.t||9e15)-(b.h.t||9e15);}),exT=ex.reduce(function(s,x){return s+x.h.a;},0);
    var h='<div class="hd"><div><h2>الدورات</h2><p>كل زبون: كوانزا ← USDT من المورد ← أوقية من دبي</p></div><div class="ac"><button type="button" data-a="ref">تحديث</button><button type="button" class="nv" data-a="day">إقفال اليوم</button></div></div>';
    if(ex.length){var oldH=ex[0].h.t?(Date.now()-ex[0].h.t)/36e5:0;h+='<div class="xp'+(oldH>=24?' hot':'')+'"><div class="xt"><small>مركز مكشوف على سعر USDT</small><b>'+f(exT,2)+' <i>USDT</i></b><span>'+ex.length+' دورة · اشتريته من المورد ولم تبعه لدبي'+(ex[0].h.t?' · الأقدم '+ageTxt(ex[0].h.t):'')+'</span></div><div class="xl">'+ex.map(function(x){return '<button type="button" data-c="'+esc(x.c.id)+'"><b>'+esc(P.names[x.cust]||'زبون')+'</b>'+f(x.h.a,2)+(x.h.t?'<small>'+ageTxt(x.h.t)+'</small>':'')+'</button>';}).join('')+'</div></div>';}
    h+='<div class="kp"><div class="w"><small>ربح متوقع من الدورات الجارية'+(P.avg?' · متوسط الهامش (آخر '+P.avg.n+'): '+f(P.avg.v,2)+'%':'')+'</small><b>'+f(pE,0)+' <i>MRU</i></b></div><div><small>دورات جارية</small><b>'+run.length+' <i>/ '+L.length+'</i></b></div><div class="g"><small>ربح فعلي (المكتملة)</small><b>'+f(pR,0)+'</b></div><div class="a"><small>USDT باقٍ عند الموردين</small><b>'+f(uL,2)+'</b></div><div class="a"><small>أوقية باقية من دبي</small><b>'+f(mL,0)+'</b></div></div>';
    h+='<div class="fl">'+[['run','الجارية',run.length],['new','بانتظار البدء',fresh.length],['done','المكتملة',done.length],['all','الكل',L.length+fresh.length]].map(function(o){return '<button type="button" data-f="'+o[0]+'"'+(P.f===o[0]?' class="on"':'')+'>'+o[1]+'<span>'+o[2]+'</span></button>';}).join('')+'<button type="button" data-a="lab">مختبر المطابقة</button></div>';
    if(P.busy&&!L.length&&!fresh.length)h+='<div class="em">جارٍ تحميل الدورات…</div>';
    else{var any=false,sec=function(t,arr,fn){if(!arr.length)return;any=true;h+='<div class="sec">'+t+' ('+arr.length+')</div>'+arr.map(fn).join('');};
      if(P.f==='new'||P.f==='all'||(P.f==='run'&&fresh.length))sec('بانتظار بدء الدورة',fresh,cardNew);
      if(P.f==='run'||P.f==='all')sec('دورات جارية',run,cardCycle);
      if(P.f==='done'||P.f==='all')sec('دورات مكتملة',done,cardCycle);
      if(!any)h+='<div class="em">'+(P.f==='done'?'لا دورات مكتملة بعد.':P.f==='new'?'لا تسويات أوقية تنتظر بدء دورة.':'لا دورات جارية الآن.<br>الدورة تبدأ من تسوية أوقية مفتوحة في تبويب «التسوية».')+'</div>';}
    if(P.at)h+='<div class="up">آخر تحديث '+new Date(P.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+(P.err?' · تعذّر التحديث الأخير':'')+'</div>';
    pg.innerHTML=h;}
  async function load(){if(P.busy)return;P.busy=true;P.err=false;render();
    try{var sel='select=id,ref,amount,ccy,settle_amount,settle_ccy,rate,status,meta,created_at,customer_id&order=created_at.desc',rows=null;
      var r=await fetch(SB+'/bdl_transactions?'+sel+'&meta->cycle=not.is.null&limit=600',{headers:H()});
      if(r.ok)rows=await r.json();else{r=await fetch(SB+'/bdl_transactions?'+sel+'&limit=800',{headers:H()});rows=r.ok?await r.json():null;}
      if(!rows)throw new Error('load');
      rows=rows.filter(function(t){return t.meta&&t.meta.cycle&&t.meta.cycle.id;});P.rows=rows;
      var ids=[];rows.forEach(function(t){if(t.customer_id&&ids.indexOf(t.customer_id)<0)ids.push(t.customer_id);});
      if(ids.length){var rc=await fetch(SB+'/bdl_customers?select=id,name&id=in.('+ids.slice(0,150).join(',')+')',{headers:H()});if(rc.ok)(await rc.json()).forEach(function(x){P.names[x.id]=x.name;});}
      P.list=CY().group?CY().group(rows):[];P.at=Date.now();
    }catch(e){P.err=true;}
    P.busy=false;render();}
  async function onClick(e){var b=e.target.closest('button');if(!b)return;var d=b.dataset;
    if(d.f){P.f=d.f;render();return;}
    if(d.a==='ref'){load();return;}
    if(d.a==='day'){try{dayCloseSheet();}catch(x){say('تعذّر فتح إقفال اليوم');}return;}
    if(d.a==='lab'){location.href='lab.html';return;}
    var cy=CY();if(!cy.openPanel){say('وحدة الدورات لم تُحمَّل — حدّث الصفحة');return;}
    try{b.disabled=true;
      if(d.g){var g=groups().find(function(x){return gKey(x)===d.g;});if(!g)return;if(!TXCACHE[d.g])await expandFetch(g,d.g);cy.openPanel(TXCACHE[d.g]||[],g.customer_name,d.g);}
      else if(d.c){var txs=P.rows.filter(function(t){return t.meta.cycle.id===d.c;});if(!txs.length)return;var gk=null,t0=txs[0];
        if(txs.some(function(t){return t.status==='open'||t.status==='settling';}))groups().forEach(function(g){if(g.customer_id===t0.customer_id)gk=gKey(g);});
        var nm=P.names[t0.customer_id]||'زبون';
        if(gk){var gg=groups().find(function(x){return gKey(x)===gk;});try{if(!TXCACHE[gk])await expandFetch(gg,gk);}catch(x){}
          var live=(TXCACHE[gk]||[]).filter(function(t){return t.meta&&t.meta.cycle&&t.meta.cycle.id===d.c;});cy.openPanel(live.length?TXCACHE[gk]:txs,nm,gk);}
        else cy.openPanel(txs,nm,null);}
    }catch(x){say('تعذّر فتح الدورة');}finally{b.disabled=false;}}
  function init(){var v=$('v-ops');if(!v)return;v.classList.add('cyp');
    var tb=document.querySelector('.tabs button[data-tab="ops"]');if(tb)tb.textContent='الدورات';
    var seen=false,show=function(){var on=v.style.display!=='none';if(on&&!seen){seen=true;render();load();}else if(on&&Date.now()-P.at>60000)load();if(!on)seen=false;};
    new MutationObserver(show).observe(v,{attributes:true,attributeFilter:['style']});
    /* عند إغلاق لوحة الدورة تُحدَّث الصفحة لتعكس ما حُفظ */
    new MutationObserver(function(ms){ms.forEach(function(m){[].forEach.call(m.removedNodes||[],function(nd){if(nd.id&&/^cy/i.test(nd.id)&&nd.id!=='cyPage'&&v.style.display!=='none')setTimeout(load,400);});});}).observe(document.body,{childList:true});
    render();show();}
  window.__CYP=P;P.load=load;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
