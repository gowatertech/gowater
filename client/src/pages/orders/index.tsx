import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type Order, type Customer, type Product, insertOrderSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Orders() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    product: Product;
    quantity: number;
  }>>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm({
    resolver: zodResolver(insertOrderSchema),
    defaultValues: {
      customerId: 0,
      total: "0",
      status: "pending",
      paymentMethod: "cash",
      date: new Date().toISOString(),
    },
  });

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers?.find(c => c.id === parseInt(customerId));
    setSelectedCustomer(customer || null);
    form.setValue("customerId", parseInt(customerId));
  };

  const handleAddProduct = (product: Product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.product.id === product.id);
      if (existing) {
        return prev.map(p =>
          p.product.id === product.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    calculateTotal();
  };

  const calculateTotal = () => {
    const subtotal = selectedProducts.reduce(
      (sum, { product, quantity }) =>
        sum + parseFloat(product.price.toString()) * quantity,
      0
    );
    const tax = subtotal * 0.18; // 18% ITBIS
    const total = subtotal + tax;
    form.setValue("total", total.toFixed(2));
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        customerId: Number(data.customerId),
        total: data.total.toString(),
        products: selectedProducts.map(({product, quantity}) => ({
          productId: product.id,
          quantity
        }))
      };
      const res = await apiRequest("POST", "/api/orders", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: t("success"),
        description: t("orderCreated"),
      });
      form.reset();
      setSelectedProducts([]);
      setSelectedCustomer(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("orders")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t("newOrder")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("newOrder")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("customer")}</FormLabel>
                        <Select
                          onValueChange={handleCustomerSelect}
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("selectCustomer")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers?.map((customer) => (
                              <SelectItem 
                                key={customer.id} 
                                value={customer.id.toString()}
                              >
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedCustomer && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p>{selectedCustomer.name}</p>
                      <p>{selectedCustomer.address}</p>
                      <p>{selectedCustomer.phone}</p>
                    </div>
                  )}

                  <div className="mt-4">
                    <h3 className="font-medium mb-2">{t("products")}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {products?.map((product) => (
                        <div
                          key={product.id}
                          className="p-2 border rounded cursor-pointer hover:bg-accent"
                          onClick={() => handleAddProduct(product)}
                        >
                          <p>{product.name}</p>
                          <p>RD$ {parseFloat(product.price.toString()).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedProducts.length > 0 && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h3 className="font-medium mb-2">{t("orderSummary")}</h3>
                      {selectedProducts.map(({ product, quantity }) => (
                        <div key={product.id} className="flex justify-between py-1">
                          <span>{product.name} x {quantity}</span>
                          <span>RD$ {(parseFloat(product.price.toString()) * quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex justify-between">
                          <span>{t("total")}</span>
                          <span>RD$ {form.getValues("total")}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("paymentMethod")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("selectPaymentMethod")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">{t("cash")}</SelectItem>
                            <SelectItem value="check">{t("check")}</SelectItem>
                            <SelectItem value="credit_card">{t("creditCard")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      createMutation.isPending ||
                      selectedProducts.length === 0 ||
                      !selectedCustomer
                    }
                  >
                    {createMutation.isPending ? t("saving") : t("createOrder")}
                  </Button>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}