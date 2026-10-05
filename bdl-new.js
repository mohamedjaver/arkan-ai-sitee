/* bdl-new.js — «عملية جديدة»: ارفع الكل ← النظام يفرز ← أكّد مرة واحدة (Build 1366)
   طبقة واجهة فقط فوق المحركات القائمة: ArkanRead.readAmount (القراءة) · /account/log-transfer (القيد) · /account/receipt-log (سجل الإيصال ومنع التكرار).
   الفرز: AOA ← زبون · USDT/USD ← مورد · MRU ← تسليم لزبون (يُعرَّف بهاتف المستلم). الجهة تُتعلَّم من رقم الحساب/المحفظة/الهاتف وتُنسب تلقائيًا بعدها. */
(function(){
'use strict';
var SRV='https://arkan-ai-site-production.up.railway.app';
var S={items:[],party:'',recips:[],busy:false,done:false};
var MAPK='bdl_acct_map';
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(n){return Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});}
function digits(s){return String(s||'').replace(/\D/g,'');}
function say(t){try{if(typeof toast==='function')toast(t);else if(typeof toastSafe==='function')toastSafe(t);}catch(e){}}
function loadMap(){try{return JSON.parse(localStorage.getItem(MAPK)||'{}')||{};}catch(e){return {};}}
function saveMap(m){try{localStorage.setItem(MAPK,JSON.stringify(m));}catch(e){}}
function normCcy(c){c=String(c||'').toUpperCase().replace(/\s/g,'');
  if(/^(KZ|AKZ|AOA|KWANZA)$/.test(c))return 'AOA';if(/^(UM|MRU|MRO)$/.test(c))return 'MRU';
  if(/^(USDT|USDC|TETHER)$/.test(c))return 'USDT';if(c==='$'||c==='USD')return 'USD';
  return /^(EUR|CNY|AED)$/.test(c)?c:'';}
function sideOf(ccy){return (ccy==='USDT'||ccy==='USD')?'supplier':'customer';}
/* مفتاح التعرف: عنوان محفظة، أو رقم حساب/IBAN (آخر 12 رقمًا)، أو هاتف (آخر 8) */
function keyOf(p){var r=String(p.receiver||'').trim();
  if(/^(0x[a-fA-F0-9]{6,}|T[1-9A-HJ-NP-Za-km-z]{6,})/.test(r))return 'w:'+r.slice(0,14);
  var d=digits(r);if(d.length>=11)return 'a:'+d.slice(-12);
  var ph=digits(p.phone)||d;if(ph.length>=8)return 'p:'+ph.slice(-8);return '';}
async function token(){try{var j=JSON.parse(localStorage.getItem('arkan_sb_jwt')||'null');
    if(j&&j.token&&(!j.exp||j.exp>Math.floor(Date.now()/1000)+60))return j.token;}catch(e){}
  if(window.bdlcAuth){try{return await window.bdlcAuth();}catch(e){}}return null;}
async function sha(file){var b=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  return Array.prototype.map.call(new Uint8Array(b),function(x){return x.toString(16).padStart(2,'0');}).join('');}
/* كل المبالغ المحتملة في الإيصال (OCR/نص PDF) — تُعرض كأزرار للاختيار حين لا يُقرأ المبلغ آليًا */
function numsOf(text){var out=[],seen={};
  (String(text||'').match(/\d{1,3}(?:[ \u00A0]\d{3})+(?!\d)(?:[.,]\d{1,2})?(?!\d)|\d[\d.,]*\d|\d/g)||[]).forEach(function(tok){
    tok=tok.replace(/[ \u00A0]+$/,'');var raw=tok.replace(/[ \u00A0]/g,''),dg=raw.replace(/\D/g,'');
    if(dg.length<3||dg.length>11)return;
    if(!/[.,]/.test(raw)&&!/[ \u00A0]/.test(tok)&&dg.length===8&&/^[234]/.test(dg))return;      /* هاتف موريتاني */
    if(!/[.,]/.test(raw)&&dg.length===4&&/^20[2-4]\d$/.test(dg))return;                          /* سنة */
    var v;if(/[.,]\d{1,2}$/.test(raw))v=parseFloat(raw.slice(0,raw.search(/[.,]\d{1,2}$/)).replace(/[.,]/g,'')+'.'+raw.replace(/^.*[.,]/,''));
    else v=parseFloat(raw.replace(/[.,]/g,''));
    if(!(v>=100)||seen[v])return;seen[v]=1;out.push(v);});
  return out.slice(0,8);}
