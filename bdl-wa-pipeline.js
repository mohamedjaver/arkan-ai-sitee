/* bdl-wa-pipeline.js — أنبوب واتساب → Claude → الدفتر → المطابقة (بموافقة المالك عبر تيليجرام) — Build 1280
   يُستدعى من /wa/webhook في server.js. الجداول: bdl_wa_parties (هاتف→جهة)، bdl_wa_pending (إيصالات بانتظار تحديد الجهة). */
'use strict';
module.exports = function (app, ctx) {
  const { SB_REST, SB_PUB, ownerToken, tg, ADMIN_ID, WA_TOKEN } = ctx;
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
  const norm = p => String(p || '').replace(/\D/g, '').replace(/^00/, '');
  async function sb(path, opt) { opt = opt || {};
    const r = await fetch(SB_REST + path, Object.assign({}, opt, { headers: Object.assign({ apikey: SB_PUB, Authorization: 'Bearer ' + ownerToken(), 'Content-Type': 'application/json' }, opt.headers || {}), body: opt.body ? JSON.stringify(opt.body) : undefined }));
    const t = await r.text(); if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + t.slice(0, 160)); return t ? JSON.parse(t) : null; }
  async function tgSend(text, buttons) { if (!ADMIN_ID || !tg) return; try { await tg('sendMessage', { chat_id: ADMIN_ID, text, parse_mode: 'HTML', reply_markup: buttons ? { inline_keyboard: [buttons] } : undefined }); } catch (e) {} }
  async function waReply(pnid, to, text) { if (!pnid || !WA_TOKEN) return; try { await fetch('https://graph.facebook.com/v20.0/' + pnid + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + WA_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to, text: { body: text } }) }); } catch (e) {} }
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sideAr = s => s === 'cust' ? 'زبون' : 'مورد';

  async function partyOf(phone) { try { if (app.locals.parties) { const p = await app.locals.parties.find(phone); if (p) return { phone: p.phone, name: p.name, side: p.side === 'both' ? null : p.side }; } const r = await sb('/bdl_wa_parties?select=phone,name,side&phone=eq.' + norm(phone) + '&limit=1'); return r && r[0] || null; } catch (e) { return null; } }
  async function saveParty(phone, name, side) { try { if (app.locals.parties) await app.locals.parties.upsert([{ phone, name, side }]); } catch (e) {} try { await sb('/bdl_wa_parties?on_conflict=phone', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { phone: norm(phone), name: String(name || '').slice(0, 80), side } }); } catch (e) {} }

  async function read(buf, mime) {
    const readOne = app.locals.cmpReadOne; if (!readOne) throw new Error('محرك القراءة غير جاهز');
    return readOne({ key: process.env.GEMINI_KEY || '', side: 'cust' }, { data: buf, name: /pdf/.test(mime) ? 'wa.pdf' : /png/.test(mime) ? 'wa.png' : 'wa.jpg' });
  }
  function row(fp, side, r, phone, name, url) {
    return { fp, side, amount: r.amount == null ? null : Number(r.amount), amount_read: r.amountRead || null, ccy: r.ccy || 'AOA', ref: String(r.ref || '').slice(0, 64), who: String(name || r.who || '').slice(0, 80), bank: String(r.bank || '').slice(0, 40), phone: '+' + norm(phone), msg_at: new Date().toISOString(), receipt_url: url || null, matched_fp: null, how: '', manual: false, verified: !!r.verified, review: !!r.review || !(r.amount > 0), flags: (r.flags || []).concat(['whatsapp']), book_entry_id: null };
  }
  async function insertLedger(x) { await sb('/bdl_cmp_receipts?on_conflict=owner_id,fp', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: x }); }

  /* المطابقة: قواعد أولًا (مرجع، أو مبلغ ±0.5% خلال 3 أيام)، ثم Claude — اقتراح واحد بأزرار */
  async function proposeMatch(x) {
    if (!(x.amount > 0) || x.review) return;
    const other = x.side === 'cust' ? 'sup' : 'cust';
    const cands = await sb('/bdl_cmp_receipts?select=fp,amount,who,msg_at,ref&side=eq.' + other + '&matched_fp=is.null&amount=not.is.null&ccy=eq.AOA&order=msg_at.desc&limit=400');
    const ref = (x.ref || '').replace(/\s+/g, '').toLowerCase();
    let hit = cands.filter(c => ref && ref.length >= 4 && (c.ref || '').replace(/\s+/g, '').toLowerCase() === ref);
    if (!hit.length) hit = cands.filter(c => Math.abs(Number(c.amount) - x.amount) / x.amount <= 0.005 && Math.abs(new Date(c.msg_at) - new Date(x.msg_at)) <= 3 * 864e5);
    let why = hit.length ? (ref && (hit[0].ref || '').replace(/\s+/g, '').toLowerCase() === ref ? 'نفس المرجع' : 'نفس المبلغ خلال 3 أيام') : '';
    if (hit.length !== 1 && app.locals.aiMatch) {
      try { const m = await app.locals.aiMatch({ body: {} }); const p = (m.pairs || []).find(p => p.sup.fp === x.fp || p.cust.some(c => c.fp === x.fp));
        if (p) { if (p.cust.length === 1) { hit = [x.side === 'cust' ? p.sup : p.cust[0]]; why = 'Claude ' + p.confidence + '% — ' + p.reason; }
          else { await tgSend('🧩 Claude يقترح تجميعًا: مورد ' + fmt(p.sup.amount) + ' = ' + p.cust.map(c => fmt(c.amount) + ' (' + esc(c.who) + ')').join(' + ') + '\nثقة ' + p.confidence + '% — ' + esc(p.reason) + '\nاربطه من صفحة المقارنة بعد التحقق.'); return; } }
      } catch (e) {}
    }
    if (hit.length === 1) { const h = hit[0];
      await tgSend('🔗 مقابل محتمل (' + esc(why) + ')\n' + sideAr(x.side) + ': <b>' + fmt(x.amount) + '</b> ' + esc(x.who) + '\n' + sideAr(other) + ': <b>' + fmt(h.amount) + '</b> ' + esc(h.who) + ' · ' + String(h.msg_at).slice(0, 10),
        [{ text: '✅ اعتمد الربط', callback_data: 'wa:link:' + x.fp.slice(0, 24) + ':' + h.fp.slice(0, 24) }, { text: '✖ تجاهل', callback_data: 'wa:skip' }]); }
  }

  async function finalize(fp, side, r, phone, name, url, pnid) {
    const x = row(fp, side, r, phone, name, url);
    /* منع التكرار بالمحتوى: نفس الجانب والمبلغ واليوم والهاتف (بلا مرجع) → يُسجَّل للمراجعة لا كإيصال جديد */
    try { if (x.amount > 0) { const day = x.msg_at.slice(0, 10); const q = '/bdl_cmp_receipts?select=fp,ref,who&side=eq.' + side + '&amount=eq.' + x.amount + '&msg_at=gte.' + day + '&msg_at=lt.' + day + 'T23:59:59&phone=eq.' + encodeURIComponent(x.phone) + '&limit=3'; const same = await sb(q); const hit = same.find(s => s.fp !== fp && (!x.ref || !s.ref || s.ref === x.ref)); if (hit) { x.review = true; x.flags = (x.flags || []).concat(['dup-suspect']); await tgSend('⚠️ إيصال <b>مكرر محتمل</b> من ' + esc(x.who) + ' — ' + fmt(x.amount) + ' ' + x.ccy + ' اليوم (سُجّل للمراجعة، لن يدخل المطابقة)'); } } } catch (e) {}
    await insertLedger(x);
    await waReply(pnid, phone, x.review ? 'تم استلام الإيصال وسيُراجع يدويًا.' : 'تم تسجيل إيصال ' + fmt(x.amount) + ' ' + x.ccy + (x.ref ? ' (مرجع ' + x.ref + ')' : '') + '.');
    await tgSend((x.review ? '🟠 إيصال يحتاج مراجعة' : '🧾 إيصال جديد') + ' — ' + sideAr(side) + '\n<b>' + fmt(x.amount) + ' ' + x.ccy + '</b> · ' + esc(x.who) + ' · ' + esc(x.bank) + (x.ref ? ' · ' + esc(x.ref) : '') + '\n📱 +' + norm(phone) + (url ? '\n' + url : ''));
    try { await proposeMatch(x); } catch (e) { console.warn('wa-match:', e.message); }
  }

  async function handle(m) {   // { buf, mime, fp, from, caption, url, pnid }
    try {
      const dup = await sb('/bdl_cmp_receipts?select=fp&fp=eq.' + m.fp + '&limit=1');
      if (dup && dup.length) { await waReply(m.pnid, m.from, 'هذا الإيصال مسجل سابقًا.'); return; }
      const cap = String(m.caption || '');
      let side = /مورد|supplier|\bsup\b/i.test(cap) ? 'sup' : /زبون|customer|\bcust\b/i.test(cap) ? 'cust' : null;
      const party = await partyOf(m.from); if (!side && party) side = party.side;
      const r = await read(m.buf, m.mime);
      if (r.isReceipt === false) { await waReply(m.pnid, m.from, 'الملف ليس إيصالًا بنكيًا.'); return; }
      const name = party ? party.name : (r.who || '');
      if (!side) {
        await sb('/bdl_wa_pending?on_conflict=fp', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { fp: m.fp, phone: '+' + norm(m.from), name, url: m.url, mime: m.mime, read: r } });
        await waReply(m.pnid, m.from, 'تم استلام الإيصال.');
        await tgSend('❓ رقم جديد +' + norm(m.from) + ' أرسل إيصال <b>' + fmt(r.amount) + ' ' + (r.ccy || 'AOA') + '</b> (' + esc(r.who || r.bank) + ')\nمن هو؟',
          [{ text: '👤 زبون', callback_data: 'wa:side:' + m.fp.slice(0, 24) + ':cust' }, { text: '🏦 مورد', callback_data: 'wa:side:' + m.fp.slice(0, 24) + ':sup' }]);
        return;
      }
      if (party && cap && side !== party.side) await saveParty(m.from, party.name, side);
      await finalize(m.fp, side, r, m.from, name, m.url, m.pnid);
    } catch (e) { console.error('wa-pipe:', e.message); await tgSend('⚠️ أنبوب واتساب: ' + esc(e.message)); }
  }

  async function callback(cq) {
    const d = String(cq.data || ''); const ans = t => tg('answerCallbackQuery', { callback_query_id: cq.id, text: t }).catch(() => {});
    try {
      if (d === 'wa:skip') return ans('تم التجاهل');
      let mm = d.match(/^wa:side:([0-9a-f]+):(cust|sup)$/);
      if (mm) { const p = (await sb('/bdl_wa_pending?select=*&fp=like.' + mm[1] + '*&limit=1'))[0]; if (!p) return ans('انتهى');
        await saveParty(p.phone, p.name, mm[2]); await finalize(p.fp, mm[2], p.read || {}, p.phone, p.name, p.url, null);
        await sb('/bdl_wa_pending?fp=eq.' + p.fp, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return ans('سُجّل كـ' + sideAr(mm[2]) + ' وحُفظ الرقم'); }
      mm = d.match(/^wa:link:([0-9a-f]+):([0-9a-f]+)$/);
      if (mm) { const a = (await sb('/bdl_cmp_receipts?select=fp,matched_fp&fp=like.' + mm[1] + '*&limit=1'))[0], b = (await sb('/bdl_cmp_receipts?select=fp,matched_fp&fp=like.' + mm[2] + '*&limit=1'))[0];
        if (!a || !b) return ans('الإيصال غير موجود'); if (a.matched_fp || b.matched_fp) return ans('أحدهما مربوط أصلًا');
        await sb('/bdl_cmp_receipts?fp=eq.' + a.fp, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { matched_fp: b.fp, how: 'wa-confirm' } });
        await sb('/bdl_cmp_receipts?fp=eq.' + b.fp, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { matched_fp: a.fp, how: 'wa-confirm' } });
        try { if (app.locals.upsertDeal) { const A = (await sb('/bdl_cmp_receipts?select=fp,side,amount&fp=in.("' + a.fp + '","' + b.fp + '")')); const c = A.find(x => x.side === 'cust'), sp = A.find(x => x.side === 'sup'); if (c && sp) await app.locals.upsertDeal({ cust_fp: c.fp, sup_fp: sp.fp, amount_aoa: c.amount, source: 'whatsapp' }); } } catch (e) {}
        return ans('تم الربط ✓'); }
      ans('');
    } catch (e) { ans('خطأ: ' + e.message.slice(0, 60)); }
  }

  app.locals.waPipe = { handle }; app.locals.tgCallback = callback;
  console.log('▲ wa pipeline ready');
};
