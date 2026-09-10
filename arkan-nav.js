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
    home:'M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5zM9.5 20.5v-6h5v6',
    send:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    message:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
    match:'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11zM8 12.5l2.5 2.5L16 9.5',
    book:'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
    calc:'M6.5 3h11A1.5 1.5 0 0 1 19 4.5v16l-2.5-1.5L14 20.5l-2-1.5-2 1.5-2.5-1.5L5 20.5v-16A1.5 1.5 0 0 1 6.5 3zM8.5 8h7M8.5 11.5h7M8.5 15h4',
    layers:'M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5zM3.5 12l8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5',
    folder:'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    shield:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    rate:'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    doc:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8',
    wallet:'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v2M16 14h.01',
    more:'M5 12h.01M12 12h.01M19 12h.01',
    upload:'M4 17v1.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V17M12 15V4M7.5 8.5 12 4l4.5 4.5',
    menu:'M4 7h16M4 12h16M4 17h16',
    bell:'M6 9.5a6 6 0 0 1 12 0c0 4.5 1.5 6 2 6.5H4c.5-.5 2-2 2-6.5zM10 19.5a2 2 0 0 0 4 0',
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
    '#akTabs a{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px 2px 8px;color:#6B7280;text-decoration:none;font-size:11px;font-weight:500;-webkit-tap-highlight-color:transparent;transition:color .15s;user-select:none}' +
    '#akTabs a svg{width:27px;height:27px;stroke-width:1.5;transition:stroke .15s,transform .12s}' +
    '#akTabs a.on{color:#0A0A0A;font-weight:700}#akTabs a.on svg{stroke:#0A0A0A;stroke-width:2.1}' +
    '#akTabs a:active svg{transform:scale(.9)}' +
    '#akMore{position:fixed;inset:0;z-index:99999;display:none;background:rgba(10,10,10,.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}#akMore.on{display:grid;place-items:end center}' +
    'body.ak-more-open #arkChatFab,body.ak-more-open #akTop,body.ak-more-open #akTabs{visibility:hidden}' +
    '#akMore .sh{background:#fff;width:min(560px,100%);border-radius:28px 28px 0 0;padding:10px 18px calc(22px + env(safe-area-inset-bottom,0px));box-shadow:0 -12px 40px rgba(10,10,10,.18)}' +
    '#akMore .hb{width:40px;height:5px;border-radius:99px;background:#D5D8E0;margin:2px auto 14px}' +
    '#akMore h4{margin:0 0 4px;font-size:20px;font-weight:700;color:#0A0A0A;display:flex;justify-content:space-between;align-items:center}#akMore h4 a{width:36px;height:36px;border-radius:50%;background:#F0F2F7;display:grid;place-items:center;color:#0A0A0A}' +
    '#akMore .lbl{font-size:12px;font-weight:600;color:#6B7280;margin:14px 2px 8px}' +
    '#akMore .g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}#akMore .g a{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px 12px;background:#F0F2F7;border-radius:18px;color:#0A0A0A;text-decoration:none;font-size:12.5px;font-weight:600;text-align:center}' +
    '#akMore .g a i{width:44px;height:44px;border-radius:50%;background:#fff;display:grid;place-items:center;color:#0B2F70;font-style:normal;box-shadow:0 1px 3px rgba(10,10,10,.06)}#akMore .g a:active{background:#E6E8EE}' +
    '#akLang{display:flex;gap:0;background:#F0F2F7;border-radius:99px;padding:4px}#akLang #langSeg{display:flex;width:100%;gap:0}#akLang button{flex:1;padding:10px;border:0;border-radius:99px;background:transparent;font:inherit;font-weight:700;color:#6B7280}#akLang button.on{background:#fff;color:#0A0A0A;box-shadow:0 1px 3px rgba(10,10,10,.08)}' +
    '#akMore .lo{margin-top:18px;width:100%;padding:12px;border:0;color:#D0342C;background:transparent;border-radius:99px;font:inherit;font-weight:700;font-size:14px}' +
    'body{padding-top:calc(56px + env(safe-area-inset-top,0px))!important}' +
    '#akTop{position:fixed;top:0;left:0;right:0;z-index:9000;height:calc(56px + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 10px 0 10px;display:flex;align-items:center;gap:4px;background:#fff;border-bottom:1px solid #E6E8EE;font-family:inherit}' +
    '#akTop span{flex:1}#akTop a{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:#0B2F70;background:#F0F2F7;text-decoration:none;margin-inline-start:6px;transition:background .15s,color .15s}#akTop a svg{stroke-width:1.7}#akTop a:active{background:#0B2F70;color:#fff}' +
    '#akTop a.lg{width:auto;border-radius:0;display:flex;gap:8px;align-items:center;padding:0 4px}#akTop a.lg img{width:32px;height:32px;border-radius:8px}#akTop a.lg b{font:800 15px/1 Inter,system-ui,sans-serif;letter-spacing:.5px;color:#0B2F70}' +
    '/* رؤوس الصفحات القديمة تُخفى لأن الشريط العلوي حلّ محلّها */nav.nav,.nav-toggle,#navToggle,#akNavBtns,#mmenu{display:none!important}' +
    (isOwner && path === 'account.html' ? '#nav,#pendBox{display:none!important}' : '') +
    '#akTabs{width:100%!important;max-width:none!important;margin:0!important;grid-template-columns:none!important;transform:none!important}' +
    '#arkChatFab{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}' +
    '@media print{#akTabs,#akMore,#akTop{display:none!important}}';
  document.head.appendChild(css);

  var bar = document.createElement('div'); bar.id = 'akTabs'; bar.setAttribute('role', 'navigation'); bar.setAttribute('aria-label', 'التنقل');
  bar.innerHTML = tabs.map(function (t) { return '<a href="' + t.href + '" class="' + (active(t.href) ? 'on' : '') + '">' + svg(t.icon) + '<span>' + t.label + '</span></a>'; }).join('');
  /* شريط علوي خفيف على نمط PayPal: ☰ يسارًا (يفتح «المزيد»)، جرس + حساب يمينًا — لا يزاحم رأس الصفحة */
  var top = document.createElement('div'); top.id = 'akTop';
  top.innerHTML = '<a href="index.html" class="lg" aria-label="BDL"><img src="favicon.svg?v=bdl7" alt="BDL"><b>BDL</b></a><span></span>' +
    '<a href="chat-v2.html" aria-label="الرسائل">' + svg('bell', 20) + '</a><a href="account.html" aria-label="الحساب">' + svg('user', 20) + '</a><a href="#" id="akMoreBtn" aria-label="القائمة">' + svg('menu', 20) + '</a>';
  var sheet = document.createElement('div'); sheet.id = 'akMore';
  sheet.innerHTML = '<div class="sh"><div class="hb"></div><h4><span>المزيد</span><a href="#" id="akClose" aria-label="إغلاق">' + svg('close', 18) + '</a></h4><div class="lbl">الصفحات</div><div class="g">' +
    more.filter(function (m) { return m.href !== path; }).map(function (m) { return '<a href="' + m.href + '"><i>' + svg(m.icon, 20) + '</i>' + m.label + '</a>'; }).join('') +
    '</div><div class="lbl" id="akLangLbl" style="display:none">اللغة</div><div id="akLang" style="display:none"></div><button class="lo" id="akLogout">تسجيل الخروج</button></div>';
  function mount() { document.body.appendChild(bar); document.body.appendChild(sheet); document.body.appendChild(top);
    bar.querySelectorAll('a').forEach(fastNav);

    var open = function () { sheet.classList.add('on'); document.body.classList.add('ak-more-open'); }, close = function () { sheet.classList.remove('on'); document.body.classList.remove('ak-more-open'); };
    document.getElementById('akMoreBtn').onclick = function (e) { e.preventDefault(); open(); };
    document.getElementById('akClose').onclick = function (e) { e.preventDefault(); close(); };
    sheet.onclick = function (e) { if (e.target === sheet) close(); };
    document.getElementById('akLogout').onclick = function () {
      ['arkan_session', 'arkan_sb_jwt', 'arkanClient', 'arkan_admin_dev', 'arkan_owner_auth'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      location.href = 'account.html';
    };
    /* في صفحة الحساب: أيقونة المستخدم تفتح قسم «حسابي» داخل الصفحة، والجرس يفتح إشعارات الصفحة */
    if (path === 'account.html') { var ua = top.querySelector('a[href="account.html"]'); var acct = document.querySelector('.nav-it[data-s="s-acct"]'); if (ua && acct) ua.onclick = function (e) { e.preventDefault(); acct.click(); }; var bl = document.getElementById('bell'); var ub = top.querySelector('a[href="chat-v2.html"]'); if (bl && ub) ub.onclick = function (e) { e.preventDefault(); bl.click(); }; }
    /* مبدّل اللغة (إن وُجد في الصفحة) ينتقل إلى الورقة بدل الرأس */
    var seg = document.getElementById('langSeg'); if (seg) { var box = document.getElementById('akLang'); box.appendChild(seg); box.style.display = 'flex'; document.getElementById('akLangLbl').style.display = 'block'; seg.removeAttribute('style'); seg.querySelectorAll('button').forEach(function (b) { b.removeAttribute('style'); }); }
    /* توافق مع الأزرار القديمة التي تستدعي قائمة الهامبرغر */
    window.akOpenMenu = open;
  }
  /* سرعة: جلب مسبق لصفحات التبويبات عند الخمول، وبدء الانتقال عند لمس التبويب (قبل رفع الإصبع) */
  function prefetchAll() { try { tabs.concat(more).map(function (t) { return t.href.split('#')[0]; }).filter(function (h, i, a) { return a.indexOf(h) === i && h !== path; }).forEach(function (h) { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = h; l.as = 'document'; document.head.appendChild(l); }); } catch (e) {} }
  if ('requestIdleCallback' in window) requestIdleCallback(prefetchAll, { timeout: 3000 }); else setTimeout(prefetchAll, 1500);
  function fastNav(a) { a.addEventListener('touchstart', function () { if (a.getAttribute('href') && a.getAttribute('href').indexOf('#') !== 0 && !a.classList.contains('on')) { a.__go = setTimeout(function () { location.href = a.href; }, 60); } }, { passive: true }); a.addEventListener('touchmove', function () { clearTimeout(a.__go); }, { passive: true }); a.addEventListener('touchcancel', function () { clearTimeout(a.__go); }, { passive: true }); }
  /* ضمان لوحة المفاتيح على iOS: أي لمسة على حقل تُركّزه داخل إيماءة المستخدم (لا يعتمد على النقر المُصنَّع) */
  document.addEventListener('touchend', function (e) { var t = e.target && e.target.closest ? e.target.closest('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]),textarea,select,[contenteditable="true"]') : null; if (!t || t.disabled || t.readOnly) return; if (document.activeElement !== t) { try { t.focus({ preventScroll: true }); } catch (err) { try { t.focus(); } catch (e2) {} } } }, { passive: true, capture: true });
  /* عند وصول إصدار جديد للموقع: الصفحة تُعاد مرة واحدة تلقائيًا حتى لا يعمل المستخدم على نسخة قديمة */
  if ('serviceWorker' in navigator) { var hadCtrl = !!navigator.serviceWorker.controller; navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadCtrl && !window.__akReloaded) { window.__akReloaded = true; location.reload(); } }); navigator.serviceWorker.getRegistration && navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update().catch(function () {}); }).catch(function () {}); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
