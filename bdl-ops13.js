/* ═══════════════════════════════════════════════════════════════════
   bdl-ops13.js — مركز المطابقة (Build 1151) — يحل محل تبويب «الدفاتر» (ops8 يبقى محمّلًا ومخفيًا)
   • إيصالات الزبائن: كل إيصال رُفع في التسويات (bdl_receipts ← bdl_settlement_receipts / meta.rcpt_ids)
     من العمليات المسوّاة (ربحها مسجّل) والمعلقة، + إيصالات العمليات (bdl_op_receipts side=in)،
     + ما يُرفع هنا مباشرة (ocr.side='customer').
   • إيصالات الموردين: bdl_op_receipts side=out + ما يُرفع هنا (ocr.side='supplier').
   • محرّك المطابقة: رقم عملية البنك أولًا، ثم المبلغ ضمن هامش % (افتراضي 0.5%)، مع تثبيت المطابقات في ocr.
   • نافذتا رفع: إيصالات الموردين / إيصالات الزبائن — قراءة تلقائية (Gemini/OCR)، قصّ، منع التكرار بالبصمة، إدخال يدوي.
   • كل وصل يعرض حالته: «تمت التسوية ✓» (مطابَق بمورد) / «مسوّى — بانتظار المورد» / «قيد الانتظار».
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
(function(){
const q=s=>document.querySelector(s);
const M={cust:[],sup:[],range:'2d',tol:0.5,open:{},busy:false,loaded:false,up:null,q:''};

/* ───── تنسيق ───── */
const css=document.createElement('style');css.textContent=`
#bk8list,#bk8fab,#r12{display:none!important}
.m13{margin:0 12px}
.m13top{display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px}
.m13top h2{margin:0;font-size:18px;font-weight:800;color:var(--navy)}
.m13rng{display:flex;gap:5px}
.m13rng button{border:1px solid var(--line);background:#fff;color:var(--muted);font-size:11px;font-weight:700;padding:6px 9px;border-radius:9px;font-family:inherit;cursor:pointer}
.m13rng button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.m13srch{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 13px;margin-top:10px}
.m13srch input{flex:1;border:0;outline:0;background:transparent;font-size:13px;font-family:inherit;color:var(--ink);min-width:0}
.m13st{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}
@media(min-width:620px){.m13st{grid-template-columns:repeat(4,1fr)}}
.m13st>div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 13px;display:flex;gap:10px;align-items:center}
.m13ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font:800 10.5px "Inter",sans-serif;flex:0 0 auto}
.m13ic.b{background:#E5F0FF;color:var(--blue)}.m13ic.g{background:#E3F7EE;color:#2E7D32}.m13ic.o{background:#FFF1E0;color:#ED6C02}.m13ic.n{background:var(--wash);color:var(--muted)}
.m13st .v{font:800 18px "Inter",sans-serif;direction:ltr;text-align:right;letter-spacing:-.3px;line-height:1.1}
.m13st .v small{font-size:10.5px;color:var(--muted);margin-left:3px}
.m13st .l{font-size:11px;color:var(--muted);font-weight:700;margin-top:2px}
.m13cols{display:grid;grid-template-columns:1fr;gap:10px;margin-top:10px}
@media(min-width:620px){.m13cols{grid-template-columns:1fr 1fr}}
.m13col{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px}
.m13ch{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.m13ch .t{flex:1;min-width:0}.m13ch .t b{font-size:13.5px;color:var(--navy);display:block}.m13ch .t span{font-size:11px;color:var(--muted)}
.m13ch .sum{font:800 13.5px "Inter",sans-serif;direction:ltr}
.m13up{display:flex;gap:6px;margin-bottom:9px}
.m13up button{flex:1;border:0;border-radius:9px;padding:10px;font-weight:800;font-size:12px;font-family:inherit;cursor:pointer;background:var(--navy);color:#fff}
.m13up button.ghost{background:#fff;color:var(--navy);border:1px solid #D6E4F7}
.m13r{border:1px solid var(--line);border-radius:11px;padding:10px 11px;margin-bottom:7px;cursor:pointer;background:#fff;transition:border-color .15s,box-shadow .15s}
.m13r:hover,.m13r.open{border-color:#B9CCEB;box-shadow:0 6px 16px -8px rgba(11,47,112,.2)}
.m13r.ok{border-inline-start:3px solid #2E7D32}.m13r.pend{border-inline-start:3px solid #ED6C02}.m13r.half{border-inline-start:3px solid var(--blue)}
.m13rt{display:flex;align-items:center;gap:10px}
.m13bk{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 10px "Inter",sans-serif;flex:0 0 auto;background:var(--navy)}
.m13bk.g{background:#2E7D32}
.m13mid{flex:1;min-width:0}
.m13mid .bn{font-size:12.5px;font-weight:800;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m13mid .dt{font-size:10.5px;color:var(--muted);font-family:"Inter",sans-serif;margin-top:1px;direction:ltr;text-align:right}
.m13amt{text-align:left;direction:ltr;white-space:nowrap}
.m13amt .a{font:800 15px "Inter",sans-serif;letter-spacing:-.3px}
.m13amt .a.ok{color:#2E7D32}.m13amt .a.pend{color:#ED6C02}.m13amt .a.half{color:var(--blue)}
.m13b{display:inline-block;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;margin-top:3px}
.m13b.ok{background:#E3F7EE;color:#2E7D32}.m13b.pend{background:#FFF1E0;color:#ED6C02}.m13b.half{background:#E5F0FF;color:var(--blue)}.m13b.src{background:var(--wash);color:var(--muted);margin-right:4px}
.m13x{display:none;border-top:1px dashed var(--line);margin-top:9px;padding-top:8px;font-size:11.5px;color:var(--muted)}
.m13r.open .m13x{display:block}
.m13x div{display:flex;justify-content:space-between;gap:8px;padding:3px 0}
.m13x b{font-family:"Inter",sans-serif;color:var(--ink);font-weight:700;direction:ltr;max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.m13x .act{display:flex;gap:6px;margin-top:8px}
.m13x .act button{flex:1;border:1px solid var(--line);background:#fff;color:var(--navy);font-weight:800;font-size:11px;padding:8px;border-radius:8px;font-family:inherit;cursor:pointer}
.m13x .act button.del{border-color:#F5B5B0;background:#FFF5F5;color:#B00020}
.m13more{display:block;width:100%;border:1px dashed var(--line);background:#fff;color:var(--blue);font-weight:800;font-size:11.5px;padding:8px;border-radius:9px;font-family:inherit;cursor:pointer;margin:2px 0 4px}
.m13cmp{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:10px}
.m13cmp h4{margin:0 0 10px;font-size:13.5px;color:var(--navy);font-weight:800;display:flex;justify-content:space-between;align-items:center}
.m13cmp h4 span{font-size:11px;color:var(--muted);font-weight:600}
.m13bar{margin-bottom:10px}.m13bar .l{display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-bottom:5px}.m13bar .l b{font-family:"Inter",sans-serif;color:var(--ink);direction:ltr}
.m13bar .tr{height:10px;background:var(--wash);border-radius:999px;overflow:hidden}.m13bar .f{height:100%;border-radius:999px;transition:width .5s}
.m13bar .f.b{background:linear-gradient(90deg,#1565C0,#42A5F5)}.m13bar .f.g{background:linear-gradient(90deg,#2E7D32,#66BB6A)}.m13bar .f.o{background:linear-gradient(90deg,#ED6C02,#FFA726)}
.m13status{border-radius:10px;padding:10px 12px;font-size:12px;font-weight:700;margin-top:6px}
.m13status.ok{background:#E3F7EE;color:#2E7D32}.m13status.warn{background:#FFF1E0;color:#9A4B00}
.m13tol{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--muted);margin-top:10px}
.m13tol input{width:64px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;font:700 12px "Inter",sans-serif;text-align:center;color:var(--navy)}
.m13tol button{border:1px solid var(--line);background:#fff;color:var(--navy);font-weight:800;font-size:11px;padding:7px 10px;border-radius:8px;font-family:inherit;cursor:pointer}
.m13tol button.pri{background:var(--navy);color:#fff;border-color:var(--navy)}
/* شيت الرفع */
.m13sheet .drop{border:2px dashed #B9CCEB;border-radius:14px;padding:22px 14px;text-align:center;color:var(--muted);font-size:12.5px;background:#F7FAFF;cursor:pointer}
.m13sheet .drop b{display:block;color:var(--navy);font-size:14px;margin-bottom:4px}
.m13q{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.m13qi{border:1px solid var(--line);border-radius:11px;padding:10px 11px;display:grid;grid-template-columns:56px 1fr;gap:10px;align-items:start}
.m13qi img{width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line)}
.m13qi .g{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.m13qi input{border:1px solid var(--line);border-radius:8px;padding:7px 9px;font:600 12px "Inter",sans-serif;color:var(--ink);min-width:0;width:100%}
.m13qi .st{grid-column:1/-1;font-size:11px;font-weight:700}
.m13qi .st.ok{color:#2E7D32}.m13qi .st.dup{color:#B00020}.m13qi .st.rd{color:var(--muted)}
.m13act{display:flex;gap:8px;margin-top:12px}
.m13act button{flex:1;border:0;border-radius:10px;padding:12px;font-weight:800;font-size:13px;font-family:inherit;cursor:pointer;background:var(--navy);color:#fff}
.m13act button.ghost{background:#fff;color:var(--navy);border:1px solid #D6E4F7}
.m13act button:disabled{opacity:.5}
.m13fld{display:flex;flex-direction:column;gap:4px}.m13fld label{font-size:11px;color:var(--muted);font-weight:700}
.m13fld input{border:1px solid var(--line);border-radius:9px;padding:9px 11px;font-size:13px;font-family:inherit;background:#fff;color:var(--ink)}
`;document.head.appendChild(css);

