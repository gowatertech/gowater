import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, CalendarIcon, MapPin, TruckIcon, DollarSign, Clock, UserRound } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { InstallPrompt } from "../components/InstallPrompt";
import { useMobile } from "@/hooks/use-mobile";
import { useCurrentUser } from "@/hooks/use-current-user";

// Tipo para el usuario
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

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
  routeId: number;
  customerId: number;
  status: string;
  totalAmount: number;
  customerName: string;
  customerAddress: string;
  products: Array<{
    productId: number;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export default function MobilePendingRoutes() {
  const { isDarkMode } = useMobile();
  const [, setLocation] = useLocation();
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [ordersByRoute, setOrdersByRoute] = useState<Record<number, Order[]>>({});

  // Consultar rutas pendientes, filtradas por el conductor actual
  const { data: routes = [], isLoading, error } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
    retry: 3
  });

  // Mostrar todas las rutas pendientes, sin filtrar por conductor
  const pendingRoutes = Array.isArray(routes) ? routes.filter((route: Route) => 
    route.status === "pending"
  ) : [];
  
  // Calcular el valor total de la ruta basado en los pedidos
  useEffect(() => {
    const fetchOrdersForRoutes = async () => {
      try {
        const orderResults: Record<number, Order[]> = {};
        
        for (const route of pendingRoutes) {
          try {
            const response = await fetch(`/api/routes/${route.id}/orders`);
            if (response.ok) {
              const orders = await response.json();
              orderResults[route.id] = orders;
            }
          } catch (err) {
            console.error(`Error al cargar pedidos para ruta ${route.id}:`, err);
          }
        }
        
        setOrdersByRoute(orderResults);
      } catch (err) {
        console.error("Error al cargar pedidos para rutas:", err);
      }
    };
    
    if (pendingRoutes.length > 0) {
      fetchOrdersForRoutes();
    }
  }, [pendingRoutes]);

  // Calcular el valor total de una ruta
  const calculateTotalRevenue = (routeId: number) => {
    const orders = ordersByRoute[routeId] || [];
    return orders.reduce((total, order) => total + (order.totalAmount || 0), 0);
  };

  // Contar el número de paradas por ruta (excluyendo el almacén)
  const countStops = (route: Route) => {
    return route.deliverySequence.length > 0 ? route.deliverySequence.length - 1 : 0;
  };

  // Efecto para mostrar prompt de instalación
  useEffect(() => {
    // Lógica para detectar si es instalable como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone) {
      const hasPromptBeenShown = localStorage.getItem('pwaPromptShown');
      if (!hasPromptBeenShown) {
        setShowInstallPrompt(true);
      }
    }
  }, []);

  const handleStartRoute = (routeId: number) => {
    // Actualizar el estado de la ruta a "in_progress"
    fetch(`/api/routes/${routeId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        // Navegar a la página de ruta activa
        setLocation(`/mobile-app/ruta?routeId=${routeId}`);
      }
    })
    .catch(err => {
      console.error("Error al iniciar la ruta:", err);
      // Navegar de todos modos para probar
      setLocation(`/mobile-app/ruta?routeId=${routeId}`);
    });
  };

  if (isLoadingUser) {
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
      
      <div className="flex-1 px-3 py-4 mb-16">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 text-center">
            Error al cargar las rutas. Por favor, intenta nuevamente.
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
          <div className="space-y-4">
            {pendingRoutes.map((route) => {
              const totalValue = calculateTotalRevenue(route.id);
              const stopCount = countStops(route);
              const routeDate = new Date(route.date);
              
              return (
                <div 
                  key={route.id} 
                  className={`border rounded-lg overflow-hidden shadow-sm ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'
                  }`}
                >
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-2">{route.name}</h3>
                    
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
                        <span>${totalValue.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{route.totalDistance ? `${route.totalDistance} km` : 'Dist. no disp.'}</span>
                      </div>
                    </div>
                    
                    {/* Mostrar los pedidos de la ruta */}
                    {ordersByRoute[route.id] && ordersByRoute[route.id].length > 0 ? (
                      <div className={`text-xs p-2 rounded mb-3 ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <div className="font-medium mb-1">Clientes en esta ruta:</div>
                        <ul className="space-y-1">
                          {ordersByRoute[route.id].map((order, index) => (
                            <li key={order.id} className="flex justify-between">
                              <span className="flex items-center">
                                <UserRound className="h-3 w-3 mr-1 text-muted-foreground" />
                                {order.customerName}
                              </span>
                              <span className="text-primary">${order.totalAmount.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className={`text-xs p-2 rounded mb-3 ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <div className="font-medium">Cargando detalles de pedidos...</div>
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