async function candidates(file,pdf){try{var R=window.ArkanRead;if(!R)return [];
    var t=await Promise.race([pdf?R.pdfText(file):R.ocrText(file),new Promise(function(r){setTimeout(function(){r('');},40000);})]);
    return numsOf(t);}catch(e){return [];}}
async function pool(list,n,fn){var i=0;async function w(){while(i<list.length){var k=i++;try{await fn(list[k],k);}catch(e){}}}
  var a=[];for(var k=0;k<Math.min(n,list.length);k++)a.push(w());await Promise.all(a);}

function css(){if($('bnCss'))return;var c=document.createElement('style');c.id='bnCss';c.textContent=
'#bnHero{display:flex;align-items:center;gap:14px;width:100%;border:0;cursor:pointer;text-align:start;padding:20px 18px;margin:6px 0 14px;border-radius:18px;color:#fff;font-family:inherit;background:radial-gradient(120% 140% at 0% 0%,#2E63D6 0%,#0B2F70 55%,#071E4A 100%);box-shadow:0 14px 30px rgba(11,47,112,.28)}'+
'#bnHero .pl{flex:none;width:54px;height:54px;border-radius:16px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);display:grid;place-items:center}'+
'#bnHero b{display:block;font-size:19px;font-weight:800;letter-spacing:-.2px}#bnHero small{display:block;margin-top:3px;font-size:12.5px;opacity:.82;line-height:1.5}'+
'#bnAlt{display:flex;gap:14px;justify-content:center;margin:-4px 0 16px;font-size:12.5px;color:#5B6B86}#bnAlt a{color:#0B2F70;font-weight:700;text-decoration:underline;cursor:pointer}'+
'#bnSheet{position:fixed;inset:0;z-index:9990;background:#F3F6FB;display:none;flex-direction:column;font-family:inherit;color:#0E1B33}#bnSheet.on{display:flex}'+
'#bnSheet header{flex:none;display:flex;align-items:center;justify-content:space-between;padding:calc(12px + env(safe-area-inset-top,0px)) 16px 12px;background:#0B2F70;color:#fff}'+
'#bnSheet header b{font-size:17px}#bnSheet header button{border:0;background:rgba(255,255,255,.14);color:#fff;width:38px;height:38px;border-radius:12px;font-size:18px;cursor:pointer}'+
'#bnSteps{flex:none;display:flex;gap:6px;padding:10px 16px;background:#fff;border-bottom:1px solid #E3E9F3;font-size:11.5px;font-weight:700;color:#8A97AD}'+
'#bnSteps span{flex:1;text-align:center;padding:6px 0;border-bottom:3px solid #E3E9F3}#bnSteps span.on{color:#0B2F70;border-color:#0B2F70}'+
'#bnBody{flex:1;overflow:auto;padding:14px 16px 20px}'+
'#bnFoot{flex:none;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));background:#fff;border-top:1px solid #E3E9F3}'+
'#bnGo{width:100%;height:54px;border:0;border-radius:14px;background:#0E8F5B;color:#fff;font-weight:800;font-size:16px;font-family:inherit;cursor:pointer}#bnGo:disabled{background:#B9C4D6;cursor:default}'+
'.bnDrop{border:2px dashed #9DB5E3;border-radius:18px;background:#fff;padding:38px 16px;text-align:center;cursor:pointer}.bnDrop b{display:block;font-size:17px;color:#0B2F70;margin-top:10px}.bnDrop small{display:block;margin-top:6px;color:#5B6B86;font-size:12.5px;line-height:1.7}'+
'.bnParty{background:#fff;border:1px solid #E3E9F3;border-radius:14px;padding:12px;margin-bottom:12px}.bnParty label{display:block;font-size:12px;font-weight:700;color:#5B6B86;margin-bottom:6px}'+
'.bnParty input,.bnRow input,.bnRow select{width:100%;height:44px;border:1.5px solid #C9D6EA;border-radius:10px;padding:0 12px;font-weight:600;font-size:15px;font-family:inherit;background:#fff;color:#0E1B33;box-sizing:border-box}'+
'.bnSum{display:flex;gap:8px;margin-bottom:12px}.bnSum div{flex:1;background:#fff;border:1px solid #E3E9F3;border-radius:12px;padding:10px;text-align:center}.bnSum b{display:block;font-size:18px;direction:ltr}.bnSum small{font-size:11px;color:#5B6B86}'+
'.bnRow{background:#fff;border:1px solid #E3E9F3;border-inline-start:5px solid #B9C4D6;border-radius:12px;padding:10px;margin-bottom:8px}'+
'.bnRow.ok{border-inline-start-color:#0E8F5B}.bnRow.warn{border-inline-start-color:#E08A00;background:#FFFBF2}.bnRow.dup,.bnRow.err{border-inline-start-color:#B00020;background:#FFF5F6}.bnRow.done{border-inline-start-color:#0E8F5B;opacity:.75}'+
'.bnTop{display:flex;align-items:center;gap:10px}.bnTh{flex:none;width:46px;height:46px;border-radius:8px;background:#EEF3FB;overflow:hidden;display:grid;place-items:center;font-size:10px;font-weight:800;color:#0B2F70}.bnTh img{width:100%;height:100%;object-fit:cover}'+
'.bnTh{position:relative;cursor:zoom-in}.bnTh i{position:absolute;inset:auto 0 0 0;background:rgba(11,47,112,.82);color:#fff;font-style:normal;font-size:9px;font-weight:800;text-align:center;padding:1px 0}'+
'.bnCh{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}.bnCh span{flex:1 0 100%;font-size:11.5px;font-weight:700;color:#5B6B86}.bnCh button{border:1.5px solid #0B2F70;background:#fff;color:#0B2F70;border-radius:999px;padding:7px 12px;font-weight:800;font-size:13px;font-family:inherit;direction:ltr;cursor:pointer}'+
'.bnAct2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.bnAct2 button{height:40px;border:1.5px solid #C9D6EA;background:#fff;color:#0B2F70;border-radius:10px;font-weight:800;font-size:12.5px;font-family:inherit;cursor:pointer}'+
'.bnWhy{margin-top:6px;font-size:11px;color:#8A97AD;direction:rtl}'+
'#bnView{position:fixed;inset:0;z-index:9995;background:#0A1220;display:none;flex-direction:column;font-family:inherit}#bnView.on{display:flex}'+
'#bnView header{flex:none;display:flex;justify-content:space-between;align-items:center;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px;color:#fff}#bnView header button{border:0;background:rgba(255,255,255,.16);color:#fff;width:38px;height:38px;border-radius:12px;font-size:17px}'+
'#bnView .bd{flex:1;overflow:auto;text-align:center;-webkit-overflow-scrolling:touch}#bnView .bd img{width:100%;height:auto;display:block;cursor:zoom-in}#bnView .bd img.zoom{width:250%;max-width:none;cursor:zoom-out}#bnView .bd small{display:block;color:#9FB0CC;font-size:11px;padding:6px}#bnView .bd iframe{width:100%;height:100%;border:0;background:#fff}#bnView .bd a{display:block;color:#9DB9F5;padding:10px;font-weight:700}'+
'#bnView footer{flex:none;background:#fff;padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px))}#bnView .rw{display:grid;grid-template-columns:1fr 100px;gap:8px;margin-top:8px}'+
'#bnView input,#bnView select{height:50px;border:1.5px solid #C9D6EA;border-radius:10px;padding:0 12px;font-weight:800;font-size:18px;font-family:inherit;box-sizing:border-box;width:100%;background:#fff;color:#0E1B33;direction:ltr}#bnView select{font-size:14px}'+
'#bnVOk{width:100%;height:52px;margin-top:8px;border:0;border-radius:12px;background:#0E8F5B;color:#fff;font-weight:800;font-size:15px;font-family:inherit}'+
'.bnMain{flex:1;min-width:0}.bnAmt{font-size:17px;font-weight:800;direction:ltr;text-align:start}.bnMeta{font-size:11.5px;color:#5B6B86;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr;text-align:start}'+
'.bnSide{flex:none;border:0;border-radius:999px;padding:7px 11px;font-weight:800;font-size:11.5px;font-family:inherit;cursor:pointer;color:#fff}.bnSide.customer{background:#0B2F70}.bnSide.supplier{background:#1F7A4D}'+
'.bnX{flex:none;border:0;background:none;color:#8A97AD;font-size:18px;cursor:pointer;padding:4px}'+
'.bnFix{display:grid;grid-template-columns:1fr 92px;gap:8px;margin-top:8px}.bnFix .full{grid-column:1/-1}.bnMsg{margin-top:6px;font-size:12px;font-weight:700}.bnRow.warn .bnMsg{color:#9A5B00}.bnRow.dup .bnMsg,.bnRow.err .bnMsg{color:#B00020}.bnRow.done .bnMsg{color:#0E8F5B}'+
'.bnSpin{display:inline-block;width:14px;height:14px;border:2px solid #C9D6EA;border-top-color:#0B2F70;border-radius:50%;animation:bnsp .7s linear infinite;vertical-align:-2px}@keyframes bnsp{to{transform:rotate(360deg)}}'+
'@media (prefers-color-scheme:dark){#bnSheet{background:#0B1322;color:#E8EEF9}#bnSteps,#bnFoot,.bnParty,.bnSum div,.bnRow,.bnDrop{background:#121D31;border-color:#22314D}.bnParty input,.bnRow input,.bnRow select{background:#0B1322;color:#E8EEF9;border-color:#2B3C5E}.bnDrop b{color:#9DB9F5}.bnRow.warn{background:#2A2111}.bnRow.dup,.bnRow.err{background:#2A1418}}';
  document.head.appendChild(c);}

