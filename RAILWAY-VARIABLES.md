# متغيرات Railway المطلوبة — مشروع arkan-ai-site (BDL STORE)

## جديدة (المحاسب + محرك القراءة)
| المتغير | القيمة | ملاحظة |
|---|---|---|
| ANTHROPIC_KEY | sk-ant-... | من console.anthropic.com → API Keys (مع رصيد في Billing). يُقبل بأي حالة أحرف. مع وجوده يصبح Claude هو قارئ الإيصالات في محرك الخادم (READ_ENGINE=gemini يعيد Gemini). ANTHROPIC_MODEL اختياري (افتراضي claude-sonnet-5). |
| GEMINI_KEY | AIza... | مفتاح Gemini مع تفعيل الفوترة في aistudio.google.com → Billing (يرفع الحد من 15 إلى ~1000 طلب/دقيقة). |
| GEMINI_MODEL | gemini-2.5-flash | اختياري. |
| COMPARE_CONC | 8 | عدد القراءات المتوازية على الخادم (6 افتراضيًا؛ 8–10 مع فوترة Gemini). |
| AGENT_HOUR | 7 | ساعة التقرير اليومي بتوقيت لواندا. |
| AGENT_TZ_OFFSET | 1 | فرق لواندا عن UTC. |

## موجودة أصلًا — لا تغيّرها
SUPABASE_URL · SUPABASE_ANON_KEY · SUPABASE_JWT_SECRET · FB_SERVICE_JSON (أو FB_SERVICE_B) · VAPID_PUBLIC_KEY · VAPID_PRIVATE_KEY ·
TELEGRAM_BOT_TOKEN · TELEGRAM_ADMIN_ID · TELEGRAM_BOT_USERNAME · WA_TOKEN · WA_PHONE_ID · WA_WABA_ID · WA_VERIFY_TOKEN · WA_TEMPLATE ·
WHATSAPP_TOKEN · TRONGRID_API_KEY · WALLET_ADDRESS · OTP_SALT · ORDER_TTL_MIN · MEMBERS_CHANNEL_ID · GH_TOKEN (أزله إن كان المفتاح القديم) · PORT (يضعه Railway).

## بعد الحفظ
1. Railway → Deployments → Redeploy (أو انتظر النشر التلقائي من main).
2. في Supabase SQL Editor الصق bdl-agent.sql.
3. اختبار: من حسابك (مالك) افتح lbdal.com/dues.html — وسيصلك على Telegram أول تقرير عند 07:00، أو فورًا عبر POST /agent/run.
