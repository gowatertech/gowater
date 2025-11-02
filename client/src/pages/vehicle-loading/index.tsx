import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateRD } from "@/lib/date-utils";
import { 
  Plus, 
  Truck, 
  AlertCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  User as UserIcon,
  DollarSign, 
  Package, 
  ClipboardList,
  Loader2,
  PackageOpen,
  TrendingUp
} from "lucide-react";
import type { VehicleLoading, Product, User, Truck as TruckType } from "@shared/schema";
import { VehicleLoadingForm } from "./VehicleLoadingForm";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface LoadingWithRelations extends VehicleLoading {
  truck: TruckType | null;
  driver: User | null;
  route?: {
    id: number;
    name: string;
    [key: string]: any;
  } | null;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number | null;
    notes: string | null;
    product: Product;
  }>;
}

export default function VehicleLoadingPage() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: loadings = [], isLoading } = useQuery<LoadingWithRelations[]>({
    queryKey: ["/api/vehicle-loading"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const calculateTotalValue = (items: LoadingWithRelations['items']) => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.product?.price || "0");
      return sum + (price * item.quantity);
    }, 0).toFixed(2);
  };

  const todayLoadings = loadings.filter(l => {
    const today = new Date();
    const loadingDate = new Date(l.date);
    return loadingDate.toDateString() === today.toDateString();
  });

  const totalValue = loadings.reduce((sum, loading) => {
    return sum + parseFloat(calculateTotalValue(loading.items));
  }, 0);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header con Gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-950 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg" data-testid="header-gradient">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Carga de Vehículos</h1>
                <p className="text-blue-100 text-xs sm:text-sm md:text-base">
                  Gestión de cargas y asignación de productos
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            size="default"
            className="bg-white text-blue-600 hover:bg-blue-50 shadow-md text-sm sm:text-base w-full sm:w-auto"
            data-testid="button-new-loading"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
            Nueva Carga
          </Button>
        </div>
      </div>

      {/* Dialog para Nueva Carga */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 border-b pb-3 sm:pb-4">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold">Nueva Carga de Vehículo</h2>
            </div>
            <VehicleLoadingForm 
              onSuccess={() => {
                setShowForm(false);
                queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading"] });
              }} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Cargas */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Cargas</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <p className="text-2xl sm:text-3xl font-bold">{loadings.length}</p>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cargas Hoy */}
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Cargas Hoy</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <p className="text-2xl sm:text-3xl font-bold">{todayLoadings.length}</p>
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pendientes</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <p className="text-2xl sm:text-3xl font-bold">
                    {loadings.filter(l => l.status === "pending").length}
                  </p>
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <PackageOpen className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valor Total */}
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Valor Total</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <p className="text-xl sm:text-2xl font-bold">${totalValue.toFixed(2)}</p>
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Cargas */}
      {loadings.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="p-3 sm:p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3 sm:mb-4">
              <Truck className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">No hay cargas registradas</h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center mb-4 sm:mb-6 max-w-md">
              Comienza creando una nueva carga de vehículo para gestionar tus entregas
            </p>
            <Button onClick={() => setShowForm(true)} size="default" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
              Crear Primera Carga
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Vista Móvil - Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {loadings.map((loading) => {
              const totalItems = loading.items.reduce((sum, item) => sum + item.quantity, 0);
              const value = calculateTotalValue(loading.items);
              
              return (
                <Card key={loading.id} className="hover:shadow-lg transition-all border-l-4 border-l-blue-500" data-testid="loading-card">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Carga #{loading.loadingNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateRD(loading.date, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          loading.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          loading.status === "in_progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {loading.status === "completed" ? "Completado" :
                           loading.status === "in_progress" ? "En Progreso" :
                           "Pendiente"}
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                          <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">Conductor</p>
                            <p className="text-xs font-medium truncate">
                              {loading.driver?.name || "No asignado"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">Vehículo</p>
                            <p className="text-xs font-medium truncate">
                              {loading.truck?.plate || "No asignado"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">Productos</p>
                            <p className="text-xs font-medium">{totalItems} und</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">Efectivo</p>
                            <p className="text-xs font-medium">${loading.initialCash}</p>
                          </div>
                        </div>
                      </div>

                      {/* Ruta si existe */}
                      {loading.route && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                          <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">Ruta</p>
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">
                              {loading.route.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Valor Total */}
                      <div className="pt-2 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Valor Total</span>
                        <span className="text-sm font-bold">${value}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Vista Desktop - Tabla */}
          <div className="hidden md:block">
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left p-3 text-sm font-medium">Carga</th>
                      <th className="text-left p-3 text-sm font-medium">Fecha</th>
                      <th className="text-left p-3 text-sm font-medium">Conductor</th>
                      <th className="text-left p-3 text-sm font-medium">Vehículo</th>
                      <th className="text-center p-3 text-sm font-medium">Ruta</th>
                      <th className="text-center p-3 text-sm font-medium">Productos</th>
                      <th className="text-center p-3 text-sm font-medium">Efectivo</th>
                      <th className="text-center p-3 text-sm font-medium">Valor</th>
                      <th className="text-center p-3 text-sm font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadings.map((loading) => {
                      const totalItems = loading.items.reduce((sum, item) => sum + item.quantity, 0);
                      const value = calculateTotalValue(loading.items);
                      
                      return (
                        <tr 
                          key={loading.id} 
                          className="border-b hover:bg-muted/50 transition-colors"
                          data-testid={`loading-row-${loading.id}`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                                <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="font-semibold">#{loading.loadingNumber}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span className="text-sm">
                                {formatDateRD(loading.date, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{loading.driver?.name || "No asignado"}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Truck className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium">{loading.truck?.plate || "No asignado"}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {loading.route ? (
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                  {loading.route.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium">{totalItems}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">${loading.initialCash}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-sm font-bold">${value}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              loading.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                              loading.status === "in_progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}>
                              {loading.status === "completed" ? "Completado" :
                               loading.status === "in_progress" ? "En Progreso" :
                               "Pendiente"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
