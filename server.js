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

app.get('/health', (req, res) => res.json({ ok: true, pending: Object.values(DB.orders).filter(o => o.status === 'pending').length }));

app.listen(ENV.PORT, () => {
  console.log(`▲ ARKAN STORE on :${ENV.PORT}`);
  console.log(`  Wallet: ${ENV.WALLET}`);
  console.log(`  Bot: @${ENV.BOT_USERNAME} ${ENV.BOT_TOKEN ? '✓' : '✗ (TELEGRAM_BOT_TOKEN missing)'}`);
  console.log(`  Channel: ${ENV.CHANNEL_ID || '✗ (MEMBERS_CHANNEL_ID missing)'}`);
});
