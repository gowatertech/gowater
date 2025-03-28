import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { Check, Navigation2, RefreshCcw, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import RecurringOrderManager from "@/components/orders/RecurringOrderManager";
import 'leaflet/dist/leaflet.css';
import "@/styles/map-responsive.css";
import { PrinterManager } from "@/components/printer/PrinterManager";
import { PrintableReceipt } from "@/components/printer/PrintableReceipt";

// Ejemplo de datos - esto vendrá de la API
interface Delivery {
  id: number;
  businessName: string;
  address: string;
  coordinates: [number, number];
  order: string;
  isRecurring: boolean;
  frequency?: string;
  nextDelivery?: string;
  status: 'pending' | 'completed';
}

export default function DriverView() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedDelivery, setSelectedDelivery] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([18.4955, -69.8734]);
  const [printer, setPrinter] = useState<any>(null);

  // Obtener las entregas del día
  const { data: deliveries = [], refetch } = useQuery<Delivery[]>({
    queryKey: ['/api/deliveries/today'],
    queryFn: async () => {
      // Temporalmente retornamos datos de ejemplo
      return [
        {
          id: 1,
          businessName: "Supermercado Nacional",
          address: "Av. Winston Churchill",
          coordinates: [18.4739, -69.9345],
          order: "5 Botellones",
          isRecurring: true,
          frequency: "Semanal",
          nextDelivery: "2025-03-16",
          status: 'pending'
        },
        {
          id: 2,
          businessName: "Restaurante La Plaza",
          address: "Av. Abraham Lincoln",
          coordinates: [18.4663, -69.9317],
          order: "8 Botellones",
          isRecurring: true,
          frequency: "Quincenal",
          nextDelivery: "2025-03-23",
          status: 'pending'
        }
      ];
    }
  });

  // Marcar entrega como completada
  const handleComplete = async (deliveryId: number) => {
    try {
      // Aquí irá la llamada a la API
      // await apiRequest('POST', `/api/deliveries/${deliveryId}/complete`);

      toast({
        title: "Entrega Completada",
        description: "La entrega ha sido marcada como completada",
      });

      refetch(); // Actualizar lista de entregas
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al completar la entrega",
      });
    }
  };

  // Actualizar frecuencia de pedido recurrente
  const handleUpdateFrequency = async (deliveryId: number, frequency: string) => {
    try {
      // Aquí irá la llamada a la API
      // await apiRequest('PATCH', `/api/recurring-orders/${deliveryId}`, { frequency });

      toast({
        title: "Frecuencia Actualizada",
        description: "La frecuencia del pedido recurrente ha sido actualizada",
      });

      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar la frecuencia",
      });
    }
  };

  const handlePrint = async (delivery: Delivery) => {
    if (!printer) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor conecte una impresora primero",
      });
      return;
    }

    const { printReceipt } = PrintableReceipt({ delivery, printer });
    await printReceipt();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Entregas del Día</h2>
        <div className="flex gap-2">
          <PrinterManager onPrinterReady={setPrinter} />
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lista de entregas */}
        <Card className="p-4">
          <ScrollArea className="h-[70vh]">
            <div className="space-y-4">
              {deliveries.map((delivery) => (
                <Card
                  key={delivery.id}
                  className={`p-4 hover:bg-accent/5 transition-colors ${
                    delivery.status === 'completed' ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{delivery.businessName}</h3>
                        <RecurringOrderManager
                          orderId={delivery.id}
                          isRecurring={delivery.isRecurring}
                          currentFrequency={delivery.frequency}
                          nextDelivery={delivery.nextDelivery}
                          onUpdateFrequency={(frequency) => handleUpdateFrequency(delivery.id, frequency)}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">{delivery.address}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDelivery(delivery.id)}
                        title="Ver en Mapa"
                      >
                        <Navigation2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrint(delivery)}
                        title="Imprimir Factura"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleComplete(delivery.id)}
                        disabled={delivery.status === 'completed'}
                        title="Marcar como Completada"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{delivery.order}</p>
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
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Marcadores de entregas */}
            {deliveries.map((delivery) => (
              delivery.id === selectedDelivery && (
                <Marker
                  key={delivery.id}
                  position={delivery.coordinates as LatLngExpression}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-medium">{delivery.businessName}</h3>
                      <p className="text-sm">{delivery.address}</p>
                      <p className="text-sm font-medium">{delivery.order}</p>
                      {delivery.isRecurring && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {delivery.frequency} - Próxima: {new Date(delivery.nextDelivery!).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </Card>
      </div>
    </div>
  );
}