/* ═══════════════════════════════════════════════════════════════════
   bdl-ops17.js — لوحة الفروقات فوق مركز المطابقة (Build 1218)
   طبقة إضافية فوق bdl-ops13 (تُستدعى من خطّافي m17.pre / m17.post):
   • فترة: يومي / أسبوعي / شهري / الكل / مخصص (من–إلى).
   • دائرة الفروقات: أحمر = نقص (إيصالات زبائن بلا مورد) · أخضر = فائض (إيصالات موردين بلا زبون)
     · أزرق = مطابَق. المنتصف: صافي الفرق أو «متوازن». الضغط يعرض غير المطابَق فقط.
   • تقرير الفترة: ملخص نقص/فائض/صافي + جدول بتلوين حسب العمر (يوم أحمر، أسبوع برتقالي، شهر أصفر).
   • ربط يدوي واحد لواحد: اختر إيصال زبون + إيصال مورد ← فرق المبلغ/الأيام/نسبة التطابق ← «ربط» يثبّت
     في ocr.matched_rcpt / covers (نفس مسار ops13)، و«فك الربط» يلغي مطابقة مثبّتة.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
(function(){
const q=s=>document.querySelector(s);
const K={only:false,link:false,selC:null,selS:null,more:false};
const css=document.createElement('style');css.textContent=`
.m17h{margin:12px 0 4px;background:linear-gradient(135deg,#0B2F70,#123B85 60%,#0B2F70);color:#fff;padding:16px 14px;display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center;position:relative;overflow:hidden}
.m17h:after{content:"";position:absolute;inset:auto 0 0 0;height:1px;background:#D4AF37}
.m17g{width:150px;height:150px;cursor:pointer;position:relative}
.m17g svg{width:150px;height:150px;transform:rotate(-90deg)}
.m17c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none}
.m17c b{font:800 19px/1 "Inter",sans-serif;letter-spacing:-.3px}.m17c small{font-size:10.5px;opacity:.85;margin-top:5px;font-weight:700}
.m17l{display:grid;gap:7px}
.m17l div{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:12px;font-weight:700;background:rgba(255,255,255,.08);padding:7px 9px}
.m17l div i{display:inline-block;width:9px;height:9px;margin-inline-end:6px;vertical-align:middle}
.m17l b{font-family:"Inter",sans-serif;font-size:12.5px;white-space:nowrap}
.m17tools{display:flex;gap:6px;margin:8px 0 4px;flex-wrap:wrap}
.m17tools button{border:1px solid #D6E4F7;background:#fff;color:var(--navy);font:800 11.5px/1 inherit;font-family:inherit;padding:9px 11px;cursor:pointer}
.m17tools button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.m17tools button.warn{border-color:#ED6C02;color:#9A4B00}
.m17cus{display:flex;gap:6px;align-items:center;margin:6px 0;font-size:11px;color:var(--muted);font-weight:700;flex-wrap:wrap}
.m17cus input{border:1px solid var(--line);padding:7px 8px;font:700 12px "Inter",sans-serif;color:var(--navy);background:#fff}
.m17only .m13r.ok{display:none}
.m17link .m13r{cursor:copy}
.m13r.m17sel{outline:3px solid #D4AF37;outline-offset:-3px}
.m17bar{position:fixed;left:10px;right:10px;bottom:84px;z-index:60;background:#0B2F70;color:#fff;padding:12px 14px;box-shadow:0 12px 30px rgba(0,0,0,.35);border-top:2px solid #D4AF37}
.m17bar .r{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;margin-bottom:10px}
.m17bar .r span{display:block;font-size:10.5px;opacity:.8;font-weight:700}.m17bar .r b{font:800 16px "Inter",sans-serif}
.m17bar .a{display:flex;gap:8px}.m17bar .a button{flex:1;border:0;padding:12px;font:800 13px inherit;font-family:inherit;cursor:pointer;background:#fff;color:var(--navy)}
.m17bar .a button.g{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4)}.m17bar .a button.d{background:#B00020;color:#fff}
.m17bar .h{font-size:12px;font-weight:700;opacity:.9;margin-bottom:8px}
.m17rep{margin:12px 0 18px;background:#fff;border:1px solid var(--line)}
.m17rep h4{margin:0;padding:12px 12px 8px;font-size:14px;color:var(--navy);display:flex;justify-content:space-between;align-items:center}
.m17sum{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.m17sum div{background:#fff;padding:10px 8px;text-align:center}.m17sum span{display:block;font-size:10.5px;color:var(--muted);font-weight:700}.m17sum b{font:800 15px "Inter",sans-serif;display:block;margin-top:3px}
.m17t{width:100%;border-collapse:collapse;font-size:12px}
.m17t th{background:#F3F7FD;color:var(--muted);font-size:10.5px;padding:8px 6px;text-align:right;font-weight:800}
.m17t td{padding:9px 6px;border-top:1px solid var(--line);vertical-align:middle}
.m17t .num{font-family:"Inter",sans-serif;font-weight:700;white-space:nowrap}
.m17d{display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle;margin-inline-end:5px}
.m17k{display:flex;gap:10px;flex-wrap:wrap;padding:8px 12px;font-size:10.5px;color:var(--muted);font-weight:700;border-top:1px solid var(--line)}
.m17more{width:100%;border:0;border-top:1px solid var(--line);background:#fff;color:var(--navy);font:800 12px inherit;font-family:inherit;padding:11px;cursor:pointer}
`;document.head.appendChild(css);
const AOA=r=>r.ccy==='AOA'?Number(r.amount)||0:0;
const sum=a=>a.reduce((s,x)=>s+AOA(x),0);
const days=d=>Math.max(0,Math.floor((Date.now()-(d&&d.getTime()||0))/864e5));
const ageC=n=>n<=1?'#B00020':n<=7?'#ED6C02':n<=30?'#E6B800':'#1E63D6';
const ageL=n=>n<=1?'يوم — عاجل':n<=7?'أسبوع — متابعة':n<=30?'شهر — تنبيه':'قديم';
const fx=v=>{v=Number(v)||0;return v>=1e6?(v/1e6).toFixed(2).replace(/\.?0+$/,'')+'M':v>=1e3?(v/1e3).toFixed(1).replace(/\.0$/,'')+'K':fmt(v,0);};

/* ───── قبل المطابقة: حدّ «إلى» للفترة المخصصة ───── */
function pre(M){
  if(M.range==='custom'&&M.cTo){const to=new Date(M.cTo);to.setHours(23,59,59,999);const t=to.getTime();
    M.cust=M.cust.filter(r=>!r.date||r.date.getTime()<=t);M.sup=M.sup.filter(r=>!r.date||r.date.getTime()<=t);}
}

