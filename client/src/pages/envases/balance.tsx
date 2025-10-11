import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type BottleReturn } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  TrendingUp, 
  RefreshCw, 
  Search,
  ChevronRight,
  Filter,
  X,
  Users
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface BottleBalance {
  customerId: number;
  customerName: string;
  bottlesDelivered: number;
  bottlesReturned: number;
  bottlesPending: number;
  depositAmount: string;
}

export default function BalanceEnvases() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "pending" | "completed">("all");

  const { 
    data: bottleReturns = [], 
    isLoading: isLoadingReturns, 
    isError: isErrorReturns,
    error: errorReturns,
    refetch: refetchReturns 
  } = useQuery<BottleReturn[]>({
    queryKey: ["/api/bottle-returns"],
  });

  const { 
    data: bottleBalance = [], 
    isLoading: isLoadingBalance, 
    isError: isErrorBalance,
    error: errorBalance,
    refetch: refetchBalance 
  } = useQuery<BottleBalance[]>({
    queryKey: ["/api/bottle-balance"],
  });

  const isLoading = isLoadingReturns || isLoadingBalance;
  const hasError = isErrorReturns || isErrorBalance;

  useEffect(() => {
    if (isErrorReturns && errorReturns) {
      toast({
        variant: "destructive",
        title: "Error",
        description: errorReturns.message || "No se pudieron cargar las devoluciones",
      });
    }
  }, [isErrorReturns, errorReturns, toast]);

  useEffect(() => {
    if (isErrorBalance && errorBalance) {
      toast({
        variant: "destructive",
        title: "Error",
        description: errorBalance.message || "No se pudo cargar el balance por cliente",
      });
    }
  }, [isErrorBalance, errorBalance, toast]);

  const handleRefresh = () => {
    refetchReturns();
    refetchBalance();
  };

  const totalEnCirculacion = bottleReturns.reduce(
    (sum, br) => sum + (br.expectedQuantity || 0),
    0
  );
  const totalDevueltos = bottleReturns.reduce(
    (sum, br) => sum + (br.returnedQuantity || 0),
    0
  );
  const totalPendientes = bottleReturns.reduce(
    (sum, br) => sum + (br.pendingQuantity || 0),
    0
  );

  const filteredBalance = useMemo(() => {
    let filtered = bottleBalance;

    if (searchQuery) {
      filtered = filtered.filter(balance =>
        balance.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterActive === "pending") {
      filtered = filtered.filter(balance => balance.bottlesPending > 0);
    } else if (filterActive === "completed") {
      filtered = filtered.filter(balance => balance.bottlesPending === 0);
    }

    return filtered;
  }, [bottleBalance, searchQuery, filterActive]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color,
    isLoading 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string;
    isLoading: boolean;
  }) => (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-20 h-20 ${color}`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1 p-4">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CustomerCard = ({ balance }: { balance: BottleBalance }) => {
    const returnRate = balance.bottlesDelivered > 0 
      ? Math.round((balance.bottlesReturned / balance.bottlesDelivered) * 100) 
      : 0;

    return (
      <Card 
        className="overflow-hidden transition-all hover:shadow-md hover:border-primary/50 cursor-pointer"
        data-testid={`card-customer-${balance.customerId}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 
                className="font-semibold text-lg mb-1 line-clamp-1" 
                data-testid={`text-customer-name-${balance.customerId}`}
              >
                {balance.customerName}
              </h3>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={balance.bottlesPending > 0 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {balance.bottlesPending > 0 ? `${balance.bottlesPending} pendientes` : 'Completo'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {returnRate}% devueltos
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Entregados</p>
              <p className="text-lg font-semibold text-blue-600" data-testid={`text-delivered-${balance.customerId}`}>
                {balance.bottlesDelivered}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Devueltos</p>
              <p className="text-lg font-semibold text-green-600" data-testid={`text-returned-${balance.customerId}`}>
                {balance.bottlesReturned}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
              <p className="text-lg font-semibold text-orange-600" data-testid={`text-pending-${balance.customerId}`}>
                {balance.bottlesPending}
              </p>
            </div>
          </div>

          {parseFloat(balance.depositAmount) > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Depósito</span>
                <span className="text-sm font-semibold">
                  RD$ {parseFloat(balance.depositAmount).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              {t("Balance de Envases")}
            </h1>
            <Button 
              onClick={handleRefresh} 
              variant="outline"
              disabled={isLoading}
              size="sm"
              data-testid="button-refresh"
              aria-label="Actualizar balance"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline ml-2">{t("Actualizar")}</span>
            </Button>
          </div>

          {hasError && !isLoading ? (
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-destructive">
                  <Package className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">Error al cargar datos</h3>
                    <p className="text-xs mt-1">Por favor, intente nuevamente.</p>
                  </div>
                  <Button 
                    onClick={handleRefresh} 
                    variant="outline" 
                    size="sm"
                    className="flex-shrink-0"
                    aria-label="Reintentar carga de datos"
                    data-testid="button-retry-load"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCard
                title="Total en Circulación"
                value={totalEnCirculacion}
                icon={Package}
                color="bg-blue-500"
                isLoading={isLoading}
              />
              <StatCard
                title="Envases Devueltos"
                value={totalDevueltos}
                icon={TrendingUp}
                color="bg-green-500"
                isLoading={isLoading}
              />
              <StatCard
                title="Envases Pendientes"
                value={totalPendientes}
                icon={Package}
                color="bg-orange-500"
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Balance por Cliente</CardTitle>
                {!isLoading && bottleBalance.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredBalance.length} de {bottleBalance.length}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                    data-testid="input-search-customer"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      aria-label="Limpiar búsqueda"
                      data-testid="button-clear-search"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={filterActive === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterActive("all")}
                    className="flex-1 sm:flex-none"
                    data-testid="button-filter-all"
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filterActive === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterActive("pending")}
                    className="flex-1 sm:flex-none"
                    data-testid="button-filter-pending"
                  >
                    Pendientes
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredBalance.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="font-medium text-lg mb-1">
                  {searchQuery ? "No se encontraron clientes" : "No hay registros"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? "Intenta con otro término de búsqueda" 
                    : "Los balances aparecerán cuando se registren envases"}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="mt-4"
                    data-testid="button-clear-search-empty"
                  >
                    Limpiar búsqueda
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="md:hidden space-y-3">
                  {filteredBalance.map((balance) => (
                    <CustomerCard key={balance.customerId} balance={balance} />
                  ))}
                </div>

                <div className="hidden md:block">
                  <ScrollArea className="h-[calc(100vh-500px)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("Cliente")}</TableHead>
                          <TableHead className="text-right">{t("Entregados")}</TableHead>
                          <TableHead className="text-right">{t("Devueltos")}</TableHead>
                          <TableHead className="text-right">{t("Pendientes")}</TableHead>
                          <TableHead className="text-right">{t("Depósito")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBalance.map((balance) => (
                          <TableRow 
                            key={balance.customerId}
                            data-testid={`row-customer-${balance.customerId}`}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {balance.customerName}
                                {balance.bottlesPending > 0 && (
                                  <Badge variant="outline" className="ml-2">
                                    Pendiente
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{balance.bottlesDelivered || 0}</TableCell>
                            <TableCell className="text-right text-green-600">{balance.bottlesReturned || 0}</TableCell>
                            <TableCell className="text-right text-orange-600">{balance.bottlesPending || 0}</TableCell>
                            <TableCell className="text-right">RD$ {parseFloat(balance.depositAmount || "0").toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
