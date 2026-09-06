/* ============================================================
   BDL — شريط التنقل العلوي الموحّد
   يُستدعى في كل صفحة: <script src="arkan-nav.js" defer></script>
   يضيف: زر رجوع + قائمة ثلاث خطوط + تنقل بين الصفحات
   ============================================================ */
(function () {
  'use strict';

  // لا تُظهر الشريط في صفحات معيّنة (login, splash)
  var HIDE_ON = ['account.html', 'login.html', 'offline.html', 'index.html', 'app.html', 'home-v2.html', ''];
  var path = location.pathname.split('/').pop() || 'index.html';
  if (HIDE_ON.indexOf(path) !== -1) return;

  // هل المستخدم مالك؟ (لعرض روابط إضافية)
  var isOwner = false;
  try {
    isOwner = localStorage.getItem('arkan_owner_auth') ||
              (JSON.parse(localStorage.getItem('firebase:authUser:' +
               (Object.keys(localStorage).find(function(k){return k.indexOf('firebase:authUser:')===0;})||'').split('firebase:authUser:')[1] || 'null')) || {});
  } catch (e) {}
  isOwner = !!localStorage.getItem('arkan_owner_auth') || !!localStorage.getItem('arkan_admin_dev');
  try { var ses = JSON.parse(localStorage.getItem('arkan_session') || 'null');
        if (ses && /36295050$/.test(String(ses.phone || '').replace(/\D/g, ''))) isOwner = true; } catch (e) {}
  if (path === 'settle-v2.html' || path === 'settlement.html' || path === 'compare.html' || path === 'admin.html' || path === 'rates-admin.html') isOwner = true; /* صفحات مالك مغلقة أصلًا بالبوابة */

  // روابط القائمة — الأساسية للجميع
  var LINKS = [
    { href: 'index.html',      icon: 'home',     label: 'الرئيسية' },
    { href: 'request.html',    icon: 'send',     label: 'طلب تحويل' },
    { href: 'rates.html',      icon: 'trending', label: 'الأسعار' },
    { href: 'chat-v2.html',       icon: 'message',  label: 'المحادثة' },
    { href: 'account.html',    icon: 'user',     label: 'حسابي' }
  ];
  // روابط المالك فقط
  var OWNER_LINKS = [
    { href: 'settle-v2.html',         icon: 'layers',   label: 'الكونسول' },
    { href: 'settle-v2.html#settle',  icon: 'check',    label: 'التسوية' },
    { href: 'settle-v2.html#ops',     icon: 'list',     label: 'العمليات' },
    { href: 'settle-v2.html#clients', icon: 'users',    label: 'العملاء' },
    { href: 'settle-v2.html#profit',  icon: 'trending', label: 'الأرباح' },
    { href: 'settle-v2.html#books',   icon: 'match',    label: 'مركز المطابقة' },
    { href: 'compare.html',           icon: 'match',    label: 'مقارنة الإيصالات — الدفتر' },
    { href: 'settle-v2.html#archive', icon: 'archive',  label: 'أرشيف العمليات' },
    { href: 'admin.html',             icon: 'shield',   label: 'لوحة التحكم' },
    { href: 'rates-admin.html',       icon: 'rate',     label: 'إدارة الأسعار' },
    { href: 'invoice.html',           icon: 'doc',      label: 'الفواتير' },
    { href: 'archive.html',           icon: 'folder',   label: 'الأرشيف العام' },
    { href: 'trading.html',           icon: 'chart',    label: 'التداول' },
    { href: 'wallet.html',            icon: 'wallet',   label: 'المحفظة' },
    { href: 'chat-v2.html',           icon: 'message',  label: 'المحادثة' },
    { href: 'settlement.html',        icon: 'clock',    label: 'الكونسول القديم' }
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
    logout:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    menu:'M3 12h18M3 6h18M3 18h18',
    check:'M20 6L9 17l-5-5',
    list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    users:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    match:'M4 4h6v6H4zM14 14h6v6h-6zM14 4h6v6h-6zM4 14h6v6H4z',
    rate:'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    doc:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
    folder:'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    chart:'M18 20V10M12 20V4M6 20v-6',
    wallet:'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v2M16 14h.01',
    clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    grid:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
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
    '#akNavBtns{position:fixed;top:calc(env(safe-area-inset-top, 0px) + 10px);left:12px;z-index:9000;pointer-events:none}' +
    '#akNavBtns .akbtn{width:44px;height:44px;border:1px solid rgba(11,47,112,.1);pointer-events:auto;' +
      'background:rgba(255,255,255,.85);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
      'color:#0B2F70;display:grid;place-items:center;border-radius:0;cursor:pointer;' +
      'box-shadow:0 4px 16px rgba(11,47,112,.1);transition:transform .18s}' +
    '#akNavBtns .akbtn:active{transform:scale(.92)}' +
    '#akDrawer{position:fixed;inset:0;z-index:9500;display:none}' +
    '#akDrawer.on{display:block}' +
    '#akDrawer .akov{position:absolute;inset:0;background:rgba(11,47,112,.4);backdrop-filter:blur(4px);animation:akfade .25s ease}' +
    '#akDrawer .akpanel{position:absolute;top:0;right:0;bottom:0;width:280px;max-width:82vw;background:#fff;box-shadow:-8px 0 40px rgba(11,47,112,.2);display:flex;flex-direction:column;animation:akslide .28s cubic-bezier(.4,0,.2,1);direction:rtl}' +
    '#akDrawer .akhead{display:flex;align-items:center;gap:12px;padding:22px 20px 18px;background:linear-gradient(135deg,#0A56B8,#19A9F5);color:#fff}' +
    '#akDrawer .akhead img{width:44px;height:44px;border-radius:0;box-shadow:0 6px 18px rgba(0,0,0,.2)}' +
    '#akDrawer .akgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px 14px 10px}' +
    '#akDrawer .akgrid a{flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:12px 6px;font-size:12px;font-weight:700;background:#F4F7FB;border:1px solid #DCE4EF;text-align:center;min-height:68px}' +
    '#akDrawer .akgrid a.active{background:#0B2F70;color:#fff;border-color:#0B2F70}#akDrawer .akgrid a.active svg{color:#7FD0FF}' +
    '#akDrawer .akpanel{width:300px}' +
    '#akDrawer .akhead b{font-size:17px;display:block}' +
    '#akDrawer .akhead small{font-size:12px;opacity:.85}' +
    '#akDrawer .aklinks{flex:1;overflow-y:auto;padding:10px 0}' +
    '#akDrawer a{display:flex;align-items:center;gap:14px;padding:14px 22px;color:#0B2F70;text-decoration:none;font-size:15px;font-weight:500;transition:background .18s}' +
    '#akDrawer a:active{background:rgba(25,169,245,.1)}' +
    '#akDrawer a.active{background:rgba(25,169,245,.12);color:#0A56B8;font-weight:700}' +
    '#akDrawer a svg{color:#4A6491}' +
    '#akDrawer a.active svg{color:#19A9F5}' +
    '#akDrawer .aksep{height:1px;background:rgba(11,47,112,.08);margin:8px 20px}' +
    '#akDrawer .akownerlbl{font-size:11px;font-weight:700;color:#8AA3C7;padding:6px 22px 4px}' +
    '@keyframes akfade{from{opacity:0}to{opacity:1}}' +
    '@keyframes akslide{from{transform:translateX(100%)}to{transform:none}}';
  document.head.appendChild(css);

  // ── الزران العائمان ──
  var bar = document.createElement('div');
  bar.id = 'akNavBtns';
  bar.innerHTML =
    '<button class="akbtn" id="akMenu" aria-label="القائمة">' + svg('menu') + '</button>';
  document.body.appendChild(bar);


  // ── القائمة الجانبية ──
  var drawer = document.createElement('div');
  drawer.id = 'akDrawer';
  var linksHTML = LINKS.map(function (l) {
    var active = l.href === path ? ' class="active"' : '';
    return '<a href="'+l.href+'"'+active+'>'+svg(l.icon,20)+'<span>'+l.label+'</span></a>';
  }).join('');
  var ownerHTML = '';
  if (isOwner) {
    var here = path + (location.hash || '');
    var hereBase = path;
    ownerHTML = '<div class="aksep"></div><div class="akownerlbl">أدوات المالك — كل الصفحات</div><div class="akgrid">' +
      OWNER_LINKS.map(function (l) {
        var lp = l.href.split('#')[0], lh = l.href.indexOf('#') > -1 ? l.href.slice(l.href.indexOf('#')) : '';
        var active = (lh ? (l.href === here) : (lp === hereBase && !location.hash && lp === path)) ? ' class="active"' : '';
        return '<a href="'+l.href+'"'+active+' data-page="'+lp+'" data-hash="'+lh+'">'+svg(l.icon,22)+'<span>'+l.label+'</span></a>';
      }).join('') + '</div>';
  }
  drawer.innerHTML =
    '<div class="akov" id="akOv"></div>' +
    '<div class="akpanel">' +
      '<div class="akhead"><img src="arkan-icon-192.png" alt="">' +
        '<div><b>BDL</b><small>' + (isOwner ? 'وضع المالك' : 'الصرف والتسويات') + '</small></div>' +
      '</div>' +
      '<div class="aklinks">' +
        '<a href="#" id="akGoBack" style="border-bottom:1px solid rgba(11,47,112,.06)">' + svg('back',20) + '<span>رجوع للخلف</span></a>' +
        linksHTML + ownerHTML +
        '<div class="aksep"></div>' +
        '<a href="account.html">' + svg('user',20) + '<span>دخول</span></a>' +
        '<a href="#" id="akLogout" style="color:#C62828">' + svg('logout',20) + '<span>خروج</span></a>' +
      '</div>' +
    '</div>';
  document.body.appendChild(drawer);

  var menuBtn = document.getElementById('akMenu');
  var ov = document.getElementById('akOv');
  menuBtn.onclick = function () { drawer.classList.add('on'); };
  window.akOpenMenu = function () { drawer.classList.add('on'); };
  /* روابط الكونسول داخل الكونسول نفسه: تبديل التبويب فورًا بلا إعادة تحميل */
  drawer.querySelectorAll('.akgrid a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (a.dataset.page === path && a.dataset.hash && typeof window.go === 'function') {
        e.preventDefault(); drawer.classList.remove('on');
        var t = a.dataset.hash.slice(1); history.replaceState(null, '', '#' + t); window.go(t);
        drawer.querySelectorAll('.akgrid a').forEach(function (x) { x.classList.toggle('active', x === a); });
      }
    });
  });
  if (isOwner) setTimeout(function () {
    OWNER_LINKS.map(function (l) { return l.href.split('#')[0]; }).filter(function (v, i, arr) { return arr.indexOf(v) === i && v !== path; })
      .forEach(function (h) { try { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = h; document.head.appendChild(l); } catch (e) {} });
  }, 1500);
  ov.onclick = function () { drawer.classList.remove('on'); };
  var goBack = document.getElementById('akGoBack');
  if (goBack) goBack.onclick = function (e) {
    e.preventDefault();
    drawer.classList.remove('on');
    if (history.length > 1) history.back();
    else location.href = 'index.html';
  };
  var lo = document.getElementById('akLogout');
  if (lo) lo.onclick = function (e) {
    e.preventDefault();
    ['arkan_session','arkan_sb_jwt','arkanClient','arkan_admin_dev','arkan_owner_auth']
      .forEach(function(k){ try{ localStorage.removeItem(k); }catch(_e){} });
    location.href = 'index.html';
  };
})();

/* ═══ BDL smooth nav: انتقال ناعم بين الصفحات + تسخين مسبق ═══ */
try{
  const st=document.createElement('style');
  st.textContent='@view-transition{navigation:auto}'
    +'::view-transition-old(root){animation:bdlvOut .14s ease both}'
    +'::view-transition-new(root){animation:bdlvIn .18s ease both}'
    +'@keyframes bdlvOut{to{opacity:0}}@keyframes bdlvIn{from{opacity:0}}';
  document.head.appendChild(st);
  addEventListener('load',()=>setTimeout(()=>{
    ['index.html','account.html','rates.html','request.html','chat-v2.html','app.html']
      .forEach(h=>{try{const l=document.createElement('link');l.rel='prefetch';l.href=h;document.head.appendChild(l);}catch(e){}});
  },1200));
}catch(e){}
