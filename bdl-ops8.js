/* ═══════════════════════════════════════════════════════════════════
   bdl-ops8.js — «دفاتر النقد» بنمط CashBook (طبقة إضافية فوق settle-v2)
   ١) دفتر مستقل لكل طرف: رصيد ملوّن لكل عملة + آخر نشاط + ترتيب تلقائي
   ٢) رصيد جارٍ Running Balance لكل قيد — يحسم أي خلاف مع العميل
   ٣) إدخال سريع: قبض 🟢 / دفع 🔴 بمبلغ وعملة وملاحظة وتاريخ
   ٤) قائمة الدفتر: كشف حساب PDF، إعادة تسمية، تكرار، حذف
   ٥) متعدد العملات (تفوّق على CashBook): AOA/MRU/USD/EUR/CNY/USDT/AED
   يُحمَّل بعد bdl-ops7.js — لا يمس أي شيء قائم.
   يتطلب لصق bdl-ops8.sql مرة واحدة في Supabase (يعرض تنبيهًا قبلها).
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
(function(){
if(typeof go!=='function'||typeof H!=='function'){console.warn('ops8: settle-v2 غير محمّل');return;}

var BOOKS=null, BK=null, BK_EN=[], BK_CCY='ALL', OPS8_SQL=true;
var CCYS=['AOA','MRU','USD','EUR','CNY','USDT','AED'];
var GOOD='#0B7A3B', BAD='#B00020', NAVY='#0B2F70', MUT='#5C7699';

/* ─────────── الأنماط ─────────── */
var st=document.createElement('style');
st.textContent=
'#v-books .bk8card{background:#fff;border:1px solid #D7E2F2;padding:13px 15px;margin-bottom:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px}'+
'#v-books .bk8card:active{box-shadow:0 4px 18px rgba(10,86,184,.18)}'+
'.bk8ic{width:40px;height:40px;border-radius:12px;background:#E8F1FF;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}'+
'.bk8nm{font-size:14px;font-weight:800;color:#0B2447}'+
'.bk8ls{font-size:11px;color:'+MUT+';margin-top:3px}'+
'.bk8bal{text-align:left;flex:none}'+
'.bk8bal b{display:block;font-size:13.5px;font-weight:800}'+
'.bk8bal small{font-size:10px;color:'+MUT+'}'+
'.bk8dots{border:0;background:none;font-size:18px;color:'+MUT+';padding:6px;cursor:pointer;flex:none}'+
'.bk8fab{position:fixed;bottom:calc(18px + env(safe-area-inset-bottom));inset-inline-start:16px;z-index:60;'+
 'background:linear-gradient(135deg,#0B2F70,#0A56B8);color:#fff;border:0;border-radius:99px;height:48px;padding:0 20px;'+
 'font-family:inherit;font-size:13.5px;font-weight:800;box-shadow:0 8px 24px rgba(10,86,184,.35);cursor:pointer;display:none}'+
