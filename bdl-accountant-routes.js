/* bdl-accountant-routes.js — واجهة «المحاسب» المبسطة (accountant.html) — إضافي، Build 1274
   يقرأ الدفتر الدائم bdl_cmp_receipts بنفس هوية المالك التي يستخدمها bdl-accountant.js،
   ويعطي: /accountant/status (فحص حقيقي للمفتاح ونداء Claude والدفتر) · /accountant/summary · /accountant/run · /accountant/report
   مطلوب في Railway: ANTHROPIC_KEY (أو ANTHROPIC_API_KEY). اختياري: ANTHROPIC_MODEL (افتراضي claude-sonnet-5). */
'use strict';
module.exports = function (app, ctx) {
  const { express, jwt, JWT_SECRET, SB_REST, SB_PUB, ownerToken, notifyAdmin } = ctx;
  const KEY = () => (() => { for (const k of Object.keys(process.env)) if (/^anthropic_(api_)?key$/i.test(k)) { const v = String(process.env[k] || '').trim(); if (v) return v; } return ''; })();
  const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
  const auth = req => { try { jwt.verify(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''), JWT_SECRET); return true; } catch (e) { return false; } };
  async function sb(path, opt) { opt = opt || {};
    const r = await fetch(SB_REST + path, Object.assign({}, opt, { headers: Object.assign({ apikey: SB_PUB, Authorization: 'Bearer ' + ownerToken(), 'Content-Type': 'application/json' }, opt.headers || {}), body: opt.body ? JSON.stringify(opt.body) : undefined }));
    const t = await r.text(); if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + t.slice(0, 160)); return t ? JSON.parse(t) : null; }

  async function summary() {
    const rows = await sb('/bdl_cmp_receipts?select=fp,side,amount,who,phone,msg_at,ref,bank,ccy,matched_fp,book_entry_id&order=msg_at.desc.nullslast&limit=50000');
    const s = { total: rows.length, sum: 0, matched: 0, review: 0, open: 0, openSum: 0, custN: 0, custSum: 0, supN: 0, supSum: 0, openSup: 0, openSupSum: 0, parties: {} };
    for (const r of rows) {
      const amt = Number(r.amount) || 0; const aoa = !r.ccy || r.ccy === 'AOA';
      if (aoa) { s.sum += amt; if (r.side === 'cust') { s.custN++; s.custSum += amt; } else if (r.side === 'sup') { s.supN++; s.supSum += amt; } }
      if (r.matched_fp) { s.matched++; continue; }
      if (!(amt > 0) || !aoa) { s.review++; continue; }
      s.open++;
      if (r.side !== 'cust') { s.openSup++; s.openSupSum += amt; continue; }
      s.openSum += amt;
      const k = (r.who || 'بدون اسم') + '|' + (r.phone || '');
      const p = s.parties[k] || (s.parties[k] = { party: r.who || 'بدون اسم', phone: r.phone || '', count: 0, sum: 0, oldest: r.msg_at, receipts: [] });
      p.count++; p.sum += amt; if (r.msg_at && r.msg_at < p.oldest) p.oldest = r.msg_at;
      if (p.receipts.length < 30) p.receipts.push({ amount: amt, date: r.msg_at, bank: r.bank || '', ref: r.ref || '' });
    }
    s.parties = Object.values(s.parties).sort((a, b) => b.sum - a.sum);
    return s;
  }

  async function claude(system, user, max) {
    if (!KEY()) throw new Error('ANTHROPIC_KEY غير مضبوط في Railway');
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': KEY(), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL(), max_tokens: max || 1800, system, messages: [{ role: 'user', content: user }] }) });
    const j = await r.json();
    if (!r.ok) throw new Error('Claude ' + r.status + ' ' + ((j.error && j.error.type) || '') + ': ' + ((j.error && j.error.message) || '').slice(0, 200));
    return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  }

  async function writeReport() {
    const s = await summary();
    let deals = null, esc = null; try { deals = await dealsSummary(); } catch (e) {} try { esc = await duesEscalation(); } catch (e) {}
    const brief = { date: new Date().toISOString().slice(0, 10), profits: deals ? { unit: deals.unit, today: deals.today, month: deals.month, deals: deals.n, unpriced_deals: deals.unpriced, avg_margin_pct: deals.avgMargin } : null, escalation: esc ? esc.levels : null, receipts_total: s.total, customers: { receipts: s.custN, sum_aoa: fmt(s.custSum), open_without_supplier: s.open - s.openSup, open_sum_aoa: fmt(s.openSum) }, suppliers: { receipts: s.supN, sum_aoa: fmt(s.supSum), open_without_customer: s.openSup, open_sum_aoa: fmt(s.openSupSum) }, matched_pairs: Math.floor(s.matched / 2), needs_review: s.review,
      top_parties: (esc ? esc.parties : s.parties).slice(0, 15).map(p => ({ party: p.party, phone: p.phone, count: p.count, sum_aoa: fmt(p.sum), oldest: String(p.oldest || '').slice(0, 10), days_open: p.days, escalation_level: p.level, risk_score: p.risk })) };
    const skill = require('./bdl-report-skill');
    const rep = await skill.ask(brief, { extra: 'اكتب تقرير اليوم: الوضع، المؤشرات (منها ربح اليوم والشهر بوحدة profits.unit)، الذمم (زبائن بلا مقابل حسب الجهة مع مستوى التصعيد 1=إشعار 2=تذكير 3=خطر 4=تقرير إداري)، الإجراءات، المخاطر (منها الصفقات بلا سعر unpriced_deals إن وجدت)، ورسالة واتساب لأكبر جهة زبون بلا مقابل — وإن لم توجد إيصالات زبائن فاجعل whatsapp فارغًا وأضف إجراءً: رفع إيصالات الزبائن ثم مطابقة Claude.' });
    const text = skill.toPlain(rep);
    try { await sb('/bdl_agent_reports', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { report: text, facts: { source: 'accountant.html', brief, structured: rep } } }); } catch (e) {}
    if (notifyAdmin) { try { await notifyAdmin(skill.toTelegram(rep)); } catch (e) {} }
    return { date: brief.date, model: MODEL(), text, structured: rep };
  }

  const wrap = fn => async (req, res) => { if (!auth(req)) return res.status(401).json({ error: 'الجلسة منتهية — افتح account.html' }); try { res.json(await fn(req)); } catch (e) { res.status(500).json({ error: String(e.message).slice(0, 300) }); } };

  app.get('/accountant/status', wrap(async () => {
    const out = { model: MODEL(), checks: {} };
    out.checks.anthropic_key = KEY() ? 'موجود (' + KEY().slice(0, 12) + '…)' : 'ناقص: ANTHROPIC_KEY في Railway';
    try { out.checks.claude_call = 'يعمل — رد: ' + await claude('أجب بكلمة واحدة.', 'قل: جاهز', 10); } catch (e) { out.checks.claude_call = 'فشل — ' + e.message; }
    try { const r = await fetch(SB_REST + '/bdl_cmp_receipts?select=fp&limit=1', { headers: { apikey: SB_PUB, Authorization: 'Bearer ' + ownerToken(), Prefer: 'count=exact', Range: '0-0' } }); out.checks.ledger = r.ok ? 'يعمل — ' + String(r.headers.get('content-range') || '').split('/')[1] + ' إيصال' : 'فشل — Supabase ' + r.status; } catch (e) { out.checks.ledger = 'فشل — ' + e.message; }
    out.checks.telegram = notifyAdmin ? 'مفعّل' : 'غير مفعّل (TELEGRAM_BOT_TOKEN/ADMIN_ID)';
    out.ok = !/ناقص|فشل/.test(out.checks.anthropic_key + out.checks.claude_call + out.checks.ledger);
    return out;
  }));
  /* ── مطابقة Claude: اقتراحات للإيصالات التي لم تُطابق بالقواعد — لا تُربط تلقائيًا، المالك يعتمد ── */
  async function aiMatch(req) {
    const b = req.body || {}; const q = [];
    if (b.from) q.push('msg_at=gte.' + b.from); if (b.to) q.push('msg_at=lte.' + b.to + 'T23:59:59');
    const rows = await sb('/bdl_cmp_receipts?select=fp,side,amount,who,phone,msg_at,ref,bank&matched_fp=is.null&amount=not.is.null&ccy=eq.AOA&order=msg_at.desc&limit=800' + (q.length ? '&' + q.join('&') : ''));
    const C = rows.filter(r => r.side === 'cust').slice(0, 300), Sp = rows.filter(r => r.side === 'sup').slice(0, 300);
    if (!C.length || !Sp.length) return { pairs: [], cust: C.length, sup: Sp.length, note: 'لا يوجد ما يُطابَق: أحد العمودين فارغ في هذه الفترة' };
    const line = (r, i) => `${i}|${Math.round(r.amount)}|${String(r.msg_at || '').slice(0, 10)}|${(r.who || '').slice(0, 30)}|${(r.ref || '').slice(0, 20)}|${r.bank || ''}`;
    const text = await claude(
      'أنت محاسب مطابقة لصرافة BDL. الزبائن يرسلون إيصالات AOA، والمالك يحوّل المقابل لموردين. إيصال مورد واحد قد يغطي إيصال زبون واحد أو مجموع 2–4 إيصالات زبائن. أعد JSON فقط بلا أي نص آخر.',
      `إيصالات الزبائن (idx|amount|date|name|ref|bank):\n${C.map(line).join('\n')}\n\nإيصالات الموردين (idx|amount|date|name|ref|bank):\n${Sp.map(line).join('\n')}\n\n` +
      'اقترح أزواجًا: {"pairs":[{"cust":[idx...],"sup":idx,"confidence":0-100,"reason":"سبب مختصر"}]}\n' +
      'قواعد: مجموع مبالغ الزبائن = مبلغ المورد بفارق ≤0.5%؛ تاريخ المورد بعد الزبون أو في نفس اليوم وضمن 10 أيام؛ لا تكرر idx في أكثر من زوج؛ لا تقترح ما ثقته أقل من 70؛ المرجع المتطابق أقوى دليل، ثم المبلغ+التاريخ، ثم الاسم. إن لم تجد شيئًا أعد {"pairs":[]}.', 3000);
    let j; try { j = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch (e) { throw new Error('Claude JSON: ' + text.slice(0, 100)); }
    const used = new Set(); const pairs = [];
    for (const p of (j.pairs || [])) {
      const cs = (Array.isArray(p.cust) ? p.cust : [p.cust]).map(i => C[i]).filter(Boolean); const sp = Sp[p.sup]; if (!cs.length || !sp) continue;
      const fps = cs.map(c => c.fp).concat(sp.fp); if (fps.some(f => used.has(f))) continue;
      const sum = cs.reduce((a, c) => a + Number(c.amount), 0); if (Math.abs(sum - Number(sp.amount)) / Number(sp.amount) > 0.005) continue;   // تحقق حسابي مستقل
      if ((Number(p.confidence) || 0) < 70) continue;
      fps.forEach(f => used.add(f));
      pairs.push({ cust: cs.map(c => ({ fp: c.fp, amount: c.amount, who: c.who, date: String(c.msg_at || '').slice(0, 10), ref: c.ref })), sup: { fp: sp.fp, amount: sp.amount, who: sp.who, date: String(sp.msg_at || '').slice(0, 10), ref: sp.ref }, confidence: Number(p.confidence) || 0, reason: String(p.reason || '').slice(0, 160) });
    }
    pairs.sort((a, b) => b.confidence - a.confidence);
    try { await sb('/bdl_agent_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { at: new Date().toISOString(), kind: 'ai-match', msg: 'اقترح ' + pairs.length + ' زوجًا من ' + C.length + '×' + Sp.length, data: pairs.slice(0, 30) } }); } catch (e) {}
    return { pairs, cust: C.length, sup: Sp.length, model: MODEL() };
  }
  /* ── تفتيش Claude: يقرأ القيود والإيصالات المرتبطة ويعطي نتائج بأسباب وإصلاحات مقترحة ── */
  async function aiAudit() {
    const books = await sb('/bdl_books?select=id,name,phone,kind');
    const E = await sb('/bdl_book_entries?select=id,book_id,side,amount,ref,note,entry_date,created_at&or=(ref.like.*CMP:*,note.like.مقارنة الإيصالات*)&order=created_at.asc&limit=3000');
    const L = await sb('/bdl_cmp_receipts?select=fp,side,amount,who,phone,book_entry_id,ref,msg_at&book_entry_id=not.is.null&limit=50000');
    const bn = {}; books.forEach(b => bn[b.id] = (b.name || '') + (b.phone ? ' ' + b.phone : '') + ' [' + (b.kind || '') + ']');
    const byE = {}; L.forEach(x => (byE[x.book_entry_id] = byE[x.book_entry_id] || []).push(x));
    const ents = E.map(e => { const rs = byE[e.id] || []; return `${e.id}|${bn[e.book_id] || e.book_id}|${e.side}|${Math.round(e.amount)}|${rs.length}|${Math.round(rs.reduce((a, x) => a + Number(x.amount || 0), 0))}|${String(e.entry_date || e.created_at || '').slice(0, 10)}|${String(e.ref || '').slice(0, 40)}`; });
    const eids = new Set(E.map(e => e.id)); const orphans = L.filter(x => !eids.has(x.book_entry_id)).length;
    const cnt = {}; L.forEach(x => cnt[x.fp] = (cnt[x.fp] || 0) + 1); const multi = Object.keys(cnt).filter(k => cnt[k] > 1).length;
    const text = await claude(
      'أنت مدقق دفاتر لصرافة BDL. كل قيد في الدفتر يجب أن يساوي مجموع إيصالاته، ولا يُقيَّد إيصال مرتين، ولا قيد بنفس مفتاح CMP مرتين، وجانب القيد in للزبائن وout للموردين. أعد JSON فقط.',
      `القيود (id|book|side|amount|receipts_count|receipts_sum|date|ref):\n${ents.join('\n')}\n\nإيصالات مرتبطة بقيد محذوف: ${orphans}\nإيصالات مرتبطة بأكثر من قيد: ${multi}\n\n` +
      'أعد: {"findings":[{"severity":"critical|warning|info","entry_id":123,"message":"ما المشكلة بالأرقام","fix":{"type":"del|patch|none","amount":0}}],"summary":"سطر واحد"}\n' +
      'قواعد: del فقط للقيد المكرر الأحدث (اذكر الأصل في message)؛ patch عندما amount ≠ receipts_sum (amount = receipts_sum)؛ none لما يحتاج قرار المالك (side خاطئ، دفتر ظاهره غير مناسب، مبالغ شاذة، تواريخ غريبة). لا تخترع أرقامًا.', 3000);
    let j; try { j = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch (e) { throw new Error('Claude JSON: ' + text.slice(0, 100)); }
    const byId = {}; E.forEach(e => byId[e.id] = e);
    const findings = (j.findings || []).map(f => { const e = byId[f.entry_id]; const fix = f.fix && f.fix.type !== 'none' && e ? f.fix : null;
      if (fix && fix.type === 'patch') { const rs = byE[e.id] || []; fix.amount = Math.round(rs.reduce((a, x) => a + Number(x.amount || 0), 0)); if (!rs.length || Math.abs(fix.amount - Number(e.amount)) <= 1) return null; }   // تحقق مستقل
      return { severity: f.severity || 'info', entry_id: e ? e.id : null, book: e ? (bn[e.book_id] || '') : '', message: String(f.message || '').slice(0, 240), fix }; }).filter(Boolean);
    try { await sb('/bdl_agent_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { at: new Date().toISOString(), kind: 'ai-audit', msg: String(j.summary || '').slice(0, 200), data: findings.slice(0, 30) } }); } catch (e) {}
    return { findings, summary: String(j.summary || ''), entries: E.length, linked: L.length, model: MODEL() };
  }
  app.locals.aiMatch = aiMatch;
  app.post('/accountant/ai-match', express.json(), wrap(aiMatch));
  app.post('/accountant/ai-audit', express.json(), wrap(aiAudit));
  /* ── الأرباح: سعر الزبون − سعر المورد لكل 1,000 AOA (بالأوقية أو USDT) ── */
  const today = () => new Date().toISOString().slice(0, 10);
  async function ratesFor(day) { const r = await sb('/bdl_rates_daily?select=*&day=lte.' + day + '&order=day.desc&limit=1'); return r && r[0] || null; }
  const profitOf = (amount, cr, sr) => (cr != null && sr != null) ? Math.round((Number(amount) / 1000) * (Number(cr) - Number(sr)) * 100) / 100 : null;
  async function upsertDeal(b) {
    if (!b.cust_fp || !b.sup_fp || !(Number(b.amount_aoa) > 0)) throw new Error('بيانات الصفقة ناقصة');
    let unit = b.unit, cr = b.cust_rate, sr = b.sup_rate;
    if (cr == null || sr == null) { const d = await ratesFor(today()); if (d) { unit = unit || d.unit; if (cr == null) cr = d.cust_rate; if (sr == null) sr = d.sup_rate; } }
    const row = { cust_fp: b.cust_fp, sup_fp: b.sup_fp, amount_aoa: Number(b.amount_aoa), unit: unit || 'MRU', cust_rate: cr == null ? null : Number(cr), sup_rate: sr == null ? null : Number(sr), profit: profitOf(b.amount_aoa, cr, sr), note: b.note ? String(b.note).slice(0, 120) : null, source: b.source || 'manual' };
    await sb('/bdl_deals?on_conflict=cust_fp,sup_fp', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: row });
    return row;
  }
  async function dealsSummary() {
    const rows = await sb('/bdl_deals?select=*&order=created_at.desc&limit=2000');
    const t = today(), m = t.slice(0, 7); const S = { today: 0, month: 0, all: 0, n: rows.length, unpriced: 0, unit: (rows[0] && rows[0].unit) || 'MRU', avgMargin: null, recent: rows.slice(0, 20) };
    let marg = 0, mn = 0;
    for (const r of rows) { if (r.profit == null) { S.unpriced++; continue; } const d = String(r.created_at).slice(0, 10); S.all += Number(r.profit); if (d === t) S.today += Number(r.profit); if (d.slice(0, 7) === m) S.month += Number(r.profit); if (r.cust_rate && r.sup_rate) { marg += (r.cust_rate - r.sup_rate) / r.sup_rate * 100; mn++; } }
    if (mn) S.avgMargin = Math.round(marg / mn * 100) / 100;
    S.rates = await ratesFor(t);
    return S;
  }
  /* ── التصعيد ودرجة خطر الجهة: يوم 1 إشعار · 3 تذكير · 7 خطر · 14 تقرير ── */
  function escalate(days) { return days >= 14 ? 4 : days >= 7 ? 3 : days >= 3 ? 2 : days >= 1 ? 1 : 0; }
  async function duesEscalation() {
    const s = await summary(); const now = Date.now();
    const parties = s.parties.map(p => { const days = p.oldest ? Math.floor((now - new Date(p.oldest)) / 864e5) : 0; const lvl = escalate(days);
      const risk = Math.min(100, Math.round(Math.min(days, 60) / 60 * 60 + Math.min(p.count, 5) / 5 * 20 + Math.min(p.sum / 20000000, 1) * 20));
      return Object.assign({}, p, { days, level: lvl, risk }); }).sort((a, b) => b.risk - a.risk);
    return { openSum: s.openSum, open: s.open, parties, levels: { l1: parties.filter(p => p.level === 1).length, l2: parties.filter(p => p.level === 2).length, l3: parties.filter(p => p.level === 3).length, l4: parties.filter(p => p.level === 4).length } };
  }
  app.get('/accountant/deals', wrap(dealsSummary));
  app.post('/accountant/deal', express.json(), wrap(async req => upsertDeal(req.body || {})));
  app.get('/accountant/rates', wrap(async () => (await ratesFor(today())) || {}));
  app.post('/accountant/rates', express.json(), wrap(async req => { const b = req.body || {}; const row = { day: today(), unit: b.unit || 'MRU', cust_rate: Number(b.cust_rate), sup_rate: Number(b.sup_rate) }; if (!(row.cust_rate > 0) || !(row.sup_rate > 0)) throw new Error('أدخل السعرين'); await sb('/bdl_rates_daily?on_conflict=day', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: row });
    /* الصفقات بلا سعر تُسعَّر بأسعار اليوم */
    try { const un = await sb('/bdl_deals?select=cust_fp,sup_fp,amount_aoa&profit=is.null&limit=500'); for (const d of un) await upsertDeal({ cust_fp: d.cust_fp, sup_fp: d.sup_fp, amount_aoa: d.amount_aoa, unit: row.unit, cust_rate: row.cust_rate, sup_rate: row.sup_rate, source: 'rates' }); row.priced = un.length; } catch (e) {}
    return row; }));
  app.get('/accountant/dues', wrap(duesEscalation));
  app.locals.upsertDeal = upsertDeal;
  /* ── قارئ عام لأي إيصال (Bankily, Masrvi, Sedad, BMCI, BCI, GBM, BAI, BFA, MULTICAIXA, USDT…) → حقول جاهزة للتعبئة ── */
  const RECEIPT_SYS = 'أنت قارئ إيصالات مالية لصرافة تعمل بين موريتانيا (MRU) وأنغولا (AOA) وUSDT. اقرأ الإيصال (صورة أو PDF أو لقطة شاشة تطبيق بنكي/محفظة) واستخرج الحقول بدقة حرفية. ' +
    'أعد JSON فقط بلا أي نص آخر وبلا أسوار كود: {"is_receipt":true,"bank":"اسم البنك/التطبيق","currency":"MRU|AOA|USD|USDT|EUR|null","amount":123456.78,"amount_verbatim":"كما كُتب","sender":"اسم المرسل أو null","receiver":"اسم المستلم أو null","phone":"هاتف المستلم/المرسل بالأرقام أو null","account":"رقم الحساب/IBAN/المحفظة أو null","txn":"رقم العملية/المرجع أو null","date":"YYYY-MM-DD HH:MM أو null","status":"success|failed|pending|null","confidence":0-100}. ' +
    'قواعد: المبلغ المحوَّل فقط (لا الرصيد ولا العمولة)؛ MRU 320000 يعني 320000؛ الفاصلة الأوروبية 5.000.000,00 تعني 5000000؛ إن كان النص عربيًا فالتسميات: المبلغ المرسل، المستلم، معرف المعاملة، التاريخ والوقت؛ لا تخترع قيمًا — استخدم null.';
  app.post('/read/receipt', express.json({ limit: '12mb' }), wrap(async req => {
    const b = req.body || {}; if (!b.b64) throw new Error('لا ملف');
    const mime = b.mime || 'image/jpeg';
    const content = [mime === 'application/pdf' ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b.b64 } } : { type: 'image', source: { type: 'base64', media_type: mime, data: b.b64 } }, { type: 'text', text: 'اقرأ هذا الإيصال وأعد JSON.' }];
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': KEY(), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL(), max_tokens: 600, system: RECEIPT_SYS, messages: [{ role: 'user', content }] }) });
    const j = await r.json(); if (!r.ok) throw new Error('Claude ' + r.status + ': ' + ((j.error && j.error.message) || '').slice(0, 160));
    const t = (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('').replace(/```json|```/g, '').trim();
    let out; try { out = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (e) { throw new Error('تعذر تفسير القراءة'); }
    if (out.amount != null) out.amount = Number(String(out.amount).replace(/[^\d.]/g, '')) || null;
    if (out.phone) out.phone = String(out.phone).replace(/\D/g, '');
    try { if (out.phone && app.locals.parties) { const pt = await app.locals.parties.find(out.phone); if (pt && !out.receiver) out.receiver = pt.name; } } catch (e) {}
    return out;
  }));
  app.get('/accountant/summary', wrap(summary));
  app.post('/accountant/run', express.json(), wrap(writeReport));
  app.get('/accountant/report', wrap(async () => { let r; try { r = await sb('/bdl_agent_reports?select=report,created_at&order=created_at.desc&limit=1'); } catch (e) { return { text: '', note: /PGRST205|Could not find/.test(e.message) ? 'جدول التقارير غير موجود — الصق bdl-agent.sql في Supabase (SQL Editor)' : e.message }; } return r && r[0] ? { text: r[0].report, structured: r[0].facts && r[0].facts.structured || null, date: String(r[0].created_at).slice(0, 10) } : { text: '' }; }));
  console.log('▲ accountant routes ready (' + MODEL() + (KEY() ? ', key on' : ', key off') + ')');
};
