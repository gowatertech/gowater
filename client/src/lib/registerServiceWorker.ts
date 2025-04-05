/**
 * Módulo para registrar el Service Worker
 * 
 * Este módulo proporciona funciones para registrar y actualizar el Service Worker
 * que permite el funcionamiento offline y la sincronización en segundo plano.
 */

// Variable para almacenar la referencia al registro
let swRegistration: ServiceWorkerRegistration | null = null;

// Registrar el Service Worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    try {
      // Registrar el Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado correctamente:', registration.scope);
      
      // Almacenar referencia al registro
      swRegistration = registration;
      
      // Configurar actualización del Service Worker
      setupServiceWorkerUpdates(registration);
      
      return registration;
    } catch (error) {
      console.error('Error al registrar el Service Worker:', error);
      return null;
    }
  } else {
    console.log('Service Worker no soportado en este navegador');
    return null;
  }
}

// Configurar actualizaciones del Service Worker
function setupServiceWorkerUpdates(registration: ServiceWorkerRegistration) {
  // Verificar actualizaciones cada hora
  setInterval(() => {
    registration.update()
      .then(() => console.log('Service Worker actualizado correctamente'))
      .catch(error => console.error('Error al actualizar el Service Worker:', error));
  }, 3600000); // 1 hora
  
  // Actualización disponible
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('Nueva versión del Service Worker disponible');
          // Notificar al usuario que hay una actualización disponible
          if (confirm('Hay una nueva versión disponible. ¿Desea actualizar?')) {
            newWorker.postMessage({ action: 'skipWaiting' });
            window.location.reload();
          }
        }
      });
    }
  });
  
  // Controlar cambios de Service Worker
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}

// Obtener el registro del Service Worker
export function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) {
    return Promise.resolve(swRegistration);
  }
  
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.getRegistration()
      .then(registration => {
        if (registration) {
          swRegistration = registration;
        }
        return registration || null;
      })
      .catch(error => {
        console.error('Error al obtener el registro del Service Worker:', error);
        return null;
      });
  }
  
  return Promise.resolve(null);
}

// Enviar mensaje al Service Worker
export function sendMessageToServiceWorker(message: any): Promise<any> {
  return getServiceWorkerRegistration()
    .then(registration => {
      if (registration && registration.active) {
        return new Promise(resolve => {
          const messageChannel = new MessageChannel();
          
          // Configurar el canal para recibir respuestas
          messageChannel.port1.onmessage = event => {
            resolve(event.data);
          };
          
          // Enviar mensaje al Service Worker
          if (registration.active) {
            registration.active.postMessage(message, [messageChannel.port2]);
          }
        });
      }
      
      return Promise.resolve(null);
    });
}

// Exportar funciones
export default {
  registerServiceWorker,
  getServiceWorkerRegistration,
  sendMessageToServiceWorker
};