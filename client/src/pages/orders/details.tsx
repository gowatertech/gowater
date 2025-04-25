import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
// Importamos nuestro servicio de impresión
import { printOrderTicket, generateOrderPdf } from "./PrinterService";

// Iconos
import { 
  FileText, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  CircleX, 
  AlertTriangle,
  Printer,
  FileDown
} from "lucide-react";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OrderDetails() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [matches, params] = useRoute("/orders/details/:id");
  const pathname = window.location.pathname;
  const orderIdFromPath = pathname.split('/').pop();
  const orderId = params?.id ? parseInt(params.id) : orderIdFromPath ? parseInt(orderIdFromPath) : undefined;
  const [newStatus, setNewStatus] = useState<string>("");

  // Obtener los detalles del pedido
  const { data: order, isLoading: isOrderLoading } = useQuery<any>({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      console.log(`Obteniendo datos del pedido ${orderId} para mostrar detalles`);
      
      try {
        // Usamos apiRequest de nuestro queryClient para garantizar cookies y headers correctos
        const response = await fetch(`/api/orders/${orderId}`, {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error HTTP ${response.status} al cargar pedido: ${errorText}`);
          throw new Error(`Error al cargar el pedido: ${response.status} ${response.statusText}`);
        }
        
        const orderData = await response.json();
        console.log(`Datos del pedido ${orderId} obtenidos correctamente:`, orderData);
        return orderData;
      } catch (error) {
        console.error(`ERROR CRÍTICO al obtener pedido ${orderId}:`, error);
        throw new Error(`Error al obtener datos: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    enabled: !!orderId,
    retry: 2  // Intentar hasta 2 veces en caso de error
  });

  // Actualizar el estado inicial después de cargar el pedido
  useEffect(() => {
    if (order) {
      setNewStatus(order.status);
    }
  }, [order]);

  // Obtener los productos del pedido
  const { data: orderItems = [], isLoading: isItemsLoading } = useQuery<any[]>({
    queryKey: ["/api/orders", orderId, "items"],
    queryFn: async () => {
      if (!orderId) return [];
      
      console.log(`Obteniendo items del pedido ${orderId} para mostrar detalles`);
      
      // Usamos fetch directamente para tener mejor control del manejo de errores
      const response = await fetch(`/api/orders/${orderId}/items`, {
        credentials: "include",
        headers: {
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error HTTP ${response.status} al cargar los items: ${errorText}`);
        throw new Error(`Error al cargar los items del pedido: ${response.status} ${response.statusText}`);
      }
      
      const itemsData = await response.json();
      console.log(`Items del pedido ${orderId} obtenidos correctamente:`, itemsData);
      return itemsData;
    },
    enabled: !!orderId,
  });

  // Obtener clientes para mostrar nombres
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Obtener productos para mostrar nombres
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  // Obtener información de la empresa
  const { data: companySettings } = useQuery<any>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      return await apiRequest({
        url: `/api/settings`,
        method: "GET"
      });
    },
  });

  // Mutación para actualizar el estado del pedido
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      if (!orderId) throw new Error('ID de pedido no válido');
      
      return await apiRequest({
        url: `/api/orders/${orderId}/status`,
        method: "PATCH",
        data: { status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      
      const statusText = newStatus === "delivered" 
        ? "entregado" 
        : newStatus === "cancelled" 
          ? "cancelado" 
          : "pendiente";
          
      toast({
        title: "Estado actualizado",
        description: `El pedido ahora está ${statusText}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const handleUpdateStatus = () => {
    if (!newStatus) return;
    
    updateStatusMutation.mutate({
      status: newStatus
    });
  };

  // Funciones para imprimir y generar PDF
  const handlePrint = () => {
    try {
      // Verificar datos necesarios
      if (!order || !companySettings) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la información necesaria para imprimir",
        });
        return;
      }
      
      // Encontrar el cliente correspondiente al pedido
      const currentCustomer = order.customerId ? 
        customers.find((c: any) => c && c.id === order.customerId) : null;
      
      // Usar la función centralizada de impresión
      printOrderTicket(
        order,
        orderItems,
        currentCustomer,
        companySettings,
        products,
        toast
      );
    } catch (error: any) {
      console.error("Error en handlePrint:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al imprimir el pedido",
      });
    }
  };

  const handleDownload = () => {
    try {
      // Verificar datos necesarios
      if (!order || !companySettings) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la información necesaria para generar el PDF",
        });
        return;
      }

      // Encontrar el cliente correspondiente al pedido
      const currentCustomer = order.customerId ? 
        customers.find((c: any) => c && c.id === order.customerId) : null;
      
      // Usar la función centralizada para generar PDF
      generateOrderPdf(
        order,
        orderItems,
        currentCustomer,
        companySettings,
        products,
        toast,
        jsPDF
      );
    } catch (error: any) {
      console.error("Error en handleDownload:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al generar el PDF",
      });
    }
  };

  // Función para renderizar el estado con color apropiado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Entregado
        </Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Pendiente
        </Badge>;
      case "in_transit":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 flex items-center gap-1">
          <Clock className="h-3 w-3" /> En Tránsito
        </Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 flex items-center gap-1">
          <CircleX className="h-3 w-3" /> Cancelado
        </Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Desconocido
        </Badge>;
    }
  };

  if (isOrderLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No se encontró el pedido</p>
            <p className="text-sm text-muted-foreground mb-4">El pedido solicitado no existe o ha sido eliminado</p>
            <Button onClick={() => setLocation("/orders/list")}>
              Ir a la lista de pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Encontrar el cliente correspondiente al pedido, con validación
  const customer = order && order.customerId ? 
    customers.find((c: any) => c && c.id === order.customerId) : null;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Pedido #{order.id}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className={isMobile ? "flex-1" : ""}
          >
            <Printer className="h-4 w-4 mr-1" />
            Imprimir
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className={isMobile ? "flex-1" : ""}
          >
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setLocation("/orders/list")}
            className={isMobile ? "flex-1" : ""}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </div>
      </div>
      
      {/* Información de la empresa */}
      {companySettings && (
        <Card className="p-3 sm:p-4">
          <CardContent className="p-0 space-y-2">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-xl font-bold">{companySettings.name}</h2>
              <p className="text-sm">RNC: {companySettings.rnc}</p>
              <p className="text-sm">{companySettings.street} {companySettings.streetNumber}</p>
              <p className="text-sm">Tel: {companySettings.contactPhone}</p>
              <p className="text-sm">Email: {companySettings.email}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="p-3 sm:p-4">
        <CardContent className="p-0 space-y-4">
          {/* Información básica del pedido */}
          <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Cliente</div>
                <div className="font-medium text-sm">
                  {customer?.businessname || "Cliente"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Teléfono</div>
                <div className="text-sm">{order.customerPhone || "No disponible"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Fecha</div>
                <div className="text-sm">{new Date(order.date).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Dirección</div>
                <div className="text-sm">{order.customerAddress || "No especificada"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Municipio</div>
                <div className="text-sm">{order.municipalityName || "No especificado"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Provincia</div>
                <div className="text-sm">{order.provinceName || "No especificada"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Estado</div>
                <div>
                  {getStatusBadge(order.status)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Método de pago</div>
                <div className="text-sm">{order.paymentMethod === 'cash' ? 'Efectivo' : order.paymentMethod}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Total</div>
                <div className="text-sm font-semibold">RD$ {parseFloat(order.total).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Sección de notas */}
          <div className="space-y-1 sm:space-y-2">
            <div className="text-sm font-medium">Notas</div>
            <p className="text-sm bg-muted/20 rounded-lg p-2">{order.notes || "Sin notas"}</p>
          </div>

          {/* Productos - Vista Móvil */}
          <div className="space-y-2 block md:hidden">
            <div className="text-sm font-medium">Detalles de Productos</div>
            {orderItems.length === 0 ? (
              <div className="py-4 text-center">No hay detalles disponibles</div>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item: any) => (
                  <Card key={item.productId} className="p-3">
                    <div className="space-y-2">
                      <div className="font-medium">
                        {products.find((p: any) => p.id === item.productId)?.name || "Producto"}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">Cantidad</div>
                          <div>{item.quantity}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Precio</div>
                          <div>RD$ {parseFloat(item.price).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Total</div>
                          <div className="font-medium">RD$ {(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Productos - Vista Desktop */}
          <div className="space-y-2 hidden md:block">
            <div className="text-sm font-medium">Detalles de Productos</div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="py-2">Producto</TableHead>
                    <TableHead className="py-2 text-right">Cantidad</TableHead>
                    <TableHead className="py-2 text-right">Precio</TableHead>
                    <TableHead className="py-2 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center p-3">
                        No hay detalles disponibles
                      </TableCell>
                    </TableRow>
                  ) : (
                    orderItems.map((item: any) => (
                      <TableRow key={item.productId}>
                        <TableCell className="p-2">
                          {products.find((p: any) => p.id === item.productId)?.name || "Producto"}
                        </TableCell>
                        <TableCell className="text-right p-2">{item.quantity}</TableCell>
                        <TableCell className="text-right p-2">RD$ {parseFloat(item.price).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium p-2">
                          RD$ {(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div></div>
            <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between text-sm font-medium">
                <span>Total:</span>
                <span>RD$ {parseFloat(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Cambiar Estado */}
          <div className="space-y-2 border rounded-lg p-3 sm:p-4 mt-4">
            <h3 className="font-medium">Actualizar Estado</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select 
                value={newStatus} 
                onValueChange={setNewStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>Pendiente</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="delivered">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Entregado</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <div className="flex items-center gap-2">
                      <CircleX className="h-4 w-4 text-red-500" />
                      <span>Cancelado</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="w-full sm:w-auto"
                onClick={handleUpdateStatus}
                disabled={updateStatusMutation.isPending || newStatus === order.status}
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Estado"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}