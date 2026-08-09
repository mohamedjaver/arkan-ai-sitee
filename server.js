/* ═══════════════════════════════════════════════════════════════
   ARKAN STORE — Backend v1.0
   متجر + طلبات USDT TRC20 + مراقبة TronGrid + بوت Telegram
   نشر: Railway (Start Command: node server.js)
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const fs = require('fs');
const path = require('path');

/* ───────────── ENV (تُضبط من Railway → Variables) ───────────── */
const ENV = {
  PORT:            process.env.PORT || 3000,
  WALLET:          process.env.WALLET_ADDRESS    || 'TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  BOT_TOKEN:       process.env.TELEGRAM_BOT_TOKEN || '',          // من BotFather
  BOT_USERNAME:    process.env.TELEGRAM_BOT_USERNAME || 'ArkanAI_Access_Bot', // بدون @
  ADMIN_ID:        process.env.TELEGRAM_ADMIN_ID  || '',          // معرّفك الرقمي (من @userinfobot)
  CHANNEL_ID:      process.env.MEMBERS_CHANNEL_ID || '',          // مثل -1001234567890 (البوت Admin فيها)
  TRONGRID_KEY:    process.env.TRONGRID_API_KEY   || '',          // اختياري — يرفع حد الطلبات
  ORDER_TTL_MIN:   parseInt(process.env.ORDER_TTL_MIN || '120'),  // صلاحية الطلب بالدقائق
  POLL_TRON_MS:    20000,
  POLL_TG_MS:      2500,
};
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // عقد USDT الرسمي على TRON

/* ───────────── تخزين الطلبات (JSON بسيط — يكفي للبداية) ───────────── */
const DB_FILE = path.join(__dirname, 'orders.json');
let DB = { orders: {}, seenTx: {} };
try { DB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) {}
function saveDB() {
  fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(DB, null, 1));
  fs.renameSync(DB_FILE + '.tmp', DB_FILE);
}

/* مبلغ فريد: لا يتكرر بين الطلبات المعلّقة */
function uniqueAmount(base) {
  const taken = new Set(
    Object.values(DB.orders)
      .filter(o => o.status === 'pending')
      .map(o => o.amount)
  );
  for (let i = 0; i < 90; i++) {
    const amt = (base + (Math.floor(Math.random() * 89) + 10) / 100).toFixed(2);
    if (!taken.has(amt)) return amt;
  }
  return (base + 0.99).toFixed(2);
}

/* ───────────── Telegram Bot API (بدون مكتبات خارجية) ───────────── */
async function tg(method, payload) {
  if (!ENV.BOT_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${ENV.BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!d.ok) console.error('TG error:', method, d.description);
    return d.ok ? d.result : null;
  } catch (e) { console.error('TG fetch fail:', e.message); return null; }
}
const sendMsg = (chat_id, text, extra = {}) =>
  tg('sendMessage', { chat_id, text, parse_mode: 'HTML', ...extra });

async function notifyAdmin(text) {
  if (ENV.ADMIN_ID) await sendMsg(ENV.ADMIN_ID, text);
}

/* رابط دعوة لمرة واحدة لقناة الأعضاء */
async function createInvite(orderId) {
  if (!ENV.CHANNEL_ID) return null;
  const inv = await tg('createChatInviteLink', {
    chat_id: ENV.CHANNEL_ID,
    name: `ARKAN ${orderId}`,
    member_limit: 1,
  });
  return inv ? inv.invite_link : null;
}

/* عند تأكيد الدفع: فعّل الطلب وأرسل كل شيء */
async function fulfillOrder(order, txid) {
  order.status = 'paid';
  order.txid = txid;
  order.paidAt = Date.now();
  order.invite = await createInvite(order.id);
  saveDB();

  if (order.tgChatId) {
    await sendMsg(order.tgChatId,
      `✅ <b>تم تأكيد دفعتك بنجاح!</b>\nمرحبًا بك في عائلة ARKAN 🖤\n\n` +
      `🧾 الطلب: <code>${order.id}</code>\n📦 ${order.productName} · ${order.planLabel}\n\n` +
      (order.invite ? `🔑 رابط دخولك الخاص (صالح لمرة واحدة):\n${order.invite}\n\n` : '') +
      `الآن أرسل <b>اسم حسابك في TradingView</b> ليتم تفعيل المؤشر على حسابك.`);
  }
  await notifyAdmin(
    `💰 <b>دفعة جديدة مؤكدة</b>\n` +
    `🧾 ${order.id}\n📦 ${order.productName} · ${order.planLabel}\n` +
    `💵 ${order.amount} USDT\n🔗 TX: <code>${txid}</code>\n` +
    (order.tgChatId ? `👤 Telegram: <a href="tg://user?id=${order.tgChatId}">المشتري</a>` : '⚠️ المشتري لم يفتح البوت بعد'));
}

