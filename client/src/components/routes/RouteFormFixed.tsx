import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// UI Components
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

// Definición del esquema para validación (sin companyId, se obtiene del servidor)
const routeSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  driverId: z.coerce.number().positive("Conductor es requerido"),
  zoneId: z.coerce.number().positive("Zona es requerida"),
  assistantId: z.union([z.coerce.number(), z.literal(null)]).nullable(),
  truckId: z.union([z.coerce.number(), z.literal(null)]).nullable(),
  date: z.date(),
  status: z.enum(["pending", "in_progress", "completed"]),
  isCompleted: z.boolean(),
});

type RouteFormValues = z.infer<typeof routeSchema>;

interface RouteFormFixedProps {
  onRouteCreated: () => void;
}

export default function RouteFormFixed({ onRouteCreated }: RouteFormFixedProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para debug
  const [formData, setFormData] = useState<any>(null);
  
  // Obtener zonas
  const { data: zones = [] as any[], isLoading: isLoadingZones } = useQuery<any[]>({
    queryKey: ["/api/zones"],
  });
  
  // Obtener conductores
  const { data: drivers = [] as any[], isLoading: isLoadingDrivers } = useQuery<any[]>({
    queryKey: ["/api/users?role=driver"],
  });
  
  // Obtener ayudantes
  const { data: assistants = [] as any[], isLoading: isLoadingAssistants } = useQuery<any[]>({
    queryKey: ["/api/users?role=assistant"],
  });
  
  // Obtener vehículos
  const { data: trucks = [] as any[], isLoading: isLoadingTrucks } = useQuery<any[]>({
    queryKey: ["/api/trucks"],
  });
  
  // Inicializar formulario (sin companyId)
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: `Ruta ${new Date().toLocaleDateString()}`,
      driverId: 0,
      assistantId: null,
      zoneId: 0,
      truckId: null,
      date: new Date(),
      status: "pending",
      isCompleted: false,
    },
  });
  
  // Crear mutación para enviar datos
  const createRouteMutation = useMutation({
    mutationFn: async (data: RouteFormValues) => {
      setIsSubmitting(true);
      try {
        return await apiRequest({
          url: "/api/routes",
          method: "POST",
          data: {
            ...data,
            // Datos adicionales que puedan ser necesarios
            stops: [],
            deliverySequence: [],
          },
        });
      } catch (error) {
        console.error("Error al crear ruta:", error);
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
      // Limpiar formulario
      form.reset();
      // Invalidar consultas
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      // Notificar que se creó la ruta
      onRouteCreated();
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
  const onSubmit = (values: RouteFormValues) => {
    setFormData(values);
    createRouteMutation.mutate(values);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Nueva Ruta (Formulario Fijo)</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value ? field.value.toString() : "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar zona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingZones ? (
                          <SelectItem value="0" disabled>Cargando zonas...</SelectItem>
                        ) : zones.length === 0 ? (
                          <SelectItem value="0" disabled>No hay zonas disponibles</SelectItem>
                        ) : (
                          zones.map((zone: any) => (
                            <SelectItem key={zone.id} value={zone.id.toString()}>
                              {zone.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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
                      value={field.value ? field.value.toString() : "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar conductor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingDrivers ? (
                          <SelectItem value="0" disabled>Cargando conductores...</SelectItem>
                        ) : drivers.length === 0 ? (
                          <SelectItem value="0" disabled>No hay conductores disponibles</SelectItem>
                        ) : (
                          drivers.map((driver: any) => (
                            <SelectItem key={driver.id} value={driver.id.toString()}>
                              {driver.name}
                            </SelectItem>
                          ))
                        )}
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
                    <FormLabel>Ayudante (Opcional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                      value={field.value !== null ? field.value?.toString() : "null"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar ayudante (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Sin ayudante</SelectItem>
                        {isLoadingAssistants ? (
                          <SelectItem value="0" disabled>Cargando ayudantes...</SelectItem>
                        ) : assistants.length === 0 ? (
                          <SelectItem value="0" disabled>No hay ayudantes disponibles</SelectItem>
                        ) : (
                          assistants.map((assistant: any) => (
                            <SelectItem key={assistant.id} value={assistant.id.toString()}>
                              {assistant.name}
                            </SelectItem>
                          ))
                        )}
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
                      onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                      value={field.value !== null ? field.value?.toString() : "null"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vehículo (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Sin vehículo</SelectItem>
                        {isLoadingTrucks ? (
                          <SelectItem value="0" disabled>Cargando vehículos...</SelectItem>
                        ) : trucks.length === 0 ? (
                          <SelectItem value="0" disabled>No hay vehículos disponibles</SelectItem>
                        ) : (
                          trucks.map((truck: any) => (
                            <SelectItem key={truck.id} value={truck.id.toString()}>
                              {truck.plate} - {truck.brand} {truck.model}
                            </SelectItem>
                          ))
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
                    <FormLabel>ID de Compañía</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" disabled={isSubmitting || createRouteMutation.isPending}>
              {isSubmitting || createRouteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Ruta"
              )}
            </Button>
          </form>
        </Form>
        
        {/* Sección de debug */}
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