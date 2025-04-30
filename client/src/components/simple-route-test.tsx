import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Components
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Esquema de validación para el formulario de la ruta
const routeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  companyId: z.coerce.number().positive("Se requiere una compañía"),
  driverId: z.coerce.number().positive("Se requiere un conductor"),
  // Campos adicionales según sea necesario
});

type FormValues = z.infer<typeof routeSchema>;

export function SimpleRouteTest() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);
  
  // Inicializar el formulario
  const form = useForm<FormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: "Ruta de Prueba",
      companyId: 15, // Valor fijo para pruebas
      driverId: 1, // Valor fijo para pruebas
    },
  });

  // Mutación para crear una ruta
  const createRouteMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      setIsSubmitting(true);
      try {
        const response = await apiRequest({
          url: "/api/routes",
          method: "POST",
          data: {
            ...data,
            // Campos adicionales requeridos
            date: new Date(),
            status: "pending",
            isCompleted: false,
            stops: [],
          },
        });
        return response;
      } catch (error) {
        console.error("Error al crear la ruta:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Ruta creada",
        description: "La ruta se ha creado correctamente",
      });
      // Resetear el formulario
      form.reset();
      // Invalidar cualquier consulta que pueda depender de este cambio
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la ruta",
        variant: "destructive",
      });
    },
  });

  // Función para manejar el envío del formulario
  const onSubmit = (values: FormValues) => {
    setFormData(values);
    createRouteMutation.mutate(values);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Crear Ruta (Prueba Simplificada)</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Ruta</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID del Conductor</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value))} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID de la Compañía</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value))} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              disabled={isSubmitting || createRouteMutation.isPending}
            >
              {isSubmitting || createRouteMutation.isPending ? "Enviando..." : "Crear Ruta"}
            </Button>
          </form>
        </Form>
        
        {formData && (
          <div className="mt-6 p-4 border rounded bg-slate-50">
            <h3 className="font-medium mb-2">Datos enviados:</h3>
            <pre className="text-xs bg-slate-100 p-2 rounded">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        )}
        
        {createRouteMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            Error: {(createRouteMutation.error as any).message || "Error desconocido"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SimpleRouteTest;