/* ───────────── مراقب TronGrid: مطابقة المبلغ الفريد ───────────── */
async function pollTron() {
  const pending = Object.values(DB.orders).filter(o => o.status === 'pending');
  if (!pending.length) return;
  try {
    const headers = ENV.TRONGRID_KEY ? { 'TRON-PRO-API-KEY': ENV.TRONGRID_KEY } : {};
    const url = `https://api.trongrid.io/v1/accounts/${ENV.WALLET}/transactions/trc20` +
                `?only_to=true&limit=50&contract_address=${USDT_CONTRACT}`;
    const r = await fetch(url, { headers });
    if (!r.ok) return;
    const { data = [] } = await r.json();
    for (const tx of data) {
      if (DB.seenTx[tx.transaction_id]) continue;
      const amount = (parseInt(tx.value) / 1e6).toFixed(2);
      const order = pending.find(o => o.amount === amount && tx.block_timestamp >= o.createdAt - 60000);
      if (order) {
        DB.seenTx[tx.transaction_id] = order.id;
        await fulfillOrder(order, tx.transaction_id);
        console.log(`✅ PAID ${order.id} — ${amount} USDT — ${tx.transaction_id}`);
      }
    }
    /* إنهاء صلاحية الطلبات القديمة */
    const ttl = ENV.ORDER_TTL_MIN * 60000;
    for (const o of pending) {
      if (Date.now() - o.createdAt > ttl) { o.status = 'expired'; }
    }
    saveDB();
  } catch (e) { console.error('Tron poll:', e.message); }
}
setInterval(pollTron, ENV.POLL_TRON_MS);

/* ───────────── بوت Telegram: long polling ───────────── */
let tgOffset = 0;
async function pollTelegram() {
  if (!ENV.BOT_TOKEN) return;
  const updates = await tg('getUpdates', { offset: tgOffset, timeout: 0, allowed_updates: ['message'] });
  if (!updates) return;
  for (const u of updates) {
    tgOffset = u.update_id + 1;
    const msg = u.message;
    if (!msg || !msg.text) continue;
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    /* /start ORDERID — يربط المحادثة بالطلب */
    if (text.startsWith('/start')) {
      const orderId = text.split(' ')[1];
      const order = orderId && DB.orders[orderId];
      if (order) {
        order.tgChatId = chatId;
        order.tgUser = msg.from.username || msg.from.first_name;
        saveDB();
        if (order.status === 'paid') {
          if (!order.invite) order.invite = await createInvite(order.id);
          saveDB();
          await sendMsg(chatId,
            `✅ دفعتك مؤكدة!\n🔑 رابط دخولك:\n${order.invite || '—'}\n\nأرسل الآن اسم حسابك في <b>TradingView</b>.`);
        } else if (order.status === 'expired') {
          await sendMsg(chatId, `⌛ انتهت صلاحية الطلب <code>${order.id}</code>. أنشئ طلبًا جديدًا من المتجر.`);
        } else {
          await sendMsg(chatId,
            `👋 أهلًا بك في <b>ARKAN AI</b>\n\n🧾 طلبك: <code>${order.id}</code>\n` +
            `📦 ${order.productName} · ${order.planLabel}\n💵 المطلوب: <code>${order.amount}</code> USDT (TRC20)\n\n` +
            `📍 المحفظة:\n<code>${ENV.WALLET}</code>\n\n` +
            `⚡ فور تأكيد الشبكة سيصلك رابط دخولك هنا تلقائيًا.`);
        }
      } else {
        await sendMsg(chatId,
          `👋 أهلًا بك في <b>ARKAN AI Trading Systems</b>\n` +
          `اختر مؤشرك وباقتك من المتجر، وسيصلك التفعيل هنا تلقائيًا بعد الدفع.\n\nللاستفسار: تحدث هنا مباشرة.`);
      }
      continue;
    }

    /* أي رسالة بعد الدفع = اسم TradingView */
    const paidOrder = Object.values(DB.orders).find(o => o.tgChatId === chatId && o.status === 'paid' && !o.tvUsername);
    if (paidOrder) {
      paidOrder.tvUsername = text;
      saveDB();
      await sendMsg(chatId,
        `📥 تم استلام اسمك: <b>${text}</b>\nسيُفعَّل وصولك للمؤشر من لوحة Invite-Only خلال دقائق. أهلًا بك 🖤`);
      await notifyAdmin(
        `🎯 <b>تفعيل TradingView مطلوب</b>\n🧾 ${paidOrder.id}\n📦 ${paidOrder.productName} · ${paidOrder.planLabel}\n` +
        `👤 TV Username: <code>${text}</code>\n💬 TG: @${paidOrder.tgUser || '—'}`);
      continue;
    }

    /* رسائل عامة → تُحوَّل للأدمن */
    if (String(chatId) !== String(ENV.ADMIN_ID)) {
      await notifyAdmin(`💬 رسالة من @${msg.from.username || msg.from.first_name} (${chatId}):\n${text}`);
      await sendMsg(chatId, `وصلتنا رسالتك ✅ — سنرد عليك قريبًا.`);
    }
  }
}
setInterval(pollTelegram, ENV.POLL_TG_MS);

