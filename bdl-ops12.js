/* ═══════════════════════════════════════════════════════════════════
   bdl-ops12.js — دفتر تسوية الإيصالات (Build 1150) — طبقة إضافية فوق ops8 (الدفاتر)
   • يعلو دفاتر النقد داخل تبويب «الدفاتر»: 4 بطاقات إحصاء، عمود إيصالات الزبائن (in) وعمود
     إيصالات الموردين (out)، قسم مقارنة التسوية بأشرطة تقدم وشريط حالة، والبحث يصفّي الكل معًا.
   • المصدر: bdl_op_receipts (side in/out، match_txn) + bdl_ops (الزبون/المورد/المرجع/الهدف).
     إيصال الزبون «تمت التسوية» حين يقابله إيصال مورد (match_txn = txn_id) أو تُقفل عمليته.
   • هوية BDL (كحلي/أزرق/أبيض/أخضر/برتقالي)، بلا رموز تعبيرية. يعمل مع FAB «دفتر جديد» القائم.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
(function(){
const q=s=>document.querySelector(s);
const R={rc:null,ops:{},open:{},showAll:{in:false,out:false},busy:false};

const css=document.createElement('style');css.textContent=`
.r12wrap{margin:0 12px}
.r12st{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}
@media(min-width:620px){.r12st{grid-template-columns:repeat(4,1fr)}}
.r12st>div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 13px;display:flex;gap:10px;align-items:center}
.r12ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font:800 11px "Inter",sans-serif;flex:0 0 auto}
.r12ic.b{background:#E5F0FF;color:var(--blue)}.r12ic.g{background:#E3F7EE;color:#2E7D32}.r12ic.o{background:#FFF1E0;color:#ED6C02}.r12ic.n{background:var(--wash);color:var(--muted)}
.r12st .v{font-size:18px;font-weight:800;font-family:"Inter",sans-serif;direction:ltr;text-align:right;letter-spacing:-.3px;line-height:1.1}
.r12st .v small{font-size:10.5px;color:var(--muted);font-weight:700;margin-left:3px}
.r12st .l{font-size:11px;color:var(--muted);font-weight:700;margin-top:2px}
.r12cols{display:grid;grid-template-columns:1fr;gap:10px;margin-top:10px}
@media(min-width:620px){.r12cols{grid-template-columns:1fr 1fr}}
.r12col{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 12px 8px}
.r12ch{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.r12ch .t{flex:1}.r12ch .t b{font-size:13.5px;color:var(--navy);display:block}.r12ch .t span{font-size:11px;color:var(--muted)}
.r12ch .sum{font:800 14px "Inter",sans-serif;color:var(--ink);direction:ltr}
.r12r{border:1px solid var(--line);border-radius:11px;padding:10px 11px;margin-bottom:7px;cursor:pointer;transition:border-color .15s,box-shadow .15s;background:#fff}
.r12r:hover,.r12r.open{border-color:#B9CCEB;box-shadow:0 6px 16px -8px rgba(11,47,112,.2)}
.r12top{display:flex;align-items:center;gap:10px}
.r12bk{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 10px "Inter",sans-serif;flex:0 0 auto;background:var(--navy)}
.r12bk.g{background:#2E7D32}
.r12mid{flex:1;min-width:0}
.r12mid .bn{font-size:12.5px;font-weight:800;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r12mid .dt{font-size:10.5px;color:var(--muted);font-family:"Inter",sans-serif;margin-top:1px}
.r12amt{text-align:left;direction:ltr}
.r12amt .a{font:800 15px "Inter",sans-serif;letter-spacing:-.3px}
.r12amt .a.ok{color:#2E7D32}.r12amt .a.pend{color:#ED6C02}
.r12b{display:inline-block;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;margin-top:3px}
.r12b.ok{background:#E3F7EE;color:#2E7D32}.r12b.pend{background:#FFF1E0;color:#ED6C02}
.r12x{display:none;border-top:1px dashed var(--line);margin-top:9px;padding-top:8px;font-size:11.5px;color:var(--muted)}
.r12r.open .r12x{display:block}
.r12x div{display:flex;justify-content:space-between;gap:8px;padding:3px 0}
.r12x b{font-family:"Inter",sans-serif;color:var(--ink);font-weight:700;direction:ltr;max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.r12more{display:block;width:100%;border:1px dashed var(--line);background:#fff;color:var(--blue);font-weight:800;font-size:11.5px;padding:8px;border-radius:9px;font-family:inherit;cursor:pointer;margin:2px 0 4px}
.r12cmp{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:10px}
.r12cmp h4{margin:0 0 10px;font-size:13.5px;color:var(--navy);font-weight:800}
.r12bar{margin-bottom:10px}
.r12bar .l{display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-bottom:5px}
.r12bar .l b{font-family:"Inter",sans-serif;color:var(--ink);direction:ltr}
.r12bar .tr{height:10px;background:var(--wash);border-radius:999px;overflow:hidden}
.r12bar .f{height:100%;border-radius:999px;transition:width .5s ease}
.r12bar .f.b{background:linear-gradient(90deg,#1565C0,#42A5F5)}.r12bar .f.g{background:linear-gradient(90deg,#2E7D32,#66BB6A)}.r12bar .f.o{background:linear-gradient(90deg,#ED6C02,#FFA726)}
.r12status{border-radius:10px;padding:10px 12px;font-size:12px;font-weight:700;margin-top:6px}
.r12status.ok{background:#E3F7EE;color:#2E7D32}.r12status.warn{background:#FFF1E0;color:#9A4B00}
.r12sec{font-size:13px;font-weight:800;color:var(--navy);margin:16px 0 6px;display:flex;justify-content:space-between;align-items:center}
.r12sec span{font-size:11px;color:var(--muted);font-weight:600}
.r12sync{font-size:10.5px;color:var(--muted);font-family:"Inter",sans-serif}
`;document.head.appendChild(css);

function ensure(){
  const v=q('#v-books');if(!v||q('#r12'))return;
  const list=q('#bk8list');
  list.insertAdjacentHTML('beforebegin','<div class="r12wrap" id="r12"><div id="r12st"></div><div id="r12cols"></div><div id="r12cmp"></div>'+
    '<div class="r12sec"><span>دفاتر النقد</span><span id="r12sync"></span></div></div>');
}
const money=(v,d)=>'<span class="num">'+fmt(v,d==null?0:d)+'</span>';
const short=(v)=>v>=1e6?(v/1e6).toFixed(1).replace(/\.0$/,'')+'M':v>=1e3?(v/1e3).toFixed(0)+'K':fmt(v,0);
const dOf=x=>new Date(x.created_at);
const qs=()=>((q('#bk8q')||{}).value||'').trim().toLowerCase();

async function load(){
  if(R.busy)return;R.busy=true;ensure();
  try{
    const [a,b]=await Promise.all([
      fetch(SB+'/bdl_op_receipts?select=*&order=created_at.desc&limit=600',{headers:H()}),
      fetch(SB+'/bdl_ops?select=id,ref,client_name,supplier,target_aoa,status,created_at&order=created_at.desc&limit=600',{headers:H()})]);
    R.rc=a.ok?await a.json():[];R.ops={};(b.ok?await b.json():[]).forEach(o=>R.ops[o.id]=o);
  }catch(e){R.rc=R.rc||[];}
  R.busy=false;render();
}
function enrich(){
  const rc=R.rc||[],outKeys={};
  rc.forEach(x=>{if(x.side==='out'&&x.match_txn)outKeys[x.op_id+'|'+x.match_txn]=x;});
  rc.forEach(x=>{const o=R.ops[x.op_id]||{};x._op=o;
    if(x.side==='in'){const m=outKeys[x.op_id+'|'+x.txn_id];x._settled=!!m||o.status==='closed'||o.status==='confirmed';x._match=m||null;x._who=o.client_name||x.sender||'—';}
    else{x._settled=true;x._who=o.supplier||x.sender||'—';}});
  return rc;
}
function passes(x){const s=qs();if(!s)return true;
  return [x._who,x.bank,x.txn_id,String(x.amount_aoa),x._op.ref,x._op.client_name,x._op.supplier].join(' ').toLowerCase().indexOf(s)>=0;}
function rcCard(x){
  const d=dOf(x),id=x.id,open=!!R.open[id],isIn=x.side==='in',bank=x.bank||(x.manual?'بدون إيصال':'بنك'),ini=String(bank).replace(/[^A-Za-z\u0600-\u06FF]/g,'').slice(0,2).toUpperCase()||'BD';
  return '<div class="r12r'+(open?' open':'')+'" onclick="r12.toggle(\''+id+'\')"><div class="r12top"><span class="r12bk'+(isIn?'':' g')+'">'+esc(ini)+'</span>'+
    '<div class="r12mid"><div class="bn">'+esc(x._who)+'</div><div class="dt">'+esc(bank)+' · '+d.toLocaleDateString('en-GB')+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</div></div>'+
    '<div class="r12amt"><div class="a '+(x._settled?'ok':'pend')+'">'+fmt(x.amount_aoa,0)+' <small style="font-size:10px">AOA</small></div><span class="r12b '+(x._settled?'ok':'pend')+'">'+(x._settled?'✓ تمت التسوية':'قيد الانتظار')+'</span></div></div>'+
    '<div class="r12x"><div><span>'+(isIn?'الزبون':'المورد')+'</span><b>'+esc(x._who)+'</b></div><div><span>رقم عملية البنك</span><b>'+esc(x.txn_id||'—')+'</b></div>'+
    '<div><span>مرجع العملية</span><b>'+esc(x._op.ref||'—')+'</b></div>'+(isIn?'<div><span>'+(x._match?'إيصال المورد المقابل':'المورد')+'</span><b>'+esc(x._match?(x._match.bank||'')+' '+fmt(x._match.amount_aoa,0):(x._op.supplier||'—'))+'</b></div>':'<div><span>يغطي إيصال الزبون</span><b>'+esc(x.match_txn||'غير محدد')+'</b></div>')+
    (x._op.target_aoa?'<div><span>هدف العملية</span><b>'+fmt(x._op.target_aoa,0)+' AOA</b></div>':'')+'</div></div>';
}
function col(side,rows){
  const isIn=side==='in',sum=rows.reduce((s,x)=>s+Number(x.amount_aoa||0),0),show=R.showAll[side]?rows:rows.slice(0,5);
  return '<div class="r12col"><div class="r12ch"><span class="r12ic '+(isIn?'b':'g')+'">'+(isIn?'IN':'OUT')+'</span><div class="t"><b>'+(isIn?'إيصالات الزبائن':'إيصالات الموردين')+'</b><span><span class="num">'+rows.length+'</span> إيصال · '+(isIn?'مرسل':'مستلم')+'</span></div><span class="sum">'+fmt(sum,0)+' AOA</span></div>'+
    (show.length?show.map(rcCard).join(''):'<div class="empty" style="padding:18px">لا إيصالات</div>')+
    (rows.length>5?'<button class="r12more" onclick="r12.more(\''+side+'\')">'+(R.showAll[side]?'عرض أقل':'عرض الكل ('+rows.length+')')+'</button>':'')+'</div>';
}
function render(){
  ensure();if(!R.rc)return;
  const all=enrich().filter(passes),ins=all.filter(x=>x.side==='in'),outs=all.filter(x=>x.side==='out');
  const sIn=ins.reduce((s,x)=>s+Number(x.amount_aoa||0),0),sOut=outs.reduce((s,x)=>s+Number(x.amount_aoa||0),0);
  const pend=ins.filter(x=>!x._settled),sPend=pend.reduce((s,x)=>s+Number(x.amount_aoa||0),0),sDone=sIn-sPend;
  const pct=sIn?Math.min(100,sDone/sIn*100):0,pctOut=sIn?Math.min(100,sOut/sIn*100):0;
  q('#r12st').innerHTML='<div class="r12st">'+
    '<div><span class="r12ic b">IN</span><div><div class="v" style="color:var(--blue)">'+short(sIn)+'<small>AOA</small></div><div class="l">إجمالي مرسل · '+ins.length+'</div></div></div>'+
    '<div><span class="r12ic g">OUT</span><div><div class="v" style="color:#2E7D32">'+short(sOut)+'<small>AOA</small></div><div class="l">إجمالي مستلم · '+outs.length+'</div></div></div>'+
    '<div><span class="r12ic o">…</span><div><div class="v" style="color:#ED6C02">'+short(sPend)+'<small>AOA</small></div><div class="l">قيد التسوية · '+pend.length+'</div></div></div>'+
    '<div><span class="r12ic n">%</span><div><div class="v">'+pct.toFixed(1)+'%</div><div class="l">نسبة التسوية</div></div></div></div>';
  q('#r12cols').innerHTML='<div class="r12cols">'+col('in',ins)+col('out',outs)+'</div>';
  const bar=(l,v,p,c)=>'<div class="r12bar"><div class="l"><span>'+l+'</span><b>'+fmt(v,0)+' AOA · '+p.toFixed(1)+'%</b></div><div class="tr"><div class="f '+c+'" style="width:'+Math.max(0,Math.min(100,p))+'%"></div></div></div>';
  q('#r12cmp').innerHTML='<div class="r12cmp"><h4>مقارنة التسوية — المرسل مقابل المستلم</h4>'+
    bar('إجمالي مرسل (الزبائن)',sIn,100,'b')+bar('إجمالي مستلم (الموردون)',sOut,pctOut,'g')+bar('المتبقي قيد التسوية',sPend,100-pct,'o')+
    (pend.length?'<div class="r12status warn">لم تُسوَّ جميع الإيصالات — يوجد <span class="num">'+pend.length+'</span> إيصال بقيمة <span class="num">'+fmt(sPend,0)+'</span> AOA قيد الانتظار</div>'
      :ins.length?'<div class="r12status ok">✓ جميع إيصالات الزبائن متوازنة مع إيصالات الموردين</div>':'')+
    (Math.abs(sOut-sDone)>1&&ins.length?'<div style="font-size:11px;color:var(--muted);margin-top:8px">فرق المستلم عن المسوّى: <b class="num">'+(sOut-sDone>=0?'+':'−')+fmt(Math.abs(sOut-sDone),0)+'</b> AOA</div>':'')+'</div>';
  const sy=q('#r12sync');if(sy)sy.textContent='آخر تحديث '+new Date().toLocaleTimeString('en-GB');
}
window.r12={toggle:id=>{R.open[id]=!R.open[id];render();},more:s=>{R.showAll[s]=!R.showAll[s];render();},reload:()=>load()};
/* البحث الموحّد: يصفّي الإيصالات ودفاتر النقد معًا */
const RB=window.renderBooks;window.renderBooks=function(){if(RB)RB.apply(this,arguments);if(R.rc)render();};
/* التحميل عند فتح التبويب + التحديث بعد الكتابة */
const G=window.go;window.go=function(t){G.apply(this,arguments);if(t==='books'){if(!R.rc)load();}};
const F=window.fetch;window.fetch=function(u,o){const p=F.apply(this,arguments);
  try{const url=String(u&&u.url||u),m=((o&&o.method)||'GET').toUpperCase();
    if(m!=='GET'&&/bdl_op_receipts|bdl_ops\b|bdl_ops\?|bdl_ops_purge|bdl_receipts_purge/.test(url))p.then(()=>setTimeout(()=>{if(q('#v-books')&&q('#v-books').style.display!=='none')load();else R.rc=null;},800),()=>{});}catch(e){}
  return p;};
if(q('#v-books')&&q('#v-books').style.display!=='none')load();
console.log('bdl-ops12: دفتر تسوية الإيصالات جاهز ✓');
})();
