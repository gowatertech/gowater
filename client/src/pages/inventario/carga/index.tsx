import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertProductionBatch, Product, User } from "@shared/schema";
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

type ProductBatchItem = {
  productId: number;
  quantity: number;
  cost: string;
  productName?: string;
};

export default function CargaProductos() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [batchItems, setBatchItems] = useState<ProductBatchItem[]>([]);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<ProductBatchItem>({
    defaultValues: {
      productId: 0,
      quantity: 0,
      cost: "0.00",
    },
  });

  const mainForm = useForm<InsertProductionBatch>({
    resolver: zodResolver(insertProductionBatchSchema),
    defaultValues: {
      productId: 0,
      quantity: 0,
      cost: "0.00",
      warehouse: "",
      userId: 0,
      notes: "",
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: InsertProductionBatch[]) => {
      const res = await apiRequest("POST", "/api/production-batches/bulk", data);
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

  const addItemToBatch = (data: ProductBatchItem) => {
    const product = products?.find(p => p.id === data.productId);
    setBatchItems([...batchItems, { 
      ...data,
      productName: product?.name 
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

    const batches = batchItems.map(item => ({
      ...data,
      productId: item.productId,
      quantity: item.quantity,
      cost: item.cost,
    }));

    createBatchMutation.mutate(batches);
  };

  const totalCost = batchItems.reduce((sum, item) => 
    sum + (Number(item.cost) * item.quantity), 0
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("addProducts")}</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(addItemToBatch)} className="space-y-4">
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
                    <FormLabel>{t("cost")} (RD$)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">
                {t("addToBatch")}
              </Button>
            </form>
          </Form>

          {batchItems.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">{t("batchItems")}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("quantity")}</TableHead>
                    <TableHead>{t("cost")}</TableHead>
                    <TableHead>{t("total")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>RD$ {item.cost}</TableCell>
                      <TableCell>
                        RD$ {(Number(item.cost) * item.quantity).toFixed(2)}
                      </TableCell>
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
                    <TableCell className="font-bold">
                      RD$ {totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("batchDetails")}</h2>
          <Form {...mainForm}>
            <form onSubmit={mainForm.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={mainForm.control}
                name="warehouse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={mainForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("user")}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectUser")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem
                            key={user.id}
                            value={user.id.toString()}
                          >
                            {user.name}
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

              <Button
                type="submit"
                className="w-full"
                disabled={createBatchMutation.isPending || batchItems.length === 0}
              >
                {createBatchMutation.isPending ? t("saving") : t("save")}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}