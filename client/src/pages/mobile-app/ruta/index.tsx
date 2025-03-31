// Versión simple y estable para pruebas
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { toNumber } from "@/lib/format";

// Componentes UI
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WaterProgressBar } from "@/components/ui/water-progress-bar";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { useCurrentUser } from "@/hooks/use-current-user";

// Iconos
import { 
  Check, ChevronDown, ChevronUp, Compass, Info,
  Clock, AlertTriangle, Navigation 
} from "lucide-react";

export default function DriverRoute() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  
  // Estado local
  const [darkMode, setDarkMode] = useState(false);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [expandedStopId, setExpandedStopId] = useState<number | null>(null);
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
  
  // Consultar rutas activas
  const { data: activeRoutes = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/routes/active'],
    enabled: !!user
  });
  
  useEffect(() => {
    if (activeRoutes && activeRoutes.length > 0) {
      // Buscar la ruta más reciente que esté en progreso o pendiente
      let activeRoute = activeRoutes.find(r => r.status === 'in_progress');
      
      if (!activeRoute) {
        activeRoute = activeRoutes.find(r => r.status === 'pending');
      }
      
      if (activeRoute) {
        setActiveRouteId(activeRoute.id);
        
        // Cargar los detalles de la ruta
        fetchRouteDetails(activeRoute.id);
      }
    }
  }, [activeRoutes]);
  
  // Obtener detalles de la ruta
  const fetchRouteDetails = async (routeId: number) => {
    try {
      const response = await apiRequest(`/api/routes/${routeId}/stops`, {
        method: 'GET'
      });
      if (response && Array.isArray(response)) {
        setRouteStops(response);
      }
    } catch (err) {
      console.error("Error fetching route details:", err);
      toast({
        title: "Error al cargar la ruta",
        description: "No se pudieron cargar los detalles de la ruta",
        variant: "destructive"
      });
    }
  };
  
  // Calcular progreso de la ruta
  const calculateRouteProgress = () => {
    if (routeStops.length <= 1) return 0;
    
    const completedStops = routeStops.filter(
      stop => !stop.isWarehouse && stop.status === 'completed'
    ).length;
    
    const totalStops = routeStops.filter(
      stop => !stop.isWarehouse
    ).length;
    
    return totalStops > 0 ? (completedStops / totalStops) * 100 : 0;
  };
  
  const calculateCompletedStops = () => {
    return routeStops.filter(
      stop => !stop.isWarehouse && stop.status === 'completed'
    ).length;
  };
  
  // Navegar a la ubicación del cliente
  const navigateToLocation = (latitude: number, longitude: number) => {
    // Abrir Google Maps
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      '_blank'
    );
  };
  
  // Activar/desactivar modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
        <MobileHeader 
          user={user} 
          darkMode={darkMode} 
          onToggleDarkMode={toggleDarkMode} 
          onSyncData={() => {}}
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
  
  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
        <MobileHeader 
          user={user} 
          darkMode={darkMode} 
          onToggleDarkMode={toggleDarkMode} 
          onSyncData={() => {}}
        />
        <div className="container px-4 py-4">
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold">Error al cargar la ruta</h2>
              <p className="text-muted-foreground mb-4">
                No se pudo obtener la información de la ruta activa.
              </p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/routes/active'] })}
                className="mx-auto"
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }
  
  if (!activeRouteId || routeStops.length === 0) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
        <MobileHeader 
          user={user} 
          darkMode={darkMode} 
          onToggleDarkMode={toggleDarkMode} 
          onSyncData={() => {}}
        />
        <div className="container px-4 py-4">
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4 text-center">
              <Navigation className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-lg font-bold">No hay rutas activas</h2>
              <p className="text-muted-foreground mb-4">
                No se encontró ninguna ruta en progreso asignada a tu usuario.
              </p>
              <Button 
                onClick={() => setLocation('/mobile-app/rutas-pendientes')}
                className="mx-auto"
              >
                Ver rutas pendientes
              </Button>
            </CardContent>
          </Card>
        </div>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }
  
  // Vista principal de la ruta
  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
      <MobileHeader 
        user={user} 
        darkMode={darkMode} 
        onToggleDarkMode={toggleDarkMode} 
        onSyncData={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/routes/active'] });
          if (activeRouteId) {
            fetchRouteDetails(activeRouteId);
          }
        }}
      />
      
      <main className="container px-4 py-4">
        <div className="space-y-4">          
          {/* Progreso de Entrega */}
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <h2 className="text-lg font-bold mb-2">Progreso de Entrega</h2>
              
              {/* Barra de progreso animada con efecto de agua */}
              <WaterProgressBar 
                progress={calculateRouteProgress()}
                total={routeStops.length > 0 ? routeStops.length - 1 : 0} 
                completed={calculateCompletedStops()}
                label="Entregas completadas"
                darkMode={darkMode}
                size="lg"
              />
              
              <div className="mt-3 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Almacén</span>
                  <span>Destino final</span>
                </div>
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
                {routeStops.length <= 1 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay paradas asignadas para hoy</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Debug: Encontradas {routeStops.length} paradas, {routeStops.length > 0 ? 'incluye almacén' : 'sin paradas'}
                    </p>
                  </div>
                ) : (
                  routeStops.map((stop, index) => (
                    <div 
                      key={stop.id}
                      className={`border rounded-lg p-3 ${
                        stop.status === 'completed' && !stop.isWarehouse
                          ? darkMode 
                            ? 'bg-gray-900 border-gray-800 opacity-70' 
                            : 'bg-gray-100 border-gray-300 opacity-80'
                          : darkMode 
                            ? 'border-gray-700' 
                            : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            stop.isWarehouse
                              ? 'bg-primary/10 text-primary'
                              : stop.status === 'completed' 
                                ? darkMode ? 'bg-gray-700 text-green-300' : 'bg-green-100 text-green-600' 
                                : 'bg-primary/10 text-primary'
                          }`}>
                            <span className="text-xs font-medium">{stop.order}</span>
                          </div>
                          <span className={`font-medium ${
                            stop.status === 'completed' && !stop.isWarehouse
                              ? darkMode ? 'text-gray-400' : 'text-gray-500'
                              : ''
                          }`}>
                            {stop.customerName}
                            {stop.status === 'completed' && !stop.isWarehouse && (
                              <span className="ml-2 inline-flex items-center text-green-500 text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Completada
                              </span>
                            )}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          stop.status === 'completed' 
                            ? darkMode ? 'bg-gray-700 text-green-300' : 'bg-green-100 text-green-600' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {stop.estimatedArrival}
                        </span>
                      </div>
                      
                      {/* Contenido condicional: versión simple para paradas completadas */}
                      {stop.status === 'completed' && !stop.isWarehouse ? (
                        <div className="ml-8 text-sm">
                          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                            {stop.address}{!stop.isWarehouse ? ", Cotuí, Sánchez Ramírez" : ""}
                          </p>
                          
                          <div className="flex justify-between mt-2">
                            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              {stop.products && stop.products.length > 0 ? (
                                <span>{stop.products.reduce((total: number, product: any) => total + product.quantity, 0)} productos entregados</span>
                              ) : null}
                            </div>
                            <div className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              ${toNumber(stop.totalValue).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="ml-8 text-sm">
                          <p className="text-muted-foreground text-xs mb-1">{stop.address}{!stop.isWarehouse ? ", Cotuí, Sánchez Ramírez" : ""}</p>
                          
                          {stop.products && stop.products.length > 0 ? (
                            <div className="mt-1 mb-2">
                              <h4 className="text-xs font-bold mb-1">Productos:</h4>
                              <div className="bg-primary/5 rounded-md p-2">
                                <ul className="space-y-1">
                                  {stop.products.map((product: any, pidx: number) => (
                                    <li 
                                      key={`${stop.id}-${pidx}`}
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
                                      {stop.products.reduce((total: number, product: any) => total + product.quantity, 0)} unidades
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs font-bold">Valor del pedido:</span>
                                    <span className="text-xs font-bold text-primary">
                                      ${toNumber(stop.totalValue).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-2">
                              {stop.isWarehouse && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
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
                              {!stop.isWarehouse && stop.status !== 'completed' && (
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
                      )}
                        
                      {/* Panel expandible con detalles de la parada - solo visible para paradas no completadas */}
                      {expandedStopId === stop.id && !stop.isWarehouse && stop.status !== 'completed' && (
                        <div className="mt-4 p-3 bg-muted rounded-md animate-in fade-in-50 duration-200">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Info className="h-4 w-4" />
                            Productos a entregar
                          </h4>
                          
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-xs font-semibold">Cliente:</span>
                              <p className="text-xs">{stop.customerName}</p>
                            </div>
                            
                            <div>
                              <span className="text-xs font-semibold">Dirección completa:</span>
                              <p className="text-xs">{stop.address}, Cotuí, Sánchez Ramírez, Rep. Dominicana</p>
                            </div>
                            
                            <div>
                              <span className="text-xs font-semibold">Productos:</span>
                              <div className="mt-1 border border-border rounded-sm overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead className="bg-background border-b border-border">
                                    <tr>
                                      <th className="px-2 py-1 text-left">Producto</th>
                                      <th className="px-2 py-1 text-center">Cant.</th>
                                      <th className="px-2 py-1 text-right">Precio</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {stop.products && stop.products.map((product: any, pidx: number) => (
                                      <tr key={`${stop.id}-detail-${pidx}`} className={pidx % 2 === 0 ? "bg-muted/50" : ""}>
                                        <td className="px-2 py-1">{product.name}</td>
                                        <td className="px-2 py-1 text-center">{product.quantity}</td>
                                        <td className="px-2 py-1 text-right">${(product.price * product.quantity).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 mt-1 border-t border-border">
                              <span className="text-xs font-semibold">Total del pedido:</span>
                              <span className="text-sm font-bold text-primary">${toNumber(stop.totalValue).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
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