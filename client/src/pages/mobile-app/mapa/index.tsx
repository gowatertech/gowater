import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw, Target, MapPin, User, Navigation, ChevronRight } from "lucide-react";
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

interface OrderProduct {
  id: number;
  productId: number;
  quantity: number;
  price: string;
  name: string;
  isReturnable: boolean;
}

interface Order {
  id: number;
  routeId: number;
  customerId: number;
  status: string;
  total: string;
  customerName: string;
  street: string;
  streetnumber: string;
  deliverySequence: number | null;
  coordinates: string;
  products: OrderProduct[];
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
  
  // Estado para controlar vista de lista vs mapa
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  
  // Obtener coordenadas del almacén desde settings (reactivo)
  const warehousePosition: [number, number] | null = 
    settings?.latitude && settings?.longitude
      ? [parseFloat(settings.latitude), parseFloat(settings.longitude)]
      : null;
  
  // Centro del mapa basado en el almacén o valor predeterminado
  const mapCenter: [number, number] = warehousePosition || [19.0, -70.0];
  
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);

  // Consulta para obtener rutas activas
  const { data: activeRoutes, isLoading: loadingRoutes, error: routeError } = useQuery<Route[]>({
    queryKey: ['/api/routes/active'],
    enabled: !!user
  });

  // Consulta para obtener las órdenes de todas las rutas activas
  const routeIds = activeRoutes?.map(r => r.id) || [];
  const { data: allRouteOrders = {} } = useQuery<Record<number, Order[]>>({
    queryKey: ['/api/routes/orders/batch', routeIds],
    queryFn: async () => {
      if (!routeIds.length) return {};
      
      // Obtener órdenes para cada ruta
      const ordersPromises = routeIds.map(async (routeId) => {
        try {
          const response = await fetch(`/api/routes/${routeId}/orders`);
          if (!response.ok) return { routeId, orders: [] };
          const orders = await response.json();
          return { routeId, orders };
        } catch (e) {
          console.error(`Error obteniendo órdenes para ruta ${routeId}:`, e);
          return { routeId, orders: [] };
        }
      });
      
      const results = await Promise.all(ordersPromises);
      const ordersMap: Record<number, Order[]> = {};
      results.forEach(({ routeId, orders }) => {
        ordersMap[routeId] = orders;
      });
      
      return ordersMap;
    },
    enabled: routeIds.length > 0,
  });
  
  // Consulta para obtener datos de conductores
  const { data: driversData } = useQuery<Driver[]>({
    queryKey: ['/api/users/drivers'],
    enabled: !!user
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
    
    // Filtrar coordenadas corruptas como "[object Object]"
    if (coordStr === "[object Object]" || coordStr.includes("object")) {
      console.warn("[Mapa] Coordenada corrupta detectada y filtrada:", coordStr);
      return null;
    }
    
    try {
      const [lat, lng] = coordStr.split(',').map(Number);
      if (isNaN(lat) || isNaN(lng)) {
        console.warn("[Mapa] Coordenada inválida:", coordStr);
        return null;
      }
      return [lat, lng];
    } catch (e) {
      console.error("[Mapa] Error al parsear coordenadas:", coordStr, e);
      return null;
    }
  };

  // Filtrar rutas del conductor actual
  const driverRoutes = useMemo(() => {
    if (!activeRoutes || !user) return [];
    // Si el usuario es conductor, solo mostrar sus rutas
    if (user.role === 'driver') {
      return activeRoutes.filter(r => r.driverId === user.id);
    }
    // Si es admin u otro rol, mostrar todas
    return activeRoutes;
  }, [activeRoutes, user]);

  // Filtrar rutas según selección
  const displayedRoutes = useMemo(() => {
    if (!driverRoutes) return [];
    if (selectedRouteId) {
      return driverRoutes.filter(r => r.id === selectedRouteId);
    }
    return driverRoutes;
  }, [driverRoutes, selectedRouteId]);

  // Crear una colección de todos los puntos para el ajuste automático del zoom
  const allMapPoints = useMemo(() => {
    const points: [number, number][] = [
      // Siempre incluir el almacén principal (desde configuración o valor predeterminado)
      mapCenter
    ];
    
    // Añadir todos los puntos de las rutas mostradas usando las coordenadas de las órdenes
    if (displayedRoutes && displayedRoutes.length > 0) {
      let validStopsCount = 0;
      displayedRoutes.forEach(route => {
        const routeOrders = allRouteOrders[route.id] || [];
        routeOrders.forEach(order => {
          if (order.coordinates) {
            const point = parseCoordinate(order.coordinates);
            if (point) {
              points.push(point);
              validStopsCount++;
            }
          }
        });
      });
      console.log(`[Mapa] Rutas mostradas: ${displayedRoutes.length}, Paradas válidas (desde órdenes): ${validStopsCount}`);
    }
    
    return points;
  }, [displayedRoutes, allRouteOrders, mapCenter]);

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

  // Función para seleccionar una ruta y abrir el mapa
  const handleRouteSelect = (routeId: number) => {
    setSelectedRouteId(routeId);
    setViewMode('map');
  };

  // Función para volver a la lista
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedRouteId(null);
  };

  // Renderizar vista de lista de rutas
  if (viewMode === 'list') {
    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : ''}`}>
        <MobileHeader 
          title="Rutas Activas" 
          showBackButton={true} 
          onBackButtonClick={() => setLocation("/mobile-app")}
          darkMode={darkMode}
          companyName={companyName}
        />
        <main className="flex-1 p-4 pb-20">
          {(!driverRoutes || driverRoutes.length === 0) ? (
            <div className="text-center py-10">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No tienes rutas asignadas</h2>
              <p className="text-muted-foreground mb-6">
                No tienes rutas pendientes o en progreso en este momento.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setLocation("/mobile-app")}
              >
                Volver al inicio
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {driverRoutes.map((route) => {
                const routeOrders = allRouteOrders[route.id] || [];
                const stopCount = routeOrders.filter(o => o.deliverySequence !== null).length;
                
                // Obtener información del conductor si está disponible
                const driver = driversData?.find(d => d.id === route.driverId);
                
                // Determinar color del estado
                const statusColors: Record<string, string> = {
                  pending: 'bg-green-500',
                  in_progress: 'bg-blue-500',
                  paused: 'bg-orange-500',
                  completed: 'bg-green-500'
                };
                const statusLabels: Record<string, string> = {
                  pending: 'Pendiente',
                  in_progress: 'En Progreso',
                  paused: 'Pausada',
                  completed: 'Completada'
                };
                
                return (
                  <div
                    key={route.id}
                    className="bg-card rounded-lg border overflow-hidden shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                    onClick={() => handleRouteSelect(route.id)}
                  >
                    <div className="flex">
                      {/* Información principal */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{route.name}</h3>
                            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                              <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex flex-col">
                                <span className="leading-tight">
                                  {route.driverId ? `Conductor #${route.driverId}` : 'Sin asignar'}
                                </span>
                                {driver && (
                                  <span className="text-xs font-medium text-foreground mt-0.5">
                                    {driver.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className={`${statusColors[route.status] || 'bg-gray-500'} text-white text-xs px-2 py-1 rounded-full shrink-0`}>
                            {statusLabels[route.status] || route.status}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{stopCount} paradas</span>
                          </div>
                          {route.totalDistance && (
                            <div className="flex items-center gap-1">
                              <Navigation className="h-4 w-4" />
                              <span>{route.totalDistance} km</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(route.date).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-primary font-medium flex items-center gap-1">
                            Ver detalles <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                      
                      {/* Mini visualización de ruta */}
                      <div className="w-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative flex items-center justify-center border-l">
                        <div className="flex flex-col items-center gap-2 py-4">
                          {/* Punto de inicio (almacén) */}
                          <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-200 shadow-sm" />
                          
                          {/* Línea de ruta */}
                          <div className="w-0.5 h-8 bg-gradient-to-b from-green-500 via-primary to-red-500" />
                          
                          {/* Indicador de paradas intermedias */}
                          {stopCount > 0 && (
                            <div className="flex flex-col items-center gap-1">
                              {[...Array(Math.min(stopCount, 3))].map((_, i) => (
                                <div key={i} className="w-2 h-2 rounded-full bg-primary" />
                              ))}
                              {stopCount > 3 && (
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  +{stopCount - 3}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Línea de ruta continuación */}
                          <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-red-500" />
                          
                          {/* Punto final */}
                          <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200 shadow-sm" />
                        </div>
                        
                        {/* Ícono de mapa en el fondo */}
                        <MapPin className="absolute bottom-2 right-2 h-8 w-8 text-primary/20" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }

  // Renderizar el mapa (viewMode === 'map')
  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : ''}`}>
      <MobileHeader 
        title={selectedRouteId ? displayedRoutes[0]?.name || "Mapa" : "Mapa en vivo"} 
        showBackButton={true} 
        onBackButtonClick={handleBackToList}
        darkMode={darkMode}
        companyName={companyName}
      />
      <main className="flex-1 flex flex-col pb-16">
        <div className="flex-1 relative">
          {/* Mensaje informativo si no hay rutas activas */}
          {(!displayedRoutes || displayedRoutes.length === 0) && (
            <div className="absolute top-4 left-4 right-4 z-[999] bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                📍 No hay información de ruta disponible
              </p>
            </div>
          )}
          
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
              {warehousePosition && (
                <Marker 
                  position={warehousePosition}
                  icon={L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="bg-green-600 text-white w-10 h-10 flex items-center justify-center rounded-full shadow-lg border-2 border-white">
                            <div class="h-8 w-8 flex items-center justify-center font-bold">
                              🏢
                            </div>
                          </div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                  })}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <h3 className="font-bold text-sm mb-1">Almacén</h3>
                      <p className="text-xs">{settings?.name || companyName || 'Punto de partida'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {warehousePosition[0].toFixed(6)}, {warehousePosition[1].toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Renderizar rutas mostradas y sus paradas */}
              {displayedRoutes && displayedRoutes.length > 0 && displayedRoutes.map((route, routeIndex) => {
                // Obtener las órdenes de esta ruta
                const routeOrders = allRouteOrders[route.id] || [];
                
                // Si no hay órdenes, no renderizar nada
                if (routeOrders.length === 0) return null;
                
                // Agrupar órdenes por secuencia de entrega
                const ordersBySequence = new Map<number, Order[]>();
                routeOrders.forEach(order => {
                  if (order.deliverySequence !== null && order.deliverySequence !== undefined) {
                    const seq = order.deliverySequence;
                    if (!ordersBySequence.has(seq)) {
                      ordersBySequence.set(seq, []);
                    }
                    ordersBySequence.get(seq)?.push(order);
                  }
                });
                
                // Crear un array de coordenadas para la ruta usando las coordenadas de las órdenes
                // (igual que el mapa web)
                const routePoints: [number, number][] = [];
                const sortedSequences = Array.from(ordersBySequence.keys()).sort((a, b) => a - b);
                sortedSequences.forEach((seq) => {
                  const orders = ordersBySequence.get(seq) || [];
                  const firstOrder = orders[0];
                  if (firstOrder && firstOrder.coordinates) {
                    const point = parseCoordinate(firstOrder.coordinates);
                    if (point) routePoints.push(point);
                  }
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
                      // route.stops[0] corresponde a deliverySequence=1
                      const deliverySequence = index + 1;
                      const stopOrders = ordersBySequence.get(deliverySequence) || [];
                      const firstOrder = stopOrders[0];
                      
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
                            html: `<div class="${color} text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg border-2 border-white">
                                    <div class="h-6 w-6 flex items-center justify-center font-bold">
                                      ${deliverySequence}
                                    </div>
                                  </div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16],
                          })}
                        >
                          {firstOrder && (
                            <Popup>
                              <div className="min-w-[200px]">
                                <h3 className="font-bold text-sm mb-1">{route.name}</h3>
                                <p className="text-xs text-gray-600 mb-2">Parada #{deliverySequence}</p>
                                <div className="border-t pt-2">
                                  <p className="font-semibold text-sm">{firstOrder.customerName}</p>
                                  <p className="text-xs text-gray-600">
                                    {firstOrder.street} {firstOrder.streetnumber}
                                  </p>
                                  {stopOrders.length > 1 && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      +{stopOrders.length - 1} pedido(s) más
                                    </p>
                                  )}
                                  <p className="text-xs font-semibold text-green-600 mt-2">
                                    Total: ${firstOrder.total}
                                  </p>
                                </div>
                              </div>
                            </Popup>
                          )}
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