import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RouteSettlementForm } from "@/components/RouteSettlementForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { VehicleLoading, User, Truck } from "@shared/schema";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Cuadre de Ruta</h1>
        {selectedLoadingId && (
          <Button variant="ghost" onClick={() => setSelectedLoadingId(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        )}
      </div>

      {selectedLoadingId ? (
        <>
          {console.log("Cargando formulario para vehicleLoadingId:", selectedLoadingId)}
          <RouteSettlementForm
            vehicleLoadingId={selectedLoadingId}
            onSuccess={handleSettlementSuccess}
          />
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingLoads.map((loading) => (
            <Card
              key={loading.id}
              className="cursor-pointer hover:bg-accent/5"
              onClick={() => setSelectedLoadingId(loading.id)}
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
                    Fecha: {new Date(loading.date).toLocaleDateString()}
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
      )}
    </div>
  );
}