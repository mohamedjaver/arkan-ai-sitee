/* ARKAN Wallet Watch — يفحص الحوالات الواردة USDT TRC20 ويرسل إشعارات
   يعمل عبر GitHub Actions. المفاتيح من متغيرات البيئة فقط. */
import { readFileSync, writeFileSync } from 'node:fs';

const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const GRID = 'https://api.trongrid.io';
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, RESEND_API_KEY, NOTIFY_EMAIL } = process.env;

const short = a => a ? a.slice(0, 6) + '…' + a.slice(-6) : '';
const fmt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function tg(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true })
  }).catch(e => console.error('telegram:', e.message));
}

async function email(subject, html) {
  if (!RESEND_API_KEY || !NOTIFY_EMAIL) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: 'ARKAN Wallet <onboarding@resend.dev>', to: [NOTIFY_EMAIL], subject, html })
  }).catch(e => console.error('resend:', e.message));
}

const cfg = JSON.parse(readFileSync('watch-addresses.json', 'utf8'));
const state = JSON.parse(readFileSync('watch-state.json', 'utf8'));
let dirty = false;

for (const w of cfg.wallets || []) {
  const addr = (w.address || '').trim();
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)) { console.log('skip invalid:', w.label); continue; }

  const last = state[addr] || 0;
  const url = `${GRID}/v1/accounts/${addr}/transactions/trc20` +
    `?only_confirmed=true&only_to=true&contract_address=${USDT}&limit=50` +
    (last ? `&min_timestamp=${last + 1}` : '');
  let rows = [];
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    rows = (await r.json()).data || [];
  } catch (e) { console.error('trongrid:', addr, e.message); continue; }

  if (!last) {
    /* أول تشغيل: سجّل آخر نقطة زمنية فقط دون إرسال إشعارات قديمة */
    state[addr] = rows.length ? Math.max(...rows.map(t => t.block_timestamp)) : Date.now();
    dirty = true; console.log('baseline set:', w.label); continue;
  }

  const incoming = rows.filter(t => t.to === addr).sort((a, b) => a.block_timestamp - b.block_timestamp);
  for (const t of incoming) {
    const amt = Number(t.value) / 10 ** ((t.token_info && t.token_info.decimals) || 6);
    const scan = `https://tronscan.org/#/transaction/${t.transaction_id}`;
    const when = new Date(t.block_timestamp).toLocaleString('ar-MR', { timeZone: 'Africa/Nouakchott' });
    console.log(`incoming ${w.label}: +${amt} USDT`);

    await tg(
      `💰 <b>وصلت حوالة USDT</b>\n\n` +
      `<b>+${fmt(amt)} USDT</b>\n` +
      `المحفظة: ${w.label} (<code>${short(addr)}</code>)\n` +
      `من: <code>${short(t.from)}</code>\n` +
      `الوقت: ${when}\n\n` +
      `<a href="${scan}">عرض المعاملة على Tronscan ↗</a>`
    );
    await email(
      `💰 وصلت حوالة +${fmt(amt)} USDT — ${w.label}`,
      `<div dir="rtl" style="font-family:sans-serif;max-width:520px;margin:auto">
        <div style="background:linear-gradient(135deg,#062A6E,#0B8BE8);color:#fff;border-radius:16px;padding:24px">
          <div style="font-size:13px;opacity:.85">محفظة أركان · ${w.label}</div>
          <div style="font-size:34px;font-weight:700;margin:8px 0">+${fmt(amt)} <span style="font-size:16px;color:#7FE3C1">USDT</span></div>
          <div style="font-size:12px;opacity:.85">من ${short(t.from)} · ${when}</div>
        </div>
        <p style="margin:18px 0"><a href="${scan}" style="color:#0056D6">التحقق من المعاملة على Tronscan ↗</a></p>
        <p style="font-size:11px;color:#888">ARKAN Rates — إشعار آلي، لا ترد على هذه الرسالة.</p>
      </div>`
    );
    if (t.block_timestamp > (state[addr] || 0)) { state[addr] = t.block_timestamp; dirty = true; }
  }
  /* حدّث النقطة الزمنية حتى مع معاملات صادرة فقط */
  const maxTs = rows.length ? Math.max(...rows.map(t => t.block_timestamp)) : 0;
  if (maxTs > (state[addr] || 0)) { state[addr] = maxTs; dirty = true; }
}

if (dirty) writeFileSync('watch-state.json', JSON.stringify(state, null, 1));
console.log('done. dirty =', dirty);
