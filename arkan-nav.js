/* ============================================================
   BDL — شريط التنقّل الموحّد (Build 1283 — الدفعة A من التنظيف)
   الاستخدام: <script src="arkan-nav.js" defer></script>
   يرسم: شريطًا سفليًا ثابتًا (5 تبويبات للمالك / 4 للزبون) + ورقة «المزيد» للصفحات الثانوية.
   القاعدة: تبويب → صفحة → ورقة. لا عمق رابع، لا روابط في الرأس.
   ============================================================ */
(function () {
  'use strict';
  var HIDE_ON = ['login.html', 'offline.html', 'confirm.html', 'receipt.html', 'verify.html', 'install.html', ''];
  var path = location.pathname.split('/').pop() || 'index.html';
  if (HIDE_ON.indexOf(path) !== -1) return;

  /* هل هو المالك؟ */
  var isOwner = !!localStorage.getItem('arkan_owner_auth') || !!localStorage.getItem('arkan_admin_dev');
  try { var ses = JSON.parse(localStorage.getItem('arkan_session') || 'null');
        if (ses && /36295050$/.test(String(ses.phone || '').replace(/\D/g, ''))) isOwner = true; } catch (e) {}
  if (/^(compare|settle-v2|settlement|dues|accountant|books|admin|rates-admin|archive)\.html$/.test(path)) isOwner = true;

  /* ترتيب التشغيل اليومي للمالك (من اليمين): 1 رفع إيصالات الزبائن (الحساب) → 2 التسويات → 3 المطابقة → 4 المحاسب */
  var TABS_OWNER = [
    { href: 'account.html',    icon: 'upload', label: '1 الرفع' },
    { href: 'settle-v2.html',  icon: 'layers', label: '2 التسوية' },
    { href: 'compare.html',    icon: 'match',  label: '3 المطابقة' },
    { href: 'accountant.html', icon: 'calc',   label: '4 المحاسب' }
  ];
  var TABS_CLIENT = [
    { href: 'index.html',   icon: 'home',    label: 'الرئيسية' },
    { href: 'request.html', icon: 'send',    label: 'تحويل' },
    { href: 'chat-v2.html', icon: 'message', label: 'الدردشة' }
  ];
  /* ورقة «المزيد» — الصفحات الثانوية الحيّة فقط */
  var MORE_OWNER = [
    { href: 'index.html',      icon: 'home',    label: 'الرئيسية' },
    { href: 'books.html',      icon: 'book',    label: 'الدفاتر' },
    { href: 'rates-admin.html',icon: 'rate',    label: 'الأسعار' },
    { href: 'wallet.html',     icon: 'wallet',  label: 'المحفظة' },
    { href: 'chat-v2.html',    icon: 'message', label: 'الدردشة' },
    { href: 'request.html',    icon: 'send',    label: 'طلب تحويل' }
  ];
  var MORE_CLIENT = [
    { href: 'rates.html',   icon: 'rate',   label: 'الأسعار' },
    { href: 'wallet.html',  icon: 'wallet', label: 'المحفظة' },
    { href: 'account.html', icon: 'user',   label: 'الحساب' }
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
    upload:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    menu:'M3 12h18M3 6h18M3 18h18',
    bell:'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    logout:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    close:'M18 6L6 18M6 6l12 12'
  };
  function svg(n, s) { s = s || 22; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICONS[n] || '') + '"/></svg>'; }
  if (!isOwner && path === 'account.html') return;
  var tabs = isOwner ? TABS_OWNER : TABS_CLIENT, more = isOwner ? MORE_OWNER : MORE_CLIENT;
  var active = function (h) { return h.split('#')[0] === path || (path === 'dues.html' && h === 'accountant.html') || (path === 'settlement.html' && h === 'compare.html'); };

  var css = document.createElement('style');
  css.textContent =
    'body{padding-bottom:calc(66px + env(safe-area-inset-bottom,0px))!important}' +
    '#akTabs{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:flex;background:#fff;border-top:1px solid #E6E8EE;padding:2px 6px 0;padding-bottom:env(safe-area-inset-bottom,0px);font-family:inherit;box-shadow:0 -6px 20px rgba(10,10,10,.04)}' +
    '#akTabs a{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 2px 8px;color:#6B7280;text-decoration:none;font-size:11px;font-weight:500;-webkit-tap-highlight-color:transparent}' +
    '#akTabs a svg{width:26px;height:26px;stroke-width:1.8}#akTabs a.on{color:#0A0A0A;font-weight:700}#akTabs a.on svg{stroke:#0A0A0A;stroke-width:2.2}#akTabs a:active{opacity:.6}' +
    '#akMore{position:fixed;inset:0;z-index:9500;display:none;background:rgba(11,47,112,.45)}#akMore.on{display:grid;place-items:end center}' +
    '#akMore .sh{background:#fff;width:min(560px,100%);border-radius:24px 24px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom,0px))}' +
    '#akMore h4{margin:0 0 10px;font-size:14px;color:#0B2F70;display:flex;justify-content:space-between;align-items:center}' +
    '#akMore .g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}#akMore .g a{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:1px solid rgba(11,47,112,.12);border-radius:12px;color:#0B2F70;text-decoration:none;font-size:11px;font-weight:700;text-align:center}' +
    '#akMore .lo{margin-top:12px;width:100%;padding:14px;border:1.5px solid #D5D8E0;color:#D0342C;background:#fff;border-radius:99px;font:inherit;font-weight:700}' +
    'body{padding-top:calc(56px + env(safe-area-inset-top,0px))!important}' +
    '#akTop{position:fixed;top:0;left:0;right:0;z-index:9000;height:calc(56px + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 10px 0 10px;display:flex;align-items:center;gap:4px;background:#fff;border-bottom:1px solid #E6E8EE;font-family:inherit}' +
    '#akTop span{flex:1}#akTop a{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:#0A0A0A;text-decoration:none}#akTop a:active{background:#F0F2F7}' +
    '#akTop a.lg{width:auto;border-radius:0;display:flex;gap:8px;align-items:center;padding:0 4px}#akTop a.lg img{width:32px;height:32px;border-radius:8px}#akTop a.lg b{font:800 15px/1 Inter,system-ui,sans-serif;letter-spacing:.5px;color:#0B2F70}' +
    '/* رؤوس الصفحات القديمة تُخفى لأن الشريط العلوي حلّ محلّها */nav.nav,.nav-toggle,#navToggle,#akNavBtns,#mmenu{display:none!important}' +
    '#arkChatFab{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}' +
    '@media print{#akTabs,#akMore,#akTop{display:none!important}}';
  document.head.appendChild(css);

  var bar = document.createElement('nav'); bar.id = 'akTabs'; bar.setAttribute('aria-label', 'التنقل');
  bar.innerHTML = tabs.map(function (t) { return '<a href="' + t.href + '" class="' + (active(t.href) ? 'on' : '') + '">' + svg(t.icon) + '<span>' + t.label + '</span></a>'; }).join('');
  /* شريط علوي خفيف على نمط PayPal: ☰ يسارًا (يفتح «المزيد»)، جرس + حساب يمينًا — لا يزاحم رأس الصفحة */
  var top = document.createElement('div'); top.id = 'akTop';
  top.innerHTML = '<a href="index.html" class="lg" aria-label="BDL"><img src="favicon.svg?v=bdl7" alt="BDL"><b>BDL</b></a><span></span>' +
    '<a href="chat-v2.html" aria-label="الرسائل">' + svg('bell', 20) + '</a><a href="account.html" aria-label="الحساب">' + svg('user', 20) + '</a><a href="#" id="akMoreBtn" aria-label="القائمة">' + svg('menu', 20) + '</a>';
  var sheet = document.createElement('div'); sheet.id = 'akMore';
  sheet.innerHTML = '<div class="sh"><h4><span>المزيد</span><a href="#" id="akClose" style="color:#C62828">' + svg('close', 18) + '</a></h4><div class="g">' +
    more.filter(function (m) { return m.href !== path; }).map(function (m) { return '<a href="' + m.href + '">' + svg(m.icon, 20) + m.label + '</a>'; }).join('') +
    '</div><div id="akLang" style="display:flex;gap:6px;margin-top:12px"></div><button class="lo" id="akLogout">تسجيل الخروج</button></div>';
  function mount() { document.body.appendChild(bar); document.body.appendChild(sheet); document.body.appendChild(top);
    document.getElementById('akMoreBtn').onclick = function (e) { e.preventDefault(); sheet.classList.add('on'); };
    document.getElementById('akClose').onclick = function (e) { e.preventDefault(); sheet.classList.remove('on'); };
    sheet.onclick = function (e) { if (e.target === sheet) sheet.classList.remove('on'); };
    document.getElementById('akLogout').onclick = function () {
      ['arkan_session', 'arkan_sb_jwt', 'arkanClient', 'arkan_admin_dev', 'arkan_owner_auth'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      location.href = 'account.html';
    };
    /* مبدّل اللغة (إن وُجد في الصفحة) ينتقل إلى الورقة بدل الرأس */
    var seg = document.getElementById('langSeg'); if (seg) { var box = document.getElementById('akLang'); box.appendChild(seg); seg.style.cssText = 'display:flex;gap:6px;width:100%'; seg.querySelectorAll('button').forEach(function (b) { b.style.cssText = 'flex:1;padding:10px;border:1.5px solid #D5D8E0;border-radius:99px;background:#fff;font:inherit;font-weight:700;color:#0A0A0A'; }); }
    /* توافق مع الأزرار القديمة التي تستدعي قائمة الهامبرغر */
    window.akOpenMenu = function () { sheet.classList.add('on'); };
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
