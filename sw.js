const CACHE = 'gzucm-pocket-web-v4';
const ASSETS = ['/', '/index.html', '/styles.css', '/data.js', '/app.js', '/manifest.webmanifest', '/assets/icon.svg', '/assets/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin) || new URL(req.url).pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
  } else {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
