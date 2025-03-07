import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { MapPin, Calendar, PlusCircle, Truck, RefreshCw, X } from "lucide-react";
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

// Vista del chofer
import DriverView from "./DriverView";
import DeliveryTracking from "./DeliveryTracking";

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
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener zonas
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });

  const isDriver = user?.role === "driver";
  const isAssistant = user?.role === "assistant";

  // La interfaz del conductor muestra el estado actual y próximas entregas
  if (isDriver) {
    return <DriverView />;
  }

  // Asistentes de entrega ven el seguimiento de pedidos
  if (isAssistant) {
    return <DeliveryTracking />;
  }

  // When a zone is created successfully
  const handleZoneCreated = () => {
    setIsCreatingZone(false);
    setZoneName("");
  };

  // Click handler para el botón de crear ruta
  const handleCreateRoute = () => {
    setIsCreatingRoute(true);
  };

  // Cuando se cancela la creación volvemos al listado
  const handleCancelCreate = () => {
    setIsCreatingRoute(false);
  };

  // Cuando se crea una ruta volvemos al listado
  const handleRouteCreated = () => {
    setIsCreatingRoute(false);
  };

  // Mutación para eliminar zona
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

  // Handler para eliminar zona
  const handleDeleteZone = (zoneId: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta zona?')) {
      deleteZoneMutation.mutate(zoneId);
    }
  };

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
            <NewRouteForm onRouteCreated={handleRouteCreated} />
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
                  <Badge variant="outline">
                    {zone.coordinates.length} puntos
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteZone(zone.id)}
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
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    <div className="p-6">
                      <CardTitle className="mb-4 flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        <span>
                          {t("route")} #{route.id}
                        </span>
                        <Badge
                          variant={
                            route.driverStartedAt ? "secondary" : "outline"
                          }
                          className="ml-2"
                        >
                          {route.driverStartedAt
                            ? t("inProgress")
                            : t("notStarted")}
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

                      <RouteSummary route={route} className="mt-4" />

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
    </div>
  );
}