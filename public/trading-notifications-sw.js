// Notifications only: no fetch interception, caching, push subscription or trading actions.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => client.url.includes('/#/stock'));
    if (existing) return existing.focus();
    return undefined;
  }));
});
