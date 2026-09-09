/* ============================================================
   BDL — شريط التنقّل الموحّد (Build 1283 — الدفعة A من التنظيف)
   الاستخدام: <script src="arkan-nav.js" defer></script>
   يرسم: شريطًا سفليًا ثابتًا (5 تبويبات للمالك / 4 للزبون) + ورقة «المزيد» للصفحات الثانوية.
   القاعدة: تبويب → صفحة → ورقة. لا عمق رابع، لا روابط في الرأس.
   ============================================================ */
(function () {
  'use strict';
  var HIDE_ON = ['account.html', 'login.html', 'offline.html', 'confirm.html', 'receipt.html', 'verify.html', 'install.html', ''];
  var path = location.pathname.split('/').pop() || 'index.html';
  if (HIDE_ON.indexOf(path) !== -1) return;

  /* هل هو المالك؟ */
  var isOwner = !!localStorage.getItem('arkan_owner_auth') || !!localStorage.getItem('arkan_admin_dev');
  try { var ses = JSON.parse(localStorage.getItem('arkan_session') || 'null');
        if (ses && /36295050$/.test(String(ses.phone || '').replace(/\D/g, ''))) isOwner = true; } catch (e) {}
  if (/^(compare|settle-v2|settlement|dues|accountant|books|admin|rates-admin|archive)\.html$/.test(path)) isOwner = true;

  var TABS_OWNER = [
    { href: 'index.html',      icon: 'home',   label: 'الرئيسية' },
    { href: 'compare.html',    icon: 'match',  label: 'الإيصالات' },
    { href: 'books.html',      icon: 'book',   label: 'الدفاتر' },
    { href: 'accountant.html', icon: 'calc',   label: 'المحاسب' },
    { href: 'account.html',    icon: 'user',   label: 'الحساب' }
  ];
  var TABS_CLIENT = [
    { href: 'index.html',   icon: 'home',    label: 'الرئيسية' },
    { href: 'request.html', icon: 'send',    label: 'تحويل' },
    { href: 'chat-v2.html', icon: 'message', label: 'الدردشة' },
    { href: 'account.html', icon: 'user',    label: 'الحساب' }
  ];
  /* ورقة «المزيد» — الصفحات الثانوية الحيّة فقط */
  var MORE_OWNER = [
    { href: 'settle-v2.html',  icon: 'layers',  label: 'مركز المطابقة' },
    { href: 'rates-admin.html',icon: 'rate',    label: 'الأسعار' },
    { href: 'wallet.html',     icon: 'wallet',  label: 'المحفظة' },
    { href: 'chat-v2.html',    icon: 'message', label: 'الدردشة' },
    { href: 'request.html',    icon: 'send',    label: 'طلب تحويل' }
  ];
  /* أدوات قديمة — مطوية، تبقى للوصول فقط (ستُدمج أو تُحذف في الدفعة B) */
  var LEGACY_OWNER = [
    { href: 'archive.html', label: 'الأرشيف القديم (Gemini)' },
    { href: 'admin.html',   label: 'لوحة الأدمن' },
    { href: 'invoice.html', label: 'مولّد الفواتير' }
  ];
  var MORE_CLIENT = [
    { href: 'rates.html',  icon: 'rate',   label: 'الأسعار' },
    { href: 'wallet.html', icon: 'wallet', label: 'المحفظة' }
  ];
  var ICONS = {
    home:'M3 12l9-9 9 9M5 10v10h14V10',
    send:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    message:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    user:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    match:'M4 4h6v6H4zM14 14h6v6h-6zM14 4h6v6h-6zM4 14h6v6H4z',
    book:'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
    calc:'M9 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 7h6M9 11h2M13 11h2M9 15h2M13 15h2',
    layers:'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    folder:'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    shield:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    rate:'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    doc:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8',
    wallet:'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v2M16 14h.01',
    more:'M5 12h.01M12 12h.01M19 12h.01',
    logout:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    close:'M18 6L6 18M6 6l12 12'
  };
  function svg(n, s) { s = s || 22; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICONS[n] || '') + '"/></svg>'; }
  var tabs = isOwner ? TABS_OWNER : TABS_CLIENT, more = isOwner ? MORE_OWNER : MORE_CLIENT;
  var active = function (h) { return h.split('#')[0] === path || (path === 'dues.html' && h === 'accountant.html') || (path === 'settlement.html' && h === 'compare.html'); };

  var css = document.createElement('style');
  css.textContent =
    'body{padding-bottom:calc(66px + env(safe-area-inset-bottom,0px))!important}' +
    '#akTabs{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:flex;background:rgba(255,255,255,.96);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid rgba(11,47,112,.12);padding-bottom:env(safe-area-inset-bottom,0px);font-family:inherit}' +
    '#akTabs a{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 2px 7px;color:#6B7280;text-decoration:none;font-size:10.5px;font-weight:700;-webkit-tap-highlight-color:transparent}' +
    '#akTabs a.on{color:#0B2F70}#akTabs a.on svg{stroke:#C9A227}#akTabs a:active{opacity:.6}' +
    '#akMore{position:fixed;inset:0;z-index:9500;display:none;background:rgba(11,47,112,.45)}#akMore.on{display:grid;place-items:end center}' +
    '#akMore .sh{background:#fff;width:min(560px,100%);border-radius:18px 18px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom,0px))}' +
    '#akMore h4{margin:0 0 10px;font-size:14px;color:#0B2F70;display:flex;justify-content:space-between;align-items:center}' +
    '#akMore .g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}#akMore .g a{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:1px solid rgba(11,47,112,.12);border-radius:12px;color:#0B2F70;text-decoration:none;font-size:11px;font-weight:700;text-align:center}' +
    '#akMore .lo{margin-top:12px;width:100%;padding:12px;border:1px solid #C62828;color:#C62828;background:#fff;border-radius:12px;font:inherit;font-weight:800}' +
    '@media print{#akTabs,#akMore{display:none!important}}';
  document.head.appendChild(css);

  var bar = document.createElement('nav'); bar.id = 'akTabs'; bar.setAttribute('aria-label', 'التنقل');
  bar.innerHTML = tabs.map(function (t) { return '<a href="' + t.href + '" class="' + (active(t.href) ? 'on' : '') + '">' + svg(t.icon) + '<span>' + t.label + '</span></a>'; }).join('') +
    '<a href="#" id="akMoreBtn">' + svg('more') + '<span>المزيد</span></a>';
  var sheet = document.createElement('div'); sheet.id = 'akMore';
  sheet.innerHTML = '<div class="sh"><h4><span>المزيد</span><a href="#" id="akClose" style="color:#C62828">' + svg('close', 18) + '</a></h4><div class="g">' +
    more.filter(function (m) { return m.href !== path; }).map(function (m) { return '<a href="' + m.href + '">' + svg(m.icon, 20) + m.label + '</a>'; }).join('') +
    '</div>' + (isOwner ? '<details style="margin-top:10px"><summary style="font-size:11px;color:#6B7280;font-weight:700;cursor:pointer">أدوات قديمة</summary><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' + LEGACY_OWNER.map(function (m) { return '<a href="' + m.href + '" style="font-size:11px;color:#6B7280;border:1px dashed rgba(11,47,112,.25);border-radius:8px;padding:6px 8px;text-decoration:none">' + m.label + '</a>'; }).join('') + '</div></details>' : '') +
    '<button class="lo" id="akLogout">تسجيل الخروج</button></div>';
  function mount() { document.body.appendChild(bar); document.body.appendChild(sheet);
    document.getElementById('akMoreBtn').onclick = function (e) { e.preventDefault(); sheet.classList.add('on'); };
    document.getElementById('akClose').onclick = function (e) { e.preventDefault(); sheet.classList.remove('on'); };
    sheet.onclick = function (e) { if (e.target === sheet) sheet.classList.remove('on'); };
    document.getElementById('akLogout').onclick = function () {
      ['arkan_session', 'arkan_sb_jwt', 'arkanClient', 'arkan_admin_dev', 'arkan_owner_auth'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      location.href = 'account.html';
    };
    /* توافق مع الأزرار القديمة التي تستدعي قائمة الهامبرغر */
    window.akOpenMenu = function () { sheet.classList.add('on'); };
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
