import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { EVENTS, subscribeSyncEvent, getConnectionStatus } from '@/lib/syncService';

interface OfflineBannerProps {
  className?: string;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(() => getConnectionStatus().isOnline);
  const [pendingItems, setPendingItems] = useState(() => getConnectionStatus().pendingItemsCount);
  
  useEffect(() => {
    // Suscribirse a cambios en el estado de conexión
    const unsubscribeOnlineStatus = subscribeSyncEvent(
      EVENTS.ONLINE_STATUS_CHANGED,
      (event: Event) => {
        const customEvent = event as CustomEvent;
        setIsOnline(customEvent.detail.isOnline);
      }
    );
    
    // Suscribirse a cambios en elementos pendientes
    const unsubscribePendingItems = subscribeSyncEvent(
      EVENTS.PENDING_ITEMS_CHANGED,
      (event: Event) => {
        const customEvent = event as CustomEvent;
        setPendingItems(customEvent.detail.count);
      }
    );
    
    // Limpiar suscripciones al desmontar
    return () => {
      unsubscribeOnlineStatus();
      unsubscribePendingItems();
    };
  }, []);
  
  // No mostrar nada si está online y no hay elementos pendientes
  if (isOnline && pendingItems === 0) {
    return null;
  }
  
  return (
    <div 
      className={`w-full px-4 py-2 text-sm flex items-center justify-center
      ${isOnline 
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:bg-opacity-20 dark:text-yellow-300' 
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300'
      } ${className}`}
    >
      {isOnline ? (
        <>
          <RefreshCw size={16} className="mr-2" />
          <span>Tienes {pendingItems} operación(es) pendiente(s) de sincronizar</span>
        </>
      ) : (
        <>
          <CloudOff size={16} className="mr-2" />
          <span>
            Estás trabajando sin conexión. 
            {pendingItems > 0 && ` Hay ${pendingItems} operación(es) pendiente(s) de sincronizar.`} 
            Los cambios se guardarán cuando te conectes.
          </span>
        </>
      )}
    </div>
  );
};

export default OfflineBanner;