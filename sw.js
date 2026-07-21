/* ARKAN SETTLEMENTS — Service Worker */
const V='arkan-v1.3';
const CORE=['./','./index.html','./rates.html','./request.html','./arkan-logo.svg','./arkan-icon-512.png','./apple-touch-icon.png','./i18n.js','./site-manifest.json','./offline.html','./config.js','./integrations.js'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const url=new URL(r.url);
  /* لا تتدخل في الطلبات الخارجية (TradingView, CoinGecko, fonts) */
  if(url.origin!==location.origin)return;
  /* بيانات الأسعار: الشبكة أولًا (طازجة) ثم الكاش */
  if(url.pathname.endsWith('rates-data.json')){
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put(r,c));return res;}).catch(()=>caches.match(r)));
    return;
  }
  /* بقية الأصول: الكاش أولًا ثم الشبكة */
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
    if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c));}
    return res;
  }).catch(()=>caches.match('./offline.html')||caches.match('./index.html'))));
});
