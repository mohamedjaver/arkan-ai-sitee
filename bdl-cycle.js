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
  function sum(a,d){return (a||[]).reduce(function(s,x){return s+((d&&((x.d||'in')!==d))?0:(Number(x.a)||0));},0);}
  /* حساب الدورة — دالة صافية تُستخدم في البطاقة وفي «كل الدورات» */
  function calc(c,aoa,mruCust){var rs=n(c.rs),ru=ruNew(c.ru),o={rs:rs,ru:ru,aoa:aoa||0,mruCust:mruCust||0,ok:rs>0&&ru>0};
    o.rc=(aoa>0&&mruCust>0)?mruCust/aoa:0;                 /* سعر الزبون MRU لكل كوانزا */
    o.cost=o.ok?ru/rs:0;                                   /* ما تجلبه كل كوانزا فعلًا من دبي */
    o.margin=(o.ok&&o.rc>0)?(o.cost-o.rc)/o.rc*100:0;
    o.usdtExp=(rs>0&&aoa>0)?aoa/rs:0;
    o.mruExp=o.usdtExp*ru;
    o.profitExp=(o.ok&&aoa>0&&mruCust>0)?o.mruExp-mruCust:0;
    o.usdtGot=sum(c.usdt,'in');o.usdtOut=sum(c.usdt,'out');o.mruGot=sum(c.mru,'in');o.mruOut=sum(c.mru,'out');
    o.usdtHeld=Math.max(0,o.usdtGot-o.usdtOut);            /* USDT اشتريته ولم تبعه — مركز مكشوف على السعر */
    o.preFund=Math.max(0,o.mruOut-o.mruGot);               /* دفعته للزبون قبل استلامه من دبي */
    o.custLeft=Math.max(0,o.mruCust-o.mruOut);             /* باقٍ للزبون */
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
    +'#cyBox .up{display:block;width:100%;height:50px;margin-top:12px;border:0;background:#0B2F70;color:#fff;font-family:inherit;font-weight:800;font-size:13.5px;cursor:pointer}#cyBox .up[disabled]{opacity:.6}#cyBox .st{margin-top:8px;padding:9px 10px;background:#F2F8FF;border:1px solid #C9DFFA;font-size:12px;font-weight:700;color:#0B2447;line-height:1.8}#cyBox .st .br{height:6px;background:#DCE4EF;margin-top:6px}#cyBox .st .br i{display:block;height:100%;background:#0A56B8}'
    +'#cyBox .pk{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}#cyBox .pk button{height:54px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;cursor:pointer}#cyBox .pk button b{display:block;font-family:"IBM Plex Mono",monospace;font-size:16px}#cyBox .pk button small{display:block;font-size:11px;font-weight:800}#cyBox .pk button[disabled]{opacity:.4}'
    +'#cyBox .lg .rw .ac{display:flex;gap:4px;flex:none}#cyBox .lg .rw button.o{border-color:#0B2F70;color:#0B2F70}#cyBox .lg .mv{display:flex;gap:6px;padding:7px 10px;background:#FFF9E8;border-top:1px solid #EAD48A}#cyBox .lg .mv button{flex:1;height:36px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;font-weight:800;font-size:11.5px;cursor:pointer}'
    +'#cyBox .ty{margin-top:12px;border:1px solid #EAD48A;background:#FFF9E8}#cyBox .ty .t{padding:8px 10px;font-size:12px;font-weight:800;color:#8A6100}#cyBox .ty .rw{display:grid;grid-template-columns:1fr auto;gap:6px;padding:8px 10px;border-top:1px solid #EAD48A;align-items:center}#cyBox .ty .rw input{height:40px;font-size:14px}#cyBox .ty .rw small{grid-column:1/3;font-size:11px;color:#8A6100;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#cyBox .ty .bt{grid-column:1/3;display:flex;gap:5px}#cyBox .ty .bt button{flex:1;height:36px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;font-weight:800;font-size:11.5px;cursor:pointer}#cyBox .ty .bt button.x{flex:none;padding:0 10px;border-color:#B00020;color:#B00020}'
    +'#cyView{position:fixed;inset:0;z-index:100070;background:#061228;display:flex;flex-direction:column}#cyView .th{display:flex;justify-content:flex-end;padding:calc(10px + env(safe-area-inset-top)) 12px 10px}#cyView .th button{height:40px;padding:0 16px;border:1px solid #F2C65A;background:transparent;color:#F2C65A;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer}#cyView .im{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;text-align:center}#cyView img{max-width:100%;height:auto}'
    +'#cyBox .lt{margin-top:16px;padding:8px 10px;background:#0B2447;color:#fff;font-size:13px;font-weight:800}#cyBox .lt+.lg{margin-top:0}#cyBox .lg+.lg{margin-top:6px}#cyBox .ps{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-top:6px;padding:8px 10px;background:#F2F6FC;border:1px solid #DCE4EF;font-size:12px;font-weight:800;color:#3A4F6E}#cyBox .ps b{font-family:"IBM Plex Mono",monospace;font-size:13.5px;color:#0B2447;direction:ltr}#cyBox .ps.w{background:#FFF1CC;border-color:#EAD48A;color:#8A6100}#cyBox .ps.w b{color:#8A6100}'
    +'#cyBox .rl{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px}#cyBox .rl button{height:58px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;font-weight:800;font-size:12.5px;cursor:pointer}#cyBox .ty select{height:40px;border:1.5px solid #B9C8DE;border-radius:0;background:#fff;font-family:inherit;font-size:12.5px;font-weight:700;color:#0B2447;padding:0 6px;flex:1;min-width:0}'
    +'#cyBox .all{display:block;width:100%;height:44px;margin-top:12px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer}#cyBox .nt{font-size:11.5px;color:#5C7699;line-height:1.7;margin-top:8px}'
    +'#cyAll{position:fixed;inset:0;z-index:100050;background:#F4F7FB;display:flex;flex-direction:column;font-family:inherit}#cyAll .th{display:flex;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 14px 12px;background:#0B2447;color:#fff}#cyAll .th b{flex:1;font-size:15px}#cyAll .th button{height:38px;padding:0 14px;border:1px solid rgba(255,255,255,.6);background:transparent;color:#fff;font-family:inherit;font-weight:800;font-size:12.5px;cursor:pointer}'
    +'#cyAll .sc{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:12px 12px calc(20px + env(safe-area-inset-bottom))}#cyAll .tot{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#DCE4EF;border:1px solid #DCE4EF;margin-bottom:12px}#cyAll .tot div{background:#fff;padding:11px 8px;text-align:center}#cyAll .tot small{display:block;font-size:10.5px;font-weight:800;color:#5C7699}#cyAll .tot b{display:block;margin-top:4px;font-family:"IBM Plex Mono",monospace;font-size:15px;color:#0B2447;direction:ltr}'
    +'#cyAll .cd{background:#fff;border:1px solid #DCE4EF;border-inline-start:5px solid #E0A300;margin-bottom:10px;padding:11px 12px}#cyAll .cd.dn{border-inline-start-color:#0E8F5B}#cyAll .cd .h{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:800;color:#0B2447}#cyAll .cd .h span{font-size:11px;color:#5C7699;font-weight:700}#cyAll .cd .l{display:flex;justify-content:space-between;gap:8px;margin-top:7px;font-size:12px;color:#3A4F6E}#cyAll .cd .l b{font-family:"IBM Plex Mono",monospace;color:#0B2447;direction:ltr}#cyAll .cd .l b.a{color:#8A6100}#cyAll .cd .l b.g{color:#0B7A3B}#cyAll .cd .l b.r{color:#B00020}#cyAll .em{padding:40px 16px;text-align:center;color:#5C7699;font-size:13px}';
  function css(){if($('cyCss'))return;var s=document.createElement('style');s.id='cyCss';s.textContent=CSS;document.head.appendChild(s);}
  function box(){var b=$('cyBox');if(b)return b;var rb=$('ssRateBox');if(!rb||!rb.parentNode)return null;css();b=document.createElement('div');b.id='cyBox';rb.parentNode.insertBefore(b,rb.nextSibling);
    b.addEventListener('click',onClick);b.addEventListener('input',onInput);b.addEventListener('change',onChange);return b;}
  function logH(key,dir,title,unit,exp,dec,ph){var list=CY.c[key]||[],got=sum(list,dir),pc=exp>0?Math.min(100,Math.round(got/exp*100)):0;
    var h='<div class="lg"><div class="t"><span>'+title+'</span><b>'+f(got,dec)+(exp>0?' / '+f(exp,dec):'')+' '+unit+'</b></div><div class="br"><i style="width:'+pc+'%"></i></div>';
    list.forEach(function(x,i){if((x.d||'in')!==dir)return;var d=x.t?new Date(x.t):null,ds=d&&!isNaN(d)?(('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)):'',id=key+i;
      h+='<div class="rw"><b>'+f(x.a,dec)+'</b><span>'+esc(x.n||'')+(ds?' · '+ds:'')+'</span><div class="ac">'+(x.img?'<button type="button" class="o" data-a="view" data-k="'+key+'" data-i="'+i+'">فتح</button>':'')
        +'<button type="button" class="o" data-a="mv" data-k="'+key+'" data-i="'+i+'">نقل</button><button type="button" data-a="del" data-k="'+key+'" data-i="'+i+'"'+(CY.arm===id?' class="arm"':'')+'>'+(CY.arm===id?'تأكيد':'حذف')+'</button></div></div>';
      if(CY.mv===id)h+='<div class="mv"><button type="button" data-a="mvto" data-k="'+key+'" data-i="'+i+'" data-to="flip">إلى '+(dir==='in'?'الصادر':'الوارد')+'</button><button type="button" data-a="mvto" data-k="'+key+'" data-i="'+i+'" data-to="'+(key==='usdt'?'mru':'usdt')+'">إلى رجل '+(key==='usdt'?'الأوقية':'USDT')+'</button>'+(x.img?'<button type="button" data-a="mvto" data-k="'+key+'" data-i="'+i+'" data-to="kwz">إلى الكوانزا</button>':'')+'</div>';});
    h+='<div class="ad"><input inputmode="decimal" data-k="'+key+'" data-d="'+dir+'" data-f="a" placeholder="المبلغ"><input class="tx" data-k="'+key+'" data-d="'+dir+'" data-f="n" placeholder="'+ph+'"><button type="button" data-a="add" data-k="'+key+'" data-d="'+dir+'">إضافة</button></div></div>';return h;}
  function posH(k){var a='<div class="ps'+(k.usdtHeld>=1?' w':'')+'"><span>USDT في محفظتك — لم يُبع بعد</span><b>'+f(k.usdtHeld,2)+'</b></div>';
    var b=k.preFund>=1?'<div class="ps w"><span>دفعته للزبون قبل استلامه من دبي</span><b>'+f(k.preFund,0)+' MRU</b></div>':'<div class="ps"><span>أوقية عندك بعد الدفع للزبون</span><b>'+f(Math.max(0,k.mruGot-k.mruOut),0)+' MRU</b></div>';
    return {u:a,m:b+(k.mruCust>0?'<div class="ps'+(k.custLeft>=1?' w':'')+'"><span>باقٍ للزبون</span><b>'+f(k.custLeft,0)+' MRU</b></div>':'')};}
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
        +'<button type="button" class="up" data-a="up"'+(CY.up&&CY.up.run?' disabled':'')+'>رفع إيصالات الدورة — ZIP أو صور</button>'+upH()+trayH()
        +'<div class="lt">رجل USDT</div>'+logH('usdt','in','وارد — من المورد','USDT',k.usdtExp,2,'المورد / رقم التحويل')+logH('usdt','out','صادر — إلى مشتري دبي','USDT',k.usdtGot||k.usdtExp,2,'المشتري / رقم التحويل')+posH(k).u
        +'<div class="lt">رجل الأوقية</div>'+logH('mru','in','وارد — من مشتري دبي','MRU',k.mruExp,0,'المشتري / ملاحظة')+logH('mru','out','صادر — مدفوع للزبون','MRU',k.mruCust,0,'الزبون / ملاحظة')+posH(k).m
        +(k.done?'<div class="pf'+(k.profitReal<0?' neg':'')+'" style="background:#0E8F5B"><span>الربح الفعلي — اكتملت الدورة</span><b>'+f(k.profitReal,0)+' MRU</b></div>':'')
        +'<button type="button" class="all" data-a="all">كل الدورات — المفتوحة والمكتملة</button>'
        +'<div class="nt">ارفع محادثات الزبون والمورد ومشتري دبي (ZIP) معًا أو واحدة واحدة، وحدّد صاحب كل محادثة: الإيصال يذهب إلى رجله واتجاهه حسب المحادثة والعملة. الخطأ يُصحَّح بزر «نقل». المبالغ بالأوقية الجديدة MRU.</div></div>';}
    b.innerHTML=h;}
  function ruHint(v){v=n(v);return v>=100?'= '+f(v/10,3)+' MRU لكل USDT':'';}
  function kp(k){return '<div><small>سعر الزبون</small><b>'+(k.rc?f(k.rc*10,4):'—')+'</b></div><div><small>تكلفتك (أعلى سعر تعرضه)</small><b>'+(k.ok?f(k.cost*10,4):'—')+'</b></div><div><small>الهامش</small><b class="'+(k.margin<0?'r':'g')+'">'+(k.ok&&k.rc?f(k.margin,2)+'%':'—')+'</b></div>';}
  function pf(k){return '<div id="cyP" class="pf'+(k.profitExp<0?' neg':'')+'"><span>'+(k.profitExp<0?'خسارة متوقعة':'الربح المتوقع')+'</span><b>'+(k.ok&&k.rc?f(k.profitExp,0)+' MRU':'—')+'</b></div>';}
  /* ═══ 1394: رفع ZIP/صور — كل إيصال إلى رجله حسب عملته ═══ */
  CY.tray=[];CY.files={};
  function isStable(c){return /USDT|USDC|BUSD|TETHER|DAI/i.test(c||'');}
  function legOf(p,file){var c=String(p.ccy||'').toUpperCase(),ctx=[p.bank,p.account,p.ref,p.sender].join(' ');
    if(isStable(c))return 'usdt';if(/MRU|MRO/.test(c))return 'mru';if(/AOA|AKZ|KZ/.test(c))return 'kwz';
    if(/USD/.test(c)&&/0x[0-9a-f]{6}|T[1-9A-HJ-NP-Za-km-z]{20}|BNB|TRON|TRC|BEP|ERC|CHAIN|BINANCE|OKX|WALLET/i.test(ctx))return 'usdt';
    return '';}
  CY.legOf=legOf;
  function nameDay(nm){var m=String(nm).match(/(20\d\d)[-_]?(\d\d)[-_]?(\d\d)/);if(!m)return 0;var d=new Date(+m[1],+m[2]-1,+m[3]);return isNaN(d)?0:d.getTime();}
  function ageOf(ts){if(!ts)return 99999;var a=new Date();a.setHours(0,0,0,0);var b=new Date(ts);b.setHours(0,0,0,0);return Math.max(0,Math.round((a-b)/86400000));}
  function isDoc(nm){return /\.(jpe?g|png|webp|heic|pdf)$/i.test(nm)&&!/STICKER|-STK-/i.test(nm);}
  function pick(){var i=$('cyPick');if(!i){i=document.createElement('input');i.type='file';i.id='cyPick';i.multiple=true;i.accept='.zip,application/zip,image/*,.pdf';i.style.display='none';document.body.appendChild(i);
      i.addEventListener('change',function(){var fs=[].slice.call(i.files||[]);i.value='';if(fs.length)intake(fs);});}i.click();}
  async function intake(fs){CY.q=(CY.q||[]).concat(fs);if(CY.up&&(CY.up.run||CY.up.ask||CY.up.pickP))return;nextFile();}
  async function nextFile(){var q=CY.q||[];if(!q.length)return;var zi=q.findIndex(function(x){return /\.zip$/i.test(x.name)||/zip/i.test(x.type||'');}),grp,title;
    if(zi>=0){grp=[q[zi]];q.splice(zi,1);title=partyOf(grp[0].name)||grp[0].name;}else{grp=q.splice(0,q.length);title=grp.length+' صورة';}
    CY.up={run:true,msg:'جارٍ فتح '+title+'…'};render();var list=[],party='';
    try{for(var x=0;x<grp.length;x++){var fl=grp[x];
        if(/\.zip$/i.test(fl.name)||/zip/i.test(fl.type||'')){party=partyOf(fl.name);
          if(!window.JSZip)await new Promise(function(res,rej){var sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';sc.onload=res;sc.onerror=function(){rej(new Error('تعذّر تحميل قارئ ZIP — تحقق من الاتصال'));};document.head.appendChild(sc);});
          var z=await window.JSZip.loadAsync(fl);z.forEach(function(p,en){if(en.dir)return;var nm=p.split('/').pop();if(!isDoc(nm))return;var ts=nameDay(nm)||(en.date?en.date.getTime():0);list.push({nm:nm,en:en,ts:ts,age:ageOf(ts)});});}
        else if(isDoc(fl.name)||/^image\//.test(fl.type||''))list.push({nm:fl.name,file:fl,ts:Date.now(),age:0});}
      if(!list.length)throw new Error('لا صور ولا PDF في «'+title+'» — صدّر المحادثة مع الوسائط');
      CY.up={run:false,list:list,ask:true,zip:zi>=0,party:party,title:title};render();
    }catch(e){CY.up={run:false,msg:(e&&e.message)||'تعذّر فتح الملف',err:true};render();setTimeout(nextFile,50);}}
  function upH(){var u=CY.up;if(!u)return '';
    if(u.ask)return '<div class="st">«'+esc(u.title)+'» — '+u.list.length+' ملف. هذه محادثة مَن؟</div><div class="rl"><button type="button" data-a="role" data-r="cust">الزبون</button><button type="button" data-a="role" data-r="sup">المورد الأنغولي</button><button type="button" data-a="role" data-r="dxb">مشتري دبي</button></div>';
    if(u.pickP){var c=function(a){return u.list.filter(function(o){return o.age<=a;}).length;};
      return '<div class="st">«'+esc(u.title)+'» · '+ROLES[u.role]+' — اختر الفترة</div><div class="pk">'+[[0,'اليوم'],[1,'اليوم وأمس'],[7,'آخر 7 أيام'],[99999,'الكل']].map(function(o){var k=c(o[0]);return '<button type="button" data-a="per" data-d="'+o[0]+'"'+(k?'':' disabled')+'><b>'+k+'</b><small>'+o[1]+'</small></button>';}).join('')+'</div>';}
    if(u.run)return '<div class="st">'+esc(u.msg||'')+(u.n?'<div class="br"><i style="width:'+Math.round((u.i||0)/u.n*100)+'%"></i></div>':'')+'</div>';
    var dn=(CY.done||[]).slice(0,-1).map(function(m){return '<div class="st">'+esc(m)+'</div>';}).join('');
    return dn+(u.msg?'<div class="st"'+(u.err?' style="color:#B00020"':'')+'>'+esc(u.msg)+'</div>':'');}
  var DEST=[['usdt:in','USDT وارد — من المورد'],['usdt:out','USDT صادر — إلى دبي'],['mru:in','أوقية وارد — من دبي'],['mru:out','أوقية صادر — للزبون'],['kc','كوانزا — إيصال زبون'],['ks','كوانزا — إيصال مورد']];
  function trayH(){if(!CY.tray.length)return '';var h='<div class="ty"><div class="t">تحتاج قرارك ('+CY.tray.length+')</div>';
    CY.tray.forEach(function(x,i){h+='<div class="rw"><input inputmode="decimal" data-ty="'+i+'" value="'+(x.a||'')+'" placeholder="المبلغ"><button type="button" class="o" data-a="tyview" data-i="'+i+'" style="height:40px;padding:0 12px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;font-weight:800;font-size:12px">فتح</button><small>'+esc(x.why||'')+' · '+esc(x.nm||'')+'</small>'
        +'<div class="bt"><select data-tys="'+i+'">'+DEST.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===x.guess?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select><button type="button" data-a="tyto" data-i="'+i+'" style="flex:none;padding:0 14px;background:#0B2F70;color:#fff">تسجيل</button><button type="button" class="x" data-a="tydel" data-i="'+i+'">حذف</button></div></div>';});
    return h+'</div>';}
  /* وجهة الإيصال = صاحب المحادثة × العملة */
  var ROLES={cust:'الزبون',sup:'المورد الأنغولي',dxb:'مشتري دبي'};
  function destOf(role,leg){if(role==='cust')return leg==='kwz'?'kc':leg==='mru'?'mru:out':'';if(role==='sup')return leg==='kwz'?'ks':leg==='usdt'?'usdt:in':'';if(role==='dxb')return leg==='usdt'?'usdt:out':leg==='mru'?'mru:in':'';return '';}
  CY.destOf=destOf;
  function partyOf(nm){nm=String(nm||'').replace(/\.zip$/i,'').replace(/\s*\(\d+\)\s*$/,'');var m=nm.match(/WhatsApp Chat\s*[-–]\s*(.+)$/i)||nm.match(/WhatsApp Chat with\s+(.+)$/i)||nm.match(/Conversa do WhatsApp com\s+(.+)$/i)||nm.match(/Discussion WhatsApp avec\s+(.+)$/i)||nm.match(/محادثة (?:واتساب|WhatsApp) مع\s+(.+)$/);return m?m[1].trim():'';}
  function setRole(r){var u=CY.up;if(!u||!u.list)return;u.role=r;u.ask=false;if(u.zip){u.pickP=true;render();}else runBatch(99999);}
  async function sendKwz(files,dst){if(!files.length)return;try{if(dst==='ks'&&typeof bulkSupMatch==='function')await bulkSupMatch(files);else await addReceipts(files);}catch(e){say('تعذّر نقل إيصالات الكوانزا');}}
  async function b64img(file){try{var im=await createImageBitmap(file),sc=Math.min(1,1600/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=Math.round(im.width*sc);cv.height=Math.round(im.height*sc);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);return {b64:cv.toDataURL('image/jpeg',.85).split(',')[1],mime:'image/jpeg'};}
    catch(e){var ab=await file.arrayBuffer(),u=new Uint8Array(ab),bin='';for(var i=0;i<u.length;i++)bin+=String.fromCharCode(u[i]);return {b64:btoa(bin),mime:file.type||'image/jpeg'};}}
  /* القراءة: قارئ الخادم (Claude) مباشرة ليحتفظ بالعملة كما هي، ثم قارئ الشاشة كاحتياط */
  async function readOne(file){var p=null;
    try{if(typeof API!=='undefined'&&typeof TOK!=='undefined'&&TOK){var pl=await b64img(file),ac=new AbortController(),tm=setTimeout(function(){ac.abort();},30000);
        try{var r=await fetch(API+'/read/receipt',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+TOK},body:JSON.stringify(pl),signal:ac.signal});
          if(r.ok){var x=await r.json();if(x&&x.is_receipt!==false)p={amount:Number(x.amount)||0,ccy:x.currency||'',ref:x.txn||'',bank:x.bank||'',account:x.account||'',sender:x.sender||'',receiver:x.receiver||'',date:x.date||''};else if(x)p={amount:0,ccy:'',not:true};}}finally{clearTimeout(tm);}}}catch(e){}
    if(!p){try{var q=await readReceipt(file);p={amount:Number(q.amount)||0,ccy:q.ccy||'',ref:q.ref||'',bank:q.bank||'',account:q.account||'',receiver:q.receiver||q.name||'',date:q.date||''};}catch(e){p={amount:0,ccy:''};}}
    return p;}
  function isoOf(d,fb){if(d){var m=String(d).match(/(20\d\d)-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d))?/);if(m){var x=new Date(+m[1],+m[2]-1,+m[3],+(m[4]||12),+(m[5]||0));if(!isNaN(x)&&x.getTime()<Date.now()+86400000)return x.toISOString();}}return new Date(fb||Date.now()).toISOString();}
  function entryOf(p,fp,img,ts,dir,party){var ref=String(p.ref||'').trim(),who=String(p.bank||'').trim();
    return {a:Number(p.amount)||0,d:dir||'in',n:[party||'',isStable(p.ccy)?String(p.ccy).toUpperCase():'',who,ref].filter(Boolean).join(' · ').slice(0,80),t:isoOf(p.date,ts),fp:fp,img:img||null,ref:ref||null,who:party||null,src:'ocr'};}
  /* المكرر يُحسب داخل الاتجاه نفسه: تحويل دبي المباشر إلى حساب الزبون يظهر مرة واردًا ومرة صادرًا — وهذا صحيح */
  function known(){var s={};['usdt','mru'].forEach(function(k){(CY.c[k]||[]).forEach(function(e){var d=':'+k+':'+(e.d||'in');if(e.fp)s['f'+e.fp+d]=1;if(e.ref)s['r'+String(e.ref).toLowerCase()+d]=1;});});CY.tray.forEach(function(e){if(e.fp)s['t'+e.fp]=1;});return s;}
  /* ضابط بنكي: الإيصال نفسه (بصمة الصورة أو رقم العملية) لا يدخل دورتين */
  async function others(){var s={};try{var r=await fetch(SB+'/bdl_transactions?select=id,meta&meta->cycle=not.is.null&limit=600',{headers:H()});var rows=r.ok?await r.json():[];
      rows.forEach(function(t){var c=t.meta&&t.meta.cycle;if(!c||c.id===CY.c.id)return;['usdt','mru'].forEach(function(k){(c[k]||[]).forEach(function(e){if(e.fp)s['f'+e.fp]=1;if(e.ref)s['r'+String(e.ref).toLowerCase()]=1;});});});}catch(e){}return s;}
  async function runBatch(maxAge){var u=CY.up;if(!u||!u.list||u.run||!u.role)return;var role=u.role,party=u.party||'',title=u.title||'';
    var list=u.list.filter(function(o){return o.age<=maxAge;}).sort(function(a,b){return (b.ts||0)-(a.ts||0);}).slice(0,200);if(!list.length)return;
    CY.up={run:true,n:list.length,i:0,msg:'جارٍ القراءة 0 / '+list.length};render();
    var R={usdt:0,mru:0,kwz:0,dup:0,other:0,tray:0,skip:0},kw=[],kdst=role==='sup'?'ks':'kc',mine=known(),oth=await others();
    for(var i=0;i<list.length;i++){var o=list[i];CY.up.i=i;CY.up.msg=ROLES[role]+' — جارٍ القراءة '+(i+1)+' / '+list.length;render();
      try{var file=o.file;if(!file){var bl=await o.en.async('blob'),ex=o.nm.split('.').pop().toLowerCase();file=new File([bl],o.nm,{type:ex==='pdf'?'application/pdf':ex==='png'?'image/png':ex==='webp'?'image/webp':'image/jpeg',lastModified:o.ts||Date.now()});}
        if(party)file._sup=party;
        var fp=await sha256(await file.arrayBuffer());
        if(/pdf/i.test(file.type)||/\.pdf$/i.test(file.name)){ /* PDF = كوانزا دائمًا */
          if(role==='dxb'){if(mine['t'+fp]){R.dup++;continue;}CY.files[fp]=file;mine['t'+fp]=1;CY.tray.push({a:0,p:{},fp:fp,nm:o.nm,ts:o.ts,why:'PDF كوانزا في محادثة مشتري دبي',guess:'kc',party:party});R.tray++;}
          else{kw.push(file);R.kwz++;}continue;}
        if(oth['f'+fp]){R.other++;continue;}
        var p=await readOne(file),leg=legOf(p,file);
        if(p.not&&!leg){R.skip++;continue;}
        var dst=leg?destOf(role,leg):'';
        if(dst==='kc'||dst==='ks'){kw.push(file);R.kwz++;continue;}
        var rk=p.ref?'r'+String(p.ref).toLowerCase():'';if(rk&&oth[rk]){R.other++;continue;}
        if(!dst||!(p.amount>0)){if(mine['t'+fp]){R.dup++;continue;}CY.files[fp]=file;mine['t'+fp]=1;
          var gs=dst||(leg==='usdt'?'usdt:in':leg==='mru'?'mru:in':leg==='kwz'?'kc':(role==='dxb'?'mru:in':role==='sup'?'usdt:in':'mru:out'));
          CY.tray.push({a:p.amount||0,p:p,fp:fp,nm:o.nm,ts:o.ts,party:party,guess:gs,why:!leg?('عملة غير واضحة'+(p.ccy?' ('+p.ccy+')':'')):!dst?((leg==='usdt'?'USDT':leg==='mru'?'أوقية':'كوانزا')+' غير متوقع في محادثة '+ROLES[role]):'المبلغ لم يُقرأ'});R.tray++;continue;}
        var kk=dst.split(':')[0],dir=dst.split(':')[1],sfx=':'+kk+':'+dir;
        if(mine['f'+fp+sfx]||(rk&&mine[rk+sfx])){R.dup++;continue;}
        CY.files[fp]=file;mine['f'+fp+sfx]=1;if(rk)mine[rk+sfx]=1;
        var img=null;try{img=await rcptStore(file,fp);}catch(e){}
        CY.c[kk].push(entryOf(p,fp,img,o.ts,dir,party));R[kk]++;
      }catch(e){R.skip++;}}
    if(R.usdt||R.mru)await save();
    var m=[];if(R.usdt)m.push('USDT '+(role==='dxb'?'صادر ':'وارد ')+R.usdt);if(R.mru)m.push('أوقية '+(role==='cust'?'صادر ':'وارد ')+R.mru);if(R.kwz)m.push('كوانزا '+R.kwz+(kdst==='ks'?' — إلى مطابقة المورد':' — إلى إيصالات الزبون'));if(R.tray)m.push('تحتاج قرارك '+R.tray);if(R.dup)m.push('مكرر '+R.dup);if(R.other)m.push('مستخدم في دورة أخرى — مرفوض '+R.other);if(R.skip)m.push('ليست إيصالات '+R.skip);
    CY.up={run:false,msg:'«'+title+'» · '+ROLES[role]+' — اكتمل: '+(m.join(' · ')||'لا شيء جديد')};CY.done=(CY.done||[]).concat([CY.up.msg]);render();
    await sendKwz(kw,kdst);
    if((CY.q||[]).length)setTimeout(nextFile,300);}
  async function fileOf(e){if(e.fp&&CY.files[e.fp])return CY.files[e.fp];if(!e.img)return null;
    var r=await fetch(SB.replace('/rest/v1','')+'/storage/v1/object/authenticated/receipts/'+e.img,{headers:{apikey:ANON,Authorization:'Bearer '+(TOK||ANON)}});if(!r.ok)return null;var b=await r.blob();
    return new File([b],e.img.split('/').pop(),{type:b.type||'image/jpeg'});}
  async function viewEntry(e){try{var fl=await fileOf(e);if(!fl){say('الصورة غير متاحة');return;}var d=document.createElement('div');d.id='cyView';var url=URL.createObjectURL(fl);
      d.innerHTML='<div class="th"><button type="button">إغلاق</button></div><div class="im"><img alt=""></div>';d.querySelector('img').src=url;d.querySelector('button').onclick=function(){URL.revokeObjectURL(url);d.parentNode.removeChild(d);};document.body.appendChild(d);}catch(x){say('تعذّر فتح الصورة');}}
  async function moveEntry(k,i,to){var e=CY.c[k][i];if(!e)return;CY.mv=null;
    if(to==='kwz'){var fl=null;try{fl=await fileOf(e);}catch(x){}if(!fl){say('الصورة غير متاحة للنقل');render();return;}
      CY.c[k].splice(i,1);render();await save();try{await addReceipts([fl]);say('نُقل إلى إيصالات الزبون (كوانزا)');}catch(x){say('تعذّر النقل');}return;}
    if(to==='flip'){e.d=(e.d||'in')==='in'?'out':'in';render();if(await save())say('نُقل إلى '+(e.d==='in'?'الوارد':'الصادر'));return;}
    CY.c[k].splice(i,1);CY.c[to].push(e);render();if(await save())say('نُقل إلى رجل '+(to==='usdt'?'USDT':'الأوقية'));}
  async function trayTo(i,to){var x=CY.tray[i];if(!x||!to)return;var fl=CY.files[x.fp];
    if(to==='kc'||to==='ks'){CY.tray.splice(i,1);render();if(fl){if(x.party)fl._sup=x.party;await sendKwz([fl],to);say(to==='ks'?'نُقل إلى مطابقة المورد':'نُقل إلى إيصالات الزبون');}return;}
    var inp=$('cyBox').querySelector('input[data-ty="'+i+'"]'),a=n(inp?inp.value:x.a);if(!(a>0)){say('اكتب المبلغ أولًا');if(inp)inp.focus();return;}
    var kk=to.split(':')[0],dir=to.split(':')[1],img=null;try{if(fl)img=await rcptStore(fl,x.fp);}catch(e){}
    CY.c[kk].push(entryOf(Object.assign({},x.p,{amount:a}),x.fp,img,x.ts,dir,x.party));CY.tray.splice(i,1);render();if(await save())say('سُجّل: '+DEST.filter(function(o){return o[0]===to;})[0][1]);}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-a="tyview"]');if(!b||!CY.tray)return;var x=CY.tray[+b.dataset.i];if(x)viewEntry({fp:x.fp});});
  async function save(){var s=ops(),c=CY.c;if(!s.length||!c)return false;if(CY.busy){CY.again=true;return true;}CY.busy=true;var ok=true;
    try{c.upd=new Date().toISOString();var snap=JSON.parse(JSON.stringify(c));
      for(var i=0;i<s.length;i++){var t=s[i],nm=Object.assign({},t.meta||{},{cycle:snap});
        var r=await fetch(SB+'/bdl_transactions?id=eq.'+encodeURIComponent(t.id),{method:'PATCH',headers:H(),body:JSON.stringify({meta:nm})});
        if(r.ok)t.meta=nm;else ok=false;}}catch(e){ok=false;}
    CY.busy=false;if(CY.again){CY.again=false;return save();}
    if(!ok)say('تعذّر حفظ الدورة — تحقق من الاتصال');return ok;}
  function onInput(e){var i=e.target;if(i.dataset&&i.dataset.ty!=null&&CY.tray[+i.dataset.ty]){CY.tray[+i.dataset.ty].a=n(i.value);return;}if(!i.dataset||!i.dataset.r||!CY.c)return;CY.c[i.dataset.r]=n(i.value);render(true);}
  function onChange(e){var i=e.target;if(i.dataset&&i.dataset.r)save();}
  async function onClick(e){var a=e.target.closest('[data-a]');if(!a||!CY.c)return;var act=a.dataset.a,k=a.dataset.k,b=$('cyBox');
    if(act==='tg'){CY.open=!CY.open;CY.arm=null;render();return;}
    if(act==='all'){openAll();return;}
    if(act==='up'){pick();return;}
    if(act==='per'){runBatch(+a.dataset.d);return;}
    if(act==='role'){setRole(a.dataset.r);return;}
    if(act==='view'){viewEntry(CY.c[k][+a.dataset.i]);return;}
    if(act==='mv'){var mk=k+a.dataset.i;CY.mv=CY.mv===mk?null:mk;CY.arm=null;render();return;}
    if(act==='mvto'){await moveEntry(k,+a.dataset.i,a.dataset.to);return;}
    if(act==='tyto'){var sl=b.querySelector('select[data-tys="'+a.dataset.i+'"]');await trayTo(+a.dataset.i,sl?sl.value:'');return;}
    if(act==='tydel'){CY.tray.splice(+a.dataset.i,1);render();return;}
    if(act==='add'){var dd=a.dataset.d||'in',ia=b.querySelector('input[data-k="'+k+'"][data-d="'+dd+'"][data-f="a"]'),inn=b.querySelector('input[data-k="'+k+'"][data-d="'+dd+'"][data-f="n"]'),v=n(ia.value);
      if(!(v>0)){say('اكتب المبلغ أولًا');ia.focus();return;}
      CY.c[k]=(CY.c[k]||[]).concat([{a:v,d:dd,n:String(inn.value||'').trim().slice(0,80),t:new Date().toISOString()}]);CY.arm=null;CY.mv=null;render();
      if(await save())say('سُجّل '+f(v,k==='usdt'?2:0)+' '+(k==='usdt'?'USDT':'MRU')+' ✓');return;}
    if(act==='del'){var key=k+a.dataset.i;if(CY.arm!==key){CY.arm=key;render();return;}
      CY.c[k].splice(+a.dataset.i,1);CY.arm=null;CY.mv=null;render();await save();return;}}
  function load(){var s=ops(),c=null;s.forEach(function(t){var x=t.meta&&t.meta.cycle;if(x&&(!c||String(x.upd||'')>String(c.upd||'')))c=x;});
    CY.c=c?JSON.parse(JSON.stringify(c)):blank();CY.c.usdt=CY.c.usdt||[];CY.c.mru=CY.c.mru||[];CY.open=false;CY.arm=null;CY.mv=null;CY.tray=[];CY.up=null;CY.q=[];CY.done=[];render();}
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
        +'<div class="l"><span>USDT مباع لدبي</span><b class="'+(k.usdtHeld<1?'g':'a')+'">'+f(k.usdtOut,2)+' / '+f(k.usdtGot,2)+'</b></div>'
        +'<div class="l"><span>دبي — أوقية @ '+f(k.ru,2)+'</span><b class="'+(k.done?'g':'a')+'">'+f(k.mruGot,0)+' / '+f(k.mruExp,0)+'</b></div>'
        +'<div class="l"><span>مدفوع للزبون</span><b class="'+(k.custLeft<1?'g':'a')+'">'+f(k.mruOut,0)+' / '+f(x.mru,0)+'</b></div>'
        +'<div class="l"><span>'+(k.done?'الربح الفعلي':'الربح المتوقع')+' · هامش '+f(k.margin,2)+'%</span><b class="'+((k.done?k.profitReal:k.profitExp)<0?'r':'g')+'">'+f(k.done?k.profitReal:k.profitExp,0)+' MRU</b></div></div>';});
    return h;}
  CY.allH=allH;
  function init(){var ov=$('ovl-settle');if(!ov)return;var was=false;
    new MutationObserver(function(){var on=ov.classList.contains('on');if(on&&!was){was=true;setTimeout(load,350);}else if(!on&&was){was=false;CY.c=null;}}).observe(ov,{attributes:true,attributeFilter:['class']});
    var due=$('ssDue');if(due)new MutationObserver(function(){if(CY.c&&!document.activeElement.closest('#cyBox'))render();}).observe(due,{childList:true,characterData:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
