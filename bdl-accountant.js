/* bdl-accountant.js — «المحاسب»: وكيل يعمل وحده على الخادم (Build 1268)
   يوميًا 07:00 (توقيت لواندا) + مرور خفيف كل ساعة، أو يدويًا POST /agent/run:
   1) مطابقة ما لم يُطابَق في الدفتر الدائم (bdl_cmp_receipts): بالمرجع ثم بالمبلغ ±0.5% خلال 3 أيام.
   2) تدقيق الدفاتر: قيود مكررة (نفس مفتاح CMP)، مبلغ قيد ≠ مجموع إيصالاته، إيصالات مرتبطة بقيد محذوف —
      الإصلاحات المؤكدة تُطبَّق (حذف المكرر الأحدث، تصحيح المجموع، فك ربط اليتيم) وتُسجَّل في bdl_agent_log.
   3) الذمم: إيصالات زبائن بلا مورد مجمّعة بالجهة.
   4) تقرير عربي مختصر يكتبه Claude (ANTHROPIC_KEY) — وإن غاب المفتاح يُبنى من قالب — يُحفظ في bdl_agent_reports
      ويُرسل إلى Telegram الأدمن + إشعار push للمالك.
   مطلوب في Railway: ANTHROPIC_KEY (اختياري لكنه ما يجعل التقرير ذكيًا)، AGENT_HOUR (افتراضي 7)، AGENT_TZ_OFFSET (افتراضي +1 لواندا). */
