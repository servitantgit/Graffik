/* ================================================================
   GRAFIK GILLETTE — Service Worker (PWA)
   Cache'owanie + powiadomienia push o zmianach
   ================================================================ */
const CACHE_NAME = 'grafik-gillette-' + '8830ee4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/data.js',
  './js/overtime-logic.js',
  './js/core.js',
  './js/ui.js',
  './js/edit.js',
  './js/dashboard.js',
  './js/calendar.js',
  './js/views.js',
  './js/actions.js',
  './js/pwa.js',
  './js/sync.js',
  './js/i18n/pl.js',
  './js/i18n/en.js',
  './js/i18n/uk.js',
  './js/i18n/i18n.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

/* === INSTALL: cache'ujemy wszystkie zasoby === */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* === ACTIVATE: usuwamy stare cache === */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

/* === FETCH: najpierw sieć, potem cache (stale-while-revalidate) === */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Ignoruj żądania z rozszerzeń przeglądarki (chrome-extension://, moz-extension:// itp.)
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

/* === PUSH: pokazujemy powiadomienia === */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Grafik Gillette', body: 'Nadchodzi zmiana!' };
  }
  const options = {
    body: data.body || 'Sprawdź grafik swojej brygady',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './' },
    tag: 'grafik-reminder',
  };
  event.waitUntil(self.registration.showNotification(data.title || '⏰ Grafik Gillette', options));
});

/* === NOTIFICATION CLICK: otwieramy aplikację === */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    event.notification.data && event.notification.data.url ? event.notification.data.url : './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
/* === MESSAGE: обробка команд від клієнта === */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