'.bk8ov{position:fixed;inset:0;background:#F4F8FD;z-index:320;display:none;flex-direction:column}'+
'.bk8ov.on{display:flex}'+
'.bk8hd{background:linear-gradient(135deg,#0B2F70,#0A56B8);color:#fff;padding:14px 16px calc(12px);padding-top:calc(14px + env(safe-area-inset-top))}'+
'.bk8hd .r1{display:flex;align-items:center;gap:10px}'+
'.bk8hd .bck{border:0;background:rgba(255,255,255,.15);color:#fff;width:34px;height:34px;border-radius:10px;font-size:16px;cursor:pointer}'+
'.bk8hd .nm{font-size:15px;font-weight:800;flex:1}'+
'.bk8hd .mn{border:0;background:rgba(255,255,255,.15);color:#fff;width:34px;height:34px;border-radius:10px;font-size:17px;cursor:pointer}'+
'.bk8sum{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}'+
'.bk8sum .c{background:rgba(255,255,255,.14);border-radius:12px;padding:7px 12px}'+
'.bk8sum .c small{display:block;font-size:9.5px;opacity:.85}'+
'.bk8sum .c b{font-size:13.5px;font-weight:800}'+
'.bk8chips{display:flex;gap:6px;overflow-x:auto;padding:10px 14px 4px}'+
'.bk8chips button{border:1px solid #D7E2F2;background:#fff;border-radius:99px;height:30px;padding:0 13px;font-family:inherit;font-size:11.5px;font-weight:800;color:'+MUT+';cursor:pointer;flex:none}'+
'.bk8chips button.on{background:'+NAVY+';border-color:'+NAVY+';color:#fff}'+
'.bk8list{flex:1;overflow-y:auto;padding:6px 14px 120px}'+
'.bk8row{background:#fff;border:1px solid #E3ECF7;padding:10px 13px;margin-bottom:7px;cursor:pointer}'+
'.bk8row .t{display:flex;justify-content:space-between;gap:8px}'+
'.bk8row .d{font-size:12.5px;font-weight:700;color:#0B2447}'+
'.bk8row .a{font-size:13.5px;font-weight:800;white-space:nowrap}'+
'.bk8row .b{display:flex;justify-content:space-between;margin-top:4px;font-size:10.5px;color:'+MUT+'}'+
'.bk8btm{position:fixed;bottom:0;inset-inline:0;display:flex;gap:10px;padding:12px 14px calc(12px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #E3ECF7;z-index:330}'+
'.bk8btm button{flex:1;border:0;border-radius:14px;height:50px;font-family:inherit;font-size:14px;font-weight:800;color:#fff;cursor:pointer}'+
'.bk8in{background:'+GOOD+'}.bk8out{background:'+BAD+'}'+
'.op8bs{position:fixed;inset:0;background:rgba(11,36,71,.45);z-index:360;display:none;align-items:flex-end}'+
'.op8bs.on{display:flex}'+
'.op8bs .bx{background:#fff;width:100%;max-width:560px;margin:0 auto;border-radius:22px 22px 0 0;padding:10px 18px calc(20px + env(safe-area-inset-bottom));animation:op8up .22s ease;max-height:82vh;overflow-y:auto}'+
'@keyframes op8up{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}'+
'.op8bs .grab{width:44px;height:5px;background:#D7E2F2;border-radius:99px;margin:4px auto 12px}'+
'.op8bs .ttl{font-size:14.5px;font-weight:800;color:#0B2447}'+
'.op8bs .sub{font-size:11.5px;color:'+MUT+';margin:3px 0 12px}'+
'.op8bs button.it{display:flex;align-items:center;gap:12px;width:100%;height:50px;border:0;background:#F4F8FD;border-radius:13px;margin-bottom:8px;padding:0 16px;font-family:inherit;font-size:13.5px;font-weight:800;color:#0B2447;cursor:pointer;text-align:start}'+
'.op8bs button.it.main{background:'+NAVY+';color:#fff}'+
'.op8bs button.it.grn{background:#E7F6EC;color:'+GOOD+'}'+
'.op8bs button.it.red{background:#FFF5F5;color:'+BAD+'}'+
'.op8bs .fld{margin-bottom:10px}'+
'.op8bs .fld label{display:block;font-size:11px;font-weight:800;color:'+MUT+';margin-bottom:5px}'+
'.op8bs .fld input,.op8bs .fld select{width:100%;height:46px;border:1.5px solid #D7E2F2;border-radius:12px;padding:0 13px;font-family:inherit;font-size:14px;font-weight:700;color:#0B2447;background:#fff;box-sizing:border-box}'+
'.bk8note{background:#FFF6E0;border:1px solid #F0DFA8;color:#8A6100;font-size:12px;font-weight:700;padding:11px 14px;border-radius:13px;margin-bottom:10px}';
document.head.appendChild(st);

