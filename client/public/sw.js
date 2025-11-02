// Nombre de la caché  
const CACHE_NAME = 'gowater-driver-cache-v4';
const STATIC_CACHE = 'gowater-static-v4';
const DYNAMIC_CACHE = 'gowater-dynamic-v4';
const MAP_TILES_CACHE = 'gowater-maps-v4';

// Recursos a cachear inicialmente
const initialResources = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/offline-logo.svg',
  '/favicon.ico'
];

// Recursos estáticos que deben cachearse con estrategia Cache-First
const staticResources = [
  '/assets/',
  '/images/',
  '.css',
  '.js',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot'
];

// Al instalar el Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker v4: Instalando...');
  // Forzar activación inmediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cargando recursos en caché');
        return cache.addAll(initialResources);
      })
      .catch((error) => {
        console.error('Service Worker: Error al cachear recursos iniciales', error);
      })
  );
});

// Al activar el Service Worker (después de la instalación)
self.addEventListener('activate', (event) => {
  console.log('Service Worker v4: Activando...');
  
  const cacheWhitelist = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, MAP_TILES_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !cacheWhitelist.includes(name))
          .map((name) => {
            console.log('Service Worker: Eliminando caché antigua', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Forzar a todos los clientes a usar el nuevo service worker
      return self.clients.claim();
    })
  );
});

// Función auxiliar para determinar si un recurso es estático
function isStaticResource(url) {
  return staticResources.some(pattern => url.includes(pattern));
}

// Función auxiliar para determinar si es un tile de mapa
function isMapTile(url) {
  return url.includes('openstreetmap.org') || url.includes('tile.openstreetmap.org');
}