'use strict';
module.exports = function (app, ctx) {
  const { express, jwt, JWT_SECRET, SB_REST, SB_PUB, ownerToken, notifyAdmin, pushOwner } = ctx;
  const HOUR = parseInt(process.env.AGENT_HOUR || '7'), TZ = parseFloat(process.env.AGENT_TZ_OFFSET || '1');
  const AKEY = (() => { for (const k of Object.keys(process.env)) if (/^anthropic_(api_)?key$/i.test(k)) { const v = String(process.env[k] || '').trim(); if (v) return v; } return ''; })();
  const H = () => ({ apikey: SB_PUB, Authorization: 'Bearer ' + ownerToken(), 'Content-Type': 'application/json' });
  async function sb(path, opt) { opt = opt || {}; const r = await fetch(SB_REST + path, Object.assign({}, opt, { headers: Object.assign(H(), opt.headers || {}), body: opt.body ? JSON.stringify(opt.body) : undefined })); const t = await r.text(); if (!r.ok) throw new Error(path.slice(0, 60) + ' → ' + t.slice(0, 160)); return t ? JSON.parse(t) : null; }
  const fmt = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const LOG = []; const log = (kind, msg, data) => { const e = { at: new Date().toISOString(), kind, msg, data: data || null }; LOG.push(e); if (LOG.length > 500) LOG.shift(); sb('/bdl_agent_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: e }).catch(() => {}); };
  let STATE = { running: false, last: null, lastReport: null, lastError: null, tg: null };
  /* إرسال تيليجرام مع تقسيم الرسائل الطويلة */
  async function tgSend(txt, html) { if (!notifyAdmin) { STATE.tg = 'notifyAdmin غير متاح'; return; }
    const esc = html ? String(txt) : String(txt).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const parts = []; let cur = ''; for (const line of esc.split('\n')) { if ((cur + line).length > 3500) { parts.push(cur); cur = ''; } cur += line + '\n'; } if (cur.trim()) parts.push(cur);
    try { for (const p of parts) { await notifyAdmin(p); await new Promise(r => setTimeout(r, 400)); } STATE.tg = 'أُرسل ' + parts.length + ' رسالة'; }
    catch (e) { STATE.tg = 'فشل: ' + String(e.message).slice(0, 120); log('tg-error', STATE.tg); } }
  function auth(req) { try { const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); jwt.verify(t, JWT_SECRET); return true; } catch (e) { return false; } }

  /* ── 1) المطابقة على الدفتر الدائم ── */
  async function matchLedger() {
    const rows = await sb('/bdl_cmp_receipts?select=id,fp,side,amount,ref,msg_at,who,ccy&matched_fp=is.null&amount=not.is.null&ccy=eq.AOA&order=msg_at.asc&limit=20000');
    const C = rows.filter(r => r.side === 'cust'), S = rows.filter(r => r.side === 'sup'); const used = new Set(); const pairs = [];
    const key = r => String(r.ref || '').replace(/\s+/g, '').toLowerCase();
    for (const c of C) { if (!key(c)) continue; const s = S.find(x => !used.has(x.fp) && key(x) && key(x) === key(c)); if (s) { used.add(s.fp); pairs.push([c, s, 'ref']); } }
    const done = new Set(pairs.map(p => p[0].fp));
    for (const c of C) { if (done.has(c.fp) || !c.amount) continue; let best = null, bd = 1;
      for (const s of S) { if (used.has(s.fp) || !s.amount) continue; const d = Math.abs(s.amount - c.amount) / c.amount; const dt = Math.abs(new Date(s.msg_at) - new Date(c.msg_at)); if (d <= 0.005 && dt <= 3 * 864e5 && d < bd) { bd = d; best = s; } }
      if (best) { used.add(best.fp); pairs.push([c, best, bd === 0 ? 'amount' : 'approx']); } }
    for (const [c, s, how] of pairs) { try { await sb('/bdl_cmp_receipts?fp=eq.' + encodeURIComponent(c.fp), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { matched_fp: s.fp, how } }); await sb('/bdl_cmp_receipts?fp=eq.' + encodeURIComponent(s.fp), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { matched_fp: c.fp, how } }); } catch (e) {} }
    if (pairs.length) log('match', 'طابق ' + pairs.length + ' زوجًا', pairs.slice(0, 50).map(p => [p[0].who, p[0].amount, p[1].who, p[2]]));
    return { pairs: pairs.length, custOpen: C.length - pairs.length, supOpen: S.length - pairs.length };
  }
  /* ── 2) تدقيق الدفاتر ── */
  async function auditBooks() {
    const E = await sb('/bdl_book_entries?select=id,book_id,side,amount,ref,note,created_at&or=(ref.like.*CMP:*,note.like.مقارنة الإيصالات*)&order=created_at.asc&limit=5000');
    const L = await sb('/bdl_cmp_receipts?select=fp,amount,book_entry_id&book_entry_id=not.is.null&limit=50000');
    const byE = {}; L.forEach(x => { (byE[x.book_entry_id] = byE[x.book_entry_id] || []).push(x); });
    const fixes = []; const seen = {};
    E.forEach(e => { const k = e.ref && /CMP:/.test(e.ref) ? e.book_id + '|' + e.ref : null; if (!k) return; if (seen[k]) fixes.push({ type: 'dup', id: e.id, orig: seen[k].id, amount: e.amount }); else seen[k] = e; });
    E.forEach(e => { const rs = byE[e.id] || []; if (!rs.length) return; const sum = rs.reduce((a, x) => a + Number(x.amount || 0), 0); const declared = parseInt(String(e.ref || ''), 10); if (Math.abs(sum - Number(e.amount)) > 1 && (!declared || declared === rs.length) && Math.abs(sum - Number(e.amount)) / Math.max(1, Number(e.amount)) <= 0.05) fixes.push({ type: 'sum', id: e.id, from: e.amount, to: sum, n: rs.length }); else if (Math.abs(sum - Number(e.amount)) > 1) fixes.push({ type: 'sum-review', id: e.id, from: e.amount, to: sum, n: rs.length, declared }); });
    const eids = new Set(E.map(e => e.id)); const orphan = L.filter(x => !eids.has(x.book_entry_id)); if (orphan.length) fixes.push({ type: 'orphan', fps: orphan.map(x => x.fp) });
    let applied = 0;
    for (const f of fixes) { try {
      if (f.type === 'dup') { await sb('/bdl_book_entries?id=eq.' + f.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); await sb('/bdl_cmp_receipts?book_entry_id=eq.' + f.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { book_entry_id: f.orig } }).catch(() => {}); applied++; }
      else if (f.type === 'sum') { await sb('/bdl_book_entries?id=eq.' + f.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { amount: f.to } }); applied++; }
      else if (f.type === 'orphan') { for (let i = 0; i < f.fps.length; i += 150) await sb('/bdl_cmp_receipts?fp=in.(' + f.fps.slice(i, i + 150).map(x => '"' + x + '"').join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { book_entry_id: null } }); applied++; }
    } catch (e) { log('audit-error', String(e.message).slice(0, 120), f); } }
    if (fixes.length) log('audit', 'إصلاحات: ' + applied + '/' + fixes.length, fixes.slice(0, 30));
    return { entries: E.length, linked: L.length, fixes: fixes.map(f => Object.assign({}, f, { fps: f.fps ? f.fps.length : undefined })), applied };
  }
  /* ── 3) الذمم ── */
  async function dues() {
    const rows = await sb('/bdl_cmp_receipts?select=amount,who,phone,msg_at,ref&side=eq.cust&matched_fp=is.null&amount=not.is.null&ccy=eq.AOA&order=msg_at.asc&limit=20000');
    const G = {}; rows.forEach(r => { const k = (r.who || 'بلا اسم') + (r.phone ? ' · ' + r.phone : ''); const g = G[k] = G[k] || { who: k, n: 0, tot: 0, oldest: 0 }; g.n++; g.tot += Number(r.amount || 0); g.oldest = Math.max(g.oldest, Math.floor((Date.now() - new Date(r.msg_at)) / 864e5)); });
    const list = Object.values(G).sort((a, b) => b.tot - a.tot); return { n: rows.length, tot: rows.reduce((a, r) => a + Number(r.amount || 0), 0), parties: list.slice(0, 15), partiesN: list.length };
  }
  /* ── 4) التقرير ── */
  async function writeReport(st) {
    const facts = JSON.stringify(st, null, 0).slice(0, 12000);
    let text = null, rep = null;
    if (AKEY) { try { rep = await require('./bdl-report-skill').ask(facts, { extra: 'اكتب تقرير اليوم كاملًا: ما تم (المطابقة/التدقيق/الإصلاحات)، المؤشرات، الذمم، الإجراءات، المخاطر، ورسالة واتساب لأكبر ذمة.' }); text = require('./bdl-report-skill').toPlain(rep); } catch (e) { log('claude-error', String(e.message).slice(0, 120)); } }
    if (!text) { const d = st.dues; text = 'تقرير المحاسب — ' + new Date().toLocaleDateString('en-GB') + '\nمطابقات جديدة: ' + st.match.pairs + ' · زبائن بلا مورد: ' + st.match.custOpen + ' · موردون بلا زبون: ' + st.match.supOpen + '\nتدقيق الدفاتر: ' + st.audit.entries + ' قيد · إصلاحات مطبّقة: ' + st.audit.applied + '\nالذمم المفتوحة: ' + d.n + ' إيصال · ' + fmt(d.tot) + ' AOA · ' + d.partiesN + ' جهة\n' + d.parties.slice(0, 8).map(p => '• ' + p.who + ': ' + fmt(p.tot) + ' AOA (' + p.n + ' · أقدمها ' + p.oldest + ' يوم)').join('\n'); }
    try { await sb('/bdl_agent_reports', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { report: text, facts: Object.assign({}, st, { structured: rep }) } }); } catch (e) {}
    STATE.lastRep = rep; return text;
  }
  async function run(reason) {
    if (STATE.running) return STATE; STATE.running = true;
    try { const st = { reason, at: new Date().toISOString() }; st.match = await matchLedger(); st.audit = await auditBooks(); st.dues = await dues(); const text = await writeReport(st);
      STATE.last = st.at; STATE.lastReport = text; STATE.lastError = null;
      try { if (new Date().getDate() === 1 && app.locals.vault) { const prev = new Date(); prev.setDate(0); const m = prev.toISOString().slice(0, 7); const ex = await app.locals.vault.exportMonth(m); await tgSend('📦 تصدير شهر ' + m + ' مجمّد: ' + ex.receipts + ' إيصال · ' + ex.entries + ' قيد · ' + ex.deals + ' صفقة'); } } catch (e) { log('export-error', String(e.message).slice(0, 120)); }
      const worth = reason !== 'hourly' || st.audit.applied || st.match.pairs;
      if (worth) { await tgSend(STATE.lastRep ? require('./bdl-report-skill').toTelegram(STATE.lastRep) : ('<b>المحاسب BDL</b> — ' + new Date().toLocaleDateString('en-GB') + '\n\n' + text), !!STATE.lastRep);
        try { if (pushOwner) await pushOwner('المحاسب: ' + (st.dues.n ? st.dues.n + ' إيصال بلا مورد · ' + fmt(st.dues.tot) + ' AOA' : 'لا ذمم مفتوحة'), String(text).slice(0, 120)); } catch (e) {} }
      log('run', reason + ' ✓', { match: st.match, audit: { applied: st.audit.applied, fixes: st.audit.fixes.length }, dues: { n: st.dues.n, tot: st.dues.tot } });
    } catch (e) { STATE.lastError = String(e.message).slice(0, 200); log('error', STATE.lastError); }
    STATE.running = false; return STATE;
  }
  /* ── الجدولة: يوميًا عند AGENT_HOUR بتوقيت لواندا + مرور خفيف كل ساعة ── */
  let lastDaily = null;
  setInterval(() => { const now = new Date(Date.now() + TZ * 3600e3); const day = now.toISOString().slice(0, 10); if (now.getUTCHours() === HOUR && lastDaily !== day) { lastDaily = day; run('daily'); } }, 60e3);
  setInterval(() => run('hourly'), 3600e3);
  /* ── واجهة ── */
  app.post('/agent/run', express.json(), async (req, res) => { if (!auth(req)) return res.status(401).json({ ok: false }); const st = await run('manual'); res.json({ ok: true, state: st }); });
  app.get('/agent/status', (req, res) => { if (!auth(req)) return res.status(401).json({ ok: false }); res.json({ ok: true, state: STATE, claude: !!AKEY, hour: HOUR, log: LOG.slice(-30) }); });
  /* نبضة بدء: تخبرك أن الوكيل حيّ ومفاتيحه سليمة */
  setTimeout(() => { tgSend('المحاسب يعمل الآن على الخادم.\nالتقرير اليومي: ' + HOUR + ':00 بتوقيت لواندا · Claude: ' + (AKEY ? 'مفعّل' : 'غير مفعّل') + ' · Gemini: ' + (process.env.GEMINI_KEY ? 'مفعّل' : 'غير مفعّل') + '\nللتقرير الفوري: زر «تقرير المحاسب» في صفحة المطابقة.'); }, 8000);
  app.get('/agent/ping', async (req, res) => { if (!auth(req)) return res.status(401).json({ ok: false }); await tgSend('اختبار: المحاسب متصل بتيليجرام ✓'); res.json({ ok: true, tg: STATE.tg }); });
  console.log('▲ accountant agent ready (daily ' + HOUR + ':00 UTC' + (TZ >= 0 ? '+' : '') + TZ + (AKEY ? ', Claude on' : ', Claude off') + ')');
};
