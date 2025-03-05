import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import { Check, Navigation2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Ejemplo de datos de entrega
const deliveries = [
  {
    id: 1,
    address: "Calle Principal 123, Santo Domingo",
    coordinates: [18.4955, -69.8734],
    customerName: "Juan Pérez",
    order: "2 Botellones de agua",
    time: "10:00 AM"
  },
  {
    id: 2,
    address: "Av. Abraham Lincoln 456, Santo Domingo",
    coordinates: [18.4880, -69.8710],
    customerName: "María García",
    order: "3 Botellones de agua",
    time: "10:30 AM"
  }
];

export default function DriverView() {
  const { t } = useTranslation();
  const [selectedDelivery, setSelectedDelivery] = useState<number | null>(null);
  const [completedDeliveries, setCompletedDeliveries] = useState<number[]>([]);

  const handleComplete = (deliveryId: number) => {
    setCompletedDeliveries([...completedDeliveries, deliveryId]);
  };

  const handleShowMap = (deliveryId: number) => {
    setSelectedDelivery(deliveryId);
  };

  const selectedDeliveryData = deliveries.find(d => d.id === selectedDelivery);

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
                        onClick={() => handleShowMap(delivery.id)}
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
            center={[18.4955, -69.8734]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            className="rounded-lg"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {selectedDeliveryData && (
              <Marker position={selectedDeliveryData.coordinates as LatLngExpression}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-medium">{selectedDeliveryData.customerName}</h3>
                    <p className="text-sm">{selectedDeliveryData.address}</p>
                    <p className="text-sm text-muted-foreground">{selectedDeliveryData.order}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </Card>
      </div>
    </div>
  );
}