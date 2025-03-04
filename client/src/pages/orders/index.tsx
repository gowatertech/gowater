import { useTranslation } from "react-i18next";
import { useState } from "react";
import { type Customer, type Product } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export default function Orders() {
  const { t } = useTranslation();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    product: Product;
    quantity: number;
  }>>([]);

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

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
  };

  const calculateTotal = () => {
    const subtotal = selectedProducts.reduce(
      (sum, { product, quantity }) =>
        sum + parseFloat(product.price.toString()) * quantity,
      0
    );
    const tax = subtotal * 0.18; // 18% ITBIS
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  };

  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">{t("orders")}</h1>

      <div className="space-y-6">
        {/* Selección de Cliente */}
        <div className="bg-card border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">{t("customer")}</h2>
          <div className="grid grid-cols-2 gap-4">
            {customers?.map(customer => (
              <div
                key={customer.id}
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedCustomer?.id === customer.id 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-accent'
                }`}
                onClick={() => setSelectedCustomer(customer)}
              >
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{customer.businessName}</p>
                <p className="text-sm text-muted-foreground">{customer.address}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Selección de Productos */}
        <div className="bg-card border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">{t("products")}</h2>
          <div className="grid grid-cols-3 gap-4">
            {products?.map(product => (
              <div
                key={product.id}
                className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
                onClick={() => handleAddProduct(product)}
              >
                <p className="font-medium">{product.name}</p>
                <p className="text-sm">RD$ {parseFloat(product.price.toString()).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Stock: {product.stock}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen del Pedido */}
        {selectedProducts.length > 0 && (
          <div className="bg-card border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">{t("orderSummary")}</h2>
            <div className="space-y-4">
              {selectedProducts.map(({ product, quantity }) => (
                <div key={product.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProducts(prev =>
                            prev.map(p =>
                              p.product.id === product.id
                                ? { ...p, quantity: Math.max(0, quantity - 1) }
                                : p
                            ).filter(p => p.quantity > 0)
                          );
                        }}
                      >
                        -
                      </Button>
                      <span>{quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddProduct(product)}
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

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>{t("subtotal")}</span>
                  <span>RD$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("tax")} (18%)</span>
                  <span>RD$ {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>{t("total")}</span>
                  <span>RD$ {total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!selectedCustomer}
              >
                {t("createOrder")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}