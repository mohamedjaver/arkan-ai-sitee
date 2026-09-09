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
      /* يربط حقلي اسم + هاتف: اقتراحات أثناء الكتابة، وملء تلقائي، وحفظ عند الخروج من الحقل */
      bind: function (nameEl, phoneEl, side) { var self = this; if (!nameEl || !phoneEl || nameEl.dataset.bdlBound) return; nameEl.dataset.bdlBound = '1';
        var dl = document.createElement('datalist'); dl.id = 'bdlp_' + Math.random().toString(36).slice(2, 7); document.body.appendChild(dl); nameEl.setAttribute('list', dl.id); phoneEl.setAttribute('list', dl.id);
        var fill = function () { var q = (document.activeElement === phoneEl ? phoneEl.value : nameEl.value); var L = /\d{5,}/.test(q) ? self.list().filter(function (x) { return x.phone.indexOf(self.norm(q)) >= 0; }).slice(0, 10) : self.byName(q); dl.innerHTML = L.map(function (x) { return '<option value="' + (document.activeElement === phoneEl ? '+' + x.phone : x.name) + '">' + (document.activeElement === phoneEl ? x.name : '+' + x.phone) + '</option>'; }).join(''); };
        nameEl.addEventListener('input', fill); phoneEl.addEventListener('input', fill);
        nameEl.addEventListener('change', function () { var m = self.byName(nameEl.value).find(function (x) { return x.name === nameEl.value.trim(); }); if (m && !phoneEl.value) { phoneEl.value = '+' + m.phone; phoneEl.dispatchEvent(new Event('input')); } });
        phoneEl.addEventListener('change', function () { var m = self.byPhone(phoneEl.value); if (m && !nameEl.value) { nameEl.value = m.name; nameEl.dispatchEvent(new Event('input')); } if (nameEl.value && self.norm(phoneEl.value).length >= 7) self.save({ phone: phoneEl.value, name: nameEl.value, side: side || 'cust' }); });
        nameEl.addEventListener('blur', function () { if (nameEl.value && self.norm(phoneEl.value).length >= 7) self.save({ phone: phoneEl.value, name: nameEl.value, side: side || 'cust' }); });
        self.load(); }
    } };
})(window);