function mount(){css();
  var box=document.querySelector('.hm-mrb');if(!box||$('bnHero'))return;
  var h=document.createElement('button');h.id='bnHero';h.type='button';
  h.innerHTML='<span class="pl"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span><span><b>عملية جديدة</b><small>ارفع كل الإيصالات دفعة واحدة — النظام يقرأ ويفرز، وأنت تؤكد مرة واحدة</small></span>';
  h.onclick=open;
  var alt=document.createElement('div');alt.id='bnAlt';
  alt.innerHTML='<span>إدخال يدوي:</span><a data-s="customer">زبون</a><a data-s="supplier">مورد</a>';
  alt.onclick=function(e){var a=e.target.closest('a');if(a&&typeof mrbManual==='function')mrbManual(e,a.dataset.s);};
  /* البطل أعلى «آخر العمليات»، والكرتان القديمتان تُخفيان (دوالّهما باقية للإدخال اليدوي) */
  var sec=box.previousElementSibling;while(sec&&!(sec.classList&&sec.classList.contains('hm-sec')))sec=sec.previousElementSibling;
  var anchor=sec||box;anchor.parentNode.insertBefore(h,anchor);anchor.parentNode.insertBefore(alt,anchor);
  box.style.display='none';
  var sh=document.createElement('div');sh.id='bnSheet';
  sh.innerHTML='<header><b>عملية جديدة</b><button type="button" id="bnClose" aria-label="إغلاق">✕</button></header>'+
    '<div id="bnSteps"><span data-k="1">1 · الرفع</span><span data-k="2">2 · الفرز</span><span data-k="3">3 · القيد</span></div>'+
    '<div id="bnBody"></div><div id="bnFoot"><button id="bnGo" type="button" disabled>قيّد الكل</button></div>'+
    '<input type="file" id="bnFile" accept="image/*,.pdf,application/pdf" multiple style="display:none"><datalist id="bnDL"></datalist>';
  document.body.appendChild(sh);
  $('bnClose').onclick=close;$('bnFile').onchange=function(){add(this.files);this.value='';};
  $('bnGo').onclick=commit;
  $('bnBody').addEventListener('click',onClick);$('bnBody').addEventListener('change',onChange);
  document.addEventListener('paste',function(e){if(!$('bnSheet').classList.contains('on')||S.busy)return;
    var fs=[];[].forEach.call((e.clipboardData||{}).items||[],function(it){if(it.kind==='file'){var f=it.getAsFile();if(f)fs.push(f);}});if(fs.length)add(fs);});
}
function open(){if((window.bdlRole?bdlRole():'')!=='owner'){say('هذه الخدمة لحساب المالك فقط');return;}
  S.items=[];S.party='';S.done=false;S.busy=false;$('bnSheet').classList.add('on');render();recips();$('bnFile').click();}
