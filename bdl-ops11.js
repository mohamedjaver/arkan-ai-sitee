/* ═══════════════════════════════════════════════════════════════════
   bdl-ops11.js — أرشيف العمليات v2 (Build 1149) — طبقة إضافية فوق settle-v2
   • هيدر + تاريخ، 4 بطاقات إحصاء (المرسل / المستلم / العمليات / متوسط السعر) تتبع الفلاتر
   • بطاقات عمليات نظيفة: المرجع + العميل يمينًا، المبلغ MRU كبير + AOA يسارًا، شارات الحالة/السعر/الوقت
   • الإجراءات مخفية حتى التوسيع: عرض التفاصيل / الإيصالات / حذف التسوية / حذف العملية
   • شريط ملخص سفلي ثابت: الإجمالي المرسل ← الإجمالي المستلم (للنتائج المعروضة)
   • Fade-in متدرج، تحسينات hover، وتجميع يومي بإجماليات
   يستبدل renderArchive فقط؛ يعيد استخدام unsettle/delTx القائمتين. هوية BDL الزرقاء (لا بنفسجي، لا رموز تعبيرية).
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
(function(){
const q=s=>document.querySelector(s);
const A={open:{},meta:{}};
const isDone=t=>t.status==='settled'||t.status==='done';

const css=document.createElement('style');css.textContent=`
#v-archive .chips{padding-inline-end:26px}
.a11hd{display:flex;justify-content:space-between;align-items:center;margin:12px 12px 0}
.a11hd h2{font-size:18px;font-weight:800;color:var(--navy);margin:0}
.a11hd .dt{font-size:12px;font-weight:700;color:var(--muted);background:#fff;border:1px solid var(--line);border-radius:999px;padding:5px 12px;font-family:"Inter",sans-serif}
.a11st{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 12px 0}
@media(min-width:560px){.a11st{grid-template-columns:repeat(4,1fr)}}
.a11st>div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 13px}
.a11st .l{font-size:11px;color:var(--muted);font-weight:700}
.a11st .v{font-size:19px;font-weight:800;color:var(--ink);margin-top:3px;font-family:"Inter",sans-serif;direction:ltr;text-align:right;letter-spacing:-.3px}
.a11st .v small{font-size:11px;font-weight:700;color:var(--muted);margin-left:3px}
.a11st .s{font-size:10.5px;color:#9AA7B8;margin-top:3px}
.a11day{display:flex;justify-content:space-between;align-items:center;padding:14px 4px 6px;font-size:11.5px;color:var(--muted)}
.a11day b{color:var(--navy);font-size:12.5px;font-family:"Inter",sans-serif}
.a11day span{font-family:"Inter",sans-serif;direction:ltr}
.a11c{background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;padding:13px 14px;cursor:pointer;box-shadow:0 1px 2px rgba(11,47,112,.04);
  transition:transform .15s,box-shadow .15s;animation:a11in .35s ease both}
@keyframes a11in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.a11c:hover{transform:translateY(-2px);box-shadow:0 8px 18px -6px rgba(11,47,112,.18)}
.a11c.open{border-color:#B9CCEB;box-shadow:0 8px 20px -8px rgba(11,47,112,.22)}
.a11top{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
.a11who .ref{font-size:11.5px;color:var(--blue);font-weight:700;font-family:"Inter",sans-serif;direction:ltr;text-align:right;letter-spacing:.2px}
.a11who .nm{font-size:14px;font-weight:800;color:var(--ink);margin-top:2px}
.a11who .acc{font-size:10.5px;color:var(--muted);font-family:"Inter",sans-serif;margin-top:1px}
.a11amt{text-align:left;direction:ltr}
.a11amt .m{font-size:22px;font-weight:800;color:var(--ink);font-family:"Inter",sans-serif;letter-spacing:-.4px;line-height:1.1}
.a11amt .m small{font-size:12px;color:var(--muted);font-weight:700;margin-left:3px}
.a11amt .a{font-size:13px;color:var(--muted);font-family:"Inter",sans-serif;margin-top:2px}
.a11amt .a.bad{color:var(--bad);font-weight:700}
.a11bd{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center}
.a11b{font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--wash);color:var(--muted);font-family:"Inter",sans-serif}
.a11b.ok{background:#E3F7EE;color:var(--ok)}.a11b.wait{background:#E5F0FF;color:var(--blue)}.a11b.open{background:#FFF4E2;color:var(--warn)}
.a11b.rate{background:#F1F5FB;color:var(--navy)}
.a11x{display:none;border-top:1px solid var(--line);margin-top:12px;padding-top:12px}
.a11c.open .a11x{display:block}
.a11kv{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:11.5px}
.a11kv div{display:flex;justify-content:space-between;gap:8px;border-bottom:1px dashed var(--line);padding:5px 0;color:var(--muted)}
.a11kv b{font-family:"Inter",sans-serif;color:var(--ink);font-weight:700;direction:ltr;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:62%}
.a11act{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
.a11act button{flex:1 1 auto;border:1px solid var(--line);background:#fff;color:var(--navy);font-weight:800;font-size:11.5px;padding:9px 10px;border-radius:9px;font-family:inherit;cursor:pointer;white-space:nowrap}
.a11act button.pri{background:var(--navy);color:#fff;border-color:var(--navy)}
.a11act button.warn{border-color:#F5B5B0;background:#FFF5F5;color:#B00020}
.a11act button.del{background:#B00020;color:#fff;border-color:#B00020}
.a11rc{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.a11rc a{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:9px;padding:8px 11px;font-size:11.5px;color:var(--blue);font-weight:700;text-decoration:none;background:var(--wash)}
.a11rc a span{font-family:"Inter",sans-serif;color:var(--muted);font-weight:600}
.a11sum{position:fixed;left:0;right:0;bottom:0;z-index:40;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-top:1px solid var(--line);
  padding:10px 16px calc(10px + env(safe-area-inset-bottom));display:none;justify-content:space-between;align-items:center;gap:10px;font-size:12px;color:var(--muted)}
.a11sum.on{display:flex}
.a11sum b{font-family:"Inter",sans-serif;color:var(--navy);font-size:14px;direction:ltr}
.a11sum .arr{color:var(--muted);font-size:16px}
@media(min-width:760px){.a11sum{max-width:760px;inset-inline:calc(50% - 380px)}}
`;document.head.appendChild(css);

function ensure(){
  const v=q('#v-archive');if(!v||q('#a11hd'))return;
  v.insertAdjacentHTML('afterbegin','<div class="a11hd" id="a11hd"><h2>أرشيف العمليات</h2><span class="dt" id="a11dt"></span></div><div class="a11st" id="a11st"></div>');
  /* الفلاتر بعد البطاقات */
  const fb=v.querySelector('.fbar');if(fb)q('#a11st').insertAdjacentElement('afterend',fb);
  if(!q('#a11sum'))document.body.insertAdjacentHTML('beforeend','<div class="a11sum" id="a11sum"></div>');
}
const rateOf=t=>{if(!t.rate)return null;let r=Number(t.rate);if(t.ccy==='MRU'&&(t.settle_ccy||'AOA')==='AOA')r*=10;return r;};
const rateTxt=r=>r==null?'':r.toFixed(4).replace(/0+$/,'').replace(/\.$/,'');
function stBadge(t){
  if(isDone(t))return '<span class="a11b ok">تمت</span>';
  if(t.status==='settling')return '<span class="a11b wait">قيد التسوية</span>';
  return '<span class="a11b open">مفتوحة</span>';
}
function filtered(){
  const s=(q('#aq').value||'').trim().toLowerCase();
  return (window.ARCH||[]).filter(t=>{
    if(ARCH_ST==='settled'&&!isDone(t))return false;
    if(ARCH_ST!=='ALL'&&ARCH_ST!=='settled'&&t.status!==ARCH_ST)return false;
    if(!s)return true;
    return [t.ref,t.customer_name,t.account_number,String(t.amount),t.ccy,String(t.settle_amount||''),new Date(t.created_at).toLocaleDateString('en-GB')].join(' ').toLowerCase().indexOf(s)>=0;
  });
}
function stats(rows){
  const T={n:0,done:0,wait:0,open:0,inn:{},out:{},sumAmt:0,sumSet:0};
  rows.forEach(t=>{T.n++;if(isDone(t))T.done++;else if(t.status==='settling')T.wait++;else T.open++;
    T.inn[t.ccy]=(T.inn[t.ccy]||0)+Number(t.amount);
    if(t.settle_amount){const c=t.settle_ccy||'AOA';T.out[c]=(T.out[c]||0)+Number(t.settle_amount);
      if(t.ccy==='MRU'&&c==='AOA'){T.sumAmt+=Number(t.amount);T.sumSet+=Number(t.settle_amount);}}});
  T.avgRate=T.sumSet?T.sumAmt*10/T.sumSet:null;return T;
}
const ccyList=o=>Object.keys(o).map(c=>'<span class="num">'+fmt(o[c],0)+'</span> '+esc(c)).join(' + ')||'—';
function renderStats(rows){
  const T=stats(rows),dates=rows.map(t=>new Date(t.created_at));
  const dtxt=dates.length?(dates[dates.length-1].toLocaleDateString('en-GB')+(dates.length>1&&dates[0].toDateString()!==dates[dates.length-1].toDateString()?' — '+dates[0].toLocaleDateString('en-GB'):'')):new Date().toLocaleDateString('en-GB');
  q('#a11dt').textContent=dtxt;
  const top=o=>Object.keys(o).sort((a,b)=>o[b]-o[a])[0];const mainIn=top(T.inn)||'MRU',mainOut=top(T.out)||'AOA';
  q('#a11st').innerHTML=
    '<div><div class="l">إجمالي المرسل</div><div class="v">'+fmt(T.inn[mainIn]||0,0)+'<small>'+esc(mainIn)+'</small></div><div class="s">'+(Object.keys(T.inn).length>1?ccyList(T.inn):T.n+' عملية')+'</div></div>'+
    '<div><div class="l">إجمالي المستلم</div><div class="v">'+fmt(T.out[mainOut]||0,0)+'<small>'+esc(mainOut)+'</small></div><div class="s">'+(Object.keys(T.out).length>1?ccyList(T.out):'بعد التسوية')+'</div></div>'+
    '<div><div class="l">العمليات</div><div class="v">'+T.n+'</div><div class="s"><span class="num">'+T.done+'</span> تمت · <span class="num">'+T.wait+'</span> قيد · <span class="num">'+T.open+'</span> مفتوحة</div></div>'+
    '<div><div class="l">متوسط السعر</div><div class="v">'+(T.avgRate?rateTxt(T.avgRate):'—')+'</div><div class="s">MRU ↔ AOA مرجّح بالحجم</div></div>';
  const sm=q('#a11sum');
  sm.innerHTML='<span>الإجمالي المرسل <b>'+fmt(T.inn[mainIn]||0,0)+' '+esc(mainIn)+'</b></span><span class="arr">←</span><span>الإجمالي المستلم <b>'+fmt(T.out[mainOut]||0,0)+' '+esc(mainOut)+'</b></span>';
}
function card(t,i){
  const d=new Date(t.created_at),id=t.tx_id||t.id,r=rateOf(t),open=!!A.open[id];
  return '<div class="a11c'+(open?' open':'')+'" data-a11="'+id+'" style="animation-delay:'+Math.min(i,12)*35+'ms" onclick="a11.toggle(\''+id+'\')">'+
    '<div class="a11top"><div class="a11who"><div class="ref">'+esc(t.ref)+'</div><div class="nm">'+esc(t.customer_name||'—')+'</div>'+
      (t.account_number&&t.account_number!=='—'?'<div class="acc">'+esc(t.bank||'')+' ····'+esc(String(t.account_number).slice(-4))+'</div>':'')+'</div>'+
    '<div class="a11amt"><div class="m">'+fmt(t.amount)+'<small>'+esc(t.ccy)+'</small></div>'+
      (t.settle_amount?'<div class="a">'+fmt(t.settle_amount,0)+' '+esc(t.settle_ccy||'AOA')+'</div>':'<div class="a bad">بلا سعر</div>')+'</div></div>'+
    '<div class="a11bd">'+stBadge(t)+(r?'<span class="a11b rate">سعر '+rateTxt(r)+'</span>':'')+'<span class="a11b">'+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</span></div>'+
    '<div class="a11x" onclick="event.stopPropagation()" id="a11x-'+id+'">'+(open?detail(t):'')+'</div></div>';
}
function detail(t){
  const d=new Date(t.created_at),m=A.meta[t.tx_id||t.id]||{},r=rateOf(t),rb=m.meta&&m.meta.rate_cost?Number(m.meta.rate_cost):null;
  const net=(m.cost!=null&&t.settle_amount)?Number(t.settle_amount)-Number(m.cost):null;
  const kv=(l,v)=>'<div><span>'+l+'</span><b>'+v+'</b></div>';
  return '<div class="a11kv">'+kv('نوع العملية',esc(t.ccy)+' → '+esc(t.settle_ccy||'AOA'))+kv('التاريخ',d.toLocaleDateString('en-GB')+' '+d.toLocaleTimeString('en-GB'))+
    kv('سعر البيع',r?rateTxt(r):'—')+kv('سعر الشراء',rb?rateTxt(rb):(m.loaded?'—':'…'))+
    kv('الربح',net!=null?'<span class="'+(net>=0?'pos':'neg')+'" style="color:'+(net>=0?'var(--ok)':'var(--bad)')+'">'+(net>=0?'+':'−')+fmt(Math.abs(net),0)+' '+esc(t.settle_ccy||'AOA')+'</span>':(m.loaded?'بلا تكلفة':'…'))+
    kv('الهاتف',esc(t.phone||'—'))+kv('التسوية',t.settlement_id?'…'+String(t.settlement_id).slice(-6):'—')+kv('الحالة',isDone(t)?'مسوّاة':t.status==='settling'?'قيد التسوية':'مفتوحة')+'</div>'+
    '<div class="a11rc" id="a11rc-'+(t.tx_id||t.id)+'"></div>'+
    '<div class="a11act"><button class="pri" onclick="a11.details(\''+(t.tx_id||t.id)+'\')">عرض التفاصيل</button><button onclick="a11.receipts(\''+(t.tx_id||t.id)+'\')">الإيصالات</button>'+
    (isDone(t)&&t.settlement_id?'<button class="warn" onclick="unsettle(\''+t.settlement_id+'\',\''+esc(t.ref)+'\')">حذف التسوية</button>':'')+
    '<button class="del" onclick="delTx(\''+(t.tx_id||t.id)+'\',\''+(t.settlement_id||'')+'\',\''+esc(t.ref)+'\')">حذف العملية</button></div>';
}
function render(){
  if(!window.ARCH)return;ensure();
  const rows=filtered();renderStats(rows);
  const list=rows.slice(0,200),out=[];let day='',buf=[],dIn={},dSet={};
  const head=k=>'<div class="a11day"><b>'+k+'</b><span>'+ccyList(dIn)+(Object.keys(dSet).length?' ← '+ccyList(dSet):'')+'</span></div>';
  list.forEach((t,i)=>{const k=new Date(t.created_at).toLocaleDateString('en-GB');
    if(k!==day){if(buf.length)out.push(head(day)+buf.join(''));day=k;buf=[];dIn={};dSet={};}
    dIn[t.ccy]=(dIn[t.ccy]||0)+Number(t.amount);if(t.settle_amount)dSet[t.settle_ccy||'AOA']=(dSet[t.settle_ccy||'AOA']||0)+Number(t.settle_amount);
    buf.push(card(t,i));});
  if(buf.length)out.push(head(day)+buf.join(''));
  q('#archList').innerHTML=out.join('')||'<div class="empty">لا نتائج</div>';
  q('#a11sum').classList.toggle('on',q('#v-archive').style.display!=='none'&&rows.length>0);
}
async function loadMeta(id){
  if(A.meta[id]&&A.meta[id].loaded)return;
  try{const r=await fetch(SB+'/bdl_transactions?select=meta,cost&id=eq.'+id,{headers:H()});const j=r.ok?await r.json():[];A.meta[id]=Object.assign({loaded:true},j[0]||{});}catch(e){A.meta[id]={loaded:true};}
  const t=(window.ARCH||[]).find(x=>(x.tx_id||x.id)===id),x=q('#a11x-'+id);if(t&&x&&A.open[id])x.innerHTML=detail(t);
}
window.a11={
  toggle:id=>{A.open[id]=!A.open[id];const c=document.querySelector('[data-a11="'+id+'"]');if(!c)return;c.classList.toggle('open',!!A.open[id]);
    const t=(window.ARCH||[]).find(x=>(x.tx_id||x.id)===id),x=q('#a11x-'+id);if(A.open[id]&&t&&x){x.innerHTML=detail(t);loadMeta(id);}},
  details:id=>{if(window.p10&&p10.state&&p10.state.rows.some(r=>r.id===id)){p10.detail(id);return;}
    const t=(window.ARCH||[]).find(x=>(x.tx_id||x.id)===id);if(!t)return;
    const lines=['المرجع: '+t.ref,'العميل: '+(t.customer_name||'—'),'المبلغ: '+fmt(t.amount)+' '+t.ccy,'المستلم: '+(t.settle_amount?fmt(t.settle_amount,0)+' '+(t.settle_ccy||'AOA'):'—'),'السعر: '+(rateTxt(rateOf(t))||'—'),'التاريخ: '+new Date(t.created_at).toLocaleString('en-GB')];
    (navigator.clipboard?navigator.clipboard.writeText(lines.join('\n')):Promise.reject()).then(()=>toast('نُسخت تفاصيل العملية ✓'),()=>alert(lines.join('\n')));},
  receipts:async id=>{const t=(window.ARCH||[]).find(x=>(x.tx_id||x.id)===id),box=q('#a11rc-'+id);if(!t||!box)return;box.innerHTML='<span style="font-size:11px;color:var(--muted)">جارٍ جلب الإيصالات…</span>';
    let list=[];
    try{ if(t.settlement_id){const r=await fetch(SB+'/bdl_settlement_receipts?select=receipt_id,bdl_receipts(id,file_url,amount,ccy,bank,txn_ref)&settlement_id=eq.'+t.settlement_id,{headers:H()});
          if(r.ok)list=(await r.json()).map(x=>x.bdl_receipts).filter(Boolean);}
      if(!list.length){await loadMeta(id);const ids=(A.meta[id].meta&&A.meta[id].meta.rcpt_ids)||[];
        if(ids.length){const r=await fetch(SB+'/bdl_receipts?select=id,file_url,amount,ccy,bank,txn_ref&id=in.('+ids.join(',')+')',{headers:H()});if(r.ok)list=await r.json();}}
    }catch(e){}
    box.innerHTML=list.length?list.map((r,i)=>'<a href="'+esc(r.file_url||'#')+'" target="_blank" rel="noopener" download="BDL-'+esc(t.ref)+'-'+(i+1)+'"'+(r.file_url?'':' onclick="event.preventDefault();toast(\'لا ملف مرفق\')"')+'>'+
      '<span style="color:var(--blue);font-family:inherit">إيصال '+(i+1)+(r.bank?' · '+esc(r.bank):'')+'</span><span>'+(r.amount?fmt(r.amount,0)+' '+esc(r.ccy||''):'')+(r.txn_ref?' · '+esc(String(r.txn_ref).slice(-8)):'')+'</span></a>').join('')
      :'<span style="font-size:11px;color:var(--muted)">لا إيصالات مرتبطة بهذه العملية</span>';}
};
window.renderArchive=render;
const G=window.go;window.go=function(t){G.apply(this,arguments);const s=q('#a11sum');if(s)s.classList.toggle('on',t==='archive'&&!!(window.ARCH&&filtered().length));};
if(window.ARCH)render();
console.log('bdl-ops11: أرشيف العمليات v2 جاهز ✓');
})();
