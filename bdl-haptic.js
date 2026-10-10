/* bdl-haptic.js — دقّة خفيفة عند كتابة الأرقام (Build 1424).
   أندرويد فقط عبر navigator.vibrate. على الآيفون أُلغيت: الطريقة البديلة (مفتاح مخفي) كانت تسحب التركيز من خانة الكتابة فتُغلق لوحة المفاتيح مع كل رقم. */
(function(){'use strict';var last=0;
  function tick(){var n=Date.now();if(n-last<25)return;last=n;try{if(navigator.vibrate)navigator.vibrate(8);}catch(e){}}
  function isNum(t){if(!t||t.tagName!=='INPUT')return false;var m=(t.getAttribute('inputmode')||'').toLowerCase(),ty=(t.type||'').toLowerCase();return m==='decimal'||m==='numeric'||ty==='number'||ty==='tel';}
  document.addEventListener('input',function(e){if(isNum(e.target))tick();},true);window.BDLHaptic={tick:tick};})();
