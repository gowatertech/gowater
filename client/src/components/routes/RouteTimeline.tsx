import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "@shared/schema";
import { format } from "date-fns";
import { Package } from "lucide-react";

interface RouteTimelineProps {
  route: Route;
  className?: string;
}

interface RouteOrder {
  id: number;
  deliverySequence: number | null;
  customerName: string;
  total: string;
}

export default function RouteTimeline({ route, className }: RouteTimelineProps) {
  const { t } = useTranslation();

  // Consultar las órdenes de la ruta
  const { data: orders = [] } = useQuery<RouteOrder[]>({
    queryKey: ["/api/routes", route.id, "orders"],
    queryFn: async () => {
      const response = await fetch(`/api/routes/${route.id}/orders`);
      if (!response.ok) throw new Error("Error al cargar órdenes");
      return response.json();
    },
    enabled: !!route.id,
  });

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
        {route.stops.map((stop, index) => {
          // Para cada parada, mostrar su número de secuencia
          let stopName = `Parada #${index + 1}`;
          if (index === 0) {
            stopName = "Punto de inicio (Almacén)";
          }

          // Punto de inicio no tiene entregas, solo mostrar la parada
          if (index === 0) {
            return (
              <div key={index} className="flex items-start gap-2">
                <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">
                  {index}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{stopName}</p>
                  {route.date && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(route.date), "dd MMM yyyy")}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          // Para paradas normales (índice 1, 2, 3...), delivery_sequence también es 1, 2, 3...
          const stopOrders = ordersBySequence.get(index) || [];
          const deliveryCount = stopOrders.length;

          return (
            <div key={index} className="flex items-start gap-2">
              <div className={`min-w-[24px] h-6 flex items-center justify-center rounded-full ${
                index === 0 ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
              } text-xs`}>
                {index}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{stopName}</p>
                  {deliveryCount > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Package className="h-3 w-3" />
                      <span>{deliveryCount} {deliveryCount === 1 ? 'entrega' : 'entregas'}</span>
                    </div>
                  )}
                </div>
                {route.date && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(route.date), "dd MMM yyyy")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
