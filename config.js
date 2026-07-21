/* ============================================================
   ARKAN SETTLEMENTS — إعدادات التكاملات المجانية
   الصق مفاتيحك هنا. أي قيمة تُترك فارغة = الخدمة معطّلة بأمان
   ولن يتأثر الموقع إطلاقًا.
   ============================================================ */
window.ARKAN_CONFIG = {

  /* ---- WhatsApp / Telegram (يعمل الآن بلا مفاتيح) ---- */
  whatsapp: '22236295050',
  telegram: 'https://t.me/ArkanAI_Access_Bot',

  /* ---- Google Analytics 4 ----
     analytics.google.com → إنشاء موقع → انسخ معرّف القياس G-XXXXXXX */
  ga4: '',

  /* ---- Tawk.to — الدردشة الحية ----
     tawk.to → Administration → Chat Widget → انسخ الرابط بعد embed/
     مثال: '68abc123def456/1h9x8y7z' */
  tawkto: '',

  /* ---- OneSignal — الإشعارات ----
     onesignal.com → New App → Web Push → انسخ App ID */
  onesignal: '',

  /* ---- EmailJS — إرسال الطلبات بالبريد ----
     emailjs.com → Account → Public Key + Service ID + Template ID */
  emailjs: { publicKey:'', serviceId:'', templateId:'' },

  /* ---- Firebase — الحسابات وقاعدة البيانات ----
     console.firebase.google.com → Project settings → Your apps → Web */
  firebase: {
    apiKey:'', authDomain:'', projectId:'', storageBucket:'', messagingSenderId:'', appId:''
  },

  /* ---- الأسعار الحية (CoinGecko مجاني بلا مفتاح) ---- */
  livePrices: true,
  priceCacheMinutes: 5
};
