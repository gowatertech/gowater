import React, { useEffect, useState } from 'react';
import { Loader2, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  subscribeSyncEvent, 
  EVENTS, 
  getConnectionStatus,
  forceSyncNow 
} from '@/lib/syncService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SyncIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showTooltip?: boolean;
}

// Diferentes estados del indicador
type SyncState = 'online' | 'offline' | 'syncing' | 'error';

// Mapa de tamaños para íconos
const sizeMap = {
  sm: { icon: 14, text: 'text-xs' },
  md: { icon: 18, text: 'text-sm' },
  lg: { icon: 22, text: 'text-base' }
};

export function SyncIndicator({ 
  className,
  size = 'md',
  showCount = false,
  showTooltip = true
}: SyncIndicatorProps) {
  const [syncState, setSyncState] = useState<SyncState>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // Tamaño del ícono según la prop size
  const { icon: iconSize, text: textSize } = sizeMap[size];
  
  // Iniciar el estado según la conectividad actual
  useEffect(() => {
    // Obtener estado inicial
    const { isOnline, pendingItemsCount } = getConnectionStatus();
    setSyncState(isOnline ? 'online' : 'offline');
    setPendingCount(pendingItemsCount);
    
    // Suscribirse a cambios en el estado de conexión
    const unsubscribeConnectionChange = subscribeSyncEvent(
      EVENTS.ONLINE_STATUS_CHANGED,
      (e: Event) => {
        const customEvent = e as CustomEvent;
        setSyncState(customEvent.detail.isOnline ? 'online' : 'offline');
      }
    );
    
    // Suscribirse a cambios en el estado de sincronización
    const unsubscribeSyncStart = subscribeSyncEvent(
      EVENTS.SYNC_STARTED,
      () => {
        setSyncState('syncing');
        setSyncError(null);
      }
    );
    
    const unsubscribeSyncComplete = subscribeSyncEvent(
      EVENTS.SYNC_COMPLETE,
      (e: Event) => {
        const customEvent = e as CustomEvent;
        setPendingCount(customEvent.detail.remainingItems);
        setSyncState(navigator.onLine ? 'online' : 'offline');
      }
    );
    
    const unsubscribeSyncError = subscribeSyncEvent(
      EVENTS.SYNC_ERROR,
      (e: Event) => {
        const customEvent = e as CustomEvent;
        setSyncError(customEvent.detail.error);
        setSyncState('error');
      }
    );
    
    const unsubscribePendingChanged = subscribeSyncEvent(
      EVENTS.PENDING_ITEMS_CHANGED,
      (e: Event) => {
        const customEvent = e as CustomEvent;
        setPendingCount(customEvent.detail.count);
      }
    );
    
    // Limpiar suscripciones
    return () => {
      unsubscribeConnectionChange();
      unsubscribeSyncStart();
      unsubscribeSyncComplete();
      unsubscribeSyncError();
      unsubscribePendingChanged();
    };
  }, []);
  
  // Determinar qué ícono mostrar según el estado
  const renderIcon = () => {
    switch (syncState) {
      case 'offline':
        return <WifiOff size={iconSize} className="text-amber-500" />;
      case 'syncing':
        return <Loader2 size={iconSize} className="text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle size={iconSize} className="text-red-500" />;
      case 'online':
      default:
        return pendingCount > 0 
          ? <CheckCircle size={iconSize} className="text-gray-400" />
          : <CheckCircle size={iconSize} className="text-green-500" />;
    }
  };
  
  // Determinar el texto del tooltip
  const getTooltipText = () => {
    switch (syncState) {
      case 'offline':
        return pendingCount > 0 
          ? `Sin conexión (${pendingCount} cambios pendientes)`
          : 'Sin conexión';
      case 'syncing':
        return 'Sincronizando datos...';
      case 'error':
        return `Error al sincronizar: ${syncError || 'Error desconocido'}`;
      case 'online':
      default:
        return pendingCount > 0 
          ? `En línea (${pendingCount} cambios pendientes)`
          : 'Datos sincronizados';
    }
  };
  
  // Manejar clic para forzar sincronización manual
  const handleClick = () => {
    if (syncState !== 'syncing' && navigator.onLine) {
      forceSyncNow();
    }
  };
  
  const indicator = (
    <div 
      className={cn(
        'flex items-center cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      {renderIcon()}
      
      {showCount && pendingCount > 0 && (
        <span className={cn('ml-1', textSize)}>
          {pendingCount}
        </span>
      )}
    </div>
  );
  
  // Envolver en tooltip si es necesario
  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return indicator;
}