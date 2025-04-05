/**
 * Service Worker para GoWater Driver
 * 
 * Este Service Worker proporciona:
 * - Funcionamiento offline
 * - Sincronización en segundo plano
 * - Caché de recursos estáticos
 * - Notificaciones push
 */

// Nombre de la caché
const CACHE_NAME = 'gowater-driver-v1';

// Recursos a cachear inicialmente
const INITIAL_CACHED_RESOURCES = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/logo.png',
  '/assets/notification-badge.png',
  // Agregar más recursos según sea necesario
];

// Instalación: Precachear recursos estáticos
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando');
  
  // Forzar la activación inmediata
  self.skipWaiting();
  
  // Cachear recursos iniciales
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precacheando recursos');
        return cache.addAll(INITIAL_CACHED_RESOURCES);
      })
      .catch(error => {
        console.error('[Service Worker] Error al precachear recursos:', error);
      })
  );
});

// Activación: Limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando');
  
  // Tomar control inmediatamente
  event.waitUntil(clients.claim());
  
  // Limpiar cachés antiguas
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[Service Worker] Eliminando caché antigua:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones de API
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Estrategia network-first para la mayoría de peticiones
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clonar respuesta para la caché
        const responseToCache = response.clone();
        
        // Guardar en caché
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          })
          .catch(error => {
            console.error('[Service Worker] Error al cachear respuesta:', error);
          });
        
        return response;
      })
      .catch(() => {
        // Si la red falla, intentar desde la caché
        return caches.match(event.request)
          .then(cachedResponse => {
            // Si está en caché, devolver respuesta cacheada
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si es una petición de navegación, mostrar página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            // Si no está en caché y no es navegación, devolver error
            return new Response('No hay conexión a Internet', {
              status: 503,
              statusText: 'Servicio no disponible'
            });
          });
      })
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync evento recibido:', event.tag);
  
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

// Función para sincronizar datos pendientes
function syncPendingData() {
  console.log('[Service Worker] Iniciando sincronización de datos pendientes');
  
  return new Promise((resolve, reject) => {
    // Enviar mensaje a los clientes activos
    self.clients.matchAll({ type: 'window' })
      .then(clients => {
        if (clients && clients.length) {
          // Enviar mensaje al cliente para iniciar sincronización
          clients[0].postMessage({
            action: 'sync-data'
          });
          
          // La sincronización real ocurrirá en el cliente
          resolve();
        } else {
          console.log('[Service Worker] No hay clientes activos para sincronizar');
          
          // Intentarlo más tarde
          setTimeout(() => {
            // Verificar si la API sync está disponible
            if (self.registration && 'sync' in self.registration) {
              self.registration.sync.register('sync-pending-data')
                .then(() => {
                  console.log('[Service Worker] Registro de sincronización programado para más tarde');
                  resolve();
                })
                .catch(error => {
                  console.error('[Service Worker] Error al registrar sincronización:', error);
                  reject(error);
                });
            } else {
              console.log('[Service Worker] La API Sync no está disponible en este navegador');
              resolve(); // Resolver de todas formas
            }
          }, 5000);
        }
      });
  })
  .then(syncResult => {
    // Enviar notificación si la sincronización fue exitosa
    return showSyncNotification();
  })
  .catch(error => {
    console.error('[Service Worker] Error durante la sincronización:', error);
  });
}

// Mostrar notificación de sincronización
function showSyncNotification() {
  if ('Notification' in self && self.Notification.permission === 'granted') {
    return self.registration.showNotification('GoWater Driver', {
      body: 'Tus datos han sido sincronizados correctamente',
      icon: '/assets/logo.png',
      badge: '/assets/notification-badge.png',
      tag: 'sync-complete',
      data: {
        url: self.location.origin
      }
    });
  }
  return Promise.resolve();
}

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Abrir la aplicación cuando se hace clic en la notificación
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then(clients => {
          // Si ya hay una ventana abierta, enfocarla
          for (const client of clients) {
            if (client.url === event.notification.data.url && 'focus' in client) {
              return client.focus();
            }
          }
          // Si no hay ventana abierta, abrir una nueva
          if (self.clients.openWindow) {
            return self.clients.openWindow(event.notification.data.url);
          }
        })
    );
  }
});

// Manejar mensajes
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Mensaje recibido:', event.data);
  
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});