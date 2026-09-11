/* bdl-core.js — أدوات مشتركة: تنسيق المبالغ والتواريخ والجلسة (Build 1294) */
(function (g) { 'use strict';
  var fmt = function (n, d) { var v = Number(n) || 0; return (d ? Math.round(v * Math.pow(10, d)) / Math.pow(10, d) : Math.round(v)).toLocaleString('en-US', { maximumFractionDigits: d || 0 }); };
  g.BDL = { fmt: fmt, money: function (n, ccy) { return fmt(n) + ' ' + (ccy || 'AOA'); }, date: function (s) { return s ? String(s).slice(0, 10) : ''; },
    token: function () { try { var j = JSON.parse(localStorage.getItem('arkan_sb_jwt') || 'null'); if (j && j.token && j.exp > Math.floor(Date.now() / 1000) + 60) return j.token; } catch (e) {} return null; },
    isOwner: function () { try { var s = JSON.parse(localStorage.getItem('arkan_session') || 'null'); return /36295050$/.test(String(s && s.phone || '').replace(/\D/g, '')) || localStorage.getItem('arkan_admin_dev') === '1'; } catch (e) { return false; } },
    api: 'https://arkan-ai-site-production.up.railway.app',
    /* دليل الجهات الموحّد: ذاكرة واحدة للأسماء والأرقام في كل الصفحات (تُخزَّن محليًا وتُحدَّث من الخادم) */
    parties: {
      _k: 'bdl_parties_v1',
      list: function () { try { return JSON.parse(localStorage.getItem(this._k) || '[]'); } catch (e) { return []; } },
      load: async function () { var t = g.BDL.token(); if (!t) return this.list(); try { var r = await fetch(g.BDL.api + '/parties', { headers: { Authorization: 'Bearer ' + t } }); var j = await r.json(); if (Array.isArray(j)) { localStorage.setItem(this._k, JSON.stringify(j)); return j; } } catch (e) {} return this.list(); },
      norm: function (p) { return String(p || '').replace(/\D/g, '').replace(/^00/, ''); },
      byPhone: function (p) { var n = this.norm(p); if (!n) return null; return this.list().find(function (x) { return x.phone === n; }) || null; },
      byName: function (q) { q = String(q || '').trim().toLowerCase(); if (!q) return []; return this.list().filter(function (x) { return (x.name || '').toLowerCase().indexOf(q) >= 0 || (x.aliases || []).some(function (a) { return String(a).toLowerCase().indexOf(q) >= 0; }); }).slice(0, 10); },
      save: async function (p) { var t = g.BDL.token(); if (!t || !p || !p.phone || !p.name) return; try { await fetch(g.BDL.api + '/parties', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); } catch (e) {} var L = this.list().filter(function (x) { return x.phone !== this.norm(p.phone); }, this); L.unshift({ phone: this.norm(p.phone), name: p.name, side: p.side || 'cust', aliases: [] }); localStorage.setItem(this._k, JSON.stringify(L.slice(0, 5000))); },
      /* يربط حقلي اسم + هاتف: قائمة اقتراحات مرئية تحت الحقل (تعمل على iOS حيث لا تظهر datalist)، ملء تلقائي، وحفظ عند الخروج */
      bind: function (nameEl, phoneEl, side) { var self = this; if (!nameEl || !phoneEl || nameEl.dataset.bdlBound) return; nameEl.dataset.bdlBound = '1';
        if (!document.getElementById('bdlSugCss')) { var st = document.createElement('style'); st.id = 'bdlSugCss'; st.textContent = '.bdl-sug{position:absolute;z-index:99999;background:#fff;border:1px solid #D5D8E0;border-radius:14px;box-shadow:0 10px 30px rgba(10,10,10,.14);max-height:240px;overflow:auto;min-width:220px;font-family:inherit}.bdl-sug div{padding:10px 12px;border-bottom:1px solid #EEF0F4;cursor:pointer;display:flex;justify-content:space-between;gap:10px;font-size:14px;color:#0A0A0A}.bdl-sug div:last-child{border:0}.bdl-sug div:active{background:#F0F2F7}.bdl-sug small{color:#6B7280;direction:ltr;font-variant-numeric:tabular-nums}.bdl-sug b{font-weight:500;font-size:11px;color:#6B7280}'; document.head.appendChild(st); }
        var box = document.createElement('div'); box.className = 'bdl-sug'; box.style.display = 'none'; document.body.appendChild(box);
        var hide = function () { box.style.display = 'none'; };
        var place = function (el) { var r = el.getBoundingClientRect(); box.style.left = Math.max(8, r.left + window.scrollX) + 'px'; box.style.top = (r.bottom + window.scrollY + 4) + 'px'; box.style.width = Math.max(220, r.width) + 'px'; };
        var pick = function (x) { nameEl.value = x.name; phoneEl.value = '+' + x.phone; nameEl.dispatchEvent(new Event('input', { bubbles: true })); phoneEl.dispatchEvent(new Event('input', { bubbles: true })); nameEl.dispatchEvent(new Event('change', { bubbles: true })); phoneEl.dispatchEvent(new Event('change', { bubbles: true })); hide(); };
        var show = function (el) { var q = el.value.trim(); var L = /\d{4,}/.test(q) ? self.list().filter(function (x) { return x.phone.indexOf(self.norm(q)) >= 0; }) : (q ? self.byName(q) : self.list()); L = L.slice(0, 8); if (!L.length) return hide();
          box.innerHTML = L.map(function (x, i) { return '<div data-i="' + i + '"><span>' + String(x.name).replace(/</g, '&lt;') + ' <b>' + (x.side === 'sup' ? 'مورد' : x.side === 'both' ? 'زبون/مورد' : 'زبون') + '</b></span><small>+' + x.phone + '</small></div>'; }).join('');
          box.querySelectorAll('div[data-i]').forEach(function (d) { d.addEventListener('mousedown', function (e) { e.preventDefault(); pick(L[+d.dataset.i]); }); d.addEventListener('touchstart', function (e) { e.preventDefault(); pick(L[+d.dataset.i]); }, { passive: false }); });
          place(el); box.style.display = 'block'; };
        [nameEl, phoneEl].forEach(function (el) { el.setAttribute('autocomplete', 'off'); el.addEventListener('input', function () { show(el); }); el.addEventListener('focus', function () { show(el); }); el.addEventListener('blur', function () { setTimeout(hide, 150); }); });
        window.addEventListener('scroll', hide, { passive: true });
        phoneEl.addEventListener('change', function () { var m = self.byPhone(phoneEl.value); if (m && !nameEl.value) { nameEl.value = m.name; nameEl.dispatchEvent(new Event('input', { bubbles: true })); } if (nameEl.value && self.norm(phoneEl.value).length >= 7) self.save({ phone: phoneEl.value, name: nameEl.value, side: side || 'cust' }); });
        nameEl.addEventListener('blur', function () { if (nameEl.value && self.norm(phoneEl.value).length >= 7) self.save({ phone: phoneEl.value, name: nameEl.value, side: side || 'cust' }); });
        self.load().then(function (L) { if (!L || !L.length) { var t = g.BDL.token(); if (t) fetch(g.BDL.api + '/parties/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: '{}' }).then(function () { return self.load(); }).catch(function () {}); } }); }
    } };
})(window);
