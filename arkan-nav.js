/* ============================================================
   ARKAN Pay — شريط التنقل العلوي الموحّد
   يُستدعى في كل صفحة: <script src="arkan-nav.js" defer></script>
   يضيف: زر رجوع + قائمة ثلاث خطوط + تنقل بين الصفحات
   ============================================================ */
(function () {
  'use strict';

  // لا تُظهر الشريط في صفحات معيّنة (login, splash)
  var HIDE_ON = ['login.html', 'offline.html'];
  var path = location.pathname.split('/').pop() || 'index.html';
  if (HIDE_ON.indexOf(path) !== -1) return;

  // هل المستخدم مالك؟ (لعرض روابط إضافية)
  var isOwner = false;
  try {
    isOwner = localStorage.getItem('arkan_owner_auth') ||
              (JSON.parse(localStorage.getItem('firebase:authUser:' +
               (Object.keys(localStorage).find(function(k){return k.indexOf('firebase:authUser:')===0;})||'').split('firebase:authUser:')[1] || 'null')) || {});
  } catch (e) {}
  isOwner = !!localStorage.getItem('arkan_owner_auth');

  // روابط القائمة — الأساسية للجميع
  var LINKS = [
    { href: 'index.html',      icon: 'home',     label: 'الرئيسية' },
    { href: 'request.html',    icon: 'send',     label: 'طلب تحويل' },
    { href: 'rates.html',      icon: 'trending', label: 'الأسعار' },
    { href: 'chat.html',       icon: 'message',  label: 'المحادثة' },
    { href: 'account.html',    icon: 'user',     label: 'حسابي' }
  ];
  // روابط المالك فقط
  var OWNER_LINKS = [
    { href: 'settlement.html', icon: 'layers',   label: 'التسويات' },
    { href: 'archive.html',    icon: 'archive',  label: 'الأرشيف' },
    { href: 'admin.html',      icon: 'shield',   label: 'لوحة التحكم' }
  ];

  var ICONS = {
    home:'M3 12l9-9 9 9M5 10v10h14V10',
    send:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    trending:'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
    message:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    user:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    layers:'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    archive:'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
    shield:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    back:'M19 12H5M12 19l-7-7 7-7',
    menu:'M3 12h18M3 6h18M3 18h18',
    close:'M18 6L6 18M6 6l12 12'
  };

  function svg(name, size) {
    size = size || 22;
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="'+(ICONS[name]||'')+'"/></svg>';
  }

  // ── حقن الأنماط ──
  var css = document.createElement('style');
  css.textContent =
    '#akTopbar{position:sticky;top:0;z-index:9000;display:flex;align-items:center;justify-content:space-between;' +
      'height:56px;padding:0 12px;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);' +
      '-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(11,47,112,.08);' +
      'font-family:Inter,-apple-system,sans-serif;direction:rtl}' +
    '#akTopbar .akbtn{width:42px;height:42px;border:none;background:transparent;color:#0B2F70;' +
      'display:grid;place-items:center;border-radius:12px;cursor:pointer;transition:background .2s}' +
    '#akTopbar .akbtn:active{background:rgba(25,169,245,.12)}' +
    '#akTopbar .aktitle{font-size:16px;font-weight:700;color:#0B2F70;display:flex;align-items:center;gap:8px}' +
    '#akTopbar .aktitle img{width:28px;height:28px;border-radius:9px}' +
    '#akDrawer{position:fixed;inset:0;z-index:9500;display:none}' +
    '#akDrawer.on{display:block}' +
    '#akDrawer .akov{position:absolute;inset:0;background:rgba(11,47,112,.4);backdrop-filter:blur(4px);' +
      'animation:akfade .25s ease}' +
    '#akDrawer .akpanel{position:absolute;top:0;right:0;bottom:0;width:280px;max-width:82vw;background:#fff;' +
      'box-shadow:-8px 0 40px rgba(11,47,112,.2);display:flex;flex-direction:column;' +
      'animation:akslide .28s cubic-bezier(.4,0,.2,1);direction:rtl}' +
    '#akDrawer .akhead{display:flex;align-items:center;gap:12px;padding:22px 20px 18px;' +
      'background:linear-gradient(135deg,#0A56B8,#19A9F5);color:#fff}' +
    '#akDrawer .akhead img{width:44px;height:44px;border-radius:13px;box-shadow:0 6px 18px rgba(0,0,0,.2)}' +
    '#akDrawer .akhead b{font-size:17px;display:block}' +
    '#akDrawer .akhead small{font-size:12px;opacity:.85}' +
    '#akDrawer .aklinks{flex:1;overflow-y:auto;padding:10px 0}' +
    '#akDrawer a{display:flex;align-items:center;gap:14px;padding:14px 22px;color:#0B2F70;' +
      'text-decoration:none;font-size:15px;font-weight:500;transition:background .18s}' +
    '#akDrawer a:active{background:rgba(25,169,245,.1)}' +
    '#akDrawer a.active{background:rgba(25,169,245,.12);color:#0A56B8;font-weight:700}' +
    '#akDrawer a svg{color:#4A6491}' +
    '#akDrawer a.active svg{color:#19A9F5}' +
    '#akDrawer .aksep{height:1px;background:rgba(11,47,112,.08);margin:8px 20px}' +
    '#akDrawer .akownerlbl{font-size:11px;font-weight:700;color:#8AA3C7;padding:6px 22px 4px}' +
    '@keyframes akfade{from{opacity:0}to{opacity:1}}' +
    '@keyframes akslide{from{transform:translateX(100%)}to{transform:none}}';
  document.head.appendChild(css);

  // ── عنوان الصفحة ──
  var titles = {
    'index.html':'ARKAN Pay','app.html':'ARKAN Pay','home-v2.html':'ARKAN Pay',
    'request.html':'طلب تحويل','rates.html':'الأسعار','chat.html':'المحادثة',
    'account.html':'حسابي','settlement.html':'التسويات','archive.html':'الأرشيف',
    'admin.html':'لوحة التحكم','wallet.html':'المحفظة','invoice.html':'الفواتير'
  };
  var pageTitle = titles[path] || 'ARKAN Pay';

  // ── بناء الشريط ──
  var bar = document.createElement('div');
  bar.id = 'akTopbar';
  bar.innerHTML =
    '<button class="akbtn" id="akBack" aria-label="رجوع">' + svg('back') + '</button>' +
    '<div class="aktitle"><img src="arkan-icon-192.png" alt="">' + pageTitle + '</div>' +
    '<button class="akbtn" id="akMenu" aria-label="القائمة">' + svg('menu') + '</button>';

  // ضعه في أعلى body
  if (document.body.firstChild) document.body.insertBefore(bar, document.body.firstChild);
  else document.body.appendChild(bar);

  // ── زر الرجوع ──
  document.getElementById('akBack').onclick = function () {
    if (history.length > 1) history.back();
    else location.href = 'index.html';
  };

  // ── القائمة الجانبية ──
  var drawer = document.createElement('div');
  drawer.id = 'akDrawer';
  var linksHTML = LINKS.map(function (l) {
    var active = l.href === path ? ' class="active"' : '';
    return '<a href="'+l.href+'"'+active+'>'+svg(l.icon,20)+'<span>'+l.label+'</span></a>';
  }).join('');
  var ownerHTML = '';
  if (isOwner) {
    ownerHTML = '<div class="aksep"></div><div class="akownerlbl">أدوات المالك</div>' +
      OWNER_LINKS.map(function (l) {
        var active = l.href === path ? ' class="active"' : '';
        return '<a href="'+l.href+'"'+active+'>'+svg(l.icon,20)+'<span>'+l.label+'</span></a>';
      }).join('');
  }
  drawer.innerHTML =
    '<div class="akov" id="akOv"></div>' +
    '<div class="akpanel">' +
      '<div class="akhead"><img src="arkan-icon-192.png" alt="">' +
        '<div><b>ARKAN Pay</b><small>' + (isOwner ? 'وضع المالك' : 'الصرف والتسويات') + '</small></div>' +
      '</div>' +
      '<div class="aklinks">' + linksHTML + ownerHTML + '</div>' +
    '</div>';
  document.body.appendChild(drawer);

  var menuBtn = document.getElementById('akMenu');
  var ov = document.getElementById('akOv');
  menuBtn.onclick = function () { drawer.classList.add('on'); };
  ov.onclick = function () { drawer.classList.remove('on'); };
})();
