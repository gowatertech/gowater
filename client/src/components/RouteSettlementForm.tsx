import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
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
import { apiRequest } from "@/lib/api";
import { useEffect, useState } from 'react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  console.log("Rendering RouteSettlementForm with vehicleLoadingId:", vehicleLoadingId);

  // Configurar el formulario con valores por defecto iniciales
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

  // Necesitamos useFieldArray para manejar los items
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Cargar los datos de la carga de vehículo
  const { data: vehicleLoading, isLoading, error } = useQuery<LoadingWithRelations>({
    queryKey: ["/api/vehicle-loading", vehicleLoadingId],
    enabled: !!vehicleLoadingId,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 0 // No guardar en caché para siempre asegurar datos frescos
  });

  console.log("VehicleLoading data:", vehicleLoading);

  // Actualizar valores del formulario cuando cambian los datos del vehículo
  useEffect(() => {
    if (vehicleLoading?.items && vehicleLoading.items.length > 0) {
      console.log("Initializing form with items:", vehicleLoading.items.length);
      
      const itemsData = vehicleLoading.items.map(item => ({
        productId: item.productId,
        loadedQuantity: item.quantity,
        returnedQuantity: item.returnedQuantity || 0,
        soldQuantity: item.quantity - (item.returnedQuantity || 0),
        returnedContainers: 0,
        notes: item.notes || ""
      }));
      
      // Actualizar directamente los items en lugar de un reset completo
      replace(itemsData);
      
      // Actualizar los valores principales del formulario
      form.setValue('vehicleLoadingId', vehicleLoadingId);
      form.setValue('totalCashReceived', "0.00");
      form.setValue('totalCreditReceived', "0.00");
      form.setValue('totalInvoiced', "0.00");
      form.setValue('notes', "");
      
      setIsInitialized(true);
    }
  }, [vehicleLoading, form, vehicleLoadingId, replace]);

  const onSubmit = async (values: InsertRouteSettlement) => {
    console.log("Submitting form with values:", values);
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("/api/route-settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      toast({
        description: "Cuadre de ruta registrado exitosamente",
        duration: 3000,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/route-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading"] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Error al crear el cuadre de ruta",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando datos...</span>
      </div>
    );
  }

  // Mostrar errores
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-500 font-medium">Error al cargar los datos</p>
        <p className="text-sm text-red-400">{error instanceof Error ? error.message : 'Error desconocido'}</p>
        <Button 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading", vehicleLoadingId] })}
          className="mt-4"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  // Verificar si hay datos para mostrar
  if (!vehicleLoading || !vehicleLoading.items || vehicleLoading.items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">No se encontraron datos para esta carga</p>
      </div>
    );
  }

  // Debug info for field array
  console.log("Fields in field array:", fields.length);
  console.log("Vehicle items:", vehicleLoading.items.length);

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Datos de la Carga #{vehicleLoading.loadingNumber}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {new Date(vehicleLoading.date).toLocaleDateString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 mb-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Conductor</p>
                    <p className="text-sm text-muted-foreground">{vehicleLoading.driver.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Vehículo</p>
                    <p className="text-sm text-muted-foreground">
                      {vehicleLoading.truck.brand} {vehicleLoading.truck.model} ({vehicleLoading.truck.plate})
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4">
                {fields.map((field, index) => {
                  const item = vehicleLoading.items.find(i => i.productId === field.productId);
                  if (!item) return null;
                  
                  return (
                    <div key={field.id} className="border p-4 rounded-lg">
                      <h3 className="font-medium">{item.product.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div>
                          <span className="text-sm text-gray-500">Cantidad Cargada</span>
                          <p className="font-medium">{item.quantity}</p>
                          <input
                            type="hidden"
                            {...form.register(`items.${index}.loadedQuantity`)}
                            value={item.quantity}
                          />
                          <input
                            type="hidden"
                            {...form.register(`items.${index}.productId`)}
                            value={item.productId}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.returnedQuantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm text-gray-500">Cantidad Devuelta</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.quantity}
                                  {...field}
                                  value={field.value}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    field.onChange(value);
                                    // Actualizar soldQuantity
                                    const loadedQty = item.quantity;
                                    form.setValue(`items.${index}.soldQuantity`, loadedQty - value);
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.returnedContainers`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm text-gray-500">Envases Devueltos</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  {...field}
                                  value={field.value}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <input
                        type="hidden"
                        {...form.register(`items.${index}.soldQuantity`)}
                      />
                      <input
                        type="hidden"
                        {...form.register(`items.${index}.notes`)}
                        value={item.notes || ""}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Efectivo y Crédito</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="totalCashReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Efectivo Recibido</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalCreditReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Crédito</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalInvoiced"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Facturado</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Notas adicionales (opcional)"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button 
              type="submit" 
              disabled={isSubmitting || !isInitialized}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cuadre'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}