function close(){if(S.busy)return;$('bnSheet').classList.remove('on');
  if(S.done){try{if(typeof rcpCloudLoad==='function')rcpCloudLoad();}catch(e){}}}
async function recips(){if(S.recips.length)return;try{var t=await token();if(!t)return;
    var r=await fetch(SRV+'/account/recipients',{headers:{Authorization:'Bearer '+t}});var j=await r.json();
    S.recips=(j&&j.items)||[];$('bnDL').innerHTML=S.recips.map(function(c){return '<option value="'+esc(c.name)+'">';}).join('');
    S.items.forEach(function(it){resolve(it);});render();}catch(e){}}

/* ── الرفع والقراءة ── */
async function add(files){files=[].slice.call(files||[]);if(!files.length)return;
  var fresh=files.map(function(f){return {file:f,url:URL.createObjectURL(f),pdf:/pdf$/i.test(f.type||f.name||''),st:'read',p:{},side:'customer',ccy:'',amount:0,name:'',phone:'',auto:false,msg:''};});
  S.items=S.items.concat(fresh);render();
  await pool(fresh,3,async function(it){
    try{it.fp=await sha(it.file);}catch(e){it.fp='';}
    if(it.fp&&S.items.some(function(x){return x!==it&&x.fp===it.fp;})){it.st='dup';it.msg='مكرر داخل الدفعة — نفس الملف';render();return;}
    await readOne(it);});
  render();}
