import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { MapPin, Calendar, PlusCircle, Truck, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoutes } from "@/hooks/use-routes";
import { Badge } from "@/components/ui/badge";
import RouteMap from "@/components/routes/RouteMap";
import RouteStats from "@/components/routes/RouteStats";
import RouteTimeline from "@/components/routes/RouteTimeline";
import NewRouteForm from "@/components/routes/NewRouteForm";
import RouteSummary from "@/components/routes/RouteSummary";
import RouteOptimizer from "./RouteOptimizer"; // Added import
import { formatCurrency } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
            onClick={handleCreateRoute}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>{t("createRoute")}</span>
          </Button>
        </div>
      </div>

      <RouteOptimizer /> {/* Added RouteOptimizer component */}

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
                                ? `${route.totalDistance.toFixed(1)} km`
                                : t("calculatingRoute")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("orders")}
                          </p>
                          <p className="font-medium">{route.stops?.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("revenue")}
                          </p>
                          <p className="font-medium">
                            {formatCurrency(route.totalRevenue || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("time")}
                          </p>
                          <p className="font-medium">
                            {route.estimatedDuration
                              ? `${Math.round(route.estimatedDuration / 60)} min`
                              : "-"}
                          </p>
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
                        <Badge variant="success" className="ml-2">
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
                                ? `${route.totalDistance.toFixed(1)} km`
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