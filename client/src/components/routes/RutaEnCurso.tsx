import { useEffect, useState } from "react";
import { useWebSocket, type WebSocketMessage } from "@/hooks/use-websocket";
import { type Ruta } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff } from "lucide-react";

interface RutaEnCursoProps {
  ruta: Ruta;
}

export default function RutaEnCurso({ ruta }: RutaEnCursoProps) {
  const { isConnected, sendMessage } = useWebSocket();
  const [ubicacionActual, setUbicacionActual] = useState<[number, number] | null>(null);
  const { toast } = useToast();

  // Manejar actualizaciones de ubicación incluso sin WebSocket
  useEffect(() => {
    // Si no hay WebSocket, actualizar la ubicación cada 30 segundos vía API REST
    if (!isConnected) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/rutas/${ruta.id}/ubicacion`);
          const data = await response.json();
          if (data.ubicacionActual) {
            const [lat, lng] = data.ubicacionActual.split(',').map(Number);
            setUbicacionActual([lat, lng]);
          }
        } catch (error) {
          console.error('Error al obtener ubicación:', error);
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected, ruta.id]);

  // Procesar mensajes WebSocket cuando está disponible
  useEffect(() => {
    if (isConnected) {
      // Suscribirse a actualizaciones de la ruta
      sendMessage({
        type: 'subscribe_route',
        routeId: ruta.id,
      });
    }
  }, [isConnected, ruta.id]);

  return (
    <div className="space-y-4">
      {!isConnected && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Modo fuera de línea: Las actualizaciones pueden tener retraso
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{ruta.nombre}</h2>
        {isConnected ? (
          <Wifi className="h-5 w-5 text-green-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {ubicacionActual && (
        <div className="h-[400px] rounded-lg overflow-hidden">
          <MapContainer
            center={ubicacionActual}
            zoom={13}
            className="h-full w-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={ubicacionActual}>
              <Popup>
                Ubicación actual del vehículo
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium">Estado</h3>
          <p>{ruta.estado}</p>
        </div>
        <div>
          <h3 className="font-medium">Conductor</h3>
          <p>{ruta.conductorId}</p>
        </div>
      </div>
    </div>
  );
}
