import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, Cloud, CheckCircle } from 'lucide-react';
import { EVENTS, subscribeSyncEvent, getConnectionStatus } from '@/lib/syncService';
import SyncStatusModal from './SyncStatusModal';

interface SyncIndicatorProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({ 
  className = '',
  size = 'md',
  showTooltip = true 
}) => {
  const [isOnline, setIsOnline] = useState(() => getConnectionStatus().isOnline);
  const [pendingItems, setPendingItems] = useState(() => getConnectionStatus().pendingItemsCount);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    // Suscribirse a cambios en el estado de la conexión
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
    
    // Suscribirse a eventos de sincronización
    const unsubscribeSyncStarted = subscribeSyncEvent(
      EVENTS.SYNC_STARTED,
      () => setSyncing(true)
    );
    
    const unsubscribeSyncComplete = subscribeSyncEvent(
      EVENTS.SYNC_COMPLETE,
      () => setSyncing(false)
    );
    
    const unsubscribeSyncError = subscribeSyncEvent(
      EVENTS.SYNC_ERROR,
      () => setSyncing(false)
    );
    
    // Limpiar suscripciones al desmontar
    return () => {
      unsubscribeOnlineStatus();
      unsubscribePendingItems();
      unsubscribeSyncStarted();
      unsubscribeSyncComplete();
      unsubscribeSyncError();
    };
  }, []);
  
  // Determinar qué ícono y color mostrar según el estado
  let Icon: React.ElementType = CheckCircle;
  let iconColor = 'text-green-500';
  let tooltipText = 'Conectado y sincronizado';
  
  if (!isOnline) {
    Icon = CloudOff;
    iconColor = 'text-red-500';
    tooltipText = 'Sin conexión';
  } else if (syncing) {
    Icon = RefreshCw;
    iconColor = 'text-blue-500';
    tooltipText = 'Sincronizando...';
  } else if (pendingItems > 0) {
    Icon = Cloud;
    iconColor = 'text-yellow-500';
    tooltipText = `${pendingItems} elemento(s) pendiente(s) de sincronizar`;
  }
  
  // Determinar el tamaño del icono según la prop size
  const iconSizeMap = {
    sm: 16,
    md: 20,
    lg: 24
  };
  
  const iconSize = iconSizeMap[size];
  
  // Determinar el tamaño de la insignia según el tamaño del icono
  const badgeClassMap = {
    sm: 'h-3 w-3 text-[8px] -top-1 -right-1',
    md: 'h-4 w-4 text-xs -top-2 -right-2',
    lg: 'h-5 w-5 text-xs -top-2 -right-2'
  };
  
  const badgeClass = badgeClassMap[size];

  return (
    <>
      <div 
        className={`relative cursor-pointer flex items-center ${className}`}
        onClick={() => setShowModal(true)}
        title={showTooltip ? tooltipText : undefined}
      >
        <Icon 
          size={iconSize} 
          className={`${iconColor} ${syncing ? 'animate-spin' : ''}`} 
        />
        {pendingItems > 0 && !syncing && (
          <span className={`absolute bg-red-500 text-white rounded-full flex items-center justify-center ${badgeClass}`}>
            {pendingItems > 9 ? '9+' : pendingItems}
          </span>
        )}
      </div>
      
      {showModal && (
        <SyncStatusModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
};

export default SyncIndicator;