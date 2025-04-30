import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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

// Esquema de validación simplificado para la prueba
const routeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  driverId: z.coerce.number().positive("Se requiere un conductor"),
  companyId: z.coerce.number().positive("Se requiere una compañía"),
});

export default function SimpleRouteForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado de debug
  const [formValues, setFormValues] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Inicializar formulario
  const form = useForm({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: "Ruta de prueba",
      driverId: 1, // Valor predeterminado
      companyId: 15, // Valor predeterminado para pruebas
    },
  });
  
  // Crear mutación para enviar los datos
  const createRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      setError(null);
      setIsSubmitting(true);
      
      try {
        const response = await apiRequest({
          url: "/api/routes",
          method: "POST",
          data,
        });
        
        return response;
      } catch (err: any) {
        setError(err.message || "Error al crear la ruta");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Ruta creada",
        description: "La ruta se creó correctamente.",
      });
      form.reset();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Error al crear la ruta",
        variant: "destructive",
      });
    },
  });
  
  // Función para manejar el envío del formulario
  const onSubmit = (data: any) => {
    setFormValues(data);
    createRouteMutation.mutate(data);
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Formulario Simplificado de Ruta</CardTitle>
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
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
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
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Crear Ruta"}
            </Button>
          </form>
        </Form>
        
        {/* Sección de depuración */}
        {formValues && (
          <div className="mt-6 p-4 border rounded bg-slate-50">
            <h3 className="font-medium mb-2">Datos enviados:</h3>
            <pre className="text-xs bg-slate-100 p-2 rounded">
              {JSON.stringify(formValues, null, 2)}
            </pre>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}
        
        {createRouteMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            Error de mutación: {(createRouteMutation.error as Error).message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}