import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Customer, type Product, type Order } from "@shared/schema";
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
      // Crear el pedido
      const orderData = {
        customerId: data.customerId,
        routeId: null,
        total: data.total.toString(),
        status: "pending",
        paymentMethod: "cash",
        date: new Date().toISOString()
      };

      console.log('Sending order data:', orderData);
      const orderResponse = await apiRequest("POST", "/api/orders", orderData);

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        console.error('Order creation error:', errorData);
        throw new Error(errorData.error || 'Error al crear el pedido');
      }

      const order = await orderResponse.json();

      // Crear los items del pedido
      const validItems = data.items.filter((item: OrderItem) => item.quantity > 0);
      for (const item of validItems) {
        const itemData = {
          orderId: order.id,
          productId: parseInt(item.code),
          quantity: item.quantity,
          price: item.price.toString()
        };

        console.log('Sending item data:', itemData);
        const itemResponse = await apiRequest("POST", `/api/orders/${order.id}/items`, itemData);

        if (!itemResponse.ok) {
          console.error('Item creation error:', await itemResponse.json());
          throw new Error('Error al crear los items del pedido');
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
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    }
  });

  const handleCreateOrder = () => {
    if (!selectedCustomer) return;

    const validItems = orderItems.filter(item => item.quantity > 0);
    if (validItems.length === 0) return;

    const { total } = calculateTotal();

    createMutation.mutate({
      customerId: selectedCustomer.id,
      items: validItems,
      total
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header con botón nuevo pedido */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("orders")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t("newOrder")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
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
                  <div className="text-sm grid grid-cols-2 gap-2 bg-muted p-2 rounded">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-24 text-right">Cant.</TableHead>
                      <TableHead className="w-28 text-right">Precio</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
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
                            <SelectTrigger>
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
                            className="bg-muted"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            value={item.price ? `RD$ ${item.price.toFixed(2)}` : ""}
                            readOnly
                            className="text-right bg-muted"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            value={item.total ? `RD$ ${item.total.toFixed(2)}` : ""}
                            readOnly
                            className="text-right bg-muted"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Notas */}
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas del pedido..."
                className="h-20"
              />

              {/* Totales y Botón */}
              <div className="flex justify-between items-end">
                <div className="w-64 space-y-1 text-sm">
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
      <div className="bg-white rounded-lg shadow-sm border">
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
                  <Button variant="ghost" size="sm">
                    Ver detalles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}