/**
 * Servicio de sincronización para la aplicación móvil
 * 
 * Este servicio maneja:
 * - Detección del estado de la conexión
 * - Almacenamiento de datos en caché local cuando no hay conexión
 * - Sincronización de datos cuando se recupera la conexión
 * - Gestión de conflictos
 */

import { SyncOperationType, SyncQueueItem, STORES, 
  saveItem, getItem, deleteItem, getAllItems, 
  getPendingSyncItems, updateSyncItemStatus, addToSyncQueue 
} from './offlineDb';

// Estado inicial
let isOnline = navigator.onLine;
let pendingItemsCount = 0;
let syncInProgress = false;

// Objeto para emitir eventos personalizados
const eventTarget = new EventTarget();

// Eventos personalizados
export const EVENTS = {
  ONLINE_STATUS_CHANGED: 'online-status-changed',
  SYNC_STARTED: 'sync-started',
  SYNC_COMPLETE: 'sync-complete',
  SYNC_ERROR: 'sync-error',
  ITEM_SYNCED: 'item-synced',
  PENDING_ITEMS_CHANGED: 'pending-items-changed'
};

// Inicializar el servicio
export function initSyncService() {
  // Detectar cambios en la conexión
  window.addEventListener('online', () => {
    isOnline = true;
    handleOnlineStatus();
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
    handleOnlineStatus();
  });
  
  // Ya está online desde el principio?
  handleOnlineStatus();
  
  // Iniciar intentos de sincronización periódicos
  setInterval(() => {
    if (isOnline && !syncInProgress) {
      syncPendingItems().catch(error => {
        console.error('Error en sincronización programada:', error);
      });
    }
  }, 60000); // Intentar cada 1 minuto
  
  // Obtener número inicial de elementos pendientes
  getPendingItemsCount().then(count => {
    pendingItemsCount = count;
    
    // Emitir evento inicial
    const event = new CustomEvent(EVENTS.PENDING_ITEMS_CHANGED, { detail: { count } });
    eventTarget.dispatchEvent(event);
  });
  
  console.log('Servicio de sincronización inicializado');
}

// Manejar cambios en el estado de la conexión
function handleOnlineStatus() {
  console.log(`Estado de la conexión: ${isOnline ? 'online' : 'offline'}`);
  
  // Emitir evento de cambio de estado
  const event = new CustomEvent(EVENTS.ONLINE_STATUS_CHANGED, { detail: { isOnline } });
  eventTarget.dispatchEvent(event);
  
  // Si acabamos de conectarnos, intentar sincronizar
  if (isOnline) {
    syncPendingItems().catch(error => {
      console.error('Error al sincronizar elementos pendientes:', error);
    });
  }
}

// Suscribirse a eventos
export function subscribeSyncEvent(eventName: string, callback: EventListener) {
  eventTarget.addEventListener(eventName, callback);
  return () => eventTarget.removeEventListener(eventName, callback);
}

// Obtener el estado actual de la conexión
export function getConnectionStatus() {
  return {
    isOnline,
    pendingItemsCount
  };
}