/* ───── الهيكل ───── */
function ensure(){
  const v=q('#v-books');if(!v)return false;
  const tb=document.querySelector('.tabs button[data-tab="books"]');if(tb&&tb.textContent!=='مركز المطابقة')tb.textContent='مركز المطابقة';
  const fb=v.querySelector('.fbar');if(fb)fb.style.display='none';
  if(!q('#m13')){v.insertAdjacentHTML('afterbegin','<div class="m13" id="m13"><div class="m13top"><h2>مركز المطابقة</h2><div class="m13rng" id="m13rng"></div></div>'+
    '<div class="m13srch"><span style="font-size:11px;color:var(--muted);font-weight:700">بحث</span><input id="m13q" placeholder="اسم، بنك، مبلغ، رقم عملية، مرجع…" inputmode="search"></div>'+
    '<div id="m13st"></div><div id="m13cols"></div><div id="m13cmp"></div></div>');
    q('#m13q').addEventListener('input',function(){M.q=this.value.trim().toLowerCase();render();});
    if(!q('#ovl-m13')){document.body.insertAdjacentHTML('beforeend','<div class="ovl" id="ovl-m13"><div class="sheet m13sheet" id="m13sb"></div></div>');
      q('#ovl-m13').addEventListener('click',e=>{if(e.target.id==='ovl-m13')closeOvl('m13');});}}
  return true;
}
const sheet=h=>{q('#m13sb').innerHTML=h;openOvl('m13');};
const hdr=(t,x)=>'<h3><span>'+t+'</span><span>'+(x||'')+'<button onclick="closeOvl(\'m13\')">إغلاق</button></span></h3>';
const short=v=>v>=1e6?(v/1e6).toFixed(1).replace(/\.0$/,'')+'M':v>=1e3?(v/1e3).toFixed(0)+'K':fmt(v,0);
const norm=c=>{c=String(c||'AOA').toUpperCase();return /KZ|AKZ|AOA/.test(c)?'AOA':/UM|MRU/.test(c)?'MRU':c;};
function bounds(){const d0=new Date();d0.setHours(0,0,0,0);let from=null;
  if(M.range==='today')from=d0;else if(M.range==='2d'){from=new Date(d0);from.setDate(d0.getDate()-1);}else if(M.range==='7d'){from=new Date(d0);from.setDate(d0.getDate()-6);}
  return from;}

