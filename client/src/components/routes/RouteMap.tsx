import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import type { RouteWithOrders } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ResponsiveMapContainer } from '@/components/ui/responsive-map-container';

interface RouteMapProps {
  route: RouteWithOrders;
  className?: string;
}

export default function RouteMap({ route, className }: RouteMapProps) {
  // Obtener los datos de los pedidos usando los orderIds
  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/routes', route.id, 'orders'],
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
  const stopCoordinates = (orders || []).map((order: any) => {
    try {
      if (!order.coordinates) return null;
      
      if (typeof order.coordinates === 'string') {
        const parts = order.coordinates.split(',');
        if (parts.length !== 2) return null;
        
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        
        if (isNaN(lat) || isNaN(lng)) return null;
        
        return { position: [lat, lng] as [number, number], order };
      }
      return null;
    } catch (error) {
      console.error('Error parsing order coordinates:', error, order);
      return null;
    }
  }).filter(item => item !== null);

  if (stopCoordinates.length === 0) {
    return (
      <div className={`rounded-md border p-4 ${className}`}>
        <div className="p-4 text-center text-muted-foreground">
          No se pudieron parsear las coordenadas de los pedidos
        </div>
      </div>
    );
  }

  // Calcular centro del mapa basado en el primer punto
  const mapCenter = stopCoordinates[0]?.position || [18.4955, -69.8734]; // Default: Santo Domingo
  const positions = stopCoordinates.map(item => item.position);

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
          
          {/* Dibujar línea entre paradas para mostrar la ruta */}
          {positions.length > 1 && (
            <Polyline 
              positions={positions} 
              color="blue" 
              weight={3}
            />
          )}
          
          {/* Mostrar marcadores para cada parada */}
          {stopCoordinates.map(({ position, order }, index) => {
            // Crear un icono personalizado con el número de parada
            const customIcon = new L.DivIcon({
              html: `<div class="flex items-center justify-center bg-blue-600 text-white rounded-full w-6 h-6 text-sm font-semibold">${index + 1}</div>`,
              className: 'custom-number-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            
            return (
              <Marker
                key={order.id}
                position={position}
                icon={customIcon}
              >
                <Popup>
                  <div>
                    <strong>Parada #{index + 1}</strong>
                    <div><strong>Cliente:</strong> {order.customerName}</div>
                    <div><strong>Dirección:</strong> {order.customerAddress}</div>
                    <div><strong>Total:</strong> ${order.total}</div>
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
