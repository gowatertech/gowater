import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Truck as TruckType } from "@shared/schema";
import { TruckForm } from "./components/TruckForm";

export default function Trucks() {
  const [showForm, setShowForm] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<TruckType | null>(null);

  const { data: trucks = [], isLoading } = useQuery<TruckType[]>({
    queryKey: ["/api/trucks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/trucks");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al cargar vehículos");
      }
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700";
      case "on_route":
        return "bg-blue-100 text-blue-700";
      case "maintenance":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Disponible";
      case "on_route":
        return "En Ruta";
      case "maintenance":
        return "Mantenimiento";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Vehículos</h1>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Vehículo
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Cargando vehículos...
          </div>
        ) : trucks.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No hay vehículos registrados
          </div>
        ) : (
          trucks.map((truck) => (
            <Card
              key={truck.id}
              className={`p-4 cursor-pointer transition-all hover:border-primary/30 ${
                selectedTruck?.id === truck.id ? "border-primary/50 shadow-md" : ""
              }`}
              onClick={() => setSelectedTruck(truck)}
            >
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">
                    {truck.brand} {truck.model}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {truck.plate} • {truck.year}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Capacidad: {truck.capacity}L
                  </p>
                  <div className="mt-2">
                    <span 
                      className={`text-xs px-2 py-1 rounded-full ${getStatusColor(truck.status)}`}
                    >
                      {getStatusText(truck.status)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <TruckForm open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}