import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation, useRoute } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// Iconos
import { 
  Edit, 
  Plus
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";

// Interfaces
interface OrderItem {
  code: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export default function EditOrder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [matches, params] = useRoute("/orders/edit/:id");
  const orderId = params?.id ? parseInt(params.id) : undefined;
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [openCustomerPopover, setOpenCustomerPopover] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { code: "", description: "", quantity: 0, price: 0, total: 0 }
  ]);

  // Obtener datos del pedido
  const { data: order, isLoading: isLoadingOrder } = useQuery<any>({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar el pedido");
      return response.json();
    },
    enabled: !!orderId,
  });

  // Consultas para obtener datos
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      return apiRequest({
        method: "GET",
        url: "/api/customers"
      });
    }
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      return apiRequest({
        method: "GET",
        url: "/api/products"
      });
    }
  });

  const { data: settings, isLoading: isLoadingSettings } = useQuery<any>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      return apiRequest({
        method: "GET",
        url: "/api/settings"
      });
    }
  });

  // Cargar datos del pedido cuando se obtiene
  useEffect(() => {
    if (order && customers.length > 0 && products.length > 0) {
      // Verificar que el pedido sea editable
      if (!['pending', 'in_transit'].includes(order.status)) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Solo se pueden editar pedidos pendientes o en tránsito"
        });
        setLocation("/orders/list");
        return;
      }

      if (order.invoiceId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se puede editar un pedido que ya tiene una factura asociada"
        });
        setLocation("/orders/list");
        return;
      }

      // Establecer cliente
      const customer = customers.find((c: any) => c.id === order.customerId);
      if (customer) {
        setSelectedCustomer(customer);
      }

      // Establecer método de pago y notas
      setPaymentMethod(order.paymentMethod || "credit");
      setNotes(order.notes || "");

      // Cargar items del pedido
      if (order.items && order.items.length > 0) {
        const loadedItems = order.items.map((item: any) => {
          const productId = item.productId?.toString() || item.product?.id?.toString() || "";
          const itemPrice = parseFloat(item.price || item.unitPrice || 0);
          
          // Si el precio es 0, buscar el precio del producto
          let finalPrice = itemPrice;
          if (itemPrice === 0 && productId) {
            const product = products.find((p: any) => p.id.toString() === productId);
            if (product) {
              finalPrice = parseFloat(product.price.toString());
            }
          }
          
          const quantity = item.quantity || 0;
          const total = finalPrice * quantity;
          
          return {
            code: productId,
            description: item.productName || item.product?.name || "",
            quantity: quantity,
            price: finalPrice,
            total: total
          };
        });
        setOrderItems([...loadedItems, { code: "", description: "", quantity: 0, price: 0, total: 0 }]);
      }
    }
  }, [order, customers, products]);

  // Detectar si el cliente es institución benéfica
  useEffect(() => {
    if (selectedCustomer?.isCharity) {
      setPaymentMethod("donation");
    } else if (paymentMethod === "donation" && !selectedCustomer?.isCharity) {
      setPaymentMethod("credit");
    }
  }, [selectedCustomer]);

  // Filtrar clientes según el término de búsqueda
  const filteredCustomers = customers.filter((customer: any) => {
    if (!customerSearchTerm) return true;
    
    const searchLower = customerSearchTerm.toLowerCase();
    const businessName = (customer.businessname || "").toLowerCase();
    const phone = String(customer.phone ?? "").toLowerCase();
    
    return businessName.includes(searchLower) || phone.includes(searchLower);
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
    const currentQuantity = newItems[index].quantity || 1;
    const productPrice = parseFloat(product.price.toString());
    
    newItems[index] = {
      code,
      description: product.name,
      quantity: currentQuantity,
      price: productPrice,
      total: productPrice * currentQuantity
    };
    
    // Forzar actualización del estado creando un nuevo array
    setOrderItems([...newItems]);
    
    // Si este es el último elemento del arreglo, agregar uno nuevo
    if (index === orderItems.length - 1) {
      // Usar setTimeout para asegurar que React procesa primero el cambio actual
      setTimeout(() => {
        setOrderItems(items => [...items, { code: "", description: "", quantity: 0, price: 0, total: 0 }]);
      }, 0);
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
    const taxRate = settings?.tax ? parseFloat(settings.tax) / 100 : 0;
    const tax = subtotal * taxRate;
    return { subtotal, tax, total: subtotal + tax };
  };

  // Mutación para actualizar el pedido
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Actualizando pedido con datos:", data);
      
      // 1. Validar items
      const validItems = orderItems.filter(item => item.quantity > 0);
      if (validItems.length === 0) {
        throw new Error('Debe agregar al menos un producto');
      }

      // 2. Calcular totales con precisión decimal
      const subtotal = validItems.reduce((sum, item) => {
        const itemTotal = parseFloat((item.total || 0).toFixed(2));
        return parseFloat((sum + itemTotal).toFixed(2));
      }, 0);
      const taxRate = settings?.tax ? parseFloat(settings.tax) / 100 : 0;
      const tax = parseFloat((subtotal * taxRate).toFixed(2));
      const total = parseFloat((subtotal + tax).toFixed(2));

      // 3. Formatear los items para la API
      const formattedItems = validItems.map(item => ({
        productId: parseInt(item.code),
        quantity: item.quantity,
        price: typeof item.price === 'number' ? item.price.toFixed(2) : item.price,
        total: typeof item.total === 'number' ? item.total.toFixed(2) : 
              parseFloat(String(item.total || 0)).toFixed(2)
      }));
      
      // 4. Crear payload completo para actualizar
      const updateOrderData = {
        customerId: parseInt(data.customerId),
        total: total.toFixed(2),
        status: order?.status || "pending",
        paymentMethod: paymentMethod as "cash" | "credit" | "card" | "donation",
        notes: notes || "",
        items: formattedItems
      };

      console.log("Datos completos del pedido a actualizar:", JSON.stringify(updateOrderData, null, 2));

      // 5. Enviar la actualización
      try {
        const orderResponse = await apiRequest({
          method: "PUT",
          url: `/api/orders/${orderId}`,
          data: updateOrderData
        });
        
        console.log("Respuesta del servidor:", orderResponse);
        return orderResponse;
      } catch (error) {
        console.error("Error al actualizar el pedido:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      toast({
        title: "Éxito",
        description: "El pedido se ha actualizado correctamente",
      });
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

  const handleUpdateOrder = () => {
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

    if (!settings || settings.tax === undefined) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se puede actualizar el pedido. La configuración de ITBIS no está disponible."
      });
      return;
    }

    updateMutation.mutate({
      customerId: selectedCustomer.id,
      items: validItems
    });
  };

  if (isLoadingOrder) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <Card className="p-6">
          <CardContent>
            <div className="text-center">Cargando pedido...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <Card className="p-6">
          <CardContent>
            <div className="text-center text-destructive">Pedido no encontrado</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Edit className="h-5 w-5 text-primary" />
          Editar Pedido #{order.id}
        </h1>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => setLocation("/orders/list")}
          className="w-full sm:w-auto"
          data-testid="button-back-to-list"
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
                <Popover open={openCustomerPopover} onOpenChange={setOpenCustomerPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCustomerPopover}
                      data-testid="select-customer"
                      className="h-9 w-full justify-between text-sm font-normal"
                    >
                      {selectedCustomer ? (
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium truncate">{selectedCustomer.businessname}</span>
                          <span className="text-xs text-muted-foreground">• {selectedCustomer.phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Buscar y seleccionar cliente...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar por nombre o teléfono..." 
                        data-testid="input-customer-search"
                        value={customerSearchTerm}
                        onValueChange={setCustomerSearchTerm}
                      />
                      <CommandEmpty>No se encontraron clientes</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {filteredCustomers.map((customer: any) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.businessname} ${customer.phone}`}
                            onSelect={() => {
                              setSelectedCustomer(customer);
                              setOpenCustomerPopover(false);
                              setCustomerSearchTerm("");
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.businessname}</span>
                              <span className="text-xs text-muted-foreground">{customer.phone}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
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
            {selectedCustomer?.isCharity ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="flex-1"
                  disabled
                >
                  Donación
                </Button>
              </div>
            ) : (
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
                <Button
                  type="button"
                  variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('transfer')}
                  className="flex-1"
                >
                  Transferencia
                </Button>
              </div>
            )}
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
                      <TableCell className="p-2 text-right text-sm">{item.price.toFixed(2)}</TableCell>
                      <TableCell className="p-2 text-right text-sm font-medium">{item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Observaciones (Opcional)</label>
            <Textarea
              placeholder="Agregar observaciones del pedido..."
              className="min-h-20 text-sm"
              value={notes}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setNotes(e.target.value);
                }
              }}
              maxLength={200}
              data-testid="input-notes"
            />
            <div className="text-xs text-muted-foreground text-right">
              {notes.length}/200 caracteres
            </div>
          </div>

          {/* Totales */}
          <div className="pt-4 border-t">
            <div className="flex justify-end">
              <div className="space-y-2 min-w-[250px]">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>RD$ {calculateTotal().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>ITBIS ({settings?.tax || 0}%):</span>
                  <span>RD$ {calculateTotal().tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total:</span>
                  <span className="text-primary">RD$ {calculateTotal().total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/orders/list")}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateOrder}
              disabled={updateMutation.isPending || !selectedCustomer}
              className="flex-1"
              data-testid="button-update-order"
            >
              {updateMutation.isPending ? "Actualizando..." : "Actualizar Pedido"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
