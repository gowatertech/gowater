import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  code: string;
  description: string;
  price: number;
  category: string;
}

interface OrderItem {
  productId: number;
  code: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export default function NuevoPedidoPaso2() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Obtener cliente del sessionStorage
  const selectedCustomer = useMemo(() => {
    const customerData = sessionStorage.getItem("nuevoPedido_cliente");
    if (!customerData) {
      setLocation("/mobile-app/nuevo-pedido/paso1");
      return null;
    }
    return JSON.parse(customerData);
  }, [setLocation]);

  // Obtener productos
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      return apiRequest({
        method: "GET",
        url: "/api/products"
      });
    }
  });

  // Calcular total
  const totalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  }, [orderItems]);

  // Contar items en el carrito
  const totalItems = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [orderItems]);

  // Inicializar items con productos (hidratar desde sessionStorage si existe)
  useEffect(() => {
    if (products.length > 0 && orderItems.length === 0) {
      // Intentar cargar items guardados desde sessionStorage
      const savedItemsData = sessionStorage.getItem("nuevoPedido_items");
      let savedItems: OrderItem[] = [];
      
      if (savedItemsData) {
        try {
          savedItems = JSON.parse(savedItemsData);
        } catch (e) {
          console.error("Error al parsear items guardados:", e);
        }
      }

      // Crear un mapa de cantidades guardadas por productId
      const savedQuantities = new Map(
        savedItems.map((item) => [item.productId, item.quantity])
      );

      // Inicializar items combinando productos del catálogo con cantidades guardadas
      setOrderItems(
        products.map((product) => {
          const savedQuantity = savedQuantities.get(product.id) || 0;
          return {
            productId: product.id,
            code: product.code,
            description: product.description,
            quantity: savedQuantity,
            price: product.price,
            total: savedQuantity * product.price
          };
        })
      );
    }
  }, [products, orderItems.length]);

  const handleQuantityChange = (index: number, delta: number) => {
    setOrderItems((prevItems) => {
      const newItems = [...prevItems];
      const newQuantity = Math.max(0, newItems[index].quantity + delta);
      newItems[index] = {
        ...newItems[index],
        quantity: newQuantity,
        total: newQuantity * newItems[index].price
      };
      return newItems;
    });
  };

  const handleContinue = () => {
    const itemsWithQuantity = orderItems.filter((item) => item.quantity > 0);
    
    if (itemsWithQuantity.length === 0) {
      toast({
        title: "Agregar productos",
        description: "Debes seleccionar al menos un producto",
        variant: "destructive"
      });
      return;
    }

    // Guardar items en sessionStorage
    sessionStorage.setItem("nuevoPedido_items", JSON.stringify(itemsWithQuantity));
    sessionStorage.setItem("nuevoPedido_total", totalAmount.toString());
    
    // Navegar al paso 3
    setLocation("/mobile-app/nuevo-pedido/paso3");
  };

  if (!selectedCustomer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/mobile-app/nuevo-pedido/paso1")}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Nuevo Pedido</h1>
            <p className="text-xs opacity-90">Paso 2 de 3: Agregar Productos</p>
          </div>
          {totalItems > 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </Badge>
          )}
        </div>
      </div>

      {/* Info del cliente */}
      <div className="bg-white dark:bg-gray-800 border-b p-4">
        <p className="text-xs text-muted-foreground mb-1">Cliente seleccionado:</p>
        <p className="font-semibold">{selectedCustomer.businessname}</p>
        <p className="text-sm text-muted-foreground">{selectedCustomer.managername}</p>
      </div>

      {/* Contenido */}
      <div className="container max-w-md mx-auto px-4 py-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando productos...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orderItems.map((item, index) => (
              <Card key={item.productId} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">
                        {item.description}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        RD$ {item.price.toFixed(2)}
                      </p>
                      {item.quantity > 0 && (
                        <p className="text-sm font-medium text-primary mt-1">
                          Subtotal: RD$ {item.total.toFixed(2)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={() => handleQuantityChange(index, -1)}
                        disabled={item.quantity === 0}
                        data-testid={`button-decrease-${item.productId}`}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                      
                      <div className="w-14 text-center">
                        <span
                          className="text-2xl font-bold"
                          data-testid={`text-quantity-${item.productId}`}
                        >
                          {item.quantity}
                        </span>
                      </div>
                      
                      <Button
                        variant="default"
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={() => handleQuantityChange(index, 1)}
                        data-testid={`button-increase-${item.productId}`}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer fijo con total y botón continuar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t shadow-lg p-4">
        <div className="container max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Total del pedido</p>
              <p className="text-2xl font-bold" data-testid="text-total">
                RD$ {totalAmount.toFixed(2)}
              </p>
            </div>
            <Button
              size="lg"
              className="h-14 px-8"
              onClick={handleContinue}
              disabled={totalItems === 0}
              data-testid="button-continue"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Revisar Pedido
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
