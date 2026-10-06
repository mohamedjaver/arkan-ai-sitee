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
  '#bulkBox .mm{margin-top:10px}#bulkBox .mmP{padding:10px 12px;background:#F1F5FB;font-size:12.5px;font-weight:700;color:#0B2F70;margin-bottom:8px}'+
  '#bulkBox .mmS{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px}#bulkBox .mmS div{border:1px solid var(--line);background:#fff;padding:9px 4px;text-align:center}#bulkBox .mmS.all div:first-child{background:#E9F8EF;border-color:#0E8F5B}#bulkBox .mmS b{display:block;font-size:22px;font-family:"IBM Plex Mono",monospace}#bulkBox .mmS small{font-size:11px;color:#5C7699;font-weight:700}'+
  '#bulkBox .mp{display:grid;grid-template-columns:1fr 58px 1fr 34px;align-items:stretch;background:#E9F8EF;border:1.5px solid #0E8F5B;border-inline-start-width:6px;margin-bottom:6px}'+
  '#bulkBox .sd{padding:8px 10px;min-width:0;cursor:pointer}#bulkBox .sd small{display:block;font-size:10.5px;font-weight:800;color:#0B7A3B}#bulkBox .sd b{display:block;font-family:"IBM Plex Mono",monospace;font-size:15px;color:#0B2447;direction:ltr;text-align:start}#bulkBox .sd span{display:block;font-size:10.5px;color:#5C7699;direction:ltr;text-align:start;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '#bulkBox .md{display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0E8F5B;color:#fff}#bulkBox .md i{font-style:normal;font-size:20px;font-weight:900;line-height:1}#bulkBox .md small{font-size:9px;font-weight:800;margin-top:3px;text-align:center}'+
  '#bulkBox .mp>button,#bulkBox .mu>button{border:0;background:none;color:#8A97AD;font-size:15px;cursor:pointer}'+
  '#bulkBox .mmT{margin:12px 0 6px;font-size:12px;font-weight:800;color:#B00020}'+
  '#bulkBox .mu{display:flex;align-items:center;gap:6px;background:#FFF5F6;border:1px solid #F1C4CA;border-inline-start:6px solid #B00020;margin-bottom:6px}#bulkBox .mu .sd{flex:1}#bulkBox .mu select{flex:none;width:112px;height:38px;border:1px solid #C9D6EA;background:#fff;font-family:inherit;font-size:12px;font-weight:700;color:#0B2F70}#bulkBox .mu>button{width:34px;height:38px}'+
  '#bulkBox .mu2{background:#FFF5F6;border:1px solid #F1C4CA;border-inline-start:6px solid #B00020;margin-bottom:8px;padding:9px 10px}'+
  '#bulkBox .mu2 .r1{display:grid;grid-template-columns:1.2fr 1fr;gap:8px}#bulkBox .mu2 label small{display:block;font-size:10.5px;font-weight:800;color:#8A1A2B;margin-bottom:3px}'+
  '#bulkBox .mu2 input{width:100%;box-sizing:border-box;height:46px;border:1.5px solid #D9A5AE;background:#fff;padding:0 10px;font-family:"IBM Plex Mono",monospace;font-size:16px;font-weight:700;color:#0B2447;outline:none}#bulkBox .mu2 input:focus{border-color:#0B2F70}'+
  '#bulkBox .mu2 .r2{display:flex;gap:6px;margin-top:8px;align-items:stretch}#bulkBox .mu2 .r2 button,#bulkBox .mu2 .r2 select{height:42px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer}'+
  '#bulkBox .mu2 .vw{flex:1;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70}#bulkBox .mu2 select{flex:1;min-width:0;border:1.5px solid #C9D6EA;background:#fff;color:#0B2F70}#bulkBox .mu2 .go{flex:1;border:0;background:#0E8F5B;color:#fff}#bulkBox .mu2 .dl{flex:none;width:42px;border:1px solid #F1C4CA;background:#fff;color:#B00020}'+
  '#bulkBox .mu2 .nt{margin-top:7px;font-size:11.5px;font-weight:700;color:#B00020}#bulkBox .mu2 .fn{margin-top:5px;font-size:10px;color:#8A97AD;direction:ltr;text-align:start;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '#bulkBox .mmB{border:1px solid var(--line);background:#fff;margin-bottom:10px;font-size:12px}#bulkBox .mmB>div{display:grid;grid-template-columns:1.6fr .6fr 1.2fr .7fr;gap:6px;padding:7px 10px;border-top:1px solid var(--line);align-items:center}#bulkBox .mmB>div:first-child{border-top:0}#bulkBox .mmB .hd{background:#F7F9FC;font-weight:800;color:#5C7699;font-size:10.5px}#bulkBox .mmB span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#bulkBox .mmB span:first-child{font-weight:800;color:#0B2447}#bulkBox .mmB span:not(:first-child){font-family:"IBM Plex Mono",monospace;direction:ltr;text-align:start;font-weight:700}'+
  '#bulkBox .mcr{display:flex;align-items:center;gap:8px;background:#FFF9E8;border:1px solid #EAD48A;border-inline-start:6px solid #E0A300;margin-bottom:6px;padding:8px 10px}#bulkBox .mcr>div{flex:1;min-width:0}#bulkBox .mcr b{display:block;font-family:"IBM Plex Mono",monospace;font-size:15px;color:#0B2447;direction:ltr;text-align:start}#bulkBox .mcr span{display:block;font-size:10.5px;color:#8A6100;direction:ltr;text-align:start}#bulkBox .mcr button{flex:none;height:40px;padding:0 14px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-family:inherit;font-weight:800;font-size:12.5px;cursor:pointer}'+
  '#bulkBox .mc{display:flex;flex-wrap:wrap;gap:6px}#bulkBox .mc span{background:#FFF9E8;border:1px solid #EAD48A;padding:4px 8px;font-size:11px;font-weight:700;color:#8A6100;font-family:"IBM Plex Mono",monospace;direction:ltr}'+
  '#bulkBox .mmR{width:100%;height:42px;margin-top:10px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-weight:800;font-size:13px;font-family:inherit;cursor:pointer}'+
  '#toast,.toast{z-index:100050!important;bottom:calc(96px + env(safe-area-inset-bottom))!important}'+
  '#bulkBox button,#shUp button,#shFoot button,#shOps button{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}'+
  '#shStor{display:none;margin:0 0 12px;padding:11px 12px;background:#FFF1F1;border:1.5px solid #B00020;color:#8A1A2B;font-size:12.5px;line-height:1.7}#shStor b{display:block;font-size:13.5px;margin-bottom:2px}#shStor button{margin-top:8px;height:42px;padding:0 14px;border:0;background:#B00020;color:#fff;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer}'+
  '#shFoot{position:sticky;bottom:0;z-index:6;display:grid;grid-template-columns:2fr 3fr;gap:8px;margin:14px -16px 0;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid var(--line);box-shadow:0 -6px 16px rgba(11,47,112,.08)}'+
  '#shFoot button{width:100%!important;height:54px!important;margin:0!important;font-size:13.5px!important;line-height:1.3;white-space:normal}';
  document.head.appendChild(st);

  /* ١ الملخص الحي */
  var hero=document.createElement('div');hero.id='shHero';
  hero.innerHTML='<div class="sub" id="shSub"></div><div class="cells"><div class="due" id="shDueC"><small>المستحق</small><b id="shDue">—</b></div><div><small>المدفوع من الإيصالات</small><b id="shPaid">0</b></div><div class="pct"><small>التغطية</small><b id="shPct">—</b></div></div><div class="bar"><i id="shBar"></i></div><div class="msg" id="shMsg"></div>';
  var steps=document.createElement('div');steps.id='shSteps';
  var storBox=document.createElement('div');storBox.id='shStor';
  var opsBox=document.createElement('div');opsBox.id='shOps';opsBox.style.display='none';
  var ssum=sh.querySelector('.ssum');sh.insertBefore(hero,ssum);sh.insertBefore(storBox,ssum);sh.insertBefore(steps,ssum);sh.insertBefore(opsBox,ssum);
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
  function feed(files){if(!files.length)return;try{if(pkFor==='bulkSup'){var sn=($('sFwdSup')&&$('sFwdSup').value.trim())||'';[].forEach.call(files,function(f){if(!f._sup&&sn)f._sup=sn;});if(typeof bulkSupMatch==='function')bulkSupMatch(files);}else if(typeof addReceipts==='function')addReceipts(files);}catch(e){say('تعذّر الرفع: '+(e.message||e));}}
  function isDoc(n,ty){return /^image\//i.test(ty||'')||/pdf/i.test(ty||'')||/\.(jpe?g|png|webp|heic|pdf)$/i.test(n||'');}
  pk.onchange=async function(){var all=[].slice.call(pk.files||[]),zf=all.find(function(f){return /\.zip$/i.test(f.name||'')||/zip/i.test(f.type||'');});
    var plain=all.filter(function(f){return f!==zf&&isDoc(f.name,f.type);});
    if(!zf){if(!plain.length&&all.length)say('اختر صورًا أو PDF أو ملف ZIP');feed(plain);return;}
    if(zf.size>220*1048576&&!confirm('الملف كبير ('+Math.round(zf.size/1048576)+' MB) وقد لا يتحمله الهاتف.\nالأفضل تصدير «With selected media» للفترة فقط.\n\nالمتابعة؟'))return;
    zipFlow(zf,plain);};
  /* ═══ 1374: استيراد محادثة واتساب بشاشة كاملة — فتح ← تفكيك ← قراءة وتحقق، بشريط تقدم وعدّادات حية ═══ */
/* ═══ تاريخ كل مرفق من نص المحادثة نفسه (_chat.txt) — المصدر الوحيد الموثوق؛ اسم الملف يُقبل فقط بصيغة واتساب الصريحة، ولا يُخمَّن تاريخ من أرقام مرجع ═══ */
  function waStamp(nm){var m=String(nm).match(/(?:PHOTO|DOC|GIF|VIDEO|PTT|AUDIO)-(20\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/i),hasT=true;
    if(!m){m=String(nm).match(/(?:IMG|DOC|VID|PTT|AUD)-(20\d{2})(\d{2})(\d{2})-WA\d+/i);hasT=false;}
    if(!m)return 0;var y=+m[1],mo=+m[2],d=+m[3],h=hasT?+m[4]:12,mi=hasT?+m[5]:0,s=hasT?+m[6]:0;
    if(mo<1||mo>12||d<1||d>31||h>23||mi>59)return 0;var t=new Date(y,mo-1,d,h,mi,s).getTime();
    return (isNaN(t)||t>Date.now()+864e5)?0:t;}
  async function waChatIndex(z){var map={};try{var ce=null;z.forEach(function(p,en){if(en.dir)return;if(/(^|\/)_chat\.txt$/i.test(p))ce=en;else if(!ce&&/\.txt$/i.test(p))ce=en;});
      if(!ce)return map;var txt=await ce.async('string');
      var re=/^[\u200e\u200f\ufeff\s]*\[?(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?[\s\u202f\u00a0]*([APap])?/;
      var rows=[],all=[],cur=null,a13=false,b13=false;
      txt.split(/\r?\n/).forEach(function(line){var m=line.match(re);
        if(m){cur={a:+m[1],b:+m[2],c:+m[3],h:+m[4],mi:+m[5],s:+(m[6]||0),ap:(m[7]||'').toLowerCase(),y4:m[1].length===4};all.push(cur);if(!cur.y4){if(cur.a>12)a13=true;if(cur.b>12)b13=true;}}
        if(!cur)return;
        var f=line.match(/<[^:<>]{2,24}:\s*([^<>]+?\.(?:jpe?g|png|webp|heic|pdf))\s*>/i)||line.match(/:\s[\u200e\u200f]*([^:\n]+?\.(?:jpe?g|png|webp|heic|pdf))\s*\(/i);
        if(f)rows.push({n:f[1].replace(/[\u200e\u200f]/g,'').trim().toLowerCase(),d:cur});});
      var mk=function(d,mode){var y,mo,da;if(d.y4){y=d.a;mo=d.b;da=d.c;}else{y=d.c<100?2000+d.c:d.c;if(mode==='mdy'){mo=d.a;da=d.b;}else{da=d.a;mo=d.b;}}
        var h=d.h;if(d.ap==='p'&&h<12)h+=12;if(d.ap==='a'&&h===12)h=0;if(mo<1||mo>12||da<1||da>31)return 0;return new Date(y,mo-1,da,h,d.mi,d.s).getTime()||0;};
      var inv=function(mode){var n=0,p=0;all.forEach(function(d){var t=mk(d,mode);if(!t){n+=3;return;}if(t<p)n++;p=t;});return n;};
      var mode=a13?'dmy':b13?'mdy':(inv('mdy')<inv('dmy')?'mdy':'dmy'); /* عند الالتباس: الترتيب الزمني للمحادثة يحسم يوم/شهر */
      rows.forEach(function(r){var t=mk(r.d,mode);if(t&&t<=Date.now()+864e5)map[r.n]=t;});
    }catch(e){}return map;}
  function waAge(ts){if(!ts)return 9999;var a=new Date();a.setHours(0,0,0,0);var b=new Date(ts);b.setHours(0,0,0,0);return Math.max(0,Math.round((a-b)/864e5));}
  
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
      h+='<div class="zh">اختر الفترة التي تريد إيصالاتها</div><div class="zg">'+[[0,'اليوم'],[1,'اليوم وأمس'],[7,'آخر 7 أيام'],[99999,'كل المحادثة']].map(function(o){var n=c(o[0]);return '<button type="button" data-z="'+o[0]+'"'+(n?'':' disabled')+'><b>'+n+'</b><small>'+o[1]+'</small></button>';}).join('')+'</div><div class="zn">الفترة تُحسب من <b>تاريخ إرسال الرسالة في واتساب</b> لا من تاريخ الإيصال نفسه — إيصال قديم أُرسل اليوم يظهر ضمن اليوم، وتاريخه الحقيقي يُعرض على سطره بعد القراءة.'+(s.undated?'<br><b style="color:#B00020">'+s.undated+' مرفقًا بلا تاريخ معروف</b> — لا تدخل في أي فترة، تظهر فقط في «كل المحادثة».':'')+'<br>المكرر والمستخدم في تسوية سابقة يُرفض تلقائيًا. الحد 300 إيصال في الدفعة.</div>';}
    if(s.phase==='work'){var n=s.pickN||1,pct=Math.round(((s.done1||0)*0.25+(s.done2||0)*0.75)/n*100);if(s.finished)pct=100;
      h+='<div class="zp"><i style="width:'+pct+'%"></i></div><div class="zs">'+(s.finished?(s.stop?'أُوقف — ':'اكتمل — ')+'تحقق من النتيجة':s.stage==='unzip'?'جارٍ تفكيك الإيصالات من الملف…':'جارٍ القراءة والتحقق من كل إيصال…')+' <b>'+pct+'%</b></div>'+
        (s.curName&&!s.finished?'<div class="zf">'+esc(s.curName)+'</div>':'')+
        '<div class="zk"><div><b style="color:#0E8F5B">'+(s.ok||0)+'</b><small>'+(pkFor==='bulkSup'?'مطابق ✓':'قُرئ بمبلغه')+'</small></div><div><b style="color:#E08A00">'+(s.rev||0)+'</b><small>'+(pkFor==='bulkSup'?'بلا مقابل':'يحتاج مراجعة')+'</small></div><div><b style="color:#B00020">'+(s.dup||0)+'</b><small>مكرر مرفوض</small></div></div>'+
        (pkFor!=='bulkSup'?'<div class="zsum"><span>مجموع المقروء</span><b>'+esc(typeof fmt==='function'?fmt(s.sum||0,0):(s.sum||0))+'</b></div>':'')+
        (s.finished?'<button type="button" class="zb" data-z="x">تم — عرض الإيصالات والمراجعة</button>':'<button type="button" class="zb ghost" data-z="stop">إيقاف</button>');}
    zEl().innerHTML=h+'</div>';ZV.classList.add('on');}
  async function zipFlow(zf,plain){ZS={name:zName(zf.name),size:Math.round(zf.size/1048576*10)/10+' MB',phase:'open',plain:plain};zPaint();
    try{if(!window.JSZip)await new Promise(function(res,rej){var sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';sc.onload=res;sc.onerror=function(){rej(new Error('تعذّر تحميل قارئ ZIP — تحقق من الاتصال'));};document.head.appendChild(sc);});
      var z=await window.JSZip.loadAsync(zf),list=[],idx=await waChatIndex(z);
      z.forEach(function(p,en){if(en.dir)return;var nm=p.split('/').pop();if(!isDoc(nm,'')||/STICKER|-STK-/i.test(nm))return;
        var ts=idx[nm.toLowerCase()]||waStamp(nm)||0;list.push({nm:nm,en:en,ts:ts,age:waAge(ts)});});
      ZS.undated=list.filter(function(x){return !x.ts;}).length;
      if(!list.length)throw new Error('لا صور ولا PDF في الملف — صدّر المحادثة مع الوسائط');
      ZS.list=list;ZS.total=list.length;ZS.phase='pick';zPaint();
    }catch(e){ZS.phase='err';ZS.err=(e&&e.message)||'تعذّر فتح الملف';zPaint();}}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  async function zRun(maxAge){var s=ZS,pick=s.list.filter(function(x){return x.age<=maxAge;}).sort(function(a,b){return (b.ts||0)-(a.ts||0);}).slice(0,300);
    if(!pick.length)return;s.phase='work';s.stage='unzip';s.pickN=pick.length;s.done1=0;s.done2=0;s.ok=0;s.rev=0;s.dup=0;s.sum=0;s.stop=false;zPaint();
    var out=[];
    for(var i=0;i<pick.length&&!s.stop;i++){s.curName=pick[i].nm;try{var bl=await pick[i].en.async('blob'),ex=pick[i].nm.split('.').pop().toLowerCase();
        var nf=new File([bl],pick[i].nm,{type:ex==='pdf'?'application/pdf':ex==='png'?'image/png':ex==='webp'?'image/webp':'image/jpeg',lastModified:pick[i].ts||Date.now()});nf._waTs=pick[i].ts||0;if(pkFor==='bulkSup')nf._sup=s.name||'';out.push(nf);}catch(e){s.rev++;}
      s.done1=i+1;if(i%3===0||i===pick.length-1)zPaint();}
    s.stage='read';s.pickN=out.length;s.done1=out.length;zPaint();
    if(pkFor==='bulkSup'){ /* المورد: المطابقة الجماعية تقرأ وتطابق بنفسها */
      s.curName='مطابقة جماعية مع إيصالات الزبون…';zPaint();
      var allS=out.concat(s.plain||[]),n0=SHM.items.length;s.pickN=allS.length;
      try{await shMatch(allS,function(d){s.done2=d;s.curName='قراءة ومطابقة '+d+' / '+allS.length;var mine=SHM.items.slice(n0);s.ok=mine.filter(function(x){return x.to;}).length;s.dup=mine.filter(function(x){return x.gone;}).length;s.rev=mine.filter(function(x){return x.parsed&&!x.to&&!x.gone;}).length;zPaint();});}catch(e){}
      var mine=SHM.items.slice(n0);s.done2=allS.length;s.ok=mine.filter(function(x){return x.to;}).length;s.dup=mine.filter(function(x){return x.gone;}).length;s.rev=mine.filter(function(x){return !x.to&&!x.gone;}).length;s.supMode=true;s.finished=true;zPaint();return;}
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
    var of=(r.orig||r.file)||{},ft=waStamp(of.name||'')||of._waTs||0;
    if(!t||isNaN(t)){t=ft;hasTime=!!ft;}else if(!hasTime&&ft&&Math.abs(ft-t)<2*864e5){t=ft;hasTime=true;} /* تاريخ بلا وقت: يُكمَّل الوقت من ختم الملف */
    return {t:t||0,hasTime:hasTime};}
  function whenTxt(k){if(!k.t)return '';var d=new Date(k.t),z=function(x){return (x<10?'0':'')+x;};
    return z(d.getDate())+'/'+z(d.getMonth()+1)+'/'+d.getFullYear()+(k.hasTime?' · '+z(d.getHours())+':'+z(d.getMinutes()):'');}
  window.__shRcKey=rcKey;
  /* ═══ 1377: محرك المطابقة — كل إيصال مورد يُطابَق آليًا مع إيصال زبون (الجديد والمحفوظ في التسوية)، والنتيجة أزواج خضراء واضحة ═══
     القاعدة: واحد لواحد فقط — ① رقم العملية نفسه  ② المبلغ نفسه (بعدد متساوٍ من الجهتين).  لا تجميع ولا تخمين. */
  var SHM={items:[],saved:{}};window.__SHM=SHM;
  function nref(v){v=String(v==null?'':v).replace(/\s+/g,'').toUpperCase();return v.length>=5?v:'';}
  function amt(v){v=Number(v)||0;return v>=100?v:0;} /* مبلغ أقل من 100 = قراءة خاطئة، لا يُطابَق به */
  function custPool(){var out=[];
    try{(typeof RCPTS!=='undefined'?RCPTS:[]).forEach(function(r){var p=r.parsed;if(!p||(r.dup&&!r.ok))return;
      out.push({kind:'new',r:r,amount:amt(p.amount),ref:nref(p.ref),when:r._when||'',t:r._t||0,taken:!!r.supFile});});}catch(e){}
    try{var pr=(typeof SS!=='undefined'&&SS.prevRows)||{};Object.keys(pr).forEach(function(id){var x=pr[id],k=rcKey({parsed:{date:(x.ocr&&x.ocr.date)||''},file:{}});
      out.push({kind:'saved',row:x,amount:amt(x.amount),ref:nref(x.txn_ref),when:whenTxt(k),t:k.t,taken:!!((x.ocr&&x.ocr.sup_matched)||SHM.saved[x.id])});});}catch(e){}
    return out;}
  function link(it,cs,how){it.to=cs;it.how=how;var grp=cs.length>1;
    if(grp)it.covers=cs.filter(function(c){return c.kind==='new';}).map(function(c){return c.r.fp;});
    cs.forEach(function(c){c.taken=true;if(c.kind==='new'){try{attachSup(c.r,it);if(it.sup){c.r.sup=it.sup;if(!c.r.fwdTouched)c.r.fwdSup=it.sup;}}catch(e){}}else SHM.saved[c.row.id]=it;});}
  function matchAll(){var pool=custPool(),free=function(){return pool.filter(function(c){return !c.taken;});};
    var todo=function(){return SHM.items.filter(function(it){return !it.to&&!it.gone;});};
    /* ① المرجع */
    todo().forEach(function(it){var rf=nref((it.parsed||{}).ref);if(!rf)return;var c=free().find(function(x){return x.ref&&x.ref===rf;});if(c)link(it,[c],'ref');});
    /* ② المبلغ: فريد من الجهتين فقط */
    var byS={};todo().forEach(function(it){var a=amt((it.parsed||{}).amount);if(a)(byS[a]=byS[a]||[]).push(it);});
    Object.keys(byS).forEach(function(a){var cs=free().filter(function(c){return c.amount===+a;});if(byS[a].length===cs.length)byS[a].forEach(function(it,k){link(it,[cs[k]],'amt');});});
    /* 1380: لا تجميع — قاعدة العمل: لكل إيصال زبون إيصال مورد واحد مقابل. ما لا يُطابَق واحدًا لواحد يبقى أحمر للمراجعة. */
    return pool;}
  function sameC(a,b){return a.kind===b.kind&&(a.kind==='new'?a.r===b.r:String(a.row.id)===String(b.row.id));}
  function holderOf(c){return SHM.items.find(function(x){return !x.gone&&x.to&&x.to.some(function(y){return sameC(y,c);});})||null;}
  /* مطابقة موجَّهة بعد تصحيح يدوي: المطابقة التامة (مرجع أو مبلغ) تتقدم دائمًا على مطابقة «المجموع» وتنتزع الإيصال منها */
  function fixMatch(it){var p=it.parsed||{},rf=nref(p.ref),a=amt(p.amount),pool=custPool(),c=null,how='';
    var byRef=rf?pool.filter(function(x){return x.ref&&x.ref===rf;}):[],byAmt=a?pool.filter(function(x){return x.amount===a;}):[];
    c=byRef.find(function(x){return !x.taken;});how='ref';
    if(!c){c=byAmt.find(function(x){return !x.taken;});how='amt';}
    if(c){link(it,[c],how);return '';}
    var held=byRef.concat(byAmt);if(!held.length)return a?('لا يوجد في هذه التسوية أي إيصال زبون بالمبلغ '+f0(a)+(rf?' ولا بالمرجع '+rf:'')+' — ارفع إيصال الزبون أولًا'):'اكتب المبلغ كما في الإيصال ثم اضغط «طابق»';
    for(var i=0;i<held.length;i++){var h=holderOf(held[i]);
      if(h&&h.how==='sum'){unlink(h);var np=custPool(),nc=np.find(function(x){return sameC(x,held[i]);});if(nc){link(it,[nc],byRef.indexOf(held[i])>=0?'ref':'amt');matchAll();return '';}}
      if(!h){var c2=held[i];c2.taken=false;if(c2.kind==='saved')delete SHM.saved[c2.row.id];link(it,[c2],byRef.indexOf(c2)>=0?'ref':'amt');return '';}} /* علامة مطابقة من حفظ سابق بلا إيصال مورد حاضر — تُستبدل */
    var hh=holderOf(held[0]),hp=(hh&&hh.parsed)||{};
    return 'إيصال الزبون '+f0(held[0].amount)+' موجود لكنه مطابَق مع إيصال مورد آخر ('+f0(amt(hp.amount))+(nref(hp.ref)?' · '+nref(hp.ref):'')+') — إن كانت تلك المطابقة خاطئة فُكّها بزر ✕ ثم اضغط «طابق»';}
  function f0(n){return typeof fmt==='function'?fmt(n,0):String(n);}
  function showFile(url,isPdf,name){try{var v=$('rcptView');
      if(!v){v=document.createElement('div');v.id='rcptView';v.innerHTML='<div class="bar"><span id="rvT"></span><button onclick="document.getElementById(\'rcptView\').classList.remove(\'on\')">إغلاق</button></div><div class="body" id="rvB"></div>';document.body.appendChild(v);}
      $('rvT').textContent=name||'';
      if(isPdf)$('rvB').innerHTML='<iframe src="'+url+'"></iframe>';
      else{$('rvB').innerHTML='<div class="zw" id="rvZ"><img src="'+url+'" alt="" draggable="false"></div><div class="zb"><button onclick="rvZoom(-1)">−</button><span id="rvPct">100%</span><button onclick="rvZoom(1)">+</button><button onclick="rvZoom(0)">ملاءمة</button></div>';}
      v.classList.add('on');if(!isPdf&&typeof rvInit==='function')rvInit();}catch(e){}}
  function mRender(){var box=$('bulkBox');if(!box)return;var its=SHM.items.filter(function(x){return !x.gone;});
    if(!its.length&&!SHM.reading){box.style.display='none';box.innerHTML='';return;}
    var pool=custPool(),ok=its.filter(function(x){return x.to;}),un=its.filter(function(x){return !x.to;}),cfree=pool.filter(function(c){return !c.taken;});
    var h='<div class="mm">';
    if(SHM.reading)h+='<div class="mmP"><span class="zsp" style="width:18px;height:18px;border-width:2.5px"></span> جارٍ قراءة إيصالات المورد '+SHM.readDone+' / '+SHM.readN+'…</div>';
    h+='<div class="mmS'+(its.length&&!un.length&&!SHM.reading?' all':'')+'"><div><b style="color:#0E8F5B">'+ok.length+'</b><small>مطابق ✓</small></div><div><b style="color:#B00020">'+un.length+'</b><small>مورد بلا مقابل</small></div><div><b style="color:#E08A00">'+cfree.length+'</b><small>زبون بلا مورد</small></div></div>';
    var bySup={},order=[];its.forEach(function(it){var k=it.sup||'بلا اسم';if(!bySup[k]){bySup[k]={n:0,sum:0,un:0};order.push(k);}if(it.to){bySup[k].n++;bySup[k].sum+=amt((it.parsed||{}).amount);}else bySup[k].un++;});
    if(order.length&&(order.length>1||order[0]!=='بلا اسم'))h+='<div class="mmB"><div class="hd"><span>المورد</span><span>مطابق</span><span>المبلغ</span><span>بلا مقابل</span></div>'+order.map(function(k){var x=bySup[k];return '<div><span>'+esc(k)+'</span><span>'+x.n+'</span><span>'+f0(x.sum)+'</span><span'+(x.un?' style="color:#B00020"':'')+'>'+x.un+'</span></div>';}).join('')+'</div>';
    ok.forEach(function(it){var p=it.parsed||{},cs=it.to,ca=cs.reduce(function(a,c){return a+c.amount;},0),i=SHM.items.indexOf(it);
      h+='<div class="mp"><div class="sd" data-m="vc" data-i="'+i+'"><small>الزبون'+(cs.length>1?' · '+cs.length+' إيصالات':'')+'</small><b>'+f0(ca)+'</b><span>'+esc(cs.length>1?cs.map(function(c){return f0(c.amount);}).join(' + '):((cs[0].ref||'بلا مرجع')+(cs[0].when?' · '+cs[0].when:'')))+'</span></div>'+
        '<div class="md"><i>✓</i><small>'+(it.how==='ref'?'نفس المرجع':it.how==='amt'?'نفس المبلغ':it.how==='man'?'ربط يدوي':'المجموع')+'</small></div>'+
        '<div class="sd" data-m="vs" data-i="'+i+'"><small>المورد'+(it.sup?' · '+esc(it.sup):'')+'</small><b>'+f0(amt(p.amount))+'</b><span>'+esc(nref(p.ref)||'بلا مرجع')+'</span></div>'+
        '<button type="button" data-m="un" data-i="'+i+'" aria-label="فك">✕</button></div>';});
    if(un.length){h+='<div class="mmT">إيصالات مورد بلا مقابل — لم يُعثر على إيصال زبون بالمرجع أو المبلغ</div>';
      un.forEach(function(it){var p=it.parsed,i=SHM.items.indexOf(it),a=p?amt(p.amount):0;
        if(!p){h+='<div class="mu"><div class="sd"><b>…</b><span>'+esc(it.file.name)+'</span></div></div>';return;}
        h+='<div class="mu2"><div class="r1"><label><small>المبلغ'+(a?'':' — لم يُقرأ، اكتبه')+'</small><input data-f="amt" data-i="'+i+'" inputmode="decimal" dir="ltr" value="'+(a||'')+'" placeholder="المبلغ"></label>'+
          '<label><small>رقم العملية</small><input data-f="ref" data-i="'+i+'" dir="ltr" value="'+esc(nref(p.ref))+'" placeholder="المرجع"></label></div>'+
          '<div class="r2"><button type="button" class="vw" data-m="vs" data-i="'+i+'">فتح الإيصال</button>'+
          (cfree.length?'<select data-m="pick" data-i="'+i+'"><option value="">اربط بـ…</option>'+cfree.map(function(c){return '<option value="'+pool.indexOf(c)+'">'+f0(c.amount)+(c.ref?' · '+esc(c.ref):'')+'</option>';}).join('')+'</select>':'')+
          '<button type="button" class="go" data-m="fix" data-i="'+i+'">طابق</button><button type="button" class="dl" data-m="del" data-i="'+i+'" aria-label="حذف">✕</button></div>'+
          (it.note?'<div class="nt">'+esc(it.note)+'</div>':'')+'<div class="fn">'+esc(it.file.name)+'</div></div>';});}
    if(cfree.length&&its.length){h+='<div class="mmT" style="color:#8A6100">إيصالات زبون ما زالت بلا مورد ('+cfree.length+') — المجموع '+f0(cfree.reduce(function(a,c){return a+c.amount;},0))+'</div>'+
      cfree.map(function(c){return '<div class="mcr"><div><b>'+f0(c.amount)+'</b><span>'+esc((c.ref||'بلا مرجع')+(c.when?' · '+c.when:''))+'</span></div><button type="button" data-m="cv" data-c="'+pool.indexOf(c)+'">فتح الإيصال</button></div>';}).join('');}
    if(its.length&&!SHM.reading)h+='<button type="button" class="mmR" data-m="re">إعادة المطابقة</button>';
    box.innerHTML=h+'</div>';box.style.display='';SHM.pool=pool;}
  async function shMatch(files,onProg){files=[].slice.call(files||[]);if(!files.length)return;
    var fresh=files.map(function(f){return {file:f,url:URL.createObjectURL(f),isPdf:/pdf$/i.test(f.type||f.name||''),parsed:null,fp:null,to:null,sup:f._sup||((typeof SS!=='undefined'&&SS.fwdSup)||'')};});
    SHM.items=SHM.items.concat(fresh);SHM.reading=true;SHM.readN=fresh.length;SHM.readDone=0;try{BULK=[];}catch(e){}mRender();
    var qi=0;async function worker(){while(qi<fresh.length){var it=fresh[qi++];
        try{it.fp=await sha256(await it.file.arrayBuffer());}catch(e){}
        if(it.fp&&SHM.items.some(function(x){return x!==it&&x.fp===it.fp&&!x.gone;})){it.gone=true;}
        else{try{it.parsed=await Promise.race([readReceipt(it.file),new Promise(function(r){setTimeout(function(){r({});},60000);})])||{};}catch(e){it.parsed={};}if(it.sup)it.parsed.sup_name=it.sup;}
        SHM.readDone++;if(onProg)try{onProg(SHM.readDone,fresh.length);}catch(e){}matchAll();mRender();}}
    await Promise.all([worker(),worker(),worker()]);
    SHM.reading=false;matchAll();mRender();try{renderRcpts();updMatch();}catch(e){}}
  /* ملفات هذه الجلسة تبقى في الذاكرة: إيصال حُفظ للتوّ يُفتح حتى لو لم تُخزَّن صورته في المخزن */
  var KEEP=[];window.__shKeep=KEEP;
  function keepScan(){try{(typeof RCPTS!=='undefined'?RCPTS:[]).forEach(function(r){if(r&&r.url&&!r._tmp&&KEEP.indexOf(r)<0)KEEP.push(r);});if(KEEP.length>600)KEEP.splice(0,KEEP.length-600);}catch(e){}}
  function keepFind(row){var rf=nref(row.txn_ref),a=amt(row.amount),hit=null;
    if(rf)hit=KEEP.find(function(r){return r.parsed&&nref(r.parsed.ref)===rf;});
    if(!hit&&a){var c=KEEP.filter(function(r){return r.parsed&&amt(r.parsed.amount)===a&&(!rf||!nref(r.parsed.ref));});if(c.length===1)hit=c[0];}
    return hit;}
  async function openStored(path){ /* فتح من المخزن مع سبب واضح عند الفشل */
    var base=SB.replace('/rest/v1','')+'/storage/v1/object/',hd={apikey:ANON,Authorization:'Bearer '+((typeof TOK!=='undefined'&&TOK)||ANON)},r=null;
    try{r=await fetch(base+'authenticated/receipts/'+path,{headers:hd});if(!r.ok)r=await fetch(base+'public/receipts/'+path);}catch(e){say('تعذّر الاتصال بمخزن الصور');return;}
    if(!r.ok){say('تعذّر فتح الصورة من المخزن (خطأ '+r.status+')');return;}
    var bl=await r.blob();showFile(URL.createObjectURL(bl),/pdf/i.test(bl.type)||/\.pdf$/i.test(path),path.split('/').pop());}
  function openCust(c){if(!c)return;try{
      if(c.kind==='new'){var ix=RCPTS.indexOf(c.r);if(ix>=0){rcptView(ix,false);return;}showFile(c.r.url,c.r.isPdf,((c.r.orig||c.r.file)||{}).name);return;}
      var k=keepFind(c.row);if(k){showFile(k.url,k.isPdf,((k.orig||k.file)||{}).name);return;}
      var img=c.row.ocr&&c.row.ocr.image;if(img){openStored(img);return;}
      say(STOR.bad?'لا صورة لهذا الإيصال — مخزن الصور غير مفعّل (انظر التنبيه الأحمر أعلى الشاشة)':'هذا الإيصال حُفظ بلا صورة — لا ملف لفتحه');
      if(STOR.bad){try{var sb=$('shStor');if(sb&&sb.scrollIntoView)sb.scrollIntoView({block:'center'});}catch(e2){}}}catch(e){say('تعذّر فتح الإيصال');}}
  /* فحص مخزن الصور مرة واحدة: رفع ملف اختبار صغير — إن رُفض فالصور لا تُحفظ، ويظهر تنبيه مع كود الإصلاح */
  var STOR={done:false,bad:false,code:0};
  var STOR_SQL="insert into storage.buckets (id,name,public) values ('receipts','receipts',true) on conflict (id) do nothing;\ndrop policy if exists \"receipts_read\" on storage.objects;\ndrop policy if exists \"receipts_write\" on storage.objects;\ndrop policy if exists \"receipts_update\" on storage.objects;\ncreate policy \"receipts_read\" on storage.objects for select using (bucket_id='receipts');\ncreate policy \"receipts_write\" on storage.objects for insert to authenticated with check (bucket_id='receipts');\ncreate policy \"receipts_update\" on storage.objects for update to authenticated using (bucket_id='receipts');";
  async function storProbe(){if(STOR.done)return;STOR.done=true;
    try{ /* 1384: الاختبار بصورة PNG حقيقية (1×1) — الحاوية تقبل الصور و PDF فقط، وملف نصي كان يُرفض فيُظهر تنبيهًا كاذبًا */
      var b64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',bin=atob(b64),u8=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
      var r=await fetch(SB.replace('/rest/v1','')+'/storage/v1/object/receipts/settle/_probe.png',{method:'POST',headers:{apikey:ANON,Authorization:'Bearer '+((typeof TOK!=='undefined'&&TOK)||ANON),'Content-Type':'image/png','x-upsert':'true'},body:new Blob([u8],{type:'image/png'})});
      STOR.code=r.status;STOR.bad=!(r.ok||r.status===409);STOR.msg='';
      if(STOR.bad){try{var ej=await r.json();STOR.msg=String(ej.message||ej.error||'').slice(0,140);var sc=String(ej.statusCode||'');
          if(sc==='409'||/already exists|duplicate|mime type/i.test(STOR.msg))STOR.bad=false; /* الملف موجود = المخزن يعمل */
          STOR.why=/bucket not found/i.test(STOR.msg)||sc==='404'?'حاوية الصور «receipts» غير موجودة في Supabase':/row-level security|policy|unauthorized|403/i.test(STOR.msg+sc)?'الحاوية موجودة لكن صلاحيات الرفع غير مفعّلة':/jwt|token|signature/i.test(STOR.msg)?'توكن الجلسة مرفوض من المخزن — سجّل الخروج ثم الدخول':'';}catch(e){}}
    }catch(e){STOR.done=false;return;}
    var el=$('shStor');if(!el)return;
    if(STOR.bad){el.innerHTML='<b>تنبيه: صور الإيصالات لا تُحفظ (خطأ المخزن '+STOR.code+')</b>'+(STOR.why?'<span style="display:block;font-weight:800">السبب: '+esc(STOR.why)+'</span>':'')+(STOR.msg?'<span style="display:block;direction:ltr;text-align:start;font-size:11px;opacity:.8">'+esc(STOR.msg)+'</span>':'')+'الإيصالات تُقيَّد بمبالغها ومراجعها، لكن صورها تضيع بعد الحفظ فلا يمكن فتحها لاحقًا. الإصلاح مرة واحدة: انسخ الكود والصقه في Supabase ← SQL Editor ← Run.<br><button type="button" id="shStorB">نسخ كود الإصلاح</button>';el.style.display='block';
      $('shStorB').onclick=async function(){try{await navigator.clipboard.writeText(STOR_SQL);say('نُسخ الكود — الصقه في Supabase SQL Editor');}catch(e){prompt('انسخ الكود:',STOR_SQL);}};}
    else el.style.display='none';}
  function unlink(it){(it.to||[]).forEach(function(c){if(c.kind==='new'){try{rcptSupClear(RCPTS.indexOf(c.r));}catch(e){}}else if(!c.persisted)delete SHM.saved[c.row.id];});it.to=null;it.how='';it.covers=null;}
  if($('bulkBox'))$('bulkBox').addEventListener('click',function(e){var b=e.target.closest('[data-m]');if(!b||b.tagName==='SELECT')return;var it=SHM.items[+b.dataset.i],m=b.dataset.m;
    if(m==='cv'){openCust((SHM.pool||[])[+b.dataset.c]);return;}
    if(m==='re'){matchAll();mRender();try{renderRcpts();updMatch();}catch(x){}return;}if(!it)return;
    if(m==='fix'){var box=$('bulkBox'),ia=box.querySelector('input[data-f="amt"][data-i="'+b.dataset.i+'"]'),ir=box.querySelector('input[data-f="ref"][data-i="'+b.dataset.i+'"]');
      it.parsed=it.parsed||{};var na=parseFloat(String(ia?ia.value:'').replace(/[^\d.]/g,''))||0;
      if(na>0){if(na!==Number(it.parsed.amount))it.manual=true;it.parsed.amount=na;}
      if(ir){it.parsed.ref=ir.value.trim()||null;}
      it.note=fixMatch(it)||'';
      mRender();try{renderRcpts();updMatch();}catch(x){}return;}
    if(m==='vs')showFile(it.url,it.isPdf,it.file.name);
    else if(m==='vc'){openCust(it.to&&it.to[0]);}
    else if(m==='un'){unlink(it);mRender();try{renderRcpts();updMatch();}catch(x){}}
    else if(m==='del'){unlink(it);it.gone=true;mRender();}});
  if($('bulkBox'))$('bulkBox').addEventListener('change',function(e){var sl=e.target.closest('select[data-m="pick"]');if(!sl||sl.value==='')return;var it=SHM.items[+sl.dataset.i],c=(SHM.pool||[])[+sl.value];
    if(it&&c&&!c.taken){link(it,[c],'man');mRender();try{renderRcpts();updMatch();}catch(x){}}});
  /* حفظ مطابقات الإيصالات المحفوظة مع التسوية: إيصال المورد يُخزَّن بجانب side=supplier ويُعلَّم إيصال الزبون بأنه مطابَق */
  async function persistSaved(){var ids=Object.keys(SHM.saved);for(var i=0;i<ids.length;i++){var it=SHM.saved[ids[i]],c=(it.to||[]).find(function(x){return x.kind==='saved'&&String(x.row.id)===String(ids[i]);});
      if(!c||c.persisted||!it.fp)continue;var p=it.parsed||{},row=c.row;
      try{if(!it.path)it.path=await rcptStore(it.file,it.fp);
        if(!it.stored){var b={fingerprint:it.fp,amount:p.amount||null,ccy:p.ccy||row.ccy||null,bank:p.bank||null,account_no:p.account||null,txn_ref:p.ref||null,
            ocr:Object.assign({},p,{side:'supplier',sup_name:it.sup||(typeof SS!=='undefined'&&SS.fwdSup)||null,cust_ref:row.txn_ref||null,cust_ids:(it.to||[]).filter(function(x){return x.kind==='saved';}).map(function(x){return x.row.id;}),matched_at:new Date().toISOString(),image:it.path})};
          var r1=await fetch(SB+'/bdl_receipts',{method:'POST',headers:H({Prefer:'return=minimal,resolution=merge-duplicates'}),body:JSON.stringify(b)});if(r1.ok||r1.status===409)it.stored=true;}
        var no=Object.assign({},row.ocr||{},{sup_fp:it.fp,sup_matched:true,sup_how:it.how},it.sup?{fwd_sup:it.sup,sup_name:it.sup,fwd_at:new Date().toISOString()}:{});
        var r2=await fetch(SB+'/bdl_receipts?id=eq.'+encodeURIComponent(row.id),{method:'PATCH',headers:H(),body:JSON.stringify({ocr:no})});
        if(r2.ok){row.ocr=no;c.persisted=true;}}catch(e){}}}
  ['savePending','commitSettle'].forEach(function(fn){var o=window[fn];if(typeof o!=='function'||o._shm)return;
    window[fn]=async function(){try{await persistSaved();}catch(e){}return o.apply(this,arguments);};window[fn]._shm=true;});
  if(typeof window.bulkSupMatch==='function')window.bulkSupMatch=shMatch;
  new MutationObserver(function(){if(ov.classList.contains('on')&&!SHM._open){SHM._open=true;SHM.items=[];SHM.saved={};mRender();}else if(!ov.classList.contains('on'))SHM._open=false;}).observe(ov,{attributes:true,attributeFilter:['class']});

  if(typeof window.renderRcpts==='function'&&!window.renderRcpts._sorted){var _rr=window.renderRcpts;
    window.renderRcpts=function(){try{keepScan();}catch(e){}try{if(typeof RCPTS!=='undefined'&&RCPTS.length&&!(typeof BULK!=='undefined'&&BULK&&BULK.length)){
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
  new MutationObserver(function(){if(ov.classList.contains('on')){trap();try{storProbe();}catch(e){}if(pv)pv.classList.add('shCol');sh.scrollTop=0;paint();}}).observe(ov,{attributes:true,attributeFilter:['class']});
  paint();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