// Estrategia de caché mejorada
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  
  // No interceptar peticiones a la API (las manejará IndexedDB)
  if (url.includes('/api/') || 
      request.method !== 'GET' ||
      url.includes('/socket.io/')) {
    return;
  }
  
  // Estrategia Cache-First para tiles de mapas (muy importantes para offline)
  if (isMapTile(url)) {
    event.respondWith(
      caches.open(MAP_TILES_CACHE).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          
          return fetch(request).then(fetchResponse => {
            if (fetchResponse && fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            // Si no hay red y no está en caché, retornar tile vacío
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }
  
  // Estrategia Cache-First para recursos estáticos
  if (isStaticResource(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          
          return fetch(request).then(fetchResponse => {
            if (fetchResponse && fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }
  
  // Estrategia Network-First para páginas HTML y otros recursos dinámicos
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Solo cachear respuestas válidas
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clonar la respuesta porque se puede usar solo una vez
        const responseToCache = response.clone();
        
        caches.open(DYNAMIC_CACHE)
          .then((cache) => {
            cache.put(request, responseToCache);
          });
        
        return response;
      })
      .catch(async () => {
        // Try cache first
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // For navigation requests, try to serve the main app
        // The app will handle offline state internally
        if (request.mode === 'navigate') {
          const appShell = await caches.match('/');
          if (appShell) {
            return appShell;
          }
          
          // Last resort: offline page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
        }
        
        // For images, try to serve fallback
        if (request.destination === 'image') {
          const fallbackImage = await caches.match('/assets/offline-logo.svg');
          if (fallbackImage) {
            return fallbackImage;
          }
        }
        
        // For all other failed requests
        return new Response('Offline - Resource not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Background Sync API - Sincronizar datos pendientes cuando la conexión se restaura
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    console.log('[Service Worker] Background Sync triggered: syncing pending actions');
    event.waitUntil(syncPendingData());
  }
});

// Función para sincronizar datos pendientes
async function syncPendingData() {
  try {
    console.log('[Service Worker] Starting background sync...');
    
    // Open IndexedDB directly from service worker
    const db = await openIndexedDB();
    
    // Get pending actions
    const pendingActions = await getPendingActionsFromDB(db);
    
    if (pendingActions.length === 0) {
      console.log('[Service Worker] No pending actions to sync');
      
      // Still notify clients in case they need to refresh
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({
          type: 'BACKGROUND_SYNC',
          action: 'sync-completed',
          count: 0
        });
      }
      
      return true;
    }
    
    console.log('[Service Worker] Syncing', pendingActions.length, 'pending actions');
    let syncedCount = 0;
    let failedCount = 0;
    let hasErrors = false;
    
    // Process each pending action
    for (const action of pendingActions) {
      try {
        let success = false;
        
        switch (action.type) {
          case 'delivery':
            success = await syncDeliveryFromSW(action.data);
            break;
          case 'payment':
            success = await syncPaymentFromSW(action.data);
            break;
          case 'bottle-return':
            success = await syncBottleReturnFromSW(action.data);
            break;
          case 'route-status':
            success = await syncRouteStatusFromSW(action.data);
            break;
          case 'order-status':
            success = await syncOrderStatusFromSW(action.data);
            break;
        }
        
        if (success && action.id) {
          // Successfully synced - remove from queue
          await deletePendingActionFromDB(db, action.id);
          syncedCount++;
          console.log('[Service Worker] Synced action:', action.type, action.id);
        } else if (action.id) {
          // Failed to sync - increment retry count but keep as pending
          // This ensures Background Sync will retry
          const currentRetryCount = action.retryCount || 0;
          
          if (currentRetryCount < 5) {
            // Still within retry limit - keep as pending for next sync
            await updatePendingActionRetryCount(db, action.id, currentRetryCount + 1, 'Sync failed');
            failedCount++;
            hasErrors = true;
            console.warn('[Service Worker] Sync failed, will retry:', action.type, action.id);
          } else {
            // Exceeded retry limit - mark as error so it doesn't block future syncs
            await updatePendingActionStatusInDB(db, action.id, 'error', 'Max retries exceeded');
            failedCount++;
            console.error('[Service Worker] Max retries exceeded for:', action.type, action.id);
          }
        }
      } catch (error) {
        console.error('[Service Worker] Error syncing action:', error);
        if (action.id) {
          const currentRetryCount = action.retryCount || 0;
          if (currentRetryCount < 5) {
            await updatePendingActionRetryCount(db, action.id, currentRetryCount + 1, String(error));
            failedCount++;
            hasErrors = true;
          } else {
            await updatePendingActionStatusInDB(db, action.id, 'error', String(error));
            failedCount++;
          }
        }
      }
    }
    
    console.log('[Service Worker] Background sync completed:', syncedCount, 'synced,', failedCount, 'failed');
    
    // Notify all clients about sync completion
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'sync-completed',
        count: syncedCount,
        failed: failedCount
      });
    }
    
    // If any actions failed and should be retried, throw error to trigger Background Sync retry
    if (hasErrors) {
      // Re-register sync for retry
      console.log('[Service Worker] Re-registering background sync for retry');
      // Background Sync will automatically retry due to the thrown error
      throw new Error(`${failedCount} actions failed, will retry`);
    }
    
    // Check if there are still any pending actions left (shouldn't be at this point)
    const remainingPending = await getPendingActionsFromDB(db);
    if (remainingPending.length > 0) {
      console.log('[Service Worker] Found', remainingPending.length, 'pending actions remaining, re-registering sync');
      // Safety net: re-register sync if work remains
      await self.registration.sync.register('sync-pending-actions');
    }
    
    return true;
  } catch (error) {
    console.error('[Service Worker] Error during background sync:', error);
    
    // Re-register sync to try again later
    try {
      await self.registration.sync.register('sync-pending-actions');
      console.log('[Service Worker] Re-registered sync after error');
    } catch (regError) {
      console.error('[Service Worker] Failed to re-register sync:', regError);
    }
    
    // Throw to signal failure to Background Sync API
    throw error;
  }
}

// IndexedDB helpers for service worker
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = self.indexedDB.open('gowater-offline-db', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getPendingActionsFromDB(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingActions'], 'readonly');
    const store = transaction.objectStore('pendingActions');
    const index = store.index('by-status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function deletePendingActionFromDB(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function updatePendingActionStatusInDB(db, id, status, errorMessage) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const action = getRequest.result;
      if (action) {
        action.status = status;
        if (errorMessage) {
          action.lastError = errorMessage;
        }
        if (status === 'error') {
          action.retryCount = (action.retryCount || 0) + 1;
        }
        
        const putRequest = store.put(action);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

function updatePendingActionRetryCount(db, id, retryCount, errorMessage) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const action = getRequest.result;
      if (action) {
        // Keep status as 'pending' so it will be retried
        action.retryCount = retryCount;
        if (errorMessage) {
          action.lastError = errorMessage;
        }
        
        const putRequest = store.put(action);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Sync helpers that make API calls
async function syncDeliveryFromSW(data) {
  try {
    const response = await fetch(`/api/orders/${data.orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: data.status,
        deliveredAt: data.deliveredAt,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[SW] Error syncing delivery:', error);
    return false;
  }
}

async function syncPaymentFromSW(data) {
  try {
    const response = await fetch(`/api/orders/${data.orderId}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        paymentMethod: data.paymentMethod,
        amountPaid: data.amountPaid,
        paymentDate: data.paymentDate,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[SW] Error syncing payment:', error);
    return false;
  }
}

async function syncBottleReturnFromSW(data) {
  try {
    const response = await fetch('/api/bottle-returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (error) {
    console.error('[SW] Error syncing bottle return:', error);
    return false;
  }
}

async function syncRouteStatusFromSW(data) {
  try {
    const response = await fetch(`/api/routes/${data.routeId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[SW] Error syncing route status:', error);
    return false;
  }
}

async function syncOrderStatusFromSW(data) {
  try {
    const response = await fetch(`/api/orders/${data.orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: data.status,
        notes: data.notes,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[SW] Error syncing order status:', error);
    return false;
  }
}

// Escuchar mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});