/* bdl-daily.js — تقرير الدورات اليومي على Telegram (Build 1393)
   يقرأ الدورات المحفوظة في bdl_transactions.meta.cycle (بطاقة «دورة USDT»)، يحسب الأرقام في الكود،
   ثم يطلب من Claude قراءة قصيرة (أولويات ومخاطر). فشل Claude لا يمنع التقرير — تُرسل الأرقام وحدها.
   Railway (اختياري): CYCLE_REPORT_HOUR (افتراضي 22 بتوقيت لواندا) · CYCLE_LATE_DAYS (افتراضي 2) · AGENT_TZ_OFFSET (افتراضي 1).
   أوامر المالك في البوت: «تقرير» أو «دورات» — يرسل التقرير فورًا. */
'use strict';
module.exports = function (app, ctx) {
  const { jwt, JWT_SECRET, SB_REST, SB_PUB, ownerToken, tg, adminId } = ctx;
  const KEY = () => { for (const k of Object.keys(process.env)) if (/^anthropic_(api_)?key$/i.test(k)) { const v = String(process.env[k] || '').trim(); if (v) return v; } return ''; };
  const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const TZ = () => { const v = parseFloat(process.env.AGENT_TZ_OFFSET); return isFinite(v) ? v : 1; };
  const HOUR = () => { const v = parseInt(process.env.CYCLE_REPORT_HOUR, 10); return v >= 0 && v <= 23 ? v : 22; };
  const LATE = () => { const v = parseFloat(process.env.CYCLE_LATE_DAYS); return v > 0 ? v : 2; };
  const f = (v, d) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g, '')); return isFinite(x) ? x : 0; };
  const sum = (a, d) => (a || []).reduce((s, x) => s + ((d && ((x.d || 'in') !== d)) ? 0 : (Number(x.a) || 0)), 0);
  const localDay = iso => { const d = new Date(new Date(iso).getTime() + TZ() * 3600000); return d.toISOString().slice(0, 10); };
  async function sb(path) { const r = await fetch(SB_REST + path, { headers: { apikey: SB_PUB, Authorization: 'Bearer ' + ownerToken() } }); if (!r.ok) throw new Error('Supabase ' + r.status); return r.json(); }

  /* نفس حساب بطاقة «دورة USDT» في bdl-cycle.js — أي تغيير هناك يُعكس هنا */
  function calc(c, aoa, mruCust) { const rs = num(c.rs); let ru = num(c.ru); if (ru >= 100) ru /= 10; const o = { rs, ru, aoa: aoa || 0, mruCust: mruCust || 0, ok: rs > 0 && ru > 0 };
    o.rc = (aoa > 0 && mruCust > 0) ? mruCust / aoa : 0; o.cost = o.ok ? ru / rs : 0; o.margin = (o.ok && o.rc > 0) ? (o.cost - o.rc) / o.rc * 100 : 0;
    o.usdtExp = (rs > 0 && aoa > 0) ? aoa / rs : 0; o.mruExp = o.usdtExp * ru; o.profitExp = (o.ok && aoa > 0 && mruCust > 0) ? o.mruExp - mruCust : 0;
    o.usdtGot = sum(c.usdt, 'in'); o.usdtOut = sum(c.usdt, 'out'); o.mruGot = sum(c.mru, 'in'); o.mruOut = sum(c.mru, 'out');
    o.usdtHeld = Math.max(0, o.usdtGot - o.usdtOut); o.preFund = Math.max(0, o.mruOut - o.mruGot); o.custLeft = Math.max(0, o.mruCust - o.mruOut); o.usdtLeft = Math.max(0, o.usdtExp - o.usdtGot); o.mruLeft = Math.max(0, o.mruExp - o.mruGot);
    o.done = o.ok && o.mruExp > 0 && o.mruGot >= o.mruExp * 0.995; o.profitReal = o.mruGot - mruCust; return o; }

  async function facts(now) { now = now || new Date();
    const sel = 'select=id,amount,ccy,settle_amount,settle_ccy,status,meta,created_at,customer_id&order=created_at.desc';
    let rows; try { rows = await sb('/bdl_transactions?' + sel + '&meta->cycle=not.is.null&limit=800'); } catch (e) { rows = await sb('/bdl_transactions?' + sel + '&limit=1000'); }
    rows = rows.filter(t => t.meta && t.meta.cycle && t.meta.cycle.id);
    const g = {}, ord = [];
    rows.forEach(t => { const c = t.meta.cycle; let x = g[c.id]; if (!x) { x = g[c.id] = { c, aoa: 0, mru: 0, paid: 0, cust: t.customer_id, at: t.created_at }; ord.push(c.id); }
      if (String(c.upd || '') > String(x.c.upd || '')) x.c = c;
      if (t.ccy === 'MRU') x.mru += Number(t.amount) || 0; if ((t.settle_ccy || 'AOA') === 'AOA') x.aoa += Number(t.settle_amount) || 0;
      x.paid += Number(t.meta.paid_aoa) || 0; if (t.created_at < x.at) x.at = t.created_at; });
    const names = {}; try { const ids = [...new Set(rows.map(t => t.customer_id).filter(Boolean))].slice(0, 150); if (ids.length) (await sb('/bdl_customers?select=id,name&id=in.(' + ids.join(',') + ')')).forEach(x => { names[x.id] = x.name; }); } catch (e) {}
    const today = localDay(now), lateMs = LATE() * 86400000;
    const F = { date: today, cycles: [], open: 0, done: 0, usdtLeft: 0, mruLeft: 0, aoaLeft: 0, profitExpOpen: 0, profitRealAll: 0, today: { usdt: 0, mru: 0, closed: 0, profit: 0 }, late: 0, noRates: 0, usdtHeld: 0, preFund: 0, custLeft: 0 };
    ord.forEach(id => { const x = g[id], k = calc(x.c, x.aoa, x.mru);
      const lastMru = (x.c.mru || []).reduce((m, e) => ((e.d || 'in') === 'in' && e.t && e.t > m ? e.t : m), '');
      const tU = (x.c.usdt || []).filter(e => (e.d || 'in') === 'in' && e.t && localDay(e.t) === today).reduce((s, e) => s + (Number(e.a) || 0), 0);
      const tM = (x.c.mru || []).filter(e => (e.d || 'in') === 'in' && e.t && localDay(e.t) === today).reduce((s, e) => s + (Number(e.a) || 0), 0);
      const ageD = (now - new Date(x.at)) / 86400000, late = !k.done && (now - new Date(x.at)) > lateMs;
      const stage = !k.ok ? 'بلا أسعار' : k.done ? 'مكتملة' : (x.aoa > 0 && x.paid < x.aoa * 0.995) ? 'بانتظار كوانزا الزبون' : k.usdtLeft >= 1 ? 'بانتظار USDT من المورد' : 'بانتظار أوقية دبي';
      F.cycles.push({ name: names[x.cust] || 'زبون', at: localDay(x.at), ageDays: Math.floor(ageD), stage, late, aoa: x.aoa, paid: x.paid, rs: k.rs, ru: k.ru, margin: k.margin, usdtGot: k.usdtGot, usdtExp: k.usdtExp, mruGot: k.mruGot, mruExp: k.mruExp, usdtHeld: k.usdtHeld, preFund: k.preFund, custLeft: k.custLeft, profit: k.done ? k.profitReal : k.profitExp, done: k.done, ok: k.ok });
      F.today.usdt += tU; F.today.mru += tM; F.usdtHeld += k.usdtHeld; F.preFund += k.preFund; if (!k.done || k.custLeft >= 1) F.custLeft += k.custLeft;
      if (!k.ok) { F.noRates++; F.open++; return; }
      if (k.done) { F.done++; F.profitRealAll += k.profitReal; if (lastMru && localDay(lastMru) === today) { F.today.closed++; F.today.profit += k.profitReal; } }
      else { F.open++; F.usdtLeft += k.usdtLeft; F.mruLeft += k.mruLeft; F.aoaLeft += Math.max(0, x.aoa - x.paid); F.profitExpOpen += k.profitExp; if (late) F.late++; } });
    return F; }

  function text(F, note) { const L = [];
    L.push('<b>BDL — تقرير الدورات</b> · ' + F.date.split('-').reverse().join('/'));
    L.push('');
    L.push('<b>اليوم</b>');
    L.push('USDT مستلم: <code>' + f(F.today.usdt, 2) + '</code>');
    L.push('أوقية مستلمة من دبي: <code>' + f(F.today.mru) + '</code> MRU');
    L.push('دورات أُقفلت: ' + F.today.closed + ' · ربح محقق: <code>' + f(F.today.profit) + '</code> MRU');
    L.push('');
    L.push('<b>المفتوح الآن</b> — ' + F.open + ' دورة' + (F.late ? ' · <b>' + F.late + ' متأخرة</b>' : ''));
    L.push('كوانزا باقية على الزبائن: <code>' + f(F.aoaLeft) + '</code>');
    L.push('USDT باقٍ عند الموردين: <code>' + f(F.usdtLeft, 2) + '</code>');
    L.push('أوقية باقية من دبي: <code>' + f(F.mruLeft) + '</code> MRU');
    L.push('ربح متوقع عند الإقفال: <code>' + f(F.profitExpOpen) + '</code> MRU');
    L.push('');
    L.push('<b>مراكزك المكشوفة</b>');
    L.push('USDT في محفظتك لم يُبع: <code>' + f(F.usdtHeld, 2) + '</code>');
    L.push('دفعته للزبائن قبل استلامه من دبي: <code>' + f(F.preFund) + '</code> MRU');
    L.push('أوقية باقية للزبائن: <code>' + f(F.custLeft) + '</code> MRU');
    const open = F.cycles.filter(c => !c.done).sort((a, b) => b.ageDays - a.ageDays).slice(0, 12);
    if (open.length) { L.push(''); L.push('<b>الدورات المفتوحة</b>');
      open.forEach((c, i) => { L.push((i + 1) + '. <b>' + esc(c.name) + '</b> · ' + c.at.split('-').reverse().slice(0, 2).join('/') + ' · ' + c.stage + (c.late ? ' · متأخرة ' + c.ageDays + ' يوم' : ''));
        if (c.ok) L.push('   USDT <code>' + f(c.usdtGot, 2) + '/' + f(c.usdtExp, 2) + '</code> · MRU <code>' + f(c.mruGot) + '/' + f(c.mruExp) + '</code> · هامش ' + f(c.margin, 2) + '%');
        else L.push('   كوانزا <code>' + f(c.paid) + '/' + f(c.aoa) + '</code> — أدخل سعر المورد وسعر دبي في بطاقة الدورة'); });
      if (F.open > open.length) L.push('… و' + (F.open - open.length) + ' دورة أخرى في «كل الدورات»'); }
    if (note) { L.push(''); L.push('<b>قراءة Claude</b>'); L.push(esc(note)); }
    return L.join('\n'); }

  async function claudeNote(F) { if (!KEY() || !F.cycles.length) return '';
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 25000);
    try { const slim = Object.assign({}, F, { cycles: F.cycles.filter(c => !c.done).slice(0, 15) });
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': KEY(), 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL(), max_tokens: 350,
          system: 'أنت محاسب صرافة تخاطب صاحب العمل مباشرة بالعربية. تصلك أرقام دورات اليوم بصيغة JSON: الزبون يدفع كوانزا (AOA) ويستلم أوقية (MRU)، المورد الأنغولي يسلّم USDT، ومشتري دبي يدفع أوقية مقابل USDT. اكتب من 2 إلى 4 أسطر قصيرة فقط: ما الذي يجب ملاحقته أولًا اليوم ولماذا، وأي خطر واضح (دورة متأخرة، هامش ضعيف أو سالب، مبلغ كبير معلّق عند طرف واحد، USDT محتفظ به لم يُبع usdtHeld، أو أوقية دُفعت للزبون قبل استلامها من دبي preFund). استخدم الأرقام الموجودة فقط ولا تخترع رقمًا أو اسمًا. بلا Markdown وبلا رموز تعبيرية وبلا مقدمات. إن لم يوجد ما يستحق التنبيه فقل ذلك في سطر واحد.',
          messages: [{ role: 'user', content: JSON.stringify(slim) }] }) });
      if (!r.ok) return ''; const d = await r.json(); return ((d.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n') || '').trim().slice(0, 900);
    } catch (e) { return ''; } finally { clearTimeout(tm); } }

  async function send(chatId, opts) { opts = opts || {}; const F = await facts();
    if (!F.cycles.length) { if (opts.manual) await tg('sendMessage', { chat_id: chatId, text: 'لا توجد دورات مسجلة بعد. من تبويب «العمليات» اضغط «فتح الدورة» وأدخل سعر المورد وسعر دبي.' }); return { sent: false, empty: true }; }
    if (!opts.manual && !F.open && !F.today.closed && !F.today.usdt && !F.today.mru) return { sent: false, quiet: true }; /* لا جديد — لا إزعاج */
    const msg = text(F, await claudeNote(F));
    const ok = await tg('sendMessage', { chat_id: chatId, text: msg.slice(0, 4000), parse_mode: 'HTML' });
    return { sent: !!ok, facts: F, text: msg }; }

  /* أمر «تقرير» / «دورات» — يُضاف فوق أوامر المالك الموجودة دون استبدالها */
  const prevText = app.locals.tgText;
  app.locals.tgText = async (t, chatId) => {
    if (/^\/?(تقرير|التقرير|دورات|الدورات|report|cycles)$/i.test(String(t || '').trim())) { try { await send(chatId, { manual: true }); } catch (e) { await tg('sendMessage', { chat_id: chatId, text: 'تعذّر إعداد التقرير: ' + String(e.message).slice(0, 150) }); } return true; }
    return prevText ? prevText(t, chatId) : false; };

  /* الجدولة: مرة يوميًا في الساعة المحددة بتوقيت لواندا */
  let lastDay = '';
  async function tick() { if (!adminId) return; const now = new Date(), loc = new Date(now.getTime() + TZ() * 3600000);
    if (loc.getUTCHours() !== HOUR() || loc.getUTCMinutes() > 14) return; const day = loc.toISOString().slice(0, 10); if (lastDay === day) return; lastDay = day;
    try { await send(adminId, {}); } catch (e) { console.warn('daily:', e.message); } }
  if (!ctx.noTimer) setInterval(tick, 5 * 60 * 1000);

  /* معاينة من التطبيق (جلسة المالك) */
  app.get('/cycles/report', async (req, res) => { try { const p = jwt.verify(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''), JWT_SECRET); if (p.arkan_role !== 'owner') return res.status(403).json({ error: 'للمالك فقط' });
      const F = await facts(); res.json({ ok: true, facts: F, text: text(F, '') }); } catch (e) { res.status(401).json({ error: 'الجلسة منتهية' }); } });

  console.log('▲ daily cycles report ready (' + HOUR() + ':00 UTC+' + TZ() + (KEY() ? ', Claude on' : ', Claude off') + (adminId ? '' : ', TELEGRAM_ADMIN_ID missing') + ')');
  return { facts, text, send, tick, calc };
};