/* ───────────── API + الموقع ───────────── */
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* إنشاء طلب */
app.post('/api/orders', (req, res) => {
  const { product, plan, base, productName, planLabel } = req.body || {};
  if (!base || base <= 0) return res.status(400).json({ error: 'bad request' });
  const id = 'ARK-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);
  const order = {
    id, product, plan,
    productName: productName || product,
    planLabel: planLabel || plan,
    amount: uniqueAmount(Number(base)),
    status: 'pending',
    createdAt: Date.now(),
  };
  DB.orders[id] = order;
  saveDB();
  notifyAdmin(`🛒 طلب جديد\n🧾 ${id}\n📦 ${order.productName} · ${order.planLabel}\n💵 ${order.amount} USDT`);
  res.json({
    orderId: id,
    amount: order.amount,
    wallet: ENV.WALLET,
    botLink: `https://t.me/${ENV.BOT_USERNAME}?start=${id}`,
  });
});

/* حالة الطلب */
app.get('/api/orders/status', (req, res) => {
  const order = DB.orders[req.query.orderId];
  if (!order) return res.status(404).json({ status: 'not_found' });
  res.json({ status: order.status, invite: order.invite || null, txid: order.txid || null });
});

/* ═══════════════════════════════════════════════════════════════
   ARKAN OTP + CHAT AUTH — مدمج في نفس الخدمة (لا حاجة لخدمة ثانية)
   Env جديدة في Railway → Variables:
     SUPABASE_JWT_SECRET  من Supabase → Settings → API → JWT Secret
     FB_SERVICE_JSON      محتوى ملف Service Account كاملًا (JSON)
     WA_TOKEN, WA_PHONE_ID, WA_TEMPLATE  (لإرسال OTP واتساب — اختيارية الآن)
   ═══════════════════════════════════════════════════════════════ */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v5: uuidv5 } = require('uuid');
const admin = require('firebase-admin');

