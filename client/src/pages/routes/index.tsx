import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { MapPin, Calendar, PlusCircle, Truck, RefreshCw, X, Edit, Eye, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";

// Vista del chofer (GoWater Driver)
import DriverView from "@/pages/drivers/DriverView";
import DeliveryTracking from "./DeliveryTracking";
import ZoneBasedRouteForm from "@/components/routes/ZoneBasedRouteForm";

export default function Routes() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { user } = useCurrentUser();
  const { routes, loading, error } = useRoutes();
  const [selectedTab, setSelectedTab] = useState("active");
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

  if (isCreatingRoute) {
    return (
      <div className="container py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("createRoute")}
          </h1>
          <Button variant="outline" onClick={handleCancelCreate}>
            {t("cancel")}
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            {/* Pasamos la prop compact si hay rutas activas */}
            <ZoneBasedRouteForm 
              onRouteCreated={handleRouteCreated} 
              compact={hasActiveRoutes}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("routes")}</h1>
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

      <Tabs
        defaultValue="active"
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="active">{t("activeRoutes")}</TabsTrigger>
          <TabsTrigger value="completed">{t("completedRoutes")}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {loading && <div className="text-center">{t("loading")}</div>}
          {error && (
            <div className="text-center text-red-500">
              {t("errorLoadingRoutes")}
            </div>
          )}
          {!loading && !error && routes?.length === 0 && (
            <div className="text-center">{t("noActiveRoutes")}</div>
          )}
          {!loading &&
            !error &&
            routes
              ?.filter((route) => !route.isCompleted)
              .map((route) => (
                <Card key={route.id} className="overflow-hidden">
                  <div className="flex items-center p-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          {route.name || `Ruta #${route.id}`}
                        </span>
                        <Badge
                          variant={
                            route.driverStartedAt ? "secondary" : "outline"
                          }
                          className="ml-auto text-xs py-0 h-5"
                        >
                          {route.driverStartedAt
                            ? t("inProgress")
                            : t("notStarted")}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 text-muted-foreground mr-1" />
                          <span className="text-muted-foreground">
                            {format(new Date(route.date), "dd/MM/yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 text-muted-foreground mr-1" />
                          <span className="text-muted-foreground">
                            {route.stops?.length} paradas
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          {route.totalDistance
                            ? `${Number(route.totalDistance).toFixed(1)} km`
                            : "Calculando..."}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 ml-2"
                    >
                      <Link href={`/routes/${route.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {loading && <div className="text-center">{t("loading")}</div>}
          {error && (
            <div className="text-center text-red-500">
              {t("errorLoadingRoutes")}
            </div>
          )}
          {!loading && !error && routes?.length === 0 && (
            <div className="text-center">{t("noCompletedRoutes")}</div>
          )}
          {!loading &&
            !error &&
            routes
              ?.filter((route) => route.isCompleted)
              .map((route) => (
                <Card key={route.id} className="overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    <div className="p-6">
                      <CardTitle className="mb-4 flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        <span>
                          {t("route")} #{route.id}
                        </span>
                        <Badge variant="default" className="ml-2 bg-green-500 text-white">
                          {t("completed")}
                        </Badge>
                      </CardTitle>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(route.date), "MMMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {route.stops?.length} {t("stops")}
                            </p>
                            <p className="text-muted-foreground">
                              {route.totalDistance
                                ? `${Number(route.totalDistance).toFixed(1)} km`
                                : t("calculatingRoute")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <RouteStats route={route} className="mt-4" />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8"
                        >
                          <Link href={`/routes/${route.id}`}>
                            {t("viewDetails")}
                          </Link>
                        </Button>
                      </div>
                    </div>
                    {!isMobile && (
                      <>
                        <div className="border-l">
                          <RouteMap
                            route={route}
                            className="h-full w-full min-h-[250px]"
                          />
                        </div>
                        <div className="border-l p-6">
                          <RouteTimeline route={route} />
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              ))}
        </TabsContent>
      </Tabs>
      
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