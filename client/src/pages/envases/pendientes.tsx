import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PackageX, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EnvasesPendientes() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  // Obtener envases pendientes de retorno
  const { data: pendingData, isLoading } = useQuery<any>({
    queryKey: ["/api/bottle-returns/pending"],
    queryFn: async () => {
      return await apiRequest({
        url: `/api/bottle-returns/pending`,
        method: "GET"
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-8">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" />
          <p className="text-muted-foreground">Cargando envases pendientes...</p>
        </div>
      </div>
    );
  }

  const ordersWithoutReturns = pendingData?.ordersWithoutReturns || [];
  const incompleteReturns = pendingData?.incompleteReturns || [];
  const summary = pendingData?.summary || {
    totalOrdersWithoutReturns: 0,
    totalIncompleteReturns: 0,
    totalPendingBottles: 0,
    totalAmountPending: "0.00"
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <PackageX className="h-7 w-7 text-orange-600" />
            Envases Pendientes de Retorno
          </h1>
          <p className="text-muted-foreground mt-1">
            Rastreo de envases retornables no devueltos
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sin Registro
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrdersWithoutReturns}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos sin retorno registrado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Retornos Incompletos
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalIncompleteReturns}</div>
            <p className="text-xs text-muted-foreground">
              Retornos pendientes o parciales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Envases
            </CardTitle>
            <PackageX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalPendingBottles}</div>
            <p className="text-xs text-muted-foreground">
              Envases pendientes de retorno
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monto Pendiente
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RD$ {parseFloat(summary.totalAmountPending).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total de depósitos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con las dos listas */}
      <Tabs defaultValue="sin-registro" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sin-registro" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Sin Registro ({summary.totalOrdersWithoutReturns})
          </TabsTrigger>
          <TabsTrigger value="incompletos" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Incompletos ({summary.totalIncompleteReturns})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Pedidos sin registro de retorno */}
        <TabsContent value="sin-registro">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Pedidos Entregados Sin Retorno Registrado
              </CardTitle>
              <CardDescription>
                Pedidos con productos retornables que no tienen registro de devolución
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersWithoutReturns.length === 0 ? (
                <div className="text-center py-8">
                  <PackageX className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    No hay pedidos sin registro de retorno
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Depósito Unit.</TableHead>
                        <TableHead className="text-right">Total Pendiente</TableHead>
                        <TableHead>Fecha Entrega</TableHead>
                        <TableHead className="text-center">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersWithoutReturns.map((item: any) => (
                        <TableRow key={`${item.orderId}-${item.productId}`}>
                          <TableCell className="font-medium">#{item.orderId}</TableCell>
                          <TableCell>{item.customerName}</TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-center">{item.pendingQuantity}</TableCell>
                          <TableCell className="text-right">
                            RD$ {parseFloat(item.depositAmount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-600">
                            RD$ {item.amountPending}
                          </TableCell>
                          <TableCell>
                            {new Date(item.orderDate).toLocaleDateString('es-DO')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/orders/details/${item.orderId}`)}
                              data-testid={`button-view-order-${item.orderId}`}
                            >
                              Ver Pedido
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Retornos incompletos */}
        <TabsContent value="incompletos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Retornos Incompletos o Pendientes
              </CardTitle>
              <CardDescription>
                Retornos registrados con envases aún pendientes de devolución
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incompleteReturns.length === 0 ? (
                <div className="text-center py-8">
                  <PackageX className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    No hay retornos incompletos
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Esperados</TableHead>
                        <TableHead className="text-center">Retornados</TableHead>
                        <TableHead className="text-center">Pendientes</TableHead>
                        <TableHead className="text-right">Monto Cobrado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-center">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incompleteReturns.map((item: any) => (
                        <TableRow key={item.bottleReturnId}>
                          <TableCell className="font-medium">#{item.orderId}</TableCell>
                          <TableCell>{item.customerName}</TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-center">{item.expectedQuantity}</TableCell>
                          <TableCell className="text-center text-green-600">
                            {item.returnedQuantity}
                          </TableCell>
                          <TableCell className="text-center text-orange-600 font-medium">
                            {item.pendingQuantity}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            RD$ {parseFloat(item.amountCharged).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                item.status === 'pending' 
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                  : 'bg-orange-100 text-orange-800 border-orange-300'
                              }
                            >
                              {item.status === 'pending' ? 'Pendiente' : 'Incompleto'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(item.orderDate).toLocaleDateString('es-DO')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/orders/details/${item.orderId}`)}
                              data-testid={`button-view-order-${item.orderId}`}
                            >
                              Ver Pedido
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
