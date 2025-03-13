import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleLoadingSchema } from "@shared/schema";
import type { InsertVehicleLoading, Product, User, Truck } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Plus, X } from "lucide-react";

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
import { useQuery } from "@tanstack/react-query";

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500";
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-500";
  }
};

interface VehicleLoadingFormProps {
  onSuccess?: () => void;
}

export function VehicleLoadingForm({ onSuccess }: VehicleLoadingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InsertVehicleLoading>({
    resolver: zodResolver(insertVehicleLoadingSchema),
    defaultValues: {
      initialCash: "0.00",
      items: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: drivers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/drivers", { role: "driver" }],
  });

  const { data: assistants = [] } = useQuery<User[]>({
    queryKey: ["/api/users/drivers", { role: "assistant" }],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const onSubmit = async (values: InsertVehicleLoading) => {
    try {
      setIsSubmitting(true);

      const formattedData = {
        ...values,
        initialCash: values.initialCash.toString(),
        truckId: Number(values.truckId),
        driverId: Number(values.driverId),
        assistantId: values.assistantId ? Number(values.assistantId) : undefined,
        items: values.items.map(item => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity)
        }))
      };

      console.log("Submitting data:", formattedData);

      const response = await fetch("/api/vehicle-loading", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear la carga del vehículo");
      }

      toast({
        description: "Carga de vehículo registrada exitosamente",
        duration: 3000,
      });

      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading"] });
      form.reset();
    } catch (error) {
      console.error("Error creating vehicle loading:", error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Error al crear la carga del vehículo",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="truckId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehículo</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vehículo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
                      <SelectValue placeholder="Seleccionar conductor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {drivers.map((driver) => (
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
                <FormLabel>Ayudante</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ayudante" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assistants.map((assistant) => (
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
            name="initialCash"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Efectivo Inicial (RD$)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="0.00"
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        field.onChange(value.toFixed(2));
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Productos a Cargar</h3>
            <Button
              type="button"
              onClick={() => append({ productId: 0, quantity: 1 })}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <FormField
                  control={form.control}
                  name={`items.${index}.productId`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Producto</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id.toString()}
                            >
                              {product.name}
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
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          className="w-24"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Registrar Carga"}
        </Button>
      </form>
    </Form>
  );
}