/* ─────────── الورقة السفلية الخاصة بالطبقة ─────────── */
var bs=document.createElement('div');bs.className='op8bs';bs.id='op8bs';
bs.innerHTML='<div class="bx"><div class="grab"></div><div class="ttl" id="op8t"></div><div class="sub num" id="op8s"></div><div id="op8a"></div></div>';
bs.addEventListener('click',function(e){if(e.target===bs)op8Close();});
document.body.appendChild(bs);
window.op8Close=function(){bs.classList.remove('on');};
function sheet(t,s,html){$('#op8t').textContent=t;$('#op8s').textContent=s||'';$('#op8a').innerHTML=html;bs.classList.add('on');}

/* ─────────── حقن التبويب والواجهة ─────────── */
var tabs=document.querySelector('.tabs');
if(tabs){var tb=document.createElement('button');tb.dataset.tab='books';tb.textContent='الدفاتر';
  tb.onclick=function(){go('books');};tabs.appendChild(tb);}

var v=document.createElement('div');v.id='v-books';v.style.display='none';
v.innerHTML=
 '<div class="fbar"><div class="row"><div class="srch">🔍<input id="bk8q" placeholder="بحث في الدفاتر…" oninput="renderBooks()"></div></div></div>'+
 '<div class="list" id="bk8list"><div class="empty">جارٍ التحميل…</div></div>';
var anchor=$('#v-profit')||document.body;
anchor.parentNode.insertBefore(v,anchor.nextSibling);

var fab=document.createElement('button');fab.className='bk8fab';fab.id='bk8fab';
fab.textContent='＋ دفتر جديد';fab.onclick=function(){newBookSheet();};
document.body.appendChild(fab);

/* شاشة الدفتر المفتوح */
var ov=document.createElement('div');ov.className='bk8ov';ov.id='bk8ov';
ov.innerHTML=
 '<div class="bk8hd"><div class="r1">'+
   '<button class="bck" onclick="bkClose()">→</button>'+
   '<div class="nm" id="bk8nm"></div>'+
   '<button class="mn" onclick="bkMenu(BK&&BK.id,1)">⋮</button></div>'+
   '<div class="bk8sum num" id="bk8sum"></div></div>'+
 '<div class="bk8chips" id="bk8ccy"></div>'+
 '<div class="bk8list" id="bk8en"></div>'+
 '<div class="bk8btm"><button class="bk8in" onclick="entrySheet(\'in\')">🟢 قبض (له)</button>'+
 '<button class="bk8out" onclick="entrySheet(\'out\')">🔴 دفع (عليه)</button></div>';
document.body.appendChild(ov);

/* ─────────── توسيع التنقل ─────────── */
var go0=window.go;
window.go=function(t){
  go0(t);
  v.style.display=t==='books'?'block':'none';
  fab.style.display=t==='books'?'block':'none';
  if(t==='books'&&!BOOKS)loadBooks();
};

/* ─────────── أدوات ─────────── */
function rel(iso){
  if(!iso)return 'بلا حركة بعد';
  var s=(Date.now()-new Date(iso).getTime())/1000;
  if(s<60)return 'قبل لحظات';
  if(s<3600)return 'قبل '+Math.floor(s/60)+' دقيقة';
  if(s<86400)return 'قبل '+Math.floor(s/3600)+' ساعة';
  if(s<86400*30)return 'قبل '+Math.floor(s/86400)+' يوم';
  return new Date(iso).toISOString().slice(0,10);
}
function money(n){return fmt(n, Math.abs(n)%1?2:0);}
function balHTML(bal){
  var ks=Object.keys(bal||{});
  if(!ks.length)return '<b style="color:'+MUT+'">0</b><small>بلا قيود</small>';
  ks.sort(function(a,b){return Math.abs(bal[b].net)-Math.abs(bal[a].net);});
  return ks.slice(0,2).map(function(c){
    var n=+bal[c].net||0;
    return '<b class="num" style="color:'+(n<0?BAD:GOOD)+'">'+money(n)+' '+c+'</b>';
  }).join('')+(ks.length>2?'<small>+'+(ks.length-2)+' عملة</small>':'');
}

