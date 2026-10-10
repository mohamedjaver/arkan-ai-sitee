/* bdl-haptic.js — دقّة خفيفة عند كتابة الأرقام (Build 1423).
   أندرويد: navigator.vibrate. آيفون (iOS 17.4+): سفاري لا يدعم vibrate، فتُستعمل نقرة مفتاح switch مخفي — يصدر عنها اهتزاز النظام الخفيف.
   طبقة مستقلة: لا تغيّر أي منطق. تُعطَّل تلقائيًا إن لم يدعمها الجهاز. */
(function(){'use strict';
  var lab=null,last=0;
  function mk(){if(lab)return;try{var w=document.createElement('div');w.setAttribute('aria-hidden','true');w.style.cssText='position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      w.innerHTML='<input type="checkbox" switch id="bdlHapSw" tabindex="-1"><label for="bdlHapSw"></label>';document.body.appendChild(w);lab=w.querySelector('label');}catch(e){}}
  function tick(){var n=Date.now();if(n-last<25)return;last=n;try{if(navigator.vibrate){navigator.vibrate(8);return;}}catch(e){}mk();try{lab&&lab.click();}catch(e){}}
  function isNum(t){if(!t||t.tagName!=='INPUT')return false;var m=(t.getAttribute('inputmode')||'').toLowerCase(),ty=(t.type||'').toLowerCase();return m==='decimal'||m==='numeric'||ty==='number'||ty==='tel';}
  document.addEventListener('input',function(e){if(isNum(e.target))tick();},true);
  window.BDLHaptic={tick:tick};
})();
