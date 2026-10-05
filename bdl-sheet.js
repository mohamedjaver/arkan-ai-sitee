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
  up.onclick=function(e){var b=e.target.closest('button');if(b&&$(b.dataset.u))$(b.dataset.u).click();};
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
  var mo=new MutationObserver(paint);
  ['ssDue','ssPaid','ssPct','ssDiff','ssN','ssIn','ssPrevR','ssMatch'].forEach(function(i){var e=$(i);if(e)mo.observe(e,{childList:true,characterData:true,subtree:true,attributes:i==='ssMatch',attributeFilter:i==='ssMatch'?['class']:undefined});});
  new MutationObserver(function(){if(ov.classList.contains('on')){if(pv)pv.classList.add('shCol');sh.scrollTop=0;paint();}}).observe(ov,{attributes:true,attributeFilter:['class']});
  paint();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
