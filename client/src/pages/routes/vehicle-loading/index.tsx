import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Truck, AlertCircle } from "lucide-react";
import type { VehicleLoading, Product, User, Truck as TruckType } from "@shared/schema";
import { VehicleLoadingForm } from "./VehicleLoadingForm";
import { Loader2 } from "lucide-react";

interface LoadingWithRelations extends VehicleLoading {
  truck: TruckType;
  driver: User;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number | null;
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
  const [selectedLoadingId, setSelectedLoadingId] = useState<number | null>(null);

  const { data: loadings = [], isLoading, error } = useQuery<LoadingWithRelations[]>({
    queryKey: ["/api/vehicle-loading"],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    console.error("Error loading data:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-red-500">Error al cargar los datos</p>
      </div>
    );
  }

  const selectedLoading = loadings.find(loading => loading.id === selectedLoadingId);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
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

      {/* Formulario de nueva carga */}
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

      {/* Lista de cargas o detalles de una carga */}
      {selectedLoading ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Detalles de Carga #{selectedLoading.loadingNumber}</CardTitle>
              <Button 
                variant="ghost"
                onClick={() => setSelectedLoadingId(null)}
              >
                Volver a la lista
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Información General */}
              <div>
                <h3 className="font-medium mb-3">Información General</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Fecha</p>
                    <p className="font-medium">{new Date(selectedLoading.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className="font-medium capitalize">
                      {selectedLoading.status === "completed" ? "Completado" :
                       selectedLoading.status === "in_progress" ? "En Progreso" :
                       selectedLoading.status === "cancelled" ? "Cancelado" :
                       "Pendiente"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Conductor</p>
                    <p className="font-medium">{selectedLoading.driver?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vehículo</p>
                    <p className="font-medium">{selectedLoading.truck?.plate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Efectivo Inicial</p>
                    <p className="font-medium">RD$ {selectedLoading.initialCash}</p>
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div>
                <h3 className="font-medium mb-3">Productos Cargados</h3>
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
                      {selectedLoading.items && selectedLoading.items.length > 0 ? (
                        selectedLoading.items.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="px-4 py-2">{item.product?.name}</td>
                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-right">{item.returnedQuantity || 0}</td>
                            <td className="px-4 py-2 text-right">RD$ {item.product?.price}</td>
                            <td className="px-4 py-2 text-right">
                              RD$ {(item.product?.price && !isNaN(parseFloat(item.product.price)) ? 
                                (parseFloat(item.product.price) * item.quantity).toFixed(2) : '0.00')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-center text-gray-500">
                            No hay productos cargados
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {selectedLoading.items && selectedLoading.items.length > 0 && (
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-right font-medium">Total</td>
                          <td className="px-4 py-2 text-right font-medium">
                            RD$ {selectedLoading.items.reduce((sum, item) => {
                              const price = item.product?.price && !isNaN(parseFloat(item.product.price)) ? 
                                parseFloat(item.product.price) : 0;
                              return sum + (price * item.quantity);
                            }, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Notas */}
              {selectedLoading.notes && (
                <div>
                  <h3 className="font-medium mb-2">Notas</h3>
                  <p className="text-gray-600">{selectedLoading.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadings.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">No hay cargas registradas</p>
            </div>
          ) : (
            loadings.map((loading) => (
              <Card 
                key={loading.id} 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedLoadingId(loading.id)}
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
                  <p className="text-sm text-gray-600">
                    Productos: {loading.items?.length || 0}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}