import { useState, useEffect, useCallback } from 'react';
import {
  initSyncService,
  getOnlineStatus,
  addConnectionListener,
  removeConnectionListener,
  downloadTodayRouteData,
  syncPendingActions,
  getSyncStatus,
  getRouteData,
} from '@/lib/sync-service';
import {
  addPendingAction,
  getAllRoutes,
  getAllOrders,
  getRoutesByDriver,
} from '@/lib/offline-db';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Initialize sync service on mount
  useEffect(() => {
    try {
      initSyncService();

      const handleConnectionChange = (online: boolean) => {
        setIsOnline(online);
        
        if (online) {
          // When connection is restored, trigger sync
          syncNow().catch(err => {
            console.error('[useOfflineSync] Error during auto-sync:', err);
          });
        }
      };

      addConnectionListener(handleConnectionChange);

      // Load initial sync status
      loadSyncStatus().catch(err => {
        console.error('[useOfflineSync] Error loading initial sync status:', err);
      });

      // Auto-download data on first load if online
      if (getOnlineStatus()) {
        downloadTodayRouteData().then(() => {
          console.log('[useOfflineSync] Auto-downloaded initial data');
          loadSyncStatus().catch(err => {
            console.error('[useOfflineSync] Error loading sync status after download:', err);
          });
        }).catch(err => {
          console.error('[useOfflineSync] Error auto-downloading data:', err);
        });
      }

      return () => {
        removeConnectionListener(handleConnectionChange);
      };
    } catch (error) {
      console.error('[useOfflineSync] Error initializing sync service:', error);
    }
  }, []);

  // Load sync status from IndexedDB
  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await getSyncStatus();
      setPendingCount(status.pendingActionsCount);
      setLastSyncTime(status.lastFullSync || null);
    } catch (error) {
      console.error('[useOfflineSync] Error loading sync status:', error);
    }
  }, []);

  // Download today's data for offline use
  const downloadData = useCallback(async (driverId?: number) => {
    setIsSyncing(true);
    try {
      const success = await downloadTodayRouteData(driverId);
      await loadSyncStatus();
      return success;
    } catch (error) {
      console.error('[useOfflineSync] Error downloading data:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [loadSyncStatus]);

  // Sync pending actions to server
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) {
      return 0;
    }

    setIsSyncing(true);
    try {
      const count = await syncPendingActions();
      await loadSyncStatus();
      return count;
    } catch (error) {
      console.error('[useOfflineSync] Error syncing:', error);
      return 0;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, loadSyncStatus]);

  // Queue an action for offline sync
  const queueAction = useCallback(async (type: string, data: any) => {
    try {
      await addPendingAction(type, data);
      await loadSyncStatus();
      
      // If online, trigger immediate sync
      if (isOnline) {
        setTimeout(() => syncNow(), 1000);
      }
    } catch (error) {
      console.error('[useOfflineSync] Error queuing action:', error);
      throw error;
    }
  }, [isOnline, syncNow, loadSyncStatus]);

  // Get route data (from cache or server)
  const getRoute = useCallback(async (routeId: number, forceOnline = false) => {
    try {
      return await getRouteData(routeId, forceOnline);
    } catch (error) {
      console.error('[useOfflineSync] Error getting route:', error);
      return null;
    }
  }, []);

  // Get all cached routes
  const getCachedRoutes = useCallback(async (driverId?: number) => {
    try {
      if (driverId) {
        return await getRoutesByDriver(driverId);
      }
      return await getAllRoutes();
    } catch (error) {
      console.error('[useOfflineSync] Error getting cached routes:', error);
      return [];
    }
  }, []);

  // Get all cached orders
  const getCachedOrders = useCallback(async () => {
    try {
      return await getAllOrders();
    } catch (error) {
      console.error('[useOfflineSync] Error getting cached orders:', error);
      return [];
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    downloadData,
    syncNow,
    queueAction,
    getRoute,
    getCachedRoutes,
    getCachedOrders,
    refreshStatus: loadSyncStatus,
  };
}