/* قراءة إيصال واحد: القارئ الموحد ← القارئ الكامل (محرك ثانٍ) ← استخراج كل الأرقام كخيارات */
async function readOne(it){
  var R=window.ArkanRead,p=null,lim=function(pr){return Promise.race([pr,new Promise(function(r){setTimeout(function(){r(null);},45000);})]);};
  try{p=await lim(R?R.readAmount(it.file):null);}catch(e){}
  if(!(p&&Number(p.amount)>0)&&R&&R.read){try{var q=await lim(R.read(it.file));var qp=q&&q.parsed;
    if(qp&&Number(qp.amount)>0)p={amount:qp.amount,ccy:qp.currency||qp.ccy,txn:qp.reference||qp.transaction_id||qp.txn,receiver:qp.account||qp.receiver,name:qp.name||qp.beneficiary,bank:qp.bank,phone:qp.phone,date:qp.date,eng:q.engine};}catch(e){}}
  it.p=p||{};it.amount=Number(it.p.amount)||0;it.ccy=normCcy(it.p.ccy);it.side=sideOf(it.ccy);it.cands=[];it.why='';
  if(!it.amount){it.why=window.__bdlReadErr||'';it.cands=await candidates(it.file,it.pdf);}
  if(it.p.txn&&S.items.some(function(x){return x!==it&&x.p&&x.p.txn&&x.p.txn===it.p.txn&&x.st!=='dup';})){it.st='dup';it.msg='مكرر داخل الدفعة — نفس رقم العملية '+it.p.txn;render();return;}
  resolve(it,true);render();}
/* ── تحديد الجهة: مُتعلَّمة من الحساب ← هاتف زبون مسجل ← جهة الدفعة ── */
function resolve(it,force){if(it.st==='dup'||it.st==='done'||(it.st==='read'&&!force))return;
  if(!it.manual){var k=keyOf(it.p),m=loadMap(),hit=k&&m[k];it.auto=false;
    if(hit&&(it.ccy!=='AOA')){it.name=hit.name;it.phone=hit.phone||'';it.auto=true;}
    else{var ph=digits(it.p.phone||(it.ccy==='MRU'?it.p.receiver:'')).slice(-8);
      var c=ph.length===8&&it.ccy==='MRU'?S.recips.find(function(x){return digits(x.phone).slice(-8)===ph;}):null;
      if(c){it.name=c.name;it.phone=digits(c.phone);it.auto=true;}
      else{it.name=S.party||'';it.phone=(it.ccy==='MRU'&&ph.length===8)?ph:'';}}}
  var miss=[];if(!(it.amount>0))miss.push('المبلغ');if(!it.ccy)miss.push('العملة');if(!it.name)miss.push('الجهة');
  it.st=miss.length?'warn':'ok';it.msg=miss.length?('أكمل: '+miss.join(' · ')):'';}

