/* ARKAN Rates — Service Worker v2.0
   إستراتيجية: الشبكة أولًا لصفحات HTML والبيانات (لا محتوى قديم أبدًا)
              الكاش أولًا للأصول الثابتة فقط (صور، أيقونات، شعار) */
const V='arkan-v3.3';
const STATIC=['./arkan-logo.svg','./arkan-icon-512.png','./arkan-touch-180.png','./site-manifest.json'];

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


/* ===== Web Share Target: استقبال إيصالات الواتساب (POST محلي) ===== */
const SHARE_CACHE='arkan-share-v1';

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
    return Response.redirect(arkUrl('settlement.html?shared='+idx.length),303);
  }catch(err){
    return Response.redirect(arkUrl('settlement.html?shared=error'),303);
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
