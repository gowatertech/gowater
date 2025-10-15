import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6 p-4 md:p-6">
      {/* Header con Gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-950 rounded-xl p-6 text-white shadow-lg" data-testid="header-gradient">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Carga de Vehículos</h1>
                <p className="text-blue-100 text-sm md:text-base">
                  Gestión de cargas y asignación de productos
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 shadow-md"
            data-testid="button-new-loading"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nueva Carga
          </Button>
        </div>
      </div>

      {/* Dialog para Nueva Carga */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-4">
              <Truck className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Nueva Carga de Vehículo</h2>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Cargas */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Total Cargas</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">{loadings.length}</p>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cargas Hoy */}
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Cargas Hoy</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">{todayLoadings.length}</p>
                  <Calendar className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Pendientes</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">
                    {loadings.filter(l => l.status === "pending").length}
                  </p>
                  <Package className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <PackageOpen className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valor Total */}
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
                </div>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Cargas */}
      {loadings.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
              <Truck className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay cargas registradas</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Comienza creando una nueva carga de vehículo para gestionar tus entregas
            </p>
            <Button onClick={() => setShowForm(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Crear Primera Carga
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loadings.map((loading) => {
            const totalItems = loading.items.reduce((sum, item) => sum + item.quantity, 0);
            const value = calculateTotalValue(loading.items);
            
            return (
              <Card key={loading.id} className="hover:shadow-lg transition-all border-l-4 border-l-blue-500" data-testid="loading-card">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">Carga #{loading.loadingNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(loading.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Conductor</p>
                          <p className="text-sm font-medium truncate">
                            {loading.driver?.name || "No asignado"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Vehículo</p>
                          <p className="text-sm font-medium truncate">
                            {loading.truck?.plate || "No asignado"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Productos</p>
                          <p className="text-sm font-medium">{totalItems} unidades</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Efectivo</p>
                          <p className="text-sm font-medium">${loading.initialCash}</p>
                        </div>
                      </div>
                    </div>

                    {/* Ruta si existe */}
                    {loading.route && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Ruta Asignada</p>
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {loading.route.name}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Valor Total */}
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Valor Total</span>
                        <span className="text-lg font-bold">${value}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
