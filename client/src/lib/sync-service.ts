import {
  getDB,
  saveRoute,
  saveOrder,
  saveCustomer,
  saveProduct,
  bulkSaveRoutes,
  bulkSaveOrders,
  bulkSaveCustomers,
  bulkSaveProducts,
  getPendingActions,
  deletePendingAction,
  updatePendingActionStatus,
  setSyncMetadata,
  getSyncMetadata,
  getAllRoutes,
  getAllOrders,
  getRoutesByDriver,
  getOrder,
} from './offline-db';
import {
  detectConflict,
  resolveConflict,
  getConflictStrategy,
  mergeDeliveryData,
} from './conflict-resolution';

// Online status tracking
let isOnline = navigator.onLine;
let syncInProgress = false;
let autoSyncInterval: number | null = null;

// Event listeners for connection changes
const connectionListeners: Array<(online: boolean) => void> = [];

export function addConnectionListener(callback: (online: boolean) => void) {
  connectionListeners.push(callback);
}

export function removeConnectionListener(callback: (online: boolean) => void) {
  const index = connectionListeners.indexOf(callback);
  if (index > -1) {
    connectionListeners.splice(index, 1);
  }
}

function notifyConnectionListeners(online: boolean) {
  connectionListeners.forEach(cb => cb(online));
}

// Initialize connection monitoring
export function initSyncService() {
  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('[Sync] Connection restored');
    isOnline = true;
    notifyConnectionListeners(true);
    // Trigger immediate sync when connection is restored
    syncPendingActions();
  });

  window.addEventListener('offline', () => {
    console.log('[Sync] Connection lost');
    isOnline = false;
    notifyConnectionListeners(false);
  });

  // Listen for background sync messages from service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'BACKGROUND_SYNC') {
        if (event.data.action === 'sync-completed') {
          console.log('[Sync] Background sync completed by service worker:', event.data.count, 'actions synced');
          // Refresh local status to reflect sync completion
          // The service worker already did the sync, we just need to update UI
        } else {
          console.log('[Sync] Background sync triggered from service worker');
          // Fallback: sync from client side if service worker didn't complete it
          syncPendingActions();
        }
      }
    });
  }

  // Start auto-sync interval (every 30 seconds when online)
  startAutoSync();

  console.log('[Sync] Sync service initialized');
}

export function getOnlineStatus(): boolean {
  return isOnline;
}

// Start automatic sync interval
function startAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }

  autoSyncInterval = window.setInterval(() => {
    if (isOnline && !syncInProgress) {
      syncPendingActions();
    }
  }, 30000); // Every 30 seconds
}

// Stop automatic sync
export function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}

