/* bdl-core.js — أدوات مشتركة: تنسيق المبالغ والتواريخ والجلسة (Build 1294) */
(function (g) { 'use strict';
  var fmt = function (n, d) { var v = Number(n) || 0; return (d ? Math.round(v * Math.pow(10, d)) / Math.pow(10, d) : Math.round(v)).toLocaleString('en-US', { maximumFractionDigits: d || 0 }); };
  g.BDL = { fmt: fmt, money: function (n, ccy) { return fmt(n) + ' ' + (ccy || 'AOA'); }, date: function (s) { return s ? String(s).slice(0, 10) : ''; },
    token: function () { try { var j = JSON.parse(localStorage.getItem('arkan_sb_jwt') || 'null'); if (j && j.token && j.exp > Math.floor(Date.now() / 1000) + 60) return j.token; } catch (e) {} return null; },
    isOwner: function () { try { var s = JSON.parse(localStorage.getItem('arkan_session') || 'null'); return /36295050$/.test(String(s && s.phone || '').replace(/\D/g, '')) || localStorage.getItem('arkan_admin_dev') === '1'; } catch (e) { return false; } },
    api: 'https://arkan-ai-site-production.up.railway.app' };
})(window);
