import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression, Icon, divIcon } from 'leaflet';
import { Check, Navigation2, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Crear un icono personalizado para el conductor
const driverIcon = divIcon({
  className: 'bg-blue-500 rounded-full border-2 border-white shadow-lg',
  iconSize: [20, 20],
  html: '<div class="w-full h-full flex items-center justify-center"><svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/></svg></div>'
});

// Datos de ejemplo de entregas
const deliveries = [
  {
    id: 1,
    address: "Av. Winston Churchill, Plaza Acrópolis, Santo Domingo",
    coordinates: [18.4739, -69.9345],
    customerName: "Supermercado Nacional",
    order: "5 Botellones de agua",
    time: "9:00 AM",
    status: "pending"
  },
  {
    id: 2,
    address: "Av. Abraham Lincoln, Blue Mall, Santo Domingo",
    coordinates: [18.4663, -69.9317],
    customerName: "Restaurante La Plaza",
    order: "8 Botellones de agua",
    time: "9:30 AM",
    status: "pending"
  },
  {
    id: 3,
    address: "Av. Sarasota, Torre Empresarial, Santo Domingo",
    coordinates: [18.4572, -69.9331],
    customerName: "Oficina Corporativa XYZ",
    order: "10 Botellones de agua",
    time: "10:00 AM",
    status: "pending"
  },
  {
    id: 4,
    address: "Av. Tiradentes, Plaza Central, Santo Domingo",
    coordinates: [18.4697, -69.9277],
    customerName: "Gimnasio PowerFit",
    order: "6 Botellones de agua",
    time: "10:30 AM",
    status: "pending"
  }
];

export default function DriverView() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedDelivery, setSelectedDelivery] = useState<number | null>(null);
  const [completedDeliveries, setCompletedDeliveries] = useState<number[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([18.4955, -69.8734]);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    // Configurar WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Conexión WebSocket establecida");
      toast({
        title: "Conectado",
        description: "Seguimiento en tiempo real activado",
      });

      // Iniciar seguimiento de ubicación
      if ("geolocation" in navigator) {
        const id = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation: [number, number] = [
              position.coords.latitude,
              position.coords.longitude
            ];
            setCurrentLocation(newLocation);

            // Enviar actualización de ubicación
            ws.send(JSON.stringify({
              type: 'driver_location',
              driverId: 1, // ID del conductor actual
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }));
          },
          (error) => {
            console.error("Error de geolocalización:", error);
            toast({
              variant: "destructive",
              title: "Error de ubicación",
              description: "No se pudo obtener la ubicación actual"
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
        setWatchId(id);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Geolocalización no disponible en este dispositivo"
        });
      }
    };

    ws.onerror = (error) => {
      console.error("Error WebSocket:", error);
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudo establecer la conexión para el seguimiento"
      });
    };

    setSocket(ws);

    // Cleanup
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      ws.close();
    };
  }, []);

  const handleComplete = (deliveryId: number) => {
    setCompletedDeliveries([...completedDeliveries, deliveryId]);
    toast({
      title: "Entrega Completada",
      description: `La entrega #${deliveryId} ha sido marcada como completada`
    });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Entregas del día</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lista de entregas */}
        <Card className="p-4">
          <ScrollArea className="h-[70vh]">
            <div className="space-y-4">
              {deliveries.map((delivery) => (
                <Card
                  key={delivery.id}
                  className={`p-4 transition-opacity ${
                    completedDeliveries.includes(delivery.id) ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{delivery.customerName}</h3>
                      <p className="text-sm text-muted-foreground">{delivery.time}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDelivery(delivery.id)}
                      >
                        <Navigation2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleComplete(delivery.id)}
                        disabled={completedDeliveries.includes(delivery.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm">{delivery.order}</p>
                  <p className="text-sm text-muted-foreground">{delivery.address}</p>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Mapa */}
        <Card className="p-0 h-[70vh]">
          <MapContainer
            center={currentLocation}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            className="rounded-lg"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Marcador de ubicación actual */}
            <Marker position={currentLocation} icon={driverIcon}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-medium">Mi ubicación actual</h3>
                  <p className="text-sm text-muted-foreground">
                    Última actualización: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Marcadores de entregas */}
            {selectedDelivery && deliveries.map(delivery =>
              delivery.id === selectedDelivery && (
                <Marker key={delivery.id} position={delivery.coordinates as LatLngExpression}>
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-medium">{delivery.customerName}</h3>
                      <p className="text-sm">{delivery.address}</p>
                      <p className="text-sm text-muted-foreground">{delivery.order}</p>
                    </div>
                  </Popup>
                </Marker>
              )
            )}
          </MapContainer>
        </Card>
      </div>
    </div>
  );
}