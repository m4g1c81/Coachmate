/*! CoachMate Volleyball — © 2026 Marco. Tutti i diritti riservati.
 *  È vietata la copia, la modifica e la distribuzione, anche parziale, senza autorizzazione scritta dell'autore. */
/* CoachMate – service worker: l'app funziona anche senza connessione */
const CACHE = 'coachmate-v11';
const FILES = ['./', './index.html', './manifest.webmanifest', './style.min.css?v=11', './app.min.js?v=11',
  './img/icon-180.png', './img/icon-192.png', './img/icon-512.png', './img/icon-maskable-512.png', './img/splash.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rete prima (così gli aggiornamenti arrivano subito), cache se offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // no-cache: chiede sempre al server se il file è cambiato (niente versioni vecchie)
    fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(r => {
      if (!r.ok) return r;
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
