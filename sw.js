/* BDL — Service Worker v2.0
   إستراتيجية: الشبكة أولًا لصفحات HTML والبيانات (لا محتوى قديم أبدًا)
              الكاش أولًا للأصول الثابتة فقط (صور، أيقونات، شعار) */
const V='arkan-v148-1220'; /* compare hero redesign */
const STATIC=['./favicon.svg','./arkan-icon-512.png','./arkan-touch-180.png','./site-manifest.json'];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(V)
      .then(c=>c.addAll(STATIC.map(u=>new Request(u,{cache:'reload'}))))
      .catch(()=>null)
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
      /* إجبار الصفحات المفتوحة على التحديث فور تفعيل إصدار جديد */
      .then(()=>self.clients.matchAll({type:'window'}))
      .then(cs=>{cs.forEach(c=>{try{if('navigate' in c)c.navigate(c.url).catch(()=>{});}catch(e){}});})
  );
});


/* ===== Web Share Target: استقبال إيصالات الواتساب (POST محلي) ===== */
const SHARE_CACHE='bdl-v5';

async function arkHandleShare(req){
  try{
    const form=await req.formData();
    const files=[...form.getAll('receipts')].filter(f=>f&&f.size>0);
    const note=String(form.get('text')||'');
    const cache=await caches.open(SHARE_CACHE);
    const idx=[];
    for(const file of files){
      const id='r_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
      const ext=file.type==='application/pdf'?'.pdf':'.jpg';
      const name=(file.name&&file.name.length>3)?file.name:(id+ext);
      await cache.put(arkUrl('__shared__/'+id),
        new Response(file,{headers:{'Content-Type':file.type||'application/octet-stream'}}));
      idx.push({id:id,name:name,type:file.type||'',size:file.size});
    }
    await cache.put(arkUrl('__shared__/index.json'),
      new Response(JSON.stringify({note:note,files:idx,at:Date.now()}),
        {headers:{'Content-Type':'application/json'}}));
    return Response.redirect(arkUrl('share.html?shared='+idx.length),303);
  }catch(err){
    return Response.redirect(arkUrl('share.html?shared=error'),303);
  }
}
function arkUrl(p){return new URL(p,self.registration.scope).href;}

self.addEventListener('fetch',e=>{
  const r=e.request;
  const u0=new URL(r.url);
  if(r.method==='POST'&&u0.pathname.replace(/\/+$/,'').endsWith('/share-target')){
    e.respondWith(arkHandleShare(r));return;
  }
  if(r.method!=='GET')return;
  const url=new URL(r.url);
  if(url.origin!==location.origin)return;

  const isDoc = r.mode==='navigate'
             || r.destination==='document'
             || url.pathname.endsWith('.html')
             || url.pathname.endsWith('/')
             || url.pathname.endsWith('.js')
             || url.pathname.endsWith('.json');

  /* بيانات الأسعار: طزاجة إجبارية — شبكة أولًا بمهلة قصيرة */
  if(url.pathname.endsWith('rates-data.json')){
    e.respondWith((async()=>{
      const net=fetch(r,{cache:'no-store'}).then(res=>{
        if(res&&res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c));}
        return res;});
      const cached=await caches.match(r);
      const first=await Promise.race([net.catch(()=>null),new Promise(res=>setTimeout(()=>res(null),2000))]);
      return first||cached||net;
    })());
    return;
  }
  if(isDoc){
    /* شبكة أولًا حقيقية: أحدث نسخة دائمًا؛ الكاش احتياط انقطاع فقط */
    e.respondWith((async()=>{
      const net=fetch(r,{cache:'no-store'}).then(res=>{
        if(res&&res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c));}
        return res;
      }).catch(()=>null);
      const first=await Promise.race([net,new Promise(res=>setTimeout(()=>res(null),3500))]);
      if(first)return first;
      const cached=await caches.match(r);
      if(cached){e.waitUntil(net);return cached;}
      const res=await net;
      return res||new Response('<!doctype html><meta charset=utf-8><title>BDL</title><body style="font-family:system-ui;display:grid;place-items:center;height:100vh"><div>لا اتصال — أعد المحاولة</div>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
    })());
    return;
  }

  /* الأصول الثابتة: الكاش أولًا */
  e.respondWith(
    caches.match(r).then(hit=>hit||fetch(r).then(res=>{
      if(res&&res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c));}
      return res;
    }).catch(()=>null))
  );
});

/* رسالة من الصفحة لفرض التحديث الفوري */
self.addEventListener('message',e=>{
  if(e.data==='skipWaiting')self.skipWaiting();
  if(e.data==='clearBadge'&&self.registration&&navigator.clearAppBadge)navigator.clearAppBadge().catch(()=>{});
});

/* ═══ Web Push: إشعار رسائل الشات + عداد الأيقونة (iOS PWA) ═══ */
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{};}catch(_){d={body:e.data&&e.data.text()};}
  e.waitUntil((async()=>{
    try{if(navigator.setAppBadge&&d.badge)await navigator.setAppBadge(d.badge);}catch(_){}
    await self.registration.showNotification(d.title||'لبدال',{
      body:d.body||'رسالة جديدة',
      icon:'./arkan-icon-512.png',
      badge:'./arkan-icon-512.png',
      tag:d.tag||'arkan-chat',
      data:{url:d.url||'./chat-v2.html'}
    });
  })());
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./chat-v2.html';
  e.waitUntil((async()=>{
    try{if(navigator.clearAppBadge)await navigator.clearAppBadge();}catch(_){}
    const ws=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const w of ws){if(w.url.indexOf('chat')>-1&&'focus'in w)return w.focus();}
    return clients.openWindow(url);
  })());
});
