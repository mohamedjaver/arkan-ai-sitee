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
    const s = { total: rows.length, sum: 0, matched: 0, review: 0, open: 0, openSum: 0, parties: {} };
    for (const r of rows) {
      const amt = Number(r.amount) || 0; const aoa = !r.ccy || r.ccy === 'AOA';
      if (aoa) s.sum += amt;
      if (r.matched_fp) { s.matched++; continue; }
      if (!(amt > 0) || !aoa) { s.review++; continue; }
      s.open++;
      if (r.side !== 'cust') continue;
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
    const brief = { date: new Date().toISOString().slice(0, 10), receipts: s.total, total_aoa: fmt(s.sum), matched: s.matched, review: s.review, open_customer_receipts: s.open, open_sum_aoa: fmt(s.openSum),
      top_parties: s.parties.slice(0, 15).map(p => ({ party: p.party, phone: p.phone, count: p.count, sum_aoa: fmt(p.sum), oldest: String(p.oldest || '').slice(0, 10) })) };
    const text = await claude(
      'أنت محاسب BDL (لبدال) — صرافة بين موريتانيا وأنغولا. الإيصالات بالكوانزا AOA. الزبائن يرسلون إيصالات ثم يُحوَّل المقابل للموردين؛ «بلا مقابل» = إيصال زبون لم يصل مقابله لأي مورد. اكتب بالعربية، مختصرًا، بلا مجاملات ولا رموز تعبيرية، أرقام بفواصل الآلاف. لا تخترع أي رقم غير موجود في البيانات.',
      'بيانات اليوم (JSON):\n' + JSON.stringify(brief) + '\n\nاكتب تقرير المحاسب اليومي بهذا الترتيب بالضبط:\n1) سطر واحد: الوضع العام.\n2) أهم 3 ملاحظات (كل واحدة سطر).\n3) الإجراءات المطلوبة اليوم بالأولوية (5 كحد أقصى، كل إجراء يذكر الجهة والمبلغ).\n4) رسالة واتساب جاهزة لأكبر جهة بلا مقابل (مهذبة، 3 أسطر).');
    try { await sb('/bdl_agent_reports', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { report: text, facts: { source: 'accountant.html', brief } } }); } catch (e) {}
    if (notifyAdmin) { try { await notifyAdmin('<b>المحاسب</b> — ' + brief.date + '\n\n' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')); } catch (e) {} }
    return { date: brief.date, model: MODEL(), text };
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
  app.get('/accountant/summary', wrap(summary));
  app.post('/accountant/run', express.json(), wrap(writeReport));
  app.get('/accountant/report', wrap(async () => { const r = await sb('/bdl_agent_reports?select=report,created_at&order=created_at.desc&limit=1'); return r && r[0] ? { text: r[0].report, date: String(r[0].created_at).slice(0, 10) } : { text: '' }; }));
  console.log('▲ accountant routes ready (' + MODEL() + (KEY() ? ', key on' : ', key off') + ')');
};
