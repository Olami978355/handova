self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Handova', body: 'You have a new notification' }; }
  const options = { body: data.body || 'You have a new notification', data: { url: data.url || '/dashboard' } };
  event.waitUntil(self.registration.showNotification(data.title || 'Handova', options));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => { for (const c of list) { if (c.url.includes(self.location.origin)) return c.focus(); } if (self.clients.openWindow) return self.clients.openWindow(url); }));
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
