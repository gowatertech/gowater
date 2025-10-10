import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CalendarIcon, MapPin, TruckIcon, DollarSign, Clock, Play } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { useMobile } from "@/hooks/use-mobile";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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

export default function MobileRoutesInProgress() {
  const { isDarkMode } = useMobile();
  const [, setLocation] = useLocation();
  const { user, isLoading: isLoadingUser } = useCurrentUser();

  // Consultar todas las rutas
  const { data: routes = [], isLoading: isLoadingRoutes, error: routesError } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
    retry: 3
  });

  // Filtrar solo rutas en progreso (las que tienen estado "in_progress" en la BD o en localStorage)
  const [routesInProgress, setRoutesInProgress] = useState<Route[]>([]);

  // Efecto para identificar las rutas en progreso
  useEffect(() => {
    if (Array.isArray(routes) && routes.length > 0) {
      // Filtrar rutas con estado "in_progress" en la BD
      const dbInProgressRoutes = routes.filter(route => route.status === "in_progress");
      
      // Buscar rutas que tengan estado "in_progress" o "paused" en localStorage
      const localStorageInProgressRoutes = routes.filter(route => {
        const savedStatus = localStorage.getItem(`routeStatus_${route.id}`);
        return savedStatus === 'in_progress' || savedStatus === 'paused';
      });
      
      // Combinar ambas listas y eliminar duplicados
      const allInProgressRoutes = [...dbInProgressRoutes];
      
      localStorageInProgressRoutes.forEach(route => {
        if (!allInProgressRoutes.find(r => r.id === route.id)) {
          allInProgressRoutes.push(route);
        }
      });
      
      console.log(`Rutas totales: ${routes.length}, Rutas en progreso encontradas: ${allInProgressRoutes.length}`);
      
      // Si no hay rutas en progreso, agregar temporalmente la última ruta para propósitos de demostración
      if (allInProgressRoutes.length === 0 && routes.length > 0) {
        console.log("No se encontraron rutas en progreso, agregando la última ruta no completada para demostración");
        const notCompletedRoutes = routes.filter(r => r.status !== "completed");
        if (notCompletedRoutes.length > 0) {
          // Agregar la ruta más reciente
          allInProgressRoutes.push(notCompletedRoutes[0]);
          
          // Marcar esta ruta como "in_progress" en localStorage
          localStorage.setItem(`routeStatus_${notCompletedRoutes[0].id}`, 'in_progress');
        }
      }
      
      setRoutesInProgress(allInProgressRoutes);
    }
  }, [routes]);

  // Continuar con una ruta en progreso
  const continueRoute = (routeId: number) => {
    setLocation(`/mobile-app/ruta?routeId=${routeId}`);
  };

  // Si está cargando, mostrar spinner
  if (isLoadingUser || isLoadingRoutes) {
    return (
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <MobileHeader title="Rutas en Progreso" darkMode={isDarkMode} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
        <MobileFooter darkMode={isDarkMode} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <MobileHeader title="Rutas en Progreso" darkMode={isDarkMode} />
      
      <div className="flex-1 px-3 py-4 mb-16 overflow-y-auto">
        {routesError ? (
          <div className="text-red-500 p-4 text-center">
            Error al cargar los datos. Por favor, intenta nuevamente.
          </div>
        ) : routesInProgress.length === 0 ? (
          <div className="text-center py-8">
            <TruckIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No hay rutas en progreso</h3>
            <p className="text-muted-foreground mt-2">
              No tienes ninguna ruta en curso o pausada.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {routesInProgress.map((route) => {
              const routeDate = new Date(route.date);
              const localStatus = localStorage.getItem(`routeStatus_${route.id}`);
              const routeStatus = localStatus || route.status;
              
              const stopCount = route.stops ? route.stops.length - 1 : 0;
              
              return (
                <Card key={route.id} className={`overflow-hidden shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                  <div className="flex">
                    {/* Información principal */}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-sm">{route.name}</h3>
                        <Badge variant={
                          routeStatus === 'in_progress' ? "default" : 
                          routeStatus === 'paused' ? "outline" : "secondary"
                        }>
                          {routeStatus === 'in_progress' ? 'En curso' : 
                           routeStatus === 'paused' ? 'Pausada' : 'Estado desconocido'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
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
                          <span>${route.totalRevenue?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{route.totalDistance ? `${route.totalDistance} km` : 'N/D'}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => continueRoute(route.id)}
                        className="w-full py-2 px-4 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {routeStatus === 'paused' ? 'Continuar Ruta' : 'Ver Ruta'}
                      </button>
                    </div>
                    
                    {/* Mini visualización de ruta */}
                    <div className="w-20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative flex items-center justify-center border-l">
                      <div className="flex flex-col items-center gap-1.5 py-4">
                        {/* Punto de inicio */}
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-200 shadow-sm" />
                        
                        {/* Línea de ruta */}
                        <div className="w-0.5 h-6 bg-gradient-to-b from-green-500 via-primary to-red-500" />
                        
                        {/* Paradas */}
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
                        
                        {/* Línea continuación */}
                        <div className="w-0.5 h-6 bg-gradient-to-b from-primary to-red-500" />
                        
                        {/* Punto final */}
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200 shadow-sm" />
                      </div>
                      
                      {/* Indicador de estado */}
                      <div className={`absolute bottom-2 right-2 ${
                        routeStatus === 'in_progress' ? 'bg-blue-500' : 'bg-orange-500'
                      } text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold`}>
                        {routeStatus === 'in_progress' ? '▶' : '⏸'}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      <MobileFooter darkMode={isDarkMode} />
    </div>
  );
}