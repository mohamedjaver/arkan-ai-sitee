const GEM_SCHEMA=`{"transaction_id":"","reference":"","bank":"","amount":0,"currency":"","date":"YYYY-MM-DD","time":"","country":"","beneficiary":"","sender":"","wallet_address":"","iban":"","swift":"","fee":0,"exchange_rate":"","status":"","institution":"","branch":"","notes":"","doc_type":"","receipt_side":"","field_confidence":{"amount":0,"currency":0,"date":0,"reference":0,"bank":0,"sender":0,"beneficiary":0},"quality":{"cropped":false,"blurry":false,"edited_suspicion":false,"missing_corners":false,"issues":""},"confidence":0}`;
const GEM_PROMPT=`أنت محرك OCR مالي مؤسسي. اقرأ هذا المستند (قد يكون بالعربية أو الفرنسية أو الإنجليزية أو البرتغالية أو الصينية): إيصال بنكي، تحويل، كشف حساب، إيصال كريبتو، SWIFT، أو فاتورة.
اقرأ كل حرف ثم افهم المعنى واستخرج JSON فقط بلا أي نص آخر وبهذه البنية حرفيًا:
${GEM_SCHEMA}
- amount رقم فقط بلا فواصل، وأضف حقلاً "amount_verbatim" فيه نص المبلغ حرفيًا كما هو مكتوب في المستند (مثل "Kz 8 780 000,00").
- المبلغ هو قيمة حقل Montante/المبلغ/Total/Valor فقط (مثل: Kz 8 000 000,00 → 8000000). لا تضع أبدًا في amount أرقام Movimento أو Número de Operação أو Transacção أو CHAVE أو PIN أو Conta/IBAN — هذه أرقام تعريفية تذهب في transaction_id/reference.
- قاعدة حاسمة لإثباتات ATLANTICO (Transfer to Atlântico / Transferência Atlântico): reference = قيمة سطر Reference/Referencia فقط (مثال: Reference 648084834 → reference=648084834). ACCOUNT NUMBER وAccount number/IBAN وCurrent account/Conta origem (مثل 292750887 أو 347805651) أرقام حسابات — يُمنع منعًا باتًا وضعها في reference أو amount. amount من Amount/Montante؛ beneficiary من Name/Nome beneficiário؛ Account number/IBAN وCurrent account أرقام حسابات لا توضع أبدًا في reference ولا amount؛ beneficiary هو سطر Name؛ العملة AKZ تعني الكوانزا.
- تجاهل تمامًا أرقام التذييل القانوني (Capital Social، NIF، الهواتف).
- الكوانزا الأنغولية: AOA (تظهر كـ Kz أو KZ أو AKZ). الأوقية: MRU (أو UM). انتبه للفواصل الأوروبية 1.234.567,89 والمسافات 8 000 000,00.
- قيّم جودة الصورة في quality (مقصوصة؟ ضبابية؟ أثر تعديل؟ زوايا ناقصة؟).
- confidence: ثقتك 0-100 في دقة المبلغ والمرجع.
- field_confidence: ثقتك 0-100 في كل حقل على حدة (المبلغ، العملة، التاريخ، المرجع، البنك، المرسل، المستفيد). إن لم يوجد الحقل في المستند ضع 0.
- receipt_side: صنّف الإيصال من منظور شركة ARKAN (أسماؤها: ARKAN، أركان، Mohamed Javer، Mohamed El Arbi): إذا كان المال واردًا إلى ARKAN من عميل → "customer". إذا كان المال صادرًا من ARKAN إلى طرف آخر (مورد/مستفيد خارجي) → "supplier". إذا لم تستطع الجزم → "unknown".`;
/* ═══════════════════════════════════════════════════════
   ArkanRead — محرك قراءة الإيصالات الموحّد (Gemini + OCR)
   نفس محرك الأرشيف حرفياً — لكل بوابات الرفع في الموقع
   ═══════════════════════════════════════════════════════ */
