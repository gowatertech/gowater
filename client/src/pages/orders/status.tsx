import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Iconos
import { 
  FileText, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  CircleX, 
  AlertTriangle,
  Tag
} from "lucide-react";

// Componentes UI
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OrderStatus() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [, params] = useRoute("/orders/status/:id");
  const orderId = params?.id ? parseInt(params.id) : undefined;
  const [newStatus, setNewStatus] = useState<string>("");

  // Obtener los detalles del pedido
  const { data: order, isLoading: isOrderLoading } = useQuery<any>({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      return apiRequest({
        method: "GET",
        url: `/api/orders/${orderId}`
      });
    },
    enabled: !!orderId,
  });

  // Actualizar el estado inicial después de cargar el pedido
  useEffect(() => {
    if (order) {
      setNewStatus(order.status);
    }
  }, [order]);

  // Mutación para actualizar el estado del pedido
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      if (!orderId) throw new Error('ID de pedido no válido');
      
      // La forma correcta de llamar a apiRequest según su definición
      return apiRequest({
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
          : newStatus === "in_transit"
            ? "en tránsito"
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

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Estado de Pedido #{order.id}
        </h1>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => setLocation("/orders/list")}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la Lista
        </Button>
      </div>

      <Card className="p-3 sm:p-4">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Actualizar Estado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Cliente</div>
                <div className="font-medium text-sm">
                  {order.customerName || "Cliente"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Fecha</div>
                <div className="text-sm">{new Date(order.date).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Estado Actual</div>
                <div>
                  {getStatusBadge(order.status)}
                </div>
              </div>
            </div>
          </div>

          {/* Información del Pedido */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Información del Pedido</div>
            <div className="border rounded-lg p-3 sm:p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="font-medium">RD$ {parseFloat(order.total).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Método de Pago</div>
                  <div>{order.paymentMethod === "cash" ? "Efectivo" : order.paymentMethod}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Dirección</div>
                <div>{order.customerAddress}</div>
              </div>
            </div>
          </div>

          {/* Selección de Estado */}
          <div className="space-y-2 border rounded-lg p-3 sm:p-4">
            <h3 className="font-medium">Cambiar Estado del Pedido</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Selecciona el nuevo estado para este pedido. Esta acción actualizará el estado del pedido en el sistema.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
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
                    <SelectItem value="in_transit">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>En Tránsito</span>
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
              </div>
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

          {/* Historial de Cambios (placeholder) */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Historial de Cambios de Estado</div>
            <div className="border rounded-lg p-3 sm:p-4">
              <div className="text-sm text-muted-foreground text-center">
                El historial de cambios de estado estará disponible próximamente.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}