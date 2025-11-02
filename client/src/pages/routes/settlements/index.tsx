import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleLoading, User, Truck } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { formatDateRD } from "@/lib/date-utils";

interface LoadingWithRelations extends VehicleLoading {
  truck: Truck;
  driver: User;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number | null;
    notes: string | null;
  }>;
}

export default function RouteSettlementPage() {
  // Obtener cargas pendientes de cuadre
  const { data: pendingLoads = [], isLoading } = useQuery<LoadingWithRelations[]>({
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Cuadre de Ruta</h1>
      </div>

      <div className="bg-yellow-50 border border-yellow-300 p-4 mb-6 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
          <h2 className="font-medium text-yellow-700">Módulo en desarrollo</h2>
        </div>
        <p className="mt-2 text-yellow-600">
          El módulo de cuadre de ruta se encuentra en desarrollo. En breve estará disponible.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pendingLoads.map((loading) => (
          <Card
            key={loading.id}
            className="hover:bg-accent/5"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                #{loading.loadingNumber}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Conductor: {loading.driver?.name}
                </p>
                <p className="text-muted-foreground">
                  Vehículo: {loading.truck?.plate}
                </p>
                <p className="text-muted-foreground">
                  Fecha: {formatDateRD(loading.date, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-muted-foreground">
                  Efectivo inicial: RD$ {loading.initialCash}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {!isLoading && pendingLoads.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No hay cargas pendientes de cuadre
          </div>
        )}
      </div>
    </div>
  );
}