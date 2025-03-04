import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { type Order, type Customer, type Product, insertOrderSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  PlusCircle,
  Trash,
  FileText,
  Search,
  ShoppingCart,
} from "lucide-react";

export default function Orders() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    product: Product;
    quantity: number;
  }>>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Fetch orders, customers and products
  const { data: orders, isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

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

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId
          ? { ...p, quantity: Math.max(0, quantity) }
          : p
      ).filter(p => p.quantity > 0)
    );
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
        products: selectedProducts.map(({product, quantity}) => ({productId: product.id, quantity}))
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

  if (isLoadingOrders) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("orders")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              {t("newOrder")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t("newOrder")}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-12 gap-6">
              {/* Cliente y Detalles */}
              <div className="col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("customer")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="customerId"
                          render={({ field }) => (
                            <FormItem>
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
                                      {customer.name} - {customer.businessName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {selectedCustomer && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium">{t("businessName")}:</p>
                                <p className="text-sm">{selectedCustomer.businessName}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t("email")}:</p>
                                <p className="text-sm">{selectedCustomer.email}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t("address")}:</p>
                                <p className="text-sm">{selectedCustomer.address}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t("phone")}:</p>
                                <p className="text-sm">{selectedCustomer.phone}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-6">
                          <CardTitle className="mb-4">{t("products")}</CardTitle>
                          <div className="space-y-4">
                            <div className="flex gap-2">
                              <Input 
                                placeholder={t("searchProducts")}
                                className="max-w-sm"
                                type="search"
                              />
                              <Button variant="secondary">
                                <Search className="h-4 w-4 mr-2" />
                                {t("search")}
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {products?.map((product) => (
                                <Card key={product.id} className="cursor-pointer hover:bg-accent" onClick={() => handleAddProduct(product)}>
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium">{product.name}</p>
                                        <p className="text-sm text-muted-foreground">Stock: {product.stock}</p>
                                      </div>
                                      <p className="font-bold">RD$ {parseFloat(product.price.toString()).toFixed(2)}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              {/* Resumen del Pedido */}
              <div className="col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      {t("orderSummary")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedProducts.map(({ product, quantity }) => (
                        <div key={product.id} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQuantity(product.id, quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="mx-2">{quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQuantity(product.id, quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                          <p className="font-medium">
                            RD$ {(parseFloat(product.price.toString()) * quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}

                      <Separator className="my-4" />

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>{t("subtotal")}</span>
                          <span>
                            RD$ {selectedProducts.reduce(
                              (sum, { product, quantity }) =>
                                sum + parseFloat(product.price.toString()) * quantity,
                              0
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t("tax")} (18%)</span>
                          <span>
                            RD$ {(selectedProducts.reduce(
                              (sum, { product, quantity }) =>
                                sum + parseFloat(product.price.toString()) * quantity,
                              0
                            ) * 0.18).toFixed(2)}
                          </span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-lg font-bold">
                          <span>{t("total")}</span>
                          <span>RD$ {form.getValues("total")}</span>
                        </div>
                      </div>

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
                        className="w-full"
                        disabled={
                          createMutation.isPending ||
                          selectedProducts.length === 0 ||
                          !selectedCustomer
                        }
                        onClick={form.handleSubmit(onSubmit)}
                      >
                        {createMutation.isPending ? t("saving") : t("createOrder")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("orderHistory")}</CardTitle>
          <CardDescription>{t("recentOrders")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orderNumber")}</TableHead>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("total")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("paymentMethod")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>#{order.id}</TableCell>
                  <TableCell>
                    {customers?.find(c => c.id === order.customerId)?.name}
                  </TableCell>
                  <TableCell>
                    {new Date(order.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    RD$ {parseFloat(order.total.toString()).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === "delivered" ? "bg-green-100 text-green-800" :
                      order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {t(order.status)}
                    </span>
                  </TableCell>
                  <TableCell>{t(order.paymentMethod || "")}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="ghost" size="icon">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}