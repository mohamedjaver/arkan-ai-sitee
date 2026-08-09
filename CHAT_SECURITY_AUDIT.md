# ARKAN CHAT — SECURITY AUDIT & E2EE ARCHITECTURE
**التاريخ:** 2026-08-09 · **النطاق:** chat-v2 + server.js + SQL 001–005 + Storage
**المرجع:** مواصفات العميل 35 بندًا · **الفاحص:** مراجعة كود فعلية ملفًا بملف

---

## 1. Current Architecture

```
Customer Browser ── OTP (WhatsApp) ──► Railway /otp/verify ──► sessionToken (HMAC 90d)
        │                                                            │
        │◄──── /supabase-token (إثبات إلزامي) ◄──────────────────────┘
        │              │
        ▼              ▼
   Supabase JWT (sub = uuidv5(phone), arkan_role) ── 24h
        │
        ▼
   Supabase (RLS) ── conversations_v2 / messages_v2 / chat-media
        ▲
        │  نفس المسار
   Owner Browser (chat-v2.html — لوحة المالك)
```

- **الربط عميل↔مورد:** تلقائي عبر `ensure_my_conversation()` — `unique(customer_id)` يضمن محادثة واحدة دائمة لكل عميل مع المالك. لا روابط يدوية. ✅ (بنود 2، 14، 15، 16)
- **Conversation ID:** `gen_random_uuid()` — غير قابل للتوقع. الوصول يتطلب JWT + عضوية RLS، ومعرفة الـ ID وحدها لا تكفي. ✅ (بند 3)
- **RLS:** `is_conv_member()` على select/insert للرسائل، و`sender_id = auth.uid()` شرط للإدراج. ✅ (بند 28 جزئيًا)
- **Preview:** `last_preview` نصوص نوعية ("📷 صورة") وليس محتوى الرسالة. ✅ (بند 10) — ⚠️ باستثناء `file_name` يظهر في معاينة PDF/مستند (تسريب metadata بسيط).

## 2. Vulnerabilities Found

| # | الخطورة | الوصف | الملف |
|---|---|---|---|
| V1 | 🔴 حرجة | **"E2EE" زائف:** مفتاح المحادثة = SHA-256(`conversations_v2.secret` \| conv_id) والـ secret **مخزّن في القاعدة** ويُقرأ عبر `ensure_my_conversation`. أي جهة تصل للقاعدة (Admin/Supabase/تسريب) تفك كل الرسائل. يخالف البنود 4، 6، 7، 28 ("Admin ≠ قراءة الرسائل"). | 001 SQL + chat-v2 |
| V2 | 🔴 حرجة | **المرفقات ترفع Plain:** `sendFile()` يرفع الملف/الإيصال الأصلي غير مشفر إلى `chat-media`. Storage يحتوي صور الإيصالات البنكية كما هي. يخالف بند 11. | chat-v2:sendFile |
| V3 | 🔴 حرجة | **الصوتيات ترفع Plain:** recBlob يُرفع مباشرة. يخالف بند 12. | chat-v2:voice |
| V4 | 🟠 عالية | (أُغلقت 2026-08-08) استيلاء بالحساب عبر `/chat-api/session?phone=` + bootstrap مفتوح + PIN في localStorage + تسريب diag. | server.js |
| V5 | 🟡 متوسطة | `file_name` الأصلي في preview + رسالة الرد المقتبسة قد تعرض نصًا مفكوكًا في DOM دون sanitization كاملة في كل المسارات (مراجعة esc() مطلوبة لكل نقطة حقن). | chat-v2 |
| V6 | 🟡 متوسطة | لا `encryptionVersion` في الرسائل — يمنع أي ترقية نظيفة للتشفير (بند 9). | schema |
| V7 | 🟡 متوسطة | لا idempotency key للرسائل — إعادة الإرسال عند انقطاع الشبكة قد تكرر الرسالة (بند 19، Test 9). | chat-v2 |
| V8 | 🟢 منخفضة | `secret` يُعاد في نتيجة RPC لكل استدعاء — يوسع سطح التسريب حتى ضمن النموذج القديم. | 001/003 SQL |

## 3. Authentication Problems
- ✅ أُغلقت في دفعة 2026-08-08: إثبات إلزامي (sessionToken HMAC 90d / idToken / PIN server-side)، لا PIN في المتصفح، bootstrap محمي بمفتاح ترويسة timing-safe.
- ⚠️ متبقٍ (دفعة لاحقة): قواعد Firestore تسمح بقراءة `users/{phone}` client-side (يخدم login القديم في account.html) — يُغلق بعد نقل التحقق للخادم.

## 4. Authorization Problems
- ✅ RLS بالعضوية سليم (Test 1، 2 تنجح بنيويًا).
- ⚠️ Storage: يجب التأكد أن سياسات bucket `chat-media` تقيّد القراءة بعضوية المحادثة (المسار يبدأ بـ conv_id) وليس فقط signed URLs.

## 5. Encryption Problems
هي V1–V3 أعلاه. الخلاصة: تشفير حقيقي client-side موجود تقنيًا (AES-GCM + IV فريد ✅ بند 5) لكن **ملكية المفتاح للسيرفر** تلغي الغرض.

## 6. Storage Problems
- إيصالات وصور أصلية Plain في `chat-media` (V2).
- لا file-key ولا تغليف مفاتيح.

## 7. Recommended Architecture (E2EE v2)

