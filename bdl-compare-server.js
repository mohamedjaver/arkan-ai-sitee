/* bdl-compare-server.js — محرك قراءة الإيصالات بالجملة على الخادم (Build 1232)
   • POST /compare/job   (جسم الطلب: ZIP أو صورة/PDF خام) → jobId. الخادم يفكّ الضغط، يزيل التكرار بالبصمة،
     ويقرأ كل إيصال بـ Gemini على مرحلتين: قراءة منظمة ثم تدقيق (قراءة ثانية مستقلة + مقارنة) — لا يُكتب مبلغ
     إلا إذا اتفقت القراءتان، وإلا يُعلَّم «يحتاج مراجعة».
   • GET  /compare/job/:id?since=N → التقدم + النتائج الجديدة (تدفّق تدريجي).
   • GET  /compare/job/:id/file/:fid → الملف الأصلي (لفتح الإيصال).
   • POST /compare/feedback → تصحيحات المالك تُحفظ كأمثلة لكل بنك وتُغذّى في الطلبات التالية (few-shot) —
     هكذا «يتدرب» القارئ على إيصالاتك باستمرار.
   • الملفات والنتائج مؤقتة: تُحذف بعد 24 ساعة. لا شيء يُكتب في قاعدة التسوية. */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');

module.exports = function (app, ctx) {
  const { express, jwt, JWT_SECRET, SB_REST, SB_PUB, ownerToken } = ctx;
  const ROOT = path.join(require('os').tmpdir(), 'bdl-compare');
  fs.mkdirSync(ROOT, { recursive: true });
  const JOBS = {};                 // id → job
  const TTL = 24 * 3600e3;
  const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  /* مفتاح Claude: يُقبل بأي حالة أحرف (ANTHROPIC_KEY / Anthropic_key / ANTHROPIC_API_KEY) */
  const akey = () => { for (const k of Object.keys(process.env)) if (/^anthropic_(api_)?key$/i.test(k)) { const v = String(process.env[k] || '').trim(); if (v) return v; } return ''; };
  const CMODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const ENGINE = () => (process.env.READ_ENGINE || (akey() ? 'claude' : 'gemini')).toLowerCase();   // READ_ENGINE=gemini يعيد المحرك القديم
  async function claudeRead(prompt, b64, mime, maxTok, textOnly) {
    const content = textOnly ? [{ type: 'text', text: prompt + '\n\nنص الإيصال (مستخرج من PDF):\n' + textOnly }]
      : [mime === 'application/pdf' ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } } : { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } }, { type: 'text', text: prompt }];
    for (let a = 0; a < 4; a++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': akey(), 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: CMODEL(), max_tokens: Math.max(900, (maxTok || 300) * 3), system: 'أعد JSON صالحًا فقط، بلا أي نص قبله أو بعده وبلا أسوار كود.', messages: [{ role: 'user', content }] }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 429 || r.status === 529 || r.status >= 500) { await new Promise(res => setTimeout(res, 1500 * (a + 1) * (a + 1))); continue; }
      if (!r.ok) throw new Error('Claude ' + r.status + ': ' + ((j.error && j.error.message) || '').slice(0, 120));
      const t = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('').replace(/```json|```/g, '').trim();
      try { return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (e) { throw new Error('Claude JSON: ' + t.slice(0, 120) + (j.stop_reason === 'max_tokens' ? ' [max_tokens]' : '')); }
    }
    throw new Error('quota');
  }
  const CONC = Math.max(1, parseInt(process.env.COMPARE_CONC || '4'));

  /* ── مصادقة المالك (نفس JWT جلسة الحساب) ── */
  function auth(req) {
    try { const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); if (!JWT_SECRET) return false; jwt.verify(t, JWT_SECRET); return true; } catch (e) { return false; }
  }

  /* ── قارئ ZIP خفيف (store / deflate) بلا مكتبات ── */
  function unzip(buf) {
    const out = [];
    let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
    if (e < 0) throw new Error('not a zip');
    let n = buf.readUInt16LE(e + 10), off = buf.readUInt32LE(e + 16);
    for (let i = 0; i < n; i++) {
      if (buf.readUInt32LE(off) !== 0x02014b50) break;
      const method = buf.readUInt16LE(off + 10), csize = buf.readUInt32LE(off + 20), usize = buf.readUInt32LE(off + 24);
      const nl = buf.readUInt16LE(off + 28), el = buf.readUInt16LE(off + 30), cl = buf.readUInt16LE(off + 32), lo = buf.readUInt32LE(off + 42);
      const name = buf.slice(off + 46, off + 46 + nl).toString('utf8');
      off += 46 + nl + el + cl;
      if (/\/$/.test(name) || /__MACOSX|\.DS_Store/.test(name)) continue;
      const lnl = buf.readUInt16LE(lo + 26), lel = buf.readUInt16LE(lo + 28), ds = lo + 30 + lnl + lel;
      const data = buf.slice(ds, ds + csize);
      let content;
      try { content = method === 8 ? zlib.inflateRawSync(data) : method === 0 ? data : null; } catch (err) { content = null; }
      if (content) out.push({ name: name.split('/').pop(), data: content, size: usize });
    }
    return out;
  }
  const mimeOf = n => /\.pdf$/i.test(n) ? 'application/pdf' : /\.png$/i.test(n) ? 'image/png' : /\.webp$/i.test(n) ? 'image/webp' : 'image/jpeg';
  const isDoc = n => /\.(jpe?g|png|webp|pdf)$/i.test(n);

  /* ── أمثلة التدريب (تصحيحات المالك) ── */
  const EX_FILE = path.join(ROOT, 'examples.json');
  let EXAMPLES = []; try { EXAMPLES = JSON.parse(fs.readFileSync(EX_FILE, 'utf8')); } catch (e) {}
  async function loadExamplesFromSupabase() {
    try {
      const r = await fetch(SB_REST + '/bdl_read_examples?select=bank,fields,hint,created_at&order=created_at.desc&limit=200', { headers: { apikey: SB_PUB, Authorization: 'Bearer ' + ownerToken() } });
      if (r.ok) { const arr = await r.json(); if (arr.length) EXAMPLES = arr; }
    } catch (e) {}
  }
  loadExamplesFromSupabase();
  function examplesFor(bankHint) {
    const b = String(bankHint || '').toUpperCase();
    const pick = EXAMPLES.filter(x => !b || String(x.bank || '').toUpperCase().indexOf(b) >= 0).slice(0, 6);
    if (!pick.length) return '';
    /* قيم الأمثلة تُقنَّع (لا أرقام حقيقية) حتى لا ينسخها النموذج في إيصال آخر */
    const mask = f => JSON.stringify({ bank: f.bank || '', amount: String(f.amount || '').replace(/\d/g, '#'), currency: f.currency || '', reference: String(f.reference || '').replace(/\d/g, '#'), date: String(f.date || '').replace(/\d/g, '#') });
    return '\nأنماط حقول مؤكدة من إيصالات سابقة لهذا المالك (# = رقم؛ تعلّم الشكل والموضع فقط، ولا تنسخ أي قيمة منها):\n' + pick.map(x => mask(x.fields || {}) + (x.hint ? ' // ' + String(x.hint).slice(0, 80) : '')).join('\n') + '\n';
  }

  /* ── Gemini ── */
  const P1 = `أنت قارئ إيصالات بنكية أنغولية (BAI, BFA, BIC, ATLANTICO, SOL, KEVE, BCI, MULTICAIXA Express, Standard Bank, Yetu, Caixa Angola...).
أعد JSON فقط: {"is_bank_receipt":true,"bank":"","amount":0,"amount_verbatim":"","currency":"","reference":"","date":"","sender":"","receiver":"","confidence":0,"doc_type":""}
قواعد صارمة:
- amount: مبلغ التحويل فقط (Montante/Valor/Importância). ليس رقم العملية ولا الحساب ولا IBAN ولا الرصيد ولا الرسوم. الفاصلة العشرية البرتغالية (1.234.567,00 = 1234567)، والمسافات فواصل آلاف (Kz 7 500 000,00 = 7500000). اقرأ الأرقام واحدًا واحدًا ولا تضف رقمًا في البداية.
- amount_verbatim: المبلغ كما هو مكتوب حرفيًا.
- currency: Kz/AKZ/AOA → "AOA". إن كان الإيصال USDT/USDC/EUR/USD اكتب العملة الحقيقية.
- reference: رقم العملية/Referência/Transacção/N.º da operação/Trs ID. لا تأخذ أبدًا رقم الحساب أو IBAN (يبدأ بـ AO06 أو طويل 21 رقمًا) كمرجع.
- date: بصيغة YYYY-MM-DD HH:MM إن وُجدت.
- is_bank_receipt=false إن لم يكن إيصال تحويل بنكي أنغولي: محادثة أو رسالة فيها رموز تعبيرية، لقطة تطبيق عملات رقمية، صورة عادية، أو إيصال موريتاني (Bankily/BPM/Masrvi/Sedad/BIM/BMCI — بالأوقية MRU/UM).
- confidence: 0–100 لثقتك في amount وreference معًا.
- التاريخ في الإيصالات الأنغولية بصيغة يوم/شهر/سنة (DD/MM/YYYY). لا تخترع سنة؛ إن لم يظهر التاريخ اترك date فارغًا. التاريخ لا يكون في المستقبل أبدًا.
- تطبيقات موريتانيا (SEDAD, Bankily, Masrvi, Click, BimBank, Moov, BCI, BMCI, BNM, BPM) → currency="MRU" حتى لو لم تُكتب العملة. amount بالأوقية كما هو.
- صورة شارع/أشخاص/حيوان/كتالوج/فاتورة تجارية/عرض أسعار/محادثة → is_bank_receipt=false وdoc_type يصف الصورة (photo/catalog/invoice/chat). المبلغ في الفاتورة التجارية ليس تحويلًا بنكيًا.
- المبلغ المنطقي للتحويل بين 100 و500,000,000 Kz. رقم أطول من 9 خانات ليس مبلغًا.`;
  const P2 = (c) => `تحقّق مستقل. اقرأ هذا الإيصال من جديد رقمًا رقمًا وأعد JSON فقط:
{"amount_verbatim":"","amount":0,"currency":"","reference":"","agree_amount":true,"agree_reference":true,"note":""}
- amount_verbatim أولًا كما هو مكتوب (مثل "Kz 7 500 000,00")، ثم amount رقمًا بلا فواصل. المسافات والنقاط فواصل آلاف.
قراءة أولى مقترحة: amount=${c.amount || 0} currency=${c.currency || ''} reference=${c.reference || ''}.
لا تُصدّق القراءة الأولى — اقرأ بنفسك ثم قارن: agree_amount=true فقط إذا كان مبلغك مطابقًا تمامًا، وagree_reference=true فقط إذا كان المرجع مطابقًا.
تذكّر: المبلغ ليس رقم الحساب ولا IBAN ولا الرصيد ولا الرسوم.`;
  /* ── PDF: طبقة النص (pdfjs-dist بلا canvas) — احتياط عندما لا يقرأ Gemini ملف الـ PDF مباشرة ── */
  let _pdfjs = null;
  async function pdfText(buf) {
    try {
      if (!_pdfjs) _pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = await _pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true, isEvalSupported: false, useSystemFonts: false, standardFontDataUrl: path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts/') }).promise;
      let out = '';
      for (let i = 1; i <= Math.min(doc.numPages, 3); i++) { const pg = await doc.getPage(i); const tc = await pg.getTextContent(); let last = null; tc.items.forEach(it => { if (last != null && Math.abs(last - it.transform[5]) > 2) out += '\n'; out += it.str + (it.hasEOL ? '\n' : ' '); last = it.transform[5]; }); out += '\n'; }
      return out.replace(/[ \t]+/g, ' ').trim();
    } catch (e) {
      /* بلا pdfjs (لم يُثبَّت بعد على Railway): استخراج بدائي من تيارات FlateDecode */
      try {
        let out = '', i = 0; const s = buf.toString('latin1');
        while ((i = s.indexOf('stream', i)) >= 0) { let a = i + 6; if (s[a] === '\r') a++; if (s[a] === '\n') a++; const e = s.indexOf('endstream', a); if (e < 0) break; let t = null; try { t = zlib.inflateSync(buf.slice(a, e)).toString('latin1'); } catch (er) { t = s.slice(a, e); } (t.match(/\(((?:\\.|[^\\)])*)\)\s*Tj|\[((?:[^\]]|\\\])*)\]\s*TJ/g) || []).forEach(m => { out += m.replace(/\)\s*-?\d+(?:\.\d+)?\s*\(/g, '').replace(/^\[|\]\s*TJ$|\(|\)\s*Tj$/g, '').replace(/\\([()\\])/g, '$1') + ' '; }); out += '\n'; i = e + 9; }
        return out.replace(/[ \t]+/g, ' ').trim();
      } catch (e2) { return ''; }
    }
  }
  async function gem(key, prompt, b64, mime, maxTok, textOnly) {
    if (ENGINE() === 'claude' && akey()) return claudeRead(prompt, b64, mime, maxTok, textOnly);
    if (!key) throw new Error('no gemini key');
    for (let a = 0; a < 4; a++) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + encodeURIComponent(key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: textOnly ? [{ text: prompt + '\n\nنص الإيصال (مستخرج من PDF):\n' + textOnly }] : [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }] }], generationConfig: { temperature: 0, maxOutputTokens: maxTok || 300, responseMimeType: 'application/json' } })
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 429 || r.status >= 500) { await new Promise(res => setTimeout(res, 1500 * (a + 1) * (a + 1))); continue; }
      if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
      let t = (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
      return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    }
    throw new Error('quota');
  }
  const num = v => { if (v == null) return null; if (typeof v === 'number') return isFinite(v) && v > 0 ? v : null; let s = String(v).replace(/[^\d.,]/g, ''); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, ''); const n = Number(s); return isFinite(n) && n > 0 ? n : null; };
  const ccyN = c => { c = String(c || '').toUpperCase(); return /KZ|AKZ|AOA/.test(c) ? 'AOA' : /UM|MRU|OUGUIYA|أوقية/.test(c) ? 'MRU' : c || null; };
  const MRU_APP = /SEDAD|BANKILY|MASR[IV]?VI|CLICK|BIM\s?BANK|MOOV|GAZA|BCI\s*MAURI|BMCI|\bBNM\b|\bBPM\b|أوقية|اوقية|سداد|بنكيلي|مصرفي/i;
  const AMAX = 500e6, AMIN = 100;
  /* بوابة السلامة على الخادم: مبلغ منطقي، تاريخ منطقي، عملة موريتانية */
  function gate(r) {
    r.flags = [];
    if (!r.ccy && MRU_APP.test((r.bank || '') + ' ' + (r.who || '') + ' ' + (r.receiver || ''))) r.ccy = 'MRU';
    if (r.amount != null && (r.ccy === 'AOA' || !r.ccy)) {
      const refD = String(r.ref || '').replace(/\D/g, '');
      if (r.amount > AMAX || r.amount < AMIN || (refD && String(Math.round(r.amount)) === refD)) { r.amountRead = r.amount; r.amount = null; r.review = true; r.verified = false; r.flags.push('amount-implausible'); }
    }
    if (r.date) {
      const d = new Date(String(r.date).replace(' ', 'T')); const now = Date.now();
      if (isNaN(d) || d.getTime() > now + 864e5 || d.getFullYear() < 2020) { r.dateBad = String(r.date).slice(0, 16); r.date = null; r.flags.push('date-implausible'); }
    }
    return r;
  }

  /* ── المدقّق (قواعد + نداء موجَّه) ── */
  const ptnum = v => { if (v == null) return null; let x = String(v).replace(/[^\d.,\s]/g, '').trim().replace(/\s+/g, ''); if (!x) return null; if (/,\d{1,2}$/.test(x)) x = x.replace(/\./g, '').replace(',', '.'); else if (/\.\d{1,2}$/.test(x) && !/\.\d{3}(\.|$)/.test(x)) x = x.replace(/,/g, ''); else x = x.replace(/[.,]/g, ''); const n = Number(x); return isFinite(n) && n > 0 ? n : null; };
  function auditRules(r) { const f = []; if (!r.amount) return f; const a = Math.round(r.amount), ad = String(a), rd = (r.ref || '').replace(/\D/g, '');
    if (rd && (ad === rd || (rd.length >= 8 && ad.length >= 6 && rd.includes(ad)))) f.push('المبلغ يبدو رقم عملية/حساب');
    if (a < 500) f.push('مبلغ صغير جدًا للكوانزا'); if (a > 800000000) f.push('مبلغ ضخم غير معتاد'); if (ad.length >= 13) f.push('المبلغ بطول IBAN/حساب');
    if (!r.ref && /BAI|BFA|ATLANTICO|SOL|BIC|KEVE|BCI|STANDARD|YETU/i.test(r.bank || '')) f.push('بنك معروف بلا رقم عملية');
    if (r.ccy && r.ccy !== 'AOA') f.push('العملة المقروءة ' + r.ccy); return f; }
  const PA = (r, why) => `أنت مدقق حسابات محترف. هذا إيصال بنكي أنغولي قُرئ كالتالي: amount=${r.amount || ''} reference=${r.ref || ''} bank=${r.bank || ''}.
شكوك المدقق: ${why.join('؛ ')}.
افحص الإيصال بتمعّن وأعد JSON فقط: {"amount":0,"amount_verbatim":"","reference":"","currency":"","date":"","is_bank_receipt":true,"verdict":"ok|fixed|reject","note":""}
verdict=ok إن كانت القراءة صحيحة، fixed إن صحّحت شيئًا، reject إن لم يكن إيصال تحويل كوانزا. المبلغ = Montante/Valor/Importância فقط، ليس رقم العملية ولا الحساب ولا IBAN ولا الرسوم.`;
  async function auditOne(job, it, r, txt) {
    const why = auditRules(r); if (!why.length) return r;
    try { const isPdf = mimeOf(it.name) === 'application/pdf'; const v = await gem(job.key, PA(r, why), isPdf && txt ? null : it.data.toString('base64'), isPdf && txt ? null : mimeOf(it.name), 300, isPdf && txt ? txt : null);
      if (v.is_bank_receipt === false || v.verdict === 'reject') { r.isReceipt = false; r.auditNote = 'المدقق: ليس إيصال تحويل كوانزا' + (v.note ? ' — ' + v.note : ''); return r; }
      const a2 = num(v.amount), vb = ptnum(v.amount_verbatim); const good = a2 != null && (vb == null || Math.abs(vb - a2) < 0.5);
      if (v.verdict === 'fixed' && good) { if (Math.abs(a2 - (r.amount || 0)) > 0.5) { r.amountRead = r.amount; r.amount = a2; } const ref2 = String(v.reference || '').trim(); if (ref2 && !/^AO\d{2}/i.test(ref2) && ref2.replace(/\D/g, '').length !== 21) r.ref = ref2.slice(0, 64); if (v.date) r.date = v.date; r.review = false; r.verified = true; r.auditNote = 'صحّح المدقق: ' + why.join('، '); }
      else if (v.verdict === 'ok' && good && Math.abs(a2 - (r.amount || 0)) < 0.5) { r.review = false; r.verified = true; r.auditNote = 'أكّد المدقق القراءة'; }
      else { r.review = true; r.auditNote = 'المدقق غير متأكد — راجع الصورة'; }
    } catch (e) {}
    return r; }
  async function readOne(job, it) {
    if (!it.data) { try { const f = fs.readdirSync(job.dir).find(n => n.startsWith(it.fid + '_')); if (f) it.data = fs.readFileSync(path.join(job.dir, f)); } catch (e) {} }   // من القرص عند الحاجة
    const b64 = it.data.toString('base64'), mime = mimeOf(it.name), isPdf = mime === 'application/pdf';
    let p1 = null, txt = null, eng = (ENGINE() === 'claude' && akey() ? 'claude' : 'gemini') + '-image', err1 = '';
    try { p1 = await gem(job.key, P1 + examplesFor(''), b64, mime, 320); } catch (e) { if (!isPdf) throw e; err1 = String(e.message || e).slice(0, 80); }
    if (isPdf && (!p1 || p1.is_bank_receipt === false || !num(p1.amount))) {
      /* Gemini لم يفتح الـ PDF أو لم يجد مبلغًا: طبقة النص ثم قراءة نصية بقراءتين */
      txt = await pdfText(it.data);
      if (txt && txt.length > 30) { try { const p1t = await gem(job.key, P1 + examplesFor(''), null, null, 320, txt); if (p1t && num(p1t.amount)) { p1 = p1t; eng = 'pdf-text'; err1 = ''; } else if (!p1) p1 = p1t || {}; } catch (e) { if (!p1) p1 = {}; err1 = err1 || String(e.message || e).slice(0, 80); } }
      else if (!p1) p1 = {};
      if (!num(p1.amount) && (!txt || txt.length <= 30)) err1 = err1 || 'pdf-scan: لا طبقة نص — ارفعه صورة أو اكتب المبلغ';
    }
    if (!p1) p1 = {};
    const r = { bank: String(p1.bank || '').slice(0, 40), amount: num(p1.amount), ccy: ccyN(p1.currency), ref: String(p1.reference || '').trim().slice(0, 64), date: p1.date || null,
      who: String(p1.sender || p1.receiver || '').slice(0, 80), receiver: String(p1.receiver || '').slice(0, 80), conf: Number(p1.confidence) || 0, isReceipt: p1.is_bank_receipt !== false, docType: p1.doc_type || '' };
    if (r.ref && /^AO\d{2}/i.test(r.ref)) r.ref = '';                       // IBAN ليس مرجعًا
    if (r.ref && r.amount && String(Math.round(r.amount)) === r.ref.replace(/\D/g, '')) r.ref = '';
    r.review = false; r.verified = false;
    if (r.isReceipt && r.amount) {
      try {
        const p2 = await gem(job.key, P2(p1) + examplesFor(r.bank), b64, mime, 200, eng === 'pdf-text' ? txt : null);
        const a2 = num(p2.amount) || num(p2.amount_verbatim); const ref2 = String(p2.reference || '').trim();
        const sameA = a2 != null && Math.abs(a2 - r.amount) < 0.5, sameR = !r.ref || !ref2 || ref2.replace(/\s+/g, '').toLowerCase() === r.ref.replace(/\s+/g, '').toLowerCase();
        if (sameA && sameR) { r.verified = true; if (!r.ref && ref2) r.ref = ref2.slice(0, 64); }
        else { r.review = true; r.alt = { amount: a2, ref: ref2 }; if (!sameA && (p2.agree_amount === false)) { /* تعارض حقيقي: لا نكتب مبلغًا */ r.amountRead = r.amount; r.amount = null; } }
      } catch (e) { r.review = r.conf < 85; }
    } else if (r.isReceipt) r.review = true;
    await auditOne(job, it, r, txt);
    r.eng = eng; if (err1) r.err = err1;
    return gate(r);
  }

  async function run(job) {
    job.status = 'reading';
    let i = 0;
    const worker = async () => {
      while (i < job.items.length && !job.cancel) {
        const idx = i++, it = job.items[idx];
        try {
          const r = await readOne(job, it);
          job.results.push(Object.assign({ fid: it.fid, name: it.name, pdf: /pdf$/i.test(it.name), size: it.size, fp: it.fp }, r)); it.data = null;   // تحرير الذاكرة
        } catch (e) { job.results.push({ fid: it.fid, name: it.name, pdf: /pdf$/i.test(it.name), fp: it.fp, fail: true, err: String(e.message || e).slice(0, 120), review: true }); if (/quota|API key|403/i.test(String(e.message))) job.warn = String(e.message).slice(0, 160); }
        job.done++;
      }
    };
    await Promise.all(Array.from({ length: CONC }, worker));
    job.status = job.cancel ? 'cancelled' : 'done'; job.finished = Date.now();
  }

  /* ── الرفع ── */
  function createJob(buf, name, side, key) {
    const id = crypto.randomBytes(8).toString('hex'); const dir = path.join(ROOT, id); fs.mkdirSync(dir);
    let files = [];
    try { files = /\.zip$/i.test(name) || buf.readUInt32LE(0) === 0x04034b50 ? unzip(buf).filter(f => isDoc(f.name)) : [{ name, data: buf, size: buf.length }]; }
    catch (e) { throw new Error('bad zip'); }
    const seen = new Set(); const items = [];
    for (const f of files) {
      const fp = crypto.createHash('sha256').update(f.data).digest('hex'); if (seen.has(fp)) continue; seen.add(fp);
      const fid = crypto.randomBytes(6).toString('hex'); fs.writeFileSync(path.join(dir, fid + '_' + f.name.replace(/[^\w.\-]/g, '_')), f.data);
      items.push({ fid, name: f.name, size: f.size, fp });   // البيانات تُقرأ من القرص عند الحاجة — لا نحتفظ بـ400MB في الذاكرة
    }
    const job = { id, dir, side, key, created: Date.now(), total: items.length, done: 0, dup: files.length - items.length, items, results: [], status: 'queued' };
    JOBS[id] = job; run(job).catch(e => { job.status = 'error'; job.warn = String(e.message); });
    return job;
  }
  app.post('/compare/job', express.raw({ type: '*/*', limit: '1500mb' }), async (req, res) => {
    if (!auth(req)) return res.status(401).json({ ok: false, err: 'auth' });
    const key = String(req.headers['x-gemini-key'] || process.env.GEMINI_KEY || '').trim();
    if (!key && !(ENGINE() === 'claude' && akey())) return res.status(400).json({ ok: false, err: 'no gemini key' });
    const buf = req.body; if (!buf || !buf.length) return res.status(400).json({ ok: false, err: 'empty' });
    try { const job = createJob(buf, String(req.headers['x-file-name'] || 'upload'), req.headers['x-side'] === 'sup' ? 'sup' : 'cust', key); res.json({ ok: true, id: job.id, total: job.total, dup: job.dup }); }
    catch (e) { res.status(400).json({ ok: false, err: e.message }); }
  });
  /* ── رفع مجزّأ للملفات الكبيرة (ZIP بمئات الميغابايت): أجزاء 8MB تُلحق بملف مؤقت ثم تُعالج ── */
  const UPS = {};
  app.post('/compare/upload/start', express.json(), (req, res) => { if (!auth(req)) return res.status(401).json({ ok: false, err: 'auth' }); const uid = crypto.randomBytes(8).toString('hex'); const p = path.join(ROOT, 'up_' + uid); fs.writeFileSync(p, ''); UPS[uid] = { p, at: Date.now(), size: 0 }; res.json({ ok: true, uid }); });
  app.get('/compare/upload/:uid/status', (req, res) => { if (!auth(req)) return res.status(401).json({ ok: false, err: 'auth' }); const u = UPS[req.params.uid]; if (!u) return res.status(404).json({ ok: false, err: 'no upload' }); res.json({ ok: true, size: u.size, next: u.next || 0 }); });
  app.post('/compare/upload/:uid/chunk', express.raw({ type: '*/*', limit: '32mb' }), (req, res) => { if (!auth(req)) return res.status(401).json({ ok: false, err: 'auth' }); const u = UPS[req.params.uid]; if (!u) return res.status(404).json({ ok: false, err: 'no upload' }); if (!req.body || !req.body.length) return res.status(400).json({ ok: false, err: 'empty' });
    const idx = parseInt(req.headers['x-chunk-index'] || '-1', 10); if (idx >= 0 && idx < (u.next || 0)) return res.json({ ok: true, size: u.size, next: u.next, dup: true });   // جزء مكرر بعد انقطاع — يُتجاهل
    fs.appendFileSync(u.p, req.body); u.size += req.body.length; u.next = (idx >= 0 ? idx + 1 : (u.next || 0) + 1); u.at = Date.now(); res.json({ ok: true, size: u.size, next: u.next }); });
  app.post('/compare/upload/:uid/finish', express.json(), async (req, res) => { if (!auth(req)) return res.status(401).json({ ok: false, err: 'auth' }); const u = UPS[req.params.uid]; if (!u) return res.status(404).json({ ok: false, err: 'no upload' });
    const key = String(req.headers['x-gemini-key'] || process.env.GEMINI_KEY || '').trim(); if (!key && !(ENGINE() === 'claude' && akey())) return res.status(400).json({ ok: false, err: 'no gemini key' });
    try { const buf = fs.readFileSync(u.p); fs.unlinkSync(u.p); delete UPS[req.params.uid]; const b = req.body || {}; const job = createJob(buf, String(b.name || 'upload.zip'), b.side === 'sup' ? 'sup' : 'cust', key); res.json({ ok: true, id: job.id, total: job.total, dup: job.dup }); }
    catch (e) { try { fs.unlinkSync(u.p); } catch (x) {} delete UPS[req.params.uid]; res.status(400).json({ ok: false, err: e.message }); } });
  setInterval(() => { const now = Date.now(); for (const k in UPS) if (now - UPS[k].at > 24 * 3600e3) { try { fs.unlinkSync(UPS[k].p); } catch (e) {} delete UPS[k]; } }, 600e3);
  app.get('/compare/job/:id', (req, res) => {
    if (!auth(req)) return res.status(401).json({ ok: false, err: 'auth' });
    const j = JOBS[req.params.id]; if (!j) return res.status(404).json({ ok: false, err: 'no job' });
    const since = parseInt(req.query.since || '0');
    res.json({ ok: true, id: j.id, status: j.status, total: j.total, done: j.done, dup: j.dup, warn: j.warn || null, side: j.side, results: j.results.slice(since), next: j.results.length, expires: j.created + TTL });
  });
  app.post('/compare/job/:id/cancel', (req, res) => { if (!auth(req)) return res.status(401).json({ ok: false }); const j = JOBS[req.params.id]; if (j) j.cancel = true; res.json({ ok: true }); });
  app.get('/compare/job/:id/file/:fid', (req, res) => {
    const j = JOBS[req.params.id]; if (!j) return res.status(404).end();
    const f = fs.readdirSync(j.dir).find(n => n.startsWith(req.params.fid + '_')); if (!f) return res.status(404).end();
    res.setHeader('Content-Type', mimeOf(f)); res.setHeader('Cache-Control', 'private, max-age=3600'); fs.createReadStream(path.join(j.dir, f)).pipe(res);
  });
  /* ── التعلّم من التصحيح ── */
  app.post('/compare/feedback', express.json({ limit: '200kb' }), async (req, res) => {
    if (!auth(req)) return res.status(401).json({ ok: false, err: 'auth' });
    const b = req.body || {}; const ex = { bank: String(b.bank || '').slice(0, 40), fields: { bank: b.bank || '', amount: Number(b.amount) || 0, currency: b.ccy || 'AOA', reference: String(b.ref || '').slice(0, 64), date: b.date || '' }, hint: String(b.hint || '').slice(0, 300), created_at: new Date().toISOString() };
    if (!ex.fields.amount) return res.status(400).json({ ok: false, err: 'no amount' });
    EXAMPLES.unshift(ex); EXAMPLES = EXAMPLES.slice(0, 400);
    try { fs.writeFileSync(EX_FILE, JSON.stringify(EXAMPLES)); } catch (e) {}
    try { await fetch(SB_REST + '/bdl_read_examples', { method: 'POST', headers: { apikey: SB_PUB, Authorization: 'Bearer ' + ownerToken(), 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(ex) }); } catch (e) {}
    res.json({ ok: true, n: EXAMPLES.length });
  });
  /* ── تنظيف 24 ساعة ── */
  setInterval(() => { const now = Date.now(); for (const id in JOBS) { const j = JOBS[id]; if (now - j.created > TTL) { try { fs.rmSync(j.dir, { recursive: true, force: true }); } catch (e) {} delete JOBS[id]; } } }, 30 * 60e3);
  console.log('▲ compare batch engine ready (' + MODEL + ', x' + CONC + ')');
  app.locals.cmpReadOne = readOne;   // للأنبوب (واتساب)
};