// Función para sincronizar elementos pendientes
export async function syncPendingItems() {
  if (syncInProgress) {
    console.log('Ya hay una sincronización en progreso');
    return false;
  }
  
  if (!isOnline) {
    console.log('No hay conexión a Internet. No se puede sincronizar.');
    return false;
  }
  
  syncInProgress = true;
  
  try {
    // Emitir evento de inicio
    const startEvent = new CustomEvent(EVENTS.SYNC_STARTED);
    eventTarget.dispatchEvent(startEvent);
    
    // Obtener elementos pendientes
    const pendingItems = await getPendingSyncItems();
    console.log(`Iniciando sincronización de ${pendingItems.length} elementos pendientes`);
    
    if (pendingItems.length === 0) {
      console.log('No hay elementos pendientes para sincronizar');
      
      // Emitir evento de finalización
      const emptyCompleteEvent = new CustomEvent(EVENTS.SYNC_COMPLETE, { 
        detail: { 
          totalItems: 0,
          successfulItems: 0,
          failedItems: 0,
          remainingItems: 0
        } 
      });
      eventTarget.dispatchEvent(emptyCompleteEvent);
      
      return true;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of pendingItems) {
      try {
        // Marcar el elemento como "procesando"
        if (item.id !== undefined) {
          await updateSyncItemStatus(item.id, 'processing');
        }
        
        // Intentar sincronizar el elemento
        const response = await apiRequest(item.endpoint, {
          method: item.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          body: item.method !== 'DELETE' ? JSON.stringify(item.data) : undefined,
        });
        
        // Si la sincronización es exitosa, eliminar de la cola
        if (item.id !== undefined) {
          await deleteItem(STORES.SYNC_QUEUE, item.id);
        }
        successCount++;
        
        // Emitir evento para cada elemento sincronizado
        const itemEvent = new CustomEvent(EVENTS.ITEM_SYNCED, { 
          detail: { 
            item, 
            success: true, 
            progress: { 
              current: successCount + errorCount,
              total: pendingItems.length,
              successful: successCount,
              failed: errorCount
            } 
          } 
        });
        eventTarget.dispatchEvent(itemEvent);
        
      } catch (error) {
        console.error(`Error al sincronizar elemento ${item.id}:`, error);
        
        // Actualizar el estado a error solo si el id está definido
        if (item.id !== undefined) {
          await updateSyncItemStatus(
            item.id, 
            'error', 
            error instanceof Error ? error.message : 'Error desconocido'
          );
        }
        
        errorCount++;
        
        // Emitir evento para cada elemento con error
        const itemErrorEvent = new CustomEvent(EVENTS.ITEM_SYNCED, { 
          detail: { 
            item, 
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
            progress: { 
              current: successCount + errorCount,
              total: pendingItems.length,
              successful: successCount,
              failed: errorCount
            } 
          } 
        });
        eventTarget.dispatchEvent(itemErrorEvent);
      }
    }
    
    // Actualizar contador de elementos pendientes
    const remainingItems = await getPendingSyncItems();
    pendingItemsCount = remainingItems.length;
    
    // Emitir evento de finalización
    const completeEvent = new CustomEvent(EVENTS.SYNC_COMPLETE, { 
      detail: { 
        totalItems: pendingItems.length,
        successfulItems: successCount,
        failedItems: errorCount,
        remainingItems: pendingItemsCount
      } 
    });
    eventTarget.dispatchEvent(completeEvent);
    
    console.log(`Sincronización completada: ${successCount} exitosos, ${errorCount} fallidos, ${pendingItemsCount} pendientes`);
    
    return (errorCount === 0);
    
  } catch (error) {
    console.error('Error durante la sincronización:', error);
    
    // Emitir evento de error
    const errorEvent = new CustomEvent(EVENTS.SYNC_ERROR, { 
      detail: { error: error instanceof Error ? error.message : 'Error desconocido' } 
    });
    eventTarget.dispatchEvent(errorEvent);
    
    return false;
  } finally {
    // Always reset syncInProgress flag to prevent stuck sync state
    syncInProgress = false;
  }
}

// Almacenar datos en caché local
export async function cacheData(store: string, data: any | any[]) {
  try {
    const dataArray = Array.isArray(data) ? data : [data];
    
    for (const item of dataArray) {
      await saveItem(store, item);
    }
    
    return true;
  } catch (error) {
    console.error(`Error al cachear datos en ${store}:`, error);
    return false;
  }
}

// Función para hacer peticiones a la API
async function apiRequest(
  endpoint: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: string
  }
) {
  const res = await fetch(endpoint, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: options.body,
  });
  
  if (!res.ok) {
    throw new Error(`Error al realizar petición: ${res.status} ${res.statusText}`);
  }
  
  // Para DELETE, puede que no haya respuesta JSON
  if (options.method === 'DELETE') {
    return null;
  }
  
  return res.json();
}

