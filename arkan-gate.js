/* ARKAN GATE v2 — حماية بأدوار: عام / عميل / أدمن (fail-closed) */
(function(){
  var here=(location.pathname.split('/').pop()||'index.html');
  var PUBLIC=['index.html','home-v2.html','login.html','offline.html','brand.html'];
  var ADMIN =['settlement.html','admin.html','rates-admin.html','archive.html','trading.html','invoice.html'];
  /* صفحات تتطلب حساب عميل مسجلًا دائمًا — تجاوز الأدمن لا يكفي */
  var CLIENT_STRICT=['request.html','chat-v2.html','settings.html','app.html'];
  if(PUBLIC.indexOf(here)>-1) return;
  var needAdmin = ADMIN.indexOf(here)>-1;
  var needClient = CLIENT_STRICT.indexOf(here)>-1;

  /* إخفاء فوري حتى التحقق */
  var st=document.createElement('style'); st.id='ark-gate-style';
  st.textContent='body{visibility:hidden!important}';
  (document.head||document.documentElement).appendChild(st);
  function allow(){ var e=document.getElementById('ark-gate-style'); if(e)e.remove(); }
  function denyLogin(){ location.replace((needClient?'account.html':'login.html')+'?next='+encodeURIComponent(here)); }
  function denyHome(){ location.replace('index.html'); }
  function session(){ try{return JSON.parse(localStorage.getItem('arkan_session')||'null');}catch(e){return null;} }
  function clientSession(){
    var s=session(); if(s&&s.phone)return true;
    try{var c=JSON.parse(localStorage.getItem('arkanClient')||'null');if(c&&c.phone)return true;}catch(e){}
    return false;
  }
  /* جهاز موثّق كأدمن: يُمنح فقط بعد دخول Firebase أدمن ناجح على هذا الجهاز */
  function adminDevice(){ return localStorage.getItem('arkan_admin_dev')==='1'; }
  window.ARKAN_MARK_ADMIN=function(){ localStorage.setItem('arkan_admin_dev','1'); };

  document.addEventListener('DOMContentLoaded',function(){
    if(needClient){
      /* حساب عميل إجباري — الأدمن أيضًا يحتاج جلسة عميل هنا */
      if(clientSession()){ allow(); return; }
      denyLogin(); return;
    }
    if(!needAdmin){
      /* صفحات العميل: جلسة عميل أو أدمن تكفي */
      if(session()||adminDevice()){ allow(); return; }
    }else{
      /* صفحات الأدمن: جهاز أدمن موثّق يكفي فورًا */
      if(adminDevice()){ allow(); watchAdmin(); return; }
    }
    /* انتظر Firebase حتى 4 ثوانٍ */
    var t=setTimeout(function(){ needAdmin?denyHome():denyLogin(); },4000), tries=0;
    (function poll(){
      var A=window.ARKAN;
      if(A&&A.ready){ A.ready.then(function(){
        if(A.firebaseOK&&A.auth){
          try{
            A.fb.onAuthStateChanged(A.auth,function(u){
              clearTimeout(t);
              var isAdm=!!(u&&u.email&&A.isAdminEmail&&A.isAdminEmail(u.email));
              if(needAdmin){
                if(isAdm){ localStorage.setItem('arkan_admin_dev','1'); allow(); }
                else denyHome();
              }else{
                (u||session())?allow():denyLogin();
              }
            }); return;
          }catch(e){}
        }
        clearTimeout(t); needAdmin?denyHome():denyLogin();
      }); return; }
      if(++tries<40) setTimeout(poll,100);
    })();
  });
  /* مراقبة صامتة: إن سجّل الأدمن خروجه لاحقًا يبقى الجهاز موثّقًا (جهازه الشخصي) */
  function watchAdmin(){}
})();
