import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BarChart4, Truck } from "lucide-react";
import type { VehicleLoading, Product, User, Truck as TruckType } from "@shared/schema";

// Esquema para validar formulario de cuadre
const settlementSchema = z.object({
  vehicleLoadingId: z.number(),
  totalCashReceived: z.string().min(1, "Campo requerido"),
  totalCreditReceived: z.string().min(1, "Campo requerido"),
  totalInvoiced: z.string().min(1, "Campo requerido"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number(),
    loadedQuantity: z.number(),
    returnedQuantity: z.number(),
    soldQuantity: z.number(),
    returnedContainers: z.number(),
    notes: z.string().optional(),
  })),
});

interface LoadingWithRelations extends VehicleLoading {
  truck: TruckType;
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

interface SettlementFormProps {
  loading: LoadingWithRelations;
  onSuccess: () => void;
}

export function VehicleSettlementForm({ loading, onSuccess }: SettlementFormProps) {
  const { toast } = useToast();
  
  const [calculatedTotals, setCalculatedTotals] = useState({
    cashDifference: "0.00",
    totalSold: "0.00",
  });

  // Preparar valores iniciales para el formulario
  const defaultValues = {
    vehicleLoadingId: loading.id,
    totalCashReceived: "0.00",
    totalCreditReceived: "0.00",
    totalInvoiced: "0.00",
    notes: "",
    items: loading.items.map(item => ({
      productId: item.productId,
      loadedQuantity: item.quantity,
      returnedQuantity: 0,
      soldQuantity: item.quantity,
      returnedContainers: 0,
      notes: "",
    })),
  };

  // Inicializar formulario con validación
  const form = useForm<z.infer<typeof settlementSchema>>({
    resolver: zodResolver(settlementSchema),
    defaultValues,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest<any>("/api/route-settlements", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading/pending"] });
      toast({
        title: "Cuadre completado",
        description: "El cuadre de vehículo ha sido registrado exitosamente.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el cuadre de vehículo.",
        variant: "destructive",
      });
    },
  });

  // Funciones para calcular totales
  function calculateTotalInvoiced() {
    let total = 0;
    loading.items.forEach(item => {
      const price = parseFloat(item.product?.price || "0");
      total += price * item.quantity;
    });
    return total.toFixed(2);
  }

  // Manejador para calcular diferencias y ajustes
  const calculateDifferences = () => {
    const values = form.getValues();
    const totalCashReceived = parseFloat(values.totalCashReceived) || 0;
    const totalCreditReceived = parseFloat(values.totalCreditReceived) || 0;
    
    // Total vendido basado en la cantidad vendida de cada producto
    let totalSold = 0;
    values.items.forEach(item => {
      const product = loading.items.find(p => p.productId === item.productId)?.product;
      if (product) {
        const price = parseFloat(product.price || "0");
        totalSold += price * item.soldQuantity;
      }
    });
    
    // Actualizar el valor facturado con lo que realmente se vendió
    const totalInvoiced = totalSold;
    form.setValue("totalInvoiced", totalInvoiced.toFixed(2));
    
    // Diferencia entre lo recibido (efectivo + crédito) y lo facturado
    // Si es positivo, hay un sobrante. Si es negativo, hay un faltante.
    const cashDifference = (totalCashReceived + totalCreditReceived - totalInvoiced).toFixed(2);
    
    setCalculatedTotals({
      cashDifference,
      totalSold: totalSold.toFixed(2),
    });
  };

  const handleChange = () => {
    // Calcular las diferencias cuando cambian los valores
    calculateDifferences();
  };

  // Actualizar campos calculados cuando cambian las cantidades
  const updateSoldQuantity = (index: number, returnedQuantity: number) => {
    const loadedQuantity = form.getValues().items[index].loadedQuantity;
    const soldQuantity = loadedQuantity - returnedQuantity;
    
    // Actualizar la cantidad vendida
    form.setValue(`items.${index}.soldQuantity`, soldQuantity >= 0 ? soldQuantity : 0);
    
    // Recalcular totales
    calculateDifferences();
  };

  const onSubmit = (data: z.infer<typeof settlementSchema>) => {
    // Asegurarse de que las cantidades sean números válidos
    const formattedData = {
      ...data,
      totalCashReceived: parseFloat(data.totalCashReceived).toFixed(2),
      totalCreditReceived: parseFloat(data.totalCreditReceived).toFixed(2),
      totalInvoiced: parseFloat(data.totalInvoiced).toFixed(2),
      cashDifference: calculatedTotals.cashDifference,
    };
    
    mutate(formattedData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuadre de Vehículo - Carga #{loading.loadingNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Información de la carga */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Fecha</p>
              <p className="font-medium">{new Date(loading.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Conductor</p>
              <p className="font-medium">{loading.driver?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vehículo</p>
              <p className="font-medium">{loading.truck?.plate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Efectivo Inicial</p>
              <p className="font-medium">RD$ {loading.initialCash}</p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Sección de Efectivo y Crédito */}
            <div className="border p-4 rounded-md">
              <h3 className="text-lg font-medium mb-4">Totales de Facturación</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="totalCashReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Efectivo Recibido (RD$)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="text" 
                          inputMode="decimal"
                          onBlur={(e) => {
                            // Formatear el valor para mostrar dos decimales
                            const value = e.target.value.trim();
                            const parsedValue = parseFloat(value) || 0;
                            const formattedValue = parsedValue.toFixed(2);
                            e.target.value = formattedValue;
                            field.onChange(formattedValue);
                            handleChange();
                          }}
                          onChange={(e) => {
                            // Permitir solo números y un punto decimal
                            const value = e.target.value.replace(/[^\d.]/g, '');
                            field.onChange(value);
                            handleChange();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalCreditReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crédito Otorgado (RD$)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          onChange={(e) => {
                            field.onChange(e);
                            handleChange();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalInvoiced"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Facturado (RD$)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          onChange={(e) => {
                            field.onChange(e);
                            handleChange();
                          }}
                          className="bg-gray-50"
                          readOnly
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Mostrar las diferencias calculadas */}
              <div className="mt-4 p-3 border border-gray-200 rounded bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Diferencia de Efectivo</p>
                    <p className={`font-medium ${parseFloat(calculatedTotals.cashDifference) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      RD$ {calculatedTotals.cashDifference}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Vendido (calculado)</p>
                    <p className="font-medium">RD$ {calculatedTotals.totalSold}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección de Productos */}
            <div className="border p-4 rounded-md">
              <h3 className="text-lg font-medium mb-4">Productos y Envases</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Producto</th>
                      <th className="px-4 py-2 text-center">Cargado</th>
                      <th className="px-4 py-2 text-center">Devuelto</th>
                      <th className="px-4 py-2 text-center">Vendido</th>
                      <th className="px-4 py-2 text-center">Envases Devueltos</th>
                      <th className="px-4 py-2 text-center">¿Retornable?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.items.map((item, index) => (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-2">
                          {item.product?.name}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.returnedQuantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number" 
                                    min="0" 
                                    max={item.quantity}
                                    value={field.value}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      field.onChange(value);
                                      updateSoldQuantity(index, value);
                                    }}
                                    className="w-20 mx-auto text-center"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.soldQuantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number" 
                                    min="0" 
                                    value={field.value}
                                    readOnly
                                    className="w-20 mx-auto text-center bg-gray-50"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.product?.isReturnable ? (
                            <FormField
                              control={form.control}
                              name={`items.${index}.returnedContainers`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      {...field}
                                      type="number" 
                                      min="0" 
                                      max={form.getValues().items[index].soldQuantity}
                                      value={field.value}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 0;
                                        field.onChange(value);
                                        handleChange();
                                      }}
                                      className="w-20 mx-auto text-center"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.product?.isReturnable ? "Sí" : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Observaciones sobre el cuadre de vehículo"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onSuccess}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isPending}
              >
                {isPending ? "Procesando..." : "Registrar Cuadre"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}