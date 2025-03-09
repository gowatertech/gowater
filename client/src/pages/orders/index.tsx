import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Customer, type Product, type Order, insertOrderSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { Card } from "@/components/ui/card";

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
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Obtener clientes y asegurarse de que se manejen los errores
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers");
      if (!response.ok) {
        throw new Error('Error al cargar los clientes');
      }
      return response.json();
    }
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Nueva consulta para obtener los items de un pedido específico
  const { data: orderDetails = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: ["/api/orders", selectedOrder?.id, "items"],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const response = await apiRequest("GET", `/api/orders/${selectedOrder.id}/items`);
      if (!response.ok) {
        throw new Error('Error al cargar los items del pedido');
      }
      return response.json();
    },
    enabled: !!selectedOrder,
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
      // 1. Validar items
      const validItems = orderItems.filter(item => item.quantity > 0);
      if (validItems.length === 0) {
        throw new Error('Debe agregar al menos un producto');
      }

      // 2. Calcular totales
      const subtotal = validItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;
      const total = subtotal + tax;

      // 3. Preparar datos del pedido
      const orderData = {
        customerId: parseInt(data.customerId),
        total: total.toFixed(2), // Formato exacto: "0.00"
        status: "pending" as const,
        paymentMethod: "cash" as const,
        date: new Date().toISOString(), // Formato ISO completo
        routeId: null as number | null
      };

      // 4. Validar con Zod antes de enviar
      const validationResult = insertOrderSchema.safeParse(orderData);
      if (!validationResult.success) {
        console.error('Error de validación:', validationResult.error);
        throw new Error(validationResult.error.issues[0].message);
      }

      // 5. Crear el pedido
      const orderResponse = await apiRequest("POST", "/api/orders", validationResult.data);
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error?.issues?.[0]?.message || 'Error al crear el pedido');
      }

      const order = await orderResponse.json();

      // 5. Crear los items del pedido
      for (const item of validItems) {
        const itemData = {
          orderId: order.id,
          productId: parseInt(item.code),
          quantity: item.quantity,
          price: item.price.toFixed(2) // Formato exacto: "0.00"
        };

        const itemResponse = await apiRequest("POST", `/api/orders/${order.id}/items`, itemData);
        if (!itemResponse.ok) {
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
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header con botón nuevo pedido */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">{t("orders")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto text-base">{t("Nuevo Pedido")}</Button>
          </DialogTrigger>
          <DialogContent className="w-[98vw] sm:w-[90vw] max-w-2xl p-2 sm:p-4 gap-3">
            <DialogHeader>
              <DialogTitle className="text-lg">{t("Nuevo Pedido")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {/* Cliente y Productos */}
              <div className="grid gap-3">
                <Select
                  onValueChange={(value) => {
                    const customer = customers?.find(c => c.id === parseInt(value));
                    setSelectedCustomer(customer || null);
                  }}
                  disabled={isLoadingCustomers}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t("Seleccionar Cliente")} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem
                        key={customer.id}
                        value={customer.id.toString()}
                        className="text-sm py-2"
                      >
                        {customer.businessname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedCustomer && (
                  <div className="text-sm grid grid-cols-1 gap-2 bg-muted p-2 rounded">
                    <div>
                      <span className="font-medium">{t("Nombre Empresa")}: </span>
                      {selectedCustomer.businessname}
                    </div>
                    <div>
                      <span className="font-medium">{t("Dirección")}: </span>
                      {`${selectedCustomer.street} ${selectedCustomer.streetnumber}`}
                    </div>
                    <div>
                      <span className="font-medium">{t("Teléfono")}: </span>
                      {selectedCustomer.phone}
                    </div>
                  </div>
                )}
              </div>

              {/* Tabla de Productos */}
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="h-[35vh] sm:h-[30vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 text-sm sticky top-0 bg-background">Código</TableHead>
                        <TableHead className="text-sm sticky top-0 bg-background">Descripción</TableHead>
                        <TableHead className="w-16 text-right text-sm sticky top-0 bg-background">Cant.</TableHead>
                        <TableHead className="w-24 text-right text-sm sticky top-0 bg-background">Precio</TableHead>
                        <TableHead className="w-24 text-right text-sm sticky top-0 bg-background">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="p-0.5">
                            <Select
                              value={item.code}
                              onValueChange={(value) => handleProductChange(index, value)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="---" />
                              </SelectTrigger>
                              <SelectContent>
                                {products?.map((product) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id.toString()}
                                    className="text-sm py-1.5"
                                  >
                                    {product.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-0.5">
                            <Input
                              value={item.description}
                              readOnly
                              className="bg-muted h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-0.5">
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                              className="text-right h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-0.5">
                            <Input
                              value={item.price ? `RD$ ${item.price.toFixed(2)}` : ""}
                              readOnly
                              className="text-right bg-muted h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-0.5">
                            <Input
                              value={item.total ? `RD$ ${item.total.toFixed(2)}` : ""}
                              readOnly
                              className="text-right bg-muted h-8 text-sm"
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
                className="h-20 text-sm"
              />

              {/* Totales y Botón */}
              <div className="flex flex-col gap-3">
                <div className="bg-muted p-3 rounded-lg space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span>Sub-total:</span>
                    <span>RD$ {calculateTotal().subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ITBIS (18%):</span>
                    <span>RD$ {calculateTotal().tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Total:</span>
                    <span>RD$ {calculateTotal().total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full h-9 text-sm"
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
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm py-2">No. Pedido</TableHead>
                  <TableHead className="text-sm py-2">Cliente</TableHead>
                  <TableHead className="text-sm py-2">Fecha</TableHead>
                  <TableHead className="text-sm py-2">Total</TableHead>
                  <TableHead className="text-sm py-2">Estado</TableHead>
                  <TableHead className="text-sm py-2">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((order) => (
                  <TableRow key={order.id} className="h-10">
                    <TableCell className="text-sm py-1">#{order.id}</TableCell>
                    <TableCell className="text-sm py-1">
                      {customers?.find(c => c.id === order.customerId)?.name}
                    </TableCell>
                    <TableCell className="text-sm py-1">
                      {new Date(order.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm py-1">
                      RD$ {parseFloat(order.total.toString()).toFixed(2)}
                    </TableCell>
                    <TableCell className="py-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === "delivered" ? "bg-green-100 text-green-800" :
                          order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                      }`}>
                        {t(order.status)}
                      </span>
                    </TableCell>
                    <TableCell className="py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailsDialogOpen(true);
                        }}
                      >
                        Ver detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>
      {/* New Dialog for order details */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="w-[98vw] sm:w-[90vw] max-w-2xl p-2 sm:p-4 gap-3">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido #{selectedOrder?.id}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Información del cliente */}
              <Card className="p-4">
                <h3 className="font-medium mb-2">Información del Cliente</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Cliente: </span>
                    {customers?.find(c => c.id === selectedOrder.customerId)?.businessname}
                  </div>
                  <div>
                    <span className="font-medium">Fecha: </span>
                    {new Date(selectedOrder.date).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Estado: </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedOrder.status === "delivered" ? "bg-green-100 text-green-800" :
                      selectedOrder.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {t(selectedOrder.status)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Método de Pago: </span>
                    {t(selectedOrder.paymentMethod)}
                  </div>
                </div>
              </Card>

              {/* Items del pedido */}
              <Card className="p-4">
                <h3 className="font-medium mb-2">Productos</h3>
                {isLoadingDetails ? (
                  <div className="text-center p-4">Cargando productos...</div>
                ) : orderDetails.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetails.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            RD$ {parseFloat(item.price.toString()).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            RD$ {parseFloat(item.total.toString()).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center p-4">No hay productos en este pedido</div>
                )}
              </Card>

              {/* Totales */}
              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">
                      RD$ {parseFloat(selectedOrder.total.toString()).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}