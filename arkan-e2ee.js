/* ═══════════════════════════════════════════════════════════════
   ARKAN E2EE Engine v2 — arkan-e2ee.js
   ECDH P-256 (WebCrypto) + AES-256-GCM · مفتاح لكل محادثة · مغلّف لكل طرف
   السيرفر لا يرى إلا: public keys + مغلفات + ciphertext
   قواعد: لا nonce مكرر، لا Base64-كتشفير، لا مفاتيح في الكود، لا plaintext في اللوغ
   ═══════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';
  const S = crypto.subtle, ENC_V = 2, DB = 'arkan-e2ee', ST = 'keys';
  const b64 = u8 => btoa(String.fromCharCode(...new Uint8Array(u8)));
  const u8b = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const iv12 = () => crypto.getRandomValues(new Uint8Array(12));
  const te = new TextEncoder(), td = new TextDecoder();

  /* ── IndexedDB: المفتاح الخاص non-extractable، معنون بالـ uid (Test 10) ── */
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(k) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction(ST).objectStore(ST).get(k); t.onsuccess = () => res(t.result || null); t.onerror = () => rej(t.error); }); }
  async function idbSet(k, v) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction(ST, 'readwrite').objectStore(ST).put(v, k); t.onsuccess = () => res(); t.onerror = () => rej(t.error); }); }
  async function idbDel(k) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction(ST, 'readwrite').objectStore(ST).delete(k); t.onsuccess = () => res(); t.onerror = () => rej(t.error); }); }

  /* ── 1) هوية المستخدم: زوج ECDH P-256 ── */
  async function genIdentity() {
    return S.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']); // priv غير قابل للاستخراج
  }
  async function ensureIdentity(uid) {
    let rec = await idbGet('id:' + uid);
    if (rec && rec.priv && rec.pubJwk) return rec;
    // زوج قابل للتصدير مؤقتًا لعمل النسخة الاحتياطية ثم يُخزَّن non-extractable
    const kp = await S.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
    const pubJwk = await S.exportKey('jwk', kp.publicKey);
    const privJwk = await S.exportKey('jwk', kp.privateKey);
    const priv = await S.importKey('jwk', privJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
    rec = { priv, pubJwk, v: 1 };
    await idbSet('id:' + uid, rec);
    // privJwk يبقى في الذاكرة فقط لهذا الاستدعاء — يُمرَّر لعمل backup ثم يُنسى
    rec._privJwkOnce = privJwk;
    return rec;
  }
  async function wipeIdentity(uid) { await idbDel('id:' + uid); for (const k of ['ck:', 'lg:']) { /* مفاتيح محادثات هذا المستخدم */ } }

  /* ── 2) اشتقاق مفتاح تغليف بين طرفين: ECDH(privA, pubB) → AES-256-GCM ── */
  async function wrapKeyFor(myPriv, theirPubJwk) {
    const theirPub = await S.importKey('jwk', theirPubJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return S.deriveKey({ name: 'ECDH', public: theirPub }, myPriv,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  /* ── 3) مفتاح المحادثة: AES-256 عشوائي، يُغلَّف لكل مشارك ── */
  async function genConvKey() {
    return S.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }
  async function wrapConvKey(convKey, myPriv, myPubJwk, theirPubJwk) {
    const raw = await S.exportKey('raw', convKey);
    const wk = await wrapKeyFor(myPriv, theirPubJwk);
    const iv = iv12();
    const ct = await S.encrypt({ name: 'AES-GCM', iv }, wk, raw);
    return { ct: b64(ct), iv: b64(iv), epk: myPubJwk, v: ENC_V }; // epk = المفتاح العام للمغلِّف
  }
  async function unwrapConvKey(wrapped, myPriv) {
    const wk = await wrapKeyFor(myPriv, wrapped.epk);
    const raw = await S.decrypt({ name: 'AES-GCM', iv: u8b(wrapped.iv) }, wk, u8b(wrapped.ct));
    return S.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  /* ── 4) رسائل: enc2:<iv>.<ct> ── */
  async function encMsg(convKey, text) {
    const iv = iv12();
    const ct = await S.encrypt({ name: 'AES-GCM', iv }, convKey, te.encode(text));
    return 'enc2:' + b64(iv) + '.' + b64(ct);
  }
  async function decMsg(convKey, s) {
    if (!s || !s.startsWith('enc2:')) return null;
    const [i, c] = s.slice(5).split('.');
    const pt = await S.decrypt({ name: 'AES-GCM', iv: u8b(i) }, convKey, u8b(c));
    return td.decode(pt);
  }

  /* ── 5) ملفات/صوت (بند 11–12): مفتاح لكل ملف، تشفير قبل أي رفع ── */
  async function encFile(convKey, blob) {
    const fileKey = await S.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    const iv = iv12();
    const buf = await blob.arrayBuffer();
    const ct = await S.encrypt({ name: 'AES-GCM', iv }, fileKey, buf);
    // غلّف مفتاح الملف بمفتاح المحادثة
    const fkRaw = await S.exportKey('raw', fileKey);
    const wiv = iv12();
    const wct = await S.encrypt({ name: 'AES-GCM', iv: wiv }, convKey, fkRaw);
    return {
      blob: new Blob([ct], { type: 'application/octet-stream' }), // الأصل لا يغادر الجهاز
      enc_file_iv: b64(iv),
      enc_file_key: { ct: b64(wct), iv: b64(wiv), v: ENC_V }
    };
  }
  async function decFile(convKey, encBuf, enc_file_iv, enc_file_key, mime) {
    const fkRaw = await S.decrypt({ name: 'AES-GCM', iv: u8b(enc_file_key.iv) }, convKey, u8b(enc_file_key.ct));
    const fileKey = await S.importKey('raw', fkRaw, 'AES-GCM', false, ['decrypt']);
    const pt = await S.decrypt({ name: 'AES-GCM', iv: u8b(enc_file_iv) }, fileKey, encBuf);
    return new Blob([pt], { type: mime || 'application/octet-stream' });
  }

  /* ── 6) نسخة احتياطية للمفتاح الخاص (بند 25) — عبارة استرداد، ليس PIN ──
     PBKDF2-SHA256 · 310,000 تكرار · salt 16B — السيرفر يخزن المغلف ولا يملك العبارة */
  async function backupPriv(privJwk, passphrase) {
    if (!passphrase || passphrase.length < 8) throw new Error('عبارة الاسترداد 8 أحرف على الأقل');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const base = await S.importKey('raw', te.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const kek = await S.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 310000 },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = iv12();
    const ct = await S.encrypt({ name: 'AES-GCM', iv }, kek, te.encode(JSON.stringify(privJwk)));
    return { ct: b64(ct), iv: b64(iv), salt: b64(salt), iter: 310000, v: 1 };
  }
  async function restorePriv(backup, passphrase, uid) {
    const base = await S.importKey('raw', te.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const kek = await S.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: u8b(backup.salt), iterations: backup.iter || 310000 },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const pt = await S.decrypt({ name: 'AES-GCM', iv: u8b(backup.iv) }, kek, u8b(backup.ct));
    const privJwk = JSON.parse(td.decode(pt));
    const pubJwk = { kty: privJwk.kty, crv: privJwk.crv, x: privJwk.x, y: privJwk.y };
    const priv = await S.importKey('jwk', privJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
    const rec = { priv, pubJwk, v: 1 };
    await idbSet('id:' + uid, rec);
    return rec;
  }

  /* ── 7) الواجهة العليا التي يستدعيها chat-v2 ──
     bootE2EE(sb, uid, otherUid): يضمن مفاتيح الطرفين + مفتاح المحادثة المغلف
     يعيد {convKey, ready} — ready=false إن كان الطرف الآخر بلا مفتاح عام بعد */
  async function bootE2EE(sb, uid, convRow) {
    const me = await ensureIdentity(uid);
    // انشر مفتاحي العام إن لم يكن منشورًا
    const { data: meRow } = await sb.from('chat_users').select('public_key,key_version').eq('id', uid).single();
    if (!meRow || !meRow.public_key) {
      await sb.from('chat_users').update({ public_key: me.pubJwk, key_version: 1 }).eq('id', uid);
    }
    // النسخة الاحتياطية تُنشأ من واجهة الإعدادات (عبارة يدخلها المستخدم) — ليست هنا
    const wrapped = (convRow.wrapped_keys || {})[uid];
    if (wrapped) {
      try { return { convKey: await unwrapConvKey(wrapped, me.priv), ready: true, me }; }
      catch (e) { /* مفتاح جهاز جديد بلا استرداد → يلزم restore */ return { convKey: null, ready: false, need: 'restore', me }; }
    }
    // لا مفتاح محادثة بعد: أنشئه وغلّفه للطرفين إذا كان مفتاح الطرف الآخر متاحًا
    const otherId = (convRow.customer_id === uid) ? convRow.owner_id : convRow.customer_id;
    const { data: other } = await sb.from('chat_users').select('public_key').eq('id', otherId).single();
    if (!other || !other.public_key) return { convKey: null, ready: false, need: 'peer_key', me };
    const ck = await genConvKey();
    const wk = { ...(convRow.wrapped_keys || {}) };
    wk[uid]     = await wrapConvKey(ck, me.priv, me.pubJwk, me.pubJwk);       // لي:  ECDH(priv_me, pub_me)
    wk[otherId] = await wrapConvKey(ck, me.priv, me.pubJwk, other.public_key); // له: يفكها بـ ECDH(priv_other, epk=pub_me)
    const { error } = await sb.from('conversations_v2')
      .update({ wrapped_keys: wk, enc_v: 2 }).eq('id', convRow.id);
    if (error) return { convKey: null, ready: false, need: 'db', me };
    return { convKey: ck, ready: true, me };
  }

  /* ── 8) idempotency (بند 19 / Test 9) ── */
  const newMsgId = () => crypto.randomUUID();

  g.ArkanE2EE = {
    ENC_V, ensureIdentity, restorePriv, backupPriv, bootE2EE,
    encMsg, decMsg, encFile, decFile, newMsgId, wipeIdentity
  };
})(window);
