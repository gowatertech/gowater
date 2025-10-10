import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, User, MapPin, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: number;
  businessname: string;
  managername: string;
  phone: string;
  street: string;
  streetnumber: string;
  sector: string;
  city: string;
}

interface OrderItem {
  productId: number;
  code: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export default function NuevoPedidoPaso3() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener datos del sessionStorage
  const selectedCustomer = useMemo(() => {
    const customerData = sessionStorage.getItem("nuevoPedido_cliente");
    if (!customerData) {
      setLocation("/mobile-app/nuevo-pedido/paso1");
      return null;
    }
    return JSON.parse(customerData) as Customer;
  }, [setLocation]);

  const orderItems = useMemo(() => {
    const itemsData = sessionStorage.getItem("nuevoPedido_items");
    if (!itemsData) {
      setLocation("/mobile-app/nuevo-pedido/paso2");
      return [];
    }
    return JSON.parse(itemsData) as OrderItem[];
  }, [setLocation]);

  const totalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  }, [orderItems]);

  // Calcular ITBIS (18%)
  const subtotal = totalAmount / 1.18;
  const itbis = totalAmount - subtotal;

  // Mutación para crear el pedido
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        customerId: selectedCustomer?.id,
        total: totalAmount,
        paymentMethod: "cash",
        orderDate: new Date().toISOString().split('T')[0],
        notes: "",
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        }))
      };

      return apiRequest({
        method: "POST",
        url: "/api/orders",
        data: orderData
      });
    },
    onSuccess: () => {
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/orders"] });
      
      // Limpiar sessionStorage
      sessionStorage.removeItem("nuevoPedido_cliente");
      sessionStorage.removeItem("nuevoPedido_items");
      sessionStorage.removeItem("nuevoPedido_total");
      
      // Mostrar éxito
      toast({
        title: "¡Pedido creado!",
        description: "El pedido se ha registrado exitosamente",
      });
      
      // Redirigir al dashboard
      setLocation("/mobile-app");
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear pedido",
        description: error.message || "No se pudo crear el pedido. Intenta de nuevo.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  });

  const handleCreateOrder = async () => {
    setIsSubmitting(true);
    createOrderMutation.mutate();
  };

  if (!selectedCustomer || orderItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/mobile-app/nuevo-pedido/paso2")}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            disabled={isSubmitting}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Nuevo Pedido</h1>
            <p className="text-xs opacity-90">Paso 3 de 3: Confirmar Pedido</p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="container max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Información del cliente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold" data-testid="text-cliente-nombre">
              {selectedCustomer.businessname}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-cliente-manager">
              {selectedCustomer.managername}
            </p>
            <div className="flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span data-testid="text-cliente-direccion">
                {selectedCustomer.street} #{selectedCustomer.streetnumber}
                {selectedCustomer.sector && `, ${selectedCustomer.sector}`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Productos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orderItems.map((item) => (
              <div key={item.productId} className="flex justify-between items-start" data-testid={`row-producto-${item.productId}`}>
                <div className="flex-1">
                  <p className="font-medium" data-testid={`text-producto-nombre-${item.productId}`}>
                    {item.description}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid={`text-producto-cantidad-${item.productId}`}>
                    {item.quantity} × RD$ {item.price.toFixed(2)}
                  </p>
                </div>
                <p className="font-semibold" data-testid={`text-producto-total-${item.productId}`}>
                  RD$ {item.total.toFixed(2)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Resumen de costos */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span data-testid="text-subtotal">RD$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ITBIS (18%)</span>
              <span data-testid="text-itbis">RD$ {itbis.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span data-testid="text-total">RD$ {totalAmount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método de pago:</span>
                <span className="font-medium">Efectivo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium">
                  {new Date().toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer fijo con botón de crear */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t shadow-lg p-4">
        <div className="container max-w-md mx-auto">
          <Button
            size="lg"
            className="w-full h-14"
            onClick={handleCreateOrder}
            disabled={isSubmitting}
            data-testid="button-create-order"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full mr-2"></div>
                Creando pedido...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Crear Pedido
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
