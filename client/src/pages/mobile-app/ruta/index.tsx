// Importaciones necesarias
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown, ChevronUp, MapPin, Clock, Navigation, RefreshCw, CheckSquare, X, Moon, Sun, Truck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiRequest } from '@/lib/queryClient';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Configuración del icono predeterminado para los marcadores del mapa
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

L.Marker.prototype.options.icon = DefaultIcon;

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

// Coordenadas del almacén (punto de inicio) - Cotuí, Sánchez Ramírez
const warehouseLocation: [number, number] = [19.05878, -70.15141]; // República Dominicana

export default function DriverRoute() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>(warehouseLocation); // Ubicación predeterminada: almacén
  const [watchId, setWatchId] = useState<number | null>(null);
  const [expandedStopId, setExpandedStopId] = useState<number | null>(null);
  
  // Obtener el ID de la ruta desde la URL
  const urlParams = new URLSearchParams(window.location.search);
  const routeIdFromUrl = urlParams.get('routeId');
  
  console.log("URL location:", location);
  console.log("URL search params:", window.location.search);
  console.log("ID de Ruta desde URL:", routeIdFromUrl);
  
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
  // Inicializamos el estado con los valores almacenados en localStorage si existen
  const [activeRouteId, setActiveRouteId] = useState<number | null>(() => {
    const savedId = localStorage.getItem('activeRouteId');
    return savedId ? parseInt(savedId) : null;
  });
  
  const [routeStatus, setRouteStatus] = useState<'not_started' | 'in_progress' | 'paused' | 'completed'>(() => {
    const savedStatus = localStorage.getItem('routeStatus') as 'not_started' | 'in_progress' | 'paused' | 'completed';
    return savedStatus || 'not_started';
  });
  
  // Guardar estado en localStorage cuando cambie
  useEffect(() => {
    if (activeRouteId) {
      localStorage.setItem('activeRouteId', activeRouteId.toString());
    } else {
      localStorage.removeItem('activeRouteId');
    }
  }, [activeRouteId]);
  
  useEffect(() => {
    if (routeStatus) {
      localStorage.setItem('routeStatus', routeStatus);
    } else {
      localStorage.removeItem('routeStatus');
    }
  }, [routeStatus]);

  // Cargar datos de la ruta
  const loadRouteData = async () => {
    setIsLoading(true);
    try {
      // Utilizamos el ID de la URL o el ID almacenado en el estado
      const routeId = routeIdFromUrl || (activeRouteId ? activeRouteId.toString() : null);
      
      if (!routeId) {
        console.error("No hay ID de ruta disponible");
        toast({
          title: "Error",
          description: "No se encontró el ID de la ruta",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Cargando ruta con ID:", routeId);
      
      // Simular carga de datos de la API
      // En una implementación real, esto vendría de una API
      // const response = await apiRequest(`/api/routes/${routeId}`);
      // const routeData = await response.json();
      
      // Datos simulados para propósitos de demostración
      const mockRoute = {
        id: parseInt(routeId),
        status: "pending",
        driverId: 1,
        truckId: 1,
        startLocation: JSON.stringify(warehouseLocation),
        currentLocation: null,
        totalDistance: 25.5,
        estimatedDuration: 120,
        actualDuration: null,
        startTime: null,
        endTime: null,
        stops: [
          {
            id: 0,
            order: 0,
            customerId: 0,
            customerName: "Almacén GoWater",
            address: "Calle Principal #23, Cotuí, Sánchez Ramírez",
            latitude: warehouseLocation[0],
            longitude: warehouseLocation[1],
            status: "pending",
            estimatedArrival: "08:00 AM",
            estimatedDuration: 0,
            distanceFromPrevious: 0,
            products: [],
            totalValue: 0,
            isWarehouse: true
          },
          {
            id: 1,
            order: 1,
            customerId: 101,
            customerName: "COLMADO LA SOMBRITA",
            address: "CALLE ALTAGRACIA",
            latitude: 19.05178,
            longitude: -70.14541,
            status: "pending",
            estimatedArrival: "08:15 AM",
            estimatedDuration: 9,
            distanceFromPrevious: 0.8,
            products: [
              { id: 1, name: "FALDO BOTELLA 20 UND 16OZ", quantity: 2, price: 120.00 },
              { id: 2, name: "BOTELLON 5L", quantity: 4, price: 40.00 }
            ],
            totalValue: 389.40
          },
          {
            id: 2,
            order: 2,
            customerId: 102,
            customerName: "SUPERMERCADO DON PEDRO",
            address: "AV. CONSTITUCIÓN #45",
            latitude: 19.04678,
            longitude: -70.16041,
            status: "pending",
            estimatedArrival: "08:30 AM",
            estimatedDuration: 12,
            distanceFromPrevious: 1.5,
            products: [
              { id: 1, name: "FALDO BOTELLA 20 UND 16OZ", quantity: 5, price: 120.00 },
              { id: 3, name: "AGUA PURIFICADA 1 GALÓN", quantity: 10, price: 30.00 },
              { id: 4, name: "BOTELLITA 350ML CAJA 24 UND", quantity: 2, price: 72.00 }
            ],
            totalValue: 1092.00
          },
          {
            id: 3,
            order: 3,
            customerId: 103,
            customerName: "CAFETERÍA DOÑA ANA",
            address: "CALLE DUARTE #12",
            latitude: 19.06178,
            longitude: -70.14841,
            status: "pending",
            estimatedArrival: "08:45 AM",
            estimatedDuration: 8,
            distanceFromPrevious: 1.2,
            products: [
              { id: 4, name: "BOTELLITA 350ML CAJA 24 UND", quantity: 3, price: 72.00 },
              { id: 5, name: "DISPENSADOR DE AGUA", quantity: 1, price: 450.00 }
            ],
            totalValue: 666.00
          }
        ]
      };
      
      // Inicializar estado de ruta activa si no está ya establecido
      if (!activeRouteId) {
        setActiveRouteId(parseInt(routeId));
      }
      
      // Establecer paradas de la ruta en el estado
      setRouteStops(mockRoute.stops);
      
      // Si hay datos de progreso almacenados, restaurarlos
      const savedRouteProgress = localStorage.getItem(`routeProgress_${routeId}`);
      if (savedRouteProgress) {
        const progressData = JSON.parse(savedRouteProgress);
        
        // Actualizar el estado de las paradas con el progreso guardado
        setRouteStops(currentStops => 
          currentStops.map(stop => {
            const savedStop = progressData.stops.find((s: any) => s.id === stop.id);
            return savedStop ? { ...stop, status: savedStop.status } : stop;
          })
        );
      }
      
    } catch (error) {
      console.error("Error al cargar datos de la ruta:", error);
      toast({
        title: "Error de carga",
        description: "No se pudieron cargar los datos de la ruta",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar ruta
  const startRoute = async () => {
    try {
      // En una implementación real, enviar solicitud a la API
      // await apiRequest(`/api/routes/${activeRouteId}/start`, {
      //   method: 'POST',
      //   body: JSON.stringify({ startLocation: currentLocation })
      // });
      
      setRouteStatus('in_progress');
      
      // Actualizar estado de la primera parada a "in_progress"
      setRouteStops(currentStops => 
        currentStops.map(stop => 
          stop.order === 0 ? { ...stop, status: "in_progress" as const } : stop
        )
      );
      
      // Iniciar seguimiento de ubicación
      startLocationTracking();
      
      toast({
        title: "Ruta iniciada",
        description: "Has comenzado la ruta exitosamente",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al iniciar ruta:", error);
      toast({
        title: "Error",
        description: "No se pudo iniciar la ruta",
        variant: "destructive"
      });
    }
  };

  // Pausar ruta
  const pauseRoute = async () => {
    try {
      // En una implementación real, enviar solicitud a la API
      // await apiRequest(`/api/routes/${activeRouteId}/pause`, {
      //   method: 'POST',
      //   body: JSON.stringify({ currentLocation })
      // });
      
      setRouteStatus('paused');
      
      // Detener seguimiento de ubicación
      stopLocationTracking();
      
      toast({
        title: "Ruta pausada",
        description: "Has pausado la ruta temporalmente",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al pausar ruta:", error);
      toast({
        title: "Error",
        description: "No se pudo pausar la ruta",
        variant: "destructive"
      });
    }
  };

  // Reanudar ruta
  const resumeRoute = async () => {
    try {
      // En una implementación real, enviar solicitud a la API
      // await apiRequest(`/api/routes/${activeRouteId}/resume`, {
      //   method: 'POST',
      //   body: JSON.stringify({ currentLocation })
      // });
      
      setRouteStatus('in_progress');
      
      // Reiniciar seguimiento de ubicación
      startLocationTracking();
      
      toast({
        title: "Ruta reanudada",
        description: "Continuando con la ruta",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al reanudar ruta:", error);
      toast({
        title: "Error",
        description: "No se pudo reanudar la ruta",
        variant: "destructive"
      });
    }
  };

  // Finalizar ruta
  const completeRoute = async () => {
    try {
      // En una implementación real, enviar solicitud a la API
      // await apiRequest(`/api/routes/${activeRouteId}/complete`, {
      //   method: 'POST',
      //   body: JSON.stringify({ currentLocation })
      // });
      
      setRouteStatus('completed');
      
      // Detener seguimiento de ubicación
      stopLocationTracking();
      
      // Actualizar todas las paradas a "completed"
      setRouteStops(currentStops => 
        currentStops.map(stop => ({ ...stop, status: "completed" as const }))
      );
      
      // Limpiar datos de la ruta del almacenamiento local
      localStorage.removeItem(`routeProgress_${activeRouteId}`);
      localStorage.removeItem('activeRouteId');
      localStorage.removeItem('routeStatus');
      
      // Reiniciar estado
      setActiveRouteId(null);
      
      toast({
        title: "Ruta completada",
        description: "Has finalizado la ruta exitosamente",
        variant: "default"
      });
      
      // Redirigir a la página de rutas pendientes después de un breve retraso
      setTimeout(() => {
        setLocation('/mobile-app/rutas-pendientes');
      }, 2000);
    } catch (error) {
      console.error("Error al completar ruta:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la ruta",
        variant: "destructive"
      });
    }
  };

  // Actualizar progreso de la ruta
  const updateRouteProgress = async (latitude: number, longitude: number) => {
    try {
      // En una implementación real, enviar solicitud a la API
      // await apiRequest(`/api/routes/${activeRouteId}/progress`, {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     latitude,
      //     longitude,
      //     timestamp: new Date().toISOString()
      //   })
      // });
      
      console.log("Progreso de ruta actualizado:", { latitude, longitude });
      
      // Guardar progreso en localStorage
      if (activeRouteId) {
        const progressData = {
          lastUpdated: new Date().toISOString(),
          location: [latitude, longitude],
          routeStatus,
          stops: routeStops.map(stop => ({
            id: stop.id,
            status: stop.status
          }))
        };
        
        localStorage.setItem(`routeProgress_${activeRouteId}`, JSON.stringify(progressData));
      }
    } catch (error) {
      console.error("Error al actualizar progreso de ruta:", error);
    }
  };

  // Iniciar seguimiento de ubicación
  const startLocationTracking = () => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          updateRouteProgress(latitude, longitude);
        },
        (error) => {
          console.error("Error al rastrear ubicación:", error);
          toast({
            title: "Error de ubicación",
            description: "No se pudo obtener tu ubicación actual",
            variant: "destructive"
          });
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      
      setWatchId(id);
    } else {
      toast({
        title: "Geolocalización no soportada",
        description: "Tu dispositivo no soporta geolocalización",
        variant: "destructive"
      });
    }
  };

  // Detener seguimiento de ubicación
  const stopLocationTracking = () => {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  // Efecto para cargar datos de la ruta al montar el componente
  useEffect(() => {
    loadRouteData();
    
    // Verificar y establecer el tema oscuro/claro
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || 
        (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
    
    return () => {
      // Limpiar observador de ubicación al desmontar
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Inicializar mapa cuando routeStops se carga y el componente está montado
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (routeStops.length === 0 || !mapContainerRef.current) return;
    
    // Si el mapa ya existe, eliminarlo antes de crear uno nuevo
    if (mapRef.current) {
      mapRef.current.remove();
    }
    
    // Crear un nuevo mapa
    const map = L.map(mapContainerRef.current).setView(currentLocation, 15);
    mapRef.current = map;
    
    // Añadir capa de mapa base
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Añadir marcadores para cada parada
    routeStops.forEach(stop => {
      const markerColor = stop.isWarehouse ? 'blue' : (
        stop.status === 'completed' ? 'green' : 
        stop.status === 'in_progress' ? 'orange' : 'red'
      );
      
      // Crear icono personalizado basado en el estado
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${markerColor}; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [15, 15],
        iconAnchor: [7, 7]
      });
      
      const marker = L.marker([stop.latitude, stop.longitude], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <b>${stop.customerName}</b><br>
          ${stop.address}<br>
          <small>Llegada est.: ${stop.estimatedArrival}</small>
        `);
    });
    
    // Dibujar línea conectando las paradas en orden
    const routePoints = routeStops
      .sort((a, b) => a.order - b.order)
      .map(stop => [stop.latitude, stop.longitude]);
    
    L.polyline(routePoints as L.LatLngExpression[], { color: 'blue', weight: 3 }).addTo(map);
    
    // Ajustar visualización para incluir todas las paradas
    if (routeStops.length > 1) {
      map.fitBounds(L.latLngBounds(routePoints as L.LatLngExpression[]));
    }
    
    // Añadir marcador para la ubicación actual del conductor
    const driverMarker = L.marker(currentLocation, {
      icon: L.divIcon({
        className: 'driver-icon',
        html: `<div style="background-color: #0ea5e9; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
    
    // Actualizar el marcador cuando cambie la ubicación actual
    return () => {
      map.remove();
    };
  }, [routeStops, currentLocation]);

  return (
    <div className="container mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-center py-4 sticky top-0 bg-background border-b z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-full">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Ruta de Entrega</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={syncData}
            className="h-9 w-9"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="h-9 w-9"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Estado de la ruta */}
      <div className="bg-primary-foreground p-4 rounded-lg mt-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold">Estado de la ruta</h2>
            <p className="text-sm mt-1">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium 
                ${routeStatus === 'not_started' ? 'bg-yellow-100 text-yellow-800' : 
                  routeStatus === 'in_progress' ? 'bg-green-100 text-green-800' : 
                  routeStatus === 'paused' ? 'bg-orange-100 text-orange-800' : 
                  'bg-blue-100 text-blue-800'}`}
              >
                {routeStatus === 'not_started' ? 'No iniciada' : 
                  routeStatus === 'in_progress' ? 'En progreso' : 
                  routeStatus === 'paused' ? 'Pausada' : 
                  'Completada'}
              </span>
            </p>
          </div>
          
          <div className="flex gap-2">
            {routeStatus === 'not_started' && (
              <Button 
                size="sm" 
                onClick={startRoute}
                className="bg-primary hover:bg-primary/90"
              >
                Iniciar Ruta
              </Button>
            )}
            
            {routeStatus === 'in_progress' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={pauseRoute}
                >
                  Pausar
                </Button>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={completeRoute}
                >
                  Finalizar
                </Button>
              </>
            )}
            
            {routeStatus === 'paused' && (
              <Button 
                size="sm" 
                onClick={resumeRoute}
                className="bg-primary hover:bg-primary/90"
              >
                Reanudar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="mt-4 bg-background rounded-lg overflow-hidden shadow">
        <div ref={mapContainerRef} className="h-64 w-full"></div>
      </div>

      {/* DEBUG INFO - Sólo para desarrollo */}
      <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-yellow-800">
        <h3 className="font-bold text-lg">DEBUG INFO:</h3>
        <p>Route ID: {activeRouteId}</p>
        <p>Paradas totales: {routeStops.length}</p>
        <p>Primer parada: {routeStops[0]?.customerName} (ID: {routeStops[0]?.id})</p>
        <p>Estado de ruta: {routeStatus}</p>
        <p>Ubicación actual: [{currentLocation[0].toFixed(6)}, {currentLocation[1].toFixed(6)}]</p>
      </div>

      {/* Listado de paradas */}
      <div className="mt-4">
        <h2 className="font-bold text-xl mb-3">Ruta de entrega</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : routeStops.length === 0 ? (
          <div className="text-center py-10">
            <AlertTriangle className="h-10 w-10 mx-auto text-yellow-500 mb-3" />
            <p className="text-lg font-medium">No hay paradas asignadas para hoy</p>
            <p className="text-muted-foreground mt-1">
              Sincroniza tus datos o contacta a la oficina central
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {routeStops.map((stop) => (
              <div 
                key={stop.id} 
                className="bg-card rounded-lg shadow-sm border overflow-hidden"
              >
                {/* Encabezado de la parada */}
                <div className="flex items-start p-4">
                  <div className="flex-shrink-0 flex flex-col items-center mr-3">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center
                        ${stop.status === 'completed' ? 'bg-green-100 text-green-700' : 
                          stop.status === 'in_progress' ? 'bg-orange-100 text-orange-700' : 
                          'bg-primary/10 text-primary'}`}
                    >
                      {stop.order}
                    </div>
                    {stop.order < routeStops.length - 1 && (
                      <div className="h-full w-0.5 bg-gray-200 my-1"></div>
                    )}
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-base">{stop.customerName}</h3>
                        <div className="ml-8 text-sm">
                          <p className="text-muted-foreground text-xs mb-1">{stop.address}</p>
                          {stop.isWarehouse ? (
                            <div className="mb-2">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Punto de inicio
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 mb-2">
                              <div className="bg-primary/5 rounded-md p-2">
                                <div className="flex justify-between">
                                  <span className="text-xs font-bold">Total productos:</span>
                                  <span className="text-xs font-medium">
                                    {stop.products.reduce((total, product) => total + product.quantity, 0)} unidades
                                  </span>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-xs font-bold">Valor del pedido:</span>
                                  <span className="text-xs font-bold text-primary">
                                    ${stop.totalValue.toFixed(2)}
                                  </span>
                                </div>
                              </div>
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
                                  className="text-xs h-8 flex items-center gap-1"
                                  onClick={() => setExpandedStopId(expandedStopId === stop.id ? null : stop.id)}
                                >
                                  {expandedStopId === stop.id ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                  Detalles
                                </Button>
                              )}
                              
                              <Button 
                                size="sm"
                                variant="default"
                                className="text-xs h-8"
                                onClick={() => {
                                  if (mapRef.current && !stop.isWarehouse) {
                                    mapRef.current.setView([stop.latitude, stop.longitude], 17);
                                  }
                                }}
                              >
                                <Navigation className="h-3 w-3 mr-1" /> 
                                Navegar
                              </Button>
                            </div>
                          </div>
                          
                          {expandedStopId === stop.id && !stop.isWarehouse && (
                            <div 
                              className="mt-3 animate-in fade-in-50 slide-in-from-top-5 duration-300"
                            >
                              <div className="bg-background rounded-md border p-3">
                                <h4 className="font-medium mb-2 text-sm">Productos a entregar:</h4>
                                <div className="divide-y">
                                  <div className="grid grid-cols-12 gap-2 py-1 text-xs font-medium text-muted-foreground">
                                    <div className="col-span-7">Producto</div>
                                    <div className="col-span-2 text-center">Cant.</div>
                                    <div className="col-span-3 text-right">Precio</div>
                                  </div>
                                  
                                  {stop.products.map((product, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 py-2 text-xs">
                                      <div className="col-span-7">{product.name}</div>
                                      <div className="col-span-2 text-center">{product.quantity}x</div>
                                      <div className="col-span-3 text-right">${product.price.toFixed(2)}</div>
                                    </div>
                                  ))}
                                  
                                  <div className="grid grid-cols-12 gap-2 py-2 text-xs font-bold">
                                    <div className="col-span-7">Total</div>
                                    <div className="col-span-2 text-center">
                                      {stop.products.reduce((total, product) => total + product.quantity, 0)}
                                    </div>
                                    <div className="col-span-3 text-right text-primary">
                                      ${stop.totalValue.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {stop.status !== 'completed' && (
                                <div className="mt-3 flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    Marcar como entregado:
                                  </span>
                                  
                                  <Link href={`/mobile-app/entregas/${stop.id}?routeId=${activeRouteId}`}>
                                    <Button size="sm" className="text-xs">
                                      <CheckSquare className="h-3 w-3 mr-1" />
                                      Procesar entrega
                                    </Button>
                                  </Link>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <span className={`text-xs ${
                          stop.status === 'completed' ? 'bg-green-100 text-green-700' : 
                          stop.status === 'in_progress' ? 'bg-orange-100 text-orange-700' : 
                          'bg-blue-100 text-blue-800'
                        } px-2 py-0.5 rounded-full`}>
                          {stop.status === 'completed' ? 'Completado' : 
                           stop.status === 'in_progress' ? 'En progreso' : 
                           'Próximamente'}
                        </span>
                        <span className="text-xs font-medium mt-1">
                          {stop.estimatedArrival}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}