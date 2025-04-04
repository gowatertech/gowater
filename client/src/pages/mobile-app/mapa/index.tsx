import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw, Compass, MapPin, Target, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
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
    map.locate({ setView: true, maxZoom: 16 });
  };

  // Configurar los eventos del mapa para actualizar la posición
  useMapEvents({
    locationfound(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      setLocationFound(true);
      map.flyTo(e.latlng, 16);
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
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.735693, -70.162651]); // Centro inicial en República Dominicana
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);

  // Consulta para obtener datos de conductores
  const { data: driversData, isLoading, error } = useQuery<Driver[]>({
    queryKey: ['/api/drivers/locations'],
    enabled: !!user
  });

  // Efecto para manejar el modo oscuro
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  // Cargar la ubicación actual del usuario
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
          setMapCenter([latitude, longitude]);
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

  // Si está cargando
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
              
              {/* Renderizar marcadores de otros conductores si están disponibles */}
              {driversData && Array.isArray(driversData) && driversData.map((driver: Driver) => (
                driver.latitude && driver.longitude && (
                  <Marker 
                    key={driver.id}
                    position={[driver.latitude, driver.longitude]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div class="bg-blue-500 text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg">
                              <div class="h-6 w-6 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
                              </div>
                            </div>`,
                      iconSize: [32, 32],
                      iconAnchor: [16, 16],
                    })}
                  >
                    <Popup>
                      <div>
                        <p className="font-bold">{driver.name}</p>
                        <p className="text-xs text-gray-500">
                          Última actualización: {driver.lastUpdateTime ? 
                            new Date(driver.lastUpdateTime).toLocaleString() : 
                            'Desconocida'}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          </ResponsiveMapContainer>
        </div>
      </main>
      <MobileFooter darkMode={darkMode} />
    </div>
  );
}