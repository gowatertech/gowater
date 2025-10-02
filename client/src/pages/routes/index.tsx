import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Icons
import { PlusCircle, Eye, Edit, Trash2 } from "lucide-react";

// Utils
import { getStatusColor, getStatusLabel } from "@/lib/status-colors";

// Route form
import SimpleRouteForm from "@/components/simple-route-form";

// Types
import { RouteWithOrders } from "@shared/schema";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteWithOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteWithOrders | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Cargar rutas
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await fetch('/api/routes');
        const data = await response.json();
        setRoutes(data);
      } catch (error) {
        console.error('Error cargando rutas:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las rutas",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoutes();
  }, [toast]);

  // Eliminar ruta
  const handleDelete = async (routeId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta ruta?')) return;
    
    try {
      const response = await fetch(`/api/routes/${routeId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setRoutes(routes.filter(r => r.id !== routeId));
        toast({
          description: "Ruta eliminada correctamente"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la ruta",
        variant: "destructive"
      });
    }
  };

  // Después de crear/editar
  const handleRouteCreated = () => {
    setShowCreateDialog(false);
    setEditingRoute(null);
    queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
    // Recargar rutas
    fetch('/api/routes').then(r => r.json()).then(setRoutes);
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rutas</h1>
          <p className="text-muted-foreground">Gestión de rutas de entrega</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-route">
          <PlusCircle className="h-4 w-4 mr-2" />
          Nueva Ruta
        </Button>
      </div>

      {/* Lista de rutas */}
      <div className="grid gap-4">
        {routes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No hay rutas creadas</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Crear primera ruta
              </Button>
            </CardContent>
          </Card>
        ) : (
          routes.map(route => (
            <Card key={route.id} data-testid={`card-route-${route.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg" data-testid={`text-route-name-${route.id}`}>
                        {route.name}
                      </h3>
                      <Badge className={getStatusColor(route.status)} data-testid={`badge-status-${route.id}`}>
                        {getStatusLabel(route.status)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>Fecha:</strong> {format(new Date(route.date), 'dd/MM/yyyy', { locale: es })}
                      </p>
                      {route.driverId && (
                        <p><strong>Conductor ID:</strong> {route.driverId}</p>
                      )}
                      {route.stops && route.stops.length > 0 && (
                        <p><strong>Paradas:</strong> {route.stops.length}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                      data-testid={`button-view-${route.id}`}
                    >
                      <Link href={`/routes/${route.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    
                    {!route.isCompleted && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingRoute(route)}
                          data-testid={`button-edit-${route.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(route.id)}
                          className="text-red-500 hover:text-red-700"
                          data-testid={`button-delete-${route.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Diálogo para crear/editar */}
      <Dialog open={showCreateDialog || !!editingRoute} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingRoute(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}
            </DialogTitle>
          </DialogHeader>
          <SimpleRouteForm 
            route={editingRoute || undefined}
            onSuccess={handleRouteCreated}
            onCancel={() => {
              setShowCreateDialog(false);
              setEditingRoute(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
