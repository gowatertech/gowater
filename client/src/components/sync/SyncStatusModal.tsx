import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { EVENTS, subscribeSyncEvent, forceSyncNow, getConnectionStatus } from '@/lib/syncService';

interface SyncStatusModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

const SyncStatusModal: React.FC<SyncStatusModalProps> = ({ isOpen: propIsOpen, onClose, children }) => {
  const [isOpen, setIsOpen] = useState(propIsOpen || false);
  
  // Si no se pasa onClose como prop, usamos este handler interno
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
  };
  const [syncState, setSyncState] = useState<{
    inProgress: boolean;
    completed: boolean;
    error: boolean;
    errorMessage: string;
    totalItems: number;
    successfulItems: number;
    failedItems: number;
    remainingItems: number;
    latestItem?: any;
  }>({
    inProgress: false,
    completed: false,
    error: false,
    errorMessage: '',
    totalItems: 0,
    successfulItems: 0,
    failedItems: 0,
    remainingItems: 0,
  });
  
  const [connectionStatus] = useState(() => getConnectionStatus());
  
  // Actualizamos el estado local cuando cambia la prop
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);
  
  // Manejar el clic en el children para abrir el modal
  const handleClick = () => {
    setIsOpen(true);
  };
  
  useEffect(() => {
    if (!isOpen) return;
    
    // Suscribirse a eventos de sincronización
    const unsubscribeSyncStarted = subscribeSyncEvent(EVENTS.SYNC_STARTED, () => {
      setSyncState(prev => ({
        ...prev,
        inProgress: true,
        completed: false,
        error: false,
        errorMessage: '',
      }));
    });
    
    const unsubscribeItemSynced = subscribeSyncEvent(EVENTS.ITEM_SYNCED, (event: Event) => {
      const customEvent = event as CustomEvent;
      const { item, success, error, progress } = customEvent.detail;
      
      setSyncState(prev => ({
        ...prev,
        totalItems: progress.total,
        successfulItems: progress.successful,
        failedItems: progress.failed,
        latestItem: item,
      }));
    });
    
    const unsubscribeSyncComplete = subscribeSyncEvent(EVENTS.SYNC_COMPLETE, (event: Event) => {
      const customEvent = event as CustomEvent;
      const { totalItems, successfulItems, failedItems, remainingItems } = customEvent.detail;
      
      setSyncState(prev => ({
        ...prev,
        inProgress: false,
        completed: true,
        totalItems,
        successfulItems,
        failedItems,
        remainingItems,
      }));
    });
    
    const unsubscribeSyncError = subscribeSyncEvent(EVENTS.SYNC_ERROR, (event: Event) => {
      const customEvent = event as CustomEvent;
      const { error } = customEvent.detail;
      
      setSyncState(prev => ({
        ...prev,
        inProgress: false,
        completed: true,
        error: true,
        errorMessage: error,
      }));
    });
    
    // Si no está sincronizando, iniciar sincronización automáticamente
    forceSyncNow()
      .then(() => console.log('Sincronización iniciada automáticamente'))
      .catch(error => console.error('Error al iniciar sincronización:', error));
    
    // Limpiar suscripciones al desmontar
    return () => {
      unsubscribeSyncStarted();
      unsubscribeItemSynced();
      unsubscribeSyncComplete();
      unsubscribeSyncError();
    };
  }, [isOpen]);
  
  // Calcular porcentaje de progreso
  const progressPercentage = syncState.totalItems 
    ? Math.round((syncState.successfulItems + syncState.failedItems) / syncState.totalItems * 100) 
    : 0;
    
  // Función para renderizar el contenido del modal
  const renderModalContent = () => {
    return (
      <>
        <div className="p-4">
          {/* Estado de conexión */}
          <div className="mb-4 flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${connectionStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{connectionStatus.isOnline ? 'Conectado' : 'Desconectado'}</span>
          </div>
          
          {/* Estado de sincronización */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm">Progreso</span>
              <span className="text-sm">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Información detallada */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Elementos totales:</span>
              <span className="font-semibold">{syncState.totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span>Sincronizados correctamente:</span>
              <span className="font-semibold text-green-600">{syncState.successfulItems}</span>
            </div>
            <div className="flex justify-between">
              <span>Fallidos:</span>
              <span className="font-semibold text-red-600">{syncState.failedItems}</span>
            </div>
            <div className="flex justify-between">
              <span>Pendientes:</span>
              <span className="font-semibold text-yellow-600">{syncState.remainingItems}</span>
            </div>
          </div>
          
          {/* Estado actual */}
          <div className={`flex items-center p-3 rounded-lg mb-4 bg-opacity-10
            ${syncState.inProgress ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300' : 
            syncState.error ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300' : 
            syncState.completed ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-300' : 
            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
            
            {syncState.inProgress ? (
              <>
                <RefreshCw size={20} className="mr-2 animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : syncState.error ? (
              <>
                <XCircle size={20} className="mr-2" />
                <span>Error: {syncState.errorMessage}</span>
              </>
            ) : syncState.completed ? (
              <>
                <CheckCircle size={20} className="mr-2" />
                <span>Sincronización completada</span>
              </>
            ) : (
              <>
                <AlertCircle size={20} className="mr-2" />
                <span>Esperando...</span>
              </>
            )}
          </div>
        </div>
        
        {/* Acciones */}
        <div className="border-t dark:border-gray-700 p-4 flex justify-end">
          <button 
            onClick={() => forceSyncNow()}
            disabled={syncState.inProgress || !connectionStatus.isOnline}
            className="mr-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sincronizar ahora
          </button>
          <button 
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </>
    );
  };
  
  // Si hay children, renderizar un wrapper que abra el modal al hacer clic
  if (children) {
    return (
      <>
        <div onClick={handleClick}>
          {children}
        </div>
        
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                <h2 className="text-xl font-semibold">Estado de sincronización</h2>
                <button 
                  onClick={handleClose} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Contenido del modal */}
              {renderModalContent()}
            </div>
          </div>
        )}
      </>
    );
  }
  
  // Si no hay children y el modal está cerrado, no renderizar nada
  if (!isOpen) return null;
  
  // Para el caso en que no hay children y el modal está abierto
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold">Estado de sincronización</h2>
          <button 
            onClick={handleClose} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Usamos la misma función para renderizar el contenido */}
        {renderModalContent()}
      </div>
    </div>
  );
};

export default SyncStatusModal;