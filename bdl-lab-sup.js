/* bdl-lab-sup.js — تدقيق المورد (Build 1448–1457)
   ترفع محادثة واتساب مع مورد USDT (ZIP مع الوسائط) → يُقرأ نص المحادثة والإيصالات:
   • أسعار البيع المذكورة في الرسائل (كوانزا لكل 1 USDT) → المتوسط والوسيط والمدى والتذبذب.
   • إيصالات الكوانزا التي أرسلتُها أنا للمورد (المدفوع).
   • إيصالات USDT التي أرسلها المورد لي (المستلم).
   • إيصالات الكوانزا التي أرسلها المورد لي (تُخصم من المدفوع) و USDT التي أرسلتها له (تُخصم من المستلم).
   الحساب: صافي الكوانزا − (صافي USDT × متوسط السعر) = الفرق. مقارنة ثانية بالسعر المتفق عليه وقت كل استلام.
   لا يُقيَّد شيء في أي تسوية. يشارك ذاكرة القراءة (ما قُرئ لا يُقرأ ثانية). الجلسة تبقى على الجهاز حتى «إنهاء الجلسة». */
(function(){'use strict';
  var L=window.__LAB;if(!L)return;var h=L.h,$=function(i){return document.getElementById(i);},esc=h.esc,toast=h.toast,d0=h.d0,DAY=864e5,KEY='sup';
  var U={c:null,run:null,res:null,v:null,y:null,showR:false,open:{}};
  var CFG={min:700,max:2500,avg:'mean',man:0,tol:1.5};var RNG={AOA:[700,2500],MRU:[25,80]};var FIAT='AOA';
  var FN={AOA:'كوانزا',MRU:'أوقية'};function fiatName(){return FN[FIAT]||FIAT;}function fiatSym(){return FIAT==='AOA'?'Kz':'MRU';}
  function setFiat(f){FIAT=f==='MRU'?'MRU':'AOA';CFG.min=RNG[FIAT][0];CFG.max=RNG[FIAT][1];}try{Object.assign(CFG,JSON.parse(localStorage.getItem('bdl_sup_cfg')||'{}'));}catch(e){}
  function saveCfg(){try{localStorage.setItem('bdl_sup_cfg',JSON.stringify(CFG));}catch(e){}}
  function fm(v,d){return Number(v||0).toLocaleString('en-US',{maximumFractionDigits:d==null?2:d});}
  function fk(v){return fm(Math.round(v),0);}
  function day(ts){return ts?h.dmy(ts).slice(0,10):'—';}
  function nr(v){v=String(v==null?'':v).replace(/\s+/g,'').toUpperCase();return v.length>=5?v:'';}
  function pnum(v){if(typeof v==='number')return isFinite(v)?Math.abs(v):0;var t=String(v==null?'':v).replace(/[\s\u00a0\u202f']/g,'').replace(/[^\d.,]/g,'');if(!t)return 0;
    var i=Math.max(t.lastIndexOf('.'),t.lastIndexOf(',')),dec=i>=0&&t.length-i-1<=2&&t.length-i-1>0;
    var n=dec?t.slice(0,i).replace(/[.,]/g,'')+'.'+t.slice(i+1):t.replace(/[.,]/g,'');return Math.abs(parseFloat(n))||0;}   /* «-11 023,99» → 11023.99 · «1.150.000» → 1150000 */
  function amt(v){v=pnum(v);return v>0&&v<1e11?v:0;}
  function norm(s){return String(s||'').replace(/[‎‏‪-‮⁦-⁩~]/g,'').replace(/\s+/g,' ').trim();}
  function ccyOf(p){var c=String(p.ccy||'').toUpperCase().trim(),b=String(p.bank||'');
    if(/USDT|TETHER|TRC20|ERC20|BEP20/.test(c))return 'USDT';if(/USDC/.test(c))return 'USDC';
    if(/AOA|AKZ|KZ|KWANZA/.test(c))return 'AOA';if(/MRU|MRO|OUGUIYA|\bUM\b|أوقية|اوقية/.test(c))return 'MRU';
    if(/USD|\$/.test(c))return 'USDT'; /* 1452: في تدقيق المورد لا يوجد دولار ورقي — كل «USD» هو USDT (القارئ يسمّي شاشة Binance دولارًا) */if(/EUR|€/.test(c))return 'EUR';if(/^[A-Z]{3}$/.test(c))return c;
    if(/binance|trust ?wallet|tron|okx|bybit|bitget|kucoin|wallet/i.test(b))return 'USDT';
    if(/bankily|masrvi|sedad|bmci|bimbank|click|amanty/i.test(b))return 'MRU';
    if(/\bBFA\b|\bBAI\b|\bBIC\b|\bBPC\b|atl[aâ]ntico|multicaixa|millennium|keve|\bsol\b|standard|\bBCI\b|\bBNI\b|caixa angola|express/i.test(b))return 'AOA';
    return '؟';}
  /* 1450: إيصال Binance فيه عنوان محفظة (0x…40 خانة) وTxid (0x…64 خانة). العنوان نفسه يتكرر في كل الإيصالات — لا يصلح مرجعًا */
  function addrOf(p){var a=String(p.receiver||p.account||'').replace(/\s/g,''),r=String(p.ref||'').replace(/\s/g,'');
    if(/^0x[0-9a-fA-F]{30,42}$/.test(a)||/^T[1-9A-HJ-NP-Za-km-z]{30,34}$/.test(a))return a.toLowerCase();if(/^0x[0-9a-fA-F]{40}$/.test(r))return r.toLowerCase();if(isAddrRef(r)){var rl=r.toLowerCase();for(var k in ADDRS){if(k.indexOf(rl)===0)return k;}return rl;}return '';}
  /* 1456: عناوين المحافظ المعروفة في الجلسة — أي «مرجع» يبدأ بـ0x ويطابق عنوانًا (أو بدايته، لأن OCR يبتر السطر) أو يتكرر على 3 إيصالات بمبالغ مختلفة فهو عنوان لا مرجع */
  var ADDRS={};
  function learnAddrs(its){ADDRS={};var c={},am={};its.forEach(function(it){var p=it.p||{},a=String(p.receiver||p.account||'').replace(/\s/g,'').toLowerCase();if(/^0x[0-9a-f]{30,}$|^t[1-9a-z]{30,34}$/.test(a))ADDRS[a]=1;
      var r=String(p.ref||'').replace(/\s/g,'').toLowerCase();if(/^0x[0-9a-f]{10,39}$/.test(r)){c[r]=(c[r]||0)+1;(am[r]||(am[r]={}))[Math.round(amt(p.amount))]=1;}});
    Object.keys(c).forEach(function(r){if(c[r]>=3&&Object.keys(am[r]).length>=2)ADDRS[r]=1;});}
  function isAddrRef(r){r=String(r||'').replace(/\s/g,'').toLowerCase();if(!/^0x[0-9a-f]{10,}$/.test(r))return false;if(ADDRS[r])return true;for(var a in ADDRS){if(a.indexOf(r)===0||r.indexOf(a)===0)return true;}return false;}
  function refOf(p){var r=String(p.ref||'').replace(/\s/g,'');if(/^0x[0-9a-fA-F]{40}$/.test(r)||isAddrRef(r))return '';return nr(r);}
  function shortA(a){return a?a.slice(0,8)+'…'+a.slice(-6):'';}
  /* 1453: حسابات المورد — تُتعلَّم من إيصالات الدفع (اسم المستفيد / رقم الحساب / IBAN) وتُحفظ لكل مورد على الجهاز */
  function normName(n){return String(n||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z\u0600-\u06ff ]+/g,' ').replace(/\b(lda|limitada|sa|comercio|geral|unipessoal|e|de|da|do)\b/g,' ').replace(/\s+/g,' ').trim();}
  function acctKeys(p){var ks=[],d=String(p.account||'').replace(/\D/g,'');if(d.length>=8)ks.push('a:'+d.slice(-12));var n=normName(p.name||p.receiver||'');if(n.length>=4&&!/^0x/.test(n))ks.push('n:'+n);return ks;}
  function acctLabel(p){var n=String(p.name||p.receiver||'').trim(),d=String(p.account||'').replace(/\D/g,'');return (n?n.slice(0,30):'')+(d.length>=8?(n?' · ':'')+'…'+d.slice(-6):'')||'بلا اسم';}
  var REG={};try{REG=JSON.parse(localStorage.getItem('bdl_sup_acct')||'{}')||{};}catch(e){REG={};}
  function regOf(name){return REG[name]||(REG[name]={});}
  function regSave(){try{localStorage.setItem('bdl_sup_acct',JSON.stringify(REG));}catch(e){}}
  /* 1455: وقت العملية المطبوع داخل الإيصال (لا وقت الرسالة) — الحكم بالتكرار يعتمد عليه مع رقم العملية */
  function ptime(p){var d=String(p.date||'').trim();if(!d)return 0;var m=d.match(/(\d{4})-(\d{2})-(\d{2})[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);if(m)return Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0));
    m=d.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);if(m)return Date.UTC(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+(m[6]||0));return 0;}
  function failed(p){var st=String(p.status||'');if(/conclu|complet|success|sucesso|efetuad|efectuad/i.test(st))return false;return /fail|rejei|recus|cancel|erro|declin|فشل|مرفوض|ملغ/i.test(st);}

  /* ── قراءة نص المحادثة: الرسائل + المرسل + المرفقات ── */
  async function parseChat(z){var ce=null;z.forEach(function(p,en){if(en.dir)return;if(/(^|\/)_chat\.txt$/i.test(p))ce=en;else if(!ce&&/\.txt$/i.test(p))ce=en;});
    var out={msgs:[],att:{},senders:{}};if(!ce)return out;var txt=await ce.async('string');
    var re=/^[‎‏﻿\s]*\[?(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?[\s  ]*([APap]\.?\s?[Mm]\.?)?\]?\s*(?:[-–]\s*)?/;
    var raw=[],cur=null,a13=false,b13=false;
    txt.split(/\r?\n/).forEach(function(line){var m=line.match(re);
      if(m){var rest=line.slice(m[0].length),k=rest.indexOf(': ');cur={a:+m[1],b:+m[2],c:+m[3],h:+m[4],mi:+m[5],s:+(m[6]||0),ap:(m[7]||'').charAt(0).toLowerCase(),y4:m[1].length===4,who:k>0&&k<60?norm(rest.slice(0,k)):'',t:k>0&&k<60?rest.slice(k+2):''};
        if(!cur.y4){if(cur.a>12)a13=true;if(cur.b>12)b13=true;}raw.push(cur);}
      else if(cur)cur.t+='\n'+line;});
    var mk=function(d,mode){var y,mo,da;if(d.y4){y=d.a;mo=d.b;da=d.c;}else{y=d.c<100?2000+d.c:d.c;if(mode==='mdy'){mo=d.a;da=d.b;}else{da=d.a;mo=d.b;}}
      var hh=d.h;if(d.ap==='p'&&hh<12)hh+=12;if(d.ap==='a'&&hh===12)hh=0;if(mo<1||mo>12||da<1||da>31)return 0;return new Date(y,mo-1,da,hh,d.mi,d.s).getTime()||0;};
    var inv=function(mode){var n=0,p=0;raw.forEach(function(d){var t=mk(d,mode);if(!t){n+=3;return;}if(t<p)n++;p=t;});return n;};
    var mode=a13?'dmy':b13?'mdy':(inv('mdy')<inv('dmy')?'mdy':'dmy');
    raw.forEach(function(d){if(!d.who)return;var ts=mk(d,mode),t=norm(d.t);out.senders[d.who]=(out.senders[d.who]||0)+1;
      var f=d.t.match(/<[^:<>]{2,24}:\s*([^<>\n]+?\.(?:jpe?g|png|webp|heic|pdf))\s*>/i)||d.t.match(/^[\s\u200e\u200f]*([^<>\n(]+?\.(?:jpe?g|png|webp|heic|pdf))\s*\(/i)||d.t.match(/([^\s<>:]+\.(?:jpe?g|png|webp|heic|pdf))/i);
      if(f&&/attach|anexad|ficheiro|arquivo|file|مرفق|<|\(/i.test(d.t)){out.att[norm(f[1]).toLowerCase()]={ts:ts,who:d.who};return;}
      if(t&&!/omitted|omitid|ocultad|deleted|apagad|حذف/i.test(t))out.msgs.push({ts:ts,who:d.who,t:t});});
    return out;}

  /* ── استخراج الأسعار من الرسائل ── */
  var KW=/taxa|\btx\b|pre[cç]o|c[aâ]mbio|cotac|rate|price|سعر|السعر|@|\ba\s+\d|usdt|\bkz\b/i;
  function numOf(tok){tok=tok.replace(/[.,]$/,'');var m;
    if(/^\d{1,2}[.,]\d{3}([.,]\d{1,2})?$/.test(tok)){m=tok.split(/[.,]/);return +(m[0]+m[1]+(m[2]?'.'+m[2]:''));}
    if(/^\d{3,4}([.,]\d{1,2})?$/.test(tok))return +tok.replace(',','.');
    if(/^\d+$/.test(tok))return +tok;return NaN;}
  function ratesIn(msg){var t=msg.t.replace(/\b\d{1,2}[:h]\d{2}\b/g,' ').replace(/\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,' '),out=[],re=/\d[\d.,]*/g,m;
    while((m=re.exec(t))){var v=numOf(m[0]);if(!(v>=CFG.min&&v<=CFG.max))continue;var after=t.slice(m.index+m[0].length,m.index+m[0].length+8).toLowerCase();
      if(/^\s*(usdt|usd|\$|dol|d[oó]lar|mil\b|milh|mln|k\b|m\b|tether|%)/.test(after))continue;
      out.push(v);}
    return out;}
  function buildRates(msgs,sup){var R=[];msgs.forEach(function(m){var vs=ratesIn(m);if(!vs.length)return;var kw=KW.test(m.t),short=m.t.replace(/[^\d.,\s]/g,'').trim().length>=m.t.trim().length-6;
      vs.forEach(function(v){R.push({ts:m.ts,who:m.who,v:v,t:m.t.slice(0,90),kw:kw,short:short,on:kw||short,sup:m.who===sup});});});
    var base=R.filter(function(r){return r.on;}).map(function(r){return r.v;}),md=median(base);
    if(md)R.forEach(function(r){r.dev=(r.v-md)/md*100;if(Math.abs(r.dev)>15)r.on=false;});
    return R;}
  function median(a){if(!a.length)return 0;a=a.slice().sort(function(x,y){return x-y;});var k=a.length>>1;return a.length%2?a[k]:(a[k-1]+a[k])/2;}

  /* ── فتح الملف ── */
  function isZip(x){return /\.zip$/i.test(x.name||'')||/zip/i.test(x.type||'');}
  async function pick(files){files=[].slice.call(files||[]);var zf=files.find(isZip);if(!zf){toast('ارفع ملف ZIP للمحادثة مع الوسائط');return;}
    if(zf.size>350*1048576&&!confirm('الملف كبير ('+Math.round(zf.size/1048576)+' MB) وقد لا يتحمله الهاتف. المتابعة؟'))return;
    var mb=Math.round(zf.size/1048576);U.c={busy:1,st:1,mb:mb,fn:zf.name};U.res=null;paint();
    try{await h.loadZip();var z=await window.JSZip.loadAsync(zf);U.c.st=2;paint();var ch=await parseChat(z);U.c.st=3;U.c.nmsg=ch.msgs.length;paint();var name=h.zName(zf.name),list=[];
      z.forEach(function(p,en){if(en.dir)return;var nm=p.split('/').pop();if(!h.isDoc(nm,'')||/STICKER|-STK-/i.test(nm))return;var a=ch.att[nm.toLowerCase()]||{};list.push({nm:nm,en:en,ts:a.ts||h.waStamp(nm)||0,who:a.who||''});});
      if(!list.length&&!ch.msgs.length)throw new Error('لا رسائل ولا إيصالات في الملف — صدّر المحادثة «مع الوسائط»');
      var names=Object.keys(ch.senders).sort(function(a,b){return ch.senders[b]-ch.senders[a];}),sup=names.filter(function(n){return n.toLowerCase()===name.toLowerCase();})[0]||names.filter(function(n){return n.toLowerCase().indexOf(name.toLowerCase())>=0||name.toLowerCase().indexOf(n.toLowerCase())>=0;})[0]||'';
      /* 1451: من أنا؟ الأسماء التي اخترتها «أنا» من قبل تُحفظ على الجهاز، وإلا فاسم الحساب (Javer / BDL) */
      var ME=[];try{ME=JSON.parse(localStorage.getItem('bdl_sup_me')||'[]');}catch(e){}
      var isMe=function(n){var l=n.toLowerCase();return ME.indexOf(n)>=0||/javer|mstr|bdl|arkan|لبدال|محمد/i.test(l);};
      var roles={};names.forEach(function(n){roles[n]=n===sup?'s':isMe(n)?'m':'';});
      var und=names.filter(function(n){return !roles[n];});
      if(!sup){var me=names.filter(isMe);if(me.length&&und.length){roles[und[0]]='s';sup=und[0];}else if(!me.length&&names.length>=2){roles[names[1]]='s';sup=names[1];}else if(!me.length&&names.length===1){roles[names[0]]='s';sup=names[0];}}
      names.forEach(function(n){if(!roles[n])roles[n]='m';});
      var ts=list.map(function(x){return x.ts;}).concat(ch.msgs.map(function(m){return m.ts;})).filter(Boolean),mx=ts.length?Math.max.apply(null,ts):Date.now(),mn=ts.length?Math.min.apply(null,ts):mx;
      U.c={name:name,list:list,msgs:ch.msgs,names:names,roles:roles,guess:!sup,min:d0(mn),max:d0(mx),from:d0(mn),to:d0(mx),all:true};}
    catch(e){U.c=null;toast((e&&e.message)||'تعذّر فتح الملف');}
    paint();}
  function inPer(ts,c){if(c.all)return true;if(!ts)return false;var k=d0(ts);return k>=c.from&&k<=c.to;}
  function perTxt(c){return c.all?'كل المحادثة':(c.from===c.to?day(c.from):'من '+day(c.from)+' إلى '+day(c.to));}

  /* ── القراءة ── */
  var DB=null,MEM={};
  function idb(){return new Promise(function(res){try{if(!window.indexedDB)return res(null);var q=indexedDB.open('bdl_lab_cache',1);q.onupgradeneeded=function(){q.result.createObjectStore('r');};q.onsuccess=function(){res(q.result);};q.onerror=function(){res(null);};}catch(e){res(null);}});}
  function cget(k){return new Promise(function(res){if(MEM[k])return res(MEM[k]);if(!DB)return res(null);try{var q=DB.transaction('r').objectStore('r').get(k);q.onsuccess=function(){res(q.result||null);};q.onerror=function(){res(null);};}catch(e){res(null);}});}
  function cput(k,v){MEM[k]=v;if(!DB)return;try{DB.transaction('r','readwrite').objectStore('r').put(v,k);}catch(e){}}
  async function readOne(x){var bl=await x.en.async('blob'),ex=x.nm.split('.').pop().toLowerCase(),file=new File([bl],x.nm,{type:ex==='pdf'?'application/pdf':ex==='png'?'image/png':ex==='webp'?'image/webp':'image/jpeg'});
    var r=await readFile(file,false);return {file:file,nm:x.nm,ts:x.ts,who:x.who,pdf:ex==='pdf',p:r.p,fp:r.fp};}
  /* 1449: ما قُرئ سابقًا بمبلغ صفري (مثل «-11 023,99 USDT» الذي ضاع رقمه) يُعاد مرة واحدة — التعديل اليدوي لا يُمس */
  async function readFile(file,force){var fp=await h.sha(file),p=await cget(fp);
    if(!p||p.ccy===undefined||force||(!p.man&&!p.sv&&!(pnum(p.amount)>0))||(!p.man&&(p.rv||0)<6&&(p.weak||!(pnum(p.amount)>0)||/fail|rejei|recus|cancel|declin/i.test(p.status||'')))||(!p.man&&(p.rv||0)<7&&/USDT|USD/i.test(p.ccy||'')&&!refOf(p))){ /* 1452: ما قُرئ قبل إصلاح Binance وعُلِّم فاشلًا/ضعيفًا يُعاد مرة واحدة */var AR=window.ArkanRead,g=null,eng='';try{var r=await Promise.race([AR.read(file),new Promise(function(z){setTimeout(function(){z(null);},45000);})]);if(r){g=r.parsed||{};eng=r.engine||'ocr';}}catch(e){}
      if(eng&&!(pnum(g.amount)>0)&&r&&r.text){var mt=String(r.text).match(/(-?\s?\d[\d\s.,]{0,14}\d)\s*(USDT|USDC|USD)\b/i)||String(r.text).match(/(?:Valor|Amount|Quantia|Montante)\s*:?\s*(\d[\d\s.,]*)\s*(USDT|USDC)/i);if(mt&&pnum(mt[1])>0){g.amount=mt[1];g.currency=g.currency||'USDT';if(!g.bank)g.bank='Binance';}}
      if(eng){p={amount:pnum(g.amount),raw:String(g.amount==null?'':g.amount),sv:2,ref:g.transaction_id||g.reference||g.txn||'',bank:g.bank||g.institution||'',date:g.date||'',name:g.beneficiary||g.name||'',account:g.iban||g.account||'',receiver:g.receiver||'',ccy:String(g.currency||g.ccy||''),status:String(g.status||''),eng:eng,rv:7};if(g.weak)p.weak=1;if(g.is_receipt===false)p.nr=1;var rr=String(p.ref||'').replace(/\s/g,'');if(/^0x[0-9a-fA-F]{40}$/.test(rr)){if(!p.receiver)p.receiver=rr;p.ref='';}else if(/^0x/i.test(rr)&&p.receiver&&String(p.receiver).replace(/\s/g,'').toLowerCase().indexOf(rr.toLowerCase())===0)p.ref='';if((addrOf(p)||/^0x[0-9a-fA-F]{60,}/.test(String(p.ref||'')))&&(!p.ccy||/^USD$/i.test(p.ccy)))p.ccy='USDT';cput(fp,p);}
      else if(!p)p={amount:0,ref:'',bank:'',ccy:'',status:'',eng:'',rv:0};}
    return {p:p,fp:fp};}
  function feed(R,it){var p=it.p||{},v=amt(p.amount),c=it.cc||ccyOf(p),k=it.d?'d':!v||c==='؟'?'u':c===FIAT?'K':(c==='USDT'||c=='USDC')?'T':'o';R.cnt[k]++;R.sum[k==='K'?'K':k==='T'?'T':'x']+=k==='K'||k==='T'?v:0;}
  var PT=0;function paintP(){var now=Date.now();if(now-PT<400){if(!paintP.q){paintP.q=setTimeout(function(){paintP.q=0;PT=Date.now();paint();},400-(now-PT));}return;}PT=now;paint();}
  /* 1453: ممنوع تكرار الإيصالات — أربع طبقات. مؤكد (يُحسب مرة واحدة تلقائيًا): الصورة نفسها، أو رقم العملية نفسه (أو ذيله 8 خانات)، أو صورة متطابقة بصريًا بالمبلغ نفسه.
     مشتبه (طبقة مراجعة): المبلغ نفسه بالعملة نفسها في اليوم نفسه بلا رقم عملية مقروء، أو صورة متشابهة بالمبلغ نفسه خلال 3 أيام. */
  async function dedupe(its,R){var n=0,LA=window.__LABA,rs={},tl={};learnAddrs(its);
    its.sort(function(a,b){return (a.ts||0)-(b.ts||0);});
    its.forEach(function(it){if(it.d)return;var rf=refOf(it.p);if(!rf||rf.length<6)return;var t8=rf.slice(-8);
      if(rs[rf]){var ta=ptime(it.p),tb=ptime(rs[rf].p),sameAmt=Math.round(amt(it.p.amount))===Math.round(amt(rs[rf].p.amount));
        if(ta&&tb&&Math.abs(ta-tb)>90e3){if(sameAmt)it.ds={of:rs[rf].nm,how:'reftime',j:rs[rf],key:rf};return;} /* مرجع واحد بمبلغين ووقتين مختلفين = قراءة خاطئة للمرجع لا تكرار؛ يظهر في فحص المراجع */
        if(!sameAmt&&(ta||tb)){return;}
        n++;it.d={of:rs[rf].nm,how:'ref',key:rf};return;}if(rf.length>=10&&tl[t8]&&Math.round(amt(tl[t8].p.amount))===Math.round(amt(it.p.amount))){n++;it.d={of:tl[t8].nm,how:'ref8'};return;}
      rs[rf]=it;if(rf.length>=10)tl[t8]=it;});
    var byA={};its.forEach(function(it){if(it.d)return;var v=amt(it.p.amount),c=ccyOf(it.p);if(!v||c==='؟')return;(byA[c+'|'+Math.round(v)]||(byA[c+'|'+Math.round(v)]=[])).push(it);});
    var keys=Object.keys(byA).filter(function(k){return byA[k].length>1;}),cand=[];keys.forEach(function(k){cand=cand.concat(byA[k]);});
    if(LA&&LA.dhash){for(var i=0;i<cand.length&&!(R&&R.stop);i++){var it=cand[i];if(it.ph===undefined){if(!it.file&&it._si>=0){try{it.file=await h.sess.file(KEY,it._si,it.nm,it.pdf);}catch(e){}}it.ph=it.file&&!it.pdf?await LA.dhash(it.file):'';}if(R){R.d=i+1;R.n=cand.length;paintP();}}}
    keys.forEach(function(k){var L2=byA[k];for(var i=1;i<L2.length;i++){var a=L2[i];if(a.d)continue;for(var j=0;j<i;j++){var b=L2[j];if(b.d)continue;var dt=Math.abs((a.ts||0)-(b.ts||0)),ra=refOf(a.p),rb=refOf(b.p);
          if(ra&&rb&&ra!==rb&&ra.slice(-8)!==rb.slice(-8))continue; /* مرجعان مختلفان مقروءان = إيصالان مختلفان */
          var ta=ptime(a.p),tb=ptime(b.p),tdiff=ta&&tb?Math.abs(ta-tb):-1;
          if(tdiff>90e3)continue; /* وقتان مطبوعان مختلفان = عمليتان مختلفتان مهما تشابهت الصورة أو المبلغ */
          if(ra&&rb&&ra!==rb)continue;
          var hm=(LA&&LA.ham&&a.ph&&b.ph)?LA.ham(a.ph,b.ph):99;
          if(tdiff>=0&&tdiff<=90e3&&(ra===rb||!ra||!rb)){n++;a.d={of:b.nm,how:'time',key:String(a.p.date||'').slice(0,19)};break;} /* الوقت نفسه إلى الثانية والمبلغ نفسه = الإيصال نفسه */
          if(hm<=4&&tdiff<0){n++;a.d={of:b.nm,how:'img'};break;}
          if(tdiff<0&&((hm<=10&&dt<=3*DAY)||((!ra||!rb)&&dt<=DAY&&normName(a.p.bank)===normName(b.p.bank)))){a.ds={of:b.nm,how:hm<=10?'img':'amt',j:b,key:fm(amt(a.p.amount))+' '+ccyOf(a.p)+(hm<=10?' · تشابه بصري '+hm+'/64':'')};break;}}}});
    return n;}
  function untilVisible(){return document.hidden?new Promise(function(res){var fn=function(){if(!document.hidden){document.removeEventListener('visibilitychange',fn);res();}};document.addEventListener('visibilitychange',fn);}):Promise.resolve();}
  async function start(){var c=U.c;if(!c||c.busy)return;var C=c.list.filter(function(x){return inPer(x.ts,c);});if(!DB)DB=await idb();
    var R={n:C.length,d:0,stop:false,t0:Date.now(),cur:'',t:'قراءة إيصالات «'+c.name+'»',cnt:{K:0,T:0,o:0,u:0,d:0},sum:{K:0,T:0,x:0},feed:[]};U.run=R;paint();var its=[],seen={},qi=0,dup=0;
    async function wk(){while(qi<C.length&&!R.stop){var x=C[qi++];R.cur=x.nm;await untilVisible();try{var it=await readOne(x);if(seen[it.fp]){dup++;it.d={of:seen[it.fp].nm,how:'fp'};}else seen[it.fp]=it;its.push(it);feed(R,it);}catch(e){}R.d++;paintP();}}
    var w=[];for(var i=0;i<3;i++)w.push(wk());await Promise.all(w);
    /* 1453: العملة الورقية للملف — كوانزا أو أوقية حسب الأغلبية (الماسح نفسه يصلح لزبناء الأوقية) */
    var nA=0,nM=0;its.forEach(function(it){var c=ccyOf(it.p);if(c==='AOA')nA++;else if(c==='MRU')nM++;});setFiat(nM>nA?'MRU':'AOA');
    R.t='كشف التكرار';R.d=0;R.n=its.length;paint();
    dup+=await dedupe(its,R);
    var msgs=c.msgs.filter(function(m){return inPer(m.ts,c);}),sup=Object.keys(c.roles).filter(function(n){return c.roles[n]==='s';})[0]||'';
    if(R.last)URL.revokeObjectURL(R.last);U.res={name:c.name,addr:{},tdef:'s',its:its,rates:buildRates(msgs,sup),roles:Object.assign({},c.roles),per:perTxt(c),dup:dup,stopped:R.stop,at:Date.now(),nread:C.length};U.run=null;persist();paint();window.scrollTo(0,0);}

  /* ── الحساب ── */
  /* 1449: الإيصال لا يدخل الحساب إلا إن بدا إيصالًا فعلًا — الحاسبة واللقطات والمبالغ غير المنطقية تذهب إلى صندوق المراجعة ومنه تُرفع يدويًا */
  function why(it,v,c){var p=it.p||{};if(it.ok)return '';if(p.nr)return 'القارئ: ليست إيصالًا';if(!v)return 'لم يُقرأ المبلغ';if(c==='؟')return 'العملة غير واضحة';
    if(!refOf(p)&&!addrOf(p)&&!p.bank&&!p.account&&!p.receiver&&!p.name)return 'بلا بنك ولا مرجع — قد تكون حاسبة أو لقطة شاشة';
    if(c==='AOA'&&(v<1000||v>500e6))return 'مبلغ كوانزا غير منطقي';if(c==='MRU'&&(v<100||v>50e6))return 'مبلغ أوقية غير منطقي';if((c==='USDT'||c==='USDC')&&v>500000)return 'مبلغ USDT غير منطقي';return '';}
  /* طبقات المراجعة: dupS مشتبه بالتكرار · acct حساب غير معروف للمورد · noacct بلا مستفيد مقروء · read غير مقروء/ليست إيصالًا · fail فاشلة */
  var LAY={dupS:'مشتبه بالتكرار',acct:'حساب غير معروف للمورد',noacct:'بلا اسم مستفيد مقروء',read:'غير مقروءة أو ليست إيصالًا',fail:'فاشلة حسب القارئ'};
  function dirT(it,S){var a=addrOf(it.p),m=S.addr||{};if(a&&m[a])return m[a]==='mine'?'s':'m';if(/javer|mstr|bdl|arkan/i.test(String(it.p.name||'')))return 's';return S.tdef||'s';}
  function side(it,S,KN){it.why='';it.lay='';if(it.x)return 'x';if(it.d&&!it.nd)return 'd';if(it.ds&&!it.nd){it.lay='dupS';it.why=it.ds.how==='reftime'?'رقم العملية نفسه لكن الوقت المطبوع مختلف عن إيصال '+day(it.ds.j?it.ds.j.ts:0)+' — قارن':'مبلغ مطابق لإيصال آخر في '+day(it.ds.j?it.ds.j.ts:0)+(it.ds.how==='img'?' وصورة متشابهة':' بلا رقم عملية ولا وقت مطبوع');return 'u';}
    if(failed(it.p)&&!it.ok){it.lay='fail';it.why='القارئ يقول إنها فاشلة/ملغاة — افتحها وتحقق';return 'u';}var v=amt(it.p.amount),c=it.cc||ccyOf(it.p),r=it.ow||(it.who?S.roles[it.who]:'');
    it.why=why(it,v,c);if(it.why){it.lay='read';return 'u';}if(c!==FIAT&&c!=='USDT'&&c!=='USDC')return 'o';var cr=c===FIAT?'K':'T';
    if(cr==='K'&&(r||'m')==='m'&&!it.ok&&KN){var ks=acctKeys(it.p);if(!ks.length){it.lay='noacct';it.why='لم يُقرأ اسم المستفيد ولا حسابه — تحقق أنه حساب المورد';return 'u';}
      var st=0;ks.forEach(function(k){if(KN[k]===1)st=1;else if(KN[k]===-1&&!st)st=-1;});if(st===-1){it.lay='acct';it.why='حساب مرفوض: '+acctLabel(it.p);return 'u';}if(!st){it.lay='acct';it.why='حساب غير معروف للمورد: '+acctLabel(it.p);return 'u';}}
    if(cr==='T')r=it.ow||dirT(it,S); /* 1450: اتجاه USDT من عنوان المحفظة المستلِمة، لا من مرسل الصورة في المحادثة */
    if(!r)r='m';
    return (r==='m'?'m':'s')+cr;}
  function stats(S){var on=S.rates.filter(function(r){return r.on;}).map(function(r){return r.v;});
    if(CFG.man>0)return {avg:+CFG.man,mean:on.length?on.reduce(function(a,b){return a+b;},0)/on.length:0,med:median(on),n:on.length,min:on.length?Math.min.apply(null,on):0,max:on.length?Math.max.apply(null,on):0,man:1};
    var mean=on.length?on.reduce(function(a,b){return a+b;},0)/on.length:0,md=median(on),sd=0;if(on.length>1){sd=Math.sqrt(on.reduce(function(a,b){return a+(b-mean)*(b-mean);},0)/(on.length-1));}
    return {avg:CFG.avg==='med'?md:mean,mean:mean,med:md,n:on.length,min:on.length?Math.min.apply(null,on):0,max:on.length?Math.max.apply(null,on):0,sd:sd};}
  function rateAt(S,ts,avg){var on=S.rates.filter(function(r){return r.on&&r.ts;}),best=null;
    for(var i=0;i<on.length;i++){var r=on[i];if(r.ts<=ts&&ts-r.ts<=7*DAY)best=r;}
    if(!best)for(var j=0;j<on.length;j++){if(on[j].ts>ts&&on[j].ts-ts<=2*DAY){best=on[j];break;}}
    return best?best.v:avg;}
  /* حسابات المورد المعروفة: ما ثبّته أنت (1) أو رفضته (−1)، وتلقائيًا كل حساب تكرر في إيصالين فأكثر */
  function knownAccts(S){var reg=regOf(S.name),cnt={},lab={},KN={};
    S.its.forEach(function(it){if(it.x||it.d)return;var c=it.cc||ccyOf(it.p);if(c!==FIAT)return;var r=it.ow||(it.who?S.roles[it.who]:'')||'m';if(r!=='m')return;acctKeys(it.p).forEach(function(k){cnt[k]=(cnt[k]||0)+1;lab[k]=lab[k]||acctLabel(it.p);});});
    Object.keys(cnt).forEach(function(k){KN[k]=reg[k]&&reg[k].ok!=null?(reg[k].ok?1:-1):(cnt[k]>=3?1:0);});
    Object.keys(reg).forEach(function(k){if(KN[k]==null)KN[k]=reg[k].ok?1:-1;});
    return {KN:KN,cnt:cnt,lab:lab};}
  function calc(){var S=U.res;learnAddrs(S.its);var col={mK:[],sT:[],sK:[],mT:[],u:[],o:[],x:[],d:[]},sum={mK:0,sT:0,sK:0,mT:0},KA=knownAccts(S),lays={dupS:[],acct:[],noacct:[],read:[],fail:[]};
    S.its.forEach(function(it,i){it.i=i;var k=side(it,S,KA.KN);it.k=k;(col[k]||col.u).push(it);if(k==='u'&&lays[it.lay||'read'])lays[it.lay||'read'].push(it);if(sum[k]!=null)sum[k]+=amt(it.p.amount);});
    var st=stats(S),avg=st.avg,netK=sum.mK-sum.sK,netT=sum.sT-sum.mT,val=netT*avg,diff=netK-val,impl=netT>0?netK/netT:0,dev=avg&&impl?(impl-avg)/avg*100:0;
    var at=0;col.sT.forEach(function(it){var r=rateAt(S,it.ts,avg);it.rt=r;at+=amt(it.p.amount)*r;});col.mT.forEach(function(it){var r=rateAt(S,it.ts,avg);it.rt=r;at-=amt(it.p.amount)*r;});
    var mo={};function mb(ts){var d=new Date(ts||0);return ts?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'):'؟';}
    function dk(ts){return ts?h.iso(ts):'؟';}
    ['mK','sK','sT','mT'].forEach(function(k){col[k].forEach(function(it){var m=mb(it.ts),o=mo[m]||(mo[m]={m:m,mK:0,sK:0,sT:0,mT:0,r:[],days:{}});o[k]+=amt(it.p.amount);var d=dk(it.ts),q=o.days[d]||(o.days[d]={d:d,mK:0,sK:0,sT:0,mT:0,n:0,r:[]});q[k]+=amt(it.p.amount);q.n++;});});
    S.rates.forEach(function(r){if(!r.on)return;var m=mb(r.ts),o=mo[m]||(mo[m]={m:m,mK:0,sK:0,sT:0,mT:0,r:[],days:{}});o.r.push(r.v);var d=dk(r.ts),q=o.days[d]||(o.days[d]={d:d,mK:0,sK:0,sT:0,mT:0,n:0,r:[]});q.r.push(r.v);});
    var fin=function(o){o.avg=o.r.length?o.r.reduce(function(a,b){return a+b;},0)/o.r.length:0;o.net=o.mK-o.sK;o.usd=o.sT-o.mT;o.impl=o.usd>0?o.net/o.usd:0;o.dev=o.avg&&o.impl?(o.impl-o.avg)/o.avg*100:0;return o;};
    var months=Object.keys(mo).sort().map(function(k){var o=fin(mo[k]);o.dl=Object.keys(o.days).sort().map(function(d){var q=fin(o.days[d]);if(!q.avg)q.dev=avg&&q.impl?(q.impl-avg)/avg*100:0;return q;});return o;});
    /* 1454: فحص المراجع — كل مرجع يجب أن يظهر مرة واحدة في الحساب */
    var refs={},noRef=[],cnt=0;['mK','sK','sT','mT'].forEach(function(k){col[k].forEach(function(it){var rf=refOf(it.p);if(!rf){noRef.push(it);return;}cnt++;(refs[rf]||(refs[rf]=[])).push(it);});});
    var refDup=Object.keys(refs).filter(function(r){return refs[r].length>1;}).map(function(r){return {ref:r,its:refs[r]};});
    var audit={total:cnt,unique:Object.keys(refs).length,dup:refDup,noRef:noRef,dcol:col.d.length};
    var wavg=netT>0&&at?at/netT:0;
    return {col:col,sum:sum,st:st,avg:avg,netK:netK,netT:netT,val:val,diff:diff,impl:impl,dev:dev,atVal:at,atDiff:netK-at,wavg:wavg,months:months,lays:lays,KA:KA,audit:audit};}

  /* ── الحفظ على الجهاز ── */
  function persist(){var S=U.res;if(!S)return;h.sess.save(KEY,{fiat:FIAT,addr:S.addr||{},tdef:S.tdef||'s',name:S.name,rates:S.rates,roles:S.roles,per:S.per,dup:S.dup,stopped:S.stopped,nread:S.nread},S.its.map(function(it){return {file:it.file,data:{nm:it.nm,ts:it.ts,who:it.who,pdf:it.pdf,p:it.p,fp:it.fp,x:it.x||0,cc:it.cc||'',ow:it.ow||'',d:it.d||null,nd:it.nd||0,ok:it.ok||0,ds:it.ds?{of:it.ds.of,how:it.ds.how,key:it.ds.key||'',ji:it.ds.j?it.ds.j.i:-1}:null,ph:it.ph||''}};}))
    .then(function(ok){if(!ok)return toast('تعذّر حفظ الجلسة على الجهاز');return h.sess.get(KEY+':meta');}).then(function(m){if(!m||!m.rows||U.res!==S)return;
      /* 1451: الصور المحفوظة على الجهاز تُفرَّغ من الذاكرة (10,000 إيصال لا تبقى في الرام) */
      m.rows.forEach(function(r,i){var it=S.its[i];if(!it)return;if(r._f){it._si=i;if(it.file){it.file=null;}}});});}
  function saveMeta(){var S=U.res;if(!S)return;h.sess.get(KEY+':meta').then(function(m){if(!m)return;m.meta.rates=S.rates;m.meta.roles=S.roles;m.meta.addr=S.addr||{};m.meta.tdef=S.tdef||'s';m.rows.forEach(function(r,i){var it=S.its[i];if(!it)return;r.p=it.p;r.x=it.x||0;r.cc=it.cc||'';r.ow=it.ow||'';r.nd=it.nd||0;r.ok=it.ok||0;r.d=it.d||null;r.ds=it.ds?{of:it.ds.of,how:it.ds.how,key:it.ds.key||'',ji:it.ds.j?it.ds.j.i:-1}:null;});h.sess.put(KEY+':meta',m);});}
  async function restore(){try{var m=await h.sess.load(KEY);if(!m||!m.meta||U.res||U.run)return;var M=m.meta;
      setFiat(M.fiat||'AOA');U.res={addr:M.addr||{},tdef:M.tdef||'s',name:M.name,rates:M.rates||[],roles:M.roles||{},per:M.per||'',dup:M.dup||0,stopped:M.stopped,nread:M.nread||0,at:m.at,restored:1,its:(m.rows||[]).map(function(r,i){return {nm:r.nm,ts:r.ts,who:r.who,pdf:r.pdf,p:r.p||{},fp:r.fp,x:r.x||0,cc:r.cc||'',ow:r.ow||'',d:r.d||null,nd:r.nd||0,ok:r.ok||0,ds:r.ds||null,ph:r.ph||'',file:null,_si:r._f?i:-1};})};
      U.res.its.forEach(function(it){if(it.ds&&it.ds.ji>=0)it.ds.j=U.res.its[it.ds.ji];});paint();}catch(e){}}

  /* ── العرض ── */
  var CSS=0;function css(){if(CSS)return;CSS=1;var s=document.createElement('style');s.textContent=
    '#lsMain{--sf:"Newsreader","IBM Plex Sans Arabic",Georgia,serif}#lsMain .box{background:#fff;border:1px solid #E3E8F2;border-radius:12px;padding:14px 12px;margin:10px 0}#lsMain h3{font-family:var(--sf);font-size:19px;margin:0 0 8px;color:#0B1F3F}#lsMain .mt{font-size:13px;color:#5C7699;line-height:1.7}'+
    '#lsMain .bt{display:block;width:100%;min-height:50px;border:1.5px solid #0B1F3F;background:#0B1F3F;color:#fff;font-weight:700;font-size:15px;margin-top:8px}#lsMain .bt.l{background:#fff;color:#0B1F3F}#lsMain .bt.g{background:#F0B429;border-color:#F0B429;color:#0B1F3F}'+
    '#lsMain .rl{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}#lsMain .rl button{min-height:40px;padding:0 12px;border:1.5px solid #C9D6EA;background:#fff;color:#0B1F3F;font-weight:700;font-size:13px}#lsMain .rl button.on{background:#0B1F3F;color:#fff;border-color:#0B1F3F}#lsMain .rl button.s.on{background:#0E7C52;border-color:#0E7C52}'+
    '#lsMain .dt{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}#lsMain .dt input{width:100%;height:44px;border:1.5px solid #C9D6EA;padding:0 8px;font-size:15px;font-family:inherit}#lsMain label small{display:block;font-size:11.5px;font-weight:700;color:#5C7699;margin-bottom:3px}'+
    '#lsMain .pg{height:8px;background:#E3E8F2;margin:10px 0}#lsMain .pg i{display:block;height:100%;background:linear-gradient(90deg,#1A6FE0,#0B2F70)}#lsMain .pc{font-family:var(--sf);font-size:34px;font-weight:700;color:#0B2F70}'+
    '#lsMain .hero{background:linear-gradient(135deg,#0B2F70,#0A56B8);color:#fff;border-radius:14px;padding:16px 14px;margin:10px 0}#lsMain .hero small{display:block;font-size:12.5px;opacity:.85}#lsMain .hero b{display:block;font-family:var(--sf);font-size:32px;font-weight:600;direction:ltr;text-align:end;margin:4px 0}#lsMain .hero i{display:block;font-style:normal;font-size:13.5px;font-weight:700}#lsMain .hero.neg{background:linear-gradient(135deg,#7A0C1E,#C8102E)}#lsMain .hero.ok{background:linear-gradient(135deg,#0A5C3C,#0E8F5B)}'+
    '#lsMain .kp{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}#lsMain .kp div{background:#fff;border:1px solid #E3E8F2;border-radius:12px;padding:12px;border-top:4px solid #0B2F70;cursor:pointer}#lsMain .kp div.t{border-top-color:#26A17B}#lsMain .kp div.r{border-top-color:#C8102E}#lsMain .kp div.a{border-top-color:#F0B429}#lsMain .kp small{display:block;font-size:12px;font-weight:700;color:#5C7699}#lsMain .kp b{display:block;font-family:var(--sf);font-size:22px;font-weight:600;color:#0B1F3F;direction:ltr;text-align:end;margin:4px 0 2px}#lsMain .kp i{display:block;font-style:normal;font-size:11.5px;color:#5C7699}'+
    '#lsMain .ln{display:flex;justify-content:space-between;gap:10px;padding:9px 2px;border-top:1px solid #EEF1F7;font-size:14px;align-items:baseline}#lsMain .ln b{font-family:var(--sf);font-size:19px;white-space:nowrap;direction:ltr}#lsMain .ln.tt{border-top:2px solid #0B1F3F;font-weight:800}#lsMain .ln.tt b{font-size:23px}#lsMain .ln small{display:block;font-size:11.5px;color:#5C7699}'+
    '#lsMain .wr{background:#FFF1F2;border:1.5px solid #C8102E;color:#7A0C1E;border-radius:10px;padding:10px 12px;margin:10px 0;font-size:13.5px;line-height:1.7}#lsMain .okb{background:#ECFDF3;border:1.5px solid #0E8F5B;color:#0A5C3C;border-radius:10px;padding:10px 12px;margin:10px 0;font-size:13.5px;line-height:1.7}'+
    '#lsMain details{background:#fff;border:1px solid #E3E8F2;border-radius:12px;padding:10px 12px;margin:10px 0}#lsMain summary{font-weight:800;font-size:15px;color:#0B1F3F;cursor:pointer;display:flex;justify-content:space-between;gap:8px}#lsMain summary span{font-family:var(--sf);font-weight:600;direction:ltr}'+
    '#lsMain .rw{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:10px 4px;border-top:1px solid #EEF1F7;align-items:center;cursor:pointer}#lsMain .rw b{font-family:var(--sf);font-size:18px;font-weight:600;direction:ltr;text-align:end;grid-column:2;grid-row:1/3}#lsMain .rw span{font-size:13px;font-weight:700;color:#0B1F3F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#lsMain .rw small{font-size:11.5px;color:#5C7699}#lsMain .rw.u{border-inline-start:4px solid #F0B429}'+
    '#lsMain .rq{display:grid;grid-template-columns:auto 1fr auto;gap:4px 10px;padding:9px 2px;border-top:1px solid #EEF1F7;align-items:center}#lsMain .rq input{width:22px;height:22px}#lsMain .rq span{font-size:12px;color:#5C7699;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#lsMain .rq b{font-family:var(--sf);font-size:18px;direction:ltr}#lsMain .rq em{font-style:normal;font-size:11.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:#EEF4FF;color:#0B3A8F}#lsMain .rq em.hi{background:#FFF1F2;color:#C8102E}#lsMain .rq.off{opacity:.5}'+
    '#lsMain table{width:100%;border-collapse:collapse;font-size:12.5px}#lsMain th,#lsMain td{border-top:1px solid #EEF1F7;padding:7px 4px;text-align:start}#lsMain th{font-size:11px;color:#5C7699}#lsMain td.n{font-family:"IBM Plex Mono",monospace;direction:ltr;text-align:end;white-space:nowrap}#lsMain .tw{overflow-x:auto}'+
    '#lsMain .mi{display:flex;gap:8px;margin-top:8px}#lsMain .mi input{flex:1;height:44px;border:1.5px solid #C9D6EA;padding:0 10px;font-size:16px;font-weight:700;font-family:"IBM Plex Mono",monospace;min-width:0}#lsMain .mi button{min-width:90px;border:1.5px solid #0B1F3F;background:#fff;color:#0B1F3F;font-weight:700}'+
    '#lsMain .pr .prh{display:flex;justify-content:space-between;align-items:baseline;gap:8px}#lsMain .pr .prh b{font-size:15px}#lsMain .pr .pc{font-size:30px}#lsMain .pg{border-radius:4px;overflow:hidden}#lsMain .pg i{transition:width .3s}'+
    '#lsMain .pg.ind i{width:40%;animation:lsI 1.2s ease-in-out infinite}@keyframes lsI{0%{margin-inline-start:-40%}100%{margin-inline-start:100%}}#lsMain .sg{display:flex;gap:10px;align-items:center;padding:8px 0;font-size:14px;color:#9AA9C0;font-weight:600}#lsMain .sg em{width:26px;height:26px;border-radius:50%;border:2px solid #C9D6EA;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:12px}#lsMain .sg.on{color:#0B1F3F}#lsMain .sg.on em{border-color:#0A56B8;color:#0A56B8;animation:lsP 1s infinite}#lsMain .sg.ok{color:#0E7C52}#lsMain .sg.ok em{background:#0E8F5B;border-color:#0E8F5B;color:#fff}@keyframes lsP{50%{box-shadow:0 0 0 5px rgba(10,86,184,.18)}}'+
    '#lsMain .pr .prh b{display:block;font-size:15px;text-align:center}#lsMain .pr .pc{text-align:center;font-size:40px}#lsMain .ct em{display:block;font-style:normal;font-family:var(--sf);font-size:14px;color:#0B1F3F;margin-top:2px;direction:ltr}'+
    '#lsMain .ct{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}#lsMain .ct span{background:#F4F7FC;border-radius:10px;padding:8px 4px;text-align:center;font-size:11.5px;font-weight:700;color:#5C7699}#lsMain .ct b{display:block;font-family:var(--sf);font-size:21px;color:#0B1F3F}#lsMain .ct .k b{color:#0B2F70}#lsMain .ct .t b{color:#0E8F5B}#lsMain .ct .u b{color:#B07A00}#lsMain .ct .d b{color:#C8102E}'+
    '#lsMain .fh{font-size:12px;font-weight:800;color:#5C7699;margin:4px 0}#lsMain .fd{display:grid;grid-template-columns:44px 1fr auto;gap:8px;align-items:center;padding:7px 0;border-top:1px solid #EEF1F7;animation:up .25s ease}#lsMain .fd i{width:44px;height:44px;border-radius:8px;background:#E3E8F2 center/cover;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:10px;font-weight:800;color:#5C7699}#lsMain .fd span{font-size:13px;font-weight:700;min-width:0;overflow:hidden}#lsMain .fd span small{display:block;font-size:10.5px;color:#9AA9C0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#lsMain .fd b{font-family:var(--sf);font-size:17px;direction:ltr;white-space:nowrap}#lsMain .fd.T b{color:#0E8F5B}#lsMain .fd.u b,#lsMain .fd.u span{color:#B07A00}#lsMain .fd.d{opacity:.55}'+
    '#lsMain .ar{padding:10px 0;border-top:1px solid #EEF1F7}#lsMain .ar b{font-family:"IBM Plex Mono",monospace;font-size:14px}#lsMain .ar small{display:block;font-size:12px;color:#5C7699}#lsMain .ar .rl button{flex:1}'+
    '#lsMain .rv .rw span{white-space:normal;line-height:1.5}#lsMain .tb{display:grid;grid-template-columns:auto auto 1fr;gap:8px;align-items:center;margin:8px 0}#lsMain .tb button{min-height:40px;padding:0 12px;border:1.5px solid #0B1F3F;background:#fff;color:#0B1F3F;font-weight:700;font-size:13px}#lsMain .tb span{font-size:12px;color:#5C7699;text-align:end}'+
    '#lsMain tr.mo{cursor:pointer;font-weight:700}#lsMain tr.mo td:first-child{white-space:nowrap}#lsMain tr.bad td.n:nth-last-child(-n+2){color:#C8102E;font-weight:700}#lsMain tr.dy td{background:#F7FAFF;font-size:12px;padding:5px 4px}#lsMain tr.dy td:first-child{padding-inline-start:14px;color:#5C7699}#lsMain tr.dy.bad td{background:#FFF1F2}#lsMain tr.dy.bad td.n{color:#C8102E}'+
    '#lsMain .hero small,#lsMain .hero i,#lsMain .hero em,#lsMain .hero b{color:#fff}#lsMain .ct em{background:transparent;color:#0B1F3F;padding:0;border:0}#lsMain .ct em:empty{display:none}'+
    '#lsMain .pr{display:block!important;grid-template-columns:none;padding:14px 12px;border-top:0;background:#fff}#lsMain .pr span{cursor:default;font-family:inherit}#lsMain .mt{background:transparent;border:0;margin:0;padding:0}#lsMain .ct{padding:0}#lsMain .ct b{margin:0;font-family:var(--sf)}#lsMain .bt{height:auto;margin-bottom:0}#lsMain .kp{grid-template-columns:1fr 1fr;margin:10px 0}#lsMain .kp div{text-align:start;padding:12px}#lsMain .rw{border:0;border-top:1px solid #EEF1F7;margin:0;background:transparent;display:grid}#lsMain .rw.r{border-inline-start:0}#lsMain .pc{display:block;flex-wrap:nowrap}'+
    '#lsMain details.ly{border-inline-start:5px solid #F0B429}#lsMain details.ly-dupS{border-inline-start-color:#C8102E}#lsMain details.ly-acct{border-inline-start-color:#0A56B8}#lsMain details.ly-noacct{border-inline-start-color:#5C7699}#lsMain details.ly-fail{border-inline-start-color:#B07A00}#lsMain .ly .mt{font-size:12.5px;color:#5C7699;margin:4px 0 8px}#lsMain .rv .ly{background:#fff}'+
    '#suRv .rsn{background:#FFF4D6;color:#5A3E00;font-size:13px;font-weight:600;padding:8px 12px}#suRv .rsn b{font-weight:800}'+
    '#suRv .bd.two img,#suRv .bd.two iframe{height:auto;min-height:40vh}#suRv .bd .sep{background:#F0B429;color:#0B1F3F;font-weight:800;font-size:13px;padding:8px 12px;text-align:center}'+
    '#lsMain .hero.na{background:linear-gradient(135deg,#3A4A63,#5C7699)}#lsMain .hero .cv{height:6px;background:rgba(255,255,255,.22);border-radius:3px;margin:10px 0 4px;overflow:hidden}#lsMain .hero .cv span{display:block;height:100%;background:#F0B429}#lsMain .hero em{display:block;font-style:normal;font-size:12px;opacity:.9}'+
    '#lsMain .rv{background:#FFFBEB;border:1.5px solid #F0B429;border-radius:12px;padding:12px;margin:10px 0}#lsMain .rvh b{display:block;font-size:16px;color:#7A4E00}#lsMain .rvh small{display:block;font-size:12.5px;color:#7A5B1F;line-height:1.6;margin-top:2px}#lsMain .rvb{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 4px}#lsMain .rvb button,#lsMain .qa button{min-height:42px;border:1.5px solid #0B1F3F;background:#fff;color:#0B1F3F;font-weight:700;font-size:12.5px;padding:0 6px}#lsMain .rvb button.d,#lsMain .qa button.d{color:#C8102E;border-color:#C8102E}'+
    '#lsMain .rw{grid-template-columns:48px 1fr auto!important}#lsMain .rw .th{grid-row:1/3;grid-column:1;width:48px;height:48px;border-radius:8px;background:#E3E8F2 center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:10px;font-weight:800;color:#5C7699}#lsMain .rw span{grid-column:2}#lsMain .rw small{grid-column:2}#lsMain .rw b{grid-column:3!important}#lsMain .rw .qa{grid-column:1/4;display:grid;grid-template-columns:1fr 1fr .8fr;gap:6px;margin-top:6px}#lsMain .rv .rw{background:#fff;border-radius:10px;margin-top:6px;border:1px solid #F3E2B3}#lsMain .rw.u span{color:#8A6100}#lsMain h3.sh{font-family:"Newsreader","IBM Plex Sans Arabic",serif;font-size:18px;margin:16px 0 4px;color:#0B1F3F}'+
    '#suRv{position:fixed;inset:0;z-index:99991;background:#0A1220;display:none;flex-direction:column}#suRv.on{display:flex}#suRv header{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 8px;color:#fff}#suRv header div{flex:1;min-width:0}#suRv header b{display:block;font-size:14.5px}#suRv header small{display:block;font-size:11.5px;opacity:.8}#suRv header button{height:42px;padding:0 16px;border:0;background:#fff;color:#0B2F70;font-weight:700;min-width:92px}'+
    '#suRv .et{background:#fff;padding:8px 12px 4px}#suRv .de{display:grid;grid-template-columns:1.4fr 1fr;gap:8px;margin-bottom:6px}#suRv .de small{display:block;font-size:11px;font-weight:700;color:#5C7699;margin-bottom:3px}#suRv .de input,#suRv .de select{width:100%;height:44px;border:1.5px solid #C9D6EA;padding:0 10px;font-size:16px;font-weight:700;background:#fff;color:#0B1F3F;font-family:inherit}'+
    '#suRv .bd{flex:1;overflow:auto}#suRv .bd img{width:100%;display:block}#suRv .bd iframe{width:100%;height:100%;border:0;background:#fff}#suRv footer{background:#fff;padding:8px 12px calc(10px + env(safe-area-inset-bottom));display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}#suRv footer button{min-height:46px;border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;font-weight:700;font-size:13.5px}#suRv footer button.ok{background:#0B2F70;color:#fff}#suRv footer button.dl{color:#C8102E;border-color:#C8102E}';
    document.head.appendChild(s);}
  function LBLf(k){return {d:'مكررة — محسوبة مرة واحدة',mK:fiatName()+' دفعتُها للمورد',sT:'USDT استلمتُها من المورد',sK:fiatName()+' أرسلها المورد لي',mT:'USDT أرسلتُها للمورد',u:'تحتاج مراجعة',o:'عملات أخرى — خارج الحساب',x:'مستبعدة'}[k];}
  function rowHtml(it){var p=it.p||{},v=amt(p.amount),c=it.cc||ccyOf(p),u=it.k==='u';
    return '<div class="rw'+(u?' u':'')+'" data-si="'+it.i+'"><i class="th" data-th="'+it.i+'">'+(it.pdf?'PDF':'')+'</i><span>'+esc(u?it.why:it.k==='d'?'مكرر ('+({fp:'الصورة نفسها',ref:'رقم العملية نفسه',ref8:'رقم العملية نفسه',time:'الوقت والمبلغ نفسهما',img:'صورة متطابقة',man:'بقرارك'}[it.d&&it.d.how]||'')+') من '+(it.d&&it.d.of||'').slice(-18):it.k==='x'&&failed(p)?'عملية فاشلة/ملغاة — '+String(p.bank||'').slice(0,16):((p.bank||'').slice(0,26)||'إيصال'))+'</span><b>'+(v?fm(v):'—')+' <small>'+(c==='؟'?'':c)+'</small></b><small>'+day(it.ts)+(it.who?' · '+esc(it.who):'')+(refOf(p)?' · '+esc(refOf(p).slice(-12)):'')+(ptime(p)?' · <span dir="ltr">'+esc(String(p.date).slice(0,19))+'</span>':'')+(it.rt?' · سعر '+fm(it.rt):'')+(u&&p.bank?' · '+esc(String(p.bank).slice(0,18)):'')+'</small>'+
      (it.k==='d'?'<div class="qa"><button type="button" data-sa="nd" data-i="'+it.i+'">ليس مكررًا — احسبه</button></div>':'')+(u?qaHtml(it):'')+'</div>';}
  function qaHtml(it){var i=it.i;
    if(it.lay==='dupS')return '<div class="qa"><button type="button" class="d" data-sa="dupy" data-i="'+i+'">مكرر — احذفه</button><button type="button" data-sa="nd" data-i="'+i+'">إيصالان مختلفان</button><button type="button" data-sa="cmp" data-i="'+i+'">قارن</button></div>';
    if(it.lay==='acct'||it.lay==='noacct'){var ks=acctKeys(it.p);return '<div class="qa">'+(ks.length?'<button type="button" data-sa="acok" data-i="'+i+'">حساب المورد ✓</button>':'<button type="button" data-sa="as" data-i="'+i+'" data-c="'+FIAT+'" data-w="m">احسبه كدفعة للمورد</button>')+(ks.length?'<button type="button" class="d" data-sa="acno" data-i="'+i+'">ليس حسابه</button>':'')+'<button type="button" class="d" data-sa="exc" data-i="'+i+'">استبعاد</button></div>';}
    return '<div class="qa"><button type="button" data-sa="as" data-i="'+i+'" data-c="'+FIAT+'" data-w="m">'+fiatName()+' · منّي</button><button type="button" data-sa="as" data-i="'+i+'" data-c="USDT" data-w="s">USDT · منه</button><button type="button" class="d" data-sa="exc" data-i="'+i+'">استبعاد</button></div>';}
  function colHtml(K,k,open){var a=K.col[k];if(!a.length)return '';var s=K.sum[k];
    var lim=U.open[k]?a.length:Math.min(a.length,30);
    return '<details'+(open||U.open['d'+k]?' open':'')+' data-dk="'+k+'"><summary>'+LBLf(k)+' ('+a.length+')'+(s!=null?'<span>'+fm(s)+'</span>':'')+'</summary>'+a.slice(0,lim).map(rowHtml).join('')+(a.length>lim?'<button type="button" class="bt l" data-sa="more" data-k="'+k+'">عرض الكل ('+a.length+')</button>':'')+'</details>';}
  function paint(){var m=$('lsMain');if(!m)return;css();var c=U.c,R=U.run,S=U.res,x='';
    if(R){var pc=R.n?Math.round(R.d/R.n*100):100,el=(Date.now()-R.t0)/1000,left=R.d?Math.round(el/R.d*(R.n-R.d)/60):0,N=R.cnt;
      var SM=R.sum||{K:0,T:0};
      m.innerHTML='<div class="box pr"><div class="prh"><b>'+esc(R.t)+'</b></div><div class="pc">'+pc+'%</div><div class="pg"><i style="width:'+pc+'%"></i></div>'+
        '<div class="mt">'+R.d+' من '+R.n+' إيصال'+(R.d&&R.d<R.n?' · الباقي نحو '+Math.max(1,left)+' د':'')+'</div>'+
        '<div class="ct"><span class="k"><b>'+N.K+'</b>'+fiatName()+'<em>'+fk(SM.K)+'</em></span><span class="t"><b>'+N.T+'</b>USDT<em>'+fm(SM.T)+'</em></span><span class="u"><b>'+N.u+'</b>مراجعة</span><span class="d"><b>'+N.d+(N.o?'+'+N.o:'')+'</b>مكرر / أخرى</span></div>'+
        '<button type="button" class="bt l" data-sa="stop">إيقاف</button></div>';return;}
    if(S)return paintRes(m);
    x='<div class="box"><h3>تدقيق المورد</h3><div class="mt">ارفع محادثة واتساب مع مورد USDT (تصدير «مع الوسائط»). يُستخرج من الرسائل سعر البيع ومتوسطه، ومن الإيصالات: كم كوانزا دفعتَ، وكم USDT استلمتَ، وما أرسله المورد لك — ثم الفرق بين الطرفين.</div>';
    if(c&&c.busy){var stg=['فتح الملف وفك الضغط ('+(c.mb||0)+' MB)','قراءة نص المحادثة','فهرسة الصور والمرسلين'];
      x+='<div class="pg ind"><i></i></div>'+stg.map(function(t,i){var n=i+1,st=n<c.st?'ok':n===c.st?'on':'';return '<div class="sg '+st+'"><em>'+(st==='ok'?'✓':n)+'</em>'+t+(n===3&&c.nmsg!=null?' · '+c.nmsg+' رسالة':'')+'</div>';}).join('');}
    else if(!c)x+='<button type="button" class="bt" data-sa="pick">رفع محادثة المورد (ZIP)</button>';
    else{var nIn=c.list.filter(function(q){return inPer(q.ts,c);}).length,nM=c.msgs.filter(function(q){return inPer(q.ts,c);}).length;
      x+='<div class="ln"><span>المحادثة</span><b>'+esc(c.name)+'</b></div><div class="ln"><span>إيصالات في الفترة</span><b>'+nIn+'</b></div><div class="ln"><span>رسائل نصية في الفترة</span><b>'+nM+'</b></div>'+
        '<div class="mt" style="margin-top:10px;font-weight:700">من هو المورد؟'+(c.guess?' — لم أتعرف عليه من اسم الملف، حدّده':'')+'</div>'+
        c.names.slice(0,6).map(function(n){var r=c.roles[n];return '<div class="rl"><span style="flex:1;font-weight:700;align-self:center;font-size:13.5px">'+esc(n)+'</span><button type="button" data-sa="role" data-n="'+esc(n)+'" data-r="m" class="'+(r==='m'?'on':'')+'">أنا</button><button type="button" data-sa="role" data-n="'+esc(n)+'" data-r="s" class="s '+(r==='s'?'on':'')+'">المورد</button></div>';}).join('')+
        '<div class="mt" style="margin-top:10px;font-weight:700">الفترة</div><div class="rl">'+[['all','كل المحادثة'],['y','آخر 12 شهرًا'],['q','آخر 3 أشهر'],['m','هذا الشهر']].map(function(o){return '<button type="button" data-sa="per" data-p="'+o[0]+'" class="'+(c.pk===o[0]||(!c.pk&&o[0]==='all')?'on':'')+'">'+o[1]+'</button>';}).join('')+'</div>'+
        '<div class="dt"><label><small>من</small><input type="date" id="lsFrom" value="'+h.iso(c.from)+'"></label><label><small>إلى</small><input type="date" id="lsTo" value="'+h.iso(c.to)+'"></label></div>'+
        '<button type="button" class="bt" data-sa="go"'+(nIn||nM?'':' disabled')+'>ابدأ التدقيق</button><button type="button" class="bt l" data-sa="reset">ملف آخر</button>';}
    m.innerHTML=x+'</div>';}
  function paintRes(m){var S=U.res,K=calc(),st=K.st,x='',sign=K.diff>=0;
    x+='<div class="tb"><button type="button" data-sa="rf">تحديث الصفحة</button><button type="button" data-sa="rk">فحص الجلسة كاملة</button><span>'+S.its.length+' إيصال · '+esc(S.per)+'</span></div>';
    if(K.st.avg<=0)x+='<div class="wr"><b>لا سعر معتمد.</b> لم أجد أسعارًا في الرسائل ضمن المدى '+CFG.min+'–'+CFG.max+'. اكتب السعر يدويًا في قسم الأسعار أدناه.</div>';
    var dUsd=K.avg?K.diff/K.avg:0,small=Math.abs(K.diff)<Math.max(1000,K.netK*0.002),noT=!K.sum.sT&&!K.sum.mT,nU=K.col.u.length,tot=S.its.length,cnt=tot-nU-K.col.x.length-K.col.o.length-K.col.d.length;
    x+='<div class="hero '+(noT?'na':small?'ok':sign?'':'neg')+'"><small>'+(noT?'النتيجة غير صالحة بعد':small?'الحساب متوازن تقريبًا':sign?'لك عند المورد':'عليك للمورد')+' — '+esc(S.name)+'</small><b>'+fk(Math.abs(K.diff))+' '+fiatSym()+'</b><i>≈ '+fm(Math.abs(dUsd))+' USDT بمتوسط '+fm(K.avg)+' · '+esc(S.per)+'</i>'+
      '<div class="cv"><span style="width:'+(tot?Math.round(cnt/tot*100):0)+'%"></span></div><em>محسوب '+cnt+' من '+tot+' إيصال'+(K.col.d.length?' · '+K.col.d.length+' مكرر':'')+(K.col.x.length?' · '+K.col.x.length+' مستبعد':'')+(K.col.o.length?' · '+K.col.o.length+' عملة أخرى':'')+(nU?' · '+nU+' في المراجعة — النتيجة مبدئية':'')+'</em></div>';
    if(noT&&K.sum.mK)x+='<div class="wr"><b>لم يُحتسب أي إيصال USDT.</b> بدون استلامات USDT يكون الفرق كل ما دفعتَه — افتح صندوق المراجعة: إيصالات Binance غالبًا هناك. اضغط «إعادة قراءة المراجعة» أو ارفع كل واحد بزر «USDT · منه».</div>';
    if(nU){x+='<div class="rv"><div class="rvh"><b>المراجعة ('+nU+')</b><small>خارج الحساب حتى تبتّ فيه. كل طبقة لها سببها وأزرارها.</small></div>';
      var ORDL=['dupS','acct','noacct','fail','read'],DESC={dupS:'إيصالان بالمبلغ نفسه قريبان زمنيًا بلا رقم عملية يفصل بينهما. قارنهما ثم احكم.',acct:'المستفيد في هذا الإيصال ليس من حسابات المورد المعروفة. إن كان حسابه فثبّته مرة واحدة ويُقبل في كل مرة.',noacct:'لم يُقرأ المستفيد. افتح الإيصال وتأكد أنه للمورد ثم احسبه.',fail:'القارئ رأى كلمة فشل/إلغاء. تحقق من الصورة.',read:'حاسبات ولقطات وصور بلا مبلغ أو عملة.'};
      ORDL.forEach(function(ly){var a=K.lays[ly];if(!a.length)return;var lim=U.open['L'+ly]?a.length:Math.min(a.length,15),sm=0;a.forEach(function(it){sm+=amt(it.p.amount);});
        x+='<details class="ly ly-'+ly+'"'+(U.open['dL'+ly]?' open':'')+' data-dk="L'+ly+'"><summary>'+LAY[ly]+' ('+a.length+')<span>'+(sm?fm(sm):'')+'</span></summary><div class="mt">'+DESC[ly]+'</div>'+
          (ly==='noacct'?'<div class="rvb"><button type="button" data-sa="noacok">اعتماد الكل كدفعات للمورد</button><button type="button" data-sa="rr">إعادة القراءة</button></div>':ly==='read'?'<div class="rvb"><button type="button" data-sa="rr">إعادة قراءة</button><button type="button" class="d" data-sa="exall">استبعاد كل غير الإيصالات</button></div>':ly==='dupS'?'<div class="rvb"><button type="button" class="d" data-sa="dupall">اعتبر الكل مكررًا</button><button type="button" data-sa="ndall">الكل إيصالات مختلفة</button></div>':'')+
          a.slice(0,lim).map(rowHtml).join('')+(a.length>lim?'<button type="button" class="bt l" data-sa="more" data-k="L'+ly+'">عرض الكل ('+a.length+')</button>':'')+'</details>';});
      x+='</div>';}
    /* حسابات المورد المعروفة */
    var KA=K.KA,AK=Object.keys(KA.cnt).sort(function(a,b){return KA.cnt[b]-KA.cnt[a];});
    if(AK.length)x+='<details class="ad"'+(U.open.dAK?' open':'')+' data-dk="AK"><summary>حسابات المورد المعروفة ('+AK.filter(function(k){return KA.KN[k]===1;}).length+' من '+AK.length+')</summary><div class="mt">تُتعلَّم من إيصالات الدفع: كل حساب تكرر ثلاث مرات فأكثر يُقبل تلقائيًا، وما ثبّته أو رفضته يُحفظ لهذا المورد على جهازك ويُطبّق في الملفات القادمة.</div>'+
      AK.slice(0,40).map(function(k){var st=KA.KN[k];return '<div class="ar"><div><b>'+esc(KA.lab[k])+'</b><small>'+KA.cnt[k]+' إيصال · '+(k.charAt(0)==='a'?'رقم حساب':'اسم')+'</small></div><div class="rl"><button type="button" data-sa="akok" data-k="'+esc(k)+'" class="s '+(st===1?'on':'')+'">حسابه ✓</button><button type="button" data-sa="akno" data-k="'+esc(k)+'" class="'+(st===-1?'on':'')+'">ليس له</button></div></div>';}).join('')+'</details>';
    x+='<div class="kp"><div data-sa="go2" data-k="mK"><small>'+fiatName()+' دفعتُها</small><b>'+fk(K.sum.mK)+'</b><i>'+K.col.mK.length+' إيصال</i></div><div class="t" data-sa="go2" data-k="sT"><small>USDT استلمتُها</small><b>'+fm(K.sum.sT)+'</b><i>'+K.col.sT.length+' إيصال'+(K.sum.mT?' · أرسلتُ '+fm(K.sum.mT):'')+'</i></div>'+
      '<div class="r" data-sa="go2" data-k="sK"><small>'+fiatName()+' أرسلها لي (تُخصم)</small><b>'+fk(K.sum.sK)+'</b><i>'+K.col.sK.length+' إيصال</i></div><div class="a" data-sa="go2" data-k="rt"><small>متوسط سعر البيع</small><b>'+fm(K.avg)+'</b><i>'+(st.man?'سعر يدوي':st.n+' سعرًا · '+fm(st.min)+'–'+fm(st.max))+'</i></div></div>';
    x+='<div class="box"><h3>الحساب</h3>'+
      '<div class="ln"><span>'+fiatName()+' دفعتُها للمورد</span><b>'+fk(K.sum.mK)+'</b></div>'+
      (K.sum.sK?'<div class="ln"><span>− '+fiatName()+' أرسلها المورد لي</span><b>'+fk(K.sum.sK)+'</b></div>':'')+
      '<div class="ln"><span>= صافي '+fiatName()+' المدفوعة</span><b>'+fk(K.netK)+'</b></div>'+
      '<div class="ln"><span>USDT استلمتُها'+(K.sum.mT?' − USDT أرسلتُها له':'')+'</span><b>'+fm(K.netT)+'</b></div>'+
      '<div class="ln"><span>× متوسط السعر'+(st.man?' (يدوي)':CFG.avg==='med'?' (الوسيط)':' (المتوسط)')+'</span><b>'+fm(K.avg)+'</b></div>'+
      '<div class="ln"><span>= قيمة USDT المستلمة بـ'+fiatName()+'</span><b>'+fk(K.val)+'</b></div>'+
      '<div class="ln tt"><span>الفرق<small>'+(sign?'دفعتَ أكثر مما استلمت — لك':'استلمتَ أكثر مما دفعت — عليك')+'</small></span><b class="'+(sign?'':'neg')+'" style="color:'+(sign?'#0B7A3B':'#C8102E')+'">'+(sign?'+':'−')+fk(Math.abs(K.diff))+'</b></div></div>';
    /* التحقق من الفارق الكبير */
    if(K.impl){var big=Math.abs(K.dev)>CFG.tol;x+='<div class="'+(big?'wr':'okb')+'"><b>السعر الفعلي للحساب: '+fm(K.impl)+'</b> Kz لكل USDT (صافي الكوانزا ÷ صافي USDT) مقابل متوسط الأسعار المذكورة '+fm(K.avg)+' — الفارق '+(K.dev>0?'+':'')+fm(K.dev,2)+'%. '+(big?'<b>فارق كبير</b> — راجِع الإيصالات الناقصة أو المكررة أو الأسعار المستبعدة.':'ضمن الحد المقبول ('+CFG.tol+'%).')+'</div>';}
    if(K.col.sT.length&&st.n&&!st.man){var da=K.atDiff;x+='<div class="box"><h3>مقارنة: بسعر كل استلام</h3><div class="mt">كل إيصال USDT يُسعَّر بآخر سعر ذُكر في المحادثة قبله (حتى 7 أيام)، وإلا بالمتوسط. أدق من المتوسط السنوي إن تغيّر السعر كثيرًا.</div>'+
      '<div class="ln"><span>السعر المرجح بكميات الاستلام</span><b>'+fm(K.wavg)+'</b></div><div class="ln"><span>قيمة USDT بسعر وقتها</span><b>'+fk(K.atVal)+'</b></div><div class="ln tt"><span>الفرق بهذه الطريقة</span><b style="color:'+(da>=0?'#0B7A3B':'#C8102E')+'">'+(da>=0?'+':'−')+fk(Math.abs(da))+'</b></div><div class="ln"><span>الفرق بين الطريقتين</span><b>'+fk(Math.abs(K.atVal-K.val))+'</b></div></div>';}
    /* الأعمدة */
    x+='<h3 class="sh">الإيصالات المحسوبة</h3>'+colHtml(K,'mK')+colHtml(K,'sT')+colHtml(K,'sK',true)+colHtml(K,'mT',true)+colHtml(K,'o')+colHtml(K,'d')+colHtml(K,'x');
    /* 1450: عناوين محفظة USDT — العنوان يحدد الاتجاه */
    var AD={};K.col.sT.concat(K.col.mT).forEach(function(it){var a=addrOf(it.p)||'—';var o=AD[a]||(AD[a]={a:a,n:0,s:0});o.n++;o.s+=amt(it.p.amount);});
    var AL=Object.keys(AD).map(function(k){return AD[k];}).sort(function(a,b){return b.s-a.s;});
    if(AL.length)x+='<details class="ad" open><summary>اتجاه إيصالات USDT ('+AL.length+' عنوان)</summary><div class="mt">إيصال سحب Binance يظهر فيه عنوان المحفظة المستلِمة. حدّد كل عنوان: عنوانك = استلمتَ USDT من المورد، عنوانه = أرسلتَ له.</div>'+
      AL.map(function(o){var mm=(S.addr||{})[o.a],st=o.a==='—'||!mm?(S.tdef||'s'):(mm==='his'?'m':'s');return '<div class="ar"><div><b dir="ltr">'+(o.a==='—'?'بلا عنوان مقروء':esc(shortA(o.a)))+'</b><small>'+o.n+' إيصال · '+fm(o.s)+' USDT</small></div><div class="rl"><button type="button" data-sa="adr" data-a="'+esc(o.a)+'" data-v="mine" class="s '+(st==='s'?'on':'')+'">عنواني · استلام</button><button type="button" data-sa="adr" data-a="'+esc(o.a)+'" data-v="his" class="'+(st==='m'?'on':'')+'">عنوانه · دفع</button></div></div>';}).join('')+'</details>';
    /* الأسعار */
    var on=S.rates.filter(function(r){return r.on;}).length,ex=S.rates.length-on;
    x+='<details id="lsRates"'+(U.showR?' open':'')+'><summary>أسعار البيع من المحادثة ('+on+(ex?' · '+ex+' مستبعد':'')+')<span>'+fm(K.avg)+'</span></summary>'+
      '<div class="ln"><span>المتوسط</span><b>'+fm(st.mean)+'</b></div><div class="ln"><span>الوسيط</span><b>'+fm(st.med)+'</b></div><div class="ln"><span>المدى</span><b>'+fm(st.min)+' – '+fm(st.max)+'</b></div>'+(st.sd?'<div class="ln"><span>التذبذب (انحراف معياري)</span><b>'+fm(st.sd)+'</b></div>':'')+
      '<div class="rl">'+[['mean','المتوسط'],['med','الوسيط']].map(function(o){return '<button type="button" data-sa="avg" data-v="'+o[0]+'" class="'+(!CFG.man&&CFG.avg===o[0]?'on':'')+'">اعتمد '+o[1]+'</button>';}).join('')+'</div>'+
      '<div class="mi"><input id="lsMan" inputmode="decimal" placeholder="أو سعر يدوي" value="'+(CFG.man||'')+'"><button type="button" data-sa="man">'+(CFG.man?'تحديث':'اعتماد')+'</button></div>'+(CFG.man?'<button type="button" class="bt l" data-sa="unman">إلغاء السعر اليدوي</button>':'')+
      '<div class="mt" style="margin-top:8px">ألغِ تحديد أي رقم ليس سعرًا. الأحمر يبتعد أكثر من 5% عن الوسيط.</div>'+
      S.rates.map(function(r,i){var hi=r.dev!=null&&Math.abs(r.dev)>5;return '<label class="rq'+(r.on?'':' off')+'"><input type="checkbox" data-ri="'+i+'"'+(r.on?' checked':'')+'><span>'+day(r.ts)+' · '+esc(r.who||'')+'<br>'+esc(r.t)+'</span><div style="text-align:end"><b>'+fm(r.v)+'</b><br>'+(r.dev!=null?'<em class="'+(hi?'hi':'')+'">'+(r.dev>0?'+':'')+fm(r.dev,1)+'%</em>':'')+'</div></label>';}).join('')+'</details>';
    /* حسب الشهر */
    /* فحص المراجع */
    var AU=K.audit;x+='<div class="'+(AU.dup.length?'wr':'okb')+'"><b>فحص المراجع:</b> '+AU.total+' إيصال محسوب بمرجع، '+AU.unique+' مرجع فريد'+(AU.dup.length?' — <b>'+AU.dup.length+' مرجع مكرر داخل الحساب</b> (يُخصم تلقائيًا أدناه)':' — لا مرجع مكرر في الحساب ✓')+(AU.dcol?' · '+AU.dcol+' نسخة مكررة أُبعدت':'')+(AU.noRef.length?' · <button type="button" class="lk" data-sa="go2" data-k="nr">'+AU.noRef.length+' بلا مرجع مقروء</button>':'')+(Object.keys(ADDRS).length?' · '+Object.keys(ADDRS).length+' عنوان محفظة معروف (لا يُعد مرجعًا)':'')+'</div>';
    if(AU.dup.length)x+='<details class="ly ly-dupS" open><summary>مراجع مكررة داخل الحساب ('+AU.dup.length+')</summary><div class="mt">المرجع نفسه قُرئ على إيصالين محسوبين بمبلغين مختلفين (قراءة خاطئة لأحدهما أو مبلغ مختلف). افتح الاثنين وصحّح أو احذف أحدهما.</div>'+AU.dup.map(function(g){return '<div class="mt" style="font-weight:800;color:#0B1F3F;direction:ltr;text-align:end;margin-top:8px">'+esc(g.ref.slice(-14))+'</div>'+g.its.map(function(it){return rowHtml(it)+'<div class="qa"><button type="button" class="d" data-sa="dupy0" data-i="'+it.i+'">مكرر — احذف هذا</button><button type="button" data-sa="cmp0" data-i="'+it.i+'" data-j="'+(g.its[0]===it?g.its[1].i:g.its[0].i)+'">قارن</button></div>';}).join('');}).join('')+'</details>';
    if(AU.noRef.length)x+='<details data-dk="nr"'+(U.open.dnr?' open':'')+'><summary>محسوبة بلا مرجع مقروء ('+AU.noRef.length+')<span>'+fm(AU.noRef.reduce(function(a,it){return a+amt(it.p.amount);},0))+'</span></summary><div class="mt">هذه لا يمكن التحقق من تكرارها بالمرجع، فحُقّقت بالصورة والمبلغ واليوم فقط. افتحها واكتب المرجع إن ظهر.</div>'+AU.noRef.slice(0,U.open.nr?999:20).map(rowHtml).join('')+(AU.noRef.length>20&&!U.open.nr?'<button type="button" class="bt l" data-sa="more" data-k="nr">عرض الكل</button>':'')+'</details>';
    /* حسب الشهر → الأيام */
    if(K.months.length>1){var bigD=0;K.months.forEach(function(o){o.dl.forEach(function(q){if(q.impl&&Math.abs(q.dev)>CFG.tol)bigD++;});});
      x+='<details data-dk="MO"'+(U.open.dMO?' open':'')+'><summary>حسب الشهر واليوم ('+K.months.length+')<span>'+(bigD?bigD+' يوم بفارق كبير':'')+'</span></summary><div class="mt">اضغط على الشهر لعرض أيامه. الأحمر = فارق يتجاوز '+CFG.tol+'% بين السعر الفعلي والمتوسط.</div><div class="tw"><table><tr><th>الشهر</th><th>'+fiatName()+' صافي</th><th>USDT</th><th>متوسط</th><th>الفعلي</th><th>الفارق</th></tr>'+
      K.months.map(function(o){var bad=o.impl&&Math.abs(o.dev)>CFG.tol,op=U.open['m'+o.m];return '<tr class="mo'+(bad?' bad':'')+'" data-mo="'+o.m+'"><td>'+(op?'▾ ':'▸ ')+o.m+'</td><td class="n">'+fk(o.net)+'</td><td class="n">'+fm(o.usd)+'</td><td class="n">'+(o.avg?fm(o.avg):'—')+'</td><td class="n">'+(o.impl?fm(o.impl):'—')+'</td><td class="n">'+(o.impl?(o.dev>0?'+':'')+fm(o.dev,1)+'%':'—')+'</td></tr>'+
        (op?o.dl.map(function(q){var bd=q.impl&&Math.abs(q.dev)>CFG.tol;return '<tr class="dy'+(bd?' bad':'')+'"><td>'+q.d.slice(5)+' <small>('+q.n+')</small></td><td class="n">'+fk(q.net)+'</td><td class="n">'+fm(q.usd)+'</td><td class="n">'+(q.avg?fm(q.avg):'—')+'</td><td class="n">'+(q.impl?fm(q.impl):'—')+'</td><td class="n">'+(q.impl?(q.dev>0?'+':'')+fm(q.dev,1)+'%':'—')+'</td></tr>';}).join(''):'');}).join('')+'</table></div></details>';}
    /* الأدوار */
    x+='<details><summary>المرسلون في المحادثة</summary>'+Object.keys(S.roles).map(function(n){var r=S.roles[n];return '<div class="rl"><span style="flex:1;font-weight:700;align-self:center;font-size:13.5px">'+esc(n)+'</span><button type="button" data-sa="role2" data-n="'+esc(n)+'" data-r="m" class="'+(r==='m'?'on':'')+'">أنا</button><button type="button" data-sa="role2" data-n="'+esc(n)+'" data-r="s" class="s '+(r==='s'?'on':'')+'">المورد</button></div>';}).join('')+'</details>';
    x+='<div class="mt">'+S.its.length+' إيصال مقروء'+(S.dup?' · '+S.dup+' مكرر حُسب مرة واحدة':'')+(S.stopped?' · <b style="color:#C8102E">أُوقفت القراءة قبل الاكتمال</b>':'')+(S.restored?' · جلسة محفوظة على الجهاز':'')+'</div>';
    x+='<button type="button" class="bt g" data-sa="share">مشاركة التقرير (واتساب)</button><button type="button" class="bt l" data-sa="copy">نسخ التقرير</button><button type="button" class="bt l" data-sa="end">إنهاء الجلسة</button>';
    m.innerHTML=x;setTimeout(thumbs,30);}
  function repText(){var S=U.res,K=calc(),st=K.st,L2=['BDL · تدقيق المورد — '+S.name,'الفترة: '+S.per,'',
      'كوانزا دفعتُها: '+fk(K.sum.mK)+' Kz ('+K.col.mK.length+' إيصال)'];
    if(K.sum.sK)L2.push('كوانزا أرسلها لي (تُخصم): '+fk(K.sum.sK)+' Kz ('+K.col.sK.length+')');
    L2.push('صافي الكوانزا: '+fk(K.netK)+' Kz','USDT استلمتُها: '+fm(K.sum.sT)+' ('+K.col.sT.length+' إيصال)');if(K.sum.mT)L2.push('USDT أرسلتُها له: '+fm(K.sum.mT));
    L2.push('متوسط سعر البيع: '+fm(K.avg)+(st.man?' (يدوي)':' ('+st.n+' سعرًا، '+fm(st.min)+'–'+fm(st.max)+')'),'قيمة USDT بالكوانزا: '+fk(K.val)+' Kz','',
      (K.diff>=0?'لي عند المورد: ':'عليّ للمورد: ')+fk(Math.abs(K.diff))+' Kz ≈ '+fm(Math.abs(K.avg?K.diff/K.avg:0))+' USDT');
    if(K.impl)L2.push('السعر الفعلي: '+fm(K.impl)+' (فارق '+fm(K.dev,2)+'% عن المتوسط)');
    if(K.col.sT.length&&st.n&&!st.man)L2.push('بسعر كل استلام: '+(K.atDiff>=0?'لي ':'عليّ ')+fk(Math.abs(K.atDiff))+' Kz (سعر مرجح '+fm(K.wavg)+')');
    if(K.col.u.length||K.col.d.length)L2.push('','خارج الحساب: '+(K.col.u.length?K.col.u.length+' في المراجعة':'')+(K.col.u.length&&K.col.d.length?' · ':'')+(K.col.d.length?K.col.d.length+' مكرر':''));
    if(K.months.length>1){L2.push('','حسب الشهر (كوانزا صافي | USDT | السعر الفعلي):');K.months.forEach(function(o){L2.push(o.m+': '+fk(o.net)+' | '+fm(o.usd)+' | '+(o.impl?fm(o.impl):'—'));});}
    L2.push('','BDL · lbdal.com — تقرير من الإيصالات والمحادثة، لا يُعدّ قيدًا في أي تسوية.');return L2.join('\n');}

  /* ── عارض الإيصال وتعديله ── */
  async function view(i,j){var S=U.res,it=S&&S.its[i];if(!it)return;var jt=j>=0?S.its[j]:null;if(jt&&!jt.file&&jt._si>=0)jt.file=await h.sess.file(KEY,jt._si,jt.nm,jt.pdf);if(jt&&jt.file&&!jt._u)jt._u=URL.createObjectURL(jt.file);if(U.v==null){U.y=window.scrollY;try{history.pushState({suRv:1},'');U.hist=1;}catch(e){}}U.v=i;var v=$('suRv');if(!v){v=document.createElement('div');v.id='suRv';document.body.appendChild(v);}
    if(!it.file&&it._si>=0)it.file=await h.sess.file(KEY,it._si,it.nm,it.pdf);if(it._u)URL.revokeObjectURL(it._u);it._u=it.file?URL.createObjectURL(it.file):'';
    var p=it.p||{},c=it.cc||ccyOf(p),own=it.who?S.roles[it.who]:(c==='USDT'?'s':'m'),wv=it.ow||own;
    var HOW={reftime:'رقم العملية نفسه بوقتين مطبوعين مختلفين',img:'صورتان متشابهتان بالمبلغ نفسه',amt:'المبلغ نفسه في اليوم نفسه بلا رقم عملية ولا وقت مطبوع',fp:'الصورة نفسها بالبايت',ref:'رقم العملية نفسه',ref8:'آخر 8 خانات من رقم العملية نفسها',time:'الوقت المطبوع والمبلغ نفسهما',man:'بقرارك'};
    var rs0=it.ds||it.d,why=rs0?'<div class="rsn">سبب '+(it.d?'التكرار':'الاشتباه')+': <b>'+(HOW[rs0.how]||rs0.how)+'</b>'+(rs0.key?' · <span dir="ltr">'+esc(String(rs0.key).slice(-24))+'</span>':'')+'</div>':'';
    v.innerHTML='<header><div><b>'+esc(p.bank||it.nm)+'</b><small>'+day(it.ts)+(it.who?' · '+esc(it.who):'')+(refOf(p)?' · '+esc(refOf(p)):'')+(ptime(p)?' · <span dir="ltr">'+esc(String(p.date).slice(0,19))+'</span>':'')+'</small></div><button type="button" data-sv="x">✕ إغلاق</button></header>'+why+
      '<div class="et"><div class="de"><label><small>المبلغ</small><input id="lsA" inputmode="decimal" value="'+(amt(p.amount)||'')+'"></label><label><small>العملة</small><select id="lsC">'+['AOA','USDT','MRU','USD','EUR','؟'].map(function(o){return '<option'+(o===c?' selected':'')+'>'+o+'</option>';}).join('')+'</select></label>'+
      '<label style="grid-column:1/3"><small>من أرسل هذا الإيصال؟</small><select id="lsW"><option value="m"'+(wv==='m'?' selected':'')+'>أنا ← للمورد</option><option value="s"'+(wv==='s'?' selected':'')+'>المورد ← لي</option></select></label></div></div>'+
      '<div class="bd'+(jt?' two':'')+'">'+(!it._u?'<p style="color:#9FB0CC;padding:30px 16px;text-align:center">الصورة غير محفوظة على الجهاز.</p>':it.pdf?'<iframe src="'+it._u+'"></iframe>':'<img src="'+it._u+'" alt="">')+(jt?'<div class="sep">الإيصال الآخر · '+day(jt.ts)+(refOf(jt.p)?' · '+esc(refOf(jt.p).slice(-12)):'')+(ptime(jt.p)?' · '+esc(String(jt.p.date).slice(0,19)):'')+' · '+fm(amt(jt.p.amount))+' '+ccyOf(jt.p)+'</div>'+(jt._u?(jt.pdf?'<iframe src="'+jt._u+'"></iframe>':'<img src="'+jt._u+'" alt="">'):''):'')+'</div>'+
      '<footer><button type="button" class="ok" data-sv="sv">حفظ</button><button type="button" class="'+(it.x?'':'dl')+'" data-sv="ex">'+(it.x?'إرجاعه للحساب':'استبعاد')+'</button><button type="button" data-sv="x">إغلاق</button></footer>';
    v.classList.add('on');}
  /* 1456: فحص الجلسة كاملة — يعيد كشف التكرار على كل الإيصالات بالقواعد الحالية: الأحكام اليدوية تبقى، المؤكد يُحسب مرة، غير المكرر يُرفع إلى الحساب، المشكوك يبقى في المراجعة */
  async function recheck(){var S=U.res;if(!S||U.run)return;var before={d:0,ds:0};S.its.forEach(function(it){if(it.d)before.d++;if(it.ds)before.ds++;if(it.d&&it.d.how!=='man')it.d=null;if(it.ds&&!it.nd)it.ds=null;});
    var R={n:S.its.length,d:0,stop:false,t0:Date.now(),cur:'',t:'فحص الجلسة كاملة — كشف التكرار بالقواعد الحالية',cnt:{K:0,T:0,o:0,u:0,d:0},sum:{K:0,T:0,x:0},feed:[]};U.run=R;paint();window.scrollTo(0,0);
    S.its.forEach(function(it){if(it.nd&&it.d&&it.d.how!=='man')it.d=null;});
    try{await dedupe(S.its,R);}catch(e){}
    var after={d:0,ds:0};S.its.forEach(function(it){if(it.d)after.d++;if(it.ds)after.ds++;});U.run=null;saveMeta();paint();
    toast('فحص '+S.its.length+' إيصالًا: '+after.d+' مكرر مؤكد (كان '+before.d+') · '+after.ds+' مشتبه للمراجعة · '+Math.max(0,(before.d+before.ds)-(after.d+after.ds))+' رُفع إلى الحساب');}
  async function rereadU(){var S=U.res;if(!S||U.run)return;var KK=calc(),L2=KK.lays.read.concat(KK.lays.noacct).filter(function(it){return !it.p.man;});if(!L2.length)return toast('لا شيء لإعادة قراءته');if(!DB)DB=await idb();var ok=0;
    var R={n:L2.length,d:0,stop:false,t0:Date.now(),cur:'',t:'إعادة قراءة صندوق المراجعة',cnt:{K:0,T:0,o:0,u:0,d:0},sum:{K:0,T:0,x:0},feed:[]};U.run=R;paint();window.scrollTo(0,0);
    for(var i=0;i<L2.length&&!R.stop;i++){var it=L2[i];R.cur=it.nm;await untilVisible();try{if(!it.file&&it._si>=0)it.file=await h.sess.file(KEY,it._si,it.nm,it.pdf);if(it.file){var r=await readFile(it.file,true);if(amt(r.p.amount)&&!amt(it.p.amount)||r.p.ccy!==it.p.ccy)ok++;it.p=r.p;feed(R,it);}}catch(e){}R.d++;paintP();}
    U.run=null;saveMeta();paint();toast('انتهت إعادة القراءة — تحسّن '+ok+' من '+L2.length);}
  /* صور مصغّرة للإيصالات الظاهرة */
  var TH={};async function thumbs(){var S=U.res;if(!S)return;var L2=[].slice.call(document.querySelectorAll('#lsMain i.th[data-th]'));
    for(var i=0;i<L2.length;i++){var el=L2[i],it=S.its[+el.dataset.th];if(!it||it.pdf)continue;if(!TH[it.fp]){try{if(!it.file&&it._si>=0)it.file=await h.sess.file(KEY,it._si,it.nm,it.pdf);if(it.file)TH[it.fp]=URL.createObjectURL(it.file);}catch(e){}}
      if(TH[it.fp])el.style.backgroundImage='url('+TH[it.fp]+')';}}
  function closeV(pop){if(!pop&&U.hist){U.hist=0;try{history.back();return;}catch(e){}}U.hist=0;var v=$('suRv');if(v)v.classList.remove('on');U.v=null;paint();if(U.y!=null){window.scrollTo(0,U.y);U.y=null;}}

  /* ── الأحداث ── */
  function inLs(e){var m=$('lsMain');return m&&m.contains(e.target);}
  document.addEventListener('click',function(e){
    var mb=e.target.closest&&e.target.closest('#lbMode button');if(mb){var on=mb.dataset.md==='s',m=$('lsMain');if(m)m.style.display=on?'':'none';if(on){['laMain','lbMain','ldMain'].forEach(function(k){var q=$(k);if(q)q.style.display='none';});[].forEach.call(document.querySelectorAll('#lbMode button'),function(b){b.classList.toggle('on',b===mb);});try{localStorage.setItem('bdl_lab_mode2','s');}catch(er){}paint();}return;}
    var sv=e.target.closest&&e.target.closest('#suRv [data-sv]');if(sv){var S=U.res,it=S&&S.its[U.v],a=sv.dataset.sv;if(a==='x')return closeV();if(!it)return;
      if(a==='sv'){it.ok=1;var va=parseFloat(String($('lsA').value).replace(/\s/g,'').replace(',','.'))||0,cc=$('lsC').value,w=$('lsW').value;it.p=Object.assign({},it.p,{amount:va,ccy:cc==='؟'?'':cc,man:1});it.cc=cc==='؟'?'':cc;
        it.ow=(it.who&&S.roles[it.who]===w)?'':w;
        if(it.fp)cput(it.fp,it.p);saveMeta();toast('حُفظ التعديل');return closeV();}
      if(a==='ex'){it.x=it.x?0:1;saveMeta();return closeV();}return;}
    if(!inLs(e))return;var b=e.target.closest('[data-sa],[data-si]');if(!b)return;
    if(b.dataset.si!=null)return view(+b.dataset.si);var a2=b.dataset.sa,c=U.c;
    if(a2==='pick'){var f=$('lsFile');f.value='';f.click();}
    else if(a2==='reset'){U.c=null;paint();}
    else if(a2==='role'||a2==='role2'){var tgt=a2==='role'?c.roles:U.res.roles;tgt[b.dataset.n]=b.dataset.r;
      try{var ME2=JSON.parse(localStorage.getItem('bdl_sup_me')||'[]');var ix=ME2.indexOf(b.dataset.n);if(b.dataset.r==='m'&&ix<0)ME2.push(b.dataset.n);if(b.dataset.r==='s'&&ix>=0)ME2.splice(ix,1);localStorage.setItem('bdl_sup_me',JSON.stringify(ME2.slice(-8)));}catch(e){}
      if(a2==='role2'){saveMeta();}paint();}
    else if(a2==='per'){var p=b.dataset.p,now=d0(Date.now());c.pk=p;if(p==='all'){c.all=true;c.from=c.min;c.to=c.max;}else{c.all=false;c.to=c.max;c.from=p==='y'?c.max-365*DAY:p==='q'?c.max-92*DAY:d0(new Date(new Date(now).getFullYear(),new Date(now).getMonth(),1).getTime());if(c.from<c.min)c.from=c.min;}paint();}
    else if(a2==='go'){var fr=$('lsFrom').value,to=$('lsTo').value;if(fr&&to){var F=d0(new Date(fr+'T00:00').getTime()),T=d0(new Date(to+'T00:00').getTime());if(F!==c.from||T!==c.to){c.from=Math.min(F,T);c.to=Math.max(F,T);c.all=c.from<=c.min&&c.to>=c.max;}}start();}
    else if(a2==='stop'){if(U.run)U.run.stop=true;}
    else if(a2==='as'||a2==='exc'){var S2=U.res,it=S2&&S2.its[+b.dataset.i];if(!it)return;
      if(a2==='exc'){it.x=1;saveMeta();paint();return toast('استُبعد');}
      if(!amt(it.p.amount)){toast('المبلغ غير مقروء — اكتبه أولًا');return view(it.i);}
      it.cc=b.dataset.c;it.ok=1;it.ow=(it.who&&S2.roles[it.who]===b.dataset.w)?'':b.dataset.w;saveMeta();paint();toast('رُفع إلى الحساب: '+fm(amt(it.p.amount))+' '+it.cc);}
    else if(a2==='exall'){var LX=calc().lays.read;if(!LX.length)return toast('لا صور من هذا النوع');if(!confirm('استبعاد '+LX.length+' صورة ليست إيصالًا؟ تبقى في «مستبعدة» ويمكن إرجاعها.'))return;LX.forEach(function(it){it.x=1;});saveMeta();paint();}
    else if(a2==='rr'){rereadU();}
    else if(a2==='rf'){saveMeta();setTimeout(function(){try{sessionStorage.setItem('lab_sup_keep','1');}catch(e){}location.reload();},150);}
    else if(a2==='rc'){paint();toast('أُعيد الحساب');}
    else if(a2==='rk'){recheck();}
    else if(a2==='dupy0'){var it6=U.res.its[+b.dataset.i];if(it6){it6.d={of:'',how:'man'};saveMeta();paint();}}
    else if(a2==='cmp0'){return view(+b.dataset.i,+b.dataset.j);}
    else if(a2==='dupy'||a2==='cmp'){var it4=U.res.its[+b.dataset.i];if(!it4)return;if(a2==='cmp'){return view(it4.i,it4.ds&&it4.ds.j?it4.ds.j.i:-1);}it4.d={of:it4.ds?it4.ds.of:'',how:'man'};it4.ds=null;saveMeta();paint();toast('اعتُبر مكررًا — يُحسب مرة واحدة');}
    else if(a2==='dupall'||a2==='ndall'){var Ls=calc().lays.dupS;if(!Ls.length)return;if(a2==='dupall'&&!confirm('اعتبار '+Ls.length+' إيصالًا مكررًا؟'))return;Ls.forEach(function(it){if(a2==='dupall'){it.d={of:it.ds?it.ds.of:'',how:'man'};it.ds=null;}else it.nd=1;});saveMeta();paint();}
    else if(a2==='acok'||a2==='acno'){var it5=U.res.its[+b.dataset.i];if(!it5)return;var rg=regOf(U.res.name);acctKeys(it5.p).forEach(function(k){rg[k]={ok:a2==='acok'?1:0,l:acctLabel(it5.p)};});regSave();if(a2==='acno')it5.x=1;saveMeta();paint();toast(a2==='acok'?'ثُبّت كحساب للمورد — يُقبل في كل الإيصالات':'رُفض الحساب');}
    else if(a2==='akok'||a2==='akno'){var rg2=regOf(U.res.name),kk=b.dataset.k;rg2[kk]={ok:a2==='akok'?1:0,l:(calc().KA.lab[kk]||'')};regSave();paint();}
    else if(a2==='noacok'){var Ln=calc().lays.noacct;if(!Ln.length)return;if(!confirm('اعتماد '+Ln.length+' إيصالًا بلا مستفيد مقروء كدفعات للمورد؟'))return;Ln.forEach(function(it){it.ok=1;it.cc=FIAT;});saveMeta();paint();}
    else if(a2==='adr'){var S4=U.res;S4.addr=S4.addr||{};if(b.dataset.a==='—')S4.tdef=b.dataset.v==='mine'?'s':'m';else S4.addr[b.dataset.a]=b.dataset.v;saveMeta();paint();}
    else if(a2==='nd'){var it3=U.res.its[+b.dataset.i];if(it3){it3.nd=1;saveMeta();paint();toast('أُرجع إلى الحساب كإيصال مستقل');}}
    else if(a2==='more'){U.open[b.dataset.k]=1;U.open['d'+b.dataset.k]=1;paint();}
    else if(a2==='go2'&&b.dataset.k==='nr'){U.open.dnr=1;paint();var dn=document.querySelector('#lsMain details[data-dk="nr"]');if(dn)dn.scrollIntoView({behavior:'smooth'});}
    else if(a2==='go2'){var k=b.dataset.k;if(k==='rt'){U.showR=true;paint();var r=$('lsRates');if(r)r.scrollIntoView({behavior:'smooth'});}else{U.open['d'+k]=1;paint();var d=document.querySelector('#lsMain details[data-dk="'+k+'"]');if(d)d.scrollIntoView({behavior:'smooth'});}}
    else if(a2==='avg'){CFG.avg=b.dataset.v;CFG.man=0;saveCfg();U.showR=true;paint();}
    else if(a2==='man'){var mv=parseFloat(String($('lsMan').value).replace(/\s/g,'').replace(',','.'))||0;if(!(mv>0))return toast('اكتب سعرًا صحيحًا');CFG.man=mv;saveCfg();U.showR=true;paint();}
    else if(a2==='unman'){CFG.man=0;saveCfg();U.showR=true;paint();}
    else if(a2==='share'){var t=repText();if(navigator.share)navigator.share({text:t}).catch(function(){});else window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank');}
    else if(a2==='copy'){var t2=repText();(navigator.clipboard?navigator.clipboard.writeText(t2):Promise.reject()).then(function(){toast('نُسخ التقرير');},function(){prompt('انسخ التقرير',t2);});}
    else if(a2==='end'){if(confirm('إنهاء جلسة تدقيق المورد؟ النتيجة وصورها المحفوظة على الجهاز ستُمسح.')){U.res=null;U.c=null;h.sess.clear(KEY);paint();}}});
  document.addEventListener('change',function(e){var t=e.target;if(t.id==='lsFile')return pick(t.files);
    if(t.dataset&&t.dataset.ri!=null&&U.res){var r=U.res.rates[+t.dataset.ri];if(r){r.on=t.checked;U.showR=true;saveMeta();paint();}}
    if(t.id==='lsFrom'||t.id==='lsTo'){var c=U.c;if(!c)return;var F=$('lsFrom').value,T=$('lsTo').value;if(F&&T){c.from=d0(new Date(F+'T00:00').getTime());c.to=d0(new Date(T+'T00:00').getTime());if(c.from>c.to){var q=c.from;c.from=c.to;c.to=q;}c.all=false;c.pk='c';paint();}}});
  document.addEventListener('click',function(e){var tr=e.target.closest&&e.target.closest('#lsMain tr.mo');if(!tr)return;var k='m'+tr.dataset.mo;U.open[k]=!U.open[k];U.open.dMO=1;paint();});
  document.addEventListener('toggle',function(e){var d=e.target;if(d&&d.id==='lsRates')U.showR=d.open;else if(d&&d.dataset&&d.dataset.dk)U.open['d'+d.dataset.dk]=d.open;},true);
  window.addEventListener('popstate',function(){if(U.v!=null)closeV(true);});
  function boot(){var md='';try{md=localStorage.getItem('bdl_lab_mode2');}catch(e){}if(md==='s'){var m=$('lsMain');if(m)m.style.display='';['laMain','lbMain','ldMain'].forEach(function(k){var q=$(k);if(q)q.style.display='none';});[].forEach.call(document.querySelectorAll('#lbMode button'),function(b){b.classList.toggle('on',b.dataset.md==='s');});}
    idb().then(function(d){DB=d;});paint();restore();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0);});else setTimeout(boot,0);
  window.__LABS={parseChat:parseChat,ratesIn:ratesIn,buildRates:buildRates,calc:function(){return calc();},U:U,CFG:CFG};
})();
