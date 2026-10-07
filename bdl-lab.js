/* bdl-lab.js — مختبر المطابقة (Build 1406): صفحة اختبار لا تحفظ شيئًا.
   ترفع إيصالات الزبون وإيصالات المورد (ZIP محادثة واتساب أو صور/PDF)، تختار الفترة، فيُفكّ الملف وتُقرأ الإيصالات
   وتُطابَق واحدًا لواحد (رقم العملية ثم المبلغ)، وتظهر النتيجة: ما طابق، وما بقي بلا مقابل من كل جهة.
   لا اتصال بقاعدة البيانات إطلاقًا — القراءة فقط تمر بقارئ الإيصالات. */
(function(){'use strict';
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

  var S={c:null,s:null,run:null,res:null};
  function $(i){return document.getElementById(i);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function f(n){return Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0});}
  function nref(v){v=String(v==null?'':v).replace(/\s+/g,'').toUpperCase();return v.length>=5?v:'';}
  function amt(v){v=Number(v)||0;return v>=100?v:0;}
  function d0(ts){var d=new Date(ts);d.setHours(0,0,0,0);return d.getTime();}
  function iso(ts){var d=new Date(ts),z=function(x){return (x<10?'0':'')+x;};return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());}
  function dmy(ts){var d=new Date(ts),z=function(x){return (x<10?'0':'')+x;};return z(d.getDate())+'/'+z(d.getMonth()+1)+'/'+d.getFullYear()+' · '+z(d.getHours())+':'+z(d.getMinutes());}
  function isDoc(n,t){return /^image\//i.test(t||'')||/pdf/i.test(t||'')||/\.(jpe?g|png|webp|pdf)$/i.test(n||'');}
  function zName(n){n=String(n||'').replace(/\.zip$/i,'').replace(/\s*\(\d+\)\s*$/,'');var m=n.match(/WhatsApp Chat\s*[-–]\s*(.+)$/i)||n.match(/WhatsApp Chat with\s+(.+)$/i)||n.match(/Conversa do WhatsApp com\s+(.+)$/i)||n.match(/محادثة (?:واتساب|WhatsApp) مع\s+(.+)$/);return m?m[1].trim():n;}
  function toast(m){var t=$('lbToast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('on');},3200);}
  async function sha(file){var b=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return Array.prototype.map.call(new Uint8Array(b),function(x){return x.toString(16).padStart(2,'0');}).join('');}
  function loadZip(){return window.JSZip?Promise.resolve():new Promise(function(res,rej){var sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';sc.onload=res;sc.onerror=function(){rej(new Error('تعذّر تحميل قارئ ZIP — تحقق من الاتصال'));};document.head.appendChild(sc);});}

  /* ── تحميل جهة (زبون/مورد): ZIP أو ملفات مباشرة ── */
  async function pick(side,files){files=[].slice.call(files||[]);if(!files.length)return;var o={side:side,name:'',list:[],busy:true,err:''};S[side]=o;S.res=null;paint();
    try{var zf=files.find(function(x){return /\.zip$/i.test(x.name||'')||/zip/i.test(x.type||'');});
      if(zf){if(zf.size>260*1048576&&!confirm('الملف كبير ('+Math.round(zf.size/1048576)+' MB) وقد لا يتحمله الهاتف. المتابعة؟')){S[side]=null;paint();return;}
        await loadZip();var z=await window.JSZip.loadAsync(zf),idx=await waChatIndex(z);o.name=zName(zf.name);
        z.forEach(function(p,en){if(en.dir)return;var nm=p.split('/').pop();if(!isDoc(nm,'')||/STICKER|-STK-/i.test(nm))return;var ts=idx[nm.toLowerCase()]||waStamp(nm)||0;o.list.push({nm:nm,en:en,ts:ts});});}
      files.forEach(function(x){if(x!==zf&&isDoc(x.name,x.type))o.list.push({nm:x.name,file:x,ts:x.lastModified||Date.now()});});
      if(!o.name)o.name=o.list.length+' ملف';
      if(!o.list.length)throw new Error('لا صور ولا PDF في الملف — صدّر المحادثة مع الوسائط');
      var days=o.list.filter(function(x){return x.ts;}).map(function(x){return d0(x.ts);});o.max=days.length?Math.max.apply(null,days):d0(Date.now());o.min=days.length?Math.min.apply(null,days):o.max;
      o.undated=o.list.filter(function(x){return !x.ts;}).length;o.from=o.max;o.to=o.max;o.all=false;
      /* الجهة الثانية تأخذ نفس فترة الأولى تلقائيًا */
      var other=S[side==='c'?'s':'c'];if(other&&!other.busy&&!other.all){o.from=other.from;o.to=other.to;}
    }catch(e){o.err=(e&&e.message)||'تعذّر فتح الملف';}
    o.busy=false;paint();}
  function sel(o){return o.all?o.list.slice():o.list.filter(function(x){if(!x.ts)return false;var k=d0(x.ts);return k>=o.from&&k<=o.to;});}

  /* ── الفحص: تفكيك ← قراءة ← مطابقة ── */
  async function start(){var C=sel(S.c).slice(0,400),P=sel(S.s).slice(0,400);if(!C.length||!P.length)return;
    var R={stage:'unzip',n:C.length+P.length,d1:0,d2:0,stop:false,items:{c:[],s:[]},dup:0};S.run=R;S.res=null;paint();
    var mk=async function(x,side){var file=x.file;if(!file){var bl=await x.en.async('blob'),ex=x.nm.split('.').pop().toLowerCase();file=new File([bl],x.nm,{type:ex==='pdf'?'application/pdf':ex==='png'?'image/png':ex==='webp'?'image/webp':'image/jpeg'});}
      return {side:side,file:file,nm:x.nm,ts:x.ts||0,pdf:/pdf$/i.test(file.type||x.nm),url:URL.createObjectURL(file),p:null,to:null};};
    var all=[];for(var i=0;i<C.length&&!R.stop;i++){try{all.push(await mk(C[i],'c'));}catch(e){}R.d1++;if(i%4===0)paint();}
    for(var j=0;j<P.length&&!R.stop;j++){try{all.push(await mk(P[j],'s'));}catch(e){}R.d1++;if(j%4===0)paint();}
    R.stage='read';R.n=all.length;paint();var seen={c:{},s:{}},qi=0;
    async function wk(){while(qi<all.length&&!R.stop){var it=all[qi++];R.cur=it.nm;
        try{it.fp=await sha(it.file);}catch(e){}
        if(it.fp&&seen[it.side][it.fp]){R.dup++;it.dup=true;}else{if(it.fp)seen[it.side][it.fp]=1;
          var p={};try{var r=await Promise.race([window.ArkanRead.read(it.file),new Promise(function(x){setTimeout(function(){x(null);},60000);})]);var q=(r&&r.parsed)||{};
            p={amount:Number(q.amount)||0,ref:q.transaction_id||q.reference||q.txn||'',bank:q.bank||q.institution||'',date:q.date||'',name:q.beneficiary||q.name||''};}catch(e){}
          it.p=p;R.items[it.side].push(it);}
        R.d2++;paint();}}
    await Promise.all([wk(),wk(),wk()]);
    S.res={c:R.items.c,s:R.items.s,dup:R.dup,stopped:R.stop,at:new Date()};S.run=null;match();paint();window.scrollTo({top:0,behavior:'smooth'});}
  /* واحد لواحد: ① رقم العملية ② المبلغ نفسه — عند تعدد المتساويين يُزاوَج الأقرب زمنًا */
  function match(){var R=S.res;if(!R)return;R.c.concat(R.s).forEach(function(x){if(!x.man)x.to=null;});
    var free=function(arr){return arr.filter(function(x){return !x.to;});},link=function(a,b,how){a.to=b;b.to=a;a.how=b.how=how;};
    free(R.s).forEach(function(s){var rf=nref(s.p.ref);if(!rf)return;var c=free(R.c).find(function(x){return nref(x.p.ref)===rf;});if(c)link(c,s,'ref');});
    free(R.s).forEach(function(s){var a=amt(s.p.amount);if(!a||s.to)return;var cs=free(R.c).filter(function(x){return amt(x.p.amount)===a;});if(!cs.length)return;
      cs.sort(function(x,y){return Math.abs((x.ts||0)-(s.ts||0))-Math.abs((y.ts||0)-(s.ts||0));});link(cs[0],s,'amt');});}

  /* ── العرض ── */
  function sideCard(k,title,hint){var o=S[k],h='<section class="sd '+k+'"><header><b>'+title+'</b><small>'+hint+'</small></header>';
    if(!o)h+='<button type="button" class="pk" data-pick="'+k+'"><i>＋</i>اختر ملف ZIP أو صورًا / PDF</button>';
    else if(o.busy)h+='<div class="ld"><span class="sp"></span> جارٍ فتح الملف…</div>';
    else if(o.err)h+='<div class="er">'+esc(o.err)+'</div><button type="button" class="pk" data-pick="'+k+'">اختيار ملف آخر</button>';
    else{var n=sel(o).length;h+='<div class="nm"><b>'+esc(o.name)+'</b><span>'+o.list.length+' إيصالًا في الملف'+(o.undated?' · '+o.undated+' بلا تاريخ':'')+'</span><button type="button" data-pick="'+k+'">تغيير</button></div>'+
      '<div class="qk"><button type="button" data-q="'+k+':last"'+(!o.all&&o.from===o.max&&o.to===o.max?' class="on"':'')+'>آخر يوم</button><button type="button" data-q="'+k+':7"'+(!o.all&&o.to===o.max&&o.from===o.max-6*864e5?' class="on"':'')+'>آخر 7 أيام</button><button type="button" data-q="'+k+':all"'+(o.all?' class="on"':'')+'>الكل</button></div>'+
      '<div class="rg"><label><small>من</small><input type="date" data-d="'+k+':from" value="'+iso(o.from)+'" min="'+iso(o.min)+'" max="'+iso(o.max)+'"'+(o.all?' disabled':'')+'></label><label><small>إلى</small><input type="date" data-d="'+k+':to" value="'+iso(o.to)+'" min="'+iso(o.min)+'" max="'+iso(o.max)+'"'+(o.all?' disabled':'')+'></label></div>'+
      '<div class="ct"><b>'+n+'</b> إيصالًا في الفترة'+(n>400?' — سيُفحص أحدث 400':'')+'</div>';}
    return h+'</section>';}
  function rowH(it,i,kind){var p=it.p||{},a=amt(p.amount);return '<div class="rw '+kind+'"><div class="th" data-v="'+it.side+':'+i+'">'+(it.pdf?'PDF':'<img src="'+it.url+'" alt="" loading="lazy">')+'</div><div class="mn"><b>'+(a?f(a):'لم يُقرأ المبلغ')+'</b><span>'+esc(nref(p.ref)||'بلا مرجع')+(it.ts?' · '+dmy(it.ts):'')+(p.bank?' · '+esc(p.bank):'')+'</span></div>'+
      '<input inputmode="decimal" dir="ltr" placeholder="المبلغ" value="'+(a||'')+'" data-e="'+it.side+':'+i+'"><button type="button" data-v="'+it.side+':'+i+'">فتح</button></div>';}
  function results(){var R=S.res,cm=R.c.filter(function(x){return x.to;}),cu=R.c.filter(function(x){return !x.to;}),su=R.s.filter(function(x){return !x.to;});
    var sum=function(a){return a.reduce(function(t,x){return t+amt(x.p.amount);},0);},tc=sum(R.c),ts=sum(R.s),ok=!cu.length&&!su.length;
    var h='<section class="rs"><div class="vd '+(ok?'ok':'no')+'"><b>'+(ok?'✓ كل الإيصالات متطابقة':'توجد إيصالات غير متطابقة')+'</b><span>'+(ok?'لكل إيصال زبون إيصال مورد مقابل.':(cu.length+' عند الزبون بلا مورد · '+su.length+' عند المورد بلا زبون'))+(R.stopped?' — الفحص أُوقف قبل اكتماله':'')+'</span></div>'+
      '<div class="kp"><div class="g"><b>'+cm.length+'</b><small>مطابق ✓</small><i>'+f(sum(cm))+'</i></div><div class="a"><b>'+cu.length+'</b><small>زبون بلا مورد</small><i>'+f(sum(cu))+'</i></div><div class="r"><b>'+su.length+'</b><small>مورد بلا زبون</small><i>'+f(sum(su))+'</i></div></div>'+
      '<div class="tt"><div><small>مجموع الزبون ('+R.c.length+')</small><b>'+f(tc)+'</b></div><div><small>مجموع المورد ('+R.s.length+')</small><b>'+f(ts)+'</b></div><div class="'+(Math.abs(tc-ts)<1?'g':'r')+'"><small>الفرق</small><b>'+f(tc-ts)+'</b></div></div>'+(R.dup?'<div class="nt">استُبعد '+R.dup+' ملف مكرر (نفس الصورة مرتين في الجهة نفسها).</div>':'');
    if(cu.length)h+='<h3 class="a">إيصالات زبون بلا مورد ('+cu.length+')</h3>'+cu.map(function(x){return rowH(x,R.c.indexOf(x),'a');}).join('');
    if(su.length)h+='<h3 class="r">إيصالات مورد بلا زبون ('+su.length+')</h3>'+su.map(function(x){return rowH(x,R.s.indexOf(x),'r');}).join('');
    if(cu.length||su.length)h+='<div class="nt">صحّح أي مبلغ قُرئ خطأً في خانته ثم اضغط «أعد المطابقة».</div><button type="button" class="bt ln" data-a="re">أعد المطابقة</button>';
    h+='<details class="mt"><summary>الأزواج المتطابقة ('+cm.length+')</summary>'+cm.map(function(c){var s=c.to;return '<div class="pr"><span data-v="c:'+R.c.indexOf(c)+'">'+f(amt(c.p.amount))+'<small>'+esc(nref(c.p.ref)||'—')+'</small></span><em>'+(c.how==='ref'?'نفس المرجع':'نفس المبلغ')+'</em><span data-v="s:'+R.s.indexOf(s)+'">'+f(amt(s.p.amount))+'<small>'+esc(nref(s.p.ref)||'—')+'</small></span></div>';}).join('')+'</details>';
    h+='<div class="bs"><button type="button" class="bt" data-a="copy">نسخ الملخص</button><button type="button" class="bt ln" data-a="new">فحص جديد</button></div></section>';return h;}
  function paint(){var m=$('lbMain'),R=S.run,h='';
    if(R){var p=Math.round(((R.d1/Math.max(1,R.n))*0.2+(R.d2/Math.max(1,R.n))*0.8)*100);if(R.stage==='unzip')p=Math.round(R.d1/Math.max(1,R.n)*20);
      h='<section class="pg"><div class="st"><span class="'+(R.stage==='unzip'?'on':'dn')+'">١ التفكيك</span><span class="'+(R.stage==='read'?'on':'')+'">٢ القراءة</span><span>٣ المطابقة</span></div><div class="br"><i style="width:'+p+'%"></i></div><div class="tx"><b>'+p+'%</b>'+(R.stage==='unzip'?'جارٍ تفكيك الإيصالات '+R.d1+' / '+R.n:'جارٍ قراءة الإيصالات '+R.d2+' / '+R.n)+'</div>'+(R.cur?'<div class="fn">'+esc(R.cur)+'</div>':'')+'<button type="button" class="bt ln" data-a="stop">إيقاف وعرض ما قُرئ</button></section>';}
    else if(S.res)h=results();
    else{var c=S.c,s=S.s,ready=c&&s&&!c.busy&&!s.busy&&!c.err&&!s.err&&sel(c).length&&sel(s).length;
      h=sideCard('c','إيصالات الزبون','ما أرسله الزبون — تحويلاته بالكوانزا')+sideCard('s','إيصالات المورد','ما أرسله المورد — تأكيداته للتحويلات نفسها')+
        '<button type="button" class="bt go" data-a="go"'+(ready?'':' disabled')+'>'+(ready?'ابدأ الفحص — '+Math.min(400,sel(c).length)+' زبون × '+Math.min(400,sel(s).length)+' مورد':'اختر ملفَّي الجهتين أولًا')+'</button>'+
        '<div class="how"><b>كيف يعمل</b>يُفكّ الملفان، يُقرأ كل إيصال، ثم يُطابَق كل إيصال زبون مع إيصال مورد واحد: برقم العملية أولًا، ثم بالمبلغ. النتيجة تُعرض هنا فقط — <u>لا شيء يُحفظ ولا يُقيَّد في أي تسوية</u>.</div>';}
    m.innerHTML=h;}
  function view(k){var a=k.split(':'),it=S.res&&S.res[a[0]][+a[1]];if(!it)return;var v=$('lbView');v.querySelector('b').textContent=it.nm;v.querySelector('.bd').innerHTML=it.pdf?'<iframe src="'+it.url+'"></iframe>':'<img src="'+it.url+'" alt="">';v.classList.add('on');}
  document.addEventListener('click',function(e){var t=e.target,b;
    if((b=t.closest('[data-pick]'))){S._side=b.dataset.pick;var i=$('lbFile');i.value='';i.click();return;}
    if((b=t.closest('[data-q]'))){var q=b.dataset.q.split(':'),o=S[q[0]];if(!o)return;o.all=q[1]==='all';if(q[1]==='last'){o.from=o.to=o.max;}else if(q[1]==='7'){o.to=o.max;o.from=o.max-6*864e5;}paint();return;}
    if((b=t.closest('[data-v]'))){view(b.dataset.v);return;}
    if(t.closest('#lbView button')||t.id==='lbView'){$('lbView').classList.remove('on');return;}
    if((b=t.closest('[data-a]'))){var a=b.dataset.a;
      if(a==='go')start();else if(a==='stop'){if(S.run)S.run.stop=true;b.disabled=true;b.textContent='جارٍ الإيقاف…';}
      else if(a==='re'){match();paint();toast('أُعيدت المطابقة');}
      else if(a==='new'){if(confirm('بدء فحص جديد؟ نتيجة الفحص الحالي ستُمسح (لا شيء محفوظ).')){S.c=S.s=S.res=null;paint();}}
      else if(a==='copy'){var R=S.res,cu=R.c.filter(function(x){return !x.to;}),su=R.s.filter(function(x){return !x.to;}),L=function(x){return '• '+(amt(x.p.amount)?f(amt(x.p.amount)):'لم يُقرأ')+' — '+(nref(x.p.ref)||'بلا مرجع');};
        var txt='BDL · فحص مطابقة (اختبار)\nالزبون: '+(S.c?S.c.name:'')+' — '+R.c.length+' إيصالًا\nالمورد: '+(S.s?S.s.name:'')+' — '+R.s.length+' إيصالًا\nمطابق: '+R.c.filter(function(x){return x.to;}).length+'\n\nزبون بلا مورد ('+cu.length+'):\n'+(cu.map(L).join('\n')||'—')+'\n\nمورد بلا زبون ('+su.length+'):\n'+(su.map(L).join('\n')||'—');
        (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){toast('نُسخ الملخص');},function(){prompt('انسخ:',txt);});}}});
  document.addEventListener('change',function(e){var t=e.target;
    if(t.id==='lbFile'){pick(S._side||'c',t.files);return;}
    if(t.dataset&&t.dataset.d){var d=t.dataset.d.split(':'),o=S[d[0]];if(!o||!t.value)return;var p=t.value.split('-'),ts=new Date(+p[0],+p[1]-1,+p[2]).getTime();o[d[1]]=ts;if(o.from>o.to){if(d[1]==='from')o.to=o.from;else o.from=o.to;}o.all=false;paint();return;}
    if(t.dataset&&t.dataset.e){var k=t.dataset.e.split(':'),it=S.res&&S.res[k[0]][+k[1]];if(it){it.p.amount=parseFloat(String(t.value).replace(/[^\d.]/g,''))||0;}}});
  window.addEventListener('beforeunload',function(e){if(S.run||S.res){e.preventDefault();e.returnValue='';}});
  window.__LAB={S:S,match:match,sel:sel,paint:paint};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
})();
