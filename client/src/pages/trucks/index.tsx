import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Terminal } from "lucide-react";
import type { Truck as TruckType } from "@shared/schema";
import { TruckForm } from "./components/TruckForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function TrucksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showCurlCommands, setShowCurlCommands] = useState(false);

  const { data: trucks = [], isLoading } = useQuery<TruckType[]>({
    queryKey: ["/api/trucks"],
    queryFn: async () => {
      const response = await fetch("/api/trucks");
      const data = await response.json();
      console.log("Loaded trucks:", data);
      return data;
    }
  });

  const curlCommands = `
# Listar todos los camiones
curl -X GET http://localhost:5000/api/trucks

# Crear un nuevo camión
curl -X POST http://localhost:5000/api/trucks \\
  -H "Content-Type: application/json" \\
  -d '{
    "brand": "Mercedes",
    "model": "Atego",
    "year": 2023,
    "plate": "DEF456",
    "color": "Gris",
    "capacity": 1500,
    "status": "disponible"
  }'

# Obtener un camión específico (ID: 1)
curl -X GET http://localhost:5000/api/trucks/1

# Actualizar un camión (ID: 1)
curl -X PUT http://localhost:5000/api/trucks/1 \\
  -H "Content-Type: application/json" \\
  -d '{
    "brand": "Mercedes",
    "model": "Atego",
    "year": 2023,
    "plate": "DEF456",
    "color": "Gris Metalizado",
    "capacity": 1500,
    "status": "disponible"
  }'

# Actualizar estado de un camión (ID: 1)
curl -X PATCH http://localhost:5000/api/trucks/1/status \\
  -H "Content-Type: application/json" \\
  -d '{"status": "en_ruta"}'
`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-lg text-gray-600">Cargando vehículos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Vehículos</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCurlCommands} onOpenChange={setShowCurlCommands}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Terminal className="h-4 w-4 mr-2" />
                Pruebas CURL
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Comandos CURL para probar la API</DialogTitle>
              </DialogHeader>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                {curlCommands}
              </pre>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setIsDialogOpen(true)}>
            Crear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trucks.length === 0 ? (
          <div className="col-span-full text-center py-10">
            <p className="text-gray-500">No hay vehículos registrados</p>
          </div>
        ) : (
          trucks.map((truck) => (
            <Card key={truck.id} className="p-6 bg-white rounded-xl shadow-sm">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <Truck className="h-6 w-6 text-blue-600" />
                  <h3 className="text-xl font-semibold">
                    {truck.brand} {truck.model}
                  </h3>
                </div>
                <div className="space-y-2 text-gray-600">
                  <p className="text-lg">Placa: {truck.plate}</p>
                  <p>Año: {truck.year}</p>
                  <p>Color: {truck.color}</p>
                  <p>Capacidad: {truck.capacity}L</p>
                  <div className="mt-4">
                    <span 
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
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

      <TruckForm 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />
    </div>
  );
}