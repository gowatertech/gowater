import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface GoWaterOfflineDB extends DBSchema {
  routes: {
    key: number;
    value: {
      id: number;
      name: string;
      driverId: number;
      status: string;
      date: string;
      totalDistance: string | null;
      totalRevenue: number | null;
      deliverySequence: string[];
      stops: string[];
      orderCount: number;
      orders?: any[];
      syncStatus: 'synced' | 'pending' | 'error';
      lastSyncedAt?: string;
    };
    indexes: { 'by-driver': number; 'by-date': string; 'by-sync-status': string };
  };
  orders: {
    key: number;
    value: {
      id: number;
      routeId: number | null;
      customerId: number;
      status: string;
      total: string;
      paymentMethod: string;
      date: string;
      customerName: string;
      customerAddress: string;
      customerLatitude?: string;
      customerLongitude?: string;
      products: Array<{
        productId: number;
        name: string;
        quantity: number;
        price: string;
      }>;
      syncStatus: 'synced' | 'pending' | 'error';
      lastSyncedAt?: string;
    };
    indexes: { 'by-route': number; 'by-customer': number; 'by-sync-status': string };
  };
  customers: {
    key: number;
    value: {
      id: number;
      name: string;
      address: string;
      phone?: string;
      email?: string;
      latitude?: string;
      longitude?: string;
      paymentMethod?: string;
      isCharity?: boolean;
      syncStatus: 'synced' | 'pending' | 'error';
      lastSyncedAt?: string;
    };
    indexes: { 'by-sync-status': string };
  };
  products: {
    key: number;
    value: {
      id: number;
      name: string;
      price: string;
      category?: string;
      isReturnable?: boolean;
      syncStatus: 'synced' | 'pending' | 'error';
      lastSyncedAt?: string;
    };
    indexes: { 'by-sync-status': string };
  };
  pendingActions: {
    key: number;
    value: {
      id?: number;
      type: 'delivery' | 'payment' | 'bottle-return' | 'route-status' | 'order-status';
      data: any;
      createdAt: string;
      retryCount: number;
      lastError?: string;
      status: 'pending' | 'syncing' | 'error';
    };
    indexes: { 'by-status': string; 'by-type': string; 'by-created': string };
  };
  syncMetadata: {
    key: string;
    value: {
      key: string;
      lastSyncedAt: string;
      status: 'success' | 'error';
      errorMessage?: string;
    };
  };
}

const DB_NAME = 'gowater-offline-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<GoWaterOfflineDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<GoWaterOfflineDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<GoWaterOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Routes store
      if (!db.objectStoreNames.contains('routes')) {
        const routeStore = db.createObjectStore('routes', { keyPath: 'id' });
        routeStore.createIndex('by-driver', 'driverId');
        routeStore.createIndex('by-date', 'date');
        routeStore.createIndex('by-sync-status', 'syncStatus');
      }

      // Orders store
      if (!db.objectStoreNames.contains('orders')) {
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
        orderStore.createIndex('by-route', 'routeId');
        orderStore.createIndex('by-customer', 'customerId');
        orderStore.createIndex('by-sync-status', 'syncStatus');
      }

      // Customers store
      if (!db.objectStoreNames.contains('customers')) {
        const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
        customerStore.createIndex('by-sync-status', 'syncStatus');
      }

      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-sync-status', 'syncStatus');
      }

      // Pending actions store (for offline queue)
      if (!db.objectStoreNames.contains('pendingActions')) {
        const actionStore = db.createObjectStore('pendingActions', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        actionStore.createIndex('by-status', 'status');
        actionStore.createIndex('by-type', 'type');
        actionStore.createIndex('by-created', 'createdAt');
      }

      // Sync metadata store
      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// Routes CRUD operations
export async function saveRoute(route: any) {
  const db = await getDB();
  await db.put('routes', {
    ...route,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
  });
}

export async function getRoute(id: number) {
  const db = await getDB();
  return await db.get('routes', id);
}

export async function getRoutesByDriver(driverId: number) {
  const db = await getDB();
  return await db.getAllFromIndex('routes', 'by-driver', driverId);
}

export async function getAllRoutes() {
  const db = await getDB();
  return await db.getAll('routes');
}

export async function deleteRoute(id: number) {
  const db = await getDB();
  await db.delete('routes', id);
}

// Orders CRUD operations
export async function saveOrder(order: any) {
  const db = await getDB();
  await db.put('orders', {
    ...order,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
  });
}

export async function getOrder(id: number) {
  const db = await getDB();
  return await db.get('orders', id);
}

export async function getOrdersByRoute(routeId: number) {
  const db = await getDB();
  return await db.getAllFromIndex('orders', 'by-route', routeId);
}

export async function getAllOrders() {
  const db = await getDB();
  return await db.getAll('orders');
}

// Customers CRUD operations
export async function saveCustomer(customer: any) {
  const db = await getDB();
  await db.put('customers', {
    ...customer,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
  });
}

export async function getCustomer(id: number) {
  const db = await getDB();
  return await db.get('customers', id);
}

export async function getAllCustomers() {
  const db = await getDB();
  return await db.getAll('customers');
}

// Products CRUD operations
export async function saveProduct(product: any) {
  const db = await getDB();
  await db.put('products', {
    ...product,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
  });
}

export async function getAllProducts() {
  const db = await getDB();
  return await db.getAll('products');
}

// Pending actions queue
export async function addPendingAction(type: string, data: any) {
  const db = await getDB();
  const action = {
    type: type as any,
    data,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending' as const,
  };
  const id = await db.add('pendingActions', action);
  
  // Register background sync to sync when connection is restored
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // TypeScript doesn't have types for Background Sync API yet
      if ('sync' in registration) {
        await (registration as any).sync.register('sync-pending-actions');
        console.log('[IndexedDB] Background sync registered');
      }
    } catch (error) {
      console.warn('[IndexedDB] Background sync registration failed:', error);
      // Background sync not supported, will rely on online event and interval
    }
  }
  
  return id;
}