**قرار معماري صريح (بند 27):** المالك يقرأ رسائله من متصفحه (chat-v2 كلوحة مورد) — إذًا E2EE حقيقي Customer-device ↔ Owner-device **ممكن**. الشرط: لا يقرأ أي bot/خادم/AI الرسائل تلقائيًا. بوت Telegram الحالي لا يمس messages_v2 ✅.

```
Customer Device                                Owner Device
┌─────────────────┐                          ┌─────────────────┐
│ ECDH P-256 pair │                          │ ECDH P-256 pair │
│ priv: IndexedDB │                          │ priv: IndexedDB │
│ (non-extractable)│                         │                 │
└───────┬─────────┘                          └────────┬────────┘
        │  public_key ──► chat_users.public_key ◄──── │
        │                                             │
        │   ConvKey AES-256 (تولّد محليًا مرة واحدة)   │
        │   تُغلَّف لكل طرف عبر ECDH-derived AES-GCM    │
        ▼                                             ▼
   conversations_v2.wrapped_keys = {customer: ..., owner: ...}
        │                                             │
        │  msg: {ciphertext, iv, enc_v:2}             │
        │  file: AES-GCM(fileKey) → Storage           │
        │        fileKey مغلّف بـ ConvKey داخل الرسالة │
        ▼                                             ▼
              Supabase = ناقل ومخزن أعمى فقط
```

- **الخوارزميات (بند 5):** ECDH P-256 (WebCrypto عالمي — X25519 غير مضمون على أجهزة أندرويد القديمة في موريتانيا/أنغولا) + AES-256-GCM + IV 12-byte عشوائي لكل رسالة/ملف. لا خوارزميات مخترعة.
- **المفاتيح (بند 6):** private key غير قابل للاستخراج في IndexedDB + نسخة احتياطية مغلفة بمفتاح مشتق PBKDF2-SHA256 (310k+ تكرار) من عبارة استرداد. **تحذير صريح:** PIN من 4 أرقام غير كافٍ كأساس KDF للنسخة الاحتياطية — الاسترداد يعتمد عبارة/رمز أطول (بند 25).
- **مفتاح لكل محادثة (بند 7):** ✅ ConvKey مستقل، السيرفر يرى النسخ المغلفة فقط.
- **Forward secrecy (بند 9):** v2 = مفتاح محادثة ثابت + `encryption_version` بكل رسالة؛ البنية تسمح بـ ratchet لاحقًا (v3) دون كسر.
- **AI (بند 22):** لا فك تلقائي — أي إرسال لـ AI يتطلب زر موافقة يفك محليًا ويرسل الجزء المحدد فقط.
- **Search (بند 24):** محلي بعد الفك فقط. لا فهرس plaintext.

## 8. Changes Implemented (هذه الدفعة)
1. `sql/006_e2ee.sql` — أعمدة المفاتيح العامة/المغلفة + `encryption_version` + `client_msg_id` (idempotency) + سياسات Storage بالعضوية + إخفاء file_name من preview.
2. `arkan-e2ee.js` — محرك كامل: توليد/تخزين/تغليف المفاتيح، تشفير/فك الرسائل والملفات والصوت، نسخ احتياطي مغلف، ترقية v1→v2.
3. خطة دمج chat-v2 خلف راية `enc_v` مع توافق رجعي كامل (بند 29): الرسائل القديمة v1 تُفك بالمفتاح القديم وتُعلَّم "Legacy"، الجديدة v2 فقط.

## 9. Remaining Risks
- جهاز مخترق = نهاية أي E2EE (خارج نموذج التهديد).
- Metadata (من راسل من، متى، حجم الملف) مرئي للسيرفر — مقبول ومصرح به.
- كود JS يُقدَّم من GitHub Pages — من يملك النشر يستطيع حقن كود يسرّب المفاتيح (خطر كل web-E2EE؛ يُخفف بـ SRI + مراجعة commits).
- عبارة استرداد ضائعة = رسائل v2 غير قابلة للاسترجاع (خاصية، ليست خطأ).

## 10. Deployment Checklist
- [ ] 006_e2ee.sql في Supabase
- [ ] رفع arkan-e2ee.js + chat-v2 المدمج
- [ ] كلا الطرفين (المالك أولًا) يولّد مفاتيحه من الجلسة
- [ ] Tests 1–10 (بند 30) — خريطة التنفيذ داخل التقرير أعلاه
- [ ] مراقبة أسبوع ثم قفل إنشاء رسائل v1

## Test Matrix (بند 30)
| Test | الآلية | الحالة |
|---|---|---|
| 1. عميل A يفتح محادثة B | RLS is_conv_member | ✅ بنيويًا |
| 2. تغيير conversationId من DevTools | RLS | ✅ |
| 3. تغيير supplierId | لا يوجد حقل قابل للكتابة من العميل؛ cv_update للمالك فقط | ✅ |
| 4. قراءة DB مباشرة | v2: ciphertext فقط | بعد الدمج |
| 5. قراءة Storage | v2: blobs مشفرة | بعد الدمج |
| 6. Admin يقرأ الرسائل | v2: يرى مغلفات فقط | بعد الدمج |
| 7. سرقة public key | لا تفك شيئًا (ECDH يتطلب private) | ✅ بالتصميم |
| 8. Replay | iv+ciphertext فريدان، created_at خادمي، client_msg_id unique | 006 |
| 9. Duplicate send | unique(client_msg_id) | 006 |
| 10. حساب مختلف نفس الجهاز | مفاتيح IndexedDB معنونة بالـ uid + مسح عند logout | المحرك |
