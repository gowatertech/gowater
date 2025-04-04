import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteStop } from '@/types/route';
import { ResponsiveMapContainer } from '@/components/ui/responsive-map-container';

interface RouteDetailMapProps {
  stops: RouteStop[];
  currentStopIndex: number;
  className?: string;
}

export default function RouteDetailMap({ stops, currentStopIndex, className }: RouteDetailMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.075380, -70.128822]); // Default: ubicación del almacén
  
  useEffect(() => {
    // Al cargar o cuando cambia el índice de parada actual, centrar el mapa en esa parada
    if (stops && stops.length > 0 && currentStopIndex >= 0 && currentStopIndex < stops.length) {
      const currentStop = stops[currentStopIndex];
      if (currentStop && typeof currentStop.latitude === 'number' && typeof currentStop.longitude === 'number') {
        setMapCenter([currentStop.latitude, currentStop.longitude]);
      }
    }
  }, [stops, currentStopIndex]);
  
  if (!stops || stops.length === 0) {
    return (
      <div className={`rounded-md border p-4 ${className}`}>
        <div className="p-4 text-center text-muted-foreground">
          No hay paradas configuradas para esta ruta
        </div>
      </div>
    );
  }
  
  // Extraer coordenadas válidas para crear líneas y marcadores
  const validStops = stops.filter(stop => 
    typeof stop.latitude === 'number' && 
    typeof stop.longitude === 'number' && 
    !isNaN(stop.latitude) && 
    !isNaN(stop.longitude)
  );
  
  if (validStops.length === 0) {
    return (
      <div className={`rounded-md border p-4 ${className}`}>
        <div className="p-4 text-center text-muted-foreground">
          No se pudieron cargar las coordenadas de la ruta
        </div>
      </div>
    );
  }
  
  // Crear array de posiciones para la línea
  const polylinePositions = validStops.map(stop => [stop.latitude, stop.longitude]) as [number, number][];
  
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
          
          {/* Línea que conecta las paradas */}
          <Polyline 
            positions={polylinePositions} 
            color="blue" 
            weight={3}
          />
          
          {/* Marcadores para cada parada */}
          {validStops.map((stop, index) => {
            // Crear ícono personalizado con el número de parada
            const iconNumber = stop.isWarehouse ? '0' : stop.order.toString();
            
            // Color del marcador: verde para almacén, rojo para parada actual, azul para el resto
            const isCurrentStop = index === currentStopIndex;
            const bgColor = stop.isWarehouse ? 'bg-green-600' : (isCurrentStop ? 'bg-red-600' : 'bg-blue-600');
            
            const customIcon = new L.DivIcon({
              html: `<div class="flex items-center justify-center ${bgColor} text-white rounded-full w-6 h-6 text-sm font-semibold">${iconNumber}</div>`,
              className: 'custom-number-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            
            // Información a mostrar en el popup
            let stopTitle = stop.isWarehouse ? "Almacén principal" : `Parada #${stop.order}`;
            let stopType = stop.isWarehouse ? "Punto de partida" : "Entrega";
            
            return (
              <Marker
                key={stop.id}
                position={[stop.latitude, stop.longitude]}
                icon={customIcon}
              >
                <Popup>
                  <div>
                    <strong>{stopTitle}</strong>
                    <div><strong>Cliente:</strong> {stop.customerName}</div>
                    <div><strong>Dirección:</strong> {stop.address}</div>
                    <div><strong>Tipo:</strong> {stopType}</div>
                    {!stop.isWarehouse && (
                      <div><strong>Valor:</strong> ${typeof stop.totalValue === 'number' ? stop.totalValue.toFixed(2) : stop.totalValue}</div>
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