/* ───── التحميل من المصادر الثلاثة ───── */
async function load(){
  if(M.busy||!ensure())return;M.busy=true;
  const from=bounds(),gte=from?'&created_at=gte.'+encodeURIComponent(from.toISOString()):'',gteU=from?'&updated_at=gte.'+encodeURIComponent(from.toISOString()):'';
  const cust=[],sup=[];
  try{
    /* ١) عمليات التسوية (مسوّاة/معلقة) وإيصالاتها */
    const rt=await fetch(SB+'/bdl_transactions?select=id,ref,status,settlement_id,meta,updated_at,amount,ccy,settle_amount,settle_ccy,bdl_customers(name)&status=in.(done,settled,settling)'+gteU+'&order=updated_at.desc&limit=400',{headers:H()});
    const txs=rt.ok?await rt.json():[];
    const stIds=[...new Set(txs.map(t=>t.settlement_id).filter(Boolean))],byRc={};
    txs.forEach(t=>{((t.meta&&t.meta.rcpt_ids)||[]).forEach(id=>{byRc[id]=byRc[id]||[];byRc[id].push(t);});});
    if(stIds.length){for(let i=0;i<stIds.length;i+=40){const part=stIds.slice(i,i+40);
      const r=await fetch(SB+'/bdl_settlement_receipts?select=receipt_id,settlement_id&settlement_id=in.('+part.join(',')+')',{headers:H()});
      (r.ok?await r.json():[]).forEach(x=>{const ts=txs.filter(t=>t.settlement_id===x.settlement_id);byRc[x.receipt_id]=byRc[x.receipt_id]||[];ts.forEach(t=>{if(!byRc[x.receipt_id].includes(t))byRc[x.receipt_id].push(t);});});}}
    const rcIds=Object.keys(byRc);
    const rcMap={};
    for(let i=0;i<rcIds.length;i+=60){const part=rcIds.slice(i,i+60);
      const r=await fetch(SB+'/bdl_receipts?select=id,amount,ccy,bank,account_no,txn_ref,ocr,fingerprint,file_url,created_at&id=in.('+part.join(',')+')',{headers:H()});
      (r.ok?await r.json():[]).forEach(x=>rcMap[x.id]=x);}
    rcIds.forEach(id=>{const x=rcMap[id];if(!x)return;const ts=byRc[id],done=ts.some(t=>t.status==='done'||t.status==='settled');
      cust.push({id:'r:'+x.id,rid:x.id,src:'settle',amount:Number(x.amount)||0,ccy:norm(x.ccy),bank:x.bank||'',ref:x.txn_ref||'',date:new Date(x.created_at),file:x.file_url,
        who:(ts[0]&&ts[0].bdl_customers&&ts[0].bdl_customers.name)||'',txRefs:ts.map(t=>t.ref),settled:done,pendingTx:!done,ocr:x.ocr||{},stored:(x.ocr&&x.ocr.matched_rcpt)||null});});
    /* ٢) الإيصالات المرفوعة هنا مباشرة */
    const rd=await fetch(SB+'/bdl_receipts?select=id,amount,ccy,bank,account_no,txn_ref,ocr,fingerprint,file_url,created_at&ocr->>source=eq.match-center'+gte+'&order=created_at.desc&limit=400',{headers:H()});
    (rd.ok?await rd.json():[]).forEach(x=>{if(rcMap[x.id])return;const o=x.ocr||{},row={id:'r:'+x.id,rid:x.id,src:'upload',amount:Number(x.amount)||0,ccy:norm(x.ccy),bank:x.bank||'',ref:x.txn_ref||'',date:new Date(x.created_at),file:x.file_url,
        who:o.name||o.receiver||'',txRefs:[],settled:false,pendingTx:false,ocr:o,stored:o.matched_rcpt||o.covers||null};
      (o.side==='supplier'?sup:cust).push(row);});
    /* ٣) إيصالات العمليات (bdl_ops) */
    const ro=await fetch(SB+'/bdl_op_receipts?select=*&order=created_at.desc'+gte+'&limit=400',{headers:H()});
    const ops={};if(ro.ok){const rows=await ro.json();const opIds=[...new Set(rows.map(x=>x.op_id))];
      if(opIds.length){const r2=await fetch(SB+'/bdl_ops?select=id,ref,client_name,supplier,status&id=in.('+opIds.join(',')+')',{headers:H()});(r2.ok?await r2.json():[]).forEach(o=>ops[o.id]=o);}
      rows.forEach(x=>{const o=ops[x.op_id]||{};const row={id:'o:'+x.id,oid:x.id,src:'ops',amount:Number(x.amount_aoa)||0,ccy:'AOA',bank:x.bank||'',ref:x.txn_id||'',date:new Date(x.created_at),file:null,
          who:x.side==='in'?(o.client_name||x.sender||''):(o.supplier||x.sender||''),txRefs:o.ref?[o.ref]:[],settled:o.status==='closed'||o.status==='confirmed',pendingTx:false,ocr:{},stored:x.match_txn||null,matchTxn:x.match_txn||null};
        (x.side==='out'?sup:cust).push(row);});}
  }catch(e){console.warn('m13',e);}
  M.cust=cust.sort((a,b)=>b.date-a.date);M.sup=sup.sort((a,b)=>b.date-a.date);M.loaded=true;M.busy=false;
  matchAll();render();
}
/* ───── محرّك المطابقة ───── */
function matchAll(){
  M.sup.forEach(s=>{s.matched=null;});M.cust.forEach(c=>{c.matched=null;c.how='';});
  const key=r=>String(r.ref||'').replace(/\s+/g,'').toLowerCase();
  /* أ) المثبّت مسبقًا */
  M.cust.forEach(c=>{if(!c.stored)return;const s=M.sup.find(x=>!x.matched&&(x.rid===c.stored||x.oid===c.stored||(c.matchTxn&&key(x)===String(c.matchTxn).toLowerCase())));if(s){c.matched=s;s.matched=c;c.how='stored';}});
  M.sup.forEach(s=>{if(s.matched||!s.stored)return;const c=M.cust.find(x=>!x.matched&&(x.rid===s.stored||key(x)===String(s.stored).replace(/\s+/g,'').toLowerCase()));if(c){c.matched=s;s.matched=c;c.how='stored';}});
  /* ب) رقم عملية البنك */
  M.cust.forEach(c=>{if(c.matched||!key(c))return;const s=M.sup.find(x=>!x.matched&&key(x)&&key(x)===key(c));if(s){c.matched=s;s.matched=c;c.how='ref';}});
  /* ج) المبلغ ضمن الهامش — الأكبر أولًا */
  const tol=Math.max(0,Number(M.tol)||0)/100;
  M.cust.slice().sort((a,b)=>b.amount-a.amount).forEach(c=>{if(c.matched||!c.amount)return;
    let best=null,bd=Infinity;M.sup.forEach(s=>{if(s.matched||s.ccy!==c.ccy||!s.amount)return;const d=Math.abs(s.amount-c.amount)/c.amount;if(d<=tol&&d<bd){bd=d;best=s;}});
    if(best){c.matched=best;best.matched=c;c.how=bd===0?'amount':'approx';}});
}
const state=r=>r.matched?'ok':(r.settled?'half':'pend');
const label=r=>r.matched?'تمت التسوية ✓':(r.settled?'مسوّى — بانتظار المورد':'قيد الانتظار');
function passes(r){if(!M.q)return true;return [r.who,r.bank,r.ref,String(r.amount),r.txRefs.join(' '),r.matched&&r.matched.who].join(' ').toLowerCase().indexOf(M.q)>=0;}

