/*! ARKAN — Motion & Scroll Stabilizer  v1.0
   يثبّت الصفحة أثناء التصفح: يوقف حلقات الرسم أثناء التمرير،
   ينقل خلفية body إلى html (بدل background-attachment:fixed المكلف على iOS)،
   يخفّف الحركة تلقائيًا على الجوال، ويلغي قفزات ظهور العناصر. */
(function () {
  'use strict';
  var D = document, H = D.documentElement;

  /* ---------- 1) تحديد وضع الحركة ---------- */
  var mqSmall = window.matchMedia ? matchMedia('(max-width:820px)') : { matches: false };
  var mqReduce = window.matchMedia ? matchMedia('(prefers-reduced-motion:reduce)') : { matches: false };
  var pref = null;
  try { pref = localStorage.getItem('arkan_motion'); } catch (e) {}
  var q = (location.search.match(/[?&]motion=(on|off)/) || [])[1];
  if (q) { pref = q; try { localStorage.setItem('arkan_motion', q); } catch (e) {} }
  var LOW = pref === 'off' || (pref !== 'on' && (mqReduce.matches || mqSmall.matches));
  if (LOW) H.classList.add('arkan-low');

  /* ---------- 2) طبقة CSS التثبيت ---------- */
  var css =
  'html,body{overscroll-behavior:none;-webkit-tap-highlight-color:transparent}' +
  'body{background-attachment:scroll!important}' +
  'canvas{-webkit-transform:translateZ(0);transform:translateZ(0)}' +
  /* تجميد كل الطبقات المتحركة أثناء التمرير */
  'html.arkan-scroll .orb,html.arkan-scroll .grid-bg,html.arkan-scroll .scanline,' +
  'html.arkan-scroll .bg-glow,html.arkan-scroll .ttrack,html.arkan-scroll .dot,' +
  'html.arkan-scroll .spinner,html.arkan-scroll [class*="pulse"]{animation-play-state:paused!important}' +
  'html.arkan-scroll{scroll-behavior:auto!important}' +
  /* الوضع المخفّف */
  'html.arkan-low{scroll-behavior:auto!important}' +
  'html.arkan-low .orb{animation:none!important;filter:blur(55px)!important;opacity:.5!important}' +
  'html.arkan-low .grid-bg,html.arkan-low .scanline{animation:none!important;opacity:.35!important}' +
  'html.arkan-low #particles,html.arkan-low #bgfx{opacity:.4!important}' +
  'html.arkan-low .ttrack{animation-duration:140s!important}' +
  'html.arkan-low .reveal{opacity:1!important;transform:none!important;transition:none!important}' +
  'html.arkan-low *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' +
  'html.arkan-low .overlay,html.arkan-low #arkanPay{background:rgba(2,4,9,.94)!important}' +
  /* زر التحكم */
  '#arkanMotion{position:fixed;left:12px;bottom:12px;z-index:9998;font:600 10.5px/1 Inter,system-ui,sans-serif;' +
  'padding:7px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(10,14,24,.72);' +
  'color:rgba(255,255,255,.62);opacity:.38;cursor:pointer;transition:opacity .2s;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
  '#arkanMotion:hover,#arkanMotion:active{opacity:1;color:#fff}';
  var st = D.createElement('style'); st.textContent = css;
  (D.head || H).appendChild(st);

  /* ---------- 3) نقل خلفية body إلى html (يلغي إعادة الرسم عند كل إطار تمرير) ---------- */
  function liftBackground() {
    try {
      var b = getComputedStyle(D.body);
      var img = b.backgroundImage, col = b.backgroundColor;
      if (img && img !== 'none') {
        H.style.backgroundImage = img;
        H.style.backgroundSize = b.backgroundSize;
        H.style.backgroundRepeat = 'no-repeat';
      }
      if (col && col !== 'rgba(0, 0, 0, 0)') H.style.backgroundColor = col;
      H.style.minHeight = '100%';
      D.body.style.backgroundImage = 'none';
      D.body.style.backgroundColor = 'transparent';
    } catch (e) {}
  }

  /* ---------- 4) بوابة requestAnimationFrame ---------- */
  var realRaf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : null;
  if (realRaf) {
    var queue = [], scrolling = false, timer = null, last = 0;
    var MINMS = LOW ? 30 : 0;               /* 30fps في الوضع المخفّف */

    function gate(cb) {
      return function (ts) {
        if (MINMS && ts - last < MINMS) { realRaf(gate(cb)); return; }
        last = ts; cb(ts);
      };
    }
    window.requestAnimationFrame = function (cb) {
      if (scrolling) {                       /* أثناء التمرير: تأجيل بلا تكرار */
        if (queue.indexOf(cb) < 0) queue.push(cb);
        return 0;
      }
      return realRaf(gate(cb));
    };
    function flush() {
      var qq = queue; queue = [];
      for (var i = 0; i < qq.length; i++) realRaf(gate(qq[i]));
    }
    function onScroll() {
      if (!scrolling) { scrolling = true; H.classList.add('arkan-scroll'); }
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        scrolling = false; H.classList.remove('arkan-scroll'); flush();
      }, 160);
    }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('touchmove', onScroll, { passive: true });
    /* إيقاف كامل عند إخفاء التبويب */
    D.addEventListener('visibilitychange', function () {
      if (!D.hidden && !scrolling) flush();
    });
  }

  /* ---------- 5) زر التحكم ---------- */
  function buildToggle() {
    if (D.getElementById('arkanMotion')) return;
    var el = D.createElement('div');
    el.id = 'arkanMotion';
    el.textContent = LOW ? 'الحركة: مخفّفة' : 'الحركة: كاملة';
    el.title = 'تبديل حركة الخلفية';
    el.onclick = function () {
      var next = LOW ? 'on' : 'off';
      try { localStorage.setItem('arkan_motion', next); } catch (e) {}
      location.reload();
    };
    D.body.appendChild(el);
  }

  function init() { liftBackground(); buildToggle(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();
})();
