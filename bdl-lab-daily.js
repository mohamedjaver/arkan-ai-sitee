/* bdl-lab-daily.js — الحسابات اليومية (Build 1419)
   ترفع ملف ZIP لزبون واحد أو عدة زبائن (حتى 10) → يُقرأ كل إيصال → تُجمع المبالغ حسب العملة:
   خانة لكل عملة بمجموعها وعدد إيصالاتها، ثم تفصيل لكل زبون، وتقرير للمشاركة أو الطباعة (PDF).
   لا يُقيَّد شيء في أي تسوية. طبقة مستقلة: لا تمس المسح ولا المطابقة. تشارك ذاكرة القراءة نفسها (ما قُرئ لا يُقرأ ثانية). */
(function(){'use strict';
  var L=window.__LAB;if(!L)return;var h=L.h,$=function(i){return document.getElementById(i);},esc=h.esc,toast=h.toast,d0=h.d0,DAY=864e5;
  var D={key:'daily',c:null,run:null,res:null,open:{},v:null,y:null};
  var CN={AOA:'كوانزا',MRU:'أوقية',USDT:'USDT',USDC:'USDC',USD:'دولار',EUR:'يورو',CNY:'يوان',AED:'درهم','؟':'عملة غير محددة'},ORD=['AOA','MRU','USDT','USD','EUR','CNY','AED','USDC'];
  var LG='ar';try{LG=localStorage.getItem('bdl_daily_lang')==='pt'?'pt':'ar';}catch(e){}
  var TX={ar:{t:'الحسابات اليومية',per:'الفترة',cus:'الزبائن',tot:'الإجمالي حسب العملة',cur:'العملة',n:'عدد الإيصالات',sum:'المجموع',dt:'التاريخ',ref:'المرجع',amt:'المبلغ',rc:'إيصالًا',un:'لم يُقرأ',fl:'غير ناجحة',sub:'مجموع',made:'أُعدّ',bank:'البنك',px:'الأسعار والربح',buy:'شراء',sell:'بيع',profit:'الربح',due:'المطلوب مقابلها',got:'المستلم',diff:'الفرق',rate:'السعر الفعلي',byb:'حسب البنك',tp:'إجمالي الربح',none:'لا مبالغ مقروءة',ft:'BDL · lbdal.com — تقرير حسابي من الإيصالات المرفوعة، لا يُعدّ قيدًا في أي تسوية.'},
    pt:{t:'Contas diárias',per:'Período',cus:'Clientes',tot:'Total por moeda',cur:'Moeda',n:'N.º de comprovativos',sum:'Total',dt:'Data',ref:'Referência',amt:'Montante',rc:'comprovativos',un:'Não lidos',fl:'Sem sucesso',sub:'Subtotal',made:'Emitido em',bank:'Banco',px:'Preços e lucro',buy:'Compra',sell:'Venda',profit:'Lucro',due:'Valor devido',got:'Recebido',diff:'Diferença',rate:'Taxa efectiva',byb:'Por banco',tp:'Lucro total',none:'Sem montantes lidos',ft:'BDL · lbdal.com — Relatório calculado a partir dos comprovativos carregados; não constitui lançamento em qualquer liquidação.'}};
  var CP={AOA:'Kwanza',MRU:'Ouguiya',USDT:'USDT',USDC:'USDC',USD:'Dólar',EUR:'Euro',CNY:'Yuan',AED:'Dirham','؟':'Moeda indefinida'};
  function cname(c){return (LG==='pt'?CP[c]:CN[c])||'';}function ccode(c){return c==='؟'&&LG==='pt'?'?':c;}
  function perL(S){if(LG!=='pt'||S.pf==null)return S.per;var a=h.dmy(S.pf).slice(0,10),b=h.dmy(S.pt).slice(0,10);return S.pall?'Todo o ficheiro':a===b?a:'de '+a+' a '+b;}
  var FL={AOA:'🇦🇴',MRU:'🇲🇷',USD:'🇺🇸',EUR:'🇪🇺',CNY:'🇨🇳',AED:'🇦🇪',USDT:'₮',USDC:'◎'};function fl(c){return '';}
  var FC={AOA:'ao',MRU:'mr',USD:'us',EUR:'european_union',CNY:'cn',AED:'ae'};
  function flag(c){return FC[c]?'<img class="fgi" alt="" src="https://cdn.jsdelivr.net/gh/hatscripts/circle-flags@gh-pages/flags/'+FC[c]+'.svg">':'<i class="fgi '+(c==='USDT'?'t':c==='USDC'?'u':'x')+'">'+(c==='USDT'?'₮':c==='USDC'?'$':c.slice(0,1))+'</i>';}
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
  function why(p,v,c){if(!v)return 'لم يُقرأ المبلغ';if(c==='؟')return 'العملة غير واضحة — اخترها';if(p.man)return '';
    var dv=String(Math.round(v)),rf=String(p.ref||'').replace(/\D/g,''),ac=String(p.account||'').replace(/\D/g,'');
    if(c==='AOA'&&v<1000)return 'مبلغ '+fm(v)+' كوانزا غير منطقي — راجِعه';
    if(dv.length>=6&&(dv===rf||(ac&&ac.indexOf(dv)>=0)))return 'المبلغ يطابق رقم المرجع/الحساب — راجِعه';
    return '';}
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
    var c=D.c&&D.c.parts?D.c:null;if(!c){c={list:[],parts:[]};D.c=c;}D.res=null;D.key='daily';h.sess.clear('daily');
    for(var i=0;i<groups.length;i++){if(c.parts.length>=10){toast('الحد 10 زبائن في الحساب الواحد');break;}c.busy='جارٍ فتح ملف '+(i+1)+' من '+groups.length+'…';paint();
      try{var g=await open1(groups[i]);if(!g)continue;if(c.parts.some(function(q){return q.name===g.name;})){toast('«'+g.name+'» مضاف من قبل');continue;}
        g.list.forEach(function(x){x.cn=g.name;});c.parts.push({name:g.name,n:g.list.length});c.list=c.list.concat(g.list);}catch(e){toast((e&&e.message)||'تعذّر فتح الملف');}}
    c.busy=false;if(!c.parts.length)D.c=null;else span(c);paint();}
  function sel(){var c=D.c;return c.all?c.list.slice():c.list.filter(function(x){if(!x.ts)return false;var k=d0(x.ts);return k>=c.from&&k<=c.to;});}
  function perTxt(c){return c.all?'كل الملف':(c.from===c.to?h.dmy(c.from).slice(0,10):'من '+h.dmy(c.from).slice(0,10)+' إلى '+h.dmy(c.to).slice(0,10));}
  /* ── القراءة والحساب ── */
  async function readOne(x){var file=x.file;if(!file){var bl=await x.en.async('blob'),ex=x.nm.split('.').pop().toLowerCase();file=new File([bl],x.nm,{type:ex==='pdf'?'application/pdf':ex==='png'?'image/png':ex==='webp'?'image/webp':'image/jpeg'});}
    var fp=await h.sha(file),p=await cget(fp),have=p&&p.ccy!==undefined;
    /* 1427: القراءة تعتمد على Claude (قارئ الخادم). ما قُرئ سابقًا بقارئ احتياطي يُعاد بـ Claude تلقائيًا؛ تعديلك اليدوي لا يُمس. */
    if(!have||(!p.man&&p.eng!=='claude')){var g=null,eng='',AR=window.ArkanRead,to=function(ms){return new Promise(function(z){setTimeout(function(){z(null);},ms);});};
      if(AR.claude){try{g=await Promise.race([AR.claude(file),to(32000)]);}catch(e){g=null;}if(g&&!(g.amount||g.is_receipt===false)){try{g=await Promise.race([AR.claude(file),to(32000)]);}catch(e){g=null;}}}
      if(g&&(g.amount||g.is_receipt===false))eng='claude';
      else if(!have){var r=await Promise.race([AR.read(file),to(45000)]);g=(r&&r.parsed)||{};eng=(r&&r.engine)||'ocr';}
      if(eng){p={amount:Number(g.amount)||0,ref:g.transaction_id||g.reference||g.txn||'',bank:g.bank||g.institution||'',date:g.date||'',name:g.beneficiary||g.name||'',account:g.iban||g.account||'',receiver:g.receiver||'',ccy:String(g.currency||g.ccy||''),status:String(g.status||''),eng:eng};if(g.is_receipt===false)p.nr=1;
        if(p.amount||p.name||p.account||p.receiver||p.nr)cput(fp,p);}}
    return {cn:x.cn||'',file:file,nm:x.nm,ts:x.ts||0,pdf:/pdf$/i.test(file.type||x.nm),p:p,fp:fp};}
  function untilVisible(){return document.hidden?new Promise(function(res){var fn=function(){if(!document.hidden){document.removeEventListener('visibilitychange',fn);res();}};document.addEventListener('visibilitychange',fn);}):Promise.resolve();}
  async function start(){var C=D.c?sel():[];if(!C.length)return;if(!DB)DB=await idb();
    D.key='daily';var R={n:C.length,d:0,stop:false,t0:Date.now(),per:perTxt(D.c),cur:'',cn:''};D.run=R;D.res=null;paint();
    var its=[],seen={},dupN=0,qi=0;
    async function wk(){while(qi<C.length&&!R.stop){var x=C[qi++];R.cur=x.nm;R.cn=x.cn;await untilVisible();try{var it=await readOne(x);var k=it.cn+'|'+it.fp;if(seen[k])dupN++;else{seen[k]=1;its.push(it);}}catch(e){}R.d++;paint();}}
    var w=[];for(var i=0;i<6;i++)w.push(wk());await Promise.all(w);
    /* المرجع نفسه بالمبلغ نفسه عند الزبون نفسه = الإيصال نفسه مصوَّرًا مرتين → يُحسب مرة واحدة */
    var rs={};its=its.filter(function(it){var rf=nr(it.p.ref);if(!rf||rf.length<6)return true;var k=it.cn+'|'+rf;if(rs[k]){dupN++;return false;}rs[k]=1;return true;});
    var n1=its.length;its=its.filter(function(it){return !it.p.nr||it.p.man;});var nrN=n1-its.length;
    var n0=its.length;its=its.filter(function(it){return !failed(it.p);});var failN=n0-its.length;
    its.sort(function(a,b){return (a.ts||0)-(b.ts||0);});
    D.res={its:its,per:R.per,pf:D.c.from,pt:D.c.to,pall:!!D.c.all,names:D.c.parts.map(function(q){return q.name;}),dupN:dupN,failN:failN,nrN:nrN,stopped:R.stop,at:Date.now()};D.run=null;D.open={};persist();paint();window.scrollTo(0,0);}
  async function reread(){var S=D.res;if(!S||D.busy)return;D.busy=1;var L=S.its.filter(function(it){return !it.p.man&&it.p.eng!=='claude';}),ok=0;toast('إعادة قراءة '+L.length+' إيصالًا بـ Claude…');
    for(var i=0;i<L.length;i++){var it=L[i];try{if(!it.file&&it._si>=0)it.file=await h.sess.file(D.key,it._si,it.nm,it.pdf);if(!it.file)continue;var r=await readOne({file:it.file,nm:it.nm,ts:it.ts,cn:it.cn});if(r.p.eng==='claude'){it.p=r.p;ok++;}}catch(e){}}
    D.busy=0;saveMeta();paint();toast(ok?'قرأ Claude '+ok+' من '+L.length:'Claude لم يرد — '+(window.__bdlReadErr||'تحقق من تسجيل الدخول'));}
  function calc(){var S=D.res,tot={},cu={},fail=0,un=0;S.names.forEach(function(n){cu[n]={name:n,n:0,un:0,fail:0,cur:{},its:[]};});
    S.its.forEach(function(it,i){it.i=i;var q=cu[it.cn]||(cu[it.cn]={name:it.cn,n:0,un:0,fail:0,cur:{},its:[]});if(failed(it.p)){it.st='fail';q.fail++;fail++;return;}q.its.push(it);
      var v=amt(it.p.amount),c=ccyOf(it.p);it.ccy=c;it.v=v;
      it.why=why(it.p,v,c);if(it.why){it.st='un';q.un++;un++;return;}it.st='ok';q.n++;(q.cur[c]||(q.cur[c]={s:0,n:0})).s+=v;q.cur[c].n++;(tot[c]||(tot[c]={s:0,n:0})).s+=v;tot[c].n++;});
    var keys=Object.keys(tot).sort(function(a,b){var x=ORD.indexOf(a),y=ORD.indexOf(b);return (x<0?50:x)-(y<0?50:y)||(a==='؟'?1:b==='؟'?-1:a<b?-1:1);});
    return {tot:tot,keys:keys,cu:S.names.map(function(n){return cu[n];}).concat(Object.keys(cu).filter(function(n){return S.names.indexOf(n)<0;}).map(function(n){return cu[n];})),fail:fail,un:un};}
  /* 1421: الأسعار والربح (اختياري) — لكل عملة سعر شراء وسعر بيع مقوَّمان بعملة أخرى. الربح = المجموع × (البيع − الشراء).
     المطلوب مقابلها = المجموع × سعر البيع، ويُقارن بما استُلم فعلًا من عملة التسعير في الملف نفسه → الفرق (زائد/ناقص). */
  var PX={};try{PX=JSON.parse(localStorage.getItem('bdl_daily_px')||'{}')||{};}catch(e){PX={};}
  function defPc(c){return c==='AOA'?'USDT':'AOA';}
  function bankOf(p){return String(p.bank||'').replace(/\s+/g,' ').trim().slice(0,28);}
  function fin(K){var rows=[],prof={},due={},any=false;K.keys.forEach(function(c){var p=PX[c]||{},b=Number(p.b)||0,sl=Number(p.s)||0,pc=p.pc||defPc(c),t=K.tot[c].s,r={c:c,t:t,b:b,s:sl,pc:pc,profit:null,due:null};
      if(b&&sl){r.profit=t*(sl-b);prof[pc]=(prof[pc]||0)+r.profit;any=true;}if(sl){r.due=t*sl;due[pc]=(due[pc]||0)+r.due;any=true;}rows.push(r);});
    var bal=Object.keys(due).filter(function(pc){return K.tot[pc];}).map(function(pc){return {pc:pc,due:due[pc],got:K.tot[pc].s,diff:K.tot[pc].s-due[pc]};});
    var rate=[],real=K.keys.filter(function(c){return c!=='؟';});if(real.length===2)[['AOA','USDT'],['AOA','USD'],['AOA','EUR'],['MRU','USDT'],['MRU','USD']].forEach(function(q){if(K.tot[q[0]]&&K.tot[q[1]]&&K.tot[q[1]].s)rate.push({a:q[0],b:q[1],v:K.tot[q[0]].s/K.tot[q[1]].s});});
    return {rows:rows,prof:prof,bal:bal,rate:rate,any:any};}
  function banks(K){var o={};D.res.its.forEach(function(it){if(it.st!=='ok')return;var k=it.ccy+'|'+(bankOf(it.p)||'—');(o[k]||(o[k]={c:it.ccy,b:bankOf(it.p)||'—',s:0,n:0})).s+=it.v;o[k].n++;});
    return Object.keys(o).map(function(k){return o[k];}).sort(function(a,b){return K.keys.indexOf(a.c)-K.keys.indexOf(b.c)||b.s-a.s;});}
  function finHtml(K){var F=fin(K),T=TX.ar,x='';
    if(F.rate.length)x+='<div class="fr">'+F.rate.map(function(r){return '<span>السعر الفعلي في الملف: <b>1 '+r.b+' = '+fm(r.v)+' '+r.a+'</b></span>';}).join('')+'</div>';
    F.rows.forEach(function(r){if(r.profit!=null)x+='<div class="fp"><span>ربح '+r.c+' <small>'+fm(r.t)+' × ('+fm(r.s)+' − '+fm(r.b)+')</small></span><b class="'+(r.profit<0?'neg':'')+'">'+fm(r.profit)+' '+r.pc+'</b></div>';});
    Object.keys(F.prof).forEach(function(pc){x+='<div class="fp tt"><span>إجمالي الربح</span><b class="'+(F.prof[pc]<0?'neg':'')+'">'+fm(F.prof[pc])+' '+pc+'</b></div>';});
    F.bal.forEach(function(b){x+='<div class="fb"><span>المطلوب بسعر البيع</span><b>'+fm(b.due)+' '+b.pc+'</b><span>المستلم في الملف</span><b>'+fm(b.got)+' '+b.pc+'</b><span>'+(Math.abs(b.diff)<1?'متطابق':b.diff>0?'زائد عند الزبون (له)':'ناقص على الزبون (عليه)')+'</span><b class="'+(b.diff<-1?'neg':'pos')+'">'+fm(Math.abs(b.diff))+' '+b.pc+'</b></div>';});
    return x||'<div class="fh">أدخل سعر الشراء والبيع لأي عملة ليظهر الربح والمطلوب. اختياري — التقرير يُولَّد بدون أسعار.</div>';}
  function persist(){var S=D.res;if(!S)return;h.sess.save(D.key,{per:S.per,pf:S.pf,pt:S.pt,pall:S.pall,names:S.names,dupN:S.dupN,failN:S.failN||0,nrN:S.nrN||0,stopped:!!S.stopped},S.its.map(function(it){return {file:it.file,data:{cn:it.cn,nm:it.nm,ts:it.ts,pdf:it.pdf,p:it.p,fp:it.fp}};})).then(function(ok){if(!ok)toast('تعذّر حفظ الجلسة على الجهاز — لا تغادر الصفحة قبل أخذ التقرير');});}
  function saveMeta(){var S=D.res;if(!S)return;var ky=D.key+':meta';h.sess.get(ky).then(function(m){if(!m)return;m.rows.forEach(function(r,i){if(S.its[i])r.p=S.its[i].p;});h.sess.put(ky,m);});}
  function fromMeta(m){return {its:(m.rows||[]).map(function(r,i){return {cn:r.cn,nm:r.nm,ts:r.ts,pdf:r.pdf,p:r.p||{},fp:r.fp,file:null,_si:r._f?i:-1};}),per:m.meta.per||'',pf:m.meta.pf,pt:m.meta.pt,pall:m.meta.pall,names:m.meta.names||[],dupN:m.meta.dupN||0,failN:m.meta.failN||0,nrN:m.meta.nrN||0,stopped:m.meta.stopped,restored:m.at,at:m.at};}
  async function restore(){try{var m=await h.sess.load('daily');if(!m||!m.meta||D.res||D.run)return;D.key='daily';D.res=fromMeta(m);paint();}catch(e){}}
  /* 1424: العمليات المحفوظة — «حفظ العملية» يحفظ الحساب كاملًا (البيانات + الصور + الأسعار) على الجهاز ويبقى حتى تحذفه أنت. */
  function opsList(){try{var a=JSON.parse(localStorage.getItem('bdl_daily_ops')||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
  function opsSet(a){try{localStorage.setItem('bdl_daily_ops',JSON.stringify(a));}catch(e){}}
  async function saveOp(){var S=D.res;if(!S)return;toast('جارٍ حفظ العملية…');var old=D.key;
    for(var i=0;i<S.its.length;i++){var it=S.its[i];if(!it.file&&it._si>=0)it.file=await h.sess.file(old,it._si,it.nm,it.pdf);}
    var id=old.indexOf('dsv')===0?old:'dsv'+Date.now(),K=calc(),px={};K.keys.forEach(function(c){if(PX[c])px[c]=PX[c];});
    var live=S.its.filter(function(it){return !failed(it.p);});
    var ok=await h.sess.save(id,{per:S.per,pf:S.pf,pt:S.pt,pall:S.pall,names:S.names,dupN:S.dupN,failN:(S.failN||0)+(S.its.length-live.length),stopped:!!S.stopped,px:px},live.map(function(it){return {file:it.file,data:{cn:it.cn,nm:it.nm,ts:it.ts,pdf:it.pdf,p:it.p,fp:it.fp}};}));
    if(!ok){toast('تعذّر الحفظ — مساحة الجهاز لا تكفي');return;}
    var tot={};K.keys.forEach(function(c){tot[c]=K.tot[c].s;});var L=opsList().filter(function(o){return o.id!==id;});L.unshift({id:id,at:Date.now(),per:S.per,names:S.names,n:live.length,tot:tot});opsSet(L);
    if(old==='daily')h.sess.clear('daily');D.key=id;var m=await h.sess.load(id);if(m){D.res=fromMeta(m);D.res.restored=null;}paint();toast('حُفظت العملية — تبقى حتى تحذفها');}
  async function openOp(id){var m=await h.sess.load(id);if(!m||!m.meta){toast('تعذّر فتح العملية');opsSet(opsList().filter(function(o){return o.id!==id;}));paint();return;}
    D.key=id;D.c=null;D.open={};D.flt='';D.res=fromMeta(m);D.res.restored=null;var px=m.meta.px||{};Object.keys(px).forEach(function(c){PX[c]=px[c];});paint();window.scrollTo(0,0);}
  function delOp(id){if(!confirm('حذف هذه العملية المحفوظة نهائيًا مع صورها؟'))return;h.sess.clear(id);opsSet(opsList().filter(function(o){return o.id!==id;}));if(D.key===id){D.key='daily';D.res=null;}paint();toast('حُذفت العملية');}
  /* ── التقرير ── */
  function repText(){var S=D.res,K=calc(),T=TX[LG],x='BDL · '+T.t+'\n'+T.per+': '+perL(S)+'\n'+(K.cu.length>1?T.cus+': '+K.cu.length+'\n':'')+'\n'+T.tot+':\n'+(K.keys.map(function(c){return '• '+ccode(c)+': '+fm(K.tot[c].s)+' ('+K.tot[c].n+' '+T.rc+')';}).join('\n')||T.none);
    K.cu.forEach(function(q){x+='\n\n— '+q.name+' ('+q.n+' '+T.rc+')\n'+(Object.keys(q.cur).map(function(c){return '  '+ccode(c)+': '+fm(q.cur[c].s)+' ('+q.cur[c].n+')';}).join('\n')||'  '+T.none)+(q.un?'\n  '+T.un+': '+q.un:'')+(q.fail?'\n  '+T.fl+': '+q.fail:'');});
    var F=fin(K);if(F.any){x+='\n\n'+T.px+':';F.rows.forEach(function(r){if(r.b||r.s)x+='\n• '+ccode(r.c)+': '+(r.b?T.buy+' '+fm(r.b)+' ':'')+(r.s?T.sell+' '+fm(r.s)+' ':'')+r.pc+(r.profit!=null?' → '+T.profit+' '+fm(r.profit)+' '+r.pc:'');});Object.keys(F.prof).forEach(function(pc){x+='\n'+T.tp+': '+fm(F.prof[pc])+' '+pc;});F.bal.forEach(function(b){x+='\n'+T.due+': '+fm(b.due)+' '+b.pc+' · '+T.got+': '+fm(b.got)+' '+b.pc+' · '+T.diff+': '+(b.diff>0?'+':'')+fm(b.diff)+' '+b.pc;});}
    F.rate.forEach(function(r){x+='\n'+T.rate+': 1 '+r.b+' = '+fm(r.v)+' '+r.a;});return x;}
  function repHtml(){var S=D.res,K=calc(),T=TX[LG],x='<div class="ph"><div><b>BDL</b><em>lbdal.com</em></div><div><span>'+T.t+'</span><small>'+T.per+': '+esc(perL(S))+'</small><small>'+(K.cu.length>1?T.cus+': '+K.cu.length:esc(K.cu[0]?K.cu[0].name:''))+' · '+T.made+' '+h.dmy(Date.now())+'</small></div></div>'+
      '<div class="pc">'+K.keys.map(function(c){return '<div><small>'+ccode(c)+' · '+cname(c)+'</small><b>'+fm(K.tot[c].s)+'</b><i>'+K.tot[c].n+' '+T.rc+'</i></div>';}).join('')+'</div>'+'<h3>'+T.tot+'</h3><table><tr><th>'+T.cur+'</th><th>'+T.n+'</th><th>'+T.sum+'</th></tr>'+K.keys.map(function(c){return '<tr><td>'+ccode(c)+' — '+cname(c)+'</td><td>'+K.tot[c].n+'</td><td class="n">'+fm(K.tot[c].s)+'</td></tr>';}).join('')+'</table>';
    /* 1425: التقرير مرتَّب حسب العملة — كل إيصالات العملة الواحدة متتالية (بالتاريخ) ثم مجموعها، ثم العملة التالية */
    K.cu.forEach(function(q){x+='<h3>'+esc(q.name)+' — '+q.n+' '+T.rc+(q.un?' · '+T.un+' '+q.un:'')+'</h3>';
      K.keys.filter(function(c){return q.cur[c];}).forEach(function(c){x+='<h4>'+ccode(c)+' — '+cname(c)+' <span>('+q.cur[c].n+' '+T.rc+')</span></h4><table><tr><th>#</th><th>'+T.dt+'</th><th>'+T.bank+'</th><th>'+T.ref+'</th><th>'+T.amt+' ('+ccode(c)+')</th></tr>'+
        q.its.filter(function(it){return it.st==='ok'&&it.ccy===c;}).map(function(it,i){return '<tr><td>'+(i+1)+'</td><td>'+(it.ts?h.dmy(it.ts):'—')+'</td><td>'+esc(bankOf(it.p)||'—')+'</td><td dir="ltr">'+esc(nr(it.p.ref)||'—')+'</td><td class="n">'+fm(it.v)+'</td></tr>';}).join('')+
        '<tr class="t"><td colspan="4">'+T.sub+' '+ccode(c)+' ('+q.cur[c].n+')</td><td class="n">'+fm(q.cur[c].s)+'</td></tr></table>';});});
    var F=fin(K),B=banks(K);
    if(B.length)x+='<h3>'+T.byb+'</h3><table><tr><th>'+T.bank+'</th><th>'+T.cur+'</th><th>'+T.n+'</th><th>'+T.sum+'</th></tr>'+B.map(function(b){return '<tr><td>'+esc(b.b)+'</td><td>'+ccode(b.c)+'</td><td>'+b.n+'</td><td class="n">'+fm(b.s)+'</td></tr>';}).join('')+'</table>';
    if(F.any){x+='<h3>'+T.px+'</h3><table><tr><th>'+T.cur+'</th><th>'+T.sum+'</th><th>'+T.buy+'</th><th>'+T.sell+'</th><th>'+T.profit+'</th></tr>'+F.rows.filter(function(r){return r.b||r.s;}).map(function(r){return '<tr><td>'+ccode(r.c)+'</td><td class="n">'+fm(r.t)+'</td><td class="n">'+(r.b?fm(r.b)+' '+r.pc:'—')+'</td><td class="n">'+(r.s?fm(r.s)+' '+r.pc:'—')+'</td><td class="n">'+(r.profit!=null?fm(r.profit)+' '+r.pc:'—')+'</td></tr>';}).join('')+
        Object.keys(F.prof).map(function(pc){return '<tr class="t"><td colspan="4">'+T.tp+'</td><td class="n">'+fm(F.prof[pc])+' '+pc+'</td></tr>';}).join('')+'</table>'+
        (F.bal.length?'<table style="margin-top:6px"><tr><th>'+T.due+'</th><th>'+T.got+'</th><th>'+T.diff+'</th></tr>'+F.bal.map(function(b){return '<tr><td class="n">'+fm(b.due)+' '+b.pc+'</td><td class="n">'+fm(b.got)+' '+b.pc+'</td><td class="n">'+(b.diff>0?'+':'')+fm(b.diff)+' '+b.pc+'</td></tr>';}).join('')+'</table>':'');}
    if(F.rate.length)x+='<p>'+F.rate.map(function(r){return T.rate+': 1 '+r.b+' = '+fm(r.v)+' '+r.a;}).join(' · ')+'</p>';
    return x+'<p class="pf">'+T.ft+'</p>';}
  /* ── عارض الإيصال مع التصحيح اليدوي ── */
  function nx(i,d){var S=D.res;for(var k=i+d;k>=0&&k<S.its.length;k+=d)if(!failed(S.its[k].p))return k;return -1;}
  function fitV(){var v=$('laRv'),vv=window.visualViewport;if(!v||!vv)return;if(D.v==null){v.style.height='';v.style.top='';v.style.bottom='';return;}v.style.top=vv.offsetTop+'px';v.style.bottom='auto';v.style.height=vv.height+'px';}
  if(window.visualViewport){window.visualViewport.addEventListener('resize',fitV);window.visualViewport.addEventListener('scroll',fitV);}
  async function view(i){var S=D.res,it=S&&S.its[i];if(!it)return;if(D.v==null)D.y=window.scrollY;D.v=i;var v=$('laRv');if(!v){v=document.createElement('div');v.id='laRv';document.body.appendChild(v);}
    if(!it.file&&it._si>=0)it.file=await h.sess.file(D.key,it._si,it.nm,it.pdf);if(it._u){URL.revokeObjectURL(it._u);it._u='';}if(it.file)it._u=URL.createObjectURL(it.file);var p=it.p||{},c=ccyOf(p),opts=ORD.concat(ORD.indexOf(c)<0&&c!=='؟'?[c]:[]);
    v.innerHTML='<header><div><b>'+esc(it.cn||'إيصال')+'</b><small>'+(bankOf(p)?esc(bankOf(p))+' · ':'')+(it.ts?h.dmy(it.ts):'')+(nr(p.ref)?' · '+esc(nr(p.ref)):'')+(failed(p)?' · غير ناجحة':'')+'</small></div><button type="button" data-dv="x">✕ إغلاق</button></header>'+
      '<div class="et"><div class="eh2">تعديل الإيصال — صحّح ثم احفظ</div><div class="de"><label><small>المبلغ</small><input id="ldAmt" inputmode="decimal" value="'+(amt(p.amount)||'')+'" placeholder="اكتب المبلغ"></label><label><small>العملة</small><select id="ldCcy">'+(c==='؟'?'<option value="">اختر</option>':'')+opts.map(function(o){return '<option'+(o===c?' selected':'')+'>'+o+'</option>';}).join('')+'</select></label><label><small>البنك</small><input id="ldBank" value="'+esc(p.bank||'')+'" placeholder="اسم البنك"></label><label><small>المرجع / رقم العملية</small><input id="ldRef" dir="ltr" value="'+esc(p.ref||'')+'" placeholder="اختياري"></label></div>'+'</div>'+
      '<div class="bd">'+(!it._u?'<p style="color:#9FB0CC;padding:30px 16px;text-align:center;font-size:13px">صورة هذا الإيصال لم تُحفظ على الجهاز. أعد الحساب لعرضها (القراءة من الذاكرة فورًا).</p>':it.pdf?'<iframe src="'+it._u+'"></iframe>':'<img src="'+it._u+'" alt="">')+'</div>'+
      '<footer>'+
      '<div class="nv"><button type="button" data-dv="p"'+(nx(i,-1)>=0?'':' disabled')+'>‹ السابق</button><button type="button" data-dv="n"'+(nx(i,1)>=0?'':' disabled')+'>التالي ›</button></div><div class="dc"><button type="button" class="ok" data-dv="sv">حفظ التعديل</button><button type="button" class="sus" data-dv="no">حذف من الحساب</button></div></footer>';
    v.classList.add('on');fitV();}
  function closeV(){var v=$('laRv');if(v)v.classList.remove('on');D.v=null;fitV();paint();if(D.y!=null){window.scrollTo(0,D.y);D.y=null;}}
  /* ── العرض ── */
  function paint(){var m=$('ldMain');if(!m)return;var R=D.run,x='';
    if(R){var p=Math.round(R.d/Math.max(1,R.n)*100),el=(Date.now()-R.t0)/1000,eta=R.d>8?Math.round(el/R.d*(R.n-R.d)):0;
      x='<section class="pg"><div class="br"><i style="width:'+p+'%"></i></div><div class="pr2">الفترة: <b>'+esc(R.per)+'</b></div><div class="tx"><b>'+p+'%</b>قراءة إيصالات '+(R.cn?'«'+esc(R.cn)+'» ':'')+R.d+' / '+R.n+(eta?' · الباقي نحو '+(eta>90?Math.round(eta/60)+' د':eta+' ث'):'')+'</div><div class="fn">'+esc(R.cur||'')+'</div><button type="button" class="bt ln" data-da="stop">إيقاف</button></section>';
      var pg=m.querySelector('.pg[data-live]');if(pg){var t=document.createElement('div');t.innerHTML=x;var np=t.firstChild;pg.querySelector('.br i').style.width=p+'%';['.tx','.fn'].forEach(function(q){var o=pg.querySelector(q),n=np.querySelector(q);if(o&&n&&o.innerHTML!==n.innerHTML)o.innerHTML=n.innerHTML;});return;}
      m.innerHTML=x;m.querySelector('.pg').setAttribute('data-live','1');return;}
    if(D.res){var S=D.res,K=calc();
      x='<section class="rs">'+(S.restored?'<div class="rst">حساب محفوظ من '+new Date(S.restored).toLocaleString('en-GB',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' — يبقى حتى تنهيه أنت</div>':'')+
        '<div class="vd ok"><b>الحسابات اليومية — '+esc(S.per)+'</b><span>'+(K.cu.length>1?K.cu.length+' زبائن':'الزبون '+esc(K.cu[0]?K.cu[0].name:''))+' · '+(S.its.length-K.fail)+' إيصالًا'+(S.stopped?' — أُوقف قبل اكتماله':'')+'</span></div>'+
        (function(){var nc=S.its.filter(function(it){return !it.p.man&&it.p.eng!=='claude'&&!failed(it.p);}).length;return nc?'<div class="wr"><b>'+nc+' إيصالًا لم يقرأها Claude</b> — قُرئت بالقارئ الاحتياطي الأقل دقة'+(window.__bdlReadErr?' ('+esc(window.__bdlReadErr)+')':'')+'. سجّل الدخول من «حسابي» ثم اضغط <button type="button" class="lk" data-da="reread">أعد القراءة بـ Claude</button></div>':'';})()+
        '<div class="cb">'+(K.keys.map(function(c){return '<div data-df="'+c+'" class="'+(c==='؟'?'q':'')+(D.flt===c?' sel':'')+'"><small>'+fl(c)+c+(CN[c]&&CN[c]!==c?' · '+CN[c]:'')+'</small><b>'+fm(K.tot[c].s)+'</b><i>'+K.tot[c].n+' إيصالًا</i></div>';}).join('')||'<div class="q"><small>لا مبالغ مقروءة</small><b>0</b></div>')+'</div>'+
        '<div class="nt">'+(D.flt?'تعرض إيصالات <b>'+D.flt+'</b> فقط — <button type="button" data-df="" class="lk">عرض الكل</button>':'اضغط خانة أي عملة لعرض إيصالاتها وحدها. كل إيصال يُفتح ويُعدَّل ويُحفظ.')+'</div>'+
        '<div class="px"><div class="pxh"><b>الأسعار والربح</b><small>اختياري — شراء وبيع لكل عملة</small></div>'+K.keys.filter(function(c){return c!=='؟';}).map(function(c){var p=PX[c]||{},pc=p.pc||defPc(c);return '<div class="pxr"><b>'+flag(c)+'<span>'+c+'</span></b><label><small>شراء</small><input inputmode="decimal" data-px="'+c+':b" value="'+(p.b||'')+'" placeholder="0"></label><label><small>بيع</small><input inputmode="decimal" data-px="'+c+':s" value="'+(p.s||'')+'" placeholder="0"></label><label><small>بعملة</small><select data-px="'+c+':pc">'+ORD.filter(function(o){return o!==c;}).map(function(o){return '<option value="'+o+'"'+(o===pc?' selected':'')+'>'+fl(o)+o+'</option>';}).join('')+'</select></label></div>';}).join('')+'<div id="ldFin">'+finHtml(K)+'</div></div>'+
        (function(){var B=banks(K);return B.length?'<details class="mt bkd"><summary>حسب البنك ('+B.length+')</summary><div class="bkt">'+B.map(function(b){return '<div><span>'+esc(b.b)+'</span><small>'+b.n+' إيصالًا</small><b>'+fm(b.s)+' <i>'+b.c+'</i></b></div>';}).join('')+'</div></details>':'';})()+
        ((K.un||K.fail||S.failN||S.dupN||S.nrN)?'<div class="nt">'+[K.un?'<b style="color:#8A6100">'+K.un+' تحتاج مراجعتك (بالأصفر) — افتحها وصحّحها لتدخل في المجموع</b>':'',S.nrN?S.nrN+' صورة ليست إيصالًا استُبعدت':'',(K.fail+(S.failN||0))?(K.fail+(S.failN||0))+' غير ناجحة حُذفت تلقائيًا':'',S.dupN?S.dupN+' مكررة حُسبت مرة واحدة':''].filter(Boolean).join(' · ')+'</div>':'')+
        K.cu.map(function(q,ci){var op=!!D.open[q.name]||K.cu.length===1||!!D.flt;return '<div class="cc"><div class="ch2" data-dc="'+ci+'"><b>'+esc(q.name)+'</b><span>'+q.n+' إيصالًا'+(q.un?' · <em>'+q.un+' لم يُقرأ</em>':'')+'</span></div>'+
          '<div class="cv">'+(Object.keys(q.cur).map(function(c){return '<span><small>'+c+'</small><b>'+fm(q.cur[c].s)+'</b></span>';}).join('')||'<span><small>—</small><b>0</b></span>')+'</div>'+
          (K.cu.length>1?'<button type="button" class="tg" data-dc="'+ci+'">'+(op?'إخفاء الإيصالات':'عرض الإيصالات ('+q.its.length+')')+'</button>':'')+
          (op?q.its.filter(function(it){return !D.flt||(it.st==='ok'&&it.ccy===D.flt);}).map(function(it,ri,arr){var dk=it.ts?h.dmy(it.ts).slice(0,10):'بلا تاريخ',pk=ri?(arr[ri-1].ts?h.dmy(arr[ri-1].ts).slice(0,10):'بلا تاريخ'):'';return (dk!==pk?'<div class="dy">'+dk+'</div>':'')+'<div class="rw '+(it.st==='ok'?'g':it.st==='un'?'a':'r')+'"><div class="mn"><b>'+(it.st==='ok'?fm(it.v)+' <small>'+it.ccy+'</small>':it.st==='un'?esc(it.why||'لم يُقرأ المبلغ')+(it.v&&it.ccy!=='؟'?' <small>'+fm(it.v)+'</small>':''):'غير ناجحة')+'</b><span class="bk">'+esc(bankOf(it.p)||'بنك غير مقروء')+'</span><span>'+esc([it.ts?h.dmy(it.ts).slice(13):'',nr(it.p.ref)||'بلا مرجع'].filter(Boolean).join(' · '))+'</span></div>'+(it.p.man?'<em class="chk ok">معدَّل ✓</em>':'')+'<button type="button" data-do="'+it.i+'">فتح / تعديل</button></div>';}).join(''):'')+'</div>';}).join('')+
        '<div class="lg"><span>لغة التقرير</span><button type="button" data-dl="ar"'+(LG==='ar'?' class="on"':'')+'>العربية</button><button type="button" data-dl="pt"'+(LG==='pt'?' class="on"':'')+'>Português</button></div><div class="bs"><button type="button" class="bt sv" data-da="save">'+(D.key!=='daily'?'✓ محفوظة — تحديث الحفظ':'حفظ العملية')+'</button><button type="button" class="bt" data-da="share">مشاركة التقرير</button><button type="button" class="bt" data-da="print">تقرير للطباعة / PDF</button><button type="button" class="bt ln" data-da="new">'+(D.key!=='daily'?'إغلاق — العودة للقائمة':'إنهاء وحساب جديد')+'</button>'+(D.key!=='daily'?'<button type="button" class="bt ln dl" data-dz="'+D.key+'">حذف هذه العملية</button>':'')+'</div></section>';
      var bo=m.querySelector('details.bkd')&&m.querySelector('details.bkd').open;m.innerHTML=x;if(bo&&m.querySelector('details.bkd'))m.querySelector('details.bkd').open=true;return;}
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
    var OL=opsList();if(OL.length)x+='<section class="ops"><h3>العمليات المحفوظة ('+OL.length+')</h3>'+OL.map(function(o){return '<div class="op"><div class="oi"><b>'+esc((o.names||[]).join(' · ')||'عملية')+'</b><small>'+esc(o.per||'')+' · '+o.n+' إيصالًا · حُفظت '+h.dmy(o.at)+'</small><span>'+Object.keys(o.tot||{}).map(function(c){return fl(c)+c+' '+fm(o.tot[c]);}).join('  ·  ')+'</span></div><div class="ob"><button type="button" data-dp="'+o.id+'">فتح</button><button type="button" class="d" data-dz="'+o.id+'">حذف</button></div></div>';}).join('')+'</section>';
    m.innerHTML=x;}
  document.addEventListener('click',function(e){var t=e.target,b;if(!t.closest)return;
    if((b=t.closest('[data-da]'))){var a=b.dataset.da;
      if(a==='pick'){var i=$('ldFile');i.value='';i.click();}
      else if(a==='go')start();
      else if(a==='stop'){if(D.run)D.run.stop=true;b.disabled=true;b.textContent='جارٍ الإيقاف…';}
      else if(a==='save')saveOp();
      else if(a==='reread')reread();
      else if(a==='new'&&D.key!=='daily'){D.key='daily';D.c=D.res=null;D.open={};D.flt='';paint();window.scrollTo(0,0);}
      else if(a==='new'){if(confirm('إنهاء هذا الحساب وبدء حساب جديد؟\nالنتيجة الحالية وصورها تُمسح من الجهاز. ذاكرة القراءة تبقى.')){D.c=D.res=null;D.open={};D.flt='';h.sess.clear('daily');paint();}}
      else if(a==='share'){var tx=repText();if(navigator.share)navigator.share({text:tx}).catch(function(){});else (navigator.clipboard?navigator.clipboard.writeText(tx):Promise.reject()).then(function(){toast('نُسخ التقرير');},function(){prompt('انسخ:',tx);});}
      else if(a==='print'){var pr=$('ldPrint');if(!pr){pr=document.createElement('div');pr.id='ldPrint';document.body.appendChild(pr);}pr.innerHTML=repHtml();pr.setAttribute('dir',LG==='pt'?'ltr':'rtl');document.body.classList.add('ldp');setTimeout(function(){window.print();setTimeout(function(){document.body.classList.remove('ldp');},800);},80);}
      return;}
    if((b=t.closest('[data-dz]'))){delOp(b.dataset.dz);return;}
    if((b=t.closest('[data-dp]'))){openOp(b.dataset.dp);return;}
    if((b=t.closest('[data-dl]'))){LG=b.dataset.dl==='pt'?'pt':'ar';try{localStorage.setItem('bdl_daily_lang',LG);}catch(x){}paint();return;}
    if((b=t.closest('[data-df]'))){D.flt=D.flt===b.dataset.df?'':b.dataset.df;paint();return;}
    if((b=t.closest('[data-dx]'))){var c=D.c,pi=+b.dataset.dx;if(!c||!c.parts[pi])return;var pn=c.parts[pi].name;c.list=c.list.filter(function(x){return x.cn!==pn;});c.parts.splice(pi,1);if(c.parts.length)span(c);else D.c=null;paint();return;}
    if((b=t.closest('[data-dq]'))){var c2=D.c;if(!c2)return;c2.all=b.dataset.dq==='all';if(!c2.all){c2.to=c2.max;c2.from=Math.max(c2.min,c2.max-(+b.dataset.dq-1)*DAY);}paint();return;}
    if((b=t.closest('[data-do]'))){view(+b.dataset.do);return;}
    if((b=t.closest('[data-dc]'))){var cu=calc().cu[+b.dataset.dc];if(cu){D.open[cu.name]=!D.open[cu.name];paint();}return;}
    if((b=t.closest('[data-dv]'))){var k=b.dataset.dv,S=D.res;if(D.v==null||!S)return;var it=S.its[D.v];
      if(k==='x'){closeV();return;}if(k==='p'){view(nx(D.v,-1));return;}if(k==='n'){view(nx(D.v,1));return;}
      if(k==='no'){it.p.status='cancelled';it.p.man=1;cput(it.fp,it.p);saveMeta();toast('حُذف الإيصال من الحساب');}
      else if(k==='sv'){var v=Number(String($('ldAmt').value).replace(/[\s,]/g,''))||0,cc=$('ldCcy').value;if(!amt(v)){toast('اكتب مبلغًا صحيحًا');return;}if(!cc){toast('اختر العملة');return;}
        it.p.amount=v;it.p.ccy=cc;it.p.ref=String($('ldRef').value||'').trim();it.p.bank=String($('ldBank').value||'').trim();it.p.man=1;if(failed(it.p))it.p.status='';cput(it.fp,it.p);saveMeta();toast('حُفظ التعديل ودخل في المجموع');}
      if(D.v<S.its.length-1&&k==='sv'&&S.its[D.v+1].st==='un'){calc();view(D.v+1);}else closeV();return;}});
  document.addEventListener('change',function(e){var t=e.target;if(t.id==='ldFile'){pick(t.files);return;}
    if(t.dataset&&t.dataset.px){var q=t.dataset.px.split(':'),o=PX[q[0]]||(PX[q[0]]={});if(q[1]==='pc')o.pc=t.value;else{var nv=Number(String(t.value).replace(/[\s,]/g,''))||0;o[q[1]]=nv>0?nv:0;}try{localStorage.setItem('bdl_daily_px',JSON.stringify(PX));}catch(x){}var fd=$('ldFin');if(fd&&D.res)fd.innerHTML=finHtml(calc());return;}
    if(t.dataset&&t.dataset.dd){var c=D.c;if(!c||!t.value)return;var p=t.value.split('-');c[t.dataset.dd]=new Date(+p[0],+p[1]-1,+p[2]).getTime();if(c.all){if(t.dataset.dd==='from')c.to=c.max;else c.from=c.min;}if(c.from>c.to){if(t.dataset.dd==='from')c.to=c.from;else c.from=c.to;}c.all=false;paint();}});
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#lbMode button');if(b&&b.dataset.md==='d')paint();});
  window.__LABD={saveOp:saveOp,openOp:openOp,opsList:opsList,fin:fin,PX:PX,D:D,calc:calc,ccyOf:ccyOf,paint:paint,repText:repText,repHtml:repHtml};
  function init(){if(!$('ldFile')){var i=document.createElement('input');i.type='file';i.id='ldFile';i.multiple=true;i.style.display='none';document.body.appendChild(i);}paint();restore();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