/* ───── العرض ───── */
function card(r,side){
  const open=!!M.open[r.id],st=state(r),ini=String(r.bank||'BD').replace(/[^A-Za-z\u0600-\u06FF]/g,'').slice(0,2).toUpperCase()||'BD';
  const src={settle:'تسوية',upload:'مرفوع هنا',ops:'عمليات'}[r.src];
  return '<div class="m13r '+st+(open?' open':'')+'" onclick="m13.toggle(\''+r.id+'\')"><div class="m13rt"><span class="m13bk'+(side==='sup'?' g':'')+'">'+esc(ini)+'</span>'+
    '<div class="m13mid"><div class="bn">'+esc(r.who||'—')+'</div><div class="dt">'+esc(r.bank||'')+(r.bank?' · ':'')+r.date.toLocaleDateString('en-GB')+' '+r.date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</div></div>'+
    '<div class="m13amt"><div class="a '+st+'">'+fmt(r.amount,0)+' <small style="font-size:10px">'+esc(r.ccy)+'</small></div><span class="m13b '+st+'">'+label(r)+'</span></div></div>'+
    '<div class="m13x"><div><span>'+(side==='sup'?'المورد':'الزبون')+'</span><b>'+esc(r.who||'—')+'</b></div><div><span>رقم عملية البنك</span><b>'+esc(r.ref||'—')+'</b></div>'+
    (r.txRefs.length?'<div><span>'+(r.src==='ops'?'مرجع العملية':'العمليات المسوّاة (ربح مسجّل)')+'</span><b>'+esc(r.txRefs.join(', '))+'</b></div>':'')+
    (r.matched?'<div><span>'+(side==='sup'?'يغطي إيصال الزبون':'إيصال المورد المقابل')+'</span><b>'+esc(r.matched.who||'')+' · '+fmt(r.matched.amount,0)+' '+esc(r.matched.ccy)+(r.matched.ref?' · '+esc(r.matched.ref):'')+'</b></div>'+
      '<div><span>طريقة المطابقة</span><b>'+({stored:'مثبّتة',ref:'رقم العملية',amount:'المبلغ مطابق',approx:'المبلغ ضمن الهامش'}[side==='sup'?(r.matched.how||'ref'):r.how]||'—')+'</b></div>':'<div><span>المطابقة</span><b style="color:#ED6C02">لا إيصال مقابل بعد</b></div>')+
    '<div><span>المصدر</span><b>'+src+'</b></div>'+
    '<div class="act">'+(r.file?'<button onclick="event.stopPropagation();window.open(\''+esc(r.file)+'\',\'_blank\')">عرض الملف</button>':'')+
    ((r.rid||r.oid)?'<button class="del" onclick="event.stopPropagation();m13.del(\''+r.id+'\')">حذف</button>':'')+'</div></div></div>';
}
function col(side){
  const rows=(side==='sup'?M.sup:M.cust).filter(passes),sum=rows.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0),ok=rows.filter(r=>r.matched).length;
  const show=M.open['all:'+side]?rows:rows.slice(0,6);
  return '<div class="m13col"><div class="m13ch"><span class="m13ic '+(side==='sup'?'g':'b')+'">'+(side==='sup'?'OUT':'IN')+'</span><div class="t"><b>'+(side==='sup'?'إيصالات الموردين':'إيصالات الزبائن')+'</b><span><span class="num">'+rows.length+'</span> إيصال · <span class="num">'+ok+'</span> مطابَق</span></div><span class="sum">'+fmt(sum,0)+' AOA</span></div>'+
    '<div class="m13up"><button onclick="m13.upload(\''+side+'\')">رفع إيصالات '+(side==='sup'?'الموردين':'الزبائن')+'</button><button class="ghost" onclick="m13.manual(\''+side+'\')">إدخال يدوي</button></div>'+
    (show.length?show.map(r=>card(r,side)).join(''):'<div class="empty" style="padding:16px">لا إيصالات في هذه الفترة</div>')+
    (rows.length>6?'<button class="m13more" onclick="m13.toggle(\'all:'+side+'\')">'+(M.open['all:'+side]?'عرض أقل':'عرض الكل ('+rows.length+')')+'</button>':'')+'</div>';
}
function render(){
  if(!ensure()||!M.loaded)return;
  q('#m13rng').innerHTML=[['today','اليوم'],['2d','أمس واليوم'],['7d','٧ أيام'],['all','الكل']].map(x=>'<button class="'+(M.range===x[0]?'on':'')+'" onclick="m13.range(\''+x[0]+'\')">'+x[1]+'</button>').join('');
  const C=M.cust.filter(passes),S=M.sup.filter(passes);
  const sIn=C.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0),sOut=S.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0);
  const okC=C.filter(r=>r.matched),sOk=okC.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0),pend=C.filter(r=>!r.matched),sPend=sIn-sOk,pct=sIn?sOk/sIn*100:0;
  const unmatchedSup=S.filter(r=>!r.matched),sUS=unmatchedSup.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0);
  q('#m13st').innerHTML='<div class="m13st">'+
    '<div><span class="m13ic b">IN</span><div><div class="v" style="color:var(--blue)">'+short(sIn)+'<small>AOA</small></div><div class="l">إيصالات الزبائن · '+C.length+'</div></div></div>'+
    '<div><span class="m13ic g">OUT</span><div><div class="v" style="color:#2E7D32">'+short(sOut)+'<small>AOA</small></div><div class="l">إيصالات الموردين · '+S.length+'</div></div></div>'+
    '<div><span class="m13ic o">…</span><div><div class="v" style="color:#ED6C02">'+short(sPend)+'<small>AOA</small></div><div class="l">بانتظار المورد · '+pend.length+'</div></div></div>'+
    '<div><span class="m13ic n">%</span><div><div class="v">'+pct.toFixed(1)+'%</div><div class="l">نسبة المطابقة · '+okC.length+'/'+C.length+'</div></div></div></div>';
  q('#m13cols').innerHTML='<div class="m13cols">'+col('cust')+col('sup')+'</div>';
  const bar=(l,v,p,c)=>'<div class="m13bar"><div class="l"><span>'+l+'</span><b>'+fmt(v,0)+' AOA · '+p.toFixed(1)+'%</b></div><div class="tr"><div class="f '+c+'" style="width:'+Math.max(0,Math.min(100,p))+'%"></div></div></div>';
  q('#m13cmp').innerHTML='<div class="m13cmp"><h4><span>مقارنة التسوية — الزبائن مقابل الموردين</span><span>هامش '+M.tol+'%</span></h4>'+
    bar('إجمالي إيصالات الزبائن',sIn,100,'b')+bar('مطابَق بإيصالات الموردين',sOk,pct,'g')+bar('بانتظار المورد',sPend,100-pct,'o')+
    (pend.length?'<div class="m13status warn">لم تُطابَق جميع الإيصالات — <span class="num">'+pend.length+'</span> إيصال زبون بقيمة <span class="num">'+fmt(sPend,0)+'</span> AOA بلا إيصال مورد مقابل'+(unmatchedSup.length?' · و<span class="num">'+unmatchedSup.length+'</span> إيصال مورد ('+fmt(sUS,0)+' AOA) بلا زبون':'')+'</div>'
      :C.length?'<div class="m13status ok">✓ كل إيصالات الزبائن مطابَقة بإيصالات الموردين'+(unmatchedSup.length?' · يوجد '+unmatchedSup.length+' إيصال مورد فائض ('+fmt(sUS,0)+' AOA)':'')+'</div>':'')+
    '<div class="m13tol"><span>هامش التطابق %</span><input id="m13tol" inputmode="decimal" value="'+M.tol+'"><button onclick="m13.retol()">إعادة المطابقة</button><button class="pri" onclick="m13.commit()">تثبيت المطابقات</button></div></div>';
}

