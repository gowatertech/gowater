import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Esquema de validación sin companyId (se obtiene del servidor desde la sesión)
const routeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  driverId: z.coerce.number().positive("Se requiere un conductor"),
  date: z.string().optional(),
  zoneId: z.coerce.number().optional(),
  assistantId: z.coerce.number().optional(),
  truckId: z.coerce.number().optional(),
});

export default function SimpleRouteForm() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Obtener conductores y vehículos
  const { data: drivers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });
  
  const { data: trucks = [] } = useQuery<any[]>({
    queryKey: ["/api/trucks"],
  });
  
  const { data: zones = [] } = useQuery<any[]>({
    queryKey: ["/api/zones"],
  });
  
  // Filtrar solo conductores y asistentes
  const availableDrivers = drivers.filter(d => d.role === "driver" || d.role === "assistant");
  
  // Inicializar formulario sin companyId
  const form = useForm({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: "",
      driverId: undefined,
      date: new Date().toISOString().split('T')[0],
      zoneId: undefined,
      assistantId: undefined,
      truckId: undefined,
    },
  });
  
  // Crear mutación para enviar los datos
  const createRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      setIsSubmitting(true);
      
      try {
        // No enviar companyId - el servidor lo obtendrá de la sesión
        const routeData = {
          name: data.name,
          driverId: data.driverId,
          date: data.date || new Date().toISOString(),
          zoneId: data.zoneId || null,
          assistantId: data.assistantId || null,
          truckId: data.truckId || null,
        };
        
        const response = await apiRequest("POST", "/api/routes", routeData);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al crear la ruta");
        }
        
        return await response.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
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
    createRouteMutation.mutate(data);
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Crear Nueva Ruta</CardTitle>
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
                    <Input 
                      {...field} 
                      placeholder="Ej: Ruta Centro" 
                      data-testid="input-route-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      data-testid="input-route-date"
                    />
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
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-driver">
                        <SelectValue placeholder="Seleccionar conductor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableDrivers.filter(d => d.role === "driver").map((driver) => (
                        <SelectItem key={driver.id} value={driver.id.toString()}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="assistantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asistente (Opcional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-assistant">
                        <SelectValue placeholder="Seleccionar asistente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Ninguno</SelectItem>
                      {availableDrivers.filter(d => d.role === "assistant").map((assistant) => (
                        <SelectItem key={assistant.id} value={assistant.id.toString()}>
                          {assistant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="truckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehículo (Opcional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-truck">
                        <SelectValue placeholder="Seleccionar vehículo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Ninguno</SelectItem>
                      {trucks.map((truck) => (
                        <SelectItem key={truck.id} value={truck.id.toString()}>
                          {truck.plate} - {truck.brand} {truck.model}
                        </SelectItem>
                      ))}
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
                  <FormLabel>Zona (Opcional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-zone">
                        <SelectValue placeholder="Seleccionar zona" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Ninguna</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id.toString()}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full"
              data-testid="button-create-route"
            >
              {isSubmitting ? "Creando..." : "Crear Ruta"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}