import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTruckSchema } from "@shared/schema";
import type { InsertTruck } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      year: currentYear.toString(),
      plate: "",
      color: "",
      capacity: "1000",
      status: "disponible"
    }
  });

  const onSubmit = async (values: InsertTruck) => {
    try {
      setIsSubmitting(true);
      console.log("Submitting truck data:", values);

      // Asegúrate de que todos los valores estén en el formato correcto como strings
      const submittedValues = {
        brand: values.brand.trim(),
        model: values.model.trim(),
        year: String(values.year),
        plate: values.plate.trim().toUpperCase(),
        color: values.color?.trim() || "",
        capacity: String(values.capacity),
        status: values.status || "disponible"
      };

      console.log("Processed truck data for submission:", submittedValues);

      const response = await apiRequest("POST", "/api/trucks", {
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(submittedValues)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error && data.error.details) {
          throw new Error(data.error.details.join('\n'));
        } else {
          throw new Error(data.error || "Error al crear el vehículo");
        }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar nuevo vehículo</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value)) {
                        field.onChange(value);
                      }
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
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          field.onChange(value);
                        }
                      }}
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
                      <SelectItem value="en_reparacion">En mantenimiento</SelectItem>
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
      </DialogContent>
    </Dialog>
  );
}