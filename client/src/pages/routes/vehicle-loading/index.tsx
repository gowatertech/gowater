import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Truck } from "lucide-react";
import type { VehicleLoading } from "@shared/schema";
import { VehicleLoadingForm } from "./VehicleLoadingForm";

export default function VehicleLoadingPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedLoading, setSelectedLoading] = useState<VehicleLoading | null>(null);

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
        <Button onClick={() => {
          setShowForm(!showForm);
          setSelectedLoading(null);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Carga
        </Button>
      </div>

      {(showForm || selectedLoading) && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedLoading ? 'Editar Carga' : 'Nueva Carga'}
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setShowForm(false);
                setSelectedLoading(null);
              }}
            >
              ✕
            </Button>
          </div>
          <VehicleLoadingForm
            loading={selectedLoading}
            onSuccess={() => {
              setShowForm(false);
              setSelectedLoading(null);
            }}
          />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        {loadings.length === 0 ? (
          <div className="col-span-2 text-center py-8">
            <p className="text-gray-500">No hay cargas registradas</p>
          </div>
        ) : (
          loadings.map((loading) => (
            <Card 
              key={loading.id} 
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                selectedLoading?.id === loading.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => {
                setSelectedLoading(loading);
                setShowForm(false);
              }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">#{loading.loadingNumber}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    loading.status === "completed" 
                      ? "bg-green-100 text-green-800"
                      : loading.status === "in_progress"
                      ? "bg-blue-100 text-blue-800"
                      : loading.status === "cancelled"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {loading.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Fecha: {new Date(loading.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Efectivo inicial: ${loading.initialCash}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
