/* Operator service worker: web push -> notification (with vibration), click -> focus the board. No offline caching of API. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const isNew = data.type === 'new_order';
  const title = isNew ? `New order #${data.number} - $${data.total}` : (data.title || 'Orders');
  const body = isNew ? `${data.orderType === 'delivery' ? 'Delivery' : 'Pickup'} - ${data.name || ''}` : (data.body || '');
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body, tag: isNew ? `order-${data.orderId}` : 'orders', renotify: true, requireInteraction: isNew,
      vibrate: isNew ? [500, 200, 500, 200, 500, 200, 500] : [200], data,
      icon: '/orderapp/operator/icon-192.png', badge: '/orderapp/operator/icon-192.png',
    });
    // wake open tabs so they ring immediately even if SSE reconnecting
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ type: 'push', data }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = '/orderapp/operator/';
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) { if ('focus' in c) { c.postMessage({ type: 'focus-order', data: event.notification.data }); return c.focus(); } }
    return self.clients.openWindow(url);
  })());
});
