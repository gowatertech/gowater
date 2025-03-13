import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Truck } from "lucide-react";
import type { VehicleLoading } from "@shared/schema";
import { VehicleLoadingForm } from "./VehicleLoadingForm";

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-green-100 text-green-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function VehicleLoadingPage() {
  const [showForm, setShowForm] = useState(false);

  const { data: loadings = [], isLoading } = useQuery<VehicleLoading[]>({
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
                  Efectivo inicial: RD$ {loading.initialCash}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}