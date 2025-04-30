import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StepRouteForm from "@/components/routes/StepRouteForm";

export default function TestRoutesPage() {
  const [showForm, setShowForm] = useState(false);
  
  const handleRouteCreated = () => {
    console.log("Ruta creada con éxito");
    setShowForm(false);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Prueba de Formulario de Rutas</h1>
      
      {!showForm ? (
        <Button onClick={() => setShowForm(true)}>
          Abrir Formulario
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Crear nueva ruta (Prueba)</CardTitle>
          </CardHeader>
          <CardContent>
            <StepRouteForm onRouteCreated={handleRouteCreated} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}