/* ───── تثبيت المطابقات في القاعدة ───── */
async function commit(){
  const pairs=M.cust.filter(c=>c.matched&&c.how!=='stored');if(!pairs.length){toast('لا مطابقات جديدة للتثبيت');return;}
  let n=0;
  for(const c of pairs){const s=c.matched;try{
    if(c.rid){const o=Object.assign({},c.ocr,{matched_rcpt:s.rid||s.oid,matched_at:new Date().toISOString(),matched_how:c.how});
      const r=await fetch(SB+'/bdl_receipts?id=eq.'+c.rid,{method:'PATCH',headers:H(),body:JSON.stringify({ocr:o})});if(r.ok){c.ocr=o;c.stored=s.rid||s.oid;n++;}}
    else if(c.oid&&s.ref){const r=await fetch(SB+'/bdl_op_receipts?id=eq.'+c.oid,{method:'PATCH',headers:H(),body:JSON.stringify({match_txn:s.ref})});if(r.ok){c.stored=s.ref;c.matchTxn=s.ref;n++;}}
    if(s.rid){const o2=Object.assign({},s.ocr,{covers:c.rid||c.ref||c.oid,matched_at:new Date().toISOString()});
      const r2=await fetch(SB+'/bdl_receipts?id=eq.'+s.rid,{method:'PATCH',headers:H(),body:JSON.stringify({ocr:o2})});if(r2.ok){s.ocr=o2;s.stored=c.rid||c.ref;}}
    else if(s.oid&&c.ref&&!s.matchTxn){await fetch(SB+'/bdl_op_receipts?id=eq.'+s.oid,{method:'PATCH',headers:H(),body:JSON.stringify({match_txn:c.ref})});}
    c.how='stored';}catch(e){}}
  toast('ثُبّتت '+n+' مطابقة ✓');render();
}