/* ── العرض ── */
function step(k){[].forEach.call($('bnSteps').children,function(s){s.classList.toggle('on',+s.dataset.k<=k);});}
function render(){var b=$('bnBody'),go=$('bnGo');if(!b)return;
  if(!S.items.length){step(1);go.style.display='none';
    b.innerHTML='<div class="bnDrop" data-act="pick"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0B2F70" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg><b>اختر الإيصالات — واحدًا أو خمسين</b><small>زبائن وموردون معًا، صور أو PDF، أو الصقها مباشرة.<br>كوانزا = زبون · USDT = مورد · أوقية = تسليم لزبون</small></div>';return;}
  go.style.display='';
  var reading=S.items.filter(function(x){return x.st==='read';}).length,
      ok=S.items.filter(function(x){return x.st==='ok';}),warn=S.items.filter(function(x){return x.st==='warn';}).length,
      dup=S.items.filter(function(x){return x.st==='dup';}).length,done=S.items.filter(function(x){return x.st==='done';}).length;
  step(S.done?3:2);
  var h='';
  if(!S.done)h+='<div class="bnParty"><label>الزبون صاحب إيصالات الكوانزا في هذه الدفعة (تُنسب له كل الإيصالات غير المعرَّفة)</label><input id="bnParty" list="bnDL" placeholder="اكتب الاسم أو اختره" value="'+esc(S.party)+'" autocomplete="off"></div>';
  h+='<div class="bnSum"><div><b style="color:#0E8F5B">'+(S.done?done:ok.length)+'</b><small>'+(S.done?'قُيّدت':'جاهزة')+'</small></div><div><b style="color:#E08A00">'+warn+'</b><small>تحتاج مراجعة</small></div><div><b style="color:#B00020">'+dup+'</b><small>مكررة</small></div></div>';
  var order={warn:0,err:0,read:1,ok:2,dup:3,done:4};
  S.items.map(function(it,i){return [it,i];}).sort(function(a,b){return order[a[0].st]-order[b[0].st];}).forEach(function(q){h+=row(q[0],q[1]);});
  if(!S.done&&!S.busy)h+='<div class="bnDrop" data-act="pick" style="padding:16px;margin-top:6px"><b style="margin:0;font-size:14px">+ إضافة إيصالات أخرى</b></div>';
  b.innerHTML=h;
  if(S.done){go.disabled=false;go.textContent='فتح التسوية';go.style.background='#0B2F70';}
  else{go.style.background='';go.disabled=S.busy||reading>0||!ok.length;
    go.innerHTML=S.busy?'<span class="bnSpin"></span> جارٍ القيد…':reading?('<span class="bnSpin"></span> قراءة '+(S.items.length-reading)+'/'+S.items.length):(ok.length?('قيّد '+ok.length+' عملية'+(warn?' — وتبقى '+warn+' للمراجعة':'')):'أكمل الناقص أولًا');}
}
function row(it,i){var p=it.p||{},edit=(it.st==='warn'||it.st==='err')&&!S.busy;
  var h='<div class="bnRow '+it.st+'" data-i="'+i+'"><div class="bnTop"><div class="bnTh" data-act="view">'+(it.pdf?'PDF':'<img src="'+it.url+'" alt="">')+'<i>تكبير</i></div><div class="bnMain">'+
    (it.st==='read'?'<div class="bnMeta"><span class="bnSpin"></span> جارٍ القراءة…</div>':
     '<div class="bnAmt">'+(it.amount?fmt(it.amount):'—')+' <span style="font-size:12px;font-weight:700;color:#5B6B86">'+esc(it.ccy||'')+'</span></div><div class="bnMeta">'+esc([it.name||'بلا جهة',p.bank,p.txn].filter(Boolean).join(' · '))+'</div>')+
    '</div>'+(it.st==='read'||it.st==='dup'?'':'<button type="button" class="bnSide '+it.side+'" data-act="side"'+(it.st==='done'||S.busy?' disabled':'')+'>'+(it.side==='supplier'?'مورد':'زبون')+'</button>')+
    (S.busy||it.st==='done'||it.st==='read'?'':'<button type="button" class="bnX" data-act="del" aria-label="حذف">✕</button>')+'</div>';
  if(edit)h+='<div class="bnFix"><input data-f="amount" inputmode="decimal" placeholder="المبلغ" value="'+(it.amount||'')+'"><select data-f="ccy">'+['','AOA','MRU','USDT','USD','EUR','CNY','AED'].map(function(c){return '<option value="'+c+'"'+(c===it.ccy?' selected':'')+'>'+(c||'العملة')+'</option>';}).join('')+'</select><input class="full" data-f="name" list="bnDL" placeholder="اسم الجهة (زبون أو مورد)" value="'+esc(it.name)+'" autocomplete="off"></div>';
  if(edit&&!it.amount)h+=chips(it)+'<div class="bnAct2"><button type="button" data-act="view">فتح الإيصال للتأكد</button><button type="button" data-act="reread">إعادة القراءة</button></div>'+(it.why?'<div class="bnWhy">'+esc(it.why)+'</div>':'');
  if(it.msg)h+='<div class="bnMsg">'+esc(it.msg)+'</div>';
  else if(it.st==='ok'&&it.auto)h+='<div class="bnMsg" style="color:#0E8F5B">جهة معروفة — نُسبت تلقائيًا</div>';
  return h+'</div>';}
