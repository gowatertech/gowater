import { useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { type Ruta } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Wifi, WifiOff } from "lucide-react";

interface RutaEnCursoProps {
  ruta: Ruta;
}

export default function RutaEnCurso({ ruta }: RutaEnCursoProps) {
  const { isConnected } = useWebSocket(); // No necesitamos sendMessage por ahora
  const [ubicacionActual, setUbicacionActual] = useState<[number, number] | null>(null);
  const { toast } = useToast();

  // Actualizar ubicación vía API REST
  useEffect(() => {
    // Cargar ubicación inicial desde la ruta
    if (ruta.ubicacionActual) {
      const [lat, lng] = ruta.ubicacionActual.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        setUbicacionActual([lat, lng]);
      }
    }

    // Configurar polling cada 30 segundos
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/rutas/${ruta.id}/ubicacion`);
        if (!response.ok) {
          throw new Error(`Error al obtener ubicación: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.ubicacionActual) {
          const [lat, lng] = data.ubicacionActual.split(',').map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            setUbicacionActual([lat, lng]);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error al obtener ubicación:', errorMessage);

        if (!errorMessage.includes('404')) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo actualizar la ubicación del vehículo"
          });
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [ruta.id, ruta.ubicacionActual, toast]);

  return (
    <div className="space-y-4">
      <Alert variant="warning">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          Modo fuera de línea: Las actualizaciones se realizan cada 30 segundos
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{ruta.nombre}</h2>
        {isConnected ? (
          <Wifi className="h-5 w-5 text-green-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-gray-400" />
        )}
      </div>

      <div className="h-[400px] rounded-lg overflow-hidden">
        {ubicacionActual ? (
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
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">No hay datos de ubicación disponibles</p>
          </div>
        )}
      </div>

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