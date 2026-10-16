/* bdl-lab-server.js — مختبر المطابقة على الخادم (Build 1442)
   الهاتف يرفع ملفات WhatsApp ZIP (موردين + زبائن) ثم يُغلق الصفحة؛ الخادم يفكّها ويحسب البصمات ويُسقط المطابق بالصورة
   ويقرأ الباقي بـ Claude (وPDF البنوك الأنغولية من طبقة النص محليًا)، ويحفظ النتيجة 24 ساعة. عند العودة يسحب الهاتف
   القراءات ويُكمل المطابقة فورًا من نقاط الحفظ.
   المسارات (JWT المالك):
     POST /lab/job                         → {id}
     PUT  /lab/job/:id/file?side=s|c&name= → يرفع ZIP واحدًا (raw)
     POST /lab/job/:id/start               → يبدأ المعالجة
     GET  /lab/job/:id                     → {state,ph,d,n,err} وعند done: items:[{side,cn,nm,fp,sz,p}]
     DELETE /lab/job/:id */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
module.exports = function (app, ctx) {
  const { express, jwt, JWT_SECRET } = ctx;
  const DIR = path.join(require('os').tmpdir(), 'bdl-lab');
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) {}
  const auth = req => { try { return jwt.verify(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''), JWT_SECRET) || null; } catch (e) { return null; } };
  const wrap = fn => async (req, res) => { const t = auth(req); if (!t) return res.status(401).json({ error: 'الجلسة منتهية — افتح account.html' }); try { res.json(await fn(req, t)); } catch (e) { res.status(500).json({ error: String((e && e.message) || e).slice(0, 300) }); } };
  const JOBS = {};
  const jdir = id => path.join(DIR, id);
  const save = j => { try { fs.writeFileSync(path.join(jdir(j.id), 'state.json'), JSON.stringify({ id: j.id, owner: j.owner, state: j.state, ph: j.ph, d: j.d, n: j.n, err: j.err, at: j.at, files: j.files, items: j.state === 'done' ? j.items : undefined })); } catch (e) {} };
  const load = id => { if (JOBS[id]) return JOBS[id]; try { const j = JSON.parse(fs.readFileSync(path.join(jdir(id), 'state.json'), 'utf8')); if (j.state === 'run') { j.state = 'error'; j.err = 'أُعيد تشغيل الخادم أثناء المعالجة — ابدأ من جديد'; } JOBS[id] = j; return j; } catch (e) { return null; } };
  const sha = b => crypto.createHash('sha256').update(b).digest('hex');
  const isDoc = n => /\.(jpe?g|png|webp|pdf)$/i.test(n) && !/STICKER|-STK-/i.test(n);
  const day = nm => { let m = String(nm).match(/(?:PHOTO|DOC|GIF|VIDEO|PTT|AUDIO)-(20\d{2})-(\d{2})-(\d{2})/i); if (!m) m = String(nm).match(/(?:IMG|DOC|VID|PTT|AUD)-(20\d{2})(\d{2})(\d{2})-WA/i); return m ? m[1] + m[2] + m[3] : ''; };
  const zName = n => { n = String(n || '').replace(/\.zip$/i, '').replace(/\s*\(\d+\)\s*$/, ''); const m = n.match(/WhatsApp Chat\s*[-–]\s*(.+)$/i) || n.match(/WhatsApp Chat with\s+(.+)$/i) || n.match(/Conversa do WhatsApp com\s+(.+)$/i) || n.match(/محادثة (?:واتساب|WhatsApp) مع\s+(.+)$/); return m ? m[1].trim() : n; };
  /* ── قارئ ZIP مدمج (الدليل المركزي؛ stored + deflate) ── */
  function zipEntries(buf) {
    let e = buf.length - 22; const min = Math.max(0, buf.length - 65557);
    while (e >= min && buf.readUInt32LE(e) !== 0x06054b50) e--;
    if (e < min) throw new Error('ليس ملف ZIP صالحًا');
    let n = buf.readUInt16LE(e + 10), off = buf.readUInt32LE(e + 16); if (n === 0xffff || off === 0xffffffff) throw new Error('ZIP64 غير مدعوم — قسّم الملف');
    const out = [];
    for (let i = 0; i < n; i++) {
      if (buf.readUInt32LE(off) !== 0x02014b50) break;
      const method = buf.readUInt16LE(off + 10), csize = buf.readUInt32LE(off + 20), usize = buf.readUInt32LE(off + 24), fl = buf.readUInt16LE(off + 28), xl = buf.readUInt16LE(off + 30), cl = buf.readUInt16LE(off + 32), lho = buf.readUInt32LE(off + 42);
      const name = buf.toString('utf8', off + 46, off + 46 + fl); off += 46 + fl + xl + cl;
      if (name.endsWith('/')) continue;
      out.push({ name, method, csize, usize, lho });
    }
    return out;
  }
  function zipRead(buf, en) {
    const h = en.lho; if (buf.readUInt32LE(h) !== 0x04034b50) throw new Error('bad local header');
    const fl = buf.readUInt16LE(h + 26), xl = buf.readUInt16LE(h + 28), st = h + 30 + fl + xl, data = buf.subarray(st, st + en.csize);
    if (en.method === 0) return Buffer.from(data); if (en.method === 8) return zlib.inflateRawSync(data); throw new Error('ضغط غير مدعوم ' + en.method);
  }
  /* ── PDF البنوك الأنغولية من طبقة النص ── */
  let pdfjsP = null; const pdfjs = () => pdfjsP || (pdfjsP = import('pdfjs-dist/legacy/build/pdf.mjs').catch(() => import('pdfjs-dist')));
  async function pdfText(buf) { const lib = await pdfjs(); const doc = await lib.getDocument({ data: new Uint8Array(buf), disableWorker: true, isEvalSupported: false }).promise; let out = ''; for (let i = 1; i <= Math.min(doc.numPages, 3); i++) { const pg = await doc.getPage(i); const tc = await pg.getTextContent(); out += tc.items.map(it => it.str).join(' ') + '\n'; } try { doc.destroy(); } catch (e) {} return out; }
  function numAO(t) { t = String(t || '').replace(/\s|\./g, '').replace(',', '.'); const v = parseFloat(t); return isFinite(v) ? Math.round(v * 100) / 100 : 0; }
  function parseAO(txt) { if (!txt || txt.replace(/\s/g, '').length < 40) return null; const T = txt.replace(/ /g, ' '), U = T.toUpperCase(); let m; const p = { amount: 0, ref: '', bank: '', date: '', name: '', account: '', receiver: '', sender: '', ccy: '', status: '' };
    m = /(?:MONTANTE|VALOR(?: DA TRANSFER[ÊE]NCIA)?|IMPORT[ÂA]NCIA|AMOUNT|TOTAL A DEBITAR)\s*[:\-]?\s*(?:KZ|AOA|AKZ)?\s*([0-9][0-9 .]*,[0-9]{2})/i.exec(T) || /(?:KZ|AOA|AKZ)\s*([0-9][0-9 .]*,[0-9]{2})(?!\s*\d)/i.exec(T) || /([0-9][0-9 .]*,[0-9]{2})\s*(?:KZ|AOA|AKZ)/i.exec(T);
    if (m) p.amount = numAO(m[1]); if (!p.amount) return null; p.ccy = 'AOA';
    const RF = ['N[ÚU]MERO DE OPERA[ÇC][ÃA]O', 'N[ºO.]?\\s*(?:DE )?OPERA[ÇC][ÃA]O', 'REFER[ÊE]NCIA(?: DA OPERA[ÇC][ÃA]O| DO MOVIMENTO| DA TRANSA[ÇC][ÃA]O)?', 'ID DA TRANSA[ÇC][ÃA]O', 'TRANSACTION(?: ID| REFERENCE)?', 'N[ÚU]MERO DO DOCUMENTO', '(?:^|[^A-Z])MOVIMENTO'];
    for (let ri = 0; ri < RF.length && !p.ref; ri++) { m = new RegExp(RF[ri] + '\\s*[:#Nº.]*\\s*(?=[A-Z0-9\\-\\/]*\\d)([A-Z0-9][A-Z0-9\\-\\/]{5,})', 'i').exec(T); if (m) p.ref = m[1]; }
    let ib = (T.match(/AO06\s*[0-9][0-9 ]{19,}/g) || []).map(x => x.replace(/\s/g, ''));
    m = /(?:CONTA\s*\/\s*IBAN|IBAN(?: DO BENEFICI[ÁA]RIO| DESTINO)?|CONTA DESTINO|CONTA DE DESTINO)\s*[:]*\s*(AO06\s*[0-9][0-9 ]{19,})/i.exec(T.slice(Math.max(0, U.indexOf('BENEFICI')))); if (m) p.account = m[1].replace(/\s/g, '');
    if (!p.account) p.account = ib.length >= 2 ? ib[1] : ib[0] || '';
    const NM = '\\s*:?\\s*([A-ZÀ-Ü][A-ZÀ-Ü0-9 .,&\'\\-]{2,90}?)(?=\\s*(?:IBAN|CONTA|BANCO|PARA\\b|DADOS|DE:|NIF|N[ºO]|TELEFONE|\\n|$))';
    m = new RegExp('DADOS DO BENEFICI[ÁA]RIO[\\s\\S]{0,120}?Nome' + NM).exec(T) || new RegExp('(?:PARA|Benefici[áa]rio|Destinat[áa]rio|Nome do Benefici[áa]rio|Favorecido)' + NM).exec(T); if (m) p.name = m[1].trim();
    p.bank = /BAI DIRECTO|BANCO ANGOLANO DE INVESTIMENTOS|\bBAI\b/.test(U) ? 'BAI' : /\bBFA\b|FOMENTO ANGOLA/.test(U) ? 'BFA' : /ATL[ÂA]NTICO/.test(U) ? 'Atlântico' : /\bBIC\b/.test(U) ? 'BIC' : /KEVE/.test(U) ? 'Keve' : /\bBPC\b|POUPAN[ÇC]A E CR[ÉE]DITO/.test(U) ? 'BPC' : /STANDARD BANK/.test(U) ? 'Standard Bank' : /MILLENNIUM/.test(U) ? 'Millennium' : /\bBCI\b/.test(U) ? 'BCI' : /\bSOL\b/.test(U) ? 'Sol' : /YETU/.test(U) ? 'Yetu' : /\bBNI\b/.test(U) ? 'BNI' : /CAIXA/.test(U) ? 'Caixa' : '';
    m = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/.exec(T); if (m) p.date = m[1].replace(/-/g, '/');
    p.status = /REJEI|RECUS|CANCEL|N[ÃA]O (?:FOI )?(?:EXECUT|PROCESS)|ERRO|PENDENTE/i.test(U) ? 'falhou' : /SUCESSO|EFECTUAD|EFETUAD|PROCESSADO|REALIZAD|CONCLU[ÍI]D/i.test(U) ? 'sucesso' : '';
    p.receiver = p.account || p.name; return p; }
  /* ── قراءة إيصال واحد → الشكل الذي يحفظه الهاتف ── */
  const CACHE = {}; try { Object.assign(CACHE, JSON.parse(fs.readFileSync(path.join(DIR, 'cache.json'), 'utf8'))); } catch (e) {}
  let cacheDirty = false; setInterval(() => { if (!cacheDirty) return; cacheDirty = false; try { fs.writeFileSync(path.join(DIR, 'cache.json'), JSON.stringify(CACHE)); } catch (e) {} }, 15000).unref();
  async function readOne(buf, nm, fp) {
    if (CACHE[fp]) return CACHE[fp];
    const pdf = /\.pdf$/i.test(nm); let p = null;
    if (pdf) { try { const q = parseAO(await pdfText(buf)); if (q && q.amount && (q.ref || q.account)) p = q; } catch (e) {} }
    if (!p) {
      const rd = app.locals.readReceipt; if (!rd) throw new Error('القارئ غير جاهز');
      const mime = pdf ? 'application/pdf' : /\.png$/i.test(nm) ? 'image/png' : /\.webp$/i.test(nm) ? 'image/webp' : 'image/jpeg';
      let g = null; for (let k = 0; k < 3 && !g; k++) { try { g = await rd(buf.toString('base64'), mime); } catch (e) { if (k === 2) throw e; await new Promise(r => setTimeout(r, 1500 * (k + 1))); } }
      g = g || {};
      p = { amount: Number(g.amount) || 0, ref: g.txn || g.reference || '', bank: g.bank || g.institution || '', date: g.date || '', name: g.receiver || g.name || '', account: g.iban || g.account || '', receiver: g.receiver || '', ccy: String(g.currency || g.ccy || ''), status: String(g.status || ''), conf: +g.confidence || 0, weak: !!((g.confidence && +g.confidence < 70) || g.amount_model) };
    }
    if (p.amount || p.name || p.account || p.receiver) { CACHE[fp] = p; cacheDirty = true; }
    return p;
  }
  /* ── المعالجة ── */
  async function run(j) {
    j.state = 'run'; j.ph = 'unzip'; j.d = 0; j.n = j.files.length; save(j);
    const S = [], C = [];
    for (const f of j.files) {
      const buf = fs.readFileSync(path.join(jdir(j.id), f.store)); let ents;
      try { ents = zipEntries(buf); } catch (e) { throw new Error('«' + f.name + '»: ' + e.message); }
      const list = f.side === 's' ? S : C;
      for (const en of ents) { const nm = en.name.split('/').pop(); if (!isDoc(nm)) continue; list.push({ side: f.side, cn: f.cn, nm, en, buf, sz: en.usize, day: day(nm) }); }
      j.d++; save(j);
    }
    j.ph = 'hash'; j.d = 0; j.n = S.length + C.length; save(j);
    const seen = {};
    for (const it of S.concat(C)) { try { it.data = zipRead(it.buf, it.en); it.fp = sha(it.data); it.sz = it.data.length; } catch (e) { it.bad = 1; } j.d++; if (j.d % 50 === 0) save(j); }
    /* إسقاط المطابق بالصورة: البصمة نفسها، أو الحجم نفسه في اليوم نفسه */
    const byFp = {}, bySz = {}; S.forEach(sr => { if (sr.bad) return; if (!byFp[sr.fp]) byFp[sr.fp] = sr; if (sr.sz > 2048 && sr.day) { const k = sr.sz + ':' + sr.day; (bySz[k] || (bySz[k] = [])).push(sr); } });
    const free = sr => !sr.mt;
    C.forEach(it => { if (it.bad) return; let sr = byFp[it.fp]; if (sr && free(sr)) { sr.mt = 1; it.mt = 1; return; } if (it.sz > 2048 && it.day) { const L = bySz[it.sz + ':' + it.day] || []; for (const q of L) if (free(q)) { q.mt = 1; it.mt = 1; return; } } });
    /* القراءة: الموردون غير المطابقين كلهم + 160 من المطابقين (لتثبيت الحسابات) + الزبائن غير المطابقين */
    const SU = S.filter(x => !x.bad && !x.mt), SM = S.filter(x => !x.bad && x.mt).slice(0, 160), CU = C.filter(x => !x.bad && !x.mt && !seen[x.fp] && (seen[x.fp] = 1));
    const Q = SU.concat(SM).concat(CU); j.ph = 'read'; j.d = 0; j.n = Q.length; j.pre = S.length + C.length - Q.length; save(j);
    let qi = 0, fails = 0;
    async function wk() { while (qi < Q.length && !j.stop) { const it = Q[qi++]; try { it.p = await readOne(it.data, it.nm, it.fp); } catch (e) { fails++; it.err = String(e.message || e).slice(0, 120); } j.d++; if (j.d % 10 === 0) save(j); } }
    await Promise.all([0, 1, 2, 3, 4, 5].map(wk));
    j.items = S.concat(C).filter(x => !x.bad).map(x => ({ side: x.side, cn: x.cn, nm: x.nm, fp: x.fp, sz: x.sz, p: x.p || null, mt: x.mt ? 1 : 0, err: x.err || '' }));
    j.fails = fails; j.state = 'done'; j.ph = 'done'; save(j);
    for (const it of S.concat(C)) { it.data = null; it.buf = null; }
    try { for (const f of j.files) fs.unlinkSync(path.join(jdir(j.id), f.store)); } catch (e) {}
  }
  /* ── المسارات ── */
  app.post('/lab/job', wrap(async (req, t) => { const id = crypto.randomBytes(8).toString('hex'); fs.mkdirSync(jdir(id), { recursive: true }); JOBS[id] = { id, owner: String(t.phone || t.sub || ''), state: 'upload', ph: 'upload', d: 0, n: 0, at: Date.now(), files: [] }; save(JOBS[id]); return { id }; }));
  app.put('/lab/job/:id/file', express.raw({ type: '*/*', limit: '1500mb' }), wrap(async req => {
    const j = load(req.params.id); if (!j || j.state !== 'upload') throw new Error('المهمة غير موجودة أو بدأت');
    const side = req.query.side === 's' ? 's' : 'c', name = String(req.query.name || 'file.zip'), store = 'f' + j.files.length + '.zip';
    if (!req.body || !req.body.length) throw new Error('ملف فارغ');
    fs.writeFileSync(path.join(jdir(j.id), store), req.body); j.files.push({ side, name, cn: zName(name), store, size: req.body.length }); save(j); return { ok: 1, n: j.files.length };
  }));
  app.post('/lab/job/:id/start', wrap(async req => { const j = load(req.params.id); if (!j) throw new Error('المهمة غير موجودة'); if (j.state === 'upload') { if (!j.files.some(f => f.side === 's') || !j.files.some(f => f.side === 'c')) throw new Error('يلزم ملف مورد وملف زبون'); run(j).catch(e => { j.state = 'error'; j.err = String(e.message || e).slice(0, 300); save(j); }); } return { ok: 1, state: j.state }; }));
  app.get('/lab/job/:id', wrap(async req => { const j = load(req.params.id); if (!j) throw new Error('المهمة غير موجودة'); const o = { id: j.id, state: j.state, ph: j.ph, d: j.d, n: j.n, pre: j.pre || 0, err: j.err || '', fails: j.fails || 0, at: j.at }; if (j.state === 'done' && req.query.items) o.items = j.items; return o; }));
  app.delete('/lab/job/:id', wrap(async req => { const j = load(req.params.id); if (j) { j.stop = true; delete JOBS[req.params.id]; } try { fs.rmSync(jdir(req.params.id), { recursive: true, force: true }); } catch (e) {} return { ok: 1 }; }));
  /* 1444: تنبيه تلغرام بعد كل فحص + تذكير صباحي (08:00 لواندا) ما دامت إيصالات بلا مورد */
  const OPENF = path.join(DIR, 'open.json'); const tgSend = text => { try { if (ctx.tg && ctx.adminId) ctx.tg('sendMessage', { chat_id: ctx.adminId, text, disable_web_page_preview: true }); } catch (e) {} };
  app.post('/lab/notify', express.json({ limit: '200kb' }), wrap(async req => { const b = req.body || {}; const text = String(b.text || '').slice(0, 3800); if (!text) throw new Error('نص فارغ');
    try { fs.writeFileSync(OPENF, JSON.stringify({ open: +b.open || 0, total: +b.total || 0, text, at: Date.now() })); } catch (e) {}
    tgSend((b.auto ? '🧪 مختبر المطابقة — نتيجة الفحص\n' : '') + text); return { ok: 1 }; }));
  setInterval(() => { try { const now = new Date(Date.now() + 3600e3); if (now.getUTCHours() !== 7 || now.getUTCMinutes() > 4) return; const o = JSON.parse(fs.readFileSync(OPENF, 'utf8')); if (!o.open || Date.now() - o.at < 20 * 3600e3) return;
    tgSend('⏰ تذكير: لا يزال ' + o.open + ' إيصالًا عند الزبائن بلا مورد (' + Number(o.total).toLocaleString('en-US') + ' AOA) منذ فحص ' + new Date(o.at).toLocaleDateString('en-GB') + ' — افتح مختبر المطابقة وأضف المورد أو كشف حسابه.'); } catch (e) {} }, 5 * 60e3).unref();
  /* تنظيف بعد 24 ساعة */
  setInterval(() => { try { for (const id of fs.readdirSync(DIR)) { const st = path.join(DIR, id, 'state.json'); if (!fs.existsSync(st)) continue; const j = JSON.parse(fs.readFileSync(st, 'utf8')); if (Date.now() - (j.at || 0) > 24 * 3600e3) { delete JOBS[id]; fs.rmSync(path.join(DIR, id), { recursive: true, force: true }); } } } catch (e) {} }, 3600e3).unref();
  console.log('▲ lab server ready');
};
