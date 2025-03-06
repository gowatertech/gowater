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
import { formatCurrency } from "@/lib/format";
import useMediaQuery from "@/hooks/use-media-query";
import { useIsMobile } from "@/hooks/use-mobile";

// Vista del chofer
import DriverView from "./DriverView";
import DeliveryTracking from "./DeliveryTracking";

// Usando el hook importado
const isMobile = useIsMobile();

export default function Routes() {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const { user } = useCurrentUser();
  const { routes, loading, error } = useRoutes();
  const [selectedTab, setSelectedTab] = useState("active");
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);


  const isDriver = user?.role === "driver";
  const isAssistant = user?.role === "assistant";

  // Si es un chofer, mostrar vista especializada
  if (isDriver || isAssistant) {
    return <DriverView />;
  }

  const activeRoutes = routes?.filter(
    (route) => route.status === "in_progress" || route.status === "pending"
  );
  const completedRoutes = routes?.filter(
    (route) => route.status === "completed"
  );

  const handleCreateRoute = () => {
    setIsCreatingRoute(true);
  };

  const handleCancelCreate = () => {
    setIsCreatingRoute(false);
  };

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

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="mb-4 flex justify-between">
          <TabsList>
            <TabsTrigger value="active">
              {t("active")}{" "}
              {activeRoutes && activeRoutes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeRoutes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              {t("completed")}{" "}
              {completedRoutes && completedRoutes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {completedRoutes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="m-0">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-[200px] animate-pulse bg-muted"></div>
                  <CardHeader>
                    <div className="h-5 w-1/2 animate-pulse rounded bg-muted"></div>
                    <div className="h-4 w-1/3 animate-pulse rounded bg-muted"></div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : activeRoutes && activeRoutes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeRoutes.map((route) => (
                <Link key={route.id} href={`/routes/${route.id}`}>
                  <Card className="overflow-hidden hover:shadow-md">
                    <div className="relative h-[200px] bg-muted">
                      <RouteMap
                        routeId={route.id}
                        interactive={false}
                        hideControls
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{route.name}</span>
                        <Badge
                          variant={
                            route.status === "pending"
                              ? "outline"
                              : route.status === "in_progress"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {t(route.status)}
                        </Badge>
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {format(new Date(route.date), "dd/MM/yyyy")}
                          </span>
                          {route.startTime && (
                            <span>
                              {format(new Date(route.startTime), "HH:mm")}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <RouteSummary route={route} />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Truck className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {t("noActiveRoutes")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("createRoutePrompt")}
              </p>
              <Button
                onClick={handleCreateRoute}
                className="mt-4"
                variant="outline"
              >
                {t("createRoute")}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="m-0">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-[200px] animate-pulse bg-muted"></div>
                  <CardHeader>
                    <div className="h-5 w-1/2 animate-pulse rounded bg-muted"></div>
                    <div className="h-4 w-1/3 animate-pulse rounded bg-muted"></div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : completedRoutes && completedRoutes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedRoutes.map((route) => (
                <Link key={route.id} href={`/routes/${route.id}`}>
                  <Card className="overflow-hidden hover:shadow-md">
                    <div className="relative h-[200px] bg-muted">
                      <RouteMap
                        routeId={route.id}
                        interactive={false}
                        hideControls
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{route.name}</span>
                        <Badge variant="secondary">{t(route.status)}</Badge>
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {format(new Date(route.date), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <RouteSummary route={route} />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Truck className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {t("noCompletedRoutes")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("noCompletedRoutesDescription")}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}