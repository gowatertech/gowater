import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

// Components
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Icons
import {
  PlusCircle,
  RefreshCw,
  Truck,
  Calendar,
  MapPin,
  Eye,
  User,
  Package,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  Loader2,
  Clock,
  Check,
  Activity,
  Info,
  X,
  LayoutGrid,
  AlertTriangle
} from "lucide-react";

// Sub-components
import StepRouteForm from "@/components/routes/StepRouteForm";
import { ResponsiveRoutesList } from "@/components/routes/ResponsiveRoutesList";

// Placeholders para componentes que necesitamos crear
const DriverView = () => <div>Vista de conductor</div>;
const DeliveryTracking = () => <div>Seguimiento de entrega</div>;

// Types
import { Route } from "@shared/schema";

// Componente para una tarjeta de estadísticas
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: string;
  trendUp?: boolean;
}

function StatsCard({ title, value, icon, description, trend, trendUp }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          {trend && (
            <div className={`flex items-center text-xs ${trendUp ? "text-green-500" : "text-red-500"}`}>
              {trendUp ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
              {trend}
            </div>
          )}
        </div>
        <div className="p-2 bg-primary/10 rounded-full">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RoutesPage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedTab, setSelectedTab] = useState<"dashboard" | "routes" | "create">("dashboard");
  const [routeStatusTab, setRouteStatusTab] = useState<"active" | "completed">("active");
  
  // Usamos el hook para detección de móvil
  const isMobile = useIsMobile();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Ya no necesitamos el modo de creación de ruta porque solo usamos un método
  // const [routeCreationMode, setRouteCreationMode] = useState<"customers" | "orders">("orders");
  
  // Obtener rutas
  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      setError(false);
      
      try {
        const response = await fetch('/api/routes');
        if (!response.ok) {
          throw new Error('Error al cargar rutas');
        }
        
        const data = await response.json();
        setRoutes(data);
        console.log("Routes loaded:", data);
      } catch (err) {
        console.error('Error fetching routes:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoutes();
  }, []);

  const isDriver = user?.role === "driver";
  const isAssistant = user?.role === "assistant";

  // The driver interface shows current status and upcoming deliveries
  if (isDriver) {
    return <DriverView />;
  }

  // Delivery assistants see order tracking
  if (isAssistant) {
    return <DeliveryTracking />;
  }

  // Click handler for the create route button
  const handleCreateRoute = () => {
    setSelectedTab("create");
  };

  // When creation is canceled we return to the list
  const handleCancelCreate = () => {
    setSelectedTab("routes");
  };

  // When a route is created we return to the list
  const handleRouteCreated = () => {
    setSelectedTab("routes");
    // Refrescar la lista de rutas
    queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
  };

  // Calcular estadísticas para el dashboard
  const routeStats = {
    totalRoutes: routes.length,
    activeRoutes: routes.filter(r => !r.isCompleted).length,
    completedRoutes: routes.filter(r => r.isCompleted).length,
    inProgressRoutes: routes.filter(r => r.status === "in_progress").length
  };

  // Renderizar el contenido según la pestaña seleccionada
  const renderTabContent = () => {
    switch (selectedTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                title="Rutas Activas"
                value={routeStats.activeRoutes}
                icon={<Truck className="h-5 w-5 text-primary" />}
                description="Rutas pendientes o en progreso"
              />
              <StatsCard
                title="Rutas Completadas"
                value={routeStats.completedRoutes}
                icon={<Check className="h-5 w-5 text-primary" />}
                description="Total de rutas finalizadas"
              />
              <StatsCard
                title="En Progreso"
                value={routeStats.inProgressRoutes}
                icon={<Activity className="h-5 w-5 text-primary" />}
                description="Rutas actualmente en marcha"
              />
            </div>
            
            {/* Resumen de rutas */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-medium">Rutas Recientes</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTab("routes")}>
                    Ver todas
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Últimas rutas creadas o actualizadas</CardDescription>
              </CardHeader>
              <CardContent>
                {routes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Truck className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">No hay rutas definidas</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {routes.slice(0, 6).map((route) => (
                        <div
                          key={route.id}
                          className="flex items-center justify-between p-2 border rounded-md"
                        >
                          <div className="space-y-1">
                            <span className="font-medium text-sm">
                              {route.name || `Ruta #${route.id}`}
                            </span>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(route.date), 'dd/MM/yyyy')}
                              
                              {route.driverId && (
                                <>
                                  <span className="mx-1">•</span>
                                  <User className="h-3 w-3 mr-1" />
                                  Conductor ID: {route.driverId}
                                </>
                              )}

                              {route.stops && route.stops.length > 0 && (
                                <>
                                  <span className="mx-1">•</span>
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {route.stops.length} paradas
                                </>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={route.isCompleted ? "default" : 
                                    route.status === "in_progress" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {route.isCompleted 
                              ? "Completada" 
                              : route.status === "in_progress" 
                                ? "En Progreso" 
                                : "Pendiente"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
              {/* Pie de card eliminado para evitar duplicidad de botones */}
            </Card>
          </div>
        );
        
      case "routes":
        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Lista de Rutas</h2>
              <div className="flex items-center gap-2">
                <Tabs 
                  defaultValue={routeStatusTab} 
                  className="w-auto"
                  onValueChange={(value) => setRouteStatusTab(value as "active" | "completed")}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active">Activas</TabsTrigger>
                    <TabsTrigger value="completed">Completadas</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button size="sm" onClick={handleCreateRoute}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Nueva
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Info className="h-10 w-10 text-destructive mb-2" />
                    <h3 className="font-semibold mb-1">Error al cargar las rutas</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      No se pudieron cargar los datos de rutas. Intente nuevamente.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
                        window.location.reload();
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reintentar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ResponsiveRoutesList 
                routes={routes.filter(route => 
                  routeStatusTab === "completed" 
                    ? route.isCompleted 
                    : !route.isCompleted
                )} 
              />
            )}
          </div>
        );
        
      // El caso "create" ahora se maneja directamente en el JSX principal
      // para evitar posibles conflictos de renderizado
        
      default:
        return <div>Selecciona una opción para comenzar</div>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Rutas</h2>
          <p className="text-muted-foreground">
            Configure, asigne y monitoree rutas para entregas
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setSelectedTab("create")}
            className={isMobile ? "w-full" : ""}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Ruta
          </Button>
        </div>
      </div>

      <Separator />
      
      {/* Renderiza el contenido directamente basado en selectedTab */}
      {selectedTab === "create" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Crear nueva ruta</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancelCreate}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
            <CardDescription>Configurar una nueva ruta basada en pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-md">
              <h3 className="text-lg font-semibold mb-4">Selección de zona</h3>
              <p className="mb-4">Por favor seleccione una zona para continuar:</p>
              
              <div className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {loading ? (
                    <div className="col-span-full flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : error ? (
                    <div className="col-span-full text-center text-destructive">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      <p>Error al cargar zonas</p>
                    </div>
                  ) : (
                    <div className="col-span-full">
                      <Button onClick={handleRouteCreated} className="w-full">
                        Crear ruta para Cotui
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 justify-end mt-6">
                  <Button onClick={handleCancelCreate} variant="outline">Cancelar</Button>
                  <Button onClick={handleRouteCreated}>Continuar</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="routes" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Truck className="h-4 w-4 mr-2" />
              Rutas
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-4">
            {renderTabContent()}
          </div>
        </Tabs>
      )}
    </div>
  );
}