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

.m13ps{font-size:12px;color:#5C7699;padding:8px 2px 2px;font-weight:600}
.m13cf{font-size:10px;font-weight:800;padding:1.5px 6px;margin-inline-end:4px}
.m13cf.hi{background:#E7F6EF;color:#0E8F5B}
.m13cf.md{background:#FFF3E0;color:#9A4B00}
.m13cf.lo{background:#FBEAEC;color:#B00020}
.m13qi input.lowc{border-color:#C9303E!important;background:#FFF7F7}
.m13qi .ph{width:56px;height:56px;background:var(--wash,#EEF4FC);display:grid;place-items:center;font:800 10px 'IBM Plex Sans Arabic',Inter,sans-serif;color:var(--navy,#0B2F70);cursor:pointer;border:1px solid #D7E2F2}
.m13qi img{cursor:zoom-in}
.m13r.v2 .supn{color:var(--blue,#0A56B8);cursor:pointer}
.m13r.v2 .supn.emp{color:#ED6C02;border-bottom:1px dashed #ED6C02;font-weight:700}
.m13tb2{width:100%;border-collapse:collapse;font-size:12.5px}
.m13tb2 th{background:#EEF4FC;color:var(--navy,#0B2F70);padding:8px 9px;text-align:right;font-size:11.5px}
.m13tb2 td{padding:8px 9px;border-bottom:1px solid #EDF2FA}
.m13tb2 td.num{font-variant-numeric:tabular-nums;font-weight:700}
.m13r.v2{background:#fff;border:1px solid #E3ECF7;border-inline-start:4px solid #E65100;padding:13px 14px;margin-bottom:10px;cursor:pointer}
.m13r.v2.ok{border-inline-start-color:#2E7D32}
.m13r.v2 .v2t{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
.m13r.v2 .v2a{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;color:#E65100}
.m13r.v2 .v2a.ok{color:#2E7D32}
.m13r.v2 .v2a small{font-size:11px;font-weight:700;color:#8AA3C4}
.m13r.v2 .v2rows div{display:flex;justify-content:space-between;gap:12px;padding:4.5px 0;border-bottom:1px dashed #EDF2FA;font-size:12.5px}
.m13r.v2 .v2rows div:last-child{border-bottom:0}
.m13r.v2 .v2rows span{color:#5C7699;font-weight:600;flex:0 0 auto}
.m13r.v2 .v2rows b{color:var(--ink,#0E1B33);font-weight:700;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.m13r.v2 .v2go{display:block;width:100%;margin-top:11px;padding:11px;border:0;background:var(--navy,#0B2F70);color:#fff;font:800 13px 'IBM Plex Sans Arabic',sans-serif;cursor:pointer}
.m13r.v2 .v2go:active{filter:brightness(1.15)}
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
  const cust=[],sup=[],arch=[];
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
      /* تسويات عمليات المورد (بطاقة المورد الخضراء): إيصالاتها تُحتسب في جانب الموردين */
      const supSide=ts.length>0&&ts.every(t=>((t.meta&&t.meta.side)||'customer')==='supplier');
      const row={id:'r:'+x.id,rid:x.id,src:'settle',amount:Number(x.amount)||0,ccy:norm(x.ccy),bank:x.bank||'',ref:x.txn_ref||'',date:new Date(x.created_at),file:x.file_url,
        who:(ts[0]&&ts[0].bdl_customers&&ts[0].bdl_customers.name)||'',txRefs:ts.map(t=>t.ref),settled:done,pendingTx:!done,ocr:x.ocr||{},fwdSup:(x.ocr&&x.ocr.fwd_sup)||'',stored:(x.ocr&&x.ocr.matched_rcpt)||null};
      (supSide?sup:cust).push(row);});
    /* ٢) الإيصالات المرفوعة هنا مباشرة */
    const rd=await fetch(SB+'/bdl_receipts?select=id,amount,ccy,bank,account_no,txn_ref,ocr,fingerprint,file_url,created_at&ocr->>source=eq.match-center'+gte+'&order=created_at.desc&limit=400',{headers:H()});
    (rd.ok?await rd.json():[]).forEach(x=>{if(rcMap[x.id])return;const o=x.ocr||{},row={id:'r:'+x.id,rid:x.id,src:'upload',amount:Number(x.amount)||0,ccy:norm(x.ccy),bank:x.bank||'',ref:x.txn_ref||'',date:new Date(x.created_at),file:x.file_url,
        who:o.sup_name||o.name||o.receiver||'',fwdSup:o.fwd_sup||'',txRefs:[],settled:false,pendingTx:false,ocr:o,stored:o.matched_rcpt||o.covers||null};
      if(o.pending)return; /* وارد واتساب لم يُقرأ بعد */
      if(o.side==='supplier'&&o.archived)arch.push(row);else (o.side==='supplier'?sup:cust).push(row);});
    /* ٣) إيصالات العمليات (bdl_ops) */
    const ro=await fetch(SB+'/bdl_op_receipts?select=*&order=created_at.desc'+gte+'&limit=400',{headers:H()});
    const ops={};if(ro.ok){const rows=await ro.json();const opIds=[...new Set(rows.map(x=>x.op_id))];
      if(opIds.length){const r2=await fetch(SB+'/bdl_ops?select=id,ref,client_name,supplier,status&id=in.('+opIds.join(',')+')',{headers:H()});(r2.ok?await r2.json():[]).forEach(o=>ops[o.id]=o);}
      rows.forEach(x=>{const o=ops[x.op_id]||{};const row={id:'o:'+x.id,oid:x.id,src:'ops',amount:Number(x.amount_aoa)||0,ccy:'AOA',bank:x.bank||'',ref:x.txn_id||'',date:new Date(x.created_at),file:null,
          who:x.side==='in'?(o.client_name||x.sender||''):(o.supplier||x.sender||''),txRefs:o.ref?[o.ref]:[],settled:o.status==='closed'||o.status==='confirmed',pendingTx:false,ocr:{},stored:x.match_txn||null,matchTxn:x.match_txn||null};
        (x.side==='out'?sup:cust).push(row);});}
  }catch(e){console.warn('m13',e);}
  M.cust=cust.sort((a,b)=>b.date-a.date);M.sup=sup.sort((a,b)=>b.date-a.date);M.arch=arch.sort((a,b)=>b.date-a.date);M.loaded=true;M.busy=false;
  /* قراءة الوارد من واتساب ثم إعادة التحميل */
  try{
    const pq=await fetch(SB+'/bdl_receipts?select=id,file_url,ocr&ocr-%3E%3Epending=eq.true&order=created_at.desc&limit=15',{headers:H()});
    const pj=pq.ok?await pq.json():[];
    if(pj.length&&window.readReceipt){
      toast('قراءة '+pj.length+' إيصال وارد من واتساب…');
      await POOL(pj,3,async(row)=>{try{
        if(!row.file_url)throw 0;
        const fr=await fetch(row.file_url);const bl=await fr.blob();
        const f=new File([bl],(/pdf/.test(bl.type||'')?'wa.pdf':'wa.jpg'),{type:bl.type||'image/jpeg'});
        const p=await Promise.race([readReceipt(f),new Promise((_,rj)=>setTimeout(()=>rj(new Error('to')),45000))]);
        const oc=Object.assign({},row.ocr,{pending:false,conf:p.conf||0});
        if(p.name&&!oc.name)oc.name=p.name;
        let body={amount:p.amount||null,ccy:norm(p.ccy||'AOA'),bank:p.bank||null,txn_ref:(p.ref||p.txn||null),ocr:oc};
        let x=await fetch(SB+'/bdl_receipts?id=eq.'+row.id,{method:'PATCH',headers:H(),body:JSON.stringify(body)});
        if(x.status===409){oc.dup_ref=true;body.txn_ref=null;body.ocr=oc;
          await fetch(SB+'/bdl_receipts?id=eq.'+row.id,{method:'PATCH',headers:H(),body:JSON.stringify(body)});}
      }catch(e){
        try{const oc2=Object.assign({},row.ocr,{pending:false,read_fail:true});
          await fetch(SB+'/bdl_receipts?id=eq.'+row.id,{method:'PATCH',headers:H(),body:JSON.stringify({ocr:oc2})});}catch(e2){}
      }});
      toast('قُرئ الوارد ✓');return load();
    }
  }catch(e){}
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
    let best=null,bd=Infinity;M.sup.forEach(s=>{if(s.matched||s.ccy!==c.ccy||!s.amount)return;
      const d=Math.abs(s.amount-c.amount)/c.amount;
      const dt=Math.abs((s.date&&s.date.getTime()||0)-(c.date&&c.date.getTime()||0));
      if(d<=tol&&dt<=48*36e5&&d<bd){bd=d;best=s;}});
    if(best){c.matched=best;best.matched=c;c.how=bd===0?'amount':'approx';}});
}
const state=r=>r.matched?'ok':(r.settled?'half':'pend');
const label=r=>r.matched?'تمت التسوية ✓':(r.settled?'مسوّى — بانتظار المورد':'قيد الانتظار');
function passes(r){if(!M.q)return true;return [r.who,r.bank,r.ref,String(r.amount),r.txRefs.join(' '),r.matched&&r.matched.who].join(' ').toLowerCase().indexOf(M.q)>=0;}

/* ───── العرض ───── */
function card(r,side){
  const open=!!M.open[r.id],st=state(r);
  const src={settle:'تسوية',upload:'مرفوع هنا',ops:'عمليات'}[r.src];
  return '<div class="m13r v2 '+st+(open?' open':'')+'" onclick="m13.toggle(\''+r.id+'\')">'+
    '<div class="v2t"><span class="m13b '+st+'">'+label(r)+'</span>'+
    '<div class="v2a '+st+'">'+fmt(r.amount,0)+' <small>'+esc(r.ccy)+'</small></div></div>'+
    '<div class="v2rows">'+
    (side==='sup'?'<div><span>المورد</span><b class="supn'+(r.who?'':' emp')+'" onclick="event.stopPropagation();m13.nameSup(\''+r.id+'\')">'+(r.who?esc(r.who):'اضغط لكتابة اسم المورد')+'</b></div>':'<div><span>العميل</span><b>'+esc(r.who||'—')+'</b></div>'+(r.rid?'<div><span>المورد المكلَّف</span><b class="supn'+(r.fwdSup?'':' emp')+'" onclick="event.stopPropagation();m13.fwdSet(\''+r.id+'\')">'+(r.fwdSup?esc(r.fwdSup):'حدّد المورد')+'</b></div>':''))+
    '<div><span>المرجع</span><b class="num">'+esc(r.ref||'—')+'</b></div>'+
    '<div><span>القناة</span><b>'+esc(r.bank||'—')+'</b></div>'+
    '<div><span>التاريخ</span><b class="num">'+r.date.toLocaleDateString('en-GB')+' '+r.date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</b></div>'+
    '</div>'+
    (side!=='sup'&&st!=='ok'?'<div style="margin-top:9px;padding:7px 10px;background:#FBEAEC;color:#B00020;font-size:12px;font-weight:800">المطابقة ينقصها '+fmt(r.amount,0)+' '+esc(r.ccy)+' — لا إيصال مورد لهذا المبلغ بعد</div>':'')+
    (side!=='sup'&&st!=='ok'?'<button class="v2go" onclick="event.stopPropagation();m13.upload(\'sup\')">مطابقة مع إيصال المورد — رفع الإيصال</button>':'')+
    '<div class="m13x"><div><span>'+(side==='sup'?'المورد':'الزبون')+'</span><b>'+esc(r.who||'—')+'</b></div><div><span>رقم عملية البنك</span><b>'+esc(r.ref||'—')+'</b></div>'+
    (r.txRefs.length?'<div><span>'+(r.src==='ops'?'مرجع العملية':'العمليات المسوّاة (ربح مسجّل)')+'</span><b>'+esc(r.txRefs.join(', '))+'</b></div>':'')+
    (r.matched?'<div><span>'+(side==='sup'?'يغطي إيصال الزبون':'إيصال المورد المقابل')+'</span><b>'+esc(r.matched.who||'')+' · '+fmt(r.matched.amount,0)+' '+esc(r.matched.ccy)+(r.matched.ref?' · '+esc(r.matched.ref):'')+'</b></div>'+
      '<div><span>طريقة المطابقة</span><b>'+({stored:'مثبّتة',ref:'رقم العملية',amount:'المبلغ مطابق',approx:'المبلغ ضمن الهامش'}[side==='sup'?(r.matched.how||'ref'):r.how]||'—')+'</b></div>':'<div><span>المطابقة</span><b style="color:#ED6C02">لا إيصال مقابل بعد</b></div>')+
    '<div><span>المصدر</span><b>'+src+'</b></div>'+
    '<div class="act">'+(r.file?'<button onclick="event.stopPropagation();window.open(\''+esc(r.file)+'\',\'_blank\')">عرض الملف</button>':'')+
    (side==='sup'&&!r.matched&&r.rid?'<button onclick="event.stopPropagation();m13.arch(\''+r.id+'\')">أرشفة — بلا تسوية</button>':'')+
    ((r.rid||r.oid)?'<button class="del" onclick="event.stopPropagation();m13.del(\''+r.id+'\')">حذف</button>':'')+'</div></div></div>';
}
function col(side){
  const rows=(side==='sup'?M.sup:M.cust).filter(passes),sum=rows.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0),ok=rows.filter(r=>r.matched).length;
  const show=M.open['all:'+side]?rows:rows.slice(0,6);
  return '<div class="m13col"><div class="m13ch"><span class="m13ic '+(side==='sup'?'g':'b')+'">'+(side==='sup'?'OUT':'IN')+'</span><div class="t"><b>'+(side==='sup'?'إيصالات الموردين':'إيصالات الزبائن')+'</b><span><span class="num">'+rows.length+'</span> إيصال · <span class="num">'+ok+'</span> مطابَق</span></div><span class="sum">'+fmt(sum,0)+' AOA</span></div>'+
    '<div class="m13up"><button onclick="m13.upload(\''+side+'\')">رفع إيصالات '+(side==='sup'?'الموردين':'الزبائن')+'</button><button class="ghost" onclick="m13.manual(\''+side+'\')">إدخال يدوي</button></div>'+
    (show.length?show.map(r=>card(r,side)).join(''):'<div class="empty" style="padding:16px">لا إيصالات في هذه الفترة</div>')+
    (rows.length>6?'<button class="m13more" onclick="m13.toggle(\'all:'+side+'\')">'+(M.open['all:'+side]?'عرض أقل':'عرض الكل ('+rows.length+')')+'</button>':'')+(side==='sup'&&(M.arch||[]).length?'<button class="m13more" style="color:#6A5A8E;border-color:#D9D2E8" onclick="m13.toggle(\'archl\')">'+(M.open['archl']?'إخفاء المؤرشفة':'مؤرشفة بلا تسوية — خارج الحساب ('+M.arch.length+')')+'</button>'+(M.open['archl']?M.arch.map(archRow).join(''):''):'')+'</div>';
}
function render(){
  if(!ensure()||!M.loaded)return;
  q('#m13rng').innerHTML=[['today','اليوم'],['2d','أمس واليوم'],['7d','٧ أيام'],['all','الكل']].map(x=>'<button class="'+(M.range===x[0]?'on':'')+'" onclick="m13.range(\''+x[0]+'\')">'+x[1]+'</button>').join('');
  const C=M.cust.filter(passes),S=M.sup.filter(passes);
  const sIn=C.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0),sOut=S.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0);
  const okC=C.filter(r=>r.matched),sOk=okC.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0),pend=C.filter(r=>!r.matched),sPend=sIn-sOk,pct=sIn?sOk/sIn*100:0;
  const unmatchedSup=S.filter(r=>!r.matched),sUS=unmatchedSup.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0);
  try{ /* دين المطابقة: مسوّى بلا مورد — على كامل البيانات لا على فلتر المدى */
    const dAll=M.cust.filter(r=>!r.matched); /* كل إيصال زبون بلا إيصال مورد — مسوّى أو قيد الانتظار */
    const dAmt=dAll.reduce((s,x)=>s+(x.ccy==='AOA'?x.amount:0),0);
    localStorage.setItem('bdl_match_debt',JSON.stringify({n:dAll.length,amt:dAmt,ts:Date.now()}));
    if(window.bdlDebtPaint)bdlDebtPaint();
  }catch(e){}
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
    '<div class="m13tol"><span>هامش التطابق %</span><input id="m13tol" inputmode="decimal" value="'+M.tol+'"><button onclick="m13.pairs()">تقرير الارتباطات</button><button onclick="m13.archiveOrphans()">أرشفة بلا تسوية</button><button onclick="m13.retol()">إعادة المطابقة</button><button class="pri" onclick="m13.commit()">تثبيت المطابقات</button></div></div>';
}

function archRow(r){
  return '<div class="m13r v2" style="opacity:.72;border-inline-start-color:#6A5A8E">'+
    '<div class="v2t"><span class="m13b" style="background:#EFEAF7;color:#6A5A8E">مؤرشف — لا يُحتسب</span>'+
    '<div class="v2a" style="color:#6A5A8E">'+fmt(r.amount,0)+' <small>'+esc(r.ccy)+'</small></div></div>'+
    '<div class="v2rows"><div><span>المورد</span><b>'+esc(r.who||'—')+'</b></div>'+
    '<div><span>المرجع</span><b class="num">'+esc(r.ref||'—')+'</b></div>'+
    '<div><span>البنك</span><b>'+esc(r.bank||'—')+'</b></div></div>'+
    '<div class="act"><button onclick="m13.unarch(\''+r.id+'\')">استرجاع للحساب</button>'+
    (r.file?'<button onclick="window.open(\''+esc(r.file)+'\',\'_blank\')">عرض الملف</button>':'')+
    '<button class="del" onclick="m13.del(\''+r.id+'\')">حذف</button></div></div>';
}
async function archSet(r,on){
  const o=Object.assign({},r.ocr,{archived:!!on,archived_at:on?new Date().toISOString():null});
  const x=await fetch(SB+'/bdl_receipts?id=eq.'+r.rid,{method:'PATCH',headers:H(),body:JSON.stringify({ocr:o})});
  if(!x.ok)throw 0;r.ocr=o;
}
async function archOne(id){
  const r=M.sup.find(x=>x.id===id);if(!r||!r.rid)return;
  if(!confirm('أرشفة هذا الإيصال؟\nسيخرج من الحساب والمطابقة والمقارنات، ويبقى محفوظًا ويمكن استرجاعه.'))return;
  try{await archSet(r,true);toast('أُرشف — خارج الحساب ✓');load();}catch(e){toast('تعذّرت الأرشفة');}
}
async function unarchOne(id){
  const r=(M.arch||[]).find(x=>x.id===id);if(!r||!r.rid)return;
  try{await archSet(r,false);toast('استُرجع للحساب ✓');load();}catch(e){toast('تعذّر الاسترجاع');}
}
async function archiveOrphans(){
  const list=M.sup.filter(r=>!r.matched&&r.rid&&r.src==='upload');
  if(!list.length){toast('لا إيصالات مورد بلا تسوية للأرشفة');return;}
  const sum=list.reduce((a,x)=>a+(x.ccy==='AOA'?x.amount:0),0);
  if(!confirm('أرشفة '+list.length+' إيصال مورد بلا تسوية ('+fmt(sum,0)+' AOA)؟\nتخرج من الحساب وتبقى قابلة للاسترجاع.'))return;
  let n=0;await POOL(list,4,async(r)=>{try{await archSet(r,true);n++;}catch(e){}});
  toast('أُرشف '+n+' إيصال ✓ — خارج الحساب');load();
}
/* ───── تسمية المورد على الإيصال ───── */
async function nameSup(id){
  const r=M.sup.find(x=>x.id===id);if(!r)return;
  const v=prompt('اسم المورد لهذا الإيصال:',r.who||'');if(v===null)return;
  const name=v.trim();
  try{
    if(r.rid){const o=Object.assign({},r.ocr,{sup_name:name});
      const x=await fetch(SB+'/bdl_receipts?id=eq.'+r.rid,{method:'PATCH',headers:H(),body:JSON.stringify({ocr:o})});
      if(!x.ok)throw 0;r.ocr=o;}
    else if(r.oid){const x=await fetch(SB+'/bdl_op_receipts?id=eq.'+r.oid,{method:'PATCH',headers:H(),body:JSON.stringify({sender:name})});
      if(!x.ok)throw 0;}
    r.who=name;toast(name?('سُمّي المورد: '+name+' ✓'):'أُزيل الاسم');render();
  }catch(e){toast('تعذّر حفظ الاسم');}
}
async function fwdSet(id){
  const r=M.cust.find(x=>x.id===id);if(!r||!r.rid)return;
  const v=prompt('المورد المكلَّف بهذا الإيصال (إلى من حُوِّل):',r.fwdSup||'');if(v===null)return;
  const name=v.trim();
  try{
    const o=Object.assign({},r.ocr,{fwd_sup:name||null,fwd_at:name?(r.ocr.fwd_at||new Date().toISOString()):null});
    const x=await fetch(SB+'/bdl_receipts?id=eq.'+r.rid,{method:'PATCH',headers:H(),body:JSON.stringify({ocr:o})});
    if(!x.ok)throw 0;r.ocr=o;r.fwdSup=name;toast(name?'كُلِّف: '+name+' ✓':'أُزيل التكليف');render();
  }catch(e){toast('تعذّر الحفظ');}
}
/* ───── تقرير الارتباطات: زبون × مورد ───── */
function pairsReport(){
  const agg={};
  M.cust.forEach(c=>{if(!c.matched)return;const su=c.matched;
    const k=(c.who||'—')+'\u21E0'+(su.who||'—');
    (agg[k]=agg[k]||{c:c.who||'—',s:su.who||'—',n:0,amt:0});agg[k].n++;agg[k].amt+=(c.ccy==='AOA'?c.amount:0);});
  /* المكشوف على الموردين */
  const exp={};const now=Date.now();
  M.cust.forEach(c=>{if(c.matched)return;const k=c.fwdSup||'غير مخصَّص';
    const e=(exp[k]=exp[k]||{s:k,n:0,amt:0,old:0});e.n++;e.amt+=(c.ccy==='AOA'?c.amount:0);
    const h=Math.floor((now-c.date.getTime())/36e5);if(h>e.old)e.old=h;});
  const erows=Object.values(exp).sort((a,b)=>b.amt-a.amt);
  const rows=Object.values(agg).sort((a,b)=>b.n-a.n||b.amt-a.amt);
  const un=rows.filter(r=>r.s==='—').reduce((sm,x)=>sm+x.n,0);
  sheet(hdr('الارتباطات والذمم')+
    (erows.length?'<div class="m13status warn" style="margin-bottom:8px">المكشوف على الموردين — إيصالات زبائن حُوِّلت ولا يقابلها إيصال مورد</div>'+
      '<table class="m13tb2" style="margin-bottom:14px"><tr><th>المورد المكلَّف</th><th>إيصالات</th><th>المكشوف AOA</th><th>أقدم</th></tr>'+
      erows.map(r=>'<tr><td>'+(r.s==='غير مخصَّص'?'<span style="color:#B00020;font-weight:800">غير مخصَّص</span>':esc(r.s))+'</td><td class="num">'+r.n+'</td><td class="num" style="color:#B00020;font-weight:800">'+fmt(r.amt,0)+'</td><td class="num">'+(r.old>=24?Math.floor(r.old/24)+' يوم':r.old+' س')+'</td></tr>').join('')+'</table>':'')+
    (rows.length
      ?'<table class="m13tb2"><tr><th>الزبون</th><th>المورد</th><th>مطابقات</th><th>الإجمالي AOA</th></tr>'+
        rows.map(r=>'<tr><td>'+esc(r.c)+'</td><td>'+(r.s==='—'?'<span style="color:#ED6C02;font-weight:700">بلا اسم</span>':esc(r.s))+'</td><td class="num">'+r.n+'</td><td class="num">'+fmt(r.amt,0)+'</td></tr>').join('')+'</table>'+
        (un?'<div class="m13status warn" style="margin-top:10px">'+un+' مطابقة بمورد بلا اسم — اضغط «اضغط لكتابة اسم المورد» على بطاقة الإيصال لتسميته</div>':'')
      :'<div class="empty" style="padding:20px">لا مطابقات في هذه الفترة</div>'));
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
    '<div class="m13fld" style="margin:10px 0 4px"><label>'+(side==='sup'?'اسم المورد للدفعة كاملة':'اسم الزبون للدفعة كاملة')+' — يُطبَّق على كل الإيصالات أدناه</label><input id="m13bn" oninput="m13.bname(this.value)" placeholder="'+(side==='sup'?'مثال: Arnesto':'اختياري')+'"></div>'+
    (side==='cust'?'<div class="m13fld" style="margin:0 0 4px"><label>المورد المكلَّف بهذه الدفعة — إلى من ستُحوَّل</label><input id="m13bs" oninput="m13.bsup(this.value)" placeholder="مثال: Domingo"></div>':'')+
    '<div class="m13ps" id="m13ps"></div>'+
    '<div class="m13q" id="m13qq"></div>'+
    '<div class="m13act"><button id="m13save" disabled onclick="m13.save()">حفظ ومطابقة</button><button class="ghost" onclick="closeOvl(\'m13\')">إلغاء</button></div>');
}
const POOL=async(arr,n,fn)=>{let i=0;const w=Array.from({length:Math.min(n,arr.length)||1},async()=>{while(i<arr.length){const k=i++;await fn(arr[k],k);}});await Promise.all(w);};
async function files(list){
  const arr=Array.from(list||[]);if(!arr.length||!M.up)return;
  const t0=M.up.items.length;
  arr.forEach(f0=>M.up.items.push({file:f0,status:'rd',amount:'',ccy:'AOA',bank:'',ref:'',name:(M.up.bname||''),fwdSup:(M.up.bsup||''),url:'',conf:0}));
  for(let i=t0;i<M.up.items.length;i++)drawItem(i);
  drawStats();
  /* ١: قصّ + بصمة — ٤ متوازية */
  await POOL(M.up.items.slice(t0),4,async(it,k)=>{const i=t0+k;
    try{it.fp=await fp(it.file);}catch(e){} /* البصمة من الأصل — قبل أي قصّ */
    try{it.file=window.autoCropReceipt?await autoCropReceipt(it.file):it.file;}catch(e){}
    if(i-t0<40&&/^image\//.test(it.file.type||'')){try{it.url=URL.createObjectURL(it.file);}catch(e){}}
    drawItem(i);});
  /* ٢: فحص التكرار دفعةً واحدة (chunks 100) */
  const fps=[...new Set(M.up.items.slice(t0).map(it=>it.fp).filter(Boolean))],seen=new Set();
  for(let i=0;i<fps.length;i+=100){const part=fps.slice(i,i+100);
    try{const r=await fetch(SB+'/bdl_receipts?select=fingerprint&fingerprint=in.('+part.map(x=>'"'+x+'"').join(',')+')',{headers:H()});
      (r.ok?await r.json():[]).forEach(x=>seen.add(x.fingerprint));}catch(e){}}
  M.up.items.forEach((it,i)=>{if(i>=t0&&it.fp&&seen.has(it.fp)&&it.status!=='dup'){it.status='dup';drawItem(i);}});
  drawStats();
  /* ٣: القراءة — ٣ متوازية */
  const todo=M.up.items.map((it,i)=>({it,i})).filter(x=>x.i>=t0&&x.it.status!=='dup');
  await POOL(todo,3,async(x)=>{const it=x.it;
    try{let p={};if(window.readReceipt)p=await Promise.race([readReceipt(it.file),new Promise((_,rj)=>setTimeout(()=>rj(new Error('timeout')),45000))]);
      it.amount=p.amount||'';it.ccy=norm(p.ccy||'AOA');it.bank=p.bank||'';it.ref=p.ref||p.txn||'';
      it.name=(M.up.bname||p.name||p.receiver||it.name||'');it.conf=Number(p.conf)||0;it.status='ok';
    }catch(e){it.status='ok';it.conf=0;}
    drawItem(x.i);drawStats();});
  /* ٣ب: تكرار رقم العملية — البصمة لا تكفي (إعادة قص الصورة تغيّرها) */
  try{
    const wref=M.up.items.map((it,i)=>({it,i})).filter(x=>x.i>=t0&&x.it.status==='ok'&&String(x.it.ref||'').trim());
    const refs=[...new Set(wref.map(x=>String(x.it.ref).trim()))],hitR=new Set();
    for(let i=0;i<refs.length;i+=80){const part=refs.slice(i,i+80);
      const r=await fetch(SB+'/bdl_receipts?select=txn_ref&ocr-%3E%3Eside=eq.'+(M.up.side==='sup'?'supplier':'customer')+'&txn_ref=in.('+part.map(x=>'"'+encodeURIComponent(x)+'"').join(',')+')',{headers:H()});
      (r.ok?await r.json():[]).forEach(x=>hitR.add(String(x.txn_ref)));}
    /* التكرار داخل الدفعة نفسها أيضًا */
    const inBatch={};
    wref.forEach(x=>{const k=String(x.it.ref).trim();
      if(hitR.has(k)||inBatch[k]){x.it.status='dup';x.it.warn='';x.it.dupWhy='مكرر بالمرجع '+k;drawItem(x.i);}
      else inBatch[k]=1;});
  }catch(e){}
  drawStats();
  /* ٤: تحذير تشابه المبلغ لمن بلا مرجع — استعلام مجمّع */
  try{
    const noref=M.up.items.map((it,i)=>({it,i})).filter(x=>x.i>=t0&&x.it.status==='ok'&&!x.it.ref&&x.it.amount);
    const amts=[...new Set(noref.map(x=>Number(String(x.it.amount).replace(/[^\d.]/g,''))).filter(Boolean))],hit=new Set();
    for(let i=0;i<amts.length;i+=80){const part=amts.slice(i,i+80);
      const r=await fetch(SB+'/bdl_receipts?select=amount&ocr-%3E%3Eside=eq.'+(M.up.side==='sup'?'supplier':'customer')+'&amount=in.('+part.join(',')+')',{headers:H()});
      (r.ok?await r.json():[]).forEach(x=>hit.add(Number(x.amount)));}
    noref.forEach(x=>{if(hit.has(Number(String(x.it.amount).replace(/[^\d.]/g,'')))){x.it.warn='نفس المبلغ موجود — تأكد أنه تحويل مختلف';drawItem(x.i);}});
  }catch(e){}
  drawStats();
}
function confBadge(it){
  if(it.status!=='ok'||!it.conf)return '';
  const c=Math.round(it.conf),cl=c>=85?'hi':c>=70?'md':'lo';
  return '<span class="m13cf '+cl+'">دقة '+c+'%</span> ';
}
function drawStats(){
  const box=q('#m13ps');if(!box||!M.up)return;
  const t=M.up.items.length;if(!t){box.innerHTML='';return;}
  const rd=M.up.items.filter(x=>x.status==='rd').length,ok=M.up.items.filter(x=>x.status==='ok').length,
        dup=M.up.items.filter(x=>x.status==='dup').length,lo=M.up.items.filter(x=>x.status==='ok'&&(x.conf||0)>0&&x.conf<70).length;
  box.innerHTML='<b class="num">'+t+'</b> إيصال · قُرئ <b class="num">'+(t-rd)+'</b> · جاهز <b class="num">'+ok+'</b>'+
    (dup?' · <span style="color:#B00020">مكرر <b class="num">'+dup+'</b></span>':'')+
    (lo?' · <span style="color:#9A4B00">للمراجعة <b class="num">'+lo+'</b></span>':'')+
    (rd?' · <span style="color:var(--blue)">جارٍ القراءة…</span>':'');
  const b=q('#m13save');if(b&&!M.saving){b.disabled=!ok||rd>0;b.textContent=rd?('جارٍ القراءة… '+(t-rd)+'/'+t):(!ok&&dup?'لا جديد — كل الدفعة مكررة':'حفظ ومطابقة'+(ok?' ('+ok+')':''));}
}
function itemHTML(it,i){
  const thumb=it.url&&/^image\//.test(it.file&&it.file.type||'')
    ?'<img src="'+it.url+'" onclick="event.stopPropagation();m13.view('+i+')">'
    :'<div class="ph" onclick="event.stopPropagation();m13.view('+i+')">'+(/pdf/i.test((it.file&&it.file.type)||'')?'PDF':'عرض')+'</div>';
  return thumb+
    '<div class="g"><input placeholder="المبلغ" inputmode="decimal" class="num'+(it.status==='ok'&&(it.conf||0)>0&&it.conf<70?' lowc':'')+'" value="'+esc(it.amount)+'" oninput="m13.edit('+i+',\'amount\',this.value)"><input placeholder="العملة" value="'+esc(it.ccy)+'" oninput="m13.edit('+i+',\'ccy\',this.value)">'+
    '<input placeholder="البنك" value="'+esc(it.bank)+'" oninput="m13.edit('+i+',\'bank\',this.value)"><input placeholder="رقم العملية" class="num" value="'+esc(it.ref)+'" oninput="m13.edit('+i+',\'ref\',this.value)">'+
    '<input placeholder="'+(M.up&&M.up.side==='sup'?'اسم المورد':'اسم الزبون')+'" class="nm" value="'+esc(it.name)+'" oninput="m13.edit('+i+',\'name\',this.value)" style="grid-column:1/-1">'+
    (M.up&&M.up.side==='cust'?'<input placeholder="المورد المكلَّف — إلى من حُوِّل" class="fs" value="'+esc(it.fwdSup||'')+'" oninput="m13.edit('+i+',\'fwdSup\',this.value)" style="grid-column:1/-1">':'')+
    '<div class="st '+it.status+'">'+(it.status==='rd'?'جارٍ القراءة…':it.status==='dup'?(it.dupWhy?'مكرر — '+esc(it.dupWhy)+'، لن يُحفظ':'مكرر — هذا الإيصال محفوظ مسبقًا، لن يُحفظ'):confBadge(it)+'جاهز'+(it.warn?' · <span style="color:#9A4B00">'+it.warn+'</span>':''))+'</div></div>';
}
function drawItem(i){
  const box=q('#m13qq');if(!box||!M.up)return;const it=M.up.items[i];if(!it)return;
  let el=document.getElementById('m13qi'+i);
  if(!el){el=document.createElement('div');el.className='m13qi';el.id='m13qi'+i;box.appendChild(el);}
  el.innerHTML=itemHTML(it,i);
}
function drawQueue(){const box=q('#m13qq');if(!box||!M.up)return;box.innerHTML='';M.up.items.forEach((_,i)=>drawItem(i));drawStats();}
function viewItem(i){
  const it=M.up&&M.up.items[i];if(!it||!it.file)return;
  if(!it.url){try{it.url=URL.createObjectURL(it.file);}catch(e){}}
  if(!it.url)return;
  if(/pdf/i.test(it.file.type||'')){window.open(it.url,'_blank');return;}
  let ov=document.getElementById('m13vw');
  if(!ov){ov=document.createElement('div');ov.id='m13vw';ov.onclick=()=>{ov.style.display='none';};
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(4,10,24,.93);display:none;place-items:center;padding:14px';
    ov.innerHTML='<img style="max-width:100%;max-height:92vh;object-fit:contain">';document.body.appendChild(ov);}
  ov.querySelector('img').src=it.url;ov.style.display='grid';
  drawItem(i);
}
async function save(){
  if(!M.up)return;
  const side=M.up.side,items=M.up.items.filter(it=>it.status==='ok');
  if(!items.length){
    const dup=M.up.items.filter(it=>it.status==='dup').length,rd=M.up.items.filter(it=>it.status==='rd').length;
    toast(rd?'انتظر انتهاء القراءة…':dup?'كل إيصالات هذه الدفعة مكررة ومحفوظة مسبقًا — لا جديد للحفظ':'لا إيصالات جاهزة للحفظ');
    return;}
  const btn=q('#m13save');btn.disabled=true;M.saving=true;let n=0,done=0,rej=0;
  try{
  /* فحص مرجع أخير قبل الإرسال — يغطي الإدخال اليدوي أيضًا */
  try{
    const refs=[...new Set(items.map(it=>String(it.ref||'').trim()).filter(Boolean))],hitR=new Set();
    for(let i=0;i<refs.length;i+=80){const part=refs.slice(i,i+80);
      const r=await fetch(SB+'/bdl_receipts?select=txn_ref&ocr-%3E%3Eside=eq.'+(side==='sup'?'supplier':'customer')+'&txn_ref=in.('+part.map(x=>'"'+encodeURIComponent(x)+'"').join(',')+')',{headers:H()});
      (r.ok?await r.json():[]).forEach(x=>hitR.add(String(x.txn_ref)));}
    items.forEach(it=>{if(it.ref&&hitR.has(String(it.ref).trim())){it.status='dup';it.dupWhy='مكرر بالمرجع';}});
  }catch(e){}
  const live=items.filter(it=>it.status==='ok');
  if(!live.length){drawQueue();toast('كل الإيصالات مكررة — لا جديد للحفظ');M.saving=false;btn.disabled=false;btn.textContent='حفظ ومطابقة';return;}
  await POOL(live,4,async(it)=>{try{
    let url=null;
    if(it.file&&it.fp){try{const path=(side==='sup'?'supplier':'customer')+'/'+new Date().toISOString().slice(0,10)+'/'+it.fp.slice(0,16)+(/pdf/i.test(it.file.type)?'.pdf':'.jpg');
      const up=await fetch(SB.replace('/rest/v1','/storage/v1')+'/object/receipts/'+path,{method:'POST',headers:{apikey:ANON,Authorization:'Bearer '+(TOK||ANON),'Content-Type':it.file.type||'image/jpeg','x-upsert':'true'},body:it.file});
      if(up.ok)url=SB.replace('/rest/v1','/storage/v1')+'/object/public/receipts/'+path;}catch(e){}}
    const body={fingerprint:it.fp||null,amount:Number(String(it.amount).replace(/[^\d.]/g,''))||null,ccy:norm(it.ccy),bank:it.bank||null,txn_ref:it.ref||null,file_url:url,
      ocr:{side:side==='sup'?'supplier':'customer',source:'match-center',name:it.name||null,conf:it.conf||null,uploaded_at:new Date().toISOString(),manual:!it.file}};
    if(side==='sup'&&it.name)body.ocr.sup_name=it.name;
    if(side!=='sup'&&it.fwdSup){body.ocr.fwd_sup=it.fwdSup;body.ocr.fwd_at=new Date().toISOString();}
    const r=await fetch(SB+'/bdl_receipts',{method:'POST',headers:H({Prefer:'return=representation'}),body:JSON.stringify(body)});if(r.ok)n++;else if(r.status===409){rej++;it.status='dup';it.dupWhy='رفضته القاعدة كمكرر';}}catch(e){}
    done++;if(btn)btn.textContent='حفظ… '+done+'/'+live.length;});
  }finally{M.saving=false;if(btn){btn.disabled=false;btn.textContent='حفظ ومطابقة';}}
  toast('حُفظ '+n+' إيصال ✓'+(rej?' · رُفض '+rej+' كمكرر (حماية القاعدة)':'')+' — جارٍ المطابقة');closeOvl('m13');M.up=null;await load();
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
async function del(id){const r=(M.cust.concat(M.sup,M.arch||[])).find(x=>x.id===id);if(!r||(!r.rid&&!r.oid))return;
  if(!confirm('حذف هذا الإيصال نهائيًا؟\nسيتحرّر رقم عمليته وبصمته ويمكن رفعه من جديد.'))return;
  let ok=false;
  try{
    if(r.rid)ok=(await fetch(SB+'/bdl_receipts?id=eq.'+r.rid,{method:'DELETE',headers:H()})).ok;
    else if(r.oid)ok=(await fetch(SB+'/bdl_op_receipts?id=eq.'+r.oid,{method:'DELETE',headers:H()})).ok;
  }catch(e){}
  if(ok){toast('حُذف ✓ — يمكن رفعه من جديد الآن');load();}else toast('تعذّر الحذف');}

window.m13={toggle:id=>{M.open[id]=!M.open[id];render();},range:r=>{M.range=r;M.open={};load();},retol:async()=>{const b=q('#m13rng');M.tol=Number(q('#m13tol').value)||0;M.open={};toast('جارٍ إعادة المطابقة…');M.loaded=false;await load();toast('أعيدت المطابقة على هامش '+M.tol+'% ✓');},
  commit,upload:uploadSheet,manual:manualSheet,files,nameSup,fwdSet,bsup:v=>{if(M.up)M.up.bsup=v.trim();(M.up&&M.up.items||[]).forEach((it,i)=>{it.fwdSup=M.up.bsup;const el=document.querySelector('#m13qi'+i+' input.fs');if(el)el.value=M.up.bsup;});},pairs:pairsReport,edit:(i,k,v)=>{if(M.up&&M.up.items[i])M.up.items[i][k]=v;},bname:v=>{if(!M.up)return;M.up.bname=v.trim();M.up.items.forEach((it,i)=>{it.name=M.up.bname;const el=document.querySelector('#m13qi'+i+' input.nm');if(el)el.value=M.up.bname;});},save,manualSave,del,view:viewItem,arch:archOne,unarch:unarchOne,archiveOrphans,reload:()=>load()};
/* التبويب + التحديث */
const G=window.go;window.go=function(t){G.apply(this,arguments);if(t==='books'){ensure();if(!M.loaded)load();}};
const F=window.fetch;window.fetch=function(u,o){const p=F.apply(this,arguments);
  try{const url=String(u&&u.url||u),m=((o&&o.method)||'GET').toUpperCase();
    if(m!=='GET'&&/bdl_op_receipts|bdl_receipts|bdl_settle|bdl_unsettle|bdl_transactions/.test(url)&&!M.busy&&!M.up)p.then(()=>setTimeout(()=>{if(q('#v-books')&&q('#v-books').style.display!=='none')load();else M.loaded=false;},900),()=>{});}catch(e){}
  return p;};
setTimeout(()=>{ensure();if(q('#v-books')&&q('#v-books').style.display!=='none')load();},300);
console.log('bdl-ops13: مركز المطابقة جاهز ✓');
})();
