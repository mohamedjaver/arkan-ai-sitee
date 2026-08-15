/* ═══════════════════════════════════════════════════════════
   BDL AI — مساعد Gemini على كل صفحات الموقع
   • زر عائم يفتح دردشة ذكية (عربي/فرنسي/إنجليزي)
   • يعرف سياق لبدال: الأسعار الحية، الخدمات، بطاقة الفيزا
   • مفتاح Gemini لا يُخزَّن في الكود: يُدخله الأدمن مرة واحدة
     ويُحفظ في localStorage على جهازه (أو يوزَّع لاحقاً عبر خادم)
   التحميل: <script src="arkan-ai.js" defer></script>
   ═══════════════════════════════════════════════════════════ */
(function () {
  const KEY_LS = 'arkan_gemini_key';
  const getKeyU = () => (localStorage.getItem('gemKey') || localStorage.getItem(KEY_LS) || '').trim();
  const setKeyU = k => { localStorage.setItem('gemKey', k); localStorage.setItem(KEY_LS, k); };
  const rmKeyU  = () => { localStorage.removeItem('gemKey'); localStorage.removeItem(KEY_LS); };
  const MODELS = ['gemini-2.5-flash','gemini-2.0-flash','gemini-flash-latest'];
  const SYS = 'أنت مساعد BDL (lbdal.com) — منصة صرف عملات وتسويات دولية بين موريتانيا وأنغولا والصين والخليج، مملوكة لشركة ARKAN INTERNATIONAL TRADING. خدماتنا: تحويل الأموال عبر الحدود (AOA, MRU, USDT, EUR, CNY, AED)، تسديد فواتير الموردين في الصين، بطاقة فيزا مسبقة الدفع بـ1500 أوقية جديدة (MRU) تُسلَّم في نواكشوط خلال 24-48 ساعة، أرشفة الإيصالات بالذكاء الاصطناعي، ومركز تسويات. واتساب: +222 36 29 50 50. أجب بلغة السائل (عربي/فرنسي/إنجليزي/برتغالي) باختصار ومهنية. إن سُئلت عن سعر حي استخدم الأسعار المرفقة في الرسالة إن وُجدت، وإلا وجّه للواتساب.';

  function el(tag, css, html) { const e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; return e; }

  function ratesContext() {
    try {
      if (window.ARKAN && window.ARKAN.RATES && Object.keys(window.ARKAN.RATES).length) {
        const r = window.ARKAN.RATES;
        return 'الأسعار الحية الآن (مقابل MRU): ' + Object.keys(r).filter(k => k !== 'MRU')
          .map(k => `${k}: بيع ${r[k].r}${r[k].w ? ' / جملة ' + r[k].w : ''}${r[k].buy ? ' / شراء ' + r[k].buy : ''}`).join(' · ');
      }
    } catch (e) {}
    return '';
  }

  async function askGemini(history) {
    const key = getKeyU();
    if (!key) throw new Error('NO_KEY');
    const ctx = ratesContext();
    const contents = history.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] }));
    if (ctx) contents[contents.length - 1].parts[0].text += '\n\n[بيانات حية]: ' + ctx;
    let lastErr = null;
    for (const MODEL of MODELS) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_instruction: { parts: [{ text: SYS }] }, contents, generationConfig: { maxOutputTokens: 500, temperature: 0.4 } })
      });
      if (res.ok) {
        const d = await res.json();
        return (d.candidates && d.candidates[0] && d.candidates[0].content.parts.map(p => p.text).join('')) || '…';
      }
      let msg = 'HTTP ' + res.status;
      try { const j = await res.json(); if (j.error && j.error.message) msg = j.error.message; } catch (e2) {}
      if (res.status === 400 || res.status === 403) throw new Error('BAD_KEY');
      lastErr = (res.status === 429 || res.status === 404) ? new Error(res.status === 429 ? 'RATE' : msg) : new Error(msg);
      if (res.status !== 429 && res.status !== 404 && res.status !== 503) throw lastErr;
      // 429/404/503 → جرّب النموذج التالي
    }
    throw (lastErr || new Error('RATE'));
  }

  function mount() {
    if (document.getElementById('ark-ai-fab')) return;
    const NAVY = '#003B8F', GRAD = 'linear-gradient(120deg,#00B5FF,#0058D9 30%,#003B8F 58%,#00B5FF)';

    const fab = el('button',
      `position:fixed;inset-inline-end:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);z-index:99992;width:54px;height:54px;border-radius:50%;border:0;cursor:pointer;color:#fff;display:grid;place-items:center;background:${GRAD};box-shadow:0 14px 32px -10px rgba(0,88,217,.55);transition:transform .18s`,
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15Z"/></svg>');
    fab.id = 'ark-ai-fab'; fab.title = 'BDL AI';
    document.body.appendChild(fab);

    const panel = el('div',
      `position:fixed;inset-inline-end:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 148px);z-index:99993;width:min(92vw,390px);max-height:min(70vh,560px);display:none;flex-direction:column;background:#fff;border:1px solid #DCE8F8;border-radius:20px;box-shadow:0 40px 90px -30px rgba(7,29,73,.45);overflow:hidden;font-family:'IBM Plex Sans Arabic','Manrope',sans-serif`);
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:13px 16px;background:${NAVY};color:#fff">
        <div style="width:30px;height:30px;border-radius:9px;background:${GRAD};display:grid;place-items:center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/></svg></div>
        <b style="font-size:14.5px">مساعد BDL الذكي</b>
        <span style="margin-inline-start:auto;display:flex;gap:8px">
          <button id="ark-ai-set" title="مفتاح API" style="background:none;border:0;color:#cfe0ff;cursor:pointer;font-size:15px">⚙</button>
          <button id="ark-ai-x" style="background:none;border:0;color:#fff;cursor:pointer;font-size:17px">✕</button>
        </span>
      </div>
      <div id="ark-ai-log" dir="auto" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:9px;background:#F5F9FF"></div>
      <div style="display:flex;gap:8px;padding:11px;border-top:1px solid #DCE8F8;background:#fff">
        <input id="ark-ai-in" dir="auto" placeholder="اسأل عن الأسعار، الفيزا، التحويل…" style="flex:1;border:1px solid #DCE8F8;border-radius:12px;padding:11px 13px;font-size:14px;outline:none;font-family:inherit">
        <button id="ark-ai-go" style="border:0;border-radius:12px;padding:0 16px;background:${NAVY};color:#fff;font-weight:700;cursor:pointer">↑</button>
      </div>`;
    document.body.appendChild(panel);

    const log = panel.querySelector('#ark-ai-log'), input = panel.querySelector('#ark-ai-in');
    const hist = [];
    function bubble(role, text) {
      const mine = role === 'user';
      const b = el('div', `max-width:86%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word;` +
        (mine ? `align-self:flex-end;background:${NAVY};color:#fff;border-end-end-radius:4px`
              : 'align-self:flex-start;background:#fff;border:1px solid #DCE8F8;color:#071D49;border-end-start-radius:4px'));
      b.textContent = text; log.appendChild(b); log.scrollTop = log.scrollHeight; return b;
    }
    function hello() {
      if (!log.childElementCount) bubble('ai', 'مرحباً! أنا مساعد لبدال الذكي 👋\nاسألني عن أسعار الصرف، بطاقة الفيزا (1500 MRU)، التحويلات الدولية، أو أي خدمة.');
    }
    async function send() {
      const q = input.value.trim(); if (!q) return;
      input.value = ''; bubble('user', q); hist.push({ role: 'user', text: q });
      if (!getKeyU()) {
        bubble('ai', 'لتفعيل الذكاء الاصطناعي: اضغط ⚙ وأدخل مفتاح Gemini (يُحفظ على جهازك فقط).\nوللمساعدة الفورية: واتساب +222 36 29 50 50'); return;
      }
      const w = bubble('ai', '…');
      try { const a = await askGemini(hist.slice(-8)); w.textContent = a; hist.push({ role: 'ai', text: a }); }
      catch (e) {
        w.textContent =
          e.message === 'NO_KEY'  ? 'أدخل مفتاح API من ⚙' :
          e.message === 'BAD_KEY' ? '🔑 المفتاح مرفوض أو مُلغى — اضغط ⚙ وأدخل مفتاح Gemini جديدًا من aistudio.google.com/apikey' :
          e.message === 'RATE'    ? 'ضغط مؤقت على الخدمة — أعد المحاولة بعد دقيقة' :
          'تعذّر الاتصال (' + e.message + ') — تحقق من الإنترنت أو واتساب +222 36 29 50 50';
      }
      log.scrollTop = log.scrollHeight;
    }
    panel.querySelector('#ark-ai-go').addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    panel.querySelector('#ark-ai-x').addEventListener('click', () => panel.style.display = 'none');
    panel.querySelector('#ark-ai-set').addEventListener('click', () => {
      const cur = getKeyU();
      const k = prompt('مفتاح Gemini API (aistudio.google.com/apikey) — يُحفظ على هذا الجهاز فقط:', cur);
      if (k !== null) { k.trim() ? setKeyU(k.trim()) : rmKeyU();
        bubble('ai', k.trim() ? 'تم حفظ المفتاح ✓ — اسألني الآن أي شيء.' : 'أُزيل المفتاح.'); }
    });
    fab.addEventListener('click', () => { const on = panel.style.display === 'flex'; panel.style.display = on ? 'none' : 'flex'; if (!on) { hello(); input.focus(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
