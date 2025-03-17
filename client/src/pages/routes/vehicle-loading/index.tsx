import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Truck, Eye } from "lucide-react";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { VehicleLoading, Product, User, Truck as TruckType } from "@shared/schema";
import { VehicleLoadingForm } from "./VehicleLoadingForm";

interface LoadingWithRelations extends VehicleLoading {
  truck: TruckType;
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

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function VehicleLoadingPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedLoading, setSelectedLoading] = useState<LoadingWithRelations | null>(null);

  const { data: loadings = [], isLoading } = useQuery<LoadingWithRelations[]>({
    queryKey: ["/api/vehicle-loading"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Carga de Vehículos</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Carga
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Nueva Carga de Vehículo</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowForm(false)}
            >
              ✕
            </Button>
          </div>
          <VehicleLoadingForm 
            onSuccess={() => setShowForm(false)} 
          />
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loadings.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">No hay cargas registradas</p>
          </div>
        ) : (
          loadings.map((loading) => (
            <Card 
              key={loading.id} 
              className="p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">#{loading.loadingNumber}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loading.status)}`}>
                    {loading.status === "completed" ? "Completado" :
                     loading.status === "in_progress" ? "En Progreso" :
                     loading.status === "cancelled" ? "Cancelado" :
                     "Pendiente"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Fecha: {new Date(loading.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Conductor: {loading.driver?.name || loading.driverId}
                </p>
                <p className="text-sm text-gray-600">
                  Vehículo: {loading.truck?.plate || loading.truckId}
                </p>
                <p className="text-sm text-gray-600">
                  Efectivo inicial: RD$ {loading.initialCash}
                </p>
                <div className="mt-2 flex justify-end">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => setSelectedLoading(loading)}
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalles
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[90%] sm:w-[600px]">
                      <SheetHeader>
                        <SheetTitle>Detalles de Carga #{loading.loadingNumber}</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6 space-y-6">
                        {/* Información General */}
                        <div className="space-y-2">
                          <h3 className="font-medium">Información General</h3>
                          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                              <p className="text-sm text-gray-600">Fecha</p>
                              <p className="font-medium">{new Date(loading.date).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Estado</p>
                              <p className="font-medium capitalize">{loading.status}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Conductor</p>
                              <p className="font-medium">{loading.driver?.name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Vehículo</p>
                              <p className="font-medium">{loading.truck?.plate}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Efectivo Inicial</p>
                              <p className="font-medium">RD$ {loading.initialCash}</p>
                            </div>
                          </div>
                        </div>

                        {/* Productos */}
                        <div className="space-y-2">
                          <h3 className="font-medium">Productos Cargados</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left">Producto</th>
                                  <th className="px-4 py-2 text-right">Cantidad</th>
                                  <th className="px-4 py-2 text-right">Devuelto</th>
                                  <th className="px-4 py-2 text-right">Precio</th>
                                  <th className="px-4 py-2 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {loading.items.map((item) => (
                                  <tr key={item.id} className="border-b">
                                    <td className="px-4 py-2">{item.product.name}</td>
                                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                                    <td className="px-4 py-2 text-right">{item.returnedQuantity || 0}</td>
                                    <td className="px-4 py-2 text-right">RD$ {item.product.price}</td>
                                    <td className="px-4 py-2 text-right">
                                      RD$ {(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-50">
                                <tr>
                                  <td colSpan={4} className="px-4 py-2 text-right font-medium">Total</td>
                                  <td className="px-4 py-2 text-right font-medium">
                                    RD$ {loading.items.reduce((sum, item) => 
                                      sum + (parseFloat(item.product.price) * item.quantity), 0
                                    ).toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {loading.notes && (
                          <div className="space-y-2">
                            <h3 className="font-medium">Notas</h3>
                            <p className="text-gray-600">{loading.notes}</p>
                          </div>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}