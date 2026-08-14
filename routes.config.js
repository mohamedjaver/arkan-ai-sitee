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
    TRADING:    'trading.html',      // المؤشرات
    INVOICE:    'invoice.html',      // الفواتير
    /* أدوات المالك فقط: */
    SETTLEMENT: 'settlement.html',   // BDL console
    ARCHIVE:    'archive.html',      // الأرشيف + OCR
    ADMIN:      'admin.html',
    RATES_ADMIN:'rates-admin.html',
    /* ملغاة نهائيًا (stubs تحويل → CHAT): chat.html, chat2.html, chat3.html,
       chatdiag.html, diag2.html · deltest.html → HOME */
  });
  g.ARKAN_LEGACY = Object.freeze({
    'chat.html':'chat-v2.html','chat2.html':'chat-v2.html','chat3.html':'chat-v2.html',
    'chatdiag.html':'chat-v2.html','diag2.html':'chat-v2.html','deltest.html':'index.html'
  });
})(window);
