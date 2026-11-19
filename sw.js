/* AptFit Coach service worker — offline app shell.
   The app is one self-contained file (CSS/JS/icons are inlined), so caching it makes the whole app work offline.
   Bump CACHE when you publish a new index.html. */
const CACHE = 'aptfit-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // no skipWaiting: a new version waits until the app asks (the "Update ready — tap to refresh" bar) or every tab is closed
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('aptfit-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') { // network first (picks up updates), cache fallback when offline
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  if (url.origin === location.origin) { // same-origin assets: cache first, refresh in background
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
