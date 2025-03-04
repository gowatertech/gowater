import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Customer, type Product } from "@shared/schema";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
  total: number;
}

export default function Orders() {
  const { t } = useTranslation();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNumber] = useState(Math.floor(Math.random() * 90000) + 10000);
  const [currentDate] = useState(new Date().toLocaleDateString());

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18; // 18% ITBIS
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* Encabezado */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Nota de Pedido</h1>
          <div className="mt-2">
            <p>Fecha: {currentDate}</p>
            <p>No. {orderNumber}</p>
          </div>
        </div>

        {/* Selección de Cliente */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            {t("customer")}
          </label>
          <Select onValueChange={(value) => {
            const customer = customers?.find(c => c.id === parseInt(value));
            setSelectedCustomer(customer || null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectCustomer")} />
            </SelectTrigger>
            <SelectContent>
              {customers?.map((customer) => (
                <SelectItem 
                  key={customer.id} 
                  value={customer.id.toString()}
                >
                  {customer.name} - {customer.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCustomer && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">{t("businessName")}:</p>
                  <p>{selectedCustomer.businessName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("address")}:</p>
                  <p>{selectedCustomer.address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("phone")}:</p>
                  <p>{selectedCustomer.phone}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de Productos */}
        <div className="mt-6">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left">Código</th>
                <th className="p-2 text-left">Descripción</th>
                <th className="p-2 text-right">Cantidad</th>
                <th className="p-2 text-right">Precio Unit.</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{item.product.id}</td>
                  <td className="p-2">{item.product.name}</td>
                  <td className="p-2 text-right">{item.quantity}</td>
                  <td className="p-2 text-right">
                    RD$ {parseFloat(item.product.price.toString()).toFixed(2)}
                  </td>
                  <td className="p-2 text-right">
                    RD$ {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Productos Disponibles */}
        <div className="mt-6">
          <h3 className="font-medium mb-2">{t("products")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {products?.map((product) => (
              <div
                key={product.id}
                className="p-3 border rounded cursor-pointer hover:bg-accent"
                onClick={() => {
                  const price = parseFloat(product.price.toString());
                  const quantity = 1;
                  const total = price * quantity;

                  setOrderItems(prev => [
                    ...prev,
                    { product, quantity, price, total }
                  ]);
                }}
              >
                <p className="font-medium">{product.name}</p>
                <p>RD$ {parseFloat(product.price.toString()).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div className="mt-6 border-t pt-4">
          <div className="flex justify-end space-y-2">
            <table className="w-64">
              <tbody>
                <tr>
                  <td className="py-1">Sub-total:</td>
                  <td className="text-right">
                    RD$ {calculateTotals().subtotal.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1">ITBIS (18%):</td>
                  <td className="text-right">
                    RD$ {calculateTotals().tax.toFixed(2)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="py-1">TOTAL:</td>
                  <td className="text-right">
                    RD$ {calculateTotals().total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            disabled={!selectedCustomer || orderItems.length === 0}
          >
            {t("createOrder")}
          </Button>
        </div>
      </div>
    </div>
  );
}