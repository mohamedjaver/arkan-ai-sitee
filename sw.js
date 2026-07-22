/* ARKAN Rates — Service Worker v2.0
   إستراتيجية: الشبكة أولًا لصفحات HTML والبيانات (لا محتوى قديم أبدًا)
              الكاش أولًا للأصول الثابتة فقط (صور، أيقونات، شعار) */
const V='arkan-v2.0';
const STATIC=['./arkan-logo.svg','./arkan-icon-512.png','./apple-touch-icon.png','./site-manifest.json'];

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
  );
});

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const url=new URL(r.url);
  if(url.origin!==location.origin)return;

  const isDoc = r.mode==='navigate'
             || r.destination==='document'
             || url.pathname.endsWith('.html')
             || url.pathname.endsWith('/')
             || url.pathname.endsWith('.js')
             || url.pathname.endsWith('.json');

  if(isDoc){
    /* الشبكة أولًا: دائمًا أحدث نسخة */
    e.respondWith(
      fetch(r,{cache:'no-store'})
        .then(res=>{
          if(res&&res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c));}
          return res;
        })
        .catch(()=>caches.match(r).then(hit=>hit||caches.match('./offline.html')))
    );
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
});