/* ─────────── تحميل وعرض القائمة ─────────── */
window.loadBooks=async function(){
  try{
    var r=await fetch(SB+'/bdl_books_summary?select=*&order=updated_at.desc&limit=300',{headers:H()});
    if(r.ok){BOOKS=await r.json();OPS8_SQL=true;}
    else{
      var r2=await fetch(SB+'/bdl_books?select=*&order=updated_at.desc&limit=300',{headers:H()});
      if(r2.ok){BOOKS=await r2.json();OPS8_SQL=true;BOOKS.forEach(function(b){b.bal={};});}
      else{BOOKS=[];OPS8_SQL=false;}
    }
  }catch(e){BOOKS=[];OPS8_SQL=false;}
  renderBooks();
};
window.renderBooks=function(){
  var el=$('#bk8list');if(!el)return;
  if(!OPS8_SQL){el.innerHTML='<div class="bk8note">⚠️ فعّل الدفاتر: الصق <b>bdl-ops8.sql</b> مرة واحدة في Supabase → SQL Editor ثم أعد فتح التبويب.</div>';return;}
  var q=($('#bk8q').value||'').trim().toLowerCase();
  var rows=(BOOKS||[]).filter(function(b){return !q||(b.name||'').toLowerCase().indexOf(q)>=0;});
  if(!rows.length){el.innerHTML='<div class="empty">لا دفاتر بعد — أنشئ أول دفتر لعميل أو مورد.</div>';return;}
  el.innerHTML=rows.map(function(b){
    return '<div class="bk8card" onclick="openBook(\''+b.id+'\')">'+
      '<div class="bk8ic">📒</div>'+
      '<div style="flex:1;min-width:0"><div class="bk8nm">'+esc(b.name)+'</div>'+
      '<div class="bk8ls">'+rel(b.last_entry_at||b.updated_at)+(b.n_entries?' · '+b.n_entries+' قيد':'')+'</div></div>'+
      '<div class="bk8bal">'+balHTML(b.bal)+'</div>'+
      '<button class="bk8dots" onclick="event.stopPropagation();bkMenu(\''+b.id+'\')">⋮</button></div>';
  }).join('');
};

