import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  MapPin, 
  Calendar, 
  PlusCircle, 
  Truck, 
  RefreshCw, 
  X, 
  Edit, 
  Eye, 
  ArrowRight, 
  Search, 
  Route, 
  Clock, 
  CheckCircle, 
  FileText,
  Map,
  ListFilter,
  Users,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoutes } from "@/hooks/use-routes";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteMap from "@/components/routes/RouteMap";
import RouteStats from "@/components/routes/RouteStats";
import RouteTimeline from "@/components/routes/RouteTimeline";
import NewRouteForm from "@/components/routes/NewRouteForm";
import RouteSummary from "@/components/routes/RouteSummary";
import ZoneMap from "./ZoneMap";
import { formatCurrency } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Zone } from "@shared/schema";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

// Vista del chofer
import DriverView from "./DriverView";
import DeliveryTracking from "./DeliveryTracking";
import ZoneBasedRouteForm from "@/components/routes/ZoneBasedRouteForm";

export default function Routes() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { user } = useCurrentUser();
  const { routes, loading, error } = useRoutes();
  const [selectedTab, setSelectedTab] = useState("active");
  const [mainTab, setMainTab] = useState("list");
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener zonas
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });

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
    setIsCreatingRoute(true);
  };

  // When creation is canceled we return to the list
  const handleCancelCreate = () => {
    setIsCreatingRoute(false);
  };

  // When a route is created we return to the list
  const handleRouteCreated = () => {
    setIsCreatingRoute(false);
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

  // Calcular si hay rutas activas
  const hasActiveRoutes = !loading && !error && routes?.some(route => !route.isCompleted);
  
  // Estadísticas para las tarjetas
  const routeStats = useMemo(() => {
    if (loading || error || !routes) return {
      totalActive: 0,
      totalCompleted: 0,
      totalDistance: "0.00",
      totalStops: 0
    };
    
    const activeRoutes = routes.filter(r => !r.isCompleted);
    const completedRoutes = routes.filter(r => r.isCompleted);
    const totalDistance = routes
      .filter(r => r.totalDistance)
      .reduce((sum, r) => sum + Number(r.totalDistance || 0), 0)
      .toFixed(2);
    const totalStops = routes
      .reduce((sum, r) => sum + (r.stops?.length || 0), 0);
      
    return {
      totalActive: activeRoutes.length,
      totalCompleted: completedRoutes.length,
      totalDistance,
      totalStops
    };
  }, [routes, loading, error]);
  
  // Filtrar rutas según la búsqueda y estado
  const filteredRoutes = useMemo(() => {
    if (loading || error || !routes) return [];
    
    return routes.filter(route => {
      // Filtro por término de búsqueda
      const matchesSearch = 
        (route.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        route.id.toString().includes(searchQuery));
      
      // Filtro por estado
      if (statusFilter === "all") return matchesSearch;
      if (statusFilter === "active") return matchesSearch && !route.isCompleted;
      if (statusFilter === "completed") return matchesSearch && route.isCompleted;
      
      return matchesSearch;
    });
  }, [routes, searchQuery, statusFilter, loading, error]);

  if (isCreatingRoute) {
    return (
      <div className="container py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">{t("createRoute")}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleCancelCreate}>
            <X className="h-4 w-4 mr-1" />
            {t("cancel")}
          </Button>
        </div>

        {/* Las cards de estadísticas y el formato moderno están dentro del componente ZoneBasedRouteForm */}
        <ZoneBasedRouteForm 
          onRouteCreated={handleRouteCreated} 
          compact={hasActiveRoutes}
        />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{t("routes")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => {
              window.location.reload();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t("refresh")}</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setIsCreatingZone(true)}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>{t("createZone")}</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1"
            onClick={handleCreateRoute}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>{t("createRoute")}</span>
          </Button>
        </div>
      </div>
      
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Rutas Activas</p>
              <p className="text-xl font-bold mt-1">{routeStats.totalActive}</p>
            </div>
            <Clock className="h-7 w-7 text-blue-500" />
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Rutas Completadas</p>
              <p className="text-xl font-bold mt-1">{routeStats.totalCompleted}</p>
            </div>
            <CheckCircle className="h-7 w-7 text-green-500" />
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Distancia Total</p>
              <p className="text-xl font-bold mt-1">{routeStats.totalDistance} km</p>
            </div>
            <Route className="h-7 w-7 text-yellow-500" />
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Paradas</p>
              <p className="text-xl font-bold mt-1">{routeStats.totalStops}</p>
            </div>
            <MapPin className="h-7 w-7 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Lista de Zonas */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("zones")}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setIsCreatingZone(true)}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>{t("createZone")}</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="font-medium">{zone.name}</span>
                  <Badge variant="outline" title="Cada punto representa una coordenada geográfica que forma el perímetro de la zona">
                    {zone.coordinates.length} {t("points")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => handleViewZone(zone)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-secondary"
                    onClick={() => handleEditZone(zone)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteZone(zone)}
                    disabled={deleteZoneMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {zones.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {t("noZones")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isCreatingZone && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("createZone")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder={t("zoneName")}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <input
                  type="color"
                  value={zoneColor}
                  onChange={(e) => setZoneColor(e.target.value)}
                  className="w-full h-10"
                />
              </div>
              <ZoneMap
                newZoneName={zoneName}
                selectedColor={zoneColor}
                onZoneCreated={handleZoneCreated}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenedor principal con barra de búsqueda, filtros y pestañas */}
      <Card className="bg-card rounded-lg shadow-sm border p-1 mb-6">
        {/* Barra de búsqueda y filtros */}
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-b">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ruta..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full md:w-[180px] h-10">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Rutas activas</SelectItem>
                <SelectItem value="completed">Rutas completadas</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              className="h-10"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              <X className="h-4 w-4 mr-1" /> Limpiar
            </Button>
          </div>
        </div>
        
        {/* Pestañas principales: Lista y Formulario */}
        <Tabs 
          defaultValue="list" 
          value={mainTab}
          onValueChange={setMainTab}
          className="space-y-2"
        >
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Lista de Rutas</TabsTrigger>
              <TabsTrigger value="form">Crear Ruta</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="list" className="p-1 pt-2">
            {/* Subtabs: Activas y Completadas */}
            <Tabs
              defaultValue="active"
              value={selectedTab}
              onValueChange={setSelectedTab}
              className="space-y-4"
            >
              <TabsList className="w-full md:w-auto grid grid-cols-2 max-w-md">
                <TabsTrigger value="active" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Rutas Activas</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Rutas Completadas</span>
                </TabsTrigger>
              </TabsList>

              {/* Contenido de Rutas Activas */}
              <TabsContent value="active" className="space-y-4">
                {loading && <div className="text-center p-8">{t("loading")}</div>}
                {error && (
                  <div className="text-center text-red-500 p-8">
                    {t("errorLoadingRoutes")}
                  </div>
                )}
                {!loading && !error && filteredRoutes.filter(r => !r.isCompleted).length === 0 && (
                  <div className="text-center p-8 flex flex-col items-center justify-center text-muted-foreground">
                    <Route className="h-12 w-12 mb-2 opacity-20" />
                    <p>No se encontraron rutas activas</p>
                    {searchQuery && <p className="text-sm">Prueba con otra búsqueda</p>}
                  </div>
                )}
                {/* Lista de rutas activas */}
                <div className="grid grid-cols-1 gap-4">
                  {!loading &&
                    !error &&
                    filteredRoutes
                      .filter((route) => !route.isCompleted)
                      .map((route) => (
                        <Card key={route.id} className="overflow-hidden hover:bg-accent/5 transition-colors">
                          <div className="flex items-center p-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Truck className="h-5 w-5 text-blue-500" />
                                <span className="font-medium">
                                  {route.name || `Ruta #${route.id}`}
                                </span>
                                <Badge
                                  variant={
                                    route.driverStartedAt ? "secondary" : "outline"
                                  }
                                  className="ml-auto text-xs py-0 h-5"
                                >
                                  {route.driverStartedAt
                                    ? "En progreso"
                                    : "No iniciada"}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
                                <div className="flex items-center text-muted-foreground">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  <span>
                                    {format(new Date(route.date), "dd/MM/yyyy")}
                                  </span>
                                </div>
                                <div className="flex items-center text-muted-foreground">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  <span>
                                    {route.stops?.length || 0} paradas
                                  </span>
                                </div>
                                <div className="flex items-center justify-start md:justify-end text-muted-foreground">
                                  <Route className="h-4 w-4 mr-2" />
                                  <span>
                                    {route.totalDistance
                                      ? `${Number(route.totalDistance).toFixed(1)} km`
                                      : "Calculando..."}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-10 w-10 ml-2 rounded-full"
                            >
                              <Link href={`/routes/${route.id}`}>
                                <ArrowRight className="h-5 w-5" />
                              </Link>
                            </Button>
                          </div>
                        </Card>
                      ))}
                </div>
              </TabsContent>

              {/* Contenido de Rutas Completadas */}
              <TabsContent value="completed" className="space-y-4">
                {loading && <div className="text-center p-8">{t("loading")}</div>}
                {error && (
                  <div className="text-center text-red-500 p-8">
                    {t("errorLoadingRoutes")}
                  </div>
                )}
                {!loading && !error && filteredRoutes.filter(r => r.isCompleted).length === 0 && (
                  <div className="text-center p-8 flex flex-col items-center justify-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mb-2 opacity-20" />
                    <p>No se encontraron rutas completadas</p>
                    {searchQuery && <p className="text-sm">Prueba con otra búsqueda</p>}
                  </div>
                )}
                {/* Lista de rutas completadas */}
                <div className="grid grid-cols-1 gap-4">
                  {!loading &&
                    !error &&
                    filteredRoutes
                      .filter((route) => route.isCompleted)
                      .map((route) => (
                        <Card key={route.id} className="overflow-hidden hover:bg-accent/5 transition-colors">
                          <div className="grid grid-cols-1 md:grid-cols-12">
                            <div className="p-4 md:col-span-4">
                              <div className="flex items-center gap-2 mb-4">
                                <Truck className="h-5 w-5 text-green-500" />
                                <span className="font-medium">
                                  {route.name || `Ruta #${route.id}`}
                                </span>
                                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 hover:bg-green-200">
                                  Completada
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  <span>
                                    {format(new Date(route.date), "dd/MM/yyyy")}
                                  </span>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  <span>
                                    {route.stops?.length || 0} paradas
                                  </span>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Route className="h-4 w-4 mr-2" />
                                  <span>
                                    {route.totalDistance
                                      ? `${Number(route.totalDistance).toFixed(1)} km`
                                      : "Calculando..."}
                                  </span>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4 mr-2" />
                                  <span>
                                    {route.estimatedDuration
                                      ? `${Math.round(route.estimatedDuration / 60)} min`
                                      : "Calculando..."}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="h-8"
                                >
                                  <Link href={`/routes/${route.id}`}>
                                    Ver detalles
                                  </Link>
                                </Button>
                              </div>
                            </div>
                            
                            {!isMobile && (
                              <>
                                <div className="md:col-span-4 border-l border-t md:border-t-0">
                                  <RouteMap
                                    route={route}
                                    className="h-full w-full min-h-[200px]"
                                  />
                                </div>
                                <div className="p-4 md:col-span-4 border-l border-t md:border-t-0">
                                  <h4 className="text-sm font-medium mb-2">Progreso</h4>
                                  <RouteTimeline route={route} />
                                </div>
                              </>
                            )}
                          </div>
                        </Card>
                      ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="form" className="space-y-4 p-4">
            <ZoneBasedRouteForm
              onRouteCreated={() => setMainTab("list")}
              compact={true}
            />
          </TabsContent>
        </Tabs>
      </Card>
      
      {/* Modal para ver detalles de zona */}
      <Dialog open={viewZoneDialogOpen} onOpenChange={setViewZoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la Zona</DialogTitle>
          </DialogHeader>
          {selectedZone && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: selectedZone.color }}
                />
                <span className="text-lg font-bold">{selectedZone.name}</span>
              </div>
              
              {/* Mapa primero para darle mayor importancia visual */}
              <div className="border rounded overflow-hidden mb-3 h-[200px]">
                {typeof window !== 'undefined' && (
                  <MapContainer
                    style={{ height: '100%', width: '100%' }}
                    center={(() => {
                      // Calcular el centro del polígono
                      if (selectedZone.coordinates.length > 0) {
                        const points = selectedZone.coordinates.map(coord => {
                          const [lat, lng] = coord.split(',').map(parseFloat);
                          return [lat, lng];
                        });
                        
                        // Calcular el centro como promedio de puntos
                        const latSum = points.reduce((sum, point) => sum + point[0], 0);
                        const lngSum = points.reduce((sum, point) => sum + point[1], 0);
                        return [latSum / points.length, lngSum / points.length];
                      }
                      return [19.075380, -70.128822]; // Default
                    })()}
                    zoom={12}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {/* Dibuja el polígono de la zona */}
                    <Polygon
                      positions={selectedZone.coordinates.map(coord => {
                        const [lat, lng] = coord.split(',').map(parseFloat);
                        return [lat, lng];
                      })}
                      pathOptions={{ color: selectedZone.color, fillOpacity: 0.2 }}
                    />
                  </MapContainer>
                )}
              </div>
              
              {/* Información adicional en formato compacto */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs">Fecha de creación</Label>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedZone.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Número de puntos</Label>
                  <p className="text-xs font-medium">{selectedZone.coordinates.length} puntos</p>
                </div>
              </div>
              
              <div>
                <Label className="text-xs">Coordenadas</Label>
                <div className="text-xs mt-1 bg-slate-50 p-2 rounded max-h-32 overflow-y-auto">
                  {selectedZone.coordinates.map((coord, index) => (
                    <div key={index} className="mb-1 text-[10px]">
                      Punto {index + 1}: {coord}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para editar zona */}
      <Dialog open={editZoneDialogOpen} onOpenChange={setEditZoneDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Editar Zona</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="zone-name" className="text-sm">Nombre de la zona</Label>
              <Input
                id="zone-name"
                value={editZoneName}
                onChange={(e) => setEditZoneName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="zone-color" className="text-sm">Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="zone-color"
                  type="color"
                  value={editZoneColor}
                  onChange={(e) => setEditZoneColor(e.target.value)}
                  className="h-8 w-20"
                />
                <div 
                  className="w-full h-8 rounded border"
                  style={{ backgroundColor: editZoneColor }}
                />
              </div>
            </div>
            {selectedZone && (
              <div className="pt-1">
                <Label className="text-sm">Número de puntos</Label>
                <p className="text-sm">{selectedZone.coordinates.length} puntos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Las coordenadas no pueden ser modificadas. Para cambiar el área de la zona, crea una nueva.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditZoneDialogOpen(false)} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveZone} disabled={updateZoneMutation.isPending} className="h-8 text-xs">
              {updateZoneMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar zona */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Esta acción no se puede deshacer. Eliminarás permanentemente la zona
              <strong> {selectedZone?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-8 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 h-8 text-xs"
              disabled={deleteZoneMutation.isPending}
            >
              {deleteZoneMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}