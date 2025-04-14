import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { AssignRouteDialog } from "./AssignRouteDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, Truck, AlertCircle, Calendar, Clock, MapPin, 
  User as UserIcon, // Renombrar el icono para evitar conflicto 
  DollarSign, Package, FileText, Tag, ClipboardList, Database,
  Trash2, AlertTriangle
} from "lucide-react";
import type { VehicleLoading, Product, User, Truck as TruckType } from "@shared/schema";
import { VehicleLoadingForm } from "./VehicleLoadingForm";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface LoadingWithRelations extends VehicleLoading {
  truck: TruckType;
  driver: User;
  route?: {
    id: number;
    name: string;
    [key: string]: any;
  };
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number | null;
    notes: string | null;
    product: Product;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Colores para las etiquetas del borde izquierdo
const getLabelColor = (label: string) => {
  const colors: Record<string, string> = {
    fecha: "border-l-blue-500",
    estado: "border-l-yellow-500",
    conductor: "border-l-green-500",
    vehiculo: "border-l-purple-500",
    efectivo: "border-l-red-500",
    productos: "border-l-sky-500",
    carga: "border-l-emerald-500",
    cuadre: "border-l-amber-500",
    notas: "border-l-teal-500",
  };
  return colors[label.toLowerCase()] || "border-l-gray-500";
};

export default function VehicleLoadingPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedLoadingId, setSelectedLoadingId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAssignRouteDialog, setShowAssignRouteDialog] = useState(false);
  const [loadingForRoute, setLoadingForRoute] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: loadings = [], isLoading, error } = useQuery<LoadingWithRelations[]>({
    queryKey: ["/api/vehicle-loading"],
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Mutation para asignar una ruta a una carga
  const { mutate: assignRouteMutation, isPending: isAssigningRoute } = useMutation({
    mutationFn: async ({ loadingId, routeId }: { loadingId: number, routeId: number }) => {
      return await apiRequest(`/api/vehicle-loading/${loadingId}/assign-route`, {
        method: "PATCH",
        body: JSON.stringify({ routeId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading"] });
      toast({
        title: "Ruta asignada",
        description: "La ruta ha sido asignada correctamente a la carga",
      });
      setShowAssignRouteDialog(false);
    },
    onError: (error: any) => {
      console.error("Error al asignar ruta:", error);
      toast({
        title: "Error",
        description: "No se pudo asignar la ruta a la carga. Intente nuevamente.",
        variant: "destructive",
      });
    },
  });
  
  const handleAssignRoute = (routeId: number) => {
    if (loadingForRoute) {
      assignRouteMutation({ loadingId: loadingForRoute, routeId });
    }
  };
  
  // Función para eliminar una carga
  const deleteLoading = async (id: number) => {
    if (!id) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/vehicle-loading/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar la carga');
      }
      
      // Actualizar datos
      queryClient.invalidateQueries({ queryKey: ['/api/vehicle-loading'] });
      
      toast({
        title: "Carga eliminada",
        description: "La carga ha sido eliminada correctamente",
        variant: "success",
      });
    } catch (error) {
      console.error("Error al eliminar la carga:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar la carga",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setDeleteLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    console.error("Error loading data:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-red-500 text-sm">Error al cargar los datos</p>
      </div>
    );
  }

  const selectedLoading = loadings.find(loading => loading.id === selectedLoadingId);

  // Calcular valor total de la carga
  const calculateTotalValue = (items: LoadingWithRelations['items']) => {
    return items.reduce((sum, item) => {
      const price = item.product?.price && !isNaN(parseFloat(item.product.price)) ? 
        parseFloat(item.product.price) : 0;
      return sum + (price * item.quantity);
    }, 0).toFixed(2);
  };

  // Obtener estadísticas de la carga
  const getLoadingStats = (loading: LoadingWithRelations) => {
    return {
      totalItems: loading.items.reduce((sum, item) => sum + item.quantity, 0),
      totalProducts: loading.items.length,
      totalValue: calculateTotalValue(loading.items)
    };
  };

  return (
    <div className="space-y-3 p-2">
      {/* Diálogo de asignación de ruta */}
      <AssignRouteDialog
        open={showAssignRouteDialog}
        onOpenChange={setShowAssignRouteDialog}
        loadingId={loadingForRoute}
        onAssign={handleAssignRoute}
        isAssigning={isAssigningRoute}
      />
      
      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Esta acción no se puede deshacer.</span>
              </div>
              <p>¿Estás seguro de que deseas eliminar esta carga de vehículo?</p>
              <p className="mt-2 text-sm text-gray-600">Solo se pueden eliminar cargas en estado "Pendiente" y que no tengan una ruta asignada.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                deleteLoading(deleteLoadingId!);
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Sí, eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Carga de Vehículos</h1>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nueva Carga
          </Button>
        )}
      </div>

      {/* Formulario de nueva carga */}
      {showForm ? (
        <Card className="p-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Nueva Carga de Vehículo</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowForm(false)}
              className="h-7 w-7 p-0"
            >
              ✕
            </Button>
          </div>
          <VehicleLoadingForm 
            onSuccess={() => setShowForm(false)} 
          />
        </Card>
      ) : (
        <>
          {/* Stats Cards - solo mostrar cuando no se esté creando una carga */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center border-l-4 border-l-blue-500">
                <div className="p-2.5 flex-1">
                  <p className="text-xs text-gray-500">Cargas Totales</p>
                  <p className="font-semibold text-lg">{loadings.length}</p>
                </div>
                <div className="pr-2.5">
                  <ClipboardList className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </Card>
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center border-l-4 border-l-green-500">
                <div className="p-2.5 flex-1">
                  <p className="text-xs text-gray-500">Cargas Pendientes</p>
                  <p className="font-semibold text-lg">{loadings.filter(l => l.status === "pending").length}</p>
                </div>
                <div className="pr-2.5">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </Card>
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center border-l-4 border-l-yellow-500">
                <div className="p-2.5 flex-1">
                  <p className="text-xs text-gray-500">Cargas Hoy</p>
                  <p className="font-semibold text-lg">
                    {loadings.filter(l => {
                      const today = new Date();
                      const loadingDate = new Date(l.date);
                      return loadingDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
                <div className="pr-2.5">
                  <Calendar className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </Card>
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center border-l-4 border-l-purple-500">
                <div className="p-2.5 flex-1">
                  <p className="text-xs text-gray-500">Valor Total</p>
                  <p className="font-semibold text-lg">
                    RD$ {loadings.reduce((sum, loading) => {
                      return sum + parseFloat(calculateTotalValue(loading.items));
                    }, 0).toFixed(2)}
                  </p>
                </div>
                <div className="pr-2.5">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </Card>
          </div>

          {/* Lista de cargas o detalles de una carga - solo mostrar cuando no se esté creando una carga */}
          {selectedLoading ? (
            <Card className="p-0 overflow-hidden">
              <CardHeader className="p-3 pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Carga #{selectedLoading.loadingNumber}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLoadingId(null)}
                      className="h-7"
                    >
                      Volver
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-3">
                  {/* Información General */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <Database className="h-3.5 w-3.5 mr-1 text-primary" />
                      Información General
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-gray-50 p-2 rounded-lg text-xs">
                      <div className="border-l-4 border-l-blue-500 pl-2">
                        <p className="text-xs text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-blue-500" />
                          Fecha
                        </p>
                        <p className="font-medium text-sm">{new Date(selectedLoading.date).toLocaleDateString()}</p>
                      </div>
                      <div className="border-l-4 border-l-yellow-500 pl-2">
                        <p className="text-xs text-gray-500 flex items-center">
                          <Tag className="h-3 w-3 mr-1 text-yellow-500" />
                          Estado
                        </p>
                        <p className="font-medium text-sm capitalize">
                          {selectedLoading.status === "completed" ? "Completado" :
                          selectedLoading.status === "in_progress" ? "En Progreso" :
                          selectedLoading.status === "cancelled" ? "Cancelado" :
                          "Pendiente"}
                        </p>
                      </div>
                      <div className="border-l-4 border-l-green-500 pl-2">
                        <p className="text-xs text-gray-500 flex items-center">
                          <UserIcon className="h-3 w-3 mr-1 text-green-500" />
                          Conductor
                        </p>
                        <p className="font-medium text-sm">{selectedLoading.driver?.name}</p>
                      </div>
                      <div className="border-l-4 border-l-purple-500 pl-2">
                        <p className="text-xs text-gray-500 flex items-center">
                          <Truck className="h-3 w-3 mr-1 text-purple-500" />
                          Vehículo
                        </p>
                        <p className="font-medium text-sm">{selectedLoading.truck?.plate}</p>
                      </div>
                      <div className="border-l-4 border-l-red-500 pl-2">
                        <p className="text-xs text-gray-500 flex items-center">
                          <DollarSign className="h-3 w-3 mr-1 text-red-500" />
                          Efectivo Inicial
                        </p>
                        <p className="font-medium text-sm">RD$ {parseFloat(selectedLoading.initialCash).toFixed(2)}</p>
                      </div>
                      {selectedLoading.route && (
                        <div className="border-l-4 border-l-teal-500 pl-2 col-span-2">
                          <p className="text-xs text-gray-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-1 text-teal-500" />
                            Ruta Asignada
                          </p>
                          <p className="font-medium text-sm">
                            ID: {selectedLoading.route.id} - {selectedLoading.route.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Productos */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <Package className="h-3.5 w-3.5 mr-1 text-primary" />
                      Productos Cargados
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left">Producto</th>
                            <th className="px-2 py-1.5 text-right">Cantidad</th>
                            <th className="px-2 py-1.5 text-right">Devuelto</th>
                            <th className="px-2 py-1.5 text-right">Precio</th>
                            <th className="px-2 py-1.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedLoading.items && selectedLoading.items.length > 0 ? (
                            selectedLoading.items.map((item) => (
                              <tr key={item.id} className="border-b">
                                <td className="px-2 py-1.5">{item.product?.name}</td>
                                <td className="px-2 py-1.5 text-right">{item.quantity}</td>
                                <td className="px-2 py-1.5 text-right">{item.returnedQuantity || 0}</td>
                                <td className="px-2 py-1.5 text-right">RD$ {parseFloat(item.product?.price || "0").toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-right">
                                  RD$ {(item.product?.price && !isNaN(parseFloat(item.product.price)) ? 
                                    (parseFloat(item.product.price) * item.quantity).toFixed(2) : '0.00')}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-2 py-1.5 text-center text-gray-500">
                                No hay productos cargados
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {selectedLoading.items && selectedLoading.items.length > 0 && (
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={4} className="px-2 py-1.5 text-right font-medium">Total</td>
                              <td className="px-2 py-1.5 text-right font-medium">
                                RD$ {calculateTotalValue(selectedLoading.items)}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* Notas */}
                  {selectedLoading.notes && (
                    <div className="border-l-4 border-l-teal-500 pl-2">
                      <h3 className="text-sm font-medium mb-1 flex items-center">
                        <FileText className="h-3.5 w-3.5 mr-1 text-teal-500" />
                        Notas
                      </h3>
                      <p className="text-xs text-gray-600">{selectedLoading.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {loadings.length === 0 ? (
                <div className="col-span-full text-center py-4">
                  <p className="text-gray-500 text-sm">No hay cargas registradas</p>
                </div>
              ) : (
                loadings.map((loading) => {
                  const stats = getLoadingStats(loading);
                  return (
                    <Card 
                      key={loading.id} 
                      className="p-0 hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div 
                        className="flex flex-col border-l-4 border-l-blue-500 relative"
                        onClick={(e) => {
                          // Evitar que el clic en el botón de eliminar active el clic en la tarjeta
                          if (!(e.target as HTMLElement).closest('.delete-btn')) {
                            setSelectedLoadingId(loading.id);
                          }
                        }}
                      >
                        <div className="p-2.5 pb-1.5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">Carga #{loading.loadingNumber}</span>
                            <div className="flex items-center gap-1">
                              {!loading.routeId && loading.status === "pending" && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs flex items-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLoadingForRoute(loading.id);
                                    setShowAssignRouteDialog(true);
                                  }}
                                >
                                  <MapPin className="h-3 w-3 mr-1" />
                                  Asignar
                                </Button>
                              )}
                              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loading.status)}`}>
                                {loading.status === "completed" ? "Completado" :
                                loading.status === "in_progress" ? "En Progreso" :
                                loading.status === "cancelled" ? "Cancelado" :
                                "Pendiente"}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="text-gray-600">{new Date(loading.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center">
                              <UserIcon className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="text-gray-600 truncate">{loading.driver?.name || loading.driverId}</span>
                            </div>
                            <div className="flex items-center">
                              <Truck className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="text-gray-600">{loading.truck?.plate || loading.truckId}</span>
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="text-gray-600">RD$ {parseFloat(loading.initialCash).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center col-span-2">
                              <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="text-gray-600 truncate">
                                {loading.routeId ? 
                                  `Ruta #${loading.routeId}` : 
                                  <span className="text-amber-500 font-medium">Sin ruta asignada</span>}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-xs text-gray-500">Productos</p>
                            <p className="font-medium">{stats.totalProducts}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Cantidad</p>
                            <p className="font-medium">{stats.totalItems}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Valor Total</p>
                            <p className="font-medium">RD$ {stats.totalValue}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}