/* ─────────── دفتر جديد (اسم حر أو ربط بعميل) ─────────── */
window.newBookSheet=async function(){
  var custs=[];
  try{var r=await fetch(SB+'/bdl_customers?select=id,name&order=name&limit=500',{headers:H()});
    if(r.ok)custs=await r.json();}catch(e){}
  sheet('دفتر جديد','دفتر مستقل برصيد جارٍ لكل طرف',
   '<div class="fld"><label>اسم الدفتر</label><input id="bk8n" placeholder="مثال: Zalaa / مورد الإطارات"></div>'+
   '<div class="fld"><label>ربط بعميل (اختياري)</label><select id="bk8c"><option value="">— بدون ربط —</option>'+
     custs.map(function(c){return '<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join('')+'</select></div>'+
   '<button class="it main" onclick="createBook()">إنشاء الدفتر</button>');
  var sel=$('#bk8c');
  sel.onchange=function(){var n=$('#bk8n');if(!n.value&&sel.value)n.value=sel.options[sel.selectedIndex].text;};
};
window.createBook=async function(){
  var name=($('#bk8n').value||'').trim(),cid=$('#bk8c').value||null;
  if(!name){toast('أدخل اسم الدفتر');return;}
  try{
    var r=await fetch(SB+'/bdl_books',{method:'POST',headers:H({Prefer:'return=representation'}),
      body:JSON.stringify({name:name,cust_id:cid})});
    if(!r.ok)throw 0;
    var b=(await r.json())[0];b.bal={};b.n_entries=0;
    BOOKS.unshift(b);op8Close();renderBooks();toast('أُنشئ الدفتر ✓');openBook(b.id);
  }catch(e){toast('تعذّر الإنشاء');}
};

/* ─────────── قائمة الدفتر (⋮) — أفضل ما في CashBook ─────────── */
window.bkMenu=function(id,inside){
  var b=(BOOKS||[]).filter(function(x){return x.id===id;})[0];if(!b)return;
  sheet(b.name,rel(b.last_entry_at||b.updated_at)+(b.n_entries?' · '+b.n_entries+' قيد':''),
   (inside?'':'<button class="it main" onclick="op8Close();openBook(\''+id+'\')">📖 فتح الدفتر</button>')+
   '<button class="it grn" onclick="op8Close();openBook(\''+id+'\',function(){entrySheet(\'in\')})">🟢 قبض سريع</button>'+
   '<button class="it red" onclick="op8Close();openBook(\''+id+'\',function(){entrySheet(\'out\')})">🔴 دفع سريع</button>'+
   '<button class="it" onclick="bkPDF(\''+id+'\')">🧾 كشف حساب PDF</button>'+
   '<button class="it" onclick="bkRename(\''+id+'\')">✏️ إعادة تسمية</button>'+
   '<button class="it" onclick="bkDup(\''+id+'\')">📑 تكرار الدفتر</button>'+
   '<button class="it red" onclick="bkDel(\''+id+'\')">🗑 حذف الدفتر</button>');
};
window.bkRename=async function(id){
  var b=BOOKS.filter(function(x){return x.id===id;})[0];
  var n=prompt('الاسم الجديد للدفتر:',b?b.name:'');if(!n||!n.trim())return;
  try{
    var r=await fetch(SB+'/bdl_books?id=eq.'+id,{method:'PATCH',headers:H(),body:JSON.stringify({name:n.trim()})});
    if(!r.ok)throw 0;
    b.name=n.trim();op8Close();renderBooks();
    if(BK&&BK.id===id){BK.name=b.name;$('#bk8nm').textContent=b.name;}
    toast('تمت إعادة التسمية ✓');
  }catch(e){toast('تعذّر التعديل');}
};
window.bkDup=async function(id){
  try{
    var r=await fetch(SB+'/rpc/bdl_book_duplicate',{method:'POST',headers:H(),body:JSON.stringify({p_book:id})});
    if(!r.ok)throw 0;
    op8Close();BOOKS=null;loadBooks();toast('تم تكرار الدفتر بقيوده ✓');
  }catch(e){toast('تعذّر التكرار — تأكد من لصق bdl-ops8.sql');}
};
window.bkDel=async function(id){
  var b=BOOKS.filter(function(x){return x.id===id;})[0];if(!b)return;
  if(!confirm('حذف دفتر «'+b.name+'» وكل قيوده نهائيًا؟'))return;
  if(!confirm('تأكيد أخير: لا رجعة بعد الحذف.'))return;
  try{
    var r=await fetch(SB+'/bdl_books?id=eq.'+id,{method:'DELETE',headers:H()});
    if(!r.ok)throw 0;
    BOOKS=BOOKS.filter(function(x){return x.id!==id;});
    op8Close();bkClose();renderBooks();toast('حُذف الدفتر');
  }catch(e){toast('تعذّر الحذف');}
};

/* ─────────── فتح الدفتر: رصيد جارٍ + فلترة عملة ─────────── */
window.openBook=async function(id,after){
  var b=(BOOKS||[]).filter(function(x){return x.id===id;})[0];if(!b)return;
  BK=b;BK_CCY='ALL';BK_EN=[];
  $('#bk8nm').textContent=b.name;
  $('#bk8sum').innerHTML='<div class="c"><small>الرصيد</small><b>…</b></div>';
  $('#bk8en').innerHTML='<div class="empty">جارٍ التحميل…</div>';
  ov.classList.add('on');
  try{
    var r=await fetch(SB+'/bdl_book_entries?book_id=eq.'+id+'&select=*&order=entry_date.asc,created_at.asc&limit=1000',{headers:H()});
    BK_EN=r.ok?await r.json():[];
  }catch(e){BK_EN=[];}
  renderBook();
  if(typeof after==='function')after();
};
window.bkClose=function(){ov.classList.remove('on');BK=null;};
function bkTotals(){
  var m={};
  BK_EN.forEach(function(e){
    var c=e.ccy||'AOA';m[c]=m[c]||{tin:0,tout:0};
    m[c][e.side==='in'?'tin':'tout']+=+e.amount||0;
  });
  Object.keys(m).forEach(function(c){m[c].net=m[c].tin-m[c].tout;});
  return m;
}
window.renderBook=function(){
  if(!BK)return;
  var T=bkTotals(),ks=Object.keys(T);
  $('#bk8sum').innerHTML=ks.length?ks.map(function(c){
    return '<div class="c"><small>'+c+' — قبض '+money(T[c].tin)+' · دفع '+money(T[c].tout)+'</small>'+
      '<b style="color:'+(T[c].net<0?'#FFB4B4':'#B9F6CA')+'">'+(T[c].net<0?'عليه ':'له ')+money(Math.abs(T[c].net))+'</b></div>';
  }).join(''):'<div class="c"><small>الرصيد</small><b>0</b></div>';
  $('#bk8ccy').innerHTML=['ALL'].concat(ks).map(function(c){
    return '<button class="'+(BK_CCY===c?'on':'')+'" onclick="BK_CCY=\''+c+'\';renderBook()">'+(c==='ALL'?'كل العملات':c)+'</button>';
  }).join('');
  /* الرصيد الجاري يُحسب زمنيًا لكل عملة ثم يُعرض الأحدث أولًا */
  var run={},rows=[];
  BK_EN.forEach(function(e){
    var c=e.ccy||'AOA';
    run[c]=(run[c]||0)+(e.side==='in'?+e.amount:-e.amount);
    if(BK_CCY==='ALL'||BK_CCY===c)rows.push({e:e,bal:run[c]});
  });
  rows.reverse();
  $('#bk8en').innerHTML=rows.length?rows.map(function(x){
    var e=x.e,inn=e.side==='in';
    return '<div class="bk8row" onclick="entryMenu(\''+e.id+'\')">'+
      '<div class="t"><div class="d">'+esc(e.note||(inn?'قبض':'دفع'))+'</div>'+
      '<div class="a num" style="color:'+(inn?GOOD:BAD)+'">'+(inn?'+':'−')+money(+e.amount)+' '+esc(e.ccy)+'</div></div>'+
      '<div class="b"><span>'+esc(e.entry_date||'')+'</span>'+
      '<span class="num">الرصيد: <b style="color:'+(x.bal<0?BAD:GOOD)+'">'+money(x.bal)+' '+esc(e.ccy)+'</b></span></div></div>';
  }).join(''):'<div class="empty">لا قيود بعد — ابدأ بقبض أو دفع.</div>';
};

/* ─────────── إضافة/تعديل قيد ─────────── */
window.entrySheet=function(side,e){
  if(!BK)return;
  var edit=!!e,ccy=e?e.ccy:(BK_CCY!=='ALL'?BK_CCY:'AOA');
  sheet(edit?'تعديل القيد':(side==='in'?'🟢 قبض — دخل للدفتر':'🔴 دفع — خرج من الدفتر'),BK.name,
   '<div class="fld"><label>المبلغ</label><input id="e8a" class="num" type="number" inputmode="decimal" step="any" value="'+(e?e.amount:'')+'" placeholder="0"></div>'+
   '<div class="fld"><label>العملة</label><select id="e8c">'+CCYS.map(function(c){
      return '<option '+(c===ccy?'selected':'')+'>'+c+'</option>';}).join('')+'</select></div>'+
   '<div class="fld"><label>ملاحظة</label><input id="e8n" value="'+(e?esc(e.note||''):'')+'" placeholder="سبب القيد، رقم حوالة…"></div>'+
   '<div class="fld"><label>التاريخ</label><input id="e8d" type="date" value="'+(e?e.entry_date:new Date().toISOString().slice(0,10))+'"></div>'+
   '<button class="it '+(side==='in'?'grn':'red')+'" onclick="saveEntry(\''+side+'\','+(edit?'\''+e.id+'\'':'null')+')">'+(edit?'حفظ التعديل':'تسجيل القيد')+'</button>');
  setTimeout(function(){$('#e8a').focus();},60);
};
window.saveEntry=async function(side,id){
  var a=parseFloat($('#e8a').value);
  if(!(a>0)){toast('أدخل مبلغًا صحيحًا');return;}
  var body={side:side,amount:a,ccy:$('#e8c').value,note:($('#e8n').value||'').trim()||null,
            entry_date:$('#e8d').value||new Date().toISOString().slice(0,10)};
  try{
    var r;
    if(id){r=await fetch(SB+'/bdl_book_entries?id=eq.'+id,{method:'PATCH',headers:H(),body:JSON.stringify(body)});}
    else{body.book_id=BK.id;
      r=await fetch(SB+'/bdl_book_entries',{method:'POST',headers:H(),body:JSON.stringify(body)});}
    if(!r.ok)throw 0;
    op8Close();
    var rr=await fetch(SB+'/bdl_book_entries?book_id=eq.'+BK.id+'&select=*&order=entry_date.asc,created_at.asc&limit=1000',{headers:H()});
    BK_EN=rr.ok?await rr.json():BK_EN;
    renderBook();BOOKS=null;loadBooks();  /* تحديث القائمة والأرصدة */
    toast(id?'عُدّل القيد ✓':(side==='in'?'سُجّل القبض ✓':'سُجّل الدفع ✓'));
  }catch(e){toast('تعذّر الحفظ — تأكد من لصق bdl-ops8.sql');}
};
window.entryMenu=function(id){
  var e=BK_EN.filter(function(x){return x.id===id;})[0];if(!e)return;
  sheet((e.side==='in'?'قبض ':'دفع ')+money(+e.amount)+' '+e.ccy,(e.note||'')+' · '+(e.entry_date||''),
   '<button class="it main" onclick="op8Close();entrySheet(\''+e.side+'\',BK_EN.filter(function(x){return x.id===\''+id+'\'})[0])">✏️ تعديل القيد</button>'+
   '<button class="it red" onclick="delEntry(\''+id+'\')">🗑 حذف القيد</button>');
};
window.delEntry=async function(id){
  if(!confirm('حذف هذا القيد نهائيًا؟'))return;
  try{
    var r=await fetch(SB+'/bdl_book_entries?id=eq.'+id,{method:'DELETE',headers:H()});
    if(!r.ok)throw 0;
    BK_EN=BK_EN.filter(function(x){return x.id!==id;});
    op8Close();renderBook();BOOKS=null;loadBooks();toast('حُذف القيد');
  }catch(e){toast('تعذّر الحذف');}
};

/* ─────────── كشف حساب PDF (نفس محرّك ops7: Canvas → jsPDF) ─────────── */
window.bkPDF=async function(id){
  try{
    var b=(BOOKS||[]).filter(function(x){return x.id===id;})[0];if(!b)return;
    var r=await fetch(SB+'/bdl_book_entries?book_id=eq.'+id+'&select=*&order=entry_date.asc,created_at.asc&limit=1000',{headers:H()});
    var en=r.ok?await r.json():[];
    var run={},rows=[];
    en.forEach(function(e){var c=e.ccy||'AOA';
      run[c]=(run[c]||0)+(e.side==='in'?+e.amount:-e.amount);
      rows.push({e:e,bal:run[c]});});
    var last=rows.slice(-80);
    var W=1240,rowH=58,Hh=300,H_=Hh+last.length*rowH+140;
    var c=document.createElement('canvas');c.width=W;c.height=H_;
    var x=c.getContext('2d'),F="'IBM Plex Sans Arabic','Inter',system-ui,sans-serif";
    x.fillStyle='#F6FAFD';x.fillRect(0,0,W,H_);
    var g=x.createLinearGradient(0,0,W,220);
    g.addColorStop(0,'#0B2F70');g.addColorStop(.55,'#0A56B8');g.addColorStop(1,'#19A9F5');
    x.fillStyle=g;x.fillRect(0,0,W,220);
    x.textAlign='right';x.fillStyle='#fff';x.font='800 42px '+F;
    x.fillText('كشف حساب — '+b.name,W-60,92);
    x.font='600 25px '+F;x.fillStyle='rgba(255,255,255,.92)';
    var nets=Object.keys(run).map(function(k){return k+' '+((run[k]<0?'عليه ':'له ')+fmt(Math.abs(run[k]),0));}).join('  ·  ');
    x.fillText(new Date().toISOString().slice(0,10)+' · '+en.length+' قيد · '+(nets||'رصيد 0'),W-60,146);
    x.font='500 20px '+F;x.fillStyle='rgba(255,255,255,.75)';
    x.fillText('BDL · lbdal.com',W-60,190);
    var ty=Hh-30;
    x.font='800 20px '+F;x.fillStyle='#5C7699';
    x.fillText('البيان / التاريخ',W-70,ty-14);
    x.textAlign='left';x.fillText('قبض | دفع | الرصيد',70,ty-14);
    last.forEach(function(q,i){
      var e=q.e,inn=e.side==='in';
      x.fillStyle=i%2?'#fff':'#EEF4FB';x.fillRect(50,ty,W-100,rowH-8);
      x.textAlign='right';x.fillStyle='#0B2447';x.font='700 23px '+F;
      x.fillText((e.note||(inn?'قبض':'دفع')).slice(0,40),W-70,ty+26);
      x.font='500 18px '+F;x.fillStyle='#8AA3C4';
      x.fillText(e.entry_date||'',W-70,ty+46);
      x.textAlign='left';x.font='800 23px '+F;
      x.fillStyle=inn?'#0B7A3B':'#B00020';
      x.fillText((inn?'+':'−')+fmt(+e.amount,0)+' '+e.ccy,70,ty+26);
      x.font='700 18px '+F;x.fillStyle=q.bal<0?'#B00020':'#0B7A3B';
      x.fillText('الرصيد '+fmt(q.bal,0)+' '+e.ccy,70,ty+46);
      ty+=rowH;
    });
    x.textAlign='center';x.fillStyle='#8AA3C4';x.font='500 20px '+F;
    x.fillText('أُصدر تلقائيًا من BDL · '+new Date().toLocaleString('en-GB'),W/2,H_-36);
    var img=c.toDataURL('image/jpeg',.92);
    var JS=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;
    if(!JS)throw new Error('jsPDF لم يُحمَّل');
    var pdf=new JS({unit:'px',format:[W/2,H_/2]});
    pdf.addImage(img,'JPEG',0,0,W/2,H_/2);
    pdf.save('BDL-'+b.name.replace(/[^\w\u0600-\u06FF-]+/g,'_')+'-'+new Date().toISOString().slice(0,10)+'.pdf');
    op8Close();toast('صدر كشف الحساب ✓');
  }catch(e){toast('تعذّر الكشف: '+e.message);}
};

console.log('bdl-ops8: دفاتر النقد جاهزة ✓');
})();