/* ───── بعد العرض ───── */
function post(M){
  const m=q('#m13');if(!m)return;
  /* الفترة */
  q('#m13rng').innerHTML=[['today','يومي'],['7d','أسبوعي'],['30d','شهري'],['all','الكل'],['custom','مخصص']].map(x=>'<button class="'+(M.range===x[0]?'on':'')+'" onclick="m17.range(\''+x[0]+'\')">'+x[1]+'</button>').join('');
  let cus=q('#m17cus');if(!cus){cus=document.createElement('div');cus.id='m17cus';cus.className='m17cus';q('#m13rng').parentNode.insertAdjacentElement('afterend',cus);}
  cus.style.display=M.range==='custom'?'':'none';
  if(M.range==='custom')cus.innerHTML='<span>من</span><input type="date" id="m17f" value="'+(M.cFrom||'')+'"><span>إلى</span><input type="date" id="m17t" value="'+(M.cTo||'')+'"><button class="m17tools" style="border:1px solid var(--navy);background:var(--navy);color:#fff;padding:7px 10px;font-weight:800;font-family:inherit" onclick="m17.custom()">تطبيق</button>';
  /* الأرقام */
  const C=M.cust,S=M.sup;
  const def=C.filter(r=>!r.matched),exc=S.filter(r=>!r.matched),ok=C.filter(r=>r.matched);
  const vD=sum(def),vE=sum(exc),vO=sum(ok),tot=vD+vE+vO,net=vE-vD;
  /* الدائرة */
  let h=q('#m17h');if(!h){h=document.createElement('div');h.id='m17h';h.className='m17h';q('#m13st').insertAdjacentElement('beforebegin',h);}
  const R=60,Cc=2*Math.PI*R;let off=0;
  const arc=(v,col)=>{if(!tot||!v)return '';const p=v/tot,d=p*Cc;const s='<circle cx="75" cy="75" r="'+R+'" fill="none" stroke="'+col+'" stroke-width="12" stroke-dasharray="'+d+' '+Cc+'" stroke-dashoffset="'+(-off)+'"/>';off+=d;return s;};
  const center=!tot?'<b>—</b><small>لا بيانات</small>':Math.abs(net)<1?'<b style="color:#7FD0FF">✓ متوازن</b><small>لا فروقات</small>':
    '<b style="color:'+(net>0?'#5CE0A3':'#FF7A8A')+'">'+(net>0?'↑ ':'↓ ')+fx(Math.abs(net))+'</b><small>'+(net>0?'فائض من الموردين':'نقص — بانتظار الموردين')+' · AOA</small>';
  h.innerHTML='<div class="m17g" onclick="m17.only()" title="عرض غير المطابَق"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="'+R+'" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="12"/>'+arc(vD,'#FF4D6D')+arc(vE,'#2ECC8A')+arc(vO,'#4F8BFF')+'</svg><div class="m17c">'+center+'</div></div>'+
    '<div class="m17l"><div><span><i style="background:#FF4D6D"></i>نقص من الموردين · '+def.length+'</span><b>'+fx(vD)+'</b></div>'+
    '<div><span><i style="background:#2ECC8A"></i>فائض إيصالات موردين · '+exc.length+'</span><b>'+fx(vE)+'</b></div>'+
    '<div><span><i style="background:#4F8BFF"></i>مطابَق · '+ok.length+'</span><b>'+fx(vO)+'</b></div>'+
    '<div style="background:rgba(212,175,55,.18)"><span>صافي الفرق</span><b style="color:#D4AF37">'+(net>=0?'+':'−')+fx(Math.abs(net))+' AOA</b></div></div>';
  /* أدوات */
  let tl=q('#m17tools');if(!tl){tl=document.createElement('div');tl.id='m17tools';tl.className='m17tools';h.insertAdjacentElement('afterend',tl);}
  tl.innerHTML='<button class="'+(K.link?'on':'')+'" onclick="m17.linkMode()">'+(K.link?'إنهاء الربط اليدوي':'ربط يدوي ١:١')+'</button>'+
    '<button class="'+(K.only?'on':'')+'" onclick="m17.only()">'+(K.only?'عرض الكل':'غير المطابَق فقط')+'</button>'+
    '<button onclick="m17.scroll(\'m17rep\')">تقرير الفترة</button>';
  q('#m13cols').classList.toggle('m17only',K.only);q('#m13cols').classList.toggle('m17link',K.link);
  /* التقرير */
  let rep=q('#m17rep');if(!rep){rep=document.createElement('div');rep.id='m17rep';rep.className='m17rep';q('#m13cmp').insertAdjacentElement('afterend',rep);}
  const rows=def.map(r=>({r,side:'زبون',kind:'نقص',v:-AOA(r),c:'#B00020'})).concat(exc.map(r=>({r,side:'مورد',kind:'فائض',v:AOA(r),c:'#2E7D32'}))).sort((a,b)=>days(b.r.date)-days(a.r.date)||Math.abs(b.v)-Math.abs(a.v));
  const show=K.more?rows:rows.slice(0,30);
  const lbl={today:'اليوم','7d':'آخر ٧ أيام','30d':'آخر ٣٠ يومًا',all:'كل الفترة',custom:(M.cFrom||'…')+' → '+(M.cTo||'…')}[M.range]||'';
  rep.innerHTML='<h4><span>تقرير الفروقات — '+lbl+'</span><span class="num" style="font-size:11px;color:var(--muted)">'+rows.length+' بند</span></h4>'+
    '<div class="m17sum"><div><span>إجمالي النقص (موردون)</span><b style="color:#B00020">'+fmt(vD,0)+'</b></div><div><span>إجمالي الفائض (موردون)</span><b style="color:#2E7D32">'+fmt(vE,0)+'</b></div><div><span>صافي الرصيد</span><b style="color:'+(net>=0?'#2E7D32':'#B00020')+'">'+(net>=0?'+':'−')+fmt(Math.abs(net),0)+'</b></div></div>'+
    (rows.length?'<div style="overflow:auto"><table class="m17t"><thead><tr><th>الحالة</th><th>التاريخ</th><th>النوع</th><th>الجهة</th><th>المبلغ</th><th>الفرق</th></tr></thead><tbody>'+
      show.map(x=>{const n=days(x.r.date),c=x.kind==='نقص'?ageC(n):'#1E63D6';return '<tr onclick="m17.open(\''+x.r.id+'\')" style="cursor:pointer"><td><span class="m17d" style="background:'+c+'"></span><span style="font-size:10.5px;font-weight:800;color:'+c+'">'+(x.kind==='نقص'?ageL(n):'فائض')+'</span></td><td class="num">'+x.r.date.toLocaleDateString('en-GB')+'</td><td style="color:'+x.c+';font-weight:800">'+x.side+'</td><td style="font-weight:700">'+esc(x.r.who||'—')+'</td><td class="num">'+fmt(x.r.amount,0)+' '+esc(x.r.ccy)+'</td><td class="num" style="color:'+x.c+'">'+(x.v>0?'+':'−')+fmt(Math.abs(x.v),0)+'</td></tr>';}).join('')+
      '</tbody></table></div>'+(rows.length>30?'<button class="m17more" onclick="m17.more()">'+(K.more?'عرض أقل':'عرض الكل ('+rows.length+')')+'</button>':'')
    :'<div class="empty" style="padding:16px">لا فروقات في هذه الفترة — كل الإيصالات متطابقة</div>')+
    '<div class="m17k"><span><span class="m17d" style="background:#B00020"></span>نقص منذ يوم</span><span><span class="m17d" style="background:#ED6C02"></span>منذ أسبوع</span><span><span class="m17d" style="background:#E6B800"></span>منذ شهر</span><span><span class="m17d" style="background:#1E63D6"></span>فائض مورد</span></div>';
  paintSel(M);bar(M);
}

