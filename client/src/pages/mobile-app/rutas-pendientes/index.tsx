import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Navigation, 
  Calendar,
  Clock,
  MapPin,
  Truck,
  TrendingUp,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { apiRequest } from "@/lib/api";

// Interface para las rutas pendientes
interface Route {
  id: number;
  name: string;
  date: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  totalStops: number;
  totalDistance: number;
  estimatedDuration: number;
  totalValue: number;
  vehicle: string;
}

export default function PendingRoutes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  
  // Alternar modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkMode ? 'light' : 'dark');
  };

  // Sincronizar datos
  const syncData = () => {
    toast({
      title: "Sincronizando rutas",
      description: "Actualizando información..."
    });
    
    loadRoutes();
  };

  // Cargar rutas pendientes
  const loadRoutes = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest('GET', '/api/driver/routes');
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo rutas pendientes
        const pendingRoutes = data.filter((r: any) => r.status === 'pending');
        setRoutes(pendingRoutes);
      } else {
        throw new Error('Error al cargar rutas');
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error al cargar rutas:", error);
      toast({
        title: "Error al cargar rutas",
        description: "No se pudieron obtener las rutas pendientes",
        variant: "destructive"
      });
      
      // Cargar rutas reales de la base de datos si hay un error
      // Esta es una solución de respaldo temporal
      try {
        const response = await apiRequest('GET', '/api/routes');
        if (response.ok) {
          const data = await response.json();
          // Filtrar solo rutas pendientes
          const pendingRoutes = data
            .filter((r: any) => r.status === 'pending')
            .map((route: any) => ({
              id: route.id,
              name: route.name || `Ruta #${route.id}`,
              date: route.date || new Date().toISOString().split('T')[0],
              status: route.status || "pending",
              totalStops: route.orders?.length || 0,
              totalDistance: route.totalDistance || 0,
              estimatedDuration: route.estimatedDuration || 0,
              totalValue: route.totalValue || 0,
              vehicle: route.vehicle?.name || "Sin asignar"
            }));
          setRoutes(pendingRoutes);
        }
      } catch (e) {
        console.error("Error en fallback:", e);
      }
      
      setIsLoading(false);
    }
  };

  // Iniciar una ruta
  const startRoute = (routeId: number) => {
    toast({
      title: "Cargando ruta",
      description: "Preparando los datos de la ruta..."
    });
    
    // Redirigir a la vista de ruta
    setLocation(`/mobile-app/ruta?id=${routeId}`);
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadRoutes();
    
    // Verificar el tema actual
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
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
            <h3 className="font-medium text-primary">Cargando rutas...</h3>
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
      
      <main className="container max-w-md mx-auto px-4 pb-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Rutas Pendientes</h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={syncData}
            className="flex items-center gap-1"
          >
            <TrendingUp className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
        
        <div className="space-y-4">
          {routes.length === 0 ? (
            <Card className={`${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No hay rutas pendientes</h3>
                <p className="text-sm text-muted-foreground">
                  Cuando se te asignen rutas, aparecerán aquí.
                </p>
              </CardContent>
            </Card>
          ) : (
            routes.map(route => (
              <Card 
                key={route.id} 
                className={`${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-lg">{route.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(route.date).toLocaleDateString('es-DO', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </p>
                    </div>
                    <Badge>
                      {route.status === "pending" && "Pendiente"}
                      {route.status === "in_progress" && "En progreso"}
                      {route.status === "completed" && "Completada"}
                      {route.status === "cancelled" && "Cancelada"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3 mt-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Paradas</p>
                        <p className="font-medium">{route.totalStops}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Distancia</p>
                        <p className="font-medium">{route.totalDistance} km</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Duración Est.</p>
                        <p className="font-medium">{Math.floor(route.estimatedDuration / 60)}h {route.estimatedDuration % 60}m</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Vehículo</p>
                        <p className="font-medium text-xs">{route.vehicle}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="font-bold text-primary">${route.totalValue.toFixed(2)}</p>
                    </div>
                    <Button 
                      onClick={() => startRoute(route.id)}
                      className="flex items-center gap-1"
                    >
                      <Play className="h-4 w-4" />
                      Iniciar Ruta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
      
      <MobileFooter darkMode={darkMode} />
    </div>
  );
}