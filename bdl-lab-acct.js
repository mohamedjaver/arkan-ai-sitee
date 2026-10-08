/* bdl-lab-acct.js — كشف حسابات المستفيدين (Build 1411) — نظام هجين: تصنيف آلي + مراجعة يدوية لكل إيصال مشتبه به.
   ١ يقرأ إيصالات الزبون لفترة تصل إلى سنة ويجمعها حسب «المستفيد» (رقم الحساب/IBAN أولًا، ثم الاسم).
   ٢ يقارن كل مستفيد بسجل الحسابات المؤكدة وبما ظهر في إيصالات المورد نفسه.
   ٣ أخضر = حساب معروف · ذهبي = اسم مشابه بلا رقم (تحقق) · أحمر = حساب لم يعترف به أي مورد.
   ٤ تفتح إيصالات أي مستفيد واحدًا واحدًا وتحكم: «سليم — حساب المورد فلان» أو «مشبوه». حكمك يُحفظ في السجل ولا يُسأل عنه ثانية.
   لا يُقيَّد أي إيصال ولا تُمس أي تسوية. يُحفظ على هذا الجهاز: سجل الحسابات المؤكدة + نتائج القراءة (لتسريع الفحص التالي). */
(function(){'use strict';
  var L=window.__LAB,h=L.h,$=function(i){return document.getElementById(i);},esc=h.esc,f=h.f,toast=h.toast,d0=h.d0,DAY=864e5;
  var A={c:null,s:null,run:null,res:null,flt:'red',open:null,rv:null},REGK='bdl_benef_reg';
  /* ── السجل ── */
  function regLoad(){try{var r=JSON.parse(localStorage.getItem(REGK)||'[]');return Array.isArray(r)?r:[];}catch(e){return [];}}
  function regSave(r){try{localStorage.setItem(REGK,JSON.stringify(r));}catch(e){toast('تعذّر حفظ السجل على الجهاز');}}
  /* ── تطبيع ومقارنة ── */
  function acctOf(p){var a=String(p.account||'').replace(/\D/g,'');if(a.length<9){var r=String(p.receiver||'').replace(/\D/g,'');if(r.length>=9&&r.length>=String(p.receiver||'').replace(/\s/g,'').length*0.6)a=r;}return a.length>=9?a:'';}
  function nameOf(p){var n=String(p.name||'').trim();if(!n){var r=String(p.receiver||'');if(r.replace(/\D/g,'').length<r.length*0.4)n=r.trim();}return n.replace(/\s+/g,' ').slice(0,70);}
  var STOP={DE:1,DA:1,DO:1,DOS:1,DAS:1,E:1,LDA:1,LIMITADA:1,SA:1,SU:1,EI:1,COMERCIO:1,GERAL:1,PRESTACAO:1,SERVICOS:1};
  function toks(n){return String(n||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z\u0600-\u06FF ]+/g,' ').split(/\s+/).filter(function(t){return t.length>2&&!STOP[t];});}
  function sameAcct(a,b){if(!a||!b)return false;if(a===b)return true;var s=a.length<b.length?a:b,g=a.length<b.length?b:a;return s.length>=9&&g.indexOf(s)>=0||a.slice(-11)===b.slice(-11);}
  function sameName(a,b){var A1=toks(a),B1=toks(b);if(!A1.length||!B1.length)return false;if(A1.length===1||B1.length===1)return A1.join(' ')===B1.join(' ');var c=A1.filter(function(t){return B1.indexOf(t)>=0;}).length;return c>=2&&c/Math.min(A1.length,B1.length)>=0.66;}
  function cluster(items){var es=[];items.forEach(function(it){var ac=acctOf(it.p),nm=nameOf(it.p),e=null;
      if(ac)e=es.find(function(x){return x.accts.some(function(q){return sameAcct(q,ac);});});
      if(!e&&nm)e=es.find(function(x){return (!ac||!x.accts.length)&&Object.keys(x.names).some(function(q){return sameName(q,nm);});});
      if(!e&&!ac&&!nm)e=es.find(function(x){return x.blank;});
      if(!e){e={accts:[],names:{},banks:{},its:[],sum:0,min:0,max:0,blank:!ac&&!nm};es.push(e);}
      if(ac&&!e.accts.some(function(q){return sameAcct(q,ac);}))e.accts.push(ac);if(nm)e.names[nm]=(e.names[nm]||0)+1;if(it.p.bank)e.banks[it.p.bank]=(e.banks[it.p.bank]||0)+1;
      e.its.push(it);e.sum+=Number(it.p.amount)>=100?Number(it.p.amount):0;if(it.ts){if(!e.min||it.ts<e.min)e.min=it.ts;if(it.ts>e.max)e.max=it.ts;}});
    es.forEach(function(e){var top=function(o){return Object.keys(o).sort(function(a,b){return o[b]-o[a];})[0]||'';};e.name=top(e.names);e.bank=top(e.banks);e.its.sort(function(a,b){return (b.ts||0)-(a.ts||0);});});return es;}
  function classify(){var R=A.res;if(!R)return;var reg=regLoad();
    R.ents.forEach(function(e){e.st='red';e.why='لم يظهر هذا الحساب عند أي مورد ولم تؤكده من قبل';e.sup='';
      if(e.blank){e.st='gry';e.why='لم يُقرأ اسم المستفيد ولا رقم حسابه — افتح الإيصالات للتحقق';return;}
      var r=reg.find(function(q){return e.accts.some(function(a){return (q.accts||[]).some(function(b){return sameAcct(a,b);});});});
      if(r){e.sup=r.sup||'';if(r.st==='sus'){e.st='red';e.flag=true;e.why='مؤشَّر منك كحساب مشبوه'+(r.at?' · '+r.at.slice(0,10):'');}else{e.st='grn';e.why='مؤكد في السجل — حساب المورد '+(r.sup||'');}return;}
      var s=R.sents.find(function(q){return e.accts.some(function(a){return q.accts.some(function(b){return sameAcct(a,b);});});});
      if(s){e.st='grn';e.auto=true;e.sup=R.sname;e.why='ظهر الحساب نفسه في '+s.its.length+' من إيصالات المورد '+R.sname;return;}
      var rn=reg.find(function(q){return q.st!=='sus'&&(q.names||[]).some(function(n){return Object.keys(e.names).some(function(m){return sameName(n,m);});});});
      var sn=!rn&&R.sents.find(function(q){return Object.keys(q.names).some(function(n){return Object.keys(e.names).some(function(m){return sameName(n,m);});});});
      if(rn||sn){e.st='amb';e.sup=rn?(rn.sup||''):R.sname;e.why='الاسم يشبه حسابًا '+(rn?'مؤكدًا للمورد '+(rn.sup||''):'ظهر عند المورد '+R.sname)+' لكن رقم الحساب '+(e.accts.length?'مختلف':'غير مقروء')+' — تحقق';}});
    var ord={red:0,amb:1,gry:2,grn:3};R.ents.sort(function(a,b){return (b.flag?1:0)-(a.flag?1:0)||ord[a.st]-ord[b.st]||b.sum-a.sum;});}
  /* ── ذاكرة القراءة (IndexedDB) ── */
  var DB=null,MEM={};
  function idb(){return new Promise(function(res){try{if(!window.indexedDB)return res(null);var q=indexedDB.open('bdl_lab_cache',1);q.onupgradeneeded=function(){q.result.createObjectStore('r');};q.onsuccess=function(){res(q.result);};q.onerror=function(){res(null);};}catch(e){res(null);}});}
  function cget(k){return new Promise(function(res){if(MEM[k])return res(MEM[k]);if(!DB)return res(null);try{var q=DB.transaction('r').objectStore('r').get(k);q.onsuccess=function(){res(q.result||null);};q.onerror=function(){res(null);};}catch(e){res(null);}});}
  function cput(k,v){MEM[k]=v;if(!DB)return;try{DB.transaction('r','readwrite').objectStore('r').put(v,k);}catch(e){}}
  /* ── تحميل المصدر ── */
  async function pick(side,files){files=[].slice.call(files||[]);if(!files.length)return;var o={side:side,name:'',list:[],busy:true,err:''};A[side]=o;A.res=null;paint();
    try{var zf=files.find(function(x){return /\.zip$/i.test(x.name||'')||/zip/i.test(x.type||'');});
      if(zf){if(zf.size>300*1048576&&!confirm('الملف كبير ('+Math.round(zf.size/1048576)+' MB) وقد لا يتحمله الهاتف. المتابعة؟')){A[side]=null;paint();return;}
        await h.loadZip();var z=await window.JSZip.loadAsync(zf),idx=await h.waChatIndex(z);o.name=h.zName(zf.name);
        z.forEach(function(p,en){if(en.dir)return;var nm=p.split('/').pop();if(!h.isDoc(nm,'')||/STICKER|-STK-/i.test(nm))return;o.list.push({nm:nm,en:en,ts:idx[nm.toLowerCase()]||h.waStamp(nm)||0});});}
      files.forEach(function(x){if(x!==zf&&h.isDoc(x.name,x.type))o.list.push({nm:x.name,file:x,ts:x.lastModified||Date.now()});});
      o.src=files; /* الملفات الأصلية — تُحفظ على الجهاز ليُستأنف المسح إن خرجت من الصفحة */
      if(!o.name)o.name=o.list.length+' ملف';if(!o.list.length)throw new Error('لا صور ولا PDF في الملف — صدّر المحادثة مع الوسائط');
      var days=o.list.filter(function(x){return x.ts;}).map(function(x){return d0(x.ts);});o.max=days.length?Math.max.apply(null,days):d0(Date.now());o.min=days.length?Math.min.apply(null,days):o.max;
      o.to=o.max;o.from=side==='c'?Math.max(o.min,o.max-29*DAY):o.min;o.all=side==='s';
    }catch(e){o.err=(e&&e.message)||'تعذّر فتح الملف';}o.busy=false;paint();}
  function sel(o){return o.all?o.list.slice():o.list.filter(function(x){if(!x.ts)return false;var k=d0(x.ts);return k>=o.from&&k<=o.to;});}
  /* ── الفحص ── */
  /* ═══ 1413: المسح (Scan) — ١ يُفكّ ملف المورد كاملًا وتُسجَّل أسماء وأرقام حساباته  ٢ يُفحص ملف الزبون:
     كل إيصال مدفوع على حساب/اسم للمورد ولا يوجد مقابله في إيصالات المورد = يُسجَّل «للتأكد».
     يُستبعد تلقائيًا ولا يُحتفظ به: USDT والأوقية، الإيصالات غير الناجحة، وكل ما ليس على حسابات المورد. ═══ */
  function nr(v){v=String(v==null?'':v).replace(/\s+/g,'').toUpperCase();return v.length>=5?v:'';}
  function am(v){v=Number(v)||0;return v>=100&&v<1e11?v:0;}
  function dropWhy(p){var c=String(p.ccy||'').toUpperCase();
    if(/USDT|USDC|USD|MRU|MRO|EUR|CNY|AED/.test(c)||/bankily|masrvi|sedad|binance|trust ?wallet|tron|okx|bybit|bmci/i.test(p.bank||''))return 'fx';
    if(/fail|rejei|recus|cancel|pend|erro|declin|فشل|مرفوض|ملغ/i.test(p.status||''))return 'fail';return '';}
  async function readOne(x,side,R){var file=x.file;if(!file){var bl=await x.en.async('blob'),ex=x.nm.split('.').pop().toLowerCase();file=new File([bl],x.nm,{type:ex==='pdf'?'application/pdf':ex==='png'?'image/png':ex==='webp'?'image/webp':'image/jpeg'});}
    var fp=await h.sha(file),p=await cget(fp);
    if(p&&p.ccy!==undefined)R.hit++;else{var r=await Promise.race([window.ArkanRead.read(file),new Promise(function(z){setTimeout(function(){z(null);},45000);})]),g=(r&&r.parsed)||{};
      p={amount:Number(g.amount)||0,ref:g.transaction_id||g.reference||g.txn||'',bank:g.bank||g.institution||'',date:g.date||'',name:g.beneficiary||g.name||'',account:g.iban||g.account||'',receiver:g.receiver||'',ccy:String(g.currency||g.ccy||''),status:String(g.status||'')};
      if(p.amount||p.name||p.account||p.receiver)cput(fp,p);}
    return {side:side,file:file,nm:x.nm,ts:x.ts||0,pdf:/pdf$/i.test(file.type||x.nm),p:p,fp:fp};}
  /* 1414: المسح لا يضيع إن خرجت — الملفان والفترة يُحفظان على الجهاز، وعند العودة يُستأنف تلقائيًا من حيث توقف (المقروء لا يُعاد).
     الشاشة تبقى مضاءة أثناء المسح، وإن أُوقف المتصفح مؤقتًا في الخلفية يُعاد أي إيصال انقطعت قراءته. */
  var HID=0,WL=null;document.addEventListener('visibilitychange',function(){if(document.hidden)HID++;else if(A.run)wake();});
  function wake(){try{if(navigator.wakeLock&&navigator.wakeLock.request)navigator.wakeLock.request('screen').then(function(w){WL=w;},function(){});}catch(e){}}
  function unwake(){try{if(WL){WL.release();WL=null;}}catch(e){}}
  function untilVisible(){return document.hidden?new Promise(function(res){var fn=function(){if(!document.hidden){document.removeEventListener('visibilitychange',fn);res();}};document.addEventListener('visibilitychange',fn);}):Promise.resolve();}
  async function resume(){try{var j=await h.sess.get('job:acct');if(!j||!j.s||!j.c||A.res||A.run)return;
      toast('استئناف المسح من حيث توقف…');await pick('s',j.s);await pick('c',j.c);if(!A.s||A.s.err||!A.c||A.c.err){h.sess.del('job:acct');return;}
      A.c.all=!!j.all;if(!j.all){A.c.from=j.from;A.c.to=j.to;}paint();start(true);}catch(e){}}
  async function start(resumed){var P=A.s?A.s.list.slice(0,3000):[],C=A.c?sel(A.c).slice(0,3000):[];if(!P.length||!C.length)return;if(!DB)DB=await idb();
    if(!resumed)h.sess.put('job:acct',{s:A.s.src,c:A.c.src,from:A.c.from,to:A.c.to,all:!!A.c.all,at:Date.now()}).then(function(ok){if(!ok)toast('الملف كبير — إن خرجت من الصفحة لن يُستأنف المسح تلقائيًا');});
    wake();
    var R={ph:1,n:P.length,d:0,hit:0,stop:false,t0:Date.now(),k:{acc:0,drop:0,on:0},per:perTxt(A.c)};A.run=R;A.res=null;paint();
    var seen={},accSeen={};
    async function pool(list,side,fn){var qi=0;async function wk(){while(qi<list.length&&!R.stop){var x=list[qi++];R.cur=x.nm;await untilVisible();try{var h0=HID,it=await readOne(x,side,R);if(HID!==h0&&!it.p.amount&&!it.p.name&&!it.p.account){await untilVisible();it=await readOne(x,side,R);}if(!seen[side+it.fp]){seen[side+it.fp]=1;fn(it);}}catch(e){}R.d++;paint();}}
      var w=[];for(var i=0;i<6;i++)w.push(wk());await Promise.all(w);}
    /* ١ المورد */
    var S=[];await pool(P,'s',function(it){if(dropWhy(it.p))return;S.push(it);var ac=acctOf(it.p);if(ac&&!accSeen[ac.slice(-11)]){accSeen[ac.slice(-11)]=1;R.k.acc++;}});
    if(R.stop){A.run=null;unwake();h.sess.del('job:acct');paint();toast('أُوقف المسح قبل اكتمال ملف المورد');return;}
    var sname=A.s.name||'',sents=cluster(S).filter(function(e){return !e.blank;}),reg=regLoad(),nw=0;
    sents.forEach(function(q){if(!q.accts.length)return;if(reg.some(function(r){return q.accts.some(function(x){return (r.accts||[]).some(function(b){return sameAcct(x,b);});});}))return;
      reg.push({accts:q.accts.slice(),names:Object.keys(q.names).slice(0,6),bank:q.bank,sup:sname,st:'ok',src:'auto',at:new Date().toISOString()});nw++;});if(nw)regSave(reg);
    var SA=[],SN=[];sents.forEach(function(q){SA=SA.concat(q.accts);SN=SN.concat(Object.keys(q.names));});
    reg.forEach(function(r){if(r.st!=='sus'&&r.sup===sname){SA=SA.concat(r.accts||[]);SN=SN.concat(r.names||[]);}});
    R.k.acc=sents.length;
    function onSup(p){var ac=acctOf(p),nm=nameOf(p);if(ac&&SA.some(function(x){return sameAcct(x,ac);}))return 'acct';if(nm&&SN.some(function(n){return sameName(n,nm);}))return 'name';return '';}
    /* ٢ الزبون */
    R.ph=2;R.n=C.length;R.d=0;R.t0=Date.now();paint();var cnt={fx:0,fail:0,other:0},on=[],un=[],nC=0;
    await pool(C,'c',function(it){nC++;var w=dropWhy(it.p);if(w){cnt[w]++;R.k.drop++;return;}var o=onSup(it.p);
      if(o){it.on=o;on.push(it);R.k.on++;}else if(!am(it.p.amount)&&!acctOf(it.p)&&!nameOf(it.p)){it.g='u';un.push(it);}else{cnt.other++;R.k.drop++;}});
    /* ٣ هل أُرسل للمورد؟ — رقم العملية أولًا، ثم المبلغ نفسه (الأقرب وقتًا)، واحد لواحد */
    var rest=S.slice();on.forEach(function(it){var rf=nr(it.p.ref);if(!rf)return;var j=rest.findIndex(function(s){return nr(s.p.ref)===rf;});if(j>=0){rest.splice(j,1);it.sent=1;}});
    on.forEach(function(it){if(it.sent)return;var v=am(it.p.amount);if(!v)return;var best=-1,bd=Infinity;rest.forEach(function(s,j){if(am(s.p.amount)===v){var d=Math.abs((s.ts||0)-(it.ts||0));if(d<bd){bd=d;best=j;}}});if(best>=0){rest.splice(best,1);it.sent=1;}});
    var flag=on.filter(function(x){return !x.sent;});flag.forEach(function(it){it.g='f';it.why=it.on==='acct'?'على رقم حساب المورد':'باسم المورد — رقم الحساب '+(acctOf(it.p)?'مختلف':'غير مقروء');});
    flag.sort(function(x,y){return (y.ts||0)-(x.ts||0);});
    try{localStorage.removeItem('bdl_scan_chk');}catch(e){}
    A.res={scan:1,flag:flag,un:un,cnt:cnt,sent:on.length-flag.length,nC:nC,nS:S.length,accs:sents.length,sname:sname,cname:A.c.name||'',stopped:R.stop,hit:R.hit,learned:nw,per:R.per};
    persist();A.run=null;unwake();h.sess.del('job:acct');paint();window.scrollTo({top:0,behavior:'smooth'});}
  function persist(){var R=A.res;if(!R)return;h.sess.save('acct',{scan:1,per:R.per||'',cnt:R.cnt,sent:R.sent,nC:R.nC,nS:R.nS,accs:R.accs,sname:R.sname,cname:R.cname,stopped:!!R.stopped},
      R.flag.concat(R.un).map(function(it){return {file:it.file,data:{g:it.g,nm:it.nm,ts:it.ts,pdf:it.pdf,p:it.p,fp:it.fp,why:it.why||''}};})).then(function(ok){if(!ok)toast('تعذّر حفظ الجلسة على الجهاز — لا تغادر الصفحة قبل إنهاء المراجعة');});}
  async function restore(){try{var m=await h.sess.load('acct');if(!m||!m.meta||A.res||A.run)return;if(!m.meta.scan){h.sess.clear('acct');return;}
      var all=(m.rows||[]).map(function(r,i){return {g:r.g,nm:r.nm,ts:r.ts,pdf:r.pdf,p:r.p||{},fp:r.fp,why:r.why,file:null,_si:r._f?i:-1};}),mt=m.meta;
      A.res={scan:1,flag:all.filter(function(x){return x.g==='f';}),un:all.filter(function(x){return x.g==='u';}),cnt:mt.cnt||{fx:0,fail:0,other:0},sent:mt.sent||0,nC:mt.nC||0,nS:mt.nS||0,accs:mt.accs||0,sname:mt.sname||'',cname:mt.cname||'',per:mt.per||'',stopped:mt.stopped,restored:m.at,skipped:m.skipped||0};paint();try{var y0=+sessionStorage.getItem('lab_y_a')||0;if(y0)setTimeout(function(){window.scrollTo(0,y0);},60);}catch(e){}}catch(e){}}
  function chk(){try{return JSON.parse(localStorage.getItem('bdl_scan_chk')||'{}')||{};}catch(e){return {};}}
  async function sview(g,k){var R=A.res,L=R&&(g==='u'?R.un:R.flag);if(!L||!L.length)return;k=Math.max(0,Math.min(L.length-1,k||0));if(!A.sv){try{A.y=window.scrollY;sessionStorage.setItem('lab_y_a',String(A.y));}catch(e){}}A.sv={g:g,k:k};A.last=g+':'+k;var it=L[k],v=$('laRv');
    if(!v){v=document.createElement('div');v.id='laRv';document.body.appendChild(v);}
    if(!it.file&&it._si>=0)it.file=await h.sess.file('acct',it._si,it.nm,it.pdf);if(it._u){URL.revokeObjectURL(it._u);it._u='';}if(it.file)it._u=URL.createObjectURL(it.file);var p=it.p||{},c=chk()[it.fp];
    v.innerHTML='<header><div><b>'+(g==='u'?'إيصال لم يُقرأ':'للتأكد — '+esc(it.why||''))+'</b><small>إيصال '+(k+1)+' من '+L.length+(it.ts?' · '+h.dmy(it.ts):'')+(c?' · '+(c==='ok'?'سليم ✓':'مشكلة'):'')+'</small></div><button type="button" data-sv="x">✕ إغلاق</button></header>'+
      '<div class="rd"><span><small>المبلغ</small><b>'+(am(p.amount)?f(p.amount):'لم يُقرأ')+'</b></span><span><small>المستفيد</small><b>'+esc(nameOf(p)||'—')+'</b></span><span><small>المرجع</small><b dir="ltr">'+esc(nr(p.ref)||'—')+'</b></span></div>'+
      '<div class="bd">'+(!it._u?'<p style="color:#9FB0CC;padding:30px 16px;text-align:center;font-size:13px">صورة هذا الإيصال لم تُحفظ على الجهاز. أعد المسح لعرضها (القراءة من الذاكرة فورًا).</p>':it.pdf?'<iframe src="'+it._u+'"></iframe>':'<img src="'+it._u+'" alt="">')+'</div>'+
      '<footer><div class="nv"><button type="button" data-sv="p"'+(k?'':' disabled')+'>‹ السابق</button><button type="button" data-sv="n"'+(k<L.length-1?'':' disabled')+'>التالي ›</button></div><div class="dc"><button type="button" class="ok" data-sv="ok">سليم — أُرسل / لا مشكلة</button><button type="button" class="sus" data-sv="bad">مشكلة</button></div></footer>';
    v.classList.add('on');}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-sv],[data-so],[data-sa]');if(!b)return;var R=A.res;
    if(b.dataset.so){var q=b.dataset.so.split(':');sview(q[0],+q[1]);return;}
    if(b.dataset.sa==='new'){if(confirm('إنهاء هذه الجلسة وبدء مسح جديد؟\nالنتيجة الحالية وصورها تُمسح من الجهاز. حسابات المورد المسجَّلة وذاكرة القراءة تبقيان.')){A.c=A.s=A.res=null;A.last=null;h.sess.clear('acct');h.sess.del('job:acct');try{sessionStorage.removeItem('lab_y_a');}catch(x){}try{localStorage.removeItem('bdl_scan_chk');}catch(x){}paint();}return;}
    if(b.dataset.sa==='copy'&&R){var txt='BDL · إيصالات على حسابات المورد '+R.sname+' لم تُرسل له — الزبون '+R.cname+'\n\n'+(R.flag.map(function(it){return '• '+(am(it.p.amount)?f(it.p.amount):'لم يُقرأ')+' — '+(nr(it.p.ref)||'بلا مرجع')+(it.ts?' — '+h.dmy(it.ts):'')+' — '+(nameOf(it.p)||'');}).join('\n')||'لا شيء');
      (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){toast('نُسخت القائمة');},function(){prompt('انسخ:',txt);});return;}
    var k=b.dataset.sv,s=A.sv;if(!k||!s)return;var L=s.g==='u'?R.un:R.flag;
    if(k==='x'){$('laRv').classList.remove('on');A.sv=null;paint();return;}if(k==='p'){sview(s.g,s.k-1);return;}if(k==='n'){sview(s.g,s.k+1);return;}
    var o=chk();o[L[s.k].fp]=k;try{localStorage.setItem('bdl_scan_chk',JSON.stringify(o));}catch(x){}
    if(s.k<L.length-1)sview(s.g,s.k+1);else{$('laRv').classList.remove('on');A.sv=null;paint();toast('انتهت المراجعة');}});
  /* ── الحكم اليدوي ── */
  function decide(i,st,sup){var R=A.res,e=R&&R.ents[i];if(!e)return;if(e.blank){toast('لا اسم ولا رقم حساب مقروء لهذه المجموعة — لا يمكن حفظها في السجل');return;}
    var reg=regLoad(),key=function(q){return e.accts.length?e.accts.some(function(a){return (q.accts||[]).some(function(b){return sameAcct(a,b);});}):(!((q.accts||[]).length)&&(q.names||[]).some(function(n){return Object.keys(e.names).some(function(m){return sameName(n,m);});}));};
    reg=reg.filter(function(q){return !key(q);});
    if(st)reg.push({accts:e.accts.slice(),names:Object.keys(e.names).slice(0,6),bank:e.bank,sup:st==='ok'?(sup||''):'',st:st,at:new Date().toISOString()});
    regSave(reg);e.flag=false;classify();A.open=null;paint();toast(st==='ok'?'حُفظ: حساب المورد '+sup:st==='sus'?'أُشّر كحساب مشبوه':'أُزيل من السجل');}
  function sups(){var o={};regLoad().forEach(function(q){if(q.sup&&q.st!=='sus')o[q.sup]=1;});if(A.s&&A.s.name)o[A.s.name]=1;return Object.keys(o);}
  /* ── المراجع: إيصالات المستفيد واحدًا واحدًا ── */
  async function review(i,k){var R=A.res,e=R&&R.ents[i];if(!e)return;k=Math.max(0,Math.min(e.its.length-1,k||0));A.rv={i:i,k:k};var it=e.its[k],v=$('laRv');
    if(!v){v=document.createElement('div');v.id='laRv';document.body.appendChild(v);}
    if(!it.file&&it._si>=0)it.file=await h.sess.file('acct',it._si,it.nm,it.pdf);
    if(it._u){URL.revokeObjectURL(it._u);it._u='';}if(it.file)it._u=URL.createObjectURL(it.file);var p=it.p||{};

    v.innerHTML='<header><div><b>'+esc(e.name||'مستفيد غير مقروء')+'</b><small>إيصال '+(k+1)+' من '+e.its.length+(it.ts?' · '+h.dmy(it.ts):'')+'</small></div><button type="button" data-rv="x">إغلاق</button></header>'+
      '<div class="rd"><span><small>المبلغ</small><b>'+(Number(p.amount)>=100?f(p.amount):'لم يُقرأ')+'</b></span><span><small>المستفيد كما قُرئ</small><b>'+esc(nameOf(p)||'—')+'</b></span><span><small>الحساب</small><b dir="ltr">'+esc(acctOf(p)||'—')+'</b></span></div>'+
      '<div class="bd">'+(!it._u?'<p style="color:#9FB0CC;padding:30px 16px;text-align:center;font-size:13px">صورة هذا الإيصال لم تُحفظ على الجهاز (حجم الملفات كبير). البيانات المقروءة أعلاه محفوظة — لعرض الصورة أعد اختيار ملف ZIP وافحص الفترة نفسها (تُقرأ من الذاكرة فورًا).</p>':it.pdf?'<iframe src="'+it._u+'"></iframe>':'<img src="'+it._u+'" alt="">')+'</div>'+
      '<footer><div class="nv"><button type="button" data-rv="p"'+(k?'':' disabled')+'>‹ السابق</button><button type="button" data-rv="n"'+(k<e.its.length-1?'':' disabled')+'>التالي ›</button></div>'+
      '<div class="dc"><input id="laRvSup" list="laSups" placeholder="اسم المورد صاحب الحساب" value="'+esc(e.sup||R.sname||'')+'"><button type="button" class="ok" data-rv="ok">سليم — حساب هذا المورد</button><button type="button" class="sus" data-rv="sus">مشبوه</button></div></footer>';
    v.classList.add('on');}
  /* ── العرض ── */
  function perTxt(o){return o.all?'كل الملف':(o.from===o.to?h.dmy(o.from).slice(0,10):'من '+h.dmy(o.from).slice(0,10)+' إلى '+h.dmy(o.to).slice(0,10));}
  function srcCard(k,title,hint){var o=A[k],x='<section class="sd '+k+'"><header><b>'+title+'</b><small>'+hint+'</small></header>';
    if(!o)x+='<button type="button" class="pk" data-ap="'+k+'"><i>＋</i>اختر ملف ZIP أو صورًا / PDF</button>';
    else if(o.busy)x+='<div class="ld"><span class="sp"></span> جارٍ فتح الملف…</div>';
    else if(o.err)x+='<div class="er">'+esc(o.err)+'</div><button type="button" class="pk" data-ap="'+k+'">اختيار ملف آخر</button>';
    else{x+='<div class="nm"><b>'+esc(o.name)+'</b><span>'+o.list.length+' إيصالًا في الملف · '+h.dmy(o.min).slice(0,10)+' – '+h.dmy(o.max).slice(0,10)+'</span><button type="button" data-ap="'+k+'">تغيير</button></div>';
      if(k==='s')x+='<div class="ct"><b>'+o.list.length+'</b> إيصالًا — يُفكّ الملف كاملًا لتسجيل كل حسابات المورد</div>';
      else{var n=sel(o).length,q=function(id,lab,on){return '<button type="button" data-aq="c:'+id+'"'+(on?' class="on"':'')+'>'+lab+'</button>';},sp=function(dn){return !o.all&&o.to===o.max&&o.from===Math.max(o.min,o.max-(dn-1)*DAY);};
        x+='<div class="pt">تاريخ المطابقة الذي تريده</div><div class="qk">'+q('1','آخر يوم',sp(1))+q('2','يومان',sp(2))+q('7','7 أيام',sp(7))+q('30','30 يومًا',sp(30))+q('365','سنة',sp(365))+q('all','الكل',o.all)+'</div>'+
          '<div class="rg"><label><small>من</small><input type="date" data-ad="c:from" value="'+h.iso(o.from)+'" min="'+h.iso(o.min)+'" max="'+h.iso(o.max)+'"></label><label><small>إلى</small><input type="date" data-ad="c:to" value="'+h.iso(o.to)+'" min="'+h.iso(o.min)+'" max="'+h.iso(o.max)+'"></label></div>'+
          '<div class="ct"><b>'+n+'</b> إيصالًا في '+perTxt(o)+(n>3000?' — سيُفحص أحدث 3000':'')+'</div>';}}
    return x+'</section>';}
  function entCard(e,i){var col={red:'r',amb:'a',grn:'g',gry:'y'}[e.st],lab={red:e.flag?'مشبوه':'غير معروف',amb:'تحقق',grn:e.auto?'معروف':'مؤكد',gry:'غير مقروء'}[e.st],op=A.open===i;
    var x='<div class="en '+col+'"><div class="eh"><div><b>'+esc(e.name||'مستفيد غير مقروء')+'</b><small dir="ltr">'+esc([e.bank,e.accts[0]?('…'+e.accts[0].slice(-8)):'بلا رقم حساب'].filter(Boolean).join(' · '))+(e.accts.length>1?' +'+(e.accts.length-1):'')+'</small></div><span class="ch">'+lab+'</span></div>'+
      '<div class="em"><span><small>إيصالات</small><b>'+e.its.length+'</b></span><span><small>المجموع</small><b>'+f(e.sum)+'</b></span><span><small>الفترة</small><b>'+(e.min?h.dmy(e.min).slice(0,10)+(d0(e.max)!==d0(e.min)?' – '+h.dmy(e.max).slice(0,10):''):'—')+'</b></span></div>'+
      '<p>'+esc(e.why)+'</p><div class="ea"><button type="button" class="p" data-ar="'+i+'">مراجعة الإيصالات ('+e.its.length+')</button><button type="button" data-ao="'+i+'">'+(op?'إخفاء':'قرار')+'</button></div>';
    if(op)x+='<div class="ed"><input id="laSupIn" list="laSups" placeholder="اسم المورد صاحب الحساب" value="'+esc(e.sup||A.res.sname||'')+'"><div><button type="button" class="ok" data-adz="'+i+':ok">سليم — حساب هذا المورد</button><button type="button" class="sus" data-adz="'+i+':sus">مشبوه</button>'+((e.st==='grn'&&!e.auto)||e.flag?'<button type="button" data-adz="'+i+':clr">إزالة من السجل</button>':'')+'</div></div>';
    return x+'</div>';}
  function srow(it,i,g){var p=it.p||{},c=chk()[it.fp];return '<div class="rw '+(g==='u'?'a':'r')+(A.last===g+':'+i?' cur':'')+'" id="sr-'+g+i+'"><div class="mn"><b>'+(am(p.amount)?f(p.amount):'لم يُقرأ المبلغ')+'</b><span>'+esc([nr(p.ref)||'بلا مرجع',it.ts?h.dmy(it.ts):'',nameOf(p)].filter(Boolean).join(' · '))+'</span>'+(it.why?'<span style="color:var(--red);direction:rtl;text-align:start">'+esc(it.why)+'</span>':'')+'</div>'+(c?'<em class="chk '+c+'">'+(c==='ok'?'سليم ✓':'مشكلة')+'</em>':'')+'<button type="button" data-so="'+g+':'+i+'">فتح</button></div>';}
  function paint(){var m=$('laMain');if(!m)return;var R=A.run,x='';
    if(R){var p=Math.round(R.d/Math.max(1,R.n)*100),el=(Date.now()-R.t0)/1000,eta=R.d>8?Math.round(el/R.d*(R.n-R.d)):0;
      x='<section class="pg"><div class="st"><span class="'+(R.ph===1?'on':'dn')+'">١ مسح ملف المورد</span><span class="'+(R.ph===2?'on':'')+'">٢ فحص ملف الزبون</span><span>٣ النتيجة</span></div><div class="br"><i style="width:'+p+'%"></i></div>'+
        '<div class="pr2">تاريخ المطابقة: <b>'+esc(R.per)+'</b></div><div class="tx"><b>'+p+'%</b>'+(R.ph===1?'تفكيك وقراءة ملف المورد كاملًا ':'فحص إيصالات الزبون ')+R.d+' / '+R.n+(eta?' · الباقي نحو '+(eta>90?Math.round(eta/60)+' د':eta+' ث'):'')+'</div><div class="fn">'+esc(R.cur||'')+'</div>'+
        '<div class="kp"><div class="g"><b>'+R.k.acc+'</b><small>حسابات المورد</small></div><div class="y"><b>'+R.k.drop+'</b><small>مُستبعد تلقائيًا</small></div><div class="a"><b>'+R.k.on+'</b><small>على حسابات المورد</small></div></div>'+
        '<div class="nt">يمكنك ترك الصفحة — يُستأنف المسح تلقائيًا عند عودتك من حيث توقف.</div><button type="button" class="bt ln" data-aa="stop">إيقاف</button></section>';
      var pg=m.querySelector('.pg[data-live]');if(pg){var t=document.createElement('div');t.innerHTML=x;var np=t.firstChild; /* تحديث الأرقام فقط — الشاشة ثابتة لا تُعاد بناؤها */
        pg.querySelector('.br i').style.width=p+'%';['.st','.tx','.fn','.kp','.pr2'].forEach(function(q){var o=pg.querySelector(q),n=np.querySelector(q);if(o&&n&&o.innerHTML!==n.innerHTML)o.innerHTML=n.innerHTML;});return;}
      m.innerHTML=x;m.querySelector('.pg').setAttribute('data-live','1');return;}
    if(A.res&&A.res.scan){var S=A.res,fs=S.flag.reduce(function(t,it){return t+am(it.p.amount);},0),dr=S.cnt.fx+S.cnt.fail+S.cnt.other;
      x='<section class="rs">'+(S.restored?'<div class="rst">مسح محفوظ من '+new Date(S.restored).toLocaleString('en-GB',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' — يبقى حتى تنهيه أنت</div>':'')+
        '<div class="vd '+(S.flag.length?'no':'ok')+'"><b>'+(S.flag.length?S.flag.length+' إيصالًا على حسابات المورد لم تُرسل له':'✓ كل ما دُفع على حسابات المورد موجود عنده')+'</b><span>'+(S.per?'تاريخ المطابقة: '+esc(S.per)+' — ':'')+'المورد '+esc(S.sname)+' · '+S.accs+' حسابًا من '+S.nS+' إيصالًا — الزبون '+esc(S.cname)+' · '+S.nC+' إيصالًا'+(S.stopped?' — أُوقف قبل اكتماله':'')+'</span></div>'+
        '<div class="kp"><div class="r"><b>'+S.flag.length+'</b><small>للتأكد</small><i>'+f(fs)+'</i></div><div class="g"><b>'+S.sent+'</b><small>موجود عند المورد ✓</small></div><div class="y"><b>'+dr+'</b><small>مُستبعد تلقائيًا</small></div></div>'+
        '<div class="nt">المستبعد: '+S.cnt.other+' على حسابات لا تخص المورد · '+S.cnt.fx+' USDT/أوقية · '+S.cnt.fail+' غير ناجحة. لم يُحتفظ بها.</div>'+
        (S.flag.length?'<h3 class="r">للتأكد — دُفعت على حسابات المورد ولا مقابل لها عنده ('+S.flag.length+')</h3>'+S.flag.map(function(it,i){return srow(it,i,'f');}).join(''):'')+
        (S.un.length?'<details class="mt"><summary style="color:#8A6100">إيصالات لم تُقرأ ('+S.un.length+') — افتحها إن أردت</summary><div style="padding:8px">'+S.un.map(function(it,i){return srow(it,i,'u');}).join('')+'</div></details>':'')+
        '<div class="bs"><button type="button" class="bt" data-sa="copy">نسخ القائمة</button><button type="button" class="bt ln" data-sa="new">إنهاء الجلسة ومسح جديد</button></div></section>';
      var keepY=A.y!=null?A.y:window.scrollY,opn=m.querySelector('details.mt')&&m.querySelector('details.mt').open;m.innerHTML=x;if(opn&&m.querySelector('details.mt'))m.querySelector('details.mt').open=true;
      if(!A.sv){window.scrollTo(0,keepY);var cr=A.last&&$('sr-'+A.last.replace(':',''));if(cr&&A.y!=null){var bx=cr.getBoundingClientRect();if(bx.top<80||bx.bottom>window.innerHeight-90)cr.scrollIntoView&&cr.scrollIntoView({block:'center'});}A.y=null;}return;}
    var c=A.c,s=A.s,rdy=function(o){return o&&!o.busy&&!o.err&&sel(o).length;},ok=rdy(c)&&rdy(s),n=ok?Math.min(3000,sel(s).length)+Math.min(3000,sel(c).length):0;
    x=srcCard('s','الخطوة ١ — ملف المورد','يُفكّ كاملًا وتُسجَّل أسماء وأرقام حساباته')+srcCard('c','الخطوة ٢ — ملف الزبون','يُبحث فيه عن إيصالات على حسابات المورد في التاريخ الذي تختاره')+
      '<button type="button" class="bt go" data-aa="go"'+(ok?'':' disabled')+'>'+(ok?'ابدأ المسح — '+s.list.length+' مورد + '+Math.min(3000,sel(c).length)+' زبون':'اختر ملف المورد ثم ملف الزبون')+'</button>'+
      '<div class="how"><b>كيف يعمل</b>١ يُقرأ ملف المورد كاملًا وتُسجَّل أسماء وأرقام حساباته. ٢ يُفحص ملف الزبون: كل إيصال مدفوع على حساب أو اسم للمورد ولا يوجد مقابله في إيصالات المورد يُسجَّل وحده <u>للتأكد</u>. يُستبعد تلقائيًا: USDT والأوقية، الإيصالات غير الناجحة، وكل ما ليس على حسابات المورد.</div>';
    m.innerHTML=x;}
  document.addEventListener('click',function(e){var t=e.target,b;if(!t.closest)return;
    if((b=t.closest('[data-ap]'))){A._side=b.dataset.ap;var i=$('laFile');i.value='';i.click();return;}
    if((b=t.closest('[data-aq]'))){var q=b.dataset.aq.split(':'),o=A[q[0]];if(!o)return;o.all=q[1]==='all';if(!o.all){o.to=o.max;o.from=Math.max(o.min,o.max-(+q[1]-1)*DAY);}paint();return;}
    if((b=t.closest('[data-af]'))){A.flt=b.dataset.af;A.open=null;paint();return;}
    if((b=t.closest('[data-ar]'))){review(+b.dataset.ar,0);return;}
    if((b=t.closest('[data-ao]'))){A.open=A.open===+b.dataset.ao?null:+b.dataset.ao;paint();return;}
    if((b=t.closest('[data-adz]'))){var z=b.dataset.adz.split(':'),sup=($('laSupIn')&&$('laSupIn').value.trim())||'';if(z[1]==='ok'&&!sup){toast('اكتب اسم المورد صاحب الحساب أولًا');return;}decide(+z[0],z[1]==='clr'?null:z[1],sup);return;}
    if((b=t.closest('[data-rv]'))){var k=b.dataset.rv,rv=A.rv;if(!rv)return;
      if(k==='x'){$('laRv').classList.remove('on');A.rv=null;return;}if(k==='p'){review(rv.i,rv.k-1);return;}if(k==='n'){review(rv.i,rv.k+1);return;}
      var sp=($('laRvSup')&&$('laRvSup').value.trim())||'';if(k==='ok'&&!sp){toast('اكتب اسم المورد صاحب الحساب أولًا');return;}$('laRv').classList.remove('on');A.rv=null;decide(rv.i,k,sp);return;}
    if((b=t.closest('[data-aa]'))){var a=b.dataset.aa;
      if(a==='go')start();else if(a==='stop'){if(A.run)A.run.stop=true;b.disabled=true;b.textContent='جارٍ الإيقاف…';}
      else if(a==='new'){if(confirm('إنهاء هذه الجلسة وبدء فحص جديد؟\nنتيجة الفحص الحالي وصوره تُمسح من الجهاز. سجل الحسابات وذاكرة القراءة يبقيان.')){A.c=A.s=A.res=null;h.sess.clear('acct');paint();}}
      else if(a==='copy'){var bad=A.res.ents.filter(function(e){return e.st==='red'||e.st==='amb';}),txt='BDL · حسابات تحتاج تحقق — '+A.res.cname+'\n\n'+(bad.map(function(e){return '• '+(e.name||'غير مقروء')+' · '+(e.bank||'')+' · '+(e.accts[0]||'بلا رقم')+'\n  '+e.its.length+' إيصالًا · '+f(e.sum)+' · '+({red:'غير معروف',amb:'تحقق'}[e.st]);}).join('\n')||'لا شيء');
        (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){toast('نُسخت القائمة');},function(){prompt('انسخ:',txt);});}
      else if(a==='exp'){var bl=new Blob([JSON.stringify(regLoad(),null,1)],{type:'application/json'}),l=document.createElement('a');l.href=URL.createObjectURL(bl);l.download='BDL-سجل-الحسابات-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(l);l.click();l.remove();}
      else if(a==='imp'){A._side='reg';var fi=$('laFile');fi.value='';fi.click();}}});
  document.addEventListener('change',function(e){var t=e.target;
    if(t.id==='laFile'){if(A._side==='reg'){var fl=t.files&&t.files[0];if(!fl)return;var fr=new FileReader();fr.onload=function(){try{var inc=JSON.parse(fr.result);if(!Array.isArray(inc))throw 0;var reg=regLoad(),n=0;inc.forEach(function(q){if(!q||!(q.accts||q.names))return;if(!reg.some(function(r){return (q.accts||[]).some(function(a){return (r.accts||[]).some(function(b){return sameAcct(a,b);});});})){reg.push(q);n++;}});regSave(reg);toast('استُورد '+n+' حسابًا');if(A.res)classify();paint();}catch(x){toast('ملف السجل غير صالح');}};fr.readAsText(fl);return;}
      pick(A._side||'c',t.files);return;}
    if(t.dataset&&t.dataset.ad){var d=t.dataset.ad.split(':'),o=A[d[0]];if(!o||!t.value)return;var p=t.value.split('-');o[d[1]]=new Date(+p[0],+p[1]-1,+p[2]).getTime();if(o.from>o.to){if(d[1]==='from')o.to=o.from;else o.from=o.to;}o.all=false;paint();}});
  window.addEventListener('popstate',function(){if(A.sv){A.sv=null;setTimeout(paint,0);}});
  window.__LABA={A:A,cluster:cluster,classify:classify,sameAcct:sameAcct,sameName:sameName,acctOf:acctOf,nameOf:nameOf,regLoad:regLoad,paint:paint};
  /* تبديل الوضعين */
  function mode(k){$('lbMain').style.display=k==='m'?'':'none';$('laMain').style.display=k==='a'?'':'none';[].forEach.call(document.querySelectorAll('#lbMode button'),function(b){b.classList.toggle('on',b.dataset.md===k);});if(k==='a')paint();try{localStorage.setItem('bdl_lab_mode2',k);}catch(e){}}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#lbMode button');if(b)mode(b.dataset.md);});
  function init(){var k='a';try{k=localStorage.getItem('bdl_lab_mode2')||'a';}catch(e){}mode(k==='m'?'m':'a');restore().then(resume);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
