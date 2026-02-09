import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Search, Plus, Minus, ShoppingCart, User, DollarSign, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getTodayStringRD } from "@/lib/date-utils";

interface Customer {
  id: number;
  businessname: string;
  managername: string;
  phone: string;
  street: string;
  streetnumber: string;
  sector: string;
  city: string;
  isCharity?: boolean;
}

interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  icon: string;
  isReturnable: boolean;
  depositAmount: string;
  hasCommission: boolean;
  companyId: number;
}

interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export default function NewOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit" | "donation">("cash");

  // Fetch customers
  const { data: customers = [], isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => apiRequest({ method: "GET", url: "/api/customers" })
  });

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => apiRequest({ method: "GET", url: "/api/products" })
  });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const term = customerSearch.toLowerCase().trim();
    const termDigits = term.replace(/\D/g, "");
    return customers.filter((c) => {
      if ((c.businessname || "").toLowerCase().includes(term)) return true;
      if ((c.managername || "").toLowerCase().includes(term)) return true;
      const phone = c.phone || "";
      if (phone.includes(term)) return true;
      if (termDigits && phone.replace(/\D/g, "").includes(termDigits)) return true;
      return false;
    });
  }, [customers, customerSearch]);

  // Get selected customer
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Auto-detect charity customers and set payment method to donation
  useEffect(() => {
    if (selectedCustomer?.isCharity) {
      setPaymentMethod("donation");
    } else if (paymentMethod === "donation") {
      setPaymentMethod("cash");
    }
  }, [selectedCustomer]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  }, [orderItems]);

  const itbis = subtotal * 0.18;
  const total = subtotal + itbis;

  const totalItems = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [orderItems]);

  // Update product quantity
  const updateQuantity = (productId: number, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const productPrice = parseFloat(product.price);

    setOrderItems(prev => {
      const existing = prev.find(item => item.productId === productId);
      
      if (existing) {
        const newQuantity = Math.max(0, existing.quantity + delta);
        if (newQuantity === 0) {
          return prev.filter(item => item.productId !== productId);
        }
        return prev.map(item =>
          item.productId === productId
            ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
            : item
        );
      } else if (delta > 0) {
        return [...prev, {
          productId: product.id,
          name: product.name,
          quantity: 1,
          price: productPrice,
          total: productPrice
        }];
      }
      return prev;
    });
  };

  // Get quantity for a product
  const getQuantity = (productId: number) => {
    return orderItems.find(item => item.productId === productId)?.quantity || 0;
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        customerId: selectedCustomerId,
        total,
        paymentMethod: paymentMethod,
        orderDate: getTodayStringRD(),
        notes: "",
        items: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        }))
      };

      return apiRequest({
        method: "POST",
        url: "/api/orders",
        data: orderData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/orders"] });
      
      toast({
        title: "¡Pedido creado!",
        description: "El pedido se ha registrado exitosamente"
      });
      
      setLocation("/mobile-app");
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear pedido",
        description: error.message || "No se pudo crear el pedido",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  });

  const handleCreateOrder = () => {
    if (!selectedCustomerId) {
      toast({
        title: "Selecciona un cliente",
        description: "Debes seleccionar un cliente para continuar",
        variant: "destructive"
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: "Agrega productos",
        description: "Debes agregar al menos un producto",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    createOrderMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/mobile-app")}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Nuevo Pedido</h1>
          </div>
          {totalItems > 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {totalItems}
            </Badge>
          )}
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Customer Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Buscar cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, teléfono..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-customer"
                />
              </div>
            </div>

            {!selectedCustomer ? (
              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[200px] overflow-y-auto">
                  {loadingCustomers ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Cargando clientes...
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No se encontraron clientes
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
                          onClick={() => setSelectedCustomerId(customer.id)}
                          data-testid={`option-customer-${customer.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{customer.businessname}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {customer.managername} • {customer.phone}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 border border-primary/20 p-3 rounded-md text-sm" data-testid="customer-info">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{selectedCustomer.businessname}</div>
                    <div className="text-muted-foreground">{selectedCustomer.managername}</div>
                    <div className="text-muted-foreground text-xs mt-1">
                      {selectedCustomer.street} #{selectedCustomer.streetnumber}
                      {selectedCustomer.sector && `, ${selectedCustomer.sector}`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setCustomerSearch("");
                    }}
                    data-testid="button-change-customer"
                  >
                    Cambiar
                  </Button>
                </div>
              </div>
            )}

            {/* Payment Method indicator for donation orders */}
            {selectedCustomer?.isCharity && paymentMethod === 'donation' && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-3 mt-3" data-testid="donation-indicator">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-amber-800 dark:text-amber-200">Pedido de Donación</span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Este pedido será procesado como donación a institución benéfica. No se generará factura.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando productos...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => {
                  const quantity = getQuantity(product.id);
                  const productPrice = parseFloat(product.price);
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                        quantity > 0 ? "bg-primary/5 border-primary/20" : "bg-background"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          RD$ {productPrice.toFixed(2)}
                          {quantity > 0 && (
                            <span className="ml-2 font-medium text-primary">
                              • Subtotal: RD$ {(quantity * productPrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => updateQuantity(product.id, -1)}
                          disabled={quantity === 0}
                          data-testid={`button-decrease-${product.id}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <div
                          className="w-10 text-center font-bold"
                          data-testid={`text-quantity-${product.id}`}
                        >
                          {quantity}
                        </div>
                        
                        <Button
                          variant="default"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => updateQuantity(product.id, 1)}
                          data-testid={`button-increase-${product.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Summary */}
        {orderItems.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Resumen del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {orderItems.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.quantity} × {item.name}
                    </span>
                    <span className="font-medium">RD$ {item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="text-subtotal">RD$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ITBIS (18%)</span>
                  <span data-testid="text-itbis">RD$ {itbis.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span data-testid="text-total">RD$ {total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t shadow-lg p-4 z-10">
        <div className="container max-w-2xl mx-auto">
          <Button
            size="lg"
            className="w-full h-14"
            onClick={handleCreateOrder}
            disabled={isSubmitting || !selectedCustomerId || orderItems.length === 0}
            data-testid="button-create-order"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full mr-2"></div>
                Creando pedido...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Crear Pedido {orderItems.length > 0 && `• RD$ ${total.toFixed(2)}`}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