(function(){
'use strict';
const KEY=()=> (localStorage.getItem('gemKey')||'').trim();
const MODELS=['gemini-2.5-flash','gemini-2.0-flash','gemini-flash-latest'];
let QUOTA_TRIP=0; /* قاطع: بعد فشلي حصة متتاليين ننتقل محلياً لبقية الدفعة */

async function toB64(f){
  return new Promise((res,rej)=>{const r=new FileReader();
    r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(f);});
}
async function gemini(b64,mime){
  const key=KEY(); if(!key)throw new Error('NOKEY');
  const body={contents:[{parts:[{text:GEM_PROMPT},{inline_data:{mime_type:mime||'image/jpeg',data:b64}}]}],
    generationConfig:{temperature:0,responseMimeType:'application/json'}};
  let last='';
  for(const m of MODELS){
    try{
      const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+m+':generateContent?key='+encodeURIComponent(key),
        {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){last=(j.error&&j.error.message)||('HTTP '+r.status);
        if(r.status===429||/quota|exhausted/i.test(last)){QUOTA_TRIP++;break;}
        continue;}
      let t=(((j.candidates||[])[0]||{}).content||{parts:[]}).parts.map(p=>p.text||'').join('');
      t=t.replace(/```json|```/g,'').trim();
      const p=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));
      QUOTA_TRIP=0; return p;
    }catch(e){last=e.message;}
  }
  throw new Error('Gemini: '+last);
}
/* ── OCR محلي مقوّى (نفس settlement) كاحتياط ── */
let _w=null;
async function _head(u){try{const r=await fetch(u,{method:'HEAD',cache:'no-store'});return r.ok;}catch(e){return false;}}
async function worker(){
  if(_w)return _w;
  if(!window.Tesseract){
    await new Promise((res,rej)=>{const sc=document.createElement('script');
      sc.src='vendor/tesseract.min.js';sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});
  }
  const V=new URL('vendor/',location.href).href;
  const ok=(await Promise.all(['worker.min.js','tesseract-core-simd-lstm.wasm.js','eng.traineddata.gz'].map(f=>_head(V+f)))).every(Boolean);
  const cfg=ok?{workerPath:V+'worker.min.js',corePath:V+'tesseract-core-simd-lstm.wasm.js',
      langPath:V.replace(/\/$/,''),workerBlobURL:false,gzip:true,cacheMethod:'none'}
    :{corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0/tesseract-core-simd-lstm.wasm.js',
      langPath:'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int'};
  _w=await Tesseract.createWorker('eng',1,cfg);
  await _w.setParameters({tessedit_pageseg_mode:'6'});
  return _w;
}
async function pdfText(f){
  if(!window.pdfjsLib){
    await new Promise((res,rej)=>{const sc=document.createElement('script');
      sc.src='vendor/pdf.min.js';sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});
  }
  try{pdfjsLib.GlobalWorkerOptions.workerSrc=new URL('vendor/pdf.worker.min.js',location.href).href;}catch(e){}
  const buf=await f.arrayBuffer();
  const doc=await pdfjsLib.getDocument({data:buf}).promise;
  let out='';
  try{
    for(let i=1;i<=Math.min(doc.numPages,4);i++){
      const pg=await doc.getPage(i);
      const tc=await pg.getTextContent();
      out+=tc.items.map(it=>it.str).join(' ')+'\n';
      pg.cleanup&&pg.cleanup();
    }
  }finally{ try{await doc.destroy();}catch(e){} }
  return out;
}
async function ocrText(f){
  const w=await worker();
  const {data}=await w.recognize(f);
  return data.text||'';
}
function euNum(x){
  x=String(x).trim();
  if(/,\d{1,2}$/.test(x)) x=x.replace(/[.\s\u00A0]/g,'').replace(',','.');
  else x=x.replace(/[,\s\u00A0]/g,'');
  return parseFloat(x)||0;
}
function liteParse(t){
  const p={amount:0,currency:'',reference:'',bank:'',date:'',confidence:40};
  /* قالب Comprovativo Digital — MULTICAIXA Express (PDF رقمي): Data-Hora بالثواني */
  if(/Comprovativo\s+Digital/i.test(t)||(/MULTICAIXA\s+Express/i.test(t)&&/Transac[çc][ãa]o/i.test(t))){
    const dh=t.match(/Data\s*-?\s*Hora[^\d]{0,10}(\d{4}-\d{2}-\d{2})[\sT]+(\d{2}:\d{2}(?::\d{2})?)/i);
    const am=t.match(/(?:Total|Montante)[^\d]{0,10}([\d][\d.\s\u00A0]{2,},\d{2})\s*Kz/i)||t.match(/(?:Total|Montante)[^\d]{0,10}([\d][\d.,\s\u00A0]{2,})/i);
    const rf=t.match(/Transac[çc][ãa]o[^\d]{0,10}(\d{5,})/i);
    const nm=t.match(/Destinat[áa]rio\s*:?\s*([A-ZÀ-Ú][A-ZÀ-Ú0-9 .,&\-]{3,70})/i);
    const ib=t.match(/IBAN\s*:?\s*(A[O0][\d.\s]{10,})/i);
    if(rf||am){
      p.bank='MULTICAIXA';p.currency='Kz';
      if(am)p.amount=euNum(am[1]);
      if(rf)p.reference=rf[1];
      if(nm)p.name=nm[1].replace(/\s+(IBAN|Montante|Comiss|Imposto|Total|Transac).*$/i,'').replace(/(?:\s+[A-Z]){1,2}$/,'').trim();
      if(ib)p.receiver=ib[1].replace(/[.\s]/g,'');
      if(dh)p.date=dh[1]+' '+dh[2];
      p.confidence=(p.amount&&p.reference)?100:80;return p;}
  }
  /* قالب قسيمة MULTICAIXA الورقية (ماكينة ATM): TRANSFERÊNCIA BANCÁRIA */
  if(/IMPORT[ÂA]NCIA\s+A\s+TRANSFERIR/i.test(t)||(/MULTICAIXA/i.test(t)&&/TRANSAC[ÇC][ÃA]O/i.test(t))){
    const amM=t.match(/IMPORT[ÂA]NCIA\s+A\s+TRANSFERIR:?\s*([\d.,\s\u00A0]+?)\s*KZ/i)||t.match(/([\d][\d.\s]{4,},\d{2})\s*KZ/);
    const rfM=t.match(/TRANSAC[ÇC][ÃA]O:?\s*(\d{3,})/i);
    const nmM=t.match(/NOME\s+DO\s+DESTINAT[ÁA]RIO:?\s*\n?\s*([A-ZÀ-Ú][A-ZÀ-Ú .,&\-]{3,70})/i);
    const ibM=t.match(/IBAN\s+DO\s+DESTINAT[ÁA]RIO:?\s*\n?\s*(A[O0][\d.\s]{10,})/i);
    const dtM=t.match(/(\d{4}\/\d{2}\/\d{2})/);
    if(amM){p.bank='MULTICAIXA';p.currency='Kz';p.amount=euNum(amM[1]);
      if(rfM)p.reference=rfM[1];
      if(nmM)p.name=nmM[1].replace(/\s+(N[ºo°]|BANCO|TENHA).*$/i,'').replace(/\s+/g,' ').replace(/(?:\s+[A-Z]){1,2}$/,'').trim();
      if(ibM)p.receiver=ibM[1].replace(/[.\s]/g,'');
      if(dtM)p.date=dtM[1];
      p.confidence=(p.amount&&p.reference)?100:80;return p;}
  }
  /* قالب BANCO SOL — Transferência Interna */
  if(/BANCO\s+SOL/i.test(t)&&/transfer[êe]ncia/i.test(t)){
    const rfS=t.match(/N[úu]mero\s+de\s+transfer[êe]ncia\s+atribu[íi]do:?\s*(\d{5,})/i);
    const amS=t.match(/Montante:?\s*([\d][\d.,\s\u00A0]{2,})/i);
    const nmS=t.match(/Nome\s+do\s+primeiro\s+titular:?\s*([A-ZÀ-Ú][A-ZÀ-Ú .,&\-]{3,70})/i);
    const dtS=t.match(/Data\s+da\s+transfer[êe]ncia:?\s*(\d{2}-\d{2}-\d{4})/i);
    if(rfS||amS){p.bank='SOL';p.currency='Kz';
      if(amS)p.amount=euNum(amS[1]);
      if(rfS)p.reference=rfS[1];
      if(nmS)p.name=nmS[1].replace(/\s+(Data|Moeda|Descri|Email).*$/i,'').replace(/\s+/g,' ').trim();
      if(dtS)p.date=dtS[1];
      p.confidence=(p.amount&&p.reference)?100:80;return p;}
  }
  /* قالب إثبات ATLANTICO (Transfer to Atlântico): جدول Label/Value —
     المرجع سطر Reference حصراً، لا Account number/IBAN ولا Current account */
  if(/BANCO\s+MILLENNIUM\s+ATLANTICO|Transfer\s+to\s+Atl[âa]ntico|Transfer[êe]ncia\s+Atl[âa]ntico/i.test(t)||(/ATLANTICO/i.test(t)&&/(Reference|Refer[eê]ncia)/i.test(t)&&/(Amount|Montante)/i.test(t))){
    const ref=t.match(/(?:Reference|Refer[eê]ncia)[^\d]{0,14}(\d{6,})/i);
    const am2=t.match(/(?:Amount|Montante)[^\d]{0,14}([\d][\d.,\s\u00A0]{2,})/i);
    const nm2=t.match(/(?:\bName\b|Nome(?:\s+benefici[áa]rio)?)[\s:]{0,6}([A-ZÀ-Ú][A-ZÀ-Ú0-9 .,&\-]{3,70})/);
    const ac2=t.match(/(?:Account\s*number|N[úu]mero\s*de\s*conta)\s*\/?\s*IBAN[^\d]{0,14}([\d][\d ]{5,})/i);
    const dt2=t.match(/(\d{2}-\d{2}-\d{4})/);
    if(ref||am2){
      p.bank='ATLANTICO';p.currency='Kz';
      if(am2)p.amount=euNum(am2[1]);
      if(ref)p.reference=ref[1];
      if(nm2)p.name=nm2[1].replace(/\s+/g,' ').replace(/\s+(?:Amount|Currency|Type|Status|Current|Account|Description|Montante|Moeda|Tipo|Estado|Conta|Descri[çc][ãa]o)\b.*$/i,'').replace(/(?:\s+[A-Z]){1,2}$/,'').trim();
      if(ac2)p.receiver=ac2[1].replace(/\s+/g,'');
      if(dt2)p.date=dt2[1];
      p.confidence=(p.amount&&p.reference)?100:85;return p;}
  }
  const cm=t.match(/\b(Kz|KZ|AKZ|MRU|UM|USDT|USDC|USD|EUR|CNY|AED|AOA)\b/i);
  if(cm)p.currency=cm[1].toUpperCase().replace('AKZ','Kz').replace('AOA','Kz').replace('KZ','Kz').replace('UM','MRU');
  /* المبلغ: بعد كلماته المفتاحية أولاً — لا نلتقط أرقام الحساب/العملية */
  /* محافظ العملات الرقمية (Trust/Binance/OKX…): "Sent: 20,000 USDT", "-20,000 USDT", "20 000 USDT (TRC20)" + عنوان 0x…/T… */
  const cr=t.match(/(?:sent|send|transfer(?:red)?|withdraw(?:al)?|envoy[ée]|enviado|amount)?[:\s]*[-−]?\s*([\d][\d.,\s\u00A0]{0,14}\d|\d)\s*(USDT|USDC|USD\s*T|BUSD|BTC|ETH|TRX|BNB)\b/i);
  if(cr){p.amount=euNum(cr[1]);p.currency=cr[2].replace(/\s/g,'').toUpperCase().replace('USDC','USDT');
    const ad=t.match(/\b(0x[a-fA-F0-9]{4,}(?:\.{2,3}[a-fA-F0-9]{2,})?|T[1-9A-HJ-NP-Za-km-z]{4,}(?:\.{2,3}[1-9A-HJ-NP-Za-km-z]{2,})?)\b/);
    if(ad)p.reference=ad[1];
    const wl=t.match(/\b(Trust\s*Wallet|Binance|OKX|Bybit|KuCoin|Coinbase|MetaMask|TronLink|Kraken|Bitget|Gate\.io|HTX)\b/i);
    p.bank=wl?wl[1]:'Crypto';p.confidence=(p.amount&&p.reference)?95:70;return p;}
  const am=t.match(/(?:montant(?:\s*envoy[ée]{1,2})?|amount|montante|valor|total|transfers\.amount|المبلغ)[^\d]{0,20}([\d][\d.,\s\u00A0]{1,})/i)
        ||t.match(/([\d][\d.,\s\u00A0]{1,})\s*(?:MRU|UM)\b/i)
        ||t.match(/(?:Kz|AKZ|KZ)\s*([\d][\d.,\s\u00A0]{4,})/i)
        ||t.match(/([\d]{1,3}(?:[.,\s\u00A0]\d{3})+(?:,\d{2})?)/);
  if(am)p.amount=euNum(am[1]);
  const tref=t.replace(/(account\s*number(\s*\/?\s*iban)?|current\s*account|iban|n[úu]mero\s*de\s*conta|conta(\s*corrente)?)[^\n]{0,40}/gi,' ');
  const rm=tref.match(/Txn\s*ID\s*:?\s*([A-Z]{0,4}[0-9]{6,})/i)
        ||tref.match(/Trs\.?\s*ID\s*:?\s*([A-Z]{0,4}[0-9]{6,})/i)
        ||tref.match(/(?:ID\s*de\s*la\s*transaction|transaction\s*ID)\s*:?\s*([A-Z]{0,4}[0-9]{6,})/i)
        ||tref.match(/(?:Transac[cç][aã]o|Opera[cç][aã]o|Movimento|Refer[eê]ncia|Reference)\s*(?:de\s*\w+\s*)?(?:n[.ºo°]{0,3})?\s*[:\-]?\s*#?\s*([A-Z]{0,4}\d{5,})/i)
        ||tref.match(/(?:ref|reference|operac|transac|movimento|number)[^\d]{0,20}?([A-Z]{0,4}\d{5,})/i);
  if(rm)p.reference=rm[1].toUpperCase();
  const rv=t.match(/Receiver\s*:?\s*([0-9]{8,})/i)
        ||t.match(/(?:num[ée]ro\s*de\s*t[ée]l[ée]phone|t[ée]l[ée]phone|المستلم|المستفيد|Beneficiaire|Beneficiary|To)[^\d]{0,10}([0-9]{8,})/i)
        ||t.match(/(?:^|\D)([234]\d{7})(?!\d)/);
  if(rv)p.receiver=rv[1];
  const nv=t.match(/(?:\bà\b|B[ée]n[ée]ficiaire|المستلم|المستفيد|\bName\b|\bNome\b)\s*:?\s*([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF'. &-]{2,60})/);
  if(nv&&!/^\d+$/.test(nv[1].trim()))p.name=nv[1].trim();
  const bm=t.match(/\b(SEDAD|SADAD|BML|MASRVI|BANKILY|AMANTY|BAI|BFA|BIC|BCI|ATLANTICO|ATL|SOL|BPC|BPM|BNI|KEVE|YETU|MULTICAIXA|TRON|BIM)\b/i)||t.match(/(السداد|مصرفي|بنكيلي)/);
  if(bm)p.bank=bm[1].toUpperCase();
  const dm=t.match(/(\d{2}[-\/]\d{2}[-\/]\d{4}|\d{4}-\d{2}-\d{2})/);
  if(dm)p.date=dm[1];
  let _sc=30;if(p.amount)_sc+=25;if(p.reference)_sc+=25;if(p.bank)_sc+=10;if(p.currency)_sc+=5;if(p.date)_sc+=5;
  p.confidence=Math.min(100,_sc);
  return p;
}
function asText(p,raw){
  return ['BANK: '+(p.bank||''),'AMOUNT: '+(p.amount||0),'AMOUNT_VERBATIM: '+(p.amount_verbatim||''),
    'CURRENCY: '+(p.currency||''),'REF: '+(p.reference||p.transaction_id||''),'DATE: '+(p.date||''),
    'SENDER: '+(p.sender||''),'BENEFICIARY: '+(p.beneficiary||''),'STATUS: '+(p.status||''),
    raw?('RAW: '+raw):''].filter(Boolean).join('\n');
}
async function miniGemini(b64,mime){
  const key=KEY(); if(!key)throw new Error('NOKEY');
  const P='اقرأ هذا الإيصال البنكي وأعد JSON فقط بلا أي نص آخر: {"amount":0,"currency":"","reference":"","receiver":"","name":"","bank":"","date":""}\n- amount: رقم المبلغ فقط بلا فواصل (Montante/المبلغ/Valor/Total). ليس رقم العملية ولا الحساب ولا Movimento.\n- reference: رقم العملية (Txn ID/Reference/Movimento) كاملًا. في إثبات Transfer to Atlântico خذ سطر Reference فقط — لا Account number/IBAN ولا Current account.\n- receiver: رقم حساب أو هاتف المستلم (Receiver/Numéro/المستلم) كاملًا.\n- name: اسم المستلم الشخصي كما هو مكتوب (à .../Bénéficiaire/المستلم).\n- bank: اسم البنك أو التطبيق (Bankily/Masrvi/Sedad/BIM/BML...).\n- الفواصل الأوروبية: 3.500.000,00 تعني 3500000\n- currency: Kz أو MRU أو USD أو USDT أو USDC أو EUR أو CNY أو AED (AKZ/AOA→Kz، UM→MRU)';
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(key),
    {method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({contents:[{parts:[{text:P},{inline_data:{mime_type:mime,data:b64}}]}],
       generationConfig:{temperature:0,maxOutputTokens:240,responseMimeType:'application/json'}})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const m=(j.error&&j.error.message)||('HTTP '+r.status);
    if(r.status===429||/quota|exhausted/i.test(m))QUOTA_TRIP++;
    throw new Error(m);}
  let t=(((j.candidates||[])[0]||{}).content||{parts:[]}).parts.map(p=>p.text||'').join('');
  t=t.replace(/```json|```/g,'').trim();
  const p=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));
  QUOTA_TRIP=0; return p;
}
window.ArkanRead={
  /* readAmount(File) → {amount,ccy,txn,bank,date,eng} — المبلغ فقط، بأخف استدعاء */
  async readAmount(file){
    const mime=file.type||'image/jpeg';
    const isPdf=/pdf/i.test(mime)||/\.pdf$/i.test(file.name||'');
    let p=null,eng='';
    if(QUOTA_TRIP<2){
      try{
        await new Promise(r=>setTimeout(r,300));
        p=await miniGemini(await toB64(file),mime); eng='gemini';
      }catch(e){}
    }
    if(!p||!p.amount||!p.reference||!p.receiver){
      try{
        const raw=isPdf?await pdfText(file):await ocrText(file);
        const lp=liteParse(raw);
        if(!p||!p.amount){ p=p&&p.amount?p:lp; eng=eng||(isPdf?'pdf':'ocr'); }
        if(!p.reference&&lp.reference)p.reference=lp.reference;
        if(!p.receiver&&lp.receiver)p.receiver=lp.receiver;
        if(!p.bank&&lp.bank)p.bank=lp.bank;
      }catch(e){}
    }
    const cy=String(p.currency||'').toUpperCase().replace('AKZ','KZ').replace('AOA','KZ')
      .replace('USDC','USDT').replace('UM','MRU').replace(/^KZ$/,'Kz');
    return {amount:(+p.amount||null),ccy:cy||null,txn:p.reference||null,
            receiver:p.receiver||null,name:(p.name||'').trim()||null,
            bank:p.bank||null,date:p.date||null,eng};
  },
  /* read(File|Blob) → {parsed, text, engine} — Gemini أولاً ثم OCR المحلي */
  async read(file,opts){
    opts=opts||{};
    const mime=file.type||'image/jpeg';
    const isPdf=/pdf/i.test(mime)||/\.pdf$/i.test(file.name||'');
    /* Gemini أولاً — إلا إذا انقطعت الحصة في هذه الدفعة */
    if(QUOTA_TRIP<2){
      try{
        await new Promise(r=>setTimeout(r,350));
        const b64=await toB64(file);
        const parsed=await gemini(b64,mime);
        return {parsed,text:asText(parsed),engine:'gemini'};
      }catch(e){ if(opts.geminiOnly)throw e; }
    }
    /* المحلي: PDF → نص pdf.js | صورة → OCR */
    const raw=isPdf?await pdfText(file):await ocrText(file);
    const parsed=liteParse(raw);
    return {parsed,text:asText(parsed,raw.slice(0,1500)),engine:isPdf?'pdf':'ocr'};
  },
  gemini, ocrText, worker, liteParse, pdfText
};
})();
