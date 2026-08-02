/* ARKAN GATE — حماية الصفحات: لا دخول إلا بحساب مسجّل (جلسة عميل أو Firebase) */
(function(){
  var here=(location.pathname.split('/').pop()||'index.html');
  var PUBLIC=['index.html','home-v2.html','login.html','offline.html','brand.html'];
  if(PUBLIC.indexOf(here)>-1) return;
  // إخفاء فوري حتى يُتحقق (fail-closed)
  var st=document.createElement('style'); st.id='ark-gate-style';
  st.textContent='body{visibility:hidden!important}';
  (document.head||document.documentElement).appendChild(st);
  function allow(){ var e=document.getElementById('ark-gate-style'); if(e)e.remove(); }
  function deny(){ location.replace('login.html?next='+encodeURIComponent(here)); }
  function session(){ try{return JSON.parse(localStorage.getItem('arkan_session')||'null');}catch(e){return null;} }
  document.addEventListener('DOMContentLoaded',function(){
    if(session()){ allow(); return; }          // عميل مسجّل (phone+PIN)
    // انتظر Firebase (أدمن مسجّل عبر auth) حتى 4 ثوانٍ
    var t=setTimeout(deny,4000), tries=0;
    (function poll(){
      var A=window.ARKAN;
      if(A&&A.ready){ A.ready.then(function(){ 
        if(A.firebaseOK&&A.auth){ 
          try{ A.fb.onAuthStateChanged(A.auth,function(u){ clearTimeout(t); u?allow():deny(); }); return;}catch(e){}
        }
        clearTimeout(t); deny();
      }); return; }
      if(++tries<40) setTimeout(poll,100); 
    })();
  });
})();
