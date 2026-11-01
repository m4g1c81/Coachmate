// Cambia il numero di versione ad ogni aggiornamento dell'app per forzare il refresh della cache
const CACHE = 'spesecasa-v15';
const ASSETS = ['./', 'index.html', 'manifest.json', 'lib/chart.umd.js', 'lib/xlsx.full.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/logo-cutout.png', 'splash/splash-1170x2532.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Network first per index.html (aggiornamenti subito), cache first per il resto
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('index.html');
  e.respondWith(isPage
    ? fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
    : caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; })));
});
