import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RouteSettlementForm } from "@/components/RouteSettlementForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { VehicleLoading } from "@shared/schema";

export default function RouteSettlementPage() {
  const [selectedLoadingId, setSelectedLoadingId] = useState<number | null>(null);
  const { toast } = useToast();

  // Obtener cargas pendientes de cuadre
  const { data: pendingLoads = [], isLoading } = useQuery<VehicleLoading[]>({
    queryKey: ["/api/vehicle-loading/pending"],
  });

  const handleSettlementSuccess = () => {
    toast({
      description: "Cuadre de ruta registrado exitosamente",
      duration: 3000,
    });
    setSelectedLoadingId(null);
  };

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
                  Vehículo: {loading.truckId}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Fecha: {new Date(loading.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Estado: {loading.status}
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