# BDL brand v3 — تطبيق الشعار على كل الصفحات

1. انسخ مجلد `brand/` كاملًا إلى جذر الريبو (arkan-ai-sitee).
2. أضف في كل صفحة HTML قبل `</body>` (أو داخل arkan-nav.js ليتحمّل تلقائيًا):
   `<script src="/brand/bdl-logo.js?v=3"></script>`
   السكربت: يبدّل كل صور الشعار الحالية (img[src*=logo], alt BDL/لبدال) تلقائيًا، يختار النسخة البيضاء على الخلفيات الداكنة، ويحدّث favicon + apple-touch-icon + theme-color.
   للتحكم اليدوي: `<img data-bdl-logo="mark|horizontal|horizontal-white|map">`
3. manifest.json: ادمج محتوى `manifest-icons.json`.
4. bdl-brand.js (أختام PDF): بدّل مسار الشعار إلى `window.BDL_LOGO.horiz` أو `icon-512.png`.
5. Capacitor / App Store: `icon-1024.png` (بلا زوايا مدورة — النظام يقصّها).
6. ارفع إصدار SW: `const V` في sw.js — بدونه لا يصل التغيير للعملاء.
