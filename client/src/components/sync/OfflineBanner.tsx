import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeSyncEvent, EVENTS, getConnectionStatus } from '@/lib/syncService';

interface OfflineBannerProps {
  className?: string;
  sticky?: boolean;
  showDismiss?: boolean;
}

export function OfflineBanner({ 
  className,
  sticky = false,
  showDismiss = false
}: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissedByUser, setDismissedByUser] = useState(false);
  
  useEffect(() => {
    // Escuchar cambios en el estado de la conexión
    const unsubscribe = subscribeSyncEvent(
      EVENTS.ONLINE_STATUS_CHANGED,
      (e: Event) => {
        const customEvent = e as CustomEvent;
        setIsOffline(!customEvent.detail.isOnline);
      }
    );
    
    // Comprobar el estado actual
    const { isOnline } = getConnectionStatus();
    setIsOffline(!isOnline);
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  const handleDismiss = () => {
    setDismissedByUser(true);
  };
  
  // No mostrar si está online o si el usuario lo ha cerrado
  if (!isOffline || (dismissedByUser && !sticky)) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        'bg-amber-100 dark:bg-amber-900 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-100 px-4 py-2 text-sm flex items-center justify-between',
        sticky ? 'sticky top-0 z-50' : '',
        className
      )}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
        <span>Modo sin conexión: Los cambios se guardarán cuando la conexión se restaure</span>
      </div>
      
      {showDismiss && (
        <button 
          onClick={handleDismiss}
          className="ml-2 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
          aria-label="Cerrar aviso"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}