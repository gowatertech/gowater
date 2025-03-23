import React from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  InsertRouteSettlement, 
  insertRouteSettlementSchema,
  VehicleLoading,
  Product,
  User,
  Truck
} from "@shared/schema";
import { Loader2 } from "lucide-react";

// Props del componente
interface RouteSettlementFormProps {
  vehicleLoadingId: number;
  onSuccess?: () => void;
}

// Definición de interface para el item cargado
interface LoadingItem {
  id: number;
  loadingId: number;
  productId: number;
  quantity: number;
  returnedQuantity: number | null;
  notes: string | null;
  product: Product;
}

// Definición de interface para la carga del vehículo con relaciones
interface LoadingWithRelations extends VehicleLoading {
  truck: Truck;
  driver: User;
  items: LoadingItem[];
}

// Componente principal
export function RouteSettlementForm({ vehicleLoadingId, onSuccess }: RouteSettlementFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Consultar datos de la carga del vehículo
  const { data: vehicleLoading, isLoading } = useQuery<LoadingWithRelations>({
    queryKey: ["/api/vehicle-loading", vehicleLoadingId],
    retry: 1
  });

  // Mostrar estado de carga
  if (isLoading || !vehicleLoading || !vehicleLoading.items) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando datos del vehículo...</p>
      </div>
    );
  }

  // Inicializar los items del formulario
  const formItems = [];
  for (const item of vehicleLoading.items) {
    if (item && item.product) {
      formItems.push({
        productId: item.productId,
        loadedQuantity: item.quantity,
        returnedQuantity: 0,
        soldQuantity: item.quantity,
        returnedContainers: 0,
        notes: ""
      });
    }
  }

  // Configurar formulario con validación
  const form = useForm<InsertRouteSettlement>({
    resolver: zodResolver(insertRouteSettlementSchema),
    defaultValues: {
      vehicleLoadingId,
      totalCashReceived: "0.00",
      totalCreditReceived: "0.00",
      totalInvoiced: "0.00",
      notes: "",
      items: formItems
    }
  });

  // Configurar campos de array para los items
  const { fields } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Manejar envío del formulario
  const onSubmit = async (values: InsertRouteSettlement) => {
    try {
      const response = await fetch("/api/route-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        throw new Error("Error al crear el cuadre de ruta");
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

  // Formatear montos como moneda
  const formatCurrency = (amount: number) => amount.toFixed(2);

  // Calcular totales
  const values = form.getValues();
  const cashReceived = parseFloat(values.totalCashReceived) || 0;
  const creditReceived = parseFloat(values.totalCreditReceived) || 0;
  const totalReceived = cashReceived + creditReceived;
  const totalInvoiced = parseFloat(values.totalInvoiced) || 0;
  const difference = totalReceived - totalInvoiced;

  // Filtrar items válidos
  const validItems = vehicleLoading.items.filter((item: LoadingItem) => item && item.product);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cuadre de Ruta - Carga #{vehicleLoading.loadingNumber || 'N/A'}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Información del vehículo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <span className="font-medium">Número de Carga:</span> 
                <span className="ml-2">#{vehicleLoading.loadingNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Vehículo:</span> 
                <span className="ml-2">{vehicleLoading.truck?.plate || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Conductor:</span> 
                <span className="ml-2">{vehicleLoading.driver?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Fecha:</span> 
                <span className="ml-2">{vehicleLoading.date ? new Date(vehicleLoading.date).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Efectivo Inicial:</span> 
                <span className="ml-2">RD$ {vehicleLoading.initialCash || '0.00'}</span>
              </div>
            </div>

            {/* Tabla de productos cargados */}
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-medium mb-3">Productos Cargados</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Producto</th>
                    <th className="text-right p-2">Precio</th>
                    <th className="text-right p-2">Cantidad</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {validItems.map((item: LoadingItem) => {
                    const price = parseFloat(item.product.price);
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">{item.product.name}</td>
                        <td className="p-2 text-right">RD$ {formatCurrency(price)}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right">RD$ {formatCurrency(item.quantity * price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right p-2 font-medium">Total:</td>
                    <td className="text-right p-2 font-medium">
                      RD$ {formatCurrency(
                        validItems.reduce((total: number, item: LoadingItem) => {
                          return total + (item.quantity * parseFloat(item.product.price));
                        }, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Tabla de cuadre de ruta */}
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-medium mb-3">Cuadre de Ruta</h3>
              
              {fields.length > 0 ? (
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
                      // Buscar el producto correspondiente
                      const loadingItem = validItems.find(item => item.productId === field.productId);
                      if (!loadingItem) return null;
                      
                      const returnedQty = form.watch(`items.${index}.returnedQuantity`) || 0;
                      const soldQty = field.loadedQuantity - returnedQty;
                      
                      return (
                        <tr key={field.id} className="border-b">
                          <td className="p-2">{loadingItem.product.name}</td>
                          <td className="p-2 text-right">{field.loadedQuantity}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="text-right"
                              min="0"
                              max={field.loadedQuantity}
                              {...form.register(`items.${index}.returnedQuantity`, {
                                valueAsNumber: true,
                                onChange: (e) => {
                                  const returned = parseInt(e.target.value) || 0;
                                  form.setValue(`items.${index}.soldQuantity`, field.loadedQuantity - returned);
                                }
                              })}
                            />
                          </td>
                          <td className="p-2 text-right">{soldQty}</td>
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
              ) : (
                <p className="text-muted-foreground p-4 text-center">No hay productos para mostrar</p>
              )}
              
              {/* Campos de totales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div>
                  <label className="text-sm font-medium mb-1 block">Efectivo Recibido</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('totalCashReceived')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Crédito</label>
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
              
              {/* Resumen */}
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Total Recibido:</span>
                    <span className="ml-2">RD$ {formatCurrency(totalReceived)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Diferencia:</span>
                    <span className={`ml-2 ${difference < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      RD$ {formatCurrency(difference)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Notas adicionales */}
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