function chips(it){return (it.cands&&it.cands.length)?('<div class="bnCh"><span>أرقام وُجدت في الإيصال — اختر المبلغ:</span>'+it.cands.map(function(v){return '<button type="button" data-act="cand" data-v="'+v+'">'+fmt(v)+'</button>';}).join('')+'</div>'):'';}
/* ── عارض الإيصال: الصورة كاملة مع تكبير، والمبلغ يُؤكَّد وأنت تنظر إليها ── */
function view(i){var it=S.items[i];if(!it)return;var v=$('bnView');
  if(!v){v=document.createElement('div');v.id='bnView';document.body.appendChild(v);
    v.addEventListener('click',function(e){var a=e.target.closest('[data-v]');
      if(a){$('bnVAmt').value=a.dataset.v;return;}
      if(e.target.id==='bnVImg'){e.target.classList.toggle('zoom');return;}
      if(e.target.closest('#bnVClose')){v.classList.remove('on');return;}
      if(e.target.closest('#bnVOk')){var x=S.items[+v.dataset.i];if(x&&x.st!=='done'&&x.st!=='dup'){
          var n=parseFloat(String($('bnVAmt').value).replace(/[^\d.]/g,''))||0;if(n>0)x.amount=n;
          if($('bnVCcy').value){x.ccy=$('bnVCcy').value;x.side=sideOf(x.ccy);}resolve(x,true);}
        v.classList.remove('on');render();}});}
  v.dataset.i=i;var lock=it.st==='done'||it.st==='dup'||S.busy;
  v.innerHTML='<header><b>تأكيد المبلغ من الإيصال</b><button type="button" id="bnVClose">✕</button></header>'+
    '<div class="bd">'+(it.pdf?'<iframe src="'+it.url+'"></iframe><a href="'+it.url+'" target="_blank" rel="noopener">فتح ملف PDF في نافذة</a>':'<img id="bnVImg" src="'+it.url+'" alt=""><small>اضغط الصورة للتكبير والتصغير</small>')+'</div>'+
    '<footer>'+(lock?'':chips(it))+'<div class="rw"><input id="bnVAmt" inputmode="decimal" placeholder="المبلغ كما في الإيصال" value="'+(it.amount||'')+'"'+(lock?' disabled':'')+'><select id="bnVCcy"'+(lock?' disabled':'')+'>'+['','AOA','MRU','USDT','USD','EUR','CNY','AED'].map(function(c){return '<option value="'+c+'"'+(c===it.ccy?' selected':'')+'>'+(c||'العملة')+'</option>';}).join('')+'</select></div>'+
    '<button type="button" id="bnVOk">'+(lock?'إغلاق':'المبلغ صحيح — تأكيد')+'</button></footer>';
  v.classList.add('on');}
