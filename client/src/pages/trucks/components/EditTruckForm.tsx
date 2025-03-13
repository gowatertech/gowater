import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTruckSchema } from "@shared/schema";
import type { InsertTruck, Truck } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
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

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditTruckFormProps {
  truck: Truck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTruckForm({ truck, open, onOpenChange }: EditTruckFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentYear = new Date().getFullYear();

  const form = useForm<InsertTruck>({
    resolver: zodResolver(insertTruckSchema),
    defaultValues: {
      brand: truck.brand,
      model: truck.model,
      year: truck.year,
      plate: truck.plate,
      color: truck.color,
      capacity: truck.capacity,
      status: truck.status
    }
  });

  const onSubmit = async (values: InsertTruck) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/trucks/${truck.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al actualizar el vehículo");
      }

      toast({
        description: "Vehículo actualizado exitosamente",
        duration: 3000,
      });

      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch (error) {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Error al actualizar el vehículo",
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
                  <Input {...field} />
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
                  <Input {...field} />
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
                  <Input {...field} />
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
                  <Input {...field} />
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
                    {...field}
                  />
                </FormControl>
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
          {isSubmitting ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </form>
    </Form>
  );
}
