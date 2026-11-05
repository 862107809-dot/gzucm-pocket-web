/* Cache namespace v5: old cache-first app.js caused a permanent boot screen. */
const CACHE = 'gzucm-pocket-web-v33-20261105-appstore1';
const ASSETS = ['/', '/index.html', '/styles.css?v=20261105-appstore1', '/vendor/liquid-glass.js?v=20261104-mit-glass1', '/glass-effects.js?v=20261105-smooth-month16', '/i18n.js?v=20261105-bridge1', '/data.js?v=20261104-fix2', '/haptics.js?v=20261105-haptics1', '/power-insights.js?v=20261105-power3', '/power-snapshots.js?v=20261105-bridge2', '/app.js?v=20261105-appstore1', '/boot-check.js?v=20261104-fix2', '/manifest.webmanifest', '/assets/icon.svg', '/assets/apple-touch-icon.png'];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 const req = event.request;
 const url = new URL(req.url);
 if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/deployment-config.js' || url.pathname === '/health') return;
 if (req.mode === 'navigate') {
  event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
  return;
 }
 // The UI always prefers freshly deployed JavaScript/CSS; cached copies are offline fallbacks only.
 if (/\.(?:js|css)$/.test(url.pathname)) {
  event.respondWith(fetch(req).then(response => {
   if (response.ok) {
    const backup = response.clone();
    caches.open(CACHE).then(cache => cache.put(req, backup)).catch(() => {});
   }
   return response;
  }).catch(() => caches.match(req)));
  return;
 }
 event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