/* CORS للنطاق الرسمي فقط */
const SITE_ORIGINS = ['https://arkanrates.com', 'https://www.arkanrates.com', 'https://mohamedjaver.github.io'];
app.use((req, res, next) => {
  const o = req.headers.origin || '';
  if (SITE_ORIGINS.includes(o)) res.setHeader('Access-Control-Allow-Origin', o);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* Firebase Admin */
let fbReady = false; let fbErr = null;
try {
  let raw = process.env.FB_SERVICE_B64
    ? Buffer.from(process.env.FB_SERVICE_B64, 'base64').toString('utf8')
    : (process.env.FB_SERVICE_JSON || '');
  raw = raw.trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"') && raw.indexOf('{') > 0)) raw = raw.slice(1, -1);
  // إصلاح الاقتباسات الذكية من iOS
  raw = raw.replace(/[\u201C\u201D\u2018\u2019]/g, '"');
  let svc = {};
  if (raw) svc = JSON.parse(raw);
  if (svc.private_key && !svc.private_key.includes('\n')) svc.private_key = svc.private_key.replace(/\\n/g, '\n');
  if (svc.project_id) { admin.initializeApp({ credential: admin.credential.cert(svc) }); fbReady = true; }
  else if (raw) fbErr = 'missing project_id';
  else fbErr = 'FB_SERVICE_JSON empty';
} catch (e) { fbErr = e.message.slice(0, 120); console.error('FB init:', e.message); }

/* أدوات OTP */
const otpCodes = new Map(); // phone -> {hash, exp, tries}
const otpSends = new Map(); // phone -> [timestamps]
const OTP_SALT = process.env.OTP_SALT || crypto.randomBytes(16).toString('hex');
const otpHash = c => crypto.createHash('sha256').update(OTP_SALT + c).digest('hex');
const nowMs = () => Date.now();
setInterval(() => { for (const [k, v] of otpCodes) if (v.exp < nowMs()) otpCodes.delete(k); }, 60000);
const normPhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (/^\d{8}$/.test(d)) d = '222' + d; else if (/^9\d{8}$/.test(d)) d = '244' + d; return d; };
const validPhone = d => /^(222\d{8}|244\d{9})$/.test(d);

/* إرسال واتساب */
async function waSend(phone, code) {
  const url = `https://graph.facebook.com/v21.0/${process.env.WA_PHONE_ID}/messages`;
  const tpl = process.env.WA_TEMPLATE || 'arkan_otp';
  const body = {
    messaging_product: 'whatsapp', to: phone, type: 'template',
    template: { name: tpl, language: { code: 'ar' }, components: [
      { type: 'body', parameters: [{ type: 'text', text: code }] },
      { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }
    ] }
  };
  const r = await fetch(url, { method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `WA ${r.status}`);
  return j;
}

app.post('/otp/send', async (req, res) => {
  try {
    const phone = normPhone(req.body.phone);
    if (!validPhone(phone)) return res.status(400).json({ ok: false, err: 'رقم غير صالح — موريتانيا أو أنغولا فقط' });
    const hist = (otpSends.get(phone) || []).filter(t => nowMs() - t < 3600000);
    if (hist.length >= 4) return res.status(429).json({ ok: false, err: 'محاولات كثيرة — انتظر ساعة' });
    const code = String(crypto.randomInt(100000, 1000000));
    await waSend(phone, code);
    otpCodes.set(phone, { hash: otpHash(code), exp: nowMs() + 5 * 60000, tries: 0 });
    hist.push(nowMs()); otpSends.set(phone, hist);
    res.json({ ok: true });
  } catch (e) {
    console.error('otp/send:', e.message);
    res.status(502).json({ ok: false, err: 'تعذّر الإرسال عبر واتساب: ' + e.message });
  }
});

app.post('/otp/verify', async (req, res) => {
  try {
    const phone = normPhone(req.body.phone);
    const code = String(req.body.code || '').replace(/\D/g, '');
    const rec = otpCodes.get(phone);
    if (!rec || rec.exp < nowMs()) return res.status(400).json({ ok: false, err: 'انتهت صلاحية الرمز — أعد الإرسال' });
    if (rec.tries >= 5) { otpCodes.delete(phone); return res.status(429).json({ ok: false, err: 'محاولات خاطئة كثيرة — أعد الإرسال' }); }
    rec.tries++;
    if (otpHash(code) !== rec.hash) return res.status(400).json({ ok: false, err: 'الرمز غير صحيح' });
    otpCodes.delete(phone);
    /* sessionToken (HMAC، 90 يومًا) — يُصدَر فقط بعد نجاح OTP. يحل محل تخزين PIN نهائيًا */
    const ts0 = Math.floor(Date.now() / 1000);
    const sessionToken = arkanSign({ typ: 'sess', phone, uid: 'wa_' + phone, iat: ts0, exp: ts0 + 86400 * 90 });
    if (!fbReady) return res.json({ ok: true, fbToken: null, sessionToken });
    const uid = 'wa_' + phone;
    const fbToken = await admin.auth().createCustomToken(uid, { phone: '+' + phone, via: 'whatsapp' });
    res.json({ ok: true, fbToken, uid, sessionToken });
  } catch (e) {
    console.error('otp/verify:', e.message);
    res.status(500).json({ ok: false, err: 'خطأ في التحقق' });
  }
});

/* ── Supabase JWT — بوابة ARKAN Chat v2 (RLS حقيقي) ── */
const ARKAN_NS = '7c9e6679-7425-40de-944b-e07fc1f90ae7'; // لا تغيّره أبدًا
const OWNER_PHONES = ['22236295050'];
const sbHits = new Map();
const phoneToUuid = p => uuidv5(String(p).replace(/\D/g, ''), ARKAN_NS);

/* البحث عن مستند المستخدم بالصيغتين: دولية (222XXXXXXXX) ومحلية (XXXXXXXX) */
async function findUserDoc(p) {
  const fs = admin.firestore();
  const digits = String(p).replace(/\D/g, '');
  const local = digits.replace(/^(222|244)/, '');
  const variants = [...new Set([digits, '00' + digits, local, '00' + local, '00244' + local, '244' + local])];
  // 1) بحث بمعرّف المستند
  for (const v of variants) {
    const snap = await fs.doc(`users/${v}`).get();
    if (snap.exists) return snap;
  }
  // 2) بحث بحقل phone (يغطي أي صيغة تخزين)
  for (const v of variants) {
    const q = await fs.collection('users').where('phone', '==', v).limit(1).get();
    if (!q.empty) return q.docs[0];
  }
  return null;
}

/* ═══ نظام الروابط: توكن من كود الوصول (بلا PIN) ═══
   GET /chat-link/:code → يصدر Supabase JWT للعميل صاحب الكود */
app.get('/chat-link/:code', async (req, res) => {
  try {
    if (!process.env.SUPABASE_JWT_SECRET) return res.status(503).json({ error: 'not configured' });
    const code = String(req.params.code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (code.length < 4) return res.status(400).json({ error: 'invalid code' });

    // الدالة security definer وممنوحة لـ anon — المفتاح العام يكفي
    const SB_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_scXFuYtWG2dkz8_CaPEvAg_Yj2_sxnO';
    const sbUrl = process.env.SUPABASE_URL || 'https://vyxzlazwpbstigcqvizb.supabase.co';
    const r = await fetch(`${sbUrl}/rest/v1/rpc/resolve_chat_link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SB_ANON, 'Authorization': `Bearer ${SB_ANON}` },
      body: JSON.stringify({ p_code: code })
    });
    const raw = await r.text();
    let rows; try{ rows = JSON.parse(raw); }catch(e){ rows = null; }
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(404).json({ error: 'code not found', status: r.status, sb: String(raw).slice(0, 300) });
    }
    const row = rows[0];
    let convData = null;
    try {
      const rc = await fetch(`${sbUrl}/rest/v1/conversations_v2?id=eq.${row.out_conversation_id}&select=*`, {
        headers: { 'apikey': SB_ANON, 'Authorization': `Bearer ${SB_ANON}` }
      });
      const arr = await rc.json();
      if (Array.isArray(arr) && arr.length) convData = arr[0];
    } catch (e) {}

    // أصدر توكن للعميل (sub = customer_id من القاعدة مباشرة)
    const ts = Math.floor(Date.now() / 1000);
    const token = jwt.sign({
      sub: row.out_customer_id, role: 'authenticated', aud: 'authenticated',
      arkan_role: 'customer', phone: row.out_phone || '', iat: ts, exp: ts + 86400 * 30,
    }, process.env.SUPABASE_JWT_SECRET);
    res.json({
      token, user_id: row.out_customer_id, arkan_role: 'customer',
      conversation_id: row.out_conversation_id, name: row.out_name || '',
      conversation: convData,
      expires_in: 86400 * 30
    });
  } catch (e) {
    console.error('chat-link:', e.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/supabase-token', async (req, res) => {
  try {
    if (!process.env.SUPABASE_JWT_SECRET) return res.status(503).json({ error: 'SUPABASE_JWT_SECRET غير مضبوط' });
    const p = normPhone(req.body.phone);
    if (!validPhone(p)) return res.status(400).json({ error: 'invalid phone' });
    const hist = (sbHits.get(p) || []).filter(t => nowMs() - t < 3600000);
    if (hist.length >= 20) return res.status(429).json({ error: 'محاولات كثيرة — انتظر ساعة' });
    hist.push(nowMs()); sbHits.set(p, hist);

    const { firebaseIdToken, pin, sessionToken } = req.body || {};
    let verified = false;
    /* إثبات مطلوب دائمًا: sessionToken (بعد OTP) أو Firebase idToken أو PIN.
       لا يوجد أي مسار "الحساب موجود = دخول" — هذا كان ثغرة استيلاء. */
    if (sessionToken) {
      const sp = arkanVerify(sessionToken);
      verified = !!sp && sp.typ === 'sess' && sp.phone === p;
    }
    if (!verified && firebaseIdToken && fbReady) {
      const decoded = await admin.auth().verifyIdToken(firebaseIdToken);
      const snap = await findUserDoc(p);
      verified = !!snap && !!decoded.uid;
    }
    if (!verified && pin && fbReady) {
      const snap = await findUserDoc(p);
      verified = !!snap && String(snap.data().pin) === String(pin);
    }
    if (!verified) return res.status(401).json({ error: 'auth failed' });

    const sub = phoneToUuid(p);
    const role = OWNER_PHONES.includes(p) ? 'owner' : 'customer';
    const ts = Math.floor(Date.now() / 1000);
    const token = jwt.sign({
      sub, role: 'authenticated', aud: 'authenticated',
      arkan_role: role, phone: p, iat: ts, exp: ts + 86400,
    }, process.env.SUPABASE_JWT_SECRET);
    res.json({ token, user_id: sub, arkan_role: role, expires_in: 86400 });
  } catch (e) {
    console.error('supabase-token:', e.message);
    res.status(500).json({ error: 'server error' });
  }
});

/* ── تهيئة حساب المالك (مرة واحدة) ──
   يعمل فقط لهاتف OWNER_PHONES وفقط إن لم يوجد الحساب. يُفتح من المتصفح:
   /bootstrap-owner?pin=XXXX */
app.get('/bootstrap-owner', async (req, res) => {
  try {
    if (!fbReady) return res.status(503).json({ ok: false, err: 'Firebase غير جاهز' });
    /* حماية إلزامية: مفتاح سري في الترويسة (مقارنة آمنة زمنيًا) — للإنشاء ولإعادة التعيين معًا */
    const key = String(req.headers['x-arkan-key'] || '');
    const sec = String(process.env.SUPABASE_JWT_SECRET || '');
    const kb = Buffer.from(key), sb2 = Buffer.from(sec);
    const keyOk = sec && kb.length === sb2.length && crypto.timingSafeEqual(kb, sb2);
    if (!keyOk) return res.status(403).json({ ok: false, err: 'forbidden' });
    const p = OWNER_PHONES[0];
    const pin = String(req.query.pin || '').replace(/\D/g, '');
    if (pin.length !== 4) return res.status(400).json({ ok: false, err: 'أضف ?pin=رمز من 4 أرقام' });
    const existing = await findUserDoc(p);
    if (existing) {
      await existing.ref.update({ pin, role: 'owner', pinChangedAt: Date.now() });
      return res.json({ ok: true, msg: 'تم تحديث رمز المالك — ادخل الآن من chat-v2.html', phone: p });
    }
    await admin.firestore().doc(`users/${p}`).set({
      name: 'Mohamed Javer', phone: p, pin, role: 'owner',
      createdAt: Date.now(), via: 'bootstrap'
    });
    res.json({ ok: true, msg: 'تم إنشاء حساب المالك — ادخل الآن من chat-v2.html', phone: p });
  } catch (e) {
    console.error('bootstrap-owner:', e.message);
    res.status(500).json({ ok: false, err: 'خطأ في الخادم' });
  }
});

/* ── تغيير الرمز السري PIN ── */
const pinHits = new Map();
app.post('/change-pin', async (req, res) => {
  try {
    if (!fbReady) return res.status(503).json({ ok: false, err: 'الخدمة غير متاحة مؤقتًا' });
    const p = normPhone(req.body.phone);
    if (!validPhone(p)) return res.status(400).json({ ok: false, err: 'رقم غير صالح' });
    const hist = (pinHits.get(p) || []).filter(t => nowMs() - t < 3600000);
    if (hist.length >= 5) return res.status(429).json({ ok: false, err: 'محاولات كثيرة — انتظر ساعة' });
    hist.push(nowMs()); pinHits.set(p, hist);

    const oldPin = String(req.body.oldPin || '').replace(/\D/g, '');
    const newPin = String(req.body.newPin || '').replace(/\D/g, '');
    if (newPin.length !== 4) return res.status(400).json({ ok: false, err: 'الرمز الجديد 4 أرقام' });
    if (newPin === oldPin) return res.status(400).json({ ok: false, err: 'الرمز الجديد مطابق للقديم' });

    const snap0 = await findUserDoc(p);
    if (!snap0 || String(snap0.data().pin) !== oldPin)
      return res.status(401).json({ ok: false, err: 'الرمز الحالي غير صحيح' });
    const ref = snap0.ref;

    await ref.update({ pin: newPin, pinChangedAt: Date.now() });
    res.json({ ok: true });
  } catch (e) {
    console.error('change-pin:', e.message);
    res.status(500).json({ ok: false, err: 'خطأ في الخادم' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ARKAN Chat API — طبقة وسيطة كاملة عبر الخادم (تلغي اعتماد RLS)
   كل العمليات تُوقّع بتوكن ARKAN خاص، والخادم ينفّذها بصلاحية service
   ═══════════════════════════════════════════════════════════════ */
const SB_REST = (process.env.SUPABASE_URL || 'https://vyxzlazwpbstigcqvizb.supabase.co') + '/rest/v1';
const SB_PUB = process.env.SUPABASE_ANON_KEY || 'sb_publishable_scXFuYtWG2dkz8_CaPEvAg_Yj2_sxnO';
const sbHeaders = { 'apikey': SB_PUB, 'Authorization': `Bearer ${SB_PUB}`, 'Content-Type': 'application/json' };

/* توكن ARKAN بسيط (HMAC) — يثبت هوية العميل/المالك للخادم */
function arkanSign(payload) {
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.SUPABASE_JWT_SECRET).update(b).digest('base64url');
  return b + '.' + sig;
}
function arkanVerify(tok) {
  try {
    const [b, sig] = String(tok).split('.');
    const exp = crypto.createHmac('sha256', process.env.SUPABASE_JWT_SECRET).update(b).digest('base64url');
    if (sig !== exp) return null;
    const p = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (p.exp && p.exp < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch (e) { return null; }
}
function authArkan(req) {
  const h = req.headers.authorization || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : (req.query.t || '');
  return arkanVerify(tok);
}
async function sbRpc(fn, args) {
  const r = await fetch(`${SB_REST}/rpc/${fn}`, { method: 'POST', headers: sbHeaders, body: JSON.stringify(args || {}) });
  const t = await r.text(); try { return { ok: r.ok, data: JSON.parse(t) }; } catch { return { ok: r.ok, data: t }; }
}
async function sbGet(path) {
  const r = await fetch(`${SB_REST}/${path}`, { headers: sbHeaders });
  return r.ok ? r.json() : [];
}
async function sbPost(path, body, prefer) {
  const h = { ...sbHeaders }; if (prefer) h.Prefer = prefer;
  const r = await fetch(`${SB_REST}/${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  const t = await r.text(); try { return { ok: r.ok, data: JSON.parse(t) }; } catch { return { ok: r.ok, data: t }; }
}
async function sbPatch(path, body) {
  const r = await fetch(`${SB_REST}/${path}`, { method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=representation' }, body: JSON.stringify(body) });
  const t = await r.text(); try { return { ok: r.ok, data: JSON.parse(t) }; } catch { return { ok: r.ok, data: t }; }
}

/* CORS للـ chat API */
app.use('/chat-api', (req, res, next) => {
  const o = req.headers.origin || '';
  if (SITE_ORIGINS.includes(o)) res.setHeader('Access-Control-Allow-Origin', o);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* جلسة المحادثة: من كود الرابط → توكن ARKAN + بيانات المحادثة */
app.get('/chat-api/session', async (req, res) => {
  try {
    const code = String(req.query.c || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let row = null;
    /* أُزيل مسار ?phone= نهائيًا (كان يمنح توكن 30 يومًا لأي حساب بمجرد معرفة الرقم).
       الجلسات تُمنح فقط عبر رابط code موقّع أو عبر /otp/verify → sessionToken. */
    if (code) {
      const rr = await sbRpc('resolve_chat_link', { p_code: code });
      if (rr.ok && Array.isArray(rr.data) && rr.data.length) row = rr.data[0];
    }
    if (!row) return res.status(404).json({ error: 'not found' });

    const ts = Math.floor(Date.now() / 1000);
    const token = arkanSign({ uid: row.out_customer_id, role: 'customer', conv: row.out_conversation_id, iat: ts, exp: ts + 86400 * 30 });
    const conv = { id: row.out_conversation_id, customer_id: row.out_customer_id };
    res.json({ token, user_id: row.out_customer_id, role: 'customer', name: row.out_name || '', code: row.out_code || null, conversation: conv });
  } catch (e) { console.error('chat-api/session:', e.message); res.status(500).json({ error: 'server', msg: e.message }); }
});

/* جلسة المالك: بالهاتف + PIN */
app.post('/chat-api/owner-session', async (req, res) => {
  try {
    const p = normPhone(req.body.phone);
    const pin = String(req.body.pin || '');
    if (!OWNER_PHONES.includes(p)) return res.status(403).json({ error: 'not owner' });
    const snap = await findUserDoc(p);
    if (!snap || String(snap.data().pin) !== pin) return res.status(401).json({ error: 'auth' });
    const uid = phoneToUuid(p);
    // تأكد من وجود صف المالك
    await sbPost('chat_users', { id: uid, phone: p, full_name: 'ARKAN', role: 'owner' }, 'resolution=merge-duplicates');
    const ts = Math.floor(Date.now() / 1000);
    const token = arkanSign({ uid, role: 'owner', iat: ts, exp: ts + 86400 });
    res.json({ token, user_id: uid, role: 'owner' });
  } catch (e) { console.error('owner-session:', e.message); res.status(500).json({ error: 'server' }); }
});

/* رسائل محادثة */
app.get('/chat-api/messages', async (req, res) => {
  const s = authArkan(req); if (!s) return res.status(401).json({ error: 'unauthorized' });
  const conv = String(req.query.conv || '');
  if (s.role !== 'owner' && s.conv !== conv) return res.status(403).json({ error: 'forbidden' });
  const r = await sbRpc('api_get_messages', { p_conv: conv });
  res.json({ messages: Array.isArray(r.data) ? r.data : [] });
});

app.post('/chat-api/send', async (req, res) => {
  const s = authArkan(req); if (!s) return res.status(401).json({ error: 'unauthorized' });
  const { conversation_id, type, text, media_path, mime_type, file_size, audio_duration, waveform_data, meta } = req.body || {};
  if (s.role !== 'owner' && s.conv !== conversation_id) return res.status(403).json({ error: 'forbidden' });
  const r = await sbRpc('api_send_message', {
    p_conv: conversation_id, p_sender: s.uid, p_type: type || 'text', p_text: text || null,
    p_media_path: media_path || null, p_mime: mime_type || null, p_size: file_size || null,
    p_dur: audio_duration || null, p_wave: waveform_data || null, p_meta: meta || null
  });
  res.json({ message: r.data });
});

app.get('/chat-api/conversations', async (req, res) => {
  const s = authArkan(req);
  if (!s) return res.status(401).json({ error: 'no token', hint: 'التوكن مفقود أو غير صالح — أعد تسجيل الدخول' });
  if (s.role !== 'owner') return res.status(403).json({ error: 'not owner', role: s.role });
  const r = await sbRpc('api_owner_conversations', {});
  if (!r.ok) return res.status(502).json({ error: 'rpc failed', sb: JSON.stringify(r.data).slice(0, 200) });
  const list = (Array.isArray(r.data) ? r.data : []).map(c => ({
    id: c.id, customer_id: c.customer_id, last_preview: c.last_preview,
    last_message_at: c.last_message_at, unread_owner: c.unread_owner,
    customer: { full_name: c.full_name, phone: c.phone, access_code: c.access_code, avatar_url: c.avatar_url }
  }));
  res.json({ conversations: list, count: list.length });
});

app.post('/chat-api/read', async (req, res) => {
  const s = authArkan(req); if (!s) return res.status(401).json({ error: 'unauthorized' });
  await sbRpc('api_mark_read', { p_conv: req.body.conversation_id, p_is_owner: s.role === 'owner' });
  res.json({ ok: true });
});

/* رفع ملف (صوت/صورة/مستند) عبر الخادم */
app.post('/chat-api/upload', express.raw({ type: '*/*', limit: '30mb' }), async (req, res) => {
  try {
    const s = authArkan({ headers: req.headers, query: req.query });
    if (!s) return res.status(401).json({ error: 'unauthorized' });
    const ext = (req.query.ext || 'bin').replace(/[^a-z0-9]/gi, '');
    const conv = String(req.query.conv || '').replace(/[^a-z0-9-]/gi, '');
    if (s.role !== 'owner' && s.conv !== conv) return res.status(403).json({ error: 'forbidden' });
    const path = `${conv}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const sbUrl = process.env.SUPABASE_URL || 'https://vyxzlazwpbstigcqvizb.supabase.co';
    const up = await fetch(`${sbUrl}/storage/v1/object/chat-media/${path}`, {
      method: 'POST',
      headers: { 'apikey': SB_PUB, 'Authorization': `Bearer ${SB_PUB}`, 'Content-Type': req.headers['content-type'] || 'application/octet-stream' },
      body: req.body
    });
    if (!up.ok) { const t = await up.text(); return res.status(502).json({ error: 'upload failed', sb: t.slice(0, 200) }); }
    const publicUrl = `${sbUrl}/storage/v1/object/public/chat-media/${path}`;
    res.json({ path, url: publicUrl });
  } catch (e) { console.error('upload:', e.message); res.status(500).json({ error: 'server', msg: e.message }); }
});

/* الملف الشخصي: جلب */
app.get('/chat-api/profile', async (req, res) => {
  const s = authArkan(req); if (!s) return res.status(401).json({ error: 'unauthorized' });
  const r = await sbRpc('api_get_profile', { p_uid: s.uid });
  res.json({ profile: Array.isArray(r.data) ? r.data[0] : r.data });
});

/* الملف الشخصي: تحديث الاسم/الصورة */
app.post('/chat-api/profile', async (req, res) => {
  const s = authArkan(req); if (!s) return res.status(401).json({ error: 'unauthorized' });
  await sbRpc('api_update_profile', { p_uid: s.uid, p_name: req.body.name || null, p_avatar: req.body.avatar_url || null });
  res.json({ ok: true });
});

app.get('/health', (req, res) => res.json({
  ok: true,
  pending: Object.values(DB.orders).filter(o => o.status === 'pending').length,
  fb: fbReady,
  fb_err: fbErr,
  wa: !!process.env.WA_TOKEN,
  sb: !!process.env.SUPABASE_JWT_SECRET
}));

app.listen(ENV.PORT, () => {
  console.log(`▲ ARKAN STORE on :${ENV.PORT}`);
  console.log(`  Wallet: ${ENV.WALLET}`);
  console.log(`  Bot: @${ENV.BOT_USERNAME} ${ENV.BOT_TOKEN ? '✓' : '✗ (TELEGRAM_BOT_TOKEN missing)'}`);
  console.log(`  Channel: ${ENV.CHANNEL_ID || '✗ (MEMBERS_CHANNEL_ID missing)'}`);
});
