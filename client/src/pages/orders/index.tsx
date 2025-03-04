import { useTranslation } from "react-i18next";
import { useState } from "react";
import { type Customer, type Product } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export default function Orders() {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("orders")}</h1>
        <Button onClick={() => setIsCreating(true)}>
          {t("newOrder")}
        </Button>
      </div>

      {isCreating && (
        <div className="border rounded-lg p-6 bg-background">
          <h2 className="text-xl font-semibold mb-4">{t("newOrder")}</h2>

          <div className="grid gap-4">
            <div>
              <h3 className="font-medium mb-2">{t("customers")}</h3>
              <div className="grid grid-cols-2 gap-2">
                {customers?.map(customer => (
                  <div 
                    key={customer.id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
                  >
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.businessName}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">{t("products")}</h3>
              <div className="grid grid-cols-3 gap-2">
                {products?.map(product => (
                  <div 
                    key={product.id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
                  >
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm">RD$ {parseFloat(product.price.toString()).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}