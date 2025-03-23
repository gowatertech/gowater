import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  InsertRouteSettlement,
  VehicleLoading,
  Product,
  User,
  Truck,
  insertRouteSettlementSchema
} from "@shared/schema";
import { Loader2 } from "lucide-react";
import React from 'react';

interface RouteSettlementFormProps {
  vehicleLoadingId: number;
  onSuccess?: () => void;
}

interface LoadingWithRelations extends VehicleLoading {
  truck: Truck;
  driver: User;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number | null;
    notes: string | null;
    product: Product;
  }>;
}

export function RouteSettlementForm({ vehicleLoadingId, onSuccess }: RouteSettlementFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicleLoading, isLoading: loadingData } = useQuery<LoadingWithRelations>({
    queryKey: ["/api/vehicle-loading", vehicleLoadingId],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const form = useForm<InsertRouteSettlement>({
    resolver: zodResolver(insertRouteSettlementSchema),
    defaultValues: {
      vehicleLoadingId,
      totalCashReceived: "0.00",
      totalCreditReceived: "0.00",
      totalInvoiced: "0.00",
      notes: "",
      items: []
    }
  });

  React.useEffect(() => {
    if (vehicleLoading?.items) {
      form.reset({
        ...form.getValues(),
        items: vehicleLoading.items.map(item => ({
          productId: item.productId,
          loadedQuantity: item.quantity,
          returnedQuantity: item.returnedQuantity || 0,
          soldQuantity: item.quantity - (item.returnedQuantity || 0),
          returnedContainers: 0,
          notes: item.notes || ""
        }))
      });
    }
  }, [vehicleLoading, form]);

  const { fields } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const calculateTotals = () => {
    const values = form.getValues();
    const cashReceived = parseFloat(values.totalCashReceived) || 0;
    const creditReceived = parseFloat(values.totalCreditReceived) || 0;
    const totalInvoiced = parseFloat(values.totalInvoiced) || 0;
    const difference = cashReceived + creditReceived - totalInvoiced;

    return {
      totalReceived: cashReceived + creditReceived,
      difference: difference.toFixed(2)
    };
  };

  const onSubmit = async (values: InsertRouteSettlement) => {
    try {
      const response = await fetch("/api/route-settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear el cuadre de ruta");
      }

      toast({
        description: "Cuadre de ruta registrado exitosamente",
        duration: 3000,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/route-settlements"] });
      onSuccess?.();
    } catch (error) {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Error al crear el cuadre de ruta",
        duration: 5000,
      });
    }
  };

  const totals = calculateTotals();

  if (loadingData || !vehicleLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="font-medium">Vehículo:</span>
                <span className="ml-1">{vehicleLoading.truck?.plate}</span>
              </div>
              <div>
                <span className="font-medium">Conductor:</span>
                <span className="ml-1">{vehicleLoading.driver?.name}</span>
              </div>
              <div>
                <span className="font-medium">Fecha:</span>
                <span className="ml-1">{new Date(vehicleLoading.date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-medium">Inicial:</span>
                <span className="ml-1">RD$ {vehicleLoading.initialCash}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Efectivo y Crédito</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label>Efectivo Recibido</label>
                <Input
                  {...form.register("totalCashReceived")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label>Crédito Otorgado</label>
                <Input
                  {...form.register("totalCreditReceived")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label>Total Facturado</label>
                <Input
                  {...form.register("totalInvoiced")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos y Devoluciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded">
                  <div>
                    <label className="text-sm font-medium">Producto</label>
                    <div className="mt-1">
                      {vehicleLoading.items[index].product.name}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cantidad Cargada</label>
                    <Input
                      {...form.register(`items.${index}.loadedQuantity`)}
                      type="number"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cantidad Devuelta</label>
                    <Input
                      {...form.register(`items.${index}.returnedQuantity`)}
                      type="number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Envases Devueltos</label>
                    <Input
                      {...form.register(`items.${index}.returnedContainers`)}
                      type="number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notas</label>
                    <Input
                      {...form.register(`items.${index}.notes`)}
                      placeholder="Observaciones..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notas</label>
          <textarea
            {...form.register("notes")}
            className="w-full h-20 p-2 mt-1 border rounded"
            placeholder="Agregar notas o comentarios adicionales..."
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit">
            Guardar Cuadre
          </Button>
        </div>
      </form>
    </Form>
  );
}