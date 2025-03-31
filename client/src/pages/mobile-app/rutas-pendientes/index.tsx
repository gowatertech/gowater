import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CalendarIcon, MapPin, TruckIcon, DollarSign, Clock, UserRound, Package } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { InstallPrompt } from "../components/InstallPrompt";
import { useMobile } from "@/hooks/use-mobile";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

export default function MobilePendingRoutes() {
  const { isDarkMode } = useMobile();
  const [, setLocation] = useLocation();
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<number, boolean>>({});
  
  // Consultar rutas pendientes
  const { data: routes = [], isLoading: isLoadingRoutes, error: routesError } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
    retry: 3
  });

  // Consultar todas las órdenes disponibles
  const { data: allOrders = [], isLoading: isLoadingOrders, error: ordersError } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    retry: 3
  });

  // Filtrar rutas pendientes y en progreso
  const pendingRoutes = Array.isArray(routes) 
    ? routes.filter(route => route.status === "pending" || route.status === "in_progress") 
    : [];

  // Agrupar las órdenes por ruta con base en la secuencia de entrega
  const [ordersByRoute, setOrdersByRoute] = useState<Record<number, Order[]>>({});

  // Esta función asigna órdenes a rutas
  const assignOrdersToRoutes = () => {
    // Inicializar el objeto para almacenar las órdenes por ruta
    const routeOrders: Record<number, Order[]> = {};

    // Para cada ruta pendiente
    pendingRoutes.forEach(route => {
      // Filtrar órdenes que no tengan ruta asignada
      const unassignedOrders = allOrders.filter(order => 
        order.routeId === null && order.status === "pending"
      );

      // Las órdenes pendientes siempre se muestran en las rutas disponibles
      // ya que aún no están asociadas a ninguna ruta específica
      routeOrders[route.id] = unassignedOrders;
    });

    // Actualizar el estado con las órdenes asignadas
    setOrdersByRoute(routeOrders);
  };

  // Al cargar las rutas y las órdenes, asignar órdenes a rutas
  useEffect(() => {
    if (pendingRoutes.length > 0 && allOrders.length > 0) {
      // Asignar órdenes a rutas basándose en coordenadas
      assignOrdersToRoutes();
      
      // Inicializar el estado de expansión para cada ruta (todas contraídas inicialmente)
      const initialExpandState: Record<number, boolean> = {};
      pendingRoutes.forEach(route => {
        initialExpandState[route.id] = false;
      });
      setExpandedRoutes(initialExpandState);
    }
  }, [pendingRoutes.length, allOrders.length]);

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
      const hasPromptBeenShown = localStorage.getItem('pwaPromptShown');
      if (!hasPromptBeenShown) {
        setShowInstallPrompt(true);
      }
    }
  }, []);

  // Manejar inicio de ruta
  const handleStartRoute = (routeId: number) => {
    // Comprobar si hay un estado guardado para esta ruta en localStorage
    const savedRouteStatus = localStorage.getItem(`routeStatus_${routeId}`);
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
    .then(response => {
      if (response.ok) {
        console.log(`Ruta ${routeId} iniciada correctamente via API`);
        // Guardar el estado como 'in_progress' en localStorage
        localStorage.setItem(`routeStatus_${routeId}`, 'in_progress');
        setLocation(`/mobile-app/ruta?routeId=${routeId}`);
      }
    })
    .catch(err => {
      console.error("Error al iniciar la ruta:", err);
      // Incluso con error, redirigimos y manejamos el estado en la página de ruta
      setLocation(`/mobile-app/ruta?routeId=${routeId}`);
    });
  };

  // Si está cargando el usuario o los datos, mostrar spinner
  if (isLoadingUser || isLoadingRoutes || isLoadingOrders) {
    return (
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <MobileHeader title="Rutas Pendientes" darkMode={isDarkMode} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
        <MobileFooter darkMode={isDarkMode} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <MobileHeader title="Rutas Pendientes" darkMode={isDarkMode} />
      
      {showInstallPrompt && (
        <InstallPrompt onClose={() => {
          setShowInstallPrompt(false);
          localStorage.setItem('pwaPromptShown', 'true');
        }} />
      )}
      
      <div className="flex-1 px-3 py-4 mb-16 overflow-y-auto">
        {routesError || ordersError ? (
          <div className="text-red-500 p-4 text-center">
            Error al cargar los datos. Por favor, intenta nuevamente.
          </div>
        ) : pendingRoutes.length === 0 ? (
          <div className="text-center py-8">
            <TruckIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No hay rutas pendientes</h3>
            <p className="text-muted-foreground mt-2">
              Actualmente no hay rutas pendientes en el sistema.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingRoutes.map((route) => {
              const routeOrders = ordersByRoute[route.id] || [];
              const stopCount = countStops(route);
              const routeDate = new Date(route.date);
              const totalRevenue = calculateTotalRevenue(route.id);
              const isExpanded = expandedRoutes[route.id] || false;
              
              return (
                <div 
                  key={route.id} 
                  className={`border rounded-lg overflow-hidden shadow-sm ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'
                  }`}
                >
                  <div className="p-4">
                    {/* Información general de la ruta */}
                    <div 
                      className="flex justify-between items-center cursor-pointer mb-2"
                      onClick={() => toggleRouteExpand(route.id)}
                    >
                      <h3 className="font-semibold text-sm">{route.name}</h3>
                      <Badge variant={routeOrders.length > 0 ? "default" : "outline"}>
                        {routeOrders.length} pedidos
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        <span>
                          {format(routeDate, 'PPP', { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{stopCount} paradas</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="h-3 w-3 mr-1" />
                        <span>${totalRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{route.totalDistance ? `${route.totalDistance} km` : 'Dist. no disp.'}</span>
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
                    
                    <button 
                      onClick={() => handleStartRoute(route.id)}
                      className="w-full py-2 px-4 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
                    >
                      <TruckIcon className="h-3 w-3 mr-1" />
                      Iniciar Ruta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <MobileFooter darkMode={isDarkMode} />
    </div>
  );
}