// Función mejorada para realizar peticiones API con soporte offline
export async function apiRequestWithOfflineSupport(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: any,
    entityType?: string,
    entityId?: number | string
  } = {}
) {
  // Si estamos online, intentar la petición normal
  if (isOnline) {
    try {
      const response = await apiRequest(endpoint, {
        method: options.method || 'GET',
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      
      // Si la petición es exitosa y no es GET, también cachear localmente
      if (options.method !== 'GET' && options.entityType && response) {
        await cacheData(options.entityType, response);
      }
      
      return response;
    } catch (error) {
      // Si hay un error, comprobar si es por problemas de red
      if (!navigator.onLine) {
        // La conexión se ha perdido durante la petición
        isOnline = false;
        handleOnlineStatus();
      }
      
      // Para peticiones que no sean GET, añadir a la cola de sincronización
      if (options.method !== 'GET') {
        if (!options.entityType) {
          console.error('No se puede procesar offline: falta entityType');
          throw error;
        }
        
        const operationType = 
          options.method === 'POST' ? SyncOperationType.CREATE :
          options.method === 'DELETE' ? SyncOperationType.DELETE :
          SyncOperationType.UPDATE;
        
        await addToSyncQueue({
          endpoint,
          method: options.method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          data: options.body,
          entityType: options.entityType,
          entityId: options.entityId || 0,
          operationType
        });
        
        // Si es una creación o actualización, también cachear localmente
        if (operationType !== SyncOperationType.DELETE && options.body) {
          await cacheData(options.entityType, options.body);
        }
        
        console.log(`Operación ${options.method} añadida a la cola de sincronización`);
        return options.body; // Devolver los datos enviados
      }
      
      // Si es una petición GET, intentar obtener desde la caché
      if (options.method === 'GET' && options.entityType) {
        console.log(`Intentando obtener datos de ${options.entityType} desde la caché`);
        const cachedData = await getAllItems(options.entityType);
        
        if (Array.isArray(cachedData) && cachedData.length > 0) {
          console.log(`Datos obtenidos de la caché: ${cachedData.length} elementos`);
          return cachedData;
        }
      }
      
      // Si no hay datos en caché, lanzar el error original
      throw error;
    }
  } else {
    // Si estamos offline
    console.log('Solicitud en modo offline');
    
    // Para peticiones que no sean GET, añadir a la cola de sincronización
    if (options.method !== 'GET') {
      if (!options.entityType) {
        throw new Error('No se puede procesar offline: falta entityType');
      }
      
      const operationType = 
        options.method === 'POST' ? SyncOperationType.CREATE :
        options.method === 'DELETE' ? SyncOperationType.DELETE :
        SyncOperationType.UPDATE;
      
      await addToSyncQueue({
        endpoint,
        method: options.method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        data: options.body,
        entityType: options.entityType,
        entityId: options.entityId || 0,
        operationType
      });
      
      // Si es una creación o actualización, también cachear localmente
      if (operationType !== SyncOperationType.DELETE && options.body) {
        await cacheData(options.entityType, options.body);
      }
      
      console.log(`Operación ${options.method} añadida a la cola de sincronización en modo offline`);
      return options.body; // Devolver los datos enviados
    }
    
    // Si es una petición GET, intentar obtener desde la caché
    if (options.method === 'GET' && options.entityType) {
      console.log(`Intentando obtener datos de ${options.entityType} desde la caché`);
      const cachedData = await getAllItems(options.entityType);
      
      if (Array.isArray(cachedData) && cachedData.length > 0) {
        console.log(`Datos obtenidos de la caché: ${cachedData.length} elementos`);
        return cachedData;
      }
    }
    
    // Si no hay datos en caché
    throw new Error('No hay conexión y no se encontraron datos en caché');
  }
}

// Forzar una sincronización manual
export async function forceSyncNow() {
  return syncPendingItems();
}

// Obtener el número de elementos pendientes de sincronización
export async function getPendingItemsCount() {
  try {
    const pendingItems = await getPendingSyncItems();
    pendingItemsCount = pendingItems.length;
    return pendingItemsCount;
  } catch (error) {
    console.error('Error al obtener el número de elementos pendientes:', error);
    return 0;
  }
}

// Exportar el estado inicial
export {
  isOnline,
  pendingItemsCount
};