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
  /* 1415: عدة زبائن في مسح واحد — حتى 10 ملفات ZIP، يُفتح كل ملف وحده ويُسجَّل باسمه، ثم تُقارن كلها بمورد واحد. */
  function isZip(x){return /\.zip$/i.test(x.name||'')||/zip/i.test(x.type||'');}
  async function open1(files){var o={name:'',list:[]},zf=files.find(isZip);
    if(zf){if(zf.size>300*1048576&&!confirm('الملف كبير ('+Math.round(zf.size/1048576)+' MB) وقد لا يتحمله الهاتف. المتابعة؟'))return null;
      await h.loadZip();var z=await window.JSZip.loadAsync(zf),idx=await h.waChatIndex(z);o.name=h.zName(zf.name);
      z.forEach(function(p,en){if(en.dir)return;var nm=p.split('/').pop();if(!h.isDoc(nm,'')||/STICKER|-STK-/i.test(nm))return;o.list.push({nm:nm,en:en,ts:idx[nm.toLowerCase()]||h.waStamp(nm)||0});});}
    files.forEach(function(x){if(x!==zf&&h.isDoc(x.name,x.type))o.list.push({nm:x.name,file:x,ts:x.lastModified||Date.now()});});
    o.src=files;if(!o.name)o.name=o.list.length+' ملف';if(!o.list.length)throw new Error('لا صور ولا PDF في «'+((zf&&zf.name)||'الملف')+'» — صدّر المحادثة مع الوسائط');return o;}
  function span(o,side){var days=o.list.filter(function(x){return x.ts;}).map(function(x){return d0(x.ts);}),om=o.max,had=o.from!=null;o.max=days.length?Math.max.apply(null,days):d0(Date.now());o.min=days.length?Math.min.apply(null,days):o.max;
    if(!had){o.to=o.max;o.from=side==='c'?Math.max(o.min,o.max-29*DAY):o.min;o.all=side==='s';}
    else{if(o.to===om||o.to>o.max){var len=o.to-o.from;o.to=o.max;o.from=o.to-len;}if(o.from<o.min)o.from=o.min;if(o.from>o.to)o.from=o.to;}}
  function recalc(c){c.name=c.parts.length===1?c.parts[0].name:c.parts.length+' '+(c.side==='s'?'موردين':'زبائن');c.src=[];c.parts.forEach(function(q){c.src=c.src.concat(q.src);});span(c,c.side);}
  async function pick(side,files){files=[].slice.call(files||[]);if(!files.length)return;
    side=side==='s'?'s':'c';var WD=side==='s'?'موردين':'زبائن';
    var groups=files.filter(isZip).map(function(z){return [z];}),loose=files.filter(function(x){return !isZip(x);});if(loose.length)groups.push(loose);
    var c=A[side]&&!A[side].err&&A[side].parts?A[side]:null;if(!c){c={side:side,name:'',list:[],parts:[],src:[],err:''};A[side]=c;}A.res=null;
    for(var i=0;i<groups.length;i++){if(c.parts.length>=10){toast('الحد 10 '+WD+' في المسح الواحد');break;}c.busy='جارٍ فتح ملف '+(i+1)+' من '+groups.length+'…';paint();
      try{var g=await open1(groups[i]);if(!g)continue;if(c.parts.some(function(q){return q.name===g.name;})){toast('«'+g.name+'» مضاف من قبل');continue;}
        g.list.forEach(function(x){x.cn=g.name;});c.parts.push({name:g.name,n:g.list.length,src:g.src});c.list=c.list.concat(g.list);}catch(e){toast((e&&e.message)||'تعذّر فتح الملف');}}
    c.busy=false;if(!c.parts.length)c.err='لم يُفتح أي ملف — صدّر المحادثة مع الوسائط';else recalc(c);paint();}
  function selP(o){var n={};return sel(o).filter(function(x){return (n[x.cn]=(n[x.cn]||0)+1)<=3000;});}
  function sel(o){return o.all?o.list.slice():o.list.filter(function(x){if(!x.ts)return false;var k=d0(x.ts);return k>=o.from&&k<=o.to;});}
  /* ── الفحص ── */
  /* ═══ 1413: المسح (Scan) — ١ يُفكّ ملف المورد كاملًا وتُسجَّل أسماء وأرقام حساباته  ٢ يُفحص ملف الزبون:
     كل إيصال مدفوع على حساب/اسم للمورد ولا يوجد مقابله في إيصالات المورد = يُسجَّل «للتأكد».
     يُستبعد تلقائيًا ولا يُحتفظ به: USDT والأوقية، الإيصالات غير الناجحة، وكل ما ليس على حسابات المورد. ═══ */
  function nr(v){v=String(v==null?'':v).replace(/[^A-Za-z0-9]+/g,'').toUpperCase();return v.length>=5?v:'';}
  /* 1443: ذيل رقم العملية — الأرقام فقط، آخر 8؛ يصمد أمام بادئات مثل Nº / OP / قراءة حرف بدل رقم في البداية */
  function nrT(v){v=String(v==null?'':v).replace(/\D/g,'');return v.length>=8?v.slice(-8):'';}
  /* 1443: بصمة إدراكية dHash 64 بت للصورة — تطابق الصورة نفسها حتى لو أُعيد ضغطها أو حُفظت وأُرسلت من جديد */
  async function dhash(file){if(!file||/pdf$/i.test(file.type||file.name||''))return '';try{var im=await createImageBitmap(file),c=document.createElement('canvas');c.width=9;c.height=8;var g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,9,8);var d=g.getImageData(0,0,9,8).data,b='';
      for(var y=0;y<8;y++)for(var x=0;x<8;x++){var i=(y*9+x)*4,j=i+4,l=d[i]*.3+d[i+1]*.59+d[i+2]*.11,r=d[j]*.3+d[j+1]*.59+d[j+2]*.11;b+=l>r?'1':'0';}try{im.close();}catch(e){}return b;}catch(e){return '';}}
  function ham(a,b){if(!a||!b||a.length!==b.length)return 99;var n=0;for(var i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n;}
  async function phOf(it){if(it.ph!==undefined)return it.ph;var f=it.file;if(!f&&it.src){try{f=await loadFile(it.src);}catch(e){}}if(!f&&it._si>=0){try{f=await h.sess.file('acct',it._si,it.nm,it.pdf);}catch(e){}}it.ph=f?await dhash(f):'';return it.ph;}
  function am(v){v=Number(v)||0;return v>=100&&v<1e11?v:0;}
  function dropWhy(p){var c=String(p.ccy||'').toUpperCase();
    if(/USDT|USDC|USD|MRU|MRO|EUR|CNY|AED/.test(c)||/bankily|masrvi|sedad|binance|trust ?wallet|tron|okx|bybit|bmci/i.test(p.bank||''))return 'fx';
    if(/fail|rejei|recus|cancel|pend|erro|declin|فشل|مرفوض|ملغ/i.test(p.status||''))return 'fail';return '';}
  async function loadFile(x){var file=x.file;if(!file){var bl=await x.en.async('blob'),ex=x.nm.split('.').pop().toLowerCase();file=new File([bl],x.nm,{type:ex==='pdf'?'application/pdf':ex==='png'?'image/png':ex==='webp'?'image/webp':'image/jpeg'});}return file;}
  /* 1439: pre(fp,sz,ts) — إن عُرفت الصورة من ملف المورد (البصمة نفسها أو الحجم نفسه في اليوم نفسه) تُؤخذ قراءتها منه ولا تُرسل للقراءة من جديد */
  /* 1441: إيصالات PDF للبنوك الأنغولية (BAI Directo، BFA، BIC، Atlântico، Keve…) تُقرأ من طبقة النص محليًا بقالب ثابت — بلا خادم ولا ذكاء اصطناعي، مبلغ ومرجع دقيقان */
  function numAO(t){t=String(t||'').replace(/\s|\./g,'').replace(',','.');var v=parseFloat(t);return isFinite(v)?Math.round(v*100)/100:0;}
  function parseAO(txt){if(!txt||txt.replace(/\s/g,'').length<40)return null;var T=txt.replace(/\u00a0/g,' '),U=T.toUpperCase(),m,p={amount:0,ref:'',bank:'',date:'',name:'',account:'',receiver:'',sender:'',ccy:'',status:''};
    m=/(?:MONTANTE|VALOR(?: DA TRANSFER[ÊE]NCIA)?|IMPORT[ÂA]NCIA|AMOUNT|TOTAL A DEBITAR)\s*[:\-]?\s*(?:KZ|AOA|AKZ)?\s*([0-9][0-9 .]*,[0-9]{2})/i.exec(T)||/(?:KZ|AOA|AKZ)\s*([0-9][0-9 .]*,[0-9]{2})(?!\s*\d)/i.exec(T)||/([0-9][0-9 .]*,[0-9]{2})\s*(?:KZ|AOA|AKZ)/i.exec(T);
    if(m)p.amount=numAO(m[1]);if(!p.amount)return null;p.ccy='AOA';
    var RF=['N[ÚU]MERO DE OPERA[ÇC][ÃA]O','N[ºO.]?\\s*(?:DE )?OPERA[ÇC][ÃA]O','REFER[ÊE]NCIA(?: DA OPERA[ÇC][ÃA]O| DO MOVIMENTO| DA TRANSA[ÇC][ÃA]O)?','ID DA TRANSA[ÇC][ÃA]O','TRANSACTION(?: ID| REFERENCE)?','N[ÚU]MERO DO DOCUMENTO','(?:^|[^A-Z])MOVIMENTO'];
    for(var ri=0;ri<RF.length&&!p.ref;ri++){m=new RegExp(RF[ri]+'\\s*[:#Nº.]*\\s*(?=[A-Z0-9\\-\\/]*\\d)([A-Z0-9][A-Z0-9\\-\\/]{5,})','i').exec(T);if(m)p.ref=m[1];}
    var ib=T.match(/AO06\s*[0-9][0-9 ]{19,}/g)||[];ib=ib.map(function(x){return x.replace(/\s/g,'');});
    m=/(?:CONTA\s*\/\s*IBAN|IBAN(?: DO BENEFICI[ÁA]RIO| DESTINO)?|CONTA DESTINO|CONTA DE DESTINO)\s*[:]*\s*(AO06\s*[0-9][0-9 ]{19,})/i.exec(T.slice(Math.max(0,U.indexOf('BENEFICI'))));if(m)p.account=m[1].replace(/\s/g,'');
    if(!p.account)p.account=ib.length>=2?ib[1]:ib[0]||'';
    var NM='\\s*:?\\s*([A-ZÀ-Ü][A-ZÀ-Ü0-9 .,&\'\\-]{2,90}?)(?=\\s*(?:IBAN|CONTA|BANCO|PARA\\b|DADOS|DE:|NIF|N[ºO]|TELEFONE|\\n|$))';
    m=new RegExp('DADOS DO BENEFICI[ÁA]RIO[\\s\\S]{0,120}?Nome'+NM).exec(T)||new RegExp('(?:PARA|Benefici[áa]rio|Destinat[áa]rio|Nome do Benefici[áa]rio|Favorecido)'+NM).exec(T);if(m)p.name=m[1].trim();
    m=new RegExp('(?:\\bDE|Ordenante|Nome do Ordenante|Remetente)'+NM).exec(T);if(m)p.sender=m[1].trim();
    p.bank=/BAI DIRECTO|BANCO ANGOLANO DE INVESTIMENTOS|\bBAI\b/.test(U)?'BAI':/\bBFA\b|FOMENTO ANGOLA/.test(U)?'BFA':/ATL[ÂA]NTICO/.test(U)?'Atlântico':/\bBIC\b/.test(U)?'BIC':/KEVE/.test(U)?'Keve':/\bBPC\b|POUPAN[ÇC]A E CR[ÉE]DITO/.test(U)?'BPC':/STANDARD BANK/.test(U)?'Standard Bank':/MILLENNIUM/.test(U)?'Millennium':/\bBCI\b/.test(U)?'BCI':/\bSOL\b/.test(U)?'Sol':/YETU/.test(U)?'Yetu':/\bBNI\b/.test(U)?'BNI':/CAIXA/.test(U)?'Caixa':'';
    m=/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/.exec(T);if(m)p.date=m[1].replace(/-/g,'/');
    p.status=/REJEI|RECUS|CANCEL|N[ÃA]O (?:FOI )?(?:EXECUT|PROCESS)|ERRO|PENDENTE/i.test(U)?'falhou':/SUCESSO|EFECTUAD|EFETUAD|PROCESSADO|REALIZAD|CONCLU[ÍI]D/i.test(U)?'sucesso':'';
    p.receiver=p.account||p.name;return p;}
  async function readOne(x,side,R,pre,fp0){var file=await loadFile(x);
    var fp=fp0||await h.sha(file),p=await cget(fp),pr=null,pdfNow=false;
    if(!(p&&p.ccy!==undefined)&&pre){pr=pre(fp,file.size||0,x.ts||0);if(pr){p=pr.p;R.pre++;}}
    if(!(p&&p.ccy!==undefined)&&/pdf$/i.test(file.type||x.nm)){try{var tx=await window.ArkanRead.pdfText(file),q=parseAO(tx);if(q&&q.amount&&(q.ref||q.account)){p=q;R.pdf=(R.pdf||0)+1;pdfNow=true;cput(fp,p);}}catch(e){}}
    if(p&&p.ccy!==undefined){if(!pr&&!pdfNow)R.hit++;}else{var r=await Promise.race([window.ArkanRead.read(file),new Promise(function(z){setTimeout(function(){z(null);},45000);})]),g=(r&&r.parsed)||{};
      p={amount:Number(g.amount)||0,ref:g.transaction_id||g.reference||g.txn||'',bank:g.bank||g.institution||'',date:g.date||'',name:g.beneficiary||g.name||'',account:g.iban||g.account||'',receiver:g.receiver||'',ccy:String(g.currency||g.ccy||''),status:String(g.status||''),conf:+g.confidence||0,weak:!!(g.weak||(g.confidence&&+g.confidence<70)||g.amount_model)};
      if(p.amount||p.name||p.account||p.receiver)cput(fp,p);}
    return {side:side,cn:x.cn||'',file:file,src:x,sz:file.size||0,nm:x.nm,ts:x.ts||0,pdf:/pdf$/i.test(file.type||x.nm),p:p,fp:fp,pre:pr?pr.how:''};}
  function fastItem(x,side,c){return {side:side,cn:x.cn||'',file:null,src:x,sz:c.sz||0,nm:x.nm,ts:x.ts||0,pdf:/pdf$/i.test(x.nm),p:c.p||{},fp:c.fp,pre:c.pre||''};}
  async function mat(it){if(!it.file&&it.src){try{it.file=await loadFile(it.src);}catch(e){}}if(!it.file&&it._si>=0){try{it.file=await h.sess.file('acct',it._si,it.nm,it.pdf);}catch(e){}}return it;}
  /* 1439: مصادر المسح تُحفظ ملفًا ملفًا (لا معاملة واحدة ضخمة) حتى تصمد ملفات السنة */
  async function putSrc(key,o){var m={n:o.s.length+o.c.length,ns:o.s.length,from:o.from,to:o.to,all:o.all,sf:o.sf,st:o.st,sa:o.sa,at:o.at},ok=true,fl=o.s.concat(o.c);
    for(var i=0;i<fl.length;i++){if(!(await h.sess.put(key+':f:'+i,fl[i])))ok=false;}if(!(await h.sess.put(key,m)))ok=false;return ok;}
  async function getSrc(key){var m=await h.sess.get(key);if(!m)return null;if(m.s&&m.c)return m;if(m.n==null)return null;var fl=[];for(var i=0;i<m.n;i++){var f=await h.sess.get(key+':f:'+i);if(!f)return null;fl.push(f);}
    return {s:fl.slice(0,m.ns),c:fl.slice(m.ns),from:m.from,to:m.to,all:m.all,sf:m.sf,st:m.st,sa:m.sa,at:m.at};}
  async function delSrc(key){var m=await h.sess.get(key);h.sess.del(key);if(m&&m.n)for(var i=0;i<m.n;i++)h.sess.del(key+':f:'+i);}
  /* 1439: نقطة حفظ لكل إيصال مقروء — عند العودة يُقفز فوق المقروء فورًا بلا إعادة فك ولا إعادة قراءة */
  var CK={},CKD=false,CKT=0;function kf(side,x){return side+'|'+(x.cn||'')+'|'+x.nm+'|'+(x.file?x.file.size:'')+'|'+(x.ts||0);}
  function ckSave(force){if(!CKD)return;if(!force&&CKT)return;if(CKT)clearTimeout(CKT);CKT=setTimeout(function(){CKT=0;CKD=false;h.sess.put('job:acct:ck',CK);},force?0:1500);}
  /* ═══ 1442: المسح على الخادم — يواصل حتى لو أُغلقت الصفحة ═══
     ملفات ZIP تُرفع إلى Railway؛ الخادم يفكّ ويحسب البصمات ويُسقط المطابق بالصورة ويقرأ الباقي (Claude + PDF محلي) ويحفظ 24 ساعة.
     الهاتف يسحب القراءات عند العودة ويُكمل المطابقة فورًا من نقاط الحفظ. */
  var SRV='https://arkan-ai-site-production.up.railway.app';
  function tok(){try{var j=JSON.parse(localStorage.getItem('arkan_sb_jwt')||'null');return j&&j.token&&(!j.exp||j.exp>Math.floor(Date.now()/1000)+60)?j.token:'';}catch(e){return '';}}
  async function sj(u,o){o=o||{};o.headers=Object.assign({Authorization:'Bearer '+tok()},o.headers||{});var r=await fetch(SRV+u,o),j=null;try{j=await r.json();}catch(e){}if(!r.ok)throw new Error((j&&j.error)||('HTTP '+r.status));return j;}
  function allZip(o){return o&&o.parts&&o.parts.length&&o.parts.every(function(q){return q.src&&q.src.length===1&&isZip(q.src[0]);});}
  async function srvStart(R){if(!tok()||!allZip(A.s)||!allZip(A.c))return '';
    try{var id=(await sj('/lab/job',{method:'POST'})).id,fl=A.s.parts.map(function(q){return {side:'s',f:q.src[0]};}).concat(A.c.parts.map(function(q){return {side:'c',f:q.src[0]};}));
      R.ph='up';R.n=fl.length;R.d=0;paint();
      for(var i=0;i<fl.length;i++){R.cur=fl[i].f.name;paint();await sj('/lab/job/'+id+'/file?side='+fl[i].side+'&name='+encodeURIComponent(fl[i].f.name),{method:'PUT',headers:{'Content-Type':'application/zip'},body:fl[i].f});R.d++;paint();}
      await sj('/lab/job/'+id+'/start',{method:'POST'});await h.sess.put('job:acct:srv',id);return id;}
    catch(e){toast('تعذّر الرفع إلى الخادم — يُكمل المسح على الهاتف: '+(e&&e.message||''));return '';}}
  async function srvWait(id,R){var bad=0;while(!R.stop){var st=null;try{st=await sj('/lab/job/'+id);bad=0;}catch(e){if(/غير موجودة/.test(e.message)){toast('مهمة الخادم انتهت صلاحيتها — يُكمل المسح على الهاتف');return false;}if(++bad>20){toast('الخادم لا يستجيب — يُكمل المسح على الهاتف');return false;}}
      if(st){R.ph='srv';R.sph=st.ph;R.d=st.d||0;R.n=st.n||0;R.spre=st.pre||0;paint();
        if(st.state==='done'){var full=await sj('/lab/job/'+id+'?items=1');(full.items||[]).forEach(function(it){CK['~'+it.side+'|'+(it.cn||'')+'|'+it.nm]={fp:it.fp,sz:it.sz,p:it.p||null,srv:1};});CKD=true;ckSave(true);return true;}
        if(st.state==='error'){toast('خطأ على الخادم: '+(st.err||'')+' — يُكمل المسح على الهاتف');return false;}}
      await new Promise(function(r){setTimeout(r,3000);});await untilVisible();}
    return false;}
  /* 1444: كشف حساب المورد — الحكم النهائي: ما بقي بلا مورد يُقارَن بسطور كشف حساب البنك (PDF/CSV/TXT): المبلغ نفسه ± يومان (ورقم العملية إن وُجد في السطر) */
  async function stmtText(file){var nm=file.name||'';if(/pdf$/i.test(nm)||/pdf/i.test(file.type||''))return await window.ArkanRead.pdfText(file);if(/\.(xlsx?|xlsm)$/i.test(nm))throw new Error('ملف Excel غير مدعوم — صدّر الكشف PDF أو CSV');return await file.text();}
  function stmtRows(txt){var T=String(txt||'').replace(/\u00a0/g,' '),re=/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})|(\d{4})-(\d{2})-(\d{2})/g,m,pos=[];while((m=re.exec(T))){var y,mo,d;if(m[4]){y=+m[4];mo=+m[5];d=+m[6];}else{d=+m[1];mo=+m[2];y=+m[3];if(y<100)y+=2000;}if(mo<1||mo>12||d<1||d>31||y<2020||y>2100)continue;pos.push({i:m.index,ts:new Date(y,mo-1,d).getTime()});}
    var rows=[];for(var k=0;k<pos.length;k++){var seg=T.slice(pos[k].i,k+1<pos.length?pos[k+1].i:Math.min(T.length,pos[k].i+400)),am2=seg.match(/-?\d{1,3}(?:[ .]\d{3})+,\d{2}|-?\d+,\d{2}|-?\d{1,3}(?:,\d{3})+\.\d{2}/g)||[];am2.forEach(function(a){var neg=/^-/.test(a),v=/,\d{2}$/.test(a)?numAO(a.replace('-','')):Number(a.replace(/[-,]/g,''));if(v>=100)rows.push({ts:pos[k].ts,amt:Math.round(v),neg:neg,seg:seg.replace(/\s+/g,' ')});});}
    return rows;}
  async function stmtMatch(files){var S=A.res;if(!S||!S.flag.length){toast('لا إيصالات بلا مورد لمقارنتها');return;}var rows=[];
    for(var i=0;i<files.length;i++){try{rows=rows.concat(stmtRows(await stmtText(files[i])));}catch(e){toast((e&&e.message)||'تعذّر قراءة الكشف');}}
    if(!rows.length){toast('لم أجد سطورًا بتاريخ ومبلغ في الكشف');return;}
    var used={},hit=0;S.flag=S.flag.filter(function(it){var v=am(it.p.amount),rt=nrT(it.p.ref),best=-1,bs=0;rows.forEach(function(r,j){if(used[j]||r.amt!==v)return;var dd=Math.abs(r.ts-d0(it.ts||r.ts)),sc=dd<=2*DAY?2:dd<=5*DAY?1:0;if(!sc)return;if(rt&&r.seg.replace(/\D/g,'').indexOf(rt)>=0)sc+=3;if(sc>bs){bs=sc;best=j;}});
      if(best>=0){used[best]=1;it.sent=1;it.how='stmt';hit++;S.sent=(S.sent||0)+1;var q=S.custs.find(function(x){return x.name===it.cn;});if(q){q.flag=Math.max(0,q.flag-1);q.sent++;q.sum=Math.max(0,q.sum-v);}var sq=S.sups.find(function(x){return x.name===it.sup;});if(sq){sq.flag=Math.max(0,sq.flag-1);sq.sent++;sq.sum=Math.max(0,sq.sum-v);}return false;}return true;});
    S.added='كشف حساب المورد ('+rows.length+' سطرًا) — '+hit+' إيصالًا وُجد في الكشف وأُسقط';persist();paint();toast(S.added);}
  /* 1444: التنبيه — ملخص الإيصالات بلا مورد يُرسل إلى تلغرام بعد كل فحص، ويذكّرك الخادم صباحًا ما دامت مفتوحة */
  function openText(S){var tot=S.flag.reduce(function(t,it){return t+am(it.p.amount);},0),old=S.flag.reduce(function(m,it){return it.ts&&it.ts<m?it.ts:m;},Infinity);
    return (S.flag.length?'⚠️ '+S.flag.length+' إيصالًا عند الزبائن لا مورد له — المجموع '+f(tot)+' AOA':'✅ كل إيصالات الزبائن موجودة عند الموردين')+'\n'+(S.per?'الفترة '+S.per+' · ':'')+'الموردون: '+(S.sups||[]).map(function(q){return q.name;}).join('، ')+(old<Infinity?'\nالأقدم منذ '+Math.round((Date.now()-old)/DAY)+' يومًا':'')+
      (S.flag.length?'\n\n'+S.flag.slice(0,15).map(function(it){return '• '+f(it.p.amount||0)+' · '+(nrT(it.p.ref)||'بلا مرجع')+(it.ts?' · '+h.dmy(it.ts).slice(0,10):'')+' · '+(it.cn||'')+' → '+(it.sup||'');}).join('\n')+(S.flag.length>15?'\n… و'+(S.flag.length-15)+' أخرى':''):'');}
  function notify(S,auto){if(!tok()||!S)return;sj('/lab/notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:openText(S),open:S.flag.length,total:S.flag.reduce(function(t,it){return t+am(it.p.amount);},0),auto:!!auto})}).then(function(){if(!auto)toast('أُرسل إلى تلغرام');},function(e){if(!auto)toast('تعذّر الإرسال: '+(e&&e.message||''));});}
  function srvDel(){h.sess.get('job:acct:srv').then(function(id){if(id)sj('/lab/job/'+id,{method:'DELETE'}).catch(function(){});h.sess.del('job:acct:srv');});}
  var PT=0,PTT=0;function tick(){var n=Date.now();if(n-PT>300){PT=n;paint();}else if(!PTT)PTT=setTimeout(function(){PTT=0;PT=Date.now();paint();},320);}
  /* 1414: المسح لا يضيع إن خرجت — الملفان والفترة يُحفظان على الجهاز، وعند العودة يُستأنف تلقائيًا من حيث توقف (المقروء لا يُعاد).
     الشاشة تبقى مضاءة أثناء المسح، وإن أُوقف المتصفح مؤقتًا في الخلفية يُعاد أي إيصال انقطعت قراءته. */
  var HID=0,WL=null;document.addEventListener('visibilitychange',function(){if(document.hidden)HID++;else if(A.run)wake();});
  function wake(){try{if(navigator.wakeLock&&navigator.wakeLock.request)navigator.wakeLock.request('screen').then(function(w){WL=w;},function(){});}catch(e){}}
  function unwake(){try{if(WL){WL.release();WL=null;}}catch(e){}}
  function untilVisible(){return document.hidden?new Promise(function(res){var fn=function(){if(!document.hidden){document.removeEventListener('visibilitychange',fn);res();}};document.addEventListener('visibilitychange',fn);}):Promise.resolve();}
  async function resume(){try{if(A.res||A.run)return;var j=await getSrc('job:acct');if(!j)return;
      var sv=await h.sess.get('job:acct:srv');toast(sv?'الخادم كان يعمل أثناء غيابك — جارٍ سحب النتيجة…':'استئناف المسح من حيث توقف — المقروء سابقًا لا يُعاد');await pick('s',j.s);await pick('c',j.c);if(!A.s||A.s.err||!A.c||A.c.err){delSrc('job:acct');h.sess.del('job:acct:ck');return;}
      A.c.all=!!j.all;if(!j.all){A.c.from=j.from;A.c.to=j.to;}if(j.sa===false){A.s.all=false;A.s.from=j.sf;A.s.to=j.st;}paint();start(true);}catch(e){}}
  async function start(resumed){var P=A.s?selP(A.s):[],C=A.c?selP(A.c):[];if(!P.length||!C.length)return;if(!DB)DB=await idb();
    if(!resumed){CK={};h.sess.del('job:acct:ck');h.sess.del('job:acct:srv');putSrc('job:acct',srcSnap()).then(function(ok){if(!ok)toast('الملف كبير جدًا للحفظ — إن خرجت من الصفحة لن يُستأنف المسح تلقائيًا');});}
    else{CK=(await h.sess.get('job:acct:ck'))||{};}
    wake();
    var R={ph:1,n:P.length,d:0,hit:0,pre:0,ck:0,stop:false,t0:Date.now(),k:{acc:0,drop:0,on:0,ok:0},live:[],per:perTxt(A.c),sper:A.s.all?'':perTxt(A.s)};A.run=R;A.res=null;paint();
    var sid=resumed?(await h.sess.get('job:acct:srv'))||'':await srvStart(R);
    if(sid){var okS=await srvWait(sid,R);if(R.stop){A.run=null;unwake();paint();return;}if(okS){R.srvDone=1;h.sess.del('job:acct:srv');}}
    /* ═══ 1440: المطابقة بالتزامن — زبون مقابل مورد ═══
       أ) بلا ذكاء اصطناعي: تُحسب بصمة وحجم كل إيصال في الطرفين؛ كل إيصال زبون له نظيره عند المورد (الصورة نفسها، أو الحجم نفسه في اليوم نفسه) يُسقط من الطرفين فورًا ولا يُذكر.
       ب) يُقرأ ما بقي عند المورد كله، ومن المطابق ما يلزم فقط حتى تثبت حساباته (يتوقف بعد 60 قراءة بلا حساب جديد).
       ج) يُقرأ ما بقي عند الزبون ويُطابَق فورًا برقم العملية، ثم بالمبلغ في جولة أخيرة. لا يبقى إلا إيصالات الزبون التي لا مورد لها. */
    var seen={},seenIt={};
    async function hashPool(list,side,out){var qi=0;async function wk(){while(qi<list.length&&!R.stop){var x=list[qi++],k=kf(side,x),c=CK[k]||CK['~'+side+'|'+(x.cn||'')+'|'+x.nm];R.cur=x.nm;R.cn=x.cn||'';
        try{var it;if(c&&c.fp){it=fastItem(x,side,c);if(!c.p)it.p=null;R.ck++;}else{var file=await loadFile(x),fp=await h.sha(file);it={side:side,cn:x.cn||'',file:null,src:x,sz:file.size||0,nm:x.nm,ts:x.ts||0,pdf:/pdf$/i.test(file.type||x.nm),p:null,fp:fp};CK[k]={fp:fp,sz:it.sz,p:null};CKD=true;ckSave();}
          it.k=k;if(!seen[side+it.fp]){seen[side+it.fp]=it.cn||'-';seenIt[side+it.fp]=it;out.push(it);}else if(side==='c'){it.dupOf=seen[side+it.fp];it.dupIt=seenIt[side+it.fp];out.push(it);}
        }catch(e){}R.d++;tick();}}
      var w=[];for(var i=0;i<4;i++)w.push(wk());await Promise.all(w);ckSave(true);}
    async function readP(x,side,pre){if(x.p)return;await untilVisible();var h0=HID,it=await readOne(x.src,side,R,pre,x.fp);if(HID!==h0&&!it.p.amount&&!it.p.name&&!it.p.account){await untilVisible();it=await readOne(x.src,side,R,pre,x.fp);}x.p=it.p;x.pre=it.pre;CK[x.k]={fp:x.fp,sz:x.sz,p:x.p,pre:x.pre};CKD=true;ckSave();}
    /* أ */
    R.ph=0;R.n=P.length+C.length;R.d=0;var SH=[],CH=[];await hashPool(P,'s',SH);await hashPool(C,'c',CH);
    if(R.stop){A.run=null;unwake();delSrc('job:acct');h.sess.del('job:acct:ck');srvDel();paint();toast('أُوقف المسح');return;}
    var byFp={},bySz={},FREE={},free=function(sr){return !!FREE[sr.fp];},rmv=function(sr){delete FREE[sr.fp];};
    SH.forEach(function(sr){FREE[sr.fp]=sr;byFp[sr.fp]=sr;if(sr.sz>2048&&sr.ts){var k=sr.sz+':'+d0(sr.ts);(bySz[k]||(bySz[k]=[])).push(sr);}});
    var cs={},st=function(cn){return cs[cn]||(cs[cn]={n:0,flag:0,sent:0,sum:0});},CR=[],dup=[],PAIRS=[],pair=function(it,sr,how){rmv(sr);sr.mt=1;it.sent=1;it.how=how;it.sup=sr.cn;it.on='img';st(it.cn).sent++;R.k.ok++;PAIRS.push({it:it,sr:sr,how:how});};
    /* 1445: المطابقة بالحجم ليست كافية وحدها — تُؤكَّد بصريًا (dHash ≤ 6 بين الصورتين) وإلا لا تُقبل؛ PDF بالحجم نفسه في اليوم نفسه فقط */
    var szCand=[];
    CH.forEach(function(it){if(it.dupOf){it.g='d';dup.push(it);return;}st(it.cn).n++;var sr=byFp[it.fp];if(sr&&free(sr)){pair(it,sr,'fp');return;}
      if(it.sz>2048&&it.ts){var cands=[];for(var dd=0;dd<3;dd++){if(dd&&it.pdf)break;var L=bySz[it.sz+':'+d0(it.ts+[0,-DAY,DAY][dd])]||[];for(var i=0;i<L.length;i++)if(free(L[i])&&L[i].pdf===it.pdf)cands.push(L[i]);}if(cands.length){szCand.push({it:it,c:cands});return;}}CR.push(it);});
    if(szCand.length){R.ph=0;R.n=szCand.length;R.d=0;R.cur='تأكيد بصري للمطابقات بالحجم…';paint();
      for(var zi=0;zi<szCand.length&&!R.stop;zi++){var z=szCand[zi],it=z.it,done=false;
        if(it.pdf){for(var ci=0;ci<z.c.length;ci++)if(free(z.c[ci])){pair(it,z.c[ci],'sz');done=true;break;}}
        else{var hc=await phOf(it);if(hc){for(var cj=0;cj<z.c.length;cj++){var sr=z.c[cj];if(!free(sr))continue;var hs=await phOf(sr);if(hs&&ham(hc,hs)<=6){pair(it,sr,'sz');done=true;break;}}}}
        if(!done){R.k.szNo=(R.k.szNo||0)+1;CR.push(it);}R.d++;tick();}}
    paint();
    /* ب — المورد: ما لم يُطابَق كله، ثم المطابق حتى تثبت الحسابات */
    var SU=SH.filter(function(x){return !x.mt;}),SM=SH.filter(function(x){return x.mt;});R.ph=1;R.n=SU.length+SM.length;R.d=0;R.t0=Date.now();paint();
    var S=[],accSeen={};
    async function readS(list,sat){var qi=0,since=0,done=0;async function wk(){while(qi<list.length&&!R.stop){if(sat&&done>=100&&since>=60){R.d+=list.length-qi;qi=list.length;break;}var x=list[qi++];R.cur=x.nm;R.cn=x.cn||'';
          try{await readP(x,'s');done++;if(!dropWhy(x.p)){S.push(x);var ac=acctOf(x.p),key=ac?ac.slice(-11):'n:'+nameOf(x.p);if(key!=='n:'&&!accSeen[key]){accSeen[key]=1;R.k.acc++;since=0;}else since++;}}catch(e){}R.d++;tick();}}
        var w=[];for(var i=0;i<6;i++)w.push(wk());await Promise.all(w);ckSave(true);}
    await readS(SU,false);await readS(SM,true);R.d=R.n;paint();
    if(R.stop){A.run=null;unwake();delSrc('job:acct');h.sess.del('job:acct:ck');paint();toast('أُوقف المسح قبل اكتمال ملفات الموردين');return;}
    var sname=A.s.name||'',sents=[],reg=regLoad(),nw=0,SP=A.s.parts,multiS=SP.length>1,isSup={};
    SP.forEach(function(pt){isSup[pt.name]=1;cluster(S.filter(function(it){return it.cn===pt.name;})).forEach(function(e){if(!e.blank){e.sup=pt.name;sents.push(e);}});});
    sents.forEach(function(q){if(!q.accts.length)return;if(reg.some(function(r){return q.accts.some(function(x){return (r.accts||[]).some(function(b){return sameAcct(x,b);});});}))return;
      reg.push({accts:q.accts.slice(),names:Object.keys(q.names).slice(0,6),bank:q.bank,sup:q.sup,st:'ok',src:'auto',at:new Date().toISOString()});nw++;});if(nw)regSave(reg);
    var SA=[],SN=[],add=function(as,ns,sup){as.forEach(function(a){SA.push({v:a,sup:sup});});ns.forEach(function(n){SN.push({v:n,sup:sup});});};sents.forEach(function(q){add(q.accts,Object.keys(q.names),q.sup);});
    reg.forEach(function(r){if(r.st!=='sus'&&isSup[r.sup])add(r.accts||[],r.names||[],r.sup);});
    R.k.acc=sents.length;
    function onSup(p){var ac=acctOf(p),nm=nameOf(p),z=ac&&SA.find(function(x){return sameAcct(x.v,ac);});if(z)return {how:'acct',sup:z.sup};z=nm&&SN.find(function(n){return sameName(n.v,nm);});return z?{how:'name',sup:z.sup}:null;}
    /* ج — الزبون: ما لم يُطابَق بالصورة يُقرأ ويُطابَق فورًا */
    var byRef={},byRefT={},byAmt={};SU.forEach(function(sr){if(!sr.p||dropWhy(sr.p)){rmv(sr);return;}var rf=nr(sr.p.ref);if(rf&&!byRef[rf])byRef[rf]=sr;var rt=nrT(sr.p.ref);if(rt&&!byRefT[rt])byRefT[rt]=sr;var v=am(sr.p.amount);if(v){var ka=sr.cn+':'+v;(byAmt[ka]||(byAmt[ka]=[])).push(sr);}});
    R.ph=2;R.n=CR.length;R.d=0;R.t0=Date.now();paint();var cnt={fx:0,fail:0,other:0},on=[],un=[],nC=CH.length;
    async function readC(list){var qi=0;async function wk(){while(qi<list.length&&!R.stop){var it=list[qi++];R.cur=it.nm;R.cn=it.cn||'';
          try{await readP(it,'c');var w=dropWhy(it.p);if(w){cnt[w]++;R.k.drop++;}else{var o=onSup(it.p);
              if(o){it.on=o.how;it.sup=o.sup;on.push(it);R.k.on++;var rf=nr(it.p.ref),sr=rf&&byRef[rf];if(!(sr&&free(sr))){var rt=nrT(it.p.ref);sr=rt&&byRefT[rt];if(sr&&free(sr)&&am(it.p.amount)&&am(sr.p.amount)&&am(it.p.amount)!==am(sr.p.amount))sr=null;}if(sr&&free(sr)){rmv(sr);it.sent=1;it.how='ref';R.k.ok++;PAIRS.push({it:it,sr:sr,how:'ref'});}else R.live.unshift(it);}
              else if(!am(it.p.amount)&&!acctOf(it.p)&&!nameOf(it.p)){it.g='u';un.push(it);}else{cnt.other++;R.k.drop++;}}}catch(e){}R.d++;tick();}}
        var w=[];for(var i=0;i<6;i++)w.push(wk());await Promise.all(w);ckSave(true);paint();}
    await readC(CR);
    /* الجولة الأخيرة — المبلغ نفسه عند المورد نفسه، الأقرب وقتًا (خلال 10 أيام أولًا ثم بلا حد)، واحد لواحد */
    /* 1444: المبلغ وحده — ترتيب الزمن أولًا: إيصال المورد يأتي بعد إيصال الزبون (بسماح ساعتين)، الزبائن بترتيب وصولهم، كلٌّ يأخذ أقرب إيصال مورد بعده
       (تخصيص الفترات الأمثل لواحد-لواحد). المبالغ غير المؤكدة القراءة لا تُطابَق بالمبلغ وحده. ثم جولة بلا شرط الترتيب لما بقي. */
    /* 1445: تخصيص شامل لا جشع — كل أزواج (زبون، مورد) بالمبلغ نفسه عند المورد نفسه — إيصال المورد خلال يومين بعد إيصال الزبون (أو قبله بست ساعات على الأكثر) تُرتَّب بالتكلفة (المسافة الزمنية؛ إيصال مورد قبل إيصال الزبون يُؤخَّر إلى ما بعد كل المرتَّب)
       ويُؤخذ الأقرب أولًا على مستوى الكل، فلا يخطف إيصالُ زبونٍ بلا مورد إيصالَ مورد يخص زبونًا أقرب إليه زمنًا. */
    var onAmt=on.filter(function(it){return !it.sent&&am(it.p.amount)&&!it.p.weak;}),cand=[];
    onAmt.forEach(function(it){var L=byAmt[it.sup+':'+am(it.p.amount)]||[];L.forEach(function(sr){if(!free(sr)||(sr.p&&sr.p.weak))return;var d=(sr.ts||0)-(it.ts||0);if(d>2*DAY||d<-6*3600e3)return;cand.push({it:it,sr:sr,c:d<-2*3600e3?1e13+Math.abs(d):Math.abs(d)});});});
    cand.sort(function(a,b){return a.c-b.c;});
    cand.forEach(function(q){if(q.it.sent||!free(q.sr))return;rmv(q.sr);q.it.sent=1;q.it.how=q.c>=1e13?'amt~':'amt';R.k.ok++;PAIRS.push({it:q.it,sr:q.sr,how:q.it.how});});
    /* 1443: الجولة البصرية — ما بقي بلا مقابل يُقارَن بالبصمة الإدراكية مع ما بقي عند المورد نفسه (صورة أُعيد ضغطها أو حُفظت وأُرسلت من جديد).
       مسافة هامينغ ≤ 6 والمبلغان متفقان (أو أحدهما غير مقروء) = مطابق؛ ≤ 10 مع اتفاق المبلغ = مطابق؛ وإلا يُسجَّل كأقرب مرشح. */
    var leftC=on.filter(function(x){return !x.sent&&!x.pdf;}),leftS={};Object.keys(FREE).forEach(function(k){var sr=FREE[k];if(sr.p&&!sr.pdf)(leftS[sr.cn]||(leftS[sr.cn]=[])).push(sr);});
    if(leftC.length){R.ph=3;R.n=leftC.length;R.d=0;R.cur='';paint();
      for(var li=0;li<leftC.length&&!R.stop;li++){var it=leftC[li],L=leftS[it.sup]||[];if(L.length){var hc=await phOf(it);if(hc){var best=null,bd=99;for(var si=0;si<L.length;si++){var sr=L[si];if(!free(sr))continue;var dts=Math.abs((sr.ts||0)-(it.ts||0));if(dts>45*DAY)continue;var hs=await phOf(sr),dh=ham(hc,hs);if(dh<bd){bd=dh;best=sr;}}
          if(best){var a1=am(it.p.amount),a2=am(best.p.amount),same=!a1||!a2||a1===a2;if((bd<=6&&same)||(bd<=10&&a1&&a1===a2)){rmv(best);it.sent=1;it.how='img~';R.k.ok++;PAIRS.push({it:it,sr:best,how:'img~'});}else if(bd<=14)it.near={sr:best,dh:bd};}}}R.d++;tick();}}
    /* 1443: لكل إيصال بلا مقابل — أقرب مرشح عند المورد (رقم عملية متقارب / مبلغ مساوٍ بتاريخ قريب / صورة متشابهة) يُعرض للمراجعة بدل الحكم الجاف */
    on.forEach(function(it){if(it.sent)return;var p=it.p||{},a1=am(p.amount),rt=nrT(p.ref),best=null,bs=0,why='';Object.keys(FREE).forEach(function(k){var sr=FREE[k];if(sr.cn!==it.sup||!sr.p)return;var q=sr.p,sc=0,w=[];
        if(rt&&nrT(q.ref)&&rt===nrT(q.ref)){sc+=3;w.push('رقم العملية نفسه');}else if(rt&&nrT(q.ref)&&rt.slice(-5)===nrT(q.ref).slice(-5)){sc+=1;w.push('آخر 5 أرقام من رقم العملية');}
        var a2=am(q.amount);if(a1&&a2){if(a1===a2){sc+=2;w.push('المبلغ نفسه');}else if(Math.abs(a1-a2)/Math.max(a1,a2)<0.02){sc+=1;w.push('المبلغ متقارب');}else if(String(a1).slice(-6)===String(a2).slice(-6)&&String(a1).length!==String(a2).length){sc+=1;w.push('المبلغ يختلف برقم واحد');}}
        var dts=Math.abs((sr.ts||0)-(it.ts||0));if(dts<=DAY){sc+=1;w.push('اليوم نفسه');}else if(dts<=3*DAY){sc+=.5;}
        if(it.near&&it.near.sr===sr){sc+=1.5;w.push('صورة متشابهة');}
        if(sc>bs){bs=sc;best=sr;why=w.join(' · ');}});
      if(best&&bs>=2){it.cand={nm:best.nm,amount:am(best.p.amount),ref:best.p.ref||'',ts:best.ts,why:why,sc:bs};}});
    /* مكرر: الصورة نفسها مرتين (إن كانت الأولى مطابقة أو على حسابات المورد) أو رقم العملية نفسه مرتين */
    dup=dup.filter(function(it){var f=it.dupIt;if(!f||!(f.sent||f.on))return false;it.p=f.p||{};it.sup=f.sup;it.why='مكرر — الصورة نفسها أُرسلت مرتين'+(it.dupOf&&it.dupOf!=='-'&&it.dupOf!==it.cn?' (أيضًا عند «'+it.dupOf+'»)':'');return true;});
    var refs={};on.forEach(function(it){var rf=nr(it.p.ref);if(!rf)return;var a=refs[rf];if(!a){refs[rf]=it;return;}it.dup='مكرر — رقم العملية نفسه '+(a.cn&&a.cn!==it.cn?'عند «'+a.cn+'»':'مرتين عند الزبون نفسه');var c2={};for(var kk in it)c2[kk]=it[kk];c2.g='d';c2.why=it.dup;c2.sent=0;dup.push(c2);});
    /* ذاكرة المراجعة — ما أشّرته «سليم» في مسح سابق لا يعود إلى القائمة */
    var ck0=chk(),prev=0;on.forEach(function(it){if(!it.sent&&ck0[it.fp]==='ok'){it.sent=1;prev++;}});
    var flag=on.filter(function(x){return !x.sent;});flag.forEach(function(it){it.g='f';it.why=it.on==='acct'?'على رقم حساب المورد'+(multiS?' '+it.sup:''):'باسم المورد'+(multiS?' '+it.sup:'')+' — رقم الحساب '+(acctOf(it.p)?'مختلف':'غير مقروء');if(it.dup)it.why+=' · '+it.dup;});
    var ord={};A.c.parts.forEach(function(q,i){ord[q.name]=i;});flag.sort(function(x,y){return (ord[x.cn]||0)-(ord[y.cn]||0)||(y.ts||0)-(x.ts||0);});
    on.forEach(function(it){var q=st(it.cn);if(it.sent)q.sent++;else{q.flag++;q.sum+=am(it.p.amount);}});
    var custs=A.c.parts.map(function(q){var z=cs[q.name]||{n:0,flag:0,sent:0,sum:0};return {name:q.name,n:z.n,flag:z.flag,sent:z.sent,sum:z.sum};});
    var oth=CR.filter(function(it){return !it.g&&!it.on&&!it.sent&&it.p&&!dropWhy(it.p)&&(am(it.p.amount)||acctOf(it.p)||nameOf(it.p));});oth.forEach(function(it){it.g='o';});
    var supFree=SU.filter(function(sr){return free(sr);}).map(function(sr){return {fp:sr.fp,sz:sr.sz,ts:sr.ts,cn:sr.cn,nm:sr.nm,p:sr.p};});
    var sentAll=R.k.ok+prev,sups=SP.map(function(pt){var z={name:pt.name,n:SH.filter(function(x){return x.cn===pt.name;}).length,accs:sents.filter(function(e){return e.sup===pt.name;}).length,flag:0,sent:0,sum:0};CH.forEach(function(it){if(it.sup!==pt.name||it.g==='d')return;if(it.sent)z.sent++;else if(it.on){z.flag++;z.sum+=am(it.p.amount);}});return z;});
    R.cur='';R.fin=true;paint();var keepL=flag.concat(un).concat(dup).concat(oth);for(var mi=0;mi<keepL.length;mi++){if(R.stop)break;await mat(keepL[mi]);}
    var howN={};PAIRS.forEach(function(q){howN[q.how]=(howN[q.how]||0)+1;});var pairs=PAIRS.map(function(q){return {cn:q.it.cn,nm:q.it.nm,ts:q.it.ts,sup:q.sr.cn,snm:q.sr.nm,sts:q.sr.ts,how:q.how,amount:am((q.it.p||q.sr.p||{}).amount)||am((q.sr.p||{}).amount),ref:(q.it.p&&q.it.p.ref)||(q.sr.p&&q.sr.p.ref)||'',csrc:q.it.src,ssrc:q.sr.src};});
    A.res={scan:1,flag:flag,un:un,dup:dup,oth:oth,howN:howN,pairs:pairs,szNo:R.k.szNo||0,supFree:supFree,prev:prev,cnt:cnt,sent:sentAll,nC:nC,nS:SH.length,accs:sents.length,sname:sname,cname:A.c.name||'',custs:custs,sups:sups,stopped:R.stop,hit:R.hit,learned:nw,per:R.per};
    persist();A.run=null;unwake();delSrc('job:acct');h.sess.del('job:acct:ck');CK={};paint();notify(A.res,true);window.scrollTo({top:0,behavior:'smooth'});}
  /* 1437: إضافة زبون أو مورد بعد الفحص — تُحفظ ملفات المصدر على الجهاز بعد اكتمال المسح، فيُضاف الملف الجديد إلى الملفات نفسها
     ويُعاد الفحص (المقروء سابقًا لا يُعاد — يُؤخذ من الذاكرة). يعمل أيضًا بعد الخروج والعودة ما دامت الملفات محفوظة. */
  function srcSnap(){return {s:A.s.src,c:A.c.src,from:A.c.from,to:A.c.to,all:!!A.c.all,sf:A.s.from,st:A.s.to,sa:!!A.s.all,at:Date.now()};}
  function keepSrc(){}
  /* 1441: إضافة زبون أو مورد بعد الفحص لا تحتاج الملفات الأصلية: يُفتح الملف الجديد ويُقرأ، ويُطابَق مع ما بقي في النتيجة
     (إيصالات الزبائن بلا مورد، وما قُيِّد على حسابات غير معروفة، وإيصالات الموردين التي لم تُستعمل) — المطابق يُسقط وتبقى النتيجة الجديدة. */
  async function openParts(files){var groups=files.filter(isZip).map(function(z){return [z];}),loose=files.filter(function(x){return !isZip(x);});if(loose.length)groups.push(loose);var parts=[],list=[];
    for(var i=0;i<groups.length;i++){try{var g=await open1(groups[i]);if(!g)continue;g.list.forEach(function(x){x.cn=g.name;});parts.push({name:g.name,n:g.list.length});list=list.concat(g.list);}catch(e){toast((e&&e.message)||'تعذّر فتح الملف');}}
    return {parts:parts,list:list};}
  async function addParty(side,files){files=[].slice.call(files||[]);if(!files.length||A.run)return;side=side==='s'?'s':'c';var S0=A.res;if(!S0||!S0.scan){toast('لا توجد نتيجة فحص لإضافة إليها');return;}
    var o=await openParts(files);if(!o.parts.length)return;var known={};(side==='s'?S0.sups:S0.custs).forEach(function(q){known[q.name]=1;});
    var dupN=o.parts.filter(function(q){return known[q.name];}).map(function(q){return q.name;});if(dupN.length){toast('«'+dupN[0]+'» موجود في الفحص من قبل');o.list=o.list.filter(function(x){return !known[x.cn];});o.parts=o.parts.filter(function(q){return !known[q.name];});if(!o.parts.length)return;}
    if(!DB)DB=await idb();wake();var R={ph:side==='s'?1:2,n:o.list.length,d:0,hit:0,pre:0,ck:0,stop:false,t0:Date.now(),k:{acc:0,drop:0,on:0,ok:0},live:[],per:S0.per||'',sper:'',add:1};A.run=R;A.res=null;paint();
    var seen={},items=[];
    async function rd(list){var qi=0;async function wk(){while(qi<list.length&&!R.stop){var x=list[qi++];R.cur=x.nm;R.cn=x.cn||'';try{await untilVisible();var it=await readOne(x,side,R);it.file=null;if(!seen[it.fp]){seen[it.fp]=1;items.push(it);}}catch(e){}R.d++;tick();}}
      var w=[];for(var i=0;i<6;i++)w.push(wk());await Promise.all(w);paint();}
    await rd(o.list);
    if(R.stop){A.run=null;unwake();A.res=S0;paint();return;}
    var reg=regLoad(),SA=[],SN=[],add=function(as,ns,sup){as.forEach(function(a){SA.push({v:a,sup:sup});});ns.forEach(function(n){SN.push({v:n,sup:sup});});};
    function onSup(p){var ac=acctOf(p),nm=nameOf(p),z=ac&&SA.find(function(x){return sameAcct(x.v,ac);});if(z)return {how:'acct',sup:z.sup};z=nm&&SN.find(function(n){return sameName(n.v,nm);});return z?{how:'name',sup:z.sup}:null;}
    var byFp={},bySz={},byRef={},byRefT={},byAmt={},FREE={},free=function(sr){return !!FREE[sr.fp];},rmv=function(sr){delete FREE[sr.fp];};
    function index(sr){FREE[sr.fp]=sr;byFp[sr.fp]=sr;if(sr.sz>2048&&sr.ts){var k=sr.sz+':'+d0(sr.ts);(bySz[k]||(bySz[k]=[])).push(sr);}if(sr.p){var rf=nr(sr.p.ref);if(rf&&!byRef[rf])byRef[rf]=sr;var rt=nrT(sr.p.ref);if(rt&&!byRefT[rt])byRefT[rt]=sr;var v=am(sr.p.amount);if(v){var ka=sr.cn+':'+v;(byAmt[ka]||(byAmt[ka]=[])).push(sr);}}}
    function findSup(it){var sr=byFp[it.fp];if(sr&&free(sr))return {sr:sr,how:'fp'};if(it.sz>2048&&it.ts){for(var dd=0;dd<3;dd++){var L=bySz[it.sz+':'+d0(it.ts+[0,-DAY,DAY][dd])]||[];for(var i=0;i<L.length;i++)if(free(L[i]))return {sr:L[i],how:'sz'};}}
      var p=it.p||{},rf=nr(p.ref);sr=rf&&byRef[rf];if(sr&&free(sr))return {sr:sr,how:'ref'};var rt=nrT(p.ref);sr=rt&&byRefT[rt];if(sr&&free(sr)&&(!am(p.amount)||!am(sr.p&&sr.p.amount)||am(p.amount)===am(sr.p.amount)))return {sr:sr,how:'ref'};var v=am(p.amount);if(v&&it.sup){var M=byAmt[it.sup+':'+v]||[],best=null,bd=Infinity;M.forEach(function(q){if(!free(q))return;var d=Math.abs((q.ts||0)-(it.ts||0));if(d<bd){bd=d;best=q;}});if(best)return {sr:best,how:'amt'};}return null;}
    var S=Object.assign({},S0);S.flag=S0.flag.slice();S.un=S0.un.slice();S.dup=(S0.dup||[]).slice();S.oth=(S0.oth||[]).slice();S.supFree=(S0.supFree||[]).slice();S.custs=S0.custs.slice();S.sups=S0.sups.slice();S.cnt=Object.assign({},S0.cnt);var moved=0;
    if(side==='s'){
      var Sv=items.filter(function(it){return !dropWhy(it.p);}),sents=[],isSup={};o.parts.forEach(function(pt){isSup[pt.name]=1;cluster(Sv.filter(function(it){return it.cn===pt.name;})).forEach(function(e){if(!e.blank){e.sup=pt.name;sents.push(e);}});});
      var nw=0;sents.forEach(function(q){if(!q.accts.length)return;if(reg.some(function(r){return q.accts.some(function(x){return (r.accts||[]).some(function(b){return sameAcct(x,b);});});}))return;reg.push({accts:q.accts.slice(),names:Object.keys(q.names).slice(0,6),bank:q.bank,sup:q.sup,st:'ok',src:'auto',at:new Date().toISOString()});nw++;});if(nw)regSave(reg);
      sents.forEach(function(q){add(q.accts,Object.keys(q.names),q.sup);});reg.forEach(function(r){if(r.st!=='sus'&&isSup[r.sup])add(r.accts||[],r.names||[],r.sup);});
      Sv.forEach(index);
      /* ما كان بلا مورد، أو على حساب غير معروف، أو غير مقروء: هل له نظير عند المورد الجديد؟ */
      var cand=S.flag.concat(S.oth).concat(S.un),keepF=[],keepO=[],keepU=[];
      cand.forEach(function(it){var m=findSup(it);if(!m&&it.g==='o'){var oo=onSup(it.p||{});if(oo){it.sup=oo.sup;it.on=oo.how;m=findSup(it);if(!m){it.g='f';it.why=oo.how==='acct'?'على رقم حساب المورد '+oo.sup:'باسم المورد '+oo.sup+' — رقم الحساب '+(acctOf(it.p)?'مختلف':'غير مقروء');keepF.push(it);return;}}}
        if(m){rmv(m.sr);m.sr.mt=1;it.sent=1;it.how=m.how;moved++;return;}
        if(it.g==='f')keepF.push(it);else if(it.g==='u')keepU.push(it);else keepO.push(it);});
      S.flag=keepF;S.un=keepU;S.oth=keepO;S.sent=(S.sent||0)+moved;S.nS=(S.nS||0)+items.length;S.accs=(S.accs||0)+sents.length;
      S.supFree=S.supFree.concat(Sv.filter(function(sr){return free(sr);}).map(function(sr){return {fp:sr.fp,sz:sr.sz,ts:sr.ts,cn:sr.cn,nm:sr.nm,p:sr.p};}));
      o.parts.forEach(function(pt){var z={name:pt.name,n:items.filter(function(x){return x.cn===pt.name;}).length,accs:sents.filter(function(e){return e.sup===pt.name;}).length,flag:0,sent:0,sum:0};cand.forEach(function(it){if(it.sent&&it.how&&it.sup===pt.name)z.sent++;});S.flag.forEach(function(it){if(it.sup===pt.name){z.flag++;z.sum+=am(it.p.amount);}});S.sups.push(z);});
      S.sname=S.sups.length>1?S.sups.length+' موردين':S.sups[0].name;
    }else{
      S.supFree.forEach(index);var isSup={};S.sups.forEach(function(q){isSup[q.name]=1;});reg.forEach(function(r){if(r.st!=='sus'&&isSup[r.sup])add(r.accts||[],r.names||[],r.sup);});
      S.supFree.forEach(function(sr){if(!sr.p)return;var ac=acctOf(sr.p),nm=nameOf(sr.p);if(ac)SA.push({v:ac,sup:sr.cn});if(nm)SN.push({v:nm,sup:sr.cn});});
      var cs={};o.parts.forEach(function(pt){cs[pt.name]={name:pt.name,n:0,flag:0,sent:0,sum:0};});
      items.forEach(function(it){var q=cs[it.cn];if(q)q.n++;var w=dropWhy(it.p);if(w){S.cnt[w]=(S.cnt[w]||0)+1;return;}var m=findSup(it);if(m){rmv(m.sr);it.sent=1;it.how=m.how;it.sup=m.sr.cn;moved++;if(q)q.sent++;return;}
        var oo=onSup(it.p);if(oo){it.sup=oo.sup;it.on=oo.how;m=findSup(it);if(m){rmv(m.sr);it.sent=1;it.how=m.how;moved++;if(q)q.sent++;return;}it.g='f';it.why=oo.how==='acct'?'على رقم حساب المورد '+oo.sup:'باسم المورد '+oo.sup+' — رقم الحساب '+(acctOf(it.p)?'مختلف':'غير مقروء');S.flag.push(it);if(q){q.flag++;q.sum+=am(it.p.amount);}}
        else if(!am(it.p.amount)&&!acctOf(it.p)&&!nameOf(it.p)){it.g='u';S.un.push(it);}else{it.g='o';S.oth.push(it);S.cnt.other=(S.cnt.other||0)+1;}});
      S.supFree=S.supFree.filter(function(sr){return free(sr);});S.sent=(S.sent||0)+moved;S.nC=(S.nC||0)+items.length;o.parts.forEach(function(pt){S.custs.push(cs[pt.name]);});S.cname=S.custs.length>1?S.custs.length+' زبائن':S.custs[0].name;
    }
    var ord={};S.custs.forEach(function(q,i){ord[q.name]=i;});S.flag.sort(function(x,y){return (ord[x.cn]||0)-(ord[y.cn]||0)||(y.ts||0)-(x.ts||0);});
    R.cur='';R.fin=true;paint();var keepL=S.flag.concat(S.un).concat(S.dup).concat(S.oth);for(var mi=0;mi<keepL.length;mi++)await mat(keepL[mi]);
    S.restored=0;S.added=(side==='s'?'مورد':'زبون')+' «'+o.parts.map(function(q){return q.name;}).join('، ')+'» — '+(side==='s'?moved+' إيصالًا وجد نظيره عند المورد الجديد وأُسقط':moved+' إيصالًا وجد نظيره عند الموردين وأُسقط');
    A.res=S;persist();A.run=null;unwake();paint();toast(S.added);notify(S,true);window.scrollTo({top:0,behavior:'smooth'});}
  function persist(){var R=A.res;if(!R)return;h.sess.save('acct',{scan:1,per:R.per||'',cnt:R.cnt,sent:R.sent,nC:R.nC,nS:R.nS,accs:R.accs,sname:R.sname,cname:R.cname,custs:R.custs||[],sups:R.sups||[],prev:R.prev||0,stopped:!!R.stopped,supFree:R.supFree||[],howN:R.howN||{},szNo:R.szNo||0,pairs:(R.pairs||[]).map(function(q){return {cn:q.cn,nm:q.nm,ts:q.ts,sup:q.sup,snm:q.snm,sts:q.sts,how:q.how,amount:q.amount,ref:q.ref};})},
      R.flag.concat(R.un).concat(R.dup||[]).concat(R.oth||[]).map(function(it){return {file:it.file,data:{g:it.g,cn:it.cn||'',sup:it.sup||'',nm:it.nm,ts:it.ts,pdf:it.pdf,p:it.p,fp:it.fp,why:it.why||'',cand:it.cand||null}};})).then(function(ok){if(!ok)toast('تعذّر حفظ الجلسة على الجهاز — لا تغادر الصفحة قبل إنهاء المراجعة');});}
  async function restore(){try{var m=await h.sess.load('acct');if(!m||!m.meta||A.res||A.run)return;if(!m.meta.scan){h.sess.clear('acct');return;}
      var all=(m.rows||[]).map(function(r,i){return {g:r.g,cn:r.cn||'',sup:r.sup||'',nm:r.nm,ts:r.ts,pdf:r.pdf,p:r.p||{},fp:r.fp,why:r.why,cand:r.cand||null,file:null,_si:r._f?i:-1};}),mt=m.meta;
      A.res={scan:1,flag:all.filter(function(x){return x.g==='f';}),un:all.filter(function(x){return x.g==='u';}),dup:all.filter(function(x){return x.g==='d';}),oth:all.filter(function(x){return x.g==='o';}),supFree:mt.supFree||[],howN:mt.howN||{},szNo:mt.szNo||0,pairs:mt.pairs||[],prev:mt.prev||0,cnt:mt.cnt||{fx:0,fail:0,other:0},sent:mt.sent||0,nC:mt.nC||0,nS:mt.nS||0,accs:mt.accs||0,sname:mt.sname||'',cname:mt.cname||'',custs:mt.custs||[],sups:mt.sups||[],per:mt.per||'',stopped:mt.stopped,restored:m.at,skipped:m.skipped||0};paint();try{var y0=+sessionStorage.getItem('lab_y_a')||0;if(y0)setTimeout(function(){window.scrollTo(0,y0);},60);}catch(e){}}catch(e){}}
  function LG(R,g){return g==='u'?R.un:g==='d'?(R.dup||[]):R.flag;}
  function chk(){try{return JSON.parse(localStorage.getItem('bdl_scan_chk')||'{}')||{};}catch(e){return {};}}
  async function sview(g,k){var R=A.res,L=R&&LG(R,g);if(!L||!L.length)return;k=Math.max(0,Math.min(L.length-1,k||0));if(!A.sv){try{A.y=window.scrollY;sessionStorage.setItem('lab_y_a',String(A.y));}catch(e){}}A.sv={g:g,k:k};A.last=g+':'+k;var it=L[k],v=$('laRv');
    if(!v){v=document.createElement('div');v.id='laRv';document.body.appendChild(v);}
    if(!it.file&&it._si>=0)it.file=await h.sess.file('acct',it._si,it.nm,it.pdf);if(it._u){URL.revokeObjectURL(it._u);it._u='';}if(it.file)it._u=URL.createObjectURL(it.file);var p=it.p||{},c=chk()[it.fp];
    v.innerHTML='<header><div><b>'+(g==='u'?'إيصال لم يُقرأ':g==='d'?esc(it.why||'مكرر'):'للتأكد — '+esc(it.why||''))+'</b><small>'+(it.cn&&R.custs&&R.custs.length>1?esc(it.cn)+' · ':'')+'إيصال '+(k+1)+' من '+L.length+(it.ts?' · '+h.dmy(it.ts):'')+(c?' · '+(c==='ok'?'سليم ✓':'مشكلة'):'')+'</small></div><button type="button" data-sv="x">✕ إغلاق</button></header>'+
      '<div class="rd"><span><small>المبلغ</small><b>'+(am(p.amount)?f(p.amount):'لم يُقرأ')+'</b></span><span><small>المستفيد</small><b>'+esc(nameOf(p)||'—')+'</b></span><span><small>المرجع</small><b dir="ltr">'+esc(nr(p.ref)||'—')+'</b></span></div>'+
      '<div class="bd">'+(!it._u?'<p style="color:#9FB0CC;padding:30px 16px;text-align:center;font-size:13px">صورة هذا الإيصال لم تُحفظ على الجهاز. أعد المسح لعرضها (القراءة من الذاكرة فورًا).</p>':it.pdf?'<iframe src="'+it._u+'"></iframe>':'<img src="'+it._u+'" alt="">')+'</div>'+
      '<footer>'+(g!=='u'&&it._u?'<button type="button" class="shr" data-sv="sh">أرسل للمورد'+(it.sup?' '+esc(it.sup):'')+' ↗</button>':'')+'<div class="nv"><button type="button" data-sv="p"'+(k?'':' disabled')+'>‹ السابق</button><button type="button" data-sv="n"'+(k<L.length-1?'':' disabled')+'>التالي ›</button></div><div class="dc"><button type="button" class="ok" data-sv="ok">سليم — أُرسل / لا مشكلة</button><button type="button" class="sus" data-sv="bad">مشكلة</button></div></footer>';
    v.classList.add('on');}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-sv],[data-so],[data-sa]');if(!b)return;var R=A.res;
    if(b.dataset.so){var q=b.dataset.so.split(':');sview(q[0],+q[1]);return;}
    if(b.dataset.sa==='new'){if(confirm('إنهاء هذه الجلسة وبدء مسح جديد؟\nالنتيجة الحالية وصورها تُمسح من الجهاز. حسابات المورد المسجَّلة وذاكرة القراءة تبقيان.')){A.c=A.s=A.res=null;A.last=null;h.sess.clear('acct');h.sess.del('job:acct');try{sessionStorage.removeItem('lab_y_a');}catch(x){}paint();}return;}
    if(b.dataset.sa==='mem'){if(confirm('مسح ذاكرة المراجعة؟\nكل ما أشّرته «سليم» أو «مشكلة» في المسوح السابقة سيُنسى ويعود للظهور.')){try{localStorage.removeItem('bdl_scan_chk');}catch(x){}toast('مُسحت ذاكرة المراجعة');paint();}return;}
    if(b.dataset.sa==='copy'&&R){var txt='BDL · إيصالات على حسابات المورد '+R.sname+' لم تُرسل له — الزبون '+R.cname+'\n\n'+(R.flag.map(function(it){return '• '+(it.cn&&R.custs&&R.custs.length>1?it.cn+' — ':'')+(it.sup&&R.sups&&R.sups.length>1?'المورد '+it.sup+' — ':'')+(am(it.p.amount)?f(it.p.amount):'لم يُقرأ')+' — '+(nr(it.p.ref)||'بلا مرجع')+(it.ts?' — '+h.dmy(it.ts):'')+' — '+(nameOf(it.p)||'');}).join('\n')||'لا شيء');
      (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){toast('نُسخت القائمة');},function(){prompt('انسخ:',txt);});return;}
    var k=b.dataset.sv,s=A.sv;if(!k||!s)return;var L=LG(R,s.g);
    if(k==='x'){$('laRv').classList.remove('on');A.sv=null;paint();return;}if(k==='p'){sview(s.g,s.k-1);return;}if(k==='n'){sview(s.g,s.k+1);return;}
    if(k==='sh'){var si=L[s.k],sp=si.p||{},stx='إيصال '+(am(sp.amount)?f(sp.amount):'')+(nr(sp.ref)?' — مرجع '+nr(sp.ref):'')+(si.ts?' — '+h.dmy(si.ts):'')+(si.cn?' — الزبون '+si.cn:'');
      try{if(si.file&&navigator.canShare&&navigator.canShare({files:[si.file]})){navigator.share({files:[si.file],text:stx}).catch(function(){});return;}}catch(x){}
      if(navigator.share){navigator.share({text:stx}).catch(function(){});toast('هذا الجهاز لا يشارك الصورة — احفظها بالضغط المطوّل عليها');return;}
      (navigator.clipboard?navigator.clipboard.writeText(stx):Promise.reject()).then(function(){toast('نُسخت البيانات — احفظ الصورة بالضغط المطوّل وأرسلها');},function(){toast('اضغط مطوّلًا على الصورة لحفظها وإرسالها');});return;}
    if(k!=='ok'&&k!=='bad')return;
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
  function perTxt(o){return o.all?'كل الملف':(o.from===o.to?h.dmy(o.from).slice(0,10):h.dmy(o.from).slice(0,10)+' – '+h.dmy(o.to).slice(0,10));}
  function srcCard(k,title,hint){var o=A[k],x='<section class="sd '+k+'"><header><b>'+title+'</b><small>'+hint+'</small></header>';
    if(!o)x+='<button type="button" class="pk" data-ap="'+k+'"><i>＋</i>'+(k==='c'?'اختر ملفات الزبائن':'اختر ملفات الموردين')+' — حتى 10 ملفات ZIP دفعة واحدة أو واحدًا واحدًا'+'</button>';
    else if(o.busy)x+='<div class="ld"><span class="sp"></span> '+(o.busy===true?'جارٍ فتح الملف…':esc(o.busy))+(o.parts&&o.parts.length?' — فُتح '+o.parts.length:'')+'</div>';
    else if(o.err)x+='<div class="er">'+esc(o.err)+'</div><button type="button" class="pk" data-ap="'+k+'">اختيار ملف آخر</button>';
    else{x+=o.parts.map(function(q,i){return '<div class="nm"><b>'+(i+1)+' · '+esc(q.name)+'</b><span>'+q.n+' إيصالًا في الملف</span><button type="button" data-ax="'+k+':'+i+'">حذف</button></div>';}).join('')+(o.parts.length<10?'<button type="button" class="pk sm" data-ap="'+k+'"><i>＋</i>'+(k==='c'?'إضافة زبون آخر':'إضافة مورد آخر')+' ('+o.parts.length+' / 10)</button>':'');
      var isC=k==='c',n=selP(o).length,q=function(id,lab,on){return '<button type="button" data-aq="'+k+':'+id+'"'+(on?' class="on"':'')+'>'+lab+'</button>';},sp=function(dn){return !o.all&&o.to===o.max&&o.from===Math.max(o.min,o.max-(dn-1)*DAY);};
      x+='<div class="pt">'+(isC?'تاريخ المطابقة الذي تريده':'تاريخ إيصالات الموردين')+'</div><div class="qk">'+q('1','آخر يوم',sp(1))+q('2','يومان',sp(2))+q('7','7 أيام',sp(7))+q('30','30 يومًا',sp(30))+q('365','سنة',sp(365))+q('all',isC?'الكل':'الملف كاملًا',o.all)+'</div>'+
        '<div class="rg"><label><small>من</small><input type="date" data-ad="'+k+':from" value="'+h.iso(o.all?o.min:o.from)+'" min="'+h.iso(o.min)+'" max="'+h.iso(o.max)+'"></label><label><small>إلى</small><input type="date" data-ad="'+k+':to" value="'+h.iso(o.all?o.max:o.to)+'" min="'+h.iso(o.min)+'" max="'+h.iso(o.max)+'"></label></div>'+
        '<div class="ct"><b>'+n+'</b> إيصالًا في <b dir="ltr">'+perTxt(o)+'</b>'+(o.parts.length>1?' من '+o.parts.length+' '+(isC?'زبائن':'موردين'):'')+(!isC&&!o.all?' — الحسابات المسجَّلة سابقًا لهذا المورد تبقى محسوبة':'')+'</div>';}
    return x+'</section>';}
  function entCard(e,i){var col={red:'r',amb:'a',grn:'g',gry:'y'}[e.st],lab={red:e.flag?'مشبوه':'غير معروف',amb:'تحقق',grn:e.auto?'معروف':'مؤكد',gry:'غير مقروء'}[e.st],op=A.open===i;
    var x='<div class="en '+col+'"><div class="eh"><div><b>'+esc(e.name||'مستفيد غير مقروء')+'</b><small dir="ltr">'+esc([e.bank,e.accts[0]?('…'+e.accts[0].slice(-8)):'بلا رقم حساب'].filter(Boolean).join(' · '))+(e.accts.length>1?' +'+(e.accts.length-1):'')+'</small></div><span class="ch">'+lab+'</span></div>'+
      '<div class="em"><span><small>إيصالات</small><b>'+e.its.length+'</b></span><span><small>المجموع</small><b>'+f(e.sum)+'</b></span><span><small>الفترة</small><b>'+(e.min?h.dmy(e.min).slice(0,10)+(d0(e.max)!==d0(e.min)?' – '+h.dmy(e.max).slice(0,10):''):'—')+'</b></span></div>'+
      '<p>'+esc(e.why)+'</p><div class="ea"><button type="button" class="p" data-ar="'+i+'">مراجعة الإيصالات ('+e.its.length+')</button><button type="button" data-ao="'+i+'">'+(op?'إخفاء':'قرار')+'</button></div>';
    if(op)x+='<div class="ed"><input id="laSupIn" list="laSups" placeholder="اسم المورد صاحب الحساب" value="'+esc(e.sup||A.res.sname||'')+'"><div><button type="button" class="ok" data-adz="'+i+':ok">سليم — حساب هذا المورد</button><button type="button" class="sus" data-adz="'+i+':sus">مشبوه</button>'+((e.st==='grn'&&!e.auto)||e.flag?'<button type="button" data-adz="'+i+':clr">إزالة من السجل</button>':'')+'</div></div>';
    return x+'</div>';}
  function srow(it,i,g){var p=it.p||{},c=chk()[it.fp];return '<div class="rw '+(g==='u'?'a':'r')+(A.last===g+':'+i?' cur':'')+'" id="sr-'+g+i+'"><div class="mn"><b>'+(am(p.amount)?f(p.amount):'لم يُقرأ المبلغ')+'</b><span>'+esc([nr(p.ref)||'بلا مرجع',it.ts?h.dmy(it.ts):'',nameOf(p)].filter(Boolean).join(' · '))+'</span>'+(it.why?'<span style="color:var(--red);direction:rtl;text-align:start">'+esc(it.why)+(it.ts&&g==='f'?' · منذ '+Math.max(0,Math.round((Date.now()-it.ts)/DAY))+' يومًا':'')+'</span>':'')+(p.weak?'<span style="color:#8A6100;direction:rtl;text-align:start">المبلغ غير مؤكد القراءة — افتح الصورة وتحقق</span>':'')+(it.cand?'<span style="color:#8A6100;direction:rtl;text-align:start">⚠ أقرب مرشح عند المورد: '+f(it.cand.amount||0)+(it.cand.ref?' · '+esc(String(it.cand.ref).slice(-10)):'')+(it.cand.ts?' · '+h.dmy(it.cand.ts).slice(0,10):'')+' — '+esc(it.cand.why)+'</span>':'')+'</div>'+(c?'<em class="chk '+c+'">'+(c==='ok'?'سليم ✓':'مشكلة')+'</em>':'')+'<button type="button" data-so="'+g+':'+i+'">فتح</button></div>';}
  function paint(){var m=$('laMain');if(!m)return;var R=A.run,x='';
    if(R){var p=Math.round(R.d/Math.max(1,R.n)*100),el=(Date.now()-R.t0)/1000,eta=R.d>8?Math.round(el/R.d*(R.n-R.d)):0;
      if(R.ph==='up'||R.ph==='srv'){var sp=R.ph==='up'?Math.round(R.d/Math.max(1,R.n)*100):R.sph==='read'?Math.round(R.d/Math.max(1,R.n)*100):R.sph==='hash'?Math.round(R.d/Math.max(1,R.n)*100):0,
          lab=R.ph==='up'?'رفع الملفات إلى الخادم':R.sph==='unzip'?'تفكيك الملفات على الخادم':R.sph==='hash'?'مطابقة الصور زبون ↔ مورد على الخادم':R.sph==='read'?'قراءة الإيصالات على الخادم':'في انتظار الخادم…';
        x='<section class="pg"><div class="st"><span class="'+(R.ph==='up'?'on':'dn')+'">١ الرفع</span><span class="'+(R.ph==='srv'?'on':'')+'">٢ الخادم</span><span>٣ المطابقة</span></div><div class="br"><i style="width:'+sp+'%"></i></div>'+
          '<div class="tx"><b>'+sp+'%</b><span>'+lab+' — <b dir="ltr" style="font-size:14px">'+R.d+' / '+R.n+'</b></span></div><div class="fn">'+esc(R.cur||'')+'</div>'+(R.spre?'<div class="nt" style="margin:-6px 0 8px">'+R.spre+' إيصالًا تطابق بالصورة — لن يُقرأ</div>':'')+
          '<div class="nt" style="background:#E9F8EF;color:#0B7A3B;font-weight:700">يعمل على الخادم — يمكنك إغلاق الصفحة والعودة متى شئت؛ النتيجة تنتظرك.</div><button type="button" class="bt ln" data-aa="stop">إيقاف</button></section>';
        var pgS=m.querySelector('.pg[data-live="srv"]');if(pgS){var tS=document.createElement('div');tS.innerHTML=x;var nS=tS.firstChild;pgS.querySelector('.br i').style.width=sp+'%';['.st','.tx','.fn'].forEach(function(q){var o=pgS.querySelector(q),n=nS.querySelector(q);if(o&&n&&o.innerHTML!==n.innerHTML)o.innerHTML=n.innerHTML;});var oN=pgS.querySelectorAll('.nt')[0],nN=nS.querySelectorAll('.nt')[0];if(oN&&nN&&oN.innerHTML!==nN.innerHTML)oN.innerHTML=nN.innerHTML;return;}
        m.innerHTML=x;m.querySelector('.pg').setAttribute('data-live','srv');return;}
      var live=R.live.slice(0,30),eta_t=eta?(eta>90?'≈ '+Math.round(eta/60)+' دقيقة':'≈ '+eta+' ثانية'):'';
      x='<section class="pg"><div class="st"><span class="'+(R.ph===0?'on':'dn')+'">١ مطابقة الصور</span><span class="'+(R.ph===1?'on':R.ph>1?'dn':'')+'">٢ قراءة الموردين</span><span class="'+(R.ph>=2?'on':'')+'">٣ فحص الزبائن'+(R.ph===3?' · مقارنة بصرية':'')+'</span></div><div class="br"><i style="width:'+p+'%"></i></div>'+
        '<div class="pr2">فترة الزبائن: <b dir="ltr">'+esc(R.per)+'</b>'+(R.sper?' · فترة الموردين: <b dir="ltr">'+esc(R.sper)+'</b>':' · الموردون: الملف كاملًا')+'</div>'+
        '<div class="tx"><b>'+p+'%</b><span>'+(R.add?(R.ph===1?'قراءة المورد المُضاف':'قراءة الزبون المُضاف'):R.ph===0?'مطابقة الصور زبون ↔ مورد':R.ph===1?'قراءة إيصالات المورد':R.ph===3?'مقارنة بصرية لما بقي بلا مقابل':'فحص إيصالات الزبون')+(R.cn?' «'+esc(R.cn)+'»':'')+' — <b dir="ltr" style="font-size:14px">'+R.d+' / '+R.n+'</b>'+(eta_t?'<br><small>الوقت المتبقي '+eta_t+'</small>':'')+'</span></div><div class="fn">'+esc(R.fin?'تجهيز النتيجة…':R.cur||'')+'</div>'+(R.ck||R.pre||R.hit||R.pdf||R.srvDone?'<div class="nt" style="margin:-6px 0 8px">'+(R.ck?R.ck+' استُؤنف من نقطة الحفظ · ':'')+(R.hit?R.hit+' من الذاكرة · ':'')+(R.srvDone?'قُرئت على الخادم · ':'')+(R.pre?R.pre+' عُرفت من ملف المورد بلا قراءة · ':'')+(R.pdf?R.pdf+' PDF قُرئت محليًا':'')+'</div>':'')+
        (R.ph<2?'<div class="kp"><div class="g"><b>'+R.k.ok+'</b><small>مطابق — أُسقط ✓</small></div><div class="g"><b>'+R.k.acc+'</b><small>حسابات الموردين</small></div><div class="y"><b>'+R.k.drop+'</b><small>مُستبعد</small></div></div>'
        :'<div class="kp k4"><div class="y"><b>'+R.k.drop+'</b><small>مُستبعد</small></div><div class="a"><b>'+R.k.on+'</b><small>على حسابات الموردين</small></div><div class="g"><b>'+R.k.ok+'</b><small>موجود عند المورد ✓</small></div><div class="r"><b>'+R.live.length+'</b><small>بلا مقابل حتى الآن</small></div></div>')+
        '<div class="lv">'+(R.ph===2&&R.live.length?'<h3 class="r" style="font-size:14px;margin:6px 0">بلا مقابل حتى الآن ('+R.live.length+') — تُراجع بالمبلغ في الجولة الأخيرة</h3>'+live.map(function(it){var q=it.p||{};return '<div class="rw r"><div class="mn"><b>'+(am(q.amount)?f(q.amount):'لم يُقرأ المبلغ')+'</b><span>'+esc([nr(q.ref)||'بلا مرجع',it.ts?h.dmy(it.ts).slice(0,10):'',it.cn||''].filter(Boolean).join(' · '))+'</span></div></div>';}).join('')+(R.live.length>30?'<div class="nt">و'+(R.live.length-30)+' أخرى…</div>':''):'')+'</div>'+
        '<div class="nt">يمكنك ترك الصفحة — يُستأنف المسح تلقائيًا عند عودتك من حيث توقف.</div><button type="button" class="bt ln" data-aa="stop">إيقاف</button></section>';
      var pg=m.querySelector('.pg[data-live="loc"]');if(pg){var t=document.createElement('div');t.innerHTML=x;var np=t.firstChild; /* تحديث الأرقام فقط — الشاشة ثابتة لا تُعاد بناؤها */
        pg.querySelector('.br i').style.width=p+'%';['.st','.tx','.fn','.kp','.pr2','.lv'].forEach(function(q){var o=pg.querySelector(q),n=np.querySelector(q);if(o&&n&&o.innerHTML!==n.innerHTML)o.innerHTML=n.innerHTML;});return;}
      m.innerHTML=x;m.querySelector('.pg').setAttribute('data-live','loc');return;}
    if(A.res&&A.res.scan){var S=A.res,fs=S.flag.reduce(function(t,it){return t+am(it.p.amount);},0),dr=S.cnt.fx+S.cnt.fail+S.cnt.other,multi=S.custs&&S.custs.length>1,mS=S.sups&&S.sups.length>1;
      x='<section class="rs">'+(S.added?'<div class="rst" style="background:#E9F8EF;color:#0B7A3B">أُضيف '+esc(S.added)+'</div>':'')+(S.restored?'<div class="rst">مسح محفوظ من '+new Date(S.restored).toLocaleString('en-GB',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' — يبقى حتى تنهيه أنت</div>':'')+
        '<div class="vd '+(S.flag.length?'no':'ok')+'"><b>'+(S.flag.length?S.flag.length+(mS?' إيصالًا على حسابات الموردين لم تُرسل لهم':' إيصالًا على حسابات المورد لم تُرسل له'):(mS?'✓ كل ما دُفع على حسابات الموردين موجود عندهم':'✓ كل ما دُفع على حسابات المورد موجود عنده'))+'</b><span>'+(S.per?'الفترة: <b dir="ltr">'+esc(S.per)+'</b> — ':'')+(mS?'':'المورد ')+esc(S.sname)+' · '+S.accs+' حسابًا من '+S.nS+' إيصالًا — '+(multi?'':'الزبون ')+esc(S.cname)+' · '+S.nC+' إيصالًا'+(S.stopped?' — أُوقف قبل اكتماله':'')+'</span></div>'+
        '<div class="kp"><div class="r"><b>'+S.flag.length+'</b><small>للتأكد</small><i>'+f(fs)+'</i></div><div class="g"><b>'+S.sent+'</b><small>موجود عند المورد ✓</small></div><div class="y"><b>'+dr+'</b><small>مُستبعد تلقائيًا</small></div></div>'+
        '<div class="nt">المستبعد: '+S.cnt.other+' على حسابات لا تخص المورد · '+S.cnt.fx+' USDT/أوقية · '+S.cnt.fail+' غير ناجحة. لم يُحتفظ بها.</div>'+
        (S.howN?'<details class="mt hw"><summary style="color:#0B7A3B">كيف تمت المطابقة ('+S.sent+') — افتح للتحقق</summary><div style="padding:8px;font-size:13px;line-height:1.9">'+
          [['fp','الصورة نفسها بالبايت (بصمة SHA-256)'],['sz','الحجم نفسه في اليوم نفسه + تأكيد بصري'],['ref','رقم العملية'],['amt','المبلغ عند المورد نفسه — بعد إيصال الزبون'],['amt~','المبلغ عند المورد نفسه — بلا شرط الترتيب'],['img~','صورة متشابهة بصريًا (dHash)'],['stmt','كشف حساب المورد']].map(function(k){return S.howN[k[0]]?'<div><b style="font-family:IBM Plex Mono,monospace">'+S.howN[k[0]]+'</b> · '+k[1]+'</div>':'';}).join('')+
          (S.szNo?'<div style="color:#8A6100">'+S.szNo+' تشابه حجم رُفض بعد التأكيد البصري وأُرسل للقراءة</div>':'')+
          ((S.pairs||[]).length?'<div style="margin-top:8px;font-weight:700">عيّنة للتحقق (كل عاشر زوج):</div>'+S.pairs.filter(function(q,i){return i%Math.max(1,Math.round(S.pairs.length/20))===0;}).slice(0,20).map(function(q,i){return '<div class="rw" style="margin:4px 0"><div class="mn"><b>'+(q.amount?f(q.amount):'—')+'</b><span>'+esc((q.cn||'')+' '+(q.ts?h.dmy(q.ts).slice(0,16):'')+' → '+(q.sup||'')+' '+(q.sts?h.dmy(q.sts).slice(0,16):'')+' · '+({fp:'بايت',sz:'حجم+بصري',ref:'مرجع',amt:'مبلغ',"amt~":'مبلغ~',"img~":'بصري',stmt:'كشف'}[q.how]||q.how)+(q.ref?' · '+String(q.ref).slice(-10):''))+'</span></div>'+(q.csrc||q.ssrc?'<button type="button" data-pr="'+S.pairs.indexOf(q)+'">فتح الاثنين</button>':'')+'</div>';}).join(''):'')+'</div></details>':'')+
        (mS?'<div class="cus"><div class="hd"><span>المورد</span><span>إيصالاته</span><span>حسابات</span><span>للتأكد</span></div>'+S.sups.map(function(q){return '<div class="'+(q.flag?'bad':'')+'"><span>'+esc(q.name)+'</span><span>'+q.n+'</span><span>'+q.accs+'</span><span><b>'+q.flag+'</b>'+(q.flag?'<i>'+f(q.sum)+'</i>':'')+'</span></div>';}).join('')+'</div>':'')+
        (multi?'<div class="cus"><div class="hd"><span>الزبون</span><span>إيصالات</span><span>عند المورد ✓</span><span>للتأكد</span></div>'+S.custs.map(function(q){return '<div class="'+(q.flag?'bad':'')+'"><span>'+esc(q.name)+'</span><span>'+q.n+'</span><span>'+q.sent+'</span><span><b>'+q.flag+'</b>'+(q.flag?'<i>'+f(q.sum)+'</i>':'')+'</span></div>';}).join('')+'</div>':'')+
        (S.flag.length?'<h3 class="r">للتأكد — دُفعت على حسابات المورد ولا مقابل لها عنده ('+S.flag.length+')</h3>'+S.flag.map(function(it,i){var hd='';if(multi&&(!i||S.flag[i-1].cn!==it.cn)){var cq=S.custs.find(function(q){return q.name===it.cn;})||{};hd='<h4 class="cu">'+esc(it.cn||'—')+'<span>'+(cq.flag||0)+' إيصالًا · '+f(cq.sum||0)+'</span></h4>';}return hd+srow(it,i,'f');}).join(''):'')+
        (S.dup&&S.dup.length?'<details class="mt dp"><summary style="color:#C8102E">إيصالات مكررة على حسابات الموردين ('+S.dup.length+') — افتحها للتحقق</summary><div style="padding:8px">'+S.dup.map(function(it,i){return srow(it,i,'d');}).join('')+'</div></details>':'')+
        (S.prev?'<div class="nt">'+S.prev+' إيصالًا أشّرتها «سليم» في مسح سابق — لم تُعرض من جديد. <button type="button" data-sa="mem" style="border:0;background:none;color:#0B3A8F;text-decoration:underline;font:inherit;padding:0">مسح ذاكرة المراجعة</button></div>':'')+
        (S.un.length?'<details class="mt"><summary style="color:#8A6100">إيصالات لم تُقرأ ('+S.un.length+') — افتحها إن أردت</summary><div style="padding:8px">'+S.un.map(function(it,i){return srow(it,i,'u');}).join('')+'</div></details>':'')+
        '<div class="bs"><button type="button" class="bt ln" data-aa="add:c">＋ إضافة زبون</button><button type="button" class="bt ln" data-aa="add:s">＋ إضافة مورد</button></div><div class="nt" style="margin-top:-4px">يُضاف الملف الجديد إلى الملفات الحالية وتُعاد المطابقة — الإيصالات المقروءة لا تُقرأ من جديد.</div>'+
        (S.flag.length?'<button type="button" class="bt ln" data-aa="stmt" style="border-color:#0B7A3B;color:#0B7A3B">كشف حساب المورد — الحكم النهائي (PDF/CSV)</button><div class="nt" style="margin-top:-4px">ما وُجد في كشف البنك بالمبلغ والتاريخ (ورقم العملية إن ظهر) يُسقط من القائمة.</div>':'')+
        '<div class="bs"><button type="button" class="bt" data-sa="copy">نسخ القائمة</button><button type="button" class="bt ln" data-aa="tg">إرسال إلى تلغرام</button></div>'+
        '<div class="bs"><a class="bt ln" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="https://wa.me/?text='+encodeURIComponent(openText(S))+'" target="_blank" rel="noopener">مشاركة واتساب</a><button type="button" class="bt ln" data-sa="new">إنهاء الجلسة ومسح جديد</button></div></section>';
      var keepY=A.y!=null?A.y:window.scrollY,opn=[].map.call(m.querySelectorAll('details.mt'),function(d){return d.open?(d.classList.contains('dp')?'dp':'un'):'';});m.innerHTML=x;[].forEach.call(m.querySelectorAll('details.mt'),function(d){if(opn.indexOf(d.classList.contains('dp')?'dp':'un')>=0)d.open=true;});
      if(!A.sv){window.scrollTo(0,keepY);var cr=A.last&&$('sr-'+A.last.replace(':',''));if(cr&&A.y!=null){var bx=cr.getBoundingClientRect();if(bx.top<80||bx.bottom>window.innerHeight-90)cr.scrollIntoView&&cr.scrollIntoView({block:'center'});}A.y=null;}return;}
    var c=A.c,s=A.s,rdy=function(o){return o&&!o.busy&&!o.err&&sel(o).length;},ok=rdy(c)&&rdy(s),n=0;
    x=srcCard('s','الخطوة ١ — ملفات الموردين (حتى 10)','يُفكّ كل مورد وحده وتُسجَّل أسماء وأرقام حساباته باسمه')+srcCard('c','الخطوة ٢ — ملفات الزبائن (حتى 10)','يُفتح كل زبون وحده ويُبحث عنده عن إيصالات على حسابات المورد في التاريخ الذي تختاره')+
      '<button type="button" class="bt go" data-aa="go"'+(ok?'':' disabled')+'>'+(ok?'ابدأ المسح — '+selP(s).length+' إيصالًا من '+s.parts.length+' مورد + '+selP(c).length+' من '+c.parts.length+' زبون':'اختر ملفات الموردين وملفات الزبائن')+'</button>'+
      '<div class="how"><b>كيف يعمل</b>١ يُقرأ ملف المورد كاملًا وتُسجَّل أسماء وأرقام حساباته. ٢ يُفحص ملف الزبون: كل إيصال مدفوع على حساب أو اسم للمورد ولا يوجد مقابله في إيصالات المورد يُسجَّل وحده <u>للتأكد</u>. يُستبعد تلقائيًا: USDT والأوقية، الإيصالات غير الناجحة، وكل ما ليس على حسابات المورد.</div>';
    m.innerHTML=x;}
  document.addEventListener('click',function(e){var t=e.target,b;if(!t.closest)return;
    if((b=t.closest('[data-ap]'))){A._side=b.dataset.ap;var i=$('laFile');i.value='';i.click();return;}
    if((b=t.closest('[data-ax]'))){var ax=b.dataset.ax.split(':'),cc=A[ax[0]],pi=+ax[1];if(!cc||!cc.parts||!cc.parts[pi])return;var pn=cc.parts[pi].name;cc.list=cc.list.filter(function(x){return x.cn!==pn;});cc.parts.splice(pi,1);if(cc.parts.length)recalc(cc);else A[ax[0]]=null;paint();return;}
    if((b=t.closest('[data-aq]'))){var q=b.dataset.aq.split(':'),o=A[q[0]];if(!o)return;o.all=q[1]==='all';if(!o.all){o.to=o.max;o.from=Math.max(o.min,o.max-(+q[1]-1)*DAY);}paint();return;}
    if((b=t.closest('[data-af]'))){A.flt=b.dataset.af;A.open=null;paint();return;}
    if((b=t.closest('[data-pr]'))){(async function(){var q=A.res&&A.res.pairs&&A.res.pairs[+b.dataset.pr];if(!q)return;var v=$('laRv');if(!v){v=document.createElement('div');v.id='laRv';document.body.appendChild(v);}
        async function u(src){if(!src)return '';try{var fl=await loadFile(src);return URL.createObjectURL(fl);}catch(e){return '';}}var uc=await u(q.csrc),us=await u(q.ssrc);
        v.innerHTML='<header><div><b>زوج مطابق — '+esc(({fp:'الصورة نفسها',sz:'الحجم + تأكيد بصري',ref:'رقم العملية',amt:'المبلغ',"amt~":'المبلغ بلا ترتيب',"img~":'تشابه بصري'}[q.how]||q.how))+'</b><small>'+esc((q.cn||'')+' → '+(q.sup||''))+(q.amount?' · '+f(q.amount):'')+'</small></div><button type="button" data-sv="x">✕ إغلاق</button></header><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px;overflow:auto;flex:1"><div><div style="font-size:12px;font-weight:700;text-align:center">الزبون '+(q.ts?h.dmy(q.ts):'')+'</div>'+(uc?(/pdf$/i.test(q.nm)?'<iframe src="'+uc+'" style="width:100%;height:60vh;border:0"></iframe>':'<img src="'+uc+'" style="width:100%">'):'<div class="nt">الصورة غير متاحة بعد إعادة الفتح</div>')+'</div><div><div style="font-size:12px;font-weight:700;text-align:center">المورد '+(q.sts?h.dmy(q.sts):'')+'</div>'+(us?(/pdf$/i.test(q.snm)?'<iframe src="'+us+'" style="width:100%;height:60vh;border:0"></iframe>':'<img src="'+us+'" style="width:100%">'):'<div class="nt">الصورة غير متاحة بعد إعادة الفتح</div>')+'</div></div>';
        v.classList.add('on');A.sv={g:'pr',k:0};try{history.pushState({lab:1},'');}catch(e){}})();return;}
    if((b=t.closest('[data-ar]'))){review(+b.dataset.ar,0);return;}
    if((b=t.closest('[data-ao]'))){A.open=A.open===+b.dataset.ao?null:+b.dataset.ao;paint();return;}
    if((b=t.closest('[data-adz]'))){var z=b.dataset.adz.split(':'),sup=($('laSupIn')&&$('laSupIn').value.trim())||'';if(z[1]==='ok'&&!sup){toast('اكتب اسم المورد صاحب الحساب أولًا');return;}decide(+z[0],z[1]==='clr'?null:z[1],sup);return;}
    if((b=t.closest('[data-rv]'))){var k=b.dataset.rv,rv=A.rv;if(!rv)return;
      if(k==='x'){$('laRv').classList.remove('on');A.rv=null;return;}if(k==='p'){review(rv.i,rv.k-1);return;}if(k==='n'){review(rv.i,rv.k+1);return;}
      var sp=($('laRvSup')&&$('laRvSup').value.trim())||'';if(k==='ok'&&!sp){toast('اكتب اسم المورد صاحب الحساب أولًا');return;}$('laRv').classList.remove('on');A.rv=null;decide(rv.i,k,sp);return;}
    if((b=t.closest('[data-aa]'))){var a=b.dataset.aa;
      if(a==='add:c'||a==='add:s'||a==='stmt'){A._side=a;var fa=$('laFile');fa.value='';fa.click();}
      else if(a==='tg'){notify(A.res,false);}
      else if(a==='go')start();else if(a==='stop'){if(A.run)A.run.stop=true;b.disabled=true;b.textContent='جارٍ الإيقاف…';if(A.run&&(A.run.ph==='up'||A.run.ph==='srv')){A.run=null;unwake();delSrc('job:acct');h.sess.del('job:acct:ck');srvDel();paint();}}
      else if(a==='new'){if(confirm('إنهاء هذه الجلسة وبدء فحص جديد؟\nنتيجة الفحص الحالي وصوره تُمسح من الجهاز. سجل الحسابات وذاكرة القراءة يبقيان.')){A.c=A.s=A.res=null;h.sess.clear('acct');delSrc('src:acct');delSrc('job:acct');h.sess.del('job:acct:ck');srvDel();paint();}}
      else if(a==='copy'){var bad=A.res.ents.filter(function(e){return e.st==='red'||e.st==='amb';}),txt='BDL · حسابات تحتاج تحقق — '+A.res.cname+'\n\n'+(bad.map(function(e){return '• '+(e.name||'غير مقروء')+' · '+(e.bank||'')+' · '+(e.accts[0]||'بلا رقم')+'\n  '+e.its.length+' إيصالًا · '+f(e.sum)+' · '+({red:'غير معروف',amb:'تحقق'}[e.st]);}).join('\n')||'لا شيء');
        (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){toast('نُسخت القائمة');},function(){prompt('انسخ:',txt);});}
      else if(a==='exp'){var bl=new Blob([JSON.stringify(regLoad(),null,1)],{type:'application/json'}),l=document.createElement('a');l.href=URL.createObjectURL(bl);l.download='BDL-سجل-الحسابات-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(l);l.click();l.remove();}
      else if(a==='imp'){A._side='reg';var fi=$('laFile');fi.value='';fi.click();}}});
  document.addEventListener('change',function(e){var t=e.target;
    if(t.id==='laFile'){if(A._side==='reg'){var fl=t.files&&t.files[0];if(!fl)return;var fr=new FileReader();fr.onload=function(){try{var inc=JSON.parse(fr.result);if(!Array.isArray(inc))throw 0;var reg=regLoad(),n=0;inc.forEach(function(q){if(!q||!(q.accts||q.names))return;if(!reg.some(function(r){return (q.accts||[]).some(function(a){return (r.accts||[]).some(function(b){return sameAcct(a,b);});});})){reg.push(q);n++;}});regSave(reg);toast('استُورد '+n+' حسابًا');if(A.res)classify();paint();}catch(x){toast('ملف السجل غير صالح');}};fr.readAsText(fl);return;}
      if(A._side==='stmt'){A._side=null;stmtMatch([].slice.call(t.files||[]));return;}
      if(A._side==='add:c'||A._side==='add:s'){var sd=A._side.slice(4);A._side=null;addParty(sd,t.files);return;}
      pick(A._side||'c',t.files);return;}
    if(t.dataset&&t.dataset.ad){var d=t.dataset.ad.split(':'),o=A[d[0]];if(!o||!t.value)return;var p=t.value.split('-');o[d[1]]=new Date(+p[0],+p[1]-1,+p[2]).getTime();if(o.from>o.to){if(d[1]==='from')o.to=o.from;else o.from=o.to;}o.all=false;paint();}});
  window.addEventListener('popstate',function(){if(A.sv){A.sv=null;setTimeout(paint,0);}});
  window.__LABA={A:A,addParty:addParty,dhash:dhash,ham:ham,cluster:cluster,classify:classify,sameAcct:sameAcct,sameName:sameName,acctOf:acctOf,nameOf:nameOf,regLoad:regLoad,paint:paint};
  /* تبديل الوضعين */
  function mode(k){$('lbMain').style.display=k==='m'?'':'none';$('laMain').style.display=k==='a'?'':'none';var ld=$('ldMain');if(ld)ld.style.display=k==='d'?'':'none';[].forEach.call(document.querySelectorAll('#lbMode button'),function(b){b.classList.toggle('on',b.dataset.md===k);});if(k==='a')paint();try{localStorage.setItem('bdl_lab_mode2',k);}catch(e){}}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#lbMode button');if(b)mode(b.dataset.md);});
  function init(){var k='a';try{k=localStorage.getItem('bdl_lab_mode2')||'a';}catch(e){}mode(k==='m'||k==='d'?k:'a');restore().then(resume);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
