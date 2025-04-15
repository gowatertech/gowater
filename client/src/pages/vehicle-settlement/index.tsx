import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calculator, Truck, AlertCircle, Calendar, Clock, 
  User as UserIcon, // Renombrar el icono para evitar conflicto
  DollarSign, Package, CheckCircle, BanknoteIcon, TrendingDown, 
  TrendingUp, FileText, Tag, ClipboardList, BarChart3, 
  History as HistoryIcon, ListCheck as ListChecks, Route as RouteIcon,
  BadgeCheck, Filter as FilterIcon
} from "lucide-react";
import type { VehicleLoading, Product, User, Truck as TruckType, Route } from "@shared/schema";
import { Loader2 } from "lucide-react";
import VehicleSettlementForm from "./VehicleSettlementForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DebugApiView from "./DebugApiView";

interface LoadingWithRelations extends VehicleLoading {
  truck: TruckType;
  driver: User;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number | null;
    notes: string | null;
    product: Product;
  }>;
  route?: Route | null;
}

interface CompletedLoadingWithStats extends LoadingWithRelations {
  stats: {
    orderCount: number;
    totalSales: string;
  };
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

export default function VehicleSettlementPage() {
  const [selectedLoadingId, setSelectedLoadingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("pending");

  // Obtener solo cargas pendientes
  const { 
    data: loadings = [], 
    isLoading: isLoadingPending, 
    error: errorPending 
  } = useQuery<LoadingWithRelations[]>({
    queryKey: ["/api/vehicle-loading/pending"],
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Obtener cargas completadas (cuadres)
  const {
    data: completedSettlements = { settlements: [], totalCount: 0 },
    isLoading: isLoadingCompleted,
    error: errorCompleted
  } = useQuery<{ settlements: CompletedLoadingWithStats[], totalCount: number }>({
    queryKey: ["/api/route-settlements"],
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: activeTab === "completed",
  });

  const isLoading = isLoadingPending || (isLoadingCompleted && activeTab === "completed");
  const error = errorPending || (errorCompleted && activeTab === "completed");

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calculator className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Cuadre de Vehículo</h1>
        </div>
        
        {selectedLoadingId && (
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setSelectedLoadingId(null)}
            className="h-8"
          >
            Volver a la lista
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {!selectedLoadingId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center border-l-4 border-l-amber-500">
              <div className="p-2.5 flex-1">
                <p className="text-xs text-gray-500">Cargas Pendientes</p>
                <p className="font-semibold text-lg">{loadings.length}</p>
              </div>
              <div className="pr-2.5">
                <ClipboardList className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </Card>
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center border-l-4 border-l-green-500">
              <div className="p-2.5 flex-1">
                <p className="text-xs text-gray-500">Por Cuadrar Hoy</p>
                <p className="font-semibold text-lg">
                  {loadings.filter(l => {
                    const today = new Date();
                    const loadingDate = new Date(l.date);
                    return loadingDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
              <div className="pr-2.5">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </Card>
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center border-l-4 border-l-purple-500">
              <div className="p-2.5 flex-1">
                <p className="text-xs text-gray-500">Valor Pendiente</p>
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
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center border-l-4 border-l-blue-500">
              <div className="p-2.5 flex-1">
                <p className="text-xs text-gray-500">Efectivo Inicial</p>
                <p className="font-semibold text-lg">
                  RD$ {loadings.reduce((sum, loading) => {
                    return sum + parseFloat(loading.initialCash);
                  }, 0).toFixed(2)}
                </p>
              </div>
              <div className="pr-2.5">
                <BanknoteIcon className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Lista de cargas o formulario de cuadre */}
      {selectedLoading ? (
        <Card className="p-3 overflow-hidden">
          <CardHeader className="p-3 pb-2 flex flex-row justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Cuadre para Vehículo #{selectedLoading.loadingNumber}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-gray-50 p-2 mb-3 rounded-lg text-xs">
              <div className="border-l-4 border-l-blue-500 pl-2">
                <p className="text-xs text-gray-500 flex items-center">
                  <Calendar className="h-3 w-3 mr-1 text-blue-500" />
                  Fecha
                </p>
                <p className="font-medium text-sm">{new Date(selectedLoading.date).toLocaleDateString()}</p>
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
              <div className="border-l-4 border-l-amber-500 pl-2">
                <p className="text-xs text-gray-500 flex items-center">
                  <BanknoteIcon className="h-3 w-3 mr-1 text-amber-500" />
                  Efectivo Inicial
                </p>
                <p className="font-medium text-sm">RD$ {parseFloat(selectedLoading.initialCash).toFixed(2)}</p>
              </div>
            </div>
            <VehicleSettlementForm 
              loading={selectedLoading}
              onSuccess={() => setSelectedLoadingId(null)}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pestañas para seleccionar entre pendientes y completados */}
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-2">
              <TabsTrigger value="pending" className="flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4" />
                Pendientes ({loadings.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                Completados ({completedSettlements.totalCount})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {loadings.length === 0 ? (
                  <div className="col-span-full text-center py-4">
                    <p className="text-gray-500 text-sm">No hay cargas pendientes para cuadrar</p>
                  </div>
                ) : (
                  loadings.map((loading) => {
                    const stats = getLoadingStats(loading);
                    return (
                      <Card 
                        key={loading.id} 
                        className="p-0 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                        onClick={() => setSelectedLoadingId(loading.id)}
                      >
                        <div className="flex flex-col border-l-4 border-l-amber-500">
                          <div className="p-2.5 pb-1.5">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-sm">Carga #{loading.loadingNumber}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loading.status)}`}>
                                Pendiente por Cuadrar
                              </span>
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
            </TabsContent>
            
            <TabsContent value="completed" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {completedSettlements.settlements.length === 0 ? (
                  <div className="col-span-full text-center py-4">
                    <p className="text-gray-500 text-sm">No hay cuadres completados para mostrar</p>
                  </div>
                ) : (
                  completedSettlements.settlements.map((settlement) => (
                    <Card 
                      key={settlement.id} 
                      className="p-0 hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div className="flex flex-col border-l-4 border-l-green-500">
                        <div className="p-2.5 pb-1.5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">Carga #{settlement.loadingNumber}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(settlement.status)}`}>
                              Completado
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="text-gray-600">{new Date(settlement.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="text-gray-600 truncate">
                                {settlement.completedAt 
                                  ? new Date(settlement.completedAt).toLocaleDateString() 
                                  : 'Sin fecha de cuadre'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <UserIcon className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="text-gray-600 truncate">{settlement.driver?.name || settlement.driverId}</span>
                            </div>
                            <div className="flex items-center">
                              <FileText className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="text-gray-600">{settlement.route?.name || 'Sin ruta asignada'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-xs text-gray-500">Órdenes</p>
                            <p className="font-medium">{settlement.stats.orderCount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Vendido</p>
                            <p className="font-medium">RD$ {Number(settlement.stats.totalSales).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Vehículo</p>
                            <p className="font-medium">{settlement.truck?.plate || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}