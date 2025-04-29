import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw, Target } from "lucide-react";
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
import { useCompanySettings } from "@/hooks/use-company-settings";

// Componente para ajustar automáticamente el zoom del mapa para mostrar todos los puntos
const AutoZoom = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (points && points.length > 1) {
      // Crear los límites del mapa basados en los puntos
      const bounds = L.latLngBounds(points);
      // Ajustar el mapa para mostrar todos los puntos con un padding
      map.fitBounds(bounds, {
        padding: [50, 50], // Padding alrededor de los límites
        maxZoom: 12, // Zoom máximo para evitar acercamiento excesivo
        animate: true
      });
    }
  }, [map, points]);
  
  return null;
};

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

interface Settings {
  id: number;
  name: string;
  logo: string;
  rnc: string;
  street: string;
  streetNumber: string;
  provinceId: number;
  municipalityId: number;
  contactPhone: string;
  email: string;
  country: string;
  currency: string;
  tax: string;
  latitude: string;
  longitude: string;
}

// Componente para centrar el mapa en la ubicación actual
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
  const { companyName, settings } = useCompanySettings(); // Usamos el hook para obtener datos de la empresa
  
  // Centro del mapa basado en los ajustes de la compañía o valores predeterminados
  const [mapCenter] = useState<[number, number]>(() => {
    if (settings?.latitude && settings?.longitude) {
      const lat = parseFloat(settings.latitude);
      const lng = parseFloat(settings.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return [19.0, -70.0]; // Valor predeterminado (centro de Rep. Dominicana)
  });
  
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);

  // Consulta para obtener rutas activas
  const { data: activeRoutes, isLoading: loadingRoutes, error: routeError } = useQuery<Route[]>({
    queryKey: ['/api/routes/active'],
    enabled: !!user
  });
  
  // Consulta para obtener datos de conductores (desactivada)
  const { data: driversData } = useQuery<Driver[]>({
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
  }, [toast]);

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

  // Crear una colección de todos los puntos para el ajuste automático del zoom
  const allMapPoints = useMemo(() => {
    const points: [number, number][] = [
      // Siempre incluir el almacén principal (desde configuración o valor predeterminado)
      mapCenter
    ];
    
    // Añadir todos los puntos de todas las rutas activas
    if (activeRoutes && activeRoutes.length > 0) {
      activeRoutes.forEach(route => {
        if (route.stops && Array.isArray(route.stops)) {
          route.stops.forEach(stopCoord => {
            const point = parseCoordinate(stopCoord);
            if (point) points.push(point);
          });
        }
      });
    }
    
    return points;
  }, [activeRoutes, mapCenter]);

  // Si está cargando
  if (loadingRoutes) {
    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : ''}`}>
        <MobileHeader 
          title="Mapa en vivo" 
          showBackButton={true} 
          onBackButtonClick={() => setLocation("/mobile-app")}
          darkMode={darkMode}
          companyName={companyName}
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
  if (routeError) {
    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : ''}`}>
        <MobileHeader 
          title="Error" 
          showBackButton={true} 
          onBackButtonClick={() => setLocation("/mobile-app")}
          darkMode={darkMode}
          companyName={companyName}
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
        companyName={companyName}
      />
      <main className="flex-1 flex flex-col pb-16">
        <div className="flex-1 relative">
          {/* Se eliminó el nombre de la empresa de la parte superior izquierda */}
          
          <ResponsiveMapContainer fullHeight>
            <MapContainer 
              center={mapCenter} 
              zoom={12} 
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Componente para ajustar automáticamente el zoom */}
              <AutoZoom points={allMapPoints} />
              
              <LocationMarker />
              
              {/* Marcador permanente para el almacén principal */}
              <Marker 
                position={mapCenter}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div class="bg-purple-600 text-white w-10 h-10 flex items-center justify-center rounded-full shadow-lg border-2 border-white">
                          <div class="h-8 w-8 flex items-center justify-center font-bold">
                            0
                          </div>
                        </div>`,
                  iconSize: [40, 40],
                  iconAnchor: [20, 20],
                })}
              />
              
              {/* Renderizar rutas activas y sus paradas */}
              {activeRoutes && activeRoutes.length > 0 && activeRoutes.map((route, routeIndex) => {
                if (!route.stops || !Array.isArray(route.stops)) return null;
                
                // Crear un array de coordenadas para la ruta
                const routePoints: [number, number][] = [];
                route.stops.forEach((stopCoord) => {
                  const point = parseCoordinate(stopCoord);
                  if (point) routePoints.push(point);
                });
                
                // Asignar un color diferente a cada ruta para distinguirlas mejor
                const routeColors = [
                  '#0ea5e9', // azul
                  '#059669', // verde
                  '#d97706', // naranja
                  '#6366f1', // índigo
                  '#8b5cf6', // violeta
                  '#ec4899', // rosa
                  '#ef4444', // rojo
                ];
                const routeColor = routeColors[routeIndex % routeColors.length];
                
                return (
                  <React.Fragment key={route.id}>
                    {/* Dibujar la línea de la ruta */}
                    {routePoints.length > 1 && (
                      <Polyline 
                        positions={routePoints}
                        pathOptions={{ color: routeColor, weight: 4, opacity: 0.7 }} 
                      />
                    )}
                    
                    {/* Mostrar marcadores para cada parada */}
                    {routePoints.map((point, index) => {
                      // Definir índice mostrado en el mapa
                      const displayIndex = index === 0 ? 0 : index;
                      
                      // Convertir el color de la ruta en clase tailwind equivalente para los marcadores
                      const routeColorClasses: Record<string, string> = {
                        '#0ea5e9': 'bg-sky-500',
                        '#059669': 'bg-emerald-600',
                        '#d97706': 'bg-amber-600',
                        '#6366f1': 'bg-indigo-500',
                        '#8b5cf6': 'bg-violet-500',
                        '#ec4899': 'bg-pink-500',
                        '#ef4444': 'bg-red-500',
                      };
                      
                      // Asignar color según la posición en la ruta
                      const color = index === 0 ? 'bg-purple-600' : 
                                   index === routePoints.length - 1 ? 'bg-red-500' : 
                                   (routeColor in routeColorClasses ? routeColorClasses[routeColor as keyof typeof routeColorClasses] : 'bg-blue-500');
                      
                      return (
                        <Marker 
                          key={`${route.id}-stop-${index}`}
                          position={point}
                          icon={L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="${color} text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg">
                                    <div class="h-6 w-6 flex items-center justify-center">
                                      ${displayIndex}
                                    </div>
                                  </div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16],
                          })}
                        />
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