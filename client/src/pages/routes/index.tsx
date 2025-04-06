import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Map components
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Icons
import {
  PlusCircle,
  RefreshCw,
  Truck,
  Calendar,
  MapPin,
  Eye,
  Edit,
  X,
  ArrowRight,
  User,
  Package,
  ChevronLeft,
  ChevronRight,
  Map,
  Grid,
  LayoutGrid,
  Loader2,
  Clock,
  Check,
  Activity,
  BarChart,
  CircleX,
  Info,
  Target,
} from "lucide-react";

// Sub-components
import ZoneBasedRouteForm from "@/components/routes/ZoneBasedRouteForm";
import PendingOrdersRouteForm from "@/components/routes/PendingOrdersRouteForm";
import ZoneMap from "./ZoneMap";
import { ResponsiveRoutesList } from "@/components/routes/ResponsiveRoutesList";
import { ResponsiveZonesList } from "@/components/routes/ResponsiveZonesList";

// Placeholders para componentes que necesitamos crear
const DriverView = () => <div>Vista de conductor</div>;
const DeliveryTracking = () => <div>Seguimiento de entrega</div>;

// Types
import { Zone, Route } from "@shared/schema";

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
  const [selectedTab, setSelectedTab] = useState<"dashboard" | "zones" | "routes" | "create">("dashboard");
  const [routeStatusTab, setRouteStatusTab] = useState<"active" | "completed">("active");
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zoneColor, setZoneColor] = useState("#0088FE");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [viewZoneDialogOpen, setViewZoneDialogOpen] = useState(false);
  const [editZoneDialogOpen, setEditZoneDialogOpen] = useState(false);
  const [editZoneName, setEditZoneName] = useState("");
  const [editZoneColor, setEditZoneColor] = useState("");
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  
  // Usamos el hook para detección de móvil
  const isMobile = useIsMobile();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Estado para modo de creación de ruta
  const [routeCreationMode, setRouteCreationMode] = useState<"customers" | "orders">("customers");

  // Obtener zonas
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });
  
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
        console.log("Routes loaded in useRoutes hook:", data);
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

  // When a zone is created successfully
  const handleZoneCreated = () => {
    setIsCreatingZone(false);
    setZoneName("");
  };

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

  // Mutation for deleting a zone
  const deleteZoneMutation = useMutation({
    mutationFn: async (zoneId: number) => {
      const response = await apiRequest("DELETE", `/api/zones/${zoneId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar la zona');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      toast({
        description: "Zona eliminada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  // Mutation for updating a zone
  const updateZoneMutation = useMutation({
    mutationFn: async (zone: { id: number; name: string; color: string }) => {
      const response = await apiRequest("PATCH", `/api/zones/${zone.id}`, zone);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar la zona');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      setEditZoneDialogOpen(false);
      toast({
        description: "Zona actualizada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  // Handler para ver zona
  const handleViewZone = (zone: Zone) => {
    setSelectedZone(zone);
    setViewZoneDialogOpen(true);
  };

  // Handler para editar zona
  const handleEditZone = (zone: Zone) => {
    setSelectedZone(zone);
    setEditZoneName(zone.name);
    setEditZoneColor(zone.color);
    setEditZoneDialogOpen(true);
  };

  // Handler para guardar edición de zona
  const handleSaveZone = () => {
    if (selectedZone && editZoneName.trim()) {
      updateZoneMutation.mutate({
        id: selectedZone.id,
        name: editZoneName,
        color: editZoneColor
      });
    }
  };

  // Handler para eliminar zona
  const handleDeleteZone = (zone: Zone) => {
    setSelectedZone(zone);
    setDeleteAlertOpen(true);
  };

  // Handler para confirmar eliminación de zona
  const handleConfirmDelete = () => {
    if (selectedZone) {
      deleteZoneMutation.mutate(selectedZone.id);
      setDeleteAlertOpen(false);
    }
  };

  // Calcular estadísticas para el dashboard
  const routeStats = {
    totalRoutes: routes.length,
    activeRoutes: routes.filter(r => !r.isCompleted).length,
    completedRoutes: routes.filter(r => r.isCompleted).length,
    inProgressRoutes: routes.filter(r => r.status === "in_progress").length
  };

  const zoneStats = {
    totalZones: zones.length,
    averageCoordinates: zones.length 
      ? Math.round(zones.reduce((sum, zone) => sum + zone.coordinates.length, 0) / zones.length) 
      : 0
  };

  // Renderizar el contenido según la pestaña seleccionada
  const renderTabContent = () => {
    switch (selectedTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                title="Zonas Definidas"
                value={zoneStats.totalZones}
                icon={<Target className="h-5 w-5 text-primary" />}
                description="Áreas geográficas configuradas"
              />
              <StatsCard
                title="En Progreso"
                value={routeStats.inProgressRoutes}
                icon={<Activity className="h-5 w-5 text-primary" />}
                description="Rutas actualmente en marcha"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Resumen de zonas */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-medium">Zonas</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTab("zones")}>
                      Ver todas
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>Zonas de distribución configuradas</CardDescription>
                </CardHeader>
                <CardContent>
                  {zones.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <MapPin className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-4">No hay zonas definidas</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsCreatingZone(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Crear nueva zona
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[220px]">
                      <div className="space-y-2">
                        {zones.slice(0, 5).map((zone) => (
                          <div
                            key={zone.id}
                            className="flex items-center justify-between p-2 border rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: zone.color }}
                              />
                              <span className="font-medium">{zone.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewZone(zone)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsCreatingZone(true)}
                    className="w-full"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Crear nueva zona
                  </Button>
                </CardFooter>
              </Card>
              
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedTab("create")}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Crear nueva ruta
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[220px]">
                      <div className="space-y-2">
                        {routes.slice(0, 5).map((route) => (
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
                                
                                {route.zoneId && zones.find(z => z.id === route.zoneId) && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {zones.find(z => z.id === route.zoneId)?.name}
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
                                  ? "En progreso" 
                                  : "Pendiente"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedTab("create")}
                    className="w-full"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Crear nueva ruta
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {/* Acciones rápidas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                    onClick={() => setSelectedTab("create")}
                  >
                    <PlusCircle className="h-5 w-5" />
                    <div className="text-xs sm:text-sm font-medium">Nueva Ruta</div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                    onClick={() => setIsCreatingZone(true)}
                  >
                    <MapPin className="h-5 w-5" />
                    <div className="text-xs sm:text-sm font-medium">Nueva Zona</div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-5 w-5" />
                    <div className="text-xs sm:text-sm font-medium">Actualizar</div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                    onClick={() => setSelectedTab("routes")}
                  >
                    <LayoutGrid className="h-5 w-5" />
                    <div className="text-xs sm:text-sm font-medium">Ver Rutas</div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case "zones":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium">Zonas de Distribución</h2>
                <p className="text-sm text-muted-foreground">Gestiona las áreas geográficas de operación</p>
              </div>
              
              <Button
                variant="default"
                size="sm"
                className="h-9 gap-1"
                onClick={() => setIsCreatingZone(true)}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                <span>{t("createZone")}</span>
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-4">
                <ResponsiveZonesList 
                  zones={zones} 
                  onViewZone={handleViewZone} 
                  onEditZone={handleEditZone} 
                  onDeleteZone={handleDeleteZone} 
                />
              </CardContent>
            </Card>
            
            {isCreatingZone && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-medium">Crear Nueva Zona</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setIsCreatingZone(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    Define un nombre, elige un color y dibuja el área en el mapa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="zone-name">Nombre de la Zona</Label>
                        <Input
                          id="zone-name"
                          value={zoneName}
                          onChange={(e) => setZoneName(e.target.value)}
                          placeholder="Ej: Zona Norte"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zone-color">Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div 
                            className="w-8 h-8 rounded-md"
                            style={{ backgroundColor: zoneColor }}
                          />
                          <Input
                            id="zone-color"
                            type="color"
                            value={zoneColor}
                            onChange={(e) => setZoneColor(e.target.value)}
                            className="w-full h-10"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <ZoneMap
                        onZoneCreated={handleZoneCreated}
                        zoneName={zoneName}
                        zoneColor={zoneColor}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
        
      case "routes":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium">Rutas de Distribución</h2>
                <p className="text-sm text-muted-foreground">Gestiona las rutas de entrega y seguimiento</p>
              </div>
              
              <Button
                variant="default"
                size="sm"
                className="h-9 gap-1"
                onClick={() => setSelectedTab("create")}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                <span>{t("createRoute")}</span>
              </Button>
            </div>
            
            <Card>
              <CardHeader className="pb-2 pt-4">
                <Tabs
                  value={routeStatusTab}
                  onValueChange={(value) => setRouteStatusTab(value as "active" | "completed")}
                  className="w-full"
                >
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="active">
                      <Truck className="h-4 w-4 mr-2" />
                      Rutas Activas
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                      <Check className="h-4 w-4 mr-2" />
                      Rutas Completadas
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">{t("loading")}</span>
                  </div>
                ) : error ? (
                  <div className="text-center text-red-500 py-8">
                    <CircleX className="h-8 w-8 mx-auto mb-2" />
                    <p>{t("errorLoadingRoutes")}</p>
                  </div>
                ) : (
                  <ResponsiveRoutesList
                    routes={routes}
                    zones={zones}
                    isActive={routeStatusTab === "active"}
                  />
                )}
              </CardContent>
              
              <CardFooter className="pt-0 pb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedTab("create")}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Crear nueva ruta
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
        
      case "create":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium">Crear Nueva Ruta</h2>
                <p className="text-sm text-muted-foreground">Define rutas de entrega por zonas o pedidos pendientes</p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setSelectedTab("routes")}
              >
                Cancelar
              </Button>
            </div>
            
            <Card>
              <CardHeader className="pb-2 pt-4">
                <Tabs
                  value={routeCreationMode}
                  onValueChange={(value) => setRouteCreationMode(value as "customers" | "orders")}
                  className="w-full"
                >
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="customers">
                      <User className="h-4 w-4 mr-2" />
                      Por Clientes
                    </TabsTrigger>
                    <TabsTrigger value="orders">
                      <Package className="h-4 w-4 mr-2" />
                      Por Pedidos Pendientes
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent className="p-0 pt-4">
                {routeCreationMode === "customers" ? (
                  <ZoneBasedRouteForm 
                    onRouteCreated={handleRouteCreated} 
                    compact={true}
                  />
                ) : (
                  <PendingOrdersRouteForm onRouteCreated={handleRouteCreated} />
                )}
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("routes")}</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona zonas de distribución y rutas de entrega
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Barra lateral de navegación */}
        <div className="w-full md:w-64 space-y-2">
          <Card>
            <CardContent className="p-3">
              <nav className="flex flex-col space-y-1 -mx-1">
                <Button 
                  variant={selectedTab === "dashboard" ? "default" : "ghost"} 
                  className="justify-start h-10"
                  onClick={() => setSelectedTab("dashboard")}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Panel Principal
                </Button>
                <Button 
                  variant={selectedTab === "zones" ? "default" : "ghost"} 
                  className="justify-start h-10"
                  onClick={() => setSelectedTab("zones")}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Zonas
                </Button>
                <Button 
                  variant={selectedTab === "routes" ? "default" : "ghost"} 
                  className="justify-start h-10"
                  onClick={() => setSelectedTab("routes")}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Rutas
                </Button>
                <Button 
                  variant={selectedTab === "create" ? "default" : "ghost"} 
                  className="justify-start h-10"
                  onClick={() => setSelectedTab("create")}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Nueva Ruta
                </Button>
                <Separator className="my-1" />
                <Button 
                  variant="ghost" 
                  className="justify-start h-10"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </nav>
            </CardContent>
          </Card>
          
          {/* Resumen de estadísticas */}
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Rutas Activas</span>
                  <Badge variant="outline">{routeStats.activeRoutes}</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Rutas Completadas</span>
                  <Badge variant="outline">{routeStats.completedRoutes}</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Zonas</span>
                  <Badge variant="outline">{zoneStats.totalZones}</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">En Progreso</span>
                  <Badge variant="outline">{routeStats.inProgressRoutes}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Contenido principal */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
      
      {/* Modal de vista de zona */}
      <Dialog open={viewZoneDialogOpen} onOpenChange={setViewZoneDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedZone?.name || "Ver zona"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedZone && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedZone.color }}
                />
                <span className="font-medium">{selectedZone.name}</span>
              </div>
              
              <div className="border rounded-md overflow-hidden" style={{ height: "300px" }}>
                <MapContainer
                  center={[19.0, -70.0]}
                  zoom={8}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {selectedZone.coordinates && selectedZone.coordinates.length > 0 && (
                    <Polygon
                      positions={selectedZone.coordinates.map(coord => {
                        const [lat, lng] = coord.split(',').map(parseFloat);
                        return [lat, lng];
                      })}
                      pathOptions={{ color: selectedZone.color }}
                    />
                  )}
                </MapContainer>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Esta zona tiene {selectedZone.coordinates.length} puntos de coordenadas.
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setViewZoneDialogOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setViewZoneDialogOpen(false);
                if (selectedZone) {
                  handleEditZone(selectedZone);
                }
              }}
            >
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edición de zona */}
      <Dialog open={editZoneDialogOpen} onOpenChange={setEditZoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Editar zona
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="zone-name">Nombre de la zona</Label>
              <Input
                id="zone-name"
                value={editZoneName}
                onChange={(e) => setEditZoneName(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="zone-color">Color</Label>
              <div className="flex gap-2 items-center">
                <div
                  className="w-8 h-8 rounded-md"
                  style={{ backgroundColor: editZoneColor }}
                />
                <Input
                  id="zone-color"
                  type="color"
                  value={editZoneColor}
                  onChange={(e) => setEditZoneColor(e.target.value)}
                  className="w-full h-10"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="secondary"
              onClick={() => setEditZoneDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleSaveZone}
              disabled={!editZoneName.trim()}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmación para eliminar zona */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar zona?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La zona {selectedZone?.name} se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
