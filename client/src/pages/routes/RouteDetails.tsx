import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import RouteMap from "@/components/routes/RouteMap";
import RouteStats from "@/components/routes/RouteStats";
import RouteTimeline from "@/components/routes/RouteTimeline";
import RouteSummary from "@/components/routes/RouteSummary";
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";

export default function RouteDetails() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("map");
  
  // Extraer el ID de la ruta de la URL
  const routeId = location.split("/").pop();
  
  // Obtener los datos de la ruta específica
  const { data: route, isLoading, error } = useQuery({
    queryKey: [`/api/routes/${routeId}`],
  });

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/routes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back")}
            </Link>
          </Button>
          <Skeleton className="h-8 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="container py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/routes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back")}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{t("routeDetails")}</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-red-500">
              {t("errorLoadingRoute")}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/routes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {route.name} - ID: {route.id}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("routeDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="map"
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="space-y-4"
          >
            <TabsList className="grid grid-cols-4 w-full md:w-1/2">
              <TabsTrigger value="map">{t("map")}</TabsTrigger>
              <TabsTrigger value="stats">{t("statistics")}</TabsTrigger>
              <TabsTrigger value="timeline">{t("timeline")}</TabsTrigger>
              <TabsTrigger value="details">{t("details")}</TabsTrigger>
            </TabsList>

            <TabsContent value="map">
              <ResponsiveMapContainer>
                <RouteMap route={route} className="h-full w-full min-h-[500px]" />
              </ResponsiveMapContainer>
            </TabsContent>

            <TabsContent value="stats">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("routeStatistics")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RouteStats route={route} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("routeSummary")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RouteSummary route={route} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>{t("deliveryTimeline")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RouteTimeline route={route} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("basicInformation")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">{t("routeName")}</dt>
                        <dd className="text-lg">{route.name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">{t("driver")}</dt>
                        <dd className="text-lg">{route.driverName || "-"}</dd>
                      </div>
                      {route.assistantName && (
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">{t("assistant")}</dt>
                          <dd className="text-lg">{route.assistantName}</dd>
                        </div>
                      )}
                      {route.truckDetails && (
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">{t("truck")}</dt>
                          <dd className="text-lg">{route.truckDetails}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">{t("date")}</dt>
                        <dd className="text-lg">
                          {new Date(route.date).toLocaleDateString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">{t("status")}</dt>
                        <dd className="text-lg">
                          {route.driverStartedAt ? t("inProgress") : t("notStarted")}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>{t("routeMetrics")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">{t("stops")}</dt>
                        <dd className="text-lg">{route.stops?.length || 0}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">{t("totalDistance")}</dt>
                        <dd className="text-lg">
                          {route.totalDistance ? `${Number(route.totalDistance).toFixed(1)} km` : t("calculatingRoute")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">{t("estimatedDuration")}</dt>
                        <dd className="text-lg">
                          {route.estimatedDuration ? `${route.estimatedDuration} min` : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">{t("actualDuration")}</dt>
                        <dd className="text-lg">
                          {route.actualDuration ? `${route.actualDuration} min` : "-"}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}