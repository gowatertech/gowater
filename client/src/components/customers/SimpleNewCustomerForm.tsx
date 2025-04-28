import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";

interface SimpleNewCustomerFormProps {
  onSuccess: () => void;
}

export function SimpleNewCustomerForm({ onSuccess }: SimpleNewCustomerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [businessname, setBusinessname] = useState("");
  const [managername, setManagername] = useState("");
  const [phone, setPhone] = useState("");
  
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Enviando datos:", data);
      const result = await apiRequest({
        method: "POST",
        url: "/api/customers",
        data: data
      });
      console.log("Respuesta del servidor:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Éxito",
        description: "Cliente creado correctamente",
      });
      setBusinessname("");
      setManagername("");
      setPhone("");
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      console.error("Error creating customer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al crear el cliente",
      });
    },
  });

  const handleSubmit = () => {
    // Validaciones básicas
    if (!businessname) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre del negocio es obligatorio",
      });
      return;
    }
    
    if (!managername) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre del encargado es obligatorio",
      });
      return;
    }
    
    if (!phone) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El teléfono es obligatorio",
      });
      return;
    }
    
    // Datos mínimos requeridos para crear un cliente
    const data = {
      businessname,
      managername,
      phone,
      street: "", // Campos obligatorios con valores por defecto
      streetnumber: "",
      provinceid: 1,
      municipalityid: 1,
      creditlimit: "0.00",
      balance: "0.00"
    };
    
    console.log("Datos preparados:", data);
    createMutation.mutate(data);
  };

  return (
    <div className="border rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <PlusCircle className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-medium">Registrar Nuevo Cliente</h3>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Nombre del Negocio</label>
          <Input 
            value={businessname}
            onChange={(e) => setBusinessname(e.target.value)}
            placeholder="Nombre del negocio" 
            className="h-9 text-sm"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium mb-1">Nombre del Encargado</label>
          <Input 
            value={managername}
            onChange={(e) => setManagername(e.target.value)}
            placeholder="Nombre del encargado" 
            className="h-9 text-sm"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium mb-1">Teléfono</label>
          <Input 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono" 
            className="h-9 text-sm"
          />
        </div>
        
        <div className="flex justify-end mt-4">
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white"
            disabled={createMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending ? "Guardando..." : "Guardar Cliente"}
          </Button>
        </div>
      </div>
    </div>
  );
}