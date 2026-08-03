/* ═══════════════════════════════════════════════════════════
   ARKAN SENSE — الإحساس المؤسسي
   1) قفل بصمة الوجه (Face ID / Touch ID) — اختياري تمامًا
   2) رنات وهزّات احترافية على الأزرار (بأسلوب Exodus)
   يعمل بلا أي تبعيات، ولا يعطّل الصفحة إن لم يُدعم شيء.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.ARKAN_SENSE) return;

  /* ══════════════ 1) محرك الصوت — نغمات مركّبة قصيرة ══════════════ */
  var AC = null, muted = localStorage.getItem('arkan_sound') === 'off';
  function ctx() {
    if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); }
    if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  /* نغمة واحدة: تردد، مدة، نوع، حجم، انزلاق */
  function tone(f, dur, type, vol, slideTo, delay) {
    var c = ctx(); if (!c || muted) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    /* غلاف ناعم يمنع الطقطقة */
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.06, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  /* ── محرك اهتزاز حسّي: يعمل على أندرويد (Vibration API) وعلى iPhone (حيلة switch في Safari 17.4+) ── */
  var _iosSwitch = null, _iosLabel = null, _iosReady = false;
  function _initIOS() {
    if (_iosReady) return;
    _iosReady = true;
    try {
      var inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.setAttribute('switch', '');          /* عنصر WebKit الأصلي */
      inp.id = 'ark-haptic-sw';
      inp.style.cssText = 'position:fixed;top:-100px;left:-100px;width:1px;height:1px;opacity:0;pointer-events:none';
      var lab = document.createElement('label');
      lab.setAttribute('for', 'ark-haptic-sw');
      lab.style.cssText = 'position:fixed;top:-100px;left:-100px;width:1px;height:1px;opacity:0;pointer-events:none';
      (document.body || document.documentElement).appendChild(inp);
      (document.body || document.documentElement).appendChild(lab);
      _iosSwitch = inp; _iosLabel = lab;
    } catch (e) {}
  }
  function _iosTick() {
    if (!_iosLabel) _initIOS();
    if (_iosLabel) { try { _iosLabel.click(); return true; } catch (e) {} }
    return false;
  }
  function buzz(p) {
    /* أندرويد وما يدعم Vibration API */
    if (navigator.vibrate) { try { if (navigator.vibrate(p)) return; } catch (e) {} }
    /* iPhone: نبضة عبر حيلة الـswitch (نبضة واحدة لكل نمط) */
    var n = Array.isArray(p) ? Math.min(3, Math.ceil(p.length / 2)) : 1;
    for (var i = 0; i < n; i++) setTimeout(_iosTick, i * 70);
  }

  /* أزرار: اهتزاز حسّي لطيف فقط — بلا صوت (نمط Exodus) */
  var SFX = {
    tap:     function () { buzz(8); },
    primary: function () { buzz(12); },
    success: function () { buzz([10, 35, 14]); },   /* نبضة نجاح ناعمة */
    error:   function () { buzz([26, 50, 26]); },   /* اهتزاز رفض */
    toggle:  function () { buzz(6); },
    unlock:  function () { buzz([10, 28, 12]); },
    swipe:   function () { buzz(6); }
  };

  /* ══════════════ 2) ربط تلقائي بالأزرار ══════════════ */
  function classify(el) {
    if (el.dataset && el.dataset.sfx) return el.dataset.sfx;
    var c = (el.className || '') + ' ' + (el.id || '');
    if (/btn-d|danger|حذف|del/i.test(c)) return 'error';
    if (/go\b|btn-p|btn-gold|btn-primary|okWa|send|submit|primary/i.test(c)) return 'primary';
    if (/chip|vt|tab|nv\b|lang|topTab/i.test(c)) return 'toggle';
    return 'tap';
  }
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest('button, .btn, a.btn, .chip, .vt, .nv, .topTab, .cur, .curbtn, [data-sfx]');
    if (!el || el.disabled) return;
    var k = classify(el);
    (SFX[k] || SFX.tap)();
  }, { passive: true, capture: true });

  /* ══════════════ 3) قفل بصمة الوجه — WebAuthn ══════════════ */
  var LS_ON = 'arkan_bio_on', LS_ID = 'arkan_bio_id';
  var b64u = function (buf) {
    var b = ''; new Uint8Array(buf).forEach(function (x) { b += String.fromCharCode(x); });
    return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  var fromB64u = function (s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(s), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr.buffer;
  };
  async function bioAvailable() {
    if (!window.PublicKeyCredential || !navigator.credentials) return false;
    try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
    catch (e) { return false; }
  }
  async function bioEnroll() {
    if (!await bioAvailable()) throw new Error('غير مدعوم على هذا الجهاز');
    var ch = crypto.getRandomValues(new Uint8Array(32));
    var uid = crypto.getRandomValues(new Uint8Array(16));
    var cred = await navigator.credentials.create({
      publicKey: {
        challenge: ch,
        rp: { name: 'ARKAN Rates', id: location.hostname },
        user: { id: uid, name: 'arkan-user', displayName: 'ARKAN' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000, attestation: 'none'
      }
    });
    if (!cred) throw new Error('أُلغيت');
    localStorage.setItem(LS_ID, b64u(cred.rawId));
    localStorage.setItem(LS_ON, '1');
    SFX.success();
    return true;
  }
  async function bioVerify() {
    var id = localStorage.getItem(LS_ID);
    if (!id) throw new Error('لا توجد بصمة مسجّلة');
    var ch = crypto.getRandomValues(new Uint8Array(32));
    var res = await navigator.credentials.get({
      publicKey: {
        challenge: ch, timeout: 60000, userVerification: 'required',
        allowCredentials: [{ type: 'public-key', id: fromB64u(id), transports: ['internal'] }],
        rpId: location.hostname
      }
    });
    if (!res) throw new Error('فشل التحقق');
    return true;
  }
  function bioOn() { return localStorage.getItem(LS_ON) === '1' && !!localStorage.getItem(LS_ID); }
  function bioOff() { localStorage.removeItem(LS_ON); localStorage.removeItem(LS_ID); }

  /* ══════════════ 4) شاشة القفل ══════════════ */
  var CSS = '' +
    '#akLock{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;' +
    'background:radial-gradient(900px 500px at 80% -10%,rgba(0,88,217,.5),transparent 60%),' +
    'radial-gradient(700px 500px at -10% 110%,rgba(0,181,255,.22),transparent 55%),' +
    'linear-gradient(180deg,#071D49 0%,#062165 58%,#003B8F 100%);' +
    'font-family:"IBM Plex Sans Arabic",system-ui,sans-serif}' +
    '#akLock.on{display:flex;animation:akFade .35s ease-out}' +
    '@keyframes akFade{from{opacity:0}to{opacity:1}}' +
    '#akLock .bx{text-align:center;padding:28px;max-width:340px}' +
    '#akLock .fid{width:118px;height:118px;margin:0 auto 26px;border-radius:32px;display:grid;place-items:center;' +
    'background:rgba(255,255,255,.07);border:1.5px solid rgba(0,181,255,.45);' +
    'box-shadow:0 24px 60px rgba(0,10,40,.5);animation:akPulse 2.6s ease-in-out infinite}' +
    '@keyframes akPulse{0%,100%{transform:scale(1);box-shadow:0 24px 60px rgba(0,10,40,.5)}' +
    '50%{transform:scale(1.04);box-shadow:0 28px 70px rgba(0,153,255,.4)}}' +
    '#akLock .fid svg{width:62px;height:62px;color:#4FB2F8}' +
    '#akLock h3{color:#fff;font-size:19px;font-weight:800;margin-bottom:8px}' +
    '#akLock p{color:rgba(234,245,255,.72);font-size:13px;line-height:1.9;margin-bottom:24px}' +
    '#akLock button{width:100%;border:0;cursor:pointer;border-radius:999px;padding:15px;font:800 15px inherit;margin-bottom:10px;transition:filter .2s,transform .15s}' +
    '#akLock button:active{transform:scale(.97)}' +
    '#akLock .go{background:linear-gradient(135deg,#0D47B5 0%,#2F8FE8 55%,#4FB2F8 100%);color:#fff;box-shadow:0 14px 32px rgba(13,71,181,.45)}' +
    '#akLock .skip{background:transparent;color:rgba(191,227,255,.75);font-weight:600;font-size:13.5px}' +
    '.akBioRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 15px;' +
    'background:#F6FAFF;border:1px solid #D8E8F8;border-radius:16px;margin:10px 0}' +
    '.akBioRow b{font-size:13.5px;color:#071E4F}.akBioRow small{display:block;font-size:11px;color:#7A93AD;margin-top:2px}' +
    '.akSw{width:52px;height:30px;border-radius:999px;background:#D5E5F8;position:relative;cursor:pointer;transition:.25s;flex:none;border:0}' +
    '.akSw::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:.25s;box-shadow:0 2px 6px rgba(0,0,0,.2)}' +
    '.akSw.on{background:linear-gradient(135deg,#0D47B5,#4FB2F8)}.akSw.on::after{left:25px}';

  var FACE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">' +
    '<path d="M4 8V6a2 2 0 012-2h2M20 8V6a2 2 0 00-2-2h-2M4 16v2a2 2 0 002 2h2M20 16v2a2 2 0 01-2 2h-2"/>' +
    '<path d="M9 10v1.5M15 10v1.5M12 10v3.5h-1"/><path d="M9.5 16c.8.7 1.6 1 2.5 1s1.7-.3 2.5-1"/></svg>';

  function injectCSS() {
    if (document.getElementById('akSenseCSS')) return;
    var st = document.createElement('style'); st.id = 'akSenseCSS'; st.textContent = CSS;
    document.head.appendChild(st);
  }
  function buildLock() {
    injectCSS();
    if (document.getElementById('akLock')) return document.getElementById('akLock');
    var d = document.createElement('div'); d.id = 'akLock';
    d.innerHTML = '<div class="bx"><div class="fid">' + FACE_SVG + '</div>' +
      '<h3>ARKAN مقفل</h3><p>افتح بـ Face ID للمتابعة</p>' +
      '<button class="go" id="akUnlock">فتح بـ Face ID</button>' +
      '<button class="skip" id="akSkip">تخطٍّ هذه المرة</button></div>';
    document.body.appendChild(d);
    return d;
  }
  async function runLock() {
    var d = buildLock();
    d.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    function close(ok) {
      d.classList.remove('on');
      document.documentElement.style.overflow = '';
      if (ok){ SFX.unlock(); sessionStorage.setItem('arkan_welcomed','1'); }
      sessionStorage.setItem('arkan_unlocked', '1');
    }
    async function attempt() {
      try { await bioVerify(); close(true); }
      catch (e) { SFX.error(); }
    }
    d.querySelector('#akUnlock').onclick = attempt;
    d.querySelector('#akSkip').onclick = function () { close(false); };
    setTimeout(attempt, 400); /* محاولة تلقائية فور الفتح */
  }

  /* ══════════════ 5) صف الإعداد (يُدرج حيث يوجد #akBioSlot) ══════════════ */
  async function mountToggle() {
    var slot = document.getElementById('akBioSlot');
    if (!slot) return;
    if (!await bioAvailable()) { slot.innerHTML = ''; return; }
    injectCSS();
    slot.innerHTML = '<div class="akBioRow"><div><b>🔐 قفل Face ID</b>' +
      '<small>حماية إضافية عند فتح التطبيق — اختياري</small></div>' +
      '<button class="akSw' + (bioOn() ? ' on' : '') + '" id="akBioSw" aria-label="تبديل"></button></div>';
    slot.querySelector('#akBioSw').onclick = async function () {
      var sw = this;
      if (bioOn()) { bioOff(); sw.classList.remove('on'); SFX.toggle(); }
      else {
        try { await bioEnroll(); sw.classList.add('on'); }
        catch (e) { SFX.error(); alert('تعذّر التفعيل: ' + (e.message || '')); }
      }
    };
  }

  /* ══════════════ 6) الإقلاع ══════════════ */
  /* نغمة افتتاح راقية (وتر صاعد ناعم) — مرة لكل جلسة */
  function welcome() {
    if (sessionStorage.getItem('arkan_welcomed')) return;
    var c = ctx(); if (!c || muted) return;
    if (c.state === 'suspended') return; /* ينتظر أول لمسة */
    sessionStorage.setItem('arkan_welcomed', '1');
    tone(392.00, 0.30, 'sine', 0.035);
    tone(587.33, 0.34, 'sine', 0.035, null, 0.10);
    tone(783.99, 0.42, 'sine', 0.032, null, 0.20);
    tone(1174.7, 0.55, 'sine', 0.022, null, 0.30);
    buzz([8, 30, 10]);
  }
  function armWelcome() {
    welcome(); /* يعمل مباشرة في PWA أحيانًا */
    var deadline = Date.now() + 20000;
    function onFirst() {
      if (Date.now() < deadline) setTimeout(welcome, 60);
      document.removeEventListener('pointerdown', onFirst, true);
    }
    if (!sessionStorage.getItem('arkan_welcomed'))
      document.addEventListener('pointerdown', onFirst, { capture: true, once: true });
  }
  function boot() {
    injectCSS();
    _initIOS();
    mountToggle();
    armWelcome();
    /* القفل يعمل فقط إن فعّله المستخدم، ومرة واحدة لكل جلسة */
    if (bioOn() && sessionStorage.getItem('arkan_unlocked') !== '1') runLock();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ══════════════ الواجهة العامة ══════════════ */
  window.ARKAN_SENSE = {
    sfx: SFX,
    play: function (k) { (SFX[k] || SFX.tap)(); },
    mute: function (v) { muted = !!v; localStorage.setItem('arkan_sound', v ? 'off' : 'on'); },
    isMuted: function () { return muted; },
    bio: { available: bioAvailable, enroll: bioEnroll, verify: bioVerify, enabled: bioOn, disable: bioOff },
    lock: runLock,
    mountToggle: mountToggle
  };
})();
