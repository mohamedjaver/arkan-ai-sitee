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
            p={amount:Number(q.amount)||0,ref:q.transaction_id||q.reference||q.txn||'',bank:q.bank||q.institution||'',date:q.date||'',name:q.beneficiary||q.name||''};p.account=q.iban||q.account||'';p.receiver=q.receiver||'';}catch(e){}
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


  /* 1407: تقرير المختبر كصورة بهيئة فاتورة BDL — للمشاركة فقط، لا يُحفظ شيء */
  function drawLab(mk,d,logo){var W=1080,P=56,cv=mk(W,3600),x=cv.getContext('2d'),y=0,AR='"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif',NUM='"IBM Plex Mono",Inter,Arial,sans-serif';
    var NAVY='#0B2F70',INK='#0B2447',MUT='#5C7699',LINE='#DCE5F1',GRN='#0E8F5B',RED='#B00020',AMB='#C77800';
    function rr(a,b,w,h,r,fl,s){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();if(fl){x.fillStyle=fl;x.fill();}if(s){x.strokeStyle=s;x.lineWidth=2;x.stroke();}}
    function T(str,a,b,size,wt,col,al,num,maxW){str=String(str==null?'':str);var fs=size;x.font=wt+' '+fs+'px '+(num?NUM:AR);x.fillStyle=col;x.textAlign=al||'right';x.textBaseline='alphabetic';try{x.direction=num?'ltr':'rtl';}catch(e){}
      if(maxW){while(fs>size*0.6&&x.measureText(str).width>maxW){fs-=1;x.font=wt+' '+fs+'px '+(num?NUM:AR);}if(x.measureText(str).width>maxW){while(str.length>3&&x.measureText(str+'…').width>maxW)str=str.slice(0,-1);str+='…';}}x.fillText(str,a,b);}
    x.fillStyle='#fff';x.fillRect(0,0,W,3600);
    var g=x.createLinearGradient(0,0,W,0);g.addColorStop(0,'#1AA3F5');g.addColorStop(.45,'#0A56B8');g.addColorStop(1,'#0B2F70');x.fillStyle=g;x.fillRect(0,0,W,210);x.fillStyle='#F2B43A';x.fillRect(0,210,W,8);
    var ok=false;try{ok=logo&&logo(x,W-P-112,48,112);}catch(e){}if(!ok){rr(W-P-112,48,112,112,24,'#fff');T('BDL',W-P-56,118,40,700,NAVY,'center',true);}
    T('BDL · لبدال',W-P-136,100,44,700,'#fff');T('فحص مطابقة — اختبار',W-P-136,146,26,500,'rgba(255,255,255,.9)');
    var dt=d.when,z=function(n){return (n<10?'0':'')+n;};T(z(dt.getDate())+'/'+z(dt.getMonth()+1)+'/'+dt.getFullYear()+'  '+z(dt.getHours())+':'+z(dt.getMinutes()),P,100,26,700,'#fff','left',true);T('غير محفوظ',P,140,22,600,'#F2B43A','left');
    y=250;rr(P,y,W-2*P,86,12,d.ok?'#E9F8EF':'#FFF1F2',d.ok?GRN:RED);T(d.ok?'✓ كل الإيصالات متطابقة':'توجد إيصالات غير متطابقة',W/2,y+54,32,700,d.ok?GRN:RED,'center');y+=86+20;
    var cw=(W-2*P-18)/2;[['الزبون',d.cname,d.cN,d.cSum,NAVY],['المورد',d.sname,d.sN,d.sSum,GRN]].forEach(function(c,i){var cx=W-P-cw-i*(cw+18);rr(cx,y,cw,150,12,'#F4F7FC',LINE);x.fillStyle=c[4];x.fillRect(cx+cw-8,y+12,8,126);
      T(c[0]+' · '+c[2]+' إيصالًا',cx+cw-26,y+40,21,600,MUT);T(c[1]||'—',cx+cw-26,y+84,28,700,INK,'right',false,cw-52);T(f(c[3]),cx+cw-26,y+128,30,700,c[4],'right',true,cw-52);});
    y+=150+14;var dz=Math.abs(d.cSum-d.sSum)<1;rr(P,y,W-2*P,56,10,dz?'#E9F8EF':'#FFF6E3');T('الفرق بين المجموعين: '+f(d.cSum-d.sSum),W/2,y+37,24,700,dz?GRN:AMB,'center');y+=56+26;
    var kw=(W-2*P-36)/3;[['مطابق ✓',d.m,GRN,'#E9F8EF',d.mSum],['زبون بلا مورد',d.cu.length,AMB,'#FFF6E3',d.cu.reduce(function(a,u){return a+u.a;},0)],['مورد بلا زبون',d.su.length,RED,'#FFF1F2',d.su.reduce(function(a,u){return a+u.a;},0)]].forEach(function(c,i){var cx=W-P-kw-i*(kw+18);
      rr(cx,y,kw,128,12,c[3],c[2]);T(String(c[1]),cx+kw-26,y+66,52,700,c[2],'right',true);T(c[0],cx+26,y+46,22,700,c[2],'left');T(f(c[4]),cx+26,y+96,24,700,INK,'left',true,kw-140);});
    y+=128+20;
    var list=function(title,col,bg,arr){if(!arr.length)return;y+=26;T(title+' ('+arr.length+')',W-P,y+8,25,700,col);y+=28;
      arr.slice(0,8).forEach(function(u){rr(P,y,W-2*P,50,8,bg);x.fillStyle=col;x.fillRect(W-P-8,y,8,50);if(u.a)T(f(u.a),W-P-28,y+34,26,700,INK,'right',true);else T('لم يُقرأ المبلغ',W-P-28,y+33,22,700,col);T((u.r||'بلا مرجع')+(u.w?'  ·  '+u.w:''),P+20,y+33,21,500,MUT,'left',true,W-2*P-330);y+=58;});
      if(arr.length>8){T('+ '+(arr.length-8)+' أخرى',W-P,y+18,21,600,MUT);y+=34;}};
    list('إيصالات زبون بلا مورد',AMB,'#FFF6E3',d.cu);list('إيصالات مورد بلا زبون',RED,'#FFF1F2',d.su);
    y+=20;x.fillStyle=NAVY;x.fillRect(0,y,W,74);T('فحص تجريبي من مختبر BDL — لم يُحفظ ولم يُقيَّد في أي تسوية',W-P,y+46,21,500,'rgba(255,255,255,.92)','right',false,W-2*P-200);T('lbdal.com',P,y+46,22,700,'#F2B43A','left',true);y+=74;
    var out=mk(W,y);out.getContext('2d').drawImage(cv,0,0,W,y,0,0,W,y);return out;}
  function repData(){var R=S.res,sum=function(a){return a.reduce(function(t,q){return t+amt(q.p.amount);},0);},cm=R.c.filter(function(q){return q.to;}),cu=R.c.filter(function(q){return !q.to;}),su=R.s.filter(function(q){return !q.to;}),mp=function(q){return {a:amt(q.p.amount),r:nref(q.p.ref),w:q.ts?dmy(q.ts):''};};
    return {cname:S.c?S.c.name:'',sname:S.s?S.s.name:'',cN:R.c.length,sN:R.s.length,cSum:sum(R.c),sSum:sum(R.s),m:cm.length,mSum:sum(cm),cu:cu.map(mp),su:su.map(mp),ok:!cu.length&&!su.length,when:new Date()};}
  window.__LABDRAW=drawLab;
  async function report(){try{try{if(document.fonts&&document.fonts.ready)await Promise.race([document.fonts.ready,new Promise(function(r){setTimeout(r,1200);})]);}catch(e){}
      var im=new Image();await new Promise(function(r){im.onload=im.onerror=r;im.src='arkan-icon-512.png';});
      var logo=function(c,px,py,s){if(!im.naturalWidth)return false;c.save();c.beginPath();var r=24;c.moveTo(px+r,py);c.arcTo(px+s,py,px+s,py+s,r);c.arcTo(px+s,py+s,px,py+s,r);c.arcTo(px,py+s,px,py,r);c.arcTo(px,py,px+s,py,r);c.closePath();c.clip();c.drawImage(im,px,py,s,s);c.restore();return true;};
      var cv=drawLab(function(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;},repData(),logo),v=$('lbRep');
      if(!v){v=document.createElement('div');v.id='lbRep';document.body.appendChild(v);}
      v.innerHTML='<header><b>تقرير الفحص</b><button type="button" data-r="x">إغلاق</button></header><div class="bd"><img src="'+cv.toDataURL('image/png')+'" alt=""></div><footer><button type="button" class="p" data-r="share">مشاركة</button><button type="button" data-r="save">حفظ صورة</button></footer>';v.classList.add('on');
      v.onclick=async function(e){var b=e.target.closest('[data-r]');if(!b)return;if(b.dataset.r==='x'){v.classList.remove('on');return;}
        try{var blob=await new Promise(function(r){cv.toBlob(r,'image/png');}),nm='BDL-فحص-مطابقة-'+new Date().toISOString().slice(0,10)+'.png',fl=new File([blob],nm,{type:'image/png'});
          if(b.dataset.r==='share'&&navigator.canShare&&navigator.canShare({files:[fl]})){await navigator.share({files:[fl],title:'فحص مطابقة BDL'});return;}
          var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nm;document.body.appendChild(a);a.click();a.remove();}catch(err){if(!(err&&err.name==='AbortError'))toast('تعذّر إخراج التقرير');}};
    }catch(e){toast('تعذّر إنشاء التقرير');}}

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
    h+='<div class="bs"><button type="button" class="bt" data-a="rep">تقرير صورة</button><button type="button" class="bt ln" data-a="copy">نسخ الملخص</button></div><button type="button" class="bt ln" data-a="new">فحص جديد</button></section>';return h;}
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
      else if(a==='rep'){report();}
      else if(a==='new'){if(confirm('بدء فحص جديد؟ نتيجة الفحص الحالي ستُمسح (لا شيء محفوظ).')){S.c=S.s=S.res=null;paint();}}
      else if(a==='copy'){var R=S.res,cu=R.c.filter(function(x){return !x.to;}),su=R.s.filter(function(x){return !x.to;}),L=function(x){return '• '+(amt(x.p.amount)?f(amt(x.p.amount)):'لم يُقرأ')+' — '+(nref(x.p.ref)||'بلا مرجع');};
        var txt='BDL · فحص مطابقة (اختبار)\nالزبون: '+(S.c?S.c.name:'')+' — '+R.c.length+' إيصالًا\nالمورد: '+(S.s?S.s.name:'')+' — '+R.s.length+' إيصالًا\nمطابق: '+R.c.filter(function(x){return x.to;}).length+'\n\nزبون بلا مورد ('+cu.length+'):\n'+(cu.map(L).join('\n')||'—')+'\n\nمورد بلا زبون ('+su.length+'):\n'+(su.map(L).join('\n')||'—');
        (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){toast('نُسخ الملخص');},function(){prompt('انسخ:',txt);});}}});
  document.addEventListener('change',function(e){var t=e.target;
    if(t.id==='lbFile'){pick(S._side||'c',t.files);return;}
    if(t.dataset&&t.dataset.d){var d=t.dataset.d.split(':'),o=S[d[0]];if(!o||!t.value)return;var p=t.value.split('-'),ts=new Date(+p[0],+p[1]-1,+p[2]).getTime();o[d[1]]=ts;if(o.from>o.to){if(d[1]==='from')o.to=o.from;else o.from=o.to;}o.all=false;paint();return;}
    if(t.dataset&&t.dataset.e){var k=t.dataset.e.split(':'),it=S.res&&S.res[k[0]][+k[1]];if(it){it.p.amount=parseFloat(String(t.value).replace(/[^\d.]/g,''))||0;}}});
  window.addEventListener('beforeunload',function(e){if(S.run||S.res){e.preventDefault();e.returnValue='';}});
  window.__LAB={S:S,match:match,sel:sel,paint:paint,h:{waChatIndex:waChatIndex,waStamp:waStamp,zName:zName,sha:sha,loadZip:loadZip,isDoc:isDoc,d0:d0,iso:iso,dmy:dmy,toast:toast,esc:esc,f:f}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
})();
