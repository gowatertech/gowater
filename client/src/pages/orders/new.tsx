import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrentUser } from "@/hooks/use-current-user";

// Iconos
import { 
  Plus, 
  ArrowLeft, 
  ShoppingCart, 
  User
} from "lucide-react";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interfaces
interface OrderItem {
  code: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export default function NewOrder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { user } = useCurrentUser();
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { code: "", description: "", quantity: 0, price: 0, total: 0 },
    { code: "", description: "", quantity: 0, price: 0, total: 0 },
    { code: "", description: "", quantity: 0, price: 0, total: 0 },
    { code: "", description: "", quantity: 0, price: 0, total: 0 },
    { code: "", description: "", quantity: 0, price: 0, total: 0 }
  ]);

  // Consultas para obtener datos
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers");
      if (!response.ok) {
        throw new Error('Error al cargar los clientes');
      }
      return response.json();
    }
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  // Función para agregar un nuevo producto vacío al arreglo
  const addEmptyProduct = () => {
    setOrderItems([
      ...orderItems,
      { code: "", description: "", quantity: 0, price: 0, total: 0 }
    ]);
  };

  // Manejo de cambios en productos y cantidades
  const handleProductChange = (index: number, code: string) => {
    const product = products?.find((p: any) => p.id.toString() === code);
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
    
    // Si este es el último elemento del arreglo, agregar uno nuevo
    if (index === orderItems.length - 1) {
      addEmptyProduct();
    }
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

  // Mutación para crear pedidos
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creando pedido con datos:", data);
      
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
        paymentMethod: paymentMethod as "cash" | "credit" | "card",
        date: new Date().toISOString(), // Formato ISO completo
        routeId: null as number | null,
        notes: notes || ""
        // El companyId se obtiene del contexto en el servidor
      };

      console.log("Datos del pedido a enviar:", orderData);

      // 4. Crear el pedido con los datos validados
      const orderResponse = await apiRequest("POST", "/api/orders", orderData);
      
      if (!orderResponse.ok) {
        console.error("Error en la respuesta:", await orderResponse.text());
        throw new Error('Error al crear el pedido. Revise los datos enviados.');
      }

      const order = await orderResponse.json();
      console.log("Pedido creado:", order);

      // 5. Crear los items del pedido
      for (const item of validItems) {
        const itemData = {
          orderId: order.id,
          productId: parseInt(item.code),
          quantity: item.quantity,
          price: item.price.toFixed(2), // Formato exacto: "0.00"
          companyId: user?.companyId || 1 // Usar el companyId del usuario actual
        };

        console.log("Agregando item al pedido:", itemData);
        const itemResponse = await apiRequest("POST", `/api/orders/${order.id}/items`, itemData);
        if (!itemResponse.ok) {
          console.error("Error al crear item:", await itemResponse.text());
          throw new Error('Error al crear items del pedido');
        }
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Éxito",
        description: "El pedido se ha creado correctamente",
      });
      setSelectedCustomer(null);
      setNotes("");
      setOrderItems([
        { code: "", description: "", quantity: 0, price: 0, total: 0 },
        { code: "", description: "", quantity: 0, price: 0, total: 0 },
        { code: "", description: "", quantity: 0, price: 0, total: 0 },
        { code: "", description: "", quantity: 0, price: 0, total: 0 },
        { code: "", description: "", quantity: 0, price: 0, total: 0 }
      ]);
      setLocation("/orders/list");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const handleCreateOrder = () => {
    if (!selectedCustomer) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe seleccionar un cliente"
      });
      return;
    }

    const validItems = orderItems.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
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
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Nuevo Pedido
        </h1>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => setLocation("/orders/list")}
          className="w-full sm:w-auto"
        >
          Volver a la Lista
        </Button>
      </div>

      {/* Formulario */}
      <Card className="p-3 sm:p-4">
        <CardContent className="p-0 space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Datos del Cliente</div>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Seleccione un Cliente</label>
                <Select
                  onValueChange={(value) => {
                    const customer = customers.find((c: any) => c.id === parseInt(value));
                    setSelectedCustomer(customer || null);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm w-full">
                    <SelectValue placeholder="Seleccionar Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer: any) => (
                      <SelectItem
                        key={customer.id}
                        value={customer.id.toString()}
                        className="text-sm"
                      >
                        {customer.businessname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCustomer && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/30 rounded-lg p-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Nombre del Gerente</div>
                    <div className="text-sm">{selectedCustomer.managername}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Dirección</div>
                    <div className="text-sm">{selectedCustomer.street} {selectedCustomer.streetnumber}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Teléfono</div>
                    <div className="text-sm">{selectedCustomer.phone}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Método de Pago</div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <Button
                type="button"
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaymentMethod('cash')}
                className="flex-1"
              >
                Efectivo
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaymentMethod('credit')}
                className="flex-1"
              >
                Crédito
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaymentMethod('card')}
                className="flex-1"
              >
                Tarjeta
              </Button>
            </div>
          </div>

          {/* Productos - Vista Móvil */}
          <div className="space-y-2 block md:hidden">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">Productos</div>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={addEmptyProduct}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar producto
              </Button>
            </div>
            <div className="space-y-3">
              {orderItems.map((item, index) => {
                return (
                <Card key={index} className="p-3">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Producto</label>
                      <Select
                        value={item.code}
                        onValueChange={(value) => handleProductChange(index, value)}
                      >
                        <SelectTrigger className="h-9 text-sm w-full">
                          <SelectValue placeholder="Seleccionar Producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product: any) => (
                            <SelectItem
                              key={product.id}
                              value={product.id.toString()}
                              className="text-sm"
                            >
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {item.description && (
                      <div className="text-sm">{item.description}</div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                          className="h-9"
                          min="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Precio</label>
                        <div className="h-9 flex items-center text-sm">
                          {item.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Total</label>
                        <div className="h-9 flex items-center font-medium text-sm">
                          {item.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                );
              })}
            </div>
          </div>

          {/* Productos - Vista Desktop */}
          <div className="space-y-2 hidden md:block">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">Productos</div>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={addEmptyProduct}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar producto
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="py-2 w-[200px]">Producto</TableHead>
                    <TableHead className="py-2">Descripción</TableHead>
                    <TableHead className="py-2 w-[80px] text-right">Cant.</TableHead>
                    <TableHead className="py-2 w-[100px] text-right">Precio</TableHead>
                    <TableHead className="py-2 w-[100px] text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="p-2">
                        <Select
                          value={item.code}
                          onValueChange={(value) => handleProductChange(index, value)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product: any) => (
                              <SelectItem
                                key={product.id}
                                value={product.id.toString()}
                                className="text-sm"
                              >
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm p-2">{item.description}</TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                          className="h-9 text-sm text-right"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm p-2">
                        {item.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm p-2 font-medium">
                        {item.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Campo de Notas */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Notas del Pedido</div>
            <Textarea
              value={notes}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setNotes(e.target.value);
                }
              }}
              placeholder="Añadir nota al pedido (máximo 200 caracteres)"
              className="h-20 text-sm resize-none"
              maxLength={200}
            />
            <div className="text-xs text-muted-foreground text-right">
              {notes.length}/200 caracteres
            </div>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div></div>
            <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>RD$ {calculateTotal().subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>ITBIS (18%):</span>
                <span>RD$ {calculateTotal().tax.toFixed(2)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-sm font-medium">
                <span>Total:</span>
                <span>RD$ {calculateTotal().total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setLocation("/orders/list")}
            >
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleCreateOrder}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Creando...
                </>
              ) : (
                "Crear Pedido"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}