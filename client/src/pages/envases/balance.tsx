import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type BottleReturn } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Package, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function BalanceEnvases() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Consulta para obtener TODAS las devoluciones de envases
  const { 
    data: bottleReturns = [], 
    isLoading: isLoadingReturns, 
    isError: isErrorReturns,
    error: errorReturns,
    refetch: refetchReturns 
  } = useQuery<BottleReturn[]>({
    queryKey: ["/api/bottle-returns"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bottle-returns");
      if (!response.ok) {
        throw new Error("Error al obtener devoluciones de envases");
      }
      return response.json();
    },
  });

  // Consulta para obtener el balance por cliente
  const { 
    data: bottleBalance = [], 
    isLoading: isLoadingBalance, 
    isError: isErrorBalance,
    error: errorBalance,
    refetch: refetchBalance 
  } = useQuery<any[]>({
    queryKey: ["/api/bottle-balance"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bottle-balance");
      if (!response.ok) {
        throw new Error("Error al obtener balance por cliente");
      }
      return response.json();
    },
  });

  const isLoading = isLoadingReturns || isLoadingBalance;
  const hasError = isErrorReturns || isErrorBalance;

  // Mostrar toast si hay errores
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

  // Calcular totales REALES desde la base de datos
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          {t("Balance de Envases")}
        </h1>
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          disabled={isLoading}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t("Actualizar")}
        </Button>
      </div>

      {hasError && !isLoading ? (
        <Card className="p-6 bg-destructive/10 border-destructive/20">
          <div className="flex items-center gap-3 text-destructive">
            <Package className="h-6 w-6" />
            <div>
              <h3 className="font-medium">Error al cargar datos</h3>
              <p className="text-sm mt-1">No se pudieron cargar los datos. Por favor, intente nuevamente.</p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="ml-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <h3 className="font-medium mb-2">{t("Total Envases en Circulación")}</h3>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-blue-600">{totalEnCirculacion.toLocaleString()}</p>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="font-medium mb-2">{t("Envases Devueltos")}</h3>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-green-600">{totalDevueltos.toLocaleString()}</p>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="font-medium mb-2">{t("Envases Pendientes")}</h3>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-orange-600">{totalPendientes.toLocaleString()}</p>
            )}
          </Card>
        </div>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            {t("Balance por Cliente")}
          </h3>
          {!isLoading && bottleBalance.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {bottleBalance.length} {bottleBalance.length === 1 ? 'cliente' : 'clientes'}
            </span>
          )}
        </div>
        <ScrollArea className="h-[calc(100vh-400px)]">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : bottleBalance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay registros de balance por cliente</p>
              <p className="text-sm mt-1">Los balances aparecerán cuando se registren envases</p>
            </div>
          ) : (
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
                {bottleBalance.map((balance) => (
                  <TableRow key={balance.customerId}>
                    <TableCell className="font-medium">{balance.customerName}</TableCell>
                    <TableCell className="text-right">{balance.bottlesDelivered || 0}</TableCell>
                    <TableCell className="text-right text-green-600">{balance.bottlesReturned || 0}</TableCell>
                    <TableCell className="text-right text-orange-600">{balance.bottlesPending || 0}</TableCell>
                    <TableCell className="text-right">RD$ {parseFloat(balance.depositAmount || "0").toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
