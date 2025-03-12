import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTruckSchema } from "@shared/schema";
import type { InsertTruck } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TruckFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TruckForm({ open, onOpenChange }: TruckFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const onSubmit = async (values: InsertTruck) => {
    try {
      setIsSubmitting(true);

      // Validar campos requeridos
      if (!values.brand || !values.model || !values.plate || !values.color) {
        toast({
          variant: "destructive",
          description: "Por favor, complete todos los campos requeridos",
          duration: 3000,
        });
        return;
      }

      // Asegurar que los valores numéricos sean números
      const submittedValues = {
        brand: values.brand.trim(),
        model: values.model.trim(),
        year: Number(values.year),
        plate: values.plate.trim().toUpperCase(),
        color: values.color.trim(),
        capacity: Number(values.capacity),
        status: values.status || "disponible"
      };

      // Validar año y capacidad
      if (isNaN(submittedValues.year) || isNaN(submittedValues.capacity)) {
        toast({
          variant: "destructive",
          description: "El año y la capacidad deben ser números válidos",
          duration: 3000,
        });
        return;
      }

      const response = await apiRequest("POST", "/api/trucks", {
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(submittedValues)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.details?.join('\n') || "Error al crear el vehículo");
      }

      toast({
        description: "Vehículo registrado exitosamente",
        duration: 3000,
      });

      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      form.reset();
    } catch (error) {
      console.error("Error creating truck:", error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Error al crear el vehículo. Por favor, revisa los datos ingresados.",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ingrese la marca" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value.trim())}
                  />
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
                  <Input 
                    placeholder="Ingrese el modelo" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.trim())}
                  />
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
                <Input 
                  type="number"
                  min={1990}
                  max={currentYear}
                  {...field}
                  value={field.value || currentYear}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    field.onChange(isNaN(value) ? currentYear : value);
                  }}
                />
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
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.trim().toUpperCase())}
                    maxLength={10}
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
                  <Input 
                    placeholder="Ingrese el color" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.trim())}
                  />
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
                    value={field.value || 1000}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      field.onChange(isNaN(value) ? 1000 : value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || "disponible"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="en_ruta">En ruta</SelectItem>
                  <SelectItem value="en_reparacion">En reparación</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Guardar Vehículo"}
        </Button>
      </form>
    </Form>
  );
}