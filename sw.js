// Minimal service worker — satisfies PWA installability requirement.
// No caching: admin data must always be fresh from the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
