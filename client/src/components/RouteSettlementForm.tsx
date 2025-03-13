import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  InsertRouteSettlement, 
  VehicleLoading, 
  Product,
  insertRouteSettlementSchema 
} from "@shared/schema";

interface RouteSettlementFormProps {
  vehicleLoadingId: number;
  onSuccess?: () => void;
}

export function RouteSettlementForm({ vehicleLoadingId, onSuccess }: RouteSettlementFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener datos de la carga
  const { data: vehicleLoading } = useQuery<VehicleLoading>({
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
      items: [],
    }
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Manejar envío del formulario
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Productos</h3>
          {fields.map((field, index) => (
            <Card key={field.id} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Cantidad Cargada</label>
                  <Input
                    {...form.register(`items.${index}.loadedQuantity` as const)}
                    type="number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Cantidad Devuelta</label>
                  <Input
                    {...form.register(`items.${index}.returnedQuantity` as const)}
                    type="number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Cantidad Vendida</label>
                  <Input
                    {...form.register(`items.${index}.soldQuantity` as const)}
                    type="number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Envases Devueltos</label>
                  <Input
                    {...form.register(`items.${index}.returnedContainers` as const)}
                    type="number"
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">Notas</label>
          <textarea
            {...form.register("notes")}
            className="w-full min-h-[100px] p-2 border rounded"
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