// Download today's route data for offline use
export async function downloadTodayRouteData(driverId?: number): Promise<boolean> {
  if (!isOnline) {
    console.log('[Sync] Cannot download data while offline');
    return false;
  }

  try {
    console.log('[Sync] Downloading today\'s route data...');

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Fetch routes for the driver
    const routesResponse = await fetch('/api/routes', {
      credentials: 'include'
    });

    if (!routesResponse.ok) {
      throw new Error('Failed to fetch routes');
    }

    const allRoutes = await routesResponse.json();
    
    // Filter routes for today and this driver if driverId is provided
    let todayRoutes = allRoutes.filter((r: any) => r.date?.startsWith(today));
    
    if (driverId) {
      todayRoutes = todayRoutes.filter((r: any) => r.driverId === driverId);
    }

    console.log('[Sync] Found', todayRoutes.length, 'routes for today');

    // Save routes to IndexedDB
    await bulkSaveRoutes(todayRoutes);

    // Fetch orders for each route
    const allOrders: any[] = [];
    const allCustomerIds = new Set<number>();

    for (const route of todayRoutes) {
      try {
        const ordersResponse = await fetch(`/api/routes/${route.id}/orders`, {
          credentials: 'include'
        });

        if (ordersResponse.ok) {
          const orders = await ordersResponse.json();
          allOrders.push(...orders);

          // Collect customer IDs
          orders.forEach((order: any) => {
            if (order.customerId) {
              allCustomerIds.add(order.customerId);
            }
          });
        }
      } catch (error) {
        console.error(`[Sync] Error fetching orders for route ${route.id}:`, error);
      }
    }

    console.log('[Sync] Downloaded', allOrders.length, 'orders');
    await bulkSaveOrders(allOrders);

    // Fetch customer details
    try {
      const customersResponse = await fetch('/api/customers', {
        credentials: 'include'
      });

      if (customersResponse.ok) {
        const allCustomers = await customersResponse.json();
        
        // Filter only customers that are in today's orders
        const relevantCustomers = allCustomers.filter((c: any) => 
          allCustomerIds.has(c.id)
        );

        console.log('[Sync] Downloaded', relevantCustomers.length, 'customers');
        await bulkSaveCustomers(relevantCustomers);
      }
    } catch (error) {
      console.error('[Sync] Error fetching customers:', error);
    }

    // Fetch products
    try {
      const productsResponse = await fetch('/api/products', {
        credentials: 'include'
      });

      if (productsResponse.ok) {
        const products = await productsResponse.json();
        console.log('[Sync] Downloaded', products.length, 'products');
        await bulkSaveProducts(products);
      }
    } catch (error) {
      console.error('[Sync] Error fetching products:', error);
    }

    // Fetch ALL deliveries/orders from mobile endpoint (not just route orders)
    try {
      const deliveriesResponse = await fetch('/api/mobile/deliveries', {
        credentials: 'include'
      });

      if (deliveriesResponse.ok) {
        const deliveries = await deliveriesResponse.json();
        console.log('[Sync] Downloaded', deliveries.length, 'deliveries from /api/mobile/deliveries');
        
        // Save each delivery as an order in IndexedDB
        // The deliveries endpoint returns data in deliveries format, need to save as orders
        await bulkSaveOrders(deliveries);
        
        // Collect customer IDs from deliveries too
        deliveries.forEach((delivery: any) => {
          if (delivery.customerId) {
            allCustomerIds.add(delivery.customerId);
          }
        });
        
        // Fetch any additional customers from deliveries
        if (allCustomerIds.size > 0) {
          const customersResponse = await fetch('/api/customers', {
            credentials: 'include'
          });

          if (customersResponse.ok) {
            const allCustomers = await customersResponse.json();
            const relevantCustomers = allCustomers.filter((c: any) => 
              allCustomerIds.has(c.id)
            );
            console.log('[Sync] Saving additional', relevantCustomers.length, 'customers from deliveries');
            await bulkSaveCustomers(relevantCustomers);
          }
        }
      }
    } catch (error) {
      console.error('[Sync] Error fetching deliveries:', error);
    }

    // Update sync metadata
    await setSyncMetadata('lastFullSync', 'success');

    console.log('[Sync] Successfully downloaded all data for offline use');
    return true;

  } catch (error) {
    console.error('[Sync] Error downloading route data:', error);
    await setSyncMetadata('lastFullSync', 'error', String(error));
    return false;
  }
}

