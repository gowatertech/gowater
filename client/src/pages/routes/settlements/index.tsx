import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RouteSettlementForm } from "@/components/RouteSettlementForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { VehicleLoading, User, Truck } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface LoadingWithRelations extends VehicleLoading {
  truck: Truck;
  driver: User;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number;
    notes: string | null;
  }>;
}

export default function RouteSettlementPage() {
  const [selectedLoadingId, setSelectedLoadingId] = useState<number | null>(null);
  const { toast } = useToast();

  // Obtener cargas pendientes de cuadre
  const { data: pendingLoads = [], isLoading } = useQuery<LoadingWithRelations[]>({
    queryKey: ["/api/vehicle-loading/pending"],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const handleSettlementSuccess = () => {
    toast({
      description: "Cuadre de ruta registrado exitosamente",
      duration: 3000,
    });
    setSelectedLoadingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Cuadre de Ruta</h1>

      {selectedLoadingId ? (
        <RouteSettlementForm
          vehicleLoadingId={selectedLoadingId}
          onSuccess={handleSettlementSuccess}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingLoads.map((loading) => (
            <Card
              key={loading.id}
              className="cursor-pointer hover:bg-accent/5"
              onClick={() => setSelectedLoadingId(loading.id)}
            >
              <CardHeader>
                <CardTitle className="text-lg">
                  Vehículo: {loading.truck?.plate || loading.truckId}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Conductor: {loading.driver?.name || loading.driverId}
                </p>
                <p className="text-sm text-muted-foreground">
                  Fecha: {new Date(loading.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Productos: {loading.items?.length || 0}
                </p>
              </CardContent>
            </Card>
          ))}

          {!isLoading && pendingLoads.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No hay cargas pendientes de cuadre
            </div>
          )}
        </div>
      )}
    </div>
  );
}