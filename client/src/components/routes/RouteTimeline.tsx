import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "@shared/schema";
import { format } from "date-fns";
import { Package, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RouteTimelineProps {
  route: Route;
  className?: string;
}

interface OrderProduct {
  id: number;
  productId: number;
  quantity: number;
  price: string;
  name: string;
  isReturnable: boolean;
}

interface RouteOrder {
  id: number;
  deliverySequence: number | null;
  customerName: string;
  street: string;
  streetnumber: string;
  total: string;
  products: OrderProduct[];
}

export default function RouteTimeline({ route, className }: RouteTimelineProps) {
  const { t } = useTranslation();
  const [selectedStopOrders, setSelectedStopOrders] = useState<RouteOrder[] | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);

  // Consultar las órdenes de la ruta
  const { data: orders = [] } = useQuery<RouteOrder[]>({
    queryKey: [`/api/routes/${route.id}/orders`],
    enabled: !!route.id,
  });

  const handleDeliveryClick = (stopOrders: RouteOrder[]) => {
    setSelectedStopOrders(stopOrders);
    setIsProductDialogOpen(true);
  };

  // Verificar si la ruta tiene paradas
  if (!route.stops || !Array.isArray(route.stops) || route.stops.length === 0) {
    return (
      <div className={className}>
        <h3 className="font-medium mb-4">{t("timeline")}</h3>
        <div className="p-4 text-center text-muted-foreground">
          No hay paradas programadas para esta ruta
        </div>
      </div>
    );
  }

  // Agrupar órdenes por secuencia de entrega
  const ordersBySequence = new Map<number, RouteOrder[]>();
  orders.forEach(order => {
    // Solo agrupar órdenes con delivery_sequence válida
    if (order.deliverySequence !== null && order.deliverySequence !== undefined) {
      const seq = order.deliverySequence;
      if (!ordersBySequence.has(seq)) {
        ordersBySequence.set(seq, []);
      }
      ordersBySequence.get(seq)?.push(order);
    }
  });

  return (
    <div className={className}>
      <h3 className="font-medium mb-4">{t("timeline")}</h3>
      <div className="space-y-4">
        {/* Punto de inicio - Almacén */}
        <div className="flex items-start gap-2">
          <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">
            0
          </div>
          <div className="flex-1">
            <p className="font-medium">Punto de inicio (Almacén)</p>
            {route.date && (
              <p className="text-sm text-muted-foreground">
                {format(new Date(route.date), "dd MMM yyyy")}
              </p>
            )}
          </div>
        </div>

        {/* Paradas de entrega */}
        {route.stops.map((stop, index) => {
          // route.stops[0] corresponde a deliverySequence=1, stops[1] a deliverySequence=2, etc.
          const deliverySequence = index + 1;
          const stopName = `Parada #${deliverySequence}`;
          const stopOrders = ordersBySequence.get(deliverySequence) || [];
          const deliveryCount = stopOrders.length;
          
          // Obtener datos del primer pedido de la parada para mostrar cliente y dirección
          const firstOrder = stopOrders[0];

          return (
            <div key={index} className="flex items-start gap-3">
              <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                {deliverySequence}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium">{stopName}</p>
                    {firstOrder && (
                      <>
                        <p className="text-sm font-medium text-foreground mt-1">
                          {firstOrder.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {firstOrder.street} {firstOrder.streetnumber}
                        </p>
                      </>
                    )}
                  </div>
                  {deliveryCount > 0 && (
                    <button
                      onClick={() => handleDeliveryClick(stopOrders)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                      data-testid={`button-view-deliveries-${deliverySequence}`}
                    >
                      <Package className="h-4 w-4" />
                      <span>{deliveryCount} {deliveryCount === 1 ? 'entrega' : 'entregas'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Diálogo para mostrar productos de las entregas */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalle de Productos
            </DialogTitle>
          </DialogHeader>
          
          {selectedStopOrders && selectedStopOrders.length > 0 && (
            <div className="space-y-4">
              {selectedStopOrders.map((order, orderIndex) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-lg">{order.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.street} {order.streetnumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Pedido #{order.id}</p>
                      <p className="font-medium">Total: RD${parseFloat(order.total).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Productos:</p>
                    <div className="space-y-2">
                      {order.products.map((product) => (
                        <div key={product.id} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{product.name}</span>
                            {product.isReturnable && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                Retornable
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-medium">x{product.quantity}</span>
                            <span className="text-muted-foreground ml-2">
                              RD${parseFloat(product.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
