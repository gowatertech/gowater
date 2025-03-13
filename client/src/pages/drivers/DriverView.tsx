import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Truck, DollarSign, TrendingUp } from "lucide-react";

export default function DriverView() {
  // Consultas para obtener datos del conductor
  const { data: todayDeliveries = [] } = useQuery({
    queryKey: ["/api/driver/deliveries/today"],
  });

  const { data: cashBalance = { initialBalance: "0.00", cashIn: "0.00", cashOut: "0.00", finalBalance: "0.00" } } = useQuery({
    queryKey: ["/api/driver/cash-balance"],
  });

  const { data: performance = { deliveredOrders: 0, totalOrders: 0, onTimeDeliveries: 0 } } = useQuery({
    queryKey: ["/api/driver/performance"],
  });

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Entregas del día */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold">Entregas del Día</h2>
          </div>
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayDeliveries.map((delivery: any) => (
                  <TableRow key={delivery.id}>
                    <TableCell>{delivery.customerName}</TableCell>
                    <TableCell>{new Date(delivery.estimatedTime).toLocaleTimeString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        delivery.status === 'delivered' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {delivery.status === 'delivered' ? 'Entregado' : 'Pendiente'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>

        {/* Balance de Efectivo */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold">Balance de Efectivo</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Balance Inicial:</span>
              <span className="font-medium">${cashBalance.initialBalance}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ingresos:</span>
              <span className="font-medium text-green-600">+${cashBalance.cashIn}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Salidas:</span>
              <span className="font-medium text-red-600">-${cashBalance.cashOut}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Balance Final:</span>
                <span className="font-bold">${cashBalance.finalBalance}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Estadísticas y Rendimiento */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <h2 className="font-semibold">Estadísticas y Rendimiento</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Entregas Completadas</p>
              <p className="text-2xl font-bold">{performance.deliveredOrders}/{performance.totalOrders}</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-purple-600 h-2.5 rounded-full" 
                  style={{ width: `${(performance.deliveredOrders / performance.totalOrders) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Entregas a Tiempo</p>
              <p className="text-2xl font-bold">{performance.onTimeDeliveries}/{performance.deliveredOrders}</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-600 h-2.5 rounded-full" 
                  style={{ width: `${(performance.onTimeDeliveries / performance.deliveredOrders) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
