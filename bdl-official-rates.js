/* bdl-official-rates.js — المراجع الرسمية اليومية (Build 1290)
   BCM (البنك المركزي الموريتاني): USD/EUR/CNY/AED → MRU · BNA (بنك أنغولا): USD/EUR → AOA
   لكل مصدر عدة مسارات (JSON رسمي → صفحة رسمية → مرآة) ثم استخراج بـClaude إن كانت الصفحة نصًا حرًا، ثم سوق كبديل أخير.
   كل قيمة تمر بحدود سلامة، وتُخزَّن مع مصدرها في bdl_official_rates (إن وُجد الجدول). */
'use strict';
const akey = () => { for (const k of Object.keys(process.env)) if (/^anthropic_(api_)?key$/i.test(k)) { const v = String(process.env[k] || '').trim(); if (v) return v; } return ''; };
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; BDL-rates/1.0; +https://lbdal.com)', 'Accept': 'application/json,text/html;q=0.9,*/*;q=0.8' };
const BOUNDS = { MRU: { USD: [30, 70], EUR: [35, 85], CNY: [4, 10], AED: [8, 20] }, AOA: { USD: [500, 3000], EUR: [550, 3500] } };
const inB = (q, c, v) => { if (!(v > 0)) return false; const b = BOUNDS[q] && BOUNDS[q][c]; return b ? v >= b[0] && v <= b[1] : true; };
async function get(url, ms) { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms || 12000); try { const r = await fetch(url, { headers: UA, signal: ac.signal }); const txt = await r.text(); return { ok: r.ok, status: r.status, text: txt }; } finally { clearTimeout(t); } }
const num = s => { if (s == null) return null; const t = String(s).replace(/\s/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.'); const v = parseFloat(t.replace(/[^\d.]/g, '')); return isFinite(v) ? v : null; };
const strip = h => String(h).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/* استخراج ذكي: Claude يقرأ نص الصفحة ويعيد الأسعار المطلوبة فقط */
async function aiExtract(text, quote, want) {
  const key = akey(); if (!key || !text || text.length < 40) return null;
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5', max_tokens: 300, system: 'أنت مستخرج بيانات. أعد JSON فقط بلا أي نص آخر.',
      messages: [{ role: 'user', content: 'من النص التالي (صفحة بنك مركزي) استخرج سعر المرجع الرسمي لكل عملة من ' + want.join(',') + ' مقابل ' + quote + ' — كم ' + quote + ' يساوي 1 من العملة. إن وُجد شراء/بيع فخذ المتوسط أو «المرجع». إن لم تجد عملة اجعلها null. أعد بالشكل {"date":"YYYY-MM-DD أو null","rates":{"USD":0,...}}\n\n' + text.slice(0, 12000) }] }) });
  const j = await r.json(); if (!r.ok) return null;
  const t = (j.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
  try { return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (e) { return null; }
}
function pickJson(text, want, quote) {
  /* يبحث في أي JSON عن أزواج (كود عملة، قيمة) بغض النظر عن أسماء الحقول */
  let j; try { j = JSON.parse(text); } catch (e) { return null; }
  const out = {}; const walk = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk);
    const vals = Object.values(o); const code = vals.find(v => typeof v === 'string' && want.includes(v.toUpperCase())) || (o.moeda && (o.moeda.codigo || o.moeda.code)) || o.currency || o.codigo || o.code;
    if (code && want.includes(String(code).toUpperCase())) { const cands = ['genericValor', 'valorReferencia', 'taxaReferencia', 'reference', 'ref', 'cours', 'rate', 'valor', 'value', 'taxa', 'moyen', 'middle', 'mid', 'venda', 'vente', 'compra', 'achat', 'sell', 'buy'].map(k => num(o[k])).filter(v => v != null && inB(quote, String(code).toUpperCase(), v)); if (cands.length) out[String(code).toUpperCase()] = cands[0]; }
    vals.forEach(walk); };
  walk(j); return Object.keys(out).length ? out : null;
}
/* اكتشاف تلقائي لواجهة الموقع الرسمي (تطبيقات React/Angular): يقرأ حزم الجافاسكربت ويستخرج مسارات API التي تذكر الأسعار، ويجربها */
let DISCOVERED = {};
async function discover(base, key) {
  if (DISCOVERED[key]) return DISCOVERED[key];
  const found = [];
  try {
    const home = await get(base, 15000); if (!home.ok) return found;
    const scripts = [...home.text.matchAll(/<script[^>]+src=["']([^"']+\.js[^"']*)["']/gi)].map(m => m[1]).filter(u => !/google|facebook|gtag|analytics|recaptcha/i.test(u)).slice(0, 6);
    const abs = u => u.startsWith('http') ? u : (u.startsWith('/') ? new URL(base).origin + u : base.replace(/\/[^/]*$/, '/') + u);
    const seen = new Set();
    for (const sc of scripts) { try { const js = await get(abs(sc), 20000); if (!js.ok) continue;
      for (const m of js.text.matchAll(/["'`](https?:\/\/[^"'`\s]{6,160}|\/[A-Za-z0-9_\-./]{3,120})["'`]/g)) { const u = m[1]; if (/(rate|cours|devise|taux|change|exchange|currenc|money)/i.test(u) && /(api|json|rest|service|graphql|wp-json)/i.test(u) && !seen.has(u)) { seen.add(u); found.push(abs(u)); } }
      for (const m of js.text.matchAll(/["'`](https?:\/\/[^"'`\s]*(api|rest|service)[^"'`\s]{0,80})["'`]/gi)) { const u = m[1]; if (!seen.has(u) && u.length < 160) { seen.add(u); found.push(u); } }
    } catch (e) {} }
  } catch (e) {}
  DISCOVERED[key] = found.slice(0, 25); return DISCOVERED[key];
}
async function trySources(sources, quote, want) {
  const notes = [];
  for (const s of sources) { try {
    const r = await get(s.url); if (!r.ok) { notes.push(s.name + ': HTTP ' + r.status); continue; }
    let rates = pickJson(r.text, want, quote);
    if (!rates) { const txt = strip(r.text); if (txt.length < 80) { notes.push(s.name + ': صفحة فارغة (JS)'); continue; } const ai = await aiExtract(txt, quote, want); if (ai && ai.rates) { rates = {}; for (const c of want) { const v = num(ai.rates[c]); if (v != null && inB(quote, c, v)) rates[c] = v; } } }
    if (rates && Object.keys(rates).length) return { rates, source: s.name, notes };
    notes.push(s.name + ': لا أسعار');
  } catch (e) { notes.push(s.name + ': ' + String(e.message).slice(0, 60)); } }
  return { rates: null, source: null, notes };
}
async function market() { try { const j = await (await get('https://open.er-api.com/v6/latest/USD')).text(); const r = JSON.parse(j).rates || {}; return { MRU: r.MRU, AOA: r.AOA, EUR: r.EUR, CNY: r.CNY, AED: r.AED }; } catch (e) { return null; } }

async function fetchAll() {
  const bcmApi = (await discover('https://www.bcm.mr/money-rate-table', 'bcm')).map(u => ({ name: 'BCM-api', url: u }));
  const bnaApi = (await discover('https://www.bna.ao/', 'bna')).map(u => ({ name: 'BNA-api', url: u }));
  const bcm = await trySources(bcmApi.concat([
    { name: 'BCM', url: 'https://www.bcm.mr/api/money-rate-table' },
    { name: 'BCM', url: 'https://www.bcm.mr/api/money-rates' },
    { name: 'BCM', url: 'https://www.bcm.mr/api/v1/money-rate-table' },
    { name: 'BCM', url: 'https://www.bcm.mr/-cours-central-interbancaire-de-reference-165-' },
    { name: 'BNM', url: 'https://www.bnm.mr/cours-de-change' },
    { name: 'BMCI', url: 'https://www.bmci.mr/cours-de-change' },
    { name: 'Attijari-MR', url: 'https://www.attijaribank.mr/cours-de-change' },
    { name: 'BPM-mirror', url: 'https://www.bpm.mr/COURS-DEVISE-BCM' }
  ]), 'MRU', ['USD', 'EUR', 'CNY', 'AED']);
  const bna = await trySources([
    { name: 'BNA', url: 'https://www.bna.ao/service/rest/taxas/get/taxa/referencia?tipocambio=M' },
    { name: 'BNA-T', url: 'https://www.bna.ao/service/rest/taxas/get/taxa/referencia?tipocambio=T' },
    { name: 'cambio.ao', url: 'https://cambio.ao/cambio-do-dia' }
  ].concat(bnaApi), 'AOA', ['USD', 'EUR']);
  const mkt = await market();
  const out = { at: new Date().toISOString(), MRU: {}, AOA: {}, sources: { MRU: bcm.source || (mkt && mkt.MRU ? 'Market' : null), AOA: bna.source || (mkt && mkt.AOA ? 'Market' : null) }, notes: bcm.notes.concat(bna.notes), discovered: { bcm: bcmApi.map(x => x.url), bna: bnaApi.map(x => x.url) } };
  if (bcm.rates) out.MRU = bcm.rates; else if (mkt && mkt.MRU) { out.MRU = { USD: +mkt.MRU.toFixed(2), EUR: mkt.EUR ? +(mkt.MRU / mkt.EUR).toFixed(2) : undefined, CNY: mkt.CNY ? +(mkt.MRU / mkt.CNY).toFixed(3) : undefined, AED: mkt.AED ? +(mkt.MRU / mkt.AED).toFixed(2) : undefined }; }
  if (bna.rates) out.AOA = bna.rates; else if (mkt && mkt.AOA) { out.AOA = { USD: +mkt.AOA.toFixed(2), EUR: mkt.EUR ? +(mkt.AOA / mkt.EUR).toFixed(2) : undefined }; }
  return out;
}
/* يطبّق المراجع على صفوف rates-data.json: bank = المرجع الرسمي، src = المصدر. يعيد ما تغيّر */
function applyTo(cur, off) {
  const changed = [];
  for (const row of (cur.r || [])) {   // المرجع الرسمي يُحدَّث دائمًا؛ الصفوف المقفلة تحتفظ بأسعارها اليدوية (r/m/w) ويتغير مرجعها المعروض فقط
    const c = row.ccy === 'USDT' ? 'USD' : row.ccy;
    let v = null, src = null;
    if (row.ccy === 'AOA') { v = off.AOA.USD; src = off.sources.AOA; }
    else if (off.MRU[c] != null) { v = off.MRU[c]; src = off.sources.MRU; }
    if (v == null || !src) continue;
    if (+row.bank !== +v || row.src !== src) { changed.push(row.ccy + ': ' + row.bank + ' → ' + v + ' (' + src + ')'); row.bank = +v; row.src = src; if (!row.lock) row.auto = true; row.bankAt = off.at; }
  }
  return changed;
}
module.exports = { fetchAll, applyTo, aiExtract };
