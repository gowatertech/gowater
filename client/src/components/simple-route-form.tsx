import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Esquema de validación
const routeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  driverId: z.coerce.number().positive("Se requiere un conductor"),
  date: z.string().optional(),
  zoneId: z.coerce.number().optional(),
  assistantId: z.coerce.number().optional(),
  truckId: z.coerce.number().optional(),
});

interface SimpleRouteFormProps {
  route?: any; // Si se pasa, es para editar
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function SimpleRouteForm({ route, onSuccess, onCancel }: SimpleRouteFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!route;
  
  // Obtener datos
  const { data: drivers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });
  
  const { data: trucks = [] } = useQuery<any[]>({
    queryKey: ["/api/trucks"],
  });
  
  const { data: zones = [] } = useQuery<any[]>({
    queryKey: ["/api/zones"],
  });
  
  const availableDrivers = drivers.filter(d => d.role === "driver" || d.role === "assistant");
  
  // Inicializar formulario
  const form = useForm({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: route?.name || "",
      driverId: route?.driverId || undefined,
      date: route?.date 
        ? new Date(route.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      zoneId: route?.zoneId || undefined,
      assistantId: route?.assistantId || undefined,
      truckId: route?.truckId || undefined,
    },
  });

  // Actualizar formulario cuando cambia el route
  useEffect(() => {
    if (route) {
      form.reset({
        name: route.name || "",
        driverId: route.driverId || undefined,
        date: route.date 
          ? new Date(route.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        zoneId: route.zoneId || undefined,
        assistantId: route.assistantId || undefined,
        truckId: route.truckId || undefined,
      });
    }
  }, [route, form]);
  
  // Mutación para crear/editar
  const saveRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      setIsSubmitting(true);
      
      try {
        const routeData = {
          name: data.name,
          driverId: data.driverId,
          date: data.date || new Date().toISOString(),
          zoneId: data.zoneId || null,
          assistantId: data.assistantId || null,
          truckId: data.truckId || null,
        };
        
        if (isEditing) {
          // Actualizar ruta existente
          const response = await fetch(`/api/routes/${route.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(routeData),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al actualizar la ruta");
          }
          
          return await response.json();
        } else {
          // Crear nueva ruta
          const response = await apiRequest("POST", "/api/routes", routeData);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al crear la ruta");
          }
          
          return await response.json();
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        description: isEditing ? "Ruta actualizada correctamente" : "Ruta creada correctamente",
      });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || (isEditing ? "Error al actualizar la ruta" : "Error al crear la ruta"),
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: any) => {
    saveRouteMutation.mutate(data);
  };
  
  return (
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
                    <SelectValue placeholder="Ninguno" />
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
                    <SelectValue placeholder="Ninguno" />
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
                    <SelectValue placeholder="Ninguna" />
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
        
        <div className="flex gap-2 pt-4">
          {onCancel && (
            <Button 
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="flex-1"
            data-testid="button-submit"
          >
            {isSubmitting 
              ? (isEditing ? "Guardando..." : "Creando...") 
              : (isEditing ? "Guardar" : "Crear Ruta")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
