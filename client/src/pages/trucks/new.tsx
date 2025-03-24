import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTruckSchema } from "@shared/schema";
import type { InsertTruck, Truck } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck as TruckIcon, ArrowLeft } from "lucide-react";

export default function NewTruckPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();

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
    },
    mode: "onChange"
  });

  const onSubmit = async (values: InsertTruck) => {
    try {
      setIsSubmitting(true);
      
      // Verificar que todos los campos requeridos existan y tengan valor
      if (!values.brand || !values.model || !values.plate || !values.color) {
        throw new Error("Todos los campos son obligatorios");
      }
      
      console.log("Form values before conversion:", values);

      // Ensure all values are in the correct format as strings
      const submittedValues = {
        ...values,
        brand: String(values.brand).trim(),
        model: String(values.model).trim(),
        color: String(values.color).trim(),
        year: String(values.year),
        plate: String(values.plate).trim().toUpperCase(),
        capacity: String(values.capacity),
        status: values.status || "disponible"
      };
      
      console.log("Submitted values after conversion:", submittedValues);

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

      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      form.reset();
      navigate("/trucks");
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
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/trucks")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Crear Nuevo Vehículo</h1>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TruckIcon className="h-6 w-6 text-primary" />
            <CardTitle>Información del Vehículo</CardTitle>
          </div>
          <CardDescription>
            Ingrese los detalles del nuevo vehículo. Todos los campos son obligatorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                      <FormControl>
                        <Input 
                          type="text"
                          {...field}
                          onChange={(e) => {
                            // No es necesaria la conversión ya que será un string
                            const newValue = e.target.value === '' ? currentYear.toString() : e.target.value;
                            field.onChange(newValue);
                          }}
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
                          type="text" 
                          placeholder="Ingrese la capacidad"
                          {...field}
                          onChange={(e) => {
                            // No es necesaria la conversión ya que será un string
                            const newValue = e.target.value === '' ? "1000" : e.target.value;
                            field.onChange(newValue);
                          }}
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
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => navigate("/trucks")}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Guardar Vehículo"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}