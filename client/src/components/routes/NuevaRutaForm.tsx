import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRutaSchema } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface NuevaRutaFormProps {
  onRutaCreada: () => void;
}

export default function NuevaRutaForm({ onRutaCreada }: NuevaRutaFormProps) {
  const { t } = useTranslation();

  const { data: conductores = [] } = useQuery({
    queryKey: ["/api/usuarios?role=driver"],
  });

  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertRutaSchema),
    defaultValues: {
      nombre: "",
      conductorId: undefined,
      fecha: new Date(),
      camionId: 1,
      estado: "pendiente" as const,
      completada: false
    },
  });

  const crearRutaMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Enviando datos:", data);
      const response = await apiRequest("POST", "/api/rutas", {
        ...data,
        fecha: new Date(data.fecha),
        conductorId: Number(data.conductorId),
        camionId: 1,
        estado: "pendiente" as const,
        completada: false
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la ruta');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rutas"] });
      toast({
        description: "Ruta creada exitosamente",
      });
      form.reset();
      onRutaCreada();
    },
    onError: (error: Error) => {
      console.error("Error al crear ruta:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: any) => {
    try {
      console.log("Datos del formulario:", data);
      await crearRutaMutation.mutateAsync(data);
    } catch (error) {
      console.error("Error al enviar:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Ruta</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ingrese el nombre de la ruta" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="conductorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conductor</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un conductor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {conductores.map((conductor) => (
                    <SelectItem key={conductor.id} value={conductor.id.toString()}>
                      {conductor.name}
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
          name="fecha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  {...field}
                  value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const fecha = new Date(e.target.value);
                    fecha.setHours(12); // Establecer al mediodía para evitar problemas de zona horaria
                    field.onChange(fecha);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={crearRutaMutation.isPending}
        >
          {crearRutaMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </Form>
  );
}