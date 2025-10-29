import React, { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getStatusColor, getStatusLabel } from "@/lib/status-colors";

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

// Iconos
import { Truck, Calendar, MapPin, Eye, ArrowRight, X, Route as RouteIcon } from "lucide-react";

// Tipos
import { RouteWithOrders } from "@shared/schema";

interface ResponsiveRoutesListProps {
  routes: RouteWithOrders[];
  isActive?: boolean; // si es true, solo muestra rutas activas, si es false, completadas
}

export function ResponsiveRoutesList({ routes, isActive = true }: ResponsiveRoutesListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Estados para el diálogo de confirmación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<number | null>(null);

  // Filtrar rutas según el tipo (activas o completadas)
  const filteredRoutes = routes.filter(route => isActive ? !route.isCompleted : route.isCompleted);

  // Abrir diálogo de confirmación
  const handleDeleteRoute = (routeId: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setRouteToDelete(routeId);
    setDeleteDialogOpen(true);
  };

  // Confirmar eliminación de ruta
  const confirmDelete = async () => {
    if (!routeToDelete) return;
    
    try {
      // Mostrar toast de carga
      toast({
        description: "Eliminando ruta...",
      });
      
      const response = await fetch(`/api/routes/${routeToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Verificar si la respuesta fue exitosa
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t("errorDeletingRoute"));
      }
      
      // Procesar la respuesta exitosa
      const result = await response.json();
      console.log("Ruta eliminada:", result);
      
      // Invalidar la caché y actualizar la lista
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      
      // Mostrar mensaje de éxito
      toast({
        description: t("routeDeletedSuccessfully"),
      });
      
      // Cerrar el diálogo
      setDeleteDialogOpen(false);
      setRouteToDelete(null);
      
      // Forzar actualización de la página para mostrar cambios
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("Error al eliminar ruta:", error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("errorDeletingRoute")
      });
      setDeleteDialogOpen(false);
      setRouteToDelete(null);
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
  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return String(dateString);
    }
  };

  return (
    <ScrollArea className="max-h-[calc(100vh-400px)]">
      {/* Vista para móviles (tarjetas) */}
      <div className="block md:hidden space-y-3">
        {filteredRoutes.map(route => (
          <Link href={`/routes/${route.id}`} key={route.id}>
            <Card 
              className="border-l-4 border-l-primary hover:shadow-md transition-shadow cursor-pointer"
              data-testid={`route-card-${route.id}`}
            >
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {route.name || `Ruta #${route.id}`}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(route.date)}
                    </div>
                  </div>
                </div>
                <Badge
                  className={`text-xs ${getStatusColor(route.status)}`}
                  data-testid={`badge-status-${route.id}`}
                >
                  {getStatusLabel(route.status)}
                </Badge>
              </div>
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                  <RouteIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Paradas</p>
                    <p className="font-medium">{route.stops?.length || 0}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Distancia</p>
                    <p className="font-medium">
                      {route.totalDistance ? `${Number(route.totalDistance).toFixed(1)} km` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Conductor Info */}
              {route.driverId && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <Truck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Conductor #{route.driverId}
                  </span>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="flex-1 text-xs h-8"
                  data-testid={`button-view-${route.id}`}
                >
                  <Link href={`/routes/${route.id}`}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Ver detalles
                  </Link>
                </Button>
                {!route.isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => handleDeleteRoute(route.id, e)}
                    data-testid={`button-delete-${route.id}`}
                    aria-label="Eliminar ruta"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
          </Link>
        ))}
      </div>
      
      {/* Vista para tablet/desktop (tabla) */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[60px]">ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-center">Conductor</TableHead>
                <TableHead className="text-center">Paradas</TableHead>
                <TableHead className="text-center">Distancia</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.map(route => (
                <TableRow 
                  key={route.id} 
                  className="hover:bg-muted/50"
                  data-testid={`route-row-${route.id}`}
                >
                  <TableCell className="font-medium">#{route.id}</TableCell>
                  <TableCell className="font-medium">
                    {route.name || `Ruta #${route.id}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(route.date)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {route.driverId ? (
                      <Badge variant="outline" className="gap-1">
                        <Truck className="h-3 w-3" />
                        #{route.driverId}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <RouteIcon className="h-3 w-3 text-muted-foreground" />
                      {route.stops?.length || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {route.totalDistance 
                        ? `${Number(route.totalDistance).toFixed(1)} km` 
                        : "N/A"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={`text-xs ${getStatusColor(route.status)}`}
                      data-testid={`badge-status-table-${route.id}`}
                    >
                      {getStatusLabel(route.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 px-2"
                        data-testid={`button-view-table-${route.id}`}
                        aria-label="Ver detalles"
                      >
                        <Link href={`/routes/${route.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {!route.isCompleted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDeleteRoute(route.id, e)}
                          data-testid={`button-delete-table-${route.id}`}
                          aria-label="Eliminar ruta"
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
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")} {t("routes")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteRoute")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-delete"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}