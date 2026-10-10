/* bdl-lab-daily.js — الحسابات اليومية (Build 1419)
   ترفع ملف ZIP لزبون واحد أو عدة زبائن (حتى 10) → يُقرأ كل إيصال → تُجمع المبالغ حسب العملة:
   خانة لكل عملة بمجموعها وعدد إيصالاتها، ثم تفصيل لكل زبون، وتقرير للمشاركة أو الطباعة (PDF).
   لا يُقيَّد شيء في أي تسوية. طبقة مستقلة: لا تمس المسح ولا المطابقة. تشارك ذاكرة القراءة نفسها (ما قُرئ لا يُقرأ ثانية). */
(function(){'use strict';
  var L=window.__LAB;if(!L)return;var h=L.h,$=function(i){return document.getElementById(i);},esc=h.esc,toast=h.toast,d0=h.d0,DAY=864e5;
  var D={c:null,run:null,res:null,open:{},v:null,y:null};
  var CN={AOA:'كوانزا',MRU:'أوقية',USDT:'USDT',USDC:'USDC',USD:'دولار',EUR:'يورو',CNY:'يوان',AED:'درهم','؟':'عملة غير محددة'},ORD=['AOA','MRU','USDT','USD','EUR','CNY','AED','USDC'];
  function fm(v){return Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});}
  function nr(v){v=String(v==null?'':v).replace(/\s+/g,'').toUpperCase();return v.length>=5?v:'';}
  function amt(v){v=Number(v)||0;return v>0&&v<1e11?v:0;}
  function ccyOf(p){var c=String(p.ccy||'').toUpperCase().trim(),b=String(p.bank||'');
    if(/USDT|TETHER|TRC20/.test(c))return 'USDT';if(/USDC/.test(c))return 'USDC';
    if(/AOA|AKZ|KZ|KWANZA/.test(c))return 'AOA';if(/MRU|MRO|OUGUIYA|\bUM\b|أوقية|اوقية/.test(c))return 'MRU';
    if(/USD|\$/.test(c))return 'USD';if(/EUR|€/.test(c))return 'EUR';if(/CNY|RMB|YUAN|¥/.test(c))return 'CNY';if(/AED/.test(c))return 'AED';
    if(/^[A-Z]{3}$/.test(c))return c;
    if(/binance|trust ?wallet|tron|okx|bybit/i.test(b))return 'USDT';
    if(/bankily|masrvi|sedad|bmci|bimbank|click|amanty|gimtel/i.test(b))return 'MRU';
    if(/\bBFA\b|\bBAI\b|\bBIC\b|\bBPC\b|atl[aâ]ntico|multicaixa|millennium|keve|\bsol\b|standard|\bBCI\b|\bBNI\b|caixa angola|express/i.test(b))return 'AOA';
    return '؟';}
  function failed(p){return /fail|rejei|recus|cancel|erro|declin|فشل|مرفوض|ملغ/i.test(p.status||'');}
  /* ── ذاكرة القراءة المشتركة ── */
  var DB=null,MEM={};
  function idb(){return new Promise(function(res){try{if(!window.indexedDB)return res(null);var q=indexedDB.open('bdl_lab_cache',1);q.onupgradeneeded=function(){q.result.createObjectStore('r');};q.onsuccess=function(){res(q.result);};q.onerror=function(){res(null);};}catch(e){res(null);}});}
  function cget(k){return new Promise(function(res){if(MEM[k])return res(MEM[k]);if(!DB)return res(null);try{var q=DB.transaction('r').objectStore('r').get(k);q.onsuccess=function(){res(q.result||null);};q.onerror=function(){res(null);};}catch(e){res(null);}});}
  function cput(k,v){MEM[k]=v;if(!DB)return;try{DB.transaction('r','readwrite').objectStore('r').put(v,k);}catch(e){}}
  /* ── فتح الملفات ── */
  function isZip(x){return /\.zip$/i.test(x.name||'')||/zip/i.test(x.type||'');}
  async function open1(files){var o={name:'',list:[]},zf=files.find(isZip);
    if(zf){if(zf.size>300*1048576&&!confirm('الملف كبير ('+Math.round(zf.size/1048576)+' MB) وقد لا يتحمله الهاتف. المتابعة؟'))return null;
      await h.loadZip();var z=await window.JSZip.loadAsync(zf),idx=await h.waChatIndex(z);o.name=h.zName(zf.name);
      z.forEach(function(p,en){if(en.dir)return;var nm=p.split('/').pop();if(!h.isDoc(nm,'')||/STICKER|-STK-/i.test(nm))return;o.list.push({nm:nm,en:en,ts:idx[nm.toLowerCase()]||h.waStamp(nm)||0});});}
    files.forEach(function(x){if(x!==zf&&h.isDoc(x.name,x.type))o.list.push({nm:x.name,file:x,ts:x.lastModified||Date.now()});});
    if(!o.name)o.name=o.list.length+' ملف';if(!o.list.length)throw new Error('لا صور ولا PDF في «'+((zf&&zf.name)||'الملف')+'» — صدّر المحادثة مع الوسائط');return o;}
  function span(c){var days=c.list.filter(function(x){return x.ts;}).map(function(x){return d0(x.ts);}),om=c.max,had=c.from!=null;c.max=days.length?Math.max.apply(null,days):d0(Date.now());c.min=days.length?Math.min.apply(null,days):c.max;
    if(!had||c.to===om||c.to>c.max){var len=had?c.to-c.from:0;c.to=c.max;c.from=Math.max(c.min,c.to-len);}if(c.from<c.min)c.from=c.min;if(c.from>c.to)c.from=c.to;if(!had)c.all=false;}
  async function pick(files){files=[].slice.call(files||[]);if(!files.length)return;
    var groups=files.filter(isZip).map(function(z){return [z];}),loose=files.filter(function(x){return !isZip(x);});if(loose.length)groups.push(loose);
    var c=D.c&&D.c.parts?D.c:null;if(!c){c={list:[],parts:[]};D.c=c;}D.res=null;h.sess.clear('daily');
    for(var i=0;i<groups.length;i++){if(c.parts.length>=10){toast('الحد 10 زبائن في الحساب الواحد');break;}c.busy='جارٍ فتح ملف '+(i+1)+' من '+groups.length+'…';paint();
      try{var g=await open1(groups[i]);if(!g)continue;if(c.parts.some(function(q){return q.name===g.name;})){toast('«'+g.name+'» مضاف من قبل');continue;}
        g.list.forEach(function(x){x.cn=g.name;});c.parts.push({name:g.name,n:g.list.length});c.list=c.list.concat(g.list);}catch(e){toast((e&&e.message)||'تعذّر فتح الملف');}}
    c.busy=false;if(!c.parts.length)D.c=null;else span(c);paint();}
  function sel(){var c=D.c;return c.all?c.list.slice():c.list.filter(function(x){if(!x.ts)return false;var k=d0(x.ts);return k>=c.from&&k<=c.to;});}
  function perTxt(c){return c.all?'كل الملف':(c.from===c.to?h.dmy(c.from).slice(0,10):'من '+h.dmy(c.from).slice(0,10)+' إلى '+h.dmy(c.to).slice(0,10));}
  /* ── القراءة والحساب ── */
  async function readOne(x){var file=x.file;if(!file){var bl=await x.en.async('blob'),ex=x.nm.split('.').pop().toLowerCase();file=new File([bl],x.nm,{type:ex==='pdf'?'application/pdf':ex==='png'?'image/png':ex==='webp'?'image/webp':'image/jpeg'});}
    var fp=await h.sha(file),p=await cget(fp);
    if(!p||p.ccy===undefined){var r=await Promise.race([window.ArkanRead.read(file),new Promise(function(z){setTimeout(function(){z(null);},45000);})]),g=(r&&r.parsed)||{};
      p={amount:Number(g.amount)||0,ref:g.transaction_id||g.reference||g.txn||'',bank:g.bank||g.institution||'',date:g.date||'',name:g.beneficiary||g.name||'',account:g.iban||g.account||'',receiver:g.receiver||'',ccy:String(g.currency||g.ccy||''),status:String(g.status||'')};
      if(p.amount||p.name||p.account||p.receiver)cput(fp,p);}
    return {cn:x.cn||'',file:file,nm:x.nm,ts:x.ts||0,pdf:/pdf$/i.test(file.type||x.nm),p:p,fp:fp};}
  function untilVisible(){return document.hidden?new Promise(function(res){var fn=function(){if(!document.hidden){document.removeEventListener('visibilitychange',fn);res();}};document.addEventListener('visibilitychange',fn);}):Promise.resolve();}
  async function start(){var C=D.c?sel():[];if(!C.length)return;if(!DB)DB=await idb();
    var R={n:C.length,d:0,stop:false,t0:Date.now(),per:perTxt(D.c),cur:'',cn:''};D.run=R;D.res=null;paint();
    var its=[],seen={},dupN=0,qi=0;
    async function wk(){while(qi<C.length&&!R.stop){var x=C[qi++];R.cur=x.nm;R.cn=x.cn;await untilVisible();try{var it=await readOne(x);var k=it.cn+'|'+it.fp;if(seen[k])dupN++;else{seen[k]=1;its.push(it);}}catch(e){}R.d++;paint();}}
    var w=[];for(var i=0;i<6;i++)w.push(wk());await Promise.all(w);
    /* المرجع نفسه بالمبلغ نفسه عند الزبون نفسه = الإيصال نفسه مصوَّرًا مرتين → يُحسب مرة واحدة */
    var rs={};its=its.filter(function(it){var rf=nr(it.p.ref),v=amt(it.p.amount);if(!rf||!v)return true;var k=it.cn+'|'+rf+'|'+v;if(rs[k]){dupN++;return false;}rs[k]=1;return true;});
    its.sort(function(a,b){return (a.ts||0)-(b.ts||0);});
    D.res={its:its,per:R.per,names:D.c.parts.map(function(q){return q.name;}),dupN:dupN,stopped:R.stop,at:Date.now()};D.run=null;D.open={};persist();paint();window.scrollTo(0,0);}
  function calc(){var S=D.res,tot={},cu={},fail=0,un=0;S.names.forEach(function(n){cu[n]={name:n,n:0,un:0,fail:0,cur:{},its:[]};});
    S.its.forEach(function(it,i){it.i=i;var q=cu[it.cn]||(cu[it.cn]={name:it.cn,n:0,un:0,fail:0,cur:{},its:[]});q.its.push(it);
      if(failed(it.p)){it.st='fail';q.fail++;fail++;return;}var v=amt(it.p.amount),c=ccyOf(it.p);it.ccy=c;it.v=v;
      if(!v){it.st='un';q.un++;un++;return;}it.st='ok';q.n++;(q.cur[c]||(q.cur[c]={s:0,n:0})).s+=v;q.cur[c].n++;(tot[c]||(tot[c]={s:0,n:0})).s+=v;tot[c].n++;});
    var keys=Object.keys(tot).sort(function(a,b){var x=ORD.indexOf(a),y=ORD.indexOf(b);return (x<0?50:x)-(y<0?50:y)||(a==='؟'?1:b==='؟'?-1:a<b?-1:1);});
    return {tot:tot,keys:keys,cu:S.names.map(function(n){return cu[n];}).concat(Object.keys(cu).filter(function(n){return S.names.indexOf(n)<0;}).map(function(n){return cu[n];})),fail:fail,un:un};}
  function persist(){var S=D.res;if(!S)return;h.sess.save('daily',{per:S.per,names:S.names,dupN:S.dupN,stopped:!!S.stopped},S.its.map(function(it){return {file:it.file,data:{cn:it.cn,nm:it.nm,ts:it.ts,pdf:it.pdf,p:it.p,fp:it.fp}};})).then(function(ok){if(!ok)toast('تعذّر حفظ الجلسة على الجهاز — لا تغادر الصفحة قبل أخذ التقرير');});}
  function saveMeta(){var S=D.res;if(!S)return;h.sess.get('daily:meta').then(function(m){if(!m)return;m.rows.forEach(function(r,i){if(S.its[i])r.p=S.its[i].p;});h.sess.put('daily:meta',m);});}
  async function restore(){try{var m=await h.sess.load('daily');if(!m||!m.meta||D.res||D.run)return;
      D.res={its:(m.rows||[]).map(function(r,i){return {cn:r.cn,nm:r.nm,ts:r.ts,pdf:r.pdf,p:r.p||{},fp:r.fp,file:null,_si:r._f?i:-1};}),per:m.meta.per||'',names:m.meta.names||[],dupN:m.meta.dupN||0,stopped:m.meta.stopped,restored:m.at,at:m.at};paint();}catch(e){}}
  /* ── التقرير ── */
  function repText(){var S=D.res,K=calc(),x='BDL · الحسابات اليومية\nالفترة: '+S.per+'\n'+(K.cu.length>1?'الزبائن: '+K.cu.length+'\n':'')+'\nالإجمالي حسب العملة:\n'+(K.keys.map(function(c){return '• '+c+': '+fm(K.tot[c].s)+' ('+K.tot[c].n+' إيصالًا)';}).join('\n')||'لا مبالغ مقروءة');
    K.cu.forEach(function(q){x+='\n\n— '+q.name+' ('+q.n+' إيصالًا)\n'+(Object.keys(q.cur).map(function(c){return '  '+c+': '+fm(q.cur[c].s)+' ('+q.cur[c].n+')';}).join('\n')||'  لا مبالغ مقروءة')+(q.un?'\n  لم يُقرأ: '+q.un:'')+(q.fail?'\n  غير ناجحة: '+q.fail:'');});return x;}
  function repHtml(){var S=D.res,K=calc(),x='<div class="ph"><b>BDL</b><span>الحسابات اليومية</span><small>الفترة: '+esc(S.per)+' · أُعدّ '+h.dmy(Date.now())+'</small></div>'+
      '<h3>الإجمالي حسب العملة</h3><table><tr><th>العملة</th><th>عدد الإيصالات</th><th>المجموع</th></tr>'+K.keys.map(function(c){return '<tr><td>'+c+' — '+(CN[c]||'')+'</td><td>'+K.tot[c].n+'</td><td class="n">'+fm(K.tot[c].s)+'</td></tr>';}).join('')+'</table>';
    K.cu.forEach(function(q){x+='<h3>'+esc(q.name)+' — '+q.n+' إيصالًا'+(q.un?' · لم يُقرأ '+q.un:'')+(q.fail?' · غير ناجحة '+q.fail:'')+'</h3><table><tr><th>#</th><th>التاريخ</th><th>المرجع</th><th>العملة</th><th>المبلغ</th></tr>'+
        q.its.filter(function(it){return it.st==='ok';}).map(function(it,i){return '<tr><td>'+(i+1)+'</td><td>'+(it.ts?h.dmy(it.ts):'—')+'</td><td dir="ltr">'+esc(nr(it.p.ref)||'—')+'</td><td>'+it.ccy+'</td><td class="n">'+fm(it.v)+'</td></tr>';}).join('')+
        Object.keys(q.cur).map(function(c){return '<tr class="t"><td colspan="3">مجموع '+c+' ('+q.cur[c].n+')</td><td>'+c+'</td><td class="n">'+fm(q.cur[c].s)+'</td></tr>';}).join('')+'</table>';});
    return x+'<p class="pf">BDL · lbdal.com — تقرير حسابي من الإيصالات المرفوعة، لا يُعدّ قيدًا في أي تسوية.</p>';}
  /* ── عارض الإيصال مع التصحيح اليدوي ── */
  async function view(i){var S=D.res,it=S&&S.its[i];if(!it)return;if(D.v==null)D.y=window.scrollY;D.v=i;var v=$('laRv');if(!v){v=document.createElement('div');v.id='laRv';document.body.appendChild(v);}
    if(!it.file&&it._si>=0)it.file=await h.sess.file('daily',it._si,it.nm,it.pdf);if(it._u){URL.revokeObjectURL(it._u);it._u='';}if(it.file)it._u=URL.createObjectURL(it.file);var p=it.p||{},c=ccyOf(p),opts=ORD.concat(ORD.indexOf(c)<0&&c!=='؟'?[c]:[]);
    v.innerHTML='<header><div><b>'+esc(it.cn||'إيصال')+'</b><small>'+(it.ts?h.dmy(it.ts):'')+(nr(p.ref)?' · '+esc(nr(p.ref)):'')+(failed(p)?' · غير ناجحة':'')+'</small></div><button type="button" data-dv="x">✕ إغلاق</button></header>'+
      '<div class="bd">'+(!it._u?'<p style="color:#9FB0CC;padding:30px 16px;text-align:center;font-size:13px">صورة هذا الإيصال لم تُحفظ على الجهاز. أعد الحساب لعرضها (القراءة من الذاكرة فورًا).</p>':it.pdf?'<iframe src="'+it._u+'"></iframe>':'<img src="'+it._u+'" alt="">')+'</div>'+
      '<footer><div class="de"><label><small>المبلغ</small><input id="ldAmt" inputmode="decimal" value="'+(amt(p.amount)||'')+'" placeholder="اكتب المبلغ"></label><label><small>العملة</small><select id="ldCcy">'+(c==='؟'?'<option value="">اختر</option>':'')+opts.map(function(o){return '<option'+(o===c?' selected':'')+'>'+o+'</option>';}).join('')+'</select></label></div>'+
      '<div class="nv"><button type="button" data-dv="p"'+(i?'':' disabled')+'>‹ السابق</button><button type="button" data-dv="n"'+(i<S.its.length-1?'':' disabled')+'>التالي ›</button></div><div class="dc"><button type="button" class="ok" data-dv="sv">حفظ التصحيح</button><button type="button" class="sus" data-dv="no">لا يُحسب</button></div></footer>';
    v.classList.add('on');}
  function closeV(){var v=$('laRv');if(v)v.classList.remove('on');D.v=null;paint();if(D.y!=null){window.scrollTo(0,D.y);D.y=null;}}
  /* ── العرض ── */
  function paint(){var m=$('ldMain');if(!m)return;var R=D.run,x='';
    if(R){var p=Math.round(R.d/Math.max(1,R.n)*100),el=(Date.now()-R.t0)/1000,eta=R.d>8?Math.round(el/R.d*(R.n-R.d)):0;
      x='<section class="pg"><div class="br"><i style="width:'+p+'%"></i></div><div class="pr2">الفترة: <b>'+esc(R.per)+'</b></div><div class="tx"><b>'+p+'%</b>قراءة إيصالات '+(R.cn?'«'+esc(R.cn)+'» ':'')+R.d+' / '+R.n+(eta?' · الباقي نحو '+(eta>90?Math.round(eta/60)+' د':eta+' ث'):'')+'</div><div class="fn">'+esc(R.cur||'')+'</div><button type="button" class="bt ln" data-da="stop">إيقاف</button></section>';
      var pg=m.querySelector('.pg[data-live]');if(pg){var t=document.createElement('div');t.innerHTML=x;var np=t.firstChild;pg.querySelector('.br i').style.width=p+'%';['.tx','.fn'].forEach(function(q){var o=pg.querySelector(q),n=np.querySelector(q);if(o&&n&&o.innerHTML!==n.innerHTML)o.innerHTML=n.innerHTML;});return;}
      m.innerHTML=x;m.querySelector('.pg').setAttribute('data-live','1');return;}
    if(D.res){var S=D.res,K=calc();
      x='<section class="rs">'+(S.restored?'<div class="rst">حساب محفوظ من '+new Date(S.restored).toLocaleString('en-GB',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' — يبقى حتى تنهيه أنت</div>':'')+
        '<div class="vd ok"><b>الحسابات اليومية — '+esc(S.per)+'</b><span>'+(K.cu.length>1?K.cu.length+' زبائن':'الزبون '+esc(K.cu[0]?K.cu[0].name:''))+' · '+S.its.length+' إيصالًا'+(S.stopped?' — أُوقف قبل اكتماله':'')+'</span></div>'+
        '<div class="cb">'+(K.keys.map(function(c){return '<div class="'+(c==='؟'?'q':'')+'"><small>'+c+(CN[c]&&CN[c]!==c?' · '+CN[c]:'')+'</small><b>'+fm(K.tot[c].s)+'</b><i>'+K.tot[c].n+' إيصالًا</i></div>';}).join('')||'<div class="q"><small>لا مبالغ مقروءة</small><b>0</b></div>')+'</div>'+
        ((K.un||K.fail||S.dupN)?'<div class="nt">'+[K.un?K.un+' لم يُقرأ مبلغها — افتحها واكتب المبلغ':'',K.fail?K.fail+' غير ناجحة لم تُحسب':'',S.dupN?S.dupN+' مكررة حُسبت مرة واحدة':''].filter(Boolean).join(' · ')+'</div>':'')+
        K.cu.map(function(q,ci){var op=!!D.open[q.name]||K.cu.length===1;return '<div class="cc"><div class="ch2" data-dc="'+ci+'"><b>'+esc(q.name)+'</b><span>'+q.n+' إيصالًا'+(q.un?' · <em>'+q.un+' لم يُقرأ</em>':'')+'</span></div>'+
          '<div class="cv">'+(Object.keys(q.cur).map(function(c){return '<span><small>'+c+'</small><b>'+fm(q.cur[c].s)+'</b></span>';}).join('')||'<span><small>—</small><b>0</b></span>')+'</div>'+
          (K.cu.length>1?'<button type="button" class="tg" data-dc="'+ci+'">'+(op?'إخفاء الإيصالات':'عرض الإيصالات ('+q.its.length+')')+'</button>':'')+
          (op?q.its.map(function(it){return '<div class="rw '+(it.st==='ok'?'g':it.st==='un'?'a':'r')+'"><div class="mn"><b>'+(it.st==='ok'?fm(it.v)+' <small>'+it.ccy+'</small>':it.st==='un'?'لم يُقرأ المبلغ':'غير ناجحة')+'</b><span>'+esc([nr(it.p.ref)||'بلا مرجع',it.ts?h.dmy(it.ts):''].filter(Boolean).join(' · '))+'</span></div><button type="button" data-do="'+it.i+'">فتح</button></div>';}).join(''):'')+'</div>';}).join('')+
        '<div class="bs"><button type="button" class="bt" data-da="share">مشاركة التقرير</button><button type="button" class="bt" data-da="print">تقرير للطباعة / PDF</button><button type="button" class="bt ln" data-da="new">إنهاء وحساب جديد</button></div></section>';
      m.innerHTML=x;K.cu.forEach(function(q,ci){D._cu=K.cu;});return;}
    var c=D.c;x='<section class="sd c"><header><b>الحسابات اليومية</b><small>ارفع ملف زبون واحد أو عدة زبائن — تُحسب كل عملة في خانتها مع المجموع وتقرير</small></header>';
    if(!c)x+='<button type="button" class="pk" data-da="pick"><i>＋</i>اختر ملفات الزبائن — حتى 10 ملفات ZIP دفعة واحدة أو واحدًا واحدًا</button>';
    else if(c.busy)x+='<div class="ld"><span class="sp"></span> '+esc(c.busy)+'</div>';
    else{var n=sel().length,q=function(id,lab,on){return '<button type="button" data-dq="'+id+'"'+(on?' class="on"':'')+'>'+lab+'</button>';},sp=function(dn){return !c.all&&c.to===c.max&&c.from===Math.max(c.min,c.max-(dn-1)*DAY);};
      x+=c.parts.map(function(pt,i){return '<div class="nm"><b>'+(i+1)+' · '+esc(pt.name)+'</b><span>'+pt.n+' إيصالًا في الملف</span><button type="button" data-dx="'+i+'">حذف</button></div>';}).join('')+(c.parts.length<10?'<button type="button" class="pk sm" data-da="pick"><i>＋</i>إضافة زبون آخر ('+c.parts.length+' / 10)</button>':'')+
        '<div class="pt">تاريخ الحساب</div><div class="qk">'+q('1','آخر يوم',sp(1))+q('2','يومان',sp(2))+q('7','7 أيام',sp(7))+q('30','30 يومًا',sp(30))+q('all','الكل',c.all)+'</div>'+
        '<div class="rg"><label><small>من</small><input type="date" data-dd="from" value="'+h.iso(c.all?c.min:c.from)+'" min="'+h.iso(c.min)+'" max="'+h.iso(c.max)+'"></label><label><small>إلى</small><input type="date" data-dd="to" value="'+h.iso(c.all?c.max:c.to)+'" min="'+h.iso(c.min)+'" max="'+h.iso(c.max)+'"></label></div>'+
        '<div class="ct"><b>'+n+'</b> إيصالًا في '+perTxt(c)+(c.parts.length>1?' من '+c.parts.length+' زبائن':'')+'</div>';}
    x+='</section><button type="button" class="bt go" data-da="go"'+(c&&!c.busy&&sel().length?'':' disabled')+'>'+(c&&!c.busy&&sel().length?'احسب — '+sel().length+' إيصالًا':'اختر ملفات الزبائن')+'</button>'+
      '<div class="how"><b>كيف يعمل</b>يُقرأ كل إيصال في التاريخ المختار ويُصنَّف حسب عملته (كوانزا، أوقية، USDT، دولار…). لكل عملة خانة بمجموعها، ثم تفصيل كل زبون. الإيصال غير الناجح لا يُحسب، والمكرر يُحسب مرة واحدة، وما لم يُقرأ تفتحه وتكتب مبلغه. لا يُقيَّد شيء في أي تسوية.</div>';
    m.innerHTML=x;}
  document.addEventListener('click',function(e){var t=e.target,b;if(!t.closest)return;
    if((b=t.closest('[data-da]'))){var a=b.dataset.da;
      if(a==='pick'){var i=$('ldFile');i.value='';i.click();}
      else if(a==='go')start();
      else if(a==='stop'){if(D.run)D.run.stop=true;b.disabled=true;b.textContent='جارٍ الإيقاف…';}
      else if(a==='new'){if(confirm('إنهاء هذا الحساب وبدء حساب جديد؟\nالنتيجة الحالية وصورها تُمسح من الجهاز. ذاكرة القراءة تبقى.')){D.c=D.res=null;D.open={};h.sess.clear('daily');paint();}}
      else if(a==='share'){var tx=repText();if(navigator.share)navigator.share({text:tx}).catch(function(){});else (navigator.clipboard?navigator.clipboard.writeText(tx):Promise.reject()).then(function(){toast('نُسخ التقرير');},function(){prompt('انسخ:',tx);});}
      else if(a==='print'){var pr=$('ldPrint');if(!pr){pr=document.createElement('div');pr.id='ldPrint';document.body.appendChild(pr);}pr.innerHTML=repHtml();document.body.classList.add('ldp');setTimeout(function(){window.print();setTimeout(function(){document.body.classList.remove('ldp');},800);},80);}
      return;}
    if((b=t.closest('[data-dx]'))){var c=D.c,pi=+b.dataset.dx;if(!c||!c.parts[pi])return;var pn=c.parts[pi].name;c.list=c.list.filter(function(x){return x.cn!==pn;});c.parts.splice(pi,1);if(c.parts.length)span(c);else D.c=null;paint();return;}
    if((b=t.closest('[data-dq]'))){var c2=D.c;if(!c2)return;c2.all=b.dataset.dq==='all';if(!c2.all){c2.to=c2.max;c2.from=Math.max(c2.min,c2.max-(+b.dataset.dq-1)*DAY);}paint();return;}
    if((b=t.closest('[data-do]'))){view(+b.dataset.do);return;}
    if((b=t.closest('[data-dc]'))){var cu=calc().cu[+b.dataset.dc];if(cu){D.open[cu.name]=!D.open[cu.name];paint();}return;}
    if((b=t.closest('[data-dv]'))){var k=b.dataset.dv,S=D.res;if(D.v==null||!S)return;var it=S.its[D.v];
      if(k==='x'){closeV();return;}if(k==='p'){view(D.v-1);return;}if(k==='n'){view(D.v+1);return;}
      if(k==='no'){it.p.status='cancelled';it.p.man=1;cput(it.fp,it.p);saveMeta();toast('لن يُحسب هذا الإيصال');}
      else if(k==='sv'){var v=Number(String($('ldAmt').value).replace(/[\s,]/g,''))||0,cc=$('ldCcy').value;if(!amt(v)){toast('اكتب مبلغًا صحيحًا');return;}if(!cc){toast('اختر العملة');return;}
        it.p.amount=v;it.p.ccy=cc;it.p.man=1;if(failed(it.p))it.p.status='';cput(it.fp,it.p);saveMeta();toast('حُفظ التصحيح');}
      if(D.v<S.its.length-1&&k==='sv'&&S.its[D.v+1].st==='un'){calc();view(D.v+1);}else closeV();return;}});
  document.addEventListener('change',function(e){var t=e.target;if(t.id==='ldFile'){pick(t.files);return;}
    if(t.dataset&&t.dataset.dd){var c=D.c;if(!c||!t.value)return;var p=t.value.split('-');c[t.dataset.dd]=new Date(+p[0],+p[1]-1,+p[2]).getTime();if(c.all){if(t.dataset.dd==='from')c.to=c.max;else c.from=c.min;}if(c.from>c.to){if(t.dataset.dd==='from')c.to=c.from;else c.from=c.to;}c.all=false;paint();}});
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#lbMode button');if(b&&b.dataset.md==='d')paint();});
  window.__LABD={D:D,calc:calc,ccyOf:ccyOf,paint:paint,repText:repText,repHtml:repHtml};
  function init(){if(!$('ldFile')){var i=document.createElement('input');i.type='file';i.id='ldFile';i.multiple=true;i.style.display='none';document.body.appendChild(i);}paint();restore();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
