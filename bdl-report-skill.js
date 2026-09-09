/* bdl-report-skill.js — «مهارة التقرير»: يجعل Claude يعيد تقريرًا مهيكلًا (JSON) بدل نص حر،
   ثم يحوّله إلى تيليجرام (HTML ملوّن بالرموز) ونص عادي، وaccountant.html يرسمه بعناوين وألوان. */
'use strict';
const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const akey = () => { for (const k of Object.keys(process.env)) if (/^anthropic_(api_)?key$/i.test(k)) { const v = String(process.env[k] || '').trim(); if (v) return v; } return ''; };

const SYSTEM = 'أنت المحاسب الداخلي لـBDL (لبدال) — صرافة بين موريتانيا وأنغولا. تخاطب المالك محمد مباشرة. العملة الكوانزا الأنغولية AOA (لا تكتب أوقية). ' +
  'المعنى: إيصال زبون = مال وصل المالك؛ إيصال مورد = مال حوّله المالك؛ إيصال زبون بلا مورد = ذمة على المالك (الأخطر)؛ إيصال مورد بلا زبون = فائض تحويل أو إيصالات زبائن لم تُرفع بعد. ' +
  'الأرقام في البيانات صحيحة؛ لا تصفها بالتناقض ولا تطلب بيانات. لا تخترع رقمًا. أعد JSON صالحًا فقط بلا أي نص آخر وبلا أسوار كود، بهذا الشكل بالضبط:\n' +
  '{"title":"تقرير المحاسب اليومي","date":"YYYY-MM-DD","status":{"level":"ok|warn|critical","line":"جملة واحدة عن الوضع"},' +
  '"kpis":[{"label":"...","value":"...","tone":"red|amber|green|navy"}],' +
  '"sections":[{"heading":"ما تم اليوم","tone":"navy","bullets":["..."]},{"heading":"ملاحظات","tone":"amber","bullets":["..."]}],' +
  '"dues":[{"party":"الاسم","phone":"+...","count":0,"amount":0,"days":0}],' +
  '"actions":[{"priority":"high|medium|low","text":"إجراء يذكر الجهة والمبلغ"}],' +
  '"risks":["..."],' +
  '"whatsapp":{"to":"اسم أكبر جهة زبون بلا مقابل أو فارغ","text":"رسالة مهذبة 3 أسطر أو فارغ"}}\n' +
  'قواعد: kpis 3–5 عناصر بأرقام فعلية؛ dues مرتبة بالمبلغ تنازليًا وبحد أقصى 10؛ actions 3–6 مرتبة بالأولوية؛ risks ما يحتاج قرار المالك فقط؛ الجمل قصيرة ومباشرة بلا رموز تعبيرية.';

/* أسطر جديدة حرفية داخل النصوص تكسر JSON — نحوّلها إلى \\n */
function fixJson(t) { let o = '', q = false, e = false; for (const c of t) { if (q) { if (e) { o += c; e = false; continue; } if (c === '\\') { o += c; e = true; continue; } if (c === '"') { q = false; o += c; continue; } if (c === '\n') { o += '\\n'; continue; } if (c === '\r') continue; o += c; } else { if (c === '"') q = true; o += c; } } return o; }
async function ask(facts, opt) {
  opt = opt || {}; const key = akey(); if (!key) throw new Error('ANTHROPIC_KEY غير مضبوط');
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5', max_tokens: opt.maxTokens || 7000, system: SYSTEM, messages: [{ role: 'user', content: 'بيانات اليوم (JSON):\n' + (typeof facts === 'string' ? facts : JSON.stringify(facts)) + (opt.extra ? '\n\n' + opt.extra : '') }] }) });
  const j = await r.json(); if (!r.ok) throw new Error('Claude ' + r.status + ': ' + ((j.error && j.error.message) || '').slice(0, 160));
  const t = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('').replace(/```json|```/g, '').trim();
  const body = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
  let rep; try { rep = JSON.parse(body); } catch (e) { try { rep = JSON.parse(fixJson(body)); } catch (e2) { throw new Error('Claude JSON: ' + t.slice(0, 100)); } }
  rep.title = rep.title || 'تقرير المحاسب اليومي'; rep.date = rep.date || new Date().toISOString().slice(0, 10);
  rep.kpis = rep.kpis || []; rep.sections = rep.sections || []; rep.dues = rep.dues || []; rep.actions = rep.actions || []; rep.risks = rep.risks || [];
  return rep;
}

function toPlain(rep) {
  const L = [rep.title + ' — ' + rep.date, '', 'الوضع: ' + (rep.status && rep.status.line || '')];
  if (rep.kpis.length) { L.push('', 'المؤشرات:'); rep.kpis.forEach(k => L.push('- ' + k.label + ': ' + k.value)); }
  rep.sections.forEach(s => { L.push('', s.heading + ':'); (s.bullets || []).forEach(b => L.push('- ' + b)); });
  if (rep.dues.length) { L.push('', 'الذمم (زبائن بلا مقابل):'); rep.dues.forEach(d => L.push('- ' + d.party + (d.phone ? ' ' + d.phone : '') + ': ' + fmt(d.amount) + ' AOA · ' + d.count + ' إيصال · ' + d.days + ' يوم')); }
  if (rep.actions.length) { L.push('', 'الإجراءات:'); rep.actions.forEach((a, i) => L.push((i + 1) + ') ' + a.text)); }
  if (rep.risks.length) { L.push('', 'مخاطر تحتاج قرارك:'); rep.risks.forEach(r => L.push('- ' + r)); }
  if (rep.whatsapp && rep.whatsapp.text) L.push('', 'رسالة واتساب' + (rep.whatsapp.to ? ' — ' + rep.whatsapp.to : '') + ':', rep.whatsapp.text);
  return L.join('\n');
}

function toTelegram(rep) {
  const lv = { ok: '🟢', warn: '🟠', critical: '🔴' }[rep.status && rep.status.level] || '⚪';
  const pr = { high: '🔴', medium: '🟠', low: '🟢' };
  const L = ['<b>' + esc(rep.title) + '</b> — ' + esc(rep.date), lv + ' ' + esc(rep.status && rep.status.line || '')];
  if (rep.kpis.length) L.push('', '<b>📊 المؤشرات</b>', ...rep.kpis.map(k => '• ' + esc(k.label) + ': <b>' + esc(k.value) + '</b>'));
  rep.sections.forEach(s => L.push('', '<b>📌 ' + esc(s.heading) + '</b>', ...(s.bullets || []).map(b => '• ' + esc(b))));
  if (rep.dues.length) L.push('', '<b>💰 الذمم</b>', ...rep.dues.map(d => '• ' + esc(d.party) + ': <b>' + fmt(d.amount) + '</b> AOA · ' + d.count + ' إيصال · ' + d.days + ' يوم'));
  if (rep.actions.length) L.push('', '<b>✅ الإجراءات</b>', ...rep.actions.map(a => (pr[a.priority] || '•') + ' ' + esc(a.text)));
  if (rep.risks.length) L.push('', '<b>⚠️ يحتاج قرارك</b>', ...rep.risks.map(r => '• ' + esc(r)));
  if (rep.whatsapp && rep.whatsapp.text) L.push('', '<b>💬 واتساب' + (rep.whatsapp.to ? ' — ' + esc(rep.whatsapp.to) : '') + '</b>', '<i>' + esc(rep.whatsapp.text) + '</i>');
  return L.join('\n');
}
module.exports = { ask, toPlain, toTelegram, SYSTEM };
