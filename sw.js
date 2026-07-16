/* ARKAN hub service worker — network-first (never stale), offline fallback */
const VERSION = 'arkan-v903';
const SHELL = [
  './',
  'index.html',
  'app.webmanifest',
  'arkan-icon-192.png',
  'arkan-icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Documents / navigations: NETWORK-FIRST so content is always fresh.
  const isDoc = req.mode === 'navigate' || req.destination === 'document' ||
                url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isDoc) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  // Static assets (icons, json, fonts): stale-while-revalidate.
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
