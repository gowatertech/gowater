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
    returnedQuantity: number;
    notes: string | null;
  }>;
}

export function RouteSettlementForm({ vehicleLoadingId, onSuccess }: RouteSettlementFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener datos de la carga
  const { data: vehicleLoading, isLoading: loadingData } = useQuery<LoadingWithRelations>({
    queryKey: ["/api/vehicle-loading", vehicleLoadingId],
  });

  // Obtener productos
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
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

  // Actualizar los items del formulario cuando se carguen los datos
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

  // Calcular totales y diferencias
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

  if (loadingData) {
    return <div>Cargando datos...</div>;
  }

  if (!vehicleLoading) {
    return <div>No se encontró la carga</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información de la Carga</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm font-medium">Vehículo:</span>
                <span className="ml-2">{vehicleLoading.truck?.plate || vehicleLoading.truckId}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Conductor:</span>
                <span className="ml-2">{vehicleLoading.driver?.name || vehicleLoading.driverId}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Fecha:</span>
                <span className="ml-2">{new Date(vehicleLoading.date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Efectivo Inicial:</span>
                <span className="ml-2">${vehicleLoading.initialCash}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Efectivo Recibido</label>
            <Input
              {...form.register("totalCashReceived")}
              type="number"
              step="0.01"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Crédito Recibido</label>
            <Input
              {...form.register("totalCreditReceived")}
              type="number"
              step="0.01"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Total Facturado</label>
            <Input
              {...form.register("totalInvoiced")}
              type="number"
              step="0.01"
              className="mt-1"
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium">Total Recibido:</span>
              <span className="ml-2">${totals.totalReceived}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Diferencia:</span>
              <span className={`ml-2 ${parseFloat(totals.difference) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                ${totals.difference}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Detalle de Productos</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 text-left">Producto</th>
                  <th className="p-2 text-right">Precio</th>
                  <th className="p-2 text-right">Cargado</th>
                  <th className="p-2 text-right">Devuelto</th>
                  <th className="p-2 text-right">Vendido</th>
                  <th className="p-2 text-right">Envases Dev.</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const product = products.find(p => p.id === field.productId);
                  if (!product) return null;

                  const loadedQty = form.watch(`items.${index}.loadedQuantity`);
                  const returnedQty = form.watch(`items.${index}.returnedQuantity`) || 0;
                  const soldQty = loadedQty - returnedQty;
                  const total = soldQty * parseFloat(product.price);

                  return (
                    <tr key={field.id} className="border-b">
                      <td className="p-2">{product.name}</td>
                      <td className="p-2 text-right">${product.price}</td>
                      <td className="p-2 text-right">{loadedQty}</td>
                      <td className="p-2">
                        <Input
                          {...form.register(`items.${index}.returnedQuantity` as const)}
                          type="number"
                          className="w-20 text-right"
                          min="0"
                          max={loadedQty}
                        />
                      </td>
                      <td className="p-2 text-right">{soldQty}</td>
                      <td className="p-2">
                        <Input
                          {...form.register(`items.${index}.returnedContainers` as const)}
                          type="number"
                          className="w-20 text-right"
                          min="0"
                        />
                      </td>
                      <td className="p-2 text-right">${total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">Notas</label>
          <textarea
            {...form.register("notes")}
            className="w-full min-h-[100px] p-2 border rounded"
            placeholder="Agregar notas o comentarios adicionales..."
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="submit">
            Guardar Cuadre
          </Button>
        </div>
      </form>
    </Form>
  );
}