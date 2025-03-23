import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Truck, AlertCircle } from "lucide-react";
import type { VehicleLoading, Product, User, Truck as TruckType } from "@shared/schema";
import { Loader2 } from "lucide-react";
import VehicleSettlementForm from "./VehicleSettlementForm";

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

export default function VehicleSettlementPage() {
  const [selectedLoadingId, setSelectedLoadingId] = useState<number | null>(null);

  // Obtener solo cargas pendientes
  const { data: loadings = [], isLoading, error } = useQuery<LoadingWithRelations[]>({
    queryKey: ["/api/vehicle-loading/pending"],
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
          <Calculator className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Cuadre de Vehículo</h1>
        </div>
        
        {selectedLoadingId && (
          <Button 
            variant="outline"
            onClick={() => setSelectedLoadingId(null)}
          >
            Volver a la lista
          </Button>
        )}
      </div>

      {/* Lista de cargas o formulario de cuadre */}
      {selectedLoading ? (
        <VehicleSettlementForm 
          loading={selectedLoading}
          onSuccess={() => setSelectedLoadingId(null)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadings.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">No hay cargas pendientes para cuadrar</p>
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