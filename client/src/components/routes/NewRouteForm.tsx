import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRouteSchema } from "@shared/schema";
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

interface NewRouteFormProps {
  onRouteCreated: () => void;
}

export default function NewRouteForm({ onRouteCreated }: NewRouteFormProps) {
  const { t } = useTranslation();

  const { data: drivers = [] } = useQuery({
    queryKey: ["/api/users?role=driver"],
  });

  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertRouteSchema),
    defaultValues: {
      name: "",
      driverId: undefined,
      date: new Date(),
      truckId: 1,
      status: "pending" as const,
      isCompleted: false
    },
  });

  const createRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Enviando datos:", data);
      const response = await apiRequest("POST", "/api/routes", {
        ...data,
        date: new Date(data.date),
        driverId: Number(data.driverId),
        truckId: 1,
        status: "pending",
        isCompleted: false
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la ruta');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        description: "Ruta creada exitosamente",
      });
      form.reset();
      onRouteCreated();
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
      await createRouteMutation.mutateAsync(data);
    } catch (error) {
      console.error("Error al enviar:", error);
    }
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
                <Input {...field} placeholder="Ingrese el nombre de la ruta" />
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
                    <SelectValue placeholder="Seleccione un conductor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {drivers?.map((driver: any) => (
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
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  {...field}
                  value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    date.setHours(12); // Establecer al mediodía para evitar problemas de zona horaria
                    field.onChange(date);
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
          disabled={createRouteMutation.isPending}
        >
          {createRouteMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </Form>
  );
}