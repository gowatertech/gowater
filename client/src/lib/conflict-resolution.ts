/**
 * Conflict Resolution Strategy for Offline Sync
 * 
 * Handles conflicts when data is modified both offline and on the server
 */

export type ConflictResolutionStrategy = 'client-wins' | 'server-wins' | 'manual';

export interface DataConflict {
  type: 'order' | 'route' | 'customer' | 'payment';
  id: number;
  clientVersion: any;
  serverVersion: any;
  timestamp: string;
}

/**
 * Detects conflicts between client and server versions
 */
export function detectConflict(clientData: any, serverData: any): boolean {
  // If server version doesn't exist, no conflict
  if (!serverData) {
    return false;
  }

  // Check if data was modified on server after client's last sync
  const clientModified = new Date(clientData.lastSyncedAt || clientData.updatedAt || 0);
  const serverModified = new Date(serverData.updatedAt || 0);

  return serverModified > clientModified;
}

/**
 * Resolves conflicts based on strategy
 */
export function resolveConflict(
  conflict: DataConflict,
  strategy: ConflictResolutionStrategy = 'client-wins'
): any {
  switch (strategy) {
    case 'client-wins':
      // Client data takes precedence (driver's changes are authoritative)
      console.log(`[Conflict] Resolving with client-wins for ${conflict.type} ${conflict.id}`);
      return conflict.clientVersion;

    case 'server-wins':
      // Server data takes precedence
      console.log(`[Conflict] Resolving with server-wins for ${conflict.type} ${conflict.id}`);
      return conflict.serverVersion;

    case 'manual':
      // Store conflict for manual resolution
      console.log(`[Conflict] Manual resolution required for ${conflict.type} ${conflict.id}`);
      storeConflictForManualResolution(conflict);
      return null;

    default:
      return conflict.clientVersion;
  }
}

/**
 * Stores conflicts for manual resolution (could be shown in UI)
 */
function storeConflictForManualResolution(conflict: DataConflict) {
  const conflicts = getStoredConflicts();
  conflicts.push(conflict);
  
  try {
    localStorage.setItem('pending-conflicts', JSON.stringify(conflicts));
  } catch (error) {
    console.error('[Conflict] Error storing conflict:', error);
  }
}

/**
 * Gets all stored conflicts awaiting manual resolution
 */
export function getStoredConflicts(): DataConflict[] {
  try {
    const stored = localStorage.getItem('pending-conflicts');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Conflict] Error reading conflicts:', error);
    return [];
  }
}

/**
 * Clears a resolved conflict
 */
export function clearResolvedConflict(conflictId: string) {
  const conflicts = getStoredConflicts();
  const filtered = conflicts.filter(c => 
    `${c.type}-${c.id}` !== conflictId
  );
  
  try {
    localStorage.setItem('pending-conflicts', JSON.stringify(filtered));
  } catch (error) {
    console.error('[Conflict] Error clearing conflict:', error);
  }
}

/**
 * Merges delivery/order data intelligently
 * For GoWater, we generally trust the driver's version for deliveries
 */
export function mergeDeliveryData(clientData: any, serverData: any): any {
  // Driver's status updates are authoritative for deliveries
  if (clientData.status === 'delivered' || clientData.status === 'cancelled') {
    return {
      ...serverData,
      status: clientData.status,
      paymentMethod: clientData.paymentMethod,
      deliveredAt: clientData.deliveredAt,
      notes: clientData.notes,
      // Keep server's other fields that might have been updated
      total: serverData.total,
      products: serverData.products,
    };
  }

  // If no delivery made, prefer server version
  return serverData;
}

/**
 * Strategy for different data types
 */
export function getConflictStrategy(dataType: string): ConflictResolutionStrategy {
  switch (dataType) {
    case 'order':
    case 'delivery':
    case 'payment':
      // Driver's changes are authoritative for deliveries
      return 'client-wins';
    
    case 'route':
      // Route progress/status changes from driver are authoritative
      return 'client-wins';
    
    case 'customer':
    case 'product':
      // Master data changes should come from server
      return 'server-wins';
    
    default:
      return 'client-wins';
  }
}
