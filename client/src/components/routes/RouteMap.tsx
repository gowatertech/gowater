import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import type { Route } from "@shared/schema";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ResponsiveMapContainer } from '@/components/ui/responsive-map-container';

// Definir interfaces extendidas para el caso de coordenadas como objetos
interface LatLng {
  lat: number | string;
  lng: number | string;
}

// Extender la interfaz Route para incluir datos de clientes
interface RouteWithCustomerDetails extends Route {
  customerNames?: string[];
  customerDetails?: Array<{
    id: number;
    name: string;
    address: string;
  }>;
}

interface RouteMapProps {
  route: RouteWithCustomerDetails;
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
      } else if (stop && typeof stop === 'object') {
        // Manejar el caso donde stop es un objeto {lat, lng}
        const latLngObj = stop as LatLng;
        if ('lat' in latLngObj && 'lng' in latLngObj) {
          return [parseFloat(latLngObj.lat.toString()), parseFloat(latLngObj.lng.toString())];
        }
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
            // Mostrar '0' para el almacén y números de parada (1,2,3...) para las entregas
            const iconNumber = index === 0 ? '0' : index.toString();
            const customIcon = new L.DivIcon({
              html: `<div class="flex items-center justify-center ${index === 0 ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-full w-6 h-6 text-sm font-semibold">${iconNumber}</div>`,
              className: 'custom-number-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            
            // Obtener info del cliente desde el objeto de ruta
            let stopName = `Parada #${index + 1}`;
            let stopType = "Entrega";
            let clientName = "";
            let address = "";
            
            if (index === 0) {
              stopName = "Punto de inicio (Almacén)";
              stopType = "Salida";
              clientName = "Almacén Principal";
              address = "Punto de partida";
            } else if (route.customerNames && Array.isArray(route.customerNames) && route.customerNames[index-1]) {
              // Si hay nombres de clientes disponibles en la ruta, mostrarlos
              clientName = route.customerNames[index-1];
            } else if (route.customerDetails && Array.isArray(route.customerDetails) && route.customerDetails[index-1]) {
              // Alternativa si hay detalles de cliente
              clientName = route.customerDetails[index-1].name || "";
              address = route.customerDetails[index-1].address || "";
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
                    {clientName && <div><strong>Cliente:</strong> {clientName}</div>}
                    {address && <div><strong>Dirección:</strong> {address}</div>}
                    <div><strong>Tipo:</strong> {stopType}</div>
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
