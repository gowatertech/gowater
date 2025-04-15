import React from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Componentes UI
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Iconos
import { Truck, Calendar, MapPin, Eye, ArrowRight, X, Route as RouteIcon } from "lucide-react";

// Tipos
import { Zone, Route } from "@shared/schema";

interface ResponsiveRoutesListProps {
  routes: Route[];
  isActive?: boolean; // si es true, solo muestra rutas activas, si es false, completadas
}

export function ResponsiveRoutesList({ routes, isActive = true }: ResponsiveRoutesListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filtrar rutas según el tipo (activas o completadas)
  const filteredRoutes = routes.filter(route => isActive ? !route.isCompleted : route.isCompleted);

  // Manejar eliminación de ruta
  const handleDeleteRoute = (routeId: number) => {
    if (confirm(t("confirmDeleteRoute"))) {
      fetch(`/api/routes/${routeId}`, {
        method: 'DELETE',
      })
      .then(response => {
        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
          toast({
            description: t("routeDeletedSuccessfully"),
          });
        } else {
          throw new Error(t("errorDeletingRoute"));
        }
      })
      .catch(error => {
        toast({
          variant: "destructive",
          title: t("error"),
          description: error.message
        });
      });
    }
  };

  if (filteredRoutes.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        {isActive ? t("noActiveRoutes") : t("noCompletedRoutes")}
      </div>
    );
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <ScrollArea className="max-h-[calc(100vh-400px)]">
      {/* Vista para móviles (tarjetas) */}
      <div className="block md:hidden space-y-3">
        {filteredRoutes.map(route => (
          <Card key={route.id} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {route.name || `Ruta #${route.id}`}
                </span>
              </div>
              <Badge
                variant={route.driverStartedAt ? (route.isCompleted ? "default" : "secondary") : "outline"}
                className="text-xs py-0 h-5"
              >
                {route.isCompleted 
                  ? t("completed") 
                  : (route.driverStartedAt ? t("inProgress") : t("notStarted"))}
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              <Calendar className="h-3 w-3 inline mr-1" />
              {formatDate(route.date)}
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              {route.zoneId && (
                <div className="flex items-center">
                  <MapPin className="h-3 w-3 text-muted-foreground mr-1" />
                  <span className="text-muted-foreground">
                    {zones.find(z => z.id === route.zoneId)?.name || "Zona"}
                  </span>
                </div>
              )}
              
              {route.stops && (
                <div className="flex items-center">
                  <RouteIcon className="h-3 w-3 text-muted-foreground mr-1" />
                  <span className="text-muted-foreground">
                    {route.stops.length} paradas
                  </span>
                </div>
              )}
              
              {route.totalDistance && (
                <div className="flex items-center">
                  <RouteIcon className="h-3 w-3 text-muted-foreground mr-1" />
                  <span className="text-muted-foreground">
                    {Number(route.totalDistance).toFixed(1)} km
                  </span>
                </div>
              )}
              
              {route.driverId && (
                <div className="flex items-center">
                  <Truck className="h-3 w-3 text-muted-foreground mr-1" />
                  <span className="text-muted-foreground">
                    Conductor #{route.driverId}
                  </span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs h-8 col-span-2"
              >
                <Link href={`/routes/${route.id}`}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Ver detalles
                </Link>
              </Button>
              {!route.isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteRoute(route.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      
      {/* Vista para tablet/desktop (tabla) */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">{t("ID")}</TableHead>
              <TableHead>{t("Nombre")}</TableHead>
              <TableHead>{t("Fecha")}</TableHead>
              <TableHead>{t("Zona")}</TableHead>
              <TableHead className="text-center">{t("Paradas")}</TableHead>
              <TableHead className="text-center">{t("Distancia")}</TableHead>
              <TableHead className="text-center">{t("Estado")}</TableHead>
              <TableHead className="text-center">{t("Acciones")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoutes.map(route => (
              <TableRow key={route.id}>
                <TableCell className="font-medium">#{route.id}</TableCell>
                <TableCell>{route.name || `-`}</TableCell>
                <TableCell>{formatDate(route.date)}</TableCell>
                <TableCell>
                  {route.zoneId ? (
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ 
                          backgroundColor: zones.find(z => z.id === route.zoneId)?.color || '#ccc' 
                        }}
                      />
                      <span>{zones.find(z => z.id === route.zoneId)?.name || "-"}</span>
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-center">
                  {route.stops ? route.stops.length : "-"}
                </TableCell>
                <TableCell className="text-center">
                  {route.totalDistance 
                    ? `${Number(route.totalDistance).toFixed(1)} km` 
                    : "-"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={route.driverStartedAt 
                      ? (route.isCompleted ? "default" : "secondary") 
                      : "outline"}
                    className="text-xs py-0 h-5"
                  >
                    {route.isCompleted 
                      ? t("completed") 
                      : (route.driverStartedAt ? t("inProgress") : t("notStarted"))}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-muted-foreground hover:text-primary h-8 px-2"
                    >
                      <Link href={`/routes/${route.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    {!route.isCompleted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive h-8 px-2"
                        onClick={() => handleDeleteRoute(route.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}