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
      if(!o.name)o.name=o.list.length+' ملف';if(!o.list.length)throw new Error('لا صور ولا PDF في الملف — صدّر المحادثة مع الوسائط');
      var days=o.list.filter(function(x){return x.ts;}).map(function(x){return d0(x.ts);});o.max=days.length?Math.max.apply(null,days):d0(Date.now());o.min=days.length?Math.min.apply(null,days):o.max;
      o.to=o.max;o.from=side==='c'?Math.max(o.min,o.max-29*DAY):o.min;o.all=side==='s';
    }catch(e){o.err=(e&&e.message)||'تعذّر فتح الملف';}o.busy=false;paint();}
  function sel(o){return o.all?o.list.slice():o.list.filter(function(x){if(!x.ts)return false;var k=d0(x.ts);return k>=o.from&&k<=o.to;});}
  /* ── الفحص ── */
  async function start(){var C=sel(A.c).slice(0,2500),P=A.s&&!A.s.err?sel(A.s).slice(0,2500):[];if(!C.length)return;if(!DB)DB=await idb();
    var R={n:C.length+P.length,d:0,hit:0,stop:false,t0:Date.now(),c:[],s:[]};A.run=R;A.res=null;paint();var all=C.map(function(x){return [x,'c'];}).concat(P.map(function(x){return [x,'s'];})),qi=0,seen={c:{},s:{}};
    async function wk(){while(qi<all.length&&!R.stop){var q=all[qi++],x=q[0],side=q[1];R.cur=x.nm;try{
          var file=x.file;if(!file){var bl=await x.en.async('blob'),ex=x.nm.split('.').pop().toLowerCase();file=new File([bl],x.nm,{type:ex==='pdf'?'application/pdf':ex==='png'?'image/png':ex==='webp'?'image/webp':'image/jpeg'});}
          var fp=await h.sha(file);if(seen[side][fp]){R.d++;continue;}seen[side][fp]=1;
          var p=await cget(fp);if(p)R.hit++;else{var r=await Promise.race([window.ArkanRead.read(file),new Promise(function(z){setTimeout(function(){z(null);},60000);})]),g=(r&&r.parsed)||{};
            p={amount:Number(g.amount)||0,ref:g.transaction_id||g.reference||g.txn||'',bank:g.bank||g.institution||'',date:g.date||'',name:g.beneficiary||g.name||'',account:g.iban||g.account||'',receiver:g.receiver||''};
            if(p.amount||p.name||p.account||p.receiver)cput(fp,p);}
          R[side].push({side:side,file:file,nm:x.nm,ts:x.ts||0,pdf:/pdf$/i.test(file.type||x.nm),p:p,fp:fp});
        }catch(e){}R.d++;if(R.d%2===0||R.d===all.length)paint();}}
    await Promise.all([wk(),wk(),wk()]);
    A.res={ents:cluster(R.c),sents:cluster(R.s).filter(function(e){return !e.blank;}),sname:(A.s&&A.s.name)||'',cname:A.c.name,nC:R.c.length,nS:R.s.length,stopped:R.stop,hit:R.hit};
    /* التعلّم الآلي: كل حساب ظهر في إيصالات المورد نفسه يُضاف إلى السجل باسمه (مصدره «آلي») — فلا يحتاج ملف المورد في الفحص التالي */
    if(A.res.sname&&A.res.sents.length){var reg=regLoad(),nw=0;A.res.sents.forEach(function(q){if(!q.accts.length)return;
        if(reg.some(function(r){return q.accts.some(function(a){return (r.accts||[]).some(function(b){return sameAcct(a,b);});});}))return;
        reg.push({accts:q.accts.slice(),names:Object.keys(q.names).slice(0,6),bank:q.bank,sup:A.res.sname,st:'ok',src:'auto',at:new Date().toISOString()});nw++;});
      if(nw){regSave(reg);A.res.learned=nw;}}
    A.run=null;classify();A.flt=A.res.ents.some(function(e){return e.st==='red';})?'red':'all';paint();window.scrollTo({top:0,behavior:'smooth'});}
  /* ── الحكم اليدوي ── */
  function decide(i,st,sup){var R=A.res,e=R&&R.ents[i];if(!e)return;if(e.blank){toast('لا اسم ولا رقم حساب مقروء لهذه المجموعة — لا يمكن حفظها في السجل');return;}
    var reg=regLoad(),key=function(q){return e.accts.length?e.accts.some(function(a){return (q.accts||[]).some(function(b){return sameAcct(a,b);});}):(!((q.accts||[]).length)&&(q.names||[]).some(function(n){return Object.keys(e.names).some(function(m){return sameName(n,m);});}));};
    reg=reg.filter(function(q){return !key(q);});
    if(st)reg.push({accts:e.accts.slice(),names:Object.keys(e.names).slice(0,6),bank:e.bank,sup:st==='ok'?(sup||''):'',st:st,at:new Date().toISOString()});
    regSave(reg);e.flag=false;classify();A.open=null;paint();toast(st==='ok'?'حُفظ: حساب المورد '+sup:st==='sus'?'أُشّر كحساب مشبوه':'أُزيل من السجل');}
  function sups(){var o={};regLoad().forEach(function(q){if(q.sup&&q.st!=='sus')o[q.sup]=1;});if(A.s&&A.s.name)o[A.s.name]=1;return Object.keys(o);}
  /* ── المراجع: إيصالات المستفيد واحدًا واحدًا ── */
  function review(i,k){var R=A.res,e=R&&R.ents[i];if(!e)return;k=Math.max(0,Math.min(e.its.length-1,k||0));A.rv={i:i,k:k};var it=e.its[k],v=$('laRv');
    if(!v){v=document.createElement('div');v.id='laRv';document.body.appendChild(v);}
    if(it._u)URL.revokeObjectURL(it._u);it._u=URL.createObjectURL(it.file);var p=it.p||{};
    v.innerHTML='<header><div><b>'+esc(e.name||'مستفيد غير مقروء')+'</b><small>إيصال '+(k+1)+' من '+e.its.length+(it.ts?' · '+h.dmy(it.ts):'')+'</small></div><button type="button" data-rv="x">إغلاق</button></header>'+
      '<div class="rd"><span><small>المبلغ</small><b>'+(Number(p.amount)>=100?f(p.amount):'لم يُقرأ')+'</b></span><span><small>المستفيد كما قُرئ</small><b>'+esc(nameOf(p)||'—')+'</b></span><span><small>الحساب</small><b dir="ltr">'+esc(acctOf(p)||'—')+'</b></span></div>'+
      '<div class="bd">'+(it.pdf?'<iframe src="'+it._u+'"></iframe>':'<img src="'+it._u+'" alt="">')+'</div>'+
      '<footer><div class="nv"><button type="button" data-rv="p"'+(k?'':' disabled')+'>‹ السابق</button><button type="button" data-rv="n"'+(k<e.its.length-1?'':' disabled')+'>التالي ›</button></div>'+
      '<div class="dc"><input id="laRvSup" list="laSups" placeholder="اسم المورد صاحب الحساب" value="'+esc(e.sup||R.sname||'')+'"><button type="button" class="ok" data-rv="ok">سليم — حساب هذا المورد</button><button type="button" class="sus" data-rv="sus">مشبوه</button></div></footer>';
    v.classList.add('on');}
  /* ── العرض ── */
  function srcCard(k,title,hint,opt){var o=A[k],x='<section class="sd '+k+'"><header><b>'+title+'</b><small>'+hint+'</small></header>';
    if(!o)x+='<button type="button" class="pk" data-ap="'+k+'"><i>＋</i>'+(opt?'اختياري — ':'')+'اختر ملف ZIP أو صورًا / PDF</button>';
    else if(o.busy)x+='<div class="ld"><span class="sp"></span> جارٍ فتح الملف…</div>';
    else if(o.err)x+='<div class="er">'+esc(o.err)+'</div><button type="button" class="pk" data-ap="'+k+'">اختيار ملف آخر</button>';
    else{var n=sel(o).length,q=function(id,lab,on){return '<button type="button" data-aq="'+k+':'+id+'"'+(on?' class="on"':'')+'>'+lab+'</button>';},sp=function(dn){return !o.all&&o.to===o.max&&o.from===Math.max(o.min,o.max-(dn-1)*DAY);};
      x+='<div class="nm"><b>'+esc(o.name)+'</b><span>'+o.list.length+' إيصالًا في الملف</span><button type="button" data-ap="'+k+'">تغيير</button></div><div class="qk">'+q('30','30 يومًا',sp(30))+q('90','90 يومًا',sp(90))+q('365','سنة',sp(365))+q('all','الكل',o.all)+'</div>'+
        '<div class="rg"><label><small>من</small><input type="date" data-ad="'+k+':from" value="'+h.iso(o.from)+'" min="'+h.iso(o.min)+'" max="'+h.iso(o.max)+'"'+(o.all?' disabled':'')+'></label><label><small>إلى</small><input type="date" data-ad="'+k+':to" value="'+h.iso(o.to)+'" min="'+h.iso(o.min)+'" max="'+h.iso(o.max)+'"'+(o.all?' disabled':'')+'></label></div><div class="ct"><b>'+n+'</b> إيصالًا في الفترة'+(n>2500?' — سيُفحص أحدث 2500':'')+'</div>';}
    return x+'</section>';}
  function entCard(e,i){var col={red:'r',amb:'a',grn:'g',gry:'y'}[e.st],lab={red:e.flag?'مشبوه':'غير معروف',amb:'تحقق',grn:e.auto?'معروف':'مؤكد',gry:'غير مقروء'}[e.st],op=A.open===i;
    var x='<div class="en '+col+'"><div class="eh"><div><b>'+esc(e.name||'مستفيد غير مقروء')+'</b><small dir="ltr">'+esc([e.bank,e.accts[0]?('…'+e.accts[0].slice(-8)):'بلا رقم حساب'].filter(Boolean).join(' · '))+(e.accts.length>1?' +'+(e.accts.length-1):'')+'</small></div><span class="ch">'+lab+'</span></div>'+
      '<div class="em"><span><small>إيصالات</small><b>'+e.its.length+'</b></span><span><small>المجموع</small><b>'+f(e.sum)+'</b></span><span><small>الفترة</small><b>'+(e.min?h.dmy(e.min).slice(0,10)+(d0(e.max)!==d0(e.min)?' – '+h.dmy(e.max).slice(0,10):''):'—')+'</b></span></div>'+
      '<p>'+esc(e.why)+'</p><div class="ea"><button type="button" class="p" data-ar="'+i+'">مراجعة الإيصالات ('+e.its.length+')</button><button type="button" data-ao="'+i+'">'+(op?'إخفاء':'قرار')+'</button></div>';
    if(op)x+='<div class="ed"><input id="laSupIn" list="laSups" placeholder="اسم المورد صاحب الحساب" value="'+esc(e.sup||A.res.sname||'')+'"><div><button type="button" class="ok" data-adz="'+i+':ok">سليم — حساب هذا المورد</button><button type="button" class="sus" data-adz="'+i+':sus">مشبوه</button>'+((e.st==='grn'&&!e.auto)||e.flag?'<button type="button" data-adz="'+i+':clr">إزالة من السجل</button>':'')+'</div></div>';
    return x+'</div>';}
  function paint(){var m=$('laMain');if(!m)return;var R=A.run,x='',reg=regLoad(),nOk=reg.filter(function(q){return q.st!=='sus';}).length;
    if(R){var p=Math.round(R.d/Math.max(1,R.n)*100),el=(Date.now()-R.t0)/1000,eta=R.d>5?Math.round(el/R.d*(R.n-R.d)):0;
      x='<section class="pg"><div class="br"><i style="width:'+p+'%"></i></div><div class="tx"><b>'+p+'%</b>قراءة وتحليل '+R.d+' / '+R.n+(eta?' · الباقي نحو '+(eta>90?Math.round(eta/60)+' د':eta+' ث'):'')+'</div><div class="fn">'+esc(R.cur||'')+'</div><div class="nt">'+(R.hit?R.hit+' إيصالًا مقروءًا سابقًا أُخذ من الذاكرة فورًا. ':'')+'يمكنك الإيقاف وعرض ما قُرئ — ما قُرئ يُحفظ ولن يُعاد.</div><button type="button" class="bt ln" data-aa="stop">إيقاف وعرض النتيجة</button></section>';}
    else if(A.res){var E=A.res.ents,cnt=function(s){return E.filter(function(e){return e.st===s;});},sum=function(a){return a.reduce(function(t,e){return t+e.sum;},0);},red=cnt('red'),amb=cnt('amb'),grn=cnt('grn'),gry=cnt('gry'),bad=red.length+amb.length+gry.length;
      x='<section class="rs"><div class="vd '+(bad?'no':'ok')+'"><b>'+(bad?'يوجد '+bad+' مستفيدًا يحتاج نظرك':'✓ كل الحسابات معروفة')+'</b><span>'+A.res.nC+' إيصال زبون · '+E.length+' مستفيدًا'+(A.res.nS?' · قورنت بـ '+A.res.nS+' إيصال مورد ('+esc(A.res.sname)+')':'')+(A.res.stopped?' — أُوقف قبل اكتماله':'')+(A.res.learned?' · تعلّم السجل '+A.res.learned+' حسابًا من إيصالات المورد':'')+'</span></div>'+
        '<div class="kp k4"><div class="r"><b>'+red.length+'</b><small>غير معروف</small><i>'+f(sum(red))+'</i></div><div class="a"><b>'+amb.length+'</b><small>تحقق</small><i>'+f(sum(amb))+'</i></div><div class="y"><b>'+gry.length+'</b><small>غير مقروء</small><i>'+f(sum(gry))+'</i></div><div class="g"><b>'+grn.length+'</b><small>معروف</small><i>'+f(sum(grn))+'</i></div></div>'+
        '<div class="qk fl">'+[['red','غير معروف',red.length],['amb','تحقق',amb.length],['gry','غير مقروء',gry.length],['grn','معروف',grn.length],['all','الكل',E.length]].map(function(o){return '<button type="button" data-af="'+o[0]+'"'+(A.flt===o[0]?' class="on"':'')+'>'+o[1]+' '+o[2]+'</button>';}).join('')+'</div>';
      var shown=E.map(function(e,i){return [e,i];}).filter(function(q){return A.flt==='all'||q[0].st===A.flt;});
      x+=shown.length?shown.map(function(q){return entCard(q[0],q[1]);}).join(''):'<div class="nt" style="padding:20px;text-align:center">لا شيء في هذه الفئة.</div>';
      x+='<div class="bs"><button type="button" class="bt" data-aa="copy">نسخ قائمة غير المعروف</button><button type="button" class="bt ln" data-aa="new">فحص جديد</button></div></section>';}
    else{var c=A.c,ok=c&&!c.busy&&!c.err&&sel(c).length,n=ok?Math.min(2500,sel(c).length)+(A.s&&!A.s.err&&!A.s.busy?Math.min(2500,sel(A.s).length):0):0;
      x=srcCard('c','إيصالات الزبون','الفترة التي تريد فحصها — حتى سنة كاملة',false)+srcCard('s','إيصالات المورد','الحسابات التي تظهر في تأكيداته تُعتبر حساباته تلقائيًا',true)+
        '<section class="rg2"><div><b>'+nOk+'</b> حسابًا مؤكدًا في السجل'+(reg.length-nOk?' · <b style="color:var(--red)">'+(reg.length-nOk)+'</b> مشبوهًا':'')+'<small>محفوظ على هذا الجهاز — صدّره لنقله أو كنسخة احتياطية</small></div><button type="button" data-aa="exp">تصدير</button><button type="button" data-aa="imp">استيراد</button></section>'+
        '<button type="button" class="bt go" data-aa="go"'+(ok?'':' disabled')+'>'+(ok?'ابدأ الفحص — '+n+' إيصالًا'+(n>150?' (نحو '+Math.round(n*1.4/60)+' د أول مرة)':''):'اختر ملف إيصالات الزبون أولًا')+'</button>'+
        '<div class="how"><b>كيف يعمل</b>تُقرأ الإيصالات وتُجمع حسب المستفيد (رقم الحساب أولًا ثم الاسم). كل مستفيد يُقارن بسجلك وبإيصالات المورد: <u>أخضر</u> معروف، <u>ذهبي</u> اسم مشابه برقم مختلف، <u>أحمر</u> لم يعترف به أحد. تفتح إيصالات أي مستفيد وتحكم بنفسك، وحكمك يُحفظ فلا يُسأل عنه ثانية. القراءة تُحفظ على الجهاز، فالفحص التالي للملف نفسه يأخذ ثواني.</div>';}
    m.innerHTML=x+'<datalist id="laSups">'+sups().map(function(s){return '<option value="'+esc(s)+'">';}).join('')+'</datalist>';}
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
      else if(a==='new'){if(confirm('بدء فحص جديد؟ (السجل وذاكرة القراءة يبقيان)')){A.c=A.s=A.res=null;paint();}}
      else if(a==='copy'){var bad=A.res.ents.filter(function(e){return e.st==='red'||e.st==='amb';}),txt='BDL · حسابات تحتاج تحقق — '+A.res.cname+'\n\n'+(bad.map(function(e){return '• '+(e.name||'غير مقروء')+' · '+(e.bank||'')+' · '+(e.accts[0]||'بلا رقم')+'\n  '+e.its.length+' إيصالًا · '+f(e.sum)+' · '+({red:'غير معروف',amb:'تحقق'}[e.st]);}).join('\n')||'لا شيء');
        (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){toast('نُسخت القائمة');},function(){prompt('انسخ:',txt);});}
      else if(a==='exp'){var bl=new Blob([JSON.stringify(regLoad(),null,1)],{type:'application/json'}),l=document.createElement('a');l.href=URL.createObjectURL(bl);l.download='BDL-سجل-الحسابات-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(l);l.click();l.remove();}
      else if(a==='imp'){A._side='reg';var fi=$('laFile');fi.value='';fi.click();}}});
  document.addEventListener('change',function(e){var t=e.target;
    if(t.id==='laFile'){if(A._side==='reg'){var fl=t.files&&t.files[0];if(!fl)return;var fr=new FileReader();fr.onload=function(){try{var inc=JSON.parse(fr.result);if(!Array.isArray(inc))throw 0;var reg=regLoad(),n=0;inc.forEach(function(q){if(!q||!(q.accts||q.names))return;if(!reg.some(function(r){return (q.accts||[]).some(function(a){return (r.accts||[]).some(function(b){return sameAcct(a,b);});});})){reg.push(q);n++;}});regSave(reg);toast('استُورد '+n+' حسابًا');if(A.res)classify();paint();}catch(x){toast('ملف السجل غير صالح');}};fr.readAsText(fl);return;}
      pick(A._side||'c',t.files);return;}
    if(t.dataset&&t.dataset.ad){var d=t.dataset.ad.split(':'),o=A[d[0]];if(!o||!t.value)return;var p=t.value.split('-');o[d[1]]=new Date(+p[0],+p[1]-1,+p[2]).getTime();if(o.from>o.to){if(d[1]==='from')o.to=o.from;else o.from=o.to;}o.all=false;paint();}});
  window.__LABA={A:A,cluster:cluster,classify:classify,sameAcct:sameAcct,sameName:sameName,acctOf:acctOf,nameOf:nameOf,regLoad:regLoad,paint:paint};
  /* تبديل الوضعين */
  function mode(k){$('lbMain').style.display=k==='m'?'':'none';$('laMain').style.display=k==='a'?'':'none';[].forEach.call(document.querySelectorAll('#lbMode button'),function(b){b.classList.toggle('on',b.dataset.md===k);});if(k==='a')paint();try{localStorage.setItem('bdl_lab_mode',k);}catch(e){}}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#lbMode button');if(b)mode(b.dataset.md);});
  function init(){var k='m';try{k=localStorage.getItem('bdl_lab_mode')||'m';}catch(e){}mode(k==='a'?'a':'m');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
