import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Customer, type Product, type Order } from "@shared/schema";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { PlusCircle } from "lucide-react";

interface OrderItem {
  code: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export default function Orders() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    Array(5).fill({
      code: "",
      description: "",
      quantity: 0,
      price: 0,
      total: 0
    })
  );

  // Constantes
  const currentDate = new Date().toLocaleDateString();
  const orderNumber = 101; // Esto debería venir de la base de datos

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

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax = subtotal * 0.18; // 18% ITBIS
    return { subtotal, tax, total: subtotal + tax };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header con botón nuevo pedido */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("orders")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              {t("newOrder")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t("newOrder")}</DialogTitle>
            </DialogHeader>

            {/* Formulario de Pedido */}
            <div className="bg-white rounded-lg p-6">
              {/* Encabezado */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold">Nota de Pedido</h2>
                  <p className="text-sm text-muted-foreground mt-1">No. {orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Fecha:</p>
                  <p className="font-medium">{currentDate}</p>
                </div>
              </div>

              {/* Selección de Cliente */}
              <div className="mb-8">
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
              <div className="mt-8">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted border-b">
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
                        <td className="p-2">
                          <Select
                            value={item.code}
                            onValueChange={(value) => handleProductChange(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {products?.map((product) => (
                                <SelectItem 
                                  key={product.id} 
                                  value={product.id.toString()}
                                >
                                  {product.id} - {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input 
                            value={item.description} 
                            readOnly 
                            className="bg-muted"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                            className="text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.price ? `RD$ ${item.price.toFixed(2)}` : ""}
                            readOnly
                            className="text-right bg-muted"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.total ? `RD$ ${item.total.toFixed(2)}` : ""}
                            readOnly
                            className="text-right bg-muted"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="mt-8 border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Sub-total:</span>
                      <span>RD$ {calculateTotals().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ITBIS (18%):</span>
                      <span>RD$ {calculateTotals().tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>TOTAL:</span>
                      <span>RD$ {calculateTotals().total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  disabled={!selectedCustomer || !orderItems.some(item => item.quantity > 0)}
                >
                  {t("createOrder")}
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