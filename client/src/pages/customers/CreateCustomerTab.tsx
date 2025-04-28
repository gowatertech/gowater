import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  PlusCircle, 
  Building2, 
  User, 
  Phone
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function CreateCustomerTab({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm({
    defaultValues: {
      businessname: "",
      managername: "",
      phone: ""
    }
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Enviando datos:", data);
      const result = await apiRequest({
        method: "POST",
        url: "/api/customers",
        data: data
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Éxito",
        description: "Cliente creado correctamente",
      });
      form.reset();
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
  
  const handleSubmit = form.handleSubmit((values) => {
    // Agregar campos requeridos
    const data = {
      ...values,
      street: "",
      streetnumber: "",
      provinceid: 1,
      municipalityid: 1,
      creditlimit: "0.00",
      balance: "0.00"
    };
    
    console.log("Datos preparados:", data);
    createMutation.mutate(data);
  });
  
  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <PlusCircle className="h-4 w-4 text-blue-600" />
          Registrar Cliente
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="businessname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 text-xs">
                      <Building2 className="h-3.5 w-3.5 text-gray-600" />
                      Nombre del Negocio
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Nombre del negocio" 
                        className="h-8 text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="managername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 text-xs">
                      <User className="h-3.5 w-3.5 text-gray-600" />
                      Nombre del Encargado
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Nombre del encargado" 
                        className="h-8 text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 text-xs">
                      <Phone className="h-3.5 w-3.5 text-gray-600" />
                      Teléfono
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Teléfono" 
                        className="h-8 text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}