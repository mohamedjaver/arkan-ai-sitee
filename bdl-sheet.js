/* bdl-sheet.js — واجهة «إتمام التسوية» (Build 1369) — طبقة عرض فقط، لا تغيّر أي معرّف ولا أي منطق حساب.
   ١ ملخص حي ثابت أعلى الشيت (المستحق · المدفوع · التغطية) + محطات: التسعير ← الإيصالات ← التأكيد
   ٢ الإيصالات المحفوظة مطوية افتراضيًا   ٣ زرّا رفع واضحان بدل حقل الملفات الخام
   ٤ فرق التقريب مطوي حتى الحاجة          ٥ شريط أفعال ثابت أسفل الشيت */
(function(){
'use strict';
function $(i){return document.getElementById(i);}
function init(){
  var ov=$('ovl-settle');if(!ov||$('shHero'))return;var sh=ov.querySelector('.sheet');
  if(!sh||!$('ssDue')||!$('ssPaid')||!$('doSettle')||!$('sFiles'))return;
  var st=document.createElement('style');st.textContent=
  '#ovl-settle .sheet{padding-top:0;padding-bottom:0!important;max-height:92vh}'+
  '#shOps{margin:0 0 12px;border:1px solid var(--line);background:#fff}#shOps .t{padding:9px 12px;font-size:11.5px;font-weight:800;color:#5C7699;background:#F7F9FC;border-bottom:1px solid var(--line)}'+
  '#shOps .o{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--line)}#shOps .o:last-child{border-bottom:0}#shOps .o>div{flex:1;min-width:0}'+
  '#shOps .o b{display:block;font-family:"IBM Plex Mono",monospace;font-size:12px;color:#0B2447;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr;text-align:start}#shOps .o small{font-size:11.5px;color:#5C7699;direction:ltr;display:block;text-align:start}'+
  '#shOps .o button{flex:none;height:38px;padding:0 12px;border:1.5px solid #B00020;background:#fff;color:#B00020;font-weight:800;font-size:12px;font-family:inherit;cursor:pointer}#shOps .o button:disabled{opacity:.5}'+
  '#ovl-settle .sheet>h3{margin:0 -16px;padding:14px 16px 10px;background:#fff}'+
  '#shHero{position:sticky;top:0;z-index:6;margin:0 -16px 12px;padding:12px 16px 10px;background:#0B2F70;color:#fff;box-shadow:0 6px 16px rgba(11,47,112,.18)}'+
  '#shHero .sub{font-size:11.5px;opacity:.8;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '#shHero .cells{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end}'+
  '#shHero .cells small{display:block;font-size:10.5px;opacity:.75;margin-bottom:3px}'+
  '#shHero .cells b{display:block;font-family:"IBM Plex Mono",monospace;font-size:14.5px;font-weight:700;direction:ltr;text-align:start;line-height:1.25;word-break:break-word}'+
  '#shHero .due{cursor:pointer}#shHero .due b{text-decoration:underline dotted rgba(255,255,255,.5);text-underline-offset:4px}'+
  '#shHero .pct b{font-size:20px;text-align:center}'+
  '#shHero .bar{height:5px;background:rgba(255,255,255,.2);margin-top:10px}#shHero .bar i{display:block;height:100%;width:0;background:#5FA8FF;transition:width .35s}'+
  '#shHero.ok .bar i{background:#3DDC97}#shHero.over .bar i{background:#FFC24B}'+
  '#shHero .msg{font-size:11.5px;font-weight:700;margin-top:6px;opacity:.92}#shHero.ok .msg{color:#8FF0C2}#shHero.over .msg{color:#FFD78A}'+
  '#shSteps{margin:0 0 12px;border:1px solid var(--line);background:#F7F9FC;padding:2px 8px 8px}'+
  '#shSteps .trk3.mini{padding-top:8px}#shSteps .trk3.mini .st3{width:92px}'+
  '#ssPrevR.shCol{max-height:54px;overflow:hidden}'+
  '#shPrevT{display:none;width:100%;height:40px;margin-top:-1px;border:1px solid #EAD48A;background:#FFF9E8;color:#8A6100;font-weight:800;font-size:12.5px;font-family:inherit;cursor:pointer}'+
  '.shAdj.shCol>*:not(:first-child){display:none!important}'+
  '.shAdj>div:first-child>span{cursor:pointer}'+
  '#shUp{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 0 10px}'+
  '#shUp button{min-height:66px;padding:10px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;cursor:pointer;text-align:center}'+
  '#shUp button.sup{background:#0B2F70;color:#fff}'+
  '#shUp b{display:block;font-size:13.5px;font-weight:800}#shUp small{display:block;margin-top:4px;font-size:10.5px;opacity:.8}'+
  '#shZip{position:fixed;inset:0;z-index:99996;background:rgba(8,21,54,.72);display:none;align-items:flex-end;font-family:inherit}#shZip.on{display:flex}'+
  '#shZip .zc{width:100%;max-height:92vh;overflow:auto;background:#fff;padding:0 16px calc(16px + env(safe-area-inset-bottom))}'+
  '#shZip header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 -16px 12px;padding:14px 16px;background:#0B2F70;color:#fff}#shZip header small{display:block;font-size:11px;opacity:.8}#shZip header b{display:block;font-size:16px;margin-top:2px}#shZip header button{flex:none;width:38px;height:38px;border:0;background:rgba(255,255,255,.16);color:#fff;font-size:17px}#shZip header button:disabled{opacity:.35}'+
  '#shZip .zt{border:1px solid var(--line);background:#F7F9FC;padding:2px 6px 8px;margin-bottom:14px}#shZip .zt .trk3.mini .st3{width:100px}'+
  '#shZip .zm{text-align:center;padding:26px 10px}#shZip .zm b{display:block;font-size:15px;color:#0B2F70;margin-top:10px}#shZip .zm small{display:block;margin-top:6px;font-size:12px;color:#5C7699}'+
  '#shZip .zsp{display:inline-block;width:30px;height:30px;border:3px solid #D5DEEC;border-top-color:#0B2F70;animation:trk3sp 1s linear infinite}'+
  '#shZip .zh{font-size:13.5px;font-weight:800;color:#0B2447;margin-bottom:10px}#shZip .zg{display:grid;grid-template-columns:1fr 1fr;gap:8px}'+
  '#shZip .zg button{min-height:78px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;cursor:pointer}#shZip .zg button:disabled{opacity:.35}#shZip .zg b{display:block;font-size:24px;font-weight:800;font-family:"IBM Plex Mono",monospace}#shZip .zg small{display:block;font-size:12.5px;font-weight:700;margin-top:2px}'+
  '#shZip .zn{margin-top:10px;font-size:11.5px;color:#5C7699;line-height:1.6}'+
  '#shZip .zp{height:10px;background:#E3EAF4}#shZip .zp i{display:block;height:100%;background:linear-gradient(90deg,#2F6FD0,#0B2F70);transition:width .3s}'+
  '#shZip .zs{margin-top:8px;font-size:13px;font-weight:700;color:#0B2447;display:flex;justify-content:space-between}#shZip .zf{margin-top:4px;font-size:10.5px;color:#8A97AD;direction:ltr;text-align:start;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '#shZip .zk{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px}#shZip .zk div{border:1px solid var(--line);padding:10px 4px;text-align:center}#shZip .zk b{display:block;font-size:22px;font-family:"IBM Plex Mono",monospace}#shZip .zk small{font-size:11px;color:#5C7699}'+
  '#shZip .zsum{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:10px 12px;background:#F1F5FB;font-size:12.5px;color:#5C7699}#shZip .zsum b{font-family:"IBM Plex Mono",monospace;font-size:16px;color:#0B2F70;direction:ltr}'+
  '#shZip .zb{width:100%;height:52px;margin-top:14px;border:0;background:#0E8F5B;color:#fff;font-weight:800;font-size:14.5px;font-family:inherit;cursor:pointer}#shZip .zb.ghost{background:#fff;color:#B00020;border:1.5px solid #B00020}'+
  '#rcptView .bar{display:flex!important;align-items:center;gap:10px;padding-top:calc(8px + env(safe-area-inset-top))}#rcptView #rvT{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:start;font-size:12px}'+
  '#rcptView .bar button{flex:none!important;height:44px;padding:0 18px!important;background:#fff!important;color:#0B2F70!important;font-weight:800!important;font-size:14px!important;border:0!important}'+
  '#shFoot{position:sticky;bottom:0;z-index:6;display:grid;grid-template-columns:2fr 3fr;gap:8px;margin:14px -16px 0;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid var(--line);box-shadow:0 -6px 16px rgba(11,47,112,.08)}'+
  '#shFoot button{width:100%!important;height:54px!important;margin:0!important;font-size:13.5px!important;line-height:1.3;white-space:normal}';
  document.head.appendChild(st);

  /* ١ الملخص الحي */
  var hero=document.createElement('div');hero.id='shHero';
  hero.innerHTML='<div class="sub" id="shSub"></div><div class="cells"><div class="due" id="shDueC"><small>المستحق</small><b id="shDue">—</b></div><div><small>المدفوع من الإيصالات</small><b id="shPaid">0</b></div><div class="pct"><small>التغطية</small><b id="shPct">—</b></div></div><div class="bar"><i id="shBar"></i></div><div class="msg" id="shMsg"></div>';
  var steps=document.createElement('div');steps.id='shSteps';
  var opsBox=document.createElement('div');opsBox.id='shOps';opsBox.style.display='none';
  var ssum=sh.querySelector('.ssum');sh.insertBefore(hero,ssum);sh.insertBefore(steps,ssum);sh.insertBefore(opsBox,ssum);
  opsBox.onclick=function(e){var b=e.target.closest('button[data-id]');if(b)dropOp(b.dataset.id,b);};
  $('shDueC').onclick=function(){try{if(typeof ssDueEdit==='function')ssDueEdit();}catch(e){}};
  $('ssN').parentNode.style.display='none';$('ssIn').parentNode.style.display='none';
  if($('ssMatch'))$('ssMatch').style.display='none';

  /* ٢ الإيصالات المحفوظة مطوية */
  var pv=$('ssPrevR'),pt=document.createElement('button');pt.type='button';pt.id='shPrevT';
  if(pv){pv.classList.add('shCol');pv.parentNode.insertBefore(pt,pv.nextSibling);
    pt.onclick=function(){pv.classList.toggle('shCol');paint();};}

  /* ٤ فرق التقريب مطوي */
  var adj=$('ssAdjHint')&&$('ssAdjHint').parentNode;
  if(adj){adj.classList.add('shAdj','shCol');var lab=adj.querySelector('div>span');
    if(lab){lab.textContent='فرق تقريب صغير (اختياري) ▾';lab.onclick=function(){adj.classList.toggle('shCol');};}
    adj.addEventListener('click',function(e){if(e.target.tagName==='BUTTON')adj.classList.remove('shCol');});}

  /* ٣ زرّا الرفع */
  var sf=$('sFiles'),bs=$('bulkSup');
  var up=document.createElement('div');up.id='shUp';
  up.innerHTML='<button type="button" data-u="sFiles"><b>＋ إيصالات الزبون</b><small>تُقرأ وتُحسب في المدفوع</small></button>'+(bs?'<button type="button" class="sup" data-u="bulkSup"><b>⇅ إيصالات المورد</b><small>مطابقة جماعية بالمرجع ثم المبلغ</small></button>':'');
  /* 1373: منتقٍ بلا قيد نوع (iOS يعطّل ZIP عند تقييد النوع) — يقبل صورًا و PDF وملف محادثة واتساب ZIP */
  var pk=document.createElement('input');pk.type='file';pk.multiple=true;pk.style.display='none';sh.appendChild(pk);var pkFor='sFiles';
  up.onclick=function(e){var b=e.target.closest('button');if(!b)return;pkFor=b.dataset.u;pk.value='';pk.click();};
  function feed(files){if(!files.length)return;try{if(pkFor==='bulkSup'){if(typeof bulkSupMatch==='function')bulkSupMatch(files);}else if(typeof addReceipts==='function')addReceipts(files);}catch(e){say('تعذّر الرفع: '+(e.message||e));}}
  function isDoc(n,ty){return /^image\//i.test(ty||'')||/pdf/i.test(ty||'')||/\.(jpe?g|png|webp|heic|pdf)$/i.test(n||'');}
  pk.onchange=async function(){var all=[].slice.call(pk.files||[]),zf=all.find(function(f){return /\.zip$/i.test(f.name||'')||/zip/i.test(f.type||'');});
    var plain=all.filter(function(f){return f!==zf&&isDoc(f.name,f.type);});
    if(!zf){if(!plain.length&&all.length)say('اختر صورًا أو PDF أو ملف ZIP');feed(plain);return;}
    if(zf.size>220*1048576&&!confirm('الملف كبير ('+Math.round(zf.size/1048576)+' MB) وقد لا يتحمله الهاتف.\nالأفضل تصدير «With selected media» للفترة فقط.\n\nالمتابعة؟'))return;
    zipFlow(zf,plain);};
  /* ═══ 1374: استيراد محادثة واتساب بشاشة كاملة — فتح ← تفكيك ← قراءة وتحقق، بشريط تقدم وعدّادات حية ═══ */
  var ZV=null,ZS={};
  function zEl(){if(ZV)return ZV;ZV=document.createElement('div');ZV.id='shZip';document.body.appendChild(ZV);
    ZV.addEventListener('click',function(e){var b=e.target.closest('[data-z]');if(!b||b.disabled)return;var k=b.dataset.z;
      if(k==='x'){ZS.stop=true;ZV.classList.remove('on');}
      else if(k==='stop'){ZS.stop=true;b.disabled=true;b.textContent='جارٍ الإيقاف بعد الإيصال الحالي…';}
      else zRun(+k);});return ZV;}
  function zName(n){n=String(n||'').replace(/\.zip$/i,'').replace(/\s*\(\d+\)\s*$/,'');var m=n.match(/WhatsApp Chat\s*[-–]\s*(.+)$/i)||n.match(/WhatsApp Chat with\s+(.+)$/i)||n.match(/Conversa do WhatsApp com\s+(.+)$/i)||n.match(/محادثة (?:واتساب|WhatsApp) مع\s+(.+)$/);return m?m[1].trim():n;}
  function zPaint(){var s=ZS,h='<div class="zc"><header><div><small>ملف محادثة واتساب · '+(pkFor==='bulkSup'?'إيصالات مورد':'إيصالات زبون')+'</small><b>'+esc(s.name||'')+'</b></div><button type="button" data-z="x"'+(s.phase==='work'&&!s.finished?' disabled':'')+'>✕</button></header>';
    var cur=s.phase==='open'?0:s.phase==='pick'?1:(s.stage==='unzip'?1:2);if(s.finished)cur=3;
    if(typeof trk3==='function')h+='<div class="zt">'+trk3(cur,['فتح الملف','التفكيك','القراءة والتحقق'],[s.total!=null?s.total+' إيصالًا':'',s.pickN?(s.done1||0)+' / '+s.pickN:'',s.pickN&&cur>=2?(s.done2||0)+' / '+s.pickN:''],!s.finished&&s.phase!=='pick',true)+'</div>';
    if(s.phase==='open')h+='<div class="zm"><span class="zsp"></span><b>جارٍ فتح الملف…</b><small>'+esc(s.size||'')+' — قد يستغرق لحظات للملفات الكبيرة</small></div>';
    if(s.phase==='err')h+='<div class="zm"><b style="color:#B00020">'+esc(s.err)+'</b></div><button type="button" class="zb" data-z="x">إغلاق</button>';
    if(s.phase==='pick'){var c=function(a){return s.list.filter(function(x){return x.age<=a;}).length;};
      h+='<div class="zh">اختر الفترة التي تريد إيصالاتها</div><div class="zg">'+[[0,'اليوم'],[1,'اليوم وأمس'],[7,'آخر 7 أيام'],[99999,'كل المحادثة']].map(function(o){var n=c(o[0]);return '<button type="button" data-z="'+o[0]+'"'+(n?'':' disabled')+'><b>'+n+'</b><small>'+o[1]+'</small></button>';}).join('')+'</div><div class="zn">المكرر والمستخدم في تسوية سابقة يُرفض تلقائيًا. الحد 300 إيصال في الدفعة.</div>';}
    if(s.phase==='work'){var n=s.pickN||1,pct=Math.round(((s.done1||0)*0.25+(s.done2||0)*0.75)/n*100);if(s.finished)pct=100;
      h+='<div class="zp"><i style="width:'+pct+'%"></i></div><div class="zs">'+(s.finished?(s.stop?'أُوقف — ':'اكتمل — ')+'تحقق من النتيجة':s.stage==='unzip'?'جارٍ تفكيك الإيصالات من الملف…':'جارٍ القراءة والتحقق من كل إيصال…')+' <b>'+pct+'%</b></div>'+
        (s.curName&&!s.finished?'<div class="zf">'+esc(s.curName)+'</div>':'')+
        '<div class="zk"><div><b style="color:#0E8F5B">'+(s.ok||0)+'</b><small>قُرئ بمبلغه</small></div><div><b style="color:#E08A00">'+(s.rev||0)+'</b><small>يحتاج مراجعة</small></div><div><b style="color:#B00020">'+(s.dup||0)+'</b><small>مكرر مرفوض</small></div></div>'+
        (pkFor!=='bulkSup'?'<div class="zsum"><span>مجموع المقروء</span><b>'+esc(typeof fmt==='function'?fmt(s.sum||0,0):(s.sum||0))+'</b></div>':'')+
        (s.finished?'<button type="button" class="zb" data-z="x">تم — عرض الإيصالات والمراجعة</button>':'<button type="button" class="zb ghost" data-z="stop">إيقاف</button>');}
    zEl().innerHTML=h+'</div>';ZV.classList.add('on');}
  async function zipFlow(zf,plain){ZS={name:zName(zf.name),size:Math.round(zf.size/1048576*10)/10+' MB',phase:'open',plain:plain};zPaint();
    try{if(!window.JSZip)await new Promise(function(res,rej){var sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';sc.onload=res;sc.onerror=function(){rej(new Error('تعذّر تحميل قارئ ZIP — تحقق من الاتصال'));};document.head.appendChild(sc);});
      var z=await window.JSZip.loadAsync(zf),list=[],t0=new Date();t0.setHours(0,0,0,0);
      z.forEach(function(p,en){if(en.dir)return;var nm=p.split('/').pop();if(!isDoc(nm,'')||/STICKER|-STK-/i.test(nm))return;
        var m=nm.match(/(20\d{2})-(\d{2})-(\d{2})/)||nm.match(/(20\d{2})(\d{2})(\d{2})/),d=m?new Date(+m[1],+m[2]-1,+m[3]):(en.date||null);
        list.push({nm:nm,en:en,age:d?Math.round((t0-new Date(d).setHours(0,0,0,0))/864e5):9999});});
      if(!list.length)throw new Error('لا صور ولا PDF في الملف — صدّر المحادثة مع الوسائط');
      ZS.list=list;ZS.total=list.length;ZS.phase='pick';zPaint();
    }catch(e){ZS.phase='err';ZS.err=(e&&e.message)||'تعذّر فتح الملف';zPaint();}}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  async function zRun(maxAge){var s=ZS,pick=s.list.filter(function(x){return x.age<=maxAge;}).sort(function(a,b){return a.age-b.age;}).slice(0,300);
    if(!pick.length)return;s.phase='work';s.stage='unzip';s.pickN=pick.length;s.done1=0;s.done2=0;s.ok=0;s.rev=0;s.dup=0;s.sum=0;s.stop=false;zPaint();
    var out=[];
    for(var i=0;i<pick.length&&!s.stop;i++){s.curName=pick[i].nm;try{var bl=await pick[i].en.async('blob'),ex=pick[i].nm.split('.').pop().toLowerCase();
        out.push(new File([bl],pick[i].nm,{type:ex==='pdf'?'application/pdf':ex==='png'?'image/png':ex==='webp'?'image/webp':'image/jpeg'}));}catch(e){s.rev++;}
      s.done1=i+1;if(i%3===0||i===pick.length-1)zPaint();}
    s.stage='read';s.pickN=out.length;s.done1=out.length;zPaint();
    if(pkFor==='bulkSup'){ /* المورد: المطابقة الجماعية تقرأ وتطابق بنفسها */
      s.curName='مطابقة جماعية مع إيصالات الزبون…';zPaint();
      try{if(typeof bulkSupMatch==='function')await bulkSupMatch(out.concat(s.plain||[]));}catch(e){}
      s.done2=out.length;s.ok=out.length-((typeof BULK!=='undefined'&&BULK)?BULK.length:0);s.rev=(typeof BULK!=='undefined'&&BULK)?BULK.length:0;s.finished=true;zPaint();return;}
    /* الزبون: 3 إيصالات في كل مرة — يُنتظر اكتمال قراءة كل واحد قبل التالي، فالعدّاد حقيقي */
    out=out.concat(s.plain||[]);s.pickN=out.length;
    for(var k=0;k<out.length&&!s.stop;k+=3){var chunk=out.slice(k,k+3);s.curName=chunk[0].name;zPaint();
      var before=(typeof RCPTS!=='undefined')?RCPTS.length:0;
      try{await addReceipts(chunk);}catch(e){}
      var mine=(typeof RCPTS!=='undefined')?RCPTS.slice(before):[];
      for(var w=0;w<240;w++){if(mine.every(function(r){return r.dup||r.parsed!==null;}))break;await sleep(250);}
      await sleep(350); /* مهلة لفحص المرجع المكرر الذي يتبع القراءة */
      mine.forEach(function(r){var p=r.parsed||{};if(r.dup&&!r.ok)s.dup++;else if(Number(p.amount)>0){s.ok++;s.sum+=Number(p.amount)||0;}else s.rev++;});
      s.rev+=chunk.length-mine.length;s.done2=Math.min(out.length,k+chunk.length);zPaint();}
    s.finished=true;s.curName='';zPaint();}
  sf.parentNode.insertBefore(up,sf);sf.style.display='none';
  var l1=up.previousElementSibling;if(l1&&l1.tagName==='LABEL')l1.textContent='الإيصالات والمطابقة';
  if(bs){[].forEach.call(bs.parentNode.children,function(c){if(c!==bs)c.style.display='none';});}
  var fs=$('sFwdSup');if(fs&&fs.previousElementSibling&&fs.previousElementSibling.tagName==='LABEL')fs.previousElementSibling.textContent='المورد المكلَّف — يُسجَّل على كل إيصال';

  /* ٥ شريط الأفعال الثابت */
  var foot=document.createElement('div');foot.id='shFoot';sh.appendChild(foot);
  if($('doPend'))foot.appendChild($('doPend'));else foot.style.gridTemplateColumns='1fr';
  foot.appendChild($('doSettle'));

  function txt(i){var e=$(i);return e?String(e.textContent||'').trim():'';}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function uniq(a,b){var o={},r=[];(a||[]).concat(b||[]).forEach(function(v){if(!o[v]){o[v]=1;r.push(v);}});return r;}
  async function patch(t,body){var r=await fetch(SB+'/bdl_transactions?id=eq.'+encodeURIComponent(t.id),{method:'PATCH',headers:H(),body:JSON.stringify(body)});
    if(!r.ok)throw new Error('خادم '+r.status);Object.assign(t,body);}
  /* استبعاد عملية من هذه التسوية: تعود «مفتوحة» في القائمة ولا تُحذف.
     إن كانت تحمل إيصالات التسوية المعلقة ومدفوعها فهذه تُنقل أولًا إلى عملية باقية — لا يضيع إيصال ولا يبقى محجوزًا على المستبعدة. */
  async function dropOp(id,btn){
    var s=selected(),t=s.find(function(x){return String(x.id)===String(id);});if(!t)return;
    if(s.length<2){say('هذه العملية الوحيدة — أغلق الشاشة بدل الاستبعاد');return;}
    if(!confirm('استبعاد '+String(t.ref||'').toUpperCase()+' ('+(typeof fmt==='function'?fmt(t.amount,0):t.amount)+' '+(t.ccy||'')+') من هذه التسوية؟\n\nلا تُحذف: تعود عملية مفتوحة في القائمة لتسوّيها لاحقًا، والإيصالات المحفوظة تبقى مع التسوية الحالية.'))return;
    if(btn){btn.disabled=true;btn.textContent='…';}
    try{var m=t.meta||{},had=!!(m.pending||(m.rcpt_ids||[]).length||(m.sup_rcpt_ids||[]).length||Number(m.paid_aoa));
      if(had){var keep=s.find(function(x){return x!==t;}),km=keep.meta||{};
        var nk=Object.assign({},km,{pending:true,pending_at:km.pending_at||m.pending_at||new Date().toISOString(),
          paid_aoa:Math.max(Number(km.paid_aoa)||0,Number(m.paid_aoa)||0),rcpt_ids:uniq(km.rcpt_ids,m.rcpt_ids),sup_rcpt_ids:uniq(km.sup_rcpt_ids,m.sup_rcpt_ids)});
        if(km.saved_rates==null&&m.saved_rates)nk.saved_rates=m.saved_rates;if(km.adj==null&&m.adj!=null)nk.adj=m.adj;
        await patch(keep,{status:'settling',meta:nk});
        var nm=Object.assign({},m);['pending','pending_at','paid_aoa','rcpt_ids','sup_rcpt_ids','saved_rates','adj'].forEach(function(k){delete nm[k];});
        await patch(t,{status:'open',meta:nm});}
    }catch(e){say('تعذّر الاستبعاد: '+(e.message||e));if(btn){btn.disabled=false;btn.textContent='استبعاد';}return;}
    Object.keys(SEL).forEach(function(k){if(SEL[k]&&SEL[k][t.id]){delete SEL[k][t.id];if(!Object.keys(SEL[k]).length)delete SEL[k];}});
    try{renderGroups();updateBar();}catch(e){}
    try{openSettle();}catch(e){}
    try{if(typeof loadGroups==='function')loadGroups();}catch(e){}
    say('استُبعدت العملية — عادت مفتوحة في القائمة');}
  function say(m){try{if(typeof toast==='function')toast(m);}catch(e){}}
  function paint(){try{
    var due=txt('ssDue'),priced=/\d/.test(due),paid=txt('ssPaid')||'0',pct=txt('ssPct'),diff=txt('ssDiff');
    var m=$('ssMatch'),ok=!!(m&&m.classList.contains('ok')),over=!!(m&&m.classList.contains('over'));
    $('shSub').textContent=(txt('ssN')||'—')+' عمليات · المستلم '+(txt('ssIn')||'—');
    $('shDue').textContent=priced?due:'أدخل السعر';$('shPaid').textContent=paid;$('shPct').textContent=pct||'—';
    $('shBar').style.width=Math.max(0,Math.min(100,parseFloat(pct)||0))+'%';
    $('shMsg').textContent=diff;hero.classList.toggle('ok',ok);hero.classList.toggle('over',over);
    var hasPaid=/[1-9]/.test(paid),cur=!priced?0:(ok?2:1);
    if(typeof trk3==='function')steps.innerHTML=trk3(cur,['التسعير','الإيصالات','التأكيد'],
      [priced?'مطبَّق':'مطلوب أولًا',hasPaid?(ok?'مغطّاة':over?'زيادة':'ناقصة'):'لم تُرفع',ok?'جاهزة':''],false,true);
    if(pv){var has=pv.children.length>0;pt.style.display=has?'block':'none';
      pt.textContent=pv.classList.contains('shCol')?'عرض الإيصالات المحفوظة ▾':'إخفاء الإيصالات المحفوظة ▴';}
    if(adj&&$('ssAdjV')&&$('ssAdjV').value)adj.classList.remove('shCol');
    var ops=(typeof selected==='function')?selected():[];
    opsBox.style.display=ops.length>1?'':'none';
    opsBox.innerHTML=ops.length>1?('<div class="t">عمليات هذه التسوية ('+ops.length+') — استبعد ما لا تريد تسويته الآن</div>'+ops.map(function(t){
      return '<div class="o"><div><b>'+esc(String(t.ref||'').toUpperCase())+'</b><small>'+esc(typeof fmt==='function'?fmt(t.amount,0):t.amount)+' '+esc(t.ccy||'')+'</small></div><button type="button" data-id="'+esc(t.id)+'">استبعاد</button></div>';}).join('')):'';
  }catch(e){}}
  /* ═══ 1375: ترتيب الإيصالات زمنيًا (الأحدث أولًا) — من تاريخ ووقت الإيصال المقروء، وإلا من ختم اسم الملف ═══ */
  function rcKey(r){var p=r.parsed||{},d=String(p.date||''),m,t=0;
    if((m=d.match(/(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)))t=new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0)).getTime();
    else if((m=d.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](20\d{2}|\d{2})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)))t=new Date(+(m[3].length===2?'20'+m[3]:m[3]),+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0)).getTime();
    var hasTime=!!(m&&m[4]!=null&&(m.index!=null));
    var n=String(((r.orig||r.file)||{}).name||''),f=n.match(/(20\d{2})-?(\d{2})-?(\d{2})[-_ T]?(\d{2})[-:]?(\d{2})[-:]?(\d{2})/),ft=f?new Date(+f[1],+f[2]-1,+f[3],+f[4],+f[5],+f[6]).getTime():0;
    if(!t||isNaN(t)){t=ft;hasTime=!!ft;}else if(!hasTime&&ft&&Math.abs(ft-t)<2*864e5){t=ft;hasTime=true;} /* تاريخ بلا وقت: يُكمَّل الوقت من ختم الملف */
    return {t:t||0,hasTime:hasTime};}
  function whenTxt(k){if(!k.t)return '';var d=new Date(k.t),z=function(x){return (x<10?'0':'')+x;};
    return z(d.getDate())+'/'+z(d.getMonth()+1)+'/'+d.getFullYear()+(k.hasTime?' · '+z(d.getHours())+':'+z(d.getMinutes()):'');}
  window.__shRcKey=rcKey;
  if(typeof window.renderRcpts==='function'&&!window.renderRcpts._sorted){var _rr=window.renderRcpts;
    window.renderRcpts=function(){try{if(typeof RCPTS!=='undefined'&&RCPTS.length&&!(typeof BULK!=='undefined'&&BULK&&BULK.length)){
        RCPTS.forEach(function(r){var k=rcKey(r);r._t=k.t;r._when=whenTxt(k);});
        RCPTS.forEach(function(r,i){if(r._ord==null)r._ord=(window.__shOrd=(window.__shOrd||0)+1);});
        RCPTS.sort(function(a,b){return (b._t||0)-(a._t||0)||a._ord-b._ord;});}}catch(e){}
      return _rr.apply(this,arguments);};window.renderRcpts._sorted=true;}

  /* ═══ 1375: زر الرجوع لا يُضيّع العمل — يغلق العارض أو يطلب تأكيدًا قبل ترك تسوية فيها إيصالات غير محفوظة ═══ */
  function rvOn(){var v=$('rcptView');return !!(v&&v.classList.contains('on'));}
  function unsaved(){try{return typeof RCPTS!=='undefined'&&RCPTS.length>0;}catch(e){return false;}}
  function trap(){try{if(!(history.state&&history.state.bdlTrap))history.pushState({bdlTrap:1},'');}catch(e){}}
  window.addEventListener('popstate',function(){
    if(rvOn()){$('rcptView').classList.remove('on');if(ov.classList.contains('on'))trap();return;}
    var zv=$('shZip');if(zv&&zv.classList.contains('on')){trap();return;}
    if(ov.classList.contains('on')){
      if(unsaved()&&!confirm('الخروج من التسوية؟\nالإيصالات المرفوعة غير المحفوظة ('+RCPTS.length+') ستُفقد.\n\nللاحتفاظ بها اضغط «إلغاء» ثم «حفظ مؤقت».')){trap();return;}
      try{closeOvl('settle');}catch(e){ov.classList.remove('on');}}});
  window.addEventListener('beforeunload',function(e){if(ov.classList.contains('on')&&unsaved()){e.preventDefault();e.returnValue='';}});
  new MutationObserver(function(){if(rvOn())trap();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  var mo=new MutationObserver(paint);
  ['ssDue','ssPaid','ssPct','ssDiff','ssN','ssIn','ssPrevR','ssMatch'].forEach(function(i){var e=$(i);if(e)mo.observe(e,{childList:true,characterData:true,subtree:true,attributes:i==='ssMatch',attributeFilter:i==='ssMatch'?['class']:undefined});});
  new MutationObserver(function(){if(ov.classList.contains('on')){trap();if(pv)pv.classList.add('shCol');sh.scrollTop=0;paint();}}).observe(ov,{attributes:true,attributeFilter:['class']});
  paint();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