/* ───── الرفع ───── */
async function fp(file){try{const h=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');}catch(e){return null;}}
function uploadSheet(side){
  M.up={side,items:[]};
  sheet(hdr('رفع إيصالات '+(side==='sup'?'الموردين':'الزبائن'))+
    '<div class="drop" onclick="document.getElementById(\'m13f\').click()"><b>اختر صور الإيصالات أو PDF</b>قراءة تلقائية للمبلغ والبنك ورقم العملية · يمكن اختيار عدة ملفات<input id="m13f" type="file" accept="image/*,application/pdf" multiple style="display:none" onchange="m13.files(this.files)"></div>'+
    '<div class="m13q" id="m13qq"></div>'+
    '<div class="m13act"><button id="m13save" disabled onclick="m13.save()">حفظ ومطابقة</button><button class="ghost" onclick="closeOvl(\'m13\')">إلغاء</button></div>');
}
async function files(list){
  const arr=Array.from(list||[]);if(!arr.length)return;const box=q('#m13qq');
  for(const f0 of arr){const it={file:f0,status:'rd',amount:'',ccy:'AOA',bank:'',ref:'',name:'',url:''};M.up.items.push(it);
    try{it.file=window.autoCropReceipt?await autoCropReceipt(f0):f0;}catch(e){}
    if(/^image\//.test(it.file.type))it.url=URL.createObjectURL(it.file);
    drawQueue();
    try{it.fp=await fp(it.file);
      if(it.fp){const r=await fetch(SB+'/bdl_receipts?select=id&fingerprint=eq.'+it.fp+'&limit=1',{headers:H()});const j=r.ok?await r.json():[];if(j.length){it.status='dup';drawQueue();continue;}}
      let p={};if(window.readReceipt)p=await readReceipt(it.file);
      it.amount=p.amount||'';it.ccy=norm(p.ccy||'AOA');it.bank=p.bank||'';it.ref=p.ref||'';it.name=(p.name||p.receiver||'');
      if(!it.ref&&it.amount){const r=await fetch(SB+'/bdl_receipts?select=id&amount=eq.'+it.amount+'&ocr->>side=eq.'+(M.up.side==='sup'?'supplier':'customer')+'&limit=1',{headers:H()});const j=r.ok?await r.json():[];if(j.length)it.warn='نفس المبلغ موجود — تأكد أنه تحويل مختلف';}
      it.status='ok';}catch(e){it.status='ok';}
    drawQueue();}
}
function drawQueue(){
  const box=q('#m13qq');if(!box||!M.up)return;
  box.innerHTML=M.up.items.map((it,i)=>'<div class="m13qi">'+(it.url?'<img src="'+it.url+'">':'<div style="width:56px;height:56px;border-radius:8px;background:var(--wash);display:grid;place-items:center;font:800 10px Inter;color:var(--muted)">PDF</div>')+
    '<div class="g"><input placeholder="المبلغ" inputmode="decimal" value="'+esc(it.amount)+'" oninput="m13.edit('+i+',\'amount\',this.value)"><input placeholder="العملة" value="'+esc(it.ccy)+'" oninput="m13.edit('+i+',\'ccy\',this.value)">'+
    '<input placeholder="البنك" value="'+esc(it.bank)+'" oninput="m13.edit('+i+',\'bank\',this.value)"><input placeholder="رقم العملية" value="'+esc(it.ref)+'" oninput="m13.edit('+i+',\'ref\',this.value)">'+
    '<input placeholder="'+(M.up.side==='sup'?'اسم المورد':'اسم الزبون')+'" value="'+esc(it.name)+'" oninput="m13.edit('+i+',\'name\',this.value)" style="grid-column:1/-1">'+
    '<div class="st '+it.status+'">'+(it.status==='rd'?'جارٍ القراءة…':it.status==='dup'?'مكرر — هذا الإيصال محفوظ مسبقًا، لن يُحفظ':'جاهز'+(it.warn?' · <span style="color:#9A4B00">'+it.warn+'</span>':''))+'</div></div></div>').join('');
  const b=q('#m13save');if(b)b.disabled=!M.up.items.some(it=>it.status==='ok');
}
async function save(){
  const side=M.up.side,items=M.up.items.filter(it=>it.status==='ok');if(!items.length)return;q('#m13save').disabled=true;let n=0;
  for(const it of items){try{
    let url=null;
    if(it.file&&it.fp){try{const path=(side==='sup'?'supplier':'customer')+'/'+new Date().toISOString().slice(0,10)+'/'+it.fp.slice(0,16)+(/pdf/i.test(it.file.type)?'.pdf':'.jpg');
      const up=await fetch(SB.replace('/rest/v1','/storage/v1')+'/object/receipts/'+path,{method:'POST',headers:{apikey:ANON,Authorization:'Bearer '+(TOK||ANON),'Content-Type':it.file.type||'image/jpeg','x-upsert':'true'},body:it.file});
      if(up.ok)url=SB.replace('/rest/v1','/storage/v1')+'/object/public/receipts/'+path;}catch(e){}}
    const body={fingerprint:it.fp||null,amount:Number(String(it.amount).replace(/[^\d.]/g,''))||null,ccy:norm(it.ccy),bank:it.bank||null,txn_ref:it.ref||null,file_url:url,
      ocr:{side:side==='sup'?'supplier':'customer',source:'match-center',name:it.name||null,uploaded_at:new Date().toISOString(),manual:!it.file}};
    const r=await fetch(SB+'/bdl_receipts',{method:'POST',headers:H({Prefer:'return=representation'}),body:JSON.stringify(body)});if(r.ok)n++;}catch(e){}}
  toast('حُفظ '+n+' إيصال ✓ — جارٍ المطابقة');closeOvl('m13');M.up=null;await load();
  const newOk=(side==='sup'?M.sup:M.cust).filter(r=>r.src==='upload'&&r.matched).length;if(newOk)toast(newOk+' إيصال تمت تسويته ✓');
}
function manualSheet(side){
  M.up={side,items:[]};
  sheet(hdr('إدخال يدوي — '+(side==='sup'?'إيصال مورد':'إيصال زبون'))+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="m13fld"><label>المبلغ</label><input id="mm_a" inputmode="decimal" class="num"></div><div class="m13fld"><label>العملة</label><input id="mm_c" value="AOA"></div>'+
    '<div class="m13fld"><label>البنك</label><input id="mm_b" placeholder="BAI / BFA / Bankily…"></div><div class="m13fld"><label>رقم عملية البنك</label><input id="mm_r" class="num"></div></div>'+
    '<div class="m13fld" style="margin-top:8px"><label>'+(side==='sup'?'اسم المورد':'اسم الزبون')+'</label><input id="mm_n"></div>'+
    '<div class="m13act"><button onclick="m13.manualSave()">حفظ ومطابقة</button><button class="ghost" onclick="closeOvl(\'m13\')">إلغاء</button></div>');
}
async function manualSave(){
  const g=id=>q('#'+id).value.trim();const a=Number(g('mm_a').replace(/[^\d.]/g,''));if(!a){toast('أدخل المبلغ');return;}
  M.up.items=[{status:'ok',amount:a,ccy:g('mm_c')||'AOA',bank:g('mm_b'),ref:g('mm_r'),name:g('mm_n'),file:null,fp:null}];
  const b=document.createElement('button');b.id='m13save';q('#m13sb').appendChild(b);await save();
}
async function del(id){const r=(M.cust.concat(M.sup)).find(x=>x.id===id);if(!r||(!r.rid&&!r.oid))return;
  if(!confirm('حذف هذا الإيصال نهائيًا؟\nسيتحرّر رقم عمليته وبصمته ويمكن رفعه من جديد.'))return;
  let ok=false;
  try{
    if(r.rid)ok=(await fetch(SB+'/bdl_receipts?id=eq.'+r.rid,{method:'DELETE',headers:H()})).ok;
    else if(r.oid)ok=(await fetch(SB+'/bdl_op_receipts?id=eq.'+r.oid,{method:'DELETE',headers:H()})).ok;
  }catch(e){}
  if(ok){toast('حُذف ✓ — يمكن رفعه من جديد الآن');load();}else toast('تعذّر الحذف');}

window.m13={toggle:id=>{M.open[id]=!M.open[id];render();},range:r=>{M.range=r;M.open={};load();},retol:async()=>{const b=q('#m13rng');M.tol=Number(q('#m13tol').value)||0;M.open={};toast('جارٍ إعادة المطابقة…');M.loaded=false;await load();toast('أعيدت المطابقة على هامش '+M.tol+'% ✓');},
  commit,upload:uploadSheet,manual:manualSheet,files,edit:(i,k,v)=>{if(M.up&&M.up.items[i])M.up.items[i][k]=v;},save,manualSave,del,reload:()=>load()};
/* التبويب + التحديث */
const G=window.go;window.go=function(t){G.apply(this,arguments);if(t==='books'){ensure();if(!M.loaded)load();}};
const F=window.fetch;window.fetch=function(u,o){const p=F.apply(this,arguments);
  try{const url=String(u&&u.url||u),m=((o&&o.method)||'GET').toUpperCase();
    if(m!=='GET'&&/bdl_op_receipts|bdl_receipts|bdl_settle|bdl_unsettle|bdl_transactions/.test(url)&&!M.busy&&!M.up)p.then(()=>setTimeout(()=>{if(q('#v-books')&&q('#v-books').style.display!=='none')load();else M.loaded=false;},900),()=>{});}catch(e){}
  return p;};
setTimeout(()=>{ensure();if(q('#v-books')&&q('#v-books').style.display!=='none')load();},300);
console.log('bdl-ops13: مركز المطابقة جاهز ✓');
})();
