import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Esquema de validación simplificado para probar el formulario
const routeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  driverId: z.coerce.number().positive("Se requiere un conductor"),
  companyId: z.coerce.number().positive("Se requiere una compañía"),
  zoneId: z.coerce.number().positive("Se requiere una zona"),
});

export default function TestRoutesPage() {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Obtener zonas para mostrar en el selector
  const { data: zones = [] as any[] } = useQuery<any[]>({
    queryKey: ["/api/zones"],
  });
  
  // Obtener conductores para mostrar en el selector
  const { data: drivers = [] as any[] } = useQuery<any[]>({
    queryKey: ["/api/users?role=driver"],
  });
  
  // Inicializar formulario
  const form = useForm({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: "Ruta de prueba",
      driverId: 0, // Inicializamos con 0 en lugar de undefined
      companyId: 15, // ID compañía para pruebas
      zoneId: 0, // Inicializamos con 0 en lugar de undefined
    },
  });
  
  // Crear mutación para enviar los datos
  const createRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      setError(null);
      
      try {
        const response = await apiRequest({
          url: "/api/routes",
          method: "POST",
          data: {
            ...data,
            // Añadir campos mínimos requeridos para crear una ruta
            date: new Date(),
            status: "pending",
            isCompleted: false,
            deliverySequence: [],
            stops: [],
          },
        });
        
        return response;
      } catch (err: any) {
        setError(err.message || "Error al crear la ruta");
        throw err;
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
    <div className="container mx-auto p-4 space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Prueba de Formulario de Rutas (Simplificado)</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Formulario Simplificado</CardTitle>
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
                    <FormLabel>Conductor</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar conductor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers?.map((driver: any) => (
                          <SelectItem key={driver.id} value={driver.id.toString()}>
                            {driver.name}
                          </SelectItem>
                        ))}
                        {drivers?.length === 0 && (
                          <SelectItem value="1">Conductor 1 (Manual)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar zona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {zones?.map((zone: any) => (
                          <SelectItem key={zone.id} value={zone.id.toString()}>
                            {zone.name}
                          </SelectItem>
                        ))}
                        {zones?.length === 0 && (
                          <SelectItem value="1">Zona 1 (Manual)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
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
              
              <Button type="submit" disabled={createRouteMutation.isPending}>
                {createRouteMutation.isPending ? "Enviando..." : "Crear Ruta"}
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
    </div>
  );
}