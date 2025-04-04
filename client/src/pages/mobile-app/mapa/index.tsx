import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw, Compass, MapPin, Target, Navigation, Route as RouteIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from "@/components/ui/button";
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { useCurrentUser } from "@/hooks/use-current-user";

// Definición de interfaces
interface Driver {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  lastUpdateTime: string | null;
}

interface Route {
  id: number;
  name: string;
  driverId: number;
  status: string;
  date: string;
  deliverySequence: string[];
  stops: string[];
  totalDistance: string;
  estimatedDuration: number;
  orders?: Order[];
}

interface Order {
  id: number;
  routeId: number;
  customerId: number;
  status: string;
  total: string;
  customerName: string;
  customerAddress: string;
  coordinates: string;
}

interface MapLocation {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

// Componente para centar el mapa en la ubicación actual
const LocationMarker = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [locationFound, setLocationFound] = useState(false);
  const map = useMap();

  // Función para obtener ubicación actual
  const locateUser = () => {
    // Al hacer clic en el botón sí hacemos flyTo porque es acción explícita del usuario
    map.locate({ setView: true, maxZoom: 16 });
  };

  // Configurar los eventos del mapa para actualizar la posición
  useMapEvents({
    locationfound(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      setLocationFound(true);
      // Ya no hacemos flyTo automático para mantener el enfoque en el almacén
    },
    locationerror() {
      setLocationFound(false);
    },
  });

  // Intentar obtener la ubicación al montar el componente
  useEffect(() => {
    locateUser();
  }, []);

  // Botón para centrar en ubicación
  return (
    <div className="absolute bottom-5 right-3 z-[999]">
      <Button
        className="bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary/90"
        onClick={locateUser}
      >
        <Target className="h-5 w-5" />
      </Button>
      {position && (
        <Marker 
          position={position} 
          icon={L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="bg-primary text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg">
                    <div class="h-3 w-3 bg-white rounded-full animate-ping absolute"></div>
                    <div class="h-2 w-2 bg-white rounded-full"></div>
                  </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })}
        >
          <Popup>Estás aquí</Popup>
        </Marker>
      )}
    </div>
  );
};

// Componente principal del mapa
export default function MobileMap() {
  const [darkMode, setDarkMode] = useState<boolean>(
    localStorage.getItem("darkMode") === "true"
  );
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useCurrentUser();
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.075380, -70.128822]); // Centro inicial en el almacén principal AGUA HARRIS
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);

  // Consulta para obtener rutas activas
  const { data: activeRoutes, isLoading: loadingRoutes, error: routeError } = useQuery<Route[]>({
    queryKey: ['/api/routes/active'],
    enabled: !!user
  });
  
  // Consulta para obtener datos de conductores (la dejamos solo para mantener compatibilidad)
  const { data: driversData, isLoading: loadingDrivers, error: driversError } = useQuery<Driver[]>({
    queryKey: ['/api/drivers/locations'],
    enabled: false // Desactivada porque no usamos ubicaciones reales
  });

  // Efecto para manejar el modo oscuro
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  // Cargar la ubicación actual del usuario, pero no centrar el mapa en ella
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({
            latitude,
            longitude,
            timestamp: new Date(position.timestamp)
          });
          // Ya no centramos el mapa en la ubicación del usuario
          // para mantener el foco en el almacén principal
        },
        (error) => {
          console.error("Error obteniendo ubicación:", error);
          toast({
            title: "Error de ubicación",
            description: "No se pudo obtener tu ubicación actual.",
            variant: "destructive"
          });
        }
      );
    }
  }, []);

  // Función para convertir coordenadas string a array [lat, lng]
  const parseCoordinate = (coordStr: string): [number, number] | null => {
    if (!coordStr) return null;
    
    try {
      const [lat, lng] = coordStr.split(',').map(Number);
      if (isNaN(lat) || isNaN(lng)) return null;
      return [lat, lng];
    } catch (e) {
      console.error("Error al parsear coordenadas:", coordStr, e);
      return null;
    }
  };

  // Si está cargando
  const isLoading = loadingRoutes;
  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : ''}`}>
        <MobileHeader 
          title="Mapa en vivo" 
          showBackButton={true} 
          onBackButtonClick={() => setLocation("/mobile-app")}
          darkMode={darkMode}
        />
        <main className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center">
            <RotateCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p>Cargando mapa...</p>
          </div>
        </main>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }

  // Si hay error
  const error = routeError;
  if (error) {
    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : ''}`}>
        <MobileHeader 
          title="Error" 
          showBackButton={true} 
          onBackButtonClick={() => setLocation("/mobile-app")}
          darkMode={darkMode}
        />
        <main className="flex-1 p-4">
          <div className="text-center py-10">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-bold mb-2">No se pudo cargar el mapa</h2>
            <p className="text-muted-foreground mb-6">
              Hubo un problema al cargar la información del mapa.
              Por favor intenta nuevamente.
            </p>
            <Button 
              variant="default" 
              onClick={() => setLocation("/mobile-app")}
            >
              Volver al inicio
            </Button>
          </div>
        </main>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }

  // Renderizar el mapa
  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : ''}`}>
      <MobileHeader 
        title="Mapa en vivo" 
        showBackButton={true} 
        onBackButtonClick={() => setLocation("/mobile-app")}
        darkMode={darkMode}
      />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          <ResponsiveMapContainer fullHeight>
            <MapContainer 
              center={mapCenter} 
              zoom={13} 
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <LocationMarker />
              
              {/* Renderizar rutas activas y sus paradas */}
              {activeRoutes && activeRoutes.length > 0 && activeRoutes.map((route) => {
                if (!route.stops || !Array.isArray(route.stops)) return null;
                
                // Crear un array de coordenadas para la ruta
                const routePoints: [number, number][] = [];
                route.stops.forEach((stopCoord) => {
                  const point = parseCoordinate(stopCoord);
                  if (point) routePoints.push(point);
                });
                
                return (
                  <React.Fragment key={route.id}>
                    {/* Dibujar la línea de la ruta */}
                    {routePoints.length > 1 && (
                      <Polyline 
                        positions={routePoints}
                        pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.7 }} 
                      />
                    )}
                    
                    {/* Mostrar marcadores para cada parada */}
                    {routePoints.map((point, index) => {
                      // Último punto (final) en rojo, primer punto (inicio) en verde, resto en azul
                      const color = index === 0 ? 'bg-green-500' : 
                                   index === routePoints.length - 1 ? 'bg-red-500' : 'bg-blue-500';
                      const label = index === 0 ? 'Inicio' : 
                                   index === routePoints.length - 1 ? 'Final' : `Parada ${index}`;
                      
                      return (
                        <Marker 
                          key={`${route.id}-stop-${index}`}
                          position={point}
                          icon={L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="${color} text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg">
                                    <div class="h-6 w-6 flex items-center justify-center">
                                      ${index + 1}
                                    </div>
                                  </div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16],
                          })}
                        >
                          <Popup>
                            <div>
                              <p className="font-bold">{label}</p>
                              <p className="text-xs text-gray-500">
                                Ruta: {route.name}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </ResponsiveMapContainer>
        </div>
      </main>
      <MobileFooter darkMode={darkMode} />
    </div>
  );
}