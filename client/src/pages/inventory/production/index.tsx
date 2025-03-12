import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertProductionBatch, Product, Warehouse } from "@shared/schema";
import { insertProductionBatchSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Trash } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BatchItem {
  productId: number;
  quantity: number;
  cost: string;
  total: string;
}

export default function ProductionRegistration() {
  const { toast } = useToast();
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  // Fetch products with error handling
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/products"],
    staleTime: 10000
  });

  // Fetch warehouses with error handling
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["/api/warehouses"],
    staleTime: 10000
  });

  // Fetch production batches
  const { data: productionBatches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ["/api/production-batches"]
  });

  // Loading state
  if (isLoadingProducts || isLoadingWarehouses) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  // Item form
  const itemForm = useForm({
    defaultValues: {
      productId: 0,
      quantity: 0,
      cost: "0.00"
    }
  });

  // Main form
  const mainForm = useForm({
    resolver: zodResolver(insertProductionBatchSchema),
    defaultValues: {
      warehouseId: 0,
      notes: "",
      status: "completed",
      items: []
    }
  });

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (data: InsertProductionBatch) => {
      const response = await apiRequest("POST", "/api/production-batches", data);
      if (!response.ok) {
        throw new Error("Error al crear lote de producción");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-batches"] });
      toast({
        title: "Éxito",
        description: "Lote de producción creado exitosamente"
      });
      setBatchItems([]);
      mainForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle submitting the entire batch
  const onSubmit = (data: InsertProductionBatch) => {
    if (!data.warehouseId) {
      toast({
        title: "Error",
        description: "Por favor seleccione un almacén",
        variant: "destructive"
      });
      return;
    }

    if (batchItems.length === 0) {
      toast({
        title: "Error",
        description: "Por favor agregue al menos un producto al lote",
        variant: "destructive"
      });
      return;
    }

    const batchData: InsertProductionBatch = {
      warehouseId: data.warehouseId,
      notes: data.notes || "",
      status: "completed",
      items: batchItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: item.cost
      }))
    };

    createBatchMutation.mutate(batchData);
  };

  // Handle adding items to the batch
  const handleAddItem = (data: BatchItem) => {
    if (!data.productId) {
      toast({
        title: "Error",
        description: "Por favor seleccione un producto",
        variant: "destructive"
      });
      return;
    }

    if (!data.quantity || data.quantity <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    if (!data.cost || parseFloat(data.cost) <= 0) {
      toast({
        title: "Error",
        description: "El costo debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    const total = (parseFloat(data.cost) * data.quantity).toFixed(2);
    setBatchItems(prev => [...prev, { ...data, total }]);
    itemForm.reset();
  };

  // Handle removing items from the batch
  const handleRemoveItem = (index: number) => {
    setBatchItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalCost = batchItems.reduce((sum, item) => sum + parseFloat(item.total), 0);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Registrar Producción</h1>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del Lote</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...mainForm}>
            <form onSubmit={mainForm.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={mainForm.control}
                  name="warehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Almacén</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar Almacén" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem
                              key={warehouse.id}
                              value={warehouse.id.toString()}
                            >
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={mainForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Observaciones del lote" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agregar Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(handleAddItem)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={itemForm.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producto</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar Producto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id.toString()}
                            >
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={itemForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={itemForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo por Unidad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-end">
                  <Button type="submit">Agregar Producto</Button>
                </div>
              </div>
            </form>
          </Form>

          {batchItems.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Productos en el Lote</h3>
              <div className="space-y-2">
                {batchItems.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{product?.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {item.quantity} unidades @ RD${item.cost} = RD${item.total}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                <div className="text-right font-semibold">
                  Costo Total: RD${totalCost.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Button
              onClick={mainForm.handleSubmit(onSubmit)}
              disabled={batchItems.length === 0 || createBatchMutation.isPending}
            >
              Crear Lote de Producción
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Producción</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número de Lote</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Costo Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingBatches ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Cargando lotes de producción...
                  </TableCell>
                </TableRow>
              ) : productionBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No se encontraron lotes de producción
                  </TableCell>
                </TableRow>
              ) : (
                productionBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>{batch.batchNumber}</TableCell>
                    <TableCell>{new Date(batch.date).toLocaleDateString()}</TableCell>
                    <TableCell>{batch.warehouseName}</TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside">
                        {batch.items.map((item) => (
                          <li key={item.id} className="text-sm">
                            {item.quantity} x {item.productName}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>RD${batch.totalCost}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        batch.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {batch.status === "completed" ? "Completado" : "Pendiente"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}