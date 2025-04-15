import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { VehicleLoading, Product, User, Truck } from "@shared/schema";

interface LoadingWithRelations extends VehicleLoading {
  truck: Truck;
  driver: User;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number;
    notes: string | null;
    product: Product;
  }>;
}

interface VehicleLoadingDetailsProps {
  loadingId: number;
}

export function VehicleLoadingDetails({ loadingId }: VehicleLoadingDetailsProps) {
  const { data: loading, isLoading } = useQuery<LoadingWithRelations>({
    queryKey: ["/api/vehicle-loading", loadingId],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!loading) {
    return <div>No se encontró la carga</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Carga #{loading.loadingNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm font-medium">Fecha:</span>
              <span className="ml-2">
                {new Date(loading.date).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium">Vehículo:</span>
              <span className="ml-2">{loading.truck?.plate}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Conductor:</span>
              <span className="ml-2">{loading.driver?.name}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Estado:</span>
              <span className="ml-2 capitalize">{loading.status}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Efectivo Inicial:</span>
              <span className="ml-2">${loading.initialCash}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos Cargados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Producto</th>
                  <th className="text-right p-2">Precio</th>
                  <th className="text-right p-2">Cantidad</th>
                  <th className="text-right p-2">Devuelto</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{item.product.name}</td>
                    <td className="text-right p-2">${item.product.price}</td>
                    <td className="text-right p-2">{item.quantity}</td>
                    <td className="text-right p-2">{item.returnedQuantity || 0}</td>
                    <td className="text-right p-2">
                      ${(
                        parseFloat(item.product.price) * item.quantity
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td colSpan={4} className="p-2 text-right">
                    Total:
                  </td>
                  <td className="p-2 text-right">
                    ${loading.items
                      .reduce(
                        (sum, item) =>
                          sum + parseFloat(item.product.price) * item.quantity,
                        0
                      )
                      .toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {loading.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{loading.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
