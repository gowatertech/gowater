import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import type { RouteWithOrders } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ResponsiveMapContainer } from '@/components/ui/responsive-map-container';
import { useCompanySettings } from '@/hooks/use-company-settings';

interface RouteMapProps {
  route: RouteWithOrders;
  className?: string;
}

export default function RouteMap({ route, className }: RouteMapProps) {
  const { settings } = useCompanySettings();
  
  // Obtener los datos de los pedidos usando el endpoint correcto
  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/routes', route.id, 'orders'],
    queryFn: async () => {
      const response = await fetch(`/api/routes/${route.id}/orders`);
      if (!response.ok) {
        throw new Error("Error al cargar las órdenes de la ruta");
      }
      return response.json();
    },
    enabled: !!route.orderIds && route.orderIds.length > 0
  });

  // Verificar si hay orderIds
  if (!route || !route.orderIds || route.orderIds.length === 0) {
    return (
      <div className={`rounded-md border p-4 ${className}`}>
        <div className="p-4 text-center text-muted-foreground">
          No hay pedidos asignados a esta ruta
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`rounded-md border p-4 ${className}`}>
        <div className="p-4 text-center text-muted-foreground">
          Cargando mapa...
        </div>
      </div>
    );
  }

  // Parsear coordenadas de los pedidos
  const ordersArray = Array.isArray(orders) ? orders : [];
  // Agrupar pedidos por ubicación (coordenadas) para evitar marcadores duplicados
  const stopsByLocation = new Map<string, { position: [number, number]; orders: any[] }>();
  
  ordersArray.forEach((order: any) => {
    try {
      // Usar deliveryCoordinates si existe, sino usar coordinates del cliente
      const coordString = order.deliveryCoordinates || order.coordinates;
      if (!coordString || typeof coordString !== 'string') return;
      
      const parts = coordString.split(',');
      if (parts.length !== 2) return;
      
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      
      if (isNaN(lat) || isNaN(lng)) return;
      
      // Usar coordenadas como clave para agrupar
      const key = `${lat},${lng}`;
      
      if (!stopsByLocation.has(key)) {
        stopsByLocation.set(key, {
          position: [lat, lng] as [number, number],
          orders: []
        });
      }
      
      stopsByLocation.get(key)?.orders.push(order);
    } catch (error) {
      console.error('Error parsing order coordinates:', error, order);
    }
  });
  
  // Ordenar paradas por deliverySequence del primer pedido de cada parada
  const stopCoordinates = Array.from(stopsByLocation.values())
    .map(stop => ({
      ...stop,
      firstSequence: Math.min(...stop.orders.map((o: any) => o.deliverySequence || Infinity))
    }))
    .sort((a, b) => a.firstSequence - b.firstSequence)
    .map(({ position, orders }) => ({ position, orders }));

  if (stopCoordinates.length === 0) {
    return (
      <div className={`rounded-md border p-4 ${className}`}>
        <div className="p-4 text-center text-muted-foreground">
          No se pudieron parsear las coordenadas de los pedidos
        </div>
      </div>
    );
  }

  // Obtener coordenadas del almacén desde settings
  const depotPosition: [number, number] | null = 
    settings?.latitude && settings?.longitude
      ? [parseFloat(settings.latitude), parseFloat(settings.longitude)]
      : null;

  // Calcular centro del mapa basado en el almacén o primer punto
  const mapCenter = depotPosition || stopCoordinates[0]?.position || [18.4955, -69.8734] as [number, number];
  
  // Crear array de posiciones para las líneas de ruta (almacén -> paradas -> almacén)
  const routePositions: [number, number][] = [];
  if (depotPosition) {
    routePositions.push(depotPosition);
    stopCoordinates.forEach(({ position }) => routePositions.push(position));
    routePositions.push(depotPosition); // Regresar al almacén
  } else {
    // Si no hay almacén, solo conectar las paradas
    stopCoordinates.forEach(({ position }) => routePositions.push(position));
  }

  return (
    <div className={className}>
      <ResponsiveMapContainer fixedHeight aspectRatio="wide">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Dibujar línea de ruta desde almacén a paradas y vuelta al almacén */}
          {routePositions.length > 1 && (
            <Polyline 
              positions={routePositions} 
              color="#2563eb" 
              weight={3}
              dashArray="5, 10"
            />
          )}
          
          {/* Marcador del almacén/depósito */}
          {depotPosition && (
            <Marker
              position={depotPosition}
              icon={new L.DivIcon({
                html: `<div class="flex items-center justify-center bg-green-600 text-white rounded-lg w-8 h-8 text-sm font-semibold shadow-lg">🏢</div>`,
                className: 'custom-depot-icon',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })}
            >
              <Popup>
                <div>
                  <strong>Almacén</strong>
                  <div>{settings?.name || 'Punto de partida'}</div>
                  <div className="text-xs text-gray-500">
                    {depotPosition[0].toFixed(6)}, {depotPosition[1].toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Mostrar marcadores para cada parada */}
          {stopCoordinates.map(({ position, orders }, index: number) => {
            // Crear un icono personalizado con el número de parada
            const customIcon = new L.DivIcon({
              html: `<div class="flex items-center justify-center bg-blue-600 text-white rounded-full w-8 h-8 text-sm font-semibold shadow-md">${index + 1}</div>`,
              className: 'custom-number-icon',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
            
            // Obtener datos del primer pedido para mostrar información básica
            const firstOrder = orders[0];
            const deliveryCount = orders.length;
            const totalAmount = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0);
            
            return (
              <Marker
                key={`stop-${index}`}
                position={position}
                icon={customIcon}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <strong className="text-base">Parada #{index + 1}</strong>
                    <div className="mt-2">
                      <strong>Cliente:</strong> {firstOrder.customerName}
                    </div>
                    <div>
                      <strong>Dirección:</strong> {firstOrder.street} {firstOrder.streetnumber}
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <strong>Entregas:</strong> {deliveryCount}
                    </div>
                    <div>
                      <strong>Total:</strong> RD${totalAmount.toFixed(2)}
                    </div>
                    {deliveryCount > 1 && (
                      <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                        {orders.map((o: any, i: number) => (
                          <div key={o.id}>
                            Pedido #{o.id}: RD${parseFloat(o.total).toFixed(2)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </ResponsiveMapContainer>
    </div>
  );
}
