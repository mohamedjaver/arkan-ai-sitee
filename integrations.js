/* ARKAN — تحميل التكاملات المُعدّة فقط (آمن مع القيم الفارغة) */
(function(){
  var C=window.ARKAN_CONFIG||{};

  /* ---------- Google Analytics 4 ---------- */
  if(C.ga4){
    var g=document.createElement('script');
    g.async=true;g.src='https://www.googletagmanager.com/gtag/js?id='+C.ga4;
    document.head.appendChild(g);
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){dataLayer.push(arguments);};
    gtag('js',new Date());gtag('config',C.ga4);
  }
  /* دالة تتبع موحدة تعمل حتى بلا GA (تسجّل في الكونسول فقط) */
  window.arkanTrack=function(name,params){
    try{ if(window.gtag)gtag('event',name,params||{}); }catch(e){}
  };

  /* ---------- Tawk.to ---------- */
  if(C.tawkto){
    window.Tawk_API=window.Tawk_API||{};window.Tawk_LoadStart=new Date();
    var t=document.createElement('script');
    t.async=true;t.src='https://embed.tawk.to/'+C.tawkto;
    t.charset='UTF-8';t.setAttribute('crossorigin','*');
    document.head.appendChild(t);
  }

  /* ---------- OneSignal ---------- */
  if(C.onesignal){
    var o=document.createElement('script');
    o.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';o.defer=true;
    document.head.appendChild(o);
    window.OneSignalDeferred=window.OneSignalDeferred||[];
    OneSignalDeferred.push(function(OneSignal){
      OneSignal.init({appId:C.onesignal,allowLocalhostAsSecureOrigin:true});
    });
  }

  /* ---------- EmailJS ---------- */
  if(C.emailjs&&C.emailjs.publicKey){
    var e=document.createElement('script');
    e.src='https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    e.onload=function(){try{emailjs.init({publicKey:C.emailjs.publicKey});}catch(x){}};
    document.head.appendChild(e);
  }
  /* إرسال طلب بالبريد — يُستدعى من submitOrder، ويتجاهل بصمت إن لم يُعد */
  window.arkanEmail=function(data){
    var E=C.emailjs||{};
    if(!E.publicKey||!E.serviceId||!E.templateId||!window.emailjs)return Promise.resolve(false);
    return emailjs.send(E.serviceId,E.templateId,data).then(function(){return true;}).catch(function(){return false;});
  };

  /* ---------- Firebase (اختياري) ---------- */
  window.arkanSaveOrder=function(order){
    var F=C.firebase||{};
    if(!F.apiKey)return Promise.resolve(false);
    return import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js').then(function(app){
      return import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js').then(function(fs){
        var a=app.initializeApp(F);
        var db=fs.getFirestore(a);
        return fs.addDoc(fs.collection(db,'orders'),Object.assign({},order,{createdAt:new Date().toISOString()})).then(function(){return true;});
      });
    }).catch(function(){return false;});
  };

  /* ---------- Service Worker (PWA) ---------- */
  if('serviceWorker' in navigator&&location.protocol==='https:'){
    addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
  }
})();
