import { useEffect, useRef, useState } from 'react';
import { useToast } from './use-toast';

export interface WebSocketMessage {
  type: string;
  driverId?: number;
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

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
        // Intentar reconectar después de 5 segundos
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('Error en WebSocket:', error);
        toast({
          variant: "default",
          title: "Conexión limitada",
          description: "Algunas actualizaciones en tiempo real no estarán disponibles",
        });
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          // Aquí puedes manejar los diferentes tipos de mensajes
          console.log('Mensaje WebSocket recibido:', data);
        } catch (error) {
          console.error('Error al procesar mensaje WebSocket:', error);
        }
      };
    } catch (error) {
      console.error('Error al crear conexión WebSocket:', error);
      // Intentar reconectar después de 5 segundos
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket no está conectado, mensaje no enviado:', message);
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    sendMessage,
  };
}
