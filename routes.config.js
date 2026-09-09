/* ═══════════════════════════════════════════════════════════════
   BDL — routes.config.js (Source of Truth)
   الصفحات المعتمدة الوحيدة. لا URLs عشوائية داخل الملفات بعد الآن.
   الاستخدام:  <script src="routes.config.js"></script>
              location.href = ARKAN_ROUTES.CHAT;
   ═══════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';
  g.ARKAN_ROUTES = Object.freeze({
    HOME:       'index.html',        // BDL الرئيسية
    APP:        'app.html',          // Super App (PWA start)
    ACCOUNT:    'account.html',      // تسجيل/دخول (OTP + PIN)
    CHAT:       'chat-v2.html',      // المحادثة المعتمدة الوحيدة (JWT+RLS+E2EE)
    REQUEST:    'request.html',      // طلب بديلة/تحويل
    SETTINGS:   'settings.html',     // الملف الشخصي + المفاتيح
    RATES:      'rates.html',        // الأسعار
    WALLET:     'wallet.html',       // USDT TRC20
    TRADING:    'arkan/trading.html',      // المؤشرات
    /* أدوات المالك فقط: */
    SETTLEMENT: 'settle-v2.html',    // مركز المطابقة (بديل settlement.html)
    COMPARE:    'compare.html',      // الإيصالات — الدفتر الدائم
    ACCOUNTANT: 'accountant.html',
    RATES_ADMIN:'rates-admin.html',
    /* ملغاة نهائيًا (stubs تحويل → CHAT): chat.html, chat2.html, chat3.html,
       chatdiag.html, diag2.html · deltest.html → HOME */
  });
  g.ARKAN_LEGACY = Object.freeze({
    'chat.html':'chat-v2.html','m.html':'chat-v2.html','home-v2.html':'index.html','login.html':'account.html',
    'chat2.html':'chat-v2.html','chat3.html':'chat-v2.html','chatdiag.html':'chat-v2.html','diag2.html':'chat-v2.html','deltest.html':'index.html','brand.html':'index.html',
    'archive.html':'compare.html','settlement.html':'settle-v2.html','admin.html':'rates-admin.html','invoice.html':'index.html'
  });
})(window);
