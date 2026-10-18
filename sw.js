/* Group Expenses - offline cache. The app itself is fetched from the network first (so a new version always shows), the saved copy is used when offline. */
const CACHE = 'gxt-site-v11', OCR = 'gxt-ocr-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== OCR).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.indexOf('/ocr/') >= 0) {      /* bill reader files: big, never change - cache first */
    e.respondWith(caches.open(OCR).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }))));
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await Promise.race([fetch(r, { cache: 'no-cache' }), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 5000))]);
      if (res && res.ok) c.put(r, res.clone());
      return res;
    } catch (err) {
      const hit = await caches.match(r, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
