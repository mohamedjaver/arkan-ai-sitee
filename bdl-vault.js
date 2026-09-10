/* bdl-vault.js — المعايير المالية (Build 1289 — الدفعة D)
   سجل تدقيق لكل تعديل مالي · سلة 30 يومًا بدل الحذف النهائي · PIN للعمليات الحساسة · تصدير شهري مجمّد إلى Storage.
   Railway: BDL_PIN (6 أرقام) — إن لم يُضبط تُقبل العمليات مع تحذير في حالة الاتصال. */
'use strict';
module.exports = function (app, ctx) {
  const { express, jwt, JWT_SECRET, SB_REST, SB_PUB, ownerToken } = ctx;
  const PIN = () => String(process.env.BDL_PIN || '').trim();
  const auth = req => { try { jwt.verify(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''), JWT_SECRET); return true; } catch (e) { return false; } };
  async function sb(path, opt) { opt = opt || {};
    const r = await fetch(SB_REST + path, Object.assign({}, opt, { headers: Object.assign({ apikey: SB_PUB, Authorization: 'Bearer ' + ownerToken(), 'Content-Type': 'application/json' }, opt.headers || {}), body: opt.body ? JSON.stringify(opt.body) : undefined }));
    const t = await r.text(); if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + t.slice(0, 160)); return t ? JSON.parse(t) : null; }
  const inList = a => '(' + a.map(x => '"' + String(x).replace(/"/g, '') + '"').join(',') + ')';
  async function audit(action, tbl, row_id, before, after, source) {
    try { await sb('/bdl_audit', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { actor: 'owner', action, tbl, row_id: String(row_id || ''), before: before || null, after: after || null, source: source || 'web' } }); } catch (e) {}
  }
  const wrap = (fn, sensitive) => async (req, res) => {
    if (!auth(req)) return res.status(401).json({ error: 'الجلسة منتهية' });
    if (sensitive && PIN() && String(req.headers['x-bdl-pin'] || '') !== PIN()) return res.status(403).json({ error: 'PIN غير صحيح', pin: true });
    try { res.json(await fn(req)); } catch (e) { res.status(500).json({ error: String(e.message).slice(0, 300) }); }
  };

  /* ── الحذف إلى السلة: إيصالات (بالبصمة) مع تصحيح قيود الدفتر المرتبطة كما كان يفعل compare.html ── */
  async function trashReceipts(fps, reason, source) {
    if (!fps.length) return { moved: 0 };
    const rows = []; for (let i = 0; i < fps.length; i += 150) rows.push(...await sb('/bdl_cmp_receipts?select=*&fp=in.' + inList(fps.slice(i, i + 150))));
    const set = new Set(fps); const byE = {}; rows.forEach(x => { if (x.book_entry_id) (byE[x.book_entry_id] = byE[x.book_entry_id] || []).push(x); });
    for (const eid in byE) { try {
      const all = await sb('/bdl_cmp_receipts?select=fp,amount&book_entry_id=eq.' + eid); const ent = (await sb('/bdl_book_entries?select=*&id=eq.' + eid))[0];
      if (!ent) continue;
      if (all.every(x => set.has(x.fp))) { await sb('/bdl_trash', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { tbl: 'bdl_book_entries', row_id: String(eid), row: ent, reason } }); await sb('/bdl_book_entries?id=eq.' + eid, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); await audit('trash', 'bdl_book_entries', eid, ent, null, source); }
      else { const na = Math.max(0, Number(ent.amount) - byE[eid].reduce((a, x) => a + Number(x.amount || 0), 0)); await sb('/bdl_book_entries?id=eq.' + eid, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { amount: na } }); await audit('patch', 'bdl_book_entries', eid, { amount: ent.amount }, { amount: na }, source); }
    } catch (e) {} }
    let warn = null;
    for (const r of rows) { try { await sb('/bdl_trash', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { tbl: 'bdl_cmp_receipts', row_id: r.fp, row: r, reason } }); } catch (e) { if (/PGRST205|Could not find/.test(e.message)) { warn = 'جدول السلة غير موجود — الصق SQL الدفعة D؛ الحذف تم بلا نسخة احتياطية'; break; } throw e; } }
    // فك الربط من الطرف الآخر إن كان مرتبطًا بإيصال باقٍ
    const mates = rows.map(r => r.matched_fp).filter(f => f && !set.has(f));
    for (let i = 0; i < mates.length; i += 150) await sb('/bdl_cmp_receipts?fp=in.' + inList(mates.slice(i, i + 150)), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { matched_fp: null, how: '' } });
    for (let i = 0; i < fps.length; i += 150) await sb('/bdl_cmp_receipts?fp=in.' + inList(fps.slice(i, i + 150)), { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    const left = await sb('/bdl_cmp_receipts?select=fp&fp=in.' + inList(fps.slice(0, 150)));
    if (left && left.length) throw new Error('الخادم لم يستطع حذف ' + left.length + ' إيصالًا (سياسة RLS/مالك مختلف) — أرسل هذا النص');
    await audit('trash', 'bdl_cmp_receipts', fps.length + ' receipts', { fps: fps.slice(0, 200), sum: rows.reduce((a, x) => a + Number(x.amount || 0), 0) }, null, source);
    return { moved: rows.length, warning: warn };
  }
  async function restore(id) {
    const t = (await sb('/bdl_trash?select=*&id=eq.' + Number(id)))[0]; if (!t || t.restored_at) throw new Error('غير موجود أو مُستعاد');
    const row = Object.assign({}, t.row); if (t.tbl === 'bdl_cmp_receipts') { delete row.id; } 
    const conflict = t.tbl === 'bdl_cmp_receipts' ? '?on_conflict=owner_id,fp' : '';
    await sb('/' + t.tbl + conflict, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: row });
    await sb('/bdl_trash?id=eq.' + t.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { restored_at: new Date().toISOString() } });
    await audit('restore', t.tbl, t.row_id, null, row, 'web'); return { ok: true };
  }
  async function purge() { try { const cut = new Date(Date.now() - 30 * 864e5).toISOString(); await sb('/bdl_trash?at=lt.' + cut, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); } catch (e) {} }

  /* ── التصدير الشهري المجمّد: CSV للإيصالات والقيود والصفقات → Storage/receipts/exports/YYYY-MM/ ── */
  const csv = (rows, cols) => [cols.join(',')].concat(rows.map(r => cols.map(c => { let v = r[c]; if (v == null) v = ''; v = String(v).replace(/"/g, '""'); return /[",\n]/.test(v) ? '"' + v + '"' : v; }).join(','))).join('\n');
  async function exportMonth(month) {
    const from = month + '-01', to = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 1).toISOString().slice(0, 10);
    const R = await sb('/bdl_cmp_receipts?select=fp,side,amount,ccy,who,phone,bank,ref,msg_at,matched_fp,how,book_entry_id,receipt_url&msg_at=gte.' + from + '&msg_at=lt.' + to + '&order=msg_at.asc&limit=50000');
    const E = await sb('/bdl_book_entries?select=id,book_id,side,amount,ref,note,entry_date,created_at&created_at=gte.' + from + '&created_at=lt.' + to + '&order=created_at.asc&limit=20000');
    let D = []; try { D = await sb('/bdl_deals?select=id,created_at,cust_fp,sup_fp,amount_aoa,unit,cust_rate,sup_rate,profit,source&created_at=gte.' + from + '&created_at=lt.' + to + '&order=created_at.asc&limit=20000'); } catch (e) {}
    const files = { 'receipts.csv': csv(R, ['fp', 'side', 'amount', 'ccy', 'who', 'phone', 'bank', 'ref', 'msg_at', 'matched_fp', 'how', 'book_entry_id', 'receipt_url']), 'entries.csv': csv(E, ['id', 'book_id', 'side', 'amount', 'ref', 'note', 'entry_date', 'created_at']), 'deals.csv': csv(D, ['id', 'created_at', 'cust_fp', 'sup_fp', 'amount_aoa', 'unit', 'cust_rate', 'sup_rate', 'profit', 'source']) };
    const base = SB_REST.replace('/rest/v1', ''); const urls = {};
    for (const name in files) { const path = 'exports/' + month + '/' + name;
      const up = await fetch(base + '/storage/v1/object/receipts/' + path, { method: 'POST', headers: { apikey: SB_PUB, Authorization: 'Bearer ' + ownerToken(), 'Content-Type': 'text/csv', 'x-upsert': 'true' }, body: '\ufeff' + files[name] });
      if (!up.ok) throw new Error('Storage ' + up.status + ': ' + (await up.text()).slice(0, 120)); urls[name] = base + '/storage/v1/object/public/receipts/' + path; }
    await audit('export', 'monthly', month, null, { receipts: R.length, entries: E.length, deals: D.length }, 'vault');
    return { month, receipts: R.length, entries: E.length, deals: D.length, sums: { cust: R.filter(r => r.side === 'cust').reduce((a, r) => a + Number(r.amount || 0), 0), sup: R.filter(r => r.side === 'sup').reduce((a, r) => a + Number(r.amount || 0), 0), profit: D.reduce((a, d) => a + Number(d.profit || 0), 0) }, urls };
  }

  app.get('/vault/status', wrap(async () => ({ pin: PIN() ? 'مفعّل' : 'غير مضبوط — أضف BDL_PIN في Railway' })));
  app.post('/vault/trash', express.json(), wrap(async req => trashReceipts((req.body && req.body.fps) || [], (req.body && req.body.reason) || '', 'compare'), true));
  app.post('/vault/restore', express.json(), wrap(async req => restore(req.body && req.body.id), true));
  app.get('/vault/trash/fps', wrap(async () => { const cut = new Date(Date.now() - 30 * 864e5).toISOString(); const t = await sb('/bdl_trash?select=row_id&tbl=eq.bdl_cmp_receipts&restored_at=is.null&at=gte.' + cut + '&limit=5000'); return t.map(x => x.row_id); }));
  app.get('/vault/trash', wrap(async () => sb('/bdl_trash?select=id,at,tbl,row_id,reason,restored_at,row->amount,row->who,row->side&order=at.desc&limit=100')));
  app.get('/vault/audit', wrap(async () => sb('/bdl_audit?select=id,at,action,tbl,row_id,before,after,source&order=at.desc&limit=100')));
  app.post('/vault/audit', express.json(), wrap(async req => { const b = req.body || {}; await audit(b.action, b.tbl, b.row_id, b.before, b.after, b.source || 'web'); return { ok: true }; }));
  app.post('/vault/export', express.json(), wrap(async req => exportMonth(String((req.body && req.body.month) || new Date().toISOString().slice(0, 7))), true));
  /* أوامر تيليجرام: «حذف 5000000» يعرض الإيصالات المطابقة بأزرار حذف — يعمل من أي جهاز بلا واجهة */
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
  const escT = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  app.locals.tgText = async function (text, chatId) {
    const m = String(text).match(/^(?:\/del|\/حذف|حذف|delete)\s+([\d.,\s]+)/i); if (!m) return false;
    const amt = Number(m[1].replace(/[^\d.]/g, '')); if (!(amt > 0)) return false;
    const tg = ctx.tg; if (!tg) return false;
    const rows = await sb('/bdl_cmp_receipts?select=fp,side,amount,who,phone,msg_at,bank&amount=eq.' + amt + '&order=msg_at.desc&limit=8');
    if (!rows.length) { await tg('sendMessage', { chat_id: chatId, text: 'لا يوجد إيصال بمبلغ ' + fmt(amt) }); return true; }
    for (const r of rows) await tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', text: (r.side === 'cust' ? '👤 زبون' : '🏦 مورد') + ' · <b>' + fmt(r.amount) + ' AOA</b>\n' + escT(r.who || '') + ' ' + escT(r.phone || '') + '\n' + String(r.msg_at || '').slice(0, 10) + ' · ' + escT(r.bank || ''), reply_markup: { inline_keyboard: [[{ text: '🗑 حذف إلى السلة', callback_data: 'vt:' + r.fp.slice(0, 24) }, { text: '✖', callback_data: 'wa:skip' }]] } });
    return true;
  };
  const prevCb = app.locals.tgCallback;
  app.locals.tgCallback = async function (cq) {
    const d = String(cq.data || ''); const mm = d.match(/^vt:([0-9a-f]+)$/);
    if (!mm) return prevCb ? prevCb(cq) : null;
    const ans = t => ctx.tg ? ctx.tg('answerCallbackQuery', { callback_query_id: cq.id, text: t }).catch(() => {}) : null;
    try { const r = (await sb('/bdl_cmp_receipts?select=fp&fp=like.' + mm[1] + '*&limit=1'))[0]; if (!r) return ans('غير موجود (حُذف سابقًا)');
      const out = await trashReceipts([r.fp], 'telegram', 'telegram'); return ans(out.moved ? 'حُذف إلى السلة ✓' : 'لم يُحذف'); }
    catch (e) { return ans('خطأ: ' + e.message.slice(0, 80)); }
  };
  app.locals.vault = { audit, exportMonth, purge };
  purge(); setInterval(purge, 24 * 3600e3);
  console.log('▲ vault ready (PIN ' + (PIN() ? 'on' : 'off') + ')');
};