/* ───── الربط اليدوي ───── */
function findRow(M,id){return M.cust.find(x=>x.id===id)||M.sup.find(x=>x.id===id)||null;}
function paintSel(M){document.querySelectorAll('#m13cols .m13r').forEach(el=>{const id=(el.getAttribute('onclick')||'').match(/toggle\('([^']+)'\)/);el.classList.toggle('m17sel',!!(id&&(id[1]===K.selC||id[1]===K.selS)));});}
document.addEventListener('click',function(e){
  if(!K.link)return;const el=e.target.closest('#m13cols .m13r');if(!el)return;
  if(e.target.closest('button'))return;
  e.stopPropagation();e.preventDefault();
  const M=window.m13&&m13._M;if(!M)return;const mt=(el.getAttribute('onclick')||'').match(/toggle\('([^']+)'\)/);if(!mt)return;
  const r=findRow(M,mt[1]);if(!r)return;
  const isC=M.cust.includes(r);
  if(isC)K.selC=K.selC===r.id?null:r.id;else K.selS=K.selS===r.id?null:r.id;
  paintSel(M);bar(M);
},true);
function bar(M){
  let b=q('#m17bar');
  if(!K.link||(!K.selC&&!K.selS)){if(b)b.remove();return;}
  if(!b){b=document.createElement('div');b.id='m17bar';b.className='m17bar';document.body.appendChild(b);}
  const c=K.selC&&findRow(M,K.selC),s=K.selS&&findRow(M,K.selS);
  if(c&&s){
    const dA=AOA(s)-AOA(c),dD=Math.abs(days(s.date)-days(c.date)),pct=Math.max(0,100-Math.abs(dA)/Math.max(AOA(c),AOA(s),1)*100);
    b.innerHTML='<div class="h">'+esc(c.who||'زبون')+' ⇄ '+esc(s.who||'مورد')+'</div><div class="r"><div><span>فرق المبلغ</span><b style="color:'+(Math.abs(dA)<1?'#5CE0A3':dA>0?'#5CE0A3':'#FF7A8A')+'">'+(dA>=0?'+':'−')+fmt(Math.abs(dA),0)+'</b></div><div><span>فرق الأيام</span><b>'+dD+'</b></div><div><span>نسبة التطابق</span><b style="color:#D4AF37">'+pct.toFixed(1)+'%</b></div></div>'+
      '<div class="a"><button onclick="m17.link()">ربط الإيصالين ✓</button><button class="g" onclick="m17.clear()">إلغاء</button></div>';
  }else{
    const r=c||s;const linked=r&&r.matched&&r.how==='stored'||(s&&s.matched&&s.matched.how==='stored');
    b.innerHTML='<div class="h">'+esc(r.who||'—')+' · '+fmt(r.amount,0)+' '+esc(r.ccy)+(r.matched?' — مرتبط بـ '+esc(r.matched.who||'')+' ('+fmt(r.matched.amount,0)+')':'')+'</div>'+
      '<div class="a">'+(r.matched?'<button class="d" onclick="m17.unlink(\''+r.id+'\')">فك الربط</button>':'<button class="g" disabled>اختر الطرف الآخر ('+(c?'إيصال مورد':'إيصال زبون')+')</button>')+'<button class="g" onclick="m17.clear()">إلغاء</button></div>';
  }
}
async function link(){
  const M=m13._M,c=findRow(M,K.selC),s=findRow(M,K.selS);if(!c||!s)return;
  if(c.matched||s.matched){if(!confirm('أحد الإيصالين مرتبط بالفعل. فكّ الربط القديم واربط الجديد؟'))return;
    if(c.matched)await unlinkPair(c);if(s.matched)await unlinkPair(s);}
  let n=0;const now=new Date().toISOString();
  try{
    if(c.rid){const o=Object.assign({},c.ocr,{matched_rcpt:s.rid||s.oid,matched_at:now,matched_how:'manual'});
      if((await fetch(SB+'/bdl_receipts?id=eq.'+c.rid,{method:'PATCH',headers:H(),body:JSON.stringify({ocr:o})})).ok)n++;}
    else if(c.oid){if((await fetch(SB+'/bdl_op_receipts?id=eq.'+c.oid,{method:'PATCH',headers:H(),body:JSON.stringify({match_txn:s.ref||('rc:'+(s.rid||s.oid))})})).ok)n++;}
    if(s.rid){const o2=Object.assign({},s.ocr,{covers:c.rid||c.ref||c.oid,matched_at:now,matched_how:'manual'});
      await fetch(SB+'/bdl_receipts?id=eq.'+s.rid,{method:'PATCH',headers:H(),body:JSON.stringify({ocr:o2})});}
    else if(s.oid&&c.ref){await fetch(SB+'/bdl_op_receipts?id=eq.'+s.oid,{method:'PATCH',headers:H(),body:JSON.stringify({match_txn:c.ref})});}
  }catch(e){}
  toast(n?'رُبط الإيصالان ✓':'تعذّر الربط');K.selC=K.selS=null;m13._load();
}
async function unlinkPair(r){
  const o=r.matched;if(!o)return;
  const pr=[];
  [r,o].forEach(x=>{
    if(x.rid){const oc=Object.assign({},x.ocr);delete oc.matched_rcpt;delete oc.covers;delete oc.matched_how;oc.unlinked_at=new Date().toISOString();
      pr.push(fetch(SB+'/bdl_receipts?id=eq.'+x.rid,{method:'PATCH',headers:H(),body:JSON.stringify({ocr:oc})}));}
    else if(x.oid)pr.push(fetch(SB+'/bdl_op_receipts?id=eq.'+x.oid,{method:'PATCH',headers:H(),body:JSON.stringify({match_txn:null})}));
  });
  await Promise.all(pr);
}
async function unlink(id){
  const M=m13._M,r=findRow(M,id);if(!r||!r.matched)return;
  if(!confirm('فك ربط هذا الإيصال عن '+(r.matched.who||'الطرف الآخر')+'؟'))return;
  await unlinkPair(r);toast('فُكّ الربط ✓');K.selC=K.selS=null;m13._load();
}

window.m17={pre,post,
  range:r=>{const M=m13._M;M.range=r;M.open={};if(r==='custom'){if(!M.cFrom){const d=new Date();M.cTo=d.toISOString().slice(0,10);d.setDate(d.getDate()-6);M.cFrom=d.toISOString().slice(0,10);}}m13._load();},
  custom:()=>{const M=m13._M;M.cFrom=q('#m17f').value||M.cFrom;M.cTo=q('#m17t').value||M.cTo;M.range='custom';m13._load();},
  only:()=>{K.only=!K.only;m13._render();if(K.only)m17.scroll('m13cols');},
  linkMode:()=>{K.link=!K.link;K.selC=K.selS=null;m13._render();toast(K.link?'اختر إيصال زبون ثم إيصال مورد':'انتهى وضع الربط');},
  clear:()=>{K.selC=K.selS=null;m13._render();},
  link,unlink,
  more:()=>{K.more=!K.more;m13._render();},
  open:id=>{const M=m13._M;K.only=false;M.open[id]=true;m13._render();setTimeout(()=>{const el=document.querySelector('#m13cols .m13r.open');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});},50);},
  scroll:id=>{const el=q('#'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
};
console.log('bdl-ops17: لوحة الفروقات جاهزة ✓');
})();
