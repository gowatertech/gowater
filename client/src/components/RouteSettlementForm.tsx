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

interface LoadingItem {
  id: number;
  loadingId: number;
  productId: number;
  quantity: number;
  returnedQuantity: number | null;
  notes: string | null;
  product: Product;
}

interface LoadingWithRelations extends VehicleLoading {
  truck: Truck;
  driver: User;
  items: LoadingItem[];
}

export function RouteSettlementForm({ vehicleLoadingId, onSuccess }: RouteSettlementFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log("RouteSettlementForm - Iniciando con vehicleLoadingId:", vehicleLoadingId);

  const { data: vehicleLoading, isLoading: loadingData } = useQuery<LoadingWithRelations>({
    queryKey: ["/api/vehicle-loading", vehicleLoadingId],
    retry: 1,
    refetchOnWindowFocus: false
  });

  const defaultFormValues = React.useMemo(() => {
    if (!vehicleLoading) {
      return {
        vehicleLoadingId,
        totalCashReceived: "0.00",
        totalCreditReceived: "0.00",
        totalInvoiced: "0.00",
        notes: "",
        items: []
      };
    }

    const itemsWithProducts = vehicleLoading.items
      .filter(item => item.product)
      .map(item => ({
        productId: item.productId,
        loadedQuantity: item.quantity,
        returnedQuantity: 0,
        soldQuantity: item.quantity,
        returnedContainers: 0,
        notes: ""
      }));

    return {
      vehicleLoadingId,
      totalCashReceived: "0.00",
      totalCreditReceived: "0.00",
      totalInvoiced: "0.00",
      notes: "",
      items: itemsWithProducts
    };
  }, [vehicleLoading, vehicleLoadingId]);

  const form = useForm<InsertRouteSettlement>({
    resolver: zodResolver(insertRouteSettlementSchema),
    defaultValues: defaultFormValues
  });

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

  const calculateTotal = (quantity: number, price: string) => {
    return (quantity * Number(price)).toFixed(2);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }


  console.log("Renderizando formulario con datos:", {
    vehicleLoading,
    fields,
    formValues: form.getValues()
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cuadre de Ruta - Carga #{vehicleLoading.loadingNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="font-medium">Número de Carga:</span>
                <span className="ml-2">#{vehicleLoading.loadingNumber}</span>
              </div>
              <div>
                <span className="font-medium">Vehículo:</span>
                <span className="ml-2">{vehicleLoading.truck?.plate}</span>
              </div>
              <div>
                <span className="font-medium">Conductor:</span>
                <span className="ml-2">{vehicleLoading.driver?.name}</span>
              </div>
              <div>
                <span className="font-medium">Fecha:</span>
                <span className="ml-2">{new Date(vehicleLoading.date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-medium">Efectivo Inicial:</span>
                <span className="ml-2">RD$ {vehicleLoading.initialCash}</span>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Productos Cargados</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Producto</th>
                    <th className="text-right p-2">Precio Unitario</th>
                    <th className="text-right p-2">Cantidad</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleLoading.items
                    .filter(item => item.product) // Asegurarse de que producto existe
                    .map((item, index) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2">
                        {item.product ? item.product.name : 'Producto no disponible'}
                      </td>
                      <td className="p-2 text-right">
                        RD$ {item.product ? parseFloat(item.product.price).toFixed(2) : '0.00'}
                      </td>
                      <td className="p-2 text-right">
                        {item.quantity}
                      </td>
                      <td className="p-2 text-right">
                        RD$ {item.product ? calculateTotal(item.quantity, item.product.price) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right p-2 font-medium">Total:</td>
                    <td className="text-right p-2 font-medium">
                      RD$ {vehicleLoading.items
                        .filter(item => item.product)
                        .reduce((total, item) => {
                          return total + (item.quantity * parseFloat(item.product.price));
                        }, 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Cuadre de Ruta</h3>
              <table className="w-full mb-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Producto</th>
                    <th className="text-right p-2">Cargado</th>
                    <th className="text-center p-2">Devuelto</th>
                    <th className="text-right p-2">Vendido</th>
                    <th className="text-center p-2">Envases</th>
                    <th className="text-center p-2">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    // Encontrar el producto correspondiente
                    const loadingItem = vehicleLoading.items.find(
                      item => item.productId === field.productId
                    );
                    
                    if (!loadingItem || !loadingItem.product) {
                      return null;
                    }
                    
                    const product = loadingItem.product;
                    const returnedQty = form.watch(`items.${index}.returnedQuantity`) || 0;
                    const soldQty = field.loadedQuantity - returnedQty;
                    
                    return (
                      <tr key={field.id} className="border-b">
                        <td className="p-2">
                          {product.name}
                        </td>
                        <td className="p-2 text-right">
                          {field.loadedQuantity}
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="text-right"
                            min="0"
                            max={field.loadedQuantity}
                            {...form.register(`items.${index}.returnedQuantity`, {
                              valueAsNumber: true,
                              onChange: (e) => {
                                // Actualizar automáticamente la cantidad vendida
                                const returned = parseInt(e.target.value) || 0;
                                form.setValue(`items.${index}.soldQuantity`, field.loadedQuantity - returned);
                              }
                            })}
                          />
                        </td>
                        <td className="p-2 text-right">
                          {soldQty}
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="text-right"
                            min="0"
                            {...form.register(`items.${index}.returnedContainers`, {
                              valueAsNumber: true
                            })}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="text"
                            placeholder="Notas"
                            {...form.register(`items.${index}.notes`)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div>
                  <label className="text-sm font-medium mb-1 block">Total Efectivo Recibido</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('totalCashReceived')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Total Crédito</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('totalCreditReceived')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Total Facturado</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('totalInvoiced')}
                  />
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Total Recibido:</span>
                    <span className="ml-2">RD$ {totals.totalReceived.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Diferencia:</span>
                    <span className={`ml-2 ${parseFloat(totals.difference) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      RD$ {totals.difference}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="text-sm font-medium mb-1 block">Notas Adicionales</label>
                <textarea
                  className="w-full h-20 p-2 border rounded"
                  placeholder="Escriba notas adicionales aquí..."
                  {...form.register('notes')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">
            Registrar Cuadre
          </Button>
        </div>
      </form>
    </Form>
  );
}