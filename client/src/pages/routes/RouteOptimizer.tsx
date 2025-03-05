import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Order, type Route } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Componentes UI
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

export default function RouteOptimizer() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);

  // Consultas
  const { data: routes } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/orders");
      const orders = await response.json();
      return orders.filter((o: Order) => o.status === "pending");
    },
  });

  // Mutaciones
  const optimizeRouteMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      const response = await apiRequest("POST", "/api/routes/optimize", { orderIds });
      return response.json();
    },
    onSuccess: (data) => {
      setOptimizedRoute(data);
      toast({
        title: t("success"),
        description: t("routeOptimized"),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const handleOptimizeRoute = () => {
    if (selectedOrderIds.length === 0) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("selectOrdersFirst"),
      });
      return;
    }
    optimizeRouteMutation.mutate(selectedOrderIds);
  };

  return (
    <div className="p-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto">{t("optimizeRoute")}</Button>
        </DialogTrigger>
        <DialogContent className="w-[98vw] sm:w-[90vw] max-w-2xl p-2 sm:p-4 gap-3">
          <DialogHeader>
            <DialogTitle>{t("selectOrders")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <ScrollArea className="h-[35vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">✓</TableHead>
                      <TableHead>{t("order")}</TableHead>
                      <TableHead>{t("client")}</TableHead>
                      <TableHead>{t("address")}</TableHead>
                      <TableHead>{t("date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer"
                        onClick={() => {
                          if (selectedOrderIds.includes(order.id)) {
                            setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                          } else {
                            setSelectedOrderIds([...selectedOrderIds, order.id]);
                          }
                        }}
                      >
                        <TableCell className="text-center">
                          {selectedOrderIds.includes(order.id) ? "✓" : ""}
                        </TableCell>
                        <TableCell>#{order.id}</TableCell>
                        <TableCell>{order.customerId}</TableCell>
                        <TableCell>{order.deliveryCoordinates || "N/A"}</TableCell>
                        <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <Button
              className="w-full"
              onClick={handleOptimizeRoute}
              disabled={selectedOrderIds.length === 0}
            >
              {optimizeRouteMutation.isPending ? t("optimizing") : t("optimizeRoute")}
            </Button>

            {optimizedRoute && (
              <Card className="p-4 space-y-2">
                <h3 className="font-medium">{t("optimizationResults")}</h3>
                <p>{t("totalDistance")}: {optimizedRoute.totalDistance} km</p>
                <p>{t("estimatedDuration")}: {optimizedRoute.estimatedDuration} min</p>
                <p>{t("sequence")}: {optimizedRoute.sequence.join(" → ")}</p>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabla de Rutas */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("route")}</TableHead>
                  <TableHead>{t("driver")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("orders")}</TableHead>
                  <TableHead>{t("progress")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes?.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell>#{route.id}</TableCell>
                    <TableCell>{route.driverId}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        route.status === "completed" ? "bg-green-100 text-green-800" :
                          route.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                            "bg-yellow-100 text-yellow-800"
                      }`}>
                        {t(route.status)}
                      </span>
                    </TableCell>
                    <TableCell>{route.deliverySequence?.length || 0}</TableCell>
                    <TableCell>
                      {route.status === "in_progress" && (
                        <span>
                          {route.currentLocation || t("noLocation")}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {route.lastUpdate ? new Date(route.lastUpdate).toLocaleString() : ""}
                          </span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
