const GEM_SCHEMA=`{"transaction_id":"","reference":"","bank":"","amount":0,"currency":"","date":"YYYY-MM-DD","time":"","country":"","beneficiary":"","sender":"","wallet_address":"","iban":"","swift":"","fee":0,"exchange_rate":"","status":"","institution":"","branch":"","notes":"","doc_type":"","receipt_side":"","field_confidence":{"amount":0,"currency":0,"date":0,"reference":0,"bank":0,"sender":0,"beneficiary":0},"quality":{"cropped":false,"blurry":false,"edited_suspicion":false,"missing_corners":false,"issues":""},"confidence":0}`;
const GEM_PROMPT=`أنت محرك OCR مالي مؤسسي. اقرأ هذا المستند (قد يكون بالعربية أو الفرنسية أو الإنجليزية أو البرتغالية أو الصينية): إيصال بنكي، تحويل، كشف حساب، إيصال كريبتو، SWIFT، أو فاتورة.
اقرأ كل حرف ثم افهم المعنى واستخرج JSON فقط بلا أي نص آخر وبهذه البنية حرفيًا:
${GEM_SCHEMA}
- amount رقم فقط بلا فواصل، وأضف حقلاً "amount_verbatim" فيه نص المبلغ حرفيًا كما هو مكتوب في المستند (مثل "Kz 8 780 000,00").
- المبلغ هو قيمة حقل Montante/المبلغ/Total/Valor فقط (مثل: Kz 8 000 000,00 → 8000000). لا تضع أبدًا في amount أرقام Movimento أو Número de Operação أو Transacção أو CHAVE أو PIN أو Conta/IBAN — هذه أرقام تعريفية تذهب في transaction_id/reference.
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
  const cm=t.match(/\b(Kz|KZ|AKZ|MRU|UM|USD|USDT|EUR|CNY|AED|AOA)\b/i);
  if(cm)p.currency=cm[1].toUpperCase().replace('AKZ','Kz').replace('AOA','Kz').replace('KZ','Kz').replace('UM','MRU');
  /* المبلغ: بعد كلماته المفتاحية أولاً — لا نلتقط أرقام الحساب/العملية */
  const am=t.match(/(?:amount|montante|valor|total|transfers\.amount|المبلغ)[^\d]{0,20}([\d][\d.,\s\u00A0]{2,})/i)
        ||t.match(/(?:Kz|AKZ|KZ)\s*([\d][\d.,\s\u00A0]{4,})/i)
        ||t.match(/([\d]{1,3}(?:[.,\s\u00A0]\d{3})+(?:,\d{2})?)/);
  if(am)p.amount=euNum(am[1]);
  const rm=t.match(/Txn\s*ID\s*:?\s*([A-Z]{0,4}[0-9]{6,})/i)
        ||t.match(/(?:ID\s*de\s*la\s*transaction|transaction\s*ID)\s*:?\s*([A-Z]{0,4}[0-9]{6,})/i)
        ||t.match(/(?:ref|reference|operac|transac|movimento|number)[^\dA-Z]{0,15}([A-Z]{0,4}\d{5,})/i);
  if(rm)p.reference=rm[1].toUpperCase();
  const rv=t.match(/Receiver\s*:?\s*([0-9]{8,})/i)
        ||t.match(/(?:num[ée]ro\s*de\s*t[ée]l[ée]phone|t[ée]l[ée]phone|المستلم|المستفيد|Beneficiaire|Beneficiary|To)[^\d]{0,10}([0-9]{8,})/i)
        ||t.match(/(?:^|\D)([234]\d{7})(?!\d)/);
  if(rv)p.receiver=rv[1];
  const nv=t.match(/(?:\bà\b|B[ée]n[ée]ficiaire|المستلم|المستفيد)\s*:?\s*([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF' ]{2,32})/);
  if(nv&&!/^\d+$/.test(nv[1].trim()))p.name=nv[1].trim();
  const bm=t.match(/\b(SEDAD|SADAD|BML|MASRVI|BANKILY|AMANTY|BAI|BFA|BIC|BCI|ATLANTICO|ATL|TRON|BIM)\b/i)||t.match(/(السداد|مصرفي|بنكيلي)/);
  if(bm)p.bank=bm[1].toUpperCase();
  const dm=t.match(/(\d{2}[-\/]\d{2}[-\/]\d{4}|\d{4}-\d{2}-\d{2})/);
  if(dm)p.date=dm[1];
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
  const P='اقرأ هذا الإيصال البنكي وأعد JSON فقط بلا أي نص آخر: {"amount":0,"currency":"","reference":"","receiver":"","name":"","bank":"","date":""}\n- amount: رقم المبلغ فقط بلا فواصل (Montante/المبلغ/Valor/Total). ليس رقم العملية ولا الحساب ولا Movimento.\n- reference: رقم العملية (Txn ID/Reference/Movimento) كاملًا.\n- receiver: رقم حساب أو هاتف المستلم (Receiver/Numéro/المستلم) كاملًا.\n- name: اسم المستلم الشخصي كما هو مكتوب (à .../Bénéficiaire/المستلم).\n- bank: اسم البنك أو التطبيق (Bankily/Masrvi/Sedad/BIM/BML...).\n- الفواصل الأوروبية: 3.500.000,00 تعني 3500000\n- currency: Kz أو MRU أو USD أو USDT أو EUR أو CNY أو AED (AKZ/AOA→Kz، UM→MRU)';
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
    const cy=String(p.currency||'').replace('AKZ','Kz').replace('AOA','Kz').replace('KZ','Kz').replace('UM','MRU');
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
  gemini, ocrText, worker
};
})();
