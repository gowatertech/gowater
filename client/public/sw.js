// Nombre de la caché
const CACHE_NAME = 'gowater-driver-cache-v1';

// Recursos a cachear inicialmente
const initialResources = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/offline-logo.svg',
  '/favicon.ico'
];

// Al instalar el Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cargando recursos en caché');
        return cache.addAll(initialResources);
      })
  );
});

// Al activar el Service Worker (después de la instalación)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('Service Worker: Eliminando caché antigua', name);
            return caches.delete(name);
          })
      );
    })
  );
});

// Estrategia de caché: Network first, falling back to cache
self.addEventListener('fetch', (event) => {
  // No interceptar peticiones a la API u otras que no sean recursos estáticos
  if (event.request.url.includes('/api/') || 
      event.request.method !== 'GET' ||
      event.request.url.includes('/socket.io/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Solo cachear respuestas válidas
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clonar la respuesta porque se puede usar solo una vez
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then((cache) => {
            console.log('Service Worker: Guardando en caché', event.request.url);
            cache.put(event.request, responseToCache);
          });
        
        return response;
      })
      .catch(() => {
        console.log('Service Worker: Fallback a caché para', event.request.url);
        
        return caches.match(event.request)
          .then((cachedResponse) => {
            // Si está en caché, devolver la respuesta cacheada
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si es una solicitud de página web, mostrar la página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            // Si es una solicitud de imagen, devolver una imagen de fallback
            if (event.request.destination === 'image') {
              return caches.match('/assets/offline-logo.svg');
            }
            
            // Para otros recursos, simplemente fallar
            return new Response('Error de red', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Sincronizar datos pendientes cuando la conexión se restaura
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-data') {
    console.log('Service Worker: Sincronizando datos pendientes');
    event.waitUntil(syncPendingData());
  }
});

// Función para sincronizar datos pendientes (esta sería llamada desde el front)
function syncPendingData() {
  return new Promise((resolve) => {
    // Aquí se enviaría un mensaje al cliente para que inicie la sincronización
    self.clients.matchAll().then((clients) => {
      if (clients && clients.length) {
        // Enviar mensaje al cliente para que inicie sincronización
        clients[0].postMessage({
          action: 'sync-data'
        });
      }
    });
    
    resolve();
  });
}

// Escuchar mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});