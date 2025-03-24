import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import type { Route } from "@shared/schema";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ResponsiveMapContainer } from '@/components/ui/responsive-map-container';

interface RouteMapProps {
  route: Route;
  className?: string;
}

export default function RouteMap({ route, className }: RouteMapProps) {
  // Verificar si stops existe y es un array
  if (!route || !route.stops || !Array.isArray(route.stops) || route.stops.length === 0) {
    return (
      <div className={`rounded-md border p-4 ${className}`}>
        <div className="p-4 text-center text-muted-foreground">
          No hay paradas configuradas para esta ruta
        </div>
      </div>
    );
  }

  // Intentar parsear las coordenadas de las paradas
  const stopCoordinates = route.stops.map(stop => {
    try {
      if (typeof stop === 'string') {
        // Validar que la cadena tenga el formato correcto
        if (!stop.includes(',')) return null;
        
        const parts = stop.split(',');
        if (parts.length !== 2) return null;
        
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        
        // Validar que sean números válidos
        if (isNaN(lat) || isNaN(lng)) return null;
        
        return [lat, lng];
      } else if (stop && typeof stop === 'object' && 'lat' in stop && 'lng' in stop) {
        // Manejar el caso donde stop es un objeto {lat, lng}
        return [parseFloat(stop.lat), parseFloat(stop.lng)];
      }
      return null;
    } catch (error) {
      console.error('Error parsing stop coordinates:', error, stop);
      return null;
    }
  }).filter(coords => coords !== null) as [number, number][];

  if (stopCoordinates.length === 0) {
    return (
      <div className={`rounded-md border p-4 ${className}`}>
        <div className="p-4 text-center text-muted-foreground">
          No se pudieron parsear las coordenadas de la ruta
        </div>
      </div>
    );
  }

  // Calcular centro del mapa basado en el primer punto
  const mapCenter = stopCoordinates[0] || [18.4955, -69.8734]; // Default: Santo Domingo

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
          <Polyline 
            positions={stopCoordinates} 
            color="blue" 
            weight={3}
          />
          
          {/* Mostrar marcadores para cada parada */}
          {stopCoordinates.map((position, index) => {
            // Crear un icono personalizado con el número de parada
            const customIcon = new L.DivIcon({
              html: `<div class="flex items-center justify-center ${index === 0 ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-full w-6 h-6 text-sm font-semibold">${index}</div>`,
              className: 'custom-number-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            
            // Determinar el tipo de parada
            let stopName = `Parada #${index + 1}`;
            let stopType = "Entrega";
            
            if (index === 0) {
              stopName = "Punto de inicio (Almacén)";
              stopType = "Salida";
            }
            
            return (
              <Marker
                key={index}
                position={position}
                icon={customIcon}
              >
                <Popup>
                  <div>
                    <strong>{stopName}</strong>
                    <div>Tipo: {stopType}</div>
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
