import React from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Componentes UI
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Iconos
import { Truck, Calendar, MapPin, Eye, ArrowRight, X } from "lucide-react";

// Tipos
import { Zone, Route } from "@shared/schema";

interface ResponsiveRoutesListProps {
  routes: Route[];
  zones: Zone[];
  isActive?: boolean; // si es true, solo muestra rutas activas, si es false, completadas
}

export function ResponsiveRoutesList({ routes, zones, isActive = true }: ResponsiveRoutesListProps) {
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
      <div className="text-center py-6">
        {isActive ? t("noActiveRoutes") : t("noCompletedRoutes")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Vista para móviles (tarjetas) */}
      {filteredRoutes.map(route => (
        <Card key={route.id} className="block md:hidden p-3">
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
          
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 text-muted-foreground mr-1" />
              <span className="text-muted-foreground">
                {format(new Date(route.date), "dd/MM/yyyy")}
              </span>
            </div>
            
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
                <MapPin className="h-3 w-3 text-muted-foreground mr-1" />
                <span className="text-muted-foreground">
                  {route.stops.length} paradas
                </span>
              </div>
            )}
            
            {route.totalDistance && (
              <div className="flex items-center">
                <MapPin className="h-3 w-3 text-muted-foreground mr-1" />
                <span className="text-muted-foreground">
                  {Number(route.totalDistance).toFixed(1)} km
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
                <X className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
            )}
          </div>
        </Card>
      ))}
      
      {/* Vista para tablet/desktop (filas) */}
      {filteredRoutes.map(route => (
        <div
          key={route.id}
          className="hidden md:flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Truck className="h-4 w-4" />
            <span className="font-medium">
              {route.name || `Ruta #${route.id}`}
            </span>
            <Badge
              variant={route.driverStartedAt ? (route.isCompleted ? "default" : "secondary") : "outline"}
              className="text-xs py-0 h-5"
            >
              {route.isCompleted 
                ? t("completed") 
                : (route.driverStartedAt ? t("inProgress") : t("notStarted"))}
            </Badge>
            
            <div className="flex items-center ml-4 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{format(new Date(route.date), "dd/MM/yyyy")}</span>
            </div>
            
            {route.zoneId && (
              <div className="flex items-center ml-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{zones.find(z => z.id === route.zoneId)?.name || "Zona"}</span>
              </div>
            )}
            
            {route.stops && (
              <div className="flex items-center ml-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{route.stops.length} paradas</span>
              </div>
            )}
            
            {route.totalDistance && (
              <div className="flex items-center ml-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{Number(route.totalDistance).toFixed(1)} km</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-primary h-8"
            >
              <Link href={`/routes/${route.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {!route.isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive h-8"
                onClick={() => handleDeleteRoute(route.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}