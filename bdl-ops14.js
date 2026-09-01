/* ═══════════════════════════════════════════════════════════════════
   bdl-ops14.js — سجل العملاء الموحّد (Build 1153) — طبقة فوق تبويب «العملاء»
   • هوية العميل = رقم الهاتف. يجمع bdl_customers (هوية التحويلات) + bdl_parties + أسماء bdl_ops
     في كيان واحد لكل رقم، ويعرض عدد عمليات التحويل (مسوّاة/مفتوحة) وعمليات المطابقة معًا.
   • يكشف المكررات (نفس الهاتف، أو أسماء متقاربة) ويعرض «دمج» بضغطة: RPC bdl_customer_merge
     (بديل من الجهاز إن لم يُلصق SQL) + تصحيح client_name في bdl_ops وحذف الاسم المكرر من bdl_parties.
   • تعديل الاسم/الهاتف. تحديث حي بعد كل تحويل (Realtime عبر ops10 + اعتراض الكتابة).
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
(function(){
const q=s=>document.querySelector(s);
const U={cust:[],parties:[],ops:[],txAgg:{},ids:[],loaded:false,busy:false,open:{}};
const normP=v=>{let d=String(v||'').replace(/\D/g,'').replace(/^00/,'');if(d.length===8&&/^[234]/.test(d))d='222'+d;if(d.length===9&&/^9/.test(d))d='244'+d;return d;};
const key8=v=>{const d=normP(v);return d.length>=8?d.slice(-8):'';};
const normN=v=>String(v||'').toLowerCase().replace(/[^a-z\u0600-\u06FF0-9 ]/g,'').replace(/\s+/g,' ').trim();
const phoneLike=v=>/^[+\d][\d\s\-().]{6,}$/.test(String(v||'').trim());
function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m||!n)return m+n;let prev=[...Array(n+1).keys()];for(let i=1;i<=m;i++){const cur=[i];for(let j=1;j<=n;j++)cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}return prev[n];}
const similar=(a,b)=>{a=normN(a);b=normN(b);if(!a||!b)return false;if(a===b)return true;if(a.length>=8&&b.length>=8&&(a.startsWith(b)||b.startsWith(a)))return true;return lev(a,b)<=Math.max(1,Math.floor(Math.min(a.length,b.length)*0.15));};

const css=document.createElement('style');css.textContent=`
#clientList .u14{background:#fff;border:1px solid #D7E2F2;padding:13px 15px;margin-bottom:8px;animation:u14in .3s ease both}
@keyframes u14in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.u14 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.u14 .nm{font-size:14.5px;font-weight:800;color:var(--navy)}
.u14 .tag{font-size:10px;font-weight:800;padding:2px 7px;margin-inline-start:7px;border:1px solid #C9DFFA;color:#0A56B8}
.u14 .tag.s{border-color:#E9CE9C;color:#7A4A00}
.u14 .ph{font:600 12px "Inter",sans-serif;color:var(--muted);margin-top:2px;direction:ltr;text-align:right}
.u14 .ph.none{color:#B7791F;font-family:inherit}
.u14 .al{font-size:11px;color:var(--muted);margin-top:3px}
.u14 .al b{color:#7A4A00}
.u14 .cnt{text-align:left;direction:ltr;white-space:nowrap}
.u14 .cnt b{display:block;font:800 18px "Inter",sans-serif;color:#0B7A3B;line-height:1}
.u14 .cnt span{font-size:10.5px;color:var(--muted)}
.u14 .dup{margin-top:9px;background:#FFF9E8;border:1px solid #EAD48A;padding:8px 10px;font-size:11.5px;color:#8A6100;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.u14 .dup button{border:0;background:#B7791F;color:#fff;font-weight:800;font-size:11.5px;padding:7px 12px;font-family:inherit;cursor:pointer}
.u14 .act{display:flex;gap:6px;margin-top:9px}
.u14 .act button{border:1px solid #C9DFFA;background:#F2F8FF;color:#0A56B8;font-weight:800;font-size:11px;padding:7px 10px;font-family:inherit;cursor:pointer}
.u14 .act button.del{border-color:#F5B5B0;background:#FFF5F5;color:#B00020}
.u14sum{display:flex;justify-content:space-between;align-items:center;padding:6px 4px 8px;font-size:11.5px;color:var(--muted)}
.u14sum b{color:var(--navy);font-family:"Inter",sans-serif}
.u14sum .live{display:flex;align-items:center;gap:5px}
.u14sum .live i{width:7px;height:7px;background:#22D18C;display:inline-block;border-radius:50%!important}
.u14sheet .f{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}.u14sheet label{font-size:11px;color:var(--muted);font-weight:700}
.u14sheet input{border:1px solid var(--line);padding:10px 11px;font-size:13.5px;font-family:inherit;background:#fff;color:var(--ink)}
.u14sheet .act{display:flex;gap:8px;margin-top:12px}.u14sheet .act button{flex:1;border:0;padding:12px;font-weight:800;font-size:13px;font-family:inherit;cursor:pointer;background:var(--navy);color:#fff}
.u14sheet .act button.ghost{background:#fff;color:var(--navy);border:1px solid #D6E4F7}
`;document.head.appendChild(css);
function ensureSheet(){if(!q('#ovl-u14')){document.body.insertAdjacentHTML('beforeend','<div class="ovl" id="ovl-u14"><div class="sheet u14sheet" id="u14sb"></div></div>');q('#ovl-u14').addEventListener('click',e=>{if(e.target.id==='ovl-u14')closeOvl('u14');});}}
const sheet=h=>{ensureSheet();q('#u14sb').innerHTML=h;openOvl('u14');};

/* ───── التحميل ───── */
async function load(){
  if(U.busy)return;U.busy=true;
  try{
    const [a,b,c,d]=await Promise.all([
      fetch(SB+'/bdl_customers?select=id,name,phone,created_at&order=created_at.asc&limit=1000',{headers:H()}),
      fetch(SB+'/bdl_parties?select=id,kind,name,phone&limit=800',{headers:H()}),
      fetch(SB+'/bdl_ops?select=id,client_name,supplier,status&order=created_at.desc&limit=1000',{headers:H()}),
      fetch(SB+'/bdl_transactions?select=customer_id,status,amount,ccy&limit=3000',{headers:H()})]);
    U.cust=a.ok?await a.json():[];U.parties=b.ok?await b.json():[];U.ops=c.ok?await c.json():[];
    const agg={};(d.ok?await d.json():[]).forEach(t=>{const g=agg[t.customer_id]=agg[t.customer_id]||{n:0,done:0,open:0,vol:{}};g.n++;if(t.status==='done'||t.status==='settled')g.done++;else g.open++;g.vol[t.ccy]=(g.vol[t.ccy]||0)+Number(t.amount||0);});U.txAgg=agg;
  }catch(e){}
  U.loaded=true;U.busy=false;render();
}
/* ───── بناء الهويات ───── */
function identities(){
  const ids=[];const byKey={};
  const push=(rec)=>{ /* rec: {name,phone,kind,cust?,party?} */
    const k=key8(rec.phone);let id=k?byKey['p:'+k]:null;
    if(!id){ /* بالاسم إن لم يوجد هاتف مشترك */
      id=ids.find(x=>x.kind===rec.kind&&(x.names.some(n=>similar(n,rec.name))));
      if(id&&k&&id.key8&&id.key8!==k)id=null; /* هاتفان مختلفان = شخصان */ }
    if(!id){id={kind:rec.kind,names:[],phones:[],custs:[],parties:[],key8:k||'',ops:{n:0,open:0},tx:{n:0,done:0,open:0,vol:{}},dupNames:false};ids.push(id);}
    if(k&&!id.key8){id.key8=k;}if(k)byKey['p:'+k]=id;
    if(rec.name&&!id.names.some(n=>normN(n)===normN(rec.name)))id.names.push(rec.name);
    const pn=normP(rec.phone);if(pn&&!id.phones.includes(pn))id.phones.push(pn);
    if(rec.cust)id.custs.push(rec.cust);if(rec.party)id.parties.push(rec.party);return id;};
  U.cust.forEach(c=>push({name:c.name,phone:c.phone,kind:'client',cust:c}));
  U.parties.forEach(p=>push({name:p.name,phone:p.phone,kind:p.kind,party:p}));
  const opsC={},opsS={};U.ops.forEach(o=>{const c=String(o.client_name||'').trim(),s=String(o.supplier||'').trim();
    if(c){(opsC[c]=opsC[c]||{n:0,open:0}).n++;if(o.status!=='closed')opsC[c].open++;}if(s){(opsS[s]=opsS[s]||{n:0,open:0}).n++;if(o.status!=='closed')opsS[s].open++;}});
  Object.keys(opsC).forEach(n=>{const id=push({name:n,phone:'',kind:'client'});id.ops.n+=opsC[n].n;id.ops.open+=opsC[n].open;});
  Object.keys(opsS).forEach(n=>{const id=push({name:n,phone:'',kind:'supplier'});id.ops.n+=opsS[n].n;id.ops.open+=opsS[n].open;});
  ids.forEach(id=>{id.custs.forEach(c=>{const g=U.txAgg[c.id];if(g){id.tx.n+=g.n;id.tx.done+=g.done;id.tx.open+=g.open;Object.keys(g.vol).forEach(k=>id.tx.vol[k]=(id.tx.vol[k]||0)+g.vol[k]);}});
    /* الاسم القانوني: اسم الزبون صاحب أكثر تحويلات، وإلا الأطول غير الهاتفي */
    const named=id.custs.filter(c=>c.name&&!phoneLike(c.name)).sort((a,b)=>((U.txAgg[b.id]||{}).n||0)-((U.txAgg[a.id]||{}).n||0));
    id.name=(named[0]&&named[0].name)||id.names.filter(n=>!phoneLike(n)).sort((a,b)=>b.length-a.length)[0]||id.names[0]||'—';
    id.phone=id.phones[0]||'';id.aliases=id.names.filter(n=>normN(n)!==normN(id.name));
    id.dup=id.custs.length>1||id.aliases.length>0||id.parties.length>1;id.total=id.tx.n+id.ops.n;
    id.keep=named[0]||id.custs[0]||null;});
  /* مكررات محتملة بين هويات بلا هاتف مشترك */
  ids.forEach((a,i)=>{a.maybe=[];ids.forEach((b,j)=>{if(i!==j&&a.kind===b.kind&&(!a.key8||!b.key8||a.key8===b.key8)&&a.names.some(x=>b.names.some(y=>similar(x,y))))a.maybe.push(j);});});
  return ids;
}
/* ───── العرض ───── */
function render(){
  const list=q('#clientList');if(!list||!U.loaded)return;
  const s=((q('#cq')||{}).value||'').trim().toLowerCase();
  const ids=identities();U.ids=ids;
  const rows=ids.map((x,i)=>Object.assign(x,{i})).filter(x=>(C_VIEW==='all'||x.kind===C_VIEW)&&(!s||(x.names.join(' ')+' '+x.phones.join(' ')).toLowerCase().indexOf(s)>=0)).sort((a,b)=>b.total-a.total);
  const dups=ids.filter(x=>x.dup||x.maybe.length).length;
  list.innerHTML='<div class="u14sum"><span><b>'+rows.length+'</b> عميل · <b>'+ids.filter(x=>x.phone).length+'</b> بهاتف'+(dups?' · <b style="color:#B7791F">'+dups+'</b> بحاجة إلى دمج':'')+'</span><span class="live"><i></i>يتحدث مباشرة</span></div>'+
    (rows.map(card).join('')||'<div class="empty">لا عملاء'+(s?' مطابقون':'')+'</div>');
}
function card(x){
  const tag=x.kind==='client'?'<span class="tag">زبون</span>':'<span class="tag s">مورد</span>';
  const vol=Object.keys(x.tx.vol).map(c=>fmt(x.tx.vol[c],0)+' '+c).join(' · ');
  const dupTxt=[];if(x.custs.length>1)dupTxt.push(x.custs.length+' سجلات بنفس الهاتف');if(x.aliases.length)dupTxt.push('أسماء أخرى: <b>'+x.aliases.map(esc).join('، ')+'</b>');
  const maybe=x.maybe.map(j=>U.ids[j]).filter(Boolean);
  return '<div class="u14"><div class="top"><div><div class="nm">'+esc(x.name)+tag+'</div>'+
    (x.phone?'<div class="ph">'+esc(x.phone)+(x.phones.length>1?' +'+(x.phones.length-1):'')+'</div>':'<div class="ph none">بلا هاتف — أضفه ليتوحّد سجله</div>')+
    '<div class="al">'+(x.tx.n?'<span class="num">'+x.tx.n+'</span> تحويل ('+x.tx.done+' مسوّى · '+x.tx.open+' مفتوح)':'')+(x.ops.n?(x.tx.n?' · ':'')+'<span class="num">'+x.ops.n+'</span> عملية مطابقة'+(x.ops.open?' ('+x.ops.open+' مفتوحة)':''):'')+(!x.total?'بلا عمليات':'')+(vol?' · '+vol:'')+'</div></div>'+
    '<div class="cnt"><b>'+x.total+'</b><span>عملية</span></div></div>'+
    (dupTxt.length?'<div class="dup"><span>'+dupTxt.join(' · ')+'</span><button onclick="u14.merge('+x.i+')">دمج في «'+esc(x.name)+'»</button></div>':'')+
    maybe.map(m=>'<div class="dup"><span>مكرر محتمل: <b>'+esc(m.name)+'</b>'+(m.phone?' · '+esc(m.phone):' · بلا هاتف')+' ('+m.total+' عملية)</span><button onclick="u14.mergeWith('+x.i+','+m.i+')">دمج معه</button></div>').join('')+
    '<div class="act"><button onclick="u14.edit('+x.i+')">تعديل</button>'+(!x.total&&x.custs.length<=1?'<button class="del" onclick="u14.del('+x.i+')">حذف</button>':'')+'</div></div>';
}
/* ───── الدمج ───── */
async function mergeCust(keep,drop,name,phone){
  const r=await fetch(SB+'/rpc/bdl_customer_merge',{method:'POST',headers:H(),body:JSON.stringify({p_keep:keep,p_drop:drop,p_name:name||null,p_phone:phone||null})});
  if(r.ok)return true;
  if(r.status!==404)throw new Error((await r.text()).slice(0,120));
  /* بديل الجهاز */
  let x=await fetch(SB+'/bdl_transactions?customer_id=eq.'+drop,{method:'PATCH',headers:H(),body:JSON.stringify({customer_id:keep})});if(!x.ok)throw new Error('tx '+x.status);
  await fetch(SB+'/bdl_accounts?customer_id=eq.'+drop,{method:'PATCH',headers:H(),body:JSON.stringify({customer_id:keep})}).catch(()=>{});
  x=await fetch(SB+'/bdl_customers?id=eq.'+drop,{method:'DELETE',headers:H()});if(!x.ok)throw new Error('del '+x.status);
  const body={};if(name)body.name=name;if(phone)body.phone=phone;if(Object.keys(body).length)await fetch(SB+'/bdl_customers?id=eq.'+keep,{method:'PATCH',headers:H(),body:JSON.stringify(body)});
  return true;
}
async function unify(x,extraNames,extraParties,extraCusts){
  const names=[...new Set([].concat(x.names,extraNames||[]))],keep=x.keep,phone=x.phone;
  let n=0;
  /* ١) سجلات bdl_customers → واحد */
  for(const c of [].concat(x.custs,extraCusts||[])){if(!keep||c.id===keep.id)continue;await mergeCust(keep.id,c.id,x.name,phone);n++;}
  if(keep){const body={};if(keep.name!==x.name)body.name=x.name;if(phone&&normP(keep.phone)!==phone)body.phone=phone;if(Object.keys(body).length)await fetch(SB+'/bdl_customers?id=eq.'+keep.id,{method:'PATCH',headers:H(),body:JSON.stringify(body)});}
  /* ٢) أسماء bdl_ops → الاسم القانوني */
  for(const a of names){if(normN(a)===normN(x.name))continue;
    const col=x.kind==='client'?'client_name':'supplier';
    await fetch(SB+'/bdl_ops?'+col+'=eq.'+encodeURIComponent(a),{method:'PATCH',headers:H(),body:JSON.stringify({[col]:x.name})}).catch(()=>{});
    await fetch(SB+'/bdl_parties?kind=eq.'+x.kind+'&name=eq.'+encodeURIComponent(a),{method:'DELETE',headers:H()}).catch(()=>{});}
  /* ٣) سجل الأطراف: صف واحد بالاسم القانوني والهاتف */
  const ps=[].concat(x.parties,extraParties||[]),main=ps.find(p=>normN(p.name)===normN(x.name));
  if(main){if(phone&&normP(main.phone)!==phone)await fetch(SB+'/bdl_parties?id=eq.'+main.id,{method:'PATCH',headers:H(),body:JSON.stringify({phone})}).catch(()=>{});}
  else await fetch(SB+'/bdl_parties',{method:'POST',headers:H({Prefer:'resolution=merge-duplicates'}),body:JSON.stringify({kind:x.kind,name:x.name,phone:phone||''})}).catch(()=>{});
  for(const p of ps){if(main&&p.id===main.id)continue;if(normN(p.name)===normN(x.name))await fetch(SB+'/bdl_parties?id=eq.'+p.id,{method:'DELETE',headers:H()}).catch(()=>{});}
  return n;
}
window.u14={
  merge:async i=>{const x=U.ids[i];if(!x)return;if(!confirm('دمج كل سجلات «'+x.name+'» في هوية واحدة؟\n\nالهاتف: '+(x.phone||'—')+'\nالأسماء: '+x.names.join('، ')+'\n\nتُنقل كل التحويلات والعمليات إليه ولا يُحذف أي منها.'))return;
    try{await unify(x);toast('دُمجت السجلات ✓');OPS_DATA=null;PARTIES=null;CLIENTS=null;await load();}catch(e){toast('تعذّر الدمج: '+e.message);}},
  mergeWith:async(i,j)=>{const a=U.ids[i],b=U.ids[j];if(!a||!b)return;
    const keepA=a.total>=b.total;const x=keepA?a:b,y=keepA?b:a;
    if(!confirm('دمج «'+y.name+'» في «'+x.name+'»؟\n\nيبقى الاسم: '+x.name+'\nالهاتف: '+(x.phone||y.phone||'—')+'\nتُنقل '+y.total+' عملية.'))return;
    try{if(!x.phone&&y.phone){x.phone=y.phone;}x.names=[...new Set(x.names.concat(y.names))];
      await unify(x,y.names,y.parties,y.custs);toast('دُمج ✓');OPS_DATA=null;PARTIES=null;CLIENTS=null;await load();}catch(e){toast('تعذّر الدمج: '+e.message);}},
  edit:i=>{const x=U.ids[i];if(!x)return;
    sheet('<h3><span>تعديل العميل</span><button onclick="closeOvl(\'u14\')">إغلاق</button></h3>'+
      '<div class="f"><label>الاسم</label><input id="u14n" value="'+esc(x.name)+'"></div><div class="f"><label>الهاتف (هوية العميل)</label><input id="u14p" class="num" inputmode="tel" value="'+esc(x.phone)+'" placeholder="222… / 244…"></div>'+
      (x.aliases.length?'<div style="font-size:11.5px;color:var(--muted)">أسماء أخرى ستُدمج في هذا الاسم: '+x.aliases.map(esc).join('، ')+'</div>':'')+
      '<div class="act"><button onclick="u14.save('+i+')">حفظ وتوحيد</button><button class="ghost" onclick="closeOvl(\'u14\')">إلغاء</button></div>');},
  save:async i=>{const x=U.ids[i];if(!x)return;const name=q('#u14n').value.trim(),phone=normP(q('#u14p').value);
    if(!name||phoneLike(name)){toast('أدخل اسمًا صحيحًا');return;}
    const old=x.name;x.name=name;if(phone)x.phone=phone;if(!x.names.includes(old))x.names.push(old);
    try{if(!x.keep&&phone){const r=await fetch(SB+'/bdl_customers',{method:'POST',headers:H({Prefer:'return=representation'}),body:JSON.stringify({name,phone})});if(r.ok)x.keep=(await r.json())[0];}
      await unify(x);closeOvl('u14');toast('حُفظ ✓');OPS_DATA=null;PARTIES=null;CLIENTS=null;await load();}catch(e){toast('تعذّر الحفظ: '+e.message);}},
  del:async i=>{const x=U.ids[i];if(!x||x.total)return;if(!confirm('حذف «'+x.name+'» من السجل؟'))return;
    try{for(const p of x.parties)await fetch(SB+'/bdl_parties?id=eq.'+p.id,{method:'DELETE',headers:H()});for(const c of x.custs)await fetch(SB+'/bdl_customers?id=eq.'+c.id,{method:'DELETE',headers:H()});
      toast('حُذف ✓');PARTIES=null;CLIENTS=null;await load();}catch(e){toast('تعذّر الحذف');}},
  reload:()=>load()
};
/* ───── الربط بالتطبيق ───── */
window.renderClients=function(){if(U.loaded)render();};
const LC=window.loadClients;window.loadClients=async function(){if(!U.loaded)q('#clientList').innerHTML='<div class="empty">جارٍ التحميل…</div>';await load();};
const vis=()=>{const v=q('#v-clients');return v&&v.style.display!=='none'&&document.visibilityState==='visible';};
let DEB=null;const bump=()=>{clearTimeout(DEB);DEB=setTimeout(()=>{if(vis())load();else U.loaded=false;},900);};
window.addEventListener('bdl:change',bump);
const F=window.fetch;window.fetch=function(u,o){const p=F.apply(this,arguments);
  try{const url=String(u&&u.url||u),m=((o&&o.method)||'GET').toUpperCase();if(m!=='GET'&&/bdl_customers|bdl_parties|bdl_ops\b|bdl_ops\?|bdl_transactions|log-transfer/.test(url)&&!/bdl_customer_merge/.test(url)&&!U.busy)p.then(bump,()=>{});}catch(e){}return p;};
setInterval(()=>{if(vis()&&!U.busy)load();},30000);
document.addEventListener('visibilitychange',()=>{if(vis()&&!U.busy)load();});
console.log('bdl-ops14: سجل العملاء الموحّد جاهز ✓');
})();
