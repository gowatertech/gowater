import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck } from 'lucide-react';
import { ResponsiveMapContainer } from '@/components/ui/responsive-map-container';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Interfaces simplificadas
interface Delivery {
  id: number;
  customerName: string;
  customerAddress: string;
  coordinates: [number, number];
  estimatedTime: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled';
}

// Componente para ajustar mapa
function MapBoundsAdjuster({ deliveries }: { deliveries: Delivery[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (deliveries.length > 0) {
      const bounds = new L.LatLngBounds(
        deliveries.map(d => [d.coordinates[0], d.coordinates[1]])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [deliveries, map]);
  
  return null;
}

// Componente principal
export default function DriverView() {
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([19.075380, -70.128822]);
  
  // Fetching deliveries
  const deliveriesQuery = useQuery<Delivery[]>({
    queryKey: ['/api/driver/deliveries/today']
  });
  
  // Estado de carga
  const isLoading = deliveriesQuery.isLoading;
  const deliveries = deliveriesQuery.data || [];
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-[60vh]" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          Panel del Conductor
        </h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Ruta</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveMapContainer fixedHeight>
              <MapContainer 
                center={currentPosition} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* Marcador para la posición actual (almacén) */}
                <Marker 
                  position={currentPosition}
                  icon={L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="bg-green-600 flex items-center justify-center text-white rounded-full w-8 h-8 border-2 border-white shadow-lg">
                            <span class="text-white font-bold">0</span>
                          </div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                  })}
                >
                  <Popup>
                    <div className="p-1">
                      <p className="font-semibold">Almacén (punto 0)</p>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Marcadores para entregas */}
                {deliveries.map((delivery, index) => (
                  <Marker 
                    key={delivery.id}
                    position={delivery.coordinates}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div class="marker-pin ${delivery.status === 'delivered' ? 'bg-green-600' : delivery.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'} flex items-center justify-center text-white rounded-full w-8 h-8 border-2 border-white shadow-lg">
                              <span class="text-white font-bold">${index + 1}</span>
                            </div>`,
                      iconSize: [30, 30],
                      iconAnchor: [15, 15]
                    })}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-semibold">{delivery.customerName}</p>
                        <p className="text-xs">{delivery.customerAddress}</p>
                        <p className="text-xs mt-1">Hora: {new Date(delivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                
                <MapBoundsAdjuster deliveries={deliveries} />
              </MapContainer>
            </ResponsiveMapContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Entregas de Hoy ({deliveries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="border p-3 rounded-md">
                  <div className="font-medium">{delivery.customerName}</div>
                  <div className="text-sm text-gray-500">{delivery.customerAddress}</div>
                  <div className="mt-1 text-sm">
                    Estado: <span className={`font-medium ${delivery.status === 'delivered' ? 'text-green-600' : delivery.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {delivery.status === 'delivered' ? 'Entregado' : 
                       delivery.status === 'pending' ? 'Pendiente' : 
                       delivery.status === 'in_progress' ? 'En progreso' : 'Cancelado'}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Button size="sm">Ver detalles</Button>
                  </div>
                </div>
              ))}
              
              {deliveries.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No hay entregas programadas para hoy
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}