
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTruckSchema } from "@shared/schema";
import type { InsertTruck } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

  const form = useForm<InsertTruck>({
    resolver: zodResolver(insertTruckSchema),
    defaultValues: {
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      plate: "",
      capacity: 1000,
      status: "available"
    }
  });

  const onSubmit = async (values: InsertTruck) => {
    try {
      const response = await apiRequest("POST", "/api/trucks", {
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          brand: values.brand.trim(),
          model: values.model.trim(),
          year: Number(values.year),
          plate: values.plate.trim().toUpperCase(),
          capacity: Number(values.capacity),
          status: values.status
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al crear el vehículo");
      }

      toast({
        description: "Vehículo registrado exitosamente"
      });
      
      // Cerrar el formulario y actualizar la lista
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      form.reset();
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear el vehículo"
      });
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
                      placeholder="Ingrese el año" 
                      {...field} 
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value}
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
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                  <FormLabel>Capacidad (litros)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ingrese la capacidad" 
                      {...field} 
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value}
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
                      <SelectItem value="available">Disponible</SelectItem>
                      <SelectItem value="on_route">En ruta</SelectItem>
                      <SelectItem value="maintenance">En mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">Guardar Vehículo</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
