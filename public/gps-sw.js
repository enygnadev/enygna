
// Service Worker para rastreamento GPS em background
const CACHE_NAME = 'gps-tracker-v1';
const urlsToCache = [
  '/',
  '/frota',
  '/frota/gps'
];

// Instalar service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Background sync para localização
self.addEventListener('sync', (event) => {
  if (event.tag === 'gps-sync') {
    event.waitUntil(
      // Sincronizar dados de GPS quando a conexão for restaurada
      syncGpsData()
    );
  }
});

async function syncGpsData() {
  try {
    // Implementar lógica de sincronização quando necessário
    console.log('Sincronizando dados GPS...');
  } catch (error) {
    console.error('Erro na sincronização GPS:', error);
  }
}

// Notificações push (opcional)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Notificação do sistema de frota',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png'
  };

  event.waitUntil(
    self.registration.showNotification('Sistema de Frota', options)
  );
});
