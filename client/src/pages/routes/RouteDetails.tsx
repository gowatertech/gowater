import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Calendar, User, Truck, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { getStatusLabel, getStatusColor } from "@/lib/status-colors";

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
  zoneName?: string | null;
  isCompleted: boolean;
  date: Date;
  status: "pending" | "in_progress" | "completed";
  stops: string[] | null;
  totalDistance: number | null;
  driverStartedAt: Date | null;
  driverCompletedAt: Date | null;
  comments: string | null;
}

export default function RouteDetails() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const routeId = parseInt(id || "0");
  
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

      return {
        ...data,
        date: new Date(data.date),
        driverStartedAt: data.driverStartedAt ? new Date(data.driverStartedAt) : null,
        driverCompletedAt: data.driverCompletedAt ? new Date(data.driverCompletedAt) : null,
      };
    },
    enabled: routeId > 0,
  });

  // Estado de carga
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error
  if (error || !route) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive mb-4">
              {error instanceof Error ? error.message : "Error al cargar la ruta"}
            </p>
            <Button variant="outline" asChild>
              <Link href="/routes">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{route.name}</h1>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(route.status)}>
              {getStatusLabel(route.status)}
            </Badge>
            <span className="text-muted-foreground">ID: #{route.id}</span>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/routes">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>

      {/* Información principal */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fecha */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-semibold">
                  {format(new Date(route.date), 'dd/MM/yyyy', { locale: es })}
                </p>
              </div>
            </div>

            {/* Conductor */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conductor</p>
                <p className="font-semibold">{route.driverName || `ID: ${route.driverId}`}</p>
              </div>
            </div>

            {/* Asistente */}
            {route.assistantId && (
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Asistente</p>
                  <p className="font-semibold">{route.assistantName || `ID: ${route.assistantId}`}</p>
                </div>
              </div>
            )}

            {/* Vehículo */}
            {route.truckId && (
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehículo</p>
                  <p className="font-semibold">{route.truckDetails || `ID: ${route.truckId}`}</p>
                </div>
              </div>
            )}

            {/* Paradas */}
            {route.stops && route.stops.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paradas</p>
                  <p className="font-semibold">{route.stops.length} paradas</p>
                </div>
              </div>
            )}

            {/* Distancia */}
            {route.totalDistance && (
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Distancia Total</p>
                  <p className="font-semibold">{route.totalDistance} km</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tiempos */}
      {(route.driverStartedAt || route.driverCompletedAt) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Tiempos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {route.driverStartedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Inicio</p>
                  <p className="font-semibold">
                    {format(new Date(route.driverStartedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
              )}
              {route.driverCompletedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Finalización</p>
                  <p className="font-semibold">
                    {format(new Date(route.driverCompletedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comentarios */}
      {route.comments && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Comentarios</h3>
            <p className="text-muted-foreground">{route.comments}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