// Sync pending actions to server
export async function syncPendingActions(): Promise<number> {
  if (!isOnline || syncInProgress) {
    return 0;
  }

  syncInProgress = true;
  let syncedCount = 0;

  try {
    const pendingActions = await getPendingActions();
    
    if (pendingActions.length === 0) {
      console.log('[Sync] No pending actions to sync');
      syncInProgress = false;
      return 0;
    }

    console.log('[Sync] Syncing', pendingActions.length, 'pending actions');

    for (const action of pendingActions) {
      try {
        // Mark as syncing
        if (action.id) {
          await updatePendingActionStatus(action.id, 'syncing');
        }

        let success = false;

        // Handle different action types
        switch (action.type) {
          case 'delivery':
            success = await syncDeliveryAction(action.data);
            break;
          
          case 'payment':
            success = await syncPaymentAction(action.data);
            break;
          
          case 'bottle-return':
            success = await syncBottleReturnAction(action.data);
            break;
          
          case 'route-status':
            success = await syncRouteStatusAction(action.data);
            break;
          
          case 'order-status':
            success = await syncOrderStatusAction(action.data);
            break;

          default:
            console.warn('[Sync] Unknown action type:', action.type);
        }

        if (success && action.id) {
          // Remove from pending queue
          await deletePendingAction(action.id);
          syncedCount++;
          console.log('[Sync] Successfully synced action:', action.type);
        } else if (action.id) {
          // Mark as error
          await updatePendingActionStatus(action.id, 'error', 'Sync failed');
        }

      } catch (error) {
        console.error('[Sync] Error syncing action:', action.type, error);
        if (action.id) {
          await updatePendingActionStatus(
            action.id, 
            'error', 
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    }

    await setSyncMetadata('lastActionSync', 'success');
    console.log('[Sync] Successfully synced', syncedCount, 'actions');

  } catch (error) {
    console.error('[Sync] Error during sync:', error);
    await setSyncMetadata('lastActionSync', 'error', String(error));
  } finally {
    syncInProgress = false;
  }

  return syncedCount;
}

// Helper functions to sync specific action types
async function syncDeliveryAction(data: any): Promise<boolean> {
  try {
    // Get client version from IndexedDB
    const clientOrder = await getOrder(data.orderId);
    
    // Fetch current server version
    const serverResponse = await fetch(`/api/orders/${data.orderId}`, {
      credentials: 'include',
    });
    
    let finalData = data;
    
    if (serverResponse.ok) {
      const serverOrder = await serverResponse.json();
      
      // Detect and resolve conflicts
      if (clientOrder && detectConflict(clientOrder, serverOrder)) {
        console.log('[Sync] Conflict detected for order', data.orderId);
        
        const conflict = {
          type: 'order' as const,
          id: data.orderId,
          clientVersion: { ...clientOrder, ...data },
          serverVersion: serverOrder,
          timestamp: new Date().toISOString(),
        };
        
        const strategy = getConflictStrategy('delivery');
        const resolved = resolveConflict(conflict, strategy);
        
        if (resolved) {
          // Use merged data for delivery actions
          finalData = mergeDeliveryData(data, serverOrder);
        }
      }
    }
    
    // Send update to server
    const response = await fetch(`/api/orders/${data.orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: finalData.status,
        deliveredAt: finalData.deliveredAt,
      }),
    });

    if (response.ok) {
      // Update local cache with synced data
      const updatedOrder = await response.json();
      await saveOrder(updatedOrder);
    }

    return response.ok;
  } catch (error) {
    console.error('[Sync] Error syncing delivery:', error);
    return false;
  }
}

async function syncPaymentAction(data: any): Promise<boolean> {
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
    console.error('[Sync] Error syncing payment:', error);
    return false;
  }
}

async function syncBottleReturnAction(data: any): Promise<boolean> {
  try {
    const response = await fetch('/api/bottle-returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return response.ok;
  } catch (error) {
    console.error('[Sync] Error syncing bottle return:', error);
    return false;
  }
}

async function syncRouteStatusAction(data: any): Promise<boolean> {
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
    console.error('[Sync] Error syncing route status:', error);
    return false;
  }
}

async function syncOrderStatusAction(data: any): Promise<boolean> {
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
    console.error('[Sync] Error syncing order status:', error);
    return false;
  }
}

// Get data from offline storage or fetch from server
export async function getRouteData(routeId: number, forceOnline = false): Promise<any> {
  // If offline or not forcing online, try IndexedDB first
  if (!forceOnline && !isOnline) {
    const db = await getDB();
    const route = await db.get('routes', routeId);
    
    if (route) {
      // Get associated orders
      const orders = await db.getAllFromIndex('orders', 'by-route', routeId);
      return { ...route, orders };
    }
    
    return null;
  }

  // Try to fetch from server
  try {
    const response = await fetch(`/api/routes/${routeId}`, {
      credentials: 'include'
    });

    if (response.ok) {
      const route = await response.json();
      
      // Save to IndexedDB for offline use
      await saveRoute(route);
      
      // Fetch and save orders
      const ordersResponse = await fetch(`/api/routes/${routeId}/orders`, {
        credentials: 'include'
      });
      
      if (ordersResponse.ok) {
        const orders = await ordersResponse.json();
        
        // Save each order
        for (const order of orders) {
          await saveOrder(order);
        }
        
        return { ...route, orders };
      }
      
      return route;
    }
  } catch (error) {
    console.error('[Sync] Error fetching route from server:', error);
    
    // Fallback to IndexedDB
    const db = await getDB();
    const route = await db.get('routes', routeId);
    
    if (route) {
      const orders = await db.getAllFromIndex('orders', 'by-route', routeId);
      return { ...route, orders };
    }
  }

  return null;
}

// Get sync status information
export async function getSyncStatus() {
  const lastFullSync = await getSyncMetadata('lastFullSync');
  const lastActionSync = await getSyncMetadata('lastActionSync');
  const pendingActions = await getPendingActions();

  return {
    isOnline,
    syncInProgress,
    lastFullSync: lastFullSync?.lastSyncedAt,
    lastActionSync: lastActionSync?.lastSyncedAt,
    pendingActionsCount: pendingActions.length,
    pendingActions: pendingActions.map(a => ({
      type: a.type,
      createdAt: a.createdAt,
      retryCount: a.retryCount,
      status: a.status,
    })),
  };
}
