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
      if(!r.ok){last=(j.error&&j.error.message)||('HTTP '+r.status);continue;}
      let t=(((j.candidates||[])[0]||{}).content||{parts:[]}).parts.map(p=>p.text||'').join('');
      t=t.replace(/```json|```/g,'').trim();
      const p=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));
      return p;
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
async function ocrText(f){
  const w=await worker();
  const {data}=await w.recognize(f);
  return data.text||'';
}
function liteParse(t){
  const p={amount:0,currency:'',reference:'',bank:'',confidence:35};
  const cm=t.match(/\b(Kz|KZ|AKZ|MRU|UM|USD|USDT|EUR|CNY|AED)\b/i); if(cm)p.currency=cm[1].toUpperCase().replace('AKZ','Kz').replace('KZ','Kz').replace('UM','MRU');
  const am=t.match(/(\d[\d\s.,]{4,})/); if(am)p.amount=parseFloat(am[1].replace(/[\s.]/g,'').replace(',','.'))||0;
  const rm=t.match(/(?:ref|reference|operac|transac|movimento)[^\d]{0,12}(\d{5,})/i); if(rm)p.reference=rm[1];
  const bm=t.match(/\b(BAI|BFA|BIC|BCI|ATLANTICO|ATL|TRON|Bankily|BIM)\b/i); if(bm)p.bank=bm[1].toUpperCase();
  return p;
}
function asText(p,raw){
  return ['BANK: '+(p.bank||''),'AMOUNT: '+(p.amount||0),'AMOUNT_VERBATIM: '+(p.amount_verbatim||''),
    'CURRENCY: '+(p.currency||''),'REF: '+(p.reference||p.transaction_id||''),'DATE: '+(p.date||''),
    'SENDER: '+(p.sender||''),'BENEFICIARY: '+(p.beneficiary||''),'STATUS: '+(p.status||''),
    raw?('RAW: '+raw):''].filter(Boolean).join('\n');
}
window.ArkanRead={
  /* read(File|Blob) → {parsed, text, engine} — Gemini أولاً ثم OCR المحلي */
  async read(file,opts){
    opts=opts||{};
    const mime=file.type||'image/jpeg';
    try{
      const b64=await toB64(file);
      const parsed=await gemini(b64,mime);
      return {parsed,text:asText(parsed),engine:'gemini'};
    }catch(e){
      if(opts.geminiOnly)throw e;
      const raw=await ocrText(file);
      const parsed=liteParse(raw);
      return {parsed,text:asText(parsed,raw.slice(0,1200)),engine:'ocr'};
    }
  },
  gemini, ocrText, worker
};
})();
