/**
 * Módulo de base de datos IndexedDB para funcionamiento offline
 * 
 * Este módulo proporciona una capa de abstracción para almacenar datos
 * localmente usando IndexedDB y gestionar una cola de sincronización.
 */

// Tipos para sincronización
export enum SyncOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export interface SyncQueueItem {
  id?: number;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: any;
  entityType: string;
  entityId: number | string;
  operationType: SyncOperationType;
  status: 'pending' | 'processing' | 'error';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Nombre para la base de datos
const DB_NAME = 'gowater_offline_db';
const DB_VERSION = 1;

// Definición de stores
export const STORES = {
  ROUTES: 'routes',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  BOTTLE_RETURNS: 'bottleReturns',
  SYNC_QUEUE: 'syncQueue'
};

// Variable para almacenar la conexión a la base de datos
let db: IDBDatabase | null = null;

// Inicializar la base de datos
export async function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve();
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error("Error al abrir la base de datos:", event);
      reject(new Error("No se pudo abrir la base de datos IndexedDB"));
    };
    
    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      console.log("Base de datos abierta exitosamente");
      resolve();
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Crear stores si no existen
      if (!database.objectStoreNames.contains(STORES.ROUTES)) {
        const routesStore = database.createObjectStore(STORES.ROUTES, { keyPath: 'id' });
        routesStore.createIndex('driverId', 'driverId', { unique: false });
        routesStore.createIndex('status', 'status', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(STORES.ORDERS)) {
        const ordersStore = database.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
        ordersStore.createIndex('routeId', 'routeId', { unique: false });
        ordersStore.createIndex('customerId', 'customerId', { unique: false });
        ordersStore.createIndex('status', 'status', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const customersStore = database.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        customersStore.createIndex('businessname', 'businessname', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productsStore = database.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        productsStore.createIndex('name', 'name', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(STORES.BOTTLE_RETURNS)) {
        const bottleReturnsStore = database.createObjectStore(STORES.BOTTLE_RETURNS, { keyPath: 'id', autoIncrement: true });
        bottleReturnsStore.createIndex('orderId', 'orderId', { unique: false });
        bottleReturnsStore.createIndex('driverId', 'driverId', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncQueueStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncQueueStore.createIndex('status', 'status', { unique: false });
        syncQueueStore.createIndex('entityType', 'entityType', { unique: false });
        syncQueueStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// Guardar un elemento en un store
export async function saveItem(storeName: string, item: any): Promise<any> {
  if (!storeName || typeof storeName !== 'string') {
    throw new Error('El nombre del store es requerido');
  }
  
  if (!item) {
    throw new Error('El elemento a guardar es requerido');
  }
  
  await initDatabase();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Base de datos no inicializada"));
      return;
    }
    
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      transaction.onerror = () => {
        console.error(`Error en transacción para ${storeName}`);
        reject(new Error(`Error en transacción para ${storeName}`));
      };
      
      transaction.onabort = () => {
        console.error(`Transacción abortada para ${storeName}`);
        reject(new Error(`Transacción abortada para ${storeName}`));
      };
      
      const request = store.put(item);
      
      request.onsuccess = () => {
        resolve(item);
      };
      
      request.onerror = (event) => {
        console.error(`Error al guardar en ${storeName}:`, event);
        reject(new Error(`Error al guardar en ${storeName}`));
      };
    } catch (error) {
      console.error(`Error en transacción para ${storeName}:`, error);
      reject(error);
    }
  });
}

// Obtener un elemento por su ID
export async function getItem(storeName: string, id: number | string): Promise<any> {
  if (!storeName || typeof storeName !== 'string') {
    throw new Error('El nombre del store es requerido');
  }
  
  if (id === null || id === undefined) {
    throw new Error('El ID es requerido');
  }
  
  await initDatabase();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Base de datos no inicializada"));
      return;
    }
    
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      transaction.onerror = () => {
        console.error(`Error en transacción para ${storeName}`);
        reject(new Error(`Error en transacción para ${storeName}`));
      };
      
      const request = store.get(id);
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
      
      request.onerror = (event) => {
        console.error(`Error al obtener de ${storeName}:`, event);
        reject(new Error(`Error al obtener de ${storeName}`));
      };
    } catch (error) {
      console.error(`Error en transacción para ${storeName}:`, error);
      reject(error);
    }
  });
}

// Eliminar un elemento
export async function deleteItem(storeName: string, id: number | string): Promise<void> {
  if (!storeName || typeof storeName !== 'string') {
    throw new Error('El nombre del store es requerido');
  }
  
  if (id === null || id === undefined) {
    throw new Error('El ID es requerido');
  }
  
  await initDatabase();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Base de datos no inicializada"));
      return;
    }
    
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      transaction.onerror = () => {
        console.error(`Error en transacción para ${storeName}`);
        reject(new Error(`Error en transacción para ${storeName}`));
      };
      
      transaction.onabort = () => {
        console.error(`Transacción abortada para ${storeName}`);
        reject(new Error(`Transacción abortada para ${storeName}`));
      };
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error(`Error al eliminar de ${storeName}:`, event);
        reject(new Error(`Error al eliminar de ${storeName}`));
      };
    } catch (error) {
      console.error(`Error en transacción para ${storeName}:`, error);
      reject(error);
    }
  });
}

