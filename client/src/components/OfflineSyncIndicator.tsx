import { useEffect } from 'react';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface OfflineSyncIndicatorProps {
  driverId?: number;
  compact?: boolean;
  darkMode?: boolean;
}

export function OfflineSyncIndicator({ 
  driverId, 
  compact = false,
  darkMode = false 
}: OfflineSyncIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    downloadData,
    syncNow,
    refreshStatus,
  } = useOfflineSync();

  const { toast } = useToast();

  // Refresh status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStatus().catch(err => {
        console.error('[OfflineSyncIndicator] Error refreshing status:', err);
      });
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleDownloadData = async () => {
    toast({
      title: 'Descargando datos',
      description: 'Preparando la app para uso offline...',
    });

    const success = await downloadData(driverId);

    if (success) {
      toast({
        title: 'Datos descargados',
        description: 'La app está lista para usar sin conexión',
        variant: 'default',
      });
    } else {
      toast({
        title: 'Error al descargar',
        description: 'No se pudieron descargar los datos. Verifica tu conexión.',
        variant: 'destructive',
      });
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline) {
      toast({
        title: 'Sin conexión',
        description: 'No hay conexión a internet disponible',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sincronizando',
      description: 'Enviando cambios al servidor...',
    });

    const count = await syncNow();

    if (count > 0) {
      toast({
        title: 'Sincronización completa',
        description: `Se sincronizaron ${count} acciones pendientes`,
        variant: 'default',
      });
    } else {
      toast({
        title: 'Todo sincronizado',
        description: 'No hay cambios pendientes',
        variant: 'default',
      });
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        
        {pendingCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {pendingCount}
          </Badge>
        )}
        
        {isSyncing && (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
        )}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="relative"
          data-testid="button-offline-sync-indicator"
        >
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className={`w-80 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}
        align="end"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Estado de Conexión
            </h4>
            
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Conectado
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Sin conexión (modo offline)
                  </span>
                </>
              )}
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {pendingCount} {pendingCount === 1 ? 'acción pendiente' : 'acciones pendientes'}
                </span>
              </div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Se sincronizarán automáticamente cuando haya conexión
              </p>
            </div>
          )}

          {lastSyncTime && (
            <div className="space-y-1">
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Última sincronización:
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {formatDistanceToNow(new Date(lastSyncTime), { 
                  addSuffix: true,
                  locale: es 
                })}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={handleDownloadData}
              disabled={!isOnline || isSyncing}
              className="w-full"
              data-testid="button-download-offline-data"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar datos para offline
            </Button>

            {isOnline && pendingCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="w-full"
                data-testid="button-sync-now"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar ahora
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
