import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertProductionBatch, Product, User, Warehouse } from "@shared/schema";
import { insertProductionBatchSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Trash } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProductBatchItem = {
  productId: number;
  productName?: string;
  quantity: number;
  cost: string;
  total: string;
};

export default function CargaProductos() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [batchItems, setBatchItems] = useState<ProductBatchItem[]>([]);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  const form = useForm<ProductBatchItem>({
    defaultValues: {
      productId: 0,
      quantity: 0,
      cost: "0.00",
      total: "0.00",
    },
  });

  const mainForm = useForm<InsertProductionBatch>({
    resolver: zodResolver(insertProductionBatchSchema),
    defaultValues: {
      warehouseId: 0,
      notes: "",
      status: "completed",
      items: [],
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: InsertProductionBatch) => {
      const res = await apiRequest("POST", "/api/production-batches", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: t("success"),
        description: t("batchCreated"),
      });
      setBatchItems([]);
      mainForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const calculateTotal = (quantity: number, cost: string) => {
    return (Number(quantity) * Number(cost)).toFixed(2);
  };

  const addItemToBatch = (data: ProductBatchItem) => {
    const product = products?.find(p => p.id === data.productId);
    const total = calculateTotal(data.quantity, data.cost);

    setBatchItems([...batchItems, { 
      ...data,
      productName: product?.name,
      total,
    }]);
    form.reset();
  };

  const removeItemFromBatch = (index: number) => {
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };

  const onSubmit = (data: InsertProductionBatch) => {
    if (batchItems.length === 0) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("addProductsFirst"),
      });
      return;
    }

    const batchData = {
      ...data,
      items: batchItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: item.cost,
      })),
    };

    createBatchMutation.mutate(batchData);
  };

  const totalCost = batchItems.reduce((sum, item) => sum + Number(item.total), 0);

  // Watch quantity and cost to calculate total
  const quantity = form.watch("quantity");
  const cost = form.watch("cost");
  const currentTotal = calculateTotal(quantity || 0, cost || "0.00");

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("batchDetails")}</CardTitle>
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
                      <FormLabel>{t("warehouse")}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectWarehouse")} />
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
                      <FormLabel>{t("notes")}</FormLabel>
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

      <Card>
        <CardHeader>
          <CardTitle>{t("addProducts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(addItemToBatch)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("product")}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectProduct")} />
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
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("quantity")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("unitCost")} (RD$)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>{t("lineTotal")}</FormLabel>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted">
                    RD$ {currentTotal}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit">
                  {t("addToBatch")}
                </Button>
              </div>
            </form>
          </Form>

          {batchItems.length > 0 && (
            <div className="mt-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead className="text-right">{t("quantity")}</TableHead>
                    <TableHead className="text-right">{t("unitCost")}</TableHead>
                    <TableHead className="text-right">{t("total")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">RD$ {item.cost}</TableCell>
                      <TableCell className="text-right">RD$ {item.total}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemFromBatch(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">
                      {t("total")}:
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      RD$ {totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={mainForm.handleSubmit(onSubmit)}
                  disabled={createBatchMutation.isPending}
                >
                  {createBatchMutation.isPending ? t("saving") : t("saveBatch")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}