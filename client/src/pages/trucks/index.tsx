import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Plus } from "lucide-react";
import type { Truck as TruckType } from "@shared/schema";
import { TruckForm } from "../entregas/components/TruckForm";

export default function TrucksPage() {
  const [showForm, setShowForm] = useState(false);

  const { data: trucks = [], isLoading } = useQuery<TruckType[]>({
    queryKey: ["/api/trucks"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-lg text-gray-600">Cargando vehículos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Vehículos</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Crear
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Nuevo Vehículo</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowForm(false)}
            >
              ✕
            </Button>
          </div>
          <TruckForm 
            open={showForm} 
            onOpenChange={setShowForm} 
          />
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {trucks.length === 0 ? (
          <div className="col-span-full text-center py-6">
            <p className="text-gray-500">No hay vehículos registrados</p>
          </div>
        ) : (
          trucks.map((truck) => (
            <Card key={truck.id} className="p-2 bg-white hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-medium truncate">
                    {truck.brand} {truck.model}
                  </h3>
                </div>
                <div className="space-y-0.5 text-xs text-gray-600">
                  <p className="truncate">Placa: {truck.plate}</p>
                  <p>{truck.capacity}L</p>
                  <div>
                    <span 
                      className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        truck.status === "disponible"
                          ? "bg-green-100 text-green-800"
                          : truck.status === "en_ruta"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {truck.status === "disponible"
                        ? "Disponible"
                        : truck.status === "en_ruta"
                        ? "En ruta"
                        : "En mantenimiento"}
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