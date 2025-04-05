import React, { useEffect, useState } from 'react';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  subscribeSyncEvent, 
  EVENTS, 
  getConnectionStatus,
  forceSyncNow,
  getPendingItemsCount
} from '@/lib/syncService';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  WifiOff, 
  Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SyncStatusModalProps {
  children: React.ReactNode;
}

interface SyncItem {
  id: number;
  endpoint: string;
  entityType: string;
  operationType: string;
  status: string;
  timestamp: Date;
  error?: string;
}

export function SyncStatusModal({ children }: SyncStatusModalProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncItems, setSyncItems] = useState<SyncItem[]>([]);
  const [syncProgress, setSyncProgress] = useState({
    current: 0,
    total: 0,
    successful: 0,
    failed: 0
  });
  const [open, setOpen] = useState(false);
  
  // Inicializar y suscribirse a eventos
  useEffect(() => {
    const { isOnline: online } = getConnectionStatus();
    setIsOnline(online);
    
    // Obtener el número de elementos pendientes
    getPendingItemsCount().then(count => {
      setPendingCount(count);
    });
    
    // Cambio de estado de conexión
    const unsubscribeConnectionChange = subscribeSyncEvent(
      EVENTS.ONLINE_STATUS_CHANGED,
      (e: Event) => {
        const customEvent = e as CustomEvent;
        setIsOnline(customEvent.detail.isOnline);
      }
    );
    
    // Inicio de sincronización
    const unsubscribeSyncStart = subscribeSyncEvent(
      EVENTS.SYNC_STARTED,
      () => {
        setIsSyncing(true);
        setSyncProgress({
          current: 0,
          total: 0,
          successful: 0,
          failed: 0
        });
      }
    );
    
    // Sincronización de un elemento
    const unsubscribeItemSynced = subscribeSyncEvent(
      EVENTS.ITEM_SYNCED,
      (e: Event) => {
        const customEvent = e as CustomEvent;
        const { item, success, error, progress } = customEvent.detail;
        
        // Actualizar la lista de elementos
        setSyncItems(prev => {
          const items = [...prev];
          const index = items.findIndex(i => i.id === item.id);
          
          const updatedItem: SyncItem = {
            id: item.id,
            endpoint: item.endpoint,
            entityType: item.entityType,
            operationType: item.operationType,
            status: success ? 'success' : 'error',
            timestamp: new Date(),
            error: error
          };
          
          if (index >= 0) {
            items[index] = updatedItem;
          } else {
            items.unshift(updatedItem);
          }
          
          // Mantener solo los últimos 20 elementos
          return items.slice(0, 20);
        });
        
        // Actualizar el progreso
        setSyncProgress(progress);
      }
    );
    
    // Sincronización completada
    const unsubscribeSyncComplete = subscribeSyncEvent(
      EVENTS.SYNC_COMPLETE,
      (e: Event) => {
        const customEvent = e as CustomEvent;
        setIsSyncing(false);
        setPendingCount(customEvent.detail.remainingItems);
        setLastSyncTime(new Date());
        
        // Limpiar progreso después de un tiempo
        setTimeout(() => {
          setSyncProgress({
            current: 0,
            total: 0,
            successful: 0,
            failed: 0
          });
        }, 5000);
      }
    );
    
    // Error de sincronización
    const unsubscribeSyncError = subscribeSyncEvent(
      EVENTS.SYNC_ERROR,
      (e: Event) => {
        const customEvent = e as CustomEvent;
        setIsSyncing(false);
      }
    );
    
    // Cambio en elementos pendientes
    const unsubscribePendingChanged = subscribeSyncEvent(
      EVENTS.PENDING_ITEMS_CHANGED,
      (e: Event) => {
        const customEvent = e as CustomEvent;
        setPendingCount(customEvent.detail.count);
      }
    );
    
    return () => {
      unsubscribeConnectionChange();
      unsubscribeSyncStart();
      unsubscribeItemSynced();
      unsubscribeSyncComplete();
      unsubscribeSyncError();
      unsubscribePendingChanged();
    };
  }, []);
  
  // Forzar sincronización manual
  const handleSync = () => {
    if (!isSyncing && isOnline) {
      forceSyncNow();
    }
  };
  
  // Renderizar etiqueta según tipo de operación
  const renderOperationBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'create':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Crear</Badge>;
      case 'update':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Actualizar</Badge>;
      case 'delete':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Eliminar</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">{type}</Badge>;
    }
  };
  
  // Renderizar tarjeta de estado
  const renderStatusCard = () => {
    let icon;
    let title;
    let description;
    let color;
    
    if (!isOnline) {
      icon = <WifiOff className="w-8 h-8 text-amber-500" />;
      title = "Sin conexión";
      description = pendingCount > 0 
        ? `${pendingCount} cambios pendientes de sincronización` 
        : "No hay cambios pendientes";
      color = "text-amber-700";
    } else if (isSyncing) {
      icon = <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />;
      title = "Sincronizando";
      description = `Procesando ${syncProgress.current} de ${syncProgress.total} cambios`;
      color = "text-blue-700";
    } else if (pendingCount > 0) {
      icon = <CheckCircle className="w-8 h-8 text-gray-400" />;
      title = "Conectado";
      description = `${pendingCount} cambios pendientes de sincronización`;
      color = "text-gray-700";
    } else {
      icon = <CheckCircle className="w-8 h-8 text-green-500" />;
      title = "Sincronizado";
      description = "Todos los cambios están actualizados";
      color = "text-green-700";
    }
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border">
        <div className="flex items-center space-x-4">
          {icon}
          <div>
            <h3 className={`font-medium ${color}`}>{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        
        {isSyncing && syncProgress.total > 0 && (
          <div className="mt-3">
            <Progress 
              value={(syncProgress.current / syncProgress.total) * 100} 
              className="h-2" 
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>{syncProgress.successful} completados</span>
              <span>{syncProgress.failed} errores</span>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Estado de Sincronización</SheetTitle>
          <SheetDescription>
            Estado actual de la conexión y sincronización de datos
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          {/* Panel de estado */}
          <div className="mb-4">
            {renderStatusCard()}
          </div>
          
          {/* Botón de sincronización */}
          <div className="flex justify-center">
            <Button 
              onClick={handleSync} 
              disabled={!isOnline || isSyncing || pendingCount === 0}
              className="flex items-center"
            >
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sincronizar ahora
            </Button>
          </div>
          
          <Separator />
          
          {/* Información de la última sincronización */}
          <div className="text-sm text-center text-gray-500 dark:text-gray-400">
            {lastSyncTime ? (
              <p>Última sincronización: {lastSyncTime.toLocaleString()}</p>
            ) : (
              <p>Sin sincronizaciones recientes</p>
            )}
          </div>
          
          {/* Lista de actividad reciente */}
          <div>
            <h3 className="font-medium mb-2">Actividad reciente</h3>
            
            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2">
              {syncItems.length > 0 ? (
                syncItems.map((item, index) => (
                  <div 
                    key={index} 
                    className="border rounded-md p-3 text-sm bg-white dark:bg-gray-800"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{item.entityType}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.endpoint}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {renderOperationBadge(item.operationType)}
                        {item.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                    {item.error && (
                      <div className="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded">
                        {item.error}
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-6">
                  No hay actividad reciente
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}