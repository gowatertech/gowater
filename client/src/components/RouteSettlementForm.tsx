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

  const { data: vehicleLoading, isLoading, error } = useQuery<LoadingWithRelations>({
    queryKey: ["/api/vehicle-loading", vehicleLoadingId],
    enabled: !!vehicleLoadingId,
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

  // Inicializar valores por defecto para items antes de useFieldArray
  React.useEffect(() => {
    if (vehicleLoading?.items) {
      const itemsData = vehicleLoading.items.map(item => ({
        productId: item.productId,
        loadedQuantity: item.quantity,
        returnedQuantity: item.returnedQuantity || 0,
        soldQuantity: item.quantity - (item.returnedQuantity || 0),
        returnedContainers: 0,
        notes: item.notes || ""
      }));
      
      form.reset({
        vehicleLoadingId,
        totalCashReceived: "0.00",
        totalCreditReceived: "0.00",
        totalInvoiced: "0.00",
        notes: "",
        items: itemsData
      });
    }
  }, [vehicleLoading, form, vehicleLoadingId]);
  
  // Importante: Declarar useFieldArray después de la inicialización de los valores
  const { fields } = useFieldArray({
    control: form.control,
    name: "items"
  });

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
        throw new Error(error.error || "Error al crear el cuadre de ruta");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-500">Error al cargar los datos: {error.message}</p>
      </div>
    );
  }

  if (!vehicleLoading?.items) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">No se encontraron datos para esta carga</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Carga #{vehicleLoading.loadingNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {fields.map((field, index) => {
                const item = vehicleLoading.items[index];
                if (!item) return null;
                
                return (
                  <div key={field.id} className="border p-4 rounded-lg">
                    <h3 className="font-medium">{item.product.name}</h3>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div>
                        <span className="text-sm text-gray-500">Cantidad Cargada</span>
                        <p>{item.quantity}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Cantidad Devuelta</span>
                        <Input
                          type="number"
                          {...form.register(`items.${index}.returnedQuantity`)}
                        />
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Envases Devueltos</span>
                        <Input
                          type="number"
                          {...form.register(`items.${index}.returnedContainers`)}
                        />
                      </div>
                    </div>
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
              <div>
                <span className="text-sm text-gray-500">Total Efectivo Recibido</span>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('totalCashReceived')}
                />
              </div>
              <div>
                <span className="text-sm text-gray-500">Total Crédito</span>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('totalCreditReceived')}
                />
              </div>
              <div>
                <span className="text-sm text-gray-500">Total Facturado</span>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('totalInvoiced')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit">
            Guardar Cuadre
          </Button>
        </div>
      </form>
    </Form>
  );
}