/* ═══════════════════════════════════════════════════════════
   ARKAN NAV — مشغّل التطبيقات الموحّد
   يربط كل صفحات الموقع في تطبيق واحد:
   • زر عائم في كل صفحة يفتح شبكة الخدمات
   • يملأ قسم #arkan-services في الصفحة الرئيسية تلقائياً
   يُحمّل في كل الصفحات: <script src="arkan-nav.js" defer></script>
   ═══════════════════════════════════════════════════════════ */
(function () {
  const APPS = [
    { n: 'الأسعار والتحويل', u: 'rates.html',      d: 'أسعار الصرف الحيّة والتحويل', i: 'rates'  },
    { n: 'طلب تحويل',        u: 'request.html',    d: 'دفع دولي عبر الحدود',        i: 'send'   },
    { n: 'أرشيف الإيصالات',  u: 'archive.html',    d: 'قراءة وأرشفة ذكية بالـOCR',  i: 'archive'},
    { n: 'مركز التسويات',    u: 'settlement.html', d: 'مطابقة العميل × المورّد',     i: 'settle' },
    { n: 'حسابي',            u: 'account.html',    d: 'رصيدك ومعاملاتك',            i: 'user'   },
    { n: 'التداول',          u: 'trading.html',    d: 'مؤشرات وأنظمة تداول',        i: 'chart'  },
    { n: 'مساعد أركان',      u: 'ai.html',         d: 'الذكاء الاصطناعي',           i: 'ai'     },
    { n: 'لوحة الإدارة',     u: 'admin.html',      d: 'إدارة الطلبات والمعاملات',    i: 'admin'  }
  ];
  const P = {
    rates:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/>',
    archive:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
    settle:'<path d="M9 12h6M8 7h-1a5 5 0 0 0 0 10h1m8-10h1a5 5 0 0 1 0 10h-1"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-6M22 20H2"/>',
    ai:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>',
    admin:'<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Z"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>'
  };
  const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P[k]||''}</svg>`;
  const here = (location.pathname.split('/').pop() || 'index.html');

  const card = a => `<a class="ark-app${a.u === here ? ' on' : ''}" href="${a.u}">
      <span class="ark-app-ic">${svg(a.i)}</span>
      <span class="ark-app-tx"><b>${a.n}</b><i>${a.d}</i></span>
    </a>`;
  const gridHTML = APPS.map(card).join('');

  /* styles */
  const css = `
  .ark-apps-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))}
  .ark-app{display:flex;align-items:center;gap:13px;padding:15px;border-radius:16px;text-decoration:none;
    background:var(--ark-glass,rgba(9,25,60,.72));border:1px solid var(--ark-stroke,rgba(255,255,255,.09));
    color:var(--ark-txt,#F4F6FB);transition:transform .18s,border-color .18s,box-shadow .18s}
  .ark-app:hover{transform:translateY(-3px);border-color:var(--ark-violet,#0058D9);box-shadow:0 24px 50px -26px rgba(0,0,0,.7)}
  .ark-app.on{border-color:var(--ark-bai,#003B8F)}
  .ark-app-ic{width:44px;height:44px;flex:none;display:grid;place-items:center;border-radius:12px;color:#fff;
    background:var(--ark-grad,linear-gradient(135deg,#00B5FF,#0058D9 55%,#003B8F))}
  .ark-app-ic svg{width:22px;height:22px}
  .ark-app-tx{display:flex;flex-direction:column;min-width:0}
  .ark-app-tx b{font-weight:700;font-size:14.5px}
  .ark-app-tx i{font-style:normal;font-size:12px;color:var(--ark-txt-2,rgba(122,141,184,.9))}
  /* launcher */
  #ark-fab{position:fixed;inset-inline-start:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 80px);z-index:99990;
    width:52px;height:52px;border-radius:16px;border:0;cursor:pointer;color:#fff;display:grid;place-items:center;
    background:var(--ark-grad,linear-gradient(135deg,#00B5FF,#0058D9 55%,#003B8F));
    box-shadow:0 14px 34px -12px rgba(0,88,217,.7);transition:transform .18s}
  #ark-fab:hover{transform:translateY(-2px) scale(1.03)}#ark-fab svg{width:23px;height:23px}
  #ark-launcher{position:fixed;inset:0;z-index:99991;display:none;align-items:flex-end;justify-content:center;
    background:rgba(3,8,24,.6);backdrop-filter:blur(6px)}
  #ark-launcher.on{display:flex}
  .ark-sheet{width:100%;max-width:680px;max-height:86vh;overflow-y:auto;background:var(--ark-bg-2,#0A1A3E);
    border:1px solid var(--ark-stroke,rgba(255,255,255,.1));border-radius:26px 26px 0 0;padding:22px 20px calc(env(safe-area-inset-bottom,0px) + 26px);
    box-shadow:0 -30px 80px -30px rgba(0,0,0,.8);animation:arkUp .28s cubic-bezier(.4,0,.2,1)}
  @keyframes arkUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}
  .ark-sheet-h{display:flex;align-items:center;gap:10px;margin-bottom:16px}
  .ark-sheet-h b{font-weight:800;font-size:18px;color:var(--ark-txt,#F4F6FB)}
  .ark-sheet-h .ky{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--ark-bai,#003B8F);text-transform:uppercase}
  .ark-sheet-h button{margin-inline-start:auto;width:36px;height:36px;border-radius:11px;border:1px solid var(--ark-stroke,rgba(255,255,255,.12));
    background:transparent;color:var(--ark-txt-2,#9aa);cursor:pointer;display:grid;place-items:center}
  .ark-sheet-h button svg{width:17px;height:17px}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function mount() {
    // services section on the landing page
    const host = document.getElementById('arkan-services');
    if (host) { host.classList.add('ark-apps-grid'); host.innerHTML = gridHTML; }

    // floating launcher (كل الصفحات)
    if (!document.getElementById('ark-fab')) {
      const fab = document.createElement('button');
      fab.id = 'ark-fab'; fab.title = 'خدمات أركان'; fab.innerHTML = svg('grid');
      document.body.appendChild(fab);

      const ov = document.createElement('div');
      ov.id = 'ark-launcher';
      ov.innerHTML = `<div class="ark-sheet" role="dialog" aria-label="خدمات أركان">
        <div class="ark-sheet-h"><span class="ky">ARKAN</span><b>الخدمات والمنصّات</b>
          <button id="ark-close" aria-label="إغلاق">${svg('x')}</button></div>
        <div class="ark-apps-grid">${gridHTML}</div></div>`;
      document.body.appendChild(ov);

      const open = () => ov.classList.add('on');
      const close = () => ov.classList.remove('on');
      fab.addEventListener('click', open);
      ov.addEventListener('click', e => { if (e.target === ov) close(); });
      document.getElementById('ark-close').addEventListener('click', close);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
