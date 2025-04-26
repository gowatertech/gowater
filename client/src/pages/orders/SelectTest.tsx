import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Componentes UI
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SelectTest() {
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string>("");
  
  // Datos de ejemplo
  const options = [
    { id: 1, name: "Opción 1" },
    { id: 2, name: "Opción 2" },
    { id: 3, name: "Opción 3" },
    { id: 4, name: "Opción 4" }
  ];
  
  const handleSelectChange = (value: string) => {
    console.log("Opción seleccionada:", value);
    try {
      setSelectedOption(value);
      toast({
        title: "Selección exitosa",
        description: `Has seleccionado: ${value}`
      });
    } catch (error) {
      console.error("Error al cambiar la selección:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cambiar la selección"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Prueba de Componente Select</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2">Selecciona una opción:</p>
            <Select
              onValueChange={handleSelectChange}
              value={selectedOption}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar opción" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem
                    key={option.id}
                    value={option.id.toString()}
                  >
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedOption && (
            <div className="bg-muted p-4 rounded-md">
              <p>Seleccionaste: {selectedOption}</p>
              <p>Objeto seleccionado: {options.find(o => o.id.toString() === selectedOption)?.name}</p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={() => setSelectedOption("")}
              variant="outline"
            >
              Limpiar selección
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "Prueba de toast",
                  description: "Este es un mensaje de prueba"
                });
              }}
            >
              Probar toast
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}