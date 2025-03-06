import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { type Customer, type Product } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderItem {
  code: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export default function Billing() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
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
  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Nueva consulta para obtener los items de una factura específica
  const { data: invoiceDetails = [] } = useQuery({
    queryKey: ["/api/invoices", selectedInvoice?.id, "items"],
    queryFn: async () => {
      if (!selectedInvoice) return [];
      const response = await apiRequest("GET", `/api/invoices/${selectedInvoice.id}/items`);
      return response.json();
    },
    enabled: !!selectedInvoice,
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // 1. Validar items
      const validItems = orderItems.filter(item => item.quantity > 0);
      if (validItems.length === 0) {
        throw new Error('Debe agregar al menos un producto');
      }

      // 2. Calcular totales
      const subtotal = validItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;
      const total = subtotal + tax;

      // 3. Crear la factura
      const invoiceData = {
        customerId: parseInt(data.customerId),
        total: total.toFixed(2),
        status: "pending" as const,
        paymentMethod,
        notes,
      };

      // 4. Enviar la factura
      const invoiceResponse = await apiRequest("POST", "/api/invoices", invoiceData);
      if (!invoiceResponse.ok) {
        throw new Error('Error al crear la factura');
      }

      const invoice = await invoiceResponse.json();

      // 5. Crear los items de la factura
      for (const item of validItems) {
        const itemData = {
          invoiceId: invoice.id,
          productId: parseInt(item.code),
          quantity: item.quantity,
          price: item.price.toFixed(2),
          total: item.total.toFixed(2)
        };

        const itemResponse = await apiRequest("POST", `/api/invoices/${invoice.id}/items`, itemData);
        if (!itemResponse.ok) {
          throw new Error('Error al crear items de la factura');
        }
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Éxito",
        description: "Factura creada exitosamente",
      });
      setIsDialogOpen(false);
      setSelectedCustomer(null);
      setNotes("");
      setOrderItems(Array(5).fill({
        code: "",
        description: "",
        quantity: 0,
        price: 0,
        total: 0
      }));
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const handleCreateInvoice = () => {
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
                  onClick={handleCreateInvoice}
                >
                  {createMutation.isPending ? "Creando..." : "Crear Factura"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de Facturas */}
      <Card>
        <ScrollArea className="h-[calc(100vh-200px)]">
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
              {invoices?.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{customers?.find(c => c.id === invoice.customerId)?.name}</TableCell>
                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                  <TableCell>#{invoice.id}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === "paid" ? "bg-green-100 text-green-800" :
                        invoice.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                    }`}>
                      {invoice.status === "paid" ? "Pagada" :
                        invoice.status === "pending" ? "Pendiente" :
                          "Cancelada"}
                    </span>
                  </TableCell>
                  <TableCell>RD$ {parseFloat(invoice.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setIsDetailsDialogOpen(true);
                      }}
                    >
                      Ver detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Dialog para ver detalles de la factura */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="w-[98vw] sm:w-[90vw] max-w-2xl p-2 sm:p-4 gap-3">
            <DialogHeader>
              <DialogTitle>Detalles de la Factura #{selectedInvoice?.id}</DialogTitle>
            </DialogHeader>

            {selectedInvoice && (
              <div className="space-y-4">
                {/* Información del cliente */}
                <Card className="p-4">
                  <h3 className="font-medium mb-2">Información del Cliente</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Cliente: </span>
                      {customers?.find(c => c.id === selectedInvoice.customerId)?.name}
                    </div>
                    <div>
                      <span className="font-medium">Fecha: </span>
                      {new Date(selectedInvoice.date).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Estado: </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedInvoice.status === "paid" ? "bg-green-100 text-green-800" :
                        selectedInvoice.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {selectedInvoice.status === "paid" ? "Pagada" :
                         selectedInvoice.status === "pending" ? "Pendiente" :
                         "Cancelada"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Método de Pago: </span>
                      {selectedInvoice.paymentMethod === "cash" ? "Efectivo" :
                       selectedInvoice.paymentMethod === "credit" ? "Crédito" :
                       "Tarjeta"}
                    </div>
                  </div>
                </Card>

                {/* Items de la factura */}
                <Card className="p-4">
                  <h3 className="font-medium mb-2">Productos</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceDetails.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {products?.find(p => p.id === item.productId)?.name}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            RD$ {parseFloat(item.price.toString()).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            RD$ {parseFloat(item.total.toString()).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                {/* Totales y Botones de Acción */}
                <Card className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">
                        RD$ {parseFloat(selectedInvoice.total.toString()).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        // TODO: Implementar edición
                      }}
                    >
                      Editar Factura
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        // TODO: Implementar cambio de método de pago
                      }}
                    >
                      Cambiar Método de Pago
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}