export async function getPendingActions() {
  const db = await getDB();
  return await db.getAllFromIndex('pendingActions', 'by-status', 'pending');
}

export async function updatePendingActionStatus(
  id: number, 
  status: 'pending' | 'syncing' | 'error', 
  errorMessage?: string
) {
  const db = await getDB();
  const action = await db.get('pendingActions', id);
  if (action) {
    action.status = status;
    if (errorMessage) {
      action.lastError = errorMessage;
    }
    if (status === 'error') {
      action.retryCount += 1;
    }
    await db.put('pendingActions', action);
  }
}

export async function deletePendingAction(id: number) {
  const db = await getDB();
  await db.delete('pendingActions', id);
}

// Sync metadata
export async function setSyncMetadata(key: string, status: 'success' | 'error', errorMessage?: string) {
  const db = await getDB();
  await db.put('syncMetadata', {
    key,
    lastSyncedAt: new Date().toISOString(),
    status,
    errorMessage,
  });
}

export async function getSyncMetadata(key: string) {
  const db = await getDB();
  return await db.get('syncMetadata', key);
}

// Clear all data (useful for logout)
export async function clearAllData() {
  const db = await getDB();
  await db.clear('routes');
  await db.clear('orders');
  await db.clear('customers');
  await db.clear('products');
  await db.clear('pendingActions');
  await db.clear('syncMetadata');
}

// Bulk save operations for initial sync
export async function bulkSaveRoutes(routes: any[]) {
  const db = await getDB();
  const tx = db.transaction('routes', 'readwrite');
  await Promise.all(
    routes.map(route =>
      tx.store.put({
        ...route,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      })
    )
  );
  await tx.done;
}

export async function bulkSaveOrders(orders: any[]) {
  const db = await getDB();
  const tx = db.transaction('orders', 'readwrite');
  await Promise.all(
    orders.map(order =>
      tx.store.put({
        ...order,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      })
    )
  );
  await tx.done;
}

export async function bulkSaveCustomers(customers: any[]) {
  const db = await getDB();
  const tx = db.transaction('customers', 'readwrite');
  await Promise.all(
    customers.map(customer =>
      tx.store.put({
        ...customer,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      })
    )
  );
  await tx.done;
}

export async function bulkSaveProducts(products: any[]) {
  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');
  await Promise.all(
    products.map(product =>
      tx.store.put({
        ...product,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      })
    )
  );
  await tx.done;
}
