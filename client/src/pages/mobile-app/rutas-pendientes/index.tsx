import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  CalendarIcon, 
  MapPin, 
  TruckIcon, 
  DollarSign, 
  Clock, 
  UserRound, 
  Package, 
  Play, 
  Pause, 
  CheckCircle, 
  Square 
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { InstallPrompt } from "../components/InstallPrompt";
import { useMobile } from "@/hooks/use-mobile";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Tipo para las rutas
interface Route {
  id: number;
  name: string;
  driverId: number;
  status: string;
  date: string;
  totalDistance: string | null;
  totalRevenue: number | null;
  deliverySequence: string[];
  stops: string[];
  orderCount: number;
  orders?: Order[];
  localStatus?: 'in_progress' | 'paused' | undefined;
}

// Tipo para los pedidos
interface Order {
  id: number;
  routeId: number | null;
  customerId: number;
  status: string;
  total: string;
  paymentMethod: string;
  date: string;
  customerName: string;
  customerAddress: string;
  products: Array<{
    productId: number;
    name: string;
    quantity: number;
    price: string;
  }>;
}

// Helper functions for safe localStorage access
const safeLocalStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from localStorage (key: ${key}):`, error);
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (key: ${key}):`, error);
    return false;
  }
};

export default function MobilePendingRoutes() {
  const { isDarkMode } = useMobile();
  const [, setLocation] = useLocation();
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const { toast } = useToast();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<number, boolean>>({});
  
  // Consultar rutas pendientes (versión actualizada)
  const { data: routes = [], isLoading: isLoadingRoutes, error: routesError } = useQuery<Route[]>({
    queryKey: ["/api/routes/active"],
    queryFn: async () => {
      // Consultar todas las rutas activas sin filtrar por conductor
      const url = `/api/routes/active`;
      console.log("Consultando todas las rutas pendientes y en progreso:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('No se pudieron cargar las rutas pendientes');
      }
      const data = await response.json();
      console.log(`Rutas activas cargadas: ${data.length}`);
      return data;
    },
    retry: 3,
    enabled: !!user
  });

  // Consultar todas las órdenes disponibles
  const { data: allOrders = [], isLoading: isLoadingOrders, error: ordersError } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    retry: 3,
    enabled: !!user // Solo cargar órdenes cuando tengamos el usuario
  });

  // Variables para almacenar rutas por estado
  const [allAvailableRoutes, setAllAvailableRoutes] = useState<Route[]>([]);
  const [routesInProgress, setRoutesInProgress] = useState<Route[]>([]);
  const [routesPaused, setRoutesPaused] = useState<Route[]>([]);
  const [routesPending, setRoutesPending] = useState<Route[]>([]);
  
  // Efecto para clasificar las rutas por su estado
  useEffect(() => {
    if (Array.isArray(routes) && routes.length > 0) {
      const inProgress: Route[] = [];
      const paused: Route[] = [];
      const pending: Route[] = [];
      const available: Route[] = [];
      
      routes.forEach(route => {
        // Saltar rutas completadas
        if (route.status === "completed") return;
        
        // Verificar estado en localStorage con manejo de errores
        const savedStatus = safeLocalStorageGet(`routeStatus_${route.id}`);
        
        // Clasificar la ruta según su estado
        if (savedStatus === 'in_progress' || route.status === "in_progress") {
          inProgress.push({...route, localStatus: 'in_progress'});
        } 
        else if (savedStatus === 'paused') {
          paused.push({...route, localStatus: 'paused'});
        }
        else if (route.status === "pending") {
          pending.push({...route, localStatus: undefined});
        }
        
        // Agregar todas las rutas no completadas a la lista disponible
        available.push(route);
      });
      
      console.log(`Rutas disponibles: ${available.length}, En progreso: ${inProgress.length}, Pausadas: ${paused.length}, Pendientes: ${pending.length}`);
      
      // Actualizar estados
      setRoutesInProgress(inProgress);
      setRoutesPaused(paused);
      setRoutesPending(pending);
      setAllAvailableRoutes(available);
    }
  }, [routes]);

  // Agrupar las órdenes por ruta con base en la secuencia de entrega
  const [ordersByRoute, setOrdersByRoute] = useState<Record<number, Order[]>>({});

  // Función para obtener título apropiado según el estado de la ruta
  const getRouteStatusText = (route: Route) => {
    if (route.localStatus === 'in_progress' || route.status === 'in_progress') {
      return 'En progreso';
    } else if (route.localStatus === 'paused') {
      return 'Pausada';
    } else {
      return 'Pendiente';
    }
  };
  
  // Función para obtener el icono apropiado según el estado de la ruta
  const getRouteStatusIcon = (route: Route) => {
    if (route.localStatus === 'in_progress' || route.status === 'in_progress') {
      return <Play className="h-3 w-3 text-green-500" />;
    } else if (route.localStatus === 'paused') {
      return <Pause className="h-3 w-3 text-amber-500" />;
    } else {
      return <Clock className="h-3 w-3 text-blue-500" />;
    }
  };

  // Al cargar las rutas y las órdenes, asignar órdenes a rutas
  useEffect(() => {
    if (allAvailableRoutes.length > 0) {
      // Inicializar el objeto para almacenar las órdenes por ruta
      const routeOrders: Record<number, Order[]> = {};
      
      // Para cada ruta disponible, usar los pedidos que vienen en la ruta
      allAvailableRoutes.forEach(route => {
        // Si la ruta tiene órdenes precargadas en la API, las usamos
        if (route.orders && route.orders.length > 0) {
          routeOrders[route.id] = route.orders;
        } 
        // Si no tiene órdenes precargadas, intentamos buscarlas en allOrders
        else {
          const routeOrdersFromAll = allOrders.filter(order => 
            order.routeId === route.id && order.status === "pending"
          );
          
          routeOrders[route.id] = routeOrdersFromAll;
        }
      });
      
      // Actualizar el estado con las órdenes asignadas
      setOrdersByRoute(routeOrders);
      
      // Inicializar el estado de expansión para cada ruta (todas contraídas inicialmente)
      const initialExpandState: Record<number, boolean> = {};
      allAvailableRoutes.forEach(route => {
        initialExpandState[route.id] = false;
      });
      setExpandedRoutes(initialExpandState);
    }
  }, [allAvailableRoutes.length, allOrders.length]);

  // Contar el número de paradas por ruta (excluyendo el almacén)
  const countStops = (route: Route) => {
    return route.deliverySequence.length > 0 ? route.deliverySequence.length - 1 : 0;
  };

  // Calcular el valor total de una ruta basado en sus pedidos
  const calculateTotalRevenue = (routeId: number) => {
    const orders = ordersByRoute[routeId] || [];
    return orders.reduce((total, order) => {
      // Convertir a número y sumar
      return total + parseFloat(order.total || '0');
    }, 0);
  };

  // Expandir o contraer una ruta
  const toggleRouteExpand = (routeId: number) => {
    setExpandedRoutes(prev => ({
      ...prev,
      [routeId]: !prev[routeId]
    }));
  };

  // Efecto para mostrar prompt de instalación
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone) {
      const hasPromptBeenShown = safeLocalStorageGet('pwaPromptShown');
      if (!hasPromptBeenShown) {
        setShowInstallPrompt(true);
      }
    }
  }, []);

  // Manejar inicio de ruta
  const handleStartRoute = (routeId: number) => {
    // Comprobar si hay un estado guardado para esta ruta en localStorage con manejo de errores
    const savedRouteStatus = safeLocalStorageGet(`routeStatus_${routeId}`);
    console.log(`Verificando estado guardado para ruta ${routeId}: ${savedRouteStatus}`);
    
    // Si la ruta está en progreso o pausada, redirigimos directamente sin llamar a la API
    if (savedRouteStatus === 'in_progress' || savedRouteStatus === 'paused') {
      console.log(`Ruta ${routeId} ya iniciada (${savedRouteStatus}), redireccionando...`);
      setLocation(`/mobile-app/ruta?routeId=${routeId}`);
      return;
    }
    
    // Si no tiene un estado guardado o está en 'not_started', llamamos a la API
    fetch(`/api/routes/${routeId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log(`Ruta ${routeId} iniciada correctamente via API`);
        
        // Actualizar también los estados de los pedidos a "in_transit"
        // Esto ya lo hace el backend, pero mantenemos el código por compatibilidad
        fetch(`/api/routes/${routeId}/orders`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'in_transit'
          })
        })
        .then(resp => {
          console.log("Estado de pedidos actualizado a 'in_transit'");
        })
        .catch(err => {
          console.error("Error al actualizar estado de pedidos:", err);
        });
        
        // Guardar el estado como 'in_progress' en localStorage con manejo de errores
        safeLocalStorageSet(`routeStatus_${routeId}`, 'in_progress');
        // También guardar el estado general para compatibilidad
        safeLocalStorageSet('routeStatus', 'in_progress');
        setLocation(`/mobile-app/ruta?routeId=${routeId}`);
      } else if (data.activeRouteId) {
        // El servidor detectó que el conductor ya tiene una ruta activa
        const activeRouteId = data.activeRouteId;
        console.log(`El conductor ya tiene la ruta #${activeRouteId} activa`);
        
        // Mostrar alerta al usuario
        toast({
          title: "Ruta activa detectada",
          description: `Ya tienes una ruta en progreso. Debes completar o cancelar la ruta actual antes de iniciar una nueva.`,
          variant: "destructive",
          duration: 5000,
        });
        
        // Opcionalmente redirigir a la ruta activa
        setTimeout(() => {
          if (confirm("¿Deseas ir a la ruta activa?")) {
            setLocation(`/mobile-app/ruta?routeId=${activeRouteId}`);
          }
        }, 1000);
      } else {
        // Otro tipo de error
        console.error("Error al iniciar la ruta:", data.message || "Error desconocido");
        alert(`Error: ${data.message || "No se pudo iniciar la ruta"}`);
      }
    })
    .catch(err => {
      console.error("Error al iniciar la ruta:", err);
      alert("Error al iniciar la ruta. Por favor intenta de nuevo.");
    });
  };

  // Función para renderizar la tarjeta de una ruta
  const renderRouteCard = (route: Route) => {
    const routeOrders = ordersByRoute[route.id] || [];
    const stopCount = countStops(route);
    const routeDate = new Date(route.date);
    const totalRevenue = calculateTotalRevenue(route.id);
    const isExpanded = expandedRoutes[route.id] || false;
    
    // Determinar el texto del botón según el estado de la ruta
    const buttonText = 
      route.localStatus === 'in_progress' ? 'Continuar Ruta' : 
      route.localStatus === 'paused' ? 'Reanudar Ruta' : 
      'Iniciar Ruta';
    
    // Determinar el icono del botón según el estado
    const ButtonIcon = 
      route.localStatus === 'in_progress' || route.localStatus === 'paused' ? 
      Play : TruckIcon;
    
    return (
      <div 
        key={route.id} 
        className={`border rounded-lg overflow-hidden shadow-sm ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'
        }`}
      >
        <div className="flex">
          {/* Sección de información principal */}
          <div className="flex-1 p-4">
            {/* Información general de la ruta con indicador de estado */}
            <div 
              className="flex justify-between items-center cursor-pointer mb-2"
              onClick={() => toggleRouteExpand(route.id)}
            >
              <div className="flex items-center flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{route.name}</h3>
                <div className="ml-2 flex items-center flex-shrink-0">
                  {getRouteStatusIcon(route)}
                  <span className="text-xs ml-1 text-muted-foreground">
                    {getRouteStatusText(route)}
                  </span>
                </div>
              </div>
              <Badge variant={(routeOrders.length > 0 || route.orderCount > 0) ? "default" : "outline"} className="ml-2 flex-shrink-0">
                {routeOrders.length || route.orderCount || 0}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="flex items-center text-muted-foreground">
                <CalendarIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">
                  {format(routeDate, 'dd/MM/yy', { locale: es })}
                </span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>{stopCount} paradas</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <DollarSign className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>${totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{route.totalDistance ? `${route.totalDistance} km` : 'N/D'}</span>
              </div>
            </div>
            
            {/* Mostrar los pedidos de la ruta si está expandida */}
            {isExpanded && (
              <div className={`text-xs ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Separator className="mb-2" />
                
                {routeOrders.length > 0 ? (
                  <div className="space-y-3 mb-3">
                    <h4 className="font-medium">Pedidos en esta ruta:</h4>
                    
                    {routeOrders.map(order => (
                      <div 
                        key={order.id} 
                        className={`rounded-md p-2 ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="font-medium flex items-center">
                            <UserRound className="h-3 w-3 mr-1" />
                            {order.customerName}
                          </div>
                          <span className="text-primary font-medium">${parseFloat(order.total).toFixed(2)}</span>
                        </div>
                        
                        <div className="text-muted-foreground flex items-start mb-1">
                          <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{order.customerAddress}</span>
                        </div>
                        
                        <div className="mt-2">
                          <h5 className="font-medium mb-1 flex items-center">
                            <Package className="h-3 w-3 mr-1" />
                            Productos
                          </h5>
                          <ul className="space-y-1 pl-4 list-disc">
                            {order.products.map((product, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span className="truncate mr-2">{product.quantity}x {product.name}</span>
                                <span className="flex-shrink-0">${(parseFloat(product.price) * product.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 mb-2">
                    <span className="text-muted-foreground">No hay pedidos asignados a esta ruta</span>
                  </div>
                )}
                
                <Separator className="mt-2 mb-3" />
              </div>
            )}
            
            {/* Botón para iniciar o continuar ruta */}
            <button 
              onClick={() => handleStartRoute(route.id)}
              className="w-full py-2 px-4 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center mb-2"
            >
              <ButtonIcon className="h-3 w-3 mr-1" />
              {buttonText}
            </button>
            
            {/* Botón para finalizar ruta - solo visible para rutas en progreso */}
            {(route.localStatus === 'in_progress' || route.status === 'in_progress') && (
              <button 
                onClick={() => setLocation(`/mobile-app/ruta/${route.id}`)}
                className="w-full py-2 px-4 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                FINALIZAR RUTA
              </button>
            )}
          </div>
          
          {/* Mini visualización de ruta a la derecha */}
          <div className="w-20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative flex items-center justify-center border-l">
            <div className="flex flex-col items-center gap-1.5 py-4">
              {/* Punto de inicio (almacén) */}
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-200 shadow-sm" />
              
              {/* Línea de ruta */}
              <div className="w-0.5 h-6 bg-gradient-to-b from-green-500 via-primary to-red-500" />
              
              {/* Indicador de paradas intermedias */}
              {stopCount > 0 && (
                <div className="flex flex-col items-center gap-0.5">
                  {[...Array(Math.min(stopCount, 3))].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ))}
                  {stopCount > 3 && (
                    <span className="text-[9px] text-muted-foreground font-medium">
                      +{stopCount - 3}
                    </span>
                  )}
                </div>
              )}
              
              {/* Línea de ruta continuación */}
              <div className="w-0.5 h-6 bg-gradient-to-b from-primary to-red-500" />
              
              {/* Punto final */}
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200 shadow-sm" />
            </div>
            
            {/* Badge con número de pedidos */}
            <div className="absolute bottom-2 right-2 bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {routeOrders.length || route.orderCount || 0}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Si está cargando el usuario o los datos, mostrar spinner
  if (isLoadingUser || isLoadingRoutes || isLoadingOrders) {
    return (
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <MobileHeader title="Mis Rutas" darkMode={isDarkMode} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
        <MobileFooter darkMode={isDarkMode} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <MobileHeader title="Mis Rutas" darkMode={isDarkMode} />
      
      {showInstallPrompt && (
        <InstallPrompt onClose={() => {
          setShowInstallPrompt(false);
          safeLocalStorageSet('pwaPromptShown', 'true');
        }} />
      )}
      
      <div className="flex-1 px-3 py-4 mb-16 overflow-y-auto">
        {routesError || ordersError ? (
          <div className="text-red-500 p-4 text-center">
            Error al cargar los datos. Por favor, intenta nuevamente.
          </div>
        ) : allAvailableRoutes.length === 0 ? (
          <div className="text-center py-8">
            <TruckIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No hay rutas disponibles</h3>
            <p className="text-muted-foreground mt-2">
              Actualmente no hay rutas pendientes o en progreso en el sistema.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Rutas en progreso */}
            {routesInProgress.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center">
                  <Play className="h-4 w-4 mr-2 text-green-500" />
                  Rutas en progreso
                </h2>
                <div className="space-y-3">
                  {routesInProgress.map((route) => renderRouteCard(route))}
                </div>
              </div>
            )}
            
            {/* Rutas pausadas */}
            {routesPaused.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center">
                  <Pause className="h-4 w-4 mr-2 text-amber-500" />
                  Rutas pausadas
                </h2>
                <div className="space-y-3">
                  {routesPaused.map((route) => renderRouteCard(route))}
                </div>
              </div>
            )}
            
            {/* Rutas pendientes */}
            {routesPending.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-500" />
                  Rutas pendientes
                </h2>
                <div className="space-y-3">
                  {routesPending.map((route) => renderRouteCard(route))}
                </div>
              </div>
            )}
            
            {/* Si no hay rutas en ninguna categoría */}
            {routesInProgress.length === 0 && routesPaused.length === 0 && routesPending.length === 0 && (
              <div className="text-center py-8">
                <TruckIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold">No hay rutas activas</h3>
                <p className="text-muted-foreground mt-2">
                  Todas las rutas han sido completadas o canceladas.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <MobileFooter darkMode={isDarkMode} />
    </div>
  );
}