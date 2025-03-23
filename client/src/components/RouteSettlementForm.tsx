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


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Información de Carga</CardTitle>
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
              <div className="space-y-4">
                {vehicleLoading.items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 border-b">
                    <div>
                      <span className="font-medium">Producto:</span>
                      <span className="ml-2">{item.product.name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Cantidad Cargada:</span>
                      <span className="ml-2">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="font-medium">Total:</span>
                      <span className="ml-2">RD$ {calculateTotal(item.quantity, item.product.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Cuadre de Ruta</h3>
              {fields.map((field, index) => {
                const product = vehicleLoading.items.find(
                  item => item.productId === field.productId
                )?.product;

                return (
                  <div key={field.id} className="grid gap-4 p-2 border-b">
                    <div className="font-medium">{product?.name}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        type="number"
                        placeholder="Cantidad Devuelta"
                        {...form.register(`items.${index}.returnedQuantity`)}
                      />
                      <Input
                        type="number"
                        placeholder="Envases Devueltos"
                        {...form.register(`items.${index}.returnedContainers`)}
                      />
                      <Input
                        type="text"
                        placeholder="Notas"
                        {...form.register(`items.${index}.notes`)}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Input
                  type="number"
                  placeholder="Total Efectivo Recibido"
                  {...form.register('totalCashReceived')}
                />
                <Input
                  type="number"
                  placeholder="Total Crédito"
                  {...form.register('totalCreditReceived')}
                />
                <Input
                  type="number"
                  placeholder="Total Facturado"
                  {...form.register('totalInvoiced')}
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