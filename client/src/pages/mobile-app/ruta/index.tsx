import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  ArrowLeft, 
  Navigation, 
  MapPin, 
  AlertTriangle,
  Play,
  Square, // Reemplazamos Stop por Square
  Pause,
  Check,
  Clock,
  Compass,
  RotateCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { apiRequest } from "@/lib/api";

// Importamos el componente de mapa responsivo
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Tipo para una parada en la ruta
interface RouteStop {
  id: number;
  order: number; // Orden en la secuencia de la ruta (0 para almacén, 1, 2, 3, etc.)
  customerId: number;
  customerName: string;
  address: string;
  latitude: number;
  longitude: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  estimatedArrival: string; // Hora estimada de llegada
  estimatedDuration: number; // Duración estimada en minutos
  distanceFromPrevious: number; // Distancia desde el punto anterior en km
  products: { id: number; name: string; quantity: number; price: number }[];
  totalValue: number; // Valor total del pedido
  isWarehouse?: boolean; // Indica si es el almacén (punto 0)
}

export default function DriverRoute() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([19.075380, -70.128822]); // Ubicación por defecto
  const [watchId, setWatchId] = useState<number | null>(null);
  
  // Obtener el ID de la ruta desde la URL
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const routeIdFromUrl = urlParams.get('routeId');
  
  // Alternar modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkMode ? 'light' : 'dark');
  };

  // Sincronizar datos
  const syncData = async () => {
    toast({
      title: "Sincronizando datos de ruta",
      description: "Actualizando información..."
    });
    
    try {
      // Recargar datos de la ruta desde el servidor
      await loadRouteData();
      
      // Obtener ubicación actual si está disponible
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentLocation([latitude, longitude]);
            
            // Si la ruta está activa, actualizar progreso
            if (routeStatus === 'in_progress' && activeRouteId) {
              updateRouteProgress(latitude, longitude);
            }
          },
          (error) => {
            console.error("Error al obtener la ubicación durante sincronización:", error);
          }
        );
      }
      
      toast({
        title: "Ruta actualizada",
        description: "Los datos de tu ruta han sido actualizados",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al sincronizar datos:", error);
      toast({
        title: "Error de sincronización",
        description: "No se pudieron actualizar los datos. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  // Estado para la ruta activa
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
  const [routeStatus, setRouteStatus] = useState<'not_started' | 'in_progress' | 'paused' | 'completed'>('not_started');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(0);

  // Cargar datos de la ruta
  const loadRouteData = async () => {
    setIsLoading(true);
    
    try {
      // Usar el ID de la ruta de la URL
      const routeId = routeIdFromUrl ? parseInt(routeIdFromUrl) : null;
      
      if (!routeId) {
        console.error("No se encontró un ID de ruta en la URL");
        toast({
          title: "Error al cargar la ruta",
          description: "ID de ruta no proporcionado. Regresa al listado de rutas.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      console.log(`Cargando datos para la ruta ID: ${routeId}`);
      setActiveRouteId(routeId);
      
      // Obtener información básica sobre la ruta
      const routeResponse = await fetch(`/api/routes/${routeId}`);
      if (!routeResponse.ok) {
        throw new Error(`Error al obtener la ruta: ${routeResponse.statusText}`);
      }
      
      const routeData = await routeResponse.json();
      console.log("Datos de la ruta:", routeData);
      
      // Obtener los pedidos asociados a esta ruta
      const ordersResponse = await fetch(`/api/routes/${routeId}/orders`);
      if (!ordersResponse.ok) {
        throw new Error(`Error al obtener los pedidos: ${ordersResponse.statusText}`);
      }
      
      const ordersData = await ordersResponse.json();
      console.log("Pedidos de la ruta:", ordersData);
      
      // Coordenadas del almacén (punto de inicio)
      const warehouseLocation: [number, number] = [19.075380, -70.128822];
      
      // Crear la estructura de paradas para la ruta
      const stops: RouteStop[] = [];
      
      // Agregar el almacén como punto de inicio (stop 0)
      stops.push({
        id: 0,
        order: 0,
        customerId: 0,
        customerName: "Almacén GoWater",
        address: "Av. Industrial #15, Samaná",
        latitude: warehouseLocation[0],
        longitude: warehouseLocation[1],
        status: "completed",
        estimatedArrival: "08:00 AM",
        estimatedDuration: 0,
        distanceFromPrevious: 0,
        products: [],
        totalValue: 0,
        isWarehouse: true
      });
      
      // Verificar si la ruta tiene secuencia de entrega y coordenadas definidas
      let stopSequence = [];
      let stopCoordinates = [];
      
      if (routeData.deliverySequence && routeData.deliverySequence.length > 0) {
        stopSequence = routeData.deliverySequence;
      }
      
      if (routeData.stops && routeData.stops.length > 0) {
        stopCoordinates = routeData.stops.map((stop: string) => {
          const [lat, lng] = stop.split(',').map(coord => parseFloat(coord));
          return { latitude: lat, longitude: lng };
        });
      }
      
      // Agregar las paradas de los clientes
      ordersData.forEach((order: any, index: number) => {
        // Calcular el valor total del pedido a partir de los productos
        const totalValue = order.products.reduce(
          (sum: number, product: any) => sum + (Number(product.price) * product.quantity), 
          0
        );
        
        // Extraer coordenadas del cliente directamente del orden si están disponibles
        let latitude = 0, longitude = 0;
        let stopOrder = index + 1; // Por defecto, orden secuencial
        
        // Intentar obtener coordenadas del pedido primero
        if (order.coordinates) {
          console.log(`Coordenadas del pedido ${order.id}:`, order.coordinates);
          const [lat, lng] = order.coordinates.split(',').map((coord: string) => parseFloat(coord));
          if (!isNaN(lat) && !isNaN(lng)) {
            latitude = lat;
            longitude = lng;
          }
        }
        
        // Intentar encontrar la posición correcta en la secuencia si no tenemos coordenadas directas
        if ((latitude === 0 || longitude === 0) && stopSequence.length > index + 1) {
          const sequenceIndex = parseInt(stopSequence[index + 1]);
          stopOrder = sequenceIndex;
          
          // Si tenemos coordenadas para esta parada
          if (stopCoordinates.length > sequenceIndex) {
            latitude = stopCoordinates[sequenceIndex].latitude;
            longitude = stopCoordinates[sequenceIndex].longitude;
          }
        }
        
        // Si aún no tenemos coordenadas válidas, usar valores ligeramente diferentes para visualización
        if (latitude === 0 || longitude === 0) {
          latitude = warehouseLocation[0] + (Math.random() * 0.02);
          longitude = warehouseLocation[1] + (Math.random() * 0.02);
          console.log(`Usando coordenadas aleatorias para pedido ${order.id}`);
        }
        
        // Calcular estimados aproximados (en una app real estos vendrían de un servicio)
        const estimatedDuration = 5 + Math.floor(Math.random() * 10); // 5-15 minutos
        const distanceFromPrevious = 0.5 + Math.random() * 3; // 0.5-3.5 km
        
        stops.push({
          id: order.id,
          order: stopOrder,
          customerId: order.customerId,
          customerName: order.customerName,
          address: order.customerAddress || "Dirección no disponible",
          latitude,
          longitude,
          status: "pending",
          estimatedArrival: "Próximamente",
          estimatedDuration,
          distanceFromPrevious,
          products: order.products.map((product: any) => ({
            id: product.productId,
            name: product.name,
            quantity: product.quantity,
            price: parseFloat(product.price)
          })),
          totalValue: Number(order.total) || totalValue
        });
      });
      
      // Ordenar las paradas según la secuencia si está disponible
      if (stopSequence.length > 0) {
        stops.sort((a, b) => a.order - b.order);
      }
      
      setRouteStops(stops);
      setRouteStatus(routeData.status === "in_progress" ? "in_progress" : "not_started");
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error al cargar datos de ruta:", error);
      toast({
        title: "Error al cargar la ruta",
        description: "No se pudieron obtener los datos de tu ruta asignada",
        variant: "destructive"
      });
      setIsLoading(false);
    }
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
          
          // Aquí se enviaría la ubicación al servidor
          console.log("Nueva ubicación:", latitude, longitude);
          
          // Si la ruta está activa, también actualizamos el progreso de la ruta
          if (routeStatus === 'in_progress' && activeRouteId) {
            updateRouteProgress(latitude, longitude);
          }
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
  
  // Actualizar el progreso de la ruta en el servidor
  const updateRouteProgress = async (latitude: number, longitude: number) => {
    if (!activeRouteId) return;
    
    try {
      // Enviar la ubicación actual al servidor
      const currentLocation = `${latitude},${longitude}`;
      console.log(`Actualizando progreso de ruta ${activeRouteId} en [${currentLocation}]`);
      
      const response = await fetch(`/api/routes/${activeRouteId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentLocation,
          lastUpdate: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.error(`Error al actualizar progreso: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error al actualizar progreso:", error);
    }
  };
  
  // Función para iniciar la ruta
  const startRoute = async () => {
    if (routeStatus !== 'not_started' && routeStatus !== 'paused') return;
    
    setIsLoading(true);
    
    try {
      // Llamar a la API para iniciar la ruta
      console.log(`Iniciando ruta ID: ${activeRouteId}`);
      const response = await fetch(`/api/routes/${activeRouteId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al iniciar ruta: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Respuesta al iniciar ruta:", data);
      
      setRouteStatus('in_progress');
      setStartTime(new Date());
      
      toast({
        title: "Ruta iniciada",
        description: "Has comenzado la ruta. ¡Conduce con precaución!",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al iniciar ruta:", error);
      toast({
        title: "Error al iniciar ruta",
        description: "No se pudo iniciar la ruta. Inténtalo de nuevo.",
        variant: "destructive"
      });
      
      // Para asegurar que la UI siga funcionando, incluso si hay un error
      setRouteStatus('in_progress');
      setStartTime(new Date());
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para pausar la ruta
  const pauseRoute = async () => {
    if (routeStatus !== 'in_progress') return;
    
    setIsLoading(true);
    
    try {
      // En un entorno real, pausaríamos la ruta en la API
      // const response = await apiRequest('POST', `/api/driver/routes/${activeRouteId}/pause`);
      // if (response.ok) {
      //   setRouteStatus('paused');
      // }
      
      // Para desarrollo, simulamos la pausa
      setRouteStatus('paused');
      
      toast({
        title: "Ruta pausada",
        description: "Has pausado la ruta. Puedes reanudarla cuando estés listo.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al pausar ruta:", error);
      toast({
        title: "Error al pausar ruta",
        description: "No se pudo pausar la ruta. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para finalizar la ruta
  const finishRoute = async () => {
    if (routeStatus === 'completed') return;
    
    setIsLoading(true);
    
    try {
      // Llamar a la API para finalizar la ruta
      console.log(`Finalizando ruta ID: ${activeRouteId}`);
      const response = await fetch(`/api/routes/${activeRouteId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Si existe alguna información adicional que queramos enviar al completar
        body: JSON.stringify({
          completedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error al finalizar ruta: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Respuesta al finalizar ruta:", data);
      
      setRouteStatus('completed');
      
      toast({
        title: "Ruta completada",
        description: "¡Felicidades! Has completado todas las entregas.",
        variant: "default"
      });
      
      // Redireccionar al listado de rutas después de 3 segundos
      setTimeout(() => {
        setLocation('/mobile-app/rutas-pendientes');
      }, 3000);
    } catch (error) {
      console.error("Error al finalizar ruta:", error);
      toast({
        title: "Error al finalizar ruta",
        description: "No se pudo finalizar la ruta. Inténtalo de nuevo.",
        variant: "destructive"
      });
      
      // Para asegurar que la UI refleje el cambio, incluso si hay un error
      setRouteStatus('completed');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para abrir la navegación a una ubicación
  const navigateToLocation = (latitude: number, longitude: number) => {
    // Usamos Google Maps para la navegación
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  };

  // Cargar datos de ruta al montar el componente o cuando cambie el ID de la URL
  useEffect(() => {
    loadRouteData();
    startLocationTracking();
    
    // Limpiar el watchPosition al desmontar
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [routeIdFromUrl]); // Dependencia en routeIdFromUrl para recargar si cambia

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
          {/* Panel de control de ruta */}
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Estado de Ruta</h2>
                <Badge 
                  variant={
                    routeStatus === 'completed' ? "success" :
                    routeStatus === 'in_progress' ? "default" :
                    routeStatus === 'paused' ? "outline" :
                    "secondary"
                  }
                >
                  {routeStatus === 'not_started' && "No iniciada"}
                  {routeStatus === 'in_progress' && "En progreso"}
                  {routeStatus === 'paused' && "Pausada"}
                  {routeStatus === 'completed' && "Completada"}
                </Badge>
              </div>
              
              {startTime && (
                <div className="bg-primary/10 rounded-lg p-3 mb-4">
                  <p className="text-sm flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Iniciada: {startTime.toLocaleTimeString('es-DO')}</span>
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                {routeStatus === 'not_started' || routeStatus === 'paused' ? (
                  <Button
                    className="flex items-center justify-center gap-1"
                    onClick={startRoute}
                    disabled={isLoading || routeStatus === 'completed' as any}
                  >
                    <Play className="h-4 w-4" />
                    {routeStatus === 'paused' ? 'Continuar' : 'Iniciar'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-1"
                    onClick={pauseRoute}
                    disabled={isLoading || routeStatus !== 'in_progress'}
                  >
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                )}
                
                <Button
                  variant="destructive"
                  className="flex items-center justify-center gap-1"
                  onClick={finishRoute}
                  disabled={isLoading || routeStatus === 'completed' || routeStatus === 'not_started'}
                >
                  <Square className="h-4 w-4" />
                  Finalizar
                </Button>
                
                <Button
                  variant="secondary"
                  className="flex items-center justify-center gap-1"
                  onClick={syncData}
                  disabled={isLoading}
                >
                  <RotateCw className="h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        
          {/* Lista de paradas */}
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
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            stop.isWarehouse
                              ? 'bg-yellow-100 text-yellow-600'
                              : stop.status === 'completed' 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-primary/10 text-primary'
                          }`}>
                            <span className="text-xs font-medium">{stop.order}</span>
                          </div>
                          <span className="font-medium">{stop.customerName}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          stop.status === 'completed' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {stop.estimatedArrival}
                        </span>
                      </div>
                      
                      <div className="ml-8 text-sm">
                        <p className="text-muted-foreground text-xs mb-1">{stop.address}</p>
                        {stop.products && stop.products.length > 0 ? (
                          <div className="mt-1 mb-2">
                            <h4 className="text-xs font-bold mb-1">Productos:</h4>
                            <div className="bg-primary/5 rounded-md p-2">
                              <ul className="space-y-1">
                                {stop.products.map(product => (
                                  <li 
                                    key={product.id}
                                    className="text-xs flex justify-between border-b last:border-0 pb-1 last:pb-0"
                                  >
                                    <span className="font-medium">{product.name}</span>
                                    <span className="font-bold">{product.quantity} × ${product.price.toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="border-t border-primary/20 mt-2 pt-2 space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-xs font-bold">Total productos:</span>
                                  <span className="text-xs font-medium">
                                    {stop.products.reduce((total, product) => total + product.quantity, 0)} unidades
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs font-bold">Valor del pedido:</span>
                                  <span className="text-xs font-bold text-primary">
                                    ${stop.totalValue.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-2">
                            {stop.isWarehouse && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                Punto de inicio
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between mt-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Duración estimada:</span>
                            <span className="text-xs font-medium">{stop.estimatedDuration} min</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!stop.isWarehouse && (
                              <Button
                                variant="outline" 
                                size="sm" 
                                className="text-xs h-8"
                                onClick={() => setLocation(`/mobile-app/entregas/${stop.id}`)}
                              >
                                Detalles
                              </Button>
                            )}
                            
                            <Button
                              variant="default" 
                              size="sm" 
                              className="text-xs h-8 flex items-center gap-1"
                              onClick={() => navigateToLocation(stop.latitude, stop.longitude)}
                            >
                              <Compass className="h-3 w-3" />
                              Navegar
                            </Button>
                          </div>
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