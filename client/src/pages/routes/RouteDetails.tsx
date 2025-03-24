import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ChevronLeft, Milestone, Timer, Map as MapIcon, LineChart, Route as RouteIcon } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import RouteMap from "@/components/routes/RouteMap";
import RouteStats from "@/components/routes/RouteStats";
import RouteTimeline from "@/components/routes/RouteTimeline";
import RouteSummary from "@/components/routes/RouteSummary";

// Define la interfaz para la ruta con información extendida
// Interfaz para adaptar los tipos esperados por los componentes
interface RouteComponent {
  id: number;
  name: string;
  driverId: number;
  assistantId: number | null;
  truckId: number | null;
  zoneId: number | null;
  isCompleted: boolean;
  date: Date;
  status: "pending" | "in_progress" | "completed";
  currentLocation: string | null;
  lastUpdate: Date | null;
  deliverySequence: string[] | null;
  estimatedDuration: number | null;
  actualDuration: number | null;
  totalDistance: string | null;
  completion: number | null;
  orderUpdates: string[] | null;
  stops: string[] | null;
  driverStartedAt: Date | null;
  driverCompletedAt: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  totalRevenue: string | null;
}

// Función adaptadora para convertir los tipos
function adaptRouteForComponent(route: RouteDetails): RouteComponent {
  return {
    ...route,
    totalRevenue: route.totalRevenue || "0.00",
    totalDistance: route.totalDistance ? String(route.totalDistance) : null,
  };
}

interface RouteDetails {
  id: number;
  name: string;
  driverId: number;
  driverName?: string;
  assistantId: number | null;
  assistantName?: string | null;
  truckId: number | null;
  truckDetails?: string | null;
  zoneId: number | null;
  isCompleted: boolean;
  date: Date;
  status: "pending" | "in_progress" | "completed";
  currentLocation: string | null;
  lastUpdate: Date | null;
  deliverySequence: string[] | null; // Cambiado de number[] para compatibilidad
  estimatedDuration: number | null;
  actualDuration: number | null;
  totalDistance: number | null;
  completion: number | null;
  orderUpdates: string[] | null;
  stops: string[] | null;
  driverStartedAt: Date | null;
  driverCompletedAt: Date | null;
  // Campos adicionales que necesitan los componentes
  startTime: Date | null;
  endTime: Date | null;
  totalRevenue: string | null;
}

export default function RouteDetails() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const routeId = parseInt(id || "0");
  const [activeTab, setActiveTab] = useState("map");
  
  // Redireccionar si el ID no es válido
  useEffect(() => {
    if (!id || isNaN(routeId) || routeId <= 0) {
      setLocation("/routes");
    }
  }, [id, routeId, setLocation]);

  // Consultar detalles de la ruta
  const { data: route, isLoading, error } = useQuery<RouteDetails>({
    queryKey: ["/api/routes", routeId],
    queryFn: async () => {
      const response = await fetch(`/api/routes/${routeId}`);
      if (!response.ok) {
        throw new Error("Error al cargar los detalles de la ruta");
      }
      const data = await response.json();
      // Convertir deliverySequence a string[] si viene como number[]
      let formattedData = { ...data };
      if (Array.isArray(data.deliverySequence)) {
        formattedData.deliverySequence = data.deliverySequence.map(String);
      }

      return {
        ...formattedData,
        date: new Date(data.date),
        lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : null,
        driverStartedAt: data.driverStartedAt ? new Date(data.driverStartedAt) : null,
        driverCompletedAt: data.driverCompletedAt ? new Date(data.driverCompletedAt) : null,
        // Campos adicionales necesarios para los componentes
        startTime: data.driverStartedAt ? new Date(data.driverStartedAt) : null,
        endTime: data.driverCompletedAt ? new Date(data.driverCompletedAt) : null,
        // Asegurar que totalRevenue nunca es undefined
        totalRevenue: "0.00",
      };
    },
    enabled: routeId > 0,
  });

  // Renderizar estado de carga
  if (isLoading) {
    return (
      <div className="container p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Renderizar error
  if (error || !route) {
    return (
      <div className="container p-4">
        <Card className="p-6">
          <CardTitle className="text-xl mb-2">{t("error")}</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : t("errorLoadingRoute")}
          </CardDescription>
          <Button 
            variant="secondary" 
            onClick={() => setLocation("/routes")}
            className="mt-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
        </Card>
      </div>
    );
  }

  // Función para mostrar el estado con el color adecuado
  const getStatusBadge = () => {
    switch (route.status) {
      case "in_progress":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">{t("inProgress")}</Badge>;
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">{t("completed")}</Badge>;
      default:
        return <Badge variant="secondary">{t("notStarted")}</Badge>;
    }
  };

  return (
    <div className="container p-4">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{route.name} <span className="text-lg text-muted-foreground">#{route.id}</span></h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RouteIcon className="h-4 w-4" />
            <span>{t("driver")}: <strong>{route.driverName || "-"}</strong></span>
            {route.assistantName && (
              <>
                <span>•</span>
                <span>{t("assistant")}: <strong>{route.assistantName}</strong></span>
              </>
            )}
            {route.truckDetails && (
              <>
                <span>•</span>
                <span>{t("vehicle")}: <strong>{route.truckDetails}</strong></span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Milestone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {format(new Date(route.date), "dd/MM/yyyy")}
            </span>
            <span className="ml-2">{getStatusBadge()}</span>
            {route.driverStartedAt && (
              <span className="text-xs text-muted-foreground ml-2">
                {t("started")}: {format(new Date(route.driverStartedAt), "HH:mm")}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/routes">
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Link>
        </Button>
      </div>
      
      {/* Pestañas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="map" className="gap-2">
            <MapIcon className="h-4 w-4" />
            <span>{t("map")}</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <LineChart className="h-4 w-4" />
            <span>{t("statistics")}</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <Timer className="h-4 w-4" />
            <span>{t("timeline")}</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Contenido de Mapa */}
        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("map")}</CardTitle>
              <CardDescription>
                {route.stops?.length 
                  ? t("stops") + ": " + route.stops.length
                  : t("noStopsPlanned")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RouteMap 
                route={adaptRouteForComponent(route)} 
                className="h-[60vh]" 
              />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("totalDistance")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {route.totalDistance ? `${(route.totalDistance / 1000).toFixed(2)} km` : '-'}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("estimatedDuration")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {route.estimatedDuration 
                    ? `${Math.floor(route.estimatedDuration / 60)}h ${route.estimatedDuration % 60}m` 
                    : '-'}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("actualDuration")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {route.actualDuration 
                    ? `${Math.floor(route.actualDuration / 60)}h ${route.actualDuration % 60}m` 
                    : '-'}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Contenido de Estadísticas */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("routeStatistics")}</CardTitle>
            </CardHeader>
            <CardContent>
              <RouteStats 
                route={adaptRouteForComponent(route)} 
                className="h-[40vh]" 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Contenido de Línea de Tiempo */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("deliveryTimeline")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RouteTimeline 
                    route={adaptRouteForComponent(route)} 
                    className="h-[50vh]" 
                  />
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{t("routeSummary")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RouteSummary
                    route={adaptRouteForComponent(route)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}