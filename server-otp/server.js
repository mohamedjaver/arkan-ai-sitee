/* ═══════════════════════════════════════════════════════════════
   ARKAN OTP — رمز التحقق عبر واتساب (Meta Cloud API)
   المسار: العميل يطلب رمزًا → يصله على واتسابه → يتحقق →
   يستلم Firebase Custom Token → يدخل بجلسة حقيقية.
   Env المطلوبة في Railway:
     WA_TOKEN        توكن Meta (System User دائم أو مؤقت للاختبار)
     WA_PHONE_ID     Phone number ID من لوحة واتساب
     WA_TEMPLATE     اسم قالب المصادقة (افتراضي: arkan_otp)
     FB_SERVICE_JSON محتوى ملف Service Account كاملًا (JSON)
     ALLOWED_ORIGIN  https://arkanrates.com
   ═══════════════════════════════════════════════════════════════ */
import express from 'express';
import crypto from 'crypto';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { v5 as uuidv5 } from 'uuid';

const app = express();
app.use(express.json({ limit: '32kb' }));

/* ── CORS مقفول على الموقع ── */
const ORIGIN = process.env.ALLOWED_ORIGIN || 'https://arkanrates.com';
app.use((req, res, next) => {
  const o = req.headers.origin || '';
  if (o === ORIGIN || o === 'https://www.arkanrates.com') res.setHeader('Access-Control-Allow-Origin', o);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ── Firebase Admin ── */
let fbReady = false;
try {
  const svc = JSON.parse(process.env.FB_SERVICE_JSON || '{}');
  if (svc.project_id) { admin.initializeApp({ credential: admin.credential.cert(svc) }); fbReady = true; }
} catch (e) { console.error('FB init:', e.message); }

/* ── مخزن الرموز (ذاكرة + TTL) ── */
const codes = new Map();     // phone -> {hash, exp, tries}
const sends = new Map();     // phone -> [timestamps]
const SALT = process.env.OTP_SALT || crypto.randomBytes(16).toString('hex');
const hash = c => crypto.createHash('sha256').update(SALT + c).digest('hex');
const now = () => Date.now();
setInterval(() => { for (const [k, v] of codes) if (v.exp < now()) codes.delete(k); }, 60000);

const normPhone = p => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  return d;
};
const validPhone = d => /^(222\d{8}|244\d{9})$/.test(d);

/* ── إرسال واتساب ── */
async function waSend(phone, code) {
  const url = `https://graph.facebook.com/v21.0/${process.env.WA_PHONE_ID}/messages`;
  const tpl = process.env.WA_TEMPLATE || 'arkan_otp';
  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: tpl,
      language: { code: 'ar' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: code }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }
      ]
    }
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `WA ${r.status}`);
  return j;
}

/* ── طلب رمز ── */
app.post('/otp/send', async (req, res) => {
  try {
    const phone = normPhone(req.body.phone);
    if (!validPhone(phone)) return res.status(400).json({ ok: false, err: 'رقم غير صالح — موريتانيا أو أنغولا فقط' });
    const hist = (sends.get(phone) || []).filter(t => now() - t < 3600000);
    if (hist.length >= 4) return res.status(429).json({ ok: false, err: 'محاولات كثيرة — انتظر ساعة' });
    const code = String(crypto.randomInt(100000, 1000000));
    await waSend(phone, code);
    codes.set(phone, { hash: hash(code), exp: now() + 5 * 60000, tries: 0 });
    hist.push(now()); sends.set(phone, hist);
    res.json({ ok: true });
  } catch (e) {
    console.error('send:', e.message);
    res.status(502).json({ ok: false, err: 'تعذّر الإرسال عبر واتساب: ' + e.message });
  }
});

/* ── التحقق + إصدار توكن Firebase ── */
app.post('/otp/verify', async (req, res) => {
  try {
    const phone = normPhone(req.body.phone);
    const code = String(req.body.code || '').replace(/\D/g, '');
    const rec = codes.get(phone);
    if (!rec || rec.exp < now()) return res.status(400).json({ ok: false, err: 'انتهت صلاحية الرمز — أعد الإرسال' });
    if (rec.tries >= 5) { codes.delete(phone); return res.status(429).json({ ok: false, err: 'محاولات خاطئة كثيرة — أعد الإرسال' }); }
    rec.tries++;
    if (hash(code) !== rec.hash) return res.status(400).json({ ok: false, err: 'الرمز غير صحيح' });
    codes.delete(phone);
    if (!fbReady) return res.json({ ok: true, fbToken: null });
    const uid = 'wa_' + phone;
    const fbToken = await admin.auth().createCustomToken(uid, { phone: '+' + phone, via: 'whatsapp' });
    res.json({ ok: true, fbToken, uid });
  } catch (e) {
    console.error('verify:', e.message);
    res.status(500).json({ ok: false, err: 'خطأ في التحقق' });
  }
});

/* ═══ ARKAN Chat v2 — إصدار Supabase JWT (يفعّل RLS الحقيقي) ═══
   Env جديد في Railway: SUPABASE_JWT_SECRET (من Supabase → Settings → API → JWT Secret) */
const ARKAN_NS = '7c9e6679-7425-40de-944b-e07fc1f90ae7'; // لا تغيّره أبدًا بعد الإطلاق
const OWNER_PHONES = ['22236295050'];
const sbHits = new Map(); // phone -> [timestamps]

const phoneToUuid = (phone) => uuidv5(String(phone).replace(/\D/g, ''), ARKAN_NS);

app.post('/supabase-token', async (req, res) => {
  try {
    if (!process.env.SUPABASE_JWT_SECRET) return res.status(503).json({ error: 'SUPABASE_JWT_SECRET غير مضبوط' });
    const p = normPhone(req.body.phone);
    if (!validPhone(p)) return res.status(400).json({ error: 'invalid phone' });

    const hist = (sbHits.get(p) || []).filter(t => now() - t < 3600000);
    if (hist.length >= 20) return res.status(429).json({ error: 'محاولات كثيرة — انتظر ساعة' });
    hist.push(now()); sbHits.set(p, hist);

    const { firebaseIdToken, pin } = req.body || {};
    let verified = false;

    if (firebaseIdToken && fbReady) {
      const decoded = await admin.auth().verifyIdToken(firebaseIdToken);
      const snap = await admin.firestore().doc(`users/${p}`).get();
      verified = snap.exists && !!decoded.uid;
    } else if (pin && fbReady) {
      const snap = await admin.firestore().doc(`users/${p}`).get();
      verified = snap.exists && String(snap.data().pin) === String(pin);
    }

    if (!verified) return res.status(401).json({ error: 'auth failed' });

    const sub = phoneToUuid(p);
    const role = OWNER_PHONES.includes(p) ? 'owner' : 'customer';
    const ts = Math.floor(Date.now() / 1000);

    const token = jwt.sign({
      sub,
      role: 'authenticated',   // دور Postgres — لا تغيّره
      aud: 'authenticated',
      arkan_role: role,
      phone: p,
      iat: ts,
      exp: ts + 60 * 60 * 24,  // 24 ساعة
    }, process.env.SUPABASE_JWT_SECRET);

    res.json({ token, user_id: sub, arkan_role: role, expires_in: 86400 });
  } catch (e) {
    console.error('supabase-token:', e.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true, fb: fbReady, wa: !!process.env.WA_TOKEN, sb: !!process.env.SUPABASE_JWT_SECRET }));

app.listen(process.env.PORT || 3000, () => console.log('ARKAN OTP يعمل ✓'));
