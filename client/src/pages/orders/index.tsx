import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Customer, type Product, type Order, insertOrderSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderItem {
  code: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export default function Orders() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    Array(5).fill({
      code: "",
      description: "",
      quantity: 0,
      price: 0,
      total: 0
    })
  );

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const handleProductChange = (index: number, code: string) => {
    const product = products?.find(p => p.id.toString() === code);
    if (!product) return;

    const newItems = [...orderItems];
    newItems[index] = {
      code,
      description: product.name,
      quantity: 1,
      price: parseFloat(product.price.toString()),
      total: parseFloat(product.price.toString())
    };
    setOrderItems(newItems);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...orderItems];
    const item = newItems[index];
    item.quantity = quantity;
    item.total = item.price * quantity;
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax = subtotal * 0.18; // 18% ITBIS
    return { subtotal, tax, total: subtotal + tax };
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // 1. Validar items primero
      const validItems = orderItems.filter(item => item.quantity > 0);
      if (validItems.length === 0) {
        throw new Error('Debe agregar al menos un producto');
      }

      // 2. Calcular totales
      const subtotal = validItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;
      const total = subtotal + tax;

      // 3. Crear el pedido
      const orderData = {
        customerId: data.customerId,
        total: total.toFixed(2),
        status: "pending",
        paymentMethod: "cash",
        date: new Date().toISOString(),
        routeId: null
      };

      console.log('Enviando pedido:', orderData);
      const orderResponse = await apiRequest("POST", "/api/orders", orderData);

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('Error en pedido:', errorText);
        throw new Error(errorText);
      }

      const order = await orderResponse.json();
      console.log('Pedido creado:', order);

      // 4. Crear los items del pedido
      for (const item of validItems) {
        const itemData = {
          orderId: order.id,
          productId: parseInt(item.code),
          quantity: item.quantity,
          price: item.price.toString()
        };

        console.log('Enviando item:', itemData);
        const itemResponse = await apiRequest("POST", `/api/orders/${order.id}/items`, itemData);

        if (!itemResponse.ok) {
          console.error('Error en item:', await itemResponse.text());
          throw new Error('Error al crear items del pedido');
        }
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: t("success"),
        description: t("orderCreated"),
      });
      setIsDialogOpen(false);
      setSelectedCustomer(null);
      setNotes("");
      setOrderItems(Array(5).fill({
        code: "",
        description: "",
        quantity: 0,
        price: 0,
        total: 0
      }));
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    }
  });

  const handleCreateOrder = () => {
    if (!selectedCustomer) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Debe seleccionar un cliente"
      });
      return;
    }

    const validItems = orderItems.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Debe agregar al menos un producto"
      });
      return;
    }

    createMutation.mutate({
      customerId: selectedCustomer.id,
      items: validItems
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header con botón nuevo pedido */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">{t("orders")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">{t("newOrder")}</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t("newOrder")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Cliente y Productos */}
              <div className="grid gap-4">
                <Select
                  onValueChange={(value) => {
                    const customer = customers?.find(c => c.id === parseInt(value));
                    setSelectedCustomer(customer || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCustomer")} />
                  </SelectTrigger>
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

                {selectedCustomer && (
                  <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted p-2 rounded">
                    <div>
                      <span className="font-medium">{t("businessName")}: </span>
                      {selectedCustomer.businessName}
                    </div>
                    <div>
                      <span className="font-medium">{t("address")}: </span>
                      {selectedCustomer.address}
                    </div>
                  </div>
                )}
              </div>

              {/* Tabla de Productos */}
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="h-[300px] md:h-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 md:w-24">Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-20 md:w-24 text-right">Cant.</TableHead>
                        <TableHead className="w-24 md:w-28 text-right">Precio</TableHead>
                        <TableHead className="w-24 md:w-28 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="p-1">
                            <Select
                              value={item.code}
                              onValueChange={(value) => handleProductChange(index, value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="---" />
                              </SelectTrigger>
                              <SelectContent>
                                {products?.map((product) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id.toString()}
                                  >
                                    {product.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={item.description}
                              readOnly
                              className="bg-muted h-8"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                              className="text-right h-8"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={item.price ? `RD$ ${item.price.toFixed(2)}` : ""}
                              readOnly
                              className="text-right bg-muted h-8"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={item.total ? `RD$ ${item.total.toFixed(2)}` : ""}
                              readOnly
                              className="text-right bg-muted h-8"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Notas */}
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas del pedido..."
                className="h-20"
              />

              {/* Totales y Botón */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="w-full sm:w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Sub-total:</span>
                    <span>RD$ {calculateTotal().subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ITBIS (18%):</span>
                    <span>RD$ {calculateTotal().tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>RD$ {calculateTotal().total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full sm:w-auto"
                  disabled={!selectedCustomer || !orderItems.some(item => item.quantity > 0)}
                  onClick={handleCreateOrder}
                >
                  {createMutation.isPending ? t("saving") : t("createOrder")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de Pedidos */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
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
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8">
                      Ver detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}