import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Trucks() {
  const { t } = useTranslation();
  const [selectedTruck, setSelectedTruck] = useState(null);

  // Obtener lista de vehículos
  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ["/api/trucks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/trucks");
      if (!response.ok) {
        throw new Error("Error al cargar vehículos");
      }
      return response.json();
    },
  });

  return (
    <div className="space-y-2 p-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">{t("Vehículos")}</h1>
        </div>
        <Button size="sm" variant="outline" className="h-8">
          <Plus className="h-4 w-4 mr-1" />
          {t("Agregar Vehículo")}
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {isLoading ? (
          <div className="col-span-full text-center py-4 text-sm text-muted-foreground">
            {t("Cargando vehículos...")}
          </div>
        ) : trucks.length === 0 ? (
          <div className="col-span-full text-center py-4 text-sm text-muted-foreground">
            {t("No hay vehículos registrados")}
          </div>
        ) : (
          trucks.map((truck) => (
            <Card
              key={truck.id}
              className={`p-3 cursor-pointer transition-all hover:border-primary/30 ${
                selectedTruck?.id === truck.id ? "border-primary/50 shadow-md" : ""
              }`}
              onClick={() => setSelectedTruck(truck)}
            >
              <div className="flex items-start gap-2">
                <Truck className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">{truck.plate}</h3>
                  <p className="text-xs text-muted-foreground">
                    {truck.model} - {truck.capacity}L
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      truck.status === "available"
                        ? "bg-green-100 text-green-700"
                        : truck.status === "maintenance"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {t(truck.status)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
