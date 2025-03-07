import { useEffect, useRef, useState } from 'react';
import { useToast } from './use-toast';

export interface WebSocketMessage {
  type: string;
  driverId?: number;
  routeId?: number;
  location?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Temporalmente deshabilitado para diagnóstico
  const connectWebSocket = () => {
    console.log('Conexión WebSocket deshabilitada temporalmente para diagnóstico');
    return;
  };

  const sendMessage = (message: WebSocketMessage) => {
    console.log('Envío de mensaje deshabilitado temporalmente:', message);
  };

  // No iniciar la conexión automáticamente
  useEffect(() => {
    console.log('Hook WebSocket en modo diagnóstico');
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected: false,
    sendMessage,
  };
}