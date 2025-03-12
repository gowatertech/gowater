import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import type { Truck as TruckType } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTruckSchema } from "@shared/schema";
import type { InsertTruck } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function TrucksPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentYear = new Date().getFullYear();

  const form = useForm<InsertTruck>({
    resolver: zodResolver(insertTruckSchema),
    defaultValues: {
      brand: "",
      model: "",
      year: currentYear,
      plate: "",
      color: "",
      capacity: 1000,
      status: "disponible"
    }
  });

  const { data: trucks = [], isLoading } = useQuery<TruckType[]>({
    queryKey: ["/api/trucks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/trucks");
      if (!response.ok) {
        throw new Error("Error al cargar vehículos");
      }
      return response.json();
    },
  });

  const createTruckMutation = useMutation({
    mutationFn: async (values: InsertTruck) => {
      console.log("Enviando datos:", values);
      const response = await apiRequest(
        "POST",
        "/api/trucks",
        {
          ...values,
          plate: values.plate.toUpperCase(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Error response:", error);
        throw new Error(error.message || "Error al crear el vehículo");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      toast({
        description: "Vehículo registrado exitosamente",
        duration: 3000,
      });
      form.reset();
    },
    onError: (error: Error) => {
      console.error("Error en mutation:", error);
      toast({
        variant: "destructive",
        description: error.message || "Error al crear el vehículo",
        duration: 5000,
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const onSubmit = (values: InsertTruck) => {
    console.log("Formulario enviado:", values);
    setIsSubmitting(true);
    createTruckMutation.mutate(values);
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Vehículos</h1>
      </div>
      <Separator/>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese la marca" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese el modelo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1990}
                        max={currentYear}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ingrese la placa" 
                        maxLength={10}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese el color" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidad (L)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min={1}
                        placeholder="Ingrese la capacidad"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="en_ruta">En ruta</SelectItem>
                        <SelectItem value="mantenimiento">En mantenimiento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : "Guardar Vehículo"}
            </Button>
          </form>
        </Form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Cargando vehículos...
          </div>
        ) : trucks.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No hay vehículos registrados
          </div>
        ) : (
          trucks.map((truck) => (
            <Card
              key={truck.id}
              className="p-4 cursor-pointer transition-all hover:border-primary/30"
            >
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">
                    {truck.brand} {truck.model}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {truck.plate} • {truck.year}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Capacidad: {truck.capacity}L
                  </p>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      truck.status === "disponible" ? "bg-green-100 text-green-700" :
                      truck.status === "en_ruta" ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {truck.status === "disponible" ? "Disponible" :
                       truck.status === "en_ruta" ? "En ruta" :
                       "En mantenimiento"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}