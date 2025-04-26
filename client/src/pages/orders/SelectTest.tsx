import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function SelectTest() {
  const [, setLocation] = useLocation();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Cargar los clientes
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Cargar los productos
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  // Mantener un registro del estado en cada cambio
  useEffect(() => {
    console.log("Estado actual:", { 
      selectedCustomerId, 
      selectedProductId,
      customersCount: customers?.length,
      productsCount: products?.length
    });
  }, [selectedCustomerId, selectedProductId, customers, products]);

  // Manejadores de eventos seguros
  const handleCustomerChange = (value: string) => {
    console.log("Cliente seleccionado:", value);
    try {
      setSelectedCustomerId(value);
    } catch (error) {
      console.error("Error al seleccionar cliente:", error);
    }
  };

  const handleProductChange = (value: string) => {
    console.log("Producto seleccionado:", value);
    try {
      setSelectedProductId(value);
    } catch (error) {
      console.error("Error al seleccionar producto:", error);
    }
  };

  const handleReturn = () => {
    try {
      console.log("Navegando de vuelta a la lista de pedidos");
      setLocation("/orders/list");
    } catch (error) {
      console.error("Error al navegar:", error);
      // Intentar método alternativo si falla
      window.location.href = "/orders/list";
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Prueba de Componentes Select</CardTitle>
          <CardDescription>
            Esta página permite probar los componentes Select para verificar su funcionamiento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-md font-medium mb-2">Selección de Cliente</h3>
            <Select
              value={selectedCustomerId || undefined}
              onValueChange={handleCustomerChange}
              disabled={isLoadingCustomers}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers && customers.length > 0 ? (
                  customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.businessname}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-customers" disabled>
                    No hay clientes disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedCustomerId && (
              <div className="mt-2 p-2 bg-muted rounded">
                Cliente seleccionado ID: {selectedCustomerId}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Selección de Producto</h3>
            <Select
              value={selectedProductId || undefined}
              onValueChange={handleProductChange}
              disabled={isLoadingProducts}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products && products.length > 0 ? (
                  products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-products" disabled>
                    No hay productos disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedProductId && (
              <div className="mt-2 p-2 bg-muted rounded">
                Producto seleccionado ID: {selectedProductId}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={handleReturn}>
            Volver a pedidos
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}