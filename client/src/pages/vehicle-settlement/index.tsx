import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateRD } from "@/lib/date-utils";
import {
  Calculator, Truck, AlertCircle, Calendar, Clock,
  User as UserIcon, DollarSign, Package, CheckCircle,
  BanknoteIcon, FileText, ClipboardList, BarChart3,
  ListCheck as ListChecks, CheckSquare, Plus, Loader2,
  TrendingUp, ArrowLeft
} from "lucide-react";
import type { VehicleLoading, Product, User as UserType, Truck as TruckType, Route } from "@shared/schema";
import VehicleSettlementForm from "./VehicleSettlementForm";
import ManualSettlementForm from "./ManualSettlementForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface LoadingWithRelations extends VehicleLoading {
  truck: TruckType;
  driver: UserType;
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

interface CompletedLoadingWithStats extends Omit<LoadingWithRelations, 'notes'> {
  stats: {
    orderCount: number;
    totalSales: string;
  };
  cashTotal: string | null;
  transferTotal: string | null;
  difference: string | null;
  completedAt: string | null;
  notes: string | null;
}

export default function VehicleSettlementPage() {
  const [selectedLoadingId, setSelectedLoadingId] = useState<number | null>(null);
  const [selectedSettlementId, setSelectedSettlementId] = useState<number | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const {
    data: loadings = [],
    isLoading: isLoadingPending,
    error: errorPending
  } = useQuery<LoadingWithRelations[]>({
    queryKey: ["/api/vehicle-loading/pending"],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: completedSettlements = { settlements: [], totalCount: 0 },
    isLoading: isLoadingCompleted,
    error: errorCompleted
  } = useQuery<{ settlements: CompletedLoadingWithStats[], totalCount: number }>({
    queryKey: ["/api/route-settlements"],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const isLoading = isLoadingPending || isLoadingCompleted;
  const error = errorPending || errorCompleted;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-red-500 text-sm">Error al cargar los datos</p>
      </div>
    );
  }

  const selectedLoading = loadings.find(loading => loading.id === selectedLoadingId);
  const selectedSettlement = completedSettlements.settlements.find(settlement => settlement.id === selectedSettlementId);

  const calculateTotalValue = (items: LoadingWithRelations['items']) => {
    return items.reduce((sum, item) => {
      const price = item.product?.price && !isNaN(parseFloat(item.product.price)) ?
        parseFloat(item.product.price) : 0;
      return sum + (price * item.quantity);
    }, 0).toFixed(2);
  };

  const getLoadingStats = (loading: LoadingWithRelations) => {
    return {
      totalItems: loading.items.reduce((sum, item) => sum + item.quantity, 0),
      totalProducts: loading.items.length,
      totalValue: calculateTotalValue(loading.items)
    };
  };

  const todayPending = loadings.filter(l => {
    const today = new Date();
    const loadingDate = new Date(l.date);
    return loadingDate.toDateString() === today.toDateString();
  }).length;

  const totalPendingValue = loadings.reduce((sum, loading) => {
    return sum + parseFloat(calculateTotalValue(loading.items));
  }, 0);

  const totalCompletedSales = completedSettlements.settlements.reduce((sum, s) => {
    return sum + Number(s.stats.totalSales || 0);
  }, 0);

  if (selectedLoadingId && selectedLoading) {
    return (
      <div className="space-y-4 p-3 sm:p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedLoadingId(null)} className="h-8 gap-1">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <div>
            <h2 className="text-lg font-bold">Cuadre para Carga #{selectedLoading.loadingNumber}</h2>
            <p className="text-xs text-muted-foreground">Completar cuadre de vehículo</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-blue-500">
                <p className="text-[10px] uppercase text-muted-foreground">Fecha</p>
                <p className="text-sm font-medium">{formatDateRD(selectedLoading.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-green-500">
                <p className="text-[10px] uppercase text-muted-foreground">Conductor</p>
                <p className="text-sm font-medium truncate">{selectedLoading.driver?.name}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-purple-500">
                <p className="text-[10px] uppercase text-muted-foreground">Vehículo</p>
                <p className="text-sm font-medium">{selectedLoading.truck?.plate}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-amber-500">
                <p className="text-[10px] uppercase text-muted-foreground">Efectivo Inicial</p>
                <p className="text-sm font-medium">RD$ {parseFloat(selectedLoading.initialCash).toFixed(2)}</p>
              </div>
            </div>
            <VehicleSettlementForm
              loading={selectedLoading}
              onSuccess={() => setSelectedLoadingId(null)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedSettlementId && selectedSettlement) {
    return (
      <div className="space-y-4 p-3 sm:p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSettlementId(null)} className="h-8 gap-1">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Detalle de Cuadre #{selectedSettlement.loadingNumber}</h2>
            <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
              Completado
            </Badge>
          </div>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <VehicleSettlementForm
              loading={{
                id: selectedSettlement.id,
                companyId: selectedSettlement.companyId,
                date: selectedSettlement.date,
                loadingNumber: selectedSettlement.loadingNumber,
                truckId: selectedSettlement.truckId,
                driverId: selectedSettlement.driverId,
                assistantId: selectedSettlement.assistantId,
                initialCash: selectedSettlement.initialCash,
                status: selectedSettlement.status,
                routeId: selectedSettlement.routeId,
                cashTotal: selectedSettlement.cashTotal || null,
                transferTotal: selectedSettlement.transferTotal || null,
                totalInvoiced: selectedSettlement.totalInvoiced || null,
                difference: selectedSettlement.difference || null,
                notes: selectedSettlement.notes || null,
                items: selectedSettlement.items || [],
                truck: selectedSettlement.truck,
                driver: selectedSettlement.driver,
                route: selectedSettlement.route,
                createdAt: selectedSettlement.createdAt || new Date().toISOString(),
                completedAt: selectedSettlement.completedAt || null
              }}
              onSuccess={() => setSelectedSettlementId(null)}
              readOnly={true}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-800 dark:to-teal-950 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <Calculator className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Cuadre de Vehículo</h1>
                <p className="text-emerald-100 text-xs sm:text-sm md:text-base">
                  Gestión de cuadres automáticos y manuales
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowManualForm(true)}
            size="default"
            className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-md text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
            Cuadre Manual
          </Button>
        </div>
      </div>

      <Dialog open={showManualForm} onOpenChange={setShowManualForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 border-b pb-3 sm:pb-4">
              <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Nuevo Cuadre Manual</h2>
                <p className="text-xs text-muted-foreground">Complete los datos del cuadre sin necesidad de una carga previa</p>
              </div>
            </div>
            <ManualSettlementForm
              onSuccess={() => setShowManualForm(false)}
              onCancel={() => setShowManualForm(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Cargas Pendientes</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <p className="text-2xl sm:text-3xl font-bold">{loadings.length}</p>
                  <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Por Cuadrar Hoy</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <p className="text-2xl sm:text-3xl font-bold">{todayPending}</p>
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Valor Pendiente</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <p className="text-xl sm:text-2xl font-bold">RD$ {totalPendingValue.toFixed(2)}</p>
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Cuadres Completados</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <p className="text-2xl sm:text-3xl font-bold">{completedSettlements.totalCount}</p>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11">
          <TabsTrigger value="pending" className="text-xs sm:text-sm gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Pendientes ({loadings.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            Completados ({completedSettlements.totalCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {loadings.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
                <div className="p-3 sm:p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-3 sm:mb-4">
                  <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">No hay cargas pendientes de cuadre</h3>
                <p className="text-sm sm:text-base text-muted-foreground text-center mb-4 sm:mb-6 max-w-md">
                  Todas las cargas han sido cuadradas o no hay cargas registradas. Puede crear un cuadre manual.
                </p>
                <Button onClick={() => setShowManualForm(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  Crear Cuadre Manual
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {[...loadings]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((loading) => {
                  const stats = getLoadingStats(loading);
                  return (
                    <Card
                      key={loading.id}
                      className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-amber-500"
                      onClick={() => setSelectedLoadingId(loading.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">Carga #{loading.loadingNumber}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateRD(loading.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              Pendiente
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                              <UserIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase">Conductor</p>
                                <p className="text-xs font-medium truncate">{loading.driver?.name || "N/A"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                              <Truck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase">Vehículo</p>
                                <p className="text-xs font-medium truncate">{loading.truck?.plate || "N/A"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">Productos</p>
                              <p className="text-sm font-semibold">{stats.totalProducts}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">Cantidad</p>
                              <p className="text-sm font-semibold">{stats.totalItems}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">Valor</p>
                              <p className="text-sm font-semibold text-green-600">RD$ {stats.totalValue}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedSettlements.settlements.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
                <div className="p-3 sm:p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-3 sm:mb-4">
                  <CheckSquare className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">No hay cuadres completados</h3>
                <p className="text-sm sm:text-base text-muted-foreground text-center max-w-md">
                  Los cuadres completados aparecerán aquí una vez que se procesen.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {[...completedSettlements.settlements]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((settlement) => {
                  const isManual = settlement.notes?.includes("[Cuadre Manual]");
                  return (
                    <Card
                      key={settlement.id}
                      className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-green-500"
                      onClick={() => setSelectedSettlementId(settlement.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">Carga #{settlement.loadingNumber}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateRD(settlement.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isManual && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                  Manual
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Completado
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                              <UserIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase">Conductor</p>
                                <p className="text-xs font-medium truncate">{settlement.driver?.name || "N/A"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase">Ruta</p>
                                <p className="text-xs font-medium truncate">{settlement.route?.name || 'Sin ruta'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">Órdenes</p>
                              <p className="text-sm font-semibold">{settlement.stats.orderCount}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">Total Vendido</p>
                              <p className="text-sm font-semibold text-green-600">RD$ {Number(settlement.stats.totalSales).toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">Vehículo</p>
                              <p className="text-sm font-semibold">{settlement.truck?.plate || 'N/A'}</p>
                            </div>
                          </div>

                          {settlement.completedAt && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
                              <Clock className="h-3 w-3" />
                              Cuadrado: {formatDateRD(settlement.completedAt, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}