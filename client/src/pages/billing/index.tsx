import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type Order, type Customer, type Product } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

interface OrderItem {
  code: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export default function Billing() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card'>('cash');

  // Consultas para obtener datos
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

  const calculateTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax = subtotal * 0.18; // 18% ITBIS
    return { subtotal, tax, total: subtotal + tax };
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Encabezado con botón nueva factura */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Facturación</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto text-base">Nueva Factura</Button>
          </DialogTrigger>
          <DialogContent className="w-[98vw] sm:w-[90vw] max-w-2xl p-2 sm:p-4 gap-3">
            <DialogHeader>
              <DialogTitle className="text-lg">Nueva Factura</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {/* Cliente y Notas */}
              <div className="grid gap-3">
                <Select
                  onValueChange={(value) => {
                    const customer = customers?.find(c => c.id === parseInt(value));
                    setSelectedCustomer(customer || null);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem
                        key={customer.id}
                        value={customer.id.toString()}
                        className="text-sm py-2"
                      >
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedCustomer && (
                  <div className="text-sm grid grid-cols-1 gap-2 bg-muted p-2 rounded">
                    <div>
                      <span className="font-medium">Nombre de Empresa: </span>
                      {selectedCustomer.businessName}
                    </div>
                    <div>
                      <span className="font-medium">Dirección: </span>
                      {selectedCustomer.address}
                    </div>
                  </div>
                )}

                {/* Campo de Notas */}
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Nota</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setNotes(e.target.value);
                      }
                    }}
                    placeholder="Añadir nota a la factura (máximo 200 caracteres)"
                    className="h-20 text-sm resize-none"
                    maxLength={200}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {notes.length}/200 caracteres
                  </div>
                </div>
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

              {/* Método de Pago */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Método de Pago</label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as 'cash' | 'credit' | 'card')}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                >
                  Crear Factura
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de Facturas */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Factura No.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{customers?.find(c => c.id === order.customerId)?.name}</TableCell>
                  <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                  <TableCell>#{order.id}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === "delivered" ? "bg-green-100 text-green-800" :
                        order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                    }`}>
                      {order.status === "delivered" ? "Pagada" :
                        order.status === "pending" ? "Pendiente" :
                          "Cancelada"}
                    </span>
                  </TableCell>
                  <TableCell>RD$ {parseFloat(order.total.toString()).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 text-sm">
                      Ver detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}