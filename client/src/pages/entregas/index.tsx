import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TruckForm } from "./components/TruckForm";
import { useQuery } from "@tanstack/react-query";
import { type Truck } from "@shared/schema";

export default function Entregas() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: trucks, isLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Vehículos</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          Agregar Vehículo
        </Button>
      </div>

      <TruckForm 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />
    </div>
  );
}
