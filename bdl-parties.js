/* bdl-parties.js — دليل الجهات الموحّد (Build 1297)
   مصدر واحد للأسماء والأرقام: bdl_parties. يُغذّى من الدفاتر (bdl_books)، والدفتر الدائم (who/phone)، وجهات واتساب (bdl_wa_parties)،
   وكل صفحة تقرأ منه وتكتب إليه عبر /parties. الهاتف هو المفتاح (أرقام فقط، بلا 00). */
'use strict';
module.exports = function (app, ctx) {
  const { express, jwt, JWT_SECRET, SB_REST, SB_PUB, ownerToken } = ctx;
  const norm = p => String(p || '').replace(/\D/g, '').replace(/^00/, '');
  const auth = req => { try { jwt.verify(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''), JWT_SECRET); return true; } catch (e) { return false; } };
  async function sb(path, opt) { opt = opt || {};
    const r = await fetch(SB_REST + path, Object.assign({}, opt, { headers: Object.assign({ apikey: SB_PUB, Authorization: 'Bearer ' + ownerToken(), 'Content-Type': 'application/json' }, opt.headers || {}), body: opt.body ? JSON.stringify(opt.body) : undefined }));
    const t = await r.text(); if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + t.slice(0, 160)); return t ? JSON.parse(t) : null; }
  const wrap = fn => async (req, res) => { if (!auth(req)) return res.status(401).json({ error: 'الجلسة منتهية' }); try { res.json(await fn(req)); } catch (e) { res.status(500).json({ error: String(e.message).slice(0, 300) }); } };

  async function upsert(list) {
    const rows = []; for (const p of list) { const ph = norm(p.phone); const nm = String(p.name || '').trim().slice(0, 80); if (!ph || ph.length < 7 || !nm) continue;
      rows.push({ phone: ph, name: nm, side: ['cust', 'sup', 'both'].includes(p.side) ? p.side : 'cust', aliases: Array.isArray(p.aliases) ? p.aliases.slice(0, 10) : [], note: p.note ? String(p.note).slice(0, 200) : null, updated_at: new Date().toISOString() }); }
    if (!rows.length) return 0;
    // اسم جديد لنفس الرقم يُحفظ كبديل ولا يُفقد
    const ex = await sb('/bdl_parties?select=phone,name,aliases,side&phone=in.(' + rows.map(r => '"' + r.phone + '"').join(',') + ')');
    const byP = {}; ex.forEach(e => byP[e.phone] = e);
    for (const r of rows) { const e = byP[r.phone]; if (e) { const al = new Set(e.aliases || []); if (e.name && e.name !== r.name) al.add(e.name); (r.aliases || []).forEach(a => al.add(a)); al.delete(r.name); r.aliases = [...al].slice(0, 10); if (e.side && e.side !== r.side) r.side = 'both'; } }
    for (let i = 0; i < rows.length; i += 200) await sb('/bdl_parties?on_conflict=phone', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: rows.slice(i, i + 200) });
    return rows.length;
  }
  /* مزامنة من المصادر الثلاثة القائمة */
  async function sync() {
    const out = { books: 0, ledger: 0, whatsapp: 0 };
    try { const b = await sb('/bdl_books?select=name,phone,kind&limit=5000'); out.books = await upsert(b.map(x => ({ phone: x.phone, name: x.name, side: /sup|مورد/i.test(String(x.kind || '')) ? 'sup' : 'cust' }))); } catch (e) {}
    try { const L = await sb('/bdl_cmp_receipts?select=who,phone,side&phone=not.is.null&limit=50000'); const m = {}; L.forEach(x => { const ph = norm(x.phone); if (!ph || !x.who) return; const k = ph; m[k] = m[k] || { phone: ph, name: x.who, side: x.side === 'sup' ? 'sup' : 'cust', n: 0 }; m[k].n++; if (m[k].side !== (x.side === 'sup' ? 'sup' : 'cust')) m[k].side = 'both'; }); out.ledger = await upsert(Object.values(m)); } catch (e) {}
    try { const w = await sb('/bdl_wa_parties?select=phone,name,side&limit=5000'); out.whatsapp = await upsert(w.map(x => ({ phone: x.phone, name: x.name, side: x.side }))); } catch (e) {}
    return out;
  }
  /* ── ملفات التعريف: لكل جهة أسماء الشركات/المستلمين والحسابات التي ظهرت في إيصالاتها ── */
  const tok = t => String(t || '').toLowerCase().replace(/[^a-z\u0600-\u06ff0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  async function rebuildProfiles() {
    const rows = await sb('/bdl_cmp_receipts?select=side,who,phone,receiver,account,bank,sender&limit=50000');
    const P = {};
    for (const r of rows) { const ph = norm(r.phone); if (!ph) continue; const p = P[ph] = P[ph] || { phone: ph, name: r.who || '', side: r.side, receivers: {}, accounts: {}, senders: {}, banks: {} };
      if (r.receiver) p.receivers[tok(r.receiver)] = (p.receivers[tok(r.receiver)] || 0) + 1; if (r.sender) p.senders[tok(r.sender)] = (p.senders[tok(r.sender)] || 0) + 1;
      if (r.account) p.accounts[String(r.account).replace(/\s+/g, '')] = (p.accounts[String(r.account).replace(/\s+/g, '')] || 0) + 1; if (r.bank) p.banks[tok(r.bank)] = (p.banks[tok(r.bank)] || 0) + 1; }
    let n = 0;
    for (const ph in P) { const p = P[ph]; const idents = { receivers: Object.keys(p.receivers).filter(k => k), accounts: Object.keys(p.accounts).filter(k => k), senders: Object.keys(p.senders).filter(k => k), banks: Object.keys(p.banks).filter(k => k) };
      try { await sb('/bdl_parties?on_conflict=phone', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { phone: ph, name: p.name || ph, side: p.side === 'sup' ? 'sup' : 'cust', identifiers: idents, updated_at: new Date().toISOString() } }); n++; } catch (e) {} }
    return { parties: n };
  }
  async function infer(items) {
    const parties = await sb('/bdl_parties?select=phone,name,side,identifiers&limit=5000');
    const out = [];
    for (const it of items) { const acc = String(it.account || '').replace(/\s+/g, ''); const rc = tok(it.receiver), sd = tok(it.sender); let best = null;
      for (const p of parties) { const id = p.identifiers || {}; let score = 0, why = '';
        if (acc && (id.accounts || []).includes(acc)) { score = 0.95; why = 'نفس رقم الحساب'; }
        else if (rc && (id.receivers || []).some(x => x === rc)) { score = 0.85; why = 'نفس اسم المستلم'; }
        else if (rc && (id.receivers || []).some(x => x.length > 5 && (rc.includes(x) || x.includes(rc)))) { score = 0.7; why = 'اسم مستلم مشابه'; }
        else if (sd && (id.senders || []).some(x => x === sd)) { score = 0.6; why = 'نفس اسم المرسل'; }
        if (score > (best ? best.score : 0)) best = { phone: p.phone, name: p.name, side: p.side, score, why }; }
      out.push({ id: it.id, guess: best }); }
    return out;
  }
  app.post('/parties/profiles/rebuild', express.json(), wrap(rebuildProfiles));
  app.post('/parties/infer', express.json(), wrap(async req => infer(Array.isArray(req.body) ? req.body.slice(0, 500) : [])));
  setInterval(() => rebuildProfiles().catch(() => {}), 6 * 3600e3);
  app.get('/parties', wrap(async () => sb('/bdl_parties?select=phone,name,side,aliases,note,identifiers,updated_at&order=updated_at.desc&limit=5000')));
  app.get('/parties/find', wrap(async req => { const q = String(req.query.q || '').trim(); if (!q) return []; const ph = norm(q); if (ph.length >= 5) return sb('/bdl_parties?select=phone,name,side,aliases&phone=like.*' + ph + '*&limit=10'); return sb('/bdl_parties?select=phone,name,side,aliases&or=(name.ilike.*' + encodeURIComponent(q) + '*,aliases.cs.{' + encodeURIComponent(q) + '})&limit=10'); }));
  app.post('/parties', express.json(), wrap(async req => ({ saved: await upsert(Array.isArray(req.body) ? req.body : [req.body || {}]) })));
  app.post('/parties/sync', express.json(), wrap(sync));
  app.locals.parties = { upsert, norm, find: async phone => (await sb('/bdl_parties?select=phone,name,side,aliases&phone=eq.' + norm(phone) + '&limit=1'))[0] || null };
  setTimeout(() => sync().catch(() => {}), 30000); setInterval(() => sync().catch(() => {}), 6 * 3600e3);
  console.log('▲ parties directory ready');
};
