import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";

type CommissionItem = {
  id: number;
  productId: number;
  productName: string;
  orderId: number;
  quantity: number;
  commissionValue: string;
  commissionAmount: string;
  deliveryDate: string;
};

type CommissionDetails = {
  id: number;
  userId: number;
  userName: string;
  userRole: "driver" | "helper";
  weekStartDate: string;
  weekEndDate: string;
  productCount: number;
  totalAmount: string;
  status: "pending" | "paid" | "cancelled";
  paymentDate?: string;
  paymentReference?: string;
  routeName?: string;
  routeId?: number;
  notes?: string;
  items: CommissionItem[];
};

const CommissionDetailsPage: React.FC = () => {
  const [, params] = useRoute<{ id: string }>("/commissions/details/:id");
  const commissionId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();

  // Consulta para cargar los detalles de la comisión
  const { data: commission, isLoading } = useQuery({
    queryKey: ["commission", commissionId],
    queryFn: async () => {
      // En producción, esta sería una llamada API real
      const response = await fetch(`/api/commissions/${commissionId}`);
      if (!response.ok) {
        throw new Error("Error al cargar los detalles de la comisión");
      }
      return response.json();
    },
    // Desactivado para la demo
    enabled: false,
  });

  // Mock data para ilustrar la interfaz
  const mockCommissionDetails: CommissionDetails = {
    id: commissionId,
    userId: 1,
    userName: "Sin datos disponibles",
    userRole: "driver",
    weekStartDate: new Date().toISOString(),
    weekEndDate: new Date().toISOString(),
    productCount: 0,
    totalAmount: "0.00",
    status: "pending",
    items: [],
  };

  const commissionDetails = commission || mockCommissionDetails;

  // Función para formatear moneda
  const formatCurrency = (amount: string | number): string => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(numAmount);
  };

  // Función para formatear fecha
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
  };

  // Función para manejar el pago de una comisión
  const handlePayCommission = () => {
    toast({
      title: "Comisión marcada como pagada",
      description: `La comisión #${commissionId} ha sido marcada como pagada.`,
    });
  };

  // Función para manejar la cancelación de una comisión
  const handleCancelCommission = () => {
    toast({
      title: "Comisión cancelada",
      description: `La comisión #${commissionId} ha sido cancelada.`,
    });
  };

  // Función para descargar el comprobante de comisión
  const handleDownloadReceipt = () => {
    toast({
      title: "Descargando comprobante",
      description: "El comprobante se está generando.",
    });
  };

  // Función para imprimir el comprobante de comisión
  const handlePrintReceipt = () => {
    toast({
      title: "Imprimiendo comprobante",
      description: "El comprobante se está enviando a imprimir.",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/commissions">
            <Button variant="ghost" size="sm" className="mr-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Detalles de Comisión</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadReceipt}>
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrintReceipt}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Cargando detalles de comisión...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Comisión #{commissionDetails.id}</CardTitle>
                <CardDescription>
                  Período: {formatDate(commissionDetails.weekStartDate)} al{" "}
                  {formatDate(commissionDetails.weekEndDate)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Empleado</p>
                    <p className="font-medium">{commissionDetails.userName}</p>
                    <p className="text-sm text-muted-foreground">
                      {commissionDetails.userRole === "driver"
                        ? "Conductor"
                        : "Ayudante"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ruta</p>
                    <p className="font-medium">
                      {commissionDetails.routeName || "Sin asignar"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Estado</p>
                    <Badge
                      variant={
                        commissionDetails.status === "pending"
                          ? "outline"
                          : commissionDetails.status === "paid"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {commissionDetails.status === "pending"
                        ? "Pendiente"
                        : commissionDetails.status === "paid"
                        ? "Pagada"
                        : "Cancelada"}
                    </Badge>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Detalle de Productos</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Orden #</TableHead>
                          <TableHead>Fecha Entrega</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Valor Comisión</TableHead>
                          <TableHead>Monto Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissionDetails.items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              No hay detalles de productos disponibles
                            </TableCell>
                          </TableRow>
                        ) : (
                          commissionDetails.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell>#{item.orderId}</TableCell>
                              <TableCell>{formatDate(item.deliveryDate)}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{formatCurrency(item.commissionValue)}</TableCell>
                              <TableCell>{formatCurrency(item.commissionAmount)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {commissionDetails.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Notas</h3>
                    <p className="text-muted-foreground">{commissionDetails.notes}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {commissionDetails.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelCommission}
                    >
                      Cancelar Comisión
                    </Button>
                    <Button onClick={handlePayCommission}>
                      Marcar como Pagada
                    </Button>
                  </>
                )}
                {commissionDetails.status === "paid" && (
                  <div className="ml-auto">
                    <p className="text-sm text-muted-foreground mb-1">
                      Pagada el {commissionDetails.paymentDate && formatDate(commissionDetails.paymentDate)}
                    </p>
                    {commissionDetails.paymentReference && (
                      <p className="text-sm">
                        Referencia: {commissionDetails.paymentReference}
                      </p>
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Productos Total</span>
                    <span>{commissionDetails.productCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Comisión</span>
                    <span>{formatCurrency(commissionDetails.totalAmount)}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold">
                      <span>Total a Pagar</span>
                      <span>{formatCurrency(commissionDetails.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionDetailsPage;