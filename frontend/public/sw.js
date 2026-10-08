// Service Worker for Talk Cross PWA Installability & Push Notifications
const CACHE_NAME = 'talkcross-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network requests pass through natively for real-time WebSocket and API calls
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Handle push notification clicks - focus or open window to the exact conversation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || '/chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if a Talk Cross tab is already open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (data.conversationId) {
            client.postMessage({
              type: 'NAVIGATE_CHAT',
              conversationId: data.conversationId,
            });
          }
          if ('navigate' in client && !client.url.includes(targetUrl)) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle background push messages
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Talk Cross';
    const options = {
      body: payload.body || 'You received a new message',
      icon: payload.icon || '/icon-192.png',
      badge: '/icon-192.png',
      image: payload.image,
      tag: payload.tag || 'talkcross-notification',
      data: payload.data || { url: '/chat' },
      vibrate: [120, 60, 120],
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push event in SW:', err);
  }
});
