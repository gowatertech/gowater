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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

// Map components
import { MapContainer, TileLayer, Polygon } from "react-leaflet";
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

export default function RoutesPage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedTab, setSelectedTab] = useState<"active" | "completed">("active");
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
  
  // Para el nuevo diseño de pestañas
  const [mainTab, setMainTab] = useState("refresh");

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

  // Estado para modo de creación de ruta
  const [routeCreationMode, setRouteCreationMode] = useState<"customers" | "orders">("customers");

  if (isCreatingRoute) {
    return (
      <div className="container py-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight mb-1">
              {t("createRoute")}
            </h1>
            <div className="flex space-x-1">
              <Button 
                variant={routeCreationMode === "customers" ? "default" : "outline"} 
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setRouteCreationMode("customers")}
              >
                <User className="h-3 w-3 mr-1" />
                Por Clientes
              </Button>
              <Button 
                variant={routeCreationMode === "orders" ? "default" : "outline"} 
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setRouteCreationMode("orders")}
              >
                <Package className="h-3 w-3 mr-1" />
                Por Pedidos Pendientes
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleCancelCreate}>
            {t("cancel")}
          </Button>
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {/* Mostramos el formulario según el modo seleccionado */}
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
  }

  return (
    <div className="container py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("routes")}</h1>
      </div>

      {/* Pestañas principales */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="refresh" className="gap-1" onClick={() => window.location.reload()}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t("refresh")}</span>
            </TabsTrigger>
            <TabsTrigger value="zones">
              <span>{t("zones")}</span>
            </TabsTrigger>
            <TabsTrigger value="routes">
              <span>{t("routes")}</span>
            </TabsTrigger>
          </TabsList>
          <div>
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

        {/* Pestaña Refresh - Contenido por defecto */}
        <TabsContent value="refresh" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Control Panel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{t("refreshData")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => setIsCreatingZone(true)}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{t("createZone")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={handleCreateRoute}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>{t("createRoute")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña Zonas */}
        <TabsContent value="zones" className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium">{t("zonesList")}</h2>
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1"
              onClick={() => setIsCreatingZone(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" />
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
        </TabsContent>

        {/* Pestaña Rutas */}
        <TabsContent value="routes" className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <Tabs
              value={selectedTab}
              onValueChange={setSelectedTab as any}
              className="w-full"
            >
              <TabsList className="w-full justify-start">
                <TabsTrigger value="active">{t("activeRoutes")}</TabsTrigger>
                <TabsTrigger value="completed">{t("completedRoutes")}</TabsTrigger>
                <TabsTrigger value="create" onClick={handleCreateRoute} className="ml-auto">
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  {t("createRoute")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Lista de rutas */}
          <div className="space-y-4">
            {selectedTab === "active" && (
              <div>
                {loading && <div className="text-center">{t("loading")}</div>}
                {error && (
                  <div className="text-center text-red-500">
                    {t("errorLoadingRoutes")}
                  </div>
                )}
                
                {!loading && !error && routes && (
                  <ResponsiveRoutesList
                    routes={routes}
                    zones={zones}
                    isActive={true}
                  />
                )}
              </div>
            )}
            
            {selectedTab === "completed" && (
              <div>
                {loading && <div className="text-center">{t("loading")}</div>}
                {error && (
                  <div className="text-center text-red-500">
                    {t("errorLoadingRoutes")}
                  </div>
                )}
                
                {!loading && !error && routes && (
                  <ResponsiveRoutesList
                    routes={routes}
                    zones={zones}
                    isActive={false}
                  />
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Formulario de creación de zona */}
      {isCreatingZone && (
        <Card className="mb-6 mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("createZone")}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsCreatingZone(false)}
            >
              <X className="h-4 w-4" />
            </Button>
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
              
              {/* Mapa para visualizar la zona */}
              <div className="border rounded overflow-hidden mb-3 h-[200px]">
                {typeof window !== 'undefined' && (
                  <MapContainer
                    style={{ height: '100%', width: '100%' }}
                    center={(() => {
                      if (selectedZone.coordinates.length > 0) {
                        const points = selectedZone.coordinates.map(coord => {
                          const [lat, lng] = coord.split(',').map(parseFloat);
                          return [lat, lng];
                        });
                        const latSum = points.reduce((sum, point) => sum + point[0], 0);
                        const lngSum = points.reduce((sum, point) => sum + point[1], 0);
                        return [latSum / points.length, lngSum / points.length];
                      }
                      return [19.075380, -70.128822];
                    })()}
                    zoom={12}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
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
              
              {/* Información básica */}
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
              
              {/* Coordenadas */}
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