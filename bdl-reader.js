/* bdl-reader.js — طبقة القراءة: القارئ الموحّد لكل إيصالات BDL (Build 1365)
   POST /read/receipt {b64,mime} → {is_receipt,bank,currency,amount,sender,receiver,phone,account,txn,date,status,confidence}
   مطلوب في Railway: ANTHROPIC_KEY (أو ANTHROPIC_API_KEY). اختياري: ANTHROPIC_MODEL. */
'use strict';
module.exports = function (app, ctx) {
  const { express, jwt, JWT_SECRET } = ctx;
  const KEY = () => (() => { for (const k of Object.keys(process.env)) if (/^anthropic_(api_)?key$/i.test(k)) { const v = String(process.env[k] || '').trim(); if (v) return v; } return ''; })();
  const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const auth = req => { try { jwt.verify(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''), JWT_SECRET); return true; } catch (e) { return false; } };
  const wrap = fn => async (req, res) => { if (!auth(req)) return res.status(401).json({ error: 'الجلسة منتهية — افتح account.html' }); try { res.json(await fn(req)); } catch (e) { res.status(500).json({ error: String(e.message).slice(0, 300) }); } };
  const RECEIPT_SYS = 'أنت قارئ إيصالات مالية لصرافة تعمل بين موريتانيا (MRU) وأنغولا (AOA) وUSDT. اقرأ الإيصال (صورة أو PDF أو لقطة شاشة تطبيق بنكي/محفظة) واستخرج الحقول بدقة حرفية. ' +
    'أعد JSON فقط بلا أي نص آخر وبلا أسوار كود: {"is_receipt":true,"bank":"اسم البنك/التطبيق","currency":"MRU|AOA|USD|USDT|EUR|null","amount":123456.78,"amount_verbatim":"كما كُتب","sender":"اسم المرسل أو null","receiver":"اسم المستلم أو null","phone":"هاتف المستلم/المرسل بالأرقام أو null","account":"رقم الحساب/IBAN/المحفظة أو null","txn":"رقم العملية/المرجع أو null","date":"YYYY-MM-DD HH:MM أو null","status":"success|failed|pending|null","confidence":0-100}. ' +
    'قواعد: المبلغ المحوَّل فقط (لا الرصيد ولا العمولة)؛ MRU 320000 يعني 320000؛ الفاصلة الأوروبية 5.000.000,00 تعني 5000000؛ إن كان النص عربيًا فالتسميات: المبلغ المرسل، المستلم، معرف المعاملة، التاريخ والوقت؛ لا تخترع قيمًا — استخدم null.' +
    ' قالب ATLANTICO (Banco Millennium Atlântico — "Transfer to Atlântico" / "Transferência Atlântico"، جدول Label/Value، غالبًا لقطة شاشة لملف "proof"): bank="ATLANTICO"؛ amount = قيمة سطر Amount/Montante فقط (مثل 2394700,00 → 2394700، 1700000,00 → 1700000)؛ currency = سطر Currency/Moeda (AKZ → AOA)؛ reference = قيمة سطر Reference/Referencia فقط (9 أرقام غالبًا)؛ sender = ACCOUNT HOLDER / NOME DO TITULAR DA CONTA؛ receiver (المستفيد) = سطر Name / Nome beneficiário؛ account = سطر Account number/IBAN. لا تأخذ أبدًا رقم "ACCOUNT NUMBER / NÚMERO DE CONTA" في الرأس (مثل 292750887 1 0 001) ولا "Current account / Conta origem" كمبلغ أو مرجع. التاريخ في تذييل الصفحة بصيغة DD-MM-YYYY. confidence 95+ إذا وُجد Reference وAmount معًا.' +
    ' قالب المحافظ الموريتانية (Bankily/BPM، Masrvi، Sedad، BIM، Amanty، Click — لقطة شاشة تطبيق أو رسالة SMS بالفرنسية أو العربية): is_receipt=true دائمًا؛ currency=MRU (UM/MRU/أوقية)؛ amount = Montant / Montant envoyé / المبلغ / المبلغ المرسل فقط (لا Frais/الرسوم ولا Solde/الرصيد)؛ txn = Trs ID / Txn ID / ID de la transaction / معرف المعاملة / رقم العملية كاملًا؛ phone = رقم هاتف المستلم (8 أرقام موريتانية تبدأ بـ 2 أو 3 أو 4)؛ receiver = اسم المستلم (Bénéficiaire / à / المستلم)؛ bank = اسم التطبيق (Bankily، Masrvi، Sedad…). المبالغ قد تُكتب 12 500 أو 12,500.00 أو 12.500 — كلها 12500.';
  app.post('/read/receipt', express.json({ limit: '12mb' }), wrap(async req => {
    const b = req.body || {}; if (!b.b64) throw new Error('لا ملف');
    const mime = b.mime || 'image/jpeg';
    const content = [mime === 'application/pdf' ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b.b64 } } : { type: 'image', source: { type: 'base64', media_type: mime, data: b.b64 } }, { type: 'text', text: 'اقرأ هذا الإيصال وأعد JSON.' }];
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': KEY(), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL(), max_tokens: 600, system: RECEIPT_SYS, messages: [{ role: 'user', content }] }) });
    const j = await r.json(); if (!r.ok) throw new Error('Claude ' + r.status + ': ' + ((j.error && j.error.message) || '').slice(0, 160));
    const t = (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('').replace(/```json|```/g, '').trim();
    let out; try { out = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (e) { throw new Error('تعذر تفسير القراءة'); }
    if (out.amount != null) out.amount = Number(String(out.amount).replace(/[^\d.]/g, '')) || null;
    if (out.phone) out.phone = String(out.phone).replace(/\D/g, '');
    if (out.currency) { const c = String(out.currency).toUpperCase(); out.currency = /AKZ|KZ|KWANZA|AOA/.test(c) ? 'AOA' : /MRU|MRO|UM|OUGUIYA|أوقية/.test(c) ? 'MRU' : /USDT|TETHER/.test(c) ? 'USDT' : /USD|\$/.test(c) ? 'USD' : /EUR|€/.test(c) ? 'EUR' : c; }
    try { if (out.phone && app.locals.parties) { const pt = await app.locals.parties.find(out.phone); if (pt && !out.receiver) out.receiver = pt.name; } } catch (e) {}
    return out;
  }));
  console.log('▲ reader ready (' + MODEL() + (KEY() ? ', key on' : ', key off') + ')');
};