function onClick(e){var a=e.target.closest('[data-act]');if(!a)return;var act=a.dataset.act;
  if(act==='pick'){$('bnFile').click();return;}
  var r0=a.closest('.bnRow');
  if(act==='view'&&r0){view(+r0.dataset.i);return;}
  if(act==='cand'&&r0){var c0=S.items[+r0.dataset.i];if(c0&&!S.busy){c0.amount=Number(a.dataset.v)||0;resolve(c0,true);render();}return;}
  if(act==='reread'&&r0){var c1=S.items[+r0.dataset.i];if(c1&&!S.busy){c1.st='read';c1.msg='';render();readOne(c1);}return;}
  var r=a.closest('.bnRow');if(!r)return;var it=S.items[+r.dataset.i];if(!it||S.busy)return;
  if(act==='del'){S.items.splice(+r.dataset.i,1);render();}
  if(act==='side'){it.side=it.side==='supplier'?'customer':'supplier';render();}}
function onChange(e){var t=e.target;
  if(t.id==='bnParty'){S.party=t.value.trim();S.items.forEach(function(it){if(it.st==='ok'||it.st==='warn')resolve(it);});render();return;}
  var r=t.closest('.bnRow');if(!r||!t.dataset.f)return;var it=S.items[+r.dataset.i];if(!it)return;
  if(t.dataset.f==='amount')it.amount=parseFloat(String(t.value).replace(/[^\d.]/g,''))||0;
  if(t.dataset.f==='ccy'){it.ccy=t.value;it.side=sideOf(it.ccy);}
  if(t.dataset.f==='name'){it.name=t.value.trim();it.manual=true;var c=S.recips.find(function(x){return x.name===it.name;});if(c)it.phone=digits(c.phone);}
  resolve(it);render();}

/* ── القيد: نفس مسار كرت الإيصال (log-transfer ثم receipt-log) — إيصال فاشل لا يوقف الدفعة ── */
async function commit(){if(S.done){location.href='settle-v2.html';return;}
  var list=S.items.filter(function(x){return x.st==='ok';});if(!list.length||S.busy)return;
  var tok=await token();if(!tok){say('انتهت الجلسة — سجّل الدخول مجددًا');return;}
  S.busy=true;render();var map=loadMap(),H={'Content-Type':'application/json',Authorization:'Bearer '+tok};
  await pool(list,2,async function(it){
    var ref=(it.p&&it.p.txn)||('BDL-'+(it.fp||String(Date.now())).slice(0,12));
    try{var r=await fetch(SRV+'/account/log-transfer',{method:'POST',headers:H,body:JSON.stringify({ref:ref,name:it.name,benefPhone:it.phone||'',amount:it.amount,ccy:it.ccy,side:it.side})});
      var j=await r.json().catch(function(){return {};});
      if(!(r.ok&&j.ok)){it.st='err';it.msg=r.status===401?'انتهت الجلسة — سجّل الدخول مجددًا':('لم يُقيَّد: خادم '+r.status+(j.err?' ('+j.err+')':''));render();return;}
      if(j.dup){it.st='dup';var pv=j.prev||{};it.msg='مقيَّد مسبقًا'+(pv.name?' — '+pv.name:'')+(pv.amount?' · '+fmt(pv.amount)+' '+(pv.ccy||''):'');}
      else{it.st='done';it.msg='✓ قُيّدت في التسوية باسم '+it.name;}
      try{await fetch(SRV+'/account/receipt-log',{method:'POST',headers:H,body:JSON.stringify({side:it.side,amount:it.amount,ccy:it.ccy,bank:(it.p&&it.p.bank)||'',ref:(it.p&&it.p.txn)||'',name:it.name,fp:it.fp||''})});}catch(e){}
      var k=keyOf(it.p||{});if(k&&it.ccy!=='AOA'&&it.name)map[k]={name:it.name,phone:it.phone||'',side:it.side};
    }catch(e){it.st='err';it.msg='تعذّر الاتصال — أعد المحاولة';}
    render();});
  saveMap(map);S.busy=false;
  S.items.forEach(function(it){if(it.st==='err')it.st='warn';});
  S.done=!S.items.some(function(x){return x.st==='warn'||x.st==='ok';});
  var n=S.items.filter(function(x){return x.st==='done';}).length;say('قُيّدت '+n+' عملية');
  try{if(typeof rcpCloudLoad==='function')rcpCloudLoad();}catch(e){}
  render();}

window.BDLNew={open:open,_t:{normCcy:normCcy,sideOf:sideOf,keyOf:keyOf,numsOf:numsOf}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
