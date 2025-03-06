import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { type User } from "@shared/schema";

export default function DeliveryTracking() {
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [driverLocations, setDriverLocations] = useState<Map<number, { lat: number; lng: number; timestamp: Date }>>(new Map());

  // Obtener lista de conductores activos
  const { data: drivers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "driver" && u.active),
  });

  useEffect(() => {
    // Conectar al WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Conexión WebSocket establecida");
      toast({
        title: "Conectado",
        description: "Seguimiento en tiempo real activado",
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "location_update") {
          setDriverLocations(prev => new Map(prev).set(data.driverId, {
            lat: data.location.latitude,
            lng: data.location.longitude,
            timestamp: new Date(data.location.timestamp)
          }));
        }
      } catch (error) {
        console.error("Error al procesar mensaje:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("Error WebSocket:", error);
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudo establecer la conexión para el seguimiento en tiempo real",
      });
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  return (
    <Card className="p-4">
      <div style={{ height: "600px", width: "100%" }}>
        <MapContainer
          center={[18.4955, -69.8734]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          className="rounded-lg"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {drivers.map((driver) => {
            const location = driverLocations.get(driver.id);
            if (!location) return null;

            const position: LatLngExpression = [location.lat, location.lng];
            return (
              <Marker key={driver.id} position={position}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-medium">{driver.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Última actualización: {new Date(location.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </Card>
  );
}
