/* Offline support for the Kyogyera League site.
 * - Site files (pages, styles, scripts, badge): network first, so updates show
 *   straight away; if the signal is gone or too slow, the saved copy is used.
 * - Fonts and images: saved copy first (they rarely change).
 * - Score sheet data is never cached here — the pages keep their own saved copy. */
const CACHE = 'kyogyera-v1';
const SHELL = [
  './', 'index.html', 'matches.html', 'groups.html', 'table.html', 'knockout.html', 'stats.html',
  'teams.html', 'team.html', 'match.html', 'gallery.html', 'info.html',
  'styles.css', 'config.js', 'manifest.webmanifest',
  'js/data.js', 'js/model.js', 'js/ui.js', 'js/charts.js',
  'js/pages/home.js', 'js/pages/matches.js', 'js/pages/groups.js', 'js/pages/table.js', 'js/pages/knockout.js',
  'js/pages/stats.js', 'js/pages/teams.js', 'js/pages/team.js', 'js/pages/match.js', 'js/pages/gallery.js', 'js/pages/info.js',
  'assets/kyogyera-badge-256.webp', 'assets/kyogyera-badge-400.webp', 'assets/favicon-64.png',
];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Live data: always straight from the network.
  if (url.hostname.endsWith('google.com') && !url.hostname.startsWith('fonts')) return;
  if (url.pathname.endsWith('.csv')) return;

  if (url.origin === location.origin) {
    const isAsset = /\/assets\/.+\.(png|jpe?g|webp|svg)$/.test(url.pathname);
    e.respondWith(isAsset ? cacheFirst(req) : networkFirst(req));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || req.destination === 'image') {
    e.respondWith(cacheFirst(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)),
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const saved = await cache.match(req, { ignoreSearch: true });
    if (saved) return saved;
    // Timed out and nothing saved: keep waiting for the network after all.
    return fetch(req);
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(req);
  if (saved) return saved;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}
