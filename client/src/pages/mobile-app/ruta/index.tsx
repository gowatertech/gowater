import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Navigation, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";

// Importamos el componente de mapa responsivo
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Tipo para una parada en la ruta
interface RouteStop {
  id: number;
  customerId: number;
  customerName: string;
  address: string;
  latitude: number;
  longitude: number;
  status: "pending" | "completed" | "cancelled";
  estimatedTime: string;
  products: { id: number; name: string; quantity: number }[];
}

export default function DriverRoute() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([19.075380, -70.128822]); // Ubicación por defecto
  const [watchId, setWatchId] = useState<number | null>(null);
  
  // Alternar modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkMode ? 'light' : 'dark');
  };

  // Sincronizar datos
  const syncData = () => {
    toast({
      title: "Sincronizando datos de ruta",
      description: "Actualizando información..."
    });
    
    // Aquí se haría la llamada a la API para sincronizar datos
    setTimeout(() => {
      loadRouteData();
      toast({
        title: "Ruta actualizada",
        description: "Los datos de tu ruta han sido actualizados",
        variant: "default"
      });
    }, 1000);
  };

  // Cargar datos de la ruta
  const loadRouteData = () => {
    setIsLoading(true);
    
    // Simular carga de datos de la API
    setTimeout(() => {
      // Datos de ejemplo
      const mockRouteStops: RouteStop[] = [
        {
          id: 1,
          customerId: 101,
          customerName: "Supermercado Oriental",
          address: "Calle Principal #45, Las Terrenas",
          latitude: 19.079380,
          longitude: -70.134822,
          status: "pending",
          estimatedTime: "10:30 AM",
          products: [
            { id: 1, name: "Botellón de Agua 5 Gal", quantity: 10 },
            { id: 2, name: "Caja Agua 16oz", quantity: 5 }
          ]
        },
        {
          id: 2,
          customerId: 102,
          customerName: "Hotel Las Palmas",
          address: "Avenida Duarte #22, Samaná",
          latitude: 19.084650,
          longitude: -70.142750,
          status: "pending",
          estimatedTime: "11:15 AM",
          products: [
            { id: 1, name: "Botellón de Agua 5 Gal", quantity: 20 },
            { id: 3, name: "Agua Saborizada 16oz", quantity: 24 }
          ]
        },
        {
          id: 3,
          customerId: 103,
          customerName: "Restaurante El Malecón",
          address: "Calle El Malecón #15, Las Galeras",
          latitude: 19.091220,
          longitude: -70.149600,
          status: "pending",
          estimatedTime: "12:00 PM",
          products: [
            { id: 1, name: "Botellón de Agua 5 Gal", quantity: 8 },
            { id: 4, name: "Dispensador de Agua", quantity: 1 }
          ]
        }
      ];
      
      setRouteStops(mockRouteStops);
      setIsLoading(false);
    }, 1500);
  };

  // Iniciar seguimiento de ubicación
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error de ubicación",
        description: "Tu dispositivo no soporta geolocalización",
        variant: "destructive"
      });
      return;
    }

    try {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          
          // Aquí se podría enviar la ubicación al servidor
          console.log("Nueva ubicación:", latitude, longitude);
        },
        (error) => {
          console.error("Error de geolocalización:", error);
          toast({
            title: "Error de ubicación",
            description: "No se pudo obtener tu ubicación actual",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000
        }
      );
      
      setWatchId(id);
    } catch (error) {
      console.error("Error al iniciar el seguimiento:", error);
    }
  };

  // Cargar datos de ruta al montar el componente
  useEffect(() => {
    loadRouteData();
    startLocationTracking();
    
    // Limpiar el watchPosition al desmontar
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Si está cargando, mostrar spinner
  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
        <MobileHeader 
          user={user} 
          darkMode={darkMode} 
          onToggleDarkMode={toggleDarkMode} 
          onSyncData={syncData}
        />
        <div className="h-[calc(100vh-132px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="font-medium text-primary">Cargando ruta...</h3>
          </div>
        </div>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
      <MobileHeader 
        user={user} 
        darkMode={darkMode} 
        onToggleDarkMode={toggleDarkMode} 
        onSyncData={syncData}
      />
      
      <main className="container max-w-md mx-auto px-0 pb-6">
        {/* Mapa de la ruta */}
        <div className="h-[40vh] relative mb-4">
          <ResponsiveMapContainer className="w-full h-full z-0">
            <MapContainer 
              center={currentLocation} 
              zoom={14} 
              className="h-full w-full z-0"
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Marcador para la ubicación actual */}
              <Marker position={currentLocation}>
                <Popup>Tu ubicación actual</Popup>
              </Marker>
              
              {/* Marcadores para cada parada en la ruta */}
              {routeStops.map((stop, index) => (
                <Marker 
                  key={stop.id} 
                  position={[stop.latitude, stop.longitude]}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{stop.customerName}</p>
                      <p className="text-xs">{stop.address}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Línea para la ruta */}
              {routeStops.length > 0 && (
                <Polyline 
                  positions={[
                    currentLocation,
                    ...routeStops.map(stop => [stop.latitude, stop.longitude] as [number, number])
                  ]}
                  color="#2563eb"
                  weight={4}
                  opacity={0.7}
                />
              )}
            </MapContainer>
          </ResponsiveMapContainer>
          
          {/* Botón para centrar mapa en ubicación actual */}
          <Button 
            variant="default" 
            size="icon" 
            className="absolute bottom-4 right-4 z-10 h-10 w-10 shadow-md"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setCurrentLocation([position.coords.latitude, position.coords.longitude]);
                  },
                  (error) => {
                    console.error("Error al obtener ubicación:", error);
                    toast({
                      title: "Error de ubicación",
                      description: "No se pudo acceder a tu ubicación",
                      variant: "destructive"
                    });
                  }
                );
              }
            }}
          >
            <Navigation className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Lista de paradas */}
        <div className="px-4">
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <h2 className="text-lg font-bold mb-2">Mi Ruta de Hoy</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {new Date().toLocaleDateString('es-DO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              
              <div className="space-y-3">
                {routeStops.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay paradas asignadas para hoy</p>
                  </div>
                ) : (
                  routeStops.map((stop, index) => (
                    <div 
                      key={stop.id}
                      className={`border rounded-lg p-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                      onClick={() => setLocation(`/mobile-app/entregas/${stop.id}`)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            stop.status === 'completed' 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            <span className="text-xs font-medium">{index + 1}</span>
                          </div>
                          <span className="font-medium">{stop.customerName}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          stop.status === 'completed' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {stop.estimatedTime}
                        </span>
                      </div>
                      
                      <div className="ml-8 text-sm">
                        <p className="text-muted-foreground text-xs mb-1">{stop.address}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {stop.products.map(product => (
                            <span 
                              key={product.id}
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                darkMode 
                                  ? 'bg-gray-700' 
                                  : 'bg-gray-100'
                              }`}
                            >
                              {product.quantity} × {product.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <MobileFooter darkMode={darkMode} />
    </div>
  );
}