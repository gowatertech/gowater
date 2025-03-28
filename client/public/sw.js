// Nombre de la caché
const CACHE_NAME = 'gowater-driver-cache-v1';

// Recursos a cachear inicialmente
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/src/pages/mobile-app/index.tsx',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png',
  // Agrega aquí otras rutas y recursos esenciales
];

// Instalar el Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Controlar solicitudes de red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si está en caché, devuelve la respuesta
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Si no podemos obtener el recurso o es un error, devolver la response tal cual
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la respuesta
            const responseToCache = response.clone();
            
            // Agregar a la caché para futuras solicitudes
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Si hay un error de red y es una página, devolver página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Activar el Service Worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  // Limpiar cachés antiguas
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Escuchar eventos de sincronización en segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-delivery-data') {
    event.waitUntil(syncDeliveryData());
  }
});

// Función para sincronizar datos de entregas
async function syncDeliveryData() {
  try {
    const dataToSync = await getDataFromIndexedDB('pending-sync');
    if (dataToSync && dataToSync.length > 0) {
      // Aquí enviarías los datos al servidor
      const responses = await Promise.all(
        dataToSync.map(item => 
          fetch('/api/sync/deliveries', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item),
          })
        )
      );
      
      // Si todas las sincronizaciones son exitosas, limpiar la base de datos
      if (responses.every(r => r.ok)) {
        await clearIndexedDB('pending-sync');
      }
    }
  } catch (error) {
    console.error('Error al sincronizar datos:', error);
  }
}

// Funciones auxiliares para IndexedDB
async function getDataFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gowater-driver-db', 1);
    
    request.onerror = reject;
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAll = store.getAll();
      
      getAll.onsuccess = () => {
        resolve(getAll.result);
      };
      
      getAll.onerror = reject;
    };
  });
}

async function clearIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gowater-driver-db', 1);
    
    request.onerror = reject;
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const clear = store.clear();
      
      clear.onsuccess = resolve;
      clear.onerror = reject;
    };
  });
}