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
    if (vehicleLoading?.items && vehicleLoading.items.length > 0) {
      console.log("Cargando items en el formulario:", vehicleLoading.items);
      
      // Mapear los ítems con verificación extra
      const formItems = vehicleLoading.items
        .filter(item => item.product) // Solo incluir items con producto
        .map(item => ({
          productId: item.productId,
          loadedQuantity: item.quantity,
          returnedQuantity: item.returnedQuantity || 0,
          soldQuantity: item.quantity - (item.returnedQuantity || 0),
          returnedContainers: 0,
          notes: item.notes || ""
        }));
      
      console.log("Items formateados para el formulario:", formItems);
      
      // Resetear el formulario con los nuevos valores
      form.reset({
        ...form.getValues(),
        vehicleLoadingId: vehicleLoading.id,
        totalCashReceived: "0.00",
        totalCreditReceived: "0.00",
        totalInvoiced: "0.00",
        notes: "",
        items: formItems
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

  // Mejorar la verificación para asegurarnos de que tenemos todos los datos necesarios
  if (loadingData || !vehicleLoading || !vehicleLoading.items || vehicleLoading.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Cargando datos del vehículo...</p>
      </div>
    );
  }
  
  // Verificar si hay productos con la información completa
  const validItems = vehicleLoading.items.filter(item => item.product);
  if (validItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <p className="text-red-500">No se encontraron productos válidos para esta carga.</p>
        <p className="text-sm text-muted-foreground mt-2">Por favor, verifica la carga del vehículo.</p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="text-sm font-medium">Efectivo</label>
            <Input
              {...form.register("totalCashReceived")}
              type="number"
              step="0.01"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Crédito</label>
            <Input
              {...form.register("totalCreditReceived")}
              type="number"
              step="0.01"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Facturado</label>
            <Input
              {...form.register("totalInvoiced")}
              type="number"
              step="0.01"
              className="mt-1"
            />
          </div>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Total Recibido:</span>
                <span className="ml-1">RD$ {totals.totalReceived}</span>
              </div>
              <div>
                <span className="font-medium">Diferencia:</span>
                <span className={`ml-1 ${parseFloat(totals.difference) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  RD$ {totals.difference}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Detalle de Productos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Producto</th>
                  <th className="p-2 text-right">Precio</th>
                  <th className="p-2 text-right">Cargado</th>
                  <th className="p-2 text-right">Devuelto</th>
                  <th className="p-2 text-right">Vendido</th>
                  <th className="p-2 text-right">Envases</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  // Log para depuración
                  console.log("Field:", field);
                  console.log("VehicleLoading items:", vehicleLoading.items);
                  
                  // Buscar el item correspondiente de manera más robusta
                  const item = vehicleLoading.items.find(i => i.productId === field.productId);
                  
                  // Verificar si el item existe y tiene un producto asociado
                  if (!item) {
                    console.warn(`No se encontró item para productId: ${field.productId}`);
                    return null;
                  }
                  
                  if (!item.product) {
                    console.warn(`El item con productId: ${field.productId} no tiene información de producto`);
                    return null;
                  }

                  const loadedQty = form.watch(`items.${index}.loadedQuantity`);
                  const returnedQty = form.watch(`items.${index}.returnedQuantity`) || 0;
                  const soldQty = loadedQty - returnedQty;
                  const total = parseFloat(item.product.price) * soldQty;

                  return (
                    <tr key={field.id} className="border-b">
                      <td className="p-1">{item.product.name}</td>
                      <td className="p-1 text-right">RD$ {item.product.price}</td>
                      <td className="p-1 text-right">{loadedQty}</td>
                      <td className="p-1">
                        <Input
                          {...form.register(`items.${index}.returnedQuantity` as const)}
                          type="number"
                          className="w-16 text-right"
                          min="0"
                          max={loadedQty}
                        />
                      </td>
                      <td className="p-1 text-right">{soldQty}</td>
                      <td className="p-1">
                        <Input
                          {...form.register(`items.${index}.returnedContainers` as const)}
                          type="number"
                          className="w-16 text-right"
                          min="0"
                        />
                      </td>
                      <td className="p-1 text-right">RD$ {total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
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