// Obtener todos los elementos de un store
export async function getAllItems(storeName: string): Promise<any[]> {
  if (!storeName || typeof storeName !== 'string') {
    throw new Error('El nombre del store es requerido');
  }
  
  await initDatabase();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Base de datos no inicializada"));
      return;
    }
    
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      transaction.onerror = () => {
        console.error(`Error en transacción para ${storeName}`);
        reject(new Error(`Error en transacción para ${storeName}`));
      };
      
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result || []);
      };
      
      request.onerror = (event) => {
        console.error(`Error al obtener todos de ${storeName}:`, event);
        reject(new Error(`Error al obtener todos de ${storeName}`));
      };
    } catch (error) {
      console.error(`Error en transacción para ${storeName}:`, error);
      reject(error);
    }
  });
}

// Agregar un elemento a la cola de sincronización
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<SyncQueueItem> {
  await initDatabase();
  
  const syncItem: SyncQueueItem = {
    ...item,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return saveItem(STORES.SYNC_QUEUE, syncItem) as Promise<SyncQueueItem>;
}

// Obtener elementos pendientes de sincronización
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  await initDatabase();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Base de datos no inicializada"));
      return;
    }
    
    try {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('status');
      
      const request = index.getAll('pending');
      
      request.onsuccess = (event) => {
        const items = (event.target as IDBRequest).result || [];
        // Ordenar por fecha de creación (los más antiguos primero)
        items.sort((a: SyncQueueItem, b: SyncQueueItem) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(items);
      };
      
      request.onerror = (event) => {
        console.error("Error al obtener elementos pendientes:", event);
        reject(new Error("Error al obtener elementos pendientes"));
      };
    } catch (error) {
      console.error("Error en transacción para elementos pendientes:", error);
      reject(error);
    }
  });
}

// Actualizar estado de un elemento en la cola de sincronización
export async function updateSyncItemStatus(
  id: number, 
  status: 'pending' | 'processing' | 'error', 
  errorMessage?: string
): Promise<SyncQueueItem> {
  await initDatabase();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Base de datos no inicializada"));
      return;
    }
    
    try {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      
      const request = store.get(id);
      
      request.onsuccess = (event) => {
        const item = (event.target as IDBRequest).result;
        
        if (!item) {
          reject(new Error(`No se encontró el elemento ${id} en la cola de sincronización`));
          return;
        }
        
        const updatedItem: SyncQueueItem = {
          ...item,
          status,
          updatedAt: new Date()
        };
        
        if (errorMessage) {
          updatedItem.errorMessage = errorMessage;
        }
        
        const updateRequest = store.put(updatedItem);
        
        updateRequest.onsuccess = () => {
          resolve(updatedItem);
        };
        
        updateRequest.onerror = (event) => {
          console.error("Error al actualizar estado:", event);
          reject(new Error("Error al actualizar estado"));
        };
      };
      
      request.onerror = (event) => {
        console.error("Error al obtener elemento para actualizar:", event);
        reject(new Error("Error al obtener elemento para actualizar"));
      };
    } catch (error) {
      console.error("Error en transacción para actualizar estado:", error);
      reject(error);
    }
  });
}

// Limpiar elementos sincronizados correctamente
export async function clearSuccessfulSyncItems(): Promise<void> {
  await initDatabase();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Base de datos no inicializada"));
      return;
    }
    
    try {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('status');
      
      // Obtener elementos con error
      const errorRequest = index.getAll('error');
      
      errorRequest.onsuccess = (event) => {
        const errorItems = (event.target as IDBRequest).result || [];
        
        // Si hay elementos con error que tienen más de 7 días, eliminarlos
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        for (const item of errorItems) {
          const updatedAt = new Date(item.updatedAt);
          if (updatedAt < sevenDaysAgo) {
            store.delete(item.id);
          }
        }
        
        transaction.oncomplete = () => {
          resolve();
        };
      };
      
      errorRequest.onerror = (event) => {
        console.error("Error al limpiar cola de sincronización:", event);
        reject(new Error("Error al limpiar cola de sincronización"));
      };
    } catch (error) {
      console.error("Error en transacción para limpiar cola:", error);
      reject(error);
    }
  });
}

// Limpiar toda la base de datos (para pruebas)
export async function clearDatabase(): Promise<void> {
  await initDatabase();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Base de datos no inicializada"));
      return;
    }
    
    try {
      // Cerrar la conexión actual
      db.close();
      
      // Eliminar la base de datos
      const request = indexedDB.deleteDatabase(DB_NAME);
      
      request.onsuccess = () => {
        console.log("Base de datos eliminada correctamente");
        db = null; // Reiniciar la variable
        resolve();
      };
      
      request.onerror = (event) => {
        console.error("Error al eliminar la base de datos:", event);
        reject(new Error("Error al eliminar la base de datos"));
      };
    } catch (error) {
      console.error("Error al limpiar la base de datos:", error);
      reject(error);
    }
  });
}

// Exportar la variable db
export { db };