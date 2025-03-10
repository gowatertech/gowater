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

// Interface for batch item form
interface BatchItem {
  productId: number;
  quantity: number;
  cost: string;
  total: string;
}

// Interface for production batch with details
interface ProductionBatchWithDetails {
  id: number;
  batchNumber: string;
  warehouseId: number;
  warehouseName: string;
  date: string;
  notes: string | null;
  status: string;
  totalCost: string;
  items: {
    id: number;
    productId: number;
    quantity: number;
    cost: string;
    productName: string;
  }[];
}

export default function ProductionRegistrationPage() {
  const { toast } = useToast();
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  // Fetch products and warehouses
  const { data: products, isLoading: isLoadingProducts, isError: isProductError } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    onError: (error) => {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  });

  const { data: warehouses, isLoading: isLoadingWarehouses, isError: isWarehouseError } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
    onError: (error) => {
      console.error("Error fetching warehouses:", error);
      toast({
        title: "Error",
        description: "Failed to load warehouses",
        variant: "destructive",
      });
    }
  });

  // Fetch production batches
  const { data: productionBatches = [], isLoading: isLoadingBatches } = useQuery<ProductionBatchWithDetails[]>({
    queryKey: ["/api/production-batches"],
  });

  // Form for adding individual items
  const itemForm = useForm<BatchItem>({
    defaultValues: {
      productId: 0,
      quantity: 0,
      cost: "0.00",
      total: "0.00",
    },
  });

  // Main form for batch details
  const mainForm = useForm<InsertProductionBatch>({
    resolver: zodResolver(insertProductionBatchSchema),
    defaultValues: {
      warehouseId: 0,
      notes: "",
      status: "completed",
      items: [],
    },
  });

  // Mutation for creating a production batch
  const createBatchMutation = useMutation({
    mutationFn: async (data: InsertProductionBatch) => {
      console.log("Submitting production batch data:", data);
      const res = await apiRequest("POST", "/api/production-batches", data);
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error creating batch:", errorData);
        throw new Error(errorData.error || "Failed to create production batch");
      }
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Production batch created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/production-batches"] });
      toast({
        title: "Success",
        description: "Production batch created successfully",
      });
      setBatchItems([]);
      mainForm.reset();
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create production batch",
        variant: "destructive",
      });
    },
  });

  // Handle submitting the entire batch
  const handleSubmit = (data: InsertProductionBatch) => {
    if (batchItems.length === 0) {
      toast({
        title: "Error",
        description: "Por favor agregue al menos un producto al lote",
        variant: "destructive",
      });
      return;
    }

    if (!data.warehouseId || data.warehouseId === 0) {
      toast({
        title: "Error",
        description: "Por favor seleccione un almacén",
        variant: "destructive",
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
        cost: item.cost,
      })),
    };

    console.log("Enviando datos del lote:", batchData);
    createBatchMutation.mutate(batchData);
  };

  // Handle adding items to the batch
  const handleAddItem = (data: BatchItem) => {
    if (!data.productId || data.productId === 0) {
      toast({
        title: "Error",
        description: "Por favor seleccione un producto",
        variant: "destructive",
      });
      return;
    }

    if (!data.quantity || data.quantity <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    if (!data.cost || parseFloat(data.cost) <= 0) {
      toast({
        title: "Error",
        description: "El costo debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    // Check if product already exists in batch
    const existingItem = batchItems.find(item => item.productId === data.productId);
    if (existingItem) {
      toast({
        title: "Error",
        description: "Este producto ya está en el lote",
        variant: "destructive",
      });
      return;
    }

    const product = products?.find((p) => p.id === data.productId);
    if (!product) {
      toast({
        title: "Error",
        description: "Producto no válido",
        variant: "destructive",
      });
      return;
    }

    const total = (Number(data.cost) * data.quantity).toFixed(2);
    setBatchItems([...batchItems, { ...data, total }]);
    itemForm.reset();
  };

  // Handle removing items from the batch
  const handleRemoveItem = (index: number) => {
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };


  const totalCost = batchItems.reduce((sum, item) => sum + Number(item.total), 0);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Register Production</h1>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...mainForm}>
            <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={mainForm.control}
                  name="warehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Warehouse" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses?.map((warehouse) => (
                            <SelectItem
                              key={warehouse.id}
                              value={warehouse.id.toString()}
                            >
                              {warehouse.name} ({warehouse.code})
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
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input {...field} />
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

      {/* Add Products Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Products</CardTitle>
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
                      <FormLabel>Product</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((product) => (
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
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
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
                      <FormLabel>Cost per Unit</FormLabel>
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
                  <Button type="submit">Add Product</Button>
                </div>
              </div>
            </form>
          </Form>

          {/* Products List */}
          {batchItems.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Products in Batch</h3>
              <div className="space-y-2">
                {batchItems.map((item, index) => {
                  const product = products?.find((p) => p.id === item.productId);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{product?.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {item.quantity} units @ ${item.cost} = ${item.total}
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
                  Total Cost: ${totalCost.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-4">
            <Button
              onClick={mainForm.handleSubmit(handleSubmit)}
              disabled={batchItems.length === 0 || createBatchMutation.isPending}
            >
              Create Production Batch
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Production History */}
      <Card>
        <CardHeader>
          <CardTitle>Production History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingBatches ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Loading production batches...
                  </TableCell>
                </TableRow>
              ) : productionBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No production batches found
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
                    <TableCell>${batch.totalCost}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        batch.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
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